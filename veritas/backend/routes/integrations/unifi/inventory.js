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
    if (!hostId) {
      return res.status(400).json({ success: false, error: "hostId is required" });
    }
    const keys = await getUnifiApiKeys();
    if (!keys.siteManager) {
      return res.status(400).json({ success: false, error: "Site Manager API key missing" });
    }

    let rawDevices = await listDevicesForHost(keys.siteManager, hostId);

    // Some Site Manager payloads nest devices under host entries
    if (rawDevices.length === 0) {
      try {
        const hostPayload = await fetchUiApi(`/v1/hosts/${encodeURIComponent(hostId)}`, {
          apiKey: keys.siteManager
        });
        const nested =
          extractUiList(hostPayload?.devices) ||
          extractUiList(hostPayload?.data?.devices) ||
          extractUiList(hostPayload);
        if (Array.isArray(nested) && nested.length && nested[0]?.mac) {
          rawDevices = nested;
        }
      } catch {
        /* ignore */
      }
    }

    if (siteId) {
      rawDevices = rawDevices.filter(device => {
        const deviceSite =
          device.siteId ||
          device.site_id ||
          device.site?.siteId ||
          device.site?.id ||
          null;
        if (!deviceSite) return true;
        return String(deviceSite) === siteId;
      });
    }

    let devices = rawDevices.map(device =>
      normalizeUnifiDevice(device, { hostId, siteId: siteId || null })
    );

    // Enrich / fallback via Network connector when available
    if (keys.network && siteId) {
      try {
        const networkDevices = await fetchNetworkDevicesViaConnector({
          networkApiKey: keys.network,
          hostId,
          siteId
        });
        if (networkDevices.length) {
          const byMac = new Map();
          devices.forEach(device => {
            if (device.macNormalized) byMac.set(device.macNormalized, device);
          });
          networkDevices.forEach(raw => {
            const normalized = normalizeUnifiDevice(raw, { hostId, siteId });
            if (normalized.macNormalized && byMac.has(normalized.macNormalized)) {
              const existing = byMac.get(normalized.macNormalized);
              byMac.set(normalized.macNormalized, {
                ...existing,
                ...normalized,
                name: normalized.name || existing.name,
                model: normalized.model || existing.model,
                ip: normalized.ip || existing.ip,
                version: normalized.version || existing.version,
                serial: normalized.serial || existing.serial
              });
            } else {
              byMac.set(normalized.macNormalized || normalized.id, normalized);
            }
          });
          devices = Array.from(byMac.values());
        }
      } catch (err) {
        console.warn("[unifi] Network connector enrichment skipped:", err.message);
      }
    }

    const switches = devices.filter(d => d.category === "switch");
    const accessPoints = devices.filter(d => d.category === "ap");
    const gateways = devices.filter(d => d.category === "gateway" || d.category === "router");

    return res.json({
      success: true,
      hostId,
      siteId: siteId || null,
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
