// @ts-check
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { query } from "../config/db.js";
import { ProjectScannerService } from "./projectScannerService.js";
import { WorkspacePathResolver } from "./workspacePathResolver.js";

export class ContextEngineService {
  /**
   * Assemble a reproducible, bounded Context Pack for a project and user prompt.
   *
   * @param {{
   *   projectId: string,
   *   prompt?: string,
   *   runId?: string | null,
   *   taskId?: string | null,
   *   tokenBudget?: number,
   * }} options
   * @returns {Promise<{
   *   id: string,
   *   digest: string,
   *   contextText: string,
   *   tokenEstimate: number,
   *   sources: string[],
   * }>}
   */
  static async assembleContextPack({
    projectId,
    prompt = "",
    runId = null,
    taskId = null,
    tokenBudget = 16000,
  }) {
    // 1. Get project and structure
    const projRes = await query(
      `SELECT id, name, primary_path, detected_framework, detected_test_runner, 
              git_info, structure_summary, index_state 
       FROM projects WHERE id = $1 AND archived = 0`,
      [projectId]
    );
    if (projRes.rows.length === 0) {
      throw Object.assign(new Error(`Project ${projectId} not found`), { code: "PROJECT_NOT_FOUND", status: 404 });
    }
    const project = projRes.rows[0];

    // Ensure project has been scanned
    let structure = project.structure_summary || {};
    if (project.index_state !== "indexed" && project.primary_path) {
      try {
        structure = await ProjectScannerService.scanProject(projectId);
      } catch {
        structure = {};
      }
    }

    const rootDir = project.primary_path ? WorkspacePathResolver.canonicalizeRoot(project.primary_path) : null;
    const sources = [];
    const sections = [];

    // Section 1: System & Repository Overview
    const overviewLines = [
      `# Project: ${project.name}`,
      `Framework: ${project.detected_framework || structure.detectedFramework || "unknown"}`,
      `Test Runner: ${project.detected_test_runner || structure.detectedTestRunner || "unknown"}`,
      `Files: ${structure.fileCount || 0} total`,
    ];
    if (structure.gitInfo?.isGit) {
      overviewLines.push(`Git Branch: ${structure.gitInfo.branch} (clean: ${structure.gitInfo.isClean})`);
    }
    sections.push({
      priority: 1,
      title: "Repository Overview",
      content: overviewLines.join("\n"),
    });

    // Section 2: Repository Instructions (AGENTS.md, README.md)
    if (rootDir) {
      const instructionFiles = ["AGENTS.md", "README.md", "CONTRIBUTING.md"];
      for (const instName of instructionFiles) {
        const instPath = path.join(rootDir, instName);
        if (fs.existsSync(instPath)) {
          try {
            const rawContent = fs.readFileSync(instPath, "utf8");
            const truncated = rawContent.split("\n").slice(0, 150).join("\n");
            sections.push({
              priority: 2,
              title: `Instructions: ${instName}`,
              content: truncated,
            });
            sources.push(instName);
          } catch {}
        }
      }

      // Section 3: Key Manifest (package.json, pyproject.toml, Cargo.toml)
      const manifestFiles = ["package.json", "pyproject.toml", "Cargo.toml", "go.mod"];
      for (const mName of manifestFiles) {
        const mPath = path.join(rootDir, mName);
        if (fs.existsSync(mPath)) {
          try {
            const raw = fs.readFileSync(mPath, "utf8");
            sections.push({
              priority: 3,
              title: `Manifest: ${mName}`,
              content: raw.slice(0, 3000),
            });
            sources.push(mName);
          } catch {}
        }
      }
    }

    // Section 4: Relevant Files (matching prompt terms or key files)
    if (rootDir && prompt) {
      const promptTerms = prompt
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2);

      // Query knowledge.nodes for matching files
      const nodeRes = await query(
        `SELECT path, name, attributes FROM knowledge.nodes 
         WHERE project_id = $1 AND kind = 'file' 
         ORDER BY updated_at DESC LIMIT 100`,
        [projectId]
      );

      const matchingFiles = [];
      for (const node of nodeRes.rows) {
        const pLower = (node.path || "").toLowerCase();
        const score = promptTerms.reduce((acc, term) => (pLower.includes(term) ? acc + 1 : acc), 0);
        if (score > 0 || matchingFiles.length < 3) {
          matchingFiles.push({ path: node.path, score });
        }
      }

      matchingFiles.sort((a, b) => b.score - a.score);

      for (const mf of matchingFiles.slice(0, 5)) {
        const fPath = path.join(rootDir, mf.path);
        if (fs.existsSync(fPath)) {
          try {
            const content = fs.readFileSync(fPath, "utf8");
            const lines = content.split("\n").slice(0, 200).join("\n");
            sections.push({
              priority: 4,
              title: `File: ${mf.path}`,
              content: lines,
            });
            sources.push(mf.path);
          } catch {}
        }
      }
    }

    // Section 5: Relevant Memories
    const memRes = await query(
      `SELECT m.title, mr.content 
       FROM knowledge.memories m
       JOIN knowledge.memory_revisions mr ON mr.id = m.current_revision_id
       WHERE m.project_id = $1 AND m.deleted_at IS NULL
       ORDER BY m.updated_at DESC LIMIT 5`,
      [projectId]
    );
    if (memRes.rows.length > 0) {
      const memText = memRes.rows.map((r) => `- **${r.title}**: ${r.content}`).join("\n");
      sections.push({
        priority: 5,
        title: "Project Memories & Decisions",
        content: memText,
      });
      sources.push("knowledge.memories");
    }

    // Assemble and bound according to tokenBudget (approx 4 chars per token)
    const maxChars = tokenBudget * 4;
    let assembled = "";
    sections.sort((a, b) => a.priority - b.priority);

    for (const sec of sections) {
      const block = `\n=== ${sec.title} ===\n${sec.content}\n`;
      if (assembled.length + block.length > maxChars) {
        const remaining = maxChars - assembled.length;
        if (remaining > 200) {
          assembled += block.slice(0, remaining) + "\n... [TRUNCATED DUE TO BUDGET]\n";
        }
        break;
      }
      assembled += block;
    }

    const tokenEstimate = Math.ceil(assembled.length / 4);
    const digest = crypto.createHash("sha256").update(assembled).digest("hex");

    // Persist to knowledge.context_bundles
    const bundleRes = await query(
      `INSERT INTO knowledge.context_bundles (
        project_id, run_id, task_id, digest, token_estimate, source_revision_refs, bundle_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, digest, token_estimate, created_at`,
      [
        projectId,
        runId,
        taskId,
        digest,
        tokenEstimate,
        JSON.stringify(sources),
        JSON.stringify({ text: assembled, sections: sections.map((s) => s.title) }),
      ]
    );

    return {
      id: bundleRes.rows[0].id,
      digest,
      contextText: assembled,
      tokenEstimate,
      sources,
    };
  }
}
