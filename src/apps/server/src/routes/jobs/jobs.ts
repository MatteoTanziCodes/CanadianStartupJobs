import { create_jobs, getJobWithRichData, countJobs, listJobs, jobCreateSchema } from "@/lib/db/functions/jobs/jobs";
import { Hono } from "hono";
import { idSchema } from "@/routes/types/types";
import type { AppEnv } from "@/types/app";

const app = new Hono<AppEnv>();

app.get("/", async (c) => {
  const db = c.get("db");
  const skip = Number(c.req.query("skip")) || 0;
  const take = Number(c.req.query("take")) || 10;

  const filters = {
    provinceId: c.req.query("provinceId") ? Number(c.req.query("provinceId")) : undefined,
    jobTypeId: c.req.query("jobTypeId") ? Number(c.req.query("jobTypeId")) : undefined,
    experienceLevelId: c.req.query("experienceLevelId") ? Number(c.req.query("experienceLevelId")) : undefined,
    industryId: c.req.query("industryId") ? Number(c.req.query("industryId")) : undefined,
    roleId: c.req.query("roleId") ? Number(c.req.query("roleId")) : undefined,
  };

  const jobs = await listJobs(db, skip, take, filters);
  const countOfJobs = await countJobs(db, filters);

  const responseObject = {
    count: countOfJobs,
    jobs
  };

  return c.json(responseObject);
});

app.post("/", async (c) => {
  const db = c.get("db");
  const body = await c.req.json();
  const parsed = jobCreateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid input", issues: parsed.error.issues }, 400);
  }

  const success = await create_jobs(db, parsed.data);

  if (!success) {
    return c.json({ error: "Failed to create job" }, 500);
  }

  return c.json({ success: true }, 201);
});

app.get("/:id", async (c) => {
  const db = c.get("db");
  const parsed = idSchema.safeParse({ id: c.req.param("id") });

  if (!parsed.success) {
    return c.json({ error: "Invalid job ID", issues: parsed.error.issues }, 400);
  }

  try {
    const job = await getJobWithRichData(db, parsed.data.id);
    return c.json(job);
  } catch (err) {
    return c.json({ error: "Job not found" }, 404);
  }
});

export default app;
