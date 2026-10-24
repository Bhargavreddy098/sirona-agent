import time
import uuid
from typing import List, Optional, Tuple
from pydantic import BaseModel, Field
from .connection import DatabaseManager

class SessionRecord(BaseModel):
    id: str
    source: str = "desktop"
    title: str = "New Session"
    title_source: str = "auto"
    model: str = "gemini-2.5-flash"
    model_settings: Optional[str] = Field(default=None, alias="model_config")
    system_prompt: Optional[str] = None
    parent_session_id: Optional[str] = None
    cwd: Optional[str] = None
    git_branch: Optional[str] = None
    git_repo_root: Optional[str] = None
    started_at: float
    ended_at: Optional[float] = None
    last_activity_at: Optional[float] = None
    message_count: int = 0
    tool_call_count: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    pinned: int = 0
    archived: int = 0
    hidden: int = 0

class SessionRepository:
    def __init__(self, db_mgr: DatabaseManager):
        self.db_mgr = db_mgr

    async def create_session(
        self,
        title: str = "New Session",
        model: str = "gemini-2.5-flash",
        cwd: Optional[str] = None,
        parent_session_id: Optional[str] = None,
        system_prompt: Optional[str] = None
    ) -> SessionRecord:
        session_id = f"sess_{uuid.uuid4().hex[:12]}"
        now = time.time()
        record = SessionRecord(
            id=session_id,
            title=title,
            model=model,
            cwd=cwd,
            parent_session_id=parent_session_id,
            system_prompt=system_prompt,
            started_at=now,
            last_activity_at=now,
        )
        async with self.db_mgr.acquire() as db:
            await db.execute(
                """
                INSERT INTO sessions (
                    id, source, title, model, cwd, parent_session_id, system_prompt,
                    started_at, last_activity_at, pinned, archived, hidden
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0)
                """,
                (
                    record.id, record.source, record.title, record.model, record.cwd,
                    record.parent_session_id, record.system_prompt, record.started_at,
                    record.last_activity_at
                )
            )
            await db.commit()
        return record

    async def get_session(self, session_id: str) -> Optional[SessionRecord]:
        async with self.db_mgr.acquire() as db:
            async with db.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)) as cursor:
                row = await cursor.fetchone()
                if not row:
                    return None
                return SessionRecord(**dict(row))

    async def update_session(
        self,
        session_id: str,
        title: Optional[str] = None,
        pinned: Optional[bool] = None,
        archived: Optional[bool] = None,
        model: Optional[str] = None,
        cwd: Optional[str] = None
    ) -> Optional[SessionRecord]:
        updates = []
        params = []
        now = time.time()

        if title is not None:
            updates.append("title = ?")
            params.append(title)
        if pinned is not None:
            updates.append("pinned = ?")
            params.append(1 if pinned else 0)
        if archived is not None:
            updates.append("archived = ?")
            params.append(1 if archived else 0)
        if model is not None:
            updates.append("model = ?")
            params.append(model)
        if cwd is not None:
            updates.append("cwd = ?")
            params.append(cwd)

        if not updates:
            return await self.get_session(session_id)

        updates.append("last_activity_at = ?")
        params.append(now)
        params.append(session_id)

        query = f"UPDATE sessions SET {', '.join(updates)} WHERE id = ?"
        async with self.db_mgr.acquire() as db:
            await db.execute(query, params)
            await db.commit()

        return await self.get_session(session_id)

    async def list_sessions(
        self,
        limit: int = 50,
        offset: int = 0,
        pinned: Optional[bool] = None,
        archived: Optional[bool] = None
    ) -> Tuple[List[SessionRecord], int]:
        filters = ["hidden = 0"]
        params = []

        if pinned is not None:
            filters.append("pinned = ?")
            params.append(1 if pinned else 0)
        if archived is not None:
            filters.append("archived = ?")
            params.append(1 if archived else 0)

        where_clause = f"WHERE {' AND '.join(filters)}"

        async with self.db_mgr.acquire() as db:
            count_query = f"SELECT COUNT(*) FROM sessions {where_clause}"
            async with db.execute(count_query, params) as cursor:
                total_row = await cursor.fetchone()
                total = total_row[0] if total_row else 0

            list_query = f"""
                SELECT * FROM sessions {where_clause}
                ORDER BY pinned DESC, last_activity_at DESC
                LIMIT ? OFFSET ?
            """
            async with db.execute(list_query, (*params, limit, offset)) as cursor:
                rows = await cursor.fetchall()
                sessions = [SessionRecord(**dict(r)) for r in rows]

        return sessions, total

    async def delete_session(self, session_id: str) -> bool:
        async with self.db_mgr.acquire() as db:
            cursor = await db.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
            await db.commit()
            return cursor.rowcount > 0

    async def branch_session(
        self,
        parent_id: str,
        title: Optional[str] = None,
        through_message_id: Optional[int] = None
    ) -> Optional[SessionRecord]:
        parent = await self.get_session(parent_id)
        if not parent:
            return None
        new_title = title or f"{parent.title} (fork)"
        new_sess = await self.create_session(
            title=new_title,
            model=parent.model,
            cwd=parent.cwd,
            parent_session_id=parent_id,
            system_prompt=parent.system_prompt
        )
        async with self.db_mgr.acquire() as db:
            filter_clause = "AND id <= ?" if through_message_id else ""
            query_params = (parent_id, through_message_id) if through_message_id else (parent_id,)
            await db.execute(
                f"""
                INSERT INTO messages (
                    session_id, role, content, tool_call_id, tool_calls, tool_name,
                    timestamp, token_count, finish_reason, reasoning, active, compacted
                )
                SELECT ?, role, content, tool_call_id, tool_calls, tool_name,
                       timestamp, token_count, finish_reason, reasoning, active, compacted
                FROM messages
                WHERE session_id = ? AND active = 1 {filter_clause}
                ORDER BY timestamp ASC, id ASC
                """,
                (new_sess.id, *query_params)
            )
            await db.execute(
                """
                UPDATE sessions
                SET message_count = (SELECT COUNT(*) FROM messages WHERE session_id = ?)
                WHERE id = ?
                """,
                (new_sess.id, new_sess.id)
            )
            await db.commit()
        return await self.get_session(new_sess.id)
