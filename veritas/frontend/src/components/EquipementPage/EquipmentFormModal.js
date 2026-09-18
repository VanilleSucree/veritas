import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { createEquipment, updateEquipment, deleteEquipment } from "../../api/equipment";
import { updateClient } from "../../api/clients";
import { toast } from "react-toastify";
import { SWITCH_CATALOG, WIFI_AP_CATALOG, getAlimentationCatalogByType, getToipCatalogByType, getFirewallCatalogByDeploymentType, getRouterCatalogByType, getStorageCatalogByType } from "./constants/equipmentCatalog";
import { isSynologyBrand } from "./synologyEquipmentUtils";
import { normalizeInternetFormData } from "../RapportPage/monitoring/internetIpUtils";
import { syncInternetLegacyDebit } from "./internetConnectionUtils";
import { buildAvailableSites, buildEquipmentForUpdate, buildEquipmentId, buildEquipmentSectionMeta, buildInitialFormData, cloneEquipmentFormSnapshot, equipmentFormsEqual, getApiType, getFirewallPartnerOptions, getHostServerOptions, getServerHaPartnerOptions, getStorageHaPartnerOptions, isEquipmentRequiredSectionIncomplete, isToipVoipSectionVisible, normalizeServerType, storageTypeToLegacyType, syncFirewallHaPeerLink, syncServerHaPeerLink, syncStorageHaPeerLink } from "./equipmentFormConfig";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getEquipmentFormSectionsI18n, getEquipmentModalsCopy, getEquipmentModuleLabel, validateEquipmentFormI18n, EQUIPMENT_MODULE_ICONS, interpolate } from "./equipmentModalsI18n";
import EquipmentFormSectionContent from "./EquipmentFormSectionContent";
import { ConfirmModal } from "../AdminPage/AdminUi";
import ModalDiscardConfirm from "../Misc/ModalDiscardConfirm";
import { useModalCloseGuard } from "../../hooks/useModalCloseGuard";
import styles from "../EnterprisesPage/EnterpriseFormModal.module.css";
import { serializeAssignedSsidsForPersistence, serializeWifiSsidCatalogForPersistence, wifiSsidCatalogsEqual, resolveClientWifiSsidCatalog } from "./wifiApSsidUtils";
import useSystemFamilyExtensions from "../../hooks/useSystemFamilyExtensions";
import { buildExtensionFormValues } from "../../utils/systemFamilyExtensions";
import UnifiSiteLinkModal from "../EnterprisesPage/UnifiSiteLinkModal";
import UnifiImportModal from "../EnterprisesPage/UnifiImportModal";
import { getClientUnifiLink } from "../../api/unifi";
import { mapClientHardwareEquipment } from "../../api/equipment";

const UNIFI_IMPORTABLE_MODULES = new Set(["Switch", "BorneWifi", "Firewalls", "Routeur"]);

export default function EquipmentFormModal({
  open,
  onClose,
  client,
  equipment,
  moduleKey,
  onSaved,
  onDeleted,
  mode = "edit",
  backgroundSave = false,
  peerFirewalls = [],
  peerServers = [],
  peerStorage = [],
  peerBorneWifi = []
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getEquipmentModalsCopy(locale), [locale]);
  const formCopy = copy.form;
  const isAddMode = mode === "add";
  const [formData, setFormData] = useState({});
  const [activeSection, setActiveSection] = useState("identity");
  const [initialSnapshot, setInitialSnapshot] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [error, setError] = useState(null);
  const [unifiLinkModalOpen, setUnifiLinkModalOpen] = useState(false);
  const [unifiImportModalOpen, setUnifiImportModalOpen] = useState(false);
  const [unifiOpening, setUnifiOpening] = useState(false);
  const apiType = getApiType(moduleKey, equipment);
  const { fields: extensionFields } = useSystemFamilyExtensions(apiType || moduleKey);
  const serverType = normalizeServerType(formData.typeServer || equipment?.type || equipment?.typeServer || "");
  const isPhysicalServer = apiType === "Servers" && serverType === "physique";
  const availableSites = useMemo(() => {
    const sites = buildAvailableSites(client, equipment);
    const current = (formData.location || "").trim();
    if (current && current !== "Sans site" && !sites.includes(current)) {
      return [...sites, current].sort((a, b) => a.localeCompare(b, "fr"));
    }
    return sites;
  }, [client, equipment, formData.location]);
  const firewallPartnerOptions = useMemo(() => getFirewallPartnerOptions(client, equipment, {
    currentPartnerName: formData.firewallHAName,
    peerFirewalls
  }), [client, equipment, formData.firewallHAName, peerFirewalls]);
  const serverHaPartnerOptions = useMemo(() => getServerHaPartnerOptions(client, equipment, {
    currentPartnerName: formData.serverHAName,
    peerServers
  }), [client, equipment, formData.serverHAName, peerServers]);
  const storageHaPartnerOptions = useMemo(() => getStorageHaPartnerOptions(client, equipment, {
    currentPartnerName: formData.storageHAName,
    peerStorage
  }), [client, equipment, formData.storageHAName, peerStorage]);
  const hostServerOptions = useMemo(() => getHostServerOptions(client, equipment, {
    currentHostName: formData.hostServerName,
    peerServers
  }), [client, equipment, formData.hostServerName, peerServers]);
  const sections = useMemo(() => {
    const list = getEquipmentFormSectionsI18n(moduleKey, locale, {
      firewallType: formData.firewallType,
      routeurType: formData.routeurType,
      serverType: formData.typeServer,
      storageType: formData.storageType,
      toipType: formData.toipType
    });
    const withExtra = extensionFields.length
      ? [...list, {
        id: "extra",
        label: locale === "fr" ? "Champs perso" : "Custom fields",
        description: locale === "fr" ? "Champs ajoutés à cette famille" : "Fields added to this family",
        icon: "mdi:form-textbox"
      }]
      : list;
    if (moduleKey !== "TOIP") return withExtra;
    return withExtra.filter(section => section.id !== "voip" || isToipVoipSectionVisible(formData.toipType));
  }, [moduleKey, locale, formData.firewallType, formData.routeurType, formData.typeServer, formData.storageType, formData.toipType, extensionFields.length]);
  const hasChanges = useMemo(() => !equipmentFormsEqual(formData, initialSnapshot), [formData, initialSnapshot]);
  const hasUnsavedChanges = hasChanges;
  const {
    requestClose,
    discardConfirmOpen,
    cancelDiscard,
    confirmDiscard
  } = useModalCloseGuard({
    open,
    onClose,
    hasUnsavedChanges,
    blocked: saving || deleting
  });
  const sectionMeta = useMemo(() => buildEquipmentSectionMeta(formData, moduleKey, {
    isPhysicalServer,
    isAddMode
  }), [formData, moduleKey, isPhysicalServer, isAddMode]);
  const isRequiredSectionIncomplete = useCallback(sectionId => isEquipmentRequiredSectionIncomplete(formData, moduleKey, sectionId, {
    isAddMode
  }), [formData, moduleKey, isAddMode]);
  const formSessionRef = useRef(null);
  useEffect(() => {
    if (!open) {
      formSessionRef.current = null;
      return;
    }
    const equipmentKey = isAddMode ? "new" : String(equipment?.id ?? equipment?.rawData?.id ?? equipment?.name ?? "");
    const extraKey = extensionFields.map(field => field.fieldKey).join(",");
    const ssidKey = moduleKey === "BorneWifi"
      ? `${Array.isArray(client?.ssids) ? client.ssids.length : Array.isArray(client?.ssid) ? client.ssid.length : 0}:${Array.isArray(equipment?.ssids) ? equipment.ssids.length : 0}`
      : "";
    const sessionKey = `${mode}:${moduleKey ?? ""}:${client?.id ?? ""}:${equipmentKey}:${extraKey}:${ssidKey}`;
    if (formSessionRef.current === sessionKey) return;
    formSessionRef.current = sessionKey;
    const nextForm = {
      ...buildInitialFormData(equipment, moduleKey, {
        client,
        peerBorneWifi
      }),
      ...buildExtensionFormValues(equipment, extensionFields),
      __systemExtensionFields: extensionFields
    };
    setFormData(nextForm);
    setInitialSnapshot(cloneEquipmentFormSnapshot(nextForm));
    setActiveSection("identity");
    setError(null);
  }, [open, isAddMode, mode, moduleKey, client?.id, equipment?.id, equipment?.name, equipment, client, peerBorneWifi, extensionFields]);
  const buildSubmitData = useCallback(() => {
    if (moduleKey === "Internet") {
      return syncInternetLegacyDebit(normalizeInternetFormData(formData));
    }
    if (moduleKey === "Storage") {
      return {
        ...formData,
        type: storageTypeToLegacyType(formData.storageType || formData.type)
      };
    }
    if (moduleKey === "BorneWifi") {
      const {
        clientSsids,
        assignedSsidIds,
        ...rest
      } = formData;
      const persistedSsids = serializeAssignedSsidsForPersistence(Array.isArray(assignedSsidIds) ? assignedSsidIds : [], clientSsids);
      return {
        ...rest,
        ssids: persistedSsids,
        clientSsids,
        assignedSsidIds
      };
    }
    return formData;
  }, [formData, moduleKey]);
  const persistClientWifiCatalog = useCallback(async () => {
    if (moduleKey !== "BorneWifi" || !client?.id) return null;
    const nextCatalog = serializeWifiSsidCatalogForPersistence(formData.clientSsids || []);
    if (wifiSsidCatalogsEqual(nextCatalog, resolveClientWifiSsidCatalog(client))) return null;
    return updateClient(client.id, {
      name: client.name,
      ssid: nextCatalog,
      ssids: nextCatalog
    });
  }, [client, formData.clientSsids, moduleKey]);
  useEffect(() => {
    if (!open || moduleKey === "Internet") return;
    const sectionIds = new Set(sections.map(section => section.id));
    if (!sectionIds.has(activeSection)) {
      setActiveSection(sections[0]?.id || "identity");
    }
  }, [open, moduleKey, sections, activeSection, formData.toipType]);
  useEffect(() => {
    if (!open || moduleKey !== "TOIP") return;
    if (activeSection === "voip" && !isToipVoipSectionVisible(formData.toipType)) {
      setActiveSection("identity");
    }
  }, [open, moduleKey, activeSection, formData.toipType]);
  const update = useCallback((key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);
  const updateBrandModel = useCallback(brand => {
    setFormData(prev => ({
      ...prev,
      manufacturer: brand,
      model: "",
      ...(apiType === "NAS" && !isSynologyBrand(brand) ? {
        quickConnect: ""
      } : {})
    }));
  }, [apiType]);
  const isSynologyStorageForm = apiType === "NAS" && isSynologyBrand(formData.manufacturer);
  const storageBrandCatalog = apiType === "NAS" ? getStorageCatalogByType(formData.storageType) : null;
  const brandModelCatalogByType = {
    Switch: SWITCH_CATALOG,
    BorneWifi: WIFI_AP_CATALOG,
    Alimentation: getAlimentationCatalogByType(formData.alimentationType),
    TOIP: getToipCatalogByType(formData.toipType)
  };
  const brandModelCatalog = apiType === "Firewalls" ? getFirewallCatalogByDeploymentType(formData.firewallType) : apiType === "Routeur" ? getRouterCatalogByType(formData.routeurType) : brandModelCatalogByType[apiType] || null;
  const handleSubmit = async () => {
    if (!client?.id) return;
    if (!isAddMode && !equipment) return;
    const validationError = validateEquipmentFormI18n(formData, moduleKey, locale, {
      setActiveSection,
      isAddMode
    });
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    const submitData = buildSubmitData();
    const syncFirewallHaIfNeeded = async () => {
      if (moduleKey !== "Firewalls") return;
      const clientFirewalls = Array.isArray(client?.equipements?.Firewalls) ? client.equipements.Firewalls : [];
      await syncFirewallHaPeerLink({
        clientId: client.id,
        currentEquipment: equipment,
        submitData,
        peerFirewalls: [...clientFirewalls, ...(Array.isArray(peerFirewalls) ? peerFirewalls : [])],
        updateEquipmentFn: updateEquipment
      });
    };
    const syncServerHaIfNeeded = async () => {
      if (moduleKey !== "Servers") return;
      const clientServers = [...(Array.isArray(client?.equipements?.Servers) ? client.equipements.Servers : []), ...(Array.isArray(client?.equipements?.Serveurs) ? client.equipements.Serveurs : [])];
      await syncServerHaPeerLink({
        clientId: client.id,
        currentEquipment: equipment,
        submitData,
        peerServers: [...clientServers, ...(Array.isArray(peerServers) ? peerServers : [])],
        updateEquipmentFn: updateEquipment
      });
    };
    const syncStorageHaIfNeeded = async () => {
      if (moduleKey !== "Storage") return;
      const clientStorage = [...(Array.isArray(client?.equipements?.NAS) ? client.equipements.NAS : []), ...(Array.isArray(client?.equipements?.Storage) ? client.equipements.Storage : []), ...(Array.isArray(client?.equipements?.Stockage) ? client.equipements.Stockage : [])];
      await syncStorageHaPeerLink({
        clientId: client.id,
        currentEquipment: equipment,
        submitData,
        peerStorage: [...clientStorage, ...(Array.isArray(peerStorage) ? peerStorage : [])],
        updateEquipmentFn: updateEquipment
      });
    };
    const persistToApi = async () => {
      await persistClientWifiCatalog();
      if (isAddMode) {
        const created = await createEquipment(client.id, moduleKey, submitData);
        await syncFirewallHaIfNeeded();
        await syncServerHaIfNeeded();
        await syncStorageHaIfNeeded();
        return created;
      }
      const equipmentId = buildEquipmentId(client.id, moduleKey, equipment);
      const equipmentForUpdate = buildEquipmentForUpdate(client.id, moduleKey, equipment);
      await updateEquipment(equipmentId, submitData, equipmentForUpdate);
      await syncFirewallHaIfNeeded();
      await syncServerHaIfNeeded();
      await syncStorageHaIfNeeded();
      return null;
    };
    if (backgroundSave) {
      try {
        if (!isAddMode && typeof onSaved === "function") {
          await onSaved(submitData, null, equipment, moduleKey);
        }
      } catch (err) {
        setError(err.message || formCopy.toastLocalUpdateError);
        setSaving(false);
        return;
      }
      onClose();
      setSaving(false);
      void (async () => {
        try {
          const created = await persistToApi();
          if (typeof onSaved === "function") {
            if (isAddMode) {
              await onSaved(submitData, created, equipment, moduleKey);
            }
          }
          toast.success(isAddMode ? moduleKey === "Firewalls" ? formCopy.toastAddedFirewall : formCopy.toastAdded : formCopy.toastUpdated);
        } catch (err) {
          toast.error(err.message || formCopy.toastSaveError);
        }
      })();
      return;
    }
    try {
      if (isAddMode) {
        const created = await persistToApi();
        if (typeof onSaved === "function") {
          await onSaved(submitData, created, equipment, moduleKey);
        }
      } else {
        await persistToApi();
        if (typeof onSaved === "function") {
          await onSaved(submitData, null, equipment, moduleKey);
        }
      }
      onClose();
    } catch (err) {
      setError(err.message || (isAddMode ? formCopy.errorAdd : formCopy.errorUpdate));
    } finally {
      setSaving(false);
    }
  };
  useEffect(() => {
    if (!open) {
      setDeleteConfirmOpen(false);
      setUnifiLinkModalOpen(false);
      setUnifiImportModalOpen(false);
      setUnifiOpening(false);
    }
  }, [open]);
  const openDeleteConfirm = () => {
    if (isAddMode || !equipment || !client?.id || saving || deleting) return;
    setDeleteConfirmOpen(true);
  };
  const canImportFromUnifi = isAddMode && UNIFI_IMPORTABLE_MODULES.has(moduleKey) && Boolean(client?.id);
  const existingUnifiEquipment = useMemo(
    () => (client ? mapClientHardwareEquipment(client) : []),
    [client]
  );
  const handleOpenUnifiImport = async () => {
    if (!canImportFromUnifi || unifiOpening) return;
    setUnifiOpening(true);
    try {
      const linkRes = await getClientUnifiLink(client.id);
      if (linkRes?.link?.linked) {
        setUnifiImportModalOpen(true);
      } else {
        setUnifiLinkModalOpen(true);
      }
    } catch {
      setUnifiLinkModalOpen(true);
    } finally {
      setUnifiOpening(false);
    }
  };
  const handleConfirmDelete = async () => {
    if (isAddMode || !equipment || !client?.id) return;
    setDeleting(true);
    setError(null);
    try {
      const equipmentForDelete = buildEquipmentForUpdate(client.id, moduleKey, equipment);
      await deleteEquipment(equipmentForDelete);
      toast.success(formCopy.toastDeleted);
      setDeleteConfirmOpen(false);
      if (typeof onDeleted === "function") onDeleted(equipment);
      onClose();
    } catch (err) {
      setError(err.message || formCopy.errorDelete);
      toast.error(formCopy.toastDeleteError);
      setDeleteConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };
  if (!open) return null;
  const moduleLabel = getEquipmentModuleLabel(moduleKey, locale);
  const equipmentName = equipment?.nom || equipment?.name || equipment?.type || "";
  const isInternetModule = moduleKey === "Internet";
  const isFirewallModule = moduleKey === "Firewalls";
  const isRouterModule = moduleKey === "Routeur";
  const isServerModule = moduleKey === "Servers";
  const isComputerModule = moduleKey === "Ordinateurs";
  const isStorageModule = moduleKey === "Storage";
  const modalTitle = isAddMode ? isInternetModule ? formCopy.addInternetTitle : interpolate(formCopy.addModuleTitle, {
    module: moduleLabel.toLowerCase()
  }) : isInternetModule ? interpolate(formCopy.editInternetTitle, {
    name: equipmentName || formCopy.editInternetFallback
  }) : interpolate(formCopy.editEquipmentTitle, {
    name: equipmentName || formCopy.editEquipmentFallback
  });
  const modalSubtitle = isAddMode ? isInternetModule ? formCopy.addInternetSubtitle : formCopy.addEquipmentSubtitle : isInternetModule ? formCopy.editInternetSubtitle : interpolate(formCopy.editEquipmentSubtitle, {
    module: moduleLabel
  });
  const modalEyebrow = isInternetModule ? formCopy.eyebrowInternet : formCopy.eyebrowEquipment;
  const submitDisabled = saving || deleting || !isAddMode && !hasChanges;
  const equipmentDisplayName = equipment?.nom || equipment?.name || formData.name || formCopy.thisEquipment;
  return <>
      {createPortal(<div className={styles.overlay} onClick={requestClose} role="presentation">
      <div className={`${styles.shell} ${moduleKey === "Internet" ? styles.shellInternet : ""}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="equipment-form-modal-title">
        <div className={styles.accentBar} aria-hidden />
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <div className={styles.headerIconWrap} aria-hidden>
              <Icon icon={isAddMode ? EQUIPMENT_MODULE_ICONS[moduleKey] || "mdi:plus-circle-outline" : "mdi:pencil-outline"} />
            </div>
            <div className={styles.headerText}>
              <p className={styles.eyebrow}>{modalEyebrow}</p>
              <h2 className={styles.title} id="equipment-form-modal-title">
                {modalTitle}
              </h2>
              <p className={styles.subtitle}>{modalSubtitle}</p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={requestClose} disabled={saving || deleting} aria-label={formCopy.close}>
            <FaTimes />
          </button>
        </header>

        <div className={styles.body}>
          <nav className={styles.nav} aria-label={formCopy.navAria}>
            {sections.map(section => <button key={section.id} type="button" className={`${styles.navItem} ${activeSection === section.id ? styles.navItemActive : ""}`} onClick={() => setActiveSection(section.id)} aria-current={activeSection === section.id ? "step" : undefined}>
                <Icon icon={section.icon} className={styles.navItemIcon} aria-hidden />
                <span className={styles.navItemText}>
                  <span className={`${styles.navItemLabel} ${isRequiredSectionIncomplete(section.id) ? styles.navItemLabelRequired : ""}`}>
                    {section.label}
                  </span>
                  <span className={styles.navItemHint}>{section.description}</span>
                </span>
                {sectionMeta[section.id] ? <span className={styles.navBadge}>✓</span> : null}
              </button>)}
          </nav>

          <div className={styles.content}>
            {error && <div role="alert" style={{
              marginBottom: "1rem",
              padding: "0.65rem 0.85rem",
              borderRadius: "10px",
              background: "rgba(220, 38, 38, 0.08)",
              border: "1px solid rgba(220, 38, 38, 0.2)",
              color: "#b91c1c",
              fontSize: "0.8125rem"
            }}>
                {error}
              </div>}
            {canImportFromUnifi ? (
              <button
                type="button"
                className={styles.ghostBtn}
                onClick={handleOpenUnifiImport}
                disabled={saving || deleting || unifiOpening}
                style={{ marginBottom: "1rem", width: "100%", justifyContent: "flex-start", gap: "0.65rem" }}
              >
                <Icon icon="simple-icons:ubiquiti" aria-hidden />
                <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", textAlign: "left" }}>
                  <span>{formCopy.unifiImportBanner || "Importer depuis UniFi"}</span>
                  <span style={{ fontSize: "0.75rem", opacity: 0.75, fontWeight: 400 }}>
                    {formCopy.unifiImportHint || ""}
                  </span>
                </span>
              </button>
            ) : null}
            <EquipmentFormSectionContent activeSection={activeSection} moduleKey={moduleKey} apiType={apiType} formData={formData} setFormData={setFormData} update={update} updateBrandModel={updateBrandModel} availableSites={availableSites} firewallPartnerOptions={firewallPartnerOptions} serverHaPartnerOptions={serverHaPartnerOptions} storageHaPartnerOptions={storageHaPartnerOptions} hostServerOptions={hostServerOptions} isPhysicalServer={isPhysicalServer} serverType={serverType} isSynologyStorageForm={isSynologyStorageForm} brandModelCatalog={brandModelCatalog} storageBrandCatalog={storageBrandCatalog} isAddMode={isAddMode} isRequiredSectionIncomplete={isRequiredSectionIncomplete} formCopy={copy} extensionFields={extensionFields} />
          </div>
        </div>

        <footer className={styles.footer}>
          <span className={styles.footerHint}>
            {isAddMode ? formCopy.footerRequired : hasChanges ? formCopy.footerUnsaved : formCopy.footerNoChanges}
          </span>
          <div className={styles.footerActions}>
            {!isAddMode && <button type="button" className={`${styles.ghostBtn} ${styles.footerDeleteBtn}`} onClick={openDeleteConfirm} disabled={saving || deleting}>
                <Icon icon="mdi:delete-outline" aria-hidden />
                {deleting ? formCopy.deleting : formCopy.delete}
              </button>}
            <button type="button" className={styles.ghostBtn} onClick={requestClose} disabled={saving || deleting}>
              {formCopy.cancel}
            </button>
            <button type="button" className={styles.primaryBtn} onClick={handleSubmit} disabled={submitDisabled}>
              {saving ? <>
                  <Icon icon="mdi:loading" className={styles.spinning} aria-hidden />
                  {formCopy.saving}
                </> : isAddMode ? <>
                  <Icon icon="mdi:check" aria-hidden />
                  {isInternetModule ? formCopy.createInternet : isFirewallModule ? formCopy.createFirewall : isRouterModule ? formCopy.createRouter : isServerModule ? formCopy.createServer : isStorageModule ? formCopy.createStorage : isComputerModule ? formCopy.createComputer : formCopy.createEquipment}
                </> : <>
                  <Icon icon="mdi:content-save-outline" aria-hidden />
                  {formCopy.save}
                </>}
            </button>
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body)}
      <ModalDiscardConfirm open={discardConfirmOpen} onConfirm={confirmDiscard} onClose={cancelDiscard} />
      <ConfirmModal open={deleteConfirmOpen} title={isInternetModule ? formCopy.deleteInternetTitle : formCopy.deleteEquipmentTitle} icon="mdi:delete-alert-outline" message={interpolate(formCopy.deleteMessage, {
      name: equipmentDisplayName
    })} confirmLabel={formCopy.delete} confirmVariant="dangerSolid" confirmLoading={deleting} onConfirm={handleConfirmDelete} onClose={() => {
      if (!deleting) setDeleteConfirmOpen(false);
    }} />
      {unifiLinkModalOpen && client?.id ? (
        <UnifiSiteLinkModal
          open={unifiLinkModalOpen}
          clientId={client.id}
          onClose={() => setUnifiLinkModalOpen(false)}
          onSaved={link => {
            if (link?.linked) {
              setUnifiLinkModalOpen(false);
              setUnifiImportModalOpen(true);
            }
          }}
        />
      ) : null}
      {unifiImportModalOpen && client?.id ? (
        <UnifiImportModal
          open={unifiImportModalOpen}
          clientId={client.id}
          existingEquipment={existingUnifiEquipment}
          onClose={() => setUnifiImportModalOpen(false)}
          onImported={async () => {
            setUnifiImportModalOpen(false);
            if (typeof onSaved === "function") {
              await onSaved(null, { importedFromUnifi: true }, null, moduleKey);
            }
            onClose();
          }}
        />
      ) : null}
    </>;
}
