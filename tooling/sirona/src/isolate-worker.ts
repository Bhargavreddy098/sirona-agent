// Evaluator module for a future qualified worker, never loaded in API/Electron processes.
// No host callbacks, References, filesystem, shell, network or credentials cross into the isolate.
import ivm from 'isolated-vm'

export interface Evaluation { source: string; timeoutMs: number; memoryMb: number }
export function evaluateTrustedQualification(input: Evaluation): string {
  if (!process.execArgv.includes('--no-node-snapshot')) throw new Error('Evaluator requires a dedicated Node process with --no-node-snapshot')
  if (typeof input.source !== 'string' || Buffer.byteLength(input.source) > 65536 || !Number.isInteger(input.timeoutMs) || input.timeoutMs < 1 || input.timeoutMs > 1000 || !Number.isInteger(input.memoryMb) || input.memoryMb < 8 || input.memoryMb > 64) throw new Error('Invalid evaluation limits')
  const isolate = new ivm.Isolate({ memoryLimit: input.memoryMb })
  try {
    const context = isolate.createContextSync()
    // A JSON string is the only result permitted across this boundary.
    const result: unknown = context.evalSync(`JSON.stringify((() => { ${input.source}\n})())`, { timeout: input.timeoutMs })
    if (typeof result !== 'string' || Buffer.byteLength(result) > 65536) throw new Error('Evaluation result must be bounded JSON')
    return result
  } finally { isolate.dispose() }
}

// Deliberately no host child-process launcher or public HTTP/IPC route.
// Native OS memory limits, termination and egress qualification must precede production admission.
