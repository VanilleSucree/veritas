import express from "express";
import fs from "fs";
import path from "path";
import { param, validationResult } from "express-validator";
import { allowAssetEmbedding } from "../../middleware/securityHeaders.js";
import { publicKnowledgeRateLimit } from "../../middleware/rateLimit.js";
import {
  getPublicKnowledgeArticle,
  getPublicKnowledgeAsset,
  KNOWLEDGE_ASSETS_DIR
} from "../../services/knowledgeArticlesService.js";
import { listKnowledgeEmojis } from "../../services/knowledgeEmojisService.js";

const TOKEN = param("token").isString().isLength({ min: 20, max: 64 }).matches(/^[A-Za-z0-9_-]+$/);

const router = express.Router();
router.use(publicKnowledgeRateLimit);

function validationErrorOrNull(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return null;
  res.status(404).json({ error: "Article not found." });
  return true;
}

router.get("/emojis", async (_req, res) => {
  try {
    const emojis = await listKnowledgeEmojis();
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json({
      emojis: emojis.map(row => ({
        id: row.id,
        name: row.name,
        shortcode: row.shortcode,
        url: row.url
      }))
    });
  } catch (err) {
    console.error("[GET /public/knowledge/emojis]", err);
    res.status(500).json({ error: "Error loading emojis." });
  }
});

router.get("/:token", [TOKEN], async (req, res) => {
  if (validationErrorOrNull(req, res)) return;
  try {
    const article = await getPublicKnowledgeArticle(req.params.token);
    if (!article) return res.status(404).json({ error: "Article not found." });
    res.setHeader("Cache-Control", "public, max-age=60");
    res.json({ article });
  } catch (err) {
    console.error("[GET /public/knowledge/:token]", err);
    res.status(500).json({ error: "Error loading article." });
  }
});

router.get("/:token/assets/:assetId", [TOKEN, param("assetId").isUUID()], async (req, res) => {
  if (validationErrorOrNull(req, res)) return;
  try {
    const asset = await getPublicKnowledgeAsset(req.params.token, req.params.assetId);
    if (!asset) return res.status(404).json({ error: "File not found." });
    const filePath = path.join(KNOWLEDGE_ASSETS_DIR, asset.stored_name);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found." });
    allowAssetEmbedding(res);
    res.setHeader("Content-Type", asset.mime_type || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(asset.file_name || "file")}"`);
    res.setHeader("Cache-Control", "public, max-age=86400");
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error("[GET /public/knowledge/:token/assets/:assetId]", err);
    res.status(500).json({ error: "Error loading file." });
  }
});

export default router;
