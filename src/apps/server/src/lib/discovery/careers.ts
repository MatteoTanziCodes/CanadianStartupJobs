import { detectAtsProvider, extractAtsJobLinks, type AtsProvider } from "@/lib/ats";
import { utils } from "@/lib/firecrawl";
import { fetchCachedPage } from "@/lib/cache/pages";
import { hasLowSignalContent, isBlockedOrganizationUrl } from "@/lib/quality/content";
import { getCanonicalHostname, normalizeHttpUrl } from "@/lib/quality/urls";

const CAREERS_KEYWORDS = [
  "career",
  "careers",
  "job",
  "jobs",
  "join",
  "join-us",
  "work-with-us",
  "openings",
  "positions",
  "hiring",
  "workday",
  "greenhouse",
  "lever",
  "ashby",
];

const COMMON_CAREERS_PATHS = [
  "/careers",
  "/jobs",
  "/join-us",
  "/join",
  "/careers/jobs",
  "/company/careers",
  "/about/careers",
  "/work-with-us",
  "/open-roles",
  "/positions",
  "/hiring",
  "/careers/openings",
];

type PreFetchedData = {
  url: string;
  markdown: string;
  links: string[];
  pulledAt: number;
  freshTil: number;
};

type CareersCandidate = {
  url: string;
  discoveryMethod: string;
  provider: AtsProvider | "unknown";
  score: number;
  reason: string;
};

type ValidatedCareersCandidate = CareersCandidate & {
  markdown: string;
  links: string[];
  confidence: number;
  valid: boolean;
};

export type CareersDiscoveryResult = {
  bestUrl: string | null;
  provider: string | null;
  discoveryMethod: string | null;
  confidence: number;
  candidates: string[];
  validatedCandidates: Array<{
    url: string;
    provider: string;
    discoveryMethod: string;
    confidence: number;
    valid: boolean;
    reason: string;
  }>;
  preFetchedData?: PreFetchedData;
};

const normalizeCandidateUrl = (candidateUrl: string, baseUrl: string) => {
  try {
    return normalizeHttpUrl(new URL(candidateUrl, baseUrl).toString());
  } catch {
    return "";
  }
};

const scoreKeywordSignal = (url: string) => {
  const normalized = url.toLowerCase();
  return CAREERS_KEYWORDS.reduce((score, keyword) => (
    normalized.includes(keyword) ? score + 8 : score
  ), 0);
};

const getHostnameRelationshipScore = (candidateUrl: string, websiteUrl: string) => {
  const candidateHostname = getCanonicalHostname(candidateUrl);
  const websiteHostname = getCanonicalHostname(websiteUrl);

  if (!candidateHostname || !websiteHostname) {
    return 0;
  }

  if (candidateHostname === websiteHostname) {
    return 12;
  }

  if (candidateHostname.endsWith(`.${websiteHostname}`) || websiteHostname.endsWith(`.${candidateHostname}`)) {
    return 8;
  }

  return 0;
};

const getBaseCandidateScore = (args: {
  url: string;
  websiteUrl: string;
  discoveryMethod: string;
}) => {
  const provider = detectAtsProvider(args.url);
  let score = 0;

  if (provider !== "unknown") {
    score += 30;
  }

  if (args.discoveryMethod === "hint") {
    score += 18;
  }

  if (args.discoveryMethod === "homepage_link") {
    score += 14;
  }

  if (args.discoveryMethod === "site_search") {
    score += 10;
  }

  if (args.discoveryMethod === "path_probe") {
    score += 6;
  }

  score += scoreKeywordSignal(args.url);
  score += getHostnameRelationshipScore(args.url, args.websiteUrl);

  return { score, provider };
};

const addCandidate = (
  candidateMap: Map<string, CareersCandidate>,
  args: {
    candidateUrl: string;
    websiteUrl: string;
    discoveryMethod: string;
    reason: string;
  },
) => {
  const normalized = normalizeCandidateUrl(args.candidateUrl, args.websiteUrl);
  if (!normalized || isBlockedOrganizationUrl(normalized)) {
    return;
  }

  const base = getBaseCandidateScore({
    url: normalized,
    websiteUrl: args.websiteUrl,
    discoveryMethod: args.discoveryMethod,
  });

  const existing = candidateMap.get(normalized);
  if (existing && existing.score >= base.score) {
    return;
  }

  candidateMap.set(normalized, {
    url: normalized,
    discoveryMethod: args.discoveryMethod,
    provider: base.provider,
    score: base.score,
    reason: args.reason,
  });
};

const collectCandidateUrls = async (args: {
  websiteUrl: string;
  hintUrl?: string;
  homeLinks: string[];
}) => {
  const candidateMap = new Map<string, CareersCandidate>();

  if (args.hintUrl) {
    addCandidate(candidateMap, {
      candidateUrl: args.hintUrl,
      websiteUrl: args.websiteUrl,
      discoveryMethod: "hint",
      reason: "organization extraction hint",
    });
  }

  for (const link of args.homeLinks) {
    const normalized = normalizeCandidateUrl(link, args.websiteUrl);
    if (!normalized) {
      continue;
    }

    const linkLower = normalized.toLowerCase();
    const provider = detectAtsProvider(normalized);
    const looksCareersLike = CAREERS_KEYWORDS.some((keyword) => linkLower.includes(keyword));
    const looksAtsBoard = provider !== "unknown";

    if (!looksCareersLike && !looksAtsBoard) {
      continue;
    }

    addCandidate(candidateMap, {
      candidateUrl: normalized,
      websiteUrl: args.websiteUrl,
      discoveryMethod: "homepage_link",
      reason: looksAtsBoard ? `homepage ATS link (${provider})` : "homepage careers-style link",
    });
  }

  for (const keyword of ["careers", "jobs", "join", "openings", "workday", "greenhouse", "lever", "ashby"]) {
    try {
      const results = await utils.searchSiteMap(args.websiteUrl, keyword);
      for (const link of results.links ?? []) {
        addCandidate(candidateMap, {
          candidateUrl: link.url,
          websiteUrl: args.websiteUrl,
          discoveryMethod: "site_search",
          reason: `site search match for ${keyword}`,
        });
      }
    } catch {
      continue;
    }
  }

  for (const path of COMMON_CAREERS_PATHS) {
    addCandidate(candidateMap, {
      candidateUrl: path,
      websiteUrl: args.websiteUrl,
      discoveryMethod: "path_probe",
      reason: `common careers path ${path}`,
    });
  }

  return Array.from(candidateMap.values()).sort((left, right) => right.score - left.score).slice(0, 12);
};

const scoreValidatedCandidate = (args: {
  markdown: string;
  links: string[];
  provider: CareersCandidate["provider"];
  baseScore: number;
}) => {
  let score = args.baseScore;

  const markdownLower = args.markdown.toLowerCase();
  const keywordHits = CAREERS_KEYWORDS.reduce((count, keyword) => (
    markdownLower.includes(keyword) ? count + 1 : count
  ), 0);
  score += Math.min(keywordHits * 4, 20);

  const atsJobLinks = extractAtsJobLinks("", args.links);
  if (atsJobLinks.length > 0) {
    score += Math.min(atsJobLinks.length * 8, 30);
  }

  const linkSignalCount = args.links.filter((link) =>
    CAREERS_KEYWORDS.some((keyword) => link.toLowerCase().includes(keyword)),
  ).length;
  if (linkSignalCount > 0) {
    score += Math.min(linkSignalCount * 3, 18);
  }

  if (args.provider !== "unknown") {
    score += 12;
  }

  return Math.min(score, 100);
};

const validateCandidate = async (candidate: CareersCandidate): Promise<ValidatedCareersCandidate> => {
  try {
    const doc = await fetchCachedPage({
      url: candidate.url,
      kind: "careers_page",
      ttlMs: 24 * 60 * 60 * 1000,
    });
    const safeMarkdown = doc.markdown ?? "";
    const safeLinks = doc.links ?? [];

    if (!safeMarkdown || hasLowSignalContent(safeMarkdown)) {
      return {
        ...candidate,
        markdown: safeMarkdown,
        links: safeLinks,
        confidence: Math.max(candidate.score - 35, 0),
        valid: false,
      };
    }

    const confidence = scoreValidatedCandidate({
      markdown: safeMarkdown,
      links: safeLinks,
      provider: candidate.provider,
      baseScore: candidate.score,
    });

    const valid = confidence >= 40
      && (
        safeLinks.length > 0
        || extractAtsJobLinks(candidate.url, safeLinks).length > 0
        || /open roles|open positions|current openings|join our team|job openings|job board/i.test(safeMarkdown)
      );

    return {
      ...candidate,
      markdown: safeMarkdown,
      links: safeLinks,
      confidence,
      valid,
    };
  } catch {
    return {
      ...candidate,
      markdown: "",
      links: [],
      confidence: Math.max(candidate.score - 45, 0),
      valid: false,
    };
  }
};

export const discoverCareersEndpoints = async (args: {
  websiteUrl: string;
  hintUrl?: string;
  homeLinks: string[];
}) : Promise<CareersDiscoveryResult> => {
  const candidates = await collectCandidateUrls(args);
  const validated = await Promise.all(candidates.map(validateCandidate));
  const best = validated
    .filter((candidate) => candidate.valid)
    .sort((left, right) => right.confidence - left.confidence)[0];

  return {
    bestUrl: best?.url ?? null,
    provider: best?.provider ?? null,
    discoveryMethod: best?.discoveryMethod ?? null,
    confidence: best?.confidence ?? 0,
    candidates: validated.map((candidate) => candidate.url),
    validatedCandidates: validated.map((candidate) => ({
      url: candidate.url,
      provider: candidate.provider,
      discoveryMethod: candidate.discoveryMethod,
      confidence: candidate.confidence,
      valid: candidate.valid,
      reason: candidate.reason,
    })),
    preFetchedData: best
      ? {
          url: best.url,
          markdown: best.markdown,
          links: best.links,
          pulledAt: Date.now(),
          freshTil: Date.now() + 24 * 60 * 60 * 1000,
        }
      : undefined,
  };
};
