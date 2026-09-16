import API_BASE_URL from "../config";
const BASE_URL = `${API_BASE_URL}/equipment-families`;
export async function fetchEquipmentFamilies(options = {}) {
  const includeDisabled = options.includeDisabled ? "?includeDisabled=1" : "";
  const path = options.admin ? `${BASE_URL}/admin` : `${BASE_URL}${includeDisabled}`;
  const res = await fetch(path, {
    credentials: "include",
    signal: options.signal
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(errText || `Error ${res.status} equipment-families`);
  }
  const data = await res.json();
  return data.families || [];
}
export async function createEquipmentFamily(payload) {
  const res = await fetch(BASE_URL, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Error creating family");
  }
  return res.json();
}
export async function updateEquipmentFamily(id, payload) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Error updating family");
  }
  return res.json();
}
export async function fetchSystemFamilyExtensions(options = {}) {
  const query = options.familyKey ? `?familyKey=${encodeURIComponent(options.familyKey)}` : "";
  const res = await fetch(`${BASE_URL}/extensions${query}`, {
    credentials: "include",
    signal: options.signal
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(errText || `Error ${res.status} equipment-family extensions`);
  }
  return res.json();
}
export async function fetchEquipmentMapStyle(options = {}) {
  const res = await fetch(`${BASE_URL}/map-style`, {
    credentials: "include",
    signal: options.signal
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(errText || `Error ${res.status} equipment-map-style`);
  }
  return res.json();
}
export async function updateSystemFamilyLayouts(layouts, extra = {}) {
  const res = await fetch(`${BASE_URL}/layouts`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      layouts,
      ...(extra.tileShape ? { tileShape: extra.tileShape } : {})
    })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Error updating family positions");
  }
  return res.json();
}
export async function updateSystemFamilyExtensions(familyKey, fields, layout = null) {
  const res = await fetch(`${BASE_URL}/extensions/${encodeURIComponent(familyKey)}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ...(Array.isArray(fields) ? { fields } : {}),
      ...(layout && typeof layout === "object" ? { layout } : {})
    })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Error updating family fields");
  }
  return res.json();
}
export async function deleteEquipmentFamily(id) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
    credentials: "include"
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Error deleting family");
  }
  return res.json();
}
export function buildCustomFamilyType(familyKey) {
  return `Custom:${familyKey}`;
}
export function parseCustomFamilyType(type) {
  if (!type || !String(type).startsWith("Custom:")) return null;
  return String(type).slice("Custom:".length);
}
function pickCustomEquipmentValue(item, fields, data, keys) {
  for (const key of keys) {
    const value = item?.[key] ?? fields?.[key] ?? data?.[key];
    if (value != null && String(value).trim() !== "") return value;
  }
  return "";
}
function parseCustomActiveFlag(value) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  if (["false", "0", "no", "non", "off", "inactif", "inactive", "disabled"].includes(normalized)) return false;
  if (["true", "1", "yes", "oui", "on", "actif", "active", "enabled"].includes(normalized)) return true;
  return undefined;
}
function readCustomEquipmentIsActive(item, fields, data) {
  const layers = [fields, data, item];
  const keys = ["actif", "is_active", "isActive", "active"];
  for (const layer of layers) {
    if (!layer || typeof layer !== "object") continue;
    for (const key of keys) {
      const parsed = parseCustomActiveFlag(layer[key]);
      if (parsed !== undefined) return parsed;
    }
  }
  return true;
}
export function mapCustomEquipmentItem(item, familyOrKey, extras = {}) {
  const family = familyOrKey && typeof familyOrKey === "object" ? familyOrKey : null;
  const familyKey = family?.familyKey || familyOrKey || extras.familyKey || item?.familyKey || null;
  const fields = item?.fields && typeof item.fields === "object" ? item.fields : {};
  const data = item?.data && typeof item.data === "object" ? item.data : fields;
  return {
    ...item,
    type: familyKey ? buildCustomFamilyType(familyKey) : item?.type,
    familyKey,
    customFamily: family || item?.customFamily || null,
    customFields: family?.fields || item?.customFields || [],
    clientId: item?.clientId || extras.clientId || null,
    clientName: item?.clientName || extras.clientName || "",
    name: item?.name || pickCustomEquipmentValue(item, fields, data, ["name", "nom"]),
    location: item?.location || pickCustomEquipmentValue(item, fields, data, ["site", "location", "localisation", "lieu", "emplacement"]),
    manufacturer: item?.manufacturer || pickCustomEquipmentValue(item, fields, data, ["manufacturer", "marque", "brand", "constructeur"]),
    model: item?.model || pickCustomEquipmentValue(item, fields, data, ["model", "modele", "modèle"]),
    serial: item?.serial || pickCustomEquipmentValue(item, fields, data, ["serial", "numeroSerie", "numero_serie", "sn"]),
    is_active: readCustomEquipmentIsActive(item, fields, data),
    createdAt: item?.createdAt || item?.created_at || extras.createdAt || null,
    created_at: item?.createdAt || item?.created_at || extras.createdAt || null,
    rawData: item?.rawData || data || fields || {},
    data: data || fields || {},
    fields
  };
}
