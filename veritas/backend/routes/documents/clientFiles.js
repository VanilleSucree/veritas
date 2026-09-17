import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { pool } from "../../database/db.js";
import verifyJWT from "../../middleware/auth.js";
import { requirePermission, requireAnyPermission } from "../../middleware/permissions.js";
import { resolveFileUploadedBy } from "../../utils/fileUploadedBy.js";
import { ensureVisibleToClientColumn, hasVisibleToClientColumn, parseVisibleToClient, visibilitySelectSql } from "../../utils/clientFilesVisibility.js";
import { notifyVaultDocumentShared } from "../../services/systemNotificationService.js";
import { allowAssetEmbedding } from "../../middleware/securityHeaders.js";
const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads", "client-files");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, {
    recursive: true
  });
}
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-zip",
  "multipart/x-zip"
]);
const ALLOWED_CATEGORIES = new Set(["Facture matériel", "Image client", "Baie de brassage", "Plan de réseau", "Procédure", "Contrat", "Rapport", "Autre"]);
const ZIP_EXTENSIONS = new Set([".zip"]);
function isAllowedUpload(file) {
  if (!file) return false;
  if (ALLOWED_MIME.has(file.mimetype)) return true;
  const ext = path.extname(file.originalname || "").toLowerCase();
  // Some browsers send empty / octet-stream for ZIP blobs.
  if (ZIP_EXTENSIONS.has(ext) && (!file.mimetype || file.mimetype === "application/octet-stream")) {
    return true;
  }
  return false;
}
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${timestamp}_${safe}`);
  }
});
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    if (isAllowedUpload(file)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype || "unknown"}`));
    }
  }
});
function runSingleFileUpload(req, res, next) {
  upload.single("file")(req, res, err => {
    if (!err) return next();
    const status = err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    return res.status(status).json({
      error: err.message || "Upload failed."
    });
  });
}
async function resolveVisibilitySelect() {
  await ensureVisibleToClientColumn();
  const hasVisibility = await hasVisibleToClientColumn();
  return visibilitySelectSql(hasVisibility);
}
router.get("/", verifyJWT, requireAnyPermission("documents.view", "clients_detail.vault"), async (req, res) => {
  try {
    const {
      clientId,
      category
    } = req.query;
    const conditions = ["is_deleted = FALSE"];
    const values = [];
    if (clientId) {
      conditions.push(`client_id = $${values.length + 1}`);
      values.push(Number(clientId));
    }
    if (category && category !== "all") {
      conditions.push(`category = $${values.length + 1}`);
      values.push(category);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const visibilitySelect = await resolveVisibilitySelect();
    const result = await pool.query(`SELECT id, client_id, client_name, file_name, mime_type, size_bytes,
              category, description, uploaded_by, created_at, ${visibilitySelect}
       FROM v_b_client_files
       ${where}
       ORDER BY created_at DESC`, values);
    res.json(result.rows);
  } catch (err) {
    console.error("[GET /client-files]", err.message);
    res.status(500).json({
      error: "Error retrieving files"
    });
  }
});
router.post("/", verifyJWT, requireAnyPermission("documents.create", "clients_detail.vault"), runSingleFileUpload, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({
      error: "No file received."
    });
    const {
      clientId,
      clientName,
      category = "Autre",
      description = "",
      visibleToClient
    } = req.body;
    if (!clientId) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: "clientId required."
      });
    }
    await ensureVisibleToClientColumn();
    const hasVisibility = await hasVisibleToClientColumn();
    const shareWithClient = hasVisibility ? parseVisibleToClient(visibleToClient) : false;
    const resolvedClientId = Number(clientId);
    if (!Number.isFinite(resolvedClientId) || resolvedClientId <= 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: "clientId invalide."
      });
    }
    const ext = path.extname(req.file.originalname || "").toLowerCase();
    const mimeType =
      req.file.mimetype && req.file.mimetype !== "application/octet-stream"
        ? req.file.mimetype
        : ext === ".zip"
          ? "application/zip"
          : req.file.mimetype || "application/octet-stream";
    const safeCategory = ALLOWED_CATEGORIES.has(category) ? category : "Autre";
    const columns = ["client_id", "client_name", "file_name", "file_path", "mime_type", "size_bytes", "category", "description", "uploaded_by"];
    const values = [resolvedClientId, clientName || null, req.file.originalname, req.file.filename, mimeType, req.file.size, safeCategory, description, resolveFileUploadedBy(req.user)];
    if (hasVisibility) {
      columns.push("visible_to_client");
      values.push(shareWithClient);
    }
    const placeholders = values.map((_, index) => `$${index + 1}`);
    const returningVisibility = hasVisibility ? ", visible_to_client" : ", FALSE AS visible_to_client";
    const result = await pool.query(`INSERT INTO v_b_client_files (${columns.join(", ")})
       VALUES (${placeholders.join(", ")})
       RETURNING id, client_id, client_name, file_name, mime_type, size_bytes, category, description, created_at${returningVisibility}`, values);
    const row = result.rows[0];
    if (shareWithClient) {
      notifyVaultDocumentShared({
        clientId: Number(clientId),
        file: row
      }).catch(err => console.warn("[POST /client-files] notifyVaultDocumentShared:", err?.message || err));
    }
    res.status(201).json(row);
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error("[POST /client-files]", err.message);
    res.status(500).json({
      error: err.message || "Error during upload."
    });
  }
});
router.get("/:id/download", verifyJWT, requireAnyPermission("documents.view", "clients_detail.vault"), async (req, res) => {
  try {
    const result = await pool.query(`SELECT file_path, file_name, mime_type FROM v_b_client_files WHERE id = $1 AND is_deleted = FALSE`, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({
      error: "File not found."
    });
    const {
      file_path,
      file_name,
      mime_type
    } = result.rows[0];
    const fullPath = path.join(UPLOADS_DIR, file_path);
    if (!fs.existsSync(fullPath)) return res.status(404).json({
      error: "File missing on disk."
    });
    res.setHeader("Content-Type", mime_type);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file_name)}"`);
    fs.createReadStream(fullPath).pipe(res);
  } catch (err) {
    console.error("[GET /client-files/:id/download]", err.message);
    res.status(500).json({
      error: "Error during download."
    });
  }
});
router.get("/:id/preview", verifyJWT, requireAnyPermission("documents.view", "clients_detail.vault"), async (req, res) => {
  try {
    const result = await pool.query(`SELECT file_path, file_name, mime_type FROM v_b_client_files WHERE id = $1 AND is_deleted = FALSE`, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({
      error: "File not found."
    });
    const {
      file_path,
      file_name,
      mime_type
    } = result.rows[0];
    const fullPath = path.join(UPLOADS_DIR, file_path);
    if (!fs.existsSync(fullPath)) return res.status(404).json({
      error: "File missing on disk."
    });
    res.setHeader("Content-Type", mime_type);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file_name)}"`);
    allowAssetEmbedding(res);
    fs.createReadStream(fullPath).pipe(res);
  } catch (err) {
    console.error("[GET /client-files/:id/preview]", err.message);
    res.status(500).json({
      error: "Error during preview."
    });
  }
});
router.patch("/:id", verifyJWT, requireAnyPermission("documents.edit", "clients_detail.vault"), async (req, res) => {
  try {
    const role = String(req.user?.role || "").toLowerCase();
    if (role === "client") {
      return res.status(403).json({
        error: "Access restricted to agents."
      });
    }
    const hasDescription = req.body?.description !== undefined;
    const hasVisibility = req.body?.visibleToClient !== undefined || req.body?.visible_to_client !== undefined;
    const hasCategory = req.body?.category !== undefined;
    if (!hasDescription && !hasVisibility && !hasCategory) {
      return res.status(400).json({
        error: "No data to update."
      });
    }
    const sets = [];
    const values = [];
    if (hasCategory) {
      const category = String(req.body.category || "").trim();
      if (!ALLOWED_CATEGORIES.has(category)) {
        return res.status(400).json({
          error: "Invalid document category."
        });
      }
      values.push(category);
      sets.push(`category = $${values.length}`);
    }
    if (hasDescription) {
      const description = String(req.body.description || "").trim();
      if (description.length > 2000) {
        return res.status(400).json({
          error: "Description too long (2000 characters max)."
        });
      }
      values.push(description);
      sets.push(`description = $${values.length}`);
    }
    if (hasVisibility) {
      await ensureVisibleToClientColumn();
      if (!(await hasVisibleToClientColumn())) {
        return res.status(503).json({
          error: "Portal visibility unavailable (migration in progress)."
        });
      }
      const visibleToClient = parseVisibleToClient(req.body.visibleToClient ?? req.body.visible_to_client);
      values.push(visibleToClient);
      sets.push(`visible_to_client = $${values.length}`);
    }
    let previouslyVisible = null;
    if (hasVisibility) {
      const before = await pool.query(`SELECT visible_to_client FROM v_b_client_files WHERE id = $1 AND is_deleted = FALSE`, [req.params.id]);
      previouslyVisible = before.rows[0]?.visible_to_client === true;
    }
    values.push(req.params.id);
    const visibilitySelect = await resolveVisibilitySelect();
    const result = await pool.query(`UPDATE v_b_client_files
       SET ${sets.join(", ")}, updated_at = NOW()
       WHERE id = $${values.length} AND is_deleted = FALSE
       RETURNING id, client_id, client_name, file_name, mime_type, size_bytes,
                 category, description, uploaded_by, created_at, ${visibilitySelect}`, values);
    if (!result.rows.length) {
      return res.status(404).json({
        error: "File not found."
      });
    }
    const row = result.rows[0];
    if (hasVisibility && row.visible_to_client === true && previouslyVisible === false) {
      notifyVaultDocumentShared({
        clientId: row.client_id,
        file: row
      }).catch(err => console.warn("[PATCH /client-files] notifyVaultDocumentShared:", err?.message || err));
    }
    res.json(row);
  } catch (err) {
    console.error("[PATCH /client-files/:id]", err.message);
    res.status(500).json({
      error: "Error updating document"
    });
  }
});
router.delete("/:id", verifyJWT, requireAnyPermission("documents.delete", "clients_detail.vault"), async (req, res) => {
  try {
    const result = await pool.query(`UPDATE v_b_client_files SET is_deleted = TRUE, updated_at = NOW()
       WHERE id = $1 AND is_deleted = FALSE RETURNING id`, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({
      error: "File not found or already deleted."
    });
    res.json({
      success: true
    });
  } catch (err) {
    console.error("[DELETE /client-files/:id]", err.message);
    res.status(500).json({
      error: "Error during deletion."
    });
  }
});
export default router;
