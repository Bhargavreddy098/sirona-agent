import { emitToSession, broadcastEvent } from "./socket.js";
import { emailQueue } from "./queues/emailQueue.js";

/* =====================================================================
   Notification Dispatcher
   Coordinates push notifications via Socket.IO and emails via queue.
   ===================================================================== */

export const notificationDispatcher = {
  dispatchSessionNotification(sessionId, { type, title, message, data = {} }) {
    emitToSession(sessionId, "notification", {
      type,
      title,
      message,
      data,
      timestamp: Date.now(),
    });
  },

  dispatchApprovalAlert({ runId, promptId, sessionId, toolName, command, userEmail }) {
    // 1. Broadcast over WebSocket
    broadcastEvent("approval_request", {
      run_id: runId,
      prompt_id: promptId,
      session_id: sessionId,
      tool_name: toolName,
      command,
      timestamp: Date.now(),
    });

    // 2. Refuse unqualified email explicitly; never report it as queued or sent.
    if (userEmail) {
      emailQueue.add({
        to: userEmail,
        subject: `⚠️ Sirona Approval Request: ${toolName}`,
        html: `Action required in session ${sessionId}. Tool: ${toolName}`,
      });
    }
  },
};

export default notificationDispatcher;
