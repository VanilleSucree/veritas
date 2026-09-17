import { getSettingsMap } from "./settingsHelper.js";
import { GENERAL_SETTING_KEYS } from "./generalSettings.js";

export const REPORT_BRANDING_SECTION = "reports";

export const REPORT_FONT_SANS_PRESETS = {
  source_sans: {
    id: "source_sans",
    label: "Source Sans 3",
    stack: '"Source Sans 3", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    google: "Source+Sans+3:wght@400;500;600;700"
  },
  inter: {
    id: "inter",
    label: "Inter",
    stack: 'Inter, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    google: "Inter:wght@400;500;600;700"
  },
  ibm_plex: {
    id: "ibm_plex",
    label: "IBM Plex Sans",
    stack: '"IBM Plex Sans", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    google: "IBM+Plex+Sans:wght@400;500;600;700"
  },
  nunito: {
    id: "nunito",
    label: "Nunito Sans",
    stack: '"Nunito Sans", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    google: "Nunito+Sans:wght@400;500;600;700"
  },
  system: {
    id: "system",
    label: "Système",
    stack: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    google: null
  }
};

export const REPORT_FONT_SERIF_PRESETS = {
  source_serif: {
    id: "source_serif",
    label: "Source Serif 4",
    stack: '"Source Serif 4", Georgia, "Times New Roman", serif',
    google: "Source+Serif+4:opsz,wght@8..60,600;8..60,700"
  },
  libre_baskerville: {
    id: "libre_baskerville",
    label: "Libre Baskerville",
    stack: '"Libre Baskerville", Georgia, "Times New Roman", serif',
    google: "Libre+Baskerville:wght@400;700"
  },
  merriweather: {
    id: "merriweather",
    label: "Merriweather",
    stack: 'Merriweather, Georgia, "Times New Roman", serif',
    google: "Merriweather:wght@400;700"
  },
  georgia: {
    id: "georgia",
    label: "Georgia",
    stack: 'Georgia, "Times New Roman", Times, serif',
    google: null
  }
};

export const REPORT_BRANDING_KEYS = {
  companyName: "report_company_name",
  brandLabel: "report_brand_label",
  supportEmail: "report_support_email",
  supportPhone: "report_support_phone",
  website: "report_website",
  address: "report_address",
  footerNote: "report_footer_note",
  socialLinkedin: "report_social_linkedin",
  socialLinkedinAlt: "report_social_linkedin_alt",
  socialFacebook: "report_social_facebook",
  socialX: "report_social_x",
  socialYoutube: "report_social_youtube",
  showGeneratedAt: "report_show_generated_at",
  fontSans: "report_font_sans",
  fontSerif: "report_font_serif",
  headerBg: "report_header_bg",
  headerBgEnd: "report_header_bg_end",
  headerText: "report_header_text",
  headerBrandColor: "report_header_brand_color",
  headerAccentBar: "report_header_accent_bar",
  headerAccentBarEnd: "report_header_accent_bar_end",
  footerBg: "report_footer_bg",
  footerText: "report_footer_text",
  footerMuted: "report_footer_muted",
  footerLink: "report_footer_link",
  accent: "report_accent",
  navy: "report_navy",
  brandSize: "report_brand_size",
  companySize: "report_company_size",
  clientSize: "report_client_size",
  footerBrandSize: "report_footer_brand_size",
  footerNoteSize: "report_footer_note_size"
};

export const REPORT_BRANDING_LABELS = {
  [REPORT_BRANDING_KEYS.companyName]: "Report company name",
  [REPORT_BRANDING_KEYS.brandLabel]: "Report brand label",
  [REPORT_BRANDING_KEYS.supportEmail]: "Report support email",
  [REPORT_BRANDING_KEYS.supportPhone]: "Report support phone",
  [REPORT_BRANDING_KEYS.website]: "Report website",
  [REPORT_BRANDING_KEYS.address]: "Report address",
  [REPORT_BRANDING_KEYS.footerNote]: "Report footer note",
  [REPORT_BRANDING_KEYS.socialLinkedin]: "Report LinkedIn URL",
  [REPORT_BRANDING_KEYS.socialLinkedinAlt]: "Report LinkedIn (alt) URL",
  [REPORT_BRANDING_KEYS.socialFacebook]: "Report Facebook URL",
  [REPORT_BRANDING_KEYS.socialX]: "Report X URL",
  [REPORT_BRANDING_KEYS.socialYoutube]: "Report YouTube URL",
  [REPORT_BRANDING_KEYS.showGeneratedAt]: "Show generation date on reports",
  [REPORT_BRANDING_KEYS.fontSans]: "Report sans font",
  [REPORT_BRANDING_KEYS.fontSerif]: "Report serif font",
  [REPORT_BRANDING_KEYS.headerBg]: "Report header background start",
  [REPORT_BRANDING_KEYS.headerBgEnd]: "Report header background end",
  [REPORT_BRANDING_KEYS.headerText]: "Report header text color",
  [REPORT_BRANDING_KEYS.headerBrandColor]: "Report header brand color",
  [REPORT_BRANDING_KEYS.headerAccentBar]: "Report header accent bar start",
  [REPORT_BRANDING_KEYS.headerAccentBarEnd]: "Report header accent bar end",
  [REPORT_BRANDING_KEYS.footerBg]: "Report footer background",
  [REPORT_BRANDING_KEYS.footerText]: "Report footer text color",
  [REPORT_BRANDING_KEYS.footerMuted]: "Report footer muted color",
  [REPORT_BRANDING_KEYS.footerLink]: "Report footer link color",
  [REPORT_BRANDING_KEYS.accent]: "Report accent color",
  [REPORT_BRANDING_KEYS.navy]: "Report navy / titles color",
  [REPORT_BRANDING_KEYS.brandSize]: "Report brand font size (rem)",
  [REPORT_BRANDING_KEYS.companySize]: "Report company font size (rem)",
  [REPORT_BRANDING_KEYS.clientSize]: "Report client title size (rem)",
  [REPORT_BRANDING_KEYS.footerBrandSize]: "Report footer brand size (rem)",
  [REPORT_BRANDING_KEYS.footerNoteSize]: "Report footer note size (rem)"
};

export const DEFAULT_REPORT_BRANDING = {
  [REPORT_BRANDING_KEYS.companyName]: "",
  [REPORT_BRANDING_KEYS.brandLabel]: "PSI × Veritas",
  [REPORT_BRANDING_KEYS.supportEmail]: "",
  [REPORT_BRANDING_KEYS.supportPhone]: "",
  [REPORT_BRANDING_KEYS.website]: "",
  [REPORT_BRANDING_KEYS.address]: "",
  [REPORT_BRANDING_KEYS.footerNote]: "Confidentiel — usage client",
  [REPORT_BRANDING_KEYS.socialLinkedin]: "",
  [REPORT_BRANDING_KEYS.socialLinkedinAlt]: "",
  [REPORT_BRANDING_KEYS.socialFacebook]: "",
  [REPORT_BRANDING_KEYS.socialX]: "",
  [REPORT_BRANDING_KEYS.socialYoutube]: "",
  [REPORT_BRANDING_KEYS.showGeneratedAt]: "true",
  [REPORT_BRANDING_KEYS.fontSans]: "source_sans",
  [REPORT_BRANDING_KEYS.fontSerif]: "source_serif",
  [REPORT_BRANDING_KEYS.headerBg]: "#0b3d4a",
  [REPORT_BRANDING_KEYS.headerBgEnd]: "#0f766e",
  [REPORT_BRANDING_KEYS.headerText]: "#f8fafc",
  [REPORT_BRANDING_KEYS.headerBrandColor]: "#99f6e4",
  [REPORT_BRANDING_KEYS.headerAccentBar]: "#99f6e4",
  [REPORT_BRANDING_KEYS.headerAccentBarEnd]: "#fbbf24",
  [REPORT_BRANDING_KEYS.footerBg]: "#ffffff",
  [REPORT_BRANDING_KEYS.footerText]: "#1e3a5f",
  [REPORT_BRANDING_KEYS.footerMuted]: "#64748b",
  [REPORT_BRANDING_KEYS.footerLink]: "#115e59",
  [REPORT_BRANDING_KEYS.accent]: "#0f766e",
  [REPORT_BRANDING_KEYS.navy]: "#1e3a5f",
  [REPORT_BRANDING_KEYS.brandSize]: "0.72",
  [REPORT_BRANDING_KEYS.companySize]: "1.05",
  [REPORT_BRANDING_KEYS.clientSize]: "2.1",
  [REPORT_BRANDING_KEYS.footerBrandSize]: "0.95",
  [REPORT_BRANDING_KEYS.footerNoteSize]: "0.78"
};

function cleanText(value, max = 200) {
  return String(value ?? "").trim().slice(0, max);
}

function cleanUrl(value, max = 400) {
  const url = cleanText(value, max);
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return "";
}

function cleanBool(value, fallback = true) {
  if (value === true || value === false) return value ? "true" : "false";
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "true" || raw === "1" || raw === "yes") return "true";
  if (raw === "false" || raw === "0" || raw === "no") return "false";
  return fallback ? "true" : "false";
}

function cleanHex(value, fallback) {
  const raw = String(value ?? "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const [, a, b, c] = raw;
    return `#${a}${a}${b}${b}${c}${c}`.toLowerCase();
  }
  return fallback;
}

function cleanFontPreset(value, presets, fallbackId) {
  const id = cleanText(value, 40).toLowerCase().replace(/\s+/g, "_");
  if (presets[id]) return id;
  return fallbackId;
}

function cleanRem(value, fallback, { min = 0.5, max = 4 } = {}) {
  const raw = String(value ?? "").trim().replace(/,/g, ".");
  const num = Number.parseFloat(raw);
  if (!Number.isFinite(num)) return fallback;
  const clamped = Math.min(max, Math.max(min, num));
  return String(Math.round(clamped * 100) / 100);
}

function darkenHex(hex, ratio = 0.18) {
  const h = cleanHex(hex, "#0f766e").slice(1);
  const r = Math.round(parseInt(h.slice(0, 2), 16) * (1 - ratio));
  const g = Math.round(parseInt(h.slice(2, 4), 16) * (1 - ratio));
  const b = Math.round(parseInt(h.slice(4, 6), 16) * (1 - ratio));
  const to = n => n.toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function softHex(hex) {
  const h = cleanHex(hex, "#0f766e").slice(1);
  const r = Math.round(parseInt(h.slice(0, 2), 16) * 0.12 + 255 * 0.88);
  const g = Math.round(parseInt(h.slice(2, 4), 16) * 0.12 + 255 * 0.88);
  const b = Math.round(parseInt(h.slice(4, 6), 16) * 0.12 + 255 * 0.88);
  const to = n => Math.min(255, n).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function normalizeReportBranding(input = {}) {
  return {
    [REPORT_BRANDING_KEYS.companyName]: cleanText(input[REPORT_BRANDING_KEYS.companyName], 120),
    [REPORT_BRANDING_KEYS.brandLabel]:
      cleanText(input[REPORT_BRANDING_KEYS.brandLabel], 80) ||
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.brandLabel],
    [REPORT_BRANDING_KEYS.supportEmail]: cleanText(input[REPORT_BRANDING_KEYS.supportEmail], 200),
    [REPORT_BRANDING_KEYS.supportPhone]: cleanText(input[REPORT_BRANDING_KEYS.supportPhone], 40),
    [REPORT_BRANDING_KEYS.website]: cleanUrl(input[REPORT_BRANDING_KEYS.website], 200),
    [REPORT_BRANDING_KEYS.address]: cleanText(input[REPORT_BRANDING_KEYS.address], 300),
    [REPORT_BRANDING_KEYS.footerNote]:
      cleanText(input[REPORT_BRANDING_KEYS.footerNote], 200) ||
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.footerNote],
    [REPORT_BRANDING_KEYS.socialLinkedin]: cleanUrl(input[REPORT_BRANDING_KEYS.socialLinkedin]),
    [REPORT_BRANDING_KEYS.socialLinkedinAlt]: cleanUrl(input[REPORT_BRANDING_KEYS.socialLinkedinAlt]),
    [REPORT_BRANDING_KEYS.socialFacebook]: cleanUrl(input[REPORT_BRANDING_KEYS.socialFacebook]),
    [REPORT_BRANDING_KEYS.socialX]: cleanUrl(input[REPORT_BRANDING_KEYS.socialX]),
    [REPORT_BRANDING_KEYS.socialYoutube]: cleanUrl(input[REPORT_BRANDING_KEYS.socialYoutube]),
    [REPORT_BRANDING_KEYS.showGeneratedAt]: cleanBool(input[REPORT_BRANDING_KEYS.showGeneratedAt], true),
    [REPORT_BRANDING_KEYS.fontSans]: cleanFontPreset(
      input[REPORT_BRANDING_KEYS.fontSans],
      REPORT_FONT_SANS_PRESETS,
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.fontSans]
    ),
    [REPORT_BRANDING_KEYS.fontSerif]: cleanFontPreset(
      input[REPORT_BRANDING_KEYS.fontSerif],
      REPORT_FONT_SERIF_PRESETS,
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.fontSerif]
    ),
    [REPORT_BRANDING_KEYS.headerBg]: cleanHex(
      input[REPORT_BRANDING_KEYS.headerBg],
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.headerBg]
    ),
    [REPORT_BRANDING_KEYS.headerBgEnd]: cleanHex(
      input[REPORT_BRANDING_KEYS.headerBgEnd],
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.headerBgEnd]
    ),
    [REPORT_BRANDING_KEYS.headerText]: cleanHex(
      input[REPORT_BRANDING_KEYS.headerText],
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.headerText]
    ),
    [REPORT_BRANDING_KEYS.headerBrandColor]: cleanHex(
      input[REPORT_BRANDING_KEYS.headerBrandColor],
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.headerBrandColor]
    ),
    [REPORT_BRANDING_KEYS.headerAccentBar]: cleanHex(
      input[REPORT_BRANDING_KEYS.headerAccentBar],
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.headerAccentBar]
    ),
    [REPORT_BRANDING_KEYS.headerAccentBarEnd]: cleanHex(
      input[REPORT_BRANDING_KEYS.headerAccentBarEnd],
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.headerAccentBarEnd]
    ),
    [REPORT_BRANDING_KEYS.footerBg]: cleanHex(
      input[REPORT_BRANDING_KEYS.footerBg],
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.footerBg]
    ),
    [REPORT_BRANDING_KEYS.footerText]: cleanHex(
      input[REPORT_BRANDING_KEYS.footerText],
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.footerText]
    ),
    [REPORT_BRANDING_KEYS.footerMuted]: cleanHex(
      input[REPORT_BRANDING_KEYS.footerMuted],
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.footerMuted]
    ),
    [REPORT_BRANDING_KEYS.footerLink]: cleanHex(
      input[REPORT_BRANDING_KEYS.footerLink],
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.footerLink]
    ),
    [REPORT_BRANDING_KEYS.accent]: cleanHex(
      input[REPORT_BRANDING_KEYS.accent],
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.accent]
    ),
    [REPORT_BRANDING_KEYS.navy]: cleanHex(
      input[REPORT_BRANDING_KEYS.navy],
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.navy]
    ),
    [REPORT_BRANDING_KEYS.brandSize]: cleanRem(
      input[REPORT_BRANDING_KEYS.brandSize],
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.brandSize],
      { min: 0.5, max: 1.4 }
    ),
    [REPORT_BRANDING_KEYS.companySize]: cleanRem(
      input[REPORT_BRANDING_KEYS.companySize],
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.companySize],
      { min: 0.75, max: 2 }
    ),
    [REPORT_BRANDING_KEYS.clientSize]: cleanRem(
      input[REPORT_BRANDING_KEYS.clientSize],
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.clientSize],
      { min: 1.2, max: 3.5 }
    ),
    [REPORT_BRANDING_KEYS.footerBrandSize]: cleanRem(
      input[REPORT_BRANDING_KEYS.footerBrandSize],
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.footerBrandSize],
      { min: 0.6, max: 1.8 }
    ),
    [REPORT_BRANDING_KEYS.footerNoteSize]: cleanRem(
      input[REPORT_BRANDING_KEYS.footerNoteSize],
      DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.footerNoteSize],
      { min: 0.55, max: 1.2 }
    )
  };
}

export function resolveReportStyle(normalized = {}) {
  const fontSans =
    REPORT_FONT_SANS_PRESETS[normalized[REPORT_BRANDING_KEYS.fontSans]] ||
    REPORT_FONT_SANS_PRESETS.source_sans;
  const fontSerif =
    REPORT_FONT_SERIF_PRESETS[normalized[REPORT_BRANDING_KEYS.fontSerif]] ||
    REPORT_FONT_SERIF_PRESETS.source_serif;
  const accent = normalized[REPORT_BRANDING_KEYS.accent] || DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.accent];
  const navy = normalized[REPORT_BRANDING_KEYS.navy] || DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.navy];
  const googleFamilies = [fontSans.google, fontSerif.google].filter(Boolean);
  return {
    fontSansId: fontSans.id,
    fontSerifId: fontSerif.id,
    fontSans: fontSans.stack,
    fontSerif: fontSerif.stack,
    googleFontsHref: googleFamilies.length
      ? `https://fonts.googleapis.com/css2?${googleFamilies.map(f => `family=${f}`).join("&")}&display=swap`
      : "",
    headerBg: normalized[REPORT_BRANDING_KEYS.headerBg],
    headerBgEnd: normalized[REPORT_BRANDING_KEYS.headerBgEnd],
    headerText: normalized[REPORT_BRANDING_KEYS.headerText],
    headerBrandColor: normalized[REPORT_BRANDING_KEYS.headerBrandColor],
    headerAccentBar: normalized[REPORT_BRANDING_KEYS.headerAccentBar],
    headerAccentBarEnd: normalized[REPORT_BRANDING_KEYS.headerAccentBarEnd],
    footerBg: normalized[REPORT_BRANDING_KEYS.footerBg],
    footerText: normalized[REPORT_BRANDING_KEYS.footerText],
    footerMuted: normalized[REPORT_BRANDING_KEYS.footerMuted],
    footerLink: normalized[REPORT_BRANDING_KEYS.footerLink],
    accent,
    accentDark: darkenHex(accent, 0.18),
    accentSoft: softHex(accent),
    navy,
    brandSize: `${normalized[REPORT_BRANDING_KEYS.brandSize]}rem`,
    companySize: `${normalized[REPORT_BRANDING_KEYS.companySize]}rem`,
    clientSize: `${normalized[REPORT_BRANDING_KEYS.clientSize]}rem`,
    footerBrandSize: `${normalized[REPORT_BRANDING_KEYS.footerBrandSize]}rem`,
    footerNoteSize: `${normalized[REPORT_BRANDING_KEYS.footerNoteSize]}rem`
  };
}

export function toPublicReportBranding(raw = {}, general = {}) {
  const normalized = normalizeReportBranding(raw);
  const companyName =
    normalized[REPORT_BRANDING_KEYS.companyName] ||
    String(general[GENERAL_SETTING_KEYS.organizationName] || "").trim() ||
    "Veritas";
  const supportEmail =
    normalized[REPORT_BRANDING_KEYS.supportEmail] ||
    String(general[GENERAL_SETTING_KEYS.supportEmail] || "").trim();
  const supportPhone =
    normalized[REPORT_BRANDING_KEYS.supportPhone] ||
    String(general[GENERAL_SETTING_KEYS.supportPhone] || "").trim();
  const website =
    normalized[REPORT_BRANDING_KEYS.website] ||
    String(general[GENERAL_SETTING_KEYS.organizationWebsite] || "").trim();
  const address =
    normalized[REPORT_BRANDING_KEYS.address] ||
    String(general[GENERAL_SETTING_KEYS.organizationAddress] || "").trim();

  const socials = [
    { id: "linkedin", icon: "simple-icons:linkedin", url: normalized[REPORT_BRANDING_KEYS.socialLinkedin], title: "LinkedIn" },
    { id: "linkedin-alt", icon: "simple-icons:linkedin", url: normalized[REPORT_BRANDING_KEYS.socialLinkedinAlt], title: "LinkedIn" },
    { id: "facebook", icon: "simple-icons:facebook", url: normalized[REPORT_BRANDING_KEYS.socialFacebook], title: "Facebook" },
    { id: "x", icon: "simple-icons:x", url: normalized[REPORT_BRANDING_KEYS.socialX], title: "X" },
    { id: "youtube", icon: "simple-icons:youtube", url: normalized[REPORT_BRANDING_KEYS.socialYoutube], title: "YouTube" }
  ].filter(item => item.url);

  return {
    companyName,
    brandLabel: normalized[REPORT_BRANDING_KEYS.brandLabel],
    supportEmail,
    supportPhone,
    website,
    address,
    footerNote: normalized[REPORT_BRANDING_KEYS.footerNote],
    showGeneratedAt: normalized[REPORT_BRANDING_KEYS.showGeneratedAt] === "true",
    socials,
    style: resolveReportStyle(normalized),
    raw: normalized
  };
}

export async function loadReportBranding() {
  const keys = [
    ...Object.values(REPORT_BRANDING_KEYS),
    GENERAL_SETTING_KEYS.organizationName,
    GENERAL_SETTING_KEYS.supportEmail,
    GENERAL_SETTING_KEYS.supportPhone,
    GENERAL_SETTING_KEYS.organizationWebsite,
    GENERAL_SETTING_KEYS.organizationAddress
  ];
  const map = await getSettingsMap(keys);
  const raw = {};
  for (const key of Object.values(REPORT_BRANDING_KEYS)) {
    raw[key] = map[key] ?? DEFAULT_REPORT_BRANDING[key] ?? "";
  }
  return toPublicReportBranding(raw, map);
}
