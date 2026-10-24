import inspect
from typing import Any, Callable, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field

class ToolDefinition(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    name: str
    description: str
    func: Callable[..., Any]
    parameters: Dict[str, Any]
    danger_level: str = "safe"  # "safe", "requires_approval", "forbidden"

class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, ToolDefinition] = {}

    def register(
        self,
        name: Optional[str] = None,
        description: Optional[str] = None,
        danger_level: str = "safe"
    ) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
        def decorator(fn: Callable[..., Any]) -> Callable[..., Any]:
            tool_name = name or fn.__name__
            tool_desc = description or fn.__doc__ or "No description provided."
            
            sig = inspect.signature(fn)
            properties: Dict[str, Any] = {}
            required: List[str] = []

            type_map = {
                int: "integer",
                float: "number",
                str: "string",
                bool: "boolean",
                list: "array",
                dict: "object",
            }

            for param_name, param in sig.parameters.items():
                if param_name in ("self", "cls"):
                    continue
                param_type = "string"
                if param.annotation != inspect.Parameter.empty:
                    param_type = type_map.get(param.annotation, "string")

                properties[param_name] = {
                    "type": param_type,
                    "description": f"Parameter {param_name}"
                }
                if param.default == inspect.Parameter.empty:
                    required.append(param_name)

            params_schema = {
                "type": "object",
                "properties": properties,
                "required": required
            }

            self._tools[tool_name] = ToolDefinition(
                name=tool_name,
                description=tool_desc.strip(),
                func=fn,
                parameters=params_schema,
                danger_level=danger_level
            )
            return fn

        return decorator

    def get_tool(self, name: str) -> Optional[ToolDefinition]:
        return self._tools.get(name)

    def list_tools(self) -> List[ToolDefinition]:
        return list(self._tools.values())

    def export_schemas(self) -> List[Dict[str, Any]]:
        """Export tools in standard OpenAI / tool-calling format."""
        schemas = []
        for tool in self._tools.values():
            schemas.append({
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.parameters
                }
            })
        return schemas

    def execute(self, name: str, args: Dict[str, Any]) -> Any:
        tool = self.get_tool(name)
        if not tool:
            raise ValueError(f"Tool '{name}' not found in registry")
        return tool.func(**args)

default_tool_registry = ToolRegistry()
