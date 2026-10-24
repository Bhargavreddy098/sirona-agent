from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Query, Request
from pydantic import BaseModel

router = APIRouter(prefix="/api/search", tags=["search"])


class SearchResponse(BaseModel):
    query: str
    total: int
    results: List[Dict[str, Any]]


@router.get("", response_model=SearchResponse)
@router.get("/", response_model=SearchResponse)
async def search_messages(
    request: Request,
    q: str = Query(..., description="Query terms to search for across transcripts via FTS5"),
    session_id: Optional[str] = Query(None, description="Optional session_id to restrict search to"),
    limit: int = Query(50, ge=1, le=200, description="Max results to return"),
) -> SearchResponse:
    """Execute high-speed full-text and trigram search across conversation transcripts via SQLite FTS5."""
    message_repo = request.app.state.message_repo
    results = await message_repo.search_messages(
        query_text=q,
        session_id=session_id,
        limit=limit,
    )
    return SearchResponse(
        query=q,
        total=len(results),
        results=[r.model_dump() for r in results],
    )
