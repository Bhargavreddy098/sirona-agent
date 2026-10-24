import io
import sys
import traceback
from typing import Any, Dict

def execute_python(code: str, timeout: int = 15) -> Dict[str, Any]:
    """Execute Python code in-process, capturing standard output and return values."""
    old_stdout = sys.stdout
    old_stderr = sys.stderr
    redirected_stdout = io.StringIO()
    redirected_stderr = io.StringIO()

    global_scope: Dict[str, Any] = {"__name__": "__main__"}
    
    try:
        sys.stdout = redirected_stdout
        sys.stderr = redirected_stderr
        
        exec(code, global_scope)
        
        stdout_val = redirected_stdout.getvalue()
        stderr_val = redirected_stderr.getvalue()
        
        return {
            "success": True,
            "stdout": stdout_val,
            "stderr": stderr_val,
            "error": None
        }
    except Exception:
        stdout_val = redirected_stdout.getvalue()
        stderr_val = redirected_stderr.getvalue()
        err_msg = traceback.format_exc()
        return {
            "success": False,
            "stdout": stdout_val,
            "stderr": stderr_val + ("\n" if stderr_val else "") + err_msg,
            "error": err_msg
        }
    finally:
        sys.stdout = old_stdout
        sys.stderr = old_stderr
