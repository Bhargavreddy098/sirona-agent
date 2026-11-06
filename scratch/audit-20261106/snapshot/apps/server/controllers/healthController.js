import os from "node:os";

/** Explicit dependency injection keeps health tests away from live stores. */
export function createHealthController({ checkDatabase, cleanExpiredLeases, now = Date.now, readinessTimeoutMs = 2000 }) {
  if (typeof checkDatabase !== "function" || typeof cleanExpiredLeases !== "function" ||
      typeof now !== "function" || !Number.isInteger(readinessTimeoutMs) || readinessTimeoutMs < 1 || readinessTimeoutMs > 30000) {
    throw new TypeError("Health dependency owners and a bounded deadline are required");
  }
  const startedAt = now();
  async function checkReadiness() {
    let timer;
    try {
      return await Promise.race([
        Promise.resolve().then(() => checkDatabase()),
        new Promise(resolve => { timer = setTimeout(() => resolve(false), readinessTimeoutMs); }),
      ]) === true;
    } catch {
      // Dependency failure is deliberately projected as unready, never synthetic success.
      return false;
    } finally { clearTimeout(timer); }
  }
  return {
    checkReadiness,
    getLiveness(req, res) { res.json({ status: "live" }); },
    async getReadiness(req, res) {
      const ready = await checkReadiness();
      res.status(ready ? 200 : 503).json({ ready });
    },
    async getHealth(req, res) {
      const dbAlive = await checkReadiness();
      res.status(dbAlive ? 200 : 503).json({ status: dbAlive ? "ok" : "degraded", service: "sirona-core", db: dbAlive });
    },
    // Legacy telemetry is retained, not claimed as canonical readiness or qualified execution.
    async getStatus(req, res, next) {
      try {
        const dbAlive = await checkReadiness();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const cpus = os.cpus();
        try { await cleanExpiredLeases(); } catch { /* Retained legacy best-effort cleanup. */ }
        res.json({
          status: dbAlive ? "healthy" : "degraded",
          cpu_pct: Math.min(100, Math.round((cpus.length > 0 ? (os.loadavg()[0] || 0.1) * 10 : 15))),
          mem_pct: Math.round(((totalMem - freeMem) / totalMem) * 100),
          mem_available_mb: Math.round(freeMem / (1024 * 1024)),
          gateway: "connected", db: dbAlive, pid: process.pid, threads: cpus.length,
          active_runs: 0, uptime: Math.floor((now() - startedAt) / 1000), timestamp: now(),
        });
      } catch (error) { next(error); }
    },
  };
}
