import asyncio
import os
import sys
from typing import Any, Dict, Optional

async def run_shell(command: str, cwd: Optional[str] = None, timeout: int = 60) -> Dict[str, Any]:
    """Execute a shell command asynchronously and return stdout, stderr, and exit code."""
    try:
        working_dir = cwd or os.getcwd()
        
        proc = await asyncio.create_subprocess_shell(
            command,
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
                "stderr": f"Command timed out after {timeout} seconds.",
                "timed_out": True
            }

        stdout_str = stdout_data.decode("utf-8", errors="replace")
        stderr_str = stderr_data.decode("utf-8", errors="replace")

        return {
            "success": proc.returncode == 0,
            "exit_code": proc.returncode,
            "stdout": stdout_str,
            "stderr": stderr_str,
            "timed_out": False
        }
    except Exception as exc:
        return {
            "success": False,
            "exit_code": -1,
            "stdout": "",
            "stderr": str(exc),
            "timed_out": False
        }
