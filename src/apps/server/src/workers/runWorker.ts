import { startLlMCallWorker, stopLlMCallWorker, isWorkerRunning } from "@/workers/llmCallWorker";
import { db, queues } from "@/lib/db/runtime";
import { eq, sql } from "drizzle-orm";

const resetStuckJobs = async () => {
  const stuck = await db
    .update(queues)
    .set({ status: "queued"})
    .where(eq(queues.status, "in_progress"))
    .returning();

  if (stuck.length > 0) {
    console.log(`🔄 Reset ${stuck.length} stuck jobs to queued`);
  }
};

interface WorkerConfig {
  pollIntervalMs?: number;
  rateLimitPerSec?: number;
}

const gracefulShutdown = async (signal: string) => {
  console.log(`\n\n⚠️  Received ${signal}, stopping worker...`);
  await stopLlMCallWorker();
  console.log("✅ Worker stopped. Goodbye!");
  process.exit(0);
};

const runWorker = async (config: WorkerConfig = {}) => {
  if (isWorkerRunning()) {
    console.log("⚠️  Worker is already running. Please stop it first.");
    process.exit(1);
  }

  console.log("\n🔄 Starting LLM call worker...");
  console.log("   The worker will process the queue with priority order:");
  console.log("   1. jobAgent (highest priority)");
  console.log("   2. jobBoardAgent");
  console.log("   3. qualificationAgent");
  console.log("   4. organizationAgent");
  console.log("   5. portfolioLinksAgent");
  console.log("   6. sourceAgent (lowest priority)");
  console.log("\n   Press Ctrl+C to stop the worker\n");

  startLlMCallWorker({
    pollIntervalMs: config.pollIntervalMs ?? 2000,
    rateLimitPerSec: config.rateLimitPerSec ?? 2,
  });

  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

  // Prevent the script from exiting
  await new Promise(() => {});
};

export { runWorker, resetStuckJobs };
