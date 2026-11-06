import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export type CredentialStatus = 'migrated' | 'legacy' | 'requires_reauth' | 'none';
export interface CredentialVault { put(secret: string): string; get(ref: string): string; remove(ref: string): void }
type Connection = { id?: string; api_key_ciphertext?: string | null; credential_ref?: string | null; credential_status?: string | null; is_active?: boolean; [key: string]: unknown };
const reference = /^cred:v1:[0-9a-f-]{36}$/;

export class CredentialResolver {
  private static vault: CredentialVault | undefined;
  private static fallbackStore: Map<string, string> = new Map();

  private static getCandidatePaths(): string[] {
    const candidates = new Set<string>();
    try {
      if (process.env.SIRONA_DB_PATH) {
        const dbDir = path.dirname(path.resolve(process.cwd(), process.env.SIRONA_DB_PATH));
        candidates.add(path.join(dbDir, '.credentials_vault.json'));
      }
      candidates.add(path.resolve(process.cwd(), 'data', '.credentials_vault.json'));
      candidates.add(path.resolve(process.cwd(), 'apps', 'server', 'data', '.credentials_vault.json'));
      candidates.add(path.resolve(process.cwd(), 'sirona-agent-main', 'apps', 'server', 'data', '.credentials_vault.json'));

      try {
        const thisDir = path.dirname(fileURLToPath(import.meta.url));
        candidates.add(path.resolve(thisDir, '../../data', '.credentials_vault.json'));
        candidates.add(path.resolve(thisDir, '../../../data', '.credentials_vault.json'));
        candidates.add(path.resolve(thisDir, '../../../../data', '.credentials_vault.json'));
      } catch {}
    } catch {}
    return Array.from(candidates);
  }

  private static loadFallback(): void {
    const paths = this.getCandidatePaths();
    for (const filePath of paths) {
      try {
        if (fs.existsSync(filePath)) {
          const raw = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(raw);
          if (data && typeof data === 'object') {
            for (const [k, v] of Object.entries(data)) {
              if (typeof v === 'string') this.fallbackStore.set(k, v);
            }
          }
        }
      } catch {
        // ignore
      }
    }
  }

  private static saveFallback(): void {
    try {
      const obj: Record<string, string> = {};
      for (const [k, v] of this.fallbackStore.entries()) {
        obj[k] = v;
      }
      const json = JSON.stringify(obj, null, 2);
      const paths = this.getCandidatePaths();
      let saved = false;
      for (const filePath of paths) {
        try {
          const dir = path.dirname(filePath);
          if (fs.existsSync(dir)) {
            fs.writeFileSync(filePath, json, 'utf8');
            saved = true;
          }
        } catch {}
      }
      if (!saved) {
        const defaultDir = path.resolve(process.cwd(), 'data');
        if (!fs.existsSync(defaultDir)) fs.mkdirSync(defaultDir, { recursive: true });
        fs.writeFileSync(path.join(defaultDir, '.credentials_vault.json'), json, 'utf8');
      }
    } catch {
      // ignore
    }
  }

  static getActiveVault(): CredentialVault {
    if (this.vault) return this.vault;
    if (this.fallbackStore.size === 0) {
      this.loadFallback();
    }
    return {
      put: (secret: string) => {
        const ref = CredentialResolver.generateCredentialRef();
        this.fallbackStore.set(ref, secret);
        this.saveFallback();
        return ref;
      },
      get: (ref: string) => {
        let val = this.fallbackStore.get(ref);
        if (!val) {
          this.loadFallback();
          val = this.fallbackStore.get(ref);
          if (!val) throw new Error('CREDENTIAL_NOT_FOUND');
        }
        return val;
      },
      remove: (ref: string) => {
        this.fallbackStore.delete(ref);
        this.saveFallback();
      }
    };
  }

  static configureVault(vault: CredentialVault) {
    if (this.vault && this.vault !== vault) throw new Error('CREDENTIAL_VAULT_ALREADY_CONFIGURED');
    this.vault = vault;
  }

  static generateCredentialRef() {
    return `cred:v1:${crypto.randomUUID()}`;
  }

  static storeCredential(secret: string) {
    const vault = this.getActiveVault();
    const ref = vault.put(secret);
    if (!reference.test(ref) || vault.get(ref) !== secret) throw new Error('CREDENTIAL_ROUNDTRIP_FAILED');
    return ref;
  }

  static resolveCredential(row: Connection | null | undefined): { apiKey: string | null; status: CredentialStatus; credentialRef: string | null; error?: string } {
    const ref = row?.credential_ref || (row?.api_key_ciphertext?.startsWith('cred:v1:') ? row.api_key_ciphertext : null) || null;
    if (!row) return { apiKey: null, status: 'none', credentialRef: null };
    const isInactive = row.is_active === false || (row as any).is_active === 0 || (row as any).is_active === '0';
    if (row.credential_status === 'requires_reauth' || isInactive) return { apiKey: null, status: 'requires_reauth', credentialRef: ref, error: 'Credential unavailable; re-authentication required' };
    if (!ref && !row.api_key_ciphertext) return { apiKey: null, status: 'none', credentialRef: null };
    try {
      if (ref) {
        if (!reference.test(ref)) throw new Error('MALFORMED_REFERENCE');
        const vault = this.getActiveVault();
        const key = vault.get(ref);
        return { apiKey: key, status: 'migrated', credentialRef: ref };
      }
      // Compatibility reads only.
      const { SecretStore } = require('../../../services/secretStore.js');
      const key = SecretStore.decrypt(row.api_key_ciphertext);
      if (!key) throw new Error();
      return { apiKey: key, status: 'legacy', credentialRef: null };
    } catch {
      return { apiKey: null, status: 'requires_reauth', credentialRef: ref, error: 'Credential unavailable; re-authentication required' };
    }
  }

  static async migrateConnection(client: { query: (sql: string, params?: unknown[]) => Promise<any> }, id: string) {
    const row = (await client.query('SELECT * FROM provider_connections WHERE id=$1', [id])).rows[0];
    if (!row) throw new Error('CONNECTION_NOT_FOUND');
    if (!Object.hasOwn(row, 'credential_ref')) throw new Error('CREDENTIAL_MIGRATION_REQUIRED');
    const resolved = this.resolveCredential(row);
    if (resolved.status === 'migrated') return { success: true, status: resolved.status, credentialRef: resolved.credentialRef };
    if (!resolved.apiKey) {
      const status = resolved.status === 'none' ? 'none' : 'requires_reauth';
      await client.query('UPDATE provider_connections SET credential_status=$1 WHERE id=$2 AND api_key_ciphertext IS NOT DISTINCT FROM $3 AND credential_ref IS NOT DISTINCT FROM $4', [status, id, row.api_key_ciphertext, row.credential_ref]);
      return { success: status === 'none', status };
    }
    const ref = this.storeCredential(resolved.apiKey);
    const updated = await client.query(`UPDATE provider_connections SET api_key_ciphertext=$1::text,credential_ref=$1::text,credential_status='migrated',credential_migrated_at=NOW(),updated_at=NOW() WHERE id=$2 AND api_key_ciphertext IS NOT DISTINCT FROM $3 AND credential_ref IS NOT DISTINCT FROM $4 RETURNING id`, [ref, id, row.api_key_ciphertext, row.credential_ref]);
    if (updated.rows.length !== 1) throw new Error('CREDENTIAL_MIGRATION_CONFLICT');
    return { success: true, status: 'migrated' as const, credentialRef: ref };
  }

  static sanitize(row: any) {
    const ref = row.credential_ref || (row.api_key_ciphertext?.startsWith('cred:v1:') ? row.api_key_ciphertext : null) || null;
    const hasKey = Boolean(row.has_api_key || row.api_key_ciphertext || ref);
    const baseUrl = row.base_url || row.baseUrl || null;
    const isActive = !(row.is_active === false || row.is_active === 0 || row.is_active === '0');
    return {
      id: row.id,
      workspaceId: row.workspace_id || row.workspaceId || null,
      kind: row.kind,
      name: row.name,
      baseUrl,
      base_url: baseUrl,
      isActive,
      hasApiKey: hasKey,
      credentialRef: ref,
      credentialStatus: row.credential_status || (ref ? 'migrated' : hasKey ? 'legacy' : 'none'),
      credentialMigratedAt: row.credential_migrated_at || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
