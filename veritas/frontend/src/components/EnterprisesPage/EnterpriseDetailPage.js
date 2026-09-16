import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { toast } from 'react-toastify';
import { updateClient, saveClientModules, getClientLogs, getClientCheckMKStats, fetchClientAntivirus, fetchClientAntispam, fetchClientDomains, fetchClientSslCertificates, fetchClientLicences, fetchClientModules, fetchContacts, fetchClientTags, addClientTag, removeClientTag, fetchClientNotes, createClientNote, updateClientNote, deleteClientNote, addContact, updateContact, addContactMembership, setContactPrimaryForClient, deleteClient, fetchClientSupportCredits, fetchClientDeletionCheck, resolveClientCustomFamilyMap } from "../../api/clients";
import { listClientMailinblackTenants } from "../../api/clientMailinblack";
import { listClientOffice365Credentials } from "../../api/clientOffice365";
import { getGlobalOvhStatus } from "../../api/clientOvh";
import { mapCustomEquipmentItem, parseCustomFamilyType } from "../../api/equipmentFamilies";
import { getClientEquipmentTotal, mapClientHardwareEquipment } from "../../api/equipment";
import { equipmentMatchesFleetFamily } from "../../utils/equipmentFamilyStats";
import { filterCustomFamilyMap, filterBySite } from "../../utils/siteFilterUtils";
import { readEnterprisePeripheralsUi, writeEnterprisePeripheralsUi } from "../../utils/enterprisePeripheralsUiState";
import { repairRmmTextEncoding } from "../../utils/rmmTextEncoding";
import { fetchUsers, fetchActiveUsers } from "../../api/users";
import { getClientCampaigns, createClientCampaign } from "../../api/campaigns";
import { fetchTickets } from "../../api/tickets";
import { fetchEvents } from "../../api/events";
import { filterRecentEvents, filterUpcomingEvents, mapCampaignsToBookmarkEvents } from "../../utils/eventFilters";
import { usePlanningEventTypes } from "../PlanningPage/usePlanningEventTypes";
import { getPlanningEventTypesList } from "../PlanningPage/planningEventTypes";
import { getClientInitials, getClientNumber, getClientNameWithoutCode } from "../../utils/clientDisplay";
import { getClientOnboardingInfo } from "../../utils/clientOnboarding";
import API_BASE_URL from "../../config";
import SmartTooltip from "../SmartTooltip";
import StatusDot from "../shared/StatusDot/StatusDot";
import SubscribeBellButton from "../shared/SubscribeBellButton/SubscribeBellButton";
import PlanningEventModalBridge from "../PlanningPage/PlanningEventModalBridge";
import SitesModal from "./SitesModal";
import DomainsModal from "./DomainsModal";
import DomainsConfigModal from "./DomainsConfigModal";
import DomainSolutionPickerModal from "./DomainSolutionPickerModal";
import DomainOverviewModal from "./DomainOverviewModal";
import SslCertificatesModal from "./SslCertificatesModal";
import LicencesAbonnementsModal from "./LicencesAbonnementsModal";
import CustomEquipmentModal from "./CustomEquipmentModal";
import EnterpriseEditModal from "./EnterpriseEditModal";
import EnterpriseDeleteModal from "./EnterpriseDeleteModal";
import EnterpriseBlockersModal from "../AdminPage/EnterpriseBlockersModal";
import { isClientDeletable } from "../AdminPage/clientDeletionUi";
import { getLinkedElementsSummary, getModalBlockerRows } from "../AdminPage/clientLinkedElementsUi";
import ClientNoteModal from "./ClientNoteModal";
import ClientTagModal from "./ClientTagModal";
import ContactFormModal from "../ContactsPage/ContactFormModal";
import PrestataireAttachModal from "../PrestatairesPage/PrestataireAttachModal";
import { addPrestataireMembership, fetchPrestataires, fetchPrestatairesList } from "../../api/prestataires";
import { exportReversibilityFolder } from "./exportReversibilityDossier";
import EnterpriseVaultPanel from "./EnterpriseVaultPanel";
import { getEnterpriseVaultCopy } from "./enterpriseVaultI18n";
import { splitClientAddress, buildClientAddress, emptyPrimaryContact, mapContactToPrimary, pickPrimaryContact, normalizePrimaryContact, buildAdditiveMembershipsForEnterprise, isPrimaryContactPoste, isContactPrimaryForClient, sortContactsPrimaryFirst, normalizeCompanyStatusKey, toCompanyStatusValue } from "./enterpriseFormUtils";
import { buildSiteAddress, formatSitesForLog, getSiteDisplayName, getSiteId, getSiteLocationValue, normalizeClientSites, serializeSitesForCompare, siteMatchesQuery } from "../../utils/clientSites";
import { normalizeServeurLieList, pickBackupJobType } from "./backupJobUtils";
import SiteMapPreview from "./SiteMapPreview";
import { normalizeLegalIdentifier, LEGAL_IDENTIFIER_LABEL } from "../../utils/siret";
import { normalizeContactCommunications, getCommunicationTypeDef, buildContactApiPayload } from "../../utils/contactCommunications";
import EquipmentPage from "../EquipementPage/EquipmentPage";
import InfrastructureMap from "./InfrastructureMap";
import EnterpriseRmmEnrollmentHero from "../Rmm/EnterpriseRmmEnrollmentHero";
import EnterpriseDetailSkeleton from "./EnterpriseDetailSkeleton";
import UpcomingEventBookmarks from "./UpcomingEventBookmarks";
import styles from "./EnterpriseDetailPage.module.css";
import { useContractModuleOptions } from "../../hooks/useContractModuleOptions";
import { formatClientSlaRows, parseClientSla, getTicketSlaDisplay, SLA_PRIORITY_LABELS } from "../../utils/ticketSlaUtils";
import { normalizeClientOptions } from "../../constants/contractModules";
import { formatTableDate } from "../../utils/tableDateFormat";
import { formatRelativeFrench } from "../EquipementPage/checkmkMonitoringUtils";
import { useAuthContext } from "../../contexts/AuthContext";
import { usePermissions } from "../../contexts/PermissionsContext";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { useVeritasEdition } from "../../hooks/useVeritasEdition";
import { getEnterpriseDetailCopy, getContractStatusDetail, getContractTypeLabel, getPrestationCategoryLabel, getTicketStatusLabel, getEventTypeLabels, getCampaignTypeLabel, getCampaignStatusLabel, interpolate } from "./enterpriseDetailI18n";
import ProFeatureBadge from "../Misc/ProFeature/ProFeatureBadge";
import ProFeatureLock from "../Misc/ProFeature/ProFeatureLock";
import ProFeaturePromoModal from "../Misc/ProFeature/ProFeaturePromoModal";
import { notifyProFeature, setProFeaturePromoHandler } from "../Misc/ProFeature/proFeatureUtils";
import { isSalesTicket } from "../../utils/salesTicketUtils";
import SupportCreditPackModal from "../AdminPage/SupportCreditPackModal";
import AntivirusConfigModal from "./AntivirusConfigModal";
import BackupConfigModal from "./BackupConfigModal";
import AntivirusSolutionPickerModal from "./AntivirusSolutionPickerModal";
import AntispamConfigModal from "./AntispamConfigModal";
import AntispamSolutionPickerModal from "./AntispamSolutionPickerModal";
import MicrosoftTenantConfigModal from "./MicrosoftTenantConfigModal";
import MicrosoftTenantSolutionPickerModal from "./MicrosoftTenantSolutionPickerModal";
import CampaignFormModal from "../CybersecuritePage/CampaignFormModal";
import CampaignPickerModal from "./CampaignPickerModal";
import { getCybersecuritePageCopy } from "../CybersecuritePage/cybersecuritePageI18n";
import { listConfiguredAntivirusSolutions, listOverviewAntivirusSolutions, mergeAntivirusSources, normalizeAntivirusItem, removeAntivirusSolution, reorderAntivirusSolutions, buildAntivirusDetailNavigationPayload } from "./antivirusSolutionUtils";
import { listConfiguredAntispamSolutions, listOverviewAntispamSolutions, mergeAntispamSources, normalizeAntispamItem, removeAntispamSolution, reorderAntispamSolutions, buildAntispamDetailNavigationPayload } from "./antispamSolutionUtils";
import { buildMicrosoftTenantDetailNavigationPayload, listConfiguredMicrosoftTenants, removeMicrosoftTenant } from "./microsoftTenantSolutionUtils";
import { extractDomainsFromModules, listConfiguredDomains, removeMonitoredDomain, reorderMonitoredDomains } from "./domainSolutionUtils";
import { buildBitdefenderQueryParams } from "../../api/clientBitdefender";
import PageGuideTour from "../PageGuide/PageGuideTour";
import { getEnterpriseDetailGuideSteps } from "../PageGuide/enterpriseDetailGuideSteps";
import { useRegisterPageGuide } from "../../hooks/useRegisterPageGuide";
import { FaArrowLeft, FaCamera, FaPencilAlt, FaTimes, FaPlus, FaFileExport, FaEthernet } from "react-icons/fa";
import { IoServerSharp } from "react-icons/io5";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
const DEMO_PRESTATION_TICKETS = [{
  id: "demo-prestation-1",
  ticket_number: "1284",
  category: "prestation-intervention-site",
  status: "new",
  created_at: new Date(Date.now() - 86400000 * 3).toISOString()
}, {
  id: "demo-prestation-2",
  ticket_number: "1271",
  category: "prestation-formation",
  status: "in_progress",
  created_at: new Date(Date.now() - 86400000 * 8).toISOString()
}];
const DEMO_CAMPAIGNS = [{
  id: "demo-campaign-1",
  name: "Sensibilisation phishing Q2",
  type: "phishing_simulation",
  status: "active",
  global_progress: 42,
  start_date: new Date(Date.now() - 86400000 * 14).toISOString()
}, {
  id: "demo-campaign-2",
  name: "GDPR compliance audit",
  type: "rgpd_audit",
  status: "en_preparation",
  global_progress: 12,
  start_date: new Date(Date.now() + 86400000 * 7).toISOString()
}];
const isOngoingCampaign = campaign => {
  const status = String(campaign?.status || "").toLowerCase();
  return status === "active" || status === "en_cours" || status === "en_preparation" || status === "suspendue";
};
const isPrestationTicket = ticket => isSalesTicket(ticket);
const normalizeTicketStatus = status => status === "open" ? "new" : status;
function getContactInitials(contact) {
  const prenom = (contact?.prenom || "").trim();
  const nom = (contact?.nom || "").trim();
  if (prenom && nom) return `${prenom[0]}${nom[0]}`.toUpperCase();
  return (nom || prenom || "-").slice(0, 2).toUpperCase();
}
function SidebarExpandToggle({
  expanded,
  onClick,
  panelStyles,
  copy
}) {
  return <div className={panelStyles.sidebarShowMoreWrap}>
      <button type="button" className={panelStyles.sidebarShowMoreBtn} onClick={onClick} aria-expanded={expanded} aria-label={expanded ? copy.sidebar.collapseSection : copy.sidebar.expandSection}>
        <Icon icon={expanded ? "mdi:chevron-up" : "mdi:chevron-down"} className={panelStyles.sidebarShowMoreIcon} aria-hidden />
        <span>{expanded ? copy.sidebar.showLess : copy.sidebar.showMore}</span>
      </button>
    </div>;
}
const SITES_PAGE_SIZE = 5;
function extractAntivirusFromModules(modulesData) {
  const equipements = modulesData?.equipements;
  const antivirus = equipements?.Antivirus;
  if (antivirus?.solutions?.length) {
    return antivirus.solutions.map(s => ({
      ...s,
      nom: s.solution || s.nom || s.logiciel || s.name || "N/A",
      name: s.solution || s.nom || s.logiciel || s.name || "N/A",
      solution: s.solution || s.nom || s.logiciel || s.name || "N/A"
    }));
  }
  if (Array.isArray(antivirus) && antivirus.length > 0) return antivirus;
  const monitoring = modulesData?.modules_monitoring || {};
  return Object.entries(monitoring).filter(([key, value]) => key.toLowerCase().includes("antivirus") && value).map(([key]) => ({
    name: key,
    nom: key,
    solution: key,
    actif: true,
    type: "antivirus",
    utilisateurs: "N/A",
    expiration: null
  }));
}
function extractAntispamFromModules(modulesData) {
  const equipements = modulesData?.equipements;
  const antispam = equipements?.Antispam;
  if (antispam?.solutions?.length) {
    return antispam.solutions.map(s => ({
      ...s,
      customerId: s.customerId || s.authClientId || s.syncData?.customer?.id || null,
      providerId: s.providerId || (s.customerId || s.mailinblackTenantId ? "mailinblack" : null),
      mappingMode: s.mappingMode || (s.mailinblackTenantId ? "dedicated" : "reseller"),
      nom: s.logiciel || s.nom || s.name || s.solution || "N/A",
      name: s.logiciel || s.nom || s.name || s.solution || "N/A",
      solution: s.logiciel || s.nom || s.name || s.solution || "N/A"
    }));
  }
  if (Array.isArray(antispam) && antispam.length > 0) return antispam;
  const monitoring = modulesData?.modules_monitoring || {};
  return Object.entries(monitoring).filter(([key, value]) => key.toLowerCase().includes("antispam") && value).map(([key]) => ({
    name: key,
    nom: key,
    solution: key,
    actif: true,
    type: "antispam",
    utilisateurs: "N/A",
    expiration: null
  }));
}
function extractLicensesFromModules(modulesData) {
  const licences = modulesData?.equipements?.LicensesAbonnements;
  if (!Array.isArray(licences) || licences.length === 0) return [];
  return licences.map(item => ({
    ...item,
    nom: item.nom || item.name || item.item_key || "-",
    expiration: item.expiration || item.data?.expiration || null,
    fournisseur: item.fournisseur || item.data?.fournisseur || null,
    notes: item.notes || item.data?.notes || null
  }));
}
function buildJobCheckmkMapping(job, mappingRow = null) {
  const host = mappingRow?.checkmk_host_name || job?.checkmk_host_name || job?.checkmkMapping?.checkmk_host_name || null;
  const site = mappingRow?.checkmk_site || job?.checkmk_site || job?.checkmkMapping?.checkmk_site || null;
  const service = mappingRow?.checkmk_service_name || job?.checkmk_service_name || job?.checkmkMapping?.checkmk_service_name || null;
  if (!host && !service) return null;
  return {
    checkmk_host_name: host && String(host).trim() ? String(host).trim() : null,
    checkmk_site: site && String(site).trim() ? String(site).trim() : null,
    checkmk_service_name: service && String(service).trim() ? String(service).trim() : null,
    is_active: mappingRow?.is_active !== false
  };
}
function isBackupJobCheckmkMapped(job, mappingRow = null) {
  const mapping = buildJobCheckmkMapping(job, mappingRow);
  return Boolean(mapping?.checkmk_host_name);
}
function parseBackupDataFromModules(modulesData, mappingsMap = {}) {
  const sauvegarde = modulesData?.equipements?.Sauvegarde;
  if (!sauvegarde) return {
    instances: [],
    jobs: []
  };
  const instances = sauvegarde.instances || [];
  const allInstances = [];
  const allJobs = [];
  instances.forEach(instance => {
    const jobs = instance.jobs || [];
    const jobsCount = jobs.length;
    const mappedJobsCount = jobs.filter(job => {
      const jobId = job.id || `job-${instance.id}-${job.nom}`;
      return isBackupJobCheckmkMapped(job, mappingsMap[jobId]);
    }).length;
    allInstances.push({
      id: instance.id || instance.instanceId,
      logiciel: instance.logiciel || "",
      server: instance.server || "",
      version: instance.version || "",
      expiration: instance.expiration || "",
      jobsCount,
      mappedJobsCount
    });
    jobs.forEach(job => {
      const jobId = job.id || `job-${instance.id}-${job.nom}`;
      allJobs.push({
        id: jobId,
        instanceId: instance.id || instance.instanceId,
        instanceLogiciel: instance.logiciel || "",
        nom: job.nom || "",
        typeBackup: pickBackupJobType(job),
        regularite: job.regularite || "",
        horaire: job.horaire || "",
        retention: job.retention || "",
        serveurLie: normalizeServeurLieList(job.serveurLie),
        isMapped: isBackupJobCheckmkMapped(job, mappingsMap[jobId]),
        checkmkMapping: buildJobCheckmkMapping(job, mappingsMap[jobId]),
        last_backup_date: job.last_backup_date ?? null,
        last_backup_start: job.last_backup_start ?? null,
        last_backup_duration: job.last_backup_duration ?? null
      });
    });
  });
  return {
    instances: allInstances,
    jobs: allJobs
  };
}
export default function ClientDetailPage({
  onNavigate,
  clientData
}) {
  const {
    clientId: urlClientId
  } = useParams();
  const navigate = useNavigate();
  const locale = useAppLocale();
  const common = useCommonCopy();
  const copy = useMemo(() => getEnterpriseDetailCopy(locale), [locale]);
  const vaultCopy = useMemo(() => getEnterpriseVaultCopy(locale), [locale]);
  const campaignsCopy = useMemo(() => getCybersecuritePageCopy(locale).campaigns, [locale]);
  const catalogTypes = usePlanningEventTypes();
  const eventTypeLabels = useMemo(() => {
    const base = getEventTypeLabels(locale) || {};
    const fromCatalog = {};
    const list = Array.isArray(catalogTypes) && catalogTypes.length > 0 ? catalogTypes : getPlanningEventTypesList();
    list.forEach(type => {
      if (type?.value) fromCatalog[type.value] = type.label || type.value;
    });
    return {
      ...base,
      ...fromCatalog
    };
  }, [locale, catalogTypes]);
  const {
    modules: contractModules,
    enabledModules
  } = useContractModuleOptions();
  const {
    user: currentUser,
    userRole
  } = useAuthContext();
  const {
    can
  } = usePermissions();
  const {
    isCommunity
  } = useVeritasEdition();
  const canEditClient = can("clients_detail.edit");
  const canDeleteClient = can("clients_detail.delete");
  const canReversibility = can("clients_detail.reversibility");
  const canManageTags = can("clients_detail.tags");
  const canAddCredits = can("clients_detail.credits");
  const canAddContact = can("clients_detail.add_contact") && can("contacts.create");
  const canAddPrestataire = can("clients_detail.add_prestataire") && can("prestataires_detail.edit");
  const canManageSites = can("clients_detail.sites");
  const canScheduleEvent = can("clients_detail.schedule_event") && can("planning.create");
  const canManageNotes = can("clients_detail.notes");
  const canManageSolutions = can("clients_detail.solutions");
  const canManageDevices = can("clients_detail.devices");
  const canManageCampaigns = can("clients_detail.campaigns");
  const canManageVault = can("clients_detail.vault");
  const resolvedClientId = urlClientId || clientData?.client?.id || clientData?.clientId || null;
  const initialPeripheralsUi = useMemo(
    () => readEnterprisePeripheralsUi(resolvedClientId),
    // Restore once per mount for this client id
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resolvedClientId]
  );
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enterpriseEditModalOpen, setEnterpriseEditModalOpen] = useState(false);
  const [generatingReversibility, setGeneratingReversibility] = useState(false);
  const [deletingClient, setDeletingClient] = useState(false);
  const [deleteClientModalOpen, setDeleteClientModalOpen] = useState(false);
  const [deletionBlockersModalOpen, setDeletionBlockersModalOpen] = useState(false);
  const [deletionCheckClient, setDeletionCheckClient] = useState(null);
  const [loadingDeletionCheck, setLoadingDeletionCheck] = useState(false);
  const [clientActionsMenuOpen, setClientActionsMenuOpen] = useState(false);
  const clientActionsMenuRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [photos, setPhotos] = useState([]);
  const [notes, setNotes] = useState([]);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteModalMode, setNoteModalMode] = useState("create");
  const [noteModalNoteId, setNoteModalNoteId] = useState(null);
  const [noteModalInitialContent, setNoteModalInitialContent] = useState("");
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [clientTags, setClientTags] = useState([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [addingTag, setAddingTag] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [sitesModalOpen, setSitesModalOpen] = useState(false);
  const [equipmentSearchQuery, setEquipmentSearchQuery] = useState(() => initialPeripheralsUi?.searchQuery || "");
  const [equipmentResultCount, setEquipmentResultCount] = useState(0);
  const [hardwareEquipmentTotalCount, setHardwareEquipmentTotalCount] = useState(0);
  const [equipmentExportMenuOpen, setEquipmentExportMenuOpen] = useState(false);
  const [activeEquipmentTableType, setActiveEquipmentTableType] = useState(() => initialPeripheralsUi?.activeType || null);
  const equipmentPageRef = useRef(null);
  const equipmentSectionRef = useRef(null);
  const pageRootRef = useRef(null);
  const peripheralsUiClientRef = useRef(resolvedClientId);
  const equipmentExportMenuRef = useRef(null);
  const vaultPanelRef = useRef(null);
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [prestataires, setPrestataires] = useState([]);
  const [loadingPrestataires, setLoadingPrestataires] = useState(false);
  const [slaExpanded, setSlaExpanded] = useState(false);
  const [creditsExpanded, setCreditsExpanded] = useState(false);
  const [slaNow, setSlaNow] = useState(() => Date.now());
  const [contactsExpanded, setContactsExpanded] = useState(false);
  const [prestatairesExpanded, setPrestatairesExpanded] = useState(false);
  const [sitesSearch, setSitesSearch] = useState("");
  const [sitesPage, setSitesPage] = useState(1);
  const [contactsSectionExpanded, setContactsSectionExpanded] = useState(false);
  const [prestatairesSectionExpanded, setPrestatairesSectionExpanded] = useState(false);
  const [sitesSectionExpanded, setSitesSectionExpanded] = useState(false);
  const [notesSectionExpanded, setNotesSectionExpanded] = useState(false);
  const [proPromoFeature, setProPromoFeature] = useState(null);
  const [supportCreditModalOpen, setSupportCreditModalOpen] = useState(false);
  const [infoExpanded, setInfoExpanded] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [showPrestataireModal, setShowPrestataireModal] = useState(false);
  const [availablePrestataires, setAvailablePrestataires] = useState([]);
  const [loadingAvailablePrestataires, setLoadingAvailablePrestataires] = useState(false);
  const [attachingPrestataire, setAttachingPrestataire] = useState(false);
  const [pageGuideOpen, setPageGuideOpen] = useState(false);
  const openPageGuide = useCallback(() => setPageGuideOpen(true), []);
  useRegisterPageGuide(openPageGuide);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const logsLimit = 10;
  const [equipmentTotals, setEquipmentTotals] = useState({
    byType: {},
    total: 0
  });
  const [loadingTotalEquipment, setLoadingTotalEquipment] = useState(true);
  const [checkmkStats, setCheckmkStats] = useState({
    stats: [],
    total: 0
  });
  const [loadingCheckMK, setLoadingCheckMK] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignPickerOpen, setCampaignPickerOpen] = useState(false);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [campaignFormData, setCampaignFormData] = useState({
    client_id: "",
    name: "",
    type: "microsoft_security",
    provider: "microsoft",
    tenant_id: "",
    azure_credential_id: "",
    status: "en_preparation",
    start_date: "",
    end_date: "",
    global_progress: 0,
    description: ""
  });
  const [supportTickets, setSupportTickets] = useState([]);
  const [supportCreditBalance, setSupportCreditBalance] = useState(null);
  const [supportCreditPacks, setSupportCreditPacks] = useState([]);
  const [prestationTickets, setPrestationTickets] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [loadingClientActivity, setLoadingClientActivity] = useState(false);
  const [antivirusData, setAntivirusData] = useState([]);
  const [antispamData, setAntispamData] = useState([]);
  const [mailinblackTenants, setMailinblackTenants] = useState([]);
  const [domainsData, setDomainsData] = useState([]);
  const [globalOvhConfigured, setGlobalOvhConfigured] = useState(false);
  const [sslData, setSslData] = useState([]);
  const [licencesData, setLicensesData] = useState([]);
  const [customFamilyMap, setCustomFamilyMap] = useState([]);
  const [customEquipmentModal, setCustomEquipmentModal] = useState(null);
  const [equipmentRevision, setEquipmentRevision] = useState(0);
  const [activeSiteFilter, setActiveSiteFilter] = useState(() => initialPeripheralsUi?.siteFilter || null);
  const [domainsModalOpen, setDomainsModalOpen] = useState(false);
  const [domainsConfigModalOpen, setDomainsConfigModalOpen] = useState(false);
  const [domainsConfigInitialSection, setDomainsConfigInitialSection] = useState("overview");
  const [domainsConfigInitialProviderId, setDomainsConfigInitialProviderId] = useState(null);
  const [domainPickerOpen, setDomainPickerOpen] = useState(false);
  const [domainPickerDomains, setDomainPickerDomains] = useState([]);
  const [domainOverviewOpen, setDomainOverviewOpen] = useState(false);
  const [domainOverviewItem, setDomainOverviewItem] = useState(null);
  const [sslModalOpen, setSslModalOpen] = useState(false);
  const [licencesModalOpen, setLicensesModalOpen] = useState(false);
  const [backupConfigModalOpen, setBackupConfigModalOpen] = useState(false);
  const [antivirusConfigModalOpen, setAntivirusConfigModalOpen] = useState(false);
  const [antivirusConfigInitialSection, setAntivirusConfigInitialSection] = useState("overview");
  const [antivirusConfigEditingSolution, setAntivirusConfigEditingSolution] = useState(null);
  const [antivirusPickerOpen, setAntivirusPickerOpen] = useState(false);
  const [antivirusPickerSolutions, setAntivirusPickerSolutions] = useState([]);
  const [antispamConfigModalOpen, setAntispamConfigModalOpen] = useState(false);
  const [antispamConfigInitialSection, setAntispamConfigInitialSection] = useState("overview");
  const [antispamConfigEditingSolution, setAntispamConfigEditingSolution] = useState(null);
  const [antispamPickerOpen, setAntispamPickerOpen] = useState(false);
  const [antispamPickerSolutions, setAntispamPickerSolutions] = useState([]);
  const [microsoftTenantConfigModalOpen, setMicrosoftTenantConfigModalOpen] = useState(false);
  const [microsoftTenantConfigInitialSection, setMicrosoftTenantConfigInitialSection] = useState("overview");
  const [microsoftTenantConfigEditingTenant, setMicrosoftTenantConfigEditingTenant] = useState(null);
  const [microsoftTenantPickerOpen, setMicrosoftTenantPickerOpen] = useState(false);
  const [microsoftTenantPickerTenants, setMicrosoftTenantPickerTenants] = useState([]);
  const openAntivirusConfigModal = useCallback((section = "overview", editingSolution = null) => {
    setAntivirusConfigInitialSection(section);
    setAntivirusConfigEditingSolution(editingSolution);
    setAntivirusConfigModalOpen(true);
  }, []);
  const navigateToAntivirusDetail = useCallback((item, options = {}) => {
    if (!onNavigate || !client?.id) return;
    const payload = buildAntivirusDetailNavigationPayload(client, item);
    if (!payload?.companyId) return;
    onNavigate("AntivirusDetail", payload, options);
  }, [onNavigate, client]);
  const openAntispamConfigModal = useCallback((section = "overview", editingSolution = null) => {
    setAntispamConfigInitialSection(section);
    setAntispamConfigEditingSolution(editingSolution);
    setAntispamConfigModalOpen(true);
  }, []);
  const navigateToAntispamDetail = useCallback((item, options = {}) => {
    if (!onNavigate || !client?.id) return;
    const payload = buildAntispamDetailNavigationPayload(client, item);
    if (!payload) return;
    onNavigate("AntispamDetail", payload, options);
  }, [onNavigate, client]);
  const openMicrosoftTenantConfigModal = useCallback((section = "overview", editingTenant = null) => {
    setMicrosoftTenantConfigInitialSection(section);
    setMicrosoftTenantConfigEditingTenant(editingTenant);
    setMicrosoftTenantConfigModalOpen(true);
  }, []);
  const navigateToMicrosoftTenantDetail = useCallback((credentials = null, options = {}) => {
    if (!onNavigate || !client?.id) return;
    const payload = buildMicrosoftTenantDetailNavigationPayload(client, credentials);
    if (!payload) return;
    onNavigate("TenantDetail", payload, options);
  }, [onNavigate, client]);
  const openDomainsConfigModal = useCallback((section = "overview", providerId = null) => {
    setDomainsConfigInitialSection(section);
    setDomainsConfigInitialProviderId(providerId);
    setDomainsConfigModalOpen(true);
  }, []);
  const [backupInstances, setBackupInstances] = useState([]);
  const [backupJobs, setBackupJobs] = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [userDetailsModalOpen, setUserDetailsModalOpen] = useState(false);
  const [selectedSecurityItem, setSelectedSecurityItem] = useState(null);
  const [antivirusDetailsModalOpen, setAntivirusDetailsModalOpen] = useState(false);
  const [selectedAntivirusItem, setSelectedAntivirusItem] = useState(null);
  const [antivirusDetailData, setAntivirusDetailData] = useState(null);
  const [loadingAntivirusDetails, setLoadingAntivirusDetails] = useState(false);
  const [serviceDetailsModalOpen, setServiceDetailsModalOpen] = useState(false);
  const [logDetailsModalOpen, setLogDetailsModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const headerRef = useRef(null);
  const loadControllerRef = useRef(null);
  const contactsControllerRef = useRef(null);
  const prestatairesControllerRef = useRef(null);
  const logsControllerRef = useRef(null);
  const isMountedRef = useRef(true);
  const loadRequestIdRef = useRef(0);
  const supportCreditsLoadGenRef = useRef(0);
  const modulesRequestRef = useRef({
    clientId: null,
    promise: null,
    data: null
  });
  const [monitoringModulesState, setMonitoringModulesState] = useState(null);
  const [initialMonitoringModules, setInitialMonitoringModules] = useState(null);
  const [loadingMonitoringModules, setLoadingMonitoringModules] = useState(false);
  const [formData, setFormData] = useState({
    clientNumber: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    addressStreet: "",
    addressPostalCode: "",
    addressCity: "",
    siret: "",
    secteur: "",
    commercialId: "",
    sites: [],
    primaryContact: emptyPrimaryContact(),
    contrat: {
      debut: "",
      expiration: ""
    },
    modules: {},
    statut: "actif"
  });
  const [initialFormData, setInitialFormData] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const uniqueAntivirusData = useMemo(() => {
    const seen = new Set();
    return (antivirusData || []).map(item => normalizeAntivirusItem(item)).filter(item => {
      if (!item?.companyId) return false;
      const key = `${item.companyId}|${item.mappingMode || "reseller"}|${item.bitdefenderTenantId || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [antivirusData]);
  const configuredAntivirusSolutions = useMemo(() => listConfiguredAntivirusSolutions(client, uniqueAntivirusData), [client, uniqueAntivirusData]);
  const uniqueAntispamData = useMemo(() => {
    const seen = new Set();
    return (antispamData || []).map(item => normalizeAntispamItem(item)).filter(item => {
      const key = (item?.id ?? item?.item_key ?? item?.nom ?? item?.name ?? item?.solution ?? "") + "";
      const normKey = key.toString().toLowerCase().trim();
      if (!normKey) return true;
      if (seen.has(normKey)) return false;
      seen.add(normKey);
      return true;
    });
  }, [antispamData]);
  const configuredAntispamSolutions = useMemo(() => listConfiguredAntispamSolutions(client, uniqueAntispamData, client?.equipements ? {
    equipements: client.equipements
  } : null, mailinblackTenants), [client, uniqueAntispamData, mailinblackTenants]);
  const configuredMicrosoftTenants = useMemo(() => listConfiguredMicrosoftTenants(client), [client]);
  useEffect(() => {
    if (!client?.id) {
      setMailinblackTenants([]);
      return;
    }
    listClientMailinblackTenants(client.id).then(result => setMailinblackTenants(result?.tenants || [])).catch(() => setMailinblackTenants([]));
  }, [client?.id]);
  const configuredDomains = useMemo(() => listConfiguredDomains(client, domainsData, client?.equipements ? {
    equipements: client.equipements
  } : null), [client, domainsData, equipmentRevision]);
  useEffect(() => {
    if (!client?.id) {
      setGlobalOvhConfigured(false);
      return;
    }
    getGlobalOvhStatus().then(status => setGlobalOvhConfigured(Boolean(status?.configured))).catch(() => setGlobalOvhConfigured(false));
  }, [client?.id]);
  const getContractModules = useCallback((source = {}) => {
    let modulesSource = source.options || source.modules || {};
    if (typeof modulesSource === "string") {
      try {
        modulesSource = JSON.parse(modulesSource);
      } catch {
        modulesSource = {};
      }
    }
    return normalizeClientOptions(modulesSource, contractModules);
  }, [contractModules]);
  const clientDisplayAddress = useMemo(() => buildClientAddress(formData), [formData.address, formData.addressStreet, formData.addressPostalCode, formData.addressCity]);
  const normalizeMonitoringModules = (source = {}) => {
    let raw = source?.modules_monitoring || source?.modules || source || {};
    if (typeof raw === "string") {
      try {
        raw = JSON.parse(raw);
      } catch (e) {
        raw = {};
      }
    }
    if (!raw || typeof raw !== "object") {
      raw = {};
    }
    return {
      Servers: Boolean(raw.Servers ?? raw.Server ?? raw.Servers),
      Storage: Boolean(raw.Storage ?? raw.Storage),
      Firewall: Boolean(raw.Firewall ?? raw.Firewalls),
      Backup: Boolean(raw.Backup),
      Antivirus: Boolean(raw.Antivirus),
      Antispam: Boolean(raw.Antispam),
      Office365: Boolean(raw.Office365),
      NDD: Boolean(raw.NDD),
      CertificatsSSL: Boolean(raw.CertificatsSSL),
      Internet: Boolean(raw.Internet),
      Switch: Boolean(raw.Switch ?? raw.Switches),
      BorneWifi: Boolean(raw.BorneWifi ?? raw.Wifi ?? raw.WiFi),
      Alimentation: Boolean(raw.Alimentation),
      Routeur: Boolean(raw.Routeur),
      TOIP: Boolean(raw.TOIP),
      Videosurveillance: Boolean(raw.Videosurveillance),
      ...raw
    };
  };
  const getContratData = (source = {}) => {
    let contratSource = source.contrat || {};
    if (typeof contratSource === 'string') {
      try {
        contratSource = JSON.parse(contratSource);
      } catch (e) {
        contratSource = {};
      }
    }
    if (!contratSource || typeof contratSource !== 'object') {
      contratSource = {};
    }
    return {
      ...contratSource,
      debut: contratSource.debut || "",
      expiration: contratSource.expiration || "",
      suspendu: Boolean(contratSource.suspendu)
    };
  };
  const normalizeSitesList = sites => serializeSitesForCompare(sites);
  const buildFormDataFromClient = (sourceClient, sourceContacts = []) => {
    if (!sourceClient) {
      return {
        clientNumber: "",
        name: "",
        email: "",
        phone: "",
        address: "",
        addressStreet: "",
        addressPostalCode: "",
        addressCity: "",
        siret: "",
        secteur: "",
        commercialId: "",
        sites: [],
        primaryContact: emptyPrimaryContact(),
        contrat: {
          debut: "",
          expiration: ""
        },
        modules: {},
        statut: "actif"
      };
    }
    const addressParts = splitClientAddress(sourceClient.address || "");
    const primary = pickPrimaryContact(sourceContacts, sourceClient?.id);
    return {
      clientNumber: getClientNumber(sourceClient) || "",
      name: sourceClient.name || "",
      email: sourceClient.email || "",
      phone: sourceClient.phone || "",
      address: sourceClient.address || "",
      ...addressParts,
      siret: sourceClient.siret || sourceClient.siren || "",
      secteur: sourceClient.secteur || sourceClient.sector || "",
      commercialId: sourceClient.commercial_id || sourceClient.commercialId || "",
      sites: normalizeClientSites(sourceClient.sites),
      primaryContact: primary ? mapContactToPrimary(primary) : emptyPrimaryContact(),
      contrat: getContratData(sourceClient),
      modules: getContractModules(sourceClient),
      statut: toCompanyStatusValue(sourceClient.statut)
    };
  };
  const cloneFormSnapshot = data => ({
    ...data,
    addressStreet: data.addressStreet || "",
    addressPostalCode: data.addressPostalCode || "",
    addressCity: data.addressCity || "",
    sites: [...(data.sites || [])],
    contrat: {
      ...(data.contrat || {})
    },
    modules: {
      ...(data.modules || {})
    },
    primaryContact: {
      ...(data.primaryContact || emptyPrimaryContact())
    }
  });
  const detectInfoChanges = (currentData, initialData) => {
    if (!initialData) return false;
    const infoFields = ["clientNumber", "name", "commercialId", "secteur", "addressStreet", "addressPostalCode", "addressCity", "statut"];
    for (const field of infoFields) {
      if (String(currentData[field] || "").trim() !== String(initialData[field] || "").trim()) {
        return true;
      }
    }
    if (normalizeLegalIdentifier(currentData.siret) !== normalizeLegalIdentifier(initialData.siret)) {
      return true;
    }
    if (normalizeSitesList(currentData.sites) !== normalizeSitesList(initialData.sites)) {
      return true;
    }
    const oldContrat = getContratData(initialData);
    const newContrat = getContratData({
      contrat: currentData.contrat
    });
    if (oldContrat.debut !== newContrat.debut) return true;
    if (oldContrat.expiration !== newContrat.expiration) return true;
    const oldSla = parseClientSla(oldContrat);
    const newSla = parseClientSla(newContrat);
    if (JSON.stringify(oldSla) !== JSON.stringify(newSla)) return true;
    const oldModules = getContractModules(initialData);
    const newModules = getContractModules({
      modules: currentData.modules
    });
    for (const key of Object.keys({
      ...oldModules,
      ...newModules
    })) {
      if (oldModules[key] !== newModules[key]) return true;
    }
    if (JSON.stringify(normalizePrimaryContact(currentData.primaryContact)) !== JSON.stringify(normalizePrimaryContact(initialData.primaryContact))) {
      return true;
    }
    return false;
  };
  const updateContratField = (field, value) => {
    updateFormData({
      ...formData,
      contrat: {
        ...formData.contrat,
        [field]: value
      }
    });
  };
  const updateFormData = newData => {
    setFormData(newData);
    if (initialFormData) {
      const changes = detectInfoChanges(newData, initialFormData);
      setHasChanges(changes);
    }
  };
  const notifyEnterprisesListRefresh = () => {
    window.dispatchEvent(new Event("refreshEnterprises"));
  };
  useEffect(() => {
    isMountedRef.current = true;
    const controller = createTrackedAbortController();
    loadControllerRef.current?.abort();
    loadControllerRef.current = controller;
    loadClientData(controller.signal);
    return () => {
      isMountedRef.current = false;
      controller.abort();
      contactsControllerRef.current?.abort();
      prestatairesControllerRef.current?.abort();
      logsControllerRef.current?.abort();
    };
  }, [urlClientId, clientData?.clientId, clientData?.client?.id]);
  useEffect(() => {
    const id = client?.id ?? null;
    const prev = peripheralsUiClientRef.current;
    peripheralsUiClientRef.current = id;
    if (!id) return;
    if (prev != null && String(prev) !== String(id)) {
      // Switched to another enterprise in the same mount: reset section chrome.
      setSlaExpanded(false);
      setContactsExpanded(false);
      setContactsSectionExpanded(false);
      setPrestatairesExpanded(false);
      setPrestatairesSectionExpanded(false);
      setSitesSectionExpanded(false);
      setNotesSectionExpanded(false);
      setInfoExpanded(isCommunity);
      setSitesSearch("");
      setSitesPage(1);
      const saved = readEnterprisePeripheralsUi(id);
      setActiveSiteFilter(saved?.siteFilter || null);
      setEquipmentSearchQuery(saved?.searchQuery || "");
      setActiveEquipmentTableType(saved?.activeType || null);
      return;
    }
    // Same client (or first resolve): keep restored peripherals UI; only apply community default for info panel.
    setInfoExpanded(prevExpanded => (prev == null ? isCommunity : prevExpanded));
  }, [client?.id, isCommunity]);
  useEffect(() => {
    if (!client?.id) return;
    writeEnterprisePeripheralsUi(client.id, {
      searchQuery: equipmentSearchQuery || "",
      siteFilter: activeSiteFilter || null,
      activeType: activeEquipmentTableType || null
    });
  }, [client?.id, equipmentSearchQuery, activeSiteFilter, activeEquipmentTableType]);
  useEffect(() => {
    const el = pageRootRef.current;
    if (!el || !client?.id) return undefined;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        writeEnterprisePeripheralsUi(client.id, {
          scrollY: el.scrollTop
        });
      });
    };
    el.addEventListener("scroll", onScroll, {
      passive: true
    });
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", onScroll);
      writeEnterprisePeripheralsUi(client.id, {
        scrollY: el.scrollTop
      });
    };
  }, [client?.id]);
  useEffect(() => {
    if (loading || !client?.id) return;
    const savedY = readEnterprisePeripheralsUi(client.id)?.scrollY;
    if (typeof savedY !== "number" || savedY <= 0) return;
    const el = pageRootRef.current;
    if (!el) return;
    const restore = () => {
      el.scrollTop = savedY;
    };
    const raf = requestAnimationFrame(() => {
      restore();
      // Second pass after panels/tables paint.
      requestAnimationFrame(restore);
    });
    const timeout = window.setTimeout(restore, 120);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
    };
  }, [loading, client?.id]);
  useEffect(() => {
    const timer = window.setInterval(() => setSlaNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    setProFeaturePromoHandler(featureKey => setProPromoFeature(featureKey));
    return () => setProFeaturePromoHandler(null);
  }, []);
  useEffect(() => {
    if (!activeSiteFilter) return;
    const sites = normalizeClientSites(formData.sites);
    // Avoid clearing a restored filter while sites are still loading.
    if (!sites.length) return;
    const stillExists = sites.some(site => getSiteLocationValue(site) === activeSiteFilter);
    if (!stillExists) setActiveSiteFilter(null);
  }, [formData.sites, activeSiteFilter]);
  const filteredCustomFamilyMap = useMemo(() => filterCustomFamilyMap(customFamilyMap, activeSiteFilter), [customFamilyMap, activeSiteFilter]);
  const heroEquipmentTotalCount = useMemo(() => {
    const customCount = (Array.isArray(customFamilyMap) ? customFamilyMap : []).reduce((sum, family) => sum + (Array.isArray(family?.items) ? family.items.length : 0), 0);
    return hardwareEquipmentTotalCount + customCount;
  }, [hardwareEquipmentTotalCount, customFamilyMap]);
  const refreshClientEquipment = useCallback(async () => {
    if (!client?.id) return null;
    const [modulesData, customFamilies] = await Promise.all([fetchClientModules(client.id), resolveClientCustomFamilyMap(client.id)]);
    const families = Array.isArray(customFamilies) ? customFamilies : [];
    setClient(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        equipements: modulesData?.equipements ?? prev.equipements
      };
    });
    setCustomFamilyMap(families);
    setEquipmentRevision(revision => revision + 1);
    loadTotalEquipment(client.id, null, modulesData);
    return {
      modulesData,
      customFamilies: families
    };
  }, [client?.id]);
  useEffect(() => {
    if (!client?.id) return undefined;
    const handleFamiliesUpdated = () => {
      void refreshClientEquipment();
    };
    window.addEventListener("equipmentFamiliesUpdated", handleFamiliesUpdated);
    return () => window.removeEventListener("equipmentFamiliesUpdated", handleFamiliesUpdated);
  }, [client?.id, refreshClientEquipment]);
  useEffect(() => {
    if (client?.id) {
      loadContacts(client.id);
      loadPrestataires(client.id);
      return;
    }
    contactsControllerRef.current?.abort();
    setLoadingContacts(false);
    prestatairesControllerRef.current?.abort();
    setLoadingPrestataires(false);
  }, [client?.id]);
  useEffect(() => {
    setEquipmentSearchQuery("");
    setEquipmentResultCount(0);
    setHardwareEquipmentTotalCount(0);
    setEquipmentExportMenuOpen(false);
    setClientActionsMenuOpen(false);
    setDeleteClientModalOpen(false);
  }, [client?.id]);
  useEffect(() => {
    if (!clientActionsMenuOpen) return;
    const handleClickOutside = e => {
      if (clientActionsMenuRef.current && !clientActionsMenuRef.current.contains(e.target)) {
        setClientActionsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [clientActionsMenuOpen]);
  useEffect(() => {
    if (!equipmentExportMenuOpen) return;
    const handleClickOutside = e => {
      if (equipmentExportMenuRef.current && !equipmentExportMenuRef.current.contains(e.target)) {
        setEquipmentExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [equipmentExportMenuOpen]);
  useEffect(() => {
    if (enterpriseEditModalOpen) return;
    setFormData(prev => ({
      ...prev,
      modules: normalizeClientOptions(prev.modules, contractModules)
    }));
  }, [contractModules, enterpriseEditModalOpen]);
  const getClientModulesOnce = async (clientId, signal) => {
    const cache = modulesRequestRef.current;
    if (cache.clientId === clientId && cache.data) {
      return cache.data;
    }
    if (cache.clientId === clientId && cache.promise) {
      return cache.promise;
    }
    const promise = fetchClientModules(clientId, {
      signal
    }).then(data => {
      modulesRequestRef.current = {
        clientId,
        promise: null,
        data
      };
      return data;
    }).catch(error => {
      modulesRequestRef.current = {
        clientId,
        promise: null,
        data: null
      };
      throw error;
    });
    modulesRequestRef.current = {
      clientId,
      promise,
      data: null
    };
    return promise;
  };
  const applyClientSnapshot = useCallback(clientInfo => {
    if (!clientInfo) return;
    setClient(clientInfo);
    const clientModules = getContractModules(clientInfo);
    setFormData({
      ...buildFormDataFromClient(clientInfo, []),
      modules: clientModules
    });
    if (window.updateTabTitle && clientInfo.name) {
      window.updateTabTitle("ContratDetail", {
        clientId: clientInfo.id,
        name: clientInfo.name,
        client_number: clientInfo.client_number ?? clientInfo.clientNumber
      });
    }
  }, [getContractModules]);
  const hydrateServicesFromModules = useCallback(modulesData => {
    if (!modulesData) return;
    setAntivirusData(extractAntivirusFromModules(modulesData));
    setAntispamData(extractAntispamFromModules(modulesData));
    setDomainsData(extractDomainsFromModules(modulesData));
    setLicensesData(extractLicensesFromModules(modulesData));
    const {
      instances,
      jobs
    } = parseBackupDataFromModules(modulesData);
    setBackupInstances(instances);
    setBackupJobs(jobs);
    setLoadingBackups(false);
  }, []);
  const openAntispamConfigEntry = useCallback(async () => {
    if (!client?.id) return;
    try {
      const [modulesData, tenantsResult] = await Promise.all([fetchClientModules(client.id), listClientMailinblackTenants(client.id).catch(() => ({
        tenants: []
      }))]);
      const tenants = tenantsResult?.tenants || [];
      setMailinblackTenants(tenants);
      const configured = listConfiguredAntispamSolutions(client, [], modulesData, tenants);
      if (configured.length > 0) {
        hydrateServicesFromModules(modulesData);
        setClient(prev => prev ? {
          ...prev,
          equipements: modulesData?.equipements ?? prev.equipements,
          modules_monitoring: modulesData?.modules_monitoring ?? prev.modules_monitoring
        } : prev);
        setAntispamPickerSolutions(configured);
        setAntispamPickerOpen(true);
        return;
      }
      openAntispamConfigModal("solution");
    } catch (error) {
      console.error(error);
      openAntispamConfigModal("solution");
    }
  }, [client, hydrateServicesFromModules, openAntispamConfigModal]);
  const refreshAntispamState = useCallback(async () => {
    if (!client?.id) return {
      modulesData: null,
      tenants: []
    };
    const [modulesData, tenantsResult] = await Promise.all([fetchClientModules(client.id), listClientMailinblackTenants(client.id).catch(() => ({
      tenants: []
    }))]);
    const tenants = tenantsResult?.tenants || [];
    setMailinblackTenants(tenants);
    hydrateServicesFromModules(modulesData);
    setClient(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        equipements: modulesData?.equipements ?? prev.equipements,
        modules_monitoring: modulesData?.modules_monitoring ?? prev.modules_monitoring
      };
    });
    setEquipmentRevision(revision => revision + 1);
    return {
      modulesData,
      tenants
    };
  }, [client?.id, hydrateServicesFromModules]);
  const refreshDomainsState = useCallback(async () => {
    if (!client?.id) return {
      modulesData: null,
      ovhConfigured: false
    };
    const [modulesData, ovhStatus] = await Promise.all([fetchClientModules(client.id), getGlobalOvhStatus().catch(() => ({
      configured: false
    }))]);
    const ovhConfigured = Boolean(ovhStatus?.configured);
    setGlobalOvhConfigured(ovhConfigured);
    const monitored = extractDomainsFromModules(modulesData);
    setDomainsData(monitored);
    hydrateServicesFromModules(modulesData);
    setClient(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        equipements: modulesData?.equipements ?? prev.equipements,
        modules_monitoring: modulesData?.modules_monitoring ?? prev.modules_monitoring
      };
    });
    setEquipmentRevision(revision => revision + 1);
    return {
      modulesData,
      ovhConfigured,
      domains: monitored
    };
  }, [client?.id, hydrateServicesFromModules]);
  const refreshAntivirusState = useCallback(async () => {
    if (!client?.id) return;
    const modulesData = await fetchClientModules(client.id);
    hydrateServicesFromModules(modulesData);
    setClient(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        equipements: modulesData?.equipements ?? prev.equipements,
        modules_monitoring: modulesData?.modules_monitoring ?? prev.modules_monitoring
      };
    });
    setEquipmentRevision(revision => revision + 1);
  }, [client?.id, hydrateServicesFromModules]);
  const handleRemoveAntivirusSolution = useCallback(async solution => {
    if (!client?.id) return;
    await removeAntivirusSolution(client.id, solution);
    await refreshAntivirusState();
  }, [client?.id, refreshAntivirusState]);
  const handleAntivirusBrickClick = useCallback(async () => {
    if (!client?.id) return;
    try {
      const modulesData = await fetchClientModules(client.id);
      const configured = listConfiguredAntivirusSolutions(client, [], modulesData);
      if (configured.length > 0) {
        hydrateServicesFromModules(modulesData);
        setClient(prev => prev ? {
          ...prev,
          equipements: modulesData?.equipements ?? prev.equipements,
          modules_monitoring: modulesData?.modules_monitoring ?? prev.modules_monitoring
        } : prev);
      }
      if (configured.length === 0) {
        openAntivirusConfigModal("solution");
        return;
      }
      setAntivirusPickerSolutions(configured);
      setAntivirusPickerOpen(true);
    } catch (error) {
      console.error(error);
      openAntivirusConfigModal("solution");
    }
  }, [client?.id, openAntivirusConfigModal, hydrateServicesFromModules]);
  const handleAntispamBrickClick = useCallback(async () => {
    if (!client?.id) return;
    try {
      const [modulesData, tenantsResult] = await Promise.all([fetchClientModules(client.id), listClientMailinblackTenants(client.id).catch(() => ({
        tenants: []
      }))]);
      const tenants = tenantsResult?.tenants || [];
      setMailinblackTenants(tenants);
      const configured = listConfiguredAntispamSolutions(client, [], modulesData, tenants);
      if (configured.length > 0) {
        hydrateServicesFromModules(modulesData);
        setClient(prev => prev ? {
          ...prev,
          equipements: modulesData?.equipements ?? prev.equipements,
          modules_monitoring: modulesData?.modules_monitoring ?? prev.modules_monitoring
        } : prev);
      }
      if (configured.length === 0) {
        openAntispamConfigModal("solution");
        return;
      }
      setAntispamPickerSolutions(configured);
      setAntispamPickerOpen(true);
    } catch (error) {
      console.error(error);
      openAntispamConfigModal("solution");
    }
  }, [client?.id, openAntispamConfigModal, hydrateServicesFromModules]);
  const refreshMicrosoftTenantState = useCallback(async () => {
    if (!client?.id) return [];
    try {
      const list = await listClientOffice365Credentials(client.id);
      const tenants = listConfiguredMicrosoftTenants(null, list);
      const hasCredentials = tenants.length > 0;
      setClient(prev => prev ? {
        ...prev,
        has_azure_credentials: hasCredentials,
        hasAzureCredentials: hasCredentials,
        azureHasCredentials: hasCredentials,
        azureCredentialsList: list
      } : prev);
      setEquipmentRevision(revision => revision + 1);
      return tenants;
    } catch (error) {
      console.error(error);
      return [];
    }
  }, [client?.id]);
  const handleMicrosoftTenantBrickClick = useCallback(async () => {
    if (!client?.id) return;
    try {
      const tenants = await refreshMicrosoftTenantState();
      if (tenants.length === 0) {
        openMicrosoftTenantConfigModal("configuration", null);
        return;
      }
      setMicrosoftTenantPickerTenants(tenants);
      setMicrosoftTenantPickerOpen(true);
    } catch (error) {
      console.error(error);
      openMicrosoftTenantConfigModal("configuration", null);
    }
  }, [client?.id, openMicrosoftTenantConfigModal, refreshMicrosoftTenantState]);
  const handleNddBrickClick = useCallback(async () => {
    if (!client?.id) return;
    try {
      const [modulesData, ovhStatus] = await Promise.all([fetchClientModules(client.id), getGlobalOvhStatus().catch(() => ({
        configured: false
      }))]);
      const ovhConfigured = Boolean(ovhStatus?.configured);
      setGlobalOvhConfigured(ovhConfigured);
      const configured = listConfiguredDomains(client, [], modulesData);
      if (configured.length > 0) {
        hydrateServicesFromModules(modulesData);
        setDomainsData(extractDomainsFromModules(modulesData));
        setClient(prev => prev ? {
          ...prev,
          equipements: modulesData?.equipements ?? prev.equipements,
          modules_monitoring: modulesData?.modules_monitoring ?? prev.modules_monitoring
        } : prev);
        setEquipmentRevision(revision => revision + 1);
        setDomainPickerDomains(configured);
        setDomainPickerOpen(true);
        return;
      }
      openDomainsConfigModal("provider");
    } catch (error) {
      console.error(error);
      openDomainsConfigModal("provider");
    }
  }, [client, openDomainsConfigModal, hydrateServicesFromModules]);
  const handleSslBrickClick = useCallback(async () => {
    if (!client?.id) return;
    try {
      const items = await fetchClientSslCertificates(client.id, {
        autoCheck: true
      });
      setSslData(items);
      setEquipmentRevision(revision => revision + 1);
      setSslModalOpen(true);
    } catch (error) {
      console.error(error);
      setSslModalOpen(true);
    }
  }, [client?.id]);
  const handleLicensesBrickClick = useCallback(async () => {
    if (!client?.id) return;
    try {
      const items = await fetchClientLicences(client.id);
      setLicensesData(items);
      setEquipmentRevision(revision => revision + 1);
      setLicensesModalOpen(true);
    } catch (error) {
      console.error(error);
      setLicensesModalOpen(true);
    }
  }, [client?.id]);
  const enrichAzureCredentials = async (clientInfo, signal, isCurrentRequest) => {
    if (!clientInfo?.id) return clientInfo;
    try {
      const credRes = await fetch(`${API_BASE_URL}/client-office365/${clientInfo.id}`, {
        credentials: "include",
        signal
      });
      if (!credRes.ok) return clientInfo;
      const credPayload = await credRes.json();
      const list = Array.isArray(credPayload?.credentialsList)
        ? credPayload.credentialsList
        : credPayload?.credentials
          ? [credPayload.credentials]
          : [];
      const hasAzureCredentials = list.length > 0;
      return {
        ...clientInfo,
        has_azure_credentials: hasAzureCredentials,
        hasAzureCredentials: hasAzureCredentials,
        azureHasCredentials: hasAzureCredentials,
        azureCredentialsList: list
      };
    } catch (e) {
      if (e?.name === "AbortError") throw e;
      return clientInfo;
    }
  };
  const loadClientData = async signal => {
    const requestId = ++loadRequestIdRef.current;
    const isCurrentRequest = () => loadRequestIdRef.current === requestId && loadControllerRef.current?.signal === signal;
    const prefetchClientId = urlClientId || clientData?.client?.id || clientData?.clientId || null;
    const optimisticClient = clientData?.client && prefetchClientId && String(clientData.client.id) === String(prefetchClientId) ? clientData.client : null;
    setError(null);
    setLoading(!optimisticClient);
    modulesRequestRef.current = {
      clientId: null,
      promise: null,
      data: null
    };
    setMonitoringModulesState(null);
    setInitialMonitoringModules(null);
    setCampaigns([]);
    setLoadingBackups(false);
    setEquipmentTotals({
      byType: {},
      total: 0
    });
    setHardwareEquipmentTotalCount(0);
    setLoadingTotalEquipment(true);
    setCheckmkStats({
      stats: [],
      total: 0
    });
    setLoadingCheckMK(false);
    setAntivirusData([]);
    setAntispamData([]);
    setDomainsData([]);
    setSslData([]);
    setLicensesData([]);
    setCustomFamilyMap([]);
    setBackupInstances([]);
    setBackupJobs([]);
    setDocuments([]);
    setContacts([]);
    setPrestataires([]);
    setLogs([]);
    setLogsTotal(0);
    setLogsPage(1);
    setPhotos([]);
    setNotes([]);
    setClientTags([]);
    setSupportTickets([]);
    setPrestationTickets([]);
    setUpcomingEvents([]);
    setRecentEvents([]);
    setSupportCreditBalance(null);
    setSupportCreditPacks([]);
    setTagModalOpen(false);
    setNoteModalOpen(false);
    setNoteModalNoteId(null);
    setNoteModalInitialContent("");
    setUsers([]);
    setLoadingUsers(true);
    setLoadingContacts(false);
    setLoadingPrestataires(false);
    setLoadingLogs(false);
    if (optimisticClient && isMountedRef.current) {
      applyClientSnapshot(optimisticClient);
      hydrateServicesFromModules(optimisticClient.equipements ? {
        equipements: optimisticClient.equipements
      } : null);
      setLoading(false);
    } else {
      setClient(null);
    }
    try {
      const fetchClientById = async id => {
        const res = await fetch(`${API_BASE_URL}/clients/general/${id}`, {
          credentials: "include",
          signal
        });
        if (!res.ok) {
          throw new Error(copy.notFound);
        }
        return res.json();
      };
      let clientFetchPromise = null;
      if (urlClientId) {
        clientFetchPromise = fetchClientById(urlClientId);
      } else if (clientData?.client) {
        clientFetchPromise = fetchClientById(clientData.client.id);
      } else if (clientData?.clientId) {
        clientFetchPromise = fetchClientById(clientData.clientId);
      }
      const modulesPromise = prefetchClientId ? getClientModulesOnce(prefetchClientId, signal).catch(() => null) : Promise.resolve(null);
      const [clientInfo, modulesData] = await Promise.all([clientFetchPromise, modulesPromise]);
      if (!clientInfo) {
        if (isCurrentRequest() && isMountedRef.current) {
          setError(copy.loadError);
          setLoading(false);
        }
        return;
      }
      if (signal?.aborted || !isCurrentRequest()) return;
      applyClientSnapshot({
        ...clientInfo,
        equipements: modulesData?.equipements ?? clientInfo.equipements ?? {},
        modules_monitoring: modulesData?.modules_monitoring ?? clientInfo.modules_monitoring ?? {}
      });
      hydrateServicesFromModules(modulesData);
      if (!modulesData?.equipements && clientInfo.equipements) {
        hydrateServicesFromModules({
          equipements: clientInfo.equipements
        });
      }
      setLoading(false);
      enrichAzureCredentials(clientInfo, signal, isCurrentRequest).then(enriched => {
        if (!signal?.aborted && isCurrentRequest() && isMountedRef.current && enriched !== clientInfo) {
          setClient(enriched);
        }
      }).catch(e => {
        if (e?.name !== "AbortError") console.error("Error credentials Azure:", e);
      });
      void fetchUsers({
        signal
      }).then(usersData => {
        if (!signal?.aborted && isCurrentRequest() && isMountedRef.current) {
          setUsers(Array.isArray(usersData) ? usersData : []);
        }
      }).catch(async err => {
        if (err?.name === "AbortError") return;
        try {
          const activeUsers = await fetchActiveUsers({
            signal
          });
          if (!signal?.aborted && isCurrentRequest() && isMountedRef.current) {
            setUsers(Array.isArray(activeUsers) ? activeUsers : []);
          }
        } catch (fallbackErr) {
          if (fallbackErr?.name !== "AbortError") console.error("Error chargement utilisateurs:", fallbackErr);
        }
      }).finally(() => {
        if (isCurrentRequest() && isMountedRef.current) setLoadingUsers(false);
      });
      void loadClientModules(clientInfo.id, modulesData, clientInfo);
      const parallelLoads = [loadCustomFamilyMap(clientInfo.id, signal), loadClientTagsAndNotes(clientInfo.id, signal), loadClientActivity(clientInfo.id, signal), loadTotalEquipment(clientInfo.id, clientInfo, modulesData, signal), loadBackupData(clientInfo.id, signal, {
        silent: true
      })];
      if (!isCommunity) {
        parallelLoads.unshift(loadCampaigns(clientInfo.id, signal), loadCybersecurityData(clientInfo.id, signal));
      } else {
        parallelLoads.unshift(loadSslLicensesData(clientInfo.id, signal));
      }
      void Promise.all(parallelLoads);
    } catch (err) {
      if (err?.name === "AbortError") return;
      if (isCurrentRequest() && isMountedRef.current) {
        setError(err.message || copy.loadError);
        setLoading(false);
      }
      console.error("Error loading data client:", err);
    }
  };
  const loadClientModules = async (clientId = null, modulesData = null, clientSnapshot = null) => {
    const targetClientId = clientId || client?.id;
    if (!targetClientId) {
      return;
    }
    setLoadingMonitoringModules(true);
    try {
      const normalizedMonitoring = normalizeMonitoringModules(clientSnapshot || modulesData?.modules_monitoring || client);
      setMonitoringModulesState(normalizedMonitoring);
      setInitialMonitoringModules(normalizedMonitoring);
    } finally {
      setLoadingMonitoringModules(false);
    }
  };
  const loadContacts = async (clientId = null, signal) => {
    const targetClientId = clientId || client?.id;
    if (!targetClientId) return;
    let requestSignal = signal;
    if (!requestSignal) {
      contactsControllerRef.current?.abort();
      const controller = createTrackedAbortController();
      contactsControllerRef.current = controller;
      requestSignal = controller.signal;
    }
    setLoadingContacts(true);
    try {
      const contactsData = await fetchContacts(targetClientId, {
        signal: requestSignal
      });
      if (requestSignal?.aborted || !isMountedRef.current) return;
      setContacts(Array.isArray(contactsData) ? contactsData : []);
      if (isMountedRef.current && String(targetClientId) === String(client?.id)) {
        const primary = pickPrimaryContact(contactsData, targetClientId);
        setFormData(prev => ({
          ...prev,
          primaryContact: primary ? mapContactToPrimary(primary) : prev.primaryContact || emptyPrimaryContact()
        }));
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("Error chargement contacts:", err);
      }
    } finally {
      if (isMountedRef.current) setLoadingContacts(false);
    }
  };
  const loadPrestataires = async (clientId = null, signal) => {
    const targetClientId = clientId || client?.id;
    if (!targetClientId) return;
    let requestSignal = signal;
    if (!requestSignal) {
      prestatairesControllerRef.current?.abort();
      const controller = createTrackedAbortController();
      prestatairesControllerRef.current = controller;
      requestSignal = controller.signal;
    }
    setLoadingPrestataires(true);
    try {
      const data = await fetchPrestataires(targetClientId, {
        signal: requestSignal
      });
      if (requestSignal?.aborted || !isMountedRef.current) return;
      setPrestataires(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("Error chargement prestataires:", err);
      }
    } finally {
      if (isMountedRef.current) setLoadingPrestataires(false);
    }
  };

  const openPrestataireAttachModal = async () => {
    if (!client?.id) return;
    setShowPrestataireModal(true);
    setLoadingAvailablePrestataires(true);
    try {
      const all = await fetchPrestatairesList();
      const linkedIds = new Set((Array.isArray(prestataires) ? prestataires : []).map(row => String(row.id)));
      const available = (Array.isArray(all) ? all : []).filter(row => !linkedIds.has(String(row.id)));
      if (!isMountedRef.current) return;
      setAvailablePrestataires(available);
    } catch (err) {
      console.error("Error chargement prestataires disponibles:", err);
      if (isMountedRef.current) setAvailablePrestataires([]);
      toast.error(err.message || copy.loadProvidersError || "Impossible de charger les prestataires");
    } finally {
      if (isMountedRef.current) setLoadingAvailablePrestataires(false);
    }
  };

  const handleAttachPrestataire = async row => {
    if (!client?.id || !row?.id || attachingPrestataire) return;
    setAttachingPrestataire(true);
    try {
      await addPrestataireMembership(row.id, { client_id: client.id });
      toast.success(copy.providerLinked || "Prestataire rattaché");
      setShowPrestataireModal(false);
      await loadPrestataires(client.id);
    } catch (err) {
      toast.error(err.message || copy.providerLinkError || "Impossible de rattacher le prestataire");
    } finally {
      setAttachingPrestataire(false);
    }
  };
  const loadLogs = async (page = 1, clientId = null, signal) => {
    const targetClientId = clientId || client?.id;
    if (!targetClientId) {
      return;
    }
    let requestSignal = signal;
    if (!requestSignal) {
      logsControllerRef.current?.abort();
      const controller = createTrackedAbortController();
      logsControllerRef.current = controller;
      requestSignal = controller.signal;
    }
    setLoadingLogs(true);
    try {
      const data = await getClientLogs(targetClientId, page, logsLimit, {
        signal: requestSignal
      });
      if (requestSignal?.aborted || !isMountedRef.current) return;
      setLogs(data.logs || []);
      setLogsTotal(data.total || 0);
      setLogsPage(page);
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error("Error while loading des logs:", error);
      setLogs([]);
      setLogsTotal(0);
    } finally {
      if (isMountedRef.current) setLoadingLogs(false);
    }
  };
  const loadCheckMKStats = async (clientId = null, signal) => {
    const targetClientId = clientId || client?.id;
    if (!targetClientId) {
      return;
    }
    setLoadingCheckMK(true);
    try {
      const stats = await getClientCheckMKStats(targetClientId, {
        signal
      });
      if (signal?.aborted) return;
      setCheckmkStats(stats || {
        stats: [],
        total: 0
      });
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error("Error while loading des statistiques CheckMK:", error);
      setCheckmkStats({
        stats: [],
        total: 0
      });
    } finally {
      setLoadingCheckMK(false);
    }
  };
  const loadCampaigns = async (clientId = null, signal) => {
    const targetClientId = clientId || client?.id;
    if (!targetClientId) {
      return;
    }
    try {
      const campaignsData = await getClientCampaigns(targetClientId, {}, {
        signal
      });
      if (signal?.aborted) return;
      setCampaigns(campaignsData || []);
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error("Error while loading des campagnes:", error);
      setCampaigns([]);
    }
  };
  const loadClientTagsAndNotes = async (clientId = null, signal) => {
    const targetClientId = clientId || client?.id;
    if (!targetClientId) return;
    setLoadingTags(true);
    setLoadingNotes(true);
    try {
      const [tags, notesData] = await Promise.all([fetchClientTags(targetClientId, {
        signal
      }), fetchClientNotes(targetClientId, {
        signal
      })]);
      if (signal?.aborted || !isMountedRef.current) return;
      setClientTags(Array.isArray(tags) ? tags : []);
      setNotes(Array.isArray(notesData) ? notesData : []);
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error("Error lors du loading des tags/notes:", error);
      if (isMountedRef.current) {
        setClientTags([]);
        setNotes([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingTags(false);
        setLoadingNotes(false);
      }
    }
  };
  const loadClientActivity = async (clientId = null, signal) => {
    const targetClientId = clientId || client?.id;
    if (!targetClientId) return;
    setLoadingClientActivity(true);
    try {
      const ticketRows = await fetchTickets({
        clientId: targetClientId,
        limit: 100
      }).catch(() => []);
      let upcomingRows = [];
      let recentRows = [];
      // Credits are loaded independently so edition/community flags and event aborts
      // cannot wipe a successful pack list after F5.
      const creditsGenAtStart = supportCreditsLoadGenRef.current;
      const creditsPromise = fetchClientSupportCredits(targetClientId, {
        signal
      }).then(summary => ({
        ok: true,
        summary
      })).catch(error => {
        if (error?.name === "AbortError") return {
          ok: false,
          aborted: true
        };
        console.error("Error loading support credits:", error);
        return {
          ok: false,
          aborted: false
        };
      });
      if (!isCommunity) {
        [upcomingRows, recentRows] = await Promise.all([fetchEvents({
          clientId: targetClientId,
          upcoming: true,
          limit: 50,
          signal
        }).catch(() => []), fetchEvents({
          clientId: targetClientId,
          recent: true,
          limit: 50,
          signal
        }).catch(() => [])]);
      }
      const creditsResult = await creditsPromise;
      if (signal?.aborted || !isMountedRef.current) return;
      if (creditsResult?.ok && creditsGenAtStart === supportCreditsLoadGenRef.current) {
        const creditSummary = creditsResult.summary;
        const packs = Array.isArray(creditSummary?.packs) ? creditSummary.packs : [];
        setSupportCreditBalance(Number(creditSummary?.balance ?? 0));
        setSupportCreditPacks(packs);
        if (packs.length > 0) setCreditsExpanded(true);
      }
      const tickets = Array.isArray(ticketRows) ? ticketRows : [];
      const upcomingList = Array.isArray(upcomingRows) ? upcomingRows : [];
      const recentList = Array.isArray(recentRows) ? recentRows : [];
      const prestations = tickets.filter(isPrestationTicket);
      const support = tickets.filter(ticket => !isPrestationTicket(ticket));
      setPrestationTickets(prestations);
      setSupportTickets(support);
      setUpcomingEvents(filterUpcomingEvents(upcomingList));
      setRecentEvents(filterRecentEvents(recentList));
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error("Error loading client activity:", error);
      if (isMountedRef.current) {
        setSupportTickets([]);
        setPrestationTickets([]);
        setUpcomingEvents([]);
        setRecentEvents([]);
      }
    } finally {
      if (isMountedRef.current) setLoadingClientActivity(false);
    }
  };
  const handleOpenTicket = (ticket, background = false) => {
    if (!ticket?.id || !onNavigate) return;
    const isSales = isSalesTicket(ticket);
    onNavigate(isSales ? "TicketSalesDetail" : "TicketDetail", {
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number,
      title: ticket.title,
      ...(isSales ? {
        ticketFamily: "sales",
        fromPage: "TicketSales"
      } : {
        ticketFamily: "support",
        fromPage: "Ticket"
      })
    }, background ? {
      background: true
    } : undefined);
  };
  const handleOpenCampaign = campaign => {
    if (!campaign?.id || !onNavigate || isCommunity) return;
    onNavigate("CampaignDetail", {
      ...campaign,
      client_id: campaign.client_id || client?.id
    });
  };
  const buildDefaultCampaignForm = useCallback(() => {
    const today = new Date();
    const end = new Date(today);
    end.setMonth(end.getMonth() + 1);
    const toInputDate = d => d.toISOString().slice(0, 10);
    return {
      client_id: client?.id || "",
      name: "",
      type: "microsoft_security",
      provider: "microsoft",
      tenant_id: "",
      azure_credential_id: "",
      status: "en_preparation",
      start_date: toInputDate(today),
      end_date: toInputDate(end),
      global_progress: 0,
      description: ""
    };
  }, [client?.id]);
  const handleOpenCreateCampaign = () => {
    if (isCommunity || !client?.id || !canManageCampaigns) return;
    setCampaignFormData(buildDefaultCampaignForm());
    setShowCampaignModal(true);
  };
  const handleCampaignBrickClick = () => {
    if (isCommunity) {
      notifyProFeature(copy.proFeatures.campaigns, "cyberCampaigns");
      return;
    }
    if (!client?.id) return;
    if (campaigns.length === 0) {
      if (canManageCampaigns) handleOpenCreateCampaign();
      return;
    }
    setCampaignPickerOpen(true);
  };
  const handleSubmitCampaign = async e => {
    e?.preventDefault?.();
    if (!client?.id) return;
    if (!campaignFormData.client_id || !String(campaignFormData.name || "").trim() || !campaignFormData.type) {
      toast.error(campaignsCopy.toasts.requiredFields);
      return;
    }
    if (campaignFormData.type === "microsoft_security" && (!campaignFormData.tenant_id || !campaignFormData.azure_credential_id)) {
      toast.error(campaignsCopy.toasts.needMicrosoftTenant);
      return;
    }
    try {
      setSavingCampaign(true);
      const newCampaign = await createClientCampaign(client.id, {
        ...campaignFormData,
        client_id: client.id,
        type: "microsoft_security",
        locale
      });
      toast.success(campaignsCopy.toasts.created);
      setShowCampaignModal(false);
      setCampaignFormData(buildDefaultCampaignForm());
      await loadCampaigns(client.id);
      if (onNavigate && newCampaign) {
        onNavigate("CampaignDetail", {
          ...newCampaign,
          client_id: client.id,
          client_name: client.name || formData?.name || `Client ${client.id}`
        });
      }
    } catch (error) {
      console.error("Error creating campaign:", error);
      toast.error(error?.message || campaignsCopy.toasts.saveError);
    } finally {
      setSavingCampaign(false);
    }
  };
  const ongoingCampaigns = useMemo(() => {
    const source = isCommunity ? DEMO_CAMPAIGNS : campaigns;
    return source.filter(isOngoingCampaign);
  }, [campaigns, isCommunity]);

  const campaignBookmarkEvents = useMemo(
    () => (isCommunity ? [] : mapCampaignsToBookmarkEvents(campaigns, client?.id)),
    [campaigns, client?.id, isCommunity]
  );

  const upcomingEventsForBookmarks = useMemo(
    () => filterUpcomingEvents([...(Array.isArray(upcomingEvents) ? upcomingEvents : []), ...campaignBookmarkEvents]),
    [upcomingEvents, campaignBookmarkEvents]
  );

  const recentEventsForBookmarks = useMemo(
    () => filterRecentEvents([...(Array.isArray(recentEvents) ? recentEvents : []), ...campaignBookmarkEvents]),
    [recentEvents, campaignBookmarkEvents]
  );
  const handleReloadClientActivity = () => {
    if (client?.id) loadClientActivity(client.id);
  };
  const reloadSupportCredits = useCallback(async () => {
    if (!client?.id) return;
    const gen = ++supportCreditsLoadGenRef.current;
    try {
      const creditSummary = await fetchClientSupportCredits(client.id);
      if (gen !== supportCreditsLoadGenRef.current || !isMountedRef.current) return;
      const packs = Array.isArray(creditSummary?.packs) ? creditSummary.packs : [];
      setSupportCreditBalance(Number(creditSummary?.balance ?? 0));
      setSupportCreditPacks(packs);
      if (packs.length > 0) setCreditsExpanded(true);
    } catch (error) {
      console.error("Error reloading support credits:", error);
    }
  }, [client?.id]);
  const supportCreditPackSeed = useMemo(() => (client?.id ? { client_id: client.id } : null), [client?.id]);
  const supportCreditModalClients = useMemo(() => (client ? [client] : []), [client]);
  // If edition resolves to Pro after the first page load, credits must be (re)fetched.
  useEffect(() => {
    if (!client?.id || isCommunity) return;
    void reloadSupportCredits();
  }, [client?.id, isCommunity, reloadSupportCredits]);
  const handleOpenSupportCreditsAdmin = () => {
    try {
      sessionStorage.setItem("veritas_admin_nav", JSON.stringify({
        tab: "support-credits"
      }));
    } catch {}
    onNavigate?.("Admin");
  };
  const getEnterpriseEquipment = useCallback((tableType) => {
    if (!client?.id) return [];
    const familyKey = parseCustomFamilyType(tableType);
    if (familyKey) {
      const family = (customFamilyMap || []).find(entry => entry.familyKey === familyKey);
      const rawItems = Array.isArray(family?.items) ? family.items : [];
      let items = rawItems.map(item => mapCustomEquipmentItem(item, family || familyKey, {
        clientId: client.id,
        clientName: client.name || ""
      }));
      if (activeSiteFilter) {
        items = filterBySite(items, activeSiteFilter);
      }
      return items;
    }
    const clientForMap = {
      ...client,
      sites: formData.sites ?? client.sites ?? [],
      equipements: client.equipements || {}
    };
    let items = mapClientHardwareEquipment(clientForMap).filter(eq => equipmentMatchesFleetFamily(eq.type, tableType));
    if (activeSiteFilter) {
      items = filterBySite(items, activeSiteFilter);
    }
    return items;
  }, [client, formData.sites, activeSiteFilter, customFamilyMap]);
  const openComputerFleetStats = useCallback((options = {}) => {
    if (!client?.id) return;
    const tableType = options.equipmentType
      || activeEquipmentTableType
      || equipmentPageRef.current?.getEmbeddedActiveType?.()
      || "Ordinateurs";
    const fromEquipmentPage = equipmentPageRef.current?.getEquipmentForStats?.(tableType)
      || (tableType === "Ordinateurs" ? equipmentPageRef.current?.getComputersForStats?.() : null);
    const fallback = getEnterpriseEquipment(tableType);
    const items = Array.isArray(fromEquipmentPage) && fromEquipmentPage.length > 0 ? fromEquipmentPage : fallback;
    if (!items.length) {
      toast.info(copy.toast.noComputersToAnalyze);
      return;
    }
    const familyKey = parseCustomFamilyType(tableType);
    const customFamily = familyKey
      ? ((customFamilyMap || []).find(entry => entry.familyKey === familyKey) || null)
      : null;
    const familyLabel = customFamily?.label || familyKey || undefined;
    onNavigate?.("ComputerFleetStats", {
      clientId: client.id,
      clientName: getClientNameWithoutCode(client) || client?.name || "",
      client_number: getClientNumber(client) || undefined,
      equipmentType: tableType,
      familyLabel,
      familyIcon: customFamily?.icon || undefined,
      siteFilter: activeSiteFilter || null
    }, options.background ? {
      background: true
    } : undefined);
  }, [client, getEnterpriseEquipment, activeSiteFilter, activeEquipmentTableType, customFamilyMap, onNavigate, copy.toast.noComputersToAnalyze]);
  const equipmentStatsAction = useMemo(() => {
    const tableType = activeEquipmentTableType || equipmentPageRef.current?.getEmbeddedActiveType?.() || null;
    if (!tableType) return null;
    return {
      label: copy.computerFleetStats,
      run: () => openComputerFleetStats({ equipmentType: tableType })
    };
  }, [activeEquipmentTableType, openComputerFleetStats, copy.computerFleetStats]);
  const siteFilterBadge = activeSiteFilter ? <span className={styles.panelFilterBadge}>
      {interpolate(copy.filterBadge, {
      value: activeSiteFilter
    })}
      <button type="button" className={styles.panelFilterBadgeClear} onClick={() => setActiveSiteFilter(null)} aria-label={interpolate(copy.clearSiteFilterAria, {
      value: activeSiteFilter
    })} title={copy.clearSiteFilter}>
        <Icon icon="mdi:close" aria-hidden />
      </button>
    </span> : null;
  const handleInfraNodeClick = useCallback(node => {
    const familyKey = node?.familyKey || parseCustomFamilyType(node?.type);
    if (node?.equipment?.name && !node?.isCategory) {
      setEquipmentSearchQuery(node.equipment.name);
    }
    if (familyKey) {
      equipmentPageRef.current?.focusType?.(`Custom:${familyKey}`);
      equipmentSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
      return;
    }
    if (node?.type) {
      equipmentPageRef.current?.focusType?.(node.type);
    }
    equipmentSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }, []);
  const loadTotalEquipment = async (clientId = null, preloadedClientData = null, modulesData = null, signal) => {
    const targetClientId = clientId || client?.id;
    if (!targetClientId) {
      return;
    }
    setLoadingTotalEquipment(true);
    try {
      const totalsData = await getClientEquipmentTotal(targetClientId, {
        clientData: preloadedClientData,
        modulesData,
        signal
      });
      if (signal?.aborted) return;
      setEquipmentTotals(totalsData || {
        byType: {},
        total: 0
      });
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error("Error lors du loading des totaux d'equipments:", error);
      setEquipmentTotals({
        byType: {},
        total: 0
      });
    } finally {
      setLoadingTotalEquipment(false);
    }
  };
  const formatNoteDate = dateString => {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateString;
    }
  };
  const normalizePhoneForHref = value => {
    const raw = (value || "").toString().trim();
    if (!raw) return "";
    return raw.replace(/[^\d+]/g, "");
  };
  const toTelHref = value => {
    const normalized = normalizePhoneForHref(value);
    return normalized ? `tel:${normalized}` : "";
  };
  const toMailtoHref = value => {
    const email = (value || "").toString().trim();
    return email ? `mailto:${encodeURIComponent(email)}` : "";
  };
  const formatContactCommunicationLines = contact => normalizeContactCommunications(contact).map(entry => {
    const typeDef = getCommunicationTypeDef(entry.type);
    const favorite = entry.isPrimary ? " ★" : "";
    return `${typeDef.label}${favorite}: ${entry.value}`;
  });
  const copyContactCard = async contact => {
    const fullName = `${contact?.nom || ""} ${contact?.prenom || ""}`.trim() || copy.defaultContactName;
    const commLines = formatContactCommunicationLines(contact);
    const lines = [`${copy.table.name}: ${fullName}`, `${copy.share.role}: ${contact?.poste || copy.defaultContactName}`, ...(commLines.length > 0 ? commLines : [`${copy.share.email}: -`, `${copy.share.phone}: -`])];
    const payload = lines.join("\n");
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
        toast.success(copy.toast.contactCardCopied);
        return;
      }
      throw new Error("Clipboard API indisponible");
    } catch (error) {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = payload;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (!ok) throw new Error("Copy fallback failed");
        toast.success(copy.toast.contactCardCopied);
      } catch (fallbackError) {
        toast.error(copy.toast.contactCardCopyError);
      }
    }
  };
  const shareContactCard = async contact => {
    const fullName = `${contact?.nom || ""} ${contact?.prenom || ""}`.trim() || copy.defaultContactName;
    const commLines = formatContactCommunicationLines(contact);
    const lines = [`${copy.table.name}: ${fullName}`, `${copy.share.role}: ${contact?.poste || copy.defaultContactName}`, ...(commLines.length > 0 ? commLines : [`${copy.share.email}: -`, `${copy.share.phone}: -`])];
    const payload = lines.join("\n");
    try {
      if (navigator?.share) {
        await navigator.share({
          title: interpolate(copy.share.title, {
            name: fullName
          }),
          text: payload
        });
        return;
      }
      toast.info(copy.share.unavailable);
    } catch (e) {
      toast.info(copy.share.cancelled);
    }
  };
  const resolveContractStatus = (expirationDate, isSuspended = false) => getContractStatusDetail(expirationDate, isSuspended, locale);
  const handleBack = () => {
    if (onNavigate) {
      onNavigate("Contrat");
    } else {
      navigate("/?tab=Contrat");
    }
  };
  const detectChanges = (oldData, newData) => {
    const changes = [];
    const oldContrat = getContratData(oldData);
    const newContrat = newData.contrat ? getContratData({
      contrat: newData.contrat
    }) : null;
    const normalizeId = value => value === null || value === undefined ? '' : String(value);
    const simpleFields = [{
      key: 'name',
      label: 'nom'
    }, {
      key: 'email',
      label: 'email'
    }, {
      key: 'phone',
      label: 'phone'
    }, {
      key: 'address',
      label: 'adresse'
    }, {
      key: 'siret',
      label: 'legal identifier'
    }, {
      key: 'secteur',
      label: "business sector"
    }, {
      key: 'commercialId',
      label: 'commercial'
    }];
    if (newData.sites !== undefined) {
      const oldSerialized = serializeSitesForCompare(oldData.sites);
      const newSerialized = serializeSitesForCompare(newData.sites);
      if (oldSerialized !== newSerialized) {
        changes.push({
          field: 'sites',
          label: 'lieux',
          oldValue: formatSitesForLog(oldData.sites) || '',
          newValue: formatSitesForLog(newData.sites) || ''
        });
      }
    }
    simpleFields.forEach(({
      key,
      label
    }) => {
      const oldValue = key === 'commercialId' ? normalizeId(oldData.commercialId || oldData.commercial_id) : oldData[key] || '';
      const newValue = key === 'commercialId' ? normalizeId(newData[key]) : newData[key] || '';
      if (oldValue !== newValue) {
        changes.push({
          field: key,
          label: label,
          oldValue: oldValue,
          newValue: newValue
        });
      }
    });
    if (newContrat) {
      if (oldContrat.debut !== newContrat.debut) {
        changes.push({
          field: 'contrat.debut',
          label: 'contract start date',
          oldValue: oldContrat.debut || '',
          newValue: newContrat.debut || ''
        });
      }
      if (oldContrat.expiration !== newContrat.expiration) {
        changes.push({
          field: 'contrat.expiration',
          label: 'contract expiry date',
          oldValue: oldContrat.expiration || '',
          newValue: newContrat.expiration || ''
        });
      }
      if (oldContrat.suspendu !== newContrat.suspendu) {
        changes.push({
          field: 'contrat.suspendu',
          label: 'contract suspension',
          oldValue: oldContrat.suspendu ? 'suspended' : 'active',
          newValue: newContrat.suspendu ? 'suspended' : 'active'
        });
      }
      const oldType = String(oldContrat.type ?? "");
      const newType = String(newContrat.type ?? "");
      if (oldType !== newType) {
        changes.push({
          field: 'contrat.type',
          label: "company type",
          oldValue: getContractTypeLabel(oldType, locale),
          newValue: getContractTypeLabel(newType, locale)
        });
      }
      const oldSla = parseClientSla(oldContrat);
      const newSla = parseClientSla(newContrat);
      if (JSON.stringify(oldSla) !== JSON.stringify(newSla)) {
        changes.push({
          field: 'contrat.sla',
          label: 'SLA support',
          oldValue: oldSla.enabled ? 'enabled' : 'disabled',
          newValue: newSla.enabled ? 'enabled' : 'disabled'
        });
      }
    }
    if (newData.modules) {
      const oldModules = getContractModules(oldData);
      const newModules = getContractModules({
        modules: newData.modules
      });
      Object.keys({
        ...oldModules,
        ...newModules
      }).forEach(moduleKey => {
        if (oldModules[moduleKey] !== newModules[moduleKey]) {
          const moduleLabel = moduleKey === 'Hebergement' ? 'hosting' : moduleKey.toLowerCase();
          changes.push({
            field: `modules.${moduleKey}`,
            label: `${moduleLabel} module`,
            oldValue: oldModules[moduleKey] ? 'enabled' : 'disabled',
            newValue: newModules[moduleKey] ? 'enabled' : 'disabled'
          });
        }
      });
    }
    return changes;
  };
  const handleSave = async () => {
    if (!client?.id) return;
    setSaving(true);
    try {
      if (!initialFormData || !detectInfoChanges(formData, initialFormData)) {
        setEnterpriseEditModalOpen(false);
        setHasChanges(false);
        toast.info(copy.toast.noChanges);
        setSaving(false);
        return;
      }
      if (formData.contrat?.debut && formData.contrat?.expiration) {
        const startDate = new Date(formData.contrat.debut);
        const endDate = new Date(formData.contrat.expiration);
        if (endDate < startDate) {
          toast.error(copy.toast.expirationBeforeStart);
          setSaving(false);
          return;
        }
      }
      if (!formData.name?.trim()) {
        toast.error(copy.toast.nameRequired);
        setSaving(false);
        return;
      }
      // En édition, le contact principal n'est pas bloquant : on met à jour
      // l'entreprise même sans contact lié (création / rattachement optionnel).
      const existingContrat = getContratData(client);
      const contratPayload = {
        ...existingContrat,
        ...formData.contrat,
        type: formData.contrat?.type || existingContrat.type || "PROFESSIONNEL"
      };
      const fieldsToUpdate = {
        clientNumber: formData.clientNumber?.trim() || null,
        name: formData.name?.trim() || "",
        sites: formData.sites || [],
        commercialId: formData.commercialId || null,
        contrat: contratPayload,
        options: formData.modules,
        siret: normalizeLegalIdentifier(formData.siret) || null,
        address: buildClientAddress(formData),
        secteur: formData.secteur?.trim() || "",
        statut: toCompanyStatusValue(formData.statut)
      };
      const contactEmail = formData.primaryContact?.email?.trim();
      if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
        toast.error(copy.toast.primaryContactEmailInvalid);
        setSaving(false);
        return;
      }
      await updateClient(client.id, fieldsToUpdate);
      await saveClientModules(client.id, {
        modules: formData.modules
      });
      const primaryContact = formData.primaryContact || emptyPrimaryContact();
      if (primaryContact.nom?.trim()) {
        const posteValue = primaryContact.poste?.trim().toUpperCase() || "CONTACT PRINCIPAL";
        const makePrimary = isPrimaryContactPoste(posteValue);
        const contactPayload = buildContactApiPayload({
          nom: primaryContact.nom.trim(),
          prenom: primaryContact.prenom?.trim() || null,
          sexe: primaryContact.sexe?.trim() || null,
          email: primaryContact.email?.trim() || null,
          telephone: primaryContact.telephone?.trim() || null,
          communications: primaryContact.communications,
          poste: posteValue,
          statut: "actif",
          client_id: client.id
        });
        if (primaryContact.id) {
          const existingClients = Array.isArray(primaryContact.clients) ? primaryContact.clients : [];
          if (existingClients.length > 0) {
            const memberships = buildAdditiveMembershipsForEnterprise({
              clients: existingClients
            }, client.id, {
              poste: posteValue,
              isPrimary: makePrimary
            });
            await updateContact(primaryContact.id, {
              ...contactPayload,
              memberships
            });
          } else {
            // Dual-write: client_id alone adds a membership without wiping others.
            await updateContact(primaryContact.id, contactPayload);
            await addContactMembership(primaryContact.id, {
              client_id: client.id,
              poste: posteValue,
              is_primary: makePrimary
            });
          }
          if (makePrimary) {
            await setContactPrimaryForClient(primaryContact.id, client.id);
          }
        } else {
          await addContact({
            ...contactPayload,
            memberships: [{
              client_id: client.id,
              poste: posteValue,
              is_primary: makePrimary
            }]
          });
        }
        await loadContacts(client.id);
      }
      setClient(prev => ({
        ...prev,
        client_number: fieldsToUpdate.clientNumber,
        clientNumber: fieldsToUpdate.clientNumber,
        name: fieldsToUpdate.name,
        sites: fieldsToUpdate.sites,
        commercialId: fieldsToUpdate.commercialId,
        commercial_id: fieldsToUpdate.commercialId,
        contrat: contratPayload,
        options: formData.modules,
        modules: formData.modules,
        siret: fieldsToUpdate.siret,
        address: fieldsToUpdate.address,
        secteur: fieldsToUpdate.secteur
      }));
      notifyEnterprisesListRefresh();
      setEnterpriseEditModalOpen(false);
      setHasChanges(false);
      toast.success(copy.toast.saveSuccess);
    } catch (error) {
      console.error("Error lors de la sauvegarde:", error);
      toast.error(interpolate(copy.toast.saveError, {
        message: error.message
      }));
    } finally {
      setSaving(false);
    }
  };
  const handleCancel = () => {
    setFormData(buildFormDataFromClient(client, contacts));
    setEnterpriseEditModalOpen(false);
    setHasChanges(false);
  };
  const handleEditContact = contact => {
    setEditingContact(contact);
    setContactModalOpen(true);
  };
  const handleAddContact = () => {
    setEditingContact(null);
    setContactModalOpen(true);
  };
  const handleContactModalClose = () => {
    setContactModalOpen(false);
    setEditingContact(null);
  };
  const handleDeleteContact = async contactId => {
    if (!window.confirm(copy.confirmDeleteContact)) return;
    try {
      console.log('Delete contact:', contactId);
      await loadContacts(client.id);
      toast.success(copy.toast.contactDeleted);
    } catch (error) {
      console.error('Error suppression contact:', error);
      toast.error(copy.toast.contactDeleteError);
    }
  };
  const handleCancelInfo = () => {
    setFormData(buildFormDataFromClient(client, contacts));
    setEnterpriseEditModalOpen(false);
    setHasChanges(false);
    setDeletionCheckClient(null);
  };
  const openEnterpriseEditModal = () => {
    const snapshot = cloneFormSnapshot(buildFormDataFromClient(client, contacts));
    setFormData(snapshot);
    setInitialFormData(cloneFormSnapshot(snapshot));
    setHasChanges(false);
    setEnterpriseEditModalOpen(true);
    void loadDeletionCheck(client?.id);
  };
  const buildDeletionClientSnapshot = useCallback((baseClient, deletionCheck) => {
    if (!baseClient || !deletionCheck) return null;
    return {
      ...baseClient,
      deletable: deletionCheck.deletable,
      deletion_blockers: deletionCheck.blockers || [],
      deletion: {
        deletable: deletionCheck.deletable,
        blockers: deletionCheck.blockers || [],
        totalBlockers: deletionCheck.totalBlockers ?? 0
      }
    };
  }, []);
  const loadDeletionCheck = useCallback(async clientId => {
    if (!clientId) {
      setDeletionCheckClient(null);
      return;
    }
    setLoadingDeletionCheck(true);
    try {
      const status = await fetchClientDeletionCheck(clientId);
      setDeletionCheckClient(buildDeletionClientSnapshot(client, status));
    } catch (error) {
      console.error("Check company deletion:", error);
      setDeletionCheckClient(null);
    } finally {
      setLoadingDeletionCheck(false);
    }
  }, [buildDeletionClientSnapshot, client]);
  const deletionClientSnapshot = deletionCheckClient || client;
  const enterpriseDeletionBlocked = Boolean(deletionCheckClient) && !loadingDeletionCheck && !isClientDeletable(deletionCheckClient);
  const deleteBlockedTooltip = useMemo(() => {
    if (!enterpriseDeletionBlocked) return "";
    const snapshot = deletionCheckClient || client;
    const {
      total
    } = getLinkedElementsSummary(snapshot);
    const rows = getModalBlockerRows(snapshot);
    if (rows.length === 0) {
      return copy.deleteBlocked.generic;
    }
    const details = rows.map(row => `${row.label} (${row.value})`).join(", ");
    return interpolate(copy.deleteBlocked.withDetails, {
      total,
      details
    });
  }, [enterpriseDeletionBlocked, deletionCheckClient, client, copy]);
  const requestDeleteEnterpriseFromEdit = () => {
    if (loadingDeletionCheck || deletingClient || !deletionCheckClient) return;
    if (!isClientDeletable(deletionCheckClient)) {
      setDeletionBlockersModalOpen(true);
      return;
    }
    setDeleteClientModalOpen(true);
  };
  const handleExportReversibility = async () => {
    if (!client?.id || generatingReversibility) return;
    if (isCommunity) {
      notifyProFeature(copy.proFeatures.reversibility);
      return;
    }
    setGeneratingReversibility(true);
    try {
      const modulesData = await getClientModulesOnce(client.id).catch(() => null);
      await exportReversibilityFolder({
        client,
        formData,
        contacts,
        supportTickets,
        prestationTickets,
        upcomingEvents,
        campaigns,
        notes,
        clientTags,
        commercialLabel: client?.commercial || users.find(u => String(u.id) === String(formData.commercialId))?.username || users.find(u => String(u.id) === String(formData.commercialId))?.email || "",
        contractModules: getContractModules({
          modules: formData.modules
        }),
        modulesData
      });
      toast.success(copy.toast.reversibilityDownloaded);
    } catch (exportError) {
      console.error("Reversibility export:", exportError);
      toast.error(exportError?.message || copy.toast.reversibilityError);
    } finally {
      setGeneratingReversibility(false);
    }
  };
  const closeDeleteClientModal = () => {
    if (deletingClient) return;
    setDeleteClientModalOpen(false);
  };
  const confirmDeleteClient = async () => {
    if (!client?.id || deletingClient) return;
    if (!deletionCheckClient || !isClientDeletable(deletionCheckClient)) {
      setDeleteClientModalOpen(false);
      setDeletionBlockersModalOpen(true);
      return;
    }
    setDeletingClient(true);
    try {
      await deleteClient(client.id);
      toast.success(copy.toast.enterpriseDeleted);
      setDeleteClientModalOpen(false);
      setEnterpriseEditModalOpen(false);
      setDeletionCheckClient(null);
      handleBack();
    } catch (error) {
      console.error("Error suppression client:", error);
      if (error.code === "CLIENT_HAS_DEPENDENCIES" || error.blockers?.length) {
        setDeletionCheckClient({
          ...(deletionCheckClient || client),
          deletable: false,
          deletion_blockers: error.blockers || [],
          deletion: {
            deletable: false,
            blockers: error.blockers || [],
            totalBlockers: error.totalBlockers ?? error.blockers?.length ?? 0
          }
        });
        setDeleteClientModalOpen(false);
        setDeletionBlockersModalOpen(true);
      }
      toast.error(error.message || copy.toast.enterpriseDeleteError);
    } finally {
      setDeletingClient(false);
    }
  };
  const closeEnterpriseEditModal = () => {
    handleCancelInfo();
  };
  const loadCustomFamilyMap = async (clientId = null, signal) => {
    const targetClientId = clientId || client?.id;
    if (!targetClientId) return;
    try {
      const families = await resolveClientCustomFamilyMap(targetClientId, {
        signal
      });
      if (signal?.aborted) return;
      setCustomFamilyMap(Array.isArray(families) ? families : []);
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error("Error loading custom equipment families:", error);
      if (!signal?.aborted) setCustomFamilyMap([]);
    }
  };
  const loadSslLicensesData = async (clientId = null, signal) => {
    const targetClientId = clientId || client?.id;
    if (!targetClientId) return;
    try {
      const [sslCerts, licences] = await Promise.all([fetchClientSslCertificates(targetClientId, {
        signal
      }).catch(e => e?.name === "AbortError" ? Promise.reject(e) : []), fetchClientLicences(targetClientId, {
        signal
      }).catch(e => e?.name === "AbortError" ? Promise.reject(e) : [])]);
      if (signal?.aborted) return;
      setSslData(Array.isArray(sslCerts) ? sslCerts : []);
      setLicensesData(Array.isArray(licences) ? licences : []);
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error("Error while loading SSL / licences:", error);
    }
  };
  const loadCybersecurityData = async (clientId = null, signal) => {
    const targetClientId = clientId || client?.id;
    if (!targetClientId) return;
    try {
      const [antivirus, antispam, domains, sslCerts, licences] = await Promise.all([fetchClientAntivirus(targetClientId, {
        signal
      }).catch(e => e?.name === "AbortError" ? Promise.reject(e) : []), fetchClientAntispam(targetClientId, {
        signal
      }).catch(e => e?.name === "AbortError" ? Promise.reject(e) : []), fetchClientDomains(targetClientId, {
        signal
      }).catch(e => e?.name === "AbortError" ? Promise.reject(e) : []), fetchClientSslCertificates(targetClientId, {
        signal
      }).catch(e => e?.name === "AbortError" ? Promise.reject(e) : []), fetchClientLicences(targetClientId, {
        signal
      }).catch(e => e?.name === "AbortError" ? Promise.reject(e) : [])]);
      if (signal?.aborted) return;
      if (antivirus.length === 0 && antispam.length === 0) {
        const modulesData = await getClientModulesOnce(targetClientId, signal).catch(e => e?.name === "AbortError" ? Promise.reject(e) : null);
        if (modulesData) {
          setAntivirusData(extractAntivirusFromModules(modulesData));
          setAntispamData(extractAntispamFromModules(modulesData));
        }
      } else {
        const modulesData = await getClientModulesOnce(targetClientId, signal).catch(e => e?.name === "AbortError" ? Promise.reject(e) : null);
        setAntivirusData(modulesData ? mergeAntivirusSources(antivirus, modulesData) : antivirus);
        setAntispamData(modulesData ? mergeAntispamSources(antispam, modulesData) : antispam);
      }
      if (domains.length > 0) {
        setDomainsData(domains);
      } else {
        const modulesData = await getClientModulesOnce(targetClientId, signal).catch(e => e?.name === "AbortError" ? Promise.reject(e) : null);
        setDomainsData(modulesData ? extractDomainsFromModules(modulesData) : []);
      }
      setSslData(Array.isArray(sslCerts) ? sslCerts : []);
      if (licences.length > 0) {
        setLicensesData(licences);
      } else {
        const modulesData = await getClientModulesOnce(targetClientId, signal).catch(e => e?.name === "AbortError" ? Promise.reject(e) : null);
        setLicensesData(modulesData ? extractLicensesFromModules(modulesData) : []);
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error('Error loading cybersecurity data:', error);
    }
  };
  const loadBackupData = async (clientId = null, signal, options = {}) => {
    const {
      silent = false
    } = options;
    const targetClientId = clientId || client?.id;
    if (!targetClientId) return;
    if (!silent) setLoadingBackups(true);
    try {
      const [modulesData, mappingsData] = await Promise.all([getClientModulesOnce(targetClientId, signal).catch(e => e?.name === "AbortError" ? Promise.reject(e) : null), fetch(`${API_BASE_URL}/checkmk/mapping/${targetClientId}`, {
        credentials: 'include',
        signal
      }).then(res => res.ok ? res.json() : []).catch(e => e?.name === "AbortError" ? Promise.reject(e) : [])]);
      if (signal?.aborted) return;
      const mappingsMap = {};
      if (mappingsData && Array.isArray(mappingsData)) {
        mappingsData.forEach(m => {
            if (m.equipment_id && m.is_active !== false && (m.equipment_type === "Backup" || m.equipment_type === "Sauvegarde")) {
            mappingsMap[m.equipment_id] = m;
          }
        });
      }
      const {
        instances,
        jobs
      } = parseBackupDataFromModules(modulesData, mappingsMap);
      setBackupInstances(instances);
      setBackupJobs(jobs);
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error('Error lors du loading des data de backup:', error);
    } finally {
      if (!silent) setLoadingBackups(false);
    }
  };
  const loadAntivirusDetails = async (antivirusItem, isSyncRefresh = false) => {
    if (!client?.id || !antivirusItem?.companyId) return;
    setLoadingAntivirusDetails(true);
    try {
      const qs = buildBitdefenderQueryParams({
        clientId: client.id,
        bitdefenderTenantId: antivirusItem.bitdefenderTenantId,
        mappingMode: antivirusItem.mappingMode || "reseller"
      });
      const statsResponse = await fetch(`${API_BASE_URL}/bitdefender/statistics/${antivirusItem.companyId}${qs}`, {
        credentials: "include"
      }).catch(() => ({
        ok: false
      }));
      const statsData = statsResponse.ok ? await statsResponse.json() : null;
      const endpointsResponse = await fetch(`${API_BASE_URL}/bitdefender/endpoints/${antivirusItem.companyId}/enriched${qs}`, {
        credentials: "include"
      }).catch(() => ({
        ok: false
      }));
      const endpointsData = endpointsResponse.ok ? await endpointsResponse.json() : null;
      const policiesResponse = await fetch(`${API_BASE_URL}/bitdefender/policies/${antivirusItem.companyId}${qs}`, {
        credentials: "include"
      }).catch(() => ({
        ok: false
      }));
      const policiesData = policiesResponse.ok ? await policiesResponse.json() : null;
      setAntivirusDetailData({
        item: antivirusItem,
        statistics: statsData?.statistics || statsData?.data || null,
        endpoints: endpointsData?.endpoints || endpointsData?.data?.endpoints || [],
        policies: policiesData?.policies || policiesData?.data || null,
        timestamp: new Date().toISOString()
      });
      if (!isSyncRefresh) {
        setAntivirusDetailsModalOpen(true);
      }
      if (isSyncRefresh) {
        toast.success(copy.toast.antivirusSynced);
      }
    } catch (error) {
      console.error('Error loading antivirus details:', error);
      toast.error(copy.toast.antivirusLoadError);
    } finally {
      setLoadingAntivirusDetails(false);
    }
  };
  const handleModuleToggle = moduleKey => {
    if (!enterpriseEditModalOpen) return;
    setFormData(prev => {
      const newData = {
        ...prev,
        modules: {
          ...prev.modules,
          [moduleKey]: !prev.modules[moduleKey]
        }
      };
      if (initialFormData) {
        setHasChanges(detectInfoChanges(newData, initialFormData));
      }
      return newData;
    });
  };
  const handleMonitoringModuleToggle = moduleKey => {
    if (!enterpriseEditModalOpen) return;
    const key = String(moduleKey || "").toLowerCase();
    if (key === "toip") {
      return;
    }
    setMonitoringModulesState(prev => {
      const current = prev || {};
      const next = {
        ...current,
        [moduleKey]: !current[moduleKey]
      };
      if (initialMonitoringModules) {
        const allKeys = Object.keys({
          ...initialMonitoringModules,
          ...next
        });
        const hasDiff = allKeys.some(key => Boolean(initialMonitoringModules[key]) !== Boolean(next[key]));
        if (hasDiff) {
          setHasChanges(true);
        }
      } else {
        setHasChanges(true);
      }
      return next;
    });
  };
  const getModuleIcon = (moduleName, isActive = true, iconClass = styles.moduleIcon) => {
    const key = String(moduleName || "").toLowerCase();
    let baseColor = "#3b82f6";
    if (["antivirus", "antispam", "firewallregles", "sauvegarde"].includes(key)) {
      baseColor = "#ef4444";
    } else if (["office365", "ndd"].includes(key)) {
      baseColor = "#8b5cf6";
    } else if (["wifi", "bornewifi", "internet", "serveurs", "stockage", "firewalls", "firewall", "switch", "toip", "videosurveillance"].includes(key)) {
      baseColor = "#3b82f6";
    }
    const iconColor = isActive ? baseColor : "#6b7280";
    switch (key) {
      case "internet":
        return <span className={iconClass}>
            <Icon icon="mdi:web" color={iconColor} />
          </span>;
      case "firewalls":
      case "firewall":
        return <span className={iconClass}>
            <Icon icon="mdi:wall-fire" color={iconColor} />
          </span>;
      case "wifi":
      case "bornewifi":
        return <span className={iconClass}>
            <Icon icon="mdi:wifi-marker" color={iconColor} />
          </span>;
      case "serveurs":
        return <span className={iconClass}>
            <Icon icon="mingcute:server-fill" color={iconColor} />
          </span>;
      case "stockage":
        return <span className={iconClass}>
            <IoServerSharp color={iconColor} />
          </span>;
      case "switch":
        return <span className={iconClass}>
            <FaEthernet color={iconColor} />
          </span>;
      case "toip":
        return <span className={iconClass}>
            <Icon icon="mdi:phone" color={iconColor} />
          </span>;
      case "videosurveillance":
        return <span className={iconClass}>
            <Icon icon="mdi:cctv" color={iconColor} />
          </span>;
      case "antivirus":
        return <span className={iconClass}>
            <Icon icon="mdi:bug" color={iconColor} />
          </span>;
      case "antispam":
        return <span className={iconClass}>
            <Icon icon="material-symbols:mail-shield-outline" color={iconColor} />
          </span>;
      case "firewallregles":
        return <span className={iconClass}>
            <Icon icon="iconoir:pc-firewall" color={iconColor} />
          </span>;
      case "sauvegarde":
        return <span className={iconClass}>
            <Icon icon="material-symbols:backup" color={iconColor} />
          </span>;
      case "office365":
        return <span className={iconClass}>
            <Icon icon="hugeicons:office-365" color={iconColor} />
          </span>;
      case "ndd":
        return <span className={iconClass}>
            <Icon icon="stash:domain" color={iconColor} />
          </span>;
      default:
        return <span className={iconClass}>
            <Icon icon="mdi:cog" color={iconColor} />
          </span>;
    }
  };
  const getModuleCategory = moduleName => {
    if (!moduleName) return 'infrastructure';
    const key = String(moduleName).toLowerCase();
    const infrastructureModules = ['internet', 'serveurs', 'stockage', 'firewalls', 'firewall', 'switch', 'wifi', 'cameras', 'videosurveillance'];
    const cybersecuriteModules = ['sauvegarde', 'antivirus', 'antispam', 'firewallregles'];
    const servicesModules = ['ndd', 'office365'];
    if (infrastructureModules.includes(key)) {
      return 'infrastructure';
    } else if (cybersecuriteModules.includes(key)) {
      return 'cybersecurite';
    } else if (servicesModules.includes(key)) {
      return 'services';
    }
    return 'infrastructure';
  };
  const getMonitoringOrderKey = moduleName => {
    if (!moduleName) return 999;
    const key = String(moduleName).toLowerCase();
    if (key.includes('internet')) return 1;
    if (key === 'firewall' || key === 'firewalls') return 2;
    if (key.includes('serveur')) return 3;
    if (key.includes('stockage')) return 4;
    if (key.includes('switch')) return 5;
    if (key.includes('wifi') || key.includes('borne')) return 6;
    if (key === 'toip') return 7;
    if (key.includes('routeur') || key.includes('sd-wan')) return 7.5;
    if (key.includes('alimentation') || key.includes('onduleur') || key.includes('ups')) return 7.8;
    if (key.includes('camera') || key.includes('videosurveillance')) return 8;
    if (key.includes('antivirus')) return 9;
    if (key.includes('antispam')) return 10;
    if (key.includes('sauvegarde')) return 11;
    if (key === 'ndd') return 12;
    if (key.includes('office365') || key.includes('office 365')) return 13;
    return 999;
  };
  const handleAddClientTag = async ({
    label,
    color
  }) => {
    const trimmed = String(label || "").trim();
    if (!trimmed || !client?.id || addingTag) return;
    setAddingTag(true);
    try {
      const tag = await addClientTag(client.id, {
        label: trimmed,
        color
      });
      setClientTags(prev => {
        if (prev.some(t => t.id === tag.id)) return prev;
        return [...prev, tag].sort((a, b) => a.label.localeCompare(b.label));
      });
      setTagModalOpen(false);
      toast.success(copy.toast.tagAdded);
    } catch (error) {
      console.error("Error adding tag:", error);
      toast.error(error.message || copy.toast.tagAddError);
    } finally {
      setAddingTag(false);
    }
  };
  const handleRemoveClientTag = async tagId => {
    if (!client?.id) return;
    try {
      await removeClientTag(client.id, tagId);
      setClientTags(prev => prev.filter(t => t.id !== tagId));
      toast.success(copy.toast.tagRemoved);
    } catch (error) {
      console.error("Error removing tag:", error);
      toast.error(error.message || copy.toast.tagRemoveError);
    }
  };
  const openCreateNoteModal = () => {
    setNoteModalMode("create");
    setNoteModalNoteId(null);
    setNoteModalInitialContent("");
    setNoteModalOpen(true);
  };
  const openEditNoteModal = note => {
    setNoteModalMode("edit");
    setNoteModalNoteId(note.id);
    setNoteModalInitialContent(note.content || "");
    setNoteModalOpen(true);
  };
  const closeNoteModal = () => {
    if (savingNote) return;
    setNoteModalOpen(false);
    setNoteModalNoteId(null);
    setNoteModalInitialContent("");
  };
  const handleNoteModalSubmit = async content => {
    if (!client?.id || savingNote) return;
    setSavingNote(true);
    try {
      if (noteModalMode === "create") {
        const note = await createClientNote(client.id, content);
        setNotes(prev => [note, ...prev]);
        toast.success(copy.toast.noteAdded);
      } else {
        const updated = await updateClientNote(client.id, noteModalNoteId, content);
        setNotes(prev => prev.map(n => n.id === noteModalNoteId ? updated : n));
        toast.success(copy.toast.noteUpdated);
      }
      setNoteModalOpen(false);
      setNoteModalNoteId(null);
      setNoteModalInitialContent("");
    } catch (error) {
      console.error("Error note:", error);
      toast.error(error.message || copy.toast.noteSaveError);
    } finally {
      setSavingNote(false);
    }
  };
  const handleDeleteNote = async noteId => {
    if (!client?.id) return;
    try {
      await deleteClientNote(client.id, noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
      if (noteModalNoteId === noteId) closeNoteModal();
      toast.success(copy.toast.noteDeleted);
    } catch (error) {
      console.error("Error suppression note:", error);
      toast.error(error.message || copy.toast.noteDeleteError);
    }
  };
  const canEditNote = note => {
    if (!note?.user_id || !currentUser?.id) return false;
    if (userRole === "admin") return true;
    return note.user_id === currentUser.id;
  };
  const visibleSupportPacks = useMemo(
    () =>
      supportCreditPacks.filter(pack => {
        const status = String(pack?.status || "active");
        // Keep depleted/expired visible after reload so created packs never "vanish".
        return ["active", "upcoming", "depleted", "expired"].includes(status);
      }),
    [supportCreditPacks]
  );
  const clientOnboarding = useMemo(
    () => getClientOnboardingInfo(client, formData?.contrat?.debut),
    [client, formData?.contrat?.debut]
  );
  const activeContacts = useMemo(() => {
    const list = contacts.filter(c => String(c.statut || "").toLowerCase().includes("actif") && !String(c.statut || "").toLowerCase().includes("inactive"));
    return sortContactsPrimaryFirst(list, client?.id);
  }, [contacts, client?.id]);
  const activeContactCount = activeContacts.length;
  const visibleContacts = contactsExpanded ? activeContacts : activeContacts.slice(0, 1);
  const hasMoreContacts = activeContacts.length > 1;
  const visiblePrestataires = prestatairesExpanded ? prestataires : prestataires.slice(0, 1);
  const hasMorePrestataires = prestataires.length > 1;
  const clientSites = useMemo(() => normalizeClientSites(formData.sites), [formData.sites]);
  const filteredSites = useMemo(() => {
    const query = sitesSearch.trim();
    if (!query) return clientSites;
    return clientSites.filter(site => siteMatchesQuery(site, query));
  }, [clientSites, sitesSearch]);
  const sitesTotalPages = Math.max(1, Math.ceil(filteredSites.length / SITES_PAGE_SIZE));
  const safeSitesPage = Math.min(sitesPage, sitesTotalPages);
  const pagedSites = useMemo(() => {
    const start = (safeSitesPage - 1) * SITES_PAGE_SIZE;
    return filteredSites.slice(start, start + SITES_PAGE_SIZE);
  }, [filteredSites, safeSitesPage]);
  const sitesRangeStart = filteredSites.length === 0 ? 0 : (safeSitesPage - 1) * SITES_PAGE_SIZE + 1;
  const sitesRangeEnd = Math.min(safeSitesPage * SITES_PAGE_SIZE, filteredSites.length);
  useEffect(() => {
    setSitesPage(page => Math.min(page, sitesTotalPages));
  }, [sitesTotalPages]);
  const enterpriseGuideSteps = useMemo(() => {
    const steps = getEnterpriseDetailGuideSteps({
      expandInfo: () => setInfoExpanded(true),
      expandContacts: () => setContactsSectionExpanded(true),
      expandNotes: () => setNotesSectionExpanded(true),
      focusEquipmentStats: () => {
        equipmentPageRef.current?.focusType?.("Ordinateurs");
        setActiveEquipmentTableType("Ordinateurs");
        equipmentSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    }, locale);
    const hasOrdinateurs = (equipmentTotals?.byType?.Ordinateurs || 0) > 0;
    if (hasOrdinateurs) return steps;
    return steps.filter(step => step.target !== '[data-guide="enterprise-equipment-stats"]');
  }, [equipmentTotals, locale]);
  const handlePhotoUpload = () => {
    setPhotoModalOpen(true);
  };
  const handleSitesSave = async (newSites, options = {}) => {
    const sites = normalizeClientSites(newSites);
    const silent = options.silent === true;
    if (enterpriseEditModalOpen) {
      updateFormData({
        ...formData,
        sites
      });
      return;
    }
    if (!client?.id) return;
    try {
      await updateClient(client.id, {
        sites
      });
      setFormData(prev => ({
        ...prev,
        sites
      }));
      setClient(prev => ({
        ...prev,
        sites
      }));
      notifyEnterprisesListRefresh();
      if (!silent) toast.success(copy.toast.sitesUpdated);
    } catch (error) {
      console.error("Error lors de la update des site:", error);
      toast.error(interpolate(copy.toast.sitesUpdateError, {
        message: error.message
      }));
      throw error;
    }
  };
  const handleOpenLogDetails = log => {
    setSelectedLog(log);
    setLogDetailsModalOpen(true);
  };
  const renderLogDetails = log => {
    let details = log?.details || {};
    if (typeof details === 'string') {
      try {
        details = JSON.parse(details);
      } catch (e) {
        details = {};
      }
    }
    const modifiedFields = Array.isArray(details.modifiedFields) ? details.modifiedFields : [];
    const changes = Array.isArray(details.changes) ? details.changes : [];
    if (modifiedFields.length === 0 && changes.length === 0) {
      return <div className={styles.logDetailsBox}>{copy.modals.logNoDetails}</div>;
    }
    return <div className={styles.logDetailsGrid}>
        {modifiedFields.length > 0 && <div className={styles.logDetailRow}>
            <label className={styles.detailLabel}>{copy.modals.logModifiedFields}</label>
            <div className={styles.logDetailsBox}>
              {modifiedFields.map((field, idx) => <div key={`${field}-${idx}`}>• {field}</div>)}
            </div>
          </div>}
        {changes.length > 0 && <div className={styles.logDetailRow}>
            <label className={styles.detailLabel}>{copy.modals.logNewValues}</label>
            <div className={styles.logDetailsBox}>
              {changes.map((change, idx) => <div key={`${change.field}-${idx}`}>
                  <strong>{change.field}</strong>: {typeof change.newValue === 'object' ? JSON.stringify(change.newValue) : String(change.newValue)}
                </div>)}
            </div>
          </div>}
      </div>;
  };
  if (loading && !client) {
    return <EnterpriseDetailSkeleton />;
  }
  if (error || !client) {
    return <div className={`${styles.contratDetailPage} msp-page-grid`}>
        <div className={styles.error}>
          <Icon icon="mdi:alert-circle-outline" />
          <span>{error || copy.notFound}</span>
          <button type="button" onClick={handleBack} className={styles.backButton}>
            <FaArrowLeft /> {copy.backToEnterprises}
          </button>
        </div>
      </div>;
  }
  const contractStatus = resolveContractStatus(formData.contrat?.expiration, formData.contrat?.suspendu);
  const companyStatusKey = normalizeCompanyStatusKey(formData.statut);
  const companyStatusLabel = companyStatusKey === "inactive" ? copy.companyStatusInactive : copy.companyStatusActive;
  const clientCode = getClientNumber(client);
  const clientNameWithoutCode = getClientNameWithoutCode(client) || "-";
  const commercialUser = users.find(u => String(u.id) === String(formData.commercialId));
  const commercialLabel = client?.commercial || commercialUser?.username || commercialUser?.email || null;
  return <div ref={pageRootRef} className={`${styles.contratDetailPage} ${styles.enterpriseDetailPage} msp-page-grid`}>
      <header className={`${styles.pageHero} ${isCommunity ? styles.pageHeroProTeaser : ""}`} ref={headerRef} data-guide="enterprise-hero">
        <div className={styles.heroRow}>
          <div className={styles.heroMain}>
            <div className={styles.heroAvatar}>
              {getClientInitials(client)}
            </div>
            <div className={styles.heroText}>
              <h1 className={styles.heroTitle}>
                {clientCode && <span className={styles.headerClientCode}>{clientCode}</span>}
                <span>{clientNameWithoutCode}</span>
              </h1>
              <div className={styles.heroMeta} aria-label={copy.heroMetaAria}>
                <span className={`${styles.statusChip} ${companyStatusKey === "active" ? styles.statusChipActive : styles.statusChipInactive}`}>
                  <StatusDot active={companyStatusKey === "active"} />
                  {companyStatusLabel}
                </span>
                {companyStatusKey === "active" ? <span className={`${styles.contractBadge} ${styles[`contractBadge_${contractStatus.status}`] || styles.contractBadge_unknown}`}>
                    {contractStatus.label}
                  </span> : null}
                {commercialLabel && <span className={styles.heroMetaItem}>
                    <Icon icon="mdi:account-tie-outline" aria-hidden />
                    {commercialLabel}
                  </span>}
                <span className={styles.heroMetaItem}>
                  <Icon icon="mdi:server-outline" aria-hidden />
                  {interpolate(heroEquipmentTotalCount > 1 ? copy.equipmentCountPlural : copy.equipmentCount, {
                  count: heroEquipmentTotalCount
                })}
                </span>
                {activeContactCount > 0 && <span className={styles.heroMetaItem}>
                    <Icon icon="mdi:account-group-outline" aria-hidden />
                    {interpolate(activeContactCount > 1 ? copy.contactCountPlural : copy.contactCount, {
                  count: activeContactCount
                })}
                  </span>}
                <EnterpriseRmmEnrollmentHero clientId={client?.id} isAdmin={userRole === "admin"} compact itemClassName={`${styles.heroMetaItem} ${styles.heroMetaItemRmm}`} tokenWrapClassName={styles.heroRmmToken} />
                {loadingTags ? <span className={styles.heroTagsLoading}>{copy.loadingTags}</span> : <>
                    {clientTags.map(tag => <span key={tag.id} className={styles.heroTagChip} style={{
                  backgroundColor: `${tag.color || "#2b5fab"}18`,
                  borderColor: `${tag.color || "#2b5fab"}55`,
                  color: tag.color || "#2b5fab"
                }}>
                        {tag.label}
                        {canManageTags ? <button type="button" className={styles.heroTagRemove} onClick={() => handleRemoveClientTag(tag.id)} aria-label={interpolate(copy.removeTagAria, {
                    label: tag.label
                  })}>
                          <FaTimes />
                        </button> : null}
                      </span>)}
                    {canManageTags ? <div className={styles.heroTagAddWrap}>
                      <SmartTooltip content={copy.addTag}>
                        <button type="button" className={styles.heroTagAddTrigger} onClick={() => setTagModalOpen(true)} aria-label={copy.addTag}>
                          <FaPlus />
                        </button>
                      </SmartTooltip>
                    </div> : null}
                  </>}
              </div>
            </div>
          </div>
          <div className={styles.heroActions} ref={clientActionsMenuRef} data-guide="enterprise-hero-actions">
            {clientOnboarding ? <div className={`${styles.onboardingBanner} ${styles.heroOnboardingCard}`} role="status">
                <Icon icon="mdi:account-clock-outline" aria-hidden />
                <div className={styles.onboardingBannerText}>
                  <strong>{copy.onboardingBannerTitle}</strong>
                  <span>
                    {clientOnboarding.ageDays < 1
                  ? interpolate(copy.onboardingBannerHintToday, {
                    remaining: clientOnboarding.remainingDays
                  })
                  : interpolate(copy.onboardingBannerHint, {
                    days: clientOnboarding.ageDays,
                    remaining: clientOnboarding.remainingDays
                  })}
                  </span>
                </div>
              </div> : null}
            <SubscribeBellButton
              entityType="enterprise"
              entityId={client?.id}
              subscribeLabel={copy.subscribe?.subscribe || "S’abonner aux notifications"}
              unsubscribeLabel={copy.subscribe?.unsubscribe || "Se désabonner"}
              subscribedToast={copy.subscribe?.subscribedToast || "Abonnement activé"}
              unsubscribedToast={copy.subscribe?.unsubscribedToast || "Abonnement retiré"}
            />
            {canEditClient || canReversibility ? <>
                <SmartTooltip content={copy.actionsMenuTooltip}>
                  <button type="button" className={styles.heroMenuBtn} onClick={() => setClientActionsMenuOpen(open => !open)} aria-expanded={clientActionsMenuOpen} aria-haspopup="menu" aria-label={copy.actionsMenu} disabled={deletingClient}>
                    <Icon icon="mdi:dots-horizontal" aria-hidden />
                  </button>
                </SmartTooltip>
                {clientActionsMenuOpen && <div className={styles.heroClientMenu} role="menu">
                    {canEditClient ? <button type="button" className={styles.heroMenuItem} role="menuitem" onClick={() => {
                setClientActionsMenuOpen(false);
                openEnterpriseEditModal();
              }}>
                        <Icon icon="mdi:pencil-outline" aria-hidden />
                        <span>{copy.editEnterprise}</span>
                      </button> : null}
                    {canReversibility ? <button type="button" className={styles.heroMenuItem} role="menuitem" onClick={() => {
                setClientActionsMenuOpen(false);
                if (isCommunity) {
                  notifyProFeature(copy.proFeatures.reversibility);
                  return;
                }
                handleExportReversibility();
              }} disabled={!isCommunity && generatingReversibility}>
                        {generatingReversibility && !isCommunity ? <Icon icon="mdi:loading" className={styles.spinning} aria-hidden /> : <Icon icon="mdi:folder-download-outline" aria-hidden />}
                        <span className={styles.heroMenuItemLabel}>
                          {generatingReversibility && !isCommunity ? copy.generatingDossier || copy.generatingFolder : copy.reversibilityDossier || copy.reversibilityFolder}
                          {isCommunity ? <ProFeatureBadge variant="inline" /> : null}
                        </span>
                      </button> : null}
                  </div>}
              </> : null}
          </div>
        </div>
        <div className={styles.pageHeroBookmarks}>
        <UpcomingEventBookmarks upcomingEvents={upcomingEventsForBookmarks} recentEvents={recentEventsForBookmarks} loading={loadingClientActivity} typeLabels={eventTypeLabels} labels={copy.eventBookmarks} menuLabels={copy.eventActionMenu} locale={locale} users={users} proFeatureLabel={copy.proFeatures.planning} proFeatureKey="planning" proLocked={isCommunity} inPageHero defaultCollapsed onEditEvent={canScheduleEvent ? event => {
          if (event?._isCampaign && event._campaignData) {
            handleOpenCampaign(event._campaignData);
            return;
          }
          setEditingEvent(event);
          setEventModalOpen(true);
        } : event => {
          if (event?._isCampaign && event._campaignData) {
            handleOpenCampaign(event._campaignData);
          }
        }} onGoToPlanning={event => {
          const start = event?.event_start ?? event?.start ?? event?.["start"];
          onNavigate?.("Planning", {
            focusEventId: event?._isCampaign ? undefined : event?.id,
            focusDate: start,
            clientId: event?.client_id ?? client?.id ?? null
          });
        }} onAddEvent={canScheduleEvent ? () => {
          setEditingEvent(null);
          setEventModalOpen(true);
        } : undefined} onOpenPlanning={() => {
          onNavigate?.("Planning");
        }} />
        </div>
      </header>

      <div className={styles.pageBody}>
        <div className={styles.pageGrid}>
          <main className={styles.mainColumn}>
            <div className={styles.mainCommunityPanels}>
            <section className={styles.panel} data-guide="enterprise-infra-map">
              <div className={styles.panelHeader}>
                <div className={styles.panelHeaderMain}>
                  <h2 className={styles.panelTitle}>{copy.infraMapTitle}</h2>
                  {siteFilterBadge}
                </div>
              </div>
              <div className={styles.panelBody}>
                <InfrastructureMap clientId={client.id} clientSnapshot={client} equipmentRevision={equipmentRevision} isCommunity={isCommunity} backupInstances={backupInstances} antivirusItems={configuredAntivirusSolutions} antispamItems={configuredAntispamSolutions} domainItems={configuredDomains} domainIntegrationReady={globalOvhConfigured} sslItems={sslData} licenceItems={licencesData} customFamilyMap={customFamilyMap} siteFilter={activeSiteFilter} campaignItems={campaigns}                 tenantInfo={{
                  configured: configuredMicrosoftTenants.length > 0 || Boolean(client?.has_azure_credentials || client?.hasAzureCredentials || client?.azureHasCredentials),
                  items: configuredMicrosoftTenants,
                  tenantId: configuredMicrosoftTenants[0]?.tenantId || client?.Office365?.tenantId || client?.microsoft?.tenantId || null,
                  email: client?.Office365?.email || client?.microsoft?.email || null,
                  displayName: configuredMicrosoftTenants[0]?.tenantName || client?.Office365?.tenantName || client?.microsoft?.tenantName || null,
                  status: client?.Office365?.status || client?.microsoft?.status || "actif",
                  lastSync: client?.Office365?.lastSync || client?.microsoft?.lastSync || null,
                  clientId: client.id,
                  clientName: client.name
                }} googleWorkspaceInfo={{
                  configured: Boolean(client?.googleWorkspace?.configured || client?.hasGoogleWorkspaceCredentials),
                  domain: client?.googleWorkspace?.domain || null,
                  status: client?.googleWorkspace?.status || "actif",
                  clientId: client.id,
                  clientName: client.name
                }} onNodeClick={handleInfraNodeClick} onBrickClick={canManageSolutions || canManageCampaigns || canManageDevices ? brick => {
                  if (!canManageSolutions && !["Campagne"].includes(brick.type) && !parseCustomFamilyType(brick.type)) return;
                  const familyKey = brick.familyKey || parseCustomFamilyType(brick.type);
                  if (familyKey) {
                    if (!canManageDevices && !canManageSolutions) return;
                    const family = customFamilyMap.find(entry => entry.familyKey === familyKey);
                    if (family) {
                      equipmentPageRef.current?.focusType?.(`Custom:${familyKey}`);
                      equipmentSectionRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                      });
                      const itemCount = Number(family.count) || (Array.isArray(family.items) ? family.items.length : 0);
                      if (canManageDevices && itemCount === 0) {
                        setCustomEquipmentModal({
                          family,
                          item: null
                        });
                      }
                      return;
                    }
                  }
                  if (!canManageSolutions && brick.type !== "Campagne") return;
                  if (brick.type === "Backup") {
                    setBackupConfigModalOpen(true);
                    return;
                  }
                  if (brick.type === "Antivirus") {
                    handleAntivirusBrickClick();
                    return;
                  }
                  if (brick.type === "Campagne") {
                    handleCampaignBrickClick();
                    return;
                  }
                  if (!onNavigate || !client?.id) return;
                  if (brick.type === "Antispam") {
                    handleAntispamBrickClick();
                    return;
                  }
                  if (brick.type === "NDD") {
                    handleNddBrickClick();
                    return;
                  }
                  if (brick.type === "CertificatsSSL") {
                    handleSslBrickClick();
                    return;
                  }
                  if (brick.type === "LicensesAbonnements") {
                    handleLicensesBrickClick();
                    return;
                  }
                  if (brick.type === "TenantMicrosoft") {
                    handleMicrosoftTenantBrickClick();
                    return;
                  }
                } : undefined} />
              </div>
            </section>

            <section className={styles.panel} ref={equipmentSectionRef} data-guide="enterprise-equipment">
              <div className={styles.panelHeader}>
                <div className={styles.panelHeaderMain}>
                  <h2 className={styles.panelTitle}>{copy.peripheralsTitle}</h2>
                  {siteFilterBadge}
                </div>
                <div className={styles.panelToolbar}>
                  <span className={styles.equipmentResultCount}>
                    {interpolate(equipmentResultCount > 1 ? copy.resultCountPlural : copy.resultCount, {
                      count: equipmentResultCount
                    })}
                  </span>
                  {equipmentStatsAction ? <SmartTooltip as="span" content={equipmentStatsAction.label}>
                      <button type="button" className={styles.exportHeaderButton} data-guide="enterprise-equipment-stats" onClick={() => openComputerFleetStats()} onMouseDown={e => {
                      if (e.button === 1) {
                        e.preventDefault();
                        openComputerFleetStats({
                          background: true,
                          equipmentType: activeEquipmentTableType || undefined
                        });
                      }
                    }} aria-label={equipmentStatsAction.label}>
                        <Icon icon="mdi:chart-box-outline" />
                      </button>
                    </SmartTooltip> : null}
                  <div className={styles.exportMenuWrap} ref={equipmentExportMenuRef}>
                    <SmartTooltip as="span" content={copy.exportCsv}>
                      <button type="button" className={styles.exportHeaderButton} onClick={() => setEquipmentExportMenuOpen(open => !open)} aria-expanded={equipmentExportMenuOpen} aria-haspopup="menu">
                        <FaFileExport />
                      </button>
                    </SmartTooltip>
                    {equipmentExportMenuOpen && <div className={styles.exportMenu} role="menu">
                        <button type="button" className={styles.exportMenuItem} role="menuitem" onClick={() => {
                        setEquipmentExportMenuOpen(false);
                        equipmentPageRef.current?.handleExportCurrentTable();
                      }}>
                          {copy.exportCurrentTable}
                        </button>
                        <button type="button" className={styles.exportMenuItem} role="menuitem" onClick={() => {
                        setEquipmentExportMenuOpen(false);
                        equipmentPageRef.current?.handleExportAllTables();
                      }}>
                          {copy.exportAllTables}
                        </button>
                      </div>}
                  </div>
                  {canManageDevices ? <SmartTooltip as="span" content={copy.addEquipment}>
                    <button type="button" className={styles.addEquipmentButton} onClick={() => equipmentPageRef.current?.openAddEquipmentModal()}>
                      <FaPlus />
                    </button>
                  </SmartTooltip> : null}
                </div>
              </div>
              <div className={styles.panelBody}>
                <div className={styles.equipmentSection}>
                  <EquipmentPage ref={equipmentPageRef} embedded fixedClientId={client.id} embeddedClient={client ? {
                    ...client,
                    sites: formData.sites ?? client.sites ?? [],
                    ssid: Array.isArray(client.ssids) && client.ssids.length ? client.ssids : client.ssid,
                    ssids: Array.isArray(client.ssids) && client.ssids.length ? client.ssids : client.ssid
                  } : null} initialEmbeddedType={initialPeripheralsUi?.activeType || null} initialTablePageByType={initialPeripheralsUi?.tablePageByType || null} initialTableSort={initialPeripheralsUi?.tableSort || null} initialEmbeddedPageSize={initialPeripheralsUi?.pageSize || null} onNavigate={onNavigate} searchQuery={equipmentSearchQuery} onSearchQueryChange={setEquipmentSearchQuery} onFilteredCountChange={setEquipmentResultCount} onTotalCountChange={setHardwareEquipmentTotalCount} onEquipmentChanged={refreshClientEquipment} onClientSsidsUpdated={ssids => {
                    setClient(prev => prev ? {
                      ...prev,
                      ssid: ssids,
                      ssids
                    } : prev);
                  }} customFamilyMap={filteredCustomFamilyMap} backupInstances={backupInstances} siteFilter={activeSiteFilter} onCustomFamilyManage={(family, item) => {
                    setCustomEquipmentModal({
                      family,
                      item: item || null
                    });
                  }} onEmbeddedActiveTypeChange={setActiveEquipmentTableType} />
                </div>
              </div>
            </section>
            </div>

            <section className={styles.panel} data-guide="enterprise-activity">
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>{copy.activityTitle}</h2>
              </div>
              <div className={styles.panelBody}>
                {loadingClientActivity ? <div className={styles.activityLayout}>
                    <div className={styles.activityGridSplit}>
                      <div className={`${styles.activityBlock} ${styles.activityBlockLoading}`}>
                        <div className={`${styles.skeleton} ${styles.activitySkeletonTitle}`} />
                        <div className={`${styles.skeleton} ${styles.activitySkeletonRow}`} />
                        <div className={`${styles.skeleton} ${styles.activitySkeletonRow}`} />
                        <div className={`${styles.skeleton} ${styles.activitySkeletonRow}`} />
                      </div>
                      <div className={`${styles.activityBlock} ${styles.activityBlockLoading}`}>
                        <div className={`${styles.skeleton} ${styles.activitySkeletonTitle}`} />
                        <div className={`${styles.skeleton} ${styles.activitySkeletonRow}`} />
                        <div className={`${styles.skeleton} ${styles.activitySkeletonRow}`} />
                        <div className={`${styles.skeleton} ${styles.activitySkeletonRow}`} />
                      </div>
                    </div>
                    <div className={`${styles.activityBlock} ${styles.activityBlockLoading} ${styles.activityCampaignsRow}`}>
                      <div className={`${styles.skeleton} ${styles.activitySkeletonTitle}`} />
                      <div className={`${styles.skeleton} ${styles.activitySkeletonRow}`} />
                      <div className={`${styles.skeleton} ${styles.activitySkeletonRow}`} />
                      <div className={`${styles.skeleton} ${styles.activitySkeletonRow}`} />
                    </div>
                  </div> : <div className={styles.activityLayout}>
                    <div className={styles.activityGridSplit}>
                      <div className={styles.activityBlock}>
                        <div className={styles.activityBlockHeader}>
                          <h3 className={styles.activityBlockTitle}>
                            <Icon icon="mdi:ticket-outline" aria-hidden />
                            {copy.supportTicketsTitle}
                          </h3>
                          <span className={styles.activityBlockCount}>
                            {interpolate(copy.openCount, {
                          count: supportTickets.filter(t => !["resolved", "closed"].includes(normalizeTicketStatus(t.status))).length
                        })}
                          </span>
                        </div>
                        <div className={styles.dataTableWrapper}>
                          <table className={styles.dataTable}>
                            <thead>
                              <tr>
                                <th>{copy.table.number}</th>
                                <th>{copy.table.title}</th>
                                <th>{copy.table.status}</th>
                                {!isCommunity && <th>{copy.table.sla}</th>}
                                <th>{copy.table.updated}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {supportTickets.length === 0 ? <tr>
                                  <td colSpan={isCommunity ? 4 : 5} className={styles.dataTableEmptyCell}>
                                    {copy.emptySupportTickets}
                                  </td>
                                </tr> : supportTickets.slice(0, 8).map(ticket => {
                            const status = normalizeTicketStatus(ticket.status);
                            const sla = getTicketSlaDisplay(ticket, {
                              clients: client ? [client] : [],
                              now: slaNow
                            });
                            return <tr key={ticket.id} className={styles.dataTableRowClickable} onClick={() => handleOpenTicket(ticket)} onAuxClick={e => {
                              if (e.button === 1) {
                                e.preventDefault();
                                handleOpenTicket(ticket, true);
                              }
                            }}>
                                      <td>#{ticket.ticket_number || "-"}</td>
                                      <td className={styles.activityTitleCell}>
                                        {ticket.title || "-"}
                                      </td>
                                      <td>
                                        <span className={styles.ticketStatusBadge}>
                                          {getTicketStatusLabel(status, locale)}
                                        </span>
                                      </td>
                                      {!isCommunity && <td>{sla.label}</td>}
                                      <td>{formatRelativeFrench(ticket.updated_at || ticket.created_at)}</td>
                                    </tr>;
                          })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    <ProFeatureLock locked={isCommunity} featureLabel={copy.proFeatures.prestations} featureKey="prestations" className={styles.activityBlockProLock} badgePosition="none">
                      <div className={styles.activityBlock}>
                        <div className={styles.activityBlockHeader}>
                          <h3 className={styles.activityBlockTitle}>
                            <Icon icon="mdi:briefcase-outline" aria-hidden />
                            {copy.prestationsTitle}
                            {isCommunity ? <ProFeatureBadge variant="inline" className={styles.proBadgeInline} /> : null}
                          </h3>
                          <span className={styles.activityBlockCount}>
                            {interpolate(copy.prestationsCount, {
                            count: (isCommunity ? DEMO_PRESTATION_TICKETS : prestationTickets).length
                          })}
                          </span>
                        </div>
                        <div className={styles.dataTableWrapper}>
                          <table className={styles.dataTable}>
                            <thead>
                              <tr>
                                <th>{copy.table.number}</th>
                                <th>{copy.table.type}</th>
                                <th>{copy.table.status}</th>
                                <th>{copy.table.created}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(isCommunity ? DEMO_PRESTATION_TICKETS : prestationTickets).length === 0 ? <tr>
                                  <td colSpan={4} className={styles.dataTableEmptyCell}>
                                    {copy.emptyPrestationTickets}
                                  </td>
                                </tr> : (isCommunity ? DEMO_PRESTATION_TICKETS : prestationTickets).slice(0, 8).map(ticket => {
                              const status = normalizeTicketStatus(ticket.status);
                              return <tr key={ticket.id} className={isCommunity ? undefined : styles.dataTableRowClickable} onClick={isCommunity ? undefined : () => handleOpenTicket(ticket)} onAuxClick={isCommunity ? undefined : e => {
                                if (e.button === 1) {
                                  e.preventDefault();
                                  handleOpenTicket(ticket, true);
                                }
                              }}>
                                        <td>#{ticket.ticket_number || "-"}</td>
                                        <td className={styles.activityTitleCell}>
                                          {getPrestationCategoryLabel(ticket.category, locale)}
                                        </td>
                                        <td>
                                          <span className={styles.ticketStatusBadge}>
                                            {getTicketStatusLabel(status, locale)}
                                          </span>
                                        </td>
                                        <td>{formatTableDate(ticket.created_at)}</td>
                                      </tr>;
                            })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </ProFeatureLock>
                    </div>

                    <ProFeatureLock locked={isCommunity} featureLabel={copy.proFeatures.campaigns} featureKey="cyberCampaigns" className={`${styles.activityBlockProLock} ${styles.activityCampaignsRow}`} badgePosition="none">
                      <div className={styles.activityBlock}>
                        <div className={styles.activityBlockHeader}>
                          <h3 className={styles.activityBlockTitle}>
                            <Icon icon="mdi:bullhorn-outline" aria-hidden />
                            {copy.campaignsTitle}
                            {isCommunity ? <ProFeatureBadge variant="inline" className={styles.proBadgeInline} /> : null}
                          </h3>
                          <div className={styles.activityBlockHeaderActions}>
                            <span className={styles.activityBlockCount}>
                              {interpolate(copy.campaignsOngoing, {
                            count: ongoingCampaigns.length
                          })}
                            </span>
                            {!isCommunity && canManageCampaigns && client?.id ? <SmartTooltip as="span" content={copy.addCampaign}>
                                <button type="button" className={styles.addEquipmentButton} onClick={handleOpenCreateCampaign} aria-label={copy.addCampaign}>
                                  <FaPlus />
                                </button>
                              </SmartTooltip> : null}
                          </div>
                        </div>
                        <div className={styles.dataTableWrapper}>
                          <table className={styles.dataTable}>
                            <thead>
                              <tr>
                                <th>{copy.table.name}</th>
                                <th>{copy.table.type}</th>
                                <th>{copy.table.status}</th>
                                <th>{copy.table.progress}</th>
                                <th>{copy.table.start}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ongoingCampaigns.length === 0 ? <tr>
                                  <td colSpan={5} className={styles.dataTableEmptyCell}>
                                    {copy.emptyCampaigns}
                                  </td>
                                </tr> : ongoingCampaigns.slice(0, 8).map(campaign => <tr key={campaign.id} className={isCommunity ? undefined : styles.dataTableRowClickable} onClick={isCommunity ? undefined : () => handleOpenCampaign(campaign)}>
                                    <td className={styles.activityTitleCell}>{campaign.name || "-"}</td>
                                    <td>{getCampaignTypeLabel(campaign.type, locale)}</td>
                                    <td>
                                      <span className={styles.ticketStatusBadge}>
                                        {getCampaignStatusLabel(campaign.status, locale)}
                                      </span>
                                    </td>
                                    <td className={styles.activityProgressCell}>
                                      {typeof campaign.global_progress === "number" ? `${Math.round(campaign.global_progress)} %` : "-"}
                                    </td>
                                    <td>{formatTableDate(campaign.start_date)}</td>
                                  </tr>)}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </ProFeatureLock>
                    </div>}
              </div>
            </section>

            <ProFeatureLock locked={isCommunity} featureLabel={copy.proFeatures.vault} featureKey="vault">
              <section className={styles.panel} data-guide="enterprise-vault">
                <div className={styles.panelHeader}>
                  <div className={styles.panelHeaderMain}>
                    <h2 className={styles.panelTitle}>{vaultCopy.panel.sectionTitle}</h2>
                  </div>
                  {client?.id && canManageVault ? <div className={styles.panelToolbar}>
                      <SmartTooltip as="span" content={vaultCopy.panel.addToVault}>
                        <button type="button" className={styles.addEquipmentButton} onClick={() => vaultPanelRef.current?.openUploadModal()} aria-label={vaultCopy.panel.addToVault}>
                          <FaPlus />
                        </button>
                      </SmartTooltip>
                    </div> : null}
                </div>
                <div className={styles.panelBody}>
                  {client?.id ? <EnterpriseVaultPanel ref={vaultPanelRef} copy={vaultCopy} clientId={client.id} clientName={client.name} /> : null}
                </div>
              </section>
            </ProFeatureLock>
          </main>

          <aside className={styles.asidePanel}>
            <div className={styles.rightSidebarContent}>
            <section className={styles.sidebarSection} data-guide="enterprise-sidebar-info">
              <div className={styles.sidebarInfoHeader}>
                <span className={styles.sidebarInfoTitle}>{copy.sidebarInfo}</span>
              </div>
              <div className={styles.sidebarSummaryList}>
                {infoExpanded && <>
                    <div className={styles.sidebarSummaryItem}>
                      <span className={styles.sidebarSummaryLabel}>{LEGAL_IDENTIFIER_LABEL}</span>
                      {formData.siret ? <span className={styles.sidebarSummaryValue}>
                          {normalizeLegalIdentifier(formData.siret)}
                        </span> : <span className={styles.sidebarSummaryValueEmpty}>-</span>}
                    </div>
                    <div className={styles.sidebarSummaryItem}>
                      <span className={styles.sidebarSummaryLabel}>{copy.sectorLabel}</span>
                      {formData.secteur?.trim() ? <span className={styles.sidebarSummaryValue}>{formData.secteur.trim()}</span> : <span className={styles.sidebarSummaryValueEmpty}>-</span>}
                    </div>
                    <div className={styles.sidebarSummaryItem}>
                      <span className={styles.sidebarSummaryLabel}>{copy.addressLabel}</span>
                      {clientDisplayAddress ? <span className={styles.sidebarSummaryValue}>{clientDisplayAddress}</span> : <span className={styles.sidebarSummaryValueEmpty}>-</span>}
                    </div>
                  </>}
                <div className={styles.sidebarFieldsRow}>
                  <div className={styles.sidebarSummaryItem}>
                    <span className={styles.sidebarSummaryLabel}>{copy.startDateLabel}</span>
                    <span className={styles.sidebarSummaryValue}>
                      {formatTableDate(formData.contrat?.debut)}
                    </span>
                  </div>
                  <div className={styles.sidebarSummaryItem}>
                    <span className={styles.sidebarSummaryLabel}>{copy.endDateLabel}</span>
                    <span className={styles.sidebarSummaryValue}>
                      {formatTableDate(formData.contrat?.expiration)}
                    </span>
                  </div>
                </div>
                <div className={styles.sidebarSummaryItem}>
                  <span className={styles.sidebarSummaryLabel}>{copy.contractOptionsLabel}</span>
                  <div className={styles.sidebarOptionsIconsContract}>
                    {enabledModules.map(mod => {
                      const active = !!formData.modules?.[mod.moduleKey];
                      return <SmartTooltip key={mod.moduleKey} content={mod.label}>
                          <span className={`${styles.sidebarOptionIcon} ${active ? styles.sidebarOptionIconActive : styles.sidebarOptionIconInactive}`}>
                            <Icon icon={mod.icon || "mdi:puzzle-outline"} className={styles.sidebarOptionIconInner} />
                          </span>
                        </SmartTooltip>;
                    })}
                  </div>
                </div>
              </div>
              <SidebarExpandToggle expanded={infoExpanded} onClick={() => setInfoExpanded(prev => !prev)} panelStyles={styles} copy={copy} />
            </section>

            {(isCommunity || supportCreditBalance !== null) && <section className={`${styles.sidebarSection} ${styles.sidebarCreditsSection}`}>
                <button type="button" className={`${styles.sidebarCollapseHeader} ${isCommunity ? styles.sidebarCollapseHeaderLocked : ""}`} onClick={() => {
                if (isCommunity) {
                  notifyProFeature(copy.proFeatures.creditPacks, "credits");
                  return;
                }
                setCreditsExpanded(prev => !prev);
              }} aria-expanded={isCommunity ? false : creditsExpanded} aria-controls="enterprise-sidebar-credits">
                  <span className={styles.sidebarInfoTitle}>
                    {copy.creditsTitle}
                    {!isCommunity && supportCreditBalance != null ? (
                      <span className={styles.sidebarCreditsBadge} title={copy.creditsTitle}>
                        {Number(supportCreditBalance) || 0}
                      </span>
                    ) : null}
                    {isCommunity ? <ProFeatureBadge variant="inline" className={styles.proBadgeInline} /> : null}
                  </span>
                  <Icon icon={!isCommunity && creditsExpanded ? "mdi:chevron-up" : "mdi:chevron-down"} className={styles.sidebarCollapseChevron} aria-hidden />
                </button>
                {!isCommunity && creditsExpanded && <div className={styles.sidebarBody} id="enterprise-sidebar-credits">
                    {canAddCredits && <div className={styles.sidebarBodyActions}>
                        <SmartTooltip content={copy.addCreditPack}>
                          <button type="button" className={styles.editInfoButton} onClick={() => setSupportCreditModalOpen(true)} aria-label={copy.addCreditPack}>
                            <FaPlus />
                          </button>
                        </SmartTooltip>
                        <SmartTooltip content={copy.openCreditsAdmin}>
                          <button type="button" className={styles.editInfoButton} onClick={handleOpenSupportCreditsAdmin} aria-label={copy.openCreditsAdmin}>
                            <Icon icon="mdi:cog-outline" aria-hidden />
                          </button>
                        </SmartTooltip>
                      </div>}
                    <ProFeatureLock locked={isCommunity} featureLabel={copy.proFeatures.creditPacks} featureKey="credits" badgePosition="none" softLocked={isCommunity}>
                      {visibleSupportPacks.length > 0 && !isCommunity ? <ul className={styles.activityCreditList}>
                          {visibleSupportPacks.map(pack => {
                      const remaining = Number(pack.remaining_amount) || 0;
                      const initial = Number(pack.initial_amount) || 0;
                      const until = pack.valid_until ? new Date(pack.valid_until).toLocaleDateString("en-GB") : null;
                      const status = String(pack.status || "active");
                      return <li key={pack.id} className={`${styles.activityCreditCard} ${status === "depleted" || status === "expired" ? styles.activityCreditCardMuted : ""}`.trim()}>
                                <div className={styles.activityCreditIcon} aria-hidden>
                                  <Icon icon="mdi:ticket-confirmation-outline" />
                                </div>
                                <div className={styles.activityCreditBody}>
                                  <div className={styles.activityCreditTop}>
                                    <span className={styles.activityCreditLabel}>
                                      {pack.label || copy.creditPackDefault}
                                    </span>
                                    <span className={`${styles.activityCreditValue} ${remaining <= 0 ? styles.activityCreditValueEmpty : ""}`}>
                                      {remaining}/{initial}
                                    </span>
                                  </div>
                                  <div className={styles.activityCreditMeta}>
                                    <Icon icon="mdi:calendar-end" className={styles.activityCreditMetaIcon} aria-hidden />
                                    <span>
                                      {until ? interpolate(copy.creditValidUntil, {
                                date: until
                              }) : copy.creditNoExpiry}
                                    </span>
                                  </div>
                                </div>
                              </li>;
                    })}
                        </ul> : isCommunity ? <span className={styles.sidebarSummaryValue}>{copy.noCreditPack}</span> : canAddCredits ? <div className={styles.clientNotesEmpty}>
                          <button type="button" className={styles.clientNotesAddButton} onClick={() => setSupportCreditModalOpen(true)}>
                            {copy.addCredit}
                          </button>
                        </div> : <span className={styles.sidebarSummaryValue}>{copy.noActiveCreditPack}</span>}
                    </ProFeatureLock>
                  </div>}
              </section>}

            <section className={`${styles.sidebarSection} ${styles.sidebarSlaSection}`}>
              <button type="button" className={`${styles.sidebarCollapseHeader} ${isCommunity ? styles.sidebarCollapseHeaderLocked : ""}`} onClick={() => {
                if (isCommunity) {
                  notifyProFeature(copy.proFeatures.sla, "sla");
                  return;
                }
                setSlaExpanded(prev => !prev);
              }} aria-expanded={isCommunity ? false : slaExpanded} aria-controls="enterprise-sidebar-sla">
                <span className={styles.sidebarInfoTitle}>
                  {copy.slaTitle}
                  {isCommunity ? <ProFeatureBadge variant="inline" className={styles.proBadgeInline} /> : null}
                </span>
                <Icon icon={!isCommunity && slaExpanded ? "mdi:chevron-up" : "mdi:chevron-down"} className={styles.sidebarCollapseChevron} aria-hidden />
              </button>
              {!isCommunity && slaExpanded && <div className={styles.sidebarBody} id="enterprise-sidebar-sla">
                  <ProFeatureLock locked={isCommunity} featureLabel={copy.proFeatures.sla} featureKey="sla" badgePosition="none" softLocked={isCommunity}>
                    {parseClientSla(client?.contrat).enabled ? <table className={styles.sidebarSlaTable}>
                        <thead>
                          <tr>
                            <th scope="col" />
                            <th scope="col">{copy.slaFirstCol}</th>
                            <th scope="col">{copy.slaResolutionCol}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formatClientSlaRows(client?.contrat).map(row => <tr key={row.key}>
                              <th scope="row">{SLA_PRIORITY_LABELS[row.key] || row.label}</th>
                              <td>{row.firstResponseHours}h</td>
                              <td>{row.resolutionHours}h</td>
                            </tr>)}
                        </tbody>
                      </table> : <span className={styles.sidebarSummaryValue}>{copy.noActiveSla}</span>}
                  </ProFeatureLock>
                </div>}
            </section>

            <section className={styles.sidebarSection} data-guide="enterprise-sidebar-contacts">
              <button type="button" className={styles.sidebarCollapseHeader} onClick={() => setContactsSectionExpanded(prev => !prev)} aria-expanded={contactsSectionExpanded} aria-controls="enterprise-sidebar-contacts">
                <span className={styles.sidebarInfoTitle}>
                  {copy.contactsTitle}
                  {!loadingContacts && contacts.length > 0 ? <span className={styles.sidebarSectionCount}>{activeContactCount}</span> : null}
                </span>
                <Icon icon={contactsSectionExpanded ? "mdi:chevron-up" : "mdi:chevron-down"} className={styles.sidebarCollapseChevron} aria-hidden />
              </button>
              {contactsSectionExpanded && <div className={styles.sidebarBody} id="enterprise-sidebar-contacts">
                <div className={styles.sidebarBodyActions}>
                  {canAddContact ? <SmartTooltip content={copy.addContact}>
                    <button type="button" className={styles.editInfoButton} onClick={handleAddContact} aria-label={copy.addContact}>
                      <FaPlus />
                    </button>
                  </SmartTooltip> : null}
                </div>
              {loadingContacts ? <div className={styles.loadingState}>{copy.loadingContacts}</div> : !contacts || contacts.length === 0 ? <div className={styles.emptyState}>
                  <Icon icon="mdi:account-multiple" className={styles.emptyIcon} />
                  <h5>{copy.noContacts}</h5>
                </div> : <>
                <ul className={styles.sidebarContactsList}>
                  {visibleContacts.map(contact => <SmartTooltip as="li" key={contact.id} className={styles.sidebarContactItem} onClick={() => {
                      if (onNavigate) {
                        onNavigate("ContactDetail", {
                          contactId: contact.id
                        });
                      }
                    }} content={copy.viewContactDetails}>
                      <div className={styles.sidebarContactAvatar} aria-hidden>
                        {getContactInitials(contact)}
                      </div>
                      <div className={styles.sidebarContactBody}>
                        <div className={styles.sidebarContactTop}>
                          <div className={styles.sidebarContactIdentity}>
                            <span className={styles.sidebarContactNameRow}>
                              <span className={styles.sidebarContactName}>
                                {contact.nom} {contact.prenom}
                              </span>
                              {isContactPrimaryForClient(contact, client?.id) ? <span className={styles.sitePreviewPrimary}>{copy.contactPrimary}</span> : null}
                            </span>
                            {contact.poste && <span className={styles.sidebarContactRole}>
                                {contact.poste}
                              </span>}
                          </div>
                          <div className={styles.sidebarContactActions}>
                            <button type="button" className={styles.sidebarCopyButton} title={copy.copyContactCard} aria-label={copy.copyContactCard} onClick={e => {
                              e.stopPropagation();
                              copyContactCard(contact);
                            }}>
                              <Icon icon="mdi:content-copy" />
                            </button>
                            <button type="button" className={styles.sidebarShareButton} title={copy.shareContactCard} aria-label={copy.shareContactCard} onClick={e => {
                              e.stopPropagation();
                              shareContactCard(contact);
                            }}>
                              <Icon icon="mdi:share-variant" />
                            </button>
                          </div>
                        </div>
                        {(() => {
                          const communications = normalizeContactCommunications(contact);
                          if (communications.length === 0) return null;
                          return <div className={styles.sidebarContactMeta}>
                              {communications.map(entry => {
                              const typeDef = getCommunicationTypeDef(entry.type);
                              const href = entry.type === "email" ? toMailtoHref(entry.value) : entry.type === "telephone" ? toTelHref(entry.value) : null;
                              const RowTag = href ? "a" : "span";
                              return <RowTag key={entry.id} href={href || undefined} className={styles.sidebarContactMetaRow} title={entry.isPrimary ? interpolate(copy.coordFavoriteTitle, {
                                label: typeDef.label
                              }) : typeDef.label} onClick={href ? e => e.stopPropagation() : undefined}>
                                    <Icon icon={typeDef.icon} className={styles.sidebarContactMetaIcon} aria-hidden />
                                    <span>{entry.value}</span>
                                    {entry.isPrimary ? <Icon icon="mdi:star" className={styles.sidebarContactFavoriteStar} title={copy.coordFavorite} aria-label={copy.coordFavorite} /> : null}
                                  </RowTag>;
                            })}
                            </div>;
                        })()}
                      </div>
                    </SmartTooltip>)}
                </ul>
                {hasMoreContacts && <SidebarExpandToggle expanded={contactsExpanded} onClick={() => setContactsExpanded(prev => !prev)} panelStyles={styles} copy={copy} />}
                </>}
              </div>}
            </section>

            <section className={styles.sidebarSection} data-guide="enterprise-sidebar-prestataires">
              <button type="button" className={styles.sidebarCollapseHeader} onClick={() => setPrestatairesSectionExpanded(prev => !prev)} aria-expanded={prestatairesSectionExpanded} aria-controls="enterprise-sidebar-prestataires">
                <span className={styles.sidebarInfoTitle}>
                  {copy.providersTitle}
                  {!loadingPrestataires && prestataires.length > 0 ? <span className={styles.sidebarSectionCount}>{prestataires.length}</span> : null}
                </span>
                <Icon icon={prestatairesSectionExpanded ? "mdi:chevron-up" : "mdi:chevron-down"} className={styles.sidebarCollapseChevron} aria-hidden />
              </button>
              {prestatairesSectionExpanded && <div className={styles.sidebarBody} id="enterprise-sidebar-prestataires">
                <div className={styles.sidebarBodyActions}>
                  {canAddPrestataire ? <SmartTooltip content={copy.addProvider}>
                    <button type="button" className={styles.editInfoButton} onClick={openPrestataireAttachModal} aria-label={copy.addProvider}>
                      <FaPlus />
                    </button>
                  </SmartTooltip> : null}
                </div>
              {loadingPrestataires ? <div className={styles.loadingState}>{copy.loadingProviders}</div> : !prestataires || prestataires.length === 0 ? <div className={styles.emptyState}>
                  <Icon icon="mdi:handshake-outline" className={styles.emptyIcon} />
                  <h5>{copy.noProviders}</h5>
                </div> : <>
                <ul className={styles.sidebarContactsList}>
                  {visiblePrestataires.map(prestataire => <SmartTooltip as="li" key={prestataire.id} className={styles.sidebarContactItem} onClick={() => {
                      if (onNavigate) {
                        onNavigate("PrestataireDetail", {
                          prestataireId: prestataire.id,
                          nom: prestataire.nom
                        });
                      }
                    }} content={copy.viewProviderDetails}>
                      <div className={styles.sidebarContactAvatar} aria-hidden>
                        {(prestataire.nom || "PR").slice(0, 2).toUpperCase()}
                      </div>
                      <div className={styles.sidebarContactBody}>
                        <div className={styles.sidebarContactTop}>
                          <div className={styles.sidebarContactIdentity}>
                            <span className={styles.sidebarContactName}>{prestataire.nom || "-"}</span>
                            {prestataire.type ? <span className={styles.sidebarContactRole}>{prestataire.type}</span> : null}
                          </div>
                        </div>
                        {(prestataire.email || prestataire.telephone || (Array.isArray(prestataire.contacts) && prestataire.contacts[0])) ? <div className={styles.sidebarContactMeta}>
                            {(() => {
                        const primary = Array.isArray(prestataire.contacts) && prestataire.contacts[0]
                          ? prestataire.contacts[0]
                          : null;
                        const email = primary?.email || prestataire.email;
                        const telephone = primary?.telephone || prestataire.telephone;
                        const person = primary
                          ? [primary.prenom, primary.nom].filter(Boolean).join(" ")
                          : [prestataire.contact_prenom, prestataire.contact_nom].filter(Boolean).join(" ");
                        return <>
                              {person ? <span className={styles.sidebarContactMetaRow}>
                                  <Icon icon="mdi:account-outline" className={styles.sidebarContactMetaIcon} aria-hidden />
                                  <span>{person}</span>
                                </span> : null}
                              {email ? <a href={`mailto:${encodeURIComponent(email)}`} className={styles.sidebarContactMetaRow} onClick={e => e.stopPropagation()}>
                                <Icon icon="mdi:email-outline" className={styles.sidebarContactMetaIcon} aria-hidden />
                                <span>{email}</span>
                              </a> : null}
                              {telephone ? <a href={`tel:${String(telephone).replace(/[^\d+]/g, "")}`} className={styles.sidebarContactMetaRow} onClick={e => e.stopPropagation()}>
                                <Icon icon="mdi:phone-outline" className={styles.sidebarContactMetaIcon} aria-hidden />
                                <span>{telephone}</span>
                              </a> : null}
                            </>;
                      })()}
                          </div> : null}
                      </div>
                    </SmartTooltip>)}
                </ul>
                {hasMorePrestataires && <SidebarExpandToggle expanded={prestatairesExpanded} onClick={() => setPrestatairesExpanded(prev => !prev)} panelStyles={styles} copy={copy} />}
                </>}
              </div>}
            </section>

            <section className={styles.sidebarSection}>
              <button type="button" className={styles.sidebarCollapseHeader} onClick={() => setSitesSectionExpanded(prev => !prev)} aria-expanded={sitesSectionExpanded} aria-controls="enterprise-sidebar-sites">
                <span className={styles.sidebarInfoTitle}>
                  {copy.sitesTitle}
                  {(formData.sites || []).length > 0 ? <span className={styles.sidebarSectionCount}>{clientSites.length}</span> : null}
                </span>
                <Icon icon={sitesSectionExpanded ? "mdi:chevron-up" : "mdi:chevron-down"} className={styles.sidebarCollapseChevron} aria-hidden />
              </button>
              {sitesSectionExpanded && <div className={styles.sidebarBody} id="enterprise-sidebar-sites">
                <div className={styles.sidebarBodyActions}>
                  {canManageSites ? <SmartTooltip content={copy.manageSites}>
                    <button type="button" className={styles.editInfoButton} onClick={() => setSitesModalOpen(true)} aria-label={copy.manageSites}>
                      <FaPencilAlt />
                    </button>
                  </SmartTooltip> : null}
                </div>
                {(formData.sites || []).length === 0 ? <div className={styles.emptyState}>
                    <Icon icon="mdi:map-marker-outline" className={styles.emptyIcon} />
                    <h5>{copy.noSites}</h5>
                  </div> : <>
                  <div className={styles.sitesToolbar}>
                    <Icon icon="mdi:magnify" className={styles.sitesSearchIcon} aria-hidden />
                    <input type="text" inputMode="search" autoComplete="off" className={styles.sitesSearchInput} value={sitesSearch} onChange={event => {
                    setSitesSearch(event.target.value);
                    setSitesPage(1);
                  }} placeholder={copy.searchSites} aria-label={copy.searchSitesAria} />
                    {sitesSearch ? <button type="button" className={styles.sitesSearchClear} onClick={() => {
                    setSitesSearch("");
                    setSitesPage(1);
                  }} aria-label={common.close}>
                        <Icon icon="mdi:close" aria-hidden />
                      </button> : null}
                  </div>
                  {filteredSites.length === 0 ? <div className={styles.sitesEmptySearch}>
                      <Icon icon="mdi:magnify" aria-hidden />
                      <p>{copy.noSiteResults}</p>
                    </div> : <>
                      <div className={styles.sitesDisplayCards}>
                        {pagedSites.map(site => {
                    const address = buildSiteAddress(site);
                    const siteValue = getSiteLocationValue(site);
                    const isActive = activeSiteFilter === siteValue;
                    return <button type="button" key={getSiteId(site)} className={`${styles.sitePreviewCard} ${styles.siteFilterButton} ${isActive ? styles.siteFilterButtonActive : ""}`} onClick={() => setActiveSiteFilter(isActive ? null : siteValue)} title={interpolate(copy.filterSiteTitle, {
                      name: getSiteDisplayName(site)
                    })}>
                              <div className={styles.sitePreviewMain}>
                                <strong className={styles.sitePreviewName}>
                                  {getSiteDisplayName(site)}
                                  {site.isPrimary ? <span className={styles.sitePreviewPrimary}>{copy.sitePrimary}</span> : null}
                                </strong>
                                {address ? <span className={styles.sitePreviewAddress}>{address}</span> : null}
                              </div>
                              <div className={styles.sitePreviewMap} onClick={event => event.stopPropagation()}>
                                <SiteMapPreview latitude={site.latitude} longitude={site.longitude} label={getSiteDisplayName(site)} address={address} compact />
                              </div>
                            </button>;
                  })}
                      </div>
                      {sitesTotalPages > 1 ? <div className={styles.sitesPager}>
                          <button type="button" className={styles.sitesPagerBtn} onClick={() => setSitesPage(safeSitesPage - 1)} disabled={safeSitesPage <= 1} aria-label={common.prevPage} title={common.prevPage}>
                            <Icon icon="mdi:chevron-left" aria-hidden />
                          </button>
                          <span className={styles.sitesPagerInfo}>{interpolate(copy.sitesRange, {
                      start: String(sitesRangeStart),
                      end: String(sitesRangeEnd),
                      total: String(filteredSites.length)
                    })}</span>
                          <button type="button" className={styles.sitesPagerBtn} onClick={() => setSitesPage(safeSitesPage + 1)} disabled={safeSitesPage >= sitesTotalPages} aria-label={common.nextPage} title={common.nextPage}>
                            <Icon icon="mdi:chevron-right" aria-hidden />
                          </button>
                        </div> : null}
                    </>}
                  </>}
              </div>}
            </section>

            <section className={styles.sidebarSection} data-guide="enterprise-sidebar-notes">
              <button type="button" className={styles.sidebarCollapseHeader} onClick={() => setNotesSectionExpanded(prev => !prev)} aria-expanded={notesSectionExpanded} aria-controls="enterprise-sidebar-notes">
                <span className={styles.sidebarInfoTitle}>
                  {copy.notesTitle}
                  {!loadingNotes && notes.length > 0 ? <span className={styles.sidebarSectionCount}>{notes.length}</span> : null}
                </span>
                <Icon icon={notesSectionExpanded ? "mdi:chevron-up" : "mdi:chevron-down"} className={styles.sidebarCollapseChevron} aria-hidden />
              </button>
              {notesSectionExpanded && <div className={styles.sidebarBody} id="enterprise-sidebar-notes">
                {!loadingNotes && notes.length > 0 && canManageNotes ? <div className={styles.sidebarBodyActions}>
                    <SmartTooltip content={copy.addNote}>
                      <button type="button" className={styles.editInfoButton} onClick={openCreateNoteModal} aria-label={copy.addNote}>
                        <FaPlus />
                      </button>
                    </SmartTooltip>
                  </div> : null}
              {loadingNotes ? <div className={styles.loadingState}>{copy.loadingNotes}</div> : notes.length === 0 ? <div className={styles.clientNotesEmpty}>
                  {canManageNotes ? <button type="button" className={styles.clientNotesAddButton} onClick={openCreateNoteModal}>
                    {copy.addNote}
                  </button> : null}
                </div> : <ul className={styles.clientNotesList}>
                  {notes.map(note => <li key={note.id} className={styles.clientNoteItem}>
                      <div className={styles.clientNoteHeader}>
                        <div className={styles.clientNoteMeta}>
                          <span className={styles.clientNoteAuthor}>
                            {note.username || note.email || copy.noteUserFallback}
                          </span>
                          <span className={styles.clientNoteDate}>
                            {formatNoteDate(note.created_at)}
                            {note.updated_at && note.updated_at !== note.created_at ? interpolate(copy.noteEdited, {
                            date: formatNoteDate(note.updated_at)
                          }) : ""}
                          </span>
                        </div>
                        {canEditNote(note) ? <div className={styles.clientNoteActions}>
                            <SmartTooltip content={copy.editNote}>
                              <button type="button" className={`${styles.editInfoButton} ${styles.clientNoteActionBtn}`} onClick={() => openEditNoteModal(note)} aria-label={copy.editNoteAria}>
                                <FaPencilAlt />
                              </button>
                            </SmartTooltip>
                            <SmartTooltip content={copy.deleteNote}>
                              <button type="button" className={`${styles.cancelInfoButton} ${styles.clientNoteActionBtn}`} onClick={() => handleDeleteNote(note.id)} aria-label={copy.deleteNoteAria}>
                                <Icon icon="mdi:trash-can-outline" />
                              </button>
                            </SmartTooltip>
                          </div> : null}
                      </div>
                      <p className={styles.clientNoteContent}>{note.content}</p>
                    </li>)}
                </ul>}
              </div>}
            </section>
          </div>
        </aside>
        </div>
      </div>

      <EnterpriseEditModal open={enterpriseEditModalOpen} mode="edit" formData={formData} users={users} loadingUsers={loadingUsers} saving={saving} hasChanges={hasChanges} onClose={closeEnterpriseEditModal} onSave={handleSave} updateFormData={updateFormData} updateContratField={updateContratField} handleModuleToggle={handleModuleToggle} onOpenSitesModal={() => setSitesModalOpen(true)} onUserCreated={newUser => setUsers(prev => [...prev.filter(user => user.id !== newUser.id), newUser])} enabledModules={enabledModules} isCommunity={isCommunity} onDeleteEnterprise={canDeleteClient ? requestDeleteEnterpriseFromEdit : null} deleteBlockedTooltip={deleteBlockedTooltip} deleteDisabled={saving || deletingClient || loadingDeletionCheck || !deletionCheckClient} deleteLoading={deletingClient} deletionBlocked={enterpriseDeletionBlocked} loadingDeletionCheck={loadingDeletionCheck} />

      <EnterpriseBlockersModal open={deletionBlockersModalOpen} client={deletionClientSnapshot} onClose={() => setDeletionBlockersModalOpen(false)} />

      <EnterpriseDeleteModal open={deleteClientModalOpen} clientName={formData?.name || client?.name || copy.defaultEnterpriseName} saving={deletingClient} onClose={closeDeleteClientModal} onConfirm={confirmDeleteClient} />

      <ProFeaturePromoModal open={Boolean(proPromoFeature)} featureKey={proPromoFeature} onClose={() => setProPromoFeature(null)} />

      <SupportCreditPackModal open={supportCreditModalOpen} mode="create" pack={supportCreditPackSeed} clients={supportCreditModalClients} lockClient onClose={() => setSupportCreditModalOpen(false)} onSaved={reloadSupportCredits} />

      {}
      {photoModalOpen && <div className={styles.modalOverlay} onClick={() => setPhotoModalOpen(false)}>
          <div className={`${styles.modalContent} ${styles.logDetailsModal}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <FaCamera className={styles.modalIcon} />
                {copy.modals.photoTitle}
              </h2>
              <SmartTooltip as="button" className={styles.modalCloseButton} onClick={() => setPhotoModalOpen(false)} content={copy.close}>
                <FaTimes />
              </SmartTooltip>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.comingSoonMessage}>
                <Icon icon="mdi:clock-outline" width={48} height={48} className={styles.comingSoonIcon} />
                <h3>{copy.modals.comingSoonTitle}</h3>
                <p>{copy.modals.comingSoonIntro}</p>
                <ul className={styles.comingSoonList}>
                  {copy.modals.comingSoonBullets.map(item => <li key={item}>{item}</li>)}
                </ul>
                <p className={styles.comingSoonNote}>{copy.modals.comingSoonNote}</p>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.modalOkButton} onClick={() => setPhotoModalOpen(false)}>
                {copy.understood}
              </button>
            </div>
          </div>
        </div>}

      <ContactFormModal open={contactModalOpen} initialContact={editingContact} clients={client ? [{
      id: client.id,
      name: client.name
    }] : []} fixedClientId={client?.id ?? null} stacked onClose={handleContactModalClose} onSuccess={() => {
      if (client?.id) loadContacts(client.id);
    }} />

      <PrestataireAttachModal
        open={showPrestataireModal}
        companyName={formData?.name || client?.name || ""}
        providers={availablePrestataires}
        loading={loadingAvailablePrestataires}
        saving={attachingPrestataire}
        onClose={() => {
          if (attachingPrestataire) return;
          setShowPrestataireModal(false);
        }}
        onSelect={handleAttachPrestataire}
      />

      <ClientNoteModal open={noteModalOpen} mode={noteModalMode} initialContent={noteModalInitialContent} clientName={formData?.name || client?.name || ""} copy={copy} saving={savingNote} onClose={closeNoteModal} onSubmit={handleNoteModalSubmit} />

      <ClientTagModal open={tagModalOpen} entityName={formData?.name || client?.name || ""} assignedTags={clientTags} saving={addingTag} onClose={() => {
      if (addingTag) return;
      setTagModalOpen(false);
    }} onSubmit={handleAddClientTag} />

      {}
      <PlanningEventModalBridge open={eventModalOpen} editingEvent={editingEvent} initialClientId={client?.id || null} initialClientName={formData?.name || client?.name || ""} onClose={() => {
      setEventModalOpen(false);
      setEditingEvent(null);
    }} onSaved={handleReloadClientActivity} />

      {}
      {sitesModalOpen && <SitesModal sites={formData.sites || []} onSave={handleSitesSave} onClose={() => setSitesModalOpen(false)} />}

      {}
      <DomainsModal isOpen={domainsModalOpen} onClose={() => setDomainsModalOpen(false)} domains={domainsData} onConfigure={() => {
      setDomainsModalOpen(false);
      openDomainsConfigModal("overview");
    }} />

      {domainsConfigModalOpen && client?.id && <DomainsConfigModal client={client} initialSection={domainsConfigInitialSection} initialProviderId={domainsConfigInitialProviderId} isCommunity={isCommunity} onClose={() => {
      setDomainsConfigModalOpen(false);
      setDomainsConfigInitialProviderId(null);
    }} onSaved={refreshDomainsState} />}

      {domainPickerOpen && client?.id && <DomainSolutionPickerModal open={domainPickerOpen} client={client} domains={domainPickerDomains} onClose={() => {
      setDomainPickerOpen(false);
      setDomainPickerDomains([]);
    }} onSelectDomain={domain => {
      setDomainPickerOpen(false);
      setDomainPickerDomains([]);
      setDomainOverviewItem(domain);
      setDomainOverviewOpen(true);
    }} onAddDomain={() => {
      setDomainPickerOpen(false);
      setDomainPickerDomains([]);
      openDomainsConfigModal("provider");
    }} onEditDomain={() => {
      setDomainPickerOpen(false);
      setDomainPickerDomains([]);
      openDomainsConfigModal("overview", globalOvhConfigured ? "ovh" : null);
    }} onDeleteDomain={async domain => {
      if (!client?.id) return;
      await removeMonitoredDomain(client.id, domain);
      await refreshDomainsState();
      toast.success(copy.toast.domainRemovedMonitoring);
      const modulesData = await fetchClientModules(client.id);
      const remaining = listConfiguredDomains(client, [], modulesData);
      if (remaining.length === 0) {
        setDomainPickerOpen(false);
        setDomainPickerDomains([]);
        return;
      }
      setDomainPickerDomains(remaining);
    }} onReorderDomains={async orderedDomains => {
      if (!client?.id) return;
      const reordered = await reorderMonitoredDomains(client.id, orderedDomains);
      await refreshDomainsState();
      setDomainPickerDomains(reordered);
    }} onDomainsSynced={async updatedDomains => {
      await refreshDomainsState();
      if (Array.isArray(updatedDomains)) {
        setDomainPickerDomains(updatedDomains);
        return;
      }
      if (!client?.id) return;
      const modulesData = await fetchClientModules(client.id);
      setDomainPickerDomains(listConfiguredDomains(client, [], modulesData));
    }} />}

      {domainOverviewOpen && client?.id && domainOverviewItem && <DomainOverviewModal open={domainOverviewOpen} client={client} domainItem={domainOverviewItem} onClose={() => {
      setDomainOverviewOpen(false);
      setDomainOverviewItem(null);
    }} onSynced={refreshDomainsState} onEdit={() => {
      setDomainOverviewOpen(false);
      setDomainOverviewItem(null);
      openDomainsConfigModal("overview", globalOvhConfigured ? "ovh" : null);
    }} onDelete={async domain => {
      if (!client?.id) return;
      await removeMonitoredDomain(client.id, domain);
      await refreshDomainsState();
      toast.success(copy.toast.domainRemoved);
      setDomainOverviewOpen(false);
      setDomainOverviewItem(null);
    }} />}

      <SslCertificatesModal isOpen={sslModalOpen} onClose={() => setSslModalOpen(false)} certificates={sslData} clientId={client?.id} onRefresh={async () => {
      if (!client?.id) return;
      const items = await fetchClientSslCertificates(client.id, {
        autoCheck: true
      });
      setSslData(items);
      setEquipmentRevision(revision => revision + 1);
    }} />

      <LicencesAbonnementsModal isOpen={licencesModalOpen} onClose={() => setLicensesModalOpen(false)} licences={licencesData} clientId={client?.id} onRefresh={async () => {
      if (!client?.id) return;
      const items = await fetchClientLicences(client.id);
      setLicensesData(items);
      setEquipmentRevision(revision => revision + 1);
    }} />

      {antivirusConfigModalOpen && client?.id && <AntivirusConfigModal client={client} initialSection={antivirusConfigInitialSection} initialEditingSolution={antivirusConfigEditingSolution} isCommunity={isCommunity} onClose={() => {
      setAntivirusConfigModalOpen(false);
      setAntivirusConfigEditingSolution(null);
    }} onViewSolution={solution => {
      setAntivirusConfigModalOpen(false);
      const overviewCandidates = listOverviewAntivirusSolutions([solution]);
      if (overviewCandidates.length === 1) {
        navigateToAntivirusDetail(overviewCandidates[0]);
        return;
      }
      openAntivirusConfigModal("overview");
    }} onSaved={refreshAntivirusState} />}

      {antivirusPickerOpen && client?.id && <AntivirusSolutionPickerModal open={antivirusPickerOpen} client={client} solutions={antivirusPickerSolutions} onClose={() => {
      setAntivirusPickerOpen(false);
      setAntivirusPickerSolutions([]);
    }} onSelectSolution={solution => {
      setAntivirusPickerOpen(false);
      setAntivirusPickerSolutions([]);
      if (solution.companyId) {
        navigateToAntivirusDetail(solution);
        return;
      }
      openAntivirusConfigModal("overview");
    }} onAddSolution={() => {
      setAntivirusPickerOpen(false);
      setAntivirusPickerSolutions([]);
      openAntivirusConfigModal("solution");
    }} onEditSolution={solution => {
      setAntivirusPickerOpen(false);
      setAntivirusPickerSolutions([]);
      openAntivirusConfigModal("overview", solution);
    }} onDeleteSolution={async solution => {
      if (!client?.id) return;
      await removeAntivirusSolution(client.id, solution);
      await refreshAntivirusState();
      toast.success(copy.toast.antivirusAssociationRemoved);
      const modulesData = await fetchClientModules(client.id);
      const remaining = listConfiguredAntivirusSolutions(client, [], modulesData);
      if (remaining.length === 0) {
        setAntivirusPickerOpen(false);
        setAntivirusPickerSolutions([]);
        return;
      }
      setAntivirusPickerSolutions(remaining);
    }} onReorderSolutions={async orderedSolutions => {
      if (!client?.id) return;
      const reordered = await reorderAntivirusSolutions(client.id, orderedSolutions);
      await refreshAntivirusState();
      setAntivirusPickerSolutions(reordered);
    }} />}

      {microsoftTenantConfigModalOpen && client?.id && <MicrosoftTenantConfigModal client={client} initialSection={microsoftTenantConfigInitialSection} initialEditingTenant={microsoftTenantConfigEditingTenant} onClose={() => {
      setMicrosoftTenantConfigModalOpen(false);
      setMicrosoftTenantConfigEditingTenant(null);
    }} onViewTenant={credentials => {
      setMicrosoftTenantConfigModalOpen(false);
      setMicrosoftTenantConfigEditingTenant(null);
      navigateToMicrosoftTenantDetail(credentials);
    }} onSaved={refreshMicrosoftTenantState} />}

      {microsoftTenantPickerOpen && client?.id && <MicrosoftTenantSolutionPickerModal open={microsoftTenantPickerOpen} client={client} tenants={microsoftTenantPickerTenants} onClose={() => {
      setMicrosoftTenantPickerOpen(false);
      setMicrosoftTenantPickerTenants([]);
    }} onSelectTenant={tenant => {
      setMicrosoftTenantPickerOpen(false);
      setMicrosoftTenantPickerTenants([]);
      navigateToMicrosoftTenantDetail(tenant);
    }} onAddTenant={() => {
      setMicrosoftTenantPickerOpen(false);
      setMicrosoftTenantPickerTenants([]);
      openMicrosoftTenantConfigModal("configuration", null);
    }} onEditTenant={tenant => {
      setMicrosoftTenantPickerOpen(false);
      setMicrosoftTenantPickerTenants([]);
      openMicrosoftTenantConfigModal("overview", tenant);
    }} onDeleteTenant={async tenant => {
      if (!client?.id) return;
      await removeMicrosoftTenant(client.id, tenant);
      const remaining = await refreshMicrosoftTenantState();
      toast.success(copy.toast.microsoftTenantRemoved);
      if (remaining.length === 0) {
        setMicrosoftTenantPickerOpen(false);
        setMicrosoftTenantPickerTenants([]);
        return;
      }
      setMicrosoftTenantPickerTenants(remaining);
    }} />}

      {antispamConfigModalOpen && client?.id && <AntispamConfigModal client={client} initialSection={antispamConfigInitialSection} initialEditingSolution={antispamConfigEditingSolution} isCommunity={isCommunity} onClose={() => {
      setAntispamConfigModalOpen(false);
      setAntispamConfigEditingSolution(null);
    }} onViewSolution={solution => {
      setAntispamConfigModalOpen(false);
      const overviewCandidates = listOverviewAntispamSolutions([solution]);
      if (overviewCandidates.length === 1) {
        navigateToAntispamDetail(overviewCandidates[0]);
        return;
      }
      openAntispamConfigModal("overview");
    }} onSaved={refreshAntispamState} />}

      {antispamPickerOpen && client?.id && <AntispamSolutionPickerModal open={antispamPickerOpen} client={client} solutions={antispamPickerSolutions} onClose={() => {
      setAntispamPickerOpen(false);
      setAntispamPickerSolutions([]);
    }} onSelectSolution={solution => {
      setAntispamPickerOpen(false);
      setAntispamPickerSolutions([]);
      if (solution?.customerId || solution?.mailinblackTenantId) {
        navigateToAntispamDetail(solution);
        return;
      }
      openAntispamConfigModal("overview");
    }} onAddSolution={() => {
      setAntispamPickerOpen(false);
      setAntispamPickerSolutions([]);
      openAntispamConfigModal("solution");
    }} onEditSolution={solution => {
      setAntispamPickerOpen(false);
      setAntispamPickerSolutions([]);
      openAntispamConfigModal("overview", solution);
    }} onDeleteSolution={async solution => {
      if (!client?.id) return;
      await removeAntispamSolution(client.id, solution);
      const {
        modulesData,
        tenants
      } = await refreshAntispamState();
      toast.success(copy.toast.antispamAssociationRemoved);
      const remaining = listConfiguredAntispamSolutions(client, [], modulesData, tenants);
      if (remaining.length === 0) {
        setAntispamPickerOpen(false);
        setAntispamPickerSolutions([]);
        return;
      }
      setAntispamPickerSolutions(remaining);
    }} onReorderSolutions={async orderedSolutions => {
      if (!client?.id) return;
      await reorderAntispamSolutions(client.id, orderedSolutions);
      const {
        modulesData,
        tenants
      } = await refreshAntispamState();
      setAntispamPickerSolutions(listConfiguredAntispamSolutions(client, [], modulesData, tenants));
    }} />}

      {backupConfigModalOpen && client?.id && <BackupConfigModal client={client} onClose={() => setBackupConfigModalOpen(false)} onSaved={async () => {
      await loadBackupData(client.id);
      const modulesData = await fetchClientModules(client.id);
      hydrateServicesFromModules(modulesData);
      setClient(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          equipements: modulesData?.equipements ?? prev.equipements,
          modules_monitoring: modulesData?.modules_monitoring ?? prev.modules_monitoring
        };
      });
      setEquipmentRevision(revision => revision + 1);
    }} />}

      <CustomEquipmentModal isOpen={Boolean(customEquipmentModal?.family)} onClose={() => setCustomEquipmentModal(null)} family={customEquipmentModal?.family} item={customEquipmentModal?.item} client={client} clientId={client?.id} onRefresh={async () => {
      const familyKey = customEquipmentModal?.family?.familyKey;
      const result = await refreshClientEquipment();
      if (familyKey) {
        equipmentPageRef.current?.focusType?.(`Custom:${familyKey}`);
      }
      return result;
    }} />

      {}
      {serviceDetailsModalOpen && <div className={styles.modalOverlay} onClick={() => setServiceDetailsModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <Icon icon="mdi:web" className={styles.modalIcon} />
                {interpolate(copy.modals.domainsTitle, {
              count: domainsData.length
            })}
              </h2>
              <SmartTooltip as="button" className={styles.modalCloseButton} onClick={() => setServiceDetailsModalOpen(false)} content={copy.close}>
                <FaTimes />
              </SmartTooltip>
            </div>
            <div className={styles.modalBody}>
              {domainsData && domainsData.length > 0 ? <div className={styles.domainsTableSection}>
                  <div className={styles.dataTableWrapper}>
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>{copy.modals.domainName}</th>
                          <th>{copy.modals.registrar}</th>
                          <th>{copy.modals.expiration}</th>
                          <th>{copy.table.status}</th>
                          <th>{copy.modals.autoRenewal}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {domainsData.map((domain, index) => {
                    const isExpired = domain.expirityDate || domain.expiration ? new Date(domain.expirityDate || domain.expiration) < new Date() : false;
                    return <tr key={index}>
                              <td>
                                <span className={styles.domainName}>
                                  {domain.nom || domain.name || domain.domain || 'N/A'}
                                </span>
                              </td>
                              <td>{domain.registrar || domain.registrant || 'N/A'}</td>
                              <td>
                                {domain.expirityDate || domain.expiration ? new Date(domain.expirityDate || domain.expiration).toLocaleDateString('en-GB') : 'N/A'}
                              </td>
                              <td>
                                <span className={`${styles.statusBadge} ${isExpired ? styles.statusExpired : styles.statusActive}`}>
                                  {isExpired ? copy.modals.statusExpired : copy.modals.statusActive}
                                </span>
                              </td>
                              <td>
                                <span className={`${styles.statusBadge} ${domain.auto_renewal ? styles.statusActive : styles.statusExpired}`}>
                                  {domain.auto_renewal ? copy.modals.enabled : copy.modals.disabled}
                                </span>
                              </td>
                            </tr>;
                  })}
                      </tbody>
                    </table>
                  </div>
                </div> : <div className={styles.noDomainsMessage}>
                  <Icon icon="mdi:web-off" className={styles.noDomainsIcon} />
                  <p>{copy.modals.noDomains}</p>
                </div>}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.modalOkButton} onClick={() => setServiceDetailsModalOpen(false)}>
                {copy.close}
              </button>
            </div>
          </div>
        </div>}

      {}
      {userDetailsModalOpen && selectedSecurityItem && <div className={styles.modalOverlay} onClick={() => setUserDetailsModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <Icon icon={selectedSecurityItem.type === 'Antivirus' ? 'mdi:shield-check' : 'mdi:email-off'} className={styles.modalIcon} />
                {interpolate(copy.modals.securityUsersTitle, {
              name: selectedSecurityItem.nom || selectedSecurityItem.name || selectedSecurityItem.solution || "N/A"
            })}
              </h2>
              <SmartTooltip as="button" className={styles.modalCloseButton} onClick={() => setUserDetailsModalOpen(false)} content={copy.close}>
                <FaTimes />
              </SmartTooltip>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.securityDetailsGrid}>
                <div className={styles.securityDetail}>
                  <label className={styles.detailLabel}>{copy.modals.solution}</label>
                  <span className={styles.detailValue}>{selectedSecurityItem.nom || selectedSecurityItem.name || selectedSecurityItem.solution || 'N/A'}</span>
                </div>
                <div className={styles.securityDetail}>
                  <label className={styles.detailLabel}>{copy.modals.type}</label>
                  <span className={styles.detailValue}>
                    <span className={styles.solutionTypeBadge}>{selectedSecurityItem.type}</span>
                  </span>
                </div>
                <div className={styles.securityDetail}>
                  <label className={styles.detailLabel}>{copy.table.status}</label>
                  <span className={styles.detailValue}>
                    <span className={`${styles.statusBadge} ${(selectedSecurityItem.expirityDate || selectedSecurityItem.expiration) && new Date(selectedSecurityItem.expirityDate || selectedSecurityItem.expiration) < new Date() ? styles.statusExpired : styles.statusActive}`}>
                      {(selectedSecurityItem.expirityDate || selectedSecurityItem.expiration) && new Date(selectedSecurityItem.expirityDate || selectedSecurityItem.expiration) < new Date() ? copy.modals.statusExpired : copy.modals.statusActive}
                    </span>
                  </span>
                </div>
                <div className={styles.securityDetail}>
                  <label className={styles.detailLabel}>{copy.modals.expiration}</label>
                  <span className={styles.detailValue}>
                    {selectedSecurityItem.expirityDate || selectedSecurityItem.expiration ? new Date(selectedSecurityItem.expirityDate || selectedSecurityItem.expiration).toLocaleDateString('en-GB') : 'N/A'}
                  </span>
                </div>
              </div>

              <div className={styles.usersTableSection}>
                <h3 className={styles.sectionTitle}>
                  <Icon icon="mdi:account-group" />
                  {interpolate(copy.modals.usersTitle, {
                count: selectedSecurityItem.utilisateurs || selectedSecurityItem.nombre_utilisateurs || 0
              })}
                </h3>

                {selectedSecurityItem.utilisateurs_details && selectedSecurityItem.utilisateurs_details.length > 0 ? <div className={styles.dataTableWrapper}>
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>{copy.modals.lastName}</th>
                          <th>{copy.modals.email}</th>
                          <th>{copy.modals.lastActivity}</th>
                          <th>{copy.table.status}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSecurityItem.utilisateurs_details.map((user, userIndex) => <tr key={userIndex}>
                            <td>{user.nom || user.name || user.username || 'N/A'}</td>
                            <td>{user.email || user.mail || 'N/A'}</td>
                            <td>
                              {user.derniere_activite || user.last_activity ? new Date(user.derniere_activite || user.last_activity).toLocaleDateString('en-GB') : 'N/A'}
                            </td>
                            <td>
                              <span className={`${styles.statusBadge} ${user.actif !== false ? styles.statusActive : styles.statusExpired}`}>
                                {user.actif !== false ? copy.modals.statusActive : copy.modals.statusInactive}
                              </span>
                            </td>
                          </tr>)}
                      </tbody>
                    </table>
                  </div> : <div className={styles.noUsersMessage}>
                    <Icon icon="mdi:account-off" className={styles.noUsersIcon} />
                    <p>{copy.modals.noUserDetails}</p>
                    <p className={styles.noUsersSubtext}>
                      {interpolate(copy.modals.totalUsers, {
                  count: selectedSecurityItem.utilisateurs || selectedSecurityItem.nombre_utilisateurs || 0
                })}
                    </p>
                  </div>}
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.modalOkButton} onClick={() => setUserDetailsModalOpen(false)}>
                {copy.close}
              </button>
            </div>
          </div>
        </div>}

      {}
      {logDetailsModalOpen && selectedLog && <div className={styles.modalOverlay} onClick={() => setLogDetailsModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <Icon icon="mdi:history" className={styles.modalIcon} />
                {copy.modals.logTitle}
              </h2>
              <SmartTooltip as="button" className={styles.modalCloseButton} onClick={() => setLogDetailsModalOpen(false)} content={copy.close}>
                <FaTimes />
              </SmartTooltip>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.securityDetailsGrid}>
                <div className={styles.securityDetail}>
                  <label className={styles.detailLabel}>{copy.modals.logUser}</label>
                  <span className={styles.detailValue}>{selectedLog.user_name || selectedLog.user || copy.modals.logUnknownUser}</span>
                </div>
                <div className={styles.securityDetail}>
                  <label className={styles.detailLabel}>{copy.modals.logAction}</label>
                  <span className={styles.detailValue}>{selectedLog.action || copy.modals.logDefaultAction}</span>
                </div>
                <div className={styles.securityDetail}>
                  <label className={styles.detailLabel}>{copy.modals.logDateTime}</label>
                  <span className={styles.detailValue}>
                    {selectedLog.created_at ? new Date(selectedLog.created_at).toLocaleString('en-GB', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                }) : '-'}
                  </span>
                </div>
              </div>
              {renderLogDetails(selectedLog)}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.modalOkButton} onClick={() => setLogDetailsModalOpen(false)}>
                {copy.close}
              </button>
            </div>
          </div>
        </div>}

      {}
      {antivirusDetailsModalOpen && antivirusDetailData && <div className={styles.modalOverlay} onClick={() => setAntivirusDetailsModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{
        maxWidth: '900px',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <Icon icon="mdi:shield-check" className={styles.modalIcon} />
                {interpolate(copy.modals.antivirusTitle, {
              name: antivirusDetailData.item.nom || antivirusDetailData.item.name || antivirusDetailData.item.solution || "N/A"
            })}
              </h2>
              <SmartTooltip as="button" className={styles.modalCloseButton} onClick={() => setAntivirusDetailsModalOpen(false)} content={copy.close}>
                <FaTimes />
              </SmartTooltip>
            </div>
            <div className={styles.modalBody}>
              {loadingAntivirusDetails ? <div style={{
            padding: '2rem',
            textAlign: 'center',
            color: '#6b7280'
          }}>
                  <Icon icon="mdi:loading" style={{
              fontSize: '2rem',
              animation: 'spin 1s linear infinite'
            }} />
                  <p>{copy.modals.loadingAntivirus}</p>
                </div> : <>
                  {}
                  <div className={styles.securityDetailsGrid}>
                    <div className={styles.securityDetail}>
                      <label className={styles.detailLabel}>{copy.modals.solution}</label>
                      <span className={styles.detailValue}>{antivirusDetailData.item.nom || antivirusDetailData.item.name || antivirusDetailData.item.solution || 'N/A'}</span>
                    </div>
                    <div className={styles.securityDetail}>
                      <label className={styles.detailLabel}>{copy.modals.licensesUsed}</label>
                      <span className={styles.detailValue}>{antivirusDetailData.statistics?.endpoints?.managed || 'N/A'}</span>
                    </div>
                    <div className={styles.securityDetail}>
                      <label className={styles.detailLabel}>{copy.modals.totalEndpoints}</label>
                      <span className={styles.detailValue}>{antivirusDetailData.statistics?.endpoints?.total || antivirusDetailData.endpoints.length || 'N/A'}</span>
                    </div>
                    <div className={styles.securityDetail}>
                      <label className={styles.detailLabel}>{copy.modals.endpointsOnline}</label>
                      <span className={styles.detailValue}>{antivirusDetailData.statistics?.endpoints?.online || 'N/A'}</span>
                    </div>
                  </div>

                  {}
                  {antivirusDetailData.endpoints && antivirusDetailData.endpoints.length > 0 && <div className={styles.usersTableSection} style={{
              marginTop: '2rem'
            }}>
                      <h3 className={styles.sectionTitle}>
                        <Icon icon="mdi:desktop-mac-dashboard" />
                        {interpolate(copy.modals.endpointsTitle, {
                  count: antivirusDetailData.endpoints.length
                })}
                      </h3>
                      <div className={styles.dataTableWrapper}>
                        <table className={styles.dataTable}>
                          <thead>
                            <tr>
                              <th>{copy.modals.endpointName}</th>
                              <th>{copy.modals.os}</th>
                              <th>{copy.table.status}</th>
                              <th>{copy.modals.infected}</th>
                              <th>{copy.modals.lastUpdate}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {antivirusDetailData.endpoints.slice(0, 20).map((endpoint, idx) => <tr key={idx}>
                                <td>{endpoint.computerName || endpoint.name || 'N/A'}</td>
                                <td>{repairRmmTextEncoding(endpoint.osName || endpoint.os || "") || "N/A"}</td>
                                <td>
                                  <span className={`${styles.statusBadge} ${endpoint.endpointState === 1 ? styles.statusActive : styles.statusExpired}`}>
                                    {endpoint.endpointState === 1 ? copy.modals.online : copy.modals.offline}
                                  </span>
                                </td>
                                <td>
                                  <span className={`${styles.statusBadge} ${endpoint.isInfected ? styles.statusExpired : styles.statusActive}`}>
                                    {endpoint.isInfected ? copy.modals.yes : copy.modals.no}
                                  </span>
                                </td>
                                <td>
                                  {endpoint.lastUpdate ? new Date(endpoint.lastUpdate).toLocaleDateString('en-GB') : 'N/A'}
                                </td>
                              </tr>)}
                          </tbody>
                        </table>
                      </div>
                      {antivirusDetailData.endpoints.length > 20 && <p style={{
                marginTop: '1rem',
                fontSize: '0.85rem',
                color: '#6b7280'
              }}>
                          {interpolate(copy.modals.endpointsPreview, {
                  count: antivirusDetailData.endpoints.length
                })}
                        </p>}
                    </div>}

                  {}
                  {(!antivirusDetailData.endpoints || antivirusDetailData.endpoints.length === 0) && <div className={styles.noUsersMessage} style={{
              marginTop: '2rem'
            }}>
                      <Icon icon="mdi:desktop-off" className={styles.noUsersIcon} />
                      <p>{copy.modals.noEndpoints}</p>
                    </div>}
                </>}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.modalOkButton} onClick={() => setAntivirusDetailsModalOpen(false)}>
                {copy.close}
              </button>
            </div>
          </div>
        </div>}

      <PageGuideTour open={pageGuideOpen} steps={enterpriseGuideSteps} title={copy.guideTitle} onClose={() => setPageGuideOpen(false)} />

      <CampaignPickerModal open={campaignPickerOpen && Boolean(client?.id)} client={client} campaigns={campaigns} locale={locale} copy={copy} onClose={() => setCampaignPickerOpen(false)} onSelectCampaign={campaign => {
      setCampaignPickerOpen(false);
      handleOpenCampaign(campaign);
    }} onAddCampaign={canManageCampaigns ? () => {
      setCampaignPickerOpen(false);
      handleOpenCreateCampaign();
    } : undefined} />

      <CampaignFormModal open={showCampaignModal} onClose={() => {
      if (savingCampaign) return;
      setShowCampaignModal(false);
    }} clients={client ? [client] : []} formData={campaignFormData} onFormDataChange={setCampaignFormData} onSubmit={handleSubmitCampaign} saving={savingCampaign} copy={campaignsCopy} getCampaignTypeLabel={type => campaignsCopy.types?.[type] || getCampaignTypeLabel(type, locale)} lockClient />
    </div>;
}
