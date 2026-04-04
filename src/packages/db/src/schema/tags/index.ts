import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { idColumn } from "../helpers";

const provinces = sqliteTable("provinces", {
  id: idColumn(),
  name: text("name").notNull().unique(),
  code: text("code").notNull().unique(),
});

const jobTypes = sqliteTable("job_types", {
  id: idColumn(),
  name: text("name").notNull().unique(),
});

const experienceLevels = sqliteTable("experience_levels", {
  id: idColumn(),
  name: text("name").notNull().unique(),
});

const industries = sqliteTable("industries", {
  id: idColumn(),
  name: text("name").notNull().unique(),
});

const roles = sqliteTable("roles", {
  id: idColumn(),
  name: text("name").notNull().unique(),
});

const teamSize = sqliteTable("team_sizes", {
  id: idColumn(),
  name: text("name").notNull().unique(),
});

const raisingStage = sqliteTable("raising_stages", {
  id: idColumn(),
  name: text("name").notNull().unique(),
});

export {
  provinces,
  jobTypes,
  experienceLevels,
  industries,
  roles,
  teamSize,
  raisingStage,
};
