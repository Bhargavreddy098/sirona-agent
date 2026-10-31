import { STATUS_CODES } from "node:http";

const codes = { 400: "INVALID_INPUT", 401: "UNAUTHENTICATED", 403: "POLICY_DENIED", 404: "NOT_FOUND",
  409: "STATE_CONFLICT", 412: "VERSION_MISMATCH", 413: "PAYLOAD_TOO_LARGE", 422: "DOMAIN_INVALID",
  428: "PRECONDITION_REQUIRED", 429: "RATE_LIMITED", 503: "CAPABILITY_UNAVAILABLE" };

export function sendProblem(req, res, status, detail) {
  const body = { type: "about:blank", title: STATUS_CODES[status], status,
    code: codes[status] ?? "INTERNAL_ERROR", detail, requestId: req.requestId,
    retryable: status === 429 || status === 503 };
  res.statusCode = status;
  res.setHeader("Content-Type", "application/problem+json; charset=utf-8");
  res.end(JSON.stringify(body));
}

// Only existing mounted legacy namespaces; /api/v1 and unknown namespaces are canonical.
export function isLegacy(req) {
  const path = req.url.split("?")[0];
  return /^\/(?:api\/(?:auth|sessions|approvals|files|git|tools|settings|audit)(?:\/|$)|v1(?:\/|$))/.test(path) ||
    ["/health", "/api/status", "/api/messages/search", "/api/models", "/api/model/options"].includes(path);
}

export function rateLimitResponse(req, res, retryAfterSeconds) {
  res.setHeader("Retry-After", String(retryAfterSeconds));
  if (isLegacy(req)) return res.status(429).json({ success: false,
    message: "Too many requests. Please slow down.", retryAfterSeconds });
  return sendProblem(req, res, 429, "Too many requests. Please slow down.");
}

export function notFound(req, res) {
  if (isLegacy(req)) return res.status(404).json({ success: false, message: "Endpoint not found" });
  return sendProblem(req, res, 404, "Endpoint not found");
}
