const fs=require('node:fs');
(async()=>{
 const {loadEnvironment}=require('../backend/server.js');loadEnvironment();
 const {readRuntimeConfig}=require('../backend/foundation/runtimeConfig.js');
 const db=require('../backend/config/db.js');const config=readRuntimeConfig(process.env);
 const owner=db.createDatabaseOwner({...config.database,query_timeout:5000,options:'-c default_transaction_read_only=on'},{event:()=>{}});
 try{
  await owner.initialize();db.activateDatabaseOwner(owner);const c=await owner.pool.connect();
  try{await c.query('BEGIN READ ONLY');
   const rows=(await c.query("SELECT kind,is_active,(COALESCE(api_key_ciphertext,'')<>'' OR COALESCE(to_jsonb(provider_connections)->>'credential_ref','')<>'') AS configured,COALESCE(to_jsonb(provider_connections)->>'credential_status','legacy') AS credential_status FROM provider_connections")).rows;
   const result={readOnly:true,inferenceCalls:0,providerConnections:rows.map(r=>({provider:r.kind,active:r.is_active,credentialPresent:r.configured,storageStatus:r.credential_status})),environmentCredentials:{google:Boolean(process.env.GEMINI_API_KEY),openai:Boolean(process.env.OPENAI_API_KEY),anthropic:Boolean(process.env.ANTHROPIC_API_KEY)},authenticationValidity:'UNVERIFIED: no external requests made; key presence is not validity'};
   fs.mkdirSync('docs/integration/evidence/workspace-p5-repair',{recursive:true});fs.writeFileSync('docs/integration/evidence/workspace-p5-repair/credential-status.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
  }finally{await c.query('ROLLBACK');c.release();}
  // Non-billable authentication/discovery only, through the existing owner; no text generation.
  const connection=(await db.query("SELECT id,kind FROM provider_connections WHERE is_active=true AND kind IN ('google','gemini') ORDER BY created_at LIMIT 1")).rows[0];
  if(connection){
    let status;try{await require('../backend/services/providerService.js').ProviderService.testProviderConnection(connection.id);status={provider:connection.kind,authentication:'valid',method:'models metadata endpoint',inferenceCalls:0};}
    catch(error){status={provider:connection.kind,authentication:'UNVERIFIED',code:error.code??'UNAVAILABLE',inferenceCalls:0};}
    fs.writeFileSync('docs/integration/evidence/workspace-p5-repair/provider-auth-status.json',JSON.stringify(status,null,2));console.log(JSON.stringify(status));
  }
 }finally{await owner.close();}
})().catch(error=>{console.log(JSON.stringify({credentialInspection:'blocked',code:error.code??'UNAVAILABLE'}));process.exitCode=1;});
