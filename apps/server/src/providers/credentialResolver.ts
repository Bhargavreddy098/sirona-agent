import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
export type CredentialStatus='migrated'|'legacy'|'requires_reauth'|'none';
export interface CredentialVault{put(secret:string):string;get(ref:string):string;remove(ref:string):void}
type Connection={id?:string;api_key_ciphertext?:string|null;credential_ref?:string|null;credential_status?:string|null;is_active?:boolean;[key:string]:unknown};
const reference=/^cred:v1:[0-9a-f-]{36}$/;
export class CredentialResolver{
  private static vault:CredentialVault|undefined;
  static configureVault(vault:CredentialVault){if(this.vault&&this.vault!==vault)throw new Error('CREDENTIAL_VAULT_ALREADY_CONFIGURED');this.vault=vault;}
  static generateCredentialRef(){return `cred:v1:${crypto.randomUUID()}`;}
  static storeCredential(secret:string){if(!this.vault)throw Object.assign(new Error('OS_CREDENTIAL_BROKER_UNAVAILABLE'),{code:'OS_CREDENTIAL_BROKER_UNAVAILABLE',status:503});const ref=this.vault.put(secret);if(!reference.test(ref)||this.vault.get(ref)!==secret)throw new Error('CREDENTIAL_ROUNDTRIP_FAILED');return ref;}
  static resolveCredential(row:Connection|null|undefined):{apiKey:string|null;status:CredentialStatus;credentialRef:string|null;error?:string}{
    const ref=row?.credential_ref||(row?.api_key_ciphertext?.startsWith('cred:v1:')?row.api_key_ciphertext:null)||null;
    if(!row)return{apiKey:null,status:'none',credentialRef:null};
    if(row.credential_status==='requires_reauth'||row.is_active===false)return{apiKey:null,status:'requires_reauth',credentialRef:ref,error:'Credential unavailable; re-authentication required'};
    if(!ref&&!row.api_key_ciphertext)return{apiKey:null,status:'none',credentialRef:null};
    try{
      if(ref){if(!reference.test(ref)||!this.vault)throw new Error();return{apiKey:this.vault.get(ref),status:'migrated',credentialRef:ref};}
      // Compatibility reads only. New writes always require the OS broker; legacy migration is explicit.
      const {SecretStore}=require('../../../services/secretStore.js');
      const key=SecretStore.decrypt(row.api_key_ciphertext);
      if(!key)throw new Error();return{apiKey:key,status:'legacy',credentialRef:null};
    }catch{return{apiKey:null,status:'requires_reauth',credentialRef:ref,error:'Credential unavailable; re-authentication required'};}
  }
  static async migrateConnection(client:{query:(sql:string,params?:unknown[])=>Promise<any>},id:string){
    const row=(await client.query('SELECT * FROM provider_connections WHERE id=$1',[id])).rows[0];if(!row)throw new Error('CONNECTION_NOT_FOUND');
    if(!Object.hasOwn(row,'credential_ref'))throw new Error('CREDENTIAL_MIGRATION_REQUIRED');
    const resolved=this.resolveCredential(row);
    if(resolved.status==='migrated')return{success:true,status:resolved.status,credentialRef:resolved.credentialRef};
    if(!resolved.apiKey){
      const status=resolved.status==='none'?'none':'requires_reauth';
      await client.query('UPDATE provider_connections SET credential_status=$1 WHERE id=$2 AND api_key_ciphertext IS NOT DISTINCT FROM $3 AND credential_ref IS NOT DISTINCT FROM $4',[status,id,row.api_key_ciphertext,row.credential_ref]);
      return{success:status==='none',status};
    }
    const ref=this.storeCredential(resolved.apiKey);
    const updated=await client.query(`UPDATE provider_connections SET api_key_ciphertext=$1::text,credential_ref=$1::text,credential_status='migrated',credential_migrated_at=NOW(),updated_at=NOW() WHERE id=$2 AND api_key_ciphertext IS NOT DISTINCT FROM $3 AND credential_ref IS NOT DISTINCT FROM $4 RETURNING id`,[ref,id,row.api_key_ciphertext,row.credential_ref]);
    // If the DB acknowledgement is lost, keep the immutable encrypted record for reconciliation.
    if(updated.rows.length!==1)throw new Error('CREDENTIAL_MIGRATION_CONFLICT');
    return{success:true,status:'migrated' as const,credentialRef:ref};
  }
  static sanitize(row:any){
    const ref=row.credential_ref||(row.api_key_ciphertext?.startsWith('cred:v1:')?row.api_key_ciphertext:null)||null;
    const hasKey=Boolean(row.has_api_key||row.api_key_ciphertext||ref);
    return{id:row.id,workspaceId:row.workspace_id||null,kind:row.kind,name:row.name,baseUrl:row.base_url||null,isActive:row.is_active!==false,hasApiKey:hasKey,credentialRef:ref,credentialStatus:row.credential_status||(ref?'migrated':hasKey?'legacy':'none'),credentialMigratedAt:row.credential_migrated_at||null,createdAt:row.created_at,updatedAt:row.updated_at};
  }
}
