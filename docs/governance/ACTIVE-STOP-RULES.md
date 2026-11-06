# Sirona Active Governance & STOP Directives

> **Authority Level:** MANDATORY GOVERNANCE GATE  
> **Status:** ACTIVE & ENFORCED  
> **Last Synchronized:** 2026-11-03

---

## 1. Executive Summary

This document consolidates all authoritative **STOP directives**, protected architecture boundaries, approval gates, and safety constraints governing development in Sirona. No agent, subagent, or automated workflow may bypass, weaken, or silently override these rules without explicit user authorization.

---

## 2. Active STOP Directives

### STOP-01: Database Adapter Conflict Reconciliation & Verification
- **Context**: The owner approved **ADR-001 Option A** (SQLite for local desktop persistence, PostgreSQL for server deployments) on 2026-11-03.
- **Directive**: **STOP** all database-dependent feature implementations and automated test runs targeting working databases until the owner-mandated prerequisite audit is completed: verify existing adapters, migrations `001–024`, schema compatibility, and data ownership ([`ADR-001`](ARCHITECTURE-DECISION-REGISTRY.md#adr-001-database-engine-topology-sqlite-vs-postgresql)).
- **Enforcement**: Never apply unapproved migrations to production databases or run destructive SQL (`DROP TABLE`, `TRUNCATE`). All queries must use parameterized syntax (`$1, $2`) supported by both drivers.

### STOP-02: P5 Real-Provider Acceptance Gate & Inference Billing Guard
- **Context**: The owner conditionally approved **ADR-004 Option A** on 2026-11-03 to prepare for one bounded live-provider acceptance test.
- **Directive**: **STOP** executing live or billable inference calls. Controlled upstream mocks and synthetic fixtures remain the active verification baseline. No billable API call may be made until the owner separately approves the exact provider, model, and maximum cost ([`ADR-004`](ARCHITECTURE-DECISION-REGISTRY.md#adr-004-live-model-paid-inference-verification-gate)).

### STOP-03: P6 Gate B Docker Tools Image Qualification (Deferred)
- **Context**: The owner confirmed **ADR-007 Option B** (defer Gate B qualification) on 2026-11-03.
- **Directive**: **STOP** activating containerized tool execution or replacing P3's default image without explicit Gate B sign-off ([`ADR-007`](ARCHITECTURE-DECISION-REGISTRY.md#adr-007-containerized-tools-worker-qualification-p6-gate-b)).
- **Enforcement**: Preserve all existing sandbox safeguards (`apps/cli/docker/tools-worker.Dockerfile`, clamped Node child processes with timeouts). Uncontained host fallback is strictly forbidden. Mandatory human approval rules for tool execution remain active.

### STOP-04: Unrestricted Host Command Execution
- **Context**: Running unconstrained host processes risks workstation compromise or accidental data destruction.
- **Directive**: **STOP** executing uncontained host commands. Shell commands must run inside Docker WSL2 (`trusted-local` profile) or clamped Node child processes with hard timeouts (default 30s) and restricted user privileges.

### STOP-05: User Interface Freeze
- **Context**: The compact light/dark UI design in `apps/web` is locked under [`UI-FREEZE-CONTRACT.md`](file:///sironadocs/frontend/UI-FREEZE-CONTRACT.md).
- **Directive**: **STOP** redesigning UI themes, layouts, or component hierarchies. Enhancements must reuse existing design tokens in `apps/web/src/index.css`.

### STOP-06: Production Data & Secret Protection
- **Context**: AI credentials and project data must remain confidential.
- **Directive**: **STOP** printing, logging, or transmitting decrypted API keys or secret tokens. Decryption must occur solely inside Electron's `DesktopCredentialBroker` via DPAPI/`safeStorage`.

---

## 3. Preserved Architecture Decisions

1. **Monorepo Structure**: Node/Express (`apps/server`) + React 19/Vite (`apps/web`) + Electron (`apps/desktop`) + pnpm workspace packages (`packages/*`) stay in their current paths.
2. **Retired Components**: The legacy scaffold `frontend/sirona` was retired by owner cleanup; `apps/web` is the sole active frontend.
3. **Execution Containment**: Filesystem operations are strictly confined within `workspaceRoot` using `workspacePathResolver.js`. Path traversal attempts (`..`, symlink escapes) must fail with `403 PATH_OUTSIDE_WORKSPACE`.
