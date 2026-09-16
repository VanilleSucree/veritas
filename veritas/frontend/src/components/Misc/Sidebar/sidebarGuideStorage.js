export const SIDEBAR_GUIDE_VERSION = "v1";

/** @param {"agent"|"portal"} [scope] */
export function getSidebarGuideStorageKey(userId, scope = "agent") {
  const prefix = scope === "portal" ? "veritas_client_portal_guide" : "veritas_sidebar_guide";
  return `${prefix}_${SIDEBAR_GUIDE_VERSION}_${userId}`;
}

/** @param {string|null|undefined} userId @param {"agent"|"portal"} [scope] */
export function readSidebarGuideState(userId, scope = "agent") {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(getSidebarGuideStorageKey(userId, scope));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** @param {string|null|undefined} userId @param {object} patch @param {"agent"|"portal"} [scope] */
export function writeSidebarGuideState(userId, patch, scope = "agent") {
  if (!userId) return;
  const prev = readSidebarGuideState(userId, scope) || {};
  localStorage.setItem(getSidebarGuideStorageKey(userId, scope), JSON.stringify({
    ...prev,
    ...patch
  }));
}
