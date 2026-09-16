import express from "express";
import fs from "fs";
import path from "path";
import { body, param, query, validationResult } from "express-validator";
import multer from "multer";
import { pool } from "../../database/db.js";
import verifyJWT from "../../middleware/auth.js";
import { requireRole } from "../../middleware/roles.js";
import { addPortalTicketComment, updatePortalTicketComment, assertPortalTicketVisible, countPortalTicketsActionRequired, createPortalTicket, getPortalTicketDetail, getPortalUserContext, listPortalTickets, listPortalTicketsActionRequired, portalAttachmentUpload, submitPortalTicketSatisfaction, updatePortalTicketSatisfaction, submitPortalResolutionValidation } from "../../services/clientPortalTicketService.js";
import { countPortalVaultFiles, getPortalVaultFileRecord, listPortalVaultFiles, resolveClientFileDiskPath } from "../../services/clientPortalVaultService.js";
import { countPortalVaultSecrets, listPortalVaultSecrets, revealPortalVaultSecret, requestPortalVaultSecretRevocation } from "../../services/clientVaultSecretService.js";
import { normalizePortalTicketRole } from "../../utils/portalTicketRole.js";
import { transformClientModulesToFrontend } from "../../utils/transformClientModules.js";
import { expandCloudServiceRows, attachSaveBackupFields, linkSaveJobsToInstances, fetchPortalMfaDetails, fetchPortalSecureScoreRecommendations, snapshotHasRecommendations } from "../../utils/portalCloudServices.js";
import { normalizeContactCommunications, syncLegacyContactFields, validateContactCommunications } from "../../utils/contactCommunications.js";
import { syncPortalUserFromContact, switchPortalCompany, listPortalCompaniesForContact } from "../../utils/contactPortal.js";
import { buildSessionPayload, isImpersonationPayload, buildImpersonationClientPayload, setSessionCookie, signSessionToken } from "../../utils/authSession.js";
import { contactBelongsToClient, pickHomeClientId } from "../../services/contactClientLinks.js";
import { listClientCustomEquipment, listEquipmentFamilies } from "../../utils/equipmentFamilies.js";
import { getKnowledgeAsset, getPortalKnowledgeArticle, KNOWLEDGE_ASSETS_DIR, listPortalKnowledgeArticles, portalCanAccessAsset } from "../../services/knowledgeArticlesService.js";
import { toggleFavorite, upsertHelpful } from "../../services/knowledgeArticleExtrasService.js";
import { addArticleComment, deleteArticleComment, updateArticleComment, upsertArticleRating } from "../../services/knowledgeArticleFeedbackService.js";
import { allowAssetEmbedding } from "../../middleware/securityHeaders.js";
const router = express.Router();
router.use(verifyJWT, requireRole("client"));
const INFRA_TABLES = [{
  type: "internet",
  label: "Internet",
  icon: "mdi:web"
}, {
  type: "firewall",
  label: "Pare-feu",
  icon: "mdi:shield-lock"
}, {
  type: "servers",
  label: "Serveur",
  icon: "mdi:server"
}, {
  type: "stockage",
  label: "Stockage",
  icon: "mdi:harddisk"
}, {
  type: "switch",
  label: "Switch",
  icon: "mdi:lan"
}, {
  type: "wifi",
  label: "Wi-Fi",
  icon: "mdi:wifi"
}, {
  type: "alimentation",
  label: "Alimentation",
  icon: "mdi:power-plug"
}, {
  type: "routeur",
  label: "Routeur",
  icon: "mdi:router-wireless"
}, {
  type: "toip",
  label: "TOIP",
  icon: "mdi:phone-voip"
}];
const CLOUD_TABLES = [{
  type: "o365",
  label: "Microsoft 365",
  icon: "mdi:microsoft-office"
}, {
  type: "save",
  label: "Sauvegarde",
  icon: "mdi:backup-restore"
}, {
  type: "antivirus",
  label: "Antivirus",
  icon: "mdi:shield-check"
}, {
  type: "antispam",
  label: "Antispam",
  icon: "mdi:email-lock"
}, {
  type: "ndd",
  label: "Noms de domaine",
  icon: "mdi:domain"
}];
const TABLE_MAP = {
  internet: "v_b_clients_m_internet",
  firewall: "v_b_clients_m_firewall",
  servers: "v_b_clients_m_servers",
  stockage: "v_b_clients_m_stockage",
  switch: "v_b_clients_m_switch",
  wifi: "v_b_clients_m_wifi",
  alimentation: "v_b_clients_m_alimentation",
  routeur: "v_b_clients_m_routeur",
  toip: "v_b_clients_m_toip",
  o365: "v_b_clients_m_o365",
  save: "v_b_clients_m_save",
  antivirus: "v_b_clients_m_antivirus",
  antispam: "v_b_clients_m_antispam",
  ndd: "v_b_clients_m_ndd"
};
const EQUIPMENT_MODULE_TABLES = [...new Set([...Object.values(TABLE_MAP), "v_b_clients_m_ordinateurs", "v_b_clients_m_custom_equipment"])];
async function equipmentBelongsToClient(clientId, equipmentId) {
  for (const table of EQUIPMENT_MODULE_TABLES) {
    if (!table) continue;
    try {
      const result = await pool.query(`SELECT 1 FROM ${table} WHERE client_id = $1 AND id = $2::uuid LIMIT 1`, [clientId, equipmentId]);
      if (result.rows.length > 0) return true;
    } catch (err) {
      if (err.code === "42P01") continue;
      throw err;
    }
  }
  return false;
}
function parseJsonField(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
const CLIENT_DASHBOARD_COLUMNS = ["id", "name", "email", "phone", "address", "siret", "secteur", "contrat", "modules", "options", "commercial_id", "created_at", "sites", "ssids", "ssid"];
function extractLocationFromAddress(address) {
  if (!address) {
    return {
      city: null,
      country: null,
      addressLine: null
    };
  }
  if (typeof address === "string") {
    const trimmed = address.trim();
    if (!trimmed) {
      return {
        city: null,
        country: null,
        addressLine: null
      };
    }
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      const parsed = parseJsonField(trimmed, null);
      if (parsed && typeof parsed === "object") {
        return extractLocationFromAddress(parsed);
      }
    }
    const parts = trimmed.split(",").map(part => part.trim()).filter(Boolean);
    const city = parts.length >= 2 ? parts[parts.length - 1] : trimmed;
    return {
      city,
      country: null,
      addressLine: trimmed
    };
  }
  if (typeof address === "object") {
    const city = address.city || address.addressCity || address.ville || null;
    const country = address.country || address.pays || null;
    const street = address.street || address.addressStreet || address.voie || "";
    const postal = address.postalCode || address.addressPostalCode || address.codePostal || "";
    const addressLine = [street, [postal, city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    return {
      city,
      country,
      addressLine: addressLine || null
    };
  }
  return {
    city: null,
    country: null,
    addressLine: null
  };
}
async function loadClientRow(clientId) {
  const buildQuery = columns => `
    SELECT ${columns.map(column => `c.${column}`).join(", ")},
           u.username AS commercial_name,
           u.email AS commercial_email
    FROM v_b_clients c
    LEFT JOIN v_b_users u ON c.commercial_id::text = u.id::text
    WHERE c.id = $1
  `;
  try {
    const {
      rows
    } = await pool.query(buildQuery(CLIENT_DASHBOARD_COLUMNS), [clientId]);
    return rows[0] || null;
  } catch (err) {
    if (err.code !== "42703") throw err;
    const {
      rows: columnRows
    } = await pool.query(`SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'v_b_clients'`);
    const available = new Set(columnRows.map(row => String(row.column_name || "").trim()));
    const selected = CLIENT_DASHBOARD_COLUMNS.filter(column => available.has(column));
    if (!selected.includes("id")) selected.unshift("id");
    const {
      rows
    } = await pool.query(buildQuery(selected), [clientId]);
    return rows[0] || null;
  }
}
function mapSitesForPortal(raw) {
  const parsed = Array.isArray(raw) ? raw : parseJsonField(raw, []);
  const list = Array.isArray(parsed) ? parsed : [];
  return list.map((site, index) => {
    if (typeof site === "string") {
      const name = site.trim();
      if (!name) return null;
      return {
        id: `legacy-${index}`,
        name,
        isPrimary: false,
        addressCity: null,
        addressPostalCode: null,
        addressStreet: null,
        sortOrder: index
      };
    }
    if (!site || typeof site !== "object") return null;
    const name = String(site.name || site.label || site.site || "").trim();
    if (!name) return null;
    return {
      id: site.id || `legacy-${index}`,
      name,
      isPrimary: Boolean(site.isPrimary),
      addressCity: site.addressCity || site.city || null,
      addressPostalCode: site.addressPostalCode || site.postalCode || null,
      addressStreet: site.addressStreet || site.street || null,
      sortOrder: Number.isFinite(Number(site.sortOrder)) ? Number(site.sortOrder) : index
    };
  }).filter(Boolean).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
}
function mapSsidsForPortal(raw) {
  const parsed = Array.isArray(raw) ? raw : parseJsonField(raw, []);
  const list = Array.isArray(parsed) ? parsed : [];
  return list.map((entry, index) => {
    if (typeof entry === "string") {
      const nom = entry.trim();
      return nom ? { id: `legacy-${index}`, nom, type: "prive", bande: "", portailCaptif: false } : null;
    }
    if (!entry || typeof entry !== "object") return null;
    const nom = String(entry.nom || entry.name || entry.ssid || "").trim();
    if (!nom) return null;
    return {
      id: entry.id || `ssid-${index}`,
      nom,
      type: entry.type === "public" ? "public" : "prive",
      bande: entry.bande || "",
      portailCaptif: Boolean(entry.portailCaptif)
    };
  }).filter(Boolean);
}
function mapClientForPortal(client) {
  const location = extractLocationFromAddress(client.address);
  const options = parseJsonField(client.options, {});
  return {
    id: client.id,
    name: client.name,
    city: location.city,
    country: location.country,
    phone: client.phone || null,
    email: client.email || null,
    website: options.website || options.siteWeb || options.site_web || null,
    address: location.addressLine,
    siret: client.siret || null,
    secteur: client.secteur || null,
    created_at: client.created_at || null,
    sites: mapSitesForPortal(client.sites),
    ssids: mapSsidsForPortal(client.ssids || client.ssid)
  };
}
function getClientId(req, res) {
  const clientId = req.user.client_id;
  if (!clientId) {
    res.status(403).json({
      error: "No company associated with this account."
    });
    return null;
  }
  return clientId;
}
function validationErrorOrNull(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return null;
  return res.status(400).json({
    error: "Validation error",
    errors: errors.array()
  });
}
async function resolvePortalContactId(userRow) {
  if (userRow?.contact_id) return userRow.contact_id;
  const email = String(userRow?.email || "").trim();
  if (!email) return null;
  const { rows } = await pool.query(
    `SELECT id FROM v_b_contacts WHERE LOWER(TRIM(email)) = LOWER($1) ORDER BY id ASC LIMIT 2`,
    [email]
  );
  if (rows.length !== 1) return null;
  const contactId = rows[0].id;
  await pool.query(
    `UPDATE v_b_users SET contact_id = $1 WHERE id = $2 AND contact_id IS NULL AND role = 'client'`,
    [contactId, userRow.id]
  );
  return contactId;
}

async function getPortalContext(req, res) {
  const userRow = await getPortalUserContext(req.user.id);
  if (!userRow) {
    res.status(403).json({
      error: "Portal account not found."
    });
    return null;
  }
  let clientId = userRow.client_id || req.user.client_id;
  const contactId = await resolvePortalContactId(userRow);
  if (contactId) {
    const ok = clientId
      ? await contactBelongsToClient(contactId, clientId).catch(() => false)
      : false;
    if (!ok) {
      const home = await pickHomeClientId(contactId, clientId);
      if (!home) {
        res.status(403).json({
          error: "Active company is not linked to this contact."
        });
        return null;
      }
      await pool.query(
        `UPDATE v_b_users SET client_id = $1 WHERE id = $2 AND role = 'client'`,
        [home, userRow.id]
      );
      clientId = home;
    }
  }
  if (!clientId) {
    res.status(403).json({
      error: "No company associated with this account."
    });
    return null;
  }
  return {
    clientId,
    userId: userRow.id,
    contactId: contactId || null,
    email: userRow.email,
    portalRole: normalizePortalTicketRole(userRow.portal_role)
  };
}
function ticketScope(ctx) {
  return {
    contactId: ctx.contactId || null,
    userId: ctx.userId,
    portalRole: ctx.portalRole
  };
}
function parseModuleRowData(row) {
  if (row.data && typeof row.data === "string") {
    try {
      row.data = JSON.parse(row.data);
    } catch {
      row.data = {};
    }
  } else if (!row.data) {
    row.data = {};
  }
  return row;
}
const PORTAL_SAFE_DATA_KEYS = [
  "nom",
  "name",
  "site",
  "location",
  "emplacement",
  "modele",
  "model",
  "fabricant",
  "manufacturer",
  "marque",
  "numeroSerie",
  "serial",
  "serialNumber",
  "ip",
  "ipAddress",
  "mac",
  "adresseMac",
  "macAddress",
  "systeme",
  "os",
  "firmware",
  "version",
  "fournisseur",
  "debit",
  "debitDownload",
  "debitUpload",
  "type",
  "vlan",
  "capacite",
  "capacity",
  "raid",
  "hostname",
  "categorie",
  "processeur",
  "memoire",
  "stockage",
  "ssids",
  "assignedSsids",
  "assignedSsidIds",
  "ssidCount",
  "internetType",
  "boxModele",
  "raid",
  "nbDisquesActuels",
  "nbDisquesMax",
  "modeHA",
  "roleHA",
  "ha",
  "firewallType",
  "licenceMaintenance",
  "maintenanceLicense",
  "licences",
  "manageable",
  "poeSupport",
  "empilage",
  "alimentationPoE",
  "routeurType",
  "alimentationType",
  "capaciteVA",
  "capaciteW",
  "nbPrises",
  "dateBatterie",
  "toipType",
  "nombreExtensions",
  "domaineSip",
  "computerType",
  "expirationGarantie",
  "garantie",
  "installDate",
  "role",
  "hypervisor",
  "hostServerName",
  "typeServer",
  "storageType",
  "debitUpload",
  "categorie",
  "commentaire",
  "gateway",
  "adminUrl",
  "purchaseDate",
  "invoiceNumber",
  "numeroLigne",
  "referenceContrat",
  "supportTelephone",
  "dateMiseEnService",
  "remoteAccessSolution",
  "remoteAccessId",
  "serverHAName",
  "firewallHAName",
  "storageHAName",
  "stormshieldWanUrl",
  "powerRating",
  "domaine",
  "osName",
  "ipNonFixe",
  "quickConnect"
];
function pickPortalEquipmentData(data) {
  const src = data && typeof data === "object" ? data : {};
  const out = {};
  for (const key of PORTAL_SAFE_DATA_KEYS) {
    if (src[key] == null || src[key] === "") continue;
    out[key] = src[key];
  }
  return out;
}
function sanitizePortalCustomFieldValue(value) {
  if (value == null || value === "") return undefined;
  if (typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const labels = value.map(entry => {
      if (entry == null || entry === "") return "";
      if (typeof entry === "object") return entry.name || entry.label || "";
      return String(entry);
    }).filter(Boolean);
    return labels.length ? labels.join(", ") : undefined;
  }
  return undefined;
}
function mapPortalCustomEquipmentItem(item, fieldKeys = []) {
  const data = item?.data && typeof item.data === "object" ? item.data : {};
  const fields = item?.fields && typeof item.fields === "object" ? item.fields : data;
  const safe = pickPortalEquipmentData({
    ...data,
    ...fields
  });
  const customFields = {};
  fieldKeys.forEach(key => {
    if (!key || Object.prototype.hasOwnProperty.call(safe, key)) return;
    const value = sanitizePortalCustomFieldValue(fields[key] ?? data[key]);
    if (value === undefined) return;
    customFields[key] = value;
  });
  return {
    id: item.id,
    active: item.isActive !== false,
    monitored: false,
    ...safe,
    ...customFields,
    name: item.name || safe.name || data.name || "Sans nom",
    type: `custom:${item.familyKey}`,
    familyKey: item.familyKey,
    site: safe.site || data.site || data.location || fields.site || "",
    location: safe.location || data.location || data.site || fields.location || fields.site || ""
  };
}
async function fetchPortalCustomFamilies(clientId) {
  try {
    const [families, items] = await Promise.all([listEquipmentFamilies({
      includeDisabled: false
    }), listClientCustomEquipment(clientId)]);
    return (families || []).map(family => {
      const fieldKeys = (family.fields || []).map(field => field.fieldKey).filter(Boolean);
      const familyItems = (items || []).filter(item => item.familyKey === family.familyKey).map(item => mapPortalCustomEquipmentItem(item, fieldKeys));
      return {
        type: `custom:${family.familyKey}`,
        familyKey: family.familyKey,
        custom: true,
        label: family.label,
        icon: family.icon || "mdi:devices",
        fields: (family.fields || []).map(field => ({
          fieldKey: field.fieldKey,
          label: field.label,
          fieldType: field.fieldType
        })),
        items: familyItems
      };
    });
  } catch (err) {
    if (err.code === "42P01") return [];
    throw err;
  }
}
async function fetchClientComputersForPortal(clientId) {
  const table = "v_b_clients_m_ordinateurs";
  try {
    let moduleResult;
    const baseSelect = "SELECT id, item_key, name, data, is_active, agent_id, checkmk_host_name, checkmk_site, checkmk_service_name";
    try {
      moduleResult = await pool.query(`${baseSelect}
         FROM ${table}
         WHERE client_id = $1 AND is_active IS DISTINCT FROM false
         ORDER BY name NULLS LAST, item_key NULLS LAST`, [clientId]);
    } catch (colErr) {
      if (colErr.code !== "42703") throw colErr;
      moduleResult = await pool.query(`SELECT id, item_key, name, data, is_active
         FROM ${table}
         WHERE client_id = $1 AND is_active IS DISTINCT FROM false
         ORDER BY name NULLS LAST, item_key NULLS LAST`, [clientId]);
      moduleResult.rows.forEach(row => {
        row.agent_id = row.data?.agentId ?? row.data?.agent_id ?? null;
        row.checkmk_host_name = null;
        row.checkmk_site = null;
        row.checkmk_service_name = null;
      });
    }
    const parsedRows = moduleResult.rows.map(parseModuleRowData);
    const transformed = transformClientModulesToFrontend({
      ordinateurs: parsedRows
    }, {});
    return transformed.equipements?.Ordinateurs || [];
  } catch (err) {
    if (err.code === "42P01") return [];
    throw err;
  }
}
async function fetchEquipmentItems(clientId, type, {
  cloudPortal = false
} = {}) {
  const table = TABLE_MAP[type];
  if (!table) return [];
  const saveExtra = type === "save" ? ", last_backup_date, last_backup_duration, last_backup_start" : "";
  const selectWithCheckmk = `SELECT id, name, item_key, is_active, data, checkmk_host_name${saveExtra}
       FROM ${table}
       WHERE client_id = $1
       ORDER BY name NULLS LAST, item_key NULLS LAST`;
  const selectWithCheckmkNoSave = `SELECT id, name, item_key, is_active, data, checkmk_host_name
       FROM ${table}
       WHERE client_id = $1
       ORDER BY name NULLS LAST, item_key NULLS LAST`;
  const selectBasicWithSave = `SELECT id, name, item_key, is_active, data${saveExtra}
           FROM ${table} WHERE client_id = $1
           ORDER BY name NULLS LAST, item_key NULLS LAST`;
  const selectBasic = `SELECT id, name, item_key, is_active, data
           FROM ${table} WHERE client_id = $1
           ORDER BY name NULLS LAST, item_key NULLS LAST`;
  const mapRows = (rows, hasCheckmk, portalExtras = {}) => {
    const mapped = rows.flatMap(row => {
    const data = parseJsonField(row.data, {});
    if (cloudPortal) {
      if (type === "o365") {
        if (portalExtras.mfaDetails?.length) data.userMfaDetails = portalExtras.mfaDetails;
        if (portalExtras.recommendations?.length) data.portalSecureScoreRecommendations = portalExtras.recommendations;
      }
      const portalData = type === "save" ? attachSaveBackupFields(data, row) : data;
      return expandCloudServiceRows(type, row, portalData);
    }
    const safe = pickPortalEquipmentData(data);
    return [{
      id: row.id,
      active: row.is_active !== false,
      monitored: hasCheckmk ? Boolean(row.checkmk_host_name) : false,
      ...safe,
      name: row.name || data.nom || row.item_key || "Sans nom",
      type,
      typeServer: safe.typeServer || (type === "servers" ? safe.type || data.type || "" : safe.typeServer || ""),
      computerType: safe.computerType || (type === "ordinateurs" ? safe.type || data.type || "" : safe.computerType || ""),
      internetType: safe.internetType || (type === "internet" ? safe.type || data.type || "" : safe.internetType || ""),
      storageType: safe.storageType || (type === "stockage" ? safe.type || data.type || "" : safe.storageType || "")
    }];
    });
    if (cloudPortal && type === "save") return linkSaveJobsToInstances(mapped);
    return mapped;
  };
  const loadPortalExtras = async rows => {
    if (!cloudPortal || type !== "o365") return {};
    const mfaDetails = await fetchPortalMfaDetails(clientId);
    const hasRecos = rows.some(row => snapshotHasRecommendations(parseJsonField(row.data, {})));
    const recommendations = hasRecos ? [] : await fetchPortalSecureScoreRecommendations(clientId);
    return { mfaDetails, recommendations };
  };
  try {
    const {
      rows
    } = await pool.query(selectWithCheckmk, [clientId]);
    const extras = await loadPortalExtras(rows);
    return mapRows(rows, true, extras);
  } catch (err) {
    if (err.code === "42P01") return [];
    if (err.code !== "42703") throw err;
    const attempts = [];
    if (saveExtra) {
      attempts.push({ sql: selectWithCheckmkNoSave, hasCheckmk: true });
      attempts.push({ sql: selectBasicWithSave, hasCheckmk: false });
    }
    attempts.push({ sql: selectBasic, hasCheckmk: false });
    for (const attempt of attempts) {
      try {
        const {
          rows
        } = await pool.query(attempt.sql, [clientId]);
        const extras = await loadPortalExtras(rows);
        return mapRows(rows, attempt.hasCheckmk, extras);
      } catch (retryErr) {
        if (retryErr.code === "42P01") return [];
        if (retryErr.code !== "42703") throw retryErr;
      }
    }
    return [];
  }
}
router.get("/equipment/:equipmentId/notes", [param("equipmentId").isUUID()], async (req, res) => {
  const clientId = getClientId(req, res);
  if (!clientId) return;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Invalid device ID."
    });
  }
  try {
    const equipmentId = req.params.equipmentId;
    const belongs = await equipmentBelongsToClient(clientId, equipmentId);
    if (!belongs) {
      return res.status(404).json({
        error: "Device not found."
      });
    }
    const result = await pool.query(`SELECT n.id, n.content, n.visibility, n.created_at, n.updated_at, u.username
         FROM v_b_equipment_notes n
         LEFT JOIN v_b_users u ON u.id = n.user_id
         WHERE n.equipment_id = $1 AND n.client_id = $2 AND n.visibility = 'public'
         ORDER BY n.created_at DESC`, [equipmentId, clientId]);
    res.json(result.rows);
  } catch (err) {
    if (err.code === "42P01") return res.json([]);
    console.error("[GET /client-portal/equipment/:equipmentId/notes]", err);
    res.status(500).json({
      error: "Error loading device notes."
    });
  }
});
router.get("/dashboard", async (req, res) => {
  const ctx = await getPortalContext(req, res);
  if (!ctx) return;
  const clientId = ctx.clientId;
  const scope = ticketScope(ctx);
  try {
    const client = await loadClientRow(clientId);
    if (!client) return res.status(404).json({
      error: "Company not found."
    });
    const contrat = parseJsonField(client.contrat, {});
    const modules = parseJsonField(client.modules, {});
    const infraItems = (await Promise.all(INFRA_TABLES.map(t => fetchEquipmentItems(clientId, t.type)))).flat();
    const cloudItems = (await Promise.all(CLOUD_TABLES.map(t => fetchEquipmentItems(clientId, t.type, {
      cloudPortal: true
    })))).flat();
    const computers = await fetchClientComputersForPortal(clientId);
    const computerCount = computers.length;
    const customFamilies = await fetchPortalCustomFamilies(clientId);
    const customItems = customFamilies.flatMap(group => group.items || []);
    const allItems = [...infraItems, ...cloudItems, ...customItems];
    const activeCount = allItems.filter(i => i.active).length + computerCount;
    let tickets = [];
    try {
      tickets = await listPortalTickets(clientId, {
        limit: 10,
        ...scope
      });
    } catch (err) {
      if (err.code !== "42P01") throw err;
    }
    let actionRequiredTickets = [];
    let actionRequiredCount = 0;
    try {
      actionRequiredCount = await countPortalTicketsActionRequired(clientId, scope);
      if (actionRequiredCount > 0) {
        actionRequiredTickets = await listPortalTicketsActionRequired(clientId, {
          limit: 5,
          ...scope
        });
      }
    } catch (err) {
      if (err.code !== "42P01") throw err;
    }
    let files = [];
    let vaultFileCount = 0;
    try {
      vaultFileCount = await countPortalVaultFiles(clientId);
      files = await listPortalVaultFiles(clientId, {
        limit: 5
      });
    } catch (err) {
      if (err.code !== "42P01") throw err;
    }
    const openTickets = tickets.filter(t => !["resolved", "closed"].includes(t.status)).length;
    res.json({
      client: mapClientForPortal(client),
      contrat: {
        debut: contrat.debut || null,
        expiration: contrat.expiration || null,
        suspendu: Boolean(contrat.suspendu)
      },
      commercial: client.commercial_name ? {
        name: client.commercial_name,
        email: client.commercial_email
      } : null,
      modules,
      options: parseJsonField(client.options, {}),
      stats: {
        totalEquipment: allItems.length + computerCount,
        activeEquipment: activeCount,
        openTickets,
        actionRequiredCount,
        pendingValidationCount: actionRequiredCount,
        infraCount: infraItems.length,
        cloudCount: cloudItems.length,
        computerCount,
        vaultFileCount
      },
      computers,
      infrastructure: [...INFRA_TABLES.map(t => ({
        ...t,
        items: infraItems.filter(i => i.type === t.type)
      })).filter(g => g.items.length > 0), ...customFamilies],
      cloudServices: CLOUD_TABLES.map(t => ({
        ...t,
        items: cloudItems.filter(i => i.type === t.type)
      })).filter(g => g.items.length > 0),
      tickets,
      actionRequiredTickets,
      pendingValidationTickets: actionRequiredTickets,
      files,
      portalRole: ctx.portalRole
    });
  } catch (err) {
    console.error("/client-portal/dashboard:", err);
    res.status(500).json({
      error: "Server error."
    });
  }
});
router.get("/tickets", [query("status").optional().isString(), query("search").optional().isString(), query("limit").optional().isInt({
  min: 1,
  max: 200
}), query("offset").optional().isInt({
  min: 0
})], async (req, res) => {
  const validationResponse = validationErrorOrNull(req, res);
  if (validationResponse) return;
  const ctx = await getPortalContext(req, res);
  if (!ctx) return;
  try {
    const tickets = await listPortalTickets(ctx.clientId, {
      status: req.query.status,
      search: req.query.search,
      limit: req.query.limit,
      offset: req.query.offset,
      ...ticketScope(ctx)
    });
    res.json({
      tickets
    });
  } catch (err) {
    console.error("GET /client-portal/tickets:", err);
    res.status(500).json({
      error: "Error retrieving tickets"
    });
  }
});
router.get("/tickets/:id", [param("id").isUUID()], async (req, res) => {
  const validationResponse = validationErrorOrNull(req, res);
  if (validationResponse) return;
  const ctx = await getPortalContext(req, res);
  if (!ctx) return;
  try {
    const ticket = await getPortalTicketDetail(ctx.clientId, req.params.id, ticketScope(ctx));
    if (!ticket) return res.status(404).json({
      error: "Ticket not found."
    });
    res.json(ticket);
  } catch (err) {
    console.error("GET /client-portal/tickets/:id:", err);
    res.status(500).json({
      error: "Error retrieving ticket"
    });
  }
});
router.post("/tickets", [body("title").notEmpty().withMessage("Title is required"), body("description").optional().isString(), body("priority").optional().isIn(["low", "normal", "high", "urgent"]), body("type").optional().isString(), body("attemptedActions").optional().isString(), body("issueNature").optional().isIn(["hardware", "software", "unsure", ""]), body("contactSlots").optional().isArray(), body("equipmentInfo").optional().isObject(), body("linkedTicketId").optional({
  nullable: true
}).isUUID()], async (req, res) => {
  const validationResponse = validationErrorOrNull(req, res);
  if (validationResponse) return;
  const ctx = await getPortalContext(req, res);
  if (!ctx) return;
  try {
    const ticket = await createPortalTicket({
      clientId: ctx.clientId,
      contactId: ctx.contactId,
      userId: ctx.userId,
      portalRole: ctx.portalRole,
      title: req.body.title,
      description: req.body.description,
      priority: req.body.priority,
      type: req.body.type,
      attemptedActions: req.body.attemptedActions,
      issueNature: req.body.issueNature,
      contactSlots: req.body.contactSlots,
      equipmentInfo: req.body.equipmentInfo,
      linkedTicketId: req.body.linkedTicketId || null
    });
    res.status(201).json(ticket);
  } catch (err) {
    console.error("POST /client-portal/tickets:", err);
    res.status(500).json({
      error: "Error creating ticket"
    });
  }
});
router.post("/tickets/:id/comments", portalAttachmentUpload.array("attachments", 10), [param("id").isUUID(), body("content").optional().isString()], async (req, res) => {
  const validationResponse = validationErrorOrNull(req, res);
  if (validationResponse) return;
  const ctx = await getPortalContext(req, res);
  if (!ctx) return;
  try {
    const comment = await addPortalTicketComment({
      clientId: ctx.clientId,
      ticketId: req.params.id,
      userId: ctx.userId,
      content: req.body?.content,
      files: Array.isArray(req.files) ? req.files : [],
      ...ticketScope(ctx)
    });
    if (!comment) return res.status(404).json({
      error: "Ticket not found."
    });
    res.status(201).json(comment);
  } catch (err) {
    if (err?.message === "EMPTY_COMMENT") {
      return res.status(400).json({
        error: "Message cannot be empty (text or attachment required)."
      });
    }
    if (err?.message === "TICKET_CLOSED") {
      return res.status(409).json({
        error: "This ticket is closed. You can no longer reply."
      });
    }
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          error: "File too large (max. 15 MB)."
        });
      }
      return res.status(400).json({
        error: err.message || "File upload error"
      });
    }
    if (err?.message && err.message.includes("File type not allowed")) {
      return res.status(400).json({
        error: err.message
      });
    }
    console.error("POST /client-portal/tickets/:id/comments:", err);
    res.status(500).json({
      error: "Error sending message"
    });
  }
});
router.patch("/tickets/:id/comments/:commentId", [param("id").isUUID(), param("commentId").isUUID(), body("content").isString()], async (req, res) => {
  const validationResponse = validationErrorOrNull(req, res);
  if (validationResponse) return;
  const ctx = await getPortalContext(req, res);
  if (!ctx) return;
  try {
    const comment = await updatePortalTicketComment({
      clientId: ctx.clientId,
      ticketId: req.params.id,
      userId: ctx.userId,
      commentId: req.params.commentId,
      content: req.body.content,
      ...ticketScope(ctx)
    });
    if (!comment) return res.status(404).json({
      error: "Ticket not found."
    });
    res.json(comment);
  } catch (err) {
    if (err?.message === "EMPTY_COMMENT") {
      return res.status(400).json({
        error: "Message cannot be empty (text or attachment required)."
      });
    }
    if (err?.message === "NOT_AUTHOR") {
      return res.status(403).json({
        error: "Vous ne pouvez modifier que vos propres messages."
      });
    }
    if (err?.message === "COMMENT_NOT_FOUND") {
      return res.status(404).json({
        error: "Message not found."
      });
    }
    if (err?.message === "SYSTEM_COMMENT" || err?.message === "INVALID_CONTENT") {
      return res.status(400).json({
        error: "This message type cannot be edited."
      });
    }
    if (err?.message === "TICKET_LOCKED") {
      return res.status(409).json({
        error: "This ticket is completed. You can no longer edit your messages."
      });
    }
    if (err?.message === "UPDATED_AT_MIGRATION_REQUIRED") {
      return res.status(503).json({
        error: "Message editing is temporarily unavailable."
      });
    }
    console.error("PATCH /client-portal/tickets/:id/comments/:commentId:", err);
    res.status(500).json({
      error: "Error editing message"
    });
  }
});
router.post("/tickets/:id/validate-resolution", [param("id").isUUID(), body("accepted").isBoolean(), body("message").optional().isString()], async (req, res) => {
  const validationResponse = validationErrorOrNull(req, res);
  if (validationResponse) return;
  const ctx = await getPortalContext(req, res);
  if (!ctx) return;
  try {
    const visible = await assertPortalTicketVisible(ctx.clientId, req.params.id, ticketScope(ctx));
    if (!visible) return res.status(404).json({
      error: "Ticket not found."
    });
    const result = await submitPortalResolutionValidation({
      clientId: ctx.clientId,
      ticketId: req.params.id,
      userId: ctx.userId,
      accepted: req.body.accepted === true,
      message: req.body.message
    });
    if (!result) return res.status(404).json({
      error: "Ticket not found."
    });
    const ticket = await getPortalTicketDetail(ctx.clientId, req.params.id, ticketScope(ctx));
    res.json({
      ...result,
      ticket
    });
  } catch (err) {
    if (err?.message === "TICKET_NOT_AWAITING_VALIDATION") {
      return res.status(400).json({
        error: "This ticket is not awaiting your validation."
      });
    }
    if (err?.message === "VALIDATION_NOT_PENDING") {
      return res.status(409).json({
        error: "You have already responded to this validation request."
      });
    }
    if (err?.message === "VALIDATION_UNAVAILABLE") {
      return res.status(503).json({
        error: "Client validation module unavailable."
      });
    }
    if (err?.message === "FAILED_TO_CLOSE_TICKET") {
      return res.status(500).json({
        error: "Validation was saved but the ticket could not be closed. Try again or contact support."
      });
    }
    console.error("POST /client-portal/tickets/:id/validate-resolution:", err);
    res.status(500).json({
      error: "Error saving your response"
    });
  }
});
router.post("/tickets/:id/satisfaction", [param("id").isUUID(), body("ratings").optional().isObject(), body("rating").optional().isInt({
  min: 1,
  max: 5
}), body("message").optional().isString()], async (req, res) => {
  const validationResponse = validationErrorOrNull(req, res);
  if (validationResponse) return;
  const ctx = await getPortalContext(req, res);
  if (!ctx) return;
  try {
    const visible = await assertPortalTicketVisible(ctx.clientId, req.params.id, ticketScope(ctx));
    if (!visible) return res.status(404).json({
      error: "Ticket not found."
    });
    const satisfaction = await submitPortalTicketSatisfaction({
      clientId: ctx.clientId,
      ticketId: req.params.id,
      userId: ctx.userId,
      ratings: req.body.ratings,
      rating: req.body.rating,
      message: req.body.message
    });
    if (!satisfaction) return res.status(404).json({
      error: "Ticket not found."
    });
    res.status(201).json(satisfaction);
  } catch (err) {
    if (err?.message === "TICKET_NOT_CLOSED") {
      return res.status(400).json({
        error: "You can only leave feedback on a resolved or closed ticket."
      });
    }
    if (err?.message === "VALIDATION_PENDING") {
      return res.status(400).json({
        error: "Validate the proposed resolution before leaving your feedback."
      });
    }
    if (err?.message === "ALREADY_SUBMITTED") {
      return res.status(409).json({
        error: "Feedback has already been recorded for this ticket."
      });
    }
    if (err?.message === "INVALID_RATINGS" || err?.message === "INVALID_RATING") {
      return res.status(400).json({
        error: "Each criterion must be rated from 1 to 5 stars."
      });
    }
    if (err?.message === "SATISFACTION_UNAVAILABLE") {
      return res.status(503).json({
        error: "Satisfaction module is not enabled. Run: node scripts/run-ticket-satisfaction-migration.js"
      });
    }
    console.error("POST /client-portal/tickets/:id/satisfaction:", err);
    res.status(500).json({
      error: "Error saving feedback"
    });
  }
});
router.patch("/tickets/:id/satisfaction", [param("id").isUUID(), body("ratings").optional().isObject(), body("rating").optional().isInt({
  min: 1,
  max: 5
}), body("message").optional().isString()], async (req, res) => {
  const validationResponse = validationErrorOrNull(req, res);
  if (validationResponse) return;
  const ctx = await getPortalContext(req, res);
  if (!ctx) return;
  try {
    const visible = await assertPortalTicketVisible(ctx.clientId, req.params.id, ticketScope(ctx));
    if (!visible) return res.status(404).json({
      error: "Ticket not found."
    });
    const satisfaction = await updatePortalTicketSatisfaction({
      clientId: ctx.clientId,
      ticketId: req.params.id,
      userId: ctx.userId,
      ratings: req.body.ratings,
      rating: req.body.rating,
      message: req.body.message
    });
    if (!satisfaction) return res.status(404).json({
      error: "Ticket not found."
    });
    res.json(satisfaction);
  } catch (err) {
    if (err?.message === "TICKET_NOT_CLOSED") {
      return res.status(400).json({
        error: "You can only edit feedback on a resolved or closed ticket."
      });
    }
    if (err?.message === "VALIDATION_PENDING") {
      return res.status(400).json({
        error: "Validate the proposed resolution before editing your feedback."
      });
    }
    if (err?.message === "NOT_FOUND") {
      return res.status(404).json({
        error: "No feedback recorded for this ticket."
      });
    }
    if (err?.message === "NOT_AUTHOR") {
      return res.status(403).json({
        error: "You can only edit your own rating."
      });
    }
    if (err?.message === "INVALID_RATINGS" || err?.message === "INVALID_RATING") {
      return res.status(400).json({
        error: "Each criterion must be rated from 1 to 5 stars."
      });
    }
    if (err?.message === "SATISFACTION_UNAVAILABLE") {
      return res.status(503).json({
        error: "Satisfaction module is not enabled."
      });
    }
    console.error("PATCH /client-portal/tickets/:id/satisfaction:", err);
    res.status(500).json({
      error: "Error updating feedback"
    });
  }
});
router.get("/vault-files", [query("category").optional().isString(), query("search").optional().isString(), query("limit").optional().isInt({
  min: 1,
  max: 500
}), query("offset").optional().isInt({
  min: 0
})], async (req, res) => {
  const validationResponse = validationErrorOrNull(req, res);
  if (validationResponse) return;
  const ctx = await getPortalContext(req, res);
  if (!ctx) return;
  try {
    const files = await listPortalVaultFiles(ctx.clientId, {
      category: req.query.category,
      search: req.query.search,
      limit: req.query.limit,
      offset: req.query.offset
    });
    const total = await countPortalVaultFiles(ctx.clientId, {
      category: req.query.category,
      search: req.query.search
    });
    res.json({
      files,
      total
    });
  } catch (err) {
    console.error("GET /client-portal/vault-files:", err);
    res.status(500).json({
      error: "Error retrieving documents"
    });
  }
});
router.get("/vault-files/:id/download", [param("id").isUUID()], async (req, res) => {
  const validationResponse = validationErrorOrNull(req, res);
  if (validationResponse) return;
  const ctx = await getPortalContext(req, res);
  if (!ctx) return;
  try {
    const file = await getPortalVaultFileRecord(ctx.clientId, req.params.id);
    if (!file) return res.status(404).json({
      error: "Document not found."
    });
    const fullPath = resolveClientFileDiskPath(file.file_path);
    if (!fullPath) return res.status(404).json({
      error: "File missing on disk."
    });
    res.setHeader("Content-Type", file.mime_type || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.file_name)}"`);
    fs.createReadStream(fullPath).pipe(res);
  } catch (err) {
    console.error("GET /client-portal/vault-files/:id/download:", err);
    res.status(500).json({
      error: "Error during download."
    });
  }
});
router.get("/vault-files/:id/preview", [param("id").isUUID()], async (req, res) => {
  const validationResponse = validationErrorOrNull(req, res);
  if (validationResponse) return;
  const ctx = await getPortalContext(req, res);
  if (!ctx) return;
  try {
    const file = await getPortalVaultFileRecord(ctx.clientId, req.params.id);
    if (!file) return res.status(404).json({
      error: "Document not found."
    });
    const fullPath = resolveClientFileDiskPath(file.file_path);
    if (!fullPath) return res.status(404).json({
      error: "File missing on disk."
    });
    res.setHeader("Content-Type", file.mime_type || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.file_name)}"`);
    allowAssetEmbedding(res);
    fs.createReadStream(fullPath).pipe(res);
  } catch (err) {
    console.error("GET /client-portal/vault-files/:id/preview:", err);
    res.status(500).json({
      error: "Error during preview."
    });
  }
});
router.get("/vault-secrets", async (req, res) => {
  const ctx = await getPortalContext(req, res);
  if (!ctx) return;
  try {
    const secrets = await listPortalVaultSecrets(ctx.contactId);
    const total = await countPortalVaultSecrets(ctx.contactId);
    res.json({
      secrets,
      total
    });
  } catch (err) {
    console.error("GET /client-portal/vault-secrets:", err);
    res.status(500).json({
      error: "Error retrieving vault access entries"
    });
  }
});
router.post("/vault-secrets/:id/reveal", [param("id").isUUID()], async (req, res) => {
  const validationResponse = validationErrorOrNull(req, res);
  if (validationResponse) return;
  const ctx = await getPortalContext(req, res);
  if (!ctx) return;
  try {
    const revealed = await revealPortalVaultSecret(ctx.contactId, req.params.id);
    res.json(revealed);
  } catch (err) {
    console.error("POST /client-portal/vault-secrets/:id/reveal:", err);
    const code = String(err.code || "").toUpperCase();
    const status = code === "NOT_FOUND" ? 404 : code === "ACTIVE" ? 500 : 410;
    res.status(status === 410 ? 410 : status).json({
      error: err.message || "Unable to display this vault entry.",
      code: code || "UNAVAILABLE"
    });
  }
});
router.post("/vault-secrets/:id/request-revocation", [param("id").isUUID()], async (req, res) => {
  const validationResponse = validationErrorOrNull(req, res);
  if (validationResponse) return;
  const ctx = await getPortalContext(req, res);
  if (!ctx) return;
  try {
    const result = await requestPortalVaultSecretRevocation(ctx.contactId, req.params.id, ctx.userId);
    res.json(result);
  } catch (err) {
    console.error("POST /client-portal/vault-secrets/:id/request-revocation:", err);
    const status = err.message?.includes("not found") ? 404 : 400;
    res.status(status).json({
      error: err.message || "Unable to delete this vault entry."
    });
  }
});
router.get("/knowledge-base", [
  query("search").optional().isString(),
  query("folderId").optional().isString(),
  query("category").optional().isString(),
  query("favorites").optional().isIn(["1", "true"])
], async (req, res) => {
  if (validationErrorOrNull(req, res)) return;
  const ctx = await getPortalContext(req, res);
  if (!ctx) return;
  try {
    const articles = await listPortalKnowledgeArticles(ctx.clientId, ctx.contactId, {
      search: req.query.search,
      folderId: req.query.folderId,
      category: req.query.category,
      favoritesOnly: req.query.favorites === "1" || req.query.favorites === "true"
    });
    res.json({
      articles,
      total: articles.length
    });
  } catch (err) {
    console.error("GET /client-portal/knowledge-base:", err);
    res.status(500).json({
      error: "Error loading knowledge base."
    });
  }
});
router.get("/knowledge-base/:id", [param("id").isUUID()], async (req, res) => {
  if (validationErrorOrNull(req, res)) return;
  const ctx = await getPortalContext(req, res);
  if (!ctx) return;
  try {
    const article = await getPortalKnowledgeArticle(ctx.clientId, ctx.contactId, req.params.id, { recordView: true });
    if (!article) {
      return res.status(404).json({
        error: "Article not found."
      });
    }
    res.json({ article });
  } catch (err) {
    console.error("GET /client-portal/knowledge-base/:id:", err);
    res.status(500).json({
      error: "Error loading article."
    });
  }
});
router.post(
  "/knowledge-base/:id/rating",
  [param("id").isUUID(), body("rating").isInt({ min: 1, max: 5 })],
  async (req, res) => {
    if (validationErrorOrNull(req, res)) return;
    const ctx = await getPortalContext(req, res);
    if (!ctx) return;
    try {
      if (!ctx.contactId) {
        return res.status(400).json({ error: "A contact is required to rate this article." });
      }
      const visible = await getPortalKnowledgeArticle(ctx.clientId, ctx.contactId, req.params.id, { includeFeedback: false });
      if (!visible) return res.status(404).json({ error: "Article not found." });
      await upsertArticleRating(req.params.id, {
        contactId: ctx.contactId,
        clientId: ctx.clientId,
        rating: req.body.rating
      });
      const article = await getPortalKnowledgeArticle(ctx.clientId, ctx.contactId, req.params.id);
      res.json({ article });
    } catch (err) {
      console.error("POST /client-portal/knowledge-base/:id/rating:", err);
      res.status(err.status || 500).json({ error: err.message || "Error saving rating." });
    }
  }
);
router.post(
  "/knowledge-base/:id/comments",
  [param("id").isUUID(), body("body").isString().isLength({ min: 1, max: 2000 })],
  async (req, res) => {
    if (validationErrorOrNull(req, res)) return;
    const ctx = await getPortalContext(req, res);
    if (!ctx) return;
    try {
      if (!ctx.contactId) {
        return res.status(400).json({ error: "A contact is required to comment." });
      }
      const visible = await getPortalKnowledgeArticle(ctx.clientId, ctx.contactId, req.params.id, { includeFeedback: false });
      if (!visible) return res.status(404).json({ error: "Article not found." });
      await addArticleComment(req.params.id, {
        contactId: ctx.contactId,
        clientId: ctx.clientId,
        body: req.body.body
      });
      const article = await getPortalKnowledgeArticle(ctx.clientId, ctx.contactId, req.params.id);
      res.json({ article });
    } catch (err) {
      console.error("POST /client-portal/knowledge-base/:id/comments:", err);
      res.status(err.status || 500).json({ error: err.message || "Error posting comment." });
    }
  }
);
async function updatePortalKnowledgeComment(req, res) {
  if (validationErrorOrNull(req, res)) return;
  const ctx = await getPortalContext(req, res);
  if (!ctx) return;
  try {
    if (!ctx.contactId) {
      return res.status(400).json({ error: "A contact is required." });
    }
    const visible = await getPortalKnowledgeArticle(ctx.clientId, ctx.contactId, req.params.id, { includeFeedback: false });
    if (!visible) return res.status(404).json({ error: "Article not found." });
    const ok = await updateArticleComment(req.params.id, req.params.commentId, {
      contactId: ctx.contactId,
      body: req.body.body
    });
    if (!ok) return res.status(404).json({ error: "Comment not found." });
    const article = await getPortalKnowledgeArticle(ctx.clientId, ctx.contactId, req.params.id);
    res.json({ article });
  } catch (err) {
    console.error(`${req.method} /client-portal/knowledge-base/:id/comments/:commentId:`, err);
    res.status(err.status || 500).json({ error: err.message || "Error editing comment." });
  }
}
const updatePortalCommentValidators = [param("id").isUUID(), param("commentId").isUUID(), body("body").isString().isLength({ min: 1, max: 2000 })];
router.patch("/knowledge-base/:id/comments/:commentId", updatePortalCommentValidators, updatePortalKnowledgeComment);
router.put("/knowledge-base/:id/comments/:commentId", updatePortalCommentValidators, updatePortalKnowledgeComment);
router.delete(
  "/knowledge-base/:id/comments/:commentId",
  [param("id").isUUID(), param("commentId").isUUID()],
  async (req, res) => {
    if (validationErrorOrNull(req, res)) return;
    const ctx = await getPortalContext(req, res);
    if (!ctx) return;
    try {
      if (!ctx.contactId) {
        return res.status(400).json({ error: "A contact is required." });
      }
      const visible = await getPortalKnowledgeArticle(ctx.clientId, ctx.contactId, req.params.id, { includeFeedback: false });
      if (!visible) return res.status(404).json({ error: "Article not found." });
      const ok = await deleteArticleComment(req.params.id, req.params.commentId, { contactId: ctx.contactId });
      if (!ok) return res.status(404).json({ error: "Comment not found." });
      const article = await getPortalKnowledgeArticle(ctx.clientId, ctx.contactId, req.params.id);
      res.json({ article });
    } catch (err) {
      console.error("DELETE /client-portal/knowledge-base/:id/comments/:commentId:", err);
      res.status(err.status || 500).json({ error: err.message || "Error deleting comment." });
    }
  }
);
router.post(
  "/knowledge-base/:id/helpful",
  [param("id").isUUID(), body("helpful").isBoolean()],
  async (req, res) => {
    if (validationErrorOrNull(req, res)) return;
    const ctx = await getPortalContext(req, res);
    if (!ctx) return;
    try {
      if (!ctx.contactId) {
        return res.status(400).json({ error: "A contact is required." });
      }
      const visible = await getPortalKnowledgeArticle(ctx.clientId, ctx.contactId, req.params.id, { includeFeedback: false });
      if (!visible) return res.status(404).json({ error: "Article not found." });
      await upsertHelpful(req.params.id, { contactId: ctx.contactId, helpful: req.body.helpful });
      const article = await getPortalKnowledgeArticle(ctx.clientId, ctx.contactId, req.params.id);
      res.json({ article });
    } catch (err) {
      console.error("POST /client-portal/knowledge-base/:id/helpful:", err);
      res.status(err.status || 500).json({ error: err.message || "Error saving feedback." });
    }
  }
);
router.post(
  "/knowledge-base/:id/favorite",
  [param("id").isUUID()],
  async (req, res) => {
    if (validationErrorOrNull(req, res)) return;
    const ctx = await getPortalContext(req, res);
    if (!ctx) return;
    try {
      if (!ctx.contactId) {
        return res.status(400).json({ error: "A contact is required." });
      }
      const visible = await getPortalKnowledgeArticle(ctx.clientId, ctx.contactId, req.params.id, { includeFeedback: false });
      if (!visible) return res.status(404).json({ error: "Article not found." });
      await toggleFavorite(req.params.id, ctx.contactId);
      const article = await getPortalKnowledgeArticle(ctx.clientId, ctx.contactId, req.params.id);
      res.json({ article });
    } catch (err) {
      console.error("POST /client-portal/knowledge-base/:id/favorite:", err);
      res.status(err.status || 500).json({ error: err.message || "Error saving favorite." });
    }
  }
);
router.get("/knowledge-base/:id/assets/:assetId", [param("id").isUUID(), param("assetId").isUUID()], async (req, res) => {
  if (validationErrorOrNull(req, res)) return;
  const ctx = await getPortalContext(req, res);
  if (!ctx) return;
  try {
    const allowed = await portalCanAccessAsset(ctx.clientId, ctx.contactId, req.params.id);
    if (!allowed) {
      return res.status(404).json({
        error: "Article not found."
      });
    }
    const asset = await getKnowledgeAsset(req.params.id, req.params.assetId);
    if (!asset) {
      return res.status(404).json({
        error: "File not found."
      });
    }
    const filePath = path.join(KNOWLEDGE_ASSETS_DIR, asset.stored_name);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: "File not found."
      });
    }
    res.setHeader("Content-Type", asset.mime_type || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(asset.file_name || "file")}"`);
    res.setHeader("Cache-Control", "private, max-age=86400");
    allowAssetEmbedding(res);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error("GET /client-portal/knowledge-base/:id/assets/:assetId:", err);
    res.status(500).json({
      error: "Error loading file."
    });
  }
});
async function loadPortalContactForUser(contactId, clientId) {
  const ok = await contactBelongsToClient(contactId, clientId).catch(() => false);
  if (!ok) return null;
  const {
    rows
  } = await pool.query(`SELECT id, nom, prenom, email, telephone,
            COALESCE(communications, '[]'::jsonb) AS communications
     FROM v_b_contacts
     WHERE id = $1`, [contactId]);
  return hydratePortalContactRow(rows[0] || null);
}
function hydratePortalContactRow(row) {
  if (!row) return null;
  const synced = syncLegacyContactFields(normalizeContactCommunications(row));
  return {
    id: row.id,
    nom: row.nom,
    prenom: row.prenom,
    email: synced.email,
    telephone: synced.telephone,
    communications: synced.communications
  };
}
router.get("/contact", async (req, res) => {
  const ctx = await getPortalContext(req, res);
  if (!ctx) return;
  if (!ctx.contactId) {
    return res.status(404).json({
      error: "No contact record associated with this account."
    });
  }
  try {
    const contact = await loadPortalContactForUser(ctx.contactId, ctx.clientId);
    if (!contact) {
      return res.status(404).json({
        error: "Contact not found."
      });
    }
    res.json({
      contact
    });
  } catch (err) {
    console.error("GET /client-portal/contact:", err);
    res.status(500).json({
      error: "Error retrieving contact"
    });
  }
});
router.patch("/contact", [body("communications").isArray()], async (req, res) => {
  const validationResponse = validationErrorOrNull(req, res);
  if (validationResponse) return;
  const ctx = await getPortalContext(req, res);
  if (!ctx) return;
  if (!ctx.contactId) {
    return res.status(404).json({
      error: "No contact record associated with this account."
    });
  }
  const commError = validateContactCommunications(req.body.communications);
  if (commError) {
    return res.status(400).json({
      error: commError
    });
  }
  try {
    const current = await loadPortalContactForUser(ctx.contactId, ctx.clientId);
    if (!current) {
      return res.status(404).json({
        error: "Contact not found."
      });
    }
    const synced = syncLegacyContactFields(req.body.communications);
    const result = await pool.query(`UPDATE v_b_contacts
         SET email = $1, telephone = $2, communications = $3::jsonb, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING id, nom, prenom, email, telephone, communications`, [synced.email, synced.telephone, JSON.stringify(synced.communications), ctx.contactId]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Contact not found."
      });
    }
    const updated = hydratePortalContactRow(result.rows[0]);
    await syncPortalUserFromContact({
      ...updated,
      id: ctx.contactId,
      client_id: ctx.clientId,
      statut: "actif"
    });
    res.json({
      contact: updated
    });
  } catch (err) {
    if (String(err.message || "").includes("already used")) {
      return res.status(409).json({
        error: err.message
      });
    }
    console.error("PATCH /client-portal/contact:", err);
    res.status(500).json({
      error: "Error updating contact"
    });
  }
});
router.get("/companies", async (req, res) => {
  try {
    const userRow = await getPortalUserContext(req.user.id);
    if (!userRow) {
      return res.status(403).json({
        error: "Portal account not found."
      });
    }
    const contactId = await resolvePortalContactId(userRow);
    const companies = contactId ? await listPortalCompaniesForContact(contactId) : [];
    let activeClientId = userRow.client_id || req.user.client_id || null;
    if (activeClientId && companies.length > 0 && !companies.some(c => Number(c.client_id) === Number(activeClientId))) {
      activeClientId = companies[0].client_id;
    }
    if (activeClientId && !companies.some(c => Number(c.client_id) === Number(activeClientId))) {
      const { rows } = await pool.query(
        `SELECT id, name FROM v_b_clients WHERE id = $1 LIMIT 1`,
        [activeClientId]
      );
      if (rows[0]) {
        companies.unshift({
          id: Number(rows[0].id),
          client_id: Number(rows[0].id),
          name: rows[0].name || null,
          poste: null,
          is_primary: false
        });
      }
    }
    return res.json({
      companies,
      activeClientId
    });
  } catch (err) {
    console.error("GET /client-portal/companies:", err);
    return res.status(500).json({ error: "Unable to list companies." });
  }
});
router.post("/switch-company", [body("clientId").notEmpty()], async (req, res) => {
  const validationResponse = validationErrorOrNull(req, res);
  if (validationResponse) return;
  const ctx = await getPortalContext(req, res);
  if (!ctx) return;
  if (!ctx.contactId) {
    return res.status(400).json({ error: "No contact linked to this account." });
  }
  try {
    const updated = await switchPortalCompany(ctx.userId, ctx.contactId, req.body.clientId);
    const tokenPayload = isImpersonationPayload(req.user)
      ? {
          ...buildImpersonationClientPayload(updated, {
            id: req.user.impersonated_by,
            email: req.user.impersonated_by_email
          })
        }
      : buildSessionPayload(updated);
    const token = signSessionToken(tokenPayload);
    setSessionCookie(req, res, token);
    return res.json({
      client_id: updated.client_id,
      companies: await listPortalCompaniesForContact(ctx.contactId)
    });
  } catch (err) {
    console.error("POST /client-portal/switch-company:", err);
    return res.status(400).json({ error: err.message || "Unable to switch company." });
  }
});
export default router;
