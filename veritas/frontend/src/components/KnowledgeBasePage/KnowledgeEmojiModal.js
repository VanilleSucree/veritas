import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import {
  createKnowledgeEmoji,
  deleteKnowledgeEmoji,
  fetchKnowledgeEmojis,
  renameKnowledgeEmoji,
  resolveKnowledgeEmojiUrl
} from "../../api/knowledgeBase";
import { normalizeEmojiName } from "./knowledgeEmojiHelpers";
import styles from "./knowledgeBase.module.css";

export default function KnowledgeEmojiModal({
  open,
  copy,
  canManage,
  pickMode = false,
  onClose,
  onChanged,
  onPick
}) {
  const [emojis, setEmojis] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [file, setFile] = useState(null);
  const [query, setQuery] = useState("");
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      setEmojis(await fetchKnowledgeEmojis());
    } catch (err) {
      setEmojis([]);
      toast.error(err.message || copy.emojiLoadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setName("");
    setFile(null);
    setQuery("");
    setRenamingId(null);
    load();
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return emojis;
    return emojis.filter(row => row.name.includes(q) || `:${row.name}:`.includes(q));
  }, [emojis, query]);

  if (!open) return null;

  const submit = async () => {
    const normalized = normalizeEmojiName(name);
    if (!normalized || normalized.length < 2) {
      toast.error(copy.emojiNameInvalid);
      return;
    }
    if (!file) {
      toast.error(copy.emojiFileRequired);
      return;
    }
    setSaving(true);
    try {
      const emoji = await createKnowledgeEmoji({ name: normalized, file });
      toast.success(copy.emojiCreated);
      setName("");
      setFile(null);
      setEmojis(prev => [...prev, emoji].sort((a, b) => a.name.localeCompare(b.name)));
      onChanged?.(emoji);
      if (pickMode) onPick?.(emoji);
    } catch (err) {
      toast.error(err.message || copy.emojiCreateError);
    } finally {
      setSaving(false);
    }
  };

  const saveRename = async emoji => {
    const normalized = normalizeEmojiName(renameValue);
    if (!normalized || normalized.length < 2) {
      toast.error(copy.emojiNameInvalid);
      return;
    }
    setSaving(true);
    try {
      const next = await renameKnowledgeEmoji(emoji.id, normalized);
      setEmojis(prev => prev.map(row => (row.id === next.id ? next : row)).sort((a, b) => a.name.localeCompare(b.name)));
      setRenamingId(null);
      toast.success(copy.emojiRenamed);
      onChanged?.(next);
    } catch (err) {
      toast.error(err.message || copy.emojiRenameError);
    } finally {
      setSaving(false);
    }
  };

  const remove = async emoji => {
    if (!window.confirm(copy.emojiDeleteConfirm?.replace("{name}", emoji.name) || `Delete :${emoji.name}: ?`)) return;
    setSaving(true);
    try {
      await deleteKnowledgeEmoji(emoji.id);
      setEmojis(prev => prev.filter(row => row.id !== emoji.id));
      toast.success(copy.emojiDeleted);
      onChanged?.(null);
    } catch (err) {
      toast.error(err.message || copy.emojiDeleteError);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`${styles.modalShell} ${styles.modalShellWide}`} onClick={event => event.stopPropagation()}>
        <div className={styles.modalHead}>
          <h2>{pickMode ? copy.emojiPickTitle : copy.emojiManageTitle}</h2>
          <button type="button" className={styles.folderTool} onClick={onClose}><Icon icon="mdi:close" /></button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.hint}>{copy.emojiHint}</p>
          {canManage ? (
            <div className={styles.emojiImportRow}>
              <input
                className={styles.search}
                value={name}
                onChange={event => setName(event.target.value)}
                placeholder={copy.emojiNamePlaceholder}
                aria-label={copy.emojiNamePlaceholder}
              />
              <label className={styles.emojiFileBtn}>
                <Icon icon="mdi:image-plus-outline" />
                <span>{file ? file.name : copy.emojiChooseFile}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                  hidden
                  onChange={event => setFile(event.target.files?.[0] || null)}
                />
              </label>
              <button type="button" className={styles.secondaryBtn} onClick={submit} disabled={saving}>
                {saving ? copy.saving : copy.emojiImport}
              </button>
            </div>
          ) : null}
          <input
            className={styles.search}
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder={copy.emojiSearchPlaceholder}
          />
          {loading ? (
            <p className={styles.hint}>{copy.loading}</p>
          ) : filtered.length === 0 ? (
            <p className={styles.hint}>{copy.emojiEmpty}</p>
          ) : (
            <div className={styles.emojiGrid}>
              {filtered.map(emoji => (
                <div key={emoji.id} className={styles.emojiCard}>
                  <button
                    type="button"
                    className={styles.emojiCardMain}
                    onClick={() => {
                      if (pickMode) {
                        onPick?.(emoji);
                        onClose?.();
                      }
                    }}
                    title={`:${emoji.name}:`}
                  >
                    <img src={resolveKnowledgeEmojiUrl(emoji)} alt={`:${emoji.name}:`} className={styles.emojiPreview} />
                    {renamingId === emoji.id ? (
                      <input
                        className={styles.emojiRenameInput}
                        value={renameValue}
                        onClick={event => event.stopPropagation()}
                        onChange={event => setRenameValue(event.target.value)}
                        onKeyDown={event => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            saveRename(emoji);
                          }
                        }}
                      />
                    ) : (
                      <span className={styles.emojiShortcode}>:{emoji.name}:</span>
                    )}
                  </button>
                  {canManage && !pickMode ? (
                    <div className={styles.emojiCardTools}>
                      {renamingId === emoji.id ? (
                        <button type="button" className={styles.navTool} title={copy.save} onClick={() => saveRename(emoji)}>
                          <Icon icon="mdi:check" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={styles.navTool}
                          title={copy.emojiRename}
                          onClick={() => {
                            setRenamingId(emoji.id);
                            setRenameValue(emoji.name);
                          }}
                        >
                          <Icon icon="mdi:pencil-outline" />
                        </button>
                      )}
                      <button type="button" className={styles.navTool} title={copy.delete} onClick={() => remove(emoji)}>
                        <Icon icon="mdi:trash-can-outline" />
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={styles.modalFooter}>
          <button type="button" className={styles.secondaryBtn} onClick={onClose}>{copy.modalCancel}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
