// @ts-check
import crypto from "crypto";
import { query, transaction } from "../config/db.js";

/**
 * Custom Error for Memory and Project Intelligence domain errors.
 */
export class MemoryServiceError extends Error {
  /**
   * @param {string} code
   * @param {number} status
   * @param {string} message
   */
  constructor(code, status, message) {
    super(message);
    this.name = "MemoryServiceError";
    this.code = code;
    this.status = status;
  }
}

/** Allowed memory kinds per ASI memory architecture */
export const ALLOWED_MEMORY_KINDS = [
  "user",
  "project",
  "task",
  "episodic",
  "semantic",
  "decision",
  "failure",
  "evaluation",
];

/**
 * SHA-256 hash helper.
 * @param {string | Buffer} data
 * @returns {string}
 */
function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Split text content into searchable chunks (300-800 chars).
 * @param {string} text
 * @returns {string[]}
 */
function chunkText(text) {
  if (!text) return [];
  const paragraphs = text.split(/\n\s*\n/);
  const chunks = [];
  let currentChunk = "";

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    if (currentChunk.length + trimmed.length > 800 && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = trimmed;
    } else {
      currentChunk = currentChunk ? currentChunk + "\n\n" + trimmed : trimmed;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  // If text is one single long block without paragraphs, slice by 600 chars
  if (chunks.length === 0 && text.trim().length > 0) {
    const raw = text.trim();
    for (let i = 0; i < raw.length; i += 600) {
      chunks.push(raw.slice(i, i + 600));
    }
  }

  return chunks;
}

export class MemoryService {
  /**
   * Format memory row for external representation.
   * @param {Record<string, any>} row
   * @returns {Record<string, any>}
   */
  static _formatMemory(row) {
    return {
      id: row.id,
      projectId: row.project_id,
      scopeKind: row.scope_kind,
      scopeRef: row.scope_ref,
      memoryKind: row.memory_kind,
      title: row.title,
      classification: row.classification,
      currentRevisionId: row.current_revision_id,
      revision: row.revision !== undefined ? Number(row.revision) : undefined,
      content: row.content,
      contentDigest: row.content_digest,
      confidence: row.confidence !== undefined ? Number(row.confidence) : undefined,
      sourceRefs: row.source_refs || [],
      metadata: row.metadata || {},
      deletedAt: row.deleted_at ? new Date(row.deleted_at).toISOString() : null,
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    };
  }

  /**
   * Get the project scope of a memory for authorization checks.
   * @param {string} memoryId
   * @returns {Promise<{ id: string, project_id: string, deleted_at: any } | null>}
   */
  static async getMemoryProjectScope(memoryId) {
    if (!memoryId) return null;
    const res = await query("SELECT id, project_id, deleted_at FROM knowledge.memories WHERE id = $1", [memoryId]);
    return res.rows[0] || null;
  }

  // ==========================================
  // 1. Memory Lifecycle (Create, Get, List, Revise, Delete)
  // ==========================================

  /**
   * Create a new memory record and initial revision.
   * @param {string} projectId
   * @param {{
   *   memoryKind: string,
   *   title: string,
   *   content: string,
   *   scopeKind?: string,
   *   scopeRef?: string,
   *   confidence?: number,
   *   sourceRefs?: any[],
   *   metadata?: Record<string, any>,
   *   classification?: string,
   *   vector?: number[] | null
   * }} payload
   */
  static async createMemory(projectId, {
    memoryKind,
    title,
    content,
    scopeKind = "project",
    scopeRef = projectId,
    confidence = 1.0,
    sourceRefs = [],
    metadata = {},
    classification = "internal",
    vector = null,
  }) {
    if (!projectId) {
      throw new MemoryServiceError("INVALID_INPUT", 400, "projectId is required");
    }
    const projRes = await query("SELECT id FROM projects WHERE id = $1 AND archived = 0", [projectId]);
    if (projRes.rows.length === 0) {
      throw new MemoryServiceError("PROJECT_NOT_FOUND", 404, `Project ${projectId} not found`);
    }

    if (!memoryKind || !ALLOWED_MEMORY_KINDS.includes(memoryKind)) {
      throw new MemoryServiceError(
        "INVALID_MEMORY_KIND",
        400,
        `memoryKind must be one of: ${ALLOWED_MEMORY_KINDS.join(", ")}`
      );
    }

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      throw new MemoryServiceError("INVALID_INPUT", 400, "Memory title is required");
    }

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      throw new MemoryServiceError("INVALID_INPUT", 400, "Memory content is required");
    }

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    const contentDigest = sha256(trimmedContent);

    return await transaction(async (client) => {
      // 1. Insert parent memory
      const memInsertSql = `
        INSERT INTO knowledge.memories (
          project_id, scope_kind, scope_ref, memory_kind, title, classification, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING *
      `;
      const memRes = await client.query(memInsertSql, [
        projectId,
        scopeKind,
        scopeRef,
        memoryKind,
        trimmedTitle,
        classification,
      ]);
      const memory = memRes.rows[0];

      // 2. Insert initial revision (revision 1)
      const revInsertSql = `
        INSERT INTO knowledge.memory_revisions (
          memory_id, revision, content, content_digest, confidence, source_refs, metadata, created_at
        ) VALUES ($1, 1, $2, $3, $4, $5, $6, NOW())
        RETURNING *
      `;
      const revRes = await client.query(revInsertSql, [
        memory.id,
        trimmedContent,
        contentDigest,
        Math.max(0.0, Math.min(1.0, Number(confidence) || 1.0)),
        JSON.stringify(sourceRefs),
        JSON.stringify(metadata),
      ]);
      const revision = revRes.rows[0];

      // 3. Update memory's current_revision_id
      await client.query(
        "UPDATE knowledge.memories SET current_revision_id = $1 WHERE id = $2",
        [revision.id, memory.id]
      );

      // 4. Create chunks for full-text search and optional vector embedding
      const chunks = chunkText(trimmedContent);
      let chunkIdx = 0;
      for (const c of chunks) {
        const cDigest = sha256(c);
        const chunkInsert = `
          INSERT INTO knowledge.memory_chunks (
            memory_revision_id, chunk_index, content, content_digest, token_count, search_document, created_at
          ) VALUES (
            $1, $2, $3, $4, $5, to_tsvector('english', $3), NOW()
          ) RETURNING id
        `;
        const chunkRes = await client.query(chunkInsert, [
          revision.id,
          chunkIdx,
          c,
          cDigest,
          Math.ceil(c.length / 4),
        ]);
        const chunkId = chunkRes.rows[0].id;

        // If a 1536-dimensional vector was provided and is valid, store it
        if (vector && Array.isArray(vector) && vector.length === 1536) {
          const spaceRes = await client.query(
            "SELECT id FROM knowledge.embedding_spaces WHERE status = 'active' LIMIT 1"
          );
          if (spaceRes.rows.length > 0) {
            const spaceId = spaceRes.rows[0].id;
            const vectorStr = `[${vector.join(",")}]`;
            await client.query(
              `INSERT INTO knowledge.embeddings_1536 (chunk_id, embedding_space_id, embedding)
               VALUES ($1, $2, $3)
               ON CONFLICT (chunk_id, embedding_space_id) DO UPDATE SET embedding = $3`,
              [chunkId, spaceId, vectorStr]
            );
          }
        }
        chunkIdx++;
      }

      return this._formatMemory({
        ...memory,
        current_revision_id: revision.id,
        revision: revision.revision,
        content: revision.content,
        content_digest: revision.content_digest,
        confidence: revision.confidence,
        source_refs: revision.source_refs,
        metadata: revision.metadata,
      });
    });
  }

  /**
   * List memories for a project.
   * @param {string} projectId
   * @param {{
   *   memoryKind?: string,
   *   scopeKind?: string,
   *   includeDeleted?: boolean,
   *   limit?: number,
   *   offset?: number
   * }} [options]
   */
  static async getProjectMemories(projectId, {
    memoryKind,
    scopeKind,
    includeDeleted = false,
    limit = 50,
    offset = 0,
  } = {}) {
    if (!projectId) {
      throw new MemoryServiceError("INVALID_INPUT", 400, "projectId is required");
    }
    const projRes = await query("SELECT id FROM projects WHERE id = $1 AND archived = 0", [projectId]);
    if (projRes.rows.length === 0) {
      throw new MemoryServiceError("PROJECT_NOT_FOUND", 404, `Project ${projectId} not found`);
    }

    const conditions = ["m.project_id = $1"];
    /** @type {any[]} */
    const params = [projectId];
    let paramIndex = 2;

    if (!includeDeleted) {
      conditions.push("m.deleted_at IS NULL");
    }

    if (memoryKind) {
      conditions.push(`m.memory_kind = $${paramIndex}`);
      params.push(memoryKind);
      paramIndex++;
    }

    if (scopeKind) {
      conditions.push(`m.scope_kind = $${paramIndex}`);
      params.push(scopeKind);
      paramIndex++;
    }

    const whereClause = conditions.join(" AND ");

    const countSql = `SELECT COUNT(*) AS total FROM knowledge.memories m WHERE ${whereClause}`;
    const countRes = await query(countSql, params);
    const total = parseInt(countRes.rows[0]?.total || "0", 10);

    const listSql = `
      SELECT 
        m.*,
        r.revision,
        r.content,
        r.content_digest,
        r.confidence,
        r.source_refs,
        r.metadata
      FROM knowledge.memories m
      LEFT JOIN knowledge.memory_revisions r ON m.current_revision_id = r.id
      WHERE ${whereClause}
      ORDER BY m.updated_at DESC, m.id DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(Math.max(1, Math.min(100, limit)), Math.max(0, offset));

    const res = await query(listSql, params);
    return {
      memories: res.rows.map(r => this._formatMemory(r)),
      total,
      limit,
      offset,
    };
  }

  /**
   * Get a single memory by ID.
   * @param {string} memoryId
   * @param {{ includeDeleted?: boolean }} [options]
   */
  static async getMemoryById(memoryId, { includeDeleted = false } = {}) {
    if (!memoryId) {
      throw new MemoryServiceError("INVALID_INPUT", 400, "memoryId is required");
    }

    const memSql = `
      SELECT 
        m.*,
        r.revision,
        r.content,
        r.content_digest,
        r.confidence,
        r.source_refs,
        r.metadata
      FROM knowledge.memories m
      LEFT JOIN knowledge.memory_revisions r ON m.current_revision_id = r.id
      WHERE m.id = $1
    `;
    const memRes = await query(memSql, [memoryId]);
    if (memRes.rows.length === 0) {
      throw new MemoryServiceError("MEMORY_NOT_FOUND", 404, `Memory ${memoryId} not found`);
    }

    const row = memRes.rows[0];
    if (row.deleted_at && !includeDeleted) {
      throw new MemoryServiceError("MEMORY_NOT_FOUND", 404, `Memory ${memoryId} has been deleted`);
    }

    // Fetch all revisions
    const revsRes = await query(
      `SELECT revision, content, content_digest, confidence, source_refs, correction_reason, metadata, created_at
       FROM knowledge.memory_revisions
       WHERE memory_id = $1
       ORDER BY revision DESC`,
      [memoryId]
    );

    return {
      memory: this._formatMemory(row),
      revisions: revsRes.rows.map(r => ({
        revision: Number(r.revision),
        content: r.content,
        contentDigest: r.content_digest,
        confidence: Number(r.confidence),
        sourceRefs: r.source_refs || [],
        correctionReason: r.correction_reason,
        metadata: r.metadata || {},
        createdAt: new Date(r.created_at).toISOString(),
      })),
    };
  }

  /**
   * Create a new revision (correction/update) for an existing memory.
   * @param {string} memoryId
   * @param {{
   *   content: string,
   *   correctionReason?: string | null,
   *   confidence?: number,
   *   sourceRefs?: any[],
   *   metadata?: Record<string, any>,
   *   vector?: number[] | null
   * }} payload
   */
  static async createMemoryRevision(memoryId, {
    content,
    correctionReason = null,
    confidence = 1.0,
    sourceRefs = [],
    metadata = {},
    vector = null,
  }) {
    if (!memoryId) {
      throw new MemoryServiceError("INVALID_INPUT", 400, "memoryId is required");
    }
    const memRes = await query("SELECT * FROM knowledge.memories WHERE id = $1", [memoryId]);
    if (memRes.rows.length === 0) {
      throw new MemoryServiceError("MEMORY_NOT_FOUND", 404, `Memory ${memoryId} not found`);
    }
    const memory = memRes.rows[0];
    if (memory.deleted_at) {
      throw new MemoryServiceError("MEMORY_NOT_FOUND", 404, `Memory ${memoryId} has been deleted`);
    }

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      throw new MemoryServiceError("INVALID_INPUT", 400, "Revision content is required");
    }

    const trimmedContent = content.trim();
    const contentDigest = sha256(trimmedContent);

    return await transaction(async (client) => {
      // Find latest revision number
      const maxRevRes = await client.query(
        "SELECT COALESCE(MAX(revision), 0) + 1 AS next_rev FROM knowledge.memory_revisions WHERE memory_id = $1",
        [memoryId]
      );
      const nextRevision = Number(maxRevRes.rows[0].next_rev);

      // Insert new revision
      const revInsertSql = `
        INSERT INTO knowledge.memory_revisions (
          memory_id, revision, content, content_digest, confidence, source_refs, correction_reason, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING *
      `;
      const revRes = await client.query(revInsertSql, [
        memoryId,
        nextRevision,
        trimmedContent,
        contentDigest,
        Math.max(0.0, Math.min(1.0, Number(confidence) || 1.0)),
        JSON.stringify(sourceRefs),
        correctionReason,
        JSON.stringify(metadata),
      ]);
      const revision = revRes.rows[0];

      // Update parent memory pointer and timestamp
      await client.query(
        "UPDATE knowledge.memories SET current_revision_id = $1, updated_at = NOW() WHERE id = $2",
        [revision.id, memoryId]
      );

      // Create chunks for new revision
      const chunks = chunkText(trimmedContent);
      let chunkIdx = 0;
      for (const c of chunks) {
        const cDigest = sha256(c);
        const chunkInsert = `
          INSERT INTO knowledge.memory_chunks (
            memory_revision_id, chunk_index, content, content_digest, token_count, search_document, created_at
          ) VALUES (
            $1, $2, $3, $4, $5, to_tsvector('english', $3), NOW()
          ) RETURNING id
        `;
        const chunkRes = await client.query(chunkInsert, [
          revision.id,
          chunkIdx,
          c,
          cDigest,
          Math.ceil(c.length / 4),
        ]);
        const chunkId = chunkRes.rows[0].id;

        if (vector && Array.isArray(vector) && vector.length === 1536) {
          const spaceRes = await client.query(
            "SELECT id FROM knowledge.embedding_spaces WHERE status = 'active' LIMIT 1"
          );
          if (spaceRes.rows.length > 0) {
            const spaceId = spaceRes.rows[0].id;
            const vectorStr = `[${vector.join(",")}]`;
            await client.query(
              `INSERT INTO knowledge.embeddings_1536 (chunk_id, embedding_space_id, embedding)
               VALUES ($1, $2, $3)
               ON CONFLICT (chunk_id, embedding_space_id) DO UPDATE SET embedding = $3`,
              [chunkId, spaceId, vectorStr]
            );
          }
        }
        chunkIdx++;
      }

      return this._formatMemory({
        ...memory,
        current_revision_id: revision.id,
        revision: revision.revision,
        content: revision.content,
        content_digest: revision.content_digest,
        confidence: revision.confidence,
        source_refs: revision.source_refs,
        correction_reason: revision.correction_reason,
        metadata: revision.metadata,
        updated_at: new Date().toISOString(),
      });
    });
  }

  /**
   * Tombstone / soft delete a memory.
   * @param {string} memoryId
   */
  static async deleteMemory(memoryId) {
    if (!memoryId) {
      throw new MemoryServiceError("INVALID_INPUT", 400, "memoryId is required");
    }
    const memRes = await query("SELECT * FROM knowledge.memories WHERE id = $1", [memoryId]);
    if (memRes.rows.length === 0) {
      throw new MemoryServiceError("MEMORY_NOT_FOUND", 404, `Memory ${memoryId} not found`);
    }
    const memory = memRes.rows[0];
    if (memory.deleted_at) {
      throw new MemoryServiceError("MEMORY_ALREADY_DELETED", 409, `Memory ${memoryId} is already deleted`);
    }

    const now = new Date();
    await query(
      "UPDATE knowledge.memories SET deleted_at = $1, updated_at = $1 WHERE id = $2",
      [now, memoryId]
    );

    return {
      deleted: true,
      memoryId,
      deletedAt: now.toISOString(),
    };
  }

  // ==========================================
  // 2. Hybrid Lexical & Semantic Retrieval
  // ==========================================

  /**
   * Search memories for a project using hybrid lexical + vector ranking with Reciprocal Rank Fusion.
   * @param {string} projectId
   * @param {{
   *   query: string,
   *   memoryKind?: string,
   *   limit?: number,
   *   vector?: number[] | null
   * }} options
   */
  static async searchMemories(projectId, {
    query: searchStr,
    memoryKind,
    limit = 20,
    vector = null,
  }) {
    if (!projectId) {
      throw new MemoryServiceError("INVALID_INPUT", 400, "projectId is required");
    }
    const projRes = await query("SELECT id FROM projects WHERE id = $1 AND archived = 0", [projectId]);
    if (projRes.rows.length === 0) {
      throw new MemoryServiceError("PROJECT_NOT_FOUND", 404, `Project ${projectId} not found`);
    }

    if (!searchStr || typeof searchStr !== "string" || searchStr.trim().length === 0) {
      throw new MemoryServiceError("INVALID_INPUT", 400, "Search query is required");
    }

    const trimmedQuery = searchStr.trim();
    const effectiveLimit = Math.max(1, Math.min(50, Number(limit) || 20));

    // 1. Lexical candidate search using PostgreSQL Full-Text
    const lexicalParams = [projectId, trimmedQuery];
    let lexicalKindClause = "";
    if (memoryKind) {
      lexicalKindClause = "AND m.memory_kind = $3";
      lexicalParams.push(memoryKind);
    }

    const lexicalSql = `
      SELECT 
        m.id AS memory_id,
        m.title,
        m.memory_kind,
        m.classification,
        r.content,
        r.source_refs,
        ts_rank_cd(c.search_document, plainto_tsquery('english', $2)) AS lexical_rank
      FROM knowledge.memories m
      JOIN knowledge.memory_revisions r ON m.current_revision_id = r.id
      JOIN knowledge.memory_chunks c ON c.memory_revision_id = r.id
      WHERE m.project_id = $1
        AND m.deleted_at IS NULL
        ${lexicalKindClause}
        AND c.search_document @@ plainto_tsquery('english', $2)
      ORDER BY lexical_rank DESC
      LIMIT 50
    `;

    const lexicalRes = await query(lexicalSql, lexicalParams);

    // Build map of memory candidates
    /** @type {Map<string, { memoryId: string, title: string, memoryKind: string, content: string, sourceRefs: any[], lexicalRank: number, vectorRank: number, rrfScore: number, matchKind: string }>} */
    const candidates = new Map();

    lexicalRes.rows.forEach((row, idx) => {
      candidates.set(row.memory_id, {
        memoryId: row.memory_id,
        title: row.title,
        memoryKind: row.memory_kind,
        content: row.content,
        sourceRefs: row.source_refs || [],
        lexicalRank: idx + 1,
        vectorRank: 0,
        rrfScore: 1.0 / (60 + (idx + 1)),
        matchKind: "lexical",
      });
    });

    // 2. Vector candidate search (if vector provided)
    if (vector && Array.isArray(vector) && vector.length === 1536) {
      const vectorParams = [projectId, `[${vector.join(",")}]`];
      let vectorKindClause = "";
      if (memoryKind) {
        vectorKindClause = "AND m.memory_kind = $3";
        vectorParams.push(memoryKind);
      }

      const vectorSql = `
        SELECT 
          m.id AS memory_id,
          m.title,
          m.memory_kind,
          r.content,
          r.source_refs,
          (e.embedding <=> $2::vector) AS cosine_dist
        FROM knowledge.embeddings_1536 e
        JOIN knowledge.memory_chunks c ON e.chunk_id = c.id
        JOIN knowledge.memory_revisions r ON c.memory_revision_id = r.id
        JOIN knowledge.memories m ON r.memory_id = m.id
        WHERE m.project_id = $1
          AND m.deleted_at IS NULL
          ${vectorKindClause}
        ORDER BY cosine_dist ASC
        LIMIT 50
      `;

      try {
        const vectorRes = await query(vectorSql, vectorParams);
        vectorRes.rows.forEach((row, idx) => {
          const vRank = idx + 1;
          const vRrf = 1.0 / (60 + vRank);
          if (candidates.has(row.memory_id)) {
            const existing = candidates.get(row.memory_id);
            if (existing) {
              existing.vectorRank = vRank;
              existing.rrfScore += vRrf;
              existing.matchKind = "hybrid";
            }
          } else {
            candidates.set(row.memory_id, {
              memoryId: row.memory_id,
              title: row.title,
              memoryKind: row.memory_kind,
              content: row.content,
              sourceRefs: row.source_refs || [],
              lexicalRank: 0,
              vectorRank: vRank,
              rrfScore: vRrf,
              matchKind: "vector",
            });
          }
        });
      } catch {
        // Fallback gracefully if pgvector distance operator throws
      }
    }

    // Sort candidates by RRF score descending
    const sorted = Array.from(candidates.values())
      .sort((a, b) => b.rrfScore - a.rrfScore)
      .slice(0, effectiveLimit);

    return {
      items: sorted.map(item => ({
        memoryId: item.memoryId,
        title: item.title,
        memoryKind: item.memoryKind,
        content: item.content,
        sourceRefs: item.sourceRefs,
        score: Number(item.rrfScore.toFixed(6)),
        matchKind: item.matchKind,
      })),
      total: sorted.length,
      query: trimmedQuery,
    };
  }

  // ==========================================
  // 3. Project Intelligence & AST Knowledge Graph
  // ==========================================

  /**
   * Parse files or repository snapshot into knowledge nodes and dependency edges.
   * @param {string} projectId
   * @param {{
   *   snapshotId?: string | null,
   *   files?: Array<{ path: string, content: string }>
   * }} options
   */
  static async indexProjectKnowledge(projectId, {
    snapshotId = null,
    files = [],
  } = {}) {
    if (!projectId) {
      throw new MemoryServiceError("INVALID_INPUT", 400, "projectId is required");
    }
    const projRes = await query("SELECT id FROM projects WHERE id = $1 AND archived = 0", [projectId]);
    if (projRes.rows.length === 0) {
      throw new MemoryServiceError("PROJECT_NOT_FOUND", 404, `Project ${projectId} not found`);
    }

    if (!Array.isArray(files) || files.length === 0) {
      throw new MemoryServiceError("INVALID_INPUT", 400, "At least one file is required for knowledge indexing");
    }

    let indexedNodes = 0;
    let indexedEdges = 0;

    await transaction(async (client) => {
      for (const file of files) {
        if (!file.path || typeof file.path !== "string") continue;
        const filePath = file.path.trim();
        const content = file.content || "";
        const fileDigest = sha256(content);

        // 1. Create file node
        const fileKey = `file:${filePath}`;
        const fileNodeRes = await client.query(
          `INSERT INTO knowledge.nodes (
             project_id, snapshot_id, kind, stable_key, name, path, content_digest, attributes, created_at, updated_at
           ) VALUES ($1, $2, 'file', $3, $4, $5, $6, $7, NOW(), NOW())
           ON CONFLICT (project_id, kind, stable_key) 
           DO UPDATE SET content_digest = $6, updated_at = NOW()
           RETURNING id`,
          [
            projectId,
            snapshotId,
            fileKey,
            filePath.split(/[/\\]/).pop() || filePath,
            filePath,
            fileDigest,
            JSON.stringify({ lineCount: content.split("\n").length, byteSize: Buffer.byteLength(content) }),
          ]
        );
        const fileNodeId = fileNodeRes.rows[0].id;
        indexedNodes++;

        // 2. Extract symbols (functions, classes, exports) from file content using regex parsing
        const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/g;
        let match;
        const createdSymbolIds = [];

        while ((match = functionRegex.exec(content)) !== null) {
          const fnName = match[1];
          const fnKey = `fn:${filePath}#${fnName}`;
          const fnDigest = sha256(`${fnKey}:${fileDigest}`);

          const fnNodeRes = await client.query(
            `INSERT INTO knowledge.nodes (
               project_id, snapshot_id, kind, stable_key, name, path, content_digest, attributes, created_at, updated_at
             ) VALUES ($1, $2, 'symbol', $3, $4, $5, $6, $7, NOW(), NOW())
             ON CONFLICT (project_id, kind, stable_key)
             DO UPDATE SET content_digest = $6, updated_at = NOW()
             RETURNING id`,
            [
              projectId,
              snapshotId,
              fnKey,
              fnName,
              filePath,
              fnDigest,
              JSON.stringify({ symbolKind: "function" }),
            ]
          );
          const fnNodeId = fnNodeRes.rows[0].id;
          createdSymbolIds.push(fnNodeId);
          indexedNodes++;

          // Create edge: file defines function
          await client.query(
            `INSERT INTO knowledge.edges (
               project_id, snapshot_id, from_node_id, to_node_id, kind, source_ref, confidence, created_at
             ) VALUES ($1, $2, $3, $4, 'defines', $5, 1.0, NOW())
             ON CONFLICT (project_id, from_node_id, to_node_id, kind) DO NOTHING`,
            [projectId, snapshotId, fileNodeId, fnNodeId, filePath]
          );
          indexedEdges++;
        }

        // 3. Extract class symbols
        const classRegex = /(?:export\s+)?class\s+([A-Za-z0-9_$]+)/g;
        while ((match = classRegex.exec(content)) !== null) {
          const className = match[1];
          const classKey = `class:${filePath}#${className}`;
          const classDigest = sha256(`${classKey}:${fileDigest}`);

          const classNodeRes = await client.query(
            `INSERT INTO knowledge.nodes (
               project_id, snapshot_id, kind, stable_key, name, path, content_digest, attributes, created_at, updated_at
             ) VALUES ($1, $2, 'symbol', $3, $4, $5, $6, $7, NOW(), NOW())
             ON CONFLICT (project_id, kind, stable_key)
             DO UPDATE SET content_digest = $6, updated_at = NOW()
             RETURNING id`,
            [
              projectId,
              snapshotId,
              classKey,
              className,
              filePath,
              classDigest,
              JSON.stringify({ symbolKind: "class" }),
            ]
          );
          const classNodeId = classNodeRes.rows[0].id;
          indexedNodes++;

          // Create edge: file defines class
          await client.query(
            `INSERT INTO knowledge.edges (
               project_id, snapshot_id, from_node_id, to_node_id, kind, source_ref, confidence, created_at
             ) VALUES ($1, $2, $3, $4, 'defines', $5, 1.0, NOW())
             ON CONFLICT (project_id, from_node_id, to_node_id, kind) DO NOTHING`,
            [projectId, snapshotId, fileNodeId, classNodeId, filePath]
          );
          indexedEdges++;
        }

        // 4. Extract import statements
        const importRegex = /import\s+(?:.+?\s+from\s+)?['"]([^'"]+)['"]/g;
        while ((match = importRegex.exec(content)) !== null) {
          const importSource = match[1];
          const pkgKey = `pkg:${importSource}`;

          // Create package node if it doesn't exist
          const pkgNodeRes = await client.query(
            `INSERT INTO knowledge.nodes (
               project_id, snapshot_id, kind, stable_key, name, path, content_digest, attributes, created_at, updated_at
             ) VALUES ($1, $2, 'package', $3, $4, null, $5, $6, NOW(), NOW())
             ON CONFLICT (project_id, kind, stable_key) DO UPDATE SET updated_at = NOW()
             RETURNING id`,
            [
              projectId,
              snapshotId,
              pkgKey,
              importSource,
              sha256(pkgKey),
              JSON.stringify({ isExternal: !importSource.startsWith(".") }),
            ]
          );
          const pkgNodeId = pkgNodeRes.rows[0].id;
          indexedNodes++;

          // Create edge: file imports package
          await client.query(
            `INSERT INTO knowledge.edges (
               project_id, snapshot_id, from_node_id, to_node_id, kind, source_ref, confidence, created_at
             ) VALUES ($1, $2, $3, $4, 'imports', $5, 1.0, NOW())
             ON CONFLICT (project_id, from_node_id, to_node_id, kind) DO NOTHING`,
            [projectId, snapshotId, fileNodeId, pkgNodeId, filePath]
          );
          indexedEdges++;
        }
      }
    });

    return {
      indexedFiles: files.length,
      indexedNodes,
      indexedEdges,
      snapshotId,
    };
  }

  /**
   * List knowledge nodes for a project.
   * @param {string} projectId
   * @param {{
   *   kind?: string,
   *   path?: string,
   *   snapshotId?: string | null,
   *   limit?: number,
   *   offset?: number
   * }} [options]
   */
  static async getKnowledgeNodes(projectId, {
    kind,
    path: filterPath,
    snapshotId,
    limit = 100,
    offset = 0,
  } = {}) {
    if (!projectId) {
      throw new MemoryServiceError("INVALID_INPUT", 400, "projectId is required");
    }
    const projRes = await query("SELECT id FROM projects WHERE id = $1 AND archived = 0", [projectId]);
    if (projRes.rows.length === 0) {
      throw new MemoryServiceError("PROJECT_NOT_FOUND", 404, `Project ${projectId} not found`);
    }

    const conditions = ["project_id = $1"];
    /** @type {any[]} */
    const params = [projectId];
    let paramIndex = 2;

    if (kind) {
      conditions.push(`kind = $${paramIndex}`);
      params.push(kind);
      paramIndex++;
    }

    if (filterPath) {
      conditions.push(`path = $${paramIndex}`);
      params.push(filterPath);
      paramIndex++;
    }

    if (snapshotId) {
      conditions.push(`snapshot_id = $${paramIndex}`);
      params.push(snapshotId);
      paramIndex++;
    }

    const whereClause = conditions.join(" AND ");

    const countSql = `SELECT COUNT(*) AS total FROM knowledge.nodes WHERE ${whereClause}`;
    const countRes = await query(countSql, params);
    const total = parseInt(countRes.rows[0]?.total || "0", 10);

    const listSql = `
      SELECT * FROM knowledge.nodes
      WHERE ${whereClause}
      ORDER BY kind ASC, name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(Math.max(1, Math.min(200, limit)), Math.max(0, offset));

    const res = await query(listSql, params);
    return {
      nodes: res.rows.map(r => ({
        id: r.id,
        projectId: r.project_id,
        snapshotId: r.snapshot_id,
        kind: r.kind,
        stableKey: r.stable_key,
        name: r.name,
        path: r.path,
        range: r.range,
        contentDigest: r.content_digest,
        attributes: r.attributes || {},
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: new Date(r.updated_at).toISOString(),
      })),
      total,
      limit,
      offset,
    };
  }

  /**
   * List knowledge edges for a project.
   * @param {string} projectId
   * @param {{
   *   kind?: string,
   *   fromNodeId?: string,
   *   toNodeId?: string,
   *   snapshotId?: string | null,
   *   limit?: number,
   *   offset?: number
   * }} [options]
   */
  static async getKnowledgeEdges(projectId, {
    kind,
    fromNodeId,
    toNodeId,
    snapshotId,
    limit = 100,
    offset = 0,
  } = {}) {
    if (!projectId) {
      throw new MemoryServiceError("INVALID_INPUT", 400, "projectId is required");
    }
    const projRes = await query("SELECT id FROM projects WHERE id = $1 AND archived = 0", [projectId]);
    if (projRes.rows.length === 0) {
      throw new MemoryServiceError("PROJECT_NOT_FOUND", 404, `Project ${projectId} not found`);
    }

    const conditions = ["e.project_id = $1"];
    /** @type {any[]} */
    const params = [projectId];
    let paramIndex = 2;

    if (kind) {
      conditions.push(`e.kind = $${paramIndex}`);
      params.push(kind);
      paramIndex++;
    }

    if (fromNodeId) {
      conditions.push(`e.from_node_id = $${paramIndex}`);
      params.push(fromNodeId);
      paramIndex++;
    }

    if (toNodeId) {
      conditions.push(`e.to_node_id = $${paramIndex}`);
      params.push(toNodeId);
      paramIndex++;
    }

    if (snapshotId) {
      conditions.push(`e.snapshot_id = $${paramIndex}`);
      params.push(snapshotId);
      paramIndex++;
    }

    const whereClause = conditions.join(" AND ");

    const countSql = `SELECT COUNT(*) AS total FROM knowledge.edges e WHERE ${whereClause}`;
    const countRes = await query(countSql, params);
    const total = parseInt(countRes.rows[0]?.total || "0", 10);

    const listSql = `
      SELECT 
        e.*,
        fn.name AS from_node_name,
        fn.kind AS from_node_kind,
        tn.name AS to_node_name,
        tn.kind AS to_node_kind
      FROM knowledge.edges e
      JOIN knowledge.nodes fn ON e.from_node_id = fn.id
      JOIN knowledge.nodes tn ON e.to_node_id = tn.id
      WHERE ${whereClause}
      ORDER BY e.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(Math.max(1, Math.min(200, limit)), Math.max(0, offset));

    const res = await query(listSql, params);
    return {
      edges: res.rows.map(r => ({
        id: r.id,
        projectId: r.project_id,
        snapshotId: r.snapshot_id,
        fromNodeId: r.from_node_id,
        fromNodeName: r.from_node_name,
        fromNodeKind: r.from_node_kind,
        toNodeId: r.to_node_id,
        toNodeName: r.to_node_name,
        toNodeKind: r.to_node_kind,
        kind: r.kind,
        sourceRef: r.source_ref,
        confidence: Number(r.confidence),
        createdAt: new Date(r.created_at).toISOString(),
      })),
      total,
      limit,
      offset,
    };
  }
}
