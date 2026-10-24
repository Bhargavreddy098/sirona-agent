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
