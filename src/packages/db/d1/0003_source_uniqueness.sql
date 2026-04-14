CREATE UNIQUE INDEX IF NOT EXISTS idx_sources_website_unique
  ON sources(website)
  WHERE website IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sources_portfolio_unique
  ON sources(portfolio)
  WHERE portfolio IS NOT NULL;
