import time
import uuid
import hashlib
from typing import List, Optional
from pydantic import BaseModel
from .connection import DatabaseManager

class CheckpointRecord(BaseModel):
    id: str
    session_id: str
    message_id: Optional[int] = None
    state_hash: str
    summary: Optional[str] = None
    created_at: float

class CheckpointRepository:
    def __init__(self, db_mgr: DatabaseManager):
        self.db_mgr = db_mgr

    async def create_checkpoint(
        self,
        session_id: str,
        message_id: Optional[int] = None,
        summary: Optional[str] = None,
        state_data: Optional[str] = None
    ) -> CheckpointRecord:
        checkpoint_id = f"chk_{uuid.uuid4().hex[:12]}"
        now = time.time()
        raw_hash = f"{session_id}:{message_id}:{now}:{state_data or ''}"
        state_hash = hashlib.sha256(raw_hash.encode("utf-8")).hexdigest()[:16]

        record = CheckpointRecord(
            id=checkpoint_id,
            session_id=session_id,
            message_id=message_id,
            state_hash=state_hash,
            summary=summary,
            created_at=now
        )

        async with self.db_mgr.acquire() as db:
            await db.execute(
                """
                INSERT INTO checkpoints (id, session_id, message_id, state_hash, summary, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (record.id, record.session_id, record.message_id, record.state_hash, record.summary, record.created_at)
            )
            # Update session's active checkpoint_id
            await db.execute(
                "UPDATE sessions SET checkpoint_id = ?, revision = revision + 1 WHERE id = ?",
                (record.id, session_id)
            )
            await db.commit()

        return record

    async def get_checkpoints(self, session_id: str) -> List[CheckpointRecord]:
        async with self.db_mgr.acquire() as db:
            async with db.execute(
                "SELECT * FROM checkpoints WHERE session_id = ? ORDER BY created_at DESC",
                (session_id,)
            ) as cursor:
                rows = await cursor.fetchall()
                return [CheckpointRecord(**dict(row)) for row in rows]

    async def get_checkpoint(self, checkpoint_id: str) -> Optional[CheckpointRecord]:
        async with self.db_mgr.acquire() as db:
            async with db.execute(
                "SELECT * FROM checkpoints WHERE id = ?", (checkpoint_id,)
            ) as cursor:
                row = await cursor.fetchone()
                if not row:
                    return None
                return CheckpointRecord(**dict(row))
