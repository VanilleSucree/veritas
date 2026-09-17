import express from "express";
import { pool } from "../../database/db.js";
import verifyJWT from "../../middleware/auth.js";
import { getUnifiConfigStatus } from "../../utils/unifiIntegrationStatus.js";

const router = express.Router();
router.use(verifyJWT);

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    clientId: row.client_id,
    hostId: row.host_id || null,
    hostName: row.host_name || null,
    siteId: row.site_id || null,
    siteName: row.site_name || null,
    subscriberId: row.subscriber_id || null,
    subscriberName: row.subscriber_name || null,
    linked: Boolean(row.host_id && row.site_id),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

router.get("/global-status", async (_req, res) => {
  try {
    const status = await getUnifiConfigStatus();
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/:clientId", async (req, res) => {
  try {
    const clientId = Number(req.params.clientId);
    if (!Number.isFinite(clientId)) {
      return res.status(400).json({ success: false, error: "Invalid client id" });
    }
    const result = await pool.query(
      `SELECT * FROM v_b_clients_unifi WHERE client_id = $1 LIMIT 1`,
      [clientId]
    );
    res.json({
      success: true,
      link: mapRow(result.rows[0]) || {
        clientId,
        hostId: null,
        hostName: null,
        siteId: null,
        siteName: null,
        subscriberId: null,
        subscriberName: null,
        linked: false
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/:clientId", async (req, res) => {
  try {
    const clientId = Number(req.params.clientId);
    if (!Number.isFinite(clientId)) {
      return res.status(400).json({ success: false, error: "Invalid client id" });
    }
    const body = req.body || {};
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
         client_id, host_id, host_name, site_id, site_name, subscriber_id, subscriber_name, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       ON CONFLICT (client_id) DO UPDATE SET
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
    res.status(500).json({ success: false, error: err.message });
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
