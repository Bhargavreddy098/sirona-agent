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
        timeout: Optional[float] = 300.0
    ) -> Dict[str, Any]:
        prompt_id = f"appr_{uuid.uuid4().hex[:10]}"
        req = ApprovalRequest(
            prompt_id=prompt_id,
            session_id=session_id,
            tool_name=tool_name,
            tool_args=tool_args,
            danger_level=danger_level,
            diff=diff,
            created_at=time.time()
        )
        self._pending_approvals[prompt_id] = req
        loop = asyncio.get_running_loop()
        fut = loop.create_future()
        self._futures[prompt_id] = fut

        try:
            if timeout:
                return await asyncio.wait_for(fut, timeout=timeout)
            return await fut
        finally:
            self._pending_approvals.pop(prompt_id, None)
            self._futures.pop(prompt_id, None)

    def resolve_approval(self, prompt_id: str, approved: bool, amendments: Optional[Dict[str, Any]] = None) -> bool:
        fut = self._futures.get(prompt_id)
        if not fut or fut.done():
            return False
        fut.set_result({
            "approved": approved,
            "amendments": amendments or {}
        })
        return True

    def get_pending_approvals(self, session_id: Optional[str] = None) -> List[ApprovalRequest]:
        if session_id:
            return [req for req in self._pending_approvals.values() if req.session_id == session_id]
        return list(self._pending_approvals.values())
