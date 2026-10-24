from typing import Any, Callable, Dict, List, Optional
from ..tools.registry import ToolRegistry

class McpManager:
    def __init__(self, tool_registry: ToolRegistry):
        self.tool_registry = tool_registry
        self._servers: Dict[str, Dict[str, Any]] = {}

    def add_server(
        self,
        name: str,
        command: str,
        args: Optional[List[str]] = None,
        env: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        info = {
            "name": name,
            "command": command,
            "args": args or [],
            "env": env or {},
            "status": "configured"
        }
        self._servers[name] = info
        return info

    def list_servers(self) -> List[Dict[str, Any]]:
        return list(self._servers.values())

    def remove_server(self, name: str) -> bool:
        if name in self._servers:
            del self._servers[name]
            return True
        return False

    def inject_tool(
        self,
        server_name: str,
        tool_name: str,
        description: str,
        func: Callable[..., Any],
        danger_level: str = "safe"
    ) -> None:
        """Register an MCP tool into the global Sirona Tool Registry."""
        self.tool_registry.register(
            name=tool_name,
            description=f"[{server_name}] {description}",
            danger_level=danger_level
        )(func)
