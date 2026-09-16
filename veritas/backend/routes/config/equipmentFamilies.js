import express from "express";
import { body, param, validationResult } from "express-validator";
import verifyJWT from "../../middleware/auth.js";
import { requirePermission, requireAnyPermission } from "../../middleware/permissions.js";
import { createEquipmentFamily, deleteEquipmentFamily, getEquipmentMapStyle, listEquipmentFamilies, listSystemFamilyExtensions, listSystemFamilyExtensionsByKey, listSystemFamilyLayouts, replaceSystemFamilyExtensions, updateEquipmentFamily, upsertEquipmentMapStyle, upsertSystemFamilyLayouts } from "../../utils/equipmentFamilies.js";
const router = express.Router();
router.use(verifyJWT);
function handleError(res, err, context) {
  console.error(context, err);
  res.status(err.status || 500).json({
    error: err.message || "Server error."
  });
}
router.get("/", async (_req, res) => {
  try {
    const families = await listEquipmentFamilies({
      includeDisabled: false
    });
    res.json({
      families
    });
  } catch (err) {
    handleError(res, err, "GET /equipment-families");
  }
});
router.get("/extensions", async (req, res) => {
  try {
    const familyKey = String(req.query.familyKey || "").trim();
    if (familyKey) {
      const fields = await listSystemFamilyExtensions(familyKey);
      return res.json({
        familyKey,
        fields
      });
    }
    const [extensions, layouts, style] = await Promise.all([
      listSystemFamilyExtensionsByKey(),
      listSystemFamilyLayouts(),
      getEquipmentMapStyle().catch(() => ({ tileShape: "hexagon" }))
    ]);
    res.json({
      extensions,
      layouts,
      tileShape: style.tileShape
    });
  } catch (err) {
    handleError(res, err, "GET /equipment-families/extensions");
  }
});
router.get("/map-style", async (_req, res) => {
  try {
    const style = await getEquipmentMapStyle();
    res.json(style);
  } catch (err) {
    handleError(res, err, "GET /equipment-families/map-style");
  }
});
router.put("/layouts", verifyJWT, requirePermission("admin_panel.equipment_families"), [body("layouts").isArray(), body("tileShape").optional().isIn(["hexagon", "rounded", "circle", "pentagon", "octagon"])], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Invalid request",
      details: errors.array()
    });
  }
  try {
    const layouts = await upsertSystemFamilyLayouts(req.body.layouts || []);
    const style = req.body.tileShape !== undefined
      ? await upsertEquipmentMapStyle(req.body.tileShape)
      : await getEquipmentMapStyle();
    res.json({
      layouts,
      tileShape: style.tileShape
    });
  } catch (err) {
    handleError(res, err, "PUT /equipment-families/layouts");
  }
});
router.put("/extensions/:familyKey", verifyJWT, requirePermission("admin_panel.equipment_families"), [param("familyKey").isString().trim().notEmpty(), body("fields").optional().isArray(), body("layout").optional().isObject()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Invalid request",
      details: errors.array()
    });
  }
  try {
    const result = await replaceSystemFamilyExtensions(
      req.params.familyKey,
      Array.isArray(req.body.fields) ? req.body.fields : undefined,
      req.body.layout && typeof req.body.layout === "object" ? req.body.layout : null
    );
    res.json({
      familyKey: req.params.familyKey,
      fields: result.fields,
      layout: result.layout
    });
  } catch (err) {
    handleError(res, err, "PUT /equipment-families/extensions/:familyKey");
  }
});
router.get("/admin", verifyJWT, requireAnyPermission("admin_panel.equipment_families", "admin_panel.injection"), async (_req, res) => {
  try {
    const families = await listEquipmentFamilies({
      includeDisabled: true,
      includeUsage: true
    });
    res.json({
      families
    });
  } catch (err) {
    handleError(res, err, "GET /equipment-families/admin");
  }
});
router.post("/", verifyJWT, requirePermission("admin_panel.equipment_families"), [body("label").isString().trim().notEmpty(), body("familyKey").optional().isString().trim(), body("icon").optional().isString().trim(), body("displayMode").optional().isIn(["hexagon", "brick"]), body("enabled").optional().isBoolean(), body("sortOrder").optional().isInt(), body("honeycombQ").optional({ nullable: true }), body("honeycombR").optional({ nullable: true }), body("fields").optional().isArray()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Invalid request",
      details: errors.array()
    });
  }
  try {
    const family = await createEquipmentFamily(req.body);
    res.status(201).json({
      family
    });
  } catch (err) {
    handleError(res, err, "POST /equipment-families");
  }
});
router.patch("/:id", verifyJWT, requirePermission("admin_panel.equipment_families"), [param("id").isInt({
  min: 1
}), body("label").optional().isString().trim().notEmpty(), body("familyKey").optional().isString().trim(), body("icon").optional().isString().trim(), body("displayMode").optional().isIn(["hexagon", "brick"]), body("enabled").optional().isBoolean(), body("sortOrder").optional().isInt(), body("honeycombQ").optional({ nullable: true }), body("honeycombR").optional({ nullable: true }), body("fields").optional().isArray()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Invalid request",
      details: errors.array()
    });
  }
  try {
    const family = await updateEquipmentFamily(Number(req.params.id), req.body);
    res.json({
      family
    });
  } catch (err) {
    handleError(res, err, "PATCH /equipment-families/:id");
  }
});
router.delete("/:id", verifyJWT, requirePermission("admin_panel.equipment_families"), [param("id").isInt({
  min: 1
})], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Invalid request",
      details: errors.array()
    });
  }
  try {
    await deleteEquipmentFamily(Number(req.params.id));
    res.json({
      success: true
    });
  } catch (err) {
    handleError(res, err, "DELETE /equipment-families/:id");
  }
});
export default router;
