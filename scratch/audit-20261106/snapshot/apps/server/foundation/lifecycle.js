import { createServer } from "node:http";

/** Explicit owners, bounded startup/shutdown, and no import-time listeners. */
export function createLifecycle({ app, checkReady, closeResources, beforeClose = async () => {}, host, port, startupTimeoutMs = 5000, shutdownTimeoutMs = 10000 }) {
  if (typeof app !== "function" || typeof checkReady !== "function" || typeof closeResources !== "function" ||
      typeof beforeClose !== "function" || host !== "127.0.0.1" ||
      !Number.isInteger(port) || port < 0 || port > 65535 ||
      [startupTimeoutMs, shutdownTimeoutMs].some(ms => !Number.isInteger(ms) || ms < 1 || ms > 30000)) {
    throw new TypeError("Explicit lifecycle owners and bounded listener configuration are required");
  }
  const server = createServer(app);
  const sockets = new Set();
  server.on("connection", socket => { sockets.add(socket); socket.once("close", () => sockets.delete(socket)); });
  let startPromise;
  let stopPromise;
  let stopped = false;
  const listenAbort = new AbortController();
  let cancelListen;
  async function bounded(work, milliseconds, code) {
    let timer;
    try {
      return await Promise.race([
        work,
        new Promise((resolve, reject) => {
          timer = setTimeout(() => {
            server.closeAllConnections();
            for (const socket of sockets) socket.destroy();
            reject(Object.assign(new Error("Listener lifecycle deadline exceeded"), { code }));
          }, milliseconds);
        }),
      ]);
    } finally { clearTimeout(timer); }
  }
  function stop() {
    if (stopPromise) return stopPromise;
    stopped = true;
    if (!server.listening && cancelListen) {
      listenAbort.abort();
      cancelListen();
    }
    stopPromise = (async () => {
      // A single close invocation stops acceptance before any potentially slow cleanup hook.
      const closing = server.listening ? new Promise((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
      }) : Promise.resolve();
      closing.catch(() => {}); // Observed below, even if another cleanup step fails first.
      try {
        await bounded(Promise.resolve().then(beforeClose), shutdownTimeoutMs, "SHUTDOWN_TIMEOUT");
      } finally {
        try {
          await bounded(closing, shutdownTimeoutMs, "SHUTDOWN_TIMEOUT");
        } finally {
          await bounded(Promise.resolve().then(closeResources), shutdownTimeoutMs, "SHUTDOWN_TIMEOUT");
        }
      }
    })();
    return stopPromise;
  }
  function start() {
    if (stopped) return Promise.reject(new Error("Listener lifecycle is already stopped"));
    if (startPromise) return startPromise;
    startPromise = (async () => {
      try {
        if (await bounded(Promise.resolve().then(checkReady), startupTimeoutMs, "STARTUP_TIMEOUT") !== true) {
          throw Object.assign(new Error("Required dependency is unavailable"), { code: "DEPENDENCY_UNREADY" });
        }
        if (stopped) throw new Error("Listener startup was cancelled");
        await new Promise((resolve, reject) => {
          const cleanup = () => { server.off("listening", onListening); server.off("error", onError); cancelListen = undefined; };
          const onError = error => { cleanup(); reject(error); };
          const onListening = () => { cleanup(); resolve(); };
          cancelListen = () => { cleanup(); reject(Object.assign(new Error("Listener startup was cancelled"), { code: "STARTUP_CANCELLED" })); };
          server.once("error", onError);
          server.once("listening", onListening);
          server.listen({ port, host, signal: listenAbort.signal });
        });
        return server;
      } catch (error) {
        await stop();
        throw error;
      }
    })();
    return startPromise;
  }
  return { server, start, stop };
}
