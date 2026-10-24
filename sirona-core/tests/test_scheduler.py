import asyncio
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
from sirona.agent.scheduler import TurnScheduler
from sirona.providers.base import LLMProvider, StreamChunk

class StreamingMockProvider(LLMProvider):
    def __init__(self, delay: float = 0.05):
        self.delay = delay

    async def stream_chat(self, messages, tools=None, reasoning_effort="medium"):
        for word in ["Hello", " ", "Sirona", " ", "Developer"]:
            await asyncio.sleep(self.delay)
            yield StreamChunk(type="text", content=word)

class ToolMockProvider(LLMProvider):
    async def stream_chat(self, messages, tools=None, reasoning_effort="medium"):
        last_msg = messages[-1] if messages else {}
        if last_msg.get("role") == "user":
            yield StreamChunk(
                type="tool_call",
                tool_call_id="call_mock_safe",
                tool_name="dummy_tool",
                tool_args={"val": 42}
            )
        else:
            yield StreamChunk(type="text", content="Tool finished.")

@pytest.fixture
async def scheduler_env():
    with tempfile.TemporaryDirectory() as tmpdir:
        db_mgr = DatabaseManager(db_path=str(Path(tmpdir) / "test_sched.db"))
        await init_db(db_mgr)
        session_repo = SessionRepository(db_mgr)
        message_repo = MessageRepository(db_mgr)
        tool_reg = ToolRegistry()
        approval_mgr = ApprovalManager()

        @tool_reg.register("dummy_tool", danger_level="safe")
        def dummy_tool(val: int) -> str:
            return f"DummyTool Result: {val * 2}"

        runtime = AgentRuntime(
            session_repo=session_repo,
            message_repo=message_repo,
            tool_registry=tool_reg,
            approval_manager=approval_mgr,
            provider=StreamingMockProvider(delay=0.02)
        )

        scheduler = TurnScheduler(runtime=runtime, approval_manager=approval_mgr)

        yield {
            "session_repo": session_repo,
            "message_repo": message_repo,
            "tool_reg": tool_reg,
            "approval_mgr": approval_mgr,
            "runtime": runtime,
            "scheduler": scheduler,
        }
        await db_mgr.close()

@pytest.mark.asyncio
async def test_submit_turn_async_and_complete(scheduler_env):
    env = scheduler_env
    scheduler: TurnScheduler = env["scheduler"]
    session_repo: SessionRepository = env["session_repo"]
    message_repo: MessageRepository = env["message_repo"]

    sess = await session_repo.create_session(title="Async Sched Test")

    # 1. Submit turn returns immediately without blocking
    start_time = asyncio.get_event_loop().time()
    res = await scheduler.submit_turn(sess.id, prompt="Explain event loops")
    elapsed = asyncio.get_event_loop().time() - start_time

    assert elapsed < 0.1  # Instant submission acknowledgement
    assert res["accepted"] is True
    assert res["queued"] is False
    assert res["turn_id"].startswith("turn_")
    assert scheduler.is_session_busy(sess.id) is True

    # 2. Wait for background task to complete
    active = scheduler.get_active_turn(sess.id)
    assert active is not None
    await active.task

    assert scheduler.is_session_busy(sess.id) is False

    # Verify messages saved
    msgs = await message_repo.get_messages(sess.id)
    assert len(msgs) == 2  # user and assistant
    assert "Hello Sirona Developer" in msgs[1].content

@pytest.mark.asyncio
async def test_turn_queueing_while_busy(scheduler_env):
    env = scheduler_env
    scheduler: TurnScheduler = env["scheduler"]
    session_repo: SessionRepository = env["session_repo"]
    message_repo: MessageRepository = env["message_repo"]

    sess = await session_repo.create_session(title="Queueing Test")

    # Submit first turn
    res1 = await scheduler.submit_turn(sess.id, prompt="First prompt")
    assert res1["accepted"] is True
    assert res1["queued"] is False

    # Immediately submit second turn on same session
    res2 = await scheduler.submit_turn(sess.id, prompt="Second prompt")
    assert res2["accepted"] is True
    assert res2["queued"] is True
    assert res2["queue_position"] == 1

    # Wait for first turn to finish
    active1 = scheduler.get_active_turn(sess.id)
    assert active1 is not None
    await active1.task

    # Small yield to let queue processing task kick off
    await asyncio.sleep(0.05)

    # Second turn should have started automatically from queue
    active2 = scheduler.get_active_turn(sess.id)
    if active2:
        await active2.task

    # Check transcript has both turns
    msgs = await message_repo.get_messages(sess.id)
    user_msgs = [m for m in msgs if m.role == "user"]
    assert len(user_msgs) == 2
    assert user_msgs[0].content == "First prompt"
    assert user_msgs[1].content == "Second prompt"

@pytest.mark.asyncio
async def test_turn_interruption(scheduler_env):
    env = scheduler_env
    # Use slower provider to test in-flight cancellation
    runtime: AgentRuntime = env["runtime"]
    runtime.provider = StreamingMockProvider(delay=0.1)

    scheduler: TurnScheduler = env["scheduler"]
    session_repo: SessionRepository = env["session_repo"]

    sess = await session_repo.create_session(title="Interrupt Test")

    # Start turn
    res = await scheduler.submit_turn(sess.id, prompt="Generate very long text")
    assert scheduler.is_session_busy(sess.id) is True

    await asyncio.sleep(0.05)

    # Interrupt turn
    int_res = await scheduler.interrupt_turn(sess.id)
    assert int_res["interrupted"] is True
    assert scheduler.is_session_busy(sess.id) is False

    # Attempting interrupt again returns False (already stopped)
    second_int = await scheduler.interrupt_turn(sess.id)
    assert second_int["interrupted"] is False

@pytest.mark.asyncio
async def test_approval_resolution_in_turn(scheduler_env):
    env = scheduler_env
    tool_reg: ToolRegistry = env["tool_reg"]
    approval_mgr: ApprovalManager = env["approval_mgr"]
    runtime: AgentRuntime = env["runtime"]
    scheduler: TurnScheduler = env["scheduler"]
    session_repo: SessionRepository = env["session_repo"]
    message_repo: MessageRepository = env["message_repo"]

    @tool_reg.register("dangerous_tool", danger_level="requires_approval")
    def dangerous_tool(cmd: str) -> str:
        return f"Executed dangerous command: {cmd}"

    class DangerousToolMockProvider(LLMProvider):
        async def stream_chat(self, messages, tools=None, reasoning_effort="medium"):
            last_msg = messages[-1] if messages else {}
            if last_msg.get("role") == "user":
                yield StreamChunk(
                    type="tool_call",
                    tool_call_id="call_dang_1",
                    tool_name="dangerous_tool",
                    tool_args={"cmd": "delete_all"}
                )
            else:
                yield StreamChunk(type="text", content="Command completed.")

    runtime.provider = DangerousToolMockProvider()

    sess = await session_repo.create_session(title="Approval Test")
    await scheduler.submit_turn(sess.id, prompt="Run dangerous command")

    # Wait for approval request to be registered
    for _ in range(20):
        await asyncio.sleep(0.02)
        pending = approval_mgr.get_pending_approvals(sess.id)
        if pending:
            break

    assert len(pending) == 1
    prompt_id = pending[0].prompt_id
    assert pending[0].tool_name == "dangerous_tool"

    # User approves
    resolved = approval_mgr.resolve_approval(prompt_id, approved=True, choice="once")
    assert resolved is True

    # Wait for turn completion
    active = scheduler.get_active_turn(sess.id)
    if active:
        await active.task

    # Check transcript for tool result
    msgs = await message_repo.get_messages(sess.id)
    tool_msgs = [m for m in msgs if m.role == "tool"]
    assert len(tool_msgs) == 1
    assert "Executed dangerous command: delete_all" in tool_msgs[0].content
