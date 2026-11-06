import { createDatabaseOwner, activateDatabaseOwner } from "../config/db.js";
import { createRedisOwner, activateRedisOwner } from "../config/redis.js";
import { initSocket, closeSocket } from "../services/socket.js";
import { createHttpBoundary } from "../middleware/httpBoundary.js";
import { sendProblem } from "../middleware/problem.js";
import { failure } from "./bounded.js";
import { stage01Admission, stage17Admission } from "./admission.js";
import {createTerminalGateway} from '../services/terminalGateway.js';

export const productionFactories = {
  database({ config, logger }) {
    const owner = createDatabaseOwner(config.database, logger);
    const initialize = owner.initialize;
    owner.initialize = async () => { activateDatabaseOwner(owner); await initialize(); };
    return owner;
  },
  cache({ config, logger }) {
    const owner = createRedisOwner({ ...config.cache, timeoutMs: Math.min(1000, config.startupTimeoutMs) }, logger);
    const initialize = owner.initialize;
    owner.initialize = async () => { activateRedisOwner(owner); await initialize(); };
    return owner;
  },
  application({ config, signal }) {
    let limiterOwner;
    let graphOwner;
    let graphModule;
    const owner = { async initialize() {
      const [routes, audit, limiter, leases] = await Promise.all([
        import("../routes/index.js"), import("../middleware/auditContext.js"),
        import("../middleware/rateLimiter.js"), import("../model/TurnLease.js"),
      ]);
      if (signal.aborted) throw failure("STARTUP_CANCELLED");
      graphModule=await import('../dist-workspace/src/orchestration/graphRuntime.js');
      const database=await import('../config/db.js');
      graphOwner=new graphModule.WorkspaceGraphRuntime(database);
      graphModule.configureWorkspaceGraphRuntime(graphOwner);
      limiterOwner = limiter.createRateLimiterOwner(config.rateLimit);
      const admission = process.env.R04_TEST_SCENARIO ? stage01Admission : stage17Admission;
      Object.assign(owner, { routes: routes.default, admission, auditContext: audit.auditContext,
        rateLimiter: limiterOwner.middleware, cleanExpiredLeases: () => leases.TurnLease.cleanExpired() });
    }, async close() { try{if(graphOwner)await graphOwner.close();}finally{if(graphOwner)graphModule.clearWorkspaceGraphRuntime(graphOwner);if (limiterOwner) await limiterOwner.close();} } };
    return owner;
  },
  realtime({ config, server, accepting, logger }) {
    let io;
    let terminalGateway;
    let closing;
    const boundary = createHttpBoundary(config.allowedOrigins, stage01Admission);
    return { initialize() {
      io = initSocket(server, (req, res, next) => boundary(req, res, () => {
        if (!accepting()) return sendProblem(req, res, 503, "Backend is stopping");
        next();
      // Stage 01 admits no realtime clients. Do not construct an unqualified
      // subscriber/adapter merely because the optional cache is available.
      }), logger, { redisAdapter: false });
      if(!process.env.R04_TEST_SCENARIO)terminalGateway=createTerminalGateway(server,{allowedOrigins:config.allowedOrigins,accepting});
    }, close() { closing ??= Promise.resolve().then(async() => {try{await terminalGateway?.close();}finally{await closeSocket(io);}}); return closing; } };
  },
};
