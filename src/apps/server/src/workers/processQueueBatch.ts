import { getNextQueuedItem, updateStatus, addToQueue } from "@/lib/db/functions/queues";
import { createCall, updateCall } from "@/lib/db/functions/calls";
import { getAgent, AgentNames } from "@/lib/ai/agents/dictionary";
import { AppError, ERROR_CODES } from "@/lib/errors";
import type { AgentHelpers, AgentResult } from "@/lib/ai/agents/helpers/types";

const SUBREQUEST_LIMIT_ERROR = "Too many subrequests by single Worker invocation";
const HEAVY_AGENTS = new Set(["jobAgent", "jobBoardAgent", "qualificationAgent", "organizationAgent"]);

const isSubrequestLimitError = (value: unknown) => {
  if (!value) {
    return false;
  }

  if (value instanceof Error) {
    return value.message.includes(SUBREQUEST_LIMIT_ERROR);
  }

  if (typeof value === "string") {
    return value.includes(SUBREQUEST_LIMIT_ERROR);
  }

  if (typeof value === "object" && "message" in value && typeof value.message === "string") {
    return value.message.includes(SUBREQUEST_LIMIT_ERROR);
  }

  return false;
};

const handleRetry = async (
  queuedItem: Awaited<ReturnType<typeof getNextQueuedItem>>,
) => {
  const retryCount = (queuedItem.retryCount ?? 0) + 1;
  const maxRetries = queuedItem.maxRetries ?? 3;

  if (retryCount >= maxRetries) {
    await updateStatus({ id: queuedItem.id, status: "failed" });
    return false;
  }

  await updateStatus({ id: queuedItem.id, status: "queued", retryCount });
  return true;
};

export const processNextQueuedItem = async () => {
  const queuedItem = await getNextQueuedItem();

  await updateStatus({ id: queuedItem.id, status: "in_progress" });

  const agentName = queuedItem.agent as AgentNames;
  let agentEntry: ReturnType<typeof getAgent>;

  try {
    agentEntry = getAgent(agentName);
  } catch {
    await updateStatus({ id: queuedItem.id, status: "failed" });

    await createCall({
      queueId: queuedItem.id,
      agent: queuedItem.agent,
      payload: queuedItem.payload,
      usage: [],
      result: [],
      logs: [],
      errors: [{ message: "Agent not found in registry", agent: queuedItem.agent }],
    });

    return {
      status: "failed" as const,
      queueId: queuedItem.id,
      agent: queuedItem.agent,
      reason: "agent-not-found",
    };
  }

  const payloadParse = await agentEntry.schema.safeParseAsync(queuedItem.payload);
  if (!payloadParse.success) {
    const shouldRetry = await handleRetry(queuedItem);

    if (!shouldRetry) {
      await createCall({
        queueId: queuedItem.id,
        agent: queuedItem.agent,
        payload: queuedItem.payload,
        usage: [],
        result: [],
        logs: [],
        errors: [{ message: "Schema validation failed", errors: payloadParse.error }],
      });
    }

    return {
      status: shouldRetry ? "retrying" as const : "failed" as const,
      queueId: queuedItem.id,
      agent: queuedItem.agent,
      reason: "schema-validation",
    };
  }

  const callRow = await createCall({
    queueId: queuedItem.id,
    agent: queuedItem.agent,
    payload: payloadParse.data,
    usage: [],
    result: [],
    logs: [],
    errors: [],
  });

  const helpers: AgentHelpers = {
    addToQueue,
    updateStatus,
    createCall,
    updateCall,
    parentCallId: callRow.id,
  };

  let result: AgentResult | undefined;

  try {
    const agentResult = await agentEntry.function(queuedItem, helpers);
    if (agentResult !== undefined && agentResult !== null && typeof agentResult === "object") {
      result = agentResult as AgentResult;
    }
  } catch (err) {
    const errorObj = err instanceof Error
      ? { message: err.message, stack: err.stack }
      : err;

    await updateCall({
      id: callRow.id,
      usage: result?.usage ?? [],
      result: result?.result ?? [],
      logs: result?.logs ?? [],
      errors: [errorObj],
    });

    if (isSubrequestLimitError(err)) {
      await updateStatus({ id: queuedItem.id, status: "queued" });

      return {
        status: "deferred" as const,
        queueId: queuedItem.id,
        agent: queuedItem.agent,
        reason: SUBREQUEST_LIMIT_ERROR,
      };
    }

    const shouldRetry = await handleRetry(queuedItem);

    return {
      status: shouldRetry ? "retrying" as const : "failed" as const,
      queueId: queuedItem.id,
      agent: queuedItem.agent,
      reason: err instanceof Error ? err.message : "unknown-error",
    };
  }

  const errors = result?.errors ?? [];
  const hasError = Array.isArray(errors) && errors.length > 0;

  if (hasError) {
    if (errors.some(isSubrequestLimitError)) {
      await updateCall({
        id: callRow.id,
        usage: result?.usage ?? [],
        result: result?.result ?? [],
        logs: result?.logs ?? [],
        errors,
      });
      await updateStatus({ id: queuedItem.id, status: "queued" });

      return {
        status: "deferred" as const,
        queueId: queuedItem.id,
        agent: queuedItem.agent,
        reason: SUBREQUEST_LIMIT_ERROR,
        errors,
      };
    }

    const shouldRetry = await handleRetry(queuedItem);

    if (!shouldRetry) {
      await updateCall({
        id: callRow.id,
        usage: result?.usage ?? [],
        result: result?.result ?? [],
        logs: result?.logs ?? [],
        errors,
      });
      await updateStatus({ id: queuedItem.id, status: "failed" });
    }

    return {
      status: shouldRetry ? "retrying" as const : "failed" as const,
      queueId: queuedItem.id,
      agent: queuedItem.agent,
      reason: "agent-errors",
      errors,
    };
  }

  await updateCall({
    id: callRow.id,
    usage: result?.usage ?? [],
    result: result?.result ?? [],
    logs: result?.logs ?? [],
    errors: [],
  });

  await updateStatus({ id: queuedItem.id, status: "done" });

  if (result?.childQueueItems && Array.isArray(result.childQueueItems)) {
    for (const child of result.childQueueItems) {
      await addToQueue({
        payload: child.payload,
        agent: child.agent,
        maxRetries: child.maxRetries,
      });
    }
  }

  return {
    status: "done" as const,
    queueId: queuedItem.id,
    agent: queuedItem.agent,
    childQueueItems: result?.childQueueItems?.length ?? 0,
  };
};

export const processQueueBatch = async (args: {
  maxItems?: number;
  maxDurationMs?: number;
  maxHeavyItems?: number;
} = {}) => {
  const maxItems = args.maxItems ?? 10;
  const maxDurationMs = args.maxDurationMs ?? 25_000;
  const maxHeavyItems = args.maxHeavyItems ?? 1;
  const startedAt = Date.now();
  const results = [];
  let heavyItemsProcessed = 0;

  while (results.length < maxItems && Date.now() - startedAt < maxDurationMs) {
    try {
      const processed = await processNextQueuedItem();
      results.push(processed);

      if (HEAVY_AGENTS.has(processed.agent)) {
        heavyItemsProcessed += 1;
      }

      if (processed.status === "deferred") {
        break;
      }

      if (heavyItemsProcessed >= maxHeavyItems) {
        break;
      }
    } catch (err) {
      if (err instanceof AppError && err.code === ERROR_CODES.DB_QUERY_FAILED) {
        break;
      }

      throw err;
    }
  }

  return {
    processed: results.length,
    durationMs: Date.now() - startedAt,
    results,
  };
};
