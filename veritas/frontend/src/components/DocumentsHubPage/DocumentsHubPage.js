import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { fetchClientFiles, deleteClientFile, getPreviewUrl, getDownloadUrl, bulkUpdateClientFiles, bulkDeleteClientFiles } from "../../api/clientFiles";
import cyberStyles from "../CybersecuritePage/CybersecuritePage.module.css";
import CyberBulkBar from "../CybersecuritePage/CyberBulkBar";
import { useCyberBulkSelection } from "../CybersecuritePage/useCyberBulkSelection";
import VaultDocumentPreviewModal from "../shared/VaultDocumentPreviewModal/VaultDocumentPreviewModal";
import ConfirmModal from "../Misc/ConfirmModal/ConfirmModal";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { usePermissions } from "../../contexts/PermissionsContext";
import { CATEGORY_KEYS, getDocumentsHubCopy } from "./documentsHubI18n";
import { interpolate } from "../../i18n/translate";
import PageGuideTour from "../PageGuide/PageGuideTour";
import { getDocumentsHubGuide } from "../PageGuide/documentsHubGuideSteps";
import { useRegisterPageGuide } from "../../hooks/useRegisterPageGuide";
import DocumentsBulkEditModal from "./DocumentsBulkEditModal";
import SuggestionAutocomplete from "../shared/SuggestionAutocomplete/SuggestionAutocomplete";
import styles from "./DocumentsHubPage.module.css";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
function formatSize(bytes, locale) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value < 0) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
function formatDate(value, locale) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(locale === "en" ? "en-GB" : locale === "de" ? "de-DE" : locale === "it" ? "it-IT" : locale === "es" ? "es-ES" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}
function fileIcon(mimeType) {
  if (IMAGE_MIMES.has(mimeType)) return "mdi:file-image-outline";
  if (mimeType === "application/pdf") return "mdi:file-pdf-box";
  if (String(mimeType || "").includes("spreadsheet") || String(mimeType || "").includes("excel")) {
    return "mdi:file-excel-box";
  }
  if (String(mimeType || "").includes("word") || String(mimeType || "").includes("document")) {
    return "mdi:file-word-box";
  }
  return "mdi:file-document-outline";
}
function categoryTone(category) {
  const key = String(category || "").toLowerCase();
  if (key.includes("facture")) return styles.badgeInvoice;
  if (key.includes("image") || key.includes("baie")) return styles.badgeMedia;
  if (key.includes("plan") || key.includes("network")) return styles.badgeNetwork;
  if (key.includes("contrat")) return styles.badgeContract;
  if (key.includes("rapport")) return styles.badgeReport;
  return styles.badgeDefault;
}
const SORT_COLUMNS = {
  file_name: "file_name",
  client_name: "client_name",
  category: "category",
  visible_to_client: "visible_to_client",
  created_at: "created_at",
  size_bytes: "size_bytes"
};
function SortableHeader({
  column,
  label,
  sortBy,
  sortDirection,
  onSort,
  className = ""
}) {
  const active = sortBy === column;
  return <th className={`${styles.sortableTh} ${className}`.trim()} aria-sort={active ? sortDirection === "asc" ? "ascending" : "descending" : "none"}>
      <button type="button" className={styles.sortButton} onClick={() => onSort(column)}>
        <span>{label}</span>
        <Icon icon={active ? sortDirection === "asc" ? "mdi:arrow-up" : "mdi:arrow-down" : "mdi:unfold-more-horizontal"} className={`${styles.sortIcon} ${active ? styles.sortIconActive : ""}`.trim()} aria-hidden />
      </button>
    </th>;
}
export default function DocumentsHubPage() {
  const locale = useAppLocale();
  const copy = useMemo(() => getDocumentsHubCopy(locale), [locale]);
  const [pageGuideOpen, setPageGuideOpen] = useState(false);
  const openPageGuide = useCallback(() => setPageGuideOpen(true), []);
  useRegisterPageGuide(openPageGuide);
  const docsGuide = useMemo(() => getDocumentsHubGuide(locale), [locale]);
  const { can } = usePermissions();
  const canEdit = can("documents.edit") || can("clients_detail.vault");
  const canDelete = can("documents.delete") || can("clients_detail.vault");
  const canBulkSelect = canEdit || canDelete;
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [previewFile, setPreviewFile] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [rowEditFile, setRowEditFile] = useState(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sortBy, setSortBy] = useState(SORT_COLUMNS.created_at);
  const [sortDirection, setSortDirection] = useState("desc");
  const loadAbortRef = useRef(null);
  const load = useCallback(async () => {
    loadAbortRef.current?.abort();
    const controller = createTrackedAbortController();
    loadAbortRef.current = controller;
    setLoading(true);
    try {
      const allFiles = await fetchClientFiles({
        signal: controller.signal
      });
      if (controller.signal.aborted) return;
      setFiles(Array.isArray(allFiles) ? allFiles : []);
    } catch (err) {
      if (err?.name === "AbortError") return;
      setFiles([]);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
    return () => loadAbortRef.current?.abort();
  }, [load]);
  const companies = useMemo(() => [...new Set(files.map(f => f.client_name || "-"))].sort((a, b) => a.localeCompare(b)), [files]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return files.filter(f => {
      if (companyFilter && (f.client_name || "-") !== companyFilter) return false;
      if (categoryFilter !== "all" && f.category !== categoryFilter) return false;
      if (!q) return true;
      return String(f.file_name || "").toLowerCase().includes(q) || String(f.client_name || "").toLowerCase().includes(q) || String(f.category || "").toLowerCase().includes(q) || String(f.description || "").toLowerCase().includes(q);
    });
  }, [files, search, companyFilter, categoryFilter]);
  const sorted = useMemo(() => {
    const rows = [...filtered];
    const dir = sortDirection === "asc" ? 1 : -1;
    const localeTag = locale === "en" ? "en-GB" : locale === "de" ? "de-DE" : locale === "it" ? "it-IT" : locale === "es" ? "es-ES" : "en-US";
    rows.sort((a, b) => {
      switch (sortBy) {
        case SORT_COLUMNS.file_name:
          return dir * String(a.file_name || "").localeCompare(String(b.file_name || ""), localeTag, {
            sensitivity: "base"
          });
        case SORT_COLUMNS.client_name:
          return dir * String(a.client_name || "").localeCompare(String(b.client_name || ""), localeTag, {
            sensitivity: "base"
          });
        case SORT_COLUMNS.category:
          {
            const labelFor = key => copy.categories?.[key] || key;
            return dir * labelFor(a.category).localeCompare(labelFor(b.category), localeTag, {
              sensitivity: "base"
            });
          }
        case SORT_COLUMNS.visible_to_client:
          return dir * ((a.visible_to_client ? 1 : 0) - (b.visible_to_client ? 1 : 0));
        case SORT_COLUMNS.size_bytes:
          return dir * ((Number(a.size_bytes) || 0) - (Number(b.size_bytes) || 0));
        case SORT_COLUMNS.created_at:
        default:
          {
            const at = new Date(a.created_at).getTime() || 0;
            const bt = new Date(b.created_at).getTime() || 0;
            return dir * (at - bt);
          }
      }
    });
    return rows;
  }, [filtered, sortBy, sortDirection, locale, copy.categories]);
  const {
    selectedIds,
    selectedItems,
    selectedCount,
    allSelected,
    clearSelection,
    toggleItem,
    toggleAll,
    selectAll
  } = useCyberBulkSelection(sorted);
  const editItems = rowEditFile ? [rowEditFile] : selectedItems;
  const handleSort = column => {
    if (sortBy === column) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
      return;
    }
    setSortBy(column);
    setSortDirection(column === SORT_COLUMNS.created_at || column === SORT_COLUMNS.size_bytes ? "desc" : "asc");
  };
  const stats = useMemo(() => {
    const totalBytes = files.reduce((sum, f) => sum + (Number(f.size_bytes) || 0), 0);
    const companyCount = new Set(files.map(f => f.client_name).filter(Boolean)).size;
    return {
      total: files.length,
      companies: companyCount,
      bytes: totalBytes
    };
  }, [files]);
  const categoryLabel = key => copy.categories?.[key] || key;
  const handleDelete = file => {
    setDeleteTarget(file);
  };
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteClientFile(deleteTarget.id);
      setFiles(prev => prev.filter(f => f.id !== deleteTarget.id));
      toast.success(copy.deleted);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.message || copy.deleteError);
    } finally {
      setDeleting(false);
    }
  };
  const closeEditModal = () => {
    setEditOpen(false);
    setRowEditFile(null);
  };
  const handleRowEdit = file => {
    setRowEditFile(file);
    setEditOpen(true);
  };
  const handleBulkEdit = async fields => {
    const result = await bulkUpdateClientFiles(editItems, fields);
    const failed = result.failed?.length || 0;
    if (result.updated > 0 && failed === 0) toast.success(copy.formatBulkEditSuccess(result.updated));
    else if (result.updated > 0) toast.warn(copy.formatBulkEditPartial(result.updated, failed));
    else toast.error(copy.bulk.toasts.editError);
    if (result.rows?.length) {
      const byId = new Map(result.rows.map(row => [row.id, row]));
      setFiles(prev => prev.map(file => byId.has(file.id) ? {
        ...file,
        ...byId.get(file.id)
      } : file));
    }
    clearSelection();
    setRowEditFile(null);
  };
  const handleBulkDelete = async () => {
    setBusy(true);
    try {
      const result = await bulkDeleteClientFiles(selectedItems);
      const failed = result.failed?.length || 0;
      if (result.deleted > 0 && failed === 0) toast.success(copy.formatBulkDeleteSuccess(result.deleted));
      else if (result.deleted > 0) toast.warn(copy.formatBulkDeletePartial(result.deleted, failed));
      else toast.error(copy.bulk.toasts.deleteError);
      if (result.deletedIds?.length) {
        const removed = new Set(result.deletedIds);
        setFiles(prev => prev.filter(file => !removed.has(file.id)));
      }
      clearSelection();
      setBulkDeleteOpen(false);
    } catch (error) {
      toast.error(error.message || copy.bulk.toasts.deleteError);
    } finally {
      setBusy(false);
    }
  };
  return <div className={`${cyberStyles.mspPage} msp-page-insight`}>
      <div className={cyberStyles.mspLayout}>
        <div className={cyberStyles.mspMain}>
          <header className={cyberStyles.mspHero} data-guide="docs-hero">
            <div className={cyberStyles.mspHeroMain}>
              <div className={cyberStyles.mspBrandMark}>
                <Icon icon="mdi:folder-multiple-outline" className={cyberStyles.mspBrandMarkIcon} />
              </div>
              <div className={cyberStyles.mspHeroCopy}>
                <span className={cyberStyles.mspEyebrow}>{copy.eyebrow}</span>
                <h1 className={cyberStyles.mspTitle}>{copy.pageTitle}</h1>
                <p className={cyberStyles.mspSubtitle}>{copy.subtitle}</p>
              </div>
            </div>
          </header>

          <div className={`${cyberStyles.mspContent} ${styles.content}`}>
            <div className={styles.kpiRow} data-guide="docs-kpis">
              <KpiCard icon="mdi:file-multiple-outline" label={copy.kpiTotal} value={String(stats.total)} />
              <KpiCard icon="mdi:office-building-outline" label={copy.kpiCompanies} value={String(stats.companies)} />
              <KpiCard icon="mdi:database-outline" label={copy.kpiSize} value={formatSize(stats.bytes, locale)} />
            </div>

            <div className={styles.panel}>
              <div className={styles.toolbar} data-guide="docs-toolbar">
                <div className={styles.searchWrap}>
                  <Icon icon="mdi:magnify" className={styles.searchIcon} aria-hidden />
                  <input className={styles.searchInput} value={search} onChange={e => setSearch(e.target.value)} placeholder={copy.searchPlaceholder} aria-label={copy.searchPlaceholder} />
                  {search ? <button type="button" className={styles.clearBtn} onClick={() => setSearch("")} aria-label={copy.cancel}>
                      <Icon icon="mdi:close" />
                    </button> : null}
                </div>
                <SuggestionAutocomplete
                  id="documents-hub-company-filter"
                  className={styles.companySuggest}
                  placeholder={copy.filterCompanyPlaceholder || copy.filterCompany}
                  value={companyFilter}
                  options={companies}
                  onChange={setCompanyFilter}
                  minQueryLength={1}
                  hintMessage={copy.filterCompanyHint}
                  emptyMessage={copy.filterCompanyEmpty || copy.emptyFiltered}
                />
                <select className={styles.select} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} aria-label={copy.filterCategory}>
                  <option value="all">{copy.filterCategory}</option>
                  {CATEGORY_KEYS.map(cat => <option key={cat} value={cat}>
                      {categoryLabel(cat)}
                    </option>)}
                </select>
              </div>

              {loading ? <div className={styles.loadingState}>
                  <span className={styles.spinner} aria-hidden />
                  <p>{copy.loading}</p>
                </div> : filtered.length === 0 ? <div className={styles.empty} data-guide="docs-table">
                  <div className={styles.emptyIconWrap}>
                    <Icon icon="mdi:folder-open-outline" className={styles.emptyIcon} />
                  </div>
                  <h2 className={styles.emptyTitle}>{copy.emptyTitle}</h2>
                  <p className={styles.emptyHint}>{files.length === 0 ? copy.emptyHint : copy.emptyFiltered}</p>
                </div> : <>
                  {canBulkSelect && selectedCount > 0 ? <div className={styles.bulkBarWrap}>
                      <CyberBulkBar copy={copy} selectedCount={selectedCount} allSelected={allSelected} filteredCount={sorted.length} busy={busy} onSelectAll={selectAll} onEdit={canEdit ? () => {
                setRowEditFile(null);
                setEditOpen(true);
              } : undefined} onDelete={canDelete ? () => setBulkDeleteOpen(true) : undefined} onClear={clearSelection} />
                    </div> : null}
                  <div className={styles.tableWrap} data-guide="docs-table">
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        {canBulkSelect ? <th className={styles.checkboxCell}>
                            <input type="checkbox" className={styles.rowCheckbox} checked={allSelected} onChange={toggleAll} disabled={busy} aria-label={copy.bulk.selectAll} />
                          </th> : null}
                        <SortableHeader column={SORT_COLUMNS.file_name} label={copy.colFile} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                        <SortableHeader column={SORT_COLUMNS.client_name} label={copy.colCompany} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                        <SortableHeader column={SORT_COLUMNS.category} label={copy.colCategory} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                        <SortableHeader column={SORT_COLUMNS.visible_to_client} label={copy.colVisibility} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                        <SortableHeader column={SORT_COLUMNS.created_at} label={copy.colDate} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                        <SortableHeader column={SORT_COLUMNS.size_bytes} label={copy.colSize} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                        <th className={styles.actionsCol}>{copy.colActions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map(file => {
                    const isSelected = selectedIds.has(file.id);
                    return <tr key={file.id} className={isSelected ? styles.selectedRow : undefined}>
                          {canBulkSelect ? <td className={styles.checkboxCell} onClick={e => e.stopPropagation()}>
                              <input type="checkbox" className={styles.rowCheckbox} checked={isSelected} disabled={busy} onChange={e => toggleItem(file.id, e.target.checked)} onClick={e => e.stopPropagation()} aria-label={copy.formatBulkSelectRow(file.file_name)} />
                            </td> : null}
                          <td>
                            <button type="button" className={styles.fileCell} onClick={() => setPreviewFile(file)}>
                              <span className={styles.fileIconWrap}>
                                {IMAGE_MIMES.has(file.mime_type) ? <img src={getPreviewUrl(file.id)} alt="" className={styles.fileThumb} /> : <Icon icon={fileIcon(file.mime_type)} className={styles.fileIcon} />}
                              </span>
                              <span className={styles.fileMeta}>
                                <span className={styles.fileName}>{file.file_name}</span>
                                {file.description ? <span className={styles.fileDesc}>{file.description}</span> : null}
                              </span>
                            </button>
                          </td>
                          <td className={styles.companyCell}>{file.client_name || "-"}</td>
                          <td>
                            <span className={`${styles.badge} ${categoryTone(file.category)}`}>
                              {categoryLabel(file.category)}
                            </span>
                          </td>
                          <td>
                            {file.visible_to_client ? <span className={styles.visibilityShared} title={copy.visiblePortal}>
                                <Icon icon="mdi:account-eye-outline" aria-hidden />
                                {copy.visiblePortal}
                              </span> : <span className={styles.visibilityInternal} title={copy.notSharedTitle}>
                                <Icon icon="mdi:account-eye-off-outline" aria-hidden />
                                {copy.notShared}
                              </span>}
                          </td>
                          <td className={styles.mutedCell}>{formatDate(file.created_at, locale)}</td>
                          <td className={styles.mutedCell}>{formatSize(file.size_bytes, locale)}</td>
                          <td>
                            <div className={styles.rowActions}>
                              <button type="button" className={styles.iconAction} title={copy.preview} onClick={() => setPreviewFile(file)}>
                                <Icon icon="mdi:eye-outline" />
                              </button>
                              <a href={getDownloadUrl(file.id)} download={file.file_name} className={styles.iconAction} title={copy.download}>
                                <Icon icon="mdi:download-outline" />
                              </a>
                              {canEdit ? <button type="button" className={styles.iconAction} title={copy.edit} onClick={() => handleRowEdit(file)}>
                                  <Icon icon="mdi:pencil-outline" />
                                </button> : null}
                              {canDelete ? <button type="button" className={`${styles.iconAction} ${styles.iconActionDanger}`} title={copy.delete} onClick={() => handleDelete(file)}>
                                  <Icon icon="mdi:delete-outline" />
                                </button> : null}
                            </div>
                          </td>
                        </tr>;
                  })}
                    </tbody>
                  </table>
                </div>
                </>}
            </div>
          </div>
        </div>
      </div>

      {previewFile ? <VaultDocumentPreviewModal file={previewFile} onClose={() => setPreviewFile(null)} previewUrl={getPreviewUrl(previewFile.id)} downloadUrl={getDownloadUrl(previewFile.id)} footerLeading={<span>{previewFile.client_name || "-"}</span>} categoryBadgeClassName={`${styles.badge} ${categoryTone(previewFile.category)}`} /> : null}

      <DocumentsBulkEditModal open={editOpen} items={editItems} copy={copy} onClose={closeEditModal} onSubmit={handleBulkEdit} />

      <ConfirmModal open={Boolean(deleteTarget)} title={copy.deleteDocumentTitle} message={deleteTarget ? interpolate(copy.deleteDocument, {
      name: deleteTarget.file_name
    }) : ""} icon="mdi:delete-alert-outline" variant="danger" confirmLabel={copy.delete} loading={deleting} onConfirm={handleConfirmDelete} onClose={() => {
      if (!deleting) setDeleteTarget(null);
    }} />

      <ConfirmModal open={bulkDeleteOpen} title={copy.bulk.deleteTitle} message={copy.formatBulkDeleteMessage(selectedCount)} icon="mdi:delete-alert-outline" variant="danger" confirmLabel={copy.bulk.deleteConfirm} loading={busy} onConfirm={handleBulkDelete} onClose={() => {
      if (!busy) setBulkDeleteOpen(false);
    }} />
      <PageGuideTour open={pageGuideOpen} steps={docsGuide.steps} title={docsGuide.tourTitle} locale={locale} onClose={() => setPageGuideOpen(false)} />
    </div>;
}
function KpiCard({
  icon,
  label,
  value
}) {
  return <div className={styles.kpiCard}>
      <span className={styles.kpiIconWrap}>
        <Icon icon={icon} className={styles.kpiIcon} />
      </span>
      <div className={styles.kpiBody}>
        <span className={styles.kpiValue}>{value}</span>
        <span className={styles.kpiLabel}>{label}</span>
      </div>
    </div>;
}
