from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(tags=["Models"])

MODELS_CATALOG = [
    {"id": "gemini-2.5-flash", "provider": "gemini", "name": "Gemini 2.5 Flash", "context_window": 1_048_576},
    {"id": "gemini-2.5-pro", "provider": "gemini", "name": "Gemini 2.5 Pro", "context_window": 2_097_152},
    {"id": "claude-3-5-sonnet", "provider": "anthropic", "name": "Claude 3.5 Sonnet", "context_window": 200_000},
    {"id": "claude-3-7-sonnet", "provider": "anthropic", "name": "Claude 3.7 Sonnet", "context_window": 200_000},
    {"id": "gpt-4o", "provider": "openai", "name": "GPT-4o", "context_window": 128_000},
    {"id": "o3-mini", "provider": "openai", "name": "o3-mini", "context_window": 200_000},
    {"id": "ollama/llama3.3", "provider": "ollama", "name": "Ollama Llama 3.3", "context_window": 128_000},
]

class ModelSetRequest(BaseModel):
    model: str
    provider: Optional[str] = None

@router.get("/v1/models")
async def list_models():
    return {"data": MODELS_CATALOG}

@router.get("/api/model/options")
async def model_options():
    return {
        "models": MODELS_CATALOG,
        "reasoning_efforts": ["low", "medium", "high"],
        "default_model": "gemini-2.5-flash"
    }

@router.post("/api/model/set")
async def set_model(req: ModelSetRequest):
    return {"success": True, "active_model": req.model}
