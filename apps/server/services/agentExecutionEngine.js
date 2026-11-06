// @ts-check
import crypto from "crypto";
import { AIService } from "./aiService.js";
import { ToolRuntimeService } from "./toolRuntimeService.js";
import { SandboxManager } from "./sandboxManager.js";

/**
 * Custom error for Agent Execution Engine failures.
 */
export class AgentExecutionError extends Error {
  /**
   * @param {string} code
   * @param {number} status
   * @param {string} message
   */
  constructor(code, status, message) {
    super(message);
    this.name = "AgentExecutionError";
    this.code = code;
    this.status = status;
  }
}

/**
 * AgentExecutionEngine
 * Model-driven autonomous iterative ReAct tool-calling loop.
 * Coordinates model reasoning, tool invocations, workspace isolation,
 * test verification, and evidence-backed task completion.
 */
export class AgentExecutionEngine {
  /**
   * Execute an autonomous coding task through iterative model-driven tool calling.
   *
   * @param {{
   *   runId?: string | null,
   *   taskId?: string | null,
   *   projectId?: string | null,
   *   workspaceRoot: string,
   *   prompt: string,
   *   contextPack?: any,
   *   allowedTools?: string[],
   *   maxTurns?: number,
   *   model?: string,
   *   toolExecutor?: ((toolName: string, input: Record<string, unknown>) => Promise<any>) | null,
   *   onProgress?: ((progress: { turn: number, action?: string, summary?: string }) => void) | null,
   * }} options
   * @returns {Promise<{
   *   completed: boolean,
   *   summary: string,
   *   filesModified: string[],
   *   executionLogs: any[],
   *   turns: number,
   *   diff: string,
   * }>}
   */
  static async executeAgentTask({
    runId = null,
    taskId = null,
    projectId = null,
    workspaceRoot,
    prompt,
    contextPack = null,
    allowedTools = ["read_file", "write_file", "list_directory", "execute_command", "apply_patch", "propose_task_completion"],
    maxTurns = 12,
    model = "gemini-2.5-flash-lite",
    toolExecutor = null,
    modelExecutor = null,
    onProgress = null,
  }) {
    if (!workspaceRoot) {
      throw new AgentExecutionError("WORKSPACE_ROOT_REQUIRED", 400, "workspaceRoot is required for agent execution");
    }
    if (!prompt || typeof prompt !== "string") {
      throw new AgentExecutionError("PROMPT_REQUIRED", 400, "prompt is required for agent execution");
    }

    const systemPrompt = `You are Sirona, an expert autonomous developer agent.
You operate directly on the project workspace using tools.
Follow this systematic workflow:
1. Examine the project files and test suites using 'list_directory' and 'read_file'.
2. Implement requested changes or fixes using 'write_file' or 'apply_patch'.
3. Run project tests using 'execute_command' (e.g. node --test, npm test, pytest) to verify that your changes work.
4. If a test fails, inspect the error output, diagnose the root cause, fix the defect, and verify again.
5. Once your changes are verified and all tests pass, call 'propose_task_completion' with a concise summary.
Do not assume tests pass without running them. Make precise, clean, idiomatic changes.`;

    // 1. Build initial user prompt incorporating context pack if available
    let initialMessage = `### Objective\n${prompt}\n`;
    if (contextPack) {
      initialMessage += `\n### Repository Context\n- Context Pack Digest: ${contextPack.digest || "none"}\n`;
      if (contextPack.files && Array.isArray(contextPack.files)) {
        initialMessage += `- Key Files:\n${contextPack.files.slice(0, 15).map((f) => `  * ${f.path || f}`).join("\n")}\n`;
      }
      if (contextPack.summary) {
        initialMessage += `- Project Summary: ${contextPack.summary}\n`;
      }
    }
    initialMessage += `\nPlease inspect the relevant files, make the necessary modifications, run tests to verify, and complete the task.`;

    // 2. Prepare tools
    const toolSchemas = ToolRuntimeService.getStandardToolSchemas(allowedTools);

    // 3. Helper to invoke tools through ToolRuntimeService or custom toolExecutor
    const filesModifiedSet = new Set();
    const executionLogs = [];

    const invoke = async (toolName, input) => {
      if (toolExecutor) {
        return await toolExecutor(toolName, input);
      }
      return await ToolRuntimeService.invokeTool({
        toolName,
        input,
        workspaceRoot,
        projectId,
        runId,
        taskId,
      });
    };

    // 4. Conversation history
    const messages = [
      { role: "user", content: initialMessage },
    ];

    let isComplete = false;
    let finalSummary = "";
    let currentTurn = 0;

    while (currentTurn < maxTurns && !isComplete) {
      currentTurn++;
      if (currentTurn > 1) {
        await new Promise((r) => setTimeout(r, 1200));
      }
      if (onProgress) {
        onProgress({ turn: currentTurn, summary: `Starting turn ${currentTurn}` });
      }

      // Stream turn from LLM or modelExecutor
      let turnResult;
      try {
        if (modelExecutor) {
          turnResult = await modelExecutor({
            turn: currentTurn,
            messages,
            tools: toolSchemas,
            prompt,
            workspaceRoot,
          });
        } else {
          turnResult = await AIService.streamTurn({
            model,
            systemPrompt,
            messages,
            tools: toolSchemas,
          });
        }
      } catch (err) {
        executionLogs.push({ turn: currentTurn, error: err instanceof Error ? err.message : String(err) });
        throw new AgentExecutionError("MODEL_INVOCATION_FAILED", 502, `Model turn failed: ${err instanceof Error ? err.message : String(err)}`);
      }

      const toolCalls = turnResult.tool_calls || [];

      // Case A: Model emitted tool calls
      if (toolCalls.length > 0) {
        // Record assistant turn in messages preserving raw candidate parts (thoughtSignature)
        messages.push({
          role: "assistant",
          content: turnResult.content || "",
          tool_calls: toolCalls,
          _rawCandidate: turnResult.rawCandidate,
        });

        for (const call of toolCalls) {
          const toolName = call.name;
          const toolArgs = call.args || {};

          // Check if completion proposed
          if (toolName === "propose_task_completion") {
            isComplete = true;
            finalSummary = toolArgs.summary || "Task completed successfully.";
            if (Array.isArray(toolArgs.filesModified)) {
              for (const f of toolArgs.filesModified) filesModifiedSet.add(f);
            }
            executionLogs.push({
              turn: currentTurn,
              action: "propose_task_completion",
              summary: finalSummary,
              timestamp: new Date().toISOString(),
            });
            break;
          }

          // Execute tool
          const startTime = Date.now();
          let toolOutput = "";
          let isError = false;

          try {
            const res = await invoke(toolName, toolArgs);
            toolOutput = typeof res.output === "object" ? JSON.stringify(res.output) : String(res.output ?? "success");

            if (toolName === "write_file" && toolArgs.path) {
              filesModifiedSet.add(String(toolArgs.path));
            } else if (toolName === "apply_patch" && toolArgs.targetPath) {
              filesModifiedSet.add(String(toolArgs.targetPath));
            }
          } catch (err) {
            isError = true;
            toolOutput = `Tool error (${toolName}): ${err instanceof Error ? err.message : String(err)}`;
          }

          const durationMs = Date.now() - startTime;
          executionLogs.push({
            turn: currentTurn,
            tool: toolName,
            args: toolArgs,
            outputSnippet: toolOutput.slice(0, 500),
            durationMs,
            isError,
            timestamp: new Date().toISOString(),
          });

          // Append tool result for multi-turn continuation
          messages.push({
            role: "tool",
            name: toolName,
            tool_call_id: call.id || `call_${crypto.randomUUID().slice(0, 8)}`,
            content: toolOutput,
          });
        }
      } else {
        // Case B: Model did not emit tool call
        messages.push({
          role: "assistant",
          content: turnResult.content || "",
          _rawCandidate: turnResult.rawCandidate,
        });

        // If the model claimed completion in text but didn't invoke propose_task_completion
        const textLower = (turnResult.content || "").toLowerCase();
        if (textLower.includes("completed") || textLower.includes("all tests pass") || textLower.includes("done")) {
          // Nudge to formally call propose_task_completion or finalize
          messages.push({
            role: "user",
            content: "If you have verified that your changes work and all tests pass, please call 'propose_task_completion'. Otherwise, continue with any remaining tools.",
          });
        } else {
          messages.push({
            role: "user",
            content: "Please proceed with the next tool to inspect, modify, or verify the codebase.",
          });
        }
      }
    }

    // 5. Capture git diff
    let diff = "";
    try {
      const diffRes = await SandboxManager.execute({
        command: "git",
        args: ["diff"],
        workspaceRoot,
        timeoutMs: 10000,
      });
      diff = diffRes.stdout || "";
    } catch {
      diff = Array.from(filesModifiedSet).map((f) => `Modified file: ${f}`).join("\n");
    }

    return {
      completed: isComplete,
      summary: finalSummary || (isComplete ? "Completed" : "Max turns reached without explicit completion"),
      filesModified: Array.from(filesModifiedSet),
      executionLogs,
      turns: currentTurn,
      diff,
    };
  }
}

export default AgentExecutionEngine;
