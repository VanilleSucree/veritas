import { pool } from "../database/db.js";
import { PURGE_HARDWARE_FAMILIES } from "../utils/equipmentPurgeList.js";

const VIDEO_SURVEILLANCE_TABLES = [
  "v_b_clients_m_videosurveillance",
  "v_b_clients_m_camera",
  "v_b_clients_m_cameras"
];

const EXTRA_TABLES = ["v_b_clients_m_custom_equipment"];

/** JSON keys that may hold the free-text site name on equipment.data */
const LOCATION_KEYS = ["site", "location", "emplacement", "lieu", "localisation"];

function parseSites(raw) {
  let list = raw;
  if (typeof list === "string") {
    try {
      list = JSON.parse(list);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  return list
    .map((site, index) => {
      if (site == null) return null;
      if (typeof site === "string") {
        const name = site.trim();
        if (!name) return null;
        return {
          id: `legacy-${index}`,
          name,
          index
        };
      }
      if (typeof site !== "object") return null;
      const name = String(site.name || site.label || site.site || "").trim();
      if (!name) return null;
      const explicitId = String(site.id || "").trim();
      const id = explicitId || `legacy-${index}`;
      const sortOrder = Number.isFinite(Number(site.sortOrder)) ? Number(site.sortOrder) : index;
      return { id, name, index: sortOrder };
    })
    .filter(Boolean)
    .sort((a, b) => a.index - b.index);
}

function pushRename(renames, seenFrom, fromName, toName) {
  if (!fromName || !toName || fromName === toName) return;
  if (seenFrom.has(fromName)) return;
  seenFrom.add(fromName);
  renames.push({ from: fromName, to: toName });
}

/**
 * Detect site renames.
 * 1) same stable id, different name
 * 2) same position when ids differ (legacy sites / frontend UUID assignment)
 * 3) unique disappeared → appeared name pair
 */
export function detectClientSiteRenames(previousSites, nextSites) {
  const prev = parseSites(previousSites);
  const next = parseSites(nextSites);
  if (!prev.length || !next.length) return [];

  const renames = [];
  const seenFrom = new Set();
  const matchedPrev = new Set();
  const matchedNext = new Set();

  const nextById = new Map();
  next.forEach((site, index) => {
    if (!nextById.has(site.id)) nextById.set(site.id, { site, index });
  });

  prev.forEach((oldSite, prevIndex) => {
    const hit = nextById.get(oldSite.id);
    if (!hit) return;
    matchedPrev.add(prevIndex);
    matchedNext.add(hit.index);
    pushRename(renames, seenFrom, oldSite.name, hit.site.name);
  });

  const maxPos = Math.min(prev.length, next.length);
  for (let i = 0; i < maxPos; i++) {
    if (matchedPrev.has(i) || matchedNext.has(i)) continue;
    const oldSite = prev[i];
    const newSite = next[i];
    const oldNameStillExists = next.some(site => site.name === oldSite.name);
    const newNameAlreadyExisted = prev.some(site => site.name === newSite.name);
    if (oldNameStillExists || newNameAlreadyExisted) continue;
    matchedPrev.add(i);
    matchedNext.add(i);
    pushRename(renames, seenFrom, oldSite.name, newSite.name);
  }

  const disappeared = prev
    .filter((_, index) => !matchedPrev.has(index))
    .map(site => site.name)
    .filter(name => !next.some(site => site.name === name));
  const appeared = next
    .filter((_, index) => !matchedNext.has(index))
    .map(site => site.name)
    .filter(name => !prev.some(site => site.name === name));

  if (disappeared.length === 1 && appeared.length === 1) {
    pushRename(renames, seenFrom, disappeared[0], appeared[0]);
  }

  return renames;
}

async function tableExists(tableName) {
  const result = await pool.query(
    `SELECT to_regclass($1) AS reg`,
    [`public.${tableName}`]
  );
  return Boolean(result.rows[0]?.reg);
}

function buildEquipmentTables() {
  const tables = [
    ...PURGE_HARDWARE_FAMILIES.map(item => item.table),
    ...VIDEO_SURVEILLANCE_TABLES,
    ...EXTRA_TABLES
  ];
  return [...new Set(tables.filter(Boolean))];
}

function buildLocationSetExpression(toParam) {
  // Nested jsonb_set so every known location alias is rewritten.
  let expr = "COALESCE(data, '{}'::jsonb)";
  for (const key of LOCATION_KEYS) {
    expr = `jsonb_set(${expr}, '{${key}}', to_jsonb(${toParam}::text), true)`;
  }
  return expr;
}

function buildLocationMatchClause(fromParam) {
  return LOCATION_KEYS.map(
    key => `NULLIF(BTRIM(COALESCE(data->>'${key}', '')), '') = ${fromParam}`
  ).join("\n         OR ");
}

async function renameLocationOnTable(table, clientId, fromName, toName) {
  const exists = await tableExists(table);
  if (!exists) return 0;

  const result = await pool.query(
    `UPDATE ${table}
     SET data = ${buildLocationSetExpression("$3")},
         updated_at = NOW()
     WHERE client_id = $1
       AND (
         ${buildLocationMatchClause("$2")}
       )`,
    [clientId, fromName, toName]
  );
  return result.rowCount || 0;
}

function mergeRenames(detected, explicit) {
  const renames = [];
  const seenFrom = new Set();
  for (const list of [detected, explicit]) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      const from = String(item?.from || "").trim();
      const to = String(item?.to || "").trim();
      pushRename(renames, seenFrom, from, to);
    }
  }
  return renames;
}

function levenshtein(a, b) {
  const left = String(a || "");
  const right = String(b || "");
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  const rows = left.length + 1;
  const cols = right.length + 1;
  const matrix = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i++) matrix[i][0] = i;
  for (let j = 0; j < cols; j++) matrix[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[left.length][right.length];
}

/**
 * Collect distinct free-text locations still present on equipment for a client.
 */
async function collectEquipmentLocations(clientId, tables) {
  const values = new Set();
  for (const table of tables) {
    const exists = await tableExists(table);
    if (!exists) continue;
    try {
      const result = await pool.query(
        `SELECT DISTINCT loc AS location
         FROM ${table}
         CROSS JOIN LATERAL (
           SELECT NULLIF(BTRIM(value), '') AS loc
           FROM (VALUES
             (data->>'site'),
             (data->>'location'),
             (data->>'emplacement'),
             (data->>'lieu'),
             (data->>'localisation')
           ) AS keys(value)
         ) locs
         WHERE client_id = $1
           AND loc IS NOT NULL`,
        [clientId]
      );
      for (const row of result.rows) {
        const location = String(row.location || "").trim();
        if (location) values.add(location);
      }
    } catch (err) {
      console.warn(`[sites-rename] collect ${table}:`, err?.message || err);
    }
  }
  return [...values];
}

/**
 * Map orphan equipment locations to the unique close current site name (edit distance <= 2).
 * Fixes leftovers when a rename was saved before cascade worked.
 */
function detectOrphanLocationRepairs(orphanLocations, siteNames) {
  const sites = (siteNames || []).map(name => String(name || "").trim()).filter(Boolean);
  const siteSet = new Set(sites);
  const repairs = [];
  const seenFrom = new Set();

  for (const orphan of orphanLocations || []) {
    const from = String(orphan || "").trim();
    if (!from || siteSet.has(from) || seenFrom.has(from)) continue;
    const candidates = sites.filter(site => {
      if (site === from) return false;
      const distance = levenshtein(from.toLowerCase(), site.toLowerCase());
      const maxDistance = Math.max(1, Math.min(2, Math.floor(Math.max(from.length, site.length) / 8)));
      return distance > 0 && distance <= maxDistance;
    });
    if (candidates.length === 1) {
      pushRename(repairs, seenFrom, from, candidates[0]);
    }
  }
  return repairs;
}

async function applyRenamePairs(clientId, renames, tables) {
  if (!renames.length) return 0;
  let updatedRows = 0;
  const tempPrefix = `__site_rename_${Date.now()}_`;
  const phase1 = renames.map((item, index) => ({
    ...item,
    temp: `${tempPrefix}${index}`
  }));

  for (const item of phase1) {
    for (const table of tables) {
      try {
        updatedRows += await renameLocationOnTable(table, clientId, item.from, item.temp);
      } catch (err) {
        console.warn(`[sites-rename] phase1 ${table}:`, err?.message || err);
      }
    }
  }

  for (const item of phase1) {
    for (const table of tables) {
      try {
        updatedRows += await renameLocationOnTable(table, clientId, item.temp, item.to);
      } catch (err) {
        console.warn(`[sites-rename] phase2 ${table}:`, err?.message || err);
      }
    }
  }
  return updatedRows;
}

/**
 * When a client site is renamed, rewrite equipment location strings that still
 * point to the old name (equipment stores site as free-text, not site id).
 * Covers all hardware families + custom equipment + vidéosurveillance.
 *
 * @param {object} [options]
 * @param {Array<{from:string,to:string}>} [options.explicitRenames] - renames computed by the client UI
 */
export async function propagateClientSiteRenames(clientId, previousSites, nextSites, options = {}) {
  if (!clientId) {
    return { renames: 0, updatedRows: 0 };
  }

  const detected = detectClientSiteRenames(previousSites, nextSites);
  const renames = mergeRenames(detected, options.explicitRenames);
  const tables = buildEquipmentTables();
  let updatedRows = await applyRenamePairs(clientId, renames, tables);

  // Repair leftovers from older renames that never cascaded to equipment.
  const nextNames = parseSites(nextSites).map(site => site.name);
  const equipmentLocations = await collectEquipmentLocations(clientId, tables);
  const orphanRepairs = detectOrphanLocationRepairs(equipmentLocations, nextNames)
    .filter(item => !renames.some(rename => rename.from === item.from));
  if (orphanRepairs.length) {
    updatedRows += await applyRenamePairs(clientId, orphanRepairs, tables);
  }

  return {
    renames: renames.length + orphanRepairs.length,
    updatedRows
  };
}
