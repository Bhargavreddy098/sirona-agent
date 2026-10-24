import pytest
import os
import tempfile
from pathlib import Path
from sirona.tools.registry import ToolRegistry, ToolDefinition
from sirona.tools.filesystem import read_file, write_file, edit_file, list_dir
from sirona.tools.terminal import run_shell
from sirona.tools.python_repl import execute_python

@pytest.fixture
def registry():
    reg = ToolRegistry()
    return reg

def test_tool_registration(registry):
    @registry.register(
        name="calculate_sum",
        description="Calculates the sum of two integers",
        danger_level="safe"
    )
    def calculate_sum(a: int, b: int) -> int:
        return a + b

    tool = registry.get_tool("calculate_sum")
    assert tool is not None
    assert tool.name == "calculate_sum"
    assert tool.danger_level == "safe"
    
    # Check JSON Schema generation
    schemas = registry.export_schemas()
    assert len(schemas) == 1
    assert schemas[0]["function"]["name"] == "calculate_sum"
    assert "a" in schemas[0]["function"]["parameters"]["properties"]
    assert "b" in schemas[0]["function"]["parameters"]["properties"]

    # Execute tool
    result = registry.execute("calculate_sum", {"a": 5, "b": 10})
    assert result == 15

def test_filesystem_tools():
    with tempfile.TemporaryDirectory() as tmpdir:
        test_file = Path(tmpdir) / "sample.txt"
        
        # Write file
        w_res = write_file(str(test_file), "Line 1\nLine 2\nLine 3\n")
        assert w_res["success"] is True
        assert test_file.exists()
        
        # Read file
        r_res = read_file(str(test_file))
        assert r_res["success"] is True
        assert "Line 2" in r_res["content"]
        
        # Edit file (exact target replacement)
        e_res = edit_file(str(test_file), target="Line 2", replacement="Line Two (Replaced)")
        assert e_res["success"] is True
        
        # Verify read after edit
        r_res2 = read_file(str(test_file))
        assert "Line Two (Replaced)" in r_res2["content"]
        assert "Line 2" not in r_res2["content"]
        
        # List dir
        l_res = list_dir(tmpdir)
        assert l_res["success"] is True
        assert any(item["name"] == "sample.txt" for item in l_res["entries"])

@pytest.mark.asyncio
async def test_terminal_tool():
    res = await run_shell("echo SironaAgentTest")
    assert res["exit_code"] == 0
    assert "SironaAgentTest" in res["stdout"]

def test_python_repl():
    res = execute_python("x = 10\ny = 20\nprint(x + y)")
    assert res["success"] is True
    assert "30" in res["stdout"]
