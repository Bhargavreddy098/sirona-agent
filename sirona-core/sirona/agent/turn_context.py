import time
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class TurnContext(BaseModel):
    session_id: str
    turn_id: str
    prompt: str
    cwd: Optional[str] = None
    model: str = "gemini-2.5-flash"
    reasoning_effort: str = "medium"
    step_count: int = 0
    max_steps: int = 25
    started_at: float = Field(default_factory=time.time)
    input_tokens: int = 0
    output_tokens: int = 0
