from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional

router = APIRouter(tags=["Projects"])

class CreateProjectRequest(BaseModel):
    name: str
    primary_path: str
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None

class AddFolderRequest(BaseModel):
    path: str
    label: Optional[str] = None

@router.get("/api/projects")
async def list_projects(request: Request):
    repo = request.app.state.project_repo
    projects = await repo.list_projects()
    return {"projects": projects}

@router.post("/api/projects")
async def create_project(request: Request, body: CreateProjectRequest):
    repo = request.app.state.project_repo
    proj = await repo.create_project(
        name=body.name,
        primary_path=body.primary_path,
        description=body.description,
        icon=body.icon,
        color=body.color
    )
    return {"project": proj}

@router.get("/api/projects/{project_id}/folders")
async def get_project_folders(request: Request, project_id: str):
    repo = request.app.state.project_repo
    folders = await repo.get_folders(project_id)
    return {"folders": folders}

@router.post("/api/projects/{project_id}/folders")
async def add_project_folder(request: Request, project_id: str, body: AddFolderRequest):
    repo = request.app.state.project_repo
    await repo.add_folder(project_id, body.path, label=body.label)
    return {"success": True, "project_id": project_id, "path": body.path}
