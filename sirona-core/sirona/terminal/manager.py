from typing import Dict, List, Optional
from .session import TerminalSession

class TerminalManager:
    def __init__(self):
        self._sessions: Dict[str, TerminalSession] = {}

    async def create_session(
        self,
        session_id: Optional[str] = None,
        cwd: Optional[str] = None,
        cols: int = 80,
        rows: int = 24
    ) -> TerminalSession:
        term = TerminalSession(session_id=session_id, cwd=cwd, cols=cols, rows=rows)
        await term.start()
        self._sessions[term.session_id] = term
        return term

    def get_session(self, session_id: str) -> Optional[TerminalSession]:
        return self._sessions.get(session_id)

    async def close_session(self, session_id: str) -> bool:
        term = self._sessions.pop(session_id, None)
        if term:
            await term.close()
            return True
        return False

    def list_sessions(self) -> List[str]:
        return list(self._sessions.keys())
