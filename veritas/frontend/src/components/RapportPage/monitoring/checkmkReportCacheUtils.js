export function parseCheckMKResponses(servicesResp, eventsResp, availabilityResp) {
  const services = Array.isArray(servicesResp?.services) ? servicesResp.services : [];
  const rawEvents = eventsResp?.events ?? eventsResp?.data?.events;
  const events = Array.isArray(rawEvents) ? rawEvents : [];
  const availability = availabilityResp?.availability ?? availabilityResp ?? null;
  const eventsCount = typeof eventsResp?.events_count === "number" ? eventsResp.events_count : events.length;
  return {
    services,
    events,
    availability,
    eventsCount
  };
}
export function buildCheckMKCacheEntry(services, events, availability, period = null) {
  return {
    services,
    events,
    availability,
    syncedAt: new Date().toISOString(),
    period: period ? {
      start: period.start,
      end: period.end
    } : null
  };
}

function firstCheckmkString(...values) {
  for (const value of values) {
    if (value == null || value === false) continue;
    const text = String(value).trim();
    if (text && text !== "null" && text !== "undefined") return text;
  }
  return null;
}

export function getCheckmkHostName(item) {
  return firstCheckmkString(
    item?.checkmk_host_name,
    item?.checkmkHostName,
    item?.checkmkMapping?.checkmk_host_name,
    item?.checkmkMapping?.checkmkHostName,
    item?.data?.checkmk_host_name,
    item?.data?.checkmkHostName,
    item?.data?.checkmkMapping?.checkmk_host_name,
    item?.rawData?.checkmk_host_name,
    item?.rawData?.checkmkMapping?.checkmk_host_name
  );
}

export function getCheckmkSite(item) {
  return firstCheckmkString(
    item?.checkmk_site,
    item?.checkmkMapping?.checkmk_site,
    item?.data?.checkmk_site,
    item?.rawData?.checkmk_site
  );
}

export function getCheckmkServiceName(item) {
  return firstCheckmkString(
    item?.checkmk_service_name,
    item?.checkmkMapping?.checkmk_service_name,
    item?.data?.checkmk_service_name,
    item?.rawData?.checkmk_service_name
  );
}

export function getCheckmkMapping(item) {
  const hostName = getCheckmkHostName(item);
  if (!hostName) return null;
  return {
    is_active: item?.checkmkMapping?.is_active !== false,
    checkmk_host_name: hostName,
    checkmk_site: getCheckmkSite(item),
    checkmk_service_name: getCheckmkServiceName(item)
  };
}

export function isEquipmentMappedForCheckMK(item) {
  if (!item) return false;
  if (item.checkmkMapping?.is_active === false) return false;
  return Boolean(getCheckmkHostName(item));
}

export function preserveCheckmkMappingsOnEquipements(previous = {}, next = {}) {
  if (!next || typeof next !== "object") return next;
  const prev = previous && typeof previous === "object" ? previous : {};
  const merged = { ...next };
  Object.keys(merged).forEach(key => {
    if (!Array.isArray(merged[key]) || !Array.isArray(prev[key])) return;
    const prevById = new Map(
      prev[key].filter(item => item?.id != null).map(item => [String(item.id), item])
    );
    merged[key] = merged[key].map(item => {
      const prior = item?.id != null ? prevById.get(String(item.id)) : null;
      if (!prior) return item;
      const hostName = getCheckmkHostName(item) || getCheckmkHostName(prior);
      if (!hostName) return item;
      const nextItem = {
        ...item,
        checkmk_host_name: getCheckmkHostName(item) || hostName,
        checkmk_site: getCheckmkSite(item) ?? getCheckmkSite(prior),
        checkmk_service_name: getCheckmkServiceName(item) ?? getCheckmkServiceName(prior)
      };
      return {
        ...nextItem,
        checkmkMapping: getCheckmkMapping(nextItem)
      };
    });
  });
  return merged;
}

const CHECKMK_REPORT_EQUIPMENT_KEYS = new Set([
  "Internet",
  "Serveurs",
  "Servers",
  "Firewalls",
  "Firewall",
  "NAS",
  "SAN",
  "Stockage",
  "Storage",
  "Switch",
  "BorneWifi",
  "Alimentation",
  "Routeur",
  "TOIP"
]);

function collectEquipmentLists(equipements = {}) {
  const lists = [];
  const visit = (familyKey, value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      lists.push({ familyKey, items: value });
      return;
    }
    if (typeof value !== "object") return;
    if (Array.isArray(value.solutions)) lists.push({ familyKey, items: value.solutions });
    if (Array.isArray(value.instances)) lists.push({ familyKey, items: value.instances });
    if (Array.isArray(value.items)) lists.push({ familyKey, items: value.items });
    if (Array.isArray(value.connections)) lists.push({ familyKey, items: value.connections });
  };
  Object.entries(equipements || {}).forEach(([key, value]) => {
    if (!CHECKMK_REPORT_EQUIPMENT_KEYS.has(key)) return;
    visit(key, value);
  });
  return lists;
}

/** Collect all hardware items with an active CheckMK host mapping. */
export function collectCheckMKMappedEquipment(equipements = {}) {
  const eq = equipements && typeof equipements === "object" ? equipements : {};
  const seen = new Set();
  const mappings = [];
  collectEquipmentLists(eq).forEach(({ familyKey, items }) => {
    items.forEach(item => {
      if (!isEquipmentMappedForCheckMK(item)) return;
      const hostName = getCheckmkHostName(item);
      if (!hostName) return;
      const equipmentId = item?.id ?? item?.uuid ?? item?.dbId ?? null;
      const dedupeKey = equipmentId != null ? `id:${equipmentId}` : `host:${hostName}`;
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);
      mappings.push({
        equipment_id: equipmentId,
        checkmk_host_name: hostName,
        checkmk_site: getCheckmkSite(item),
        familyKey,
        item
      });
    });
  });
  return mappings;
}
export function computeCheckMKEquipmentStatus({
  services,
  events,
  availability,
  eventsCount
}) {
  const criticalCount = eventsCount ?? (Array.isArray(events) ? events.length : 0);
  const up = availability != null && typeof availability.up === "number" ? availability.up : null;
  if (up == null && criticalCount === 0 && services.length === 0) return "unsynced";
  if (up != null && up < 95) return "critical";
  if (criticalCount >= 5) return "critical";
  if (up != null && up < 99 || criticalCount > 0) return "warn";
  return "ok";
}
export function resolveCheckMKEquipmentKey(item, equipmentKey) {
  if (item?.id != null) return String(item.id);
  if (equipmentKey != null) return String(equipmentKey);
  return null;
}
export function getCheckMKCachedData(cache, item, equipmentKey) {
  if (!cache || typeof cache !== "object") return null;
  const primaryKey = resolveCheckMKEquipmentKey(item, equipmentKey);
  if (primaryKey && cache[primaryKey]) return cache[primaryKey];
  if (equipmentKey != null && cache[String(equipmentKey)]) return cache[String(equipmentKey)];
  return null;
}

/** Number of CheckMK services monitored on the host, or null if not synced. */
export function countCheckMKMonitoredServices(cached) {
  if (!cached || typeof cached !== "object") return null;
  if (!Array.isArray(cached.services)) return null;
  return cached.services.length;
}
export function isCheckMKCacheValidForPeriod(cachedPeriod, reportStartDate, reportEndDate) {
  if (!cachedPeriod) return false;
  return cachedPeriod.reportStartDate === reportStartDate && cachedPeriod.reportEndDate === reportEndDate;
}
export function buildCheckMKReportSnapshot(equipmentData, equipmentStatus, reportStartDate, reportEndDate) {
  // Persist a slim snapshot: full CheckMK event dumps easily exceed reverse-proxy body limits (413).
  const slimEquipmentData = {};
  const source = equipmentData && typeof equipmentData === "object" ? equipmentData : {};
  for (const [key, entry] of Object.entries(source)) {
    if (!entry || typeof entry !== "object") {
      slimEquipmentData[key] = entry;
      continue;
    }
    slimEquipmentData[key] = {
      syncedAt: entry.syncedAt || null,
      period: entry.period || null,
      eventsCount: Array.isArray(entry.events) ? entry.events.length : (Number(entry.eventsCount) || 0),
      servicesCount: Array.isArray(entry.services) ? entry.services.length : (Number(entry.servicesCount) || 0),
      hasAvailability: Boolean(entry.availability)
    };
  }
  return {
    reportStartDate: reportStartDate || null,
    reportEndDate: reportEndDate || null,
    equipmentData: slimEquipmentData,
    equipmentStatus: equipmentStatus && typeof equipmentStatus === "object" ? equipmentStatus : {}
  };
}
function parseCheckMKEventDate(event) {
  if (!event || typeof event !== "object") return null;
  const candidates = [event.timestamp, event.time, event.date, event.log_time];
  for (const raw of candidates) {
    if (raw == null || raw === "") continue;
    if (typeof raw === "number") {
      const ms = raw < 10000000000 ? raw * 1000 : raw;
      const date = new Date(ms);
      if (!Number.isNaN(date.getTime())) return date;
      continue;
    }
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const europeanMatch = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
      if (europeanMatch) {
        const [, day, month, year, hour, minute, second] = europeanMatch;
        const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
        if (!Number.isNaN(date.getTime())) return date;
      }
      const parsed = Date.parse(trimmed);
      if (!Number.isNaN(parsed)) return new Date(parsed);
    }
  }
  return null;
}
function getCheckMKEventServiceLabel(event) {
  return String(event?.service || event?.service_description || event?.display_name || event?.description || "").trim();
}
function getCheckMKEventMessage(event) {
  return String(event?.message || event?.plugin_output || event?.text || event?.output || "").trim();
}
export function isCheckMKNoiseEvent(event) {
  const service = getCheckMKEventServiceLabel(event);
  const message = getCheckMKEventMessage(event);
  const normalizedService = service.replace(/^\[+|\]+$/g, "").toLowerCase();
  if (normalizedService === "snmp" || normalizedService === "piggyback") {
    return true;
  }
  if (/^\[snmp\]/i.test(service) || /^\[piggyback\]/i.test(service)) {
    return true;
  }
  if (/^\[snmp\]/i.test(message) || /^\[piggyback\]/i.test(message)) {
    return true;
  }
  if (/^SNMP Error$/i.test(message) && /snmp/i.test(service)) {
    return true;
  }
  return false;
}
export function filterCheckMKNoiseEvents(events = []) {
  if (!Array.isArray(events)) return [];
  return events.filter(event => !isCheckMKNoiseEvent(event));
}
export function parseReportPeriodBounds(reportPeriod = {}) {
  const startRaw = reportPeriod?.start || reportPeriod?.startTime;
  const endRaw = reportPeriod?.end || reportPeriod?.endTime;
  if (!startRaw || !endRaw) return null;
  const start = new Date(startRaw);
  const end = new Date(endRaw);
  end.setHours(23, 59, 59, 999);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return {
    start,
    end
  };
}
export function filterCheckMKEventsForReportPeriod(events, reportPeriod, {
  criticalOnly = false
} = {}) {
  const bounds = parseReportPeriodBounds(reportPeriod);
  if (!bounds || !Array.isArray(events)) return Array.isArray(events) ? events : [];
  const filtered = events.filter(event => {
    const eventDate = parseCheckMKEventDate(event);
    if (!eventDate) return false;
    return eventDate >= bounds.start && eventDate <= bounds.end;
  });
  if (criticalOnly) {
    return filterCheckMKNoiseEvents(filtered.filter(event => Number(event?.state) === 2));
  }
  return filterCheckMKNoiseEvents(filtered);
}
export function deriveServicesFromPeriodEvents(events = []) {
  const byService = new Map();
  events.forEach(event => {
    if (isCheckMKNoiseEvent(event)) return;
    const name = event?.service || event?.service_description || event?.display_name || event?.description;
    if (!name) return;
    const state = typeof event.state === "number" ? event.state : Number(event.state) || 2;
    const previous = byService.get(name);
    if (!previous || state > previous.state) {
      byService.set(name, {
        description: name,
        display_name: name,
        state
      });
    }
  });
  return Array.from(byService.values());
}
export function filterCheckMKDisplayData(preLoadedData, reportPeriod) {
  if (!preLoadedData) return null;
  const periodEvents = filterCheckMKEventsForReportPeriod(preLoadedData.events, reportPeriod);
  const events = periodEvents.filter(event => Number(event?.state) === 2);
  const cachedServices = Array.isArray(preLoadedData.services) ? preLoadedData.services : [];
  const services = cachedServices.length > 0 ? cachedServices : deriveServicesFromPeriodEvents(periodEvents);
  return {
    ...preLoadedData,
    events,
    services
  };
}
