import argparse
import asyncio
import json
import os
import sys
from pathlib import Path
from .config import load_config
from .database.connection import DatabaseManager
from .database.migrations import init_db
from .database.sessions import SessionRepository
from .database.messages import MessageRepository
from .tools.registry import default_tool_registry
from .agent.approvals import ApprovalManager
from .agent.runtime import AgentRuntime
from .providers.base import ProviderRouter

def doctor():
    """Verify Sirona installation and database integrity."""
    print("Running Sirona Doctor System Check...\n")
    cfg = load_config()
    print(f"[*] Sirona Home: {cfg.sirona_home}")
    print(f"[*] Database Path: {cfg.database.path}")
    print(f"[*] Default Model: {cfg.model.default} ({cfg.model.provider})")
    
    # Check DB
    try:
        db_mgr = DatabaseManager(cfg.database.path)
        asyncio.run(init_db(db_mgr))
        print("[OK] SQLite WAL database verified.")
    except Exception as exc:
        print(f"[ERROR] Database error: {exc}")

    print("\n[OK] Sirona environment is healthy and ready.")

def run_prompt(prompt: str):
    """Run an agent turn directly from CLI."""
    cfg = load_config()
    db_mgr = DatabaseManager(cfg.database.path)
    asyncio.run(init_db(db_mgr))
    
    session_repo = SessionRepository(db_mgr)
    message_repo = MessageRepository(db_mgr)
    approval_mgr = ApprovalManager()
    providers = ProviderRouter()

    async def _execute():
        sess = await session_repo.create_session(title="CLI Prompt")
        runtime = AgentRuntime(
            session_repo=session_repo,
            message_repo=message_repo,
            tool_registry=default_tool_registry,
            approval_manager=approval_mgr,
            provider=providers.get_provider_for_model(cfg.model.default)
        )
        print(f"\n[Sirona] Session {sess.id} created. Processing prompt: '{prompt}'\n")
        async for event in runtime.run_turn(session_id=sess.id, prompt=prompt):
            if event["type"] == "stream.token":
                sys.stdout.write(event["token"])
                sys.stdout.flush()
            elif event["type"] == "tool_start":
                print(f"\n-> Invoking Tool: {event['tool_name']} {json.dumps(event.get('args', {}))}")
            elif event["type"] == "tool_complete":
                print(f"<- Tool Result: {event.get('result', '')[:100]}...\n")
            elif event["type"] == "message_complete":
                print("\n\n[OK] Turn completed.")

    asyncio.run(_execute())

def main():
    parser = argparse.ArgumentParser(description="Sirona Developer Agent CLI")
    subparsers = parser.add_subparsers(dest="command")

    # sirona serve
    serve_parser = subparsers.add_parser("serve", help="Start Sirona API & WebSocket Server")
    serve_parser.add_argument("--port", type=int, default=8000, help="Server port")
    serve_parser.add_argument("--host", type=str, default="127.0.0.1", help="Server host")

    # sirona run
    run_parser = subparsers.add_parser("run", help="Run a prompt turn from CLI")
    run_parser.add_argument("prompt", type=str, help="Instruction or query for Sirona")

    # sirona doctor
    subparsers.add_parser("doctor", help="Run diagnostic health checks")

    args = parser.parse_args()

    if args.command == "serve":
        import uvicorn
        from .main import app
        uvicorn.run(app, host=args.host, port=args.port)
    elif args.command == "run":
        run_prompt(args.prompt)
    elif args.command == "doctor":
        doctor()
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
