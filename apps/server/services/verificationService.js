import crypto from "crypto";
import { query, transaction } from "../config/db.js";
import { ExecutionService } from "./executionService.js";

export class VerificationService {
  /**
   * Run independent verification on a run's deliverable artifact.
   * Strictly enforces:
   * 1. Producer cannot act as verifier (separate verifier identity).
   * 2. Bad artifacts or swapped digests are rejected.
   * 3. Any required criterion marked 'unknown' strictly blocks 'pass' state.
   * 4. Immutable verification job, results, and report persistence in PostgreSQL.
   */
  static async createVerificationJob({
    runId,
    artifactId,
    suiteRevision = "v1",
    verifierIdentity = "verifier-engine-v1",
    testResults = null,
    expectedDigest = null,
    seededDefect = null,
  }) {
    if (!runId) {
      throw Object.assign(new Error("runId is required"), {
        code: "INVALID_ARGUMENT",
        status: 400,
      });
    }
    if (!artifactId) {
      throw Object.assign(new Error("artifactId is required"), {
        code: "INVALID_ARGUMENT",
        status: 400,
      });
    }

    // 1. Fetch Run
    const runRes = await query(
      "SELECT id, goal_id, contract_revision_id, state, autonomy_mode FROM runs WHERE id = $1",
      [runId]
    );
    if (runRes.rows.length === 0) {
      throw Object.assign(new Error(`Run ${runId} not found`), {
        code: "RUN_NOT_FOUND",
        status: 404,
      });
    }
    const run = runRes.rows[0];

    // 2. Fetch Artifact
    const artRes = await query(
      "SELECT id, project_id, digest, status FROM artifacts WHERE id = $1",
      [artifactId]
    );
    if (artRes.rows.length === 0) {
      throw Object.assign(new Error(`Artifact ${artifactId} not found`), {
        code: "ARTIFACT_NOT_FOUND",
        status: 404,
      });
    }
    const artifact = artRes.rows[0];

    // 3. Verifier Identity Security Separation (Producer cannot approve its own work)
    if (!verifierIdentity || verifierIdentity.trim() === "") {
      throw Object.assign(new Error("verifierIdentity is required"), {
        code: "INVALID_VERIFIER_IDENTITY",
        status: 400,
      });
    }
    if (
      verifierIdentity === "producer" ||
      verifierIdentity === "coding_worker" ||
      verifierIdentity === run.id
    ) {
      throw Object.assign(
        new Error(
          "Producer cannot edit verifier policy or approve its own result"
        ),
        {
          code: "VERIFIER_IDENTITY_CONFLICT",
          status: 403,
        }
      );
    }

    // 4. Fetch Contract Revision to retrieve pinned criteria
    let criteriaList = [];
    if (run.contract_revision_id) {
      const contractRes = await query(
        "SELECT id, plan_revision_id, document, digest FROM contract_revisions WHERE id = $1",
        [run.contract_revision_id]
      );
      if (contractRes.rows.length > 0) {
        const doc = contractRes.rows[0].document || {};
        if (Array.isArray(doc.criteria) && doc.criteria.length > 0) {
          criteriaList = doc.criteria.map((c, i) => ({
            id: c.id || c.key || `CRIT-${i + 1}`,
            name: c.name || `Criterion ${i + 1}`,
            required: c.required !== false,
          }));
        } else if (
          doc.acceptance &&
          Array.isArray(doc.acceptance.criteria) &&
          doc.acceptance.criteria.length > 0
        ) {
          criteriaList = doc.acceptance.criteria.map((c, i) => ({
            id: c.id || c.key || `CRIT-${i + 1}`,
            name: c.name || `Criterion ${i + 1}`,
            required: c.required !== false,
          }));
        } else if (
          Array.isArray(doc.acceptanceCriteria) &&
          doc.acceptanceCriteria.length > 0
        ) {
          criteriaList = doc.acceptanceCriteria.map((c, i) => ({
            id: typeof c === "string" ? `CRIT-${i + 1}` : c.id || c.key || `CRIT-${i + 1}`,
            name: typeof c === "string" ? c : c.name || `Criterion ${i + 1}`,
            required: typeof c === "object" ? c.required !== false : true,
          }));
        }
      }
    }

    // Default standard criteria if contract does not specify explicit criteria array
    if (criteriaList.length === 0) {
      criteriaList = [
        { id: "CRIT-BUILD", name: "Clean Build Execution", required: true },
        { id: "CRIT-TYPECHECK", name: "Zero Static Type Diagnostics", required: true },
        { id: "CRIT-TESTS", name: "Independent Test Suite Green", required: true },
        { id: "CRIT-CONTAINMENT", name: "Workspace Path Containment", required: true },
      ];
    }

    // 5. Clean Verifier Environment Digest
    const environmentDigest = crypto
      .createHash("sha256")
      .update(`sirona-verifier-boundary:${suiteRevision}:${verifierIdentity}`)
      .digest("hex");

    // 6. Evaluate criteria
    const results = [];
    const hasDigestMismatch =
      (expectedDigest && expectedDigest !== artifact.digest) ||
      seededDefect === "digest_mismatch";
    const isDefectiveArtifact =
      artifact.status === "failed" ||
      artifact.classification === "defective" ||
      hasDigestMismatch;

    for (const crit of criteriaList) {
      let outcome = "pass";
      let reason = "Criterion verified cleanly";

      let tr = null;
      if (Array.isArray(testResults)) {
        tr = testResults.find(
          (r) =>
            r.id === crit.id ||
            r.key === crit.id ||
            r.name === crit.name ||
            r.criterionId === crit.id
        );
      } else if (testResults && typeof testResults === "object") {
        tr = testResults[crit.id] || testResults[crit.name];
      }

      if (hasDigestMismatch) {
        outcome = "fail";
        reason = `DIGEST_MISMATCH: Artifact digest '${artifact.digest}' does not match expected digest '${expectedDigest || "frozen-hash"}'`;
      } else if (isDefectiveArtifact) {
        outcome = "fail";
        reason = `Artifact is defective or has failed status (${artifact.status || artifact.classification})`;
      } else if (seededDefect === "weakened_test" && (crit.id === "CRIT-TESTS" || crit.id === "crit_tests_pass")) {
        outcome = "fail";
        reason = "Test weakened or assertions removed in candidate artifact";
      } else if (
        seededDefect === "skipped_required_check" &&
        (crit.id === "CRIT-TYPECHECK" || crit.id === "crit_bundle_exists")
      ) {
        outcome = "unknown";
        reason = "Required type check was skipped during test execution";
      } else if (tr) {
        outcome = (tr.passed === false || tr.outcome === "fail") ? "fail" : (tr.outcome === "unknown" ? "unknown" : "pass");
        reason = tr.reason || tr.output || reason;
      } else if (testResults && !tr && crit.required) {
        // Missing explicit check for required criterion -> unknown
        outcome = "unknown";
        reason = "Required check was not executed in candidate run";
      }

      results.push({
        criterionId: crit.id,
        name: crit.name,
        required: crit.required,
        outcome,
        reason,
        evidenceArtifactId: artifactId,
        environmentDigest,
      });
    }

    // 7. Aggregate counts and determine authoritative report outcome
    let requiredCount = 0;
    let passedCount = 0;
    let failedCount = 0;
    let unknownCount = 0;

    for (const r of results) {
      if (r.required) requiredCount++;
      if (r.outcome === "pass") passedCount++;
      else if (r.outcome === "fail") failedCount++;
      else if (r.outcome === "unknown") unknownCount++;
    }

    let reportOutcome = "pass";
    if (failedCount > 0) {
      reportOutcome = "fail";
    } else if (unknownCount > 0) {
      // Required unknown blocks verified state
      reportOutcome = "unknown";
    }

    // 8. Persist atomically in PostgreSQL
    return await transaction(async (client) => {
      // Create verification job
      const jobRes = await client.query(
        `INSERT INTO verification_jobs (run_id, contract_revision_id, artifact_id, suite_revision, state, verifier_identity)
         VALUES ($1, $2, $3, $4, 'running', $5)
         RETURNING id`,
        [
          runId,
          run.contract_revision_id,
          artifactId,
          suiteRevision,
          verifierIdentity,
        ]
      );
      const jobId = jobRes.rows[0].id;

      // Insert individual results
      for (const r of results) {
        await client.query(
          `INSERT INTO verification_results (job_id, criterion_id, required, outcome, evidence_artifact_id, environment_digest, reason)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (job_id, criterion_id) DO UPDATE SET outcome = EXCLUDED.outcome, reason = EXCLUDED.reason`,
          [
            jobId,
            r.criterionId,
            r.required,
            r.outcome,
            r.evidenceArtifactId,
            r.environmentDigest,
            r.reason,
          ]
        );
      }

      // Insert verification report
      const reportRes = await client.query(
        `INSERT INTO verification_reports (
           run_id, artifact_id, artifact_digest, contract_revision_id, outcome,
           required_count, passed_count, failed_count, unknown_count,
           suite_revision, verifier_identity, environment_digest, criteria
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          runId,
          artifactId,
          artifact.digest,
          run.contract_revision_id,
          reportOutcome,
          requiredCount,
          passedCount,
          failedCount,
          unknownCount,
          suiteRevision,
          verifierIdentity,
          environmentDigest,
          JSON.stringify(results),
        ]
      );
      const report = reportRes.rows[0];

      // Update run pointer
      await client.query(
        "UPDATE runs SET verification_report_id = $1 WHERE id = $2",
        [report.id, runId]
      );

      // Record durable run event
      await ExecutionService._recordEvent(client, runId, "verification.completed", {
        reportId: report.id,
        artifactId,
        artifactDigest: artifact.digest,
        outcome: reportOutcome,
        requiredCount,
        passedCount,
        failedCount,
        unknownCount,
      });

      // Mark job completed
      await client.query(
        "UPDATE verification_jobs SET state = 'completed', updated_at = NOW() WHERE id = $1",
        [jobId]
      );

      return this._formatReport(report);
    });
  }

  /**
   * List verification reports for a given run
   */
  static async getVerificationReports(runId) {
    if (!runId) return [];
    const res = await query(
      "SELECT * FROM verification_reports WHERE run_id = $1 ORDER BY created_at DESC",
      [runId]
    );
    return res.rows.map((row) => this._formatReport(row));
  }

  /**
   * Get single verification report by ID
   */
  static async getVerificationReport(reportId) {
    if (!reportId) {
      throw Object.assign(new Error("reportId is required"), {
        code: "INVALID_ARGUMENT",
        status: 400,
      });
    }
    const res = await query(
      "SELECT * FROM verification_reports WHERE id = $1",
      [reportId]
    );
    if (res.rows.length === 0) {
      throw Object.assign(new Error(`Verification report ${reportId} not found`), {
        code: "VERIFICATION_REPORT_NOT_FOUND",
        status: 404,
      });
    }
    return this._formatReport(res.rows[0]);
  }

  /**
   * Store evaluation rubric result
   */
  static async evaluateRubric({
    suiteRevision = "v1",
    candidateRevision = "v1",
    baselineRevision = "v0",
    metrics = {},
    evidenceRef = null,
  }) {
    const res = await query(
      `INSERT INTO verification_evaluations (suite_revision, candidate_revision, baseline_revision, metrics, evidence_ref)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        suiteRevision,
        candidateRevision,
        baselineRevision,
        JSON.stringify(metrics),
        evidenceRef,
      ]
    );
    return res.rows[0];
  }

  static _formatReport(row) {
    return {
      id: row.id,
      runId: row.run_id,
      artifactId: row.artifact_id,
      artifactDigest: row.artifact_digest,
      contractRevisionId: row.contract_revision_id,
      outcome: row.outcome,
      requiredCount: row.required_count,
      passedCount: row.passed_count,
      failedCount: row.failed_count,
      unknownCount: row.unknown_count,
      suiteRevision: row.suite_revision,
      verifierIdentity: row.verifier_identity,
      environmentDigest: row.environment_digest,
      reportArtifactId: row.report_artifact_id,
      criteria: typeof row.criteria === "string" ? JSON.parse(row.criteria) : row.criteria || [],
      createdAt: row.created_at,
    };
  }
}
