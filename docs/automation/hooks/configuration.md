---
title: "Hook configuration"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
updated: "2026-11-05"
---

# Hook configuration

automation.registerHook creates a disabled Hook with a closed event-type filter, target schedule and optional bound secret reference; automation.setHook enables it under current authority. See [exact schemas](../contracts.md).

Configure the schedule's bounded standing authority first. An inbound event cannot select a different workspace, project, contract or cost ceiling. Disabling prevents new admission after the transaction commits but does not erase prior occurrences. Secret rotation immediately changes the accepted key; no implicit old-key grace window exists.

Invalid filters, foreign references and unqualified ingress remain errors. Edition 1 includes no arbitrary user callback or shell hook loader.

All acceptance scenarios remain NOT RUN.
