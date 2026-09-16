import { useCallback, useEffect, useState } from "react";
import { readSidebarGuideState, writeSidebarGuideState } from "../components/Misc/Sidebar/sidebarGuideStorage";

/**
 * @param {string|null|undefined} userId
 * @param {{ autoStartAllowed?: boolean, scope?: "agent"|"portal" }} [options]
 *   autoStartAllowed — false while "premiers pas" is unfinished; true after it completes
 *   (or when onboarding does not apply). Manual start via ? still works anytime.
 *   scope — "agent" (default) or "portal" for separate completion state.
 */
export function useSidebarGuide(userId, {
  autoStartAllowed = true,
  scope = "agent"
} = {}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!userId) {
      setOpen(false);
      return undefined;
    }
    if (!autoStartAllowed) {
      setOpen(false);
      return undefined;
    }
    const saved = readSidebarGuideState(userId, scope);
    if (!saved?.completed) {
      const timer = window.setTimeout(() => setOpen(true), 700);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [userId, autoStartAllowed, scope]);
  const close = useCallback(() => {
    if (userId) {
      writeSidebarGuideState(userId, {
        completed: true
      }, scope);
    }
    setOpen(false);
  }, [userId, scope]);
  const start = useCallback(() => {
    setOpen(true);
  }, []);
  return {
    open,
    close,
    start
  };
}
