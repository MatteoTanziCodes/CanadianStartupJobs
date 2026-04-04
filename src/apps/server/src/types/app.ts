import type { Database } from "@canadian-startup-jobs/db";

export type AppBindings = {
  DB: any;
  ALLOWED_ORIGINS?: string;
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_FAST_MODEL?: string;
  ANTHROPIC_MAIN_MODEL?: string;
  SCRAPER_ADMIN_TOKEN?: string;
};

export type AppVariables = {
  db: Database;
};

export type AppEnv = {
  Bindings: AppBindings;
  Variables: AppVariables;
};
