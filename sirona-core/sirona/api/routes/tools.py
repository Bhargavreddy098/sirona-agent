from fastapi import APIRouter, Request

router = APIRouter(tags=["Tools"])

@router.get("/v1/capabilities")
async def get_capabilities():
    return {
        "terminal": True,
        "filesystem": True,
        "mcp": True,
        "python_repl": True,
        "skills": True,
        "computer_use": False,
        "vision": True,
        "voice": True
    }

@router.get("/v1/toolsets")
async def list_toolsets(request: Request):
    tool_reg = request.app.state.tool_registry
    tools = tool_reg.list_tools()
    return {
        "tools": [
            {
                "name": t.name,
                "description": t.description,
                "danger_level": t.danger_level,
                "parameters": t.parameters
            }
            for t in tools
        ]
    }

from pydantic import BaseModel
from typing import Any, Dict, Optional

class ToolExecutionRequest(BaseModel):
    tool_name: str
    args: Optional[Dict[str, Any]] = None

@router.post("/api/tools/execute")
async def execute_tool(request: Request, body: ToolExecutionRequest):
    tool_reg = request.app.state.tool_registry
    tool = tool_reg.get(body.tool_name)
    if not tool:
        return {"success": False, "error": f"Tool '{body.tool_name}' not found"}
    try:
        args = body.args or {}
        res = await tool.execute(**args)
        return {"success": True, "result": res}
    except Exception as e:
        return {"success": False, "error": str(e)}
