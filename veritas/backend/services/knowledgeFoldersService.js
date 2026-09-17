import { pool } from "../database/db.js";
import { ensureKnowledgeArticlesSchema } from "./ensureKnowledgeArticlesSchema.js";
import { normalizeKnowledgeIcon } from "./knowledgeEmojisService.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_DEPTH = 24;

function uniqueIds(values, toNumber) {
  const seen = new Set();
  const out = [];
  for (const raw of Array.isArray(values) ? values : []) {
    const id = toNumber ? Number(raw) : String(raw || "").trim();
    if (toNumber && !Number.isInteger(id)) continue;
    if (!toNumber && !id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function isUuid(value) {
  return UUID_RE.test(String(value || ""));
}

function mapFolderRow(row, extras = {}) {
  if (!row) return null;
  return {
    id: row.id,
    parentId: row.parent_id || null,
    name: row.name || "",
    icon: row.icon || null,
    inheritSharing: row.inherit_sharing !== false,
    visibleToAgents: row.visible_to_agents !== false,
    visibleToAllClients: row.visible_to_all_clients === true,
    visibleToAllContacts: row.visible_to_all_contacts === true,
    sortOrder: Number(row.sort_order) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    articleCount: extras.articleCount ?? (Number(row.article_count) || 0),
    clientIds: extras.clientIds || [],
    contactIds: extras.contactIds || [],
    clientTagIds: extras.clientTagIds || [],
    contactTagIds: extras.contactTagIds || [],
    clients: extras.clients || [],
    contacts: extras.contacts || [],
    clientTags: extras.clientTags || [],
    contactTags: extras.contactTags || []
  };
}

export function buildFolderTree(folders) {
  const byParent = new Map();
  for (const folder of folders) {
    const key = folder.parentId || "root";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(folder);
  }
  const nest = parentId => (byParent.get(parentId || "root") || []).map(folder => {
    const children = nest(folder.id);
    const nestedCount = children.reduce((sum, child) => sum + (Number(child.articleCount) || 0), 0);
    return {
      ...folder,
      articleCount: (Number(folder.articleCount) || 0) + nestedCount,
      children
    };
  });
  return nest(null);
}

function mapTagRows(rows) {
  return rows.map(row => ({ id: row.id, label: row.label || "", color: row.color || null }));
}

export async function listFolderAudience(folderId) {
  const [clients, contacts, clientTags, contactTags] = await Promise.all([
    pool.query(
      `SELECT c.id, c.name
         FROM v_b_knowledge_folder_clients k
         JOIN v_b_clients c ON c.id = k.client_id
        WHERE k.folder_id = $1
        ORDER BY c.name NULLS LAST`,
      [folderId]
    ),
    pool.query(
      `SELECT ct.id,
              TRIM(CONCAT(COALESCE(ct.prenom, ''), ' ', COALESCE(ct.nom, ''))) AS name,
              ct.email
         FROM v_b_knowledge_folder_contacts k
         JOIN v_b_contacts ct ON ct.id = k.contact_id
        WHERE k.folder_id = $1
        ORDER BY ct.nom NULLS LAST, ct.prenom NULLS LAST`,
      [folderId]
    ),
    pool.query(
      `SELECT t.id, t.label, t.color
         FROM v_b_knowledge_folder_client_tags k
         JOIN v_b_client_tags t ON t.id = k.tag_id
        WHERE k.folder_id = $1
        ORDER BY t.label`,
      [folderId]
    ).catch(err => (err.code === "42P01" ? { rows: [] } : Promise.reject(err))),
    pool.query(
      `SELECT t.id, t.label, t.color
         FROM v_b_knowledge_folder_contact_tags k
         JOIN v_b_client_tags t ON t.id = k.tag_id
        WHERE k.folder_id = $1
        ORDER BY t.label`,
      [folderId]
    ).catch(err => (err.code === "42P01" ? { rows: [] } : Promise.reject(err)))
  ]);
  return {
    clients: clients.rows.map(row => ({ id: row.id, name: row.name || `#${row.id}` })),
    contacts: contacts.rows.map(row => ({
      id: row.id,
      name: String(row.name || "").trim() || `#${row.id}`,
      email: row.email || null
    })),
    clientTags: mapTagRows(clientTags.rows),
    contactTags: mapTagRows(contactTags.rows),
    clientIds: clients.rows.map(row => row.id),
    contactIds: contacts.rows.map(row => row.id),
    clientTagIds: clientTags.rows.map(row => row.id),
    contactTagIds: contactTags.rows.map(row => row.id)
  };
}

export async function replaceFolderAudience(folderId, clientIds, contactIds, clientTagIds, contactTagIds) {
  const clients = uniqueIds(clientIds, true);
  const contacts = uniqueIds(contactIds, true);
  const clientTags = uniqueIds(clientTagIds, false).filter(isUuid);
  const contactTags = uniqueIds(contactTagIds, false).filter(isUuid);
  await pool.query(`DELETE FROM v_b_knowledge_folder_clients WHERE folder_id = $1`, [folderId]);
  await pool.query(`DELETE FROM v_b_knowledge_folder_contacts WHERE folder_id = $1`, [folderId]);
  await pool.query(`DELETE FROM v_b_knowledge_folder_client_tags WHERE folder_id = $1`, [folderId]);
  await pool.query(`DELETE FROM v_b_knowledge_folder_contact_tags WHERE folder_id = $1`, [folderId]);
  for (const clientId of clients) {
    await pool.query(
      `INSERT INTO v_b_knowledge_folder_clients (folder_id, client_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [folderId, clientId]
    );
  }
  for (const contactId of contacts) {
    await pool.query(
      `INSERT INTO v_b_knowledge_folder_contacts (folder_id, contact_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [folderId, contactId]
    );
  }
  for (const tagId of clientTags) {
    await pool.query(
      `INSERT INTO v_b_knowledge_folder_client_tags (folder_id, tag_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [folderId, tagId]
    );
  }
  for (const tagId of contactTags) {
    await pool.query(
      `INSERT INTO v_b_knowledge_folder_contact_tags (folder_id, tag_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [folderId, tagId]
    );
  }
  return { clientIds: clients, contactIds: contacts, clientTagIds: clientTags, contactTagIds: contactTags };
}

export async function listKnowledgeFolders() {
  await ensureKnowledgeArticlesSchema();
  const { rows } = await pool.query(
    `SELECT f.*,
            (SELECT COUNT(*)::int FROM v_b_knowledge_articles a WHERE a.folder_id = f.id) AS article_count
       FROM v_b_knowledge_folders f
      ORDER BY f.sort_order ASC, lower(f.name) ASC`
  );
  const folders = rows.map(row => mapFolderRow(row));
  return { folders, tree: buildFolderTree(folders) };
}

export async function getKnowledgeFolder(folderId) {
  await ensureKnowledgeArticlesSchema();
  const { rows } = await pool.query(`SELECT * FROM v_b_knowledge_folders WHERE id = $1`, [folderId]);
  const row = rows[0];
  if (!row) return null;
  const audience = await listFolderAudience(folderId);
  return mapFolderRow(row, audience);
}

export async function getFolderBreadcrumb(folderId) {
  if (!isUuid(folderId)) return [];
  const { rows } = await pool.query(
    `WITH RECURSIVE chain AS (
       SELECT f.id, f.name, f.parent_id, 0 AS depth
         FROM v_b_knowledge_folders f
        WHERE f.id = $1
       UNION ALL
       SELECT p.id, p.name, p.parent_id, c.depth + 1
         FROM v_b_knowledge_folders p
         JOIN chain c ON p.id = c.parent_id
        WHERE c.depth < $2
     )
     SELECT id, name FROM chain ORDER BY depth DESC`,
    [folderId, MAX_DEPTH]
  );
  return rows.map(row => ({ id: row.id, name: row.name || "" }));
}

export async function getFolderChain(folderId) {
  if (!isUuid(folderId)) return [];
  const { rows } = await pool.query(
    `WITH RECURSIVE chain AS (
       SELECT f.*, 0 AS depth
         FROM v_b_knowledge_folders f
        WHERE f.id = $1
       UNION ALL
       SELECT p.*, c.depth + 1
         FROM v_b_knowledge_folders p
         JOIN chain c ON p.id = c.parent_id
        WHERE c.inherit_sharing = TRUE AND c.depth < $2
     )
     SELECT * FROM chain ORDER BY depth ASC`,
    [folderId, MAX_DEPTH]
  );
  return rows.map(row => mapFolderRow(row));
}

export async function getInheritedFolderAudience(folderId) {
  const chain = await getFolderChain(folderId);
  const clientIds = new Set();
  const contactIds = new Set();
  const clientTags = new Map();
  const contactTags = new Map();
  let visibleToAgents = false;
  let visibleToAllClients = false;
  let visibleToAllContacts = false;
  for (const folder of chain) {
    const audience = await listFolderAudience(folder.id);
    visibleToAgents = visibleToAgents || folder.visibleToAgents;
    visibleToAllClients = visibleToAllClients || folder.visibleToAllClients;
    visibleToAllContacts = visibleToAllContacts || folder.visibleToAllContacts;
    audience.clientIds.forEach(id => clientIds.add(id));
    audience.contactIds.forEach(id => contactIds.add(id));
    (audience.clientTags || []).forEach(tag => clientTags.set(String(tag.id), tag));
    (audience.contactTags || []).forEach(tag => contactTags.set(String(tag.id), tag));
  }
  return {
    folders: chain.map(folder => ({ id: folder.id, name: folder.name, inheritSharing: folder.inheritSharing })),
    visibleToAgents,
    visibleToAllClients,
    visibleToAllContacts,
    clientIds: [...clientIds],
    contactIds: [...contactIds],
    clientTags: [...clientTags.values()],
    contactTags: [...contactTags.values()],
    clientTagIds: [...clientTags.keys()],
    contactTagIds: [...contactTags.keys()]
  };
}

async function folderExists(folderId) {
  if (!isUuid(folderId)) return false;
  const { rows } = await pool.query(`SELECT 1 FROM v_b_knowledge_folders WHERE id = $1`, [folderId]);
  return rows.length > 0;
}

async function wouldCreateCycle(folderId, parentId) {
  if (!parentId) return false;
  if (folderId === parentId) return true;
  const { rows } = await pool.query(
    `WITH RECURSIVE chain AS (
       SELECT id, parent_id, 0 AS depth
         FROM v_b_knowledge_folders
        WHERE id = $1
       UNION ALL
       SELECT p.id, p.parent_id, c.depth + 1
         FROM v_b_knowledge_folders p
         JOIN chain c ON p.id = c.parent_id
        WHERE c.depth < $3
     )
     SELECT 1 FROM chain WHERE id = $2`,
    [parentId, folderId, MAX_DEPTH]
  );
  return rows.length > 0;
}

async function nextSortOrder(parentId) {
  const { rows } = await pool.query(
    `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next
       FROM v_b_knowledge_folders
      WHERE parent_id IS NOT DISTINCT FROM $1`,
    [parentId]
  );
  return Number(rows[0]?.next) || 0;
}

export async function createKnowledgeFolder({ name, parentId, icon } = {}) {
  await ensureKnowledgeArticlesSchema();
  const title = String(name || "").trim();
  if (!title) {
    const err = new Error("Folder name is required.");
    err.status = 400;
    throw err;
  }
  const parent = parentId && isUuid(parentId) ? parentId : null;
  if (parent && !(await folderExists(parent))) {
    const err = new Error("Parent folder not found.");
    err.status = 404;
    throw err;
  }
  const iconName = normalizeKnowledgeIcon(icon);
  const sortOrder = await nextSortOrder(parent);
  const { rows } = await pool.query(
    `INSERT INTO v_b_knowledge_folders (name, parent_id, sort_order, icon)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [title.slice(0, 120), parent, sortOrder, iconName]
  );
  return mapFolderRow(rows[0], { clientIds: [], contactIds: [], clients: [], contacts: [] });
}

export async function updateKnowledgeFolder(folderId, patch = {}) {
  await ensureKnowledgeArticlesSchema();
  const existing = await getKnowledgeFolder(folderId);
  if (!existing) return null;
  const name = patch.name != null ? String(patch.name).trim().slice(0, 120) : existing.name;
  if (!name) {
    const err = new Error("Folder name is required.");
    err.status = 400;
    throw err;
  }
  let parentId = existing.parentId;
  if (patch.parentId !== undefined) {
    parentId = patch.parentId && isUuid(patch.parentId) ? patch.parentId : null;
    if (parentId && !(await folderExists(parentId))) {
      const err = new Error("Parent folder not found.");
      err.status = 404;
      throw err;
    }
    if (await wouldCreateCycle(folderId, parentId)) {
      const err = new Error("A folder cannot be moved into itself or one of its subfolders.");
      err.status = 400;
      throw err;
    }
  }
  const inheritSharing = patch.inheritSharing != null ? Boolean(patch.inheritSharing) : existing.inheritSharing;
  const visibleToAgents = patch.visibleToAgents != null ? Boolean(patch.visibleToAgents) : existing.visibleToAgents;
  const visibleToAllClients = patch.visibleToAllClients != null ? Boolean(patch.visibleToAllClients) : existing.visibleToAllClients;
  const visibleToAllContacts = patch.visibleToAllContacts != null ? Boolean(patch.visibleToAllContacts) : existing.visibleToAllContacts;
  const icon = patch.icon !== undefined
    ? normalizeKnowledgeIcon(patch.icon)
    : existing.icon;
  const { rows } = await pool.query(
    `UPDATE v_b_knowledge_folders
        SET name = $2,
            parent_id = $3,
            inherit_sharing = $4,
            visible_to_agents = $5,
            visible_to_all_clients = $6,
            visible_to_all_contacts = $7,
            icon = $8,
            updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
    [folderId, name, parentId, inheritSharing, visibleToAgents, visibleToAllClients, visibleToAllContacts, icon]
  );
  if (patch.clientIds != null || patch.contactIds != null || patch.clientTagIds != null || patch.contactTagIds != null) {
    await replaceFolderAudience(
      folderId,
      patch.clientIds != null ? patch.clientIds : existing.clientIds,
      patch.contactIds != null ? patch.contactIds : existing.contactIds,
      patch.clientTagIds != null ? patch.clientTagIds : existing.clientTagIds,
      patch.contactTagIds != null ? patch.contactTagIds : existing.contactTagIds
    );
  }
  const audience = await listFolderAudience(folderId);
  return mapFolderRow(rows[0], audience);
}

export async function deleteKnowledgeFolder(folderId) {
  await ensureKnowledgeArticlesSchema();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(`SELECT id, parent_id FROM v_b_knowledge_folders WHERE id = $1`, [folderId]);
    if (!rows[0]) {
      await client.query("ROLLBACK");
      return false;
    }
    const parentId = rows[0].parent_id || null;
    await client.query(
      `UPDATE v_b_knowledge_articles SET folder_id = $2, updated_at = NOW() WHERE folder_id = $1`,
      [folderId, parentId]
    );
    await client.query(
      `UPDATE v_b_knowledge_folders SET parent_id = $2, updated_at = NOW() WHERE parent_id = $1`,
      [folderId, parentId]
    );
    await client.query(`DELETE FROM v_b_knowledge_folders WHERE id = $1`, [folderId]);
    await client.query("COMMIT");
    return true;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export function folderInheritanceSql(articleAlias = "a") {
  return `(
    ${articleAlias}.folder_id IS NOT NULL AND EXISTS (
      WITH RECURSIVE chain AS (
        SELECT f.id, f.parent_id, f.inherit_sharing, f.visible_to_all_clients, f.visible_to_all_contacts, 0 AS depth
          FROM v_b_knowledge_folders f
         WHERE f.id = ${articleAlias}.folder_id
        UNION ALL
        SELECT p.id, p.parent_id, p.inherit_sharing, p.visible_to_all_clients, p.visible_to_all_contacts, c.depth + 1
          FROM v_b_knowledge_folders p
          JOIN chain c ON p.id = c.parent_id
         WHERE c.inherit_sharing = TRUE AND c.depth < ${MAX_DEPTH}
      )
      SELECT 1 FROM chain ch
       WHERE ch.visible_to_all_clients = TRUE
          OR ch.visible_to_all_contacts = TRUE
          OR EXISTS (
            SELECT 1 FROM v_b_knowledge_folder_clients fc
             WHERE fc.folder_id = ch.id AND fc.client_id = $1
          )
          OR (
            $2::int IS NOT NULL AND EXISTS (
              SELECT 1 FROM v_b_knowledge_folder_contacts ft
               WHERE ft.folder_id = ch.id AND ft.contact_id = $2
            )
          )
          OR EXISTS (
            SELECT 1
              FROM v_b_knowledge_folder_client_tags fct
              JOIN v_b_client_tag_links ctl ON ctl.tag_id = fct.tag_id
             WHERE fct.folder_id = ch.id AND ctl.client_id = $1
          )
          OR (
            $2::int IS NOT NULL AND EXISTS (
              SELECT 1
                FROM v_b_knowledge_folder_contact_tags ftt
                JOIN v_b_contact_tag_links ctl ON ctl.tag_id = ftt.tag_id
               WHERE ftt.folder_id = ch.id AND ctl.contact_id = $2
            )
          )
    )
  )`;
}
