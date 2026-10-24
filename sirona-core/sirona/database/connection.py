import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator, Optional
import aiosqlite

class DatabaseManager:
    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            home = Path.home() / ".sirona"
            home.mkdir(parents=True, exist_ok=True)
            self.db_path = str(home / "sirona.db")
        else:
            self.db_path = db_path
            Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)

    @asynccontextmanager
    async def acquire(self) -> AsyncIterator[aiosqlite.Connection]:
        db = await aiosqlite.connect(self.db_path)
        db.row_factory = aiosqlite.Row
        try:
            # Enable WAL mode and normal synchronous for performant ACID operations
            await db.execute("PRAGMA journal_mode = WAL;")
            await db.execute("PRAGMA synchronous = NORMAL;")
            await db.execute("PRAGMA foreign_keys = ON;")
            yield db
        finally:
            await db.close()

    async def close(self) -> None:
        """Utility for pool teardown if needed."""
        pass
