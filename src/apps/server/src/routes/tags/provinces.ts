import {
  create_provinces,
  update_provinces,
  delete_provinces,
  get_provinces,
} from "@/lib/db/functions/tags/provinces";
import { Hono } from "hono";
import type { AppEnv } from "@/types/app";

const app = new Hono<AppEnv>();

app.get("/", async (c) => {
  const db = c.get("db");
  const { skip, take, order } = c.req.query();

  const skipInt = skip ? parseInt(skip) : undefined;
  const takeInt = take ? parseInt(take) : undefined;
  const orderType = order === "asc" || order === "desc" ? order : undefined;

  const default_provinces = await get_provinces(
    db,
    skipInt,
    takeInt,
    orderType,
  );
  return c.json(default_provinces);
});

app.post("/", async (c) => {
  const db = c.get("db");
  const body = await c.req.json();
  const success = await create_provinces(db, body);
  if (!success) {
    return c.json({ error: "Failed to create provinces" }, 500);
  }
  return c.json({ success: true }, 201);
});

app.delete("/", async (c) => {
  const db = c.get("db");
  const body = await c.req.json();
  const success = await delete_provinces(db, body);
  if (!success) {
    return c.json({ error: "Failed to delete provinces" }, 500);
  }
  return c.json({ success: true });
});

app.put("/", async (c) => {
  const db = c.get("db");
  const body = await c.req.json();
  const { select, insert } = body;
  const success = await update_provinces(db, select, insert);
  if (!success) {
    return c.json({ error: "Failed to update provinces" }, 500);
  }
  return c.json({ success: true });
});

export default app;
