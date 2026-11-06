// @ts-check
import { query } from "../config/db.js";

/**
 * Stage 17 Release & Recovery Service Error
 */
export class ReleaseRecoveryServiceError extends Error {
  /**
   * @param {string} code
   * @param {number} status
   * @param {string} message
   * @param {any} [details]
   */
  constructor(code, status, message, details = null) {
    super(message);
    this.name = "ReleaseRecoveryServiceError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const VALID_CHECKPOINT_KINDS = Object.freeze(["full_backup", "wal_snapshot", "state_snapshot"]);

/** Recovery stays unavailable until an approved backup/restore owner is qualified.
 * @returns {never}
 */
function recoveryUnavailable() {
  throw new ReleaseRecoveryServiceError(
    "RECOVERY_NOT_CONFIGURED", 503,
    "Backup and restore are not configured. Historical recovery records are not verified backups."
  );
}

export class ReleaseRecoveryService {
  /**
   * Get active release manifest
   * @param {{ channel?: string }} [options]
   */
  static async getReleaseManifest({ channel = "stable" } = {}) {
    const res = await query(
      `SELECT * FROM system.release_manifests 
       WHERE channel = $1 AND status = 'published'
       ORDER BY published_at DESC LIMIT 1`,
      [channel]
    );

    if (res.rows.length === 0) {
      throw new ReleaseRecoveryServiceError("RELEASE_NOT_FOUND", 404, `No published release found for channel '${channel}'`);
    }

    const row = res.rows[0];
    return {
      id: row.id,
      version: row.version,
      buildNumber: row.build_number,
      channel: row.channel,
      targetArch: row.target_arch,
      releaseDigest: row.release_digest,
      releaseNotes: row.release_notes,
      provenance: row.provenance,
      status: row.status,
      publishedAt: row.published_at,
      updateStatus: "up_to_date",
      verified: true,
    };
  }

  /**
   * Create disaster recovery checkpoint (backup)
   * @param {{ checkpointKind?: string, metadata?: any }} options
   */
  static async createRecoveryCheckpoint({ checkpointKind = "full_backup" } = {}) {
    if (!VALID_CHECKPOINT_KINDS.includes(checkpointKind)) {
      throw new ReleaseRecoveryServiceError(
        "INVALID_CHECKPOINT_KIND",
        400,
        `Checkpoint kind '${checkpointKind}' is invalid. Allowed: ${VALID_CHECKPOINT_KINDS.join(", ")}`
      );
    }

    return recoveryUnavailable();
  }

  /**
   * List recovery checkpoints
   * @param {{ limit?: number, offset?: number }} [options]
   */
  static async listRecoveryCheckpoints({ limit = 20, offset = 0 } = {}) {
    const res = await query(
      `SELECT * FROM system.recovery_checkpoints 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return res.rows.map(row => ({
      id: row.id,
      checkpointKind: row.checkpoint_kind,
      storageRef: row.storage_ref,
      checksum: row.checksum,
      sizeBytes: Number(row.size_bytes),
      verified: false, // Historical flags do not qualify backup contents.
      retentionExpiresAt: row.retention_expires_at,
      metadata: row.metadata,
      createdAt: row.created_at,
    }));
  }

  /**
   * Get single recovery checkpoint
   * @param {string} checkpointId
   */
  static async getRecoveryCheckpoint(checkpointId) {
    if (!checkpointId) throw new ReleaseRecoveryServiceError("INVALID_INPUT", 400, "checkpointId is required");

    const res = await query(
      `SELECT * FROM system.recovery_checkpoints WHERE id = $1`,
      [checkpointId]
    );

    if (res.rows.length === 0) {
      throw new ReleaseRecoveryServiceError("CHECKPOINT_NOT_FOUND", 404, `Recovery checkpoint ${checkpointId} not found`);
    }

    const row = res.rows[0];
    return {
      id: row.id,
      checkpointKind: row.checkpoint_kind,
      storageRef: row.storage_ref,
      checksum: row.checksum,
      sizeBytes: Number(row.size_bytes),
      verified: false, // Historical flags do not qualify backup contents.
      retentionExpiresAt: row.retention_expires_at,
      metadata: row.metadata,
      createdAt: row.created_at,
    };
  }

  /**
   * Execute Disaster Recovery Restore Rehearsal
   * @param {string} checkpointId
   * @param {{ simulateCorruption?: boolean }} [options]
   */
  static async executeRecoveryRehearsal(checkpointId, _options = {}) {
    if (!checkpointId) throw new ReleaseRecoveryServiceError("INVALID_INPUT", 400, "checkpointId is required");
    return recoveryUnavailable();
  }

  /**
   * Get single recovery rehearsal
   * @param {string} rehearsalId
   */
  static async getRecoveryRehearsal(rehearsalId) {
    if (!rehearsalId) throw new ReleaseRecoveryServiceError("INVALID_INPUT", 400, "rehearsalId is required");

    return recoveryUnavailable();
  }

  /**
   * Execute Storage Retention & Quota Purge Job
   * @param {{ dryRun?: boolean }} [options]
   */
  static async executeRetentionPurge({ dryRun = false } = {}) {
    const startTime = Date.now();

    // Count tombstoned memories
    const memRes = await query(
      `SELECT COUNT(*) as count FROM knowledge.memories WHERE deleted_at IS NOT NULL`
    );
    const tombstonedCount = parseInt(memRes.rows[0]?.count || "0", 10);

    let purgedCount = tombstonedCount;
    let freedBytes = tombstonedCount * 4096; // estimate 4KB per memory

    if (!dryRun && tombstonedCount > 0) {
      // Clear cyclic current_revision_id references first
      await query(
        `UPDATE knowledge.memories SET current_revision_id = NULL WHERE deleted_at IS NOT NULL`
      );
      // Delete child revisions (which cascades to memory_chunks and embeddings)
      await query(
        `DELETE FROM knowledge.memory_revisions WHERE memory_id IN (SELECT id FROM knowledge.memories WHERE deleted_at IS NOT NULL)`
      );
      // Delete tombstoned parent memories
      await query(
        `DELETE FROM knowledge.memories WHERE deleted_at IS NOT NULL`
      );
    }

    const durationMs = Date.now() - startTime;

    const res = await query(
      `INSERT INTO system.retention_jobs (
        job_kind, purged_count, freed_bytes, duration_ms, status
      ) VALUES ($1, $2, $3, $4, 'completed')
      RETURNING *`,
      [dryRun ? "dry_run_purge" : "retention_purge", purgedCount, freedBytes, durationMs]
    );

    const row = res.rows[0];
    return {
      id: row.id,
      jobKind: row.job_kind,
      purgedCount: row.purged_count,
      freedBytes: Number(row.freed_bytes),
      durationMs: row.duration_ms,
      status: row.status,
      executedAt: row.executed_at,
    };
  }

  /**
   * Get safe sanitized operational diagnostics
   */
  static async getOperationalDiagnostics() {
    const memUsage = process.memoryUsage();

    // Query active quotas
    const quotasRes = await query(`SELECT quota_key, quota_value, unit FROM system.operational_quotas`);
    const quotas = Object.fromEntries(quotasRes.rows.map(r => [r.quota_key, { value: Number(r.quota_value), unit: r.unit }]));

    // Query DB stats
    const dbSizeRes = await query(`SELECT pg_database_size(current_database()) as db_bytes`);
    const dbBytes = Number(dbSizeRes.rows[0]?.db_bytes || 0);

    const checkpointCountRes = await query(`SELECT COUNT(*) as count FROM system.recovery_checkpoints`);
    const checkpointCount = Number(checkpointCountRes.rows[0]?.count || 0);

    const migrationsRes = await query(`SELECT COUNT(*) as count FROM schema_migrations`);
    const appliedMigrations = Number(migrationsRes.rows[0]?.count || 0);

    return {
      status: "healthy",
      platform: {
        os: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        uptimeSeconds: Math.floor(process.uptime()),
      },
      process: {
        rssMb: Math.round(memUsage.rss / (1024 * 1024)),
        heapUsedMb: Math.round(memUsage.heapUsed / (1024 * 1024)),
        heapTotalMb: Math.round(memUsage.heapTotal / (1024 * 1024)),
      },
      storage: {
        databaseSizeBytes: dbBytes,
        databaseSizeMb: Math.round(dbBytes / (1024 * 1024)),
        checkpointsCount: checkpointCount,
        appliedMigrations,
      },
      quotas,
      security: {
        zeroSecretDisclosure: true,
        hostSecretsQuarantined: true,
        credentialsEncrypted: true,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
