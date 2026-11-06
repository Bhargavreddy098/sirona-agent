---
title: "Hook event types"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
updated: "2026-11-05"
---

# Hook event types

The [hook contract](../contracts.md) allows run.succeeded, run.failed and artifact.created. The internal envelope carries eventId, type, occurredAt, causationId and depth. Workspace and authority derive from the originating trusted record, not model/payload fields.

A repeated (hookId,eventId) with the same body is acknowledged without another run. Changed body under that identity conflicts. Preserve causation across generated events, increment depth and reject depth above eight. Discovery/subscription is not an execution grant.

Wire version is the API/event version defined by the shared foundation; malformed known fields and unknown input fields are rejected. Output consumers may ignore compatible additive fields.

All acceptance scenarios remain NOT RUN.
