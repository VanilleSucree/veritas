import React, { useMemo, useState } from "react";
import { Icon as IconifyIcon } from "@iconify/react";
import { computeSupportCreditTotals } from "../../../TicketPage/ticketClientSummaryUtils";
import { SUMMARY_HEALTH_META } from "../steps/summaryData";
import { ReportCategoryKpisBlock, ReportTableBlock } from "./ReportSummaryBlocks";
import infraStyles from "./ReportSummaryInfrastructure.module.css";
import styles from "./ReportSummarySupervision.module.css";

function formatDateFr(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("fr-FR");
}

function formatPeriodLongFr(start, end) {
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  if (!startDate || Number.isNaN(startDate.getTime()) || !endDate || Number.isNaN(endDate.getTime())) {
    return "";
  }
  const sameYear = startDate.getFullYear() === endDate.getFullYear();
  const startLabel = startDate.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    ...(sameYear ? {} : { year: "numeric" })
  });
  const endLabel = endDate.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  return `${startLabel} → ${endLabel}`;
}

function getReportKindLabel(start, end) {
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  if (!startDate || Number.isNaN(startDate.getTime()) || !endDate || Number.isNaN(endDate.getTime())) {
    return "Rapport périodique";
  }
  const days = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  if (days <= 10) return "Rapport hebdomadaire";
  if (days <= 45) return "Rapport mensuel";
  if (days <= 100) return "Rapport trimestriel";
  return "Rapport périodique";
}

function renderTextWithLinks(value) {
  const text = String(value || "");
  if (!text) return "";
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, idx) => {
    if (urlRegex.test(part)) {
      urlRegex.lastIndex = 0;
      return (
        <a key={idx} href={part} target="_blank" rel="noopener noreferrer">
          {part}
        </a>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

function HealthBadge({ health }) {
  const meta = SUMMARY_HEALTH_META[health] || SUMMARY_HEALTH_META.unmapped;
  return (
    <span
      className={infraStyles.monitoringStatusIcon}
      title={meta.label}
      aria-label={meta.label}
      style={{ color: meta.color, display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
    >
      <IconifyIcon icon={meta.icon || "mdi:circle"} width={16} height={16} />
      <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>{meta.label}</span>
    </span>
  );
}

function buildInventoryRows(modules = []) {
  return modules.flatMap(module => {
    const equipments = Array.isArray(module.equipments) ? module.equipments : [];
    if (!equipments.length) {
      return [
        {
          _rowKey: `${module.key}-empty`,
          family: module.label,
          name: "—",
          site: "—",
          health: module.health || "unmapped",
          metrics: `${module.count || 0} élément(s)`,
          activity: [module.tickets > 0 ? `${module.tickets} ticket(s)` : null, module.comments > 0 ? `${module.comments} note(s)` : null]
            .filter(Boolean)
            .join(" · ") || "—"
        }
      ];
    }
    return equipments.map(eq => {
      const quantified = eq.quantified || {};
      const metricParts = [];
      if (quantified.availabilityLabel) metricParts.push(`Dispo. ${quantified.availabilityLabel}`);
      if (quantified.services > 0) metricParts.push(`${quantified.services} svc`);
      if (quantified.events > 0) metricParts.push(`${quantified.events} évén.`);
      if (quantified.alerts > 0) metricParts.push(`${quantified.alerts} alerte(s)`);
      return {
        _rowKey: eq.key || `${module.key}-${eq.label}`,
        family: module.label,
        name: eq.label || "—",
        site: eq.site || "—",
        health: eq.health || module.health || "unmapped",
        metrics: metricParts.join(" · ") || "—",
        activity: [
          (eq.tickets || quantified.tickets || 0) > 0 ? `${eq.tickets || quantified.tickets} ticket(s)` : null,
          (eq.comments || quantified.comments || 0) > 0 ? `${eq.comments || quantified.comments} note(s)` : null
        ]
          .filter(Boolean)
          .join(" · ") || "—"
      };
    });
  });
}

function buildTechnicalRows(modules = []) {
  return modules.flatMap(module => {
    const equipments = Array.isArray(module.equipments) ? module.equipments : [];
    return equipments.map(eq => {
      const quantified = eq.quantified || {};
      const parts = [];
      if (!eq.supervision?.mapped && (module.key === "Internet" || module.key === "Firewall" || module.key === "Servers" || module.key === "Storage" || module.key === "Switch" || module.key === "BorneWifi" || module.key === "TOIP")) {
        parts.push("Non supervisé");
      } else {
        if (quantified.services > 0) parts.push(`${quantified.services} service${quantified.services > 1 ? "s" : ""}`);
        if (quantified.events > 0) parts.push(`${quantified.events} alerte${quantified.events > 1 ? "s" : ""}`);
        if (eq.health === "ok" && parts.length === 0) parts.push("Sain");
        if (eq.health === "warn") parts.push("À surveiller");
        if (eq.health === "critical") parts.push("Critique");
      }
      return {
        _rowKey: eq.key || `${module.key}-${eq.label}`,
        name: eq.label || "—",
        status: parts.join(" · ") || "—",
        health: eq.health || "unmapped"
      };
    });
  });
}

function buildWatchConstat(point) {
  const natures = Array.isArray(point?.natures) ? point.natures.filter(Boolean) : [];
  if (natures.length > 0) {
    return natures.slice(0, 4).join(" · ");
  }
  const reasons = Array.isArray(point?.reasons) ? point.reasons.filter(Boolean) : [];
  const meaningful = reasons.filter(reason => !/^\d+\s+alerte/i.test(String(reason)));
  if (meaningful.length > 0) {
    return meaningful.slice(0, 3).join(" · ");
  }
  if (reasons.length > 0) {
    return reasons[0];
  }
  const quantified = point?.quantified || {};
  if (quantified.events > 0) {
    return `${quantified.events} événement${quantified.events > 1 ? "s" : ""} de surveillance`;
  }
  if (point?.severity === "critical") return "État critique";
  if (point?.severity === "warn") return "À surveiller";
  return "Vérification requise";
}

function plural(count, singular, pluralForm = null) {
  const n = Number(count) || 0;
  return n > 1 ? pluralForm || `${singular}s` : singular;
}

function buildSynthesisText({
  criticalCount,
  warnCount,
  watchCount,
  ticketCreated,
  ticketClosed
}) {
  const healthy = criticalCount <= 0 && warnCount <= 0;
  let healthSentence;
  if (criticalCount > 0) {
    healthSentence = `L'infrastructure supervisée présente ${criticalCount} ${plural(criticalCount, "point")} critique${criticalCount > 1 ? "s" : ""} sur la période.`;
  } else if (healthy && watchCount === 0) {
    healthSentence = "L'infrastructure supervisée est saine sur la période.";
  } else if (healthy) {
    healthSentence = "L'infrastructure supervisée est globalement saine sur la période.";
  } else {
    healthSentence = "L'infrastructure supervisée nécessite une attention particulière sur la période.";
  }

  let watchSentence = "";
  if (watchCount > 0) {
    const word = watchCount === 1 ? "équipement présente" : "équipements présentent";
    watchSentence = ` ${watchCount === 1 ? "Un" : watchCount === 2 ? "Deux" : watchCount === 3 ? "Trois" : String(watchCount)} ${word} une alerte nécessitant une vérification.`;
  }

  let ticketSentence = "";
  if ((ticketCreated || 0) === 0 && (ticketClosed || 0) === 0) {
    ticketSentence = " Aucun ticket support n'a été créé ou clôturé sur la période.";
  } else {
    const parts = [];
    if (ticketCreated > 0) parts.push(`${ticketCreated} ${plural(ticketCreated, "ticket")} créé${ticketCreated > 1 ? "s" : ""}`);
    if (ticketClosed > 0) parts.push(`${ticketClosed} clôturé${ticketClosed > 1 ? "s" : ""}`);
    ticketSentence = ` Activité support : ${parts.join(", ")}.`;
  }

  return `${healthSentence}${watchSentence}${ticketSentence}`.trim();
}

const INVENTORY_COLUMNS = [
  { id: "family", label: "Famille" },
  { id: "name", label: "Élément" },
  { id: "site", label: "Site" },
  {
    id: "health",
    label: "État",
    render: row => <HealthBadge health={row.health} />
  },
  { id: "metrics", label: "Supervision" },
  { id: "activity", label: "Activité" }
];

const TECH_COLUMNS = [
  { id: "name", label: "Équipement", render: row => <span className={styles.equipmentChip}>{row.name}</span> },
  { id: "status", label: "Supervision" }
];

const SERVICE_TECH_COLUMNS = [
  { id: "name", label: "Service", render: row => <span className={styles.equipmentChip}>{row.name}</span> },
  {
    id: "health",
    label: "État",
    render: row => <HealthBadge health={row.health} />
  }
];

export default function ReportSummarySupervision({
  snapshot,
  supportStats = null,
  credits = null,
  consumedOnPeriod = 0,
  reportStartDate = null,
  reportEndDate = null
}) {
  const [showTechnicalDetail, setShowTechnicalDetail] = useState(false);
  const {
    stats = {},
    groups = {},
    watchPoints = [],
    contrat = null,
    periodLabel = "",
    clientPrefix = "",
    clientMainLabel = "",
    globalComments = [],
    generalComments = []
  } = snapshot || {};

  const notes = (globalComments.length ? globalComments : generalComments).filter(Boolean);
  const packs = Array.isArray(credits?.packs) ? credits.packs : [];
  const creditTotals = computeSupportCreditTotals(credits?.balance, packs);
  const hasCreditData =
    Boolean(credits) &&
    (creditTotals.total > 0 || creditTotals.remaining > 0 || consumedOnPeriod > 0 || packs.length > 0);
  const hasContractInfo = Boolean(contrat?.type || contrat?.debut || contrat?.expiration || hasCreditData);

  const ticketCreated = supportStats?.total ?? stats.tickets ?? 0;
  const ticketClosed = supportStats?.closed ?? 0;
  const ticketOpen = supportStats?.open ?? 0;
  const criticalCount = stats.critical ?? 0;
  const warnCount = stats.warn ?? 0;
  const watchCount = stats.vigilance ?? watchPoints.length;
  const monitoredCount = stats.monitored ?? 0;
  const equipmentCount = stats.equipments ?? 0;

  const periodLong =
    formatPeriodLongFr(reportStartDate, reportEndDate) ||
    periodLabel ||
    "";
  const reportKind = getReportKindLabel(reportStartDate, reportEndDate);
  const clientLine = [clientPrefix, clientMainLabel].filter(Boolean).join(" — ") || clientMainLabel || "Client";

  const globalState = useMemo(() => {
    if (criticalCount > 0) {
      return {
        label: "Critique",
        valueClass: styles.overviewCardValueCritical,
        icon: "mdi:alert-octagon",
        iconColor: "#dc2626",
        hint: `${criticalCount} ${plural(criticalCount, "alerte critique", "alertes critiques")}`
      };
    }
    if (watchCount > 0 || warnCount > 0) {
      return {
        label: "Globalement sain",
        valueClass: styles.overviewCardValueOk,
        icon: "mdi:check-circle",
        iconColor: "#059669",
        hint: `${watchCount} ${plural(watchCount, "point")} à surveiller`
      };
    }
    return {
      label: "Sain",
      valueClass: styles.overviewCardValueOk,
      icon: "mdi:check-circle",
      iconColor: "#059669",
      hint: "Aucun point à surveiller"
    };
  }, [criticalCount, warnCount, watchCount]);

  const watchHint =
    criticalCount > 0
      ? `${criticalCount} ${plural(criticalCount, "alerte critique", "alertes critiques")}`
      : "Aucune alerte critique signalée";

  const synthesisText = useMemo(
    () =>
      buildSynthesisText({
        criticalCount,
        warnCount,
        watchCount,
        ticketCreated,
        ticketClosed
      }),
    [criticalCount, warnCount, watchCount, ticketCreated, ticketClosed]
  );

  const infraModules = groups.infra || [];
  const cyberModules = groups.cyber || [];
  const cloudModules = groups.cloud || [];
  const infraCount = infraModules.reduce((sum, module) => sum + (Number(module.count) || 0), 0);
  const cyberCount = cyberModules.reduce((sum, module) => sum + (Number(module.count) || 0), 0);
  const cloudCount = cloudModules.reduce((sum, module) => sum + (Number(module.count) || 0), 0);

  const infraRows = useMemo(() => buildInventoryRows(infraModules), [infraModules]);
  const cyberRows = useMemo(() => buildInventoryRows(cyberModules), [cyberModules]);
  const cloudRows = useMemo(() => buildInventoryRows(cloudModules), [cloudModules]);
  const serverTechRows = useMemo(
    () => buildTechnicalRows(infraModules.filter(module => module.key === "Servers")),
    [infraModules]
  );
  const storageTechRows = useMemo(
    () => buildTechnicalRows(infraModules.filter(module => module.key === "Storage")),
    [infraModules]
  );
  const serviceTechRows = useMemo(() => {
    const rows = [];
    [...cyberModules, ...cloudModules].forEach(module => {
      const equipments = Array.isArray(module.equipments) ? module.equipments : [];
      if (!equipments.length) {
        rows.push({
          _rowKey: module.key,
          name: module.label,
          health: module.health || "ok"
        });
        return;
      }
      equipments.forEach(eq => {
        rows.push({
          _rowKey: eq.key || `${module.key}-${eq.label}`,
          name: eq.label || module.label,
          health: eq.health || module.health || "ok"
        });
      });
    });
    return rows;
  }, [cyberModules, cloudModules]);

  const contractKpis = hasContractInfo
    ? [
        {
          label: "Type de contrat",
          value: contrat?.type || "—",
          icon: "mdi:file-document-outline",
          iconColor: "#4b5563"
        },
        {
          label: "Début",
          value: formatDateFr(contrat?.debut),
          icon: "mdi:calendar-start",
          iconColor: "#4b5563"
        },
        {
          label: "Expiration",
          value: formatDateFr(contrat?.expiration),
          icon: "mdi:calendar-end",
          iconColor: "#4b5563"
        },
        {
          label: "Crédits restants",
          value: hasCreditData ? creditTotals.remaining : "—",
          hint: hasCreditData && creditTotals.total > 0 ? `sur ${creditTotals.total}` : periodLabel || null,
          icon: "mdi:ticket-percent-outline",
          iconColor: "#0891b2"
        },
        {
          label: "Crédits consommés",
          value: hasCreditData ? consumedOnPeriod : "—",
          hint: periodLabel || null,
          icon: "mdi:ticket-confirmation-outline",
          iconColor: "#7c3aed"
        },
        {
          label: "Total crédits",
          value: hasCreditData ? creditTotals.total : "—",
          icon: "mdi:counter",
          iconColor: "#4b5563"
        }
      ]
    : [];

  if (!snapshot) return null;

  return (
    <div className={styles.executiveRoot}>
      <header className={styles.executiveHeader}>
        <h3 className={styles.executiveTitle}>Synthèse de supervision</h3>
        <p className={styles.executiveClient}>{clientLine}</p>
        <div className={styles.executiveMeta}>
          {periodLong ? <span className={styles.executivePeriod}>{periodLong}</span> : null}
          <span className={styles.executiveBadge}>{reportKind}</span>
        </div>
      </header>

      <section>
        <h4 className={styles.overviewTitle}>Vue d&apos;ensemble</h4>
        <div className={styles.overviewGrid}>
          <article className={styles.overviewCard}>
            <div className={styles.overviewCardHead}>
              <IconifyIcon icon="mdi:view-grid-outline" width={16} height={16} />
              Éléments suivis
            </div>
            <div className={styles.overviewCardValue}>{equipmentCount}</div>
            <div className={styles.overviewCardHint}>Infrastructure, cybersécurité et services cloud</div>
          </article>

          <article className={styles.overviewCard}>
            <div className={styles.overviewCardHead}>
              <IconifyIcon icon={globalState.icon} width={16} height={16} color={globalState.iconColor} />
              État global
            </div>
            <div className={`${styles.overviewCardValue} ${globalState.valueClass}`}>{globalState.label}</div>
            <div className={styles.overviewCardHint}>{globalState.hint}</div>
          </article>

          <article className={styles.overviewCard}>
            <div className={styles.overviewCardHead}>
              <IconifyIcon icon="mdi:alert" width={16} height={16} color={watchCount > 0 ? "#d97706" : "#059669"} />
              Points à surveiller
            </div>
            <div className={`${styles.overviewCardValue} ${watchCount > 0 ? styles.overviewCardValueWarn : ""}`}>
              {watchCount}
            </div>
            <div className={styles.overviewCardHint}>{watchHint}</div>
          </article>

          <article className={styles.overviewCard}>
            <div className={styles.overviewCardHead}>
              <IconifyIcon icon="mdi:headset" width={16} height={16} />
              Activité support
            </div>
            <div className={styles.overviewCardValue}>{ticketCreated}</div>
            <div className={styles.overviewCardHint}>
              {ticketCreated === 1 ? "Ticket créé sur la période" : "Tickets créés sur la période"}
            </div>
          </article>
        </div>
      </section>

      <p className={styles.synthesisBlock}>
        <span className={styles.synthesisLabel}>Synthèse :</span> {synthesisText}
      </p>

      <section className={styles.sectionBlock}>
        <h4 className={styles.sectionHeading}>Points à surveiller</h4>
        <p className={`${styles.sectionLead} ${watchCount === 0 ? styles.sectionLeadOk : ""}`.trim()}>
          <IconifyIcon
            icon={watchCount > 0 ? "mdi:alert" : "mdi:check-circle"}
            width={16}
            height={16}
          />
          {watchCount > 0
            ? `${watchCount} ${plural(watchCount, "élément")} ${watchCount > 1 ? "nécessitent" : "nécessite"} une vérification`
            : "Aucun élément à surveiller sur la période"}
        </p>

        {watchCount > 0 ? (
          <div className={styles.watchTableWrap}>
            <table className={styles.watchTable}>
              <thead>
                <tr>
                  <th>Équipement</th>
                  <th>Type</th>
                  <th>Site</th>
                  <th>Constat</th>
                </tr>
              </thead>
              <tbody>
                {watchPoints.map(point => (
                  <tr key={point.id || point.equipmentKey || point.label}>
                    <td>
                      <span className={styles.equipmentChip}>{point.label || "—"}</span>
                    </td>
                    <td>{point.moduleLabel || "—"}</td>
                    <td>{point.site || "—"}</td>
                    <td>
                      <span className={styles.watchConstat}>{buildWatchConstat(point)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <p className={styles.sectionFootnote}>
          Les détails des alertes et les actions associées peuvent être consultés dans l&apos;outil de supervision
          ou dans le détail technique du rapport.
        </p>
      </section>

      <section className={styles.sectionBlock}>
        <h4 className={styles.sectionHeading}>Périmètre supervisé</h4>
        <p className={styles.perimeterLead}>
          {equipmentCount} éléments référencés · {monitoredCount} éléments supervisés activement
        </p>

        {infraModules.length > 0 ? (
          <div className={styles.familyCard}>
            <h5 className={styles.familyCardTitle}>Infrastructure — {infraCount} éléments</h5>
            <div className={styles.familyModules}>
              {infraModules.map(module => (
                <div key={module.key} className={styles.familyModule}>
                  <span className={styles.familyModuleName}>{module.label}</span>
                  <span className={styles.familyModuleValue}>{module.count}</span>
                  {module.monitored > 0 ? (
                    <span className={styles.familyModuleHint}>{module.monitored} supervisé{module.monitored > 1 ? "s" : ""}</span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {cyberModules.length > 0 ? (
          <div className={styles.familyCard}>
            <h5 className={styles.familyCardTitle}>Cybersécurité — {cyberCount} éléments</h5>
            <div className={styles.familyModules}>
              {cyberModules.map(module => (
                <div key={module.key} className={styles.familyModule}>
                  <span className={styles.familyModuleName}>{module.label}</span>
                  <span className={styles.familyModuleValue}>{module.count}</span>
                  {module.monitored > 0 ? (
                    <span className={styles.familyModuleHint}>{module.monitored} supervisé{module.monitored > 1 ? "s" : ""}</span>
                  ) : module.health && module.health !== "ok" ? (
                    <span className={styles.familyModuleHint}>
                      {module.health === "critical" ? "Critique" : "À surveiller"}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {cloudModules.length > 0 ? (
          <div className={styles.familyCard}>
            <h5 className={styles.familyCardTitle}>Services cloud — {cloudCount} éléments</h5>
            <div className={styles.familyModules}>
              {cloudModules.map(module => (
                <div key={module.key} className={styles.familyModule}>
                  <span className={styles.familyModuleName}>{module.label}</span>
                  <span className={styles.familyModuleValue}>{module.count}</span>
                  {module.monitored > 0 ? (
                    <span className={styles.familyModuleHint}>{module.monitored} supervisé{module.monitored > 1 ? "s" : ""}</span>
                  ) : module.health && module.health !== "ok" ? (
                    <span className={styles.familyModuleHint}>
                      {module.health === "critical" ? "Critique" : "À surveiller"}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className={styles.sectionBlock}>
        <h4 className={styles.sectionHeading}>Activité support</h4>
        <div className={styles.supportGrid}>
          <div className={styles.supportCard}>
            <span className={styles.supportCardLabel}>Créés</span>
            <span className={styles.supportCardValue}>{ticketCreated}</span>
          </div>
          <div className={styles.supportCard}>
            <span className={styles.supportCardLabel}>Clôturés</span>
            <span className={styles.supportCardValue}>{ticketClosed}</span>
          </div>
          <div className={styles.supportCard}>
            <span className={styles.supportCardLabel}>Ouverts</span>
            <span className={styles.supportCardValue}>{ticketOpen}</span>
          </div>
        </div>
        {ticketCreated === 0 && ticketClosed === 0 && ticketOpen === 0 ? (
          <p className={styles.sectionFootnote}>Aucune activité support enregistrée sur la période.</p>
        ) : null}
      </section>

      {notes.length > 0 ? (
        <section className={styles.sectionBlock} data-export-comments="true">
          <h4 className={styles.sectionHeading}>Notes du rapport</h4>
          <div className={infraStyles.infraTableWrapper}>
            <table className={infraStyles.infraTable}>
              <thead>
                <tr>
                  <th className={infraStyles.infraTableHeaderCell}>Date</th>
                  <th className={infraStyles.infraTableHeaderCell}>Note</th>
                </tr>
              </thead>
              <tbody>
                {notes.map((comment, idx) => (
                  <tr key={comment.id || idx} className={infraStyles.infraTableRow}>
                    <td className={infraStyles.infraTableCell}>{comment.dateLabel || "—"}</td>
                    <td className={infraStyles.infraTableCell}>{renderTextWithLinks(comment.text)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className={styles.sectionBlock} data-export-hide="true">
        <button
          type="button"
          className={styles.detailToggle}
          onClick={() => setShowTechnicalDetail(prev => !prev)}
          aria-expanded={showTechnicalDetail}
        >
          <IconifyIcon icon={showTechnicalDetail ? "mdi:chevron-up" : "mdi:chevron-down"} width={18} height={18} />
          {showTechnicalDetail ? "Masquer le détail technique" : "Voir le détail de l'infrastructure"}
        </button>

        {showTechnicalDetail ? (
          <div className={styles.detailPanel}>
            {hasContractInfo ? (
              <div>
                <h5 className={styles.detailSectionTitle}>Contrat et crédits</h5>
                <ReportCategoryKpisBlock items={contractKpis} />
              </div>
            ) : null}

            {serverTechRows.length > 0 ? (
              <div>
                <h5 className={styles.detailSectionTitle}>Serveurs</h5>
                <ReportTableBlock title={null} columns={TECH_COLUMNS} rows={serverTechRows} emptyMessage={null} />
              </div>
            ) : null}

            {storageTechRows.length > 0 ? (
              <div>
                <h5 className={styles.detailSectionTitle}>Stockage</h5>
                <ReportTableBlock title={null} columns={TECH_COLUMNS} rows={storageTechRows} emptyMessage={null} />
              </div>
            ) : null}

            {serviceTechRows.length > 0 ? (
              <div>
                <h5 className={styles.detailSectionTitle}>Services cloud et cybersécurité</h5>
                <ReportTableBlock title={null} columns={SERVICE_TECH_COLUMNS} rows={serviceTechRows} emptyMessage={null} />
              </div>
            ) : null}

            <div>
              <h5 className={styles.detailSectionTitle}>Inventaire complet</h5>
              <ReportTableBlock title="Infrastructure" count={infraRows.length} columns={INVENTORY_COLUMNS} rows={infraRows} emptyMessage={null} />
              <ReportTableBlock title="Cybersécurité" count={cyberRows.length} columns={INVENTORY_COLUMNS} rows={cyberRows} emptyMessage={null} />
              <ReportTableBlock title="Services & cloud" count={cloudRows.length} columns={INVENTORY_COLUMNS} rows={cloudRows} emptyMessage={null} />
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
