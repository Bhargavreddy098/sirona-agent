import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from sirona.main import create_app
from sirona.config import SironaConfig, DatabaseConfig
from sirona.api.websocket.dispatcher import dispatch_rpc

@pytest.fixture
def client(tmp_path):
    db_file = tmp_path / "test_files.db"
    cfg = SironaConfig(database=DatabaseConfig(path=str(db_file)))
    app = create_app(config=cfg, db_path=str(db_file))
    return TestClient(app)

def test_file_tree_endpoint(client, tmp_path):
    (tmp_path / "sub").mkdir()
    (tmp_path / "sub" / "file1.py").write_text("print('hello')", encoding="utf-8")
    (tmp_path / ".git").mkdir()
    (tmp_path / ".git" / "HEAD").write_text("ref: refs/heads/master", encoding="utf-8")

    res = client.get(f"/api/files/tree?path={str(tmp_path)}&max_depth=3")
    assert res.status_code == 200
    data = res.json()
    assert "tree" in data
    names = [node["name"] for node in data["tree"]]
    assert "sub" in names
    # .git should be ignored by default
    assert ".git" not in names

def test_read_and_write_file(client, tmp_path):
    target = tmp_path / "docs" / "readme.md"

    # Write file
    write_res = client.post(
        "/api/files/write",
        json={"path": str(target), "content": "# Sirona Docs\nLine 2"}
    )
    assert write_res.status_code == 200
    assert write_res.json()["success"] is True

    # Read file
    read_res = client.get(f"/api/files/read?path={str(target)}")
    assert read_res.status_code == 200
    read_data = read_res.json()
    assert read_data["name"] == "readme.md"
    assert read_data["total_lines"] == 2
    assert read_data["language"] == "markdown"
    assert "# Sirona Docs" in read_data["content"]

def test_search_files(client, tmp_path):
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "agent.ts").write_text("export const agent = 1;", encoding="utf-8")
    (tmp_path / "src" / "server.ts").write_text("export const server = 2;", encoding="utf-8")

    res = client.get(f"/api/files/search?query=agent&path={str(tmp_path)}")
    assert res.status_code == 200
    matches = res.json()["matches"]
    assert len(matches) == 1
    assert matches[0]["name"] == "agent.ts"
    assert matches[0]["language"] == "typescript"

@pytest.mark.asyncio
async def test_rpc_file_operations(tmp_path):
    class DummyState:
        pass
    state = DummyState()

    target = tmp_path / "test.txt"
    # RPC write
    write_res = await dispatch_rpc(
        "files.write",
        {"path": str(target), "content": "RPC File Content"},
        state
    )
    assert write_res["success"] is True

    # RPC read
    read_res = await dispatch_rpc(
        "files.read",
        {"path": str(target)},
        state
    )
    assert read_res["name"] == "test.txt"
    assert "RPC File Content" in read_res["content"]
