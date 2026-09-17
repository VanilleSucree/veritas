import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";
import { Icon } from "@iconify/react";
import ReportSaveVisibilitySwitch from "../shared/ReportSaveVisibilitySwitch";
import formStyles from "../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "./SaveSupervisionReportModal.module.css";

export default function SaveSupervisionReportModal({
  open,
  saving = false,
  saveName,
  onSaveNameChange,
  visibleToClient,
  onVisibleToClientChange,
  recentDocs = [],
  onPickRecentDoc,
  onClose,
  onSubmit,
  clientName = ""
}) {
  const [activeSection, setActiveSection] = useState("general");

  const navSections = useMemo(() => ([
    { id: "general", icon: "mdi:file-document-edit-outline", label: "Général", hint: "Nom du dossier rapport" },
    { id: "visibility", icon: "mdi:account-eye-outline", label: "Visibilité", hint: "Portail client" },
    { id: "recent", icon: "mdi:history", label: "Récents", hint: `${recentDocs.length} document(s)` }
  ]), [recentDocs.length]);

  if (!open) return null;

  const canSubmit = Boolean(String(saveName || "").trim()) && !saving;

  return createPortal(
    <div className={formStyles.overlay} onClick={onClose} role="presentation">
      <div
        className={`${formStyles.shell} ${styles.saveShell}`}
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-supervision-report-title"
      >
        <div className={formStyles.accentBar} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={formStyles.headerIconWrap} aria-hidden>
              <Icon icon="mdi:folder-file-outline" />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>Rapports de supervision</p>
              <h2 className={formStyles.title} id="save-supervision-report-title">Enregistrer le rapport</h2>
              <p className={formStyles.subtitle}>
                Crée un dossier dans le coffre documentaire{clientName ? ` de ${clientName}` : ""} avec les 3 HTML (supervision, sauvegardes, services).
              </p>
            </div>
          </div>
          <button type="button" className={formStyles.closeBtn} onClick={onClose} disabled={saving} aria-label="Fermer">
            <FaTimes />
          </button>
        </header>

        <div className={formStyles.body}>
          <nav className={formStyles.nav} aria-label="Enregistrement du rapport">
            {navSections.map(section => (
              <button
                key={section.id}
                type="button"
                className={`${formStyles.navItem} ${activeSection === section.id ? formStyles.navItemActive : ""}`}
                onClick={() => setActiveSection(section.id)}
                aria-current={activeSection === section.id ? "step" : undefined}
              >
                <Icon icon={section.icon} className={formStyles.navItemIcon} aria-hidden />
                <span className={formStyles.navItemText}>
                  <span className={formStyles.navItemLabel}>{section.label}</span>
                  <span className={formStyles.navItemHint}>{section.hint}</span>
                </span>
              </button>
            ))}
          </nav>

          <div className={`${formStyles.content} ${styles.saveContent}`}>
            {activeSection === "general" ? (
              <div className={styles.sectionStack}>
                <label className={styles.fieldLabel} htmlFor="save-report-name">Nom du dossier / document</label>
                <input
                  id="save-report-name"
                  className={styles.nameInput}
                  value={saveName}
                  onChange={event => onSaveNameChange?.(event.target.value)}
                  placeholder="Ex. Rapport supervision — août 2026"
                  autoFocus
                  disabled={saving}
                />
                <div className={styles.infoCard}>
                  <Icon icon="mdi:information-outline" aria-hidden />
                  <div>
                    <strong>Archivage coffre-fort</strong>
                    <p>Les trois fichiers HTML sont déposés dans un dossier portant ce nom. Le rapport reste aussi listé dans « Mes documents ».</p>
                  </div>
                </div>
              </div>
            ) : null}

            {activeSection === "visibility" ? (
              <div className={styles.sectionStack}>
                <ReportSaveVisibilitySwitch
                  visibleToClient={visibleToClient}
                  onChange={onVisibleToClientChange}
                  disabled={saving}
                />
                <p className={styles.hint}>
                  Visible : le client voit le dossier HTML sur son portail. Masqué : réservé aux agents.
                </p>
              </div>
            ) : null}

            {activeSection === "recent" ? (
              <div className={styles.sectionStack}>
                {recentDocs.length === 0 ? (
                  <p className={styles.hint}>Aucun rapport enregistré récemment.</p>
                ) : (
                  <div className={styles.recentList}>
                    {recentDocs.slice(0, 12).map(doc => (
                      <button
                        key={doc.id}
                        type="button"
                        className={styles.recentItem}
                        onClick={() => onPickRecentDoc?.(doc)}
                        title="Réutiliser ce nom"
                        disabled={saving}
                      >
                        <span className={styles.recentName}>{doc.name}</span>
                        <span className={styles.recentMeta}>
                          {[doc.client_name, doc.report_period].filter(Boolean).join(" · ") || "—"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <footer className={formStyles.footer}>
          <span className={formStyles.footerHint}>Dossier + 3 HTML dans le coffre</span>
          <div className={formStyles.footerActions}>
            <button type="button" className={formStyles.ghostBtn} onClick={onClose} disabled={saving}>
              Annuler
            </button>
            <button
              type="button"
              className={formStyles.primaryBtn}
              onClick={() => onSubmit?.()}
              disabled={!canSubmit}
            >
              {saving ? (
                <>
                  <Icon icon="mdi:loading" className={styles.spinning} aria-hidden />
                  Enregistrement…
                </>
              ) : (
                <>
                  <Icon icon="mdi:content-save-outline" aria-hidden />
                  Enregistrer
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
}
