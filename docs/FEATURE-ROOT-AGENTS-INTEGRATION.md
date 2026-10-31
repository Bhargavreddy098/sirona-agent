# Optional root AGENTS.md integration — proposed snippet

> This file is a **proposal**, not an edited root `AGENTS.md` or an authorization record. The user's supplied ZIP contains only `docs/`; inspect the real root `AGENTS.md` and current policy before integrating these lines. Place them in the appropriate existing section instead of duplicating/conflicting rules.

## Why root linkage matters

Creating `docs/FEATURE-END-TO-END-WORKFLOW.md` does not guarantee an AI agent will read it. An agent may discover the document through `docs/README.md` or an explicit prompt, but dependable usage requires either the root agent instructions linking to it or the orchestrator passing it to the agent.

## Proposed root AGENTS.md section

```markdown
## New feature / backend route / frontend integration workflow

When assigned a new feature or an API route change:

1. Read `docs/SIRONA-AGENT-HANDOFF.md` and current authority/approval records.
2. Read `docs/FEATURE-END-TO-END-WORKFLOW.md` and the exact task under `docs/features/`.
3. If the task has no spec, use `docs/FEATURE-SPEC-TEMPLATE.md` to prepare a **read-only proposal** first.
4. Inspect actual route mounts, services, database owner, frontend client/state/UI and tests; do not implement on assumed file paths.
5. Reuse an existing route/contract before proposing an additive endpoint.
6. Agree a single shared request/response/error/event contract before backend and frontend agents write code.
7. Check the exact approved paths and prerequisites; Markdown status is not a permission grant.
8. Build a feature end-to-end only within approved scope: domain service -> registered API -> typed client -> frontend UI -> full integration verification.
9. Record actual evidence and update existing route/technology/task ledgers and handoff. Never infer production acceptance from docs, mocks or earlier test passes.
10. Obey all current STOP and security/approval rules in this file and the owner decisions. When any workflow instruction conflicts, the stricter/current controlling rule wins and the affected work stops for clarification.
```

## Two supported trigger styles

**Manual explicit invocation:**

```text
Inspect docs/features/FEATURE-018-my-feature.md following root AGENTS.md and docs/FEATURE-END-TO-END-WORKFLOW.md. Read-only first; produce the contract and exact scope/approval packet.
```

After the owner authorizes a precise implementation:

```text
Implement docs/features/FEATURE-018-my-feature.md under approval [real reference], following root AGENTS.md and docs/FEATURE-END-TO-END-WORKFLOW.md. Prove backend-to-frontend end-to-end and report evidence.
```

**Automated orchestration (requires real code, not just Markdown):**

```text
User explicitly requests feature execution
  -> task registry records signed/verified owner request
  -> controller loads feature Markdown + current policy + source tree
  -> approval checker resolves actual scoped approval record
  -> dependency/DB/scope guard denies unsafe work
  -> orchestrator dispatches inspection or implementation agent
  -> agent edits approved files, runs guarded tests, reports receipts
  -> independent reviewer audits evidence
  -> owner accepts or requests revision
```

Never run arbitrary file contents from a directory watcher. Do not trust `status: approved` in editable task Markdown as proof of real user approval. An agent needs tools, scope, permission and a deliberate trigger to execute work.

## Status metadata suggestion (optional)

A task file may use **descriptive** YAML front matter for indexing:

```yaml
---
feature_id: FEATURE-018
state: proposed
mode: inspection_only
requested_by: user
approval_reference: null
blocked_by:
  - verify_current_backend_database_owner
---
```

Do not let metadata fields alone authorize data writes, migrations, paid inference, privileged execution, deployment, or expansion of scope.
