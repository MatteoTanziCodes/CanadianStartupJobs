import {
  create_teamSize,
  update_teamSize,
  delete_teamSize,
  get_teamSize,
} from "@/lib/db/functions/tags/teamSize";
import { Hono } from "hono";
import type { AppEnv } from "@/types/app";

const app = new Hono<AppEnv>();

app.get("/", async (c) => {
  const db = c.get("db");
  const { skip, take, order } = c.req.query();

  const skipInt = skip ? parseInt(skip) : undefined;
  const takeInt = take ? parseInt(take) : undefined;
  const orderType = order === "asc" || order === "desc" ? order : undefined;

  const default_teamSize = await get_teamSize(
    db,
    skipInt,
    takeInt,
    orderType,
  );
  return c.json({ default_teamSize });
});

app.post("/", async (c) => {
  const db = c.get("db");
  const body = await c.req.json();
  const success = await create_teamSize(db, body);
  if (!success) {
    return c.json({ error: "Failed to create teamSize" }, 500);
  }
  return c.json({ success: true }, 201);
});

app.delete("/", async (c) => {
  const db = c.get("db");
  const body = await c.req.json();
  const success = await delete_teamSize(db, body);
  if (!success) {
    return c.json({ error: "Failed to delete teamSize" }, 500);
  }
  return c.json({ success: true });
});

app.put("/", async (c) => {
  const db = c.get("db");
  const body = await c.req.json();
  const { select, insert } = body;
  const success = await update_teamSize(db, select, insert);
  if (!success) {
    return c.json({ error: "Failed to update teamSize" }, 500);
  }
  return c.json({ success: true });
});

export default app;
