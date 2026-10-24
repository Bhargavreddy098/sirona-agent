from abc import ABC, abstractmethod
from typing import Any, AsyncIterator, Dict, List, Optional
from pydantic import BaseModel, Field

class StreamChunk(BaseModel):
    type: str  # "text", "reasoning", "tool_call", "usage", "error"
    content: Optional[str] = None
    tool_call_id: Optional[str] = None
    tool_name: Optional[str] = None
    tool_args: Optional[Dict[str, Any]] = None
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    finish_reason: Optional[str] = None

class LLMProvider(ABC):
    @abstractmethod
    async def stream_chat(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        reasoning_effort: str = "medium"
    ) -> AsyncIterator[StreamChunk]:
        """Stream chunks from LLM provider."""
        pass

class ProviderRouter:
    def __init__(self):
        from .gemini import GeminiProvider
        from .anthropic import AnthropicProvider
        from .openai import OpenAIProvider
        from .ollama import OllamaProvider

        self.gemini = GeminiProvider()
        self.anthropic = AnthropicProvider()
        self.openai = OpenAIProvider()
        self.ollama = OllamaProvider()

    def get_provider_for_model(self, model_name: str) -> LLMProvider:
        m = model_name.lower()
        if "gemini" in m:
            return self.gemini
        elif "claude" in m or "anthropic" in m:
            return self.anthropic
        elif "gpt" in m or "o1" in m or "o3" in m:
            return self.openai
        elif "ollama" in m or "llama" in m or "qwen" in m or "deepseek" in m:
            return self.ollama
        # Default fallback
        return self.gemini
