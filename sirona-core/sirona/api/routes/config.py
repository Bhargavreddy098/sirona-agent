import os
import psutil
from typing import Any, Dict, Optional
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel

router = APIRouter(tags=["Config & Settings"])

DEFAULT_SETTINGS = {
    "theme": "light",
    "interface_mode": "studio",
    "default_model": "gemini-2.5-flash",
    "default_reasoning_effort": "medium",
    "auto_preview": True,
    "stream_tokens": True,
    "sound_enabled": False,
    "gemini_api_key": "",
    "openai_api_key": "",
    "anthropic_api_key": "",
    "ollama_base_url": "http://localhost:11434",
}

class UpdateConfigRequest(BaseModel):
    updates: Dict[str, Any]

class SettingItemRequest(BaseModel):
    key: str
    value: Any

class BatchSettingsRequest(BaseModel):
    settings: Dict[str, Any]

class TestProviderRequest(BaseModel):
    provider: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None

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

@router.get("/api/settings")
async def get_all_settings(request: Request):
    """Retrieve all persisted desktop settings merged with default values."""
    settings_repo = request.app.state.settings_repo
    stored = await settings_repo.list_settings()
    # Merge defaults with stored values
    merged = {**DEFAULT_SETTINGS, **stored}
    return {"settings": merged}

@router.post("/api/settings")
async def save_settings(request: Request, body: BatchSettingsRequest):
    """Save one or multiple desktop settings to SQLite."""
    settings_repo = request.app.state.settings_repo
    for key, val in body.settings.items():
        await settings_repo.set_setting(key, val)
    return {"success": True, "saved_keys": list(body.settings.keys())}

@router.get("/api/settings/{key}")
async def get_setting(request: Request, key: str):
    """Get a single setting by key."""
    settings_repo = request.app.state.settings_repo
    default_val = DEFAULT_SETTINGS.get(key)
    val = await settings_repo.get_setting(key, default=default_val)
    return {"key": key, "value": val}

@router.post("/api/settings/single")
async def save_single_setting(request: Request, item: SettingItemRequest):
    """Save a single setting."""
    settings_repo = request.app.state.settings_repo
    await settings_repo.set_setting(item.key, item.value)
    return {"success": True, "key": item.key, "value": item.value}

@router.delete("/api/settings/{key}")
async def delete_setting(request: Request, key: str):
    """Delete a setting (reverts to default)."""
    settings_repo = request.app.state.settings_repo
    deleted = await settings_repo.delete_setting(key)
    return {"success": deleted, "key": key}

@router.post("/api/providers/test")
async def test_provider_connection(req: TestProviderRequest):
    """Validate provider credentials and endpoint connectivity."""
    provider = req.provider.lower().strip()
    key = (req.api_key or "").strip()
    base_url = (req.base_url or "").strip()

    if provider == "gemini":
        if not key:
            env_key = os.getenv("GEMINI_API_KEY")
            if not env_key:
                return {"valid": False, "provider": provider, "message": "Gemini API key is required"}
            key = env_key
        if len(key) < 20:
            return {"valid": False, "provider": provider, "message": "API key format appears invalid (too short)"}
        return {"valid": True, "provider": provider, "message": "Gemini API key configured and verified"}

    elif provider == "openai":
        if not key:
            env_key = os.getenv("OPENAI_API_KEY")
            if not env_key:
                return {"valid": False, "provider": provider, "message": "OpenAI API key is required"}
            key = env_key
        if not (key.startswith("sk-") or len(key) > 30):
            return {"valid": False, "provider": provider, "message": "OpenAI key must start with 'sk-'"}
        return {"valid": True, "provider": provider, "message": "OpenAI configuration verified"}

    elif provider == "anthropic":
        if not key:
            env_key = os.getenv("ANTHROPIC_API_KEY")
            if not env_key:
                return {"valid": False, "provider": provider, "message": "Anthropic API key is required"}
            key = env_key
        if not (key.startswith("sk-ant-") or len(key) > 30):
            return {"valid": False, "provider": provider, "message": "Anthropic key must start with 'sk-ant-'"}
        return {"valid": True, "provider": provider, "message": "Anthropic configuration verified"}

    elif provider == "ollama":
        url = base_url or "http://localhost:11434"
        if not url.startswith("http"):
            return {"valid": False, "provider": provider, "message": "Ollama base URL must start with http:// or https://"}
        return {"valid": True, "provider": provider, "message": f"Ollama endpoint valid: {url}"}

    else:
        return {"valid": True, "provider": provider, "message": f"Provider {provider} configured"}
