/**
 * Middleware Layer Barrel
 * Consolidates HTTP boundaries, authentication, authorization, auditing, and error handling.
 */

import { auditContext } from './auditContext.js';
import { createErrorHandler, errorHandler } from './errorHandler.js';
import { createHttpBoundary } from './httpBoundary.js';
import { verifySessionOwnership, verifyProjectOwnership } from './ownershipGuard.js';
import { sendProblem, notFound, isLegacy, rateLimitResponse } from './problem.js';
import { createRateLimiterOwner } from './rateLimiter.js';
import { sessionAuth } from './sessionAuth.js';
import { upload } from './upload.js';
import { userAuth } from './userAuth.js';
import { validate } from './validate.js';

export {
  auditContext,
  createErrorHandler,
  errorHandler,
  createHttpBoundary,
  verifySessionOwnership,
  verifyProjectOwnership,
  sendProblem,
  notFound,
  isLegacy,
  rateLimitResponse,
  createRateLimiterOwner,
  sessionAuth,
  upload,
  userAuth,
  validate,
};

export default {
  auditContext,
  createErrorHandler,
  errorHandler,
  createHttpBoundary,
  verifySessionOwnership,
  verifyProjectOwnership,
  sendProblem,
  notFound,
  isLegacy,
  rateLimitResponse,
  createRateLimiterOwner,
  sessionAuth,
  upload,
  userAuth,
  validate,
};
