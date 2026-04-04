CREATE TABLE IF NOT EXISTS organization_seeds (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  name TEXT NOT NULL,
  website TEXT NOT NULL,
  canonical_domain TEXT,
  priority INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE UNIQUE INDEX IF NOT EXISTS organization_seeds_website_idx
  ON organization_seeds(website);

CREATE UNIQUE INDEX IF NOT EXISTS organization_seeds_canonical_domain_idx
  ON organization_seeds(canonical_domain)
  WHERE canonical_domain IS NOT NULL;
