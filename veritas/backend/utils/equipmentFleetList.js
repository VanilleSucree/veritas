import { pool } from "../database/db.js";
import { PURGE_HARDWARE_FAMILIES } from "./equipmentPurgeList.js";
import { parseEquipmentActiveFlag } from "./equipmentFamilies.js";

const MODULE_FLAG_LABELS = [
  "Internet",
  "Firewalls",
  "Firewall",
  "Serveurs",
  "Stockage",
  "Switch",
  "BorneWifi",
  "Alimentation",
  "Routeur",
  "TOIP",
  "Sauvegarde",
  "Ordinateurs"
];

const MODULE_FLAG_SQL_LIST = MODULE_FLAG_LABELS.map(label => `'${label.replace(/'/g, "''")}'`).join(", ");

const EXCLUDE_MODULE_FLAG_ROWS = `
  AND NOT (
    COALESCE(e.item_key, '') IN (${MODULE_FLAG_SQL_LIST})
    OR COALESCE(e.name, '') IN (${MODULE_FLAG_SQL_LIST})
  )
`;

/** UI display types expected by EquipmentPage / Supervision. */
function toFrontendType(familyType) {
  if (familyType === "Serveurs") return "Servers";
  if (familyType === "Stockage") return "Storage";
  return familyType;
}

function buildFleetSelect(table, { withCheckmk }) {
  const checkmkCols = withCheckmk
    ? `,
      NULLIF(TRIM(COALESCE(
        e.checkmk_host_name,
        e.data->>'checkmk_host_name',
        e.data->'checkmkMapping'->>'checkmk_host_name',
        ''
      )), '') AS checkmk_host_name,
      NULLIF(TRIM(COALESCE(
        e.checkmk_site,
        e.data->>'checkmk_site',
        e.data->'checkmkMapping'->>'checkmk_site',
        ''
      )), '') AS checkmk_site,
      NULLIF(TRIM(COALESCE(
        e.checkmk_service_name,
        e.data->>'checkmk_service_name',
        e.data->'checkmkMapping'->>'checkmk_service_name',
        ''
      )), '') AS checkmk_service_name`
    : `,
      NULLIF(TRIM(COALESCE(
        e.data->>'checkmk_host_name',
        e.data->'checkmkMapping'->>'checkmk_host_name',
        ''
      )), '') AS checkmk_host_name,
      NULLIF(TRIM(COALESCE(
        e.data->>'checkmk_site',
        e.data->'checkmkMapping'->>'checkmk_site',
        ''
      )), '') AS checkmk_site,
      NULLIF(TRIM(COALESCE(
        e.data->>'checkmk_service_name',
        e.data->'checkmkMapping'->>'checkmk_service_name',
        ''
      )), '') AS checkmk_service_name`;

  return `
    SELECT
      e.id,
      e.client_id,
      c.name AS client_name,
      e.name AS row_name,
      e.item_key,
      e.is_active,
      COALESCE(
        NULLIF(TRIM(e.data->>'nom'), ''),
        NULLIF(TRIM(e.data->>'name'), ''),
        NULLIF(TRIM(e.name), ''),
        NULLIF(TRIM(e.item_key), ''),
        '—'
      ) AS display_name,
      COALESCE(NULLIF(TRIM(e.data->>'ip'), ''), '') AS ip,
      COALESCE(
        NULLIF(TRIM(e.data->>'numeroSerie'), ''),
        NULLIF(TRIM(e.data->>'serial'), ''),
        NULLIF(TRIM(e.data->>'sn'), ''),
        ''
      ) AS serial,
      COALESCE(
        NULLIF(TRIM(e.data->>'site'), ''),
        NULLIF(TRIM(e.data->>'location'), ''),
        NULLIF(TRIM(e.data->>'emplacement'), ''),
        ''
      ) AS location,
      COALESCE(
        NULLIF(TRIM(e.data->>'modele'), ''),
        NULLIF(TRIM(e.data->>'model'), ''),
        ''
      ) AS model,
      COALESCE(
        NULLIF(TRIM(e.data->>'adresseMac'), ''),
        NULLIF(TRIM(e.data->>'mac'), ''),
        ''
      ) AS mac,
      COALESCE(
        NULLIF(TRIM(e.data->>'marque'), ''),
        NULLIF(TRIM(e.data->>'fabricant'), ''),
        NULLIF(TRIM(e.data->>'manufacturer'), ''),
        ''
      ) AS manufacturer,
      COALESCE(
        NULLIF(TRIM(e.data->>'type'), ''),
        NULLIF(TRIM(e.data->>'typeServer'), ''),
        ''
      ) AS device_type,
      COALESCE(NULLIF(TRIM(e.data->>'fournisseur'), ''), '') AS fournisseur,
      COALESCE(NULLIF(TRIM(e.data->>'expirationGarantie'), ''), NULLIF(TRIM(e.data->>'garantie'), ''), '') AS expiration_garantie,
      COALESCE(NULLIF(TRIM(e.data->>'dateBatterie'), ''), '') AS date_batterie,
      COALESCE(NULLIF(TRIM(e.data->>'systeme'), ''), NULLIF(TRIM(e.data->'os'->>'name'), ''), '') AS systeme,
      COALESCE(NULLIF(TRIM(e.data->>'source'), ''), '') AS rmm_source,
      COALESCE(NULLIF(TRIM(e.data->>'agentId'), ''), NULLIF(TRIM(e.data->>'agent_id'), ''), '') AS rmm_agent_id,
      COALESCE(NULLIF(TRIM(e.data->>'agentVersion'), ''), NULLIF(TRIM(e.data->>'agent_version'), ''), '') AS rmm_agent_version,
      CASE
        WHEN lower(COALESCE(e.data->>'agentOnline', '')) IN ('true', 't', '1', 'yes') THEN true
        WHEN lower(COALESCE(e.data->>'agentOnline', '')) IN ('false', 'f', '0', 'no') THEN false
        ELSE NULL
      END AS rmm_agent_online,
      COALESCE(
        NULLIF(TRIM(e.data->>'lastInventoryAt'), ''),
        NULLIF(TRIM(e.data->>'collectedAt'), ''),
        NULLIF(TRIM(e.data->>'last_seen_at'), ''),
        NULLIF(TRIM(e.data->>'rmm_last_heartbeat'), ''),
        ''
      ) AS rmm_last_seen_at,
      e.data->>'heartbeatIntervalMinutes' AS rmm_heartbeat_interval,
      e.data->>'heartbeat_interval_minutes' AS rmm_heartbeat_interval_alt,
      e.data->>'offlineThresholdMinutes' AS rmm_offline_threshold,
      e.data->>'offline_threshold_minutes' AS rmm_offline_threshold_alt,
      e.data->'updates' AS rmm_updates,
      e.data->'hardware'->'disks' AS rmm_disks,
      e.data->'licences' AS licences,
      e.data->'os' AS rmm_os,
      e.data->'domain' AS rmm_domain,
      e.data->>'domaine' AS rmm_domaine,
      e.data->>'netbios' AS rmm_netbios,
      e.data->>'hostname' AS rmm_hostname,
      e.data->'network' AS rmm_network,
      e.data->>'ipNonFixe' AS ip_non_fixe,
      e.data->>'actif' AS data_actif,
      e.data->>'is_active' AS data_is_active_flag,
      e.data->>'active' AS data_active,
      e.data->>'isActive' AS data_is_active_camel,
      e.created_at
      ${checkmkCols}
    FROM ${table} e
    INNER JOIN v_b_clients c ON c.id = e.client_id
    WHERE e.client_id IS NOT NULL
      ${EXCLUDE_MODULE_FLAG_ROWS}
  `;
}

function parseJsonField(value) {
  if (value == null) return null;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return null;
}

function mapFleetRow(row, familyMeta) {
  const dbId = String(row.id);
  const clientId = row.client_id;
  const type = toFrontendType(familyMeta.type);
  const name = row.display_name || row.row_name || row.item_key || "—";
  const checkmkHost = row.checkmk_host_name && String(row.checkmk_host_name).trim()
    ? String(row.checkmk_host_name).trim()
    : null;
  const checkmkMapping = checkmkHost
    ? {
        checkmk_host_name: checkmkHost,
        checkmk_site: row.checkmk_site || null,
        checkmk_service_name: row.checkmk_service_name || null,
        is_active: true
      }
    : null;

  const rmmSource = String(row.rmm_source || "").trim();
  const rmmAgentId = String(row.rmm_agent_id || "").trim() || null;
  const isRmm = rmmSource === "rmm" || Boolean(rmmAgentId);
  const agentOnline = row.rmm_agent_online === true || row.rmm_agent_online === false
    ? row.rmm_agent_online
    : undefined;
  const updates = parseJsonField(row.rmm_updates);
  const disks = parseJsonField(row.rmm_disks);
  const licences = parseJsonField(row.licences);
  const os = parseJsonField(row.rmm_os);
  const domain = parseJsonField(row.rmm_domain);
  const network = parseJsonField(row.rmm_network);

  const rawData = {
    source: rmmSource || undefined,
    agentId: rmmAgentId || undefined,
    agent_id: rmmAgentId || undefined,
    agentVersion: row.rmm_agent_version || undefined,
    agent_version: row.rmm_agent_version || undefined,
    agentOnline,
    lastInventoryAt: row.rmm_last_seen_at || undefined,
    collectedAt: row.rmm_last_seen_at || undefined,
    last_seen_at: row.rmm_last_seen_at || undefined,
    rmm_last_heartbeat: row.rmm_last_seen_at || undefined,
    heartbeatIntervalMinutes: row.rmm_heartbeat_interval || undefined,
    heartbeat_interval_minutes: row.rmm_heartbeat_interval_alt || undefined,
    offlineThresholdMinutes: row.rmm_offline_threshold || undefined,
    offline_threshold_minutes: row.rmm_offline_threshold_alt || undefined,
    updates: updates || undefined,
    hardware: disks ? { disks } : undefined,
    licences: Array.isArray(licences) ? licences : undefined,
    os: os || undefined,
    domain: domain || undefined,
    domaine: row.rmm_domaine || undefined,
    netbios: row.rmm_netbios || undefined,
    hostname: row.rmm_hostname || undefined,
    network: network || undefined,
    systeme: row.systeme || undefined,
    expirationGarantie: row.expiration_garantie || undefined,
    dateBatterie: row.date_batterie || undefined,
    type: row.device_type || undefined,
    typeServer: row.device_type || undefined,
    ipNonFixe: row.ip_non_fixe === true || row.ip_non_fixe === "true" || undefined,
    checkmk_host_name: checkmkHost || undefined,
    checkmk_site: row.checkmk_site || undefined,
    checkmk_service_name: row.checkmk_service_name || undefined
  };

  // Drop undefined keys to keep payload small.
  Object.keys(rawData).forEach(key => {
    if (rawData[key] === undefined) delete rawData[key];
  });

  return {
    id: dbId,
    dbId,
    clientId,
    clientName: row.client_name || String(clientId),
    type,
    family: familyMeta.family,
    name,
    ip: row.ip || "",
    serial: row.serial || "",
    location: row.location || "",
    model: row.model || "",
    mac: row.mac || "",
    manufacturer: row.manufacturer || "",
    deviceType: row.device_type || "",
    typeServer: row.device_type || "",
    fournisseur: row.fournisseur || "",
    systeme: row.systeme || "",
    expirationGarantie: row.expiration_garantie || null,
    dateBatterie: type === "Alimentation" ? row.date_batterie || null : undefined,
    licences: type === "Firewalls" && Array.isArray(licences) ? licences : undefined,
    netbios: type === "Ordinateurs" ? row.rmm_netbios || row.rmm_hostname || "" : undefined,
    domaine: type === "Ordinateurs" ? row.rmm_domaine || "" : undefined,
    agentOnline: type === "Ordinateurs" || type === "Servers" ? agentOnline : undefined,
    agentManaged: type === "Ordinateurs" || type === "Servers" ? isRmm : undefined,
    rmmAgentId: type === "Ordinateurs" || type === "Servers" ? rmmAgentId : undefined,
    agentVersion: type === "Ordinateurs" || type === "Servers" ? row.rmm_agent_version || null : undefined,
    checkmkMapping,
    rawData,
    is_active: parseEquipmentActiveFlag(
      row.data_actif,
      row.data_active,
      row.data_is_active_camel,
      row.data_is_active_flag,
      row.is_active
    ) !== false,
    createdAt: row.created_at || null,
    created_at: row.created_at || null,
    status: "unknown"
  };
}

async function queryFamilyFleet(familyMeta) {
  try {
    const result = await pool.query(buildFleetSelect(familyMeta.table, { withCheckmk: true }));
    return result.rows;
  } catch (err) {
    // Missing CheckMK columns → retry without them.
    if (err?.code === "42703") {
      const result = await pool.query(buildFleetSelect(familyMeta.table, { withCheckmk: false }));
      return result.rows;
    }
    if (err?.code === "42P01") {
      console.warn(`[equipment-fleet] table missing: ${familyMeta.table}`);
      return [];
    }
    throw err;
  }
}

/**
 * Lean MSP fleet for Supervision / Hardware page.
 * ~10 parallel queries (one per hardware family), projected fields only.
 */
export async function fetchEquipmentFleetList() {
  const batches = await Promise.all(
    PURGE_HARDWARE_FAMILIES.map(async familyMeta => {
      const rows = await queryFamilyFleet(familyMeta);
      return rows
        .filter(row => {
          // Match mapClientHardwareEquipment: hide inactive ordinateurs.
          if (familyMeta.type === "Ordinateurs" && row.is_active === false) return false;
          return true;
        })
        .map(row => mapFleetRow(row, familyMeta));
    })
  );

  const items = batches.flat();
  items.sort((a, b) => {
    const byClient = String(a.clientName || "").localeCompare(String(b.clientName || ""), "fr", {
      sensitivity: "base"
    });
    if (byClient !== 0) return byClient;
    const byType = String(a.type || "").localeCompare(String(b.type || ""), "fr", {
      sensitivity: "base"
    });
    if (byType !== 0) return byType;
    return String(a.name || "").localeCompare(String(b.name || ""), "fr", {
      sensitivity: "base"
    });
  });
  return items;
}
