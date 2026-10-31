import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import { fixture, legacy, server } from './typedDatabaseBoundary.test.js';
import { CredentialResolver } from '../src/providers/credentialResolver.js';

const backendModules = createRequire(new URL('../../package.json', import.meta.url));
const { SecretStore } = backendModules('./services/secretStore.js');
// This test double isolates DB/CAS/HTTP behavior. Actual DPAPI is qualified by desktop-credentials-e2e.mjs.
const testVaultRecords=new Map<string,string>();
CredentialResolver.configureVault({put(secret:string){const ref=CredentialResolver.generateCredentialRef();testVaultRecords.set(ref,secret);return ref;},get(ref:string){const value=testVaultRecords.get(ref);if(!value)throw new Error('CREDENTIAL_UNAVAILABLE');return value;},remove(ref:string){testVaultRecords.delete(ref);}});

test('Migration 023: provider_connections has credential_ref, credential_status and index', async (t: TestContext) => {
  await fixture(t);
  const dbCheck = await legacy.query('SELECT current_database() AS db');
  assert.equal(dbCheck.rows[0].db, 'sirona_workspace_p0_test_20261028', 'Must execute against guarded test database');

  // Verify migration 023 is recorded
  const migCheck = await legacy.query("SELECT COUNT(*)::int AS n FROM schema_migrations WHERE filename = '023_provider_credential_references.sql'");
  assert.equal(migCheck.rows[0].n, 1, 'Migration 023 must be applied');

  // Verify columns exist on provider_connections
  const cols = await legacy.query(`
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'provider_connections' 
      AND column_name IN ('credential_ref', 'credential_status', 'credential_migrated_at')
  `);
  const names = cols.rows.map((c: any) => c.column_name);
  assert.ok(names.includes('credential_ref'), 'credential_ref column must exist');
  assert.ok(names.includes('credential_status'), 'credential_status column must exist');
  assert.ok(names.includes('credential_migrated_at'), 'credential_migrated_at column must exist');

  // Verify index
  const indexCheck = await legacy.query(`
    SELECT indexname FROM pg_indexes 
    WHERE tablename = 'provider_connections' AND indexname = 'idx_provider_connections_cred_ref'
  `);
  assert.equal(indexCheck.rows.length, 1, 'idx_provider_connections_cred_ref index must exist');
});

test('CredentialResolver: new connection receives opaque reference and round-trip verified encryption', async (t: TestContext) => {
  const f = await fixture(t);
  const providerService = backendModules('./services/providerService.js').ProviderService;

  const testApiKey = 'sk-test-secret-key-' + crypto.randomBytes(8).toString('hex');
  const conn = await providerService.createProviderConnection({
    workspaceId: f.identity.workspaceId,
    kind: 'openai',
    name: 'P2 Test OpenAI',
    apiKey: testApiKey,
  });

  t.after(async () => {
    await legacy.query('DELETE FROM provider_connections WHERE id = $1', [conn.id]);
  });

  assert.ok(conn.id, 'Connection must have id');
  assert.equal(conn.hasApiKey, true, 'hasApiKey must be true');
  assert.ok(conn.credentialRef?.startsWith('cred:v1:'), 'credentialRef must be opaque cred:v1:* format');
  assert.equal(conn.credentialStatus, 'migrated', 'Status must be migrated');
  assert.equal((conn as any).api_key_ciphertext, undefined, 'Ciphertext must never be returned in view');

  // Verify stored row in database
  const dbRow = (await legacy.query('SELECT * FROM provider_connections WHERE id = $1', [conn.id])).rows[0];
  assert.ok(dbRow.credential_ref, 'DB row must have credential_ref');
  assert.equal(dbRow.api_key_ciphertext,dbRow.credential_ref,'Business row stores reference only');
  assert.equal(dbRow.credential_status, 'migrated', 'DB status must be migrated');
  assert.ok(dbRow.credential_migrated_at, 'DB must record credential_migrated_at');

  // Verify resolution
  const resolved = CredentialResolver.resolveCredential(dbRow);
  assert.equal(resolved.status, 'migrated');
  assert.equal(resolved.apiKey, testApiKey, 'Resolved key must match original plaintext');
});

test('CredentialResolver: migrates legacy connection with verified round-trip and preserves history', async (t: TestContext) => {
  const f = await fixture(t);

  // 1. Insert legacy connection record directly
  const legacyPlaintext = 'sk-legacy-key-' + crypto.randomBytes(8).toString('hex');
  const legacyCiphertext = SecretStore.encrypt(legacyPlaintext);

  const insertRes = await legacy.query(`
    INSERT INTO provider_connections (workspace_id, kind, name, api_key_ciphertext, credential_ref, credential_status, is_active)
    VALUES ($1, 'google', 'Legacy Gemini Connection', $2, NULL, 'legacy', true)
    RETURNING id, kind, api_key_ciphertext, credential_ref, credential_status
  `, [f.identity.workspaceId, legacyCiphertext]);

  const connId = insertRes.rows[0].id;
  t.after(async () => {
    await legacy.query('DELETE FROM provider_connections WHERE id = $1', [connId]);
  });

  // Verify initial legacy state
  const beforeMigration = CredentialResolver.resolveCredential(insertRes.rows[0]);
  assert.equal(beforeMigration.status, 'legacy');
  assert.equal(beforeMigration.apiKey, legacyPlaintext);

  // 2. Perform migration
  const migrationResult = await CredentialResolver.migrateConnection(legacy, connId);
  assert.equal(migrationResult.success, true);
  assert.equal(migrationResult.status, 'migrated');
  assert.ok(migrationResult.credentialRef?.startsWith('cred:v1:'));

  // 3. Verify DB state after migration
  const afterDbRow = (await legacy.query('SELECT * FROM provider_connections WHERE id = $1', [connId])).rows[0];
  assert.equal(afterDbRow.credential_status, 'migrated');
  assert.ok(afterDbRow.credential_ref);
  assert.ok(afterDbRow.credential_migrated_at);

  const afterResolution = CredentialResolver.resolveCredential(afterDbRow);
  assert.equal(afterResolution.status, 'migrated');
  assert.equal(afterResolution.apiKey, legacyPlaintext);
});

test('CredentialResolver: corrupted or inaccessible secret fails closed with requires_reauth without deleting history', async (t: TestContext) => {
  const f = await fixture(t);

  // Insert corrupt ciphertext
  const corruptRes = await legacy.query(`
    INSERT INTO provider_connections (workspace_id, kind, name, api_key_ciphertext, credential_ref, credential_status, is_active)
    VALUES ($1, 'anthropic', 'Corrupt Connection', 'enc:v1:00112233445566778899aabb:00112233445566778899aabbccddeeff:badciphertext123', NULL, 'legacy', true)
    RETURNING id
  `, [f.identity.workspaceId]);

  const connId = corruptRes.rows[0].id;
  t.after(async () => {
    await legacy.query('DELETE FROM provider_connections WHERE id = $1', [connId]);
  });

  // Migration should fail safely and transition to requires_reauth
  const migRes = await CredentialResolver.migrateConnection(legacy, connId);
  assert.equal(migRes.success, false);
  assert.equal(migRes.status, 'requires_reauth');

  // Verify database record still exists (history preserved)
  const row = (await legacy.query('SELECT * FROM provider_connections WHERE id = $1', [connId])).rows[0];
  assert.ok(row, 'Connection record must not be deleted');
  assert.equal(row.credential_status, 'requires_reauth');

  // Resolution must fail closed (never fallback to plaintext or dummy key)
  const resolved = CredentialResolver.resolveCredential(row);
  assert.equal(resolved.status, 'requires_reauth');
  assert.equal(resolved.apiKey, null);
  assert.ok(resolved.error);
});

test('SecretStore: rejects predictable machine fallback when strict mode is active', async () => {
  const savedStrict = process.env.SIRONA_STRICT_SECRETS;
  const savedKey = process.env.SIRONA_SECRET_KEY;
  const savedJwt = process.env.JWT_SECRET;

  try {
    process.env.SIRONA_STRICT_SECRETS = 'true';
    delete process.env.SIRONA_SECRET_KEY;
    delete process.env.JWT_SECRET;

    assert.throws(
      () => SecretStore.encrypt('some-secret'),
      /PREDICTABLE_SECRET_KEY_REFUSED/
    );
    process.env.SIRONA_STRICT_SECRETS='false';
    assert.throws(()=>SecretStore.encrypt('some-secret'),/PREDICTABLE_SECRET_KEY_REFUSED/);
  } finally {
    if (savedStrict !== undefined) process.env.SIRONA_STRICT_SECRETS = savedStrict;
    else delete process.env.SIRONA_STRICT_SECRETS;
    if (savedKey !== undefined) process.env.SIRONA_SECRET_KEY = savedKey;
    if (savedJwt !== undefined) process.env.JWT_SECRET = savedJwt;
  }
});

test('Zero secret disclosure: HTTP GET /api/v1/provider-connections never returns plaintext or ciphertext', async (t: TestContext) => {
  const f = await fixture(t);
  const base = await server(t);

  const testKey = 'super-secret-production-token-12345';
  const connRes = await legacy.query(`
    INSERT INTO provider_connections (workspace_id, kind, name, api_key_ciphertext, credential_ref, credential_status, is_active)
    VALUES ($1, 'openai', 'Zero Leakage Test', $2, 'cred:v1:leak-test', 'migrated', true)
    RETURNING id
  `, [f.identity.workspaceId, SecretStore.encrypt(testKey)]);

  const connId = connRes.rows[0].id;
  t.after(async () => {
    await legacy.query('DELETE FROM provider_connections WHERE id = $1', [connId]);
  });

  const res = await fetch(base + '/api/v1/provider-connections', {
    headers: f.headers,
  });

  assert.equal(res.status, 200);
  const bodyText = await res.text();

  assert.doesNotMatch(bodyText, new RegExp(testKey), 'Raw API key must never appear in HTTP response payload');
  assert.doesNotMatch(bodyText, /api_key_ciphertext/, 'Ciphertext field must never be exposed');
  assert.doesNotMatch(bodyText, /apiKeyCiphertext/, 'apiKeyCiphertext field must never be exposed');

  const json = JSON.parse(bodyText);
  const target = json.data.connections.find((c: any) => c.id === connId);
  assert.ok(target, 'Created connection must be listed');
  assert.equal(target.hasApiKey, true);
  assert.equal(target.credentialStatus, 'migrated');
  assert.equal(target.credentialRef, 'cred:v1:leak-test');
});

test('Plaintext is refused even without strict mode; migration never certifies it',async(t:TestContext)=>{
  const f=await fixture(t);assert.throws(()=>SecretStore.decrypt('plaintext-canary'),/PLAINTEXT_CREDENTIAL_REFUSED/);
  const id=(await legacy.query("INSERT INTO provider_connections(workspace_id,kind,name,api_key_ciphertext)VALUES($1,'openai','P2 plaintext canary','plaintext-canary')RETURNING id",[f.identity.workspaceId])).rows[0].id;
  t.after(()=>legacy.query('DELETE FROM provider_connections WHERE id=$1',[id]));
  const result=await CredentialResolver.migrateConnection(legacy,id);assert.equal(result.status,'requires_reauth');
  assert.equal((await legacy.query('SELECT api_key_ciphertext FROM provider_connections WHERE id=$1',[id])).rows[0].api_key_ciphertext,'plaintext-canary','Legacy bytes retained for explicit re-entry recovery');
});
test('Cross-workspace credential rotation/test/delete are denied before resolution',async(t:TestContext)=>{
  const a=await fixture(t),b=await fixture(t),base=await server(t);const service=backendModules('./services/providerService.js').ProviderService;
  const connection=await service.createProviderConnection({workspaceId:a.identity.workspaceId,kind:'openai',name:'P2 scope',apiKey:'synthetic-scope-key'});
  t.after(()=>legacy.query('DELETE FROM provider_connections WHERE id=$1',[connection.id]));
  const crossVerify=await fetch(base+'/api/v1/models/verify',{method:'POST',headers:b.headers,body:JSON.stringify({kind:'openai',apiKey:'must-not-write',workspaceId:a.identity.workspaceId})});assert.equal(crossVerify.status,403);
  for(const [path,method] of [['','PATCH'],['','DELETE'],['/test','POST'],['/models/refresh','POST']]){
    const response=await fetch(base+'/api/v1/provider-connections/'+connection.id+path,{method,headers:b.headers,body:method==='DELETE'?undefined:JSON.stringify({apiKey:'must-not-rotate'})});assert.equal(response.status,404);
  }
});
test('Migration compare-and-swap preserves a concurrent credential replacement',async(t:TestContext)=>{
  const f=await fixture(t);const id=(await legacy.query("INSERT INTO provider_connections(workspace_id,kind,name,api_key_ciphertext)VALUES($1,'openai','P2 conflict',$2)RETURNING id",[f.identity.workspaceId,SecretStore.encrypt('legacy-canary')])).rows[0].id;
  t.after(()=>legacy.query('DELETE FROM provider_connections WHERE id=$1',[id]));let replaced=false;
  const interrupted={query:async(sql:string,params?:unknown[])=>{if(sql.startsWith('UPDATE provider_connections SET api_key_ciphertext=')&&!replaced){replaced=true;await legacy.query("UPDATE provider_connections SET api_key_ciphertext='concurrent-replacement' WHERE id=$1",[id]);}return legacy.query(sql,params);}};
  await assert.rejects(CredentialResolver.migrateConnection(interrupted,id),/CREDENTIAL_MIGRATION_CONFLICT/);
  assert.equal((await legacy.query('SELECT api_key_ciphertext FROM provider_connections WHERE id=$1',[id])).rows[0].api_key_ciphertext,'concurrent-replacement');
});

test('Lost migration acknowledgement resumes from the durable binding without repeating the write',async(t:TestContext)=>{
 const f=await fixture(t);const id=(await legacy.query("INSERT INTO provider_connections(workspace_id,kind,name,api_key_ciphertext)VALUES($1,'openai','P2 lost acknowledgement',$2)RETURNING id",[f.identity.workspaceId,SecretStore.encrypt('ack-canary')])).rows[0].id;
 t.after(()=>legacy.query('DELETE FROM provider_connections WHERE id=$1',[id]));
 const interrupted={query:async(sql:string,params?:unknown[])=>{const result=await legacy.query(sql,params);if(sql.startsWith('UPDATE provider_connections SET api_key_ciphertext='))throw new Error('LOST_ACK');return result;}};
 await assert.rejects(CredentialResolver.migrateConnection(interrupted,id),/LOST_ACK/);
 const before=(await legacy.query('SELECT * FROM provider_connections WHERE id=$1',[id])).rows[0];
 const resumed=await CredentialResolver.migrateConnection(legacy,id);assert.equal(resumed.success,true);assert.equal(resumed.credentialRef,before.credential_ref);assert.equal(CredentialResolver.resolveCredential(before).apiKey,'ack-canary');
});
