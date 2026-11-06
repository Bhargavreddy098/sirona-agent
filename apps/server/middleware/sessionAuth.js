import { sendProblem } from "./problem.js";
import { verifySession, verifyCsrfToken } from "../services/identityService.js";

/**
 * Authentication & CSRF protection middleware for /api/v1 routes.
 * Extracts token from `asi_session` cookie or `Authorization: Bearer <token>`.
 * For state-changing operations (POST, PUT, PATCH, DELETE), enforces valid `X-CSRF-Token`.
 * @param {{ requireCsrf?: boolean }} [options]
 */
export function sessionAuth({ requireCsrf = true } = {}) {
  return async function sessionAuthMiddleware(req, res, next) {
    let rawToken = req.cookies?.asi_session;

    if (!rawToken && req.headers.authorization?.startsWith("Bearer ")) {
      rawToken = req.headers.authorization.slice(7).trim();
    }

    if (!rawToken) {
      return sendProblem(req, res, 401, "Authentication required");
    }

    try {
      const session = await verifySession(rawToken);
      if (!session) {
        return sendProblem(req, res, 401, "Session expired or revoked");
      }

      // CSRF check on mutating requests
      const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
      if (isMutation && requireCsrf) {
        const candidateCsrf = req.headers["x-csrf-token"];
        if (!candidateCsrf || !verifyCsrfToken(session, candidateCsrf)) {
          return sendProblem(req, res, 403, "CSRF verification failed");
        }
      }

      req.session = {
        sessionId: session.sessionId,
        principalId: session.principalId,
        workspaceId: session.workspaceId,
        expiresAt: session.expiresAt,
        rawSessionToken: rawToken,
      };

      next();
    } catch (err) {
      next(err);
    }
  };
}
