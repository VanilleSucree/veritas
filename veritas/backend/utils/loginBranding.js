export const LOGIN_BRANDING_SECTION = "login";
export const LOGIN_SIDES = ["agent", "client"];
const SIDE_FIELDS = ["enabled", "headline_line1", "headline_line2", "sub", "features", "brand_name", "logo_path", "logo_transparent", "logo_bg_color", "bg_image_path", "bg_color_start", "bg_color_end", "accent_color", "right_bg_color", "right_bg_image_path", "footer_text"];
const BOOL_FIELDS = new Set(["enabled", "logo_transparent"]);
export const LOGIN_BRANDING_LABELS = {};
for (const side of LOGIN_SIDES) {
  for (const field of SIDE_FIELDS) {
    const key = `app_login_${side}_${field}`;
    LOGIN_BRANDING_LABELS[key] = `Login ${side} — ${field}`;
  }
}
export const DEFAULT_LOGIN_BRANDING = {};
for (const side of LOGIN_SIDES) {
  for (const field of SIDE_FIELDS) {
    DEFAULT_LOGIN_BRANDING[`app_login_${side}_${field}`] = BOOL_FIELDS.has(field) ? "false" : "";
  }
}
const HEX_COLOR = /^#([0-9a-fA-F]{6})$/;
export function isValidHexColor(value) {
  return HEX_COLOR.test(String(value || "").trim());
}
function normalizeHexColor(value, fallback = "") {
  const trimmed = String(value || "").trim();
  return isValidHexColor(trimmed) ? trimmed.toLowerCase() : fallback;
}
/** Empty string = use defaults/hints. Whitespace-only = intentional blank (stored as a single space). */
function normalizeText(value, maxLen) {
  const raw = String(value ?? "");
  if (raw.length > 0 && raw.trim() === "") return " ";
  return raw.trim().slice(0, maxLen);
}
function normalizeBool(value) {
  return value === true || String(value).toLowerCase() === "true";
}
function normalizeFeatures(raw) {
  let items = [];
  if (Array.isArray(raw)) {
    items = raw;
  } else if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      items = Array.isArray(parsed) ? parsed : raw.split("\n");
    } catch {
      items = raw.split("\n");
    }
  }
  return items.map(item => String(item || "").trim()).filter(Boolean).slice(0, 6);
}
function normalizeAssetPath(value) {
  const trimmed = String(value || "").trim().replace(/\\/g, "/");
  if (!trimmed) return "";
  if (!trimmed.startsWith("/uploads/login-branding/")) return "";
  return trimmed;
}
function normalizeSideSettings(input = {}, side) {
  const prefix = `app_login_${side}_`;
  return {
    enabled: normalizeBool(input[`${prefix}enabled`]),
    headlineLine1: normalizeText(input[`${prefix}headline_line1`], 120),
    headlineLine2: normalizeText(input[`${prefix}headline_line2`], 120),
    sub: normalizeText(input[`${prefix}sub`], 400),
    features: normalizeFeatures(input[`${prefix}features`]),
    brandName: normalizeText(input[`${prefix}brand_name`], 80),
    logoPath: normalizeAssetPath(input[`${prefix}logo_path`]),
    logoTransparent: normalizeBool(input[`${prefix}logo_transparent`]),
    logoBgColor: normalizeHexColor(input[`${prefix}logo_bg_color`]),
    bgImagePath: normalizeAssetPath(input[`${prefix}bg_image_path`]),
    bgColorStart: normalizeHexColor(input[`${prefix}bg_color_start`]),
    bgColorEnd: normalizeHexColor(input[`${prefix}bg_color_end`]),
    accentColor: normalizeHexColor(input[`${prefix}accent_color`]),
    rightBgColor: normalizeHexColor(input[`${prefix}right_bg_color`]),
    rightBgImagePath: normalizeAssetPath(input[`${prefix}right_bg_image_path`]),
    footerText: normalizeText(input[`${prefix}footer_text`], 200)
  };
}
export function normalizeLoginBrandingFlat(input = {}) {
  const out = {
    ...DEFAULT_LOGIN_BRANDING
  };
  for (const side of LOGIN_SIDES) {
    const normalized = normalizeSideSettings(input, side);
    const prefix = `app_login_${side}_`;
    out[`${prefix}enabled`] = normalized.enabled ? "true" : "false";
    out[`${prefix}headline_line1`] = normalized.headlineLine1;
    out[`${prefix}headline_line2`] = normalized.headlineLine2;
    out[`${prefix}sub`] = normalized.sub;
    out[`${prefix}features`] = JSON.stringify(normalized.features);
    out[`${prefix}brand_name`] = normalized.brandName;
    out[`${prefix}logo_path`] = normalized.logoPath;
    out[`${prefix}logo_transparent`] = normalized.logoTransparent ? "true" : "false";
    out[`${prefix}logo_bg_color`] = normalized.logoBgColor;
    out[`${prefix}bg_image_path`] = normalized.bgImagePath;
    out[`${prefix}bg_color_start`] = normalized.bgColorStart;
    out[`${prefix}bg_color_end`] = normalized.bgColorEnd;
    out[`${prefix}accent_color`] = normalized.accentColor;
    out[`${prefix}right_bg_color`] = normalized.rightBgColor;
    out[`${prefix}right_bg_image_path`] = normalized.rightBgImagePath;
    out[`${prefix}footer_text`] = normalized.footerText;
  }
  return out;
}
export function buildLoginBrandingPayload(flat = {}) {
  const agent = normalizeSideSettings(flat, "agent");
  const client = normalizeSideSettings(flat, "client");
  return {
    agent,
    client
  };
}
export function buildPublicLoginBranding(flat = {}, {
  pro = false
} = {}) {
  if (!pro) {
    return {
      pro: false,
      agent: null,
      client: null
    };
  }
  const payload = buildLoginBrandingPayload(flat);
  return {
    pro: true,
    agent: payload.agent.enabled ? payload.agent : null,
    client: payload.client.enabled ? payload.client : null
  };
}
