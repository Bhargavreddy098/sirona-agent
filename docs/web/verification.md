---
title: "F23 verification specification"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
feature_id: "F23"
updated: "2026-11-05"
---

# F23 verification specification

All application scenarios are **NOT RUN**. Exact fixtures/actions/outcomes are in the acceptance table in [contracts](contracts.md), the single owner of this edition's behavior. Implement F23-T10, F23-T11, F23-T12, F23-T13, F23-T14, F23-T15 under tests/features/F23/. Each row identifies its requirement and operation; expand compound assertions into individually named tests without weakening the required outcome.

## Test construction

Use the [shared fixture/evidence contract](../engineering/build-handoff.md) and [isolated environments](../help/testing/environments.md). Check valid/invalid schemas, service transitions against real isolated SQLite, then actual RPC/native/adapter boundaries and consuming interfaces. Assert records, events, returned state and absence of forbidden effects. Race tests coordinate at named transaction boundaries; crash tests terminate a child process before/after the named effect/receipt point, not merely throw an exception in a helper.

Real native/backend consumer integration; no hardcoded workspace, model response or terminal output.

## Required evidence

Record case ID, requirement IDs, source commit, command, environment/profile digest, isolated target, actual result and sanitized evidence. Missing prerequisites are BLOCKED for test execution and UNKNOWN where the application verdict contract requires it. Doubles are labeled simulated and prove only the boundary exercised. Acceptance requires real consumer/qualification cases for the same source/configuration.

The former generic Fxx-T01–T06 categories are superseded by concrete T10-and-later cases; they are not evidence of previous successful runs. See the [implementation guide](implementation.md) for ordered slices and proposed commands.
