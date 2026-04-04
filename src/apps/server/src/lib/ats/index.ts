import { getCanonicalHostname, getCanonicalPostingUrl } from "@/lib/quality/urls";

export type AtsProvider = "workday" | "greenhouse" | "lever" | "ashby" | "getro" | "unknown";

export type AtsJobLink = {
  url: string;
  title?: string;
  provider: AtsProvider;
};

export type SharedBoardCompanyContext = {
  provider: AtsProvider;
  companySlug?: string;
  companyProfileUrl?: string;
};

type ExtractedJobDetails = {
  title?: string;
  city?: string;
  province?: string;
  description?: string;
  remoteOk?: boolean;
  salaryMin?: number;
  salaryMax?: number;
  companyName?: string;
  companyWebsite?: string;
};

const HTML_HEADERS = {
  "user-agent": "CanadianStartupJobsBot/1.0 (+https://canadianstartupjobs.matteo-beatstanzi.workers.dev)",
  "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

const JSON_LD_REGEX = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
const TITLE_REGEX = /<title[^>]*>([\s\S]*?)<\/title>/i;
const OG_TITLE_REGEX = /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i;
const DESCRIPTION_META_REGEX = /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i;
const H1_REGEX = /<h1[^>]*>([\s\S]*?)<\/h1>/i;
const STRIP_TAGS_REGEX = /<[^>]+>/g;
const WHITESPACE_REGEX = /\s+/g;

const cleanText = (value: string | null | undefined) =>
  (value ?? "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(STRIP_TAGS_REGEX, " ")
    .replace(WHITESPACE_REGEX, " ")
    .trim();

const titleCaseSlug = (value: string) =>
  value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();

const extractTitleFromUrl = (url: string) => {
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split("/").filter(Boolean);
    const tail = parts[parts.length - 1];
    if (!tail || /^\d+$/.test(tail)) {
      return undefined;
    }

    return titleCaseSlug(decodeURIComponent(tail));
  } catch {
    return undefined;
  }
};

export const detectAtsProvider = (url: string): AtsProvider => {
  const hostname = getCanonicalHostname(url);
  if (hostname.includes("workdayjobs.com") || hostname.includes("myworkdayjobs.com")) {
    return "workday";
  }
  if (hostname.includes("greenhouse.io")) {
    return "greenhouse";
  }
  if (hostname.includes("lever.co")) {
    return "lever";
  }
  if (hostname.includes("ashbyhq.com")) {
    return "ashby";
  }
  if (/\/companies\/[^/]+\/jobs\/[^/?#]+/i.test(url)) {
    return "getro";
  }
  return "unknown";
};

export const extractSharedBoardCompanyContext = (url: string): SharedBoardCompanyContext | null => {
  const provider = detectAtsProvider(url);
  if (provider !== "getro") {
    return null;
  }

  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/companies\/([^/]+)\/jobs\//i);
    if (!match?.[1]) {
      return null;
    }

    const companySlug = decodeURIComponent(match[1]);
    const companyProfileUrl = new URL(`/companies/${companySlug}`, parsed).toString();
    return {
      provider,
      companySlug,
      companyProfileUrl,
    };
  } catch {
    return null;
  }
};

const isLikelyAtsJobUrl = (url: string, provider: AtsProvider) => {
  switch (provider) {
    case "workday":
      return /\/job\//i.test(url);
    case "greenhouse":
      return /\/jobs\//i.test(url) || /gh_jid=/i.test(url);
    case "lever":
      return /jobs\.lever\.co\/[^/]+\/[^/?#]+/i.test(url);
    case "ashby":
      return /ashbyhq\.com\/[^/]+\/job\//i.test(url) || /jobs\.ashbyhq\.com\/[^/]+\/job\//i.test(url);
    case "getro":
      return /\/companies\/[^/]+\/jobs\/[^/?#]+/i.test(url);
    default:
      return false;
  }
};

export const extractAtsJobLinks = (_careersUrl: string, links: string[]) => {
  const seen = new Set<string>();
  const extracted: AtsJobLink[] = [];

  for (const rawLink of links) {
    const normalized = getCanonicalPostingUrl(rawLink);
    const provider = detectAtsProvider(normalized);
    if (!normalized || provider === "unknown" || seen.has(normalized) || !isLikelyAtsJobUrl(normalized, provider)) {
      continue;
    }

    seen.add(normalized);
    extracted.push({
      url: normalized,
      title: extractTitleFromUrl(normalized),
      provider,
    });
  }

  return extracted;
};

export const fetchHtmlForAts = async (url: string) => {
  const response = await fetch(url, { headers: HTML_HEADERS });
  if (!response.ok) {
    throw new Error(`Failed to fetch ATS page ${url}: ${response.status}`);
  }

  return await response.text();
};

const getJsonLdObjects = (html: string) => {
  const objects: Record<string, unknown>[] = [];
  for (const match of html.matchAll(JSON_LD_REGEX)) {
    const payload = match[1]?.trim();
    if (!payload) {
      continue;
    }

    try {
      const parsed = JSON.parse(payload);
      if (Array.isArray(parsed)) {
        for (const entry of parsed) {
          if (entry && typeof entry === "object") {
            objects.push(entry as Record<string, unknown>);
          }
        }
      } else if (parsed && typeof parsed === "object") {
        objects.push(parsed as Record<string, unknown>);
      }
    } catch {
      continue;
    }
  }
  return objects;
};

const getJobPostingJsonLd = (html: string) =>
  getJsonLdObjects(html).find((entry) => {
    const type = entry["@type"];
    if (Array.isArray(type)) {
      return type.includes("JobPosting");
    }
    return type === "JobPosting";
  });

const extractLocation = (jobPosting: Record<string, unknown>) => {
  const locations = Array.isArray(jobPosting.jobLocation)
    ? jobPosting.jobLocation
    : jobPosting.jobLocation
      ? [jobPosting.jobLocation]
      : [];

  for (const location of locations) {
    if (!location || typeof location !== "object") {
      continue;
    }

    const address = (location as Record<string, unknown>).address;
    if (!address || typeof address !== "object") {
      continue;
    }

    const city = cleanText((address as Record<string, unknown>).addressLocality as string | undefined);
    const province = cleanText((address as Record<string, unknown>).addressRegion as string | undefined);
    if (city || province) {
      return { city: city || undefined, province: province || undefined };
    }
  }

  return {};
};

const extractSalary = (jobPosting: Record<string, unknown>) => {
  const baseSalary = jobPosting.baseSalary;
  if (!baseSalary || typeof baseSalary !== "object") {
    return {};
  }

  const value = (baseSalary as Record<string, unknown>).value;
  if (!value || typeof value !== "object") {
    return {};
  }

  const minValue = Number((value as Record<string, unknown>).minValue);
  const maxValue = Number((value as Record<string, unknown>).maxValue);

  return {
    salaryMin: Number.isFinite(minValue) ? minValue : undefined,
    salaryMax: Number.isFinite(maxValue) ? maxValue : undefined,
  };
};

const extractHiringOrganization = (jobPosting: Record<string, unknown>) => {
  const hiringOrganization = jobPosting.hiringOrganization;
  if (!hiringOrganization || typeof hiringOrganization !== "object") {
    return {};
  }

  const organization = hiringOrganization as Record<string, unknown>;
  const companyName = cleanText(organization.name as string | undefined);
  const companyWebsite = cleanText(
    (organization.sameAs as string | undefined) ?? (organization.url as string | undefined),
  );

  return {
    companyName: companyName || undefined,
    companyWebsite: companyWebsite || undefined,
  };
};

export const extractStructuredJobFromAtsPage = async (args: {
  url: string;
  expectedJobTitle?: string;
}) => {
  const provider = detectAtsProvider(args.url);
  if (provider === "unknown") {
    return null;
  }

  const html = await fetchHtmlForAts(args.url);
  const jobPosting = getJobPostingJsonLd(html);

  const title =
    (jobPosting && cleanText(jobPosting.title as string | undefined)) ||
    cleanText(html.match(OG_TITLE_REGEX)?.[1]) ||
    cleanText(html.match(H1_REGEX)?.[1]) ||
    cleanText(html.match(TITLE_REGEX)?.[1]) ||
    args.expectedJobTitle ||
    extractTitleFromUrl(args.url);

  const description =
    (jobPosting && cleanText(jobPosting.description as string | undefined)) ||
    cleanText(html.match(DESCRIPTION_META_REGEX)?.[1]);

  const location = jobPosting ? extractLocation(jobPosting) : {};
  const salary = jobPosting ? extractSalary(jobPosting) : {};
  const hiringOrganization = jobPosting ? extractHiringOrganization(jobPosting) : {};
  const remoteOk = Boolean(
    (jobPosting && jobPosting.jobLocationType === "TELECOMMUTE") ||
    /remote/i.test(description || ""),
  );

  const details: ExtractedJobDetails = {
    title: title || undefined,
    city: location.city,
    province: location.province,
    description: description || undefined,
    remoteOk,
    ...salary,
    ...hiringOrganization,
  };

  return {
    provider,
    details,
    html,
  };
};
