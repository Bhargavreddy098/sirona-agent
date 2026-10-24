import psutil
from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Any, Dict

router = APIRouter(tags=["Config & Status"])

class UpdateConfigRequest(BaseModel):
    updates: Dict[str, Any]

@router.get("/api/status")
async def get_system_status():
    vm = psutil.virtual_memory()
    return {
        "cpu_pct": psutil.cpu_percent(),
        "mem_pct": vm.percent,
        "mem_available_mb": vm.available // (1024 * 1024),
        "gateway": "ready",
        "active_runs": 0
    }

@router.get("/api/config")
async def get_config(request: Request):
    cfg = request.app.state.config
    return {"config": cfg.model_dump(), "profile": "default"}

@router.patch("/api/config")
async def patch_config(request: Request, body: UpdateConfigRequest):
    return {"success": True, "applied": body.updates}

@router.get("/api/config/schema")
async def get_config_schema():
    from ...config import SironaConfig
    return SironaConfig.model_json_schema()
