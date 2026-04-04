PRAGMA foreign_keys = ON;

ALTER TABLE organizations ADD COLUMN canonical_domain text;
ALTER TABLE organizations ADD COLUMN careers_domain text;
ALTER TABLE organizations ADD COLUMN qualification_status text NOT NULL DEFAULT 'pending';
ALTER TABLE organizations ADD COLUMN ownership_status text NOT NULL DEFAULT 'unknown';
ALTER TABLE organizations ADD COLUMN operations_status text NOT NULL DEFAULT 'unknown';
ALTER TABLE organizations ADD COLUMN canadian_confidence integer NOT NULL DEFAULT 0;
ALTER TABLE organizations ADD COLUMN qualification_evidence_summary text;
ALTER TABLE organizations ADD COLUMN evidence_urls text;
ALTER TABLE organizations ADD COLUMN review_reason text;
ALTER TABLE organizations ADD COLUMN last_qualified_at integer;
ALTER TABLE organizations ADD COLUMN last_seen_at integer;

ALTER TABLE jobs ADD COLUMN canonical_posting_url text;
ALTER TABLE jobs ADD COLUMN ats_provider text;
ALTER TABLE jobs ADD COLUMN extraction_method text NOT NULL DEFAULT 'llm';
ALTER TABLE jobs ADD COLUMN listing_status text NOT NULL DEFAULT 'active';
ALTER TABLE jobs ADD COLUMN review_status text NOT NULL DEFAULT 'approved';
ALTER TABLE jobs ADD COLUMN review_reason text;
ALTER TABLE jobs ADD COLUMN first_seen_at integer;
ALTER TABLE jobs ADD COLUMN last_seen_at integer;
ALTER TABLE jobs ADD COLUMN last_checked_at integer;

ALTER TABLE sources ADD COLUMN kind text NOT NULL DEFAULT 'vc_portfolio';

UPDATE organizations
SET last_seen_at = COALESCE(updated_at, created_at)
WHERE last_seen_at IS NULL;

UPDATE jobs
SET first_seen_at = COALESCE(created_at, unixepoch() * 1000),
    last_seen_at = COALESCE(updated_at, created_at, unixepoch() * 1000),
    last_checked_at = COALESCE(updated_at, created_at, unixepoch() * 1000)
WHERE first_seen_at IS NULL
   OR last_seen_at IS NULL
   OR last_checked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_canonical_domain ON organizations(canonical_domain);
CREATE INDEX IF NOT EXISTS idx_organizations_qualification_status ON organizations(qualification_status);
CREATE INDEX IF NOT EXISTS idx_jobs_canonical_posting_url ON jobs(canonical_posting_url);
CREATE INDEX IF NOT EXISTS idx_jobs_listing_status ON jobs(listing_status);
CREATE INDEX IF NOT EXISTS idx_jobs_review_status ON jobs(review_status);
