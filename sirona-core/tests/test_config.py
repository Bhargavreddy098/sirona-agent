import pytest
from fastapi.testclient import TestClient
from sirona.main import create_app
from sirona.config import SironaConfig, DatabaseConfig

@pytest.fixture
def client(tmp_path):
    db_file = tmp_path / "test_config.db"
    cfg = SironaConfig(database=DatabaseConfig(path=str(db_file)))
    app = create_app(config=cfg, db_path=str(db_file))
    return TestClient(app)

def test_get_all_settings_defaults(client):
    res = client.get("/api/settings")
    assert res.status_code == 200
    data = res.json()
    assert "settings" in data
    settings = data["settings"]
    assert settings["theme"] == "light"
    assert settings["interface_mode"] == "studio"
    assert settings["default_model"] == "gemini-2.5-flash"
    assert settings["default_reasoning_effort"] == "medium"
    assert settings["stream_tokens"] is True

def test_save_and_retrieve_settings(client):
    # Save batch settings
    post_res = client.post("/api/settings", json={
        "settings": {
            "theme": "dark",
            "default_model": "gpt-4o",
            "openai_api_key": "sk-1234567890abcdef1234567890abcdef"
        }
    })
    assert post_res.status_code == 200
    assert post_res.json()["success"] is True

    # Retrieve all
    get_res = client.get("/api/settings")
    assert get_res.status_code == 200
    settings = get_res.json()["settings"]
    assert settings["theme"] == "dark"
    assert settings["default_model"] == "gpt-4o"
    assert settings["openai_api_key"] == "sk-1234567890abcdef1234567890abcdef"

    # Retrieve single
    single_res = client.get("/api/settings/theme")
    assert single_res.status_code == 200
    assert single_res.json()["value"] == "dark"

def test_save_single_and_delete_setting(client):
    # Save single
    save_res = client.post("/api/settings/single", json={
        "key": "custom_option",
        "value": {"nested": True}
    })
    assert save_res.status_code == 200
    assert save_res.json()["success"] is True

    # Check it exists
    check_res = client.get("/api/settings/custom_option")
    assert check_res.status_code == 200
    assert check_res.json()["value"] == {"nested": True}

    # Delete
    del_res = client.delete("/api/settings/custom_option")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

def test_provider_testing_endpoint(client):
    # Gemini valid
    gemini_res = client.post("/api/providers/test", json={
        "provider": "gemini",
        "api_key": "AIzaSyD-123456789012345678901234567890"
    })
    assert gemini_res.status_code == 200
    assert gemini_res.json()["valid"] is True

    # Gemini invalid format (too short)
    gemini_bad = client.post("/api/providers/test", json={
        "provider": "gemini",
        "api_key": "short"
    })
    assert gemini_bad.status_code == 200
    assert gemini_bad.json()["valid"] is False

    # OpenAI valid
    openai_res = client.post("/api/providers/test", json={
        "provider": "openai",
        "api_key": "sk-12345678901234567890123456789012345678"
    })
    assert openai_res.status_code == 200
    assert openai_res.json()["valid"] is True

    # Ollama valid
    ollama_res = client.post("/api/providers/test", json={
        "provider": "ollama",
        "base_url": "http://localhost:11434"
    })
    assert ollama_res.status_code == 200
    assert ollama_res.json()["valid"] is True

@pytest.mark.asyncio
async def test_rpc_settings_dispatch(tmp_path):
    from sirona.api.websocket.dispatcher import dispatch_rpc
    from sirona.database.connection import DatabaseManager
    from sirona.database.settings import SettingsRepository

    db_path = str(tmp_path / "rpc_settings.db")
    db_mgr = DatabaseManager(db_path=db_path)
    async with db_mgr.acquire() as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS desktop_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at REAL NOT NULL
            )
        """)
        await db.commit()

    class State:
        settings_repo = SettingsRepository(db_mgr)

    state = State()

    # RPC set
    set_res = await dispatch_rpc("settings.set", {"key": "font_size", "value": 14}, state)
    assert set_res["success"] is True

    # RPC get
    get_res = await dispatch_rpc("settings.get", {"key": "font_size"}, state)
    assert get_res["value"] == 14
