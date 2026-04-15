-- Add deferred_count to llm-queues so we can cap subrequest-limit deferrals.
-- Items that defer too many times (>= MAX_DEFERRED_COUNT) are marked failed
-- rather than spinning indefinitely.
ALTER TABLE "llm-queues" ADD COLUMN "deferred_count" INTEGER NOT NULL DEFAULT 0;
