import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaSearch, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import {
  createClientFileFolder,
  deleteClientFile,
  deleteClientFileFolder,
  fetchClientFileFolders,
  fetchClientFiles,
  getDownloadUrl,
  getPreviewUrl,
  updateClientFile,
  uploadClientFile
} from "../../api/clientFiles";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useVeritasEdition } from "../../hooks/useVeritasEdition";
import { getEnterpriseVaultCopy } from "./enterpriseVaultI18n";
import VaultDocumentPreviewModal from "../shared/VaultDocumentPreviewModal/VaultDocumentPreviewModal";
import pageLayout from "./EnterprisesPage.module.css";
import formStyles from "./EnterpriseFormModal.module.css";
import styles from "./EnterpriseVaultPanel.module.css";
const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const DEFAULT_CATEGORY = "Autre";
export default forwardRef(function EnterpriseVaultPanel({
  clientId,
  clientName,
  copy: copyProp
}, ref) {
  const locale = useAppLocale();
  const {
    isCommunity,
    loaded: editionLoaded
  } = useVeritasEdition();
  const internalCopy = useMemo(() => getEnterpriseVaultCopy(locale), [locale]);
  const copy = copyProp ?? internalCopy;
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [folderPath, setFolderPath] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [previewFile, setPreviewFile] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFile, setEditingFile] = useState(null);
  const currentFolderId = folderPath.length ? folderPath[folderPath.length - 1].id : null;

  const load = useCallback(async () => {
    if (!editionLoaded) {
      setLoading(true);
      return;
    }
    if (isCommunity || !clientId) {
      setFiles([]);
      setFolders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [rows, folderRows] = await Promise.all([
        fetchClientFiles({
          clientId,
          folderId: currentFolderId || "root"
        }),
        fetchClientFileFolders({
          clientId,
          parentId: currentFolderId || null
        }).catch(() => [])
      ]);
      setFiles(Array.isArray(rows) ? rows : []);
      setFolders(Array.isArray(folderRows) ? folderRows : []);
    } catch (err) {
      setFiles([]);
      setFolders([]);
      if (err?.code !== "PRO_FEATURE_REQUIRED") {
        toast.error(copy.toast.loadError);
      }
    } finally {
      setLoading(false);
    }
  }, [clientId, copy.toast.loadError, currentFolderId, editionLoaded, isCommunity]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    setFolderPath([]);
    setSearch("");
    setCategoryFilter("all");
  }, [clientId]);
  useImperativeHandle(ref, () => ({
    openUploadModal: () => setShowUploadModal(true)
  }), []);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return files.filter(file => {
      if (categoryFilter !== "all" && file.category !== categoryFilter) return false;
      if (!q) return true;
      return String(file.file_name || "").toLowerCase().includes(q) || String(file.category || "").toLowerCase().includes(q) || String(file.description || "").toLowerCase().includes(q);
    });
  }, [files, search, categoryFilter]);
  const filteredFolders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return folders;
    return folders.filter(folder => String(folder.name || "").toLowerCase().includes(q));
  }, [folders, search]);
  const sharedCount = useMemo(() => files.filter(file => file.visible_to_client).length, [files]);
  const handleDelete = async file => {
    if (!window.confirm(copy.formatDeleteConfirm(file.file_name))) return;
    try {
      await deleteClientFile(file.id);
      setFiles(prev => prev.filter(row => row.id !== file.id));
      if (previewFile?.id === file.id) setPreviewFile(null);
      if (editingFile?.id === file.id) setEditingFile(null);
      toast.success(copy.toast.removed);
    } catch (err) {
      toast.error(err.message || copy.toast.deleteError);
    }
  };
  const handleDescriptionUpdated = updatedFile => {
    setFiles(prev => prev.map(row => row.id === updatedFile.id ? {
      ...row,
      ...updatedFile
    } : row));
    setPreviewFile(prev => prev?.id === updatedFile.id ? {
      ...prev,
      ...updatedFile
    } : prev);
    setEditingFile(null);
    toast.success(copy.toast.descriptionUpdated);
  };
  const handleShareWithPortal = async file => {
    if (!file?.id || file.visible_to_client) return;
    try {
      const updated = await updateClientFile(file.id, {
        visibleToClient: true
      });
      setFiles(prev => prev.map(row => row.id === updated.id ? {
        ...row,
        ...updated
      } : row));
      setPreviewFile(prev => prev?.id === updated.id ? {
        ...prev,
        ...updated
      } : prev);
      toast.success(copy.toast.sharedOnPortal);
    } catch (err) {
      toast.error(err.message || copy.toast.shareError);
    }
  };
  const openFolder = folder => {
    setFolderPath(prev => [...prev, { id: folder.id, name: folder.name }]);
    setSearch("");
  };
  const goToBreadcrumb = index => {
    if (index < 0) {
      setFolderPath([]);
      return;
    }
    setFolderPath(prev => prev.slice(0, index + 1));
  };
  const handleDeleteFolder = async folder => {
    const confirmMsg = (copy.panel.confirmDeleteFolder || "Delete « {name} »?").replace("{name}", folder.name);
    if (!window.confirm(confirmMsg)) return;
    try {
      await deleteClientFileFolder(folder.id);
      toast.success(copy.panel.folderDeleted || "OK");
      await load();
    } catch (err) {
      toast.error(err.message || copy.panel.folderDeleteError || copy.toast.deleteError);
    }
  };
  const isEmpty = !loading && filteredFolders.length === 0 && filtered.length === 0;
  return <div className={styles.panelRoot}>
      <p className={styles.introText}>
        {copy.panel.intro}
        {copy.formatIntroSharedCount(sharedCount)}
      </p>

      <div className={styles.vaultNavRow}>
        <nav className={styles.breadcrumb} aria-label={copy.panel.rootBreadcrumb || "Vault"}>
          <button type="button" className={`${styles.breadcrumbItem} ${!folderPath.length ? styles.breadcrumbCurrent : ""}`} onClick={() => goToBreadcrumb(-1)}>
            <Icon icon="mdi:safe-square-outline" aria-hidden />
            {copy.panel.rootBreadcrumb || "Coffre-fort"}
          </button>
          {folderPath.map((crumb, index) => (
            <span key={crumb.id} className={styles.breadcrumbSeg}>
              <Icon icon="mdi:chevron-right" className={styles.breadcrumbSep} aria-hidden />
              <button
                type="button"
                className={`${styles.breadcrumbItem} ${index === folderPath.length - 1 ? styles.breadcrumbCurrent : ""}`}
                onClick={() => goToBreadcrumb(index)}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </nav>
        <div className={styles.vaultNavActions}>
          <button type="button" className={styles.navActionBtn} onClick={() => setShowFolderModal(true)} title={copy.panel.newFolder}>
            <Icon icon="mdi:folder-plus-outline" aria-hidden />
            <span>{copy.panel.newFolder}</span>
          </button>
        </div>
      </div>

      <div className={styles.filters}>
        <div className={`${pageLayout.searchWrap} ${styles.searchWrap}`}>
          <FaSearch className={pageLayout.searchIcon} aria-hidden />
          <input className={pageLayout.searchInput} value={search} onChange={e => setSearch(e.target.value)} placeholder={copy.panel.searchPlaceholder} />
          {search ? <button type="button" className={pageLayout.clearButton} onClick={() => setSearch("")} aria-label={copy.panel.clearSearchAria}>
              <FaTimes />
            </button> : null}
        </div>
        <select className={`${pageLayout.sortSelect} ${styles.filterSelect}`} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="all">{copy.panel.allTypes}</option>
          {copy.categoryKeys.map(cat => <option key={cat} value={cat}>
              {copy.getCategoryLabel(cat)}
            </option>)}
        </select>
      </div>

      {loading ? <div className={styles.loadingState}>
          <Icon icon="mdi:loading" className={styles.spinning} aria-hidden />
          {copy.panel.loading}
        </div> : isEmpty ? <div className={styles.empty}>
          <Icon icon={currentFolderId ? "mdi:folder-open-outline" : "mdi:safe-square-outline"} className={styles.emptyIcon} aria-hidden />
          <p>{currentFolderId ? (copy.panel.emptyFolder || copy.panel.empty) : copy.panel.empty}</p>
        </div> : <div className={styles.grid}>
          {filteredFolders.map(folder => (
            <VaultFolderCard
              key={folder.id}
              folder={folder}
              copy={copy}
              onOpen={() => openFolder(folder)}
              onDelete={() => handleDeleteFolder(folder)}
            />
          ))}
          {filtered.map(file => <VaultFileCard key={file.id} file={file} copy={copy} onPreview={() => setPreviewFile(file)} onEditDescription={() => setEditingFile(file)} onShareWithPortal={() => handleShareWithPortal(file)} onDelete={() => handleDelete(file)} />)}
        </div>}

      {showUploadModal ? <VaultUploadModal clientId={clientId} clientName={clientName} folderId={currentFolderId} copy={copy} onClose={() => setShowUploadModal(false)} onUploaded={newFile => {
      setFiles(prev => [newFile, ...prev]);
      setShowUploadModal(false);
      toast.success(newFile?.visible_to_client ? copy.toast.uploadedVisible : copy.toast.uploadedInternal);
    }} /> : null}

      {showFolderModal ? <VaultCreateFolderModal
        copy={copy}
        onClose={() => setShowFolderModal(false)}
        onCreate={async name => {
          const folder = await createClientFileFolder({
            clientId,
            name,
            parentId: currentFolderId
          });
          setFolders(prev => [...prev, folder].sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { sensitivity: "base" })));
          setShowFolderModal(false);
          toast.success(copy.panel.folderCreated || "OK");
        }}
      /> : null}

      {previewFile ? <VaultDocumentPreviewModal file={previewFile} copy={copy} onClose={() => setPreviewFile(null)} previewUrl={getPreviewUrl(previewFile.id)} downloadUrl={getDownloadUrl(previewFile.id)} onEditDescription={() => {
      setEditingFile(previewFile);
      setPreviewFile(null);
    }} showEmptyDescription categoryBadgeClassName={styles.categoryBadge} /> : null}

      {editingFile ? <VaultEditDescriptionModal file={editingFile} copy={copy} onClose={() => setEditingFile(null)} onSaved={handleDescriptionUpdated} /> : null}
    </div>;
});
function VaultFolderCard({ folder, copy, onOpen, onDelete }) {
  const fileCount = Number(folder.fileCount) || 0;
  const childCount = Number(folder.childCount) || 0;
  return <div className={`${styles.card} ${styles.folderCard}`}>
      <button type="button" className={styles.cardThumb} onClick={onOpen} title={copy.panel.openFolder || folder.name}>
        <Icon icon="mdi:folder" className={`${styles.thumbIcon} ${styles.thumbFolder}`} aria-hidden />
      </button>
      <div className={styles.cardBody}>
        <button type="button" className={styles.folderNameBtn} onClick={onOpen} title={folder.name}>
          <p className={styles.cardName}>{folder.name}</p>
        </button>
        <p className={styles.cardDesc}>
          {[
            fileCount ? (copy.panel.filesCount || "{count}").replace("{count}", String(fileCount)) : null,
            childCount ? (copy.panel.subfoldersCount || "{count}").replace("{count}", String(childCount)) : null
          ].filter(Boolean).join(" · ") || "—"}
        </p>
      </div>
      <div className={styles.cardActions}>
        <button type="button" className={styles.actionBtn} onClick={onOpen} title={copy.panel.openFolder}>
          <Icon icon="mdi:folder-open-outline" aria-hidden />
        </button>
        <button type="button" className={`${styles.actionBtn} ${styles.actionDelete}`} onClick={onDelete} title={copy.panel.deleteFolder}>
          <Icon icon="mdi:trash-can-outline" aria-hidden />
        </button>
      </div>
    </div>;
}
function VaultCreateFolderModal({ copy, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async e => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return toast.error(copy.panel.folderNameRequired || "Name required");
    try {
      setSaving(true);
      await onCreate(trimmed);
    } catch (err) {
      toast.error(err.message || copy.panel.folderCreateError || copy.toast.uploadError);
    } finally {
      setSaving(false);
    }
  };
  return createPortal(<div className={formStyles.overlay} onClick={onClose} role="presentation">
      <div className={`${formStyles.shell} ${formStyles.shellMedium}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="vault-folder-modal-title">
        <div className={formStyles.accentBar} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={formStyles.headerIconWrap} aria-hidden>
              <Icon icon="mdi:folder-plus-outline" />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>{copy.uploadModal?.eyebrow || copy.panel.sectionTitle}</p>
              <h2 className={formStyles.title} id="vault-folder-modal-title">{copy.panel.newFolder}</h2>
            </div>
          </div>
          <button type="button" className={formStyles.closeBtn} onClick={onClose} disabled={saving} aria-label={copy.uploadModal?.closeAria || "Close"}>
            <FaTimes />
          </button>
        </header>
        <form className={styles.modalForm} onSubmit={submit}>
          <div className={styles.modalFormBody}>
            <div className={formStyles.field}>
              <label className={formStyles.label} htmlFor="vault-folder-name">{copy.panel.newFolderPlaceholder}</label>
              <input id="vault-folder-name" className={formStyles.input} value={name} onChange={e => setName(e.target.value)} placeholder={copy.panel.newFolderPlaceholder} autoFocus disabled={saving} />
            </div>
          </div>
          <footer className={formStyles.footer}>
            <span className={formStyles.footerHint} />
            <div className={formStyles.footerActions}>
              <button type="button" className={formStyles.ghostBtn} onClick={onClose} disabled={saving}>{copy.uploadModal?.cancel || "Cancel"}</button>
              <button type="submit" className={formStyles.primaryBtn} disabled={saving || !name.trim()}>
                {saving ? (copy.uploadModal?.uploading || "…") : (copy.panel.createFolder || "Create")}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>, document.body);
}
function VaultFileCard({
  file,
  copy,
  onPreview,
  onEditDescription,
  onShareWithPortal,
  onDelete
}) {
  const isImage = IMAGE_MIMES.has(file.mime_type);
  const isPdf = file.mime_type === "application/pdf";
  return <div className={styles.card}>
      <div className={styles.cardThumb} onClick={onPreview} title={copy.card.previewTitle}>
        {isImage ? <img src={getPreviewUrl(file.id)} alt={file.file_name} className={styles.thumbImg} /> : <Icon icon={isPdf ? "mdi:file-pdf-box" : "mdi:file-document-outline"} className={`${styles.thumbIcon} ${isPdf ? styles.thumbPdf : styles.thumbDoc}`} aria-hidden />}
      </div>
      <div className={styles.cardBody}>
        <p className={styles.cardName} title={file.file_name}>
          {file.file_name}
        </p>
        <div className={styles.cardBadgesRow}>
          <span className={styles.categoryBadge}>{copy.getCategoryLabel(file.category)}</span>
          {file.visible_to_client ? <span className={styles.sharedBadge}>
              <Icon icon="mdi:account-eye-outline" aria-hidden />
              {copy.card.visiblePortal}
            </span> : <button type="button" className={`${styles.internalBadge} ${styles.internalBadgeAction}`} onClick={onShareWithPortal} title={copy.card.notSharedTitle}>
              <Icon icon="mdi:account-eye-off-outline" aria-hidden />
              {copy.card.notShared}
            </button>}
        </div>
        {file.description ? <p className={styles.cardDesc}>{file.description}</p> : <p className={styles.cardDescEmpty}>{copy.card.noDescription}</p>}
        <p className={styles.cardDate}>
          {copy.formatDate(file.created_at)} · {copy.formatSize(file.size_bytes)}
        </p>
      </div>
      <div className={styles.cardActions}>
        <a href={getDownloadUrl(file.id)} download={file.file_name} className={styles.actionBtn} title={copy.card.downloadTitle}>
          <Icon icon="mdi:download-outline" aria-hidden />
        </a>
        <button type="button" className={styles.actionBtn} onClick={onEditDescription} title={copy.card.editDescriptionTitle} aria-label={copy.card.editDescriptionAria}>
          <Icon icon="mdi:pencil-outline" aria-hidden />
        </button>
        <button type="button" className={`${styles.actionBtn} ${styles.actionDelete}`} onClick={onDelete} title={copy.card.removeTitle}>
          <Icon icon="mdi:trash-can-outline" aria-hidden />
        </button>
      </div>
    </div>;
}
function VaultUploadModal({
  clientId,
  clientName,
  folderId = null,
  copy,
  onClose,
  onUploaded
}) {
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [visibleToClient, setVisibleToClient] = useState(false);
  const [uploading, setUploading] = useState(false);
  const dropRef = useRef(null);
  const handleDrop = e => {
    e.preventDefault();
    const dropped = e.dataTransfer?.files?.[0];
    if (dropped) setFile(dropped);
  };
  const handleSubmit = async e => {
    e.preventDefault();
    if (!clientId) return toast.error(copy.toast.clientNotFound);
    if (!file) return toast.error(copy.toast.fileRequired);
    try {
      setUploading(true);
      const result = await uploadClientFile({
        clientId,
        clientName,
        category,
        description,
        file,
        visibleToClient,
        folderId
      });
      onUploaded(result);
    } catch (err) {
      toast.error(err.message || copy.toast.uploadError);
    } finally {
      setUploading(false);
    }
  };
  const modal = copy.uploadModal;
  return createPortal(<div className={formStyles.overlay} onClick={onClose} role="presentation">
      <div className={`${formStyles.shell} ${formStyles.shellMedium}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="vault-upload-modal-title">
        <div className={formStyles.accentBar} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={formStyles.headerIconWrap} aria-hidden>
              <Icon icon="mdi:safe-square-outline" />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>{modal.eyebrow}</p>
              <h2 className={formStyles.title} id="vault-upload-modal-title">
                {modal.title}
              </h2>
              <p className={formStyles.subtitle}>{modal.subtitle}</p>
            </div>
          </div>
          <button type="button" className={formStyles.closeBtn} onClick={onClose} disabled={uploading} aria-label={modal.closeAria}>
            <FaTimes />
          </button>
        </header>

        <form className={styles.modalForm} onSubmit={handleSubmit}>
          <div className={styles.modalFormBody}>
            <p className={styles.uploadHint}>{modal.hint}</p>

            <div className={formStyles.field}>
              <label className={formStyles.label} htmlFor="vault-category">
                {modal.categoryLabel}
              </label>
              <select id="vault-category" className={formStyles.input} value={category} onChange={e => setCategory(e.target.value)} disabled={uploading}>
                {copy.categoryKeys.map(cat => <option key={cat} value={cat}>
                    {copy.getCategoryLabel(cat)}
                  </option>)}
              </select>
            </div>

            <div className={formStyles.field}>
              <label className={formStyles.label} htmlFor="vault-description">
                {modal.descriptionLabel}
              </label>
              <input id="vault-description" className={formStyles.input} type="text" placeholder={modal.descriptionPlaceholder} value={description} onChange={e => setDescription(e.target.value)} disabled={uploading} />
            </div>

            <div className={formStyles.field}>
              <span className={`${formStyles.label} ${formStyles.labelRequired}`}>{modal.fileLabel}</span>
              <div ref={dropRef} className={`${styles.dropZone} ${file ? styles.dropZoneActive : ""}`} onDragOver={e => e.preventDefault()} onDrop={handleDrop} onClick={() => document.getElementById("vault-file-input")?.click()}>
                <input id="vault-file-input" type="file" style={{
                display: "none"
              }} onChange={e => setFile(e.target.files?.[0] || null)} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.html,.htm,.zip" disabled={uploading} />
                {file ? <span className={styles.dropZoneFile}>
                    <Icon icon="mdi:file-document-outline" aria-hidden />
                    {file.name} ({copy.formatSize(file.size)})
                  </span> : <span className={styles.dropZoneHint}>
                    <Icon icon="mdi:cloud-upload-outline" aria-hidden />
                    {modal.dropHint}
                    <small>{modal.dropFormats}</small>
                  </span>}
              </div>
            </div>

            <div className={styles.visibilitySwitchRow}>
              <div className={styles.visibilitySwitchCopy}>
                <span className={formStyles.label}>{modal.visiblePortalLabel}</span>
                <p className={styles.visibilitySwitchHint}>{modal.visiblePortalHint}</p>
              </div>
              <button type="button" role="switch" aria-checked={visibleToClient} className={`${styles.visibilitySwitch} ${visibleToClient ? styles.visibilitySwitchOn : ""}`} onClick={() => setVisibleToClient(value => !value)} disabled={uploading}>
                <span className={styles.visibilitySwitchTrack}>
                  <span className={styles.visibilitySwitchThumb} />
                </span>
                <span className={styles.visibilitySwitchState}>
                  {visibleToClient ? modal.visibleOn : modal.visibleOff}
                </span>
              </button>
            </div>
          </div>

          <footer className={formStyles.footer}>
            <span className={formStyles.footerHint}>{modal.footerRequired}</span>
            <div className={formStyles.footerActions}>
              <button type="button" className={formStyles.ghostBtn} onClick={onClose} disabled={uploading}>
                {modal.cancel}
              </button>
              <button type="submit" className={formStyles.primaryBtn} disabled={uploading || !file}>
                {uploading ? <>
                    <Icon icon="mdi:loading" className={formStyles.spinning} aria-hidden />
                    {modal.uploading}
                  </> : <>
                    <Icon icon="mdi:upload-outline" aria-hidden />
                    {modal.upload}
                  </>}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
function VaultEditDescriptionModal({
  file,
  copy,
  onClose,
  onSaved
}) {
  const [description, setDescription] = useState(file?.description || "");
  const [visibleToClient, setVisibleToClient] = useState(Boolean(file?.visible_to_client));
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setDescription(file?.description || "");
    setVisibleToClient(Boolean(file?.visible_to_client));
  }, [file]);
  const handleSubmit = async e => {
    e.preventDefault();
    if (!file?.id) return;
    try {
      setSaving(true);
      const updated = await updateClientFile(file.id, {
        description: description.trim(),
        visibleToClient
      });
      onSaved(updated);
    } catch (err) {
      toast.error(err.message || copy.toast.updateError);
    } finally {
      setSaving(false);
    }
  };
  const modal = copy.editModal;
  return createPortal(<div className={formStyles.overlay} onClick={onClose} role="presentation">
      <div className={`${formStyles.shell} ${formStyles.shellMedium}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="vault-edit-description-title">
        <div className={formStyles.accentBar} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={formStyles.headerIconWrap} aria-hidden>
              <Icon icon="mdi:text-box-edit-outline" />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>{modal.eyebrow}</p>
              <h2 className={formStyles.title} id="vault-edit-description-title">
                {modal.title}
              </h2>
              <p className={formStyles.subtitle}>{file?.file_name}</p>
            </div>
          </div>
          <button type="button" className={formStyles.closeBtn} onClick={onClose} disabled={saving} aria-label={modal.closeAria}>
            <FaTimes />
          </button>
        </header>

        <form className={styles.modalForm} onSubmit={handleSubmit}>
          <div className={styles.modalFormBody}>
            <div className={formStyles.field}>
              <label className={formStyles.label} htmlFor="vault-edit-description">
                {modal.descriptionLabel}
              </label>
              <textarea id="vault-edit-description" className={formStyles.input} rows={4} maxLength={2000} placeholder={modal.descriptionPlaceholder} value={description} onChange={e => setDescription(e.target.value)} disabled={saving} />
            </div>

            <div className={styles.visibilitySwitchRow}>
              <div className={styles.visibilitySwitchCopy}>
                <span className={formStyles.label}>{modal.visiblePortalLabel}</span>
                <p className={styles.visibilitySwitchHint}>{modal.visiblePortalHint}</p>
              </div>
              <button type="button" role="switch" aria-checked={visibleToClient} className={`${styles.visibilitySwitch} ${visibleToClient ? styles.visibilitySwitchOn : ""}`} onClick={() => setVisibleToClient(value => !value)} disabled={saving}>
                <span className={styles.visibilitySwitchTrack}>
                  <span className={styles.visibilitySwitchThumb} />
                </span>
                <span className={styles.visibilitySwitchState}>
                  {visibleToClient ? modal.visibleOn : modal.visibleOff}
                </span>
              </button>
            </div>
          </div>

          <footer className={formStyles.footer}>
            <span className={formStyles.footerHint}>{modal.footerHint}</span>
            <div className={formStyles.footerActions}>
              <button type="button" className={formStyles.ghostBtn} onClick={onClose} disabled={saving}>
                {modal.cancel}
              </button>
              <button type="submit" className={formStyles.primaryBtn} disabled={saving}>
                {saving ? <>
                    <Icon icon="mdi:loading" className={formStyles.spinning} aria-hidden />
                    {modal.saving}
                  </> : <>
                    <Icon icon="mdi:content-save-outline" aria-hidden />
                    {modal.save}
                  </>}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
