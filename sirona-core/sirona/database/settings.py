import time
import json
from typing import Any, Dict, Optional
from .connection import DatabaseManager

class SettingsRepository:
    def __init__(self, db_mgr: DatabaseManager):
        self.db_mgr = db_mgr

    async def _ensure_table(self, db) -> None:
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS desktop_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at REAL NOT NULL
            )
            """
        )

    async def get_setting(self, key: str, default: Any = None) -> Any:
        async with self.db_mgr.acquire() as db:
            await self._ensure_table(db)
            async with db.execute("SELECT value FROM desktop_settings WHERE key = ?", (key,)) as cursor:
                row = await cursor.fetchone()
                if not row:
                    return default
                try:
                    return json.loads(row["value"])
                except Exception:
                    return row["value"]

    async def set_setting(self, key: str, value: Any) -> None:
        now = time.time()
        val_str = json.dumps(value) if not isinstance(value, str) else value
        async with self.db_mgr.acquire() as db:
            await self._ensure_table(db)
            await db.execute(
                """
                INSERT INTO desktop_settings (key, value, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
                """,
                (key, val_str, now)
            )
            await db.commit()

    async def delete_setting(self, key: str) -> bool:
        async with self.db_mgr.acquire() as db:
            await self._ensure_table(db)
            cursor = await db.execute("DELETE FROM desktop_settings WHERE key = ?", (key,))
            await db.commit()
            return cursor.rowcount > 0

    async def list_settings(self) -> Dict[str, Any]:
        async with self.db_mgr.acquire() as db:
            await self._ensure_table(db)
            async with db.execute("SELECT key, value FROM desktop_settings ORDER BY key ASC") as cursor:
                rows = await cursor.fetchall()
                result = {}
                for row in rows:
                    try:
                        result[row["key"]] = json.loads(row["value"])
                    except Exception:
                        result[row["key"]] = row["value"]
                return result
