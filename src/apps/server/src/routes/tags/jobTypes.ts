import {
  create_jobTypes,
  update_jobTypes,
  delete_jobTypes,
  get_jobTypes,
} from "@/lib/db/functions/tags/jobTypes";
import { Hono } from "hono";
import type { AppEnv } from "@/types/app";

const app = new Hono<AppEnv>();

app.get("/", async (c) => {
  const db = c.get("db");
  const { skip, take, order } = c.req.query();

  const skipInt = skip ? parseInt(skip) : undefined;
  const takeInt = take ? parseInt(take) : undefined;
  const orderType = order === "asc" || order === "desc" ? order : undefined;

  const default_jobTypes = await get_jobTypes(
    db,
    skipInt,
    takeInt,
    orderType,
  );
  return c.json(default_jobTypes);
});

app.post("/", async (c) => {
  const db = c.get("db");
  const body = await c.req.json();
  const success = await create_jobTypes(db, body);
  if (!success) {
    return c.json({ error: "Failed to create jobTypes" }, 500);
  }
  return c.json({ success: true }, 201);
});

app.delete("/", async (c) => {
  const db = c.get("db");
  const body = await c.req.json();
  const success = await delete_jobTypes(db, body);
  if (!success) {
    return c.json({ error: "Failed to delete jobTypes" }, 500);
  }
  return c.json({ success: true });
});

app.put("/", async (c) => {
  const db = c.get("db");
  const body = await c.req.json();
  const { select, insert } = body;
  const success = await update_jobTypes(db, select, insert);
  if (!success) {
    return c.json({ error: "Failed to update jobTypes" }, 500);
  }
  return c.json({ success: true });
});

export default app;
