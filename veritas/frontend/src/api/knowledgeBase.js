import API_BASE_URL from "../config";

const BASE = `${API_BASE_URL}/knowledge-articles`;

async function handleJsonResponse(response, fallbackMessage) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || fallbackMessage);
  }
  return data;
}

export async function fetchKnowledgeArticles({ search, status, folderId, category } = {}) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  if (folderId) params.set("folderId", folderId);
  if (category) params.set("category", category);
  const query = params.toString();
  const response = await fetch(`${BASE}${query ? `?${query}` : ""}`, { credentials: "include" });
  const data = await handleJsonResponse(response, "Error loading articles.");
  return Array.isArray(data?.articles) ? data.articles : [];
}

export async function fetchKnowledgeTagCatalog() {
  const response = await fetch(`${BASE}/tag-catalog`, { credentials: "include" });
  const data = await handleJsonResponse(response, "Error loading tags.");
  return Array.isArray(data?.tags) ? data.tags : [];
}

export async function fetchKnowledgeArticle(id) {
  const response = await fetch(`${BASE}/${id}`, { credentials: "include" });
  const data = await handleJsonResponse(response, "Error loading article.");
  return data.article;
}

export async function createKnowledgeArticle(payload = {}) {
  const response = await fetch(BASE, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await handleJsonResponse(response, "Error creating article.");
  return data.article;
}

export async function fetchKnowledgeArticleRevision(id, revisionId) {
  const response = await fetch(`${BASE}/${id}/revisions/${revisionId}`, { credentials: "include" });
  const data = await handleJsonResponse(response, "Error loading revision.");
  return data.revision;
}

export async function fetchKnowledgeSearchMisses() {
  const response = await fetch(`${BASE}/insights/search-misses`, { credentials: "include" });
  const data = await handleJsonResponse(response, "Error loading search insights.");
  return Array.isArray(data?.misses) ? data.misses : [];
}

export async function updateKnowledgeArticle(id, payload) {
  const response = await fetch(`${BASE}/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await handleJsonResponse(response, "Error saving article.");
  return data.article;
}

export async function publishKnowledgeArticle(id, payload = {}) {
  const response = await fetch(`${BASE}/${id}/publish`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await handleJsonResponse(response, "Error publishing article.");
  return data.article;
}

export async function unpublishKnowledgeArticle(id) {
  const response = await fetch(`${BASE}/${id}/unpublish`, {
    method: "POST",
    credentials: "include"
  });
  const data = await handleJsonResponse(response, "Error reverting article.");
  return data.article;
}

export async function updateKnowledgeArticlePublicLink(id, { enabled, rotate } = {}) {
  const response = await fetch(`${BASE}/${id}/public-link`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled, rotate })
  });
  const data = await handleJsonResponse(response, "Error updating public link.");
  return data.article;
}

export async function fetchPublicKnowledgeArticle(token) {
  const response = await fetch(`${API_BASE_URL}/public/knowledge/${encodeURIComponent(token)}`);
  const data = await handleJsonResponse(response, "Article not found.");
  return data.article;
}

export async function fetchPublicKnowledgeEmojis() {
  const response = await fetch(`${API_BASE_URL}/public/knowledge/emojis`);
  const data = await handleJsonResponse(response, "Error loading emojis.");
  return Array.isArray(data?.emojis) ? data.emojis : [];
}

export async function fetchKnowledgeArticleRevisions(id) {
  const response = await fetch(`${BASE}/${id}/revisions`, { credentials: "include" });
  const data = await handleJsonResponse(response, "Error loading history.");
  return Array.isArray(data?.revisions) ? data.revisions : [];
}

export async function restoreKnowledgeArticleRevision(id, revisionId) {
  const response = await fetch(`${BASE}/${id}/revisions/${revisionId}/restore`, {
    method: "POST",
    credentials: "include"
  });
  const data = await handleJsonResponse(response, "Error restoring revision.");
  return data;
}

export async function deleteKnowledgeArticle(id) {
  const response = await fetch(`${BASE}/${id}`, {
    method: "DELETE",
    credentials: "include"
  });
  await handleJsonResponse(response, "Error deleting article.");
}

export async function deleteKnowledgeArticles(ids) {
  const response = await fetch(`${BASE}/bulk-delete`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids })
  });
  return handleJsonResponse(response, "Error deleting articles.");
}

export async function moveKnowledgeArticles(ids, folderId) {
  const response = await fetch(`${BASE}/bulk-move`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids, folderId: folderId || null })
  });
  return handleJsonResponse(response, "Error moving articles.");
}

export async function reorderKnowledgeArticles(folderId, orderedIds) {
  const response = await fetch(`${BASE}/reorder`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folderId: folderId || null, orderedIds })
  });
  return handleJsonResponse(response, "Error reordering articles.");
}

const FOLDERS_BASE = `${API_BASE_URL}/knowledge-folders`;

export async function fetchKnowledgeFolders() {
  const response = await fetch(FOLDERS_BASE, { credentials: "include" });
  const data = await handleJsonResponse(response, "Error loading folders.");
  return {
    folders: Array.isArray(data?.folders) ? data.folders : [],
    tree: Array.isArray(data?.tree) ? data.tree : []
  };
}

export async function fetchKnowledgeFolder(id) {
  const response = await fetch(`${FOLDERS_BASE}/${id}`, { credentials: "include" });
  const data = await handleJsonResponse(response, "Error loading folder.");
  return data;
}

export async function createKnowledgeFolder(payload) {
  const response = await fetch(FOLDERS_BASE, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await handleJsonResponse(response, "Error creating folder.");
  return data.folder;
}

export async function updateKnowledgeFolder(id, payload) {
  const response = await fetch(`${FOLDERS_BASE}/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await handleJsonResponse(response, "Error saving folder.");
  return data;
}

export async function reorderKnowledgeFolders(parentId, orderedIds) {
  const response = await fetch(`${FOLDERS_BASE}/reorder`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parentId: parentId || null, orderedIds })
  });
  return handleJsonResponse(response, "Error reordering folders.");
}

export async function deleteKnowledgeFolder(id) {
  const response = await fetch(`${FOLDERS_BASE}/${id}`, {
    method: "DELETE",
    credentials: "include"
  });
  await handleJsonResponse(response, "Error deleting folder.");
}

const CATEGORIES_BASE = `${API_BASE_URL}/knowledge-categories`;

export async function fetchKnowledgeCategories() {
  const response = await fetch(CATEGORIES_BASE, { credentials: "include" });
  const data = await handleJsonResponse(response, "Error loading categories.");
  return Array.isArray(data?.categories) ? data.categories : [];
}

export async function createKnowledgeCategory(name) {
  const response = await fetch(CATEGORIES_BASE, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name })
  });
  const data = await handleJsonResponse(response, "Error creating category.");
  return data.category;
}

export async function updateKnowledgeCategory(id, name) {
  const response = await fetch(`${CATEGORIES_BASE}/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name })
  });
  const data = await handleJsonResponse(response, "Error saving category.");
  return data.category;
}

export async function deleteKnowledgeCategory(id) {
  const response = await fetch(`${CATEGORIES_BASE}/${id}`, {
    method: "DELETE",
    credentials: "include"
  });
  await handleJsonResponse(response, "Error deleting category.");
}

const EMOJIS_BASE = `${API_BASE_URL}/knowledge-emojis`;

export async function fetchKnowledgeEmojis() {
  const response = await fetch(EMOJIS_BASE, { credentials: "include" });
  const data = await handleJsonResponse(response, "Error loading emojis.");
  return Array.isArray(data?.emojis) ? data.emojis : [];
}

export async function createKnowledgeEmoji({ name, file }) {
  const form = new FormData();
  form.append("name", name);
  form.append("file", file);
  const response = await fetch(EMOJIS_BASE, {
    method: "POST",
    credentials: "include",
    body: form
  });
  const data = await handleJsonResponse(response, "Error creating emoji.");
  return data.emoji;
}

export async function renameKnowledgeEmoji(id, name) {
  const response = await fetch(`${EMOJIS_BASE}/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name })
  });
  const data = await handleJsonResponse(response, "Error renaming emoji.");
  return data.emoji;
}

export async function deleteKnowledgeEmoji(id) {
  const response = await fetch(`${EMOJIS_BASE}/${id}`, {
    method: "DELETE",
    credentials: "include"
  });
  await handleJsonResponse(response, "Error deleting emoji.");
}

export function resolveKnowledgeEmojiUrl(emoji) {
  if (!emoji) return "";
  if (typeof emoji === "string") return resolveKnowledgeAssetUrl(emoji);
  return resolveKnowledgeAssetUrl(emoji.url || `/api/knowledge-emojis/${emoji.id}/image`);
}

export async function uploadKnowledgeAsset(articleId, file) {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${BASE}/${articleId}/assets`, {
    method: "POST",
    credentials: "include",
    body: form
  });
  const data = await handleJsonResponse(response, "Error uploading image.");
  return data.asset;
}

const PORTAL_BASE = `${API_BASE_URL}/client-portal/knowledge-base`;

export function resolveKnowledgeAssetUrl(url) {
  const value = String(url || "");
  if (!value || /^https?:/i.test(value) || value.startsWith("data:")) return value;
  const path = value.startsWith("/api") ? value.slice(4) : value.startsWith("/") ? value : `/${value}`;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function resolveKnowledgeHtml(html) {
  return String(html || "").replace(/((?:src|href)=")(\/api\/[^"]+)/g, (_match, prefix, path) => `${prefix}${resolveKnowledgeAssetUrl(path)}`);
}

export function toStoredKnowledgeHtml(html) {
  return String(html || "").replace(/https?:\/\/[^/"'\s]+\/api\//g, "/api/");
}

export function resolveKnowledgeJson(json) {
  try {
    return JSON.parse(JSON.stringify(json || {}).replace(/"(src|href)":"(\/api\/[^"]+)"/g, (_match, key, path) => `"${key}":"${resolveKnowledgeAssetUrl(path)}"`));
  } catch {
    return json;
  }
}

export function toStoredKnowledgeJson(json) {
  try {
    return JSON.parse(toStoredKnowledgeHtml(JSON.stringify(json || {})));
  } catch {
    return json;
  }
}

export async function fetchPortalKnowledgeArticles({ search, folderId, category, favorites } = {}) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (folderId) params.set("folderId", folderId);
  if (category) params.set("category", category);
  if (favorites) params.set("favorites", "1");
  const query = params.toString();
  const response = await fetch(`${PORTAL_BASE}${query ? `?${query}` : ""}`, { credentials: "include" });
  const data = await handleJsonResponse(response, "Error loading knowledge base.");
  return {
    articles: Array.isArray(data?.articles) ? data.articles : [],
    total: Number(data?.total) || 0
  };
}

export async function fetchPortalKnowledgeArticle(id) {
  const response = await fetch(`${PORTAL_BASE}/${id}`, { credentials: "include" });
  const data = await handleJsonResponse(response, "Error loading article.");
  return data.article;
}

export async function deleteKnowledgeArticleComment(articleId, commentId) {
  const response = await fetch(`${BASE}/${articleId}/comments/${commentId}`, {
    method: "DELETE",
    credentials: "include"
  });
  const data = await handleJsonResponse(response, "Error deleting comment.");
  return data.article;
}

export async function ratePortalKnowledgeArticle(id, rating) {
  const response = await fetch(`${PORTAL_BASE}/${id}/rating`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating })
  });
  const data = await handleJsonResponse(response, "Error saving rating.");
  return data.article;
}

export async function commentPortalKnowledgeArticle(id, body) {
  const response = await fetch(`${PORTAL_BASE}/${id}/comments`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body })
  });
  const data = await handleJsonResponse(response, "Error posting comment.");
  return data.article;
}

export async function updatePortalKnowledgeComment(articleId, commentId, body) {
  const response = await fetch(`${PORTAL_BASE}/${articleId}/comments/${commentId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body })
  });
  const data = await handleJsonResponse(response, "Error editing comment.");
  return data.article;
}

export async function markPortalKnowledgeHelpful(id, helpful) {
  const response = await fetch(`${PORTAL_BASE}/${id}/helpful`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ helpful })
  });
  const data = await handleJsonResponse(response, "Error saving feedback.");
  return data.article;
}

export async function togglePortalKnowledgeFavorite(id) {
  const response = await fetch(`${PORTAL_BASE}/${id}/favorite`, {
    method: "POST",
    credentials: "include"
  });
  const data = await handleJsonResponse(response, "Error saving favorite.");
  return data.article;
}

export async function deletePortalKnowledgeComment(articleId, commentId) {
  const response = await fetch(`${PORTAL_BASE}/${articleId}/comments/${commentId}`, {
    method: "DELETE",
    credentials: "include"
  });
  const data = await handleJsonResponse(response, "Error deleting comment.");
  return data.article;
}
