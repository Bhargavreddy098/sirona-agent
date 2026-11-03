# Desktop Package Guide (`apps/desktop`)

`apps/desktop` is Sirona's Electron application wrapper. It hosts the desktop window, manages native OS boundaries, enforces origins, and protects sensitive credentials via OS-level encryption.

---

## 1. Responsibilities & Ownership Boundaries

- **Owns**:
  - Electron main process lifecycle (`src/main.cjs`).
  - Preload bridge exposing safe IPC methods to renderer (`src/preload.cjs`).
  - Native OS dialogs (folder picker, window controls).
  - OS credential broker using DPAPI / Electron `safeStorage` (`src/security/credentialBroker.ts`).
  - Embedded local web server serving static renderer assets on port 5176 (`src/server.cjs`).
- **Does Not Own**:
  - Express API routes or business services (owned by `apps/server`).
  - Chat interface components or UI state (owned by `apps/web`).

---

## 2. Directory Structure

```
apps/desktop/
├── src/
│   ├── main.cjs             # Main process: window creation, IPC handlers, server supervisor
│   ├── preload.cjs          # Context bridge exposing window.sironaDesktop
│   ├── server.cjs           # Local static HTTP server for renderer assets
│   ├── terminalProxy.cjs    # PTY / Terminal proxy bridge
│   └── security/
│       └── credentialBroker.ts # Windows DPAPI / safeStorage credential broker
├── dist/                    # Compiled TypeScript output for security modules
└── package.json
```

---

## 3. Relevant Canonical Technical Documentation

- **Workspace Filesystem & Desktop**: [`docs/subsystems/workspace-filesystem.md`](../../docs/subsystems/workspace-filesystem.md)
- **Model Gateway & Credentials**: [`docs/subsystems/model-gateway.md`](../../docs/subsystems/model-gateway.md)
- **Trusted Local Docker Profile**: [`docs/SIRONA-WORKSPACE-P3-DOCKER-PLAN.md`](../../docs/SIRONA-WORKSPACE-P3-DOCKER-PLAN.md)

---

## 4. Security & IPC Boundary Rules

1. **Origin Verification**: Every IPC handler in `src/main.cjs` must call `trusted(event)` before performing actions to verify the caller is `http://127.0.0.1:5176`.
2. **Never Expose Direct Shell/FS to Renderer**: The renderer must never be given unrestricted `node:fs` or `child_process` access via `preload.cjs`. All operations must pass through typed IPC or authorized Express routes.
3. **OS-Level Credential Protection**: API keys passed via `sirona-next:save-connection` are validated with Zod, encrypted using `DesktopCredentialBroker`, and saved to the backend without disclosing secrets in renderer logs.

---

## 5. Build & Verification Commands

```bash
# Build desktop TypeScript security modules
npm --prefix apps/desktop run build

# Typecheck desktop
npm --prefix apps/desktop run check
```
