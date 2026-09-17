import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { useAdminCommonCopy, useAdminModalCopy } from "../../hooks/useAdminCopy";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getAdminPermissionsCopy, getLocalizedProfileName } from "./adminPermissionsI18n";
import { getProfileFormSections } from "./adminFormModalsI18n";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import formStyles from "./IngestionRuleFormModal.module.css";
export default function ProfileFormModal({
  open,
  draft,
  setDraft,
  saving = false,
  profiles = [],
  onClose,
  onSave
}) {
  const locale = useAppLocale();
  const commonCopy = useCommonCopy();
  const adminCopy = useAdminCommonCopy();
  const modalCopy = useAdminModalCopy("profileForm");
  const permissionsCopy = useMemo(() => getAdminPermissionsCopy(locale), [locale]);
  const formSections = useMemo(() => getProfileFormSections(locale), [locale]);
  const [activeSection, setActiveSection] = useState("general");
  useEffect(() => {
    if (!open) return;
    setActiveSection("general");
  }, [open]);
  const sectionMeta = useMemo(() => ({
    general: Boolean(String(draft?.name || "").trim()),
    inheritance: true
  }), [draft]);
  if (!open || !draft) return null;
  const patchDraft = patch => setDraft(prev => ({
    ...prev,
    ...patch
  }));
  const parentDisplayName = draft.parentProfile ? getLocalizedProfileName(draft.parentProfile, permissionsCopy) || draft.parentProfile : adminCopy.standalone;
  const renderSectionContent = () => {
    switch (activeSection) {
      case "general":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{modalCopy.generalTitle}</h3>
              <p className={layout.sectionDesc}>{modalCopy.generalDesc}</p>
            </div>
            <div className={layout.fieldGrid2}>
              <div className={layout.field}>
                <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="profile-name">
                  {modalCopy.nameLabel}
                </label>
                <input id="profile-name" type="text" className={layout.input} value={draft.name || ""} onChange={e => patchDraft({
                name: e.target.value
              })} placeholder={modalCopy.namePlaceholder} autoFocus />
              </div>
              <div className={layout.field}>
                <label className={layout.label} htmlFor="profile-label">
                  {modalCopy.labelField}
                </label>
                <input id="profile-label" type="text" className={layout.input} value={draft.label || ""} onChange={e => patchDraft({
                label: e.target.value
              })} placeholder={modalCopy.labelPlaceholder} />
              </div>
            </div>
          </>;
      case "inheritance":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{modalCopy.inheritanceTitle}</h3>
              <p className={layout.sectionDesc}>{modalCopy.inheritanceDesc}</p>
            </div>
            <div className={layout.fieldGrid2}>
              <div className={`${layout.field} ${layout.fieldFull}`}>
                <label className={layout.label} htmlFor="profile-parent">
                  {modalCopy.parentLabel}
                </label>
                <select id="profile-parent" className={layout.input} value={draft.parentProfile || ""} onChange={e => patchDraft({
                parentProfile: e.target.value
              })}>
                  <option value="">{modalCopy.noParent}</option>
                  {profiles.map(p => <option key={p.name} value={p.name}>
                      {getLocalizedProfileName(p.name, permissionsCopy) || p.name}
                    </option>)}
                </select>
              </div>
            </div>
            <div className={formStyles.statusRow} style={{
            marginTop: "0.75rem"
          }}>
              <div>
                <div className={formStyles.statusLabel}>{modalCopy.defaultRightsLabel}</div>
                <p className={formStyles.statusHint}>{modalCopy.defaultRightsHint}</p>
              </div>
              <Icon icon="mdi:shield-account-outline" style={{
              fontSize: "1.4rem",
              color: "var(--msp-muted)"
            }} aria-hidden />
            </div>
          </>;
      default:
        return null;
    }
  };
  return createPortal(<div className={layout.overlay} onClick={onClose} role="presentation">
      <div className={layout.shell} style={{
      maxWidth: "min(720px, 100%)"
    }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="profile-form-title">
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <Icon icon="mdi:account-cog-outline" />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>{modalCopy.eyebrow}</p>
              <h2 className={layout.title} id="profile-form-title">
                {modalCopy.title}
              </h2>
              <p className={layout.subtitle}>{modalCopy.subtitle}</p>
            </div>
          </div>
          <button type="button" className={layout.closeBtn} onClick={onClose} disabled={saving} aria-label={commonCopy.close}>
            <FaTimes />
          </button>
        </header>

        <div className={layout.body}>
          <nav className={layout.nav} aria-label={modalCopy.sectionsAria}>
            {formSections.map(section => <button key={section.id} type="button" className={`${layout.navItem} ${activeSection === section.id ? layout.navItemActive : ""}`} onClick={() => setActiveSection(section.id)} aria-current={activeSection === section.id ? "step" : undefined}>
                <Icon icon={section.icon} className={layout.navItemIcon} aria-hidden />
                <span className={layout.navItemText}>
                  <span className={layout.navItemLabel}>{section.label}</span>
                  <span className={layout.navItemHint}>{section.description}</span>
                </span>
                {sectionMeta[section.id] && <span className={layout.navBadge}>✓</span>}
              </button>)}
          </nav>

          <div className={layout.content}>{renderSectionContent()}</div>
        </div>

        <footer className={layout.footer}>
          <span className={layout.footerHint}>
            {draft.name?.trim() || adminCopy.noIdentifier} · {parentDisplayName}
          </span>
          <div className={layout.footerActions}>
            <button type="button" className={layout.ghostBtn} onClick={onClose} disabled={saving}>
              {commonCopy.cancel}
            </button>
            <button type="button" className={layout.primaryBtn} onClick={onSave} disabled={saving || !String(draft.name || "").trim()}>
              {saving ? <>
                  <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
                  {adminCopy.creating}
                </> : <>
                  <Icon icon="mdi:check" aria-hidden />
                  {modalCopy.createBtn}
                </>}
            </button>
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
