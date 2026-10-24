import asyncio
import os
import re
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel

router = APIRouter(prefix="/api/git", tags=["git"])

async def run_git_cmd(args: List[str], cwd: Optional[str] = None, timeout: int = 15) -> Dict[str, Any]:
    """Execute a git command with timeout and return structured output."""
    working_dir = cwd or os.getcwd()
    try:
        proc = await asyncio.create_subprocess_exec(
            "git",
            *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=working_dir
        )
        try:
            stdout_data, stderr_data = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            return {
                "success": False,
                "exit_code": -1,
                "stdout": "",
                "stderr": f"Git command timed out after {timeout} seconds",
            }

        stdout_str = stdout_data.decode("utf-8", errors="replace")
        stderr_str = stderr_data.decode("utf-8", errors="replace")
        return {
            "success": proc.returncode == 0,
            "exit_code": proc.returncode,
            "stdout": stdout_str,
            "stderr": stderr_str,
        }
    except Exception as exc:
        return {
            "success": False,
            "exit_code": -1,
            "stdout": "",
            "stderr": str(exc),
        }


def parse_git_status_porcelain(output: str) -> Dict[str, Any]:
    """Parse git status --porcelain=v1 -b output."""
    branch = ""
    ahead = 0
    behind = 0
    staged: List[Dict[str, str]] = []
    unstaged: List[Dict[str, str]] = []
    untracked: List[str] = []

    lines = output.splitlines()
    for line in lines:
        if not line:
            continue

        if line.startswith("## "):
            branch_part = line[3:].strip()
            # Examples:
            # ## master
            # ## master...origin/master [ahead 1, behind 2]
            # ## HEAD (no branch)
            match = re.match(r"^([^\s.]+)(?:\.\.\.[^\s]+)?(?:\s+\[(?:ahead\s+(\d+))?(?:,?\s*)?(?:behind\s+(\d+))?\])?", branch_part)
            if match:
                branch = match.group(1)
                if match.group(2):
                    ahead = int(match.group(2))
                if match.group(3):
                    behind = int(match.group(3))
            else:
                branch = branch_part.split()[0]
            continue

        if len(line) < 3:
            continue

        index_col = line[0]
        worktree_col = line[1]
        file_path = line[3:].strip()
        # Handle rename format: old -> new
        if " -> " in file_path:
            file_path = file_path.split(" -> ")[1].strip()

        if index_col == "?" and worktree_col == "?":
            untracked.append(file_path)
        else:
            if index_col in ("M", "A", "D", "R", "C"):
                staged.append({"path": file_path, "status": index_col})
            if worktree_col in ("M", "D"):
                unstaged.append({"path": file_path, "status": worktree_col})

    is_clean = len(staged) == 0 and len(unstaged) == 0 and len(untracked) == 0

    return {
        "is_repo": True,
        "branch": branch or "main",
        "ahead": ahead,
        "behind": behind,
        "is_clean": is_clean,
        "staged": staged,
        "unstaged": unstaged,
        "untracked": untracked,
        "total_changed": len(staged) + len(unstaged) + len(untracked)
    }


def parse_worktrees_porcelain(output: str) -> List[Dict[str, Any]]:
    """Parse git worktree list --porcelain output."""
    trees: List[Dict[str, Any]] = []
    current: Optional[Dict[str, Any]] = None

    for line in output.splitlines():
        line = line.strip()
        if not line:
            continue

        if line.startswith("worktree "):
            if current:
                trees.append(current)
            current = {
                "path": line[9:].strip(),
                "branch": "",
                "is_main": len(trees) == 0,
                "detached": False,
                "locked": False,
            }
        elif current is not None:
            if line.startswith("branch "):
                ref = line[7:].strip()
                current["branch"] = ref.replace("refs/heads/", "")
            elif line == "detached":
                current["detached"] = True
            elif line.startswith("locked"):
                current["locked"] = True

    if current:
        trees.append(current)

    return trees


@router.get("/status")
async def get_repo_status(cwd: Optional[str] = Query(None)):
    """Fetch status for repository at cwd."""
    res = await run_git_cmd(["status", "--porcelain=v1", "-b"], cwd=cwd)
    if not res["success"]:
        return {
            "is_repo": False,
            "branch": "",
            "ahead": 0,
            "behind": 0,
            "is_clean": True,
            "staged": [],
            "unstaged": [],
            "untracked": [],
            "total_changed": 0,
            "error": res["stderr"] or "Not a git repository"
        }

    status_data = parse_git_status_porcelain(res["stdout"])
    return status_data


@router.get("/diff")
async def get_repo_diff(
    path: Optional[str] = Query(None),
    staged: bool = Query(False),
    scope: Optional[str] = Query(None),
    cwd: Optional[str] = Query(None)
):
    """Fetch unified diff for the repository or a single file."""
    cmd = ["diff"]

    if staged or scope == "staged":
        cmd.append("--staged")
    elif scope == "all":
        # Check if HEAD exists
        head_probe = await run_git_cmd(["rev-parse", "--verify", "HEAD"], cwd=cwd)
        if head_probe["success"]:
            cmd.append("HEAD")

    if path:
        cmd.extend(["--", path])

    res = await run_git_cmd(cmd, cwd=cwd)
    diff_text = res["stdout"]

    # If diff is empty and path is given, check if it's an untracked file
    if not diff_text.strip() and path:
        status_res = await run_git_cmd(["status", "--porcelain=v1", "--", path], cwd=cwd)
        if status_res["success"] and status_res["stdout"].startswith("??"):
            # Synthetic diff for untracked file
            base_dir = cwd or os.getcwd()
            full_path = os.path.join(base_dir, path)
            if os.path.isfile(full_path):
                try:
                    with open(full_path, "r", encoding="utf-8", errors="replace") as f:
                        content_lines = f.readlines()
                    diff_lines = [
                        f"diff --git a/{path} b/{path}",
                        "new file mode 100644",
                        "--- /dev/null",
                        f"+++ b/{path}",
                        f"@@ -0,0 +1,{len(content_lines)} @@",
                    ]
                    for cl in content_lines:
                        diff_lines.append(f"+{cl.rstrip('\r\n')}")
                    diff_text = "\n".join(diff_lines)
                except Exception:
                    pass

    return {
        "success": res["success"],
        "diff": diff_text,
        "path": path,
        "staged": staged or scope == "staged",
        "error": res["stderr"] if not res["success"] else None
    }


@router.get("/branches")
async def get_branches(cwd: Optional[str] = Query(None)):
    """List local and remote branches."""
    res = await run_git_cmd(
        ["branch", "-a", "--format=%(refname:short)|%(HEAD)|%(upstream:short)"],
        cwd=cwd
    )
    if not res["success"]:
        return {"current": "", "branches": [], "error": res["stderr"]}

    current_branch = ""
    branches: List[Dict[str, Any]] = []

    for line in res["stdout"].splitlines():
        line = line.strip()
        if not line:
            continue
        parts = line.split("|")
        name = parts[0]
        is_head = len(parts) > 1 and parts[1].strip() == "*"
        upstream = parts[2] if len(parts) > 2 else ""
        is_remote = name.startswith("origin/") or "/" in name

        if is_head:
            current_branch = name

        branches.append({
            "name": name,
            "is_current": is_head,
            "upstream": upstream,
            "is_remote": is_remote
        })

    return {"current": current_branch, "branches": branches}


class SwitchBranchRequest(BaseModel):
    branch: str
    create: bool = False
    base: Optional[str] = None
    cwd: Optional[str] = None

@router.post("/branch/switch")
async def switch_branch(req: SwitchBranchRequest):
    """Switch or create a branch."""
    if req.create:
        cmd = ["checkout", "-b", req.branch]
        if req.base:
            cmd.append(req.base)
    else:
        cmd = ["checkout", req.branch]

    res = await run_git_cmd(cmd, cwd=req.cwd)
    return {
        "success": res["success"],
        "branch": req.branch,
        "error": res["stderr"] if not res["success"] else None
    }


class StageRequest(BaseModel):
    path: Optional[str] = None
    cwd: Optional[str] = None

@router.post("/stage")
async def stage_file(req: StageRequest):
    """Stage a specific file or all files."""
    if req.path:
        cmd = ["add", "--", req.path]
    else:
        cmd = ["add", "-A"]

    res = await run_git_cmd(cmd, cwd=req.cwd)
    return {"success": res["success"], "error": res["stderr"] if not res["success"] else None}


class UnstageRequest(BaseModel):
    path: Optional[str] = None
    cwd: Optional[str] = None

@router.post("/unstage")
async def unstage_file(req: UnstageRequest):
    """Unstage a specific file or all files."""
    if req.path:
        cmd = ["restore", "--staged", "--", req.path]
    else:
        cmd = ["restore", "--staged", "."]

    res = await run_git_cmd(cmd, cwd=req.cwd)
    return {"success": res["success"], "error": res["stderr"] if not res["success"] else None}


class DiscardRequest(BaseModel):
    path: str
    untracked: bool = False
    cwd: Optional[str] = None

@router.post("/discard")
async def discard_changes(req: DiscardRequest):
    """Discard changes in a file (restore or clean)."""
    if req.untracked:
        cmd = ["clean", "-fd", "--", req.path]
    else:
        cmd = ["restore", "--", req.path]

    res = await run_git_cmd(cmd, cwd=req.cwd)
    return {"success": res["success"], "error": res["stderr"] if not res["success"] else None}


class CommitRequest(BaseModel):
    message: str
    push: bool = False
    cwd: Optional[str] = None

@router.post("/commit")
async def commit_changes(req: CommitRequest):
    """Commit staged changes and optionally push."""
    if not req.message.strip():
        return {"success": False, "error": "Commit message cannot be empty"}

    res = await run_git_cmd(["commit", "-m", req.message], cwd=req.cwd)
    if not res["success"]:
        return {"success": False, "error": res["stderr"] or "Commit failed"}

    # Get newly minted commit SHA
    sha_res = await run_git_cmd(["rev-parse", "--short", "HEAD"], cwd=req.cwd)
    commit_sha = sha_res["stdout"].strip() if sha_res["success"] else ""

    pushed = False
    push_error = None
    if req.push:
        push_res = await run_git_cmd(["push"], cwd=req.cwd)
        pushed = push_res["success"]
        if not pushed:
            push_error = push_res["stderr"]

    return {
        "success": True,
        "commit_hash": commit_sha,
        "pushed": pushed,
        "push_error": push_error
    }


@router.get("/worktrees")
async def list_worktrees(cwd: Optional[str] = Query(None)):
    """List git worktrees."""
    res = await run_git_cmd(["worktree", "list", "--porcelain"], cwd=cwd)
    if not res["success"]:
        return {"worktrees": [], "error": res["stderr"]}

    trees = parse_worktrees_porcelain(res["stdout"])
    return {"worktrees": trees}


class AddWorktreeRequest(BaseModel):
    path: str
    branch: Optional[str] = None
    base: Optional[str] = None
    new_branch: bool = False
    cwd: Optional[str] = None

@router.post("/worktree/add")
async def add_worktree(req: AddWorktreeRequest):
    """Add a worktree."""
    cmd = ["worktree", "add"]
    if req.new_branch and req.branch:
        cmd.extend(["-b", req.branch])
    cmd.append(req.path)
    if req.base:
        cmd.append(req.base)

    res = await run_git_cmd(cmd, cwd=req.cwd)
    return {
        "success": res["success"],
        "path": req.path,
        "branch": req.branch,
        "error": res["stderr"] if not res["success"] else None
    }


class RemoveWorktreeRequest(BaseModel):
    path: str
    force: bool = False
    cwd: Optional[str] = None

@router.post("/worktree/remove")
async def remove_worktree(req: RemoveWorktreeRequest):
    """Remove a worktree."""
    cmd = ["worktree", "remove"]
    if req.force:
        cmd.append("--force")
    cmd.append(req.path)

    res = await run_git_cmd(cmd, cwd=req.cwd)
    return {
        "success": res["success"],
        "path": req.path,
        "error": res["stderr"] if not res["success"] else None
    }
