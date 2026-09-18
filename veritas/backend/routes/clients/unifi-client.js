import express from "express";
import { pool } from "../../database/db.js";
import verifyJWT from "../../middleware/auth.js";
import { encrypt, decrypt } from "../../utils/encryption.js";
import { getUnifiConfigStatus } from "../../utils/unifiIntegrationStatus.js";
import { ensureIntegrationTenantsSchema } from "../../services/ensureIntegrationTenantsSchema.js";
import {
  fetchLocalNetworkDevices,
  testLocalNetworkConnection
} from "../integrations/unifi/utils.js";

const router = express.Router();
router.use(verifyJWT);

function normalizeHost(host) {
  let value = String(host || "").trim();
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  return value.replace(/\/+$/, "");
}

function mapRow(row) {
  if (!row) return null;
  const mode = String(row.mapping_mode || "global").toLowerCase() === "dedicated" ? "dedicated" : "global";
  const hasDedicated = Boolean(row.dedicated_api_url && row.dedicated_api_key_encrypted);
  return {
    id: row.id,
    clientId: row.client_id,
    mappingMode: mode,
    hostId: row.host_id || null,
    hostName: row.host_name || null,
    siteId: row.site_id || null,
    siteName: row.site_name || null,
    subscriberId: row.subscriber_id || null,
    subscriberName: row.subscriber_name || null,
    linked:
      mode === "dedicated"
        ? hasDedicated
        : Boolean(row.host_id && row.site_id),
    dedicated: hasDedicated
      ? {
          label: row.dedicated_label || null,
          apiUrl: row.dedicated_api_url || null,
          networkSite: row.dedicated_network_site || "default",
          rejectUnauthorized: row.dedicated_reject_unauthorized === true,
          hasApiKey: true
        }
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function ensureDedicatedColumns() {
  await ensureIntegrationTenantsSchema();
}

router.get("/global-status", async (_req, res) => {
  try {
    const status = await getUnifiConfigStatus();
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/test-dedicated", async (req, res) => {
  try {
    const { apiUrl, apiKey, rejectUnauthorized = false } = req.body || {};
    const result = await testLocalNetworkConnection({
      apiUrl,
      apiKey,
      rejectUnauthorized
    });
    res.json({
      success: true,
      message: "UniFi Network API connection successful",
      controller: result
    });
  } catch (err) {
    res.status(err.status && err.status < 500 ? err.status : 500).json({
      success: false,
      error: err.message,
      details: err.details || null
    });
  }
});

router.get("/:clientId/devices", async (req, res) => {
  try {
    await ensureDedicatedColumns();
    const clientId = Number(req.params.clientId);
    if (!Number.isFinite(clientId)) {
      return res.status(400).json({ success: false, error: "Invalid client id" });
    }
    const result = await pool.query(`SELECT * FROM v_b_clients_unifi WHERE client_id = $1 LIMIT 1`, [
      clientId
    ]);
    const row = result.rows[0];
    if (!row) {
      return res.status(400).json({ success: false, error: "No UniFi configuration for this client" });
    }
    const mode = String(row.mapping_mode || "global").toLowerCase();
    if (mode !== "dedicated") {
      return res.status(400).json({
        success: false,
        error: "Client is linked to global Site Manager — use /api/unifi/devices"
      });
    }
    if (!row.dedicated_api_url || !row.dedicated_api_key_encrypted) {
      return res.status(400).json({ success: false, error: "Dedicated Network API credentials missing" });
    }
    const apiKey = decrypt(
      row.dedicated_api_key_encrypted,
      row.dedicated_iv,
      row.dedicated_auth_tag
    );
    if (!apiKey) {
      return res.status(500).json({ success: false, error: "Unable to decrypt dedicated API key" });
    }
    const devices = await fetchLocalNetworkDevices({
      apiUrl: row.dedicated_api_url,
      apiKey,
      siteId: row.dedicated_network_site || "default",
      rejectUnauthorized: row.dedicated_reject_unauthorized === true
    });
    const switches = devices.filter(d => d.category === "switch");
    const accessPoints = devices.filter(d => d.category === "ap");
    const gateways = devices.filter(d => d.category === "gateway" || d.category === "router");
    res.json({
      success: true,
      source: "dedicated",
      mappingMode: "dedicated",
      siteName: row.dedicated_network_site || "default",
      devices,
      switches,
      accessPoints,
      gateways
    });
  } catch (err) {
    res.status(err.status && err.status < 500 ? err.status : 500).json({
      success: false,
      error: err.message,
      details: err.details || null
    });
  }
});

router.get("/:clientId", async (req, res) => {
  try {
    await ensureDedicatedColumns();
    const clientId = Number(req.params.clientId);
    if (!Number.isFinite(clientId)) {
      return res.status(400).json({ success: false, error: "Invalid client id" });
    }
    const result = await pool.query(`SELECT * FROM v_b_clients_unifi WHERE client_id = $1 LIMIT 1`, [
      clientId
    ]);
    res.json({
      success: true,
      link: mapRow(result.rows[0]) || {
        clientId,
        mappingMode: "global",
        hostId: null,
        hostName: null,
        siteId: null,
        siteName: null,
        subscriberId: null,
        subscriberName: null,
        linked: false,
        dedicated: null
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/:clientId", async (req, res) => {
  try {
    await ensureDedicatedColumns();
    const clientId = Number(req.params.clientId);
    if (!Number.isFinite(clientId)) {
      return res.status(400).json({ success: false, error: "Invalid client id" });
    }
    const body = req.body || {};
    const mappingMode =
      String(body.mappingMode || body.mode || "global").toLowerCase() === "dedicated"
        ? "dedicated"
        : "global";

    if (mappingMode === "dedicated") {
      const apiUrl = normalizeHost(body.apiUrl || body.dedicatedApiUrl);
      const apiKey = String(body.apiKey || body.dedicatedApiKey || "").trim();
      const rejectUnauthorized = Boolean(body.rejectUnauthorized);
      const networkSite = String(body.networkSite || body.siteId || "default").trim() || "default";
      const label = body.label != null ? String(body.label).trim() || null : null;

      const existing = await pool.query(`SELECT * FROM v_b_clients_unifi WHERE client_id = $1 LIMIT 1`, [
        clientId
      ]);
      const prev = existing.rows[0];
      let encrypted = null;
      if (apiKey) {
        await testLocalNetworkConnection({ apiUrl, apiKey, rejectUnauthorized });
        encrypted = encrypt(apiKey);
        if (!encrypted) {
          return res.status(500).json({ success: false, error: "Encryption error" });
        }
      } else if (prev?.dedicated_api_key_encrypted) {
        encrypted = {
          encrypted: prev.dedicated_api_key_encrypted,
          iv: prev.dedicated_iv,
          authTag: prev.dedicated_auth_tag
        };
        if (apiUrl) {
          const existingKey = decrypt(prev.dedicated_api_key_encrypted, prev.dedicated_iv, prev.dedicated_auth_tag);
          if (existingKey) {
            await testLocalNetworkConnection({
              apiUrl,
              apiKey: existingKey,
              rejectUnauthorized
            });
          }
        }
      } else {
        return res.status(400).json({
          success: false,
          error: "Controller URL and Network API key are required for dedicated mode"
        });
      }
      if (!apiUrl && !prev?.dedicated_api_url) {
        return res.status(400).json({ success: false, error: "Controller URL is required" });
      }

      const result = await pool.query(
        `INSERT INTO v_b_clients_unifi (
           client_id, mapping_mode, host_id, host_name, site_id, site_name, subscriber_id, subscriber_name,
           dedicated_label, dedicated_api_url, dedicated_api_key_encrypted, dedicated_iv, dedicated_auth_tag,
           dedicated_reject_unauthorized, dedicated_network_site, updated_at
         ) VALUES ($1,'dedicated',NULL,NULL,NULL,NULL,NULL,NULL,$2,$3,$4,$5,$6,$7,$8,CURRENT_TIMESTAMP)
         ON CONFLICT (client_id) DO UPDATE SET
           mapping_mode = 'dedicated',
           host_id = NULL, host_name = NULL, site_id = NULL, site_name = NULL,
           subscriber_id = NULL, subscriber_name = NULL,
           dedicated_label = EXCLUDED.dedicated_label,
           dedicated_api_url = EXCLUDED.dedicated_api_url,
           dedicated_api_key_encrypted = EXCLUDED.dedicated_api_key_encrypted,
           dedicated_iv = EXCLUDED.dedicated_iv,
           dedicated_auth_tag = EXCLUDED.dedicated_auth_tag,
           dedicated_reject_unauthorized = EXCLUDED.dedicated_reject_unauthorized,
           dedicated_network_site = EXCLUDED.dedicated_network_site,
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [
          clientId,
          label,
          apiUrl || prev.dedicated_api_url,
          encrypted.encrypted,
          encrypted.iv,
          encrypted.authTag,
          rejectUnauthorized,
          networkSite
        ]
      );
      return res.json({ success: true, link: mapRow(result.rows[0]) });
    }

    // Global Site Manager link
    const hostId = body.hostId != null ? String(body.hostId).trim() || null : null;
    const siteId = body.siteId != null ? String(body.siteId).trim() || null : null;
    const hostName = body.hostName != null ? String(body.hostName).trim() || null : null;
    const siteName = body.siteName != null ? String(body.siteName).trim() || null : null;
    const subscriberId = body.subscriberId != null ? String(body.subscriberId).trim() || null : null;
    const subscriberName = body.subscriberName != null ? String(body.subscriberName).trim() || null : null;

    if ((hostId && !siteId) || (!hostId && siteId)) {
      return res.status(400).json({
        success: false,
        error: "hostId and siteId must be provided together"
      });
    }

    const result = await pool.query(
      `INSERT INTO v_b_clients_unifi (
         client_id, mapping_mode, host_id, host_name, site_id, site_name, subscriber_id, subscriber_name, updated_at
       ) VALUES ($1, 'global', $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       ON CONFLICT (client_id) DO UPDATE SET
         mapping_mode = 'global',
         host_id = EXCLUDED.host_id,
         host_name = EXCLUDED.host_name,
         site_id = EXCLUDED.site_id,
         site_name = EXCLUDED.site_name,
         subscriber_id = EXCLUDED.subscriber_id,
         subscriber_name = EXCLUDED.subscriber_name,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [clientId, hostId, hostName, siteId, siteName, subscriberId, subscriberName]
    );

    res.json({ success: true, link: mapRow(result.rows[0]) });
  } catch (err) {
    res.status(err.status && err.status < 500 ? err.status : 500).json({
      success: false,
      error: err.message,
      details: err.details || null
    });
  }
});

router.delete("/:clientId", async (req, res) => {
  try {
    const clientId = Number(req.params.clientId);
    if (!Number.isFinite(clientId)) {
      return res.status(400).json({ success: false, error: "Invalid client id" });
    }
    await pool.query(`DELETE FROM v_b_clients_unifi WHERE client_id = $1`, [clientId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
