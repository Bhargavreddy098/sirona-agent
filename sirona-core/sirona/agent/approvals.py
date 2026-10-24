import asyncio
import time
import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class ApprovalRequest(BaseModel):
    prompt_id: str
    session_id: str
    tool_name: str
    tool_args: Dict[str, Any]
    danger_level: str
    diff: Optional[str] = None
    created_at: float

class ApprovalManager:
    def __init__(self):
        self._pending_approvals: Dict[str, ApprovalRequest] = {}
        self._futures: Dict[str, asyncio.Future] = {}

    async def request_approval(
        self,
        session_id: str,
        tool_name: str,
        tool_args: Dict[str, Any],
        danger_level: str = "requires_approval",
        diff: Optional[str] = None,
        timeout: Optional[float] = 300.0,
        prompt_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        pid = prompt_id or f"appr_{uuid.uuid4().hex[:10]}"
        req = ApprovalRequest(
            prompt_id=pid,
            session_id=session_id,
            tool_name=tool_name,
            tool_args=tool_args,
            danger_level=danger_level,
            diff=diff,
            created_at=time.time()
        )
        self._pending_approvals[pid] = req
        loop = asyncio.get_running_loop()
        fut = loop.create_future()
        self._futures[pid] = fut

        try:
            if timeout:
                return await asyncio.wait_for(fut, timeout=timeout)
            return await fut
        except asyncio.TimeoutError:
            return {"approved": False, "choice": "deny", "timed_out": True}
        finally:
            self._pending_approvals.pop(pid, None)
            self._futures.pop(pid, None)

    def resolve_approval(
        self,
        prompt_id: str,
        approved: bool = True,
        amendments: Optional[Dict[str, Any]] = None,
        choice: Optional[str] = None,
    ) -> bool:
        fut = self._futures.get(prompt_id)
        if not fut or fut.done():
            return False
        
        final_choice = choice
        if final_choice is None:
            final_choice = "once" if approved else "deny"

        fut.set_result({
            "approved": final_choice != "deny",
            "choice": final_choice,
            "amendments": amendments or {}
        })
        return True

    def cancel_pending_for_session(self, session_id: str) -> int:
        count = 0
        for prompt_id, req in list(self._pending_approvals.items()):
            if req.session_id == session_id:
                fut = self._futures.get(prompt_id)
                if fut and not fut.done():
                    fut.set_result({"approved": False, "choice": "deny", "cancelled": True})
                    count += 1
                self._pending_approvals.pop(prompt_id, None)
                self._futures.pop(prompt_id, None)
        return count

    def get_pending_approvals(self, session_id: Optional[str] = None) -> List[ApprovalRequest]:
        if session_id:
            return [req for req in self._pending_approvals.values() if req.session_id == session_id]
        return list(self._pending_approvals.values())

    def get_pending_approval(self, prompt_id: str) -> Optional[ApprovalRequest]:
        return self._pending_approvals.get(prompt_id)
