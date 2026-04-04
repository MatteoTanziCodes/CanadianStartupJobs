const UNKNOWN_PATTERNS = [
  "<unknown>",
  "unknown",
  "not found",
  "n/a",
  "none provided",
];

const BLOCKED_ORGANIZATION_HOSTS = [
  "linkedin.com",
  "facebook.com",
  "instagram.com",
  "x.com",
  "twitter.com",
  "crunchbase.com",
  "youtube.com",
  "youtu.be",
];

const BLOCKED_JOB_HOSTS = [
  "linkedin.com",
  "facebook.com",
  "instagram.com",
  "x.com",
  "twitter.com",
];

const LOW_SIGNAL_PATTERNS = [
  "linkedin respects your privacy",
  "sign in to linkedin",
  "join now",
  "enable javascript",
  "cookies on linkedin",
];

const FOREIGN_HEADQUARTERS_PATTERNS = [
  /\bus-headquartered\b/i,
  /\bheadquartered in\s+[a-z .'-]+,\s*(usa|u\.s\.|united states|california|new york|massachusetts|texas|washington)\b/i,
  /\bbased in\s+(san francisco|new york|seattle|austin|boston|chicago|los angeles)\b/i,
];

const NOISY_CITY_PATTERNS = [
  /\bremote\b/i,
  /\bhybrid\b/i,
  /\bwork from\b/i,
  /\bour offices\b/i,
  /\bcustomer service\b/i,
  /\bbusiness development\b/i,
  /\badministration\b/i,
  /\boperations\b/i,
  /\bposted on\b/i,
  /\bapply now\b/i,
];

const PROVINCE_NAME_BY_ALIAS: Record<string, string> = {
  ab: "Alberta",
  alberta: "Alberta",
  bc: "British Columbia",
  "british columbia": "British Columbia",
  mb: "Manitoba",
  manitoba: "Manitoba",
  nb: "New Brunswick",
  "new brunswick": "New Brunswick",
  nl: "Newfoundland and Labrador",
  "newfoundland and labrador": "Newfoundland and Labrador",
  ns: "Nova Scotia",
  "nova scotia": "Nova Scotia",
  nt: "Northwest Territories",
  "northwest territories": "Northwest Territories",
  nu: "Nunavut",
  nunavut: "Nunavut",
  on: "Ontario",
  ontario: "Ontario",
  pe: "Prince Edward Island",
  pei: "Prince Edward Island",
  "prince edward island": "Prince Edward Island",
  qc: "Quebec",
  quebec: "Quebec",
  québec: "Quebec",
  sk: "Saskatchewan",
  saskatchewan: "Saskatchewan",
  yt: "Yukon",
  yukon: "Yukon",
};

const CANADIAN_CITY_HINTS = [
  { city: "Toronto", province: "Ontario" },
  { city: "Ottawa", province: "Ontario" },
  { city: "Waterloo", province: "Ontario" },
  { city: "Kitchener", province: "Ontario" },
  { city: "Mississauga", province: "Ontario" },
  { city: "Hamilton", province: "Ontario" },
  { city: "London", province: "Ontario" },
  { city: "Markham", province: "Ontario" },
  { city: "Guelph", province: "Ontario" },
  { city: "Burlington", province: "Ontario" },
  { city: "Montreal", province: "Quebec" },
  { city: "Montréal", province: "Quebec" },
  { city: "Quebec City", province: "Quebec" },
  { city: "Québec", province: "Quebec" },
  { city: "Laval", province: "Quebec" },
  { city: "Vancouver", province: "British Columbia" },
  { city: "Victoria", province: "British Columbia" },
  { city: "Burnaby", province: "British Columbia" },
  { city: "Richmond", province: "British Columbia" },
  { city: "Surrey", province: "British Columbia" },
  { city: "Kelowna", province: "British Columbia" },
  { city: "Calgary", province: "Alberta" },
  { city: "Edmonton", province: "Alberta" },
  { city: "Halifax", province: "Nova Scotia" },
  { city: "Winnipeg", province: "Manitoba" },
  { city: "Saskatoon", province: "Saskatchewan" },
  { city: "Regina", province: "Saskatchewan" },
  { city: "Fredericton", province: "New Brunswick" },
  { city: "Moncton", province: "New Brunswick" },
  { city: "Charlottetown", province: "Prince Edward Island" },
  { city: "St. John's", province: "Newfoundland and Labrador" },
];

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const PROVINCE_ALIASES = Object.keys(PROVINCE_NAME_BY_ALIAS).sort((left, right) => right.length - left.length);
const PROVINCE_PATTERN = PROVINCE_ALIASES.map(escapeRegex).join("|");
const CITY_PROVINCE_REGEX = new RegExp(
  `\\b([A-ZÀ-Ý][A-Za-zÀ-ÿ'’.\\-/ ]{1,80}?),\\s*(${PROVINCE_PATTERN})(?:,\\s*Canada)?\\b`,
  "gi",
);
const PROVINCE_ONLY_REGEX = new RegExp(
  `\\b(${PROVINCE_PATTERN})(?:,\\s*Canada)?\\b`,
  "gi",
);
const REMOTE_REGEX = /\bremote\b/i;
const CANADA_REGEX = /\bcanada\b/i;
const OPEN_POSITIONS_COMPANY_REGEX = /See more open positions at\s+(.+?)\s+Privacy policy/i;

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();

const titleCasePreservingAccents = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

export const slugToCompanyName = (value: string | null | undefined) => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return undefined;
  }

  return normalized
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => {
      if (part.length <= 3) {
        return part.toUpperCase();
      }

      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
};

export const normalizeCompanyName = (value: string | null | undefined) =>
  normalizeText(value).replace(/[^a-z0-9]+/g, "");

export const companyNamesMatch = (left: string | null | undefined, right: string | null | undefined) => {
  const normalizedLeft = normalizeCompanyName(left);
  const normalizedRight = normalizeCompanyName(right);
  return !!normalizedLeft && normalizedLeft === normalizedRight;
};

export const extractEmployerNameFromJobPage = (args: {
  markdown: string;
  expectedJobTitle?: string;
  companySlug?: string;
}) => {
  const openPositionsMatch = args.markdown.match(OPEN_POSITIONS_COMPANY_REGEX)?.[1]?.trim();
  if (openPositionsMatch) {
    return openPositionsMatch.replace(/\s+/g, " ");
  }

  if (args.expectedJobTitle) {
    const titleIndex = args.markdown.toLowerCase().indexOf(args.expectedJobTitle.toLowerCase());
    if (titleIndex >= 0) {
      const snippet = args.markdown
        .slice(titleIndex + args.expectedJobTitle.length, titleIndex + args.expectedJobTitle.length + 180)
        .replace(/\s+/g, " ")
        .trim();

      const snippetMatch = snippet.match(/^([A-ZÀ-Ý][A-Za-zÀ-ÿ0-9&.'’/ -]{1,80}?)\s+(?:[A-Z][A-Za-zÀ-ÿ/& -]{1,40}\s+)?(?:Canada|Remote|Posted on|CAD\b|USD\b|\$|\d)/);
      const companyCandidate = snippetMatch?.[1]?.trim();
      if (companyCandidate && companyCandidate.split(/\s+/).length <= 5) {
        return companyCandidate;
      }
    }
  }

  return slugToCompanyName(args.companySlug);
};

export const normalizeProvince = (value: string | null | undefined) => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return undefined;
  }

  return PROVINCE_NAME_BY_ALIAS[normalized];
};

export const normalizeCanadianProvinceValue = (value: string | null | undefined) => {
  const normalizedProvince = normalizeProvince(value);
  if (normalizedProvince) {
    return normalizedProvince;
  }

  if (normalizeText(value) === "canada") {
    return "Canada";
  }

  return undefined;
};

export const isUnknownValue = (value: string | null | undefined) => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return true;
  }

  return UNKNOWN_PATTERNS.some((pattern) => normalized === pattern);
};

export const hasLowSignalContent = (markdown: string) => {
  const normalized = normalizeText(markdown);
  if (normalized.length < 200) {
    return true;
  }

  return LOW_SIGNAL_PATTERNS.some((pattern) => normalized.includes(pattern));
};

const hostnameFromUrl = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
};

const isBlockedHost = (url: string, blockedHosts: string[]) => {
  const hostname = hostnameFromUrl(url);
  if (!hostname) {
    return true;
  }

  return blockedHosts.some((blockedHost) => hostname === blockedHost || hostname.endsWith(`.${blockedHost}`));
};

const findCanadianCityMatch = (value: string | null | undefined, provinceHint?: string) => {
  const haystack = normalizeText(value);
  if (!haystack) {
    return undefined;
  }

  const matches = CANADIAN_CITY_HINTS.filter((hint) => haystack.includes(normalizeText(hint.city)));
  if (matches.length === 0) {
    return undefined;
  }

  if (provinceHint) {
    const sameProvince = matches.find((hint) => hint.province === provinceHint);
    if (sameProvince) {
      return sameProvince;
    }
  }

  return matches.sort((left, right) => right.city.length - left.city.length)[0];
};

const cleanJobCityValue = (args: {
  city?: string | null;
  province?: string;
  contextText?: string;
}) => {
  if (isUnknownValue(args.city)) {
    return undefined;
  }

  const rawCity = (args.city ?? "").trim().replace(/\s+/g, " ");
  if (!rawCity) {
    return undefined;
  }

  if (REMOTE_REGEX.test(rawCity)) {
    return "Remote";
  }

  const extractedFromRaw = extractLocationFromText(rawCity);
  if (extractedFromRaw.city) {
    return extractedFromRaw.city;
  }

  const provinceHint = normalizeCanadianProvinceValue(args.province);
  const cityMatchInRaw = findCanadianCityMatch(rawCity, provinceHint);
  if (cityMatchInRaw) {
    return cityMatchInRaw.city;
  }

  const looksNoisy = NOISY_CITY_PATTERNS.some((pattern) => pattern.test(rawCity)) || rawCity.split(/\s+/).length > 4;
  if (looksNoisy) {
    const cityMatchInContext = findCanadianCityMatch(args.contextText, provinceHint);
    if (cityMatchInContext) {
      return cityMatchInContext.city;
    }

    return undefined;
  }

  return titleCasePreservingAccents(rawCity);
};

export const isBlockedOrganizationUrl = (url: string) =>
  isBlockedHost(url, BLOCKED_ORGANIZATION_HOSTS);

export const isBlockedJobUrl = (url: string) =>
  isBlockedHost(url, BLOCKED_JOB_HOSTS);

export const isSameHost = (candidateUrl: string, sourceUrl?: string) => {
  if (!sourceUrl) {
    return false;
  }

  return hostnameFromUrl(candidateUrl) === hostnameFromUrl(sourceUrl);
};

export const getSanitizedJobCandidate = (args: {
  title?: string;
  city?: string;
  province?: string;
  description?: string;
  expectedJobTitle?: string;
  contextText?: string;
}) => {
  const normalizedTitle = isUnknownValue(args.title) && !isUnknownValue(args.expectedJobTitle)
    ? args.expectedJobTitle?.trim()
    : args.title?.trim();
  const normalizedProvince = normalizeCanadianProvinceValue(args.province?.trim()) ?? args.province?.trim();

  return {
    title: normalizedTitle,
    city: cleanJobCityValue({
      city: args.city?.trim(),
      province: normalizedProvince,
      contextText: args.contextText,
    }),
    province: normalizedProvince,
    description: args.description?.trim(),
  };
};

export const extractLocationFromText = (value: string) => {
  const matches = Array.from(value.matchAll(CITY_PROVINCE_REGEX));
  const lastMatch = matches[matches.length - 1];
  if (lastMatch) {
    const city = titleCasePreservingAccents(lastMatch[1].trim().replace(/\s+/g, " "));
    const province = normalizeProvince(lastMatch[2]);
    if (city && province) {
      return { city, province };
    }
  }

  return {};
};

export const extractProvinceFromText = (value: string) => {
  const matches = Array.from(value.matchAll(PROVINCE_ONLY_REGEX));
  const lastMatch = matches[matches.length - 1];
  return normalizeProvince(lastMatch?.[1]);
};

export const inferRemoteOkFromText = (value: string) => REMOTE_REGEX.test(value);

export const mentionsCanadaInText = (value: string) => CANADA_REGEX.test(value);

export const hasForeignHeadquartersSignal = (value: string) =>
  FOREIGN_HEADQUARTERS_PATTERNS.some((pattern) => pattern.test(value));

export const resolveCanadianJobLocation = (args: {
  city?: string | null;
  province?: string | null;
  markdown?: string;
  primaryDataText?: string;
  title?: string;
  description?: string;
  remoteOk?: boolean;
}) => {
  const combinedText = [
    args.city,
    args.province,
    args.title,
    args.description,
    args.primaryDataText,
    args.markdown,
  ]
    .filter(Boolean)
    .join("\n");

  let province = normalizeCanadianProvinceValue(args.province) ?? extractProvinceFromText(combinedText);
  let city = cleanJobCityValue({
    city: args.city,
    province,
    contextText: combinedText,
  });

  const contextCityMatch = findCanadianCityMatch(combinedText, province);
  if (!city && contextCityMatch) {
    city = contextCityMatch.city;
  }

  if (!province && contextCityMatch) {
    province = contextCityMatch.province;
  }

  const extractedLocation = extractLocationFromText(combinedText);
  if (!city && extractedLocation.city) {
    city = extractedLocation.city;
  }

  if (!province && extractedLocation.province) {
    province = extractedLocation.province;
  }

  const remoteOk = args.remoteOk ?? inferRemoteOkFromText(combinedText);
  if (remoteOk) {
    city = "Remote";
    if (!province && mentionsCanadaInText(combinedText)) {
      province = "Canada";
    }
  }

  return {
    city,
    province,
    remoteOk,
  };
};

export const assessCanadianJobCandidate = (args: {
  title?: string | null;
  city?: string | null;
  province?: string | null;
  description?: string | null;
  markdown?: string;
  primaryDataText?: string;
  remoteOk?: boolean;
  url: string;
}) => {
  const normalizedLocation = resolveCanadianJobLocation({
    city: args.city,
    province: args.province,
    title: args.title ?? undefined,
    description: args.description ?? undefined,
    markdown: args.markdown,
    primaryDataText: args.primaryDataText,
    remoteOk: args.remoteOk,
  });

  const combinedText = [
    args.title,
    normalizedLocation.city,
    normalizedLocation.province,
    args.description,
    args.primaryDataText,
    args.markdown,
  ]
    .filter(Boolean)
    .join("\n");

  if (hasForeignHeadquartersSignal(combinedText)) {
    return {
      ...normalizedLocation,
      publishable: false,
      reviewReason: "Role appears to belong to a foreign-headquartered company",
    };
  }

  if (isUnknownValue(normalizedLocation.city) || isUnknownValue(normalizedLocation.province)) {
    return {
      ...normalizedLocation,
      publishable: false,
      reviewReason: "Could not confirm a Canadian job location",
    };
  }

  return {
    ...normalizedLocation,
    publishable: true,
    reviewReason: null,
  };
};

export const assertValidJobCandidate = (args: {
  title?: string;
  city?: string;
  province?: string;
  description?: string;
  url: string;
}) => {
  if (isUnknownValue(args.title)) {
    throw new Error(`Rejected low-quality job extraction for ${args.url}: missing title`);
  }

  if (isUnknownValue(args.city)) {
    throw new Error(`Rejected low-quality job extraction for ${args.url}: missing city`);
  }

  if (!normalizeCanadianProvinceValue(args.province)) {
    throw new Error(`Rejected low-quality job extraction for ${args.url}: missing province`);
  }

  if (isUnknownValue(args.description) || normalizeText(args.description).length < 40) {
    throw new Error(`Rejected low-quality job extraction for ${args.url}: missing description`);
  }
};
