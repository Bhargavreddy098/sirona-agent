---
title: "Scheduled payloads"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
updated: "2026-11-05"
---

# Scheduled payloads

A schedule references the exact project, session, approved Build Contract Ref/digest, per-run ceiling and bounded standing authority from [contracts](../contracts.md). It does not embed unrestricted scripts, secret values or an arbitrary executable callback.

At admission resolve these references under current scope. A moved project root, revoked grant, superseded contract, expired schedule, exhausted total budget or unavailable required profile blocks new work. Plan Only is not a runnable scheduled contract. Future changes to the prompt/tasks require a contract revision and schedule edit/re-enable.

The scheduler submits the same F09 runtime.start semantics as an interactive run. It never owns a second model/tool loop.

All acceptance scenarios remain NOT RUN.
