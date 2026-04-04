import { jobs, queues, sources } from "@canadian-startup-jobs/db";
import { seedDefaultSources } from "@/lib/pipeline/seed";
import { withRuntimeContext } from "@/lib/db/runtime";
import { processQueueBatch } from "@/workers/processQueueBatch";
import { Hono, type Context } from "hono";
import type { AppEnv } from "@/types/app";

const app = new Hono<AppEnv>();

const getTokenFromRequest = (authorization: string | undefined, headerToken: string | undefined) => {
  if (headerToken) {
    return headerToken;
  }

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  return undefined;
};

const assertAuthorized = (c: Context<AppEnv>) => {
  const expectedToken = c.env.SCRAPER_ADMIN_TOKEN;
  if (!expectedToken) {
    return c.json(
      { error: "SCRAPER_ADMIN_TOKEN is not configured on the Worker." },
      501,
    );
  }

  const providedToken = getTokenFromRequest(
    c.req.header("authorization"),
    c.req.header("x-admin-token"),
  );

  if (providedToken !== expectedToken) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return null;
};

const getRuntimeEnv = (c: Context<AppEnv>) => ({
  ANTHROPIC_API_KEY: c.env.ANTHROPIC_API_KEY,
  ANTHROPIC_FAST_MODEL: c.env.ANTHROPIC_FAST_MODEL,
  ANTHROPIC_MAIN_MODEL: c.env.ANTHROPIC_MAIN_MODEL,
});

app.get("/pipeline/status", async (c) => {
  const authError = assertAuthorized(c);
  if (authError) {
    return authError;
  }

  return await withRuntimeContext(
    {
      db: c.get("db"),
      env: getRuntimeEnv(c),
    },
    async () => {
      const [jobCount, queueCount, sourceCount] = await Promise.all([
        c.get("db").$count(jobs),
        c.get("db").$count(queues),
        c.get("db").$count(sources),
      ]);

      return c.json({
        ok: true,
        counts: {
          jobs: jobCount,
          queuedItems: queueCount,
          sources: sourceCount,
        },
      });
    },
  );
});

app.post("/pipeline/run", async (c) => {
  const authError = assertAuthorized(c);
  if (authError) {
    return authError;
  }

  const body = await c.req.json().catch(() => ({}));
  const seed = body.seed !== false;
  const forceSeed = body.forceSeed === true;
  const maxItems = Number(body.maxItems ?? 20);
  const maxDurationMs = Number(body.maxDurationMs ?? 25_000);

  return await withRuntimeContext(
    {
      db: c.get("db"),
      env: getRuntimeEnv(c),
    },
    async () => {
      const seeded = seed ? await seedDefaultSources({ force: forceSeed }) : null;
      const processed = await processQueueBatch({ maxItems, maxDurationMs });
      const [jobCount, queueCount, sourceCount] = await Promise.all([
        c.get("db").$count(jobs),
        c.get("db").$count(queues),
        c.get("db").$count(sources),
      ]);

      return c.json({
        ok: true,
        seeded,
        processed,
        counts: {
          jobs: jobCount,
          queuedItems: queueCount,
          sources: sourceCount,
        },
      });
    },
  );
});

export default app;
