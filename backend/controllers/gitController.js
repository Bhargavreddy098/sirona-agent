import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";

const execFileAsync = promisify(execFile);

/* =====================================================================
   Git Controller — Git Status, Diffs, Branches, and Commits
   ===================================================================== */

async function runGit(args, cwd = process.cwd()) {
  try {
    const { stdout } = await execFileAsync("git", args, { cwd });
    return { success: true, stdout: stdout.trim(), stderr: "" };
  } catch (err) {
    return { success: false, stdout: err.stdout?.trim() || "", stderr: err.stderr?.trim() || err.message };
  }
}

export const gitController = {
  async getGitStatus(req, res, next) {
    try {
      const cwd = req.query.cwd ? path.resolve(req.query.cwd) : process.cwd();

      // Check if git repo
      const checkRepo = await runGit(["rev-parse", "--is-inside-work-tree"], cwd);
      if (!checkRepo.success) {
        return res.json({
          is_repo: false,
          branch: "",
          ahead: 0,
          behind: 0,
          is_clean: true,
          staged: [],
          unstaged: [],
          untracked: [],
          total_changed: 0,
        });
      }

      // Branch name
      const branchRes = await runGit(["branch", "--show-current"], cwd);
      const branch = branchRes.stdout || "HEAD";

      // Status porcelain
      const statusRes = await runGit(["status", "--porcelain=v1"], cwd);
      const lines = statusRes.stdout ? statusRes.stdout.split("\n") : [];

      const staged = [];
      const unstaged = [];
      const untracked = [];

      for (const line of lines) {
        if (!line.trim()) continue;
        const x = line[0];
        const y = line[1];
        const filePath = line.substring(3).trim();

        if (x === "?" && y === "?") {
          untracked.push(filePath);
        } else {
          if (x !== " " && x !== "?") staged.push({ path: filePath, status: x });
          if (y !== " " && y !== "?") unstaged.push({ path: filePath, status: y });
        }
      }

      res.json({
        is_repo: true,
        branch,
        ahead: 0,
        behind: 0,
        is_clean: staged.length === 0 && unstaged.length === 0 && untracked.length === 0,
        staged,
        unstaged,
        untracked,
        total_changed: staged.length + unstaged.length + untracked.length,
      });
    } catch (err) {
      next(err);
    }
  },

  async getGitDiff(req, res, next) {
    try {
      const cwd = req.query.cwd ? path.resolve(req.query.cwd) : process.cwd();
      const isStaged = req.query.staged === "true";
      const filePath = req.query.path;

      const args = ["diff"];
      if (isStaged) args.push("--cached");
      if (filePath) args.push("--", filePath);

      const diffRes = await runGit(args, cwd);
      res.json({
        success: diffRes.success,
        diff: diffRes.stdout,
        path: filePath,
        staged: isStaged,
      });
    } catch (err) {
      next(err);
    }
  },

  async getGitBranches(req, res, next) {
    try {
      const cwd = req.query.cwd ? path.resolve(req.query.cwd) : process.cwd();
      const currentRes = await runGit(["branch", "--show-current"], cwd);
      const branchesRes = await runGit(["branch", "-a"], cwd);

      const current = currentRes.stdout || "main";
      const branches = (branchesRes.stdout ? branchesRes.stdout.split("\n") : []).map((b) => {
        const clean = b.replace("*", "").trim();
        return {
          name: clean,
          is_current: clean === current,
          upstream: "",
          is_remote: clean.startsWith("remotes/"),
        };
      });

      res.json({ current, branches });
    } catch (err) {
      next(err);
    }
  },

  async switchGitBranch(req, res, next) {
    try {
      const { branch, create = false, base, cwd } = req.body;
      const targetCwd = cwd ? path.resolve(cwd) : process.cwd();

      const args = create ? ["checkout", "-b", branch, ...(base ? [base] : [])] : ["checkout", branch];
      const result = await runGit(args, targetCwd);

      res.json({
        success: result.success,
        branch,
        error: result.success ? undefined : result.stderr,
      });
    } catch (err) {
      next(err);
    }
  },

  async stageGitFile(req, res, next) {
    try {
      const { path: filePath, cwd } = req.body;
      const targetCwd = cwd ? path.resolve(cwd) : process.cwd();
      const args = ["add", filePath || "."];
      const result = await runGit(args, targetCwd);
      res.json({ success: result.success, error: result.success ? undefined : result.stderr });
    } catch (err) {
      next(err);
    }
  },

  async unstageGitFile(req, res, next) {
    try {
      const { path: filePath, cwd } = req.body;
      const targetCwd = cwd ? path.resolve(cwd) : process.cwd();
      const args = ["reset", "HEAD", filePath || "."];
      const result = await runGit(args, targetCwd);
      res.json({ success: result.success, error: result.success ? undefined : result.stderr });
    } catch (err) {
      next(err);
    }
  },

  async discardGitChanges(req, res, next) {
    try {
      const { path: filePath, untracked, cwd } = req.body;
      const targetCwd = cwd ? path.resolve(cwd) : process.cwd();

      if (untracked) {
        await runGit(["clean", "-fd", filePath], targetCwd);
      } else {
        await runGit(["checkout", "--", filePath], targetCwd);
      }
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  async commitGitChanges(req, res, next) {
    try {
      const { message, push = false, cwd } = req.body;
      const targetCwd = cwd ? path.resolve(cwd) : process.cwd();

      const commitRes = await runGit(["commit", "-m", message], targetCwd);
      if (!commitRes.success) {
        return res.status(400).json({ success: false, error: commitRes.stderr });
      }

      const revRes = await runGit(["rev-parse", "HEAD"], targetCwd);
      const commitHash = revRes.stdout;

      let pushed = false;
      let pushError;

      if (push) {
        const pushRes = await runGit(["push"], targetCwd);
        pushed = pushRes.success;
        if (!pushed) pushError = pushRes.stderr;
      }

      res.json({
        success: true,
        commit_hash: commitHash,
        pushed,
        push_error: pushError,
      });
    } catch (err) {
      next(err);
    }
  },

  async getGitWorktrees(req, res, next) {
    try {
      const cwd = req.query.cwd ? path.resolve(req.query.cwd) : process.cwd();
      const result = await runGit(["worktree", "list", "--porcelain"], cwd);

      const worktrees = [];
      let currentWt = {};

      for (const line of result.stdout.split("\n")) {
        if (line.startsWith("worktree ")) {
          if (currentWt.path) worktrees.push(currentWt);
          currentWt = { path: line.replace("worktree ", "").trim(), branch: "", is_main: worktrees.length === 0 };
        } else if (line.startsWith("branch refs/heads/")) {
          currentWt.branch = line.replace("branch refs/heads/", "").trim();
        }
      }
      if (currentWt.path) worktrees.push(currentWt);

      res.json({ worktrees });
    } catch (err) {
      next(err);
    }
  },

  async addGitWorktree(req, res, next) {
    try {
      const { path: wtPath, branch, new_branch, cwd } = req.body;
      const targetCwd = cwd ? path.resolve(cwd) : process.cwd();

      const args = ["worktree", "add"];
      if (new_branch) args.push("-b", branch, wtPath);
      else args.push(wtPath, branch);

      const result = await runGit(args, targetCwd);
      res.json({
        success: result.success,
        path: wtPath,
        branch,
        error: result.success ? undefined : result.stderr,
      });
    } catch (err) {
      next(err);
    }
  },

  async removeGitWorktree(req, res, next) {
    try {
      const { path: wtPath, force = false, cwd } = req.body;
      const targetCwd = cwd ? path.resolve(cwd) : process.cwd();
      const args = ["worktree", "remove", ...(force ? ["--force"] : []), wtPath];
      const result = await runGit(args, targetCwd);
      res.json({ success: result.success, path: wtPath, error: result.success ? undefined : result.stderr });
    } catch (err) {
      next(err);
    }
  },
};

export default gitController;
