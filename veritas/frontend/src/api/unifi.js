import API_BASE_URL from "../config";

async function handleJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    const err = new Error(data.error || data.message || `Error ${res.status}`);
    err.details = data.details || null;
    throw err;
  }
  return data;
}

export async function getUnifiStatus() {
  const res = await fetch(`${API_BASE_URL}/unifi/status`, { credentials: "include" });
  return handleJson(res);
}

export async function fetchUnifiHosts() {
  const res = await fetch(`${API_BASE_URL}/unifi/hosts`, { credentials: "include" });
  return handleJson(res);
}

export async function fetchUnifiSites(hostId) {
  const qs = hostId ? `?hostId=${encodeURIComponent(hostId)}` : "";
  const res = await fetch(`${API_BASE_URL}/unifi/sites${qs}`, { credentials: "include" });
  return handleJson(res);
}

export async function fetchUnifiDevices({ hostId, siteId, siteName } = {}) {
  const params = new URLSearchParams();
  if (hostId) params.set("hostId", hostId);
  if (siteId) params.set("siteId", siteId);
  if (siteName) params.set("siteName", siteName);
  const res = await fetch(`${API_BASE_URL}/unifi/devices?${params.toString()}`, {
    credentials: "include"
  });
  return handleJson(res);
}

export async function fetchUnifiCarrierSubscribers() {
  const res = await fetch(`${API_BASE_URL}/unifi/carrier/subscribers`, {
    credentials: "include"
  });
  return handleJson(res);
}

export async function getClientUnifiGlobalStatus() {
  const res = await fetch(`${API_BASE_URL}/client-unifi/global-status`, {
    credentials: "include"
  });
  return handleJson(res);
}

export async function getClientUnifiLink(clientId) {
  const res = await fetch(`${API_BASE_URL}/client-unifi/${clientId}`, {
    credentials: "include"
  });
  return handleJson(res);
}

export async function saveClientUnifiLink(clientId, payload) {
  const res = await fetch(`${API_BASE_URL}/client-unifi/${clientId}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  return handleJson(res);
}

export async function clearClientUnifiLink(clientId) {
  const res = await fetch(`${API_BASE_URL}/client-unifi/${clientId}`, {
    method: "DELETE",
    credentials: "include"
  });
  return handleJson(res);
}
