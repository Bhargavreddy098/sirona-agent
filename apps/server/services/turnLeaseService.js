import { TurnLease } from "../model/TurnLease.js";

/* =====================================================================
   Turn Lease Service
   Monotonic turn execution serialization ensuring single-writer ACID guarantees.
   ===================================================================== */

export class TurnLeaseTimeoutError extends Error {
  constructor(sessionId, waitSeconds) {
    super(`Turn lease wait timed out after ${waitSeconds}s on session ${sessionId}`);
    this.name = "TurnLeaseTimeoutError";
    this.sessionId = sessionId;
  }
}

export class TurnLeaseError extends Error {
  /**
   * @param {string} message
   * @param {number} [status]
   * @param {string} [code]
   */
  constructor(message, status = 409, code = "TURN_LEASE_ERROR") {
    super(message);
    this.name = "TurnLeaseError";
    this.status = status;
    this.code = code;
  }
}

export const turnLeaseService = {
  async acquireLease(sessionId, holder = "agent-runtime", waitTimeoutSeconds = 5.0, ttlSeconds = 1800) {
    const startTime = Date.now();
    const waitBudgetMs = waitTimeoutSeconds * 1000;

    while (Date.now() - startTime <= waitBudgetMs) {
      const result = await TurnLease.acquire(sessionId, holder, ttlSeconds);
      if (result.acquired) {
        return result.token;
      }

      // Wait briefly before retrying
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    throw new TurnLeaseTimeoutError(sessionId, waitTimeoutSeconds);
  },

  async releaseLease(token) {
    if (!token || !token.session_id) return false;
    return await TurnLease.release(token.session_id, token.holder, token.generation);
  },

  async getActiveLease(sessionId) {
    return await TurnLease.getLease(sessionId);
  },
};

export class SessionTurnLeaseRegistry {
  static async acquireLease(sessionId, { ownerId = "operator", ttlSeconds = 30 } = {}) {
    /** @type {{ acquired: boolean, token?: any, reason?: string, holder?: string, generation?: number, expires_at?: any }} */
    const res = await TurnLease.acquire(sessionId, ownerId, ttlSeconds);
    if (!res.acquired) {
      const err = new TurnLeaseError(
        `Session is locked by turn lease holder ${res.holder} (generation ${res.generation})`,
        409,
        "TURN_LEASE_CONFLICT"
      );
      /** @type {any} */ (err).holder = res.holder;
      /** @type {any} */ (err).generation = res.generation;
      throw err;
    }
    return res.token;
  }

  static async releaseLease(sessionId, { ownerId = "operator", generation = null } = {}) {
    if (generation) {
      return TurnLease.release(sessionId, ownerId, generation);
    }
    const current = await TurnLease.getLease(sessionId);
    if (!current) return false;
    return TurnLease.release(sessionId, ownerId, current.generation);
  }

  static async getLease(sessionId) {
    return TurnLease.getLease(sessionId);
  }
}

export default turnLeaseService;
