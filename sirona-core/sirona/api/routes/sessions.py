from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from ...database.sessions import SessionRecord
from ...database.messages import MessageRecord

router = APIRouter(tags=["Sessions"])

class CreateSessionRequest(BaseModel):
    title: Optional[str] = "New Session"
    model: Optional[str] = "gemini-2.5-flash"
    cwd: Optional[str] = None
    system_prompt: Optional[str] = None

class UpdateSessionRequest(BaseModel):
    title: Optional[str] = None
    pinned: Optional[bool] = None
    archived: Optional[bool] = None
    model: Optional[str] = None
    cwd: Optional[str] = None

class ChatPromptRequest(BaseModel):
    prompt: str
    attachments: Optional[List[Dict[str, Any]]] = None
    reasoning_effort: Optional[str] = "medium"

@router.get("/api/sessions")
async def list_sessions(
    request: Request,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    pinned: Optional[bool] = None,
    archived: Optional[bool] = None
):
    repo = request.app.state.session_repo
    sessions, total = await repo.list_sessions(limit=limit, offset=offset, pinned=pinned, archived=archived)
    return {"sessions": sessions, "total": total}

@router.post("/api/sessions")
async def create_session(request: Request, body: CreateSessionRequest):
    repo = request.app.state.session_repo
    sess = await repo.create_session(
        title=body.title or "New Session",
        model=body.model or "gemini-2.5-flash",
        cwd=body.cwd,
        system_prompt=body.system_prompt
    )
    return {"session": sess}

@router.get("/api/sessions/{session_id}")
async def get_session(request: Request, session_id: str):
    repo = request.app.state.session_repo
    sess = await repo.get_session(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"session": sess}

@router.patch("/api/sessions/{session_id}")
async def patch_session(request: Request, session_id: str, body: UpdateSessionRequest):
    repo = request.app.state.session_repo
    sess = await repo.update_session(
        session_id=session_id,
        title=body.title,
        pinned=body.pinned,
        archived=body.archived,
        model=body.model,
        cwd=body.cwd
    )
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"session": sess}

@router.delete("/api/sessions/{session_id}")
async def delete_session(request: Request, session_id: str):
    repo = request.app.state.session_repo
    deleted = await repo.delete_session(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"success": True, "session_id": session_id}

@router.get("/api/sessions/{session_id}/messages")
async def get_session_messages(
    request: Request,
    session_id: str,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    order: str = Query("oldest"),
    include_compacted: bool = Query(False)
):
    repo = request.app.state.message_repo
    messages = await repo.get_messages(
        session_id=session_id,
        limit=limit,
        offset=offset,
        order=order,
        include_compacted=include_compacted
    )
    return {"messages": messages, "total": len(messages)}

@router.post("/api/sessions/{session_id}/fork")
async def fork_session(request: Request, session_id: str, message_id: int):
    session_repo = request.app.state.session_repo
    msg_repo = request.app.state.message_repo
    
    orig = await session_repo.get_session(session_id)
    if not orig:
        raise HTTPException(status_code=404, detail="Source session not found")

    new_sess = await session_repo.create_session(
        title=f"Fork of {orig.title}",
        model=orig.model,
        cwd=orig.cwd,
        parent_session_id=orig.id
    )

    # Copy messages up to message_id
    msgs = await msg_repo.get_messages(session_id, limit=500, order="oldest")
    for m in msgs:
        if m.id and m.id <= message_id:
            await msg_repo.add_message(
                session_id=new_sess.id,
                role=m.role,
                content=m.content,
                tool_call_id=m.tool_call_id,
                tool_name=m.tool_name,
                reasoning=m.reasoning
            )

    return {"new_session_id": new_sess.id, "forked_from": session_id}

@router.post("/api/sessions/{session_id}/chat")
async def chat_session(request: Request, session_id: str, body: ChatPromptRequest):
    from ..websocket.events import broadcaster
    runtime = request.app.state.agent_runtime
    final_response = ""
    tool_calls = []

    async for event in runtime.run_turn(
        session_id=session_id,
        prompt=body.prompt,
        attachments=body.attachments,
        reasoning_effort=body.reasoning_effort or "medium"
    ):
        await broadcaster.broadcast(event.get("type", "stream.event"), event)
        if event["type"] == "stream.token":
            final_response += event.get("token", "")
        elif event["type"] == "tool_complete":
            tool_calls.append(event)
        elif event["type"] == "message_complete":
            final_response = event.get("content", final_response)

    return {
        "success": True,
        "session_id": session_id,
        "response": final_response,
        "tool_calls": tool_calls
    }
