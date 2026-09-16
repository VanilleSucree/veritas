import { pool } from "../database/db.js";
import { PURGE_HARDWARE_FAMILIES } from "../utils/equipmentPurgeList.js";

const VIDEO_SURVEILLANCE_TABLES = [
  "v_b_clients_m_videosurveillance",
  "v_b_clients_m_camera",
  "v_b_clients_m_cameras"
];

const EXTRA_TABLES = ["v_b_clients_m_custom_equipment"];

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
          id: `legacy-${index}-${name.toLowerCase().replace(/\s+/g, "-")}`,
          name
        };
      }
      if (typeof site !== "object") return null;
      const name = String(site.name || site.label || site.site || "").trim();
      if (!name) return null;
      const id = String(site.id || "").trim() || `legacy-${index}-${name.toLowerCase().replace(/\s+/g, "-")}`;
      return { id, name };
    })
    .filter(Boolean);
}

/**
 * Detect site renames by stable id (same id, different name).
 * Returns [{ from, to }] with unique from→to pairs.
 */
export function detectClientSiteRenames(previousSites, nextSites) {
  const prev = parseSites(previousSites);
  const next = parseSites(nextSites);
  if (!prev.length || !next.length) return [];

  const nextById = new Map(next.map(site => [site.id, site]));
  const renames = [];
  const seenFrom = new Set();

  for (const oldSite of prev) {
    const updated = nextById.get(oldSite.id);
    if (!updated) continue;
    if (updated.name === oldSite.name) continue;
    if (seenFrom.has(oldSite.name)) continue;
    seenFrom.add(oldSite.name);
    renames.push({ from: oldSite.name, to: updated.name });
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

async function renameLocationOnTable(table, clientId, fromName, toName) {
  const exists = await tableExists(table);
  if (!exists) return 0;

  const result = await pool.query(
    `UPDATE ${table}
     SET data = jsonb_set(
           jsonb_set(
             jsonb_set(
               COALESCE(data, '{}'::jsonb),
               '{site}', to_jsonb($3::text), true
             ),
             '{location}', to_jsonb($3::text), true
           ),
           '{emplacement}', to_jsonb($3::text), true
         ),
         updated_at = NOW()
     WHERE client_id = $1
       AND (
         NULLIF(BTRIM(COALESCE(data->>'site', '')), '') = $2
         OR NULLIF(BTRIM(COALESCE(data->>'location', '')), '') = $2
         OR NULLIF(BTRIM(COALESCE(data->>'emplacement', '')), '') = $2
       )`,
    [clientId, fromName, toName]
  );
  return result.rowCount || 0;
}

/**
 * When a client site is renamed, rewrite equipment location strings that still
 * point to the old name (equipment stores site as free-text, not site id).
 */
export async function propagateClientSiteRenames(clientId, previousSites, nextSites) {
  const renames = detectClientSiteRenames(previousSites, nextSites);
  if (!clientId || renames.length === 0) {
    return { renames: 0, updatedRows: 0 };
  }

  const tables = buildEquipmentTables();
  let updatedRows = 0;

  // Two-phase rename to avoid collisions (A→B and B→A).
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

  return { renames: renames.length, updatedRows };
}
