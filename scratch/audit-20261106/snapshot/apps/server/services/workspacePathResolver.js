// @ts-check
import fs from "node:fs";
import path from "node:path";

/**
 * DOS reserved device names.
 */
const DOS_DEVICE_NAMES = new Set([
  "CON", "PRN", "AUX", "NUL",
  "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
  "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
]);

/**
 * Custom error class for workspace containment violations.
 */
export class WorkspacePathError extends Error {
  /**
   * @param {string} code
   * @param {number} status
   * @param {string} message
   */
  constructor(code, status, message) {
    super(message);
    this.name = "WorkspacePathError";
    this.code = code;
    this.status = status;
  }
}

/**
 * WorkspacePathResolver
 * Canonicalizes workspace roots and guarantees absolute filesystem containment,
 * resolving directory junctions, reparse points, and symlinks.
 */
export class WorkspacePathResolver {
  /**
   * Canonicalize and validate a workspace root directory.
   * @param {string} workspaceRoot
   * @returns {string} Real canonical path on disk.
   */
  static canonicalizeRoot(workspaceRoot) {
    if (!workspaceRoot || typeof workspaceRoot !== "string" || !workspaceRoot.trim()) {
      throw new WorkspacePathError("INVALID_WORKSPACE_ROOT", 400, "Workspace root path is required");
    }

    const resolved = path.resolve(workspaceRoot);
    if (!fs.existsSync(resolved)) {
      throw new WorkspacePathError("WORKSPACE_NOT_FOUND", 404, `Workspace root does not exist: ${workspaceRoot}`);
    }

    try {
      return fs.realpathSync(resolved);
    } catch (err) {
      throw new WorkspacePathError("CANONICAL_RESOLVE_FAILED", 400, `Failed to resolve canonical workspace root: ${err.message}`);
    }
  }

  /**
   * Resolve and strictly validate a target path within a workspace root.
   * Prevents path traversal, UNC escapes, device paths, and symlink/junction escapes.
   *
   * @param {string} workspaceRoot
   * @param {string} targetPath
   * @returns {{ valid: boolean, canonicalPath: string, realPath: string }}
   */
  static resolveAndValidate(workspaceRoot, targetPath) {
    if (!workspaceRoot || typeof workspaceRoot !== "string") {
      throw new WorkspacePathError("INVALID_WORKSPACE_ROOT", 400, "Workspace root is required");
    }
    if (!targetPath || typeof targetPath !== "string") {
      throw new WorkspacePathError("INVALID_TARGET_PATH", 400, "Target path is required");
    }

    // 1. Block Windows device paths (\\.\, \\?\)
    if (
      targetPath.startsWith("\\\\.\\") ||
      targetPath.startsWith("\\\\?\\") ||
      targetPath.startsWith("//./") ||
      targetPath.startsWith("//?/")
    ) {
      throw new WorkspacePathError("DEVICE_PATH_FORBIDDEN", 400, `Device paths are forbidden: ${targetPath}`);
    }

    // 2. Block UNC network shares (\\server\share, //server/share)
    if (targetPath.startsWith("\\\\") || targetPath.startsWith("//")) {
      throw new WorkspacePathError("UNC_PATH_FORBIDDEN", 400, `UNC network paths are forbidden: ${targetPath}`);
    }

    // 3. Block DOS device names (CON, PRN, AUX, NUL, COM1..9, LPT1..9)
    const baseName = path.basename(targetPath).split(".")[0].toUpperCase();
    if (DOS_DEVICE_NAMES.has(baseName)) {
      throw new WorkspacePathError("DEVICE_PATH_FORBIDDEN", 400, `DOS reserved device names are forbidden: ${baseName}`);
    }

    // 4. Resolve absolute paths against canonical root
    let realRoot = path.resolve(workspaceRoot);
    if (fs.existsSync(realRoot)) {
      realRoot = fs.realpathSync(realRoot);
    }
    const resolvedTarget = path.isAbsolute(targetPath)
      ? path.resolve(targetPath)
      : path.resolve(realRoot, targetPath);

    const normRealRoot = realRoot.toLowerCase();
    const normTarget = resolvedTarget.toLowerCase();

    // 5. Lexical prefix containment check
    if (normTarget !== normRealRoot && !normTarget.startsWith(normRealRoot + path.sep.toLowerCase())) {
      throw new WorkspacePathError("PATH_TRAVERSAL_DETECTED", 400, `Path traversal outside workspace root detected: ${targetPath}`);
    }

    // 6. Block sensitive segments (.ssh, .aws, .codex, .env)
    const sensitiveSegments = [".ssh", ".aws", ".codex", ".env"];
    const relativeParts = path.relative(realRoot, resolvedTarget).toLowerCase().split(path.sep.toLowerCase());
    for (const segment of sensitiveSegments) {
      if (relativeParts.includes(segment)) {
        throw new WorkspacePathError("FORBIDDEN_PATH_ACCESS", 403, `Access to sensitive path segment '${segment}' is forbidden`);
      }
    }

    // 7. Reparse point / junction / symlink resolution check
    let realTarget = resolvedTarget;
    if (fs.existsSync(resolvedTarget)) {
      try {
        realTarget = fs.realpathSync(resolvedTarget);
        const normRealTarget = realTarget.toLowerCase();
        if (normRealTarget !== normRealRoot && !normRealTarget.startsWith(normRealRoot + path.sep.toLowerCase())) {
          throw new WorkspacePathError("JUNCTION_ESCAPE_DETECTED", 400, `Directory junction or symlink escapes workspace root: ${targetPath}`);
        }
      } catch (err) {
        if (err instanceof WorkspacePathError) throw err;
      }
    } else {
      // Target does not exist yet (e.g. creating a new file).
      // Walk up ancestor tree to verify the nearest existing directory does not escape via junction.
      let ancestor = path.dirname(resolvedTarget);
      while (!fs.existsSync(ancestor) && ancestor !== path.dirname(ancestor)) {
        ancestor = path.dirname(ancestor);
      }
      if (fs.existsSync(ancestor)) {
        const realAncestor = fs.realpathSync(ancestor);
        const normRealAncestor = realAncestor.toLowerCase();
        if (normRealAncestor !== normRealRoot && !normRealAncestor.startsWith(normRealRoot + path.sep.toLowerCase())) {
          throw new WorkspacePathError("JUNCTION_ESCAPE_DETECTED", 400, `Parent directory junction escapes workspace root: ${targetPath}`);
        }
      }
    }

    return {
      valid: true,
      canonicalPath: resolvedTarget,
      realPath: realTarget,
    };
  }
}
