-- Additive Phase 1 migration. Application requires target-specific approval.
-- Existing migration runner owns BEGIN/COMMIT. Abort instead of waiting indefinitely.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- Consistent order: runs before events/effects. Quiesce execution writers before rollout.
LOCK TABLE runs IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE run_events IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE effects IN SHARE ROW EXCLUSIVE MODE;

ALTER TABLE effects ADD COLUMN IF NOT EXISTS operation_key VARCHAR(128);
CREATE UNIQUE INDEX IF NOT EXISTS effects_run_operation_key_unique
    ON effects (run_id, operation_key) WHERE operation_key IS NOT NULL;

ALTER TABLE runs ADD COLUMN IF NOT EXISTS event_sequence BIGINT NOT NULL DEFAULT 0;
UPDATE runs r SET event_sequence = GREATEST(r.event_sequence, e.sequence)
FROM (SELECT run_id, MAX(sequence) AS sequence FROM run_events GROUP BY run_id) e
WHERE r.id = e.run_id;

-- No legacy effect key backfill: distinct historical effects must not be collapsed.
-- Retain all rows, existing keys, API records, leases and sequence numbers.
