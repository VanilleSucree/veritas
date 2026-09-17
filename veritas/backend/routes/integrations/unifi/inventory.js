import express from "express";
import verifyJWT from "../../../middleware/auth.js";
import { isUnifiIntegrationEnabled } from "../../../utils/unifiIntegrationStatus.js";
import {
  getUnifiApiKeys,
  listAllHosts,
  listAllSites,
  listDevicesForHost,
  listCarrierSubscribers,
  normalizeUnifiDevice,
  fetchNetworkDevicesViaConnector,
  resolveNetworkSiteId,
  extractDeviceSiteId,
  extractUiList,
  fetchUiApi
} from "./utils.js";

const router = express.Router();

async function requireEnabled(res) {
  const enabled = await isUnifiIntegrationEnabled();
  if (!enabled) {
    res.status(400).json({
      success: false,
      error: "UniFi integration is disabled or not configured"
    });
    return false;
  }
  return true;
}

function mapHost(raw = {}) {
  return {
    id: raw.id || raw.hostId || raw.host_id,
    name: raw.reportedState?.hostname || raw.hostname || raw.name || raw.id,
    model: raw.reportedState?.hardware?.model || raw.model || raw.hardware?.model || "",
    ip: raw.reportedState?.ipAddrs?.[0] || raw.ipAddress || raw.ip || "",
    isOnline: raw.reportedState?.deviceState === "ONLINE" || raw.isOnline === true || raw.status === "online",
    raw
  };
}

function mapSite(raw = {}) {
  const meta = raw.meta || raw.siteMeta || {};
  return {
    id: raw.siteId || raw.id || raw.site_id,
    hostId: raw.hostId || raw.host_id || meta.hostId || null,
    name: raw.meta?.desc || raw.meta?.name || raw.name || raw.siteName || raw.siteId || raw.id,
    hostName: raw.hostName || raw.hostname || null,
    raw
  };
}

router.get("/hosts", verifyJWT, async (_req, res) => {
  try {
    if (!(await requireEnabled(res))) return;
    const keys = await getUnifiApiKeys();
    if (!keys.siteManager) {
      return res.status(400).json({ success: false, error: "Site Manager API key missing" });
    }
    const hosts = (await listAllHosts(keys.siteManager)).map(mapHost);
    return res.json({ success: true, hosts });
  } catch (err) {
    return res.status(err.status && err.status < 500 ? err.status : 500).json({
      success: false,
      error: err.message
    });
  }
});

router.get("/sites", verifyJWT, async (req, res) => {
  try {
    if (!(await requireEnabled(res))) return;
    const keys = await getUnifiApiKeys();
    if (!keys.siteManager) {
      return res.status(400).json({ success: false, error: "Site Manager API key missing" });
    }
    const hostId = String(req.query.hostId || "").trim();
    let sites = (await listAllSites(keys.siteManager)).map(mapSite);
    if (hostId) {
      sites = sites.filter(site => String(site.hostId || "") === hostId);
    }
    return res.json({ success: true, sites });
  } catch (err) {
    return res.status(err.status && err.status < 500 ? err.status : 500).json({
      success: false,
      error: err.message
    });
  }
});

router.get("/devices", verifyJWT, async (req, res) => {
  try {
    if (!(await requireEnabled(res))) return;
    const hostId = String(req.query.hostId || "").trim();
    const siteId = String(req.query.siteId || "").trim();
    const siteName = String(req.query.siteName || "").trim();
    if (!hostId) {
      return res.status(400).json({ success: false, error: "hostId is required" });
    }
    const keys = await getUnifiApiKeys();
    if (!keys.siteManager) {
      return res.status(400).json({ success: false, error: "Site Manager API key missing" });
    }

    let devices = [];
    let resolvedSiteId = siteId || null;
    let source = "site-manager";
    let warning = null;

    // Prefer Network Integration (site-scoped) when a site is requested.
    // Site Manager /devices is host-wide and has no per-device siteId.
    if (siteId && keys.network) {
      try {
        const resolved = await resolveNetworkSiteId({
          networkApiKey: keys.network,
          hostId,
          siteId,
          siteName: siteName || null,
          siteManagerApiKey: keys.siteManager
        });

        const candidates = [...new Set([resolved, siteId].filter(Boolean))];
        for (const candidate of candidates) {
          const networkDevices = await fetchNetworkDevicesViaConnector({
            networkApiKey: keys.network,
            hostId,
            siteId: candidate
          });
          if (networkDevices.length) {
            resolvedSiteId = candidate;
            source = "network";
            devices = networkDevices.map(device =>
              normalizeUnifiDevice(device, { hostId, siteId: candidate })
            );
            break;
          }
        }
      } catch (err) {
        console.warn("[unifi] Network site devices fallback to Site Manager:", err.message);
      }
    }

    if (source !== "network" || devices.length === 0) {
      let rawDevices = await listDevicesForHost(keys.siteManager, hostId);

      if (rawDevices.length === 0) {
        try {
          const hostPayload = await fetchUiApi(`/v1/hosts/${encodeURIComponent(hostId)}`, {
            apiKey: keys.siteManager
          });
          const nested =
            extractUiList(hostPayload?.devices) ||
            extractUiList(hostPayload?.data?.devices) ||
            extractUiList(hostPayload);
          if (Array.isArray(nested) && nested.length && (nested[0]?.mac || nested[0]?.id)) {
            rawDevices = nested;
          }
        } catch {
          /* ignore */
        }
      }

      if (siteId) {
        const matchedBySite = rawDevices.filter(device => {
          const deviceSite = extractDeviceSiteId(device);
          return deviceSite && String(deviceSite) === String(siteId);
        });

        if (matchedBySite.length) {
          rawDevices = matchedBySite;
        } else {
          // Site Manager devices usually have no siteId. Scope by host site count.
          let sitesOnHost = [];
          try {
            sitesOnHost = (await listAllSites(keys.siteManager)).filter(site => {
              const siteHost = site.hostId || site.host_id || site.meta?.hostId || null;
              return String(siteHost || "") === String(hostId);
            });
          } catch {
            sitesOnHost = [];
          }

          if (sitesOnHost.length > 1) {
            warning =
              "Les devices UniFi n’ont pas pu être filtrés précisément par site (API Network indisponible ou site non résolu). Affichage de tous les devices de la console.";
          }
          // Keep all host devices — empty list is worse than host-wide for single-site consoles.
        }
      }

      source = "site-manager";
      devices = rawDevices.map(device =>
        normalizeUnifiDevice(device, { hostId, siteId: resolvedSiteId })
      );
    }

    const switches = devices.filter(d => d.category === "switch");
    const accessPoints = devices.filter(d => d.category === "ap");
    const gateways = devices.filter(d => d.category === "gateway" || d.category === "router");

    return res.json({
      success: true,
      hostId,
      siteId: resolvedSiteId,
      source,
      warning,
      devices,
      switches,
      accessPoints,
      gateways,
      count: devices.length
    });
  } catch (err) {
    return res.status(err.status && err.status < 500 ? err.status : 500).json({
      success: false,
      error: err.message
    });
  }
});

router.get("/devices/:deviceId/details", verifyJWT, async (req, res) => {
  try {
    if (!(await requireEnabled(res))) return;
    const hostId = String(req.query.hostId || "").trim();
    const siteId = String(req.query.siteId || "").trim();
    const deviceId = String(req.params.deviceId || "").trim();
    if (!hostId || !siteId || !deviceId) {
      return res.status(400).json({
        success: false,
        error: "hostId, siteId and deviceId are required"
      });
    }
    const keys = await getUnifiApiKeys();
    if (!keys.network) {
      return res.status(400).json({
        success: false,
        error: "Network API key missing"
      });
    }
    const path = `/v1/connector/consoles/${encodeURIComponent(hostId)}/proxy/network/integration/v1/sites/${encodeURIComponent(siteId)}/devices/${encodeURIComponent(deviceId)}`;
    const payload = await fetchUiApi(path, { apiKey: keys.network });
    const raw = payload?.data || payload;
    return res.json({
      success: true,
      device: normalizeUnifiDevice(raw, { hostId, siteId })
    });
  } catch (err) {
    return res.status(err.status && err.status < 500 ? err.status : 500).json({
      success: false,
      error: err.message
    });
  }
});

router.get("/carrier/subscribers", verifyJWT, async (_req, res) => {
  try {
    if (!(await requireEnabled(res))) return;
    const keys = await getUnifiApiKeys();
    if (!keys.carrierFabric) {
      return res.status(400).json({
        success: false,
        error: "Carrier Fabric API key missing"
      });
    }
    const subscribers = (await listCarrierSubscribers(keys.carrierFabric)).map(raw => ({
      id: raw.id || raw.subscriberId,
      name: raw.name || raw.displayName || raw.id,
      status: raw.status || raw.serviceState || "",
      hostId: raw.hostId || raw.host?.id || null,
      raw
    }));
    return res.json({ success: true, subscribers });
  } catch (err) {
    return res.status(err.status && err.status < 500 ? err.status : 500).json({
      success: false,
      error: err.message
    });
  }
});

export default router;
