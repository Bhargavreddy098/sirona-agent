import {pgTable,uuid,text,varchar,bigint,bigserial,jsonb,timestamp,boolean} from 'drizzle-orm/pg-core';
// Projection of existing SQL authority. Never used for auto-sync or migration generation.
export const effects=pgTable('effects',{
  id:uuid('id').primaryKey().defaultRandom(),runId:uuid('run_id').notNull(),taskId:uuid('task_id').notNull(),
  toolId:varchar('tool_id',{length:100}).notNull(),inputDigest:varchar('input_digest',{length:64}).notNull(),
  targetSummary:text('target_summary').notNull(),risk:varchar('risk',{length:20}).notNull(),
  state:varchar('state',{length:50}).notNull(),approvalId:uuid('approval_id'),receiptRef:uuid('receipt_ref'),
  externalOperationId:varchar('external_operation_id',{length:100}),operationKey:varchar('operation_key',{length:128}),
  createdAt:timestamp('created_at',{withTimezone:true}).defaultNow(),updatedAt:timestamp('updated_at',{withTimezone:true}).defaultNow(),
});
export const runEvents=pgTable('run_events',{
  id:bigserial('id',{mode:'bigint'}).primaryKey(),runId:uuid('run_id').notNull(),sequence:bigint('sequence',{mode:'bigint'}).notNull(),
  eventType:varchar('event_type',{length:100}).notNull(),payload:jsonb('payload').notNull(),createdAt:timestamp('created_at',{withTimezone:true}).defaultNow(),
});
export const providerConnections=pgTable('provider_connections',{
  id:uuid('id').primaryKey().defaultRandom(),
  workspaceId:uuid('workspace_id'),
  kind:varchar('kind',{length:50}).notNull(),
  name:varchar('name',{length:100}).notNull(),
  baseUrl:text('base_url'),
  apiKeyCiphertext:text('api_key_ciphertext'),
  credentialRef:varchar('credential_ref',{length:128}),
  credentialStatus:varchar('credential_status',{length:32}).notNull().default('legacy'),
  credentialMigratedAt:timestamp('credential_migrated_at',{withTimezone:true}),
  isActive:boolean('is_active').notNull().default(true),
  createdAt:timestamp('created_at',{withTimezone:true}).defaultNow(),
  updatedAt:timestamp('updated_at',{withTimezone:true}).defaultNow(),
});
