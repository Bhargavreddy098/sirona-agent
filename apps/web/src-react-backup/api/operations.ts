import { z } from 'zod';
import { request } from './client';

const uuid = z.string().uuid();

export const systemReleaseSchema = z.object({
  version: z.string(),
  channel: z.string().optional(),
  commitHash: z.string().optional(),
  releaseDate: z.string().optional(),
}).passthrough();

export const recoveryCheckpointSchema = z.object({
  id: uuid,
  label: z.string().optional(),
  schemaVersion: z.number().int().optional(),
  tablesCount: z.number().int().optional(),
  createdAt: z.string(),
  hash: z.string().optional(),
}).passthrough();

export const recoveryRehearsalSchema = z.object({
  id: uuid,
  checkpointId: uuid,
  status: z.enum(['pending', 'running', 'passed', 'failed']),
  verifiedTables: z.number().int().optional(),
  rtoMs: z.number().optional(),
  rpoMs: z.number().optional(),
  createdAt: z.string().optional(),
  findings: z.array(z.string()).optional(),
}).passthrough();

export const systemDiagnosticsSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'error']),
  database: z.record(z.string(), z.unknown()).optional(),
  storage: z.record(z.string(), z.unknown()).optional(),
  uptimeSeconds: z.number().optional(),
}).passthrough();

export const isolationDiagnosticsSchema = z.object({
  diagnostics: z.record(z.string(), z.unknown()).optional(),
  latestQualification: z.record(z.string(), z.unknown()).nullish(),
}).passthrough();

export const isolationQualificationSchema = z.object({
  id: uuid,
  profile: z.string(),
  status: z.enum(['passed', 'failed', 'inconclusive']),
  threatModel: z.string().optional(),
  executedAt: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

export const verificationReportSchema = z.object({
  id: uuid,
  runId: uuid,
  outcome: z.enum(['passed', 'failed', 'unknown']),
  requiredCount: z.number().int().optional(),
  passedCount: z.number().int().optional(),
  failedCount: z.number().int().optional(),
  criteria: z.array(z.record(z.string(), z.unknown())).optional(),
  createdAt: z.string().optional(),
}).passthrough();

export const operationsApi = {
  // --- System Release & Recovery ---
  release: (channel = 'stable') =>
    request(`/system/release?channel=${encodeURIComponent(channel)}`, z.object({ release: systemReleaseSchema.optional() }).passthrough()),

  checkpoints: () =>
    request('/system/recovery/checkpoints', z.object({ checkpoints: z.array(recoveryCheckpointSchema) }).passthrough()),

  checkpoint: (checkpointId: string) =>
    request(`/system/recovery/checkpoints/${uuid.parse(checkpointId)}`, z.object({ checkpoint: recoveryCheckpointSchema }).passthrough()),

  createCheckpoint: (label: string, operationKey?: string) =>
    request(
      '/system/recovery/checkpoints',
      z.object({ checkpoint: recoveryCheckpointSchema }).passthrough(),
      'POST',
      { label },
      undefined,
      operationKey
    ),

  rehearseCheckpoint: (checkpointId: string, operationKey?: string) =>
    request(
      `/system/recovery/checkpoints/${uuid.parse(checkpointId)}/rehearsal`,
      z.object({ rehearsal: recoveryRehearsalSchema }).passthrough(),
      'POST',
      {},
      undefined,
      operationKey
    ),

  rehearsal: (rehearsalId: string) =>
    request(`/system/recovery/rehearsals/${uuid.parse(rehearsalId)}`, z.object({ rehearsal: recoveryRehearsalSchema }).passthrough()),

  purge: (retainDays = 30, operationKey?: string) =>
    request(
      '/system/maintenance/purge',
      z.object({ purged: z.boolean(), freedBytes: z.number().optional() }).passthrough(),
      'POST',
      { retainDays },
      undefined,
      operationKey
    ),

  diagnostics: () =>
    request('/system/diagnostics', z.object({ diagnostics: systemDiagnosticsSchema }).passthrough()),

  // --- Isolation & Hypervisor Diagnostics ---
  isolationDiagnostics: () =>
    request('/isolation/diagnostics', isolationDiagnosticsSchema),

  qualifyIsolation: (profile = 'trusted-local', operationKey?: string) =>
    request(
      '/isolation/qualify',
      z.object({ qualification: isolationQualificationSchema }).passthrough(),
      'POST',
      { profile },
      undefined,
      operationKey
    ),

  validatePath: (path: string, operationKey?: string) =>
    request(
      '/isolation/validate-path',
      z.object({ valid: z.boolean(), canonicalPath: z.string().optional(), reason: z.string().optional() }).passthrough(),
      'POST',
      { path },
      undefined,
      operationKey
    ),

  isolationQualifications: () =>
    request('/isolation/qualifications', z.object({ qualifications: z.array(isolationQualificationSchema) }).passthrough()),

  isolationQualification: (id: string) =>
    request(`/isolation/qualifications/${uuid.parse(id)}`, z.object({ qualification: isolationQualificationSchema }).passthrough()),

  // --- Verification ---
  createVerification: (
    runId: string,
    artifactId: string,
    suiteRevision = 'v1',
    verifierIdentity = 'verifier-engine-v1',
    operationKey?: string
  ) =>
    request(
      `/runs/${uuid.parse(runId)}/verifications`,
      z.object({ report: verificationReportSchema }).passthrough(),
      'POST',
      { artifactId, suiteRevision, verifierIdentity },
      undefined,
      operationKey
    ),

  verificationReport: (reportId: string) =>
    request(`/verifications/${uuid.parse(reportId)}`, z.object({ report: verificationReportSchema }).passthrough()),

  runEvaluation: (suiteName: string, config: Record<string, unknown> = {}, operationKey?: string) =>
    request(
      '/verifications/evaluations',
      z.object({ evaluation: z.record(z.string(), z.unknown()) }).passthrough(),
      'POST',
      { suiteName, config },
      undefined,
      operationKey
    ),
};
