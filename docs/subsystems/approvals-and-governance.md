# Approvals, Governance & Autonomy Engine

**Subsystem:** Approvals, Governance & Autonomy Engine  
**Owning Package:** `apps/server` (with security policies in `dist-workspace/src/security/`)  
**Status:** Implemented in Backend & Database; UI Approval Dialog in React  
**Read When:** Working on inline human-in-the-loop approvals, autonomy modes (Ask Before Every Change, Autonomous), tool grants, or execution policy.

---

## 1. Overview & Architectural Role

The **Governance Subsystem** enforces the principle of least privilege for agent operations. Depending on the selected **Autonomy Mode**, high-risk actions (file modifications, shell commands, MCP mutation tools) require explicit user approval before execution.

```
                      ┌────────────────────────────┐
                      │    Agent Execution Loop    │
                      └─────────────┬──────────────┘
                                    │
                                    ▼
                      ┌────────────────────────────┐
                      │    GovernanceService       │
                      │  (services/                │
                      │   governanceService.js)    │
                      │  - Autonomy Mode Check     │
                      │  - Risk Classification     │
                      └───────┬───────────┬────────┘
                              │           │
                Autonomy:     │           │ Autonomy:
            "Ask Before"      │           │ "Autonomous"
                              ▼           │
                      ┌───────────────┐   │
                      │ Create Pending│   │
                      │ Approval Row  │   │
                      │ (status:      │   │
                      │  pending)     │   │
                      └───────┬───────┘   │
                              │           │
                     User Reviews in UI   │
                              │           │
                      ┌───────▼───────┐   │
                      │ User Approves │   │
                      │ (status:      │   │
                      │  approved)    │   │
                      └───────┬───────┘   │
                              │           │
                              ▼           ▼
                      ┌────────────────────────────┐
                      │     Dispatch Tool Effect   │
                      │     (effectJournal.js)     │
                      └────────────────────────────┘
```

---

## 2. Autonomy Modes & Risk Classes

| Autonomy Mode | Automatic Authority | Required Approval |
|---|---|---|
| **Plan Only (`readonly`)** | File inspection, codebase search, context packing | All project writes, modifications, and shell commands |
| **Ask Before Every Change (`supervised`)** | Read operations | Every file write, patch application, and shell command |
| **Autonomous Coding (`guarded`)** | Edits and approved test runs within task boundary | Out-of-bounds paths, package installations, git pushes |
| **Full Autonomous Build (`autonomous`)** | End-to-end local work explicitly covered by run grant | Destructive operations, credential changes |

---

## 3. Implementation Ownership & File Map

| Responsibility | Owning File | Interfaces & Primary Exports |
|---|---|---|
| **Governance Engine** | `apps/server/services/governanceService.js` | `GovernanceService.requestApproval()`, `resolveApproval()` |
| **Execution Policy Enforcer** | `apps/server/dist-workspace/src/security/executionPolicy.js` | `requireRunApproval()`, `requireToolGrants()` |
| **Approvals API** | `apps/server/routes/v1/governance.routes.js` | `GET /api/v1/approvals/pending`, `POST /api/v1/approvals/:id/resolve` |
| **Effect Journal** | `apps/server/dist-workspace/src/execution/effectJournal.js` | `ensureEffect()`, `dispatchEffect()`, `settleEffect()` |
| **Frontend Approval UI** | `apps/web/src/components/MainCanvas.tsx` / `Sidebar.tsx` | Pending approvals banner & review modal |

---

## 4. How to Gate an Operation with Approval

When adding a new sensitive action:
1. Classify its risk in `toolRuntimeService.js` (`"risk_class": "high"`).
2. Before executing the side effect, check policy:
   ```js
   const approvalNeeded = GovernanceService.requiresApproval(run.autonomyMode, toolRisk);
   if (approvalNeeded) {
     const approval = await GovernanceService.createPendingApproval({
       runId,
       toolName,
       payload,
     });
     // Wait for approval event or poll status
   }
   ```
3. Record the resolved approval ID in the immutable `effectJournal.js` before applying changes.
