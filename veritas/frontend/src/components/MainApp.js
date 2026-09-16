import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Sidebar from "../components/Misc/Sidebar/Sidebar";
import TabsBar from "../components/Misc/TabsBar/TabsBar";
import HomePage from "../components/HomePage/HomePage";
import EquipmentPage from "../components/EquipementPage/EquipmentPage";
import EquipmentDetailPage from "../components/EquipementPage/EquipmentDetailPage";
import JobDetailPage from "../components/EquipementPage/JobDetailPage";
import CybersecuritePage from "../components/CybersecuritePage/CybersecuritePage";
import CampaignDetailPage from "../components/CybersecuritePage/CampaignDetailPage";
import AntivirusDetailPage from "../components/CybersecuritePage/AntivirusDetailPage";
import AntispamDetailPage from "../components/CybersecuritePage/AntispamDetailPage";
import TenantDetailPage from "../components/ServicePage/TenantDetailPage";
import ServicePage from "../components/ServicePage/ServicePage";
import PlanningPage from "../components/PlanningPage/PlanningPage";
import TicketPage from "../components/TicketPage/TicketPage";
import TicketCreatePage from "../components/TicketPage/TicketCreatePage";
import TicketSalesPage from "../components/TicketPage/TicketSalesPage";
import TicketSalesCreatePage from "../components/TicketPage/TicketSalesCreatePage";
import TicketSalesDetailPage from "../components/TicketPage/TicketSalesDetailPage";
import TicketDetailPage from "../components/TicketPage/TicketDetailPage";
import EnterprisesPage from "../components/EnterprisesPage/EnterprisesPage";
import EnterpriseDetailPage from "../components/EnterprisesPage/EnterpriseDetailPage";
import ComputerFleetStatsPage from "../components/EnterprisesPage/ComputerFleetStatsPage";
import { generateTabTitle } from "../utils/tabLabels";
import { sortTabsByType } from "../utils/tabSort";
import ContactPage from "../components/ContactsPage/ContactPage";
import ContactDetailPage from "../components/ContactsPage/ContactDetailPage";
import PrestatairePage from "../components/PrestatairesPage/PrestatairePage";
import PrestataireDetailPage from "../components/PrestatairesPage/PrestataireDetailPage";
import RapportPage from "../components/RapportPage/RapportPage";
import AdminPanel from "../components/AdminPage/AdminPanel";
import ReportBugForm from "../components/Misc/ReportBugForm/ReportBugForm";
import UserProfile from "../components/Misc/UserProfile/UserProfile";
import PatchNotesPage from "../components/PatchNotesPage/PatchNotesPage";
import ComingSoonPage from "../components/Misc/ComingSoonPage/ComingSoonPage";
import DashboardPage from "../components/DashboardPage/DashboardPage";
import DocumentsHubPage from "../components/DocumentsHubPage/DocumentsHubPage";
import KnowledgeBasePage from "../components/KnowledgeBasePage/KnowledgeBasePage";
import EquipmentInventoryPage from "../components/EquipmentInventoryPage/EquipmentInventoryPage";
import TabLauncherPage from "../components/TabLauncher/TabLauncherPage";
import { createListTabData, findTenantDetailTab, generateTenantDetailTabId, isListTabDocType } from "../navigation/tabTypes";
import { abortInFlightPageLoads } from "../utils/pageLoadAbort";
import MonitoringRenderContent from "../components/Monitoring/MonitoringRenderContent";
import { EphemeralMonitoringProvider } from "../contexts/MonitoringContext";
import { useAuthContext } from "../contexts/AuthContext";
import { usePermissions } from "../contexts/PermissionsContext";
import { useTheme } from "../hooks/useTheme";
import { useDrafts } from "../hooks/useDrafts";
import { useProfileAccess } from "../hooks/useProfileAccess";
import { useVeritasEdition } from "../hooks/useVeritasEdition";
import { useSidebarLayout } from "../hooks/useSidebarLayout";
import { filterAccessForEdition, isProOnlyDocType } from "../config/edition";
import { useAppLocale } from "../hooks/useAppGeneralSettings";
import API_BASE_URL from "../config";
import { useOnboarding } from "../hooks/useOnboarding";
import OnboardingWizard from "../components/Onboarding/OnboardingWizard";
import OnboardingResumeFab from "../components/Onboarding/OnboardingResumeFab";
import { buildAgentPath, parseAgentPath, routeToMainAppState, isAgentPathAllowed } from "../navigation/agentRoutes";
import { canAccessAdminPanel } from "../utils/adminPanelPermissions";
import { getEquipmentListKey } from "../utils/equipmentIdentity";
import { toast } from "react-toastify";
import { getAdminInjectionCopy } from "./AdminPage/adminInjectionI18n";
import ConfirmModal from "./Misc/ConfirmModal/ConfirmModal";
import { getRapportPageCopy } from "./RapportPage/rapportPageI18n";
import ProfilePreviewBanner from "./Misc/ProfilePreviewBanner/ProfilePreviewBanner";
import AgentImpersonationBanner from "./Misc/AgentImpersonationBanner/AgentImpersonationBanner";
export default function MainApp() {
  const {
    user,
    userRole,
    loading,
    handleLogout,
    impersonating
  } = useAuthContext();
  const {
    can,
    canAny,
    isAdmin,
    isPreviewing,
    previewProfile,
    stopProfilePreview
  } = usePermissions();
  const canOpenRestrictedTabs = can("tabs.open_restricted");
  const canAccessAdmin = canAccessAdminPanel(canAny, isAdmin);
  const {
    theme
  } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const urlSyncRef = useRef(false);
  const [profile, setProfile] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const {
    isCommunity
  } = useVeritasEdition();
  const appLocale = useAppLocale();
  const effectiveProfile = isPreviewing && previewProfile ? previewProfile : profile;
  const rawAccess = useProfileAccess(effectiveProfile, refreshTrigger);
  const access = useMemo(() => filterAccessForEdition(rawAccess, isCommunity ? "community" : "pro"), [rawAccess, isCommunity]);
  const {
    ready: onboardingReady,
    completed: onboardingCompleted,
    showWizard: showOnboardingWizard,
    showResumeFab: showOnboardingResumeFab,
    step: onboardingStep,
    setStep: setOnboardingStep,
    complete: completeOnboarding,
    pauseAtStep: pauseOnboarding,
    resume: resumeOnboarding
  } = useOnboarding(user, userRole, {
    impersonating
  });
  const sidebarGuideAutoStart = !impersonating && onboardingReady && onboardingCompleted;
  const {
    drafts,
    refreshDraftStatus
  } = useDrafts();
  const [currentDocType, setCurrentDocType] = useState("Home");
  const currentDocTypeRef = useRef(currentDocType);
  currentDocTypeRef.current = currentDocType;
  const [contratDetailData, setContratDetailData] = useState(null);
  const [contratPageParams, setContratPageParams] = useState(null);
  const [contactPageParams, setContactPageParams] = useState(null);
  const [prestatairePageParams, setPrestatairePageParams] = useState(null);
  const [campaignDetailData, setCampaignDetailData] = useState(null);
  const [antivirusDetailData, setAntivirusDetailData] = useState(null);
  const [antispamDetailData, setAntispamDetailData] = useState(null);
  const [tenantDetailData, setTenantDetailData] = useState(null);
  const [ticketDetailData, setTicketDetailData] = useState(null);
  const [ticketDetailNavFamily, setTicketDetailNavFamily] = useState(null);
  const [ticketCreateData, setTicketCreateData] = useState(null);
  const [ticketSalesCreateData, setTicketSalesCreateData] = useState(null);
  const [contactDetailData, setContactDetailData] = useState(null);
  const [prestataireDetailData, setPrestataireDetailData] = useState(null);
  const [equipmentFilterParams, setEquipmentFilterParams] = useState(null);
  const [equipmentDetailData, setEquipmentDetailData] = useState(null);
  const [jobDetailData, setJobDetailData] = useState(null);
  const [computerFleetStatsData, setComputerFleetStatsData] = useState(null);
  const [cybersecuriteParams, setCybersecuriteParams] = useState(null);
  const [serviceParams, setServiceParams] = useState(null);
  const [planningParams, setPlanningParams] = useState(null);
  const [ticketPageParams, setTicketPageParams] = useState(null);
  const [ticketSalesPageParams, setTicketSalesPageParams] = useState(null);
  const [adminTab, setAdminTab] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const { layout: sidebarLayout } = useSidebarLayout();
  const monitoringReportGuardActiveRef = useRef(false);
  const [reportLeaveModalOpen, setReportLeaveModalOpen] = useState(false);
  const pendingReportLeaveRef = useRef(null);
  const [injectionNavLocked, setInjectionNavLocked] = useState(false);
  const injectionNavLockedRef = useRef(false);
  const injectionCopy = useMemo(() => getAdminInjectionCopy(appLocale), [appLocale]);
  const reportLeaveCopy = useMemo(() => getRapportPageCopy(appLocale).supervisionBuilder || {}, [appLocale]);
  const handleMonitoringReportGuardChange = useCallback(active => {
    monitoringReportGuardActiveRef.current = Boolean(active);
  }, []);
  const handleInjectionRunningChange = useCallback(active => {
    const next = Boolean(active);
    injectionNavLockedRef.current = next;
    setInjectionNavLocked(next);
  }, []);
  const warnInjectionNavLocked = useCallback(() => {
    toast.warn(injectionCopy.navBlocked);
  }, [injectionCopy.navBlocked]);
  const shouldBlockMonitoringReportLeave = useCallback(nextDocType => {
    if (!monitoringReportGuardActiveRef.current) return false;
    const current = currentDocTypeRef.current;
    if (current === "Report" && nextDocType !== "Report") return true;
    if (current === "MonitoringDetail" && nextDocType !== "MonitoringDetail") return true;
    return false;
  }, []);
  const clearReportLeaveGuard = useCallback(() => {
    monitoringReportGuardActiveRef.current = false;
  }, []);
  const requestReportLeave = useCallback(action => {
    if (typeof action !== "function") return;
    if (!monitoringReportGuardActiveRef.current) {
      action();
      return;
    }
    pendingReportLeaveRef.current = action;
    setReportLeaveModalOpen(true);
  }, []);
  const handleReportLeaveCancel = useCallback(() => {
    pendingReportLeaveRef.current = null;
    setReportLeaveModalOpen(false);
  }, []);
  const handleReportLeaveConfirm = useCallback(() => {
    const action = pendingReportLeaveRef.current;
    pendingReportLeaveRef.current = null;
    setReportLeaveModalOpen(false);
    clearReportLeaveGuard();
    action?.();
  }, [clearReportLeaveGuard]);
  const handleLogoutGuarded = useCallback(() => {
    if (injectionNavLocked) {
      warnInjectionNavLocked();
      return;
    }
    requestReportLeave(handleLogout);
  }, [injectionNavLocked, warnInjectionNavLocked, requestReportLeave, handleLogout]);
  const [tabs, setTabs] = useState(() => {
    try {
      const savedTabs = localStorage.getItem('veritas_tabs');
      if (savedTabs) {
        const parsed = JSON.parse(savedTabs);
        return Array.isArray(parsed) ? parsed.filter(tab => tab.type !== "Mon") : [];
      }
    } catch (error) {
      console.error('Error lors de la restauration des onglets:', error);
    }
    return [];
  });
  const [activeTabId, setActiveTabId] = useState(() => {
    try {
      const savedActiveTabId = localStorage.getItem('veritas_activeTabId');
      const savedTabs = localStorage.getItem('veritas_tabs');
      if (savedActiveTabId && savedTabs) {
        const parsed = JSON.parse(savedTabs);
        const activeTab = Array.isArray(parsed) ? parsed.find(tab => tab.id === savedActiveTabId) : null;
        if (activeTab && activeTab.type !== "Mon") {
          return savedActiveTabId;
        }
      }
    } catch (error) {
      console.error('Error lors de la restauration de l\'onglet actif:', error);
      return null;
    }
    return null;
  });
  const generateTabId = useCallback((type, data) => {
    if (data?.tabInstanceId) {
      return String(data.tabInstanceId);
    }
    if (type === "ContratDetail") {
      const clientId = data?.clientId || data?.id;
      if (clientId) {
        return `contrat-${clientId}`;
      }
    }
    if (type === "ContactDetail") {
      const contactId = data?.contactId || data?.id;
      if (contactId) {
        return `contact-${contactId}`;
      }
    }
    if (type === "PrestataireDetail") {
      const prestataireId = data?.prestataireId || data?.id;
      if (prestataireId) {
        return `prestataire-${prestataireId}`;
      }
    }
    if (type === "Equipment" && data?.clientId && data?.equipmentType) {
      return `equipment-${data.clientId}-${data.equipmentType}`;
    }
    if (type === "CampaignDetail") {
      const campaignId = data?.campaignId || data?.id;
      if (campaignId) {
        return `campaign-${campaignId}`;
      }
    }
    if (type === "AntivirusDetail") {
      if (data?.clientId && data?.companyId) {
        return `antivirus-${data.clientId}-${data.companyId}-${data.mappingMode || "reseller"}-${data.bitdefenderTenantId || ""}`;
      }
      if (data?.clientId && data?.productName) {
        return `antivirus-${data.clientId}-${data.productName}`;
      }
      if (data?.antivirusId) {
        return `antivirus-${data.antivirusId}`;
      }
      if (data?.clientId) {
        return `antivirus-${data.clientId}`;
      }
    }
    if (type === "AntispamDetail") {
      if (data?.clientId && data?.customerId) {
        return `antispam-${data.clientId}-${data.customerId}`;
      }
      if (data?.clientId && data?.mailinblackTenantId) {
        return `antispam-${data.clientId}-tenant-${data.mailinblackTenantId}`;
      }
      if (data?.clientId && data?.productName) {
        return `antispam-${data.clientId}-${(data.productName || data.logiciel || data.solution || "").replace(/\s+/g, "-")}`;
      }
      if (data?.clientId) {
        return `antispam-${data.clientId}`;
      }
    }
    if (type === "TenantDetail") {
      return generateTenantDetailTabId(data);
    }
    if (type === "EquipmentDetail" && data) {
      if (data.id) return `equipment-detail-${data.id}`;
      if (data.clientId && data.type && data.name) {
        return `equipment-detail-${data.clientId}-${data.type}-${String(data.name).replace(/\s+/g, '-')}`;
      }
    }
    if (type === "JobDetail" && data) {
      if (data.id && data.clientId) return `job-detail-${data.clientId}-${data.id}`;
      if (data.id) return `job-detail-${data.id}`;
      if (data.clientId && (data.nom || data.name)) {
        return `job-detail-${data.clientId}-${String(data.nom || data.name).replace(/\s+/g, "-")}`;
      }
    }
    if (type === "ComputerFleetStats" && data?.clientId) {
      const equipmentType = data.equipmentType || "Ordinateurs";
      const siteKey = String(data.siteFilter || "all").trim().toLowerCase().replace(/\s+/g, "-");
      return `computer-fleet-${data.clientId}-${equipmentType}-${siteKey}`;
    }
    if (type === "TicketDetail" && data) {
      if (data.ticketId) return `ticket-${data.ticketId}`;
      if (data.id) return `ticket-${data.id}`;
    }
    if (type === "TicketSalesDetail" && data) {
      if (data.ticketId) return `ticket-sales-${data.ticketId}`;
      if (data.id) return `ticket-sales-${data.id}`;
    }
    if (type === "MonitoringDetail") {
      const clientId = data?.client?.id || data?.clientId;
      if (clientId) {
        return `monitoring-${clientId}`;
      }
      const clientName = data?.client?.name || data?.client?.nom || 'CLIENT';
      return `monitoring-${clientName}`.replace(/\s+/g, '-');
    }
    if (type === "KnowledgeBaseArticle" && data?.articleId) {
      return `kb-${data.mode === "edit" ? "edit" : "read"}-${data.articleId}`;
    }
    return `${type}-${Date.now()}`;
  }, []);
  const updateTabTitle = (tabId, newTitle) => {
    setTabs(prevTabs => prevTabs.map(tab => tab.id === tabId ? {
      ...tab,
      title: newTitle
    } : tab));
  };
  const hydrateDetailStateFromTab = useCallback(tab => {
    if (!tab) return;
    if (tab.type === "Equipment" || tab.type === "Hardware") {
      setEquipmentFilterParams(tab.data || null);
      setEquipmentDetailData(null);
      return;
    }
    if (tab.type === "EquipmentDetail" && tab.data) {
      setEquipmentDetailData(tab.data);
      setEquipmentFilterParams(null);
      return;
    }
    if (tab.type === "JobDetail" && tab.data) {
      setJobDetailData(tab.data);
      return;
    }
    if (tab.type === "ComputerFleetStats" && tab.data) {
      setComputerFleetStatsData(tab.data);
      return;
    }
    if (tab.type === "ContratDetail" && tab.data) {
      setContratDetailData(tab.data);
      return;
    }
    if (tab.type === "ContactDetail" && tab.data) {
      setContactDetailData(tab.data);
      return;
    }
    if (tab.type === "PrestataireDetail" && tab.data) {
      setPrestataireDetailData(tab.data);
      return;
    }
    if (tab.type === "CampaignDetail" && tab.data) {
      setCampaignDetailData(tab.data);
      return;
    }
    if (tab.type === "AntivirusDetail" && tab.data) {
      setAntivirusDetailData(tab.data);
      return;
    }
    if (tab.type === "AntispamDetail" && tab.data) {
      setAntispamDetailData(tab.data);
      return;
    }
    if (tab.type === "TenantDetail" && tab.data) {
      setTenantDetailData(tab.data);
      return;
    }
    if (tab.type === "TicketDetail" && tab.data) {
      setTicketDetailData(tab.data);
    }
    if (tab.type === "TicketSalesDetail" && tab.data) {
      setTicketDetailData(tab.data);
    }
  }, []);
  const applyRouteState = useCallback((pathname, search) => {
    const parsed = parseAgentPath(pathname, search);
    if (!parsed) {
      if (currentDocType !== "Home") {
        abortInFlightPageLoads();
      }
      setCurrentDocType("Home");
      setAdminTab(null);
      if (`${pathname}${search}` !== "/") {
        navigate("/", {
          replace: true
        });
      }
      return;
    }
    const accessLoaded = Object.keys(rawAccess || {}).length > 0;
    if (accessLoaded && !isAgentPathAllowed(parsed.docType, {
      userRole,
      access,
      isCommunity,
      canAccessAdmin
    })) {
      navigate("/", {
        replace: true
      });
      return;
    }
    const routeState = routeToMainAppState(parsed);
    const tabTypes = ["ContratDetail", "ContactDetail", "PrestataireDetail", "Equipment", "EquipmentDetail", "JobDetail", "ComputerFleetStats", "MonitoringDetail", "CampaignDetail", "AntivirusDetail", "AntispamDetail", "TenantDetail", "TicketDetail", "TicketSalesDetail", "KnowledgeBaseArticle"];
    const nextTabId = tabTypes.includes(routeState.docType) && parsed.data ? generateTabId(routeState.docType, parsed.data) : null;
    if (routeState.docType !== currentDocType || nextTabId && nextTabId !== activeTabId) {
      abortInFlightPageLoads();
    }
    setCurrentDocType(routeState.docType);
    setAdminTab(routeState.adminTab);
    setContratDetailData(routeState.contratDetailData);
    setContratPageParams(routeState.contratPageParams);
    setContactPageParams(routeState.contactPageParams);
    setPrestatairePageParams(routeState.prestatairePageParams);
    setCampaignDetailData(routeState.campaignDetailData);
    setAntivirusDetailData(routeState.antivirusDetailData);
    setAntispamDetailData(routeState.antispamDetailData);
    setTenantDetailData(routeState.tenantDetailData);
    setTicketDetailData(routeState.ticketDetailData);
    setTicketCreateData(routeState.ticketCreateData);
    setTicketSalesCreateData(routeState.ticketSalesCreateData);
    setContactDetailData(routeState.contactDetailData);
    setPrestataireDetailData(routeState.prestataireDetailData);
    setEquipmentFilterParams(routeState.equipmentFilterParams);
    setEquipmentDetailData(routeState.equipmentDetailData);
    setJobDetailData(routeState.jobDetailData);
    setComputerFleetStatsData(routeState.computerFleetStatsData);
    setCybersecuriteParams(routeState.cybersecuriteParams);
    setServiceParams(routeState.serviceParams);
    setPlanningParams(routeState.planningParams);
    if (tabTypes.includes(routeState.docType) && parsed.data) {
      const tabId = nextTabId || generateTabId(routeState.docType, parsed.data);
      setTabs(prevTabs => {
        let existing = prevTabs.find(t => t.id === tabId);
        if (!existing && routeState.docType === "TenantDetail") {
          existing = findTenantDetailTab(prevTabs, parsed.data);
        }
        if (existing) {
          setActiveTabId(existing.id);
          hydrateDetailStateFromTab({
            ...existing,
            data: {
              ...existing.data,
              ...parsed.data
            }
          });
          return prevTabs.map(t => t.id === existing.id ? {
            ...t,
            data: {
              ...t.data,
              ...parsed.data
            }
          } : t);
        }
        const newTab = {
          id: tabId,
          type: routeState.docType,
          title: generateTabTitle(routeState.docType, parsed.data, appLocale),
          data: parsed.data
        };
        setActiveTabId(tabId);
        const newTabs = [...prevTabs, newTab];
        try {
          localStorage.setItem("veritas_tabs", JSON.stringify(newTabs));
          localStorage.setItem("veritas_activeTabId", tabId);
        } catch (error) {
          console.error("Error lors de la sauvegarde des onglets:", error);
        }
        return newTabs;
      });
    } else if (!tabTypes.includes(routeState.docType)) {
      setActiveTabId(null);
    }
  }, [userRole, access, rawAccess, isCommunity, navigate, generateTabId, hydrateDetailStateFromTab, appLocale, currentDocType, activeTabId]);
  const pushAgentUrl = useCallback((type, data, options = {}) => {
    if (options.background) return;
    const path = buildAgentPath(type, data, {
      adminTab: options.adminTab || data?.adminTab || data?.tab
    });
    if (!path) return;
    const current = `${location.pathname}${location.search}`;
    if (current === path) return;
    urlSyncRef.current = true;
    navigate(path, {
      replace: Boolean(options.replaceUrl)
    });
  }, [location.pathname, location.search, navigate]);
  const handleReturnToPermissions = useCallback(() => {
    // Exit preview first so Collaborateur access no longer blocks Admin.
    stopProfilePreview();
    abortInFlightPageLoads();
    setCurrentDocType("Admin");
    setAdminTab("permissions");
    pushAgentUrl("Admin", null, {
      adminTab: "permissions",
      replaceUrl: true
    });
  }, [stopProfilePreview, pushAgentUrl]);
  const handleDocSelect = (type, data, options = {}) => {
    if (type === "Admin" && !canAccessAdmin) {
      return;
    }
    if (type === "Mon" || type === "Rapport") {
      type = "Report";
    }
    if (!canOpenRestrictedTabs && !isAgentPathAllowed(type, {
      userRole,
      access,
      isCommunity,
      canAccessAdmin
    })) {
      return;
    }
    if (injectionNavLocked && !options.background) {
      const stayingOnAdmin = currentDocType === "Admin" && type === "Admin";
      if (!stayingOnAdmin) {
        warnInjectionNavLocked();
        return;
      }
    }
    if (shouldBlockMonitoringReportLeave(type) && !options.background && !options.skipReportLeaveGuard) {
      requestReportLeave(() => handleDocSelect(type, data, {
        ...options,
        skipReportLeaveGuard: true
      }));
      return;
    }
    if (!options.background) {
      if (type !== currentDocType) {
        abortInFlightPageLoads();
      }
      setCurrentDocType(type);
    }
    if (options.openAsTab && isListTabDocType(type)) {
      const normalizedData = data?._listTab ? {
        ...data
      } : createListTabData(type);
      const tabId = generateTabId(type, normalizedData);
      const tabTitle = generateTabTitle(type, normalizedData, appLocale);
      setTabs(prevTabs => {
        const newTab = {
          id: tabId,
          type,
          title: tabTitle,
          data: normalizedData
        };
        const newTabs = [...prevTabs, newTab];
        try {
          localStorage.setItem("veritas_tabs", JSON.stringify(newTabs));
          localStorage.setItem("veritas_activeTabId", tabId);
        } catch (error) {
          console.error("Error lors de la sauvegarde des onglets:", error);
        }
        return newTabs;
      });
      setActiveTabId(tabId);
      setContratDetailData(null);
      setContactDetailData(null);
      setPrestataireDetailData(null);
      setTicketDetailData(null);
      setEquipmentDetailData(null);
      setJobDetailData(null);
      if (type === "Contrat") {
        setContratPageParams(null);
      } else if (type === "Contact") {
        setContactPageParams(null);
      } else if (type === "Prestataire") {
        setPrestatairePageParams(null);
      } else if (type === "Hardware") {
        setEquipmentFilterParams(null);
      }
      pushAgentUrl(type, normalizedData, options);
      return;
    }
    if (options.closeCurrent && activeTabId) {
      setTabs(prevTabs => {
        const newTabs = prevTabs.filter(t => t.id !== activeTabId);
        try {
          localStorage.setItem("veritas_tabs", JSON.stringify(newTabs));
          if (newTabs.length === 0) {
            localStorage.removeItem("veritas_tabs");
          }
        } catch (error) {
          console.error("Error lors de la sauvegarde des onglets:", error);
        }
        return newTabs;
      });
      setActiveTabId(null);
      try {
        localStorage.removeItem("veritas_activeTabId");
      } catch (error) {
        console.error("Error while deleting de l'onglet actif:", error);
      }
    }
    const tabTypes = ["ContratDetail", "ContactDetail", "PrestataireDetail", "Equipment", "EquipmentDetail", "JobDetail", "ComputerFleetStats", "MonitoringDetail", "CampaignDetail", "AntivirusDetail", "AntispamDetail", "TenantDetail", "TicketDetail", "TicketSalesDetail", "KnowledgeBaseArticle"];
    if (tabTypes.includes(type) && data) {
      const normalizedData = {
        ...data
      };
      if (type === "CampaignDetail" && normalizedData.id && !normalizedData.campaignId) {
        normalizedData.campaignId = normalizedData.id;
      }
      let tabId = generateTabId(type, normalizedData);
      if (type === "MonitoringDetail") {
        const existingMonitoringTab = tabs.find(t => t.type === "MonitoringDetail");
        if (existingMonitoringTab && existingMonitoringTab.id !== tabId) {
          window.alert("A monitoring report is already in progress. " + "Please close the current report tab before creating a new one.");
          setActiveTabId(existingMonitoringTab.id);
          setCurrentDocType("MonitoringDetail");
          try {
            localStorage.setItem("veritas_activeTabId", existingMonitoringTab.id);
          } catch (error) {
            console.error("Error lors de la sauvegarde de l'onglet actif:", error);
          }
          pushAgentUrl("MonitoringDetail", existingMonitoringTab.data, options);
          return;
        }
      }
      const tabTitle = generateTabTitle(type, normalizedData, appLocale);
      const inBackground = options.background;
      setTabs(prevTabs => {
        let existingTab = prevTabs.find(t => t.id === tabId);
        if (!existingTab && type === "TenantDetail") {
          existingTab = findTenantDetailTab(prevTabs, normalizedData);
          if (existingTab) {
            tabId = existingTab.id;
          }
        }
        let newTabs;
        if (existingTab) {
          if (!inBackground) {
            setActiveTabId(tabId);
          }
          newTabs = prevTabs.map(t => t.id === tabId ? {
            ...t,
            title: tabTitle || t.title,
            data: {
              ...t.data,
              ...normalizedData
            }
          } : t);
        } else {
          const newTab = {
            id: tabId,
            type: type,
            title: tabTitle,
            data: normalizedData
          };
          if (!inBackground) {
            setActiveTabId(tabId);
          }
          newTabs = [...prevTabs, newTab];
        }
        try {
          localStorage.setItem('veritas_tabs', JSON.stringify(newTabs));
          if (!inBackground) {
            localStorage.setItem('veritas_activeTabId', tabId);
          }
        } catch (error) {
          console.error('Error lors de la sauvegarde des onglets:', error);
        }
        return newTabs;
      });
    } else if (!options.background) {
      setActiveTabId(null);
    }
    if (!options.background && type === "ContratDetail" && data) {
      setContratDetailData(data);
    } else if (!options.background && type === "CampaignDetail" && data) {
      setCampaignDetailData(data.campaign || data);
    } else if (!options.background && type === "AntivirusDetail" && data) {
      setAntivirusDetailData(data);
    } else if (!options.background && type === "AntispamDetail" && data) {
      setAntispamDetailData(data);
    } else if (!options.background && type === "TenantDetail" && data) {
      setTenantDetailData(data);
    } else if (!options.background && type === "TicketDetail" && data) {
      setTicketDetailData(data);
    } else if (!options.background && type === "TicketSalesDetail" && data) {
      setTicketDetailData(data);
    } else if (!options.background && type === "TicketCreate") {
      setTicketCreateData(data || null);
    } else if (!options.background && type === "TicketSalesCreate") {
      setTicketSalesCreateData(data || null);
    } else if (!options.background && type === "ContactDetail" && data) {
      setContactDetailData(data);
    } else if (!options.background && type === "PrestataireDetail" && data) {
      setPrestataireDetailData(data);
    } else if (!options.background && type === "Contrat") {
      setContratPageParams(data || null);
    } else if (!options.background && type === "Contact") {
      setContactPageParams(data || null);
    } else if (!options.background && type === "Prestataire") {
      setPrestatairePageParams(data || null);
    } else if (!options.background && (type === "Equipment" || type === "Hardware") && data) {
      setEquipmentFilterParams(data);
    } else if (!options.background && type === "EquipmentDetail" && data) {
      setEquipmentDetailData(data);
    } else if (!options.background && type === "JobDetail" && data) {
      setJobDetailData(data);
    } else if (!options.background && type === "ComputerFleetStats" && data) {
      setComputerFleetStatsData(data);
    } else if (!options.background && type === "Cybersecurite" && data) {
      setCybersecuriteParams(data);
    } else if (!options.background && type === "Service" && data) {
      setServiceParams(data);
    } else if (!options.background && type === "Planning" && data) {
      setPlanningParams(data);
    } else if (!options.background && type === "Ticket") {
      setTicketPageParams(data || null);
    } else if (!options.background && type === "TicketSales") {
      setTicketSalesPageParams(data || null);
    } else if (type !== "ContratDetail" && type !== "ContactDetail" && type !== "PrestataireDetail" && type !== "Equipment" && type !== "EquipmentDetail" && type !== "JobDetail" && type !== "ComputerFleetStats" && type !== "MonitoringDetail" && type !== "Cybersecurite" && type !== "Service" && type !== "Planning") {
      setContratDetailData(null);
      setContactDetailData(null);
      setPrestataireDetailData(null);
      setEquipmentFilterParams(null);
      setEquipmentDetailData(null);
      setJobDetailData(null);
      setComputerFleetStatsData(null);
      setCybersecuriteParams(null);
    }
    if (type !== "CampaignDetail") {
      setCampaignDetailData(null);
    }
    if (type !== "AntivirusDetail") {
      setAntivirusDetailData(null);
    }
    if (type !== "AntispamDetail") {
      setAntispamDetailData(null);
    }
    if (type !== "TenantDetail") {
      setTenantDetailData(null);
    }
    if (type !== "TicketDetail" && type !== "TicketSalesDetail") {
      setTicketDetailData(null);
      setTicketDetailNavFamily(null);
    }
    if (type !== "TicketCreate") {
      setTicketCreateData(null);
    }
    if (type !== "TicketSalesCreate") {
      setTicketSalesCreateData(null);
    }
    if (type !== "Contrat") {
      setContratPageParams(null);
    }
    if (type !== "Contact") {
      setContactPageParams(null);
    }
    if (type !== "Prestataire") {
      setPrestatairePageParams(null);
    }
    if (type !== "Equipment" && type !== "Hardware") {
      setEquipmentFilterParams(null);
    }
    if (type !== "EquipmentDetail") {
      setEquipmentDetailData(null);
    }
    if (type !== "JobDetail") {
      setJobDetailData(null);
    }
    if (type !== "ComputerFleetStats") {
      setComputerFleetStatsData(null);
    }
    if (type !== "Cybersecurite") {
      setCybersecuriteParams(null);
    }
    if (type !== "Service") {
      setServiceParams(null);
    }
    if (type !== "Planning") {
      setPlanningParams(null);
    }
    if (type !== "Ticket") {
      setTicketPageParams(null);
    }
    if (type !== "TicketSales") {
      setTicketSalesPageParams(null);
    }
    const urlData = type === "ContratDetail" ? data : type === "ContactDetail" ? data : type === "PrestataireDetail" ? data : type === "TicketDetail" || type === "TicketSalesDetail" ? data : type === "CampaignDetail" ? data?.campaign || data : type === "MonitoringDetail" ? data : type === "Equipment" || type === "Hardware" ? data : type === "EquipmentDetail" ? data : type === "JobDetail" ? data : type === "ComputerFleetStats" ? data : type === "AntivirusDetail" ? data : type === "AntispamDetail" ? data : type === "TenantDetail" ? data : type === "TicketCreate" ? data || ticketCreateData : type === "TicketSalesCreate" ? data || ticketSalesCreateData : type === "Contrat" ? data || contratPageParams : type === "Contact" ? data || contactPageParams : type === "Prestataire" ? data || prestatairePageParams : type === "Cybersecurite" ? data || cybersecuriteParams : type === "Service" ? data || serviceParams : type === "Planning" ? data || planningParams : type === "Ticket" ? data || ticketPageParams : type === "TicketSales" ? data || ticketSalesPageParams : data;
    pushAgentUrl(type, urlData, options);
  };
  const handleTabClick = tab => {
    if (injectionNavLocked) {
      warnInjectionNavLocked();
      return;
    }
    const leavingReport = monitoringReportGuardActiveRef.current && currentDocTypeRef.current === "Report" && tab.type !== "Report";
    const leavingMonitoring = monitoringReportGuardActiveRef.current && currentDocTypeRef.current === "MonitoringDetail" && tab.id !== activeTabId;
    if ((leavingReport || leavingMonitoring) && !tab._skipReportLeaveGuard) {
      requestReportLeave(() => handleTabClick({
        ...tab,
        _skipReportLeaveGuard: true
      }));
      return;
    }
    const resolvedTab = tabs.find(entry => entry.id === tab.id) || tab;
    if (!canOpenRestrictedTabs && !isAgentPathAllowed(resolvedTab.type, {
      userRole,
      access,
      isCommunity,
      canAccessAdmin
    })) {
      return;
    }
    setActiveTabId(resolvedTab.id);
    if (resolvedTab.id !== activeTabId || resolvedTab.type !== currentDocType) {
      abortInFlightPageLoads();
    }
    setCurrentDocType(resolvedTab.type);
    if (resolvedTab.type === "Contrat") {
      setContratPageParams(resolvedTab.data || null);
      setContratDetailData(null);
    } else if (resolvedTab.type === "Contact") {
      setContactPageParams(resolvedTab.data || null);
      setContactDetailData(null);
    } else if (resolvedTab.type === "Prestataire") {
      setPrestatairePageParams(resolvedTab.data || null);
      setPrestataireDetailData(null);
    } else if (resolvedTab.type === "Ticket") {
      setTicketDetailData(null);
    } else {
      hydrateDetailStateFromTab(resolvedTab);
    }
    try {
      localStorage.setItem("veritas_activeTabId", resolvedTab.id);
    } catch (error) {
      console.error("Error lors de la sauvegarde de l'onglet actif:", error);
    }
    pushAgentUrl(resolvedTab.type, resolvedTab.data);
  };
  const handleOpenTabLauncher = useCallback(() => {
    if (injectionNavLocked) {
      warnInjectionNavLocked();
      return;
    }
    const openLauncher = () => {
      abortInFlightPageLoads();
      setCurrentDocType("TabLauncher");
      setActiveTabId(null);
      pushAgentUrl("TabLauncher", null);
    };
    if (shouldBlockMonitoringReportLeave("TabLauncher")) {
      requestReportLeave(openLauncher);
      return;
    }
    openLauncher();
  }, [injectionNavLocked, warnInjectionNavLocked, shouldBlockMonitoringReportLeave, requestReportLeave, pushAgentUrl]);
  const handleTabClose = (tabId, skipReportLeaveGuard = false) => {
    if (injectionNavLocked) {
      warnInjectionNavLocked();
      return;
    }
    const isClosingActiveTab = tabId === activeTabId;
    const closingBuilderTab = monitoringReportGuardActiveRef.current && isClosingActiveTab && (currentDocTypeRef.current === "Report" || currentDocTypeRef.current === "MonitoringDetail");
    if (closingBuilderTab && !skipReportLeaveGuard) {
      requestReportLeave(() => handleTabClose(tabId, true));
      return;
    }
    setTabs(prevTabs => {
      const newTabs = prevTabs.filter(t => t.id !== tabId);
      if (tabId === activeTabId) {
        if (newTabs.length > 0) {
          const lastTab = newTabs[newTabs.length - 1];
          setActiveTabId(lastTab.id);
          try {
            localStorage.setItem('veritas_activeTabId', lastTab.id);
          } catch (error) {
            console.error('Error lors de la sauvegarde de l\'onglet actif:', error);
          }
          handleDocSelect(lastTab.type, lastTab.data);
          } else {
          setActiveTabId(null);
          if (currentDocType !== "TabLauncher") {
            abortInFlightPageLoads();
            setCurrentDocType("Home");
            pushAgentUrl("Home", null);
          }
          try {
            localStorage.removeItem('veritas_activeTabId');
          } catch (error) {
            console.error('Error while deleting de l\'onglet actif:', error);
          }
        }
      }
      try {
        localStorage.setItem('veritas_tabs', JSON.stringify(newTabs));
        if (newTabs.length === 0) {
          localStorage.removeItem('veritas_tabs');
        }
      } catch (error) {
        console.error('Error lors de la sauvegarde des onglets:', error);
      }
      return newTabs;
    });
  };
  const handleTabReorder = newTabs => {
    setTabs(newTabs);
    try {
      localStorage.setItem('veritas_tabs', JSON.stringify(newTabs));
    } catch (error) {
      console.error('Error lors de la sauvegarde des onglets:', error);
    }
  };
  const handleTabSort = useCallback(() => {
    setTabs(prevTabs => {
      const sorted = sortTabsByType(prevTabs, appLocale);
      try {
        localStorage.setItem("veritas_tabs", JSON.stringify(sorted));
      } catch (error) {
        console.error("Error lors de la sauvegarde des onglets:", error);
      }
      return sorted;
    });
  }, [appLocale]);
  useEffect(() => {
    window.refreshDraftStatus = refreshDraftStatus;
  }, [refreshDraftStatus]);
  useEffect(() => {
    const handleBeforeUnload = event => {
      if (!monitoringReportGuardActiveRef.current && !injectionNavLockedRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);
  useEffect(() => {
    const triggerRefresh = () => setRefreshTrigger(c => c + 1);
    window.addEventListener("refreshProfileAccess", triggerRefresh);
    return () => {
      window.removeEventListener("refreshProfileAccess", triggerRefresh);
    };
  }, []);
  useEffect(() => {
    if (loading || !user) return;
    if (urlSyncRef.current) {
      urlSyncRef.current = false;
      return;
    }
    if (injectionNavLockedRef.current) {
      const parsed = parseAgentPath(location.pathname, location.search);
      const routeState = parsed ? routeToMainAppState(parsed) : null;
      const stayingOnInjection = routeState?.docType === "Admin" && (routeState.adminTab == null || routeState.adminTab === "injection");
      if (!stayingOnInjection) {
        warnInjectionNavLocked();
        pushAgentUrl("Admin", null, {
          adminTab: "injection",
          replaceUrl: true
        });
        return;
      }
    }
    applyRouteState(location.pathname, location.search);
  }, [location.pathname, location.search, loading, user, applyRouteState, access, rawAccess, warnInjectionNavLocked, pushAgentUrl]);
  const fetchProfile = () => {
    if (!user) return;
    fetch(`${API_BASE_URL}/users/me`, {
      credentials: "include"
    }).then(res => res.ok ? res.json() : null).then(data => {
      if (!data?.profile) return;
      setProfile(data.profile);
      setRefreshTrigger(c => c + 1);
    }).catch(error => {
      console.log("Error lors de la récupération du profil");
    });
  };
  useEffect(() => {
    if (user) {
      fetchProfile();
      window.refreshProfile = fetchProfile;
    }
  }, [user]);
  useEffect(() => {
    window.updateTabTitle = (type, data, title) => {
      setTabs(prevTabs => {
        const tabId = generateTabId(type, data);
        let targetTab = prevTabs.find(tab => tab.id === tabId);
        if (!targetTab && type === "TenantDetail") {
          targetTab = findTenantDetailTab(prevTabs, data);
        }
        if (!targetTab) return prevTabs;
        const newTitle = title || generateTabTitle(type, data || {}, appLocale);
        return prevTabs.map(tab => tab.id === targetTab.id ? {
          ...tab,
          title: newTitle
        } : tab);
      });
    };
    return () => {
      delete window.updateTabTitle;
    };
  }, [generateTabId, appLocale]);
  useEffect(() => {
    if (currentDocType === "ContratDetail" && contratDetailData?.name) {
      const tabId = generateTabId("ContratDetail", contratDetailData);
      const newTitle = generateTabTitle("ContratDetail", contratDetailData, appLocale);
      updateTabTitle(tabId, newTitle);
    }
  }, [contratDetailData]);
  useEffect(() => {
    if (currentDocType === "ContactDetail" && contactDetailData) {
      const tabId = generateTabId("ContactDetail", contactDetailData);
      const newTitle = generateTabTitle("ContactDetail", contactDetailData, appLocale);
      updateTabTitle(tabId, newTitle);
    }
  }, [contactDetailData]);
  useEffect(() => {
    if (currentDocType === "PrestataireDetail" && prestataireDetailData) {
      const tabId = generateTabId("PrestataireDetail", prestataireDetailData);
      const newTitle = generateTabTitle("PrestataireDetail", prestataireDetailData, appLocale);
      updateTabTitle(tabId, newTitle);
    }
  }, [prestataireDetailData]);
  const renderCurrentPage = () => {
    if (isCommunity && isProOnlyDocType(currentDocType)) {
      return <ComingSoonPage title="Veritas Pro" description="This module is reserved for the Pro edition. See pricing to unlock all features." showProPricing />;
    }
    switch (currentDocType) {
      case "Home":
        return <HomePage onNavigate={handleDocSelect} isCommunity={isCommunity} />;
      case "Hardware":
        return <EquipmentPage equipmentFilterParams={equipmentFilterParams} onNavigate={handleDocSelect} onFilterParamsConsumed={() => setEquipmentFilterParams(null)} />;
      case "Equipment":
        return <EquipmentPage equipmentFilterParams={equipmentFilterParams} onNavigate={handleDocSelect} onFilterParamsConsumed={() => setEquipmentFilterParams(null)} />;
      case "EquipmentDetail":
        {
          const activeEquipmentTab = tabs.find(tab => tab.id === activeTabId && tab.type === "EquipmentDetail");
          const equipmentForDetail = activeEquipmentTab?.data ?? equipmentDetailData;
          const equipmentDetailKey = activeEquipmentTab?.id || getEquipmentListKey(equipmentForDetail) || "equipment-detail";
          return <EquipmentDetailPage key={equipmentDetailKey} equipment={equipmentForDetail} onNavigate={handleDocSelect} onBack={() => {
            setCurrentDocType("Equipment");
            setActiveTabId(null);
          }} onUpdate={async updatedEquipment => {
            if (!updatedEquipment) {
              const tabIdToClose = activeEquipmentTab?.id || generateTabId("EquipmentDetail", equipmentForDetail);
              handleTabClose(tabIdToClose);
              setCurrentDocType("Equipment");
              setActiveTabId(null);
              return;
            }
            setEquipmentDetailData(updatedEquipment);
            const tabId = generateTabId("EquipmentDetail", updatedEquipment);
            const newTitle = generateTabTitle("EquipmentDetail", updatedEquipment, appLocale);
            updateTabTitle(tabId, newTitle);
            setTabs(prevTabs => {
              const newTabs = prevTabs.map(tab => tab.id === tabId ? {
                ...tab,
                data: updatedEquipment,
                title: newTitle
              } : tab);
              try {
                localStorage.setItem("veritas_tabs", JSON.stringify(newTabs));
              } catch (error) {
                console.error("Error lors de la sauvegarde des onglets:", error);
              }
              return newTabs;
            });
          }} />;
        }
      case "JobDetail":
        {
          const activeJobTab = tabs.find(tab => tab.id === activeTabId && tab.type === "JobDetail");
          const jobForDetail = activeJobTab?.data ?? jobDetailData;
          const jobDetailKey = activeJobTab?.id || jobForDetail?.id || "job-detail";
          return <JobDetailPage key={jobDetailKey} jobData={jobForDetail} onNavigate={handleDocSelect} onUpdate={updatedJob => {
            if (!updatedJob) return;
            setJobDetailData(updatedJob);
            const tabId = generateTabId("JobDetail", updatedJob);
            const newTitle = generateTabTitle("JobDetail", updatedJob, appLocale);
            updateTabTitle(tabId, newTitle);
            setTabs(prevTabs => {
              const newTabs = prevTabs.map(tab => tab.id === tabId ? {
                ...tab,
                data: updatedJob,
                title: newTitle
              } : tab);
              try {
                localStorage.setItem("veritas_tabs", JSON.stringify(newTabs));
              } catch (error) {
                console.error("Error lors de la sauvegarde des onglets:", error);
              }
              return newTabs;
            });
          }} />;
        }
      case "Cybersecurite":
        return <CybersecuritePage onNavigate={handleDocSelect} cybersecuriteParams={cybersecuriteParams} />;
      case "CampaignDetail":
        return <CampaignDetailPage onNavigate={handleDocSelect} campaignData={campaignDetailData} />;
      case "AntivirusDetail":
        return <AntivirusDetailPage onNavigate={handleDocSelect} antivirusData={antivirusDetailData} />;
      case "AntispamDetail":
        return <AntispamDetailPage onNavigate={handleDocSelect} antispamData={antispamDetailData} />;
      case "TenantDetail":
        return <TenantDetailPage onNavigate={handleDocSelect} tenantData={tenantDetailData} />;
      case "Service":
        return <ServicePage onNavigate={handleDocSelect} serviceParams={serviceParams} />;
      case "Planning":
        return <PlanningPage onNavigate={handleDocSelect} planningParams={planningParams} />;
      case "Dashboard":
        return <DashboardPage />;
      case "Ticket":
        return <TicketPage onNavigate={handleDocSelect} pageParams={ticketPageParams} onPageParamsConsumed={() => setTicketPageParams(null)} />;
      case "TicketCreate":
        return <TicketCreatePage onNavigate={handleDocSelect} initialData={ticketCreateData} />;
      case "TicketSales":
        return <TicketSalesPage onNavigate={handleDocSelect} pageParams={ticketSalesPageParams} onPageParamsConsumed={() => setTicketSalesPageParams(null)} />;
      case "TicketSalesCreate":
        return <TicketSalesCreatePage onNavigate={handleDocSelect} initialData={ticketSalesCreateData} />;
      case "TicketSalesDetail":
        return <TicketSalesDetailPage onNavigate={handleDocSelect} ticketData={{
          ...(ticketDetailData || {}),
          fromPage: ticketDetailData?.fromPage || "TicketSales",
          ticketFamily: ticketDetailData?.ticketFamily || "sales"
        }} />;
      case "TicketDetail":
        return <TicketDetailPage onNavigate={handleDocSelect} ticketData={ticketDetailData} onTicketNavFamilyChange={setTicketDetailNavFamily} />;
      case "Contrat":
        return <EnterprisesPage onNavigate={handleDocSelect} pageParams={contratPageParams} onPageParamsConsumed={() => setContratPageParams(null)} />;
      case "ContratDetail":
        return <EnterpriseDetailPage onNavigate={handleDocSelect} clientData={contratDetailData} />;
      case "ComputerFleetStats":
        return <ComputerFleetStatsPage onNavigate={handleDocSelect} statsData={computerFleetStatsData} />;
      case "Contact":
        return <ContactPage onNavigate={handleDocSelect} pageParams={contactPageParams} onPageParamsConsumed={() => setContactPageParams(null)} />;
      case "ContactDetail":
        return <ContactDetailPage onNavigate={handleDocSelect} contactData={contactDetailData} />;
      case "Prestataire":
        return <PrestatairePage onNavigate={handleDocSelect} pageParams={prestatairePageParams} onPageParamsConsumed={() => setPrestatairePageParams(null)} />;
      case "PrestataireDetail":
        return <PrestataireDetailPage onNavigate={handleDocSelect} prestataireData={prestataireDetailData} />;
      case "Report":
        return <RapportPage onNavigate={handleDocSelect} hasTabsBar={tabs.length > 0} onMonitoringReportGuardChange={handleMonitoringReportGuardChange} />;
      case "DocumentsHub":
        return <DocumentsHubPage />;
      case "KnowledgeBase":
      case "KnowledgeBaseArticle":
        return <KnowledgeBasePage onNavigate={handleDocSelect} />;
      case "EquipmentInventory":
        return <EquipmentInventoryPage onNavigate={handleDocSelect} />;
      case "MonitoringDetail":
        {
          const activeMonitoringTab = tabs.find(tab => tab.id === activeTabId && tab.type === "MonitoringDetail");
          const monitoringTabData = activeMonitoringTab?.data || null;
          const initialStep = monitoringTabData?.step ?? 0;
          const initialScrollY = typeof monitoringTabData?.scrollY === "number" ? monitoringTabData.scrollY : 0;
          const initialConfig = monitoringTabData?.client ? {
            client: monitoringTabData.client,
            documentName: monitoringTabData.documentName
          } : null;
          const initialData = monitoringTabData?.data || {};
          return <EphemeralMonitoringProvider initialConfig={initialConfig} initialData={initialData} refreshDraftStatus={refreshDraftStatus}>
            <MonitoringRenderContent onNavigate={handleDocSelect} isFullscreen={false} initialGatePassed={monitoringTabData?.gatePassed || false} initialGoToSummary={monitoringTabData?.goToSummary || false} initialScrollY={initialScrollY} initialStep={initialStep} onMonitoringReportGuardChange={handleMonitoringReportGuardChange} onStateChange={state => {
              setTabs(prevTabs => {
                const newTabs = prevTabs.map(tab => tab.id === activeTabId && tab.type === "MonitoringDetail" ? {
                  ...tab,
                  data: {
                    ...tab.data,
                    ...state
                  }
                } : tab);
                try {
                  localStorage.setItem('veritas_tabs', JSON.stringify(newTabs));
                } catch (error) {
                  console.error('Error lors de la sauvegarde des onglets (MonitoringDetail):', error);
                }
                return newTabs;
              });
            }} />
          </EphemeralMonitoringProvider>;
        }
      case "Admin":
        return <AdminPanel isCommunity={isCommunity} routeTab={adminTab} onInjectionRunningChange={handleInjectionRunningChange} onOpenPage={handleDocSelect} onRouteTabChange={tab => {
          setAdminTab(tab);
          pushAgentUrl("Admin", null, {
            adminTab: tab,
            replaceUrl: true
          });
        }} />;
      case "ReportBug":
        return <ReportBugForm />;
      case "User":
        return <UserProfile user={user} onNavigate={handleDocSelect} />;
      case "PatchNotes":
        return <PatchNotesPage />;
      case "TabLauncher":
        return <TabLauncherPage onNavigate={handleDocSelect} access={access} isCommunity={isCommunity} userRole={userRole} />;
      default:
        return null;
    }
  };
  const showTabsBar = tabs.length > 0 || currentDocType === "TabLauncher";

  const sidebarCurrent = useMemo(() => {
    if (currentDocType === "KnowledgeBaseArticle") return "KnowledgeBase";
    if (currentDocType === "TicketSalesDetail") return "TicketSales";
    if (currentDocType !== "TicketDetail") return currentDocType;
    const family = ticketDetailNavFamily || ticketDetailData?.ticketFamily || (ticketDetailData?.fromPage === "TicketSales" ? "sales" : null);
    if (family === "sales" || family === "TicketSales") return "TicketSales";
    return "Ticket";
  }, [currentDocType, ticketDetailNavFamily, ticketDetailData?.ticketFamily, ticketDetailData?.fromPage]);
  return <div className={theme === "dark" ? "dark" : "light"}>
      <AnimatePresence>
        {showOnboardingWizard && !loading && user && <OnboardingWizard key="onboarding-wizard" step={onboardingStep} onStepChange={setOnboardingStep} onNavigate={handleDocSelect} onComplete={completeOnboarding} onPause={pauseOnboarding} />}
      </AnimatePresence>

      {showOnboardingResumeFab && !loading && user && <OnboardingResumeFab onClick={resumeOnboarding} />}

      <ProfilePreviewBanner onReturnToPermissions={handleReturnToPermissions} />
      <AgentImpersonationBanner />

      <Sidebar current={sidebarCurrent} onSelect={handleDocSelect} onNavigate={handleDocSelect} onLogout={handleLogoutGuarded} user={user} userRole={userRole} profile={effectiveProfile} drafts={drafts} access={access} onCollapseChange={setSidebarCollapsed} sidebarGuideAutoStart={sidebarGuideAutoStart} layout={sidebarLayout} />

      <TabsBar tabs={tabs} activeTabId={activeTabId} onTabClick={handleTabClick} onTabClose={handleTabClose} onTabReorder={handleTabReorder} onSortTabs={tabs.length > 1 ? handleTabSort : undefined} onNewTab={showTabsBar ? handleOpenTabLauncher : undefined} launcherActive={currentDocType === "TabLauncher"} sidebarCollapsed={sidebarCollapsed} sidebarLayout={sidebarLayout} />

      <ConfirmModal open={reportLeaveModalOpen} title={reportLeaveCopy.unsavedTitle} message={reportLeaveCopy.unsavedMessage} confirmLabel={reportLeaveCopy.leaveConfirm} cancelLabel={reportLeaveCopy.leaveCancel} icon="mdi:content-save-alert-outline" onClose={handleReportLeaveCancel} onConfirm={handleReportLeaveConfirm} />

      <div className={`contentWrapper ${showTabsBar ? "withTabs" : ""} ${sidebarCollapsed && sidebarLayout !== "horizontal" ? "sidebarCollapsed" : ""} ${sidebarLayout === "horizontal" ? "sidebarTop" : ""}`}>
        {currentDocType !== "Synth" && renderCurrentPage()}
      </div>
    </div>;
}
