import os
from pathlib import Path
from typing import Any, Dict, List, Optional

def read_file(path: str, offset: int = 0, limit: Optional[int] = None) -> Dict[str, Any]:
    """Read contents of a text file from disk."""
    try:
        p = Path(path).resolve()
        if not p.exists():
            return {"success": False, "error": f"File '{path}' does not exist."}
        if p.is_dir():
            return {"success": False, "error": f"Path '{path}' is a directory, not a file."}
        
        with open(p, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()

        if offset > 0:
            lines = lines[offset:]
        if limit is not None:
            lines = lines[:limit]

        return {
            "success": True,
            "path": str(p),
            "content": "".join(lines),
            "total_lines": len(lines)
        }
    except Exception as exc:
        return {"success": False, "error": str(exc)}

def write_file(path: str, content: str, overwrite: bool = True) -> Dict[str, Any]:
    """Write content to a file, creating parent directories if needed."""
    try:
        p = Path(path).resolve()
        if p.exists() and not overwrite:
            return {"success": False, "error": f"File '{path}' already exists and overwrite is False."}
        
        p.parent.mkdir(parents=True, exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            f.write(content)

        return {"success": True, "path": str(p), "bytes_written": len(content.encode("utf-8"))}
    except Exception as exc:
        return {"success": False, "error": str(exc)}

def edit_file(path: str, target: str, replacement: str) -> Dict[str, Any]:
    """Edit a file by replacing an exact string target with replacement."""
    try:
        p = Path(path).resolve()
        if not p.exists():
            return {"success": False, "error": f"File '{path}' does not exist."}
        
        with open(p, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()

        if target not in content:
            return {
                "success": False,
                "error": f"Target string not found in file '{path}'."
            }

        count = content.count(target)
        new_content = content.replace(target, replacement)

        with open(p, "w", encoding="utf-8") as f:
            f.write(new_content)

        return {
            "success": True,
            "path": str(p),
            "replacements_made": count
        }
    except Exception as exc:
        return {"success": False, "error": str(exc)}

def list_dir(path: str) -> Dict[str, Any]:
    """List contents of a directory."""
    try:
        p = Path(path).resolve()
        if not p.exists():
            return {"success": False, "error": f"Directory '{path}' does not exist."}
        if not p.is_dir():
            return {"success": False, "error": f"Path '{path}' is not a directory."}

        entries = []
        for item in sorted(p.iterdir()):
            entries.append({
                "name": item.name,
                "is_dir": item.is_dir(),
                "size": item.stat().st_size if item.is_file() else 0
            })

        return {"success": True, "path": str(p), "entries": entries}
    except Exception as exc:
        return {"success": False, "error": str(exc)}
