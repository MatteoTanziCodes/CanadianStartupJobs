const LOCAL_API_BASE_URL = "http://localhost:3050";
const PRODUCTION_API_BASE_URL = "https://canadianstartupjobs-api.matteo-beatstanzi.workers.dev";

const normalizeUrl = (value?: string | null) => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\/+$/, "");
};

const getApiBaseUrl = () => {
  const configuredApiBaseUrl = normalizeUrl(process.env.NEXT_PUBLIC_API_URL);
  if (configuredApiBaseUrl) {
    return configuredApiBaseUrl;
  }

  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return LOCAL_API_BASE_URL;
    }
  }

  return PRODUCTION_API_BASE_URL;
};

export const config = {
  get apiBaseUrl() {
    return getApiBaseUrl();
  },
};
