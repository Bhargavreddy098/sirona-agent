import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { auditLogger } from "../services/auditLogger.js";

const execAsync = promisify(exec);

export const toolsController = {
  getCapabilities(req, res) {
    res.json({
      chat: true,
      streaming: true,
      tools: true,
      git: true,
      files: true,
      terminal: true,
      memory: true,
      approvals: true,
    });
  },

  getToolsets(req, res) {
    res.json({
      tools: [
        {
          name: "read_file",
          description: "Read contents of a file in the workspace",
          parameters: { path: { type: "string", required: true } },
        },
        {
          name: "write_file",
          description: "Create or replace a file in the workspace",
          parameters: { path: { type: "string", required: true }, content: { type: "string", required: true } },
        },
        {
          name: "run_command",
          description: "Execute a shell command in workspace",
          parameters: { command: { type: "string", required: true } },
        },
        {
          name: "git_diff",
          description: "Inspect git changes across workspace",
          parameters: { staged: { type: "boolean" } },
        },
      ],
    });
  },

  getSkills(req, res) {
    res.json({ skills: [] });
  },

  async executeTool(req, res, next) {
    try {
      const { tool_name, args = {} } = req.body;
      let result = null;

      if (tool_name === "read_file") {
        const p = path.resolve(args.path);
        result = fs.readFileSync(p, "utf-8");
      } else if (tool_name === "write_file") {
        const p = path.resolve(args.path);
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, args.content || "", "utf-8");
        result = { success: true, path: p };
      } else if (tool_name === "run_command") {
        const { stdout, stderr } = await execAsync(args.command || "echo ''", {
          cwd: args.cwd || process.cwd(),
          timeout: 30000,
        });
        result = { stdout: stdout.trim(), stderr: stderr.trim() };
      } else {
        result = { error: `Tool ${tool_name} is not recognized` };
      }

      auditLogger.log(req, "tool.execute", {
        resourceType: "tool",
        resourceId: tool_name,
        details: { args },
      });

      res.json({ success: true, result });
    } catch (err) {
      next(err);
    }
  },
};

export default toolsController;
