import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import API_BASE_URL from "../../config";
import styles from "./EnterprisesPage.module.css";
import { FaTimes, FaChevronLeft, FaChevronRight, FaPlus } from "react-icons/fa";
import { Icon } from "@iconify/react";
import SmartTooltip from "../SmartTooltip";
import StatusDot from "../shared/StatusDot/StatusDot";
import ClientModal from "../AdminPage/ClientSkeleton/ClientModal";
import TicketColumnsModal from "../TicketPage/TicketColumnsModal";
import EnterpriseBulkEditModal from "./EnterpriseBulkEditModal";
import { useContractModuleOptions } from "../../hooks/useContractModuleOptions";
import { useDefaultPageSize } from "../../hooks/useDefaultPageSize";
import { useEntityFavorites } from "../../hooks/useEntityFavorites";
import { useAppFormatters, useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getEnterprisesPageCopy } from "./enterprisesPageI18n";
import { normalizeCompanyStatusKey } from "./enterpriseFormUtils";
import { getLocalizedModuleLabel } from "../../i18n/contractModuleLabels";
import { getClientOnboardingInfo } from "../../utils/clientOnboarding";
import { interpolate } from "../../i18n/translate";
import { buildEmptyModulesMap, getAllActiveModuleKeys } from "../../constants/contractModules";
import { formatClientTabLabel, getClientNumber, getClientNameWithoutCode } from "../../utils/clientDisplay";
import { fetchTicketTableColumns } from "../../api/tickets";
import {
  DEFAULT_ENTERPRISES_TABLE_COLUMNS,
  TICKET_TABLE_COLUMN_SORT_KEYS,
  normalizeTicketTableColumns
} from "../../utils/ticketTableColumns";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import mspStyles from "../CybersecuritePage/CybersecuritePage.module.css";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { usePermissions } from "../../contexts/PermissionsContext";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
import { collectTagSearchValues, matchesSearchQuery } from "../../utils/tableSearch";

const ENTERPRISES_PAGE_SCOPE = "enterprises";
const ENTERPRISES_FAVORITES_SETTING = "enterprises_favorites";
const ENTERPRISES_COLUMN_HEADERS = {
  client_number: "clientNumber",
  company: "company",
  company_status: "companyStatus",
  primary_contact: "primaryContact",
  commercial: "commercial",
  modules: "modules",
  expiration: "expiration",
  tags: "tags"
};

function enterprisesColumnClass(columnId) {
  const map = {
    client_number: styles.colClientNumber,
    company: styles.colCompany,
    company_status: styles.colCompanyStatus,
    primary_contact: styles.colContact,
    commercial: styles.colCommercial,
    modules: styles.colModules,
    expiration: styles.colExpiry,
    tags: styles.colTags
  };
  return map[columnId] || "";
}
function withCompanyStatusColumn(columns) {
  const list = Array.isArray(columns) ? [...columns] : [];
  if (list.includes("company_status")) return list;
  const companyIdx = list.indexOf("company");
  if (companyIdx >= 0) list.splice(companyIdx + 1, 0, "company_status");
  else list.push("company_status");
  return list;
}
function sanitizeEnterprisesTableColumns(columns) {
  return withCompanyStatusColumn(normalizeTicketTableColumns(columns, {
    fallback: DEFAULT_ENTERPRISES_TABLE_COLUMNS,
    pageScope: ENTERPRISES_PAGE_SCOPE
  }));
}
function getExpiryClass(status) {
  if (status === "expired") return styles.expiryDate_expired;
  if (status === "expiring") return styles.expiryDate_expiring;
  if (status === "suspended") return styles.expiryDate_suspended;
  return "";
}
export default function EnterprisesPage({
  onNavigate,
  pageParams,
  onPageParamsConsumed
}) {
  const locale = useAppLocale();
  const formatters = useAppFormatters();
  const { isPhone, isCompact } = useBreakpoint();
  const {
    can
  } = usePermissions();
  const canCreateEnterprise = can("clients.create");
  const canExportEnterprises = can("clients.export");
  const canPublicViews = can("clients.public_views");
  const canBulkEdit = can("clients_detail.edit");
  const showBulkSelection = canBulkEdit && !isCompact;
  const {
    isFavorite,
    toggleFavorite
  } = useEntityFavorites(ENTERPRISES_FAVORITES_SETTING);
  const copy = useMemo(() => getEnterprisesPageCopy(locale), [locale]);
  const copyRef = useRef(copy);
  copyRef.current = copy;
  const {
    modules: contractModules
  } = useContractModuleOptions();
  const resolveModuleLabel = useCallback(moduleKey => getLocalizedModuleLabel(contractModules, moduleKey, locale), [contractModules, locale]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [statusFilters, setStatusFilters] = useState(new Set());
  const [companyStatusFilters, setCompanyStatusFilters] = useState(new Set());
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientModalInitial, setClientModalInitial] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useDefaultPageSize();
  const [columnsModalOpen, setColumnsModalOpen] = useState(false);
  const [publicTableColumns, setPublicTableColumns] = useState(() => sanitizeEnterprisesTableColumns(DEFAULT_ENTERPRISES_TABLE_COLUMNS));
  const [privateTableColumns, setPrivateTableColumns] = useState(null);
  const [visibleTableColumns, setVisibleTableColumns] = useState(() => sanitizeEnterprisesTableColumns(DEFAULT_ENTERPRISES_TABLE_COLUMNS));
  const tableColumns = visibleTableColumns;
  const listControllerRef = useRef(null);
  const isMountedRef = useRef(true);
  useEffect(() => {
    if (!pageParams?.openCreateModal) return;
    setClientModalInitial(null);
    setShowClientModal(true);
    onPageParamsConsumed?.();
  }, [pageParams, onPageParamsConsumed]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchTicketTableColumns(ENTERPRISES_PAGE_SCOPE);
        if (cancelled) return;
        setPublicTableColumns(sanitizeEnterprisesTableColumns(Array.isArray(data?.public) ? data.public : DEFAULT_ENTERPRISES_TABLE_COLUMNS));
        setPrivateTableColumns(Array.isArray(data?.private) && data.private.length ? sanitizeEnterprisesTableColumns(data.private) : null);
        setVisibleTableColumns(sanitizeEnterprisesTableColumns(Array.isArray(data?.effective) && data.effective.length ? data.effective : DEFAULT_ENTERPRISES_TABLE_COLUMNS));
      } catch {
        if (!cancelled) toast.error(copyRef.current.toasts?.loadColumns || "Error loading columns");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const handleColumnsSaved = useCallback(result => {
    if (Array.isArray(result?.public)) setPublicTableColumns(sanitizeEnterprisesTableColumns(result.public));
    setPrivateTableColumns(Array.isArray(result?.private) && result.private.length ? sanitizeEnterprisesTableColumns(result.private) : null);
    setVisibleTableColumns(sanitizeEnterprisesTableColumns(Array.isArray(result?.effective) && result.effective.length ? result.effective : DEFAULT_ENTERPRISES_TABLE_COLUMNS));
  }, []);
  useEffect(() => {
    const raw = pageParams?.highlight;
    if (!raw) return;
    const key = String(raw).trim().toLowerCase();
    const allowed = new Set(["active", "expiring", "expired", "suspended"]);
    if (!allowed.has(key)) {
      onPageParamsConsumed?.();
      return;
    }
    setStatusFilters(new Set([key]));
    onPageParamsConsumed?.();
  }, [pageParams, onPageParamsConsumed]);
  useEffect(() => {
    if (!isCompact) return;
    setSelectedIds(new Set());
  }, [isCompact]);
  const defaultModules = useMemo(() => buildEmptyModulesMap(contractModules), [contractModules]);
  useEffect(() => {
    isMountedRef.current = true;
    loadClients();
    const handleRefreshEnterprises = () => loadClients();
    const pollInterval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      loadClients({
        silent: true
      });
    }, 30000);
    window.addEventListener("refreshEnterprises", handleRefreshEnterprises);
    return () => {
      isMountedRef.current = false;
      listControllerRef.current?.abort();
      clearInterval(pollInterval);
      window.removeEventListener("refreshEnterprises", handleRefreshEnterprises);
    };
  }, []);
  const loadClients = async (options = {}) => {
    const silent = options.silent === true;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    listControllerRef.current?.abort();
    const listController = createTrackedAbortController();
    listControllerRef.current = listController;
    try {
      const res = await fetch(`${API_BASE_URL}/clients/list?_=${Date.now()}`, {
        credentials: "include",
        signal: listController.signal,
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache"
        }
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const message = errorData.error || errorData.details || copyRef.current.formatLoadErrorStatus(res.status);
        throw new Error(message);
      }
      const clientsData = await res.json();
      const parsedClients = (Array.isArray(clientsData) ? clientsData : []).map(client => ({
        ...client,
        client_number: client.client_number ?? client.clientNumber ?? null,
        clientNumber: client.client_number ?? client.clientNumber ?? null,
        tags: Array.isArray(client.tags) ? client.tags : [],
        options: (() => {
          if (client.options && typeof client.options === "object") {
            return {
              ...defaultModules,
              ...client.options
            };
          }
          if (typeof client.options === "string" && client.options.trim()) {
            try {
              const parsed = JSON.parse(client.options);
              if (parsed && typeof parsed === "object") {
                return {
                  ...defaultModules,
                  ...parsed
                };
              }
            } catch {
              return parseOptionsToModules(client.options);
            }
          }
          return {
            ...defaultModules
          };
        })(),
        sites: (() => {
          if (Array.isArray(client.sites)) return client.sites;
          if (typeof client.sites === "string") {
            try {
              return JSON.parse(client.sites);
            } catch {
              return [];
            }
          }
          return client.sites || [];
        })()
      }));
      if (!isMountedRef.current) return;
      setClients(parsedClients);
    } catch (err) {
      if (err?.name === "AbortError") return;
      if (!silent) {
        setError(err.message || copyRef.current.loadError);
      }
      console.error("Error chargement clients:", err);
    } finally {
      if (!silent && isMountedRef.current) setLoading(false);
    }
  };
  const normalizeText = value => (value || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  const parseOptionsToModules = value => {
    const modules = {
      ...defaultModules
    };
    if (!value) return modules;
    const normalizedValue = normalizeText(value).replace(/[\[\]\(\)"']/g, " ").replace(/\s+/g, " ").trim();
    const tokens = normalizedValue.split(/[|,;/]+/).map(token => normalizeText(token)).filter(Boolean);
    const mapping = {
      support: "Support",
      curatif: "Curatif",
      preventif: "Preventif",
      preventifve: "Preventif",
      preventive: "Preventif",
      monitoring: "Monitoring",
      hebergement: "Hebergement",
      magicinfo: "MagicInfo",
      videosurveillance: "Videosurveillance"
    };
    tokens.forEach(token => {
      const key = mapping[token] || Object.keys(mapping).find(candidate => token.includes(candidate));
      if (key && mapping[key]) modules[mapping[key]] = true;
    });
    Object.keys(mapping).forEach(candidate => {
      if (normalizedValue.includes(candidate)) modules[mapping[candidate]] = true;
    });
    return modules;
  };
  const getContractStatus = copy.getContractStatus;
  const getEnterpriseNameForSort = client => {
    const name = getClientNameWithoutCode(client) || client?.name || "";
    return String(name).trim().toLowerCase();
  };
  const getTabDisplayName = client => formatClientTabLabel(client);
  const matchesSearch = useCallback((client, query) => {
    const modulesObj = client.options || client.contrat?.modules || {};
    const activeModuleKeys = getAllActiveModuleKeys(modulesObj, contractModules);
    const moduleLabels = activeModuleKeys.map(key => resolveModuleLabel(key));
    const companyStatus = copy.getCompanyStatus(client.statut);
    const contractStatus = getContractStatus(client.contrat?.expiration, client.contrat?.suspendu);
    const onboarding = getClientOnboardingInfo(client);
    return matchesSearchQuery(query, [
      client.name,
      getClientNumber(client),
      getClientNameWithoutCode(client),
      formatClientTabLabel(client),
      client.email,
      client.phone,
      client.commercial,
      client.primaryContactName,
      companyStatus.label,
      contractStatus.label,
      formatters.formatDate(client.contrat?.expiration),
      activeModuleKeys.length === 0 ? copy.noModuleOptions : "",
      onboarding ? copy.onboardingBadge : "",
      ...activeModuleKeys,
      ...moduleLabels,
      ...collectTagSearchValues(client.tags)
    ]);
  }, [contractModules, copy, formatters, getContractStatus, resolveModuleLabel]);
  const kpiFilteredClients = useMemo(() => {
    let base = [...clients];
    if (searchQuery.trim()) {
      base = base.filter(client => matchesSearch(client, searchQuery));
    }
    if (statusFilters.size > 0) {
      base = base.filter(client => {
        const contractStatus = getContractStatus(client.contrat?.expiration, client.contrat?.suspendu);
        return statusFilters.has(contractStatus.status);
      });
    }
    if (companyStatusFilters.size > 0) {
      base = base.filter(client => companyStatusFilters.has(normalizeCompanyStatusKey(client.statut)));
    }
    return base;
  }, [clients, searchQuery, statusFilters, companyStatusFilters, matchesSearch]);
  const filteredAndSortedClients = useMemo(() => {
    const filtered = [...kpiFilteredClients];
    filtered.sort((a, b) => {
      const aFav = isFavorite(a.id);
      const bFav = isFavorite(b.id);
      if (aFav !== bFav) return aFav ? -1 : 1;
      let aValue;
      let bValue;
      switch (sortBy) {
        case "name":
          aValue = getEnterpriseNameForSort(a);
          bValue = getEnterpriseNameForSort(b);
          break;
        case "clientNumber":
          aValue = getClientNumber(a).toLowerCase();
          bValue = getClientNumber(b).toLowerCase();
          break;
        case "status":
          {
            const statusOrder = {
              active: 1,
              expiring: 2,
              suspended: 3,
              expired: 4,
              unknown: 5
            };
            const aStatus = getContractStatus(a.contrat?.expiration, a.contrat?.suspendu);
            const bStatus = getContractStatus(b.contrat?.expiration, b.contrat?.suspendu);
            const aPriority = statusOrder[aStatus.status] || 5;
            const bPriority = statusOrder[bStatus.status] || 5;
            if (aPriority === bPriority) {
              aValue = aStatus.label.toLowerCase();
              bValue = bStatus.label.toLowerCase();
            } else {
              aValue = aPriority;
              bValue = bPriority;
            }
            break;
          }
        case "expiration":
          aValue = a.contrat?.expiration || "";
          bValue = b.contrat?.expiration || "";
          break;
        case "commercial":
          aValue = (a.commercial || "").toLowerCase();
          bValue = (b.commercial || "").toLowerCase();
          break;
        case "primaryContact":
          aValue = (a.primaryContactName || "").toLowerCase();
          bValue = (b.primaryContactName || "").toLowerCase();
          break;
        case "companyStatus":
          aValue = normalizeCompanyStatusKey(a.statut);
          bValue = normalizeCompanyStatusKey(b.statut);
          break;
        default:
          return 0;
      }
      if (typeof aValue === "number" && typeof bValue === "number") {
        if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
        if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
        return 0;
      }
      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return filtered;
  }, [kpiFilteredClients, sortBy, sortOrder, copy, isFavorite]);
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedClients.length / pageSize));
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedClients.slice(start, start + pageSize);
  }, [filteredAndSortedClients, currentPage, pageSize]);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilters, companyStatusFilters, sortBy, sortOrder, pageSize]);
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);
  useEffect(() => {
    setSelectedIds(prev => {
      if (!prev.size) return prev;
      const valid = new Set(clients.map(client => String(client.id)));
      const next = [...prev].filter(id => valid.has(String(id)));
      return next.length === prev.size ? prev : new Set(next);
    });
  }, [clients]);
  const pageIds = useMemo(() => paginatedClients.map(client => String(client.id)), [paginatedClients]);
  const selectedCount = selectedIds.size;
  const allOnPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
  const clearSelection = () => setSelectedIds(new Set());
  const toggleClientSelection = (clientId, checked) => {
    const id = String(clientId);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);else next.delete(id);
      return next;
    });
  };
  const toggleSelectAllOnPage = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        pageIds.forEach(id => next.delete(id));
      } else {
        pageIds.forEach(id => next.add(id));
      }
      return next;
    });
  };
  const handleBulkSuccess = result => {
    const updated = Number(result?.updated) || 0;
    const failed = Array.isArray(result?.failed) ? result.failed.length : 0;
    if (updated > 0 && failed === 0) {
      toast.success(copy.formatBulkSuccess(updated));
    } else if (updated > 0 && failed > 0) {
      toast.warn(copy.formatBulkPartial(updated, failed));
    } else {
      toast.error(copy.toasts.bulkError);
    }
    clearSelection();
    loadClients({
      silent: true
    });
  };
  const portfolioTotal = clients.length;
  const toggleStatusFilter = statusKey => {
    setStatusFilters(prev => {
      const next = new Set(prev);
      if (next.has(statusKey)) next.delete(statusKey);else next.add(statusKey);
      return next;
    });
  };
  const toggleCompanyStatusFilter = statusKey => {
    setCompanyStatusFilters(prev => {
      const next = new Set(prev);
      if (next.has(statusKey)) next.delete(statusKey);else next.add(statusKey);
      return next;
    });
  };
  const statusCounts = useMemo(() => {
    const counts = {
      active: 0,
      expiring: 0,
      expired: 0,
      suspended: 0,
      unknown: 0
    };
    kpiFilteredClients.forEach(client => {
      const status = getContractStatus(client.contrat?.expiration, client.contrat?.suspendu).status;
      if (counts[status] !== undefined) counts[status] += 1;
    });
    return counts;
  }, [kpiFilteredClients, copy]);
  const companyStatusCounts = useMemo(() => {
    const counts = {
      active: 0,
      inactive: 0
    };
    clients.forEach(client => {
      const key = normalizeCompanyStatusKey(client.statut);
      if (counts[key] !== undefined) counts[key] += 1;
    });
    return counts;
  }, [clients]);
  const handleExportCsv = () => {
    const headers = [];
    tableColumns.forEach(columnId => {
      const labelKey = ENTERPRISES_COLUMN_HEADERS[columnId];
      headers.push(copy.table[labelKey] || columnId);
    });
    const rows = [headers];
    filteredAndSortedClients.forEach(client => {
      const modulesObj = client.options || client.contrat?.modules || {};
      const activeKeys = getAllActiveModuleKeys(modulesObj, contractModules);
      const activeLabels = activeKeys.map(key => resolveModuleLabel(key));
      const tags = (client.tags || []).map(tag => tag.label).filter(Boolean);
      const row = [];
      tableColumns.forEach(columnId => {
        if (columnId === "client_number") {
          row.push(getClientNumber(client) || "");
          return;
        }
        if (columnId === "company") {
          row.push(getClientNameWithoutCode(client) || client.name || "");
          return;
        }
        if (columnId === "company_status") {
          row.push(copy.getCompanyStatus(client.statut).label);
          return;
        }
        if (columnId === "primary_contact") {
          row.push(client.primaryContactName || "");
          return;
        }
        if (columnId === "commercial") {
          row.push(client.commercial || "");
          return;
        }
        if (columnId === "modules") {
          row.push(activeLabels.join(", "));
          return;
        }
        if (columnId === "expiration") {
          row.push(formatDate(client.contrat?.expiration));
          return;
        }
        if (columnId === "tags") {
          row.push(tags.join(", "));
          return;
        }
        row.push("");
      });
      rows.push(row);
    });
    const csvContent = rows.map(row => row.map(value => {
      const stringValue = value == null ? "" : String(value);
      if (/[",;\n]/.test(stringValue)) return `"${stringValue.replace(/"/g, '""')}"`;
      return stringValue;
    }).join(";")).join("\n");
    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: "text/csv;charset=utf-8;"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", copy.export.filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  const openClient = (client, background = false) => {
    onNavigate("ContratDetail", {
      clientId: client.id,
      name: getClientNameWithoutCode(client) || client.name,
      client_number: getClientNumber(client) || undefined
    }, background ? {
      background: true
    } : undefined);
  };
  const formatDate = dateString => formatters.formatDate(dateString);
  const toggleSort = column => {
    if (sortBy === column) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };
  const sortIndicator = column => sortBy === column ? sortOrder === "asc" ? " ▲" : " ▼" : "";
  const renderCompanyStatus = client => {
    const status = copy.getCompanyStatus(client.statut);
    return <SmartTooltip content={status.label}>
        <StatusDot active={status.key === "active"} label={status.label} />
      </SmartTooltip>;
  };
  const ThSort = ({
    label,
    col
  }) => <button type="button" className={styles.thBtn} onClick={e => {
    e.stopPropagation();
    toggleSort(col);
  }} aria-pressed={sortBy === col}>
      {label}
      {sortIndicator(col)}
    </button>;
  return <div className={`${mspStyles.mspPage} ${styles.page} msp-page-grid`}>
      <div className={mspStyles.mspLayout}>
        <div className={mspStyles.mspMain}>
          <MspPageHero eyebrow={copy.eyebrow} title={copy.pageTitle} subtitle={isPhone ? null : loading ? copy.loadingPortfolio : copy.formatSubtitle(filteredAndSortedClients.length, portfolioTotal)} icon="mdi:briefcase-outline" stackOnMobile actions={<>
                <SmartTooltip content={copy.columnsSettings}>
                  <button type="button" className={styles.iconBtn} onClick={() => setColumnsModalOpen(true)} aria-label={copy.columnsSettingsAria}>
                    <Icon icon="mdi:table-cog" />
                  </button>
                </SmartTooltip>
                {canExportEnterprises ? <SmartTooltip content={copy.exportCsv}>
                  <button type="button" className={styles.iconBtn} onClick={handleExportCsv} aria-label={copy.exportCsvAria}>
                    <Icon icon="mdi:download-outline" />
                  </button>
                </SmartTooltip> : null}
                {canCreateEnterprise ? <SmartTooltip content={copy.newEnterprise}>
                  <button type="button" className={`${styles.primaryBtn} ${styles.primaryBtnIconOnly}`} onClick={() => {
              setClientModalInitial(null);
              setShowClientModal(true);
            }} aria-label={copy.newEnterprise}>
                    <FaPlus />
                  </button>
                </SmartTooltip> : null}
              </>} />

          <main className={`${mspStyles.mspContent} ${mspStyles.mspContentList}`}>
            <div className={`${styles.shell} ${styles.shellWide} ${styles.shellFull}`}>
        <div className={`${styles.toolbar} ${styles.toolbarWithFilters}`}>
          <div className={styles.searchWrap}>
            <Icon icon="mdi:magnify" className={styles.searchIcon} aria-hidden />
            <input type="text" inputMode="search" enterKeyHint="search" placeholder={copy.searchPlaceholder} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={styles.searchInput} aria-label={copy.searchAria} />
            {searchQuery && <SmartTooltip content={copy.clearSearch}>
                <button type="button" onClick={() => setSearchQuery("")} className={styles.clearButton} aria-label={copy.clearSearch}>
                  <FaTimes />
                </button>
              </SmartTooltip>}
          </div>
          <div className={styles.statusChips} role="group">
              {copy.statusFilterItems.map(item => {
                const count = statusCounts[item.key] || 0;
                const active = statusFilters.has(item.key);
                return <button key={item.key} type="button" className={`${styles.statusChip} ${active ? styles.statusChipActive : ""} ${count === 0 ? styles.statusChipDisabled : ""}`} onClick={() => toggleStatusFilter(item.key)} disabled={loading || error || count === 0}>
                    <span className={`${styles.statusChipIcon} ${styles[`kpiIcon_${item.kpiTone}`]}`}>
                      <Icon icon={item.icon} />
                    </span>
                    <span className={styles.statusChipLabel}>{item.label}</span>
                    <span className={styles.statusChipCount}>{count}</span>
                  </button>;
              })}
              {copy.companyStatusFilterItems.map(item => {
                const count = companyStatusCounts[item.key] || 0;
                const active = companyStatusFilters.has(item.key);
                return <button key={`company-${item.key}`} type="button" className={`${styles.statusChip} ${active ? styles.statusChipActive : ""} ${count === 0 ? styles.statusChipDisabled : ""}`} onClick={() => toggleCompanyStatusFilter(item.key)} disabled={loading || error || count === 0}>
                    <span className={`${styles.statusChipIcon} ${styles[`kpiIcon_${item.kpiTone}`]}`}>
                      <Icon icon={item.icon} />
                    </span>
                    <span className={styles.statusChipLabel}>{item.label}</span>
                    <span className={styles.statusChipCount}>{count}</span>
                  </button>;
              })}
            </div>
        </div>

        {loading ? <div className={styles.stateBox}>
            <Icon icon="mdi:loading" className={styles.spinning} />
            <span>{copy.loading}</span>
          </div> : error ? <div className={`${styles.stateBox} ${styles.stateBoxError}`}>
            <Icon icon="mdi:alert-circle-outline" />
            <span>{error}</span>
          </div> : paginatedClients.length === 0 ? <div className={styles.emptyState}>
            <Icon icon="mdi:office-building-outline" className={styles.emptyStateIcon} />
            <p className={styles.emptyStateTitle}>{copy.emptyTitle}</p>
            <p className={styles.emptyStateHint}>{copy.emptyHint}</p>
            {canCreateEnterprise ? <button type="button" className={styles.primaryBtn} onClick={() => {
                setClientModalInitial(null);
                setShowClientModal(true);
              }}>
              <Icon icon="mdi:plus" />
              {copy.newEnterprise}
            </button> : null}
          </div> : <div className={styles.listBody}>
            {selectedCount > 0 && showBulkSelection ? <div className={styles.bulkBar}>
                <div className={styles.bulkInfo}>
                  <strong>{selectedCount}</strong>
                  <span>{selectedCount > 1 ? copy.bulk.selectedPlural : copy.bulk.selected}</span>
                </div>
                <div className={styles.bulkActions}>
                  <button type="button" className={styles.bulkBtn} onClick={() => setBulkModalOpen(true)}>
                    <Icon icon="mdi:pencil-outline" />
                    {copy.bulk.edit}
                  </button>
                  <button type="button" className={styles.bulkBtnGhost} onClick={clearSelection}>
                    {copy.bulk.clearSelection}
                  </button>
                </div>
              </div> : null}
            <div className={styles.listArea}>
              <div className={styles.dataTableWrap}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      {showBulkSelection ? <th className={styles.checkboxCell}>
                          <input type="checkbox" className={styles.rowCheckbox} checked={allOnPageSelected} onChange={toggleSelectAllOnPage} onClick={e => e.stopPropagation()} aria-label={copy.bulk.selectAll} />
                        </th> : null}
                      {tableColumns.map(columnId => {
                        const sortKey = TICKET_TABLE_COLUMN_SORT_KEYS[columnId];
                        const labelKey = ENTERPRISES_COLUMN_HEADERS[columnId];
                        const label = copy.table[labelKey] || columnId;
                        const columnClass = enterprisesColumnClass(columnId);
                        if (!sortKey) {
                          return <th key={columnId} className={columnClass || undefined}>{label}</th>;
                        }
                        return <th key={columnId} className={columnClass || undefined} aria-sort={sortBy === sortKey ? sortOrder === "asc" ? "ascending" : "descending" : "none"}>
                            <ThSort label={label} col={sortKey} />
                          </th>;
                      })}
                      <th className={styles.favoriteCell} aria-label={copy.favorites.columnAria}>
                        <Icon icon="mdi:star-outline" aria-hidden />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedClients.map(client => {
                      const modules = client.options || client.contrat?.modules || {};
                      const activeModules = getAllActiveModuleKeys(modules, contractModules);
                      const contractStatus = getContractStatus(client.contrat?.expiration, client.contrat?.suspendu);
                      const tags = client.tags || [];
                      const visibleTags = tags.slice(0, 2);
                      const hiddenTagCount = Math.max(0, tags.length - visibleTags.length);
                      const clientIdStr = String(client.id);
                      const isSelected = selectedIds.has(clientIdStr);
                      const rowName = getClientNameWithoutCode(client) || client.name || clientIdStr;
                      const favorited = isFavorite(client.id);
                      return <tr key={client.id} className={`${styles.dataTableRow} ${isSelected ? styles.selectedRow : ""}`} onClick={() => openClient(client)} onAuxClick={e => {
                        if (e.button === 1) {
                          e.preventDefault();
                          openClient(client, true);
                        }
                      }} onKeyDown={e => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openClient(client);
                        }
                      }} role="button" tabIndex={0}>
                          {showBulkSelection ? <td className={styles.checkboxCell} onClick={e => e.stopPropagation()}>
                              <input type="checkbox" className={styles.rowCheckbox} checked={isSelected} onChange={e => toggleClientSelection(client.id, e.target.checked)} aria-label={copy.formatBulkSelectRow(rowName)} />
                            </td> : null}
                          {tableColumns.map(columnId => {
                            if (columnId === "client_number") {
                              return <td key={columnId} className={styles.colClientNumber}>
                                  {getClientNumber(client) || "—"}
                                </td>;
                            }
                            if (columnId === "company") {
                              const onboarding = getClientOnboardingInfo(client);
                              return <td key={columnId} className={styles.colCompany}>
                                  <div className={styles.companyCell}>
                                    <SmartTooltip content={formatClientTabLabel(client)} as="span" className={styles.clientNameText}>
                                      {getClientNameWithoutCode(client) || client.name || "-"}
                                    </SmartTooltip>
                                    {onboarding ? <SmartTooltip content={onboarding.ageDays < 1 ? interpolate(copy.onboardingTooltipToday, {
                                  remaining: onboarding.remainingDays
                                }) : interpolate(copy.onboardingTooltip, {
                                  days: onboarding.ageDays,
                                  remaining: onboarding.remainingDays
                                })} as="span" className={styles.onboardingBadge}>
                                        {copy.onboardingBadge}
                                      </SmartTooltip> : null}
                                  </div>
                                </td>;
                            }
                            if (columnId === "company_status") {
                              return <td key={columnId} className={styles.colCompanyStatus}>
                                  {renderCompanyStatus(client)}
                                </td>;
                            }
                            if (columnId === "primary_contact") {
                              return <td key={columnId} className={`${styles.colMuted} ${styles.colContact}`}>{client.primaryContactName || "-"}</td>;
                            }
                            if (columnId === "commercial") {
                              return <td key={columnId} className={`${styles.colMuted} ${styles.colCommercial}`}>{client.commercial || "-"}</td>;
                            }
                            if (columnId === "modules") {
                              const moduleLabels = activeModules.map(key => resolveModuleLabel(key));
                              const modulesTooltip = moduleLabels.join(" · ");
                              const visibleLimit = 2;
                              const visibleModules = activeModules.slice(0, visibleLimit);
                              const hiddenCount = Math.max(0, activeModules.length - visibleLimit);
                              return <td key={columnId} className={styles.colModules}>
                                  {activeModules.length > 0 ? <SmartTooltip content={modulesTooltip} as="div" className={styles.tableModulesClip}>
                                      <div className={styles.tableModules}>
                                        {visibleModules.map(key => <span key={key} className={styles.moduleTag}>
                                            {resolveModuleLabel(key)}
                                          </span>)}
                                        {hiddenCount > 0 ? <span className={`${styles.moduleTag} ${styles.moduleTagMore}`}>+{hiddenCount}</span> : null}
                                      </div>
                                    </SmartTooltip> : <span className={styles.moduleTag}>{copy.noModuleOptions}</span>}
                                </td>;
                            }
                            if (columnId === "expiration") {
                              return <td key={columnId} className={`${styles.colExpiry} ${getExpiryClass(contractStatus.status)}`.trim()}>
                                  {formatDate(client.contrat?.expiration)}
                                </td>;
                            }
                            if (columnId === "tags") {
                              return <td key={columnId} className={styles.colTags}>
                                  {tags.length > 0 ? <div className={styles.tableTags} aria-label={copy.tagsAria}>
                                      {visibleTags.map(tag => <span key={tag.id} className={styles.clientTagChip} style={{
                                        backgroundColor: `${tag.color || "#2b5fab"}18`,
                                        borderColor: `${tag.color || "#2b5fab"}55`,
                                        color: tag.color || "#2b5fab"
                                      }}>
                                          {tag.label}
                                        </span>)}
                                      {hiddenTagCount > 0 ? <span className={styles.tagMore}>+{hiddenTagCount}</span> : null}
                                    </div> : <span className={styles.colEmpty}>-</span>}
                                </td>;
                            }
                            return <td key={columnId}>-</td>;
                          })}
                          <td className={styles.favoriteCell} onClick={e => e.stopPropagation()}>
                            <SmartTooltip content={favorited ? copy.favorites.remove : copy.favorites.add}>
                              <button type="button" className={`${styles.favoriteBtn} ${favorited ? styles.favoriteBtnActive : ""}`} aria-label={favorited ? copy.favorites.remove : copy.favorites.add} aria-pressed={favorited} onClick={() => toggleFavorite(client.id)}>
                                <Icon icon={favorited ? "mdi:star" : "mdi:star-outline"} aria-hidden />
                              </button>
                            </SmartTooltip>
                          </td>
                        </tr>;
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {filteredAndSortedClients.length > 0 && <div className={styles.pagination}>
                <div className={styles.paginationLeft}>
                  <span className={styles.paginationLabel}>{copy.perPage}</span>
                  <select className={styles.paginationSelect} value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div className={styles.paginationRight}>
                  <SmartTooltip content={copy.prevPage}>
                    <button type="button" className={styles.pageBtn} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} aria-label={copy.prevPage}>
                      <FaChevronLeft />
                    </button>
                  </SmartTooltip>
                  <span className={styles.paginationInfo}>
                    {copy.formatPageInfo(currentPage, totalPages)}
                  </span>
                  <SmartTooltip content={copy.nextPage}>
                    <button type="button" className={styles.pageBtn} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} aria-label={copy.nextPage}>
                      <FaChevronRight />
                    </button>
                  </SmartTooltip>
                </div>
              </div>}
          </div>}
            </div>
          </main>
        </div>
      </div>

      {showClientModal && createPortal(<ClientModal initialClient={clientModalInitial} onClose={() => {
      setShowClientModal(false);
      setClientModalInitial(null);
    }} onSaved={() => window.dispatchEvent(new Event("refreshEnterprises"))} />, document.getElementById("modal-root") || document.body)}
      <EnterpriseBulkEditModal open={bulkModalOpen} onClose={() => setBulkModalOpen(false)} clientIds={[...selectedIds]} onSuccess={handleBulkSuccess} />
      <TicketColumnsModal
        open={columnsModalOpen}
        onClose={() => setColumnsModalOpen(false)}
        onSaved={handleColumnsSaved}
        isAdmin={canPublicViews}
        pageScope={ENTERPRISES_PAGE_SCOPE}
        initialPublic={publicTableColumns}
        initialPrivate={privateTableColumns}
        initialEffective={visibleTableColumns}
        columnLabelKeys={ENTERPRISES_COLUMN_HEADERS}
        copy={copy}
      />
    </div>;
}
