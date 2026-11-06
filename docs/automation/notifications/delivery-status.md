---
title: "Notification delivery and read status"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
updated: "2026-11-05"
---

# Notification delivery and read status

The [Delivery schema](../contracts.md) keeps execution separate from pending/delivering/delivered/failed delivery state. readAt is a separate timestamp; reading an inbox item does not prove an external transport accepted anything.

Edition 1 local inbox publication and delivered state commit atomically. A crash before commit retries the same logical delivery; a crash after commit returns the existing item. Mark Read is idempotent and never changes the run result.

The inbox shows a sanitized summary and an authorized link to its result. Revoked access blocks result reads even if an older summary remains visible. Future external transports require their own acceptance/uncertainty contract.

All acceptance scenarios remain NOT RUN.
