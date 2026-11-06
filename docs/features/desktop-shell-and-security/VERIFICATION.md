# Verification & Testing: Desktop Shell & OS Security

## 1. Acceptance Criteria & Test Matrix

| Test ID | Test Description | Verification Target | Pass Condition |
|---|---|---|---|
| `DS-01` | DPAPI roundtrip encryption | Save and retrieve provider key | Plaintext matches original; raw disk bytes are ciphertext |
| `DS-02` | Native directory picker | Invoke `openDirectoryDialog` | Opens native OS dialog, returns absolute directory path |
| `DS-03` | Context isolation audit | Inspect `window` in renderer devtools | No `nodeIntegration` objects (`require`, `process`) exposed |
| `DS-04` | Terminal PTY connection | Connect to local PTY WebSocket | Streams interactive bash/powershell session cleanly |
| `DS-05` | Window controls | Click minimize/maximize/close | Window state updates without exceptions |

---

## 2. Automated Test Commands

```bash
# Test credential broker DPAPI encryption
node apps/web/tests/desktop-credentials.mjs

# Test live Electron IPC launch and window lifecycle
node apps/web/tests/desktop-live.mjs
```
