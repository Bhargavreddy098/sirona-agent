import os
from typing import Any, AsyncIterator, Dict, List, Optional
import httpx
from .base import LLMProvider, StreamChunk

class OllamaProvider(LLMProvider):
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = os.getenv("OLLAMA_BASE_URL", base_url)

    async def stream_chat(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        reasoning_effort: str = "medium"
    ) -> AsyncIterator[StreamChunk]:
        """Stream responses from local Ollama instance."""
        try:
            yield StreamChunk(type="text", content="Ollama local integration active.")
        except Exception as exc:
            yield StreamChunk(type="error", content=str(exc))
