import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { redis, isRedisAvailable } from "../config/redis.js";

/* =====================================================================
   Socket.IO Gateway & Real-Time Duplex Protocol
   - Redis adapter support for multi-instance scaling
   - Session & User room isolation
   - Real-time token streaming and approval alerts
   ===================================================================== */

let io = null;
let subscriber = null;

/** @param {import('../foundation/contracts.js').EventLogger} logger */
export function initSocket(server, httpBoundary, logger = { event() {} }, { redisAdapter = true } = {}) {
  if (typeof httpBoundary !== "function") throw new TypeError("HTTP boundary is required");
  if (io) throw Object.assign(new Error("Realtime owner already exists"), { code: "RESOURCE_FAILED" });
  io = new Server(server, {
    // The separately authenticated terminal gateway owns its exact upgrade path.
    destroyUpgrade: false,
    pingTimeout: 20000,
    pingInterval: 10000,
  });
  // First Engine.IO middleware, including preflight and upgrade: never bypass Express policy.
  io.engine.use(httpBoundary);

  // Attach Redis adapter if Redis is alive
  if (redisAdapter && isRedisAvailable()) {
    try {
      const pubClient = redis;
      const subClient = pubClient.duplicate({ retryStrategy: () => null, enableOfflineQueue: false });
      subscriber = subClient;
      subClient.on("error", () => logger.event("dependency.unavailable", { category: "legacy", code: "RESOURCE_FAILED" }));
      io.adapter(createAdapter(pubClient, subClient));
      logger.event("dependency.ready", { category: "legacy" });
    } catch {
      subscriber?.disconnect(); subscriber = null;
      logger.event("dependency.unavailable", { category: "legacy", code: "RESOURCE_FAILED" });
    }
  }

  io.on("connection", (socket) => {
    // 1. Join session room
    socket.on("session:join", (payload) => {
      const id = typeof payload === "object" ? payload?.sessionId || payload?.id : payload;
      if (id) {
        socket.join(`session:${id}`);
      }
    });

    socket.on("session:leave", (payload) => {
      const id = typeof payload === "object" ? payload?.sessionId || payload?.id : payload;
      if (id) {
        socket.leave(`session:${id}`);
      }
    });

    // 2. Client ping/pong heartbeat
    socket.on("ping", (data) => {
      socket.emit("pong", { timestamp: Date.now(), ...data });
    });

    // 3. Approval response from client
    socket.on("approval:respond", async (data) => {
      const { runId, promptId, approved } = data || {};
      io.emit(`approval:${runId}:${promptId}`, { approved });
    });

    socket.on("disconnect", () => {
      // Clean disconnect
    });
  });

  return io;
}

export function getIO() {
  return io;
}

/** Close transport/adapter only. The lifecycle is the sole HTTP close owner. */
export async function closeSocket(owned = io) {
  if (!owned) return;
  try {
    owned.disconnectSockets(true);
    owned.engine.close();
    await owned.of("/").adapter.close();
  } finally {
    subscriber?.disconnect(); subscriber = null;
    if (io === owned) io = null;
  }
}

export function emitToSession(sessionId, event, payload) {
  if (io) {
    io.to(`session:${sessionId}`).emit(event, payload);
  }
}

export function emitToUser(userId, event, payload) {
  if (io) {
    io.to(`user:${userId}`).emit(event, payload);
  }
}

export function broadcastEvent(event, payload) {
  if (io) {
    io.emit(event, payload);
  }
}

export default {
  initSocket,
  getIO,
  emitToSession,
  emitToUser,
  broadcastEvent,
};
