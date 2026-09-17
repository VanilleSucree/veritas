import fetch from "node-fetch";
import {
  getUnifiSettingsMap,
  resolveCarrierApiKey,
  resolveNetworkApiKey,
  resolveSiteManagerApiKey
} from "../../../utils/unifiIntegrationStatus.js";

export const UI_API_BASE = "https://api.ui.com";

export async function getUnifiApiKeys(overrides = {}) {
  const map = await getUnifiSettingsMap();
  return {
    siteManager: resolveSiteManagerApiKey(map, overrides.siteManager || overrides.apiKey),
    network: resolveNetworkApiKey(map, overrides.network),
    carrierFabric: resolveCarrierApiKey(map, overrides.carrierFabric || overrides.carrier)
  };
}

export async function fetchUiApi(path, { apiKey, method = "GET", body, query } = {}) {
  if (!apiKey) {
    const err = new Error("UniFi API key missing");
    err.status = 400;
    throw err;
  }
  const url = new URL(path.startsWith("http") ? path : `${UI_API_BASE}${path.startsWith("/") ? path : `/${path}`}`);
  if (query && typeof query === "object") {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      if (Array.isArray(value)) {
        value.forEach(item => url.searchParams.append(key, String(item)));
      } else {
        url.searchParams.set(key, String(value));
      }
    });
  }
  const response = await fetch(url.toString(), {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-API-KEY": apiKey
    },
    body: body != null ? JSON.stringify(body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(
      payload?.message ||
        payload?.error ||
        payload?.meta?.msg ||
        `UniFi API HTTP ${response.status}`
    );
    err.status = response.status;
    err.details = payload;
    throw err;
  }
  return payload;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.hosts)) return value.hosts;
  if (Array.isArray(value?.sites)) return value.sites;
  if (Array.isArray(value?.devices)) return value.devices;
  if (Array.isArray(value?.subscribers)) return value.subscribers;
  return [];
}

export function extractUiList(payload) {
  return asArray(payload);
}

export function normalizeMac(mac) {
  return String(mac || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-f0-9]/g, "");
}

export function classifyUnifiDevice(device = {}) {
  const model = String(device.model || device.productLine || device.shortname || device.type || "").toLowerCase();
  const name = String(device.name || "").toLowerCase();
  const productLine = String(device.productLine || device.product_line || "").toLowerCase();
  const typeHint = String(device.type || device.deviceType || device.category || "").toLowerCase();
  const blob = `${model} ${name} ${productLine} ${typeHint}`;

  if (
    /\b(uap|u6|u7|uai|wifi|access.?point|ap)\b/.test(blob) ||
    typeHint.includes("uap") ||
    typeHint === "ap"
  ) {
    return {
      category: "ap",
      moduleKey: "BorneWifi"
    };
  }
  if (
    /\b(usw|switch|enterprise.?switch)\b/.test(blob) ||
    typeHint.includes("usw") ||
    typeHint === "switch"
  ) {
    return {
      category: "switch",
      moduleKey: "Switch"
    };
  }
  if (/\b(edgerouter|er-)\b/.test(blob)) {
    return {
      category: "router",
      moduleKey: "Routeur"
    };
  }
  if (
    /\b(udm|uxg|ucg|ugw|gateway|dream.?machine|cloud.?gateway|security.?gateway)\b/.test(blob) ||
    typeHint.includes("ugw") ||
    typeHint === "gateway"
  ) {
    return {
      category: "gateway",
      moduleKey: "Firewalls"
    };
  }
  if (/\b(switch)\b/.test(blob)) {
    return {
      category: "switch",
      moduleKey: "Switch"
    };
  }
  return {
    category: "other",
    moduleKey: null
  };
}

export function normalizeUnifiDevice(raw = {}, { hostId = null, siteId = null } = {}) {
  const classification = classifyUnifiDevice(raw);
  const id = raw.id || raw.device_id || raw.deviceId || raw.mac || null;
  const mac = raw.mac || raw.macAddress || raw.mac_address || "";
  return {
    id,
    name: raw.name || raw.hostname || raw.displayName || (mac ? `Device-${String(mac).slice(-5)}` : "UniFi device"),
    mac,
    macNormalized: normalizeMac(mac),
    model: raw.model || raw.productModel || raw.shortname || "",
    ip: raw.ip || raw.ipAddress || raw.ip_address || raw.ipMgmt || "",
    version: raw.version || raw.firmware || raw.firmwareVersion || "",
    serial: raw.serial || raw.serialNumber || raw.serial_number || "",
    status: raw.status || raw.state || raw.connectionState || "",
    hostId: hostId || raw.hostId || raw.host_id || null,
    siteId: siteId || raw.siteId || raw.site_id || null,
    category: classification.category,
    moduleKey: classification.moduleKey,
    raw
  };
}

export async function listAllHosts(apiKey) {
  const items = [];
  let nextToken = null;
  do {
    const payload = await fetchUiApi("/v1/hosts", {
      apiKey,
      query: {
        pageSize: 200,
        nextToken: nextToken || undefined
      }
    });
    items.push(...extractUiList(payload));
    nextToken = payload?.nextToken || payload?.next_token || null;
  } while (nextToken);
  return items;
}

export async function listAllSites(apiKey) {
  const items = [];
  let nextToken = null;
  do {
    const payload = await fetchUiApi("/v1/sites", {
      apiKey,
      query: {
        pageSize: 200,
        nextToken: nextToken || undefined
      }
    });
    items.push(...extractUiList(payload));
    nextToken = payload?.nextToken || payload?.next_token || null;
  } while (nextToken);
  return items;
}

export async function listDevicesForHost(apiKey, hostId) {
  const items = [];
  let nextToken = null;
  do {
    const payload = await fetchUiApi("/v1/devices", {
      apiKey,
      query: {
        hostIds: hostId,
        pageSize: 200,
        nextToken: nextToken || undefined
      }
    });
    const page = extractUiList(payload);
    // Site Manager may return [{ hostId, devices: [...] }, ...]
    page.forEach(entry => {
      if (Array.isArray(entry?.devices)) {
        entry.devices.forEach(device => {
          items.push({
            ...device,
            hostId: device.hostId || entry.hostId || hostId,
            siteId: device.siteId || entry.siteId || null
          });
        });
      } else if (entry?.mac || entry?.id || entry?.name) {
        items.push(entry);
      }
    });
    nextToken = payload?.nextToken || payload?.next_token || null;
  } while (nextToken);
  return items;
}

export async function listNetworkSitesViaConnector({ networkApiKey, hostId }) {
  if (!networkApiKey || !hostId) return [];
  const path = `/v1/connector/consoles/${encodeURIComponent(hostId)}/proxy/network/integration/v1/sites`;
  try {
    const items = [];
    let offset = 0;
    const limit = 100;
    for (;;) {
      const payload = await fetchUiApi(path, {
        apiKey: networkApiKey,
        query: { offset, limit }
      });
      const page = extractUiList(payload);
      items.push(...page);
      const total = Number(payload?.totalCount ?? payload?.total ?? NaN);
      offset += page.length;
      if (!page.length || (Number.isFinite(total) && offset >= total) || page.length < limit) break;
    }
    return items.map(raw => ({
      id: raw.id || raw.siteId || raw.site_id || null,
      name: raw.name || raw.meta?.desc || raw.meta?.name || raw.siteName || raw.id || null,
      raw
    })).filter(site => site.id);
  } catch (err) {
    if (err.status === 404 || err.status === 501) return [];
    throw err;
  }
}

function normalizeSiteLabel(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Site Manager site IDs and Network Integration site IDs can differ.
 * Resolve the Network site UUID for a linked Site Manager site.
 */
export async function resolveNetworkSiteId({
  networkApiKey,
  hostId,
  siteId,
  siteName = null
}) {
  if (!networkApiKey || !hostId || !siteId) return null;
  const networkSites = await listNetworkSitesViaConnector({ networkApiKey, hostId });
  if (!networkSites.length) return null;

  const byId = networkSites.find(site => String(site.id) === String(siteId));
  if (byId) return byId.id;

  const targetNames = [siteName]
    .filter(Boolean)
    .map(normalizeSiteLabel);
  if (targetNames.length) {
    const byName = networkSites.find(site => targetNames.includes(normalizeSiteLabel(site.name)));
    if (byName) return byName.id;
  }

  // Single-site console: safe to use the only Network site.
  if (networkSites.length === 1) return networkSites[0].id;
  return null;
}

export async function fetchNetworkDevicesViaConnector({ networkApiKey, hostId, siteId }) {
  if (!networkApiKey || !hostId || !siteId) return [];
  const path = `/v1/connector/consoles/${encodeURIComponent(hostId)}/proxy/network/integration/v1/sites/${encodeURIComponent(siteId)}/devices`;
  try {
    const items = [];
    let offset = 0;
    const limit = 200;
    for (;;) {
      const payload = await fetchUiApi(path, {
        apiKey: networkApiKey,
        query: { offset, limit }
      });
      const page = extractUiList(payload);
      items.push(...page);
      const total = Number(payload?.totalCount ?? payload?.total ?? NaN);
      offset += page.length;
      if (!page.length || (Number.isFinite(total) && offset >= total) || page.length < limit) break;
    }
    return items;
  } catch (err) {
    if (err.status === 404 || err.status === 501) return [];
    throw err;
  }
}

export function extractDeviceSiteId(device = {}) {
  return (
    device.siteId ||
    device.site_id ||
    device.site?.siteId ||
    device.site?.id ||
    device.site?.site_id ||
    (Array.isArray(device.sites) ? device.sites[0]?.siteId || device.sites[0]?.id : null) ||
    null
  );
}

export async function listCarrierSubscribers(apiKey) {
  const payload = await fetchUiApi("/v1/carrier/subscribers", {
    apiKey,
    query: {
      pageSize: 200
    }
  });
  return extractUiList(payload);
}
