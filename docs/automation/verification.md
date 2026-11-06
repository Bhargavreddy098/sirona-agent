---
title: "F17 verification specification"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
feature_id: "F17"
updated: "2026-11-05"
---

# F17 verification specification

All application scenarios are **NOT RUN**. The exact fixtures/actions/outcomes are the acceptance table in [contracts](contracts.md). Implement F17-T10, F17-T11, F17-T12, F17-T13, F17-T14, F17-T15 and F17-T16 under tests/features/F17/. Each case binds its requirement and operation.

## Test construction

Use the [shared fixture/evidence contract](../engineering/build-handoff.md) and [isolated environments](../help/testing/environments.md). Use a fake clock with actual SQLite/runtime admission. Coordinate pollers at transaction boundaries, terminate a child process after admission, and inspect occurrence/run identities after restart. Check calendar preview against admission at DST gaps/folds and after machine sleep.

Run signature/replay tests against actual raw HTTP bytes, including whitespace changes after signing. Delivery failure must produce zero additional project mutations. Race two admissions against the total budget/count ceiling, then revoke standing authority and prove no later dispatch.

## Required evidence

Record case/requirement IDs, source revision, exact command, environment, isolated target and sanitized actual results. External ingress remains disabled without explicit configuration/qualification. Provider/guest work requires its separate authority; doubles prove only the boundary exercised.

The former generic Fxx-T01–T06 categories are superseded by these concrete cases. See the [implementation guide](implementation.md) for ordered slices and proposed commands.
