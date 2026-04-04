import {
  create_industries,
  update_industries,
  delete_industries,
  get_industries,
} from "@/lib/db/functions/tags/industries";
import { Hono } from "hono";
import type { AppEnv } from "@/types/app";

const app = new Hono<AppEnv>();

app.get("/", async (c) => {
  const db = c.get("db");
  const { skip, take, order } = c.req.query();

  const skipInt = skip ? parseInt(skip) : undefined;
  const takeInt = take ? parseInt(take) : undefined;
  const orderType = order === "asc" || order === "desc" ? order : undefined;

  const default_industries = await get_industries(
    db,
    skipInt,
    takeInt,
    orderType,
  );
  return c.json(default_industries);
});

app.post("/", async (c) => {
  const db = c.get("db");
  const body = await c.req.json();
  const success = await create_industries(db, body);
  if (!success) {
    return c.json({ error: "Failed to create industries" }, 500);
  }
  return c.json({ success: true }, 201);
});

app.delete("/", async (c) => {
  const db = c.get("db");
  const body = await c.req.json();
  const success = await delete_industries(db, body);
  if (!success) {
    return c.json({ error: "Failed to delete industries" }, 500);
  }
  return c.json({ success: true });
});

app.put("/", async (c) => {
  const db = c.get("db");
  const body = await c.req.json();
  const { select, insert } = body;
  const success = await update_industries(db, select, insert);
  if (!success) {
    return c.json({ error: "Failed to update industries" }, 500);
  }
  return c.json({ success: true });
});

export default app;
