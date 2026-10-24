import pytest
import tempfile
from pathlib import Path
from sirona.database.connection import DatabaseManager
from sirona.database.migrations import init_db
from sirona.database.sessions import SessionRepository
from sirona.database.messages import MessageRepository
from sirona.tools.registry import ToolRegistry
from sirona.agent.approvals import ApprovalManager
from sirona.agent.runtime import AgentRuntime
from sirona.providers.base import LLMProvider, StreamChunk

class E2EProvider(LLMProvider):
    def __init__(self):
        self.step = 0

    async def stream_chat(self, messages, tools=None, reasoning_effort="medium"):
        self.step += 1
        if self.step == 1:
            yield StreamChunk(type="reasoning", content="Inspecting repository files first.")
            yield StreamChunk(
                type="tool_call",
                tool_call_id="call_e2e_1",
                tool_name="list_dir",
                tool_args={"path": "."}
            )
        else:
            yield StreamChunk(type="text", content="I analyzed the directory contents. Sirona is operational.")

@pytest.mark.asyncio
async def test_end_to_end_agent_flow():
    with tempfile.TemporaryDirectory() as tmpdir:
        db_mgr = DatabaseManager(db_path=str(Path(tmpdir) / "e2e_test.db"))
        await init_db(db_mgr)
        
        session_repo = SessionRepository(db_mgr)
        message_repo = MessageRepository(db_mgr)
        tool_reg = ToolRegistry()
        approval_mgr = ApprovalManager()
        
        # Register tool
        @tool_reg.register("list_dir", danger_level="safe")
        def list_dir(path: str):
            return ["sirona-core", "sirona-ui", "docs"]

        runtime = AgentRuntime(
            session_repo=session_repo,
            message_repo=message_repo,
            tool_registry=tool_reg,
            approval_manager=approval_mgr,
            provider=E2EProvider()
        )

        sess = await session_repo.create_session(title="E2E Pipeline Test")
        
        events = []
        async for event in runtime.run_turn(session_id=sess.id, prompt="Inspect the project"):
            events.append(event)

        # Assertions on event stream
        assert any(e["type"] == "stream.reasoning" for e in events)
        assert any(e["type"] == "tool_start" for e in events)
        assert any(e["type"] == "tool_complete" for e in events)
        assert any(e["type"] == "message_complete" for e in events)

        # Assertions on stored messages
        messages = await message_repo.get_messages(sess.id)
        assert len(messages) == 3
        assert messages[0].role == "user"
        assert messages[1].role == "tool"
        assert messages[2].role == "assistant"
        assert "Sirona is operational" in messages[2].content

        await db_mgr.close()
