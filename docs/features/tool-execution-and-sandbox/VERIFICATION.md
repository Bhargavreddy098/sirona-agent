# Verification & Testing: Tool Execution & Sandbox

## 1. Acceptance Criteria & Test Matrix

| Test ID | Test Description | Verification Target | Pass Condition |
|---|---|---|---|
| `TES-01` | Safe file read within workspace | `read_file` on `package.json` | Returns file text and status 200 |
| `TES-02` | Traversal attack rejection | `read_file` on `../../Windows/win.ini` | Throws `403 PATH_OUTSIDE_WORKSPACE` |
| `TES-03` | Exact block edit | `edit_file` with matching target string | Target replaced, git diff emitted, status 200 |
| `TES-04` | Non-matching edit rejection | `edit_file` with absent target string | Throws `400 TARGET_NOT_FOUND`, file unchanged |
| `TES-05` | Shell execution in Docker | `execute_shell` running `uname -a` | Runs inside container, returns stdout with Linux kernel |
| `TES-06` | Timeout termination | `execute_shell` running `sleep 60` | Process killed at 30,000ms, returns `TIMED_OUT` |

---

## 2. Automated Test Commands

```bash
# Run tool runtime unit tests
pnpm --filter @sirona/server test tests/toolRuntimeService.test.js

# Run path traversal security tests
pnpm --filter @sirona/server test tests/workspacePathResolver.test.js

# Run sandbox Docker integration suite
pnpm --filter @sirona/server test tests/sandboxManager.docker.test.js
```
