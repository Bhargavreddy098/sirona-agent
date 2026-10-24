import os
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/api/files", tags=["files"])

DEFAULT_IGNORED_DIRS = {
    ".git",
    "node_modules",
    "__pycache__",
    ".venv",
    "venv",
    ".next",
    "dist",
    "build",
    ".gemini",
    ".pytest_cache",
    ".turbo",
}

class WriteFileRequest(BaseModel):
    path: str
    content: str
    overwrite: bool = True

class RevealFileRequest(BaseModel):
    path: str

def guess_language(filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    lang_map = {
        ".ts": "typescript",
        ".tsx": "typescript",
        ".js": "javascript",
        ".jsx": "javascript",
        ".py": "python",
        ".json": "json",
        ".html": "html",
        ".css": "css",
        ".md": "markdown",
        ".sql": "sql",
        ".sh": "bash",
        ".yml": "yaml",
        ".yaml": "yaml",
        ".toml": "toml",
    }
    return lang_map.get(ext, "plaintext")

def build_dir_tree(
    root_path: Path,
    current_depth: int = 0,
    max_depth: int = 4,
    include_hidden: bool = False
) -> List[Dict[str, Any]]:
    if current_depth > max_depth or not root_path.exists() or not root_path.is_dir():
        return []

    entries: List[Dict[str, Any]] = []
    try:
        items = sorted(root_path.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower()))
        for item in items:
            name = item.name
            if not include_hidden and name.startswith(".") and name != ".env":
                continue
            if item.is_dir() and name in DEFAULT_IGNORED_DIRS:
                continue

            node: Dict[str, Any] = {
                "name": name,
                "path": str(item.as_posix()),
                "is_dir": item.is_dir(),
                "size": item.stat().st_size if item.is_file() else 0,
            }

            if item.is_dir() and current_depth < max_depth:
                children = build_dir_tree(item, current_depth + 1, max_depth, include_hidden)
                node["children"] = children

            entries.append(node)
    except PermissionError:
        pass
    except Exception:
        pass

    return entries

@router.get("/tree")
async def get_file_tree(
    path: str = Query(".", description="Root directory path"),
    max_depth: int = Query(4, ge=1, le=10),
    include_hidden: bool = Query(False)
):
    target = Path(path).resolve()
    if not target.exists():
        raise HTTPException(status_code=404, detail=f"Directory '{path}' not found")
    if not target.is_dir():
        raise HTTPException(status_code=400, detail=f"Path '{path}' is not a directory")

    tree = build_dir_tree(target, 0, max_depth, include_hidden)
    return {
        "root": str(target.as_posix()),
        "name": target.name or ".",
        "tree": tree
    }

@router.get("/read")
async def read_workspace_file(
    path: str = Query(..., description="File path to read"),
    offset: int = Query(0, ge=0),
    limit: Optional[int] = Query(None, ge=1)
):
    target = Path(path).resolve()
    if not target.exists():
        raise HTTPException(status_code=404, detail=f"File '{path}' does not exist")
    if not target.is_file():
        raise HTTPException(status_code=400, detail=f"Path '{path}' is not a regular file")

    try:
        with open(target, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()

        total_lines = len(lines)
        if offset > 0:
            lines = lines[offset:]
        if limit is not None:
            lines = lines[:limit]

        content = "".join(lines)
        return {
            "path": str(target.as_posix()),
            "name": target.name,
            "content": content,
            "total_lines": total_lines,
            "size": target.stat().st_size,
            "language": guess_language(target.name),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to read file: {str(exc)}")

@router.post("/write")
async def write_workspace_file(req: WriteFileRequest):
    target = Path(req.path).resolve()
    if target.exists() and not req.overwrite:
        raise HTTPException(status_code=400, detail=f"File '{req.path}' already exists")

    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        with open(target, "w", encoding="utf-8") as f:
            f.write(req.content)

        return {
            "success": True,
            "path": str(target.as_posix()),
            "bytes_written": len(req.content.encode("utf-8")),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to write file: {str(exc)}")

@router.get("/search")
async def search_workspace_files(
    query: str = Query(..., min_length=1),
    path: str = Query(".", description="Directory path to search"),
    limit: int = Query(50, ge=1, le=200)
):
    target = Path(path).resolve()
    if not target.exists() or not target.is_dir():
        raise HTTPException(status_code=404, detail="Directory not found")

    matches = []
    q_lower = query.lower()

    for root, dirs, files in os.walk(target):
        dirs[:] = [d for d in dirs if d not in DEFAULT_IGNORED_DIRS and not d.startswith(".")]
        for file in files:
            if q_lower in file.lower():
                full_path = Path(root) / file
                rel_path = full_path.relative_to(target).as_posix()
                matches.append({
                    "name": file,
                    "path": str(full_path.as_posix()),
                    "relative_path": rel_path,
                    "size": full_path.stat().st_size,
                    "language": guess_language(file),
                })
                if len(matches) >= limit:
                    break
        if len(matches) >= limit:
            break

    return {"query": query, "matches": matches, "total": len(matches)}

@router.post("/reveal")
async def reveal_file(req: RevealFileRequest):
    target = Path(req.path).resolve()
    if not target.exists():
        raise HTTPException(status_code=404, detail="Path does not exist")

    try:
        if sys.platform == "win32":
            subprocess.Popen(["explorer", f"/select,{str(target)}"])
        elif sys.platform == "darwin":
            subprocess.Popen(["open", "-R", str(target)])
        else:
            subprocess.Popen(["xdg-open", str(target.parent)])
        return {"revealed": True, "path": str(target.as_posix())}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to reveal file: {str(exc)}")
