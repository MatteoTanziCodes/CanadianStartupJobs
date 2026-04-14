CREATE TABLE IF NOT EXISTS page_caches (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  kind TEXT NOT NULL,
  url TEXT NOT NULL,
  markdown TEXT,
  links TEXT,
  content_hash TEXT,
  status TEXT NOT NULL DEFAULT 'fresh',
  last_error TEXT,
  fresh_til INTEGER,
  last_scraped_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  last_checked_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE UNIQUE INDEX IF NOT EXISTS page_caches_kind_url_idx
  ON page_caches(kind, url);

CREATE INDEX IF NOT EXISTS page_caches_fresh_til_idx
  ON page_caches(fresh_til);
