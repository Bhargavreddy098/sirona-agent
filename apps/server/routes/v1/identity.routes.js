import { Router } from "express";
import {
  bootstrapSession,
  revokeSession,
  getCapabilities,
} from "../../services/identityService.js";
import { generateLauncherChallenge } from "../../services/launcherChallenge.js";
import { sessionAuth } from "../../middleware/sessionAuth.js";
import { sendProblem } from "../../middleware/problem.js";

const router = Router();

/**
 * Validates whether the incoming request originates from a local loopback interface.
 * @param {import("express").Request} req
 * @returns {boolean}
 */
function isLoopbackClient(req) {
  const rawIp = req.ip || req.socket?.remoteAddress || "";
  const ip = rawIp.startsWith("::ffff:") ? rawIp.slice(7) : rawIp;
  return ip === "127.0.0.1" || ip === "::1" || ip.startsWith("127.");
}

/**
 * Evaluates cookie security attributes: enforces Secure for production/HTTPS,
 * while defining an explicit safe localhost-HTTP exception for local desktop environments.
 * @param {import("express").Request} req
 * @returns {boolean}
 */
function resolveCookieSecurity(req) {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;

  // Genuine TLS connection (direct HTTPS or TLS-terminating proxy)
  if (req.secure || req.headers["x-forwarded-proto"] === "https") {
    return true;
  }

  // Local loopback HTTP exception for desktop Electron running locally over HTTP
  const isLocalDesktop = req.hostname === "127.0.0.1" || req.hostname === "localhost";
  if (isLocalDesktop) {
    return false;
  }

  // Non-loopback remote clients in production require Secure cookies
  return process.env.NODE_ENV === "production";
}

// 1. Native Launcher Session Bootstrap
router.post("/session/bootstrap", async (req, res, next) => {
  try {
    let { challenge, clientNonce } = req.body || {};
    if (!challenge || !clientNonce) {
      if (process.env.NODE_ENV === "production") {
        return sendProblem(req, res, 400, "Challenge and clientNonce are required");
      }

      // Non-production: enforce loopback caller boundary
      if (!isLoopbackClient(req)) {
        return sendProblem(req, res, 403, "Development bootstrap is strictly restricted to local loopback clients");
      }

      // Explicit testing opt-in MUST be configured server-side via environment.
      // An untrusted client header alone can NEVER authorize challenge bypass.
      const serverOptIn =
        process.env.ALLOW_DEV_BOOTSTRAP === "true" ||
        process.env.NODE_ENV === "test";

      if (!serverOptIn) {
        return sendProblem(
          req,
          res,
          400,
          "Challenge and clientNonce are required in production and development unless ALLOW_DEV_BOOTSTRAP=true or NODE_ENV=test is explicitly configured on the server."
        );
      }

      const pair = generateLauncherChallenge(60000);
      challenge = pair.challenge;
      clientNonce = pair.clientNonce;
    }

    const { session, rawSessionToken } = await bootstrapSession({ challenge, clientNonce });
    const isSecure = resolveCookieSecurity(req);

    res.cookie("asi_session", rawSessionToken, {
      httpOnly: true,
      sameSite: "strict",
      path: "/api/v1",
      maxAge: 8 * 3600 * 1000,
      secure: isSecure,
    });

    res.status(200).json({
      data: session,
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    if (err.code === "CHALLENGE_EXPIRED" || err.code === "ALREADY_USED") {
      return sendProblem(req, res, err.status || 401, err.message);
    }
    if (err.code === "INVALID_INPUT") {
      return sendProblem(req, res, 400, err.message);
    }
    next(err);
  }
});

// 2. Current Session Metadata
router.get("/session", sessionAuth({ requireCsrf: false }), (req, res) => {
  res.status(200).json({
    data: {
      principalId: req.session.principalId,
      workspaceId: req.session.workspaceId,
      expiresAt: req.session.expiresAt,
    },
    meta: { requestId: req.requestId },
  });
});

// 3. Durable Sign-Out (Revoke Session)
router.delete("/session", sessionAuth({ requireCsrf: true }), async (req, res, next) => {
  try {
    await revokeSession(req.session.rawSessionToken);
    const isSecure = resolveCookieSecurity(req);
    res.clearCookie("asi_session", {
      path: "/api/v1",
      httpOnly: true,
      sameSite: "strict",
      secure: isSecure,
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// 5. System Capabilities Projection
router.get("/capabilities", sessionAuth({ requireCsrf: false }), (req, res) => {
  const capabilities = getCapabilities();
  res.status(200).json({
    data: capabilities,
    meta: { requestId: req.requestId },
  });
});

export default router;
