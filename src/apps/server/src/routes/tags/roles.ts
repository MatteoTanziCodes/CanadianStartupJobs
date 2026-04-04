import {
  create_roles,
  update_roles,
  delete_roles,
  get_roles,
} from "@/lib/db/functions/tags/roles";
import { Hono } from "hono";
import type { AppEnv } from "@/types/app";

const app = new Hono<AppEnv>();

app.get("/", async (c) => {
  const db = c.get("db");
  const { skip, take, order } = c.req.query();

  const skipInt = skip ? parseInt(skip) : undefined;
  const takeInt = take ? parseInt(take) : undefined;
  const orderType = order === "asc" || order === "desc" ? order : undefined;

  const default_roles = await get_roles(
    db,
    skipInt,
    takeInt,
    orderType,
  );
  return c.json(default_roles);
});

app.post("/", async (c) => {
  const db = c.get("db");
  const body = await c.req.json();
  const success = await create_roles(db, body);
  if (!success) {
    return c.json({ error: "Failed to create roles" }, 500);
  }
  return c.json({ success: true }, 201);
});

app.delete("/", async (c) => {
  const db = c.get("db");
  const body = await c.req.json();
  const success = await delete_roles(db, body);
  if (!success) {
    return c.json({ error: "Failed to delete roles" }, 500);
  }
  return c.json({ success: true });
});

app.put("/", async (c) => {
  const db = c.get("db");
  const body = await c.req.json();
  const { select, insert } = body;
  const success = await update_roles(db, select, insert);
  if (!success) {
    return c.json({ error: "Failed to update roles" }, 500);
  }
  return c.json({ success: true });
});

export default app;
