---
title: "F21 verification specification"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
feature_id: "F21"
updated: "2026-11-05"
---

# F21 verification specification

All application scenarios are **NOT RUN**. Exact fixtures/actions/outcomes are in the acceptance table in [contracts](contracts.md), the single owner of this edition's behavior. Implement F21-T10, F21-T11, F21-T12, F21-T13, F21-T14, F21-T15 under tests/features/F21/. Each row identifies its requirement and operation; expand compound assertions into individually named tests without weakening the required outcome.

## Test construction

Use the [shared fixture/evidence contract](../engineering/build-handoff.md) and [isolated environments](../help/testing/environments.md). Check valid/invalid schemas, service transitions against real isolated SQLite, then actual RPC/native/adapter boundaries and consuming interfaces. Assert records, events, returned state and absence of forbidden effects. Race tests coordinate at named transaction boundaries; crash tests terminate a child process before/after the named effect/receipt point, not merely throw an exception in a helper.

Actual SQLite/native Windows packaging evidence; backup activation and updates need exact existing governance authority.

## Required evidence

Record case ID, requirement IDs, source commit, command, environment/profile digest, isolated target, actual result and sanitized evidence. Missing prerequisites are BLOCKED for test execution and UNKNOWN where the application verdict contract requires it. Doubles are labeled simulated and prove only the boundary exercised. Acceptance requires real consumer/qualification cases for the same source/configuration.

The former generic Fxx-T01–T06 categories are superseded by concrete T10-and-later cases; they are not evidence of previous successful runs. See the [implementation guide](implementation.md) for ordered slices and proposed commands.
