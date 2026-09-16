import API_BASE_URL from "../config";

async function handleJsonResponse(response, fallbackMessage) {
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error || payload?.message || fallbackMessage;
    throw new Error(message);
  }
  return payload;
}

export async function fetchSubscriptions() {
  const response = await fetch(`${API_BASE_URL}/subscriptions`, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" }
  });
  return handleJsonResponse(response, "Error fetching subscriptions");
}

export async function fetchSubscription(entityType, entityId) {
  const response = await fetch(
    `${API_BASE_URL}/subscriptions/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`,
    {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    }
  );
  return handleJsonResponse(response, "Error fetching subscription");
}

export async function saveSubscription(entityType, entityId, { notifyInapp, notifyEmail } = {}) {
  const body = {};
  if (typeof notifyInapp === "boolean") body.notifyInapp = notifyInapp;
  if (typeof notifyEmail === "boolean") body.notifyEmail = notifyEmail;
  const response = await fetch(
    `${API_BASE_URL}/subscriptions/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`,
    {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }
  );
  return handleJsonResponse(response, "Error saving subscription");
}

export async function removeSubscription(entityType, entityId) {
  const response = await fetch(
    `${API_BASE_URL}/subscriptions/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`,
    {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    }
  );
  return handleJsonResponse(response, "Error removing subscription");
}
