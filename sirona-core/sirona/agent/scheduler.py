import asyncio
import time
import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from .runtime import AgentRuntime
from .approvals import ApprovalManager
from .clarify import ClarifyManager

class TurnJob(BaseModel):
    turn_id: str
    session_id: str
    prompt: str
    attachments: Optional[List[Dict[str, Any]]] = None
    reasoning_effort: str = "medium"
    created_at: float

class ActiveTurn:
    def __init__(
        self,
        turn_id: str,
        session_id: str,
        task: asyncio.Task,
        cancel_event: asyncio.Event,
        started_at: float
    ):
        self.turn_id = turn_id
        self.session_id = session_id
        self.task = task
        self.cancel_event = cancel_event
        self.started_at = started_at
        self.status = "running"

class TurnScheduler:
    def __init__(
        self,
        runtime: AgentRuntime,
        approval_manager: ApprovalManager,
        clarify_manager: Optional[ClarifyManager] = None
    ):
        self.runtime = runtime
        self.approval_manager = approval_manager
        self.clarify_manager = clarify_manager
        self.active_turns: Dict[str, ActiveTurn] = {}
        self.queued_turns: Dict[str, List[TurnJob]] = {}

    def is_session_busy(self, session_id: str) -> bool:
        active = self.active_turns.get(session_id)
        return active is not None and active.status == "running"

    def get_active_turn(self, session_id: str) -> Optional[ActiveTurn]:
        return self.active_turns.get(session_id)

    async def submit_turn(
        self,
        session_id: str,
        prompt: str,
        attachments: Optional[List[Dict[str, Any]]] = None,
        reasoning_effort: str = "medium"
    ) -> Dict[str, Any]:
        turn_id = f"turn_{uuid.uuid4().hex[:10]}"
        job = TurnJob(
            turn_id=turn_id,
            session_id=session_id,
            prompt=prompt,
            attachments=attachments,
            reasoning_effort=reasoning_effort,
            created_at=time.time()
        )

        if self.is_session_busy(session_id):
            if session_id not in self.queued_turns:
                self.queued_turns[session_id] = []
            self.queued_turns[session_id].append(job)
            return {
                "accepted": True,
                "turn_id": turn_id,
                "session_id": session_id,
                "queued": True,
                "queue_position": len(self.queued_turns[session_id]),
            }

        cancel_event = asyncio.Event()
        task = asyncio.create_task(self._drive_turn(job, cancel_event))
        active = ActiveTurn(
            turn_id=turn_id,
            session_id=session_id,
            task=task,
            cancel_event=cancel_event,
            started_at=time.time()
        )
        self.active_turns[session_id] = active

        return {
            "accepted": True,
            "turn_id": turn_id,
            "session_id": session_id,
            "queued": False,
        }

    async def interrupt_turn(self, session_id: str) -> Dict[str, Any]:
        active = self.active_turns.get(session_id)
        if not active:
            return {
                "interrupted": False,
                "session_id": session_id,
                "message": "No active turn to interrupt"
            }

        active.status = "interrupted"
        active.cancel_event.set()
        if not active.task.done():
            active.task.cancel()

        self.approval_manager.cancel_pending_for_session(session_id)
        if self.clarify_manager:
            self.clarify_manager.cancel_pending_for_session(session_id)
        self.active_turns.pop(session_id, None)

        # Clear queue for this session upon explicit interrupt
        self.queued_turns.pop(session_id, None)

        from ..api.websocket.events import broadcaster
        await broadcaster.broadcast("turn.interrupted", {
            "type": "turn.interrupted",
            "session_id": session_id,
            "turn_id": active.turn_id
        })

        return {
            "interrupted": True,
            "session_id": session_id,
            "turn_id": active.turn_id
        }

    async def _drive_turn(self, job: TurnJob, cancel_event: asyncio.Event) -> None:
        from ..api.websocket.events import broadcaster
        session_id = job.session_id

        try:
            async for event in self.runtime.run_turn(
                session_id=session_id,
                prompt=job.prompt,
                attachments=job.attachments,
                reasoning_effort=job.reasoning_effort,
                cancel_token=cancel_event,
                turn_id=job.turn_id
            ):
                if cancel_event.is_set():
                    break
                await broadcaster.broadcast(event.get("type", "stream.event"), event)
        except asyncio.CancelledError:
            await broadcaster.broadcast("turn.interrupted", {
                "type": "turn.interrupted",
                "session_id": session_id,
                "turn_id": job.turn_id
            })
        except Exception as exc:
            await broadcaster.broadcast("turn.error", {
                "type": "turn.error",
                "session_id": session_id,
                "turn_id": job.turn_id,
                "error": str(exc)
            })
        finally:
            active = self.active_turns.get(session_id)
            if active and active.turn_id == job.turn_id:
                self.active_turns.pop(session_id, None)

            # Check if there are queued turns for this session
            queue = self.queued_turns.get(session_id)
            if queue and len(queue) > 0 and not cancel_event.is_set():
                next_job = queue.pop(0)
                next_cancel_event = asyncio.Event()
                next_task = asyncio.create_task(self._drive_turn(next_job, next_cancel_event))
                self.active_turns[session_id] = ActiveTurn(
                    turn_id=next_job.turn_id,
                    session_id=session_id,
                    task=next_task,
                    cancel_event=next_cancel_event,
                    started_at=time.time()
                )
