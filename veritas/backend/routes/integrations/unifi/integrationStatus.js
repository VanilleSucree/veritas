import express from "express";
import verifyJWT from "../../../middleware/auth.js";
import { getUnifiConfigStatus, isUnifiIntegrationEnabled } from "../../../utils/unifiIntegrationStatus.js";
import { getUnifiApiKeys, fetchUiApi } from "./utils.js";

const router = express.Router();

router.get("/status", verifyJWT, async (_req, res) => {
  try {
    const status = await getUnifiConfigStatus();
    let pingOk = false;
    let hostsCount = null;
    if (status.keys.siteManager) {
      try {
        const keys = await getUnifiApiKeys();
        const payload = await fetchUiApi("/v1/hosts", {
          apiKey: keys.siteManager,
          query: { pageSize: 1 }
        });
        pingOk = true;
        const list = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.hosts)
            ? payload.hosts
            : Array.isArray(payload)
              ? payload
              : [];
        hostsCount = typeof payload?.totalCount === "number" ? payload.totalCount : list.length;
      } catch {
        pingOk = false;
      }
    }
    return res.json({
      success: true,
      ...status,
      enabled: await isUnifiIntegrationEnabled(),
      pingOk,
      hostsCount
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

export default router;
