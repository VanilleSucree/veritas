import React, { useState, useEffect, useMemo, useRef, useImperativeHandle, forwardRef, useCallback } from "react";
import { getAllHardwareEquipment, getClientHardwareEquipment, getEquipmentMonitoringSummaries, syncEquipmentCheckMKMonitoring, equipmentTypeToFamily, fetchEquipmentTagsBatch } from "../../api/equipment";
import CheckMKMonitoringStatusBadge, { isCheckMKMappableType } from "./CheckMKMonitoringStatusBadge";
import styles from "./EquipmentPage.module.css";
import { FaTimes, FaServer, FaNetworkWired, FaWifi, FaShieldAlt, FaHdd, FaGlobe, FaCube, FaFileExport, FaColumns, FaChevronUp, FaChevronLeft, FaChevronRight, FaTh, FaList, FaCamera, FaPlus, FaSync, FaDesktop } from "react-icons/fa";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import SmartTooltip from "../SmartTooltip";
import EquipmentDetailPage from "./EquipmentDetailPage";
import EquipmentAddFlowModal from "./EquipmentAddFlowModal";
import EquipmentMappingModal from "./EquipmentMappingModal";
import UnifiApiConfigModal from "./UnifiApiConfigModal";
import { isUnifiUdmGateway, hasUnifiApiConfigured } from "./unifiEquipmentUtils";
import { supportsRemoteAccess, hasRemoteAccessConfigured as hasEquipmentRemoteAccessConfigured, getRemoteAccessUrl, openRemoteAccess, EQUIPMENT_REMOTE_ACTION_ICON } from "./equipmentRemoteAccessUtils";
import FirewallBrandIcon from "./constants/FirewallBrandIcon";
import { getEquipmentFirewallBrandId } from "./constants/firewallBrandIconMap";
import RouterBrandIcon, { getEquipmentRouterBrandId } from "./constants/routerBrandIconMap";
import ServerBrandIcon, { getEquipmentServerBrandId } from "./constants/serverBrandIconMap";
import EquipmentBrandIcon from "./constants/EquipmentBrandIcon";
import { canonicalizeComputerType, normalizeServerType, storageTypeToLegacyType, getComputerTypeLabel, readEquipmentIsActive } from "./equipmentFormConfig";
import { getFormFields } from "./equipmentFormFieldsI18n";
import { getServerRemoteAccessActionIcon, getServerRemoteAccessSolutionDef, hasServerRemoteAccessConfigured, openServerRemoteAccess, readServerRemoteAccess } from "./constants/serverRemoteAccessUtils";
import { isSynologyStorage, hasQuickConnectConfigured as hasSynologyQuickConnectConfigured, getQuickConnectValue as getSynologyQuickConnectValue, openQuickConnectUrl } from "./synologyEquipmentUtils";
import EquipmentFormModal from "./EquipmentFormModal";
import { formatInternetDebitDisplay } from "./internetConnectionUtils";
import { formatDateFr, toDateInputValue } from "./constants/firewallLicenceUtils";
import EmbeddedEquipmentActionsMenu from "./EmbeddedEquipmentActionsMenu";
import SupervisionCenterPage from "./SupervisionCenterPage";
import { serializeAssignedSsidsForPersistence, serializeWifiSsidCatalogForPersistence } from "./wifiApSsidUtils";
import { getEquipmentClientId, getEquipmentDbId } from "../../utils/equipmentIdentity";
import { resolveEquipmentMonitorStatus } from "./equipmentMspUtils";
import { useCheckMKIntegrationEnabled } from "../../hooks/useCheckMKIntegrationEnabled";
import { useSupervisionAlertRules } from "../../hooks/useSupervisionAlertRules";
import { useAuthContext } from "../../contexts/AuthContext";
import { updateRmmAgentStatus } from "../../api/rmm";
import RmmAgentStatusBadge from "./RmmAgentStatusBadge";
import { getOsIconName, repairOsLabel } from "./osIconUtils";
import { buildRmmAgentRowFromEquipment, getRmmChassisInfo, getRmmInventoryFromEquipment, resolveRmmAgentOnline } from "./rmmMonitoringUtils";
import { fetchClientEquipmentAlerts, resolveEquipmentFamilyForAlerts } from "../../api/equipmentMonitoringAlerts";
import { ConfirmModal } from "../AdminPage/AdminUi";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useDefaultPageSize } from "../../hooks/useDefaultPageSize";
import { getEquipmentPageCopy, getEquipmentColumnLabel, getEquipmentEmptyMessage, getEquipmentRemoteAccessLabel, formatEquipmentRemoteAccessTooltip } from "./equipmentPageI18n";
import { getEquipmentModalsCopy, interpolate } from "./equipmentModalsI18n";
import { HARDWARE_TYPE_ORDER } from "../EnterprisesPage/infraHoneycombLayout";
import { getInfraMapCopy } from "../EnterprisesPage/infraMapI18n";
import { mapCustomEquipmentItem, parseCustomFamilyType } from "../../api/equipmentFamilies";
import { filterBySite } from "../../utils/siteFilterUtils";
import { equipmentMatchesFleetFamily } from "../../utils/equipmentFamilyStats";
import { getEquipmentFormOptionsCopy, getRoleOptionLabel } from "./equipmentFormOptionsI18n";
import EquipmentHaCell from "./EquipmentHaCell";
import { buildHaPairColorMap, compareFirewallHaPairs, getFirewallHaSortValue, getFirewallHaState } from "./equipmentHaUtils";
import { readSharedEquipmentFieldValue, getSharedEquipmentFieldLabel } from "./sharedEquipmentFields";
import EquipmentCsvExportModal from "./EquipmentCsvExportModal";
import { CSV_EXPORT_EXCLUDED_KEYS, getCsvExportFieldLabel, getDefaultCsvExportKeys } from "./equipmentCsvExportFields";
import { writeEnterprisePeripheralsUi } from "../../utils/enterprisePeripheralsUiState";
import { getExpirationStatus, getExpirationStatusColor, getMaintenanceLicenseExpiration } from "./constants/firewallLicenceUtils";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
import useSystemFamilyExtensions from "../../hooks/useSystemFamilyExtensions";
import { formatExtensionFieldValue, readExtensionFieldValue } from "../../utils/systemFamilyExtensions";
function formatComputerTypeDisplay(value, locale) {
  const key = canonicalizeComputerType(value);
  if (!key) return "";
  return getFormFields(locale).typeOptions?.computer?.[key]?.label || getComputerTypeLabel(value) || "";
}
const toDisplayEquipmentType = type => {
  if (type === "NAS" || type === "Stockage") return "Storage";
  if (type === "Serveurs" || type === "Server") return "Servers";
  return type;
};
const EQUIPMENT_CACHE_KEY = "equipment_page_cache_v3";
const EQUIPMENT_CACHE_TTL_MS = 5 * 60 * 1000;
const SAUVEGARDE_COLUMN_KEYS = ["name", "server", "version", "jobsCount", "mappedJobsCount"];
function formatCustomFamilyFieldValue(field, value, pageCopy) {
  if (field?.fieldType === "number") {
    if (value === false) return "0";
    if (value === true) return "1";
    if (value == null || value === "") return "-";
    return String(value);
  }
  if (value == null || value === "") return "-";
  if (field?.fieldType === "boolean") return value ? pageCopy.yes : pageCopy.no;
  if (field?.fieldType === "date") {
    const formatted = formatDateFr(value);
    return formatted || String(value);
  }
  return String(value);
}
const UNSORTABLE_COLUMN_KEYS = new Set(["brandIcon", "checkmkMapping", "mapping"]);
const CUSTOM_FIELD_SORT_ALIASES = {
  marque: ["marque", "manufacturer", "brand", "constructeur"],
  manufacturer: ["manufacturer", "marque", "brand", "constructeur"],
  modele: ["modele", "modèle", "model"],
  model: ["model", "modele", "modèle"],
  numeroSerie: ["numeroSerie", "numero_serie", "serial", "sn"],
  numero_serie: ["numero_serie", "numeroSerie", "serial", "sn"],
  serial: ["serial", "numeroSerie", "numero_serie", "sn"],
  site: ["site", "location", "localisation"],
  location: ["location", "site", "localisation"]
};
function readCustomFieldRaw(equipment, colKey) {
  const keys = CUSTOM_FIELD_SORT_ALIASES[colKey] || [colKey];
  const layers = [equipment, equipment?.fields, equipment?.data, equipment?.rawData, equipment?.rawData?.data];
  for (const key of keys) {
    for (const layer of layers) {
      if (!layer || typeof layer !== "object") continue;
      const value = layer[key];
      if (value != null && String(value).trim() !== "") return value;
    }
  }
  return "";
}
function coerceCustomSortValue(raw, fieldType) {
  if (raw == null || raw === "") {
    return fieldType === "number" || fieldType === "date" || fieldType === "boolean" ? 0 : "";
  }
  if (fieldType === "boolean" || typeof raw === "boolean") {
    if (typeof raw === "boolean") return raw ? 1 : 0;
    const parsed = String(raw).trim().toLowerCase();
    if (["true", "1", "yes", "oui", "on", "actif", "active"].includes(parsed)) return 1;
    if (["false", "0", "no", "non", "off", "inactif", "inactive"].includes(parsed)) return 0;
  }
  if (fieldType === "number") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }
  if (fieldType === "date" || typeof raw === "string" && (/^\d{4}-\d{2}-\d{2}/.test(raw) || /^\d{1,2}\/\d{1,2}\/\d{4}/.test(raw))) {
    const iso = toDateInputValue(raw);
    if (iso) {
      const d = new Date(`${iso}T00:00:00`);
      if (!Number.isNaN(d.getTime())) return d.getTime();
    }
  }
  if (typeof raw === "number" && !Number.isNaN(raw)) return raw;
  return toSortScalar(raw);
}
function toSortScalar(value) {
  if (value == null || value === "") return "";
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (Array.isArray(value)) {
    return value.map(item => toSortScalar(item)).filter(item => item !== "").join(" ").toLowerCase();
  }
  if (typeof value === "object") {
    const label = value.name || value.label || value.siteName || value.nom || value.title || value.id;
    return label != null ? String(label).toLowerCase() : "";
  }
  return String(value).toLowerCase();
}
function getEquipmentLocationSortValue(equipment) {
  return toSortScalar(
    equipment?.location ??
    equipment?.site ??
    equipment?.emplacement ??
    equipment?.rawData?.location ??
    equipment?.rawData?.site ??
    equipment?.rawData?.emplacement
  );
}
function isColumnSortable(colKey) {
  return !UNSORTABLE_COLUMN_KEYS.has(colKey);
}
function filterItemsBySearch(items, searchQuery, getSearchableText) {
  const query = searchQuery.trim().toLowerCase();
  if (!query) return items;
  return items.filter(item => getSearchableText(item).toLowerCase().includes(query));
}
function getEquipmentSerial(equipment) {
  const candidates = [
    equipment?.serial,
    equipment?.numeroSerie,
    equipment?.serialNumber,
    equipment?.sn,
    equipment?.rawData?.numeroSerie,
    equipment?.rawData?.serial,
    equipment?.rawData?.serialNumber,
    equipment?.rawData?.sn,
    equipment?.rawData?.data?.numeroSerie,
    equipment?.rawData?.data?.serial,
    equipment?.rawData?.data?.sn
  ];
  for (const value of candidates) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return getRmmChassisInfo(getRmmInventoryFromEquipment(equipment)).serial || "";
}
function compactSerial(value) {
  return String(value || "").toLowerCase().replace(/[\s\-_.]/g, "");
}
function matchesHardwareSearch(equipment, searchQuery) {
  const query = String(searchQuery || "").trim().toLowerCase();
  if (!query) return true;
  const serial = getEquipmentSerial(equipment);
  const texts = [equipment?.name, equipment?.model, equipment?.mac, equipment?.ip, equipment?.clientName, equipment?.systeme, equipment?.netbios, serial];
  if (texts.some(value => String(value || "").toLowerCase().includes(query))) return true;
  const querySerial = compactSerial(query);
  const serialCompact = compactSerial(serial);
  return Boolean(querySerial && serialCompact.includes(querySerial));
}
function mapBackupRows(instances = [], searchQuery = "") {
  const rows = (Array.isArray(instances) ? instances : []).map(instance => ({
    id: instance.id || `${instance.logiciel}-${instance.server}`,
    name: instance.logiciel || instance.server || "Backup",
    server: instance.server || "",
    version: instance.version || "",
    jobsCount: instance.jobsCount ?? 0,
    mappedJobsCount: instance.mappedJobsCount ?? 0,
    type: "Backup"
  }));
  return filterItemsBySearch(rows, searchQuery, row => [row.name, row.server, row.version].filter(Boolean).join(" "));
}
const EDITABLE_EQUIPMENT_TYPES = new Set(["Internet", "Firewalls", "Servers", "Ordinateurs", "NAS", "Switch", "BorneWifi", "Alimentation", "Routeur", "TOIP"]);
const NETWORK_EDGE_TYPES = new Set(["Switch", "BorneWifi", "Alimentation", "Routeur", "TOIP"]);
const getEditModuleKey = (equipment, displayType) => {
  if (displayType === "Storage" || equipment?.type === "NAS" || equipment?.type === "Stockage") return "Storage";
  const type = toDisplayEquipmentType(equipment?.type || displayType);
  return type || displayType;
};
const isEquipmentEditable = (equipment, displayType) => {
  const type = toDisplayEquipmentType(equipment?.type || displayType);
  return EDITABLE_EQUIPMENT_TYPES.has(type) || EDITABLE_EQUIPMENT_TYPES.has(equipment?.type) || displayType === "Storage";
};
const getRmmAgentId = equipment => equipment?.rmmAgentId || equipment?.rawData?.agentId || equipment?.rawData?.agent_id || null;
const isRmmEnrolledOrdinateur = (equipment, displayType) => (equipment?.type === "Ordinateurs" || displayType === "Ordinateurs") && (equipment?.agentManaged || equipment?.rawData?.source === "rmm" || equipment?.rawData?.data?.source === "rmm") && Boolean(getRmmAgentId(equipment));
const setRawField = (raw, key, value, aliases = []) => {
  if (value === undefined) return;
  raw[key] = value;
  aliases.forEach(alias => {
    raw[alias] = value;
  });
};
const patchEquipmentFromFormData = (equipment, formData, moduleKey) => {
  if (!equipment || !formData) return equipment;
  const type = equipment.type || (moduleKey === "Storage" ? "NAS" : moduleKey);
  const raw = {
    ...(equipment.rawData || {})
  };
  if (formData.name !== undefined) {
    setRawField(raw, "nom", formData.name, ["name"]);
  }
  if (formData.location !== undefined) {
    setRawField(raw, "site", formData.location, ["location", "emplacement"]);
  }
  const ipNonFixe = formData.ipNonFixe !== undefined ? !!formData.ipNonFixe : !!equipment.ipNonFixe;
  let nextIp = formData.ip !== undefined ? formData.ip : equipment.ip;
  if (type === "Internet" && ipNonFixe) {
    nextIp = formData.ip && String(formData.ip).trim() || "Non-fixed IP";
  }
  if (formData.ip !== undefined || type === "Internet" && formData.ipNonFixe !== undefined) {
    setRawField(raw, "ip", nextIp);
  }
  const patched = {
    ...equipment,
    name: formData.name ?? equipment.name,
    location: formData.location ?? equipment.location,
    ip: nextIp ?? equipment.ip,
    rawData: raw
  };
  if (type === "Internet") {
    if (formData.internetType !== undefined) setRawField(raw, "type", formData.internetType);
    if (formData.fournisseur !== undefined) raw.fournisseur = formData.fournisseur;
    if (formData.debit !== undefined) raw.debit = formData.debit;
    if (formData.debitDownload !== undefined) raw.debitDownload = formData.debitDownload;
    if (formData.debitUpload !== undefined) raw.debitUpload = formData.debitUpload;
    if (formData.categorie !== undefined) raw.categorie = formData.categorie;
    if (formData.ipNonFixe !== undefined) raw.ipNonFixe = !!formData.ipNonFixe;
    if (formData.numeroLigne !== undefined) raw.numeroLigne = formData.numeroLigne;
    if (formData.referenceContrat !== undefined) raw.referenceContrat = formData.referenceContrat;
    if (formData.supportTelephone !== undefined) raw.supportTelephone = formData.supportTelephone;
    if (formData.dateMiseEnService !== undefined) raw.dateMiseEnService = formData.dateMiseEnService;
    if (formData.boxModele !== undefined) raw.boxModele = formData.boxModele;
    if (formData.gateway !== undefined) raw.gateway = formData.gateway;
    if (formData.commentaire !== undefined) raw.commentaire = formData.commentaire;
    patched.internetType = formData.internetType ?? equipment.internetType ?? raw.type;
    patched.fournisseur = formData.fournisseur ?? equipment.fournisseur;
    patched.debit = formData.debit ?? equipment.debit;
    patched.debitDownload = formData.debitDownload ?? equipment.debitDownload;
    patched.debitUpload = formData.debitUpload ?? equipment.debitUpload;
    patched.categorie = formData.categorie ?? equipment.categorie;
    patched.ipNonFixe = formData.ipNonFixe !== undefined ? !!formData.ipNonFixe : equipment.ipNonFixe;
    patched.numeroLigne = formData.numeroLigne ?? equipment.numeroLigne;
    patched.referenceContrat = formData.referenceContrat ?? equipment.referenceContrat;
    patched.supportTelephone = formData.supportTelephone ?? equipment.supportTelephone;
    patched.dateMiseEnService = formData.dateMiseEnService ?? equipment.dateMiseEnService;
    patched.boxModele = formData.boxModele ?? equipment.boxModele;
    patched.gateway = formData.gateway ?? equipment.gateway;
    patched.commentaire = formData.commentaire ?? equipment.commentaire;
  }
  if (type === "Firewalls") {
    if (formData.firewallType !== undefined) {
      raw.firewallType = formData.firewallType;
      raw.type = formData.firewallType;
    }
    if (formData.manufacturer !== undefined) setRawField(raw, "fabricant", formData.manufacturer, ["marque", "manufacturer"]);
    if (formData.model !== undefined) setRawField(raw, "modele", formData.model, ["model"]);
    if (formData.serial !== undefined) setRawField(raw, "numeroSerie", formData.serial, ["serial"]);
    if (formData.firmware !== undefined) setRawField(raw, "firmware", formData.firmware, ["version"]);
    if (formData.vlan !== undefined) raw.vlan = formData.vlan;
    if (formData.expirationGarantie !== undefined) raw.expirationGarantie = formData.expirationGarantie;
    if (formData.licences !== undefined) raw.licences = formData.licences;
    if (formData.modeHA !== undefined) raw.modeHA = !!formData.modeHA;
    if (formData.roleHA !== undefined) raw.roleHA = formData.roleHA;
    if (formData.firewallHAName !== undefined) raw.firewallHAName = formData.firewallHAName;
    if (formData.stormshieldWanUrl !== undefined) raw.stormshieldWanUrl = formData.stormshieldWanUrl;
    if (formData.commentaire !== undefined) raw.commentaire = formData.commentaire;
    patched.manufacturer = formData.manufacturer ?? equipment.manufacturer;
    patched.firewallType = formData.firewallType ?? equipment.firewallType ?? equipment.type;
    patched.model = formData.model ?? equipment.model;
    patched.serial = formData.serial ?? equipment.serial;
    patched.firmware = formData.firmware ?? equipment.firmware;
    patched.version = formData.firmware ?? equipment.version ?? patched.version;
    patched.vlan = formData.vlan ?? equipment.vlan;
    patched.expirationGarantie = formData.expirationGarantie ?? equipment.expirationGarantie;
    patched.licences = formData.licences ?? equipment.licences;
    patched.modeHA = formData.modeHA !== undefined ? !!formData.modeHA : equipment.modeHA;
    patched.roleHA = formData.roleHA ?? equipment.roleHA;
    patched.firewallHAName = formData.firewallHAName ?? equipment.firewallHAName;
    patched.stormshieldWanUrl = formData.stormshieldWanUrl ?? equipment.stormshieldWanUrl;
    patched.commentaire = formData.commentaire ?? equipment.commentaire;
  }
  if (type === "Routeur") {
    if (formData.routeurType !== undefined) {
      raw.routeurType = formData.routeurType;
      raw.type = formData.routeurType;
    }
    if (formData.manufacturer !== undefined) setRawField(raw, "fabricant", formData.manufacturer, ["marque", "manufacturer"]);
    if (formData.model !== undefined) setRawField(raw, "modele", formData.model, ["model"]);
    if (formData.serial !== undefined) setRawField(raw, "numeroSerie", formData.serial, ["serial"]);
    if (formData.firmware !== undefined) setRawField(raw, "firmware", formData.firmware, ["version"]);
    if (formData.vlan !== undefined) raw.vlan = formData.vlan;
    if (formData.adresseMac !== undefined) setRawField(raw, "adresseMac", formData.adresseMac, ["mac"]);
    if (formData.expirationGarantie !== undefined) raw.expirationGarantie = formData.expirationGarantie;
    if (formData.adminUrl !== undefined) raw.adminUrl = formData.adminUrl;
    if (formData.commentaire !== undefined) raw.commentaire = formData.commentaire;
    patched.routeurType = formData.routeurType ?? equipment.routeurType ?? equipment.type;
    patched.manufacturer = formData.manufacturer ?? equipment.manufacturer;
    patched.model = formData.model ?? equipment.model;
    patched.serial = formData.serial ?? equipment.serial;
    patched.firmware = formData.firmware ?? equipment.firmware;
    patched.version = formData.firmware ?? equipment.version ?? patched.version;
    patched.vlan = formData.vlan ?? equipment.vlan;
    patched.adresseMac = formData.adresseMac ?? equipment.adresseMac ?? equipment.mac;
    patched.mac = formData.adresseMac ?? equipment.mac ?? equipment.adresseMac;
    patched.expirationGarantie = formData.expirationGarantie ?? equipment.expirationGarantie;
    patched.adminUrl = formData.adminUrl ?? equipment.adminUrl;
    patched.commentaire = formData.commentaire ?? equipment.commentaire;
  }
  if (type === "Servers") {
    if (formData.typeServer !== undefined) {
      raw.type = formData.typeServer;
      patched.typeServer = formData.typeServer;
    }
    if (formData.vlan !== undefined) raw.vlan = formData.vlan;
    if (formData.processeur !== undefined) raw.processeur = formData.processeur;
    if (formData.memoire !== undefined) raw.memoire = formData.memoire;
    if (formData.stockage !== undefined) raw.stockage = formData.stockage;
    if (formData.systeme !== undefined) raw.systeme = formData.systeme;
    if (formData.hypervisor !== undefined) raw.hypervisor = formData.hypervisor;
    if (formData.hostServerName !== undefined) raw.hostServerName = formData.hostServerName;
    if (formData.remoteAccessSolution !== undefined) raw.remoteAccessSolution = formData.remoteAccessSolution;
    if (formData.remoteAccessId !== undefined) raw.remoteAccessId = formData.remoteAccessId;
    if (formData.remoteAccessSolution === "anydesk" || !formData.remoteAccessSolution) {
      if (formData.remoteAccessId !== undefined) raw.anydeskId = formData.remoteAccessId;
    } else if (formData.remoteAccessSolution !== undefined) {
      raw.anydeskId = "";
    }
    if (formData.role !== undefined) raw.role = formData.role;
    if (formData.commentaire !== undefined) raw.commentaire = formData.commentaire;
    if (formData.manufacturer !== undefined) {
      setRawField(raw, "fabricant", formData.manufacturer, ["marque", "manufacturer"]);
    }
    if (formData.model !== undefined) setRawField(raw, "modele", formData.model, ["model"]);
    if (formData.serial !== undefined) setRawField(raw, "numeroSerie", formData.serial, ["serial"]);
    if (formData.expirationGarantie !== undefined) raw.expirationGarantie = formData.expirationGarantie;
    if (formData.modeHA !== undefined) raw.modeHA = !!formData.modeHA;
    if (formData.roleHA !== undefined) raw.roleHA = formData.roleHA;
    if (formData.serverHAName !== undefined) raw.serverHAName = formData.serverHAName;
    patched.vlan = formData.vlan ?? equipment.vlan;
    patched.processeur = formData.processeur ?? equipment.processeur;
    patched.memoire = formData.memoire ?? equipment.memoire;
    patched.stockage = formData.stockage ?? equipment.stockage;
    patched.systeme = formData.systeme ?? equipment.systeme;
    patched.hypervisor = formData.hypervisor ?? equipment.hypervisor;
    patched.hostServerName = formData.hostServerName ?? equipment.hostServerName;
    patched.remoteAccessSolution = formData.remoteAccessSolution ?? equipment.remoteAccessSolution;
    patched.remoteAccessId = formData.remoteAccessId ?? equipment.remoteAccessId;
    patched.anydeskId = formData.remoteAccessSolution === "anydesk" || !formData.remoteAccessSolution ? formData.remoteAccessId ?? equipment.anydeskId ?? equipment.remoteAccessId : "";
    patched.role = formData.role ?? equipment.role;
    patched.commentaire = formData.commentaire ?? equipment.commentaire;
    patched.manufacturer = formData.manufacturer ?? equipment.manufacturer;
    patched.model = formData.model ?? equipment.model;
    patched.serial = formData.serial ?? equipment.serial;
    patched.expirationGarantie = formData.expirationGarantie ?? equipment.expirationGarantie;
    patched.modeHA = formData.modeHA !== undefined ? !!formData.modeHA : equipment.modeHA;
    patched.roleHA = formData.roleHA ?? equipment.roleHA;
    patched.serverHAName = formData.serverHAName ?? equipment.serverHAName;
  }
  if (type === "Ordinateurs") {
    if (formData.computerType !== undefined) {
      raw.type = formData.computerType;
      patched.computerType = formData.computerType;
    }
    if (formData.vlan !== undefined) raw.vlan = formData.vlan;
    if (formData.manufacturer !== undefined) {
      setRawField(raw, "fabricant", formData.manufacturer, ["marque", "manufacturer"]);
    }
    if (formData.model !== undefined) setRawField(raw, "modele", formData.model, ["model"]);
    if (formData.serial !== undefined) setRawField(raw, "numeroSerie", formData.serial, ["serial"]);
    if (formData.systeme !== undefined) raw.systeme = formData.systeme;
    if (formData.domaine !== undefined) raw.domaine = formData.domaine;
    if (formData.netbios !== undefined) raw.netbios = formData.netbios;
    if (formData.mac !== undefined) setRawField(raw, "mac", formData.mac, ["adresseMac"]);
    if (formData.processeur !== undefined) raw.processeur = formData.processeur;
    if (formData.memoire !== undefined) raw.memoire = formData.memoire;
    if (formData.commentaire !== undefined) raw.commentaire = formData.commentaire;
    patched.vlan = formData.vlan ?? equipment.vlan;
    patched.manufacturer = formData.manufacturer ?? equipment.manufacturer;
    patched.model = formData.model ?? equipment.model;
    patched.serial = formData.serial ?? equipment.serial;
    patched.systeme = formData.systeme ?? equipment.systeme;
    patched.domaine = formData.domaine ?? equipment.domaine;
    patched.netbios = formData.netbios ?? equipment.netbios;
    patched.mac = formData.mac ?? equipment.mac;
    patched.processeur = formData.processeur ?? equipment.processeur;
    patched.memoire = formData.memoire ?? equipment.memoire;
    patched.commentaire = formData.commentaire ?? equipment.commentaire;
  }
  if (type === "NAS") {
    if (formData.storageType !== undefined || formData.type !== undefined) {
      const legacyType = formData.type || (formData.storageType ? storageTypeToLegacyType(formData.storageType) : undefined);
      if (legacyType) raw.type = legacyType;
    }
    if (formData.quickConnect !== undefined) raw.quickConnect = formData.quickConnect;
    if (formData.raid !== undefined) raw.raid = formData.raid;
    if (formData.capacite !== undefined) raw.capacite = formData.capacite;
    if (formData.nbDisquesActuels !== undefined) raw.nbDisquesActuels = formData.nbDisquesActuels;
    if (formData.nbDisquesMax !== undefined) raw.nbDisquesMax = formData.nbDisquesMax;
    if (formData.disques !== undefined) raw.disques = formData.disques;
    if (formData.numeroDisque !== undefined) raw.numeroDisque = formData.numeroDisque;
    if (formData.role !== undefined) raw.role = formData.role;
    if (formData.vlan !== undefined) raw.vlan = formData.vlan;
    if (formData.commentaire !== undefined) raw.commentaire = formData.commentaire;
    if (formData.manufacturer !== undefined) setRawField(raw, "fabricant", formData.manufacturer, ["marque", "manufacturer"]);
    if (formData.model !== undefined) setRawField(raw, "modele", formData.model, ["model"]);
    if (formData.serial !== undefined) setRawField(raw, "numeroSerie", formData.serial, ["serial"]);
    if (formData.expirationGarantie !== undefined) raw.expirationGarantie = formData.expirationGarantie;
    if (formData.modeHA !== undefined) raw.modeHA = !!formData.modeHA;
    if (formData.roleHA !== undefined) raw.roleHA = formData.roleHA;
    if (formData.storageHAName !== undefined) raw.storageHAName = formData.storageHAName;
    patched.quickConnect = formData.quickConnect ?? equipment.quickConnect;
    patched.raid = formData.raid ?? equipment.raid;
    patched.capacite = formData.capacite ?? equipment.capacite;
    patched.nbDisquesActuels = formData.nbDisquesActuels ?? equipment.nbDisquesActuels;
    patched.nbDisquesMax = formData.nbDisquesMax ?? equipment.nbDisquesMax;
    patched.disques = formData.disques ?? equipment.disques;
    patched.numeroDisque = formData.numeroDisque ?? equipment.numeroDisque;
    patched.role = formData.role ?? equipment.role;
    patched.vlan = formData.vlan ?? equipment.vlan;
    patched.commentaire = formData.commentaire ?? equipment.commentaire;
    patched.manufacturer = formData.manufacturer ?? equipment.manufacturer;
    patched.model = formData.model ?? equipment.model;
    patched.serial = formData.serial ?? equipment.serial;
    patched.expirationGarantie = formData.expirationGarantie ?? equipment.expirationGarantie;
    patched.modeHA = formData.modeHA !== undefined ? !!formData.modeHA : equipment.modeHA;
    patched.roleHA = formData.roleHA ?? equipment.roleHA;
    patched.storageHAName = formData.storageHAName ?? equipment.storageHAName;
  }
  if (NETWORK_EDGE_TYPES.has(type) && type !== "Routeur") {
    if (formData.firmware !== undefined) setRawField(raw, "firmware", formData.firmware, ["version"]);
    if (formData.adresseMac !== undefined) setRawField(raw, "adresseMac", formData.adresseMac, ["mac"]);
    if (formData.vlan !== undefined) raw.vlan = formData.vlan;
    if (formData.manufacturer !== undefined) setRawField(raw, "fabricant", formData.manufacturer, ["marque", "manufacturer"]);
    if (formData.model !== undefined) setRawField(raw, "modele", formData.model, ["model"]);
    if (formData.serial !== undefined) setRawField(raw, "numeroSerie", formData.serial, ["serial"]);
    if (type === "Switch" && formData.commentaire !== undefined) {
      raw.commentaire = formData.commentaire;
    }
    if (type === "Switch" && formData.manageable !== undefined) raw.manageable = !!formData.manageable;
    if (type === "Switch" && formData.adminUrl !== undefined) {
      raw.adminUrl = String(formData.adminUrl || "").trim();
      raw.urlAdministration = raw.adminUrl;
    }
    if (type === "Switch" && formData.poeSupport !== undefined) raw.poeSupport = !!formData.poeSupport;
    if (type === "Switch" && formData.empilage !== undefined) raw.empilage = !!formData.empilage;
    patched.firmware = formData.firmware ?? equipment.firmware;
    patched.version = formData.firmware ?? equipment.version ?? patched.version;
    patched.mac = formData.adresseMac ?? equipment.mac ?? equipment.adresseMac;
    patched.adresseMac = formData.adresseMac ?? equipment.adresseMac ?? equipment.mac;
    patched.vlan = formData.vlan ?? equipment.vlan;
    patched.manufacturer = formData.manufacturer ?? equipment.manufacturer;
    patched.model = formData.model ?? equipment.model;
    patched.serial = formData.serial ?? equipment.serial;
    if (type === "Switch") {
      patched.commentaire = formData.commentaire ?? equipment.commentaire;
      patched.manageable = formData.manageable !== undefined ? !!formData.manageable : equipment.manageable;
      patched.adminUrl = formData.adminUrl ?? equipment.adminUrl;
      patched.poeSupport = formData.poeSupport !== undefined ? !!formData.poeSupport : equipment.poeSupport;
      patched.empilage = formData.empilage !== undefined ? !!formData.empilage : equipment.empilage;
    }
    if (type === "BorneWifi") {
      const catalog = formData.clientSsids ?? equipment.clientSsids ?? [];
      const persistedSsids = formData.assignedSsidIds !== undefined ? serializeAssignedSsidsForPersistence(formData.assignedSsidIds, catalog) : formData.ssids !== undefined ? formData.ssids : equipment.ssids;
      if (formData.commentaire !== undefined) raw.commentaire = formData.commentaire;
      if (persistedSsids !== undefined) raw.ssids = persistedSsids;
      if (formData.alimentationPoE !== undefined) raw.alimentationPoE = !!formData.alimentationPoE;
      patched.commentaire = formData.commentaire ?? equipment.commentaire;
      patched.ssids = persistedSsids;
      patched.assignedSsidIds = formData.assignedSsidIds ?? equipment.assignedSsidIds;
      patched.clientSsids = formData.clientSsids ?? equipment.clientSsids;
      patched.alimentationPoE = formData.alimentationPoE !== undefined ? !!formData.alimentationPoE : equipment.alimentationPoE;
    }
    if (type === "Alimentation") {
      if (formData.alimentationType !== undefined) {
        raw.alimentationType = formData.alimentationType;
        raw.type = formData.alimentationType;
      }
      if (formData.capaciteVA !== undefined) raw.capaciteVA = formData.capaciteVA;
      if (formData.capaciteW !== undefined) raw.capaciteW = formData.capaciteW;
      if (formData.nbPrises !== undefined) raw.nbPrises = formData.nbPrises;
      if (formData.dateBatterie !== undefined) raw.dateBatterie = formData.dateBatterie;
      if (formData.expirationGarantie !== undefined) raw.expirationGarantie = formData.expirationGarantie;
      if (formData.commentaire !== undefined) raw.commentaire = formData.commentaire;
      if (formData.manageable !== undefined) raw.manageable = !!formData.manageable;
      if (formData.adminUrl !== undefined) {
        raw.adminUrl = String(formData.adminUrl || "").trim();
        raw.urlAdministration = raw.adminUrl;
      }
      patched.alimentationType = formData.alimentationType ?? equipment.alimentationType;
      patched.capaciteVA = formData.capaciteVA ?? equipment.capaciteVA;
      patched.capaciteW = formData.capaciteW ?? equipment.capaciteW;
      patched.nbPrises = formData.nbPrises ?? equipment.nbPrises;
      patched.dateBatterie = formData.dateBatterie ?? equipment.dateBatterie;
      patched.expirationGarantie = formData.expirationGarantie ?? equipment.expirationGarantie;
      patched.commentaire = formData.commentaire ?? equipment.commentaire;
      patched.manageable = formData.manageable !== undefined ? !!formData.manageable : equipment.manageable;
      patched.adminUrl = formData.adminUrl ?? equipment.adminUrl;
    }
    if (type === "TOIP") {
      if (formData.toipType !== undefined) {
        raw.toipType = formData.toipType;
        raw.type = formData.toipType;
      }
      if (formData.nombreExtensions !== undefined) raw.nombreExtensions = formData.nombreExtensions;
      if (formData.domaineSip !== undefined) raw.domaineSip = formData.domaineSip;
      if (formData.commentaire !== undefined) raw.commentaire = formData.commentaire;
      if (formData.manageable !== undefined) raw.manageable = !!formData.manageable;
      if (formData.adminUrl !== undefined) {
        raw.adminUrl = String(formData.adminUrl || "").trim();
        raw.urlAdministration = raw.adminUrl;
      }
      patched.toipType = formData.toipType ?? equipment.toipType;
      patched.nombreExtensions = formData.nombreExtensions ?? equipment.nombreExtensions;
      patched.domaineSip = formData.domaineSip ?? equipment.domaineSip;
      patched.commentaire = formData.commentaire ?? equipment.commentaire;
      patched.manageable = formData.manageable !== undefined ? !!formData.manageable : equipment.manageable;
      patched.adminUrl = formData.adminUrl ?? equipment.adminUrl;
    }
  }
  patched.rawData = raw;
  return patched;
};
const normalizeEquipmentType = type => type === "Storage" ? "NAS" : type;
const isSameEquipmentItem = (a, b) => {
  if (!a || !b) return false;
  if (a.clientId !== b.clientId) return false;
  if (normalizeEquipmentType(a.type) !== normalizeEquipmentType(b.type)) return false;
  if (a.id && b.id && a.id === b.id) return true;
  const aRawId = a.rawData?.id;
  const bRawId = b.rawData?.id;
  if (aRawId && bRawId && aRawId === bRawId) return true;
  if (a.serial && b.serial && a.serial === b.serial) return true;
  if (a.mac && b.mac && a.mac === b.mac) return true;
  const aMac = a.adresseMac || a.mac;
  const bMac = b.adresseMac || b.mac;
  if (aMac && bMac && aMac === bMac) return true;
  if (a.name && b.name && a.name === b.name) return true;
  const aNom = a.rawData?.nom || a.name;
  const bNom = b.rawData?.nom || b.name;
  if (aNom && bNom && aNom === bNom) return true;
  return false;
};
const isFullEquipmentListItem = value => !!value && typeof value === "object" && value.clientId && value.type && (value.rawData || Object.prototype.hasOwnProperty.call(value, "is_active"));
const mergeEquipmentListItem = (current, update, moduleKey) => {
  if (!update) return current;
  if (isFullEquipmentListItem(update)) {
    return {
      ...current,
      ...update,
      id: update.id || current.id,
      checkmkMapping: update.checkmkMapping ?? current.checkmkMapping,
      rawData: update.rawData ?? current.rawData
    };
  }
  return patchEquipmentFromFormData(current, update, moduleKey);
};
const persistEquipmentCache = data => {
  try {
    sessionStorage.setItem(EQUIPMENT_CACHE_KEY, JSON.stringify({
      savedAt: Date.now(),
      data
    }));
  } catch {}
};
function buildEquipmentBaseColumns(locale, pageCopy, type) {
  const label = key => getEquipmentColumnLabel(locale, type, key);
  return {
    name: {
      label: label("name"),
      key: "name"
    },
    monitoring: {
      label: pageCopy.monitoring,
      key: "monitoring"
    },
    client: {
      label: label("client"),
      key: "clientName"
    },
    location: {
      label: label("location"),
      key: "location"
    },
    activeStatus: {
      label: "Actif",
      key: "activeStatus"
    },
    processeur: {
      label: label("processeur"),
      key: "processeur"
    },
    memoire: {
      label: label("memoire"),
      key: "memoire"
    },
    stockage: {
      label: label("stockage"),
      key: "stockage"
    },
    ip: {
      label: label("ip"),
      key: "ip"
    },
    serial: {
      label: label("serial"),
      key: "serial"
    },
    mapping: {
      label: label("mapping"),
      key: "checkmkMapping"
    },
    model: {
      label: label("model"),
      key: "model"
    },
    manufacturer: {
      label: label("manufacturer"),
      key: "manufacturer"
    },
    version: {
      label: label("version"),
      key: "version"
    },
    mac: {
      label: label("mac"),
      key: "mac"
    },
    uptime: {
      label: label("uptime"),
      key: "uptime"
    },
    installDate: {
      label: label("installDate"),
      key: "installDate"
    },
    purchaseDate: {
      label: getSharedEquipmentFieldLabel("purchaseDate", locale) || "Purchase date",
      key: "purchaseDate"
    },
    invoiceNumber: {
      label: getSharedEquipmentFieldLabel("invoiceNumber", locale) || "Invoice number",
      key: "invoiceNumber"
    },
    commentaire: {
      label: getSharedEquipmentFieldLabel("commentaire", locale) || "Notes",
      key: "commentaire"
    },
    nbDisques: {
      label: label("nbDisques"),
      key: "nbDisques"
    },
    capacite: {
      label: label("capacite"),
      key: "capacite"
    },
    fournisseur: {
      label: label("fournisseur"),
      key: "fournisseur"
    },
    internetType: {
      label: label("internetType"),
      key: "internetType"
    },
    categorie: {
      label: label("categorie"),
      key: "categorie"
    },
    debit: {
      label: label("debit"),
      key: "debit"
    },
    vlan: {
      label: label("vlan"),
      key: "vlan"
    },
    firmware: {
      label: label("firmware"),
      key: "firmware"
    },
    expirationGarantie: {
      label: label("expirationGarantie"),
      key: "expirationGarantie"
    },
    maintenanceLicense: {
      label: label("maintenanceLicense"),
      key: "maintenanceLicense"
    },
    systeme: {
      label: label("systeme"),
      key: "systeme"
    },
    domaine: {
      label: label("domaine"),
      key: "domaine"
    },
    agentStatus: {
      label: label("agentStatus"),
      key: "agentStatus"
    },
    ssidCount: {
      label: "SSID",
      key: "ssidCount"
    },
    disksUsage: {
      label: "Disques",
      key: "disksUsage"
    },
    powerRating: {
      label: "Puissance VA / W",
      key: "powerRating"
    },
    computerType: {
      label: label("computerType"),
      key: "computerType"
    },
    role: {
      label: label("role"),
      key: "role"
    },
    ha: {
      label: label("ha"),
      key: "ha"
    },
    raid: {
      label: label("raid"),
      key: "raid"
    },
    nbDisquesActuels: {
      label: label("nbDisquesActuels"),
      key: "nbDisquesActuels"
    },
    nbDisquesMax: {
      label: label("nbDisquesMax"),
      key: "nbDisquesMax"
    },
    server: {
      label: label("server"),
      key: "server"
    },
    jobsCount: {
      label: label("jobsCount"),
      key: "jobsCount"
    },
    mappedJobsCount: {
      label: label("mappedJobsCount"),
      key: "mappedJobsCount"
    },
    logiciel: {
      label: label("logiciel"),
      key: "logiciel"
    }
  };
}
const TYPE_ORDER = [...HARDWARE_TYPE_ORDER, "Backup", "Security camera"];
const FILTER_TYPE_ORDER = [...HARDWARE_TYPE_ORDER, "Backup"];
const TYPE_ICON_MAP = {
  Internet: 'mdi:web',
  Firewalls: 'mdi:shield-outline',
  Servers: 'mdi:server',
  Ordinateurs: 'mdi:laptop',
  Storage: 'mdi:harddisk',
  Switch: 'mdi:lan',
  BorneWifi: 'mdi:wifi',
  Alimentation: 'mdi:power-plug',
  Routeur: 'mdi:router-wireless',
  Backup: 'mdi:backup-restore',
  TOIP: 'mdi:phone-voip',
  'Security camera': 'mdi:cctv'
};
const FIREWALL_COLUMN_KEYS = ['name', 'monitoring', 'client', 'location', 'ip', 'vlan', 'ha', 'manufacturer', 'model', 'serial', 'firmware', 'expirationGarantie', 'maintenanceLicense', 'mapping'];
const FIREWALL_COLUMN_LABELS = {
  manufacturer: 'Brand',
  model: 'Model',
  serial: 'SN'
};
const INTERNET_COLUMN_KEYS = ['name', 'client', 'location', 'ip', 'internetType', 'fournisseur', 'debit', 'ha', 'mapping'];
const INTERNET_COLUMN_LABELS = {
  internetType: 'Connection type'
};
const ORDINATEUR_COLUMN_KEYS = ['name', 'client', 'computerType', 'location', 'ip', 'systeme', 'domaine', 'agentStatus', 'mac', 'serial'];
const ORDINATEUR_COLUMN_LABELS = {
  computerType: 'Type',
  systeme: 'OS',
  domaine: 'Domaine',
  agentStatus: 'Agent',
  serial: 'SN'
};
const SERVER_COLUMN_KEYS = ['name', 'monitoring', 'client', 'location', 'role', 'ip', 'vlan', 'ha', 'systeme', 'serial', 'processeur', 'memoire', 'stockage', 'expirationGarantie', 'mapping'];
const SERVER_COLUMN_LABELS = {
  vlan: 'VLAN',
  systeme: 'OS',
  processeur: 'Proc.',
  memoire: 'RAM',
  stockage: 'Storage',
  role: 'Roles'
};
const STORAGE_COLUMN_KEYS = ['name', 'monitoring', 'client', 'location', 'ip', 'ha', 'serial', 'raid', 'capacite', 'nbDisquesActuels', 'nbDisquesMax', 'expirationGarantie', 'mapping'];
const STORAGE_COLUMN_LABELS = {
  capacite: 'Capacity',
  nbDisquesActuels: 'Current disks',
  nbDisquesMax: 'Max disks'
};
const SWITCH_COLUMN_KEYS = ['name', 'monitoring', 'client', 'location', 'ip', 'vlan', 'manufacturer', 'model', 'serial', 'firmware', 'mac', 'mapping'];
const SWITCH_COLUMN_LABELS = {
  vlan: 'VLAN',
  manufacturer: 'Brand',
  model: 'Model',
  serial: 'SN',
  mac: 'MAC address'
};
const BORNE_WIFI_COLUMN_KEYS = ['name', 'monitoring', 'client', 'location', 'ip', 'vlan', 'manufacturer', 'model', 'serial', 'firmware', 'mac', 'mapping'];
const BORNE_WIFI_COLUMN_LABELS = {
  vlan: "VLAN",
  manufacturer: "Brand",
  model: "Model",
  serial: "SN",
  mac: "MAC address"
};
const MONITORING_COLUMN_LABEL = "Monitoring";
const EMBEDDED_TYPE_COLUMNS = {
  Internet: ["name", "activeStatus", "location", "fournisseur", "ip", "debit", "ha", "mapping"],
  Firewalls: ["name", "activeStatus", "location", "model", "serial", "ip", "ha", "monitoring", "mapping"],
  Routeur: ["name", "activeStatus", "location", "model", "serial", "ip", "monitoring", "mapping"],
  Servers: ["name", "activeStatus", "location", "role", "model", "serial", "ip", "systeme", "ha", "monitoring", "mapping"],
  Storage: ["name", "activeStatus", "location", "model", "serial", "ip", "disksUsage", "capacite", "raid", "ha", "monitoring", "mapping"],
  Ordinateurs: ["name", "activeStatus", "location", "model", "serial", "systeme", "agentStatus", "mapping"],
  Switch: ["name", "activeStatus", "location", "model", "serial", "mac", "ha", "monitoring", "mapping"],
  BorneWifi: ["name", "activeStatus", "location", "model", "serial", "mac", "ssidCount", "monitoring", "mapping"],
  TOIP: ["name", "activeStatus", "location", "model", "version", "ip", "mapping"],
  Alimentation: ["name", "activeStatus", "location", "model", "serial", "powerRating", "ip", "monitoring", "mapping"],
  Backup: ["name", "server", "version", "jobsCount", "mappedJobsCount"]
};
function getEmbeddedCellClassName(colKey, styles) {
  if (colKey === "brandIcon") return styles.embeddedColBrand;
  if (colKey === "checkmkMapping") return styles.embeddedColActions;
  if (colKey === "ha") return styles.embeddedColHa;
  return undefined;
}
const EMBEDDED_DEFAULT_TYPE = "Internet";
const MK_CRITICAL_STATUSES = new Set(["critical", "down", "offline"]);
function normalizeMkAlertStatus(status) {
  const value = String(status || "").toLowerCase();
  if (MK_CRITICAL_STATUSES.has(value)) return "critical";
  if (value === "warning") return "warning";
  return value;
}
function matchesMkAlertFilter(status, filterKey) {
  const normalized = normalizeMkAlertStatus(status);
  if (filterKey === "critical") return normalized === "critical";
  if (filterKey === "warning") return normalized === "warning";
  return false;
}
const getFirstAvailableType = (typeOrder, counts, fallback = EMBEDDED_DEFAULT_TYPE) => {
  const withEquipment = typeOrder.find(type => (counts[type] || 0) > 0);
  return withEquipment || fallback;
};
const resolveMonitoringActiveType = (selectedTypes, typeOrder, counts) => {
  if (selectedTypes.size === 1) return [...selectedTypes][0];
  return getFirstAvailableType(typeOrder, counts, EMBEDDED_DEFAULT_TYPE);
};
const EquipmentPage = forwardRef(function EquipmentPage({
  equipmentFilterParams,
  onNavigate,
  onFilterParamsConsumed,
  embedded = false,
  fixedClientId = null,
  embeddedClient = null,
  searchQuery: externalSearchQuery,
  onSearchQueryChange,
  onFilteredCountChange,
  onTotalCountChange,
  onEquipmentChanged,
  onClientSsidsUpdated,
  customFamilyMap = [],
  backupInstances = [],
  siteFilter = null,
  onCustomFamilyManage,
  onEmbeddedActiveTypeChange,
  initialEmbeddedType = null,
  initialTablePageByType = null,
  initialTableSort = null,
  initialEmbeddedPageSize = null,
  equipmentRevision = 0
}, ref) {
  const {
    userRole
  } = useAuthContext();
  const {
    enabled: checkmkIntegrationEnabled
  } = useCheckMKIntegrationEnabled();
  const {
    rules: supervisionAlertRules
  } = useSupervisionAlertRules();
  const locale = useAppLocale();
  const { fieldsFor } = useSystemFamilyExtensions();
  const pageCopy = useMemo(() => getEquipmentPageCopy(locale), [locale]);
  const actions = pageCopy.actions;
  const infraMapCopy = useMemo(() => getInfraMapCopy(locale), [locale]);
  const embeddedCopy = pageCopy.embedded;
  const modalsCopy = useMemo(() => getEquipmentModalsCopy(locale), [locale]);
  const resolveEmptyMessage = useCallback((type, isEmbedded = false) => getEquipmentEmptyMessage(locale, type, isEmbedded), [locale]);
  const [allEquipment, setAllEquipment] = useState([]);
  const [equipmentTagsMap, setEquipmentTagsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const isExternalSearch = embedded && onSearchQueryChange != null;
  const searchQuery = isExternalSearch ? externalSearchQuery ?? "" : internalSearchQuery;
  const setSearchQuery = value => {
    if (isExternalSearch) {
      onSearchQueryChange(value);
    } else {
      setInternalSearchQuery(value);
    }
  };
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [selectedClients, setSelectedClients] = useState(new Set());
  const [selectedTypes, setSelectedTypes] = useState(() => {
    if (embedded && initialEmbeddedType) return new Set([initialEmbeddedType]);
    return new Set();
  });
  const [visibleColumns, setVisibleColumns] = useState({});
  const [columnModalOpen, setColumnModalOpen] = useState({
    type: null,
    isOpen: false
  });
  const [columnsComingSoonModal, setColumnsComingSoonModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [viewMode, setViewMode] = useState({});
  const [tableSort, setTableSort] = useState(() => {
    if (embedded && initialTableSort && typeof initialTableSort === "object") return initialTableSort;
    return {};
  });
  const [globalPageSize, setGlobalPageSize] = useDefaultPageSize();
  const [embeddedPageSize, setEmbeddedPageSize] = useState(() => {
    const saved = Number(initialEmbeddedPageSize);
    return Number.isFinite(saved) && saved > 0 ? saved : 10;
  });
  const pageSize = embedded ? embeddedPageSize : globalPageSize;
  const setPageSize = embedded ? setEmbeddedPageSize : setGlobalPageSize;
  const [tablePageByType, setTablePageByType] = useState(() => {
    if (embedded && initialTablePageByType && typeof initialTablePageByType === "object") return initialTablePageByType;
    return {};
  });
  const skipTablePageResetRef = useRef(Boolean(embedded && initialEmbeddedType));
  const scrollContainerRef = useRef(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [addFlowOpen, setAddFlowOpen] = useState(false);
  const [mappingModalEquipment, setMappingModalEquipment] = useState(null);
  const [unifiApiModalEquipment, setUnifiApiModalEquipment] = useState(null);
  const [rmmRevokeTarget, setRmmRevokeTarget] = useState(null);
  const [rmmRevoking, setRmmRevoking] = useState(false);
  const [editEquipmentModal, setEditEquipmentModal] = useState({
    open: false,
    equipment: null,
    moduleKey: null,
    mode: "edit",
    client: null
  });
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [csvExportModal, setCsvExportModal] = useState({
    open: false,
    type: null,
    defaultKeys: [],
    customFields: []
  });
  const [embeddedRowMenuKey, setEmbeddedRowMenuKey] = useState(null);
  const exportMenuRef = useRef(null);
  const [monitoringSummaries, setMonitoringSummaries] = useState({});
  const [clientAlertMap, setClientAlertMap] = useState({});
  const [mkStatusFilter, setMkStatusFilter] = useState(null);
  const [supervisionStatusFilter, setMonitoringStatusFilter] = useState("all");
  const [mkBulkSyncing, setMkBulkSyncing] = useState(false);
  const [mkBulkSyncProgress, setMkBulkSyncProgress] = useState({
    done: 0,
    total: 0
  });
  const isMountedRef = useRef(true);
  const mkBulkSyncAbortRef = useRef(null);
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isMkMappedEquipment = equipment => {
    const mapping = equipment?.checkmkMapping;
    return Boolean(mapping?.checkmk_host_name && mapping?.is_active !== false && isCheckMKMappableType(equipment?.type));
  };
  const getEquipmentMkSummary = equipment => {
    const dbId = getEquipmentDbId(equipment);
    return dbId ? monitoringSummaries[dbId] : null;
  };
  const renderMonitoringStatus = (equipment, {
    compact = false
  } = {}) => {
    if (!isCheckMKMappableType(equipment?.type)) return null;
    if (!isMkMappedEquipment(equipment)) return null;
    const summary = getEquipmentMkSummary(equipment);
    return <CheckMKMonitoringStatusBadge summary={summary} isMapped compact={compact} />;
  };
  const renderStateIcon = (active, {
    onLabel = "Actif",
    offLabel = "Inactif",
    warn = false,
    warnLabel = null
  } = {}) => {
    const label = warn ? warnLabel || offLabel : active ? onLabel : offLabel;
    const color = warn ? "#f59e0b" : active ? "#22c55e" : "#94a3b8";
    return <SmartTooltip content={label}>
      <Icon icon="mdi:circle" width={12} height={12} style={{
      color
    }} aria-label={label} />
    </SmartTooltip>;
  };
  const renderActiveStatusIcon = equipment => renderStateIcon(readEquipmentIsActive(equipment));
  const renderSupervisionDot = equipment => {
    if (!isCheckMKMappableType(equipment?.type)) return renderStateIcon(false, {
      onLabel: "Supervision active",
      offLabel: "Supervision non applicable"
    });
    if (!isMkMappedEquipment(equipment)) return renderStateIcon(false, {
      onLabel: "Supervision active",
      offLabel: "Supervision inactive"
    });
    const summary = getEquipmentMkSummary(equipment);
    const status = String(summary?.status || "").toLowerCase();
    const isCritical = status === "critical" || status === "down" || status === "offline";
    const isWarning = status === "warning";
    if (isCritical || isWarning) {
      return renderStateIcon(false, {
        warn: true,
        warnLabel: isCritical ? "Supervision : critique" : "Supervision : avertissement"
      });
    }
    return renderStateIcon(true, {
      onLabel: "Supervision active",
      offLabel: "Supervision inactive"
    });
  };
  const renderAgentDot = equipment => {
    const online = resolveRmmAgentOnline(equipment);
    return renderStateIcon(Boolean(online), {
      onLabel: "Agent en ligne",
      offLabel: "Agent hors ligne"
    });
  };
  useEffect(() => {
    if (!embedded) {
      isMountedRef.current = true;
      setLoading(false);
      setError(null);
      return () => {
        isMountedRef.current = false;
      };
    }
    isMountedRef.current = true;
    try {
      sessionStorage.removeItem("equipment_page_cache_v2");
    } catch {
      // ignore
    }
    const controller = createTrackedAbortController();
    loadEquipment(controller.signal, {
      fresh: true
    });
    return () => {
      isMountedRef.current = false;
      controller.abort();
    };
  }, [embedded, fixedClientId, embeddedClient?.id, equipmentRevision]);
  const refreshMonitoringSummaries = useCallback(async signal => {
    const clientId = embeddedClient?.id || fixedClientId || null;
    const mappedIds = allEquipment.filter(eq => eq.checkmkMapping?.checkmk_host_name && isCheckMKMappableType(eq.type)).map(eq => getEquipmentDbId(eq)).filter(id => id && UUID_RE.test(String(id)));
    const uniqueIds = [...new Set(mappedIds)];
    if (!clientId && uniqueIds.length === 0) {
      if (!signal?.aborted && isMountedRef.current) {
        setMonitoringSummaries({});
      }
      return;
    }
    try {
      const payload = clientId ? {
        clientId
      } : {
        equipmentIds: uniqueIds
      };
      const data = await getEquipmentMonitoringSummaries(payload, {
        signal
      });
      if (!signal?.aborted && isMountedRef.current) {
        setMonitoringSummaries(data?.summaries || {});
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.warn('CheckMK monitoring summaries:', err);
      }
    }
  }, [allEquipment, embeddedClient?.id, fixedClientId]);
  const isEquipmentAlertsSuspended = useCallback(equipment => {
    const dbId = getEquipmentDbId(equipment);
    const family = resolveEquipmentFamilyForAlerts(equipment?.type);
    if (!dbId || !family) return false;
    return Boolean(clientAlertMap[`${dbId}:${family}`]?.suspended);
  }, [clientAlertMap]);
  useEffect(() => {
    const clientId = embeddedClient?.id || fixedClientId || null;
    if (!embedded || !clientId) {
      setClientAlertMap({});
      return;
    }
    const controller = createTrackedAbortController();
    fetchClientEquipmentAlerts(clientId, {
      signal: controller.signal
    }).then(data => {
      if (!controller.signal.aborted) setClientAlertMap(data?.alerts || {});
    }).catch(err => {
      if (err?.name === "AbortError") return;
      if (!controller.signal.aborted) setClientAlertMap({});
    });
    return () => {
      controller.abort();
    };
  }, [embedded, embeddedClient?.id, fixedClientId]);
  const renderAlertSuspendedBadge = equipment => {
    if (!isEquipmentAlertsSuspended(equipment)) return null;
    return <SmartTooltip content="Alerts surveillance suspendues">
        <Icon icon="mdi:bell-off-outline" width={15} height={15} className={styles.alertSuspendedIcon} aria-label="Alerts suspendues" />
      </SmartTooltip>;
  };
  useEffect(() => {
    if (!embedded) return undefined;
    const controller = createTrackedAbortController();
    if (!loading) {
      refreshMonitoringSummaries(controller.signal);
    }
    return () => controller.abort();
  }, [embedded, loading, refreshMonitoringSummaries]);
  const buildMkSyncPayload = useCallback(equipment => {
    const equipmentId = getEquipmentDbId(equipment);
    const clientId = equipment?.clientId;
    const family = equipmentTypeToFamily(equipment?.type);
    const mapping = equipment?.checkmkMapping;
    if (!equipmentId || !UUID_RE.test(String(equipmentId)) || !clientId || !family || !mapping?.checkmk_host_name) {
      return null;
    }
    return {
      equipmentId,
      clientId,
      family,
      hostName: mapping.checkmk_host_name,
      site: mapping.checkmk_site || null,
      force: true,
      availabilityPeriod: '1m'
    };
  }, []);
  const mappedEquipmentForSync = useMemo(() => allEquipment.filter(isMkMappedEquipment), [allEquipment]);
  const handleBulkMkSync = async () => {
    if (mkBulkSyncing) return;
    const payloads = mappedEquipmentForSync.map(buildMkSyncPayload).filter(Boolean);
    if (payloads.length === 0) {
      toast.info('No mapped devices to synchronize.');
      return;
    }
    mkBulkSyncAbortRef.current?.abort();
    const controller = createTrackedAbortController();
    mkBulkSyncAbortRef.current = controller;
    setMkBulkSyncing(true);
    setMkBulkSyncProgress({
      done: 0,
      total: payloads.length
    });
    let synced = 0;
    let skipped = 0;
    let failed = 0;
    let aborted = false;
    try {
      for (const payload of payloads) {
        if (controller.signal.aborted) {
          aborted = true;
          break;
        }
        try {
          const result = await syncEquipmentCheckMKMonitoring(payload, {
            signal: controller.signal
          });
          if (result?.skipped) skipped += 1;else synced += 1;
        } catch (err) {
          if (err?.name === 'AbortError') {
            aborted = true;
            break;
          }
          failed += 1;
        }
        if (!controller.signal.aborted && isMountedRef.current) {
          setMkBulkSyncProgress(prev => ({
            ...prev,
            done: prev.done + 1
          }));
        }
      }
      if (!aborted && isMountedRef.current) {
        await refreshMonitoringSummaries();
        if (failed === 0) {
          toast.success(synced > 0 ? `${synced} device${synced > 1 ? 's' : ''} synchronized${synced > 1 ? '' : ''}${skipped > 0 ? ` (${skipped} skipped)` : ''}.` : `No synchronization needed (${skipped} up to date).`);
        } else {
          toast.warning(`${synced} OK, ${failed} failure${failed > 1 ? 's' : ''}${skipped > 0 ? `, ${skipped} skipped` : ''}.`);
        }
      }
    } finally {
      if (isMountedRef.current) {
        setMkBulkSyncing(false);
        setMkBulkSyncProgress({
          done: 0,
          total: 0
        });
      }
    }
  };
  useEffect(() => () => mkBulkSyncAbortRef.current?.abort(), []);
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => setShowBackToTop(el.scrollTop > 120);
    el.addEventListener("scroll", onScroll, {
      passive: true
    });
    return () => el.removeEventListener("scroll", onScroll);
  }, [loading, error]);
  useEffect(() => {
    if (!exportMenuOpen) return;
    const handleClickOutside = e => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [exportMenuOpen]);
  useEffect(() => {
    if (equipmentFilterParams) {
      setSearchQuery("");
      setClientSearchQuery("");
      if (equipmentFilterParams.equipmentType) {
        const displayType = equipmentFilterParams.equipmentType === 'NAS' ? 'Storage' : equipmentFilterParams.equipmentType;
        setSelectedTypes(new Set([displayType]));
      }
      if (equipmentFilterParams.clientId) {
        const matchingEquipment = allEquipment.find(eq => eq.clientId === equipmentFilterParams.clientId);
        if (matchingEquipment && matchingEquipment.clientName) {
          setSelectedClients(new Set([matchingEquipment.clientName]));
        }
      }
    }
  }, [equipmentFilterParams, allEquipment]);
  useEffect(() => {
    if (!equipmentFilterParams?.openCreateModal) return;
    setAddFlowOpen(true);
    onFilterParamsConsumed?.();
  }, [equipmentFilterParams, onFilterParamsConsumed]);
  const loadEquipment = async (signal, {
    fresh = false
  } = {}) => {
    if (embedded && fixedClientId) {
      setLoading(true);
      setError(null);
      try {
        const equipment = await getClientHardwareEquipment(fixedClientId, {
          client: fresh ? undefined : embeddedClient,
          signal
        });
        if (!isMountedRef.current || signal?.aborted) return;
        setAllEquipment(equipment);
      } catch (err) {
        if (err?.name === "AbortError") return;
        setError(err.message || "Error loading equipment");
        console.error("Error loading equipment:", err);
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
      return;
    }
    let hasFreshCache = false;
    setLoading(true);
    setError(null);
    try {
      const raw = sessionStorage.getItem(EQUIPMENT_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const isFresh = parsed?.savedAt && Array.isArray(parsed?.data) && Date.now() - parsed.savedAt < EQUIPMENT_CACHE_TTL_MS;
        if (isFresh) {
          hasFreshCache = true;
          setAllEquipment(parsed.data);
          setLoading(false);
        }
      }
    } catch (cacheError) {
      console.warn("Equipment cache unreadable, reloading from network.", cacheError);
    }
    try {
      const equipment = await getAllHardwareEquipment({
        signal
      });
      if (!isMountedRef.current || signal?.aborted) return;
      setAllEquipment(equipment);
      try {
        sessionStorage.setItem(EQUIPMENT_CACHE_KEY, JSON.stringify({
          savedAt: Date.now(),
          data: equipment
        }));
      } catch (cacheWriteError) {
        console.warn("Unable to write equipment cache.", cacheWriteError);
      }
    } catch (err) {
      if (err?.name === "AbortError") return;
      if (!hasFreshCache) {
        setError(err.message || "Error loading equipment");
      }
      console.error("Error loading equipment:", err);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };
  const customFamiliesForUi = useMemo(() => (Array.isArray(customFamilyMap) ? customFamilyMap : []), [customFamilyMap]);
  const filteredBackupRows = useMemo(() => {
    const instances = siteFilter ? filterBySite(backupInstances, siteFilter) : backupInstances;
    return mapBackupRows(instances, searchQuery);
  }, [backupInstances, searchQuery, siteFilter]);
  const embeddedTypeOrder = useMemo(() => {
    const customTypes = customFamiliesForUi.map(family => `Custom:${family.familyKey}`);
    return [...HARDWARE_TYPE_ORDER, ...customTypes];
  }, [customFamiliesForUi]);
  const getCustomFamilyItems = useCallback(family => {
    const items = Array.isArray(family?.items) ? family.items : [];
    const query = String(searchQuery || "").trim().toLowerCase();
    if (!query) return items;
    return items.filter(item => {
      const fieldValues = (family.fields || []).map(field => item.fields?.[field.fieldKey] ?? item.data?.[field.fieldKey] ?? "");
      const serial = item.serial || item.numeroSerie || item.fields?.numeroSerie || item.fields?.serial || item.data?.numeroSerie || item.data?.serial || "";
      const blob = [item.name, serial, ...fieldValues].filter(Boolean).join(" ").toLowerCase();
      if (blob.includes(query)) return true;
      const querySerial = compactSerial(query);
      return Boolean(querySerial && compactSerial(serial).includes(querySerial));
    });
  }, [searchQuery]);
  const buildCustomEquipmentDetailItem = useCallback((family, item) => mapCustomEquipmentItem(item, family, {
    clientId: item.clientId || embeddedClient?.id || fixedClientId || null,
    clientName: item.clientName || embeddedClient?.name || ""
  }), [embeddedClient, fixedClientId]);
  const baseEquipment = useMemo(() => {
    let equipment = allEquipment;
    if (embedded && fixedClientId) {
      equipment = equipment.filter(eq => eq.clientId === fixedClientId);
    }
    if (siteFilter) {
      equipment = filterBySite(equipment, siteFilter);
    }
    return equipment;
  }, [allEquipment, embedded, fixedClientId, siteFilter]);
  useEffect(() => {
    if (!embedded) {
      setEquipmentTagsMap({});
      return undefined;
    }
    const clientIds = [...new Set(baseEquipment.map(eq => getEquipmentClientId(eq)).filter(Boolean))];
    if (!clientIds.length) {
      setEquipmentTagsMap({});
      return undefined;
    }
    const controller = createTrackedAbortController();
    fetchEquipmentTagsBatch(clientIds, {
      signal: controller.signal
    }).then(rows => {
      const map = {};
      (rows || []).forEach(row => {
        const key = `${row.client_id}:${row.equipment_id}`;
        if (!map[key]) map[key] = [];
        map[key].push({
          id: row.id,
          label: row.label,
          color: row.color
        });
      });
      setEquipmentTagsMap(map);
    }).catch(err => {
      if (err?.name === "AbortError") return;
      console.warn("Unable to charger les tags devices:", err);
      setEquipmentTagsMap({});
    });
    return () => controller.abort();
  }, [embedded, baseEquipment]);
  const getEquipmentTags = useCallback(equipment => {
    const clientId = getEquipmentClientId(equipment);
    const dbId = getEquipmentDbId(equipment);
    if (!clientId || !dbId) return [];
    return equipmentTagsMap[`${clientId}:${dbId}`] || [];
  }, [equipmentTagsMap]);
  const availableClients = useMemo(() => {
    const clients = new Set();
    baseEquipment.forEach(eq => {
      if (eq.clientName && eq.clientName.trim()) {
        clients.add(eq.clientName);
      }
    });
    return Array.from(clients).sort();
  }, [baseEquipment]);
  const clientCounts = useMemo(() => {
    const counts = {};
    baseEquipment.forEach(eq => {
      if (eq.clientName) {
        counts[eq.clientName] = (counts[eq.clientName] || 0) + 1;
      }
    });
    return counts;
  }, [baseEquipment]);
  const filteredForStats = useMemo(() => {
    let filtered = [...baseEquipment];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(eq => matchesHardwareSearch(eq, query));
    }
    if (selectedClients.size > 0) {
      filtered = filtered.filter(eq => selectedClients.has(eq.clientName));
    }
    return filtered;
  }, [baseEquipment, searchQuery, selectedClients]);
  const mkAlertStats = useMemo(() => {
    let critical = 0;
    let warning = 0;
    let mapped = 0;
    filteredForStats.forEach(eq => {
      if (!isMkMappedEquipment(eq)) return;
      mapped += 1;
      const status = normalizeMkAlertStatus(getEquipmentMkSummary(eq)?.status);
      if (status === "critical") critical += 1;else if (status === "warning") warning += 1;
    });
    return {
      critical,
      warning,
      mapped,
      issues: critical + warning
    };
  }, [filteredForStats, monitoringSummaries]);
  const typeCounts = useMemo(() => {
    const counts = {};
    filteredForStats.forEach(eq => {
      const displayType = toDisplayEquipmentType(eq.type);
      counts[displayType] = (counts[displayType] || 0) + 1;
    });
    return counts;
  }, [filteredForStats]);
  const embeddedTypeCounts = useMemo(() => {
    const counts = {
      ...typeCounts
    };
    customFamiliesForUi.forEach(family => {
      counts[`Custom:${family.familyKey}`] = getCustomFamilyItems(family).length;
    });
    return counts;
  }, [typeCounts, customFamiliesForUi, getCustomFamilyItems]);
  const mkFilteredTypeCounts = useMemo(() => {
    if (!mkStatusFilter) return null;
    const counts = {};
    filteredForStats.forEach(eq => {
      if (!isMkMappedEquipment(eq)) return;
      if (!matchesMkAlertFilter(getEquipmentMkSummary(eq)?.status, mkStatusFilter)) return;
      const displayType = toDisplayEquipmentType(eq.type);
      counts[displayType] = (counts[displayType] || 0) + 1;
    });
    return counts;
  }, [filteredForStats, mkStatusFilter, monitoringSummaries]);
  const findFirstTypeMatchingMkFilter = useCallback(filterKey => {
    if (!filterKey) return null;
    const order = embedded ? embeddedTypeOrder : FILTER_TYPE_ORDER;
    return order.find(type => {
      return filteredForStats.some(eq => toDisplayEquipmentType(eq.type) === type && isMkMappedEquipment(eq) && matchesMkAlertFilter(getEquipmentMkSummary(eq)?.status, filterKey));
    }) || null;
  }, [embedded, embeddedTypeOrder, filteredForStats, monitoringSummaries]);
  const supervisionDeviceTypeOrder = useMemo(() => {
    const customTypes = customFamiliesForUi.map(family => `Custom:${family.familyKey}`);
    return [...FILTER_TYPE_ORDER, "Security camera", ...customTypes];
  }, [customFamiliesForUi]);
  const supervisionTypeCounts = embeddedTypeCounts;
  const supervisionTypeIconMap = useMemo(() => {
    const map = {
      ...TYPE_ICON_MAP
    };
    customFamiliesForUi.forEach(family => {
      map[`Custom:${family.familyKey}`] = family.icon || "mdi:devices";
    });
    return map;
  }, [customFamiliesForUi]);
  const embeddedActiveType = useMemo(() => {
    if (!embedded) return null;
    if (selectedTypes.size === 1) return [...selectedTypes][0];
    const withEquipment = embeddedTypeOrder.find(type => (embeddedTypeCounts[type] || 0) > 0);
    return withEquipment || embeddedTypeOrder[0] || EMBEDDED_DEFAULT_TYPE;
  }, [embedded, selectedTypes, embeddedTypeOrder, embeddedTypeCounts]);
  const activeCustomFamily = useMemo(() => {
    if (!embeddedActiveType?.startsWith("Custom:")) return null;
    const familyKey = embeddedActiveType.slice("Custom:".length);
    return customFamiliesForUi.find(family => family.familyKey === familyKey) || null;
  }, [embeddedActiveType, customFamiliesForUi]);
  const getEmbeddedTypeLabel = useCallback(type => {
    if (!type) return "";
    if (String(type).startsWith("Custom:")) {
      const familyKey = type.slice("Custom:".length);
      const family = customFamiliesForUi.find(entry => entry.familyKey === familyKey);
      return family?.label || familyKey;
    }
    return infraMapCopy.getHoneycombTypeLabel(type);
  }, [customFamiliesForUi, infraMapCopy]);
  const getEmbeddedTypeIcon = useCallback(type => {
    if (!type) return "mdi:devices";
    if (String(type).startsWith("Custom:")) {
      const familyKey = type.slice("Custom:".length);
      const family = customFamiliesForUi.find(entry => entry.familyKey === familyKey);
      return family?.icon || "mdi:devices";
    }
    if (type === "Backup") return "mdi:backup-restore";
    return TYPE_ICON_MAP[type] || "mdi:devices";
  }, [customFamiliesForUi]);
  const panelActiveType = useMemo(() => {
    if (embedded) return embeddedActiveType;
    return resolveMonitoringActiveType(selectedTypes, supervisionDeviceTypeOrder, supervisionTypeCounts);
  }, [embedded, embeddedActiveType, selectedTypes, supervisionDeviceTypeOrder, supervisionTypeCounts]);
  useEffect(() => {
    if (embedded || loading) return;
    setSelectedTypes(prev => {
      if (prev.size > 0) return prev;
      const defaultType = getFirstAvailableType(supervisionDeviceTypeOrder, supervisionTypeCounts, EMBEDDED_DEFAULT_TYPE);
      return new Set([defaultType]);
    });
  }, [embedded, loading, supervisionDeviceTypeOrder, supervisionTypeCounts]);
  useEffect(() => {
    if (embedded || loading) return;
    const currentType = resolveMonitoringActiveType(selectedTypes, supervisionDeviceTypeOrder, supervisionTypeCounts);
    if ((supervisionTypeCounts[currentType] || 0) > 0) return;
    const nextType = getFirstAvailableType(supervisionDeviceTypeOrder, supervisionTypeCounts, EMBEDDED_DEFAULT_TYPE);
    if (selectedTypes.size === 1 && [...selectedTypes][0] === nextType) return;
    setSelectedTypes(new Set([nextType]));
  }, [embedded, loading, searchQuery, selectedClients, supervisionTypeCounts, supervisionDeviceTypeOrder, selectedTypes]);
  const resolveMonitorStatus = useCallback(equipment => resolveEquipmentMonitorStatus(equipment, getEquipmentMkSummary(equipment), {
    checkmkEnabled: checkmkIntegrationEnabled,
    isMappable: isCheckMKMappableType(equipment?.type),
    isMapped: isMkMappedEquipment(equipment)
  }), [checkmkIntegrationEnabled, monitoringSummaries]);
  const equipmentRmmAgents = useMemo(() => filteredForStats.filter(eq => isRmmEnrolledOrdinateur(eq, toDisplayEquipmentType(eq.type))).map(eq => buildRmmAgentRowFromEquipment(eq, {
    online: resolveRmmAgentOnline(eq) ?? resolveMonitorStatus(eq) !== "offline"
  })), [filteredForStats, resolveMonitorStatus]);
  const baseTypeCounts = useMemo(() => {
    const counts = {};
    baseEquipment.forEach(eq => {
      const displayType = toDisplayEquipmentType(eq.type);
      counts[displayType] = (counts[displayType] || 0) + 1;
    });
    return counts;
  }, [baseEquipment]);
  useEffect(() => {
    if (!embedded || loading) return;
    const countsForNav = mkStatusFilter && mkFilteredTypeCounts ? mkFilteredTypeCounts : embeddedTypeCounts;
    const firstAvailable = getFirstAvailableType(embeddedTypeOrder, countsForNav, EMBEDDED_DEFAULT_TYPE);
    if (!firstAvailable) return;
    setSelectedTypes(prev => {
      if (prev.size === 0) return new Set([firstAvailable]);
      const currentType = [...prev][0];
      if (prev.size !== 1 || !embeddedTypeOrder.includes(currentType)) {
        return new Set([firstAvailable]);
      }
      if ((countsForNav[currentType] || 0) > 0) return prev;
      if (!searchQuery.trim() && !mkStatusFilter) return prev;
      if ((countsForNav[firstAvailable] || 0) === 0) return prev;
      if (currentType === firstAvailable) return prev;
      return new Set([firstAvailable]);
    });
  }, [embedded, loading, embeddedTypeOrder, embeddedTypeCounts, mkFilteredTypeCounts, mkStatusFilter, searchQuery]);
  const filteredEquipment = useMemo(() => {
    let filtered = [...baseEquipment];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(eq => matchesHardwareSearch(eq, query));
    }
    if (selectedClients.size > 0) {
      filtered = filtered.filter(eq => selectedClients.has(eq.clientName));
    }
    if (selectedTypes.size > 0) {
      filtered = filtered.filter(eq => {
        const displayType = toDisplayEquipmentType(eq.type);
        return selectedTypes.has(displayType);
      });
    }
    if (mkStatusFilter) {
      filtered = filtered.filter(eq => {
        if (!isMkMappedEquipment(eq)) return false;
        return matchesMkAlertFilter(getEquipmentMkSummary(eq)?.status, mkStatusFilter);
      });
    }
    return filtered;
  }, [baseEquipment, searchQuery, selectedClients, selectedTypes, mkStatusFilter, monitoringSummaries]);
  const equipmentWithoutTypeFilter = useMemo(() => {
    let filtered = [...baseEquipment];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(eq => matchesHardwareSearch(eq, query));
    }
    if (selectedClients.size > 0) {
      filtered = filtered.filter(eq => selectedClients.has(eq.clientName));
    }
    return filtered;
  }, [baseEquipment, searchQuery, selectedClients]);
  const equipmentByType = useMemo(() => {
    const grouped = {};
    filteredEquipment.forEach(eq => {
      const displayType = toDisplayEquipmentType(eq.type);
      if (!grouped[displayType]) {
        grouped[displayType] = [];
      }
      grouped[displayType].push(eq);
    });
    return grouped;
  }, [filteredEquipment]);
  const embeddedEquipmentCount = useMemo(() => {
    if (!embedded) return filteredEquipment.length;
    if (activeCustomFamily) return getCustomFamilyItems(activeCustomFamily).length;
    return filteredEquipment.length;
  }, [embedded, filteredEquipment.length, activeCustomFamily, getCustomFamilyItems]);
  const embeddedHardwareTotalCount = useMemo(() => {
    if (!embedded || !fixedClientId) return 0;
    return allEquipment.filter(eq => eq.clientId === fixedClientId).length;
  }, [embedded, fixedClientId, allEquipment]);
  const getColumnsForType = type => {
    const baseColumns = buildEquipmentBaseColumns(locale, pageCopy, type);
    const typeColumns = {
      Ordinateurs: ORDINATEUR_COLUMN_KEYS,
      Servers: SERVER_COLUMN_KEYS,
      Storage: STORAGE_COLUMN_KEYS,
      Firewalls: FIREWALL_COLUMN_KEYS,
      Switch: SWITCH_COLUMN_KEYS,
      BorneWifi: BORNE_WIFI_COLUMN_KEYS,
      Alimentation: SWITCH_COLUMN_KEYS,
      Routeur: SWITCH_COLUMN_KEYS,
      TOIP: SWITCH_COLUMN_KEYS,
      Internet: INTERNET_COLUMN_KEYS,
      Backup: SAUVEGARDE_COLUMN_KEYS
    };
    const defaultColumns = embedded ? EMBEDDED_TYPE_COLUMNS[type] || EMBEDDED_TYPE_COLUMNS.Servers : typeColumns[type] || typeColumns.Servers;
    let visibleCols = embedded ? defaultColumns : visibleColumns[type] || defaultColumns;
    if (embedded || embeddedClient) {
      visibleCols = visibleCols.filter(colKey => colKey !== "client");
      if (type !== "Backup" && !visibleCols.includes("mapping")) {
        visibleCols = [...visibleCols, "mapping"];
      }
    }
    if (type !== "Backup" && !visibleCols.includes("location")) {
      const ipIndex = visibleCols.indexOf("ip");
      const insertAt = ipIndex >= 0 ? ipIndex + 1 : Math.min(1, visibleCols.length);
      visibleCols = [...visibleCols.slice(0, insertAt), "location", ...visibleCols.slice(insertAt)];
    }
    const columns = visibleCols.map(colKey => {
      const col = baseColumns[colKey];
      if (!col) return null;
      if (embedded && colKey === "mapping") {
        return {
          ...col,
          label: pageCopy.actionsColumn
        };
      }
      return col;
    }).filter(Boolean);
    const extraColumns = (fieldsFor(type) || []).filter(field => field?.fieldType !== "section").map(field => ({
      key: `ext:${field.fieldKey}`,
      label: field.label || field.fieldKey,
      field
    }));
    const mappingIndex = columns.findIndex(col => col.key === "mapping" || col.key === "checkmkMapping");
    const withExtra = mappingIndex >= 0
      ? [...columns.slice(0, mappingIndex), ...extraColumns, ...columns.slice(mappingIndex)]
      : [...columns, ...extraColumns];
    if (embedded) {
      return [{
        label: "",
        key: "brandIcon"
      }, ...withExtra];
    }
    return withExtra;
  };
  const getAllAvailableColumnsForType = type => {
    const baseColumns = buildEquipmentBaseColumns(locale, pageCopy, type);
    const typeColumns = {
      'Ordinateurs': ORDINATEUR_COLUMN_KEYS,
      'Servers': SERVER_COLUMN_KEYS,
      'Storage': STORAGE_COLUMN_KEYS,
      'Firewalls': FIREWALL_COLUMN_KEYS,
      'Switch': SWITCH_COLUMN_KEYS,
      'BorneWifi': BORNE_WIFI_COLUMN_KEYS,
      'Alimentation': SWITCH_COLUMN_KEYS,
      'Routeur': SWITCH_COLUMN_KEYS,
      'TOIP': SWITCH_COLUMN_KEYS,
      'Internet': INTERNET_COLUMN_KEYS
    };
    const defaultColumns = typeColumns[type] || typeColumns['Servers'];
    const base = defaultColumns.map(colKey => {
      const col = baseColumns[colKey];
      if (!col) return null;
      return col;
    }).filter(Boolean);
    return [...base, ...(fieldsFor(type) || []).filter(field => field?.fieldType !== "section").map(field => ({
      key: `ext:${field.fieldKey}`,
      label: field.label || field.fieldKey,
      field
    }))];
  };
  const toggleColumn = (type, columnKey) => {
    setVisibleColumns(prev => {
      const typeColumns = {
        'Servers': SERVER_COLUMN_KEYS,
        'Storage': STORAGE_COLUMN_KEYS,
        'Firewalls': FIREWALL_COLUMN_KEYS,
        'Switch': SWITCH_COLUMN_KEYS,
        'BorneWifi': BORNE_WIFI_COLUMN_KEYS,
        'Alimentation': SWITCH_COLUMN_KEYS,
        'Routeur': SWITCH_COLUMN_KEYS,
        'TOIP': SWITCH_COLUMN_KEYS,
        'Internet': INTERNET_COLUMN_KEYS
      };
      const defaultColumns = typeColumns[type] || typeColumns['Servers'];
      const currentVisible = prev[type] || defaultColumns;
      const newVisible = currentVisible.includes(columnKey) ? currentVisible.filter(key => key !== columnKey) : [...currentVisible, columnKey];
      if (newVisible.length === 0) {
        return prev;
      }
      return {
        ...prev,
        [type]: newVisible
      };
    });
  };
  const toggleType = type => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };
  const toggleClient = clientName => {
    setSelectedClients(prev => {
      const next = new Set(prev);
      if (next.has(clientName)) {
        next.delete(clientName);
      } else {
        next.add(clientName);
      }
      return next;
    });
  };
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedClients(new Set());
    setSelectedTypes(new Set());
    setMkStatusFilter(null);
  };
  const toggleMkStatusFilter = filterKey => {
    const next = mkStatusFilter === filterKey ? null : filterKey;
    setMkStatusFilter(next);
    if (!next) return;
    const currentType = selectedTypes.size === 1 ? [...selectedTypes][0] : null;
    const currentHasMatch = Boolean(currentType && filteredForStats.some(eq => toDisplayEquipmentType(eq.type) === currentType && isMkMappedEquipment(eq) && matchesMkAlertFilter(getEquipmentMkSummary(eq)?.status, next)));
    if (currentHasMatch) return;
    const firstType = findFirstTypeMatchingMkFilter(next);
    if (firstType) setSelectedTypes(new Set([firstType]));
  };
  const handleTypeCardClick = type => {
    setSelectedTypes(prev => {
      if (embedded) {
        if (prev.size === 1 && prev.has(type)) return prev;
        return new Set([type]);
      }
      if (prev.size === 1 && prev.has(type)) return new Set();
      return new Set([type]);
    });
  };
  const handleTotalCardClick = () => {
    setSelectedTypes(new Set());
    setSelectedClients(new Set());
    setSearchQuery("");
    setMkStatusFilter(null);
  };
  const activeFiltersCount = (searchQuery.trim() !== "" ? 1 : 0) + selectedClients.size + selectedTypes.size + (mkStatusFilter ? 1 : 0);
  const hasActiveFilters = activeFiltersCount > 0;
  const handleTableSort = (type, colKey) => {
    if (!isColumnSortable(colKey)) return;
    setTableSort(prev => {
      const current = prev[type];
      const nextDir = current?.key === colKey && current?.direction === "asc" ? "desc" : "asc";
      return {
        ...prev,
        [type]: {
          key: colKey,
          direction: nextDir
        }
      };
    });
  };
  const getSortValue = (equipment, colKey, type, fieldType) => {
    if (String(colKey).startsWith("ext:")) {
      const rawExt = readExtensionFieldValue(equipment, String(colKey).slice(4));
      if (rawExt == null) return "";
      if (typeof rawExt === "boolean") return rawExt ? 1 : 0;
      return toSortScalar(rawExt);
    }
    if (String(type || "").startsWith("Custom:")) {
      if (colKey === "name") {
        return toSortScalar(equipment?.name || equipment?.fields?.name || equipment?.data?.name);
      }
      if (colKey === "activeStatus") {
        return readEquipmentIsActive(equipment) ? 1 : 0;
      }
      if (colKey === "location" || colKey === "site") {
        return getEquipmentLocationSortValue(equipment) || toSortScalar(readCustomFieldRaw(equipment, colKey));
      }
      if (["purchaseDate", "installDate", "expirationGarantie", "date_facturation", "dateFacturation"].includes(colKey)) {
        const rawDate = readSharedEquipmentFieldValue(equipment, colKey) || readCustomFieldRaw(equipment, colKey);
        return coerceCustomSortValue(rawDate, "date");
      }
      return coerceCustomSortValue(readCustomFieldRaw(equipment, colKey), fieldType);
    }
    const raw = equipment?.[colKey];
    const rawData = equipment?.rawData || {};
    const stripClientCodePrefix = value => (value || "").toString().trim().replace(/^\d+\s*[-\s]*\s*/, "").toLowerCase();
    if (colKey === "checkmkMapping" || colKey === "mapping") {
      const mapping = equipment.checkmkMapping;
      const isMapped = mapping && mapping.checkmk_host_name && mapping.is_active !== false;
      return isMapped ? "Mapped" : "Not mapped";
    }
    if (colKey === "clientName") {
      return stripClientCodePrefix(raw);
    }
    if (colKey === "name") {
      return toSortScalar(equipment?.name || rawData.name || raw);
    }
    if (colKey === "model") {
      return toSortScalar(equipment?.model || rawData.model || raw);
    }
    if (colKey === "fournisseur") {
      return toSortScalar(equipment?.fournisseur || rawData.fournisseur || raw);
    }
    if (colKey === "version") {
      return toSortScalar(equipment?.version || equipment?.firmware || rawData.version || raw);
    }
    if (colKey === "server") {
      return toSortScalar(equipment?.server || raw);
    }
    if (colKey === "jobsCount" || colKey === "mappedJobsCount") {
      const count = Number(raw);
      return Number.isFinite(count) ? count : 0;
    }
    if (colKey === "location") {
      return getEquipmentLocationSortValue(equipment);
    }
    if (colKey === "activeStatus") {
      return readEquipmentIsActive(equipment) ? 1 : 0;
    }
    if (colKey === "monitoring") {
      if (!isCheckMKMappableType(equipment?.type)) return 0;
      if (!isMkMappedEquipment(equipment)) return 1;
      const status = normalizeMkAlertStatus(getEquipmentMkSummary(equipment)?.status);
      if (status === "critical") return 4;
      if (status === "warning") return 3;
      return 2;
    }
    if (colKey === "agentStatus") {
      return resolveRmmAgentOnline(equipment) ? 1 : 0;
    }
    if (colKey === "ssidCount") {
      const ssids = Array.isArray(equipment?.ssids)
        ? equipment.ssids
        : Array.isArray(rawData.ssids)
          ? rawData.ssids
          : Array.isArray(equipment?.assignedSsids)
            ? equipment.assignedSsids
            : Array.isArray(rawData.assignedSsids)
              ? rawData.assignedSsids
              : [];
      return ssids.length;
    }
    if (colKey === "disksUsage" || colKey === "nbDisques") {
      const eq = equipment;
      const type = eq?.rawData?.type || eq?.type || "";
      if (type === "Disque dur externe") return 1;
      const actuel = parseFloat(eq?.nbDisquesActuels ?? eq?.rawData?.nbDisquesActuels ?? eq?.nbDisques ?? eq?.rawData?.nb_disques);
      return Number.isNaN(actuel) ? 0 : actuel;
    }
    if (colKey === "powerRating") {
      const va = parseFloat(equipment?.capaciteVA ?? rawData.capaciteVA);
      return Number.isNaN(va) ? 0 : va;
    }
    if (colKey === "ip") {
      if (equipment?.type === "Internet" && (equipment?.ipNonFixe || rawData.ipNonFixe)) return "zzz-non-fixed";
      return toSortScalar(equipment?.ip || rawData.ip || raw);
    }
    if (colKey === "mac" || colKey === "adresseMac") {
      return toSortScalar(equipment?.adresseMac || equipment?.mac || rawData.adresseMac || rawData.mac || raw);
    }
    if (colKey === "debit") {
      return toSortScalar(formatInternetDebitDisplay(rawData || equipment) || equipment?.debit || raw);
    }
    if (colKey === "nbDisquesActuels" || colKey === "nbDisquesMax") {
      const str = colKey === "nbDisquesActuels" ? getNbDisquesActuels(equipment) : getNbDisquesMax(equipment);
      const num = parseFloat(str);
      return isNaN(num) ? 0 : num;
    }
    if (colKey === "raid") {
      return getStorageRaid(equipment).toLowerCase();
    }
    if (colKey === "ha") {
      return getFirewallHaSortValue(equipment);
    }
    if (colKey === "capacite") {
      const c = equipment.capacite || rawData.capacite;
      if (!c || c === "") return 0;
      const str = String(c).toUpperCase().replace(/GB|GO/gi, "").trim();
      const num = parseFloat(str);
      return isNaN(num) ? 0 : num;
    }
    if (colKey === "installDate" || colKey === "uptime" || colKey === "expirationGarantie") {
      if (!raw) return 0;
      const d = new Date(raw);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    }
    if (colKey === "maintenanceLicense") {
      return getFirewallMaintenanceLicenseDate(equipment).toLowerCase();
    }
    if (colKey === "firmware") {
      const fw = equipment.firmware || equipment.version || rawData.firmware || raw;
      return fw != null ? String(fw).toLowerCase() : "";
    }
    if (colKey === "vlan") {
      const vlan = equipment.vlan || rawData.vlan || raw;
      return vlan != null ? String(vlan).toLowerCase() : "";
    }
    if (colKey === "role") {
      const roles = Array.isArray(raw) ? raw : raw ? [raw] : equipment.role || [];
      return Array.isArray(roles) ? roles.join(", ").toLowerCase() : String(roles).toLowerCase();
    }
    if (colKey === "systeme") {
      const os = equipment.systeme || rawData.systeme || raw;
      return os != null ? String(os).toLowerCase() : "";
    }
    if (colKey === "computerType") {
      return formatComputerTypeDisplay(equipment.computerType || rawData.type || raw, locale).toLowerCase();
    }
    if (colKey === "serial") {
      return getEquipmentSerial(equipment).toLowerCase();
    }
    if (typeof raw === "number" && !Number.isNaN(raw)) return raw;
    if (raw != null && typeof raw === "object") return toSortScalar(raw);
    if ((raw == null || raw === "") && rawData[colKey] != null) return toSortScalar(rawData[colKey]);
    return raw != null ? String(raw).toLowerCase() : "";
  };
  const getSortedEquipmentList = (type, list, fieldTypes = {}) => {
    const sortState = tableSort[type];
    if (!sortState?.key) {
      if (type === "Firewalls" || type === "Servers" || type === "Storage") {
        return [...list].sort(compareFirewallHaPairs);
      }
      return list;
    }
    const key = sortState.key;
    const dir = sortState.direction === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      const va = getSortValue(a, key, type, fieldTypes[key]);
      const vb = getSortValue(b, key, type, fieldTypes[key]);
      if (typeof va === "number" && typeof vb === "number") {
        return (va - vb) * dir;
      }
      const sa = String(va);
      const sb = String(vb);
      return sa.localeCompare(sb, undefined, {
        numeric: true
      }) * dir;
    });
  };
  const getTypeIcon = type => {
    const icons = {
      'Ordinateurs': FaDesktop,
      'Servers': FaServer,
      'Storage': FaHdd,
      'Firewalls': FaShieldAlt,
      'Switch': FaNetworkWired,
      'BorneWifi': FaWifi,
      'Alimentation': FaCube,
      'Routeur': FaNetworkWired,
      'TOIP': FaCube,
      'Internet': FaGlobe,
      'Security camera': FaCamera
    };
    return icons[type] || FaServer;
  };
  const renderFirewallBrandIcon = (equipment, {
    card = false
  } = {}) => <FirewallBrandIcon brand={getEquipmentFirewallBrandId(equipment) || equipment.manufacturer} className={`${card ? styles.cardIcon : styles.typeIconSmall} ${styles.typeBrandIconSmall}`} />;
  const renderRouterBrandIcon = (equipment, {
    card = false
  } = {}) => <RouterBrandIcon brand={getEquipmentRouterBrandId(equipment) || equipment.manufacturer} className={`${card ? styles.cardIcon : styles.typeIconSmall} ${styles.typeBrandIconSmall}`} />;
  const renderServerBrandIcon = (equipment, {
    card = false
  } = {}) => <ServerBrandIcon brand={getEquipmentServerBrandId(equipment) || equipment.manufacturer} className={`${card ? styles.cardIcon : styles.typeIconSmall} ${styles.typeBrandIconSmall}`} />;
  const renderServerNameIcon = (equipment, {
    card = false
  } = {}) => {
    const serverType = normalizeServerType(equipment.typeServer || equipment.rawData?.type || equipment.type || "");
    if (serverType === "virtuel") {
      return <Icon icon="mdi:cloud-outline" className={card ? styles.cardIcon : styles.typeIconSmall} width={card ? 24 : 16} height={card ? 24 : 16} aria-hidden />;
    }
    return renderServerBrandIcon(equipment, {
      card
    });
  };
  const getInternetConnectionIcon = equipment => {
    const type = (equipment?.rawData?.type || equipment?.type || "").toLowerCase();
    const nom = (equipment?.name || equipment?.rawData?.nom || "").toLowerCase();
    const fournisseur = (equipment?.rawData?.fournisseur || equipment?.fournisseur || "").toLowerCase();
    const combined = `${type} ${nom} ${fournisseur}`;
    const commonStyle = {
      color: "#000000",
      verticalAlign: "middle",
      display: "inline-block",
      width: "16px",
      height: "16px"
    };
    if (type.includes("fibre") || type.includes("fiber") || combined.includes("fibre") || combined.includes("fiber")) {
      return <Icon icon="streamline-ultimate:fiber-access-1" width={16} height={16} style={commonStyle} />;
    }
    if (type.includes("5g") || combined.includes("5g")) {
      return <Icon icon="material-symbols:5g-mobiledata-badge" width={16} height={16} style={commonStyle} />;
    }
    if (type.includes("4g") || combined.includes("4g") || type.includes("lte") || combined.includes("lte")) {
      return <Icon icon="material-symbols:4g-mobiledata-badge" width={16} height={16} style={commonStyle} />;
    }
    if (type.includes("adsl") || combined.includes("adsl") || type.includes("dsl") || combined.includes("dsl")) {
      return <Icon icon="mdi:ethernet-cable" width={16} height={16} style={commonStyle} />;
    }
    if (type.includes("satellite") || combined.includes("satellite")) {
      return <Icon icon="tabler:satellite" width={16} height={16} style={commonStyle} />;
    }
    if (type.includes("wifi") || combined.includes("wifi") || type.includes("wireless") || combined.includes("wireless")) {
      return <Icon icon="mdi:wifi" width={16} height={16} style={commonStyle} />;
    }
    if (type.includes("ethernet") || combined.includes("ethernet") || type.includes("cable") || combined.includes("cable")) {
      return <Icon icon="mdi:network" width={16} height={16} style={commonStyle} />;
    }
    return <Icon icon="mdi:router-wireless" width={16} height={16} style={commonStyle} />;
  };
  const getStorageIcon = equipment => {
    const storageType = equipment?.rawData?.type || equipment?.type || '';
    const typeLower = storageType.toLowerCase();
    if (typeLower.includes('san')) {
      return 'mdi:server-network-outline';
    } else if (typeLower.includes('robot')) {
      return 'mdi:vhs';
    } else if (typeLower.includes('disque')) {
      return 'mdi:harddisk';
    } else {
      return 'mdi:nas';
    }
  };
  const formatUptime = uptime => {
    if (!uptime) return '-';
    if (typeof uptime === 'string') return uptime;
    return '-';
  };
  const getFirewallMaintenanceLicenseDate = equipment => {
    const licences = equipment?.licences || equipment?.rawData?.licences || [];
    if (!Array.isArray(licences)) return '';
    const maintenanceLicense = licences.find(licence => {
      const nom = (licence?.nom || '').toLowerCase();
      return nom.includes('maintenance');
    });
    if (!maintenanceLicense?.expiration) return '';
    const expirationDate = new Date(maintenanceLicense.expiration);
    if (isNaN(expirationDate.getTime())) return maintenanceLicense.expiration;
    return expirationDate.toLocaleDateString('en-US');
  };
  const renderExpirationDateCell = (rawDate, formattedLabel) => {
    const label = formattedLabel || "-";
    if (!label || label === "-") return "-";
    const status = getExpirationStatus(rawDate);
    const color = getExpirationStatusColor(status);
    if (!color) return label;
    return <span style={{
      color,
      fontWeight: 500
    }}>{label}</span>;
  };
  const getFirewallMaintenanceLicenseRawDate = equipment => {
    const licences = equipment?.licences || equipment?.rawData?.licences || [];
    return getMaintenanceLicenseExpiration(licences);
  };
  const formatRoles = role => {
    if (!role) return "";
    const optionsCopy = getEquipmentFormOptionsCopy(locale);
    const list = Array.isArray(role) ? role : [role];
    return list.map(item => getRoleOptionLabel(locale, item, optionsCopy)).filter(Boolean).join(", ");
  };
  const formatDate = date => {
    if (!date) return '-';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('en-US');
    } catch {
      return '-';
    }
  };
  const formatValue = value => {
    if (value === null || value === undefined || value === '') return '-';
    return String(value);
  };
  const formatOsValue = value => {
    const label = repairOsLabel(formatValue(value));
    return label || "-";
  };
  const formatIpDisplay = (equipment, value) => {
    if (equipment?.type === "Internet" && equipment?.ipNonFixe) {
      return "Non-fixed IP";
    }
    return formatValue(value);
  };
  const formatClientDisplay = value => {
    if (value === null || value === undefined || value === '') return '-';
    return String(value).replace(/\s*-\s*/g, ' ');
  };
  const copyToClipboard = async (text, label) => {
    const raw = (text || "").toString().trim();
    if (!raw) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(raw);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = raw;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      toast.success(`${label} copied`, {
        position: "bottom-right"
      });
    } catch {
      toast.error(`Unable to copy ${label.toLowerCase()}`, {
        position: "bottom-right"
      });
    }
  };
  const buildEquipmentSharePayload = (equipment, clientDisplay) => {
    const name = (equipment?.name || "").toString().trim() || "Equipment";
    const type = (equipment?.customFamily?.label || equipment?.type || "").toString().trim();
    const client = (clientDisplay || equipment?.clientName || "").toString().trim();
    const ip = (equipment?.ip || "").toString().trim();
    const serial = (equipment?.serial || "").toString().trim();
    const location = (equipment?.location || "").toString().trim();
    const mappingName = equipment?.checkmkMapping?.checkmk_host_name || "";
    const lines = [`Equipment: ${name}`, type ? `Type: ${type}` : null, client ? `Client: ${client}` : null, location ? `Site: ${location}` : null, ip ? `IP: ${ip}` : null, serial ? `S/N: ${serial}` : null, mappingName ? `CheckMK: ${mappingName}` : null].filter(Boolean);
    return {
      title: interpolate(actions.sharePayloadTitle, {
        name
      }),
      text: lines.join("\n")
    };
  };
  const shareEquipment = async (equipment, clientDisplay) => {
    const payload = buildEquipmentSharePayload(equipment, clientDisplay);
    try {
      if (navigator?.share) {
        await navigator.share({
          title: payload.title,
          text: payload.text
        });
      }
    } catch {}
  };
  const buildEmptyEquipmentForAdd = (moduleKey, client) => ({
    clientId: client.id,
    clientName: client.name || "",
    type: moduleKey === "Storage" ? "NAS" : moduleKey,
    name: "",
    rawData: {
      type: moduleKey === "Storage" ? "NAS" : moduleKey
    }
  });
  const mapCreatedRowToListItem = (row, moduleKey, client, formData) => {
    const base = {
      id: row.id,
      clientId: client.id,
      clientName: client.name || "",
      type: moduleKey === "Storage" ? "NAS" : moduleKey,
      name: row.name || formData.name || "",
      model: "",
      mac: "",
      ip: formData.ip || "",
      location: formData.location || "",
      is_active: readEquipmentIsActive({
        ...row,
        ...formData,
        data: row.data,
        rawData: row.data
      }),
      rawData: {
        ...(row.data || {}),
        id: row.id,
        nom: row.name
      }
    };
    return patchEquipmentFromFormData(base, formData, moduleKey);
  };
  const snapshotModalClient = client => {
    if (!client) return null;
    const ssids = Array.isArray(client.ssids) && client.ssids.length
      ? [...client.ssids]
      : Array.isArray(client.ssid) && client.ssid.length
        ? [...client.ssid]
        : Array.isArray(client.ssids)
          ? [...client.ssids]
          : client.ssids || client.ssid;
    return {
      ...client,
      sites: Array.isArray(client.sites) ? [...client.sites] : client.sites,
      ssid: ssids,
      ssids
    };
  };
  const openEditEquipmentModal = (equipment, displayType) => {
    if (!embeddedClient || !isEquipmentEditable(equipment, displayType)) return;
    setEditEquipmentModal({
      open: true,
      mode: "edit",
      equipment,
      moduleKey: getEditModuleKey(equipment, displayType),
      client: snapshotModalClient(embeddedClient)
    });
  };
  const openAddEquipmentForm = (moduleKey, client) => {
    const resolvedClient = client || embeddedClient;
    setEditEquipmentModal({
      open: true,
      mode: "add",
      equipment: buildEmptyEquipmentForAdd(moduleKey, resolvedClient),
      moduleKey,
      client: snapshotModalClient(resolvedClient)
    });
  };
  const openAddEquipmentModal = () => {
    setAddFlowOpen(true);
  };
  const handleAddFlowReady = (moduleKey, client) => {
    openAddEquipmentForm(moduleKey, client);
  };
  const editModalPeerFirewalls = useMemo(() => {
    if (!editEquipmentModal.open) return [];
    const clientId = editEquipmentModal.client?.id || embeddedClient?.id || fixedClientId || null;
    if (!clientId) return [];
    return allEquipment.filter(eq => eq.type === "Firewalls" && String(eq.clientId) === String(clientId));
  }, [allEquipment, editEquipmentModal.open, editEquipmentModal.client?.id, embeddedClient?.id, fixedClientId]);
  const editModalPeerServers = useMemo(() => {
    if (!editEquipmentModal.open) return [];
    const clientId = editEquipmentModal.client?.id || embeddedClient?.id || fixedClientId || null;
    if (!clientId) return [];
    return allEquipment.filter(eq => (eq.type === "Servers" || eq.type === "Serveurs") && String(eq.clientId) === String(clientId));
  }, [allEquipment, editEquipmentModal.open, editEquipmentModal.client?.id, embeddedClient?.id, fixedClientId]);
  const editModalPeerStorage = useMemo(() => {
    if (!editEquipmentModal.open) return [];
    const clientId = editEquipmentModal.client?.id || embeddedClient?.id || fixedClientId || null;
    if (!clientId) return [];
    return allEquipment.filter(eq => (eq.type === "NAS" || eq.type === "Storage" || eq.type === "Stockage") && String(eq.clientId) === String(clientId));
  }, [allEquipment, editEquipmentModal.open, editEquipmentModal.client?.id, embeddedClient?.id, fixedClientId]);
  const editModalPeerBorneWifi = useMemo(() => {
    if (!editEquipmentModal.open) return [];
    const clientId = editEquipmentModal.client?.id || embeddedClient?.id || fixedClientId || null;
    if (!clientId) return [];
    return allEquipment.filter(eq => eq.type === "BorneWifi" && String(eq.clientId) === String(clientId));
  }, [allEquipment, editEquipmentModal.open, editEquipmentModal.client?.id, embeddedClient?.id, fixedClientId]);
  useEffect(() => {
    if (addFlowOpen && editEquipmentModal.open) {
      setAddFlowOpen(false);
    }
  }, [addFlowOpen, editEquipmentModal.open]);
  const closeEditEquipmentModal = () => {
    setEditEquipmentModal({
      open: false,
      equipment: null,
      moduleKey: null,
      mode: "edit",
      client: null
    });
  };
  const applyEquipmentUpdateInList = (referenceEquipment, update, moduleKey) => {
    if (!referenceEquipment || !update) return;
    setAllEquipment(prev => {
      const next = prev.map(eq => isSameEquipmentItem(eq, referenceEquipment) ? mergeEquipmentListItem(eq, update, moduleKey) : eq);
      persistEquipmentCache(next);
      return next;
    });
  };
  const refreshEmbeddedEquipment = async moduleKey => {
    if (!embedded) return;
    await onEquipmentChanged?.();
    await loadEquipment(undefined, {
      fresh: true
    });
    if (moduleKey) {
      const displayType = moduleKey === "NAS" ? "Storage" : moduleKey;
      if (String(displayType).startsWith("Custom:")) {
        setSelectedTypes(new Set([displayType]));
        return;
      }
      setSelectedTypes(new Set([displayType]));
    }
  };
  const refreshAfterEquipmentSave = async moduleKey => {
    if (!embedded) {
      loadEquipment();
      return;
    }
    await refreshEmbeddedEquipment(moduleKey);
  };
  const handleEquipmentSaved = async (formData, createdRow, sourceEquipment) => {
    const {
      equipment: modalEquipment,
      moduleKey,
      mode
    } = editEquipmentModal;
    const equipment = sourceEquipment || modalEquipment;
    const syncClientWifiCatalog = () => {
      if (moduleKey !== "BorneWifi" || !Array.isArray(formData?.clientSsids)) return;
      const nextSsids = serializeWifiSsidCatalogForPersistence(formData.clientSsids);
      setEditEquipmentModal(prev => ({
        ...prev,
        client: prev.client ? {
          ...prev.client,
          ssid: nextSsids,
          ssids: nextSsids
        } : prev.client
      }));
      if (typeof onClientSsidsUpdated === "function") {
        onClientSsidsUpdated(nextSsids);
      }
    };
    const finalizeSave = async successMessage => {
      try {
        await refreshAfterEquipmentSave(moduleKey);
      } catch (refreshErr) {
        console.warn("Refresh equipment after save:", refreshErr);
      }
      toast.success(successMessage);
    };
    if (mode === "add") {
      const addClient = embeddedClient || editEquipmentModal.client;
      if (!addClient || !formData) {
        await finalizeSave("Equipment added");
        return;
      }
      const newItem = createdRow ? mapCreatedRowToListItem(createdRow, moduleKey, addClient, formData) : patchEquipmentFromFormData(equipment, formData, moduleKey);
      setAllEquipment(prev => {
        const next = [...prev, newItem];
        persistEquipmentCache(next);
        return next;
      });
      await finalizeSave("Equipment added");
      syncClientWifiCatalog();
      return;
    }
    if (!equipment || !formData) {
      await finalizeSave("Equipment updated");
      syncClientWifiCatalog();
      return;
    }
    applyEquipmentUpdateInList(equipment, formData, moduleKey);
    await finalizeSave("Equipment updated");
    syncClientWifiCatalog();
  };
  const handleEquipmentDeleted = async deletedEquipment => {
    if (!deletedEquipment) return;
    setAllEquipment(prev => {
      const next = prev.filter(eq => !isSameEquipmentItem(eq, deletedEquipment));
      persistEquipmentCache(next);
      return next;
    });
    if (embedded) {
      await onEquipmentChanged?.();
      await loadEquipment(undefined, {
        fresh: true
      });
    }
  };
  const openRmmRevokeModal = equipment => {
    if (!getRmmAgentId(equipment)) {
      toast.error("RMM agent not found for this device");
      return;
    }
    setRmmRevokeTarget(equipment);
  };
  const handleConfirmRmmRevoke = async () => {
    const equipment = rmmRevokeTarget;
    if (!equipment) return;
    const agentId = getRmmAgentId(equipment);
    if (!agentId) {
      toast.error("RMM agent not found for this device");
      setRmmRevokeTarget(null);
      return;
    }
    setRmmRevoking(true);
    try {
      await updateRmmAgentStatus(agentId, "revoked");
      handleEquipmentDeleted(equipment);
      setRmmRevokeTarget(null);
      toast.success("Agent revoked");
    } catch (err) {
      toast.error(err.message || "Error revoking agent");
    } finally {
      setRmmRevoking(false);
    }
  };
  const canShowEditEquipmentButton = (equipment, displayType) => embeddedClient && isEquipmentEditable(equipment, displayType);
  const renderEditEquipmentButton = (equipment, displayType) => {
    if (!canShowEditEquipmentButton(equipment, displayType)) return null;
    return <button type="button" className={styles.mappingActionButton} title="Edit equipment" aria-label="Edit equipment" onClick={e => {
      e.stopPropagation();
      openEditEquipmentModal(equipment, displayType);
    }}>
        <Icon icon="mdi:pencil" width={16} height={16} />
      </button>;
  };
  const renderEditEquipmentActionGroup = (equipment, displayType) => {
    if (!canShowEditEquipmentButton(equipment, displayType)) return null;
    return <div className={styles.mappingActionsEdit}>
        <span className={styles.mappingActionsSeparator} aria-hidden="true" />
        {renderEditEquipmentButton(equipment, displayType)}
      </div>;
  };
  const handleEquipmentOpen = equipment => {
    if (onNavigate) {
      onNavigate("EquipmentDetail", equipment);
    } else {
      setSelectedEquipment(equipment);
    }
  };
  const handleEquipmentMiddleClick = (e, equipment) => {
    if (!onNavigate) return;
    e.preventDefault();
    e.stopPropagation();
    onNavigate("EquipmentDetail", equipment, {
      background: true
    });
  };
  const openEquipmentAccess = equipment => {
    if (equipment?.type === "Servers") {
      openServerRemoteAccess(equipment);
      return;
    }
    const storageTypeValue = (equipment?.rawData?.type || equipment?.type || '').toString().toLowerCase();
    const isNasOrSanStorage = equipment?.type === 'NAS' && (storageTypeValue.includes('nas') || storageTypeValue.includes('san'));
    const quickConnect = isNasOrSanStorage ? equipment?.quickConnect || equipment?.rawData?.quickConnect || equipment?.rawData?.data?.quickConnect || "" : "";
    if (quickConnect) {
      const rawUrl = String(quickConnect).trim();
      if (!rawUrl) return;
      const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };
  const canShowRemoteAccessButton = equipment => {
    const type = String(equipment?.type || "").toLowerCase();
    return type === "serveurs" || type === "serveur" || type === "servers" || type === "server";
  };
  const canShowQuickConnectButton = (equipment, displayType) => {
    const isStorage = displayType === "Storage" || equipment?.type === "NAS" || equipment?.type === "Storage";
    return isStorage && isSynologyStorage(equipment);
  };
  const formatServerRemoteTitle = equipment => {
    if (!hasServerRemoteAccessConfigured(equipment)) {
      return actions.serverRemoteNotConfigured;
    }
    const {
      solution,
      id
    } = readServerRemoteAccess(equipment);
    const def = getServerRemoteAccessSolutionDef(solution);
    const label = def?.label || actions.serverRemote;
    return interpolate(actions.serverRemoteTooltip, {
      label,
      id
    });
  };
  const renderQuickConnectButton = (equipment, displayType) => {
    if (!canShowQuickConnectButton(equipment, displayType)) return null;
    const configured = hasSynologyQuickConnectConfigured(equipment);
    const quickConnectValue = getSynologyQuickConnectValue(equipment);
    return <button type="button" className={`${styles.mappingActionButton} ${configured ? styles.mappingActionButtonRemoteActive : ""}`} title={configured ? interpolate(actions.quickConnectOpen, {
      value: quickConnectValue
    }) : actions.quickConnectMissing} aria-label={actions.quickConnect} onClick={e => {
      e.stopPropagation();
      openQuickConnectUrl(equipment);
    }}>
        <Icon icon={EQUIPMENT_REMOTE_ACTION_ICON} width={16} height={16} />
      </button>;
  };
  const renderUnifiApiButton = equipment => {
    if (!isUnifiUdmGateway(equipment)) return null;
    const configured = hasUnifiApiConfigured(equipment);
    return <button type="button" className={`${styles.mappingActionButton} ${configured ? styles.mappingActionButtonActive : ""}`} title={configured ? actions.unifiEdit : actions.unifiConfigure} aria-label={actions.unifiAria} onClick={e => {
      e.stopPropagation();
      setUnifiApiModalEquipment(equipment);
    }}>
        <Icon icon="simple-icons:ubiquiti" width={16} height={16} />
      </button>;
  };
  const renderRemoteAccessButton = equipment => {
    if (!supportsRemoteAccess(equipment)) return null;
    const configured = hasEquipmentRemoteAccessConfigured(equipment);
    const accessUrl = getRemoteAccessUrl(equipment);
    const accessLabel = getEquipmentRemoteAccessLabel(locale, configured);
    return <button type="button" className={`${styles.mappingActionButton} ${configured ? styles.mappingActionButtonRemoteActive : ""}`} title={formatEquipmentRemoteAccessTooltip(locale, {
      configured,
      url: accessUrl,
      equipmentType: equipment?.type
    })} aria-label={accessLabel} disabled={!configured} onClick={e => {
      e.stopPropagation();
      openRemoteAccess(equipment);
    }}>
        <Icon icon={EQUIPMENT_REMOTE_ACTION_ICON} width={16} height={16} />
      </button>;
  };
  const openCheckMKMapping = equipment => {
    if (!checkmkIntegrationEnabled) return;
    setMappingModalEquipment(equipment);
  };
  const buildEmbeddedEquipmentMenuItems = (equipment, displayType) => {
    const clientDisplay = formatClientDisplay(equipment.clientName || "");
    const mapping = equipment.checkmkMapping;
    const isMapped = mapping && mapping.checkmk_host_name && mapping.is_active !== false;
    const items = [];
    if (canShowEditEquipmentButton(equipment, displayType)) {
      items.push({
        id: "edit",
        icon: "mdi:pencil-outline",
        label: actions.editEquipment,
        onClick: () => openEditEquipmentModal(equipment, displayType)
      });
    }
    items.push({
      id: "open",
      icon: "mdi:open-in-new",
      label: actions.openSheet,
      onClick: () => handleEquipmentOpen(equipment)
    });
    if (checkmkIntegrationEnabled) {
      items.push({
        id: "checkmk",
        icon: "simple-icons:checkmk",
        label: isMapped ? `CheckMK : ${mapping.checkmk_host_name}` : actions.checkmkMap,
        active: isMapped,
        onClick: () => openCheckMKMapping(equipment)
      });
    }
    if (isUnifiUdmGateway(equipment)) {
      const configured = hasUnifiApiConfigured(equipment);
      items.push({
        id: "unifi",
        icon: "simple-icons:ubiquiti",
        label: configured ? "Edit UniFi API" : "Configure UniFi API",
        active: configured,
        onClick: () => setUnifiApiModalEquipment(equipment)
      });
    }
    if (canShowQuickConnectButton(equipment, displayType)) {
      const configured = hasSynologyQuickConnectConfigured(equipment);
      const quickConnectValue = getSynologyQuickConnectValue(equipment);
      items.push({
        id: "quickconnect",
        icon: EQUIPMENT_REMOTE_ACTION_ICON,
        label: configured ? interpolate(actions.quickConnectWithValue, {
          value: quickConnectValue
        }) : actions.quickConnectNotConfigured,
        disabled: !configured,
        active: configured,
        onClick: () => openQuickConnectUrl(equipment)
      });
    }
    if (canShowRemoteAccessButton(equipment) && hasServerRemoteAccessConfigured(equipment)) {
      const {
        id
      } = readServerRemoteAccess(equipment);
      items.push({
        id: "server-remote",
        icon: EQUIPMENT_REMOTE_ACTION_ICON,
        label: interpolate(actions.serverRemoteWithId, {
          label: actions.serverRemote,
          id
        }),
        active: true,
        onClick: () => openServerRemoteAccess(equipment)
      });
    } else if (supportsRemoteAccess(equipment) && hasEquipmentRemoteAccessConfigured(equipment)) {
      const accessUrl = getRemoteAccessUrl(equipment);
      const accessLabel = getEquipmentRemoteAccessLabel(locale, true);
      items.push({
        id: "remote-access",
        icon: EQUIPMENT_REMOTE_ACTION_ICON,
        label: interpolate(actions.remoteAccessWithUrl, {
          label: accessLabel,
          url: accessUrl
        }),
        active: true,
        onClick: () => openRemoteAccess(equipment)
      });
    }
    items.push({
      type: "divider"
    });
    items.push({
      id: "copy",
      icon: "mdi:content-copy",
      label: actions.copySheet,
      onClick: () => {
        const payload = buildEquipmentSharePayload(equipment, clientDisplay);
        copyToClipboard(payload.text, actions.copySheetToast);
      }
    }, {
      id: "share",
      icon: "mdi:share-variant",
      label: actions.shareSheet,
      onClick: () => shareEquipment(equipment, clientDisplay)
    });
    if (userRole === "admin" && isRmmEnrolledOrdinateur(equipment, displayType)) {
      items.push({
        type: "divider"
      });
      items.push({
        id: "rmm-revoke",
        icon: "mdi:link-off",
        label: actions.revokeRmmAgent,
        danger: true,
        onClick: () => openRmmRevokeModal(equipment)
      });
    }
    return items;
  };
  const buildCustomEmbeddedMenuItems = (family, item) => {
    const equipment = buildCustomEquipmentDetailItem(family, item);
    const clientDisplay = formatClientDisplay(equipment.clientName || "");
    const items = [];
    if (onCustomFamilyManage) {
      items.push({
        id: "edit",
        icon: "mdi:pencil-outline",
        label: actions.editEquipment,
        onClick: () => onCustomFamilyManage(family, item)
      });
    }
    items.push({
      id: "open",
      icon: "mdi:open-in-new",
      label: actions.openSheet,
      onClick: () => handleEquipmentOpen(equipment)
    });
    items.push({
      type: "divider"
    });
    items.push({
      id: "copy",
      icon: "mdi:content-copy",
      label: actions.copySheet,
      onClick: () => {
        const payload = buildEquipmentSharePayload(equipment, clientDisplay);
        copyToClipboard(payload.text, actions.copySheetToast);
      }
    }, {
      id: "share",
      icon: "mdi:share-variant",
      label: actions.shareSheet,
      onClick: () => shareEquipment(equipment, clientDisplay)
    });
    return items;
  };
  const renderEmbeddedAnydeskQuickButton = equipment => {
    if (!canShowRemoteAccessButton(equipment) || !hasServerRemoteAccessConfigured(equipment)) return null;
    return <button type="button" className={`${styles.embeddedQuickActionButton} ${styles.embeddedQuickActionButtonRemoteActive}`} title={formatServerRemoteTitle(equipment)} aria-label={actions.serverRemote} onClick={e => {
      e.stopPropagation();
      openServerRemoteAccess(equipment);
    }}>
        <Icon icon={getServerRemoteAccessActionIcon()} width={16} height={16} />
      </button>;
  };
  const renderEmbeddedRemoteAccessButton = equipment => {
    if (!supportsRemoteAccess(equipment) || !hasEquipmentRemoteAccessConfigured(equipment)) return null;
    const accessUrl = getRemoteAccessUrl(equipment);
    const accessLabel = getEquipmentRemoteAccessLabel(locale, true);
    return <button type="button" className={`${styles.embeddedQuickActionButton} ${styles.embeddedQuickActionButtonRemoteActive}`} title={interpolate(actions.remoteAccessWithUrl, {
      label: accessLabel,
      url: accessUrl
    })} aria-label={accessLabel} onClick={e => {
      e.stopPropagation();
      openRemoteAccess(equipment);
    }}>
        <Icon icon={EQUIPMENT_REMOTE_ACTION_ICON} width={16} height={16} />
      </button>;
  };
  const renderEmbeddedQuickConnectButton = (equipment, displayType) => {
    if (!canShowQuickConnectButton(equipment, displayType)) return null;
    const configured = hasSynologyQuickConnectConfigured(equipment);
    const quickConnectValue = getSynologyQuickConnectValue(equipment);
    return <button type="button" className={`${styles.embeddedQuickActionButton} ${configured ? styles.embeddedQuickActionButtonRemoteActive : ""}`} title={configured ? `Open QuickConnect (${quickConnectValue})` : "No QuickConnect address specified"} aria-label="QuickConnect" disabled={!configured} onClick={e => {
      e.stopPropagation();
      openQuickConnectUrl(equipment);
    }}>
        <Icon icon={EQUIPMENT_REMOTE_ACTION_ICON} width={16} height={16} />
      </button>;
  };
  const applyUnifiApiConfigToEquipment = (equipment, config) => {
    if (!equipment || !config) return equipment;
    const nextRawData = {
      ...(equipment.rawData || {}),
      data: {
        ...(equipment.rawData?.data || {}),
        ...config
      },
      ...config
    };
    return {
      ...equipment,
      ...config,
      rawData: nextRawData
    };
  };
  const getEquipmentMac = equipment => equipment?.adresseMac || equipment?.mac || equipment?.rawData?.adresseMac || equipment?.rawData?.mac || '';
  const getStorageRaid = equipment => equipment?.raid || equipment?.rawData?.raid || equipment?.rawData?.data?.raid || '';
  const getNbDisquesActuels = equipment => {
    const equipmentType = equipment?.rawData?.type || equipment?.type || '';
    if (equipmentType === 'Disque dur externe') return '1';
    if (equipmentType === 'Robot de sauvegarde') {
      const cassettes = equipment?.rawData?.cassettesRDX || equipment?.cassettesRDX || [];
      return String(Array.isArray(cassettes) ? cassettes.length : 0);
    }
    const actuel = equipment?.nbDisquesActuels ?? equipment?.rawData?.nbDisquesActuels ?? equipment?.rawData?.nb_disques_actuels;
    return actuel !== null && actuel !== undefined && actuel !== '' ? String(actuel) : '';
  };
  const getNbDisquesMax = equipment => {
    const equipmentType = equipment?.rawData?.type || equipment?.type || '';
    if (equipmentType === 'Disque dur externe') return '1';
    if (equipmentType === 'Robot de sauvegarde') {
      const cassettes = equipment?.rawData?.cassettesRDX || equipment?.cassettesRDX || [];
      return String(Array.isArray(cassettes) ? cassettes.length : 0);
    }
    const max = equipment?.nbDisquesMax ?? equipment?.rawData?.nbDisquesMax ?? equipment?.rawData?.nb_disques_max;
    return max !== null && max !== undefined && max !== '' ? String(max) : '';
  };
  const formatNbDisques = equipment => {
    const equipmentType = equipment?.rawData?.type || equipment?.type || '';
    if (equipmentType === 'Disque dur externe') {
      return '1/1';
    }
    if (equipmentType === 'Robot de sauvegarde') {
      const cassettes = equipment?.rawData?.cassettesRDX || equipment?.cassettesRDX || [];
      const nbCassettes = Array.isArray(cassettes) ? cassettes.length : 0;
      return `${nbCassettes}/${nbCassettes}`;
    }
    const actuel = equipment?.nbDisquesActuels || equipment?.rawData?.nbDisquesActuels || '';
    const max = equipment?.nbDisquesMax || equipment?.rawData?.nbDisquesMax || '';
    const actuelStr = actuel !== null && actuel !== undefined && actuel !== '' ? String(actuel) : '-';
    const maxStr = max !== null && max !== undefined && max !== '' ? String(max) : '-';
    if (actuelStr === '-' && maxStr === '-') return '-';
    return `${actuelStr}/${maxStr}`;
  };
  const formatCapacite = capacite => {
    if (!capacite || capacite === '') return '-';
    const capaciteStr = String(capacite).toUpperCase().trim();
    if (capaciteStr.includes('GB') || capaciteStr.includes('GO')) {
      const value = parseFloat(capaciteStr.replace(/GB|GO/gi, '').trim());
      return isNaN(value) ? '-' : `${Math.round(value)} Gb`;
    }
    if (capaciteStr.includes('TB') || capaciteStr.includes('TO')) {
      const value = parseFloat(capaciteStr.replace(/TB|TO/gi, '').trim());
      return isNaN(value) ? '-' : `${Math.round(value * 1024)} Gb`;
    }
    if (capaciteStr.includes('MB') || capaciteStr.includes('MO')) {
      const value = parseFloat(capaciteStr.replace(/MB|MO/gi, '').trim());
      return isNaN(value) ? '-' : `${Math.round(value / 1024)} Gb`;
    }
    const value = parseFloat(capaciteStr);
    return isNaN(value) ? '-' : `${Math.round(value)} Gb`;
  };
  const formatCsvCell = value => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    const escaped = str.replace(/"/g, '""');
    if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
      return `"${escaped}"`;
    }
    return escaped;
  };
  const buildEquipmentCsvRows = (equipmentList, columns) => {
    const headers = columns.map(col => col.label);
    const rows = equipmentList.map(equipment => columns.map(col => {
      const csvFieldKey = String(col.key).startsWith("ext:") ? String(col.key).slice(4) : col.key;
      let value = String(col.key).startsWith("ext:")
        ? readExtensionFieldValue(equipment, csvFieldKey)
        : equipment[col.key] ?? equipment?.rawData?.[col.key] ?? equipment?.fields?.[col.key] ?? equipment?.data?.[col.key];
      if ((value == null || value === "") && csvFieldKey && csvFieldKey !== col.key) {
        value = readExtensionFieldValue(equipment, csvFieldKey);
      } else if ((value == null || value === "") && !["name", "client", "clientName", "brandIcon", "mapping", "checkmkMapping", "monitoring"].includes(col.key)) {
        const fromExt = readExtensionFieldValue(equipment, csvFieldKey);
        if (fromExt !== "") value = fromExt;
      }
      if (["purchaseDate", "invoiceNumber", "installDate", "expirationGarantie", "commentaire"].includes(col.key)) {
        value = readSharedEquipmentFieldValue(equipment, col.key);
      }
      if (col.key === "typeServer") {
        value = equipment.typeServer || equipment.rawData?.type || value;
      } else if (col.key === "firewallType") {
        value = equipment.firewallType || equipment.rawData?.firewallType || equipment.rawData?.type || value;
      } else if (col.key === "storageType") {
        value = equipment.storageType || equipment.rawData?.storageType || equipment.rawData?.type || value;
      } else if (col.key === "routeurType" || col.key === "toipType" || col.key === "alimentationType" || col.key === "internetType") {
        value = equipment[col.key] || equipment.rawData?.[col.key] || equipment.rawData?.type || value;
      } else if (col.key === "quickConnect") {
        value = getSynologyQuickConnectValue(equipment) || value;
      } else if (col.key === "ssidCount") {
        const ssids = equipment.assignedSsids || equipment.rawData?.assignedSsids;
        value = Array.isArray(ssids) ? ssids.length : value;
      }
      if (col.key === 'uptime') {
        value = formatUptime(value);
      } else if (col.key === 'installDate' || col.key === 'purchaseDate' || col.key === 'dateMiseEnService' || col.key === 'dateBatterie') {
        value = formatDate(value);
      } else if (col.key === 'checkmkMapping' || col.key === 'mapping') {
        const mapping = equipment.checkmkMapping;
        const isMapped = mapping && mapping.checkmk_host_name && mapping.is_active !== false;
        value = isMapped ? 'Mapped' : 'Not mapped';
      } else if (col.key === 'monitoring') {
        if (!isMkMappedEquipment(equipment)) {
          value = "Inactive";
        } else {
          const summary = getEquipmentMkSummary(equipment);
          const status = String(summary?.status || "").toLowerCase();
          const isDegraded = status === "critical" || status === "warning" || status === "down" || status === "offline";
          value = isDegraded ? (status || "Degraded") : "OK";
        }
      } else if (col.key === 'agentStatus') {
        value = resolveRmmAgentOnline(equipment) ? "Online" : "Offline";
      } else if (col.key === 'activeStatus') {
        value = readEquipmentIsActive(equipment) ? "Active" : "Inactive";
      } else if (col.key === 'memoire' && value) {
        value = `${value} GB`;
      } else if (col.key === 'stockage' && value) {
        value = `${value} GB`;
      } else if (col.key === 'nbDisques') {
        value = formatNbDisques(equipment);
      } else if (col.key === 'nbDisquesActuels') {
        value = getNbDisquesActuels(equipment);
      } else if (col.key === 'nbDisquesMax') {
        value = getNbDisquesMax(equipment);
      } else if (col.key === 'raid') {
        value = getStorageRaid(equipment);
      } else if (col.key === 'ha') {
        const ha = getFirewallHaState(equipment);
        value = ha.active ? `${ha.role}${ha.partnerName ? ` → ${ha.partnerName}` : ""}` : "";
      } else if (col.key === 'capacite') {
        value = formatCapacite(equipment.capacite);
      } else if (col.key === 'firmware') {
        value = equipment.firmware || equipment.version || value;
      } else if (col.key === 'expirationGarantie') {
        value = formatDate(value) || formatValue(value);
      } else if (col.key === 'maintenanceLicense' || col.key === 'licenceMaintenance') {
        value = getFirewallMaintenanceLicenseDate(equipment) || value || "";
      } else if (col.key === 'vlan') {
        value = equipment.vlan || equipment.rawData?.vlan || value;
      } else if (col.key === 'mac' || col.key === 'adresseMac') {
        value = getEquipmentMac(equipment) || value;
      } else if (col.key === 'serial') {
        value = getEquipmentSerial(equipment) || value;
      } else if (col.key === 'systeme') {
        value = repairOsLabel(equipment.systeme || equipment.rawData?.systeme || value);
      } else if (col.key === 'computerType') {
        value = formatComputerTypeDisplay(equipment.computerType || equipment.rawData?.type || value, locale);
      } else if (col.key === 'role') {
        value = formatRoles(equipment.role || value);
      } else if (col.key === 'assignedSsids') {
        const ssids = equipment.assignedSsids || equipment.rawData?.assignedSsids;
        value = Array.isArray(ssids) ? ssids.join(", ") : value;
      } else if (col.key === 'remoteAccessSolution') {
        value = equipment.remoteAccessSolution || equipment.rawData?.remoteAccessSolution || value;
      } else if (col.key === 'remoteAccessId') {
        value = equipment.remoteAccessId || equipment.anydeskId || equipment.rawData?.remoteAccessId || value;
      } else {
        value = formatValue(value);
      }
      return formatCsvCell(value);
    }));
    return {
      headers,
      rows
    };
  };
  const downloadCsv = (csvContent, filename) => {
    const blob = new Blob(['\ufeff' + csvContent], {
      type: 'text/csv;charset=utf-8;'
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  const exportToCSV = (equipmentList, type, columns, filename) => {
    if (!equipmentList || equipmentList.length === 0) {
      toast.error('No data to export');
      return;
    }
    const {
      headers,
      rows
    } = buildEquipmentCsvRows(equipmentList, columns);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const exportDate = new Date().toISOString().split('T')[0];
    downloadCsv(csvContent, filename || `${type}_${exportDate}.csv`);
  };
  const getActiveExportType = () => {
    if (embedded) return embeddedActiveType || null;
    if (selectedTypes.size === 1) return [...selectedTypes][0];
    return null;
  };
  const handleExportCurrentTable = () => {
    setExportMenuOpen(false);
    const activeType = getActiveExportType();
    if (!activeType) {
      toast.error('Select an equipment type or export all tables');
      return;
    }
    const equipmentList = equipmentByType[activeType] || [];
    const isCustom = String(activeType).startsWith("Custom:");
    if (!isCustom && !equipmentList.length) {
      toast.error('No data to export');
      return;
    }
    if (isCustom) {
      const familyKey = activeType.slice("Custom:".length);
      const family = customFamiliesForUi.find(entry => entry.familyKey === familyKey);
      const items = family ? getCustomFamilyItems(family) : [];
      if (!items.length) {
        toast.error('No data to export');
        return;
      }
      const customFields = (family?.fields || []).filter(field => field?.fieldType !== "section");
      const visibleKeys = ["name", "location", ...customFields.map(field => field.fieldKey || field.key).filter(Boolean)];
      setCsvExportModal({
        open: true,
        type: activeType,
        defaultKeys: getDefaultCsvExportKeys(activeType, visibleKeys, customFields),
        customFields
      });
      return;
    }
    const extraFields = fieldsFor(activeType) || [];
    const visibleKeys = getColumnsForType(activeType)
      .map(col => String(col.key).startsWith("ext:") ? String(col.key).slice(4) : col.key)
      .filter(key => key && !CSV_EXPORT_EXCLUDED_KEYS.has(key));
    setCsvExportModal({
      open: true,
      type: activeType,
      defaultKeys: getDefaultCsvExportKeys(activeType, visibleKeys, extraFields),
      customFields: extraFields
    });
  };
  const confirmCsvExportWithKeys = selectedKeys => {
    const activeType = csvExportModal.type || getActiveExportType();
    if (!activeType) {
      toast.error('Select an equipment type or export all tables');
      return;
    }
    const customFields = csvExportModal.customFields || [];
    const isCustom = String(activeType).startsWith("Custom:");
    let equipmentList = equipmentByType[activeType] || [];
    if (isCustom) {
      const familyKey = activeType.slice("Custom:".length);
      const family = customFamiliesForUi.find(entry => entry.familyKey === familyKey);
      equipmentList = family ? getCustomFamilyItems(family) : [];
    }
    const columns = (selectedKeys || []).map(key => ({
      key,
      label: getCsvExportFieldLabel(locale, activeType, key, customFields)
    }));
    if (!columns.length) {
      toast.error('Select at least one field');
      return;
    }
    const customFieldTypes = Object.fromEntries((customFields || []).map(field => [field.fieldKey || field.key, field.fieldType]));
    const sortableCustomList = isCustom
      ? equipmentList.map(item => {
          const familyKey = activeType.slice("Custom:".length);
          const family = customFamiliesForUi.find(entry => entry.familyKey === familyKey);
          return family ? buildCustomEquipmentDetailItem(family, item) : item;
        })
      : equipmentList;
    const sortedList = getSortedEquipmentList(activeType, sortableCustomList, customFieldTypes);
    const exportDate = new Date().toISOString().split('T')[0];
    const clientSlug = (embeddedClient?.name || '').trim().replace(/[^\w.-]+/g, '_');
    const typeSlug = String(activeType).replace(/^Custom:/, "Custom_").replace(/[^\w.-]+/g, "_");
    const filename = clientSlug ? `${clientSlug}_${typeSlug}_${exportDate}.csv` : `${typeSlug}_${exportDate}.csv`;
    setCsvExportModal({
      open: false,
      type: null,
      defaultKeys: [],
      customFields: []
    });
    exportToCSV(sortedList, activeType, columns, filename);
    toast.success('CSV export complete');
  };
  const handleExportAllTables = () => {
    setExportMenuOpen(false);
    const typesList = embedded ? FILTER_TYPE_ORDER : TYPE_ORDER;
    const sections = [];
    typesList.forEach(type => {
      const equipmentList = equipmentWithoutTypeFilter.filter(eq => {
        const displayType = toDisplayEquipmentType(eq.type);
        return displayType === type;
      });
      if (equipmentList.length === 0) return;
      const columns = getColumnsForType(type);
      const sortedList = getSortedEquipmentList(type, equipmentList);
      const {
        headers,
        rows
      } = buildEquipmentCsvRows(sortedList, columns);
      sections.push([`"=== ${type} ==="`, headers.join(','), ...rows.map(row => row.join(','))].join('\n'));
    });
    if (sections.length === 0) {
      toast.error('No data to export');
      return;
    }
    const exportDate = new Date().toISOString().split('T')[0];
    const clientSlug = (embeddedClient?.name || '').trim().replace(/[^\w.-]+/g, '_');
    const filename = clientSlug ? `equipements_${clientSlug}_${exportDate}.csv` : `equipements_${exportDate}.csv`;
    downloadCsv(sections.join('\n\n'), filename);
    toast.success('CSV export complete');
  };
  const focusType = useCallback(type => {
    if (!type) return;
    const customKey = String(type).startsWith("Custom:") ? type : parseCustomFamilyType(type) ? `Custom:${parseCustomFamilyType(type)}` : null;
    if (customKey) {
      setSelectedTypes(new Set([customKey]));
      return;
    }
    const displayType = toDisplayEquipmentType(type);
    setSelectedTypes(new Set([displayType]));
  }, []);
  const getEquipmentForStats = useCallback(type => {
    if (!type) return [];
    const familyKey = parseCustomFamilyType(type);
    if (familyKey) {
      const family = customFamiliesForUi.find(entry => entry.familyKey === familyKey);
      if (!family) return [];
      const items = Array.isArray(family.items) ? family.items : [];
      return items.map(item => buildCustomEquipmentDetailItem(family, item));
    }
    return baseEquipment.filter(eq => equipmentMatchesFleetFamily(eq.type, type));
  }, [baseEquipment, customFamiliesForUi, buildCustomEquipmentDetailItem]);
  const getComputersForStats = useCallback(() => getEquipmentForStats("Ordinateurs"), [getEquipmentForStats]);
  const getEmbeddedActiveType = useCallback(() => embeddedActiveType, [embeddedActiveType]);
  useImperativeHandle(ref, () => ({
    openAddEquipmentModal,
    handleExportCurrentTable,
    handleExportAllTables,
    focusType,
    getComputersForStats,
    getEquipmentForStats,
    getEmbeddedActiveType
  }), [openAddEquipmentModal, handleExportCurrentTable, handleExportAllTables, focusType, getComputersForStats, getEquipmentForStats, getEmbeddedActiveType]);
  useEffect(() => {
    if (!embedded || !onEmbeddedActiveTypeChange) return;
    onEmbeddedActiveTypeChange(embeddedActiveType);
  }, [embedded, embeddedActiveType, onEmbeddedActiveTypeChange]);
  useEffect(() => {
    if (embedded && onFilteredCountChange) {
      onFilteredCountChange(embeddedEquipmentCount);
    }
  }, [embedded, embeddedEquipmentCount, onFilteredCountChange]);
  useEffect(() => {
    if (embedded && onTotalCountChange) {
      onTotalCountChange(embeddedHardwareTotalCount);
    }
  }, [embedded, embeddedHardwareTotalCount, onTotalCountChange]);
  useEffect(() => {
    if (skipTablePageResetRef.current) {
      skipTablePageResetRef.current = false;
      return;
    }
    setTablePageByType({});
  }, [searchQuery, pageSize, mkStatusFilter, selectedClients, selectedTypes, tableSort]);
  useEffect(() => {
    if (!embedded || !fixedClientId) return;
    const activeType = selectedTypes.size === 1 ? [...selectedTypes][0] : null;
    writeEnterprisePeripheralsUi(fixedClientId, {
      activeType,
      tablePageByType,
      tableSort,
      pageSize: embeddedPageSize
    });
  }, [embedded, fixedClientId, selectedTypes, tablePageByType, tableSort, embeddedPageSize]);
  const getTablePage = useCallback(pageKey => {
    const page = Number(tablePageByType[pageKey]) || 1;
    return page < 1 ? 1 : page;
  }, [tablePageByType]);
  const setTablePage = useCallback((pageKey, page) => {
    setTablePageByType(prev => ({
      ...prev,
      [pageKey]: Math.max(1, Number(page) || 1)
    }));
  }, []);
  const getPagedSlice = useCallback((list, pageKey) => {
    const total = Array.isArray(list) ? list.length : 0;
    const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
    const page = Math.min(getTablePage(pageKey), totalPages);
    const start = (page - 1) * pageSize;
    return {
      pagedList: total === 0 ? [] : list.slice(start, start + pageSize),
      page,
      totalPages,
      total
    };
  }, [getTablePage, pageSize]);
  const renderEquipmentPagination = useCallback((pageKey, total) => {
    if (!total) return null;
    const safePageSize = Math.max(1, Number(pageSize) || 10);
    const totalPages = Math.max(1, Math.ceil(total / safePageSize));
    const page = Math.min(getTablePage(pageKey), totalPages);
    const rangeStart = (page - 1) * safePageSize + 1;
    const rangeEnd = Math.min(page * safePageSize, total);
    return <div className={`${styles.pagination} ${embedded ? styles.paginationEmbedded : ""}`}>
        <div className={styles.paginationLeft}>
          <span className={styles.paginationLabel}>{embeddedCopy.perPage}</span>
          <select className={styles.paginationSelect} value={safePageSize} onChange={e => setPageSize(Number(e.target.value))} aria-label={embeddedCopy.perPage}>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className={styles.paginationInfo}>
            {interpolate(embeddedCopy.rangeInfo || "{start}–{end} / {total}", {
              start: String(rangeStart),
              end: String(rangeEnd),
              total: String(total)
            })}
          </span>
        </div>
        <div className={styles.paginationRight}>
          <SmartTooltip content={embeddedCopy.prevPage}>
            <button type="button" className={styles.pageBtn} onClick={() => setTablePage(pageKey, page - 1)} disabled={page <= 1} aria-label={embeddedCopy.prevPage}>
              <FaChevronLeft />
            </button>
          </SmartTooltip>
          <span className={styles.paginationInfo}>
            {interpolate(embeddedCopy.pageInfo, {
              current: String(page),
              total: String(totalPages)
            })}
          </span>
          <SmartTooltip content={embeddedCopy.nextPage}>
            <button type="button" className={styles.pageBtn} onClick={() => setTablePage(pageKey, page + 1)} disabled={page >= totalPages} aria-label={embeddedCopy.nextPage}>
              <FaChevronRight />
            </button>
          </SmartTooltip>
        </div>
      </div>;
  }, [embedded, embeddedCopy, getTablePage, pageSize, setPageSize, setTablePage]);
  if (selectedEquipment && !onNavigate) {
    return <EquipmentDetailPage equipment={selectedEquipment} onNavigate={onNavigate} onNavigateToEquipment={eq => setSelectedEquipment(eq)} onBack={() => {
      setSelectedEquipment(null);
      loadEquipment();
    }} onUpdate={updatedEquipment => {
      if (!updatedEquipment) {
        setSelectedEquipment(null);
        return;
      }
      const moduleKey = getEditModuleKey(selectedEquipment, toDisplayEquipmentType(selectedEquipment?.type));
      applyEquipmentUpdateInList(selectedEquipment, updatedEquipment, moduleKey);
      setSelectedEquipment(current => {
        if (!current) return current;
        return mergeEquipmentListItem(current, updatedEquipment, moduleKey);
      });
    }} />;
  }
  const renderEmbeddedLoadingSkeleton = () => <div className={styles.embeddedEquipmentSkeleton} aria-busy="true" aria-label="Loading infrastructure">
      <div className={styles.embeddedSkeletonFilterRow}>
        <div className={`${styles.skeleton} ${styles.embeddedSkeletonSelect}`} />
        <div className={`${styles.skeleton} ${styles.embeddedSkeletonChip}`} />
        <div className={`${styles.skeleton} ${styles.embeddedSkeletonChip}`} />
      </div>
      <div className={styles.embeddedSkeletonTable}>
        <div className={styles.embeddedSkeletonTableHead}>
          {Array.from({
          length: 4
        }).map((_, index) => <div key={index} className={`${styles.skeleton} ${styles.embeddedSkeletonTableHeadCell}`} />)}
        </div>
        {Array.from({
        length: 5
      }).map((_, rowIndex) => <div key={rowIndex} className={styles.embeddedSkeletonTableRow}>
            {Array.from({
          length: 4
        }).map((__, cellIndex) => <div key={cellIndex} className={`${styles.skeleton} ${styles.embeddedSkeletonTableCell}`} />)}
          </div>)}
      </div>
    </div>;
  return <>
    {embedded ? <div className={styles.hardwarePageEmbedded}>
      <div className={styles.mainContent}>
        <>
        {loading ? embedded ? renderEmbeddedLoadingSkeleton() : <div className={styles.loading}>Loading equipment...</div> : error ? <div className={styles.error}>{error}</div> : <div ref={scrollContainerRef} className={`${styles.tablesContainer} ${!embedded && mkAlertStats.mapped > 0 ? styles.tablesContainerWithMkBar : ''} ${embedded ? styles.tablesContainerEmbedded : ''}`}>
            {embedded ? <div className={styles.embeddedFilterBar}>
                <div className={styles.embeddedTypeIconBar} role="tablist" aria-label={embeddedCopy.typeBarAria}>
                  {embeddedTypeOrder.map(type => {
                  const count = embeddedTypeCounts[type] || 0;
                  const label = getEmbeddedTypeLabel(type);
                  const isActive = embeddedActiveType === type;
                  const tooltip = interpolate(embeddedCopy.typeTooltip, {
                    label,
                    count: String(count)
                  });
                  const tabAria = interpolate(count > 1 ? embeddedCopy.typeTabAriaMany : embeddedCopy.typeTabAriaOne, {
                    label,
                    count: String(count)
                  });
                  return <SmartTooltip key={type} content={tooltip}>
                        <button type="button" role="tab" aria-selected={isActive} aria-label={tabAria} className={`${styles.embeddedTypeIconBtn} ${isActive ? styles.embeddedTypeIconBtnActive : ""}`} onClick={() => handleTypeCardClick(type)}>
                          <Icon icon={getEmbeddedTypeIcon(type)} aria-hidden />
                        </button>
                      </SmartTooltip>;
                })}
                </div>

                {checkmkIntegrationEnabled && mkAlertStats.mapped > 0 && <>
                    <span className={styles.embeddedFilterDivider} aria-hidden />
                    <div className={styles.embeddedMonitorInline}>
                      <span className={styles.embeddedMonitorMapped} title={embeddedCopy.mkMappedTitle}>
                        <Icon icon="simple-icons:checkmk" className={styles.embeddedMonitorIcon} aria-hidden />
                        {mkAlertStats.mapped}
                      </span>
                      <button type="button" className={`${styles.embeddedMonitorPill} ${styles.embeddedMonitorPillCritical} ${mkStatusFilter === "critical" ? styles.embeddedMonitorPillActive : ""}`} onClick={() => toggleMkStatusFilter("critical")} disabled={mkAlertStats.critical === 0} title={embeddedCopy.mkCriticalTitle}>
                        {embeddedCopy.mkCriticalLabel} {mkAlertStats.critical}
                      </button>
                      <button type="button" className={`${styles.embeddedMonitorPill} ${styles.embeddedMonitorPillWarning} ${mkStatusFilter === "warning" ? styles.embeddedMonitorPillActive : ""}`} onClick={() => toggleMkStatusFilter("warning")} disabled={mkAlertStats.warning === 0} title={embeddedCopy.mkWarningTitle}>
                        {embeddedCopy.mkWarningLabel} {mkAlertStats.warning}
                      </button>
                      {mkStatusFilter && <button type="button" className={styles.embeddedMonitorClear} onClick={() => setMkStatusFilter(null)} title={embeddedCopy.mkClearFilterTitle}>
                          <FaTimes aria-hidden />
                        </button>}
                      <button type="button" className={styles.embeddedMonitorSync} onClick={handleBulkMkSync} disabled={mkBulkSyncing} title={embeddedCopy.mkSyncTitle}>
                        <FaSync className={mkBulkSyncing ? styles.mkAlertSyncSpin : undefined} aria-hidden />
                        {mkBulkSyncing ? `${mkBulkSyncProgress.done}/${mkBulkSyncProgress.total}` : embeddedCopy.mkSyncLabel}
                      </button>
                    </div>
                  </>}

                <div className={styles.embeddedSearchWrap}>
                  <div className={styles.embeddedSearchBox}>
                    <Icon icon="mdi:magnify" className={styles.embeddedSearchIcon} aria-hidden />
                    <input type="text" className={styles.embeddedSearchInput} placeholder={pageCopy.searchPlaceholder} value={searchQuery} onChange={event => setSearchQuery(event.target.value)} aria-label={pageCopy.searchPlaceholder} />
                    {searchQuery ? <button type="button" className={styles.embeddedSearchClear} onClick={() => setSearchQuery("")} aria-label={embeddedCopy.clearSearchAria}>
                        <FaTimes aria-hidden />
                      </button> : null}
                  </div>
                </div>
              </div> : <>
            {mkAlertStats.mapped > 0 && <div className={`${styles.mkAlertBar} ${mkAlertStats.issues > 0 ? styles.mkAlertBarHasIssues : ''}`}>
                <div className={styles.mkAlertBarLabel}>
                  <Icon icon="simple-icons:checkmk" className={styles.mkAlertBarIcon} />
                  <span>Monitoring</span>
                </div>
                <div className={styles.mkAlertPills}>
                  <button type="button" className={`${styles.mkAlertPill} ${styles.mkAlertPillCritical} ${mkStatusFilter === "critical" ? styles.mkAlertPillActive : ""}`} onClick={() => toggleMkStatusFilter("critical")} disabled={mkAlertStats.critical === 0} title={embeddedCopy.mkCriticalTitle}>
                    <Icon icon="mdi:alert-circle" />
                    {embeddedCopy.mkCriticalLabel} ({mkAlertStats.critical})
                  </button>
                  <button type="button" className={`${styles.mkAlertPill} ${styles.mkAlertPillWarning} ${mkStatusFilter === "warning" ? styles.mkAlertPillActive : ""}`} onClick={() => toggleMkStatusFilter("warning")} disabled={mkAlertStats.warning === 0} title={embeddedCopy.mkWarningTitle}>
                    <Icon icon="mdi:alert" />
                    {embeddedCopy.mkWarningLabel} ({mkAlertStats.warning})
                  </button>
                  {mkStatusFilter && <button type="button" className={styles.mkAlertPillClear} onClick={() => setMkStatusFilter(null)}>
                      <FaTimes /> Show all
                    </button>}
                </div>
                <div className={styles.mkAlertActions}>
                  <button type="button" className={styles.mkAlertSyncBtn} onClick={handleBulkMkSync} disabled={mkBulkSyncing} title="Synchronize all mapped devices with CheckMK">
                    <FaSync className={mkBulkSyncing ? styles.mkAlertSyncSpin : undefined} />
                    {mkBulkSyncing ? `Sync ${mkBulkSyncProgress.done}/${mkBulkSyncProgress.total}` : `Sync (${mappedEquipmentForSync.length})`}
                  </button>
                  {mkAlertStats.issues > 0 && !mkStatusFilter && <span className={styles.mkAlertHint}>
                      {mkAlertStats.issues} device{mkAlertStats.issues > 1 ? 's' : ''} require{mkAlertStats.issues > 1 ? '' : 's'} your attention
                    </span>}
                </div>
              </div>}

            {}
            <div className={styles.statsCards}>
              {!embedded && <div className={styles.statCard} onClick={handleTotalCardClick} style={{
                  cursor: 'pointer'
                }}>
                  <div className={styles.statCardIcon}>
                    <Icon icon="mdi:server-network" />
                  </div>
                  <div className={styles.statCardContent}>
                    <div className={styles.statCardValue}>{filteredForStats.length}</div>
                    <div className={styles.statCardLabel}>Equipment</div>
                  </div>
                </div>}

              {FILTER_TYPE_ORDER.map(type => {
                  const count = typeCounts[type] || 0;
                  const TypeIcon = getTypeIcon(type);
                  const iconName = TYPE_ICON_MAP[type] || 'mdi:server';
                  return <div key={type} className={`${styles.statCard} ${selectedTypes.has(type) ? styles.statCardActive : ''}`} onClick={() => handleTypeCardClick(type)} style={{
                    cursor: 'pointer'
                  }}>
                    <div className={styles.statCardIcon}>
                      <Icon icon={iconName} />
                    </div>
                    <div className={styles.statCardContent}>
                      <div className={styles.statCardValue}>{count}</div>
                      <div className={styles.statCardLabel}>{type}</div>
                    </div>
                  </div>;
                })}
            </div>
              </>}

            {(embedded ? HARDWARE_TYPE_ORDER : TYPE_ORDER).map(type => {
              const equipmentList = type === "Backup" ? filteredBackupRows : equipmentByType[type] || [];
              if (embedded && type !== embeddedActiveType) return null;
              const TypeIcon = getTypeIcon(type);
              const columns = getColumnsForType(type);
              const sortedList = getSortedEquipmentList(type, equipmentList);
              const {
                pagedList,
                total
              } = getPagedSlice(sortedList, type);
              const visibleList = embedded ? pagedList : sortedList;
              const haPairColors = buildHaPairColorMap(sortedList);
              const isBackupSection = type === "Backup";
              return <div key={type} className={`${styles.equipmentTableSection} ${embedded ? styles.equipmentTableSectionEmbedded : ""}`}>
                  {!embedded && <div className={styles.tableSectionHeader}>
                      <div className={styles.tableSectionTitle}>
                        <TypeIcon className={styles.tableSectionIcon} />
                        <h2>{type}</h2>
                        <span className={styles.tableSectionCount}>({equipmentList.length})</span>
                      </div>
                      <div className={styles.tableHeaderActions}>
                        <SmartTooltip as="span" content="Export to CSV">
                          <button className={styles.exportButton} onClick={() => exportToCSV(sortedList, type, columns)}>
                            <FaFileExport />
                          </button>
                        </SmartTooltip>
                        <SmartTooltip as="span" content="Edit columns">
                          <button className={styles.columnsButton} onClick={() => setColumnsComingSoonModal(true)}>
                            <FaColumns />
                          </button>
                        </SmartTooltip>
                        <SmartTooltip as="span" content="Vue tableau">
                          <button className={`${styles.viewModeButton} ${(viewMode[type] || 'table') === 'table' ? styles.active : ''}`} onClick={() => setViewMode(prev => ({
                        ...prev,
                        [type]: 'table'
                      }))}>
                            <FaList />
                          </button>
                        </SmartTooltip>
                        <SmartTooltip as="span" content="Vue cartes">
                          <button className={`${styles.viewModeButton} ${(viewMode[type] || 'table') === 'grid' ? styles.active : ''}`} onClick={() => setViewMode(prev => ({
                        ...prev,
                        [type]: 'grid'
                      }))}>
                            <FaTh />
                          </button>
                        </SmartTooltip>
                      </div>
                    </div>}
                  {(viewMode[type] || 'table') === 'table' ? <div className={`${styles.tableWrapper} ${embedded ? styles.tableWrapperEmbedded : ''}`}>
                      <table className={embedded ? styles.equipmentTableEmbedded : styles.equipmentTable}>
                      <thead>
                        <tr>
                          {columns.map(col => {
                          const sortState = tableSort[type];
                          const isSorted = sortState?.key === col.key;
                          const isSortable = isColumnSortable(col.key);
                          const embeddedCellClass = embedded ? getEmbeddedCellClassName(col.key, styles) : undefined;
                          return <th key={col.key} className={[isSortable ? styles.sortableTh : undefined, embeddedCellClass].filter(Boolean).join(" ") || undefined} onClick={() => isSortable && handleTableSort(type, col.key)} title={col.key === "brandIcon" ? "Brand" : isSortable ? "Trier par " + col.label : undefined} aria-label={col.key === "brandIcon" ? "Brand" : undefined} aria-sort={isSortable ? isSorted ? sortState.direction === "asc" ? "ascending" : "descending" : "none" : undefined}>
                                <span className={styles.thContent}>
                                  {col.label}
                                  {isSortable && <span className={styles.sortIndicator} aria-hidden="true">
                                      {isSorted ? sortState.direction === "asc" ? " ↑" : " ↓" : " ↕"}
                                    </span>}
                                </span>
                              </th>;
                        })}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedList.length === 0 ? <tr>
                            <td colSpan={columns.length} className={styles.equipmentEmptyCell}>
                              {resolveEmptyMessage(type, embedded)}
                            </td>
                          </tr> : visibleList.map(equipment => {
                        return <tr key={equipment.id} className={`${styles.equipmentRow} ${embedded ? styles.equipmentRowEmbedded : ""}`} onClick={isBackupSection ? undefined : () => handleEquipmentOpen(equipment)} onMouseDown={isBackupSection ? undefined : e => {
                          if (e.button === 1) handleEquipmentMiddleClick(e, equipment);
                        }}>
                              {columns.map(col => {
                            if (String(col.key).startsWith("ext:")) {
                              const field = col.field || (fieldsFor(type) || []).find(entry => `ext:${entry.fieldKey}` === col.key);
                              const fieldKey = field?.fieldKey || String(col.key).slice(4);
                              return <td key={col.key}>{formatExtensionFieldValue(field, readExtensionFieldValue(equipment, fieldKey), {
                                yes: pageCopy.yes,
                                no: pageCopy.no
                              })}</td>;
                            }
                            const value = equipment[col.key];
                            if (col.key === "brandIcon") {
                              return <td key={col.key} className={styles.embeddedColBrand}>
                                      <EquipmentBrandIcon equipment={equipment} equipmentType={type} className={`${styles.typeIconSmall} ${styles.typeBrandIconSmall}`} />
                                    </td>;
                            }
                            if (col.key === 'uptime') {
                              return <td key={col.key}>{formatUptime(value)}</td>;
                            } else if (col.key === 'installDate') {
                              return <td key={col.key}>{formatDate(value)}</td>;
                            } else if (col.key === 'nbDisques') {
                              const isStorage = equipment.type === 'NAS' || equipment.type === 'Storage';
                              return <td key={col.key} className={isStorage ? styles.internetCellBold : undefined}>
                                      {formatNbDisques(equipment)}
                                    </td>;
                            } else if (col.key === "activeStatus") {
                              return <td key={col.key}>{renderActiveStatusIcon(equipment)}</td>;
                            } else if (col.key === "ssidCount") {
                              const ssids = Array.isArray(equipment.ssids) ? equipment.ssids : Array.isArray(equipment.rawData?.ssids) ? equipment.rawData.ssids : [];
                              return <td key={col.key}>{ssids.length}</td>;
                            } else if (col.key === "disksUsage") {
                              return <td key={col.key}>{formatNbDisques(equipment)}</td>;
                            } else if (col.key === "powerRating") {
                              const va = equipment.capaciteVA || equipment.rawData?.capaciteVA || "-";
                              const w = equipment.capaciteW || equipment.rawData?.capaciteW || "-";
                              return <td key={col.key}>{`${va} / ${w}`}</td>;
                            } else if (col.key === 'raid') {
                              const isStorage = equipment.type === 'NAS' || equipment.type === 'Storage';
                              return <td key={col.key} className={isStorage ? styles.internetCellBold : undefined}>
                                      {getStorageRaid(equipment) || '-'}
                                    </td>;
                            } else if (col.key === 'nbDisquesActuels') {
                              const isStorage = equipment.type === 'NAS' || equipment.type === 'Storage';
                              return <td key={col.key} className={isStorage ? styles.internetCellBold : undefined}>
                                      {getNbDisquesActuels(equipment) || '-'}
                                    </td>;
                            } else if (col.key === 'nbDisquesMax') {
                              const isStorage = equipment.type === 'NAS' || equipment.type === 'Storage';
                              return <td key={col.key} className={isStorage ? styles.internetCellBold : undefined}>
                                      {getNbDisquesMax(equipment) || '-'}
                                    </td>;
                            } else if (col.key === 'capacite') {
                              const isStorage = equipment.type === 'NAS' || equipment.type === 'Storage';
                              return <td key={col.key} className={isStorage ? styles.internetCellBold : undefined}>
                                      {formatCapacite(equipment.capacite)}
                                    </td>;
                            } else if (col.key === 'monitoring') {
                              return <td key={col.key}>
                                      <div className={styles.monitoringStatusCell}>
                                        {embedded ? renderSupervisionDot(equipment) : renderMonitoringStatus(equipment)}
                                      </div>
                                    </td>;
                            } else if (col.key === 'ha') {
                              return <td key={col.key} className={embedded ? styles.embeddedColHa : undefined}>
                                      <EquipmentHaCell equipment={equipment} copy={pageCopy.ha || {}} pairColors={haPairColors} />
                                    </td>;
                            } else if (col.key === 'name') {
                              if (embedded) {
                                return <td key={col.key}>
                                        <div className={styles.nameCell}>
                                          <span className={equipment.type === "Firewalls" || equipment.type === "Servers" || NETWORK_EDGE_TYPES.has(equipment.type) ? styles.internetCellBold : undefined}>
                                            {formatValue(value)}
                                          </span>
                                          {renderAlertSuspendedBadge(equipment)}
                                        </div>
                                      </td>;
                              }
                              if (equipment.type === 'Firewalls') {
                                return <td key={col.key}>
                                        <div className={styles.nameCell}>
                                          {renderFirewallBrandIcon(equipment)}
                                          <span className={styles.internetCellBold}>{formatValue(value)}</span>
                                          {renderAlertSuspendedBadge(equipment)}
                                        </div>
                                      </td>;
                              }
                              if (equipment.type === 'Routeur') {
                                return <td key={col.key}>
                                        <div className={styles.nameCell}>
                                          {renderRouterBrandIcon(equipment)}
                                          <span className={styles.internetCellBold}>{formatValue(value)}</span>
                                          {renderAlertSuspendedBadge(equipment)}
                                        </div>
                                      </td>;
                              }
                              if (equipment.type === 'Servers') {
                                return <td key={col.key}>
                                        <div className={styles.nameCell}>
                                          {renderServerNameIcon(equipment)}
                                          <span className={styles.internetCellBold}>{formatValue(value)}</span>
                                          {renderAlertSuspendedBadge(equipment)}
                                        </div>
                                      </td>;
                              }
                              let DisplayIcon = TypeIcon;
                              if (equipment.type === 'NAS') {
                                const iconName = getStorageIcon(equipment);
                                return <td key={col.key}>
                                        <div className={styles.nameCell}>
                                          <Icon icon={iconName} className={styles.typeIconSmall} width={16} height={16} />
                                          <span className={styles.internetCellBold}>{formatValue(value)}</span>
                                        </div>
                                      </td>;
                              }
                              if (equipment.type === 'Internet') {
                                const connectionIcon = getInternetConnectionIcon(equipment);
                                return <td key={col.key}>
                                        <div className={styles.nameCell}>
                                          {connectionIcon}
                                          <span className={styles.internetCellBold}>{formatValue(value)}</span>
                                        </div>
                                      </td>;
                              }
                              return <td key={col.key}>
                                      <div className={styles.nameCell}>
                                        <DisplayIcon className={styles.typeIconSmall} />
                                        <span className={equipment.type === 'Firewalls' || equipment.type === 'Servers' || NETWORK_EDGE_TYPES.has(equipment.type) ? styles.internetCellBold : undefined}>{formatValue(value)}</span>
                                        {renderAlertSuspendedBadge(equipment)}
                                      </div>
                                    </td>;
                            } else if (col.key === 'fournisseur' && equipment.type === 'Internet') {
                              return <td key={col.key} className={styles.internetCellBold}>{formatValue(value)}</td>;
                            } else if (col.key === 'checkmkMapping') {
                              if (embedded) {
                                const rowMenuKey = `${equipment.id}::${type}`;
                                return <td key={col.key} className={styles.embeddedColActions} onClick={e => e.stopPropagation()}>
                                        <div className={styles.embeddedRowActions}>
                                          {renderEmbeddedQuickConnectButton(equipment, type)}
                                          {renderEmbeddedRemoteAccessButton(equipment)}
                                          {renderEmbeddedAnydeskQuickButton(equipment)}
                                          <EmbeddedEquipmentActionsMenu menuKey={rowMenuKey} openMenuKey={embeddedRowMenuKey} onOpenChange={setEmbeddedRowMenuKey} items={buildEmbeddedEquipmentMenuItems(equipment, type)} />
                                        </div>
                                      </td>;
                              }
                              const mapping = equipment.checkmkMapping;
                              const isMapped = mapping && mapping.checkmk_host_name && mapping.is_active !== false;
                              const clientDisplay = formatClientDisplay(equipment.clientName || "");
                              return <td key={col.key} onClick={e => e.stopPropagation()}>
                                      <div className={styles.mappingActions}>
                                        <div className={styles.mappingActionsGroup}>
                                          <button type="button" className={`${styles.mappingActionButton} ${isMapped ? styles.mappingActionButtonActive : ""}`} title={isMapped ? interpolate(actions.checkmkMappedClick, {
                                      host: mapping.checkmk_host_name
                                    }) : actions.checkmkMapClick} aria-label={actions.checkmkMap} onClick={e => {
                                      e.stopPropagation();
                                      setMappingModalEquipment(equipment);
                                    }}>
                                            <Icon icon="simple-icons:checkmk" width={16} height={16} />
                                          </button>
                                          {renderQuickConnectButton(equipment, type)}
                                          {renderUnifiApiButton(equipment)}
                                          {renderRemoteAccessButton(equipment)}
                                          <button type="button" className={styles.mappingActionButton} title={actions.copySheetEquipment} aria-label={actions.copySheetEquipment} onClick={e => {
                                      e.stopPropagation();
                                      const payload = buildEquipmentSharePayload(equipment, clientDisplay);
                                      copyToClipboard(payload.text, actions.copySheetToast);
                                    }}>
                                            <Icon icon="mdi:content-copy" width={16} height={16} />
                                          </button>
                                          <button type="button" className={styles.mappingActionButton} title={actions.shareSheetEquipment} aria-label={actions.shareSheetEquipment} onClick={e => {
                                      e.stopPropagation();
                                      shareEquipment(equipment, clientDisplay);
                                    }}>
                                            <Icon icon="mdi:share-variant" width={16} height={16} />
                                          </button>
                                          {canShowRemoteAccessButton(equipment) && hasServerRemoteAccessConfigured(equipment) ? <button type="button" className={`${styles.mappingActionButton} ${styles.mappingActionButtonRemoteActive}`} title={formatServerRemoteTitle(equipment)} aria-label={actions.serverRemote} onClick={e => {
                                      e.stopPropagation();
                                      openServerRemoteAccess(equipment);
                                    }}>
                                              <Icon icon={getServerRemoteAccessActionIcon()} width={16} height={16} />
                                            </button> : null}
                                        </div>
                                        {renderEditEquipmentActionGroup(equipment, type)}
                                      </div>
                                    </td>;
                            } else if (col.key === 'domaine') {
                              const domainLabel = formatValue(equipment.domaine || equipment.rawData?.domaine || value);
                              return <td key={col.key}>{domainLabel && domainLabel !== '-' ? domainLabel : '-'}</td>;
                            } else if (col.key === 'agentStatus') {
                              return <td key={col.key}>
                                      {embedded ? renderAgentDot(equipment) : <RmmAgentStatusBadge equipment={equipment} compact />}
                                    </td>;
                            } else if (col.key === 'computerType') {
                              const computerTypeLabel = formatComputerTypeDisplay(equipment.computerType || equipment.rawData?.type || value, locale);
                              return <td key={col.key}>{computerTypeLabel || '-'}</td>;
                            } else if (col.key === 'systeme') {
                              const osLabel = formatOsValue(equipment.systeme || equipment.rawData?.systeme || value);
                              const osIconName = getOsIconName(osLabel, {
                                withFallback: true
                              });
                              return <td key={col.key}>
                                      {osLabel && osLabel !== '-' ? <div className={styles.osNameCell}>
                                          {osIconName ? <Icon icon={osIconName} width={18} height={18} className={styles.osNameIcon} aria-hidden="true" /> : null}
                                          <span className={styles.osNameText}>{osLabel}</span>
                                        </div> : '-'}
                                    </td>;
                            } else if (col.key === 'role') {
                              return <td key={col.key}>{formatRoles(equipment.role || value) || '-'}</td>;
                            } else if (col.key === 'processeur' || col.key === 'memoire' || col.key === 'stockage') {
                              let displayValue = formatValue(value);
                              if (col.key === 'memoire' && value) {
                                displayValue = `${value} GB`;
                              } else if (col.key === 'stockage' && value) {
                                displayValue = `${value} GB`;
                              }
                              return <td key={col.key}>{displayValue}</td>;
                            } else if (col.key === 'ip') {
                              return <td key={col.key} className={styles.monospace}>{formatIpDisplay(equipment, value)}</td>;
                            } else if (col.key === 'mac' || col.key === 'serial') {
                              const display = col.key === 'serial' ? getEquipmentSerial(equipment) || value : value;
                              return <td key={col.key} className={styles.monospace}>{formatValue(display)}</td>;
                            } else if (col.key === 'clientName') {
                              return <td key={col.key}>
                                      {equipment.clientId ? <button type="button" className={styles.enterpriseLinkText} onClick={e => {
                                  e.stopPropagation();
                                  if (onNavigate) {
                                    onNavigate("ContratDetail", {
                                      clientId: equipment.clientId,
                                      name: formatClientDisplay(value)
                                    });
                                  }
                                }} title="Voir la fiche entreprise">
                                          {formatClientDisplay(value)}
                                        </button> : <span>{formatClientDisplay(value)}</span>}
                                    </td>;
                            } else if (equipment.type === "Internet" && col.key === "debit") {
                              const debitLabel = formatInternetDebitDisplay(equipment.rawData || equipment) || formatValue(value);
                              return <td key={col.key}>{debitLabel}</td>;
                            } else if (equipment.type === 'Internet' && col.key === 'categorie') {
                              return <td key={col.key} className={embedded ? styles.embeddedColHa : undefined}>
                                      <EquipmentHaCell equipment={equipment} copy={pageCopy.ha || {}} pairColors={haPairColors} />
                                    </td>;
                            } else if (equipment.type === 'Internet' && col.key === 'internetType') {
                              return <td key={col.key} className={styles.internetCellBold}>{formatValue(value)}</td>;
                            } else if (col.key === 'vlan') {
                              return <td key={col.key}>{formatValue(equipment.vlan || equipment.rawData?.vlan || value)}</td>;
                            } else if (col.key === 'firmware') {
                              return <td key={col.key} className={equipment.type === 'Firewalls' || NETWORK_EDGE_TYPES.has(equipment.type) ? styles.internetCellBold : undefined}>
                                      {formatValue(equipment.firmware || equipment.version || value)}
                                    </td>;
                            } else if (col.key === 'mac') {
                              return <td key={col.key}>{formatValue(getEquipmentMac(equipment) || value) || '-'}</td>;
                            } else if (col.key === 'expirationGarantie') {
                              const serverType = normalizeServerType(equipment.typeServer || equipment.rawData?.type || "");
                              const isVirtualServer = serverType === "virtuel";
                              if (equipment.type === "Servers" && isVirtualServer) {
                                return <td key={col.key}>-</td>;
                              }
                              const label = formatDate(value) || formatValue(value) || "-";
                              const rawDate = equipment.expirationGarantie || equipment.rawData?.expirationGarantie || value;
                              const useColoredCell = equipment.type === "Firewalls" || equipment.type === "Servers" || equipment.type === "NAS";
                              return <td key={col.key}>
                                      {useColoredCell ? renderExpirationDateCell(rawDate, label) : label}
                                    </td>;
                            } else if (col.key === 'maintenanceLicense') {
                              const label = getFirewallMaintenanceLicenseDate(equipment) || '-';
                              return <td key={col.key}>
                                      {equipment.type === 'Firewalls' ? renderExpirationDateCell(getFirewallMaintenanceLicenseRawDate(equipment), label) : label}
                                    </td>;
                            } else if ((equipment.type === 'Firewalls' || NETWORK_EDGE_TYPES.has(equipment.type)) && col.key === 'model') {
                              return <td key={col.key} className={styles.internetCellBold}>{formatValue(value)}</td>;
                            } else if ((equipment.type === 'NAS' || equipment.type === 'Storage') && col.key === 'model') {
                              return <td key={col.key} className={styles.internetCellBold}>{formatValue(value)}</td>;
                            } else {
                              return <td key={col.key}>{formatValue(value)}</td>;
                            }
                          })}
                            </tr>;
                      })}
                      </tbody>
                    </table>
                  </div> : <div className={styles.gridWrapper}>
                      {sortedList.length === 0 ? <div className={styles.equipmentEmptyCell}>
                          {resolveEmptyMessage(type, embedded)}
                        </div> : <div className={styles.equipmentGrid}>
                        {visibleList.map(equipment => {
                      let DisplayIcon = TypeIcon;
                      let iconElement = null;
                      if (equipment.type === 'Servers' || equipment.type === 'NAS') {
                        if (equipment.type === 'Servers') {
                          iconElement = renderServerNameIcon(equipment, {
                            card: true
                          });
                        } else if (equipment.type === 'NAS') {
                          const iconName = getStorageIcon(equipment);
                          iconElement = <Icon icon={iconName} className={styles.cardIcon} width={24} height={24} />;
                        }
                      } else if (equipment.type === 'Internet') {
                        const connectionIcon = getInternetConnectionIcon(equipment);
                        iconElement = <div className={styles.cardIcon} style={{
                          display: 'flex',
                          alignItems: 'center'
                        }}>{connectionIcon}</div>;
                      } else if (equipment.type === 'Firewalls') {
                        iconElement = renderFirewallBrandIcon(equipment, {
                          card: true
                        });
                      } else if (equipment.type === 'Routeur') {
                        iconElement = renderRouterBrandIcon(equipment, {
                          card: true
                        });
                      } else {
                        iconElement = <DisplayIcon className={styles.cardIcon} />;
                      }
                      return <div key={equipment.id} className={styles.equipmentCard} onClick={() => handleEquipmentOpen(equipment)} onMouseDown={e => {
                        if (e.button === 1) handleEquipmentMiddleClick(e, equipment);
                      }}>
                              <div className={styles.cardHeader}>
                                {iconElement}
                                <h3 className={`${styles.cardTitle} ${equipment.type === 'Firewalls' || equipment.type === 'Servers' || equipment.type === 'NAS' || equipment.type === 'Storage' || NETWORK_EDGE_TYPES.has(equipment.type) ? styles.internetCellBold : ''}`}>{formatValue(equipment.name)}</h3>
                                {renderMonitoringStatus(equipment, {
                            compact: true
                          })}
                              </div>
                              <div className={styles.cardContent}>
                                {columns.filter(col => col.key !== 'name' && col.key !== 'checkmkMapping').map(col => {
                            if (String(col.key).startsWith("ext:")) {
                              const field = col.field || (fieldsFor(type) || []).find(entry => `ext:${entry.fieldKey}` === col.key);
                              const fieldKey = field?.fieldKey || String(col.key).slice(4);
                              return <div key={col.key} className={styles.cardField}>
                                      <span className={styles.cardLabel}>{col.label}:</span>
                                      <span className={styles.cardValue}>{formatExtensionFieldValue(field, readExtensionFieldValue(equipment, fieldKey), {
                                yes: pageCopy.yes,
                                no: pageCopy.no
                              })}</span>
                                    </div>;
                            }
                            const value = equipment[col.key];
                            let displayValue = '-';
                            if (col.key === 'uptime') {
                              displayValue = formatUptime(value);
                            } else if (col.key === 'installDate') {
                              displayValue = formatDate(value);
                            } else if (col.key === 'nbDisques') {
                              displayValue = formatNbDisques(equipment);
                            } else if (col.key === 'raid') {
                              displayValue = getStorageRaid(equipment) || '-';
                            } else if (col.key === 'nbDisquesActuels') {
                              displayValue = getNbDisquesActuels(equipment) || '-';
                            } else if (col.key === 'nbDisquesMax') {
                              displayValue = getNbDisquesMax(equipment) || '-';
                            } else if (col.key === 'capacite') {
                              displayValue = formatCapacite(equipment.capacite);
                            } else if (col.key === 'fournisseur' && equipment.type === 'Internet') {
                              displayValue = formatValue(value);
                            } else if (col.key === 'processeur' || col.key === 'memoire' || col.key === 'stockage') {
                              displayValue = formatValue(value);
                              if (col.key === 'memoire' && value) {
                                displayValue = `${value} GB`;
                              } else if (col.key === 'stockage' && value) {
                                displayValue = `${value} GB`;
                              }
                            } else if (col.key === 'firmware') {
                              displayValue = formatValue(equipment.firmware || equipment.version || value);
                            } else if (col.key === 'vlan') {
                              displayValue = formatValue(equipment.vlan || equipment.rawData?.vlan || value);
                            } else if (col.key === 'ip') {
                              displayValue = formatIpDisplay(equipment, value);
                            } else if (col.key === 'serial') {
                              displayValue = formatValue(getEquipmentSerial(equipment) || value);
                            } else if (col.key === 'mac') {
                              displayValue = formatValue(getEquipmentMac(equipment) || value);
                            } else if (col.key === 'clientName') {
                              displayValue = formatClientDisplay(value);
                            } else if (col.key === 'systeme') {
                              displayValue = formatOsValue(equipment.systeme || equipment.rawData?.systeme || value);
                            } else if (col.key === 'computerType') {
                              displayValue = formatComputerTypeDisplay(equipment.computerType || equipment.rawData?.type || value, locale) || "-";
                            } else if (col.key === 'ha' || equipment.type === 'Internet' && col.key === 'categorie') {
                              return <div key={col.key} className={styles.cardField}>
                                        <span className={styles.cardLabel}>{col.label}:</span>
                                        <span className={styles.cardValue}>
                                          <EquipmentHaCell equipment={equipment} copy={pageCopy.ha || {}} pairColors={haPairColors} />
                                        </span>
                                      </div>;
                            } else {
                              displayValue = formatValue(value);
                            }
                            const isBold = equipment.type === 'Internet' && (col.key === 'name' || col.key === 'fournisseur' || col.key === 'internetType') || equipment.type === 'Firewalls' && (col.key === 'name' || col.key === 'model' || col.key === 'version') || equipment.type === 'Servers' && col.key === 'name' || (equipment.type === 'NAS' || equipment.type === 'Storage') && (col.key === 'name' || col.key === 'model' || col.key === 'nbDisques' || col.key === 'raid' || col.key === 'capacite' || col.key === 'nbDisquesActuels' || col.key === 'nbDisquesMax') || NETWORK_EDGE_TYPES.has(equipment.type) && (col.key === 'name' || col.key === 'model' || col.key === 'firmware');
                            const osIconName = col.key === 'systeme' ? getOsIconName(displayValue) : null;
                            return <div key={col.key} className={styles.cardField}>
                                      <span className={styles.cardLabel}>{col.label}:</span>
                                      <span className={`${styles.cardValue} ${isBold ? styles.internetCellBold : ''}`}>
                                        {osIconName && displayValue && displayValue !== '-' ? <span className={styles.nameCell}>
                                            <Icon icon={osIconName} width={16} height={16} />
                                            {displayValue}
                                          </span> : displayValue || '-'}
                                      </span>
                                    </div>;
                          })}
                              </div>
                              <div className={styles.cardFooterActions}>
                                <div className={styles.mappingActions}>
                                  <div className={styles.mappingActionsGroup}>
                                    <button type="button" className={`${styles.mappingActionButton} ${equipment.checkmkMapping && equipment.checkmkMapping.checkmk_host_name && equipment.checkmkMapping.is_active !== false ? styles.mappingActionButtonActive : ""}`} title={equipment.checkmkMapping && equipment.checkmkMapping.checkmk_host_name && equipment.checkmkMapping.is_active !== false ? interpolate(actions.checkmkMappedClick, {
                                host: equipment.checkmkMapping.checkmk_host_name
                              }) : actions.checkmkMapClick} aria-label={actions.checkmkMap} onClick={e => {
                                e.stopPropagation();
                                setMappingModalEquipment(equipment);
                              }}>
                                      <Icon icon="simple-icons:checkmk" width={16} height={16} />
                                    </button>
                                    {renderQuickConnectButton(equipment, type)}
                                    {renderUnifiApiButton(equipment)}
                                    {renderRemoteAccessButton(equipment)}
                                    <button type="button" className={styles.mappingActionButton} title={actions.copySheetEquipment} aria-label={actions.copySheetEquipment} onClick={e => {
                                e.stopPropagation();
                                const payload = buildEquipmentSharePayload(equipment, formatClientDisplay(equipment.clientName || ""));
                                copyToClipboard(payload.text, actions.copySheetToast);
                              }}>
                                      <Icon icon="mdi:content-copy" width={16} height={16} />
                                    </button>
                                    <button type="button" className={styles.mappingActionButton} title={actions.shareSheetEquipment} aria-label={actions.shareSheetEquipment} onClick={e => {
                                e.stopPropagation();
                                shareEquipment(equipment, formatClientDisplay(equipment.clientName || ""));
                              }}>
                                      <Icon icon="mdi:share-variant" width={16} height={16} />
                                    </button>
                                    {canShowRemoteAccessButton(equipment) && hasServerRemoteAccessConfigured(equipment) ? <button type="button" className={`${styles.mappingActionButton} ${styles.mappingActionButtonRemoteActive}`} title={formatServerRemoteTitle(equipment)} aria-label={actions.serverRemote} onClick={e => {
                                e.stopPropagation();
                                openServerRemoteAccess(equipment);
                              }}>
                                        <Icon icon={getServerRemoteAccessActionIcon()} width={16} height={16} />
                                      </button> : null}
                                  </div>
                                  {renderEditEquipmentActionGroup(equipment, type)}
                                </div>
                              </div>
                            </div>;
                    })}
                      </div>}
                    </div>}
                  {embedded ? renderEquipmentPagination(type, total) : null}
                </div>;
            })}
            {embedded && activeCustomFamily && (() => {
              const family = activeCustomFamily;
              const sectionKey = `Custom:${family.familyKey}`;
              const items = getCustomFamilyItems(family);
              const fields = (family.fields || []).filter(field => {
                if (["actif", "active", "is_active", "isActive", "name", "nom"].includes(field.fieldKey)) return false;
                if (field.fieldType === "section") return false;
                return true;
              });
              const fieldTypes = Object.fromEntries(fields.map(field => [field.fieldKey, field.fieldType]));
              const mappedItems = items.map(item => buildCustomEquipmentDetailItem(family, item));
              const sortedItems = getSortedEquipmentList(sectionKey, mappedItems, fieldTypes);
              const {
                pagedList,
                total
              } = getPagedSlice(sortedItems, sectionKey);
              const renderCustomSortableTh = (colKey, label, extraClass) => {
                const sortState = tableSort[sectionKey];
                const isSorted = sortState?.key === colKey;
                const isSortable = isColumnSortable(colKey);
                return <th key={colKey} className={[isSortable ? styles.sortableTh : undefined, extraClass].filter(Boolean).join(" ") || undefined} onClick={() => isSortable && handleTableSort(sectionKey, colKey)} title={isSortable ? "Trier par " + label : undefined} aria-sort={isSortable ? isSorted ? sortState.direction === "asc" ? "ascending" : "descending" : "none" : undefined}>
                    <span className={styles.thContent}>
                      {label}
                      {isSortable && <span className={styles.sortIndicator} aria-hidden="true">
                          {isSorted ? sortState.direction === "asc" ? " ↑" : " ↓" : " ↕"}
                        </span>}
                    </span>
                  </th>;
              };
              return <div key={sectionKey} className={`${styles.equipmentTableSection} ${styles.equipmentTableSectionEmbedded}`}>
                  <div className={`${styles.tableWrapper} ${styles.tableWrapperEmbedded}`}>
                    <table className={styles.equipmentTableEmbedded}>
                      <thead>
                        <tr>
                          {renderCustomSortableTh("name", pageCopy.columns?.name || "Nom")}
                          {renderCustomSortableTh("activeStatus", pageCopy.columns?.activeStatus || "Actif")}
                          {fields.map(field => renderCustomSortableTh(field.fieldKey, field.label))}
                          {renderCustomSortableTh("mapping", pageCopy.actionsColumn, styles.embeddedColActions)}
                        </tr>
                      </thead>
                      <tbody>
                        {mappedItems.length === 0 ? <tr>
                            <td colSpan={fields.length + 3} className={styles.equipmentEmptyCell}>
                              No {family.label.toLowerCase()} for this client.
                            </td>
                          </tr> : pagedList.map(item => <tr key={item.id} className={styles.equipmentRowEmbedded} onClick={() => handleEquipmentOpen(item)} style={{
                      cursor: "pointer"
                    }}>
                              <td>{item.name || "-"}</td>
                              <td>{renderActiveStatusIcon(item)}</td>
                              {fields.map(field => <td key={field.fieldKey}>
                                  {formatCustomFamilyFieldValue(field, item.fields?.[field.fieldKey] ?? item.data?.[field.fieldKey] ?? readCustomFieldRaw(item, field.fieldKey), pageCopy)}
                                </td>)}
                              <td className={styles.embeddedColActions} onClick={event => event.stopPropagation()}>
                                <div className={styles.embeddedRowActions}>
                                  <EmbeddedEquipmentActionsMenu menuKey={`custom:${family.familyKey}:${item.id}`} openMenuKey={embeddedRowMenuKey} onOpenChange={setEmbeddedRowMenuKey} items={buildCustomEmbeddedMenuItems(family, item)} />
                                </div>
                              </td>
                            </tr>)}
                      </tbody>
                    </table>
                  </div>
                  {renderEquipmentPagination(sectionKey, total)}
                </div>;
            })()}
            {Object.keys(equipmentByType).length === 0 && filteredBackupRows.length === 0 && customFamiliesForUi.length === 0 && !(embedded && embeddedActiveType) && <div className={styles.noData}>
                No equipment found
              </div>}
          </div>}
        </>
      </div>
    </div> : <SupervisionCenterPage onEquipmentOpen={handleEquipmentOpen} onNavigate={onNavigate} />}

      {}
      {columnsComingSoonModal && <div className={styles.modalOverlay} onClick={() => setColumnsComingSoonModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <FaColumns className={styles.modalIcon} />
                Edit columns
              </h2>
              <button className={styles.modalCloseButton} onClick={() => setColumnsComingSoonModal(false)} title="Close">
                <FaTimes />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.comingSoonMessage}>
                <Icon icon="mdi:clock-outline" width={48} height={48} className={styles.comingSoonIcon} />
                <h3>Feature coming soon</h3>
                <p>
                  Soon, you will be able to customize the visible columns in your tables to:
                </p>
                <ul className={styles.comingSoonList}>
                  <li>Show only the columns you need</li>
                  <li>Hide irrelevant columns</li>
                  <li>Adapter l'affichage selon vos besoins</li>
                  <li>Et bien plus encore...</li>
                </ul>
                <p className={styles.comingSoonNote}>
                  This feature will let you customize your equipment table display to match your preferences.
                </p>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.modalOkButton} onClick={() => setColumnsComingSoonModal(false)}>
                Compris
              </button>
            </div>
          </div>
        </div>}

      {}
      {columnModalOpen.isOpen && columnModalOpen.type && <div className={styles.modalOverlay} onClick={() => setColumnModalOpen({
      type: null,
      isOpen: false
    })}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <FaColumns className={styles.modalIcon} />
                Colonnes visibles - {columnModalOpen.type}
              </h2>
              <button className={styles.modalCloseButton} onClick={() => setColumnModalOpen({
            type: null,
            isOpen: false
          })} title="Close">
                <FaTimes />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.columnsList}>
                {getAllAvailableColumnsForType(columnModalOpen.type).map(col => {
              const typeColumns = {
                'Servers': SERVER_COLUMN_KEYS,
                'Storage': STORAGE_COLUMN_KEYS,
                'Firewalls': FIREWALL_COLUMN_KEYS,
                'Switch': SWITCH_COLUMN_KEYS,
                'BorneWifi': BORNE_WIFI_COLUMN_KEYS,
                'Alimentation': SWITCH_COLUMN_KEYS,
                'Routeur': SWITCH_COLUMN_KEYS,
                'TOIP': SWITCH_COLUMN_KEYS,
                'Internet': INTERNET_COLUMN_KEYS
              };
              const defaultColumns = typeColumns[columnModalOpen.type] || typeColumns['Servers'];
              const currentVisible = visibleColumns[columnModalOpen.type] || defaultColumns;
              const isVisible = currentVisible.includes(col.key);
              return <label key={col.key} className={styles.columnCheckbox}>
                      <input type="checkbox" checked={isVisible} onChange={() => toggleColumn(columnModalOpen.type, col.key)} />
                      <span>{col.label}</span>
                    </label>;
            })}
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.modalOkButton} onClick={() => setColumnModalOpen({
            type: null,
            isOpen: false
          })}>
                Close
              </button>
            </div>
          </div>
        </div>}

      <EquipmentAddFlowModal open={addFlowOpen} prefilledClient={embeddedClient || null} customFamilies={customFamiliesForUi} onClose={() => setAddFlowOpen(false)} onReady={handleAddFlowReady} onCustomFamilySelect={family => {
      setAddFlowOpen(false);
      onCustomFamilyManage?.(family);
    }} />

      {mappingModalEquipment && <EquipmentMappingModal isOpen={!!mappingModalEquipment} onClose={() => setMappingModalEquipment(null)} equipment={mappingModalEquipment} onMappingSaved={async mapping => {
      const target = mappingModalEquipment;
      if (!target) {
        setMappingModalEquipment(null);
        return;
      }
      const nextMapping = mapping?.checkmk_host_name ? {
        is_active: true,
        ...mapping,
        checkmk_host_name: mapping.checkmk_host_name,
        checkmk_site: mapping.checkmk_site ?? null,
        checkmk_service_name: mapping.checkmk_service_name ?? null
      } : null;
      setAllEquipment(prev => {
        const next = prev.map(eq => isSameEquipmentItem(eq, target) ? {
          ...eq,
          checkmkMapping: nextMapping
        } : eq);
        persistEquipmentCache(next);
        return next;
      });
      setSelectedEquipment(sel => sel && isSameEquipmentItem(sel, target) ? {
        ...sel,
        checkmkMapping: nextMapping
      } : sel);
      setMappingModalEquipment(null);
      const dbId = getEquipmentDbId(target);
      if (nextMapping?.checkmk_host_name) {
        if (dbId) {
          setMonitoringSummaries(prev => ({
            ...prev,
            [dbId]: prev?.[dbId] || {
              status: "ok"
            }
          }));
        }
        const payload = buildMkSyncPayload({
          ...target,
          checkmkMapping: nextMapping
        });
        if (payload) {
          try {
            await syncEquipmentCheckMKMonitoring(payload);
          } catch (err) {
            if (err?.name !== "AbortError") {
              console.warn("CheckMK sync after mapping:", err);
            }
          }
        }
        try {
          await refreshMonitoringSummaries();
        } catch (err) {
          if (err?.name !== "AbortError") {
            console.warn("CheckMK summaries after mapping:", err);
          }
        }
      } else if (dbId) {
        setMonitoringSummaries(prev => {
          if (!prev?.[dbId]) return prev;
          const next = {
            ...prev
          };
          delete next[dbId];
          return next;
        });
      }
    }} />}

      {unifiApiModalEquipment && <UnifiApiConfigModal isOpen={!!unifiApiModalEquipment} onClose={() => setUnifiApiModalEquipment(null)} equipment={unifiApiModalEquipment} onSaved={config => {
      if (!unifiApiModalEquipment) return;
      const mergeConfig = eq => eq.id === unifiApiModalEquipment.id && eq.clientId === unifiApiModalEquipment.clientId ? applyUnifiApiConfigToEquipment(eq, config) : eq;
      setAllEquipment(prev => prev.map(mergeConfig));
      setSelectedEquipment(sel => sel ? mergeConfig(sel) : sel);
      setUnifiApiModalEquipment(null);
    }} />}

      {editEquipmentModal.client && <EquipmentFormModal open={editEquipmentModal.open} onClose={closeEditEquipmentModal} client={editEquipmentModal.client} equipment={editEquipmentModal.equipment} moduleKey={editEquipmentModal.moduleKey} mode={editEquipmentModal.mode} peerFirewalls={editModalPeerFirewalls} peerServers={editModalPeerServers} peerStorage={editModalPeerStorage} peerBorneWifi={editModalPeerBorneWifi} onSaved={handleEquipmentSaved} onDeleted={handleEquipmentDeleted} />}

      <EquipmentCsvExportModal
        open={csvExportModal.open}
        locale={locale}
        equipmentType={csvExportModal.type}
        typeLabel={csvExportModal.type ? getEmbeddedTypeLabel(csvExportModal.type) : ""}
        defaultKeys={csvExportModal.defaultKeys}
        customFields={csvExportModal.customFields}
        onClose={() => setCsvExportModal({
          open: false,
          type: null,
          defaultKeys: [],
          customFields: []
        })}
        onExport={confirmCsvExportWithKeys}
      />

      <ConfirmModal open={!!rmmRevokeTarget} title={modalsCopy.confirm?.rmmRevoke?.title} message={rmmRevokeTarget ? interpolate(modalsCopy.confirm?.rmmRevoke?.message, {
      name: rmmRevokeTarget.name || rmmRevokeTarget.rawData?.nom || modalsCopy.confirm?.rmmRevoke?.untitledAgent
    }) : ""} confirmLabel={modalsCopy.confirm?.rmmRevoke?.confirm} confirmLoading={rmmRevoking} onConfirm={handleConfirmRmmRevoke} onClose={() => {
      if (!rmmRevoking) setRmmRevokeTarget(null);
    }} />

      {}
      {showBackToTop && <button type="button" className={styles.backToTopButton} onClick={() => scrollContainerRef.current?.scrollTo({
      top: 0,
      behavior: "smooth"
    })} title="Remonter en haut" aria-label="Remonter en haut de la page">
          <FaChevronUp />
        </button>}
    </>;
});
export default EquipmentPage;
