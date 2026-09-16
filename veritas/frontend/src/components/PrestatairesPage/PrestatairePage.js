import { useState, useEffect, useMemo, useRef } from "react";
import { fetchPrestatairesList } from "../../api/prestataires";
import { fetchClientsList } from "../../api/clients";
import { toast } from "react-toastify";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import styles from "./PrestatairePage.module.css";
import { FaTimes, FaChevronLeft, FaChevronRight, FaPlus } from "react-icons/fa";
import { Icon } from "@iconify/react";
import SmartTooltip from "../SmartTooltip";
import StatusDot from "../shared/StatusDot/StatusDot";
import PrestataireModal from "./PrestataireModal";
import { useDefaultPageSize } from "../../hooks/useDefaultPageSize";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { formatPageInfo } from "../../i18n/commonI18n";
import { getPrestatairePageCopy, normalizePrestataireStatusKey } from "./prestatairePageI18n";
import { interpolate } from "../../i18n/translate";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import mspStyles from "../CybersecuritePage/CybersecuritePage.module.css";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { usePermissions } from "../../contexts/PermissionsContext";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
import { useEntityFavorites } from "../../hooks/useEntityFavorites";
import { matchesSearchQuery } from "../../utils/tableSearch";

function getContactLabel(prestataire) {
  const first = Array.isArray(prestataire?.contacts) ? prestataire.contacts[0] : null;
  if (first) {
    const parts = [first.prenom, first.nom].filter(Boolean);
    return parts.join(" ") || first.email || first.telephone || "";
  }
  const parts = [prestataire?.contact_prenom, prestataire?.contact_nom].filter(Boolean);
  return parts.join(" ") || "";
}

function getPrimaryCoords(prestataire) {
  const first = Array.isArray(prestataire?.contacts) ? prestataire.contacts[0] : null;
  return {
    email: first?.email || prestataire?.email || "",
    telephone: first?.telephone || prestataire?.telephone || ""
  };
}

function getCompaniesLabel(prestataire, getClientLabel) {
  const linked = Array.isArray(prestataire?.clients) ? prestataire.clients : [];
  const names = linked
    .map(row => row?.name || row?.client_name || (row?.id != null || row?.client_id != null ? getClientLabel?.(row.id ?? row.client_id) : ""))
    .filter(Boolean);
  if (names.length > 0) return names.join(", ");
  return getClientLabel?.(prestataire?.client_id, prestataire?.client_name) || prestataire?.client_name || "";
}

export default function PrestatairePage({
  onNavigate,
  pageParams,
  onPageParamsConsumed
}) {
  const PRESTATAIRES_CLIENTS_CACHE_KEY = "prestataires_clients_cache_v1";
  const PRESTATAIRES_CACHE_TTL_MS = 5 * 60 * 1000;
  const [prestataires, setPrestataires] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("nom");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useDefaultPageSize();
  const common = useCommonCopy();
  const locale = useAppLocale();
  const { can } = usePermissions();
  const canCreate = can("prestataires.create");
  const { isPhone } = useBreakpoint();
  const pageCopy = useMemo(() => getPrestatairePageCopy(locale), [locale]);
  const { isFavorite, toggleFavorite } = useEntityFavorites("prestataires_favorites");
  const [statusFilters, setStatusFilters] = useState(new Set());
  const [showModal, setShowModal] = useState(false);
  const [modalInitial, setModalInitial] = useState(null);
  const loadControllerRef = useRef(null);
  const clientsControllerRef = useRef(null);
  const isMountedRef = useRef(true);

  const normalizePhone = value => {
    let normalized = (value || "").toString().trim();
    if (normalized.startsWith("'")) normalized = normalized.slice(1);
    return normalized.replace(/[^\d+]/g, "");
  };
  const toTelHref = value => {
    const normalized = normalizePhone(value);
    return normalized ? `tel:${normalized}` : "";
  };
  const toMailtoHref = value => {
    const email = (value || "").toString().trim();
    return email ? `mailto:${encodeURIComponent(email)}` : "";
  };
  const copyToClipboard = async (text, label) => {
    const raw = (text || "").toString().trim();
    if (!raw) {
      toast.info(interpolate(pageCopy.clipboard.unavailable, { label }));
      return;
    }
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(raw);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = raw;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      toast.success(interpolate(pageCopy.clipboard.copied, { label }));
    } catch {
      toast.error(interpolate(pageCopy.clipboard.copyFailed, { label: label.toLowerCase() }));
    }
  };

  const buildPrestataireSharePayload = row => {
    const name = (row?.nom || pageCopy.unnamed).toString().trim();
    const type = (row?.type || "").toString().trim();
    const contactLabel = getContactLabel(row);
    const { email, telephone } = getPrimaryCoords(row);
    const companies = getCompaniesLabel(row, pageCopy.getClientLabel);
    const status = pageCopy.getPrestataireStatus(row?.statut).label;
    const lines = pageCopy.share.lines;
    const payloadLines = [
      `${lines.provider}: ${name}`,
      type ? `${lines.type}: ${type}` : null,
      status ? `${lines.status}: ${status}` : null,
      contactLabel ? `${lines.contact}: ${contactLabel}` : null,
      telephone ? `${lines.phone}: ${telephone}` : null,
      email ? `${lines.email}: ${email}` : null,
      companies ? `${lines.enterprises}: ${companies}` : null
    ].filter(Boolean);
    return {
      title: interpolate(pageCopy.share.title, { name }),
      text: payloadLines.join("\n")
    };
  };

  const sharePrestataire = async row => {
    const payload = buildPrestataireSharePayload(row);
    try {
      if (navigator?.share) {
        await navigator.share({
          title: payload.title,
          text: payload.text
        });
        return;
      }
      toast.info(pageCopy.share.unavailable);
    } catch (e) {
      if (e?.name !== "AbortError") toast.info(pageCopy.share.cancelled);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    const controller = createTrackedAbortController();
    loadControllerRef.current?.abort();
    loadControllerRef.current = controller;
    loadData(controller.signal);
    const handleRefresh = () => {
      const refreshController = createTrackedAbortController();
      loadControllerRef.current?.abort();
      loadControllerRef.current = refreshController;
      loadData(refreshController.signal);
    };
    window.addEventListener("refreshPrestataires", handleRefresh);
    return () => {
      isMountedRef.current = false;
      loadControllerRef.current?.abort();
      clientsControllerRef.current?.abort();
      window.removeEventListener("refreshPrestataires", handleRefresh);
    };
  }, []);

  const ensureClientsLoaded = async () => {
    if (clients.length > 0) return true;
    try {
      const rawClients = sessionStorage.getItem(PRESTATAIRES_CLIENTS_CACHE_KEY);
      if (rawClients) {
        const parsedClients = JSON.parse(rawClients);
        const clientsFresh = parsedClients?.savedAt && Array.isArray(parsedClients?.data)
          && Date.now() - parsedClients.savedAt < PRESTATAIRES_CACHE_TTL_MS;
        if (clientsFresh) {
          setClients(parsedClients.data);
          return true;
        }
      }
    } catch {}
    clientsControllerRef.current?.abort();
    const controller = createTrackedAbortController();
    clientsControllerRef.current = controller;
    try {
      const clientsData = await fetchClientsList({ signal: controller.signal });
      if (controller.signal.aborted || !isMountedRef.current) return false;
      const normalized = Array.isArray(clientsData) ? clientsData : [];
      setClients(normalized);
      try {
        sessionStorage.setItem(PRESTATAIRES_CLIENTS_CACHE_KEY, JSON.stringify({
          savedAt: Date.now(),
          data: normalized
        }));
      } catch {}
      return true;
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("Error chargement entreprises:", err);
        toast.error("Impossible de charger la liste des entreprises.");
      }
      return false;
    }
  };

  const loadData = async (signal, options = {}) => {
    const silent = options.silent === true;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await fetchPrestatairesList(null, { signal });
      if (signal?.aborted || !isMountedRef.current) return;
      setPrestataires(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err?.name === "AbortError") return;
      if (!silent) setError(err.message || "Error loading data");
      console.error("Error chargement prestataires:", err);
    } finally {
      if (!silent && isMountedRef.current) setLoading(false);
    }
  };

  const handleOpenAdd = async () => {
    const ok = await ensureClientsLoaded();
    if (!ok) return;
    setModalInitial(null);
    setShowModal(true);
  };

  useEffect(() => {
    if (!pageParams?.openCreateModal) return;
    let cancelled = false;
    (async () => {
      const ok = await ensureClientsLoaded();
      if (cancelled || !ok) return;
      setModalInitial(null);
      setShowModal(true);
      onPageParamsConsumed?.();
    })();
    return () => {
      cancelled = true;
    };
  }, [pageParams, onPageParamsConsumed]);

  const handleModalClose = () => {
    setShowModal(false);
    setModalInitial(null);
  };

  const handleSaved = saved => {
    if (!saved?.id) return;
    setPrestataires(prev => {
      const index = prev.findIndex(p => String(p.id) === String(saved.id));
      if (index === -1) return [...prev, saved];
      return prev.map(p => (String(p.id) === String(saved.id) ? { ...p, ...saved } : p));
    });
  };

  const matchesSearch = (row, query) => {
    const companyNames = (Array.isArray(row?.clients) ? row.clients : [])
      .map(c => c?.name || c?.client_name)
      .filter(Boolean);
    const contactFields = (Array.isArray(row?.contacts) ? row.contacts : []).flatMap(c => [
      c?.nom,
      c?.prenom,
      c?.email,
      c?.telephone
    ]);
    const { email, telephone } = getPrimaryCoords(row);
    return matchesSearchQuery(query, [
      row.nom,
      row.type,
      pageCopy.getPrestataireStatus(row?.statut).label,
      row.contact_nom,
      row.contact_prenom,
      getContactLabel(row),
      row.email,
      row.telephone,
      email,
      telephone,
      getCompaniesLabel(row, pageCopy.getClientLabel),
      ...contactFields,
      ...companyNames
    ]);
  };

  const filteredForStats = useMemo(() => {
    let filtered = [...prestataires];
    if (searchQuery.trim()) {
      filtered = filtered.filter(p => matchesSearch(p, searchQuery));
    }
    return filtered;
  }, [prestataires, searchQuery, pageCopy]);

  const statusCounts = useMemo(() => {
    const counts = { active: 0, inactive: 0 };
    filteredForStats.forEach(p => {
      const key = normalizePrestataireStatusKey(p.statut);
      if (counts[key] !== undefined) counts[key] += 1;
    });
    return counts;
  }, [filteredForStats]);

  const filteredAndSorted = useMemo(() => {
    let filtered = [...prestataires];
    if (searchQuery.trim()) {
      filtered = filtered.filter(p => matchesSearch(p, searchQuery));
    }
    if (statusFilters.size > 0) {
      filtered = filtered.filter(p => statusFilters.has(normalizePrestataireStatusKey(p.statut)));
    }
    filtered.sort((a, b) => {
      const aFav = isFavorite(a.id);
      const bFav = isFavorite(b.id);
      if (aFav !== bFav) return aFav ? -1 : 1;
      const dir = sortOrder === "asc" ? 1 : -1;
      let aVal;
      let bVal;
      if (sortBy === "entreprises") {
        aVal = getCompaniesLabel(a, pageCopy.getClientLabel).toLowerCase();
        bVal = getCompaniesLabel(b, pageCopy.getClientLabel).toLowerCase();
      } else if (sortBy === "contact") {
        aVal = getContactLabel(a).toLowerCase();
        bVal = getContactLabel(b).toLowerCase();
      } else if (sortBy === "statut") {
        aVal = normalizePrestataireStatusKey(a.statut);
        bVal = normalizePrestataireStatusKey(b.statut);
      } else if (sortBy === "email" || sortBy === "telephone") {
        const aCoords = getPrimaryCoords(a);
        const bCoords = getPrimaryCoords(b);
        aVal = String(aCoords[sortBy] || "").toLowerCase();
        bVal = String(bCoords[sortBy] || "").toLowerCase();
      } else {
        aVal = String(a[sortBy] || "").toLowerCase();
        bVal = String(b[sortBy] || "").toLowerCase();
      }
      if (aVal < bVal) return -1 * dir;
      if (aVal > bVal) return 1 * dir;
      return 0;
    });
    return filtered;
  }, [prestataires, searchQuery, statusFilters, sortBy, sortOrder, pageCopy, isFavorite]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilters, sortBy, sortOrder, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const portfolioTotal = prestataires.length;
  const toggleStatusFilter = statusKey => {
    setStatusFilters(prev => {
      const next = new Set(prev);
      if (next.has(statusKey)) next.delete(statusKey);
      else next.add(statusKey);
      return next;
    });
  };
  const toggleSort = column => {
    if (sortBy === column) {
      setSortOrder(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };
  const sortIndicator = column => (sortBy === column ? (sortOrder === "asc" ? " ▲" : " ▼") : "");
  const ThSort = ({ label, col }) => (
    <button
      type="button"
      className={layout.thBtn}
      onClick={e => {
        e.stopPropagation();
        toggleSort(col);
      }}
      aria-pressed={sortBy === col}
    >
      {label}
      {sortIndicator(col)}
    </button>
  );

  const openPrestataire = (row, background = false) => {
    if (!onNavigate) return;
    onNavigate("PrestataireDetail", { prestataireId: row.id, nom: row.nom }, background ? { background: true } : undefined);
  };

  const renderStatus = row => {
    const status = pageCopy.getPrestataireStatus(row.statut);
    return (
      <SmartTooltip content={status.label}>
        <StatusDot active={status.key === "active"} label={status.label} />
      </SmartTooltip>
    );
  };

  return (
    <div className={`${mspStyles.mspPage} ${layout.page} msp-page-grid`}>
      <div className={mspStyles.mspLayout}>
        <div className={mspStyles.mspMain}>
          <MspPageHero
            eyebrow={pageCopy.eyebrow}
            title={pageCopy.pageTitle}
            subtitle={isPhone ? null : loading ? pageCopy.loadingPortfolio : pageCopy.formatSubtitle(filteredAndSorted.length, portfolioTotal)}
            icon="mdi:handshake-outline"
            stackOnMobile
            actions={
              <>
                {canCreate ? (
                  <SmartTooltip content={pageCopy.newPrestataire}>
                    <button
                      type="button"
                      className={`${layout.primaryBtn} ${layout.primaryBtnIconOnly}`}
                      onClick={handleOpenAdd}
                      aria-label={pageCopy.newPrestataire}
                    >
                      <FaPlus />
                    </button>
                  </SmartTooltip>
                ) : null}
              </>
            }
          />

          <main className={`${mspStyles.mspContent} ${mspStyles.mspContentList}`}>
            <div className={`${layout.shell} ${layout.shellWide} ${layout.shellFull}`}>
              <div className={`${layout.toolbar} ${layout.toolbarWithFilters}`}>
                <div className={layout.searchWrap}>
                  <Icon icon="mdi:magnify" className={layout.searchIcon} aria-hidden />
                  <input
                    type="text"
                    inputMode="search"
                    enterKeyHint="search"
                    placeholder={pageCopy.searchPlaceholder}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className={layout.searchInput}
                    aria-label={pageCopy.searchAria}
                  />
                  {searchQuery && (
                    <SmartTooltip content={pageCopy.clearSearch}>
                      <button type="button" onClick={() => setSearchQuery("")} className={layout.clearButton} aria-label={pageCopy.clearSearch}>
                        <FaTimes />
                      </button>
                    </SmartTooltip>
                  )}
                </div>
                <div className={layout.statusChips} role="group">
                  {pageCopy.statusFilters.map(item => {
                    const count = statusCounts[item.key] || 0;
                    const active = statusFilters.has(item.key);
                    return (
                      <button
                        key={item.key}
                        type="button"
                        className={`${layout.statusChip} ${active ? layout.statusChipActive : ""} ${count === 0 ? layout.statusChipDisabled : ""}`}
                        onClick={() => toggleStatusFilter(item.key)}
                        disabled={loading || error || count === 0}
                      >
                        <span className={`${layout.statusChipIcon} ${layout[`kpiIcon_${item.kpiTone}`]}`}>
                          <Icon icon={item.icon} />
                        </span>
                        <span className={layout.statusChipLabel}>{item.label}</span>
                        <span className={layout.statusChipCount}>{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {loading ? (
                <div className={layout.stateBox}>
                  <Icon icon="mdi:loading" className={layout.spinning} />
                  <span>{pageCopy.loading}</span>
                </div>
              ) : error ? (
                <div className={`${layout.stateBox} ${layout.stateBoxError}`}>
                  <Icon icon="mdi:alert-circle-outline" />
                  <span>{error}</span>
                </div>
              ) : paginated.length === 0 ? (
                <div className={layout.emptyState}>
                  <Icon icon="mdi:handshake-outline" className={layout.emptyStateIcon} />
                  <p className={layout.emptyStateTitle}>{pageCopy.emptyTitle}</p>
                  <p className={layout.emptyStateHint}>{pageCopy.emptyHint}</p>
                  {canCreate ? (
                    <button type="button" className={layout.primaryBtn} onClick={handleOpenAdd}>
                      <Icon icon="mdi:plus" />
                      {pageCopy.newPrestataire}
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className={layout.listBody}>
                  <div className={layout.listArea}>
                    <div className={layout.dataTableWrap}>
                      <table className={layout.dataTable}>
                        <thead>
                          <tr>
                            <th className={styles.colName} aria-sort={sortBy === "nom" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}>
                              <ThSort label={pageCopy.table.name} col="nom" />
                            </th>
                            <th className={styles.colType} aria-sort={sortBy === "type" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}>
                              <ThSort label={pageCopy.table.type} col="type" />
                            </th>
                            <th className={styles.colStatus} aria-sort={sortBy === "statut" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}>
                              <ThSort label={pageCopy.table.status} col="statut" />
                            </th>
                            <th className={styles.colContact} aria-sort={sortBy === "contact" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}>
                              <ThSort label={pageCopy.table.contact} col="contact" />
                            </th>
                            <th className={styles.colEmail} aria-sort={sortBy === "email" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}>
                              <ThSort label={pageCopy.table.email} col="email" />
                            </th>
                            <th className={styles.colPhone} aria-sort={sortBy === "telephone" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}>
                              <ThSort label={pageCopy.table.phone} col="telephone" />
                            </th>
                            <th className={styles.colEnterprises} aria-sort={sortBy === "entreprises" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}>
                              <ThSort label={pageCopy.table.enterprises} col="entreprises" />
                            </th>
                            <th className={styles.colActions}>{pageCopy.table.actions}</th>
                            <th className={`${layout.favoriteCell} ${styles.colFavorite}`.trim()} aria-label={pageCopy.favorites.columnAria} />
                          </tr>
                        </thead>
                        <tbody>
                          {paginated.map(row => {
                            const contactLabel = getContactLabel(row);
                            const companies = getCompaniesLabel(row, pageCopy.getClientLabel) || "-";
                            const { email, telephone } = getPrimaryCoords(row);
                            const telHref = telephone ? toTelHref(telephone) : "";
                            const mailHref = email ? toMailtoHref(email) : "";
                            const favorited = isFavorite(row.id);
                            return (
                              <tr
                                key={row.id}
                                className={layout.dataTableRow}
                                onClick={() => openPrestataire(row)}
                                onAuxClick={e => {
                                  if (e.button === 1) {
                                    e.preventDefault();
                                    openPrestataire(row, true);
                                  }
                                }}
                                onKeyDown={e => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    openPrestataire(row);
                                  }
                                }}
                                role="button"
                                tabIndex={0}
                              >
                                <td className={`${layout.colCompany} ${styles.colName}`.trim()}>
                                  <SmartTooltip content={row.nom || pageCopy.unnamed} as="span" className={layout.clientNameText}>
                                    {row.nom || pageCopy.unnamed}
                                  </SmartTooltip>
                                </td>
                                <td className={`${layout.colMuted} ${styles.colType}`.trim()}>
                                  {row.type ? (
                                    <SmartTooltip content={row.type} as="span" className={styles.cellEllipsis}>{row.type}</SmartTooltip>
                                  ) : (
                                    <span className={layout.colEmpty}>-</span>
                                  )}
                                </td>
                                <td className={styles.colStatus}>{renderStatus(row)}</td>
                                <td className={`${layout.colMuted} ${styles.colContact}`.trim()}>
                                  {contactLabel || <span className={layout.colEmpty}>-</span>}
                                </td>
                                <td className={styles.colEmail} onClick={e => e.stopPropagation()}>
                                  {email ? (
                                    <div className={styles.cellWithActionAlign}>
                                      <SmartTooltip content={email} as="span" className={styles.detailLinkWrap}>
                                        <a href={mailHref} className={styles.detailLink}>{email}</a>
                                      </SmartTooltip>
                                      <SmartTooltip content={pageCopy.actions.copyEmail}>
                                        <button
                                          type="button"
                                          className={styles.inlineCopyBtn}
                                          aria-label={pageCopy.actions.copyEmail}
                                          onClick={() => copyToClipboard(email, pageCopy.clipboardLabels.email)}
                                        >
                                          <Icon icon="mdi:content-copy" />
                                        </button>
                                      </SmartTooltip>
                                    </div>
                                  ) : (
                                    <span className={layout.colEmpty}>-</span>
                                  )}
                                </td>
                                <td className={styles.colPhone} onClick={e => e.stopPropagation()}>
                                  {telephone ? (
                                    <div className={styles.cellWithAction}>
                                      <SmartTooltip content={telephone} as="span" className={styles.detailLinkWrap}>
                                        <a href={telHref} className={styles.detailLink}>{telephone}</a>
                                      </SmartTooltip>
                                      <SmartTooltip content={pageCopy.actions.copyPhone}>
                                        <button
                                          type="button"
                                          className={styles.inlineCopyBtn}
                                          aria-label={pageCopy.actions.copyPhone}
                                          onClick={() => copyToClipboard(telephone, pageCopy.clipboardLabels.phone)}
                                        >
                                          <Icon icon="mdi:content-copy" />
                                        </button>
                                      </SmartTooltip>
                                    </div>
                                  ) : (
                                    <span className={layout.colEmpty}>-</span>
                                  )}
                                </td>
                                <td className={`${layout.colMuted} ${styles.colEnterprises}`.trim()}>
                                  <SmartTooltip content={companies} as="span" className={styles.cellEllipsis}>{companies}</SmartTooltip>
                                </td>
                                <td className={`${styles.actionsCell} ${styles.colActions}`.trim()} onClick={e => e.stopPropagation()}>
                                  <div className={styles.cardActions}>
                                    {telHref ? (
                                      <a
                                        href={telHref}
                                        className={styles.iconActionBtn}
                                        aria-label={interpolate(pageCopy.actions.callPhoneAria, { phone: telephone })}
                                        title={pageCopy.actions.callPhone}
                                      >
                                        <Icon icon="mdi:phone-outline" aria-hidden />
                                      </a>
                                    ) : null}
                                    {mailHref ? (
                                      <a
                                        href={mailHref}
                                        className={styles.iconActionBtn}
                                        aria-label={interpolate(pageCopy.actions.sendEmailAria, { email })}
                                        title={pageCopy.actions.sendEmail}
                                      >
                                        <Icon icon="mdi:email-outline" aria-hidden />
                                      </a>
                                    ) : null}
                                    <SmartTooltip content={pageCopy.actions.copyCard}>
                                      <button
                                        type="button"
                                        className={styles.iconActionBtn}
                                        aria-label={pageCopy.actions.copyCardAria}
                                        onClick={() => {
                                          const payload = buildPrestataireSharePayload(row);
                                          copyToClipboard(payload.text, pageCopy.actions.shareCard);
                                        }}
                                      >
                                        <Icon icon="mdi:content-copy" />
                                      </button>
                                    </SmartTooltip>
                                    <SmartTooltip content={pageCopy.actions.share}>
                                      <button
                                        type="button"
                                        className={styles.iconActionBtn}
                                        aria-label={pageCopy.actions.shareAria}
                                        onClick={() => sharePrestataire(row)}
                                      >
                                        <Icon icon="mdi:share-variant" />
                                      </button>
                                    </SmartTooltip>
                                  </div>
                                </td>
                                <td className={`${layout.favoriteCell} ${styles.colFavorite}`.trim()} onClick={e => e.stopPropagation()}>
                                  <SmartTooltip content={favorited ? pageCopy.favorites.remove : pageCopy.favorites.add}>
                                    <button
                                      type="button"
                                      className={`${layout.favoriteBtn} ${favorited ? layout.favoriteBtnActive : ""}`}
                                      aria-label={favorited ? pageCopy.favorites.remove : pageCopy.favorites.add}
                                      aria-pressed={favorited}
                                      onClick={() => toggleFavorite(row.id)}
                                    >
                                      <Icon icon={favorited ? "mdi:star" : "mdi:star-outline"} aria-hidden />
                                    </button>
                                  </SmartTooltip>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {filteredAndSorted.length > 0 && (
                    <div className={layout.pagination}>
                      <div className={layout.paginationLeft}>
                        <span className={layout.paginationLabel}>{common.perPage}</span>
                        <select className={layout.paginationSelect} value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
                          <option value={10}>10</option>
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                      </div>
                      <div className={layout.paginationRight}>
                        <SmartTooltip content={common.prevPage}>
                          <button
                            type="button"
                            className={layout.pageBtn}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage <= 1}
                            aria-label={common.prevPage}
                          >
                            <FaChevronLeft />
                          </button>
                        </SmartTooltip>
                        <span className={layout.paginationInfo}>
                          {formatPageInfo(locale, currentPage, totalPages)}
                        </span>
                        <SmartTooltip content={common.nextPage}>
                          <button
                            type="button"
                            className={layout.pageBtn}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage >= totalPages}
                            aria-label={common.nextPage}
                          >
                            <FaChevronRight />
                          </button>
                        </SmartTooltip>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {showModal && (
        <PrestataireModal
          open={showModal}
          initialPrestataire={modalInitial}
          onClose={handleModalClose}
          onSuccess={handleSaved}
          clients={clients}
        />
      )}
    </div>
  );
}
