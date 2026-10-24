import asyncio
import pytest
from sirona.terminal.manager import TerminalManager

@pytest.mark.asyncio
async def test_terminal_session_lifecycle():
    mgr = TerminalManager()
    
    # Create session
    session = await mgr.create_session(cols=80, rows=24)
    assert session.session_id is not None
    assert session.is_alive() is True

    # Send input
    await session.write("echo SironaPTY\n")
    
    # Read output
    output_accumulated = ""
    for _ in range(10):
        chunk = await session.read(timeout=0.5)
        if chunk:
            output_accumulated += chunk
            if "SironaPTY" in output_accumulated:
                break
        await asyncio.sleep(0.1)

    assert "SironaPTY" in output_accumulated

    # Test resize
    session.resize(cols=120, rows=40)
    assert session.cols == 120
    assert session.rows == 40

    # Terminate session
    await mgr.close_session(session.session_id)
    assert session.is_alive() is False
