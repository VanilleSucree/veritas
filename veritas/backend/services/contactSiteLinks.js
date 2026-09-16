import { pool } from "../database/db.js";

function db(client) {
  return client || pool;
}

function toInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function toSiteId(value) {
  const id = String(value ?? "").trim();
  return id || null;
}

function isMissingRelationError(err) {
  return err?.code === "42P01";
}

let linksTableExistsCache = null;

export async function hasContactSiteLinksTable({ client } = {}) {
  if (linksTableExistsCache === true) return true;
  if (linksTableExistsCache === false) return false;
  try {
    const { rows } = await db(client).query(`SELECT to_regclass('public.v_b_contact_site_links') AS reg`);
    linksTableExistsCache = Boolean(rows[0]?.reg);
  } catch {
    linksTableExistsCache = false;
  }
  return linksTableExistsCache;
}

export function invalidateContactSiteLinksCache() {
  linksTableExistsCache = null;
}

function normalizeSiteLinkRow(row) {
  if (!row) return null;
  const contactId = toInt(row.contact_id);
  const clientId = toInt(row.client_id);
  const siteId = toSiteId(row.site_id);
  if (!contactId || !clientId || !siteId) return null;
  return {
    contact_id: contactId,
    client_id: clientId,
    site_id: siteId,
    is_primary: row.is_primary === true
  };
}

/**
 * Normalize sites payload from memberships / API body.
 * Accepts sites: [{ id|site_id, is_primary }], site_ids: [], or a single site_id.
 */
export function normalizeSiteLinksInput(payload = {}, fallbackClientId = null) {
  const clientId = toInt(payload?.client_id ?? payload?.id ?? fallbackClientId);
  if (!clientId) return [];

  if (Array.isArray(payload?.sites) && payload.sites.length > 0) {
    return payload.sites
      .map((row, idx) => {
        const siteId = toSiteId(row?.site_id ?? row?.id);
        if (!siteId) return null;
        return {
          client_id: clientId,
          site_id: siteId,
          is_primary: row?.is_primary === true,
          _order: idx
        };
      })
      .filter(Boolean);
  }

  if (Array.isArray(payload?.site_ids)) {
    return payload.site_ids
      .map((id, idx) => {
        const siteId = toSiteId(id);
        if (!siteId) return null;
        return {
          client_id: clientId,
          site_id: siteId,
          is_primary: false,
          _order: idx
        };
      })
      .filter(Boolean);
  }

  const single = toSiteId(payload?.site_id);
  if (!single) return [];
  return [{
    client_id: clientId,
    site_id: single,
    is_primary: payload?.is_primary === true,
    _order: 0
  }];
}

export async function listSiteLinksForContact(contactId, { client } = {}) {
  const id = toInt(contactId);
  if (!id) return [];
  if (!(await hasContactSiteLinksTable({ client }))) return [];
  try {
    const { rows } = await db(client).query(
      `SELECT contact_id, client_id, site_id, is_primary
       FROM v_b_contact_site_links
       WHERE contact_id = $1
       ORDER BY client_id, site_id`,
      [id]
    );
    return rows.map(normalizeSiteLinkRow).filter(Boolean);
  } catch (err) {
    if (isMissingRelationError(err)) {
      linksTableExistsCache = false;
      return [];
    }
    throw err;
  }
}

export async function listSiteLinksByContactIds(contactIds = [], { client } = {}) {
  const ids = [...new Set((Array.isArray(contactIds) ? contactIds : []).map(toInt).filter(Boolean))];
  const map = new Map();
  if (ids.length === 0) return map;
  if (!(await hasContactSiteLinksTable({ client }))) return map;

  try {
    const { rows } = await db(client).query(
      `SELECT contact_id, client_id, site_id, is_primary
       FROM v_b_contact_site_links
       WHERE contact_id = ANY($1::int[])
       ORDER BY contact_id, client_id, site_id`,
      [ids]
    );
    for (const row of rows) {
      const link = normalizeSiteLinkRow(row);
      if (!link) continue;
      if (!map.has(link.contact_id)) map.set(link.contact_id, []);
      map.get(link.contact_id).push(link);
    }
    return map;
  } catch (err) {
    if (isMissingRelationError(err)) {
      linksTableExistsCache = false;
      return map;
    }
    throw err;
  }
}

export async function listSiteLinksForClient(clientId, { client } = {}) {
  const clId = toInt(clientId);
  if (!clId) return [];
  if (!(await hasContactSiteLinksTable({ client }))) return [];
  try {
    const { rows } = await db(client).query(
      `SELECT contact_id, client_id, site_id, is_primary
       FROM v_b_contact_site_links
       WHERE client_id = $1
       ORDER BY site_id, contact_id`,
      [clId]
    );
    return rows.map(normalizeSiteLinkRow).filter(Boolean);
  } catch (err) {
    if (isMissingRelationError(err)) {
      linksTableExistsCache = false;
      return [];
    }
    throw err;
  }
}

async function clearPrimaryForSite(clientId, siteId, { client, exceptContactId = null } = {}) {
  if (!(await hasContactSiteLinksTable({ client }))) return;
  const clId = toInt(clientId);
  const sId = toSiteId(siteId);
  if (!clId || !sId) return;
  if (exceptContactId) {
    await db(client).query(
      `UPDATE v_b_contact_site_links
       SET is_primary = FALSE
       WHERE client_id = $1 AND site_id = $2 AND contact_id <> $3 AND is_primary = TRUE`,
      [clId, sId, toInt(exceptContactId)]
    );
  } else {
    await db(client).query(
      `UPDATE v_b_contact_site_links
       SET is_primary = FALSE
       WHERE client_id = $1 AND site_id = $2 AND is_primary = TRUE`,
      [clId, sId]
    );
  }
}

export async function deleteSiteLinksForContactClient(contactId, clientId, { client } = {}) {
  const cId = toInt(contactId);
  const clId = toInt(clientId);
  if (!cId || !clId) return;
  if (!(await hasContactSiteLinksTable({ client }))) return;
  try {
    await db(client).query(
      `DELETE FROM v_b_contact_site_links WHERE contact_id = $1 AND client_id = $2`,
      [cId, clId]
    );
  } catch (err) {
    if (isMissingRelationError(err)) {
      linksTableExistsCache = false;
      return;
    }
    throw err;
  }
}

export async function replaceSiteLinksForContact(contactId, links = [], { client } = {}) {
  const cId = toInt(contactId);
  if (!cId) return [];
  if (!(await hasContactSiteLinksTable({ client }))) return [];

  const normalized = (Array.isArray(links) ? links : [])
    .map((row, idx) => {
      const clientId = toInt(row?.client_id);
      const siteId = toSiteId(row?.site_id ?? row?.id);
      if (!clientId || !siteId) return null;
      return {
        client_id: clientId,
        site_id: siteId,
        is_primary: row?.is_primary === true,
        _order: idx
      };
    })
    .filter(Boolean);

  const byKey = new Map();
  for (const row of normalized) {
    byKey.set(`${row.client_id}::${row.site_id}`, row);
  }
  const unique = [...byKey.values()];

  try {
    await db(client).query(`DELETE FROM v_b_contact_site_links WHERE contact_id = $1`, [cId]);

    for (const row of unique) {
      if (row.is_primary) {
        await clearPrimaryForSite(row.client_id, row.site_id, { client, exceptContactId: cId });
      }
      await db(client).query(
        `INSERT INTO v_b_contact_site_links (contact_id, client_id, site_id, is_primary)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (contact_id, client_id, site_id) DO UPDATE
           SET is_primary = EXCLUDED.is_primary`,
        [cId, row.client_id, row.site_id, Boolean(row.is_primary)]
      );
      if (row.is_primary) {
        await clearPrimaryForSite(row.client_id, row.site_id, { client, exceptContactId: cId });
      }
    }

    return listSiteLinksForContact(cId, { client });
  } catch (err) {
    if (isMissingRelationError(err)) {
      linksTableExistsCache = false;
      return [];
    }
    throw err;
  }
}

/**
 * Replace site links for one contact+client pair (keeps other companies untouched).
 * Accepts sites as [{ id|site_id, is_primary }] or site_ids as string[].
 */
export async function replaceSiteLinksForContactClient(contactId, clientId, sites = [], { client } = {}) {
  const cId = toInt(contactId);
  const clId = toInt(clientId);
  if (!cId || !clId) return [];
  if (!(await hasContactSiteLinksTable({ client }))) return [];

  const raw = Array.isArray(sites) ? sites : [];
  const list = raw.length > 0 && (typeof raw[0] === "string" || typeof raw[0] === "number")
    ? normalizeSiteLinksInput({ client_id: clId, site_ids: raw }, clId)
    : normalizeSiteLinksInput({ client_id: clId, sites: raw }, clId);

  try {
    await db(client).query(
      `DELETE FROM v_b_contact_site_links WHERE contact_id = $1 AND client_id = $2`,
      [cId, clId]
    );

    const bySite = new Map();
    for (const row of list) bySite.set(row.site_id, row);

    for (const row of bySite.values()) {
      if (row.is_primary) {
        await clearPrimaryForSite(clId, row.site_id, { client, exceptContactId: cId });
      }
      await db(client).query(
        `INSERT INTO v_b_contact_site_links (contact_id, client_id, site_id, is_primary)
         VALUES ($1, $2, $3, $4)`,
        [cId, clId, row.site_id, Boolean(row.is_primary)]
      );
      if (row.is_primary) {
        await clearPrimaryForSite(clId, row.site_id, { client, exceptContactId: cId });
      }
    }

    return listSiteLinksForContact(cId, { client });
  } catch (err) {
    if (isMissingRelationError(err)) {
      linksTableExistsCache = false;
      return [];
    }
    throw err;
  }
}

/**
 * Drop links pointing to site ids that no longer exist on the client.
 */
export async function pruneOrphanSiteLinksForClient(clientId, validSiteIds = [], { client } = {}) {
  const clId = toInt(clientId);
  if (!clId) return 0;
  if (!(await hasContactSiteLinksTable({ client }))) return 0;
  const valid = [...new Set((Array.isArray(validSiteIds) ? validSiteIds : []).map(toSiteId).filter(Boolean))];
  try {
    if (valid.length === 0) {
      const { rowCount } = await db(client).query(
        `DELETE FROM v_b_contact_site_links WHERE client_id = $1`,
        [clId]
      );
      return rowCount || 0;
    }
    const { rowCount } = await db(client).query(
      `DELETE FROM v_b_contact_site_links
       WHERE client_id = $1
         AND NOT (site_id = ANY($2::text[]))`,
      [clId, valid]
    );
    return rowCount || 0;
  } catch (err) {
    if (isMissingRelationError(err)) {
      linksTableExistsCache = false;
      return 0;
    }
    throw err;
  }
}

export function attachSiteLinksToMemberships(memberships = [], siteLinks = []) {
  const links = Array.isArray(siteLinks) ? siteLinks : [];
  return (Array.isArray(memberships) ? memberships : []).map(membership => {
    const clientId = toInt(membership?.client_id ?? membership?.id);
    const forClient = links.filter(link => link.client_id === clientId);
    return {
      ...membership,
      sites: forClient.map(link => ({
        id: link.site_id,
        site_id: link.site_id,
        is_primary: Boolean(link.is_primary)
      })),
      site_ids: forClient.map(link => link.site_id)
    };
  });
}

export async function attachSiteLinksToContacts(contacts = [], { client } = {}) {
  const list = Array.isArray(contacts) ? contacts : [];
  if (list.length === 0) return list;
  const byId = await listSiteLinksByContactIds(list.map(c => c?.id), { client });
  return list.map(contact => {
    const siteLinks = byId.get(Number(contact.id)) || [];
    const memberships = attachSiteLinksToMemberships(contact.clients || [], siteLinks);
    return {
      ...contact,
      clients: memberships,
      sites: siteLinks.map(link => ({
        client_id: link.client_id,
        site_id: link.site_id,
        id: link.site_id,
        is_primary: Boolean(link.is_primary)
      })),
      site_ids: [...new Set(siteLinks.map(link => link.site_id))]
    };
  });
}
