import os
from pathlib import Path
from typing import Dict, List, Optional
from .parser import parse_skill_markdown, SkillMetadata

class SkillsManager:
    def __init__(self, skills_dirs: Optional[List[str]] = None):
        if skills_dirs is None:
            home = Path.home() / ".sirona" / "skills"
            self.skills_dirs = [str(home)]
        else:
            self.skills_dirs = skills_dirs

        self._skills: Dict[str, SkillMetadata] = {}
        self._enabled_state: Dict[str, bool] = {}

    def discover_skills(self) -> List[SkillMetadata]:
        self._skills.clear()
        for sdir in self.skills_dirs:
            p = Path(sdir)
            if not p.exists() or not p.is_dir():
                continue
            
            # Find all SKILL.md or skill.md files
            for file_path in p.rglob("SKILL.md"):
                try:
                    content = file_path.read_text(encoding="utf-8")
                    skill = parse_skill_markdown(content, path=str(file_path))
                    self._skills[skill.name] = skill
                    if skill.name not in self._enabled_state:
                        self._enabled_state[skill.name] = True
                except Exception:
                    continue

        return list(self._skills.values())

    def list_skills(self) -> List[SkillMetadata]:
        if not self._skills:
            return self.discover_skills()
        return list(self._skills.values())

    def is_enabled(self, name: str) -> bool:
        return self._enabled_state.get(name, True)

    def set_enabled(self, name: str, enabled: bool) -> None:
        self._enabled_state[name] = enabled

    def get_skill(self, name: str) -> Optional[SkillMetadata]:
        return self._skills.get(name)
