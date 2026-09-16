import React, { useMemo } from "react";
import { Icon as IconifyIcon } from "@iconify/react";
import infraStyles from "./ReportSummaryInfrastructure.module.css";
import cyberStyles from "./ReportSummaryCybersecurity.module.css";
import { REPORT_CYBER_MODULES, sumEquipmentCountsForModules } from "./reportCategoryCounts";
import { ReportCategoryKpisBlock, ReportSummaryIntro, ReportSummarySection, ReportTableBlock } from "./ReportSummaryBlocks";
import { buildAntivirusEndpointRowsForClient, buildAntivirusPolicyRowsForClient, getAntivirusSolutionName } from "./reportCyberTableUtils";
import { formatAntivirusEndpointType } from "../../../EnterprisesPage/antivirusSolutionUtils";
import { formatServeurLieLabel, pickBackupJobType, pickBackupJobDestination } from "../../../EnterprisesPage/backupJobUtils";
import { getBackupJobStatus, getBackupJobStatusTitle, normalizeBackupJobForStatus } from "../../../CybersecuritePage/backupJobStatusUtils";
function scrollToReportComments() {
  if (typeof document === "undefined") return;
  const target = document.querySelector("[data-export-comments='true']");
  if (target && typeof target.scrollIntoView === "function") {
    target.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}
function formatPercent(value) {
  if (value == null || Number.isNaN(Number(value))) return "-";
  return `${Number(value).toFixed(1)} %`;
}
function formatInt(value) {
  if (value == null || Number.isNaN(Number(value))) return "-";
  return Number(value).toLocaleString("fr-FR");
}
function formatDateBackup(raw) {
  if (!raw) return "-";
  try {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? String(raw) : d.toLocaleDateString("fr-FR");
  } catch {
    return String(raw);
  }
}
function isDateExpired(raw) {
  if (!raw) return false;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < now;
}
function normalizeStorageKey(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, "").replace(/^(nas|san|disque)-/, "");
}
function extractIpv4(value) {
  const match = String(value || "").match(/\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/);
  return match ? match[0] : "";
}
function formatDateTimeBackup(raw) {
  if (!raw) return "-";
  try {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? String(raw) : d.toLocaleString("fr-FR");
  } catch {
    return String(raw);
  }
}
function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("fr-FR");
}
function getProtectionStatusMeta(rawStatus) {
  const s = String(rawStatus || "").trim().toLowerCase();
  if (!s) {
    return {
      icon: "mdi:help-circle-outline",
      color: "#9ca3af",
      label: "-"
    };
  }
  const protectedHit = s.includes("protected") || s.includes("protégé") || s.includes("protege") || s.includes("active") || s.includes("enabled") || s.includes("ok");
  const unprotectedHit = s.includes("unprotected") || s.includes("non prot") || s.includes("not protected") || s.includes("inactive") || s.includes("disabled") || s.includes("off");
  if (protectedHit && !unprotectedHit) {
    return {
      icon: "mdi:shield-check",
      color: "#16a34a",
      label: rawStatus
    };
  }
  if (unprotectedHit) {
    return {
      icon: "mdi:shield-off-outline",
      color: "#ef4444",
      label: rawStatus
    };
  }
  return {
    icon: "mdi:shield-outline",
    color: "#6b7280",
    label: rawStatus
  };
}
function getBackupStatusLabel(status) {
  const s = String(status || "").toLowerCase();
  if (s === "ok" || s === "success") return "OK";
  if (s === "warning") return "Retard";
  if (s === "critical" || s === "fail" || s === "failed" || s === "error") return "Erreur";
  if (s === "hycu") return "HYCU";
  if (s === "unmapped") return "Non mappé";
  if (s === "inactive") return "Inactif";
  if (s === "running") return "En cours";
  return status ? String(status) : "-";
}
function formatAntispamExpiration(sol) {
  if (!sol) return "-";
  const raw = sol.expiration ?? sol.expirityDate ?? null;
  if (!raw) return "-";
  try {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? String(raw) : d.toLocaleDateString("fr-FR");
  } catch {
    return String(raw);
  }
}
function getEndpointLastSeenSummary(endpoint) {
  const raw = endpoint.lastSeen || endpoint.lastCheckIn || endpoint.lastConnectedAt || endpoint.lastSeenDate || null;
  if (!raw) {
    return {
      label: "N/A",
      isOver24h: false
    };
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    return {
      label: String(raw),
      isOver24h: false
    };
  }
  const diffHours = (Date.now() - d.getTime()) / (1000 * 60 * 60);
  const isOver24h = diffHours > 24;
  return {
    label: d.toLocaleString("fr-FR"),
    isOver24h
  };
}
function getEndpointTypeIcon(endpoint) {
  const machineType = endpoint.machineType;
  if (machineType === 2) {
    return "fa-solid:cube";
  }
  if (machineType === 1) {
    return "mdi:laptop";
  }
  return "fa-solid:desktop";
}
function getOsIconForEndpoint(endpoint) {
  const osRaw = (endpoint.operatingSystem || endpoint.os || "").toLowerCase();
  if (!osRaw) return null;
  if (osRaw.includes("windows")) return "mdi:microsoft-windows";
  if (osRaw.includes("debian")) return "logos:debian";
  if (osRaw.includes("ubuntu")) return "logos:ubuntu";
  if (osRaw.includes("centos")) return "logos:centos";
  if (osRaw.includes("red hat") || osRaw.includes("rhel")) return "logos:redhat-icon";
  if (osRaw.includes("suse")) return "logos:suse";
  if (osRaw.includes("proxmox")) return "logos:proxmox";
  if (osRaw.includes("esxi") || osRaw.includes("vmware")) return "logos:vmware";
  if (osRaw.includes("linux")) return "logos:linux-tux";
  return "mdi:server";
}
function isEndpointInfected(endpoint) {
  return endpoint.isInfected === true || endpoint.malwareDetected === true || endpoint.hasThreat === true;
}
function isEndpointInactive(endpoint) {
  const managed = endpoint.isManaged === true || endpoint.managed === true;
  return endpoint.endpointState !== 1 && !managed;
}
function getBackupStatusTone(status) {
  const s = String(status || "").toLowerCase();
  if (s === "ok" || s === "success") return "success";
  if (s === "warning") return "warn";
  if (s === "critical" || s === "fail" || s === "failed" || s === "error") return "error";
  if (s === "running") return "info";
  return "neutral";
}
function BackupStatusBadge({
  status
}) {
  const tone = getBackupStatusTone(status);
  const toneClass = tone === "success" ? cyberStyles.statusSuccess : tone === "warn" ? cyberStyles.statusWarn : tone === "error" ? cyberStyles.statusError : tone === "info" ? cyberStyles.statusInfo : cyberStyles.statusNeutral;
  return <span className={`${cyberStyles.statusBadge} ${toneClass}`} title={getBackupJobStatusTitle(status) || undefined}>
      {getBackupStatusLabel(status)}
    </span>;
}
function CyberReportTable(props) {
  return <ReportTableBlock {...props} emptyMessage={props.emptyMessage ?? "Aucune donnée."} />;
}
function CyberCategoryKpisBlock(props) {
  return <ReportCategoryKpisBlock {...props} />;
}
function CyberNotificationLegend({
  commentTotal = 0,
  ticketTotal = 0
}) {
  return <div className={infraStyles.notificationLegend}>
      <span className={infraStyles.notificationLegendText}>
        Notification :
      </span>
      <span className={infraStyles.notificationLegendItem}>
        <span className={`${infraStyles.notificationDot} ${infraStyles.notificationDotComment}`}>
          {commentTotal}
        </span>
        Commentaires
      </span>
      <span className={infraStyles.notificationLegendItem}>
        <span className={`${infraStyles.notificationDot} ${infraStyles.notificationDotTicket}`}>
          {ticketTotal}
        </span>
        Tickets créés
      </span>
    </div>;
}
export default function ReportSummaryCybersecurity({
  client,
  equipmentCheckMKData = {},
  equipmentComments = {},
  equipmentCommentCounts = {},
  equipmentTicketCounts = {},
  includeSections = null,
  embedded = false,
  documentTitle = null,
  clientPrefix = "",
  clientMainLabel = "",
  periodLabel = ""
}) {
  const sauvegardeInstances = useMemo(() => {
    const raw = client?.equipements?.Sauvegarde;
    if (!raw) return [];
    const instances = Array.isArray(raw.instances) ? raw.instances : [];
    return instances;
  }, [client]);
  const sauvegardeStandardInstances = useMemo(() => sauvegardeInstances.filter(inst => inst.logiciel !== "Active Backup for Microsoft 365" && inst.logiciel !== "HyperBackup"), [sauvegardeInstances]);
  const sauvegardeActiveBackupInstances = useMemo(() => sauvegardeInstances.filter(inst => inst.logiciel === "Active Backup for Microsoft 365"), [sauvegardeInstances]);
  const sauvegardeHyperBackupInstances = useMemo(() => sauvegardeInstances.filter(inst => inst.logiciel === "HyperBackup"), [sauvegardeInstances]);
  const antivirusSolutions = useMemo(() => {
    const raw = client?.equipements?.Antivirus;
    if (!raw) return [];
    if (Array.isArray(raw.solutions)) return raw.solutions;
    if (Array.isArray(raw)) return raw;
    return [];
  }, [client]);
  const antispamSolutions = useMemo(() => {
    const raw = client?.equipements?.Antispam;
    if (!raw) return [];
    if (Array.isArray(raw.solutions)) return raw.solutions;
    if (Array.isArray(raw)) return raw;
    return [];
  }, [client]);
  const antivirusStats = useMemo(() => {
    let totalEndpoints = 0;
    let disconnected = 0;
    let managed = 0;
    let unmanaged = 0;
    const osCounts = {};
    antivirusSolutions.forEach(sol => {
      const list = sol.syncData?.endpoints?.list ?? sol.endpoints ?? (Array.isArray(sol.data?.endpoints) ? sol.data.endpoints : sol.data?.endpoints?.list ?? []);
      const arr = Array.isArray(list) ? list : [];
      totalEndpoints += arr.length;
      arr.forEach(ep => {
        const isManaged = ep.isManaged === true || ep.managed === true || ep.endpointState === 1;
        if (isManaged) managed += 1;else unmanaged += 1;
        const osRaw = ep.operatingSystem || ep.os || "";
        const osKey = osRaw ? String(osRaw).trim() : "Unknown";
        osCounts[osKey] = (osCounts[osKey] || 0) + 1;
        const lastSeen = ep.lastSeen ?? ep.lastCheckIn ?? ep.lastConnectedAt;
        if (!lastSeen) {
          disconnected += 1;
          return;
        }
        const d = new Date(lastSeen);
        if (Number.isNaN(d.getTime())) {
          disconnected += 1;
          return;
        }
        const diff = Date.now() - d.getTime();
        if (diff > 24 * 60 * 60 * 1000) {
          disconnected += 1;
        }
      });
    });
    const connected = totalEndpoints - disconnected;
    const connectedRate = totalEndpoints > 0 ? Math.round(connected / totalEndpoints * 1000) / 10 : null;
    const managementRate = totalEndpoints > 0 ? Math.round(managed / totalEndpoints * 1000) / 10 : null;
    return {
      totalEndpoints,
      connected,
      disconnected,
      connectedRate,
      managed,
      unmanaged,
      managementRate,
      osCounts
    };
  }, [antivirusSolutions]);
  const antispamDetail = useMemo(() => {
    const users = [];
    const stats = [];
    let totalProtectedUsersFromLicenses = 0;
    let hasProtectedUsersFromLicenses = false;
    const totals = {
      valid: 0,
      infected: 0,
      spam: 0,
      banned: 0,
      spearphishing: 0,
      pending: 0,
      total: 0
    };
    antispamSolutions.forEach(sol => {
      const data = sol && typeof sol.data === "object" && sol.data !== null ? sol.data : sol || {};
      const solutionName = sol.nom || sol.logiciel || sol.solution || sol.name || "Antispam";
      const protectedUsersFromLicense = sol.utilisateursProteges ?? sol.utilisateurs ?? sol.nombre_utilisateurs ?? null;
      if (protectedUsersFromLicense != null && !Number.isNaN(Number(protectedUsersFromLicense))) {
        totalProtectedUsersFromLicenses += Number(protectedUsersFromLicense);
        hasProtectedUsersFromLicenses = true;
      }
      if (Array.isArray(data.usersData)) {
        data.usersData.forEach(u => {
          users.push({
            ...u,
            _solutionName: solutionName
          });
        });
      }
      if (Array.isArray(data.statsData)) {
        data.statsData.forEach(s => {
          const stat = {
            ...s,
            _solutionName: solutionName
          };
          stats.push(stat);
          totals.valid += Number(stat.valid || 0);
          totals.infected += Number(stat.infected || 0);
          totals.spam += Number(stat.spam || 0);
          totals.banned += Number(stat.banned || 0);
          totals.spearphishing += Number(stat.spearphishing || 0);
          totals.pending += Number(stat.pending || 0);
          totals.total += Number(stat.total || 0);
        });
      }
    });
    const totalProtectedUsers = hasProtectedUsersFromLicenses ? totalProtectedUsersFromLicenses : users.length;
    const totalSpam = totals.spam;
    const totalBlocked = totals.infected + totals.banned + totals.spearphishing;
    const totalMalicious = totalSpam + totalBlocked;
    return {
      users,
      stats,
      totals,
      totalProtectedUsers,
      totalSpam,
      totalBlocked,
      totalMalicious
    };
  }, [antispamSolutions]);
  const modules = client?.modules_monitoring || {};
  const sectionSet = Array.isArray(includeSections) && includeSections.length
    ? new Set(includeSections.map(s => String(s).toLowerCase()))
    : null;
  const showSection = key => !sectionSet || sectionSet.has(String(key).toLowerCase());
  const isAntivirusActive = showSection("antivirus") && (!!modules.Antivirus || antivirusSolutions.length > 0);
  const isAntispamActive = showSection("antispam") && (!!modules.Antispam || antispamSolutions.length > 0);
  const isBackupActive = showSection("backup") && (!!modules.Backup || sauvegardeInstances.length > 0);
  const showLegend = !sectionSet;
  const storageIpByName = useMemo(() => {
    const sources = [...(Array.isArray(client?.equipements?.NAS) ? client.equipements.NAS : []), ...(Array.isArray(client?.equipements?.SAN) ? client.equipements.SAN : []), ...(Array.isArray(client?.equipements?.Storage) ? client.equipements.Storage : [])];
    const map = {};
    sources.forEach(item => {
      const name = item?.nom || item?.name || item?.hostname || item?.designation || "";
      const key = normalizeStorageKey(name);
      const ip = item?.ip || item?.adresseIP || item?.address || item?.raw?.ip || item?.raw?.adresseIP || "";
      const parsedIp = extractIpv4(ip || name);
      if (key && parsedIp && !map[key]) {
        map[key] = parsedIp;
      }
    });
    return map;
  }, [client]);
  const cyberCommentTotal = useMemo(() => sumEquipmentCountsForModules(equipmentCommentCounts, REPORT_CYBER_MODULES, equipmentComments), [equipmentCommentCounts, equipmentComments]);
  const cyberTicketTotal = useMemo(() => sumEquipmentCountsForModules(equipmentTicketCounts, REPORT_CYBER_MODULES, equipmentComments), [equipmentTicketCounts, equipmentComments]);
  const backupKpis = useMemo(() => {
    const totalJobs = sauvegardeInstances.reduce((acc, inst) => acc + (Array.isArray(inst.jobs) ? inst.jobs.length : 0), 0);
    let vigilance = 0;
    sauvegardeInstances.forEach(inst => {
      const jobs = Array.isArray(inst.jobs) ? inst.jobs : [];
      jobs.forEach(job => {
        const status = String(getBackupJobStatus(normalizeBackupJobForStatus(job, inst)) || "").toLowerCase();
        if (status === "warning" || status === "critical" || status === "fail" || status === "failed" || status === "error") {
          vigilance += 1;
        }
      });
    });
    return [{
      label: "Instances",
      value: sauvegardeInstances.length,
      icon: "mdi:database-sync",
      iconColor: "#2563eb"
    }, {
      label: "Jobs",
      value: totalJobs,
      icon: "mdi:briefcase-clock-outline",
      iconColor: "#0891b2"
    }, {
      label: "Points de vigilance",
      value: vigilance,
      icon: "mdi:eye-outline",
      iconColor: vigilance > 0 ? "#b45309" : "#059669"
    }, {
      label: "Tickets",
      value: cyberTicketTotal,
      icon: "mdi:ticket-outline",
      iconColor: "#7c3aed"
    }];
  }, [sauvegardeInstances, cyberTicketTotal]);
  const antivirusKpis = useMemo(() => [{
    label: "Postes inventoriés",
    value: antivirusStats.totalEndpoints || 0,
    icon: "mdi:laptop"
  }, {
    label: "Postes gérés",
    value: antivirusStats.managed || 0,
    icon: "mdi:check-circle-outline"
  }, {
    label: "Postes non gérés",
    value: antivirusStats.unmanaged || 0,
    icon: "mdi:alert-circle-outline"
  }, {
    label: "Taux de gestion AV",
    value: antivirusStats.managementRate != null ? `${Number(antivirusStats.managementRate).toFixed(1)} %` : "N/A",
    icon: "mdi:percent"
  }], [antivirusStats]);
  const antivirusConnectionKpis = useMemo(() => [{
    label: "Déconnectés > 24h",
    value: antivirusStats.disconnected || 0,
    icon: "mdi:lan-disconnect"
  }, {
    label: "Taux vus < 24h",
    value: antivirusStats.connectedRate != null ? `${Number(antivirusStats.connectedRate).toFixed(1)} %` : "N/A",
    icon: "mdi:clock-check-outline"
  }], [antivirusStats]);
  const antivirusOsKpis = useMemo(() => {
    const entries = Object.entries(antivirusStats.osCounts || {}).sort((a, b) => (b[1] || 0) - (a[1] || 0)).slice(0, 6);
    return entries.map(([os, count]) => ({
      label: `OS: ${os}`,
      value: count || 0,
      icon: "mdi:monitor-dashboard"
    }));
  }, [antivirusStats]);
  const antispamKpis = useMemo(() => [{
    label: "Total emails",
    value: antispamDetail.totals.total || 0,
    icon: "mdi:email"
  }, {
    label: "Emails valides",
    value: antispamDetail.totals.valid || 0,
    icon: "mdi:check-circle"
  }, {
    label: "Spam",
    value: antispamDetail.totals.spam || 0,
    icon: "mdi:email-alert"
  }, {
    label: "Bloqués",
    value: (antispamDetail.totals.infected || 0) + (antispamDetail.totals.banned || 0) + (antispamDetail.totals.spearphishing || 0),
    icon: "mdi:shield-lock"
  }, {
    label: "Spearphishing",
    value: antispamDetail.totals.spearphishing || 0,
    icon: "mdi:target-account"
  }, {
    label: "En attente",
    value: antispamDetail.totals.pending || 0,
    icon: "mdi:timer-sand"
  }], [antispamDetail]);
  const antispamStatsByWeek = useMemo(() => {
    const parsePeriodDate = rawPeriod => {
      if (!rawPeriod) return null;
      const raw = String(rawPeriod).trim();
      const direct = new Date(raw);
      if (!Number.isNaN(direct.getTime())) return direct;
      const fr = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (fr) {
        const [, dd, mm, yyyy] = fr;
        const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
        if (!Number.isNaN(d.getTime())) return d;
      }
      const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (iso) {
        const [, yyyy, mm, dd] = iso;
        const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
        if (!Number.isNaN(d.getTime())) return d;
      }
      return null;
    };
    const getWeekKey = rawPeriod => {
      const d = parsePeriodDate(rawPeriod);
      if (!d) return "Unknown period";
      const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const dayNum = date.getUTCDay() || 7;
      date.setUTCDate(date.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
      return `Semaine ${weekNo} - ${date.getUTCFullYear()}`;
    };
    const buckets = {};
    (antispamDetail.stats || []).forEach(s => {
      const weekKey = getWeekKey(s.period);
      const solutionName = s._solutionName || "Antispam";
      const bucketKey = `${solutionName}::${weekKey}`;
      if (!buckets[bucketKey]) {
        buckets[bucketKey] = {
          solutionName,
          period: weekKey,
          total: 0,
          valid: 0,
          spam: 0,
          infected: 0,
          banned: 0,
          spearphishing: 0,
          pending: 0,
          _sortDate: parsePeriodDate(s.period)?.getTime() || 0
        };
      }
      buckets[bucketKey].total += Number(s.total || 0);
      buckets[bucketKey].valid += Number(s.valid || 0);
      buckets[bucketKey].spam += Number(s.spam || 0);
      buckets[bucketKey].infected += Number(s.infected || 0);
      buckets[bucketKey].banned += Number(s.banned || 0);
      buckets[bucketKey].spearphishing += Number(s.spearphishing || 0);
      buckets[bucketKey].pending += Number(s.pending || 0);
      const time = parsePeriodDate(s.period)?.getTime();
      if (typeof time === "number" && !Number.isNaN(time)) {
        buckets[bucketKey]._sortDate = Math.min(buckets[bucketKey]._sortDate || time, time);
      }
    });
    return Object.values(buckets).sort((a, b) => (a._sortDate || 0) - (b._sortDate || 0));
  }, [antispamDetail]);
  const backupJobRows = useMemo(() => sauvegardeInstances.flatMap((inst, idx) => {
    const jobs = Array.isArray(inst.jobs) ? inst.jobs : [];
    const instanceName = inst.nom || inst.logiciel || `Instance ${idx + 1}`;
    return jobs.map((job, jobIdx) => {
      const lastBackupStart = job.last_backup_start ?? job.lastBackupStart ?? job.last_backup_date ?? job.lastBackupDate ?? job.lastSyncDate;
      const lastBackupSync = job.last_backup_date ?? job.lastBackupDate ?? job.lastSyncDate ?? "";
      const statusJob = normalizeBackupJobForStatus(job, inst);
      return {
        _rowKey: `${instanceName}-${job.nom || job.jobName || jobIdx}-${jobIdx}`,
        instanceName,
        name: job.nom || job.jobName || "",
        type: pickBackupJobType(job),
        serveurLie: formatServeurLieLabel(job.serveurLie || job.source, ""),
        destination: pickBackupJobDestination(job, inst, ""),
        regularite: job.regularite || "",
        horaire: job.horaire || "",
        retention: job.retention || "",
        lastBackupStart,
        lastBackupSync,
        lastStatus: getBackupJobStatus(statusJob)
      };
    });
  }), [sauvegardeInstances]);
  const antivirusPolicyRows = useMemo(() => buildAntivirusPolicyRowsForClient(antivirusSolutions), [antivirusSolutions]);
  const antivirusEndpointRows = useMemo(() => buildAntivirusEndpointRowsForClient(antivirusSolutions), [antivirusSolutions]);
  const isBackupDocument = Boolean(documentTitle) && isBackupActive && !isAntivirusActive && !isAntispamActive;
  const showDocumentIntro = Boolean(documentTitle) && !embedded;
  const Wrapper = embedded ? React.Fragment : "div";
  const wrapperProps = embedded ? {} : { className: infraStyles.root };
  return <Wrapper {...wrapperProps}>
      {showDocumentIntro ? <ReportSummaryIntro
        title={documentTitle}
        clientPrefix={clientPrefix}
        clientMainLabel={clientMainLabel}
        periodLabel={periodLabel}
        kpis={isBackupDocument ? backupKpis : [{
          label: "Solutions antivirus",
          value: antivirusSolutions.length,
          icon: "mdi:shield-check",
          iconColor: "#059669"
        }, {
          label: "Solutions antispam",
          value: antispamSolutions.length,
          icon: "mdi:email-alert",
          iconColor: "#ea580c"
        }, {
          label: "Tickets",
          value: cyberTicketTotal,
          icon: "mdi:ticket-outline",
          iconColor: "#7c3aed"
        }, {
          label: "Commentaires",
          value: cyberCommentTotal,
          icon: "mdi:comment-text-outline",
          iconColor: "#0891b2"
        }]}
      /> : null}
      {showLegend && !embedded ? <div className={infraStyles.overviewContainer}>
        <CyberNotificationLegend commentTotal={cyberCommentTotal} ticketTotal={cyberTicketTotal} />
      </div> : null}

      {isBackupActive && <ReportSummarySection
        icon="mdi:database-sync"
        title="Backup"
        subtitle="Synthèse des solutions et jobs de sauvegarde"
      >
        {sauvegardeInstances.length === 0 ? <div className={infraStyles.sectionHelperMuted}>
            Aucune solution de sauvegarde enregistrée pour ce client.
          </div> : <>
            {(sauvegardeActiveBackupInstances.length > 0 || sauvegardeHyperBackupInstances.length > 0) && (() => {
          const ACTIVE_BACKUP_MODULES = [{
            key: "oneDrive",
            label: "OneDrive",
            icon: "mdi:microsoft-onedrive"
          }, {
            key: "sharePoint",
            label: "SharePoint",
            icon: "mdi:microsoft-sharepoint"
          }, {
            key: "exchange",
            label: "Exchange",
            icon: "mdi:email-outline"
          }, {
            key: "teams",
            label: "Teams",
            icon: "mdi:microsoft-teams"
          }, {
            key: "calendar",
            label: "Calendar",
            icon: "mdi:calendar"
          }, {
            key: "contacts",
            label: "Contacts",
            icon: "mdi:contacts-outline"
          }];
          const formatNas = v => {
            if (!v || typeof v !== "string") return "-";
            return v.replace(/^(NAS|SAN|DISQUE)-/, "").replace(/-\d+$/, "") || v;
          };
          return <div style={{
            marginTop: "1.1rem"
          }}>
                  <div className={infraStyles.backupFlowRow}>
                    {sauvegardeActiveBackupInstances.map((inst, idx) => {
                const name = inst.nom || inst.logiciel || `Instance ${idx + 1}`;
                const modules = inst.activeBackupModules || {};
                const storage = inst.activeBackupStorage || "-";
                const explicitStorageIp = inst.activeBackupStorageIp || inst.activeBackupStorageIP || inst.storageIp || inst.storageIP || inst.ip || inst.address || "";
                const storageIp = extractIpv4(explicitStorageIp) || extractIpv4(storage) || storageIpByName[normalizeStorageKey(storage)] || "-";
                const storageIcon = /nas|synology|qnap|san|diskstation|disque/i.test(String(storage || "")) ? "mdi:nas" : "mdi:database";
                return <article key={`active-${inst.id || idx}`} className={`${infraStyles.topologyStorageChip} ${infraStyles.backupFlowCard}`} title={name}>
                          <span className={infraStyles.topologyStorageTypeIcon}>
                            <IconifyIcon icon="mdi:microsoft-office" width={20} height={20} />
                          </span>
                          <div className={infraStyles.topologyStorageText}>
                            <div className={infraStyles.topologyStorageHeaderRow} style={{
                      marginBottom: "0.45rem"
                    }}>
                              <span className={infraStyles.topologyStorageName}>{name}</span>
                            </div>
                            <div className={infraStyles.backupFlowMain}>
                              <span className={infraStyles.backupFlowModules}>
                                {ACTIVE_BACKUP_MODULES.map(m => {
                          const isActive = !!modules[m.key];
                          return <span key={m.key} title={`${m.label} : ${isActive ? "enabled" : "inactive"}`} className={`${infraStyles.backupFlowModuleIcon} ${isActive ? "" : infraStyles.backupFlowModuleInactive}`}>
                                      <IconifyIcon icon={m.icon} width={20} height={20} />
                                    </span>;
                        })}
                              </span>
                              <span className={infraStyles.backupFlowArrow} title="Flow to storage">
                                <IconifyIcon icon="mdi:arrow-right" width={16} height={16} />
                              </span>
                              <span className={infraStyles.backupFlowNasBlock} title={`Storage: ${storage}`}>
                                <span className={infraStyles.backupFlowNasIcon}>
                                  <IconifyIcon icon={storageIcon} width={22} height={22} />
                                </span>
                                <span className={infraStyles.backupFlowNasName}>{storage}</span>
                                <span className={infraStyles.backupFlowNasIp}>IP: {storageIp}</span>
                              </span>
                            </div>
                          </div>
                        </article>;
              })}
                    {sauvegardeHyperBackupInstances.map((inst, idx) => {
                const name = inst.nom || inst.logiciel || `Instance ${idx + 1}`;
                const source = formatNas(inst.hyperbackupSource);
                const dest = formatNas(inst.hyperbackupDestination);
                const sourceIp = extractIpv4(inst.hyperbackupSourceIp || inst.hyperbackupSourceIP || "") || extractIpv4(inst.hyperbackupSource || "") || storageIpByName[normalizeStorageKey(source)] || "-";
                const destIp = extractIpv4(inst.hyperbackupDestinationIp || inst.hyperbackupDestinationIP || "") || extractIpv4(inst.hyperbackupDestination || "") || storageIpByName[normalizeStorageKey(dest)] || "-";
                return <article key={`hyper-${inst.id || idx}`} className={`${infraStyles.topologyStorageChip} ${infraStyles.backupFlowCard}`} title={name}>
                          <span className={infraStyles.topologyStorageTypeIcon}>
                            <IconifyIcon icon="mdi:nas" width={20} height={20} />
                          </span>
                          <div className={infraStyles.topologyStorageText}>
                            <div className={infraStyles.topologyStorageHeaderRow} style={{
                      marginBottom: "0.45rem"
                    }}>
                              <span className={infraStyles.topologyStorageName}>{name}</span>
                            </div>
                            <div className={infraStyles.backupFlowMain}>
                              <span className={infraStyles.backupFlowNasBlock} title={`NAS source: ${source}`}>
                                <span className={infraStyles.backupFlowNasIcon}>
                                  <IconifyIcon icon="mdi:nas" width={22} height={22} />
                                </span>
                                <span className={infraStyles.backupFlowNasName}>{source}</span>
                                <span className={infraStyles.backupFlowNasIp}>IP: {sourceIp}</span>
                              </span>
                              <span className={infraStyles.backupFlowArrow} title="HyperBackup flow">
                                <IconifyIcon icon="mdi:arrow-right" width={16} height={16} />
                              </span>
                              <span className={infraStyles.backupFlowNasBlock} title={`NAS destination: ${dest}`}>
                                <span className={infraStyles.backupFlowNasIcon}>
                                  <IconifyIcon icon="mdi:nas" width={22} height={22} />
                                </span>
                                <span className={infraStyles.backupFlowNasName}>{dest}</span>
                                <span className={infraStyles.backupFlowNasIp}>IP: {destIp}</span>
                              </span>
                            </div>
                          </div>
                        </article>;
              })}
                  </div>
                </div>;
        })()}

            {}
            {sauvegardeStandardInstances.length > 0 && <div style={{
          marginTop: "1.1rem"
        }}>
                <h5 style={{
            margin: "0 0 0.35rem",
            fontSize: "0.9rem",
            fontWeight: 600,
            color: "var(--text-primary, #111827)"
          }}>
                  Instances de sauvegarde
                </h5>
                <div className={infraStyles.topologyServersRow} style={{
            maxWidth: "none"
          }}>
                  {sauvegardeStandardInstances.map((inst, idx) => {
              const name = inst.nom || inst.logiciel || `Instance ${idx + 1}`;
              const server = inst.server || inst.serveur || inst.serveurLie || "-";
              const jobsCount = Array.isArray(inst.jobs) ? inst.jobs.length : 0;
              const logoIcon = inst.logiciel === "Veeam" ? "mdi:database-sync" : inst.logiciel === "HYCU Backup" ? "mdi:database-sync" : "mdi:database-sync-outline";
              return <article key={inst.id || idx} className={infraStyles.topologyStorageChip} title={name}>
                        <span className={infraStyles.topologyStorageTypeIcon}>
                          <IconifyIcon icon={logoIcon} width={20} height={20} />
                        </span>
                        <div className={infraStyles.topologyStorageText}>
                          <div className={infraStyles.topologyStorageHeaderRow}>
                            <span className={infraStyles.topologyStorageName}>{name}</span>
                          </div>
                          <span className={infraStyles.topologyStorageUniformText}>
                            Solution: {inst.logiciel || "-"}
                          </span>
                          <span className={infraStyles.topologyStorageUniformText}>
                            Serveur: {server}
                          </span>
                          <span className={infraStyles.topologyStorageUniformText}>
                            Expiration:{" "}
                            <span style={isDateExpired(inst.expiration) ? {
                      color: "#dc2626",
                      fontWeight: 600
                    } : undefined}>
                              {formatDateBackup(inst.expiration)}
                            </span>
                          </span>
                          <span className={infraStyles.topologyStorageUniformText}>
                            Jobs: {jobsCount}
                          </span>
                        </div>
                      </article>;
            })}
                </div>
              </div>}

            <CyberReportTable title="Backup jobs" count={backupJobRows.length} rows={backupJobRows} columns={[{
          id: "instanceName",
          label: "Instance",
          render: row => <span className={cyberStyles.cellBold}>{row.instanceName || "-"}</span>
        }, {
          id: "name",
          label: "Nom",
          render: row => row.name || "-"
        }, {
          id: "type",
          label: "Type",
          render: row => row.type || "-"
        }, {
          id: "serveurLie",
          label: "Serveur",
          render: row => row.serveurLie || "-"
        }, {
          id: "destination",
          label: "Destination",
          render: row => row.destination || "-"
        }, {
          id: "regularite",
          label: "Fréquence",
          render: row => row.regularite || "-"
        }, {
          id: "horaire",
          label: "Horaire",
          render: row => row.horaire || "-"
        }, {
          id: "retention",
          label: "Retention",
          render: row => row.retention || "-"
        }, {
          id: "lastBackupStart",
          label: "Dernière sauvegarde",
          render: row => formatDateTimeBackup(row.lastBackupStart)
        }, {
          id: "lastBackupSync",
          label: "Dernière synchro",
          render: row => formatDateTimeBackup(row.lastBackupSync)
        }, {
          id: "lastStatus",
          label: "Dernier statut",
          render: row => <BackupStatusBadge status={row.lastStatus} />
        }]} />
          </>}
      </ReportSummarySection>}

      {isAntivirusActive && <ReportSummarySection
        icon="mdi:shield-check"
        title="Antivirus"
        subtitle="Solutions déployées et couverture des postes"
      >
        <CyberCategoryKpisBlock items={antivirusKpis} />
        <CyberCategoryKpisBlock items={antivirusConnectionKpis} />
        <CyberCategoryKpisBlock items={antivirusOsKpis} />

        <CyberReportTable title="Licences antivirus" count={antivirusSolutions.length} rows={antivirusSolutions.map((sol, idx) => ({
        ...sol,
        _rowKey: sol.id || `av-lic-${idx}`,
        _displayName: getAntivirusSolutionName(sol, idx)
      }))} columns={[{
        id: "solution",
        label: "Solution",
        render: (row, idx) => <span className={cyberStyles.cellBold}>
                  {row._displayName || getAntivirusSolutionName(row, idx)}
                </span>
      }, {
        id: "company",
        label: "Société",
        render: row => row.companyName || row.syncData?.company?.name || client?.name || client?.nom || "-"
      }, {
        id: "totalLicenses",
        label: "Licences totales",
        render: row => {
          const license = row.syncData?.license || {};
          const total = license.total || license.totalSeats || license.seats || row.licencesTotales || null;
          return total != null ? formatInt(total) : "-";
        }
      }, {
        id: "usedLicenses",
        label: "Licences utilisées",
        render: row => {
          const license = row.syncData?.license || {};
          const used = license.used || license.usedSeats || row.licencesUtilisees || null;
          return used != null ? formatInt(used) : "-";
        }
      }]} />

        <CyberReportTable title="Security policies (client)" count={antivirusPolicyRows.length} rows={antivirusPolicyRows} columns={[{
        id: "solutionName",
        label: "Solution",
        render: row => <span className={cyberStyles.cellBold}>{row.solutionName || "-"}</span>
      }, {
        id: "name",
        label: "Politique",
        render: row => <span style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.35rem"
        }}>
                  <IconifyIcon icon="mdi:shield-account-outline" width={16} height={16} />
                  {row.name || "-"}
                </span>
      }, {
        id: "type",
        label: "Type",
        render: row => row.type || "-"
      }, {
        id: "endpoints",
        label: "Endpoints",
        render: row => formatInt(row.endpoints)
      }, {
        id: "applied",
        label: "Applied",
        render: row => row.applied != null && row.totalForApplied ? `${row.applied} / ${row.totalForApplied}` : "-"
      }]} />

        <CyberReportTable title="Endpoints antivirus" count={antivirusEndpointRows.length} rows={antivirusEndpointRows} columns={[{
        id: "solution",
        label: "Solution",
        render: row => <span className={cyberStyles.cellBold}>{row._solutionName || "-"}</span>
      }, {
        id: "name",
        label: "Nom",
        render: row => {
          const name = row.name || row.deviceName || row.hostname || row.fqdn || "-";
          const typeIcon = getEndpointTypeIcon(row);
          return <span className={cyberStyles.endpointNameCell}>
                    <IconifyIcon icon={typeIcon} width={18} height={18} />
                    {name}
                  </span>;
        }
      }, {
        id: "type",
        label: "Type",
        render: row => formatAntivirusEndpointType(row.type ?? row.machineType)
      }, {
        id: "fqdn",
        label: "FQDN",
        render: row => row.fqdn || row.domainName || row.dnsName || row.hostFqdn || "-"
      }, {
        id: "ip",
        label: "IP",
        render: row => row.ip || row.address || "-"
      }, {
        id: "os",
        label: "OS",
        render: row => {
          const os = row.operatingSystem || row.os || "-";
          const osIcon = getOsIconForEndpoint(row);
          return <span className={cyberStyles.osCell}>
                    {osIcon && <IconifyIcon icon={osIcon} width={16} height={16} />}
                    {os}
                  </span>;
        }
      }, {
        id: "lastSeen",
        label: "Dernière connexion",
        render: row => {
          const lastSeenInfo = getEndpointLastSeenSummary(row);
          if (lastSeenInfo.label === "N/A") return "-";
          return <span style={lastSeenInfo.isOver24h ? {
            color: "#f97316",
            fontWeight: 600
          } : undefined}>
                    {lastSeenInfo.label}
                  </span>;
        }
      }, {
        id: "policy",
        label: "Politique",
        render: row => row.policyName || row.policy?.name || row.policy || row.securityPolicy || "-"
      }, {
        id: "infected",
        label: "Infecté",
        render: row => {
          const infected = isEndpointInfected(row);
          return <span className={infected ? cyberStyles.infectedYes : cyberStyles.infectedNo}>
                    {infected ? "Yes" : "No"}
                  </span>;
        }
      }, {
        id: "status",
        label: "Statut",
        render: row => {
          const inactive = isEndpointInactive(row);
          const endpointState = row.endpointState;
          const statusLabel = endpointState === 1 || row.isManaged ? "Actif" : inactive ? "Inactif" : "-";
          const tone = statusLabel === "Actif" ? cyberStyles.statusSuccess : statusLabel === "Inactif" ? cyberStyles.statusError : cyberStyles.statusNeutral;
          return <span className={`${cyberStyles.statusBadge} ${tone}`}>{statusLabel}</span>;
        }
      }]} />
      </ReportSummarySection>}

      {isAntispamActive && <ReportSummarySection
        icon="mdi:email-alert"
        title="Antispam"
        subtitle="Solutions antispam et volume de menaces filtrées"
      >
        <CyberCategoryKpisBlock items={antispamKpis} />

        <CyberReportTable title="Licences antispam" count={antispamSolutions.length} rows={antispamSolutions.map((sol, idx) => ({
        ...sol,
        _rowKey: sol.id || `as-lic-${idx}`
      }))} columns={[{
        id: "solution",
        label: "Solution",
        render: row => <span className={cyberStyles.cellBold}>
                  {row.nom || row.logiciel || row.solution || row.name || "-"}
                </span>
      }, {
        id: "company",
        label: "Société",
        render: () => client?.name || client?.nom || "-"
      }, {
        id: "protectedUsers",
        label: "Utilisateurs protégés",
        render: row => {
          const protectedUsers = row.utilisateursProteges ?? row.utilisateurs ?? row.nombre_utilisateurs ?? null;
          return protectedUsers != null ? formatInt(protectedUsers) : "-";
        }
      }, {
        id: "domains",
        label: "Domaines / licences",
        render: row => {
          const domaines = row.domainesSurveilles ?? row.domaines ?? row.licences ?? row.nombre_licences ?? null;
          return domaines != null ? String(domaines) : "-";
        }
      }, {
        id: "expiration",
        label: "Expiration",
        render: row => formatAntispamExpiration(row)
      }]} />

        <CyberReportTable title="Statistics by period" count={antispamStatsByWeek.length} rows={antispamStatsByWeek.map((s, idx) => ({
        ...s,
        _rowKey: `${s.solutionName}-${s.period}-${idx}`
      }))} columns={[{
        id: "solutionName",
        label: "Solution",
        render: row => <span className={cyberStyles.cellBold}>{row.solutionName || "-"}</span>
      }, {
        id: "period",
        label: "Période",
        render: row => row.period || "-"
      }, {
        id: "total",
        label: "Total",
        render: row => Number(row.total || 0).toLocaleString("fr-FR")
      }, {
        id: "valid",
        label: "Valides",
        render: row => {
          const total = Number(row.total || 0) || 1;
          const valid = Number(row.valid || 0);
          return `${valid.toLocaleString("fr-FR")} (${(valid / total * 100).toFixed(1)}%)`;
        }
      }, {
        id: "spam",
        label: "Spam",
        render: row => {
          const total = Number(row.total || 0) || 1;
          const spam = Number(row.spam || 0);
          return `${spam.toLocaleString("fr-FR")} (${(spam / total * 100).toFixed(1)}%)`;
        }
      }, {
        id: "infected",
        label: "Infecté",
        render: row => {
          const total = Number(row.total || 0) || 1;
          const infected = Number(row.infected || 0);
          return `${infected.toLocaleString("fr-FR")} (${(infected / total * 100).toFixed(1)}%)`;
        }
      }, {
        id: "banned",
        label: "Bannis",
        render: row => {
          const total = Number(row.total || 0) || 1;
          const banned = Number(row.banned || 0);
          return `${banned.toLocaleString("fr-FR")} (${(banned / total * 100).toFixed(1)}%)`;
        }
      }, {
        id: "spearphishing",
        label: "Spearphishing",
        render: row => {
          const total = Number(row.total || 0) || 1;
          const spearphishing = Number(row.spearphishing || 0);
          return `${spearphishing.toLocaleString("fr-FR")} (${(spearphishing / total * 100).toFixed(1)}%)`;
        }
      }, {
        id: "pending",
        label: "En attente",
        render: row => {
          const total = Number(row.total || 0) || 1;
          const pending = Number(row.pending || 0);
          return `${pending.toLocaleString("fr-FR")} (${(pending / total * 100).toFixed(1)}%)`;
        }
      }]} />

        <CyberReportTable title="Users covered by protection" count={antispamDetail.users.length} rows={antispamDetail.users.map((u, idx) => ({
        ...u,
        _rowKey: u.mainEmail || `as-user-${idx}`
      }))} columns={[{
        id: "solution",
        label: "Solution",
        render: row => <span className={cyberStyles.cellBold}>{row._solutionName || "-"}</span>
      }, {
        id: "name",
        label: "Nom",
        render: row => `${row.firstName || ""} ${row.lastName || ""}`.trim() || "-"
      }, {
        id: "email",
        label: "Email principal",
        render: row => row.mainEmail || "-"
      }, {
        id: "status",
        label: "Statut",
        render: row => {
          const meta = getProtectionStatusMeta(row.protectionStatus);
          return <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem"
          }}>
                    <IconifyIcon icon={meta.icon} width={16} height={16} color={meta.color} />
                    <span>{meta.label || "-"}</span>
                  </span>;
        }
      }, {
        id: "aliases",
        label: "Alias",
        render: row => Array.isArray(row.aliases) ? row.aliases.length : 0
      }]} />
      </ReportSummarySection>}

    </Wrapper>;
}
