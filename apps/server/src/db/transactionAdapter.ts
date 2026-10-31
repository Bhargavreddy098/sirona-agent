import {drizzle} from 'drizzle-orm/node-postgres';
import type {PoolClient} from 'pg';
import * as schema from './schema.js';
// Borrow the existing transaction client; no pool, BEGIN, COMMIT, release or owner here.
export function typedClient(client:PoolClient){return drizzle({client,schema});}
export type TransactionClient=PoolClient;
export async function requireReliabilityMigration(client:PoolClient){
  const migration=await client.query("SELECT 1 FROM schema_migrations WHERE filename='022_execution_reliability.sql'");
  if(!migration.rows.length)throw Object.assign(new Error('Execution reliability migration has not been approved/applied on this database'),{code:'RELIABILITY_UNMIGRATED',status:503});
}
