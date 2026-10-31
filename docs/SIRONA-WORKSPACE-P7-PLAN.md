# Sirona Phase 7 — Monaco Editor, Side-by-Side Diff Review & Workspace Integration

**Status:** IMPLEMENTED & SCOPED VERIFIED (2026-10-31)
**Scope:** Frontend Cursor-style code inspection, Monaco side-by-side Diff Viewer, read-only file viewer, inline approval review triggers, and atomic host patch integration.

---

## 1. Overview & Architecture

Phase 7 connects Sirona's durable execution engine and sandboxed workspace to a desktop development user experience inspired by Cursor and VS Code.

### Core Architecture

```
User Action (Chat/Inline Card) 
  ──▶ InlineApprovalCard ("Review Diff")
        ──▶ workspaceApi.patchPreview(projectId, artifactId)
              ──▶ DiffReviewModal (Monaco DiffEditor)
                    ├── [Accept] ──▶ api.decide('approve') ──▶ workspaceApi.applyPatch() ──▶ Atomic Host Update
                    └── [Reject] ──▶ api.decide('reject')  ──▶ Zero File Writes (Host Untouched)
```

1. **Monaco Code Editor (`CodeEditor.tsx`):**
   - Read-only file viewer with syntax highlighting across TypeScript, JavaScript, Python, SQL, JSON, Markdown, and more.
   - Tab management powered by Zustand (`editorState.ts`).
   - Breadcrumb navigation, line numbers, folding, and dark theme (`vs-dark`).
2. **Side-by-Side Monaco Diff Review (`DiffReviewModal.tsx`):**
   - Displays real patch previews side-by-side with original vs modified code.
   - Highlights green additions and red deletions with addition/deletion stats (+N -M).
   - Allows switching between multiple files touched by a multi-file patch.
   - Rejection records decision in PostgreSQL and makes zero filesystem modifications.
   - Acceptance obtains approval proof, acquires an advisory lock (`8124`), verifies the base tree digest (`treeDigest === baseDigest`), applies the patch using verified `patch.ps1`, and records completion.
3. **Inline Approval Integration (`InlineApprovalCard.tsx`):**
   - For file and patch actions, provides a dedicated **"Review Diff"** button.
   - Launches `DiffReviewModal` with the real artifact ID.

---

## 2. API Contract & Routes

| Method | Path | Backend Handler | Client Method | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/projects/:projectId/file` | `workspace.routes.js` | `workspaceApi.file()` | Fetches single file content for Monaco reader |
| `GET` | `/api/v1/projects/:projectId/files` | `workspace.routes.js` | `workspaceApi.files()` | Lists project files in File Drawer |
| `GET` | `/api/v1/projects/:projectId/patch-previews/:artifactId` | `workspace.routes.js` | `workspaceApi.patchPreview()` | Fetches patch diff artifact for Monaco DiffEditor |
| `POST` | `/api/v1/projects/:projectId/patch-previews/:artifactId/apply` | `workspace.routes.js` | `workspaceApi.applyPatch()` | Atomically applies verified patch to host filesystem |
| `POST` | `/api/v1/approvals/:approvalId/decisions` | `governance.routes.js` | `executionApi.decide()` | Records authoritative approval (approve or reject) |

---

## 3. Verification & Evidence

### Test Execution Results
- **Frontend test suite (`tests/editor-diff.test.mjs` + existing suites):**
  - Command: `npm --prefix frontend/sirona-next test`
  - Result: **17/17 tests passed (0 failures, 206ms)**
  - Tests verify:
    - Tab management and language detection across 12 file types.
    - Side-by-side diff review opening, active file switching, and cleanup.
    - Accept workflow: submits approval then calls atomic apply with `Idempotency-Key`.
    - Reject workflow: records rejection in database and executes zero filesystem writes.
    - Error handling: `BASE_SNAPSHOT_MISMATCH` (409) and `WORKSPACE_BUSY` (409).
- **TypeScript compilation check:**
  - Command: `npm --prefix frontend/sirona-next run check`
  - Result: **`tsc -b` passed with 0 errors**.
- **Production Build:**
  - Command: `npm --prefix frontend/sirona-next run build`
  - Result: **Vite production build succeeded (2.07s)**.
- **Backend Admission Tests:**
  - Command: `node --test backend/tests/admission.test.js`
  - Result: **159/159 tests passed (4.1s)**.

---

## 4. Remaining Blockers & Next Gates

- **P5 Real-Provider E2E:** Real external LLM inference remains unverified under owner no-cost instruction.
- **Docker Desktop Service:** Docker Desktop daemon must be running on host for live container guest PTY and Phase 6 Gate B image building.
- **Phase 8 Release:** Production installer packaging (`electron-builder`) and database restore rehearsals remain pending.
