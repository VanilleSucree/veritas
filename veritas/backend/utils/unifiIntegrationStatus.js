import { getSettingsMap } from "./settingsHelper.js";

export const UNIFI_ENABLED_KEY = "INTEGRATION_UNIFI_ENABLED";
export const UNIFI_SITE_MANAGER_KEY = "UNIFI_SITE_MANAGER_API_KEY";
export const UNIFI_NETWORK_KEY = "UNIFI_NETWORK_API_KEY";
export const UNIFI_CARRIER_KEY = "UNIFI_CARRIER_FABRIC_API_KEY";
/** Legacy alias — still read as Site Manager fallback. */
export const UNIFI_LEGACY_KEY = "UNIFI_API_KEY";

export const UNIFI_CREDENTIAL_KEYS = [
  UNIFI_SITE_MANAGER_KEY,
  UNIFI_NETWORK_KEY,
  UNIFI_CARRIER_KEY,
  UNIFI_LEGACY_KEY
];

export async function getUnifiSettingsMap() {
  return getSettingsMap([UNIFI_ENABLED_KEY, ...UNIFI_CREDENTIAL_KEYS]);
}

export function resolveSiteManagerApiKey(map = {}, overrideKey = null) {
  const fromBody = String(overrideKey || "").trim();
  if (fromBody) return fromBody;
  return (
    String(map[UNIFI_SITE_MANAGER_KEY] || "").trim() ||
    String(map[UNIFI_LEGACY_KEY] || "").trim() ||
    String(process.env.UNIFI_SITE_MANAGER_API_KEY || process.env.UNIFI_API_KEY || "").trim()
  );
}

export function resolveNetworkApiKey(map = {}, overrideKey = null) {
  const fromBody = String(overrideKey || "").trim();
  if (fromBody) return fromBody;
  return (
    String(map[UNIFI_NETWORK_KEY] || "").trim() ||
    String(process.env.UNIFI_NETWORK_API_KEY || "").trim() ||
    resolveSiteManagerApiKey(map)
  );
}

export function resolveCarrierApiKey(map = {}, overrideKey = null) {
  const fromBody = String(overrideKey || "").trim();
  if (fromBody) return fromBody;
  return (
    String(map[UNIFI_CARRIER_KEY] || "").trim() ||
    String(process.env.UNIFI_CARRIER_FABRIC_API_KEY || "").trim()
  );
}

export async function isUnifiIntegrationEnabled() {
  try {
    const map = await getUnifiSettingsMap();
    const raw = `${map[UNIFI_ENABLED_KEY] ?? ""}`.toLowerCase();
    if (raw === "true") return true;
    if (raw === "false") return false;
    return Boolean(resolveSiteManagerApiKey(map));
  } catch {
    return false;
  }
}

export async function getUnifiConfigStatus() {
  const map = await getUnifiSettingsMap();
  const siteManagerKey = resolveSiteManagerApiKey(map);
  const networkKey = String(map[UNIFI_NETWORK_KEY] || process.env.UNIFI_NETWORK_API_KEY || "").trim();
  const carrierKey = resolveCarrierApiKey(map);
  const enabled = await isUnifiIntegrationEnabled();
  return {
    enabled,
    configured: Boolean(siteManagerKey),
    keys: {
      siteManager: Boolean(siteManagerKey),
      network: Boolean(networkKey),
      carrierFabric: Boolean(carrierKey)
    }
  };
}
