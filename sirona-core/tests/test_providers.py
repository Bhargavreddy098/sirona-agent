import pytest
from typing import AsyncIterator, List, Dict, Any
from sirona.providers.base import LLMProvider, StreamChunk, ProviderRouter
from sirona.providers.gemini import GeminiProvider
from sirona.providers.anthropic import AnthropicProvider
from sirona.providers.openai import OpenAIProvider
from sirona.providers.ollama import OllamaProvider

class MockProvider(LLMProvider):
    async def stream_chat(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        reasoning_effort: str = "medium"
    ) -> AsyncIterator[StreamChunk]:
        yield StreamChunk(type="reasoning", content="Thinking through step 1...")
        yield StreamChunk(type="text", content="Hello from Sirona!")
        yield StreamChunk(
            type="tool_call",
            tool_call_id="call_123",
            tool_name="read_file",
            tool_args={"path": "test.txt"}
        )
        yield StreamChunk(type="usage", input_tokens=150, output_tokens=42)

def test_provider_router():
    router = ProviderRouter()
    
    # Check model routing logic
    p1 = router.get_provider_for_model("gemini-2.5-flash")
    assert isinstance(p1, GeminiProvider)
    
    p2 = router.get_provider_for_model("claude-3-5-sonnet")
    assert isinstance(p2, AnthropicProvider)
    
    p3 = router.get_provider_for_model("gpt-4o")
    assert isinstance(p3, OpenAIProvider)
    
    p4 = router.get_provider_for_model("ollama/llama3.3")
    assert isinstance(p4, OllamaProvider)

@pytest.mark.asyncio
async def test_mock_stream_generation():
    provider = MockProvider()
    chunks = []
    async for chunk in provider.stream_chat(messages=[{"role": "user", "content": "hi"}]):
        chunks.append(chunk)

    assert len(chunks) == 4
    assert chunks[0].type == "reasoning"
    assert chunks[0].content == "Thinking through step 1..."
    assert chunks[1].type == "text"
    assert chunks[1].content == "Hello from Sirona!"
    assert chunks[2].type == "tool_call"
    assert chunks[2].tool_name == "read_file"
    assert chunks[3].type == "usage"
    assert chunks[3].input_tokens == 150
