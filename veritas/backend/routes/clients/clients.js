import express from 'express';
import { randomUUID } from 'crypto';
import { pool } from '../../database/db.js';
import { transformClientModulesToFrontend } from '../../utils/transformClientModules.js';
import { buildEquipmentLogQuery, logEquipmentCreated, logEquipmentDeleted, logEquipmentUpdated } from '../../utils/equipmentLogs.js';
import { checkSslCertificate, isSslCheckStale, resolveSslCheckIntervalHours } from '../../utils/sslCertificateChecker.js';
import verifyJWT from '../../middleware/auth.js';
import { dispatchNotificationEvent } from "../../services/notificationDispatcher.js";
import { assertCommunityClientsLimit, assertCommunitySitesLimit, assertCommunityContactsLimit, sendCommunityLimitError } from '../../utils/communityLimits.js';
import { registerClientMetaRoutes } from './clientMeta.js';
import { attachDeletionSummary, fetchDeletionSummaryByClientId, forceDeleteClientWithLinkedItems, getClientDeletionStatus } from '../../utils/clientDeletionGuard.js';
import { createClientCustomEquipment, deleteClientCustomEquipment, listClientCustomEquipment, listEquipmentFamilies, updateClientCustomEquipment } from '../../utils/equipmentFamilies.js';
import { isCommunity } from '../../utils/edition.js';
import { requireProForClientInfra } from '../../middleware/clientInfraRoutes.js';
import { requirePermission, requireAnyPermission } from '../../middleware/permissions.js';
import { attachEquipmentCounts, fetchEquipmentCountsByClientId } from '../../utils/equipmentCountsByClient.js';
import { fetchEquipmentPurgeList } from '../../utils/equipmentPurgeList.js';
import { fetchEquipmentInventoryList, bulkUpdateEquipmentInventory } from '../../utils/equipmentInventoryList.js';
import { fetchEquipmentFleetList } from '../../utils/equipmentFleetList.js';
import { fetchEquipmentFleetIssues } from '../../utils/equipmentFleetIssues.js';
import { userHasAllPermissions } from '../../services/permissionService.js';
import { addMembership, fetchPrimaryContactNamesByClientId, sqlContactLinkedToClientAsync, attachMembershipsToContacts } from '../../services/contactClientLinks.js';
import { propagateClientSiteRenames } from '../../services/propagateClientSiteRenames.js';
import { pruneOrphanSiteLinksForClient } from '../../services/contactSiteLinks.js';
const router = express.Router();
router.use(requireProForClientInfra);
router.use(verifyJWT);

/** PUT company: edit fields vs sites-only updates use distinct matrix keys. */
async function requireClientUpdatePermissions(req, res, next) {
  try {
    const body = req.body || {};
    const siteOnlyKeys = new Set(["sites"]);
    const keys = Object.keys(body).filter(k => body[k] !== undefined);
    const hasSites = keys.includes("sites");
    const hasOther = keys.some(k => !siteOnlyKeys.has(k));
    const needed = [];
    if (hasSites) needed.push("clients_detail.sites");
    if (hasOther || !hasSites) needed.push("clients_detail.edit");
    if (await userHasAllPermissions(req.user, needed)) return next();
    return res.status(403).json({
      error: "You do not have permission to perform this action.",
      code: "PERMISSION_DENIED"
    });
  } catch (err) {
    console.error("[permissions] Client update check failed:", err.message);
    return res.status(500).json({
      error: "Permission check failed."
    });
  }
}
function normalizeClientNumber(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}
function normalizeClientStatut(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "actif";
  if (raw.includes("inact")) return "inactive";
  if (raw.includes("act")) return "actif";
  return "actif";
}
async function fetchTagsByClientId() {
  const byClientId = {};
  try {
    const result = await pool.query(`
      SELECT l.client_id::text AS client_id,
             t.id,
             t.label,
             t.color
      FROM v_b_client_tag_links l
      JOIN v_b_client_tags t ON t.id = l.tag_id
      ORDER BY t.label ASC
    `);
    for (const row of result.rows) {
      const clientId = String(row.client_id);
      if (!byClientId[clientId]) {
        byClientId[clientId] = [];
      }
      byClientId[clientId].push({
        id: row.id,
        label: row.label,
        color: row.color
      });
    }
  } catch (err) {
    if (err.code === "42P01") {
      console.warn("[client-tags] tables missing, tags skipped");
      return byClientId;
    }
    throw err;
  }
  return byClientId;
}
const attachClientTags = (clients, tagsByClientId = {}) => clients.map(client => ({
  ...client,
  tags: tagsByClientId[String(client.id)] || []
}));
async function fetchPrimaryContactsByClientId() {
  return fetchPrimaryContactNamesByClientId();
}
const attachPrimaryContacts = (clients, primaryContactsByClientId = {}) => clients.map(client => ({
  ...client,
  primaryContactName: primaryContactsByClientId[String(client.id)] || null
}));
const enrichClientsListPayload = async clients => {
  const [countsByClientId, tagsByClientId, deletionByClientId, primaryContactsByClientId] = await Promise.all([fetchEquipmentCountsByClientId(), fetchTagsByClientId(), fetchDeletionSummaryByClientId(), fetchPrimaryContactsByClientId()]);
  return attachDeletionSummary(attachPrimaryContacts(attachClientTags(attachEquipmentCounts(clients, countsByClientId), tagsByClientId), primaryContactsByClientId), deletionByClientId);
};
const invalidateClientsListCache = () => {};
function firstCheckmkString(...values) {
  for (const value of values) {
    if (value == null || value === false) continue;
    const text = String(value).trim();
    if (text && text !== "null" && text !== "undefined") return text;
  }
  return null;
}

function coalesceCheckmkFromRow(row, parsedData = {}) {
  const data = parsedData && typeof parsedData === "object" ? parsedData : {};
  const mapping = data.checkmkMapping && typeof data.checkmkMapping === "object" ? data.checkmkMapping : {};
  return {
    checkmk_host_name: firstCheckmkString(row?.checkmk_host_name, data.checkmk_host_name, mapping.checkmk_host_name, data.checkmkHostName),
    checkmk_site: firstCheckmkString(row?.checkmk_site, data.checkmk_site, mapping.checkmk_site),
    checkmk_service_name: firstCheckmkString(row?.checkmk_service_name, data.checkmk_service_name, mapping.checkmk_service_name)
  };
}

function coalesceHycuFromRow(row, parsedData = {}) {
  const data = parsedData && typeof parsedData === "object" ? parsedData : {};
  const mapping = data.hycuMapping && typeof data.hycuMapping === "object" ? data.hycuMapping : {};
  return {
    hycu_job_uuid: firstCheckmkString(row?.hycu_job_uuid, data.hycu_job_uuid, mapping.hycu_job_uuid, mapping.uuid, data.hycuJobUuid),
    hycu_job_name: firstCheckmkString(row?.hycu_job_name, data.hycu_job_name, mapping.hycu_job_name, mapping.name, data.hycuJobName)
  };
}

function applyCheckmkCoalesce(row) {
  const checkmk = coalesceCheckmkFromRow(row, row.data);
  row.checkmk_host_name = checkmk.checkmk_host_name;
  row.checkmk_site = checkmk.checkmk_site;
  row.checkmk_service_name = checkmk.checkmk_service_name;
  const hycu = coalesceHycuFromRow(row, row.data);
  row.hycu_job_uuid = hycu.hycu_job_uuid;
  row.hycu_job_name = hycu.hycu_job_name;
  return row;
}

const MODULE_TABLES_WITHOUT_CHECKMK = new Set([
  "v_b_clients_m_ndd",
  "v_b_clients_m_ssl",
  "v_b_clients_m_licences",
  "v_b_clients_m_antivirus",
  "v_b_clients_m_antispam",
  "v_b_clients_m_o365",
  "v_b_clients_m_internet",
  "v_b_clients_m_ordinateurs",
  "v_b_clients_m_custom_equipment"
]);
async function updateModuleRowPreservingCheckmk(db, table, {
  item_key,
  name,
  data,
  is_active,
  itemId,
  clientId,
  item
}) {
  const checkmk = coalesceCheckmkFromRow(item || {}, data);
  const hycu = coalesceHycuFromRow(item || {}, data);
  let payload = data;
  if (data && typeof data === "object" && (checkmk.checkmk_host_name || data.checkmk_host_name || hycu.hycu_job_uuid || data.hycu_job_uuid)) {
    payload = {
      ...data,
      checkmk_host_name: checkmk.checkmk_host_name || data.checkmk_host_name || null,
      checkmk_site: checkmk.checkmk_site || data.checkmk_site || null,
      checkmk_service_name: checkmk.checkmk_service_name || data.checkmk_service_name || null,
      hycu_job_uuid: hycu.hycu_job_uuid || data.hycu_job_uuid || null,
      hycu_job_name: hycu.hycu_job_name || data.hycu_job_name || null
    };
  }
  const baseParams = [item_key || name || null, name || item_key || null, payload || null, is_active !== false, itemId, clientId];
  const updateWithoutCheckmk = () => db.query(`UPDATE ${table}
     SET item_key = $1, name = $2, data = $3, is_active = $4, updated_at = NOW()
     WHERE id = $5 AND client_id = $6
     RETURNING *`, baseParams);
  // Tables without checkmk_* columns must skip that UPDATE: a failed query aborts
  // the surrounding transaction, so a catch/retry without SAVEPOINT still fails.
  if (MODULE_TABLES_WITHOUT_CHECKMK.has(table)) {
    return updateWithoutCheckmk();
  }
  const savepoint = "sp_module_checkmk_update";
  const isSaveTable = table === "v_b_clients_m_save";
  try {
    await db.query(`SAVEPOINT ${savepoint}`);
    const result = isSaveTable
      ? await db.query(`UPDATE ${table}
       SET item_key = $1, name = $2, data = $3, is_active = $4, updated_at = NOW(),
           checkmk_host_name = COALESCE($7::varchar, checkmk_host_name),
           checkmk_site = COALESCE($8::varchar, checkmk_site),
           checkmk_service_name = COALESCE($9::varchar, checkmk_service_name),
           hycu_job_uuid = COALESCE($10::text, hycu_job_uuid),
           hycu_job_name = COALESCE($11::text, hycu_job_name)
       WHERE id = $5 AND client_id = $6
       RETURNING *`, [...baseParams, checkmk.checkmk_host_name, checkmk.checkmk_site, checkmk.checkmk_service_name, hycu.hycu_job_uuid, hycu.hycu_job_name])
      : await db.query(`UPDATE ${table}
       SET item_key = $1, name = $2, data = $3, is_active = $4, updated_at = NOW(),
           checkmk_host_name = COALESCE($7::varchar, checkmk_host_name),
           checkmk_site = COALESCE($8::varchar, checkmk_site),
           checkmk_service_name = COALESCE($9::varchar, checkmk_service_name)
       WHERE id = $5 AND client_id = $6
       RETURNING *`, [...baseParams, checkmk.checkmk_host_name, checkmk.checkmk_site, checkmk.checkmk_service_name]);
    await db.query(`RELEASE SAVEPOINT ${savepoint}`);
    return result;
  } catch (err) {
    try {
      await db.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
    } catch {
      // ignore — transaction may already be unusable
    }
    if (err.code !== "42703") throw err;
    // Fallback without HYCU columns if migration not applied yet.
    if (isSaveTable) {
      try {
        await db.query(`SAVEPOINT ${savepoint}`);
        const result = await db.query(`UPDATE ${table}
       SET item_key = $1, name = $2, data = $3, is_active = $4, updated_at = NOW(),
           checkmk_host_name = COALESCE($7::varchar, checkmk_host_name),
           checkmk_site = COALESCE($8::varchar, checkmk_site),
           checkmk_service_name = COALESCE($9::varchar, checkmk_service_name)
       WHERE id = $5 AND client_id = $6
       RETURNING *`, [...baseParams, checkmk.checkmk_host_name, checkmk.checkmk_site, checkmk.checkmk_service_name]);
        await db.query(`RELEASE SAVEPOINT ${savepoint}`);
        return result;
      } catch (inner) {
        try {
          await db.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
        } catch {
          // ignore
        }
        if (inner.code !== "42703") throw inner;
      }
    }
    return updateWithoutCheckmk();
  }
}

const MODULE_TABLES = {
  internet: "v_b_clients_m_internet",
  servers: "v_b_clients_m_servers",
  stockage: "v_b_clients_m_stockage",
  firewall: "v_b_clients_m_firewall",
  switch: "v_b_clients_m_switch",
  wifi: "v_b_clients_m_wifi",
  alimentation: "v_b_clients_m_alimentation",
  routeur: "v_b_clients_m_routeur",
  toip: "v_b_clients_m_toip",
  save: "v_b_clients_m_save",
  antivirus: "v_b_clients_m_antivirus",
  antispam: "v_b_clients_m_antispam",
  ndd: "v_b_clients_m_ndd",
  ssl: "v_b_clients_m_ssl",
  licences: "v_b_clients_m_licences",
  o365: "v_b_clients_m_o365",
  ordinateurs: "v_b_clients_m_ordinateurs"
};
async function resolveNumericClientId(id) {
  let clientId = id;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(String(id))) {
    const clientResult = await pool.query("SELECT id FROM v_b_clients WHERE id::text = $1", [id]);
    if (clientResult.rows.length === 0) return null;
    clientId = clientResult.rows[0].id;
  }
  clientId = parseInt(clientId, 10);
  if (Number.isNaN(clientId)) return null;
  return clientId;
}
function mapSslCertificateRow(row) {
  const data = row.data && typeof row.data === "object" ? row.data : {};
  const hostname = data.hostname || data.host || row.name || row.item_key || "—";
  const checkIntervalHours = resolveSslCheckIntervalHours(data);
  let nextCheckAt = null;
  if (data.lastChecked) {
    const last = new Date(data.lastChecked);
    if (!Number.isNaN(last.getTime())) {
      nextCheckAt = new Date(last.getTime() + checkIntervalHours * 3600000).toISOString();
    }
  }
  return {
    id: row.id,
    client_id: row.client_id,
    item_key: row.item_key,
    hostname,
    port: data.port || 443,
    subject: data.subject || null,
    subjectCN: data.subjectCN || null,
    subjectO: data.subjectO || null,
    issuer: data.issuer || null,
    issuerCN: data.issuerCN || null,
    issuerO: data.issuerO || null,
    expiration: data.expiration || null,
    daysRemaining: data.daysRemaining ?? null,
    validFrom: data.validFrom || null,
    lastChecked: data.lastChecked || null,
    nextCheckAt,
    checkIntervalHours,
    serialNumber: data.serialNumber || null,
    fingerprint: data.fingerprint || null,
    subjectAltNames: data.subjectAltNames || null,
    protocol: data.protocol || null,
    authorized: data.authorized ?? null,
    authorizationError: data.authorizationError || null,
    error: data.error || null,
    valid: data.valid !== false && !data.error,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
async function checkAndPersistSslRow(row) {
  const data = row.data && typeof row.data === "object" ? row.data : {};
  const hostname = data.hostname || data.host || row.name || row.item_key;
  const port = Number(data.port) || 443;
  if (!hostname) return null;
  let payload;
  try {
    payload = await checkSslCertificate(hostname, port);
  } catch (error) {
    payload = {
      hostname,
      port,
      valid: false,
      error: error.message || "Verification not possible",
      lastChecked: new Date().toISOString()
    };
  }
  const merged = {
    ...data,
    ...payload
  };
  if (data.checkIntervalHours != null) {
    merged.checkIntervalHours = resolveSslCheckIntervalHours(data);
  }
  const updateResult = await pool.query(`UPDATE v_b_clients_m_ssl
     SET data = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, client_id, item_key, name, data, is_active, created_at, updated_at`, [JSON.stringify(merged), row.id]);
  return updateResult.rows[0] ? mapSslCertificateRow(updateResult.rows[0]) : null;
}
function computeLicenceDaysRemaining(expiration) {
  if (!expiration) return null;
  const expiry = new Date(expiration);
  if (Number.isNaN(expiry.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
}
function mapLicenceRow(row) {
  const data = row.data && typeof row.data === "object" ? row.data : {};
  const nom = String(data.nom || data.name || row.name || row.item_key || "").trim();
  const expiration = data.expiration || null;
  return {
    id: row.id,
    client_id: row.client_id,
    nom,
    name: nom,
    expiration,
    fournisseur: data.fournisseur || data.vendor || null,
    notes: data.notes || data.note || null,
    daysRemaining: computeLicenceDaysRemaining(expiration),
    is_active: row.is_active !== false,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
const CYBER_MODULE_TABLES = {
  antivirus: "v_b_clients_m_antivirus",
  antispam: "v_b_clients_m_antispam",
  save: "v_b_clients_m_save"
};
function parseModuleRowForCyber(row, table) {
  let parsedData = row.data;
  if (row.data && typeof row.data === "string") {
    try {
      parsedData = JSON.parse(row.data);
    } catch {
      parsedData = {};
    }
  } else if (!row.data) {
    parsedData = {};
  }
  const checkmk = coalesceCheckmkFromRow(row, parsedData);
  const hycu = coalesceHycuFromRow(row, parsedData);
  const baseRow = {
    id: row.id,
    item_key: row.item_key,
    name: row.name,
    is_active: row.is_active,
    data: parsedData,
    created_at: row.created_at,
    updated_at: row.updated_at,
    checkmk_host_name: checkmk.checkmk_host_name,
    checkmk_site: checkmk.checkmk_site,
    checkmk_service_name: checkmk.checkmk_service_name,
    hycu_job_uuid: hycu.hycu_job_uuid,
    hycu_job_name: hycu.hycu_job_name
  };
  if (table === "v_b_clients_m_save") {
    const rawDate = row.last_backup_date;
    baseRow.last_backup_date = rawDate != null ? rawDate instanceof Date ? rawDate.toISOString() : String(rawDate) : null;
    baseRow.last_backup_duration = row.last_backup_duration != null ? String(row.last_backup_duration) : null;
    const rawStart = row.last_backup_start;
    baseRow.last_backup_start = rawStart != null ? rawStart instanceof Date ? rawStart.toISOString() : String(rawStart) : null;
  }
  return baseRow;
}
async function queryCyberFamilyRows(pool, table, clientIds) {
  if (!clientIds.length) return [];
  const baseSelect = `SELECT client_id, id, item_key, name, data, is_active, created_at, updated_at, checkmk_host_name, checkmk_site, checkmk_service_name`;
  const saveExtraSelect = table === "v_b_clients_m_save" ? ", last_backup_date, last_backup_duration, last_backup_start, hycu_job_uuid, hycu_job_name" : "";
  try {
    const result = await pool.query(`${baseSelect}${saveExtraSelect}
       FROM ${table}
       WHERE client_id = ANY($1::int[])
       ORDER BY client_id, name NULLS LAST, item_key NULLS LAST`, [clientIds]);
    return result.rows;
  } catch (colErr) {
    if (colErr.code === "42703") {
      const result = await pool.query(`SELECT client_id, id, item_key, name, data, is_active, created_at, updated_at
         FROM ${table}
         WHERE client_id = ANY($1::int[])
         ORDER BY client_id, name NULLS LAST, item_key NULLS LAST`, [clientIds]);
      result.rows.forEach(r => {
        r.checkmk_host_name = null;
        r.checkmk_site = null;
        r.checkmk_service_name = null;
        if (table === "v_b_clients_m_save") {
          r.last_backup_date = null;
          r.last_backup_duration = null;
          r.last_backup_start = null;
          r.hycu_job_uuid = null;
          r.hycu_job_name = null;
        }
      });
      return result.rows;
    }
    if (colErr.code === "42P01") {
      return [];
    }
    throw colErr;
  }
}
const getFieldNameFromUpdate = field => {
  if (!field) return null;
  return field.split('=')[0].trim();
};
const buildChanges = (modifiedFields, valueMap) => modifiedFields.map(field => ({
  field,
  newValue: valueMap[field] !== undefined ? valueMap[field] : null
}));
async function getClientSnapshotForNotification(clientId) {
  const preferredColumns = ["id", "name", "client_number", "email", "phone", "address", "siret", "secteur", "statut", "commercial_id", "contrat", "options", "modules", "sites", "office365_data"];
  try {
    const result = await pool.query(`SELECT ${preferredColumns.join(", ")}
       FROM v_b_clients
       WHERE id::text = $1
       LIMIT 1`, [String(clientId || "")]);
    return result.rows?.[0] || null;
  } catch (error) {
    if (error?.code !== "42703") throw error;
    const columnsResult = await pool.query(`SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'v_b_clients'`);
    const availableColumns = new Set(columnsResult.rows.map(row => String(row.column_name || "").trim()));
    const selectedColumns = preferredColumns.filter(column => availableColumns.has(column));
    if (!selectedColumns.includes("id")) {
      selectedColumns.unshift("id");
    }
    const safeResult = await pool.query(`SELECT ${selectedColumns.join(", ")}
       FROM v_b_clients
       WHERE id::text = $1
       LIMIT 1`, [String(clientId || "")]);
    return safeResult.rows?.[0] || null;
  }
}
function stringifyComparable(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch (_error) {
      return String(value);
    }
  }
  return String(value);
}
function buildNotificationChanges(previousSnapshot = {}, changedFields = [], nextValueMap = {}) {
  const changes = [];
  for (const field of changedFields) {
    const oldValue = previousSnapshot?.[field] ?? null;
    const newValue = nextValueMap?.[field] ?? null;
    if (stringifyComparable(oldValue) === stringifyComparable(newValue)) continue;
    changes.push({
      field,
      oldValue,
      newValue
    });
  }
  return changes;
}
let clientsColumnsCache = null;
async function getClientsAvailableColumns() {
  if (clientsColumnsCache instanceof Set && clientsColumnsCache.size > 0) {
    return clientsColumnsCache;
  }
  const columnsResult = await pool.query(`SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'v_b_clients'`);
  clientsColumnsCache = new Set(columnsResult.rows.map(row => String(row.column_name || "").trim()));
  return clientsColumnsCache;
}
function resolveClientSsidColumn(hasClientColumn) {
  if (hasClientColumn("ssid")) return "ssid";
  if (hasClientColumn("ssids")) return "ssids";
  return null;
}
function parseClientSsidColumnValue(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}
function resolveClientSsidCatalog(client) {
  const fromSsids = parseClientSsidColumnValue(client?.ssids);
  const fromSsid = parseClientSsidColumnValue(client?.ssid);
  return fromSsids.length ? fromSsids : fromSsid;
}
function appendClientSsidUpdate({
  ssid,
  ssids,
  hasClientColumn,
  updateFields,
  updateValues,
  paramIndex
}) {
  if (ssid === undefined && ssids === undefined) return paramIndex;
  const payload = ssids !== undefined ? ssids : ssid;
  const serialized = JSON.stringify(Array.isArray(payload) ? payload : []);
  const columns = ["ssid", "ssids"].filter(column => hasClientColumn(column));
  if (!columns.length) {
    const fallback = resolveClientSsidColumn(hasClientColumn);
    if (!fallback) return paramIndex;
    columns.push(fallback);
  }
  columns.forEach(column => {
    updateFields.push(`${column} = $${paramIndex}`);
    updateValues.push(serialized);
    paramIndex += 1;
  });
  return paramIndex;
}
const CLIENTS_LIST_SELECT_COLUMNS = ["id", "name", "client_number", "address", "siret", "secteur", "statut", "contrat", "options", "modules", "commercial_id", "created_at", "updated_at"];
async function queryClientsListBaseRows() {
  const available = await getClientsAvailableColumns();
  const clientCols = CLIENTS_LIST_SELECT_COLUMNS.filter(col => available.has(col));
  if (!clientCols.includes("id")) {
    clientCols.unshift("id");
  }
  const selectList = clientCols.map(col => `c.${col}`).join(",\n        ");
  return pool.query(`
      SELECT
        ${selectList},
        u.username,
        u.email AS user_email,
        (SELECT EXISTS (SELECT 1 FROM v_b_clients_azure a WHERE a.client_id = c.id)) AS has_azure_credentials,
        (SELECT EXISTS (
          SELECT 1 FROM v_b_clients_m_o365 o WHERE o.client_id = c.id
        )) AS has_o365_equipment,
        (SELECT EXISTS (
          SELECT 1 FROM v_b_clients_m_ndd n WHERE n.client_id = c.id
        )) AS has_ndd_equipment
      FROM v_b_clients c
      LEFT JOIN v_b_users u ON c.commercial_id::text = u.id::text
      ORDER BY c.name ASC
    `);
}
function mapClientsListRow(row) {
  const {
    has_azure_credentials: hasAzureCredentials,
    has_o365_equipment: hasO365Equipment,
    has_ndd_equipment: hasNddEquipment,
    ...client
  } = row;
  let options = client.options || {};
  if (typeof options === "string") {
    try {
      options = JSON.parse(options);
    } catch {
      options = {};
    }
  }
  let contrat = client.contrat || {};
  if (typeof contrat === "string") {
    try {
      contrat = JSON.parse(contrat);
    } catch {
      contrat = {};
    }
  }
  let modules = client.modules || {};
  if (typeof modules === "string") {
    try {
      modules = JSON.parse(modules);
    } catch {
      modules = {};
    }
  }
  if (!modules || typeof modules !== "object") {
    modules = {};
  }
  if (hasAzureCredentials || hasO365Equipment) {
    modules = {
      ...modules,
      Office365: true
    };
  }
  if (hasNddEquipment) {
    modules = {
      ...modules,
      NDD: true
    };
  }
  return {
    ...client,
    client_number: client.client_number ?? null,
    options,
    contrat,
    modules,
    email: null,
    phone: null,
    sites: [],
    commercial: client.username || client.user_email || null
  };
}
async function logClientUpdate({
  req,
  updateFields,
  valueMap
}) {
  try {
    let clientId = req.params.id;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(req.params.id)) {
      const clientResult = await pool.query('SELECT id FROM v_b_clients WHERE id::text = $1', [req.params.id]);
      if (clientResult.rows.length > 0) {
        clientId = clientResult.rows[0].id;
        console.log(`🔄 PUT general logs: UUID conversion ${req.params.id} → numeric ID ${clientId}`);
      }
    }
    if (isNaN(parseInt(clientId))) {
      console.error(`❌ PUT general logs: clientId is not a number: ${clientId} (type: ${typeof clientId})`);
      return;
    }
    const rawUserId = req.user?.id || req.user?.user_id || null;
    const uuidRegexUser = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const userId = rawUserId && uuidRegexUser.test(String(rawUserId)) ? String(rawUserId) : null;
    const modifiedFields = updateFields.map(getFieldNameFromUpdate).filter(Boolean).filter(field => field !== 'updated_at');
    const action = 'Client update';
    const details = {
      modifiedFields,
      changes: buildChanges(modifiedFields, valueMap)
    };
    await pool.query(`INSERT INTO v_b_clients_logs
       (client_id, user_id, action, details)
       VALUES ($1, $2, $3, $4)`, [clientId, userId, action, JSON.stringify(details)]);
  } catch (logError) {
    console.warn('Error writing log:', logError);
  }
}
router.get('/', requirePermission('clients.view'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, u.username, u.email as user_email
      FROM v_b_clients c
      LEFT JOIN v_b_users u ON c.commercial_id::text = u.id::text
    `);
    const clientsWithCommercial = result.rows.map(client => ({
      ...client,
      commercial: client.username || client.user_email || null
    }));
    res.json(clientsWithCommercial);
  } catch (err) {
    res.status(500).json({
      error: "Internal error (SQL)",
      details: err.message,
      code: err.code
    });
  }
});
router.get('/list', requirePermission('clients.view'), async (req, res) => {
  try {
    const result = await queryClientsListBaseRows();
    const payload = result.rows.map(mapClientsListRow);
    const enriched = await enrichClientsListPayload(payload);
    res.set('Cache-Control', 'no-store');
    return res.json(enriched);
  } catch (err) {
    console.error("[GET /clients/list]", err.message, err.code || "");
    return res.status(500).json({
      error: "Internal error (SQL)",
      details: err.message,
      code: err.code
    });
  }
});
router.get("/equipment-counts", async (req, res) => {
  try {
    const byClientId = await fetchEquipmentCountsByClientId();
    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    res.set("Pragma", "no-cache");
    return res.json({
      byClientId
    });
  } catch (err) {
    console.error("[GET /equipment-counts]", err);
    return res.status(500).json({
      error: "Internal error (SQL)",
      details: err.message,
      code: err.code
    });
  }
});
router.get("/cyber-page-data", verifyJWT, async (req, res) => {
  try {
    const clientsResult = await pool.query(`
      SELECT
        c.id,
        c.name,
        c.client_number,
        c.address,
        c.siret,
        c.secteur,
        c.contrat,
        c.options,
        c.modules,
        c.commercial_id,
        c.created_at,
        c.updated_at,
        u.username,
        u.email AS user_email,
        (SELECT EXISTS (SELECT 1 FROM v_b_clients_azure a WHERE a.client_id = c.id)) AS has_azure_credentials,
        (SELECT EXISTS (
          SELECT 1 FROM v_b_clients_m_o365 o WHERE o.client_id = c.id
        )) AS has_o365_equipment,
        (SELECT EXISTS (
          SELECT 1 FROM v_b_clients_m_ndd n WHERE n.client_id = c.id
        )) AS has_ndd_equipment
      FROM v_b_clients c
      LEFT JOIN v_b_users u ON c.commercial_id::text = u.id::text
      ORDER BY c.name ASC
    `);
    const clientIds = clientsResult.rows.map(r => r.id).filter(id => id != null);
    const [avRows, asRows, svRows, campaignsResult, mailinblackResult] = await Promise.all([queryCyberFamilyRows(pool, CYBER_MODULE_TABLES.antivirus, clientIds), queryCyberFamilyRows(pool, CYBER_MODULE_TABLES.antispam, clientIds), queryCyberFamilyRows(pool, CYBER_MODULE_TABLES.save, clientIds), pool.query(`
      SELECT
        c.id, c.client_id, c.name, c.type, c.status, c.start_date, c.end_date,
        c.global_progress, c.description, c.objectif_adoption, c.created_at, c.updated_at, c.created_by,
        c.updated_by,
        cl.name as client_name
      FROM v_b_clients_c_campaign c
      LEFT JOIN v_b_clients cl ON c.client_id::text = cl.id::text
      ORDER BY c.created_at DESC
    `).catch(e => {
      if (e.code === "42P01") return {
        rows: []
      };
      throw e;
    }), pool.query(`
      SELECT id, client_id, label, solution, api_url, auth_client_id, created_at, updated_at
      FROM v_b_clients_mailinblack
      WHERE client_id = ANY($1::int[])
      ORDER BY created_at ASC
    `, [clientIds]).catch(e => {
      if (e.code === "42P01") return {
        rows: []
      };
      throw e;
    })]);
    const rowsByClient = new Map();
    for (const id of clientIds) {
      rowsByClient.set(Number(id), {
        antivirus: [],
        antispam: [],
        save: []
      });
    }
    const pushRows = (rows, family, table) => {
      for (const row of rows) {
        const cid = Number(row.client_id);
        if (!rowsByClient.has(cid)) {
          rowsByClient.set(cid, {
            antivirus: [],
            antispam: [],
            save: []
          });
        }
        rowsByClient.get(cid)[family].push(parseModuleRowForCyber(row, table));
      }
    };
    pushRows(avRows, "antivirus", CYBER_MODULE_TABLES.antivirus);
    pushRows(asRows, "antispam", CYBER_MODULE_TABLES.antispam);
    pushRows(svRows, "save", CYBER_MODULE_TABLES.save);
    const tenantsByClient = new Map();
    for (const row of mailinblackResult.rows || []) {
      const cid = Number(row.client_id);
      if (!tenantsByClient.has(cid)) tenantsByClient.set(cid, []);
      tenantsByClient.get(cid).push({
        id: row.id,
        clientId: row.client_id,
        label: row.label,
        solution: row.solution,
        apiUrl: row.api_url,
        authClientId: row.auth_client_id || null
      });
    }
    const azureByClient = new Map();
    if (clientIds.length) {
      try {
        const az = await pool.query(`SELECT DISTINCT client_id FROM v_b_clients_azure WHERE client_id = ANY($1::int[])`, [clientIds]);
        az.rows.forEach(r => azureByClient.set(Number(r.client_id), true));
      } catch {}
    }
    const clientsPayload = clientsResult.rows.map(row => {
      const {
        has_azure_credentials: hasAzureCredentials,
        has_o365_equipment: hasO365Equipment,
        has_ndd_equipment: hasNddEquipment,
        ...client
      } = row;
      let options = client.options || {};
      if (typeof options === "string") {
        try {
          options = JSON.parse(options);
        } catch {
          options = {};
        }
      }
      let contrat = client.contrat || {};
      if (typeof contrat === "string") {
        try {
          contrat = JSON.parse(contrat);
        } catch {
          contrat = {};
        }
      }
      let modules = client.modules || {};
      if (typeof modules === "string") {
        try {
          modules = JSON.parse(modules);
        } catch {
          modules = {};
        }
      }
      if (!modules || typeof modules !== "object") {
        modules = {};
      }
      if (hasAzureCredentials || hasO365Equipment) {
        modules = {
          ...modules,
          Office365: true
        };
      }
      if (hasNddEquipment) {
        modules = {
          ...modules,
          NDD: true
        };
      }
      const cid = Number(client.id);
      const raw = rowsByClient.get(cid) || {
        antivirus: [],
        antispam: [],
        save: []
      };
      const azureHasCredentials = !!azureByClient.get(cid);
      const transformed = transformClientModulesToFrontend({
        antivirus: raw.antivirus,
        antispam: raw.antispam,
        save: raw.save
      }, {
        azureHasCredentials
      });
      return {
        ...client,
        options,
        contrat,
        modules,
        email: null,
        phone: null,
        sites: [],
        commercial: client.username || client.user_email || null,
        equipements: transformed.equipements || {},
        modules_monitoring: {},
        mailinblackTenants: tenantsByClient.get(cid) || []
      };
    });
    res.json({
      clients: clientsPayload,
      campaigns: campaignsResult.rows || []
    });
  } catch (err) {
    console.error("GET /cyber-page-data:", err);
    res.status(500).json({
      error: "Error loading cybersecurity data",
      details: err.message,
      code: err.code
    });
  }
});
router.get('/equipment-purge', requireAnyPermission('clients.view', 'infrastructure.view'), async (req, res) => {
  try {
    const items = await fetchEquipmentPurgeList();
    res.json(items);
  } catch (err) {
    console.error('GET /equipment-purge:', err);
    res.status(500).json({
      error: 'Error loading equipment purge list',
      details: err.message,
      code: err.code
    });
  }
});
router.get('/equipment-inventory', requireAnyPermission('equipment_inventory.view', 'infrastructure.view'), async (req, res) => {
  try {
    const items = await fetchEquipmentInventoryList();
    res.json(items);
  } catch (err) {
    console.error('GET /equipment-inventory:', err);
    res.status(500).json({
      error: 'Error loading equipment inventory',
      details: err.message,
      code: err.code
    });
  }
});
router.get('/equipment-fleet', requireAnyPermission('infrastructure.view', 'supervision.view', 'clients.view', 'supervision.manage'), async (req, res) => {
  try {
    const items = await fetchEquipmentFleetList();
    res.json(items);
  } catch (err) {
    console.error('GET /equipment-fleet:', err);
    res.status(500).json({
      error: 'Error loading equipment fleet',
      details: err.message,
      code: err.code
    });
  }
});
router.get('/equipment-fleet/issues', requireAnyPermission('infrastructure.view', 'supervision.view', 'clients.view', 'supervision.manage'), async (req, res) => {
  try {
    const payload = await fetchEquipmentFleetIssues();
    res.json(payload);
  } catch (err) {
    console.error('GET /equipment-fleet/issues:', err);
    res.status(500).json({
      error: 'Error loading equipment fleet issues',
      details: err.message,
      code: err.code
    });
  }
});
router.post('/equipment-inventory/bulk', requireAnyPermission('clients_detail.devices', 'infrastructure.edit', 'supervision.manage'), async (req, res) => {
  try {
    const result = await bulkUpdateEquipmentInventory({
      items: req.body?.items,
      updates: req.body?.updates || {},
      actorUserId: req.user?.id || null
    });
    res.json(result);
  } catch (err) {
    console.error('POST /equipment-inventory/bulk:', err);
    const status = err.status || (/No field/i.test(err.message) ? 400 : 500);
    res.status(status).json({
      error: err.message || 'Error bulk updating equipment',
      code: err.code || undefined
    });
  }
});
router.get('/general', requirePermission('clients.view'), async (req, res) => {
  try {
    const clientsResult = await pool.query(`
      SELECT c.*, u.username, u.email as user_email
      FROM v_b_clients c
      LEFT JOIN v_b_users u ON c.commercial_id::text = u.id::text
      ORDER BY c.name
    `);
    const clients = clientsResult.rows;
    const clientsWithModules = await Promise.all(clients.map(async client => {
      let equipements = {};
      if (!isCommunity()) {
        try {
          const rawModulesData = {};
          for (const [family, table] of Object.entries(MODULE_TABLES)) {
            try {
              let result;
              const baseSelect = `SELECT id, item_key, name, data, is_active, created_at, updated_at, checkmk_host_name, checkmk_site, checkmk_service_name`;
              const saveExtraSelect = table === 'v_b_clients_m_save' ? ', last_backup_date, last_backup_duration, last_backup_start, hycu_job_uuid, hycu_job_name' : '';
              try {
                result = await pool.query(`${baseSelect}${saveExtraSelect}
                     FROM ${table}
                     WHERE client_id = $1
                     ORDER BY name NULLS LAST, item_key NULLS LAST`, [client.id]);
              } catch (colErr) {
                if (colErr.code === '42703') {
                  result = await pool.query(`SELECT id, item_key, name, data, is_active, created_at, updated_at
                       FROM ${table}
                       WHERE client_id = $1
                       ORDER BY name NULLS LAST, item_key NULLS LAST`, [client.id]);
                  result.rows.forEach(r => {
                    r.checkmk_host_name = null;
                    r.checkmk_site = null;
                    r.checkmk_service_name = null;
                    if (table === 'v_b_clients_m_save') {
                      r.last_backup_date = null;
                      r.last_backup_duration = null;
                      r.last_backup_start = null;
                      r.hycu_job_uuid = null;
                      r.hycu_job_name = null;
                    }
                  });
                } else throw colErr;
              }
              const parsedRows = result.rows.map(row => {
                if (row.data && typeof row.data === 'string') {
                  try {
                    row.data = JSON.parse(row.data);
                  } catch (e) {
                    row.data = {};
                  }
                } else if (!row.data) {
                  row.data = {};
                }
                return applyCheckmkCoalesce(row);
              });
              rawModulesData[family] = parsedRows;
            } catch (err) {
              if (err.code === '42P01') {
                rawModulesData[family] = [];
              } else {
                throw err;
              }
            }
          }
          let azureHasCredentials = false;
          try {
            const azureResult = await pool.query("SELECT 1 FROM v_b_clients_azure WHERE client_id = $1 LIMIT 1", [client.id]);
            azureHasCredentials = azureResult.rows.length > 0;
          } catch (azureErr) {}
          const transformed = transformClientModulesToFrontend(rawModulesData, {
            azureHasCredentials
          });
          equipements = transformed.equipements || {};
        } catch (error) {
          return client;
        }
      }
      try {
        let parsedSites = client.sites;
        if (parsedSites && typeof parsedSites === 'string') {
          try {
            parsedSites = JSON.parse(parsedSites);
          } catch (e) {
            parsedSites = [];
          }
        }
        const parsedSSID = resolveClientSsidCatalog(client);
        let clientOptions = client.options || {};
        if (clientOptions && typeof clientOptions === 'string') {
          try {
            clientOptions = JSON.parse(clientOptions);
          } catch (e) {
            clientOptions = {};
          }
        }
        let clientModulesMonitoring = isCommunity() ? {} : client.modules || {};
        if (!isCommunity() && clientModulesMonitoring && typeof clientModulesMonitoring === 'string') {
          try {
            clientModulesMonitoring = JSON.parse(clientModulesMonitoring);
          } catch (e) {
            clientModulesMonitoring = {};
          }
        }
        let contratData = client.contrat;
        if (contratData && typeof contratData === 'string') {
          try {
            contratData = JSON.parse(contratData);
          } catch (e) {
            contratData = {};
          }
        }
        const commercial = client.username || client.user_email || null;
        return {
          ...client,
          commercial,
          options: clientOptions,
          modules: clientOptions,
          modules_monitoring: clientModulesMonitoring || {},
          equipements,
          sites: parsedSites || [],
          ssid: parsedSSID || [],
          ssids: parsedSSID || [],
          contrat: contratData
        };
      } catch (error) {
        return client;
      }
    }));
    res.json(clientsWithModules);
  } catch (err) {
    res.status(500).json({
      error: "Internal error (SQL)",
      details: err.message,
      code: err.code
    });
  }
});
router.get('/:id/modules', async (req, res) => {
  const {
    id
  } = req.params;
  try {
    const payload = {};
    for (const [family, table] of Object.entries(MODULE_TABLES)) {
      try {
        let result;
        const baseSelect = `SELECT id, item_key, name, data, is_active, created_at, updated_at, checkmk_host_name, checkmk_site, checkmk_service_name`;
        const saveExtraSelect = table === 'v_b_clients_m_save' ? ', last_backup_date, last_backup_duration, last_backup_start, hycu_job_uuid, hycu_job_name' : '';
        try {
          result = await pool.query(`${baseSelect}${saveExtraSelect}
             FROM ${table}
             WHERE client_id = $1
             ORDER BY name NULLS LAST, item_key NULLS LAST`, [id]);
        } catch (colErr) {
          if (colErr.code === '42703') {
            result = await pool.query(`SELECT id, item_key, name, data, is_active, created_at, updated_at
               FROM ${table}
               WHERE client_id = $1
               ORDER BY name NULLS LAST, item_key NULLS LAST`, [id]);
            result.rows.forEach(r => {
              r.checkmk_host_name = null;
              r.checkmk_site = null;
              r.checkmk_service_name = null;
              if (table === 'v_b_clients_m_save') {
                r.last_backup_date = null;
                r.last_backup_duration = null;
                r.last_backup_start = null;
                r.hycu_job_uuid = null;
                r.hycu_job_name = null;
              }
            });
          } else throw colErr;
        }
        const parsedRows = result.rows.map(row => {
          let parsedData = row.data;
          if (row.data && typeof row.data === 'string') {
            try {
              parsedData = JSON.parse(row.data);
            } catch (e) {
              parsedData = {};
            }
          } else if (!row.data) {
            parsedData = {};
          }
          const checkmk = coalesceCheckmkFromRow(row, parsedData);
          const baseRow = {
            id: row.id,
            item_key: row.item_key,
            name: row.name,
            is_active: row.is_active,
            data: parsedData,
            created_at: row.created_at,
            updated_at: row.updated_at,
            checkmk_host_name: checkmk.checkmk_host_name,
            checkmk_site: checkmk.checkmk_site,
            checkmk_service_name: checkmk.checkmk_service_name
          };
          if (table === 'v_b_clients_m_save') {
            const rawDate = row.last_backup_date;
            baseRow.last_backup_date = rawDate != null ? rawDate instanceof Date ? rawDate.toISOString() : String(rawDate) : null;
            baseRow.last_backup_duration = row.last_backup_duration != null ? String(row.last_backup_duration) : null;
            const rawStart = row.last_backup_start;
            baseRow.last_backup_start = rawStart != null ? rawStart instanceof Date ? rawStart.toISOString() : String(rawStart) : null;
          }
          return baseRow;
        });
        payload[family] = parsedRows;
      } catch (err) {
        if (err.code === '42P01') {
          payload[family] = [];
        } else {
          console.error(`Error pour ${family}:`, err);
          payload[family] = [];
        }
      }
    }
    let azureHasCredentials = false;
    try {
      const azureResult = await pool.query("SELECT 1 FROM v_b_clients_azure WHERE client_id = $1 LIMIT 1", [id]);
      azureHasCredentials = azureResult.rows.length > 0;
    } catch (azureErr) {
      azureHasCredentials = false;
    }
    const transformed = transformClientModulesToFrontend(payload, {
      azureHasCredentials
    });
    res.json({
      modules: transformed.modules || {},
      modules_monitoring: transformed.modules_monitoring || {},
      equipements: transformed.equipements || {},
      azureHasCredentials
    });
  } catch (err) {
    console.error('Error /:id/modules:', err);
    res.status(500).json({
      error: "Error loading modules",
      details: err.message
    });
  }
});
router.get('/general/:id', async (req, res) => {
  try {
    const {
      id
    } = req.params;
    const result = await pool.query(`
      SELECT c.*, u.username, u.email as user_email
      FROM v_b_clients c
      LEFT JOIN v_b_users u ON c.commercial_id::text = u.id::text
      WHERE c.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Client not found"
      });
    }
    const client = result.rows[0];
    if (client.sites) {
      if (typeof client.sites === 'string') {
        try {
          client.sites = JSON.parse(client.sites);
        } catch (e) {
          client.sites = [];
        }
      }
    } else {
      client.sites = [];
    }
    const ssidCatalog = resolveClientSsidCatalog(client);
    client.ssid = ssidCatalog;
    client.ssids = ssidCatalog;
    client.commercial = client.username || client.user_email || null;
    res.json(client);
  } catch (err) {
    res.status(500).json({
      error: "Internal error (SQL)",
      details: err.message,
      code: err.code
    });
  }
});
router.post('/:id/logs', verifyJWT, async (req, res) => {
  try {
    const {
      id
    } = req.params;
    const {
      action,
      details
    } = req.body;
    if (!action) {
      return res.status(400).json({
        error: 'action field is required'
      });
    }
    let clientId = id;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) {
      const clientResult = await pool.query('SELECT id FROM v_b_clients WHERE id::text = $1', [id]);
      if (clientResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Client not found'
        });
      }
      clientId = clientResult.rows[0].id;
      console.log(`🔄 POST logs: UUID conversion ${id} → numeric ID ${clientId}`);
    }
    if (isNaN(parseInt(clientId))) {
      console.error(`❌ POST logs: clientId n'est pas un nombre: ${clientId} (type: ${typeof clientId})`);
      return res.status(400).json({
        error: 'Invalid ID client'
      });
    }
    const rawUserId = req.user?.id || req.user?.user_id || null;
    const uuidRegexUser = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const userId = rawUserId && uuidRegexUser.test(String(rawUserId)) ? String(rawUserId) : null;
    await pool.query(`INSERT INTO v_b_clients_logs
       (client_id, user_id, action, details)
       VALUES ($1, $2, $3, $4)`, [clientId, userId, action, JSON.stringify(details || {})]);
    res.json({
      success: true
    });
  } catch (error) {
    console.error('Error creating log:', error);
    res.status(500).json({
      error: 'Error creating log'
    });
  }
});
router.get('/:id/logs', async (req, res) => {
  try {
    const {
      id
    } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    let clientId = id;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) {
      const clientResult = await pool.query('SELECT id FROM v_b_clients WHERE id::text = $1', [id]);
      if (clientResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Client not found'
        });
      }
      clientId = clientResult.rows[0].id;
      console.log(`🔄 GET logs: UUID conversion ${id} → numeric ID ${clientId}`);
    }
    if (isNaN(parseInt(clientId))) {
      console.error(`❌ GET logs: clientId n'est pas un nombre: ${clientId} (type: ${typeof clientId})`);
      return res.status(400).json({
        error: 'Invalid ID client'
      });
    }
    const result = await pool.query(`SELECT
        l.id,
        l.client_id,
        l.user_id,
        COALESCE(u.username, u.email) AS user_name,
        l.action,
        l.details,
        l.created_at
       FROM v_b_clients_logs l
       LEFT JOIN v_b_users u ON l.user_id::text = u.id::text
       WHERE l.client_id = $1
       ORDER BY l.created_at DESC
       LIMIT $2 OFFSET $3`, [clientId, limit, offset]);
    const countResult = await pool.query(`SELECT COUNT(*) as total
       FROM v_b_clients_logs
       WHERE client_id = $1`, [clientId]);
    const total = parseInt(countResult.rows[0].total) || 0;
    res.json({
      logs: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('Error fetching client logs:', err);
    res.status(500).json({
      error: "Error retrieving logs",
      details: err.message
    });
  }
});
router.get('/:id/antivirus', async (req, res) => {
  try {
    const {
      id
    } = req.params;
    let clientId = id;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) {
      const clientResult = await pool.query('SELECT id FROM v_b_clients WHERE id::text = $1', [id]);
      if (clientResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Client not found'
        });
      }
      clientId = clientResult.rows[0].id;
      console.log(`🔄 GET antivirus: UUID conversion ${id} → numeric ID ${clientId}`);
    }
    if (isNaN(parseInt(clientId))) {
      console.error(`❌ GET antivirus: clientId n'est pas un nombre: ${clientId} (type: ${typeof clientId})`);
      return res.status(400).json({
        error: 'Invalid ID client'
      });
    }
    const result = await pool.query(`SELECT id, client_id, item_key, data, created_at, updated_at
       FROM v_b_clients_m_antivirus
       WHERE client_id = $1
       ORDER BY created_at DESC`, [clientId]);
    const antivirusData = result.rows.map(row => {
      const data = row.data || {};
      return {
        id: row.id,
        client_id: row.client_id,
        item_key: row.item_key,
        nom: data.solution || data.nom || data.name || 'N/A',
        solution: data.solution || data.nom || data.name || 'N/A',
        utilisateurs: data.licencesUtilisees || data.syncData?.license?.usedLicenses || 'N/A',
        nombre_utilisateurs: data.licencesUtilisees || data.syncData?.license?.usedLicenses || 'N/A',
        licences: data.licencesTotales || data.syncData?.license?.totalLicenses || 'N/A',
        nombre_licences: data.licencesTotales || data.syncData?.license?.totalLicenses || 'N/A',
        expiration: data.expiration || data.syncData?.license?.expirationDate || null,
        expirityDate: data.expiration || data.syncData?.license?.expirationDate || null,
        endpointsTotal: data.endpoints?.total || data.syncData?.endpoints?.total || 'N/A',
        endpointsManaged: data.endpoints?.managed || data.syncData?.endpoints?.managed || 'N/A',
        companyName: data.companyName || data.syncData?.company?.name || 'N/A',
        companyId: data.companyId || data.syncData?.company?.id || null,
        mappingMode: data.mappingMode || 'reseller',
        bitdefenderTenantId: data.bitdefenderTenantId || null,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    });
    res.json(antivirusData);
  } catch (err) {
    console.error('Error fetching client antivirus data:', err);
    res.status(500).json({
      error: "Error retrieving antivirus data",
      details: err.message,
      code: err.code
    });
  }
});
router.get('/:id/o365', async (req, res) => {
  try {
    const {
      id
    } = req.params;
    let clientId = id;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) {
      const clientResult = await pool.query('SELECT id FROM v_b_clients WHERE id::text = $1', [id]);
      if (clientResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Client not found'
        });
      }
      clientId = clientResult.rows[0].id;
      console.log(`🔄 GET o365: UUID conversion ${id} → numeric ID ${clientId}`);
    }
    if (isNaN(parseInt(clientId))) {
      console.error(`❌ GET o365: clientId n'est pas un nombre: ${clientId} (type: ${typeof clientId})`);
      return res.status(400).json({
        success: false,
        error: 'Invalid ID client'
      });
    }
    const result = await pool.query(`SELECT id, client_id, item_key, name, data, is_active, created_at, updated_at
       FROM v_b_clients_m_o365
       WHERE client_id = $1
       ORDER BY updated_at DESC, created_at DESC`, [clientId]);
    const rows = result.rows.map(row => {
      let parsedData = row.data;
      if (parsedData && typeof parsedData === 'string') {
        try {
          parsedData = JSON.parse(parsedData);
        } catch (e) {
          parsedData = {};
        }
      } else if (!parsedData) {
        parsedData = {};
      }
      return {
        ...row,
        data: parsedData
      };
    });
    return res.json({
      success: true,
      data: rows
    });
  } catch (err) {
    console.error('Error fetching client Office 365 data:', err);
    return res.status(500).json({
      success: false,
      error: "Error retrieving Office 365 data",
      details: err.message,
      code: err.code
    });
  }
});
router.get('/:id/antispam', async (req, res) => {
  try {
    const {
      id
    } = req.params;
    let clientId = id;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) {
      const clientResult = await pool.query('SELECT id FROM v_b_clients WHERE id::text = $1', [id]);
      if (clientResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Client not found'
        });
      }
      clientId = clientResult.rows[0].id;
      console.log(`🔄 GET antispam: UUID conversion ${id} → numeric ID ${clientId}`);
    }
    if (isNaN(parseInt(clientId))) {
      console.error(`❌ GET antispam: clientId n'est pas un nombre: ${clientId} (type: ${typeof clientId})`);
      return res.status(400).json({
        error: 'Invalid ID client'
      });
    }
    const result = await pool.query(`SELECT id, client_id, item_key, data, created_at, updated_at
       FROM v_b_clients_m_antispam
       WHERE client_id = $1
       ORDER BY created_at DESC`, [clientId]);
    const antispamData = result.rows.map(row => {
      const data = row.data || {};
      return {
        id: row.id,
        client_id: row.client_id,
        item_key: row.item_key,
        nom: data.logiciel || data.nom || data.name || data.solution || 'N/A',
        solution: data.logiciel || data.nom || data.name || data.solution || 'N/A',
        utilisateurs: data.utilisateursProteges || data.utilisateurs || data.nombre_utilisateurs || 'N/A',
        nombre_utilisateurs: data.utilisateursProteges || data.utilisateurs || data.nombre_utilisateurs || 'N/A',
        licences: data.domainesSurveilles || data.licences || data.nombre_licences || 'N/A',
        nombre_licences: data.domainesSurveilles || data.licences || data.nombre_licences || 'N/A',
        expiration: data.expiration || data.expirityDate || null,
        expirityDate: data.expiration || data.expirityDate || null,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    });
    res.json(antispamData);
  } catch (err) {
    console.error('Error fetching client antispam data:', err);
    res.status(500).json({
      error: "Error retrieving antispam data",
      details: err.message,
      code: err.code
    });
  }
});
router.get('/:id/antispam/:recordId', async (req, res) => {
  try {
    const {
      id: clientIdParam,
      recordId
    } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    let clientId = clientIdParam;
    if (uuidRegex.test(clientIdParam)) {
      const clientResult = await pool.query('SELECT id FROM v_b_clients WHERE id::text = $1', [clientIdParam]);
      if (clientResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Client not found'
        });
      }
      clientId = clientResult.rows[0].id;
    }
    if (isNaN(parseInt(clientId))) {
      return res.status(400).json({
        error: 'Invalid ID client'
      });
    }
    const result = await pool.query(`SELECT id, client_id, item_key, name, data, created_at, updated_at, is_active
       FROM v_b_clients_m_antispam
       WHERE client_id = $1 AND id::text = $2`, [clientId, recordId]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Enregistrement antispam not found'
      });
    }
    const row = result.rows[0];
    res.json({
      id: row.id,
      client_id: row.client_id,
      item_key: row.item_key,
      name: row.name,
      data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
      created_at: row.created_at,
      updated_at: row.updated_at,
      is_active: row.is_active
    });
  } catch (err) {
    console.error('Error fetching de l\'enregistrement antispam:', err);
    res.status(500).json({
      error: "Error retrieving antispam record",
      details: err.message,
      code: err.code
    });
  }
});
router.get('/domains/all', async (req, res) => {
  try {
    const result = await pool.query(`SELECT 
        ndd.id,
        ndd.client_id,
        ndd.item_key,
        ndd.data,
        ndd.is_active,
        ndd.created_at,
        ndd.updated_at,
        COALESCE(
          (SELECT name FROM v_b_clients 
           WHERE (id::text ~ '^[0-9]+$' AND id::integer = ndd.client_id)
              OR id::text = ndd.client_id::text
           LIMIT 1),
          'N/A'
        ) as client_name
       FROM v_b_clients_m_ndd ndd
       ORDER BY client_name, ndd.created_at DESC`);
    const domainsData = result.rows.map(row => {
      const data = row.data || {};
      return {
        id: row.id,
        client_id: row.client_id,
        client_name: row.client_name || 'N/A',
        item_key: row.item_key,
        is_active: row.is_active !== false,
        nom: data.nom || data.name || row.item_key || 'N/A',
        registrar: data.registrar || 'N/A',
        expiration: data.expiration || null,
        lastSync: row.updated_at || row.created_at || null,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    });
    res.json(domainsData);
  } catch (err) {
    console.error('Error fetching all domain names:', err);
    res.status(500).json({
      error: "Error retrieving all domain names",
      details: err.message,
      code: err.code
    });
  }
});
router.get('/:id/domains', async (req, res) => {
  try {
    const {
      id
    } = req.params;
    let clientId = id;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) {
      const clientResult = await pool.query('SELECT id FROM v_b_clients WHERE id::text = $1', [id]);
      if (clientResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Client not found'
        });
      }
      clientId = clientResult.rows[0].id;
      console.log(`🔄 GET domains: UUID conversion ${id} → numeric ID ${clientId}`);
    }
    clientId = parseInt(clientId);
    if (isNaN(clientId)) {
      console.error(`❌ GET domains: clientId n'est pas un nombre: ${clientId} (type: ${typeof clientId})`);
      return res.status(400).json({
        error: 'Invalid ID client'
      });
    }
    const result = await pool.query(`SELECT id, client_id, item_key, data, is_active, created_at, updated_at
       FROM v_b_clients_m_ndd
       WHERE client_id = $1
       ORDER BY created_at DESC`, [clientId]);
    const domainsData = result.rows.map(row => {
      const data = row.data || {};
      return {
        id: row.id,
        client_id: row.client_id,
        item_key: row.item_key,
        is_active: row.is_active,
        nom: data.nom || data.name || 'N/A',
        registrar: data.registrar || 'N/A',
        expiration: data.expiration || null,
        domain_id: data.id || null,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    });
    res.json(domainsData);
  } catch (err) {
    console.error('Error fetching client domain names:', err);
    res.status(500).json({
      error: "Error retrieving domain names",
      details: err.message,
      code: err.code
    });
  }
});
router.get('/ssl-certificates/all', async (req, res) => {
  try {
    const result = await pool.query(`SELECT
        ssl.id,
        ssl.client_id,
        ssl.item_key,
        ssl.name,
        ssl.data,
        ssl.is_active,
        ssl.created_at,
        ssl.updated_at,
        COALESCE(
          (SELECT name FROM v_b_clients
           WHERE (id::text ~ '^[0-9]+$' AND id::integer = ssl.client_id)
              OR id::text = ssl.client_id::text
           LIMIT 1),
          'N/A'
        ) as client_name
       FROM v_b_clients_m_ssl ssl
       WHERE ssl.is_active IS NOT FALSE
       ORDER BY client_name, ssl.created_at DESC`);
    res.json(result.rows.map(row => ({
      ...mapSslCertificateRow(row),
      client_name: row.client_name || "N/A"
    })));
  } catch (err) {
    if (err.code === "42P01") {
      return res.status(503).json({
        error: "SSL module unavailable (migration required)"
      });
    }
    console.error("Error GET ssl-certificates/all:", err);
    res.status(500).json({
      error: "Error retrieving SSL certificates",
      details: err.message,
      code: err.code
    });
  }
});
router.post('/ssl-certificates/check-all', verifyJWT, requirePermission('clients_detail.solutions'), async (req, res) => {
  try {
    const result = await pool.query(`SELECT id, client_id, item_key, name, data, is_active, created_at, updated_at
       FROM v_b_clients_m_ssl
       WHERE is_active IS NOT FALSE`);
    const checked = [];
    for (const row of result.rows) {
      const mapped = await checkAndPersistSslRow(row);
      if (mapped) checked.push(mapped);
    }
    res.json({
      checked: checked.length,
      items: checked
    });
  } catch (err) {
    if (err.code === "42P01") {
      return res.status(503).json({
        error: "SSL module unavailable (migration required)"
      });
    }
    console.error("Error POST ssl-certificates/check-all:", err);
    res.status(500).json({
      error: "Error during SSL verification",
      details: err.message
    });
  }
});
router.get('/:id/ssl-certificates', async (req, res) => {
  try {
    const clientId = await resolveNumericClientId(req.params.id);
    if (!clientId) {
      return res.status(404).json({
        error: "Client not found"
      });
    }
    const {
      autoCheck = "false"
    } = req.query;
    if (autoCheck === "true") {
      const staleResult = await pool.query(`SELECT id, client_id, item_key, name, data, is_active, created_at, updated_at
         FROM v_b_clients_m_ssl
         WHERE client_id = $1 AND is_active IS NOT FALSE`, [clientId]);
      for (const row of staleResult.rows) {
        const data = row.data && typeof row.data === "object" ? row.data : {};
        if (isSslCheckStale(data)) {
          await checkAndPersistSslRow(row);
        }
      }
    }
    const result = await pool.query(`SELECT id, client_id, item_key, name, data, is_active, created_at, updated_at
       FROM v_b_clients_m_ssl
       WHERE client_id = $1
       ORDER BY name NULLS LAST, created_at DESC`, [clientId]);
    res.json(result.rows.map(mapSslCertificateRow));
  } catch (err) {
    if (err.code === "42P01") {
      return res.json([]);
    }
    console.error("Error GET ssl-certificates:", err);
    res.status(500).json({
      error: "Error retrieving SSL certificates",
      details: err.message
    });
  }
});
router.post('/:id/ssl-certificates', verifyJWT, requirePermission('clients_detail.solutions'), async (req, res) => {
  let clientId;
  let hostname;
  try {
    clientId = await resolveNumericClientId(req.params.id);
    if (!clientId) {
      return res.status(404).json({
        error: "Client not found"
      });
    }
    hostname = String(req.body?.hostname || req.body?.host || req.body?.name || "").trim();
    const port = Number(req.body?.port) || 443;
    const checkIntervalHours = resolveSslCheckIntervalHours({
      checkIntervalHours: req.body?.checkIntervalHours
    });
    if (!hostname) {
      return res.status(400).json({
        error: "Hostname required"
      });
    }
    const result = await pool.query(`INSERT INTO v_b_clients_m_ssl (client_id, item_key, name, data, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, client_id, item_key, name, data, is_active, created_at, updated_at`, [clientId, hostname, hostname, JSON.stringify({
      hostname,
      port,
      checkIntervalHours
    })]);
    res.status(201).json(mapSslCertificateRow(result.rows[0]));
  } catch (err) {
    if (err.code === "23505") {
      try {
        const existing = await pool.query(`SELECT id, client_id, item_key, name, data, is_active, created_at, updated_at
           FROM v_b_clients_m_ssl
           WHERE client_id = $1 AND (name = $2 OR item_key = $2)
           LIMIT 1`, [clientId, hostname]);
        if (existing.rows[0]) {
          return res.json(mapSslCertificateRow(existing.rows[0]));
        }
      } catch (_) {}
    }
    if (err.code === "42P01") {
      return res.status(503).json({
        error: "SSL module unavailable (migration required)"
      });
    }
    console.error("Error POST ssl-certificates:", err);
    res.status(500).json({
      error: "Error adding SSL certificate",
      details: err.message
    });
  }
});
router.post('/:id/ssl-certificates/check', verifyJWT, requirePermission('clients_detail.solutions'), async (req, res) => {
  try {
    const clientId = await resolveNumericClientId(req.params.id);
    if (!clientId) {
      return res.status(404).json({
        error: "Client not found"
      });
    }
    const result = await pool.query(`SELECT id, client_id, item_key, name, data, is_active
       FROM v_b_clients_m_ssl
       WHERE client_id = $1 AND is_active IS NOT FALSE`, [clientId]);
    const checked = [];
    for (const row of result.rows) {
      const mapped = await checkAndPersistSslRow(row);
      if (mapped) checked.push(mapped);
    }
    res.json({
      checked: checked.length,
      items: checked
    });
  } catch (err) {
    if (err.code === "42P01") {
      return res.status(503).json({
        error: "SSL module unavailable (migration required)"
      });
    }
    console.error("Error POST ssl-certificates/check:", err);
    res.status(500).json({
      error: "Error during SSL verification",
      details: err.message
    });
  }
});
router.post('/:id/ssl-certificates/:certId/check', verifyJWT, requirePermission('clients_detail.solutions'), async (req, res) => {
  try {
    const clientId = await resolveNumericClientId(req.params.id);
    if (!clientId) {
      return res.status(404).json({
        error: "Client not found"
      });
    }
    const certId = String(req.params.certId || "").trim();
    const existing = await pool.query(`SELECT id, client_id, item_key, name, data, is_active, created_at, updated_at
       FROM v_b_clients_m_ssl
       WHERE id = $1 AND client_id = $2`, [certId, clientId]);
    if (!existing.rows[0]) {
      return res.status(404).json({
        error: "Certificate not found"
      });
    }
    const mapped = await checkAndPersistSslRow(existing.rows[0]);
    if (!mapped) {
      return res.status(400).json({
        error: "Invalid host for verification"
      });
    }
    res.json(mapped);
  } catch (err) {
    if (err.code === "42P01") {
      return res.status(503).json({
        error: "SSL module unavailable (migration required)"
      });
    }
    console.error("Error POST ssl-certificates/:certId/check:", err);
    res.status(500).json({
      error: "Error during SSL verification",
      details: err.message
    });
  }
});
router.put('/:id/ssl-certificates/:certId', verifyJWT, requirePermission('clients_detail.solutions'), async (req, res) => {
  try {
    const clientId = await resolveNumericClientId(req.params.id);
    if (!clientId) {
      return res.status(404).json({
        error: "Client not found"
      });
    }
    const certId = String(req.params.certId || "").trim();
    const existing = await pool.query(`SELECT id, client_id, item_key, name, data, is_active, created_at, updated_at
       FROM v_b_clients_m_ssl
       WHERE id = $1 AND client_id = $2`, [certId, clientId]);
    if (!existing.rows[0]) {
      return res.status(404).json({
        error: "Certificate not found"
      });
    }
    const current = mapSslCertificateRow(existing.rows[0]);
    const data = existing.rows[0].data && typeof existing.rows[0].data === "object" ? existing.rows[0].data : {};
    const hostname = String(req.body?.hostname ?? req.body?.host ?? current.hostname ?? "").trim();
    const port = req.body?.port !== undefined ? Number(req.body.port) || 443 : current.port;
    const checkIntervalHours = req.body?.checkIntervalHours !== undefined ? resolveSslCheckIntervalHours({
      checkIntervalHours: req.body.checkIntervalHours
    }) : resolveSslCheckIntervalHours(data);
    const isActive = req.body?.is_active !== undefined ? Boolean(req.body.is_active) : current.is_active;
    if (!hostname) {
      return res.status(400).json({
        error: "Hostname required"
      });
    }
    const nextData = {
      ...data,
      hostname,
      port,
      checkIntervalHours
    };
    const result = await pool.query(`UPDATE v_b_clients_m_ssl
       SET item_key = $3, name = $3, data = $4, is_active = $5, updated_at = NOW()
       WHERE id = $1 AND client_id = $2
       RETURNING id, client_id, item_key, name, data, is_active, created_at, updated_at`, [certId, clientId, hostname, JSON.stringify(nextData), isActive]);
    res.json(mapSslCertificateRow(result.rows[0]));
  } catch (err) {
    if (err.code === "42P01") {
      return res.status(503).json({
        error: "SSL module unavailable (migration required)"
      });
    }
    console.error("Error PUT ssl-certificates:", err);
    res.status(500).json({
      error: "Error updating SSL certificate",
      details: err.message
    });
  }
});
router.delete('/:id/ssl-certificates/:certId', verifyJWT, requirePermission('clients_detail.solutions'), async (req, res) => {
  try {
    const clientId = await resolveNumericClientId(req.params.id);
    if (!clientId) {
      return res.status(404).json({
        error: "Client not found"
      });
    }
    const certId = String(req.params.certId || "").trim();
    const result = await pool.query(`DELETE FROM v_b_clients_m_ssl
       WHERE id = $1 AND client_id = $2
       RETURNING id`, [certId, clientId]);
    if (!result.rows[0]) {
      return res.status(404).json({
        error: "Certificate not found"
      });
    }
    res.json({
      success: true,
      id: result.rows[0].id
    });
  } catch (err) {
    if (err.code === "42P01") {
      return res.status(503).json({
        error: "SSL module unavailable (migration required)"
      });
    }
    console.error("Error DELETE ssl-certificates:", err);
    res.status(500).json({
      error: "Error deleting SSL certificate",
      details: err.message
    });
  }
});
router.get('/:id/licences', async (req, res) => {
  try {
    const clientId = await resolveNumericClientId(req.params.id);
    if (!clientId) {
      return res.status(404).json({
        error: "Client not found"
      });
    }
    const result = await pool.query(`SELECT id, client_id, item_key, name, data, is_active, created_at, updated_at
       FROM v_b_clients_m_licences
       WHERE client_id = $1 AND is_active IS NOT FALSE
       ORDER BY name NULLS LAST, created_at DESC`, [clientId]);
    res.json(result.rows.map(mapLicenceRow));
  } catch (err) {
    if (err.code === "42P01") {
      return res.json([]);
    }
    console.error("Error GET licences:", err);
    res.status(500).json({
      error: "Error retrieving licenses",
      details: err.message
    });
  }
});
router.post('/:id/licences', verifyJWT, requirePermission('clients_detail.solutions'), async (req, res) => {
  let clientId;
  let nom;
  try {
    clientId = await resolveNumericClientId(req.params.id);
    if (!clientId) {
      return res.status(404).json({
        error: "Client not found"
      });
    }
    nom = String(req.body?.nom || req.body?.name || "").trim();
    const expiration = String(req.body?.expiration || "").trim() || null;
    const fournisseur = String(req.body?.fournisseur || req.body?.vendor || "").trim() || null;
    const notes = String(req.body?.notes || req.body?.note || "").trim() || null;
    if (!nom) {
      return res.status(400).json({
        error: "Name is required"
      });
    }
    const data = {
      nom,
      expiration,
      fournisseur,
      notes
    };
    const result = await pool.query(`INSERT INTO v_b_clients_m_licences (client_id, item_key, name, data, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, client_id, item_key, name, data, is_active, created_at, updated_at`, [clientId, nom, nom, JSON.stringify(data)]);
    res.status(201).json(mapLicenceRow(result.rows[0]));
  } catch (err) {
    if (err.code === "23505" && clientId && nom) {
      try {
        const existing = await pool.query(`SELECT id, client_id, item_key, name, data, is_active, created_at, updated_at
           FROM v_b_clients_m_licences
           WHERE client_id = $1 AND (name = $2 OR item_key = $2)
           LIMIT 1`, [clientId, nom]);
        if (existing.rows[0]) {
          return res.json(mapLicenceRow(existing.rows[0]));
        }
      } catch (_) {}
    }
    if (err.code === "42P01") {
      return res.status(503).json({
        error: "Licenses module unavailable (migration required)"
      });
    }
    console.error("Error POST licences:", err);
    res.status(500).json({
      error: "Error adding license",
      details: err.message
    });
  }
});
router.put('/:id/licences/:licenceId', verifyJWT, requirePermission('clients_detail.solutions'), async (req, res) => {
  try {
    const clientId = await resolveNumericClientId(req.params.id);
    if (!clientId) {
      return res.status(404).json({
        error: "Client not found"
      });
    }
    const licenceId = String(req.params.licenceId || "").trim();
    if (!licenceId) {
      return res.status(400).json({
        error: "Identifiant licence required"
      });
    }
    const existing = await pool.query(`SELECT id, client_id, item_key, name, data, is_active, created_at, updated_at
       FROM v_b_clients_m_licences
       WHERE id = $1 AND client_id = $2`, [licenceId, clientId]);
    if (!existing.rows[0]) {
      return res.status(404).json({
        error: "License not found"
      });
    }
    const current = mapLicenceRow(existing.rows[0]);
    const nom = String(req.body?.nom ?? req.body?.name ?? current.nom).trim();
    const expiration = req.body?.expiration !== undefined ? String(req.body.expiration || "").trim() || null : current.expiration;
    const fournisseur = req.body?.fournisseur !== undefined ? String(req.body.fournisseur || "").trim() || null : current.fournisseur;
    const notes = req.body?.notes !== undefined ? String(req.body.notes || "").trim() || null : current.notes;
    if (!nom) {
      return res.status(400).json({
        error: "Name is required"
      });
    }
    const data = {
      nom,
      expiration,
      fournisseur,
      notes
    };
    const result = await pool.query(`UPDATE v_b_clients_m_licences
       SET item_key = $3, name = $3, data = $4, updated_at = NOW()
       WHERE id = $1 AND client_id = $2
       RETURNING id, client_id, item_key, name, data, is_active, created_at, updated_at`, [licenceId, clientId, nom, JSON.stringify(data)]);
    res.json(mapLicenceRow(result.rows[0]));
  } catch (err) {
    if (err.code === "42P01") {
      return res.status(503).json({
        error: "Licenses module unavailable (migration required)"
      });
    }
    console.error("Error PUT licences:", err);
    res.status(500).json({
      error: "Error updating license",
      details: err.message
    });
  }
});
router.delete('/:id/licences/:licenceId', verifyJWT, requirePermission('clients_detail.solutions'), async (req, res) => {
  try {
    const clientId = await resolveNumericClientId(req.params.id);
    if (!clientId) {
      return res.status(404).json({
        error: "Client not found"
      });
    }
    const licenceId = String(req.params.licenceId || "").trim();
    const result = await pool.query(`DELETE FROM v_b_clients_m_licences
       WHERE id = $1 AND client_id = $2
       RETURNING id`, [licenceId, clientId]);
    if (!result.rows[0]) {
      return res.status(404).json({
        error: "License not found"
      });
    }
    res.status(204).send();
  } catch (err) {
    if (err.code === "42P01") {
      return res.status(503).json({
        error: "Licenses module unavailable (migration required)"
      });
    }
    console.error("Error DELETE licences:", err);
    res.status(500).json({
      error: "Error deleting license",
      details: err.message
    });
  }
});
router.get('/:id/custom-equipment', async (req, res) => {
  try {
    const clientId = await resolveNumericClientId(req.params.id);
    if (!clientId) {
      return res.status(404).json({
        error: "Client not found"
      });
    }
    const familyKey = req.query.familyKey ? String(req.query.familyKey).trim() : null;
    const items = await listClientCustomEquipment(clientId, familyKey || null);
    res.json(items);
  } catch (err) {
    if (err.code === "42P01") {
      return res.status(503).json({
        error: "Equipment families module unavailable (migration required)"
      });
    }
    console.error("Error GET custom-equipment:", err);
    res.status(500).json({
      error: "Error retrieving custom equipment"
    });
  }
});
router.get('/:id/custom-equipment-map', async (req, res) => {
  try {
    const clientId = await resolveNumericClientId(req.params.id);
    if (!clientId) {
      return res.status(404).json({
        error: "Client not found"
      });
    }
    const [families, items] = await Promise.all([listEquipmentFamilies({
      includeDisabled: false
    }), listClientCustomEquipment(clientId)]);
    const grouped = families.map(family => ({
      ...family,
      items: items.filter(item => item.familyKey === family.familyKey),
      count: items.filter(item => item.familyKey === family.familyKey).length
    }));
    res.json({
      families: grouped
    });
  } catch (err) {
    if (err.code === "42P01") {
      return res.status(503).json({
        error: "Equipment families module unavailable (migration required)"
      });
    }
    console.error("Error GET custom-equipment-map:", err);
    res.status(500).json({
      error: "Error retrieving equipment mapping"
    });
  }
});
router.post('/:id/custom-equipment/:familyKey', verifyJWT, requirePermission('clients_detail.devices'), async (req, res) => {
  try {
    const clientId = await resolveNumericClientId(req.params.id);
    if (!clientId) {
      return res.status(404).json({
        error: "Client not found"
      });
    }
    const familyKey = String(req.params.familyKey || "").trim();
    const item = await createClientCustomEquipment(clientId, familyKey, req.body || {});
    try {
      const {
        userId,
        userName
      } = await resolveRequestUserName(req);
      await logEquipmentCreated(pool, {
        clientId,
        family: familyKey,
        equipmentName: item.name || "",
        equipmentId: item.id,
        userId,
        userName,
        data: item.data || {},
        name: item.name,
        isActive: item.isActive !== false
      });
    } catch (logError) {
      console.warn("[POST custom-equipment] equipment log:", logError?.message || logError);
    }
    res.status(201).json(item);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        error: err.message
      });
    }
    if (err.code === "42P01") {
      return res.status(503).json({
        error: "Equipment families module unavailable (migration required)"
      });
    }
    console.error("Error POST custom-equipment:", err);
    res.status(500).json({
      error: "Error creating equipment"
    });
  }
});
router.put('/:id/custom-equipment/:familyKey/:itemId', verifyJWT, requirePermission('clients_detail.devices'), async (req, res) => {
  try {
    const clientId = await resolveNumericClientId(req.params.id);
    if (!clientId) {
      return res.status(404).json({
        error: "Client not found"
      });
    }
    const familyKey = String(req.params.familyKey || "").trim();
    const itemId = String(req.params.itemId || "").trim();
    const {
      item,
      previous
    } = await updateClientCustomEquipment(clientId, familyKey, itemId, req.body || {});
    try {
      const {
        userId,
        userName
      } = await resolveRequestUserName(req);
      await logEquipmentUpdated(pool, {
        clientId,
        family: familyKey,
        equipmentName: item.name || previous?.name || "",
        equipmentId: item.id,
        userId,
        userName,
        oldName: previous?.name || null,
        newName: item.name || null,
        oldIsActive: previous?.isActive,
        newIsActive: item.isActive,
        oldData: previous?.data || {},
        newData: item.data || {}
      });
    } catch (logError) {
      console.warn("[PUT custom-equipment] equipment log:", logError?.message || logError);
    }
    res.json(item);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        error: err.message
      });
    }
    if (err.code === "42P01") {
      return res.status(503).json({
        error: "Equipment families module unavailable (migration required)"
      });
    }
    console.error("Error PUT custom-equipment:", err);
    res.status(500).json({
      error: "Error updating equipment"
    });
  }
});
router.delete('/:id/custom-equipment/:familyKey/:itemId', verifyJWT, requirePermission('clients_detail.devices'), async (req, res) => {
  try {
    const clientId = await resolveNumericClientId(req.params.id);
    if (!clientId) {
      return res.status(404).json({
        error: "Client not found"
      });
    }
    const familyKey = String(req.params.familyKey || "").trim();
    const itemId = String(req.params.itemId || "").trim();
    const deleted = await deleteClientCustomEquipment(clientId, familyKey, itemId);
    try {
      const {
        userId,
        userName
      } = await resolveRequestUserName(req);
      await logEquipmentDeleted(pool, {
        clientId,
        family: familyKey,
        equipmentName: deleted.name || "",
        equipmentId: deleted.id,
        userId,
        userName,
        data: deleted.data || {}
      });
    } catch (logError) {
      console.warn("[DELETE custom-equipment] equipment log:", logError?.message || logError);
    }
    res.status(204).send();
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        error: err.message
      });
    }
    if (err.code === "42P01") {
      return res.status(503).json({
        error: "Equipment families module unavailable (migration required)"
      });
    }
    console.error("Error DELETE custom-equipment:", err);
    res.status(500).json({
      error: "Error deleting equipment"
    });
  }
});
router.delete('/:id/logs', verifyJWT, async (req, res) => {
  try {
    const {
      id
    } = req.params;
    const originalClientId = id;
    let numericClientId = id;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) {
      const clientResult = await pool.query('SELECT id FROM v_b_clients WHERE id::text = $1', [id]);
      if (clientResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Client not found'
        });
      }
      numericClientId = clientResult.rows[0].id;
      console.log(`🔄 DELETE logs: UUID conversion ${id} → numeric ID ${numericClientId}`);
    }
    const logClientId = originalClientId;
    const countResult = await pool.query('SELECT COUNT(*) as total FROM v_b_clients_logs WHERE client_id::text = $1', [logClientId]);
    const logsCount = parseInt(countResult.rows[0].total) || 0;
    const deleteResult = await pool.query('DELETE FROM v_b_clients_logs WHERE client_id::text = $1', [logClientId]);
    const rawUserId = req.user?.id || req.user?.user_id || null;
    const uuidRegexUser = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const userId = rawUserId && uuidRegexUser.test(String(rawUserId)) ? String(rawUserId) : null;
    await pool.query(`INSERT INTO v_b_clients_logs
       (client_id, user_id, action, details, created_at)
       VALUES ($1, $2, $3, $4, NOW())`, [logClientId, userId, 'PURGE_LOGS', JSON.stringify({
      action: 'Full log purge',
      logs_deleted: logsCount,
      timestamp: new Date().toISOString()
    })]);
    res.json({
      success: true,
      message: `Logs purged successfully`,
      logs_deleted: logsCount,
      client_id: logClientId
    });
  } catch (err) {
    console.error('Error purging client logs:', err);
    res.status(500).json({
      error: "Error purging logs",
      details: err.message,
      code: err.code
    });
  }
});
registerClientMetaRoutes(router);
router.get('/:id/deletion-check', async (req, res) => {
  try {
    const {
      id
    } = req.params;
    const exists = await pool.query('SELECT id, name FROM v_b_clients WHERE id = $1', [id]);
    if (exists.rows.length === 0) {
      return res.status(404).json({
        error: 'Company not found'
      });
    }
    const status = await getClientDeletionStatus(id);
    res.json({
      clientId: id,
      name: exists.rows[0].name,
      ...status
    });
  } catch (err) {
    res.status(500).json({
      error: 'Error during verification',
      details: err.message
    });
  }
});
router.get('/:id', async (req, res) => {
  try {
    const {
      id
    } = req.params;
    const result = await pool.query(`
      SELECT c.*, u.username, u.email as user_email
      FROM v_b_clients c
      LEFT JOIN v_b_users u ON c.commercial_id::text = u.id::text
      WHERE c.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Client not found"
      });
    }
    const client = result.rows[0];
    if (!isCommunity()) {
      try {
        const rawModulesData = {};
        for (const [family, table] of Object.entries(MODULE_TABLES)) {
          try {
            let moduleResult;
            const baseSelect = `SELECT id, item_key, name, data, is_active, created_at, updated_at, checkmk_host_name, checkmk_site, checkmk_service_name`;
            const saveExtraSelect = table === 'v_b_clients_m_save' ? ', last_backup_date, last_backup_duration, last_backup_start, hycu_job_uuid, hycu_job_name' : '';
            try {
              moduleResult = await pool.query(`${baseSelect}${saveExtraSelect}
               FROM ${table}
               WHERE client_id = $1
               ORDER BY name NULLS LAST, item_key NULLS LAST`, [id]);
            } catch (colErr) {
              if (colErr.code === '42703') {
                moduleResult = await pool.query(`SELECT id, item_key, name, data, is_active, created_at, updated_at
                 FROM ${table}
                 WHERE client_id = $1
                 ORDER BY name NULLS LAST, item_key NULLS LAST`, [id]);
                moduleResult.rows.forEach(r => {
                  r.checkmk_host_name = null;
                  r.checkmk_site = null;
                  r.checkmk_service_name = null;
                  if (table === 'v_b_clients_m_save') {
                    r.last_backup_date = null;
                    r.last_backup_duration = null;
                    r.hycu_job_uuid = null;
                    r.hycu_job_name = null;
                  }
                });
              } else throw colErr;
            }
            const parsedRows = moduleResult.rows.map(row => {
              if (row.data && typeof row.data === 'string') {
                try {
                  row.data = JSON.parse(row.data);
                } catch (e) {
                  row.data = {};
                }
              } else if (!row.data) {
                row.data = {};
              }
              return applyCheckmkCoalesce(row);
            });
            rawModulesData[family] = parsedRows;
          } catch (err) {
            if (err.code === '42P01') {
              rawModulesData[family] = [];
            } else {
              throw err;
            }
          }
        }
        let azureHasCredentials = false;
        try {
          const azureResult = await pool.query("SELECT 1 FROM v_b_clients_azure WHERE client_id = $1 LIMIT 1", [id]);
          azureHasCredentials = azureResult.rows.length > 0;
        } catch (azureErr) {}
        const transformed = transformClientModulesToFrontend(rawModulesData, {
          azureHasCredentials
        });
        client.modules = transformed.modules || {};
        client.modules_monitoring = transformed.modules_monitoring || {};
        client.equipements = transformed.equipements || {};
      } catch (moduleErr) {
        client.modules = {};
        client.modules_monitoring = {};
        client.equipements = {};
      }
    } else {
      client.modules = {};
      client.modules_monitoring = {};
      client.equipements = {};
    }
    if (client.contrat && typeof client.contrat === 'string') {
      try {
        client.contrat = JSON.parse(client.contrat);
      } catch (e) {
        client.contrat = {};
      }
    }
    let clientOptions = client.options || client.modules || {};
    if (clientOptions && typeof clientOptions === 'string') {
      try {
        clientOptions = JSON.parse(clientOptions);
      } catch (e) {
        clientOptions = {};
      }
    }
    client.options = clientOptions;
    client.modules = clientOptions;
    if (client.sites) {
      if (typeof client.sites === 'string') {
        try {
          client.sites = JSON.parse(client.sites);
        } catch (e) {
          client.sites = [];
        }
      }
    } else {
      client.sites = [];
    }
    const ssidCatalog = resolveClientSsidCatalog(client);
    client.ssid = ssidCatalog;
    client.ssids = ssidCatalog;
    client.commercial = client.username || client.user_email || null;
    res.json(client);
  } catch (err) {
    res.status(500).json({
      error: "Internal error (SQL)",
      details: err.message,
      code: err.code
    });
  }
});
router.post('/', requirePermission('clients.create'), async (req, res) => {
  try {
    await assertCommunityClientsLimit(1);
    const {
      name,
      modules,
      options,
      modules_monitoring,
      contrat,
      commercialId
    } = req.body;
    const defaultOptions = options || modules || {};
    const modulesWithMonitoring = {
      ...defaultOptions,
      Monitoring: true
    };
    const defaultContrat = contrat || {};
    const insertFields = ['name', 'options', 'contrat'];
    const insertValues = [name, JSON.stringify(modulesWithMonitoring), JSON.stringify(defaultContrat)];
    let paramIndex = 4;
    const availableColumns = await getClientsAvailableColumns();
    if (availableColumns.has("statut")) {
      insertFields.push("statut");
      insertValues.push(normalizeClientStatut(req.body.statut));
      paramIndex++;
    }
    if (commercialId && commercialId !== "") {
      insertFields.push('commercial_id');
      insertValues.push(commercialId);
      paramIndex++;
    }
    const placeholders = insertValues.map((_, i) => `$${i + 1}`).join(', ');
    const result = await pool.query(`INSERT INTO v_b_clients (${insertFields.join(', ')})
       VALUES (${placeholders})
       RETURNING id`, insertValues);
    const newClientId = result.rows[0].id;
    invalidateClientsListCache();
    res.status(201).json({
      success: true,
      id: newClientId
    });
  } catch (err) {
    if (err?.code?.startsWith("COMMUNITY_")) {
      return sendCommunityLimitError(res, err);
    }
    res.status(500).json({
      error: "Internal error (SQL)",
      details: err.message,
      code: err.code
    });
  }
});
router.post('/general', requirePermission('clients.create'), async (req, res) => {
  try {
    await assertCommunityClientsLimit(1);
    const {
      name,
      clientNumber,
      client_number,
      contrat,
      options,
      modules,
      modules_monitoring,
      sites,
      ssid,
      ssids,
      commercialId,
      address,
      siret,
      secteur,
      statut
    } = req.body;
    const resolvedClientNumber = normalizeClientNumber(clientNumber !== undefined ? clientNumber : client_number);
    const defaultOptions = options || modules || {
      Support: false,
      Curatif: false,
      Preventif: false,
      Monitoring: false,
      Hebergement: false
    };
    const defaultModulesMonitoring = modules_monitoring || {};
    const finalContrat = contrat || {};
    const cleanSites = sites && Array.isArray(sites) ? sites : [];
    assertCommunitySitesLimit(cleanSites);
    const insertFields = ['name', 'contrat', 'options', 'sites', 'modules'];
    const insertValues = [name, JSON.stringify(finalContrat), JSON.stringify(defaultOptions), JSON.stringify(cleanSites), JSON.stringify(defaultModulesMonitoring || {})];
    if (address !== undefined) {
      insertFields.push('address');
      insertValues.push(address);
    }
    if (siret !== undefined) {
      insertFields.push('siret');
      insertValues.push(siret);
    }
    if (secteur !== undefined) {
      insertFields.push('secteur');
      insertValues.push(secteur);
    }
    if (resolvedClientNumber !== null) {
      insertFields.push('client_number');
      insertValues.push(resolvedClientNumber);
    } else if (clientNumber !== undefined || client_number !== undefined) {
      insertFields.push('client_number');
      insertValues.push(null);
    }
    if (commercialId && commercialId !== "") {
      insertFields.push('commercial_id');
      insertValues.push(commercialId);
    }
    const availableColumns = await getClientsAvailableColumns();
    if (availableColumns.has("statut")) {
      insertFields.push("statut");
      insertValues.push(normalizeClientStatut(statut));
    }
    const placeholders = insertValues.map((_, i) => `$${i + 1}`).join(', ');
    const returningCols = availableColumns.has("statut")
      ? "id, name, client_number, contrat, options, sites, commercial_id, statut, created_at, updated_at"
      : "id, name, client_number, contrat, options, sites, commercial_id, created_at, updated_at";
    const result = await pool.query(`INSERT INTO v_b_clients (${insertFields.join(', ')})
       VALUES (${placeholders})
       RETURNING ${returningCols}`, insertValues);
    invalidateClientsListCache();
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err?.code?.startsWith("COMMUNITY_")) {
      return sendCommunityLimitError(res, err);
    }
    console.error('[POST /general] SQL error:', err.message);
    console.error('[POST /general] Error code:', err.code);
    console.error('[POST /general] SQL used: INSERT with "options" column');
    res.status(500).json({
      error: "Internal error (SQL)",
      details: err.message,
      code: err.code
    });
  }
});

function parseClientJsonObject(value) {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return {
    ...value
  };
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? {
        ...parsed
      } : {};
    } catch {
      return {};
    }
  }
  return {};
}

router.post("/bulk", requirePermission("clients_detail.edit"), async (req, res) => {
  try {
    const rawIds = Array.isArray(req.body?.clientIds) ? req.body.clientIds : [];
    const clientIds = [...new Set(rawIds.map(id => String(id || "").trim()).filter(Boolean))];
    const updates = req.body?.updates && typeof req.body.updates === "object" && !Array.isArray(req.body.updates) ? req.body.updates : {};
    if (clientIds.length === 0) {
      return res.status(400).json({
        error: "No clients selected"
      });
    }
    if (clientIds.length > 200) {
      return res.status(400).json({
        error: "Too many clients (max 200)"
      });
    }
    const commercialId = updates.commercialId !== undefined && updates.commercialId !== null ? String(updates.commercialId).trim() : "";
    const hasCommercial = Boolean(commercialId);
    const hasDebut = Object.prototype.hasOwnProperty.call(updates, "contratDebut");
    const hasExpiration = Object.prototype.hasOwnProperty.call(updates, "contratExpiration");
    const hasOptions = updates.options !== undefined && typeof updates.options === "object" && !Array.isArray(updates.options);
    const hasStatut = Object.prototype.hasOwnProperty.call(updates, "statut");
    if (!hasCommercial && !hasDebut && !hasExpiration && !hasOptions && !hasStatut) {
      return res.status(400).json({
        error: "No updates provided"
      });
    }
    const availableColumns = await getClientsAvailableColumns();
    const hasCommercialCol = availableColumns.has("commercial_id");
    const hasContratCol = availableColumns.has("contrat");
    const hasOptionsCol = availableColumns.has("options");
    const hasStatutCol = availableColumns.has("statut");
    const updatedIds = [];
    const failed = [];
    for (const id of clientIds) {
      try {
        const existing = await pool.query(`SELECT id, contrat, options, commercial_id
           FROM v_b_clients
           WHERE id = $1
           LIMIT 1`, [id]);
        if (!existing.rows[0]) {
          failed.push({
            id,
            error: "Client not found"
          });
          continue;
        }
        const row = existing.rows[0];
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;
        if (hasCommercial && hasCommercialCol) {
          updateFields.push(`commercial_id = $${paramIndex++}`);
          updateValues.push(commercialId);
        }
        if ((hasDebut || hasExpiration) && hasContratCol) {
          const contrat = parseClientJsonObject(row.contrat);
          if (hasDebut) {
            const debut = updates.contratDebut == null ? "" : String(updates.contratDebut).trim();
            contrat.debut = debut || null;
          }
          if (hasExpiration) {
            const expiration = updates.contratExpiration == null ? "" : String(updates.contratExpiration).trim();
            contrat.expiration = expiration || null;
          }
          updateFields.push(`contrat = $${paramIndex++}`);
          updateValues.push(JSON.stringify(contrat));
        }
        if (hasOptions && hasOptionsCol) {
          updateFields.push(`options = $${paramIndex++}`);
          updateValues.push(JSON.stringify(updates.options || {}));
        }
        if (hasStatut && hasStatutCol) {
          updateFields.push(`statut = $${paramIndex++}`);
          updateValues.push(normalizeClientStatut(updates.statut));
        }
        if (updateFields.length === 0) {
          failed.push({
            id,
            error: "Nothing to update"
          });
          continue;
        }
        updateValues.push(id);
        await pool.query(`UPDATE v_b_clients
           SET ${updateFields.join(", ")}
           WHERE id = $${paramIndex}`, updateValues);
        updatedIds.push(id);
      } catch (err) {
        failed.push({
          id,
          error: err.message || "Update failed"
        });
      }
    }
    invalidateClientsListCache();
    return res.json({
      updated: updatedIds.length,
      updatedIds,
      failed
    });
  } catch (err) {
    console.error("Error bulk updating clients:", err);
    return res.status(500).json({
      error: "Error updating companies",
      details: err.message
    });
  }
});

router.put('/:id', verifyJWT, requireClientUpdatePermissions, async (req, res) => {
  try {
    const availableColumns = await getClientsAvailableColumns();
    const hasClientColumn = columnName => availableColumns.has(String(columnName || "").trim());
    const {
      name,
      clientNumber,
      client_number,
      email,
      phone,
      address,
      contrat,
      options,
      modules,
      modules_monitoring,
      sites,
      siteRenames,
      ssid,
      ssids,
      office365_data,
      commercialId,
      siret,
      secteur,
      statut
    } = req.body;
    const resolvedClientNumber = clientNumber !== undefined || client_number !== undefined ? normalizeClientNumber(clientNumber !== undefined ? clientNumber : client_number) : undefined;
    if (name !== undefined || clientNumber !== undefined || client_number !== undefined || email !== undefined || phone !== undefined || address !== undefined || office365_data !== undefined || sites !== undefined || ssid !== undefined || ssids !== undefined || options !== undefined || modules !== undefined || contrat !== undefined || commercialId !== undefined || siret !== undefined || secteur !== undefined || modules_monitoring !== undefined || statut !== undefined) {
      const previousClientSnapshot = await getClientSnapshotForNotification(req.params.id);
      let updateFields = [];
      let updateValues = [];
      let paramIndex = 1;
      if (name !== undefined && hasClientColumn("name")) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(name);
      }
      if (resolvedClientNumber !== undefined && hasClientColumn("client_number")) {
        updateFields.push(`client_number = $${paramIndex++}`);
        updateValues.push(resolvedClientNumber);
      }
      if (email !== undefined && hasClientColumn("email")) {
        updateFields.push(`email = $${paramIndex++}`);
        updateValues.push(email);
      }
      if (phone !== undefined && hasClientColumn("phone")) {
        updateFields.push(`phone = $${paramIndex++}`);
        updateValues.push(phone);
      }
      if (address !== undefined && hasClientColumn("address")) {
        updateFields.push(`address = $${paramIndex++}`);
        updateValues.push(address);
      }
      if (siret !== undefined && hasClientColumn("siret")) {
        updateFields.push(`siret = $${paramIndex++}`);
        updateValues.push(siret);
      }
      if (secteur !== undefined && hasClientColumn("secteur")) {
        updateFields.push(`secteur = $${paramIndex++}`);
        updateValues.push(secteur);
      }
      if (statut !== undefined && hasClientColumn("statut")) {
        updateFields.push(`statut = $${paramIndex++}`);
        updateValues.push(normalizeClientStatut(statut));
      }
      if (commercialId !== undefined && commercialId !== "" && hasClientColumn("commercial_id")) {
        updateFields.push(`commercial_id = $${paramIndex++}`);
        updateValues.push(commercialId);
      }
      let finalContrat = undefined;
      let finalOptions = undefined;
      let finalModulesMonitoring = undefined;
      if (contrat !== undefined && hasClientColumn("contrat")) {
        finalContrat = contrat || {};
        updateFields.push(`contrat = $${paramIndex++}`);
        updateValues.push(JSON.stringify(finalContrat));
      }
      if ((options !== undefined || modules !== undefined) && hasClientColumn("options")) {
        finalOptions = options || modules || {};
        updateFields.push(`options = $${paramIndex++}`);
        updateValues.push(JSON.stringify(finalOptions));
      }
      if (modules_monitoring !== undefined && hasClientColumn("modules")) {
        finalModulesMonitoring = modules_monitoring || {};
        updateFields.push(`modules = $${paramIndex++}`);
        updateValues.push(JSON.stringify(finalModulesMonitoring));
      }
      if (sites !== undefined && hasClientColumn("sites")) {
        assertCommunitySitesLimit(sites || []);
        updateFields.push(`sites = $${paramIndex++}`);
        updateValues.push(JSON.stringify(sites || []));
      }
      if (office365_data !== undefined && office365_data !== null && hasClientColumn("office365_data")) {
        updateFields.push(`office365_data = $${paramIndex++}`);
        updateValues.push(typeof office365_data === 'object' ? JSON.stringify(office365_data) : office365_data);
      }
      paramIndex = appendClientSsidUpdate({
        ssid,
        ssids,
        hasClientColumn,
        updateFields,
        updateValues,
        paramIndex
      });
      if (updateFields.length === 0) {
        // Body fields were ignored (e.g. email/phone columns absent) — not a hard failure.
        const current = await pool.query(
          `SELECT id, name, client_number, contrat, options, sites, commercial_id, created_at, updated_at
           FROM v_b_clients WHERE id = $1`,
          [req.params.id]
        );
        if (!current.rows[0]) {
          return res.status(404).json({ error: "Client not found" });
        }
        return res.json({ ...current.rows[0], unchanged: true });
      }
      updateValues.push(req.params.id);
      const idParamIndex = paramIndex;
      const updateQuery = `
        UPDATE v_b_clients 
        SET ${updateFields.join(', ')}
        WHERE id = $${idParamIndex}
      `;
      await pool.query(updateQuery, updateValues);
      if (sites !== undefined && hasClientColumn("sites")) {
        await propagateClientSiteRenames(
          req.params.id,
          previousClientSnapshot?.sites,
          sites || [],
          { explicitRenames: siteRenames }
        ).catch(err => {
          console.error("[clients] site rename propagation failed:", err?.message || err);
        });
        try {
          const validIds = (Array.isArray(sites) ? sites : [])
            .map(site => String(site?.id || "").trim())
            .filter(Boolean);
          await pruneOrphanSiteLinksForClient(req.params.id, validIds);
        } catch (err) {
          console.error("[clients] site link prune failed:", err?.message || err);
        }
      }
      await logClientUpdate({
        req,
        updateFields,
        valueMap: {
          name,
          client_number: resolvedClientNumber,
          email,
          phone,
          address,
          siret,
          secteur,
          commercial_id: commercialId,
          contrat: finalContrat,
          options: finalOptions,
          modules_monitoring: finalModulesMonitoring,
          sites,
          office365_data,
          ssid: ssids !== undefined ? ssids : ssid
        }
      });
      const changedFieldNames = updateFields.map(field => String(field).split("=")[0]?.trim()).filter(Boolean);
      const changedFieldNamesWithFallback = changedFieldNames.length > 0 ? changedFieldNames : Object.keys(req.body || {}).map(key => String(key || "").trim()).filter(Boolean);
      const nextValueMapForNotification = {
        name: name !== undefined ? name : previousClientSnapshot?.name ?? null,
        email: email !== undefined ? email : previousClientSnapshot?.email ?? null,
        phone: phone !== undefined ? phone : previousClientSnapshot?.phone ?? null,
        address: address !== undefined ? address : previousClientSnapshot?.address ?? null,
        siret: siret !== undefined ? siret : previousClientSnapshot?.siret ?? null,
        secteur: secteur !== undefined ? secteur : previousClientSnapshot?.secteur ?? null,
        commercial_id: commercialId !== undefined && commercialId !== "" ? commercialId : previousClientSnapshot?.commercial_id ?? null,
        contrat: finalContrat !== undefined ? finalContrat : previousClientSnapshot?.contrat ?? null,
        options: finalOptions !== undefined ? finalOptions : previousClientSnapshot?.options ?? null,
        modules: finalModulesMonitoring !== undefined ? finalModulesMonitoring : previousClientSnapshot?.modules ?? null,
        sites: sites !== undefined ? sites || [] : previousClientSnapshot?.sites ?? null,
        office365_data: office365_data !== undefined && office365_data !== null ? office365_data : previousClientSnapshot?.office365_data ?? null
      };
      const notificationChanges = buildNotificationChanges(previousClientSnapshot || {}, changedFieldNamesWithFallback, nextValueMapForNotification);
      dispatchNotificationEvent({
        source: "entreprise",
        element: "updated",
        enterpriseId: String(req.params.id || ""),
        user: req.user,
        context: {
          entreprise: {
            id: String(req.params.id || ""),
            nom: name || previousClientSnapshot?.name || ""
          },
          changedFields: changedFieldNamesWithFallback,
          changes: notificationChanges
        }
      }).catch(() => {});
      if (changedFieldNamesWithFallback.includes("contrat")) {
        dispatchNotificationEvent({
          source: "entreprise",
          element: "contract_info_updated",
          enterpriseId: String(req.params.id || ""),
          user: req.user,
          context: {
            entreprise: {
              id: String(req.params.id || ""),
              nom: name || previousClientSnapshot?.name || ""
            },
            changedFields: changedFieldNamesWithFallback,
            changes: notificationChanges
          }
        }).catch(() => {});
      }
      if (changedFieldNamesWithFallback.includes("office365_data")) {
        dispatchNotificationEvent({
          source: "services",
          element: "tenant_updated",
          enterpriseId: String(req.params.id || ""),
          user: req.user,
          context: {
            entreprise: {
              id: String(req.params.id || ""),
              nom: name || previousClientSnapshot?.name || ""
            },
            changedFields: changedFieldNamesWithFallback,
            changes: notificationChanges
          }
        }).catch(() => {});
      }
      invalidateClientsListCache();
      res.json({
        success: true
      });
    } else {
      const defaultOptions = options || modules || {};
      const modulesWithMonitoring = {
        ...defaultOptions,
        Monitoring: true
      };
      const defaultContrat = contrat || {};
      await pool.query(`UPDATE v_b_clients 
         SET name = $1, options = $2, contrat = $3
         WHERE id = $4`, [name, JSON.stringify(modulesWithMonitoring), JSON.stringify(defaultContrat), req.params.id]);
      dispatchNotificationEvent({
        source: "entreprise",
        element: "updated",
        enterpriseId: String(req.params.id || ""),
        user: req.user,
        context: {
          entreprise: {
            id: String(req.params.id || ""),
            nom: name || ""
          }
        }
      }).catch(() => {});
      invalidateClientsListCache();
      res.json({
        success: true
      });
    }
  } catch (err) {
    res.status(500).json({
      error: "Internal error (SQL)",
      details: err.message,
      code: err.code
    });
  }
});
router.put('/general/:id', verifyJWT, requireClientUpdatePermissions, async (req, res) => {
  try {
    const availableColumns = await getClientsAvailableColumns();
    const hasClientColumn = columnName => availableColumns.has(String(columnName || "").trim());
    const {
      name,
      clientNumber,
      client_number,
      email,
      phone,
      address,
      contrat,
      options,
      modules,
      modules_monitoring,
      sites,
      siteRenames,
      ssid,
      ssids,
      office365_data,
      commercialId,
      siret,
      secteur,
      statut
    } = req.body;
    const resolvedClientNumber = clientNumber !== undefined || client_number !== undefined ? normalizeClientNumber(clientNumber !== undefined ? clientNumber : client_number) : undefined;
    const previousClientSnapshot = await getClientSnapshotForNotification(req.params.id);
    let updateFields = [];
    let updateValues = [];
    let paramIndex = 1;
    if (name !== undefined && hasClientColumn("name")) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(name);
    }
    if (resolvedClientNumber !== undefined && hasClientColumn("client_number")) {
      updateFields.push(`client_number = $${paramIndex++}`);
      updateValues.push(resolvedClientNumber);
    }
    if (email !== undefined && hasClientColumn("email")) {
      updateFields.push(`email = $${paramIndex++}`);
      updateValues.push(email);
    }
    if (phone !== undefined && hasClientColumn("phone")) {
      updateFields.push(`phone = $${paramIndex++}`);
      updateValues.push(phone);
    }
    if (address !== undefined && hasClientColumn("address")) {
      updateFields.push(`address = $${paramIndex++}`);
      updateValues.push(address);
    }
    if (siret !== undefined && hasClientColumn("siret")) {
      updateFields.push(`siret = $${paramIndex++}`);
      updateValues.push(siret);
    }
    if (secteur !== undefined && hasClientColumn("secteur")) {
      updateFields.push(`secteur = $${paramIndex++}`);
      updateValues.push(secteur);
    }
    if (statut !== undefined && hasClientColumn("statut")) {
      updateFields.push(`statut = $${paramIndex++}`);
      updateValues.push(normalizeClientStatut(statut));
    }
    if (commercialId !== undefined && commercialId !== "" && hasClientColumn("commercial_id")) {
      updateFields.push(`commercial_id = $${paramIndex++}`);
      updateValues.push(commercialId);
    }
    let finalContrat = undefined;
    let finalOptions = undefined;
    let finalModulesMonitoring = undefined;
    if (contrat !== undefined && hasClientColumn("contrat")) {
      finalContrat = contrat || {};
      updateFields.push(`contrat = $${paramIndex++}`);
      updateValues.push(JSON.stringify(finalContrat));
    }
    if ((options !== undefined || modules !== undefined) && hasClientColumn("options")) {
      finalOptions = options || modules || {};
      updateFields.push(`options = $${paramIndex++}`);
      updateValues.push(JSON.stringify(finalOptions));
    }
    if (modules_monitoring !== undefined && hasClientColumn("modules")) {
      finalModulesMonitoring = modules_monitoring || {};
      updateFields.push(`modules = $${paramIndex++}`);
      updateValues.push(JSON.stringify(finalModulesMonitoring));
    }
    if (sites !== undefined && hasClientColumn("sites")) {
      assertCommunitySitesLimit(sites || []);
      updateFields.push(`sites = $${paramIndex++}`);
      updateValues.push(JSON.stringify(sites || []));
    }
    if (office365_data !== undefined && hasClientColumn("office365_data")) {
      updateFields.push(`office365_data = $${paramIndex++}`);
      updateValues.push(typeof office365_data === 'object' ? JSON.stringify(office365_data) : office365_data);
    }
    paramIndex = appendClientSsidUpdate({
      ssid,
      ssids,
      hasClientColumn,
      updateFields,
      updateValues,
      paramIndex
    });
    updateValues.push(req.params.id);
    if (updateFields.length === 0) {
      // Body fields were ignored (e.g. email/phone columns absent) — not a hard failure.
      const current = await pool.query(
        `SELECT id, name, client_number, contrat, options, sites, commercial_id, created_at, updated_at
         FROM v_b_clients WHERE id = $1`,
        [req.params.id]
      );
      if (!current.rows[0]) {
        return res.status(404).json({ error: "Client not found" });
      }
      return res.json({ ...current.rows[0], unchanged: true });
    }
    const updateQuery = `
      UPDATE v_b_clients 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
    `;
    await pool.query(updateQuery, updateValues);
    if (sites !== undefined && hasClientColumn("sites")) {
      await propagateClientSiteRenames(
        req.params.id,
        previousClientSnapshot?.sites,
        sites || [],
        { explicitRenames: siteRenames }
      ).catch(err => {
        console.error("[clients/general] site rename propagation failed:", err?.message || err);
      });
      try {
        const validIds = (Array.isArray(sites) ? sites : [])
          .map(site => String(site?.id || "").trim())
          .filter(Boolean);
        await pruneOrphanSiteLinksForClient(req.params.id, validIds);
      } catch (err) {
        console.error("[clients/general] site link prune failed:", err?.message || err);
      }
    }
    await logClientUpdate({
      req,
      updateFields,
      valueMap: {
        name,
        client_number: resolvedClientNumber,
        email,
        phone,
        address,
        siret,
        secteur,
        commercial_id: commercialId,
        contrat: finalContrat,
        options: finalOptions,
        modules_monitoring: finalModulesMonitoring,
        sites,
        office365_data,
        ssid: ssids !== undefined ? ssids : ssid
      }
    });
    try {
      const userId = req.user?.id || req.user?.user_id || null;
      let userName = 'Unknown user';
      if (userId) {
        try {
          const userIdStr = String(userId);
          const userResult = await pool.query(`SELECT email, username
             FROM v_b_users
             WHERE id::text = $1`, [userIdStr]);
          if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            userName = user.email || user.username || 'Unknown user';
          }
        } catch (userError) {
          userName = req.user?.name || req.user?.username || req.user?.email || 'Unknown user';
        }
      }
      const action = `Client update`;
      const details = JSON.stringify({
        modifiedFields: updateFields.map(field => field.replace(' = $' + paramIndex + '::text', '').replace(' = $' + paramIndex, '')).filter(field => !field.includes('updated_at'))
      });
      await pool.query(`INSERT INTO v_b_clients_m_logs
         (client_id, equipment_family, equipment_name, equipment_id, user_id, user_name, action, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [req.params.id, 'client', 'General client', null, userId, userName, action, details]);
    } catch (logError) {
      console.warn('Error writing log:', logError);
    }
    invalidateClientsListCache();
    const changedFieldNames = updateFields.map(field => String(field).split("=")[0]?.trim()).filter(Boolean);
    const changedFieldNamesWithFallback = changedFieldNames.length > 0 ? changedFieldNames : Object.keys(req.body || {}).map(key => String(key || "").trim()).filter(Boolean);
    const nextValueMapForNotification = {
      name: name !== undefined ? name : previousClientSnapshot?.name ?? null,
      email: email !== undefined ? email : previousClientSnapshot?.email ?? null,
      phone: phone !== undefined ? phone : previousClientSnapshot?.phone ?? null,
      address: address !== undefined ? address : previousClientSnapshot?.address ?? null,
      siret: siret !== undefined ? siret : previousClientSnapshot?.siret ?? null,
      secteur: secteur !== undefined ? secteur : previousClientSnapshot?.secteur ?? null,
      commercial_id: commercialId !== undefined && commercialId !== "" ? commercialId : previousClientSnapshot?.commercial_id ?? null,
      contrat: finalContrat !== undefined ? finalContrat : previousClientSnapshot?.contrat ?? null,
      options: finalOptions !== undefined ? finalOptions : previousClientSnapshot?.options ?? null,
      modules: finalModulesMonitoring !== undefined ? finalModulesMonitoring : previousClientSnapshot?.modules ?? null,
      sites: sites !== undefined ? sites || [] : previousClientSnapshot?.sites ?? null,
      office365_data: office365_data !== undefined ? office365_data : previousClientSnapshot?.office365_data ?? null
    };
    const notificationChanges = buildNotificationChanges(previousClientSnapshot || {}, changedFieldNamesWithFallback, nextValueMapForNotification);
    dispatchNotificationEvent({
      source: "entreprise",
      element: "updated",
      enterpriseId: String(req.params.id || ""),
      user: req.user,
      context: {
        entreprise: {
          id: String(req.params.id || ""),
          nom: name || previousClientSnapshot?.name || ""
        },
        changedFields: changedFieldNamesWithFallback,
        changes: notificationChanges
      }
    }).catch(() => {});
    if (changedFieldNamesWithFallback.includes("contrat")) {
      dispatchNotificationEvent({
        source: "entreprise",
        element: "contract_info_updated",
        enterpriseId: String(req.params.id || ""),
        user: req.user,
        context: {
          entreprise: {
            id: String(req.params.id || ""),
            nom: name || previousClientSnapshot?.name || ""
          },
          changedFields: changedFieldNamesWithFallback,
          changes: notificationChanges
        }
      }).catch(() => {});
    }
    if (changedFieldNamesWithFallback.includes("office365_data")) {
      dispatchNotificationEvent({
        source: "services",
        element: "tenant_updated",
        enterpriseId: String(req.params.id || ""),
        user: req.user,
        context: {
          entreprise: {
            id: String(req.params.id || ""),
            nom: name || previousClientSnapshot?.name || ""
          },
          changedFields: changedFieldNamesWithFallback,
          changes: notificationChanges
        }
      }).catch(() => {});
    }
    res.json({
      success: true
    });
  } catch (err) {
    res.status(500).json({
      error: "Internal error (SQL)",
      details: err.message,
      code: err.code
    });
  }
});
router.delete('/:id', requirePermission('clients_detail.delete'), async (req, res) => {
  try {
    const {
      id
    } = req.params;
    const forceRaw = req.query?.force ?? req.body?.force;
    const force = forceRaw === true || forceRaw === "true" || forceRaw === "1" || forceRaw === 1;

    if (force) {
      const result = await forceDeleteClientWithLinkedItems(id);
      if (!result.deleted) {
        return res.status(404).json({
          error: "Company not found.",
          code: "CLIENT_NOT_FOUND"
        });
      }
      invalidateClientsListCache();
      return res.json({
        success: true,
        forced: true,
        purged: result.purged
      });
    }

    const deletionStatus = await getClientDeletionStatus(id);
    if (!deletionStatus.deletable) {
      return res.status(409).json({
        error: "Deletion not possible: items are still linked to this company.",
        code: "CLIENT_HAS_DEPENDENCIES",
        blockers: deletionStatus.blockers,
        totalBlockers: deletionStatus.totalBlockers
      });
    }
    await pool.query('DELETE FROM v_b_clients WHERE id = $1', [id]);
    invalidateClientsListCache();
    res.json({
      success: true
    });
  } catch (err) {
    console.error("[DELETE /clients/:id]", err.message);
    const isForceResidue = String(err.message || "").includes("Force delete left residues") || String(err.message || "").includes("Unable to purge linked tables");
    res.status(isForceResidue ? 409 : 500).json({
      error: isForceResidue ? err.message : "Internal error (SQL)",
      details: err.message,
      code: isForceResidue ? "CLIENT_FORCE_DELETE_RESIDUE" : err.code
    });
  }
});
const modulesRouter = express.Router();
modulesRouter.use(verifyJWT);
const TABLES = {
  internet: "v_b_clients_m_internet",
  server: "v_b_clients_m_servers",
  servers: "v_b_clients_m_servers",
  stockage: "v_b_clients_m_stockage",
  nas: "v_b_clients_m_stockage",
  firewall: "v_b_clients_m_firewall",
  switch: "v_b_clients_m_switch",
  wifi: "v_b_clients_m_wifi",
  "bornes-wifi": "v_b_clients_m_wifi",
  alimentation: "v_b_clients_m_alimentation",
  routeur: "v_b_clients_m_routeur",
  toip: "v_b_clients_m_toip",
  save: "v_b_clients_m_save",
  antivirus: "v_b_clients_m_antivirus",
  antispam: "v_b_clients_m_antispam",
  ndd: "v_b_clients_m_ndd",
  ssl: "v_b_clients_m_ssl",
  licences: "v_b_clients_m_licences",
  o365: "v_b_clients_m_o365",
  ordinateurs: "v_b_clients_m_ordinateurs",
  ordinateur: "v_b_clients_m_ordinateurs"
};
function resolveTable(family) {
  const key = family?.toLowerCase();
  return TABLES[key] || null;
}
const SERVICE_MODULE_FAMILIES = new Set(["save", "antivirus", "antispam", "ndd", "ssl", "licences", "o365"]);
function requireModulePermission(_action) {
  return (req, res, next) => {
    const family = String(req.params.family || "").toLowerCase();
    if (SERVICE_MODULE_FAMILIES.has(family)) {
      return requirePermission("clients_detail.solutions")(req, res, next);
    }
    return requirePermission("clients_detail.devices")(req, res, next);
  };
}
modulesRouter.get('/:clientId/:family', requireAnyPermission("services.view", "infrastructure.view"), async (req, res) => {
  try {
    const {
      clientId,
      family
    } = req.params;
    const table = resolveTable(family);
    if (!table) return res.status(400).json({
      error: "Famille inconnue"
    });
    const result = await pool.query(`SELECT id, client_id, item_key, name, data, is_active, created_at, updated_at
       FROM ${table}
       WHERE client_id = $1
       ORDER BY id ASC`, [clientId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({
      error: "Server error"
    });
  }
});
modulesRouter.post('/:clientId/:family', requireModulePermission("create"), async (req, res) => {
  try {
    const {
      clientId,
      family
    } = req.params;
    const {
      item_key,
      name,
      data,
      is_active
    } = req.body || {};
    const table = resolveTable(family);
    if (!table) return res.status(400).json({
      error: "Famille inconnue"
    });
    if (!clientId) return res.status(400).json({
      error: "clientId required"
    });
    const finalName = name || item_key || null;
    // Prefer a stable unique key so duplicate display names never collide/overwrite.
    const requestedKey = item_key != null ? String(item_key).trim() : "";
    const finalItemKey = requestedKey && requestedKey !== String(finalName || "").trim() ? requestedKey : finalName ? `${String(finalName).trim()}-${randomUUID()}` : randomUUID();
    let result;
    try {
      result = await pool.query(`INSERT INTO ${table} (client_id, item_key, name, data, is_active)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`, [clientId, finalItemKey, finalName, data || null, is_active !== false]);
    } catch (insertErr) {
      if (insertErr?.code === "23505") {
        return res.status(409).json({
          error: "An item with this unique key or name already exists for this client."
        });
      }
      throw insertErr;
    }
    const created = result.rows[0];
    try {
      const {
        userId,
        userName
      } = await resolveRequestUserName(req);
      await logEquipmentCreated(pool, {
        clientId,
        family,
        equipmentName: created.name || finalName || "",
        equipmentId: created.id,
        userId,
        userName,
        data: created.data || data || {},
        name: created.name || finalName,
        isActive: created.is_active !== false
      });
    } catch (logError) {
      console.warn("[POST modules] equipment log:", logError?.message || logError);
    }
    res.status(201).json(created);
  } catch (err) {
    console.error("[POST modules]", err.message);
    res.status(500).json({
      error: "Server error"
    });
  }
});
modulesRouter.get('/:clientId/:family/:equipmentName/logs', requireAnyPermission("services.view", "infrastructure.view"), async (req, res) => {
  try {
    const {
      clientId,
      family,
      equipmentName
    } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const logQuery = buildEquipmentLogQuery({
      clientId,
      family,
      equipmentName,
      equipmentDbId: req.query.equipment_id ? String(req.query.equipment_id).trim() : null,
      search: req.query.search,
      category: req.query.category
    });
    const result = await pool.query(`SELECT 
        id,
        client_id,
        equipment_family,
        equipment_name,
        equipment_id,
        user_id,
        user_name,
        action,
        details,
        created_at
       FROM v_b_clients_m_logs
       WHERE ${logQuery.where}
       ORDER BY created_at DESC
       LIMIT $${logQuery.params.length + 1} OFFSET $${logQuery.params.length + 2}`, [...logQuery.params, limit, offset]);
    const countResult = await pool.query(`SELECT COUNT(*) as total
       FROM v_b_clients_m_logs
       WHERE ${logQuery.where}`, logQuery.params);
    const total = parseInt(countResult.rows[0].total) || 0;
    res.json({
      logs: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      filters: {
        search: logQuery.search,
        category: logQuery.category
      }
    });
  } catch (err) {
    res.status(500).json({
      error: "Server error"
    });
  }
});
modulesRouter.delete('/:clientId/:family/:equipmentName/logs', requireModulePermission("edit"), async (req, res) => {
  try {
    const {
      clientId,
      family,
      equipmentName
    } = req.params;
    const logQuery = buildEquipmentLogQuery({
      clientId,
      family,
      equipmentName,
      equipmentDbId: req.query.equipment_id ? String(req.query.equipment_id).trim() : null,
      search: req.query.search,
      category: req.query.category
    });
    const countResult = await pool.query(`SELECT COUNT(*) as total
       FROM v_b_clients_m_logs
       WHERE ${logQuery.where}`, logQuery.params);
    const logsDeleted = parseInt(countResult.rows[0].total) || 0;
    if (logsDeleted > 0) {
      await pool.query(`DELETE FROM v_b_clients_m_logs
         WHERE ${logQuery.where}`, logQuery.params);
    }
    res.json({
      success: true,
      logs_deleted: logsDeleted,
      filters: {
        search: logQuery.search,
        category: logQuery.category
      }
    });
  } catch (err) {
    console.error("[DELETE equipment logs]", err.message);
    res.status(500).json({
      error: "Server error"
    });
  }
});
async function resolveRequestUserName(req) {
  const userId = req.user?.id || req.user?.user_id || null;
  if (!userId) {
    return {
      userId: null,
      userName: req.user?.name || req.user?.username || req.user?.email || "Unknown user"
    };
  }
  try {
    const userResult = await pool.query(`SELECT email, username FROM v_b_users WHERE id::text = $1`, [String(userId)]);
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      return {
        userId,
        userName: user.email || user.username || "Unknown user"
      };
    }
  } catch {}
  return {
    userId,
    userName: req.user?.name || req.user?.username || req.user?.email || "Unknown user"
  };
}
modulesRouter.post('/:clientId/:family/:equipmentName/logs', requireModulePermission("edit"), async (req, res) => {
  try {
    const {
      clientId,
      family,
      equipmentName
    } = req.params;
    const {
      action,
      details,
      equipment_id
    } = req.body || {};
    if (!action || !String(action).trim()) {
      return res.status(400).json({
        error: "action required"
      });
    }
    const decodedEquipmentName = decodeURIComponent(equipmentName);
    const {
      userId,
      userName
    } = await resolveRequestUserName(req);
    await pool.query(`INSERT INTO v_b_clients_m_logs
         (client_id, equipment_family, equipment_name, equipment_id, user_id, user_name, action, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [clientId, family, decodedEquipmentName, equipment_id || null, userId, userName, String(action).trim(), details != null ? JSON.stringify(details) : null]);
    res.status(201).json({
      success: true
    });
  } catch (err) {
    console.error("[POST equipment logs]", err.message);
    res.status(500).json({
      error: "Server error"
    });
  }
});
modulesRouter.put('/:clientId/:family/:id', requireModulePermission("edit"), async (req, res) => {
  try {
    const {
      clientId,
      family,
      id
    } = req.params;
    const {
      item_key,
      name,
      data,
      is_active
    } = req.body || {};
    const table = resolveTable(family);
    if (!table) return res.status(400).json({
      error: "Famille inconnue"
    });
    const oldResult = await pool.query(`SELECT name, item_key, data, is_active FROM ${table}
       WHERE id = $1 AND client_id = $2`, [id, clientId]);
    if (oldResult.rows.length === 0) return res.status(404).json({
      error: "Not found"
    });
    const oldItem = oldResult.rows[0];
    let oldData = oldItem.data;
    if (oldData && typeof oldData === 'string') {
      try {
        oldData = JSON.parse(oldData);
      } catch (e) {
        oldData = {};
      }
    }
    oldData = oldData || {};
    const newData = data || {};
    const dataToSave = family === 'servers' && typeof newData === 'object' ? {
      ...oldData,
      ...newData,
      role: Array.isArray(newData.role) ? newData.role : Array.isArray(oldData.role) ? oldData.role : []
    } : family === 'nas' && typeof newData === 'object' ? {
      ...oldData,
      ...newData
    } : (family === 'ordinateurs' || family === 'ordinateur') && typeof newData === 'object' ? {
      ...oldData,
      ...newData
    } : data || null;
    let result;
    try {
      // Keep item_key stable: display name can be duplicated without colliding keys.
      result = await pool.query(`UPDATE ${table}
       SET name = $1,
           data = $2,
           is_active = $3,
           updated_at = NOW()
       WHERE id = $4 AND client_id = $5
       RETURNING *`, [name || item_key || oldItem.name || oldItem.item_key || null, dataToSave, is_active !== false, id, clientId]);
    } catch (updateErr) {
      if (updateErr?.code === "23505") {
        return res.status(409).json({
          error: "An item with this unique key or name already exists for this client."
        });
      }
      throw updateErr;
    }
    if (result.rows.length === 0) return res.status(404).json({
      error: "Not found"
    });
    const updatedItem = result.rows[0];
    const equipmentName = name || item_key || oldItem.name || oldItem.item_key || updatedItem.name || updatedItem.item_key || '';
    try {
      const {
        userId,
        userName
      } = await resolveRequestUserName(req);
      await logEquipmentUpdated(pool, {
        clientId,
        family,
        equipmentName,
        equipmentId: id,
        userId,
        userName,
        oldName: oldItem.name || oldItem.item_key || null,
        newName: name || item_key || oldItem.name || oldItem.item_key || null,
        oldIsActive: oldItem.is_active,
        newIsActive: is_active !== false,
        oldData,
        newData: dataToSave || {}
      });
    } catch (logError) {
      console.warn("[PUT modules] equipment log:", logError?.message || logError);
    }
    res.json(updatedItem);
  } catch (err) {
    res.status(500).json({
      error: "Server error"
    });
  }
});
modulesRouter.patch('/:clientId/:family/checkmk-mapping', requireModulePermission("edit"), async (req, res) => {
  try {
    const {
      clientId,
      family
    } = req.params;
    const {
      equipmentName,
      equipment_id,
      checkmk_host_name,
      checkmk_site,
      checkmk_service_name
    } = req.body || {};
    const table = resolveTable(family);
    if (!table) return res.status(400).json({
      error: "Famille inconnue"
    });
    if ((!equipmentName || !String(equipmentName).trim()) && !equipment_id) {
      return res.status(400).json({
        error: "equipmentName ou equipment_id required"
      });
    }
    const hostName = checkmk_host_name && String(checkmk_host_name).trim() ? String(checkmk_host_name).trim() : null;
    const siteVal = checkmk_site && String(checkmk_site).trim() ? String(checkmk_site).trim() : null;
    const serviceVal = checkmk_service_name && String(checkmk_service_name).trim() ? String(checkmk_service_name).trim() : null;
    const nameVal = equipmentName ? String(equipmentName).trim() : null;
    const equipmentIdVal = equipment_id ? String(equipment_id).trim() : null;
    const columnsResult = await pool.query(`SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1`, [table]);
    const availableColumns = new Set(columnsResult.rows.map(r => r.column_name));
    const hasCheckmkColumns = availableColumns.has('checkmk_host_name') && availableColumns.has('checkmk_site') && availableColumns.has('checkmk_service_name');
    const hasHycuColumns = availableColumns.has('hycu_job_uuid') && availableColumns.has('hycu_job_name');
    const whereClause = equipmentIdVal ? `client_id::text = $4::text AND id::text = $5::text` : `client_id::text = $4::text AND (name = $5 OR item_key = $5 OR (data IS NOT NULL AND data::jsonb->>'nom' = $5))`;
    const whereParams = equipmentIdVal ? [clientId, equipmentIdVal] : [clientId, nameVal];
    const previousResult = await pool.query(
      `SELECT id, name, item_key, data,
              ${hasCheckmkColumns ? "checkmk_host_name, checkmk_site, checkmk_service_name" : "NULL::varchar AS checkmk_host_name, NULL::varchar AS checkmk_site, NULL::varchar AS checkmk_service_name"},
              ${hasHycuColumns ? "hycu_job_uuid, hycu_job_name" : "NULL::text AS hycu_job_uuid, NULL::text AS hycu_job_name"}
         FROM ${table}
        WHERE ${equipmentIdVal ? "client_id::text = $1::text AND id::text = $2::text" : "client_id::text = $1::text AND (name = $2 OR item_key = $2 OR (data IS NOT NULL AND data::jsonb->>'nom' = $2))"}
        LIMIT 1`,
      whereParams
    );
    let result;
    // Setting CheckMK mapping replaces HYCU mapping on the same job (single sync source).
    const clearHycuSql = hasHycuColumns
      ? `, hycu_job_uuid = NULL, hycu_job_name = NULL`
      : "";
    const clearHycuJson = `,
               'hycu_job_uuid', 'null'::jsonb,
               'hycu_job_name', 'null'::jsonb,
               'hycuMapping', 'null'::jsonb`;
    if (hasCheckmkColumns) {
      result = await pool.query(`UPDATE ${table}
         SET checkmk_host_name = $1::varchar,
             checkmk_site = $2::varchar,
             checkmk_service_name = $3::varchar${clearHycuSql},
             data = (COALESCE(data::jsonb, '{}'::jsonb) || jsonb_build_object(
               'checkmk_host_name', to_jsonb($1::varchar),
               'checkmk_site', to_jsonb($2::varchar),
               'checkmk_service_name', to_jsonb($3::varchar)${clearHycuJson}
             )) - 'hycuMapping',
             updated_at = NOW()
         WHERE ${whereClause}
         RETURNING id, name, item_key, checkmk_host_name, checkmk_site, checkmk_service_name`, [hostName, siteVal, serviceVal, ...whereParams]);
    } else {
      result = await pool.query(`UPDATE ${table}
         SET data = (COALESCE(data::jsonb, '{}'::jsonb) || jsonb_build_object(
               'checkmk_host_name', to_jsonb($1::varchar),
               'checkmk_site', to_jsonb($2::varchar),
               'checkmk_service_name', to_jsonb($3::varchar)${clearHycuJson}
             )) - 'hycuMapping',
             updated_at = NOW()
         WHERE ${whereClause}
         RETURNING id, name, item_key,
                   data::jsonb->>'checkmk_host_name' AS checkmk_host_name,
                   data::jsonb->>'checkmk_site' AS checkmk_site,
                   data::jsonb->>'checkmk_service_name' AS checkmk_service_name`, [hostName, siteVal, serviceVal, ...whereParams]);
    }
    if (result.rows.length === 0) {
      if (equipmentIdVal) {
        return res.status(404).json({
          error: "Equipment not found",
          details: `No row with client_id=${clientId} and id=${equipmentIdVal} in ${table}`
        });
      }
      return res.status(404).json({
        error: "Equipment not found",
        details: `No row with client_id=${clientId} and name="${nameVal}" in ${table}`
      });
    }
    const mapping = result.rows[0];
    try {
      const prev = previousResult.rows[0] || {};
      const prevData = typeof prev.data === "string" ? (() => {
        try {
          return JSON.parse(prev.data);
        } catch {
          return {};
        }
      })() : prev.data || {};
      const {
        userId,
        userName
      } = await resolveRequestUserName(req);
      await logEquipmentUpdated(pool, {
        clientId,
        family,
        equipmentName: mapping.name || mapping.item_key || nameVal || "",
        equipmentId: mapping.id,
        userId,
        userName,
        oldName: prev.name || prev.item_key || nameVal || null,
        newName: mapping.name || mapping.item_key || nameVal || null,
        oldData: {
          checkmk_host_name: prev.checkmk_host_name || prevData.checkmk_host_name || null,
          checkmk_site: prev.checkmk_site || prevData.checkmk_site || null,
          checkmk_service_name: prev.checkmk_service_name || prevData.checkmk_service_name || null
        },
        newData: {
          checkmk_host_name: mapping.checkmk_host_name || null,
          checkmk_site: mapping.checkmk_site || null,
          checkmk_service_name: mapping.checkmk_service_name || null
        }
      });
    } catch (logError) {
      console.warn("[PATCH checkmk-mapping] equipment log:", logError?.message || logError);
    }
    res.json({
      checkmk_host_name: mapping.checkmk_host_name,
      checkmk_site: mapping.checkmk_site,
      checkmk_service_name: mapping.checkmk_service_name,
      is_active: true,
      replacedHycu: true
    });
  } catch (err) {
    console.error("Error PATCH checkmk-mapping:", err);
    res.status(500).json({
      error: "Error updating CheckMK mapping"
    });
  }
});
modulesRouter.patch('/:clientId/:family/hycu-mapping', requireModulePermission("edit"), async (req, res) => {
  try {
    const {
      clientId,
      family
    } = req.params;
    const {
      equipmentName,
      equipment_id,
      hycu_job_uuid,
      hycu_job_name
    } = req.body || {};
    const table = resolveTable(family);
    if (!table) return res.status(400).json({
      error: "Famille inconnue"
    });
    if (family !== "save" && table !== "v_b_clients_m_save") {
      return res.status(400).json({
        error: "HYCU mapping is only supported on save jobs"
      });
    }
    if ((!equipmentName || !String(equipmentName).trim()) && !equipment_id) {
      return res.status(400).json({
        error: "equipmentName ou equipment_id required"
      });
    }
    const jobUuid = hycu_job_uuid && String(hycu_job_uuid).trim() ? String(hycu_job_uuid).trim() : null;
    const jobName = hycu_job_name && String(hycu_job_name).trim() ? String(hycu_job_name).trim() : null;
    const nameVal = equipmentName ? String(equipmentName).trim() : null;
    const equipmentIdVal = equipment_id ? String(equipment_id).trim() : null;
    const columnsResult = await pool.query(`SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1`, [table]);
    const availableColumns = new Set(columnsResult.rows.map(r => r.column_name));
    const hasHycuColumns = availableColumns.has('hycu_job_uuid') && availableColumns.has('hycu_job_name');
    const hasCheckmkColumns = availableColumns.has('checkmk_host_name') && availableColumns.has('checkmk_site') && availableColumns.has('checkmk_service_name');
    if (!hasHycuColumns) {
      return res.status(501).json({
        error: "HYCU columns missing. Run migration 20260908_hycu_save_job_mapping.sql."
      });
    }
    const whereClause = equipmentIdVal ? `client_id::text = $3::text AND id::text = $4::text` : `client_id::text = $3::text AND (name = $4 OR item_key = $4 OR (data IS NOT NULL AND data::jsonb->>'nom' = $4))`;
    const whereParams = equipmentIdVal ? [clientId, equipmentIdVal] : [clientId, nameVal];
    const replaceCheckmk = Boolean(jobUuid);
    const clearCheckmkSql = replaceCheckmk && hasCheckmkColumns
      ? `, checkmk_host_name = NULL, checkmk_site = NULL, checkmk_service_name = NULL`
      : "";
    const clearCheckmkJson = replaceCheckmk
      ? `,
               'checkmk_host_name', 'null'::jsonb,
               'checkmk_site', 'null'::jsonb,
               'checkmk_service_name', 'null'::jsonb,
               'checkmkMapping', 'null'::jsonb`
      : "";
    const hycuMappingJson = jobUuid
      ? `jsonb_build_object('is_active', true, 'hycu_job_uuid', to_jsonb($1::text), 'hycu_job_name', to_jsonb($2::text))`
      : `'null'::jsonb`;
    const stripCheckmk = replaceCheckmk ? ` - 'checkmkMapping'` : "";
    const result = await pool.query(`UPDATE ${table}
       SET hycu_job_uuid = $1::text,
           hycu_job_name = $2::text${clearCheckmkSql},
           data = ((COALESCE(data::jsonb, '{}'::jsonb) || jsonb_build_object(
             'hycu_job_uuid', to_jsonb($1::text),
             'hycu_job_name', to_jsonb($2::text),
             'hycuMapping', ${hycuMappingJson}${clearCheckmkJson}
           ))${stripCheckmk}),
           updated_at = NOW()
       WHERE ${whereClause}
       RETURNING id, name, item_key, hycu_job_uuid, hycu_job_name`, [jobUuid, jobName, ...whereParams]);
    if (result.rows.length === 0) {
      if (equipmentIdVal) {
        return res.status(404).json({
          error: "Equipment not found",
          details: `No row with client_id=${clientId} and id=${equipmentIdVal} in ${table}`
        });
      }
      return res.status(404).json({
        error: "Equipment not found",
        details: `No row with client_id=${clientId} and name="${nameVal}" in ${table}`
      });
    }
    const mapping = result.rows[0];
    res.json({
      hycu_job_uuid: mapping.hycu_job_uuid,
      hycu_job_name: mapping.hycu_job_name,
      hycuMapping: mapping.hycu_job_uuid ? {
        is_active: true,
        hycu_job_uuid: mapping.hycu_job_uuid,
        hycu_job_name: mapping.hycu_job_name
      } : null,
      is_active: true,
      replacedCheckmk: replaceCheckmk
    });
  } catch (err) {
    console.error("Error PATCH hycu-mapping:", err);
    res.status(500).json({
      error: "Error updating HYCU mapping"
    });
  }
});
modulesRouter.delete('/:clientId/:family/:id', requireModulePermission("delete"), async (req, res) => {
  try {
    const {
      clientId,
      family,
      id
    } = req.params;
    const table = resolveTable(family);
    if (!table) return res.status(400).json({
      error: "Famille inconnue"
    });
    const itemResult = await pool.query(`SELECT name, item_key, data, is_active FROM ${table}
       WHERE id = $1 AND client_id = $2`, [id, clientId]);
    if (itemResult.rows.length === 0) return res.status(404).json({
      error: "Not found"
    });
    const item = itemResult.rows[0];
    const possibleNames = [];
    if (item.name) possibleNames.push(item.name);
    if (item.item_key) possibleNames.push(item.item_key);
    if (item.data?.nom) possibleNames.push(item.data.nom);
    try {
      const {
        userId,
        userName
      } = await resolveRequestUserName(req);
      await logEquipmentDeleted(pool, {
        clientId,
        family,
        equipmentName: item.name || item.item_key || item.data?.nom || "",
        equipmentId: id,
        userId,
        userName,
        data: item.data || {}
      });
    } catch (logError) {
      console.warn("[DELETE modules] equipment log:", logError?.message || logError);
    }
    const result = await pool.query(`DELETE FROM ${table}
       WHERE id = $1 AND client_id = $2
       RETURNING *`, [id, clientId]);
    const familyToEquipmentType = {
      'internet': 'Internet',
      'servers': 'Serveurs',
      'stockage': 'Stockage',
      'firewall': 'Firewalls',
      'switch': 'Switch',
      'wifi': 'BorneWifi',
      'alimentation': 'Alimentation',
      'routeur': 'Routeur',
      'toip': 'TOIP',
      'save': 'Sauvegarde'
    };
    const equipmentType = familyToEquipmentType[family?.toLowerCase()];
    if (equipmentType) {
      try {
        await pool.query(`DELETE FROM v_b_clients_host_mapping 
           WHERE client_id = $1 
           AND equipment_type = $2 
           AND equipment_id = $3`, [clientId, equipmentType, id]);
      } catch (mappingErr) {}
    }
    res.json({
      success: true
    });
  } catch (err) {
    res.status(500).json({
      error: "Server error"
    });
  }
});
modulesRouter.post('/:clientId/:family/sync', requireModulePermission("edit"), async (req, res) => {
  try {
    const {
      clientId,
      family
    } = req.params;
    const {
      items
    } = req.body || {};
    const table = resolveTable(family);
    if (!table) return res.status(400).json({
      error: "Famille inconnue"
    });
    if (!clientId) return res.status(400).json({
      error: "clientId required"
    });
    if (!Array.isArray(items)) return res.status(400).json({
      error: "items must be an array"
    });
    const familyToEquipmentType = {
      'internet': 'Internet',
      'servers': 'Serveurs',
      'stockage': 'Stockage',
      'firewall': 'Firewalls',
      'switch': 'Switch',
      'wifi': 'BorneWifi',
      'save': 'Sauvegarde'
    };
    const equipmentType = familyToEquipmentType[family?.toLowerCase()];
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const existingItemsResult = await client.query(`SELECT name, item_key, data FROM ${table} WHERE client_id = $1`, [clientId]);
      const existingNames = new Set();
      existingItemsResult.rows.forEach(row => {
        if (row.name) existingNames.add(row.name);
        if (row.item_key) existingNames.add(row.item_key);
        if (row.data?.nom) existingNames.add(row.data.nom);
        if (row.data && typeof row.data === 'object') {
          const dataName = row.data.name || row.data.nom || row.data.item_key;
          if (dataName) existingNames.add(dataName);
        }
      });
      let inserted = [];
      let newNames = new Set();
      if (family?.toLowerCase() === 'save' || family?.toLowerCase() === 'antispam') {
        const existingIdsResult = await client.query(`SELECT id FROM ${table} WHERE client_id = $1`, [clientId]);
        const existingIds = new Set(existingIdsResult.rows.map(row => row.id.toString()));
        const processedIds = new Set();
        for (const item of items) {
          const {
            id,
            item_key,
            name,
            data,
            is_active
          } = item;
          const itemId = id ? id.toString() : null;
          const itemName = name || item_key || data?.nom || null;
          if (itemName) newNames.add(itemName);
          if (data && typeof data === 'object') {
            const dataName = data.name || data.nom || data.item_key;
            if (dataName) newNames.add(dataName);
          }
          if (itemId && existingIds.has(itemId)) {
            const result = await updateModuleRowPreservingCheckmk(client, table, {
              item_key,
              name,
              data,
              is_active,
              itemId,
              clientId,
              item
            });
            if (result.rows.length > 0) {
              inserted.push(result.rows[0]);
              processedIds.add(itemId);
            }
          } else if (itemId) {
            const result = await client.query(`INSERT INTO ${table} (id, client_id, item_key, name, data, is_active)
               VALUES ($1::uuid, $2, $3, $4, $5, $6)
               RETURNING *`, [itemId, clientId, item_key || name || null, name || item_key || null, data || null, is_active !== false]);
            inserted.push(result.rows[0]);
            processedIds.add(itemId);
          } else {
            const result = await client.query(`INSERT INTO ${table} (client_id, item_key, name, data, is_active)
               VALUES ($1, $2, $3, $4, $5)
               RETURNING *`, [clientId, item_key || name || null, name || item_key || null, data || null, is_active !== false]);
            inserted.push(result.rows[0]);
            if (result.rows[0].id) {
              processedIds.add(result.rows[0].id.toString());
            }
          }
        }
        const idsToDelete = Array.from(existingIds).filter(id => !processedIds.has(id));
        if (idsToDelete.length > 0) {
          await client.query(`DELETE FROM ${table} WHERE id = ANY($1::uuid[]) AND client_id = $2`, [idsToDelete, clientId]);
        }
      } else {
        const existingRowsResult = await client.query(`SELECT id, item_key, name, data FROM ${table} WHERE client_id = $1`, [clientId]);
        const existingIds = new Set(existingRowsResult.rows.map(row => row.id.toString()));
        const existingByKey = new Map();
        existingRowsResult.rows.forEach(row => {
          const data = row.data && typeof row.data === "object" ? row.data : {};
          const keys = [row.item_key, row.name, data.nom, data.name, data.domaine, data.domain]
            .filter(Boolean)
            .map(value => String(value).trim().toLowerCase());
          keys.forEach(key => {
            if (key && !existingByKey.has(key)) existingByKey.set(key, row.id.toString());
          });
        });
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const processedIds = new Set();
        for (const item of items) {
          const {
            id,
            item_key,
            name,
            data,
            is_active
          } = item;
          const rawId = id != null ? String(id) : "";
          const itemId = uuidRegex.test(rawId) ? rawId : null;
          const itemName = name || item_key || data?.nom || null;
          if (itemName) newNames.add(itemName);
          if (data && typeof data === 'object') {
            const dataName = data.name || data.nom || data.item_key;
            if (dataName) newNames.add(dataName);
          }
          const lookupKeys = [item_key, name, data?.nom, data?.name, data?.domaine, data?.domain]
            .filter(Boolean)
            .map(value => String(value).trim().toLowerCase());
          let resolvedId = itemId && existingIds.has(itemId) ? itemId : null;
          if (!resolvedId) {
            for (const key of lookupKeys) {
              if (existingByKey.has(key)) {
                resolvedId = existingByKey.get(key);
                break;
              }
            }
          }
          if (resolvedId) {
            const result = await updateModuleRowPreservingCheckmk(client, table, {
              item_key,
              name,
              data,
              is_active,
              itemId: resolvedId,
              clientId,
              item
            });
            if (result.rows.length > 0) {
              inserted.push(result.rows[0]);
              processedIds.add(resolvedId);
            }
          } else if (itemId) {
            const result = await client.query(`INSERT INTO ${table} (id, client_id, item_key, name, data, is_active)
               VALUES ($1::uuid, $2, $3, $4, $5, $6)
               RETURNING *`, [itemId, clientId, item_key || name || null, name || item_key || null, data || null, is_active !== false]);
            inserted.push(result.rows[0]);
            processedIds.add(itemId);
          } else {
            const result = await client.query(`INSERT INTO ${table} (client_id, item_key, name, data, is_active)
               VALUES ($1, $2, $3, $4, $5)
               RETURNING *`, [clientId, item_key || name || null, name || item_key || null, data || null, is_active !== false]);
            inserted.push(result.rows[0]);
            if (result.rows[0].id) {
              processedIds.add(result.rows[0].id.toString());
            }
          }
        }
        const idsToDelete = Array.from(existingIds).filter(id => !processedIds.has(id));
        if (idsToDelete.length > 0) {
          await client.query(`DELETE FROM ${table} WHERE id = ANY($1::uuid[]) AND client_id = $2`, [idsToDelete, clientId]);
        }
      }
      await client.query('COMMIT');
      res.json({
        success: true,
        items: inserted,
        count: inserted.length
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(`[POST modules/${req.params?.clientId}/${req.params?.family}/sync]`, err.message, err.code || "");
    res.status(500).json({
      error: "Server error",
      details: err.message
    });
  }
});
router.get('/contacts', async (req, res) => {
  try {
    const clientId = req.query.client_id;
    let query = `
      SELECT 
        c.id,
        c.nom,
        c.prenom,
        c.email,
        c.telephone,
        c.poste,
        c.statut,
        c.client_id,
        cl.name as client_name,
        c.created_at,
        c.updated_at
      FROM v_b_contacts c
      LEFT JOIN v_b_clients cl ON c.client_id = cl.id
    `;
    let params = [];
    if (clientId) {
      params.push(parseInt(clientId));
      query += ` WHERE ${await sqlContactLinkedToClientAsync('c', 1)}`;
    }
    query += ` ORDER BY c.nom ASC, c.prenom ASC`;
    const result = await pool.query(query, params);
    res.json(await attachMembershipsToContacts(result.rows));
  } catch (err) {
    res.status(500).json({
      error: "Internal error (SQL)",
      details: err.message
    });
  }
});
router.post('/contacts', verifyJWT, requirePermission('contacts.create'), async (req, res) => {
  try {
    await assertCommunityContactsLimit(1);
    const {
      nom,
      prenom,
      email,
      telephone,
      poste,
      statut,
      client_id
    } = req.body;
    if (!nom) {
      return res.status(400).json({
        error: "Name is required"
      });
    }
    const result = await pool.query(`
      INSERT INTO v_b_contacts (nom, prenom, email, telephone, poste, statut, client_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, nom, prenom, email, telephone, poste, statut, client_id, created_at, updated_at
    `, [nom, prenom || null, email || null, telephone || null, poste || null, statut || 'actif', client_id || null]);
    const newContact = result.rows[0];
    if (newContact?.id && newContact.client_id) {
      await addMembership(newContact.id, {
        clientId: newContact.client_id,
        poste: newContact.poste || null,
        isPrimary: String(newContact.poste || "").toLowerCase().includes("principal")
      }).catch(err => console.warn("[legacy POST /contacts] membership:", err.message));
    }
    res.status(201).json(newContact);
  } catch (err) {
    if (err?.code?.startsWith("COMMUNITY_")) {
      return sendCommunityLimitError(res, err);
    }
    res.status(500).json({
      error: "Internal error (SQL)",
      details: err.message
    });
  }
});
router.put('/contacts/:id', verifyJWT, requirePermission('contacts_detail.edit'), async (req, res) => {
  try {
    const {
      id
    } = req.params;
    const {
      nom,
      prenom,
      email,
      telephone,
      poste,
      statut,
      client_id
    } = req.body;
    if (!nom) {
      return res.status(400).json({
        error: "Name is required"
      });
    }
    const result = await pool.query(`
      UPDATE v_b_contacts
      SET nom = $1, prenom = $2, email = $3, telephone = $4, poste = $5, statut = $6, client_id = $7, updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING id, nom, prenom, email, telephone, poste, statut, client_id, created_at, updated_at
    `, [nom, prenom || null, email || null, telephone || null, poste || null, statut || 'actif', client_id || null, parseInt(id)]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Contact not found"
      });
    }
    const updated = result.rows[0];
    if (updated?.id && updated.client_id) {
      await addMembership(updated.id, {
        clientId: updated.client_id,
        poste: updated.poste || null,
        isPrimary: String(updated.poste || "").toLowerCase().includes("principal")
      }).catch(err => console.warn("[legacy PUT /contacts] membership:", err.message));
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({
      error: "Internal error (SQL)",
      details: err.message
    });
  }
});
router.delete('/contacts/:id', verifyJWT, requirePermission('contacts_detail.delete'), async (req, res) => {
  try {
    const {
      id
    } = req.params;
    const result = await pool.query(`
      DELETE FROM v_b_contacts
      WHERE id = $1
      RETURNING id
    `, [parseInt(id)]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Contact not found"
      });
    }
    res.json({
      success: true,
      message: "Contact deleted"
    });
  } catch (err) {
    res.status(500).json({
      error: "Internal error (SQL)",
      details: err.message
    });
  }
});
export const modulesRouterExport = modulesRouter;
export default router;
