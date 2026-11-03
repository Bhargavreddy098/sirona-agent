# Workspace Filesystem & Desktop Integration

**Subsystem:** Workspace Filesystem, Project Selection & Desktop Shell  
**Owning Package:** `apps/desktop` (Electron) & `apps/server` (Workspace Broker)  
**Status:** Implemented & Verified in Desktop Shell; Folder Picker Integrated  
**Read When:** Working on folder selection, Electron IPC bridges, workspace persistence, project scanning, or path resolution.

---

## 1. Overview & Architectural Role

The **Workspace Filesystem Subsystem** manages the developer's local project directories. Sirona is local-first: code lives directly on the developer's machine, and all agent operations are restricted to an explicitly authorized folder root.

```
┌────────────────────────────────────────────────────────┐
│                   Electron Main Process                │
│                 (apps/desktop/src/main.cjs)            │
│   - IPC Handler: sirona-next:pick-folder               │
│   - Native dialog: dialog.showOpenDialog               │
└───────────────────────────┬────────────────────────────┘
                            │ Returns folder path
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Frontend UI / Sidebar                │
│             (apps/web/src/components/Sidebar.tsx)      │
│   - Calls window.sironaDesktop.pickFolder()            │
│   - Updates active project & triggers file tree        │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP POST /api/v1/workspace
                            ▼
┌────────────────────────────────────────────────────────┐
│                    Workspace Service                   │
│             (apps/server/routes/v1/workspace.routes.js)│
│   - Validates canonical path exists                    │
│   - Scans directory tree (apps/server/services/        │
│     projectScannerService.js)                          │
│   - Persists workspace metadata in DB                  │
└────────────────────────────────────────────────────────┘
```

---

## 2. Implementation Ownership & File Map

| Responsibility | Owning File | Interfaces & Primary Exports |
|---|---|---|
| **Electron Native Picker** | `apps/desktop/src/main.cjs` | `ipcMain.handle('sirona-next:pick-folder', ...)` |
| **Electron Preload Bridge** | `apps/desktop/src/preload.cjs` | `window.sironaDesktop.pickFolder()` |
| **Workspace Routes** | `apps/server/routes/v1/workspace.routes.js` | `GET /api/v1/workspace`, `POST /api/v1/workspace/select` |
| **Path Traversal Guard** | `apps/server/services/workspacePathResolver.js` | `resolveWorkspacePath(workspaceRoot, relativePath)` |
| **Project Scanner & Digest**| `apps/server/services/projectScannerService.js` | `ProjectScannerService.scanProject()`, `generateContextPack()` |
| **Context Assembler** | `apps/server/dist-workspace/src/context/contextAssembler.js` | Token-budgeted context builder for agent prompts |

---

## 3. Desktop IPC & Trust Boundary

1. **Origin Verification**: In `apps/desktop/src/main.cjs`, `trusted(event)` ensures IPC requests originate exclusively from the authenticated local renderer frame (`http://127.0.0.1:5176`).
2. **Dialog Security**: The folder picker runs via native OS API (`dialog.showOpenDialog`) with properties `openDirectory` and `dontAddToRecent`. The renderer never receives arbitrary OS execution privileges through the picker.
3. **Workspace Path Sanitization**:
   - The selected directory is stored in PostgreSQL/SQLite `projects` or `desktop_settings`.
   - All subsequent tool calls (`read_file`, `write_file`) must provide paths relative to this verified root.

---

## 4. How to Extend Workspace Operations

1. **Adding File Tree APIs**:
   - Check existing routes in `apps/server/routes/v1/filesController.js` or `workspace.routes.js`.
   - Never expose absolute path endpoints without validating against `workspacePathResolver.js`.
2. **Adding Tree Invalidation**:
   - Chokidar watcher (`packages/ai` or `apps/server`) listens for filesystem events to invalidate AST / context cache.
