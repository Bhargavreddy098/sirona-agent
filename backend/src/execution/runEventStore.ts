import {sql} from 'drizzle-orm';
import {typedClient,requireReliabilityMigration,type TransactionClient} from '../db/transactionAdapter.js';
import {runEvents} from '../db/schema.js';
export async function appendRunEvent(client:TransactionClient,runId:string,eventType:string,payload:unknown){
  const db=typedClient(client);
  // All writers lock the run first; this also safely serializes pre-022 legacy writes.
  const lock=await db.execute(sql`SELECT id FROM runs WHERE id=${runId} FOR UPDATE`);
  if(!lock.rows.length)throw Object.assign(new Error('Run not found'),{code:'RUN_NOT_FOUND',status:404});
  let sequence:bigint;
  if(process.env.SIRONA_EXECUTION_RELIABILITY==='true'){
    await requireReliabilityMigration(client);
    const next=await db.execute<{sequence:string}>(sql`UPDATE runs SET event_sequence=GREATEST(event_sequence,(SELECT COALESCE(MAX(sequence),0) FROM run_events WHERE run_id=${runId}))+1 WHERE id=${runId} RETURNING event_sequence::text AS sequence`);
    sequence=BigInt(next.rows[0].sequence);
  }else{
    const next=await db.execute<{sequence:string}>(sql`SELECT (COALESCE(MAX(sequence),0)+1)::text AS sequence FROM run_events WHERE run_id=${runId}`);
    sequence=BigInt(next.rows[0].sequence);
  }
  await db.insert(runEvents).values({runId,sequence,eventType,payload});
  return sequence.toString();
}
