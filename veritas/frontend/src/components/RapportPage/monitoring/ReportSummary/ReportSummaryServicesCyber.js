import React, { useEffect, useMemo, useState } from "react";
import { Icon as IconifyIcon } from "@iconify/react";
import { getLicenseDisplayName, isFreeLicense } from "../../../ServicePage/TenantDetailTabs/utils";
import { getClientMfaDetails } from "../../../../api/clientOffice365";
import { filterExchangeDataByPeriod, filterTeamsDataByPeriod } from "../../../ServicePage/TenantDetailTabs/office365Period";
import {
  buildAntivirusEndpointRowsForClient,
  getAntivirusSolutionName
} from "./reportCyberTableUtils";
import { formatAntivirusEndpointType } from "../../../EnterprisesPage/antivirusSolutionUtils";
import { ReportTableBlock } from "./ReportSummaryBlocks";
import execStyles from "./ReportSummarySupervision.module.css";
import styles from "./ReportSummaryServicesCyber.module.css";

function listSolutions(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.solutions)) return raw.solutions;
  return [];
}

function formatInt(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return Number(value).toLocaleString("fr-FR");
}

function formatDateFr(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("fr-FR");
}

function formatCollectionDateFr(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function parsePeriodDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function pct(part, total) {
  if (!total) return null;
  return Math.round((Number(part) / Number(total)) * 1000) / 10;
}

function formatPct(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${Number(value).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
}

function isLikelyServiceAccountFromUser(user) {
  const name = (user.name || user.displayName || "").toString();
  const upn = (user.userPrincipalName || user.email || "").toString();
  const email = (user.email || "").toString();
  const combined = `${name} ${upn} ${email}`.toLowerCase();
  const patterns = [/aad_/, /msol_/, /sync_/, /svc_/, /service_/, /\$@/, /_srv/, /_service/, /_sync/, /compte de service|service account|compte service/, /bot\./, /bot@/, /connector/, /automation/, /azure ad sync|ad sync|dirsync|aadconnect|dir sync/, /directory synchronization|synchronization service|on-premises/, /healthmailbox|systemmailbox|federatedemail/];
  return patterns.some(p => p.test(combined));
}

function getMfaUserForUser(user, mfaDetails) {
  const upn = (user.userPrincipalName || user.email || "").toLowerCase().trim();
  const userId = user.id;
  return (
    (Array.isArray(mfaDetails) &&
      mfaDetails.find(m => {
        const mUpn = (m.userPrincipalName || m.user_principal_name || "").toLowerCase().trim();
        if (mUpn && upn && mUpn === upn) return true;
        if (userId && m.id && String(m.id) === String(userId)) return true;
        return false;
      })) ||
    null
  );
}

const IGNORED_MFA_METHODS = new Set([
  "passwordauthenticationmethod",
  "windowshelloforbusinessauthenticationmethod"
]);

function userHasMfaFromMfaUser(mfaUser) {
  if (!mfaUser) return false;
  if (mfaUser.has_mfa === true) return true;
  const methods = mfaUser.mfa_methods || mfaUser.mfaMethods || [];
  if (!Array.isArray(methods)) return false;
  return methods.some(m => !IGNORED_MFA_METHODS.has(m));
}

function daysUntil(dateValue) {
  const d = parsePeriodDate(dateValue);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function buildClientLine(client, clientPrefix = "", clientMainLabel = "") {
  if (clientPrefix || clientMainLabel) return [clientPrefix, clientMainLabel].filter(Boolean).join(" — ");
  return client?.name || client?.nom || "Client";
}

function Metric({ label, value, hint }) {
  return (
    <div className={styles.metricItem}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={styles.metricValue}>{value}</span>
      {hint ? <span className={styles.metricHint}>{hint}</span> : null}
    </div>
  );
}

export default function ReportSummaryServicesCyber({
  client,
  clientPrefix = "",
  clientMainLabel = "",
  reportStartDate = null,
  reportEndDate = null
}) {
  const [showTechnicalDetail, setShowTechnicalDetail] = useState(false);
  const [mfaDetailsFromApi, setMfaDetailsFromApi] = useState([]);
  const clientId = client?.id ?? client?.uuid ?? null;
  const modules = client?.modules_monitoring || {};

  useEffect(() => {
    if (!clientId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await getClientMfaDetails(clientId);
        if (!cancelled && Array.isArray(res?.userMfaDetails)) setMfaDetailsFromApi(res.userMfaDetails);
      } catch {
        if (!cancelled) setMfaDetailsFromApi([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const antivirusSolutions = useMemo(() => listSolutions(client?.equipements?.Antivirus), [client]);
  const antispamSolutions = useMemo(() => listSolutions(client?.equipements?.Antispam), [client]);
  const domains = useMemo(() => (Array.isArray(client?.equipements?.NDD) ? client.equipements.NDD : []), [client]);

  const antivirusStats = useMemo(() => {
    let totalEndpoints = 0;
    let disconnected = 0;
    let managed = 0;
    let unmanaged = 0;
    let licenseTotal = 0;
    let licenseUsed = 0;
    antivirusSolutions.forEach(sol => {
      const list =
        sol.syncData?.endpoints?.list ??
        sol.endpoints ??
        (Array.isArray(sol.data?.endpoints) ? sol.data.endpoints : sol.data?.endpoints?.list ?? []);
      const arr = Array.isArray(list) ? list : [];
      totalEndpoints += arr.length;
      arr.forEach(ep => {
        const isManaged = ep.isManaged === true || ep.managed === true || ep.endpointState === 1;
        if (isManaged) managed += 1;
        else unmanaged += 1;
        const lastSeen = ep.lastSeen ?? ep.lastCheckIn ?? ep.lastConnectedAt;
        if (!lastSeen) {
          disconnected += 1;
          return;
        }
        const d = new Date(lastSeen);
        if (Number.isNaN(d.getTime()) || Date.now() - d.getTime() > 24 * 60 * 60 * 1000) disconnected += 1;
      });
      const license = sol.syncData?.license || {};
      const total = Number(license.total || license.totalSeats || license.seats || sol.licencesTotales || 0) || 0;
      const used = Number(license.used || license.usedSeats || sol.licencesUtilisees || 0) || 0;
      licenseTotal += total;
      licenseUsed += used;
    });
    const connected = Math.max(0, totalEndpoints - disconnected);
    return {
      totalEndpoints,
      managed,
      unmanaged,
      disconnected,
      connected,
      managementRate: pct(managed, totalEndpoints),
      licenseTotal,
      licenseUsed,
      solutionName: antivirusSolutions[0] ? getAntivirusSolutionName(antivirusSolutions[0], 0) : "Antivirus"
    };
  }, [antivirusSolutions]);

  const antispamStats = useMemo(() => {
    let protectedUsers = 0;
    let hasStats = false;
    let domainsOrLicenses = antispamSolutions.length;
    antispamSolutions.forEach(sol => {
      const data = sol && typeof sol.data === "object" && sol.data !== null ? sol.data : sol || {};
      const fromLicense = sol.utilisateursProteges ?? sol.utilisateurs ?? sol.nombre_utilisateurs;
      if (fromLicense != null && !Number.isNaN(Number(fromLicense))) protectedUsers += Number(fromLicense);
      else if (Array.isArray(data.usersData)) protectedUsers += data.usersData.length;
      if (Array.isArray(data.statsData) && data.statsData.length > 0) hasStats = true;
    });
    return {
      solutionName:
        antispamSolutions[0]?.nom ||
        antispamSolutions[0]?.logiciel ||
        antispamSolutions[0]?.solution ||
        antispamSolutions[0]?.name ||
        "Antispam",
      protectedUsers,
      domainsOrLicenses,
      hasStats
    };
  }, [antispamSolutions]);

  const reportStart = useMemo(() => parsePeriodDate(reportStartDate || client?.reportStartDate), [reportStartDate, client]);
  const reportEnd = useMemo(() => {
    const end = parsePeriodDate(reportEndDate || client?.reportEndDate);
    if (end) end.setHours(23, 59, 59, 999);
    return end;
  }, [reportEndDate, client]);

  const o365Data = useMemo(() => {
    const raw = client?.equipements?.Office365;
    if (!raw) return null;
    const data = raw.data || raw;
    const licenses = Array.isArray(data.licences) ? data.licences : [];
    const users = Array.isArray(data.users) ? data.users : [];
    const mfaDetailsFromSnapshot = Array.isArray(data.mfaDetails)
      ? data.mfaDetails
      : Array.isArray(data.userMfaDetails)
        ? data.userMfaDetails
        : [];
    const mfaDetails =
      Array.isArray(mfaDetailsFromApi) && mfaDetailsFromApi.length > 0 ? mfaDetailsFromApi : mfaDetailsFromSnapshot;
    const exchangeData = filterExchangeDataByPeriod(data.exchangeData ?? data.exchange ?? null, {
      start: reportStart,
      end: reportEnd
    });
    const teamsData = filterTeamsDataByPeriod(data.teamsData ?? data.teams ?? null, {
      start: reportStart,
      end: reportEnd
    });
    const onedriveData = data.onedriveData ?? data.onedrive ?? null;
    const sharepointData = data.sharepointData ?? data.sharepoint ?? null;
    const securityData = data.securityData ?? data.security ?? null;
    const metrics = data.metrics || null;
    const effectiveUsers = users.filter(u => {
      const isService = u.isServiceAccount === true || (u.isServiceAccount !== false && isLikelyServiceAccountFromUser(u));
      return !isService;
    });
    let adminsTotal = 0;
    let adminsWithMFA = 0;
    let nonAdminWithMFA = 0;
    let nonAdminTotal = 0;
    let usersWithMFA = 0;
    effectiveUsers.forEach(user => {
      const mfaUser = getMfaUserForUser(user, mfaDetails);
      const hasMfa = userHasMfaFromMfaUser(mfaUser);
      if (hasMfa) usersWithMFA += 1;
      if (mfaUser?.is_admin === true) {
        adminsTotal += 1;
        if (hasMfa) adminsWithMFA += 1;
      } else {
        nonAdminTotal += 1;
        if (hasMfa) nonAdminWithMFA += 1;
      }
    });
    const paidLicenses = licenses.filter(lic => !isFreeLicense(lic));
    const secureScore = metrics?.secureScore || securityData?.secureScore || null;
    const microsoftDomains = new Set();
    effectiveUsers.forEach(u => {
      const upn = u?.userPrincipalName || u?.email || "";
      const at = String(upn).indexOf("@");
      if (at > -1) microsoftDomains.add(String(upn).slice(at + 1).toLowerCase());
    });
    return {
      licenses: paidLicenses,
      licenseTypes: paidLicenses.length,
      usersCount: effectiveUsers.length,
      exchangeData,
      teamsData,
      onedriveData,
      sharepointData,
      secureScore,
      securityRecommendations: Array.isArray(securityData?.secureScoreRecommendations)
        ? securityData.secureScoreRecommendations
        : [],
      microsoftDomains: Array.from(microsoftDomains).sort((a, b) => a.localeCompare(b)),
      mfa: {
        usersWithMFA,
        totalUsers: effectiveUsers.length,
        adminsTotal,
        adminsWithMFA,
        nonAdminTotal,
        nonAdminWithMFA,
        globalRate: pct(usersWithMFA, effectiveUsers.length),
        adminRate: pct(adminsWithMFA, adminsTotal),
        userRate: pct(nonAdminWithMFA, nonAdminTotal)
      }
    };
  }, [client, mfaDetailsFromApi, reportStart, reportEnd]);

  const endpointRows = useMemo(() => buildAntivirusEndpointRowsForClient(antivirusSolutions), [antivirusSolutions]);

  const hasAntivirus = !!modules.Antivirus || antivirusSolutions.length > 0;
  const hasAntispam = !!modules.Antispam || antispamSolutions.length > 0;
  const hasOffice = !!modules.Office365 || Boolean(client?.equipements?.Office365);
  const hasDomains = !!modules.NDD || domains.length > 0;

  const watchPoints = useMemo(() => {
    const points = [];
    if (hasAntivirus && antivirusStats.unmanaged > 0) {
      points.push({
        id: "av-unmanaged",
        title: "Couverture antivirus incomplète",
        body: `${antivirusStats.unmanaged} poste${antivirusStats.unmanaged > 1 ? "s" : ""} sur ${antivirusStats.totalEndpoints} ${antivirusStats.unmanaged > 1 ? "sont identifiés" : "est identifié"} comme non géré${antivirusStats.unmanaged > 1 ? "s" : ""}.`,
        action: "Action suggérée : vérifier l'installation et la remontée de l'agent antivirus."
      });
    }
    if (hasAntivirus && antivirusStats.disconnected > 0) {
      points.push({
        id: "av-disconnected",
        title: "Remontée des agents antivirus",
        body: `${antivirusStats.disconnected} agent${antivirusStats.disconnected > 1 ? "s sont" : " est"} indiqué${antivirusStats.disconnected > 1 ? "s" : ""} comme non vu${antivirusStats.disconnected > 1 ? "s" : ""} depuis plus de 24 h.`,
        action: "Action suggérée : vérifier la connectivité des agents et la remontée des données GravityZone."
      });
    }
    if (hasOffice && o365Data?.mfa && o365Data.mfa.nonAdminTotal > 0 && (o365Data.mfa.userRate ?? 100) < 50) {
      points.push({
        id: "mfa-users",
        title: "Authentification multifacteur Microsoft 365",
        body: `${o365Data.mfa.nonAdminWithMFA} utilisateur${o365Data.mfa.nonAdminWithMFA > 1 ? "s" : ""} sur ${o365Data.mfa.nonAdminTotal} dispose${o365Data.mfa.nonAdminWithMFA > 1 ? "nt" : ""} du MFA, soit ${formatPct(o365Data.mfa.userRate)} des comptes non administrateurs.`,
        action:
          o365Data.mfa.adminsTotal > 0
            ? `Les ${o365Data.mfa.adminsTotal} compte${o365Data.mfa.adminsTotal > 1 ? "s" : ""} administrateur${o365Data.mfa.adminsTotal > 1 ? "s" : ""} ${o365Data.mfa.adminRate === 100 ? "sont couverts à 100 %" : `sont couverts à ${formatPct(o365Data.mfa.adminRate)}`}.`
            : null
      });
    }
    domains.forEach((domain, idx) => {
      const name = domain.nom || domain.name || domain.domaine || "";
      const expiration = domain.expiration || domain.expiry || domain.dateExpiration;
      const remaining = daysUntil(expiration);
      if (!name || remaining == null || remaining > 90) return;
      points.push({
        id: `domain-${idx}-${name}`,
        title: "Expiration du nom de domaine",
        body: `Le domaine ${name} arrive à expiration le ${formatDateFr(expiration)}.`,
        action: domain.registrar || domain.registrarName ? `Registrar : ${domain.registrar || domain.registrarName}.` : null
      });
    });
    return points;
  }, [hasAntivirus, hasOffice, antivirusStats, o365Data, domains]);

  const showAgentConsistencyNote =
    hasAntivirus &&
    antivirusStats.managed > 0 &&
    antivirusStats.disconnected >= antivirusStats.totalEndpoints &&
    antivirusStats.totalEndpoints > 0;

  const synthesisText = useMemo(() => {
    const parts = [];
    parts.push("Les services antivirus, antispam et Microsoft 365 sont référencés et suivis.");
    if (hasAntivirus && antivirusStats.unmanaged > 0) {
      parts.push(
        `La couverture antivirus présente ${antivirusStats.unmanaged} poste${antivirusStats.unmanaged > 1 ? "s" : ""} non géré${antivirusStats.unmanaged > 1 ? "s" : ""}.`
      );
    } else if (hasAntivirus) {
      parts.push("La couverture antivirus est complète sur les postes inventoriés.");
    }
    if (hasOffice && o365Data?.mfa) {
      if ((o365Data.mfa.adminRate ?? 0) >= 100 && (o365Data.mfa.userRate ?? 100) < 50) {
        parts.push(
          "L'authentification multifacteur est activée sur les comptes administrateurs, mais reste peu déployée sur les comptes utilisateurs."
        );
      } else if ((o365Data.mfa.globalRate ?? 0) >= 80) {
        parts.push("L'authentification multifacteur Microsoft 365 est largement déployée.");
      }
    }
    if (hasAntispam && !antispamStats.hasStats) {
      parts.push("Les statistiques antispam ne sont pas disponibles sur la période.");
    }
    return parts.join(" ");
  }, [hasAntivirus, hasOffice, hasAntispam, antivirusStats, o365Data, antispamStats]);

  const exchange = o365Data?.exchangeData || null;
  const teams = o365Data?.teamsData || null;
  const teamsActivity = teams?.activity || {};
  const teamsUsage = teamsActivity.usage && typeof teamsActivity.usage === "object" ? teamsActivity.usage : {};
  const teamsMeetings =
    teamsActivity.meetings && typeof teamsActivity.meetings === "object"
      ? teamsActivity.meetings
      : { total: typeof teamsActivity.meetings === "number" ? teamsActivity.meetings : 0 };
  const teamsMessages =
    teamsActivity.messages && typeof teamsActivity.messages === "object"
      ? teamsActivity.messages
      : { total: typeof teamsActivity.messages === "number" ? teamsActivity.messages : 0 };
  const teamsCalls =
    teamsActivity.calls && typeof teamsActivity.calls === "object"
      ? teamsActivity.calls
      : teams?.calls && typeof teams.calls === "object"
        ? teams.calls
        : {};
  const sharepointSites = Array.isArray(o365Data?.sharepointData?.sites) ? o365Data.sharepointData.sites : [];
  const secureScore = o365Data?.secureScore;
  const scoreCurrent = secureScore?.current ?? secureScore?.score ?? null;
  const scoreMax = secureScore?.max ?? secureScore?.maxScore ?? null;
  const scorePct =
    secureScore?.percentage != null
      ? Number(secureScore.percentage)
      : scoreCurrent != null && scoreMax
        ? pct(scoreCurrent, scoreMax)
        : null;

  const endpointDetailColumns = [
    { id: "name", label: "Nom du poste", render: row => row.displayName || row.name || "—" },
    {
      id: "type",
      label: "Type",
      render: row => formatAntivirusEndpointType(row.type ?? row.machineType)
    },
    { id: "os", label: "Système d'exploitation", render: row => row.operatingSystem || row.os || "—" },
    {
      id: "lastSeen",
      label: "Dernière connexion",
      render: row => formatDateFr(row.lastSeen || row.lastCheckIn || row.lastConnectedAt)
    },
    {
      id: "policy",
      label: "Politique appliquée",
      render: row => row.policy?.name || row.policyName || "—"
    },
    {
      id: "status",
      label: "Statut de l'agent",
      render: row => (row.endpointState === 1 || row.isManaged ? "Actif" : "Inactif")
    }
  ];

  const collectionDate = formatCollectionDateFr(reportEndDate || client?.reportEndDate);
  const clientLine = buildClientLine(client, clientPrefix, clientMainLabel);

  return (
    <div className={execStyles.executiveRoot}>
      <header className={execStyles.executiveHeader}>
        <h3 className={execStyles.executiveTitle}>Synthèse des services & cybersécurité</h3>
        <p className={execStyles.executiveClient}>{clientLine}</p>
        <div className={execStyles.executiveMeta}>
          {collectionDate ? <span className={execStyles.executivePeriod}>{collectionDate}</span> : null}
          <span className={execStyles.executiveBadge}>État à la dernière collecte</span>
        </div>
      </header>

      <section>
        <h4 className={execStyles.overviewTitle}>Vue d&apos;ensemble</h4>
        <div className={execStyles.overviewGrid}>
          {hasAntivirus ? (
            <article className={execStyles.overviewCard}>
              <div className={execStyles.overviewCardHead}>
                <IconifyIcon icon="mdi:shield-check" width={16} height={16} color="#059669" />
                Antivirus
              </div>
              <div className={`${execStyles.overviewCardValue} ${antivirusStats.unmanaged > 0 ? execStyles.overviewCardValueWarn : execStyles.overviewCardValueOk}`}>
                {formatPct(antivirusStats.managementRate)}
              </div>
              <div className={execStyles.overviewCardHint}>
                {antivirusStats.managed} postes gérés sur {antivirusStats.totalEndpoints} inventoriés
              </div>
            </article>
          ) : null}

          {hasAntispam ? (
            <article className={execStyles.overviewCard}>
              <div className={execStyles.overviewCardHead}>
                <IconifyIcon icon="mdi:email-alert" width={16} height={16} color="#ea580c" />
                Antispam
              </div>
              <div className={execStyles.overviewCardValue}>{antispamStats.solutionName}</div>
              <div className={execStyles.overviewCardHint}>
                {antispamStats.hasStats ? `${formatInt(antispamStats.protectedUsers)} utilisateurs protégés` : "Statistiques non disponibles"}
              </div>
            </article>
          ) : null}

          {hasOffice ? (
            <article className={execStyles.overviewCard}>
              <div className={execStyles.overviewCardHead}>
                <IconifyIcon icon="mdi:microsoft-office" width={16} height={16} color="#2563eb" />
                Microsoft 365
              </div>
              <div className={execStyles.overviewCardValue}>{formatInt(o365Data?.usersCount || 0)} utilisateurs</div>
              <div className={execStyles.overviewCardHint}>
                {formatInt(o365Data?.licenseTypes || 0)} types de licences suivis
              </div>
            </article>
          ) : null}

          {hasOffice ? (
            <article className={execStyles.overviewCard}>
              <div className={execStyles.overviewCardHead}>
                <IconifyIcon icon="mdi:shield-key-outline" width={16} height={16} color="#7c3aed" />
                Sécurité M365
              </div>
              <div
                className={`${execStyles.overviewCardValue} ${(o365Data?.mfa?.userRate ?? 100) < 50 ? execStyles.overviewCardValueWarn : execStyles.overviewCardValueOk}`}
              >
                {formatPct(o365Data?.mfa?.globalRate)} MFA
              </div>
              <div className={execStyles.overviewCardHint}>
                {o365Data?.mfa?.nonAdminWithMFA || 0} utilisateurs sur {o365Data?.mfa?.nonAdminTotal || 0} hors
                administrateurs
              </div>
            </article>
          ) : null}
        </div>
      </section>

      <p className={execStyles.synthesisBlock}>
        <span className={execStyles.synthesisLabel}>Synthèse :</span> {synthesisText}
      </p>

      <section className={execStyles.sectionBlock}>
        <h4 className={execStyles.sectionHeading}>Points à surveiller</h4>
        <p className={`${execStyles.sectionLead} ${watchPoints.length === 0 ? execStyles.sectionLeadOk : ""}`.trim()}>
          <IconifyIcon icon={watchPoints.length > 0 ? "mdi:alert" : "mdi:check-circle"} width={16} height={16} />
          {watchPoints.length > 0
            ? "Éléments nécessitant une attention"
            : "Aucun point de vigilance détecté"}
        </p>
        {watchPoints.length > 0 ? (
          <div className={styles.watchList}>
            {watchPoints.map(point => (
              <article key={point.id} className={styles.watchCard}>
                <h5 className={styles.watchCardTitle}>{point.title}</h5>
                <p className={styles.watchCardBody}>{point.body}</p>
                {point.action ? <p className={styles.watchCardAction}>{point.action}</p> : null}
              </article>
            ))}
          </div>
        ) : null}
        {showAgentConsistencyNote ? (
          <p className={styles.watchNote}>
            Important : les points liés aux agents antivirus doivent être vérifiés avant publication. Les données
            indiquent {antivirusStats.managed} postes gérés, mais également {antivirusStats.disconnected} agents non
            vus depuis plus de 24 h. Cette combinaison peut correspondre à un problème de collecte, de remontée ou de
            définition des indicateurs.
          </p>
        ) : null}
      </section>

      {hasAntivirus ? (
        <section className={execStyles.sectionBlock}>
          <h4 className={execStyles.sectionHeading}>Antivirus</h4>
          <div className={styles.serviceCard}>
            <div className={styles.serviceHead}>
              <div className={styles.serviceIdentity}>
                <span className={`${styles.serviceIcon} ${antivirusStats.unmanaged > 0 ? styles.serviceIconWarn : ""}`}>
                  <IconifyIcon icon="mdi:shield-check" width={22} height={22} />
                </span>
                <div>
                  <p className={styles.serviceName}>{antivirusStats.solutionName}</p>
                  <p className={styles.serviceSubtitle}>Protection des postes et serveurs</p>
                </div>
              </div>
              <span className={antivirusStats.unmanaged > 0 ? styles.serviceBadgeWarn : styles.serviceBadge}>
                {antivirusStats.unmanaged > 0
                  ? `${antivirusStats.unmanaged} poste${antivirusStats.unmanaged > 1 ? "s" : ""} non géré${antivirusStats.unmanaged > 1 ? "s" : ""}`
                  : "Couverture complète"}
              </span>
            </div>
            <div className={`${styles.metricGrid} ${styles.metricGrid4}`}>
              <Metric label="Postes inventoriés" value={formatInt(antivirusStats.totalEndpoints)} />
              <Metric label="Postes gérés" value={formatInt(antivirusStats.managed)} />
              <Metric label="Postes non gérés" value={formatInt(antivirusStats.unmanaged)} />
              <Metric label="Taux de couverture" value={formatPct(antivirusStats.managementRate)} />
            </div>
            <h5 className={execStyles.detailSectionTitle}>État des agents</h5>
            <div className={styles.metricGrid}>
              <Metric label="Agents vus depuis moins de 24 h" value={formatInt(antivirusStats.connected)} />
              <Metric label="Agents sans remontée depuis plus de 24 h" value={formatInt(antivirusStats.disconnected)} />
            </div>
            {showAgentConsistencyNote ? (
              <p className={execStyles.sectionFootnote}>
                Ces indicateurs doivent être vérifiés : leur cohérence avec le nombre de postes gérés est à confirmer.
              </p>
            ) : null}
            {antivirusStats.licenseTotal > 0 ? (
              <>
                <h5 className={execStyles.detailSectionTitle}>Licences</h5>
                <div className={styles.metricGrid}>
                  <Metric
                    label={antivirusStats.solutionName}
                    value={`${formatInt(antivirusStats.licenseUsed)} / ${formatInt(antivirusStats.licenseTotal)}`}
                    hint={`${formatInt(antivirusStats.licenseUsed)} licences utilisées sur ${formatInt(antivirusStats.licenseTotal)} licences disponibles.`}
                  />
                </div>
              </>
            ) : null}
          </div>
        </section>
      ) : null}

      {hasAntispam ? (
        <section className={execStyles.sectionBlock}>
          <h4 className={execStyles.sectionHeading}>Antispam</h4>
          <div className={styles.serviceCard}>
            <div className={styles.serviceHead}>
              <div className={styles.serviceIdentity}>
                <span className={`${styles.serviceIcon} ${styles.serviceIconWarn}`}>
                  <IconifyIcon icon="mdi:email-outline" width={22} height={22} />
                </span>
                <div>
                  <p className={styles.serviceName}>{antispamStats.solutionName}</p>
                  <p className={styles.serviceSubtitle}>Protection des messageries</p>
                </div>
              </div>
              <span className={styles.serviceBadgeMuted}>Suivi actif</span>
            </div>
            <div className={styles.metricGrid}>
              <Metric label="Utilisateurs protégés" value={formatInt(antispamStats.protectedUsers)} />
              <Metric label="Domaines / licences" value={formatInt(antispamStats.domainsOrLicenses)} />
            </div>
            {!antispamStats.hasStats ? (
              <p className={execStyles.sectionFootnote}>
                Les statistiques de filtrage des e-mails ne sont pas disponibles sur la période.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {hasOffice && o365Data ? (
        <section className={execStyles.sectionBlock}>
          <h4 className={execStyles.sectionHeading}>Microsoft 365</h4>
          <div className={styles.serviceCard}>
            <h5 className={execStyles.detailSectionTitle}>Licences & utilisateurs</h5>
            <div className={styles.metricGrid}>
              <Metric label="Utilisateurs" value={formatInt(o365Data.usersCount)} />
              <Metric label="Types de licences" value={formatInt(o365Data.licenseTypes)} />
            </div>

            {o365Data.licenses.length > 0 ? (
              <div className={execStyles.watchTableWrap}>
                <table className={execStyles.watchTable}>
                  <thead>
                    <tr>
                      <th>Licence</th>
                      <th>Utilisées</th>
                      <th>Total</th>
                      <th>Disponibles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {o365Data.licenses.map((lic, idx) => {
                      const total = Number(lic.total || lic.nombre || 0) || 0;
                      const used = Number(lic.utilisees || lic.used || 0) || 0;
                      return (
                        <tr key={lic.skuId || lic.id || `${lic.name || "lic"}-${idx}`}>
                          <td>{getLicenseDisplayName(lic) || lic.name || lic.nom || "—"}</td>
                          <td>{formatInt(used)}</td>
                          <td>{formatInt(total)}</td>
                          <td>{formatInt(Math.max(0, total - used))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}

            {o365Data.microsoftDomains.length > 0 ? (
              <>
                <h5 className={execStyles.detailSectionTitle}>Domaines Microsoft 365</h5>
                <ul className={styles.simpleList}>
                  {o365Data.microsoftDomains.map(domain => (
                    <li key={domain}>{domain}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>

          <div className={styles.serviceCard}>
            <h5 className={execStyles.detailSectionTitle}>Usage des services</h5>

            {exchange ? (
              <div className={styles.usageBlock}>
                <p className={styles.usageTitle}>
                  <IconifyIcon icon="mdi:email-outline" width={18} height={18} />
                  Exchange
                </p>
                <div className={`${styles.metricGrid} ${styles.metricGrid4}`}>
                  <Metric
                    label="E-mails reçus"
                    value={formatInt(exchange.emailActivity?.received)}
                    hint="Sur la période"
                  />
                  <Metric label="Boîtes mail" value={formatInt(exchange.mailboxes?.total)} />
                  <Metric label="Espace utilisé" value={exchange.mailboxes?.totalSize || "—"} />
                  <Metric
                    label="Taux de lecture"
                    value={
                      typeof exchange.emailActivity?.readRate === "number"
                        ? formatPct(exchange.emailActivity.readRate)
                        : "—"
                    }
                  />
                </div>
                {typeof exchange.emailActivity?.sent === "number" ? (
                  <p className={execStyles.sectionFootnote}>
                    {formatInt(exchange.emailActivity.sent)} e-mails envoyés sur la période.
                  </p>
                ) : null}
              </div>
            ) : null}

            {teams ? (
              <div className={styles.usageBlock}>
                <p className={styles.usageTitle}>
                  <IconifyIcon icon="mdi:microsoft-teams" width={18} height={18} />
                  Microsoft Teams
                </p>
                <div className={`${styles.metricGrid} ${styles.metricGrid4}`}>
                  <Metric
                    label="Utilisateurs"
                    value={formatInt(teamsUsage.licensedUsers || teams?.teams?.users || 0)}
                    hint={`${formatInt(teamsUsage.activeUsers ?? teams?.teams?.activeUsers ?? 0)} actifs sur la période`}
                  />
                  <Metric label="Réunions" value={formatInt(teamsMeetings.total || 0)} />
                  <Metric
                    label="Messages"
                    value={formatInt(teamsMessages.channel || teamsMessages.total || 0)}
                    hint="Messages de canal"
                  />
                  <Metric
                    label="Durée des appels"
                    value={teamsCalls.totalDuration || teamsCalls.duration || teamsCalls.totalTime || "—"}
                  />
                </div>
              </div>
            ) : null}

            {o365Data.onedriveData && o365Data.onedriveData.success !== false ? (
              <div className={styles.usageBlock}>
                <p className={styles.usageTitle}>
                  <IconifyIcon icon="mdi:microsoft-onedrive" width={18} height={18} />
                  OneDrive
                </p>
                <div className={styles.metricGrid}>
                  <Metric label="Espace utilisé" value={o365Data.onedriveData.storage?.totalUsed || "—"} />
                  <Metric
                    label="Nombre de fichiers"
                    value={formatInt(o365Data.onedriveData.storage?.totalFiles)}
                  />
                </div>
              </div>
            ) : null}

            {o365Data.sharepointData && o365Data.sharepointData.success !== false ? (
              <div className={styles.usageBlock}>
                <p className={styles.usageTitle}>
                  <IconifyIcon icon="mdi:microsoft-sharepoint" width={18} height={18} />
                  SharePoint
                </p>
                <div className={styles.metricGrid}>
                  <Metric label="Sites SharePoint référencés" value={formatInt(sharepointSites.length)} />
                </div>
                <p className={execStyles.sectionFootnote}>
                  La liste détaillée des sites et leurs URLs est disponible dans le détail technique.
                </p>
              </div>
            ) : null}
          </div>

          <div className={styles.serviceCard}>
            <div className={styles.serviceHead}>
              <div className={styles.serviceIdentity}>
                <span className={`${styles.serviceIcon} ${styles.serviceIconPurple}`}>
                  <IconifyIcon icon="mdi:shield-key-outline" width={22} height={22} />
                </span>
                <div>
                  <p className={styles.serviceName}>Microsoft 365 — Sécurité</p>
                  <p className={styles.serviceSubtitle}>État de la sécurité</p>
                </div>
              </div>
            </div>
            <div className={`${styles.metricGrid} ${styles.metricGrid4}`}>
              <Metric
                label="Secure Score"
                value={scoreCurrent != null && scoreMax != null ? `${formatInt(scoreCurrent)} / ${formatInt(scoreMax)}` : "—"}
                hint={scorePct != null ? `${formatPct(scorePct)} des points obtenus` : null}
              />
              <Metric
                label="MFA global"
                value={formatPct(o365Data.mfa.globalRate)}
                hint={`${formatInt(o365Data.mfa.usersWithMFA)} comptes sur ${formatInt(o365Data.mfa.totalUsers)}`}
              />
              <Metric
                label="MFA administrateurs"
                value={formatPct(o365Data.mfa.adminRate)}
                hint={`${formatInt(o365Data.mfa.adminsWithMFA)} comptes sur ${formatInt(o365Data.mfa.adminsTotal)}`}
              />
              <Metric
                label="MFA utilisateurs"
                value={formatPct(o365Data.mfa.userRate)}
                hint={`${formatInt(o365Data.mfa.nonAdminWithMFA)} comptes sur ${formatInt(o365Data.mfa.nonAdminTotal)}`}
              />
            </div>
            <h5 className={execStyles.detailSectionTitle}>Points de sécurité à suivre</h5>
            <div className={execStyles.watchTableWrap}>
              <table className={execStyles.watchTable}>
                <thead>
                  <tr>
                    <th>Indicateur</th>
                    <th>État</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>MFA administrateurs</td>
                    <td>{formatPct(o365Data.mfa.adminRate)}</td>
                  </tr>
                  <tr>
                    <td>MFA utilisateurs</td>
                    <td>{formatPct(o365Data.mfa.userRate)}</td>
                  </tr>
                  <tr>
                    <td>Secure Score</td>
                    <td>{formatPct(scorePct)}</td>
                  </tr>
                  <tr>
                    <td>Recommandations de sécurité</td>
                    <td>
                      {o365Data.securityRecommendations.length > 0
                        ? `${formatInt(o365Data.securityRecommendations.length)} recommandation(s)`
                        : "Aucune donnée remontée"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className={execStyles.sectionFootnote}>
              Lecture : les comptes administrateurs sont protégés par MFA. Le déploiement du MFA sur les comptes
              utilisateurs reste un sujet à suivre.
            </p>
          </div>
        </section>
      ) : null}

      {hasDomains ? (
        <section className={execStyles.sectionBlock}>
          <h4 className={execStyles.sectionHeading}>Noms de domaine</h4>
          <p className={execStyles.perimeterLead}>Domaines suivis</p>
          {domains.length === 0 ? (
            <p className={execStyles.sectionFootnote}>Aucun nom de domaine enregistré.</p>
          ) : (
            domains.map((domain, idx) => {
              const name = domain.nom || domain.name || domain.domaine || `Domaine ${idx + 1}`;
              const expiration = domain.expiration || domain.expiry || domain.dateExpiration;
              const remaining = daysUntil(expiration);
              const registrar = domain.registrar || domain.registrarName || "—";
              const nearExpiry = remaining != null && remaining <= 90;
              return (
                <div key={domain.id || `${name}-${idx}`} className={styles.domainRow}>
                  <div>
                    <div className={styles.domainName}>{name}</div>
                    <div className={styles.domainMeta}>
                      {registrar} · {remaining != null && remaining < 0 ? "Expiré" : "Domaine actif"}
                      {nearExpiry ? " · Expiration proche" : ""}
                    </div>
                  </div>
                  <div className={nearExpiry ? styles.domainExpiry : styles.domainMeta}>
                    {expiration ? `Expiration : ${formatDateFr(expiration)}` : "Expiration non renseignée"}
                  </div>
                </div>
              );
            })
          )}
        </section>
      ) : null}

      <section className={execStyles.sectionBlock} data-export-hide="true">
        <button
          type="button"
          className={execStyles.detailToggle}
          onClick={() => setShowTechnicalDetail(prev => !prev)}
          aria-expanded={showTechnicalDetail}
        >
          <IconifyIcon icon={showTechnicalDetail ? "mdi:chevron-up" : "mdi:chevron-down"} width={18} height={18} />
          {showTechnicalDetail ? "Masquer le détail technique" : "Voir le détail technique"}
        </button>
        {showTechnicalDetail ? (
          <div className={execStyles.detailPanel}>
            {hasAntivirus ? (
              <div>
                <h5 className={execStyles.detailSectionTitle}>Endpoints antivirus</h5>
                <ReportTableBlock
                  title={null}
                  columns={endpointDetailColumns}
                  rows={endpointRows}
                  emptyMessage="Aucun endpoint antivirus à afficher."
                />
              </div>
            ) : null}
            {sharepointSites.length > 0 ? (
              <div>
                <h5 className={execStyles.detailSectionTitle}>Sites SharePoint</h5>
                <ReportTableBlock
                  title={null}
                  columns={[
                    { id: "name", label: "Site", render: row => row.displayName || row.name || "—" },
                    { id: "url", label: "URL", render: row => row.webUrl || row.url || "—" }
                  ]}
                  rows={sharepointSites.map((site, idx) => ({ ...site, _rowKey: site.id || site.webUrl || idx }))}
                  emptyMessage={null}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
