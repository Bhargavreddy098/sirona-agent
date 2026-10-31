import { sendProblem } from "../middleware/problem.js";

// Stage 01 immutable production allowlist (health only)
export const stage01Routes = Object.freeze([
  Object.freeze({ path: "/health/live", methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ path: "/health/ready", methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ path: "/health", methods: Object.freeze(["GET", "HEAD"]) }),
]);

export function stage01Admission(req, res, next) {
  const path = typeof req.url === "string" ? req.url.split("?")[0] : "";
  if (stage01Routes.some(route => route.path === path && route.methods.includes(req.method))) return next();
  return sendProblem(req, res, 503, "Capability is not qualified");
}

// Stage 03 qualified capability surface (health + identity/sessions)
export const stage03Routes = Object.freeze([
  ...stage01Routes,
  Object.freeze({ path: "/api/v1/session/bootstrap", methods: Object.freeze(["POST"]) }),
  Object.freeze({ path: "/api/v1/session", methods: Object.freeze(["GET", "HEAD", "DELETE"]) }),
  Object.freeze({ path: "/api/v1/workspaces", methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ path: "/api/v1/capabilities", methods: Object.freeze(["GET", "HEAD"]) }),
]);

export function stage03Admission(req, res, next) {
  const path = typeof req.url === "string" ? req.url.split("?")[0] : "";
  if (stage03Routes.some(route => route.path === path && route.methods.includes(req.method))) return next();
  return sendProblem(req, res, 503, "Capability is not qualified");
}

// Stage 04 qualified capability surface (health + identity + projects/conversations/snapshots/artifacts)
export const stage04Patterns = Object.freeze([
  Object.freeze({ pattern: /^\/api\/v1\/projects$/, methods: Object.freeze(["GET", "HEAD", "POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/projects\/[0-9a-f-]{36}$/, methods: Object.freeze(["GET", "HEAD", "PATCH"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/projects\/[0-9a-f-]{36}\/archive$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/projects\/[0-9a-f-]{36}\/conversations$/, methods: Object.freeze(["GET", "HEAD", "POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/projects\/[0-9a-f-]{36}\/snapshots$/, methods: Object.freeze(["GET", "HEAD", "POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/projects\/[0-9a-f-]{36}\/artifacts$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/projects\/[0-9a-f-]{36}\/uploads$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/projects\/[0-9a-f-]{36}\/scan$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/projects\/[0-9a-f-]{36}\/structure$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/conversations\/[0-9a-f-]{36}$/, methods: Object.freeze(["GET", "HEAD", "DELETE"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/conversations\/[0-9a-f-]{36}\/messages$/, methods: Object.freeze(["GET", "HEAD", "POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/artifacts\/[0-9a-f-]{36}$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/artifacts\/[0-9a-f-]{36}\/content$/, methods: Object.freeze(["GET", "HEAD"]) }),
]);

export function stage04Admission(req, res, next) {
  const path = typeof req.url === "string" ? req.url.split("?")[0] : "";
  if (stage03Routes.some(route => route.path === path && route.methods.includes(req.method))) return next();
  if (stage04Patterns.some(p => p.pattern.test(path) && p.methods.includes(req.method))) return next();
  return sendProblem(req, res, 503, "Capability is not qualified");
}

// Stage 05 qualified capability surface (health + identity + projects + governance/leases/approvals)
export const stage05Patterns = Object.freeze([
  ...stage04Patterns,
  Object.freeze({ pattern: /^\/api\/v1\/policies\/current$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/policies\/revisions$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/policies\/[0-9a-f-]{36}\/activate$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/projects\/[0-9a-f-]{36}\/grants$/, methods: Object.freeze(["GET", "HEAD", "POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/grants\/[0-9a-f-]{36}\/revoke$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/contract-revisions\/[0-9a-f-]{36}\/approval-requests$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/approvals$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/approvals\/[0-9a-f-]{36}$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/approvals\/[0-9a-f-]{36}\/decisions$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/approvals\/[0-9a-f-]{36}\/revoke$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/projects\/[0-9a-f-]{36}\/budgets$/, methods: Object.freeze(["GET", "HEAD", "POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/budgets\/[0-9a-f-]{36}\/reserve$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/usage$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/sessions\/[0-9a-f-]{36}\/lease$/, methods: Object.freeze(["GET", "HEAD", "POST", "DELETE"]) }),
]);

export function stage05Admission(req, res, next) {
  const path = typeof req.url === "string" ? req.url.split("?")[0] : "";
  if (stage03Routes.some(route => route.path === path && route.methods.includes(req.method))) return next();
  if (stage05Patterns.some(p => p.pattern.test(path) && p.methods.includes(req.method))) return next();
  return sendProblem(req, res, 503, "Capability is not qualified");
}

// Stage 06 qualified capability surface (health + identity + projects + governance + provider models & turns)
export const stage06Patterns = Object.freeze([
  ...stage05Patterns,
  Object.freeze({ pattern: /^\/api\/v1\/models$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/models\/verify$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/providers$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/provider-connections$/, methods: Object.freeze(["GET", "HEAD", "POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/provider-connections\/[0-9a-f-]{36}$/, methods: Object.freeze(["GET", "HEAD", "PATCH", "DELETE"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/provider-connections\/[0-9a-f-]{36}\/test$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/provider-connections\/[0-9a-f-]{36}\/models\/refresh$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/model-settings$/, methods: Object.freeze(["GET", "HEAD", "PATCH"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/conversations\/[0-9a-f-]{36}\/turns$/, methods: Object.freeze(["POST"]) }),
]);

export function stage06Admission(req, res, next) {
  const path = typeof req.url === "string" ? req.url.split("?")[0] : "";
  if (stage03Routes.some(route => route.path === path && route.methods.includes(req.method))) return next();
  if (stage06Patterns.some(p => p.pattern.test(path) && p.methods.includes(req.method))) return next();
  return sendProblem(req, res, 503, "Capability is not qualified");
}

// Stage 07 qualified capability surface (health + identity + projects + governance + provider models + durable runs/tasks/effects/SSE)
export const stage07Patterns = Object.freeze([
  ...stage06Patterns,
  Object.freeze({ pattern: /^\/api\/v1\/projects\/[0-9a-f-]{36}\/runs$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/runs\/[0-9a-f-]{36}$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/runs\/[0-9a-f-]{36}\/tasks$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/runs\/[0-9a-f-]{36}\/agents$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/runs\/[0-9a-f-]{36}\/effects$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/runs\/[0-9a-f-]{36}\/checkpoints$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/runs\/[0-9a-f-]{36}\/pause$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/runs\/[0-9a-f-]{36}\/resume$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/runs\/[0-9a-f-]{36}\/cancel$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/effects\/[0-9a-f-]{36}\/reconcile$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/runs\/[0-9a-f-]{36}\/events$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/goals\/[0-9a-f-]{36}\/runs$/, methods: Object.freeze(["POST"]) }),
]);

export function stage07Admission(req, res, next) {
  const path = typeof req.url === "string" ? req.url.split("?")[0] : "";
  if (stage03Routes.some(route => route.path === path && route.methods.includes(req.method))) return next();
  if (stage07Patterns.some(p => p.pattern.test(path) && p.methods.includes(req.method))) return next();
  return sendProblem(req, res, 503, "Capability is not qualified");
}

// Stage 08 qualified capability surface (Stage 07 + goals + intent analysis + clarifications + research + requirement revisions + decisions)
export const stage08Patterns = Object.freeze([
  ...stage07Patterns,
  Object.freeze({ pattern: /^\/api\/v1\/conversations\/[0-9a-f-]{36}\/goals$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/projects\/[0-9a-f-]{36}\/goals$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/goals\/[0-9a-f-]{36}$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/goals\/[0-9a-f-]{36}\/intent-analysis$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/goals\/[0-9a-f-]{36}\/clarifications$/, methods: Object.freeze(["GET", "HEAD", "POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/clarifications\/[0-9a-f-]{36}\/answers$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/goals\/[0-9a-f-]{36}\/research$/, methods: Object.freeze(["GET", "HEAD", "POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/goals\/[0-9a-f-]{36}\/requirement-revisions$/, methods: Object.freeze(["GET", "HEAD", "POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/requirement-revisions\/[0-9a-f-]{36}$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/goals\/[0-9a-f-]{36}\/decisions$/, methods: Object.freeze(["GET", "HEAD", "POST"]) }),
]);

export function stage08Admission(req, res, next) {
  const path = typeof req.url === "string" ? req.url.split("?")[0] : "";
  if (stage03Routes.some(route => route.path === path && route.methods.includes(req.method))) return next();
  if (stage08Patterns.some(p => p.pattern.test(path) && p.methods.includes(req.method))) return next();
  return sendProblem(req, res, 503, "Capability is not qualified");
}

// Stage 09 qualified capability surface (Stage 08 + layered plans + Build Contracts + diff + approval requests)
export const stage09Patterns = Object.freeze([
  ...stage08Patterns,
  Object.freeze({ pattern: /^\/api\/v1\/goals\/[0-9a-f-]{36}\/plans$/, methods: Object.freeze(["GET", "HEAD", "POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/plans\/[0-9a-f-]{36}\/revisions$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/plan-revisions\/[0-9a-f-]{36}$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/goals\/[0-9a-f-]{36}\/contracts$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/contracts\/[0-9a-f-]{36}\/revisions$/, methods: Object.freeze(["GET", "HEAD", "POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/contract-revisions\/[0-9a-f-]{36}$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/contract-revisions\/[0-9a-f-]{36}\/diff$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/contract-revisions\/[0-9a-f-]{36}\/approval-requests$/, methods: Object.freeze(["POST"]) }),
]);

export function stage09Admission(req, res, next) {
  const path = typeof req.url === "string" ? req.url.split("?")[0] : "";
  if (stage03Routes.some(route => route.path === path && route.methods.includes(req.method))) return next();
  if (stage09Patterns.some(p => p.pattern.test(path) && p.methods.includes(req.method))) return next();
  return sendProblem(req, res, 503, "Capability is not qualified");
}

// Stage 10 qualified capability surface (Stage 09 + isolation diagnostics + qualify + validate-path + qualifications list/get)
export const stage10Patterns = Object.freeze([
  ...stage09Patterns,
  Object.freeze({ pattern: /^\/api\/v1\/isolation\/diagnostics$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/isolation\/qualify$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/isolation\/validate-path$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/isolation\/qualifications$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/isolation\/qualifications\/[0-9a-f-]{36}$/, methods: Object.freeze(["GET", "HEAD"]) }),
]);

export function stage10Admission(req, res, next) {
  const path = typeof req.url === "string" ? req.url.split("?")[0] : "";
  if (stage03Routes.some(route => route.path === path && route.methods.includes(req.method))) return next();
  if (stage10Patterns.some(p => p.pattern.test(path) && p.methods.includes(req.method))) return next();
  return sendProblem(req, res, 503, "Capability is not qualified");
}

// Stage 11 qualified capability surface (Stage 10 + tools catalog + developer connections + tool invocation & receipts)
export const stage11Patterns = Object.freeze([
  ...stage10Patterns,
  Object.freeze({ pattern: /^\/api\/v1\/tools$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/tools\/[0-9a-f-]{36}$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/tools\/[a-zA-Z0-9_-]+$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/developer-connections$/, methods: Object.freeze(["GET", "HEAD", "POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/developer-connections\/[0-9a-f-]{36}$/, methods: Object.freeze(["GET", "HEAD", "DELETE"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/developer-connections\/[0-9a-f-]{36}\/qualify$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/developer-connections\/[0-9a-f-]{36}\/disconnect$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/tools\/invoke$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/tools\/receipts\/[0-9a-f-]{36}$/, methods: Object.freeze(["GET", "HEAD"]) }),
]);

export function stage11Admission(req, res, next) {
  const path = typeof req.url === "string" ? req.url.split("?")[0] : "";
  if (stage03Routes.some(route => route.path === path && route.methods.includes(req.method))) return next();
  if (stage11Patterns.some(p => p.pattern.test(path) && p.methods.includes(req.method))) return next();
  return sendProblem(req, res, 503, "Capability is not qualified");
}

// Stage 12 qualified capability surface (Stage 11 + independent verification engine)
export const stage12Patterns = Object.freeze([
  ...stage11Patterns,
  Object.freeze({ pattern: /^\/api\/v1\/runs\/[0-9a-f-]{36}\/verifications$/, methods: Object.freeze(["GET", "HEAD", "POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/verifications\/[0-9a-f-]{36}$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/verifications\/evaluations$/, methods: Object.freeze(["POST"]) }),
]);

export function stage12Admission(req, res, next) {
  const path = typeof req.url === "string" ? req.url.split("?")[0] : "";
  if (stage03Routes.some(route => route.path === path && route.methods.includes(req.method))) return next();
  if (stage12Patterns.some(p => p.pattern.test(path) && p.methods.includes(req.method))) return next();
  return sendProblem(req, res, 503, "Capability is not qualified");
}

// Stage 13 qualified capability surface (Stage 12 + autonomous workflow execution & bounded repair)
export const stage13Patterns = Object.freeze([
  ...stage12Patterns,
  Object.freeze({ pattern: /^\/api\/v1\/goals\/[0-9a-f-]{36}\/runs$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/runs\/[0-9a-f-]{36}\/failures$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/runs\/[0-9a-f-]{36}\/repairs$/, methods: Object.freeze(["GET", "HEAD", "POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/runs\/[0-9a-f-]{36}\/execute$/, methods: Object.freeze(["POST"]) }),
]);

export function stage13Admission(req, res, next) {
  const path = typeof req.url === "string" ? req.url.split("?")[0] : "";
  if (stage03Routes.some(route => route.path === path && route.methods.includes(req.method))) return next();
  if (stage13Patterns.some(p => p.pattern.test(path) && p.methods.includes(req.method))) return next();
  return sendProblem(req, res, 503, "Capability is not qualified");
}

// Stage 14 qualified capability surface (Stage 13 + memory & project intelligence)
export const stage14Patterns = Object.freeze([
  ...stage13Patterns,
  Object.freeze({ pattern: /^\/api\/v1\/projects\/[0-9a-f-]{36}\/memories$/, methods: Object.freeze(["GET", "HEAD", "POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/memories\/[0-9a-f-]{36}$/, methods: Object.freeze(["GET", "HEAD", "DELETE"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/memories\/[0-9a-f-]{36}\/revisions$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/projects\/[0-9a-f-]{36}\/memory-search$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/projects\/[0-9a-f-]{36}\/knowledge-index$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/projects\/[0-9a-f-]{36}\/knowledge\/nodes$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/projects\/[0-9a-f-]{36}\/knowledge\/edges$/, methods: Object.freeze(["GET", "HEAD"]) }),
]);

export function stage14Admission(req, res, next) {
  const path = typeof req.url === "string" ? req.url.split("?")[0] : "";
  if (stage03Routes.some(route => route.path === path && route.methods.includes(req.method))) return next();
  if (stage14Patterns.some(p => p.pattern.test(path) && p.methods.includes(req.method))) return next();
  return sendProblem(req, res, 503, "Capability is not qualified");
}

// Stage 15 qualified capability surface (Stage 14 + schedules, occurrences, triggers, webhooks, activity, notifications)
export const stage15Patterns = Object.freeze([
  ...stage14Patterns,
  Object.freeze({ pattern: /^\/api\/v1\/projects\/[0-9a-f-]{36}\/schedules\/preview$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/projects\/[0-9a-f-]{36}\/schedules$/, methods: Object.freeze(["GET", "HEAD", "POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/schedules\/[0-9a-f-]{36}$/, methods: Object.freeze(["PATCH"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/schedules\/[0-9a-f-]{36}\/pause$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/schedules\/[0-9a-f-]{36}\/resume$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/schedules\/[0-9a-f-]{36}\/occurrences$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/projects\/[0-9a-f-]{36}\/triggers$/, methods: Object.freeze(["GET", "HEAD", "POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/triggers\/[0-9a-f-]{36}$/, methods: Object.freeze(["PATCH"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/webhooks\/[0-9a-f-]{36}$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/projects\/[0-9a-f-]{36}\/events$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/activity$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/notifications$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/notifications\/[0-9a-f-]{36}\/read$/, methods: Object.freeze(["POST"]) }),
]);

export function stage15Admission(req, res, next) {
  const path = typeof req.url === "string" ? req.url.split("?")[0] : "";
  if (stage03Routes.some(route => route.path === path && route.methods.includes(req.method))) return next();
  if (stage15Patterns.some(p => p.pattern.test(path) && p.methods.includes(req.method))) return next();
  return sendProblem(req, res, 503, "Capability is not qualified");
}

// Stage 16 qualified capability surface (Stage 15 + deployment previews/execution/rollback + browser QA)
export const stage16Patterns = Object.freeze([
  ...stage15Patterns,
  Object.freeze({ pattern: /^\/api\/v1\/runs\/[0-9a-f-]{36}\/deployment-previews$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/runs\/[0-9a-f-]{36}\/deployments$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/deployments\/[0-9a-f-]{36}$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/deployments\/[0-9a-f-]{36}\/rollback-previews$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/deployments\/[0-9a-f-]{36}\/rollback$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/runs\/[0-9a-f-]{36}\/browser-qa-sessions$/, methods: Object.freeze(["GET", "HEAD", "POST"]) }),
]);

export function stage16Admission(req, res, next) {
  const path = typeof req.url === "string" ? req.url.split("?")[0] : "";
  if (stage03Routes.some(route => route.path === path && route.methods.includes(req.method))) return next();
  if (stage16Patterns.some(p => p.pattern.test(path) && p.methods.includes(req.method))) return next();
  return sendProblem(req, res, 503, "Capability is not qualified");
}

// Stage 17 qualified capability surface (Stage 16 + Windows V1 release manifest, disaster recovery checkpoints, restore rehearsals, retention purge, operational diagnostics)
export const stage17Patterns = Object.freeze([
  Object.freeze({ pattern: /^\/api\/v1\/fs\/directories$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({pattern:/^\/api\/v1\/projects\/[0-9a-f-]{36}\/docker-workers$/,methods:Object.freeze(["GET","HEAD"])}),
  Object.freeze({pattern:/^\/api\/v1\/projects\/[0-9a-f-]{36}\/terminals$/,methods:Object.freeze(["POST"])}),
  Object.freeze({pattern:/^\/api\/v1\/terminals\/[0-9a-f-]{36}\/ticket$/,methods:Object.freeze(["POST"])}),
  Object.freeze({pattern:/^\/api\/v1\/terminals\/[0-9a-f-]{36}$/,methods:Object.freeze(["DELETE"])}),
  Object.freeze({pattern:/^\/api\/v1\/projects\/[0-9a-f-]{36}\/(workspace-root|isolation\/docker-qualification|docker-workers\/recover|patch-effects\/[0-9a-f-]{36}\/reconcile|patch-previews\/[0-9a-f-]{36}\/apply)$/,methods:Object.freeze(["POST"])}),
  Object.freeze({pattern:/^\/api\/v1\/projects\/[0-9a-f-]{36}\/(files|file|patch-previews\/[0-9a-f-]{36})$/,methods:Object.freeze(["GET","HEAD"])}),
  ...stage16Patterns,
  // Owner-authorized standalone-chat slice; does not qualify a new agent stage.
  Object.freeze({ pattern: /^\/api\/v1\/conversations$/, methods: Object.freeze(["GET", "HEAD", "POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/conversations\/[0-9a-f-]{36}$/, methods: Object.freeze(["PATCH"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/system\/release$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/system\/recovery\/checkpoints$/, methods: Object.freeze(["GET", "HEAD", "POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/system\/recovery\/checkpoints\/[0-9a-f-]{36}$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/system\/recovery\/checkpoints\/[0-9a-f-]{36}\/rehearsal$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/system\/recovery\/rehearsals\/[0-9a-f-]{36}$/, methods: Object.freeze(["GET", "HEAD"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/system\/maintenance\/purge$/, methods: Object.freeze(["POST"]) }),
  Object.freeze({ pattern: /^\/api\/v1\/system\/diagnostics$/, methods: Object.freeze(["GET", "HEAD"]) }),
]);

export function stage17Admission(req, res, next) {
  const path = typeof req.url === "string" ? req.url.split("?")[0] : "";
  if (stage03Routes.some(route => route.path === path && route.methods.includes(req.method))) return next();
  if (stage17Patterns.some(p => p.pattern.test(path) && p.methods.includes(req.method))) return next();
  return sendProblem(req, res, 503, "Capability is not qualified");
}






