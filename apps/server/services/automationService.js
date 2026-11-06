// @ts-check
import crypto from "node:crypto";
import { query } from "../config/db.js";

/**
 * Stage 15 Automation Error
 */
export class AutomationServiceError extends Error {
  /**
   * @param {string} code
   * @param {number} status
   * @param {string} message
   * @param {any} [details]
   */
  constructor(code, status, message, details = null) {
    super(message);
    this.name = "AutomationServiceError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const ALLOWED_SOURCES = Object.freeze(["github", "generic_webhook"]);
export const ALLOWED_MISFIRE_POLICIES = Object.freeze(["skip", "latest", "bounded_catchup"]);
export const ALLOWED_OVERLAP_POLICIES = Object.freeze(["skip", "queue_one", "parallel"]);

/**
 * Validate IANA timezone
 * @param {string} tz
 */
export function validateTimezone(tz) {
  if (!tz || typeof tz !== "string") {
    throw new AutomationServiceError("AMBIGUOUS_TIME", 400, "Timezone is required and must be a string");
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
  } catch {
    throw new AutomationServiceError("AMBIGUOUS_TIME", 400, `Invalid timezone: ${tz}`);
  }
}

/**
 * Parse cron or interval recurrence and normalize
 * @param {string} expression
 * @returns {{ type: 'cron'|'interval', cronParts?: string[], intervalSeconds?: number, normalized: string }}
 */
export function parseRecurrence(expression) {
  if (!expression || typeof expression !== "string") {
    throw new AutomationServiceError("INVALID_RECURRENCE", 400, "Recurrence expression is required");
  }
  const expr = expression.trim().toLowerCase();

  // Alias checks
  if (expr === "@yearly" || expr === "@annually") return { type: "cron", cronParts: ["0", "0", "1", "1", "*"], normalized: "0 0 1 1 *" };
  if (expr === "@monthly") return { type: "cron", cronParts: ["0", "0", "1", "*", "*"], normalized: "0 0 1 * *" };
  if (expr === "@weekly") return { type: "cron", cronParts: ["0", "0", "*", "*", "0"], normalized: "0 0 * * 0" };
  if (expr === "@daily" || expr === "@midnight") return { type: "cron", cronParts: ["0", "0", "*", "*", "*"], normalized: "0 0 * * *" };
  if (expr === "@hourly") return { type: "cron", cronParts: ["0", "*", "*", "*", "*"], normalized: "0 * * * *" };

  // Interval checks: e.g. "every 15m", "every 2h", "every 1d"
  const everyMatch = expr.match(/^every\s+(\d+)\s*(m|min|minute|minutes|h|hr|hour|hours|d|day|days|s|sec|second|seconds)$/);
  if (everyMatch) {
    const val = parseInt(everyMatch[1], 10);
    const unit = everyMatch[2][0];
    if (val <= 0) throw new AutomationServiceError("INVALID_RECURRENCE", 400, "Recurrence interval must be greater than 0");
    let seconds = 0;
    if (unit === "s") seconds = val;
    else if (unit === "m") seconds = val * 60;
    else if (unit === "h") seconds = val * 3600;
    else if (unit === "d") seconds = val * 86400;

    return { type: "interval", intervalSeconds: seconds, normalized: `every ${val}${unit}` };
  }

  // 5-part cron syntax: minute hour day-of-month month day-of-week
  const parts = expr.split(/\s+/);
  if (parts.length === 5) {
    // Basic structural validation
    const [min, hr, dom, mon, dow] = parts;
    const validateField = (f, minVal, maxVal) => {
      if (f === "*") return true;
      if (f.startsWith("*/")) {
        const step = parseInt(f.slice(2), 10);
        return !isNaN(step) && step > 0 && step <= maxVal;
      }
      if (f.includes(",")) {
        return f.split(",").every(sub => validateField(sub, minVal, maxVal));
      }
      if (f.includes("-")) {
        const [start, end] = f.split("-").map(n => parseInt(n, 10));
        return !isNaN(start) && !isNaN(end) && start >= minVal && end <= maxVal && start <= end;
      }
      const num = parseInt(f, 10);
      return !isNaN(num) && num >= minVal && num <= maxVal;
    };

    if (
      !validateField(min, 0, 59) ||
      !validateField(hr, 0, 23) ||
      !validateField(dom, 1, 31) ||
      !validateField(mon, 1, 12) ||
      !validateField(dow, 0, 7)
    ) {
      throw new AutomationServiceError("INVALID_RECURRENCE", 400, `Invalid cron expression fields: ${expression}`);
    }

    return { type: "cron", cronParts: parts, normalized: parts.join(" ") };
  }

  throw new AutomationServiceError("INVALID_RECURRENCE", 400, `Unsupported recurrence format: ${expression}`);
}

/**
 * Match a number against a cron field specification
 * @param {number} val
 * @param {string} spec
 */
function matchesCronField(val, spec) {
  if (spec === "*") return true;
  if (spec.startsWith("*/")) {
    const step = parseInt(spec.slice(2), 10);
    return step > 0 && val % step === 0;
  }
  if (spec.includes(",")) {
    return spec.split(",").some(s => matchesCronField(val, s));
  }
  if (spec.includes("-")) {
    const [start, end] = spec.split("-").map(n => parseInt(n, 10));
    return val >= start && val <= end;
  }
  return parseInt(spec, 10) === val;
}

/**
 * Compute the next occurrence timestamps from a base date in a timezone
 * @param {string} expression
 * @param {string} timezone
 * @param {number} count
 * @param {Date} [fromDate]
 * @returns {string[]} ISO string array
 */
export function computeNextOccurrences(expression, timezone, count = 5, fromDate = new Date()) {
  validateTimezone(timezone);
  const parsed = parseRecurrence(expression);
  const results = [];

  if (parsed.type === "interval" && parsed.intervalSeconds) {
    let currentMs = fromDate.getTime();
    for (let i = 0; i < count; i++) {
      currentMs += parsed.intervalSeconds * 1000;
      results.push(new Date(currentMs).toISOString());
    }
    return results;
  }

  if (parsed.type === "cron" && parsed.cronParts) {
    const [minSpec, hrSpec, domSpec, monSpec, dowSpec] = parsed.cronParts;
    // Step minute by minute looking for matches (capped at 50,000 minutes to avoid infinite loops)
    let iterDate = new Date(fromDate.getTime() + 60000); // start at next minute
    iterDate.setSeconds(0, 0);

    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      weekday: "narrow",
      hour12: false,
    });

    let iterations = 0;
    while (results.length < count && iterations < 50000) {
      iterations++;
      const parts = formatter.formatToParts(iterDate);
      let m = 0, h = 0, dom = 0, mon = 0, dow = iterDate.getUTCDay();

      for (const p of parts) {
        if (p.type === "minute") m = parseInt(p.value, 10);
        else if (p.type === "hour") h = parseInt(p.value, 10) % 24;
        else if (p.type === "day") dom = parseInt(p.value, 10);
        else if (p.type === "month") mon = parseInt(p.value, 10);
      }

      if (
        matchesCronField(m, minSpec) &&
        matchesCronField(h, hrSpec) &&
        matchesCronField(dom, domSpec) &&
        matchesCronField(mon, monSpec) &&
        (matchesCronField(dow, dowSpec) || (dowSpec.includes("7") && dow === 0))
      ) {
        results.push(iterDate.toISOString());
        // Jump ahead by 1 minute
        iterDate = new Date(iterDate.getTime() + 60000);
      } else {
        iterDate = new Date(iterDate.getTime() + 60000);
      }
    }

    if (results.length === 0) {
      throw new AutomationServiceError("INVALID_RECURRENCE", 400, "Could not determine future occurrences for expression");
    }

    return results;
  }

  return results;
}

export class AutomationService {
  /**
   * Preview schedule recurrence and next occurrences
   * @param {{ expression: string, timezone: string, misfirePolicy?: string, overlapPolicy?: string }} input
   */
  static previewSchedule({ expression, timezone, misfirePolicy = "skip", overlapPolicy = "skip" }) {
    if (!expression) {
      throw new AutomationServiceError("INVALID_RECURRENCE", 400, "expression is required");
    }
    const tz = timezone || "UTC";
    validateTimezone(tz);

    const parsed = parseRecurrence(expression);
    const nextOccurrences = computeNextOccurrences(parsed.normalized, tz, 5);

    const warnings = [];
    if (!ALLOWED_MISFIRE_POLICIES.includes(misfirePolicy)) {
      warnings.push(`Unrecognized misfirePolicy: ${misfirePolicy}, defaulting to skip`);
    }
    if (!ALLOWED_OVERLAP_POLICIES.includes(overlapPolicy)) {
      warnings.push(`Unrecognized overlapPolicy: ${overlapPolicy}, defaulting to skip`);
    }

    return {
      normalizedRecurrence: parsed.normalized,
      nextOccurrences,
      warnings,
    };
  }

  /**
   * Create a schedule
   */
  static async createSchedule({
    projectId,
    goalTemplate,
    recurrence,
    timezone = "UTC",
    misfirePolicy = "skip",
    overlapPolicy = "skip",
    budgetCeilingMicroUsd,
    grantIds = [],
  }) {
    if (!projectId) {
      throw new AutomationServiceError("INVALID_INPUT", 400, "projectId is required");
    }
    const projRes = await query("SELECT id FROM projects WHERE id = $1 AND archived = 0", [projectId]);
    if (projRes.rows.length === 0) {
      throw new AutomationServiceError("PROJECT_NOT_FOUND", 404, `Project ${projectId} not found`);
    }

    if (!goalTemplate || typeof goalTemplate !== "object" || !goalTemplate.intent) {
      throw new AutomationServiceError("INVALID_INPUT", 400, "goalTemplate with intent is required");
    }

    if (budgetCeilingMicroUsd === undefined || budgetCeilingMicroUsd === null || Number(budgetCeilingMicroUsd) <= 0) {
      throw new AutomationServiceError("BUDGET_REQUIRED", 400, "budgetCeilingMicroUsd is required and must be greater than zero");
    }

    validateTimezone(timezone);
    const parsed = parseRecurrence(recurrence);

    if (!ALLOWED_MISFIRE_POLICIES.includes(misfirePolicy)) {
      throw new AutomationServiceError("INVALID_INPUT", 400, `misfirePolicy must be one of: ${ALLOWED_MISFIRE_POLICIES.join(", ")}`);
    }
    if (!ALLOWED_OVERLAP_POLICIES.includes(overlapPolicy)) {
      throw new AutomationServiceError("INVALID_INPUT", 400, `overlapPolicy must be one of: ${ALLOWED_OVERLAP_POLICIES.join(", ")}`);
    }

    if (Array.isArray(grantIds) && grantIds.length > 0) {
      const grantCheck = await query(
        "SELECT id FROM capability_grants WHERE id = ANY($1::uuid[]) AND revoked_at IS NULL",
        [grantIds]
      );
      if (grantCheck.rows.length !== grantIds.length) {
        throw new AutomationServiceError("GRANT_INSUFFICIENT", 400, "One or more grantIds are invalid or revoked");
      }
    }

    const nextOccurrences = computeNextOccurrences(parsed.normalized, timezone, 1);
    const nextFireAt = nextOccurrences[0];

    const insertSql = `
      INSERT INTO automation.schedules (
        project_id, goal_template, recurrence, timezone, misfire_policy, overlap_policy,
        budget_ceiling_micro_usd, grant_ids, next_fire_at, version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1)
      RETURNING *
    `;

    const res = await query(insertSql, [
      projectId,
      JSON.stringify(goalTemplate),
      parsed.normalized,
      timezone,
      misfirePolicy,
      overlapPolicy,
      budgetCeilingMicroUsd,
      grantIds,
      nextFireAt,
    ]);

    const schedule = res.rows[0];

    await this.recordActivity({
      projectId,
      type: "schedule.created",
      safeSummary: `Schedule created for goal: ${goalTemplate.intent.slice(0, 80)}`,
      traceId: crypto.randomUUID(),
      metadata: { scheduleId: schedule.id, recurrence: parsed.normalized, timezone },
    });

    return this._formatSchedule(schedule);
  }

  /**
   * Get schedules for project
   */
  static async getSchedules(projectId, { limit = 50, offset = 0 } = {}) {
    if (!projectId) throw new AutomationServiceError("INVALID_INPUT", 400, "projectId is required");
    const projRes = await query("SELECT id FROM projects WHERE id = $1 AND archived = 0", [projectId]);
    if (projRes.rows.length === 0) throw new AutomationServiceError("PROJECT_NOT_FOUND", 404, `Project ${projectId} not found`);

    const countRes = await query("SELECT COUNT(*) AS total FROM automation.schedules WHERE project_id = $1", [projectId]);
    const total = parseInt(countRes.rows[0]?.total || "0", 10);

    const listRes = await query(
      "SELECT * FROM automation.schedules WHERE project_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
      [projectId, Math.max(1, Math.min(200, limit)), Math.max(0, offset)]
    );

    return {
      schedules: listRes.rows.map(r => this._formatSchedule(r)),
      total,
      limit,
      offset,
    };
  }

  /**
   * Get single schedule
   */
  static async getSchedule(scheduleId) {
    if (!scheduleId) throw new AutomationServiceError("INVALID_INPUT", 400, "scheduleId is required");
    const res = await query("SELECT * FROM automation.schedules WHERE id = $1", [scheduleId]);
    if (res.rows.length === 0) {
      throw new AutomationServiceError("SCHEDULE_NOT_FOUND", 404, `Schedule ${scheduleId} not found`);
    }
    return this._formatSchedule(res.rows[0]);
  }

  /**
   * Update schedule
   */
  static async updateSchedule(scheduleId, { recurrence, timezone, misfirePolicy, overlapPolicy }) {
    const existing = await this.getSchedule(scheduleId);

    // Check active occurrence conflict
    const activeRes = await query(
      "SELECT id FROM automation.occurrences WHERE schedule_id = $1 AND state = 'running'",
      [scheduleId]
    );
    if (activeRes.rows.length > 0 && (recurrence || timezone)) {
      throw new AutomationServiceError(
        "ACTIVE_OCCURRENCE_CONFLICT",
        409,
        "Cannot update recurrence or timezone while an occurrence is actively running"
      );
    }

    let normalizedRecurrence = existing.recurrence;
    let tz = existing.timezone;
    let nextFireAt = existing.nextFireAt;

    if (timezone) {
      validateTimezone(timezone);
      tz = timezone;
    }
    if (recurrence) {
      const parsed = parseRecurrence(recurrence);
      normalizedRecurrence = parsed.normalized;
    }
    if (recurrence || timezone) {
      const nextOccurrences = computeNextOccurrences(normalizedRecurrence, tz, 1);
      nextFireAt = nextOccurrences[0];
    }

    const mPolicy = misfirePolicy || existing.misfirePolicy;
    const oPolicy = overlapPolicy || existing.overlapPolicy;

    if (!ALLOWED_MISFIRE_POLICIES.includes(mPolicy)) {
      throw new AutomationServiceError("INVALID_INPUT", 400, `misfirePolicy must be one of: ${ALLOWED_MISFIRE_POLICIES.join(", ")}`);
    }
    if (!ALLOWED_OVERLAP_POLICIES.includes(oPolicy)) {
      throw new AutomationServiceError("INVALID_INPUT", 400, `overlapPolicy must be one of: ${ALLOWED_OVERLAP_POLICIES.join(", ")}`);
    }

    const updateSql = `
      UPDATE automation.schedules
      SET recurrence = $1, timezone = $2, misfire_policy = $3, overlap_policy = $4,
          next_fire_at = $5, version = version + 1, updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `;

    const res = await query(updateSql, [normalizedRecurrence, tz, mPolicy, oPolicy, nextFireAt, scheduleId]);
    return this._formatSchedule(res.rows[0]);
  }

  /**
   * Pause schedule
   */
  static async pauseSchedule(scheduleId, { reason = "Paused by user" } = {}) {
    await this.getSchedule(scheduleId);
    const updateSql = `
      UPDATE automation.schedules
      SET paused_at = NOW(), pause_reason = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    const res = await query(updateSql, [reason, scheduleId]);
    const schedule = this._formatSchedule(res.rows[0]);

    await this.recordActivity({
      projectId: schedule.projectId,
      type: "schedule.paused",
      safeSummary: `Schedule paused: ${reason}`,
      traceId: crypto.randomUUID(),
      metadata: { scheduleId, reason },
    });

    return schedule;
  }

  /**
   * Resume schedule
   * @param {string} scheduleId
   * @param {{ misfirePolicy?: string }} [options]
   */
  static async resumeSchedule(scheduleId, { misfirePolicy = undefined } = {}) {
    const existing = await this.getSchedule(scheduleId);

    // Verify grants are not expired
    if (existing.grantIds && existing.grantIds.length > 0) {
      const grantCheck = await query(
        "SELECT id FROM capability_grants WHERE id = ANY($1::uuid[]) AND revoked_at IS NOT NULL",
        [existing.grantIds]
      );
      if (grantCheck.rows.length > 0) {
        throw new AutomationServiceError("GRANT_EXPIRED", 400, "Cannot resume schedule: one or more capability grants have been revoked or expired");
      }
    }

    const mPolicy = misfirePolicy || existing.misfirePolicy;
    if (!ALLOWED_MISFIRE_POLICIES.includes(mPolicy)) {
      throw new AutomationServiceError("INVALID_INPUT", 400, `misfirePolicy must be one of: ${ALLOWED_MISFIRE_POLICIES.join(", ")}`);
    }

    // Compute fresh nextFireAt from NOW()
    const nextOccurrences = computeNextOccurrences(existing.recurrence, existing.timezone, 1);
    const nextFireAt = nextOccurrences[0];

    const updateSql = `
      UPDATE automation.schedules
      SET paused_at = NULL, pause_reason = NULL, misfire_policy = $1, next_fire_at = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    const res = await query(updateSql, [mPolicy, nextFireAt, scheduleId]);
    const schedule = this._formatSchedule(res.rows[0]);

    await this.recordActivity({
      projectId: schedule.projectId,
      type: "schedule.resumed",
      safeSummary: "Schedule resumed",
      traceId: crypto.randomUUID(),
      metadata: { scheduleId, nextFireAt },
    });

    return schedule;
  }

  /**
   * Get occurrences for a schedule
   */
  static async getOccurrences(scheduleId, { limit = 50, offset = 0 } = {}) {
    await this.getSchedule(scheduleId);

    const countRes = await query("SELECT COUNT(*) AS total FROM automation.occurrences WHERE schedule_id = $1", [scheduleId]);
    const total = parseInt(countRes.rows[0]?.total || "0", 10);

    const listRes = await query(
      "SELECT * FROM automation.occurrences WHERE schedule_id = $1 ORDER BY scheduled_for DESC LIMIT $2 OFFSET $3",
      [scheduleId, Math.max(1, Math.min(200, limit)), Math.max(0, offset)]
    );

    return {
      occurrences: listRes.rows.map(r => this._formatOccurrence(r)),
      total,
      limit,
      offset,
    };
  }

  /**
   * Claim and trigger due occurrences
   */
  static async claimDueOccurrences({ limit = 10 } = {}) {
    const dueRes = await query(
      `SELECT * FROM automation.schedules 
       WHERE paused_at IS NULL AND next_fire_at <= NOW()
       ORDER BY next_fire_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      [limit]
    );

    const claimed = [];

    for (const sched of dueRes.rows) {
      const scheduledFor = sched.next_fire_at;

      // Check active occurrences for overlap policy
      const activeOccRes = await query(
        "SELECT id, state FROM automation.occurrences WHERE schedule_id = $1 AND state = 'running'",
        [sched.id]
      );

      let occurrenceState = "running";
      let skipReason = null;

      if (activeOccRes.rows.length > 0) {
        if (sched.overlap_policy === "skip") {
          occurrenceState = "skipped";
          skipReason = "active occurrence running; overlap policy is skip";
        } else if (sched.overlap_policy === "queue_one") {
          const queuedOccRes = await query(
            "SELECT id FROM automation.occurrences WHERE schedule_id = $1 AND state = 'queued'",
            [sched.id]
          );
          if (queuedOccRes.rows.length > 0) {
            occurrenceState = "skipped";
            skipReason = "occurrence already queued; overlap policy is queue_one";
          } else {
            occurrenceState = "queued";
          }
        }
      }

      // Insert occurrence (safe against duplicate run on same schedule & slot)
      let occRow;
      try {
        const occInsert = await query(
          `INSERT INTO automation.occurrences (
            schedule_id, project_id, scheduled_for, state, reason, claimed_at
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (schedule_id, scheduled_for) DO UPDATE SET updated_at = NOW()
          RETURNING *`,
          [
            sched.id,
            sched.project_id,
            scheduledFor,
            occurrenceState,
            skipReason,
            occurrenceState === "running" ? new Date() : null,
          ]
        );
        occRow = occInsert.rows[0];
      } catch {
        continue;
      }

      // Compute next future occurrence
      const nextOccurrences = computeNextOccurrences(sched.recurrence, sched.timezone, 1);
      const nextFireAt = nextOccurrences[0];

      await query(
        `UPDATE automation.schedules 
         SET next_fire_at = $1, last_fired_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [nextFireAt, sched.id]
      );

      if (occurrenceState === "running" || occurrenceState === "queued") {
        await this.recordActivity({
          projectId: sched.project_id,
          type: "occurrence.started",
          safeSummary: `Scheduled occurrence ${occurrenceState} for schedule ${sched.id}`,
          traceId: crypto.randomUUID(),
          metadata: { scheduleId: sched.id, occurrenceId: occRow.id, scheduledFor },
        });

        await this.createNotification({
          projectId: sched.project_id,
          summary: `Schedule triggered: ${sched.goal_template?.intent?.slice(0, 60) || sched.id}`,
          metadata: { scheduleId: sched.id, occurrenceId: occRow.id },
        });
      }

      claimed.push(this._formatOccurrence(occRow));
    }

    return claimed;
  }

  /**
   * Create Trigger
   */
  static async createTrigger({
    projectId,
    source,
    eventFilter = {},
    goalTemplate,
    grantIds = [],
    secretReferenceId,
    secretToken,
  }) {
    if (!projectId) throw new AutomationServiceError("INVALID_INPUT", 400, "projectId is required");
    const projRes = await query("SELECT id FROM projects WHERE id = $1 AND archived = 0", [projectId]);
    if (projRes.rows.length === 0) throw new AutomationServiceError("PROJECT_NOT_FOUND", 404, `Project ${projectId} not found`);

    if (!ALLOWED_SOURCES.includes(source)) {
      throw new AutomationServiceError("SOURCE_UNSUPPORTED", 400, `Source unsupported. Must be one of: ${ALLOWED_SOURCES.join(", ")}`);
    }

    if (!goalTemplate || typeof goalTemplate !== "object" || !goalTemplate.intent) {
      throw new AutomationServiceError("INVALID_INPUT", 400, "goalTemplate with intent is required");
    }

    if (Array.isArray(grantIds) && grantIds.length > 0) {
      const grantCheck = await query(
        "SELECT id FROM capability_grants WHERE id = ANY($1::uuid[]) AND revoked_at IS NULL",
        [grantIds]
      );
      if (grantCheck.rows.length !== grantIds.length) {
        throw new AutomationServiceError("GRANT_INSUFFICIENT", 400, "One or more grantIds are invalid or revoked");
      }
    }

    const token = secretToken || crypto.randomBytes(32).toString("hex");

    const insertSql = `
      INSERT INTO automation.triggers (
        project_id, source, event_filter, goal_template, grant_ids, secret_reference_id, secret_token, enabled, version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, 1)
      RETURNING *
    `;

    const res = await query(insertSql, [
      projectId,
      source,
      JSON.stringify(eventFilter || {}),
      JSON.stringify(goalTemplate),
      grantIds,
      secretReferenceId || null,
      token,
    ]);

    const trigger = res.rows[0];

    await this.recordActivity({
      projectId,
      type: "trigger.created",
      safeSummary: `Trigger created for source ${source}`,
      traceId: crypto.randomUUID(),
      metadata: { triggerId: trigger.id, source },
    });

    return this._formatTrigger(trigger);
  }

  /**
   * Get triggers for project
   */
  static async getTriggers(projectId, { limit = 50, offset = 0 } = {}) {
    if (!projectId) throw new AutomationServiceError("INVALID_INPUT", 400, "projectId is required");
    const projRes = await query("SELECT id FROM projects WHERE id = $1 AND archived = 0", [projectId]);
    if (projRes.rows.length === 0) throw new AutomationServiceError("PROJECT_NOT_FOUND", 404, `Project ${projectId} not found`);

    const countRes = await query("SELECT COUNT(*) AS total FROM automation.triggers WHERE project_id = $1", [projectId]);
    const total = parseInt(countRes.rows[0]?.total || "0", 10);

    const listRes = await query(
      "SELECT * FROM automation.triggers WHERE project_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
      [projectId, Math.max(1, Math.min(200, limit)), Math.max(0, offset)]
    );

    return {
      triggers: listRes.rows.map(r => this._formatTrigger(r)),
      total,
      limit,
      offset,
    };
  }

  /**
   * Get single trigger
   */
  static async getTrigger(triggerId) {
    if (!triggerId) throw new AutomationServiceError("INVALID_INPUT", 400, "triggerId is required");
    const res = await query("SELECT * FROM automation.triggers WHERE id = $1", [triggerId]);
    if (res.rows.length === 0) {
      throw new AutomationServiceError("TRIGGER_NOT_FOUND", 404, `Trigger ${triggerId} not found`);
    }
    return this._formatTrigger(res.rows[0]);
  }

  /**
   * Update trigger
   */
  static async updateTrigger(triggerId, { enabled, eventFilter }) {
    await this.getTrigger(triggerId);

    if (eventFilter !== undefined) {
      if (!eventFilter || typeof eventFilter !== "object" || Array.isArray(eventFilter)) {
        throw new AutomationServiceError("FILTER_INVALID", 400, "eventFilter must be a valid JSON object");
      }
    }

    const updates = ["version = version + 1", "updated_at = NOW()"];
    /** @type {any[]} */
    const params = [triggerId];
    let idx = 2;

    if (enabled !== undefined) {
      updates.push(`enabled = $${idx}`);
      params.push(Boolean(enabled));
      idx++;
    }

    if (eventFilter !== undefined) {
      updates.push(`event_filter = $${idx}`);
      params.push(JSON.stringify(eventFilter));
      idx++;
    }

    const sql = `UPDATE automation.triggers SET ${updates.join(", ")} WHERE id = $1 RETURNING *`;
    const res = await query(sql, params);
    return this._formatTrigger(res.rows[0]);
  }

  /**
   * Process inbound webhook with cryptographic verification and deduplication
   * @param {string} triggerId
   * @param {Buffer|string} rawBody
   * @param {Record<string, string>} headers
   */
  static async processWebhook(triggerId, rawBody, headers = {}) {
    const rawRes = await query("SELECT * FROM automation.triggers WHERE id = $1", [triggerId]);
    if (rawRes.rows.length === 0) {
      throw new AutomationServiceError("TRIGGER_NOT_FOUND", 404, `Trigger ${triggerId} not found`);
    }
    const trigger = rawRes.rows[0];

    const bodyBuffer = Buffer.isBuffer(rawBody)
      ? rawBody
      : Buffer.from(typeof rawBody === "object" ? JSON.stringify(rawBody) : (rawBody || ""), "utf8");
    const bodyStr = bodyBuffer.toString("utf8");

    // Header extraction
    const signatureHeader =
      headers["x-hub-signature-256"] ||
      headers["x-signature-sha256"] ||
      headers["x-signature-256"] ||
      headers["x-signature"];

    if (!signatureHeader) {
      throw new AutomationServiceError("SIGNATURE_INVALID", 400, "Missing webhook signature header");
    }

    const expectedSig = crypto
      .createHmac("sha256", trigger.secret_token)
      .update(bodyBuffer)
      .digest("hex");

    const cleanSig = signatureHeader.replace(/^sha256=/, "").trim();

    const expectedBuf = Buffer.from(expectedSig, "utf8");
    const givenBuf = Buffer.from(cleanSig, "utf8");

    if (expectedBuf.length !== givenBuf.length || !crypto.timingSafeEqual(expectedBuf, givenBuf)) {
      throw new AutomationServiceError("SIGNATURE_INVALID", 400, "Webhook signature verification failed");
    }

    const deliveryId =
      headers["x-delivery-id"] ||
      headers["x-github-delivery"] ||
      headers["x-request-id"] ||
      (() => {
        try {
          const parsed = JSON.parse(bodyStr);
          return parsed.deliveryId || parsed.id;
        } catch {
          return null;
        }
      })() ||
      crypto.randomUUID();

    // Deduplication check
    const dupCheck = await query(
      "SELECT id FROM automation.inbound_events WHERE trigger_id = $1 AND delivery_id = $2",
      [triggerId, deliveryId]
    );
    if (dupCheck.rows.length > 0) {
      throw new AutomationServiceError("REPLAY_REJECTED", 409, `Duplicate delivery ID: ${deliveryId}`);
    }

    const payloadDigest = crypto.createHash("sha256").update(bodyBuffer).digest("hex");
    let payload = {};
    try {
      payload = JSON.parse(bodyStr);
    } catch {
      payload = { raw: bodyStr };
    }

    // Check event filter matching
    let isMatch = true;
    if (trigger.event_filter && typeof trigger.event_filter === "object") {
      const filter = trigger.event_filter;
      for (const [key, val] of Object.entries(filter)) {
        if (key === "event" || key === "eventType") {
          const eventHeader = headers["x-github-event"] || headers["x-event-type"] || payload.event;
          if (eventHeader && eventHeader !== val) isMatch = false;
        } else if (payload[key] !== undefined && payload[key] !== val) {
          isMatch = false;
        }
      }
    }

    const state = trigger.enabled && isMatch ? "processed" : "ignored";

    const insertEventSql = `
      INSERT INTO automation.inbound_events (
        project_id, trigger_id, source, delivery_id, state, payload_digest, payload, processed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const eventRes = await query(insertEventSql, [
      trigger.project_id,
      triggerId,
      trigger.source,
      deliveryId,
      state,
      payloadDigest,
      JSON.stringify(payload),
      state === "processed" ? new Date() : null,
    ]);

    await this.recordActivity({
      projectId: trigger.project_id,
      type: "webhook.received",
      safeSummary: `Inbound webhook received from ${trigger.source} (delivery: ${deliveryId})`,
      traceId: crypto.randomUUID(),
      metadata: { triggerId, deliveryId, state, payloadDigest },
    });

    await this.createNotification({
      projectId: trigger.project_id,
      summary: `Inbound webhook ${deliveryId} (${trigger.source}) - ${state}`,
      metadata: { triggerId, deliveryId, state },
    });

    return {
      accepted: true,
      deliveryId,
      eventId: eventRes.rows[0].id,
      state,
    };
  }

  /**
   * Get inbound events for a project
   * @param {string} projectId
   * @param {{ source?: string, state?: string, limit?: number, offset?: number }} [options]
   */
  static async getInboundEvents(projectId, { source = undefined, state = undefined, limit = 50, offset = 0 } = {}) {
    if (!projectId) throw new AutomationServiceError("INVALID_INPUT", 400, "projectId is required");
    const projRes = await query("SELECT id FROM projects WHERE id = $1 AND archived = 0", [projectId]);
    if (projRes.rows.length === 0) throw new AutomationServiceError("PROJECT_NOT_FOUND", 404, `Project ${projectId} not found`);

    const conditions = ["project_id = $1"];
    /** @type {any[]} */
    const params = [projectId];
    let idx = 2;

    if (source) {
      conditions.push(`source = $${idx}`);
      params.push(source);
      idx++;
    }
    if (state) {
      conditions.push(`state = $${idx}`);
      params.push(state);
      idx++;
    }

    const whereClause = conditions.join(" AND ");

    const countRes = await query(`SELECT COUNT(*) AS total FROM automation.inbound_events WHERE ${whereClause}`, params);
    const total = parseInt(countRes.rows[0]?.total || "0", 10);

    const listSql = `
      SELECT * FROM automation.inbound_events
      WHERE ${whereClause}
      ORDER BY received_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    params.push(Math.max(1, Math.min(200, limit)), Math.max(0, offset));

    const listRes = await query(listSql, params);
    return {
      events: listRes.rows.map(r => this._formatInboundEvent(r)),
      total,
      limit,
      offset,
    };
  }

  /**
   * Record activity log
   * @param {{ projectId?: string|null, runId?: string|null, type: string, safeSummary: string, traceId?: string|null, metadata?: any }} options
   */
  static async recordActivity({ projectId = null, runId = null, type, safeSummary, traceId = null, metadata = {} }) {
    if (!type || !safeSummary) {
      throw new AutomationServiceError("INVALID_INPUT", 400, "type and safeSummary are required");
    }

    const insertSql = `
      INSERT INTO automation.activity (
        project_id, run_id, type, safe_summary, trace_id, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const res = await query(insertSql, [
      projectId || null,
      runId || null,
      type,
      safeSummary,
      traceId || crypto.randomUUID(),
      JSON.stringify(metadata || {}),
    ]);

    return this._formatActivity(res.rows[0]);
  }

  /**
   * Get activity items
   * @param {{ projectId?: string, runId?: string, type?: string, limit?: number, offset?: number }} [options]
   */
  static async getActivity({ projectId = undefined, runId = undefined, type = undefined, limit = 50, offset = 0 } = {}) {
    const conditions = ["1=1"];
    /** @type {any[]} */
    const params = [];
    let idx = 1;

    if (projectId) {
      conditions.push(`project_id = $${idx}`);
      params.push(projectId);
      idx++;
    }
    if (runId) {
      conditions.push(`run_id = $${idx}`);
      params.push(runId);
      idx++;
    }
    if (type) {
      conditions.push(`type = $${idx}`);
      params.push(type);
      idx++;
    }

    const whereClause = conditions.join(" AND ");

    const countRes = await query(`SELECT COUNT(*) AS total FROM automation.activity WHERE ${whereClause}`, params);
    const total = parseInt(countRes.rows[0]?.total || "0", 10);

    const listSql = `
      SELECT * FROM automation.activity
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    params.push(Math.max(1, Math.min(200, limit)), Math.max(0, offset));

    const listRes = await query(listSql, params);
    return {
      activities: listRes.rows.map(r => this._formatActivity(r)),
      total,
      limit,
      offset,
    };
  }

  /**
   * Create Notification
   * @param {{ projectId?: string|null, channel?: string, summary: string, artifactIds?: string[], metadata?: any }} options
   */
  static async createNotification({ projectId = null, channel = "local", summary, artifactIds = [], metadata = {} }) {
    if (!summary) throw new AutomationServiceError("INVALID_INPUT", 400, "summary is required");

    const insertSql = `
      INSERT INTO automation.notifications (
        project_id, channel, state, summary, artifact_ids, metadata
      ) VALUES ($1, $2, 'unread', $3, $4, $5)
      RETURNING *
    `;

    const res = await query(insertSql, [
      projectId || null,
      channel,
      summary,
      artifactIds || [],
      JSON.stringify(metadata || {}),
    ]);

    return this._formatNotification(res.rows[0]);
  }

  /**
   * Get notifications
   * @param {{ state?: string, limit?: number, offset?: number }} [options]
   */
  static async getNotifications({ state = undefined, limit = 50, offset = 0 } = {}) {
    const conditions = ["1=1"];
    /** @type {any[]} */
    const params = [];
    let idx = 1;

    if (state) {
      conditions.push(`state = $${idx}`);
      params.push(state);
      idx++;
    }

    const whereClause = conditions.join(" AND ");

    const countRes = await query(`SELECT COUNT(*) AS total FROM automation.notifications WHERE ${whereClause}`, params);
    const total = parseInt(countRes.rows[0]?.total || "0", 10);

    const listSql = `
      SELECT * FROM automation.notifications
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    params.push(Math.max(1, Math.min(200, limit)), Math.max(0, offset));

    const listRes = await query(listSql, params);
    return {
      notifications: listRes.rows.map(r => this._formatNotification(r)),
      total,
      limit,
      offset,
    };
  }

  /**
   * Mark notification as read
   */
  static async markNotificationRead(notificationId) {
    if (!notificationId) throw new AutomationServiceError("INVALID_INPUT", 400, "notificationId is required");
    const updateSql = `
      UPDATE automation.notifications
      SET state = 'read', read_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const res = await query(updateSql, [notificationId]);
    if (res.rows.length === 0) {
      throw new AutomationServiceError("NOTIFICATION_NOT_FOUND", 404, `Notification ${notificationId} not found`);
    }
    return this._formatNotification(res.rows[0]);
  }

  /**
   * Formatting helper for Schedule
   */
  static _formatSchedule(row) {
    return {
      id: row.id,
      projectId: row.project_id,
      goalTemplate: row.goal_template,
      recurrence: row.recurrence,
      timezone: row.timezone,
      misfirePolicy: row.misfire_policy,
      overlapPolicy: row.overlap_policy,
      budgetCeilingMicroUsd: row.budget_ceiling_micro_usd ? Number(row.budget_ceiling_micro_usd) : null,
      grantIds: row.grant_ids || [],
      nextFireAt: row.next_fire_at ? new Date(row.next_fire_at).toISOString() : null,
      lastFiredAt: row.last_fired_at ? new Date(row.last_fired_at).toISOString() : null,
      paused: Boolean(row.paused_at),
      pausedAt: row.paused_at ? new Date(row.paused_at).toISOString() : null,
      pauseReason: row.pause_reason,
      version: row.version,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  /**
   * Formatting helper for Occurrence
   */
  static _formatOccurrence(row) {
    return {
      id: row.id,
      scheduleId: row.schedule_id,
      projectId: row.project_id,
      scheduledFor: new Date(row.scheduled_for).toISOString(),
      state: row.state,
      runId: row.run_id,
      reason: row.reason,
      claimedAt: row.claimed_at ? new Date(row.claimed_at).toISOString() : null,
      completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  /**
   * Formatting helper for Trigger
   */
  static _formatTrigger(row) {
    return {
      id: row.id,
      projectId: row.project_id,
      source: row.source,
      eventFilter: row.event_filter,
      goalTemplate: row.goal_template,
      grantIds: row.grant_ids || [],
      secretReferenceId: row.secret_reference_id,
      secretToken: row.secret_token,
      enabled: row.enabled,
      version: row.version,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  /**
   * Formatting helper for InboundEvent
   */
  static _formatInboundEvent(row) {
    return {
      id: row.id,
      projectId: row.project_id,
      triggerId: row.trigger_id,
      source: row.source,
      deliveryId: row.delivery_id,
      state: row.state,
      payloadDigest: row.payload_digest,
      payload: row.payload,
      goalId: row.goal_id,
      runId: row.run_id,
      receivedAt: new Date(row.received_at).toISOString(),
      processedAt: row.processed_at ? new Date(row.processed_at).toISOString() : null,
    };
  }

  /**
   * Formatting helper for ActivityItem
   */
  static _formatActivity(row) {
    return {
      id: row.id,
      type: row.type,
      projectId: row.project_id,
      runId: row.run_id,
      safeSummary: row.safe_summary,
      traceId: row.trace_id,
      metadata: row.metadata,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }

  /**
   * Formatting helper for Notification
   */
  static _formatNotification(row) {
    return {
      id: row.id,
      projectId: row.project_id,
      channel: row.channel,
      state: row.state,
      summary: row.summary,
      artifactIds: row.artifact_ids || [],
      metadata: row.metadata,
      readAt: row.read_at ? new Date(row.read_at).toISOString() : null,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }
}
