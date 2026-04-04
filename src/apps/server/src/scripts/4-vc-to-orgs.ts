import { sources } from "@/lib/ai";
import { AppError, ERROR_CODES } from "@/lib/errors";
import { portfolioCaches } from "@canadian-startup-jobs/db";
import { firecrawl } from "@/lib/firecrawl";
import { addToQueue } from "@/lib/db/functions/queues";

const testVC = {
  url: "https://www.garage.vc",
  portfolio: "https://www.garage.vc/#portfolio"
};

const getDoc = async (page: string) => {
  const {markdown, links} = await firecrawl.scrape(page, { formats: ['markdown', 'links'] });
    if (!markdown) throw new AppError(ERROR_CODES.FC_MARKDOWN_FAILED, "Failed to get markdown in 4-vc-to-orgs");
    if (!links) throw new AppError(ERROR_CODES.FC_LINKS_FAILED, "Failed to get links in 4-vc-to-orgs");
  return {markdown, links};
}

const getTestDocs = async () => {
  const home = await getDoc(testVC.url);
  const portfolio = await getDoc(testVC.portfolio);
  return { home, portfolio };
}

async function main() {
  // 1. Get Data from VC
  const { home, portfolio } = await getTestDocs();

  // 2. Create Source in DB
  const newSource = await sources.createNewSourceFromMarkdown(home.markdown, testVC.url, testVC.portfolio);
  const newCache = await sources.createNewPortfolioCache(testVC.portfolio);
  const newConnection = await sources.connectSourceToPortfolioCache(newSource.id, newCache.id);
  // 3. Parse Links from Portfolio Page
  let linkChunks: string[][] = [];
  for (let i = 0; i < portfolio.links.length % 5; i++) {
    linkChunks[i] = [];
    for (let j = 0; j < 5; j++) {
      linkChunks[i].push(portfolio.links[(i * 5) + j]);
    }
  }
  // 4. Create new org jobs from links
  // 5. Per org job, create new org
  // 6. Per org job, create new job cache
  // Done
}

main();
