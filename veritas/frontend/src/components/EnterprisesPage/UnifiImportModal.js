import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { createEquipment } from "../../api/equipment";
import { fetchUnifiDevices, getClientUnifiLink } from "../../api/unifi";
import { showError, showSuccess } from "../../utils/toast";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import formStyles from "./EnterpriseFormModal.module.css";
import styles from "../AdminPage/BitdefenderIntegrationModal.module.css";
import unifiStyles from "../AdminPage/UnifiIntegrationModal.module.css";

const COPY = {
  fr: {
    title: "Importer depuis UniFi",
    subtitle: "Sélectionnez les équipements du site lié",
    eyebrow: "UniFi",
    closeAria: "Fermer",
    cancel: "Annuler",
    import: "Importer",
    importing: "Import…",
    loading: "Chargement des devices…",
    noLink: "Aucun site UniFi lié. Configurez d’abord le lien UniFi.",
    empty: "Aucun device trouvé sur ce site.",
    filterAll: "Tous",
    filterSwitch: "Switch",
    filterAp: "Bornes Wi‑Fi",
    filterGateway: "Gateways / routeurs",
    alreadyImported: "Déjà importé",
    selected: "{count} sélectionné(s)",
    importSuccess: "{count} équipement(s) importé(s).",
    importPartial: "{ok} importé(s), {fail} échec(s).",
    selectAtLeast: "Sélectionnez au moins un device.",
    loadError: "Impossible de charger les devices UniFi."
  },
  en: {
    title: "Import from UniFi",
    subtitle: "Select devices from the linked site",
    eyebrow: "UniFi",
    closeAria: "Close",
    cancel: "Cancel",
    import: "Import",
    importing: "Importing…",
    loading: "Loading devices…",
    noLink: "No UniFi site linked. Configure the UniFi link first.",
    empty: "No devices found on this site.",
    filterAll: "All",
    filterSwitch: "Switches",
    filterAp: "Wi‑Fi APs",
    filterGateway: "Gateways / routers",
    alreadyImported: "Already imported",
    selected: "{count} selected",
    importSuccess: "{count} device(s) imported.",
    importPartial: "{ok} imported, {fail} failed.",
    selectAtLeast: "Select at least one device.",
    loadError: "Unable to load UniFi devices."
  }
};

function pickCopy(locale) {
  return COPY[locale] || COPY.en;
}

function normalizeMac(mac) {
  return String(mac || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-f0-9]/g, "");
}

function deviceKey(device) {
  return String(device.id || device.macNormalized || device.mac || "");
}

function mapDeviceToFormData(device) {
  return {
    name: device.name,
    manufacturer: "Ubiquiti",
    model: device.model || "",
    ip: device.ip || "",
    firmware: device.version || "",
    version: device.version || "",
    serial: device.serial || "",
    adresseMac: device.mac || "",
    mac: device.mac || "",
    firewallType: device.moduleKey === "Firewalls" ? "materiel" : undefined,
    routeurType: device.moduleKey === "Routeur" ? "Routeur" : undefined,
    unifiId: device.id,
    unifiMac: device.mac,
    unifiSiteId: device.siteId || null,
    unifiHostId: device.hostId || null
  };
}

export default function UnifiImportModal({
  open,
  clientId,
  existingEquipment = [],
  onClose,
  onImported
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => pickCopy(locale), [locale]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [link, setLink] = useState(null);
  const [devices, setDevices] = useState([]);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(() => new Set());

  const importedMacs = useMemo(() => {
    const set = new Set();
    (existingEquipment || []).forEach(eq => {
      const mac =
        eq.adresseMac ||
        eq.mac ||
        eq.rawData?.adresseMac ||
        eq.rawData?.mac ||
        eq.rawData?.data?.adresseMac ||
        eq.rawData?.data?.mac ||
        eq.rawData?.data?.unifiMac ||
        eq.unifiMac;
      const norm = normalizeMac(mac);
      if (norm) set.add(norm);
      const unifiId = eq.unifiId || eq.rawData?.data?.unifiId || eq.rawData?.unifiId;
      if (unifiId) set.add(String(unifiId));
    });
    return set;
  }, [existingEquipment]);

  useEffect(() => {
    if (!open || !clientId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setSelected(new Set());
      try {
        const linkRes = await getClientUnifiLink(clientId);
        const current = linkRes?.link || null;
        if (cancelled) return;
        setLink(current);
        if (!current?.hostId || !current?.siteId) {
          setDevices([]);
          return;
        }
        const devicesRes = await fetchUnifiDevices({
          hostId: current.hostId,
          siteId: current.siteId,
          siteName: current.siteName || undefined
        });
        if (cancelled) return;
        setDevices(devicesRes.devices || []);
      } catch (err) {
        if (!cancelled) showError(err.message || copy.loadError);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, clientId, copy.loadError]);

  const filtered = useMemo(() => {
    if (filter === "switch") return devices.filter(d => d.category === "switch");
    if (filter === "ap") return devices.filter(d => d.category === "ap");
    if (filter === "gateway") return devices.filter(d => d.category === "gateway" || d.category === "router");
    return devices.filter(d => d.moduleKey);
  }, [devices, filter]);

  if (!open) return null;

  const toggle = key => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleImport = async () => {
    const toImport = filtered.filter(d => selected.has(deviceKey(d)) && d.moduleKey);
    if (!toImport.length) {
      showError(copy.selectAtLeast);
      return;
    }
    setImporting(true);
    let ok = 0;
    let fail = 0;
    for (const device of toImport) {
      const already =
        (device.macNormalized && importedMacs.has(device.macNormalized)) ||
        (device.id && importedMacs.has(String(device.id)));
      if (already) continue;
      try {
        await createEquipment(clientId, device.moduleKey, mapDeviceToFormData(device));
        ok += 1;
      } catch (err) {
        console.error("[unifi import]", err);
        fail += 1;
      }
    }
    setImporting(false);
    if (ok && !fail) showSuccess(copy.importSuccess.replace("{count}", String(ok)));
    else if (ok) showSuccess(copy.importPartial.replace("{ok}", String(ok)).replace("{fail}", String(fail)));
    else showError(copy.importPartial.replace("{ok}", "0").replace("{fail}", String(fail || toImport.length)));
    if (ok) {
      onImported?.();
      onClose?.();
    }
  };

  return createPortal(
    <div className={formStyles.overlay} onClick={importing ? undefined : onClose} role="presentation">
      <div className={formStyles.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="unifi-import-title">
        <div className={unifiStyles.accentBarUnifi} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={`${formStyles.headerIconWrap} ${unifiStyles.headerIconUnifi}`} aria-hidden>
              <Icon icon="simple-icons:ubiquiti" />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>{copy.eyebrow}</p>
              <h2 className={formStyles.title} id="unifi-import-title">{copy.title}</h2>
              <p className={formStyles.subtitle}>
                {link?.siteName ? `${copy.subtitle} — ${link.siteName}` : copy.subtitle}
              </p>
            </div>
          </div>
          <button type="button" className={formStyles.closeBtn} onClick={onClose} disabled={importing} aria-label={copy.closeAria}>
            <FaTimes />
          </button>
        </header>

        <div className={formStyles.bodySingle}>
          <div className={formStyles.content}>
            {loading ? (
              <p className={formStyles.sectionDesc}>{copy.loading}</p>
            ) : !link?.linked ? (
              <p className={formStyles.sectionDesc}>{copy.noLink}</p>
            ) : (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.85rem" }}>
                  {[
                    ["all", copy.filterAll],
                    ["switch", copy.filterSwitch],
                    ["ap", copy.filterAp],
                    ["gateway", copy.filterGateway]
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={filter === id ? formStyles.primaryBtn : formStyles.ghostBtn}
                      onClick={() => setFilter(id)}
                      style={{ padding: "0.35rem 0.7rem", fontSize: "0.78rem" }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {filtered.length === 0 ? (
                  <p className={formStyles.sectionDesc}>{copy.empty}</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", maxHeight: "min(420px, 50vh)", overflow: "auto" }}>
                    {filtered.map(device => {
                      const key = deviceKey(device);
                      const already =
                        (device.macNormalized && importedMacs.has(device.macNormalized)) ||
                        (device.id && importedMacs.has(String(device.id)));
                      const isSelected = selected.has(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => !already && toggle(key)}
                          disabled={already}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "0.65rem",
                            textAlign: "left",
                            padding: "0.7rem 0.8rem",
                            borderRadius: 10,
                            border: `1px solid ${isSelected ? "var(--msp-accent, #2b5fab)" : "var(--msp-border-light, #e2e8f0)"}`,
                            background: already ? "var(--msp-surface-2, #f7f9fc)" : isSelected ? "rgba(43,95,171,0.06)" : "var(--msp-surface, #fff)",
                            cursor: already ? "default" : "pointer",
                            opacity: already ? 0.65 : 1,
                            font: "inherit",
                            color: "inherit"
                          }}
                        >
                          <input type="checkbox" checked={isSelected || already} readOnly disabled={already} style={{ marginTop: 3 }} />
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <strong style={{ display: "block", fontSize: "0.88rem" }}>{device.name}</strong>
                            <span style={{ fontSize: "0.75rem", color: "var(--msp-muted, #5c6b82)" }}>
                              {[device.model, device.ip, device.mac, device.moduleKey].filter(Boolean).join(" · ")}
                            </span>
                            {already ? (
                              <span style={{ display: "block", fontSize: "0.7rem", marginTop: 2, color: "var(--msp-muted, #5c6b82)" }}>
                                {copy.alreadyImported}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <footer className={formStyles.footer}>
          <span className={formStyles.footerHint}>{copy.selected.replace("{count}", String(selected.size))}</span>
          <div className={formStyles.footerActions}>
            <button type="button" className={formStyles.ghostBtn} onClick={onClose} disabled={importing}>
              {copy.cancel}
            </button>
            <button
              type="button"
              className={formStyles.primaryBtn}
              onClick={handleImport}
              disabled={importing || loading || !link?.linked || selected.size === 0}
            >
              <Icon icon={importing ? "mdi:loading" : "simple-icons:ubiquiti"} className={importing ? formStyles.spinning : ""} aria-hidden />
              {importing ? copy.importing : copy.import}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.getElementById("modal-root") || document.body
  );
}
