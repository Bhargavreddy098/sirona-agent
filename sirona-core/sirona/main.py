import time
from typing import Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import load_config, SironaConfig
from .database.connection import DatabaseManager
from .database.migrations import init_db
from .database.sessions import SessionRepository
from .database.messages import MessageRepository
from .database.projects import ProjectRepository
from .tools.registry import default_tool_registry
from .tools.filesystem import read_file, write_file, edit_file, list_dir
from .tools.terminal import run_shell
from .tools.python_repl import execute_python
from .tools.git import git_status, git_diff, git_log
from .tools.web import web_scrape, web_search
from .agent.approvals import ApprovalManager
from .agent.runtime import AgentRuntime
from .skills.manager import SkillsManager
from .mcp.manager import McpManager
from .terminal.manager import TerminalManager
from .providers.base import ProviderRouter
from .api.router import api_router
from .api.websocket.gateway import ws_router

def create_app(config: Optional[SironaConfig] = None, db_path: Optional[str] = None) -> FastAPI:
    cfg = config or load_config()
    actual_db_path = db_path or cfg.database.path
    
    app = FastAPI(
        title="Sirona Autonomous Developer Agent",
        description="Core API and WebSocket Gateway for Sirona Developer Agent",
        version="0.1.0"
    )

    # CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # State dependencies
    db_mgr = DatabaseManager(db_path=actual_db_path)
    session_repo = SessionRepository(db_mgr)
    message_repo = MessageRepository(db_mgr)
    project_repo = ProjectRepository(db_mgr)
    approval_mgr = ApprovalManager()
    skills_mgr = SkillsManager()
    terminal_mgr = TerminalManager()
    
    # Register core tools into default_tool_registry
    tool_reg = default_tool_registry
    tool_reg.register("read_file", danger_level="safe")(read_file)
    tool_reg.register("write_file", danger_level="requires_approval")(write_file)
    tool_reg.register("edit_file", danger_level="requires_approval")(edit_file)
    tool_reg.register("list_dir", danger_level="safe")(list_dir)
    tool_reg.register("run_shell", danger_level="requires_approval")(run_shell)
    tool_reg.register("execute_python", danger_level="requires_approval")(execute_python)
    tool_reg.register("git_status", danger_level="safe")(git_status)
    tool_reg.register("git_diff", danger_level="safe")(git_diff)
    tool_reg.register("git_log", danger_level="safe")(git_log)
    tool_reg.register("web_scrape", danger_level="safe")(web_scrape)
    tool_reg.register("web_search", danger_level="safe")(web_search)

    mcp_mgr = McpManager(tool_registry=tool_reg)
    provider_router = ProviderRouter()
    agent_runtime = AgentRuntime(
        session_repo=session_repo,
        message_repo=message_repo,
        tool_registry=tool_reg,
        approval_manager=approval_mgr,
        provider=provider_router.gemini
    )

    # Attach to app.state
    app.state.config = cfg
    app.state.db_mgr = db_mgr
    app.state.session_repo = session_repo
    app.state.message_repo = message_repo
    app.state.project_repo = project_repo
    app.state.approval_manager = approval_mgr
    app.state.skills_manager = skills_mgr
    app.state.terminal_manager = terminal_mgr
    app.state.tool_registry = tool_reg
    app.state.mcp_manager = mcp_mgr
    app.state.agent_runtime = agent_runtime
    app.state.started_at = time.time()

    # Mount routers
    app.include_router(api_router)
    app.include_router(ws_router)

    return app

app = create_app()

def main():
    import uvicorn
    cfg = load_config()
    uvicorn.run("sirona.main:app", host=cfg.server.host, port=cfg.server.port, reload=True)

if __name__ == "__main__":
    main()
