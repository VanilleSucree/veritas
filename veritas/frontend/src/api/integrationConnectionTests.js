import API_BASE_URL from "../config";

async function handleTestResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    const message = data.error || data.message || data.details || `Error ${res.status}`;
    const err = new Error(message);
    err.details = data.details && data.details !== message ? data.details : null;
    throw err;
  }
  return data;
}

export async function testCheckmkConnection({
  apiUrl,
  username,
  password,
  site
} = {}) {
  const res = await fetch(`${API_BASE_URL}/checkmk/test`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      CHECKMK_API_URL: apiUrl,
      CHECKMK_USERNAME: username,
      CHECKMK_PASSWORD: password,
      CHECKMK_SITE: site
    })
  });
  return handleTestResponse(res);
}

export async function testHycuConnection({
  apiUrl,
  apiKey,
  username,
  password,
  verifyTls
} = {}) {
  const res = await fetch(`${API_BASE_URL}/hycu/test`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      HYCU_API_URL: apiUrl,
      HYCU_API_KEY: apiKey,
      HYCU_USERNAME: username,
      HYCU_PASSWORD: password,
      HYCU_VERIFY_TLS: verifyTls
    })
  });
  return handleTestResponse(res);
}

export async function testUnifiConnection({
  api = "site-manager",
  apiKey
} = {}) {
  const res = await fetch(`${API_BASE_URL}/unifi/test`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      api,
      apiKey
    })
  });
  return handleTestResponse(res);
}

export async function testWhatsappConnection() {
  const res = await fetch(`${API_BASE_URL}/whatsapp/test`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  });
  return handleTestResponse(res);
}
