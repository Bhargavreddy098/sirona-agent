# Verification & Testing: Agent Runtime & ReAct Loop

## 1. Acceptance Criteria & Test Matrix

| Test ID | Test Description | Verification Target | Pass Condition |
|---|---|---|---|
| `ARL-01` | Sequential turn lease lock | Start two turns simultaneously | First turn succeeds; second receives `409 TURN_LEASE_CONFLICT` |
| `ARL-02` | Multi-step tool execution | Prompt requiring 3 file edits | 3 sequential `tool.call` and `tool.result` events emitted before finish |
| `ARL-03` | Mid-loop cancellation | User clicks 'Stop' during step 2 | Upstream call aborted, turn marked `cancelled`, lease freed in DB |
| `ARL-04` | Step limit circuit breaker | Induce circular tool calling | Execution forcibly breaks at step 25 with `MAX_STEPS_EXCEEDED` |
| `ARL-05` | Human approval pause | Execute dangerous shell command | ReAct loop pauses, emits `approval.requested`, resumes upon decision |

---

## 2. Automated Test Commands

```bash
# Run agent loop and turn coordinator unit tests
pnpm --filter @sirona/server test tests/agentExecutionEngine.test.js

# Run turn lease concurrency and race condition tests
pnpm --filter @sirona/server test tests/turnLeaseService.test.js

# Run full end-to-end turn execution mock
node apps/web/tests/run-events.test.mjs
```
