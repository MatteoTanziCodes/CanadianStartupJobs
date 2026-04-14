import { jobs, organizationSeeds, organizations, queues, sources } from "@canadian-startup-jobs/db";
import { seedDefaultOrganizations, seedDefaultSources } from "@/lib/pipeline/seed";
import { withRuntimeContext } from "@/lib/db/runtime";
import { resetFailedQueuedItems } from "@/lib/db/functions/queues";
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
      const [jobCount, queueCount, sourceCount, organizationCount, organizationSeedCount] = await Promise.all([
        c.get("db").$count(jobs),
        c.get("db").$count(queues),
        c.get("db").$count(sources),
        c.get("db").$count(organizations),
        c.get("db").$count(organizationSeeds),
      ]);
      const queueRows = await c.get("db").select({
        agent: queues.agent,
        status: queues.status,
      }).from(queues);
      const queueByAgent = queueRows.reduce<Record<string, number>>((acc, row) => {
        acc[row.agent] = (acc[row.agent] ?? 0) + 1;
        return acc;
      }, {});
      const queueByStatus = queueRows.reduce<Record<string, number>>((acc, row) => {
        acc[row.status] = (acc[row.status] ?? 0) + 1;
        return acc;
      }, {});

      return c.json({
        ok: true,
        counts: {
          jobs: jobCount,
          queuedItems: queueCount,
          sources: sourceCount,
          organizations: organizationCount,
          organizationSeeds: organizationSeedCount,
        },
        queue: {
          byAgent: queueByAgent,
          byStatus: queueByStatus,
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
  const seedOrganizations = body.seedOrganizations !== false;
  const seedSources = body.seedSources === true || body.seed === true;
  const forceSeed = body.forceSeed === true;
  const resetFailed = body.resetFailed === true;
  const resetAgents = Array.isArray(body.resetAgents)
    ? body.resetAgents.filter((agent: unknown): agent is string => typeof agent === "string" && agent.length > 0)
    : undefined;
  const maxItems = Number(body.maxItems ?? 20);
  const maxDurationMs = Number(body.maxDurationMs ?? 25_000);
  const maxHeavyItems = Number(body.maxHeavyItems ?? 1);

  return await withRuntimeContext(
    {
      db: c.get("db"),
      env: getRuntimeEnv(c),
    },
    async () => {
      const seededOrganizations = seedOrganizations ? await seedDefaultOrganizations({ force: forceSeed }) : null;
      const seededSources = seedSources ? await seedDefaultSources({ force: forceSeed }) : null;
      const reset = resetFailed
        ? await resetFailedQueuedItems({ agents: resetAgents })
        : [];
      const processed = await processQueueBatch({ maxItems, maxDurationMs, maxHeavyItems });
      const [jobCount, queueCount, sourceCount, organizationCount, organizationSeedCount] = await Promise.all([
        c.get("db").$count(jobs),
        c.get("db").$count(queues),
        c.get("db").$count(sources),
        c.get("db").$count(organizations),
        c.get("db").$count(organizationSeeds),
      ]);

      return c.json({
        ok: true,
        seeded: {
          organizations: seededOrganizations,
          sources: seededSources,
        },
        reset: {
          requested: resetFailed,
          count: reset.length,
          agents: resetAgents ?? null,
          queueIds: reset.map((item) => item.id),
        },
        processed,
        counts: {
          jobs: jobCount,
          queuedItems: queueCount,
          sources: sourceCount,
          organizations: organizationCount,
          organizationSeeds: organizationSeedCount,
        },
      });
    },
  );
});

export default app;
