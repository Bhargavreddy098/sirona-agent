import re
from typing import Any, Dict, Optional
import yaml
from pydantic import BaseModel, Field

class SkillMetadata(BaseModel):
    name: str
    description: str
    instructions: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    path: Optional[str] = None

def parse_skill_markdown(content: str, path: Optional[str] = None) -> SkillMetadata:
    """Parse a SKILL.md file with YAML frontmatter and Markdown body."""
    frontmatter_pattern = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
    match = frontmatter_pattern.match(content)
    
    if match:
        yaml_content = match.group(1)
        markdown_body = content[match.end():].strip()
        data = yaml.safe_load(yaml_content) or {}
    else:
        data = {}
        markdown_body = content.strip()

    name = data.get("name", "unnamed-skill")
    description = data.get("description", "No description provided.")
    extra_meta = data.get("metadata", {})

    return SkillMetadata(
        name=name,
        description=description,
        instructions=markdown_body,
        metadata=extra_meta,
        path=path
    )
