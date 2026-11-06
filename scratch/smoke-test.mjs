// Smoke test: verify host execution works with SIRONA_HOST_EXECUTION=true
import { SandboxManager } from '../apps/server/services/sandboxManager.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

async function main() {
  // Test 1: resolveBackend returns HostExecutionBackend when flag is set
  const backend = await SandboxManager.resolveBackend({ allowHostExecution: false });
  console.log('Backend kind:', backend.constructor.name);
  console.log('Health:', JSON.stringify(await backend.checkHealth()));

  // Test 2: Execute a real command on the host
  const res = await SandboxManager.execute({
    command: 'echo',
    args: ['hello-from-host-execution'],
    workspaceRoot: repoRoot,
    timeoutMs: 5000,
    maxOutputBytes: 1048576,
    allowHostExecution: false,
  });
  console.log('Exit code:', res.exitCode);
  console.log('Stdout:', JSON.stringify(res.stdout));
  console.log('Stderr:', JSON.stringify(res.stderr));
  console.log('Duration ms:', res.durationMs);

  const ok = res.exitCode === 0 && res.stdout.includes('hello-from-host-execution');
  console.log(ok ? 'PASS: host execution works' : 'FAIL');
  process.exit(ok ? 0 : 1);
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });