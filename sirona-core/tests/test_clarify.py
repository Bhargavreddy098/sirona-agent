import asyncio
import pytest
from sirona.agent.clarify import ClarifyManager, ClarifyQuestion
from sirona.api.websocket.dispatcher import dispatch_rpc

@pytest.mark.asyncio
async def test_clarify_manager_lifecycle():
    mgr = ClarifyManager()
    session_id = "sess-clarify-1"

    questions = [
        {
            "qid": "q1",
            "question": "Which database would you prefer?",
            "choices": ["SQLite (Recommended)", "PostgreSQL"],
            "multi_select": False,
        },
        {
            "qid": "q2",
            "question": "Enable telemetry?",
            "choices": ["Yes", "No"],
            "multi_select": False,
        }
    ]

    # Start clarification request in background task
    task = asyncio.create_task(
        mgr.request_clarification(session_id, questions, request_id="srq-test-1", timeout_s=5.0)
    )

    await asyncio.sleep(0.05)
    pending = mgr.get_pending_request("srq-test-1")
    assert pending is not None
    assert pending.session_id == session_id
    assert len(pending.questions) == 2
    assert pending.questions[0].choices == ["SQLite (Recommended)", "PostgreSQL"]

    # Resolve clarification
    answers = {"q1": "SQLite (Recommended)", "q2": "No"}
    resolved = mgr.resolve_clarification("srq-test-1", answers)
    assert resolved is True

    result = await task
    assert result["status"] == "answered"
    assert result["answers"] == answers

@pytest.mark.asyncio
async def test_clarify_manager_timeout():
    mgr = ClarifyManager()
    result = await mgr.request_clarification(
        session_id="sess-timeout",
        questions=[{"qid": "q1", "question": "Are you there?"}],
        timeout_s=0.1
    )
    assert result["status"] == "timeout"

@pytest.mark.asyncio
async def test_clarify_manager_session_cancellation():
    mgr = ClarifyManager()
    session_id = "sess-cancel"

    task = asyncio.create_task(
        mgr.request_clarification(
            session_id=session_id,
            questions=[{"qid": "q1", "question": "Question?"}],
            timeout_s=10.0
        )
    )

    await asyncio.sleep(0.05)
    mgr.cancel_pending_for_session(session_id)

    result = await task
    assert result["status"] == "cancelled"

@pytest.mark.asyncio
async def test_clarify_rpc_dispatcher():
    class DummyState:
        def __init__(self):
            self.clarify_manager = ClarifyManager()

    state = DummyState()
    task = asyncio.create_task(
        state.clarify_manager.request_clarification(
            session_id="sess-rpc",
            questions=[{"qid": "q1", "question": "Color?", "choices": ["Red", "Blue"]}],
            request_id="srq-rpc-1",
            timeout_s=5.0
        )
    )

    await asyncio.sleep(0.05)
    rpc_res = await dispatch_rpc(
        "clarify.respond",
        {"request_id": "srq-rpc-1", "answers": {"q1": "Blue"}},
        state
    )

    assert rpc_res["resolved"] is True
    result = await task
    assert result["answers"] == {"q1": "Blue"}
