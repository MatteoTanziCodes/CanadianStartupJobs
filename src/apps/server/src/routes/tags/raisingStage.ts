import {
  create_raisingStage,
  update_raisingStage,
  delete_raisingStage,
  get_raisingStage,
} from "@/lib/db/functions/tags/raisingStage";
import { Hono } from "hono";
import type { AppEnv } from "@/types/app";

const app = new Hono<AppEnv>();

app.get("/", async (c) => {
  const db = c.get("db");
  const { skip, take, order } = c.req.query();

  const skipInt = skip ? parseInt(skip) : undefined;
  const takeInt = take ? parseInt(take) : undefined;
  const orderType = order === "asc" || order === "desc" ? order : undefined;

  const default_raisingStage = await get_raisingStage(
    db,
    skipInt,
    takeInt,
    orderType,
  );
  return c.json({ default_raisingStage });
});

app.post("/", async (c) => {
  const db = c.get("db");
  const body = await c.req.json();
  const success = await create_raisingStage(db, body);
  if (!success) {
    return c.json({ error: "Failed to create raisingStage" }, 500);
  }
  return c.json({ success: true }, 201);
});

app.delete("/", async (c) => {
  const db = c.get("db");
  const body = await c.req.json();
  const success = await delete_raisingStage(db, body);
  if (!success) {
    return c.json({ error: "Failed to delete raisingStage" }, 500);
  }
  return c.json({ success: true });
});

app.put("/", async (c) => {
  const db = c.get("db");
  const body = await c.req.json();
  const { select, insert } = body;
  const success = await update_raisingStage(db, select, insert);
  if (!success) {
    return c.json({ error: "Failed to update raisingStage" }, 500);
  }
  return c.json({ success: true });
});

export default app;
