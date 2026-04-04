import { AppError, ERROR_CODES } from "@/lib/errors";
import { logGeneric } from "@/lib/ai/observability";
import { processNextQueuedItem } from "./processQueueBatch";

export type { AgentHelpers, AgentResult } from "@/lib/ai/agents/helpers/types";

export interface WorkerOpts {
  pollIntervalMs?: number;
  rateLimitPerSec?: number;
}

let running = false;
let loopHandle: Promise<void> | null = null;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const startLlMCallWorker = (opts: WorkerOpts = {}) => {
  if (running) {
    return;
  }
  running = true;

  const pollIntervalMs = opts.pollIntervalMs ?? 2000;
  const rateLimitPerSec = opts.rateLimitPerSec ?? 5;
  const minGap = Math.max(0, 1000 / rateLimitPerSec);
  let lastCallTime = 0;

  loopHandle = (async function workerLoop() {
    while (running) {
      const now = Date.now();
      const elapsed = now - lastCallTime;

      if (elapsed < minGap) {
        await sleep(minGap - elapsed);
        continue;
      }
      logGeneric("Worker Looping", null);
      try {
        const processed = await processNextQueuedItem();
        lastCallTime = Date.now();
        logGeneric("Processed queued item:", processed);
      } catch (err: unknown) {
        logGeneric("Worker Error:", err);
        if (err instanceof AppError && err.code === ERROR_CODES.DB_QUERY_FAILED) {
          await sleep(pollIntervalMs);
        }
      }
    }
  })();
};

export const stopLlMCallWorker = async () => {
  running = false;
  if (loopHandle) {
    await loopHandle;
    loopHandle = null;
  }
};

export const isWorkerRunning = () => running;
