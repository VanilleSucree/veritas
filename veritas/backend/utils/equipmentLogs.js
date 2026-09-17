const LOG_CATEGORIES = new Set(["all", "modifications", "rmm", "remote", "user"]);

const FIELD_LABELS = {
  nom: "Nom",
  name: "Nom",
  item_key: "Clé",
  is_active: "Actif",
  marque: "Marque",
  fabricant: "Fabricant",
  manufacturer: "Fabricant",
  modele: "Modèle",
  model: "Modèle",
  numeroSerie: "Numéro de série",
  numero_serie: "Numéro de série",
  serial: "Numéro de série",
  serialNumber: "Numéro de série",
  ip: "Adresse IP",
  adresseMac: "Adresse MAC",
  mac: "Adresse MAC",
  macAddress: "Adresse MAC",
  site: "Site",
  location: "Site",
  emplacement: "Site",
  processeur: "Processeur",
  cpu: "Processeur",
  vcpu: "VCPU",
  memoire: "Mémoire",
  ram: "Mémoire",
  memory: "Mémoire",
  stockage: "Stockage",
  storage: "Stockage",
  systeme: "Système d'exploitation",
  os: "Système d'exploitation",
  vlan: "VLAN",
  role: "Rôle",
  expirationGarantie: "Expiration garantie",
  garantie: "Expiration garantie",
  nbDisquesActuels: "Nombre de disques actuels",
  nbDisquesMax: "Nombre de disques max",
  disques: "Disques",
  capacite: "Capacité",
  raid: "Configuration RAID",
  luns: "LUNs",
  cassettesRDX: "Cassettes RDX",
  numeroDisque: "Numéro de disque",
  version: "Version",
  firmware: "Firmware",
  type: "Type",
  typeServer: "Type de serveur",
  firewallType: "Type de firewall",
  routeurType: "Type de routeur",
  alimentationType: "Type d'alimentation",
  toipType: "Type TOIP",
  internetType: "Type Internet",
  fournisseur: "Fournisseur",
  debit: "Débit",
  debitDownload: "Débit download",
  debitUpload: "Débit upload",
  categorie: "Catégorie",
  ipNonDesktop: "IP non fixe",
  numeroLigne: "Numéro de ligne",
  referenceContrat: "Référence contrat",
  supportTelephone: "Support téléphone",
  dateMiseEnService: "Date de mise en service",
  boxModele: "Modèle box",
  gateway: "Passerelle",
  commentaire: "Commentaire",
  domaine: "Domaine",
  domaineSip: "Domaine SIP",
  netbios: "NetBIOS",
  source: "Source",
  hypervisor: "Hyperviseur",
  hyperviseur: "Hyperviseur",
  hostServerName: "Serveur hôte",
  serveurHote: "Serveur hôte",
  adminUrl: "URL d'administration",
  urlAdministration: "URL d'administration",
  manageable: "Gérable",
  poeSupport: "Support PoE",
  empilage: "Empilage",
  ssids: "SSIDs",
  licences: "Licences",
  modeHA: "Mode HA",
  roleHA: "Rôle HA",
  firewallHA: "Firewall HA",
  firewallHAName: "Nom firewall HA",
  serverHA: "Serveur HA",
  serverHAName: "Nom serveur HA",
  storageHA: "Stockage HA",
  storageHAName: "Nom stockage HA",
  stormshieldWanUrl: "URL WAN Stormshield",
  nombreExtensions: "Nombre d'extensions",
  nbExtensions: "Nombre d'extensions",
  extensions: "Extensions",
  capaciteVA: "Capacité VA",
  capaciteW: "Capacité W",
  puissanceW: "Capacité W",
  nbPrises: "Nombre de prises",
  nombrePrises: "Nombre de prises",
  dateBatterie: "Date batterie",
  alimentationPoE: "Alimentation PoE",
  anydeskId: "AnyDesk ID",
  remoteAccessSolution: "Solution d'accès distant",
  remoteAccessId: "ID accès distant",
  quickConnect: "QuickConnect",
  unifiApiHost: "Hôte API UniFi",
  unifiApiKey: "Clé API UniFi",
  unifiApiRejectUnauthorized: "API UniFi TLS strict",
  unifiApiConfiguredAt: "API UniFi configurée le",
  unifiId: "ID UniFi",
  unifiMac: "MAC UniFi",
  unifiSiteId: "Site UniFi",
  unifiHostId: "Host UniFi",
  checkmk_host_name: "Hôte CheckMK",
  checkmk_site: "Site CheckMK",
  checkmk_service_name: "Service CheckMK",
  checkmkMapping: "Mapping CheckMK"
};

/** Canonicalize alias keys so site/location/emplacement only log once. */
const FIELD_ALIASES = {
  name: "nom",
  fabricant: "marque",
  manufacturer: "marque",
  model: "modele",
  numero_serie: "numeroSerie",
  serial: "numeroSerie",
  serialNumber: "numeroSerie",
  mac: "adresseMac",
  macAddress: "adresseMac",
  location: "site",
  emplacement: "site",
  cpu: "processeur",
  vcpu: "processeur",
  ram: "memoire",
  memory: "memoire",
  storage: "stockage",
  os: "systeme",
  garantie: "expirationGarantie",
  hyperviseur: "hypervisor",
  serveurHote: "hostServerName",
  urlAdministration: "adminUrl",
  nbExtensions: "nombreExtensions",
  extensions: "nombreExtensions",
  puissanceW: "capaciteW",
  nombrePrises: "nbPrises",
  anydeskId: "remoteAccessId"
};

const IGNORE_DATA_KEYS = new Set([
  "id",
  "__fromDb",
  "__index",
  "client_id",
  "clientId",
  "item_key",
  "created_at",
  "updated_at",
  "agentOnline",
  "agent_online",
  "agentManaged",
  "rmmAgentId",
  "agentId",
  "agent_id",
  "agentVersion",
  "agent_version",
  "lastSeen",
  "last_seen",
  "osData",
  "domainData",
  "rawData",
  "data"
]);

export function normalizeEquipmentLogCategory(value) {
  const category = String(value || "all").trim().toLowerCase();
  return LOG_CATEGORIES.has(category) ? category : "all";
}

function isModificationActionSql() {
  return `(
    action ILIKE 'Modification du champ%'
    OR action ILIKE 'Field modified%'
    OR action ILIKE 'Field update:%'
    OR action ILIKE 'Field set:%'
    OR action ILIKE 'Equipment created%'
    OR action ILIKE 'Équipement créé%'
    OR action ILIKE 'Equipment deleted%'
    OR action ILIKE 'Équipement supprimé%'
    OR details->>'kind' IN ('field_update', 'field_set', 'equipment_created', 'equipment_deleted', 'checkmk_mapping')
  )`;
}

export function buildEquipmentLogQuery({
  clientId,
  family,
  equipmentName,
  equipmentDbId = null,
  search = "",
  category = "all"
}) {
  const decodedEquipmentName = decodeURIComponent(String(equipmentName || ""));
  const normalizedCategory = normalizeEquipmentLogCategory(category);
  const trimmedSearch = String(search || "").trim();
  const params = equipmentDbId ? [clientId, family, String(equipmentDbId).trim()] : [clientId, family, decodedEquipmentName];
  let where = equipmentDbId ? "client_id = $1 AND equipment_family = $2 AND equipment_id = $3" : "client_id = $1 AND equipment_family = $2 AND equipment_name = $3";
  if (trimmedSearch) {
    params.push(`%${trimmedSearch}%`);
    const searchIdx = params.length;
    where += ` AND (
      action ILIKE $${searchIdx}
      OR COALESCE(user_name, '') ILIKE $${searchIdx}
      OR COALESCE(details::text, '') ILIKE $${searchIdx}
    )`;
  }
  if (normalizedCategory === "modifications") {
    where += ` AND ${isModificationActionSql()}`;
  } else if (normalizedCategory === "all") {
    where += ` AND COALESCE(details->>'kind', '') <> 'rmm_heartbeat'`;
  } else if (normalizedCategory === "rmm") {
    where += ` AND (
      action ILIKE '%agent RMM%'
      OR action ILIKE '%RMM agent%'
      OR action ILIKE 'Heartbeat%'
      OR action ILIKE 'Sync complet%'
      OR action ILIKE 'Full RMM agent sync%'
      OR details->>'kind' LIKE 'rmm_%'
      OR COALESCE(user_name, '') = 'Agent RMM'
    )`;
  } else if (normalizedCategory === "remote") {
    where += ` AND (
      action ILIKE '%connexion distante%'
      OR action ILIKE '%remote connection%'
      OR details->>'kind' IN ('remote_access', 'quick_connect')
    )`;
  } else if (normalizedCategory === "user") {
    where += ` AND NOT (
      ${isModificationActionSql()}
      OR action ILIKE '%agent RMM%'
      OR action ILIKE '%RMM agent%'
      OR action ILIKE 'Heartbeat%'
      OR action ILIKE 'Sync complet%'
      OR action ILIKE 'Full RMM agent sync%'
      OR details->>'kind' LIKE 'rmm_%'
      OR COALESCE(user_name, '') = 'Agent RMM'
    )`;
  }
  return {
    where,
    params,
    category: normalizedCategory,
    search: trimmedSearch
  };
}

export function getEquipmentFieldLabel(field) {
  if (!field) return "";
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];
  return String(field).replace(/_/g, " ").replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase()).trim();
}

function canonicalizeField(field) {
  return FIELD_ALIASES[field] || field;
}

function parseMaybeJson(value) {
  if (value == null) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  if (typeof value === "object" && !Array.isArray(value)) return value;
  return {};
}

export function normalizeEquipmentLogValue(val) {
  if (val === null || val === undefined) return null;
  if (val === "") return null;
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return Number.isFinite(val) ? val : null;
  if (typeof val === "string") {
    const trimmed = val.trim();
    return trimmed === "" ? null : trimmed;
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return null;
    return val;
  }
  if (typeof val === "object") {
    const keys = Object.keys(val);
    if (keys.length === 0) return null;
    return val;
  }
  return val;
}

function valuesEqual(a, b) {
  const left = normalizeEquipmentLogValue(a);
  const right = normalizeEquipmentLogValue(b);
  if (left === null && right === null) return true;
  if (left === null || right === null) return false;
  if (typeof left === "object" || typeof right === "object") {
    return JSON.stringify(left) === JSON.stringify(right);
  }
  return left === right;
}

function collectAliasKeys(canonical) {
  const keys = new Set([canonical]);
  Object.entries(FIELD_ALIASES).forEach(([alias, target]) => {
    if (target === canonical) keys.add(alias);
  });
  return keys;
}

function readCanonicalValue(data, canonical) {
  const keys = collectAliasKeys(canonical);
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = data[key];
      if (normalizeEquipmentLogValue(value) !== null) return value;
    }
  }
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(data, key)) return data[key];
  }
  return undefined;
}

/**
 * Build field-level diffs between previous and next equipment payloads.
 * Compares display name, is_active, and all data keys (alias-aware).
 */
export function buildEquipmentFieldModifications({
  oldName = null,
  newName = null,
  oldIsActive = undefined,
  newIsActive = undefined,
  oldData = {},
  newData = {}
} = {}) {
  const prevData = parseMaybeJson(oldData);
  const nextData = parseMaybeJson(newData);
  const modifications = [];

  if (!valuesEqual(oldName, newName)) {
    modifications.push({
      field: "nom",
      fieldLabel: getEquipmentFieldLabel("nom"),
      oldValue: oldName ?? null,
      newValue: newName ?? null
    });
  }

  if (oldIsActive !== undefined || newIsActive !== undefined) {
    const prevActive = oldIsActive === undefined ? undefined : Boolean(oldIsActive);
    const nextActive = newIsActive === undefined ? undefined : Boolean(newIsActive);
    if (prevActive !== nextActive) {
      modifications.push({
        field: "is_active",
        fieldLabel: getEquipmentFieldLabel("is_active"),
        oldValue: prevActive,
        newValue: nextActive
      });
    }
  }

  const canonicalKeys = new Set();
  [...Object.keys(prevData), ...Object.keys(nextData)].forEach(key => {
    if (IGNORE_DATA_KEYS.has(key)) return;
    canonicalKeys.add(canonicalizeField(key));
  });

  for (const canonical of canonicalKeys) {
    if (IGNORE_DATA_KEYS.has(canonical)) continue;
    // Name already compared via row.name
    if (canonical === "nom" || canonical === "name") continue;
    const oldValue = readCanonicalValue(prevData, canonical);
    const newValue = readCanonicalValue(nextData, canonical);
    if (valuesEqual(oldValue, newValue)) continue;
    modifications.push({
      field: canonical,
      fieldLabel: getEquipmentFieldLabel(canonical),
      oldValue: oldValue ?? null,
      newValue: newValue ?? null
    });
  }

  return modifications;
}

export async function insertEquipmentLog(pool, {
  clientId,
  family,
  equipmentName,
  equipmentId = null,
  userId = null,
  userName = "Unknown user",
  action,
  details = null
}) {
  await pool.query(
    `INSERT INTO v_b_clients_m_logs
      (client_id, equipment_family, equipment_name, equipment_id, user_id, user_name, action, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      clientId,
      family,
      equipmentName || "",
      equipmentId || null,
      userId,
      userName,
      action,
      details == null ? null : typeof details === "string" ? details : JSON.stringify(details)
    ]
  );
}

export async function insertEquipmentFieldUpdateLogs(pool, {
  clientId,
  family,
  equipmentName,
  equipmentId = null,
  userId = null,
  userName = "Unknown user",
  modifications = [],
  kind = "field_update"
}) {
  for (const mod of modifications) {
    const isCreate = kind === "field_set" || kind === "equipment_created";
    const actionPrefix = isCreate ? "Field set" : "Field update";
    await insertEquipmentLog(pool, {
      clientId,
      family,
      equipmentName,
      equipmentId,
      userId,
      userName,
      action: `${actionPrefix}: ${mod.fieldLabel}`,
      details: {
        kind: isCreate ? "field_set" : "field_update",
        field: mod.field,
        fieldLabel: mod.fieldLabel,
        oldValue: mod.oldValue,
        newValue: mod.newValue
      }
    });
  }
}

export async function logEquipmentCreated(pool, {
  clientId,
  family,
  equipmentName,
  equipmentId = null,
  userId = null,
  userName = "Unknown user",
  data = {},
  name = null,
  isActive = true
}) {
  const fields = buildEquipmentFieldModifications({
    oldName: null,
    newName: name || equipmentName,
    oldIsActive: undefined,
    newIsActive: isActive,
    oldData: {},
    newData: data
  }).filter(mod => normalizeEquipmentLogValue(mod.newValue) !== null);

  await insertEquipmentLog(pool, {
    clientId,
    family,
    equipmentName: name || equipmentName || "",
    equipmentId,
    userId,
    userName,
    action: "Equipment created",
    details: {
      kind: "equipment_created",
      fields: fields.reduce((acc, mod) => {
        acc[mod.field] = mod.newValue;
        return acc;
      }, {})
    }
  });

  await insertEquipmentFieldUpdateLogs(pool, {
    clientId,
    family,
    equipmentName: name || equipmentName || "",
    equipmentId,
    userId,
    userName,
    modifications: fields,
    kind: "field_set"
  });
}

export async function logEquipmentUpdated(pool, {
  clientId,
  family,
  equipmentName,
  equipmentId = null,
  userId = null,
  userName = "Unknown user",
  oldName = null,
  newName = null,
  oldIsActive = undefined,
  newIsActive = undefined,
  oldData = {},
  newData = {}
}) {
  const modifications = buildEquipmentFieldModifications({
    oldName,
    newName,
    oldIsActive,
    newIsActive,
    oldData,
    newData
  });
  if (!modifications.length) return [];
  await insertEquipmentFieldUpdateLogs(pool, {
    clientId,
    family,
    equipmentName: newName || oldName || equipmentName || "",
    equipmentId,
    userId,
    userName,
    modifications,
    kind: "field_update"
  });
  return modifications;
}

export async function logEquipmentDeleted(pool, {
  clientId,
  family,
  equipmentName,
  equipmentId = null,
  userId = null,
  userName = "Unknown user",
  data = {}
}) {
  await insertEquipmentLog(pool, {
    clientId,
    family,
    equipmentName: equipmentName || "",
    equipmentId,
    userId,
    userName,
    action: "Equipment deleted",
    details: {
      kind: "equipment_deleted",
      snapshot: parseMaybeJson(data)
    }
  });
}
