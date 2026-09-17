import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { fetchSettings, updateSetting } from "../../api/settings";
import API_BASE_URL from "../../config";
import { showError, showSuccess } from "../../utils/toast";
import { getIconPath } from "../../utils/assetHelper";
import { integrationIconStyle, isIntegrationProLocked, integrationShowsProBadge } from "./integrationsCatalog";
import { groupLocalizedIntegrationsByCategory, localizeIntegrationsCatalog } from "./integrationsCatalogI18n";
import { formatIntegrationSectionCount, getAdminIntegrationsCopy } from "./adminIntegrationsI18n";
import { interpolate } from "../../i18n/translate";
import ProFeatureBadge from "../Misc/ProFeature/ProFeatureBadge";
import ProFeaturePromoModal from "../Misc/ProFeature/ProFeaturePromoModal";
import { buildIntegrationProPromo } from "../Misc/ProFeature/proFeaturePromoI18n";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { Page, Card, Modal, Field, Input, Btn, Switch, FormGrid } from "./AdminUi";
import BitdefenderIntegrationModal from "./BitdefenderIntegrationModal";
import MailinblackIntegrationModal from "./MailinblackIntegrationModal";
import OvhIntegrationModal from "./OvhIntegrationModal";
import AiIntegrationModal from "./AiIntegrationModal";
import CheckmkIntegrationModal from "./CheckmkIntegrationModal";
import UnifiIntegrationModal from "./UnifiIntegrationModal";
import HycuIntegrationModal from "./HycuIntegrationModal";
import WhatsappIntegrationModal from "./WhatsappIntegrationModal";
import ui from "./AdminUi.module.css";
import styles from "./AdminIntegrations.module.css";
const FILTER_ALL = "all";
const FILTER_ACTIVE = "active";
const FILTER_AVAILABLE = "available";
const FILTER_SOON = "soon";
const isTrue = value => `${value ?? ""}`.toLowerCase() === "true";
const isFalse = value => `${value ?? ""}`.toLowerCase() === "false";
function IntegrationCard({
  item,
  active,
  onClick,
  getImageSrc,
  isCommunity = false,
  badges,
  labels
}) {
  const comingSoon = item.status === "comingSoon";
  const showProBadge = integrationShowsProBadge(item, isCommunity);
  const interactive = !comingSoon;
  const statusClass = comingSoon ? styles.badgeSoon : active ? styles.badgeActive : styles.badgeInactive;
  const statusLabel = comingSoon ? badges.soon : active ? badges.active : badges.inactive;
  return <button type="button" className={[styles.card, interactive ? styles.cardInteractive : styles.cardComingSoon].filter(Boolean).join(" ")} onClick={() => interactive && onClick(item)} disabled={comingSoon} aria-disabled={comingSoon || undefined} title={comingSoon ? labels.soonHint : item.description || undefined}>
      {showProBadge ? <span className={styles.proBadgeWrap}>
          <ProFeatureBadge variant="inline" />
        </span> : null}
      <div className={styles.cardHeader}>
        <div className={styles.logoWrap} style={integrationIconStyle(item.iconColor)}>
          {item.image && getImageSrc ? <img src={getImageSrc(item.image)} alt="" className={styles.logoImg} /> : <Icon icon={item.icon || "mdi:connection"} className={styles.logoIcon} />}
        </div>
        <span className={`${styles.badge} ${statusClass}`}>
          {comingSoon ? <Icon icon="mdi:clock-outline" aria-hidden width={12} height={12} /> : null}
          {statusLabel}
        </span>
      </div>
      <div className={styles.cardBody}>
        <span className={styles.cardName}>{item.name}</span>
        <p className={styles.cardDesc}>{item.description}</p>
        {comingSoon ? <span className={styles.cardSoonHint}>
            <Icon icon="mdi:lock-outline" aria-hidden width={14} height={14} />
            {labels.soonHint}
          </span> : <span className={styles.cardAction}>
            {labels.openConfig}
            <Icon icon="mdi:arrow-right" className={styles.cardActionIcon} aria-hidden />
          </span>}
      </div>
    </button>;
}
export default function AdminInterconnections({
  isCommunity = false
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getAdminIntegrationsCopy(locale), [locale]);
  const {
    categories,
    catalog
  } = useMemo(() => localizeIntegrationsCatalog(locale), [locale]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(FILTER_ALL);
  const [proPromo, setProPromo] = useState(null);
  useEffect(() => {
    fetchSettings().then(data => {
      const map = data.reduce((acc, setting) => ({
        ...acc,
        [setting.key]: setting.value
      }), {});
      setSettings(map);
    }).catch(() => showError(copy.toast.loadError)).finally(() => setLoading(false));
  }, []);
  const integrationEnabled = integration => {
    if (!integration?.enabledKey) return false;
    const raw = settings[integration.enabledKey];
    if (isTrue(raw)) return true;
    if (isFalse(raw)) return false;
    return (integration.fields || []).some(({
      key
    }) => `${settings[key] ?? ""}`.trim().length > 0);
  };
  const stats = useMemo(() => {
    const available = catalog.filter(item => item.status === "available").length;
    const active = catalog.filter(item => item.status === "available").filter(integrationEnabled).length;
    const soon = catalog.filter(item => item.status === "comingSoon").length;
    return {
      available,
      active,
      soon
    };
  }, [settings, catalog]);
  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter(item => {
      if (filter === FILTER_ACTIVE && (item.status !== "available" || !integrationEnabled(item))) return false;
      if (filter === FILTER_AVAILABLE && item.status !== "available") return false;
      if (filter === FILTER_SOON && item.status !== "comingSoon") return false;
      if (!q) return true;
      return [item.name, item.description, item.category].filter(Boolean).some(value => String(value).toLowerCase().includes(q));
    });
  }, [search, filter, settings, catalog]);
  const sections = useMemo(() => groupLocalizedIntegrationsByCategory(filteredCatalog, categories, locale), [filteredCatalog, categories, locale]);
  const selectedEnabled = selected ? integrationEnabled(selected) : false;
  const handleFieldChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };
  const handleCardClick = item => {
    if (item.status === "comingSoon") return;
    if (isIntegrationProLocked(item, isCommunity)) {
      setProPromo({
        promo: buildIntegrationProPromo(item, locale)
      });
      return;
    }
    setSelected(item);
    setTestResult(null);
  };
  const handleSave = async (extras = {}) => {
    if (!selected) return;
    setSaving(true);
    try {
      const updates = [...(selected.fields || []).map(({
        key
      }) => [key, settings[key] ?? ""]), [selected.enabledKey, selectedEnabled ? "true" : "false"]];
      if (selected.id === "mailinblack") {
        updates.push(["MAILINBLACK_CLIENT_ID", extras.authClientId ?? settings.MAILINBLACK_CLIENT_ID ?? ""]);
      }
      await Promise.all(updates.map(([key, value]) => updateSetting(key, value)));
      if (selected.id === "mailinblack") {
        setSettings(prev => ({
          ...prev,
          MAILINBLACK_CLIENT_ID: extras.authClientId ?? prev.MAILINBLACK_CLIENT_ID ?? ""
        }));
      }
      window.dispatchEvent(new CustomEvent("integrationsSettingsUpdated"));
      showSuccess(interpolate(copy.toast.saveSuccess, {
        name: selected.name
      }));
      setSelected(null);
    } catch (e) {
      console.error(e);
      showError(copy.toast.saveError);
    } finally {
      setSaving(false);
    }
  };
  const runTest = async integration => {
    setTesting(true);
    try {
      let endpoint = "";
      let method = "POST";
      let body = null;
      let credentials = "same-origin";
      switch (integration.id) {
        case "bitdefender":
          endpoint = "/bitdefender/test";
          body = {};
          credentials = "include";
          break;
        case "mailinblack":
          endpoint = "/mailinblack/test";
          body = {};
          credentials = "include";
          break;
        case "checkmk":
          endpoint = "/checkmk/hosts";
          method = "GET";
          credentials = "include";
          break;
        case "hycu":
          endpoint = "/hycu/test";
          body = {};
          credentials = "include";
          break;
        case "ovh":
          endpoint = "/ovh/test";
          body = {};
          credentials = "include";
          break;
        case "whatsapp":
          endpoint = "/whatsapp/test";
          body = {};
          credentials = "include";
          break;
        case "ai":
          endpoint = "/ai/test";
          body = {
            provider: settings.AI_PROVIDER || "openai",
            apiKey: settings.AI_API_KEY || "",
            model: settings.AI_MODEL || ""
          };
          credentials = "include";
          break;
        default:
          throw new Error(copy.testModal.notAvailable);
      }
      const request = {
        method,
        credentials
      };
      if (method !== "GET") {
        request.headers = {
          "Content-Type": "application/json"
        };
        request.body = JSON.stringify(body ?? {});
      }
      const res = await fetch(`${API_BASE_URL}${endpoint}`, request);
      const data = await res.json();
      setTestResult({
        success: res.ok && (data.success ?? true),
        message: data.message || (res.ok ? copy.testModal.successDefault : copy.testModal.failDefault),
        details: data.details || data.error || null
      });
    } catch (e) {
      setTestResult({
        success: false,
        message: copy.testModal.errorRunning,
        details: e.message
      });
    } finally {
      setTesting(false);
    }
  };
  const filterOptions = [{
    id: FILTER_ALL,
    label: copy.filters.all
  }, {
    id: FILTER_ACTIVE,
    label: copy.filters.active
  }, {
    id: FILTER_AVAILABLE,
    label: copy.filters.available
  }, {
    id: FILTER_SOON,
    label: copy.filters.soon
  }];
  const cardLabels = {
    openConfig: copy.card.openConfig,
    soonHint: copy.card.soonHint
  };
  return <Page>
      <div className={styles.page}>
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={`${styles.statIconWrap} ${styles.statIconActive}`} aria-hidden>
              <Icon icon="mdi:check-circle-outline" />
            </div>
            <div>
              <div className={styles.statValue}>{stats.active}</div>
              <div className={styles.statLabel}>{copy.stats.activeIntegrations}</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIconWrap} aria-hidden>
              <Icon icon="mdi:connection" />
            </div>
            <div>
              <div className={styles.statValue}>{stats.available}</div>
              <div className={styles.statLabel}>{copy.stats.configurableConnectors}</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIconWrap} ${styles.statIconSoon}`} aria-hidden>
              <Icon icon="mdi:clock-outline" />
            </div>
            <div>
              <div className={styles.statValue}>{stats.soon}</div>
              <div className={styles.statLabel}>{copy.stats.comingSoon}</div>
            </div>
          </div>
        </div>

        <Card title={copy.catalog.title} description={copy.catalog.description} overflowVisible>
          <div className={styles.catalogInner}>
            <div className={styles.toolbar}>
              <input type="search" className={ui.fieldSearch} placeholder={copy.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} aria-label={copy.searchAria} />
              <div className={styles.filters}>
                {filterOptions.map(option => <button key={option.id} type="button" className={`${styles.filterBtn} ${filter === option.id ? styles.filterBtnActive : ""}`} onClick={() => setFilter(option.id)}>
                    {option.label}
                  </button>)}
              </div>
            </div>

            {loading ? <p className={styles.empty}>{copy.loading}</p> : sections.length === 0 ? <p className={styles.empty}>{copy.emptySearch}</p> : <div className={styles.sections}>
                {sections.map(section => <section key={section.id} className={styles.section}>
                    <div className={styles.sectionHeader}>
                      <Icon icon={section.icon} className={styles.sectionIcon} aria-hidden />
                      <h3 className={styles.sectionTitle}>{section.label}</h3>
                      <span className={styles.sectionCount}>
                        {formatIntegrationSectionCount(locale, section.items.length)}
                      </span>
                    </div>
                    <div className={styles.grid}>
                      {section.items.map(item => <IntegrationCard key={item.id} item={item} active={integrationEnabled(item)} onClick={handleCardClick} getImageSrc={getIconPath} isCommunity={isCommunity} badges={copy.badges} labels={cardLabels} />)}
                    </div>
                  </section>)}
              </div>}
          </div>
        </Card>
      </div>

      <Modal open={!!selected && selected.id !== "bitdefender" && selected.id !== "mailinblack" && selected.id !== "ovh" && selected.id !== "ai" && selected.id !== "checkmk" && selected.id !== "hycu" && selected.id !== "whatsapp"} onClose={() => !saving && !testing && setSelected(null)} title={selected?.name} icon={selected?.icon} width="560px" footer={<>
            <Btn variant="secondary" onClick={() => runTest(selected)} disabled={saving || testing}>
              {testing ? copy.modal.testing : copy.modal.testConnection}
            </Btn>
            <Btn variant="secondary" onClick={() => setSelected(null)} disabled={saving || testing}>
              {copy.modal.cancel}
            </Btn>
            <Btn onClick={handleSave} disabled={saving || testing}>
              {saving ? copy.modal.saving : copy.modal.save}
            </Btn>
          </>}>
        {selected && <>
            <div className={styles.modalStatusRow}>
              <Switch checked={selectedEnabled} onChange={on => handleFieldChange(selected.enabledKey, on ? "true" : "false")} label={selectedEnabled ? copy.modal.integrationActive : copy.modal.integrationInactive} />
            </div>
            {selected.description && <p className={styles.modalDesc}>{selected.description}</p>}
            {selected.webhookPath && <p className={styles.modalDesc}>
                {copy.modal.webhookMetaUrl}{" "}
                <code>{`${API_BASE_URL.replace(/\/api\/?$/, "")}${selected.webhookPath}`}</code>
              </p>}
            <FormGrid cols={1}>
              {(selected.fields || []).map(field => <Field key={field.key} label={field.label}>
                  <Input id={field.key} type={field.type} value={settings[field.key] || ""} onChange={e => handleFieldChange(field.key, e.target.value)} disabled={saving} />
                </Field>)}
            </FormGrid>
          </>}
      </Modal>

      <BitdefenderIntegrationModal open={selected?.id === "bitdefender"} enabled={selectedEnabled} apiUrl={settings.BITDEFENDER_API_URL || ""} apiKey={settings.BITDEFENDER_API_KEY || ""} onEnabledChange={on => handleFieldChange(selected?.enabledKey, on ? "true" : "false")} onApiUrlChange={value => handleFieldChange("BITDEFENDER_API_URL", value)} onApiKeyChange={value => handleFieldChange("BITDEFENDER_API_KEY", value)} onClose={() => !saving && setSelected(null)} onSave={handleSave} saving={saving} />

      <MailinblackIntegrationModal open={selected?.id === "mailinblack"} enabled={selectedEnabled} apiUrl={settings.MAILINBLACK_API_URL || ""} apiKey={settings.MAILINBLACK_API_KEY || ""} authClientId={settings.MAILINBLACK_CLIENT_ID || ""} onEnabledChange={on => handleFieldChange(selected?.enabledKey, on ? "true" : "false")} onApiUrlChange={value => handleFieldChange("MAILINBLACK_API_URL", value)} onApiKeyChange={value => handleFieldChange("MAILINBLACK_API_KEY", value)} onAuthClientIdChange={value => handleFieldChange("MAILINBLACK_CLIENT_ID", value)} onClose={() => !saving && setSelected(null)} onSave={handleSave} saving={saving} />

      <OvhIntegrationModal open={selected?.id === "ovh"} enabled={selectedEnabled} applicationKey={settings.OVH_APPLICATION_KEY || ""} applicationSecret={settings.OVH_APPLICATION_SECRET || ""} consumerKey={settings.OVH_CONSUMER_KEY || ""} onEnabledChange={on => handleFieldChange(selected?.enabledKey, on ? "true" : "false")} onApplicationKeyChange={value => handleFieldChange("OVH_APPLICATION_KEY", value)} onApplicationSecretChange={value => handleFieldChange("OVH_APPLICATION_SECRET", value)} onConsumerKeyChange={value => handleFieldChange("OVH_CONSUMER_KEY", value)} onClose={() => !saving && setSelected(null)} onSave={handleSave} saving={saving} />

      <AiIntegrationModal open={selected?.id === "ai"} enabled={selectedEnabled} provider={settings.AI_PROVIDER || "openai"} apiKey={settings.AI_API_KEY || ""} model={settings.AI_MODEL || ""} onEnabledChange={on => handleFieldChange(selected?.enabledKey, on ? "true" : "false")} onProviderChange={value => handleFieldChange("AI_PROVIDER", value)} onApiKeyChange={value => handleFieldChange("AI_API_KEY", value)} onModelChange={value => handleFieldChange("AI_MODEL", value)} onClose={() => !saving && setSelected(null)} onSave={handleSave} saving={saving} />

      <CheckmkIntegrationModal open={selected?.id === "checkmk"} enabled={selectedEnabled} apiUrl={settings.CHECKMK_API_URL || ""} username={settings.CHECKMK_USERNAME || ""} password={settings.CHECKMK_PASSWORD || ""} site={settings.CHECKMK_SITE || ""} onEnabledChange={on => handleFieldChange(selected?.enabledKey, on ? "true" : "false")} onApiUrlChange={value => handleFieldChange("CHECKMK_API_URL", value)} onUsernameChange={value => handleFieldChange("CHECKMK_USERNAME", value)} onPasswordChange={value => handleFieldChange("CHECKMK_PASSWORD", value)} onSiteChange={value => handleFieldChange("CHECKMK_SITE", value)} onClose={() => !saving && setSelected(null)} onSave={handleSave} saving={saving} />

      <UnifiIntegrationModal
        open={selected?.id === "unifi"}
        enabled={selectedEnabled}
        siteManagerKey={settings.UNIFI_SITE_MANAGER_API_KEY || settings.UNIFI_API_KEY || ""}
        networkKey={settings.UNIFI_NETWORK_API_KEY || ""}
        carrierKey={settings.UNIFI_CARRIER_FABRIC_API_KEY || ""}
        onEnabledChange={on => handleFieldChange(selected?.enabledKey, on ? "true" : "false")}
        onSiteManagerKeyChange={value => handleFieldChange("UNIFI_SITE_MANAGER_API_KEY", value)}
        onNetworkKeyChange={value => handleFieldChange("UNIFI_NETWORK_API_KEY", value)}
        onCarrierKeyChange={value => handleFieldChange("UNIFI_CARRIER_FABRIC_API_KEY", value)}
        onClose={() => !saving && setSelected(null)}
        onSave={handleSave}
        saving={saving}
      />

      <HycuIntegrationModal open={selected?.id === "hycu"} enabled={selectedEnabled} apiUrl={settings.HYCU_API_URL || ""} apiKey={settings.HYCU_API_KEY || ""} username={settings.HYCU_USERNAME || ""} password={settings.HYCU_PASSWORD || ""} verifyTls={settings.HYCU_VERIFY_TLS || "false"} onEnabledChange={on => handleFieldChange(selected?.enabledKey, on ? "true" : "false")} onApiUrlChange={value => handleFieldChange("HYCU_API_URL", value)} onApiKeyChange={value => handleFieldChange("HYCU_API_KEY", value)} onUsernameChange={value => handleFieldChange("HYCU_USERNAME", value)} onPasswordChange={value => handleFieldChange("HYCU_PASSWORD", value)} onVerifyTlsChange={value => handleFieldChange("HYCU_VERIFY_TLS", value)} onClose={() => !saving && setSelected(null)} onSave={handleSave} saving={saving} />

      <WhatsappIntegrationModal open={selected?.id === "whatsapp"} enabled={selectedEnabled} phoneNumberId={settings.WHATSAPP_PHONE_NUMBER_ID || ""} accessToken={settings.WHATSAPP_ACCESS_TOKEN || ""} appSecret={settings.WHATSAPP_APP_SECRET || ""} verifyToken={settings.WHATSAPP_VERIFY_TOKEN || ""} businessAccountId={settings.WHATSAPP_BUSINESS_ACCOUNT_ID || ""} apiVersion={settings.WHATSAPP_API_VERSION || ""} onEnabledChange={on => handleFieldChange(selected?.enabledKey, on ? "true" : "false")} onPhoneNumberIdChange={value => handleFieldChange("WHATSAPP_PHONE_NUMBER_ID", value)} onAccessTokenChange={value => handleFieldChange("WHATSAPP_ACCESS_TOKEN", value)} onAppSecretChange={value => handleFieldChange("WHATSAPP_APP_SECRET", value)} onVerifyTokenChange={value => handleFieldChange("WHATSAPP_VERIFY_TOKEN", value)} onBusinessAccountIdChange={value => handleFieldChange("WHATSAPP_BUSINESS_ACCOUNT_ID", value)} onApiVersionChange={value => handleFieldChange("WHATSAPP_API_VERSION", value)} onClose={() => !saving && setSelected(null)} onSave={handleSave} saving={saving} />

      <Modal open={!!testResult} onClose={() => setTestResult(null)} title={copy.testModal.title} icon="mdi:connection" width="480px" footer={<Btn onClick={() => setTestResult(null)}>{copy.testModal.close}</Btn>}>
        {testResult && <div className={styles.testResult}>
            <Icon icon={testResult.success ? "mdi:check-circle" : "mdi:close-circle"} className={styles.testIcon} style={{
          color: testResult.success ? "#16a34a" : "#dc2626"
        }} />
            <p className={styles.testTitle}>
              {testResult.success ? copy.testModal.successTitle : copy.testModal.failTitle}
            </p>
            {testResult.message && <p className={styles.testMessage}>{testResult.message}</p>}
            {testResult.details && <pre className={styles.testDetails}>{testResult.details}</pre>}
          </div>}
      </Modal>

      <ProFeaturePromoModal open={Boolean(proPromo)} featureKey={proPromo?.featureKey ?? null} promoOverride={proPromo?.promo ?? null} onClose={() => setProPromo(null)} />
    </Page>;
}
