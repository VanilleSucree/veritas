import express from "express";
import verifyJWT from "../../../middleware/auth.js";
import {
  UI_API_BASE,
  fetchUiApi,
  extractUiList,
  listCarrierSubscribers
} from "./utils.js";

const router = express.Router();

const API_ENDPOINTS = {
  "site-manager": "/v1/hosts",
  network: "/v1/hosts",
  "carrier-fabric": "/v1/carrier/subscribers"
};

router.post("/test", verifyJWT, async (req, res) => {
  try {
    const api = String(req.body?.api || "site-manager").trim().toLowerCase();
    const apiKey = String(
      req.body?.apiKey ||
        req.body?.UNIFI_SITE_MANAGER_API_KEY ||
        req.body?.UNIFI_NETWORK_API_KEY ||
        req.body?.UNIFI_CARRIER_FABRIC_API_KEY ||
        req.body?.UNIFI_API_KEY ||
        ""
    ).trim();

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: "API key required"
      });
    }

    if (!API_ENDPOINTS[api]) {
      return res.status(400).json({
        success: false,
        error: "Unknown UniFi API. Use site-manager, network or carrier-fabric."
      });
    }

    if (api === "carrier-fabric") {
      const subscribers = await listCarrierSubscribers(apiKey);
      return res.json({
        success: true,
        message: "Carrier Fabric connection successful",
        api,
        baseUrl: UI_API_BASE,
        subscribersCount: subscribers.length
      });
    }

    const payload = await fetchUiApi(API_ENDPOINTS[api], {
      apiKey,
      query: { pageSize: 25 }
    });
    const hosts = extractUiList(payload);
    let sitesCount = null;
    try {
      const sitesPayload = await fetchUiApi("/v1/sites", {
        apiKey,
        query: { pageSize: 1 }
      });
      const sites = extractUiList(sitesPayload);
      sitesCount = typeof sitesPayload?.totalCount === "number" ? sitesPayload.totalCount : sites.length;
    } catch {
      sitesCount = null;
    }

    return res.json({
      success: true,
      message:
        api === "network"
          ? "Network API key accepted (Site Manager hosts reachable)"
          : "Site Manager connection successful",
      api,
      baseUrl: UI_API_BASE,
      hostsCount: typeof payload?.totalCount === "number" ? payload.totalCount : hosts.length,
      sitesCount
    });
  } catch (err) {
    const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
    return res.status(status === 401 || status === 403 ? 400 : status >= 500 ? 500 : 400).json({
      success: false,
      error: err.message || "UniFi connection failed",
      details: err.details && typeof err.details === "object" ? JSON.stringify(err.details).slice(0, 500) : null
    });
  }
});

export default router;
