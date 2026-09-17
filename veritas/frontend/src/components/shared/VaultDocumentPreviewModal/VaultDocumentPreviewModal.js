import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { useTheme } from "../../../hooks/useTheme";
import formStyles from "../../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "./VaultDocumentPreviewModal.module.css";
const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const FALLBACK_COPY = {
  previewModal: {
    download: "Download",
    closeAria: "Close",
    unsupported: "Preview not available for this file type.",
    noDescription: "No description",
    editDescriptionTitle: "Edit description",
    editDescriptionAria: "Edit description"
  },
  getCategoryLabel: category => category,
  formatDate: value => {
    if (!value) return "-";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("en-US");
  },
  formatSize: bytes => {
    const value = Number(bytes) || 0;
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }
};
export default function VaultDocumentPreviewModal({
  file,
  copy = null,
  onClose,
  previewUrl,
  downloadUrl,
  footerLeading = null,
  onEditDescription = null,
  showEmptyDescription = false,
  categoryBadgeClassName = ""
}) {
  const {
    theme
  } = useTheme();
  const labels = copy?.previewModal ?? FALLBACK_COPY.previewModal;
  const getCategoryLabel = copy?.getCategoryLabel ?? FALLBACK_COPY.getCategoryLabel;
  const formatDate = copy?.formatDate ?? FALLBACK_COPY.formatDate;
  const formatSize = copy?.formatSize ?? FALLBACK_COPY.formatSize;
  if (!file) return null;
  const isImage = IMAGE_MIMES.has(file.mime_type);
  const isPdf = file.mime_type === "application/pdf";
  const hasMediaPreview = isImage || isPdf;
  const isDarkTheme = theme === "dark";
  const badgeClass = [styles.categoryBadge, categoryBadgeClassName].filter(Boolean).join(" ");
  const previewBodyClass = [styles.previewBody, hasMediaPreview ? styles.previewBodyMedia : "", isDarkTheme ? styles.previewBodyDark : styles.previewBodyLight].filter(Boolean).join(" ");
  return createPortal(<div className={`${formStyles.overlay} ${styles.overlay}`} onClick={onClose} role="presentation">
      <div className={styles.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="vault-preview-title">
        <div className={formStyles.accentBar} aria-hidden />
        <header className={styles.header}>
          <span id="vault-preview-title" className={styles.title}>
            {file.file_name}
          </span>
          <div className={styles.headerActions}>
            <a href={downloadUrl} download={file.file_name} className={styles.downloadLink}>
              <Icon icon="mdi:download-outline" aria-hidden /> {labels.download}
            </a>
            <button type="button" className={formStyles.closeBtn} onClick={onClose} aria-label={labels.closeAria}>
              <FaTimes />
            </button>
          </div>
        </header>

        <div className={previewBodyClass}>
          {isImage ? <img src={previewUrl} alt={file.file_name} className={styles.previewImage} /> : null}
          {isPdf ? <iframe src={previewUrl} title={file.file_name} className={styles.previewPdf} /> : null}
          {!hasMediaPreview ? <div className={styles.previewUnsupported}>
              <Icon icon="mdi:file-document-outline" className={styles.previewUnsupportedIcon} aria-hidden />
              <p>{labels.unsupported}</p>
              <a href={downloadUrl} download={file.file_name} className={formStyles.primaryBtn}>
                <Icon icon="mdi:download-outline" aria-hidden /> {labels.download}
              </a>
            </div> : null}
        </div>

        <footer className={styles.footer}>
          {footerLeading}
          <span className={badgeClass}>{getCategoryLabel(file.category)}</span>
          {onEditDescription || showEmptyDescription || file.description ? <span className={styles.footerDescRow}>
              {file.description ? <span className={styles.footerDescText}>{file.description}</span> : showEmptyDescription ? <span className={`${styles.footerDescText} ${styles.footerDescEmpty}`.trim()}>
                  {labels.noDescription}
                </span> : null}
              {onEditDescription ? <button type="button" className={styles.footerDescEditBtn} onClick={onEditDescription} title={labels.editDescriptionTitle} aria-label={labels.editDescriptionAria}>
                  <Icon icon="mdi:pencil-outline" aria-hidden />
                </button> : null}
            </span> : null}
          <span className={styles.footerMeta}>
            {file.created_at ? formatDate(file.created_at) : "-"}
            {file.size_bytes != null ? ` · ${formatSize(file.size_bytes)}` : ""}
          </span>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
