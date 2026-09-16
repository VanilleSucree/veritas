import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PageGuideTour from "../PageGuide/PageGuideTour";
import { getKnowledgeBaseGuide } from "../PageGuide/knowledgeBaseGuideSteps";
import { useRegisterPageGuide } from "../../hooks/useRegisterPageGuide";
import { useLocation } from "react-router-dom";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCan } from "../../contexts/PermissionsContext";
import { interpolate } from "../../i18n/translate";
import { formatPageInfo } from "../../i18n/commonI18n";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { useDefaultPageSize } from "../../hooks/useDefaultPageSize";
import { createKnowledgeArticle, createKnowledgeFolder, deleteKnowledgeArticle, deleteKnowledgeArticles, deleteKnowledgeFolder, fetchKnowledgeArticles, fetchKnowledgeCategories, fetchKnowledgeEmojis, fetchKnowledgeFolders, moveKnowledgeArticles, updateKnowledgeFolder } from "../../api/knowledgeBase";
import ConfirmModal from "../Misc/ConfirmModal/ConfirmModal";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import SmartTooltip from "../SmartTooltip";
import cyberStyles from "../CybersecuritePage/CybersecuritePage.module.css";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import { getKnowledgeBaseCopy } from "./knowledgeBaseI18n";
import KnowledgeArticleEditor from "./KnowledgeArticleEditor";
import KnowledgeCategoryModal from "./KnowledgeCategoryModal";
import KnowledgeEmojiModal from "./KnowledgeEmojiModal";
import KnowledgeFolderModal from "./KnowledgeFolderModal";
import KnowledgeFolderTree, { flattenFolderOptions } from "./KnowledgeFolderTree";
import { articleTemplates, templateToHtml } from "./knowledgeArticleHelpers";
import styles from "./knowledgeBase.module.css";

function KnowledgeBaseShell({ children }) {
  return (
    <div className={`${cyberStyles.mspPage} msp-page-grid`}>
      <div className={cyberStyles.mspLayout}>
        <div className={cyberStyles.mspMain}>{children}</div>
      </div>
    </div>
  );
}

function formatDate(value, locale) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(locale === "en" ? "en-GB" : locale === "de" ? "de-DE" : locale === "it" ? "it-IT" : locale === "es" ? "es-ES" : "fr-FR");
}

export default function KnowledgeBasePage({ onNavigate }) {
  const location = useLocation();
  const articleMatch = useMemo(() => {
    const match = String(location.pathname || "").match(/^\/knowledge-base\/([^/]+)(?:\/(edit))?$/);
    if (!match) return null;
    return {
      articleId: decodeURIComponent(match[1]),
      mode: match[2] === "edit" ? "edit" : "read"
    };
  }, [location.pathname]);
  const articleId = articleMatch?.articleId || null;
  const articleMode = articleMatch?.mode || "read";
  const locale = useAppLocale();
  const copy = useMemo(() => getKnowledgeBaseCopy(locale), [locale]);
  const common = useCommonCopy();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useDefaultPageSize();
  const [pageGuideOpen, setPageGuideOpen] = useState(false);
  const openPageGuide = useCallback(() => setPageGuideOpen(true), []);
  useRegisterPageGuide(openPageGuide);
  const kbGuide = useMemo(() => getKnowledgeBaseGuide(locale), [locale]);
  const canCreate = useCan("knowledge_base.create");
  const canEdit = useCan("knowledge_base.edit") || canCreate;
  const canDelete = useCan("knowledge_base.delete");
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [creating, setCreating] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [folderTree, setFolderTree] = useState([]);
  const [navArticles, setNavArticles] = useState([]);
  const [navEmojis, setNavEmojis] = useState([]);
  const [emojiModal, setEmojiModal] = useState(false);
  const [currentFolder, setCurrentFolder] = useState("all");
  const [folderModal, setFolderModal] = useState(null);
  const [folderBusy, setFolderBusy] = useState(false);
  const [confirmFolderDelete, setConfirmFolderDelete] = useState(null);
  const [moveTarget, setMoveTarget] = useState("");
  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categoryModal, setCategoryModal] = useState(false);
  const searchInputRef = useRef(null);

  const loadFolders = useCallback(async () => {
    try {
      const result = await fetchKnowledgeFolders();
      setFolderTree(result.tree || []);
    } catch {
      setFolderTree([]);
    }
  }, []);

  const loadNavArticles = useCallback(async () => {
    try {
      const rows = await fetchKnowledgeArticles({ status: "all" });
      setNavArticles((rows || []).map(row => ({
        id: row.id,
        title: row.title,
        folderId: row.folderId || null,
        status: row.status,
        icon: row.icon || null
      })));
    } catch {
      setNavArticles([]);
    }
  }, []);

  const loadNavEmojis = useCallback(async () => {
    try {
      setNavEmojis(await fetchKnowledgeEmojis());
    } catch {
      setNavEmojis([]);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      setCategories(await fetchKnowledgeCategories());
    } catch {
      setCategories([]);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchKnowledgeArticles({
        search: search.trim() || undefined,
        status,
        folderId: (search.trim() || currentFolder === "all") ? undefined : currentFolder,
        category: categoryFilter || undefined
      });
      setArticles(rows);
      setSelected(prev => {
        const ids = new Set(rows.map(row => row.id));
        return new Set([...prev].filter(id => ids.has(id)));
      });
    } catch (err) {
      setArticles([]);
      toast.error(err.message || copy.loadError);
    } finally {
      setLoading(false);
    }
  }, [search, status, currentFolder, categoryFilter, copy.loadError]);

  useEffect(() => {
    if (articleId) return undefined;
    loadFolders();
    loadNavArticles();
    loadNavEmojis();
    loadCategories();
  }, [loadFolders, loadNavArticles, loadNavEmojis, loadCategories, articleId]);

  useEffect(() => {
    if (articleId) return undefined;
    const timer = window.setTimeout(() => { load(); }, search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, search, articleId]);

  const openArticle = useCallback((id, mode, title) => {
    onNavigate?.("KnowledgeBaseArticle", { articleId: id, mode, title });
  }, [onNavigate]);

  const backToList = useCallback(() => {
    onNavigate?.("KnowledgeBase");
  }, [onNavigate]);

  const create = useCallback(async (template = null) => {
    setCreating(true);
    try {
      const article = await createKnowledgeArticle({
        title: template?.title || copy.untitled,
        category: template?.category || undefined,
        folderId: currentFolder !== "all" && currentFolder !== "root" ? currentFolder : null,
        contentJson: template?.json || undefined,
        contentHtml: template?.json ? templateToHtml(template.json) : undefined
      });
      toast.success(copy.created);
      setTemplateOpen(false);
      openArticle(article.id, "edit", article.title || copy.untitled);
    } catch (err) {
      toast.error(err.message || copy.createError);
    } finally {
      setCreating(false);
    }
  }, [copy.untitled, copy.created, copy.createError, openArticle, currentFolder]);

  const toggleSelected = useCallback(id => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allSelected = articles.length > 0 && articles.every(row => selected.has(row.id));

  const toggleSelectAll = useCallback(() => {
    setSelected(prev => {
      if (articles.length > 0 && articles.every(row => prev.has(row.id))) return new Set();
      return new Set(articles.map(row => row.id));
    });
  }, [articles]);

  const confirmSingleDelete = useCallback(async () => {
    if (!confirmDelete || confirmDelete === "bulk") return;
    setDeleting(true);
    try {
      await deleteKnowledgeArticle(confirmDelete.id);
      toast.success(copy.deleted);
      setConfirmDelete(null);
      setSelected(prev => {
        const next = new Set(prev);
        next.delete(confirmDelete.id);
        return next;
      });
      await load();
      await loadNavArticles();
    } catch (err) {
      toast.error(err.message || copy.deleteError);
    } finally {
      setDeleting(false);
    }
  }, [confirmDelete, copy.deleted, copy.deleteError, load, loadNavArticles]);

  const confirmBulkDelete = useCallback(async () => {
    const ids = [...selected];
    if (!ids.length) return;
    setDeleting(true);
    try {
      const result = await deleteKnowledgeArticles(ids);
      const deleted = Number(result?.deleted) || 0;
      const requested = Number(result?.requested) || ids.length;
      if (deleted && deleted < requested) {
        toast.success(interpolate(copy.bulkDeletePartial, { success: String(deleted), failure: String(requested - deleted) }));
      } else {
        toast.success(interpolate(copy.bulkDeleted, { count: String(deleted || ids.length) }));
      }
      setConfirmDelete(null);
      setSelected(new Set());
      await load();
      await loadNavArticles();
    } catch (err) {
      toast.error(err.message || copy.bulkDeleteError);
    } finally {
      setDeleting(false);
    }
  }, [selected, copy.bulkDeleted, copy.bulkDeletePartial, copy.bulkDeleteError, load, loadNavArticles]);

  const saveFolder = useCallback(async (payload) => {
    setFolderBusy(true);
    try {
      if (folderModal?.mode === "create") {
        await createKnowledgeFolder({ name: payload.name, parentId: folderModal.parentId, icon: payload.icon });
        toast.success(copy.folderCreated);
      } else if (folderModal?.folder?.id) {
        await updateKnowledgeFolder(folderModal.folder.id, payload);
        toast.success(copy.folderSaved);
      }
      setFolderModal(null);
      await loadFolders();
    } catch (err) {
      toast.error(err.message || copy.folderError);
    } finally {
      setFolderBusy(false);
    }
  }, [folderModal, copy.folderCreated, copy.folderSaved, copy.folderError, loadFolders]);

  const removeFolder = useCallback(async () => {
    if (!confirmFolderDelete?.id) return;
    setFolderBusy(true);
    try {
      await deleteKnowledgeFolder(confirmFolderDelete.id);
      toast.success(copy.folderDeleted);
      if (currentFolder === confirmFolderDelete.id) setCurrentFolder("all");
      setConfirmFolderDelete(null);
      await loadFolders();
      await load();
      await loadNavArticles();
    } catch (err) {
      toast.error(err.message || copy.folderError);
    } finally {
      setFolderBusy(false);
    }
  }, [confirmFolderDelete, currentFolder, copy.folderDeleted, copy.folderError, loadFolders, load, loadNavArticles]);

  const moveSelected = useCallback(async () => {
    const ids = [...selected];
    if (!ids.length) return;
    try {
      const result = await moveKnowledgeArticles(ids, moveTarget || null);
      toast.success(interpolate(copy.moved, { count: String(result.moved || ids.length) }));
      setSelected(new Set());
      setMoveTarget("");
      await loadFolders();
      await load();
      await loadNavArticles();
    } catch (err) {
      toast.error(err.message || copy.moveError);
    }
  }, [selected, moveTarget, copy.moved, copy.moveError, loadFolders, load, loadNavArticles]);

  const folderOptions = useMemo(() => flattenFolderOptions(folderTree), [folderTree]);

  const drafts = articles.filter(row => row.status === "draft").length;
  const published = articles.filter(row => row.status === "published").length;
  const selectedCount = selected.size;
  const totalPages = Math.max(1, Math.ceil(articles.length / pageSize) || 1);
  const paginatedArticles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return articles.slice(start, start + pageSize);
  }, [articles, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, status, currentFolder, categoryFilter, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  if (articleId) {
    return (
      <KnowledgeBaseShell>
        <KnowledgeArticleEditor
          articleId={articleId}
          mode={articleMode}
          copy={copy}
          locale={locale}
          canEdit={canEdit}
          canDelete={canDelete}
          onBack={backToList}
        />
        <PageGuideTour open={pageGuideOpen} steps={kbGuide.steps} title={kbGuide.tourTitle} locale={locale} onClose={() => setPageGuideOpen(false)} />
      </KnowledgeBaseShell>
    );
  }

  return (
    <KnowledgeBaseShell>
      <MspPageHero
        guideId="kb-hero"
        eyebrow={copy.eyebrow}
        title={copy.pageTitle}
        subtitle={copy.subtitle}
        icon="mdi:book-open-page-variant-outline"
        actions={canCreate ? (
          <button type="button" className={layout.primaryBtn} onClick={() => setTemplateOpen(true)} disabled={creating}>
            <Icon icon="mdi:plus" /> {copy.newArticle}
          </button>
        ) : null}
      />
      <main className={`${cyberStyles.mspContent} ${cyberStyles.mspContentList}`}>
        <div className={styles.content}>
          <div className={styles.kpiRow} data-guide="kb-kpis">
            <div className={styles.kpiCard}>
              <div className={styles.kpiIconWrap}><Icon icon="mdi:book-open-page-variant-outline" width={20} /></div>
              <div>
                <div className={styles.kpiValue}>{articles.length}</div>
                <div className={styles.kpiLabel}>{copy.kpiTotal}</div>
              </div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiIconWrap}><Icon icon="mdi:file-edit-outline" width={20} /></div>
              <div>
                <div className={styles.kpiValue}>{drafts}</div>
                <div className={styles.kpiLabel}>{copy.kpiDrafts}</div>
              </div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiIconWrap}><Icon icon="mdi:check-decagram-outline" width={20} /></div>
              <div>
                <div className={styles.kpiValue}>{published}</div>
                <div className={styles.kpiLabel}>{copy.kpiPublished}</div>
              </div>
            </div>
          </div>
          <div className={styles.contentSplit}>
            <div className={styles.folderColumn} data-guide="kb-folders">
            <KnowledgeFolderTree
              copy={copy}
              tree={folderTree}
              currentFolder={currentFolder}
              status={status}
              articles={navArticles}
              emojis={navEmojis}
              canManage={canEdit}
              onSelect={setCurrentFolder}
              onStatusChange={setStatus}
              onSearchFocus={() => {
                searchInputRef.current?.focus();
                searchInputRef.current?.select?.();
              }}
              onOpenArticle={openArticle}
              onManageEmojis={() => setEmojiModal(true)}
              onCreate={parentId => setFolderModal({ mode: "create", parentId })}
              onRename={node => setFolderModal({ mode: "rename", folder: node })}
              onShare={node => setFolderModal({ mode: "share", folder: node })}
              onDelete={node => setConfirmFolderDelete(node)}
            />
            </div>
            <div className={styles.listColumn}>
          <div className={styles.toolbar} data-guide="kb-toolbar">
            {canDelete || canEdit ? articles.length > 0 ? (
              <label className={styles.selectAll}>
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} aria-label={copy.selectAll} />
              </label>
            ) : null : null}
            <input
              ref={searchInputRef}
              className={`${styles.search} ${styles.toolbarSearch}`}
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder={copy.searchPlaceholder}
            />
            <div className={styles.filters}>
              {["all", "draft", "published"].map(key => (
                <button
                  key={key}
                  type="button"
                  className={`${styles.filterBtn} ${status === key ? styles.filterBtnActive : ""}`}
                  onClick={() => setStatus(key)}
                >
                  {key === "all" ? copy.filterAll : key === "draft" ? copy.filterDraft : copy.filterPublished}
                </button>
              ))}
            </div>
            <select
              className={styles.categorySelect}
              value={categoryFilter}
              onChange={event => setCategoryFilter(event.target.value)}
              aria-label={copy.categoryFilterAll}
            >
              <option value="">{copy.categoryFilterAll}</option>
              {categories.map(row => (
                <option key={row.id} value={row.name}>{row.name}</option>
              ))}
            </select>
            {canEdit ? (
              <button type="button" className={styles.secondaryBtn} onClick={() => setCategoryModal(true)}>
                <Icon icon="mdi:tag-outline" /> {copy.categoryManage}
              </button>
            ) : null}
          </div>
          {(canDelete || canEdit) && selectedCount > 0 ? (
            <div className={styles.bulkBar}>
              <span>{interpolate(copy.bulkSelected, { count: String(selectedCount) })}</span>
              <div className={styles.bulkActions}>
                <button type="button" className={styles.secondaryBtn} onClick={() => setSelected(new Set())}>
                  {copy.deselectAll}
                </button>
                {canEdit ? (
                  <>
                    <select className={styles.moveSelect} value={moveTarget} onChange={event => setMoveTarget(event.target.value)}>
                      <option value="">{copy.noFolder}</option>
                      {folderOptions.map(folder => (
                        <option key={folder.id} value={folder.id}>
                          {"— ".repeat(folder.depth)}{folder.name}
                        </option>
                      ))}
                    </select>
                    <button type="button" className={styles.secondaryBtn} onClick={moveSelected}>
                      <Icon icon="mdi:folder-move-outline" /> {copy.moveTo}
                    </button>
                  </>
                ) : null}
                {canDelete ? (
                  <button type="button" className={styles.dangerBtn} onClick={() => setConfirmDelete("bulk")}>
                    <Icon icon="mdi:trash-can-outline" /> {copy.bulkDelete}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
          {loading ? (
            <div className={styles.empty} data-guide="kb-list">{copy.loading}</div>
          ) : articles.length === 0 ? (
            <div className={styles.empty} data-guide="kb-list">
              <p>{search || status !== "all" || categoryFilter ? copy.emptyFiltered : currentFolder !== "all" ? copy.emptyFolder : copy.emptyTitle}</p>
              <p className={styles.emptyHint}>{copy.emptyHint}</p>
            </div>
          ) : (
            <div className={styles.list} data-guide="kb-list">
              {paginatedArticles.map(article => (
                <div key={article.id} className={`${styles.card} ${canDelete || canEdit ? styles.cardWithSelect : ""}`}>
                  {canDelete || canEdit ? (
                    <input
                      type="checkbox"
                      className={styles.cardCheck}
                      checked={selected.has(article.id)}
                      onChange={() => toggleSelected(article.id)}
                      aria-label={interpolate(copy.selectArticle, { title: article.title || copy.untitled })}
                    />
                  ) : null}
                  <div>
                    <h3 className={styles.cardTitle}>{article.title || copy.untitled}</h3>
                    <div className={styles.cardMeta}>
                      <span className={`${styles.badge} ${article.status === "draft" ? styles.badgeDraft : ""}`}>
                        {article.status === "published" ? copy.statusPublished : copy.statusDraft}
                      </span>
                      {article.publicEnabled ? <span>{copy.publicLinkTitle}</span> : null}
                      {article.visibleToAgents ? <span>{copy.audienceAgents}</span> : null}
                      {article.visibleToAllClients ? (
                        <span>{copy.audienceAllClients}</span>
                      ) : article.clientCount ? (
                        <span>{interpolate(copy.audienceClients, { count: String(article.clientCount) })}</span>
                      ) : null}
                      {article.visibleToAllContacts ? (
                        <span>{copy.audienceAllContacts}</span>
                      ) : article.contactCount ? (
                        <span>{interpolate(copy.audienceContacts, { count: String(article.contactCount) })}</span>
                      ) : null}
                      {!article.visibleToAllClients && article.clientTagCount ? (
                        <span>{interpolate(copy.audienceClientTags, { count: String(article.clientTagCount) })}</span>
                      ) : null}
                      {!article.visibleToAllContacts && article.contactTagCount ? (
                        <span>{interpolate(copy.audienceContactTags, { count: String(article.contactTagCount) })}</span>
                      ) : null}
                      {!article.visibleToAllClients && !article.visibleToAllContacts && !article.clientCount && !article.contactCount && !article.clientTagCount && !article.contactTagCount ? (
                        <span>{copy.audienceNone}</span>
                      ) : null}
                      {article.category ? <span>{article.category}</span> : null}
                      {article.folderName ? <span>{article.folderName}</span> : null}
                      {article.authorName ? <span>{interpolate(copy.createdBy, { name: article.authorName })}</span> : null}
                      {article.updatedByName || article.updatedAt ? (
                        <span>
                          {interpolate(copy.updatedByAt, {
                            name: article.updatedByName || article.authorName || copy.unknownAuthor,
                            when: formatDate(article.updatedAt, locale) || "—"
                          })}
                        </span>
                      ) : (
                        <span>{copy.updated} {formatDate(article.updatedAt, locale)}</span>
                      )}
                      {article.ratingCount ? (
                        <span>{interpolate(copy.listFeedbackRating, { avg: String(article.ratingAverage || 0), count: String(article.ratingCount) })}</span>
                      ) : article.ratingsEnabled ? (
                        <span>{copy.listFeedbackRatingsOn}</span>
                      ) : null}
                      {article.commentCount ? (
                        <span>{interpolate(copy.listFeedbackComments, { count: String(article.commentCount) })}</span>
                      ) : article.commentsEnabled ? (
                        <span>{copy.listFeedbackCommentsOn}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      className={styles.cardAction}
                      title={copy.read}
                      aria-label={copy.read}
                      onClick={() => openArticle(article.id, "read", article.title || copy.untitled)}
                    >
                      <Icon icon="mdi:eye-outline" width={18} />
                    </button>
                    {canEdit ? (
                      <button
                        type="button"
                        className={styles.cardAction}
                        title={copy.edit}
                        aria-label={copy.edit}
                        onClick={() => openArticle(article.id, "edit", article.title || copy.untitled)}
                      >
                        <Icon icon="mdi:pencil-outline" width={18} />
                      </button>
                    ) : null}
                    {canDelete ? (
                      <button
                        type="button"
                        className={`${styles.cardAction} ${styles.cardActionDanger}`}
                        title={copy.delete}
                        aria-label={copy.delete}
                        onClick={() => setConfirmDelete({ id: article.id, title: article.title || copy.untitled })}
                      >
                        <Icon icon="mdi:trash-can-outline" width={18} />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && articles.length > 0 ? (
            <div className={styles.paginationBar}>
              <div className={layout.paginationLeft}>
                <span className={layout.paginationLabel}>{common.perPage}</span>
                <select
                  className={layout.paginationSelect}
                  value={pageSize}
                  onChange={event => setPageSize(Number(event.target.value))}
                  aria-label={common.perPage}
                >
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
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage <= 1}
                    aria-label={common.prevPage}
                  >
                    <Icon icon="mdi:chevron-left" width={16} />
                  </button>
                </SmartTooltip>
                <span className={layout.paginationInfo}>
                  {formatPageInfo(locale, currentPage, totalPages)} · {articles.length}
                </span>
                <SmartTooltip content={common.nextPage}>
                  <button
                    type="button"
                    className={layout.pageBtn}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
                    aria-label={common.nextPage}
                  >
                    <Icon icon="mdi:chevron-right" width={16} />
                  </button>
                </SmartTooltip>
              </div>
            </div>
          ) : null}
            </div>
          </div>
        </div>
      </main>
      <KnowledgeCategoryModal
        open={categoryModal}
        copy={copy}
        canManage={canEdit}
        onClose={() => {
          setCategoryModal(false);
          loadCategories();
          load();
        }}
      />
      <KnowledgeEmojiModal
        open={emojiModal}
        copy={copy}
        canManage={canEdit}
        onClose={() => setEmojiModal(false)}
        onChanged={() => loadNavEmojis()}
      />
      {templateOpen ? (
        <div className={styles.modalOverlay} onClick={() => { if (!creating) setTemplateOpen(false); }}>
          <div className={styles.modalShell} onClick={event => event.stopPropagation()}>
            <div className={styles.modalHead}>
              <h2>{copy.templatesTitle}</h2>
              <button type="button" className={styles.folderTool} onClick={() => setTemplateOpen(false)}><Icon icon="mdi:close" /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.templateGrid}>
                <button type="button" className={styles.templateCard} disabled={creating} onClick={() => create(null)}>
                  <strong>{copy.templatesBlank}</strong>
                </button>
                {articleTemplates(copy).map(template => (
                  <button key={template.id} type="button" className={styles.templateCard} disabled={creating} onClick={() => create(template)}>
                    <strong>{template.title}</strong>
                    <span>{template.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <KnowledgeFolderModal
        open={Boolean(folderModal)}
        mode={folderModal?.mode || "create"}
        folder={folderModal?.folder || null}
        parentId={folderModal?.parentId || null}
        copy={copy}
        saving={folderBusy}
        onClose={() => { if (!folderBusy) setFolderModal(null); }}
        onCreate={payload => saveFolder(payload)}
        onRename={(id, payload) => saveFolder(payload)}
      />
      <ConfirmModal
        open={Boolean(confirmFolderDelete)}
        title={copy.folderDeleteTitle}
        message={interpolate(copy.folderDeleteMessage, { name: confirmFolderDelete?.name || "" })}
        confirmLabel={copy.deleteFolder}
        variant="danger"
        loading={folderBusy}
        onClose={() => { if (!folderBusy) setConfirmFolderDelete(null); }}
        onConfirm={removeFolder}
      />
      <ConfirmModal
        open={Boolean(confirmDelete)}
        title={confirmDelete === "bulk" ? interpolate(copy.bulkDeleteTitle, { count: String(selectedCount) }) : copy.deleteTitle}
        message={confirmDelete === "bulk"
          ? interpolate(copy.bulkDeleteMessage, { count: String(selectedCount) })
          : interpolate(copy.deleteMessage, { title: confirmDelete?.title || copy.untitled })}
        confirmLabel={copy.delete}
        variant="danger"
        loading={deleting}
        onClose={() => { if (!deleting) setConfirmDelete(null); }}
        onConfirm={confirmDelete === "bulk" ? confirmBulkDelete : confirmSingleDelete}
      />
      <PageGuideTour open={pageGuideOpen} steps={kbGuide.steps} title={kbGuide.tourTitle} locale={locale} onClose={() => setPageGuideOpen(false)} />
    </KnowledgeBaseShell>
  );
}
