---
title: "Scheduled job diagnosis"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
updated: "2026-11-05"
---

# Scheduled job diagnosis

Inspect in this order: schedule enabled/revision/expiry, previewed next instant/timezone, occurrence record/reason, canonical runtime state, then delivery state. Use [automation.list and occurrences](../contracts.md); do not repair a timer by resubmitting its project mutation.

No occurrence: inspect misfire window, overlap, clock suspension, count and aggregate budget. Blocked occurrence: inspect current contract/authority/dependency. Successful run with no inbox item: inspect delivery attempts and retry that delivery. Paused after editing is intentional until the new configuration is enabled.

Collect schedule/occurrence/run/operation IDs and sanitized reasons. Never export signing keys or provider credentials. F17-T10 through T15 specify the failure boundaries to reproduce.

All acceptance scenarios remain NOT RUN.
