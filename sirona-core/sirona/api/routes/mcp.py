from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Dict, List, Optional

router = APIRouter(tags=["MCP"])

class AddMcpServerRequest(BaseModel):
    name: str
    command: str
    args: Optional[List[str]] = None
    env: Optional[Dict[str, str]] = None

@router.get("/api/mcp/servers")
async def list_mcp_servers(request: Request):
    mcp_mgr = request.app.state.mcp_manager
    return {"servers": mcp_mgr.list_servers()}

@router.post("/api/mcp/servers")
async def add_mcp_server(request: Request, body: AddMcpServerRequest):
    mcp_mgr = request.app.state.mcp_manager
    server = mcp_mgr.add_server(
        name=body.name,
        command=body.command,
        args=body.args,
        env=body.env
    )
    return {"success": True, "server": server}

@router.delete("/api/mcp/servers/{name}")
async def remove_mcp_server(request: Request, name: str):
    mcp_mgr = request.app.state.mcp_manager
    removed = mcp_mgr.remove_server(name)
    if not removed:
        raise HTTPException(status_code=404, detail="MCP server not found")
    return {"success": True, "server_name": name}
