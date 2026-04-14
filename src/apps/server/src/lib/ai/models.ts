import { createAnthropic } from "@ai-sdk/anthropic";
import { getRuntimeEnv } from "@/lib/db/runtime";

const getAnthropicProvider = () => {
  const apiKey = getRuntimeEnv("ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  return createAnthropic({ apiKey });
};

const getFastModelId = () => getRuntimeEnv("ANTHROPIC_FAST_MODEL") ?? "claude-haiku-4-5-20251001";
const getMainModelId = () => getRuntimeEnv("ANTHROPIC_MAIN_MODEL") ?? "claude-sonnet-4-6";

const createLazyModel = (resolveModelId: () => string) =>
  new Proxy(
    {},
    {
      get(_target, prop, receiver) {
        const model = getAnthropicProvider()(resolveModelId()) as Record<PropertyKey, unknown>;
        const value = Reflect.get(model, prop, receiver);

        if (typeof value === "function") {
          return value.bind(model);
        }

        return value;
      },
    },
  );

export const claudeFast = () => createLazyModel(getFastModelId);
export const claudeMain = () => createLazyModel(getMainModelId);
