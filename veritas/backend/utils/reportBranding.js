import { getSettingsMap } from "./settingsHelper.js";
import { GENERAL_SETTING_KEYS } from "./generalSettings.js";

export const REPORT_BRANDING_SECTION = "reports";

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
  showGeneratedAt: "report_show_generated_at"
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
  [REPORT_BRANDING_KEYS.showGeneratedAt]: "Show generation date on reports"
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
  [REPORT_BRANDING_KEYS.showGeneratedAt]: "true"
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

export function normalizeReportBranding(input = {}) {
  return {
    [REPORT_BRANDING_KEYS.companyName]: cleanText(input[REPORT_BRANDING_KEYS.companyName], 120),
    [REPORT_BRANDING_KEYS.brandLabel]: cleanText(input[REPORT_BRANDING_KEYS.brandLabel], 80) || DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.brandLabel],
    [REPORT_BRANDING_KEYS.supportEmail]: cleanText(input[REPORT_BRANDING_KEYS.supportEmail], 200),
    [REPORT_BRANDING_KEYS.supportPhone]: cleanText(input[REPORT_BRANDING_KEYS.supportPhone], 40),
    [REPORT_BRANDING_KEYS.website]: cleanUrl(input[REPORT_BRANDING_KEYS.website], 200),
    [REPORT_BRANDING_KEYS.address]: cleanText(input[REPORT_BRANDING_KEYS.address], 300),
    [REPORT_BRANDING_KEYS.footerNote]: cleanText(input[REPORT_BRANDING_KEYS.footerNote], 200) || DEFAULT_REPORT_BRANDING[REPORT_BRANDING_KEYS.footerNote],
    [REPORT_BRANDING_KEYS.socialLinkedin]: cleanUrl(input[REPORT_BRANDING_KEYS.socialLinkedin]),
    [REPORT_BRANDING_KEYS.socialLinkedinAlt]: cleanUrl(input[REPORT_BRANDING_KEYS.socialLinkedinAlt]),
    [REPORT_BRANDING_KEYS.socialFacebook]: cleanUrl(input[REPORT_BRANDING_KEYS.socialFacebook]),
    [REPORT_BRANDING_KEYS.socialX]: cleanUrl(input[REPORT_BRANDING_KEYS.socialX]),
    [REPORT_BRANDING_KEYS.socialYoutube]: cleanUrl(input[REPORT_BRANDING_KEYS.socialYoutube]),
    [REPORT_BRANDING_KEYS.showGeneratedAt]: cleanBool(input[REPORT_BRANDING_KEYS.showGeneratedAt], true)
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
