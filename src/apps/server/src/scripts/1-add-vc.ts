import { sources } from "@/lib/ai";
import { firecrawl } from "@/lib/firecrawl";
import { join } from "node:path";

const testVC = {
  url: "https://www.garage.vc",
  portfolio: "https://www.garage.vc/#portfolio"
};

const getDoc = async (page: string) => {
  const doc = await firecrawl.scrape(page, { formats: ['markdown', 'links'] });
  return doc;
}

const getTestDocs = async () => {
  const home = await getDoc(testVC.url);
  const portfolio = await getDoc(testVC.portfolio);
  Bun.write(join("apps/server/src/scripts/out/1-add-vc/home.md"), home.markdown ?? "Failed to get markdown");
  Bun.write(join("apps/server/src/scripts/out/1-add-vc/home-links.md"), JSON.stringify(home.links ?? "Failed to get links"));
  Bun.write(join("apps/server/src/scripts/out/1-add-vc/portfolio.md"), portfolio.markdown ?? "Failed to get markdown");
  Bun.write(join("apps/server/src/scripts/out/1-add-vc/portfolio-links.md"), JSON.stringify(portfolio.links ?? "Failed to get links"));
  return { home, portfolio };
}

// flows
// 1. home.markdown -> sources
// 2. sources.id + portfolio.markdown -> sourcesPortfolioCaches
// 3. portfolio.links -> firecrawl (home.md)
// 3.1 firecrawl (home.links) -> firecrawl (about)
// 3.2 firecrawl (home.links) -> firecrawl (careers)
// 3.3 home.md + about.md + careers.md -> organizations
// 3.4 organizations.id + careers.md -> jobBoardCaches
// 4. careers.links -> firecrawl (job.md)
// 4.1 job.md -> jobs

async function main() {
  const { home, portfolio } = await getTestDocs();
  if (!home.markdown) return null;
  await sources.createNewSourceFromMarkdown(home.markdown, testVC.url, testVC.portfolio);
  console.log("Done :)");
}

main();
