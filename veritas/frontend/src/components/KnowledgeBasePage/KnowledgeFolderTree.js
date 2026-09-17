import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Icon } from "@iconify/react";
import SmartTooltip from "../SmartTooltip";
import { resolveKnowledgeEmojiUrl } from "../../api/knowledgeBase";
import { buildEmojiMap } from "./knowledgeEmojiHelpers";
import { resolveKnowledgeIcon } from "./knowledgeStandardEmojis";
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

function folderDndId(id) {
  return `folder:${id}`;
}

function articleDndId(id) {
  return `article:${id}`;
}

function intoDndId(folderId) {
  return `into:${folderId || "root"}`;
}

function parseDndId(id) {
  const raw = String(id || "");
  if (raw.startsWith("folder:")) return { type: "folder", id: raw.slice(7) };
  if (raw.startsWith("article:")) return { type: "article", id: raw.slice(8) };
  if (raw.startsWith("into:")) {
    const target = raw.slice(5);
    return { type: "into", id: target === "root" ? null : target };
  }
  return null;
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

function findFolderNode(nodes, targetId) {
  for (const node of nodes || []) {
    if (node.id === targetId) return node;
    const nested = findFolderNode(node.children, targetId);
    if (nested) return nested;
  }
  return null;
}

function isDescendantFolder(nodes, ancestorId, maybeChildId) {
  const ancestor = findFolderNode(nodes, ancestorId);
  if (!ancestor) return false;
  return Boolean(findFolderNode(ancestor.children || [], maybeChildId));
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

function kbCollisionDetection(args) {
  const pointerHits = pointerWithin(args);
  const intoHits = pointerHits.filter(hit => String(hit.id).startsWith("into:"));
  if (intoHits.length) return intoHits;
  return closestCenter(args);
}

function sortArticles(list) {
  return [...(list || [])].sort((a, b) => {
    const ao = Number(a.sortOrder);
    const bo = Number(b.sortOrder);
    if (Number.isFinite(ao) && Number.isFinite(bo) && ao !== bo) return ao - bo;
    return String(a.title || "").localeCompare(String(b.title || ""), undefined, { sensitivity: "base" });
  });
}

function IconPreview({ icon, color, muted }) {
  if (icon?.type === "custom") {
    return <img src={resolveKnowledgeEmojiUrl(icon.emoji)} alt="" className={styles.navEmojiIcon} />;
  }
  if (icon?.type === "unicode") {
    return <span className={styles.navUnicodeIcon} aria-hidden>{icon.char}</span>;
  }
  return (
    <span
      className={`${styles.navCollectionIcon} ${muted ? styles.navCollectionIconMuted : ""}`}
      style={muted ? undefined : { background: color }}
      aria-hidden
    >
      <Icon icon={muted ? "mdi:folder-hidden" : "mdi:cube-outline"} />
    </span>
  );
}

function SortableArticleNavRow({
  article,
  depth,
  copy,
  emojiMap,
  onOpenArticle,
  onChangeIcon,
  canManage,
  untitledLabel,
  dragEnabled
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: articleDndId(article.id),
    data: { type: "article", articleId: article.id, folderId: article.folderId || null },
    disabled: !dragEnabled
  });
  const icon = resolveKnowledgeIcon(article.icon, emojiMap);
  const iconNode = icon.type === "custom" ? (
    <img src={resolveKnowledgeEmojiUrl(icon.emoji)} alt="" className={styles.navEmojiIcon} />
  ) : icon.type === "unicode" ? (
    <span className={styles.navUnicodeIcon} aria-hidden>{icon.char}</span>
  ) : (
    <span className={styles.navArticleIcon} aria-hidden>
      <Icon icon="mdi:file-document-outline" />
    </span>
  );

  return (
    <div
      ref={setNodeRef}
      className={`${styles.navRow} ${styles.navArticleRow} ${isDragging ? styles.navRowDragging : ""}`}
      style={{
        paddingLeft: `${0.55 + depth * 0.9}rem`,
        transform: CSS.Transform.toString(transform),
        transition
      }}
    >
      {dragEnabled ? (
        <button
          type="button"
          className={styles.navDragHandle}
          title={copy.dragHandle || "Déplacer"}
          aria-label={copy.dragHandle || "Déplacer"}
          {...attributes}
          {...listeners}
        >
          <Icon icon="mdi:drag-vertical" />
        </button>
      ) : (
        <span className={styles.navChevronSpacer} aria-hidden />
      )}
      {canManage ? (
        <button
          type="button"
          className={styles.navIconBtn}
          title={copy.emojiChangeIcon || copy.emojiPageIcon}
          aria-label={copy.emojiChangeIcon || copy.emojiPageIcon}
          onClick={() => onChangeIcon?.(article)}
        >
          {iconNode}
        </button>
      ) : iconNode}
      <button
        type="button"
        className={styles.navMain}
        onClick={() => onOpenArticle?.(article.id, "read", article.title || untitledLabel)}
        title={article.title || untitledLabel}
      >
        <span className={styles.navRowLabel}>{article.title || untitledLabel}</span>
        {article.status === "draft" ? <span className={styles.navDraftDot} title={copy.filterDraft} aria-label={copy.filterDraft} /> : null}
      </button>
    </div>
  );
}

function IntoDroppable({ folderId, isOverClass, children }) {
  const { setNodeRef, isOver } = useDroppable({
    id: intoDndId(folderId),
    data: { type: "into", folderId: folderId || null }
  });
  return (
    <div ref={setNodeRef} className={isOver ? isOverClass : undefined}>
      {children}
    </div>
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
  onChangeIcon,
  onChangeArticleIcon,
  onOpenArticle,
  canManage,
  dragEnabled
}) {
  const children = node.children || [];
  const hasChildren = children.length > 0;
  const folderArticles = articlesByFolder.get(node.id) || [];
  const canExpand = hasChildren || folderArticles.length > 0;
  const expanded = expandedIds.has(node.id);
  const color = collectionColor(node.id || node.name);
  const icon = resolveKnowledgeIcon(node.icon, emojiMap);
  const childFolderIds = children.map(child => folderDndId(child.id));
  const articleIds = folderArticles.map(article => articleDndId(article.id));

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: folderDndId(node.id),
    data: { type: "folder", folderId: node.id, parentId: node.parentId || null },
    disabled: !dragEnabled
  });

  return (
    <div className={styles.navFolderBlock}>
      <div
        ref={setNodeRef}
        className={`${styles.navRow} ${styles.navFolderRow} ${currentFolder === node.id ? styles.navRowActive : ""} ${isDragging ? styles.navRowDragging : ""}`}
        style={{
          paddingLeft: `${0.35 + depth * 0.9}rem`,
          transform: CSS.Transform.toString(transform),
          transition
        }}
      >
        {dragEnabled ? (
          <button
            type="button"
            className={styles.navDragHandle}
            title={copy.dragHandle || "Déplacer"}
            aria-label={copy.dragHandle || "Déplacer"}
            {...attributes}
            {...listeners}
          >
            <Icon icon="mdi:drag-vertical" />
          </button>
        ) : null}
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
        <IntoDroppable folderId={node.id} isOverClass={styles.navDropTarget}>
          <SmartTooltip content={node.name} className={styles.navNameTip}>
            <div className={styles.navMain}>
              {canManage ? (
                <button
                  type="button"
                  className={styles.navIconBtn}
                  title={copy.emojiChangeIcon || copy.emojiFolderIcon}
                  aria-label={copy.emojiChangeIcon || copy.emojiFolderIcon}
                  onClick={() => onChangeIcon?.(node)}
                >
                  <IconPreview icon={icon} color={color} />
                </button>
              ) : (
                <IconPreview icon={icon} color={color} />
              )}
              <button type="button" className={styles.navLabelBtn} onClick={() => onSelect(node.id)}>
                <span className={styles.navRowLabel}>{node.name}</span>
                {node.articleCount ? <span className={styles.navCount}>{node.articleCount}</span> : null}
              </button>
            </div>
          </SmartTooltip>
        </IntoDroppable>
        {canManage ? (
          <div className={styles.navTools}>
            <button type="button" className={styles.navTool} title={copy.emojiChangeIcon || copy.emojiFolderIcon} onClick={() => onChangeIcon?.(node)}><Icon icon="mdi:emoticon-outline" /></button>
            <button type="button" className={styles.navTool} title={copy.shareFolder} onClick={() => onShare(node)}><Icon icon="mdi:share-variant-outline" /></button>
            <button type="button" className={styles.navTool} title={copy.renameFolder} onClick={() => onRename(node)}><Icon icon="mdi:pencil-outline" /></button>
            <button type="button" className={styles.navTool} title={copy.newSubfolder} onClick={() => onCreate(node.id)}><Icon icon="mdi:folder-plus-outline" /></button>
            <button type="button" className={styles.navTool} title={copy.deleteFolder} onClick={() => onDelete(node)}><Icon icon="mdi:trash-can-outline" /></button>
          </div>
        ) : null}
      </div>
      {canExpand && expanded ? (
        <div className={styles.navChildren}>
          <SortableContext items={childFolderIds} strategy={verticalListSortingStrategy}>
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
                onChangeIcon={onChangeIcon}
                onChangeArticleIcon={onChangeArticleIcon}
                onOpenArticle={onOpenArticle}
                canManage={canManage}
                dragEnabled={dragEnabled}
              />
            ))}
          </SortableContext>
          <SortableContext items={articleIds} strategy={verticalListSortingStrategy}>
            {folderArticles.map(article => (
              <SortableArticleNavRow
                key={article.id}
                article={article}
                depth={depth + 1}
                copy={copy}
                emojiMap={emojiMap}
                onOpenArticle={onOpenArticle}
                onChangeIcon={onChangeArticleIcon}
                canManage={canManage}
                untitledLabel={copy.untitled}
                dragEnabled={dragEnabled}
              />
            ))}
          </SortableContext>
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
  onCreate,
  onRename,
  onShare,
  onDelete,
  onOpenArticle,
  onChangeIcon,
  onChangeArticleIcon,
  onReorderFolders,
  onReorderArticles
}) {
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [activeDrag, setActiveDrag] = useState(null);
  const hydrated = useRef(false);
  const knownExpandable = useRef(new Set());
  const emojiMap = useMemo(() => buildEmojiMap(emojis), [emojis]);
  const dragEnabled = Boolean(canManage && (onReorderFolders || onReorderArticles));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const articlesByFolder = useMemo(() => {
    const map = new Map();
    for (const article of articles || []) {
      const key = article.folderId || "root";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(article);
    }
    for (const [key, list] of map.entries()) {
      map.set(key, sortArticles(list));
    }
    return map;
  }, [articles]);

  const rootArticles = articlesByFolder.get("root") || [];
  const rootFolderIds = useMemo(() => (tree || []).map(node => folderDndId(node.id)), [tree]);
  const rootArticleIds = useMemo(() => rootArticles.map(article => articleDndId(article.id)), [rootArticles]);

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
  }, [tree, currentFolder, articles, rootArticles.length, articlesByFolder]);

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

  const expandFolder = useCallback(folderId => {
    if (!folderId) return;
    setExpandedIds(prev => {
      if (prev.has(folderId)) return prev;
      const next = new Set(prev);
      next.add(folderId);
      persistExpandedIds(next);
      return next;
    });
  }, []);

  const siblingFolderIds = useCallback((parentId) => {
    if (!parentId) return (tree || []).map(node => node.id);
    const parent = findFolderNode(tree, parentId);
    return (parent?.children || []).map(node => node.id);
  }, [tree]);

  const handleDragStart = useCallback(event => {
    const parsed = parseDndId(event.active.id);
    setActiveDrag(parsed);
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveDrag(null);
  }, []);

  const handleDragEnd = useCallback(async event => {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over || !dragEnabled) return;
    const activeItem = parseDndId(active.id);
    const overItem = parseDndId(over.id);
    if (!activeItem || !overItem) return;

    try {
      if (activeItem.type === "folder") {
        const activeFolder = findFolderNode(tree, activeItem.id);
        if (!activeFolder) return;
        const currentParent = activeFolder.parentId || null;

        if (overItem.type === "into") {
          const nextParent = overItem.id;
          if (nextParent === activeItem.id) return;
          if (nextParent && isDescendantFolder(tree, activeItem.id, nextParent)) return;
          if (nextParent === currentParent) return;
          const ordered = [...siblingFolderIds(nextParent).filter(id => id !== activeItem.id), activeItem.id];
          expandFolder(nextParent);
          await onReorderFolders?.({ parentId: nextParent, orderedIds: ordered });
          return;
        }

        if (overItem.type === "folder") {
          const overFolder = findFolderNode(tree, overItem.id);
          if (!overFolder) return;
          const nextParent = overFolder.parentId || null;
          if (nextParent && isDescendantFolder(tree, activeItem.id, nextParent)) return;
          if (nextParent === activeItem.id) return;
          const siblings = siblingFolderIds(nextParent).filter(id => id !== activeItem.id);
          const overIndex = siblings.indexOf(overItem.id);
          const insertAt = overIndex >= 0 ? overIndex : siblings.length;
          const ordered = [...siblings.slice(0, insertAt), activeItem.id, ...siblings.slice(insertAt)];
          if (nextParent === currentParent) {
            const currentOrder = siblingFolderIds(currentParent);
            if (currentOrder.join(",") === ordered.join(",")) return;
          }
          await onReorderFolders?.({ parentId: nextParent, orderedIds: ordered });
          return;
        }

        if (overItem.type === "article") {
          const targetFolderId = over.data.current?.folderId ?? null;
          if (targetFolderId === activeItem.id) return;
          if (targetFolderId && isDescendantFolder(tree, activeItem.id, targetFolderId)) return;
          if (targetFolderId === currentParent) return;
          const ordered = [...siblingFolderIds(targetFolderId).filter(id => id !== activeItem.id), activeItem.id];
          expandFolder(targetFolderId);
          await onReorderFolders?.({ parentId: targetFolderId, orderedIds: ordered });
        }
        return;
      }

      if (activeItem.type === "article") {
        const activeArticle = (articles || []).find(row => row.id === activeItem.id);
        if (!activeArticle) return;
        const currentFolderId = activeArticle.folderId || null;

        let targetFolderId = currentFolderId;
        let orderedIds = null;

        if (overItem.type === "into") {
          targetFolderId = overItem.id;
          const existing = (articlesByFolder.get(targetFolderId || "root") || [])
            .map(row => row.id)
            .filter(id => id !== activeItem.id);
          orderedIds = [...existing, activeItem.id];
          expandFolder(targetFolderId);
        } else if (overItem.type === "folder") {
          targetFolderId = overItem.id;
          const existing = (articlesByFolder.get(targetFolderId || "root") || [])
            .map(row => row.id)
            .filter(id => id !== activeItem.id);
          orderedIds = [...existing, activeItem.id];
          expandFolder(targetFolderId);
        } else if (overItem.type === "article") {
          targetFolderId = over.data.current?.folderId ?? null;
          const list = (articlesByFolder.get(targetFolderId || "root") || []).map(row => row.id);
          const without = list.filter(id => id !== activeItem.id);
          const overIndex = without.indexOf(overItem.id);
          if (targetFolderId === currentFolderId && list.includes(activeItem.id)) {
            const oldIndex = list.indexOf(activeItem.id);
            const newIndex = list.indexOf(overItem.id);
            if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
            orderedIds = arrayMove(list, oldIndex, newIndex);
          } else {
            const insertAt = overIndex >= 0 ? overIndex : without.length;
            orderedIds = [...without.slice(0, insertAt), activeItem.id, ...without.slice(insertAt)];
          }
        }

        if (!orderedIds) return;
        if (
          targetFolderId === currentFolderId
          && (articlesByFolder.get(currentFolderId || "root") || []).map(row => row.id).join(",") === orderedIds.join(",")
        ) {
          return;
        }
        await onReorderArticles?.({ folderId: targetFolderId, orderedIds });
      }
    } catch {
      /* parent shows toast */
    }
  }, [
    articles,
    articlesByFolder,
    dragEnabled,
    expandFolder,
    onReorderArticles,
    onReorderFolders,
    siblingFolderIds,
    tree
  ]);

  const rootExpanded = expandedIds.has("root");

  const overlayLabel = useMemo(() => {
    if (!activeDrag) return "";
    if (activeDrag.type === "folder") {
      return findFolderNode(tree, activeDrag.id)?.name || "";
    }
    if (activeDrag.type === "article") {
      return (articles || []).find(row => row.id === activeDrag.id)?.title || copy.untitled;
    }
    return "";
  }, [activeDrag, articles, copy.untitled, tree]);

  const treeContent = (
    <div className={styles.folderList}>
      <div className={styles.navFolderBlock}>
        <IntoDroppable folderId={null} isOverClass={styles.navDropTarget}>
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
              <IconPreview muted />
              <span className={styles.navRowLabel}>{copy.noFolder}</span>
              {rootArticles.length ? <span className={styles.navCount}>{rootArticles.length}</span> : null}
            </button>
          </div>
        </IntoDroppable>
        {rootExpanded && rootArticles.length ? (
          <div className={styles.navChildren}>
            <SortableContext items={rootArticleIds} strategy={verticalListSortingStrategy}>
              {rootArticles.map(article => (
                <SortableArticleNavRow
                  key={article.id}
                  article={article}
                  depth={1}
                  copy={copy}
                  emojiMap={emojiMap}
                  onOpenArticle={onOpenArticle}
                  onChangeIcon={onChangeArticleIcon}
                  canManage={canManage}
                  untitledLabel={copy.untitled}
                  dragEnabled={dragEnabled}
                />
              ))}
            </SortableContext>
          </div>
        ) : null}
      </div>

      <SortableContext items={rootFolderIds} strategy={verticalListSortingStrategy}>
        {(tree || []).map(node => (
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
            onChangeIcon={onChangeIcon}
            onChangeArticleIcon={onChangeArticleIcon}
            onOpenArticle={onOpenArticle}
            canManage={canManage}
            dragEnabled={dragEnabled}
          />
        ))}
      </SortableContext>
    </div>
  );

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
              <button type="button" className={styles.navSectionAdd} onClick={() => onCreate(null)} title={copy.newFolder}>
                <Icon icon="mdi:plus" />
              </button>
            ) : null}
          </div>
        </div>

        {dragEnabled ? (
          <DndContext
            sensors={sensors}
            collisionDetection={kbCollisionDetection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            {treeContent}
            <DragOverlay>
              {overlayLabel ? (
                <div className={styles.navDragOverlay}>
                  <Icon icon="mdi:drag-vertical" />
                  <span>{overlayLabel}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : treeContent}
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
