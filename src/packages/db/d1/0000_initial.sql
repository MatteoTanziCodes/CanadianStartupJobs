PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS provinces (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS job_types (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  name text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS experience_levels (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  name text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS industries (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  name text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS roles (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  name text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS team_sizes (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  name text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS raising_stages (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  name text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS organizations (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  name text NOT NULL,
  city text NOT NULL,
  province text NOT NULL,
  description text NOT NULL,
  website text,
  careers_page text,
  industry text,
  created_at integer NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at integer NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS job_board_caches (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  url text NOT NULL,
  fresh_til integer,
  last_hash text,
  last_scraped_at integer NOT NULL DEFAULT (unixepoch() * 1000),
  last_checked_at integer NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS jobs (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  title text NOT NULL,
  city text NOT NULL,
  province text NOT NULL,
  remote_ok integer NOT NULL,
  salary_min integer,
  salary_max integer,
  description text NOT NULL,
  company text NOT NULL,
  job_board_url text,
  posting_url text,
  is_at_a_startup integer,
  last_scraped_markdown text,
  created_at integer NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at integer NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS job_caches (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  url text NOT NULL,
  fresh_til integer,
  last_hash text,
  last_scraped_at integer NOT NULL DEFAULT (unixepoch() * 1000),
  last_checked_at integer NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS sources (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  website text,
  portfolio text,
  created_at integer NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at integer NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS portfolio_caches (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  url text NOT NULL,
  fresh_til integer,
  last_hash text,
  last_scraped_at integer NOT NULL DEFAULT (unixepoch() * 1000),
  last_checked_at integer NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS "llm-queues" (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  payload text NOT NULL,
  agent text NOT NULL,
  status text NOT NULL,
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  created_at integer NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at integer NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS "llm-calls" (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  payload text NOT NULL,
  queue_id integer NOT NULL REFERENCES "llm-queues"(id),
  agent text NOT NULL,
  usage text NOT NULL DEFAULT '[]',
  result text NOT NULL DEFAULT '[]',
  logs text NOT NULL DEFAULT '[]',
  errors text NOT NULL DEFAULT '[]',
  created_at integer NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at integer NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS orgs_provinces (
  org_id integer NOT NULL REFERENCES organizations(id),
  province_id integer NOT NULL REFERENCES provinces(id),
  PRIMARY KEY (org_id, province_id)
);

CREATE TABLE IF NOT EXISTS orgs_industries (
  org_id integer NOT NULL REFERENCES organizations(id),
  industry_id integer NOT NULL REFERENCES industries(id),
  PRIMARY KEY (org_id, industry_id)
);

CREATE TABLE IF NOT EXISTS orgs_sizes (
  org_id integer NOT NULL REFERENCES organizations(id),
  team_size_id integer NOT NULL REFERENCES team_sizes(id),
  PRIMARY KEY (org_id, team_size_id)
);

CREATE TABLE IF NOT EXISTS orgs_stages (
  org_id integer NOT NULL REFERENCES organizations(id),
  raising_stage_id integer NOT NULL REFERENCES raising_stages(id),
  PRIMARY KEY (org_id, raising_stage_id)
);

CREATE TABLE IF NOT EXISTS orgs_jobs (
  org_id integer NOT NULL REFERENCES organizations(id),
  job_id integer NOT NULL REFERENCES jobs(id),
  PRIMARY KEY (org_id, job_id)
);

CREATE TABLE IF NOT EXISTS orgs_job_board_caches (
  org_id integer NOT NULL REFERENCES organizations(id),
  job_board_cache_id integer NOT NULL REFERENCES job_board_caches(id),
  PRIMARY KEY (org_id, job_board_cache_id)
);

CREATE TABLE IF NOT EXISTS jobs_provinces (
  job_id integer NOT NULL REFERENCES jobs(id),
  province_id integer NOT NULL REFERENCES provinces(id),
  PRIMARY KEY (job_id, province_id)
);

CREATE TABLE IF NOT EXISTS jobs_job_types (
  job_id integer NOT NULL REFERENCES jobs(id),
  job_type_id integer NOT NULL REFERENCES job_types(id),
  PRIMARY KEY (job_id, job_type_id)
);

CREATE TABLE IF NOT EXISTS jobs_experience_levels (
  job_id integer NOT NULL REFERENCES jobs(id),
  experience_level_id integer NOT NULL REFERENCES experience_levels(id),
  PRIMARY KEY (job_id, experience_level_id)
);

CREATE TABLE IF NOT EXISTS jobs_industries (
  job_id integer NOT NULL REFERENCES jobs(id),
  industry_id integer NOT NULL REFERENCES industries(id),
  PRIMARY KEY (job_id, industry_id)
);

CREATE TABLE IF NOT EXISTS jobs_roles (
  job_id integer NOT NULL REFERENCES jobs(id),
  role_id integer NOT NULL REFERENCES roles(id),
  PRIMARY KEY (job_id, role_id)
);

CREATE TABLE IF NOT EXISTS jobs_job_caches (
  job_id integer NOT NULL REFERENCES jobs(id),
  job_cache_id integer NOT NULL REFERENCES job_caches(id),
  PRIMARY KEY (job_id, job_cache_id)
);

CREATE TABLE IF NOT EXISTS sources_portfolio_caches (
  source_id integer NOT NULL REFERENCES sources(id),
  portfolio_cache_id integer NOT NULL REFERENCES portfolio_caches(id),
  PRIMARY KEY (source_id, portfolio_cache_id)
);
