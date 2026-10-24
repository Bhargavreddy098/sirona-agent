import asyncio
import os
import tempfile
from pathlib import Path
import pytest
from sirona.database.connection import DatabaseManager
from sirona.database.migrations import init_db
from sirona.agent.turn_lease import SessionTurnLeaseRegistry, TurnLeaseTimeoutError


@pytest.fixture
async def db_manager():
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "lease_test.db"
        mgr = DatabaseManager(db_path=str(db_path))
        await init_db(mgr)
        yield mgr
        await mgr.close()


@pytest.mark.asyncio
async def test_turn_lease_acquire_and_release(db_manager):
    registry = SessionTurnLeaseRegistry(db_mgr=db_manager)
    session_id = "sess_test_1"

    assert not registry.is_held(session_id)
    token = await registry.acquire(session_id, owner_key="turn_1", wait_seconds=1.0)
    assert registry.is_held(session_id)
    assert token.session_id == session_id
    assert token.owner_key == "turn_1"
    assert token.generation == 1
    assert not token.released

    # Verify persisted in database
    async with db_manager.acquire() as db:
        async with db.execute("SELECT * FROM session_turn_leases WHERE conversation_id = ?", (session_id,)) as cursor:
            row = await cursor.fetchone()
            assert row is not None
            assert "turn_1#1" in row["holder"]

    # Release
    released = await registry.release(token)
    assert released is True
    assert token.released is True
    assert not registry.is_held(session_id)

    # Verify cleared from database
    async with db_manager.acquire() as db:
        async with db.execute("SELECT * FROM session_turn_leases WHERE conversation_id = ?", (session_id,)) as cursor:
            row = await cursor.fetchone()
            assert row is None


@pytest.mark.asyncio
async def test_turn_lease_timeout_fails_closed(db_manager):
    registry = SessionTurnLeaseRegistry(db_mgr=db_manager, default_wait=0.2)
    session_id = "sess_test_2"

    token1 = await registry.acquire(session_id, owner_key="turn_a", wait_seconds=1.0)
    assert registry.is_held(session_id)

    # Second caller attempts to acquire while token1 is held, with short timeout
    with pytest.raises(TurnLeaseTimeoutError) as exc_info:
        await registry.acquire(session_id, owner_key="turn_b", wait_seconds=0.1)

    assert "Turn lease wait timed out" in str(exc_info.value)
    assert exc_info.value.session_id == session_id
    assert exc_info.value.generation == 1

    # First caller releases cleanly
    await registry.release(token1)
    assert not registry.is_held(session_id)


@pytest.mark.asyncio
async def test_turn_lease_serialization(db_manager):
    registry = SessionTurnLeaseRegistry(db_mgr=db_manager)
    session_id = "sess_test_3"
    execution_order = []

    async def worker(name: str, delay: float):
        token = await registry.acquire(session_id, owner_key=name, wait_seconds=2.0)
        execution_order.append(f"{name}_start")
        await asyncio.sleep(delay)
        execution_order.append(f"{name}_end")
        await registry.release(token)

    # Launch two workers concurrently on the same session
    await asyncio.gather(
        worker("worker_1", 0.05),
        worker("worker_2", 0.02)
    )

    # They must run sequentially without interleaving start/end
    assert execution_order == [
        "worker_1_start",
        "worker_1_end",
        "worker_2_start",
        "worker_2_end"
    ]


@pytest.mark.asyncio
async def test_turn_lease_hold_context_manager(db_manager):
    registry = SessionTurnLeaseRegistry(db_mgr=db_manager)
    session_id = "sess_test_4"

    async with registry.hold(session_id, owner_key="cm_turn") as token:
        assert registry.is_held(session_id)
        assert token.generation == 1

    assert not registry.is_held(session_id)
    assert token.released is True


@pytest.mark.asyncio
async def test_turn_lease_generation_increments(db_manager):
    registry = SessionTurnLeaseRegistry(db_mgr=db_manager)
    session_id = "sess_test_5"

    token1 = await registry.acquire(session_id, owner_key="t1")
    assert token1.generation == 1
    await registry.release(token1)

    token2 = await registry.acquire(session_id, owner_key="t2")
    assert token2.generation == 2
    await registry.release(token2)

    token3 = await registry.acquire(session_id, owner_key="t3")
    assert token3.generation == 3
    await registry.release(token3)
