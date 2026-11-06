import fs from "fs";
import path from "path";
import { auditLogger } from "../services/auditLogger.js";

/* =====================================================================
   Files Controller — Workspace Filesystem Explorer & Manipulation
   ===================================================================== */

function getLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".json": "json",
    ".py": "python",
    ".md": "markdown",
    ".html": "html",
    ".css": "css",
    ".sql": "sql",
    ".sh": "bash",
    ".yaml": "yaml",
    ".yml": "yaml",
  };
  return map[ext] || "plaintext";
}

function buildTree(dirPath, currentDepth, maxDepth) {
  if (currentDepth > maxDepth) return [];
  const entries = [];

  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const item of items) {
      if (item.name.startsWith(".git") || item.name === "node_modules" || item.name === ".venv") {
        continue;
      }

      const fullPath = path.join(dirPath, item.name);
      if (item.isDirectory()) {
        entries.push({
          name: item.name,
          path: fullPath,
          type: "directory",
          children: buildTree(fullPath, currentDepth + 1, maxDepth),
        });
      } else {
        entries.push({
          name: item.name,
          path: fullPath,
          type: "file",
          size: fs.statSync(fullPath).size,
          language: getLanguage(fullPath),
        });
      }
    }
  } catch {
    // Permission or missing path
  }
  return entries;
}

export const filesController = {
  async getFileTree(req, res, next) {
    try {
      const targetPath = req.query.path ? path.resolve(req.query.path) : process.cwd();
      const maxDepth = parseInt(req.query.max_depth || "4", 10);

      const tree = buildTree(targetPath, 1, maxDepth);
      res.json({
        root: targetPath,
        name: path.basename(targetPath),
        tree,
      });
    } catch (err) {
      next(err);
    }
  },

  async readWorkspaceFile(req, res, next) {
    try {
      const filePath = path.resolve(req.query.path);
      const offset = parseInt(req.query.offset || "0", 10);
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: "File not found" });
      }

      const raw = fs.readFileSync(filePath, "utf-8");
      const lines = raw.split("\n");
      const totalLines = lines.length;

      const sliced = limit ? lines.slice(offset, offset + limit).join("\n") : lines.slice(offset).join("\n");
      const stat = fs.statSync(filePath);

      res.json({
        path: filePath,
        name: path.basename(filePath),
        content: sliced,
        total_lines: totalLines,
        size: stat.size,
        language: getLanguage(filePath),
      });
    } catch (err) {
      next(err);
    }
  },

  async writeWorkspaceFile(req, res, next) {
    try {
      const { path: targetPath, content, overwrite = true } = req.body;
      const absPath = path.resolve(targetPath);

      if (!overwrite && fs.existsSync(absPath)) {
        return res.status(409).json({ success: false, message: "File already exists and overwrite is false" });
      }

      const dir = path.dirname(absPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(absPath, content, "utf-8");
      const bytesWritten = Buffer.byteLength(content, "utf-8");

      auditLogger.log(req, "file.write", { resourceType: "file", resourceId: absPath, details: { bytesWritten } });

      res.json({
        success: true,
        path: absPath,
        bytes_written: bytesWritten,
      });
    } catch (err) {
      next(err);
    }
  },

  async searchFiles(req, res, next) {
    try {
      const query = (req.query.query || "").toLowerCase();
      const basePath = req.query.path ? path.resolve(req.query.path) : process.cwd();
      const limit = parseInt(req.query.limit || "50", 10);

      const matches = [];

      function searchDir(dir) {
        if (matches.length >= limit) return;
        try {
          const items = fs.readdirSync(dir, { withFileTypes: true });
          for (const item of items) {
            if (item.name.startsWith(".git") || item.name === "node_modules" || item.name === ".venv") continue;
            const fullPath = path.join(dir, item.name);
            if (item.isDirectory()) {
              searchDir(fullPath);
            } else if (item.name.toLowerCase().includes(query)) {
              matches.push({
                path: fullPath,
                name: item.name,
                type: "file",
              });
            }
          }
        } catch {}
      }

      searchDir(basePath);
      res.json({ query, matches, total: matches.length });
    } catch (err) {
      next(err);
    }
  },

  async revealFile(req, res) {
    const { path: targetPath } = req.body;
    res.json({ revealed: true, path: targetPath });
  },
};

export default filesController;
