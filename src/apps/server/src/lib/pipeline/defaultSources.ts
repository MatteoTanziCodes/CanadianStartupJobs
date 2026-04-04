export interface SourceConfig {
  name: string;
  home: string;
  portfolio: string;
}

export const DEFAULT_SOURCES: SourceConfig[] = [
  {
    name: "Garage Capital",
    home: "https://www.garage.vc",
    portfolio: "https://www.garage.vc/#portfolio",
  },
  {
    name: "Inovia Capital",
    home: "https://www.inovia.vc",
    portfolio: "https://www.inovia.vc/active-companies/",
  },
  {
    name: "Real Ventures",
    home: "https://www.realventures.com",
    portfolio: "https://realventures.com/portfolio/",
  },
];
