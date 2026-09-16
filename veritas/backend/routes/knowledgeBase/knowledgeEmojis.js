import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { body, param, validationResult } from "express-validator";
import verifyJWT from "../../middleware/auth.js";
import { requireAnyPermission, requirePermission } from "../../middleware/permissions.js";
import { allowAssetEmbedding } from "../../middleware/securityHeaders.js";
import {
  createKnowledgeEmoji,
  deleteKnowledgeEmoji,
  ensureKnowledgeEmojisDir,
  getKnowledgeEmojiFile,
  KNOWLEDGE_EMOJIS_DIR,
  listKnowledgeEmojis,
  renameKnowledgeEmoji
} from "../../services/knowledgeEmojisService.js";

const router = express.Router();
ensureKnowledgeEmojisDir();

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml"
]);
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureKnowledgeEmojisDir();
    cb(null, KNOWLEDGE_EMOJIS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").replace(/[^.a-zA-Z0-9]/g, "") || ".png";
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (file.mimetype === "application/octet-stream" && ALLOWED_EXT.has(ext)) return cb(null, true);
    cb(new Error(`File type not allowed: ${file.mimetype}`));
  }
});

function validationErrorOrNull(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return null;
  res.status(400).json({ error: "Invalid request.", details: errors.array() });
  return true;
}

router.get(
  "/:id/image",
  allowAssetEmbedding,
  [param("id").isUUID()],
  async (req, res) => {
    if (validationErrorOrNull(req, res)) return;
    try {
      const emoji = await getKnowledgeEmojiFile(req.params.id);
      if (!emoji || !fs.existsSync(emoji.filePath)) {
        return res.status(404).json({ error: "Emoji not found." });
      }
      res.setHeader("Content-Type", emoji.mimeType || "image/png");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(emoji.fileName || "emoji")}"`);
      fs.createReadStream(emoji.filePath).pipe(res);
    } catch (err) {
      console.error("[GET /knowledge-emojis/:id/image]", err);
      res.status(500).json({ error: "Error loading emoji." });
    }
  }
);

router.use(verifyJWT);

router.get("/", requirePermission("knowledge_base.view"), async (_req, res) => {
  try {
    const emojis = await listKnowledgeEmojis();
    res.json({ emojis });
  } catch (err) {
    console.error("[GET /knowledge-emojis]", err);
    res.status(500).json({ error: "Error loading emojis." });
  }
});

router.post(
  "/",
  requireAnyPermission("knowledge_base.edit", "knowledge_base.create"),
  (req, res, next) => {
    upload.single("file")(req, res, err => {
      if (err) return res.status(400).json({ error: err.message || "Invalid file." });
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "File required." });
      const emoji = await createKnowledgeEmoji({
        name: req.body?.name,
        fileName: req.file.originalname,
        storedName: req.file.filename,
        mimeType: req.file.mimetype,
        createdBy: req.user?.id
      });
      res.status(201).json({ emoji });
    } catch (err) {
      if (req.file?.filename) {
        try {
          fs.unlinkSync(path.join(KNOWLEDGE_EMOJIS_DIR, req.file.filename));
        } catch {
          /* ignore */
        }
      }
      console.error("[POST /knowledge-emojis]", err);
      res.status(err.status || 500).json({ error: err.message || "Error creating emoji." });
    }
  }
);

router.patch(
  "/:id",
  requireAnyPermission("knowledge_base.edit", "knowledge_base.create"),
  [param("id").isUUID(), body("name").isString().trim().isLength({ min: 2, max: 32 })],
  async (req, res) => {
    if (validationErrorOrNull(req, res)) return;
    try {
      const emoji = await renameKnowledgeEmoji(req.params.id, req.body?.name);
      if (!emoji) return res.status(404).json({ error: "Emoji not found." });
      res.json({ emoji });
    } catch (err) {
      console.error("[PATCH /knowledge-emojis/:id]", err);
      res.status(err.status || 500).json({ error: err.message || "Error renaming emoji." });
    }
  }
);

router.delete(
  "/:id",
  requireAnyPermission("knowledge_base.edit", "knowledge_base.create", "knowledge_base.delete"),
  [param("id").isUUID()],
  async (req, res) => {
    if (validationErrorOrNull(req, res)) return;
    try {
      const ok = await deleteKnowledgeEmoji(req.params.id);
      if (!ok) return res.status(404).json({ error: "Emoji not found." });
      res.json({ success: true });
    } catch (err) {
      console.error("[DELETE /knowledge-emojis/:id]", err);
      res.status(500).json({ error: "Error deleting emoji." });
    }
  }
);

export default router;
