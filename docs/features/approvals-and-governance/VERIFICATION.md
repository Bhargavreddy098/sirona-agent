# Verification & Testing: Approvals & Governance

## 1. Acceptance Criteria & Test Matrix

| Test ID | Test Description | Verification Target | Pass Condition |
|---|---|---|---|
| `GOV-01` | Read-only auto-execution | `read_file` in supervised mode | Executes immediately without generating pending approval |
| `GOV-02` | Shell approval interception | `execute_shell` (`rm -rf`) | Halts turn, enters `pending`, emits `approval.requested` |
| `GOV-03` | User rejection handling | User clicks "Reject" on approval | Tool is NOT executed, agent is informed of user refusal |
| `GOV-04` | Expiration handling | Approval pending for > 600s | Marked `expired`, turn completes with rejection notice |
| `GOV-05` | Audit event logging | Any approved or rejected action | Immutable record saved in `audit_events` with SHA-256 hash |

---

## 2. Automated Test Commands

```bash
# Run governance service and risk policy unit tests
pnpm --filter @sirona/server test tests/governanceService.test.js

# Run audit logger tamper-resistance tests
pnpm --filter @sirona/server test tests/auditLogger.test.js
```
