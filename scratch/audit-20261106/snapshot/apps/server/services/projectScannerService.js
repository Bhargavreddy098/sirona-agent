// @ts-check
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { query } from "../config/db.js";
import { WorkspacePathResolver } from "./workspacePathResolver.js";

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "target",
  ".venv",
  "venv",
  "__pycache__",
  ".next",
  "out",
  "coverage",
  ".turbo",
  ".cache",
  ".idea",
  ".vscode",
]);

const EXTENSION_LANGUAGE_MAP = {
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".py": "python",
  ".rs": "rust",
  ".go": "go",
  ".java": "java",
  ".cpp": "cpp",
  ".c": "c",
  ".h": "c",
  ".hpp": "cpp",
  ".json": "json",
  ".md": "markdown",
  ".sql": "sql",
  ".html": "html",
  ".css": "css",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".toml": "toml",
  ".sh": "shell",
  ".bat": "batch",
  ".ps1": "powershell",
};

export class ProjectScannerService {
  /**
   * Scan a local project repository, detect frameworks, test runners, git status,
   * and ingest the file tree into the knowledge system.
   *
   * @param {string} projectId
   * @returns {Promise<Record<string, unknown>>}
   */
  static async scanProject(projectId) {
    const projRes = await query(
      "SELECT id, workspace_id, name, primary_path FROM projects WHERE id = $1 AND archived = 0",
      [projectId]
    );
    if (projRes.rows.length === 0) {
      throw Object.assign(new Error(`Project ${projectId} not found`), { code: "PROJECT_NOT_FOUND", status: 404 });
    }
    const project = projRes.rows[0];

    if (!project.primary_path) {
      await query("UPDATE projects SET index_state = 'failed' WHERE id = $1", [projectId]);
      throw Object.assign(new Error("Project primary_path is not defined"), { code: "NO_PRIMARY_PATH", status: 400 });
    }

    const rootDir = WorkspacePathResolver.canonicalizeRoot(project.primary_path);
    if (!fs.existsSync(rootDir)) {
      await query("UPDATE projects SET index_state = 'failed' WHERE id = $1", [projectId]);
      throw Object.assign(new Error(`Project directory does not exist: ${rootDir}`), { code: "PATH_NOT_FOUND", status: 400 });
    }

    // Set index_state to scanning
    await query("UPDATE projects SET index_state = 'scanning', updated_at = NOW() WHERE id = $1", [projectId]);

    // 1. Git inspection
    const gitInfo = this._inspectGit(rootDir);

    // 2. Recursive file scan
    const files = [];
    const languageCounts = {};
    let totalBytes = 0;
    this._walkDirectory(rootDir, rootDir, files, languageCounts, 5000);

    for (const f of files) {
      totalBytes += f.size;
    }

    // Determine primary language
    let primaryLanguage = "unknown";
    let maxLangCount = 0;
    for (const [lang, cnt] of Object.entries(languageCounts)) {
      if (cnt > maxLangCount) {
        maxLangCount = cnt;
        primaryLanguage = lang;
      }
    }

    // 3. Detect manifests, framework and test runner
    const { detectedFramework, detectedTestRunner, manifests } = this._detectFrameworkAndTools(rootDir, files);

    // 4. Ingest file nodes into knowledge.nodes
    await this._ingestKnowledgeNodes(projectId, files, manifests);

    // 5. Structure summary
    const structureSummary = {
      fileCount: files.length,
      totalBytes,
      primaryLanguage,
      languageBreakdown: languageCounts,
      detectedFramework,
      detectedTestRunner,
      gitInfo,
      manifests,
      keyFiles: files
        .filter((f) => f.path === "package.json" || f.path === "pyproject.toml" || f.path === "Cargo.toml" || f.path.startsWith("src/"))
        .slice(0, 50)
        .map((f) => ({ path: f.path, size: f.size })),
    };

    // 6. Update project record
    await query(
      `UPDATE projects 
       SET index_state = 'indexed',
           last_scanned_at = NOW(),
           git_info = $1,
           detected_framework = $2,
           detected_test_runner = $3,
           structure_summary = $4,
           updated_at = NOW()
       WHERE id = $5`,
      [
        JSON.stringify(gitInfo),
        detectedFramework,
        detectedTestRunner,
        JSON.stringify(structureSummary),
        projectId,
      ]
    );

    return structureSummary;
  }

  /**
   * Retrieve structure summary for a project.
   * @param {string} projectId
   */
  static async getProjectStructure(projectId) {
    const projRes = await query(
      `SELECT id, name, primary_path, index_state, last_scanned_at, git_info, 
              detected_framework, detected_test_runner, structure_summary 
       FROM projects WHERE id = $1 AND archived = 0`,
      [projectId]
    );
    if (projRes.rows.length === 0) {
      throw Object.assign(new Error(`Project ${projectId} not found`), { code: "PROJECT_NOT_FOUND", status: 404 });
    }
    const project = projRes.rows[0];

    // If not yet indexed, trigger immediate scan
    if (project.index_state === "unindexed" && project.primary_path) {
      return await this.scanProject(projectId);
    }

    return {
      projectId: project.id,
      name: project.name,
      primaryPath: project.primary_path,
      indexState: project.index_state,
      lastScannedAt: project.last_scanned_at,
      gitInfo: project.git_info,
      detectedFramework: project.detected_framework,
      detectedTestRunner: project.detected_test_runner,
      structure: project.structure_summary,
    };
  }

  /**
   * Inspect Git repository status.
   * @private
   */
  static _inspectGit(rootDir) {
    const gitDir = path.join(rootDir, ".git");
    if (!fs.existsSync(gitDir)) {
      return { isGit: false };
    }

    try {
      const branch = execSync("git rev-parse --abbrev-ref HEAD", {
        cwd: rootDir,
        timeout: 2000,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();

      const statusOutput = execSync("git status --porcelain", {
        cwd: rootDir,
        timeout: 2000,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();

      const dirtyFiles = statusOutput
        ? statusOutput.split("\n").map((line) => line.trim().slice(3))
        : [];

      return {
        isGit: true,
        branch,
        isClean: dirtyFiles.length === 0,
        dirtyCount: dirtyFiles.length,
        dirtyFiles: dirtyFiles.slice(0, 10),
      };
    } catch {
      return { isGit: true, branch: "unknown", isClean: true, dirtyCount: 0 };
    }
  }

  /**
   * Recursively walk a directory.
   * @private
   */
  static _walkDirectory(currentDir, rootDir, files, languageCounts, maxFiles) {
    if (files.length >= maxFiles) return;

    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (files.length >= maxFiles) break;

      const name = entry.name;
      if (name.startsWith(".") && name !== ".gitignore" && name !== ".env.example") {
        if (entry.isDirectory()) continue;
      }
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(name)) continue;
        this._walkDirectory(path.join(currentDir, name), rootDir, files, languageCounts, maxFiles);
      } else if (entry.isFile()) {
        const fullPath = path.join(currentDir, name);
        const relPath = path.relative(rootDir, fullPath).replace(/\\/g, "/");

        let stats;
        try {
          stats = fs.statSync(fullPath);
        } catch {
          continue;
        }

        const ext = path.extname(name).toLowerCase();
        const language = EXTENSION_LANGUAGE_MAP[ext] || "unknown";
        if (language !== "unknown") {
          languageCounts[language] = (languageCounts[language] || 0) + 1;
        }

        let contentDigest = "";
        // Only hash files under 500KB to stay fast
        if (stats.size < 512000) {
          try {
            const buf = fs.readFileSync(fullPath);
            contentDigest = crypto.createHash("sha256").update(buf).digest("hex");
          } catch {
            contentDigest = "hash_error";
          }
        }

        files.push({
          path: relPath,
          size: stats.size,
          mtime: stats.mtime.toISOString(),
          extension: ext,
          language,
          digest: contentDigest,
        });
      }
    }
  }

  /**
   * Detect project framework, dependencies, and test runner from manifests.
   * @private
   */
  static _detectFrameworkAndTools(rootDir, files) {
    const manifests = [];
    let detectedFramework = "unknown";
    let detectedTestRunner = "unknown";

    // 1. Node.js package.json
    const packageJsonFile = files.find((f) => f.path === "package.json");
    if (packageJsonFile) {
      try {
        const raw = fs.readFileSync(path.join(rootDir, "package.json"), "utf8");
        const pkg = JSON.parse(raw);
        manifests.push({
          path: "package.json",
          name: pkg.name || "unnamed",
          version: pkg.version || "1.0.0",
          scripts: Object.keys(pkg.scripts || {}),
        });

        const allDeps = {
          ...pkg.dependencies,
          ...pkg.devDependencies,
        };

        // Detect Framework
        if (allDeps.next) detectedFramework = "nextjs";
        else if (allDeps.react) detectedFramework = "react";
        else if (allDeps.vue) detectedFramework = "vue";
        else if (allDeps.svelte) detectedFramework = "svelte";
        else if (allDeps.express) detectedFramework = "express";
        else if (allDeps.fastify) detectedFramework = "fastify";
        else if (allDeps.vite) detectedFramework = "vite";
        else detectedFramework = "node";

        // Detect Test Runner
        const testScript = pkg.scripts?.test || "";
        if (allDeps.vitest || testScript.includes("vitest")) {
          detectedTestRunner = "vitest";
        } else if (allDeps.jest || testScript.includes("jest")) {
          detectedTestRunner = "jest";
        } else if (testScript.includes("node --test")) {
          detectedTestRunner = "node --test";
        } else if (allDeps.mocha || testScript.includes("mocha")) {
          detectedTestRunner = "mocha";
        } else if (pkg.scripts?.test) {
          detectedTestRunner = "npm test";
        }
      } catch {}
    }

    // 2. Python pyproject.toml / requirements.txt
    const pyprojectFile = files.find((f) => f.path === "pyproject.toml" || f.path === "requirements.txt");
    if (pyprojectFile && detectedFramework === "unknown") {
      manifests.push({ path: pyprojectFile.path });
      detectedFramework = "python";
      detectedTestRunner = "pytest";
    }

    // 3. Rust Cargo.toml
    const cargoFile = files.find((f) => f.path === "Cargo.toml");
    if (cargoFile) {
      manifests.push({ path: "Cargo.toml" });
      detectedFramework = "rust";
      detectedTestRunner = "cargo test";
    }

    // 4. Go go.mod
    const goModFile = files.find((f) => f.path === "go.mod");
    if (goModFile) {
      manifests.push({ path: "go.mod" });
      detectedFramework = "go";
      detectedTestRunner = "go test";
    }

    return { detectedFramework, detectedTestRunner, manifests };
  }

  /**
   * Ingest scanned files and package manifests into knowledge.nodes.
   * @private
   */
  static async _ingestKnowledgeNodes(projectId, files, manifests) {
    // Ingest package manifest nodes
    for (const m of manifests) {
      await query(
        `INSERT INTO knowledge.nodes (
          project_id, kind, stable_key, name, path, content_digest, attributes, updated_at
        ) VALUES ($1, 'package', $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (project_id, kind, stable_key) 
        DO UPDATE SET 
          content_digest = EXCLUDED.content_digest,
          attributes = EXCLUDED.attributes,
          updated_at = NOW()`,
        [
          projectId,
          `pkg:${m.path}`,
          m.name || m.path,
          m.path,
          crypto.createHash("sha256").update(JSON.stringify(m)).digest("hex"),
          JSON.stringify(m),
        ]
      );
    }

    // Ingest top file nodes (up to 200 files) into knowledge.nodes
    const topFiles = files.slice(0, 200);
    for (const f of topFiles) {
      await query(
        `INSERT INTO knowledge.nodes (
          project_id, kind, stable_key, name, path, content_digest, attributes, updated_at
        ) VALUES ($1, 'file', $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (project_id, kind, stable_key)
        DO UPDATE SET 
          content_digest = EXCLUDED.content_digest,
          attributes = EXCLUDED.attributes,
          updated_at = NOW()`,
        [
          projectId,
          `file:${f.path}`,
          path.basename(f.path),
          f.path,
          f.digest || "empty",
          JSON.stringify({ size: f.size, language: f.language, extension: f.extension }),
        ]
      );
    }
  }
}
