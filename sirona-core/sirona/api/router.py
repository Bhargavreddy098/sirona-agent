from fastapi import APIRouter
from .routes.health import router as health_router
from .routes.models import router as models_router
from .routes.sessions import router as sessions_router
from .routes.runs import router as runs_router
from .routes.skills import router as skills_router
from .routes.tools import router as tools_router
from .routes.mcp import router as mcp_router
from .routes.projects import router as projects_router
from .routes.config import router as config_router
from .routes.preview import router as preview_router
from .routes.files import router as files_router
from .routes.git import router as git_router

api_router = APIRouter()

api_router.include_router(health_router)
api_router.include_router(models_router)
api_router.include_router(sessions_router)
api_router.include_router(runs_router)
api_router.include_router(skills_router)
api_router.include_router(tools_router)
api_router.include_router(mcp_router)
api_router.include_router(projects_router)
api_router.include_router(config_router)
api_router.include_router(preview_router)
api_router.include_router(files_router)
api_router.include_router(git_router)
