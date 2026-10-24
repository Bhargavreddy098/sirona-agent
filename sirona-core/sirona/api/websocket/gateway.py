import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from .dispatcher import dispatch_rpc
from .events import broadcaster

ws_router = APIRouter()

@ws_router.websocket("/ws/gateway")
async def gateway_ws_endpoint(websocket: WebSocket):
    await websocket.accept()
    broadcaster.connect(websocket)
    app_state = websocket.app.state
    try:
        while True:
            data = await websocket.receive_text()
            try:
                rpc_req = json.loads(data)
                req_id = rpc_req.get("id")
                method = rpc_req.get("method", "")
                params = rpc_req.get("params", {})

                result = await dispatch_rpc(method, params, app_state)
                
                resp = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": result
                }
                await websocket.send_text(json.dumps(resp))
            except Exception as exc:
                err_resp = {
                    "jsonrpc": "2.0",
                    "id": None,
                    "error": {"code": -32603, "message": str(exc)}
                }
                await websocket.send_text(json.dumps(err_resp))
    except WebSocketDisconnect:
        broadcaster.disconnect(websocket)

@ws_router.websocket("/ws/terminal")
async def terminal_ws_endpoint(websocket: WebSocket):
    await websocket.accept()
    term_mgr = websocket.app.state.terminal_manager
    session = await term_mgr.create_session()

    async def forward_pty_output():
        try:
            while session.is_alive():
                chunk = await session.read(timeout=0.2)
                if chunk:
                    await websocket.send_text(chunk)
        except Exception:
            pass

    import asyncio
    read_task = asyncio.create_task(forward_pty_output())

    try:
        while True:
            msg = await websocket.receive_text()
            try:
                data = json.loads(msg)
                if data.get("type") == "resize":
                    session.resize(cols=data.get("cols", 80), rows=data.get("rows", 24))
                    continue
            except Exception:
                pass
            # Regular keystroke input
            await session.write(msg)
    except WebSocketDisconnect:
        read_task.cancel()
        await term_mgr.close_session(session.session_id)
