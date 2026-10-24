import pytest
import os
import tempfile
from fastapi.testclient import TestClient
from sirona.main import create_app
from sirona.config import SironaConfig, DatabaseConfig

@pytest.fixture
def client(tmp_path):
    db_file = tmp_path / "test_preview.db"
    cfg = SironaConfig(database=DatabaseConfig(path=str(db_file)))
    app = create_app(config=cfg, db_path=str(db_file))
    return TestClient(app)

def test_preview_health(client):
    res = client.get("/api/preview/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

def test_preview_render_html(client):
    html_content = "<html><body><h1>Sirona Preview</h1></body></html>"
    res = client.post("/api/preview/html", json={"html": html_content})
    assert res.status_code == 200
    assert "text/html" in res.headers["content-type"]
    assert "Sirona Preview" in res.text
    assert "Content-Security-Policy" in res.headers

def test_preview_file(client, tmp_path):
    test_html = tmp_path / "index.html"
    test_html.write_text("<!DOCTYPE html><html><body>Report</body></html>", encoding="utf-8")

    res = client.get(f"/api/preview/file?path={str(test_html)}")
    assert res.status_code == 200
    assert "text/html" in res.headers["content-type"]
    assert "Report" in res.text

    # Non-existent file
    res_404 = client.get(f"/api/preview/file?path={str(tmp_path / 'missing.html')}")
    assert res_404.status_code == 404
