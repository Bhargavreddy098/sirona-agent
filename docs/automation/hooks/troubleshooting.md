---
title: "Hook diagnosis"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
updated: "2026-11-05"
---

# Hook diagnosis

Inspect registered event type/filter and enabled state, event ID/digest, causation depth, target schedule authority and resulting occurrence. The [contract](../contracts.md) defines safe status/error behavior.

Duplicate acknowledgement is expected and should not be treated as a missing run. A changed-body conflict indicates reused identity, not permission to discard the dedupe record. Excess depth stops a recursive chain; investigate its source instead of increasing limits automatically. A signature error must not log the raw secret/body.

Keep failed events attributable with sanitized metadata. Recovery must preserve original operation identity and never bypass the canonical runtime.

All acceptance scenarios remain NOT RUN.
