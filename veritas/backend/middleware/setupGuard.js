import verifyJWT from "./auth.js";
import { getSetupStatus } from "../utils/setupState.js";
import { getUserPermissions } from "../services/permissionService.js";

function hasAdminPanelAccess(perms) {
  for (const key of perms) {
    if (String(key).startsWith("admin_panel.")) return true;
  }
  return false;
}

export function requireSetupIncomplete(req, res, next) {
  getSetupStatus().then(({
    needsSetup
  }) => {
    if (!needsSetup) {
      return res.status(403).json({
        error: "Initial setup is already complete.",
        code: "SETUP_ALREADY_COMPLETE"
      });
    }
    return next();
  }).catch(() => next());
}

/** Setup wizard (open) OR authenticated admin / admin_panel.* permission. */
export function requireSetupOrAdmin(req, res, next) {
  getSetupStatus().then(({
    needsSetup
  }) => {
    if (needsSetup) return next();
    verifyJWT(req, res, async () => {
      try {
        if (String(req.user?.role || "").toLowerCase() === "admin") return next();
        const perms = await getUserPermissions(req.user);
        if (hasAdminPanelAccess(perms)) return next();
      } catch (err) {
        console.error("[setupGuard] requireSetupOrAdmin:", err.message);
        return res.status(500).json({
          error: "Permission check failed."
        });
      }
      return res.status(403).json({
        error: "Access denied. Insufficient role.",
        code: "SETUP_OR_ADMIN_REQUIRED"
      });
    });
  }).catch(() => next());
}
