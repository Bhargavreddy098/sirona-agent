import os
import mimetypes
from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel

router = APIRouter(prefix="/api/preview", tags=["preview"])

class RenderHtmlRequest(BaseModel):
    html: str
    title: str = "Preview"

@router.get("/health")
async def preview_health():
    return {"status": "ok", "service": "preview-renderer"}

@router.post("/html")
async def render_html(req: RenderHtmlRequest):
    headers = {
        "Content-Type": "text/html; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; frame-ancestors 'self';",
    }
    return Response(content=req.html, media_type="text/html", headers=headers)

@router.get("/file")
async def preview_file(path: str = Query(..., description="Absolute or relative file path to preview")):
    resolved = os.path.abspath(path)

    if not os.path.exists(resolved):
        raise HTTPException(status_code=404, detail=f"File not found: {path}")

    if not os.path.isfile(resolved):
        raise HTTPException(status_code=400, detail="Path must be a file")

    mime_type, _ = mimetypes.guess_type(resolved)
    if not mime_type:
        mime_type = "text/plain"

    try:
        with open(resolved, "rb") as f:
            content = f.read()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to read file: {str(exc)}")

    headers = {
        "Content-Type": f"{mime_type}; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
    }
    if mime_type == "text/html":
        headers["Content-Security-Policy"] = "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; frame-ancestors 'self';"

    return Response(content=content, media_type=mime_type, headers=headers)
