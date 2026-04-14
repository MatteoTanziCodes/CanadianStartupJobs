import { createDb } from "@canadian-startup-jobs/db";
import { Hono } from "hono";
import { cors } from 'hono/cors';
import tags from "./routes/tags";
import jobs from "./routes/jobs/jobs";
import organizations from "./routes/organizations";
import sources from "./routes/sources";
import admin from "./routes/admin";
import type { AppEnv } from "./types/app";
import { withRuntimeContext } from "./lib/db/runtime";
import { seedDefaultOrganizations, seedDefaultSources } from "./lib/pipeline/seed";
import { processQueueBatch } from "./workers/processQueueBatch";

const app = new Hono<AppEnv>();

app.use("*", async (c, next) => {
  c.set("db", createDb(c.env.DB));
  await next();
});

app.use("*", (c, next) => {
  const allowedOrigins = c.env.ALLOWED_ORIGINS
  ?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

  return cors({
    origin: allowedOrigins?.length ? allowedOrigins : ['http://localhost:3001', 'http://localhost:3000'],
    credentials: true,
  })(c, next);
});
app.get("/", (c) => {
  return c.json({
    ok: true,
    service: "canadian-startup-jobs-api",
    routes: ["/jobs", "/tags", "/organizations/:id", "/sources/:id"],
  });
});
app.route("/tags", tags);
app.route("/jobs", jobs);
app.route("/organizations", organizations);
app.route("/sources", sources);
app.route("/admin", admin);

export default {
  port: 3050,
  fetch: app.fetch,
  scheduled: async (_event: ScheduledEvent, env: AppEnv["Bindings"]) => {
    const runtimeDb = createDb(env.DB);

    await withRuntimeContext(
      {
        db: runtimeDb,
        env: {
          ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
          ANTHROPIC_FAST_MODEL: env.ANTHROPIC_FAST_MODEL,
          ANTHROPIC_MAIN_MODEL: env.ANTHROPIC_MAIN_MODEL,
        },
      },
      async () => {
        await seedDefaultOrganizations();
        await seedDefaultSources();
        await processQueueBatch({ maxItems: 80, maxDurationMs: 55_000, maxHeavyItems: 6 });
      },
    );
  },
};
