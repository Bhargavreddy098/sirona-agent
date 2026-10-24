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
    timestamp: float
    token_count: int = 0
    finish_reason: Optional[str] = None
    reasoning: Optional[str] = None
    reasoning_content: Optional[str] = None
    api_content: Optional[str] = None
    display_kind: str = "normal"
    active: int = 1
    compacted: int = 0

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
        reasoning: Optional[str] = None,
        token_count: int = 0,
        finish_reason: Optional[str] = None
    ) -> MessageRecord:
        now = time.time()
        tool_calls_json = json.dumps(tool_calls) if tool_calls else None
        
        async with self.db_mgr.acquire() as db:
            cursor = await db.execute(
                """
                INSERT INTO messages (
                    session_id, role, content, tool_call_id, tool_calls, tool_name,
                    timestamp, token_count, finish_reason, reasoning, active, compacted
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)
                """,
                (
                    session_id, role, content, tool_call_id, tool_calls_json, tool_name,
                    now, token_count, finish_reason, reasoning
                )
            )
            msg_id = cursor.lastrowid
            
            # Increment message count on session
            await db.execute(
                """
                UPDATE sessions 
                SET message_count = message_count + 1,
                    last_activity_at = ?
                WHERE id = ?
                """,
                (now, session_id)
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
            timestamp=now,
            token_count=token_count,
            finish_reason=finish_reason,
            reasoning=reasoning
        )

    async def get_messages(
        self,
        session_id: str,
        limit: int = 100,
        offset: int = 0,
        order: str = "oldest",
        include_compacted: bool = False
    ) -> List[MessageRecord]:
        order_clause = "ASC" if order.lower() == "oldest" else "DESC"
        compacted_filter = "" if include_compacted else "AND compacted = 0"

        query = f"""
            SELECT * FROM messages
            WHERE session_id = ? AND active = 1 {compacted_filter}
            ORDER BY timestamp {order_clause}, id {order_clause}
            LIMIT ? OFFSET ?
        """
        async with self.db_mgr.acquire() as db:
            async with db.execute(query, (session_id, limit, offset)) as cursor:
                rows = await cursor.fetchall()
                return [MessageRecord(**dict(r)) for r in rows]

    async def get_messages_since(
        self,
        session_id: str,
        since_timestamp: float = 0.0,
        limit: int = 100
    ) -> List[MessageRecord]:
        query = """
            SELECT * FROM messages
            WHERE session_id = ? AND active = 1 AND timestamp > ?
            ORDER BY timestamp ASC, id ASC
            LIMIT ?
        """
        async with self.db_mgr.acquire() as db:
            async with db.execute(query, (session_id, since_timestamp, limit)) as cursor:
                rows = await cursor.fetchall()
                return [MessageRecord(**dict(r)) for r in rows]

    async def search_messages(self, query_text: str, limit: int = 20) -> List[MessageSearchResult]:
        search_query = """
            SELECT rowid, session_id, role, content, snippet(messages_fts, 0, '<b>', '</b>', '...', 15) as snip
            FROM messages_fts
            WHERE messages_fts MATCH ?
            ORDER BY rank
            LIMIT ?
        """
        # Escape or format match query
        formatted = f'"{query_text}"'
        async with self.db_mgr.acquire() as db:
            async with db.execute(search_query, (formatted, limit)) as cursor:
                rows = await cursor.fetchall()
                return [
                    MessageSearchResult(
                        message_id=r["rowid"],
                        session_id=r["session_id"],
                        role=r["role"],
                        content=r["content"],
                        snippet=r["snip"]
                    )
                    for r in rows
                ]
