import pytest
import httpx
from sirona.main import create_app
from sirona.database.connection import DatabaseManager
from sirona.database.migrations import init_db

@pytest.fixture
async def app_client(tmp_path):
    db_path = str(tmp_path / "api_test.db")
    app = create_app(db_path=db_path)
    # Initialize schema
    db_mgr = app.state.db_mgr
    await init_db(db_mgr)
    
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client
    await db_mgr.close()

@pytest.mark.asyncio
async def test_health_routes(app_client):
    res = await app_client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"
    assert res.json()["service"] == "sirona"

    res_detailed = await app_client.get("/health/detailed")
    assert res_detailed.status_code == 200
    assert res_detailed.json()["db"] is True

@pytest.mark.asyncio
async def test_models_and_capabilities(app_client):
    res_models = await app_client.get("/v1/models")
    assert res_models.status_code == 200
    data = res_models.json()
    assert "data" in data
    assert any("gemini" in m["id"] for m in data["data"])

    res_cap = await app_client.get("/v1/capabilities")
    assert res_cap.status_code == 200
    assert res_cap.json()["terminal"] is True

@pytest.mark.asyncio
async def test_session_api_crud(app_client):
    # Create session
    create_res = await app_client.post("/api/sessions", json={"title": "API Test Session"})
    assert create_res.status_code == 200
    sess = create_res.json()["session"]
    sess_id = sess["id"]
    assert sess["title"] == "API Test Session"

    # List sessions
    list_res = await app_client.get("/api/sessions")
    assert list_res.status_code == 200
    assert list_res.json()["total"] >= 1

    # Get session
    get_res = await app_client.get(f"/api/sessions/{sess_id}")
    assert get_res.status_code == 200
    assert get_res.json()["session"]["id"] == sess_id

    # Patch session
    patch_res = await app_client.patch(f"/api/sessions/{sess_id}", json={"pinned": True})
    assert patch_res.status_code == 200
    assert patch_res.json()["session"]["pinned"] == 1

    # Chat in session
    chat_res = await app_client.post(f"/api/sessions/{sess_id}/chat", json={"prompt": "Hello Sirona"})
    assert chat_res.status_code == 200
    assert "response" in chat_res.json()
