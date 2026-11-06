---
title: "Recurrence and timezone"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
updated: "2026-11-05"
---

# Recurrence and timezone

The [schedule contract](../contracts.md) defines the exact Trigger union, five-field cron grammar, IANA timezone, DST rules and limits. Preview and admission use the same evaluator.

Example: every 10 minutes is anchor+n*600000 UTC and never drifts with completion time. A daily 02:30 calendar schedule skips a spring-forward gap; a repeated 01:30 selects the first fall-back occurrence. No implicit seconds field or host-timezone default is accepted.

After three hours asleep, misfire=skip admits none; latest admits at most the most recent eligible instant within 24 hours. Overlap always skips an already-active/uncertain scheduled run in Edition 1. Bounded catch-up is not supported. F17-T11/T12 verify these exact choices with the clock fixture.

All acceptance scenarios remain NOT RUN.
