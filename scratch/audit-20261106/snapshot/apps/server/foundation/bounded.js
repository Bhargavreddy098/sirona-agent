/** @param {string} code @returns {import('./contracts.js').LifecycleError} */
export function failure(code) { return Object.assign(new Error("Backend lifecycle operation failed"), { code }); }

export async function bounded(work, milliseconds, code, signal) {
  let timer;
  let onAbort;
  try {
    if (signal?.aborted) throw failure("STARTUP_CANCELLED");
    return await Promise.race([Promise.resolve().then(work), new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(failure(code)), Math.max(1, milliseconds));
      if (signal) {
        onAbort = () => reject(failure("STARTUP_CANCELLED"));
        signal.addEventListener("abort", onAbort, { once: true });
      }
    })]);
  } finally { clearTimeout(timer); if (onAbort) signal.removeEventListener("abort", onAbort); }
}
