import { registerHooks } from "node:module";
import { state } from "./pgDriver.js";

// The actual server.js direct entry runs unchanged. Only the external pg driver is replaced.
const driver = new URL("./pgDriver.js", import.meta.url).href;
registerHooks({ resolve(specifier, context, next) {
  if (specifier === "pg" && context.parentURL?.endsWith("/config/db.js")) return { url: driver, shortCircuit: true };
  return next(specifier, context);
} });
process.on("message", message => {
  if (!message || typeof message !== "object" || !("kind" in message) || !("value" in message)) return;
  if (message.kind === "state" && typeof message.value === "string") {
    state.readiness = message.value;
    if (process.connected) process.send({ kind: "control", value: message.value });
  }
  if (message.kind === "signal" && (message.value === "SIGINT" || message.value === "SIGTERM")) process.emit(message.value);
});
process.once("exit", code => process.stdout.write(JSON.stringify({ fixture: "process.exit", code }) + "\n"));
