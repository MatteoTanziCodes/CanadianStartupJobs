import { sql } from "drizzle-orm";
import { integer } from "drizzle-orm/sqlite-core";

export const idColumn = () => integer("id").primaryKey({ autoIncrement: true });

export const booleanColumn = (name: string) =>
  integer(name, { mode: "boolean" });

export const timestampColumn = (name: string) =>
  integer(name, { mode: "timestamp_ms" });

export const timestampNowColumn = (name: string) =>
  timestampColumn(name).default(sql`(unixepoch() * 1000)`).notNull();
