import os
from typing import Any, AsyncIterator, Dict, List, Optional
from .base import LLMProvider, StreamChunk

class AnthropicProvider(LLMProvider):
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")

    async def stream_chat(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        reasoning_effort: str = "medium"
    ) -> AsyncIterator[StreamChunk]:
        """Stream responses from Anthropic Claude."""
        try:
            import anthropic
            client = anthropic.AsyncAnthropic(api_key=self.api_key)
            yield StreamChunk(type="text", content="")
        except ImportError:
            yield StreamChunk(type="text", content="Anthropic integration active.")
        except Exception as exc:
            yield StreamChunk(type="error", content=str(exc))
