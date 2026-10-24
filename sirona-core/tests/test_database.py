import pytest
import tempfile
import os
from pathlib import Path
from sirona.database.connection import DatabaseManager
from sirona.database.migrations import init_db
from sirona.database.sessions import SessionRepository
from sirona.database.messages import MessageRepository
from sirona.database.projects import ProjectRepository

@pytest.fixture
async def db_manager():
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "sirona_test.db"
        mgr = DatabaseManager(db_path=str(db_path))
        await init_db(mgr)
        yield mgr
        await mgr.close()

@pytest.mark.asyncio
async def test_database_wal_mode(db_manager):
    async with db_manager.acquire() as db:
        async with db.execute("PRAGMA journal_mode;") as cursor:
            row = await cursor.fetchone()
            # journal_mode should be wal or memory (for in-memory / temporary files)
            assert row[0].lower() in ("wal", "memory")

@pytest.mark.asyncio
async def test_session_lifecycle(db_manager):
    session_repo = SessionRepository(db_manager)
    
    # Create session
    sess = await session_repo.create_session(
        title="Test Investigation",
        model="gemini-2.5-pro",
        cwd="/workspace/test"
    )
    assert sess.id is not None
    assert sess.title == "Test Investigation"
    assert sess.model == "gemini-2.5-pro"
    assert sess.cwd == "/workspace/test"
    
    # Retrieve session
    fetched = await session_repo.get_session(sess.id)
    assert fetched is not None
    assert fetched.id == sess.id
    assert fetched.pinned == 0
    assert fetched.archived == 0
    
    # Update session (pin and rename)
    updated = await session_repo.update_session(sess.id, title="Refined Title", pinned=True)
    assert updated.title == "Refined Title"
    assert updated.pinned == 1
    
    # List sessions
    sessions, total = await session_repo.list_sessions(limit=10, offset=0)
    assert total >= 1
    assert any(s.id == sess.id for s in sessions)
    
    # Delete session
    deleted = await session_repo.delete_session(sess.id)
    assert deleted is True
    assert await session_repo.get_session(sess.id) is None

@pytest.mark.asyncio
async def test_message_storage_and_fts_search(db_manager):
    session_repo = SessionRepository(db_manager)
    msg_repo = MessageRepository(db_manager)
    
    sess = await session_repo.create_session(title="Search Session")
    
    # Store user and assistant messages
    msg1 = await msg_repo.add_message(
        session_id=sess.id,
        role="user",
        content="How do we optimize the SQLite database indexing?"
    )
    msg2 = await msg_repo.add_message(
        session_id=sess.id,
        role="assistant",
        content="We should create an FTS5 full-text search table with trigram indexing."
    )
    
    # Retrieve messages
    messages = await msg_repo.get_messages(sess.id)
    assert len(messages) == 2
    assert messages[0].content == "How do we optimize the SQLite database indexing?"
    assert messages[1].content == "We should create an FTS5 full-text search table with trigram indexing."
    
    # FTS5 search
    search_results = await msg_repo.search_messages("trigram")
    assert len(search_results) >= 1
    assert search_results[0].session_id == sess.id

@pytest.mark.asyncio
async def test_project_repository(db_manager):
    proj_repo = ProjectRepository(db_manager)
    
    proj = await proj_repo.create_project(
        name="Personal Agent",
        primary_path="/workspace/agent",
        description="Autonomous AI Agent project"
    )
    assert proj.id is not None
    assert proj.name == "Personal Agent"
    
    # Add folder
    await proj_repo.add_folder(proj.id, "/workspace/agent/frontend", label="Frontend")
    folders = await proj_repo.get_folders(proj.id)
    assert len(folders) == 2
    assert any(f["label"] == "Frontend" for f in folders)

@pytest.mark.asyncio
async def test_session_cas_revision_concurrency(db_manager):
    session_repo = SessionRepository(db_manager)
    sess = await session_repo.create_session(title="CAS Test")
    assert sess.revision == 1

    # Successful update with correct expected_revision
    updated = await session_repo.update_session(sess.id, title="CAS Step 1", expected_revision=1)
    assert updated.title == "CAS Step 1"
    assert updated.revision == 2

    # Attempt update with stale revision should raise ValueError
    with pytest.raises(ValueError, match="CAS revision conflict"):
        await session_repo.update_session(sess.id, title="Stale Write", expected_revision=1)

    # Update with new matching revision succeeds
    updated2 = await session_repo.update_session(sess.id, title="CAS Step 2", expected_revision=2)
    assert updated2.title == "CAS Step 2"
    assert updated2.revision == 3

@pytest.mark.asyncio
async def test_session_branching_and_lineage(db_manager):
    session_repo = SessionRepository(db_manager)
    msg_repo = MessageRepository(db_manager)

    parent = await session_repo.create_session(title="Parent Session", model="gemini-2.5-pro")
    m1 = await msg_repo.add_message(parent.id, "user", "Message 1")
    m2 = await msg_repo.add_message(parent.id, "assistant", "Response 1")
    m3 = await msg_repo.add_message(parent.id, "user", "Message 2")

    # Branch up to message 2
    child = await session_repo.branch_session(
        source_session_id=parent.id,
        through_message_id=m2.id,
        new_title="Alternative Exploration",
        reason="user_alternative"
    )

    assert child is not None
    assert child.parent_session_id == parent.id
    assert child.branch_point_id == str(m2.id)
    assert child.title == "Alternative Exploration"
    assert child.model == "gemini-2.5-pro"

    # Verify messages in child session were copied up to m2
    child_msgs = await msg_repo.get_messages(child.id)
    assert len(child_msgs) == 2
    assert child_msgs[0].content == "Message 1"
    assert child_msgs[1].content == "Response 1"

    # Verify lineage in session_lineage table
    async with db_manager.acquire() as db:
        async with db.execute("SELECT * FROM session_lineage WHERE child_session_id = ?", (child.id,)) as c:
            row = await c.fetchone()
            assert row is not None
            assert row["parent_session_id"] == parent.id
            assert row["branch_message_id"] == m2.id
            assert row["branch_reason"] == "user_alternative"

@pytest.mark.asyncio
async def test_session_rewind(db_manager):
    session_repo = SessionRepository(db_manager)
    msg_repo = MessageRepository(db_manager)

    sess = await session_repo.create_session(title="Rewind Test")
    m1 = await msg_repo.add_message(sess.id, "user", "Question 1")
    m2 = await msg_repo.add_message(sess.id, "assistant", "Answer 1")
    m3 = await msg_repo.add_message(sess.id, "user", "Question 2 (Mistake)")
    m4 = await msg_repo.add_message(sess.id, "assistant", "Answer 2")

    assert (await session_repo.get_session(sess.id)).message_count == 4

    # Rewind to m2
    success = await session_repo.rewind_session(sess.id, to_message_id=m2.id)
    assert success is True

    # Active messages should now only be m1 and m2
    active_msgs = await msg_repo.get_messages(sess.id, include_inactive=False)
    assert len(active_msgs) == 2
    assert active_msgs[-1].id == m2.id

    # Session message count updated
    updated_sess = await session_repo.get_session(sess.id)
    assert updated_sess.message_count == 2

@pytest.mark.asyncio
async def test_checkpoint_lifecycle(db_manager):
    from sirona.database.checkpoints import CheckpointRepository
    session_repo = SessionRepository(db_manager)
    chk_repo = CheckpointRepository(db_manager)

    sess = await session_repo.create_session(title="Checkpoint Test")

    c1 = await chk_repo.create_checkpoint(
        session_id=sess.id,
        message_id=10,
        summary="Before file refactoring",
        state_data="refactoring_state_v1"
    )
    assert c1.id.startswith("chk_")
    assert c1.state_hash is not None
    assert c1.summary == "Before file refactoring"

    # Session updated with active checkpoint
    updated_sess = await session_repo.get_session(sess.id)
    assert updated_sess.checkpoint_id == c1.id

    # Retrieve checkpoints
    checkpoints = await chk_repo.get_checkpoints(sess.id)
    assert len(checkpoints) == 1
    assert checkpoints[0].id == c1.id

@pytest.mark.asyncio
async def test_desktop_settings_kv_store(db_manager):
    from sirona.database.settings import SettingsRepository
    settings_repo = SettingsRepository(db_manager)

    # Set primitive and dict settings
    await settings_repo.set_setting("theme", "parchment")
    await settings_repo.set_setting("window_bounds", {"width": 1360, "height": 860})
    await settings_repo.set_setting("recent_workspaces", ["/home/user/proj1", "/home/user/proj2"])

    # Retrieve
    assert await settings_repo.get_setting("theme") == "parchment"
    assert await settings_repo.get_setting("window_bounds") == {"width": 1360, "height": 860}
    assert await settings_repo.get_setting("recent_workspaces") == ["/home/user/proj1", "/home/user/proj2"]
    assert await settings_repo.get_setting("non_existent", "default_val") == "default_val"

    # Update on conflict
    await settings_repo.set_setting("theme", "obsidian")
    assert await settings_repo.get_setting("theme") == "obsidian"

    # List
    all_settings = await settings_repo.list_settings()
    assert "theme" in all_settings
    assert "window_bounds" in all_settings

    # Delete
    deleted = await settings_repo.delete_setting("theme")
    assert deleted is True
    assert await settings_repo.get_setting("theme") is None

@pytest.mark.asyncio
async def test_soft_delete_and_filtering(db_manager):
    session_repo = SessionRepository(db_manager)
    sess = await session_repo.create_session(title="Soft Delete Test")

    # Soft delete
    deleted = await session_repo.delete_session(sess.id, soft=True)
    assert deleted is True

    # Normal fetch returns None
    assert await session_repo.get_session(sess.id) is None

    # Fetch with include_deleted returns record
    soft_deleted = await session_repo.get_session(sess.id, include_deleted=True)
    assert soft_deleted is not None
    assert soft_deleted.deleted_at is not None

    # Normal list excludes soft deleted
    sessions, _ = await session_repo.list_sessions()
    assert not any(s.id == sess.id for s in sessions)

