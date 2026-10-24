import pytest
import tempfile
from pathlib import Path
from sirona.skills.parser import parse_skill_markdown, SkillMetadata
from sirona.skills.manager import SkillsManager
from sirona.mcp.manager import McpManager
from sirona.tools.registry import ToolRegistry

SAMPLE_SKILL = """---
name: sample-analyzer
description: High-performance code analysis skill
metadata:
  version: "1.0.0"
---

# Code Analyzer Instructions
Follow these steps to analyze the repository:
1. Locate source files.
2. Run linters.
"""

def test_parse_skill_markdown():
    skill = parse_skill_markdown(SAMPLE_SKILL)
    assert skill.name == "sample-analyzer"
    assert "High-performance" in skill.description
    assert "# Code Analyzer Instructions" in skill.instructions

def test_skills_manager():
    with tempfile.TemporaryDirectory() as tmpdir:
        skill_dir = Path(tmpdir) / "skills" / "analyzer"
        skill_dir.mkdir(parents=True)
        skill_file = skill_dir / "SKILL.md"
        skill_file.write_text(SAMPLE_SKILL, encoding="utf-8")

        mgr = SkillsManager(skills_dirs=[str(Path(tmpdir) / "skills")])
        skills = mgr.discover_skills()
        assert len(skills) == 1
        assert skills[0].name == "sample-analyzer"

        # Toggle skill
        assert mgr.is_enabled("sample-analyzer") is True
        mgr.set_enabled("sample-analyzer", False)
        assert mgr.is_enabled("sample-analyzer") is False

def test_mcp_manager():
    tool_reg = ToolRegistry()
    mcp_mgr = McpManager(tool_registry=tool_reg)
    
    # Register mock MCP server config
    mcp_mgr.add_server(
        name="test-server",
        command="node",
        args=["server.js"],
        env={"NODE_ENV": "production"}
    )
    
    servers = mcp_mgr.list_servers()
    assert len(servers) == 1
    assert servers[0]["name"] == "test-server"
    
    # Mock inject an MCP tool into Sirona's ToolRegistry
    mcp_mgr.inject_tool(
        server_name="test-server",
        tool_name="mcp_fetch",
        description="Fetch a remote resource",
        func=lambda url: f"Fetched {url}"
    )
    
    tool = tool_reg.get_tool("mcp_fetch")
    assert tool is not None
    assert tool.execute({"url": "https://example.com"}) if hasattr(tool, "execute") else tool_reg.execute("mcp_fetch", {"url": "https://example.com"}) == "Fetched https://example.com"
