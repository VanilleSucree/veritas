import API_BASE_URL from "../config";
const BACKEND_BASE_URL = String(API_BASE_URL || "").replace(/\/api\/?$/, "");
export const LOGIN_SIDES = ["agent", "client"];
export const LOGIN_BRANDING_MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const DEFAULT_SIDE_COLORS = {
  agent: {
    bgColorStart: "#0f1c2e",
    bgColorEnd: "#1a3060",
    accentColor: "#2b5fab",
    rightBgColor: "#f4f6fa",
    logoBgColor: "#ffffff"
  },
  client: {
    bgColorStart: "#0f2014",
    bgColorEnd: "#1a4030",
    accentColor: "#15ab5a",
    rightBgColor: "#f4f6fa",
    logoBgColor: "#ffffff"
  }
};
/** Empty = use hints/defaults. Whitespace-only = intentional blank (kept as a single space). */
export function serializeTextField(value) {
  const raw = String(value ?? "");
  if (raw.length > 0 && raw.trim() === "") return " ";
  return raw.trim();
}
/** Resolve stored branding text: "" → fallback, whitespace-only → blank, other → trimmed value. */
export function resolveBrandingText(value, fallback) {
  if (value == null || value === "") return fallback;
  return String(value).trim();
}
/** Optional text: unset ("") → null (use UI default), whitespace → "" (intentional blank). */
export function resolveOptionalBrandingText(value) {
  if (value == null || value === "") return null;
  return String(value).trim();
}
export function resolveLoginAssetUrl(relativePath) {
  const raw = String(relativePath || "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const normalized = raw.replace(/\\/g, "/");
  const uploadsIndex = normalized.toLowerCase().indexOf("/uploads/");
  const relative = uploadsIndex >= 0 ? normalized.slice(uploadsIndex) : normalized;
  if (!relative.startsWith("/")) return null;
  const encodedPath = relative.split("/").map((part, index) => index === 0 ? part : encodeURIComponent(part)).join("/");
  return `${BACKEND_BASE_URL}${encodedPath}`;
}
export function flatToSideForm(settings = {}, side) {
  const prefix = `app_login_${side}_`;
  let features = [];
  try {
    const parsed = JSON.parse(settings[`${prefix}features`] || "[]");
    features = Array.isArray(parsed) ? parsed : [];
  } catch {
    features = [];
  }
  return {
    enabled: settings[`${prefix}enabled`] === "true",
    headlineLine1: settings[`${prefix}headline_line1`] ?? "",
    headlineLine2: settings[`${prefix}headline_line2`] ?? "",
    sub: settings[`${prefix}sub`] ?? "",
    features: features.join("\n"),
    brandName: settings[`${prefix}brand_name`] ?? "",
    logoPath: settings[`${prefix}logo_path`] || "",
    logoTransparent: settings[`${prefix}logo_transparent`] === "true",
    logoBgColor: settings[`${prefix}logo_bg_color`] || "",
    bgImagePath: settings[`${prefix}bg_image_path`] || "",
    bgColorStart: settings[`${prefix}bg_color_start`] || "",
    bgColorEnd: settings[`${prefix}bg_color_end`] || "",
    accentColor: settings[`${prefix}accent_color`] || "",
    rightBgColor: settings[`${prefix}right_bg_color`] || "",
    rightBgImagePath: settings[`${prefix}right_bg_image_path`] || "",
    footerText: settings[`${prefix}footer_text`] ?? ""
  };
}
export function sideFormToFlat(side, form = {}) {
  const prefix = `app_login_${side}_`;
  const features = String(form.features || "").split("\n").map(line => line.trim()).filter(Boolean).slice(0, 6);
  return {
    [`${prefix}enabled`]: form.enabled ? "true" : "false",
    [`${prefix}headline_line1`]: serializeTextField(form.headlineLine1),
    [`${prefix}headline_line2`]: serializeTextField(form.headlineLine2),
    [`${prefix}sub`]: serializeTextField(form.sub),
    [`${prefix}features`]: JSON.stringify(features),
    [`${prefix}brand_name`]: serializeTextField(form.brandName),
    [`${prefix}logo_path`]: String(form.logoPath || "").trim(),
    [`${prefix}logo_transparent`]: form.logoTransparent ? "true" : "false",
    [`${prefix}logo_bg_color`]: String(form.logoBgColor || "").trim(),
    [`${prefix}bg_image_path`]: String(form.bgImagePath || "").trim(),
    [`${prefix}bg_color_start`]: String(form.bgColorStart || "").trim(),
    [`${prefix}bg_color_end`]: String(form.bgColorEnd || "").trim(),
    [`${prefix}accent_color`]: String(form.accentColor || "").trim(),
    [`${prefix}right_bg_color`]: String(form.rightBgColor || "").trim(),
    [`${prefix}right_bg_image_path`]: String(form.rightBgImagePath || "").trim(),
    [`${prefix}footer_text`]: serializeTextField(form.footerText)
  };
}
export function mergeBrandingWithAuthCopy(brandingSide, authPanel, side) {
  if (!brandingSide) {
    return {
      headlineLine1: authPanel.headlineLine1,
      headlineLine2: authPanel.headlineLine2,
      sub: authPanel.sub,
      features: authPanel.features,
      brandName: null,
      logoUrl: null,
      logoTransparent: false,
      logoBgColor: null,
      bgImageUrl: null,
      rightBgImageUrl: null,
      footerText: null,
      colors: DEFAULT_SIDE_COLORS[side],
      custom: false
    };
  }
  const defaults = DEFAULT_SIDE_COLORS[side];
  return {
    headlineLine1: resolveBrandingText(brandingSide.headlineLine1, authPanel.headlineLine1),
    headlineLine2: resolveBrandingText(brandingSide.headlineLine2, authPanel.headlineLine2),
    sub: resolveBrandingText(brandingSide.sub, authPanel.sub),
    features: brandingSide.features?.length ? brandingSide.features : authPanel.features,
    brandName: resolveOptionalBrandingText(brandingSide.brandName),
    logoUrl: resolveLoginAssetUrl(brandingSide.logoPath),
    logoTransparent: Boolean(brandingSide.logoTransparent),
    logoBgColor: brandingSide.logoBgColor || defaults.logoBgColor,
    bgImageUrl: resolveLoginAssetUrl(brandingSide.bgImagePath),
    rightBgImageUrl: resolveLoginAssetUrl(brandingSide.rightBgImagePath),
    footerText: resolveOptionalBrandingText(brandingSide.footerText),
    colors: {
      bgColorStart: brandingSide.bgColorStart || defaults.bgColorStart,
      bgColorEnd: brandingSide.bgColorEnd || defaults.bgColorEnd,
      accentColor: brandingSide.accentColor || defaults.accentColor,
      rightBgColor: brandingSide.rightBgColor || defaults.rightBgColor
    },
    custom: true
  };
}
export function buildLoginBrandingStyleVars(panel, accountType) {
  const colors = panel.colors || DEFAULT_SIDE_COLORS[accountType];
  const style = {
    "--login-bg-start": colors.bgColorStart,
    "--login-bg-end": colors.bgColorEnd,
    "--login-accent": colors.accentColor,
    "--login-right-bg": colors.rightBgColor
  };
  const gradient = `linear-gradient(160deg, ${colors.bgColorStart} 0%, ${colors.bgColorEnd} 60%, ${colors.bgColorEnd} 100%)`;
  if (panel.bgImageUrl) {
    style.backgroundImage = `linear-gradient(160deg, ${colors.bgColorStart}cc 0%, ${colors.bgColorEnd}cc 100%), url("${panel.bgImageUrl}")`;
    style.backgroundSize = "cover";
    style.backgroundPosition = "center";
  } else {
    style.background = gradient;
  }
  return style;
}
export function buildLoginRightPanelStyle(panel, accountType) {
  if (!panel?.custom) return undefined;
  const colors = panel.colors || DEFAULT_SIDE_COLORS[accountType];
  const style = {
    backgroundColor: colors.rightBgColor
  };
  if (panel.rightBgImageUrl) {
    style.backgroundImage = `url("${panel.rightBgImageUrl}")`;
    style.backgroundSize = "cover";
    style.backgroundPosition = "center";
    style.backgroundRepeat = "no-repeat";
  }
  return style;
}
