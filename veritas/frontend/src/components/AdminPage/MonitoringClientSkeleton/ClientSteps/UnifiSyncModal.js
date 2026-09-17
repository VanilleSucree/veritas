/**
 * Legacy UniFi sync modal (MonitoringClient skeleton).
 * Replaced by EnterprisesPage/UnifiImportModal + /api/unifi inventory endpoints.
 * Kept as a no-op stub so old imports do not crash.
 */
export default function UnifiSyncModal({ isOpen, onClose }) {
  if (isOpen && typeof onClose === "function") {
    // eslint-disable-next-line no-console
    console.warn("[UnifiSyncModal] Deprecated — use UnifiImportModal on the enterprise detail page.");
    onClose();
  }
  return null;
}
