# Agent Implementation Guide: Workspace & Filesystem

This guide covers the implementation patterns for workspace management, path traversal defenses, and project scanning in Sirona.

---

## 1. Key Source Files
- Path Resolver: [`apps/server/services/workspacePathResolver.js`](file:///apps/server/services/workspacePathResolver.js)
- Project Scanner: [`apps/server/services/projectScannerService.js`](file:///apps/server/services/projectScannerService.js)
- Project Context: [`apps/server/services/projectContext.js`](file:///apps/server/services/projectContext.js)
- Routes: [`apps/server/routes/v1/workspace.routes.js`](file:///apps/server/routes/v1/workspace.routes.js), [`apps/server/routes/v1/projects.routes.js`](file:///apps/server/routes/v1/projects.routes.js)
- Frontend Explorer: [`apps/web/src/components/Sidebar.tsx`](file:///apps/web/src/components/Sidebar.tsx)

---

## 2. Canonical Path Resolution Algorithm

```javascript
import path from "node:path";
import fs from "node:fs";

export function resolveWorkspacePath(workspaceRoot, targetRelativePath) {
  if (!workspaceRoot || typeof workspaceRoot !== "string") {
    throw new Error("Workspace root is not configured");
  }

  const canonicalRoot = fs.realpathSync.native(path.resolve(workspaceRoot));
  const candidate = path.resolve(canonicalRoot, targetRelativePath);

  // Check traversal
  const relative = path.relative(canonicalRoot, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    const error = new Error(`Access Denied: Path '${targetRelativePath}' escapes workspace boundary.`);
    error.code = "PATH_OUTSIDE_WORKSPACE";
    error.status = 403;
    throw error;
  }

  // Canonicalize symlinks if candidate already exists
  if (fs.existsSync(candidate)) {
    const canonicalCandidate = fs.realpathSync.native(candidate);
    const candidateRelative = path.relative(canonicalRoot, canonicalCandidate);
    if (candidateRelative.startsWith("..") || path.isAbsolute(candidateRelative)) {
      const error = new Error(`Access Denied: Symlink '${targetRelativePath}' resolves outside workspace.`);
      error.code = "PATH_OUTSIDE_WORKSPACE";
      error.status = 403;
      throw error;
    }
    return canonicalCandidate;
  }

  return candidate;
}
```

---

## 3. Mandatory Safety Rules
> [!CAUTION] Symlinks created inside the project pointing to external files (e.g. `C:\Users\username\.ssh`) MUST be checked with `fs.realpathSync.native()` before opening.
> [!IMPORTANT] Always normalize Windows backslashes (`\`) and Unix forward slashes (`/`) using `path.normalize()`.
