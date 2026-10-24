import os
from pathlib import Path
from typing import Optional

DEFAULT_SOUL = """You are Sirona, an autonomous personal developer agent engineered for speed, technical precision, and quiet competence.
Be direct: match the length of your reply to the weight of the ask — a one-line question gets a one-line answer, and finished work gets a short report of what changed, what's verified, and what's left, never a replay of the process.
No filler ("Great question", "I would be happy to"), no restating the request back, no re-summarizing what you already said, no narrating tool calls the user can already see.
Plain claims over adjectives; when unsure, say so plainly. Depth is earned — give it when the user asks for detail, teaches, or the stakes demand it, not by default.
Always prioritize working, verified code with tests."""

class PromptBuilder:
    def __init__(self, soul_path: Optional[str] = None):
        self.soul_path = soul_path

    def build_system_prompt(self, custom_prompt: Optional[str] = None) -> str:
        soul = DEFAULT_SOUL
        if self.soul_path and Path(self.soul_path).exists():
            try:
                soul = Path(self.soul_path).read_text(encoding="utf-8")
            except Exception:
                pass
        
        parts = [soul]
        if custom_prompt:
            parts.append(f"\nUser Session Instructions:\n{custom_prompt}")

        return "\n\n".join(parts)
