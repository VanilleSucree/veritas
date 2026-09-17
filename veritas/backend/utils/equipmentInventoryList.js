import { pool } from "../database/db.js";
import {
  computeMonitoringSummary,
  countCheckmkHistoryLastDays
} from "../routes/integrations/checkmk/equipmentMonitoringSync.js";
import { fetchStandardHardwarePurgeList, PURGE_HARDWARE_FAMILIES } from "./equipmentPurgeList.js";
import { applyEquipmentAlertSettings, isAlertSuspensionActive, resolveAlertStatusFromSettings, resolveEquipmentFamilyKey } from "./equipmentMonitoringAlerts.js";
import { canonicalizeSystemFamilyKey, listSystemFamilyExtensionsByKey, parseEquipmentActiveFlag } from "./equipmentFamilies.js";

const VIDEO_SURVEILLANCE_TABLES = [
  "v_b_clients_m_videosurveillance",
  "v_b_clients_m_camera",
  "v_b_clients_m_cameras"
];
const SKIP_CUSTOM_COLUMN_KEYS = new Set(["name", "nom"]);
const SERIAL_KEY_RE = /^(numero[_]?serie|serial|sn|num[_]?serie|n[_]?serie)$/i;
const SERIAL_LABEL_RE = /s[ée]rie|serial/i;
const IP_KEY_RE = /^(ip|adresse[_]?ip|ip[_]?address)$/i;

function parseJsonObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {
      return {};
    }
  }
  return {};
}

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [];
    }
  }
  return [];
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function pickFromObject(data, keys) {
  for (const key of keys) {
    const text = firstNonEmpty(data?.[key]);
    if (text) return text;
  }
  return "";
}

function normalizeCustomFields(raw, data) {
  const fromDef = parseJsonArray(raw)
    .map((field, index) => ({
      fieldKey: String(field?.fieldKey || field?.field_key || "").trim(),
      label: String(field?.label || field?.fieldKey || field?.field_key || "").trim(),
      fieldType: String(field?.fieldType || field?.field_type || "text"),
      displayOrder: Number(field?.displayOrder ?? field?.display_order) || (index + 1) * 10
    }))
    .filter(field => field.fieldKey);
  if (fromDef.length) return fromDef;
  return Object.keys(data || {})
    .filter(key => !SKIP_CUSTOM_COLUMN_KEYS.has(String(key).toLowerCase()))
    .map((fieldKey, index) => ({
      fieldKey,
      label: fieldKey,
      fieldType: "text",
      displayOrder: (index + 1) * 10
    }));
}

function pickByFieldMeta(data, fields, keyRe, labelRe) {
  for (const field of fields) {
    if (!keyRe.test(field.fieldKey || "") && !(labelRe && labelRe.test(field.label || ""))) continue;
    const text = firstNonEmpty(data?.[field.fieldKey]);
    if (text) return text;
  }
  return "";
}

function pickCustomSerial(data, fields) {
  return pickFromObject(data, ["numeroSerie", "serial", "sn", "numero_serie", "num_serie"])
    || pickByFieldMeta(data, fields, SERIAL_KEY_RE, SERIAL_LABEL_RE);
}

function pickCustomIp(data, fields) {
  return pickFromObject(data, ["ip", "adresseIp", "adresse_ip"])
    || pickByFieldMeta(data, fields, IP_KEY_RE, /^ip$/i);
}

async function loadCustomFieldsByFamilyKeys(familyKeys) {
  const keys = [...new Set((Array.isArray(familyKeys) ? familyKeys : []).map(key => String(key || "").trim()).filter(Boolean))];
  if (!keys.length) return new Map();
  try {
    const result = await pool.query(
      `SELECT d.family_key, f.field_key, f.label, f.field_type, f.display_order
       FROM v_b_equipment_family_definitions d
       INNER JOIN v_b_equipment_family_fields f ON f.family_id = d.id
       WHERE d.family_key = ANY($1::text[])
       ORDER BY f.display_order ASC, f.id ASC`,
      [keys]
    );
    const map = new Map();
    for (const row of result.rows || []) {
      const familyKey = String(row.family_key || "").trim();
      if (!familyKey) continue;
      const list = map.get(familyKey) || [];
      list.push({
        fieldKey: row.field_key,
        label: row.label,
        fieldType: row.field_type,
        displayOrder: row.display_order
      });
      map.set(familyKey, list);
    }
    return map;
  } catch (err) {
    if (err?.code === "42P01") return new Map();
    throw err;
  }
}

function mapInventoryRow(row, extras = {}) {
  const dbId = String(row.id);
  const clientId = row.client_id;
  const name = row.display_name || row.row_name || row.item_key || "—";
  const data = extras.data && typeof extras.data === "object" ? extras.data : null;
  const customFields = Array.isArray(extras.customFields) ? extras.customFields : [];
  const serial = extras.isCustom ? pickCustomSerial(data || {}, customFields) || row.serial || "" : row.serial || "";
  const ip = extras.isCustom ? pickCustomIp(data || {}, customFields) || row.ip || "" : row.ip || "";
  const stubRaw = {
    type: row.device_type || "",
    typeServer: row.device_type || "",
    fournisseur: row.fournisseur || "",
    marque: row.manufacturer || "",
    fabricant: row.manufacturer || "",
    manufacturer: row.manufacturer || "",
    numeroSerie: serial,
    serial,
    ip,
    modele: row.model || "",
    model: row.model || "",
    site: row.location || "",
    location: row.location || "",
    adresseMac: row.mac || "",
    mac: row.mac || "",
    ...(data || {})
  };
  return {
    id: `${extras.family || "device"}:${clientId}:${dbId}`,
    dbId,
    clientId,
    clientName: row.client_name || String(clientId),
    type: extras.type,
    family: extras.family,
    familyKey: extras.familyKey || null,
    familyLabel: extras.familyLabel || extras.type,
    isCustom: Boolean(extras.isCustom),
    name,
    ip,
    serial,
    location: row.location || "",
    model: row.model || "",
    mac: row.mac || "",
    manufacturer: row.manufacturer || "",
    deviceType: row.device_type || extras.deviceType || "",
    typeServer: row.device_type || extras.typeServer || "",
    fournisseur: row.fournisseur || extras.fournisseur || "",
    familyIcon: extras.familyIcon || row.family_icon || null,
    data: data || undefined,
    fields: data || undefined,
    customFields: extras.isCustom ? customFields : undefined,
    customFamily: extras.isCustom
      ? {
          familyKey: extras.familyKey || null,
          label: extras.familyLabel || extras.type,
          icon: extras.familyIcon || row.family_icon || "mdi:devices",
          fields: customFields
        }
      : undefined,
    rawData: extras.rawData || {
      ...stubRaw,
      ...(data ? { data } : {})
    },
    is_active: parseEquipmentActiveFlag(
      data?.actif,
      data?.active,
      data?.isActive,
      data?.is_active,
      row.is_active
    ) !== false,
    createdAt: row.created_at || row.createdAt || null,
    created_at: row.created_at || row.createdAt || null
  };
}

async function fetchCustomEquipmentRows() {
  try {
    const result = await pool.query(`
      SELECT
        ce.id,
        ce.client_id,
        c.name AS client_name,
        ce.family_key,
        ce.name AS row_name,
        ce.item_key,
        ce.is_active,
        COALESCE(NULLIF(TRIM(fd.label), ''), ce.family_key) AS family_label,
        COALESCE(NULLIF(TRIM(fd.icon), ''), 'mdi:devices') AS family_icon,
        COALESCE(
          NULLIF(TRIM(ce.data->>'nom'), ''),
          NULLIF(TRIM(ce.data->>'name'), ''),
          NULLIF(TRIM(ce.name), ''),
          NULLIF(TRIM(ce.item_key), ''),
          '—'
        ) AS display_name,
        COALESCE(NULLIF(TRIM(ce.data->>'ip'), ''), '') AS ip,
        COALESCE(
          NULLIF(TRIM(ce.data->>'numeroSerie'), ''),
          NULLIF(TRIM(ce.data->>'serial'), ''),
          NULLIF(TRIM(ce.data->>'sn'), ''),
          ''
        ) AS serial,
        COALESCE(
          NULLIF(TRIM(ce.data->>'site'), ''),
          NULLIF(TRIM(ce.data->>'location'), ''),
          NULLIF(TRIM(ce.data->>'emplacement'), ''),
          ''
        ) AS location,
        COALESCE(
          NULLIF(TRIM(ce.data->>'modele'), ''),
          NULLIF(TRIM(ce.data->>'model'), ''),
          ''
        ) AS model,
        COALESCE(
          NULLIF(TRIM(ce.data->>'adresseMac'), ''),
          NULLIF(TRIM(ce.data->>'mac'), ''),
          ''
        ) AS mac,
        COALESCE(
          NULLIF(TRIM(ce.data->>'marque'), ''),
          NULLIF(TRIM(ce.data->>'fabricant'), ''),
          NULLIF(TRIM(ce.data->>'manufacturer'), ''),
          ''
        ) AS manufacturer,
        ce.created_at,
        ce.data AS data_json
      FROM v_b_clients_m_custom_equipment ce
      INNER JOIN v_b_clients c ON c.id = ce.client_id
      LEFT JOIN v_b_equipment_family_definitions fd ON fd.family_key = ce.family_key
      WHERE ce.client_id IS NOT NULL
    `);
    const familyKeys = [...new Set(result.rows.map(row => String(row.family_key || "").trim()).filter(Boolean))];
    const fieldsByFamily = await loadCustomFieldsByFamilyKeys(familyKeys);
    return result.rows.map(row => {
      const familyKey = String(row.family_key || "custom");
      const familyLabel = row.family_label || familyKey;
      const data = parseJsonObject(row.data_json);
      const customFields = normalizeCustomFields(fieldsByFamily.get(familyKey) || [], data);
      return mapInventoryRow(row, {
        type: `Custom:${familyKey}`,
        family: `custom:${familyKey}`,
        familyKey,
        familyLabel,
        familyIcon: row.family_icon || "mdi:devices",
        isCustom: true,
        data,
        customFields
      });
    });
  } catch (err) {
    if (err?.code === "42P01") {
      console.warn("[equipment-inventory] custom equipment table missing");
      return [];
    }
    throw err;
  }
}

async function fetchVideoSurveillanceRows() {
  for (const table of VIDEO_SURVEILLANCE_TABLES) {
    try {
      const result = await pool.query(`
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
          e.created_at
        FROM ${table} e
        INNER JOIN v_b_clients c ON c.id = e.client_id
        WHERE e.client_id IS NOT NULL
      `);
      return result.rows.map(row => mapInventoryRow(row, {
        type: "Videosurveillance",
        family: "videosurveillance",
        familyLabel: "Videosurveillance"
      }));
    } catch (err) {
      if (err?.code === "42P01") continue;
      throw err;
    }
  }
  return [];
}

function sortInventory(items) {
  items.sort((a, b) => {
    const byClient = String(a.clientName || "").localeCompare(String(b.clientName || ""), "fr", {
      sensitivity: "base"
    });
    if (byClient !== 0) return byClient;
    const byType = String(a.familyLabel || a.type || "").localeCompare(String(b.familyLabel || b.type || ""), "fr", {
      sensitivity: "base"
    });
    if (byType !== 0) return byType;
    return String(a.name || "").localeCompare(String(b.name || ""), "fr", {
      sensitivity: "base"
    });
  });
  return items;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STANDARD_TABLES = Object.fromEntries(PURGE_HARDWARE_FAMILIES.map(row => [row.family, row.table]));
STANDARD_TABLES.stockage = "v_b_clients_m_stockage";

function isUuid(value) {
  return UUID_RE.test(String(value || "").trim());
}

function alertFamilyForItem(item) {
  return resolveEquipmentFamilyKey(item?.type) || String(item?.family || "").trim() || null;
}

function settingsLookupKeys(item) {
  const clientId = String(item?.clientId ?? "");
  const dbId = String(item?.dbId || "").trim().toLowerCase();
  const keys = [];
  const families = [alertFamilyForItem(item), item?.family].map(v => String(v || "").trim().toLowerCase()).filter(Boolean);
  for (const family of [...new Set(families)]) {
    keys.push(`${clientId}|${dbId}|${family}`);
  }
  return keys;
}

async function queryOrEmpty(sql, params) {
  try {
    return await pool.query(sql, params);
  } catch (err) {
    // 42P01 = undefined table, 42703 = undefined column (ex. checkmk_* absentes)
    if (err?.code === "42P01" || err?.code === "42703") return { rows: [] };
    throw err;
  }
}

async function loadAlertSettingsByKey(ids) {
  const uuids = [...new Set((Array.isArray(ids) ? ids : []).filter(isUuid))];
  if (!uuids.length) return new Map();
  const result = await queryOrEmpty(
    `SELECT client_id, equipment_id, equipment_family, alerts_enabled, suspension_type, suspended_until
     FROM v_b_equipment_monitoring_alerts
     WHERE equipment_id = ANY($1::uuid[])`,
    [uuids]
  );
  const map = new Map();
  for (const row of result.rows) {
    const settings = {
      alertsEnabled: Boolean(row.alerts_enabled),
      suspensionType: row.suspension_type,
      suspendedUntil: row.suspended_until
    };
    const key = `${row.client_id}|${String(row.equipment_id).toLowerCase()}|${String(row.equipment_family || "").toLowerCase()}`;
    map.set(key, settings);
  }
  return map;
}

async function loadAlertCountsLastMonth(ids) {
  const tokens = [...new Set((Array.isArray(ids) ? ids : []).map(id => String(id || "").trim().toLowerCase()).filter(Boolean))];
  if (!tokens.length) return new Map();
  const map = new Map();
  const addRows = rows => {
    for (const row of rows || []) {
      const key = String(row.equipment_id || "").toLowerCase();
      if (!key) continue;
      map.set(key, (map.get(key) || 0) + (Number(row.n) || 0));
    }
  };
  const supervision = await queryOrEmpty(
    `SELECT TRIM(equipment_id) AS equipment_id, COUNT(*)::int AS n
     FROM v_b_supervision_alerts
     WHERE created_at >= NOW() - INTERVAL '30 days'
       AND NULLIF(TRIM(equipment_id), '') IS NOT NULL
       AND LOWER(TRIM(equipment_id)) = ANY($1::text[])
     GROUP BY TRIM(equipment_id)`,
    [tokens]
  );
  addRows(supervision.rows);
  const monitoring = await queryOrEmpty(
    `SELECT equipment_id::text AS equipment_id, COUNT(*)::int AS n
     FROM v_b_monitoring_events
     WHERE created_at >= NOW() - INTERVAL '30 days'
       AND equipment_id IS NOT NULL
       AND LOWER(equipment_id::text) = ANY($1::text[])
     GROUP BY equipment_id`,
    [tokens]
  );
  addRows(monitoring.rows);
  return map;
}

async function loadCheckmkMonitoringByIds(ids) {
  const uuids = [...new Set((Array.isArray(ids) ? ids : []).filter(isUuid))];
  if (!uuids.length) return new Map();
  const result = await queryOrEmpty(
    `SELECT equipment_id::text AS equipment_id, checkmk_host_name, monitoring_data, last_synced_at
     FROM v_b_equipment_checkmk_monitoring
     WHERE equipment_id = ANY($1::uuid[])`,
    [uuids]
  );
  const map = new Map();
  for (const row of result.rows || []) {
    const key = String(row.equipment_id || "").toLowerCase();
    if (!key) continue;
    map.set(key, row);
  }
  return map;
}

/**
 * Mapping CheckMK stocké sur l'équipement (colonnes / data), indépendamment
 * de la dernière synchronisation monitoring.
 */
async function loadCheckmkMappingsByIds(ids) {
  const uuids = [...new Set((Array.isArray(ids) ? ids : []).filter(isUuid))];
  if (!uuids.length) return new Map();
  const map = new Map();
  const tables = [...new Set(PURGE_HARDWARE_FAMILIES.map(row => row.table).filter(Boolean))];

  const ingestRows = rows => {
    for (const row of rows || []) {
      const key = String(row.equipment_id || "").toLowerCase();
      const host = String(row.checkmk_host_name || "").trim();
      if (!key || !host || map.has(key)) continue;
      map.set(key, {
        checkmk_host_name: host,
        checkmk_site: row.checkmk_site || null,
        checkmk_service_name: row.checkmk_service_name || null
      });
    }
  };

  await Promise.all(
    tables.map(async table => {
      // Prefer dedicated CheckMK columns when present; fall back to data JSON.
      let withCols;
      try {
        withCols = await pool.query(
          `SELECT id::text AS equipment_id,
                  NULLIF(TRIM(COALESCE(
                    checkmk_host_name,
                    data->>'checkmk_host_name',
                    data->'checkmkMapping'->>'checkmk_host_name',
                    ''
                  )), '') AS checkmk_host_name,
                  NULLIF(TRIM(COALESCE(
                    checkmk_site,
                    data->>'checkmk_site',
                    data->'checkmkMapping'->>'checkmk_site',
                    ''
                  )), '') AS checkmk_site,
                  NULLIF(TRIM(COALESCE(
                    checkmk_service_name,
                    data->>'checkmk_service_name',
                    data->'checkmkMapping'->>'checkmk_service_name',
                    ''
                  )), '') AS checkmk_service_name
             FROM ${table}
            WHERE id = ANY($1::uuid[])
              AND NULLIF(TRIM(COALESCE(
                checkmk_host_name,
                data->>'checkmk_host_name',
                data->'checkmkMapping'->>'checkmk_host_name',
                ''
              )), '') IS NOT NULL`,
          [uuids]
        );
      } catch (err) {
        if (err?.code !== "42P01" && err?.code !== "42703") throw err;
        withCols = null;
      }
      if (withCols) {
        ingestRows(withCols.rows);
        return;
      }
      const fromData = await queryOrEmpty(
        `SELECT id::text AS equipment_id,
                NULLIF(TRIM(COALESCE(data->>'checkmk_host_name', data->'checkmkMapping'->>'checkmk_host_name', '')), '') AS checkmk_host_name,
                NULLIF(TRIM(COALESCE(data->>'checkmk_site', data->'checkmkMapping'->>'checkmk_site', '')), '') AS checkmk_site,
                NULLIF(TRIM(COALESCE(data->>'checkmk_service_name', data->'checkmkMapping'->>'checkmk_service_name', '')), '') AS checkmk_service_name
           FROM ${table}
          WHERE id = ANY($1::uuid[])
            AND NULLIF(TRIM(COALESCE(data->>'checkmk_host_name', data->'checkmkMapping'->>'checkmk_host_name', '')), '') IS NOT NULL`,
        [uuids]
      );
      ingestRows(fromData?.rows);
    })
  );
  return map;
}

/**
 * Aligné sur EnterpriseDetailPage / renderSupervisionDot :
 * - non mappé → inactive
 * - mappé sans sync (ou no_data) → ok
 * - warning / critical depuis les données synchronisées
 */
function resolveSupervisionStatus(mkRow, isMapped) {
  if (!isMapped) return "inactive";
  if (!mkRow) return "ok";
  const summary = computeMonitoringSummary(mkRow.monitoring_data, mkRow.last_synced_at);
  const status = String(summary?.status || "").toLowerCase();
  if (status === "critical") return "critical";
  if (status === "warning") return "warning";
  return "ok";
}

function attachAlertFields(item, settingsMap, nativeCountMap, checkmkMap, mappingMap) {
  let settings = null;
  for (const key of settingsLookupKeys(item)) {
    if (settingsMap.has(key)) {
      settings = settingsMap.get(key);
      break;
    }
  }
  const alertStatus = resolveAlertStatusFromSettings(settings);
  const dbId = String(item?.dbId || "").trim().toLowerCase();
  const mkRow = dbId ? checkmkMap.get(dbId) : null;
  const mapping = dbId ? mappingMap.get(dbId) : null;
  const mappedHost = String(
    mapping?.checkmk_host_name || mkRow?.checkmk_host_name || ""
  ).trim();
  const isMapped = Boolean(mappedHost);
  const supervisionStatus = resolveSupervisionStatus(mkRow, isMapped);
  const supervisionMapped = supervisionStatus !== "inactive";
  const nativeLastMonth = dbId ? nativeCountMap.get(dbId) || 0 : 0;
  const checkmkLastMonth = mkRow ? countCheckmkHistoryLastDays(mkRow.monitoring_data, 30).total : 0;
  return {
    ...item,
    alertStatus,
    alertsEnabled: Boolean(settings?.alertsEnabled),
    alertSuspended: isAlertSuspensionActive(settings),
    supervisionStatus,
    supervisionMapped,
    checkmkMapping: isMapped
      ? {
          checkmk_host_name: mappedHost,
          checkmk_site: mapping?.checkmk_site || mkRow?.checkmk_site || null,
          checkmk_service_name: mapping?.checkmk_service_name || mkRow?.checkmk_service_name || null,
          is_active: true
        }
      : null,
    alertsNativeLastMonth: nativeLastMonth,
    alertsSupervisionLastMonth: checkmkLastMonth,
    alertsLastMonth: nativeLastMonth + checkmkLastMonth
  };
}

async function enrichInventoryWithAlerts(items) {
  const list = Array.isArray(items) ? items : [];
  const ids = list.map(item => item.dbId).filter(Boolean);
  const [settingsMap, nativeCountMap, checkmkMap, mappingMap] = await Promise.all([
    loadAlertSettingsByKey(ids),
    loadAlertCountsLastMonth(ids),
    loadCheckmkMonitoringByIds(ids),
    loadCheckmkMappingsByIds(ids)
  ]);
  return list.map(item => attachAlertFields(item, settingsMap, nativeCountMap, checkmkMap, mappingMap));
}

function resolveStandardTable(item) {
  const family = String(item?.family || "").toLowerCase();
  if (STANDARD_TABLES[family]) return STANDARD_TABLES[family];
  const typeFamily = resolveEquipmentFamilyKey(item?.type);
  if (typeFamily === "stockage") return STANDARD_TABLES.nas;
  if (typeFamily && STANDARD_TABLES[typeFamily]) return STANDARD_TABLES[typeFamily];
  return null;
}

async function patchStandardEquipment(item, { isActive, location }) {
  const table = resolveStandardTable(item);
  if (!table || !isUuid(item.dbId) || item.clientId == null) return false;
  const sets = ["updated_at = NOW()"];
  const values = [];
  if (typeof isActive === "boolean") {
    values.push(isActive);
    sets.push(`is_active = $${values.length}`);
  }
  if (location !== undefined) {
    values.push(String(location || ""));
    sets.push(`data = jsonb_set(jsonb_set(jsonb_set(COALESCE(data, '{}'::jsonb), '{site}', to_jsonb($${values.length}::text), true), '{location}', to_jsonb($${values.length}::text), true), '{emplacement}', to_jsonb($${values.length}::text), true)`);
  }
  if (values.length === 0) return true;
  values.push(item.dbId, item.clientId);
  const result = await pool.query(
    `UPDATE ${table} SET ${sets.join(", ")} WHERE id = $${values.length - 1}::uuid AND client_id = $${values.length} RETURNING id`,
    values
  );
  return result.rows.length > 0;
}

async function patchCustomEquipment(item, { isActive, location }) {
  const familyKey = String(item?.familyKey || "").trim();
  if (!familyKey || !isUuid(item.dbId) || item.clientId == null) return false;
  const existing = await pool.query(
    `SELECT data, is_active FROM v_b_clients_m_custom_equipment
     WHERE id = $1::uuid AND client_id = $2 AND family_key = $3 LIMIT 1`,
    [item.dbId, item.clientId, familyKey]
  );
  if (!existing.rows.length) return false;
  const current = existing.rows[0];
  let data = current.data;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      data = {};
    }
  }
  data = data && typeof data === "object" ? { ...data } : {};
  if (location !== undefined) {
    const loc = String(location || "");
    data.site = loc;
    data.location = loc;
    data.emplacement = loc;
    data.lieu = loc;
    data.localisation = loc;
  }
  const nextActive = typeof isActive === "boolean" ? isActive : current.is_active !== false;
  data.actif = nextActive;
  const result = await pool.query(
    `UPDATE v_b_clients_m_custom_equipment
     SET data = $4::jsonb, is_active = $5, updated_at = NOW()
     WHERE id = $1::uuid AND client_id = $2 AND family_key = $3
     RETURNING id`,
    [item.dbId, item.clientId, familyKey, JSON.stringify(data), nextActive]
  );
  return result.rows.length > 0;
}

async function patchVideoEquipment(item, { isActive, location }) {
  if (!isUuid(item.dbId) || item.clientId == null) return false;
  for (const table of VIDEO_SURVEILLANCE_TABLES) {
    try {
      const sets = ["updated_at = NOW()"];
      const values = [];
      if (typeof isActive === "boolean") {
        values.push(isActive);
        sets.push(`is_active = $${values.length}`);
      }
      if (location !== undefined) {
        values.push(String(location || ""));
        sets.push(`data = jsonb_set(jsonb_set(jsonb_set(COALESCE(data, '{}'::jsonb), '{site}', to_jsonb($${values.length}::text), true), '{location}', to_jsonb($${values.length}::text), true), '{emplacement}', to_jsonb($${values.length}::text), true)`);
      }
      if (values.length === 0) return true;
      values.push(item.dbId, item.clientId);
      const result = await pool.query(
        `UPDATE ${table} SET ${sets.join(", ")} WHERE id = $${values.length - 1}::uuid AND client_id = $${values.length} RETURNING id`,
        values
      );
      if (result.rows.length) return true;
    } catch (err) {
      if (err?.code === "42P01") continue;
      throw err;
    }
  }
  return false;
}

async function patchEquipmentFields(item, fields) {
  if (item?.isCustom || String(item?.type || "").startsWith("Custom:")) {
    return patchCustomEquipment(item, fields);
  }
  if (item?.type === "Videosurveillance" || item?.family === "videosurveillance") {
    return patchVideoEquipment(item, fields);
  }
  return patchStandardEquipment(item, fields);
}

function normalizeBulkItem(raw) {
  const dbId = String(raw?.dbId || raw?.id || "").trim();
  const clientId = raw?.clientId != null && raw.clientId !== "" ? Number(raw.clientId) : null;
  if (!isUuid(dbId) || !clientId) return null;
  return {
    id: String(raw?.id || dbId),
    dbId,
    clientId,
    type: raw?.type || null,
    family: raw?.family || null,
    familyKey: raw?.familyKey || null,
    isCustom: Boolean(raw?.isCustom || String(raw?.type || "").startsWith("Custom:")),
    name: raw?.name || null
  };
}

function alertsPayloadFromMode(alerts) {
  if (!alerts || typeof alerts !== "object") return null;
  const mode = String(alerts.mode || "").trim().toLowerCase();
  if (mode === "active") {
    return { suspensionType: "none", alertsEnabled: true };
  }
  if (mode === "disabled") {
    return { suspensionType: "none", alertsEnabled: false };
  }
  if (mode === "temporary" || mode === "permanent") {
    return {
      suspensionType: mode,
      alertsEnabled: true,
      durationMinutes: alerts.durationMinutes,
      reason: alerts.reason || null
    };
  }
  return null;
}

export async function bulkUpdateEquipmentInventory({
  items = [],
  updates = {},
  actorUserId = null
} = {}) {
  const normalized = [];
  const seen = new Set();
  for (const raw of Array.isArray(items) ? items : []) {
    const item = normalizeBulkItem(raw);
    if (!item || seen.has(item.dbId)) continue;
    seen.add(item.dbId);
    normalized.push(item);
    if (normalized.length >= 300) break;
  }
  const wantsActive = Object.prototype.hasOwnProperty.call(updates || {}, "isActive");
  const wantsLocation = Object.prototype.hasOwnProperty.call(updates || {}, "location");
  const alertPatch = alertsPayloadFromMode(updates?.alerts);
  if (!normalized.length) {
    return { updated: 0, failed: [] };
  }
  if (!wantsActive && !wantsLocation && !alertPatch) {
    const err = new Error("No field selected");
    err.status = 400;
    throw err;
  }
  const fieldPatch = {
    isActive: wantsActive ? Boolean(updates.isActive) : undefined,
    location: wantsLocation ? String(updates.location ?? "") : undefined
  };
  let updated = 0;
  const failed = [];
  for (const item of normalized) {
    try {
      if (wantsActive || wantsLocation) {
        const ok = await patchEquipmentFields(item, fieldPatch);
        if (!ok) {
          failed.push({ id: item.id, error: "Equipment not found" });
          continue;
        }
      }
      if (alertPatch) {
        const family = alertFamilyForItem(item);
        if (!family) {
          failed.push({ id: item.id, error: "Unknown equipment family" });
          continue;
        }
        await applyEquipmentAlertSettings({
          clientId: item.clientId,
          equipmentId: item.dbId,
          equipmentFamily: family,
          equipmentName: item.name,
          ...alertPatch,
          suspendedBy: actorUserId
        });
      }
      updated += 1;
    } catch (err) {
      failed.push({ id: item.id, error: err.message || "Update failed", code: err.code || null });
    }
  }
  return { updated, failed };
}

/**
 * Full device inventory across all clients: standard hardware, custom families, cameras.
 */
export async function fetchEquipmentInventoryList() {
  const [standard, custom, video, extensionsByKey] = await Promise.all([
    fetchStandardHardwarePurgeList(),
    fetchCustomEquipmentRows(),
    fetchVideoSurveillanceRows(),
    listSystemFamilyExtensionsByKey().catch(() => ({}))
  ]);
  const items = [
    ...standard.map(row => {
      const familyKey = canonicalizeSystemFamilyKey(row.type);
      const systemExtensionFields = familyKey ? extensionsByKey[familyKey] || [] : [];
      return {
        ...row,
        familyLabel: row.type,
        familyKey: familyKey || null,
        isCustom: false,
        systemExtensionFields
      };
    }),
    ...custom,
    ...video
  ];
  return enrichInventoryWithAlerts(sortInventory(items));
}
