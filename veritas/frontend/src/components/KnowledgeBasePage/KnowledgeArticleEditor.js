import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { interpolate } from "../../i18n/translate";
import { fetchClientsList, fetchContactsList } from "../../api/clients";
import { deleteKnowledgeArticle, deleteKnowledgeArticleComment, fetchKnowledgeArticle, fetchKnowledgeArticleRevision, fetchKnowledgeArticleRevisions, fetchKnowledgeArticles, fetchKnowledgeEmojis, fetchKnowledgeFolder, fetchKnowledgeFolders, fetchKnowledgeSearchMisses, fetchKnowledgeTagCatalog, publishKnowledgeArticle, resolveKnowledgeEmojiUrl, resolveKnowledgeHtml, resolveKnowledgeJson, restoreKnowledgeArticleRevision, toStoredKnowledgeHtml, toStoredKnowledgeJson, unpublishKnowledgeArticle, updateKnowledgeArticle, updateKnowledgeArticlePublicLink } from "../../api/knowledgeBase";
import KnowledgeEmojiModal from "./KnowledgeEmojiModal";
import { buildEmojiMap, expandEmojiShortcodesInHtml, renderEmojiShortcodes } from "./knowledgeEmojiHelpers";
import { resolveKnowledgeIcon } from "./knowledgeStandardEmojis";
import ConfirmModal from "../Misc/ConfirmModal/ConfirmModal";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import cyberStyles from "../CybersecuritePage/CybersecuritePage.module.css";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import { sanitizeHtml } from "../../utils/sanitizeHtml";
import KnowledgeBaseEditor from "./KnowledgeBaseEditor";
import KnowledgeCategoryModal from "./KnowledgeCategoryModal";
import KnowledgeShareForm from "./KnowledgeShareForm";
import { flattenFolderOptions } from "./KnowledgeFolderTree";
import { extractHeadings } from "./knowledgeArticleHelpers";
import { KNOWLEDGE_ARTICLE_HTML_CONFIG } from "./knowledgeEditorNodes";
import styles from "./knowledgeBase.module.css";

function formatDate(value, locale) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(locale === "en" ? "en-GB" : locale === "de" ? "de-DE" : locale === "it" ? "it-IT" : locale === "es" ? "es-ES" : "fr-FR");
}

function revisionKindLabel(copy, kind) {
  if (kind === "created") return copy.revisionCreated;
  if (kind === "published") return copy.revisionPublished;
  if (kind === "unpublished") return copy.revisionUnpublished;
  if (kind === "restored") return copy.revisionRestored;
  return copy.revisionSaved;
}

function OptionToggle({ checked, disabled, label, hint, onChange }) {
  return (
    <label className={`${styles.optionCard} ${checked ? styles.optionCardActive : ""}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} />
      <span>
        {label}
        {hint ? <div className={styles.hint}>{hint}</div> : null}
      </span>
    </label>
  );
}

function MetaSection({ title, count, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  return (
    <section className={styles.metaSection}>
      <button
        type="button"
        className={styles.metaHeader}
        onClick={() => setOpen(current => !current)}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className={styles.metaTitle}>
          {title}
          {count ? <span className={styles.metaCount}>{count}</span> : null}
        </span>
        <Icon icon={open ? "mdi:chevron-up" : "mdi:chevron-down"} className={styles.metaChevron} aria-hidden />
      </button>
      {open ? (
        <div className={styles.metaBody} id={panelId}>
          {children}
        </div>
      ) : null}
    </section>
  );
}

function MetaRow({ label, children }) {
  return (
    <div className={styles.metaRow}>
      <span className={styles.metaLabel}>{label}</span>
      <div className={styles.metaValue}>{children || "—"}</div>
    </div>
  );
}

function htmlHasText(html) {
  return Boolean(String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

const SIDE_PANEL_COLLAPSED_KEY = "veritas.knowledge.articleSidePanelCollapsed";

function readSidePanelCollapsed() {
  try {
    return window.localStorage.getItem(SIDE_PANEL_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function ArticleReader({
  copy,
  title,
  icon,
  emojiMap,
  category,
  status,
  publishedAt,
  createdBy,
  updatedBy,
  contentHtml,
  showBanner
}) {
  const titleHtml = renderEmojiShortcodes(title || copy.untitled, emojiMap);
  const bodyHtml = expandEmojiShortcodesInHtml(resolveKnowledgeHtml(contentHtml), emojiMap);
  const pageIcon = resolveKnowledgeIcon(icon, emojiMap);
  return (
    <article className={styles.reader}>
      {showBanner ? (
        <div className={styles.previewBanner}>
          <Icon icon="mdi:eye-outline" width={18} />
          <span>{status === "published" ? copy.previewHint : copy.previewDraftHint}</span>
        </div>
      ) : null}
      <div className={styles.readerInner}>
        {category ? <p className={styles.readerCategory}>{category}</p> : null}
        <div className={styles.readerTitleRow}>
          {pageIcon.type === "custom" ? (
            <img src={resolveKnowledgeEmojiUrl(pageIcon.emoji)} alt="" className={styles.pageIconLarge} />
          ) : pageIcon.type === "unicode" ? (
            <span className={styles.pageIconUnicode} aria-hidden>{pageIcon.char}</span>
          ) : null}
          <h1 className={styles.readerTitle} dangerouslySetInnerHTML={{ __html: titleHtml }} />
        </div>
        <p className={styles.readerMeta}>
          <span className={`${styles.badge} ${status === "draft" ? styles.badgeDraft : ""}`}>
            {status === "published" ? copy.statusPublished : copy.statusDraft}
          </span>
          {publishedAt ? <span>{copy.publishedAt} {publishedAt}</span> : null}
        </p>
        {createdBy || updatedBy ? (
          <p className={styles.readerByline}>
            {createdBy ? <span>{createdBy}</span> : null}
            {updatedBy ? <span>{updatedBy}</span> : null}
          </p>
        ) : null}
        {htmlHasText(contentHtml) ? (
          <div
            className={styles.readerBody}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(bodyHtml, KNOWLEDGE_ARTICLE_HTML_CONFIG) }}
          />
        ) : (
          <p className={styles.previewEmpty}>{copy.previewEmpty}</p>
        )}
      </div>
    </article>
  );
}

export default function KnowledgeArticleEditor({
  articleId,
  mode = "edit",
  copy,
  locale,
  canEdit,
  canDelete,
  onBack,
  onRequestEdit
}) {
  const [article, setArticle] = useState(null);
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState(null);
  const [emojis, setEmojis] = useState([]);
  const [emojiModal, setEmojiModal] = useState(null);
  const [category, setCategory] = useState("");
  const [categoryModal, setCategoryModal] = useState(false);
  const [visibleToAgents, setVisibleToAgents] = useState(true);
  const [visibleToAllClients, setVisibleToAllClients] = useState(false);
  const [visibleToAllContacts, setVisibleToAllContacts] = useState(false);
  const [ratingsEnabled, setRatingsEnabled] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(false);
  const [commentsCompany, setCommentsCompany] = useState(false);
  const [relatedIds, setRelatedIds] = useState([]);
  const [relatedCatalog, setRelatedCatalog] = useState([]);
  const [searchMisses, setSearchMisses] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [previewRevision, setPreviewRevision] = useState(null);
  const [clientIds, setClientIds] = useState([]);
  const [contactIds, setContactIds] = useState([]);
  const [clientTagIds, setClientTagIds] = useState([]);
  const [contactTagIds, setContactTagIds] = useState([]);
  const [clientTags, setClientTags] = useState([]);
  const [contactTags, setContactTags] = useState([]);
  const [tagCatalog, setTagCatalog] = useState([]);
  const [tagCatalogLoading, setTagCatalogLoading] = useState(false);
  const [contentJson, setContentJson] = useState(null);
  const [contentHtml, setContentHtml] = useState("");
  const [clients, setClients] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareDraft, setShareDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [folderId, setFolderId] = useState("");
  const [folderOptions, setFolderOptions] = useState([]);
  const [inheritedSharing, setInheritedSharing] = useState(null);
  const [revisions, setRevisions] = useState([]);
  const [confirmRestore, setConfirmRestore] = useState(null);
  const [sidePanelCollapsed, setSidePanelCollapsed] = useState(readSidePanelCollapsed);
  const [publicBusy, setPublicBusy] = useState(false);
  const savedFpRef = useRef("");
  const skipAutosaveRef = useRef(true);
  const onBackRef = useRef(onBack);
  const loadErrorRef = useRef(copy.loadError);
  onBackRef.current = onBack;
  loadErrorRef.current = copy.loadError;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setTagCatalogLoading(true);
      try {
        const [loaded, clientRows, contactRows, folderData, catalog, history, relatedRows, misses] = await Promise.all([
          fetchKnowledgeArticle(articleId),
          fetchClientsList().catch(() => []),
          fetchContactsList().catch(() => []),
          fetchKnowledgeFolders().catch(() => ({ tree: [] })),
          fetchKnowledgeTagCatalog().catch(() => []),
          fetchKnowledgeArticleRevisions(articleId).catch(() => []),
          fetchKnowledgeArticles({ status: "published" }).catch(() => []),
          fetchKnowledgeSearchMisses().catch(() => [])
        ]);
        if (cancelled) return;
        setArticle(loaded);
        setTitle(loaded.title || "");
        setIcon(loaded.icon || null);
        setCategory(loaded.category || "");
        setVisibleToAgents(loaded.visibleToAgents !== false);
        setVisibleToAllClients(loaded.visibleToAllClients === true);
        setVisibleToAllContacts(loaded.visibleToAllContacts === true);
        setRatingsEnabled(loaded.ratingsEnabled === true);
        setCommentsEnabled(loaded.commentsEnabled === true);
        setCommentsCompany(loaded.commentsCompany === true);
        setRelatedIds(Array.isArray(loaded.relatedIds) ? loaded.relatedIds : []);
        setClientIds((loaded.clientIds || []).map(id => Number(id)));
        setContactIds((loaded.contactIds || []).map(id => Number(id)));
        setClientTagIds((loaded.clientTagIds || []).map(String));
        setContactTagIds((loaded.contactTagIds || []).map(String));
        setClientTags(Array.isArray(loaded.clientTags) ? loaded.clientTags : []);
        setContactTags(Array.isArray(loaded.contactTags) ? loaded.contactTags : []);
        setTagCatalog(Array.isArray(catalog) ? catalog : []);
        setTagCatalogLoading(false);
        setFolderId(loaded.folderId || "");
        setInheritedSharing(loaded.inheritedSharing || null);
        setFolderOptions(flattenFolderOptions(folderData.tree || []));
        setContentJson(resolveKnowledgeJson(loaded.contentJson));
        setContentHtml(resolveKnowledgeHtml(loaded.contentHtml || ""));
        setClients(Array.isArray(clientRows) ? clientRows : []);
        setContacts(Array.isArray(contactRows) ? contactRows : []);
        setRevisions(Array.isArray(history) ? history : []);
        setRelatedCatalog(Array.isArray(relatedRows) ? relatedRows.filter(row => row.id !== articleId) : []);
        setSearchMisses(Array.isArray(misses) ? misses : []);
        skipAutosaveRef.current = true;
      } catch (err) {
        toast.error(err.message || loadErrorRef.current);
        onBackRef.current?.();
      } finally {
        if (!cancelled) {
          setLoading(false);
          setTagCatalogLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  useEffect(() => {
    setPreviewing(false);
  }, [articleId]);

  useEffect(() => {
    if (loading) return undefined;
    if (!folderId) {
      setInheritedSharing(null);
      return undefined;
    }
    let cancelled = false;
    fetchKnowledgeFolder(folderId)
      .then(data => {
        if (!cancelled) setInheritedSharing(data.inheritedSharing || null);
      })
      .catch(() => {
        if (!cancelled) setInheritedSharing(null);
      });
    return () => { cancelled = true; };
  }, [folderId, loading]);

  useEffect(() => {
    if (!title) return undefined;
    const timer = window.setTimeout(() => {
      window.updateTabTitle?.("KnowledgeBaseArticle", { articleId, mode, title }, title);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [articleId, mode, title]);

  const payload = useCallback(() => ({
    title,
    icon: icon || null,
    category,
    visibleToAgents,
    visibleToAllClients,
    visibleToAllContacts,
    ratingsEnabled,
    commentsEnabled,
    commentsCompany,
    clientIds,
    contactIds,
    clientTagIds,
    contactTagIds,
    relatedIds,
    folderId: folderId || null,
    contentJson: toStoredKnowledgeJson(contentJson),
    contentHtml: toStoredKnowledgeHtml(contentHtml)
  }), [title, icon, category, visibleToAgents, visibleToAllClients, visibleToAllContacts, ratingsEnabled, commentsEnabled, commentsCompany, clientIds, contactIds, clientTagIds, contactTagIds, relatedIds, folderId, contentJson, contentHtml]);

  const emojiMap = useMemo(() => buildEmojiMap(emojis), [emojis]);

  useEffect(() => {
    let cancelled = false;
    fetchKnowledgeEmojis()
      .then(rows => {
        if (!cancelled) setEmojis(rows);
      })
      .catch(() => {
        if (!cancelled) setEmojis([]);
      });
    return () => { cancelled = true; };
  }, [articleId]);

  const refreshRevisions = useCallback(() => {
    fetchKnowledgeArticleRevisions(articleId)
      .then(rows => setRevisions(Array.isArray(rows) ? rows : []))
      .catch(() => setRevisions([]));
  }, [articleId]);

  const hydrateFromArticle = useCallback(next => {
    setArticle(next);
    setTitle(next.title || "");
    setIcon(next.icon || null);
    setCategory(next.category || "");
    setVisibleToAgents(next.visibleToAgents !== false);
    setVisibleToAllClients(next.visibleToAllClients === true);
    setVisibleToAllContacts(next.visibleToAllContacts === true);
    setRatingsEnabled(next.ratingsEnabled === true);
    setCommentsEnabled(next.commentsEnabled === true);
    setCommentsCompany(next.commentsCompany === true);
    setRelatedIds(Array.isArray(next.relatedIds) ? next.relatedIds : []);
    setClientIds((next.clientIds || []).map(id => Number(id)));
    setContactIds((next.contactIds || []).map(id => Number(id)));
    setClientTagIds((next.clientTagIds || []).map(String));
    setContactTagIds((next.contactTagIds || []).map(String));
    setClientTags(Array.isArray(next.clientTags) ? next.clientTags : []);
    setContactTags(Array.isArray(next.contactTags) ? next.contactTags : []);
    setFolderId(next.folderId || "");
    setInheritedSharing(next.inheritedSharing || null);
    setContentJson(resolveKnowledgeJson(next.contentJson));
    setContentHtml(resolveKnowledgeHtml(next.contentHtml || ""));
  }, []);

  const save = useCallback(async (options = {}) => {
    const silent = options?.silent === true;
    setSaving(true);
    try {
      const next = await updateKnowledgeArticle(articleId, { ...payload(), skipRevision: silent });
      setArticle(next);
      setClientTagIds((next.clientTagIds || []).map(String));
      setContactTagIds((next.contactTagIds || []).map(String));
      setClientTags(Array.isArray(next.clientTags) ? next.clientTags : []);
      setContactTags(Array.isArray(next.contactTags) ? next.contactTags : []);
      setRelatedIds(Array.isArray(next.relatedIds) ? next.relatedIds : relatedIds);
      savedFpRef.current = JSON.stringify(payload());
      setDirty(false);
      if (!silent) {
        toast.success(copy.saved);
        refreshRevisions();
      }
    } catch (err) {
      toast.error(err.message || copy.saveError);
    } finally {
      setSaving(false);
    }
  }, [articleId, payload, copy.saved, copy.saveError, refreshRevisions, relatedIds]);

  const publish = useCallback(async () => {
    setSaving(true);
    try {
      await updateKnowledgeArticle(articleId, payload());
      const next = await publishKnowledgeArticle(articleId, {
        visibleToAgents,
        visibleToAllClients,
        visibleToAllContacts,
        clientIds,
        contactIds,
        clientTagIds,
        contactTagIds
      });
      setArticle(next);
      setClientTagIds((next.clientTagIds || []).map(String));
      setContactTagIds((next.contactTagIds || []).map(String));
      setClientTags(Array.isArray(next.clientTags) ? next.clientTags : []);
      setContactTags(Array.isArray(next.contactTags) ? next.contactTags : []);
      toast.success(copy.published);
      refreshRevisions();
    } catch (err) {
      toast.error(err.message || copy.publishError);
    } finally {
      setSaving(false);
    }
  }, [articleId, payload, visibleToAgents, visibleToAllClients, visibleToAllContacts, clientIds, contactIds, clientTagIds, contactTagIds, copy.published, copy.publishError, refreshRevisions]);

  useEffect(() => {
    if (loading || !article) return undefined;
    if (skipAutosaveRef.current) {
      savedFpRef.current = JSON.stringify(payload());
      skipAutosaveRef.current = false;
      setDirty(false);
      return undefined;
    }
    const fingerprint = JSON.stringify(payload());
    if (fingerprint === savedFpRef.current) {
      setDirty(false);
      return undefined;
    }
    setDirty(true);
    if (!canEdit || mode === "read" || saving) return undefined;
    const timer = window.setTimeout(() => {
      save({ silent: true });
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [payload, loading, article, canEdit, mode, saving, save]);

  useEffect(() => {
    const onLeave = event => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const unpublish = useCallback(async () => {
    setSaving(true);
    try {
      const next = await unpublishKnowledgeArticle(articleId);
      setArticle(next);
      toast.success(copy.unpublished);
      refreshRevisions();
    } catch (err) {
      toast.error(err.message || copy.saveError);
    } finally {
      setSaving(false);
    }
  }, [articleId, copy.unpublished, copy.saveError, refreshRevisions]);

  const onRestore = useCallback(async () => {
    if (!confirmRestore?.id) return;
    setSaving(true);
    try {
      const data = await restoreKnowledgeArticleRevision(articleId, confirmRestore.id);
      if (data?.article) hydrateFromArticle(data.article);
      setRevisions(Array.isArray(data?.revisions) ? data.revisions : []);
      setConfirmRestore(null);
      toast.success(copy.revisionRestoredToast);
    } catch (err) {
      toast.error(err.message || copy.restoreError);
    } finally {
      setSaving(false);
    }
  }, [articleId, confirmRestore, hydrateFromArticle, copy.revisionRestoredToast, copy.restoreError]);

  const onDelete = useCallback(async () => {
    try {
      await deleteKnowledgeArticle(articleId);
      toast.success(copy.deleted);
      onBack();
    } catch (err) {
      toast.error(err.message || copy.deleteError);
    }
  }, [articleId, copy.deleted, copy.deleteError, onBack]);

  const onDeleteComment = useCallback(async commentId => {
    try {
      const next = await deleteKnowledgeArticleComment(articleId, commentId);
      if (next) {
        setArticle(prev => ({
          ...prev,
          comments: next.comments || [],
          commentCount: next.commentCount || 0,
          ratingAverage: next.ratingAverage,
          ratingCount: next.ratingCount
        }));
      }
      toast.success(copy.feedbackCommentDeleted);
    } catch (err) {
      toast.error(err.message || copy.feedbackDeleteError);
    }
  }, [articleId, copy.feedbackCommentDeleted, copy.feedbackDeleteError]);

  const openShare = useCallback(() => {
    setShareDraft({
      visibleToAgents,
      visibleToAllClients,
      visibleToAllContacts,
      clientIds: [...clientIds],
      contactIds: [...contactIds],
      clientTagIds: [...clientTagIds],
      contactTagIds: [...contactTagIds]
    });
    setShareOpen(true);
  }, [visibleToAgents, visibleToAllClients, visibleToAllContacts, clientIds, contactIds, clientTagIds, contactTagIds]);

  const closeShare = useCallback(() => {
    setShareOpen(false);
    setShareDraft(null);
  }, []);

  const applyShare = useCallback(() => {
    if (!shareDraft) return;
    setVisibleToAgents(shareDraft.visibleToAgents);
    setVisibleToAllClients(shareDraft.visibleToAllClients);
    setVisibleToAllContacts(shareDraft.visibleToAllContacts);
    setClientIds(shareDraft.clientIds);
    setContactIds(shareDraft.contactIds);
    setClientTagIds(shareDraft.clientTagIds);
    setContactTagIds(shareDraft.contactTagIds);
    closeShare();
  }, [shareDraft, closeShare]);

  const publicUrl = article?.publicEnabled && article?.publicToken
    ? `${window.location.origin}/kb/${article.publicToken}`
    : "";

  const updatePublicLink = useCallback(async patch => {
    if (publicBusy) return;
    setPublicBusy(true);
    try {
      const next = await updateKnowledgeArticlePublicLink(articleId, patch);
      setArticle(current => ({ ...current, ...next }));
    } catch (err) {
      toast.error(err.message || copy.publicLinkError);
    } finally {
      setPublicBusy(false);
    }
  }, [articleId, copy.publicLinkError, publicBusy]);

  const toggleSidePanel = useCallback(() => {
    setSidePanelCollapsed(current => {
      const next = !current;
      try {
        window.localStorage.setItem(SIDE_PANEL_COLLAPSED_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }, []);

  const contentClass = `${cyberStyles.mspContent} ${cyberStyles.mspContentList} ${styles.editorContent}`;

  if (loading || !article) {
    return (
      <main className={contentClass}>
        <div className={styles.empty}>{copy.loading}</div>
      </main>
    );
  }

  const isReadTab = mode === "read";
  const editable = Boolean(canEdit) && !isReadTab;
  const showPreview = isReadTab || previewing || !editable;
  const publishedAt = formatDate(article.publishedAt, locale);
  const createdByText = interpolate(copy.createdBy, { name: article.authorName || copy.unknownAuthor });
  const updatedByText = interpolate(copy.updatedByAt, {
    name: article.updatedByName || article.authorName || copy.unknownAuthor,
    when: formatDate(article.updatedAt, locale) || "—"
  });
  const clientsSummary = visibleToAllClients
    ? copy.audienceAllClients
    : [
        clientIds.length ? interpolate(copy.audienceClients, { count: String(clientIds.length) }) : null,
        clientTagIds.length ? interpolate(copy.audienceClientTags, { count: String(clientTagIds.length) }) : null
      ].filter(Boolean).join(" · ") || copy.audienceNone;
  const contactsSummary = visibleToAllContacts
    ? copy.audienceAllContacts
    : [
        contactIds.length ? interpolate(copy.audienceContacts, { count: String(contactIds.length) }) : null,
        contactTagIds.length ? interpolate(copy.audienceContactTags, { count: String(contactTagIds.length) }) : null
      ].filter(Boolean).join(" · ") || copy.audienceNone;

  return (
    <>
      <MspPageHero
        className={styles.editorHero}
        eyebrow={copy.eyebrow}
        title={title || copy.untitled}
        icon="mdi:book-open-page-variant-outline"
        actions={(
          <div className={styles.heroToolbar}>
            <button
              type="button"
              className={`${styles.secondaryBtn} ${styles.heroBackBtn}`}
              onClick={() => {
                if (dirty && !window.confirm(copy.unsaved)) return;
                onBack();
              }}
              aria-label={copy.back}
              title={copy.back}
            >
              <Icon icon="mdi:arrow-left" />
            </button>
            {isReadTab && canEdit ? (
              <button
                type="button"
                className={`${layout.primaryBtn} ${styles.heroActionBtn}`}
                onClick={() => onRequestEdit?.(title || copy.untitled)}
              >
                <Icon icon="mdi:pencil-outline" /> {copy.edit}
              </button>
            ) : null}
            {editable ? (
              <>
                <div className={styles.modeSwitch} role="tablist" aria-label={copy.previewMode}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={!previewing}
                    className={`${styles.modeBtn} ${!previewing ? styles.modeBtnActive : ""}`}
                    onClick={() => setPreviewing(false)}
                  >
                    <Icon icon="mdi:pencil-outline" /> {copy.editMode}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={previewing}
                    className={`${styles.modeBtn} ${previewing ? styles.modeBtnActive : ""}`}
                    onClick={() => setPreviewing(true)}
                  >
                    <Icon icon="mdi:eye-outline" /> {copy.previewMode}
                  </button>
                </div>
                <span className={styles.heroToolbarSep} aria-hidden />
                {dirty || saving ? (
                  <span className={`${styles.dirtyPill} ${!dirty && saving ? styles.dirtyPillSaved : ""}`}>
                    {saving ? copy.autosaving : copy.unsaved}
                  </span>
                ) : null}
                <button type="button" className={`${styles.secondaryBtn} ${styles.heroActionBtn}`} onClick={() => save()} disabled={saving}>
                  <Icon icon="mdi:content-save-outline" /> {saving ? copy.saving : copy.save}
                </button>
                {article.status === "published" ? (
                  <button type="button" className={`${styles.secondaryBtn} ${styles.heroActionBtn}`} onClick={unpublish} disabled={saving}>
                    <Icon icon="mdi:file-undo-outline" /> {copy.unpublish}
                  </button>
                ) : (
                  <button type="button" className={`${layout.primaryBtn} ${styles.heroActionBtn}`} onClick={publish} disabled={saving}>
                    <Icon icon="mdi:check-decagram-outline" /> {copy.publish}
                  </button>
                )}
                {canDelete ? (
                  <button type="button" className={`${styles.dangerBtn} ${styles.heroActionBtn}`} onClick={() => setConfirmDelete(true)}>
                    <Icon icon="mdi:trash-can-outline" /> {copy.delete}
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
        )}
      >
        <p className={styles.heroMeta}>
          {category ? <span className={styles.heroCat}>{category}</span> : null}
          {publishedAt ? <span className={styles.heroMetaItem}>{copy.publishedAt} {publishedAt}</span> : null}
          <span className={styles.heroMetaItem}>{createdByText}</span>
          <span className={styles.heroMetaItem}>{updatedByText}</span>
        </p>
      </MspPageHero>
      <main className={contentClass}>
        <div className={styles.editorPage}>
          <div className={`${styles.editorShell} ${showPreview ? styles.editorShellPreview : ""} ${!showPreview && sidePanelCollapsed ? styles.editorShellSideCollapsed : ""}`}>
            <section className={styles.editorMain}>
              {editable ? (
                <div className={styles.editorPane} hidden={showPreview}>
                  <div className={styles.titleRow}>
                    <button
                      type="button"
                      className={styles.pageIconBtn}
                      onClick={() => setEmojiModal({ pick: true, target: "icon" })}
                      title={copy.emojiPageIcon}
                      aria-label={copy.emojiPageIcon}
                    >
                      {(() => {
                        const pageIcon = resolveKnowledgeIcon(icon, emojiMap);
                        if (pageIcon.type === "custom") {
                          return <img src={resolveKnowledgeEmojiUrl(pageIcon.emoji)} alt="" className={styles.pageIconImg} />;
                        }
                        if (pageIcon.type === "unicode") {
                          return <span className={styles.pageIconUnicode} aria-hidden>{pageIcon.char}</span>;
                        }
                        return <Icon icon="mdi:emoticon-outline" />;
                      })()}
                    </button>
                    <input className={styles.titleInput} value={title} onChange={event => setTitle(event.target.value)} placeholder={copy.titlePlaceholder} />
                    {icon ? (
                      <button type="button" className={styles.pageIconClear} onClick={() => setIcon(null)} title={copy.emojiClearIcon}>
                        <Icon icon="mdi:close" />
                      </button>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className={`${styles.categoryPicker} ${category ? styles.categoryPickerHas : ""}`}
                    onClick={() => setCategoryModal(true)}
                  >
                    <Icon icon="mdi:tag-outline" />
                    {category || copy.categoryAssign}
                  </button>
                  <KnowledgeBaseEditor
                    articleId={articleId}
                    contentJson={contentJson}
                    editable
                    copy={copy}
                    locale={locale}
                    emojis={emojis}
                    onManageEmojis={opts => setEmojiModal(opts || { pick: true })}
                    onChange={({ json, html }) => {
                      setContentJson(json);
                      setContentHtml(html);
                    }}
                  />
                </div>
              ) : null}
              {showPreview ? (
                <ArticleReader
                  copy={copy}
                  title={title}
                  icon={icon}
                  emojiMap={emojiMap}
                  category={category}
                  status={article.status}
                  publishedAt={publishedAt}
                  createdBy={createdByText}
                  updatedBy={updatedByText}
                  contentHtml={contentHtml}
                  showBanner={editable && previewing}
                />
              ) : null}
            </section>
            {showPreview ? null : (
            <aside className={`${styles.sidePanel} ${sidePanelCollapsed ? styles.sidePanelCollapsed : ""}`}>
              <div className={styles.sidePanelBar}>
                <button
                  type="button"
                  className={styles.sidePanelToggle}
                  onClick={toggleSidePanel}
                  aria-expanded={!sidePanelCollapsed}
                  aria-label={sidePanelCollapsed ? copy.showSidePanel : copy.hideSidePanel}
                  title={sidePanelCollapsed ? copy.showSidePanel : copy.hideSidePanel}
                >
                  <Icon icon={sidePanelCollapsed ? "mdi:chevron-left" : "mdi:chevron-right"} />
                </button>
              </div>
              <div className={styles.sideScroll} hidden={sidePanelCollapsed}>
                <MetaSection title={copy.infoTitle}>
                  <MetaRow label={copy.statusLabel}>
                    <span className={styles.sideStatus}>
                      <span className={`${styles.badge} ${article.status === "draft" ? styles.badgeDraft : ""}`}>
                        {article.status === "published" ? copy.statusPublished : copy.statusDraft}
                      </span>
                      {!editable ? <span className={styles.badge}>{copy.readOnly}</span> : null}
                    </span>
                  </MetaRow>
                  <MetaRow label={copy.viewsLabel}>{article.viewCount || 0}</MetaRow>
                  {article.helpfulYes || article.helpfulNo ? (
                    <MetaRow label={copy.helpfulAsk || "Helpful"}>
                      {article.helpfulYes || 0} / {article.helpfulNo || 0}
                    </MetaRow>
                  ) : null}
                  <MetaRow label={copy.folderLabel}>
                    <select className={styles.search} value={folderId} disabled={!editable} onChange={event => setFolderId(event.target.value)}>
                      <option value="">{copy.folderNone}</option>
                      {folderOptions.map(folder => (
                        <option key={folder.id} value={folder.id}>
                          {"— ".repeat(folder.depth)}{folder.name}
                        </option>
                      ))}
                    </select>
                    {inheritedSharing?.folders?.length ? (
                      <p className={styles.hint}>
                        {copy.inheritedFrom}: {inheritedSharing.folders.map(folder => folder.name).join(" → ")}
                      </p>
                    ) : null}
                  </MetaRow>
                </MetaSection>
                <MetaSection title={copy.tocTitle} defaultOpen>
                  {extractHeadings(contentHtml).length === 0 ? (
                    <p className={styles.hint}>{copy.tocEmpty}</p>
                  ) : (
                    <ol className={styles.tocList}>
                      {extractHeadings(contentHtml).map((heading, index) => (
                        <li key={`${heading.id}-${index}`} style={{ paddingLeft: `${(heading.level - 1) * 0.65}rem` }}>
                          <button
                            type="button"
                            className={styles.tocBtn}
                            onClick={() => {
                              const root = document.querySelector(`.${styles.editorArea}`);
                              const nodes = root?.querySelectorAll("h1, h2, h3, h4");
                              nodes?.[index]?.scrollIntoView({ behavior: "smooth", block: "center" });
                            }}
                          >
                            {heading.text}
                          </button>
                        </li>
                      ))}
                    </ol>
                  )}
                </MetaSection>
                <MetaSection title={copy.relatedTitle} defaultOpen={false}>
                  <p className={styles.hint}>{copy.relatedHint}</p>
                  {relatedIds.length === 0 ? <p className={styles.hint}>{copy.relatedNone}</p> : null}
                  {relatedIds.map(id => {
                    const row = relatedCatalog.find(item => item.id === id) || { id, title: id };
                    return (
                      <button
                        key={id}
                        type="button"
                        className={styles.historyRestore}
                        onClick={() => setRelatedIds(current => current.filter(item => item !== id))}
                        disabled={!editable}
                      >
                        {row.title || id} ×
                      </button>
                    );
                  })}
                  {editable ? (
                    <div className={styles.relatedPick}>
                      {relatedCatalog.filter(row => !relatedIds.includes(row.id)).slice(0, 12).map(row => (
                        <button
                          key={row.id}
                          type="button"
                          onClick={() => setRelatedIds(current => [...current, row.id])}
                        >
                          {copy.relatedPick} · {row.title || copy.untitled}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </MetaSection>
                <MetaSection title={copy.visibilityTitle}>
                  <MetaRow label={copy.audienceAgents}>{visibleToAgents ? copy.visibilityOn : copy.visibilityOff}</MetaRow>
                  <MetaRow label={copy.clientsLabel}>{clientsSummary}</MetaRow>
                  <MetaRow label={copy.contactsLabel}>{contactsSummary}</MetaRow>
                  <button type="button" className={styles.shareOpenBtn} onClick={openShare}>
                    <Icon icon="mdi:share-variant-outline" />
                    {copy.configureVisibility}
                  </button>
                </MetaSection>
                <MetaSection title={copy.publicLinkTitle} defaultOpen={false}>
                  <p className={styles.hint}>{copy.publicLinkHint}</p>
                  {article.status !== "published" ? <p className={styles.hint}>{copy.publicLinkDraftHint}</p> : null}
                  <OptionToggle
                    checked={article.publicEnabled === true}
                    disabled={!editable || publicBusy}
                    label={copy.publicLinkToggle}
                    onChange={value => updatePublicLink({ enabled: value })}
                  />
                  {article.publicEnabled && publicUrl ? (
                    <div className={styles.publicLinkBox}>
                      <input className={styles.search} value={publicUrl} readOnly onFocus={event => event.target.select()} />
                      <button
                        type="button"
                        className={styles.shareOpenBtn}
                        disabled={publicBusy}
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(publicUrl);
                            toast.success(copy.publicLinkCopied);
                          } catch {
                            toast.error(copy.publicLinkCopyError);
                          }
                        }}
                      >
                        <Icon icon="mdi:content-copy" /> {copy.publicLinkCopy}
                      </button>
                      {editable ? (
                        <button
                          type="button"
                          className={styles.shareOpenBtn}
                          disabled={publicBusy}
                          onClick={() => {
                            if (!window.confirm(copy.publicLinkRotateConfirm)) return;
                            updatePublicLink({ rotate: true });
                          }}
                        >
                          <Icon icon="mdi:refresh" /> {copy.publicLinkRotate}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </MetaSection>
                <MetaSection title={copy.feedbackTitle} count={article.commentCount || null} defaultOpen={false}>
                  <OptionToggle
                    checked={ratingsEnabled}
                    disabled={!editable}
                    label={copy.ratingsToggle}
                    hint={copy.ratingsToggleHint}
                    onChange={setRatingsEnabled}
                  />
                  <OptionToggle
                    checked={commentsEnabled}
                    disabled={!editable}
                    label={copy.commentsToggle}
                    hint={copy.commentsToggleHint}
                    onChange={setCommentsEnabled}
                  />
                  <OptionToggle
                    checked={commentsCompany}
                    disabled={!editable || !commentsEnabled}
                    label={copy.commentsCompanyToggle}
                    hint={copy.commentsCompanyHint}
                    onChange={setCommentsCompany}
                  />
                  <div className={styles.feedbackStats}>
                    {article.ratingCount ? (
                      <>
                        <div className={styles.starRow} aria-label={interpolate(copy.feedbackAvg, { avg: String(article.ratingAverage || 0), count: String(article.ratingCount || 0) })}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <Icon
                              key={star}
                              icon={star <= Math.round(Number(article.ratingAverage) || 0) ? "mdi:star" : "mdi:star-outline"}
                              className={star <= Math.round(Number(article.ratingAverage) || 0) ? styles.starOn : styles.starOff}
                            />
                          ))}
                        </div>
                        <p className={styles.hint}>
                          {interpolate(copy.feedbackAvg, { avg: String(article.ratingAverage || 0), count: String(article.ratingCount || 0) })}
                        </p>
                      </>
                    ) : (
                      <p className={styles.hint}>{copy.feedbackNoRatings}</p>
                    )}
                  </div>
                  <div className={styles.sideLabel}>{copy.feedbackCommentsTitle}</div>
                  {(article.comments || []).length === 0 ? (
                    <p className={styles.hint}>{copy.feedbackNoComments}</p>
                  ) : (
                    <ol className={styles.historyList}>
                      {(article.comments || []).map(comment => (
                        <li key={comment.id} className={styles.historyItem}>
                          <div className={styles.historyMeta}>
                            {comment.authorName || copy.unknownAuthor}
                            {comment.companyName ? ` · ${comment.companyName}` : ""}
                            {" · "}
                            {formatDate(comment.createdAt, locale)}
                          </div>
                          <p className={styles.commentBody}>{comment.body}</p>
                          {canEdit ? (
                            <button
                              type="button"
                              className={styles.historyRestore}
                              onClick={() => onDeleteComment(comment.id)}
                            >
                              {copy.feedbackDeleteComment}
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  )}
                </MetaSection>
                <MetaSection title={copy.historyTitle} count={revisions.length || null} defaultOpen={false}>
                  {revisions.length === 0 ? (
                    <p className={styles.hint}>{copy.historyEmpty}</p>
                  ) : (
                    <ol className={styles.historyList}>
                      {revisions.map((entry, index) => (
                        <li key={entry.id} className={styles.historyItem}>
                          <div className={styles.historyMain}>
                            <span className={styles.historyRev}>v{entry.revision}</span>
                            <span className={styles.historyKind}>{revisionKindLabel(copy, entry.changeKind)}</span>
                            {index === 0 ? <span className={styles.historyNow}>{copy.revisionCurrent}</span> : null}
                          </div>
                          <div className={styles.historyMeta}>
                            {entry.editorName || copy.unknownAuthor}
                            {" · "}
                            {formatDate(entry.createdAt, locale)}
                          </div>
                          <div className={styles.historyActions}>
                            <button
                              type="button"
                              className={styles.historyRestore}
                              disabled={saving}
                              onClick={async () => {
                                try {
                                  const revision = await fetchKnowledgeArticleRevision(articleId, entry.id);
                                  setPreviewRevision(revision);
                                } catch (err) {
                                  toast.error(err.message || copy.restoreError);
                                }
                              }}
                            >
                              {copy.previewRevision}
                            </button>
                            {editable && index > 0 ? (
                              <button
                                type="button"
                                className={styles.historyRestore}
                                disabled={saving}
                                onClick={() => setConfirmRestore(entry)}
                              >
                                {copy.restoreRevision}
                              </button>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </MetaSection>
                <MetaSection title={copy.searchMissesTitle} defaultOpen={false}>
                  {searchMisses.length === 0 ? (
                    <p className={styles.hint}>{copy.searchMissesEmpty}</p>
                  ) : (
                    <ol className={styles.historyList}>
                      {searchMisses.map(row => (
                        <li key={row.query} className={styles.historyItem}>
                          <div className={styles.historyMain}>{row.query}</div>
                          <div className={styles.historyMeta}>{row.count}</div>
                        </li>
                      ))}
                    </ol>
                  )}
                </MetaSection>
              </div>
            </aside>
            )}
          </div>
        </div>
      </main>
      <KnowledgeCategoryModal
        open={categoryModal}
        copy={copy}
        selectedName={category}
        canManage={editable}
        assign
        onClose={() => setCategoryModal(false)}
        onSelect={setCategory}
      />
      <KnowledgeEmojiModal
        open={Boolean(emojiModal)}
        copy={copy}
        canManage={editable}
        pickMode={Boolean(emojiModal?.pick)}
        onClose={() => setEmojiModal(null)}
        onChanged={async () => {
          try {
            setEmojis(await fetchKnowledgeEmojis());
          } catch {
            /* ignore */
          }
        }}
        onPick={value => {
          if (emojiModal?.target === "icon") {
            setIcon(value || null);
          }
          setEmojiModal(null);
        }}
      />
      {shareOpen && shareDraft ? createPortal(
        <div className={styles.modalOverlay} onClick={closeShare}>
          <div className={`${styles.modalShell} ${styles.modalShellWide}`} onClick={event => event.stopPropagation()}>
            <div className={styles.modalHead}>
              <h2>{copy.shareArticle}</h2>
              <button type="button" className={styles.folderTool} onClick={closeShare}><Icon icon="mdi:close" /></button>
            </div>
            <div className={`${styles.modalBody} ${styles.modalBodyShare}`}>
              <KnowledgeShareForm
                copy={copy}
                disabled={!editable}
                intro={copy.shareArticleHint}
                inheritedFromText={inheritedSharing?.folders?.length
                  ? `${copy.inheritedFrom}: ${inheritedSharing.folders.map(folder => folder.name).join(" → ")}`
                  : null}
                visibleToAgents={shareDraft.visibleToAgents}
                onVisibleToAgentsChange={value => setShareDraft(current => ({ ...current, visibleToAgents: value }))}
                visibleToAllClients={shareDraft.visibleToAllClients}
                onVisibleToAllClientsChange={value => setShareDraft(current => ({ ...current, visibleToAllClients: value }))}
                visibleToAllContacts={shareDraft.visibleToAllContacts}
                onVisibleToAllContactsChange={value => setShareDraft(current => ({ ...current, visibleToAllContacts: value }))}
                clients={clients}
                contacts={contacts}
                clientIds={shareDraft.clientIds}
                contactIds={shareDraft.contactIds}
                onClientIdsChange={value => setShareDraft(current => ({ ...current, clientIds: value }))}
                onContactIdsChange={value => setShareDraft(current => ({ ...current, contactIds: value }))}
                clientTagIds={shareDraft.clientTagIds}
                contactTagIds={shareDraft.contactTagIds}
                onClientTagIdsChange={value => setShareDraft(current => ({ ...current, clientTagIds: value }))}
                onContactTagIdsChange={value => setShareDraft(current => ({ ...current, contactTagIds: value }))}
                clientTags={clientTags}
                contactTags={contactTags}
                tagCatalog={tagCatalog}
                tagCatalogLoading={tagCatalogLoading}
              />
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.secondaryBtn} onClick={closeShare}>{copy.modalCancel}</button>
              {editable ? (
                <button type="button" className={styles.secondaryBtn} onClick={applyShare}>{copy.applyVisibility}</button>
              ) : null}
            </div>
          </div>
        </div>,
        document.body
      ) : null}
      {previewRevision ? createPortal(
        <div className={styles.modalOverlay} onClick={() => setPreviewRevision(null)}>
          <div className={`${styles.modalShell} ${styles.modalShellWide}`} onClick={event => event.stopPropagation()}>
            <div className={styles.modalHead}>
              <h2>{copy.revisionPreviewTitle} · v{previewRevision.revision}</h2>
              <button type="button" className={styles.folderTool} onClick={() => setPreviewRevision(null)}><Icon icon="mdi:close" /></button>
            </div>
            <div className={styles.modalBody}>
              <ArticleReader
                copy={copy}
                title={previewRevision.title || copy.untitled}
                icon={previewRevision.icon || null}
                emojiMap={emojiMap}
                category={previewRevision.category}
                status={previewRevision.status}
                publishedAt=""
                createdBy=""
                updatedBy=""
                contentHtml={previewRevision.contentHtml || ""}
                showBanner={false}
              />
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.secondaryBtn} onClick={() => setPreviewRevision(null)}>{copy.modalCancel}</button>
              {editable ? (
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => {
                    setConfirmRestore(previewRevision);
                    setPreviewRevision(null);
                  }}
                >
                  {copy.restoreAfterPreview}
                </button>
              ) : null}
            </div>
          </div>
        </div>,
        document.body
      ) : null}
      <ConfirmModal
        open={confirmDelete}
        title={copy.deleteTitle}
        message={interpolate(copy.deleteMessage, { title: title || copy.untitled })}
        confirmLabel={copy.delete}
        variant="danger"
        onClose={() => setConfirmDelete(false)}
        onConfirm={onDelete}
      />
      <ConfirmModal
        open={Boolean(confirmRestore)}
        title={copy.restoreRevisionTitle}
        message={interpolate(copy.restoreRevisionMessage, {
          revision: confirmRestore ? `v${confirmRestore.revision}` : "",
          when: confirmRestore ? formatDate(confirmRestore.createdAt, locale) : ""
        })}
        confirmLabel={copy.restoreRevision}
        onClose={() => setConfirmRestore(null)}
        onConfirm={onRestore}
      />
    </>
  );
}
