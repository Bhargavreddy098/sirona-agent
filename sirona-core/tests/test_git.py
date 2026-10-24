import pytest
from fastapi.testclient import TestClient
from sirona.main import app
from sirona.api.routes.git import (
    parse_git_status_porcelain,
    parse_worktrees_porcelain,
)

@pytest.fixture
def client():
    return TestClient(app)


def test_parse_git_status_clean():
    sample = "## master\n"
    res = parse_git_status_porcelain(sample)
    assert res["is_repo"] is True
    assert res["branch"] == "master"
    assert res["ahead"] == 0
    assert res["behind"] == 0
    assert res["is_clean"] is True
    assert len(res["staged"]) == 0
    assert len(res["unstaged"]) == 0
    assert len(res["untracked"]) == 0
    assert res["total_changed"] == 0


def test_parse_git_status_ahead_behind_and_changes():
    sample = """## feature/branch...origin/feature/branch [ahead 3, behind 1]
M  sirona/database/migrations.py
 M sirona-ui/src/App.tsx
MM both_staged_and_unstaged.txt
A  new_feature.py
 D old_file.py
?? untracked_file.md
"""
    res = parse_git_status_porcelain(sample)
    assert res["is_repo"] is True
    assert res["branch"] == "feature/branch"
    assert res["ahead"] == 3
    assert res["behind"] == 1
    assert res["is_clean"] is False

    staged_paths = [s["path"] for s in res["staged"]]
    assert "sirona/database/migrations.py" in staged_paths
    assert "both_staged_and_unstaged.txt" in staged_paths
    assert "new_feature.py" in staged_paths

    unstaged_paths = [u["path"] for u in res["unstaged"]]
    assert "sirona-ui/src/App.tsx" in unstaged_paths
    assert "both_staged_and_unstaged.txt" in unstaged_paths
    assert "old_file.py" in unstaged_paths

    assert "untracked_file.md" in res["untracked"]
    assert res["total_changed"] == len(res["staged"]) + len(res["unstaged"]) + len(res["untracked"])


def test_parse_worktrees_porcelain():
    sample = """worktree C:/projects/main-repo
HEAD 1234567890abcdef
branch refs/heads/master

worktree C:/projects/worktree-feature
HEAD fedcba0987654321
branch refs/heads/feature-x
locked

worktree C:/projects/worktree-detached
HEAD 9999888877776666
detached
"""
    trees = parse_worktrees_porcelain(sample)
    assert len(trees) == 3

    assert trees[0]["path"] == "C:/projects/main-repo"
    assert trees[0]["branch"] == "master"
    assert trees[0]["is_main"] is True
    assert trees[0]["locked"] is False

    assert trees[1]["path"] == "C:/projects/worktree-feature"
    assert trees[1]["branch"] == "feature-x"
    assert trees[1]["is_main"] is False
    assert trees[1]["locked"] is True

    assert trees[2]["path"] == "C:/projects/worktree-detached"
    assert trees[2]["detached"] is True


def test_git_api_endpoints(client):
    # Test real git status for the current repo
    status_resp = client.get("/api/git/status")
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert "is_repo" in status_data
    assert "branch" in status_data

    # Test branches endpoint
    branches_resp = client.get("/api/git/branches")
    assert branches_resp.status_code == 200
    branches_data = branches_resp.json()
    assert "branches" in branches_data

    # Test worktrees endpoint
    wt_resp = client.get("/api/git/worktrees")
    assert wt_resp.status_code == 200
    wt_data = wt_resp.json()
    assert "worktrees" in wt_data
    assert len(wt_data["worktrees"]) >= 1

    # Test diff endpoint
    diff_resp = client.get("/api/git/diff")
    assert diff_resp.status_code == 200
    diff_data = diff_resp.json()
    assert "diff" in diff_data


@pytest.mark.asyncio
async def test_git_rpc_dispatch():
    from sirona.api.websocket.dispatcher import dispatch_rpc

    class DummyState:
        pass
    state = DummyState()

    # Test git.status via RPC
    res = await dispatch_rpc("git.status", {}, state)
    assert "branch" in res
    assert "is_clean" in res

    # Test git.branches via RPC
    branches_res = await dispatch_rpc("git.branches", {}, state)
    assert "branches" in branches_res
