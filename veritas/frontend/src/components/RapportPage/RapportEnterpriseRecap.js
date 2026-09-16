import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { MODULE_LABELS } from "./monitoring/MonitoringSteps";
import { getEquipmentCountValue, getEquipmentFamilyLabel } from "../../i18n/equipmentFamilyLabels";
import { HARDWARE_TYPE_ORDER } from "../EnterprisesPage/infraHoneycombLayout";
import { INFRA_TYPE_ICONS } from "../EnterprisesPage/infraMapUtils";
import { listConfiguredAntivirusSolutions } from "../EnterprisesPage/antivirusSolutionUtils";
import { listConfiguredAntispamSolutions } from "../EnterprisesPage/antispamSolutionUtils";
import { listConfiguredDomains } from "../EnterprisesPage/domainSolutionUtils";
import { listConfiguredMicrosoftTenants, formatMicrosoftTenantSummary } from "../EnterprisesPage/microsoftTenantSolutionUtils";
import { buildSiteAddress, getSiteDisplayName, getSiteId, normalizeClientSites } from "../../utils/clientSites";
import styles from "./RapportEnterpriseRecap.module.css";

const CONTRACT_OPTION_KEYS = ["Support", "Curatif", "Preventif", "Monitoring", "Hebergement", "MagicInfo", "Videosurveillance"];
const EQUIPMENT_KEYS = [...HARDWARE_TYPE_ORDER, "Backup"];

function parseClientOptions(client) {
  const defaults = Object.fromEntries(CONTRACT_OPTION_KEYS.map(key => [key, false]));
  if (!client) return defaults;
  if (client.options && typeof client.options === "object") {
    return {
      ...defaults,
      ...client.options
    };
  }
  if (client.contrat?.modules && typeof client.contrat.modules === "object") {
    return {
      ...defaults,
      ...client.contrat.modules
    };
  }
  return defaults;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function getContractBadge(expiration, suspended, copy) {
  if (suspended) {
    return {
      label: copy.contractSuspended,
      tone: "warn"
    };
  }
  if (!expiration) {
    return {
      label: copy.contractUnknown,
      tone: "muted"
    };
  }
  const exp = new Date(expiration);
  if (Number.isNaN(exp.getTime())) {
    return {
      label: copy.contractUnknown,
      tone: "muted"
    };
  }
  const now = new Date();
  if (exp < now) {
    return {
      label: copy.contractExpired,
      tone: "danger"
    };
  }
  const days = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
  if (days <= 30) {
    return {
      label: copy.contractExpiringSoon,
      tone: "warn"
    };
  }
  return {
    label: copy.contractActive,
    tone: "ok"
  };
}

function formatTicketCount(count, loading, recap) {
  if (loading) return recap.openTicketsLoading || "…";
  if (count == null) return "—";
  if (count >= 200) return "200+";
  return String(count);
}

function pickLabel(item, keys = []) {
  for (const key of keys) {
    const value = item?.[key];
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return null;
}

function summarizeNames(items, keys, max = 2) {
  const names = (items || []).map(item => pickLabel(item, keys)).filter(Boolean);
  if (names.length === 0) return "";
  if (names.length <= max) return names.join(" · ");
  return `${names.slice(0, max).join(" · ")} +${names.length - max}`;
}

function buildServiceTiles({
  client,
  modulesData,
  sslCertificates,
  licences,
  campaigns,
  microsoftTenants,
  recap
}) {
  const modules = modulesData || {
    equipements: client?.equipements,
    modules_monitoring: client?.modules_monitoring
  };
  const antivirus = listConfiguredAntivirusSolutions(client, [], modules);
  const antispam = listConfiguredAntispamSolutions(client, [], modules);
  const domains = listConfiguredDomains(client, [], modules);
  const tenants = Array.isArray(microsoftTenants) && microsoftTenants.length > 0
    ? microsoftTenants
    : listConfiguredMicrosoftTenants(client, microsoftTenants);
  const sslItems = Array.isArray(sslCertificates) ? sslCertificates : [];
  const licenceItems = Array.isArray(licences) && licences.length > 0
    ? licences
    : Array.isArray(modules?.equipements?.LicensesAbonnements)
      ? modules.equipements.LicensesAbonnements
      : [];
  const campaignItems = Array.isArray(campaigns) ? campaigns : [];

  const tenantDetail = tenants.length > 0
    ? tenants.map(tenant => formatMicrosoftTenantSummary(tenant, client).label).filter(Boolean).slice(0, 2).join(" · ")
    : "";

  return [{
    key: "antivirus",
    icon: "mdi:shield-bug-outline",
    label: recap.serviceAntivirus || "Antivirus",
    count: antivirus.length,
    detail: summarizeNames(antivirus, ["solution", "nom", "name", "logiciel"])
  }, {
    key: "antispam",
    icon: "mdi:email-lock-outline",
    label: recap.serviceAntispam || "Antispam",
    count: antispam.length,
    detail: summarizeNames(antispam, ["logiciel", "solution", "nom", "name"])
  }, {
    key: "domains",
    icon: "mdi:web",
    label: recap.serviceDomains || "Noms de domaine",
    count: domains.length,
    detail: summarizeNames(domains, ["nom", "name", "domain", "domaine"])
  }, {
    key: "microsoft",
    icon: "mdi:microsoft",
    label: recap.serviceMicrosoftTenant || "Tenant Microsoft",
    count: tenants.length,
    detail: tenantDetail
  }, {
    key: "ssl",
    icon: "mdi:certificate-outline",
    label: recap.serviceSsl || "Certificats SSL",
    count: sslItems.length,
    detail: summarizeNames(sslItems, ["hostname", "host", "common_name", "commonName", "name"])
  }, {
    key: "subscriptions",
    icon: "mdi:card-account-details-outline",
    label: recap.serviceSubscriptions || "Abonnements",
    count: licenceItems.length,
    detail: summarizeNames(licenceItems, ["nom", "name", "item_key", "fournisseur"])
  }, {
    key: "campaigns",
    icon: "mdi:bullhorn-outline",
    label: recap.serviceCampaigns || "Campagnes",
    count: campaignItems.length,
    detail: summarizeNames(campaignItems, ["name", "nom", "title", "label"])
  }];
}

export default function ReportEnterpriseRecap({
  client,
  copy,
  openTicketCount = null,
  openTicketLoading = false,
  sites = null,
  sitesLoading = false,
  modulesData = null,
  sslCertificates = [],
  licences = [],
  campaigns = [],
  microsoftTenants = [],
  servicesLoading = false,
  embedded = false,
  onChangeClient,
  changeLabel
}) {
  const recap = copy.recap;
  const localeCode = copy.localeCode || "fr";
  const contractOptions = useMemo(() => parseClientOptions(client), [client]);
  const activeOptions = CONTRACT_OPTION_KEYS.filter(key => contractOptions[key]);
  const equipmentItems = useMemo(() => {
    const counts = client?.equipmentCounts || {};
    return EQUIPMENT_KEYS.map(key => ({
      key,
      label: getEquipmentFamilyLabel(key, localeCode, MODULE_LABELS[key] || key),
      count: getEquipmentCountValue(counts, key),
      icon: INFRA_TYPE_ICONS[key] || "mdi:devices"
    })).filter(item => item.count > 0);
  }, [client, localeCode]);
  const siteItems = useMemo(() => normalizeClientSites(sites ?? client?.sites), [sites, client]);
  const serviceTiles = useMemo(() => buildServiceTiles({
    client,
    modulesData,
    sslCertificates,
    licences,
    campaigns,
    microsoftTenants,
    recap
  }), [client, modulesData, sslCertificates, licences, campaigns, microsoftTenants, recap]);
  const totalEquipment = equipmentItems.reduce((sum, item) => sum + item.count, 0);
  const contractBadge = getContractBadge(client?.contrat?.expiration, client?.contrat?.suspendu, recap);
  const clientName = client?.name || client?.nom || "—";
  const clientNumber = client?.client_number || client?.clientNumber;
  const contractFacts = [client?.commercial ? {
    key: "commercial",
    label: recap.commercial,
    value: client.commercial
  } : null, client?.primaryContactName ? {
    key: "contact",
    label: recap.contact,
    value: client.primaryContactName
  } : null].filter(Boolean);

  return <article className={`${styles.recapCard} ${embedded ? styles.recapCardEmbedded : ""}`.trim()}>
      <header className={styles.recapHeader}>
        <div className={styles.recapHeaderMain}>
          <div className={styles.recapHeaderIcon}>
            <Icon icon="mdi:office-building-outline" aria-hidden />
          </div>
          <div className={styles.recapHeaderCopy}>
            <h3 className={styles.recapTitle}>{clientName}</h3>
            {clientNumber ? <span className={styles.recapMeta}>
                {recap.clientNumber} · {clientNumber}
              </span> : null}
          </div>
          <span className={`${styles.contractBadge} ${styles[`contractBadge_${contractBadge.tone}`]}`}>
            {contractBadge.label}
          </span>
        </div>
        {onChangeClient ? <button type="button" className={styles.changeBtn} onClick={onChangeClient}>
            {changeLabel}
          </button> : null}
      </header>

      <div className={styles.statStrip}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{formatTicketCount(openTicketCount, openTicketLoading, recap)}</span>
          <span className={styles.statLabel}>{recap.openTickets}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{totalEquipment}</span>
          <span className={styles.statLabel}>{recap.equipmentTotal || recap.equipment}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{sitesLoading ? recap.openTicketsLoading || "…" : siteItems.length}</span>
          <span className={styles.statLabel}>{recap.sites}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{formatDate(client?.contrat?.expiration)}</span>
          <span className={styles.statLabel}>{recap.contractExpires}</span>
        </div>
      </div>

      <div className={styles.recapSections}>
        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>
            <Icon icon="mdi:file-document-outline" aria-hidden />
            {recap.contract}
          </h4>
          <div className={styles.sectionBody}>
            {contractFacts.length > 0 ? <dl className={styles.factGrid}>
                {contractFacts.map(fact => <div key={fact.key} className={styles.fact}>
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>)}
              </dl> : null}
            {activeOptions.length > 0 ? <ul className={styles.chipList}>
                {activeOptions.map(key => <li key={key} className={styles.chip}>
                    {key}
                  </li>)}
              </ul> : <p className={styles.emptyHint}>{recap.noOptions}</p>}
          </div>
        </section>

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>
            <Icon icon="mdi:puzzle-outline" aria-hidden />
            {recap.services}
          </h4>
          <div className={styles.sectionBody}>
            {servicesLoading ? <p className={styles.emptyHint}>{recap.servicesLoading || "…"}</p> : <ul className={styles.serviceGrid}>
                {serviceTiles.map(tile => {
            const active = tile.count > 0;
            return <li key={tile.key} className={`${styles.serviceTile} ${active ? styles.serviceTileActive : ""}`.trim()}>
                      <span className={styles.serviceIcon} aria-hidden>
                        <Icon icon={tile.icon} />
                      </span>
                      <span className={styles.serviceCopy}>
                        <span className={styles.serviceLabel}>{tile.label}</span>
                        <span className={styles.serviceDetail}>
                          {active ? tile.detail || recap.serviceConfigured || "Configuré" : recap.serviceNotConfigured || "Non configuré"}
                        </span>
                      </span>
                      <span className={`${styles.serviceCount} ${active ? styles.serviceCountActive : ""}`.trim()}>
                        {active ? tile.count : "—"}
                      </span>
                    </li>;
          })}
              </ul>}
          </div>
        </section>

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>
            <Icon icon="mdi:devices" aria-hidden />
            {recap.equipment}
          </h4>
          <div className={styles.sectionBody}>
            {equipmentItems.length > 0 ? <ul className={styles.equipmentList}>
                {equipmentItems.map(item => <li key={item.key} className={styles.equipmentItem}>
                    <Icon icon={item.icon} aria-hidden />
                    <span className={styles.equipmentLabel}>{item.label}</span>
                    <span className={styles.equipmentCount}>{item.count}</span>
                  </li>)}
              </ul> : <p className={styles.emptyHint}>{recap.noEquipment}</p>}
          </div>
        </section>

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>
            <Icon icon="mdi:map-marker-outline" aria-hidden />
            {recap.sites}
          </h4>
          <div className={styles.sectionBody}>
            {sitesLoading ? <p className={styles.emptyHint}>{recap.openTicketsLoading || "…"}</p> : siteItems.length > 0 ? <ul className={styles.siteList}>
                {siteItems.map(site => {
            const address = buildSiteAddress(site);
            return <li key={getSiteId(site)} className={styles.siteItem}>
                    <span className={styles.siteName}>
                      {getSiteDisplayName(site)}
                      {site.isPrimary ? <span className={`${styles.chip} ${styles.chipAccent}`}>{recap.sitePrimary}</span> : null}
                    </span>
                    {address ? <span className={styles.siteAddress}>{address}</span> : null}
                  </li>;
          })}
              </ul> : <p className={styles.emptyHint}>{recap.noSites}</p>}
          </div>
        </section>
      </div>
    </article>;
}
