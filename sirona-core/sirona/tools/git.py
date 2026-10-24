from typing import Any, Dict, Optional
from .terminal import run_shell

async def git_status(cwd: Optional[str] = None) -> Dict[str, Any]:
    """Get current git status and branch."""
    res = await run_shell("git status --short --branch", cwd=cwd)
    return {
        "success": res["success"],
        "status": res["stdout"],
        "error": res["stderr"] if not res["success"] else None
    }

async def git_diff(cwd: Optional[str] = None, staged: bool = False) -> Dict[str, Any]:
    """Get unstaged or staged git diff."""
    cmd = "git diff --staged" if staged else "git diff"
    res = await run_shell(cmd, cwd=cwd)
    return {
        "success": res["success"],
        "diff": res["stdout"],
        "error": res["stderr"] if not res["success"] else None
    }

async def git_log(limit: int = 10, cwd: Optional[str] = None) -> Dict[str, Any]:
    """Get git commit history."""
    cmd = f"git log -n {limit} --oneline"
    res = await run_shell(cmd, cwd=cwd)
    return {
        "success": res["success"],
        "log": res["stdout"],
        "error": res["stderr"] if not res["success"] else None
    }
