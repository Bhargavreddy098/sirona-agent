---
title: "Managing schedules"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
updated: "2026-11-05"
---

# Managing schedules

Use automation.create/edit/setState/runNow/list/occurrences from the [owner contract](../contracts.md). New schedules are paused. Enabling requires a human grant binding trigger, contract, expiry, occurrence count and aggregate cost ceiling. It cannot create unlimited standing spend from a per-run budget.

Edit uses expectedRevision; a behavior change pauses the job until re-enabled under its new descriptor. A stale revision conflicts without updating anything. Pausing/deleting prevents future admission and preserves occurrences. It does not cancel an admitted run.

Run Now has its own idempotent manual occurrence identity, retains the recurrence anchor and obeys overlap/current authority. UI and CLI display run history separately from configuration and inbox delivery.

All acceptance scenarios remain NOT RUN.
