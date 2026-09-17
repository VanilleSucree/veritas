import { deleteClientModuleItem, fetchClientModules, saveClientModules } from "../../api/clients";
import { fetchOvhDomains, fetchOvhDomainDetails } from "../../api/clientOvh";
import { getDnsProvider, inferProviderIdFromDomain } from "./dnsFormConfig";
function formatDateForStorage(raw) {
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return String(raw).split("T")[0] || "";
  return date.toISOString().split("T")[0];
}
export function formatRenewalModeLabel(mode) {
  if (mode === "automatic") return "Automatique";
  if (mode === "manual") return "Manuel";
  return "Unknown";
}
export function normalizeDomainItem(item) {
  if (!item) return null;
  const nom = item.nom || item.domaine || item.name || item.domain || "";
  const expirationRaw = item.expiration || item.expirationDate || item.expirityDate || null;
  const autoRenew = item.autoRenew ?? item.auto_renewal ?? null;
  const hasManualHints = item.providerId === "manual" || item.isManual === true;
  const providerId = item.providerId || ((item.registrar || "").toLowerCase().includes("ovh") ? "ovh" : hasManualHints ? "manual" : inferProviderIdFromDomain({
    ...item,
    nom
  }));
  return {
    ...item,
    nom,
    domaine: item.domaine || nom,
    name: item.name || nom,
    domain: item.domain || nom,
    registrar: item.registrar || (providerId === "ovh" ? "OVH" : providerId === "manual" ? null : "") || "",
    providerId: providerId || null,
    isManual: item.isManual ?? providerId === "manual",
    expiration: formatDateForStorage(expirationRaw),
    expirationDate: expirationRaw,
    autoRenew,
    auto_renewal: autoRenew,
    manualPayment: item.manualPayment ?? null,
    deleteAtExpiration: item.deleteAtExpiration ?? null,
    renewalMode: item.renewalMode || null,
    renewalPeriod: item.renewalPeriod ?? null,
    dnsZone: item.dnsZone || null,
    hasDnsZone: item.hasDnsZone ?? Boolean(item.dnsZone),
    serviceId: item.serviceId ?? null,
    serviceStatus: item.serviceStatus ?? null,
    syncData: item.syncData || null
  };
}
export function mapOvhApiDomainToMonitored(ovhDomain) {
  const nom = ovhDomain.domain || ovhDomain.name || ovhDomain.nom || "";
  return normalizeDomainItem({
    nom,
    registrar: "OVH",
    providerId: "ovh",
    expiration: ovhDomain.expiration || ovhDomain.expirationDate,
    autoRenew: ovhDomain.autoRenew,
    manualPayment: ovhDomain.manualPayment,
    deleteAtExpiration: ovhDomain.deleteAtExpiration,
    renewalMode: ovhDomain.renewalMode,
    renewalPeriod: ovhDomain.renewalPeriod,
    dnsZone: ovhDomain.dnsZone,
    hasDnsZone: ovhDomain.hasDnsZone,
    serviceId: ovhDomain.serviceId,
    serviceStatus: ovhDomain.serviceStatus,
    nameServers: ovhDomain.nameServers,
    whoisOwner: ovhDomain.whoisOwner,
    syncData: ovhDomain.syncData
  });
}
export function formatDomainSummary(domain) {
  const normalized = normalizeDomainItem(domain);
  if (!normalized) return {
    label: "Domain",
    meta: ""
  };
  const providerId = normalized.providerId || inferProviderIdFromDomain(normalized) || "manual";
  const providerName = providerId === "manual" ? getDnsProvider("manual")?.label || "Other registrar" : providerId === "ovh" ? "OVH" : getDnsProvider(providerId)?.label || normalized.registrar || "-";
  const registrarLabel = normalized.registrar && normalized.registrar !== "N/A" && providerId !== "manual" ? normalized.registrar : providerId === "manual" && normalized.registrar ? normalized.registrar : null;
  const metaParts = [registrarLabel || providerName];
  if (normalized.expiration) {
    metaParts.push(`Expires on ${new Date(normalized.expiration).toLocaleDateString("en-GB")}`);
  }
  if (normalized.autoRenew != null) {
    metaParts.push(normalized.autoRenew ? "Auto-renewal" : "Manual renewal");
  }
  if (normalized.hasDnsZone) {
    metaParts.push("OVH DNS zone");
  }
  return {
    label: normalized.nom || "Domain",
    providerName,
    providerId,
    meta: metaParts.join(" · ")
  };
}
export function isDomainConfigured(item) {
  const normalized = normalizeDomainItem(item);
  return Boolean(normalized?.nom?.trim());
}
export function isManualDomain(item) {
  const normalized = normalizeDomainItem(item);
  if (!normalized?.nom?.trim()) return false;
  if (isOvhManagedDomain(normalized)) return false;
  return Boolean(normalized.providerId === "manual" || normalized.isManual);
}
export function isOvhManagedDomain(item) {
  const normalized = normalizeDomainItem(item);
  if (!normalized?.nom?.trim()) return false;
  if (normalized.providerId === "ovh") return true;
  return (normalized.registrar || "").toLowerCase().includes("ovh");
}
export function extractDomainsFromModules(modulesData) {
  const list = modulesData?.equipements?.NDD;
  if (!Array.isArray(list)) return [];
  return list.map(item => normalizeDomainItem(item)).filter(Boolean);
}
function buildDomainDedupeKey(item) {
  const normalized = normalizeDomainItem(item);
  return (normalized?.nom || "").trim().toLowerCase().replace(/\.+$/, "");
}
function uniqueConfiguredDomains(list) {
  const seen = new Set();
  const configured = [];
  for (const item of list) {
    if (!isDomainConfigured(item)) continue;
    const dedupeKey = buildDomainDedupeKey(item);
    if (!dedupeKey || seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    configured.push(item);
  }
  return configured;
}
export function listConfiguredDomains(client, domainItems = [], modulesData = null) {
  const equipements = modulesData?.equipements || client?.equipements;
  const nddFromEquipements = Array.isArray(equipements?.NDD) ? equipements.NDD : null;
  const fromModules = (nddFromEquipements || []).map(item => normalizeDomainItem(item)).filter(Boolean);
  if (nddFromEquipements != null) {
    return uniqueConfiguredDomains(fromModules);
  }
  const fromItems = (domainItems || []).map(item => normalizeDomainItem(item)).filter(Boolean);
  return uniqueConfiguredDomains(fromItems);
}
export function isClientDomainsConfigured(client, domainItems = [], modulesData = null) {
  return listConfiguredDomains(client, domainItems, modulesData).length > 0;
}
function domainMatches(a, b) {
  const aId = a?.id != null ? String(a.id) : "";
  const bId = b?.id != null ? String(b.id) : "";
  if (aId && bId && aId === bId) return true;
  const aKey = buildDomainDedupeKey(a);
  const bKey = buildDomainDedupeKey(b);
  return Boolean(aKey) && aKey === bKey;
}
function withDomainItemKey(domain) {
  const normalized = normalizeDomainItem(domain);
  if (!normalized) return null;
  const key = normalized.item_key || normalized.nom || normalized.name || "";
  return {
    ...normalized,
    id: normalized.id,
    item_key: key
  };
}
function sanitizeDomainForSave(domain) {
  const normalized = withDomainItemKey(domain);
  if (!normalized) return null;
  const {
    id,
    item_key,
    nom,
    name,
    domaine,
    domain,
    registrar,
    providerId,
    isManual,
    expiration,
    expirationDate,
    autoRenew,
    auto_renewal,
    manualPayment,
    deleteAtExpiration,
    renewalMode,
    renewalPeriod,
    dnsZone,
    hasDnsZone,
    serviceId,
    serviceStatus,
    creationDate,
    nameServers,
    whoisOwner,
    syncData
  } = normalized;
  return {
    id,
    item_key,
    nom: nom || name || domain || domaine || "",
    name: name || nom || domain || domaine || "",
    domaine: domaine || nom || name || "",
    domain: domain || nom || name || "",
    registrar: registrar || null,
    providerId: providerId || null,
    isManual: Boolean(isManual),
    expiration: expiration || null,
    expirationDate: expirationDate || expiration || null,
    autoRenew: autoRenew ?? null,
    auto_renewal: auto_renewal ?? autoRenew ?? null,
    manualPayment: manualPayment ?? null,
    deleteAtExpiration: deleteAtExpiration ?? null,
    renewalMode: renewalMode || null,
    renewalPeriod: renewalPeriod ?? null,
    dnsZone: dnsZone || null,
    hasDnsZone: Boolean(hasDnsZone),
    serviceId: serviceId ?? null,
    serviceStatus: serviceStatus ?? null,
    creationDate: creationDate || null,
    nameServers: Array.isArray(nameServers) ? nameServers : [],
    whoisOwner: whoisOwner || null,
    syncData: syncData && typeof syncData === "object" ? {
      lastSync: syncData.lastSync || null,
      serviceInfos: syncData.serviceInfos || null
    } : null
  };
}
export async function saveMonitoredDomains(clientId, domains) {
  const normalized = (domains || []).map(d => sanitizeDomainForSave(d)).filter(isDomainConfigured);
  const modulesData = await fetchClientModules(clientId);
  await saveClientModules(clientId, {
    modules: modulesData?.modules || {
      Monitoring: true
    },
    modules_monitoring: {
      NDD: normalized.length > 0
    },
    equipements: {
      NDD: normalized
    }
  });
  return normalized;
}
export async function removeMonitoredDomain(clientId, domain) {
  const normalized = normalizeDomainItem(domain) || domain;
  if (!clientId || !normalized?.nom && normalized?.id == null) {
    throw new Error("Domaine introuvable.");
  }
  const modulesData = await fetchClientModules(clientId);
  const existing = extractDomainsFromModules(modulesData);
  const remaining = existing.filter(entry => !domainMatches(entry, normalized));
  const removed = existing.filter(entry => domainMatches(entry, normalized));
  const idsToDelete = [...removed.map(entry => entry.id), normalized.id].filter(Boolean);
  for (const id of [...new Set(idsToDelete.map(id => String(id)))]) {
    try {
      await deleteClientModuleItem(clientId, "ndd", id);
    } catch {
      // La sync ci-dessous retire aussi les lignes absentes de remaining.
    }
  }
  return saveMonitoredDomains(clientId, remaining);
}
export async function reorderMonitoredDomains(clientId, orderedItems = []) {
  const normalized = (orderedItems || []).map(d => normalizeDomainItem(d)).filter(isDomainConfigured);
  return saveMonitoredDomains(clientId, normalized);
}
export async function importOvhDomainsForClient(clientId, ovhDomains = [], existingDomains = []) {
  const existingKeys = new Set((existingDomains || []).map(d => buildDomainDedupeKey(d)).filter(Boolean));
  const toAdd = (ovhDomains || []).map(d => mapOvhApiDomainToMonitored(d)).filter(d => {
    const key = buildDomainDedupeKey(d);
    return key && !existingKeys.has(key);
  });
  const merged = [...(existingDomains || []).map(normalizeDomainItem), ...toAdd];
  return saveMonitoredDomains(clientId, merged);
}
export async function refreshMonitoredDomainsFromOvh(clientId) {
  const modulesData = await fetchClientModules(clientId);
  const existing = extractDomainsFromModules(modulesData);
  const ovhMonitored = existing.filter(d => d.providerId === "ovh" && d.nom);
  if (ovhMonitored.length === 0) {
    return existing;
  }
  const apiResult = await fetchOvhDomains({
    light: true
  });
  const apiDomains = Array.isArray(apiResult.domains) ? apiResult.domains : [];
  const apiByName = new Map(apiDomains.map(d => [(d.domain || d.name || "").toLowerCase(), mapOvhApiDomainToMonitored(d)]));
  const updated = existing.map(domain => {
    if (domain.providerId !== "ovh") return domain;
    const fresh = apiByName.get((domain.nom || "").toLowerCase());
    if (!fresh) return domain;
    return {
      ...domain,
      ...fresh,
      id: domain.id,
      item_key: domain.item_key || domain.nom,
      nom: domain.nom
    };
  });
  return saveMonitoredDomains(clientId, updated);
}
export async function refreshSingleMonitoredDomainFromOvh(clientId, domain) {
  const normalized = normalizeDomainItem(domain);
  if (!clientId || !normalized?.nom) {
    throw new Error("Domaine introuvable.");
  }
  if (!isOvhManagedDomain(normalized)) {
    return normalized;
  }
  const result = await fetchOvhDomainDetails(normalized.nom);
  const fresh = result?.domain || result;
  const mapped = mapOvhApiDomainToMonitored(fresh || {});
  const modulesData = await fetchClientModules(clientId);
  const existing = extractDomainsFromModules(modulesData);
  const merged = existing.map(entry => domainMatches(entry, normalized) ? {
    ...entry,
    ...mapped,
    id: entry.id,
    item_key: entry.item_key || entry.nom || normalized.nom,
    nom: normalized.nom
  } : entry);
  await saveMonitoredDomains(clientId, merged);
  return merged.find(entry => domainMatches(entry, normalized)) || mapped;
}
