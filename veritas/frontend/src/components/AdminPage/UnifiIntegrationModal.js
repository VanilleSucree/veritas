import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { testUnifiConnection } from "../../api/integrationConnectionTests";
import { showError } from "../../utils/toast";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getUnifiIntegrationModalCopy } from "./adminIntegrationModalsI18n";
import formStyles from "../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "./BitdefenderIntegrationModal.module.css";
import unifiStyles from "./UnifiIntegrationModal.module.css";

const SECTION_ICONS = {
  connection: "mdi:key-variant",
  guide: "mdi:book-open-outline",
  info: "mdi:information-outline"
};

const API_OPTIONS = [
  { id: "site-manager", keyField: "siteManagerKey" },
  { id: "network", keyField: "networkKey" },
  { id: "carrier-fabric", keyField: "carrierKey" }
];

function UnifiTestResultModal({ result, error, onClose, copy }) {
  const isSuccess = Boolean(result?.success);
  const errorMessage = (typeof error === "string" ? error : error?.message) || result?.error || null;
  const errorDetails = (typeof error === "object" ? error?.details : null) || result?.details || null;
  return createPortal(
    <div className={`${formStyles.overlay} ${formStyles.overlayStacked}`} onClick={onClose} role="presentation">
      <div className={`${formStyles.shell} ${styles.testResultShell}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={`${formStyles.accentBar} ${unifiStyles.accentBarUnifi}`} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={`${formStyles.headerIconWrap} ${unifiStyles.headerIconUnifi}`} aria-hidden>
              <Icon icon="simple-icons:ubiquiti" />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>{copy.eyebrow}</p>
              <h2 className={formStyles.title}>{copy.testResultTitle}</h2>
              <p className={formStyles.subtitle}>
                {isSuccess ? copy.testSubtitleSuccess : copy.testSubtitleFail}
              </p>
            </div>
          </div>
          <button type="button" className={formStyles.closeBtn} onClick={onClose} aria-label={copy.closeAria}>
            <FaTimes />
          </button>
        </header>
        <div className={formStyles.bodySingle}>
          <div className={formStyles.content}>
            <div className={`${styles.resultNotice} ${isSuccess ? styles.resultNoticeSuccess : styles.resultNoticeError}`}>
              <Icon icon={isSuccess ? "mdi:check-circle-outline" : "mdi:alert-circle-outline"} className={styles.resultNoticeIcon} aria-hidden />
              <div>
                <strong>{isSuccess ? copy.connectionSuccess : copy.connectionFailed}</strong>
                <p>{isSuccess ? result.message || copy.testApiSuccess : errorMessage || copy.apiUnreachable}</p>
                {errorDetails ? <pre className={styles.errorDetails}>{errorDetails}</pre> : null}
              </div>
            </div>
            {isSuccess ? (
              <div className={styles.kpiGrid}>
                {result.hostsCount != null ? (
                  <div className={styles.kpiCard}>
                    <div className={styles.kpiValue}>{result.hostsCount}</div>
                    <div className={styles.kpiLabel}>{copy.hosts}</div>
                  </div>
                ) : null}
                {result.sitesCount != null ? (
                  <div className={styles.kpiCard}>
                    <div className={styles.kpiValue}>{result.sitesCount}</div>
                    <div className={styles.kpiLabel}>{copy.sites}</div>
                  </div>
                ) : null}
                {result.subscribersCount != null ? (
                  <div className={styles.kpiCard}>
                    <div className={styles.kpiValue}>{result.subscribersCount}</div>
                    <div className={styles.kpiLabel}>{copy.subscribers}</div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        <footer className={formStyles.footer}>
          <span className={formStyles.footerHint}>{isSuccess ? copy.testSuccessShort : copy.checkCredentials}</span>
          <div className={formStyles.footerActions}>
            <button type="button" className={formStyles.primaryBtn} onClick={onClose}>{copy.close}</button>
          </div>
        </footer>
      </div>
    </div>,
    document.getElementById("modal-root") || document.body
  );
}

export default function UnifiIntegrationModal({
  open,
  enabled,
  siteManagerKey,
  networkKey,
  carrierKey,
  onEnabledChange,
  onSiteManagerKeyChange,
  onNetworkKeyChange,
  onCarrierKeyChange,
  onClose,
  onSave,
  saving = false
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getUnifiIntegrationModalCopy(locale), [locale]);
  const sections = useMemo(
    () =>
      ["connection", "guide", "info"].map(id => ({
        id,
        label: copy.sections[id].label,
        description: copy.sections[id].description,
        icon: SECTION_ICONS[id]
      })),
    [copy]
  );
  const [activeSection, setActiveSection] = useState("connection");
  const [testApi, setTestApi] = useState("site-manager");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testError, setTestError] = useState(null);
  const [showTestModal, setShowTestModal] = useState(false);

  useEffect(() => {
    if (open) {
      setActiveSection("connection");
      setTestApi("site-manager");
      setTestResult(null);
      setTestError(null);
      setShowTestModal(false);
    }
  }, [open]);

  const keyForApi = apiId => {
    if (apiId === "network") return (networkKey || "").trim();
    if (apiId === "carrier-fabric") return (carrierKey || "").trim();
    return (siteManagerKey || "").trim();
  };

  const handleTest = async () => {
    const apiKey = keyForApi(testApi);
    if (!apiKey) {
      showError(copy.fillCredentialsBeforeTest);
      return;
    }
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    try {
      const data = await testUnifiConnection({ api: testApi, apiKey });
      setTestResult(data);
      setShowTestModal(true);
    } catch (err) {
      setTestError({ message: err.message, details: err.details || null });
      setTestResult({ success: false, error: err.message, details: err.details });
      setShowTestModal(true);
    } finally {
      setTesting(false);
    }
  };

  const renderConnection = () => (
    <>
      <div className={styles.statusRow}>
        <span className={styles.statusLabel}>{enabled ? copy.integrationActive : copy.integrationInactive}</span>
        <label className={formStyles.switchWrap}>
          <input
            type="checkbox"
            className={formStyles.switchInput}
            checked={enabled}
            onChange={e => onEnabledChange(e.target.checked)}
            disabled={saving || testing}
          />
          <span className={formStyles.switchTrack} aria-hidden>
            <span className={formStyles.switchThumb} />
          </span>
        </label>
      </div>

      <div className={formStyles.sectionHead}>
        <h3 className={formStyles.sectionTitle}>{copy.apiCredentials}</h3>
        <p className={formStyles.sectionDesc}>{copy.connectionDesc}</p>
      </div>

      <div className={formStyles.fieldStack}>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="unifi-sm-key">{copy.siteManagerKey}</label>
          <input
            id="unifi-sm-key"
            type="password"
            className={formStyles.input}
            value={siteManagerKey || ""}
            onChange={e => onSiteManagerKeyChange(e.target.value)}
            disabled={saving || testing}
            autoComplete="off"
            placeholder={copy.keyPlaceholder}
          />
        </div>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="unifi-network-key">{copy.networkKey}</label>
          <input
            id="unifi-network-key"
            type="password"
            className={formStyles.input}
            value={networkKey || ""}
            onChange={e => onNetworkKeyChange(e.target.value)}
            disabled={saving || testing}
            autoComplete="off"
            placeholder={copy.keyPlaceholder}
          />
        </div>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="unifi-carrier-key">{copy.carrierKey}</label>
          <input
            id="unifi-carrier-key"
            type="password"
            className={formStyles.input}
            value={carrierKey || ""}
            onChange={e => onCarrierKeyChange(e.target.value)}
            disabled={saving || testing}
            autoComplete="off"
            placeholder={copy.keyPlaceholder}
          />
          <button type="button" className={styles.guideLinkBtn} onClick={() => setActiveSection("guide")}>
            <Icon icon="mdi:help-circle-outline" aria-hidden />
            {copy.howToGetCredentials}
          </button>
        </div>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="unifi-test-api">{copy.testApiLabel}</label>
          <select
            id="unifi-test-api"
            className={formStyles.input}
            value={testApi}
            onChange={e => setTestApi(e.target.value)}
            disabled={saving || testing}
          >
            {API_OPTIONS.map(opt => (
              <option key={opt.id} value={opt.id}>
                {copy.apiLabels[opt.id]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className={formStyles.sectionDesc}>{copy.testUsesFormHint}</p>
    </>
  );

  const renderGuide = () => (
    <>
      <div className={formStyles.sectionHead}>
        <h3 className={formStyles.sectionTitle}>{copy.guideTitle}</h3>
        <p className={formStyles.sectionDesc}>{copy.guideDesc}</p>
      </div>
      <ol className={styles.guideSteps}>
        {copy.guideSteps.map((step, index) => (
          <li key={step.title} className={styles.guideStep}>
            <span className={styles.guideStepNum} aria-hidden>
              {index + 1}
            </span>
            <div className={styles.guideStepBody}>
              <p className={styles.guideStepTitle}>{step.title}</p>
              <p className={styles.guideStepDesc}>{step.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </>
  );

  const renderInfo = () => (
    <>
      <div className={formStyles.sectionHead}>
        <h3 className={formStyles.sectionTitle}>{copy.infoTitle}</h3>
        <p className={formStyles.sectionDesc}>{copy.infoDesc}</p>
      </div>
      <ul className={styles.apiList}>
        {copy.infoApis.map(item => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className={formStyles.sectionDesc}>{copy.infoFooter}</p>
    </>
  );

  if (!open) return null;

  return createPortal(
    <>
      <div className={formStyles.overlay} onClick={saving || testing ? undefined : onClose} role="presentation">
        <div className={formStyles.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="unifi-integration-modal-title">
          <div className={unifiStyles.accentBarUnifi} aria-hidden />
          <header className={formStyles.header}>
            <div className={formStyles.headerMain}>
              <div className={`${formStyles.headerIconWrap} ${unifiStyles.headerIconUnifi}`} aria-hidden>
                <Icon icon="simple-icons:ubiquiti" />
              </div>
              <div className={formStyles.headerText}>
                <p className={formStyles.eyebrow}>{copy.eyebrow}</p>
                <h2 className={formStyles.title} id="unifi-integration-modal-title">
                  {copy.title}
                </h2>
                <p className={formStyles.subtitle}>{copy.subtitle}</p>
              </div>
            </div>
            <button type="button" className={formStyles.closeBtn} onClick={onClose} disabled={saving || testing} aria-label={copy.closeAria}>
              <FaTimes />
            </button>
          </header>

          <div className={formStyles.body}>
            <nav className={formStyles.nav} aria-label={copy.configNavAria}>
              {sections.map(section => (
                <button
                  key={section.id}
                  type="button"
                  className={`${formStyles.navItem} ${activeSection === section.id ? formStyles.navItemActive : ""}`}
                  onClick={() => setActiveSection(section.id)}
                  aria-current={activeSection === section.id ? "step" : undefined}
                >
                  <Icon icon={section.icon} className={formStyles.navItemIcon} aria-hidden />
                  <span className={formStyles.navItemText}>
                    <span className={formStyles.navItemLabel}>{section.label}</span>
                    <span className={formStyles.navItemHint}>{section.description}</span>
                  </span>
                </button>
              ))}
            </nav>
            <div className={formStyles.content}>
              {activeSection === "guide" ? renderGuide() : activeSection === "info" ? renderInfo() : renderConnection()}
            </div>
          </div>

          <footer className={formStyles.footer}>
            <span className={formStyles.footerHint}>{enabled ? copy.footerActive : copy.footerInactive}</span>
            <div className={formStyles.footerActions}>
              <button type="button" className={formStyles.ghostBtn} onClick={handleTest} disabled={saving || testing}>
                <Icon icon={testing ? "mdi:loading" : "mdi:connection"} className={testing ? formStyles.spinning : ""} aria-hidden />
                {testing ? copy.testing : copy.testConnection}
              </button>
              <button type="button" className={formStyles.ghostBtn} onClick={onClose} disabled={saving || testing}>
                {copy.cancel}
              </button>
              <button type="button" className={formStyles.primaryBtn} onClick={onSave} disabled={saving || testing}>
                {saving ? copy.saving : copy.save}
              </button>
            </div>
          </footer>
        </div>
      </div>
      {showTestModal ? <UnifiTestResultModal result={testResult} error={testError} onClose={() => setShowTestModal(false)} copy={copy} /> : null}
    </>,
    document.getElementById("modal-root") || document.body
  );
}
