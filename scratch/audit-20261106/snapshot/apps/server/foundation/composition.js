import { createApp } from "../app.js";
import { createHealthController } from "../controllers/healthController.js";
import { createLifecycle } from "./lifecycle.js";
import { bounded, failure } from "./bounded.js";

/** Production supervisor; tests inject external owners, never a competing composition path.
 * @param {(error?: Error) => void} onSignalStop
 */
export function composeBackend(config, factories, logger, signals = process, onSignalStop = () => {}) {
  const owners = [];
  const closers = new WeakMap();
  const abort = new AbortController();
  let phase = "created";
  let database, application, listener, realtime, app;
  let starting, stopping;
  let signalHandled = false;
  let startupCategory = "database";
  const context = { config, logger, signal: abort.signal };
  const alive = () => { if (abort.signal.aborted) throw failure("STARTUP_CANCELLED"); };
  function construct(category, factory) {
    alive();
    const owner = factory(context);
    if (owner && typeof owner.close === "function") {
      let closing;
      const close = () => { closing ??= Promise.resolve().then(() => owner.close()); return closing; };
      closers.set(owner, close); owners.push({ category, owner, close });
    }
    if (!owner || typeof owner.close !== "function" || typeof owner.initialize !== "function") throw failure("RESOURCE_FAILED");
    return owner;
  }
  const ready = async () => phase === "listening" && await database.ready() === true && phase === "listening";
  function signalStop() {
    if (signalHandled) return;
    signalHandled = true;
    stop().then(() => onSignalStop(), error => { signals.exitCode = 1; onSignalStop(error); });
  }
  function stop() {
    if (stopping) return stopping;
    phase = "stopping";
    abort.abort();
    logger.event("backend.stopping");
    stopping = (async () => {
      const end = Date.now() + config.shutdownTimeoutMs;
      let firstError;
      const close = async (category, action) => {
        try { await bounded(action, end - Date.now(), "SHUTDOWN_TIMEOUT"); }
        catch (error) { firstError ??= error; logger.event("backend.shutdown_failed", { category, code: "CLEANUP_FAILED" }); }
      };
      // Close HTTP acceptance immediately; realtime is closed before awaiting HTTP drainage.
      const httpClosing = listener ? listener.stop().then(() => null, error => error) : Promise.resolve(null);
      if (realtime) await close("legacy", closers.get(realtime));
      await close("http", async () => { const error = await httpClosing; if (error) throw error; });
      for (const { category, owner, close: closeOwner } of [...owners].reverse()) {
        if (owner !== realtime) await close(category, closeOwner);
      }
      phase = "stopped";
      signals.off("SIGINT", signalStop); signals.off("SIGTERM", signalStop);
      logger.event(firstError ? "backend.shutdown_failed" : "backend.stopped", firstError ? { code: "CLEANUP_FAILED" } : {});
      await close("logger", () => logger.close());
      if (firstError) throw failure("CLEANUP_FAILED");
    })();
    return stopping;
  }
  function start() {
    if (starting) return starting;
    if (phase !== "created") return Promise.reject(failure("STARTUP_CANCELLED"));
    phase = "starting";
    signals.on("SIGINT", signalStop); signals.on("SIGTERM", signalStop);
    logger.event("backend.starting");
    starting = bounded(async () => {
      database = construct("database", factories.database);
      await database.initialize(context); alive();
      if (await database.ready() !== true) throw failure("DEPENDENCY_UNREADY");
      alive(); logger.event("dependency.ready", { category: "database" });
      if (config.cache) {
        startupCategory = "cache";
        let cache;
        // Constructor failure is optional too; only constructed owners require cleanup.
        try {
          cache = construct("cache", factories.cache);
          await bounded(() => cache.initialize(context), Math.min(1000, config.startupTimeoutMs), "STARTUP_TIMEOUT", abort.signal);
          alive(); logger.event("dependency.ready", { category: "cache" });
        } catch {
          alive(); logger.event("dependency.unavailable", { category: "cache", code: "RESOURCE_FAILED" });
          if (cache) await bounded(closers.get(cache), Math.min(1000, config.startupTimeoutMs), "STARTUP_TIMEOUT", abort.signal);
        }
      }
      alive();
      startupCategory = "legacy";
      application = construct("legacy", factories.application);
      await application.initialize(context); alive();
      const health = createHealthController({ checkDatabase: ready,
        cleanExpiredLeases: application.cleanExpiredLeases, readinessTimeoutMs: config.readinessTimeoutMs });
      app = (factories.app ?? createApp)({ healthController: health, apiRoutes: application.routes,
        auditContext: application.auditContext, rateLimiter: application.rateLimiter,
        allowedOrigins: config.allowedOrigins, httpLogger: logger.middleware, admission: application.admission,
        accepting: () => phase === "listening", logError: record => logger.event("http.error", record) });
      alive();
      listener = createLifecycle({ app, checkReady: () => database.ready(), closeResources: async () => {},
        host: config.host, port: config.port, startupTimeoutMs: config.startupTimeoutMs, shutdownTimeoutMs: config.shutdownTimeoutMs });
      realtime = construct("legacy", ctx => factories.realtime({ ...ctx, server: listener.server, accepting: () => phase === "listening" }));
      await realtime.initialize(context); alive();
      // The listener rechecks the actual required owner immediately before binding.
      alive(); startupCategory = "http"; await listener.start(); alive();
      phase = "listening"; logger.event("backend.listening");
      return runtime;
    }, config.startupTimeoutMs, "STARTUP_TIMEOUT", abort.signal).catch(async error => {
      const code = ["EADDRINUSE", "DEPENDENCY_UNREADY", "STARTUP_TIMEOUT", "STARTUP_CANCELLED"].includes(error.code) ? error.code : "RESOURCE_FAILED";
      logger.event("backend.startup_failed", { code, category: code === "DEPENDENCY_UNREADY" ? "database" : startupCategory });
      let result = failure(code);
      try { await stop(); } catch { result = failure("CLEANUP_FAILED"); }
      result.logged = true;
      throw result;
    });
    return starting;
  }
  const runtime = { start, stop, ready, get app() { return app; }, get server() { return listener?.server; }, get phase() { return phase; } };
  return runtime;
}
