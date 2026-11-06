---
title: "Implementing hooks"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
updated: "2026-11-05"
---

# Implementing hooks

Implement a typed event-to-owner adapter, not user-executable callbacks. Decode the [hook envelope](../contracts.md), resolve configured hook/schedule, check deduplication and causation depth, then call the ordinary bounded occurrence admission path.

Persist event admission and its resulting occurrence identity transactionally. A retry after a lost response must query that identity. Never put business SQL or shell execution into the HTTP transport handler.

Test malformed payload, disabled hook, duplicate ID, changed body under the same ID, foreign scope and a recursive event chain reaching depth nine. Each rejected case must cause zero new runtime dispatches.

All acceptance scenarios remain NOT RUN.
