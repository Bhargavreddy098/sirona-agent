import crypto from "node:crypto";

/** In-memory store for single-use desktop launcher challenges.
 * 60-second lifetime, exact nonce match, immediate consumption on first use.
 */
const activeChallenges = new Map();

/**
 * Generate a new single-use launcher challenge for the desktop shell/CLI.
 * @param {number} [ttlMs=60000]
 * @returns {{ challenge: string, clientNonce: string, expiresAt: number }}
 */
export function generateLauncherChallenge(ttlMs = 60000) {
  const challenge = crypto.randomBytes(32).toString("hex");
  const clientNonce = crypto.randomBytes(16).toString("hex");
  const expiresAt = Date.now() + ttlMs;

  activeChallenges.set(challenge, {
    clientNonce,
    expiresAt,
  });

  return { challenge, clientNonce, expiresAt };
}

/**
 * Consume a single-use launcher challenge.
 * Throws with structured error code on failure.
 * @param {string} challenge
 * @param {string} clientNonce
 * @returns {boolean}
 */
export function consumeLauncherChallenge(challenge, clientNonce) {
  if (!challenge || typeof challenge !== "string" || !clientNonce || typeof clientNonce !== "string") {
    throw Object.assign(new Error("Challenge and client nonce are required"), { code: "INVALID_INPUT", status: 400 });
  }

  const record = activeChallenges.get(challenge);
  if (!record) {
    throw Object.assign(new Error("Challenge not found or already used"), { code: "ALREADY_USED", status: 401 });
  }

  // Remove immediately on attempt (single use)
  activeChallenges.delete(challenge);

  if (Date.now() > record.expiresAt) {
    throw Object.assign(new Error("Challenge has expired"), { code: "CHALLENGE_EXPIRED", status: 401 });
  }

  if (record.clientNonce !== clientNonce) {
    throw Object.assign(new Error("Invalid client nonce"), { code: "INVALID_INPUT", status: 400 });
  }

  return true;
}

/** Reset active challenges (used for test teardown). */
export function _resetChallenges() {
  activeChallenges.clear();
}
