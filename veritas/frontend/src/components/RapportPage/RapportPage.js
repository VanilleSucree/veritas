import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { fetchClientsList, fetchClientModules, fetchClientGeneral } from "../../api/clients";
import { getCheckMKReportPeriodData } from "../../api/checkmkReportPeriod";
import { fetchMonitoringDocuments, saveMonitoringDocument } from "../../api/monitoringDocuments";
import styles from "./RapportPage.module.css";
import cyberStyles from "../CybersecuritePage/CybersecuritePage.module.css";
import ReportCreateWizard from "./RapportCreateWizard";
import ReportBuilderPlaceholder from "./RapportBuilderPlaceholder";
import SupervisionPeriodGate from "./SupervisionPeriodGate";
import ReportInterventionBuilder from "./intervention/RapportInterventionBuilder";
import { REPORT_TYPE_IDS } from "./reportTypeConstants";
import MonitoringSteps, { getEnabledMonitoringSteps, MODULE_LABELS } from "./monitoring/MonitoringSteps";
import BuilderCommentsPane from "./monitoring/BuilderCommentsPane";
import ReportSyncProgressModal from "./monitoring/ReportSyncProgressModal";
import { buildSupervisionSyncJobs, runSupervisionSyncJobs, fillSyncCopy } from "./monitoring/supervisionReportSync";
import { applyEquipmentPatchToEquipements } from "./monitoring/equipmentPatchUtils";
import { buildCheckMKCacheEntry, buildCheckMKReportSnapshot, collectCheckMKMappedEquipment, computeCheckMKEquipmentStatus, deriveServicesFromPeriodEvents, filterCheckMKEventsForReportPeriod, getCheckmkHostName, getCheckmkSite, preserveCheckmkMappingsOnEquipements, resolveCheckMKEquipmentKey } from "./monitoring/checkmkReportCacheUtils";
import { getCheckMKServices } from "../../api/equipment";
import { fetchTickets } from "../../api/tickets";
import { fetchSupervisionAlertsHistory } from "../../api/supervisionAlerts";
import { isSupervisionReportBuilderType } from "./monitoring/supervisionReportBuilder";
import { buildPeriodInsights, mergeSeededTicketComments } from "./monitoring/supervisionReportInsights";
import shellStyles from "./RapportBuilderPlaceholder.module.css";
import ConfirmModal from "../Misc/ConfirmModal/ConfirmModal";
import { isReportBuilderSessionActive } from "../../utils/monitoringReportGuard";
import saveModalStyles from "../Monitoring/MonitoringSummary/MonitoringSummary.module.css";
import { exportReportAsZIP, buildReportZipBlob } from "./exportRapportZip";
import { uploadReportArchiveToClientVault } from "../../utils/uploadReportToClientVault";
import ReportSaveVisibilitySwitch from "../shared/ReportSaveVisibilitySwitch";
import { safeJsonClone } from "../../utils/safeJson";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import PageGuideTour from "../PageGuide/PageGuideTour";
import { getRapportGuide } from "../PageGuide/rapportGuideSteps";
import { useRegisterPageGuide } from "../../hooks/useRegisterPageGuide";
import { getRapportPageCopy, getReportTypes } from "./rapportPageI18n";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
const RAPPORT_CLIENTS_CACHE_KEY = "rapport_clients_list_cache_v1";
const RAPPORT_CLIENTS_CACHE_TTL_MS = 5 * 60 * 1000;
function normalizeClientListRow(client) {
  let modulesSnapshot = client.modules;
  if (typeof modulesSnapshot === "string") {
    try {
      modulesSnapshot = JSON.parse(modulesSnapshot);
    } catch {
      modulesSnapshot = {};
    }
  }
  if (!modulesSnapshot || typeof modulesSnapshot !== "object") {
    modulesSnapshot = {};
  }
  return {
    ...client,
    modules_monitoring: modulesSnapshot
  };
}
async function loadReportClientsListCached({
  force = false,
  signal
} = {}) {
  if (!force) {
    try {
      const raw = sessionStorage.getItem(RAPPORT_CLIENTS_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const isFresh = parsed?.savedAt && Array.isArray(parsed?.data) && Date.now() - parsed.savedAt < RAPPORT_CLIENTS_CACHE_TTL_MS;
        if (isFresh) {
          return parsed.data.map(normalizeClientListRow);
        }
      }
    } catch {}
  }
  const clientsData = await fetchClientsList({
    signal
  });
  if (signal?.aborted) return [];
  const normalized = (Array.isArray(clientsData) ? clientsData : []).map(normalizeClientListRow);
  try {
    sessionStorage.setItem(RAPPORT_CLIENTS_CACHE_KEY, JSON.stringify({
      savedAt: Date.now(),
      data: normalized
    }));
  } catch {}
  return normalized;
}
export default function ReportPage({
  onNavigate,
  hasTabsBar = false,
  onMonitoringReportGuardChange
}) {
  const locale = useAppLocale();
  const pageCopy = useMemo(() => getRapportPageCopy(locale), [locale]);
  const [pageGuideOpen, setPageGuideOpen] = useState(false);
  const openPageGuide = useCallback(() => setPageGuideOpen(true), []);
  useRegisterPageGuide(openPageGuide);
  const reportTypes = useMemo(() => getReportTypes(pageCopy, pageCopy.localeCode || locale), [pageCopy, locale]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [builderType, setBuilderType] = useState(null);
  const [builderClient, setBuilderClient] = useState(null);
  const [builderStepIndex, setBuilderStepIndex] = useState(0);
  const [createWizardStep, setCreateWizardStep] = useState("client");
  const rapportGuide = useMemo(() => getRapportGuide(locale, {
    showClient: () => setCreateWizardStep("client"),
    showTypes: () => {
      if (selectedClientId) setCreateWizardStep("type");
    }
  }), [locale, selectedClientId]);
  const [selectedReportTypeId, setSelectedReportTypeId] = useState(null);
  const [draftReport, setDraftReport] = useState(null);
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const builderSectionRef = useRef(null);
  const summaryContentRef = useRef(null);
  const startingReportRef = useRef(false);
  const [equipmentComments, setEquipmentComments] = useState({});
  const [activeCommentsTarget, setActiveCommentsTarget] = useState(null);
  const [generalComments, setGeneralComments] = useState([]);
  const [pendingEquipmentComment, setPendingEquipmentComment] = useState("");
  const [editingComment, setEditingComment] = useState(null);
  const [highlightedEquipmentKey, setHighlightedEquipmentKey] = useState(null);
  const [isSyncingMonitoring, setIsSyncingMonitoring] = useState(false);
  const [syncingEquipmentKey, setSyncingEquipmentKey] = useState(null);
  const [equipmentMonitoringStatus, setEquipmentMonitoringStatus] = useState({});
  const [equipmentCheckMKData, setEquipmentCheckMKData] = useState({});
  const [isSyncingOffice365Report, setIsSyncingOffice365Report] = useState(false);
  const [syncProgress, setSyncProgress] = useState({
    open: false,
    phase: "running",
    items: [],
    currentIndex: 0,
    etaMs: null
  });
  const syncProgressCancelRef = useRef(false);
  const syncProgressAbortRef = useRef(null);
  const syncInFlightRef = useRef(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccessVisible, setSaveSuccessVisible] = useState(false);
  const [saveErrorVisible, setSaveErrorVisible] = useState(false);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [pendingSave, setPendingSave] = useState(null);
  const [saveVisibleToClient, setSaveVisibleToClient] = useState(false);
  const [recentDocs, setRecentDocs] = useState([]);
  const [stepStorageState, setStepStorageState] = useState(null);
  const [startingSupervisionBuilder, setStartingSupervisionBuilder] = useState(false);
  const [equipmentAlertCounts, setEquipmentAlertCounts] = useState({});
  const [equipmentTicketInsightCounts, setEquipmentTicketInsightCounts] = useState({});
  const periodInsightsAbortRef = useRef(null);
  const userInitial = useMemo(() => {
    if (typeof window === "undefined") return "L";
    try {
      const name = window.localStorage && window.localStorage.getItem("user_name") || "";
      const email = window.localStorage && window.localStorage.getItem("user_email") || "";
      const source = (name || email).trim();
      return source ? source[0].toUpperCase() : "L";
    } catch (e) {
      return "L";
    }
  }, []);
  useEffect(() => {
    const ac = createTrackedAbortController();
    const loadClients = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await loadReportClientsListCached({
          signal: ac.signal
        });
        if (ac.signal.aborted) return;
        setClients(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error("Error loading monitoring clients for ReportPage:", err);
        setError("Unable to load the client list.");
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    };
    loadClients();
    return () => ac.abort();
  }, []);
  useEffect(() => {
    if (!isSupervisionReportBuilderType(builderType) || !builderClient?.equipements) return;
    const mappings = collectCheckMKMappedEquipment(builderClient.equipements);
    const initialStatuses = {};
    mappings.forEach(m => {
      if (m.equipment_id != null) initialStatuses[String(m.equipment_id)] = "unsynced";
    });
    setEquipmentMonitoringStatus(prev => {
      const next = {
        ...prev
      };
      Object.entries(initialStatuses).forEach(([key, status]) => {
        if (next[key] == null) next[key] = status;
      });
      return next;
    });
  }, [builderClient, builderType]);
  const isBuilderActive = isReportBuilderSessionActive({
    builderType,
    builderClient,
    draftReport
  });
  const isOnSummaryStep = useMemo(() => {
    if (!builderClient || !isSupervisionReportBuilderType(builderType)) return false;
    const steps = getEnabledMonitoringSteps(builderClient);
    return steps[builderStepIndex] === "summary";
  }, [builderClient, builderType, builderStepIndex]);
  const onMonitoringReportGuardChangeRef = useRef(onMonitoringReportGuardChange);
  onMonitoringReportGuardChangeRef.current = onMonitoringReportGuardChange;
  onMonitoringReportGuardChangeRef.current?.(isBuilderActive);
  useLayoutEffect(() => {
    onMonitoringReportGuardChangeRef.current?.(isBuilderActive);
    return () => onMonitoringReportGuardChangeRef.current?.(false);
  }, [isBuilderActive]);
  const [builderLeaveModalOpen, setBuilderLeaveModalOpen] = useState(false);
  const pendingBuilderLeaveRef = useRef(null);
  const requestLeaveBuilder = action => {
    if (typeof action !== "function") return;
    if (!isBuilderActive) {
      action();
      return;
    }
    pendingBuilderLeaveRef.current = action;
    setBuilderLeaveModalOpen(true);
  };
  const handleBuilderLeaveCancel = () => {
    pendingBuilderLeaveRef.current = null;
    setBuilderLeaveModalOpen(false);
  };
  const handleBuilderLeaveConfirm = () => {
    const action = pendingBuilderLeaveRef.current;
    pendingBuilderLeaveRef.current = null;
    setBuilderLeaveModalOpen(false);
    action?.();
  };
  const selectedClient = useMemo(() => clients.find(c => String(c.id) === selectedClientId) || null, [clients, selectedClientId]);
  const handleWizardSelectClient = clientId => {
    setSelectedClientId(clientId);
    setSelectedReportTypeId(null);
    setDraftReport(null);
  };
  const handleStartDraftReport = async reportTypeId => {
    const resolvedTypeId = reportTypeId ?? selectedReportTypeId;
    if (!selectedClient || !resolvedTypeId || startingReportRef.current) return;
    const type = reportTypes.find(entry => entry.id === resolvedTypeId);
    if (!type || type.comingSoon) return;
    startingReportRef.current = true;
    setSelectedReportTypeId(resolvedTypeId);
    try {
      const clientForDraft = type.id === REPORT_TYPE_IDS.INTERVENTION ? await enrichBuilderClientWithSites(selectedClient) : selectedClient;
      setDraftReport({
        type,
        client: clientForDraft,
        documentId: null,
        initialData: null,
        documentName: ""
      });
    } finally {
      startingReportRef.current = false;
    }
  };
  const loadPeriodInsights = async (client, startDate, endDate) => {
    const clientId = client?.id ?? client?.uuid;
    if (!clientId || !startDate || !endDate) {
      setEquipmentAlertCounts({});
      setEquipmentTicketInsightCounts({});
      return;
    }
    if (periodInsightsAbortRef.current) {
      periodInsightsAbortRef.current.abort();
    }
    const controller = new AbortController();
    periodInsightsAbortRef.current = controller;
    try {
      const [ticketRows, alertRows] = await Promise.all([
        fetchTickets({ clientId, limit: 200 }, { signal: controller.signal }).catch(() => []),
        fetchSupervisionAlertsHistory({
          clientId,
          limit: 200,
          status: "all",
          signal: controller.signal
        }).catch(() => [])
      ]);
      if (controller.signal.aborted) return;
      const ticketList = Array.isArray(ticketRows) ? ticketRows : ticketRows?.tickets || [];
      const alertList = Array.isArray(alertRows) ? alertRows : [];
      const insights = buildPeriodInsights({
        client,
        tickets: ticketList,
        alerts: alertList,
        startDate,
        endDate
      });
      setEquipmentTicketInsightCounts(insights.ticketCounts || {});
      setEquipmentAlertCounts(insights.alertCounts || {});
      setEquipmentComments(prev => mergeSeededTicketComments(prev, insights.seededCommentsByEquipmentKey));
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.warn("Unable to load period insights for supervision report:", err);
    }
  };
  const handleConfirmSupervisionPeriod = async ({ startDate, endDate, selectedModules }) => {
    if (!draftReport?.client || startingSupervisionBuilder) return;
    const client = draftReport.client;
    const clientId = client.id ?? client.uuid;
    if (!clientId || !startDate || !endDate) {
      toast.error("Période ou client invalide.");
      return;
    }
    setStartingSupervisionBuilder(true);
    try {
      const [modulesData, enrichedClient] = await Promise.all([
        fetchClientModules(clientId),
        enrichBuilderClientWithSites(client)
      ]);
      const nextClient = {
        ...enrichedClient,
        equipements: modulesData?.equipements || enrichedClient.equipements || {},
        modules_monitoring: modulesData?.modules_monitoring || enrichedClient.modules_monitoring || {},
        reportStartDate: startDate,
        reportEndDate: endDate,
        reportSelectedModules: Array.isArray(selectedModules) ? selectedModules : undefined
      };
      setBuilderClient(nextClient);
      setBuilderType(REPORT_TYPE_IDS.SUPERVISION_ETAT);
      setBuilderStepIndex(0);
      setEquipmentComments({});
      setGeneralComments([]);
      setEquipmentMonitoringStatus({});
      setEquipmentCheckMKData({});
      setEquipmentAlertCounts({});
      setEquipmentTicketInsightCounts({});
      setStepStorageState(null);
      setDraftReport(null);
      setCreateWizardStep("type");
      void handleSyncAllMonitoring(nextClient);
      void loadPeriodInsights(nextClient, startDate, endDate);
    } catch (err) {
      console.error("Error starting supervision report builder:", err);
      toast.error(err?.message || "Impossible de démarrer le rapport de supervision.");
    } finally {
      setStartingSupervisionBuilder(false);
    }
  };
  const handleBackFromDraftReport = () => {
    const leavingStartedBuilder = draftReport?.type?.id && draftReport.type.id !== REPORT_TYPE_IDS.SUPERVISION_ETAT;
    const leaveDraft = () => {
      setDraftReport(null);
      setCreateWizardStep("type");
    };
    if (leavingStartedBuilder) {
      requestLeaveBuilder(leaveDraft);
      return;
    }
    leaveDraft();
  };
  const handleBackToSelection = () => {
    requestLeaveBuilder(() => {
      setBuilderType(null);
      setBuilderClient(null);
      setBuilderStepIndex(0);
      setEquipmentComments({});
      setActiveCommentsTarget(null);
      setEquipmentMonitoringStatus({});
      setEquipmentCheckMKData({});
      setEquipmentAlertCounts({});
      setEquipmentTicketInsightCounts({});
      setStepStorageState(null);
    });
  };
  const enrichBuilderClientWithSites = async client => {
    const clientId = client?.id ?? client?.uuid;
    if (!clientId) return client;
    if (Array.isArray(client.sites) && client.sites.length > 0) return client;
    try {
      const generalData = await fetchClientGeneral(clientId);
      if (Array.isArray(generalData?.sites) && generalData.sites.length > 0) {
        return {
          ...client,
          sites: generalData.sites
        };
      }
    } catch (err) {
      console.warn("Unable to load client sites for the report:", err);
    }
    return client;
  };
  const equipmentCommentCounts = useMemo(() => {
    const result = {};
    Object.entries(equipmentComments).forEach(([key, list]) => {
      result[key] = Array.isArray(list) ? list.length : 0;
    });
    return result;
  }, [equipmentComments]);
  const equipmentTicketCounts = useMemo(() => {
    const result = {
      ...equipmentTicketInsightCounts
    };
    Object.entries(equipmentComments).forEach(([key, list]) => {
      const count = (list || []).filter(c => c.isTicketComment === true).length;
      if (count > 0) {
        result[key] = Math.max(result[key] || 0, count);
      }
    });
    return result;
  }, [equipmentComments, equipmentTicketInsightCounts]);
  const allCommentsChronological = useMemo(() => {
    const equipment = Object.entries(equipmentComments).flatMap(([equipmentKey, list]) => (list || []).map(c => ({
      ...c,
      equipmentKey,
      scope: "equipment"
    })));
    const general = (generalComments || []).map(c => ({
      ...c,
      scope: "general"
    }));
    const all = [...equipment, ...general];
    const getTime = c => {
      if (!c.createdAt) return 0;
      const t = new Date(c.createdAt).getTime();
      return Number.isNaN(t) ? 0 : t;
    };
    all.sort((a, b) => getTime(a) - getTime(b));
    return all;
  }, [equipmentComments, generalComments]);
  const builderSteps = useMemo(() => builderClient ? getEnabledMonitoringSteps(builderClient) : [], [builderClient]);
  const currentBuilderStepKey = builderSteps[builderStepIndex] || null;
  const currentBuilderStepLabel = MODULE_LABELS[currentBuilderStepKey] || currentBuilderStepKey || "Étape";
  const showBuilderCommentsPane = Boolean(currentBuilderStepKey && currentBuilderStepKey !== "support" && currentBuilderStepKey !== "summary");
  useEffect(() => {
    setActiveCommentsTarget(prev => {
      if (!prev) return prev;
      if (!showBuilderCommentsPane) return null;
      if (prev.moduleKey && prev.moduleKey !== currentBuilderStepKey) return null;
      return prev;
    });
  }, [currentBuilderStepKey, showBuilderCommentsPane]);
  const handleOpenEquipmentComments = (item, {
    moduleKey,
    equipmentKey
  } = {}) => {
    if (!item || !moduleKey) return;
    const key = equipmentKey || item.commentKey || item.id || item.uuid || `${moduleKey}:${item.nom || item.name || "unknown"}`;
    setActiveCommentsTarget({
      moduleKey,
      equipmentKey: key,
      equipment: item
    });
    setHighlightedEquipmentKey(key);
    setPendingEquipmentComment("");
    setEditingComment(null);
  };
  const handleClearCommentsTarget = () => {
    setActiveCommentsTarget(null);
    setHighlightedEquipmentKey(null);
    setPendingEquipmentComment("");
    setEditingComment(null);
  };
  const handleRefreshBuilderClient = async (fromClient = null) => {
    const source = fromClient && (fromClient.id || fromClient.uuid) ? fromClient : builderClient;
    if (!source?.id && !source?.uuid) return;
    const clientId = source.id ?? source.uuid;
    try {
      const modulesData = await fetchClientModules(clientId);
      if (modulesData?.equipements && typeof modulesData.equipements === "object") {
        setBuilderClient(prev => prev ? {
          ...prev,
          equipements: preserveCheckmkMappingsOnEquipements(prev.equipements, modulesData.equipements)
        } : prev);
      }
    } catch (err) {
      console.error("Error reloading report modules:", err);
      toast.error("Unable to reload client data.");
    }
  };
  const handleReportEquipmentSaved = async (formData, createdRow, sourceEquipment, moduleKey, equipmentIndex = -1, equipmentListKey = null) => {
    if (!formData) return;
    if (createdRow) {
      void handleRefreshBuilderClient();
      return;
    }
    setBuilderClient(prev => {
      if (!prev?.equipements) return prev;
      return {
        ...prev,
        equipements: applyEquipmentPatchToEquipements(prev.equipements, moduleKey, formData, sourceEquipment, equipmentListKey, equipmentIndex)
      };
    });
  };
  const fetchCheckMKDataForHost = async (hostName, site, startIso, endIso, { signal } = {}) => {
    const reportPeriod = {
      start: startIso,
      end: endIso
    };
    const ignoreUnlessAborted = promise => promise.catch(err => {
      if (err?.name === "AbortError") throw err;
      return null;
    });
    const [reportPeriodResp, servicesResp] = await Promise.all([
      ignoreUnlessAborted(getCheckMKReportPeriodData(hostName, startIso, endIso, site, { signal })),
      ignoreUnlessAborted(getCheckMKServices(hostName, startIso, endIso, site, { signal }))
    ]);
    const rawEvents = reportPeriodResp?.events?.events ?? reportPeriodResp?.events ?? [];
    const eventsList = Array.isArray(rawEvents) ? rawEvents : [];
    const periodEvents = filterCheckMKEventsForReportPeriod(eventsList, reportPeriod);
    const criticalEvents = periodEvents.filter(event => Number(event?.state) === 2);
    const availability = reportPeriodResp?.availability?.availability ?? reportPeriodResp?.availability ?? null;
    const liveServices = Array.isArray(servicesResp?.services) ? servicesResp.services : null;
    const periodServices = liveServices != null ? liveServices : deriveServicesFromPeriodEvents(periodEvents);
    const parsed = {
      services: periodServices,
      events: periodEvents,
      availability,
      eventsCount: criticalEvents.length
    };
    return {
      cacheEntry: buildCheckMKCacheEntry(parsed.services, parsed.events, parsed.availability, reportPeriod),
      status: computeCheckMKEquipmentStatus({
        services: periodServices,
        events: criticalEvents,
        availability,
        eventsCount: criticalEvents.length
      })
    };
  };

  const syncCheckMKForClient = async (client, {
    silent = false
  } = {}) => {
    if (!client?.reportStartDate || !client?.reportEndDate) {
      if (!silent) toast.error("La période du rapport n’est pas définie.");
      return {
        synced: 0,
        total: 0
      };
    }
    const mappings = collectCheckMKMappedEquipment(client.equipements);
    if (mappings.length === 0) {
      if (!silent) toast.info("Aucun équipement mappé à une supervision pour ce client.");
      setEquipmentMonitoringStatus({});
      setEquipmentCheckMKData({});
      return {
        synced: 0,
        total: 0
      };
    }
    setIsSyncingMonitoring(true);
    try {
      const startDate = new Date(client.reportStartDate);
      const endDate = new Date(client.reportEndDate);
      endDate.setHours(23, 59, 59, 999);
      const startIso = startDate.toISOString();
      const endIso = endDate.toISOString();
      const results = {};
      const checkMKDataByEquipment = {};
      const concurrency = 3;
      let index = 0;
      let synced = 0;
      const worker = async () => {
        while (index < mappings.length) {
          const currentIndex = index;
          index += 1;
          const mapping = mappings[currentIndex];
          const hostName = mapping.checkmk_host_name;
          if (!hostName) continue;
          try {
            const {
              cacheEntry,
              status
            } = await fetchCheckMKDataForHost(hostName, mapping.checkmk_site || null, startIso, endIso);
            const equipmentId = mapping.equipment_id;
            if (equipmentId != null) {
              const key = String(equipmentId);
              results[key] = status;
              checkMKDataByEquipment[key] = cacheEntry;
              synced += 1;
            }
          } catch (err) {
            console.error("Error synchronizing CheckMK for an equipment item:", err);
            if (mapping.equipment_id != null) {
              results[String(mapping.equipment_id)] = "unsynced";
            }
          }
        }
      };
      const workers = [];
      for (let i = 0; i < concurrency && i < mappings.length; i += 1) {
        workers.push(worker());
      }
      await Promise.all(workers);
      setEquipmentMonitoringStatus(results);
      setEquipmentCheckMKData(checkMKDataByEquipment);
      if (!silent) {
        toast.success(`Supervision synchronisée (${synced}/${mappings.length}).`);
      }
      return {
        synced,
        total: mappings.length
      };
    } catch (err) {
      console.error("Error during CheckMK synchronization:", err);
      if (!silent) toast.error("Erreur lors de la synchronisation supervision.");
      return {
        synced: 0,
        total: mappings.length
      };
    } finally {
      setIsSyncingMonitoring(false);
    }
  };

  const closeSyncProgressModal = () => {
    setSyncProgress(prev => {
      if (prev.phase === "running") return prev;
      return { ...prev, open: false };
    });
  };
  const cancelSyncProgress = () => {
    if (syncProgressCancelRef.current) return;
    syncProgressCancelRef.current = true;
    try {
      syncProgressAbortRef.current?.abort();
    } catch {
      // ignore
    }
    setSyncProgress(prev => {
      if (!prev.open || prev.phase !== "running") return prev;
      return {
        ...prev,
        phase: "cancelled",
        etaMs: 0,
        items: prev.items.map(item => item.state === "running" ? { ...item, state: "pending" } : item)
      };
    });
    const syncCopy = pageCopy.supervisionBuilder.syncProgress || {};
    toast.info(syncCopy.cancelledToast || syncCopy.cancelled);
  };
  const handleSyncAllMonitoring = async (clientOverride = null) => {
    const client = clientOverride && typeof clientOverride === "object" && !clientOverride.nativeEvent
      ? clientOverride
      : builderClient;
    const autoStarted = Boolean(clientOverride && !clientOverride.nativeEvent);
    if (!client || !(autoStarted || isSupervisionReportBuilderType(builderType))) return;
    if (syncInFlightRef.current || isSyncingMonitoring || isSyncingOffice365Report) return;
    const clientId = client.id || client.uuid;
    const syncCopy = pageCopy.supervisionBuilder.syncProgress || {};
    if (!clientId) {
      toast.error(syncCopy.noClient || "Impossible d’identifier le client pour la synchronisation.");
      return;
    }
    const controller = createTrackedAbortController();
    const jobs = buildSupervisionSyncJobs(client, {
      copy: syncCopy,
      fetchCheckMKHost: fetchCheckMKDataForHost,
      onCheckMKHostDone: (key, cacheEntry, status) => {
        setEquipmentMonitoringStatus(prev => ({ ...prev, [key]: status }));
        setEquipmentCheckMKData(prev => ({ ...prev, [key]: cacheEntry }));
      },
      signal: controller.signal
    });
    if (jobs.length === 0) {
      try {
        controller.abort();
      } catch {
        // ignore
      }
      if (!autoStarted) toast.info(syncCopy.empty);
      return;
    }
    syncInFlightRef.current = true;
    syncProgressAbortRef.current = controller;
    syncProgressCancelRef.current = false;
    const hasOffice365Job = jobs.some(job => job.group === "office365");
    const initialEta = jobs.reduce((sum, job) => sum + (job.estimatedMs || 5000), 0);
    setIsSyncingMonitoring(true);
    if (hasOffice365Job) setIsSyncingOffice365Report(true);
    setSyncProgress({
      open: true,
      phase: "running",
      items: jobs.map(job => ({ id: job.id, label: job.label, state: "pending", error: null })),
      currentIndex: 0,
      etaMs: initialEta
    });
    const patchItem = (index, patch) => {
      setSyncProgress(prev => {
        const items = prev.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item);
        return { ...prev, items, currentIndex: index };
      });
    };
    try {
      const result = await runSupervisionSyncJobs(jobs, {
        isCancelled: () => syncProgressCancelRef.current || controller.signal.aborted,
        signal: controller.signal,
        onProgress: event => {
          if (syncProgressCancelRef.current || controller.signal.aborted) return;
          if (event.type === "item") {
            patchItem(event.index, { state: event.state, error: event.error || null });
            return;
          }
          if (event.type === "tick" || event.type === "start") {
            setSyncProgress(prev => ({
              ...prev,
              etaMs: event.etaMs,
              currentIndex: event.completed != null ? Math.min(event.completed, jobs.length - 1) : prev.currentIndex
            }));
          }
        }
      });
      const cancelled = result.cancelled || syncProgressCancelRef.current;
      if (!cancelled) {
        await handleRefreshBuilderClient(client);
      }
      setSyncProgress(prev => ({
        ...prev,
        phase: cancelled || prev.phase === "cancelled" ? "cancelled" : "done",
        etaMs: 0,
        items: prev.items.map(item => item.state === "running" ? { ...item, state: "pending" } : item)
      }));
      if (cancelled) {
        // toast already shown by cancelSyncProgress
      } else if (result.fail === 0) {
        toast.success(fillSyncCopy(syncCopy.successToast, { ok: result.ok, total: jobs.length }));
      } else if (result.ok > 0) {
        toast.warning(fillSyncCopy(syncCopy.partialToast, { ok: result.ok, fail: result.fail }));
      } else {
        toast.error(syncCopy.failToast);
      }
    } catch (err) {
      if (err?.name === "AbortError" || syncProgressCancelRef.current) {
        setSyncProgress(prev => ({
          ...prev,
          phase: "cancelled",
          etaMs: 0,
          items: prev.items.map(item => item.state === "running" ? { ...item, state: "pending" } : item)
        }));
        return;
      }
      console.error("Error during full integration sync:", err);
      setSyncProgress(prev => ({
        ...prev,
        phase: "done",
        etaMs: 0,
        items: prev.items.map(item => item.state === "running" ? { ...item, state: "error", error: err?.message || null } : item)
      }));
      toast.error(err?.message || syncCopy.failToast);
    } finally {
      if (syncProgressAbortRef.current === controller) {
        syncProgressAbortRef.current = null;
      }
      syncInFlightRef.current = false;
      setIsSyncingMonitoring(false);
      setIsSyncingOffice365Report(false);
    }
  };
  const handleSyncSingleEquipment = async (item, {
    moduleKey,
    equipmentKey
  }) => {
    if (!builderClient || !isSupervisionReportBuilderType(builderType)) return;
    const hostName = getCheckmkHostName(item);
    if (!hostName) {
      toast.warn("Cet équipement n’a pas de mapping supervision.");
      return;
    }
    if (!builderClient.reportStartDate || !builderClient.reportEndDate) {
      toast.error("La période du rapport n’est pas définie.");
      return;
    }
    setSyncingEquipmentKey(equipmentKey);
    setIsSyncingMonitoring(true);
    try {
      const startDate = new Date(builderClient.reportStartDate);
      const endDate = new Date(builderClient.reportEndDate);
      endDate.setHours(23, 59, 59, 999);
      const startIso = startDate.toISOString();
      const endIso = endDate.toISOString();
      const site = getCheckmkSite(item);
      const {
        cacheEntry,
        status
      } = await fetchCheckMKDataForHost(hostName, site, startIso, endIso);
      const key = resolveCheckMKEquipmentKey(item, equipmentKey);
      if (key) {
        setEquipmentMonitoringStatus(prev => ({
          ...prev,
          [key]: status
        }));
        setEquipmentCheckMKData(prev => ({
          ...prev,
          [key]: cacheEntry
        }));
      }
      return cacheEntry;
    } catch (err) {
      console.error("CheckMK equipment sync error:", err);
      toast.error("Erreur lors de la récupération des données supervision.");
      return null;
    } finally {
      setSyncingEquipmentKey(null);
      setIsSyncingMonitoring(false);
    }
  };
  const handlePublishEquipmentComment = () => {
    const trimmed = String(pendingEquipmentComment || "").trim();
    if (!trimmed || !activeCommentsTarget) return;
    const {
      equipmentKey,
      moduleKey,
      equipment
    } = activeCommentsTarget;
    const equipmentName = equipment?.nom || equipment?.name || equipment?.logiciel || "Equipment";
    const referenceLabel = `${moduleKey || "Equipment"} · ${equipmentName}`;
    const infraModules = ["Internet", "Firewall", "Servers", "Storage", "Switch", "BorneWifi", "TOIP"];
    const cyberModules = ["Backup", "Antivirus", "Antispam"];
    const servicesModules = ["Office365", "NDD"];
    let category = null;
    if (infraModules.includes(moduleKey)) {
      category = "infra";
    } else if (cyberModules.includes(moduleKey)) {
      category = "cyber";
    } else if (servicesModules.includes(moduleKey)) {
      category = "services";
    }
    setEquipmentComments(prev => {
      const existing = prev[equipmentKey] || [];
      const nextComment = {
        id: Date.now(),
        author: "Vous",
        createdAt: new Date().toISOString(),
        text: trimmed,
        referenceLabel,
        category,
        moduleKey
      };
      return {
        ...prev,
        [equipmentKey]: [...existing, nextComment]
      };
    });
    setPendingEquipmentComment("");
    setEditingComment(null);
  };
  const handlePublishFromCommentsPane = () => {
    if (activeCommentsTarget) {
      handlePublishEquipmentComment();
      return;
    }
    const trimmed = String(pendingEquipmentComment || "").trim();
    if (!trimmed) return;
    if (!showBuilderCommentsPane || !currentBuilderStepKey) {
      setGeneralComments(prev => [...prev, {
        id: Date.now(),
        author: "Vous",
        createdAt: new Date().toISOString(),
        text: trimmed
      }]);
      setPendingEquipmentComment("");
      return;
    }
    const infraModules = ["Internet", "Firewall", "Servers", "Storage", "Switch", "BorneWifi", "TOIP"];
    const cyberModules = ["Backup", "Antivirus", "Antispam"];
    const servicesModules = ["Office365", "NDD"];
    let category = null;
    if (infraModules.includes(currentBuilderStepKey)) category = "infra";
    else if (cyberModules.includes(currentBuilderStepKey)) category = "cyber";
    else if (servicesModules.includes(currentBuilderStepKey)) category = "services";
    setEquipmentComments(prev => {
      const existing = prev[currentBuilderStepKey] || [];
      return {
        ...prev,
        [currentBuilderStepKey]: [...existing, {
          id: Date.now(),
          author: "Vous",
          createdAt: new Date().toISOString(),
          text: trimmed,
          referenceLabel: currentBuilderStepLabel,
          category,
          moduleKey: currentBuilderStepKey
        }]
      };
    });
    setPendingEquipmentComment("");
  };
  useEffect(() => {
    if (showSaveModal) {
      fetchMonitoringDocuments().then(docs => {
        const activeDocs = (docs || []).filter(d => !d.is_trashed && !d.isTrashed && !d.trashed && !d.deleted);
        setRecentDocs(activeDocs);
      }).catch(() => setRecentDocs([]));
    }
  }, [showSaveModal]);
  const refreshRecentDocs = () => {
    fetchMonitoringDocuments().then(docs => {
      const activeDocs = (docs || []).filter(d => !d.is_trashed && !d.isTrashed && !d.trashed && !d.deleted);
      setRecentDocs(activeDocs);
    }).catch(() => setRecentDocs([]));
  };
  const ensureSummaryContentReady = async () => {
    if (summaryContentRef?.current) return true;
    if (!builderClient) return false;
    const steps = getEnabledMonitoringSteps(builderClient);
    const summaryIndex = steps.indexOf("summary");
    if (summaryIndex < 0) return false;
    if (builderStepIndex !== summaryIndex) {
      setBuilderStepIndex(summaryIndex);
    }
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (summaryContentRef?.current) return true;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return Boolean(summaryContentRef?.current);
  };
  const archiveReportToClientVault = async ({
    visibleToClient,
    documentName,
    reportPeriod
  }) => {
    const clientId = builderClient?.id ?? builderClient?.uuid;
    if (!clientId) {
      return {
        success: false,
        error: "Client introuvable pour l’archivage documentaire."
      };
    }
    const summaryReady = await ensureSummaryContentReady();
    if (!summaryReady) {
      return {
        success: false,
        error: "Ouvrez l’étape Synthèse puis réenregistrez pour archiver le rapport."
      };
    }
    try {
      const {
        blob,
        fileName
      } = await buildReportZipBlob(summaryContentRef, {
        client: builderClient
      });
      if (!blob || blob.size < 32) {
        throw new Error("ZIP du rapport vide ou invalide.");
      }
      await uploadReportArchiveToClientVault({
        blob,
        fileName: documentName ? `${documentName}.zip` : fileName,
        clientId,
        clientName: builderClient.name || builderClient.nom || "",
        description: reportPeriod || "",
        visibleToClient
      });
      return {
        success: true
      };
    } catch (err) {
      console.error("Archivage vault:", err);
      return {
        success: false,
        error: err?.message || "Archivage documentaire impossible."
      };
    }
  };
  const handleSaveReport = async (forceOverwrite = false) => {
    if (!saveName.trim() || !builderClient) return null;
    setSaving(true);
    try {
      const configCopy = safeJsonClone({
        client: builderClient
      });
      const dataCopy = safeJsonClone({
        reportComments: {
          equipment: equipmentComments,
          general: generalComments
        },
        period: {
          start: builderClient?.reportStartDate || null,
          end: builderClient?.reportEndDate || null
        },
        stepStates: {
          Storage: stepStorageState
        },
        checkMK: buildCheckMKReportSnapshot(equipmentCheckMKData, equipmentMonitoringStatus, builderClient?.reportStartDate, builderClient?.reportEndDate),
        reportType: REPORT_TYPE_IDS.SUPERVISION_ETAT
      });
      const clientName = builderClient?.name || builderClient?.nom || "CLIENT";
      const reportPeriod = builderClient?.reportStartDate && builderClient?.reportEndDate ? `Du ${formatReportDate(builderClient.reportStartDate)} au ${formatReportDate(builderClient.reportEndDate)}` : builderClient?.reportPeriod || null;
      const result = await saveMonitoringDocument({
        name: saveName.trim(),
        client_name: clientName,
        report_period: reportPeriod,
        config: configCopy,
        data: dataCopy,
        overwrite: forceOverwrite
      });
      if (result && result.success) {
        const vaultResult = await archiveReportToClientVault({
          visibleToClient: saveVisibleToClient,
          documentName: saveName.trim(),
          reportPeriod
        });
        setSaveSuccessVisible(true);
        setSaveName("");
        setShowSaveModal(false);
        refreshRecentDocs();
        setTimeout(() => setSaveSuccessVisible(false), 3000);
        if (vaultResult.success) {
          toast.success(saveVisibleToClient ? "Rapport enregistré et partagé avec l’entreprise." : "Rapport enregistré (interne agents).");
        } else if (!vaultResult.skipped) {
          toast.warn(vaultResult.error ? `Rapport enregistré, mais archivage échoué : ${vaultResult.error}` : "Rapport enregistré, mais l’archivage documentaire a échoué.");
        } else {
          toast.success("Rapport enregistré.");
        }
        return result;
      }
      if (result && result.message && /déjà enregistré|already saved/i.test(String(result.message))) {
        setPendingSave({
          name: saveName.trim(),
          client_name: clientName,
          report_period: reportPeriod,
          config: configCopy,
          data: dataCopy,
          visibleToClient: saveVisibleToClient
        });
        setShowOverwriteConfirm(true);
        return null;
      }
      setSaveErrorVisible(true);
      setTimeout(() => setSaveErrorVisible(false), 3000);
      toast.error(result?.error || result?.message || "Error while saving.");
      return result;
    } catch (err) {
      setSaveErrorVisible(true);
      setTimeout(() => setSaveErrorVisible(false), 3000);
      toast.error(err?.message || "Error while saving.");
      return {
        success: false,
        error: err?.message
      };
    } finally {
      setSaving(false);
    }
  };
  const handleLoadSavedDocument = doc => {
    if (!doc || !doc.name) return;
    setSaveName(doc.name);
  };
  const handleDownloadZip = async () => {
    if (!builderClient) {
      toast.error("Aucun client sélectionné.");
      return;
    }
    try {
      await exportReportAsZIP(summaryContentRef, {
        client: builderClient
      });
      toast.success("Téléchargement du rapport lancé.");
    } catch (err) {
      toast.error(err?.message || "Erreur pendant l’export.");
    }
  };
  const handleOverwriteConfirm = async () => {
    if (!pendingSave) return;
    setSaving(true);
    try {
      const dataWithComments = {
        ...(typeof pendingSave.data === "object" && pendingSave.data !== null ? pendingSave.data : {}),
        reportComments: {
          equipment: equipmentComments,
          general: generalComments
        },
        stepStates: {
          Storage: stepStorageState
        },
        checkMK: buildCheckMKReportSnapshot(equipmentCheckMKData, equipmentMonitoringStatus, builderClient?.reportStartDate, builderClient?.reportEndDate)
      };
      const result = await saveMonitoringDocument({
        name: pendingSave.name,
        client_name: pendingSave.client_name,
        report_period: pendingSave.report_period,
        config: pendingSave.config,
        data: dataWithComments,
        overwrite: true
      });
      if (result && result.success) {
        const vaultResult = await archiveReportToClientVault({
          visibleToClient: pendingSave.visibleToClient ?? saveVisibleToClient,
          documentName: pendingSave.name,
          reportPeriod: pendingSave.report_period
        });
        setSaveSuccessVisible(true);
        setSaveName("");
        setPendingSave(null);
        setShowOverwriteConfirm(false);
        setShowSaveModal(false);
        refreshRecentDocs();
        setTimeout(() => setSaveSuccessVisible(false), 3000);
        if (vaultResult.success) {
          toast.success(pendingSave.visibleToClient ?? saveVisibleToClient ? "Rapport enregistré et partagé avec l’entreprise." : "Rapport enregistré (interne agents).");
        } else if (!vaultResult.skipped) {
          toast.warn(vaultResult.error ? `Rapport enregistré, mais archivage échoué : ${vaultResult.error}` : "Rapport enregistré, mais l’archivage documentaire a échoué.");
        } else {
          toast.success("Rapport mis à jour.");
        }
      } else {
        setSaveErrorVisible(true);
        setTimeout(() => setSaveErrorVisible(false), 3000);
        toast.error(result?.error || "Error while overwriting.");
      }
    } catch (err) {
      setSaveErrorVisible(true);
      setTimeout(() => setSaveErrorVisible(false), 3000);
      toast.error(err?.message || "Error while overwriting.");
    } finally {
      setSaving(false);
    }
  };
  const handleStartEditEquipmentComment = (equipmentKey, comment) => {
    setEditingComment({
      scope: "equipment",
      equipmentKey,
      id: comment.id,
      text: comment.text || ""
    });
  };
  const handleStartEditGeneralComment = comment => {
    setEditingComment({
      scope: "general",
      id: comment.id,
      text: comment.text || ""
    });
  };
  const handleChangeEditingText = text => {
    setEditingComment(prev => prev ? {
      ...prev,
      text: text != null ? text : ""
    } : prev);
  };
  const handleSaveEditingComment = () => {
    if (!editingComment) return;
    const trimmed = String(editingComment.text || "").trim();
    if (!trimmed) {
      setEditingComment(null);
      return;
    }
    if (editingComment.scope === "equipment" && editingComment.equipmentKey) {
      const {
        equipmentKey,
        id
      } = editingComment;
      setEquipmentComments(prev => {
        const list = prev[equipmentKey] || [];
        return {
          ...prev,
          [equipmentKey]: list.map(c => c.id === id ? {
            ...c,
            text: trimmed
          } : c)
        };
      });
    } else if (editingComment.scope === "general") {
      const {
        id
      } = editingComment;
      setGeneralComments(prev => prev.map(c => c.id === id ? {
        ...c,
        text: trimmed
      } : c));
    }
    setEditingComment(null);
  };
  const handleDeleteEquipmentComment = (equipmentKey, id) => {
    setEquipmentComments(prev => {
      const list = prev[equipmentKey] || [];
      const nextList = list.filter(c => c.id !== id);
      const next = {
        ...prev
      };
      if (nextList.length === 0) {
        delete next[equipmentKey];
      } else {
        next[equipmentKey] = nextList;
      }
      return next;
    });
    if (editingComment && editingComment.scope === "equipment" && editingComment.equipmentKey === equipmentKey && editingComment.id === id) {
      setEditingComment(null);
    }
  };
  const handleDeleteGeneralComment = id => {
    setGeneralComments(prev => prev.filter(c => c.id !== id));
    if (editingComment && editingComment.scope === "general" && editingComment.id === id) {
      setEditingComment(null);
    }
  };
  const handleStartEditFromPane = comment => {
    if (comment.scope === "general") {
      handleStartEditGeneralComment(comment);
    } else {
      handleStartEditEquipmentComment(comment.equipmentKey, comment);
    }
  };
  const handleDeleteFromPane = comment => {
    if (comment.scope === "general") {
      handleDeleteGeneralComment(comment.id);
    } else {
      handleDeleteEquipmentComment(comment.equipmentKey, comment.id);
    }
  };
  const formatReportDate = isoDate => {
    if (!isoDate) return "";
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString(pageCopy.bcp47);
  };
  const isSupervisionBuilder = isSupervisionReportBuilderType(builderType) && builderClient;
  const isDraftWizard = Boolean(draftReport);
  const isInterventionDraft = isDraftWizard && draftReport?.type?.id === REPORT_TYPE_IDS.INTERVENTION;
  const isSupervisionDraft = isDraftWizard && draftReport?.type?.id === REPORT_TYPE_IDS.SUPERVISION_ETAT;
  const builderCommentsPane = showBuilderCommentsPane ? (
    <BuilderCommentsPane
      stepKey={currentBuilderStepKey}
      stepLabel={currentBuilderStepLabel}
      target={activeCommentsTarget}
      comments={allCommentsChronological.filter(comment =>
        !comment.moduleKey
        || comment.moduleKey === currentBuilderStepKey
        || comment.equipmentKey === currentBuilderStepKey
      )}
      pendingText={pendingEquipmentComment}
      onPendingChange={setPendingEquipmentComment}
      onPublish={handlePublishFromCommentsPane}
      onSelectStep={next => handleOpenEquipmentComments(next.equipment, next)}
      onClearTarget={handleClearCommentsTarget}
      editingComment={editingComment}
      onStartEdit={handleStartEditFromPane}
      onChangeEditingText={handleChangeEditingText}
      onSaveEdit={handleSaveEditingComment}
      onCancelEdit={() => setEditingComment(null)}
      onDelete={handleDeleteFromPane}
    />
  ) : null;
  return <>
      <div className={`${cyberStyles.mspPage} msp-page-insight`}>
        {isSupervisionBuilder ? <div className={cyberStyles.mspLayout}>
            <div className={cyberStyles.mspMain}>
            <div className={shellStyles.shell}>
              <MspPageHero
                guideId="report-hero"
                eyebrow={pageCopy.eyebrow}
                title={pageCopy.reportTypes.supervisionEtat.title}
                subtitle={builderClient?.reportStartDate && builderClient?.reportEndDate
                  ? `${builderClient?.name || builderClient?.nom || pageCopy.create.getClientLabel(builderClient?.id)} · Du ${formatReportDate(builderClient.reportStartDate)} au ${formatReportDate(builderClient.reportEndDate)}`
                  : `${builderClient?.name || builderClient?.nom || ""} — ${pageCopy.supervisionBuilder.builderHint || ""}`}
                icon="mdi:radar"
                actions={
                  <div className={shellStyles.heroActions}>
                    <button
                      type="button"
                      className={shellStyles.heroBtn}
                      onClick={() => { void handleSyncAllMonitoring(); }}
                      disabled={isSyncingMonitoring || isSyncingOffice365Report || syncProgress.open}
                    >
                      <Icon
                        icon="mdi:sync"
                        className={isSyncingMonitoring || isSyncingOffice365Report || syncProgress.open ? shellStyles.heroSpin : undefined}
                        aria-hidden
                      />
                      {pageCopy.supervisionBuilder.builderSync}
                    </button>
                    {isOnSummaryStep ? (
                      <button type="button" className={shellStyles.heroBtn} onClick={handleDownloadZip} disabled={!builderClient}>
                        <Icon icon="mdi:download" aria-hidden />
                        {pageCopy.supervisionBuilder.builderDownload}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={shellStyles.heroBtnPrimary}
                      onClick={() => builderClient && setShowSaveModal(true)}
                      disabled={!builderClient}
                    >
                      <Icon icon="mdi:content-save-outline" aria-hidden />
                      {pageCopy.supervisionBuilder.builderSave}
                    </button>
                  </div>
                }
              >
                <p className={shellStyles.heroHint}>{pageCopy.supervisionBuilder.builderHint}</p>
              </MspPageHero>

              <div ref={builderSectionRef} className={shellStyles.builderBody}>

                {showSaveModal && <div className={saveModalStyles.modalOverlay} onClick={e => {
            if (e.target === e.currentTarget) setShowSaveModal(false);
          }}>
                    <div className={saveModalStyles.modalContent} onClick={e => e.stopPropagation()}>
                      <div className={saveModalStyles.modalHeader}>
                        <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem"
                }}>
                          <Icon icon="mdi:content-save" className={saveModalStyles.modalIcon} />
                          <h3>Enregistrer le rapport</h3>
                        </div>
                        <button type="button" className={saveModalStyles.closeButton} onClick={() => setShowSaveModal(false)} title="Fermer">
                          <Icon icon="mdi:close" />
                        </button>
                      </div>
                      <div className={saveModalStyles.modalBody}>
                        <div className={saveModalStyles.saveInputSection}>
                          <label className={saveModalStyles.saveInputLabel}>Nom du document</label>
                          <input type="text" value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="Ex. Rapport supervision — Client Alpha" className={saveModalStyles.saveInput} />
                        </div>
                        <ReportSaveVisibilitySwitch visibleToClient={saveVisibleToClient} onChange={setSaveVisibleToClient} disabled={saving} />
                        {recentDocs.length > 0 && <div className={saveModalStyles.recentDocs}>
                            <h4 className={saveModalStyles.recentDocsTitle}>
                              <Icon icon="mdi:file-document-multiple" style={{
                      fontSize: "1.1rem",
                      marginRight: "0.5rem"
                    }} />
                              Mes documents ({recentDocs.length})
                            </h4>
                            <div className={saveModalStyles.docsTableContainer}>
                              <table className={saveModalStyles.docsTable}>
                                <thead>
                                  <tr>
                                    <th>Nom</th>
                                    <th>Client</th>
                                    <th>Période</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {recentDocs.slice(0, 10).map(doc => <tr key={doc.id} className={saveModalStyles.docTableRow} onClick={() => handleLoadSavedDocument(doc)} title="Réutiliser ce nom">
                                      <td className={saveModalStyles.docNameCell}>
                                        <span className={saveModalStyles.docName}>{doc.name}</span>
                                      </td>
                                      <td className={saveModalStyles.docCell}>{doc.client_name || "-"}</td>
                                      <td className={saveModalStyles.docCell}>{doc.report_period || "-"}</td>
                                    </tr>)}
                                </tbody>
                              </table>
                            </div>
                          </div>}
                      </div>
                      <div className={saveModalStyles.modalActions} style={{
                justifyContent: "flex-end"
              }}>
                        <button type="button" onClick={() => handleSaveReport()} className={saveModalStyles.primaryButton} disabled={saving || !saveName.trim()} title="Enregistrer">
                          {saving ? <Icon icon="mdi:loading" style={{
                    fontSize: "1.1rem",
                    animation: "spin 1s linear infinite"
                  }} /> : <Icon icon="mdi:content-save" style={{
                    fontSize: "1.1rem"
                  }} />}
                        </button>
                      </div>
                    </div>
                  </div>}

                {showOverwriteConfirm && pendingSave && <div className={saveModalStyles.modalOverlay} onClick={e => {
            if (e.target === e.currentTarget) {
              setShowOverwriteConfirm(false);
              setPendingSave(null);
            }
          }}>
                    <div className={`${saveModalStyles.modalContent} ${saveModalStyles.overwriteModalContent}`} onClick={e => e.stopPropagation()}>
                      <div className={saveModalStyles.modalHeader}>
                        <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem"
                }}>
                          <Icon icon="mdi:alert" className={saveModalStyles.modalIcon} />
                          <h3>Document existant</h3>
                        </div>
                        <button type="button" className={saveModalStyles.closeButton} onClick={() => {
                  setShowOverwriteConfirm(false);
                  setPendingSave(null);
                }} title="Fermer">
                          <Icon icon="mdi:close" />
                        </button>
                      </div>
                      <div className={saveModalStyles.modalBody}>
                        <p style={{
                  margin: 0,
                  fontSize: "0.95rem",
                  lineHeight: 1.6,
                  color: "#1a1a1a"
                }}>
                          Un document nommé &quot;{saveName}&quot; existe déjà. Voulez-vous l’écraser ?
                        </p>
                      </div>
                      <div className={saveModalStyles.modalActions} style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.75rem"
              }}>
                        <button type="button" className={saveModalStyles.secondaryButton} onClick={() => {
                  setShowOverwriteConfirm(false);
                  setPendingSave(null);
                }}>
                          Annuler
                        </button>
                        <button type="button" onClick={handleOverwriteConfirm} disabled={saving} className={saveModalStyles.primaryButton} style={{
                  backgroundColor: "#dc2626",
                  color: "white",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.35rem"
                }}>
                          <Icon icon={saving ? "mdi:loading" : "mdi:check"} style={saving ? {
                    animation: "spin 1s linear infinite"
                  } : undefined} />
                          {saving ? "Enregistrement…" : "Oui, écraser"}
                        </button>
                      </div>
                    </div>
                  </div>}

                {isSupervisionReportBuilderType(builderType) && builderClient && (
                  <MonitoringSteps
                    client={builderClient}
                    activeStepIndex={builderStepIndex}
                    onStepChange={setBuilderStepIndex}
                    onOpenComments={handleOpenEquipmentComments}
                    onRefreshClient={handleRefreshBuilderClient}
                    onEquipmentSaved={handleReportEquipmentSaved}
                    equipmentCommentCounts={equipmentCommentCounts}
                    equipmentTicketCounts={equipmentTicketCounts}
                    equipmentAlertCounts={equipmentAlertCounts}
                    equipmentComments={equipmentComments}
                    highlightedEquipmentKey={highlightedEquipmentKey}
                    monitoringSyncStatus={equipmentMonitoringStatus}
                    equipmentCheckMKData={equipmentCheckMKData}
                    isSyncingMonitoring={isSyncingMonitoring}
                    onSyncCheckMK={handleSyncSingleEquipment}
                    syncingEquipmentKey={syncingEquipmentKey}
                    isSyncingOffice365Report={isSyncingOffice365Report}
                    allCommentsChronological={allCommentsChronological}
                    summaryContentRef={summaryContentRef}
                    stockageReportState={stepStorageState}
                    onSetStorageReportState={setStepStorageState}
                    commentsPane={builderCommentsPane}
                  />
                )}

              </div>
            </div>
            </div>
          </div> : isInterventionDraft ? <ReportInterventionBuilder copy={pageCopy} reportType={draftReport.type} client={draftReport.client} initialData={draftReport.initialData} documentId={draftReport.documentId} documentName={draftReport.documentName} onBack={handleBackFromDraftReport} /> : isSupervisionDraft ? <div className={cyberStyles.mspLayout}>
            <div className={cyberStyles.mspMain}>
              <SupervisionPeriodGate copy={pageCopy} reportType={draftReport.type} client={draftReport.client} onBack={handleBackFromDraftReport} onConfirm={handleConfirmSupervisionPeriod} confirming={startingSupervisionBuilder} />
            </div>
          </div> : isDraftWizard ? <ReportBuilderPlaceholder copy={pageCopy} reportType={draftReport.type} client={draftReport.client} onBack={handleBackFromDraftReport} /> : <div className={cyberStyles.mspLayout}>
            <div className={cyberStyles.mspMain}>
              <header className={cyberStyles.mspHero} data-guide="report-hero">
                <div className={cyberStyles.mspHeroMain}>
                  <div className={cyberStyles.mspBrandMark}>
                    <Icon icon="mingcute:report-forms-fill" className={cyberStyles.mspBrandMarkIcon} />
                  </div>
                  <div className={cyberStyles.mspHeroCopy}>
                    <span className={cyberStyles.mspEyebrow}>{pageCopy.eyebrow}</span>
                    <h1 className={cyberStyles.mspTitle}>{pageCopy.pageTitle}</h1>
                    <p className={cyberStyles.mspSubtitle}>{pageCopy.subtitle}</p>
                  </div>
                </div>
              </header>

              <main className={`${cyberStyles.mspContent} ${cyberStyles.mspContentList}`}>
                <div className={`${cyberStyles.tabContent} ${styles.wizardTabContent}`}>
                  <div className={styles.wizardFill}>
                    {error ? <div className={styles.alertError}>{error}</div> : null}
                    <ReportCreateWizard copy={pageCopy} reportTypes={reportTypes} clients={clients} loading={loading} step={createWizardStep} onStepChange={setCreateWizardStep} selectedClientId={selectedClientId} onSelectClient={handleWizardSelectClient} onStartReport={handleStartDraftReport} />
                  </div>
                </div>
              </main>
            </div>
          </div>}
      </div>
      <PageGuideTour open={pageGuideOpen} steps={rapportGuide.steps} title={rapportGuide.tourTitle} locale={locale} onClose={() => setPageGuideOpen(false)} />
      <ReportSyncProgressModal
        open={syncProgress.open}
        copy={pageCopy.supervisionBuilder.syncProgress || {}}
        items={syncProgress.items}
        currentIndex={syncProgress.currentIndex}
        etaMs={syncProgress.etaMs}
        phase={syncProgress.phase}
        onCancel={cancelSyncProgress}
        onClose={closeSyncProgressModal}
      />
      <ConfirmModal
        open={builderLeaveModalOpen}
        title={pageCopy.supervisionBuilder.unsavedTitle}
        message={pageCopy.supervisionBuilder.unsavedMessage}
        confirmLabel={pageCopy.supervisionBuilder.leaveConfirm}
        cancelLabel={pageCopy.supervisionBuilder.leaveCancel}
        icon="mdi:content-save-alert-outline"
        onClose={handleBuilderLeaveCancel}
        onConfirm={handleBuilderLeaveConfirm}
      />
    </>;
}
