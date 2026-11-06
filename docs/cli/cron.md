---
title: "CLI scheduled jobs"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
updated: "2026-11-05"
---

# CLI scheduled jobs

Edition 1 uses sirona automation create/edit/enable/pause/list/runs with --input JSON as specified by the [CLI contract](contracts.md). There is no undocumented cron alias or direct database scheduler.

The [automation contract](../automation/contracts.md) owns Trigger shapes, timezones, revisions, standing budgets, run history and delivery. Enable/Pause map to automation.setState; runs maps to automation.occurrences. Noninteractive mutations require an explicit --key and applicable --revision; pending approval returns exit 3.

Validate a CLI-created job through the same UI preview/history and compare persisted records. No CLI flag may bypass qualification, spending authority or overlap rules.

All acceptance scenarios remain NOT RUN.
