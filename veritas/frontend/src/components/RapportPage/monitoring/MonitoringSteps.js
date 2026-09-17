import React, { useMemo, useState, lazy, Suspense } from "react";
import { Icon } from "@iconify/react";
import styles from "./RapportMonitoringBuilder.module.css";
import shellStyles from "../RapportBuilderPlaceholder.module.css";
import CheckMKMonitoringModal from "./CheckMKMonitoringModal";
import InternetStep from "./steps/InternetStep";
import FirewallStep from "./steps/FirewallStep";
import ServersStep from "./steps/ServeursStep";
import StorageStep from "./steps/StockageStep";
import SwitchStep from "./steps/SwitchStep";
import BorneWifiStep from "./steps/BorneWifiStep";
import TOIPStep from "./steps/TOIPStep";
import BackupStep from "./steps/SauvegardeStep";
import AntispamStep from "./steps/AntispamStep";
import Office365Step from "./steps/Office365Step";
import NDDStep from "./steps/NDDStep";
import SummaryStep from "./steps/SummaryStep";
import SupportStep from "./steps/SupportStep";
import EquipmentEditModal from "./EquipmentEditModal";
import { findEquipmentLocation } from "./equipmentPatchUtils";
const AntivirusStepLazy = lazy(() => import("./steps/AntivirusStep"));

export const MONITORING_MODULE_STEP_ORDER = [
  "Internet",
  "Firewall",
  "Servers",
  "Storage",
  "Switch",
  "BorneWifi",
  "TOIP",
  "Backup",
  "Antivirus",
  "Antispam",
  "Office365",
  "NDD"
];

/** @deprecated Prefer MONITORING_MODULE_STEP_ORDER; kept for callers that import the old name. */
export const MONITORING_STEP_ORDER = MONITORING_MODULE_STEP_ORDER;

export const MODULE_LABELS = {
  Internet: "Internet",
  Firewall: "Firewall",
  Servers: "Serveurs",
  Storage: "Stockage",
  Switch: "Switch",
  BorneWifi: "Bornes Wi‑Fi",
  TOIP: "TOIP / VOIP",
  Backup: "Sauvegarde",
  Antivirus: "Antivirus",
  Antispam: "Antispam",
  Office365: "Office 365",
  NDD: "Noms de domaine",
  support: "Support technique",
  summary: "Synthèse"
};

export const MODULE_ICONS = {
  Internet: "mdi:wan",
  Firewall: "mdi:firewall",
  Servers: "mdi:server",
  Storage: "mdi:harddisk",
  Switch: "mdi:switch",
  BorneWifi: "mdi:wifi",
  TOIP: "mdi:phone-voip",
  Backup: "mdi:backup-restore",
  Antivirus: "mdi:shield-bug-outline",
  Antispam: "mdi:email-lock-outline",
  Office365: "mdi:microsoft-office",
  NDD: "mdi:web",
  support: "mdi:headset",
  summary: "mdi:file-chart-outline"
};

const INFRASTRUCTURE_TOPIC_KEYS = ["Internet", "Firewall", "Servers", "Storage", "Switch", "BorneWifi", "TOIP"];

export const REPORT_TOPIC_GROUPS = [{
  key: "infrastructure",
  icon: "mdi:lan",
  topics: INFRASTRUCTURE_TOPIC_KEYS
}, {
  key: "cyber",
  icon: "mdi:shield-lock-outline",
  topics: ["Antivirus", "Antispam", "Backup"]
}, {
  key: "cloud",
  icon: "mdi:cloud-outline",
  topics: ["Office365", "NDD"]
}];

export function getClientMonitoringModules(client) {
  if (!client) return {};
  return client.modules_monitoring || {};
}

function getEquipementList(equipements, key) {
  const list = equipements?.[key];
  return Array.isArray(list) ? list : [];
}

function getSolutionsList(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.solutions)) return raw.solutions;
  return [];
}

function getBackupInstances(raw) {
  if (!raw) return [];
  if (Array.isArray(raw.instances)) return raw.instances;
  return [];
}

function hasOffice365Equipment(client) {
  const raw = client?.equipements?.Office365;
  if (raw && typeof raw === "object") {
    if (Array.isArray(raw)) return raw.length > 0;
    const data = raw.data || raw;
    if (data && typeof data === "object") {
      const keys = Object.keys(data);
      if (keys.length > 0 && !(keys.length === 1 && data.enabled === true)) {
        return true;
      }
    }
  }
  return Boolean(client?.has_azure_credentials || client?.hasAzureCredentials || client?.azureHasCredentials);
}

export function isMonitoringModuleAvailable(client, stepKey) {
  if (!client) return false;
  const eq = client.equipements || {};
  switch (stepKey) {
    case "Internet":
      return getEquipementList(eq, "Internet").length > 0;
    case "Firewall":
      return getEquipementList(eq, "Firewalls").length > 0;
    case "Servers":
      return getEquipementList(eq, "Serveurs").length > 0 || getEquipementList(eq, "Servers").length > 0;
    case "Storage":
      return getEquipementList(eq, "NAS").length + getEquipementList(eq, "SAN").length > 0;
    case "Switch":
      return getEquipementList(eq, "Switch").length > 0;
    case "BorneWifi":
      return getEquipementList(eq, "BorneWifi").length > 0;
    case "TOIP":
      return getSolutionsList(eq.TOIP).length > 0;
    case "Backup":
      return getBackupInstances(eq.Sauvegarde).length > 0 || getBackupInstances(eq.Backup).length > 0;
    case "Antivirus":
      return getSolutionsList(eq.Antivirus).length > 0;
    case "Antispam":
      return getSolutionsList(eq.Antispam).length > 0;
    case "Office365":
      return hasOffice365Equipment(client);
    case "NDD":
      return getEquipementList(eq, "NDD").length > 0;
    default:
      return false;
  }
}

export function countMonitoringModuleItems(client, stepKey) {
  if (!client) return 0;
  const eq = client.equipements || {};
  switch (stepKey) {
    case "Internet":
      return getEquipementList(eq, "Internet").length;
    case "Firewall":
      return getEquipementList(eq, "Firewalls").length;
    case "Servers":
      return getEquipementList(eq, "Serveurs").length + getEquipementList(eq, "Servers").length;
    case "Storage":
      return getEquipementList(eq, "NAS").length + getEquipementList(eq, "SAN").length;
    case "Switch":
      return getEquipementList(eq, "Switch").length;
    case "BorneWifi":
      return getEquipementList(eq, "BorneWifi").length;
    case "TOIP":
      return getSolutionsList(eq.TOIP).length;
    case "Backup":
      return getBackupInstances(eq.Sauvegarde).length + getBackupInstances(eq.Backup).length;
    case "Antivirus":
      return getSolutionsList(eq.Antivirus).length;
    case "Antispam":
      return getSolutionsList(eq.Antispam).length;
    case "Office365":
      return hasOffice365Equipment(client) ? 1 : 0;
    case "NDD":
      return getEquipementList(eq, "NDD").length;
    default:
      return 0;
  }
}

export function isMonitoringStepEnabled(client, stepKey) {
  if (!client) return false;
  if (stepKey === "support" || stepKey === "summary") return true;
  const selected = Array.isArray(client.reportSelectedModules) ? client.reportSelectedModules : null;
  if (selected && !selected.includes(stepKey)) return false;
  return isMonitoringModuleAvailable(client, stepKey);
}

export function getEnabledMonitoringSteps(client) {
  const selected = Array.isArray(client?.reportSelectedModules) ? client.reportSelectedModules : null;
  const moduleSteps = MONITORING_MODULE_STEP_ORDER.filter(stepKey => {
    if (selected && !selected.includes(stepKey)) return false;
    return isMonitoringModuleAvailable(client, stepKey);
  });
  if (moduleSteps.length === 0) return [];
  return [...moduleSteps, "support", "summary"];
}

export default function MonitoringSteps({
  client,
  activeStepIndex,
  onStepChange,
  onOpenComments,
  onTicketCreatedForEquipment,
  onRefreshClient,
  onEquipmentSaved,
  equipmentCommentCounts,
  equipmentTicketCounts,
  equipmentAlertCounts = {},
  equipmentComments = {},
  highlightedEquipmentKey,
  monitoringSyncStatus,
  equipmentCheckMKData = {},
  isSyncingMonitoring,
  onSyncCheckMK,
  syncingEquipmentKey,
  isSyncingOffice365Report,
  allCommentsChronological = [],
  summaryContentRef = null,
  stockageReportState = null,
  onSetStorageReportState,
  commentsPane = null
}) {
  const [internalIndex, setInternalIndex] = useState(0);
  const [isSyncingAntivirus, setIsSyncingAntivirus] = useState(false);
  const [checkMKModal, setCheckMKModal] = useState({
    isOpen: false,
    equipment: null,
    moduleKey: null,
    equipmentKey: null,
    preLoadedData: null
  });
  const [editEquipmentModal, setEditEquipmentModal] = useState({
    open: false,
    equipment: null,
    moduleKey: null,
    equipmentIndex: -1,
    equipmentListKey: null
  });
  const reportPeriod = useMemo(() => {
    const start = client?.reportStartDate;
    const end = client?.reportEndDate;
    if (!start || !end) return {};
    return { start, end, startTime: start, endTime: end };
  }, [client?.reportStartDate, client?.reportEndDate]);

  const handleOpenCheckMKDetail = async (item, { moduleKey, equipmentKey }) => {
    const resolvedKey = item?.id != null ? String(item.id) : equipmentKey != null ? String(equipmentKey) : null;
    setCheckMKModal({
      isOpen: true,
      equipment: item,
      moduleKey,
      equipmentKey: resolvedKey,
      preLoadedData: null
    });
  };

  const handleCloseCheckMKModal = () => {
    setCheckMKModal({ isOpen: false, equipment: null, moduleKey: null, equipmentKey: null, preLoadedData: null });
  };

  const handleRefreshCheckMKModal = async () => {
    if (!checkMKModal.equipment || typeof onSyncCheckMK !== "function") return;
    await onSyncCheckMK(checkMKModal.equipment, {
      moduleKey: checkMKModal.moduleKey,
      equipmentKey: checkMKModal.equipmentKey
    });
  };

  const handleEditEquipment = (item, { moduleKey }) => {
    const { equipmentListKey, equipmentIndex } = findEquipmentLocation(client, moduleKey, item);
    setEditEquipmentModal({ open: true, equipment: item, moduleKey, equipmentIndex, equipmentListKey });
  };

  const handleCloseEditEquipmentModal = () => {
    setEditEquipmentModal({ open: false, equipment: null, moduleKey: null, equipmentIndex: -1, equipmentListKey: null });
  };

  const handleEquipmentSaved = async (formData, createdRow, sourceEquipment, savedModuleKey) => {
    const moduleKey = savedModuleKey ?? editEquipmentModal.moduleKey;
    const equipment = sourceEquipment ?? editEquipmentModal.equipment;
    const equipmentIndex = editEquipmentModal.equipmentIndex;
    const equipmentListKey = editEquipmentModal.equipmentListKey;
    if (typeof onEquipmentSaved === "function") {
      await onEquipmentSaved(formData, createdRow, equipment, moduleKey, equipmentIndex, equipmentListKey);
      return;
    }
    if (typeof onRefreshClient === "function") await onRefreshClient();
  };

  const infraStepProps = useMemo(() => ({
    reportPeriod,
    onOpenCheckMKDetail: handleOpenCheckMKDetail,
    onOpenComments,
    onTicketCreatedForEquipment,
    onRefreshClient,
    onEditEquipment: handleEditEquipment,
    onAntivirusSyncStateChange: setIsSyncingAntivirus,
    commentCounts: equipmentCommentCounts,
    ticketCounts: equipmentTicketCounts,
    alertCounts: equipmentAlertCounts,
    highlightedEquipmentKey,
    monitoringSyncStatus,
    equipmentCheckMKData,
    isSyncingMonitoring,
    onSyncCheckMK,
    syncingEquipmentKey
  }), [reportPeriod, onOpenComments, onTicketCreatedForEquipment, onRefreshClient, equipmentCommentCounts, equipmentTicketCounts, equipmentAlertCounts, highlightedEquipmentKey, monitoringSyncStatus, equipmentCheckMKData, isSyncingMonitoring, onSyncCheckMK, syncingEquipmentKey]);

  const setCurrentIndex = updater => {
    setInternalIndex(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (typeof onStepChange === "function") onStepChange(next);
      return next;
    });
  };

  const steps = useMemo(() => getEnabledMonitoringSteps(client), [client]);
  const hasSteps = steps.length > 0;

  if (!client) {
    return <div className={styles.rapportListSection}><div className={styles.rapportListEmpty}>Sélectionnez un client pour construire le rapport de supervision.</div></div>;
  }
  if (!hasSteps) {
    return <div className={styles.builderSection}><div className={styles.builderSubtitle}>Aucun équipement ou service configuré pour ce client.</div></div>;
  }

  const currentIndex = typeof activeStepIndex === "number" ? activeStepIndex : internalIndex;
  const safeIndex = Math.min(Math.max(0, currentIndex), steps.length - 1);
  const currentStepKey = steps[safeIndex];
  const getStepLabel = stepKey => MODULE_LABELS[stepKey] || stepKey;

  const renderCurrentStep = () => {
    switch (currentStepKey) {
      case "Internet":
        return <InternetStep client={client} {...infraStepProps} />;
      case "Firewall":
        return <FirewallStep client={client} {...infraStepProps} />;
      case "Servers":
        return <ServersStep client={client} {...infraStepProps} />;
      case "Storage":
        return <StorageStep client={client} {...infraStepProps} persistedState={stockageReportState} onPersistState={onSetStorageReportState} />;
      case "Switch":
        return <SwitchStep client={client} {...infraStepProps} />;
      case "BorneWifi":
        return <BorneWifiStep client={client} {...infraStepProps} />;
      case "TOIP":
        return <TOIPStep client={client} {...infraStepProps} />;
      case "Backup":
        return <BackupStep client={client} reportPeriod={reportPeriod} onRefreshClient={onRefreshClient} onOpenComments={onOpenComments} onTicketCreatedForEquipment={onTicketCreatedForEquipment} commentCounts={equipmentCommentCounts} ticketCounts={equipmentTicketCounts} alertCounts={equipmentAlertCounts} highlightedEquipmentKey={highlightedEquipmentKey} />;
      case "Antivirus":
        return <Suspense fallback={<div style={{ padding: "1rem" }}>Chargement Antivirus…</div>}><AntivirusStepLazy client={client} {...infraStepProps} /></Suspense>;
      case "Antispam":
        return <AntispamStep client={client} onRefreshClient={onRefreshClient} onOpenComments={onOpenComments} onTicketCreatedForEquipment={onTicketCreatedForEquipment} commentCounts={equipmentCommentCounts} ticketCounts={equipmentTicketCounts} alertCounts={equipmentAlertCounts} highlightedEquipmentKey={highlightedEquipmentKey} reportPeriod={reportPeriod} />;
      case "Office365":
        return <Office365Step client={client} reportPeriod={reportPeriod} onRefreshClient={onRefreshClient} onOpenComments={onOpenComments} onTicketCreatedForEquipment={onTicketCreatedForEquipment} commentCounts={equipmentCommentCounts} ticketCounts={equipmentTicketCounts} alertCounts={equipmentAlertCounts} highlightedEquipmentKey={highlightedEquipmentKey} />;
      case "NDD":
        return <NDDStep client={client} onRefreshClient={onRefreshClient} onOpenComments={onOpenComments} onTicketCreatedForEquipment={onTicketCreatedForEquipment} commentCounts={equipmentCommentCounts} ticketCounts={equipmentTicketCounts} alertCounts={equipmentAlertCounts} highlightedEquipmentKey={highlightedEquipmentKey} />;
      case "support":
        return <SupportStep client={client} reportPeriod={reportPeriod} />;
      case "summary":
        return (
          <SummaryStep
            client={client}
            equipmentCheckMKData={equipmentCheckMKData}
            monitoringSyncStatus={monitoringSyncStatus}
            allComments={allCommentsChronological}
            equipmentComments={equipmentComments}
            equipmentCommentCounts={equipmentCommentCounts}
            equipmentTicketCounts={equipmentTicketCounts}
            equipmentAlertCounts={equipmentAlertCounts}
            summaryContentRef={summaryContentRef}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className={`${shellStyles.layout} ${commentsPane ? shellStyles.layoutWithComments : ""}`.trim()}>
        <aside className={shellStyles.stepNav} aria-label="Étapes du rapport">
          <div className={shellStyles.stepNavTitle}>Parcours</div>
          {steps.map((stepKey, index) => {
            const isActive = index === safeIndex;
            const isDone = index < safeIndex;
            return (
              <button key={stepKey} type="button" className={`${shellStyles.stepNavItem} ${isActive ? shellStyles.stepNavItemActive : ""} ${isDone ? shellStyles.stepNavItemDone : ""}`} onClick={() => setCurrentIndex(index)}>
                <span className={shellStyles.stepNavIndex} aria-hidden>
                  {isDone && !isActive ? (
                    <Icon icon="mdi:check" width={12} height={12} />
                  ) : (
                    index + 1
                  )}
                </span>
                <Icon icon={MODULE_ICONS[stepKey] || "mdi:checkbox-marked-outline"} className={shellStyles.stepNavIcon} width={16} height={16} aria-hidden />
                <span className={shellStyles.stepNavLabel}>{getStepLabel(stepKey)}</span>
              </button>
            );
          })}
        </aside>

        <section className={shellStyles.stepPanel}>
          <div className={shellStyles.stepPanelHead}>
            <h2 className={shellStyles.stepPanelTitle}>{getStepLabel(currentStepKey)}</h2>
            <span className={shellStyles.stepPanelMeta}>Étape {safeIndex + 1} sur {steps.length}</span>
          </div>
          <div className={shellStyles.stepPanelBody}>
            {(isSyncingMonitoring || isSyncingAntivirus || isSyncingOffice365Report) && (
              <div className={styles.syncSkeleton}>
                <div className={styles.syncSkeletonBar} />
                <div className={styles.syncSkeletonBarShort} />
              </div>
            )}
            {renderCurrentStep()}
          </div>
        </section>
        {commentsPane}
      </div>

      <CheckMKMonitoringModal isOpen={checkMKModal.isOpen} onClose={handleCloseCheckMKModal} equipment={checkMKModal.equipment} moduleKey={checkMKModal.moduleKey} clientId={client?.id ?? client?.uuid} onRefresh={handleRefreshCheckMKModal} refreshing={syncingEquipmentKey === checkMKModal.equipmentKey} />
      <EquipmentEditModal open={editEquipmentModal.open} onClose={handleCloseEditEquipmentModal} client={client} equipment={editEquipmentModal.equipment} moduleKey={editEquipmentModal.moduleKey} onSaved={handleEquipmentSaved} onDeleted={onRefreshClient} backgroundSave />
    </>
  );
}
