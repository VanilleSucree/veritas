import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { body, param, query, validationResult } from "express-validator";
import verifyJWT from "../../middleware/auth.js";
import { requireAnyPermission, requirePermission } from "../../middleware/permissions.js";
import { allowAssetEmbedding } from "../../middleware/securityHeaders.js";
import { userHasAnyPermission } from "../../services/permissionService.js";
import {
  addKnowledgeAsset,
  createKnowledgeArticle,
  deleteKnowledgeArticle,
  deleteKnowledgeArticles,
  ensureKnowledgeUploadsDir,
  getKnowledgeArticle,
  getKnowledgeArticleRevision,
  getKnowledgeAsset,
  KNOWLEDGE_ASSETS_DIR,
  listKnowledgeArticles,
  listKnowledgeArticleRevisions,
  listKnowledgeTagCatalog,
  moveKnowledgeArticles,
  publishKnowledgeArticle,
  reorderKnowledgeArticles,
  restoreKnowledgeArticleRevision,
  setArticlePublicLink,
  unpublishKnowledgeArticle,
  updateKnowledgeArticle
} from "../../services/knowledgeArticlesService.js";
import { deleteArticleComment } from "../../services/knowledgeArticleFeedbackService.js";
import { listSearchMisses } from "../../services/knowledgeArticleExtrasService.js";

const router = express.Router();
router.use(verifyJWT);

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/ogg",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation"
]);
const ALLOWED_EXT = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".pdf",
  ".mp4", ".webm", ".mov", ".ogg",
  ".txt", ".csv", ".zip",
  ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"
]);
ensureKnowledgeUploadsDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureKnowledgeUploadsDir();
    cb(null, KNOWLEDGE_ASSETS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").replace(/[^.a-zA-Z0-9]/g, "") || ".bin";
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
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

function canSeeDrafts(canManage, article) {
  if (!article) return false;
  if (article.status === "published" && article.visibleToAgents) return true;
  return canManage;
}

router.get(
  "/",
  requirePermission("knowledge_base.view"),
  [query("search").optional().isString(), query("status").optional().isIn(["draft", "published", "all"]), query("folderId").optional().isString(), query("category").optional().isString()],
  async (req, res) => {
    if (validationErrorOrNull(req, res)) return;
    try {
      const canManage = await userHasAnyPermission(req.user, ["knowledge_base.create", "knowledge_base.edit"]);
      const status = req.query.status === "all" || !req.query.status ? null : req.query.status;
      const articles = await listKnowledgeArticles({
        search: req.query.search,
        status: canManage ? status : "published",
        includeDrafts: canManage,
        folderId: req.query.folderId,
        category: req.query.category
      });
      res.json({ articles });
    } catch (err) {
      console.error("[GET /knowledge-articles]", err);
      res.status(500).json({ error: "Error loading articles." });
    }
  }
);

router.post("/", requirePermission("knowledge_base.create"), async (req, res) => {
  try {
    const article = await createKnowledgeArticle({
      title: req.body?.title,
      category: req.body?.category,
      authorUserId: req.user?.id,
      folderId: req.body?.folderId,
      contentJson: req.body?.contentJson,
      contentHtml: req.body?.contentHtml
    });
    res.status(201).json({ article });
  } catch (err) {
    console.error("[POST /knowledge-articles]", err);
    res.status(err.status || 500).json({ error: err.message || "Error creating article." });
  }
});

router.post(
  "/bulk-move",
  requireAnyPermission("knowledge_base.edit", "knowledge_base.create"),
  [body("ids").isArray({ min: 1, max: 100 }), body("ids.*").isUUID(), body("folderId").optional({ nullable: true }).isUUID()],
  async (req, res) => {
    if (validationErrorOrNull(req, res)) return;
    try {
      const result = await moveKnowledgeArticles(req.body.ids, req.body.folderId);
      res.json(result);
    } catch (err) {
      console.error("[POST /knowledge-articles/bulk-move]", err);
      res.status(err.status || 500).json({ error: err.message || "Error moving articles." });
    }
  }
);

router.post(
  "/reorder",
  requireAnyPermission("knowledge_base.edit", "knowledge_base.create"),
  [
    body("orderedIds").isArray({ min: 1, max: 500 }),
    body("orderedIds.*").isUUID(),
    body("folderId").optional({ nullable: true }).isUUID()
  ],
  async (req, res) => {
    if (validationErrorOrNull(req, res)) return;
    try {
      const result = await reorderKnowledgeArticles(req.body?.folderId || null, req.body.orderedIds);
      res.json(result);
    } catch (err) {
      console.error("[POST /knowledge-articles/reorder]", err);
      res.status(err.status || 500).json({ error: err.message || "Error reordering articles." });
    }
  }
);

router.post(
  "/bulk-delete",
  requirePermission("knowledge_base.delete"),
  [body("ids").isArray({ min: 1, max: 100 }), body("ids.*").isUUID()],
  async (req, res) => {
    if (validationErrorOrNull(req, res)) return;
    try {
      const result = await deleteKnowledgeArticles(req.body.ids);
      res.json(result);
    } catch (err) {
      console.error("[POST /knowledge-articles/bulk-delete]", err);
      res.status(500).json({ error: "Error deleting articles." });
    }
  }
);

router.get("/insights/search-misses", requirePermission("knowledge_base.view"), async (_req, res) => {
  try {
    const misses = await listSearchMisses();
    res.json({ misses });
  } catch (err) {
    console.error("[GET /knowledge-articles/insights/search-misses]", err);
    res.status(500).json({ error: "Error loading search insights." });
  }
});

router.get("/tag-catalog", requirePermission("knowledge_base.view"), async (_req, res) => {
  try {
    const tags = await listKnowledgeTagCatalog();
    res.json({ tags });
  } catch (err) {
    console.error("[GET /knowledge-articles/tag-catalog]", err);
    res.status(500).json({ error: "Error loading tags." });
  }
});

router.get("/:id", requirePermission("knowledge_base.view"), [param("id").isUUID()], async (req, res) => {
  if (validationErrorOrNull(req, res)) return;
  try {
    const canManage = await userHasAnyPermission(req.user, ["knowledge_base.create", "knowledge_base.edit"]);
    const article = await getKnowledgeArticle(req.params.id);
    if (!article || !canSeeDrafts(canManage, article)) {
      return res.status(404).json({ error: "Article not found." });
    }
    res.json({ article });
  } catch (err) {
    console.error("[GET /knowledge-articles/:id]", err);
    res.status(500).json({ error: "Error loading article." });
  }
});

router.patch(
  "/:id",
  requireAnyPermission("knowledge_base.edit", "knowledge_base.create"),
  [param("id").isUUID()],
  async (req, res) => {
    if (validationErrorOrNull(req, res)) return;
    try {
      const article = await updateKnowledgeArticle(req.params.id, {
        title: req.body?.title,
        category: req.body?.category,
        visibleToAgents: req.body?.visibleToAgents,
        visibleToAllClients: req.body?.visibleToAllClients,
        visibleToAllContacts: req.body?.visibleToAllContacts,
        contentJson: req.body?.contentJson,
        contentHtml: req.body?.contentHtml,
        status: req.body?.status,
        clientIds: req.body?.clientIds,
        contactIds: req.body?.contactIds,
        clientTagIds: req.body?.clientTagIds,
        contactTagIds: req.body?.contactTagIds,
        folderId: req.body?.folderId,
        icon: req.body?.icon,
        sortOrder: req.body?.sortOrder,
        ratingsEnabled: req.body?.ratingsEnabled,
        commentsEnabled: req.body?.commentsEnabled,
        commentsCompany: req.body?.commentsCompany,
        relatedIds: req.body?.relatedIds,
        skipRevision: req.body?.skipRevision === true,
        editorUserId: req.user?.id
      });
      if (!article) return res.status(404).json({ error: "Article not found." });
      res.json({ article });
    } catch (err) {
      console.error("[PATCH /knowledge-articles/:id]", err);
      res.status(500).json({ error: "Error saving article." });
    }
  }
);

router.post(
  "/:id/publish",
  requireAnyPermission("knowledge_base.edit", "knowledge_base.create"),
  [param("id").isUUID(), body("visibleToAgents").optional().isBoolean()],
  async (req, res) => {
    if (validationErrorOrNull(req, res)) return;
    try {
      const article = await publishKnowledgeArticle(req.params.id, {
        visibleToAgents: req.body?.visibleToAgents,
        visibleToAllClients: req.body?.visibleToAllClients,
        visibleToAllContacts: req.body?.visibleToAllContacts,
        clientIds: req.body?.clientIds,
        contactIds: req.body?.contactIds,
        clientTagIds: req.body?.clientTagIds,
        contactTagIds: req.body?.contactTagIds,
        editorUserId: req.user?.id
      });
      if (!article) return res.status(404).json({ error: "Article not found." });
      res.json({ article });
    } catch (err) {
      console.error("[POST /knowledge-articles/:id/publish]", err);
      res.status(500).json({ error: "Error publishing article." });
    }
  }
);

router.post(
  "/:id/unpublish",
  requireAnyPermission("knowledge_base.edit", "knowledge_base.create"),
  [param("id").isUUID()],
  async (req, res) => {
    if (validationErrorOrNull(req, res)) return;
    try {
      const article = await unpublishKnowledgeArticle(req.params.id, { editorUserId: req.user?.id });
      if (!article) return res.status(404).json({ error: "Article not found." });
      res.json({ article });
    } catch (err) {
      console.error("[POST /knowledge-articles/:id/unpublish]", err);
      res.status(500).json({ error: "Error reverting article to draft." });
    }
  }
);

router.post(
  "/:id/public-link",
  requireAnyPermission("knowledge_base.edit", "knowledge_base.create"),
  [param("id").isUUID(), body("enabled").optional().isBoolean(), body("rotate").optional().isBoolean()],
  async (req, res) => {
    if (validationErrorOrNull(req, res)) return;
    try {
      const article = await setArticlePublicLink(req.params.id, {
        enabled: req.body?.enabled,
        rotate: req.body?.rotate === true
      });
      if (!article) return res.status(404).json({ error: "Article not found." });
      res.json({ article });
    } catch (err) {
      console.error("[POST /knowledge-articles/:id/public-link]", err);
      res.status(500).json({ error: "Error updating public link." });
    }
  }
);

router.get("/:id/revisions", requirePermission("knowledge_base.view"), [param("id").isUUID()], async (req, res) => {
  if (validationErrorOrNull(req, res)) return;
  try {
    const canManage = await userHasAnyPermission(req.user, ["knowledge_base.create", "knowledge_base.edit"]);
    const article = await getKnowledgeArticle(req.params.id);
    if (!article || !canSeeDrafts(canManage, article)) {
      return res.status(404).json({ error: "Article not found." });
    }
    const revisions = await listKnowledgeArticleRevisions(req.params.id);
    res.json({ revisions });
  } catch (err) {
    console.error("[GET /knowledge-articles/:id/revisions]", err);
    res.status(500).json({ error: "Error loading history." });
  }
});

router.get(
  "/:id/revisions/:revisionId",
  requirePermission("knowledge_base.view"),
  [param("id").isUUID(), param("revisionId").isUUID()],
  async (req, res) => {
    if (validationErrorOrNull(req, res)) return;
    try {
      const canManage = await userHasAnyPermission(req.user, ["knowledge_base.create", "knowledge_base.edit"]);
      const article = await getKnowledgeArticle(req.params.id);
      if (!article || !canSeeDrafts(canManage, article)) {
        return res.status(404).json({ error: "Article not found." });
      }
      const revision = await getKnowledgeArticleRevision(req.params.id, req.params.revisionId);
      if (!revision) return res.status(404).json({ error: "Revision not found." });
      res.json({ revision });
    } catch (err) {
      console.error("[GET /knowledge-articles/:id/revisions/:revisionId]", err);
      res.status(500).json({ error: "Error loading revision." });
    }
  }
);

router.post(
  "/:id/revisions/:revisionId/restore",
  requireAnyPermission("knowledge_base.edit", "knowledge_base.create"),
  [param("id").isUUID(), param("revisionId").isUUID()],
  async (req, res) => {
    if (validationErrorOrNull(req, res)) return;
    try {
      const article = await restoreKnowledgeArticleRevision(req.params.id, req.params.revisionId, req.user?.id);
      if (!article) return res.status(404).json({ error: "Revision not found." });
      const revisions = await listKnowledgeArticleRevisions(req.params.id);
      res.json({ article, revisions });
    } catch (err) {
      console.error("[POST /knowledge-articles/:id/revisions/:revisionId/restore]", err);
      res.status(500).json({ error: "Error restoring revision." });
    }
  }
);

router.delete(
  "/:id/comments/:commentId",
  requireAnyPermission("knowledge_base.edit", "knowledge_base.create"),
  [param("id").isUUID(), param("commentId").isUUID()],
  async (req, res) => {
    if (validationErrorOrNull(req, res)) return;
    try {
      const article = await getKnowledgeArticle(req.params.id);
      if (!article) return res.status(404).json({ error: "Article not found." });
      const ok = await deleteArticleComment(req.params.id, req.params.commentId, { asAgent: true });
      if (!ok) return res.status(404).json({ error: "Comment not found." });
      const next = await getKnowledgeArticle(req.params.id);
      res.json({ article: next });
    } catch (err) {
      console.error("[DELETE /knowledge-articles/:id/comments/:commentId]", err);
      res.status(err.status || 500).json({ error: err.message || "Error deleting comment." });
    }
  }
);

router.delete("/:id", requirePermission("knowledge_base.delete"), [param("id").isUUID()], async (req, res) => {
  if (validationErrorOrNull(req, res)) return;
  try {
    const ok = await deleteKnowledgeArticle(req.params.id);
    if (!ok) return res.status(404).json({ error: "Article not found." });
    res.json({ success: true });
  } catch (err) {
    console.error("[DELETE /knowledge-articles/:id]", err);
    res.status(500).json({ error: "Error deleting article." });
  }
});

router.post(
  "/:id/assets",
  requireAnyPermission("knowledge_base.edit", "knowledge_base.create"),
  [param("id").isUUID()],
  (req, res, next) => {
    upload.single("file")(req, res, err => {
      if (err) return res.status(400).json({ error: err.message || "Invalid file." });
      next();
    });
  },
  async (req, res) => {
    if (validationErrorOrNull(req, res)) return;
    try {
      const article = await getKnowledgeArticle(req.params.id);
      if (!article) {
        if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: "Article not found." });
      }
      if (!req.file) return res.status(400).json({ error: "File required." });
      const asset = await addKnowledgeAsset({
        articleId: req.params.id,
        fileName: req.file.originalname,
        storedName: req.file.filename,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        uploadedBy: req.user?.id
      });
      res.status(201).json({ asset });
    } catch (err) {
      console.error("[POST /knowledge-articles/:id/assets]", err);
      res.status(500).json({ error: "Error uploading file." });
    }
  }
);

router.get(
  "/:id/assets/:assetId",
  requirePermission("knowledge_base.view"),
  [param("id").isUUID(), param("assetId").isUUID()],
  async (req, res) => {
    if (validationErrorOrNull(req, res)) return;
    try {
      const canManage = await userHasAnyPermission(req.user, ["knowledge_base.create", "knowledge_base.edit"]);
      const article = await getKnowledgeArticle(req.params.id);
      if (!article || !canSeeDrafts(canManage, article)) {
        return res.status(404).json({ error: "Article not found." });
      }
      const asset = await getKnowledgeAsset(req.params.id, req.params.assetId);
      if (!asset) return res.status(404).json({ error: "File not found." });
      const filePath = path.join(KNOWLEDGE_ASSETS_DIR, asset.stored_name);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found." });
      allowAssetEmbedding(res);
      res.setHeader("Content-Type", asset.mime_type || "application/octet-stream");
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(asset.file_name || "file")}"`);
      res.setHeader("Cache-Control", "private, max-age=86400");
      fs.createReadStream(filePath).pipe(res);
    } catch (err) {
      console.error("[GET /knowledge-articles/:id/assets/:assetId]", err);
      res.status(500).json({ error: "Error loading file." });
    }
  }
);

export default router;
