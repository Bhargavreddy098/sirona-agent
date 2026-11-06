# Agent Implementation Guide: Agent Runtime & ReAct Loop

This guide details how to work with Sirona's agent runtime, ReAct coordinator, and turn lease manager.

---

## 1. Key Source Files
- Turn Coordinator: [`apps/server/services/conversationTurnCoordinator.js`](file:///apps/server/services/conversationTurnCoordinator.js)
- ReAct Engine: [`apps/server/services/agentExecutionEngine.js`](file:///apps/server/services/agentExecutionEngine.js)
- Turn Lease Service: [`apps/server/services/turnLeaseService.js`](file:///apps/server/services/turnLeaseService.js)
- Routes: [`apps/server/routes/v1/execution.routes.js`](file:///apps/server/routes/v1/execution.routes.js)
- Frontend Turn Hook: [`apps/web/src/api/useSirona.ts`](file:///apps/web/src/api/useSirona.ts)

---

## 2. ReAct Loop Implementation Pattern

```javascript
async function executeTurnLoop(turnContext) {
  const { conversationId, turnId, modelId, signal } = turnContext;
  let step = 0;
  const maxSteps = 25;

  while (step < maxSteps) {
    if (signal.aborted) throw new AbortError("Turn aborted by user");
    step++;

    // 1. Emit step.start
    emitSSE("step.start", { turnId, stepIndex: step, maxSteps });

    // 2. Fetch model completion with active tools definition
    const modelResponse = await aiService.streamTurn({
      conversationId,
      modelId,
      tools: toolRuntimeService.getRegisteredTools(),
      signal,
    });

    // 3. Handle model tool calls
    if (modelResponse.toolCalls?.length) {
      for (const call of modelResponse.toolCalls) {
        // Governance risk check
        const approval = await governanceService.evaluateRisk(call.toolName, call.args);
        if (approval.requiresHumanAction) {
          emitSSE("approval.requested", approval);
          await governanceService.waitForDecision(approval.id, signal);
        }

        // Execute tool inside sandbox
        const toolResult = await toolRuntimeService.executeTool(call.toolName, call.args);
        emitSSE("tool.result", { callId: call.id, toolName: call.toolName, result: toolResult });
        
        // Append result to conversation history
        await conversationService.appendToolResult(conversationId, call.id, toolResult);
      }
    } else {
      // No more tool calls: model has provided its final response
      break;
    }
  }

  emitSSE("turn.finish", { turnId, finishReason: "stop" });
}
```

---

## 3. Best Practices
- Always wrap turn execution in `try ... finally` to ensure `turnLeaseService.releaseLease(leaseId)` is called, even on unexpected process errors or unhandled rejections.
- Maintain a monotonic `stepIndex` to allow the frontend to render sequential thought blocks accurately.
- Never write unhandled exceptions directly into LLM prompts without sanitization.
