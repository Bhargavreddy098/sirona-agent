import json
import time
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from .connection import DatabaseManager

class MessageRecord(BaseModel):
    id: Optional[int] = None
    session_id: str
    role: str
    content: Optional[str] = None
    tool_call_id: Optional[str] = None
    tool_calls: Optional[str] = None
    tool_name: Optional[str] = None
    tool_args: Optional[str] = None
    tool_result: Optional[str] = None
    timestamp: float
    token_count: int = 0
    finish_reason: Optional[str] = None
    reasoning: Optional[str] = None
    reasoning_content: Optional[str] = None
    api_content: Optional[str] = None
    display_kind: str = "normal"
    active: int = 1
    compacted: int = 0
    checkpoint_id: Optional[str] = None
    metadata: Optional[str] = None

class MessageSearchResult(BaseModel):
    message_id: int
    session_id: str
    role: str
    content: str
    snippet: Optional[str] = None

class MessageRepository:
    def __init__(self, db_mgr: DatabaseManager):
        self.db_mgr = db_mgr

    async def add_message(
        self,
        session_id: str,
        role: str,
        content: Optional[str] = None,
        tool_call_id: Optional[str] = None,
        tool_calls: Optional[List[Dict[str, Any]]] = None,
        tool_name: Optional[str] = None,
        tool_args: Optional[Dict[str, Any]] = None,
        tool_result: Optional[Any] = None,
        reasoning: Optional[str] = None,
        token_count: int = 0,
        finish_reason: Optional[str] = None,
        checkpoint_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> MessageRecord:
        now = time.time()
        tool_calls_json = json.dumps(tool_calls) if tool_calls else None
        tool_args_json = json.dumps(tool_args) if tool_args else None
        tool_result_json = json.dumps(tool_result) if tool_result is not None else None
        metadata_json = json.dumps(metadata) if metadata else None

        async with self.db_mgr.acquire() as db:
            cursor = await db.execute(
                """
                INSERT INTO messages (
                    session_id, role, content, tool_call_id, tool_calls, tool_name,
                    tool_args, tool_result, timestamp, token_count, finish_reason,
                    reasoning, active, compacted, checkpoint_id, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
                """,
                (
                    session_id, role, content, tool_call_id, tool_calls_json, tool_name,
                    tool_args_json, tool_result_json, now, token_count, finish_reason,
                    reasoning, checkpoint_id, metadata_json
                )
            )
            msg_id = cursor.lastrowid

            # Increment message and tool counters on session
            is_tool = 1 if role == "tool" or tool_name is not None else 0
            await db.execute(
                """
                UPDATE sessions
                SET message_count = message_count + 1,
                    tool_call_count = tool_call_count + ?,
                    input_tokens = input_tokens + ?,
                    last_activity_at = ?,
                    revision = revision + 1
                WHERE id = ?
                """,
                (is_tool, token_count, now, session_id)
            )
            await db.commit()

        return MessageRecord(
            id=msg_id,
            session_id=session_id,
            role=role,
            content=content,
            tool_call_id=tool_call_id,
            tool_calls=tool_calls_json,
            tool_name=tool_name,
            tool_args=tool_args_json,
            tool_result=tool_result_json,
            timestamp=now,
            token_count=token_count,
            finish_reason=finish_reason,
            reasoning=reasoning,
            checkpoint_id=checkpoint_id,
            metadata=metadata_json,
        )

    async def get_messages(
        self,
        session_id: str,
        limit: int = 100,
        offset: int = 0,
        order: str = "oldest",
        include_compacted: bool = False,
        include_inactive: bool = False,
    ) -> List[MessageRecord]:
        order_clause = "ASC" if order.lower() == "oldest" else "DESC"
        conditions = ["session_id = ?"]
        params: List[Any] = [session_id]

        if not include_compacted:
            conditions.append("compacted = 0")
        if not include_inactive:
            conditions.append("active = 1")

        query = f"""
            SELECT * FROM messages
            WHERE {' AND '.join(conditions)}
            ORDER BY timestamp {order_clause}, id {order_clause}
            LIMIT ? OFFSET ?
        """
        params.extend([limit, offset])

        async with self.db_mgr.acquire() as db:
            async with db.execute(query, tuple(params)) as cursor:
                rows = await cursor.fetchall()
                return [MessageRecord(**dict(row)) for row in rows]

    async def search_messages(
        self,
        query_text: str,
        session_id: Optional[str] = None,
        limit: int = 50
    ) -> List[MessageSearchResult]:
        if not query_text or not query_text.strip():
            return []

        # Sanitize FTS5 query token
        sanitized = "".join(c for c in query_text if c.isalnum() or c in (" ", "-", "_")).strip()
        if not sanitized:
            return []

        fts_query = f'"{sanitized}"*'

        sql = """
            SELECT
                m.id as message_id,
                m.session_id,
                m.role,
                m.content,
                snippet(messages_fts, 0, '<b>', '</b>', '...', 15) as snippet
            FROM messages_fts f
            JOIN messages m ON f.rowid = m.id
            WHERE messages_fts MATCH ? AND m.active = 1
        """
        params: List[Any] = [fts_query]

        if session_id:
            sql += " AND m.session_id = ?"
            params.append(session_id)

        sql += " ORDER BY rank LIMIT ?"
        params.append(limit)

        async with self.db_mgr.acquire() as db:
            async with db.execute(sql, tuple(params)) as cursor:
                rows = await cursor.fetchall()
                return [
                    MessageSearchResult(
                        message_id=row["message_id"],
                        session_id=row["session_id"],
                        role=row["role"],
                        content=row["content"] or "",
                        snippet=row["snippet"] or row["content"] or "",
                    )
                    for row in rows
                ]

    async def compact_messages(
        self,
        session_id: str,
        up_to_message_id: int,
        summary_content: str
    ) -> MessageRecord:
        now = time.time()
        async with self.db_mgr.acquire() as db:
            # Mark older messages as compacted
            await db.execute(
                """
                UPDATE messages
                SET compacted = 1
                WHERE session_id = ? AND id <= ? AND active = 1
                """,
                (session_id, up_to_message_id)
            )

            # Insert compacted summary message
            cursor = await db.execute(
                """
                INSERT INTO messages (
                    session_id, role, content, timestamp, display_kind, active, compacted
                ) VALUES (?, 'system', ?, ?, 'compacted_summary', 1, 0)
                """,
                (session_id, summary_content, now)
            )
            summary_id = cursor.lastrowid
            await db.commit()

        return MessageRecord(
            id=summary_id,
            session_id=session_id,
            role="system",
            content=summary_content,
            timestamp=now,
            display_kind="compacted_summary",
        )

    async def get_message_by_id(self, message_id: int) -> Optional[MessageRecord]:
        async with self.db_mgr.acquire() as db:
            async with db.execute("SELECT * FROM messages WHERE id = ?", (message_id,)) as cursor:
                row = await cursor.fetchone()
                if not row:
                    return None
                return MessageRecord(**dict(row))

    async def find_recent_unadopted_user_message(
        self,
        session_id: str,
        content: str,
        within_seconds: float = 15.0
    ) -> Optional[MessageRecord]:
        cutoff = time.time() - within_seconds
        async with self.db_mgr.acquire() as db:
            query = """
                SELECT * FROM messages
                WHERE session_id = ? AND role = 'user' AND content = ? AND timestamp >= ? AND active = 1
                ORDER BY timestamp DESC, id DESC
                LIMIT 1
            """
            async with db.execute(query, (session_id, content, cutoff)) as cursor:
                row = await cursor.fetchone()
                if not row:
                    return None
                return MessageRecord(**dict(row))

    async def adopt_message(self, message_id: int, turn_id: str) -> None:
        async with self.db_mgr.acquire() as db:
            await db.execute(
                """
                UPDATE messages
                SET metadata = json_set(COALESCE(metadata, '{}'), '$.adopted_turn_id', ?, '$.adoption_status', 'adopted')
                WHERE id = ?
                """,
                (turn_id, message_id)
            )
            await db.commit()

