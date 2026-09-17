import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";
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
import { STANDARD_EMOJI_SECTIONS } from "./knowledgeStandardEmojis";
import formStyles from "../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "./knowledgeBase.module.css";

const SECTION_META = {
  custom: { icon: "mdi:star-outline" },
  import: { icon: "mdi:image-plus-outline" },
  smileys: { icon: "mdi:emoticon-outline" },
  gestures: { icon: "mdi:hand-wave-outline" },
  people: { icon: "mdi:account-group-outline" },
  animals: { icon: "mdi:paw" },
  nature: { icon: "mdi:flower-outline" },
  food: { icon: "mdi:food-apple-outline" },
  travel: { icon: "mdi:airplane" },
  activities: { icon: "mdi:soccer" },
  objects: { icon: "mdi:lightbulb-outline" },
  symbols: { icon: "mdi:heart-outline" },
  flags: { icon: "mdi:flag-outline" }
};

function sectionCopy(copy, id) {
  return copy.emojiSections?.[id] || {
    label: id,
    description: ""
  };
}

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
  const [activeSection, setActiveSection] = useState(pickMode ? "smileys" : "custom");

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
    setActiveSection(pickMode ? "smileys" : "custom");
    load();
  }, [open, pickMode]);

  const navSections = useMemo(() => {
    const standard = STANDARD_EMOJI_SECTIONS.map(section => ({
      id: section.id,
      icon: SECTION_META[section.id]?.icon || section.icon,
      count: section.emojis.length
    }));
    const list = [
      { id: "custom", icon: SECTION_META.custom.icon, count: emojis.length },
      ...standard
    ];
    if (canManage) list.push({ id: "import", icon: SECTION_META.import.icon, count: 0 });
    return list;
  }, [emojis.length, canManage]);

  const filteredCustom = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return emojis;
    return emojis.filter(row => row.name.includes(q) || `:${row.name}:`.includes(q));
  }, [emojis, query]);

  const filteredStandard = useMemo(() => {
    const section = STANDARD_EMOJI_SECTIONS.find(row => row.id === activeSection);
    const list = section?.emojis || [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(char => char.includes(q) || String(char.codePointAt(0)).includes(q));
  }, [activeSection, query]);

  const searchAcrossAll = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 1) return null;
    const customHits = emojis.filter(row => row.name.includes(q) || `:${row.name}:`.includes(q));
    const unicodeHits = [];
    for (const section of STANDARD_EMOJI_SECTIONS) {
      for (const char of section.emojis) {
        if (char.includes(q)) unicodeHits.push(char);
      }
    }
    return { customHits, unicodeHits: unicodeHits.slice(0, 120) };
  }, [query, emojis]);

  if (!open) return null;

  const pickValue = value => {
    onPick?.(value);
    if (pickMode) onClose?.();
  };

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
      setActiveSection("custom");
      if (pickMode) pickValue(emoji.name);
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

  const title = pickMode ? copy.emojiPickTitle : copy.emojiManageTitle;
  const subtitle = pickMode ? (copy.emojiPickHint || copy.emojiHint) : copy.emojiHint;
  const showGlobalSearch = Boolean(query.trim()) && activeSection !== "import";

  return createPortal(
    <div className={formStyles.overlay} onClick={onClose} role="presentation">
      <div
        className={`${formStyles.shell} ${styles.emojiModalShell}`}
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="kb-emoji-modal-title"
      >
        <div className={formStyles.accentBar} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={formStyles.headerIconWrap} aria-hidden>
              <Icon icon="mdi:emoticon-outline" />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>{copy.eyebrow}</p>
              <h2 className={formStyles.title} id="kb-emoji-modal-title">{title}</h2>
              <p className={formStyles.subtitle}>{subtitle}</p>
            </div>
          </div>
          <button type="button" className={formStyles.closeBtn} onClick={onClose} aria-label={copy.modalCancel}>
            <FaTimes />
          </button>
        </header>

        <div className={formStyles.body}>
          <nav className={formStyles.nav} aria-label={copy.emojiNavAria || title}>
            {navSections.map(section => {
              const meta = sectionCopy(copy, section.id);
              return (
                <button
                  key={section.id}
                  type="button"
                  className={`${formStyles.navItem} ${activeSection === section.id ? formStyles.navItemActive : ""}`}
                  onClick={() => setActiveSection(section.id)}
                  aria-current={activeSection === section.id ? "step" : undefined}
                >
                  <Icon icon={section.icon} className={formStyles.navItemIcon} aria-hidden />
                  <span className={formStyles.navItemText}>
                    <span className={formStyles.navItemLabel}>{meta.label}</span>
                    <span className={formStyles.navItemHint}>{meta.description}</span>
                  </span>
                  {section.count > 0 ? <span className={formStyles.navBadge}>{section.count}</span> : null}
                </button>
              );
            })}
          </nav>

          <div className={`${formStyles.content} ${styles.emojiModalContent}`}>
            {activeSection !== "import" ? (
              <input
                className={styles.search}
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder={copy.emojiSearchPlaceholder}
                aria-label={copy.emojiSearchPlaceholder}
              />
            ) : null}

            {activeSection === "import" ? (
              <div className={styles.emojiImportPanel}>
                <p className={styles.hint}>{copy.emojiImportHint || copy.emojiHint}</p>
                <div className={styles.emojiImportStack}>
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
                  <button type="button" className={formStyles.primaryBtn} onClick={submit} disabled={saving}>
                    {saving ? copy.saving : copy.emojiImport}
                  </button>
                </div>
              </div>
            ) : loading ? (
              <p className={styles.hint}>{copy.loading}</p>
            ) : showGlobalSearch ? (
              <div className={styles.emojiSearchResults}>
                <h3 className={styles.emojiGroupTitle}>{sectionCopy(copy, "custom").label}</h3>
                {searchAcrossAll.customHits.length === 0 ? (
                  <p className={styles.hint}>{copy.emojiEmpty}</p>
                ) : (
                  <div className={styles.emojiPickGrid}>
                    {searchAcrossAll.customHits.map(emoji => (
                      <button
                        key={emoji.id}
                        type="button"
                        className={styles.emojiPickCell}
                        title={`:${emoji.name}:`}
                        onClick={() => pickValue(emoji.name)}
                      >
                        <img src={resolveKnowledgeEmojiUrl(emoji)} alt={`:${emoji.name}:`} />
                        <span>:{emoji.name}:</span>
                      </button>
                    ))}
                  </div>
                )}
                <h3 className={styles.emojiGroupTitle}>{copy.emojiStandardGroup || "Standard"}</h3>
                {searchAcrossAll.unicodeHits.length === 0 ? (
                  <p className={styles.hint}>{copy.emojiEmpty}</p>
                ) : (
                  <div className={styles.emojiUnicodeGrid}>
                    {searchAcrossAll.unicodeHits.map(char => (
                      <button
                        key={char}
                        type="button"
                        className={styles.emojiUnicodeCell}
                        onClick={() => pickValue(char)}
                        title={char}
                      >
                        {char}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : activeSection === "custom" ? (
              filteredCustom.length === 0 ? (
                <p className={styles.hint}>{copy.emojiEmpty}</p>
              ) : (
                <div className={styles.emojiGrid}>
                  {filteredCustom.map(emoji => (
                    <div key={emoji.id} className={styles.emojiCard}>
                      <button
                        type="button"
                        className={styles.emojiCardMain}
                        onClick={() => {
                          if (pickMode) pickValue(emoji.name);
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
              )
            ) : (
              <div className={styles.emojiUnicodeGrid}>
                {filteredStandard.map(char => (
                  <button
                    key={char}
                    type="button"
                    className={styles.emojiUnicodeCell}
                    onClick={() => pickValue(char)}
                    title={char}
                    disabled={!pickMode && !canManage}
                  >
                    {char}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <footer className={formStyles.footer}>
          <span className={formStyles.footerHint}>
            {pickMode ? (copy.emojiPickFooter || "") : (copy.emojiManageFooter || "")}
          </span>
          <div className={formStyles.footerActions}>
            {pickMode ? (
              <button type="button" className={formStyles.ghostBtn} onClick={() => pickValue(null)}>
                {copy.emojiClearIcon}
              </button>
            ) : null}
            <button type="button" className={formStyles.ghostBtn} onClick={onClose}>
              {copy.modalCancel}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
}
