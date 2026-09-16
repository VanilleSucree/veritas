import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Icon } from "@iconify/react";
import { toast } from 'react-toastify';
import { FaServer, FaNetworkWired, FaWifi, FaShieldAlt, FaHdd, FaGlobe, FaCamera, FaTimes, FaCube } from "react-icons/fa";
import styles from "./EquipmentDetailPage.module.css";
import enterpriseDetailStyles from "../EnterprisesPage/EnterpriseDetailPage.module.css";
import SmartTooltip from "../SmartTooltip";
import SubscribeBellButton from "../shared/SubscribeBellButton/SubscribeBellButton";
import EquipmentFormModal from "./EquipmentFormModal";
import CustomEquipmentModal from "../EnterprisesPage/CustomEquipmentModal";
import { fetchClientGeneral, fetchClientCustomEquipment } from "../../api/clients";
import { normalizeClientSites } from "../../utils/clientSites";
import { updateEquipment, getCheckMKAvailability, getClientHardwareEquipment, getEquipmentLogs, purgeEquipmentLogs, equipmentTypeToFamily, getEquipmentCheckMKMonitoring, syncEquipmentCheckMKMonitoring, fetchEquipmentTags, addEquipmentTag, removeEquipmentTag } from "../../api/equipment";
import { requestRmmAgentSync, cancelRmmAgentSync, requestRmmAgentUpdate, cancelRmmAgentUpdate, requestRmmAgentHeartbeat, fetchRmmAgents } from "../../api/rmm";
import ClientTagModal from "../EnterprisesPage/ClientTagModal";
import EquipmentMappingModal from "./EquipmentMappingModal";
import CheckMKMonitoringPanel from "./CheckMKMonitoringPanel";
import RmmMonitoringPanel, { RmmSyncPendingNotice, RmmCollectionStatusLine } from "./RmmMonitoringPanel";
import RmmAgentUpdateStatus from "./RmmAgentUpdateStatus";
import RmmMetricHistoryPanel from "./RmmMetricHistoryPanel";
import EquipmentAlertSuspensionModal from "./EquipmentAlertSuspensionModal";
import { useEquipmentAlertSettings } from "./useEquipmentAlertSettings";
import { useTheme } from "../../hooks/useTheme";
import PlanningEventModalBridge from "../PlanningPage/PlanningEventModalBridge";
import EquipmentDetailSpecsPanel from "./EquipmentDetailSpecsPanel";
import EquipmentAlertsGlance from "./EquipmentAlertsGlance";
import specsStyles from "./EquipmentDetailSpecsPanel.module.css";
import EquipmentRemoteAccessLaunchButton from "./EquipmentRemoteAccessLaunchButton";
import { resolveEquipmentRemoteAccessAction } from "./equipmentDetailRemoteAccess";
import EquipmentDocumentsPanel from "./EquipmentDocumentsPanel";
import EquipmentNotesPanel from "./EquipmentNotesPanel";
import EquipmentEventsPanel from "./EquipmentEventsPanel";
import EquipmentStatsPanel from "./EquipmentStatsPanel";
import { fetchEquipmentActivity } from "../../api/equipmentActivity";
import { resolveEquipmentActivityRange, toDateInputValue } from "./equipmentActivityUtils";
import { buildDetailFormData } from "./equipmentDetailConfig";
import { resolveClientWifiSsidCatalog } from "./wifiApSsidUtils";
import useSystemFamilyExtensions from "../../hooks/useSystemFamilyExtensions";
import { patchEquipmentWithSharedFields } from "./sharedEquipmentFields";
import { getEquipmentDetailTypeLabel, getEquipmentDetailCopy, formatEquipmentDetailRelative, formatAlertSettingsDateTime, getEquipmentCreatedAt } from "./equipmentDetailPageI18n";
import { canonicalizeComputerType, patchEquipmentLocation, readEquipmentIsActive } from "./equipmentFormConfig";
import { ConfirmModal } from "../AdminPage/AdminUi";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getEquipmentModalsCopy, interpolate } from "./equipmentModalsI18n";
import { isCheckMKMappableType } from "./CheckMKMonitoringStatusBadge";
import { isSynologyBrand, buildQuickConnectUrl } from "./synologyEquipmentUtils";
import { getLogActionDetails } from "./equipmentLogUtils";
import EquipmentLogDetailModal from "./EquipmentLogDetailModal";
import { useCheckMKIntegrationEnabled } from "../../hooks/useCheckMKIntegrationEnabled";
import { useVeritasEdition } from "../../hooks/useVeritasEdition";
import ProFeatureBadge from "../Misc/ProFeature/ProFeatureBadge";
import ProFeaturePromoModal from "../Misc/ProFeature/ProFeaturePromoModal";
import { notifyProFeature, setProFeaturePromoHandler } from "../Misc/ProFeature/proFeatureUtils";
import { findEquipmentInList, getEquipmentClientId, getEquipmentDbId as resolveEquipmentDbId, getEquipmentListKey, equipmentNeedsHydration } from "../../utils/equipmentIdentity";
import { getRmmAgentId, getRmmAgentVersion, buildRmmAgentRowFromEquipment, getRmmSyncRequestedAt, isRmmManagedEquipment, patchEquipmentRmmSyncRequest, resolveRmmSyncRequestState, rmmSyncTimestampsMatch, formatRmmExpectedCollectionLabel, resolveRmmHeartbeatIntervalMinutes, agentSupportsImmediateFullSync, getRmmAgentStatusKey } from "./rmmMonitoringUtils";
import { computeRmmDeviceHealth } from "./rmmDeviceHealthUtils";
import { ScoreAside } from "./RmmDeviceScore";
import { fetchEquipmentFamilies, mapCustomEquipmentItem, parseCustomFamilyType } from "../../api/equipmentFamilies";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
const CheckMKMappingModal = EquipmentMappingModal;
export default function EquipmentDetailPage({
  equipment,
  onBack,
  onUpdate,
  onNavigate,
  onNavigateToEquipment
}) {
  const CHECKMK_SYNC_MIN_INTERVAL_MS = 30 * 60 * 1000;
  const locale = useAppLocale();
  const { fields: systemExtensionFields } = useSystemFamilyExtensions(equipment?.type);
  const modalsCopy = useMemo(() => getEquipmentModalsCopy(locale), [locale]);
  const copy = useMemo(() => getEquipmentDetailCopy(locale), [locale]);
  const {
    theme
  } = useTheme();
  const {
    isCommunity
  } = useVeritasEdition();
  const {
    enabled: checkmkIntegrationEnabled
  } = useCheckMKIntegrationEnabled();
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [checkmkMappingModal, setCheckmkMappingModal] = useState(false);
  const [checkmkDebugModal, setCheckmkDebugModal] = useState(false);
  const [checkmkData, setCheckmkData] = useState(null);
  const [checkmkHostDetails, setCheckmkHostDetails] = useState(null);
  const [loadingCheckMK, setLoadingCheckMK] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [checkmkMapping, setCheckmkMapping] = useState(equipment?.checkmkMapping || null);
  const [checkmkLastSyncedAt, setCheckmkLastSyncedAt] = useState(null);
  const [checkmkPeriod, setCheckmkPeriod] = useState(null);
  const [checkmkAvailabilityPeriod, setCheckmkAvailabilityPeriod] = useState('1m');
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedLogDetail, setSelectedLogDetail] = useState(null);
  const [equipmentTags, setEquipmentTags] = useState([]);
  const [loadingEquipmentTags, setLoadingEquipmentTags] = useState(false);
  const [equipmentTagModalOpen, setEquipmentTagModalOpen] = useState(false);
  const [addingEquipmentTag, setAddingEquipmentTag] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalOpening, setEditModalOpening] = useState(false);
  const [customEditFamily, setCustomEditFamily] = useState(null);
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [proPromoFeature, setProPromoFeature] = useState(null);
  const [modalClient, setModalClient] = useState(null);
  const [clientSites, setClientSites] = useState([]);
  const [clientSsids, setClientSsids] = useState([]);
  const [peerFirewalls, setPeerFirewalls] = useState([]);
  const [peerServers, setPeerServers] = useState([]);
  const [peerStorage, setPeerStorage] = useState([]);
  const [peerBorneWifi, setPeerBorneWifi] = useState([]);
  const [heroMenuOpen, setHeroMenuOpen] = useState(false);
  const [rmmSyncRequesting, setRmmSyncRequesting] = useState(false);
  const [rmmUpdateRequesting, setRmmUpdateRequesting] = useState(false);
  const [rmmUpdateRequestedAt, setRmmUpdateRequestedAt] = useState(null);
  const [rmmUpdateTargetVersion, setRmmUpdateTargetVersion] = useState(null);
  const [lunsModalOpen, setLunsModalOpen] = useState(false);
  const [licencesModalOpen, setLicensesModalOpen] = useState(false);
  const [availableSites, setAvailableSites] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logsPage, setLogsPage] = useState(1);
  const [activity, setActivity] = useState(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activityDatePreset, setActivityDatePreset] = useState("30d");
  const [activityCustomStart, setActivityCustomStart] = useState("");
  const [activityCustomEnd, setActivityCustomEnd] = useState(toDateInputValue(new Date()));
  const activityControllerRef = useRef(null);
  const lastActivityFetchKeyRef = useRef(null);
  const [globalSSIDs, setGlobalSSIDs] = useState([]);
  const [loadingSSIDs, setLoadingSSIDs] = useState(false);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsSearchDraft, setLogsSearchDraft] = useState("");
  const [logsSearch, setLogsSearch] = useState("");
  const [logsCategory, setLogsCategory] = useState("all");
  const [purgeLogsConfirmOpen, setPurgeLogsConfirmOpen] = useState(false);
  const [purgingLogs, setPurgingLogs] = useState(false);
  const logsLimit = 10;
  const LOG_FILTER_OPTIONS = useMemo(() => [{
    value: "all",
    label: copy.logs.filters.all
  }, {
    value: "user",
    label: copy.logs.filters.user
  }, {
    value: "modifications",
    label: copy.logs.filters.modifications
  }, {
    value: "rmm",
    label: copy.logs.filters.rmm
  }, {
    value: "remote",
    label: copy.logs.filters.remote
  }], [copy]);
  const [rightPanelTab, setRightPanelTab] = useState('dashboard');
  const [activityPane, setActivityPane] = useState("metrics");
  const logsControllerRef = useRef(null);
  const checkmkControllerRef = useRef(null);
  const availabilityControllerRef = useRef(null);
  const heroActionsMenuRef = useRef(null);
  const syncRequestOverrideRef = useRef(undefined);
  const syncConfirmedOnAgentRef = useRef(false);
  const lastRmmRefreshSnapshotRef = useRef(null);
  const getEquipmentDbIdLocal = () => resolveEquipmentDbId(equipment);
  const getEditModuleKey = eq => {
    const family = eq?.type || eq?.familyKey || "";
    if (parseCustomFamilyType(family)) return null;
    if (family === "NAS" || family === "Storage" || family === "Stockage") return "Storage";
    if (family === "Servers" || family === "Serveurs" || family === "Server" || family === "Serveur") return "Servers";
    if (family === "Firewalls" || family === "Firewall") return "Firewalls";
    if (family === "Ordinateurs" || family === "Workstations") return "Ordinateurs";
    return family || null;
  };
  const equipmentDisplayType = equipment?.type === "NAS" ? "Storage" : equipment?.type;
  const equipmentModuleKey = equipment ? getEditModuleKey(equipment) : null;
  const toDetailFormData = useCallback((source, extra = {}) => buildDetailFormData(source, {
    clientSites,
    clientSsids,
    extensionFields: systemExtensionFields,
    ...extra
  }), [clientSites, clientSsids, systemExtensionFields]);
  const alertSettings = useEquipmentAlertSettings(equipment);
  const rmmManaged = isRmmManagedEquipment(equipment);
  const rmmAgentId = getRmmAgentId(equipment);
  const [syncRequestOverride, setSyncRequestOverride] = useState(undefined);
  const [rmmHeartbeatIntervalMinutes, setRmmHeartbeatIntervalMinutes] = useState(null);
  const [rmmOfflineThresholdMinutes, setRmmOfflineThresholdMinutes] = useState(null);
  const [rmmLiveOnline, setRmmLiveOnline] = useState(null);
  const [rmmLastSeenAt, setRmmLastSeenAt] = useState(null);
  const {
    pending: rmmSyncPending,
    requestedAt: rmmSyncRequestedAt
  } = useMemo(() => resolveRmmSyncRequestState(equipment, syncRequestOverride), [equipment, syncRequestOverride]);
  const rmmHeartbeatMinutes = useMemo(() => resolveRmmHeartbeatIntervalMinutes(equipment, rmmHeartbeatIntervalMinutes), [equipment, rmmHeartbeatIntervalMinutes]);
  const equipmentWithRmmLive = useMemo(() => {
    if (!equipment) return equipment;
    if (rmmLiveOnline == null && !rmmLastSeenAt && rmmHeartbeatIntervalMinutes == null && rmmOfflineThresholdMinutes == null) {
      return equipment;
    }
    return {
      ...equipment,
      rmmLiveOnline: rmmLiveOnline == null ? equipment.rmmLiveOnline : rmmLiveOnline,
      rmmLastSeenAt: rmmLastSeenAt || equipment.rmmLastSeenAt || null,
      heartbeatIntervalMinutes: rmmHeartbeatIntervalMinutes ?? equipment.heartbeatIntervalMinutes,
      offlineThresholdMinutes: rmmOfflineThresholdMinutes ?? equipment.offlineThresholdMinutes,
      agentOnline: rmmLiveOnline == null ? equipment.agentOnline : rmmLiveOnline
    };
  }, [equipment, rmmLiveOnline, rmmLastSeenAt, rmmHeartbeatIntervalMinutes, rmmOfflineThresholdMinutes]);
  useEffect(() => {
    syncRequestOverrideRef.current = syncRequestOverride;
  }, [syncRequestOverride]);
  const showRmmHeroStatus = equipment?.type === "Ordinateurs" && rmmManaged;
  const rmmAgentVersion = useMemo(() => showRmmHeroStatus ? getRmmAgentVersion(equipmentWithRmmLive) : null, [equipmentWithRmmLive, showRmmHeroStatus]);
  const rmmDeviceHealth = useMemo(() => showRmmHeroStatus ? computeRmmDeviceHealth(equipmentWithRmmLive) : null, [equipmentWithRmmLive, showRmmHeroStatus]);
  const showRmmMetricsTab = equipment?.type === "Ordinateurs" && rmmManaged;
  const showRmmPeripheralsTab = showRmmMetricsTab;
  const showRmmOperationsTab = showRmmMetricsTab;
  const showSupervisionTab = Boolean(checkmkIntegrationEnabled && checkmkMapping?.checkmk_host_name && isCheckMKMappableType(equipment?.type) && equipment?.type !== "Internet");
  const rmmMetricsAgent = useMemo(() => showRmmMetricsTab ? buildRmmAgentRowFromEquipment(equipment) : null, [equipment, showRmmMetricsTab]);
  useEffect(() => {
    if (!equipment?.id) return;
    if (equipment.detailTab === "metrics" && showRmmMetricsTab) {
      setRightPanelTab("activity");
      setActivityPane("metrics");
    }
  }, [equipment?.id, equipment?.detailTab, showRmmMetricsTab]);
  const handleRmmFullSync = async () => {
    setHeroMenuOpen(false);
    if (!rmmAgentId) {
      toast.error(copy.toasts.rmmAgentNotFound);
      return;
    }
    setRmmSyncRequesting(true);
    try {
      const result = await requestRmmAgentSync(rmmAgentId);
      const syncAt = result?.sync_requested_at || new Date().toISOString();
      syncConfirmedOnAgentRef.current = false;
      setSyncRequestOverride(syncAt);
      onUpdate?.(patchEquipmentRmmSyncRequest(equipment, syncAt));
      toast.success(agentSupportsImmediateFullSync(equipment) ? copy.toasts.fullSyncRequestedFast : (() => {
        const expectedLabel = formatRmmExpectedCollectionLabel(equipment, rmmHeartbeatMinutes, {
          withAbsolute: false
        });
        return expectedLabel ? interpolate(copy.toasts.fullSyncRequestedWithCollection, {
          label: expectedLabel
        }) : copy.toasts.fullSyncRequested;
      })());
      window.setTimeout(() => {
        refreshRmmEquipment();
      }, 5000);
    } catch (error) {
      console.error("Error sync complet RMM:", error);
      toast.error(error?.message || copy.toasts.fullSyncRequestError);
    } finally {
      setRmmSyncRequesting(false);
    }
  };
  const handleRmmCancelSync = async () => {
    setHeroMenuOpen(false);
    if (!rmmAgentId) {
      toast.error(copy.toasts.rmmAgentNotFound);
      return;
    }
    setRmmSyncRequesting(true);
    try {
      await cancelRmmAgentSync(rmmAgentId);
      syncConfirmedOnAgentRef.current = false;
      setSyncRequestOverride(null);
      onUpdate?.(patchEquipmentRmmSyncRequest(equipment, null));
      toast.success(copy.toasts.fullSyncCancelled);
      await refreshRmmEquipment();
    } catch (error) {
      console.error("Error annulation sync RMM:", error);
      toast.error(error?.message || copy.toasts.fullSyncCancelError);
    } finally {
      setRmmSyncRequesting(false);
    }
  };
  const handleRmmAgentUpdate = async () => {
    setHeroMenuOpen(false);
    if (!rmmAgentId) {
      toast.error(copy.toasts.rmmAgentNotFound);
      return;
    }
    setRmmUpdateRequesting(true);
    try {
      const result = await requestRmmAgentUpdate(rmmAgentId);
      const latest = result?.latest_agent_version || "—";
      setRmmUpdateRequestedAt(result?.update_requested_at || new Date().toISOString());
      setRmmUpdateTargetVersion(result?.latest_agent_version || null);
      toast.success(interpolate(agentSupportsImmediateFullSync(equipment) ? copy.toasts.agentUpdateRequestedFast : copy.toasts.agentUpdateRequested, {
        version: latest
      }));
      if (rightPanelTab === "logs") {
        window.setTimeout(() => {
          loadLogs(1);
        }, 400);
      }
      window.setTimeout(() => {
        refreshRmmEquipment();
      }, 5000);
    } catch (error) {
      console.error("Error mise à jour agent RMM:", error);
      if (error?.code === "ALREADY_UP_TO_DATE") {
        const version = error?.latest_agent_version || getRmmAgentVersion(equipment) || "—";
        toast.info(interpolate(copy.toasts.agentUpdateAlreadyLatest, {
          version
        }));
      } else {
        toast.error(error?.message || copy.toasts.agentUpdateRequestError);
      }
    } finally {
      setRmmUpdateRequesting(false);
    }
  };
  const handleRmmCancelAgentUpdate = async () => {
    setHeroMenuOpen(false);
    if (!rmmAgentId) {
      toast.error(copy.toasts.rmmAgentNotFound);
      return;
    }
    setRmmUpdateRequesting(true);
    try {
      await cancelRmmAgentUpdate(rmmAgentId);
      setRmmUpdateRequestedAt(null);
      setRmmUpdateTargetVersion(null);
      toast.success(copy.toasts.agentUpdateCancelled);
      if (rightPanelTab === "logs") {
        window.setTimeout(() => {
          loadLogs(1);
        }, 400);
      }
    } catch (error) {
      console.error("Error annulation MAJ agent RMM:", error);
      toast.error(error?.message || copy.toasts.agentUpdateCancelError);
    } finally {
      setRmmUpdateRequesting(false);
    }
  };
  const refreshRmmEquipment = useCallback(async () => {
    if (!equipment?.clientId || !onUpdate) return;
    try {
      const list = await getClientHardwareEquipment(equipment.clientId);
      const refreshed = findEquipmentInList(list, equipment);
      if (refreshed) {
        const refreshedSyncAt = getRmmSyncRequestedAt(refreshed);
        const preserveCancelled = syncRequestOverrideRef.current === null;
        const currentOverride = syncRequestOverrideRef.current;
        let nextEquipment = refreshed;
        if (preserveCancelled) {
          nextEquipment = patchEquipmentRmmSyncRequest(refreshed, null);
          setSyncRequestOverride(null);
        } else if (refreshedSyncAt) {
          syncConfirmedOnAgentRef.current = true;
          setSyncRequestOverride(refreshedSyncAt);
          nextEquipment = patchEquipmentRmmSyncRequest(refreshed, refreshedSyncAt);
        } else if (typeof currentOverride === "string") {
          nextEquipment = patchEquipmentRmmSyncRequest(refreshed, currentOverride);
        } else if (currentOverride === undefined) {
          setSyncRequestOverride(undefined);
        }
        setFormData(toDetailFormData(nextEquipment));
        const rmmSnapshot = JSON.stringify({
          dbId: resolveEquipmentDbId(nextEquipment),
          syncAt: getRmmSyncRequestedAt(nextEquipment),
          heartbeat: nextEquipment?.rmmLastHeartbeat || nextEquipment?.rawData?.rmm_last_heartbeat || null,
          agentStatus: nextEquipment?.agentStatus || nextEquipment?.rawData?.agent_status || null
        });
        if (lastRmmRefreshSnapshotRef.current === rmmSnapshot) return;
        lastRmmRefreshSnapshotRef.current = rmmSnapshot;
        onUpdate(nextEquipment);
      }
    } catch {}
  }, [equipment, onUpdate, clientSites, clientSsids]);
  useEffect(() => {
    setProFeaturePromoHandler(featureKey => setProPromoFeature(featureKey));
    return () => setProFeaturePromoHandler(null);
  }, []);
  const openCreateEventModal = () => {
    setHeroMenuOpen(false);
    if (isCommunity) {
      notifyProFeature("Company schedule");
      return;
    }
    setEditingEvent(null);
    setEventModalOpen(true);
  };
  const applyCheckMKPayload = payload => {
    if (!payload) return;
    const availabilityByPeriod = payload.availabilityByPeriod || payload.checkmkData?.availabilityByPeriod || {};
    const availability = availabilityByPeriod[checkmkAvailabilityPeriod] ?? payload.checkmkData?.availability ?? null;
    if (payload.checkmkData) {
      setCheckmkData({
        ...payload.checkmkData,
        availability,
        availabilityByPeriod
      });
    }
    if (payload.hostDetails) {
      setCheckmkHostDetails(payload.hostDetails);
    }
    if (payload.lastSyncedAt) {
      setCheckmkLastSyncedAt(payload.lastSyncedAt);
    }
  };
  const abortAllPendingFetches = () => {
    logsControllerRef.current?.abort();
    checkmkControllerRef.current?.abort();
    availabilityControllerRef.current?.abort();
  };
  const [initialFormData, setInitialFormData] = useState(null);
  const [hasInfoChanges, setHasInfoChanges] = useState(false);
  const [formData, setFormData] = useState(() => buildDetailFormData(equipment, { extensionFields: systemExtensionFields }));
  const remoteAccessAction = useMemo(() => resolveEquipmentRemoteAccessAction(equipment, formData, locale), [equipment, formData, locale]);
  const equipmentDbId = useMemo(() => resolveEquipmentDbId(equipment), [equipment]);
  const equipmentClientId = useMemo(() => getEquipmentClientId(equipment), [equipment]);
  const equipmentIdentityKey = useMemo(() => getEquipmentListKey(equipment), [equipment]);
  const needsHydration = useMemo(() => equipmentNeedsHydration(equipment), [equipment]);
  const lastHydratedKeyRef = useRef(null);
  const canManageEquipmentTags = Boolean(equipmentDbId && equipmentClientId);
  useEffect(() => {
    if (!canManageEquipmentTags) {
      setEquipmentTags([]);
      setLoadingEquipmentTags(false);
      return undefined;
    }
    let cancelled = false;
    setLoadingEquipmentTags(true);
    fetchEquipmentTags(equipmentDbId, equipmentClientId).then(tags => {
      if (!cancelled) setEquipmentTags(Array.isArray(tags) ? tags : []);
    }).catch(error => {
      console.error("Error loading tags device:", error);
      if (!cancelled) setEquipmentTags([]);
    }).finally(() => {
      if (!cancelled) setLoadingEquipmentTags(false);
    });
    return () => {
      cancelled = true;
    };
  }, [canManageEquipmentTags, equipmentDbId, equipmentClientId]);
  useEffect(() => {
    if (!equipment) return;
    abortAllPendingFetches();
    const alreadyHydrated = lastHydratedKeyRef.current === equipmentIdentityKey;
    if (!(needsHydration && alreadyHydrated)) {
      setFormData(toDetailFormData(equipment));
    }
    const mapping = equipment.checkmkMapping || checkmkMapping || null;
    setCheckmkMapping(mapping);
    if (checkmkIntegrationEnabled && mapping && mapping.checkmk_host_name) {
      loadCheckMKData();
    } else if (!needsHydration) {
      setCheckmkData(null);
    }
  }, [equipmentIdentityKey, needsHydration, checkmkIntegrationEnabled, clientSites, clientSsids]);
  useEffect(() => {
    if (!needsHydration) return undefined;
    const clientId = getEquipmentClientId(equipment);
    const dbId = resolveEquipmentDbId(equipment);
    if (!clientId || !dbId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const familyKey = parseCustomFamilyType(equipment.type) || equipment.familyKey || null;
        const isCustom = Boolean(equipment.isCustom || familyKey && String(equipment.type || "").startsWith("Custom:"));
        let refreshed = null;
        if (isCustom && familyKey) {
          let family = equipment.customFamily?.familyKey === familyKey ? equipment.customFamily : null;
          if (!family?.fields) {
            const families = await fetchEquipmentFamilies().catch(() => []);
            family = (Array.isArray(families) ? families : []).find(entry => entry.familyKey === familyKey) || family;
          }
          const rows = await fetchClientCustomEquipment(clientId, familyKey);
          const row = (Array.isArray(rows) ? rows : []).find(item => String(item?.id) === String(dbId));
          if (row) {
            refreshed = mapCustomEquipmentItem(row, family || {
              familyKey,
              label: equipment.familyLabel || equipment.customFamily?.label || familyKey,
              icon: equipment.familyIcon || equipment.customFamily?.icon || "mdi:devices",
              fields: equipment.customFields || []
            }, {
              clientId,
              clientName: equipment.clientName
            });
          }
        } else {
          const list = await getClientHardwareEquipment(clientId);
          refreshed = findEquipmentInList(list, equipment);
        }
        if (cancelled || !refreshed) return;
        lastHydratedKeyRef.current = equipmentIdentityKey;
        setFormData(toDetailFormData(refreshed));
        if (onUpdate) onUpdate(refreshed);
        else onNavigateToEquipment?.(refreshed);
      } catch (error) {
        console.warn("Hydrate equipment detail:", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [equipmentIdentityKey]);
  useEffect(() => {
    if (!equipment?.clientId) {
      setClientSites([]);
      setClientSsids([]);
      return undefined;
    }
    let mounted = true;
    fetchClientGeneral(equipment.clientId).then(client => {
      if (!mounted) return;
      setClientSites(normalizeClientSites(client?.sites));
      setClientSsids(resolveClientWifiSsidCatalog(client));
    }).catch(() => {
      if (mounted) {
        setClientSites([]);
        setClientSsids([]);
      }
    });
    return () => {
      mounted = false;
    };
  }, [equipment?.clientId]);
  useEffect(() => {
    const needsPeers = equipment?.type === "Firewalls" || equipment?.type === "Servers" || equipment?.type === "Serveurs" || equipment?.type === "NAS" || equipment?.type === "Storage" || equipment?.type === "Stockage" || equipment?.type === "BorneWifi";
    if (!needsPeers || !equipment?.clientId) {
      setPeerFirewalls([]);
      setPeerServers([]);
      setPeerStorage([]);
      setPeerBorneWifi([]);
      return undefined;
    }
    let mounted = true;
    getClientHardwareEquipment(equipment.clientId).then(list => {
      if (!mounted) return;
      const rows = Array.isArray(list) ? list : [];
      setPeerFirewalls(rows.filter(eq => eq.type === "Firewalls"));
      setPeerServers(rows.filter(eq => eq.type === "Servers" || eq.type === "Serveurs"));
      setPeerStorage(rows.filter(eq => eq.type === "NAS" || eq.type === "Storage" || eq.type === "Stockage"));
      setPeerBorneWifi(rows.filter(eq => eq.type === "BorneWifi"));
    }).catch(() => {
      if (mounted) {
        setPeerFirewalls([]);
        setPeerServers([]);
        setPeerStorage([]);
        setPeerBorneWifi([]);
      }
    });
    return () => {
      mounted = false;
    };
  }, [equipment?.clientId, equipment?.type, equipmentIdentityKey]);
  const openLinkedEquipment = useCallback(target => {
    if (!target) return;
    if (onNavigate) {
      onNavigate("EquipmentDetail", target);
      return;
    }
    onNavigateToEquipment?.(target);
  }, [onNavigate, onNavigateToEquipment]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLogsSearch(logsSearchDraft.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [logsSearchDraft]);
  useEffect(() => {
    if (rightPanelTab !== 'logs') {
      logsControllerRef.current?.abort();
      return;
    }
    if (!equipment?.id) return;
    loadLogs(1);
  }, [rightPanelTab, equipment?.id, logsSearch, logsCategory]);
  useEffect(() => {
    if (!rmmManaged || !equipment?.clientId) return undefined;
    refreshRmmEquipment();
    const intervalMs = rmmSyncPending ? 15000 : 45000;
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      refreshRmmEquipment();
    }, intervalMs);
    return () => clearInterval(interval);
  }, [rmmManaged, equipment?.clientId, equipment?.id, rmmSyncPending, refreshRmmEquipment]);
  useEffect(() => {
    if (rightPanelTab === "dashboard" && rmmManaged) {
      refreshRmmEquipment();
    }
  }, [rightPanelTab, rmmManaged, refreshRmmEquipment]);
  useEffect(() => {
    setSyncRequestOverride(undefined);
    setRmmHeartbeatIntervalMinutes(null);
    setRmmOfflineThresholdMinutes(null);
    setRmmLiveOnline(null);
    setRmmLastSeenAt(null);
    setRmmUpdateRequestedAt(null);
    setRmmUpdateTargetVersion(null);
    syncConfirmedOnAgentRef.current = Boolean(getRmmSyncRequestedAt(equipment));
    lastRmmRefreshSnapshotRef.current = null;
    lastActivityFetchKeyRef.current = null;
  }, [equipment?.id]);
  useEffect(() => {
    if (!rmmManaged || !rmmAgentId || !equipment?.clientId) return undefined;
    let cancelled = false;
    const pollAgentSyncState = async () => {
      try {
        const agents = await fetchRmmAgents(equipment.clientId);
        if (cancelled) return;
        const agent = (Array.isArray(agents) ? agents : []).find(row => row.id === rmmAgentId);
        if (!agent) return;
        if (agent.heartbeat_interval_minutes != null) {
          const minutes = Number(agent.heartbeat_interval_minutes);
          if (Number.isFinite(minutes) && minutes > 0) {
            setRmmHeartbeatIntervalMinutes(minutes);
          }
        }
        if (agent.offline_threshold_effective_minutes != null || agent.offline_threshold_minutes != null) {
          const minutes = Number(agent.offline_threshold_effective_minutes ?? agent.offline_threshold_minutes);
          if (Number.isFinite(minutes) && minutes > 0) {
            setRmmOfflineThresholdMinutes(minutes);
          }
        }
        if (agent.online === true || agent.online === false) {
          setRmmLiveOnline(agent.online);
        }
        if (agent.last_seen_at) {
          setRmmLastSeenAt(agent.last_seen_at);
        }
        setRmmUpdateRequestedAt(agent.update_requested_at || null);
        if (!agent.update_requested_at) {
          setRmmUpdateTargetVersion(null);
        } else if (agent.latest_agent_version) {
          setRmmUpdateTargetVersion(agent.latest_agent_version);
        }
        if (!onUpdate) return;
        const syncAt = agent.sync_requested_at || null;
        if (syncRequestOverrideRef.current === null) {
          if (!syncAt) {
            setSyncRequestOverride(undefined);
            syncConfirmedOnAgentRef.current = false;
            onUpdate(patchEquipmentRmmSyncRequest(equipment, null));
          }
          return;
        }
        const currentAt = syncRequestOverrideRef.current !== undefined ? syncRequestOverrideRef.current : getRmmSyncRequestedAt(equipment);
        if (rmmSyncTimestampsMatch(syncAt, currentAt)) {
          if (syncAt) syncConfirmedOnAgentRef.current = true;
          return;
        }
        if (!syncAt) {
          if (typeof currentAt === "string" && !syncConfirmedOnAgentRef.current) {
            return;
          }
          setSyncRequestOverride(undefined);
          syncConfirmedOnAgentRef.current = false;
          onUpdate(patchEquipmentRmmSyncRequest(equipment, null));
          refreshRmmEquipment();
          return;
        }
        syncConfirmedOnAgentRef.current = true;
        setSyncRequestOverride(syncAt);
        onUpdate(patchEquipmentRmmSyncRequest(equipment, syncAt));
      } catch {}
    };
    pollAgentSyncState();
    const interval = setInterval(pollAgentSyncState, rmmSyncPending || rmmUpdateRequestedAt ? 15000 : 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [rmmManaged, rmmAgentId, equipment?.clientId, equipment?.id, onUpdate, refreshRmmEquipment, rmmSyncPending, rmmUpdateRequestedAt]);
  useEffect(() => {
    if (!rmmManaged || !rmmAgentId || !rmmUpdateRequestedAt) return undefined;
    let cancelled = false;
    const nudgeHeartbeat = async () => {
      try {
        await requestRmmAgentHeartbeat(rmmAgentId);
        if (!cancelled) await refreshRmmEquipment();
      } catch {
        // best-effort wake; poll continues
      }
    };
    nudgeHeartbeat();
    const interval = setInterval(nudgeHeartbeat, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [rmmManaged, rmmAgentId, rmmUpdateRequestedAt, refreshRmmEquipment]);
  useEffect(() => {
    if (!showRmmMetricsTab && activityPane === "metrics") {
      setActivityPane("veritas");
    }
  }, [showRmmMetricsTab, activityPane]);
  useEffect(() => {
    if (rightPanelTab === "peripherals" && !showRmmPeripheralsTab) {
      setRightPanelTab("dashboard");
    }
  }, [rightPanelTab, showRmmPeripheralsTab]);
  useEffect(() => {
    if (rightPanelTab === "operations" && !showRmmOperationsTab) {
      setRightPanelTab("dashboard");
    }
  }, [rightPanelTab, showRmmOperationsTab]);
  useEffect(() => {
    if (rightPanelTab === "supervision" && !showSupervisionTab) {
      setRightPanelTab("dashboard");
    }
  }, [rightPanelTab, showSupervisionTab]);
  useEffect(() => {
    if (rightPanelTab === "dashboard" || rightPanelTab === "activity" || rightPanelTab === "events" || rightPanelTab === "stats" || rightPanelTab === "supervision") return;
    checkmkControllerRef.current?.abort();
    availabilityControllerRef.current?.abort();
  }, [rightPanelTab]);
  useEffect(() => {
    return () => {
      abortAllPendingFetches();
    };
  }, []);
  useEffect(() => {
    if (!heroMenuOpen) return undefined;
    const handlePointerDown = event => {
      if (heroActionsMenuRef.current && !heroActionsMenuRef.current.contains(event.target)) {
        setHeroMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [heroMenuOpen]);
  const openEditEquipmentModal = async event => {
    event?.stopPropagation?.();
    event?.preventDefault?.();
    setHeroMenuOpen(false);
    const clientId = getEquipmentClientId(equipment);
    if (!clientId) {
      toast.error(copy.toasts.clientNotFound);
      return;
    }
    if (editModalOpening) return;
    setEditModalOpening(true);
    try {
      const client = await fetchClientGeneral(clientId);
      const ssids = resolveClientWifiSsidCatalog(client);
      const nextClient = {
        ...client,
        sites: Array.isArray(client.sites) ? [...client.sites] : client.sites,
        ssid: Array.isArray(ssids) ? [...ssids] : ssids,
        ssids: Array.isArray(ssids) ? [...ssids] : ssids
      };
      setModalClient(nextClient);
      const familyKey = parseCustomFamilyType(equipment?.type) || equipment?.familyKey || null;
      if (familyKey) {
        let family = equipment?.customFamily?.familyKey === familyKey ? equipment.customFamily : null;
        if (!family?.fields) {
          const families = await fetchEquipmentFamilies().catch(() => []);
          family = (Array.isArray(families) ? families : []).find(entry => entry.familyKey === familyKey) || family;
        }
        if (!family) {
          family = {
            familyKey,
            label: equipment?.customFamily?.label || equipment?.familyLabel || familyKey,
            icon: equipment?.customFamily?.icon || equipment?.familyIcon || "mdi:devices",
            fields: equipment?.customFields || equipment?.customFamily?.fields || []
          };
        }
        setCustomEditFamily(family);
        return;
      }
      setEditModalOpen(true);
      getClientHardwareEquipment(clientId).then(allEquipment => {
        const list = Array.isArray(allEquipment) ? allEquipment : [];
        const sameClient = eq => String(eq.clientId) === String(clientId);
        setPeerFirewalls(list.filter(eq => eq.type === "Firewalls" && sameClient(eq)));
        setPeerServers(list.filter(eq => (eq.type === "Servers" || eq.type === "Serveurs") && sameClient(eq)));
        setPeerStorage(list.filter(eq => (eq.type === "NAS" || eq.type === "Storage" || eq.type === "Stockage") && sameClient(eq)));
        setPeerBorneWifi(list.filter(eq => eq.type === "BorneWifi" && sameClient(eq)));
      }).catch(error => {
        console.warn("Load equipment peers:", error);
      });
    } catch (error) {
      console.error("Open edit modal:", error);
      toast.error(copy.toasts.editOpenError);
    } finally {
      setEditModalOpening(false);
    }
  };
  const handleEquipmentModalSaved = async submitData => {
    let nextEquipment = equipment;
    if (submitData && equipment) {
      if (submitData.location !== undefined) {
        nextEquipment = patchEquipmentLocation(nextEquipment, submitData.location);
      }
      nextEquipment = patchEquipmentWithSharedFields(nextEquipment, submitData);
      if (submitData.computerType !== undefined) {
        const computerType = canonicalizeComputerType(submitData.computerType);
        nextEquipment = {
          ...nextEquipment,
          computerType,
          rawData: {
            ...(nextEquipment.rawData || {}),
            type: computerType
          }
        };
      }
      setFormData(toDetailFormData(nextEquipment));
      onUpdate?.(nextEquipment);
    }
    try {
      const list = await getClientHardwareEquipment(getEquipmentClientId(equipment) || equipment.clientId);
      const refreshed = findEquipmentInList(list, nextEquipment || equipment);
      if (refreshed) {
        setFormData(toDetailFormData(refreshed));
        onUpdate?.(refreshed);
      }
    } catch (error) {
      console.warn("Refresh hardware record:", error);
    }
  };
  const handleEquipmentModalDeleted = () => {
    onUpdate?.(null);
    onBack?.();
  };
  const handleCustomEquipmentRefresh = async savedRow => {
    if (!savedRow) {
      handleEquipmentModalDeleted();
      return;
    }
    const family = customEditFamily || equipment?.customFamily || null;
    const nextEquipment = {
      ...equipment,
      ...mapCustomEquipmentItem(savedRow, family, {
        clientId: getEquipmentClientId(equipment) || savedRow.clientId,
        clientName: equipment?.clientName || modalClient?.name || ""
      }),
      id: equipment?.id,
      dbId: equipment?.dbId || savedRow.id
    };
    setFormData(toDetailFormData(nextEquipment, { customFamily: family }));
    onUpdate?.(nextEquipment);
  };
  const customEditItem = useMemo(() => {
    if (!customEditFamily || !equipment) return null;
    return {
      ...equipment,
      id: resolveEquipmentDbId(equipment) || equipment.id
    };
  }, [customEditFamily, equipment]);
  const loadSSIDs = async () => {
    setGlobalSSIDs([]);
    setLoadingSSIDs(false);
  };
  useEffect(() => {
    const localSites = [];
    if (equipment?.location && String(equipment.location).trim() && equipment.location !== "Sans site") {
      localSites.push(equipment.location);
    }
    setAvailableSites(localSites);
  }, [equipment?.location]);
  const detectInfoChanges = (currentData, initialData) => {
    if (!initialData) return false;
    const infoFields = ["name", "location", "typeServer", "computerType", "ip", "vlan", "systeme", "remoteAccessSolution", "remoteAccessId", "manufacturer", "model", "serial", "expirationGarantie", "processeur", "memoire", "stockage", "role", "raid", "capacite", "nbDisquesActuels", "nbDisquesMax", "disques", "luns", "fournisseur", "internetType", "debit", "categorie", "ipNonFixe", "firmware", "licences", "modeHA", "roleHA", "firewallHA", "firewallHAName", "serverHA", "serverHAName", "storageHA", "storageHAName", "hostServerName", "hypervisor", "adresseMac", "quickConnect"];
    for (const field of infoFields) {
      const cur = currentData[field];
      const init = initialData[field];
      const changed = Array.isArray(cur) && Array.isArray(init) ? JSON.stringify(cur) !== JSON.stringify(init) : cur !== init;
      if (changed) return true;
    }
    return false;
  };
  const updateFormDataWithChanges = newData => {
    setFormData(newData);
    if (initialFormData) {
      setHasInfoChanges(detectInfoChanges(newData, initialFormData));
    }
  };
  const handleSaveInfo = async () => {
    if (!equipment?.id) return;
    setSaving(true);
    try {
      await updateEquipment(equipment.id, formData, equipment);
      setIsEditingInfo(false);
      if (onUpdate) {
        onUpdate({
          ...equipment,
          ...formData
        });
      }
      toast.success(copy.toasts.saveSuccess);
    } catch (error) {
      console.error("Error lors de la sauvegarde:", error);
      toast.error(copy.toasts.saveError);
    } finally {
      setSaving(false);
    }
  };
  const handleCancelInfo = () => {
    if (initialFormData) {
      setFormData(initialFormData);
    }
    setIsEditingInfo(false);
    setHasInfoChanges(false);
  };
  const loadLogs = async (page = 1) => {
    if (!equipment?.id) return;
    logsControllerRef.current?.abort();
    const controller = createTrackedAbortController();
    logsControllerRef.current = controller;
    setLoadingLogs(true);
    try {
      const data = await getEquipmentLogs(equipment.id, page, logsLimit, {
        clientId: equipment.clientId,
        type: equipment.type,
        name: equipment.name,
        dbId: getEquipmentDbIdLocal() || equipment.dbId || null,
        familyKey: equipment.familyKey || parseCustomFamilyType(equipment.type) || null,
        family: equipment.family || null,
        search: logsSearch,
        category: logsCategory,
        signal: controller.signal
      });
      if (controller.signal.aborted) return;
      setLogs(data.logs || []);
      setLogsTotal(data.total || 0);
      setLogsPage(page);
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error("Error while loading des logs:", error);
      setLogs([]);
      setLogsTotal(0);
    } finally {
      if (!controller.signal.aborted) setLoadingLogs(false);
    }
  };
  const handlePurgeLogs = async () => {
    if (!equipment?.id || purgingLogs) return;
    setPurgingLogs(true);
    try {
      const result = await purgeEquipmentLogs(equipment.id, {
        clientId: equipment.clientId,
        type: equipment.type,
        name: equipment.name,
        dbId: getEquipmentDbIdLocal() || equipment.dbId || null,
        familyKey: equipment.familyKey || parseCustomFamilyType(equipment.type) || null,
        family: equipment.family || null,
        search: logsSearch,
        category: logsCategory
      });
      const deleted = result?.logs_deleted ?? 0;
      toast.success(deleted > 0 ? interpolate(copy.logs.purgeSuccess, {
        count: deleted
      }) : copy.logs.purgeNone);
      setPurgeLogsConfirmOpen(false);
      setSelectedLogDetail(null);
      await loadLogs(1);
    } catch (error) {
      console.error("Error purge logs:", error);
      toast.error(error?.message || copy.toasts.purgeError);
    } finally {
      setPurgingLogs(false);
    }
  };
  const logsFiltersActive = Boolean(logsSearch) || logsCategory !== "all";
  const purgeLogsMessage = logsFiltersActive ? interpolate(modalsCopy.confirm?.purgeLogs?.messageFiltered, {
    count: logsTotal
  }) : interpolate(modalsCopy.confirm?.purgeLogs?.messageAll, {
    count: logsTotal
  });
  const loadEquipmentActivity = useCallback(async () => {
    if (!equipmentDbId || !equipmentClientId) {
      setActivity(null);
      setLoadingActivity(false);
      return;
    }
    activityControllerRef.current?.abort();
    const controller = createTrackedAbortController();
    activityControllerRef.current = controller;
    const {
      start,
      end
    } = resolveEquipmentActivityRange({
      preset: activityDatePreset,
      customStart: activityCustomStart,
      customEnd: activityCustomEnd
    });
    setLoadingActivity(true);
    try {
      const payload = await fetchEquipmentActivity({
        equipmentId: equipmentDbId,
        clientId: equipmentClientId,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        signal: controller.signal
      });
      if (controller.signal.aborted) return;
      setActivity(payload);
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error("Error loading device activity:", error);
      setActivity(null);
    } finally {
      if (!controller.signal.aborted) {
        setLoadingActivity(false);
        lastActivityFetchKeyRef.current = [equipmentDbId || "", equipmentClientId || "", activityDatePreset, activityCustomStart, activityCustomEnd].join("|");
      }
    }
  }, [equipmentDbId, equipmentClientId, activityDatePreset, activityCustomStart, activityCustomEnd]);
  const activityFetchKey = useMemo(() => [equipmentDbId || "", equipmentClientId || "", activityDatePreset, activityCustomStart, activityCustomEnd].join("|"), [equipmentDbId, equipmentClientId, activityDatePreset, activityCustomStart, activityCustomEnd]);
  useEffect(() => {
    const onActivityTab = rightPanelTab === "activity" || rightPanelTab === "events" || rightPanelTab === "stats";
    const needsVeritasData = onActivityTab && (!showRmmMetricsTab || activityPane === "veritas");
    if (!needsVeritasData) {
      activityControllerRef.current?.abort();
      return;
    }
    if (!equipmentDbId || !equipmentClientId) {
      lastActivityFetchKeyRef.current = null;
      setActivity(null);
      setLoadingActivity(false);
      return;
    }
    if (lastActivityFetchKeyRef.current === activityFetchKey) return;
    lastActivityFetchKeyRef.current = activityFetchKey;
    loadEquipmentActivity();
  }, [rightPanelTab, activityPane, showRmmMetricsTab, activityFetchKey, equipmentDbId, equipmentClientId, loadEquipmentActivity]);
  const handleOpenLinkedTicket = ticket => {
    if (!ticket?.id || !onNavigate) return;
    onNavigate("TicketDetail", {
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number,
      title: ticket.title
    });
  };
  const handleOpenPlanningEvent = event => {
    if (!event) return;
    if (isCommunity) {
      notifyProFeature("Company schedule");
      return;
    }
    setEditingEvent(event);
    setEventModalOpen(true);
  };
  const refreshActivityAfterEventChange = () => {
    const onActivityTab = rightPanelTab === "activity" || rightPanelTab === "events" || rightPanelTab === "stats";
    if (onActivityTab && (!showRmmMetricsTab || activityPane === "veritas")) {
      lastActivityFetchKeyRef.current = null;
      loadEquipmentActivity();
    }
  };
  const openActivityTab = pane => {
    if (pane === "metrics" && showRmmMetricsTab) setActivityPane("metrics");else if (pane === "veritas" || !showRmmMetricsTab) setActivityPane("veritas");
    setRightPanelTab("activity");
  };
  const loadPhotos = async () => {
    if (!equipment?.id) return;
    setLoadingPhotos(false);
    setPhotos([]);
  };
  const handlePhotoUpload = async e => {
    e.preventDefault();
    e.target.value = "";
    setPhotoModalOpen(true);
  };
  const getAvailabilityPeriodRange = periodKey => {
    const endTime = new Date();
    endTime.setHours(23, 59, 59, 999);
    const startTime = new Date(endTime);
    if (periodKey === '1m') startTime.setMonth(startTime.getMonth() - 1);else if (periodKey === '3m') startTime.setMonth(startTime.getMonth() - 3);else if (periodKey === '1y') startTime.setFullYear(startTime.getFullYear() - 1);
    startTime.setHours(0, 0, 0, 0);
    return {
      startTime,
      endTime
    };
  };
  const loadCheckMKData = async ({
    force = false
  } = {}) => {
    if (!checkmkIntegrationEnabled) return;
    const mapping = checkmkMapping || equipment?.checkmkMapping;
    if (!mapping?.checkmk_host_name) return;
    const equipmentId = getEquipmentDbIdLocal();
    const clientId = equipment?.clientId;
    const family = equipmentTypeToFamily(equipment?.type);
    if (!equipmentId || !clientId || !family) return;
    checkmkControllerRef.current?.abort();
    const controller = createTrackedAbortController();
    checkmkControllerRef.current = controller;
    setLoadingCheckMK(true);
    try {
      const {
        startTime: availStart,
        endTime: availEnd
      } = getAvailabilityPeriodRange(checkmkAvailabilityPeriod);
      setCheckmkPeriod({
        startTime: availStart,
        endTime: availEnd
      });
      const fetchOptions = {
        signal: controller.signal
      };
      const syncPayload = {
        equipmentId,
        clientId,
        family,
        hostName: mapping.checkmk_host_name,
        site: mapping.checkmk_site || null,
        force,
        availabilityPeriod: checkmkAvailabilityPeriod
      };
      const stored = await getEquipmentCheckMKMonitoring(equipmentId, checkmkAvailabilityPeriod, fetchOptions).catch(e => e?.name === "AbortError" ? Promise.reject(e) : null);
      if (controller.signal.aborted) return;
      if (stored?.checkmkData) {
        applyCheckMKPayload(stored);
      }
      const shouldSync = force || !stored?.lastSyncedAt || Date.now() - new Date(stored.lastSyncedAt).getTime() >= CHECKMK_SYNC_MIN_INTERVAL_MS;
      if (shouldSync) {
        const synced = await syncEquipmentCheckMKMonitoring(syncPayload, fetchOptions).catch(e => e?.name === "AbortError" ? Promise.reject(e) : null);
        if (controller.signal.aborted) return;
        if (synced?.checkmkData) {
          applyCheckMKPayload(synced);
        }
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error("Error lors du loading des data CheckMK:", error);
    } finally {
      if (!controller.signal.aborted) setLoadingCheckMK(false);
    }
  };
  useEffect(() => {
    if (rightPanelTab !== "supervision" || !showSupervisionTab) return;
    if (checkmkData || loadingCheckMK) return;
    loadCheckMKData();
  }, [rightPanelTab, showSupervisionTab, checkmkData, loadingCheckMK]);
  const loadCheckMKAvailabilityOnly = async periodKey => {
    const mapping = checkmkMapping || equipment?.checkmkMapping;
    if (!mapping?.checkmk_host_name || !checkmkData) return;
    availabilityControllerRef.current?.abort();
    const controller = createTrackedAbortController();
    availabilityControllerRef.current = controller;
    setLoadingAvailability(true);
    try {
      const {
        startTime,
        endTime
      } = getAvailabilityPeriodRange(periodKey);
      setCheckmkPeriod({
        startTime,
        endTime
      });
      const equipmentId = getEquipmentDbIdLocal();
      let availability = null;
      if (equipmentId) {
        const stored = await getEquipmentCheckMKMonitoring(equipmentId, periodKey, {
          signal: controller.signal
        }).catch(() => null);
        if (controller.signal.aborted) return;
        availability = stored?.availabilityByPeriod?.[periodKey] ?? stored?.checkmkData?.availability ?? null;
      }
      if (!availability) {
        const availRes = await getCheckMKAvailability(mapping.checkmk_host_name, mapping.checkmk_site || null, startTime.toISOString(), endTime.toISOString(), {
          signal: controller.signal
        }).catch(() => null);
        availability = availRes?.availability ?? availRes ?? null;
      }
      if (controller.signal.aborted) return;
      const prevByPeriod = checkmkData?.availabilityByPeriod || {};
      const nextCheckmkData = checkmkData ? {
        ...checkmkData,
        availability,
        availabilityByPeriod: {
          ...prevByPeriod,
          [periodKey]: availability
        }
      } : checkmkData;
      setCheckmkData(nextCheckmkData);
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error("Error loading availability:", error);
    } finally {
      if (!controller.signal.aborted) setLoadingAvailability(false);
    }
  };
  const openCheckMKService = service => {
    const hostName = checkmkMapping?.checkmk_host_name;
    if (!hostName) return;
    const serviceDescription = service?.description || (service?.id && service.id.includes(':') ? service.id.split(':').slice(1).join(':') : null) || service?.title || service?.name || null;
    if (!serviceDescription) return;
    const baseUrl = 'https://monitoring.psi.fr/clients/check_mk/view.py';
    const params = new URLSearchParams({
      view_name: 'service',
      host: hostName,
      service: serviceDescription
    });
    window.open(`${baseUrl}?${params.toString()}`, '_blank', 'noopener');
  };
  const openCheckMKEvent = event => {
    const hostName = event?.host ?? event?.log_host ?? checkmkMapping?.checkmk_host_name;
    if (!hostName) return;
    const baseUrl = 'https://monitoring.psi.fr/clients/check_mk/view.py';
    const serviceDescription = event?.service ?? event?.log_service_description ?? null;
    if (serviceDescription) {
      const params = new URLSearchParams({
        view_name: 'service',
        host: hostName,
        service: serviceDescription
      });
      window.open(`${baseUrl}?${params.toString()}`, '_blank', 'noopener');
    } else {
      const params = new URLSearchParams({
        view_name: 'host',
        host: hostName
      });
      window.open(`${baseUrl}?${params.toString()}`, '_blank', 'noopener');
    }
  };
  const handleMappingSaved = mapping => {
    if (mapping?.checkmk_host_name) {
      const nextMapping = {
        is_active: true,
        ...mapping,
        checkmk_host_name: mapping.checkmk_host_name,
        checkmk_site: mapping.checkmk_site ?? null,
        checkmk_service_name: mapping.checkmk_service_name ?? null
      };
      setCheckmkMapping(nextMapping);
      if (onUpdate) {
        onUpdate({
          ...equipment,
          checkmkMapping: nextMapping
        });
      }
      setTimeout(() => {
        loadCheckMKData({
          force: true
        });
      }, 500);
    } else {
      setCheckmkMapping(null);
      setCheckmkData(null);
      if (onUpdate) {
        const {
          checkmkMapping: _removed,
          ...equipmentWithoutMapping
        } = equipment;
        onUpdate({
          ...equipmentWithoutMapping,
          checkmkMapping: null
        });
      }
    }
  };
  const getTypeIcon = type => {
    const icons = {
      'Servers': FaServer,
      'NAS': FaHdd,
      'Firewalls': FaShieldAlt,
      'Switch': FaNetworkWired,
      'BorneWifi': FaWifi,
      'Internet': FaGlobe
    };
    return icons[type] || FaServer;
  };
  const getStorageIcon = equipment => {
    const storageType = equipment?.rawData?.type || equipment?.type || '';
    const typeLower = storageType.toLowerCase();
    if (typeLower.includes('san')) {
      return 'mdi:server-network-outline';
    } else if (typeLower.includes('robot')) {
      return 'mdi:vhs';
    } else if (typeLower.includes('disque')) {
      return 'mdi:harddisk';
    } else {
      return 'mdi:nas';
    }
  };
  let TypeIcon = equipment ? getTypeIcon(equipment.type) : FaServer;
  let StorageIconName = null;
  if (equipment && equipment.type === 'NAS') {
    StorageIconName = getStorageIcon(equipment);
  } else if (equipment && equipment.type === 'Servers') {
    const serverType = equipment.typeServer || equipment.rawData?.type || '';
    if (serverType === 'virtuel' || serverType === 'Virtual') {
      TypeIcon = FaCube;
    } else {
      TypeIcon = FaServer;
    }
  }
  const storageTypeValue = (formData.type || equipment?.rawData?.type || equipment?.type || '').toString().toLowerCase();
  const isNasOrSanStorage = equipment?.type === 'NAS' && (storageTypeValue.includes('nas') || storageTypeValue.includes('san'));
  const isSynologyNasStorage = isNasOrSanStorage && isSynologyBrand(formData.manufacturer);
  const typeDisplayLabel = useMemo(() => getEquipmentDetailTypeLabel(equipment, locale), [equipment, locale]);
  const raidOptions = ["RAID 0", "RAID 1", "RAID 5", "RAID 6", "RAID 10", "RAID 50", "RAID 60", "SHR (Synology)", "SHR-2 (Synology)", "RAID F1", "Qtier (QNAP)", "RAID-TP (QNAP)", "RAID-Z (ZFS)", "RAID-Z2 (ZFS)", "RAID-Z3 (ZFS)", "Autre"];
  const lunRoleOptions = [{
    value: "stockage",
    label: "Storage"
  }, {
    value: "exploitation",
    label: "Exploitation"
  }];
  const internetCategorieOptions = ["Primary", "Backup"];
  const internetTypeOptions = ["Fibre", "ADSL", "SDSL", "VDSL", "4G", "5G", "Satellite", "Câble", "Radio", "SD-WAN", "Autre"];
  const nasRoleOptions = ["Storage de sauvegarde", "Storage de fichiers communs", "Storage principal", "Storage d'archivage", "Storage de réplication", "Autre"];
  const osOptions = ["Windows Server 2012 R2 Standard", "Windows Server 2012 R2 Datacenter", "Windows Server 2016 Standard", "Windows Server 2016 Datacenter", "Windows Server 2019 Standard", "Windows Server 2019 Datacenter", "Windows Server 2022 Standard", "Windows Server 2022 Datacenter", "Windows Server 2025 Standard", "Windows Server 2025 Datacenter", "Windows 10 Pro", "Windows 10 Enterprise", "Windows 11 Pro", "Windows 11 Enterprise", "Ubuntu Server 18.04 LTS", "Ubuntu Server 20.04 LTS", "Ubuntu Server 22.04 LTS", "Ubuntu Server 24.04 LTS", "Ubuntu Desktop 20.04 LTS", "Ubuntu Desktop 22.04 LTS", "Ubuntu Desktop 24.04 LTS", "Debian 10 (Buster)", "Debian 11 (Bullseye)", "Debian 12 (Bookworm)", "Debian 13 (Trixie)", "CentOS 6", "CentOS 7", "CentOS 8", "CentOS Stream 8", "CentOS Stream 9", "CentOS Stream 10", "Red Hat Enterprise Linux 6", "Red Hat Enterprise Linux 7", "Red Hat Enterprise Linux 8", "Red Hat Enterprise Linux 9", "Red Hat Enterprise Linux 10", "SUSE Linux Enterprise Server 12", "SUSE Linux Enterprise Server 15", "SUSE Linux Enterprise Server 16", "openSUSE Leap 15", "openSUSE Leap 16", "openSUSE Tumbleweed", "VMware ESXi 6.5", "VMware ESXi 6.7", "VMware ESXi 7.0", "VMware ESXi 8.0", "VMware ESXi 8.1", "VMware ESXi 8.2", "VMware vCenter Server 6.7", "VMware vCenter Server 7.0", "VMware vCenter Server 8.0", "Proxmox VE 6.x", "Proxmox VE 7.x", "Proxmox VE 8.x", "AlmaLinux 8", "AlmaLinux 9", "Rocky Linux 8", "Rocky Linux 9", "Oracle Linux 7", "Oracle Linux 8", "Oracle Linux 9", "Fedora Server 37", "Fedora Server 38", "Fedora Server 39", "Fedora Server 40", "FreeBSD 12", "FreeBSD 13", "FreeBSD 14", "TrueNAS Core", "TrueNAS Scale", "Citrix XenServer 7.1", "Citrix XenServer 8.0", "Citrix XenServer 8.2", "Microsoft Hyper-V Server 2019", "Microsoft Hyper-V Server 2022", "Autre"];
  const handleLogClick = log => {
    setSelectedLogDetail(log);
  };
  const closeLogModal = () => {
    setSelectedLogDetail(null);
  };
  const handleAddEquipmentTag = async ({
    label,
    color
  }) => {
    const trimmed = String(label || "").trim();
    if (!trimmed || !canManageEquipmentTags || addingEquipmentTag) return;
    setAddingEquipmentTag(true);
    try {
      const tag = await addEquipmentTag(equipmentDbId, equipmentClientId, {
        label: trimmed,
        color
      });
      setEquipmentTags(prev => {
        if (prev.some(t => t.id === tag.id)) return prev;
        return [...prev, tag].sort((a, b) => a.label.localeCompare(b.label));
      });
      setEquipmentTagModalOpen(false);
      toast.success(copy.toasts.tagAdded);
    } catch (error) {
      console.error("Error ajout tag device:", error);
      toast.error(error.message || copy.toasts.tagAddError);
    } finally {
      setAddingEquipmentTag(false);
    }
  };
  const handleRemoveEquipmentTag = async tagId => {
    if (!canManageEquipmentTags) return;
    try {
      await removeEquipmentTag(equipmentDbId, equipmentClientId, tagId);
      setEquipmentTags(prev => prev.filter(t => t.id !== tagId));
      toast.success(copy.toasts.tagRemoved);
    } catch (error) {
      console.error("Error suppression tag device:", error);
      toast.error(error.message || copy.toasts.tagRemoveError);
    }
  };
  const equipmentHeroTitle = equipment?.type === "Internet" ? formData.fournisseur && formData.internetType ? `${formData.fournisseur.toUpperCase()} ${formData.internetType.toUpperCase()}` : equipment.name : equipment?.name;
  const createdAtRaw = getEquipmentCreatedAt(equipment);
  const createdAtFormatted = createdAtRaw ? formatAlertSettingsDateTime(createdAtRaw, locale) : null;
  const createdAtLabel = createdAtFormatted && createdAtFormatted !== "-" ? interpolate(copy.hero.createdInVeritas, {
    date: createdAtFormatted
  }) : null;
  const equipmentIsActive = readEquipmentIsActive(equipment);
  const rmmStatusKey = showRmmHeroStatus ? getRmmAgentStatusKey(equipmentWithRmmLive) : null;
  const rmmStatusLabel = rmmStatusKey === "online" ? copy.agent.online : rmmStatusKey === "offline" ? copy.agent.offline : rmmStatusKey === "manual" ? copy.agent.manual : rmmStatusKey ? copy.agent.unknown : null;
  const showQuickConnectHero = Boolean(isSynologyNasStorage && formData.quickConnect);
  const showCheckmkHeroMenu = Boolean(checkmkIntegrationEnabled && equipment?.type !== "Internet");
  const showRmmHeroMenu = Boolean(rmmManaged && rmmAgentId);
  const hasHeroOverflowMenu = showRmmHeroMenu || showCheckmkHeroMenu;
  if (!equipment) {
    return <div className={styles.detailPage}>
        <div className={styles.error}>{copy.notFound}</div>
      </div>;
  }
  return <div className={`${enterpriseDetailStyles.contratDetailPage} ${enterpriseDetailStyles.enterpriseDetailPage} ${styles.equipmentDetailPage}`}>
      <header className={enterpriseDetailStyles.pageHero} data-guide="equipment-hero">
        <div className={enterpriseDetailStyles.heroRow}>
          <div className={enterpriseDetailStyles.heroMain}>
            <div className={enterpriseDetailStyles.heroAvatar}>
              {StorageIconName ? <Icon icon={StorageIconName} aria-hidden /> : <TypeIcon aria-hidden />}
            </div>
            <div className={enterpriseDetailStyles.heroText}>
              <h1 className={enterpriseDetailStyles.heroTitle}>
                <span>{equipmentHeroTitle}</span>
              </h1>
              <div className={`${enterpriseDetailStyles.heroMeta} ${styles.heroMetaPlain}`} aria-label={copy.hero.metaAria}>
                <span className={styles.heroMetaPlainItem}>{typeDisplayLabel}</span>
                <span className={`${styles.heroMetaPlainItem} ${equipmentIsActive ? styles.heroMetaStatusOnline : styles.heroMetaStatusOffline}`}>
                  {equipmentIsActive ? copy.hero.active : copy.hero.inactive}
                </span>
                {createdAtLabel ? <span className={styles.heroMetaPlainItem} title={copy.stats.createdInVeritas}>
                    {createdAtLabel}
                  </span> : null}
                {showRmmHeroStatus && rmmAgentVersion ? <span className={styles.heroMetaPlainItem} title={copy.agent.versionTitle}>
                    {interpolate(copy.agent.chip, {
                version: rmmAgentVersion
              })}
                  </span> : null}
                {showRmmHeroStatus && rmmStatusLabel ? <span className={`${styles.heroMetaPlainItem} ${rmmStatusKey === "online" ? styles.heroMetaStatusOnline : rmmStatusKey === "offline" ? styles.heroMetaStatusOffline : ""}`}>
                    {rmmStatusLabel}
                  </span> : null}
                {showRmmHeroStatus && rmmDeviceHealth ? <span className={styles.heroMetaPlainItem}>
                    {rmmDeviceHealth.grade} {rmmDeviceHealth.score}/100
                  </span> : null}
              </div>
              {showRmmHeroStatus ? <RmmCollectionStatusLine equipment={equipmentWithRmmLive} heartbeatIntervalMinutes={rmmHeartbeatMinutes} locale={locale} copy={copy} compact className={enterpriseDetailStyles.heroMetaItemRmm} /> : null}
            </div>
          </div>

          <div className={enterpriseDetailStyles.heroActions} ref={heroActionsMenuRef}>
            {rmmManaged && rmmSyncPending ? <RmmSyncPendingNotice variant="chip" equipment={equipment} syncRequestedAt={rmmSyncRequestedAt} heartbeatIntervalMinutes={rmmHeartbeatMinutes} /> : null}
            {rmmManaged && rmmUpdateRequestedAt ? <RmmAgentUpdateStatus equipment={equipment} requestedAt={rmmUpdateRequestedAt} currentVersion={rmmAgentVersion} targetVersion={rmmUpdateTargetVersion} heartbeatIntervalMinutes={rmmHeartbeatMinutes} onCancel={handleRmmCancelAgentUpdate} cancelling={rmmUpdateRequesting} /> : null}
            {remoteAccessAction ? <SmartTooltip content={remoteAccessAction.tooltip}>
                <EquipmentRemoteAccessLaunchButton variant="hero" label={remoteAccessAction.label} icon={remoteAccessAction.icon} title={remoteAccessAction.tooltip} onClick={remoteAccessAction.launch} />
              </SmartTooltip> : null}
            {showQuickConnectHero ? <SmartTooltip content={copy.hero.openQuickConnect}>
                <button type="button" className={`${enterpriseDetailStyles.heroMenuBtn} ${styles.heroQuickConnectBtn}`} onClick={() => {
              const url = buildQuickConnectUrl(formData.quickConnect);
              if (url) window.open(url, "_blank", "noopener,noreferrer");
            }} aria-label={copy.hero.openQuickConnect}>
                  <Icon icon="mdi:link-variant" aria-hidden />
                </button>
              </SmartTooltip> : null}
            <SmartTooltip content={isCommunity ? `${copy.hero.createEvent} (Pro)` : copy.hero.createEvent}>
              <button type="button" className={`${enterpriseDetailStyles.heroMenuBtn} ${styles.heroCreateEventBtn}`} onClick={openCreateEventModal} aria-label={copy.hero.createEvent}>
                <Icon icon="mdi:calendar-plus-outline" aria-hidden />
              </button>
            </SmartTooltip>
            <SubscribeBellButton
              entityType="equipment"
              entityId={equipmentDbId}
              subscribeLabel={copy.subscribe?.subscribe || "S’abonner aux notifications"}
              unsubscribeLabel={copy.subscribe?.unsubscribe || "Se désabonner"}
              subscribedToast={copy.subscribe?.subscribedToast || "Abonnement activé"}
              unsubscribedToast={copy.subscribe?.unsubscribedToast || "Abonnement retiré"}
            />
            {alertSettings.available ? <SmartTooltip content={interpolate(copy.hero.alertsTooltip, {
            status: alertSettings.loading ? "…" : alertSettings.statusLabel
          })}>
                <button type="button" className={`${enterpriseDetailStyles.heroMenuBtn} ${styles.heroAlertBtn} ${alertSettings.suspended ? styles.heroAlertBtnSuspended : alertSettings.alertsEnabled ? styles.heroAlertBtnActive : styles.heroAlertBtnDisabled}`} onClick={() => setAlertModalOpen(true)} aria-label={copy.hero.alertsAria}>
                  <Icon icon={alertSettings.suspended || !alertSettings.alertsEnabled ? "mdi:bell-off-outline" : "mdi:bell-ring-outline"} aria-hidden />
                </button>
              </SmartTooltip> : null}
            <SmartTooltip content={copy.hero.edit}>
              <button type="button" className={enterpriseDetailStyles.heroMenuBtn} onClick={openEditEquipmentModal} disabled={editModalOpening} aria-label={copy.hero.edit}>
                <Icon icon={editModalOpening ? "mdi:loading" : "mdi:pencil-outline"} className={editModalOpening ? styles.spinning : undefined} aria-hidden />
              </button>
            </SmartTooltip>
            {hasHeroOverflowMenu ? <SmartTooltip content={copy.hero.actionsTooltip}>
              <button type="button" className={enterpriseDetailStyles.heroMenuBtn} onClick={() => setHeroMenuOpen(open => !open)} aria-expanded={heroMenuOpen} aria-haspopup="menu" aria-label={copy.hero.actionsAria}>
                <Icon icon="mdi:dots-horizontal" aria-hidden />
              </button>
            </SmartTooltip> : null}
            {hasHeroOverflowMenu && heroMenuOpen ? <div className={enterpriseDetailStyles.heroClientMenu} role="menu">
                {showRmmHeroMenu ? rmmSyncPending ? <button type="button" className={enterpriseDetailStyles.heroMenuItem} role="menuitem" disabled={rmmSyncRequesting} onClick={handleRmmCancelSync}>
                      <Icon icon="mdi:sync-off" aria-hidden />
                      <span>{copy.hero.cancelFullSync}</span>
                    </button> : <button type="button" className={enterpriseDetailStyles.heroMenuItem} role="menuitem" disabled={rmmSyncRequesting} onClick={handleRmmFullSync}>
                      <Icon icon="mdi:sync" aria-hidden />
                      <span>{copy.hero.fullSync}</span>
                    </button> : null}
                {showRmmHeroMenu ? rmmUpdateRequestedAt ? <button type="button" className={enterpriseDetailStyles.heroMenuItem} role="menuitem" disabled={rmmUpdateRequesting} onClick={handleRmmCancelAgentUpdate}>
                      <Icon icon="mdi:cloud-download-off-outline" aria-hidden />
                      <span>{copy.hero.cancelAgentUpdate}</span>
                    </button> : <button type="button" className={enterpriseDetailStyles.heroMenuItem} role="menuitem" disabled={rmmUpdateRequesting} onClick={handleRmmAgentUpdate}>
                      <Icon icon="mdi:cloud-download-outline" aria-hidden />
                      <span>{copy.hero.updateAgent}</span>
                    </button> : null}
                {showCheckmkHeroMenu ? <>
                    {showRmmHeroMenu ? <div className={enterpriseDetailStyles.heroMenuDivider} role="separator" /> : null}
                    <button type="button" className={enterpriseDetailStyles.heroMenuItem} role="menuitem" disabled={!checkmkMapping?.checkmk_host_name || loadingCheckMK} onClick={() => {
                setHeroMenuOpen(false);
                loadCheckMKData({
                  force: true
                });
              }}>
                      <Icon icon="mdi:sync" aria-hidden />
                      <span>{copy.hero.refreshCheckmk}</span>
                    </button>
                    <button type="button" className={enterpriseDetailStyles.heroMenuItem} role="menuitem" onClick={() => {
                setHeroMenuOpen(false);
                setCheckmkMappingModal(true);
              }}>
                      <Icon icon="simple-icons:checkmk" aria-hidden />
                      <span>{checkmkMapping?.checkmk_host_name ? copy.hero.mappingCheckmk : copy.hero.mapCheckmk}</span>
                    </button>
                  </> : null}
              </div> : null}
          </div>
        </div>
      </header>

      <div className={styles.shell}>
        <nav className={styles.tabBar} aria-label={copy.tabs.aria}>
          <button type="button" className={`${styles.tabBtn} ${rightPanelTab === 'dashboard' ? styles.tabBtnActive : ''}`} onClick={() => setRightPanelTab('dashboard')}>
            <Icon icon="mdi:view-dashboard-outline" />
            {copy.tabs.general}
          </button>
          {showRmmOperationsTab ? <button type="button" className={`${styles.tabBtn} ${rightPanelTab === 'operations' ? styles.tabBtnActive : ''}`} onClick={() => setRightPanelTab('operations')}>
              <Icon icon="mdi:shield-lock-outline" />
              {copy.tabs.cybersecurity || copy.tabs.system}
            </button> : null}
          {showRmmPeripheralsTab ? <button type="button" className={`${styles.tabBtn} ${rightPanelTab === 'peripherals' ? styles.tabBtnActive : ''}`} onClick={() => setRightPanelTab('peripherals')}>
              <Icon icon="mdi:package-variant-closed" />
              {copy.tabs.inventory || copy.tabs.peripherals}
            </button> : null}
          {showSupervisionTab ? <button type="button" className={`${styles.tabBtn} ${rightPanelTab === 'supervision' ? styles.tabBtnActive : ''}`} onClick={() => setRightPanelTab('supervision')}>
              <Icon icon="mdi:radar" />
              {copy.tabs.supervision}
            </button> : null}
          <button type="button" className={`${styles.tabBtn} ${rightPanelTab === 'activity' || rightPanelTab === 'events' || rightPanelTab === 'stats' || rightPanelTab === 'metrics' ? styles.tabBtnActive : ''}`} onClick={() => openActivityTab()}>
            <Icon icon="mdi:chart-timeline-variant" />
            {copy.tabs.activity}
          </button>
          <button type="button" className={`${styles.tabBtn} ${rightPanelTab === 'documents' ? styles.tabBtnActive : ''}`} onClick={() => setRightPanelTab('documents')}>
            <Icon icon="mdi:file-document-outline" />
            {copy.tabs.documents}
          </button>
          <button type="button" className={`${styles.tabBtn} ${rightPanelTab === 'notes' ? styles.tabBtnActive : ''}`} onClick={() => setRightPanelTab('notes')}>
            <Icon icon="mdi:note-text-outline" />
            {copy.tabs.notes}
          </button>
          <button type="button" className={`${styles.tabBtn} ${rightPanelTab === 'logs' ? styles.tabBtnActive : ''}`} onClick={() => setRightPanelTab('logs')}>
            <Icon icon="mdi:history" />
            {copy.tabs.logs}
          </button>
        </nav>

        {rmmManaged && rmmSyncPending ? <RmmSyncPendingNotice equipment={equipment} syncRequestedAt={rmmSyncRequestedAt} heartbeatIntervalMinutes={rmmHeartbeatMinutes} onCancel={handleRmmCancelSync} cancelling={rmmSyncRequesting} /> : null}

        <div className={styles.mainContent}>
          {rightPanelTab === 'dashboard' && <div className={`${styles.dashboardSplit} ${showRmmHeroStatus && rmmDeviceHealth ? "" : styles.dashboardSplitSolo}`.trim()}>
              <div className={styles.dashboardMain}>
                <EquipmentDetailSpecsPanel equipment={equipment} formData={formData} clientSites={clientSites} clientSsids={clientSsids} peerFirewalls={peerFirewalls} peerServers={peerServers} peerStorage={peerStorage} onOpenEquipment={openLinkedEquipment} remoteAccessAction={remoteAccessAction} />

                <EquipmentAlertsGlance equipment={equipment} days={30} limit={50} />

                {equipment.type === 'Ordinateurs' && <RmmMonitoringPanel equipment={equipmentWithRmmLive} syncPending={rmmSyncPending} syncRequestedAt={rmmSyncRequestedAt} heartbeatIntervalMinutes={rmmHeartbeatMinutes} variant="general" agentStatusInHero={showRmmHeroStatus} />}
              </div>
              {showRmmHeroStatus && rmmDeviceHealth ? <div className={styles.dashboardAside}>
                <ScoreAside health={rmmDeviceHealth} copy={{
              scoreTitle: copy.rmm.overview?.scoreTitle || copy.rmm.cyber?.scoreTitle
            }} />
              </div> : null}
            </div>}

          {rightPanelTab === "supervision" && showSupervisionTab ? <section className={enterpriseDetailStyles.panel}>
              <header className={specsStyles.panelHeader}>
                <div>
                  <h2 className={specsStyles.panelTitle}>
                    <Icon icon="mdi:radar" className={specsStyles.panelTitleIcon} aria-hidden />
                    {copy.tabs.supervision}
                  </h2>
                  <p className={specsStyles.panelSubtitle}>
                    {checkmkMapping?.checkmk_host_name || "CheckMK"}
                    {checkmkLastSyncedAt ? ` · ${formatEquipmentDetailRelative(checkmkLastSyncedAt, locale) || checkmkLastSyncedAt}` : ""}
                  </p>
                </div>
                <div className={styles.supervisionToolbarActions}>
                  <button type="button" className={styles.supervisionActionBtn} disabled={loadingCheckMK} onClick={() => loadCheckMKData({
              force: true
            })}>
                    <Icon icon="mdi:refresh" aria-hidden />
                    {copy.hero?.refreshCheckmk || "Refresh"}
                  </button>
                  <button type="button" className={styles.supervisionActionBtn} onClick={() => setCheckmkMappingModal(true)}>
                    <Icon icon="simple-icons:checkmk" aria-hidden />
                    {copy.hero?.mappingCheckmk || "Mapping"}
                  </button>
                </div>
              </header>
              <div className={`${enterpriseDetailStyles.panelBody} ${styles.supervisionPanelBody}`}>
                <CheckMKMonitoringPanel equipment={equipment} checkmkMapping={checkmkMapping} checkmkData={checkmkData} checkmkHostDetails={checkmkHostDetails} loadingCheckMK={loadingCheckMK} loadingAvailability={loadingAvailability} checkmkAvailabilityPeriod={checkmkAvailabilityPeriod} layout="tab" onAvailabilityPeriodChange={period => {
              setCheckmkAvailabilityPeriod(period);
              loadCheckMKAvailabilityOnly(period);
            }} onOpenService={openCheckMKService} onOpenEvent={openCheckMKEvent} onOpenMapping={() => setCheckmkMappingModal(true)} />
              </div>
            </section> : null}

          {(rightPanelTab === 'activity' || rightPanelTab === 'events' || rightPanelTab === 'stats' || rightPanelTab === 'metrics') && <div className={styles.activityStack}>
              {showRmmMetricsTab ? <div className={styles.activitySwitch} role="tablist" aria-label={copy.activityPane?.aria || copy.tabs.activity}>
                  <button type="button" role="tab" aria-selected={activityPane === "metrics"} className={`${styles.activitySwitchBtn} ${activityPane === "metrics" ? styles.activitySwitchBtnActive : ""}`} onClick={() => setActivityPane("metrics")}>
                    <Icon icon="mdi:chart-areaspline" aria-hidden />
                    {copy.activityPane?.metrics || copy.tabs.metrics}
                  </button>
                  <button type="button" role="tab" aria-selected={activityPane === "veritas"} className={`${styles.activitySwitchBtn} ${activityPane === "veritas" ? styles.activitySwitchBtnActive : ""}`} onClick={() => setActivityPane("veritas")}>
                    <Icon icon="mdi:ticket-confirmation-outline" aria-hidden />
                    {copy.activityPane?.veritas || "Veritas"}
                  </button>
                </div> : null}

              {showRmmMetricsTab && activityPane === "metrics" ? rmmMetricsAgent ? <RmmMetricHistoryPanel agent={rmmMetricsAgent} active={rightPanelTab === "activity" || rightPanelTab === "metrics"} embedded /> : <div className={styles.emptyState}>
                  <Icon icon="mdi:chart-timeline-variant" className={styles.emptyIcon} />
                  <h5>{copy.metrics.unavailableTitle}</h5>
                  <p className={styles.emptyHint}>
                    {copy.metrics.unavailableHint}
                  </p>
                </div> : <>
                  <EquipmentStatsPanel copy={copy} locale={locale} equipment={equipment} loading={loadingActivity} activity={activity} datePreset={activityDatePreset} onDatePresetChange={setActivityDatePreset} customStart={activityCustomStart} customEnd={activityCustomEnd} onCustomStartChange={setActivityCustomStart} onCustomEndChange={setActivityCustomEnd} alertSettings={alertSettings} rmmManaged={rmmManaged} />
                  <EquipmentEventsPanel copy={copy} locale={locale} loading={loadingActivity} activity={activity} datePreset={activityDatePreset} onDatePresetChange={setActivityDatePreset} customStart={activityCustomStart} customEnd={activityCustomEnd} onCustomStartChange={setActivityCustomStart} onCustomEndChange={setActivityCustomEnd} onCreateEvent={openCreateEventModal} onOpenPlanningEvent={handleOpenPlanningEvent} onOpenTicket={handleOpenLinkedTicket} isCommunity={isCommunity} proBadge={<ProFeatureBadge variant="inline" className={styles.proBadgeInline} />} hideDateFilter />
                </>}
            </div>}

          {}
          {rightPanelTab === 'documents' && <section className={enterpriseDetailStyles.panel}>
              <header className={specsStyles.panelHeader}>
                <div>
                  <h2 className={specsStyles.panelTitle}>
                    <Icon icon="mdi:file-document-multiple-outline" className={specsStyles.panelTitleIcon} aria-hidden />
                    {copy.tabs.documents}
                  </h2>
                  <p className={specsStyles.panelSubtitle}>{copy.documents.subtitle}</p>
                </div>
              </header>
              <div className={enterpriseDetailStyles.panelBody}>
                <EquipmentDocumentsPanel equipment={equipment} embedded />
              </div>
            </section>}

          {rightPanelTab === "notes" && <section className={enterpriseDetailStyles.panel}>
              <header className={specsStyles.panelHeader}>
                <div>
                  <h2 className={specsStyles.panelTitle}>
                    <Icon icon="mdi:note-text-outline" className={specsStyles.panelTitleIcon} aria-hidden />
                    {copy.tabs.notes}
                  </h2>
                  <p className={specsStyles.panelSubtitle}>{copy.notes.subtitle}</p>
                </div>
              </header>
              <div className={enterpriseDetailStyles.panelBody}>
                <EquipmentNotesPanel equipment={equipment} embedded />
              </div>
            </section>}

          {rightPanelTab === "peripherals" && showRmmPeripheralsTab ? <RmmMonitoringPanel equipment={equipment} heartbeatIntervalMinutes={rmmHeartbeatMinutes} variant="peripherals" agentStatusInHero={showRmmHeroStatus} /> : null}

          {rightPanelTab === "operations" && showRmmOperationsTab ? <div className={styles.dashboardSplit}>
              <div className={styles.dashboardMain}>
                <RmmMonitoringPanel equipment={equipmentWithRmmLive} syncPending={rmmSyncPending} syncRequestedAt={rmmSyncRequestedAt} heartbeatIntervalMinutes={rmmHeartbeatMinutes} variant="operations" agentStatusInHero={showRmmHeroStatus} />
              </div>
              <div className={styles.dashboardAside}>
                {showRmmHeroStatus && rmmDeviceHealth ? <ScoreAside health={rmmDeviceHealth} copy={{
              scoreTitle: copy.rmm.overview?.scoreTitle || copy.rmm.cyber?.scoreTitle
            }} /> : null}
              </div>
            </div> : null}

          {}
          {rightPanelTab === 'logs' && <section className={enterpriseDetailStyles.panel}>
              <header className={enterpriseDetailStyles.panelHeader}>
                <div className={enterpriseDetailStyles.panelHeaderMain}>
                  <h2 className={enterpriseDetailStyles.panelTitle}>{copy.logs.title}</h2>
                </div>
                <div className={styles.logsHeaderActions}>
                  <button type="button" className={styles.logsPurgeBtn} onClick={() => setPurgeLogsConfirmOpen(true)} disabled={loadingLogs || purgingLogs || logsTotal === 0} title={copy.logs.purgeTitle}>
                    <Icon icon="mdi:delete-sweep" aria-hidden />
                    {copy.logs.purge}
                  </button>
                </div>
              </header>
              <div className={enterpriseDetailStyles.panelBody}>
                <div className={styles.logsToolbar}>
                  <div className={styles.logsSearchWrap}>
                    <Icon icon="mdi:magnify" className={styles.logsSearchIcon} aria-hidden />
                    <input type="search" className={styles.logsSearchInput} value={logsSearchDraft} onChange={event => setLogsSearchDraft(event.target.value)} placeholder={copy.logs.searchPlaceholder} aria-label={copy.logs.searchAria} />
                    {logsSearchDraft ? <button type="button" className={styles.logsSearchClear} onClick={() => setLogsSearchDraft("")} aria-label={copy.logs.clearSearch}>
                        <Icon icon="mdi:close" aria-hidden />
                      </button> : null}
                  </div>
                  <label className={styles.logsFilterLabel}>
                    <span className={styles.logsFilterLabelText}>{copy.logs.filterType}</span>
                    <select className={styles.logsFilterSelect} value={logsCategory} onChange={event => setLogsCategory(event.target.value)} aria-label={copy.logs.filterAria}>
                      {LOG_FILTER_OPTIONS.map(option => <option key={option.value} value={option.value}>
                          {option.label}
                        </option>)}
                    </select>
                  </label>
                </div>
                {loadingLogs ? <div className={styles.loadingState}>{copy.loading}</div> : logs.length === 0 ? <div className={styles.emptyState}>
                    <Icon icon="mdi:history" className={styles.emptyIcon} />
                    <h5>{logsFiltersActive ? copy.logs.emptyFiltered : copy.logs.empty}</h5>
                    <p className={styles.emptyHint}>
                      {logsFiltersActive ? copy.logs.emptyFilteredHint : copy.logs.emptyHint}
                    </p>
                  </div> : <>
                    <div className={enterpriseDetailStyles.dataTableWrapper}>
                      <table className={enterpriseDetailStyles.dataTable}>
                        <thead>
                          <tr>
                            <th>{copy.logs.colAction}</th>
                            <th>{copy.logs.colUser}</th>
                            <th>{copy.logs.colDate}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {logs.map((log, index) => {
                      const logMeta = getLogActionDetails(log);
                      const logUser = log.user_name || log.user || copy.logs.systemUser;
                      return <tr key={log.id || index} className={enterpriseDetailStyles.dataTableRowClickable} onClick={() => handleLogClick(log)} title={copy.logs.detailTitle}>
                                <td>
                                  <span className={styles.logActionInline} style={{
                            color: logMeta.color
                          }}>
                                    <Icon icon={logMeta.icon} aria-hidden />
                                    {log.action || logMeta.label}
                                  </span>
                                </td>
                                <td>{logUser}</td>
                                <td className={styles.eventMetaCell}>
                                  {log.created_at || log.timestamp ? new Date(log.created_at || log.timestamp).toLocaleString({
                            fr: "en-US",
                            en: "en-GB",
                            de: "de-DE",
                            it: "it-IT",
                            es: "es-ES"
                          }[locale] || "en-US", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          }) : "-"}
                                </td>
                              </tr>;
                    })}
                        </tbody>
                      </table>
                    </div>
                    {logsTotal > logsLimit && <div className={styles.pagination}>
                        <button className={styles.paginationButton} onClick={() => loadLogs(logsPage - 1)} disabled={logsPage <= 1 || loadingLogs}>
                          <Icon icon="mdi:chevron-left" />
                        </button>
                        <span className={styles.paginationInfo}>
                          {interpolate(copy.logs.pagination, {
                    page: logsPage,
                    pages: Math.ceil(logsTotal / logsLimit),
                    total: logsTotal
                  })}
                        </span>
                        <button className={styles.paginationButton} onClick={() => loadLogs(logsPage + 1)} disabled={logsPage >= Math.ceil(logsTotal / logsLimit) || loadingLogs}>
                          <Icon icon="mdi:chevron-right" />
                        </button>
                      </div>}
                  </>}
              </div>
            </section>}
        </div>
      </div>

      {}
      {photoModalOpen && <div className={styles.modalOverlay} onClick={() => setPhotoModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <FaCamera className={styles.modalIcon} />
                Ajout de photo
              </h2>
              <button className={styles.modalCloseButton} onClick={() => setPhotoModalOpen(false)} title="Close">
                <FaTimes />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.comingSoonMessage}>
                <Icon icon="mdi:clock-outline" width={48} height={48} className={styles.comingSoonIcon} />
                <h3>Feature coming soon</h3>
                <p>
                  Soon, you will be able to add photos to your equipment to:
                </p>
                <ul className={styles.comingSoonList}>
                  <li>Document the physical condition of equipment</li>
                  <li>Save photos before and after interventions</li>
                  <li>Create a visual history of your equipment</li>
                  <li>Et bien plus encore...</li>
                </ul>
                <p className={styles.comingSoonNote}>
                  This feature will keep a visual record of all your equipment and its changes.
                </p>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.modalOkButton} onClick={() => setPhotoModalOpen(false)}>
                Compris
              </button>
            </div>
          </div>
        </div>}

      {}
      {checkmkIntegrationEnabled && checkmkMappingModal && equipment && <CheckMKMappingModal isOpen={checkmkMappingModal} onClose={() => setCheckmkMappingModal(false)} equipment={{
      id: equipment.rawData?.id || equipment.id,
      name: equipment.name || equipment.nom,
      nom: equipment.nom || equipment.name,
      clientName: equipment.clientName,
      clientId: equipment.clientId,
      type: equipment.type,
      checkmkMapping: checkmkMapping || equipment.checkmkMapping
    }} onMappingSaved={handleMappingSaved} />}

      {}
      {checkmkDebugModal && checkmkData && <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
          <div style={{
        backgroundColor: 'var(--bg-secondary, #1a1a2e)',
        borderRadius: '0.5rem',
        padding: '2rem',
        maxWidth: '90vw',
        maxHeight: '90vh',
        overflow: 'auto',
        border: '1px solid var(--border-primary, #2a2a4a)',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
      }}>
            <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
              <h2 style={{
            color: 'var(--text-primary, #f9fafb)',
            margin: 0
          }}>Raw CheckMK data</h2>
              <button onClick={() => setCheckmkDebugModal(false)} style={{
            backgroundColor: 'var(--bg-tertiary, #1e1e3f)',
            border: '1px solid var(--border-primary, #2a2a4a)',
            color: 'var(--text-primary, #f9fafb)',
            borderRadius: '0.375rem',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontSize: '1rem'
          }}>
                Close
              </button>
            </div>
            <pre style={{
          backgroundColor: 'var(--bg-tertiary, #1e1e3f)',
          padding: '1rem',
          borderRadius: '0.375rem',
          overflow: 'auto',
          maxHeight: '70vh',
          color: 'var(--text-primary, #f9fafb)',
          fontSize: '0.875rem',
          fontFamily: 'monospace'
        }}>
              {(() => {
            const maxServices = 200;
            const maxEvents = 200;
            const allServices = checkmkData.services?.services || [];
            const allEvents = checkmkData.events?.events || [];
            const payload = {
              hostDetails: {
                ...checkmkHostDetails,
                raw: checkmkHostDetails?.raw,
                statusRaw: checkmkHostDetails?.statusRaw
              },
              services: {
                count: allServices.length,
                truncated: allServices.length > maxServices,
                services: allServices.slice(0, maxServices)
              },
              availability: checkmkData.availability,
              events: {
                totalCount: checkmkData.events?.events_count,
                count: allEvents.length,
                truncated: allEvents.length > maxEvents,
                allEvents: allEvents.slice(0, maxEvents),
                debug: checkmkData.events?.debug
              },
              period: checkmkData.events?.period,
              hostEventsDetailed: checkmkData.hostEventsDetailed
            };
            return JSON.stringify(payload, null, 2);
          })()}
            </pre>
          </div>
        </div>}

      {}
      {lunsModalOpen && equipment?.type === 'NAS' && <div className={styles.modalOverlay} onClick={() => setLunsModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{
        maxWidth: '560px'
      }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <Icon icon="mdi:harddisk-multiple" className={styles.modalIcon} />
                Manage LUNs
              </h2>
              <button className={styles.modalCloseButton} onClick={() => setLunsModalOpen(false)} title="Close">
                <FaTimes />
              </button>
            </div>
            <div className={styles.modalBody} style={{
          maxHeight: '60vh',
          overflowY: 'auto'
        }}>
              {formData.luns && Array.isArray(formData.luns) && formData.luns.length > 0 ? <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
                  {formData.luns.map((lun, lunIndex) => <div key={lunIndex} style={{
              display: 'grid',
              gridTemplateColumns: '1fr 80px minmax(100px, 1fr) auto',
              gap: '0.5rem',
              alignItems: 'end',
              padding: '0.5rem',
              background: 'var(--bg-tertiary, #f3f4f6)',
              borderRadius: 6
            }}>
                      <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}>
                        <span style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-secondary, #6b7280)'
                }}>Name</span>
                        <input type="text" className={styles.fieldInput} value={lun.nom || lun.iqn || ''} onChange={e => {
                  const luns = [...(formData.luns || [])];
                  luns[lunIndex] = {
                    ...luns[lunIndex],
                    nom: e.target.value,
                    iqn: e.target.value
                  };
                  updateFormDataWithChanges({
                    ...formData,
                    luns
                  });
                }} placeholder="Name or IQN" />
                      </div>
                      <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}>
                        <span style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-secondary, #6b7280)'
                }}>Capacity (GB)</span>
                        <input type="text" inputMode="numeric" className={styles.fieldInput} value={lun.capacite ?? ''} onChange={e => {
                  const luns = [...(formData.luns || [])];
                  luns[lunIndex] = {
                    ...luns[lunIndex],
                    capacite: e.target.value
                  };
                  updateFormDataWithChanges({
                    ...formData,
                    luns
                  });
                }} />
                      </div>
                      <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}>
                        <span style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-secondary, #6b7280)'
                }}>Role</span>
                        <select className={styles.fieldInput} value={lun.role || 'stockage'} onChange={e => {
                  const luns = [...(formData.luns || [])];
                  luns[lunIndex] = {
                    ...luns[lunIndex],
                    role: e.target.value
                  };
                  updateFormDataWithChanges({
                    ...formData,
                    luns
                  });
                }}>
                          {lunRoleOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                      <button type="button" onClick={() => {
                const luns = (formData.luns || []).filter((_, i) => i !== lunIndex);
                updateFormDataWithChanges({
                  ...formData,
                  luns
                });
              }} title="Delete this LUN" style={{
                minWidth: 32,
                height: 32,
                padding: 0,
                border: 'none',
                background: 'transparent',
                color: '#ef4444',
                cursor: 'pointer',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                        <Icon icon="mdi:delete" width={18} height={18} />
                      </button>
                    </div>)}
                  <button type="button" onClick={() => {
              const luns = [...(formData.luns || []), {
                nom: '',
                iqn: '',
                capacite: '',
                role: 'stockage'
              }];
              updateFormDataWithChanges({
                ...formData,
                luns
              });
            }} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              padding: '0.5rem',
              background: 'transparent',
              border: '1px dashed #d1d5db',
              borderRadius: 6,
              cursor: 'pointer',
              color: '#6b7280',
              fontSize: '0.85rem'
            }}>
                    <Icon icon="mdi:plus" width={18} height={18} /> Add a LUN
                  </button>
                </div> : <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
                  <span className={styles.sidebarSummaryValueSecondary} style={{
              fontSize: '0.9rem'
            }}>No LUN configured.</span>
                  <button type="button" onClick={() => {
              const luns = [{
                nom: '',
                iqn: '',
                capacite: '',
                role: 'stockage'
              }];
              updateFormDataWithChanges({
                ...formData,
                luns
              });
            }} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              padding: '0.5rem',
              background: 'transparent',
              border: '1px dashed #d1d5db',
              borderRadius: 6,
              cursor: 'pointer',
              color: '#6b7280',
              fontSize: '0.85rem'
            }}>
                    <Icon icon="mdi:plus" width={18} height={18} /> Add a LUN
                  </button>
                </div>}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.modalOkButton} onClick={() => setLunsModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>}

      {}
      {licencesModalOpen && equipment?.type === 'Firewalls' && <div className={styles.modalOverlay} onClick={() => setLicensesModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{
        maxWidth: '560px'
      }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <Icon icon="mdi:license" className={styles.modalIcon} />
                Manage licenses
              </h2>
              <button className={styles.modalCloseButton} onClick={() => setLicensesModalOpen(false)} title="Close">
                <FaTimes />
              </button>
            </div>
            <div className={styles.modalBody} style={{
          maxHeight: '60vh',
          overflowY: 'auto'
        }}>
              {formData.licences && Array.isArray(formData.licences) && formData.licences.length > 0 ? <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
                  {formData.licences.map((lic, licIndex) => <div key={licIndex} style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr minmax(100px, 1fr) auto',
              gap: '0.5rem',
              alignItems: 'end',
              padding: '0.5rem',
              background: 'var(--bg-tertiary, #f3f4f6)',
              borderRadius: 6
            }}>
                      <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}>
                        <span style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-secondary, #6b7280)'
                }}>Name</span>
                        <input type="text" className={styles.fieldInput} value={lic.nom || ''} onChange={e => {
                  const licences = [...(formData.licences || [])];
                  licences[licIndex] = {
                    ...licences[licIndex],
                    nom: e.target.value
                  };
                  updateFormDataWithChanges({
                    ...formData,
                    licences
                  });
                }} placeholder="License name" />
                      </div>
                      <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}>
                        <span style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-secondary, #6b7280)'
                }}>Type</span>
                        <input type="text" className={styles.fieldInput} value={lic.type || ''} onChange={e => {
                  const licences = [...(formData.licences || [])];
                  licences[licIndex] = {
                    ...licences[licIndex],
                    type: e.target.value
                  };
                  updateFormDataWithChanges({
                    ...formData,
                    licences
                  });
                }} placeholder="Type" />
                      </div>
                      <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}>
                        <span style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-secondary, #6b7280)'
                }}>Expiration</span>
                        <input type="date" className={styles.fieldInput} value={lic.expiration || ''} onChange={e => {
                  const licences = [...(formData.licences || [])];
                  licences[licIndex] = {
                    ...licences[licIndex],
                    expiration: e.target.value
                  };
                  updateFormDataWithChanges({
                    ...formData,
                    licences
                  });
                }} />
                      </div>
                      <button type="button" onClick={() => {
                const licences = (formData.licences || []).filter((_, i) => i !== licIndex);
                updateFormDataWithChanges({
                  ...formData,
                  licences
                });
              }} title="Delete this license" style={{
                minWidth: 32,
                height: 32,
                padding: 0,
                border: 'none',
                background: 'transparent',
                color: '#ef4444',
                cursor: 'pointer',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                        <Icon icon="mdi:delete" width={18} height={18} />
                      </button>
                    </div>)}
                  <button type="button" onClick={() => {
              const licences = [...(formData.licences || []), {
                nom: '',
                type: '',
                expiration: ''
              }];
              updateFormDataWithChanges({
                ...formData,
                licences
              });
            }} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              padding: '0.5rem',
              background: 'transparent',
              border: '1px dashed #d1d5db',
              borderRadius: 6,
              cursor: 'pointer',
              color: '#6b7280',
              fontSize: '0.85rem'
            }}>
                    <Icon icon="mdi:plus" width={18} height={18} /> Add a license
                  </button>
                </div> : <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
                  <span className={styles.sidebarSummaryValueSecondary} style={{
              fontSize: '0.9rem'
            }}>No license configured.</span>
                  <button type="button" onClick={() => {
              const licences = [{
                nom: '',
                type: '',
                expiration: ''
              }];
              updateFormDataWithChanges({
                ...formData,
                licences
              });
            }} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              padding: '0.5rem',
              background: 'transparent',
              border: '1px dashed #d1d5db',
              borderRadius: 6,
              cursor: 'pointer',
              color: '#6b7280',
              fontSize: '0.85rem'
            }}>
                    <Icon icon="mdi:plus" width={18} height={18} /> Add a license
                  </button>
                </div>}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.modalOkButton} onClick={() => setLicensesModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>}

      {}
      <PlanningEventModalBridge open={eventModalOpen} editingEvent={editingEvent} initialClientId={equipment?.clientId || null} initialClientName={equipment?.clientName || ""} initialEquipmentId={getEquipmentDbIdLocal() || equipment?.id || (equipment?.type && equipment?.name ? `${equipment.type}-${equipment.name}` : null)} onClose={() => {
      setEventModalOpen(false);
      setEditingEvent(null);
    }} onSaved={refreshActivityAfterEventChange} />

      <EquipmentLogDetailModal log={selectedLogDetail} onClose={closeLogModal} />

      <ConfirmModal open={purgeLogsConfirmOpen} onClose={() => {
      if (purgingLogs) return;
      setPurgeLogsConfirmOpen(false);
    }} onConfirm={handlePurgeLogs} title={modalsCopy.confirm?.purgeLogs?.title} message={purgeLogsMessage} icon="mdi:delete-sweep" confirmLabel={modalsCopy.confirm?.purgeLogs?.confirm} confirmVariant="dangerSolid" confirmLoading={purgingLogs} />

      {editModalOpen && modalClient ? <EquipmentFormModal open={editModalOpen} onClose={() => setEditModalOpen(false)} client={modalClient} equipment={equipment} moduleKey={equipmentModuleKey || equipment?.type || "Servers"} mode="edit" peerFirewalls={peerFirewalls} peerServers={peerServers} peerStorage={peerStorage} peerBorneWifi={peerBorneWifi} onSaved={handleEquipmentModalSaved} onDeleted={handleEquipmentModalDeleted} /> : null}

      <CustomEquipmentModal
        isOpen={Boolean(customEditFamily)}
        onClose={() => setCustomEditFamily(null)}
        family={customEditFamily}
        item={customEditItem}
        client={modalClient}
        clientId={getEquipmentClientId(equipment)}
        onRefresh={handleCustomEquipmentRefresh}
      />

      <EquipmentAlertSuspensionModal open={alertModalOpen} onClose={() => setAlertModalOpen(false)} equipment={equipment} onNavigate={onNavigate} alert={alertSettings} />

      <ClientTagModal open={equipmentTagModalOpen} entityKind="equipment" entityName={equipmentHeroTitle || equipment?.name || ""} assignedTags={equipmentTags} saving={addingEquipmentTag} onClose={() => {
      if (addingEquipmentTag) return;
      setEquipmentTagModalOpen(false);
    }} onSubmit={handleAddEquipmentTag} />

      <ProFeaturePromoModal open={Boolean(proPromoFeature)} featureKey={proPromoFeature} onClose={() => setProPromoFeature(null)} />
    </div>;
}
