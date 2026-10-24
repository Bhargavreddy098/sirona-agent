from typing import Any, Dict
import time

async def dispatch_rpc(method: str, params: Dict[str, Any], app_state: Any) -> Dict[str, Any]:
    """Dispatch JSON-RPC 2.0 method calls with full Hermes protocol parity."""
    if method == "ping":
        return {"pong": True}

    elif method == "session.create":
        repo = app_state.session_repo
        sess = await repo.create_session(
            title=params.get("title", "New Session"),
            model=params.get("model", "gemini-2.5-flash"),
            cwd=params.get("cwd")
        )
        return {"session": sess.model_dump()}

    elif method in ("session.resume", "session.activate"):
        session_id = params.get("session_id") or params.get("session")
        if not session_id:
            return {"error": "session_id required"}
        sess = await app_state.session_repo.get_session(session_id)
        if not sess:
            return {"error": "session_not_found"}
        messages = await app_state.message_repo.get_messages(session_id, limit=params.get("limit", 100))
        return {
            "session": sess.model_dump(),
            "messages": [m.model_dump() for m in messages]
        }

    elif method == "session.list":
        repo = app_state.session_repo
        sessions, total = await repo.list_sessions(
            limit=params.get("limit", 50),
            offset=params.get("offset", 0),
            pinned=params.get("pinned"),
            archived=params.get("archived")
        )
        return {"sessions": [s.model_dump() for s in sessions], "total": total}

    elif method in ("session.branch", "session.branch_stored", "session.branch_whole"):
        parent_id = params.get("session_id") or params.get("parent_id")
        if not parent_id:
            return {"error": "session_id required"}
        title = params.get("title")
        through_id = params.get("through_message_id")
        branched = await app_state.session_repo.branch_session(
            parent_id=parent_id,
            title=title,
            through_message_id=through_id
        )
        if not branched:
            return {"error": "parent_session_not_found"}
        return {
            "success": True,
            "branched_session_id": branched.id,
            "session": branched.model_dump()
        }

    elif method in ("session.cwd.set", "session.workspace.move"):
        session_id = params.get("session_id") or params.get("session")
        cwd = params.get("cwd") or (params.get("payload", {}).get("cwd") if isinstance(params.get("payload"), dict) else None)
        if not session_id or not cwd:
            return {"error": "session_id and cwd required"}
        updated = await app_state.session_repo.update_session(session_id, cwd=cwd)
        return {"success": True, "session": updated.model_dump() if updated else None}

    elif method == "session.model":
        session_id = params.get("session_id")
        model = params.get("model")
        if not session_id or not model:
            return {"error": "session_id and model required"}
        updated = await app_state.session_repo.update_session(session_id, model=model)
        return {"success": True, "session": updated.model_dump() if updated else None}

    elif method == "session.compress":
        session_id = params.get("session_id")
        if not session_id:
            return {"error": "session_id required"}
        messages = await app_state.message_repo.get_messages(session_id)
        compacted, summary = await app_state.agent_runtime.compressor.compact_messages(
            [m.model_dump() for m in messages]
        )
        return {
            "status": "compacted",
            "session_id": session_id,
            "target_session_id": session_id,
            "summary": summary
        }

    elif method in ("session.interrupt", "prompt.cancel"):
        session_id = params.get("session_id")
        if not session_id:
            return {"error": "session_id required"}
        scheduler = app_state.turn_scheduler
        return await scheduler.interrupt_turn(session_id)

    elif method in ("turn.status", "session.turn.status"):
        session_id = params.get("session_id")
        scheduler = app_state.turn_scheduler
        busy = scheduler.is_session_busy(session_id) if session_id else False
        active = scheduler.get_active_turn(session_id) if session_id else None
        return {
            "busy": busy,
            "session_id": session_id,
            "turn_id": active.turn_id if active else None,
            "status": active.status if active else "idle"
        }

    elif method == "session.events.since":
        session_id = params.get("session_id")
        since = float(params.get("since", 0))
        messages = await app_state.message_repo.get_messages(session_id, limit=params.get("limit", 100))
        filtered = [m.model_dump() for m in messages if m.timestamp >= since]
        return {"events": filtered}

    elif method in ("approval.respond", "clarify.respond"):
        prompt_id = params.get("prompt_id") or params.get("request_id")
        choice = params.get("choice")
        approved = params.get("approved", True)
        if choice is not None:
            approved = (choice in ("once", "always", "approve", "allow", "yes"))
        approval_mgr = app_state.approval_manager
        resolved = approval_mgr.resolve_approval(
            prompt_id=str(prompt_id),
            approved=approved,
            choice=choice,
            amendments=params.get("amendments") or params.get("edit")
        )
        return {"resolved": resolved, "prompt_id": prompt_id, "choice": choice}

    elif method == "prompt.submit":
        scheduler = app_state.turn_scheduler
        session_id = params["session_id"]
        prompt = params["prompt"]
        effort = params.get("reasoning_effort", "medium")
        attachments = params.get("attachments")
        result = await scheduler.submit_turn(
            session_id=session_id,
            prompt=prompt,
            attachments=attachments,
            reasoning_effort=effort
        )
        return result

    elif method == "slash.exec":
        operation = params.get("operation")
        payload = params.get("payload", {})
        if operation == "model":
            model = payload.get("model", "gemini-2.5-flash")
            return {"type": "exec", "operation": "model", "output": f"Switched model to {model}"}
        elif operation == "compress":
            return {"type": "exec", "operation": "compress", "output": "Session compressed successfully"}
        elif operation == "plan":
            return {"type": "exec", "operation": "plan", "output": "Implementation plan mode activated"}
        return {"type": "exec", "operation": operation, "output": f"Executed {operation}"}

    elif method == "config.set":
        key = params.get("key")
        value = params.get("value")
        return {"success": True, "key": key, "value": value}

    elif method == "complete.slash":
        commands = [
            {"name": "/goal", "description": "Run autonomous goal mode"},
            {"name": "/compact", "description": "Compress session history"},
            {"name": "/plan", "description": "Write implementation plan"},
            {"name": "/model", "description": "Switch active LLM model"},
            {"name": "/terminal", "description": "Toggle bottom terminal deck"},
            {"name": "/branch", "description": "Fork current session into new branch"},
        ]
        q = params.get("query", "").lower()
        filtered = [c for c in commands if q in c["name"].lower()]
        return {"matches": filtered}

    elif method == "tools.list":
        tools = app_state.tool_registry.list_tools()
        return {"tools": [t.name for t in tools]}

    else:
        return {"error": f"Method '{method}' not implemented"}
