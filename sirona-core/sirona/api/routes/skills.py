from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel

router = APIRouter(tags=["Skills"])

class ToggleSkillRequest(BaseModel):
    skill_name: str
    enabled: bool

@router.get("/v1/skills")
async def list_skills(request: Request, enabled_only: bool = Query(False)):
    skills_mgr = request.app.state.skills_manager
    all_skills = skills_mgr.list_skills()
    if enabled_only:
        all_skills = [s for s in all_skills if skills_mgr.is_enabled(s.name)]
    return {"skills": [s.model_dump() for s in all_skills]}

@router.post("/api/skills/toggle")
async def toggle_skill(request: Request, body: ToggleSkillRequest):
    skills_mgr = request.app.state.skills_manager
    skills_mgr.set_enabled(body.skill_name, body.enabled)
    return {"success": True, "skill_name": body.skill_name, "enabled": body.enabled}
