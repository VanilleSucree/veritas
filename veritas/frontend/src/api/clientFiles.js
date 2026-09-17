import API_BASE_URL from "../config";
const BASE = `${API_BASE_URL}/client-files`;
export async function fetchClientFiles({
  clientId,
  category,
  folderId,
  signal
} = {}) {
  const params = new URLSearchParams();
  if (clientId) params.set("clientId", clientId);
  if (category && category !== "all") params.set("category", category);
  if (folderId !== undefined && folderId !== null && folderId !== "all") {
    params.set("folderId", folderId === "root" ? "root" : String(folderId));
  }
  const res = await fetch(`${BASE}?${params}`, {
    credentials: "include",
    signal
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err.error || `Error ${res.status}`);
    if (err.code) error.code = err.code;
    throw error;
  }
  return res.json();
}

export async function fetchClientFileFolders({
  clientId,
  parentId = null,
  signal
} = {}) {
  const params = new URLSearchParams();
  if (clientId) params.set("clientId", clientId);
  if (parentId) params.set("parentId", parentId);
  const res = await fetch(`${BASE}/folders?${params}`, {
    credentials: "include",
    signal
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data?.folders) ? data.folders : [];
}

export async function createClientFileFolder({
  clientId,
  name,
  parentId = null
}) {
  const res = await fetch(`${BASE}/folders`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, name, parentId: parentId || null })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status}`);
  }
  const data = await res.json();
  return data.folder;
}

export async function renameClientFileFolder(id, name) {
  const res = await fetch(`${BASE}/folders/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status}`);
  }
  const data = await res.json();
  return data.folder;
}

export async function deleteClientFileFolder(id) {
  const res = await fetch(`${BASE}/folders/${id}`, {
    method: "DELETE",
    credentials: "include"
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status}`);
  }
  return res.json();
}

export async function uploadClientFile({
  clientId,
  clientName,
  category,
  description,
  file,
  visibleToClient = false,
  folderId = null
}) {
  const form = new FormData();
  form.append("file", file);
  form.append("clientId", String(clientId));
  if (clientName) form.append("clientName", clientName);
  if (category) form.append("category", category);
  if (description) form.append("description", description);
  if (visibleToClient) form.append("visibleToClient", "true");
  if (folderId) form.append("folderId", String(folderId));
  const res = await fetch(BASE, {
    method: "POST",
    credentials: "include",
    body: form
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status}`);
  }
  return res.json();
}
export async function deleteClientFile(id) {
  const res = await fetch(`${BASE}/${id}`, {
    method: "DELETE",
    credentials: "include"
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}
export async function updateClientFile(id, {
  description,
  visibleToClient,
  category
} = {}) {
  const body = {};
  if (description !== undefined) body.description = description;
  if (visibleToClient !== undefined) body.visibleToClient = visibleToClient;
  if (category !== undefined) body.category = category;
  if (!Object.keys(body).length) {
    throw new Error("No data to update.");
  }
  const res = await fetch(`${BASE}/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status}`);
  }
  return res.json();
}
export async function updateClientFileDescription(id, description) {
  return updateClientFile(id, {
    description
  });
}
export async function bulkUpdateClientFiles(files, fields) {
  const rows = [];
  const failed = [];
  for (const file of Array.isArray(files) ? files : []) {
    try {
      const updated = await updateClientFile(file.id, fields);
      rows.push(updated);
    } catch {
      failed.push(file.id);
    }
  }
  return {
    updated: rows.length,
    failed,
    rows
  };
}
export async function bulkDeleteClientFiles(files) {
  const deletedIds = [];
  const failed = [];
  for (const file of Array.isArray(files) ? files : []) {
    try {
      await deleteClientFile(file.id);
      deletedIds.push(file.id);
    } catch {
      failed.push(file.id);
    }
  }
  return {
    deleted: deletedIds.length,
    failed,
    deletedIds
  };
}
export function getPreviewUrl(id) {
  return `${BASE}/${id}/preview`;
}
export function getDownloadUrl(id) {
  return `${BASE}/${id}/download`;
}
