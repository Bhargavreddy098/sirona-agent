/**
 * RFC 7807 Problem Details and Domain Error Hierarchy
 * Compliant with Clean Architecture and nodejs-backend-patterns
 */

export class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {string} code - Machine-readable error code (e.g. 'NOT_FOUND')
   * @param {number} status - HTTP status code (default 500)
   * @param {Record<string, unknown>} [details] - Additional contextual details
   */
  constructor(message, code = "INTERNAL_ERROR", status = 500, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  toProblemDetails(requestId = undefined) {
    return {
      type: `urn:problem-type:${this.code.toLowerCase().replace(/_/g, "-")}`,
      title: this.name.replace(/([A-Z])/g, " $1").trim(),
      status: this.status,
      detail: this.message,
      code: this.code,
      ...(this.details && Object.keys(this.details).length > 0 ? { details: this.details } : {}),
      ...(requestId ? { instance: `/requests/${requestId}` } : {}),
    };
  }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid input data", details = {}) {
    super(message, "INVALID_INPUT", 400, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required", details = {}) {
    super(message, "UNAUTHORIZED", 401, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Access denied", details = {}) {
    super(message, "FORBIDDEN", 403, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found", details = {}) {
    super(message, "NOT_FOUND", 404, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource conflict", details = {}) {
    super(message, "CONFLICT", 409, details);
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Rate limit exceeded", retryAfterSeconds = 60, details = {}) {
    super(message, "RATE_LIMITED", 429, { retryAfterSeconds, ...details });
  }
}

export class DependencyError extends AppError {
  constructor(message = "External dependency failed or unavailable", details = {}) {
    super(message, "DEPENDENCY_UNREADY", 503, details);
  }
}

export class PolicyDeniedError extends AppError {
  constructor(message = "Action denied by governance policy", details = {}) {
    super(message, "POLICY_DENIED", 403, details);
  }
}

export function toProblemDetails(error, requestId = undefined) {
  if (error instanceof AppError) {
    return error.toProblemDetails(requestId);
  }
  return {
    type: "urn:problem-type:internal-error",
    title: "Internal Server Error",
    status: error?.status || 500,
    detail: error?.message || "An unexpected error occurred",
    code: error?.code || "INTERNAL_ERROR",
    ...(requestId ? { instance: `/requests/${requestId}` } : {}),
  };
}

export default {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DependencyError,
  PolicyDeniedError,
  toProblemDetails,
};
