# Feature Specification: Approvals & Governance

> [!TIP]
> **Agent Context Guidance**: Load only this feature directory (`docs/features/approvals-and-governance/`), [`docs/governance/ACTIVE-STOP-RULES.md`](../../governance/ACTIVE-STOP-RULES.md), and direct cross-feature dependencies explicitly cited below. Do not load unreferenced feature specifications or legacy archives into working context.

## 1. Context & Problem Statement
Sirona supports both **Supervised** and **Autonomous** operating modes. To prevent unauthorized modifications to external infrastructure, data stores, or production code, the Governance engine classifies every planned action according to its risk level and gates sensitive operations behind human approval.

---

## 2. Risk Classification Matrix

```mermaid
graph TD
    Action["Agent Tool Call"] --> Classifier["Risk Evaluator (governanceService.js)"]
    
    Classifier --> Low["Low Risk: Read-only operations (read_file, list_dir, search)"]
    Classifier --> Medium["Medium Risk: Non-destructive edits within workspace"]
    Classifier --> High["High Risk: Destructive edits, shell commands, git push, migrations"]
    Classifier --> Critical["Critical: Credential access, deletion of root files, system configs"]
    
    Low --> AutoExec["Auto-Execute"]
    Medium --> ModeCheck{"Autonomy Mode?"}
    ModeCheck -->|Autonomous| AutoExec
    ModeCheck -->|Supervised| RequestApproval["Queue in Approvals & Emit approval.requested"]
    High --> RequestApproval
    Critical --> ExplicitApproval["Require Double-Confirmation in UI"]
```

---

## 3. Governance Invariants
1. **Unbypassable Interception**: The ReAct execution engine cannot call `toolRuntimeService.executeTool()` without first obtaining a cryptographic or DB-signed approval token from `governanceService`.
2. **Audit Immutability**: All decisions (`approved`, `rejected`, `timed_out`) and action parameters are recorded in `audit_events` with SHA-256 fingerprinting.
3. **Approval Expiration**: Pending approvals expire after 10 minutes (600s). If expired, the turn resumes with `APPROVAL_EXPIRED` rejection.
