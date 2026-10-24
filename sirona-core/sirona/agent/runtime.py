import asyncio
import inspect
import json
import time
import uuid
from typing import Any, AsyncIterator, Dict, List, Optional
from ..database.sessions import SessionRepository
from ..database.messages import MessageRepository
from ..tools.registry import ToolRegistry
from ..providers.base import LLMProvider, StreamChunk
from .approvals import ApprovalManager
from .prompt_builder import PromptBuilder
from .context_compressor import ContextCompressor
from .turn_context import TurnContext

class AgentRuntime:
    def __init__(
        self,
        session_repo: SessionRepository,
        message_repo: MessageRepository,
        tool_registry: ToolRegistry,
        approval_manager: ApprovalManager,
        provider: LLMProvider,
        prompt_builder: Optional[PromptBuilder] = None,
        context_compressor: Optional[ContextCompressor] = None
    ):
        self.session_repo = session_repo
        self.message_repo = message_repo
        self.tool_registry = tool_registry
        self.approval_manager = approval_manager
        self.provider = provider
        self.prompt_builder = prompt_builder or PromptBuilder()
        self.context_compressor = context_compressor or ContextCompressor()

    async def run_turn(
        self,
        session_id: str,
        prompt: str,
        attachments: Optional[List[Dict[str, Any]]] = None,
        reasoning_effort: str = "medium",
        cancel_token: Optional[asyncio.Event] = None,
        turn_id: Optional[str] = None
    ) -> AsyncIterator[Dict[str, Any]]:
        tid = turn_id or f"turn_{uuid.uuid4().hex[:10]}"
        session = await self.session_repo.get_session(session_id)
        if not session:
            yield {"type": "error", "error": f"Session {session_id} not found"}
            return

        # Check early cancellation
        if cancel_token and cancel_token.is_set():
            yield {"type": "turn.interrupted", "turn_id": tid, "session_id": session_id}
            return

        # 1. Save user message to database
        user_msg = await self.message_repo.add_message(
            session_id=session_id,
            role="user",
            content=prompt
        )
        yield {
            "type": "user_message",
            "message_id": user_msg.id,
            "content": prompt,
            "session_id": session_id,
            "turn_id": tid
        }

        step_count = 0
        max_steps = 15

        while step_count < max_steps:
            if cancel_token and cancel_token.is_set():
                yield {"type": "turn.interrupted", "turn_id": tid, "session_id": session_id}
                return

            step_count += 1

            # Fetch message history
            history_records = await self.message_repo.get_messages(session_id, limit=50)
            formatted_messages = [
                {"role": r.role, "content": r.content or ""}
                for r in history_records
            ]

            # Inject system prompt
            system_prompt = self.prompt_builder.build_system_prompt(session.system_prompt)
            full_context = [{"role": "system", "content": system_prompt}] + formatted_messages
            compressed_context = self.context_compressor.compact_messages(full_context)

            tools_schema = self.tool_registry.export_schemas()

            tool_call_pending = None
            assistant_text = ""
            reasoning_text = ""

            # Stream from model
            async for chunk in self.provider.stream_chat(
                messages=compressed_context,
                tools=tools_schema,
                reasoning_effort=reasoning_effort
            ):
                if cancel_token and cancel_token.is_set():
                    yield {"type": "turn.interrupted", "turn_id": tid, "session_id": session_id}
                    return

                if chunk.type == "text" and chunk.content:
                    assistant_text += chunk.content
                    yield {
                        "type": "stream.token",
                        "token": chunk.content,
                        "turn_id": tid,
                        "session_id": session_id,
                    }
                    yield {
                        "type": "message.delta",
                        "delta": chunk.content,
                        "turn_id": tid,
                        "session_id": session_id,
                    }
                elif chunk.type == "reasoning" and chunk.content:
                    reasoning_text += chunk.content
                    yield {
                        "type": "stream.reasoning",
                        "token": chunk.content,
                        "turn_id": tid,
                        "session_id": session_id,
                    }
                    yield {
                        "type": "reasoning.delta",
                        "delta": chunk.content,
                        "turn_id": tid,
                        "session_id": session_id,
                    }
                elif chunk.type == "tool_call":
                    tool_call_pending = chunk

            # If tool call was issued
            if tool_call_pending:
                tool_name = tool_call_pending.tool_name
                tool_args = tool_call_pending.tool_args or {}
                call_id = tool_call_pending.tool_call_id or f"call_{uuid.uuid4().hex[:8]}"

                yield {
                    "type": "tool_start",
                    "tool_name": tool_name,
                    "tool_call_id": call_id,
                    "args": tool_args,
                    "session_id": session_id,
                    "turn_id": tid,
                }

                tool_def = self.tool_registry.get_tool(tool_name)

                # Approval check
                if tool_def and tool_def.danger_level == "requires_approval":
                    prompt_id = f"appr_{uuid.uuid4().hex[:10]}"
                    yield {
                        "type": "approval.request",
                        "prompt_id": prompt_id,
                        "tool_name": tool_name,
                        "tool_args": tool_args,
                        "danger_level": tool_def.danger_level,
                        "session_id": session_id,
                        "turn_id": tid,
                    }
                    yield {
                        "type": "approval_request",
                        "prompt_id": prompt_id,
                        "tool_name": tool_name,
                        "args": tool_args,
                        "danger_level": tool_def.danger_level,
                        "session_id": session_id,
                        "turn_id": tid,
                    }
                    approval_res = await self.approval_manager.request_approval(
                        session_id=session_id,
                        tool_name=tool_name,
                        tool_args=tool_args,
                        danger_level=tool_def.danger_level,
                        prompt_id=prompt_id,
                    )

                    if cancel_token and cancel_token.is_set():
                        yield {"type": "turn.interrupted", "turn_id": tid, "session_id": session_id}
                        return

                    if not approval_res.get("approved"):
                        tool_result = "Execution Denied by User."
                        yield {
                            "type": "tool_complete",
                            "tool_call_id": call_id,
                            "result": tool_result,
                            "approved": False,
                            "session_id": session_id,
                            "turn_id": tid,
                        }
                        await self.message_repo.add_message(
                            session_id=session_id,
                            role="tool",
                            content=tool_result,
                            tool_call_id=call_id,
                            tool_name=tool_name
                        )
                        continue

                # Execute tool
                if cancel_token and cancel_token.is_set():
                    yield {"type": "turn.interrupted", "turn_id": tid, "session_id": session_id}
                    return

                start_time = time.time()
                try:
                    if tool_def:
                        if inspect.iscoroutinefunction(tool_def.func):
                            exec_res = await tool_def.func(**tool_args)
                        else:
                            exec_res = tool_def.func(**tool_args)
                    else:
                        exec_res = f"Error: Tool '{tool_name}' not found."
                except Exception as exc:
                    exec_res = f"Execution error in '{tool_name}': {str(exc)}"

                duration_ms = int((time.time() - start_time) * 1000)
                str_res = str(exec_res) if not isinstance(exec_res, (dict, list)) else json.dumps(exec_res)

                yield {
                    "type": "tool_complete",
                    "tool_call_id": call_id,
                    "result": str_res,
                    "duration_ms": duration_ms,
                    "session_id": session_id,
                    "turn_id": tid,
                }

                # Save tool response to transcript
                await self.message_repo.add_message(
                    session_id=session_id,
                    role="tool",
                    content=str_res,
                    tool_call_id=call_id,
                    tool_name=tool_name
                )
                continue

            # Final assistant response reached
            if assistant_text:
                saved_msg = await self.message_repo.add_message(
                    session_id=session_id,
                    role="assistant",
                    content=assistant_text,
                    reasoning=reasoning_text
                )
                yield {
                    "type": "message_complete",
                    "message_id": saved_msg.id,
                    "content": assistant_text,
                    "turn_id": tid,
                    "session_id": session_id,
                }
                yield {
                    "type": "turn.complete",
                    "response": assistant_text,
                    "message_id": saved_msg.id,
                    "turn_id": tid,
                    "session_id": session_id,
                }
                break
