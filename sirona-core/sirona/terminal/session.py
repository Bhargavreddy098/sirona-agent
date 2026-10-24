import asyncio
import os
import sys
import uuid
from typing import Optional

class TerminalSession:
    def __init__(
        self,
        session_id: Optional[str] = None,
        cwd: Optional[str] = None,
        cols: int = 80,
        rows: int = 24
    ):
        self.session_id = session_id or f"term_{uuid.uuid4().hex[:8]}"
        self.cwd = cwd or os.getcwd()
        self.cols = cols
        self.rows = rows
        self._proc: Optional[asyncio.subprocess.Process] = None
        self._output_queue: asyncio.Queue[str] = asyncio.Queue()
        self._reader_task: Optional[asyncio.Task] = None

    async def start(self) -> None:
        shell_cmd = "cmd.exe" if sys.platform == "win32" else os.getenv("SHELL", "/bin/sh")
        self._proc = await asyncio.create_subprocess_shell(
            shell_cmd,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=self.cwd
        )
        self._reader_task = asyncio.create_task(self._read_loop())

    async def _read_loop(self) -> None:
        if not self._proc or not self._proc.stdout:
            return
        try:
            while True:
                line = await self._proc.stdout.read(1024)
                if not line:
                    break
                text = line.decode("utf-8", errors="replace")
                await self._output_queue.put(text)
        except Exception:
            pass

    async def write(self, data: str) -> None:
        if self._proc and self._proc.stdin and not self._proc.stdin.is_closing():
            self._proc.stdin.write(data.encode("utf-8"))
            await self._proc.stdin.drain()

    async def read(self, timeout: float = 0.5) -> Optional[str]:
        try:
            return await asyncio.wait_for(self._output_queue.get(), timeout=timeout)
        except asyncio.TimeoutError:
            return None

    def resize(self, cols: int, rows: int) -> None:
        self.cols = cols
        self.rows = rows

    def is_alive(self) -> bool:
        return self._proc is not None and self._proc.returncode is None

    async def close(self) -> None:
        if self._reader_task:
            self._reader_task.cancel()
        if self._proc:
            try:
                if self._proc.stdin and not self._proc.stdin.is_closing():
                    self._proc.stdin.close()
                self._proc.terminate()
                await asyncio.sleep(0.05)
                if self._proc.returncode is None:
                    self._proc.kill()
            except Exception:
                pass
