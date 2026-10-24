import asyncio
import time
import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class ClarifyQuestion(BaseModel):
    qid: str
    question: str
    choices: Optional[List[str]] = None
    multi_select: bool = False

class ClarifyRequestModel(BaseModel):
    request_id: str
    session_id: str
    questions: List[ClarifyQuestion]
    created_at: float = Field(default_factory=time.time)

class ClarifyManager:
    def __init__(self):
        self._pending: Dict[str, asyncio.Future] = {}
        self._requests: Dict[str, ClarifyRequestModel] = {}
        self._session_requests: Dict[str, List[str]] = {}

    def get_pending_request(self, request_id: str) -> Optional[ClarifyRequestModel]:
        return self._requests.get(request_id)

    def get_session_requests(self, session_id: str) -> List[ClarifyRequestModel]:
        req_ids = self._session_requests.get(session_id, [])
        return [self._requests[rid] for rid in req_ids if rid in self._requests]

    async def request_clarification(
        self,
        session_id: str,
        questions: List[Dict[str, Any]],
        request_id: Optional[str] = None,
        timeout_s: float = 3600.0,
    ) -> Dict[str, Any]:
        rid = request_id or f"srq-clarify-{uuid.uuid4().hex[:10]}"

        normalized_questions: List[ClarifyQuestion] = []
        for i, q in enumerate(questions):
            qid = str(q.get("qid") or f"q{i+1}")
            question_text = str(q.get("question") or "")
            raw_choices = q.get("choices") or q.get("options")
            choices = [str(c) for c in raw_choices] if isinstance(raw_choices, list) else None
            multi_select = bool(q.get("multi_select") or q.get("is_multi_select") or False)
            normalized_questions.append(
                ClarifyQuestion(
                    qid=qid,
                    question=question_text,
                    choices=choices,
                    multi_select=multi_select,
                )
            )

        model = ClarifyRequestModel(
            request_id=rid,
            session_id=session_id,
            questions=normalized_questions,
            created_at=time.time(),
        )

        loop = asyncio.get_running_loop()
        future = loop.create_future()

        self._pending[rid] = future
        self._requests[rid] = model
        if session_id not in self._session_requests:
            self._session_requests[session_id] = []
        self._session_requests[session_id].append(rid)

        # Broadcast clarification request event & JSON-RPC request frame
        from ..api.websocket.events import broadcaster
        await broadcaster.broadcast("clarify.request", {
            "type": "clarify.request",
            "request_id": rid,
            "prompt_id": rid,
            "session_id": session_id,
            "questions": [q.model_dump() for q in normalized_questions],
            "created_at": model.created_at,
        })

        try:
            result = await asyncio.wait_for(future, timeout=timeout_s)
            return {"status": "answered", "answers": result, "request_id": rid}
        except asyncio.TimeoutError:
            return {"status": "timeout", "answers": None, "request_id": rid}
        except asyncio.CancelledError:
            return {"status": "cancelled", "answers": None, "request_id": rid}
        finally:
            self._cleanup_request(rid, session_id)

    def resolve_clarification(self, request_id: str, answers: Any) -> bool:
        future = self._pending.get(request_id)
        if future and not future.done():
            future.set_result(answers)
            req = self._requests.get(request_id)
            if req:
                self._cleanup_request(request_id, req.session_id)
            return True
        return False

    def cancel_pending_for_session(self, session_id: str) -> None:
        req_ids = self._session_requests.get(session_id, [])
        for rid in list(req_ids):
            future = self._pending.get(rid)
            if future and not future.done():
                future.cancel()
            self._cleanup_request(rid, session_id)

    def _cleanup_request(self, request_id: str, session_id: str) -> None:
        self._pending.pop(request_id, None)
        self._requests.pop(request_id, None)
        if session_id in self._session_requests:
            if request_id in self._session_requests[session_id]:
                self._session_requests[session_id].remove(request_id)
            if not self._session_requests[session_id]:
                self._session_requests.pop(session_id, None)
