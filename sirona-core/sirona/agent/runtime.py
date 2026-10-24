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
from .clarify import ClarifyManager
from .prompt_builder import PromptBuilder
from .context_compressor import ContextCompressor
from .turn_context import TurnContext
from .turn_lease import SessionTurnLeaseRegistry, TurnLeaseToken

class AgentRuntime:
    def __init__(
        self,
        session_repo: SessionRepository,
        message_repo: MessageRepository,
        tool_registry: ToolRegistry,
        approval_manager: ApprovalManager,
        provider: LLMProvider,
        prompt_builder: Optional[PromptBuilder] = None,
        context_compressor: Optional[ContextCompressor] = None,
        clarify_manager: Optional[ClarifyManager] = None,
        lease_registry: Optional[SessionTurnLeaseRegistry] = None,
    ):
        self.session_repo = session_repo
        self.message_repo = message_repo
        self.tool_registry = tool_registry
        self.approval_manager = approval_manager
        self.provider = provider
        self.prompt_builder = prompt_builder or PromptBuilder()
        self.context_compressor = context_compressor or ContextCompressor()
        self.clarify_manager = clarify_manager
        self.lease_registry = lease_registry

    async def run_turn(
        self,
        session_id: str,
        prompt: str,
        attachments: Optional[List[Dict[str, Any]]] = None,
        reasoning_effort: str = "medium",
        cancel_token: Optional[asyncio.Event] = None,
        turn_id: Optional[str] = None,
        user_message_id: Optional[int] = None,
        turn_lease: Optional[TurnLeaseToken] = None,
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

        # Acquire turn lease if not supplied by caller
        active_lease = turn_lease
        owned_lease = False
        if not active_lease and self.lease_registry:
            active_lease = await self.lease_registry.acquire(session_id, owner_key=tid)
            owned_lease = True

        try:
            # 1. Message adoption logic (Hermes adopt_submit_user_row pattern)
            user_msg = None
            if user_message_id is not None:
                user_msg = await self.message_repo.get_message_by_id(user_message_id)
                if user_msg:
                    await self.message_repo.adopt_message(user_msg.id, tid)

            if not user_msg:
                recent = await self.message_repo.find_recent_unadopted_user_message(session_id, prompt)
                if recent:
                    user_msg = recent
                    await self.message_repo.adopt_message(user_msg.id, tid)
                else:
                    user_msg = await self.message_repo.add_message(
                        session_id=session_id,
                        role="user",
                        content=prompt,
                        metadata={"adopted_turn_id": tid, "adoption_status": "adopted"}
                    )

            yield {
                "type": "user_message",
                "message_id": user_msg.id,
                "content": prompt,
                "session_id": session_id,
                "turn_id": tid,
                "generation": active_lease.generation if active_lease else 1,
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
    
                # Notify message start
                yield {
                    "type": "message.start",
                    "role": "assistant",
                    "turn_id": tid,
                    "session_id": session_id,
                }
    
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
                        "type": "tool.start",
                        "tool_name": tool_name,
                        "tool_call_id": call_id,
                        "args": tool_args,
                        "session_id": session_id,
                        "turn_id": tid,
                    }
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
                                "type": "tool.complete",
                                "tool_call_id": call_id,
                                "result": tool_result,
                                "approved": False,
                                "session_id": session_id,
                                "turn_id": tid,
                            }
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
                        if tool_name in ("ask_question", "clarify") and self.clarify_manager:
                            raw_qs = tool_args.get("questions")
                            if not raw_qs:
                                raw_qs = [{
                                    "qid": "q1",
                                    "question": tool_args.get("question", "Clarification needed:"),
                                    "choices": tool_args.get("choices") or tool_args.get("options"),
                                    "multi_select": tool_args.get("multi_select", False)
                                }]
                            clarify_res = await self.clarify_manager.request_clarification(
                                session_id=session_id,
                                questions=raw_qs,
                            )
                            exec_res = clarify_res.get("answers") or "User skipped or provided no answer."
                        elif tool_def:
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
                        "type": "tool.complete",
                        "tool_call_id": call_id,
                        "result": str_res,
                        "duration_ms": duration_ms,
                        "session_id": session_id,
                        "turn_id": tid,
                    }
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
        finally:
            if owned_lease and active_lease and self.lease_registry:
                await self.lease_registry.release(active_lease)

