import {drizzle, type NodePgDatabase} from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

export interface TransactionClient {
  query: (config: any, params?: any[]) => Promise<any>;
  release: () => void;
  [key: string]: any;
}

// Borrow the existing transaction client; no pool, BEGIN, COMMIT, release or owner here.
export function typedClient(client: TransactionClient): NodePgDatabase<typeof schema> {
  return drizzle({ client: client as any, schema });
}

export async function requireReliabilityMigration(client: TransactionClient) {
  const migration = await client.query("SELECT 1 FROM schema_migrations WHERE filename='022_execution_reliability.sql'");
  if (!migration.rows.length) {
    throw Object.assign(new Error('Execution reliability migration has not been approved/applied on this database'), {
      code: 'RELIABILITY_UNMIGRATED',
      status: 503,
    });
  }
}
