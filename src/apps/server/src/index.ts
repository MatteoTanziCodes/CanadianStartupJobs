import { Hono } from "hono";
import { cors } from 'hono/cors';
import tags from "./routes/tags";
import jobs from "./routes/jobs/jobs";
import organizations from "./routes/organizations";
import sources from "./routes/sources";

const app = new Hono();
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use("*", cors({
  origin: allowedOrigins?.length ? allowedOrigins : ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true,
}));
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

export default {
  port: 3050,
  fetch: app.fetch,
};
