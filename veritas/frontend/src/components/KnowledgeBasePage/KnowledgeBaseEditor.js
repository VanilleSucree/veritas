import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { resolveKnowledgeAssetUrl, uploadKnowledgeAsset, fetchKnowledgeEmojis, resolveKnowledgeEmojiUrl } from "../../api/knowledgeBase";
import { KNOWLEDGE_EDITOR_NODES, toVideoEmbedSrc, CustomEmoji } from "./knowledgeEditorNodes";
import { buildEmojiMap, normalizeEmojiName } from "./knowledgeEmojiHelpers";
import styles from "./knowledgeBase.module.css";

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };
const MENU_MARGIN = 12;
const MENU_WIDTH = 320;
const MENU_MAX_HEIGHT = 420;

function placeMenuNear(anchor) {
  const width = MENU_WIDTH;
  const height = Math.min(MENU_MAX_HEIGHT, Math.max(160, window.innerHeight - MENU_MARGIN * 2));
  let left = Number(anchor.left) || 0;
  let top = (Number(anchor.bottom) || 0) + 6;
  if (left + width > window.innerWidth - MENU_MARGIN) {
    left = window.innerWidth - width - MENU_MARGIN;
  }
  if (left < MENU_MARGIN) left = MENU_MARGIN;
  if (top + height > window.innerHeight - MENU_MARGIN) {
    const above = (Number(anchor.top) || 0) - height - 6;
    top = above >= MENU_MARGIN ? above : MENU_MARGIN;
  }
  if (top < MENU_MARGIN) top = MENU_MARGIN;
  return { top, left };
}

function slashCommands(copy, localeTag) {
  const s = copy.slash || {};
  return [
    { id: "heading1", group: "headings", label: s.heading1, icon: "mdi:format-header-1", keys: "Ctrl ⇧ 1", run: editor => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { id: "heading2", group: "headings", label: s.heading2, icon: "mdi:format-header-2", keys: "Ctrl ⇧ 2", run: editor => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { id: "heading3", group: "headings", label: s.heading3, icon: "mdi:format-header-3", keys: "Ctrl ⇧ 3", run: editor => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { id: "heading4", group: "headings", label: s.heading4, icon: "mdi:format-header-4", keys: "Ctrl ⇧ 4", run: editor => editor.chain().focus().toggleHeading({ level: 4 }).run() },
    { id: "paragraph", group: "headings", label: s.paragraph, icon: "mdi:format-paragraph", run: editor => editor.chain().focus().setParagraph().run() },
    { id: "todo", group: "lists", label: s.todo, icon: "mdi:checkbox-marked-outline", keys: "Ctrl ⇧ 7", run: editor => editor.chain().focus().toggleTaskList().run() },
    { id: "bullet", group: "lists", label: s.bullet, icon: "mdi:format-list-bulleted", keys: "Ctrl ⇧ 8", run: editor => editor.chain().focus().toggleBulletList().run() },
    { id: "numbered", group: "lists", label: s.numbered, icon: "mdi:format-list-numbered", keys: "Ctrl ⇧ 9", run: editor => editor.chain().focus().toggleOrderedList().run() },
    { id: "image", group: "media", label: s.image, icon: "mdi:image-outline", run: "image" },
    { id: "video", group: "media", label: s.video, icon: "mdi:play-box-outline", run: "video" },
    { id: "pdf", group: "media", label: s.pdf, icon: "mdi:file-pdf-box", run: "pdf" },
    { id: "attachment", group: "media", label: s.attachment, icon: "mdi:paperclip", run: "file" },
    { id: "table", group: "blocks", label: s.table, icon: "mdi:table", run: editor => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    { id: "quote", group: "blocks", label: s.quote, icon: "mdi:format-quote-close", keys: "Ctrl ]", run: editor => editor.chain().focus().toggleBlockquote().run() },
    { id: "code", group: "blocks", label: s.code, icon: "mdi:code-braces", keys: "Ctrl ⇧ C", run: editor => editor.chain().focus().toggleCodeBlock().run() },
    { id: "math", group: "blocks", label: s.math, icon: "mdi:function-variant", run: "math" },
    { id: "toggle", group: "blocks", label: s.toggle, icon: "mdi:chevron-down-box-outline", run: editor => editor.chain().focus().setToggleBlock(s.togglePlaceholder).run() },
    { id: "divider", group: "inserts", label: s.divider, icon: "mdi:minus", keys: "Ctrl _", run: editor => editor.chain().focus().setHorizontalRule().run() },
    { id: "pageBreak", group: "inserts", label: s.pageBreak, icon: "mdi:page-layout-header-footer", run: editor => editor.chain().focus().setPageBreak().run() },
    { id: "date", group: "inserts", label: s.date, icon: "mdi:calendar", run: editor => editor.chain().focus().insertContent(formatStamp(localeTag, "date")).run() },
    { id: "time", group: "inserts", label: s.time, icon: "mdi:clock-outline", run: editor => editor.chain().focus().insertContent(formatStamp(localeTag, "time")).run() },
    { id: "datetime", group: "inserts", label: s.datetime, icon: "mdi:calendar-clock", run: editor => editor.chain().focus().insertContent(formatStamp(localeTag, "datetime")).run() },
    { id: "calloutInfo", group: "notices", label: s.calloutInfo, icon: "mdi:information-outline", run: editor => editor.chain().focus().setCallout("info").run() },
    { id: "calloutSuccess", group: "notices", label: s.calloutSuccess, icon: "mdi:check-circle-outline", run: editor => editor.chain().focus().setCallout("success").run() },
    { id: "calloutWarning", group: "notices", label: s.calloutWarning, icon: "mdi:alert-outline", run: editor => editor.chain().focus().setCallout("warning").run() },
    { id: "calloutDanger", group: "notices", label: s.calloutDanger, icon: "mdi:alert-octagon-outline", run: editor => editor.chain().focus().setCallout("danger").run() },
    { id: "customEmoji", group: "inserts", label: s.customEmoji || "Emoji custom", icon: "mdi:emoticon-outline", run: "emoji" }
  ];
}

function formatStamp(localeTag, kind) {
  const now = new Date();
  if (kind === "date") return now.toLocaleDateString(localeTag, { dateStyle: "long" });
  if (kind === "time") return now.toLocaleTimeString(localeTag, { timeStyle: "short" });
  return now.toLocaleString(localeTag, { dateStyle: "medium", timeStyle: "short" });
}

function getSlashQuery(editor) {
  if (!editor) return null;
  const { $from } = editor.state.selection;
  const text = $from.parent.textBetween(0, $from.parentOffset, undefined, "\ufffc");
  const match = text.match(/(?:^|\s)\/([^\s]*)$/);
  if (!match) return null;
  return match[1] || "";
}

function deleteSlashToken(editor) {
  const { state } = editor;
  const { $from } = state.selection;
  const text = $from.parent.textBetween(0, $from.parentOffset, undefined, "\ufffc");
  const match = text.match(/(?:^|\s)(\/[^\s]*)$/);
  if (!match) return;
  const from = $from.pos - match[1].length;
  editor.chain().focus().deleteRange({ from, to: $from.pos }).run();
}

function emptyParagraphCoords(editor) {
  if (!editor) return null;
  const { $from } = editor.state.selection;
  if ($from.parent.type.name !== "paragraph" || $from.parent.content.size !== 0) return null;
  try {
    return editor.view.coordsAtPos($from.pos);
  } catch {
    return null;
  }
}

function getEmojiQuery(editor) {
  if (!editor) return null;
  const { $from } = editor.state.selection;
  const text = $from.parent.textBetween(0, $from.parentOffset, undefined, "\ufffc");
  const match = text.match(/(?:^|\s):([a-z0-9_-]*)$/i);
  if (!match) return null;
  return match[1] || "";
}

function deleteEmojiToken(editor) {
  const { state } = editor;
  const { $from } = state.selection;
  const text = $from.parent.textBetween(0, $from.parentOffset, undefined, "\ufffc");
  const match = text.match(/(?:^|\s)(:[a-z0-9_-]*)$/i);
  if (!match) return;
  const from = $from.pos - match[1].length;
  editor.chain().focus().deleteRange({ from, to: $from.pos }).run();
}

export default function KnowledgeBaseEditor({
  articleId,
  contentJson,
  editable,
  copy,
  locale = "fr",
  emojis: emojisProp,
  onChange,
  onManageEmojis
}) {
  const fileRef = useRef(null);
  const areaRef = useRef(null);
  const menuRef = useRef(null);
  const emojiMenuRef = useRef(null);
  const chromeRef = useRef(() => {});
  const emojiMapRef = useRef(new Map());
  const [slash, setSlash] = useState(null);
  const [slashIndex, setSlashIndex] = useState(0);
  const [emojiMenu, setEmojiMenu] = useState(null);
  const [emojiIndex, setEmojiIndex] = useState(0);
  const [plus, setPlus] = useState(null);
  const [fileKind, setFileKind] = useState("image");
  const [ask, setAsk] = useState(null);
  const [bubble, setBubble] = useState(null);
  const [emojisLocal, setEmojisLocal] = useState([]);
  const localeTag = locale === "en" ? "en-GB" : locale === "de" ? "de-DE" : locale === "it" ? "it-IT" : locale === "es" ? "es-ES" : "fr-FR";
  const commands = useMemo(() => slashCommands(copy, localeTag), [copy, localeTag]);
  const emojis = emojisProp || emojisLocal;
  const emojiMap = useMemo(() => buildEmojiMap(emojis), [emojis]);
  emojiMapRef.current = emojiMap;

  useEffect(() => {
    if (emojisProp) return undefined;
    let cancelled = false;
    fetchKnowledgeEmojis()
      .then(rows => {
        if (!cancelled) setEmojisLocal(rows);
      })
      .catch(() => {
        if (!cancelled) setEmojisLocal([]);
      });
    return () => { cancelled = true; };
  }, [emojisProp]);

  const filtered = useMemo(() => {
    const q = String(slash?.query || "").toLowerCase().trim();
    return commands.filter(item => item.label && (!q || item.label.toLowerCase().includes(q) || item.id.toLowerCase().includes(q)));
  }, [commands, slash]);

  const filteredEmojis = useMemo(() => {
    const q = normalizeEmojiName(emojiMenu?.query || "");
    const list = [...emojiMap.values()];
    if (!q) return list.slice(0, 40);
    return list.filter(row => row.name.includes(q)).slice(0, 40);
  }, [emojiMap, emojiMenu]);

  const editorExtensions = useMemo(() => [
    StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
    Placeholder.configure({
      placeholder: copy.editorPlaceholder,
      showOnlyWhenEditable: true,
      showOnlyCurrent: true
    }),
    Underline,
    Highlight,
    Link.configure({ openOnClick: false, autolink: true }),
    Image.configure({ inline: false, allowBase64: false }),
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    TaskList,
    TaskItem.configure({ nested: true }),
    ...KNOWLEDGE_EDITOR_NODES.filter(ext => ext.name !== "customEmoji"),
    CustomEmoji.configure({
      getEmoji: name => emojiMapRef.current.get(normalizeEmojiName(name))
    })
  ], [copy.editorPlaceholder]);

  const editor = useEditor({
    editable,
    extensions: editorExtensions,
    content: contentJson && typeof contentJson === "object" ? contentJson : EMPTY_DOC,
    onUpdate: ({ editor: current }) => {
      onChange?.({
        json: current.getJSON(),
        html: current.getHTML()
      });
      chromeRef.current(current);
    },
    onSelectionUpdate: ({ editor: current }) => {
      chromeRef.current(current);
    }
  }, [articleId, editorExtensions]);

  const syncChrome = useCallback(current => {
    if (!editable) {
      setSlash(null);
      setPlus(null);
      setBubble(null);
      return;
    }
    const { from, to, empty } = current.state.selection;
    if (!empty) {
      try {
        const start = current.view.coordsAtPos(from);
        const end = current.view.coordsAtPos(to);
        setBubble({
          top: Math.max(8, start.top - 44),
          left: (start.left + end.left) / 2
        });
      } catch {
        setBubble(null);
      }
    } else {
      setBubble(null);
    }
    const query = getSlashQuery(current);
    if (query != null) {
      const coords = current.view.coordsAtPos(current.state.selection.from);
      setSlash({
        query,
        fromPlus: false,
        ...placeMenuNear({
          left: coords.left,
          top: coords.top,
          bottom: coords.bottom
        })
      });
      setSlashIndex(0);
      setPlus(null);
      setEmojiMenu(null);
      return;
    }
    setSlash(prev => (prev && !prev.fromPlus ? null : prev));

    const emojiQuery = getEmojiQuery(current);
    if (emojiQuery != null) {
      const coords = current.view.coordsAtPos(current.state.selection.from);
      setEmojiMenu({
        query: emojiQuery,
        ...placeMenuNear({
          left: coords.left,
          top: coords.top,
          bottom: coords.bottom
        })
      });
      setEmojiIndex(0);
      setPlus(null);
      return;
    }
    setEmojiMenu(null);

    const coords = emptyParagraphCoords(current);
    if (!coords || !areaRef.current) {
      setPlus(null);
      return;
    }
    setPlus({
      top: coords.top,
      left: Math.max(8, coords.left - 32)
    });
  }, [editable]);

  chromeRef.current = syncChrome;

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(Boolean(editable));
  }, [editor, editable]);

  useEffect(() => {
    if (!editor || !contentJson) return;
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(contentJson);
    if (current !== next) editor.commands.setContent(contentJson, false);
  }, [editor, articleId]);

  const pickFile = useCallback(kind => {
    setFileKind(kind);
    window.setTimeout(() => fileRef.current?.click(), 0);
  }, []);

  const openAsk = useCallback(kind => {
    setAsk({ kind, value: "" });
  }, []);

  const insertEmoji = useCallback(emoji => {
    if (!editor || !emoji) return;
    const src = resolveKnowledgeEmojiUrl(emoji);
    if (!src) return;
    if (emojiMenu) deleteEmojiToken(editor);
    setEmojiMenu(null);
    editor.chain().focus().insertCustomEmoji({ name: emoji.name, src }).run();
  }, [editor, emojiMenu]);

  const applyCommand = useCallback(async item => {
    if (!editor || !item) return;
    if (slash && !slash.fromPlus) deleteSlashToken(editor);
    setSlash(null);
    if (item.run === "image") {
      pickFile("image");
      return;
    }
    if (item.run === "pdf") {
      pickFile("pdf");
      return;
    }
    if (item.run === "file") {
      pickFile("file");
      return;
    }
    if (item.run === "video") {
      openAsk("video");
      return;
    }
    if (item.run === "math") {
      openAsk("math");
      return;
    }
    if (item.run === "emoji") {
      if (onManageEmojis) onManageEmojis({ pick: true });
      else if (filteredEmojis[0]) insertEmoji(filteredEmojis[0]);
      return;
    }
    item.run(editor);
  }, [editor, slash, pickFile, openAsk, onManageEmojis, filteredEmojis, insertEmoji]);

  const submitAsk = useCallback(event => {
    event?.preventDefault?.();
    if (!editor || !ask) return;
    const value = String(ask.value || "").trim();
    setAsk(null);
    if (!value) return;
    if (ask.kind === "video") {
      const src = toVideoEmbedSrc(value);
      if (src) editor.chain().focus().setVideoEmbed({ src, provider: "embed" }).run();
      else toast.error(copy.slash.videoPrompt);
      return;
    }
    if (ask.kind === "math") {
      editor.chain().focus().setMathBlock(value).run();
      return;
    }
    if (ask.kind === "link") {
      if (value) editor.chain().focus().extendMarkRange("link").setLink({ href: value }).run();
      else editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
  }, [ask, editor, copy.slash]);

  const onFile = useCallback(async event => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !articleId || !editor) return;
    try {
      const asset = await uploadKnowledgeAsset(articleId, file);
      if (!asset?.url) return;
      const src = resolveKnowledgeAssetUrl(asset.url);
      if (fileKind === "image" || file.type.startsWith("image/")) {
        editor.chain().focus().setImage({ src, alt: file.name }).run();
        return;
      }
      if (fileKind === "pdf" || file.type === "application/pdf") {
        editor.chain().focus().setPdfEmbed({ src, title: file.name }).run();
        return;
      }
      if (file.type.startsWith("video/")) {
        editor.chain().focus().setVideoEmbed({ src, provider: "file" }).run();
        return;
      }
      editor.chain().focus().setAttachment({ href: src, name: file.name, mime: file.type }).run();
    } catch (err) {
      toast.error(err.message || copy.saveError);
    }
  }, [articleId, editor, fileKind, copy.saveError]);

  const openPlusMenu = useCallback(event => {
    if (!editor) return;
    event?.preventDefault?.();
    event?.stopPropagation?.();
    editor.chain().focus().run();
    const rect = event?.currentTarget?.getBoundingClientRect?.();
    const anchor = rect
      ? { left: rect.left, top: rect.top, bottom: rect.bottom }
      : {
          left: plus?.left ?? MENU_MARGIN,
          top: plus?.top ?? MENU_MARGIN,
          bottom: (plus?.top ?? MENU_MARGIN) + 24
        };
    setSlash({
      query: "",
      fromPlus: true,
      ...placeMenuNear(anchor)
    });
    setSlashIndex(0);
  }, [plus, editor]);

  useEffect(() => {
    if (!emojiMenu) return undefined;
    const onKey = event => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setEmojiIndex(index => (index + 1) % Math.max(filteredEmojis.length, 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setEmojiIndex(index => (index - 1 + Math.max(filteredEmojis.length, 1)) % Math.max(filteredEmojis.length, 1));
      } else if (event.key === "Enter") {
        if (!filteredEmojis[emojiIndex]) return;
        event.preventDefault();
        insertEmoji(filteredEmojis[emojiIndex]);
      } else if (event.key === "Escape") {
        setEmojiMenu(null);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [emojiMenu, filteredEmojis, emojiIndex, insertEmoji]);

  useEffect(() => {
    if (!slash) return undefined;
    const onKey = event => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSlashIndex(index => (index + 1) % Math.max(filtered.length, 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSlashIndex(index => (index - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1));
      } else if (event.key === "Enter") {
        if (!filtered[slashIndex]) return;
        event.preventDefault();
        applyCommand(filtered[slashIndex]);
      } else if (event.key === "Escape") {
        setSlash(null);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [slash, filtered, slashIndex, applyCommand]);

  useEffect(() => {
    if (!slash?.fromPlus) return undefined;
    const onPointer = event => {
      if (menuRef.current?.contains(event.target)) return;
      if (event.target.closest?.("[data-kb-plus]")) return;
      setSlash(null);
    };
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, [slash]);

  useLayoutEffect(() => {
    if (!slash || !menuRef.current) return;
    const el = menuRef.current;
    const rect = el.getBoundingClientRect();
    let { top, left } = slash;
    if (rect.right > window.innerWidth - MENU_MARGIN) {
      left = Math.max(MENU_MARGIN, window.innerWidth - rect.width - MENU_MARGIN);
    }
    if (rect.bottom > window.innerHeight - MENU_MARGIN) {
      top = Math.max(MENU_MARGIN, window.innerHeight - rect.height - MENU_MARGIN);
    }
    if (rect.left < MENU_MARGIN) left = MENU_MARGIN;
    if (rect.top < MENU_MARGIN) top = MENU_MARGIN;
    if (Math.abs(top - slash.top) > 1 || Math.abs(left - slash.left) > 1) {
      setSlash(current => (current ? { ...current, top, left } : current));
    }
  }, [slash]);

  useEffect(() => {
    const el = areaRef.current;
    if (!el || !editor) return undefined;
    const onScroll = () => {
      setSlash(current => (current?.fromPlus ? null : current));
      chromeRef.current(editor);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [editor]);

  if (!editor) return null;

  const tool = (isActive, icon, action, label, extra = {}) => (
    <button type="button" className={`${styles.toolBtn} ${isActive ? styles.toolBtnActive : ""}`} onClick={action} disabled={!editable} title={label} {...extra}>
      <Icon icon={icon} />
    </button>
  );

  const accept = fileKind === "pdf"
    ? "application/pdf"
    : fileKind === "file"
      ? "*/*"
      : fileKind === "video"
        ? "video/*"
        : "image/*";

  if (!editor) return null;

  return (
    <div className={styles.editorBody}>
      <div className={styles.editorBar}>
        {tool(editor.isActive("bold"), "mdi:format-bold", () => editor.chain().focus().toggleBold().run(), "Bold")}
        {tool(editor.isActive("italic"), "mdi:format-italic", () => editor.chain().focus().toggleItalic().run(), "Italic")}
        {tool(editor.isActive("underline"), "mdi:format-underline", () => editor.chain().focus().toggleUnderline().run(), "Underline")}
        {tool(editor.isActive("highlight"), "mdi:format-color-highlight", () => editor.chain().focus().toggleHighlight().run(), "Highlight")}
        {tool(editor.isActive("link"), "mdi:link-variant", () => setAsk({ kind: "link", value: editor.getAttributes("link").href || "" }), copy.insertLink)}
        {tool(editor.isActive("bulletList"), "mdi:format-list-bulleted", () => editor.chain().focus().toggleBulletList().run(), copy.slash.bullet)}
        {tool(editor.isActive("orderedList"), "mdi:format-list-numbered", () => editor.chain().focus().toggleOrderedList().run(), copy.slash.numbered)}
        {tool(editor.isActive("taskList"), "mdi:checkbox-marked-outline", () => editor.chain().focus().toggleTaskList().run(), copy.slash.todo)}
        {tool(false, "mdi:plus", openPlusMenu, copy.insertBlock, { "data-kb-plus": true })}
        {tool(false, "mdi:image-outline", () => pickFile("image"), copy.insertImage)}
        {tool(false, "mdi:undo", () => editor.chain().focus().undo().run(), "Undo")}
        {tool(false, "mdi:redo", () => editor.chain().focus().redo().run(), "Redo")}
      </div>
      {editable ? <p className={styles.slashHint}>{copy.slashHint}</p> : null}
      <div className={styles.editorArea} ref={areaRef}>
        <EditorContent editor={editor} />
      </div>
      <input ref={fileRef} className={styles.hiddenFile} type="file" accept={accept} onChange={onFile} />
      {editable && plus && !slash && !emojiMenu ? (
        <button type="button" data-kb-plus className={styles.blockPlus} style={{ top: plus.top, left: plus.left }} onClick={openPlusMenu} title={copy.insertBlock} aria-label={copy.insertBlock}>
          <Icon icon="mdi:plus" />
        </button>
      ) : null}
      {slash && filtered.length > 0 ? createPortal(
        <div ref={menuRef} className={styles.slashMenu} style={{ top: slash.top, left: slash.left }} role="listbox">
          {filtered.map((item, index) => {
            const showSep = index > 0 && filtered[index - 1].group !== item.group;
            return (
              <div key={item.id}>
                {showSep ? <div className={styles.slashSep} /> : null}
                <button
                  type="button"
                  className={`${styles.slashItem} ${index === slashIndex ? styles.slashItemActive : ""}`}
                  onMouseDown={event => {
                    event.preventDefault();
                    applyCommand(item);
                  }}
                >
                  <span className={styles.slashIcon}><Icon icon={item.icon} /></span>
                  <span className={styles.slashLabel}>{item.label}</span>
                  {item.keys ? <span className={styles.slashKeys}>{item.keys}</span> : null}
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      ) : null}
      {emojiMenu && filteredEmojis.length > 0 ? createPortal(
        <div ref={emojiMenuRef} className={styles.slashMenu} style={{ top: emojiMenu.top, left: emojiMenu.left }} role="listbox">
          {filteredEmojis.map((emoji, index) => (
            <button
              key={emoji.id}
              type="button"
              className={`${styles.slashItem} ${index === emojiIndex ? styles.slashItemActive : ""}`}
              onMouseDown={event => {
                event.preventDefault();
                insertEmoji(emoji);
              }}
            >
              <img src={resolveKnowledgeEmojiUrl(emoji)} alt="" className={styles.emojiMenuThumb} />
              <span className={styles.slashLabel}>:{emoji.name}:</span>
            </button>
          ))}
          {onManageEmojis ? (
            <button
              type="button"
              className={styles.slashItem}
              onMouseDown={event => {
                event.preventDefault();
                setEmojiMenu(null);
                onManageEmojis({ pick: true });
              }}
            >
              <span className={styles.slashIcon}><Icon icon="mdi:plus" /></span>
              <span className={styles.slashLabel}>{copy.emojiImport || copy.emojiManageTitle}</span>
            </button>
          ) : null}
        </div>,
        document.body
      ) : null}
      {editable && bubble && !slash && !emojiMenu ? createPortal(
        <div className={styles.bubbleMenu} style={{ top: bubble.top, left: bubble.left }} role="toolbar">
          {tool(editor.isActive("bold"), "mdi:format-bold", () => editor.chain().focus().toggleBold().run(), "Bold")}
          {tool(editor.isActive("italic"), "mdi:format-italic", () => editor.chain().focus().toggleItalic().run(), "Italic")}
          {tool(editor.isActive("heading", { level: 2 }), "mdi:format-header-2", () => editor.chain().focus().toggleHeading({ level: 2 }).run(), copy.slash.heading2)}
          {tool(editor.isActive("link"), "mdi:link-variant", () => setAsk({ kind: "link", value: editor.getAttributes("link").href || "" }), copy.insertLink)}
          {editor.isActive("link") ? tool(false, "mdi:link-off", () => editor.chain().focus().unsetLink().run(), copy.unlink) : null}
        </div>,
        document.body
      ) : null}
      {ask ? (
        <form className={styles.embedPrompt} onSubmit={submitAsk}>
          <div className={styles.embedPromptTitle}>
            {ask.kind === "math" ? copy.slash.mathPrompt : ask.kind === "link" ? copy.linkPrompt : copy.slash.videoPrompt}
          </div>
          <input
            className={styles.search}
            value={ask.value}
            onChange={event => setAsk(current => ({ ...current, value: event.target.value }))}
            placeholder={ask.kind === "math" ? "E = mc^2" : "https://"}
            autoFocus
          />
          <div className={styles.embedPromptActions}>
            {ask.kind === "video" ? (
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => {
                  setAsk(null);
                  pickFile("video");
                }}
              >
                {copy.slash.videoFile}
              </button>
            ) : null}
            <button type="button" className={styles.secondaryBtn} onClick={() => setAsk(null)}>{copy.modalCancel}</button>
            <button type="submit" className={styles.secondaryBtn}>{copy.save}</button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
