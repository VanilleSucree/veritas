import React, { useMemo, useState } from "react";
import { Icon as IconifyIcon } from "@iconify/react";
import {
  formatServeurLieLabel,
  normalizeServeurLieList,
  pickBackupJobDestination
} from "../../../EnterprisesPage/backupJobUtils";
import {
  getBackupJobStatus,
  normalizeBackupJobForStatus
} from "../../../CybersecuritePage/backupJobStatusUtils";
import { ReportTableBlock } from "./ReportSummaryBlocks";
import execStyles from "./ReportSummarySupervision.module.css";
import styles from "./ReportSummaryBackup.module.css";

function listBackupInstances(client) {
  const raw = client?.equipements?.Sauvegarde || client?.equipements?.Backup;
  if (!raw) return [];
  return Array.isArray(raw.instances) ? raw.instances : [];
}

function formatDateFr(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("fr-FR");
}

function formatDateTimeFr(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("fr-FR");
}

function formatCollectionDateFr(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function statusLabelFr(status) {
  const s = String(status || "").toLowerCase();
  if (s === "ok" || s === "success") return "OK";
  if (s === "warning") return "Retard";
  if (s === "critical" || s === "fail" || s === "failed" || s === "error") return "Erreur";
  if (s === "unmapped") return "Non mappé";
  if (s === "inactive") return "Inactif";
  if (s === "running") return "En cours";
  return status ? String(status) : "—";
}

function statusToneClass(status) {
  const s = String(status || "").toLowerCase();
  if (s === "ok" || s === "success") return styles.statusOk;
  if (s === "warning") return styles.statusWarn;
  if (s === "critical" || s === "fail" || s === "failed" || s === "error") return styles.statusError;
  return styles.statusNeutral;
}

function isOkStatus(status) {
  const s = String(status || "").toLowerCase();
  return s === "ok" || s === "success";
}

function isIssueStatus(status) {
  const s = String(status || "").toLowerCase();
  return s === "warning" || s === "critical" || s === "fail" || s === "failed" || s === "error";
}

function parseRetentionDays(raw) {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const text = String(raw).trim().toLowerCase();
  const match = text.match(/(\d+)/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

function formatRetentionLabel(raw) {
  if (!raw && raw !== 0) return "—";
  const days = parseRetentionDays(raw);
  if (days == null) return String(raw);
  return `${days} jour${days > 1 ? "s" : ""}`;
}

function mostCommonRetention(jobs) {
  const counts = new Map();
  jobs.forEach(job => {
    const label = formatRetentionLabel(job.retention);
    if (!label || label === "—") return;
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  let best = null;
  let bestCount = 0;
  counts.forEach((count, label) => {
    if (count > bestCount) {
      best = label;
      bestCount = count;
    }
  });
  return best;
}

function shortenServerLabel(name) {
  return String(name || "")
    .replace(/^EPG-/i, "")
    .replace(/^SRV-/i, "")
    .trim();
}

function formatCoveredServersSummary(servers) {
  if (!servers.length) return "Aucun serveur source renseigné sur les jobs.";
  if (servers.length <= 8) return `${servers.join(", ")}.`;
  const shortened = servers.map(shortenServerLabel);
  return `${shortened.join(", ")}.`;
}

function buildClientLine(client, clientPrefix = "", clientMainLabel = "") {
  if (clientPrefix || clientMainLabel) {
    return [clientPrefix, clientMainLabel].filter(Boolean).join(" — ");
  }
  return client?.name || client?.nom || "Client";
}

function StatusBadge({ status }) {
  return (
    <span className={`${styles.statusBadge} ${statusToneClass(status)}`}>
      {statusLabelFr(status)}
    </span>
  );
}

const DETAIL_COLUMNS = [
  {
    id: "name",
    label: "Job",
    render: row => <span className={execStyles.equipmentChip}>{row.name || "—"}</span>
  },
  { id: "serveurLie", label: "Serveur(s) source" },
  { id: "destination", label: "Destination" },
  { id: "regularite", label: "Fréquence" },
  { id: "retention", label: "Rétention", render: row => formatRetentionLabel(row.retention) },
  {
    id: "lastBackupStart",
    label: "Dernière sauvegarde",
    render: row => formatDateTimeFr(row.lastBackupStart)
  },
  {
    id: "lastStatus",
    label: "Statut",
    render: row => <StatusBadge status={row.lastStatus} />
  }
];

const WATCH_COLUMNS = [
  {
    id: "name",
    label: "Job",
    render: row => <span className={execStyles.equipmentChip}>{row.name || "—"}</span>
  },
  { id: "serveurLie", label: "Serveur(s)" },
  {
    id: "lastBackupStart",
    label: "Dernière sauvegarde",
    render: row => formatDateTimeFr(row.lastBackupStart)
  },
  {
    id: "lastStatus",
    label: "Statut",
    render: row => <StatusBadge status={row.lastStatus} />
  },
  { id: "reason", label: "Constat" }
];

export default function ReportSummaryBackup({
  client,
  clientPrefix = "",
  clientMainLabel = "",
  reportEndDate = null
}) {
  const [showTechnicalDetail, setShowTechnicalDetail] = useState(false);

  const instances = useMemo(() => listBackupInstances(client), [client]);
  const standardInstances = useMemo(
    () => instances.filter(inst => inst.logiciel !== "Active Backup for Microsoft 365" && inst.logiciel !== "HyperBackup"),
    [instances]
  );

  const jobRows = useMemo(() => {
    const source = standardInstances.length ? standardInstances : instances;
    return source.flatMap((inst, idx) => {
      const jobs = Array.isArray(inst.jobs) ? inst.jobs : [];
      const instanceName = inst.nom || inst.logiciel || `Instance ${idx + 1}`;
      return jobs.map((job, jobIdx) => {
        const statusJob = normalizeBackupJobForStatus(job, inst);
        const lastStatus = getBackupJobStatus(statusJob);
        const lastBackupStart =
          job.last_backup_start ??
          job.lastBackupStart ??
          job.last_backup_date ??
          job.lastBackupDate ??
          null;
        return {
          _rowKey: `${instanceName}-${job.id || job.nom || job.jobName || jobIdx}-${jobIdx}`,
          instanceName,
          logiciel: inst.logiciel || "",
          server: inst.server || inst.serveur || inst.serveurLie || "",
          expiration: inst.expiration || null,
          name: job.nom || job.jobName || `Job ${jobIdx + 1}`,
          serveurLie: formatServeurLieLabel(job.serveurLie || job.source, "—"),
          serveurList: normalizeServeurLieList(job.serveurLie || job.source),
          destination: pickBackupJobDestination(job, inst, "—"),
          regularite: job.regularite || "—",
          retention: job.retention || "",
          lastBackupStart,
          lastStatus
        };
      });
    });
  }, [instances, standardInstances]);

  const activeJobs = useMemo(
    () => jobRows.filter(job => String(job.lastStatus).toLowerCase() !== "inactive"),
    [jobRows]
  );
  const evaluatedJobs = useMemo(
    () => activeJobs.filter(job => String(job.lastStatus).toLowerCase() !== "unmapped"),
    [activeJobs]
  );
  const okJobs = useMemo(() => evaluatedJobs.filter(job => isOkStatus(job.lastStatus)), [evaluatedJobs]);
  const issueJobs = useMemo(() => evaluatedJobs.filter(job => isIssueStatus(job.lastStatus)), [evaluatedJobs]);

  const totalJobs = activeJobs.length;
  const okCount = okJobs.length;
  const evaluatedCount = evaluatedJobs.length || totalJobs;
  const retentionLabel = mostCommonRetention(activeJobs) || "—";

  const lastSuccessfulBackup = useMemo(() => {
    let latest = null;
    okJobs.forEach(job => {
      if (!job.lastBackupStart) return;
      const ts = new Date(job.lastBackupStart).getTime();
      if (Number.isNaN(ts)) return;
      if (latest == null || ts > latest) latest = ts;
    });
    if (latest == null) {
      activeJobs.forEach(job => {
        if (!job.lastBackupStart) return;
        const ts = new Date(job.lastBackupStart).getTime();
        if (Number.isNaN(ts)) return;
        if (latest == null || ts > latest) latest = ts;
      });
    }
    return latest != null ? new Date(latest).toISOString() : null;
  }, [okJobs, activeJobs]);

  const globalState = useMemo(() => {
    if (totalJobs === 0) {
      return {
        label: "Non configuré",
        valueClass: "",
        icon: "mdi:database-off",
        iconColor: "#6b7280",
        hint: "Aucun job de sauvegarde suivi",
        badgeClass: styles.solutionBadgeWarn,
        badgeLabel: "À configurer"
      };
    }
    if (issueJobs.some(job => String(job.lastStatus).toLowerCase() === "critical")) {
      return {
        label: "En erreur",
        valueClass: execStyles.overviewCardValueCritical,
        icon: "mdi:alert-octagon",
        iconColor: "#dc2626",
        hint: `${issueJobs.length} job${issueJobs.length > 1 ? "s" : ""} en anomalie`,
        badgeClass: styles.solutionBadgeCritical,
        badgeLabel: "En erreur"
      };
    }
    if (issueJobs.length > 0) {
      return {
        label: "À surveiller",
        valueClass: execStyles.overviewCardValueWarn,
        icon: "mdi:alert",
        iconColor: "#d97706",
        hint: `${okCount} / ${evaluatedCount} jobs en dernier statut OK`,
        badgeClass: styles.solutionBadgeWarn,
        badgeLabel: "À surveiller"
      };
    }
    return {
      label: "Opérationnelles",
      valueClass: execStyles.overviewCardValueOk,
      icon: "mdi:check-circle",
      iconColor: "#059669",
      hint: `${okCount} jobs sur ${evaluatedCount} en dernier statut OK`,
      badgeClass: styles.solutionBadgeOk,
      badgeLabel: "Opérationnelle"
    };
  }, [totalJobs, issueJobs, okCount, evaluatedCount]);

  const primaryInstance = useMemo(() => {
    if (standardInstances.length) return standardInstances[0];
    return instances[0] || null;
  }, [instances, standardInstances]);

  const solutionName = primaryInstance?.logiciel || primaryInstance?.nom || "Sauvegarde";
  const backupServer =
    primaryInstance?.server ||
    primaryInstance?.serveur ||
    primaryInstance?.serveurLie ||
    primaryInstance?.nom ||
    "—";
  const mainDestination = useMemo(() => {
    const counts = new Map();
    activeJobs.forEach(job => {
      const dest = job.destination && job.destination !== "—" ? job.destination : null;
      if (!dest) return;
      counts.set(dest, (counts.get(dest) || 0) + 1);
    });
    let best = null;
    let bestCount = 0;
    counts.forEach((count, dest) => {
      if (count > bestCount) {
        best = dest;
        bestCount = count;
      }
    });
    return best || "—";
  }, [activeJobs]);

  const coveredServers = useMemo(() => {
    const set = new Set();
    activeJobs.forEach(job => {
      (job.serveurList || []).forEach(server => {
        if (server) set.add(server);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [activeJobs]);

  const watchRows = useMemo(
    () =>
      issueJobs.map(job => ({
        ...job,
        reason:
          String(job.lastStatus).toLowerCase() === "warning"
            ? "Dernière exécution en retard (> 24 h)"
            : !job.lastBackupStart
              ? "Aucune dernière exécution connue"
              : "Dernière exécution en erreur ou trop ancienne (> 48 h)"
      })),
    [issueJobs]
  );

  const licenseRows = useMemo(() => {
    const rows = [];
    (standardInstances.length ? standardInstances : instances).forEach((inst, idx) => {
      if (!inst?.expiration) return;
      rows.push({
        key: inst.id || `${inst.nom || inst.logiciel || "lic"}-${idx}`,
        label: `Expiration de la licence ${inst.logiciel || "sauvegarde"}`,
        server: inst.server || inst.serveur || inst.nom || "—",
        expiration: inst.expiration
      });
    });
    return rows;
  }, [instances, standardInstances]);

  const collectionDate =
    formatCollectionDateFr(lastSuccessfulBackup) ||
    formatCollectionDateFr(reportEndDate) ||
    formatDateFr(reportEndDate);
  const clientLine = buildClientLine(client, clientPrefix, clientMainLabel);

  return (
    <div className={execStyles.executiveRoot}>
      <header className={execStyles.executiveHeader}>
        <h3 className={execStyles.executiveTitle}>Synthèse des sauvegardes</h3>
        <p className={execStyles.executiveClient}>{clientLine}</p>
        <div className={execStyles.executiveMeta}>
          {collectionDate ? <span className={execStyles.executivePeriod}>{collectionDate}</span> : null}
          <span className={execStyles.executiveBadge}>État à la dernière collecte</span>
        </div>
      </header>

      <section>
        <h4 className={execStyles.overviewTitle}>Vue d&apos;ensemble</h4>
        <div className={execStyles.overviewGrid}>
          <article className={execStyles.overviewCard}>
            <div className={execStyles.overviewCardHead}>
              <IconifyIcon icon={globalState.icon} width={16} height={16} color={globalState.iconColor} />
              État des sauvegardes
            </div>
            <div className={`${execStyles.overviewCardValue} ${globalState.valueClass}`.trim()}>
              {globalState.label}
            </div>
            <div className={execStyles.overviewCardHint}>{globalState.hint}</div>
          </article>

          <article className={execStyles.overviewCard}>
            <div className={execStyles.overviewCardHead}>
              <IconifyIcon icon="mdi:database-sync" width={16} height={16} />
              Jobs de sauvegarde
            </div>
            <div className={execStyles.overviewCardValue}>{totalJobs}</div>
            <div className={execStyles.overviewCardHint}>Jobs configurés et suivis</div>
          </article>

          <article className={execStyles.overviewCard}>
            <div className={execStyles.overviewCardHead}>
              <IconifyIcon icon="mdi:history" width={16} height={16} />
              Rétention
            </div>
            <div className={execStyles.overviewCardValue}>{retentionLabel}</div>
            <div className={execStyles.overviewCardHint}>Rétention configurée sur les jobs présentés</div>
          </article>

          <article className={execStyles.overviewCard}>
            <div className={execStyles.overviewCardHead}>
              <IconifyIcon icon="mdi:clock-outline" width={16} height={16} />
              Dernière sauvegarde
            </div>
            <div className={execStyles.overviewCardValue}>{formatDateFr(lastSuccessfulBackup)}</div>
            <div className={execStyles.overviewCardHint}>Dernières exécutions réussies enregistrées</div>
          </article>
        </div>
      </section>

      <section className={execStyles.sectionBlock}>
        <h4 className={execStyles.sectionHeading}>Solution de sauvegarde</h4>
        <div className={styles.solutionCard}>
          <div className={styles.solutionHead}>
            <div className={styles.solutionIdentity}>
              <span className={styles.solutionIcon}>
                <IconifyIcon icon="mdi:database-sync" width={22} height={22} />
              </span>
              <div>
                <p className={styles.solutionName}>{solutionName}</p>
                <p className={styles.solutionSubtitle}>Solution de sauvegarde</p>
              </div>
            </div>
            <span className={globalState.badgeClass}>{globalState.badgeLabel}</span>
          </div>
          <div className={styles.solutionGrid}>
            <div>
              <span className={styles.solutionFieldLabel}>Serveur de sauvegarde</span>
              <div className={styles.solutionFieldValue}>{backupServer}</div>
            </div>
            <div>
              <span className={styles.solutionFieldLabel}>Nombre de jobs</span>
              <div className={styles.solutionFieldValue}>{totalJobs}</div>
            </div>
            <div>
              <span className={styles.solutionFieldLabel}>Destination principale</span>
              <div className={styles.solutionFieldValue}>{mainDestination}</div>
            </div>
            <div>
              <span className={styles.solutionFieldLabel}>Rétention configurée</span>
              <div className={styles.solutionFieldValue}>{retentionLabel}</div>
            </div>
          </div>
        </div>
      </section>

      <section className={execStyles.sectionBlock}>
        <h4 className={execStyles.sectionHeading}>Couverture des sauvegardes</h4>
        <p className={execStyles.perimeterLead}>
          {totalJobs} job{totalJobs > 1 ? "s" : ""} de sauvegarde configuré{totalJobs > 1 ? "s" : ""}
        </p>
        <div className={execStyles.familyCard}>
          <h5 className={execStyles.familyCardTitle}>
            Serveurs couverts — {coveredServers.length || totalJobs}{" "}
            {coveredServers.length > 0 ? `serveur${coveredServers.length > 1 ? "s" : ""}` : `job${totalJobs > 1 ? "s" : ""}`}
          </h5>
          <p className={execStyles.familySummaryLine}>
            {coveredServers.length > 0
              ? formatCoveredServersSummary(coveredServers)
              : `${totalJobs} job${totalJobs > 1 ? "s" : ""} configuré${totalJobs > 1 ? "s" : ""} (cibles non renseignées).`}
          </p>
          {coveredServers.length > 0 && coveredServers.length !== totalJobs ? (
            <p className={execStyles.sectionFootnote}>
              Note : cette liste représente les cibles des jobs. Nombre de jobs ({totalJobs}) et nombre de serveurs
              protégés ({coveredServers.length}) peuvent différer.
            </p>
          ) : null}
        </div>
      </section>

      <section className={execStyles.sectionBlock}>
        <h4 className={execStyles.sectionHeading}>Points à surveiller</h4>
        <p
          className={`${execStyles.sectionLead} ${watchRows.length === 0 ? execStyles.sectionLeadOk : ""}`.trim()}
        >
          <IconifyIcon
            icon={watchRows.length > 0 ? "mdi:alert" : "mdi:check-circle"}
            width={16}
            height={16}
          />
          {watchRows.length > 0
            ? `${watchRows.length} job${watchRows.length > 1 ? "s" : ""} nécessite${watchRows.length > 1 ? "nt" : ""} une vérification`
            : "Aucun point de vigilance détecté"}
        </p>

        {watchRows.length > 0 ? (
          <ReportTableBlock
            title={null}
            columns={WATCH_COLUMNS}
            rows={watchRows}
            emptyMessage={null}
          />
        ) : (
          <p className={execStyles.synthesisBlock}>
            Les {evaluatedCount || totalJobs} jobs présentent un dernier statut connu « OK » basé sur la dernière
            exécution. Aucune erreur de sauvegarde n&apos;est signalée dans les données collectées.
          </p>
        )}
      </section>

      {licenseRows.length > 0 ? (
        <section className={execStyles.sectionBlock}>
          <h4 className={execStyles.sectionHeading}>Information licence</h4>
          {licenseRows.map(row => (
            <div key={row.key} className={styles.licenseCard}>
              <div>
                <div className={styles.licenseLabel}>{row.label}</div>
                <div className={styles.licenseServer}>{row.server}</div>
              </div>
              <div className={styles.licenseDate}>{formatDateFr(row.expiration)}</div>
            </div>
          ))}
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
          {showTechnicalDetail ? "Masquer le détail des jobs" : "Voir le détail des jobs de sauvegarde"}
        </button>

        {showTechnicalDetail ? (
          <div className={execStyles.detailPanel}>
            <h5 className={execStyles.detailSectionTitle}>Détail des jobs de sauvegarde</h5>
            <ReportTableBlock
              title={null}
              count={activeJobs.length}
              columns={DETAIL_COLUMNS}
              rows={activeJobs}
              emptyMessage="Aucun job de sauvegarde à afficher."
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
