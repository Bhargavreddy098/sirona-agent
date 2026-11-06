---
title: "How scheduled work runs"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
updated: "2026-11-05"
---

# How scheduled work runs

A poll observes due work; F03's transaction decides admission. The [occurrence contract](../contracts.md) uses uniqueness over schedule ID and scheduled UTC instant, excluding revision. Editing a job cannot make the same instant run twice. The stored occurrence still records which revision was used.

Admission reloads enabled state, checks expiry/count/aggregate budget, reserves standing authority and creates the canonical F09 run in the same transaction. A lost poller after commit recovers that runId. It never starts a replacement because notification or acknowledgement was lost.

Exercise F17-T10 with two pollers and process termination after admission. Test pause committed before admission (no run) and admission committed before pause (existing run remains; cancellation is separate).

All acceptance scenarios remain NOT RUN.
