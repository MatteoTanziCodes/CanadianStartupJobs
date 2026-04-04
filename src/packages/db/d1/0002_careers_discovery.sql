PRAGMA foreign_keys = ON;

ALTER TABLE organizations ADD COLUMN careers_candidates text;
ALTER TABLE organizations ADD COLUMN careers_provider text;
ALTER TABLE organizations ADD COLUMN careers_discovery_method text;
ALTER TABLE organizations ADD COLUMN careers_confidence integer NOT NULL DEFAULT 0;
ALTER TABLE organizations ADD COLUMN last_careers_validated_at integer;

CREATE INDEX IF NOT EXISTS idx_organizations_careers_provider ON organizations(careers_provider);
CREATE INDEX IF NOT EXISTS idx_organizations_careers_confidence ON organizations(careers_confidence);
