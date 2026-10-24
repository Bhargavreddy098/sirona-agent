import time
from fastapi import APIRouter, Request

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "sirona",
        "version": "0.1.0",
        "timestamp": time.time()
    }

@router.get("/v1/health")
async def v1_health():
    return await health()

@router.get("/health/detailed")
async def health_detailed(request: Request):
    db_mgr = request.app.state.db_mgr
    db_healthy = False
    try:
        async with db_mgr.acquire() as db:
            async with db.execute("SELECT 1") as cursor:
                row = await cursor.fetchone()
                db_healthy = row[0] == 1
    except Exception:
        db_healthy = False

    return {
        "status": "ok" if db_healthy else "degraded",
        "service": "sirona",
        "db": db_healthy,
        "gateway": "ready",
        "uptime": time.time() - getattr(request.app.state, "started_at", time.time())
    }

@router.get("/api/status")
@router.get("/api/system/status")
async def system_status(request: Request):
    import psutil
    try:
        cpu_pct = psutil.cpu_percent(interval=None)
        mem = psutil.virtual_memory()
        mem_pct = mem.percent
        mem_avail = int(mem.available / (1024 * 1024))
    except Exception:
        cpu_pct = 5.0
        mem_pct = 25.0
        mem_avail = 8192

    return {
        "cpu_pct": cpu_pct,
        "mem_pct": mem_pct,
        "mem_available_mb": mem_avail,
        "gateway": "ready",
        "active_runs": 0,
        "uptime": time.time() - getattr(request.app.state, "started_at", time.time())
    }
