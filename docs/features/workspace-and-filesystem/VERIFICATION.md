# Verification & Testing: Workspace & Filesystem

## 1. Acceptance Criteria & Test Matrix

| Test ID | Test Description | Verification Target | Pass Condition |
|---|---|---|---|
| `WFS-01` | Workspace tree generation | `GET /api/v1/workspace/tree` | Returns accurate hierarchy; ignores `node_modules` |
| `WFS-02` | Jailbreak via relative `..` | `resolveWorkspacePath("..\\secret.txt")` | Throws `403 PATH_OUTSIDE_WORKSPACE` |
| `WFS-03` | Junction / Symlink escape | Symlink to `C:\Windows` | `fs.realpath` detects escape; throws `403` |
| `WFS-04` | AST scan performance | `POST /api/v1/projects/:id/scan` on 500 files | Finishes under 3,000ms, outputs symbol catalog |
| `WFS-05` | Case insensitivity on Windows | `src/Index.ts` vs `src/index.ts` | Normalized cleanly to canonical disk casing |

---

## 2. Automated Test Commands

```bash
# Run workspace resolver unit and security tests
pnpm --filter @sirona/server test tests/workspacePathResolver.test.js

# Run project scanner and AST extraction tests
pnpm --filter @sirona/server test tests/projectScannerService.test.js
```
