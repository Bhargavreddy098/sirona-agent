import asyncio
import pytest
import tempfile
from pathlib import Path
from sirona.database.connection import DatabaseManager
from sirona.database.migrations import init_db
from sirona.database.sessions import SessionRepository
from sirona.database.messages import MessageRepository
from sirona.tools.registry import ToolRegistry
from sirona.agent.approvals import ApprovalManager, ApprovalRequest
from sirona.agent.prompt_builder import PromptBuilder
from sirona.agent.context_compressor import ContextCompressor
from sirona.agent.runtime import AgentRuntime
from sirona.providers.base import LLMProvider, StreamChunk

class DummyProvider(LLMProvider):
    async def stream_chat(self, messages, tools=None, reasoning_effort="medium"):
        # Emulate model requesting tool execution then giving final response
        last_msg = messages[-1] if messages else {}
        if last_msg.get("role") == "user":
            yield StreamChunk(
                type="tool_call",
                tool_call_id="call_mock_1",
                tool_name="sample_tool",
                tool_args={"msg": "Sirona"}
            )
        else:
            yield StreamChunk(type="text", content="Task completed successfully.")

@pytest.fixture
async def setup_env():
    with tempfile.TemporaryDirectory() as tmpdir:
        db_mgr = DatabaseManager(db_path=str(Path(tmpdir) / "test_sirona.db"))
        await init_db(db_mgr)
        session_repo = SessionRepository(db_mgr)
        message_repo = MessageRepository(db_mgr)
        tool_reg = ToolRegistry()
        approval_mgr = ApprovalManager()
        
        @tool_reg.register("sample_tool", danger_level="safe")
        def sample_tool(msg: str) -> str:
            return f"Echo: {msg}"

        yield {
            "db_mgr": db_mgr,
            "session_repo": session_repo,
            "message_repo": message_repo,
            "tool_reg": tool_reg,
            "approval_mgr": approval_mgr
        }
        await db_mgr.close()

@pytest.mark.asyncio
async def test_approval_lifecycle():
    mgr = ApprovalManager()
    
    # Request approval
    req_task = asyncio.create_task(
        mgr.request_approval(
            session_id="sess_1",
            tool_name="run_shell",
            tool_args={"command": "rm -rf /tmp"},
            danger_level="requires_approval"
        )
    )
    
    await asyncio.sleep(0.01)
    pending = mgr.get_pending_approvals()
    assert len(pending) == 1
    prompt_id = pending[0].prompt_id
    
    # Resolve approval
    resolved = mgr.resolve_approval(prompt_id, approved=True)
    assert resolved is True
    
    result = await req_task
    assert result["approved"] is True

def test_prompt_builder():
    builder = PromptBuilder()
    sys_prompt = builder.build_system_prompt()
    assert "Sirona" in sys_prompt
    assert "Direct" in sys_prompt or "direct" in sys_prompt.lower()

def test_context_compressor():
    compressor = ContextCompressor(max_tokens=500)
    messages = [
        {"role": "user", "content": f"Message turn {i} with substantial detail " * 10}
        for i in range(15)
    ]
    compacted = compressor.compact_messages(messages)
    assert len(compacted) < len(messages)
    assert any("compacted" in m.get("content", "").lower() or m["role"] == "system" for m in compacted)

@pytest.mark.asyncio
async def test_agent_runtime_turn(setup_env):
    env = setup_env
    sess = await env["session_repo"].create_session(title="Turn Test")
    
    runtime = AgentRuntime(
        session_repo=env["session_repo"],
        message_repo=env["message_repo"],
        tool_registry=env["tool_reg"],
        approval_manager=env["approval_mgr"],
        provider=DummyProvider()
    )
    
    events = []
    async for event in runtime.run_turn(session_id=sess.id, prompt="Hello Sirona"):
        events.append(event)

    assert any(e["type"] == "tool_start" for e in events)
    assert any(e["type"] == "tool_complete" for e in events)
    assert any(e["type"] == "message_complete" for e in events)

    # Verify messages saved to database
    msgs = await env["message_repo"].get_messages(sess.id)
    assert len(msgs) >= 3  # user, tool response, final assistant
