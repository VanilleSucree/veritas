import API_BASE_URL from "../config";
import { normalizeClientSites } from "../utils/clientSites";
import { aggregateAntivirusEquipementFromRows } from "../utils/antivirusModuleRows";
import { fetchEquipmentFamilies } from "./equipmentFamilies";
import { pickBackupJobType } from "../components/EnterprisesPage/backupJobUtils";
import { resolveClientWifiSsidCatalog } from "../components/EquipementPage/wifiApSsidUtils";
const BASE_URL = `${API_BASE_URL}/clients`;
const MODULES_BASE_URL = `${API_BASE_URL}/clients/modules`;
const CYBER_PAGE_DATA_CACHE_KEYS = ["cyber_page_data_cache_v1", "cyber_page_data_cache_v2"];
const SERVICE_DOMAINS_CACHE_KEY = "service_domains_all_cache_v1";

function isValidUuid(value) {
  if (value == null || value === "") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value));
}

function invalidateCyberPageDataCache() {
  try {
    CYBER_PAGE_DATA_CACHE_KEYS.forEach(key => sessionStorage.removeItem(key));
  } catch {}
}
function invalidateServiceDomainsCache() {
  try {
    sessionStorage.removeItem(SERVICE_DOMAINS_CACHE_KEY);
  } catch {}
}
const COMMUNITY_HARDWARE_FAMILIES = {
  internet: "Internet",
  servers: "Serveurs",
  nas: "NAS",
  firewall: "Firewalls",
  switch: "Switch",
  wifi: "BorneWifi",
  alimentation: "Alimentation",
  routeur: "Routeur",
  toip: "TOIP",
  ordinateurs: "Ordinateurs"
};
function mapModuleRowToEquipmentItem(item) {
  let parsedData = item.data;
  if (typeof parsedData === "string") {
    try {
      parsedData = JSON.parse(parsedData);
    } catch {
      parsedData = {};
    }
  } else if (!parsedData || typeof parsedData !== "object") {
    parsedData = {};
  }
  return {
    id: item.id,
    client_id: item.client_id,
    ...parsedData,
    nom: parsedData.nom || item.name || item.item_key || "Sans nom",
    is_active: item.is_active,
    data: parsedData
  };
}
async function fetchCommunityModuleFamilyRows(clientId, family, options = {}) {
  const res = await fetch(`${MODULES_BASE_URL}/${clientId}/${family}`, {
    credentials: "include",
    signal: options.signal
  });
  if (!res.ok) return [];
  const items = await res.json();
  return Array.isArray(items) ? items : [];
}
async function fetchClientHardwareModulesCommunity(clientId, options = {}) {
  const equipements = {};
  const hardwareTasks = Object.entries(COMMUNITY_HARDWARE_FAMILIES).map(async ([family, label]) => {
    try {
      const items = await fetchCommunityModuleFamilyRows(clientId, family, options);
      equipements[label] = items.map(mapModuleRowToEquipmentItem);
    } catch (err) {
      if (err?.name === "AbortError") throw err;
      equipements[label] = [];
    }
  });
  const cyberTasks = [(async () => {
    try {
      const rows = await fetchCommunityModuleFamilyRows(clientId, "antivirus", options);
      equipements.Antivirus = aggregateAntivirusEquipementFromRows(rows);
    } catch (err) {
      if (err?.name === "AbortError") throw err;
      equipements.Antivirus = {
        solutions: []
      };
    }
  })()];
  await Promise.all([...hardwareTasks, ...cyberTasks]);
  const hasAntivirus = (equipements.Antivirus?.solutions || []).length > 0;
  return {
    modules: {},
    modules_monitoring: hasAntivirus ? {
      Antivirus: true
    } : {},
    equipements
  };
}
function parseClientSites(sites) {
  return normalizeClientSites(sites);
}
export async function fetchCyberPageData(options = {}) {
  const res = await fetch(`${BASE_URL}/cyber-page-data`, {
    credentials: "include",
    signal: options.signal
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(errText || `Error ${res.status} cyber-page-data`);
  }
  return res.json();
}
export async function fetchClients(options = {}) {
  const res = await fetch(BASE_URL, {
    credentials: 'include',
    signal: options.signal
  });
  if (!res.ok) throw new Error("Error fetching clients");
  const clients = await res.json();
  const parsedClients = clients.map(client => ({
    ...client,
    sites: parseClientSites(client.sites),
    ssids: resolveClientWifiSsidCatalog(client)
  }));
  const clientsWithModules = await Promise.all(parsedClients.map(async client => {
    try {
      const modulesData = await fetchClientModules(client.id, {
        signal: options.signal
      });
      let internetData = [];
      if (modulesData) {
        const baseOptions = client.options || {};
        const mergedModules = {
          ...(modulesData.modules || {}),
          ...(baseOptions || {})
        };
        const rawMonitoringSnapshot = client.modules && typeof client.modules === 'object' ? client.modules : {};
        return {
          ...client,
          modules: mergedModules,
          options: baseOptions,
          modules_monitoring: rawMonitoringSnapshot,
          equipements: modulesData.equipements || client.equipements || {},
          internet: modulesData.equipements?.Internet || []
        };
      }
    } catch (error) {
      if (error?.name === "AbortError") {
        throw error;
      }
      console.error(`Error loading modules for client ${client.id}:`, error);
    }
    return client;
  }));
  return clientsWithModules;
}
export async function fetchClientsList(options = {}) {
  const url = `${BASE_URL}/list?_=${Date.now()}`;
  const res = await fetch(url, {
    credentials: "include",
    signal: options.signal,
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache"
    }
  });
  if (!res.ok) throw new Error("Error fetching client list");
  return await res.json();
}
export async function fetchClientGeneral(clientId, options = {}) {
  const res = await fetch(`${API_BASE_URL}/clients/general/${clientId}`, {
    credentials: "include",
    signal: options.signal
  });
  if (!res.ok) throw new Error("Client not found");
  const client = await res.json();
  const ssids = resolveClientWifiSsidCatalog(client);
  return {
    ...client,
    sites: parseClientSites(client.sites),
    ssid: ssids,
    ssids
  };
}
export async function fetchClientAntivirus(clientId, options = {}) {
  const res = await fetch(`${BASE_URL}/${clientId}/antivirus`, {
    credentials: 'include',
    signal: options.signal
  });
  if (!res.ok) {
    return [];
  }
  return await res.json();
}
export async function fetchClientAntispam(clientId, options = {}) {
  const res = await fetch(`${BASE_URL}/${clientId}/antispam`, {
    credentials: 'include',
    signal: options.signal
  });
  if (!res.ok) {
    return [];
  }
  return await res.json();
}
export async function fetchClientDomains(clientId, options = {}) {
  const res = await fetch(`${BASE_URL}/${clientId}/domains`, {
    credentials: 'include',
    signal: options.signal
  });
  if (!res.ok) {
    return [];
  }
  return await res.json();
}
export async function fetchClientSslCertificates(clientId, options = {}) {
  const params = new URLSearchParams();
  if (options.autoCheck) params.set("autoCheck", "true");
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${BASE_URL}/${clientId}/ssl-certificates${query}`, {
    credentials: "include",
    signal: options.signal
  });
  if (!res.ok) {
    return [];
  }
  return await res.json();
}
export async function checkClientSslCertificates(clientId) {
  const res = await fetch(`${BASE_URL}/${clientId}/ssl-certificates/check`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || "Error during SSL verification");
  }
  return await res.json();
}
export async function addClientSslCertificate(clientId, {
  hostname,
  port = 443,
  checkIntervalHours = 24
}) {
  const res = await fetch(`${BASE_URL}/${clientId}/ssl-certificates`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      hostname,
      port,
      checkIntervalHours
    })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || "Error adding certificate");
  }
  return await res.json();
}
export async function updateClientSslCertificate(clientId, certId, payload) {
  const res = await fetch(`${BASE_URL}/${clientId}/ssl-certificates/${certId}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || "Error updating certificate");
  }
  return await res.json();
}
export async function deleteClientSslCertificate(clientId, certId) {
  const res = await fetch(`${BASE_URL}/${clientId}/ssl-certificates/${certId}`, {
    method: "DELETE",
    credentials: "include"
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || "Error deleting certificate");
  }
  return await res.json();
}
export async function checkClientSslCertificate(clientId, certId) {
  const res = await fetch(`${BASE_URL}/${clientId}/ssl-certificates/${certId}/check`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || "Error during SSL verification");
  }
  return await res.json();
}
export async function fetchClientLicences(clientId, options = {}) {
  const res = await fetch(`${BASE_URL}/${clientId}/licences`, {
    credentials: "include",
    signal: options.signal
  });
  if (!res.ok) {
    return [];
  }
  return await res.json();
}
export async function addClientLicence(clientId, payload) {
  const res = await fetch(`${BASE_URL}/${clientId}/licences`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || "Error adding license");
  }
  return await res.json();
}
export async function updateClientLicence(clientId, licenceId, payload) {
  const res = await fetch(`${BASE_URL}/${clientId}/licences/${licenceId}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || "Error updating license");
  }
  return await res.json();
}
export async function deleteClientLicence(clientId, licenceId) {
  const res = await fetch(`${BASE_URL}/${clientId}/licences/${licenceId}`, {
    method: "DELETE",
    credentials: "include"
  });
  if (!res.ok && res.status !== 204) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || "Error deleting license");
  }
}
export async function fetchClientCustomEquipmentMap(clientId, options = {}) {
  const res = await fetch(`${BASE_URL}/${clientId}/custom-equipment-map`, {
    credentials: "include",
    signal: options.signal
  });
  if (!res.ok) {
    return {
      families: [],
      unavailable: true
    };
  }
  const data = await res.json().catch(() => ({}));
  return {
    ...data,
    families: Array.isArray(data?.families) ? data.families : [],
    unavailable: false
  };
}
export async function resolveClientCustomFamilyMap(clientId, options = {}) {
  const customMap = await fetchClientCustomEquipmentMap(clientId, options);
  const mappedFamilies = Array.isArray(customMap?.families) ? customMap.families : [];
  if (!customMap?.unavailable) return mappedFamilies;
  const defs = await fetchEquipmentFamilies({
    signal: options.signal
  }).catch(() => []);
  const existingByKey = new Map(mappedFamilies.map(family => [family.familyKey, family]));
  return (Array.isArray(defs) ? defs : []).map(family => existingByKey.get(family.familyKey) || {
    ...family,
    items: [],
    count: 0
  });
}
export async function fetchClientCustomEquipment(clientId, familyKey, options = {}) {
  const query = familyKey ? `?familyKey=${encodeURIComponent(familyKey)}` : "";
  const res = await fetch(`${BASE_URL}/${clientId}/custom-equipment${query}`, {
    credentials: "include",
    signal: options.signal
  });
  if (!res.ok) {
    return [];
  }
  return res.json();
}
export async function addClientCustomEquipment(clientId, familyKey, payload) {
  const res = await fetch(`${BASE_URL}/${clientId}/custom-equipment/${encodeURIComponent(familyKey)}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Error adding hardware");
  }
  return res.json();
}
export async function updateClientCustomEquipment(clientId, familyKey, itemId, payload) {
  const res = await fetch(`${BASE_URL}/${clientId}/custom-equipment/${encodeURIComponent(familyKey)}/${itemId}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Error updating hardware");
  }
  return res.json();
}
export async function deleteClientCustomEquipment(clientId, familyKey, itemId) {
  const res = await fetch(`${BASE_URL}/${clientId}/custom-equipment/${encodeURIComponent(familyKey)}/${itemId}`, {
    method: "DELETE",
    credentials: "include"
  });
  if (!res.ok && res.status !== 204) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Error deleting hardware");
  }
}
export async function addClient(client) {
  const res = await fetch(`${BASE_URL}/general`, {
    method: "POST",
    credentials: 'include',
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(client)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMessage = errorData.details || errorData.error || "Error adding client";
    throw new Error(errorMessage);
  }
  const newClient = await res.json();
  if (newClient.id && (client.modules || client.equipements)) {
    await saveClientModules(newClient.id, {
      modules: client.modules,
      modules_monitoring: client.modules_monitoring,
      equipements: client.equipements
    });
  }
  return newClient;
}
export async function updateClient(id, client) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    credentials: 'include',
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(client)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMessage = errorData.details || errorData.error || "Error updating client";
    throw new Error(errorMessage);
  }
  const updatedClient = await res.json();
  return updatedClient;
}
export async function bulkUpdateClients({
  clientIds = [],
  updates = {}
} = {}) {
  const res = await fetch(`${BASE_URL}/bulk`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      clientIds,
      updates
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.details || data.error || "Error updating companies");
  }
  return data;
}
export async function deleteClient(id, {
  force = false
} = {}) {
  const url = force ? `${BASE_URL}/${id}?force=1` : `${BASE_URL}/${id}`;
  const res = await fetch(url, {
    method: "DELETE",
    credentials: "include"
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMessage = errorData.error || errorData.details || "Error deleting client";
    const error = new Error(errorMessage);
    error.code = errorData.code;
    error.blockers = errorData.blockers;
    throw error;
  }
  return await res.json();
}
export async function fetchClientDeletionCheck(id, options = {}) {
  const res = await fetch(`${BASE_URL}/${id}/deletion-check`, {
    credentials: "include",
    signal: options.signal
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Error verifying deletion");
  }
  return data;
}
export async function getClientLogs(clientId, page = 1, limit = 10, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}/${clientId}/logs?page=${page}&limit=${limit}`, {
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
    if (error?.name === 'AbortError') throw error;
    console.error('Error fetching client logs:', error);
    return {
      logs: [],
      total: 0,
      page,
      limit,
      totalPages: 0
    };
  }
}
export async function getClientCheckMKMappings(clientId) {
  try {
    const response = await fetch(`${API_BASE_URL}/checkmk/mapping/${clientId}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    const mappings = await response.json();
    const hardwareTypes = ['Serveurs', 'NAS', 'Firewalls', 'Switch', 'BorneWifi'];
    const activeHardwareMappings = mappings.filter(m => hardwareTypes.includes(m.equipment_type) && (m.is_active === true || m.is_active === undefined || m.is_active === null));
    return activeHardwareMappings;
  } catch (error) {
    console.error('Error fetching client CheckMK mappings:', error);
    return [];
  }
}
export async function getClientCheckMKStats(clientId, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}/checkmk/mapping/${clientId}/stats`, {
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
          stats: [],
          total: 0
        };
      }
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    console.error('Error fetching CheckMK statistics:', error);
    return {
      stats: [],
      total: 0
    };
  }
}
const FAMILY_MAPPING = {
  'module': 'module',
  'internet': 'internet',
  'servers': 'servers',
  'serveurs': 'servers',
  'stockage': 'stockage',
  'storage': 'stockage',
  'nas': 'stockage',
  'firewall': 'firewall',
  'firewalls': 'firewall',
  'switch': 'switch',
  'switches': 'switch',
  'wifi': 'wifi',
  'bornewifi': 'wifi',
  'alimentation': 'alimentation',
  'power': 'alimentation',
  'routeur': 'routeur',
  'router': 'routeur',
  'routers': 'routeur',
  'toip': 'toip',
  'voip': 'toip',
  'ordinateurs': 'ordinateurs',
  'ordinateur': 'ordinateurs',
  'computers': 'ordinateurs',
  'workstations': 'ordinateurs',
  'sauvegarde': 'save',
  'save': 'save',
  'backup': 'save',
  'antivirus': 'antivirus',
  'antispam': 'antispam',
  'ndd': 'ndd',
  'certificatessl': 'ssl',
  'ssl': 'ssl',
  'o365': 'o365',
  'office365': 'o365'
};
export async function fetchClientModules(clientId, options = {}) {
  const res = await fetch(`${API_BASE_URL}/clients/${clientId}/modules`, {
    credentials: 'include',
    signal: options.signal
  });
  if (res.status === 403) {
    return fetchClientHardwareModulesCommunity(clientId, options);
  }
  if (!res.ok) throw new Error("Error fetching client modules");
  const data = await res.json();
  if (data.equipements && data.modules && data.modules_monitoring) {
    return {
      modules: data.modules || {},
      modules_monitoring: data.modules_monitoring || {},
      equipements: data.equipements || {}
    };
  }
  const rawData = data;
  const modules = {};
  const modules_monitoring = {};
  const equipements = {};
  const azureHasCredentials = Boolean(rawData.azureHasCredentials);
  if (rawData.module) {
    rawData.module.forEach(item => {
      if (item.item_key && item.data?.enabled !== undefined) {
        modules[item.item_key] = item.data.enabled;
      }
    });
  }
  const familyMapping = {
    'internet': {
      monitoring: 'Internet',
      equipement: 'Internet'
    },
    'servers': {
      monitoring: 'Serveurs',
      equipement: 'Serveurs'
    },
    'stockage': {
      monitoring: 'Stockage',
      equipement: 'NAS'
    },
    'firewall': {
      monitoring: 'Firewall',
      equipement: 'Firewalls'
    },
    'switch': {
      monitoring: 'Switch',
      equipement: 'Switch'
    },
    'wifi': {
      monitoring: 'BorneWifi',
      equipement: 'BorneWifi'
    },
    'alimentation': {
      monitoring: 'Alimentation',
      equipement: 'Alimentation'
    },
    'routeur': {
      monitoring: 'Routeur',
      equipement: 'Routeur'
    },
    'toip': {
      monitoring: 'TOIP',
      equipement: 'TOIP'
    },
    'save': {
      monitoring: 'Sauvegarde',
      equipement: 'Sauvegarde'
    },
    'antivirus': {
      monitoring: 'Antivirus',
      equipement: 'Antivirus'
    },
    'antispam': {
      monitoring: 'Antispam',
      equipement: 'Antispam'
    },
    'ndd': {
      monitoring: 'NDD',
      equipement: 'NDD'
    },
    'o365': {
      monitoring: 'Office365',
      equipement: 'Office365'
    },
    'ordinateurs': {
      monitoring: 'Ordinateurs',
      equipement: 'Ordinateurs'
    }
  };
  for (const [family, labels] of Object.entries(familyMapping)) {
    if (rawData[family]) {
      const items = rawData[family];
      if (items.length > 0) {
        const enabledItem = items.find(item => item.data?.enabled === true || item.is_active === true);
        if (enabledItem) {
          modules_monitoring[labels.monitoring] = true;
        }
        if (labels.equipement === 'Sauvegarde') {
          console.log('🔵 Starting Backup processing, raw items:', items.length, 'items');
          const realItems = items.filter(item => {
            if (!item.data || typeof item.data !== 'object') {
              console.log('⚠️ Item without data or data is not an object:', item);
              return false;
            }
            const dataKeys = Object.keys(item.data);
            if (dataKeys.length === 1 && item.data.enabled === true) return false;
            return true;
          });
          console.log('📦 Backup items after filtering:', realItems.length, realItems.map(i => ({
            id: i.id,
            name: i.name,
            dataType: typeof i.data,
            type: i.data?.type,
            data: i.data
          })));
          if (realItems.length > 0) {
            const instanceItems = realItems.filter(item => {
              if (item.item_key && String(item.item_key).startsWith("job-")) return false;
              if (item.data?.type === "instance") return true;
              if (item.data?.type === "job") return false;
              return Boolean(item.data?.logiciel);
            });
            const jobItems = realItems.filter(item => item.item_key && String(item.item_key).startsWith("job-") || item.data?.type === "job");
            console.log('🔍 Loading Backup:', {
              totalItems: realItems.length,
              instanceItems: instanceItems.length,
              jobItems: jobItems.length,
              instances: instanceItems.map(i => ({
                id: i.id,
                itemKey: i.item_key,
                logiciel: i.data.logiciel
              })),
              jobs: jobItems.map(j => ({
                id: j.id,
                itemKey: j.item_key,
                nom: j.data.nom
              }))
            });
            const instances = instanceItems.map(instanceItem => {
              const instanceData = {
                ...instanceItem.data
              };
              delete instanceData.type;
              const instanceFrontendId = instanceData.instanceId || instanceItem.id;
              console.log(`🔹 Processing instance:`, {
                dbId: instanceItem.id,
                itemKey: instanceItem.item_key,
                instanceFrontendId: instanceFrontendId,
                logiciel: instanceData.logiciel
              });
              const instanceJobs = jobItems.filter(jobItem => {
                if (jobItem.data?.instanceId && String(jobItem.data.instanceId) === String(instanceFrontendId)) {
                  return true;
                }
                const jobItemKey = jobItem.item_key || '';
                const expectedJobKey = `job-${instanceFrontendId}`;
                const isJobOfThisInstance = jobItemKey === expectedJobKey;
                console.log(`  🔹 Checking job ${jobItem.id}: key="${jobItemKey}", expected="${expectedJobKey}", match=${isJobOfThisInstance}`);
                return isJobOfThisInstance;
              }).map(jobItem => {
                const jobData = {
                  ...jobItem.data
                };
                const backupType = pickBackupJobType(jobData);
                if (jobData.type === "job") {
                  delete jobData.type;
                }
                if (backupType) {
                  jobData.type = backupType;
                  jobData.typeBackup = backupType;
                }
                const checkmkHost = jobItem.checkmk_host_name ?? jobData.checkmk_host_name ?? null;
                const checkmkSite = jobItem.checkmk_site ?? jobData.checkmk_site ?? null;
                const checkmkService = jobItem.checkmk_service_name ?? jobData.checkmk_service_name ?? null;
                return {
                  id: jobItem.id,
                  ...jobData,
                  checkmk_host_name: checkmkHost && String(checkmkHost).trim() ? String(checkmkHost).trim() : null,
                  checkmk_site: checkmkSite && String(checkmkSite).trim() ? String(checkmkSite).trim() : null,
                  checkmk_service_name: checkmkService && String(checkmkService).trim() ? String(checkmkService).trim() : null
                };
              });
              console.log(`✅ Instance ${instanceFrontendId} (${instanceData.logiciel}):`, {
                jobsFound: instanceJobs.length,
                jobs: instanceJobs
              });
              return {
                id: instanceFrontendId,
                ...instanceData,
                jobs: instanceJobs
              };
            });
            equipements[labels.equipement] = {
              instances: instances
            };
          }
        } else if (labels.equipement === 'Antispam') {
          const realItems = items.filter(item => {
            if (!item.data || typeof item.data !== 'object') return false;
            const dataKeys = Object.keys(item.data);
            if (dataKeys.length === 1 && item.data.enabled === true) return false;
            return item.data.logiciel || item.data.solutions && Array.isArray(item.data.solutions);
          });
          if (realItems.length > 0) {
            const firstItem = realItems[0];
            if (firstItem.data.solutions && Array.isArray(firstItem.data.solutions) && realItems.length === 1) {
              equipements[labels.equipement] = firstItem.data;
            } else {
              const sortedItems = [...realItems].sort((a, b) => {
                const nameA = a.name || a.item_key || '';
                const nameB = b.name || b.item_key || '';
                return nameA.localeCompare(nameB);
              });
              equipements[labels.equipement] = {
                solutions: sortedItems.map(item => ({
                  id: item.id,
                  ...item.data
                }))
              };
            }
          }
        } else if (labels.equipement === 'Antivirus') {
          const realItems = items.filter(item => {
            if (!item.data || typeof item.data !== 'object') return false;
            const dataKeys = Object.keys(item.data);
            if (dataKeys.length === 1 && item.data.enabled === true) return false;
            if (item.item_key && item.item_key.startsWith('solution-')) {
              return true;
            }
            const hasSolutions = item.data.solutions && Array.isArray(item.data.solutions) && item.data.solutions.length > 0;
            const hasSolution = item.data.solution && typeof item.data.solution === 'string' && item.data.solution.trim() !== '';
            if (hasSolutions || hasSolution) {
              return true;
            }
            if (item.name && (item.name.includes('BitDefender') || item.name.includes('Kaspersky') || item.name.includes('Symantec') || item.name.includes('Trend') || item.name.includes('McAfee') || item.name.includes('Norton') || item.name.includes('Avast') || item.name.includes('AVG'))) {
              return true;
            }
            if ((item.item_key === labels.monitoring || item.item_key === labels.equipement || item.name === labels.monitoring || item.name === labels.equipement) && !hasSolutions && !hasSolution) {
              return false;
            }
            if (dataKeys.length > 0 && !(dataKeys.length === 1 && dataKeys[0] === 'enabled')) {
              return true;
            }
            return false;
          });
          if (realItems.length > 0) {
            const firstItem = realItems[0];
            if (firstItem.data.solutions && Array.isArray(firstItem.data.solutions) && realItems.length === 1) {
              equipements[labels.equipement] = firstItem.data;
            } else {
              const sortedItems = [...realItems].sort((a, b) => {
                const nameA = a.name || a.item_key || '';
                const nameB = b.name || b.item_key || '';
                return nameA.localeCompare(nameB);
              });
              equipements[labels.equipement] = {
                solutions: sortedItems.map(item => ({
                  id: item.id,
                  ...item.data
                }))
              };
            }
          } else {
            equipements[labels.equipement] = {
              solutions: []
            };
          }
        } else if (labels.equipement === 'Office365') {
          const item = items[0];
          if (item && item.data) {
            equipements[labels.equipement] = item.data;
          }
        } else {
          const filteredItems = items.filter(item => {
            if (!item.data) {
              if (item.name || item.item_key) {
                return true;
              }
              return false;
            }
            let parsedData = item.data;
            if (typeof item.data === 'string') {
              try {
                parsedData = JSON.parse(item.data);
              } catch (e) {
                parsedData = {};
              }
            }
            if (typeof parsedData !== 'object' || parsedData === null) {
              if (item.name || item.item_key) {
                return true;
              }
              return false;
            }
            const dataKeys = Object.keys(parsedData);
            const isModuleKey = item.item_key === labels.monitoring || item.item_key === labels.equipement || item.name === labels.monitoring || item.name === labels.equipement;
            const isEnabledFlag = dataKeys.length === 1 && parsedData.enabled === true;
            if (isModuleKey && isEnabledFlag) return false;
            return true;
          });
          if (items.length > 0 && (labels.equipement === 'Serveurs' || labels.equipement === 'NAS' || labels.equipement === 'Switch' || labels.equipement === 'BorneWifi' || labels.equipement === 'NDD' || labels.equipement === 'Internet')) {
            console.log(`🔍 Frontend Debug ${labels.equipement} - items.length:`, items.length);
            console.log(`🔍 Frontend Debug ${labels.equipement} - filteredItems.length:`, filteredItems.length);
            console.log(`🔍 Frontend Debug ${labels.equipement} - monitoringKey:`, labels.monitoring);
            console.log(`🔍 Frontend Debug ${labels.equipement} - equipementKey:`, labels.equipement);
            console.log(`🔍 Frontend Debug ${labels.equipement} - items:`, items.map(item => ({
              id: item.id,
              item_key: item.item_key,
              name: item.name,
              dataType: typeof item.data,
              dataIsObject: item.data && typeof item.data === 'object',
              dataKeys: item.data && typeof item.data === 'object' ? Object.keys(item.data) : typeof item.data === 'string' ? 'STRING' : 'N/A',
              data: item.data
            })));
          }
          equipements[labels.equipement] = filteredItems.map(item => {
            let parsedData = item.data;
            if (typeof item.data === 'string') {
              try {
                parsedData = JSON.parse(item.data);
              } catch (e) {
                parsedData = {};
              }
            } else if (!item.data || typeof item.data !== 'object') {
              parsedData = {};
            }
            return {
              ...parsedData,
              id: item.id,
              item_key: item.item_key || parsedData.item_key,
              nom: parsedData.nom || item.name || item.item_key || 'Sans nom',
              is_active: item.is_active,
              checkmk_host_name: item.checkmk_host_name || parsedData.checkmk_host_name || parsedData.checkmkMapping?.checkmk_host_name || null,
              checkmk_site: item.checkmk_site || parsedData.checkmk_site || parsedData.checkmkMapping?.checkmk_site || null,
              checkmk_service_name: item.checkmk_service_name || parsedData.checkmk_service_name || parsedData.checkmkMapping?.checkmk_service_name || null,
              checkmkMapping: item.checkmk_host_name || parsedData.checkmk_host_name || parsedData.checkmkMapping?.checkmk_host_name ? {
                is_active: true,
                checkmk_host_name: item.checkmk_host_name || parsedData.checkmk_host_name || parsedData.checkmkMapping?.checkmk_host_name || null,
                checkmk_site: item.checkmk_site || parsedData.checkmk_site || parsedData.checkmkMapping?.checkmk_site || null,
                checkmk_service_name: item.checkmk_service_name || parsedData.checkmk_service_name || parsedData.checkmkMapping?.checkmk_service_name || null
              } : parsedData.checkmkMapping || null
            };
          });
        }
      }
    }
  }
  if (azureHasCredentials) {
    modules_monitoring.Office365 = true;
  }
  return {
    modules,
    modules_monitoring,
    equipements
  };
}
function hashObject(obj) {
  const str = JSON.stringify(obj, Object.keys(obj).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
export async function saveClientModules(clientId, data) {
  const headers = {
    'Content-Type': 'application/json'
  };
  const categoryToFamily = {
    'Internet': 'internet',
    'Serveurs': 'servers',
    'Stockage': 'stockage',
    'NAS': 'stockage',
    'Firewall': 'firewall',
    'Firewalls': 'firewall',
    'Switch': 'switch',
    'BorneWifi': 'wifi',
    'Alimentation': 'alimentation',
    'Routeur': 'routeur',
    'TOIP': 'toip',
    'Sauvegarde': 'save',
    'Antivirus': 'antivirus',
    'Antispam': 'antispam',
    'NDD': 'ndd',
    'CertificatsSSL': 'ssl',
    'Office365': 'o365'
  };
  const disabledFamilies = new Set();
  if (data.modules_monitoring) {
    const clearFamily = async family => {
      if (!family || family === 'module') return;
      try {
        await fetch(`${MODULES_BASE_URL}/${clientId}/${family}/sync`, {
          method: 'POST',
          credentials: 'include',
          headers,
          body: JSON.stringify({
            items: []
          })
        });
      } catch (error) {
        console.warn(`Unable to clean family ${family}:`, error);
      }
    };
    for (const [moduleKey, moduleValue] of Object.entries(data.modules_monitoring)) {
      if (moduleValue === false) {
        const family = categoryToFamily[moduleKey] || FAMILY_MAPPING[moduleKey.toLowerCase()];
        if (family) disabledFamilies.add(family);
        await clearFamily(family);
      }
    }
  }
  if (data.equipements) {
    const isMeaningfulValue = val => {
      if (val === undefined || val === null) return false;
      if (typeof val === 'string') return val.trim() !== '';
      if (Array.isArray(val)) return val.length > 0;
      if (typeof val === 'object') return Object.keys(val).length > 0;
      if (typeof val === 'number') return val !== 0;
      return true;
    };
    const hasRealEquipmentData = (family, obj = {}) => {
      const lowerFamily = (family || '').toLowerCase();
      switch (lowerFamily) {
        case 'save':
          {
            if (Array.isArray(obj.instances)) {
              return obj.instances.some(inst => {
                if (!inst) return false;
                const versionOk = typeof inst.version === 'string' && inst.version.trim() !== '';
                const expirationOk = typeof inst.expiration === 'string' && inst.expiration.trim() !== '';
                const jobsOk = Array.isArray(inst.jobs) && inst.jobs.length > 0;
                const nameOk = typeof inst.server === 'string' && inst.server.trim() !== '';
                return versionOk || expirationOk || jobsOk || nameOk;
              });
            }
            const {
              version,
              expiration,
              jobs
            } = obj || {};
            const versionOk = typeof version === 'string' && version.trim() !== '';
            const expirationOk = typeof expiration === 'string' && expiration.trim() !== '';
            const jobsOk = Array.isArray(jobs) && jobs.length > 0;
            return versionOk || expirationOk || jobsOk;
          }
        case 'antivirus':
          {
            const {
              solutions
            } = obj || {};
            return Array.isArray(solutions) && solutions.length > 0;
          }
        case 'antispam':
          {
            const {
              expiration,
              utilisateursProteges,
              domainesSurveilles,
              logiciel,
              solutions
            } = obj || {};
            const expirationOk = typeof expiration === 'string' && expiration.trim() !== '';
            const usersOk = typeof utilisateursProteges === 'number' && utilisateursProteges > 0;
            const domainsOk = typeof domainesSurveilles === 'number' && domainesSurveilles > 0;
            const solutionsOk = Array.isArray(solutions) && solutions.length > 0;
            return expirationOk || usersOk || domainsOk || solutionsOk;
          }
        case 'o365':
          {
            const {
              licences
            } = obj || {};
            return Array.isArray(licences) && licences.length > 0;
          }
        default:
          return Object.entries(obj).some(([, val]) => isMeaningfulValue(val));
      }
    };
    for (const [category, items] of Object.entries(data.equipements)) {
      const family = categoryToFamily[category] || FAMILY_MAPPING[category.toLowerCase()];
      if (!family || family === 'module') continue;
      if (disabledFamilies.has(family)) continue;
      try {
        if (Array.isArray(items) && (items.length > 0 || category === 'NDD')) {
          const itemsToSync = items.map(item => {
            let cleanedItem = item;
            if (category === 'BorneWifi') {
              cleanedItem = {
                ...item
              };
              if (!cleanedItem.controleur || cleanedItem.controleur.trim() === '') delete cleanedItem.controleur;
              if (!cleanedItem.emplacement || cleanedItem.emplacement.trim() === '') delete cleanedItem.emplacement;
              if (!cleanedItem.expirationGarantie || cleanedItem.expirationGarantie.trim() === '') delete cleanedItem.expirationGarantie;
              if (cleanedItem.supportsWifi6 === false || cleanedItem.supportsWifi6 === null || cleanedItem.supportsWifi6 === undefined) delete cleanedItem.supportsWifi6;
              if (cleanedItem.bandes) {
                const hasActiveBande = Object.values(cleanedItem.bandes).some(v => v === true);
                if (!hasActiveBande) delete cleanedItem.bandes;
              }
              if (Array.isArray(cleanedItem.ssids)) {
                cleanedItem.ssids = cleanedItem.ssids.map(ssid => {
                  if (typeof ssid === 'object' && ssid.id) return ssid.id;
                  if (typeof ssid === 'string' && ssid.trim() !== '') return ssid;
                  return null;
                }).filter(id => id !== null);
                if (cleanedItem.ssids.length === 0) delete cleanedItem.ssids;
              }
            }
            const domainKey = category === 'NDD' ? cleanedItem.item_key || cleanedItem.nom || cleanedItem.name || cleanedItem.domain || cleanedItem.domaine || null : cleanedItem.item_key;
            // Keep row id only at top-level; nested data.id is often a stale UUID
            // from a previous sync and must not overwrite the real primary key.
            const {
              id: _nestedId,
              data: _nestedData,
              created_at: _createdAt,
              updated_at: _updatedAt,
              createdAt: _createdAtCamel,
              updatedAt: _updatedAtCamel,
              is_active: _isActive,
              agent_id: _agentId,
              agentId: _agentIdCamel,
              checkmkMapping: _checkmkMapping,
              checkmk_host_name: _ckHost,
              checkmk_site: _ckSite,
              checkmk_service_name: _ckService,
              ...domainData
            } = cleanedItem || {};
            const rowId = isValidUuid(cleanedItem.id) ? cleanedItem.id : undefined;
            return {
              id: rowId,
              item_key: domainKey,
              name: cleanedItem.nom || cleanedItem.name || 'Unnamed',
              data: category === 'NDD' ? domainData : cleanedItem,
              is_active: true,
              checkmk_host_name: cleanedItem.checkmk_host_name || cleanedItem.checkmkMapping?.checkmk_host_name || null,
              checkmk_site: cleanedItem.checkmk_site || cleanedItem.checkmkMapping?.checkmk_site || null,
              checkmk_service_name: cleanedItem.checkmk_service_name || cleanedItem.checkmkMapping?.checkmk_service_name || null
            };
          });
          const syncRes = await fetch(`${MODULES_BASE_URL}/${clientId}/${family}/sync`, {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify({
              items: itemsToSync
            })
          });
          if (!syncRes.ok) {
            const errorData = await syncRes.json().catch(() => ({}));
            const detail = errorData.details && errorData.details !== errorData.error ? ` (${errorData.details})` : "";
            throw new Error((errorData.error || `Unable to save ${category}`) + detail);
          }
        } else if (items && typeof items === 'object' && !Array.isArray(items)) {
          if ((category === 'Sauvegarde' || category === 'Backup') && Array.isArray(items.instances)) {
            const instances = items.instances || [];
            if (instances.length > 0) {
              const itemsToSync = [];
              instances.forEach((instance, instIdx) => {
                const instanceId = instance.id;
                const instanceData = {
                  logiciel: instance.logiciel,
                  server: instance.server,
                  expiration: instance.expiration,
                  version: instance.version,
                  activeBackupModules: instance.activeBackupModules,
                  activeBackupStorage: instance.activeBackupStorage,
                  hyperbackupSource: instance.hyperbackupSource,
                  hyperbackupDestination: instance.hyperbackupDestination,
                  instanceId: instanceId
                };
                const instanceName = instance.logiciel ? `${instance.logiciel} Instance` : `Instance ${instIdx + 1}`;
                const instanceKey = "instance";
                itemsToSync.push({
                  id: instanceId,
                  name: instanceName,
                  item_key: instanceKey,
                  data: {
                    ...instanceData,
                    type: 'instance'
                  },
                  is_active: true
                });
                const jobs = instance.jobs || [];
                jobs.forEach((job, jobIdx) => {
                  const jobId = job.id;
                  const jobData = {
                    ...job
                  };
                  delete jobData.id;
                  delete jobData.checkmkMapping;
                  delete jobData.hycuMapping;
                  delete jobData.isMapped;
                  delete jobData.checkmk_host_name;
                  delete jobData.checkmk_site;
                  delete jobData.checkmk_service_name;
                  delete jobData.hycu_job_uuid;
                  delete jobData.hycu_job_name;
                  const backupType = pickBackupJobType(jobData);
                  const jobName = job.nom ? `${instance.logiciel || 'Backup'} - ${job.nom}` : `${instance.logiciel || 'Backup'} - Job ${jobIdx + 1}`;
                  const jobKey = `job-${instanceId}`;
                  itemsToSync.push({
                    id: jobId,
                    name: jobName,
                    item_key: jobKey,
                    data: {
                      ...jobData,
                      typeBackup: backupType || jobData.typeBackup || "",
                      type: 'job',
                      instanceId
                    },
                    is_active: true
                  });
                });
              });
              if (itemsToSync.length > 0) {
                await fetch(`${MODULES_BASE_URL}/${clientId}/${family}/sync`, {
                  method: 'POST',
                  credentials: 'include',
                  headers,
                  body: JSON.stringify({
                    items: itemsToSync
                  })
                });
              }
            } else {
              const existingItemsRes = await fetch(`${MODULES_BASE_URL}/${clientId}/${family}`, {
                credentials: 'include'
              });
              const existingItems = existingItemsRes.ok ? await existingItemsRes.json() : [];
              for (const item of existingItems) {
                try {
                  await fetch(`${MODULES_BASE_URL}/${clientId}/${family}/${item.id}`, {
                    method: 'DELETE',
                    credentials: 'include',
                    headers
                  });
                } catch (error) {
                  console.warn(`Unable to delete instance ${item.id}:`, error);
                }
              }
            }
            continue;
          }
          if (category === 'Antivirus' && Array.isArray(items.solutions)) {
            const solutions = items.solutions || [];
            if (solutions.length > 0) {
              const itemsToSync = solutions.map(solution => {
                const solutionId = isValidUuid(solution.id) ? solution.id : undefined;
                const solutionData = {
                  ...solution
                };
                delete solutionData.id;
                const solutionName = solution.solution ? `${solution.solution} #${solutions.indexOf(solution) + 1}` : `Solution #${solutions.indexOf(solution) + 1}`;
                const baseName = solution.solution || 'unknown';
                const companyId = solution.companyId || solution.data?.companyId;
                const solutionKey = companyId ? `solution-${baseName}-${companyId}` : solutionId ? `solution-${baseName}-${solutionId}` : `solution-${baseName}-${Date.now()}-${solutions.indexOf(solution)}`;
                return {
                  id: solutionId,
                  name: solutionName,
                  item_key: solutionKey,
                  data: solutionData,
                  is_active: true
                };
              });
              const syncRes = await fetch(`${MODULES_BASE_URL}/${clientId}/${family}/sync`, {
                method: 'POST',
                credentials: 'include',
                headers,
                body: JSON.stringify({
                  items: itemsToSync
                })
              });
              if (!syncRes.ok) {
                const errorData = await syncRes.json().catch(() => ({}));
                throw new Error(errorData.error || `Unable to save ${category}`);
              }
            } else {
              const existingItemsRes = await fetch(`${MODULES_BASE_URL}/${clientId}/${family}`, {
                credentials: 'include'
              });
              const existingItems = existingItemsRes.ok ? await existingItemsRes.json() : [];
              for (const item of existingItems) {
                try {
                  await fetch(`${MODULES_BASE_URL}/${clientId}/${family}/${item.id}`, {
                    method: 'DELETE',
                    credentials: 'include',
                    headers
                  });
                } catch (error) {
                  console.warn(`Unable to delete solution ${item.id}:`, error);
                }
              }
            }
            continue;
          }
          if (category === 'Antispam' && Array.isArray(items.solutions)) {
            const solutions = items.solutions || [];
            if (solutions.length > 0) {
              const itemsToSync = solutions.map(solution => {
                const solutionId = isValidUuid(solution.id) ? solution.id : undefined;
                const solutionData = {
                  ...solution
                };
                delete solutionData.id;
                const displayName = solution.logiciel ? `${solution.logiciel} #${solutions.indexOf(solution) + 1}` : `Solution #${solutions.indexOf(solution) + 1}`;
                const logicielKey = solution.logiciel || solution.solution || "mailinblack";
                const customerId = solution.customerId || solution.data?.customerId;
                const solutionKey = customerId ? `solution-${logicielKey}-${customerId}` : solutionId ? `solution-${logicielKey}-${solutionId}` : `solution-${logicielKey}-${Date.now()}-${solutions.indexOf(solution)}`;
                return {
                  id: solutionId,
                  name: displayName,
                  item_key: solutionKey,
                  data: solutionData,
                  is_active: true
                };
              });
              const syncRes = await fetch(`${MODULES_BASE_URL}/${clientId}/${family}/sync`, {
                method: 'POST',
                credentials: 'include',
                headers,
                body: JSON.stringify({
                  items: itemsToSync
                })
              });
              if (!syncRes.ok) {
                const errorData = await syncRes.json().catch(() => ({}));
                throw new Error(errorData.error || `Unable to save ${category}`);
              }
            } else {
              const existingItemsRes = await fetch(`${MODULES_BASE_URL}/${clientId}/${family}`, {
                credentials: 'include'
              });
              const existingItems = existingItemsRes.ok ? await existingItemsRes.json() : [];
              for (const item of existingItems) {
                try {
                  await fetch(`${MODULES_BASE_URL}/${clientId}/${family}/${item.id}`, {
                    method: 'DELETE',
                    credentials: 'include',
                    headers
                  });
                } catch (error) {
                  console.warn(`Unable to delete solution ${item.id}:`, error);
                }
              }
            }
            continue;
          }
          const hasRealData = hasRealEquipmentData(family, items);
          if (!hasRealData) {
            continue;
          }
          const existingItemsRes = await fetch(`${MODULES_BASE_URL}/${clientId}/${family}`, {
            credentials: 'include'
          });
          const existingItems = existingItemsRes.ok ? await existingItemsRes.json() : [];
          const realExistingItems = existingItems.filter(item => {
            const data = item.data || {};
            const dataKeys = Object.keys(data);
            return !(dataKeys.length === 1 && dataKeys[0] === 'enabled' && data.enabled === true);
          });
          const existingItem = realExistingItems.find(item => item.name === category || item.item_key === category);
          for (const enabledItem of existingItems.filter(item => {
            const data = item.data || {};
            const dataKeys = Object.keys(data);
            return dataKeys.length === 1 && dataKeys[0] === 'enabled' && data.enabled === true;
          })) {
            try {
              await fetch(`${MODULES_BASE_URL}/${clientId}/${family}/${enabledItem.id}`, {
                method: 'DELETE',
                credentials: 'include',
                headers
              });
            } catch (error) {
              console.warn(`Unable to delete the "enabled" entry for ${category}:`, error);
            }
          }
          if (existingItem) {
            await fetch(`${MODULES_BASE_URL}/${clientId}/${family}/${existingItem.id}`, {
              method: 'PUT',
              credentials: 'include',
              headers,
              body: JSON.stringify({
                item_key: category,
                name: category,
                data: items,
                is_active: true
              })
            });
          } else {
            await fetch(`${MODULES_BASE_URL}/${clientId}/${family}`, {
              method: 'POST',
              credentials: 'include',
              headers,
              body: JSON.stringify({
                item_key: category,
                name: category,
                data: items,
                is_active: true
              })
            });
          }
        }
      } catch (error) {
        console.error(`Error saving equipment ${category}:`, error);
        throw error;
      }
    }
    if (data.equipements?.Antivirus != null || data.equipements?.Antispam != null || data.equipements?.Sauvegarde != null) {
      invalidateCyberPageDataCache();
    }
    if (data.equipements?.NDD != null) {
      invalidateServiceDomainsCache();
    }
  }
}
export async function fetchClientModuleItems(clientId, family, options = {}) {
  const backendFamily = FAMILY_MAPPING[String(family || "").toLowerCase()] || String(family || "").toLowerCase();
  const res = await fetch(`${MODULES_BASE_URL}/${clientId}/${backendFamily}`, {
    credentials: "include",
    signal: options.signal
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
export async function createClientModuleItem(clientId, family, item) {
  const backendFamily = FAMILY_MAPPING[family.toLowerCase()] || family.toLowerCase();
  const res = await fetch(`${MODULES_BASE_URL}/${clientId}/${backendFamily}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(item)
  });
  if (!res.ok) throw new Error(`Error creating ${family} item`);
  return await res.json();
}
export async function updateClientModuleItem(clientId, family, itemId, item) {
  const backendFamily = FAMILY_MAPPING[family.toLowerCase()] || family.toLowerCase();
  const res = await fetch(`${MODULES_BASE_URL}/${clientId}/${backendFamily}/${itemId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(item)
  });
  if (!res.ok) throw new Error(`Error updating ${family} item`);
  return await res.json();
}
export async function deleteClientModuleItem(clientId, family, itemId) {
  const backendFamily = FAMILY_MAPPING[family.toLowerCase()] || family.toLowerCase();
  const res = await fetch(`${MODULES_BASE_URL}/${clientId}/${backendFamily}/${itemId}`, {
    method: 'DELETE',
    credentials: 'include'
  });
  if (!res.ok) throw new Error(`Error deleting ${family} item`);
  return await res.json();
}
export async function purgeClientLogs(clientId) {
  const res = await fetch(`${BASE_URL}/${clientId}/logs`, {
    method: 'DELETE',
    credentials: 'include'
  });
  if (!res.ok) {
    throw new Error('Error purging logs');
  }
  return await res.json();
}
export async function purgeContactLogs(contactId) {
  const res = await fetch(`${API_BASE_URL}/contacts/${contactId}/logs`, {
    method: 'DELETE',
    credentials: 'include'
  });
  if (!res.ok) {
    throw new Error('Error purging logs');
  }
  return await res.json();
}
export async function fetchContactLogs(contactId, options = {}) {
  const params = new URLSearchParams();
  const limit = options.limit ?? 10;
  const page = options.page ?? 1;
  params.set("limit", String(limit));
  params.set("page", String(page));
  const res = await fetch(`${API_BASE_URL}/contacts/${contactId}/logs?${params}`, {
    credentials: "include",
    signal: options.signal
  });
  if (!res.ok) throw new Error("Error loading contact history");
  return res.json();
}
export async function fetchContacts(clientId = null, options = {}) {
  const url = clientId ? `${API_BASE_URL}/contacts?client_id=${clientId}` : `${API_BASE_URL}/contacts`;
  const res = await fetch(url, {
    credentials: 'include',
    signal: options.signal
  });
  if (!res.ok) throw new Error("Error fetching contacts");
  return await res.json();
}
export async function fetchContactsList(clientId = null, options = {}) {
  const params = new URLSearchParams();
  if (clientId != null && clientId !== "") {
    params.set("client_id", String(clientId));
  }
  params.set("_", String(Date.now()));
  const query = params.toString();
  const url = `${API_BASE_URL}/contacts/list${query ? `?${query}` : ""}`;
  const res = await fetch(url, {
    credentials: "include",
    signal: options.signal,
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache"
    }
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData.details || errorData.error || "Error fetching contact list";
    throw new Error(message);
  }
  return await res.json();
}
export async function addContact(contact) {
  const res = await fetch(`${API_BASE_URL}/contacts`, {
    method: "POST",
    credentials: 'include',
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(contact)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMessage = errorData.details || errorData.error || "Error adding contact";
    throw new Error(errorMessage);
  }
  return await res.json();
}
export async function updateContact(contactId, contact) {
  const res = await fetch(`${API_BASE_URL}/contacts/${contactId}`, {
    method: "PUT",
    credentials: 'include',
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(contact)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMessage = errorData.details || errorData.error || "Error updating contact";
    throw new Error(errorMessage);
  }
  return await res.json();
}
export async function deleteContact(contactId) {
  const res = await fetch(`${API_BASE_URL}/contacts/${contactId}`, {
    method: "DELETE",
    credentials: 'include'
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMessage = errorData.details || errorData.error || "Error deleting contact";
    throw new Error(errorMessage);
  }
  return await res.json();
}
export async function bulkUpdateContacts({
  contactIds = [],
  action = "update",
  updates = {}
} = {}) {
  const res = await fetch(`${API_BASE_URL}/contacts/bulk`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contactIds,
      action,
      updates
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.details || data.error || "Error updating contacts");
  }
  return data;
}
export async function addContactMembership(contactId, {
  client_id,
  poste,
  is_primary
} = {}) {
  const res = await fetch(`${API_BASE_URL}/contacts/${contactId}/memberships`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id,
      poste,
      is_primary
    })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Error adding company membership");
  }
  return await res.json();
}
export async function removeContactMembership(contactId, clientId) {
  const res = await fetch(`${API_BASE_URL}/contacts/${contactId}/memberships/${clientId}`, {
    method: "DELETE",
    credentials: "include"
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Error removing company membership");
  }
  return await res.json();
}
export async function setContactPrimaryForClient(contactId, clientId) {
  const res = await fetch(`${API_BASE_URL}/contacts/${contactId}/memberships/${clientId}/primary`, {
    method: "PUT",
    credentials: "include"
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Error setting primary company contact");
  }
  return await res.json();
}
async function parseClientMetaError(res, fallback) {
  const errorData = await res.json().catch(() => ({}));
  throw new Error(errorData.error || errorData.details || fallback);
}
export async function fetchTagCatalog(options = {}) {
  const res = await fetch(`${BASE_URL}/tags/catalog`, {
    credentials: "include",
    cache: "no-store",
    signal: options.signal
  });
  if (!res.ok) await parseClientMetaError(res, "Error loading labels");
  return res.json();
}
export async function fetchClientTags(clientId, options = {}) {
  const res = await fetch(`${BASE_URL}/${clientId}/tags`, {
    credentials: "include",
    signal: options.signal
  });
  if (!res.ok) await parseClientMetaError(res, "Error loading client labels");
  return res.json();
}
export async function addClientTag(clientId, {
  label,
  color
}, options = {}) {
  const res = await fetch(`${BASE_URL}/${clientId}/tags`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      label,
      color
    }),
    signal: options.signal
  });
  if (!res.ok) await parseClientMetaError(res, "Error adding label");
  return res.json();
}
export async function removeClientTag(clientId, tagId, options = {}) {
  const res = await fetch(`${BASE_URL}/${clientId}/tags/${tagId}`, {
    method: "DELETE",
    credentials: "include",
    signal: options.signal
  });
  if (!res.ok) await parseClientMetaError(res, "Error deleting label");
  return res.json();
}
export async function fetchContactTags(contactId, options = {}) {
  const res = await fetch(`${API_BASE_URL}/contacts/${contactId}/tags`, {
    credentials: "include",
    signal: options.signal
  });
  if (!res.ok) await parseClientMetaError(res, "Error loading contact labels");
  return res.json();
}
export async function addContactTag(contactId, {
  label,
  color
}, options = {}) {
  const res = await fetch(`${API_BASE_URL}/contacts/${contactId}/tags`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      label,
      color
    }),
    signal: options.signal
  });
  if (!res.ok) await parseClientMetaError(res, "Error adding label");
  return res.json();
}
export async function removeContactTag(contactId, tagId, options = {}) {
  const res = await fetch(`${API_BASE_URL}/contacts/${contactId}/tags/${tagId}`, {
    method: "DELETE",
    credentials: "include",
    signal: options.signal
  });
  if (!res.ok) await parseClientMetaError(res, "Error deleting label");
  return res.json();
}
export async function fetchClientNotes(clientId, options = {}) {
  const res = await fetch(`${BASE_URL}/${clientId}/notes`, {
    credentials: "include",
    signal: options.signal
  });
  if (!res.ok) await parseClientMetaError(res, "Error loading notes");
  return res.json();
}
export async function createClientNote(clientId, content, options = {}) {
  const res = await fetch(`${BASE_URL}/${clientId}/notes`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      content
    }),
    signal: options.signal
  });
  if (!res.ok) await parseClientMetaError(res, "Error adding note");
  return res.json();
}
export async function updateClientNote(clientId, noteId, content, options = {}) {
  const res = await fetch(`${BASE_URL}/${clientId}/notes/${noteId}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      content
    }),
    signal: options.signal
  });
  if (!res.ok) await parseClientMetaError(res, "Error updating note");
  return res.json();
}
export async function deleteClientNote(clientId, noteId, options = {}) {
  const res = await fetch(`${BASE_URL}/${clientId}/notes/${noteId}`, {
    method: "DELETE",
    credentials: "include",
    signal: options.signal
  });
  if (!res.ok) await parseClientMetaError(res, "Error deleting note");
  return res.json();
}
export async function fetchClientSupportCredits(clientId, options = {}) {
  const res = await fetch(`${BASE_URL}/${clientId}/support-credits`, {
    credentials: "include",
    signal: options.signal
  });
  if (!res.ok) await parseClientMetaError(res, "Error loading support credits");
  return res.json();
}
export async function creditClientSupportTickets(clientId, {
  amount,
  note,
  label,
  validFrom,
  validUntil
}, options = {}) {
  const res = await fetch(`${BASE_URL}/${clientId}/support-credits`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      amount,
      note,
      label,
      validFrom,
      validUntil
    }),
    signal: options.signal
  });
  if (!res.ok) await parseClientMetaError(res, "Error crediting support tickets");
  return res.json();
}
export async function fetchAllSupportCreditPacks(options = {}) {
  const res = await fetch(`${BASE_URL}/support-credits/packs`, {
    credentials: "include",
    signal: options.signal
  });
  if (!res.ok) await parseClientMetaError(res, "Error loading support notebooks");
  return res.json();
}
export async function updateSupportCreditPack(clientId, packId, payload, options = {}) {
  const res = await fetch(`${BASE_URL}/${clientId}/support-credits/packs/${packId}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    signal: options.signal
  });
  if (!res.ok) await parseClientMetaError(res, "Error updating notebook");
  return res.json();
}
export async function deleteSupportCreditPack(clientId, packId, options = {}) {
  const res = await fetch(`${BASE_URL}/${clientId}/support-credits/packs/${packId}`, {
    method: "DELETE",
    credentials: "include",
    signal: options.signal
  });
  if (!res.ok) await parseClientMetaError(res, "Error deleting notebook");
  return res.json();
}
