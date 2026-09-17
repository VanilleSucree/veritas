import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { pool } from "../database/db.js";
import { ensureKnowledgeArticlesSchema } from "./ensureKnowledgeArticlesSchema.js";
import { ensureKnowledgeCategory } from "./knowledgeCategoriesService.js";
import { folderInheritanceSql, getFolderBreadcrumb, getInheritedFolderAudience, isUuid } from "./knowledgeFoldersService.js";
import { getArticleFeedbackSummary } from "./knowledgeArticleFeedbackService.js";
import { getHelpfulStats, incrementArticleViews, isFavorite, listArticleLinkIds, listRelatedPortalArticles, recordSearchMiss, replaceArticleLinks } from "./knowledgeArticleExtrasService.js";
import { normalizeKnowledgeIcon } from "./knowledgeEmojisService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const KNOWLEDGE_ASSETS_DIR = path.join(__dirname, "..", "uploads", "knowledge-articles");

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

export function htmlToPlain(html) {
  return String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function asJson(value, fallback) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      /* ignore */
    }
  }
  return fallback;
}

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

function contentFingerprint({ title, category, status, folderId, contentHtml }) {
  return JSON.stringify({
    title: title || "",
    category: category || null,
    status: status || "draft",
    folderId: folderId || null,
    html: contentHtml || ""
  });
}

function mapRevisionRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    articleId: row.article_id,
    revision: Number(row.revision) || 0,
    title: row.title || "",
    category: row.category || null,
    status: row.status || "draft",
    changeKind: row.change_kind || "saved",
    editorUserId: row.editor_user_id || null,
    editorName: row.editor_name || null,
    createdAt: row.created_at
  };
}

async function insertArticleRevision(article, { editorUserId, changeKind } = {}) {
  if (!article?.id) return null;
  const kind = ["created", "saved", "published", "unpublished", "restored"].includes(changeKind)
    ? changeKind
    : "saved";
  try {
    const { rows } = await pool.query(
      `INSERT INTO v_b_knowledge_article_revisions (
         article_id, revision, title, category, status, content_json, content_html, content_plain,
         folder_id, editor_user_id, change_kind
       )
       VALUES (
         $1,
         COALESCE((SELECT MAX(revision) FROM v_b_knowledge_article_revisions WHERE article_id = $1), 0) + 1,
         $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10
       )
       RETURNING id, article_id, revision, title, category, status, change_kind, editor_user_id, created_at`,
      [
        article.id,
        article.title || "",
        article.category || null,
        article.status || "draft",
        JSON.stringify(article.contentJson || EMPTY_DOC),
        article.contentHtml || "",
        article.contentPlain || htmlToPlain(article.contentHtml || ""),
        article.folderId || null,
        editorUserId || null,
        kind
      ]
    );
    return rows[0] || null;
  } catch (err) {
    if (err.code === "42P01") return null;
    throw err;
  }
}

export async function ensureKnowledgeUploadsDir() {
  if (!fs.existsSync(KNOWLEDGE_ASSETS_DIR)) {
    fs.mkdirSync(KNOWLEDGE_ASSETS_DIR, { recursive: true });
  }
}

export function agentAssetUrl(articleId, assetId) {
  return `/api/knowledge-articles/${articleId}/assets/${assetId}`;
}

export function portalAssetUrl(articleId, assetId) {
  return `/api/client-portal/knowledge-base/${articleId}/assets/${assetId}`;
}

export function publicAssetUrl(token, assetId) {
  return `/api/public/knowledge/${encodeURIComponent(token)}/assets/${assetId}`;
}

export function rewriteAssetUrls(html, articleId, toPortal) {
  const from = toPortal
    ? `/api/knowledge-articles/${articleId}/assets/`
    : `/api/client-portal/knowledge-base/${articleId}/assets/`;
  const to = toPortal
    ? `/api/client-portal/knowledge-base/${articleId}/assets/`
    : `/api/knowledge-articles/${articleId}/assets/`;
  return String(html || "").split(from).join(to);
}

export function rewriteAssetUrlsToPublic(html, articleId, token) {
  const to = `/api/public/knowledge/${encodeURIComponent(token)}/assets/`;
  return String(html || "")
    .split(`/api/knowledge-articles/${articleId}/assets/`).join(to)
    .split(`/api/client-portal/knowledge-base/${articleId}/assets/`).join(to);
}

function newPublicToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function mapArticleRow(row, extras = {}) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title || "",
    category: row.category || null,
    status: row.status,
    visibleToAgents: row.visible_to_agents !== false,
    visibleToAllClients: row.visible_to_all_clients === true,
    visibleToAllContacts: row.visible_to_all_contacts === true,
    contentJson: asJson(row.content_json, EMPTY_DOC),
    contentHtml: row.content_html || "",
    contentPlain: row.content_plain || "",
    authorUserId: row.author_user_id || null,
    authorName: row.author_name || null,
    updatedByUserId: row.updated_by_user_id || null,
    updatedByName: row.updated_by_name || extras.updatedByName || null,
    publishedAt: row.published_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    folderId: row.folder_id || null,
    folderName: row.folder_name || extras.folderName || null,
    icon: row.icon || null,
    clientIds: extras.clientIds || [],
    contactIds: extras.contactIds || [],
    clientTagIds: extras.clientTagIds || [],
    contactTagIds: extras.contactTagIds || [],
    clients: extras.clients || [],
    contacts: extras.contacts || [],
    clientTags: extras.clientTags || [],
    contactTags: extras.contactTags || [],
    clientCount: extras.clientCount ?? extras.clientIds?.length ?? (Number(row.client_count) || 0),
    contactCount: extras.contactCount ?? extras.contactIds?.length ?? (Number(row.contact_count) || 0),
    clientTagCount: extras.clientTagCount ?? extras.clientTagIds?.length ?? (Number(row.client_tag_count) || 0),
    contactTagCount: extras.contactTagCount ?? extras.contactTagIds?.length ?? (Number(row.contact_tag_count) || 0),
    ratingsEnabled: extras.ratingsEnabled ?? row.feedback_ratings_enabled === true,
    commentsEnabled: extras.commentsEnabled ?? row.feedback_comments_enabled === true,
    ratingAverage: extras.ratingAverage ?? (Number(row.rating_average) || 0),
    ratingCount: extras.ratingCount ?? (Number(row.rating_count) || 0),
    commentCount: extras.commentCount ?? extras.comments?.length ?? (Number(row.comment_count) || 0),
    comments: extras.comments || [],
    viewCount: extras.viewCount ?? (Number(row.view_count) || 0),
    commentsCompany: extras.commentsCompany ?? row.feedback_comments_company === true,
    relatedIds: extras.relatedIds || [],
    helpfulYes: extras.helpfulYes ?? (Number(row.helpful_yes) || 0),
    helpfulNo: extras.helpfulNo ?? (Number(row.helpful_no) || 0),
    publicEnabled: extras.publicEnabled ?? row.public_enabled === true,
    publicToken: extras.publicToken ?? row.public_token ?? null
  };
}

export async function listKnowledgeTagCatalog() {
  await ensureKnowledgeArticlesSchema();
  try {
    const { rows } = await pool.query(
      `SELECT id, label, color
         FROM v_b_client_tags
        ORDER BY label ASC`
    );
    return rows.map(row => ({ id: row.id, label: row.label || "", color: row.color || null }));
  } catch (err) {
    if (err.code === "42P01") return [];
    throw err;
  }
}

function mapTagRows(rows) {
  return rows.map(row => ({ id: row.id, label: row.label || "", color: row.color || null }));
}

export async function listArticleAudience(articleId) {
  const [clients, contacts, clientTags, contactTags] = await Promise.all([
    pool.query(
      `SELECT c.id, c.name
         FROM v_b_knowledge_article_clients k
         JOIN v_b_clients c ON c.id = k.client_id
        WHERE k.article_id = $1
        ORDER BY c.name NULLS LAST`,
      [articleId]
    ),
    pool.query(
      `SELECT ct.id,
              TRIM(CONCAT(COALESCE(ct.prenom, ''), ' ', COALESCE(ct.nom, ''))) AS name,
              ct.email
         FROM v_b_knowledge_article_contacts k
         JOIN v_b_contacts ct ON ct.id = k.contact_id
        WHERE k.article_id = $1
        ORDER BY ct.nom NULLS LAST, ct.prenom NULLS LAST`,
      [articleId]
    ),
    pool.query(
      `SELECT t.id, t.label, t.color
         FROM v_b_knowledge_article_client_tags k
         JOIN v_b_client_tags t ON t.id = k.tag_id
        WHERE k.article_id = $1
        ORDER BY t.label`,
      [articleId]
    ).catch(err => (err.code === "42P01" ? { rows: [] } : Promise.reject(err))),
    pool.query(
      `SELECT t.id, t.label, t.color
         FROM v_b_knowledge_article_contact_tags k
         JOIN v_b_client_tags t ON t.id = k.tag_id
        WHERE k.article_id = $1
        ORDER BY t.label`,
      [articleId]
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

export async function replaceArticleAudience(articleId, clientIds, contactIds, clientTagIds, contactTagIds) {
  const clients = uniqueIds(clientIds, true);
  const contacts = uniqueIds(contactIds, true);
  const clientTags = uniqueIds(clientTagIds, false).filter(isUuid);
  const contactTags = uniqueIds(contactTagIds, false).filter(isUuid);
  await pool.query(`DELETE FROM v_b_knowledge_article_clients WHERE article_id = $1`, [articleId]);
  await pool.query(`DELETE FROM v_b_knowledge_article_contacts WHERE article_id = $1`, [articleId]);
  await pool.query(`DELETE FROM v_b_knowledge_article_client_tags WHERE article_id = $1`, [articleId]);
  await pool.query(`DELETE FROM v_b_knowledge_article_contact_tags WHERE article_id = $1`, [articleId]);
  for (const clientId of clients) {
    await pool.query(
      `INSERT INTO v_b_knowledge_article_clients (article_id, client_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [articleId, clientId]
    );
  }
  for (const contactId of contacts) {
    await pool.query(
      `INSERT INTO v_b_knowledge_article_contacts (article_id, contact_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [articleId, contactId]
    );
  }
  for (const tagId of clientTags) {
    await pool.query(
      `INSERT INTO v_b_knowledge_article_client_tags (article_id, tag_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [articleId, tagId]
    );
  }
  for (const tagId of contactTags) {
    await pool.query(
      `INSERT INTO v_b_knowledge_article_contact_tags (article_id, tag_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [articleId, tagId]
    );
  }
  return { clientIds: clients, contactIds: contacts, clientTagIds: clientTags, contactTagIds: contactTags };
}

export async function listKnowledgeArticles({ search, status, includeDrafts = false, folderId, category } = {}) {
  await ensureKnowledgeArticlesSchema();
  const conditions = [];
  const values = [];
  if (!includeDrafts) {
    conditions.push(`a.status = 'published'`);
    conditions.push(`a.visible_to_agents = TRUE`);
  } else if (status === "draft" || status === "published") {
    values.push(status);
    conditions.push(`a.status = $${values.length}`);
  }
  const q = String(search || "").trim();
  if (q) {
    values.push(`%${q.toLowerCase()}%`);
    conditions.push(`(lower(a.title) LIKE $${values.length} OR lower(COALESCE(a.content_plain, '')) LIKE $${values.length} OR lower(COALESCE(a.category, '')) LIKE $${values.length})`);
  } else if (folderId === "root") {
    conditions.push(`a.folder_id IS NULL`);
  } else if (isUuid(folderId)) {
    values.push(folderId);
    conditions.push(`a.folder_id IN (
      WITH RECURSIVE descendants AS (
        SELECT id FROM v_b_knowledge_folders WHERE id = $${values.length}
        UNION ALL
        SELECT f.id
          FROM v_b_knowledge_folders f
          JOIN descendants d ON f.parent_id = d.id
      )
      SELECT id FROM descendants
    )`);
  }
  const categoryFilter = String(category || "").trim();
  if (categoryFilter) {
    values.push(categoryFilter.toLowerCase());
    conditions.push(`lower(COALESCE(a.category, '')) = $${values.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const listSql = tagCounts => `
    SELECT a.*,
            TRIM(COALESCE(u.username, u.email, '')) AS author_name,
            TRIM(COALESCE(editor.username, editor.email, '')) AS updated_by_name,
            f.name AS folder_name,
            (SELECT COUNT(*)::int FROM v_b_knowledge_article_clients k WHERE k.article_id = a.id) AS client_count,
            (SELECT COUNT(*)::int FROM v_b_knowledge_article_contacts k WHERE k.article_id = a.id) AS contact_count,
            ${tagCounts}
       FROM v_b_knowledge_articles a
       LEFT JOIN v_b_users u ON u.id = a.author_user_id
       LEFT JOIN v_b_users editor ON editor.id = a.updated_by_user_id
       LEFT JOIN v_b_knowledge_folders f ON f.id = a.folder_id
       ${where}
       ORDER BY a.updated_at DESC`;
  let rows;
  try {
    ({ rows } = await pool.query(
      listSql(`(SELECT COUNT(*)::int FROM v_b_knowledge_article_client_tags k WHERE k.article_id = a.id) AS client_tag_count,
            (SELECT COUNT(*)::int FROM v_b_knowledge_article_contact_tags k WHERE k.article_id = a.id) AS contact_tag_count,
            (SELECT COUNT(*)::int FROM v_b_knowledge_article_comments k WHERE k.article_id = a.id) AS comment_count,
            (SELECT COUNT(*)::int FROM v_b_knowledge_article_ratings k WHERE k.article_id = a.id) AS rating_count,
            (SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0)::float FROM v_b_knowledge_article_ratings k WHERE k.article_id = a.id) AS rating_average`),
      values
    ));
  } catch (err) {
    if (err.code !== "42P01" && err.code !== "42703") throw err;
    try {
      ({ rows } = await pool.query(
        listSql(`(SELECT COUNT(*)::int FROM v_b_knowledge_article_client_tags k WHERE k.article_id = a.id) AS client_tag_count,
            (SELECT COUNT(*)::int FROM v_b_knowledge_article_contact_tags k WHERE k.article_id = a.id) AS contact_tag_count,
            0 AS comment_count, 0 AS rating_count, 0 AS rating_average`),
        values
      ));
    } catch (inner) {
      if (inner.code !== "42P01" && inner.code !== "42703") throw inner;
      ({ rows } = await pool.query(listSql(`0 AS client_tag_count, 0 AS contact_tag_count, 0 AS comment_count, 0 AS rating_count, 0 AS rating_average`), values));
    }
  }
  return rows.map(row => mapArticleRow(row));
}

export async function getKnowledgeArticle(articleId) {
  await ensureKnowledgeArticlesSchema();
  const { rows } = await pool.query(
    `SELECT a.*,
            TRIM(COALESCE(u.username, u.email, '')) AS author_name,
            TRIM(COALESCE(editor.username, editor.email, '')) AS updated_by_name,
            f.name AS folder_name
       FROM v_b_knowledge_articles a
       LEFT JOIN v_b_users u ON u.id = a.author_user_id
       LEFT JOIN v_b_users editor ON editor.id = a.updated_by_user_id
       LEFT JOIN v_b_knowledge_folders f ON f.id = a.folder_id
      WHERE a.id = $1`,
    [articleId]
  );
  const row = rows[0];
  if (!row) return null;
  const audience = await listArticleAudience(articleId);
  const inheritedSharing = row.folder_id ? await getInheritedFolderAudience(row.folder_id) : null;
  const feedback = await getArticleFeedbackSummary(articleId);
  const relatedIds = await listArticleLinkIds(articleId);
  const helpful = await getHelpfulStats(articleId);
  return {
    ...mapArticleRow(row, { ...audience, ...feedback, relatedIds, ...helpful }),
    inheritedSharing
  };
}

export async function createKnowledgeArticle({ title, category, authorUserId, folderId, contentJson, contentHtml } = {}) {
  await ensureKnowledgeArticlesSchema();
  const folder = isUuid(folderId) ? folderId : null;
  if (folder) {
    const { rows: folderRows } = await pool.query(`SELECT 1 FROM v_b_knowledge_folders WHERE id = $1`, [folder]);
    if (!folderRows.length) {
      const err = new Error("Folder not found.");
      err.status = 404;
      throw err;
    }
  }
  const json = asJson(contentJson, EMPTY_DOC);
  const html = contentHtml != null ? String(contentHtml) : "";
  const { rows } = await pool.query(
    `INSERT INTO v_b_knowledge_articles (title, category, author_user_id, updated_by_user_id, folder_id, content_json, content_html, content_plain)
     VALUES ($1, $2, $3, $3, $4, $5::jsonb, $6, $7)
     RETURNING *`,
    [String(title || "").trim() || "Sans titre", String(category || "").trim() || null, authorUserId || null, folder, JSON.stringify(json), html, htmlToPlain(html)]
  );
  if (rows[0]?.category) await ensureKnowledgeCategory(rows[0].category);
  const article = await getKnowledgeArticle(rows[0].id);
  await insertArticleRevision(article, { editorUserId: authorUserId || null, changeKind: "created" });
  return article;
}

export async function updateKnowledgeArticle(articleId, patch = {}) {
  await ensureKnowledgeArticlesSchema();
  const existing = await getKnowledgeArticle(articleId);
  if (!existing) return null;
  const title = patch.title != null ? String(patch.title).trim() : existing.title;
  const category = patch.category !== undefined ? (String(patch.category || "").trim() || null) : existing.category;
  if (category) await ensureKnowledgeCategory(category);
  const visibleToAgents = patch.visibleToAgents != null ? Boolean(patch.visibleToAgents) : existing.visibleToAgents;
  const visibleToAllClients = patch.visibleToAllClients != null ? Boolean(patch.visibleToAllClients) : existing.visibleToAllClients;
  const visibleToAllContacts = patch.visibleToAllContacts != null ? Boolean(patch.visibleToAllContacts) : existing.visibleToAllContacts;
  const ratingsEnabled = patch.ratingsEnabled != null ? Boolean(patch.ratingsEnabled) : existing.ratingsEnabled === true;
  const commentsEnabled = patch.commentsEnabled != null ? Boolean(patch.commentsEnabled) : existing.commentsEnabled === true;
  const commentsCompany = patch.commentsCompany != null ? Boolean(patch.commentsCompany) : existing.commentsCompany === true;
  const contentJson = patch.contentJson != null ? asJson(patch.contentJson, existing.contentJson) : existing.contentJson;
  const contentHtml = patch.contentHtml != null ? String(patch.contentHtml) : existing.contentHtml;
  const contentPlain = htmlToPlain(contentHtml);
  const status = patch.status === "draft" || patch.status === "published" ? patch.status : existing.status;
  let publishedAt = existing.publishedAt;
  if (status === "published" && !publishedAt) publishedAt = new Date().toISOString();
  if (status === "draft") publishedAt = existing.publishedAt;
  const folderId = patch.folderId !== undefined
    ? (isUuid(patch.folderId) ? patch.folderId : null)
    : existing.folderId;
  const icon = patch.icon !== undefined
    ? normalizeKnowledgeIcon(patch.icon)
    : existing.icon;
  const editorUserId = patch.editorUserId || null;
  const beforeFinger = contentFingerprint(existing);
  const afterFinger = contentFingerprint({ title, category, status, folderId, contentHtml });
  let changeKind = "saved";
  if (patch.restoredFromRevisionId) changeKind = "restored";
  else if (status === "published" && existing.status !== "published") changeKind = "published";
  else if (status === "draft" && existing.status === "published") changeKind = "unpublished";
  await pool.query(
    `UPDATE v_b_knowledge_articles
        SET title = $2,
            category = $3,
            visible_to_agents = $4,
            visible_to_all_clients = $5,
            visible_to_all_contacts = $6,
            content_json = $7::jsonb,
            content_html = $8,
            content_plain = $9,
            status = $10,
            published_at = $11,
            folder_id = $12,
            updated_by_user_id = COALESCE($13, updated_by_user_id),
            feedback_ratings_enabled = $14,
            feedback_comments_enabled = $15,
            feedback_comments_company = $16,
            icon = $17,
            updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
    [articleId, title || "Sans titre", category, visibleToAgents, visibleToAllClients, visibleToAllContacts, JSON.stringify(contentJson), contentHtml, contentPlain, status, publishedAt, folderId, editorUserId, ratingsEnabled, commentsEnabled, commentsCompany, icon]
  );
  if (patch.clientIds != null || patch.contactIds != null || patch.clientTagIds != null || patch.contactTagIds != null) {
    await replaceArticleAudience(
      articleId,
      patch.clientIds != null ? patch.clientIds : existing.clientIds,
      patch.contactIds != null ? patch.contactIds : existing.contactIds,
      patch.clientTagIds != null ? patch.clientTagIds : existing.clientTagIds,
      patch.contactTagIds != null ? patch.contactTagIds : existing.contactTagIds
    );
  }
  if (patch.relatedIds != null) {
    await replaceArticleLinks(articleId, patch.relatedIds);
  }
  const next = await getKnowledgeArticle(articleId);
  const skipRevision = patch.skipRevision === true && changeKind === "saved";
  if (beforeFinger !== afterFinger && !skipRevision) {
    await insertArticleRevision(next, { editorUserId, changeKind });
  }
  return next;
}

export async function publishKnowledgeArticle(articleId, { visibleToAgents, visibleToAllClients, visibleToAllContacts, clientIds, contactIds, clientTagIds, contactTagIds, editorUserId } = {}) {
  return updateKnowledgeArticle(articleId, {
    status: "published",
    visibleToAgents: visibleToAgents != null ? visibleToAgents : true,
    visibleToAllClients,
    visibleToAllContacts,
    clientIds,
    contactIds,
    clientTagIds,
    contactTagIds,
    editorUserId
  });
}

export async function unpublishKnowledgeArticle(articleId, { editorUserId } = {}) {
  return updateKnowledgeArticle(articleId, { status: "draft", editorUserId });
}

export async function listKnowledgeArticleRevisions(articleId) {
  await ensureKnowledgeArticlesSchema();
  try {
    const { rows } = await pool.query(
      `SELECT r.id, r.article_id, r.revision, r.title, r.category, r.status, r.change_kind,
              r.editor_user_id, r.created_at,
              TRIM(COALESCE(u.username, u.email, '')) AS editor_name
         FROM v_b_knowledge_article_revisions r
         LEFT JOIN v_b_users u ON u.id = r.editor_user_id
        WHERE r.article_id = $1
        ORDER BY r.revision DESC
        LIMIT 80`,
      [articleId]
    );
    return rows.map(mapRevisionRow);
  } catch (err) {
    if (err.code === "42P01") return [];
    throw err;
  }
}

export async function getKnowledgeArticleRevision(articleId, revisionId) {
  await ensureKnowledgeArticlesSchema();
  const { rows } = await pool.query(
    `SELECT r.*, TRIM(COALESCE(u.username, u.email, '')) AS editor_name
       FROM v_b_knowledge_article_revisions r
       LEFT JOIN v_b_users u ON u.id = r.editor_user_id
      WHERE r.id = $1 AND r.article_id = $2`,
    [revisionId, articleId]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    ...mapRevisionRow(row),
    contentHtml: rewriteAssetUrls(row.content_html || "", articleId, false),
    contentJson: asJson(row.content_json, EMPTY_DOC)
  };
}

export async function restoreKnowledgeArticleRevision(articleId, revisionId, editorUserId) {
  await ensureKnowledgeArticlesSchema();
  const { rows } = await pool.query(
    `SELECT * FROM v_b_knowledge_article_revisions WHERE id = $1 AND article_id = $2`,
    [revisionId, articleId]
  );
  const row = rows[0];
  if (!row) return null;
  return updateKnowledgeArticle(articleId, {
    title: row.title,
    category: row.category,
    status: row.status,
    contentJson: asJson(row.content_json, EMPTY_DOC),
    contentHtml: row.content_html || "",
    folderId: row.folder_id || null,
    editorUserId,
    restoredFromRevisionId: revisionId
  });
}

export async function deleteKnowledgeArticle(articleId) {
  await ensureKnowledgeArticlesSchema();
  const assets = await pool.query(
    `SELECT stored_name FROM v_b_knowledge_article_assets WHERE article_id = $1`,
    [articleId]
  );
  const result = await pool.query(`DELETE FROM v_b_knowledge_articles WHERE id = $1 RETURNING id`, [articleId]);
  if (!result.rowCount) return false;
  for (const row of assets.rows) {
    const filePath = path.join(KNOWLEDGE_ASSETS_DIR, row.stored_name);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      /* ignore */
    }
  }
  return true;
}

export async function deleteKnowledgeArticles(ids) {
  const unique = uniqueIds(ids, false).filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
  let deleted = 0;
  for (const id of unique) {
    if (await deleteKnowledgeArticle(id)) deleted += 1;
  }
  return { deleted, requested: unique.length };
}

export async function addKnowledgeAsset({ articleId, fileName, storedName, mimeType, sizeBytes, uploadedBy }) {
  await ensureKnowledgeArticlesSchema();
  const { rows } = await pool.query(
    `INSERT INTO v_b_knowledge_article_assets (article_id, file_name, stored_name, mime_type, size_bytes, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [articleId, fileName, storedName, mimeType, sizeBytes, uploadedBy || null]
  );
  const row = rows[0];
  return {
    id: row.id,
    articleId: row.article_id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    url: agentAssetUrl(articleId, row.id)
  };
}

export async function getKnowledgeAsset(articleId, assetId) {
  await ensureKnowledgeArticlesSchema();
  const { rows } = await pool.query(
    `SELECT * FROM v_b_knowledge_article_assets WHERE id = $1 AND article_id = $2`,
    [assetId, articleId]
  );
  return rows[0] || null;
}

export async function moveKnowledgeArticles(ids, folderId) {
  await ensureKnowledgeArticlesSchema();
  const unique = uniqueIds(ids, false).filter(id => isUuid(id));
  const folder = folderId && isUuid(folderId) ? folderId : null;
  if (folder) {
    const { rows } = await pool.query(`SELECT 1 FROM v_b_knowledge_folders WHERE id = $1`, [folder]);
    if (!rows.length) {
      const err = new Error("Folder not found.");
      err.status = 404;
      throw err;
    }
  }
  if (!unique.length) return { moved: 0 };
  const { rowCount } = await pool.query(
    `UPDATE v_b_knowledge_articles SET folder_id = $2, updated_at = NOW() WHERE id = ANY($1::uuid[])`,
    [unique, folder]
  );
  return { moved: rowCount || 0 };
}

export function portalVisibilitySql(clientAlias = "a") {
  return `(
    ${clientAlias}.visible_to_all_clients = TRUE
    OR ${clientAlias}.visible_to_all_contacts = TRUE
    OR EXISTS (
      SELECT 1 FROM v_b_knowledge_article_clients kc
       WHERE kc.article_id = ${clientAlias}.id AND kc.client_id = $1
    )
    OR (
      $2::int IS NOT NULL AND EXISTS (
        SELECT 1 FROM v_b_knowledge_article_contacts kt
         WHERE kt.article_id = ${clientAlias}.id AND kt.contact_id = $2
      )
    )
    OR EXISTS (
      SELECT 1
        FROM v_b_knowledge_article_client_tags act
        JOIN v_b_client_tag_links ctl ON ctl.tag_id = act.tag_id
       WHERE act.article_id = ${clientAlias}.id AND ctl.client_id = $1
    )
    OR (
      $2::int IS NOT NULL AND EXISTS (
        SELECT 1
          FROM v_b_knowledge_article_contact_tags att
          JOIN v_b_contact_tag_links ctl ON ctl.tag_id = att.tag_id
         WHERE att.article_id = ${clientAlias}.id AND ctl.contact_id = $2
      )
    )
    OR ${folderInheritanceSql(clientAlias)}
  )`;
}

export async function listPortalKnowledgeArticles(clientId, contactId, { search, folderId, category, favoritesOnly } = {}) {
  await ensureKnowledgeArticlesSchema();
  const values = [Number(clientId), contactId != null ? Number(contactId) : null];
  const conditions = [`a.status = 'published'`, portalVisibilitySql("a")];
  const q = String(search || "").trim();
  if (q) {
    values.push(`%${q.toLowerCase()}%`);
    conditions.push(`(lower(a.title) LIKE $${values.length} OR lower(COALESCE(a.content_plain, '')) LIKE $${values.length} OR lower(COALESCE(a.category, '')) LIKE $${values.length})`);
  }
  if (folderId === "root") {
    conditions.push(`a.folder_id IS NULL`);
  } else if (isUuid(folderId)) {
    values.push(folderId);
    conditions.push(`a.folder_id = $${values.length}`);
  }
  const categoryFilter = String(category || "").trim();
  if (categoryFilter) {
    values.push(categoryFilter.toLowerCase());
    conditions.push(`lower(COALESCE(a.category, '')) = $${values.length}`);
  }
  if (favoritesOnly && contactId != null) {
    conditions.push(`EXISTS (SELECT 1 FROM v_b_knowledge_article_favorites fav WHERE fav.article_id = a.id AND fav.contact_id = $2)`);
  }
  const { rows } = await pool.query(
    `SELECT a.id, a.title, a.category, a.content_plain, a.published_at, a.updated_at, a.folder_id, f.name AS folder_name
       FROM v_b_knowledge_articles a
       LEFT JOIN v_b_knowledge_folders f ON f.id = a.folder_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY a.updated_at DESC`,
    values
  );
  const articles = rows.map(row => ({
    id: row.id,
    title: row.title || "",
    category: row.category || null,
    folderId: row.folder_id || null,
    folderName: row.folder_name || null,
    excerpt: String(row.content_plain || "").slice(0, 220),
    publishedAt: row.published_at,
    updatedAt: row.updated_at
  }));
  if (q && articles.length === 0) await recordSearchMiss(q);
  return articles;
}

export async function getPortalKnowledgeArticle(clientId, contactId, articleId, { includeFeedback = true, recordView = false } = {}) {
  await ensureKnowledgeArticlesSchema();
  const params = [Number(clientId), contactId != null ? Number(contactId) : null, articleId];
  const { rows } = await pool.query(
    `SELECT a.*
       FROM v_b_knowledge_articles a
      WHERE a.id = $3
        AND a.status = 'published'
        AND ${portalVisibilitySql("a")}`,
    params
  );
  const row = rows[0];
  if (!row) return null;
  if (recordView) await incrementArticleViews(articleId);
  const breadcrumb = row.folder_id ? await getFolderBreadcrumb(row.folder_id) : [];
  const related = await listRelatedPortalArticles(articleId, clientId, contactId, portalVisibilitySql("a"), params);
  const favorite = await isFavorite(articleId, contactId);
  const helpful = await getHelpfulStats(articleId, contactId);
  const article = {
    id: row.id,
    title: row.title || "",
    category: row.category || null,
    folderId: row.folder_id || null,
    contentHtml: rewriteAssetUrls(row.content_html || "", row.id, true),
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    ratingsEnabled: row.feedback_ratings_enabled === true,
    commentsEnabled: row.feedback_comments_enabled === true,
    commentsCompany: row.feedback_comments_company === true,
    canGiveFeedback: contactId != null,
    breadcrumb,
    related,
    isFavorite: favorite,
    ...helpful
  };
  if (!includeFeedback || (!article.ratingsEnabled && !article.commentsEnabled)) {
    return {
      ...article,
      ratingAverage: 0,
      ratingCount: 0,
      commentCount: 0,
      myRating: null,
      comments: []
    };
  }
  const feedback = await getArticleFeedbackSummary(articleId, { contactId });
  const comments = article.commentsCompany
    ? feedback.comments.filter(comment => comment.isMine || Number(comment.clientId) === Number(clientId))
    : feedback.comments.filter(comment => comment.isMine);
  return {
    ...article,
    ratingAverage: article.ratingsEnabled ? feedback.ratingAverage : 0,
    ratingCount: article.ratingsEnabled ? feedback.ratingCount : 0,
    myRating: article.ratingsEnabled ? feedback.myRating : null,
    commentCount: comments.length,
    comments
  };
}

export async function portalCanAccessAsset(clientId, contactId, articleId) {
  const article = await getPortalKnowledgeArticle(clientId, contactId, articleId, { includeFeedback: false });
  return Boolean(article);
}

export async function setArticlePublicLink(articleId, { enabled, rotate } = {}) {
  await ensureKnowledgeArticlesSchema();
  const existing = await getKnowledgeArticle(articleId);
  if (!existing) return null;
  let token = existing.publicToken || null;
  if (rotate === true || (enabled === true && !token)) {
    token = newPublicToken();
  }
  const publicEnabled = enabled != null ? Boolean(enabled) : existing.publicEnabled === true;
  await pool.query(
    `UPDATE v_b_knowledge_articles
        SET public_enabled = $2,
            public_token = $3,
            updated_at = NOW()
      WHERE id = $1`,
    [articleId, publicEnabled, token]
  );
  return getKnowledgeArticle(articleId);
}

export async function getPublicKnowledgeArticle(token) {
  await ensureKnowledgeArticlesSchema();
  const value = String(token || "").trim();
  if (value.length < 20 || value.length > 64) return null;
  const { rows } = await pool.query(
    `SELECT a.id, a.title, a.category, a.icon, a.content_html, a.published_at, a.updated_at, a.public_token
       FROM v_b_knowledge_articles a
      WHERE a.public_token = $1
        AND a.public_enabled = TRUE
        AND a.status = 'published'`,
    [value]
  );
  const row = rows[0];
  if (!row) return null;
  await incrementArticleViews(row.id);
  return {
    title: row.title || "",
    category: row.category || null,
    icon: row.icon || null,
    contentHtml: rewriteAssetUrlsToPublic(row.content_html || "", row.id, row.public_token),
    publishedAt: row.published_at,
    updatedAt: row.updated_at
  };
}

export async function getPublicKnowledgeAsset(token, assetId) {
  await ensureKnowledgeArticlesSchema();
  const value = String(token || "").trim();
  if (value.length < 20 || value.length > 64 || !isUuid(assetId)) return null;
  const { rows } = await pool.query(
    `SELECT a.id
       FROM v_b_knowledge_articles a
      WHERE a.public_token = $1
        AND a.public_enabled = TRUE
        AND a.status = 'published'`,
    [value]
  );
  const articleId = rows[0]?.id;
  if (!articleId) return null;
  return getKnowledgeAsset(articleId, assetId);
}
