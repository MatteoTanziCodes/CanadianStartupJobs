const API_BASE_PATH = "/api/v1";
const LOCAL_SITE_BASE_URL = "http://localhost:3000";
const PRODUCTION_SITE_BASE_URL = "https://canadianstartupjobs.matteo-tanzi.dev";

const normalizeUrl = (value?: string | null) => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\/+$/, "");
};

const getSiteBaseUrl = () => {
  const configuredBaseUrl = normalizeUrl(process.env.NEXT_PUBLIC_BASE_URL);
  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (typeof window !== "undefined") {
    return normalizeUrl(window.location.origin) ?? PRODUCTION_SITE_BASE_URL;
  }

  return process.env.NODE_ENV === "development"
    ? LOCAL_SITE_BASE_URL
    : PRODUCTION_SITE_BASE_URL;
};

export const config = {
  get apiBaseUrl() {
    return `${getSiteBaseUrl()}${API_BASE_PATH}`;
  },
};
