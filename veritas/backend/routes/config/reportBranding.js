import express from "express";
import { pool, isDatabaseConfigured } from "../../database/db.js";
import verifyJWT from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/permissions.js";
import { requirePro } from "../../middleware/edition.js";
import { decryptSetting } from "../../utils/settingsHelper.js";
import {
  DEFAULT_REPORT_BRANDING,
  REPORT_BRANDING_KEYS,
  REPORT_BRANDING_LABELS,
  REPORT_BRANDING_SECTION,
  REPORT_FONT_SANS_PRESETS,
  REPORT_FONT_SERIF_PRESETS,
  loadReportBranding,
  normalizeReportBranding,
  toPublicReportBranding
} from "../../utils/reportBranding.js";
import { GENERAL_SETTING_KEYS } from "../../utils/generalSettings.js";

const router = express.Router();

async function readRawReportBranding() {
  if (!isDatabaseConfigured()) {
    return { ...DEFAULT_REPORT_BRANDING };
  }
  try {
    const result = await pool.query(
      `SELECT key, value, value_encrypted, value_iv, value_auth_tag
       FROM v_b_settings
       WHERE section = $1 OR key = ANY($2::text[])`,
      [
        REPORT_BRANDING_SECTION,
        [
          ...Object.values(REPORT_BRANDING_KEYS),
          GENERAL_SETTING_KEYS.organizationName,
          GENERAL_SETTING_KEYS.supportEmail,
          GENERAL_SETTING_KEYS.supportPhone,
          GENERAL_SETTING_KEYS.organizationWebsite,
          GENERAL_SETTING_KEYS.organizationAddress
        ]
      ]
    );
    const fromDb = {};
    for (const row of result.rows) {
      fromDb[row.key] = decryptSetting(row) ?? "";
    }
    return fromDb;
  } catch (err) {
    if (err?.code === "DATABASE_NOT_CONFIGURED" || err?.code === "42P01") {
      return { ...DEFAULT_REPORT_BRANDING };
    }
    throw err;
  }
}

async function upsertReportSetting(client, key, value) {
  await client.query(
    `INSERT INTO v_b_settings (key, value, label, section)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (key) DO UPDATE SET
       value = EXCLUDED.value,
       label = EXCLUDED.label,
       section = EXCLUDED.section`,
    [key, String(value ?? ""), REPORT_BRANDING_LABELS[key] || key, REPORT_BRANDING_SECTION]
  );
}

/** Any authenticated agent can read branding (needed for HTML export). */
router.get("/", verifyJWT, async (_req, res) => {
  try {
    const branding = await loadReportBranding();
    res.json({ success: true, branding });
  } catch (err) {
    console.error("GET /report-branding", err);
    res.status(500).json({ success: false, error: "Unable to load report branding." });
  }
});

/** Admin form: raw settings + resolved preview */
router.get("/admin", verifyJWT, requirePermission("admin_panel.reports"), requirePro, async (_req, res) => {
  try {
    const fromDb = await readRawReportBranding();
    const raw = normalizeReportBranding({ ...DEFAULT_REPORT_BRANDING, ...fromDb });
    const branding = toPublicReportBranding(raw, fromDb);
    res.json({
      success: true,
      settings: raw,
      branding,
      fontPresets: {
        sans: Object.values(REPORT_FONT_SANS_PRESETS).map(({ id, label }) => ({ id, label })),
        serif: Object.values(REPORT_FONT_SERIF_PRESETS).map(({ id, label }) => ({ id, label }))
      },
      defaults: DEFAULT_REPORT_BRANDING
    });
  } catch (err) {
    console.error("GET /report-branding/admin", err);
    res.status(500).json({ success: false, error: "Unable to load report branding." });
  }
});

router.patch("/", verifyJWT, requirePermission("admin_panel.reports"), requirePro, async (req, res) => {
  const fromDb = await readRawReportBranding();
  const normalized = normalizeReportBranding({
    ...DEFAULT_REPORT_BRANDING,
    ...fromDb,
    ...(req.body || {})
  });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const [key, value] of Object.entries(normalized)) {
      await upsertReportSetting(client, key, value);
    }
    await client.query("COMMIT");
    const branding = toPublicReportBranding(normalized, fromDb);
    res.json({ success: true, settings: normalized, branding });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("PATCH /report-branding", err);
    res.status(500).json({ success: false, error: "Unable to save report branding." });
  } finally {
    client.release();
  }
});

export default router;
