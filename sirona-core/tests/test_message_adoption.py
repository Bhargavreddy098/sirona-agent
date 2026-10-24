import tempfile
from pathlib import Path
import pytest
from sirona.database.connection import DatabaseManager
from sirona.database.migrations import init_db
from sirona.database.sessions import SessionRepository
from sirona.database.messages import MessageRepository
from sirona.tools.registry import ToolRegistry
from sirona.providers.base import LLMProvider, StreamChunk
from sirona.agent.approvals import ApprovalManager
from sirona.agent.runtime import AgentRuntime
from sirona.agent.scheduler import TurnScheduler
from sirona.agent.turn_lease import SessionTurnLeaseRegistry


class MockProvider(LLMProvider):
    async def stream_chat(self, messages, tools=None, reasoning_effort="medium"):
        yield StreamChunk(type="text", content="Mock assistant answer", finish_reason="stop")



@pytest.fixture
async def setup_env():
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "adoption_test.db"
        mgr = DatabaseManager(db_path=str(db_path))
        await init_db(mgr)

        sess_repo = SessionRepository(mgr)
        msg_repo = MessageRepository(mgr)
        tool_reg = ToolRegistry()
        approval_mgr = ApprovalManager()
        lease_reg = SessionTurnLeaseRegistry(db_mgr=mgr)

        runtime = AgentRuntime(
            session_repo=sess_repo,
            message_repo=msg_repo,
            tool_registry=tool_reg,
            approval_manager=approval_mgr,
            provider=MockProvider(),
            lease_registry=lease_reg,
        )
        scheduler = TurnScheduler(
            runtime=runtime,
            approval_manager=approval_mgr,
            lease_registry=lease_reg,
        )

        sess = await sess_repo.create_session(title="Adoption Verification")

        yield {
            "db_mgr": mgr,
            "sess_repo": sess_repo,
            "msg_repo": msg_repo,
            "scheduler": scheduler,
            "runtime": runtime,
            "session": sess,
            "lease_reg": lease_reg,
        }
        await mgr.close()


@pytest.mark.asyncio
async def test_adopt_submit_user_row_durability(setup_env):
    scheduler = setup_env["scheduler"]
    msg_repo = setup_env["msg_repo"]
    sess = setup_env["session"]

    prompt_text = "Durable prompt that must persist across crashes"

    # Submit turn
    res = await scheduler.submit_turn(
        session_id=sess.id,
        prompt=prompt_text,
    )

    assert res["accepted"] is True
    assert "turn_id" in res
    assert "message_id" in res
    user_msg_id = res["message_id"]

    # Verify user message is IMMEDIATELY stored in DB
    pre_msg = await msg_repo.get_message_by_id(user_msg_id)
    assert pre_msg is not None
    assert pre_msg.content == prompt_text
    assert pre_msg.role == "user"

    # Wait for turn task to complete
    active = scheduler.get_active_turn(sess.id)
    if active and not active.task.done():
        await active.task

    # Verify that ONLY ONE user message exists in the session (no duplicate created!)
    all_msgs = await msg_repo.get_messages(sess.id)
    user_msgs = [m for m in all_msgs if m.role == "user"]
    assert len(user_msgs) == 1
    assert user_msgs[0].id == user_msg_id
    assert user_msgs[0].content == prompt_text

    # Assistant message should also be present
    assistant_msgs = [m for m in all_msgs if m.role == "assistant"]
    assert len(assistant_msgs) == 1
    assert assistant_msgs[0].content == "Mock assistant answer"


@pytest.mark.asyncio
async def test_runtime_adopts_existing_unadopted_message(setup_env):
    runtime = setup_env["runtime"]
    msg_repo = setup_env["msg_repo"]
    sess = setup_env["session"]

    prompt_text = "Prompt written externally before run_turn"

    # Simulate crash recovery: user row already exists in DB
    pre_saved = await msg_repo.add_message(
        session_id=sess.id,
        role="user",
        content=prompt_text,
    )

    # Run turn with user_message_id
    events = []
    async for event in runtime.run_turn(
        session_id=sess.id,
        prompt=prompt_text,
        user_message_id=pre_saved.id,
    ):
        events.append(event)

    # Confirm user message event refers to pre-saved ID
    user_event = next(e for e in events if e["type"] == "user_message")
    assert user_event["message_id"] == pre_saved.id

    # Confirm no duplicate user row was inserted
    all_msgs = await msg_repo.get_messages(sess.id)
    user_msgs = [m for m in all_msgs if m.role == "user"]
    assert len(user_msgs) == 1
    assert user_msgs[0].id == pre_saved.id
