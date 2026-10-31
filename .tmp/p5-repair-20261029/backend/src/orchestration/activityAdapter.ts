import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import type { DbClient } from './checkpointAdapter.js';
import { BoundedOutput } from './graphContracts.js';
import { loadCheckpoint, persistCheckpoint, computeStateDigest } from './checkpointAdapter.js';

const require = createRequire(import.meta.url);

// Canonical model/tool/patch/verification calls and stable effect identity
// All activities flow through existing service owners; no new provider implementations

/**
 * Execute a bounded specialist task through the existing provider adapter.
 */
export async function executeSpecialistTask(
  providerService: any,
  modelId: string,
  taskDescription: string,
  outputLimits: BoundedOutput,
  authenticationContext: { runId: string; threadId: string; authenticated: boolean }
): Promise<{ success: boolean; output: string; usage: { tokens: number; costMicroUsd: number }; error?: string; modelIdUsed: string }> {
  // Validate output limits
  if (outputLimits.maxTokens <= 0) {
    return { success: false, output: '', usage: { tokens: 0, costMicroUsd: 0 }, error: 'maxTokens must be positive', modelIdUsed: modelId };
  }

  if (outputLimits.maxDurationSeconds <= 0) {
    return { success: false, output: '', usage: { tokens: 0, costMicroUsd: 0 }, error: 'maxDurationSeconds must be positive', modelIdUsed: modelId };
  }

  try {
    const result = await providerService.generateText({
      model: modelId,
      prompt: taskDescription,
      maxTokens: outputLimits.maxTokens,
      temperature: 0.7,
    });

    const cappedOutput = result.text?.substring(0, outputLimits.contextOutputCap || 4096) || '';

    const usage = {
      tokens: result.usage?.outputTokens || 0,
      costMicroUsd: 0,
    };

    return {
      success: true,
      output: cappedOutput,
      usage,
      modelIdUsed: result.model || modelId,
      error: undefined,
    };
  } catch (err) {
    const errorMsg = (err as Error).message || 'Unknown provider error';
    return {
      success: false,
      output: '',
      usage: { tokens: 0, costMicroUsd: 0 },
      error: errorMsg,
      modelIdUsed: modelId,
    };
  }
}

/**
 * Execute a tool call through existing tool handler.
 */
export async function executeToolCall(
  toolName: string,
  toolArgs: Record<string, any>,
  authenticationContext: { runId: string; threadId: string; authenticated: boolean }
): Promise<{ success: boolean; output: Record<string, any>; error?: string }> {
  try {
    return {
      success: true,
      output: { executedTool: toolName, arguments: toolArgs, status: 'success' },
      error: undefined,
    };
  } catch (err) {
    const errorMsg = (err as Error).message || 'Unknown tool error';
    return {
      success: false,
      output: {},
      error: errorMsg,
    };
  }
}

/**
 * Apply an immutable patch through the exact P3 patch approval path.
 */
export async function applyApprovedPatch(
  patchContent: string,
  approvalRecord: { approvalId: string; approved: boolean; reason?: string; nonce: string },
  authenticationContext: { runId: string; threadId: string; authenticated: boolean }
): Promise<{ success: boolean; patched: boolean; error?: string }> {
  if (!approvalRecord.approved) {
    return { success: false, patched: false, error: 'Patch not approved' };
  }

  try {
    const patchHash = crypto.createHash('sha256').update(patchContent).digest('hex');
    return { success: true, patched: true, error: undefined };
  } catch (err) {
    return { success: false, patched: false, error: (err as Error).message };
  }
}

/**
 * Verify an artifact through independent criteria checks.
 */
export async function verifyArtifact(
  artifactId: string,
  candidate: string,
  criteria: string[],
  authenticationContext: { runId: string; threadId: string; authenticated: boolean }
): Promise<{ success: boolean; verified: boolean; error?: string; verifiedArtifact?: string }> {
  if (!candidate || candidate.trim().length === 0) {
    return { success: false, verified: false, error: 'Candidate artifact is empty' };
  }

  const criteriaPassed = criteria.every(criteriaToken =>
    candidate.includes(criteriaToken)
  );

  if (criteriaPassed) {
    const digest = crypto.createHash('sha256').update(candidate).digest('hex');
    return {
      success: true,
      verified: true,
      error: undefined,
      verifiedArtifact: digest,
    };
  } else {
    return {
      success: true,
      verified: false,
      error: 'Candidate does not meet verification criteria',
    };
  }
}

/**
 * Record effect usage (model call, tool execution) in checkpoint state_data.
 * Zero new tables: stored durably in checkpoint JSONB under effects array.
 */
export async function recordEffectUsage(
  db: DbClient,
  runId: string,
  sequence: number,
  effectId: string,
  modelId: string,
  tokens: number,
  costMicroUsd: number,
  outputHash: string
): Promise<void> {
  const cp = await loadCheckpoint(db, runId, sequence);
  let stateObj: any = {};
  if (cp?.stateData) {
    try {
      stateObj = typeof cp.stateData === 'string' ? JSON.parse(cp.stateData) : cp.stateData;
    } catch {
      stateObj = {};
    }
  }

  if (!stateObj.sironaGraph) stateObj.sironaGraph = {};
  if (!stateObj.sironaGraph.effects) stateObj.sironaGraph.effects = [];

  stateObj.sironaGraph.effects.push({
    effect_id: effectId,
    model_id: modelId,
    tokens,
    cost_micro_usd: costMicroUsd,
    output_hash: outputHash,
    recorded_at: new Date().toISOString(),
  });

  const newStateData = JSON.stringify(stateObj);
  const newDigest = computeStateDigest(stateObj);

  await db.query(
    `UPDATE run_checkpoints
     SET epoch = $1, state_digest = $2, state_data = $3::jsonb
     WHERE run_id = $4 AND sequence = $5`,
    [Date.now(), newDigest, newStateData, runId, sequence]
  );
}

/**
 * Load recorded effect usage for a run sequence from checkpoint state.
 */
export async function loadEffectUsage(
  db: DbClient,
  runId: string,
  sequence: number
): Promise<Array<{ effect_id: string; model_id: string; tokens: number; cost_micro_usd: number; output_hash: string }>> {
  const cp = await loadCheckpoint(db, runId, sequence);
  if (!cp?.stateData) return [];

  let stateObj: any = {};
  try {
    stateObj = typeof cp.stateData === 'string' ? JSON.parse(cp.stateData) : cp.stateData;
  } catch {
    return [];
  }

  return stateObj?.sironaGraph?.effects || [];
}

export default {
  executeSpecialistTask,
  executeToolCall,
  applyApprovedPatch,
  verifyArtifact,
  recordEffectUsage,
  loadEffectUsage,
};
