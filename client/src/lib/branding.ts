/** Official ISEYC brand identity and design system configuration. */

export const ISEYC_NAME = "ISEYC";
export const ISEYC_FULL_NAME =
  "Initiative for Sustainable Evolution for Youth and Community";
export const ISEYC_PRIMARY_TAGLINE =
  "Empowering Youth, Shaping Communities.";
export const ISEYC_SECONDARY_TAGLINE =
  "Every Street. Every Voice. Accountable Leadership.";
export const ISEYC_TAGLINE =
  `${ISEYC_PRIMARY_TAGLINE} ${ISEYC_SECONDARY_TAGLINE}`;

export const ISEYC_DOC_TITLE = "ISEYC Digital Operations Centre";
export const ISEYC_DOC_DESCRIPTION =
  "Secure institutional digital operations platform for ISEYC — command briefs, meeting records, decision tracking, community intelligence, and accountable leadership across Nigeria.";

/** Visual Design Tokens */
export const ISEYC_BRAND_COLORS = {
  deepGreen: "#022c22",
  primaryGreen: "#059669",
  lightGreen: "#ecfdf5",
  accentGold: "#d97706",
  goldMuted: "#fef3c7",
  slateDark: "#0f172a",
  slateLight: "#f8fafc",
} as const;

/** Brand Assets */
export const ISEYC_LOGO_SRC = "/iseyc-logo.svg";

/** Semantic design tokens for institutional UI consistency */
export const ISEYC_TOKENS = {
  brand: {
    primary: ISEYC_BRAND_COLORS.deepGreen,
    primaryForeground: "#ffffff",
    accent: ISEYC_BRAND_COLORS.accentGold,
    accentMuted: ISEYC_BRAND_COLORS.goldMuted,
    soft: ISEYC_BRAND_COLORS.lightGreen,
    mark: ISEYC_BRAND_COLORS.primaryGreen,
  },
  surface: {
    page: ISEYC_BRAND_COLORS.slateLight,
    card: "#ffffff",
    muted: "#f1f5f9",
  },
  text: {
    strong: ISEYC_BRAND_COLORS.slateDark,
    body: "#334155",
    muted: "#64748b",
  },
  border: "#e2e8f0",
  status: {
    success: "#047857",
    warning: "#b45309",
    danger: "#b91c1c",
  },
  positioning: "Non-Partisan • Youth-Led • Systems-Focused",
  productName: ISEYC_DOC_TITLE,
  organisationName: ISEYC_FULL_NAME,
  shortName: ISEYC_NAME,
  logoSrc: ISEYC_LOGO_SRC,
  logoAlt:
    "Official ISEYC emblem — Initiative for Sustainable Evolution for Youth and Community",
} as const;
