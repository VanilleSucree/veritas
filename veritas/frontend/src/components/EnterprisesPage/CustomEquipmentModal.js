import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { addClientCustomEquipment, deleteClientCustomEquipment, updateClientCustomEquipment } from "../../api/clients";
import { getSiteLocationValue, normalizeClientSites } from "../../utils/clientSites";
import ModalDiscardConfirm from "../Misc/ModalDiscardConfirm";
import { useModalCloseGuard } from "../../hooks/useModalCloseGuard";
import styles from "./EnterpriseFormModal.module.css";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getEnterpriseConfigModalsCopy } from "./enterpriseConfigModalsI18n";
import { interpolate } from "../../i18n/translate";
import { getSharedEquipmentFieldDefs, getSharedEquipmentFieldLabel, mergeCustomEquipmentFamilyFields } from "../EquipementPage/sharedEquipmentFields";
import { getFormFields } from "../EquipementPage/equipmentFormFieldsI18n";
import FormNumberStepper from "../EquipementPage/FormNumberStepper";
import SiteSuggestInput from "../EquipementPage/SiteSuggestInput";
import { getEquipmentFieldSelectOptions, groupEquipmentFieldsBySection, isEquipmentLayoutField } from "../../utils/equipmentFamilyFieldUtils";
import { buildAvailableSites, readEquipmentIsActive } from "../EquipementPage/equipmentFormConfig";
const STATUS_FIELD_KEYS = new Set(["actif", "active", "is_active", "isActive"]);
const SECTIONS = [{
  id: "identity",
  label: "Identity",
  description: "Name and site",
  icon: "mdi:tag-outline"
}, {
  id: "common",
  label: "Facturation et installation",
  description: "Champs communs",
  icon: "mdi:file-document-outline"
}, {
  id: "details",
  label: "Details",
  description: "Specific information",
  icon: "mdi:tune-variant"
}];
const LOCATION_FIELD_KEYS = new Set(["location", "lieu", "site", "emplacement", "localisation"]);
function readItemIsActive(item) {
  return readEquipmentIsActive(item);
}
function resolveItemSiteValue(item) {
  const layers = [item, item?.fields, item?.data, item?.rawData, item?.rawData?.data];
  for (const layer of layers) {
    if (!layer || typeof layer !== "object") continue;
    for (const key of ["site", "location", "lieu", "emplacement", "localisation"]) {
      const value = layer[key];
      if (value != null && String(value).trim() !== "") {
        return String(value).trim();
      }
    }
  }
  return "";
}
function applySiteToForm(form, siteValue) {
  const next = {
    ...form,
    site: siteValue
  };
  LOCATION_FIELD_KEYS.forEach(key => {
    if (Object.prototype.hasOwnProperty.call(next, key)) {
      next[key] = siteValue;
    }
  });
  return next;
}
function buildEmptyForm(fields = [], defaultSite = "") {
  const form = {
    name: "",
    site: "",
    is_active: true
  };
  fields.forEach(field => {
    if (STATUS_FIELD_KEYS.has(field.fieldKey)) return;
    if (field.fieldType === "section") return;
    form[field.fieldKey] = field.fieldType === "boolean" ? false : "";
  });
  return applySiteToForm(form, String(defaultSite || "").trim());
}
function buildFormFromItem(item, fields = []) {
  const form = buildEmptyForm(fields);
  form.name = item?.name || "";
  form.is_active = readItemIsActive(item);
  fields.forEach(field => {
    if (field.fieldType === "section") return;
    const value = item?.fields?.[field.fieldKey] ?? item?.data?.[field.fieldKey];
    if (field.fieldType === "boolean") {
      form[field.fieldKey] = Boolean(value);
    } else if (field.fieldType === "number") {
      if (value === false) form[field.fieldKey] = "0";
      else if (value === true) form[field.fieldKey] = "1";
      else if (value != null && value !== "") form[field.fieldKey] = String(value);
    } else if (value != null) {
      form[field.fieldKey] = field.fieldType === "date" ? String(value).slice(0, 10) : String(value);
    }
  });
  return applySiteToForm(form, resolveItemSiteValue(item) || form.site || "");
}
function cloneFormSnapshot(form) {
  return JSON.parse(JSON.stringify(form));
}
function formsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
function isLocationField(field) {
  return LOCATION_FIELD_KEYS.has(String(field?.fieldKey || "").toLowerCase());
}
export default function CustomEquipmentModal({
  isOpen,
  onClose,
  family,
  item = null,
  client = null,
  clientId,
  defaultSite = null,
  onRefresh
}) {
  const locale = useAppLocale();
  const configCopy = useMemo(() => getEnterpriseConfigModalsCopy(locale), [locale]);
  const formFields = useMemo(() => getFormFields(locale).fields || {}, [locale]);
  const [activeSection, setActiveSection] = useState("identity");
  const [form, setForm] = useState(() => buildEmptyForm(mergeCustomEquipmentFamilyFields(family?.fields || []), defaultSite));
  const [initialSnapshot, setInitialSnapshot] = useState(() => buildEmptyForm(mergeCustomEquipmentFamilyFields(family?.fields || []), defaultSite));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fields = useMemo(() => mergeCustomEquipmentFamilyFields(family?.fields || []), [family?.fields]);
  const fieldsSignature = useMemo(
    () => (fields || []).map(field => `${field.fieldKey}:${field.fieldType}:${field.label}:${field.required ? 1 : 0}`).join("|"),
    [fields]
  );
  const sharedFieldKeys = useMemo(() => new Set(getSharedEquipmentFieldDefs().map(field => field.key)), []);
  const commonFields = useMemo(
    () => fields.filter(field => sharedFieldKeys.has(field.fieldKey) && !STATUS_FIELD_KEYS.has(field.fieldKey) && !isLocationField(field)),
    [fields, sharedFieldKeys]
  );
  const detailFields = useMemo(
    () => fields.filter(field => !sharedFieldKeys.has(field.fieldKey) && !STATUS_FIELD_KEYS.has(field.fieldKey) && !isLocationField(field)),
    [fields, sharedFieldKeys]
  );
  const detailInputFields = useMemo(() => detailFields.filter(field => !isEquipmentLayoutField(field)), [detailFields]);
  const detailFieldGroups = useMemo(() => groupEquipmentFieldsBySection(detailFields), [detailFields]);
  const isAddMode = !item?.id;
  const itemId = item?.id ?? null;
  const familyKey = family?.familyKey || "";
  const availableSites = useMemo(() => {
    const sites = buildAvailableSites(client, item);
    const current = String(form.site || "").trim();
    if (current && current !== "Sans site" && !sites.includes(current)) {
      return [...sites, current].sort((a, b) => a.localeCompare(b, "fr"));
    }
    return sites;
  }, [client, item, form.site]);
  const siteOptions = useMemo(
    () => normalizeClientSites(client?.sites || []).map(site => getSiteLocationValue(site)).filter(Boolean),
    [client?.sites]
  );
  useEffect(() => {
    if (!isOpen || !family) return;
    const nextForm = item
      ? buildFormFromItem(item, fields)
      : buildEmptyForm(fields, defaultSite || "");
    setForm(nextForm);
    setInitialSnapshot(cloneFormSnapshot(nextForm));
    setActiveSection("identity");
    // Re-init only when the modal opens or the edited entity / field schema identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally ignore unstable item/family object identity
  }, [isOpen, familyKey, itemId, fieldsSignature, defaultSite]);
  const patchForm = useCallback(patch => {
    setForm(prev => {
      if (Object.prototype.hasOwnProperty.call(patch, "site")) {
        return applySiteToForm({
          ...prev,
          ...patch
        }, String(patch.site || "").trim());
      }
      return {
        ...prev,
        ...patch
      };
    });
  }, []);
  const hasChanges = useMemo(() => !formsEqual(form, initialSnapshot), [form, initialSnapshot]);
  const {
    requestClose,
    discardConfirmOpen,
    cancelDiscard,
    confirmDiscard
  } = useModalCloseGuard({
    open: isOpen,
    onClose,
    hasUnsavedChanges: hasChanges,
    blocked: saving || deleting
  });
  const sectionMeta = useMemo(() => {
    const identityDone = Boolean(String(form.name || "").trim());
    const commonDone = commonFields.every(field => {
      if (!field.required) return true;
      const value = form[field.fieldKey];
      if (field.fieldType === "boolean") return true;
      return value != null && String(value).trim() !== "";
    });
    const detailsDone = detailInputFields.every(field => {
      if (!field.required) return true;
      const value = form[field.fieldKey];
      if (field.fieldType === "boolean") return true;
      return value != null && String(value).trim() !== "";
    });
    return {
      identity: identityDone,
      common: commonDone,
      details: detailsDone
    };
  }, [form, commonFields, detailInputFields]);
  const handleSubmit = async () => {
    if (!clientId || !family?.familyKey) return;
    const name = String(form.name || "").trim();
    if (!name) {
      toast.warning("Name is required");
      setActiveSection("identity");
      return;
    }
    for (const field of fields) {
      if (isEquipmentLayoutField(field)) continue;
      if (isLocationField(field)) continue;
      if (!field.required) continue;
      const value = form[field.fieldKey];
      if (field.fieldType === "boolean") continue;
      if (value == null || String(value).trim() === "") {
        toast.warning(`The “${field.label}” field is required`);
        setActiveSection(sharedFieldKeys.has(field.fieldKey) ? "common" : "details");
        return;
      }
    }
    const siteValue = String(form.site || "").trim();
    const payloadFields = {};
    fields.forEach(field => {
      if (isEquipmentLayoutField(field)) return;
      if (STATUS_FIELD_KEYS.has(field.fieldKey)) return;
      if (isLocationField(field)) {
        payloadFields[field.fieldKey] = siteValue || null;
        return;
      }
      const value = form[field.fieldKey];
      if (field.fieldType === "boolean") {
        payloadFields[field.fieldKey] = Boolean(value);
      } else if (field.fieldType === "number") {
        if (value === false) payloadFields[field.fieldKey] = 0;
        else if (value === true) payloadFields[field.fieldKey] = 1;
        else if (value != null && String(value).trim() !== "") {
          const amount = Number(value);
          payloadFields[field.fieldKey] = Number.isFinite(amount) ? amount : null;
        } else {
          payloadFields[field.fieldKey] = null;
        }
      } else if (value != null && String(value).trim() !== "") {
        payloadFields[field.fieldKey] = value;
      } else {
        payloadFields[field.fieldKey] = null;
      }
    });
    payloadFields.site = siteValue || null;
    payloadFields.location = siteValue || null;
    payloadFields.emplacement = siteValue || null;
    payloadFields.lieu = siteValue || null;
    setSaving(true);
    try {
      const payload = {
        name,
        fields: payloadFields,
        is_active: form.is_active !== false
      };
      if (isAddMode) {
        const saved = await addClientCustomEquipment(clientId, family.familyKey, payload);
        toast.success("Equipment added");
        await onRefresh?.(saved);
      } else {
        const saved = await updateClientCustomEquipment(clientId, family.familyKey, item.id, payload);
        toast.success("Equipment updated");
        await onRefresh?.(saved);
      }
      onClose();
    } catch (error) {
      toast.error(error.message || "Error while saving");
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async () => {
    if (!clientId || !item?.id || !family?.familyKey) return;
    const confirmMessage = interpolate(configCopy.confirm.deleteCustomEquipment.message, {
      name: item.name || form.name || configCopy.confirm.deleteCustomEquipment.fallbackName
    });
    if (!window.confirm(confirmMessage)) return;
    setDeleting(true);
    try {
      await deleteClientCustomEquipment(clientId, family.familyKey, item.id);
      toast.success("Equipment deleted");
      await onRefresh?.(null);
      onClose();
    } catch (error) {
      toast.error(error.message || "Error while deleting");
    } finally {
      setDeleting(false);
    }
  };
  const renderFieldInput = field => {
    const value = form[field.fieldKey];
    const id = `custom-equipment-${field.fieldKey}`;
    const labelClass = field.required ? `${styles.label} ${styles.labelRequired}` : styles.label;
    if (isLocationField(field)) {
      return <div className={styles.field}>
          <label className={labelClass} htmlFor={id}>{field.label || formFields.location || "Lieux"}</label>
          <SiteSuggestInput id={id} value={value || ""} onChange={nextValue => patchForm({
          site: nextValue
        })} sites={availableSites} placeholder={formFields.locationPlaceholder || "Rechercher ou saisir un lieu…"} />
        </div>;
    }
    if (field.fieldType === "textarea") {
      return <div className={`${styles.field} ${styles.fieldFull}`}>
          <label className={labelClass} htmlFor={id}>{field.label}</label>
          <textarea id={id} className={styles.input} rows={4} value={value || ""} onChange={e => patchForm({
          [field.fieldKey]: e.target.value
        })} />
        </div>;
    }
    if (field.fieldType === "boolean") {
      return <div className={styles.field}>
          <span className={styles.label}>{field.label}</span>
          <label style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          fontSize: "0.8125rem",
          color: "var(--msp-muted, #5c6b82)",
          cursor: "pointer"
        }}>
            <input id={id} type="checkbox" checked={Boolean(value)} onChange={e => patchForm({
            [field.fieldKey]: e.target.checked
          })} />
            Yes
          </label>
        </div>;
    }
    if (field.fieldType === "number") {
      return <div className={styles.field}>
          <label className={labelClass} htmlFor={id}>{field.label}</label>
          <FormNumberStepper id={id} value={value ?? ""} onChange={next => patchForm({
          [field.fieldKey]: next
        })} />
        </div>;
    }
    if (field.fieldType === "select") {
      const options = getEquipmentFieldSelectOptions(field);
      return <div className={styles.field}>
          <label className={labelClass} htmlFor={id}>{field.label}</label>
          <select id={id} className={styles.input} value={value ?? ""} onChange={e => patchForm({
          [field.fieldKey]: e.target.value
        })}>
            <option value="">- Select -</option>
            {options.map(option => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>;
    }
    return <div className={styles.field}>
        <label className={labelClass} htmlFor={id}>{field.label}</label>
        <input id={id} type={field.fieldType === "date" ? "date" : "text"} className={styles.input} value={value ?? ""} onChange={e => patchForm({
        [field.fieldKey]: e.target.value
      })} />
      </div>;
  };
  if (!isOpen || !family) return null;
  const familyLabel = family.label || "Equipment";
  const equipmentName = item?.name || form.name || "";
  const modalTitle = isAddMode ? `Add ${familyLabel.toLowerCase()}` : `Edit ${equipmentName || "equipment"}`;
  const modalSubtitle = isAddMode ? "Enter the new equipment information." : `${familyLabel} · Update fields by section.`;
  const submitDisabled = saving || deleting || !isAddMode && !hasChanges;
  return createPortal(<>
    <div className={styles.overlay} onClick={requestClose} role="presentation">
      <div className={styles.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="custom-equipment-modal-title">
        <div className={styles.accentBar} aria-hidden />
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <div className={styles.headerIconWrap} aria-hidden>
              <Icon icon={isAddMode ? family.icon || "mdi:plus-circle-outline" : "mdi:pencil-outline"} />
            </div>
            <div className={styles.headerText}>
              <p className={styles.eyebrow}>Equipment record</p>
              <h2 className={styles.title} id="custom-equipment-modal-title">
                {modalTitle}
              </h2>
              <p className={styles.subtitle}>{modalSubtitle}</p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={requestClose} disabled={saving || deleting} aria-label="Close">
            <FaTimes />
          </button>
        </header>

        <div className={styles.body}>
          <nav className={styles.nav} aria-label="Form sections">
            {SECTIONS.map(section => <button key={section.id} type="button" className={`${styles.navItem} ${activeSection === section.id ? styles.navItemActive : ""}`} onClick={() => setActiveSection(section.id)} aria-current={activeSection === section.id ? "step" : undefined}>
                <Icon icon={section.icon} className={styles.navItemIcon} aria-hidden />
                <span className={styles.navItemText}>
                  <span className={styles.navItemLabel}>{section.label}</span>
                  <span className={styles.navItemHint}>{section.description}</span>
                </span>
                {sectionMeta[section.id] ? <span className={styles.navBadge}>✓</span> : null}
              </button>)}
          </nav>

          <div className={styles.content}>
            {activeSection === "identity" ? <>
                <div className={styles.sectionHead}>
                  <h3 className={styles.sectionTitle}>Identity</h3>
                  <p className={styles.sectionDesc}>
                    Name and site displayed on the map and in the device list.
                  </p>
                </div>
                <div className={styles.fieldGrid2}>
                  <div className={`${styles.field} ${styles.fieldFull}`}>
                    <label className={`${styles.label} ${styles.labelRequired}`} htmlFor="custom-equipment-name">
                      Name / label
                    </label>
                    <input id="custom-equipment-name" type="text" className={styles.input} value={form.name} onChange={e => patchForm({
                    name: e.target.value
                  })} placeholder="Meeting room A" required />
                  </div>
                  <div className={`${styles.field} ${styles.fieldFull}`}>
                    <label className={styles.label} htmlFor="custom-equipment-site">
                      {formFields.location || "Lieux"}
                    </label>
                    <SiteSuggestInput
                      id="custom-equipment-site"
                      value={form.site || ""}
                      onChange={nextValue => patchForm({ site: nextValue })}
                      sites={availableSites.length ? availableSites : siteOptions}
                      placeholder={formFields.locationPlaceholder || "Rechercher ou saisir un lieu…"}
                    />
                  </div>
                  <div className={`${styles.field} ${styles.fieldFull}`}>
                    <span className={styles.label}>{formFields.status || "Statut"}</span>
                    <div className={styles.modulesGrid}>
                      <button type="button" className={`${styles.moduleTile} ${form.is_active !== false ? styles.moduleTileActive : ""}`} onClick={() => patchForm({
                      is_active: true
                    })} aria-pressed={form.is_active !== false}>
                        {form.is_active !== false && <Icon icon="mdi:check-circle" className={styles.moduleCheck} aria-hidden />}
                        <Icon icon="mdi:check-circle-outline" className={styles.moduleTileIcon} aria-hidden />
                        <span className={styles.moduleTileLabel}>{formFields.active || "Actif"}</span>
                      </button>
                      <button type="button" className={`${styles.moduleTile} ${form.is_active === false ? styles.moduleTileActive : ""}`} onClick={() => patchForm({
                      is_active: false
                    })} aria-pressed={form.is_active === false}>
                        {form.is_active === false && <Icon icon="mdi:check-circle" className={styles.moduleCheck} aria-hidden />}
                        <Icon icon="mdi:close-circle-outline" className={styles.moduleTileIcon} aria-hidden />
                        <span className={styles.moduleTileLabel}>{formFields.inactive || "Inactif"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </> : null}

            {activeSection === "common" ? <>
                <div className={styles.sectionHead}>
                  <h3 className={styles.sectionTitle}>Facturation et installation</h3>
                  <p className={styles.sectionDesc}>
                    Champs partagés par tous les équipements.
                  </p>
                </div>
                {commonFields.length === 0 ? <p className={styles.hint}>No shared fields.</p> : <div className={styles.fieldGrid2}>
                    {commonFields.map(field => renderFieldInput({
                  ...field,
                  label: field.label || getSharedEquipmentFieldLabel(field.fieldKey, locale)
                }))}
                  </div>}
              </> : null}

            {activeSection === "details" ? <>
                <div className={styles.sectionHead}>
                  <h3 className={styles.sectionTitle}>Details</h3>
                  <p className={styles.sectionDesc}>
                    Fields specific to the {familyLabel.toLowerCase()} family.
                  </p>
                </div>
                {detailInputFields.length === 0 ? <p className={styles.hint}>No specific fields configured for this family.</p> : detailFieldGroups.map((group, groupIndex) => {
                  const groupKey = group.section?.fieldKey || group.section?.clientId || `group-${groupIndex}`;
                  const sectionLabel = String(group.section?.label || "").trim();
                  return <div key={groupKey} className={styles.fieldGroupBlock}>
                      {sectionLabel ? <h4 className={styles.fieldGroupTitle}>{sectionLabel}</h4> : null}
                      <div className={styles.fieldGrid2}>
                        {(group.fields || []).map(field => renderFieldInput(field))}
                      </div>
                    </div>;
                })}
              </> : null}
          </div>
        </div>

        <footer className={styles.footer}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            minWidth: 0
          }}>
            {!isAddMode ? <button type="button" className={styles.ghostBtn} onClick={handleDelete} disabled={saving || deleting} style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              color: "#dc2626",
              borderColor: "rgba(220, 38, 38, 0.25)",
              flexShrink: 0
            }}>
                <Icon icon="mdi:delete-outline" aria-hidden />
                {deleting ? "Deleting…" : "Delete"}
              </button> : null}
            <span className={styles.footerHint}>
              {isAddMode ? "Fields marked with * are required" : hasChanges ? "Unsaved changes" : "No changes"}
            </span>
          </div>
          <div className={styles.footerActions}>
            <button type="button" className={styles.ghostBtn} onClick={requestClose} disabled={saving || deleting}>
              Cancel
            </button>
            <button type="button" className={styles.primaryBtn} onClick={handleSubmit} disabled={submitDisabled}>
              {saving ? <>
                  <Icon icon="mdi:loading" className={styles.spinning} aria-hidden />
                  Saving…
                </> : isAddMode ? <>
                  <Icon icon="mdi:check" aria-hidden />
                  Create equipment
                </> : <>
                  <Icon icon="mdi:content-save-outline" aria-hidden />
                  Save
                </>}
            </button>
          </div>
        </footer>
      </div>
    </div>
    <ModalDiscardConfirm open={discardConfirmOpen} onConfirm={confirmDiscard} onClose={cancelDiscard} />
    </>, document.getElementById("modal-root") || document.body);
}
