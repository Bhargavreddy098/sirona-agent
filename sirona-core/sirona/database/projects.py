import time
import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from .connection import DatabaseManager

class ProjectRecord(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    primary_path: str
    icon: Optional[str] = None
    color: Optional[str] = None
    created_at: float
    archived: int = 0

class ProjectRepository:
    def __init__(self, db_mgr: DatabaseManager):
        self.db_mgr = db_mgr

    async def create_project(
        self,
        name: str,
        primary_path: str,
        description: Optional[str] = None,
        icon: Optional[str] = None,
        color: Optional[str] = None
    ) -> ProjectRecord:
        proj_id = f"proj_{uuid.uuid4().hex[:10]}"
        now = time.time()
        record = ProjectRecord(
            id=proj_id,
            name=name,
            description=description,
            primary_path=primary_path,
            icon=icon,
            color=color,
            created_at=now
        )
        async with self.db_mgr.acquire() as db:
            await db.execute(
                """
                INSERT INTO projects (id, name, description, primary_path, icon, color, created_at, archived)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0)
                """,
                (record.id, record.name, record.description, record.primary_path, record.icon, record.color, record.created_at)
            )
            # Add primary path to project folders
            await db.execute(
                """
                INSERT INTO project_folders (project_id, path, label, is_primary, added_at)
                VALUES (?, ?, 'Primary Root', 1, ?)
                """,
                (record.id, record.primary_path, now)
            )
            await db.commit()
        return record

    async def get_project(self, project_id: str) -> Optional[ProjectRecord]:
        async with self.db_mgr.acquire() as db:
            async with db.execute("SELECT * FROM projects WHERE id = ?", (project_id,)) as cursor:
                row = await cursor.fetchone()
                if not row:
                    return None
                return ProjectRecord(**dict(row))

    async def list_projects(self, include_archived: bool = False) -> List[ProjectRecord]:
        query = "SELECT * FROM projects" if include_archived else "SELECT * FROM projects WHERE archived = 0"
        async with self.db_mgr.acquire() as db:
            async with db.execute(f"{query} ORDER BY created_at DESC") as cursor:
                rows = await cursor.fetchall()
                return [ProjectRecord(**dict(r)) for r in rows]

    async def add_folder(self, project_id: str, path: str, label: Optional[str] = None) -> None:
        now = time.time()
        async with self.db_mgr.acquire() as db:
            await db.execute(
                """
                INSERT OR REPLACE INTO project_folders (project_id, path, label, is_primary, added_at)
                VALUES (?, ?, ?, 0, ?)
                """,
                (project_id, path, label, now)
            )
            await db.commit()

    async def get_folders(self, project_id: str) -> List[Dict[str, Any]]:
        async with self.db_mgr.acquire() as db:
            async with db.execute(
                "SELECT path, label, is_primary, added_at FROM project_folders WHERE project_id = ? ORDER BY is_primary DESC, added_at ASC",
                (project_id,)
            ) as cursor:
                rows = await cursor.fetchall()
                return [dict(r) for r in rows]
