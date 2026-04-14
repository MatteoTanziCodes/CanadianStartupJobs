type ScrapeFormat = "markdown" | "links" | "summary";

type ScrapeOptions = {
  formats?: ScrapeFormat[];
  maxAge?: number;
};

type MapOptions = {
  limit?: number;
  sitemap?: "include" | "exclude";
  search?: string;
};

type ScrapeResult = {
  markdown?: string;
  links?: string[];
  summary?: string;
};

type MapLink = {
  url: string;
  title?: string;
  description?: string;
  category?: string;
};

type MapResult = {
  links: MapLink[];
};

type BridgeRequest =
  | {
      command: "scrape";
      url: string;
      options?: ScrapeOptions;
    }
  | {
      command: "map";
      url: string;
      options?: MapOptions;
    };

type BridgeResponse =
  | {
      ok: true;
      data: ScrapeResult | MapResult;
    }
  | {
      ok: false;
      error: string;
      details?: unknown;
    };

const pythonCommand = process.env.CRAWL4AI_PYTHON_BIN || "python";

const LINK_REGEX = /<a\b[^>]*href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi;
const TITLE_REGEX = /<title[^>]*>([\s\S]*?)<\/title>/i;
const BODY_REGEX = /<body[^>]*>([\s\S]*?)<\/body>/i;
const STRIP_BLOCK_REGEX = /<(script|style|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi;
const STRIP_TAGS_REGEX = /<[^>]+>/g;
const WHITESPACE_REGEX = /\s+/g;

const isWorkerRuntime = () =>
  typeof WebSocketPair !== "undefined" && typeof Bun === "undefined";

const decodeHtml = (value: string) =>
  value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");

const cleanText = (value: string) =>
  decodeHtml(value)
    .replace(STRIP_BLOCK_REGEX, " ")
    .replace(STRIP_TAGS_REGEX, " ")
    .replace(WHITESPACE_REGEX, " ")
    .trim();

const htmlToMarkdown = (html: string) => {
  const body = html.match(BODY_REGEX)?.[1] ?? html;
  return cleanText(body);
};

const normalizeUrl = (candidate: string, baseUrl: string) => {
  try {
    const normalized = new URL(candidate, baseUrl);
    if (!["http:", "https:"].includes(normalized.protocol)) {
      return null;
    }
    normalized.hash = "";
    return normalized.toString();
  } catch {
    return null;
  }
};

const extractLinksFromHtml = (html: string, baseUrl: string) => {
  const seen = new Set<string>();
  const links: MapLink[] = [];

  for (const match of html.matchAll(LINK_REGEX)) {
    const href = match[1] ?? match[2] ?? match[3];
    const normalized = href ? normalizeUrl(href, baseUrl) : null;
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    const text = cleanText(match[4] ?? "");
    links.push({
      url: normalized,
      title: text || undefined,
      description: text || undefined,
      category: normalized.includes("/careers") || normalized.includes("/jobs") ? "jobs" : undefined,
    });
  }

  return links;
};

const fetchHtml = async (url: string) => {
  const response = await fetch(url, {
    headers: {
      "user-agent": "CanadianStartupJobsBot/1.0 (+https://canadianstartupjobs.matteo-tanzi.dev)",
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return await response.text();
};

const workerScrape = async (url: string, options?: ScrapeOptions): Promise<ScrapeResult> => {
  const html = await fetchHtml(url);
  const formats = options?.formats ?? ["markdown"];
  const links = extractLinksFromHtml(html, url);
  const markdown = htmlToMarkdown(html);
  const title = cleanText(html.match(TITLE_REGEX)?.[1] ?? "");

  return {
    markdown: formats.includes("markdown") ? markdown : undefined,
    links: formats.includes("links") ? links.map((link) => link.url) : undefined,
    summary: formats.includes("summary")
      ? [title, markdown.slice(0, 800)].filter(Boolean).join("\n\n")
      : undefined,
  };
};

const workerMap = async (url: string, options?: MapOptions): Promise<MapResult> => {
  const html = await fetchHtml(url);
  const links = extractLinksFromHtml(html, url);
  const search = options?.search?.trim().toLowerCase();

  const filtered = search
    ? links.filter((link) => {
        const haystack = [link.url, link.title, link.description, link.category].join(" ").toLowerCase();
        return haystack.includes(search);
      })
    : links;

  return {
    links: filtered.slice(0, options?.limit ?? 50),
  };
};

const runBridge = async <T extends ScrapeResult | MapResult>(request: BridgeRequest): Promise<T> => {
  const [{ spawn }, pathModule, { fileURLToPath }] = await Promise.all([
    import("node:child_process"),
    import("node:path"),
    import("node:url"),
  ]);
  const bridgePath = pathModule.resolve(
    pathModule.dirname(fileURLToPath(import.meta.url)),
    "../../../tools/crawl4ai_bridge.py",
  );

  return await new Promise<T>((resolve, reject) => {
    const child = spawn(pythonCommand, [bridgePath], {
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Crawl4AI bridge exited with code ${code}`));
        return;
      }

      try {
        const parsed = JSON.parse(stdout.trim()) as BridgeResponse;
        if (!parsed.ok) {
          reject(new Error(parsed.error));
          return;
        }
        resolve(parsed.data as T);
      } catch (error) {
        reject(
          new Error(
            `Failed to parse Crawl4AI bridge response: ${error instanceof Error ? error.message : String(error)}\n${stdout}\n${stderr}`,
          ),
        );
      }
    });

    child.stdin.write(JSON.stringify(request));
    child.stdin.end();
  });
};

export const firecrawl = {
  scrape: async (url: string, options?: ScrapeOptions): Promise<ScrapeResult> =>
    isWorkerRuntime()
      ? await workerScrape(url, options)
      : await runBridge<ScrapeResult>({
          command: "scrape",
          url,
          options,
        }),
  map: async (url: string, options?: MapOptions): Promise<MapResult> =>
    isWorkerRuntime()
      ? await workerMap(url, options)
      : await runBridge<MapResult>({
          command: "map",
          url,
          options,
        }),
};
