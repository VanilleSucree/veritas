import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import {
  clearClientUnifiLink,
  fetchUnifiCarrierSubscribers,
  fetchUnifiHosts,
  fetchUnifiSites,
  getClientUnifiGlobalStatus,
  getClientUnifiLink,
  saveClientUnifiDedicated,
  saveClientUnifiLink,
  testClientUnifiDedicated
} from "../../api/unifi";
import { showError, showSuccess } from "../../utils/toast";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import formStyles from "./EnterpriseFormModal.module.css";
import styles from "../AdminPage/BitdefenderIntegrationModal.module.css";
import unifiStyles from "../AdminPage/UnifiIntegrationModal.module.css";
import avStyles from "./AntivirusConfigModal.module.css";

const COPY = {
  fr: {
    title: "Lien UniFi",
    subtitle: "Tenant global Site Manager ou tenant dédié Network API",
    eyebrow: "Intégration",
    closeAria: "Fermer",
    cancel: "Annuler",
    save: "Enregistrer",
    saving: "Enregistrement…",
    unlink: "Dissocier",
    host: "Console (host)",
    site: "Site UniFi",
    subscriber: "Abonné Carrier Fabric (optionnel)",
    selectHost: "Choisir une console…",
    selectSite: "Choisir un site…",
    selectSubscriber: "Aucun / choisir…",
    loading: "Chargement…",
    notConfigured: "L’intégration UniFi n’est pas active. Configurez-la dans Administration → Intégrations.",
    loadError: "Impossible de charger les sites UniFi.",
    saveSuccess: "Configuration UniFi enregistrée.",
    unlinkSuccess: "Lien UniFi retiré.",
    saveError: "Enregistrement impossible.",
    current: "Lien actuel",
    hintGlobal: "Tenant global MSP : clé Site Manager admin, multi-sites.",
    hintDedicated: "Tenant dédié : URL du contrôleur (UDM) + clé Network API pour ce client uniquement.",
    modeGlobalTitle: "Tenant global · Site Manager",
    modeGlobalDesc: "Utiliser la clé MSP multi-sites et lier un host / site UniFi.",
    modeDedicatedTitle: "Tenant dédié · Network API",
    modeDedicatedDesc: "Contrôleur local (UDM) avec sa propre clé API Network.",
    modeGlobalAction: "Choisir un site",
    modeDedicatedAction: "Configurer",
    apiUrl: "URL du contrôleur",
    apiKey: "Clé API Network",
    apiKeyKeep: "Laisser vide pour conserver la clé actuelle",
    networkSite: "Site Network (optionnel)",
    rejectTls: "Vérifier le certificat TLS",
    label: "Libellé",
    test: "Tester",
    testing: "Test…",
    testOk: "Connexion Network réussie.",
    needCredentials: "URL et clé API requises.",
    needGlobalConfig: "Configurez d’abord la clé Site Manager en administration.",
    changeMode: "Changer de mode"
  },
  en: {
    title: "UniFi link",
    subtitle: "Global Site Manager tenant or dedicated Network API tenant",
    eyebrow: "Integration",
    closeAria: "Close",
    cancel: "Cancel",
    save: "Save",
    saving: "Saving…",
    unlink: "Unlink",
    host: "Console (host)",
    site: "UniFi site",
    subscriber: "Carrier Fabric subscriber (optional)",
    selectHost: "Choose a console…",
    selectSite: "Choose a site…",
    selectSubscriber: "None / choose…",
    loading: "Loading…",
    notConfigured: "UniFi integration is not active. Configure it in Administration → Integrations.",
    loadError: "Unable to load UniFi sites.",
    saveSuccess: "UniFi configuration saved.",
    unlinkSuccess: "UniFi link removed.",
    saveError: "Unable to save.",
    current: "Current link",
    hintGlobal: "Global MSP tenant: admin Site Manager key, multi-site.",
    hintDedicated: "Dedicated tenant: controller URL (UDM) + Network API key for this client only.",
    modeGlobalTitle: "Global tenant · Site Manager",
    modeGlobalDesc: "Use the multi-site MSP key and link a UniFi host / site.",
    modeDedicatedTitle: "Dedicated tenant · Network API",
    modeDedicatedDesc: "Local controller (UDM) with its own Network API key.",
    modeGlobalAction: "Choose a site",
    modeDedicatedAction: "Configure",
    apiUrl: "Controller URL",
    apiKey: "Network API key",
    apiKeyKeep: "Leave blank to keep the current key",
    networkSite: "Network site (optional)",
    rejectTls: "Verify TLS certificate",
    label: "Label",
    test: "Test",
    testing: "Testing…",
    testOk: "Network connection successful.",
    needCredentials: "URL and API key are required.",
    needGlobalConfig: "Configure the Site Manager key in administration first.",
    changeMode: "Change mode"
  }
};

function pickCopy(locale) {
  return COPY[locale] || COPY.en;
}

export default function UnifiSiteLinkModal({ open, clientId, onClose, onSaved }) {
  const locale = useAppLocale();
  const copy = useMemo(() => pickCopy(locale), [locale]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [mode, setMode] = useState(null);
  const [hosts, setHosts] = useState([]);
  const [sites, setSites] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [hostId, setHostId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [subscriberId, setSubscriberId] = useState("");
  const [link, setLink] = useState(null);
  const [dedicatedForm, setDedicatedForm] = useState({
    label: "",
    apiUrl: "",
    apiKey: "",
    networkSite: "default",
    rejectUnauthorized: false
  });

  useEffect(() => {
    if (!open || !clientId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [status, linkRes] = await Promise.all([
          getClientUnifiGlobalStatus().catch(() => ({ configured: false, enabled: false })),
          getClientUnifiLink(clientId).catch(() => ({ link: null }))
        ]);
        if (cancelled) return;
        const isConfigured = Boolean(status?.configured || status?.enabled || status?.keys?.siteManager);
        setConfigured(isConfigured);
        const current = linkRes?.link || null;
        setLink(current);
        const currentMode =
          current?.mappingMode === "dedicated" || current?.dedicated
            ? "dedicated"
            : current?.linked
              ? "global"
              : null;
        setMode(currentMode);
        setHostId(current?.hostId || "");
        setSiteId(current?.siteId || "");
        setSubscriberId(current?.subscriberId || "");
        setDedicatedForm({
          label: current?.dedicated?.label || "",
          apiUrl: current?.dedicated?.apiUrl || "",
          apiKey: "",
          networkSite: current?.dedicated?.networkSite || "default",
          rejectUnauthorized: current?.dedicated?.rejectUnauthorized === true
        });
        if (isConfigured) {
          const hostsRes = await fetchUnifiHosts();
          if (cancelled) return;
          setHosts(hostsRes.hosts || []);
          if (status?.keys?.carrierFabric) {
            try {
              const subRes = await fetchUnifiCarrierSubscribers();
              if (!cancelled) setSubscribers(subRes.subscribers || []);
            } catch {
              if (!cancelled) setSubscribers([]);
            }
          }
        }
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

  useEffect(() => {
    if (!open || !configured || !hostId || mode !== "global") {
      if (mode !== "global") setSites([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchUnifiSites(hostId);
        if (cancelled) return;
        setSites(res.sites || []);
      } catch (err) {
        if (!cancelled) {
          setSites([]);
          showError(err.message || copy.loadError);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, configured, hostId, mode, copy.loadError]);

  if (!open) return null;

  const selectedHost = hosts.find(h => String(h.id) === String(hostId));
  const selectedSite = sites.find(s => String(s.id) === String(siteId));
  const selectedSubscriber = subscribers.find(s => String(s.id) === String(subscriberId));
  const canSaveGlobal = Boolean(hostId && siteId) && !saving;
  const canSaveDedicated =
    Boolean(dedicatedForm.apiUrl.trim()) &&
    Boolean(dedicatedForm.apiKey.trim() || link?.dedicated?.hasApiKey) &&
    !saving;

  const handleSaveGlobal = async () => {
    if (!canSaveGlobal) return;
    setSaving(true);
    try {
      const res = await saveClientUnifiLink(clientId, {
        mappingMode: "global",
        hostId,
        hostName: selectedHost?.name || link?.hostName || null,
        siteId,
        siteName: selectedSite?.name || link?.siteName || null,
        subscriberId: subscriberId || null,
        subscriberName: selectedSubscriber?.name || null
      });
      showSuccess(copy.saveSuccess);
      onSaved?.(res.link);
      onClose?.();
    } catch (err) {
      showError(err.message || copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDedicated = async () => {
    if (!canSaveDedicated) {
      showError(copy.needCredentials);
      return;
    }
    setSaving(true);
    try {
      const res = await saveClientUnifiDedicated(clientId, {
        label: dedicatedForm.label.trim() || null,
        apiUrl: dedicatedForm.apiUrl.trim(),
        apiKey: dedicatedForm.apiKey.trim() || undefined,
        networkSite: dedicatedForm.networkSite.trim() || "default",
        rejectUnauthorized: dedicatedForm.rejectUnauthorized
      });
      showSuccess(copy.saveSuccess);
      onSaved?.(res.link);
      onClose?.();
    } catch (err) {
      showError(err.message || copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  const handleTestDedicated = async () => {
    if (!dedicatedForm.apiUrl.trim() || !dedicatedForm.apiKey.trim()) {
      showError(copy.needCredentials);
      return;
    }
    setTesting(true);
    try {
      await testClientUnifiDedicated({
        apiUrl: dedicatedForm.apiUrl.trim(),
        apiKey: dedicatedForm.apiKey.trim(),
        rejectUnauthorized: dedicatedForm.rejectUnauthorized
      });
      showSuccess(copy.testOk);
    } catch (err) {
      showError(err.message || copy.saveError);
    } finally {
      setTesting(false);
    }
  };

  const handleUnlink = async () => {
    setSaving(true);
    try {
      await clearClientUnifiLink(clientId);
      showSuccess(copy.unlinkSuccess);
      onSaved?.(null);
      onClose?.();
    } catch (err) {
      showError(err.message || copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  const renderModePicker = () => (
    <div className={avStyles.modeGrid}>
      <button
        type="button"
        className={`${avStyles.modeCard} ${!configured ? avStyles.modeCardDisabled : ""} ${mode === "global" ? avStyles.modeCardActive : ""}`}
        disabled={!configured}
        onClick={() => {
          if (!configured) {
            showError(copy.needGlobalConfig);
            return;
          }
          setMode("global");
        }}
      >
        <span className={avStyles.modeCardIcon} aria-hidden>
          <Icon icon="mdi:cloud-outline" />
        </span>
        <span className={avStyles.modeCardTitle}>{copy.modeGlobalTitle}</span>
        <span className={avStyles.modeCardDesc}>
          {configured ? copy.modeGlobalDesc : copy.needGlobalConfig}
        </span>
        <span className={avStyles.modeCardAction}>
          {copy.modeGlobalAction}
          <Icon icon="mdi:chevron-right" aria-hidden />
        </span>
      </button>
      <button
        type="button"
        className={`${avStyles.modeCard} ${mode === "dedicated" ? avStyles.modeCardActive : ""}`}
        onClick={() => setMode("dedicated")}
      >
        <span className={avStyles.modeCardIcon} aria-hidden>
          <Icon icon="mdi:router-network" />
        </span>
        <span className={avStyles.modeCardTitle}>{copy.modeDedicatedTitle}</span>
        <span className={avStyles.modeCardDesc}>{copy.modeDedicatedDesc}</span>
        <span className={avStyles.modeCardAction}>
          {copy.modeDedicatedAction}
          <Icon icon="mdi:chevron-right" aria-hidden />
        </span>
      </button>
    </div>
  );

  const renderGlobal = () => (
    <>
      <p className={formStyles.sectionDesc}>{copy.hintGlobal}</p>
      <div className={formStyles.fieldStack}>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="unifi-link-host">{copy.host}</label>
          <select
            id="unifi-link-host"
            className={formStyles.input}
            value={hostId}
            onChange={e => {
              setHostId(e.target.value);
              setSiteId("");
            }}
            disabled={saving}
          >
            <option value="">{copy.selectHost}</option>
            {hosts.map(h => (
              <option key={h.id} value={h.id}>{h.name || h.id}</option>
            ))}
          </select>
        </div>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="unifi-link-site">{copy.site}</label>
          <select
            id="unifi-link-site"
            className={formStyles.input}
            value={siteId}
            onChange={e => setSiteId(e.target.value)}
            disabled={saving || !hostId}
          >
            <option value="">{copy.selectSite}</option>
            {sites.map(s => (
              <option key={s.id} value={s.id}>{s.name || s.id}</option>
            ))}
          </select>
        </div>
        {subscribers.length > 0 ? (
          <div className={formStyles.field}>
            <label className={formStyles.label} htmlFor="unifi-link-sub">{copy.subscriber}</label>
            <select
              id="unifi-link-sub"
              className={formStyles.input}
              value={subscriberId}
              onChange={e => setSubscriberId(e.target.value)}
              disabled={saving}
            >
              <option value="">{copy.selectSubscriber}</option>
              {subscribers.map(s => (
                <option key={s.id} value={s.id}>{s.name || s.id}</option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
    </>
  );

  const renderDedicated = () => (
    <>
      <p className={formStyles.sectionDesc}>{copy.hintDedicated}</p>
      <div className={formStyles.fieldStack}>
        <div className={formStyles.field}>
          <label className={formStyles.label}>{copy.label}</label>
          <input
            className={formStyles.input}
            value={dedicatedForm.label}
            onChange={e => setDedicatedForm(f => ({ ...f, label: e.target.value }))}
            disabled={saving || testing}
            autoComplete="off"
          />
        </div>
        <div className={formStyles.field}>
          <label className={`${formStyles.label} ${formStyles.labelRequired}`}>{copy.apiUrl}</label>
          <input
            className={formStyles.input}
            value={dedicatedForm.apiUrl}
            placeholder="https://192.168.1.1"
            onChange={e => setDedicatedForm(f => ({ ...f, apiUrl: e.target.value }))}
            disabled={saving || testing}
            autoComplete="off"
          />
        </div>
        <div className={formStyles.field}>
          <label className={`${formStyles.label} ${link?.dedicated?.hasApiKey ? "" : formStyles.labelRequired}`}>
            {copy.apiKey}
          </label>
          <input
            type="password"
            className={formStyles.input}
            value={dedicatedForm.apiKey}
            placeholder={link?.dedicated?.hasApiKey ? copy.apiKeyKeep : ""}
            onChange={e => setDedicatedForm(f => ({ ...f, apiKey: e.target.value }))}
            disabled={saving || testing}
            autoComplete="off"
          />
        </div>
        <div className={formStyles.field}>
          <label className={formStyles.label}>{copy.networkSite}</label>
          <input
            className={formStyles.input}
            value={dedicatedForm.networkSite}
            placeholder="default"
            onChange={e => setDedicatedForm(f => ({ ...f, networkSite: e.target.value }))}
            disabled={saving || testing}
            autoComplete="off"
          />
        </div>
        <label className={formStyles.switchWrap} style={{ alignSelf: "flex-start" }}>
          <input
            type="checkbox"
            className={formStyles.switchInput}
            checked={dedicatedForm.rejectUnauthorized}
            onChange={e => setDedicatedForm(f => ({ ...f, rejectUnauthorized: e.target.checked }))}
            disabled={saving || testing}
          />
          <span className={formStyles.switchTrack} aria-hidden>
            <span className={formStyles.switchThumb} />
          </span>
          <span className={formStyles.sectionDesc} style={{ margin: 0 }}>{copy.rejectTls}</span>
        </label>
      </div>
    </>
  );

  return createPortal(
    <div className={formStyles.overlay} onClick={saving || testing ? undefined : onClose} role="presentation">
      <div className={formStyles.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="unifi-site-link-title">
        <div className={unifiStyles.accentBarUnifi} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={`${formStyles.headerIconWrap} ${unifiStyles.headerIconUnifi}`} aria-hidden>
              <Icon icon="simple-icons:ubiquiti" />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>{copy.eyebrow}</p>
              <h2 className={formStyles.title} id="unifi-site-link-title">{copy.title}</h2>
              <p className={formStyles.subtitle}>{copy.subtitle}</p>
            </div>
          </div>
          <button type="button" className={formStyles.closeBtn} onClick={onClose} disabled={saving || testing} aria-label={copy.closeAria}>
            <FaTimes />
          </button>
        </header>

        <div className={formStyles.bodySingle}>
          <div className={formStyles.content}>
            {loading ? (
              <p className={formStyles.sectionDesc}>{copy.loading}</p>
            ) : (
              <>
                {link?.linked ? (
                  <p className={formStyles.sectionDesc}>
                    {copy.current}:{" "}
                    {link.mappingMode === "dedicated"
                      ? link.dedicated?.apiUrl || "Network API"
                      : `${link.siteName || link.siteId || ""}${link.hostName ? ` · ${link.hostName}` : ""}`}
                    {link.mappingMode === "dedicated" ? " · dédié" : " · global"}
                  </p>
                ) : null}
                {!mode ? renderModePicker() : null}
                {mode === "global" ? (
                  configured ? renderGlobal() : <p className={formStyles.sectionDesc}>{copy.notConfigured}</p>
                ) : null}
                {mode === "dedicated" ? renderDedicated() : null}
                {mode ? (
                  <button type="button" className={styles.guideLinkBtn} onClick={() => setMode(null)} style={{ marginTop: "1rem" }}>
                    <Icon icon="mdi:arrow-left" aria-hidden />
                    {copy.changeMode}
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>

        <footer className={formStyles.footer}>
          <span className={formStyles.footerHint}>
            {mode === "dedicated" ? copy.hintDedicated : mode === "global" ? copy.hintGlobal : copy.subtitle}
          </span>
          <div className={formStyles.footerActions}>
            {link?.linked ? (
              <button type="button" className={formStyles.ghostBtn} onClick={handleUnlink} disabled={saving || testing}>
                {copy.unlink}
              </button>
            ) : null}
            <button type="button" className={formStyles.ghostBtn} onClick={onClose} disabled={saving || testing}>
              {copy.cancel}
            </button>
            {mode === "dedicated" ? (
              <>
                <button type="button" className={formStyles.ghostBtn} onClick={handleTestDedicated} disabled={saving || testing}>
                  {testing ? copy.testing : copy.test}
                </button>
                <button type="button" className={formStyles.primaryBtn} onClick={handleSaveDedicated} disabled={!canSaveDedicated}>
                  {saving ? copy.saving : copy.save}
                </button>
              </>
            ) : null}
            {mode === "global" ? (
              <button type="button" className={formStyles.primaryBtn} onClick={handleSaveGlobal} disabled={!canSaveGlobal}>
                {saving ? copy.saving : copy.save}
              </button>
            ) : null}
          </div>
        </footer>
      </div>
    </div>,
    document.getElementById("modal-root") || document.body
  );
}
