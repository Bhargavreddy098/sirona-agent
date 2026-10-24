import time
import uuid
from typing import List, Optional, Tuple, Any, Dict
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
    branch_point_id: Optional[str] = None
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
    reasoning_effort: str = "medium"
    project_id: Optional[str] = None
    profile: str = "default"
    revision: int = 1
    deleted_at: Optional[float] = None
    checkpoint_id: Optional[str] = None

class SessionRepository:
    def __init__(self, db_mgr: DatabaseManager):
        self.db_mgr = db_mgr

    async def create_session(
        self,
        title: str = "New Session",
        model: str = "gemini-2.5-flash",
        cwd: Optional[str] = None,
        parent_session_id: Optional[str] = None,
        branch_point_id: Optional[str] = None,
        system_prompt: Optional[str] = None,
        reasoning_effort: str = "medium",
        project_id: Optional[str] = None,
        profile: str = "default",
        session_id: Optional[str] = None,
    ) -> SessionRecord:
        sid = session_id or f"sess_{uuid.uuid4().hex[:12]}"
        now = time.time()
        record = SessionRecord(
            id=sid,
            title=title,
            model=model,
            cwd=cwd,
            parent_session_id=parent_session_id,
            branch_point_id=branch_point_id,
            system_prompt=system_prompt,
            reasoning_effort=reasoning_effort,
            project_id=project_id,
            profile=profile,
            started_at=now,
            last_activity_at=now,
            revision=1,
        )
        async with self.db_mgr.acquire() as db:
            await db.execute(
                """
                INSERT INTO sessions (
                    id, source, title, model, cwd, parent_session_id, branch_point_id,
                    system_prompt, reasoning_effort, project_id, profile, started_at,
                    last_activity_at, pinned, archived, hidden, revision
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 1)
                """,
                (
                    record.id, record.source, record.title, record.model, record.cwd,
                    record.parent_session_id, record.branch_point_id, record.system_prompt,
                    record.reasoning_effort, record.project_id, record.profile,
                    record.started_at, record.last_activity_at
                )
            )
            await db.commit()
        return record

    async def get_session(self, session_id: str, include_deleted: bool = False) -> Optional[SessionRecord]:
        query = "SELECT * FROM sessions WHERE id = ?"
        if not include_deleted:
            query += " AND deleted_at IS NULL"

        async with self.db_mgr.acquire() as db:
            async with db.execute(query, (session_id,)) as cursor:
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
        cwd: Optional[str] = None,
        reasoning_effort: Optional[str] = None,
        project_id: Optional[str] = None,
        checkpoint_id: Optional[str] = None,
        expected_revision: Optional[int] = None,
    ) -> Optional[SessionRecord]:
        updates = []
        params: List[Any] = []
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
        if reasoning_effort is not None:
            updates.append("reasoning_effort = ?")
            params.append(reasoning_effort)
        if project_id is not None:
            updates.append("project_id = ?")
            params.append(project_id)
        if checkpoint_id is not None:
            updates.append("checkpoint_id = ?")
            params.append(checkpoint_id)

        if not updates:
            return await self.get_session(session_id)

        updates.append("last_activity_at = ?")
        params.append(now)
        updates.append("revision = revision + 1")

        sql = f"UPDATE sessions SET {', '.join(updates)} WHERE id = ? AND deleted_at IS NULL"
        params.append(session_id)

        if expected_revision is not None:
            sql += " AND revision = ?"
            params.append(expected_revision)

        async with self.db_mgr.acquire() as db:
            cursor = await db.execute(sql, tuple(params))
            await db.commit()
            if cursor.rowcount == 0 and expected_revision is not None:
                raise ValueError(f"Session CAS revision conflict: expected revision {expected_revision}")

        return await self.get_session(session_id)

    async def delete_session(self, session_id: str, soft: bool = True) -> bool:
        async with self.db_mgr.acquire() as db:
            if soft:
                cursor = await db.execute(
                    "UPDATE sessions SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL",
                    (time.time(), session_id)
                )
            else:
                cursor = await db.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
            await db.commit()
            return cursor.rowcount > 0

    async def list_sessions(
        self,
        pinned: Optional[bool] = None,
        archived: Optional[bool] = None,
        project_id: Optional[str] = None,
        profile: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[SessionRecord], int]:
        conditions = ["deleted_at IS NULL"]
        params: List[Any] = []

        if pinned is not None:
            conditions.append("pinned = ?")
            params.append(1 if pinned else 0)
        if archived is not None:
            conditions.append("archived = ?")
            params.append(1 if archived else 0)
        if project_id is not None:
            conditions.append("project_id = ?")
            params.append(project_id)
        if profile is not None:
            conditions.append("profile = ?")
            params.append(profile)
        if search:
            conditions.append("(title LIKE ? OR id LIKE ?)")
            params.append(f"%{search}%")
            params.append(f"%{search}%")

        where_clause = " WHERE " + " AND ".join(conditions)

        async with self.db_mgr.acquire() as db:
            # Count total
            async with db.execute(f"SELECT COUNT(*) FROM sessions{where_clause}", tuple(params)) as c:
                total_row = await c.fetchone()
                total = total_row[0] if total_row else 0

            # Fetch rows
            query = f"""
                SELECT * FROM sessions
                {where_clause}
                ORDER BY pinned DESC, last_activity_at DESC
                LIMIT ? OFFSET ?
            """
            params.extend([limit, offset])
            async with db.execute(query, tuple(params)) as cursor:
                rows = await cursor.fetchall()
                sessions = [SessionRecord(**dict(row)) for row in rows]

        return sessions, total

    async def branch_session(
        self,
        source_session_id: str,
        through_message_id: Optional[int] = None,
        new_title: Optional[str] = None,
        reason: Optional[str] = "user_branch"
    ) -> Optional[SessionRecord]:
        source = await self.get_session(source_session_id)
        if not source:
            return None

        title = new_title or f"Branch: {source.title}"
        branch_point_id = str(through_message_id) if through_message_id else None

        child = await self.create_session(
            title=title,
            model=source.model,
            cwd=source.cwd,
            parent_session_id=source_session_id,
            branch_point_id=branch_point_id,
            system_prompt=source.system_prompt,
            reasoning_effort=source.reasoning_effort,
            project_id=source.project_id,
            profile=source.profile,
        )

        now = time.time()
        async with self.db_mgr.acquire() as db:
            # Record in lineage table
            await db.execute(
                """
                INSERT INTO session_lineage (
                    child_session_id, parent_session_id, branch_message_id, branch_reason, branched_at
                ) VALUES (?, ?, ?, ?, ?)
                """,
                (child.id, source_session_id, through_message_id, reason, now)
            )

            # Copy messages up to through_message_id
            if through_message_id:
                await db.execute(
                    """
                    INSERT INTO messages (
                        session_id, role, content, tool_call_id, tool_calls, tool_name,
                        tool_args, tool_result, timestamp, token_count, finish_reason,
                        reasoning, reasoning_content, api_content, display_kind, active, compacted
                    )
                    SELECT
                        ?, role, content, tool_call_id, tool_calls, tool_name,
                        tool_args, tool_result, timestamp, token_count, finish_reason,
                        reasoning, reasoning_content, api_content, display_kind, active, compacted
                    FROM messages
                    WHERE session_id = ? AND id <= ? AND active = 1
                    ORDER BY id ASC
                    """,
                    (child.id, source_session_id, through_message_id)
                )
            else:
                await db.execute(
                    """
                    INSERT INTO messages (
                        session_id, role, content, tool_call_id, tool_calls, tool_name,
                        tool_args, tool_result, timestamp, token_count, finish_reason,
                        reasoning, reasoning_content, api_content, display_kind, active, compacted
                    )
                    SELECT
                        ?, role, content, tool_call_id, tool_calls, tool_name,
                        tool_args, tool_result, timestamp, token_count, finish_reason,
                        reasoning, reasoning_content, api_content, display_kind, active, compacted
                    FROM messages
                    WHERE session_id = ? AND active = 1
                    ORDER BY id ASC
                    """,
                    (child.id, source_session_id)
                )

            # Update child message count
            async with db.execute("SELECT COUNT(*) FROM messages WHERE session_id = ?", (child.id,)) as c:
                row = await c.fetchone()
                cnt = row[0] if row else 0

            await db.execute("UPDATE sessions SET message_count = ? WHERE id = ?", (cnt, child.id))
            await db.commit()

        return await self.get_session(child.id)

    async def rewind_session(self, session_id: str, to_message_id: int) -> bool:
        now = time.time()
        async with self.db_mgr.acquire() as db:
            # Deactivate messages past to_message_id
            cursor = await db.execute(
                "UPDATE messages SET active = 0 WHERE session_id = ? AND id > ?",
                (session_id, to_message_id)
            )
            # Recompute active count
            async with db.execute(
                "SELECT COUNT(*) FROM messages WHERE session_id = ? AND active = 1", (session_id,)
            ) as c:
                row = await c.fetchone()
                cnt = row[0] if row else 0

            await db.execute(
                "UPDATE sessions SET message_count = ?, last_activity_at = ?, revision = revision + 1 WHERE id = ?",
                (cnt, now, session_id)
            )
            await db.commit()
            return cursor.rowcount > 0

    async def get_lineage(self, session_id: str) -> Dict[str, Any]:
        """Fetch lineage for a specific session: ancestors, self, and children."""
        async with self.db_mgr.acquire() as db:
            target = await self.get_session(session_id)
            if not target:
                return {"session": None, "ancestors": [], "children": []}

            ancestors = []
            curr_parent_id = target.parent_session_id
            while curr_parent_id:
                async with db.execute("SELECT * FROM sessions WHERE id = ?", (curr_parent_id,)) as c:
                    row = await c.fetchone()
                    if not row:
                        break
                    p = SessionRecord(**dict(row))
                    ancestors.append(p)
                    curr_parent_id = p.parent_session_id

            async with db.execute(
                "SELECT * FROM sessions WHERE parent_session_id = ? AND deleted_at IS NULL ORDER BY started_at ASC",
                (session_id,)
            ) as c:
                rows = await c.fetchall()
                children = [SessionRecord(**dict(r)) for r in rows]

            return {
                "session": target,
                "ancestors": ancestors,
                "children": children
            }

    async def get_topology(self) -> Dict[str, Any]:
        """Fetch full tree topology (nodes and edges) for all active sessions."""
        async with self.db_mgr.acquire() as db:
            async with db.execute(
                "SELECT * FROM sessions WHERE deleted_at IS NULL ORDER BY started_at ASC"
            ) as c:
                rows = await c.fetchall()
                sessions = [SessionRecord(**dict(r)) for r in rows]

            nodes = []
            edges = []
            for s in sessions:
                nodes.append({
                    "id": s.id,
                    "title": s.title,
                    "model": s.model,
                    "started_at": s.started_at,
                    "message_count": s.message_count,
                    "parent_session_id": s.parent_session_id,
                    "branch_point_id": s.branch_point_id,
                })
                if s.parent_session_id:
                    edges.append({
                        "source": s.parent_session_id,
                        "target": s.id,
                        "branch_point_id": s.branch_point_id,
                    })

            # Checkpoints
            async with db.execute("SELECT * FROM checkpoints ORDER BY created_at ASC") as c:
                cp_rows = await c.fetchall()
                checkpoints = [dict(r) for r in cp_rows]

            return {
                "nodes": nodes,
                "edges": edges,
                "checkpoints": checkpoints
            }
