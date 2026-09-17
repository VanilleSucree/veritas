import API_BASE_URL, { withApiQuery } from "../config";
import { fetchClientModules, deleteClientCustomEquipment } from "./clients";
import { getEquipmentDbId, isDbEquipmentId, findEquipmentInApiList } from "../utils/equipmentIdentity";
import { inferComputerTypeFromInventory, canonicalizeComputerType, resolveAlimentationDeploymentType, resolveToipDeploymentType, readEquipmentIsActive } from "../components/EquipementPage/equipmentFormConfig";
import { repairRmmTextEncoding } from "../utils/rmmTextEncoding";
import { resolveAssignedSsidIds, serializeAssignedSsidsForPersistence } from "../components/EquipementPage/wifiApSsidUtils";
import { applySharedEquipmentFields, buildSharedEquipmentFormData } from "../components/EquipementPage/sharedEquipmentFields";
import { applySystemExtensionFields } from "../utils/systemFamilyExtensions";
import { normalizeStorageRoles } from "../components/EquipementPage/constants/storageRoleOptions";
export const getClientEquipment = async clientId => {
  try {
    const response = await fetch(`${API_BASE_URL}/maintenance/equipment/${clientId}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching equipment:', error);
    throw error;
  }
};
export const getClientEquipmentTotal = async (clientId, options = {}) => {
  try {
    let client = options.clientData || null;
    if (!client) {
      const response = await fetch(`${API_BASE_URL}/clients/general/${clientId}`, {
        method: 'GET',
        credentials: 'include',
        signal: options.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      client = await response.json();
    }
    if (!client) {
      console.warn(`Client ${clientId} not found`);
      return {
        byType: {},
        total: 0
      };
    }
    const modulesEquipements = options.modulesData?.equipements;
    const equipements = (client && client.equipements && typeof client.equipements === "object" ? client.equipements : null) || (modulesEquipements && typeof modulesEquipements === "object" ? modulesEquipements : {}) || {};
    const pickList = (...keys) => {
      for (const key of keys) {
        const list = equipements?.[key];
        if (Array.isArray(list)) return list;
      }
      return [];
    };
    const pickCount = (...keys) => {
      for (const key of keys) {
        const value = equipements?.[key];
        if (Array.isArray(value)) return value.length;
        if (value && typeof value === "object") {
          if (Array.isArray(value.items)) return value.items.length;
          if (Array.isArray(value.connections)) return value.connections.length;
          if (Array.isArray(value.instances)) return value.instances.length;
          if (Array.isArray(value.solutions)) return value.solutions.length;
        }
      }
      return 0;
    };
    const equipmentTotals = {
      Serveurs: pickCount('Serveurs', 'Server', 'Servers'),
      NAS: pickCount('NAS', 'Stockage', 'Storage'),
      Firewalls: pickCount('Firewalls', 'Firewall'),
      Switch: pickCount('Switch', 'Switches'),
      BorneWifi: pickCount('BorneWifi', 'BorneWiFi', 'Wifi', 'WiFi'),
      Alimentation: pickCount('Alimentation'),
      Routeur: pickCount('Routeur'),
      TOIP: pickCount('TOIP', 'Toip'),
      Ordinateurs: pickCount('Ordinateurs', 'Ordinateur', 'Workstations'),
      Cameras: pickCount('Cameras', 'Camera', 'Videosurveillance', 'VideoSurveillance')
    };
    const internetConnections = pickList('Internet');
    let filteredInternetConnections = Array.isArray(internetConnections) ? internetConnections : [];
    if (Array.isArray(internetConnections) && internetConnections.some(conn => conn.client_id)) {
      filteredInternetConnections = internetConnections.filter(conn => String(conn.client_id) === String(clientId));
    }
    equipmentTotals['Internet'] = filteredInternetConnections.length;
    const totalGeneral = Object.values(equipmentTotals).reduce((sum, count) => sum + count, 0);
    return {
      byType: equipmentTotals,
      total: totalGeneral
    };
  } catch (error) {
    console.error('Error fetching equipment totals:', error);
    throw error;
  }
};
export const getHardwareModules = async () => {
  const hardwareModules = [{
    id: 'Internet',
    name: 'Internet',
    description: 'Monitoring of internet connection and bandwidth',
    icon: '🌐',
    category: 'Connectivity',
    color: '#3b82f6'
  }, {
    id: 'Serveurs',
    name: 'Servers',
    description: 'Monitoring of physical and virtual servers',
    icon: '🖥️',
    category: 'Infrastructure',
    color: '#10b981'
  }, {
    id: 'Stockage',
    name: 'Storage',
    description: 'Monitoring of storage systems and NAS',
    icon: '💾',
    category: 'Infrastructure',
    color: '#f59e0b'
  }, {
    id: 'Firewall',
    name: 'Firewall',
    description: 'Monitoring of firewalls and network security',
    icon: '🛡️',
    category: 'Security',
    color: '#ef4444'
  }, {
    id: 'Switch',
    name: 'Switch',
    description: 'Monitoring of network switches',
    icon: '🔌',
    category: 'Network',
    color: '#8b5cf6'
  }, {
    id: 'BorneWifi',
    name: 'WiFi access point',
    description: 'Monitoring of WiFi access points and controllers',
    icon: '📶',
    category: 'Network',
    color: '#06b6d4'
  }, {
    id: 'Alimentation',
    name: 'Power',
    description: 'Monitoring of UPS units and PDUs',
    icon: '🔋',
    category: 'Infrastructure',
    color: '#eab308'
  }, {
    id: 'Routeur',
    name: 'Router / SD-WAN',
    description: 'Monitoring of routers and SD-WAN appliances',
    icon: '📡',
    category: 'Network',
    color: '#6366f1'
  }, {
    id: 'TOIP',
    name: 'TOIP / VOIP',
    description: 'Monitoring of IP telephony',
    icon: '☎️',
    category: 'Telecom',
    color: '#14b8a6'
  }];
  return Promise.resolve(hardwareModules);
};
export const getSoftwareModules = async () => {
  const softwareModules = [{
    id: 'Sauvegarde',
    name: 'Backup',
    description: 'Monitoring of backups and replications',
    icon: '💿',
    category: 'Protection',
    color: '#84cc16'
  }, {
    id: 'Antivirus',
    name: 'Antivirus',
    description: 'Monitoring of antivirus solutions',
    icon: '🦠',
    category: 'Security',
    color: '#dc2626'
  }, {
    id: 'Antispam',
    name: 'Antispam',
    description: 'Monitoring of antispam filters',
    icon: '📧',
    category: 'Security',
    color: '#ea580c'
  }, {
    id: 'NDD',
    name: 'Domains',
    description: 'Monitoring of domain names',
    icon: '🌍',
    category: 'Services',
    color: '#0891b2'
  }, {
    id: 'Office365',
    name: 'Office 365',
    description: 'Monitoring of Microsoft 365 services',
    icon: '📊',
    category: 'Productivity',
    color: '#7c3aed'
  }, {
    id: 'TOIP',
    name: 'TOIP / VOIP',
    description: 'Monitoring of IP telephony',
    icon: '📞',
    category: 'Communication',
    color: '#059669'
  }];
  return Promise.resolve(softwareModules);
};
export const getAllMonitoringModules = async () => {
  try {
    const [hardwareModules, softwareModules] = await Promise.all([getHardwareModules(), getSoftwareModules()]);
    return {
      hardware: hardwareModules,
      software: softwareModules,
      all: [...hardwareModules, ...softwareModules]
    };
  } catch (error) {
    console.error('Error fetching modules:', error);
    throw error;
  }
};
const NETWORK_PERIPHERAL_TYPES = new Set(["Switch", "BorneWifi", "Alimentation", "Routeur", "TOIP"]);
const FIRMWARE_EQUIPMENT_TYPES = new Set(["Firewalls", "Switch", "BorneWifi", "Alimentation", "Routeur", "TOIP"]);
const HARDWARE_EQUIPMENT_TYPES = ["Ordinateurs", "Serveurs", "NAS", "Firewalls", "Switch", "BorneWifi", "Alimentation", "Routeur", "TOIP", "Internet"];
export function mapClientHardwareEquipment(client) {
  if (!client?.equipements) return [];
  const equipmentListOut = [];
  const equipmentMap = new Map();
  HARDWARE_EQUIPMENT_TYPES.forEach(type => {
    const equipmentList = client.equipements[type];
    if (!equipmentList || !Array.isArray(equipmentList)) return;
    equipmentList.forEach((equipment, index) => {
      if (!equipment || typeof equipment !== "object") return;
      if (type === "Ordinateurs" && equipment.is_active === false) return;
      const equipmentMac = equipment.adresseMac || equipment.mac || equipment.macAddress || "";
      const equipmentIp = equipment.ip || equipment.ipAddress || "";
      const equipmentSerial = equipment.numeroSerie || equipment.serial || equipment.serialNumber || equipment.data?.numeroSerie || equipment.data?.serial || "";
      let equipmentName = equipment.nom || equipment.name || "";
      if (type === "Internet") {
        if (!equipmentName || equipmentName.toLowerCase() === "unnamed" || equipmentName.trim() === "") {
          const internetType = equipment.type || "";
          const fournisseur = equipment.fournisseur || "";
          if (internetType && fournisseur) {
            equipmentName = `${internetType.toUpperCase()} ${fournisseur.toUpperCase()}`;
          } else if (internetType) {
            equipmentName = internetType.toUpperCase();
          } else if (fournisseur) {
            equipmentName = fournisseur.toUpperCase();
          } else {
            equipmentName = equipmentIp || `Internet-${index}`;
          }
        }
      } else if (!equipmentName) {
        equipmentName = `equipment-${index}`;
      }
      const realEquipmentId = equipment.id;
      const dbId = isDbEquipmentId(realEquipmentId) ? String(realEquipmentId) : null;
      // Prefer DB id. Otherwise keep index in the key so two rows with the same
      // name + IP/MAC (true duplicates the user may need to delete) stay visible.
      let stableId;
      if (dbId) {
        stableId = dbId;
      } else {
        const identity = equipmentMac || equipmentSerial || equipmentIp || "row";
        stableId = `${client.id}-${type}-${equipmentName}-${identity}-${index}`;
      }
      const dedupeKey = dbId ? `db:${dbId}` : stableId;
      if (equipmentMap.has(dedupeKey)) return;
      let checkmkMapping = null;
      if (equipment.checkmk_host_name && String(equipment.checkmk_host_name).trim()) {
        checkmkMapping = {
          checkmk_host_name: equipment.checkmk_host_name,
          checkmk_site: equipment.checkmk_site || null,
          checkmk_service_name: equipment.checkmk_service_name || null,
          is_active: true
        };
      }
      const processeur = equipment.processeur || equipment.data?.processeur || equipment.cpu || equipment.vcpu || "";
      const memoire = equipment.memoire || equipment.data?.memoire || equipment.ram || equipment.memory || "";
      const stockage = equipment.stockage || equipment.data?.stockage || equipment.storage || "";
      const role = equipment.role || equipment.data?.role || [];
      const systeme = equipment.systeme || equipment.data?.systeme || equipment.os || "";
      const vlan = equipment.vlan || equipment.data?.vlan || "";
      const sharedBilling = buildSharedEquipmentFormData(equipment);
      const expirationGarantie = equipment.expirationGarantie || equipment.data?.expirationGarantie || equipment.garantie || sharedBilling.expirationGarantie || null;
      const typeServer = equipment.type || equipment.data?.type || "";
      const storageType = type === "NAS" || type === "Stockage" || type === "Storage" ? equipment.type || equipment.data?.type || "" : "";
      const anydeskId = equipment.anydeskId || equipment.data?.anydeskId || "";
      const remoteAccessSolution = equipment.remoteAccessSolution || equipment.data?.remoteAccessSolution || "";
      const remoteAccessId = equipment.remoteAccessId || equipment.data?.remoteAccessId || anydeskId || "";
      const quickConnect = equipment.quickConnect || equipment.data?.quickConnect || "";
      const unifiApiHost = equipment.unifiApiHost || equipment.data?.unifiApiHost || "";
      const unifiApiKey = equipment.unifiApiKey || equipment.data?.unifiApiKey || "";
      const unifiApiRejectUnauthorized = equipment.unifiApiRejectUnauthorized ?? equipment.data?.unifiApiRejectUnauthorized;
      const unifiApiConfiguredAt = equipment.unifiApiConfiguredAt || equipment.data?.unifiApiConfiguredAt || null;
      const stormshieldWanUrl = equipment.stormshieldWanUrl || equipment.data?.stormshieldWanUrl || "";
      const hostServerName = equipment.hostServerName || equipment.data?.hostServerName || equipment.serveurHote || equipment.data?.serveurHote || "";
      const osData = equipment.os || equipment.data?.os || null;
      const domainData = equipment.domain || equipment.data?.domain || null;
      const ordinateurSysteme = repairRmmTextEncoding(equipment.systeme || equipment.data?.systeme || osData?.name || equipment.osName || "") || "";
      const ordinateurDomaine = equipment.domaine || equipment.data?.domaine || (domainData?.joined ? domainData.name : domainData?.workgroup || domainData?.name) || "";
      const agentOnlineRaw = equipment.agentOnline ?? equipment.data?.agentOnline ?? (equipment.source === "rmm" ? null : undefined);
      // Leave online resolution to UI helpers (heartbeat-aware). Keep explicit flags only.
      const agentOnline = agentOnlineRaw === true || agentOnlineRaw === false ? agentOnlineRaw : undefined;
      const nbDisquesActuels = equipment.nbDisquesActuels || equipment.nb_disques_actuels || "";
      const nbDisquesMax = equipment.nbDisquesMax || equipment.nbDisquesMax || equipment.nb_disques_max || "";
      const capacite = equipment.capacite || equipment.capacity || "";
      const isActive = readEquipmentIsActive(equipment);
      const equipmentData = {
        id: stableId,
        dbId,
        clientId: client.id,
        clientName: client.name || client.nom || "Client inconnu",
        // UI tabs use "Servers" / "Storage"; API families use "Serveurs" / "NAS".
        type: type === "Serveurs" ? "Servers" : type === "Stockage" ? "Storage" : type,
        name: equipmentName,
        model: equipment.modele || equipment.model || equipment.modelName || equipment.data?.modele || equipment.data?.model || "",
        mac: equipmentMac,
        ip: equipmentIp,
        version: equipment.firmware || equipment.version || equipment.softwareVersion || "",
        serial: equipmentSerial,
        manufacturer: equipment.fabricant || equipment.manufacturer || equipment.marque || equipment.data?.fabricant || equipment.data?.marque || equipment.data?.manufacturer || "",
        location: equipment.site || equipment.location || equipment.emplacement || "",
        status: equipment.status || "unknown",
        is_active: isActive,
        uptime: equipment.uptime || "",
        installDate: sharedBilling.installDate || equipment.dateInstallation || equipment.installDate || null,
        purchaseDate: sharedBilling.purchaseDate || equipment.purchaseDate || null,
        invoiceNumber: sharedBilling.invoiceNumber || equipment.invoiceNumber || "",
        processeur,
        memoire,
        stockage,
        role: Array.isArray(role) ? role : role ? [role] : [],
        systeme,
        vlan,
        expirationGarantie,
        anydeskId: type === "Serveurs" ? anydeskId : undefined,
        remoteAccessSolution: type === "Serveurs" ? remoteAccessSolution : undefined,
        remoteAccessId: type === "Serveurs" ? remoteAccessId : undefined,
        hostServerName: type === "Serveurs" ? hostServerName : undefined,
        quickConnect: type === "NAS" ? quickConnect : undefined,
        typeServer,
        storageType: type === "NAS" || type === "Stockage" || type === "Storage" ? storageType : undefined,
        nbDisquesActuels,
        nbDisquesMax,
        disques: equipment.disques || equipment.data?.disques || [],
        capacite,
        firmware: FIRMWARE_EQUIPMENT_TYPES.has(type) ? equipment.firmware || equipment.version || "" : undefined,
        licences: type === "Firewalls" ? equipment.licences || [] : undefined,
        firewallType: type === "Firewalls" ? equipment.firewallType || equipment.data?.firewallType || "" : undefined,
        stormshieldWanUrl: type === "Firewalls" ? stormshieldWanUrl : undefined,
        modeHA: type === "Firewalls" || type === "Serveurs" || type === "NAS" ? Boolean(equipment.modeHA ?? equipment.data?.modeHA) : undefined,
        roleHA: type === "Firewalls" || type === "Serveurs" || type === "NAS" ? equipment.roleHA || equipment.data?.roleHA || "" : undefined,
        firewallHAName: type === "Firewalls" ? equipment.firewallHAName || equipment.data?.firewallHAName || "" : undefined,
        serverHAName: type === "Serveurs" ? equipment.serverHAName || equipment.data?.serverHAName || "" : undefined,
        storageHAName: type === "NAS" ? equipment.storageHAName || equipment.data?.storageHAName || "" : undefined,
        domaine: type === "Ordinateurs" ? ordinateurDomaine : undefined,
        computerType: type === "Ordinateurs" ? canonicalizeComputerType(equipment.type || equipment.data?.type || "") || inferComputerTypeFromInventory(equipment.data || equipment) || inferComputerTypeFromInventory(equipment) : undefined,
        netbios: type === "Ordinateurs" ? equipment.netbios || equipment.hostname || equipment.data?.netbios || equipment.data?.hostname || "" : undefined,
        agentOnline: type === "Ordinateurs" || type === "Serveurs" ? agentOnline : undefined,
        agentManaged: type === "Ordinateurs" || type === "Serveurs" ? equipment.source === "rmm" || equipment.data?.source === "rmm" || Boolean(equipment.agentId || equipment.agent_id) : undefined,
        rmmAgentId: type === "Ordinateurs" || type === "Serveurs" ? equipment.agentId || equipment.agent_id || equipment.data?.agentId || null : undefined,
        agentVersion: type === "Ordinateurs" ? equipment.agentVersion || equipment.agent_version || equipment.data?.agentVersion || equipment.data?.agent_version || null : undefined,
        systeme: type === "Ordinateurs" ? ordinateurSysteme : systeme,
        adresseMac: NETWORK_PERIPHERAL_TYPES.has(type) ? equipment.adresseMac || equipment.mac || "" : undefined,
        alimentationType: type === "Alimentation" ? resolveAlimentationDeploymentType(equipment.alimentationType, equipment.data?.alimentationType, equipment.type, equipment.data?.type) || "Onduleur" : undefined,
        routeurType: type === "Routeur" ? equipment.routeurType || equipment.type || "" : undefined,
        adminUrl: type === "Routeur" || type === "Switch" || type === "Alimentation" || type === "TOIP" ? equipment.adminUrl || equipment.urlAdministration || "" : undefined,
        manageable: type === "Switch" || type === "Alimentation" || type === "TOIP" ? !!equipment.manageable : undefined,
        poeSupport: type === "Switch" ? !!equipment.poeSupport : undefined,
        empilage: type === "Switch" ? !!equipment.empilage : undefined,
        toipType: type === "TOIP" ? resolveToipDeploymentType(equipment.toipType, equipment.data?.toipType, equipment.type, equipment.data?.type) || "IP-PBX" : undefined,
        nombreExtensions: type === "TOIP" ? equipment.nombreExtensions || equipment.nbExtensions || equipment.extensions || "" : undefined,
        domaineSip: type === "TOIP" ? equipment.domaineSip || equipment.domaine || "" : undefined,
        capaciteVA: type === "Alimentation" ? equipment.capaciteVA || equipment.capacite || "" : undefined,
        capaciteW: type === "Alimentation" ? equipment.capaciteW || equipment.puissanceW || "" : undefined,
        nbPrises: type === "Alimentation" ? equipment.nbPrises || equipment.nombrePrises || "" : undefined,
        dateBatterie: type === "Alimentation" ? equipment.dateBatterie || null : undefined,
        unifiApiHost: type === "Switch" ? unifiApiHost : undefined,
        unifiApiKey: type === "Switch" ? unifiApiKey : undefined,
        unifiApiRejectUnauthorized: type === "Switch" ? unifiApiRejectUnauthorized : undefined,
        unifiApiConfiguredAt: type === "Switch" ? unifiApiConfiguredAt : undefined,
        ssids: type === "BorneWifi" ? equipment.ssids || equipment.data?.ssids || equipment.assignedSsids || equipment.data?.assignedSsids : undefined,
        assignedSsidIds: type === "BorneWifi" ? equipment.assignedSsidIds || equipment.data?.assignedSsidIds : undefined,
        fournisseur: type === "Internet" ? equipment.fournisseur || "" : undefined,
        internetType: type === "Internet" ? equipment.internetType || equipment.data?.internetType || equipment.type || "" : undefined,
        debit: type === "Internet" ? equipment.debit || "" : undefined,
        debitDownload: type === "Internet" ? equipment.debitDownload || "" : undefined,
        debitUpload: type === "Internet" ? equipment.debitUpload || "" : undefined,
        categorie: type === "Internet" ? equipment.categorie || "Principale" : undefined,
        ipNonDesktop: type === "Internet" ? equipment.ipNonDesktop || false : undefined,
        numeroLigne: type === "Internet" ? equipment.numeroLigne || "" : undefined,
        referenceContrat: type === "Internet" ? equipment.referenceContrat || "" : undefined,
        supportTelephone: type === "Internet" ? equipment.supportTelephone || "" : undefined,
        dateMiseEnService: type === "Internet" ? equipment.dateMiseEnService || "" : undefined,
        boxModele: type === "Internet" ? equipment.boxModele || "" : undefined,
        ha: type === "Internet" ? equipment.ha ?? equipment.data?.ha : undefined,
        gateway: type === "Internet" ? equipment.gateway || "" : undefined,
        commentaire: type === "Internet" || type === "Firewalls" || type === "Routeur" || type === "Switch" || type === "BorneWifi" || type === "Alimentation" || type === "TOIP" ? equipment.commentaire || "" : undefined,
        alimentationPoE: type === "BorneWifi" ? !!equipment.alimentationPoE : undefined,
        checkmkMapping: checkmkMapping || null,
        createdAt: equipment.created_at || equipment.createdAt || null,
        created_at: equipment.created_at || equipment.createdAt || null,
        rawData: equipment
      };
      equipmentMap.set(dedupeKey, equipmentData);
      equipmentListOut.push(equipmentData);
    });
  });
  return equipmentListOut;
}
function clientHasHardwareEquipements(client) {
  if (!client?.equipements || typeof client.equipements !== "object") return false;
  return HARDWARE_EQUIPMENT_TYPES.some(type => Array.isArray(client.equipements[type]) && client.equipements[type].length > 0);
}
export const getClientHardwareEquipment = async (clientId, options = {}) => {
  if (options.client && clientHasHardwareEquipements(options.client)) {
    return mapClientHardwareEquipment(options.client);
  }
  const response = await fetch(`${API_BASE_URL}/clients/${clientId}`, {
    method: "GET",
    credentials: "include",
    signal: options.signal,
    headers: {
      "Content-Type": "application/json"
    }
  });
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }
  const client = await response.json();
  if (!clientHasHardwareEquipements(client)) {
    try {
      const modulesData = await fetchClientModules(clientId, {
        signal: options.signal
      });
      if (modulesData?.equipements && typeof modulesData.equipements === "object") {
        client.equipements = modulesData.equipements;
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.warn("Loading client equipment (modules fallback):", err);
      }
    }
  }
  return mapClientHardwareEquipment(client);
};
export const getAllHardwareEquipment = async (options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/clients/equipment-fleet`, {
      method: "GET",
      credentials: "include",
      signal: options.signal,
      headers: {
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    const rows = await response.json();
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    console.error("Error fetching all equipment:", error);
    throw error;
  }
};

/** Supervision ops: monitoring-integration alerts on mapped devices only. */
export const getEquipmentFleetIssues = async (options = {}) => {
  const response = await fetch(`${API_BASE_URL}/clients/equipment-fleet/issues`, {
    method: "GET",
    credentials: "include",
    signal: options.signal,
    headers: {
      "Content-Type": "application/json"
    }
  });
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }
  const data = await response.json();
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    meta: data?.meta || {}
  };
};

/** Lean list for Admin equipment purge — avoids full /clients/general dump. */
export const getEquipmentPurgeList = async (options = {}) => {
  const response = await fetch(`${API_BASE_URL}/clients/equipment-purge`, {
    method: "GET",
    credentials: "include",
    signal: options.signal,
    headers: {
      "Content-Type": "application/json"
    }
  });
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }
  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
};

/** Lean inventory of all client devices, including custom families. */
export const getEquipmentInventoryList = async (options = {}) => {
  const response = await fetch(`${API_BASE_URL}/clients/equipment-inventory`, {
    method: "GET",
    credentials: "include",
    signal: options.signal,
    headers: {
      "Content-Type": "application/json"
    }
  });
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }
  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
};

export const bulkUpdateEquipmentInventory = async ({ items = [], updates = {} } = {}) => {
  const response = await fetch(`${API_BASE_URL}/clients/equipment-inventory/bulk`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ items, updates })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Error ${response.status}`);
  }
  return data;
};

export const deleteEquipment = async equipment => {
  if (!equipment) {
    throw new Error("No equipment provided for deletion");
  }
  const clientId = equipment.clientId || equipment.rawData?.client_id;
  const customFamilyKey = equipment.familyKey
    || (String(equipment.type || "").startsWith("Custom:") ? String(equipment.type).slice("Custom:".length) : null)
    || (String(equipment.family || "").startsWith("custom:") ? String(equipment.family).slice("custom:".length) : null);
  const isCustom = Boolean(equipment.isCustom || customFamilyKey && (
    String(equipment.type || "").startsWith("Custom:") || String(equipment.family || "").startsWith("custom:")
  ));
  if (isCustom) {
    if (!clientId || !customFamilyKey) {
      throw new Error("Incomplete information for equipment deletion");
    }
    const itemId = equipment.dbId || (isDbEquipmentId(equipment.id) && !String(equipment.id).includes(":") ? String(equipment.id) : null);
    if (!itemId) {
      throw new Error("Incomplete information for equipment deletion");
    }
    await deleteClientCustomEquipment(clientId, customFamilyKey, itemId);
    return;
  }
  let type = equipment.type || equipment.rawData?.type;
  let equipmentName = equipment.name || equipment.rawData?.nom || equipment.rawData?.name || '';
  if (!clientId || !type) {
    throw new Error("Incomplete information for equipment deletion");
  }
  const typeToFamily = {
    'Serveurs': 'servers',
    'Servers': 'servers',
    'NAS': 'nas',
    'Stockage': 'nas',
    'Storage': 'nas',
    'Firewalls': 'firewall',
    'Switch': 'switch',
    'BorneWifi': 'wifi',
    'Alimentation': 'alimentation',
    'Routeur': 'routeur',
    'TOIP': 'toip',
    'Internet': 'internet',
    'Ordinateurs': 'ordinateurs'
  };
  let family = equipment.family || typeToFamily[type] || typeToFamily[normalizeEquipmentApiType(type)];
  if (!family) {
    type = equipment.rawData?.type || type;
    family = typeToFamily[type] || typeToFamily[normalizeEquipmentApiType(type)];
  }
  if (!family) {
    throw new Error(`Unsupported equipment type for deletion: ${type}`);
  }

  type = normalizeEquipmentApiType(type);
  const urlFamily = type === 'Serveurs' ? 'servers' : family;
  const knownDbId = equipment.dbId || (isDbEquipmentId(equipment.id) && !String(equipment.id).includes(":") ? String(equipment.id) : null) || equipment.rawData?.id;
  if (knownDbId && isDbEquipmentId(knownDbId)) {
    const url = `${API_BASE_URL}/clients/modules/${clientId}/${urlFamily}/${knownDbId}`;
    const response = await fetch(url, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Error ${response.status}: ${errorText || response.statusText}`);
    }
    return;
  }

  if (type === 'Internet' && !equipmentName) {
    const internetType = equipment.rawData?.type || '';
    const fournisseur = equipment.rawData?.fournisseur || '';
    if (internetType && fournisseur) {
      equipmentName = `${internetType.toUpperCase()} ${fournisseur.toUpperCase()}`;
    } else if (internetType) {
      equipmentName = internetType.toUpperCase();
    } else if (fournisseur) {
      equipmentName = fournisseur.toUpperCase();
    }
  }
  if (!equipmentName) {
    throw new Error("Equipment name missing for deletion");
  }
  const searchFamily = type === 'Serveurs' ? 'servers' : family;
  const findEquipmentResponse = await fetch(`${API_BASE_URL}/clients/modules/${clientId}/${searchFamily}`, {
    credentials: 'include'
  });
  if (!findEquipmentResponse.ok) {
    throw new Error(`Error searching for equipment to delete: ${findEquipmentResponse.status}`);
  }
  const allEquipment = await findEquipmentResponse.json();
  const foundEquipment = findEquipmentInApiList(allEquipment, equipment, {
    type,
    equipmentName
  });
  if (!foundEquipment) {
    throw new Error(`Equipment to delete not found: ${equipmentName}`);
  }
  const realEquipmentId = foundEquipment.id;
  const url = `${API_BASE_URL}/clients/modules/${clientId}/${urlFamily}/${realEquipmentId}`;
  const response = await fetch(url, {
    method: 'DELETE',
    credentials: 'include'
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Error ${response.status}: ${errorText || response.statusText}`);
  }
};
const TYPE_TO_FAMILY = {
  Serveurs: 'servers',
  Servers: 'servers',
  NAS: 'nas',
  Stockage: 'nas',
  Storage: 'nas',
  Firewalls: 'firewall',
  Switch: 'switch',
  BorneWifi: 'wifi',
  Alimentation: 'alimentation',
  Routeur: 'routeur',
  TOIP: 'toip',
  Internet: 'internet',
  Ordinateurs: 'ordinateurs'
};
const MODULE_KEY_TO_TYPE = {
  Internet: 'Internet',
  Firewalls: 'Firewalls',
  Firewall: 'Firewalls',
  Servers: 'Serveurs',
  Serveurs: 'Serveurs',
  Storage: 'NAS',
  Stockage: 'NAS',
  Switch: 'Switch',
  BorneWifi: 'BorneWifi',
  Alimentation: 'Alimentation',
  Routeur: 'Routeur',
  TOIP: 'TOIP',
  Ordinateurs: 'Ordinateurs'
};
function normalizeEquipmentApiType(type) {
  if (!type) return type;
  if (type === 'Servers' || type === 'Server') return 'Serveurs';
  if (type === 'Storage' || type === 'Stockage') return 'NAS';
  if (type === 'Firewall') return 'Firewalls';
  return type;
}
function resolveFormSiteValue(formData, existingData = {}) {
  if (formData && formData.location !== undefined) {
    return String(formData.location || "").trim();
  }
  const fallback = existingData.site ?? existingData.location ?? existingData.emplacement ?? "";
  return String(fallback || "").trim();
}
function applySiteFieldsToPayload(payload, siteValue) {
  payload.site = siteValue;
  payload.location = siteValue;
  payload.emplacement = siteValue;
}
function buildEquipmentDataPayload(type, formData, existingData = {}, equipment = null) {
  const {
    id: _id,
    __fromDb,
    __index,
    ...dataForDb
  } = existingData;
  const siteValue = resolveFormSiteValue(formData, existingData);
  const sharedFields = buildSharedEquipmentFormData({
    ...existingData,
    ...formData
  });
  const updatedData = type === 'Internet' ? (() => {
    const ipNonDesktop = formData.ipNonDesktop !== undefined ? !!formData.ipNonDesktop : !!existingData.ipNonDesktop;
    const ip = ipNonDesktop ? "Non-static IP" : formData.ip !== undefined ? formData.ip : existingData.ip;
    const payload = {
      nom: formData.name || existingData.nom || existingData.name,
      ip,
      fournisseur: formData.fournisseur || existingData.fournisseur,
      type: formData.internetType || existingData.internetType || existingData.type,
      debit: formData.debit || existingData.debit,
      debitDownload: formData.debitDownload || existingData.debitDownload,
      debitUpload: formData.debitUpload || existingData.debitUpload,
      categorie: formData.categorie || existingData.categorie,
      ipNonDesktop,
      numeroLigne: formData.numeroLigne || existingData.numeroLigne,
      referenceContrat: formData.referenceContrat || existingData.referenceContrat,
      supportTelephone: formData.supportTelephone || existingData.supportTelephone,
      dateMiseEnService: formData.dateMiseEnService || existingData.dateMiseEnService,
      boxModele: formData.boxModele || existingData.boxModele,
      gateway: formData.gateway || existingData.gateway,
      commentaire: formData.commentaire || existingData.commentaire
    };
    applySiteFieldsToPayload(payload, siteValue);
    return applySharedEquipmentFields(payload, sharedFields);
  })() : {
    ...dataForDb,
    nom: formData.name || existingData.nom || existingData.name,
    ip: formData.ip || existingData.ip,
    adresseMac: NETWORK_PERIPHERAL_TYPES.has(type) ? formData.adresseMac || formData.mac || existingData.adresseMac || existingData.mac || '' : formData.mac || existingData.adresseMac || existingData.mac,
    numeroSerie: formData.serial || existingData.numeroSerie || existingData.serial,
    modele: formData.model || existingData.modele || existingData.model,
    marque: formData.manufacturer || existingData.marque || existingData.fabricant || existingData.manufacturer,
    version: type === 'Firewalls' ? formData.firmware || existingData.firmware || existingData.version || '' : type === 'Switch' ? formData.firmware || formData.version || existingData.firmware || existingData.version || '' : type === 'BorneWifi' ? formData.firmware || formData.version || existingData.firmware || existingData.version || '' : formData.version || existingData.version || existingData.firmware,
    processeur: formData.processeur || existingData.processeur || existingData.cpu || existingData.vcpu,
    memoire: formData.memoire || existingData.memoire || existingData.ram || existingData.memory,
    stockage: formData.stockage || existingData.stockage || existingData.storage,
    systeme: formData.systeme || existingData.systeme || existingData.os,
    vlan: formData.vlan || existingData.vlan,
    type: type === 'NAS' ? formData.type || existingData.type || 'NAS' : type === 'Routeur' ? formData.routeurType || existingData.routeurType || existingData.type || 'Routeur' : type === 'Alimentation' ? resolveAlimentationDeploymentType(formData.alimentationType, existingData.alimentationType, existingData.type) || 'Onduleur' : type === 'TOIP' ? resolveToipDeploymentType(formData.toipType, existingData.toipType, existingData.type) || 'IP-PBX' : type === 'Firewalls' ? formData.firewallType || existingData.firewallType || existingData.type || 'materiel' : type === 'Ordinateurs' ? canonicalizeComputerType(formData.computerType || existingData.type) || '' : formData.typeServer || existingData.type,
    role: type === 'NAS' ? normalizeStorageRoles(formData.role !== undefined ? formData.role : existingData.role) : Array.isArray(formData.role) ? formData.role : formData.role ? [formData.role] : existingData.role || [],
    expirationGarantie: formData.expirationGarantie !== undefined ? formData.expirationGarantie : existingData.expirationGarantie || existingData.garantie,
    nbDisquesActuels: formData.nbDisquesActuels !== undefined ? formData.nbDisquesActuels : existingData.nbDisquesActuels || '',
    nbDisquesMax: formData.nbDisquesMax !== undefined ? formData.nbDisquesMax : existingData.nbDisquesMax || '',
    disques: formData.disques || existingData.disques || [],
    capacite: formData.capacite || existingData.capacite || '',
    raid: formData.raid || existingData.raid || '',
    luns: formData.luns || existingData.luns || [],
    cassettesRDX: formData.cassettesRDX || existingData.cassettesRDX || [],
    numeroDisque: formData.numeroDisque !== undefined ? formData.numeroDisque : existingData.numeroDisque || '',
    firmware: FIRMWARE_EQUIPMENT_TYPES.has(type) ? formData.firmware || formData.version || existingData.firmware || existingData.version || '' : undefined,
    routeurType: type === 'Routeur' ? formData.routeurType || existingData.routeurType || existingData.type || 'Routeur' : existingData.routeurType,
    alimentationType: type === 'Alimentation' ? resolveAlimentationDeploymentType(formData.alimentationType, existingData.alimentationType, existingData.type) || 'Onduleur' : existingData.alimentationType,
    toipType: type === 'TOIP' ? resolveToipDeploymentType(formData.toipType, existingData.toipType, existingData.type) || 'IP-PBX' : existingData.toipType,
    nombreExtensions: type === 'TOIP' ? formData.nombreExtensions !== undefined ? String(formData.nombreExtensions || '') : existingData.nombreExtensions || existingData.nbExtensions || existingData.extensions || '' : existingData.nombreExtensions,
    domaineSip: type === 'TOIP' ? formData.domaineSip !== undefined ? String(formData.domaineSip || '') : existingData.domaineSip || existingData.domaine || '' : existingData.domaineSip,
    capaciteVA: type === 'Alimentation' ? formData.capaciteVA !== undefined ? String(formData.capaciteVA || '') : existingData.capaciteVA || existingData.capacite || '' : existingData.capaciteVA,
    capaciteW: type === 'Alimentation' ? formData.capaciteW !== undefined ? String(formData.capaciteW || '') : existingData.capaciteW || existingData.puissanceW || '' : existingData.capaciteW,
    nbPrises: type === 'Alimentation' ? formData.nbPrises !== undefined ? String(formData.nbPrises || '') : existingData.nbPrises || existingData.nombrePrises || '' : existingData.nbPrises,
    dateBatterie: type === 'Alimentation' ? formData.dateBatterie || existingData.dateBatterie || '' : existingData.dateBatterie,
    licences: type === 'Firewalls' ? formData.licences || existingData.licences || [] : undefined,
    firewallType: type === 'Firewalls' ? formData.firewallType || existingData.firewallType || existingData.type || 'materiel' : existingData.firewallType,
    modeHA: type === 'Firewalls' || type === 'Serveurs' || type === 'Servers' || type === 'NAS' || type === 'Storage' ? formData.modeHA !== undefined ? formData.modeHA : existingData.modeHA : undefined,
    roleHA: type === 'Firewalls' || type === 'Serveurs' || type === 'Servers' || type === 'NAS' || type === 'Storage' ? formData.roleHA !== undefined ? formData.roleHA : existingData.roleHA || '' : undefined,
    firewallHA: type === 'Firewalls' ? formData.firewallHA !== undefined ? formData.firewallHA : existingData.firewallHA : undefined,
    firewallHAName: type === 'Firewalls' ? formData.firewallHAName !== undefined ? formData.firewallHAName : existingData.firewallHAName || '' : undefined,
    serverHA: type === 'Serveurs' || type === 'Servers' ? formData.serverHA !== undefined ? formData.serverHA : existingData.serverHA : undefined,
    serverHAName: type === 'Serveurs' || type === 'Servers' ? formData.serverHAName !== undefined ? formData.serverHAName : existingData.serverHAName || '' : undefined,
    storageHA: type === 'NAS' || type === 'Storage' ? formData.storageHA !== undefined ? formData.storageHA : existingData.storageHA : undefined,
    storageHAName: type === 'NAS' || type === 'Storage' ? formData.storageHAName !== undefined ? formData.storageHAName : existingData.storageHAName || '' : undefined,
    stormshieldWanUrl: type === 'Firewalls' ? formData.stormshieldWanUrl !== undefined ? String(formData.stormshieldWanUrl || '').trim() : existingData.stormshieldWanUrl || '' : undefined,
    commentaire: type === 'Firewalls' || type === 'Routeur' || type === 'Serveurs' || type === 'NAS' || type === 'Switch' || type === 'BorneWifi' || type === 'Alimentation' || type === 'TOIP' || type === 'Ordinateurs' ? formData.commentaire !== undefined ? String(formData.commentaire || '') : existingData.commentaire || '' : existingData.commentaire,
    unifiId: formData.unifiId !== undefined ? formData.unifiId : existingData.unifiId,
    unifiMac: formData.unifiMac !== undefined ? formData.unifiMac : existingData.unifiMac,
    unifiSiteId: formData.unifiSiteId !== undefined ? formData.unifiSiteId : existingData.unifiSiteId,
    unifiHostId: formData.unifiHostId !== undefined ? formData.unifiHostId : existingData.unifiHostId,
    domaine: type === 'Ordinateurs' ? formData.domaine !== undefined ? String(formData.domaine || '') : existingData.domaine || '' : existingData.domaine,
    netbios: type === 'Ordinateurs' ? formData.netbios !== undefined ? String(formData.netbios || '') : existingData.netbios || '' : existingData.netbios,
    source: type === 'Ordinateurs' ? existingData.source === 'rmm' ? 'rmm' : formData.source || existingData.source || 'manual' : existingData.source,
    hypervisor: type === 'Serveurs' || type === 'Servers' ? formData.hypervisor !== undefined ? String(formData.hypervisor || '') : existingData.hypervisor || existingData.hyperviseur || '' : existingData.hypervisor,
    hostServerName: type === 'Serveurs' || type === 'Servers' ? formData.hostServerName !== undefined ? String(formData.hostServerName || '') : existingData.hostServerName || existingData.serveurHote || '' : existingData.hostServerName,
    adminUrl: type === 'Routeur' || type === 'Switch' || type === 'Alimentation' || type === 'TOIP' ? formData.adminUrl !== undefined ? String(formData.adminUrl || '').trim() : existingData.adminUrl || existingData.urlAdministration || '' : existingData.adminUrl,
    manageable: type === 'Switch' || type === 'Alimentation' || type === 'TOIP' ? formData.manageable !== undefined ? !!formData.manageable : !!existingData.manageable : existingData.manageable,
    poeSupport: type === 'Switch' ? formData.poeSupport !== undefined ? !!formData.poeSupport : !!existingData.poeSupport : existingData.poeSupport,
    empilage: type === 'Switch' ? formData.empilage !== undefined ? !!formData.empilage : !!existingData.empilage : existingData.empilage,
    adresseMac: NETWORK_PERIPHERAL_TYPES.has(type) || type === 'Ordinateurs' ? formData.adresseMac || formData.mac || existingData.adresseMac || existingData.mac || '' : undefined,
    ssids: type === 'BorneWifi' ? (() => {
      const catalog = formData.clientSsids || [];
      if (formData.assignedSsidIds !== undefined) {
        return serializeAssignedSsidsForPersistence(formData.assignedSsidIds, catalog);
      }
      if (formData.ssids !== undefined) {
        const ids = resolveAssignedSsidIds(formData.ssids, catalog);
        return serializeAssignedSsidsForPersistence(ids, catalog);
      }
      return existingData.ssids || [];
    })() : undefined,
    alimentationPoE: type === 'BorneWifi' ? formData.alimentationPoE !== undefined ? !!formData.alimentationPoE : !!existingData.alimentationPoE : existingData.alimentationPoE,
    anydeskId: type === 'Serveurs' ? (() => {
      const solution = String(formData.remoteAccessSolution ?? existingData.remoteAccessSolution ?? "").trim();
      const id = String(formData.remoteAccessId ?? formData.anydeskId ?? existingData.remoteAccessId ?? existingData.anydeskId ?? "").trim();
      const effectiveSolution = solution || (id ? "anydesk" : "");
      return effectiveSolution === "anydesk" ? id : "";
    })() : existingData.anydeskId,
    remoteAccessSolution: type === 'Serveurs' ? (() => {
      const solution = formData.remoteAccessSolution ?? existingData.remoteAccessSolution ?? "";
      const id = formData.remoteAccessId ?? formData.anydeskId ?? existingData.remoteAccessId ?? existingData.anydeskId ?? "";
      return String(solution || (id ? "anydesk" : ""));
    })() : existingData.remoteAccessSolution,
    remoteAccessId: type === 'Serveurs' ? String(formData.remoteAccessId ?? formData.anydeskId ?? existingData.remoteAccessId ?? existingData.anydeskId ?? "") : existingData.remoteAccessId,
    quickConnect: type === 'NAS' ? formData.quickConnect || existingData.quickConnect || '' : existingData.quickConnect,
    unifiApiHost: type === 'Switch' ? formData.unifiApiHost !== undefined ? formData.unifiApiHost : existingData.unifiApiHost || '' : existingData.unifiApiHost,
    unifiApiKey: type === 'Switch' ? formData.unifiApiKey !== undefined ? formData.unifiApiKey : existingData.unifiApiKey || '' : existingData.unifiApiKey,
    unifiApiRejectUnauthorized: type === 'Switch' ? formData.unifiApiRejectUnauthorized !== undefined ? formData.unifiApiRejectUnauthorized : existingData.unifiApiRejectUnauthorized === true : existingData.unifiApiRejectUnauthorized,
    unifiApiConfiguredAt: type === 'Switch' ? formData.unifiApiConfiguredAt || existingData.unifiApiConfiguredAt || '' : existingData.unifiApiConfiguredAt,
    checkmk_host_name: type === 'Serveurs' ? existingData.checkmk_host_name || dataForDb.checkmk_host_name || equipment?.rawData?.data?.checkmk_host_name || '' : existingData.checkmk_host_name || dataForDb.checkmk_host_name || equipment?.rawData?.data?.checkmk_host_name,
    checkmk_site: type === 'Serveurs' ? existingData.checkmk_site || dataForDb.checkmk_site || equipment?.rawData?.data?.checkmk_site || null : existingData.checkmk_site || dataForDb.checkmk_site || equipment?.rawData?.data?.checkmk_site
  };
  if (type !== 'Internet') {
    applySiteFieldsToPayload(updatedData, siteValue);
  }
  const extensionFields = formData.__systemExtensionFields || [];
  const payload = applySystemExtensionFields(applySharedEquipmentFields(updatedData, sharedFields), formData, extensionFields);
  const extensionKeys = new Set(extensionFields.map(field => field?.fieldKey).filter(Boolean));
  const fieldsToPreserve = ['site', 'location', 'emplacement', 'checkmk_host_name', 'checkmk_site', 'ipNonDesktop', 'unifiApiHost', 'unifiApiKey', 'unifiApiRejectUnauthorized', 'unifiApiConfiguredAt', 'stormshieldWanUrl', 'purchaseDate', 'invoiceNumber', 'installDate', 'expirationGarantie'];
  if (type === 'Serveurs') fieldsToPreserve.push('role');
  Object.keys(payload).forEach(key => {
    const value = payload[key];
    if (fieldsToPreserve.includes(key) || extensionKeys.has(key)) return;
    const isEmptyArray = Array.isArray(value) && value.length === 0;
    const isEmptyString = typeof value === 'string' && value.trim() === '';
    if (value === undefined || value === null || isEmptyString || isEmptyArray) {
      delete payload[key];
    }
  });
  return payload;
}
function resolveEquipmentIsActivePayload(formData, fallbacks = []) {
  if (formData && Object.prototype.hasOwnProperty.call(formData, "is_active")) {
    return formData.is_active !== false;
  }
  if (formData && Object.prototype.hasOwnProperty.call(formData, "isActive")) {
    return formData.isActive !== false;
  }
  for (const source of fallbacks) {
    if (!source || typeof source !== "object") continue;
    if (source.is_active !== undefined && source.is_active !== null) return source.is_active !== false;
    if (source.isActive !== undefined && source.isActive !== null) return source.isActive !== false;
  }
  return true;
}
export const createEquipment = async (clientId, moduleKey, formData) => {
  const type = normalizeEquipmentApiType(MODULE_KEY_TO_TYPE[moduleKey] || moduleKey);
  const family = TYPE_TO_FAMILY[type];
  if (!family) throw new Error(`Unsupported equipment type: ${type}`);
  const name = (formData.name || '').trim();
  if (!name) throw new Error('Name is required');
  const data = buildEquipmentDataPayload(type, formData, {});
  const urlFamily = type === 'Serveurs' ? 'servers' : family;
  const itemKey = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const response = await fetch(`${API_BASE_URL}/clients/modules/${clientId}/${urlFamily}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      item_key: itemKey,
      name,
      data,
      is_active: resolveEquipmentIsActivePayload(formData)
    })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error ${response.status}: ${errorText || response.statusText}`);
  }
  return response.json();
};
export const updateEquipment = async (equipmentId, formData, equipment = null) => {
  try {
    const parts = (equipmentId || '').split('-');
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(equipmentId);
    let clientId;
    let type;
    let equipmentName;
    const looksLikeCompositeId = !isUUID && parts.length >= 3 && /^\d+$/.test(parts[0]);
    if (isUUID || !looksLikeCompositeId) {
      if (!equipment) {
        throw new Error('Invalid ID format');
      }
      clientId = equipment.clientId || equipment.rawData?.client_id;
      type = equipment.type || equipment.rawData?.type;
      equipmentName = equipment.name || equipment.rawData?.nom || equipment.rawData?.name || '';
    } else {
      clientId = parts[0];
      type = parts[1];
    }
    if (!equipmentName && type === 'Internet') {
      const remainingParts = parts.slice(2);
      const lastPart = remainingParts[remainingParts.length - 1];
      const isIpOrMac = /^(\d{1,3}\.){3}\d{1,3}$/.test(lastPart) || /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(lastPart);
      if (isIpOrMac && remainingParts.length > 1) {
        equipmentName = remainingParts.slice(0, -1).join('-');
      } else {
        equipmentName = remainingParts.join('-');
      }
      if (equipmentName.includes('-') && equipmentName.split('-').length === 2) {
        equipmentName = equipmentName.replace('-', ' ');
      }
    } else if (!equipmentName) {
      equipmentName = parts.length > 3 ? parts.slice(2, -1).join('-') : parts.slice(2).join('-');
    }
    const typeToFamily = {
      'Serveurs': 'servers',
      'Servers': 'servers',
      'NAS': 'nas',
      'Stockage': 'nas',
      'Storage': 'nas',
      'Firewalls': 'firewall',
      'Switch': 'switch',
      'BorneWifi': 'wifi',
      'Alimentation': 'alimentation',
      'Routeur': 'routeur',
      'TOIP': 'toip',
      'Internet': 'internet',
      'Ordinateurs': 'ordinateurs'
    };
    let family = typeToFamily[type] || typeToFamily[normalizeEquipmentApiType(type)];
    if (!family) {
      if (equipment) {
        type = equipment.type || equipment.rawData?.type;
        equipmentName = equipmentName || equipment.name || equipment.rawData?.nom || equipment.rawData?.name || '';
        family = typeToFamily[type] || typeToFamily[normalizeEquipmentApiType(type)];
      }
    }
    if (!family) {
      throw new Error(`Unsupported equipment type: ${type}`);
    }
    type = normalizeEquipmentApiType(type);
    const resolveRealEquipmentId = () => {
      const dbId = getEquipmentDbId(equipment);
      if (dbId) return dbId;
      const isDbId = value => {
        if (value == null || value === "") return false;
        const str = String(value);
        return /^\d+$/.test(str) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      };
      if (equipment?.rawData?.data && isDbId(equipment.rawData.id)) {
        return String(equipment.rawData.id);
      }
      if (isUUID && isDbId(equipmentId)) return String(equipmentId);
      const candidateIds = [equipment?.dbId, equipment?.rawData?.id, equipment?.id];
      for (const candidate of candidateIds) {
        if (isDbId(candidate)) {
          return String(candidate);
        }
      }
      return null;
    };
    const putEquipmentUpdate = async (realEquipmentId, existingData, existingRow = null) => {
      const updatedData = buildEquipmentDataPayload(type, formData, existingData, equipment);
      const urlFamily = type === 'Serveurs' ? 'servers' : family;
      const url = `${API_BASE_URL}/clients/modules/${clientId}/${urlFamily}/${realEquipmentId}`;
      const nextName = formData.name || equipmentName || existingData.nom || existingData.name;
      const stableItemKey = existingRow?.item_key || equipment?.rawData?.item_key || equipment?.item_key || null;
      const response = await fetch(url, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          item_key: stableItemKey || nextName,
          name: nextName,
          data: updatedData,
          is_active: resolveEquipmentIsActivePayload(formData, [existingRow, equipment, existingData])
        })
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText || response.statusText}`);
      }
      return response.json();
    };
    const directEquipmentId = resolveRealEquipmentId();
    if (directEquipmentId && clientId) {
      const existingData = equipment?.rawData?.data || equipment?.rawData || equipment?.data || equipment || {};
      try {
        return await putEquipmentUpdate(directEquipmentId, existingData, equipment?.rawData || null);
      } catch (err) {
        const message = err?.message || "";
        const isNotFound = message.includes("404") || message.includes("Introuvable") || message.includes("Not found");
        if (!isNotFound) throw err;
      }
    }
    const searchFamily = type === 'Serveurs' ? 'servers' : family;
    const findEquipmentResponse = await fetch(`${API_BASE_URL}/clients/modules/${clientId}/${searchFamily}`, {
      credentials: 'include'
    });
    if (!findEquipmentResponse.ok) {
      throw new Error(`Error searching for equipment: ${findEquipmentResponse.status}`);
    }
    const allEquipment = await findEquipmentResponse.json();
    const foundEquipment = findEquipmentInApiList(allEquipment, equipment, {
      type,
      equipmentName
    });
    if (!foundEquipment) {
      throw new Error(`Equipment not found: ${equipmentName}`);
    }
    const realEquipmentId = foundEquipment.id;
    const existingData = foundEquipment.data || equipment?.rawData || {};
    return putEquipmentUpdate(realEquipmentId, existingData, foundEquipment);
  } catch (error) {
    console.error('Error updating equipment:', error);
    throw error;
  }
};
export const getEquipmentLogs = async (equipmentId, page = 1, limit = 10, options = {}) => {
  try {
    let clientId, type, equipmentName;
    const isUUID = equipmentId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    if (isUUID) {
      clientId = options.clientId;
      type = options.type;
      equipmentName = options.name;
      if (!clientId || !type || !equipmentName) {
        throw new Error('The clientId, type and name parameters are required for a UUID');
      }
    } else {
      const parts = equipmentId.split('-');
      if (parts.length < 3) {
        throw new Error('Invalid ID format');
      }
      clientId = parts[0];
      type = parts[1];
      equipmentName = parts.length > 3 ? parts.slice(2, -1).join('-') : parts.slice(2).join('-');
    }
    const family = resolveEquipmentLogFamily(type, options);
    const logsUrl = withApiQuery(`${API_BASE_URL}/clients/modules/${clientId}/${family}/${encodeURIComponent(equipmentName)}/logs`, {
      page,
      limit,
      equipment_id: options.dbId || undefined,
      search: options.search && String(options.search).trim() ? String(options.search).trim() : undefined,
      category: options.category && String(options.category).trim() && options.category !== "all" ? String(options.category).trim() : undefined
    });
    const response = await fetch(logsUrl, {
      method: 'GET',
      credentials: 'include',
      signal: options.signal,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      if (response.status === 404) {
        return {
          logs: [],
          total: 0,
          page,
          limit,
          totalPages: 0
        };
      }
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    console.error('Error fetching logs:', error);
    return {
      logs: [],
      total: 0,
      page,
      limit,
      totalPages: 0
    };
  }
};
export const purgeEquipmentLogs = async (equipmentId, options = {}) => {
  let clientId;
  let type;
  let equipmentName;
  const isUUID = equipmentId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  if (isUUID) {
    clientId = options.clientId;
    type = options.type;
    equipmentName = options.name;
    if (!clientId || !type || !equipmentName) {
      throw new Error("The clientId, type and name parameters are required for a UUID");
    }
  } else {
    const parts = equipmentId.split("-");
    if (parts.length < 3) {
      throw new Error("Invalid ID format");
    }
    clientId = parts[0];
    type = parts[1];
    equipmentName = parts.length > 3 ? parts.slice(2, -1).join("-") : parts.slice(2).join("-");
  }
  const family = resolveEquipmentLogFamily(type, options);
  const logsUrl = withApiQuery(`${API_BASE_URL}/clients/modules/${clientId}/${family}/${encodeURIComponent(equipmentName)}/logs`, {
    equipment_id: options.dbId || undefined,
    search: options.search && String(options.search).trim() ? String(options.search).trim() : undefined,
    category: options.category && String(options.category).trim() && options.category !== "all" ? String(options.category).trim() : undefined
  });
  const response = await fetch(logsUrl, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Error ${response.status}: ${response.statusText}`);
  }
  return response.json();
};
const EQUIPMENT_TYPE_TO_LOG_FAMILY = {
  Serveurs: "servers",
  Servers: "servers",
  NAS: "nas",
  Stockage: "nas",
  Storage: "nas",
  Firewalls: "firewall",
  Switch: "switch",
  BorneWifi: "wifi",
  Alimentation: "alimentation",
  Routeur: "routeur",
  TOIP: "toip",
  Internet: "internet",
  Ordinateurs: "ordinateurs",
  Videosurveillance: "videosurveillance"
};
function resolveEquipmentLogFamily(type, extras = {}) {
  const customKey = extras.familyKey
    || (String(type || "").startsWith("Custom:") ? String(type).slice("Custom:".length) : "")
    || (String(extras.family || "").startsWith("custom:") ? String(extras.family).slice("custom:".length) : "");
  if (customKey) return customKey;
  return EQUIPMENT_TYPE_TO_LOG_FAMILY[type] || EQUIPMENT_TYPE_TO_LOG_FAMILY[normalizeEquipmentApiType(type)] || "servers";
}
export const logEquipmentActivity = async ({
  clientId,
  type,
  name,
  equipmentId,
  action,
  details
}) => {
  if (!clientId || !type || !name || !action) return null;
  const family = resolveEquipmentLogFamily(type);
  const response = await fetch(`${API_BASE_URL}/clients/modules/${clientId}/${family}/${encodeURIComponent(name)}/logs`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      action,
      details: details || null,
      equipment_id: equipmentId || null
    })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Error ${response.status}`);
  }
  return response.json();
};
export const getEquipmentNotes = async (equipmentId, options = {}) => {
  const clientId = options.clientId;
  const params = new URLSearchParams();
  if (clientId != null && clientId !== "") params.set("clientId", String(clientId));
  const query = params.toString();
  const response = await fetch(`${API_BASE_URL}/equipment/${equipmentId}/notes${query ? `?${query}` : ""}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    signal: options.signal
  });
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }
  return response.json();
};
export const addEquipmentNote = async (equipmentId, payload = {}) => {
  const content = typeof payload === "string" ? payload : payload.content;
  const visibility = typeof payload === "object" && payload ? payload.visibility : undefined;
  const clientId = typeof payload === "object" && payload ? payload.clientId : undefined;
  const response = await fetch(`${API_BASE_URL}/equipment/${equipmentId}/notes`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      content,
      visibility,
      clientId
    })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Error ${response.status}: ${response.statusText}`);
  }
  return response.json();
};
export const updateEquipmentNote = async (equipmentId, noteId, payload = {}) => {
  const response = await fetch(`${API_BASE_URL}/equipment/${equipmentId}/notes/${noteId}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Error ${response.status}: ${response.statusText}`);
  }
  return response.json();
};
export const deleteEquipmentNote = async (equipmentId, noteId, options = {}) => {
  const params = new URLSearchParams();
  if (options.clientId != null && options.clientId !== "") params.set("clientId", String(options.clientId));
  const query = params.toString();
  const response = await fetch(`${API_BASE_URL}/equipment/${equipmentId}/notes/${noteId}${query ? `?${query}` : ""}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    signal: options.signal
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Error ${response.status}: ${response.statusText}`);
  }
  return response.json();
};
export const getEquipmentPhotos = async equipmentId => {
  try {
    const response = await fetch(`${API_BASE_URL}/equipment/${equipmentId}/photos`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching photos:', error);
    throw error;
  }
};
export const uploadEquipmentPhoto = async (equipmentId, file) => {
  try {
    const formData = new FormData();
    formData.append('photo', file);
    const response = await fetch(`${API_BASE_URL}/equipment/${equipmentId}/photos`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error uploading photo:', error);
    throw error;
  }
};
export const getCheckMKEvents = async hostName => {
  try {
    const response = await fetch(`${API_BASE_URL}/checkmk/events/${encodeURIComponent(hostName)}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching CheckMK events:', error);
    throw error;
  }
};
export const getCheckMKServices = async (hostName, startTime = null, endTime = null, site = null, options = {}) => {
  try {
    const url = withApiQuery(`${API_BASE_URL}/checkmk/services/${encodeURIComponent(hostName)}`, {
      start_time: startTime || undefined,
      end_time: endTime || undefined,
      site: site || undefined
    });
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      signal: options.signal,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    console.error('Error fetching CheckMK services:', error);
    throw error;
  }
};
export const getCheckMKUptime = async hostName => {
  try {
    const servicesResponse = await fetch(`${API_BASE_URL}/checkmk/services/${encodeURIComponent(hostName)}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!servicesResponse.ok) {
      throw new Error(`Error ${servicesResponse.status}: ${servicesResponse.statusText}`);
    }
    const servicesData = await servicesResponse.json();
    const services = servicesData.services || [];
    const uptimeService = services.find(s => {
      const title = (s.title || s.id || '').toLowerCase();
      return title.includes('uptime') || title.includes('up time');
    });
    if (uptimeService) {
      return {
        uptime: uptimeService.plugin_output || uptimeService.output || '-',
        lastCheck: uptimeService.last_check || null
      };
    }
    return {
      uptime: '-'
    };
  } catch (error) {
    console.error('Error fetching CheckMK uptime:', error);
    return {
      uptime: '-'
    };
  }
};
export const getCheckMKEventsPeriod = async (hostName, startTime, endTime, site = null, criticalOnly = false, options = {}) => {
  try {
    const url = withApiQuery(`${API_BASE_URL}/checkmk/events-period/${encodeURIComponent(hostName)}`, {
      start_time: startTime,
      end_time: endTime,
      site: site || undefined,
      critical_only: criticalOnly ? "true" : undefined
    });
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      signal: options.signal,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    console.error('Error fetching CheckMK events:', error);
    throw error;
  }
};
export const getCheckMKHostEvents = async (hostName, startTime = null, endTime = null, site = null, options = {}) => {
  try {
    const url = withApiQuery(`${API_BASE_URL}/checkmk/host-events/${encodeURIComponent(hostName)}`, {
      start_time: startTime || undefined,
      end_time: endTime || undefined,
      site: site || undefined
    });
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      signal: options.signal,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    console.error('Error fetching detailed CheckMK events:', error);
    throw error;
  }
};
export const getCheckMKAvailability = async (hostName, site = null, startTime = null, endTime = null, options = {}) => {
  try {
    const url = withApiQuery(`${API_BASE_URL}/checkmk/availability-table/${encodeURIComponent(hostName)}`, {
      site: site || undefined,
      start_time: startTime || undefined,
      end_time: endTime || undefined
    });
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      signal: options.signal,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    console.error('Error fetching CheckMK availability:', error);
    throw error;
  }
};
export const getCheckMKHostDetails = async (hostName, site = null, options = {}) => {
  try {
    const url = withApiQuery(`${API_BASE_URL}/checkmk/host/${encodeURIComponent(hostName)}`, {
      site: site || undefined
    });
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      signal: options.signal,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    console.error('Error fetching CheckMK host details:', error);
    throw error;
  }
};
export const getCheckMKNotifications = async (hostName, startTime = null, endTime = null, site = null, options = {}) => {
  try {
    const url = withApiQuery(`${API_BASE_URL}/checkmk/notifications/${encodeURIComponent(hostName)}`, {
      start_time: startTime || undefined,
      end_time: endTime || undefined,
      site: site || undefined
    });
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      signal: options.signal,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    console.error('Error fetching CheckMK notifications:', error);
    throw error;
  }
};
const EQUIPMENT_TYPE_TO_FAMILY = {
  'Serveurs': 'servers',
  'Servers': 'servers',
  'Stockage': 'stockage',
  'Storage': 'stockage',
  'NAS': 'stockage',
  'Firewalls': 'firewall',
  'Switch': 'switch',
  'BorneWifi': 'wifi',
  'Alimentation': 'alimentation',
  'Routeur': 'routeur',
  'TOIP': 'toip',
  'Sauvegarde': 'save',
  'Backup': 'save',
  'Internet': 'internet'
};
export const updateEquipmentCheckMKMapping = async (clientId, equipmentType, equipmentName, mapping) => {
  const normalizedType = normalizeEquipmentApiType(equipmentType);
  const family = EQUIPMENT_TYPE_TO_FAMILY[equipmentType] || EQUIPMENT_TYPE_TO_FAMILY[normalizedType] || EQUIPMENT_TYPE_TO_FAMILY[equipmentType === 'NAS' ? 'Stockage' : equipmentType];
  if (!family) {
    throw new Error(`Unsupported equipment type for mapping: ${equipmentType}`);
  }
  const response = await fetch(`${API_BASE_URL}/clients/modules/${clientId}/${family}/checkmk-mapping`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      equipmentName,
      equipment_id: mapping?.equipment_id || mapping?.equipmentId || undefined,
      ...mapping
    })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Error ${response.status}`);
  }
  return response.json();
};

export const updateEquipmentHycuMapping = async (clientId, equipmentId, equipmentName, mapping = {}) => {
  const response = await fetch(`${API_BASE_URL}/clients/modules/${clientId}/save/hycu-mapping`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      equipmentName,
      equipment_id: equipmentId || mapping?.equipment_id || mapping?.equipmentId || undefined,
      hycu_job_uuid: mapping?.hycu_job_uuid ?? null,
      hycu_job_name: mapping?.hycu_job_name ?? null
    })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Error ${response.status}`);
  }
  return response.json();
};
export const categorizeHost = host => {
  const name = (host.id || host.name || '').toLowerCase();
  const alias = (host.alias || '').toLowerCase();
  const combined = `${name} ${alias}`;
  const labels = host.labels || {};
  const labelValues = Object.values(labels).join(' ').toLowerCase();
  const patterns = {
    Serveurs: /\b(srv|server|serveur|vm|vms|esxi|hyperv|dc|ad)\b|^srv-|^vm-|^dc-|^ad-/,
    Firewalls: /\b(fw|firewall|pfsense|fortigate|sophos|palo|utm)\b|^fw-|^firewall-/,
    Switch: /\b(sw|switch|cisco|hp-procurve)\b|^sw-|^switch-/,
    BorneWifi: /\b(wifi|wlan|ap|unifi|ubiquiti|ubnt|wap|access.?point)\b|^ap-|^wifi-/,
    Alimentation: /\b(ups|onduleur|pdu|apc|eaton|cyberpower)\b|^ups-|^pdu-/,
    Routeur: /\b(router|routeur|sd-?wan|mpls|fortigate-?sd)\b|^rt-|^router-/,
    TOIP: /\b(voip|toip|pbx|3cx|yeastar|sbc|sip)\b|^voip-|^pbx-/,
    Stockage: /\b(nas|san|storage|synology|qnap|netapp|emc)\b|^nas-|^storage-/
  };
  for (const [cat, regex] of Object.entries(patterns)) {
    if (regex.test(combined) || regex.test(labelValues)) return cat;
  }
  return 'Others';
};
export const getCheckMKHostsWithDetails = async () => {
  const response = await fetch(`${API_BASE_URL}/checkmk/hosts`, {
    method: 'GET',
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error('Unable to load CheckMK hosts');
  }
  const data = await response.json();
  const rawHosts = data.value || data.items || data || [];
  return rawHosts.map(host => {
    if (typeof host === 'string') {
      return {
        id: host,
        title: host,
        alias: null,
        ip: null,
        labels: {},
        category: categorizeHost({
          id: host
        })
      };
    }
    const attrs = host.extensions?.attributes || host.attributes || host.extensions || {};
    const id = host.id || host.name || host.hostname || host.title || '';
    const alias = attrs.alias || host.alias || null;
    const ip = attrs.ipaddress || attrs.address || host.ip || host.address || null;
    const labels = attrs.labels || host.labels || {};
    const title = host.title || alias || id;
    return {
      id,
      title,
      alias,
      ip,
      labels,
      category: categorizeHost({
        id,
        alias,
        labels
      })
    };
  }).filter(h => h.id);
};
export const getCheckMKHosts = async () => {
  const hosts = await getCheckMKHostsWithDetails();
  return hosts.map(h => h.id);
};
export const equipmentTypeToFamily = type => {
  const map = {
    Ordinateurs: 'ordinateurs',
    Serveurs: 'servers',
    Servers: 'servers',
    NAS: 'stockage',
    Storage: 'stockage',
    Stockage: 'stockage',
    Firewalls: 'firewall',
    Switch: 'switch',
    BorneWifi: 'wifi',
    Alimentation: 'alimentation',
    Routeur: 'routeur',
    TOIP: 'toip'
  };
  return map[type] || null;
};
export const getEquipmentCheckMKMonitoring = async (equipmentId, availabilityPeriod = '1m', options = {}) => {
  const url = withApiQuery(`${API_BASE_URL}/checkmk/equipment-monitoring/${encodeURIComponent(equipmentId)}`, {
    availability_period: availabilityPeriod
  });
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    signal: options.signal,
    headers: {
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }
  return response.json();
};
export const getEquipmentMonitoringSummaries = async ({
  clientId,
  equipmentIds
} = {}, options = {}) => {
  const response = await fetch(`${API_BASE_URL}/checkmk/equipment-monitoring/summaries`, {
    method: 'POST',
    credentials: 'include',
    signal: options.signal,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      clientId,
      equipmentIds
    })
  });
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }
  return response.json();
};
export const syncEquipmentCheckMKMonitoring = async (payload, options = {}) => {
  const response = await fetch(`${API_BASE_URL}/checkmk/equipment-monitoring/sync`, {
    method: 'POST',
    credentials: 'include',
    signal: options.signal,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Error ${response.status}: ${response.statusText}`);
  }
  return response.json();
};
async function parseEquipmentTagError(res, fallback) {
  const errorData = await res.json().catch(() => ({}));
  throw new Error(errorData.error || errorData.details || fallback);
}
export async function fetchEquipmentTagsBatch(clientIds, options = {}) {
  const unique = [...new Set((clientIds || []).map(id => String(id || "").trim()).filter(Boolean))];
  if (!unique.length) return [];
  const params = new URLSearchParams({
    clientIds: unique.join(",")
  });
  const res = await fetch(`${API_BASE_URL}/equipment/tags/batch?${params}`, {
    credentials: "include",
    cache: "no-store",
    signal: options.signal
  });
  if (!res.ok) await parseEquipmentTagError(res, "Error loading labels");
  return res.json();
}
export async function fetchEquipmentTags(equipmentId, clientId, options = {}) {
  const params = new URLSearchParams({
    clientId: String(clientId)
  });
  const res = await fetch(`${API_BASE_URL}/equipment/${equipmentId}/tags?${params}`, {
    credentials: "include",
    cache: "no-store",
    signal: options.signal
  });
  if (!res.ok) await parseEquipmentTagError(res, "Error loading labels");
  return res.json();
}
export async function addEquipmentTag(equipmentId, clientId, {
  label,
  color
}, options = {}) {
  const res = await fetch(`${API_BASE_URL}/equipment/${equipmentId}/tags`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      clientId,
      label,
      color
    }),
    signal: options.signal
  });
  if (!res.ok) await parseEquipmentTagError(res, "Error adding label");
  return res.json();
}
export async function removeEquipmentTag(equipmentId, clientId, tagId, options = {}) {
  const params = new URLSearchParams({
    clientId: String(clientId)
  });
  const res = await fetch(`${API_BASE_URL}/equipment/${equipmentId}/tags/${tagId}?${params}`, {
    method: "DELETE",
    credentials: "include",
    signal: options.signal
  });
  if (!res.ok) await parseEquipmentTagError(res, "Error deleting label");
  return res.json();
}
