import tempfile
from pathlib import Path
import pytest
from httpx import ASGITransport, AsyncClient
from sirona.database.connection import DatabaseManager
from sirona.database.migrations import init_db
from sirona.database.sessions import SessionRepository
from sirona.database.messages import MessageRepository
from sirona.main import create_app


@pytest.fixture
async def db_manager():
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "search_test.db"
        mgr = DatabaseManager(db_path=str(db_path))
        await init_db(mgr)
        yield mgr
        await mgr.close()


@pytest.mark.asyncio
async def test_fts_triggers_and_query(db_manager):
    sess_repo = SessionRepository(db_manager)
    msg_repo = MessageRepository(db_manager)

    sess = await sess_repo.create_session(title="FTS Test Session")

    # Add messages with specific searchable terms
    m1 = await msg_repo.add_message(
        session_id=sess.id,
        role="user",
        content="How do I configure Vite with Tailwind CSS and PostCSS?"
    )
    m2 = await msg_repo.add_message(
        session_id=sess.id,
        role="assistant",
        content="You can configure vite.config.ts with the @tailwindcss/vite plugin."
    )
    m3 = await msg_repo.add_message(
        session_id=sess.id,
        role="user",
        content="What about setting up SQLite WAL mode in Python asyncio?"
    )

    # Search for Tailwind
    res1 = await msg_repo.search_messages(query_text="Tailwind")
    assert len(res1) >= 2
    contents = [r.content for r in res1]
    assert any("Tailwind CSS" in c for c in contents)
    assert any("@tailwindcss/vite" in c for c in contents)
    assert any("<b>Tailwind</b>" in r.snippet or "Tailwind" in r.snippet for r in res1)

    # Search for SQLite
    res2 = await msg_repo.search_messages(query_text="SQLite")
    assert len(res2) == 1
    assert "WAL mode" in res2[0].content


@pytest.mark.asyncio
async def test_search_api_route():
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "api_search.db"
        app = create_app(db_path=str(db_path))
        await init_db(app.state.db_mgr)

        sess_repo = app.state.session_repo
        msg_repo = app.state.message_repo

        sess = await sess_repo.create_session(title="API Search Test")
        await msg_repo.add_message(
            session_id=sess.id,
            role="user",
            content="Deploying FastAPI with Uvicorn and Gunicorn workers"
        )
        await msg_repo.add_message(
            session_id=sess.id,
            role="assistant",
            content="Use uvicorn.workers.UvicornWorker with gunicorn -w 4"
        )

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/search", params={"q": "Gunicorn"})
            assert resp.status_code == 200
            data = resp.json()
            assert data["query"] == "Gunicorn"
            assert data["total"] >= 1
            assert any("Gunicorn" in r["content"] for r in data["results"])
