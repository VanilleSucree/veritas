import { pool } from "../database/db.js";
import {
  deleteSiteLinksForContactClient,
  replaceSiteLinksForContactClient,
  attachSiteLinksToContacts,
  normalizeSiteLinksInput
} from "./contactSiteLinks.js";

function db(client) {
  return client || pool;
}

function toInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function isMissingRelationError(err) {
  return err?.code === "42P01";
}

let linksTableExistsCache = null;

export async function hasContactClientLinksTable({ client } = {}) {
  if (linksTableExistsCache === true) return true;
  if (linksTableExistsCache === false) return false;
  try {
    const { rows } = await db(client).query(`SELECT to_regclass('public.v_b_contact_client_links') AS reg`);
    linksTableExistsCache = Boolean(rows[0]?.reg);
  } catch {
    linksTableExistsCache = false;
  }
  return linksTableExistsCache;
}

export function invalidateContactClientLinksCache() {
  linksTableExistsCache = null;
}

function normalizeMembershipRow(row) {
  if (!row) return null;
  return {
    id: Number(row.client_id),
    client_id: Number(row.client_id),
    name: row.client_name || row.name || null,
    poste: row.poste != null ? String(row.poste) : null,
    is_primary: row.is_primary === true
  };
}

function mergeMemberships(...groups) {
  const list = [];
  const seen = new Set();
  for (const group of groups) {
    for (const row of Array.isArray(group) ? group : []) {
      const id = Number(row?.client_id);
      if (!Number.isInteger(id) || id <= 0 || seen.has(id)) continue;
      seen.add(id);
      list.push(row);
    }
  }
  return list;
}

function formatPrimaryName(contact) {
  if (!contact) return null;
  const prenom = String(contact.prenom || "").trim();
  const nom = String(contact.nom || "").trim();
  if (prenom && nom) return `${prenom} ${nom}`;
  return nom || prenom || null;
}

function pickPrimaryFromRows(contacts) {
  if (!Array.isArray(contacts) || contacts.length === 0) return null;
  return contacts.find(c => c.is_primary)
    || contacts.find(c => String(c.poste || "").toLowerCase().includes("principal"))
    || contacts.find(c => {
      const status = String(c.statut || "").toLowerCase();
      return status.includes("actif") && !status.includes("inactif");
    })
    || contacts[0];
}

/**
 * Normalize API memberships payload.
 * Accepts memberships[], client_ids[], or a single client_id fallback.
 */
export function normalizeMembershipsInput(payload = {}, fallbackClientId = null) {
  const hasSitesKeys = row => Boolean(row)
    && (Object.prototype.hasOwnProperty.call(row, "sites")
      || Object.prototype.hasOwnProperty.call(row, "site_ids")
      || Object.prototype.hasOwnProperty.call(row, "site_id"));

  if (Array.isArray(payload?.memberships) && payload.memberships.length > 0) {
    return payload.memberships
      .map((row, idx) => {
        const clientId = toInt(row?.client_id ?? row?.id);
        if (!clientId) return null;
        const base = {
          client_id: clientId,
          poste: row?.poste != null ? String(row.poste).trim() || null : null,
          is_primary: row?.is_primary === true,
          _order: idx
        };
        if (!hasSitesKeys(row)) return base;
        const siteLinks = normalizeSiteLinksInput(row, clientId);
        return {
          ...base,
          sites: siteLinks.map(link => ({
            id: link.site_id,
            site_id: link.site_id,
            is_primary: Boolean(link.is_primary)
          })),
          site_ids: siteLinks.map(link => link.site_id)
        };
      })
      .filter(Boolean);
  }
  if (Array.isArray(payload?.client_ids)) {
    return payload.client_ids
      .map((id, idx) => {
        const clientId = toInt(id);
        if (!clientId) return null;
        return {
          client_id: clientId,
          poste: null,
          is_primary: false,
          _order: idx
        };
      })
      .filter(Boolean);
  }
  const single = toInt(payload?.client_id ?? fallbackClientId);
  if (!single) return [];
  const base = {
    client_id: single,
    poste: payload?.poste != null ? String(payload.poste).trim() || null : null,
    is_primary: Boolean(payload?.is_primary) || String(payload?.poste || "").toLowerCase().includes("principal"),
    _order: 0
  };
  if (!hasSitesKeys(payload)) return [base];
  const siteLinks = normalizeSiteLinksInput(payload, single);
  return [{
    ...base,
    sites: siteLinks.map(link => ({
      id: link.site_id,
      site_id: link.site_id,
      is_primary: Boolean(link.is_primary)
    })),
    site_ids: siteLinks.map(link => link.site_id)
  }];
}

async function listLegacyMembershipsForContact(contactId, { client } = {}) {
  const id = toInt(contactId);
  if (!id) return [];
  const { rows } = await db(client).query(
    `SELECT c.id AS contact_id, c.client_id, c.poste,
            CASE WHEN lower(coalesce(c.poste, '')) LIKE '%principal%' THEN TRUE ELSE FALSE END AS is_primary,
            cli.name AS client_name
     FROM v_b_contacts c
     LEFT JOIN v_b_clients cli ON cli.id = c.client_id
     WHERE c.id = $1 AND c.client_id IS NOT NULL`,
    [id]
  );
  return rows.map(normalizeMembershipRow).filter(Boolean);
}

export async function listMembershipsForContact(contactId, { client } = {}) {
  const id = toInt(contactId);
  if (!id) return [];
  if (!(await hasContactClientLinksTable({ client }))) {
    return listLegacyMembershipsForContact(id, { client });
  }
  try {
    const { rows } = await db(client).query(
      `SELECT l.contact_id, l.client_id, l.poste, l.is_primary, cli.name AS client_name
       FROM v_b_contact_client_links l
       LEFT JOIN v_b_clients cli ON cli.id = l.client_id
       WHERE l.contact_id = $1
       ORDER BY cli.name NULLS LAST, l.client_id`,
      [id]
    );
    const fromLinks = rows.map(normalizeMembershipRow).filter(Boolean);
    const legacy = await listLegacyMembershipsForContact(id, { client });
    const merged = mergeMemberships(fromLinks, legacy);
    if (merged.length > 0) return merged;
    return legacy;
  } catch (err) {
    if (isMissingRelationError(err)) {
      linksTableExistsCache = false;
      return listLegacyMembershipsForContact(id, { client });
    }
    throw err;
  }
}

export async function listMembershipsByContactIds(contactIds = [], { client } = {}) {
  const ids = [...new Set((Array.isArray(contactIds) ? contactIds : []).map(toInt).filter(Boolean))];
  const map = new Map();
  if (ids.length === 0) return map;

  if (!(await hasContactClientLinksTable({ client }))) {
    const { rows } = await db(client).query(
      `SELECT c.id AS contact_id, c.client_id, c.poste,
              CASE WHEN lower(coalesce(c.poste, '')) LIKE '%principal%' THEN TRUE ELSE FALSE END AS is_primary,
              cli.name AS client_name
       FROM v_b_contacts c
       LEFT JOIN v_b_clients cli ON cli.id = c.client_id
       WHERE c.id = ANY($1::int[]) AND c.client_id IS NOT NULL
       ORDER BY c.id, cli.name NULLS LAST`,
      [ids]
    );
    for (const row of rows) {
      const contactId = Number(row.contact_id);
      if (!map.has(contactId)) map.set(contactId, []);
      map.get(contactId).push(normalizeMembershipRow(row));
    }
    return map;
  }

  try {
    const { rows } = await db(client).query(
      `SELECT l.contact_id, l.client_id, l.poste, l.is_primary, cli.name AS client_name
       FROM v_b_contact_client_links l
       LEFT JOIN v_b_clients cli ON cli.id = l.client_id
       WHERE l.contact_id = ANY($1::int[])
       ORDER BY l.contact_id, cli.name NULLS LAST, l.client_id`,
      [ids]
    );
    for (const row of rows) {
      const contactId = Number(row.contact_id);
      if (!map.has(contactId)) map.set(contactId, []);
      map.get(contactId).push(normalizeMembershipRow(row));
    }
    // Fill gaps from legacy client_id when no link rows
    const missing = ids.filter(id => !map.has(id));
    if (missing.length > 0) {
      const legacy = await db(client).query(
        `SELECT c.id AS contact_id, c.client_id, c.poste,
                CASE WHEN lower(coalesce(c.poste, '')) LIKE '%principal%' THEN TRUE ELSE FALSE END AS is_primary,
                cli.name AS client_name
         FROM v_b_contacts c
         LEFT JOIN v_b_clients cli ON cli.id = c.client_id
         WHERE c.id = ANY($1::int[]) AND c.client_id IS NOT NULL`,
        [missing]
      );
      for (const row of legacy.rows) {
        const contactId = Number(row.contact_id);
        if (!map.has(contactId)) map.set(contactId, []);
        map.get(contactId).push(normalizeMembershipRow(row));
      }
    }
    return map;
  } catch (err) {
    if (isMissingRelationError(err)) {
      linksTableExistsCache = false;
      return listMembershipsByContactIds(contactIds, { client });
    }
    throw err;
  }
}

export async function attachMembershipsToContacts(contacts = [], { client } = {}) {
  const list = Array.isArray(contacts) ? contacts : [];
  if (list.length === 0) return list;
  const byId = await listMembershipsByContactIds(list.map(c => c?.id), { client });
  const withMemberships = list.map(contact => {
    const memberships = byId.get(Number(contact.id)) || [];
    const homeId = toInt(contact.client_id);
    const home = memberships.find(m => m.client_id === homeId) || memberships[0] || null;
    return {
      ...contact,
      clients: memberships,
      client_ids: memberships.map(m => m.client_id),
      client_name: home?.name || contact.client_name || null,
      client_id: home?.client_id ?? contact.client_id ?? null
    };
  });
  return attachSiteLinksToContacts(withMemberships, { client });
}

export async function contactBelongsToClient(contactId, clientId, { client } = {}) {
  const cId = toInt(contactId);
  const clId = toInt(clientId);
  if (!cId || !clId) return false;
  if (await hasContactClientLinksTable({ client })) {
    try {
      const { rows } = await db(client).query(
        `SELECT 1 FROM v_b_contact_client_links WHERE contact_id = $1 AND client_id = $2 LIMIT 1`,
        [cId, clId]
      );
      if (rows[0]) return true;
    } catch (err) {
      if (!isMissingRelationError(err)) throw err;
      linksTableExistsCache = false;
    }
  }
  const legacy = await db(client).query(
    `SELECT 1 FROM v_b_contacts WHERE id = $1 AND client_id = $2 LIMIT 1`,
    [cId, clId]
  );
  return Boolean(legacy.rows[0]);
}

export async function assertMembership(contactId, clientId, { client } = {}) {
  const ok = await contactBelongsToClient(contactId, clientId, { client });
  if (!ok) {
    const err = new Error("This contact does not belong to the specified company.");
    err.code = "CONTACT_CLIENT_MISMATCH";
    throw err;
  }
  return true;
}

export async function pickHomeClientId(contactId, preferredClientId = null, { client } = {}) {
  const memberships = await listMembershipsForContact(contactId, { client });
  if (memberships.length === 0) return null;
  const preferred = toInt(preferredClientId);
  if (preferred && memberships.some(m => m.client_id === preferred)) return preferred;
  const primary = memberships.find(m => m.is_primary);
  if (primary) return primary.client_id;
  return memberships[0].client_id;
}

export async function syncHomeClientId(contactId, preferredClientId = null, { client } = {}) {
  const id = toInt(contactId);
  if (!id) return null;
  const home = await pickHomeClientId(id, preferredClientId, { client });
  await db(client).query(`UPDATE v_b_contacts SET client_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [home, id]);
  return home;
}

async function clearPrimaryForClient(clientId, { client, exceptContactId = null } = {}) {
  if (!(await hasContactClientLinksTable({ client }))) return;
  const clId = toInt(clientId);
  if (!clId) return;
  if (exceptContactId) {
    await db(client).query(
      `UPDATE v_b_contact_client_links SET is_primary = FALSE WHERE client_id = $1 AND contact_id <> $2 AND is_primary = TRUE`,
      [clId, toInt(exceptContactId)]
    );
  } else {
    await db(client).query(
      `UPDATE v_b_contact_client_links SET is_primary = FALSE WHERE client_id = $1 AND is_primary = TRUE`,
      [clId]
    );
  }
}

export async function addMembership(contactId, { clientId, poste = null, isPrimary = false } = {}, { client } = {}) {
  const cId = toInt(contactId);
  const clId = toInt(clientId);
  if (!cId || !clId) {
    const err = new Error("contact_id and client_id are required.");
    err.code = "INVALID_MEMBERSHIP";
    throw err;
  }
  if (!(await hasContactClientLinksTable({ client }))) {
    // Pre-migration: keep legacy single client_id write
    await db(client).query(
      `UPDATE v_b_contacts SET client_id = $1, poste = COALESCE($2, poste), updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [clId, poste, cId]
    );
    return listMembershipsForContact(cId, { client });
  }
  if (isPrimary) await clearPrimaryForClient(clId, { client, exceptContactId: cId });
  await db(client).query(
    `INSERT INTO v_b_contact_client_links (contact_id, client_id, poste, is_primary)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (contact_id, client_id) DO UPDATE
       SET poste = COALESCE(EXCLUDED.poste, v_b_contact_client_links.poste),
           is_primary = EXCLUDED.is_primary OR v_b_contact_client_links.is_primary`,
    [cId, clId, poste, Boolean(isPrimary)]
  );
  if (isPrimary) {
    await db(client).query(
      `UPDATE v_b_contact_client_links SET is_primary = TRUE WHERE contact_id = $1 AND client_id = $2`,
      [cId, clId]
    );
    await clearPrimaryForClient(clId, { client, exceptContactId: cId });
  }
  await syncHomeClientId(cId, clId, { client });
  return listMembershipsForContact(cId, { client });
}

export async function removeMembership(contactId, clientId, { client } = {}) {
  const cId = toInt(contactId);
  const clId = toInt(clientId);
  if (!cId || !clId) return [];
  if (!(await hasContactClientLinksTable({ client }))) {
    await db(client).query(
      `UPDATE v_b_contacts SET client_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND client_id = $2`,
      [cId, clId]
    );
    return listMembershipsForContact(cId, { client });
  }
  await db(client).query(
    `DELETE FROM v_b_contact_client_links WHERE contact_id = $1 AND client_id = $2`,
    [cId, clId]
  );
  await deleteSiteLinksForContactClient(cId, clId, { client });
  await syncHomeClientId(cId, null, { client });
  return listMembershipsForContact(cId, { client });
}

export async function setPrimaryForClient(clientId, contactId, { client } = {}) {
  const cId = toInt(contactId);
  const clId = toInt(clientId);
  if (!cId || !clId) {
    const err = new Error("contact_id and client_id are required.");
    err.code = "INVALID_MEMBERSHIP";
    throw err;
  }
  await assertMembership(cId, clId, { client });
  if (!(await hasContactClientLinksTable({ client }))) {
    await db(client).query(
      `UPDATE v_b_contacts SET poste = COALESCE(NULLIF(poste, ''), 'CONTACT PRINCIPAL'), updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [cId]
    );
    return listMembershipsForContact(cId, { client });
  }
  await clearPrimaryForClient(clId, { client });
  await db(client).query(
    `UPDATE v_b_contact_client_links SET is_primary = TRUE WHERE contact_id = $1 AND client_id = $2`,
    [cId, clId]
  );
  return listMembershipsForContact(cId, { client });
}

export async function replaceMemberships(contactId, memberships = [], { preferredHomeClientId = null, client } = {}) {
  const cId = toInt(contactId);
  if (!cId) return { memberships: [], homeClientId: null };
  const normalized = (Array.isArray(memberships) ? memberships : [])
    .map((row, idx) => {
      const clientId = toInt(row?.client_id ?? row?.id);
      if (!clientId) return null;
      const siteLinks = normalizeSiteLinksInput(row, clientId);
      return {
        client_id: clientId,
        poste: row?.poste != null ? String(row.poste).trim() || null : null,
        is_primary: row?.is_primary === true,
        sites: siteLinks.map(link => ({
          id: link.site_id,
          site_id: link.site_id,
          is_primary: Boolean(link.is_primary)
        })),
        _order: idx
      };
    })
    .filter(Boolean);

  const byClient = new Map();
  for (const row of normalized) byClient.set(row.client_id, row);
  const unique = [...byClient.values()];

  if (!(await hasContactClientLinksTable({ client }))) {
    const home = preferredHomeClientId || unique[0]?.client_id || null;
    const poste = unique.find(u => u.client_id === home)?.poste || unique[0]?.poste || null;
    await db(client).query(
      `UPDATE v_b_contacts SET client_id = $1, poste = COALESCE($2, poste), updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [home, poste, cId]
    );
    const result = await listMembershipsForContact(cId, { client });
    return { memberships: result, homeClientId: home };
  }

  const existing = await listMembershipsForContact(cId, { client });
  const nextIds = new Set(unique.map(m => m.client_id));

  for (const old of existing) {
    if (!nextIds.has(old.client_id)) {
      await db(client).query(
        `DELETE FROM v_b_contact_client_links WHERE contact_id = $1 AND client_id = $2`,
        [cId, old.client_id]
      );
      await deleteSiteLinksForContactClient(cId, old.client_id, { client });
    }
  }

  for (const row of unique) {
    if (row.is_primary) await clearPrimaryForClient(row.client_id, { client, exceptContactId: cId });
    await db(client).query(
      `INSERT INTO v_b_contact_client_links (contact_id, client_id, poste, is_primary)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (contact_id, client_id) DO UPDATE
         SET poste = EXCLUDED.poste,
             is_primary = EXCLUDED.is_primary`,
      [cId, row.client_id, row.poste, Boolean(row.is_primary)]
    );
    if (row.is_primary) await clearPrimaryForClient(row.client_id, { client, exceptContactId: cId });
    // Always sync site links when membership payload includes sites / site_ids keys
    const source = (Array.isArray(memberships) ? memberships : []).find(
      m => toInt(m?.client_id ?? m?.id) === row.client_id
    );
    const hasSitesPayload = source
      && (Object.prototype.hasOwnProperty.call(source, "sites")
        || Object.prototype.hasOwnProperty.call(source, "site_ids")
        || Object.prototype.hasOwnProperty.call(source, "site_id"));
    if (hasSitesPayload) {
      await replaceSiteLinksForContactClient(cId, row.client_id, row.sites, { client });
    }
  }

  const home = await syncHomeClientId(cId, preferredHomeClientId || unique[0]?.client_id || null, { client });
  const result = await listMembershipsForContact(cId, { client });
  return { memberships: result, homeClientId: home };
}

export async function resolveClientIdForContact(contactId, preferredClientId = null, { client } = {}) {
  const preferred = toInt(preferredClientId);
  if (preferred) {
    const ok = await contactBelongsToClient(contactId, preferred, { client });
    if (ok) return preferred;
  }
  const memberships = await listMembershipsForContact(contactId, { client });
  if (memberships.length === 1) return memberships[0].client_id;
  if (memberships.length === 0) {
    const id = toInt(contactId);
    if (!id) return null;
    const { rows } = await db(client).query(`SELECT client_id FROM v_b_contacts WHERE id = $1 LIMIT 1`, [id]);
    return toInt(rows[0]?.client_id);
  }
  return null;
}

async function fetchPrimaryContactNamesLegacy({ client } = {}) {
  const byClientId = {};
  const { rows } = await db(client).query(
    `SELECT client_id::text AS client_id, nom, prenom, poste, statut
     FROM v_b_contacts
     WHERE client_id IS NOT NULL
     ORDER BY client_id ASC, nom ASC, prenom ASC`
  );
  const grouped = {};
  for (const row of rows) {
    const clientId = String(row.client_id);
    if (!grouped[clientId]) grouped[clientId] = [];
    grouped[clientId].push(row);
  }
  for (const [clientId, contacts] of Object.entries(grouped)) {
    const primary = pickPrimaryFromRows(contacts);
    const name = formatPrimaryName(primary);
    if (name) byClientId[clientId] = name;
  }
  return byClientId;
}

export async function fetchPrimaryContactNamesByClientId({ client } = {}) {
  if (!(await hasContactClientLinksTable({ client }))) {
    return fetchPrimaryContactNamesLegacy({ client });
  }
  try {
    const byClientId = {};
    const { rows } = await db(client).query(
      `SELECT l.client_id::text AS client_id, c.nom, c.prenom, l.poste, c.statut, l.is_primary
       FROM v_b_contact_client_links l
       JOIN v_b_contacts c ON c.id = l.contact_id
       ORDER BY l.client_id ASC, l.is_primary DESC, c.nom ASC, c.prenom ASC`
    );
    if (rows.length === 0) {
      // Table exists but empty (migration not backfilled yet) → legacy
      return fetchPrimaryContactNamesLegacy({ client });
    }
    const grouped = {};
    for (const row of rows) {
      const clientId = String(row.client_id);
      if (!grouped[clientId]) grouped[clientId] = [];
      grouped[clientId].push(row);
    }
    for (const [clientId, contacts] of Object.entries(grouped)) {
      const primary = pickPrimaryFromRows(contacts);
      const name = formatPrimaryName(primary);
      if (name) byClientId[clientId] = name;
    }
    return byClientId;
  } catch (err) {
    if (isMissingRelationError(err)) {
      linksTableExistsCache = false;
      return fetchPrimaryContactNamesLegacy({ client });
    }
    throw err;
  }
}

/** Prefer link table; fall back to legacy client_id column when table missing. */
export function sqlContactLinkedToClient(alias = "cts", paramIndex = 1, { useLinks = true } = {}) {
  if (!useLinks) {
    return `${alias}.client_id = $${paramIndex}`;
  }
  return `(
    EXISTS (
      SELECT 1 FROM v_b_contact_client_links l
      WHERE l.contact_id = ${alias}.id AND l.client_id = $${paramIndex}
    )
    OR ${alias}.client_id = $${paramIndex}
  )`;
}

export async function sqlContactLinkedToClientAsync(alias = "cts", paramIndex = 1, { client } = {}) {
  const useLinks = await hasContactClientLinksTable({ client });
  return sqlContactLinkedToClient(alias, paramIndex, { useLinks });
}
