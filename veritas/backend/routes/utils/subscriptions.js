import express from "express";
import { body, param, validationResult } from "express-validator";
import verifyJWT from "../../middleware/auth.js";
import {
  ENTITY_SUBSCRIPTION_TYPES,
  deleteSubscription,
  getSubscription,
  listSubscriptions,
  upsertSubscription
} from "../../services/entitySubscriptionService.js";

const router = express.Router();

function validationErrorOrNull(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return null;
  return res.status(400).json({
    error: "Validation error",
    errors: errors.array()
  });
}

const typeParam = param("type").isIn(ENTITY_SUBSCRIPTION_TYPES);
const idParam = param("id").isString().trim().isLength({ min: 1, max: 128 });

router.use(verifyJWT);

router.get("/", async (req, res) => {
  try {
    const items = await listSubscriptions(req.user.id);
    res.json({ items });
  } catch (err) {
    console.error("GET /subscriptions:", err);
    res.status(500).json({ error: "Error retrieving subscriptions" });
  }
});

router.get("/:type/:id", [typeParam, idParam], async (req, res) => {
  const validationResponse = validationErrorOrNull(req, res);
  if (validationResponse) return;
  try {
    const item = await getSubscription(req.user.id, req.params.type, req.params.id);
    res.json({
      subscribed: Boolean(item),
      item: item || null
    });
  } catch (err) {
    console.error("GET /subscriptions/:type/:id:", err);
    res.status(500).json({ error: "Error retrieving subscription" });
  }
});

router.put(
  "/:type/:id",
  [
    typeParam,
    idParam,
    body("notifyInapp").optional().isBoolean(),
    body("notifyEmail").optional().isBoolean()
  ],
  async (req, res) => {
    const validationResponse = validationErrorOrNull(req, res);
    if (validationResponse) return;
    try {
      const existing = await getSubscription(req.user.id, req.params.type, req.params.id);
      const notifyInapp =
        typeof req.body?.notifyInapp === "boolean"
          ? req.body.notifyInapp
          : existing
            ? existing.notifyInapp
            : true;
      const notifyEmail =
        typeof req.body?.notifyEmail === "boolean"
          ? req.body.notifyEmail
          : existing
            ? existing.notifyEmail
            : false;
      const item = await upsertSubscription(req.user.id, req.params.type, req.params.id, {
        notifyInapp,
        notifyEmail
      });
      res.json({ success: true, subscribed: true, item });
    } catch (err) {
      console.error("PUT /subscriptions/:type/:id:", err);
      res.status(500).json({ error: "Error saving subscription" });
    }
  }
);

router.delete("/:type/:id", [typeParam, idParam], async (req, res) => {
  const validationResponse = validationErrorOrNull(req, res);
  if (validationResponse) return;
  try {
    const removed = await deleteSubscription(req.user.id, req.params.type, req.params.id);
    res.json({ success: true, subscribed: false, removed });
  } catch (err) {
    console.error("DELETE /subscriptions/:type/:id:", err);
    res.status(500).json({ error: "Error deleting subscription" });
  }
});

export default router;
