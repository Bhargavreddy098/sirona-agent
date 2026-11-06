---
title: "Delivering scheduled results"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
updated: "2026-11-05"
---

# Delivering scheduled results

The [delivery contract](../contracts.md) defines the local inbox outbox, unique run/recipient identity and retry timings. The first automation release is IP11 after the IP10 local product release; external email/webhook delivery is not enabled by this local outbox.

A successful run and its pending delivery are durably connected. If publication fails, retry delivery only, using the original result. Do not rerun a patch, command or inference to recreate a notification.

F17-T14 fails delivery after an actual run result and verifies one project effect, one logical delivery and eventual local inbox publication. Exhausted retries stay failed until automation.retryDelivery is explicitly invoked.

All acceptance scenarios remain NOT RUN.
