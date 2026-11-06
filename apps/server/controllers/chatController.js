import { Session } from "../model/Session.js";
import { Message } from "../model/Message.js";
import { turnLeaseService } from "../services/turnLeaseService.js";
import { AIService } from "../services/aiService.js";
import { emitToSession } from "../services/socket.js";
import { auditLogger } from "../services/auditLogger.js";

/* =====================================================================
   Chat Execution Controller — ReAct Loop & Lease-Safe Streaming
   ===================================================================== */

export const chatController = {
  async sendPrompt(req, res, next) {
    const sessionId = req.params.id;
    const { prompt, reasoning_effort = "medium" } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ success: false, message: "Prompt cannot be empty" });
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    let leaseToken = null;
    const startTime = Date.now();

    try {
      // 1. Acquire turn lease (prevent conflicting concurrent turns)
      leaseToken = await turnLeaseService.acquireLease(sessionId, "express-chat", 10.0, 1800);

      // 2. Pre-flight user prompt persistence (Zero-loss on crash)
      const userMessage = await Message.create({
        session_id: sessionId,
        role: "user",
        content: prompt.trim(),
      });

      await Session.incrementMessageCount(sessionId, Math.ceil(prompt.length / 4), 0);
      emitToSession(sessionId, "message", userMessage);

      // 3. Fetch session history for AI context
      const historyData = await Message.findBySession(sessionId, { activeOnly: true, limit: 50 });
      const messagesForAI = historyData.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // 4. Stream AI completion
      let streamedTokens = "";
      let reasoningContent = "";

      const aiResult = await AIService.streamTurn({
        model: session.model || "gemini-2.5-flash",
        systemPrompt: session.system_prompt || "You are Sirona, an expert pair programmer.",
        messages: messagesForAI,
        reasoningEffort: reasoning_effort || session.reasoning_effort,
        onToken: (token) => {
          streamedTokens += token;
          emitToSession(sessionId, "stream.token", { token, session_id: sessionId });
        },
        onReasoning: (thought) => {
          reasoningContent += thought;
          emitToSession(sessionId, "stream.reasoning", { thought, session_id: sessionId });
        },
      });

      const durationMs = Date.now() - startTime;

      // 5. Persist assistant completion message
      const assistantMessage = await Message.create({
        session_id: sessionId,
        role: "assistant",
        content: aiResult.content,
        reasoning: aiResult.reasoning || reasoningContent,
        tokens: aiResult.tokens || Math.ceil(aiResult.content.length / 4),
        duration_ms: durationMs,
      });

      await Session.incrementMessageCount(sessionId, 0, aiResult.tokens || 0);
      emitToSession(sessionId, "stream.done", { message_id: assistantMessage.id });
      emitToSession(sessionId, "message", assistantMessage);

      auditLogger.log(req, "chat.turn", {
        resourceType: "session",
        resourceId: sessionId,
        details: { duration_ms: durationMs, tokens: aiResult.tokens },
      });

      res.json({
        success: true,
        response: aiResult.content,
        tool_calls: aiResult.tool_calls || [],
      });
    } catch (err) {
      emitToSession(sessionId, "stream.error", { error: err.message });
      next(err);
    } finally {
      // 7. Always release lease
      if (leaseToken) {
        await turnLeaseService.releaseLease(leaseToken).catch(() => {});
      }
    }
  },
};

export default chatController;
