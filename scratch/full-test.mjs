// Full smoke test: verify host execution end-to-end
import { SandboxManager } from '../apps/server/services/sandboxManager.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { console.log(`PASS: ${name}`); pass++; }
  else { console.log(`FAIL: ${name}`); fail++; }
}

// Test 1: Flag OFF -> Docker backend (no regression)
delete process.env.SIRONA_HOST_EXECUTION;
const dockerBackend = await SandboxManager.resolveBackend({ allowHostExecution: false });
check('Flag off returns DockerSandboxBackend', dockerBackend.constructor.name === 'DockerSandboxBackend');

// Test 2: Flag ON -> HostExecutionBackend
process.env.SIRONA_HOST_EXECUTION = 'true';
const hostBackend = await SandboxManager.resolveBackend({ allowHostExecution: false });
check('Flag on returns HostExecutionBackend', hostBackend.constructor.name === 'HostExecutionBackend');

// Test 3: Real command execution
const res = await SandboxManager.execute({
  command: 'echo',
  args: ['hello-from-host-execution'],
  workspaceRoot: repoRoot,
  timeoutMs: 5000,
  maxOutputBytes: 1048576,
  allowHostExecution: false,
});
check('Exit code is 0', res.exitCode === 0);
check('Stdout contains output', res.stdout.includes('hello-from-host-execution'));
check('Stderr is empty', res.stderr === '');
check('Duration recorded', res.durationMs > 0);

// Test 4: PowerShell works on Windows
const psRes = await SandboxManager.execute({
  command: 'powershell',
  args: ['-Command', 'Write-Output "ps-works"'],
  workspaceRoot: repoRoot,
  timeoutMs: 10000,
  maxOutputBytes: 1048576,
  allowHostExecution: false,
});
check('PowerShell exit code 0', psRes.exitCode === 0);
check('PowerShell stdout contains output', psRes.stdout.includes('ps-works'));

// Test 5: Git Bash works
const gitRes = await SandboxManager.execute({
  command: 'git',
  args: ['--version'],
  workspaceRoot: repoRoot,
  timeoutMs: 10000,
  maxOutputBytes: 1048576,
  allowHostExecution: false,
});
check('Git exit code 0', gitRes.exitCode === 0);
check('Git stdout contains version', gitRes.stdout.includes('git version'));

// Test 6: Node works (npm may not be in PATH on Windows)
const nodeRes = await SandboxManager.execute({
  command: 'node',
  args: ['--version'],
  workspaceRoot: repoRoot,
  timeoutMs: 10000,
  maxOutputBytes: 1048576,
  allowHostExecution: false,
});
check('Node exit code is 0', nodeRes.exitCode === 0);
check('Node stdout contains version', nodeRes.stdout.includes('v'));

// Test 7: Exit code captured correctly (non-zero command)
const failRes = await SandboxManager.execute({
  command: 'node',
  args: ['-e', 'process.exit(42)'],
  workspaceRoot: repoRoot,
  timeoutMs: 5000,
  maxOutputBytes: 1048576,
  allowHostExecution: false,
});
check('Non-zero exit code captured', failRes.exitCode === 42);

// Test 8: Timeout enforcement
try {
  await SandboxManager.execute({
    command: 'powershell',
    args: ['-Command', 'Start-Sleep -Seconds 30'],
    workspaceRoot: repoRoot,
    timeoutMs: 2000,
    maxOutputBytes: 1048576,
    allowHostExecution: false,
  });
  check('Timeout enforced', false);
} catch (e) {
  check('Timeout enforced', e.code === 'EXECUTION_TIMEOUT');
}

// Test 9: Output limit enforcement
try {
  await SandboxManager.execute({
    command: 'powershell',
    args: ['-Command', 'Write-Output ("x" * 500000)'],
    workspaceRoot: repoRoot,
    timeoutMs: 10000,
    maxOutputBytes: 1000,
    allowHostExecution: false,
  });
  check('Output limit enforced', false);
} catch (e) {
  check('Output limit enforced', e.code === 'OUTPUT_LIMIT_EXCEEDED');
}

// Test 10: Flag off returns to Docker default (no regression)
delete process.env.SIRONA_HOST_EXECUTION;
const backToDocker = await SandboxManager.resolveBackend({ allowHostExecution: false });
check('Flag off returns to DockerSandboxBackend', backToDocker.constructor.name === 'DockerSandboxBackend');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);