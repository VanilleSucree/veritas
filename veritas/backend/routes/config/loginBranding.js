import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";
import verifyJWT from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/permissions.js";
import { requirePro } from "../../middleware/edition.js";
import { pool, isDatabaseConfigured } from "../../database/db.js";
import { decryptSetting } from "../../utils/settingsHelper.js";
import { isPro } from "../../utils/edition.js";
import { DEFAULT_LOGIN_BRANDING, LOGIN_BRANDING_LABELS, LOGIN_BRANDING_SECTION, LOGIN_SIDES, buildPublicLoginBranding, normalizeLoginBrandingFlat } from "../../utils/loginBranding.js";
const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const LOGIN_BRANDING_UPLOAD_ROOT = path.join(__dirname, "..", "..", "uploads", "login-branding");
fs.mkdirSync(LOGIN_BRANDING_UPLOAD_ROOT, {
  recursive: true
});
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);
const ALLOWED_IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
function resolveImageExt(file) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (ALLOWED_IMAGE_EXTS.has(ext)) return ext === ".jpeg" ? ".jpg" : ext;
  if (file.mimetype === "image/png") return ".png";
  if (file.mimetype === "image/webp") return ".webp";
  if (file.mimetype === "image/jpeg" || file.mimetype === "image/jpg") return ".jpg";
  return ".png";
}
function isAllowedImage(file) {
  const mime = String(file.mimetype || "").toLowerCase();
  if (ALLOWED_IMAGE_TYPES.has(mime)) return true;
  // Some browsers/OS send octet-stream or an empty MIME — fall back to extension.
  if (!mime || mime === "application/octet-stream") {
    return ALLOWED_IMAGE_EXTS.has(path.extname(file.originalname || "").toLowerCase());
  }
  return false;
}
const ASSET_KINDS = {
  logo: {
    filePrefix: "logo",
    keySuffix: "logo_path"
  },
  background: {
    filePrefix: "bg",
    keySuffix: "bg_image_path"
  },
  "right-background": {
    filePrefix: "right-bg",
    keySuffix: "right_bg_image_path"
  }
};
function resolveAssetKind(kind) {
  return ASSET_KINDS[String(kind || "")] || null;
}
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, LOGIN_BRANDING_UPLOAD_ROOT),
    filename: (req, file, cb) => {
      const side = LOGIN_SIDES.includes(req.params.side) ? req.params.side : "agent";
      const asset = resolveAssetKind(req.params.kind);
      const prefix = asset?.filePrefix || "logo";
      cb(null, `${side}-${prefix}-${Date.now()}${resolveImageExt(file)}`);
    }
  }),
  limits: {
    fileSize: MAX_UPLOAD_BYTES
  },
  fileFilter: (_req, file, cb) => {
    if (!isAllowedImage(file)) {
      return cb(new Error("Unsupported image format. Use PNG, JPG or WebP."));
    }
    return cb(null, true);
  }
});
async function readLoginBrandingFromDb() {
  if (!isDatabaseConfigured()) {
    return normalizeLoginBrandingFlat(DEFAULT_LOGIN_BRANDING);
  }
  try {
    const tableCheck = await pool.query("SELECT to_regclass('public.v_b_settings') AS settings_table");
    if (!tableCheck.rows[0]?.settings_table) {
      return normalizeLoginBrandingFlat(DEFAULT_LOGIN_BRANDING);
    }
    const result = await pool.query(`SELECT key, value, value_encrypted, value_iv, value_auth_tag
       FROM v_b_settings
       WHERE section = $1`, [LOGIN_BRANDING_SECTION]);
    const fromDb = {};
    for (const row of result.rows) {
      fromDb[row.key] = decryptSetting(row) ?? "";
    }
    return normalizeLoginBrandingFlat({
      ...DEFAULT_LOGIN_BRANDING,
      ...fromDb
    });
  } catch (err) {
    if (err?.code === "DATABASE_NOT_CONFIGURED" || err?.code === "42P01") {
      return normalizeLoginBrandingFlat(DEFAULT_LOGIN_BRANDING);
    }
    throw err;
  }
}
async function upsertLoginBrandingSetting(client, key, value) {
  await client.query(`INSERT INTO v_b_settings (key, value, label, section)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (key) DO UPDATE SET
       value = EXCLUDED.value,
       label = EXCLUDED.label,
       section = EXCLUDED.section`, [key, String(value ?? ""), LOGIN_BRANDING_LABELS[key] || key, LOGIN_BRANDING_SECTION]);
}
router.get("/", async (_req, res) => {
  try {
    const flat = await readLoginBrandingFromDb();
    res.json(buildPublicLoginBranding(flat, {
      pro: isPro()
    }));
  } catch (err) {
    console.error("GET /login-branding", err);
    res.status(500).json({
      error: "Unable to load login customization."
    });
  }
});
router.get("/admin", verifyJWT, requirePermission("admin_panel.login_branding"), requirePro, async (_req, res) => {
  try {
    const settings = await readLoginBrandingFromDb();
    res.json({
      settings
    });
  } catch (err) {
    console.error("GET /login-branding/admin", err);
    res.status(500).json({
      error: "Unable to load login customization."
    });
  }
});
router.patch("/", verifyJWT, requirePermission("admin_panel.login_branding"), requirePro, async (req, res) => {
  const existing = await readLoginBrandingFromDb();
  const normalized = normalizeLoginBrandingFlat({
    ...existing,
    ...req.body
  });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const [key, value] of Object.entries(normalized)) {
      await upsertLoginBrandingSetting(client, key, value);
    }
    await client.query("COMMIT");
    res.json({
      success: true,
      settings: normalized
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("PATCH /login-branding", err);
    res.status(500).json({
      error: "Unable to save login customization."
    });
  } finally {
    client.release();
  }
});
router.post("/:side/:kind", verifyJWT, requirePermission("admin_panel.login_branding"), requirePro, (req, res) => {
  upload.single("file")(req, res, async err => {
    if (err) {
      let message = err.message || "Error during upload.";
      if (err.code === "LIMIT_FILE_SIZE") {
        message = "File too large (max 8 MB).";
      }
      return res.status(400).json({
        error: message
      });
    }
    if (!req.file) {
      return res.status(400).json({
        error: "File required."
      });
    }
    const side = String(req.params.side || "");
    const asset = resolveAssetKind(req.params.kind);
    if (!LOGIN_SIDES.includes(side) || !asset) {
      return res.status(400).json({
        error: "Invalid parameters."
      });
    }
    const relativePath = `/uploads/login-branding/${req.file.filename}`;
    const key = `app_login_${side}_${asset.keySuffix}`;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await upsertLoginBrandingSetting(client, key, relativePath);
      await client.query("COMMIT");
      res.json({
        success: true,
        path: relativePath,
        key
      });
    } catch (uploadErr) {
      await client.query("ROLLBACK");
      console.error("POST /login-branding upload", uploadErr);
      res.status(500).json({
        error: "Error saving file"
      });
    } finally {
      client.release();
    }
  });
});
router.delete("/:side/:kind", verifyJWT, requirePermission("admin_panel.login_branding"), requirePro, async (req, res) => {
  const side = String(req.params.side || "");
  const asset = resolveAssetKind(req.params.kind);
  if (!LOGIN_SIDES.includes(side) || !asset) {
    return res.status(400).json({
      error: "Invalid parameters."
    });
  }
  const key = `app_login_${side}_${asset.keySuffix}`;
  const existing = await readLoginBrandingFromDb();
  const currentPath = existing[key];
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await upsertLoginBrandingSetting(client, key, "");
    await client.query("COMMIT");
    if (currentPath && currentPath.startsWith("/uploads/login-branding/")) {
      const diskPath = path.join(LOGIN_BRANDING_UPLOAD_ROOT, path.basename(currentPath));
      fs.unlink(diskPath, () => {});
    }
    res.json({
      success: true
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("DELETE /login-branding asset", err);
    res.status(500).json({
      error: "Unable to delete file."
    });
  } finally {
    client.release();
  }
});
export default router;
