import React, { useEffect, useMemo, useState } from "react";
import { fetchClientSupportCredits } from "../../../../api/clients";
import { isDateWithinPeriod } from "../supervisionReportBuilder";
import { buildSummarySnapshot } from "./summaryData";
import { fetchSupportSummary } from "./summarySupport";
import ReportSummarySupervision from "../ReportSummary/ReportSummarySupervision";
import ReportSummaryBackup from "../ReportSummary/ReportSummaryBackup";
import ReportSummaryServicesCyber from "../ReportSummary/ReportSummaryServicesCyber";
import styles from "./SummaryStep.module.css";

const REPORT_TABS = [
  {
    id: "supervision",
    badge: "Rapport 1",
    title: "Supervision",
    desc: "Synthèse globale, vigilance, contrat, inventaire et support."
  },
  {
    id: "sauvegarde",
    badge: "Rapport 2",
    title: "Sauvegardes",
    desc: "Instances, flux et jobs de sauvegarde."
  },
  {
    id: "services",
    badge: "Rapport 3",
    title: "Services",
    desc: "Antivirus, antispam, Microsoft 365 et noms de domaine."
  }
];

function creditsConsumedInPeriod(ledger = [], start, end) {
  if (!Array.isArray(ledger) || !ledger.length) return 0;
  return ledger.reduce((sum, entry) => {
    const kind = String(entry?.kind || "").toLowerCase();
    if (kind !== "debit") return sum;
    if (!isDateWithinPeriod(entry?.created_at || entry?.createdAt, start, end)) return sum;
    const delta = Number(entry?.delta);
    if (!Number.isFinite(delta)) return sum;
    return sum + Math.abs(delta);
  }, 0);
}

export default function SummaryStep({
  client,
  equipmentCheckMKData = {},
  monitoringSyncStatus = {},
  allComments = [],
  equipmentCommentCounts = {},
  equipmentTicketCounts = {},
  equipmentAlertCounts = {},
  summaryContentRef = null
}) {
  const [supportStats, setSupportStats] = useState(null);
  const [credits, setCredits] = useState(null);
  const [activeReport, setActiveReport] = useState("supervision");

  useEffect(() => {
    if (!client) {
      setSupportStats(null);
      setCredits(null);
      return undefined;
    }
    const controller = new AbortController();
    const clientId = client?.id ?? client?.uuid;
    fetchSupportSummary(client, controller.signal).then(setSupportStats);
    if (clientId) {
      fetchClientSupportCredits(clientId, { signal: controller.signal })
        .then(setCredits)
        .catch(() => setCredits(null));
    }
    return () => controller.abort();
  }, [client]);

  const snapshot = useMemo(
    () =>
      buildSummarySnapshot({
        client,
        equipmentCheckMKData,
        monitoringSyncStatus,
        equipmentCommentCounts,
        equipmentTicketCounts,
        equipmentAlertCounts,
        allComments
      }),
    [
      client,
      equipmentCheckMKData,
      monitoringSyncStatus,
      equipmentCommentCounts,
      equipmentTicketCounts,
      equipmentAlertCounts,
      allComments
    ]
  );

  if (!client) {
    return (
      <div className={styles.root}>
        <p className={styles.empty}>Sélectionnez un client pour afficher la synthèse.</p>
      </div>
    );
  }

  const consumedOnPeriod = creditsConsumedInPeriod(
    credits?.ledger,
    client?.reportStartDate,
    client?.reportEndDate
  );

  const introMeta = {
    clientPrefix: snapshot?.clientPrefix || "",
    clientMainLabel: snapshot?.clientMainLabel || client?.name || client?.nom || "",
    periodLabel: snapshot?.periodLabel || ""
  };

  return (
    <div className={styles.root} ref={summaryContentRef}>
      <div className={styles.reportTabs} role="tablist" aria-label="Rapports de synthèse" data-export-hide="true">
        {REPORT_TABS.map(tab => {
          const active = activeReport === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`${styles.reportTab} ${active ? styles.reportTabActive : ""}`.trim()}
              onClick={() => setActiveReport(tab.id)}
            >
              <span className={styles.reportTabBadge}>{tab.badge}</span>
              <span className={styles.reportTabTitle}>{tab.title}</span>
              <span className={styles.reportTabDesc}>{tab.desc}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.reportStack}>
        <article
          className={`${styles.reportDoc} ${activeReport === "supervision" ? styles.reportDocActive : styles.reportDocHidden}`.trim()}
          data-report-export="supervision"
          data-report-title="Rapport de supervision"
          aria-hidden={activeReport !== "supervision"}
        >
          <header className={styles.reportDocHead} data-export-hide="true">
            <span className={styles.reportDocBadge}>Rapport 1</span>
            <h2 className={styles.reportDocTitle}>Supervision</h2>
            <p className={styles.reportDocDesc}>Synthèse globale, vigilance, contrat, inventaire et support.</p>
          </header>
          <div className={styles.exportRoot}>
            <ReportSummarySupervision
              snapshot={snapshot}
              supportStats={supportStats}
              credits={credits}
              consumedOnPeriod={consumedOnPeriod}
              reportStartDate={client?.reportStartDate}
              reportEndDate={client?.reportEndDate}
            />
          </div>
        </article>

        <article
          className={`${styles.reportDoc} ${activeReport === "sauvegarde" ? styles.reportDocActive : styles.reportDocHidden}`.trim()}
          data-report-export="sauvegarde"
          data-report-title="Rapport sauvegardes"
          aria-hidden={activeReport !== "sauvegarde"}
        >
          <header className={styles.reportDocHead} data-export-hide="true">
            <span className={styles.reportDocBadge}>Rapport 2</span>
            <h2 className={styles.reportDocTitle}>Sauvegardes</h2>
            <p className={styles.reportDocDesc}>Instances, flux et jobs de sauvegarde uniquement.</p>
          </header>
          <div className={styles.exportRoot}>
            <ReportSummaryBackup
              client={client}
              clientPrefix={introMeta.clientPrefix}
              clientMainLabel={introMeta.clientMainLabel}
              reportEndDate={client?.reportEndDate}
            />
          </div>
        </article>

        <article
          className={`${styles.reportDoc} ${activeReport === "services" ? styles.reportDocActive : styles.reportDocHidden}`.trim()}
          data-report-export="services"
          data-report-title="Rapport services"
          aria-hidden={activeReport !== "services"}
        >
          <header className={styles.reportDocHead} data-export-hide="true">
            <span className={styles.reportDocBadge}>Rapport 3</span>
            <h2 className={styles.reportDocTitle}>Services</h2>
            <p className={styles.reportDocDesc}>Antivirus, antispam, Microsoft 365 et noms de domaine.</p>
          </header>
          <div className={styles.exportRoot}>
            <ReportSummaryServicesCyber
              client={client}
              clientPrefix={introMeta.clientPrefix}
              clientMainLabel={introMeta.clientMainLabel}
              reportStartDate={client?.reportStartDate}
              reportEndDate={client?.reportEndDate}
            />
          </div>
        </article>
      </div>
    </div>
  );
}
