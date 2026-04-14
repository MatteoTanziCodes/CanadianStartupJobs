const stripWww = (hostname: string) => hostname.replace(/^www\./, "").toLowerCase();

export const getCanonicalHostname = (url: string) => {
  try {
    return stripWww(new URL(url).hostname);
  } catch {
    return "";
  }
};

export const normalizeHttpUrl = (url: string) => {
  try {
    const normalized = new URL(url);
    if (!["http:", "https:"].includes(normalized.protocol)) {
      return "";
    }

    normalized.hash = "";
    normalized.searchParams.sort();
    if (normalized.pathname !== "/") {
      normalized.pathname = normalized.pathname.replace(/\/+$/, "");
    }
    normalized.hostname = stripWww(normalized.hostname);
    return normalized.toString();
  } catch {
    return "";
  }
};

export const normalizeSourceUrl = (url: string) =>
  normalizeHttpUrl(url).replace(/\/$/, "");

export const getCanonicalDomain = (url: string) => getCanonicalHostname(url);

export const getCanonicalPostingUrl = (url: string) => normalizeHttpUrl(url);

export const urlsMatch = (left: string, right: string) =>
  !!left && !!right && normalizeHttpUrl(left) === normalizeHttpUrl(right);
