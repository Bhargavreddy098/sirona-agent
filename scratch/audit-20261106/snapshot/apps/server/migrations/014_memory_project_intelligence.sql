-- =====================================================================
-- Sirona Relational Schema Migration (PostgreSQL)
-- Migration 014: Stage 14 Memory & Project Intelligence
-- =====================================================================

CREATE SCHEMA IF NOT EXISTS knowledge;

-- 1. Embedding spaces table
CREATE TABLE IF NOT EXISTS knowledge.embedding_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_model_revision VARCHAR(128) NOT NULL,
  dimensions INTEGER NOT NULL DEFAULT 1536,
  metric VARCHAR(32) NOT NULL DEFAULT 'cosine',
  normalization VARCHAR(32) NOT NULL DEFAULT 'unit_length',
  chunker_version VARCHAR(32) NOT NULL DEFAULT 'v1',
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default 1536-dim embedding space
INSERT INTO knowledge.embedding_spaces (
  provider_model_revision, dimensions, metric, normalization, chunker_version, status
) VALUES (
  'text-embedding-3-small:v1', 1536, 'cosine', 'unit_length', 'v1', 'active'
) ON CONFLICT DO NOTHING;

-- 2. Memories table (stable identity, access scope, and tombstoning)
CREATE TABLE IF NOT EXISTS knowledge.memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE RESTRICT,
  scope_kind VARCHAR(32) NOT NULL DEFAULT 'project',
  scope_ref VARCHAR(255) NOT NULL,
  memory_kind VARCHAR(32) NOT NULL, -- 'user', 'project', 'task', 'episodic', 'semantic', 'decision', 'failure', 'evaluation'
  title VARCHAR(255) NOT NULL,
  current_revision_id UUID,
  deleted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  classification VARCHAR(32) NOT NULL DEFAULT 'internal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memories_project_kind 
  ON knowledge.memories(project_id, memory_kind) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_memories_scope 
  ON knowledge.memories(scope_kind, scope_ref) 
  WHERE deleted_at IS NULL;

-- 3. Memory revisions table (immutable corrections and provenance)
CREATE TABLE IF NOT EXISTS knowledge.memory_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES knowledge.memories(id) ON DELETE RESTRICT,
  revision INTEGER NOT NULL,
  content TEXT NOT NULL,
  content_digest VARCHAR(64) NOT NULL,
  confidence REAL NOT NULL DEFAULT 1.0 CHECK (confidence >= 0.0 AND confidence <= 1.0),
  source_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  correction_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(memory_id, revision)
);

CREATE INDEX IF NOT EXISTS idx_memory_revisions_memory 
  ON knowledge.memory_revisions(memory_id, revision DESC);

-- Add foreign key constraint from memories.current_revision_id to memory_revisions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_memories_current_revision' 
    AND table_schema = 'knowledge' 
    AND table_name = 'memories'
  ) THEN
    ALTER TABLE knowledge.memories
      ADD CONSTRAINT fk_memories_current_revision
      FOREIGN KEY (current_revision_id) REFERENCES knowledge.memory_revisions(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Memory chunks table (full-text search and vector chunking source)
CREATE TABLE IF NOT EXISTS knowledge.memory_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_revision_id UUID NOT NULL REFERENCES knowledge.memory_revisions(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  content_digest VARCHAR(64) NOT NULL,
  token_count INTEGER NOT NULL DEFAULT 0,
  search_document TSVECTOR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(memory_revision_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_memory_chunks_search 
  ON knowledge.memory_chunks USING GIN(search_document);

-- 5. Embeddings table (pgvector 1536-dimensional vector store)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector' AND installed_version IS NOT NULL) THEN
    EXECUTE '
      CREATE TABLE IF NOT EXISTS knowledge.embeddings_1536 (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chunk_id UUID NOT NULL REFERENCES knowledge.memory_chunks(id) ON DELETE CASCADE,
        embedding_space_id UUID NOT NULL REFERENCES knowledge.embedding_spaces(id) ON DELETE RESTRICT,
        embedding VECTOR(1536) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(chunk_id, embedding_space_id)
      );
    ';
  ELSE
    -- Fallback for environments without pgvector
    CREATE TABLE IF NOT EXISTS knowledge.embeddings_1536 (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      chunk_id UUID NOT NULL REFERENCES knowledge.memory_chunks(id) ON DELETE CASCADE,
      embedding_space_id UUID NOT NULL REFERENCES knowledge.embedding_spaces(id) ON DELETE RESTRICT,
      embedding REAL[] NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(chunk_id, embedding_space_id)
    );
  END IF;
END $$;

-- 6. Knowledge nodes table (AST symbols, files, endpoints, tables, requirements)
CREATE TABLE IF NOT EXISTS knowledge.nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  snapshot_id UUID REFERENCES repository_snapshots(id) ON DELETE SET NULL,
  kind VARCHAR(32) NOT NULL, -- 'file', 'symbol', 'package', 'service', 'endpoint', 'table', 'test', 'requirement', 'decision'
  stable_key VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  path VARCHAR(1024),
  range JSONB,
  content_digest VARCHAR(64) NOT NULL,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, kind, stable_key)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_project_kind 
  ON knowledge.nodes(project_id, kind);

CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_path 
  ON knowledge.nodes(project_id, path);

-- 7. Knowledge edges table (imports, calls, defines, tests, implements, depends_on)
CREATE TABLE IF NOT EXISTS knowledge.edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  snapshot_id UUID REFERENCES repository_snapshots(id) ON DELETE SET NULL,
  from_node_id UUID NOT NULL REFERENCES knowledge.nodes(id) ON DELETE CASCADE,
  to_node_id UUID NOT NULL REFERENCES knowledge.nodes(id) ON DELETE CASCADE,
  kind VARCHAR(32) NOT NULL, -- 'imports', 'calls', 'defines', 'tests', 'implements', 'reads_writes', 'depends_on', 'supersedes'
  source_ref VARCHAR(512),
  confidence REAL NOT NULL DEFAULT 1.0 CHECK (confidence >= 0.0 AND confidence <= 1.0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, from_node_id, to_node_id, kind)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_edges_from 
  ON knowledge.edges(project_id, from_node_id, kind);

CREATE INDEX IF NOT EXISTS idx_knowledge_edges_to 
  ON knowledge.edges(project_id, to_node_id, kind);

-- 8. Context bundles table (scoped reproducible context without full repo dump)
CREATE TABLE IF NOT EXISTS knowledge.context_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  run_id UUID REFERENCES runs(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  digest VARCHAR(64) NOT NULL,
  source_revision_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  token_estimate INTEGER NOT NULL DEFAULT 0,
  classification VARCHAR(32) NOT NULL DEFAULT 'internal',
  bundle_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_context_bundles_project 
  ON knowledge.context_bundles(project_id, created_at DESC);
