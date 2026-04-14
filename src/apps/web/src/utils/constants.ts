// -----------------------------
// COLOR CONSTANTS
// -----------------------------

// Chart colors
export const PRIMARY_BORDER_COLOUR = "rgb(53, 162, 235)";
export const PRIMARY_BG_COLOUR = "rgba(53, 162, 235, 0.5)";
export const TARGET_BORDER_COLOUR = "rgb(220, 20, 60)";
export const TARGET_BG_COLOUR = "rgba(220, 20, 60, 0.5)";
export const TREND_BORDER_COLOUR = "rgb(255, 140, 0)";
export const TREND_BG_COLOUR = "rgba(255, 140, 0, 0.5)";

// Brand colors
export const CANADA_RED = "#FF0000";
export const CANADA_CREAM = "#FFF8DC";

// Status colors
export const STATUS_IN_PROGRESS = "#007bff";
export const STATUS_PARTIAL = "#ffc107";
export const STATUS_COMPLETE = "#28a745";
export const STATUS_NOT_STARTED = "#6c757d";

// UI colors
export const BACKGROUND = "#f6ebe3";
export const BORDER = "#d3c7b9";
export const PRIMARY = "#8b2332";
export const MUTED = "#f6ebe3";
export const BLACK = "#000000";

// -----------------------------
// FONT CONSTANTS
// -----------------------------

export const FONT_SANS = '"Inter", system-ui, sans-serif';
export const FONT_FOUNDERS = '"Founders Grotesk Mono", Arial, sans-serif';
export const FONT_FINANCIER = '"Financier Text", serif';
export const FONT_SOEHNE = '"Soehne", sans-serif';

// Optional grouped export
export const FONTS = {
  sans: FONT_SANS,
  founders: FONT_FOUNDERS,
  financier: FONT_FINANCIER,
  soehne: FONT_SOEHNE,
};

export const COLOURS = {
  primary: PRIMARY,
  background: BACKGROUND,
  border: BORDER,
  muted: MUTED,
  black: BLACK,
  canadaRed: CANADA_RED,
  canadaCream: CANADA_CREAM,
  chart: {
    primary: {
      border: PRIMARY_BORDER_COLOUR,
      bg: PRIMARY_BG_COLOUR,
    },
    target: {
      border: TARGET_BORDER_COLOUR,
      bg: TARGET_BG_COLOUR,
    },
    trend: {
      border: TREND_BORDER_COLOUR,
      bg: TREND_BG_COLOUR,
    },
  },
};
