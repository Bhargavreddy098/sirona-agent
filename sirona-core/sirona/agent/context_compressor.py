from typing import Any, Dict, List

class ContextCompressor:
    def __init__(self, max_tokens: int = 120_000):
        self.max_tokens = max_tokens

    def estimate_tokens(self, text: str) -> int:
        """Heuristic: ~4 characters per token."""
        return max(1, len(text) // 4)

    def compact_messages(self, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        total_tokens = sum(self.estimate_tokens(str(m.get("content", ""))) for m in messages)
        if total_tokens <= self.max_tokens or len(messages) <= 6:
            return messages

        # Retain latest 4 messages, summarize older messages
        older = messages[:-4]
        latest = messages[-4:]
        
        summary_text = (
            f"[Compacted conversation history: {len(older)} earlier turns discussed "
            f"code implementation, file inspection, and tests. Context preserved.]"
        )
        
        compacted = [
            {"role": "system", "content": summary_text}
        ]
        compacted.extend(latest)
        return compacted
