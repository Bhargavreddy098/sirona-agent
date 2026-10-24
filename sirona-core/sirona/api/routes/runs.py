import uuid
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

router = APIRouter(tags=["Runs"])

class CreateRunRequest(BaseModel):
    session_id: str
    prompt: str
    reasoning_effort: Optional[str] = "medium"

class ApprovalRespondRequest(BaseModel):
    prompt_id: str
    approved: bool
    amendments: Optional[Dict[str, Any]] = None

class ClarifyRespondRequest(BaseModel):
    prompt_id: str
    selected_options: List[str]
    text: Optional[str] = None

class SteerRunRequest(BaseModel):
    instruction: str

@router.post("/v1/runs")
async def create_run(request: Request, body: CreateRunRequest):
    scheduler = request.app.state.turn_scheduler
    res = await scheduler.submit_turn(
        session_id=body.session_id,
        prompt=body.prompt,
        reasoning_effort=body.reasoning_effort or "medium"
    )
    return {
        "run_id": res["turn_id"],
        "session_id": body.session_id,
        "status": "queued" if res.get("queued") else "running"
    }

@router.get("/v1/runs/{run_id}")
async def get_run(run_id: str):
    return {
        "run_id": run_id,
        "status": "completed",
        "turn_count": 1,
        "usage": {"input_tokens": 120, "output_tokens": 45}
    }

@router.post("/v1/runs/{run_id}/approval")
async def respond_run_approval(request: Request, run_id: str, body: ApprovalRespondRequest):
    approval_mgr = request.app.state.approval_manager
    resolved = approval_mgr.resolve_approval(
        prompt_id=body.prompt_id,
        approved=body.approved,
        amendments=body.amendments
    )
    if not resolved:
        raise HTTPException(status_code=404, detail="Pending approval not found or expired")
    return {"success": True, "run_id": run_id, "prompt_id": body.prompt_id}

@router.post("/v1/runs/{run_id}/clarify")
async def respond_run_clarify(request: Request, run_id: str, body: ClarifyRespondRequest):
    approval_mgr = request.app.state.approval_manager
    resolved = approval_mgr.resolve_approval(
        prompt_id=body.prompt_id,
        approved=True,
        amendments={"selection": body.selected_options, "text": body.text}
    )
    if not resolved:
        raise HTTPException(status_code=404, detail="Pending clarification not found or expired")
    return {"success": True, "run_id": run_id, "prompt_id": body.prompt_id}

@router.post("/v1/runs/{run_id}/steer")
async def steer_run(run_id: str, body: SteerRunRequest):
    return {"success": True, "run_id": run_id, "instruction": body.instruction}

@router.post("/v1/runs/{run_id}/stop")
async def stop_run(request: Request, run_id: str):
    scheduler = request.app.state.turn_scheduler
    # If run_id is a session_id or matches an active turn
    session_id = run_id
    for sid, active in list(scheduler.active_turns.items()):
        if active.turn_id == run_id:
            session_id = sid
            break
    res = await scheduler.interrupt_turn(session_id)
    return {"success": True, "run_id": run_id, "status": "stopped", "details": res}
