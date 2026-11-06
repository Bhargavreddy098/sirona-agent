import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DesktopCredentialBroker } from "../../desktop/dist/security/credentialBroker.js";
import { CredentialResolver } from "../dist-workspace/src/providers/credentialResolver.js";
import { ProviderService } from "../services/providerService.js";
import { query } from "../config/db.js";

const testVaultDir = path.join(process.cwd(), "data", "test_vault_credentials");

// Simulated Windows safeStorage encryptor for standalone Node.js test execution
function createTestStorage() {
  const secretKey = crypto.randomBytes(32);
  return {
    isEncryptionAvailable() {
      return true;
    },
    encryptString(plaintext) {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv("aes-256-gcm", secretKey, iv);
      const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
      const tag = cipher.getAuthTag();
      return Buffer.concat([iv, tag, ciphertext]);
    },
    decryptString(buffer) {
      const iv = buffer.subarray(0, 12);
      const tag = buffer.subarray(12, 28);
      const ciphertext = buffer.subarray(28);
      const decipher = crypto.createDecipheriv("aes-256-gcm", secretKey, iv);
      decipher.setAuthTag(tag);
      return decipher.update(ciphertext, undefined, "utf8") + decipher.final("utf8");
    },
  };
}

test("Phase 2: DPAPI Credential Broker & Keyring Vault Integration", async (t) => {
  if (fs.existsSync(testVaultDir)) {
    fs.rmSync(testVaultDir, { recursive: true, force: true });
  }

  // 1. Broker initialization & Windows ACL verification
  const storage = createTestStorage();
  const broker = new DesktopCredentialBroker(testVaultDir, storage);
  assert.ok(fs.existsSync(testVaultDir), "Credential directory must be created");

  // Configure CredentialResolver
  CredentialResolver.configureVault(broker);

  // 2. Put credential: returns opaque reference cred:v1:<uuid>
  const testSecret = "sk-ant-api-key-secret-canary-12345";
  const ref = broker.put(testSecret);
  assert.match(ref, /^cred:v1:[0-9a-f-]{36}$/, "Reference must match opaque format cred:v1:<uuid>");

  // 3. Zero plaintext on disk verification
  const uuid = ref.slice(8);
  const recordFile = path.join(testVaultDir, `${uuid}.dpapi`);
  assert.ok(fs.existsSync(recordFile), "Protected .dpapi record must exist on disk");
  const rawBytes = fs.readFileSync(recordFile);
  assert.doesNotMatch(
    rawBytes.toString("utf8"),
    new RegExp(testSecret),
    "Plaintext secret must NEVER be visible in raw disk bytes"
  );

  // 4. Retrieve credential roundtrip
  const retrieved = broker.get(ref);
  assert.equal(retrieved, testSecret, "Retrieved secret must match original plaintext");

  // 5. Tamper detection / safety
  const corruptedBytes = Buffer.from(rawBytes);
  corruptedBytes[corruptedBytes.length - 1] ^= 0xff; // Flip bits
  fs.writeFileSync(recordFile, corruptedBytes);
  assert.throws(() => broker.get(ref), { code: "CREDENTIAL_UNAVAILABLE" });
  fs.writeFileSync(recordFile, rawBytes); // Restore for subsequent steps

  // 6. ProviderService Integration with SQLite persistence
  const testWorkspaceId = "ws_primary_default";
  const connection = await ProviderService.createProviderConnection({
    workspaceId: testWorkspaceId,
    kind: "openai",
    name: "Phase 2 Automated OpenAI Connection",
    apiKey: "sk-openai-live-key-67890",
  });

  t.after(async () => {
    if (connection?.id) {
      await ProviderService.deleteProviderConnection(connection.id).catch(() => {});
    }
    try { broker.remove(ref); } catch {}
    if (fs.existsSync(testVaultDir)) {
      fs.rmSync(testVaultDir, { recursive: true, force: true });
    }
  });

  assert.ok(connection.id, "Connection ID must be generated");
  assert.equal(connection.hasApiKey, true, "hasApiKey must report true");
  assert.match(connection.credentialRef, /^cred:v1:/, "credentialRef must be opaque cred:v1:*");
  assert.equal(connection.credentialStatus, "migrated", "Status must be migrated");
  assert.equal(connection.apiKey, undefined, "Raw apiKey must NEVER be returned in DTO");
  assert.equal(connection.api_key_ciphertext, undefined, "api_key_ciphertext must NEVER be returned in DTO");

  // Verify persistence inside SQLite sirona.db
  const rows = (await query("SELECT * FROM provider_connections WHERE id = $1", [connection.id])).rows;
  assert.equal(rows.length, 1, "Connection must be persisted in SQLite");
  const dbRow = rows[0];
  assert.equal(dbRow.credential_ref, connection.credentialRef);
  assert.equal(dbRow.credential_status, "migrated");
  assert.ok(dbRow.credential_migrated_at, "credential_migrated_at timestamp must be recorded");

  // 7. Resolve secret through CredentialResolver
  const resolved = CredentialResolver.resolveCredential(dbRow);
  assert.equal(resolved.status, "migrated");
  assert.equal(resolved.apiKey, "sk-openai-live-key-67890", "Resolved API key must match stored key");

  // 8. Sanitize output check
  const sanitized = CredentialResolver.sanitize(dbRow);
  assert.equal(sanitized.hasApiKey, true);
  assert.equal(sanitized.credentialRef, connection.credentialRef);
  assert.equal(sanitized.apiKey, undefined);
  assert.equal(sanitized.api_key_ciphertext, undefined);

  // 9. Removal
  broker.remove(ref);
  assert.ok(!fs.existsSync(recordFile), "Record file must be deleted on remove");
  assert.throws(() => broker.get(ref), { code: "CREDENTIAL_UNAVAILABLE" });
});
