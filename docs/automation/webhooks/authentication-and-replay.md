---
title: "Webhook authentication and replay"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
updated: "2026-11-05"
---

# Webhook authentication and replay

POST /api/v1/hooks/HOOK_ID uses the raw-body HMAC protocol in [contracts](../contracts.md). Verify the exact timestamp-dot-body bytes before JSON decoding, compare signatures in constant time, enforce the 64 KiB body limit and allowed clock window, then derive scope from the stored hook.

Example failure: changing JSON whitespace after signing changes raw bytes and must fail signature verification. Replaying a valid identical event is acknowledged without a second occurrence. Reusing the event ID with a different authenticated body conflicts.

A loopback listener is not public ingress. External exposure needs an explicitly configured and qualified ingress path; no public deployment follows from enabling a local hook. F17-T13 covers tampering, stale timestamps and replay.

All acceptance scenarios remain NOT RUN.
