import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import SmartTooltip from "../SmartTooltip";
import { resolveKnowledgeEmojiUrl } from "../../api/knowledgeBase";
import { buildEmojiMap } from "./knowledgeEmojiHelpers";
import styles from "./knowledgeBase.module.css";

const EXPANDED_STORAGE_KEY = "veritas.kb.folderExpanded";

const COLLECTION_COLORS = [
  "#F5C242",
  "#E67E22",
  "#E74C3C",
  "#9B59B6",
  "#3498DB",
  "#1ABC9C",
  "#2ECC71",
  "#E84393",
  "#00B894",
  "#6C5CE7"
];

function collectionColor(seed) {
  const s = String(seed || "");
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return COLLECTION_COLORS[hash % COLLECTION_COLORS.length];
}

function collectExpandableIds(nodes, out = []) {
  for (const node of nodes || []) {
    if ((node.children || []).length) out.push(node.id);
    collectExpandableIds(node.children, out);
  }
  return out;
}

function findFolderPath(nodes, targetId, path = []) {
  if (!targetId || targetId === "all" || targetId === "root") return null;
  for (const node of nodes || []) {
    const next = [...path, node.id];
    if (node.id === targetId) return next;
    const nested = findFolderPath(node.children, targetId, next);
    if (nested) return nested;
  }
  return null;
}

function loadExpandedState() {
  try {
    const raw = window.localStorage.getItem(EXPANDED_STORAGE_KEY);
    if (raw == null) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return null;
  }
}

function persistExpandedIds(ids) {
  try {
    window.localStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore quota / private mode */
  }
}

function ArticleNavRow({ article, depth, copy, emojiMap, onOpenArticle, untitledLabel }) {
  const customIcon = article.icon ? emojiMap?.get(String(article.icon).toLowerCase()) : null;
  return (
    <button
      type="button"
      className={`${styles.navRow} ${styles.navArticleRow}`}
      style={{ paddingLeft: `${0.55 + depth * 0.9}rem` }}
      onClick={() => onOpenArticle?.(article.id, "read", article.title || untitledLabel)}
      title={article.title || untitledLabel}
    >
      {customIcon ? (
        <img src={resolveKnowledgeEmojiUrl(customIcon)} alt="" className={styles.navEmojiIcon} />
      ) : (
        <span className={styles.navArticleIcon} aria-hidden>
          <Icon icon="mdi:file-document-outline" />
        </span>
      )}
      <span className={styles.navRowLabel}>{article.title || untitledLabel}</span>
      {article.status === "draft" ? <span className={styles.navDraftDot} title={copy.filterDraft} aria-label={copy.filterDraft} /> : null}
    </button>
  );
}

function FolderNode({
  node,
  copy,
  currentFolder,
  depth,
  expandedIds,
  articlesByFolder,
  emojiMap,
  onToggle,
  onSelect,
  onCreate,
  onRename,
  onShare,
  onDelete,
  onOpenArticle,
  canManage
}) {
  const children = node.children || [];
  const hasChildren = children.length > 0;
  const folderArticles = articlesByFolder.get(node.id) || [];
  const canExpand = hasChildren || folderArticles.length > 0;
  const expanded = expandedIds.has(node.id);
  const color = collectionColor(node.id || node.name);
  const customIcon = node.icon ? emojiMap?.get(String(node.icon).toLowerCase()) : null;

  return (
    <div className={styles.navFolderBlock}>
      <div
        className={`${styles.navRow} ${styles.navFolderRow} ${currentFolder === node.id ? styles.navRowActive : ""}`}
        style={{ paddingLeft: `${0.35 + depth * 0.9}rem` }}
      >
        {canExpand ? (
          <button
            type="button"
            className={styles.navChevron}
            aria-expanded={expanded}
            aria-label={expanded ? copy.collapseFolder : copy.expandFolder}
            title={expanded ? copy.collapseFolder : copy.expandFolder}
            onClick={event => {
              event.stopPropagation();
              onToggle(node.id);
            }}
          >
            <Icon icon={expanded ? "mdi:chevron-down" : "mdi:chevron-right"} />
          </button>
        ) : (
          <span className={styles.navChevronSpacer} aria-hidden />
        )}
        <SmartTooltip content={node.name} className={styles.navNameTip}>
          <button type="button" className={styles.navMain} onClick={() => onSelect(node.id)}>
            {customIcon ? (
              <img src={resolveKnowledgeEmojiUrl(customIcon)} alt="" className={styles.navEmojiIcon} />
            ) : (
              <span className={styles.navCollectionIcon} style={{ background: color }} aria-hidden>
                <Icon icon="mdi:cube-outline" />
              </span>
            )}
            <span className={styles.navRowLabel}>{node.name}</span>
            {node.articleCount ? <span className={styles.navCount}>{node.articleCount}</span> : null}
          </button>
        </SmartTooltip>
        {canManage ? (
          <div className={styles.navTools}>
            <button type="button" className={styles.navTool} title={copy.shareFolder} onClick={() => onShare(node)}><Icon icon="mdi:share-variant-outline" /></button>
            <button type="button" className={styles.navTool} title={copy.renameFolder} onClick={() => onRename(node)}><Icon icon="mdi:pencil-outline" /></button>
            <button type="button" className={styles.navTool} title={copy.newSubfolder} onClick={() => onCreate(node.id)}><Icon icon="mdi:folder-plus-outline" /></button>
            <button type="button" className={styles.navTool} title={copy.deleteFolder} onClick={() => onDelete(node)}><Icon icon="mdi:trash-can-outline" /></button>
          </div>
        ) : null}
      </div>
      {canExpand && expanded ? (
        <div className={styles.navChildren}>
          {children.map(child => (
            <FolderNode
              key={child.id}
              node={child}
              copy={copy}
              currentFolder={currentFolder}
              depth={depth + 1}
              expandedIds={expandedIds}
              articlesByFolder={articlesByFolder}
              emojiMap={emojiMap}
              onToggle={onToggle}
              onSelect={onSelect}
              onCreate={onCreate}
              onRename={onRename}
              onShare={onShare}
              onDelete={onDelete}
              onOpenArticle={onOpenArticle}
              canManage={canManage}
            />
          ))}
          {folderArticles.map(article => (
            <ArticleNavRow
              key={article.id}
              article={article}
              depth={depth + 1}
              copy={copy}
              emojiMap={emojiMap}
              onOpenArticle={onOpenArticle}
              untitledLabel={copy.untitled}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function KnowledgeFolderTree({
  copy,
  tree,
  currentFolder,
  status = "all",
  canManage,
  articles = [],
  emojis = [],
  onSelect,
  onStatusChange,
  onSearchFocus,
  onManageEmojis,
  onCreate,
  onRename,
  onShare,
  onDelete,
  onOpenArticle
}) {
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const hydrated = useRef(false);
  const knownExpandable = useRef(new Set());
  const emojiMap = useMemo(() => buildEmojiMap(emojis), [emojis]);

  const articlesByFolder = useMemo(() => {
    const map = new Map();
    for (const article of articles || []) {
      const key = article.folderId || "root";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(article);
    }
    for (const list of map.values()) {
      list.sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""), undefined, { sensitivity: "base" }));
    }
    return map;
  }, [articles]);

  const rootArticles = articlesByFolder.get("root") || [];

  useEffect(() => {
    setExpandedIds(prev => {
      const expandable = collectExpandableIds(tree);
      for (const [folderId, list] of articlesByFolder.entries()) {
        if (folderId !== "root" && list.length) expandable.push(folderId);
      }
      const next = new Set(prev);
      if (!hydrated.current) {
        if (!tree.length && !articles.length) return prev;
        hydrated.current = true;
        const stored = loadExpandedState();
        if (stored) stored.forEach(id => next.add(id));
        else expandable.forEach(id => next.add(id));
      } else {
        expandable.forEach(id => {
          if (!knownExpandable.current.has(id)) next.add(id);
        });
      }
      knownExpandable.current = new Set(expandable);
      const path = findFolderPath(tree, currentFolder);
      if (path) path.slice(0, -1).forEach(id => next.add(id));
      if (currentFolder === "root" && rootArticles.length) next.add("root");
      return next;
    });
  }, [tree, currentFolder, articles, rootArticles.length]);

  const onToggle = useCallback(id => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persistExpandedIds(next);
      return next;
    });
  }, []);

  const goHome = useCallback(() => {
    onSelect?.("all");
    onStatusChange?.("all");
  }, [onSelect, onStatusChange]);

  const goDrafts = useCallback(() => {
    onSelect?.("all");
    onStatusChange?.("draft");
  }, [onSelect, onStatusChange]);

  const selectCollection = useCallback(folderId => {
    onSelect?.(folderId);
    onStatusChange?.("all");
  }, [onSelect, onStatusChange]);

  const rootExpanded = expandedIds.has("root");

  return (
    <aside className={styles.folderPanel}>
      <nav className={styles.navQuick} aria-label={copy.navQuickAria}>
        <button
          type="button"
          className={`${styles.navQuickItem} ${currentFolder === "all" && status === "all" ? styles.navRowActive : ""}`}
          onClick={goHome}
        >
          <Icon icon="mdi:home-outline" />
          <span>{copy.navHome}</span>
        </button>
        <button type="button" className={styles.navQuickItem} onClick={() => onSearchFocus?.()}>
          <Icon icon="mdi:magnify" />
          <span>{copy.navSearch}</span>
        </button>
        <button
          type="button"
          className={`${styles.navQuickItem} ${status === "draft" && currentFolder === "all" ? styles.navRowActive : ""}`}
          onClick={goDrafts}
        >
          <Icon icon="mdi:notebook-edit-outline" />
          <span>{copy.navDrafts}</span>
        </button>
      </nav>

      <div className={styles.navSection}>
        <div className={styles.navSectionHead}>
          <span className={styles.navSectionTitle}>{copy.collectionsTitle}</span>
          <div className={styles.navSectionActions}>
            {canManage ? (
              <button type="button" className={styles.navSectionAdd} onClick={() => onManageEmojis?.()} title={copy.emojiManageTitle}>
                <Icon icon="mdi:emoticon-outline" />
              </button>
            ) : null}
            {canManage ? (
              <button type="button" className={styles.navSectionAdd} onClick={() => onCreate(null)} title={copy.newFolder}>
                <Icon icon="mdi:plus" />
              </button>
            ) : null}
          </div>
        </div>

        <div className={styles.folderList}>
          <div className={styles.navFolderBlock}>
            <div
              className={`${styles.navRow} ${styles.navFolderRow} ${currentFolder === "root" ? styles.navRowActive : ""}`}
              style={{ paddingLeft: "0.35rem" }}
            >
              {rootArticles.length ? (
                <button
                  type="button"
                  className={styles.navChevron}
                  aria-expanded={rootExpanded}
                  aria-label={rootExpanded ? copy.collapseFolder : copy.expandFolder}
                  onClick={() => onToggle("root")}
                >
                  <Icon icon={rootExpanded ? "mdi:chevron-down" : "mdi:chevron-right"} />
                </button>
              ) : (
                <span className={styles.navChevronSpacer} aria-hidden />
              )}
              <button type="button" className={styles.navMain} onClick={() => selectCollection("root")}>
                <span className={`${styles.navCollectionIcon} ${styles.navCollectionIconMuted}`} aria-hidden>
                  <Icon icon="mdi:folder-hidden" />
                </span>
                <span className={styles.navRowLabel}>{copy.noFolder}</span>
                {rootArticles.length ? <span className={styles.navCount}>{rootArticles.length}</span> : null}
              </button>
            </div>
            {rootExpanded && rootArticles.length ? (
              <div className={styles.navChildren}>
                {rootArticles.map(article => (
                  <ArticleNavRow
                    key={article.id}
                    article={article}
                    depth={1}
                    copy={copy}
                    emojiMap={emojiMap}
                    onOpenArticle={onOpenArticle}
                    untitledLabel={copy.untitled}
                  />
                ))}
              </div>
            ) : null}
          </div>

          {tree.map(node => (
            <FolderNode
              key={node.id}
              node={node}
              copy={copy}
              currentFolder={currentFolder}
              depth={0}
              expandedIds={expandedIds}
              articlesByFolder={articlesByFolder}
              emojiMap={emojiMap}
              onToggle={onToggle}
              onSelect={selectCollection}
              onCreate={onCreate}
              onRename={onRename}
              onShare={onShare}
              onDelete={onDelete}
              onOpenArticle={onOpenArticle}
              canManage={canManage}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}

export function flattenFolderOptions(tree, depth = 0) {
  const out = [];
  for (const node of tree || []) {
    out.push({ id: node.id, name: node.name, depth });
    out.push(...flattenFolderOptions(node.children || [], depth + 1));
  }
  return out;
}
