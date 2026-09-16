import express from "express";
import { body, param, validationResult } from "express-validator";
import verifyJWT from "../../middleware/auth.js";
import { requireAnyPermission, requirePermission } from "../../middleware/permissions.js";
import {
  createKnowledgeFolder,
  deleteKnowledgeFolder,
  getInheritedFolderAudience,
  getKnowledgeFolder,
  listKnowledgeFolders,
  updateKnowledgeFolder
} from "../../services/knowledgeFoldersService.js";

const router = express.Router();
router.use(verifyJWT);

function validationErrorOrNull(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return null;
  res.status(400).json({ error: "Invalid request.", details: errors.array() });
  return true;
}

router.get("/", requirePermission("knowledge_base.view"), async (_req, res) => {
  try {
    const result = await listKnowledgeFolders();
    res.json(result);
  } catch (err) {
    console.error("[GET /knowledge-folders]", err);
    res.status(500).json({ error: "Error loading folders." });
  }
});

router.post(
  "/",
  requireAnyPermission("knowledge_base.edit", "knowledge_base.create"),
  [body("name").isString().trim().isLength({ min: 1, max: 120 }), body("parentId").optional({ nullable: true }).isUUID()],
  async (req, res) => {
    if (validationErrorOrNull(req, res)) return;
    try {
      const folder = await createKnowledgeFolder({
        name: req.body?.name,
        parentId: req.body?.parentId,
        icon: req.body?.icon
      });
      res.status(201).json({ folder });
    } catch (err) {
      console.error("[POST /knowledge-folders]", err);
      res.status(err.status || 500).json({ error: err.message || "Error creating folder." });
    }
  }
);

router.get("/:id", requirePermission("knowledge_base.view"), [param("id").isUUID()], async (req, res) => {
  if (validationErrorOrNull(req, res)) return;
  try {
    const folder = await getKnowledgeFolder(req.params.id);
    if (!folder) return res.status(404).json({ error: "Folder not found." });
    const inheritedSharing = await getInheritedFolderAudience(req.params.id);
    res.json({ folder, inheritedSharing });
  } catch (err) {
    console.error("[GET /knowledge-folders/:id]", err);
    res.status(500).json({ error: "Error loading folder." });
  }
});

router.patch(
  "/:id",
  requireAnyPermission("knowledge_base.edit", "knowledge_base.create"),
  [param("id").isUUID()],
  async (req, res) => {
    if (validationErrorOrNull(req, res)) return;
    try {
      const folder = await updateKnowledgeFolder(req.params.id, {
        name: req.body?.name,
        parentId: req.body?.parentId,
        icon: req.body?.icon,
        inheritSharing: req.body?.inheritSharing,
        visibleToAgents: req.body?.visibleToAgents,
        visibleToAllClients: req.body?.visibleToAllClients,
        visibleToAllContacts: req.body?.visibleToAllContacts,
        clientIds: req.body?.clientIds,
        contactIds: req.body?.contactIds,
        clientTagIds: req.body?.clientTagIds,
        contactTagIds: req.body?.contactTagIds
      });
      if (!folder) return res.status(404).json({ error: "Folder not found." });
      const inheritedSharing = await getInheritedFolderAudience(folder.id);
      res.json({ folder, inheritedSharing });
    } catch (err) {
      console.error("[PATCH /knowledge-folders/:id]", err);
      res.status(err.status || 500).json({ error: err.message || "Error saving folder." });
    }
  }
);

router.delete(
  "/:id",
  requireAnyPermission("knowledge_base.edit", "knowledge_base.delete", "knowledge_base.create"),
  [param("id").isUUID()],
  async (req, res) => {
    if (validationErrorOrNull(req, res)) return;
    try {
      const ok = await deleteKnowledgeFolder(req.params.id);
      if (!ok) return res.status(404).json({ error: "Folder not found." });
      res.json({ success: true });
    } catch (err) {
      console.error("[DELETE /knowledge-folders/:id]", err);
      res.status(500).json({ error: "Error deleting folder." });
    }
  }
);

export default router;
