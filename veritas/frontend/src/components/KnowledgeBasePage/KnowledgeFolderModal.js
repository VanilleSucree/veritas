import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";
import { Icon } from "@iconify/react";
import { fetchClientsList, fetchContactsList } from "../../api/clients";
import { fetchKnowledgeEmojis, fetchKnowledgeFolder, fetchKnowledgeTagCatalog, resolveKnowledgeEmojiUrl } from "../../api/knowledgeBase";
import { buildEmojiMap } from "./knowledgeEmojiHelpers";
import KnowledgeEmojiModal from "./KnowledgeEmojiModal";
import KnowledgeShareForm from "./KnowledgeShareForm";
import { resolveKnowledgeIcon } from "./knowledgeStandardEmojis";
import formStyles from "../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "./knowledgeBase.module.css";

export default function KnowledgeFolderModal({
  open,
  mode,
  folder,
  parentId,
  copy,
  saving,
  onClose,
  onCreate,
  onRename
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(null);
  const [emojis, setEmojis] = useState([]);
  const [activeSection, setActiveSection] = useState("general");
  const [emojiPickOpen, setEmojiPickOpen] = useState(false);
  const [inheritSharing, setInheritSharing] = useState(true);
  const [visibleToAgents, setVisibleToAgents] = useState(true);
  const [visibleToAllClients, setVisibleToAllClients] = useState(false);
  const [visibleToAllContacts, setVisibleToAllContacts] = useState(false);
  const [clientIds, setClientIds] = useState([]);
  const [contactIds, setContactIds] = useState([]);
  const [clientTagIds, setClientTagIds] = useState([]);
  const [contactTagIds, setContactTagIds] = useState([]);
  const [clientTags, setClientTags] = useState([]);
  const [contactTags, setContactTags] = useState([]);
  const [tagCatalog, setTagCatalog] = useState([]);
  const [tagCatalogLoading, setTagCatalogLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loadingShare, setLoadingShare] = useState(false);
  const [inheritedSharing, setInheritedSharing] = useState(null);

  useEffect(() => {
    if (!open) return;
    setName(folder?.name || "");
    setIcon(folder?.icon || null);
    setInheritedSharing(null);
    setEmojiPickOpen(false);
    setActiveSection(mode === "share" ? "share" : "general");
    fetchKnowledgeEmojis().then(setEmojis).catch(() => setEmojis([]));
    if (mode !== "share" || !folder?.id) return undefined;
    let cancelled = false;
    setLoadingShare(true);
    setTagCatalogLoading(true);
    (async () => {
      try {
        const [loaded, clientRows, contactRows, catalog] = await Promise.all([
          fetchKnowledgeFolder(folder.id),
          fetchClientsList().catch(() => []),
          fetchContactsList().catch(() => []),
          fetchKnowledgeTagCatalog().catch(() => [])
        ]);
        if (cancelled) return;
        const next = loaded.folder || folder;
        setInheritSharing(next.inheritSharing !== false);
        setVisibleToAgents(next.visibleToAgents !== false);
        setVisibleToAllClients(next.visibleToAllClients === true);
        setVisibleToAllContacts(next.visibleToAllContacts === true);
        setClientIds((next.clientIds || []).map(id => Number(id)));
        setContactIds((next.contactIds || []).map(id => Number(id)));
        setClientTagIds((next.clientTagIds || []).map(String));
        setContactTagIds((next.contactTagIds || []).map(String));
        setClientTags(Array.isArray(next.clientTags) ? next.clientTags : []);
        setContactTags(Array.isArray(next.contactTags) ? next.contactTags : []);
        setTagCatalog(Array.isArray(catalog) ? catalog : []);
        setClients(Array.isArray(clientRows) ? clientRows : []);
        setContacts(Array.isArray(contactRows) ? contactRows : []);
        setInheritedSharing(loaded.inheritedSharing || null);
      } finally {
        if (!cancelled) {
          setLoadingShare(false);
          setTagCatalogLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [open, mode, folder]);

  const emojiMap = useMemo(() => buildEmojiMap(emojis), [emojis]);
  const resolvedIcon = resolveKnowledgeIcon(icon, emojiMap);

  const navSections = useMemo(() => {
    if (mode === "share") {
      return [{ id: "share", icon: "mdi:share-variant-outline" }];
    }
    return [
      { id: "general", icon: "mdi:folder-outline" },
      { id: "icon", icon: "mdi:emoticon-outline" }
    ];
  }, [mode]);

  if (!open) return null;

  const title = mode === "share" ? copy.shareFolder : mode === "rename" ? copy.renameFolder : parentId ? copy.newSubfolder : copy.newFolder;
  const subtitle = mode === "share"
    ? (copy.folderShareHint || copy.folderNavShareHint)
    : (copy.folderModalHint || copy.folderNavGeneralHint);

  const sectionMeta = id => {
    if (id === "general") {
      return {
        label: copy.folderNavGeneral || "Général",
        description: copy.folderNavGeneralHint || copy.folderNamePlaceholder
      };
    }
    if (id === "icon") {
      return {
        label: copy.folderNavIcon || copy.emojiFolderIcon,
        description: copy.folderNavIconHint || copy.emojiPickHint
      };
    }
    return {
      label: copy.folderNavShare || copy.shareFolder,
      description: copy.folderNavShareHint || copy.folderShareHint || ""
    };
  };

  const submit = async () => {
    if (mode === "create") {
      await onCreate({ name, parentId, icon: icon || null });
      return;
    }
    if (mode === "rename") {
      await onRename(folder.id, { name, icon: icon || null });
      return;
    }
    await onRename(folder.id, {
      inheritSharing,
      visibleToAgents,
      visibleToAllClients,
      visibleToAllContacts,
      clientIds,
      contactIds,
      clientTagIds,
      contactTagIds
    });
  };

  const canSubmit = mode === "share"
    ? !loadingShare
    : Boolean(String(name || "").trim());

  return createPortal(
    <>
      <div className={formStyles.overlay} onClick={onClose} role="presentation">
        <div
          className={`${formStyles.shell} ${styles.folderModalShell}`}
          onClick={event => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="kb-folder-modal-title"
        >
          <div className={formStyles.accentBar} aria-hidden />
          <header className={formStyles.header}>
            <div className={formStyles.headerMain}>
              <div className={formStyles.headerIconWrap} aria-hidden>
                <Icon icon={mode === "share" ? "mdi:share-variant-outline" : "mdi:folder-plus-outline"} />
              </div>
              <div className={formStyles.headerText}>
                <p className={formStyles.eyebrow}>{copy.eyebrow}</p>
                <h2 className={formStyles.title} id="kb-folder-modal-title">{title}</h2>
                <p className={formStyles.subtitle}>{subtitle}</p>
              </div>
            </div>
            <button type="button" className={formStyles.closeBtn} onClick={onClose} aria-label={copy.modalCancel}>
              <FaTimes />
            </button>
          </header>

          <div className={formStyles.body}>
            <nav className={formStyles.nav} aria-label={title}>
              {navSections.map(section => {
                const meta = sectionMeta(section.id);
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
                  </button>
                );
              })}
            </nav>

            <div className={`${formStyles.content} ${styles.folderModalContent}`}>
              {activeSection === "general" ? (
                <div className={styles.folderModalFields}>
                  <label className={styles.folderModalLabel} htmlFor="kb-folder-name">
                    {copy.folderNameLabel || copy.folderNamePlaceholder}
                  </label>
                  <input
                    id="kb-folder-name"
                    className={styles.search}
                    value={name}
                    onChange={event => setName(event.target.value)}
                    placeholder={copy.folderNamePlaceholder}
                    autoFocus
                  />
                </div>
              ) : null}

              {activeSection === "icon" ? (
                <div className={styles.folderModalFields}>
                  <span className={styles.folderModalLabel}>{copy.emojiFolderIcon}</span>
                  <p className={styles.hint}>{copy.emojiPickHint}</p>
                  <div className={styles.folderIconPreviewRow}>
                    <button
                      type="button"
                      className={`${styles.folderIconChoice} ${styles.folderIconChoiceActive} ${styles.folderIconPreviewBtn}`}
                      onClick={() => setEmojiPickOpen(true)}
                      title={copy.folderIconPick || copy.emojiChangeIcon}
                      aria-label={copy.folderIconPick || copy.emojiChangeIcon}
                    >
                      {resolvedIcon.type === "custom" ? (
                        <img src={resolveKnowledgeEmojiUrl(resolvedIcon.emoji)} alt="" />
                      ) : resolvedIcon.type === "unicode" ? (
                        <span className={styles.navUnicodeIcon} aria-hidden>{resolvedIcon.char}</span>
                      ) : (
                        <Icon icon="mdi:cube-outline" />
                      )}
                    </button>
                    <div className={styles.folderIconPreviewActions}>
                      <button type="button" className={styles.secondaryBtn} onClick={() => setEmojiPickOpen(true)}>
                        <Icon icon="mdi:emoticon-outline" />
                        {copy.folderIconPick || copy.emojiChangeIcon}
                      </button>
                      {icon ? (
                        <button type="button" className={formStyles.ghostBtn} onClick={() => setIcon(null)}>
                          {copy.emojiClearIcon}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

              {activeSection === "share" ? (
                loadingShare ? (
                  <p className={styles.hint}>{copy.loading}</p>
                ) : (
                  <KnowledgeShareForm
                    copy={copy}
                    intro={copy.folderShareHint}
                    inheritedFromText={inheritSharing && inheritedSharing?.folders?.length > 1
                      ? `${copy.inheritedFrom}: ${inheritedSharing.folders.map(item => item.name).join(" → ")}`
                      : null}
                    showInherit={Boolean(folder?.parentId)}
                    inheritSharing={inheritSharing}
                    onInheritSharingChange={setInheritSharing}
                    visibleToAgents={visibleToAgents}
                    onVisibleToAgentsChange={setVisibleToAgents}
                    visibleToAllClients={visibleToAllClients}
                    onVisibleToAllClientsChange={setVisibleToAllClients}
                    visibleToAllContacts={visibleToAllContacts}
                    onVisibleToAllContactsChange={setVisibleToAllContacts}
                    clients={clients}
                    contacts={contacts}
                    clientIds={clientIds}
                    contactIds={contactIds}
                    onClientIdsChange={setClientIds}
                    onContactIdsChange={setContactIds}
                    clientTagIds={clientTagIds}
                    contactTagIds={contactTagIds}
                    onClientTagIdsChange={setClientTagIds}
                    onContactTagIdsChange={setContactTagIds}
                    clientTags={clientTags}
                    contactTags={contactTags}
                    tagCatalog={tagCatalog}
                    tagCatalogLoading={tagCatalogLoading}
                  />
                )
              ) : null}
            </div>
          </div>

          <footer className={formStyles.footer}>
            <span className={formStyles.footerHint} />
            <div className={formStyles.footerActions}>
              <button type="button" className={formStyles.ghostBtn} onClick={onClose} disabled={saving}>
                {copy.modalCancel}
              </button>
              <button
                type="button"
                className={formStyles.primaryBtn}
                onClick={submit}
                disabled={saving || !canSubmit}
              >
                {saving ? copy.saving : copy.save}
              </button>
            </div>
          </footer>
        </div>
      </div>

      <KnowledgeEmojiModal
        open={emojiPickOpen}
        copy={copy}
        canManage
        pickMode
        onClose={() => setEmojiPickOpen(false)}
        onChanged={() => {
          fetchKnowledgeEmojis().then(setEmojis).catch(() => {});
        }}
        onPick={value => {
          setIcon(value || null);
          setEmojiPickOpen(false);
        }}
      />
    </>,
    document.body
  );
}
