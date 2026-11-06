import { EventEmitter } from "node:events";

// TEST-ONLY EXTERNAL DRIVER: selected solely through the explicit Node test preload.
export const state = { readiness: process.env.R04_TEST_SCENARIO ?? "ready" };
function receipt(event) { if (process.connected) process.send({ kind: "fixture", event }); }
class Pool extends EventEmitter {
  constructor() {
    super();
    if (state.readiness === "constructor-failure") throw new Error("CANARY_SECRET connection password");
    receipt("database.construct");
    if (state.readiness === "close-stall") this.timer = setInterval(() => {}, 1000);
  }
  async query(sql) {
    if (sql !== "SELECT 1 AS alive") throw new Error("Forbidden test product query");
    if (state.readiness === "stall") return new Promise(() => {});
    if (state.readiness === "throw") throw new Error("CANARY_SECRET SQL postgres://private");
    return { rows: state.readiness === "unavailable" ? [] : [{ alive: 1 }] };
  }
  async end() {
    receipt("database.close");
    if (state.readiness === "close-stall") return new Promise(() => {});
    clearInterval(this.timer);
    if (state.readiness === "close-failure") throw new Error("CANARY_SECRET");
  }
}
export default { Pool };
