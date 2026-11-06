// @ts-check
import { Router } from "express";
import { sessionAuth } from "../../middleware/sessionAuth.js";
import { sendProblem } from "../../middleware/problem.js";
import { AutomationService, AutomationServiceError } from "../../services/automationService.js";

const router = Router();

/**
 * Common error handler for automation routes.
 * @param {any} req
 * @param {any} res
 * @param {any} err
 */
function handleError(req, res, err) {
  if (err instanceof AutomationServiceError) {
    return sendProblem(req, res, err.status, err.message);
  }
  if (err && typeof err.status === "number") {
    return sendProblem(req, res, err.status, err.message);
  }
  return sendProblem(req, res, 500, err instanceof Error ? err.message : "Internal server error");
}

// ==========================================
// 1. Schedules & Preview Endpoints
// ==========================================

// POST /api/v1/projects/:projectId/schedules/preview
router.post(
  "/projects/:projectId/schedules/preview",
  sessionAuth({ requireCsrf: true }),
  async (req, res) => {
    try {
      const result = AutomationService.previewSchedule(req.body || {});
      return res.status(200).json({
        data: result,
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// POST /api/v1/projects/:projectId/schedules
router.post(
  "/projects/:projectId/schedules",
  sessionAuth({ requireCsrf: true }),
  async (req, res) => {
    try {
      const schedule = await AutomationService.createSchedule({
        projectId: req.params.projectId,
        ...req.body,
      });
      return res.status(201).json({
        data: schedule,
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// GET /api/v1/projects/:projectId/schedules
router.get(
  "/projects/:projectId/schedules",
  sessionAuth({ requireCsrf: false }),
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit, 10) || 50;
      const offset = parseInt(req.query.offset, 10) || 0;
      const result = await AutomationService.getSchedules(req.params.projectId, { limit, offset });
      return res.status(200).json({
        data: result.schedules,
        meta: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          requestId: req.requestId,
        },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// PATCH /api/v1/schedules/:scheduleId
router.patch(
  "/schedules/:scheduleId",
  sessionAuth({ requireCsrf: true }),
  async (req, res) => {
    try {
      const schedule = await AutomationService.updateSchedule(req.params.scheduleId, req.body || {});
      return res.status(200).json({
        data: schedule,
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// POST /api/v1/schedules/:scheduleId/pause
router.post(
  "/schedules/:scheduleId/pause",
  sessionAuth({ requireCsrf: true }),
  async (req, res) => {
    try {
      const schedule = await AutomationService.pauseSchedule(req.params.scheduleId, req.body || {});
      return res.status(200).json({
        data: schedule,
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// POST /api/v1/schedules/:scheduleId/resume
router.post(
  "/schedules/:scheduleId/resume",
  sessionAuth({ requireCsrf: true }),
  async (req, res) => {
    try {
      const schedule = await AutomationService.resumeSchedule(req.params.scheduleId, req.body || {});
      return res.status(200).json({
        data: schedule,
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// GET /api/v1/schedules/:scheduleId/occurrences
router.get(
  "/schedules/:scheduleId/occurrences",
  sessionAuth({ requireCsrf: false }),
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit, 10) || 50;
      const offset = parseInt(req.query.offset, 10) || 0;
      const result = await AutomationService.getOccurrences(req.params.scheduleId, { limit, offset });
      return res.status(200).json({
        data: result.occurrences,
        meta: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          requestId: req.requestId,
        },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// ==========================================
// 2. Triggers & Inbound Webhooks
// ==========================================

// POST /api/v1/projects/:projectId/triggers
router.post(
  "/projects/:projectId/triggers",
  sessionAuth({ requireCsrf: true }),
  async (req, res) => {
    try {
      const trigger = await AutomationService.createTrigger({
        projectId: req.params.projectId,
        ...req.body,
      });
      return res.status(201).json({
        data: trigger,
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// GET /api/v1/projects/:projectId/triggers
router.get(
  "/projects/:projectId/triggers",
  sessionAuth({ requireCsrf: false }),
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit, 10) || 50;
      const offset = parseInt(req.query.offset, 10) || 0;
      const result = await AutomationService.getTriggers(req.params.projectId, { limit, offset });
      return res.status(200).json({
        data: result.triggers,
        meta: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          requestId: req.requestId,
        },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// PATCH /api/v1/triggers/:triggerId
router.patch(
  "/triggers/:triggerId",
  sessionAuth({ requireCsrf: true }),
  async (req, res) => {
    try {
      const trigger = await AutomationService.updateTrigger(req.params.triggerId, req.body || {});
      return res.status(200).json({
        data: trigger,
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// POST /api/v1/webhooks/:triggerId (Signed machine webhook ingress, no CSRF/cookie)
router.post(
  "/webhooks/:triggerId",
  async (req, res) => {
    try {
      const result = await AutomationService.processWebhook(req.params.triggerId, req.body, req.headers);
      return res.status(202).json({
        accepted: true,
        deliveryId: result.deliveryId,
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// GET /api/v1/projects/:projectId/events
router.get(
  "/projects/:projectId/events",
  sessionAuth({ requireCsrf: false }),
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit, 10) || 50;
      const offset = parseInt(req.query.offset, 10) || 0;
      const source = typeof req.query.source === "string" ? req.query.source : undefined;
      const state = typeof req.query.state === "string" ? req.query.state : undefined;

      const result = await AutomationService.getInboundEvents(req.params.projectId, {
        source,
        state,
        limit,
        offset,
      });

      return res.status(200).json({
        data: result.events,
        meta: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          requestId: req.requestId,
        },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// ==========================================
// 3. Activity & Notifications Endpoints
// ==========================================

// GET /api/v1/activity
router.get(
  "/activity",
  sessionAuth({ requireCsrf: false }),
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit, 10) || 50;
      const offset = parseInt(req.query.offset, 10) || 0;
      const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
      const runId = typeof req.query.runId === "string" ? req.query.runId : undefined;
      const type = typeof req.query.type === "string" ? req.query.type : undefined;

      const result = await AutomationService.getActivity({ projectId, runId, type, limit, offset });
      return res.status(200).json({
        data: result.activities,
        meta: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          requestId: req.requestId,
        },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// GET /api/v1/notifications
router.get(
  "/notifications",
  sessionAuth({ requireCsrf: false }),
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit, 10) || 50;
      const offset = parseInt(req.query.offset, 10) || 0;
      const state = typeof req.query.state === "string" ? req.query.state : undefined;

      const result = await AutomationService.getNotifications({ state, limit, offset });
      return res.status(200).json({
        data: result.notifications,
        meta: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          requestId: req.requestId,
        },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// POST /api/v1/notifications/:notificationId/read
router.post(
  "/notifications/:notificationId/read",
  sessionAuth({ requireCsrf: true }),
  async (req, res) => {
    try {
      const notification = await AutomationService.markNotificationRead(req.params.notificationId);
      return res.status(200).json({
        data: notification,
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

export default router;
