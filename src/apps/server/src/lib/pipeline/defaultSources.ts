export interface SourceConfig {
  name: string;
  home: string;
  portfolio: string;
  kind: "vc_portfolio" | "accelerator_directory" | "curated_directory";
}

export const DEFAULT_SOURCES: SourceConfig[] = [
  {
    name: "Garage Capital",
    home: "https://www.garage.vc",
    portfolio: "https://www.garage.vc/#portfolio",
    kind: "vc_portfolio",
  },
  {
    name: "Inovia Capital",
    home: "https://www.inovia.vc",
    portfolio: "https://www.inovia.vc/active-companies/",
    kind: "vc_portfolio",
  },
  {
    name: "Real Ventures",
    home: "https://www.realventures.com",
    portfolio: "https://jobs.realventures.com",
    kind: "vc_portfolio",
  },
  {
    name: "Version One Ventures",
    home: "https://versionone.vc",
    portfolio: "https://versionone.vc/portfolio/",
    kind: "vc_portfolio",
  },
  {
    name: "Panache Ventures",
    home: "https://www.panache.vc",
    portfolio: "https://www.panache.vc/portfolio",
    kind: "vc_portfolio",
  },
  {
    name: "Highline Beta",
    home: "https://www.highlinebeta.com",
    portfolio: "https://www.highlinebeta.com/venture-capital/",
    kind: "vc_portfolio",
  },
  {
    name: "Golden Ventures",
    home: "https://www.golden.ventures",
    portfolio: "https://jobs.golden.ventures",
    kind: "vc_portfolio",
  },
  {
    name: "Relay Ventures",
    home: "https://relay.vc",
    portfolio: "https://relay.vc/portfolio/",
    kind: "vc_portfolio",
  },
  {
    name: "Radical Ventures",
    home: "https://radical.vc",
    portfolio: "https://radical.vc/portfolio/",
    kind: "vc_portfolio",
  },
  {
    name: "Round13 Capital",
    home: "https://round13.com",
    portfolio: "https://round13.com/portfolio/",
    kind: "vc_portfolio",
  },
  {
    name: "Framework Venture Partners",
    home: "https://framework.vc",
    portfolio: "https://framework.vc/fr/portfolio/",
    kind: "vc_portfolio",
  },
  {
    name: "L-SPARK",
    home: "https://www.l-spark.com",
    portfolio: "https://www.l-spark.com/meet-our-companies/",
    kind: "accelerator_directory",
  },
  {
    name: "Communitech Companies",
    home: "https://www1.communitech.ca",
    portfolio: "https://www1.communitech.ca/companies",
    kind: "curated_directory",
  },
  {
    name: "NEXT Canada Ventures",
    home: "https://www.nextcanada.com",
    portfolio: "https://directory.nextcanada.com/directory/ventures/",
    kind: "accelerator_directory",
  },
  {
    name: "Creative Destruction Lab",
    home: "https://www.creativedestructionlab.com",
    portfolio: "https://www.creativedestructionlab.com/companies/",
    kind: "accelerator_directory",
  },
  {
    name: "BKR Capital",
    home: "https://bkrcapital.com",
    portfolio: "https://bkrcapital.com/portfolio/",
    kind: "vc_portfolio",
  },
  {
    name: "VentureLAB",
    home: "https://www.venturelab.ca",
    portfolio: "https://www.venturelab.ca/portfolio",
    kind: "accelerator_directory",
  },
  {
    name: "Brightspark Ventures",
    home: "https://www.brightspark.com",
    portfolio: "https://brightspark.com/en/portfolio",
    kind: "vc_portfolio",
  },
  {
    name: "Yaletown Partners",
    home: "https://www.yaletown.com",
    portfolio: "https://www.yaletown.com/portfolio",
    kind: "vc_portfolio",
  },
  {
    name: "ScaleUP Ventures",
    home: "https://scaleupventures.com",
    portfolio: "https://scaleupventures.com",
    kind: "vc_portfolio",
  },
];
