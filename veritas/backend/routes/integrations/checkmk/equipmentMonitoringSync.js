import express from 'express';
import fetch from 'node-fetch';
import { pool } from '../../../database/db.js';
import verifyJWT from '../../../middleware/auth.js';
const router = express.Router();
const TABLE = 'v_b_equipment_checkmk_monitoring';
const SYNC_MIN_INTERVAL_MS = 30 * 60 * 1000;
const RECENT_ALERT_DAYS = 7;
function getEventTimeMs(event) {
  const raw = event?.time ?? event?.log_time ?? event?.timestamp ?? event?.event_time ?? event?.created ?? null;
  if (raw == null) return null;
  const num = Number(raw);
  if (!Number.isNaN(num)) return num < 1e12 ? num * 1000 : num;
  const d = new Date(String(raw).trim().replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}
/** Unwrap CheckMK REST `{ type, value }` wrappers (and nested value objects). */
function unwrapCheckmkValue(raw) {
  let current = raw;
  for (let depth = 0; depth < 4; depth += 1) {
    if (current == null) return current;
    if (typeof current !== "object" || Array.isArray(current)) return current;
    if (!Object.prototype.hasOwnProperty.call(current, "value")) return current;
    current = current.value;
  }
  return current;
}

function parseEventStateRaw(rawState) {
  const unwrapped = unwrapCheckmkValue(rawState);
  if (typeof unwrapped === 'number') return unwrapped;
  if (typeof unwrapped === 'string') {
    const match = unwrapped.match(/\((OK|WARNING|CRITICAL|UNKNOWN)\)/i) || unwrapped.match(/\b(OK|WARNING|CRITICAL|UNKNOWN)\b/i);
    if (match) {
      const s = match[1].toUpperCase();
      if (s === 'OK') return 0;
      if (s === 'WARNING') return 1;
      if (s === 'CRITICAL') return 2;
      return 3;
    }
    const n = parseInt(unwrapped, 10);
    if (!Number.isNaN(n)) return n;
  }
  return 0;
}
function getEventStateNum(event) {
  if (typeof event?.state === 'number') return event.state;
  if (event?.state != null && typeof event.state !== 'number') return parseEventStateRaw(event.state);
  if (typeof event?.state_info === 'number') return event.state_info;
  if (event?.state_info != null) return parseEventStateRaw(event.state_info);
  if (Array.isArray(event)) return parseEventStateRaw(event[5]);
  if (event?.raw && Array.isArray(event.raw)) return parseEventStateRaw(event.raw[5]);
  return 0;
}
function isAlertEvent(event) {
  const state = getEventStateNum(event);
  return state === 1 || state === 2;
}
function serviceDisplayName(service) {
  return String(service?.title || service?.description || service?.id || service?.name || "").trim();
}
function eventServiceName(event) {
  return String(
    event?.service ||
      event?.log_service_description ||
      event?.service_description ||
      event?.serviceDescription ||
      ""
  ).trim();
}
function uniqueNonEmpty(values, limit = 3) {
  const out = [];
  const seen = new Set();
  for (const value of values) {
    const key = String(value || "").trim();
    if (!key) continue;
    const normalized = key.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(key);
    if (out.length >= limit) break;
  }
  return out;
}

/** Normalize CheckMK service/host state to 0=OK, 1=WARN, 2=CRIT, 3=UNKNOWN. */
function normalizeServiceStateNum(rawState) {
  const unwrapped = unwrapCheckmkValue(rawState);
  if (unwrapped == null || unwrapped === "") return null;
  if (typeof unwrapped === "number" && Number.isFinite(unwrapped)) {
    if (unwrapped >= 0 && unwrapped <= 3) return unwrapped;
    return null;
  }
  const asString = String(unwrapped).trim();
  if (!asString) return null;
  const asInt = Number(asString);
  if (Number.isFinite(asInt) && asInt >= 0 && asInt <= 3 && String(Math.trunc(asInt)) === asString) {
    return Math.trunc(asInt);
  }
  const match =
    asString.match(/\((OK|WARN(?:ING)?|CRIT(?:ICAL)?|UNKNOWN|UP|DOWN|UNREACH)\)/i) ||
    asString.match(/\b(OK|WARN(?:ING)?|CRIT(?:ICAL)?|UNKNOWN|UP|DOWN|UNREACH(?:ABLE)?)\b/i);
  if (match) {
    const token = match[1].toUpperCase();
    if (token === "OK" || token === "UP") return 0;
    if (token === "WARN" || token === "WARNING") return 1;
    if (token === "CRIT" || token === "CRITICAL" || token === "DOWN" || token === "UNREACH" || token === "UNREACHABLE") {
      return 2;
    }
    return 3;
  }
  return parseEventStateRaw(unwrapped);
}

function getServiceStateNum(service) {
  const candidates = [
    service?.state,
    service?.state_num,
    service?.hard_state,
    service?.soft_state,
    service?.extensions?.state,
    service?.attributes?.state,
    Array.isArray(service?.raw) ? service.raw[1] : null
  ];
  for (const candidate of candidates) {
    const n = normalizeServiceStateNum(candidate);
    if (n != null) return n;
  }
  return 3;
}

function toFiniteCount(raw) {
  const unwrapped = unwrapCheckmkValue(raw);
  const n = Number(unwrapped);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function resolveHostDetails(monitoringData, hostDetails = null) {
  return hostDetails
    || monitoringData?.hostDetails
    || monitoringData?.host_details
    || monitoringData?.host
    || null;
}

export function computeMonitoringSummary(monitoringData, lastSyncedAt, hostDetails = null) {
  if (!monitoringData || typeof monitoringData !== 'object') {
    return {
      status: 'no_data',
      critServices: 0,
      warnServices: 0,
      recentAlerts: 0,
      recentCritAlerts: 0,
      recentWarnAlerts: 0,
      primaryService: null,
      failingServices: [],
      lastSyncedAt: lastSyncedAt || null
    };
  }
  const servicesRaw = monitoringData?.services?.services ?? monitoringData?.services;
  const services = Array.isArray(servicesRaw) ? servicesRaw : [];
  const eventsRaw = monitoringData?.events?.events ?? monitoringData?.events;
  const events = Array.isArray(eventsRaw) ? eventsRaw : [];
  const critServiceRows = services.filter(s => getServiceStateNum(s) === 2);
  const warnServiceRows = services.filter(s => getServiceStateNum(s) === 1);
  let critServices = critServiceRows.length;
  let warnServices = warnServiceRows.length;
  const cutoff = Date.now() - RECENT_ALERT_DAYS * 24 * 60 * 60 * 1000;
  const recentAlertEvents = events.filter(e => {
    if (!isAlertEvent(e)) return false;
    const t = getEventTimeMs(e);
    return t != null && t >= cutoff;
  });
  const recentCritAlerts = recentAlertEvents.filter(e => getEventStateNum(e) === 2).length;
  const recentWarnAlerts = recentAlertEvents.filter(e => getEventStateNum(e) === 1).length;
  const host = resolveHostDetails(monitoringData, hostDetails);
  const serviceStats = host?.serviceStats || host?.service_stats || null;
  const hostCritCount = toFiniteCount(serviceStats?.crit ?? serviceStats?.num_services_crit);
  const hostWarnCount = toFiniteCount(serviceStats?.warn ?? serviceStats?.num_services_warn);
  if (critServices === 0 && hostCritCount > 0) critServices = hostCritCount;
  if (warnServices === 0 && hostWarnCount > 0) warnServices = hostWarnCount;
  const hostWorstRaw =
    serviceStats?.worstState ??
    serviceStats?.worst_service_state ??
    host?.worst_service_state ??
    host?.worstServiceState ??
    host?.worst_state ??
    null;
  const hostWorst = normalizeServiceStateNum(hostWorstRaw);
  let status = 'ok';
  if (critServices > 0 || recentCritAlerts > 0 || hostWorst === 2) status = 'critical';
  else if (warnServices > 0 || recentWarnAlerts > 0 || hostWorst === 1) status = 'warning';
  let failingServices = uniqueNonEmpty(
    (critServiceRows.length ? critServiceRows : warnServiceRows).map(serviceDisplayName)
  );
  if (!failingServices.length && recentAlertEvents.length) {
    const preferredEvents = status === 'critical'
      ? recentAlertEvents.filter(e => getEventStateNum(e) === 2)
      : recentAlertEvents.filter(e => getEventStateNum(e) === 1);
    const sourceEvents = preferredEvents.length ? preferredEvents : recentAlertEvents;
    failingServices = uniqueNonEmpty(
      [...sourceEvents]
        .sort((a, b) => (getEventTimeMs(b) || 0) - (getEventTimeMs(a) || 0))
        .map(eventServiceName)
    );
  }
  return {
    status,
    critServices,
    warnServices,
    recentAlerts: recentAlertEvents.length,
    recentCritAlerts,
    recentWarnAlerts,
    primaryService: failingServices[0] || null,
    failingServices,
    lastSyncedAt: lastSyncedAt || null
  };
}

/**
 * Count CheckMK events + notifications within the last N days (integration supervision history).
 */
export function countCheckmkHistoryLastDays(monitoringData, days = 30) {
  if (!monitoringData || typeof monitoringData !== 'object') {
    return {
      events: 0,
      notifications: 0,
      total: 0
    };
  }
  const sinceDays = Math.min(Math.max(Number(days) || 30, 1), 365);
  const cutoff = Date.now() - sinceDays * 24 * 60 * 60 * 1000;
  const events = Array.isArray(monitoringData?.events?.events) ? monitoringData.events.events : [];
  const notifications = Array.isArray(monitoringData?.notifications?.notifications)
    ? monitoringData.notifications.notifications
    : Array.isArray(monitoringData?.notifications?.events)
      ? monitoringData.notifications.events
      : [];
  const inWindow = item => {
    const t = getEventTimeMs(item);
    return t != null && t >= cutoff;
  };
  const eventsCount = events.filter(inWindow).length;
  const notificationsCount = notifications.filter(inWindow).length;
  return {
    events: eventsCount,
    notifications: notificationsCount,
    total: eventsCount + notificationsCount
  };
}

/**
 * Flatten recent CheckMK events/notifications for equipment alert history.
 */
export function listCheckmkHistoryItems(monitoringData, {
  days = 30,
  limit = 50
} = {}) {
  if (!monitoringData || typeof monitoringData !== 'object') return [];
  const sinceDays = Math.min(Math.max(Number(days) || 30, 1), 365);
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const cutoff = Date.now() - sinceDays * 24 * 60 * 60 * 1000;
  const events = Array.isArray(monitoringData?.events?.events) ? monitoringData.events.events : [];
  const notifications = Array.isArray(monitoringData?.notifications?.notifications)
    ? monitoringData.notifications.notifications
    : Array.isArray(monitoringData?.notifications?.events)
      ? monitoringData.notifications.events
      : [];
  const items = [];
  for (const event of events) {
    const t = getEventTimeMs(event);
    if (t == null || t < cutoff) continue;
    const state = getEventStateNum(event);
    const severity = state === 2 ? 'critical' : state === 1 ? 'warning' : 'info';
    const title = event?.description || event?.plugin_output || event?.service_description
      || event?.text || event?.message || event?.host_name || 'CheckMK event';
    items.push({
      id: `ckmk-evt-${t}-${String(title).slice(0, 40)}`,
      source: 'checkmk',
      kind: 'event',
      title: String(title),
      subtitle: event?.service_description || event?.host_name || null,
      typeKey: 'checkmk_event',
      typeKind: 'label',
      domain: 'devices',
      criterionKey: null,
      eventType: 'checkmk_event',
      severity,
      status: 'open',
      at: new Date(t).toISOString(),
      ticketId: null
    });
  }
  for (const notif of notifications) {
    const t = getEventTimeMs(notif);
    if (t == null || t < cutoff) continue;
    const state = getEventStateNum(notif);
    const severity = state === 2 ? 'critical' : state === 1 ? 'warning' : 'info';
    const title = notif?.description || notif?.plugin_output || notif?.service_description
      || notif?.text || notif?.message || notif?.host_name || 'CheckMK notification';
    items.push({
      id: `ckmk-notif-${t}-${String(title).slice(0, 40)}`,
      source: 'checkmk',
      kind: 'notification',
      title: String(title),
      subtitle: notif?.service_description || notif?.host_name || null,
      typeKey: 'checkmk_notification',
      typeKind: 'label',
      domain: 'devices',
      criterionKey: null,
      eventType: 'checkmk_notification',
      severity,
      status: 'open',
      at: new Date(t).toISOString(),
      ticketId: null
    });
  }
  items.sort((a, b) => {
    const ta = a.at ? new Date(a.at).getTime() : 0;
    const tb = b.at ? new Date(b.at).getTime() : 0;
    return tb - ta;
  });
  return items.slice(0, lim);
}
const INTERNAL_BASE = `http://127.0.0.1:${process.env.PORT || 3001}`;
const EQUIPMENT_FAMILY_TABLES = {
  servers: 'v_b_clients_m_servers',
  stockage: 'v_b_clients_m_stockage',
  nas: 'v_b_clients_m_stockage',
  firewall: 'v_b_clients_m_firewall',
  switch: 'v_b_clients_m_switch',
  wifi: 'v_b_clients_m_wifi',
  alimentation: 'v_b_clients_m_alimentation',
  routeur: 'v_b_clients_m_routeur',
  toip: 'v_b_clients_m_toip',
  internet: 'v_b_clients_m_internet'
};
async function internalCheckMKGet(req, path, query = {}) {
  const url = new URL(`${INTERNAL_BASE}/api/checkmk${path}`);
  for (const [k, v] of Object.entries(query)) {
    if (v != null && v !== '') url.searchParams.set(k, String(v));
  }
  const headers = {
    Accept: 'application/json'
  };
  if (req.headers.cookie) headers.Cookie = req.headers.cookie;
  if (req.headers.authorization) headers.Authorization = req.headers.authorization;
  const res = await fetch(url.toString(), {
    headers
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.warn(`[checkmk equipment-sync] ${path} → ${res.status}: ${text.slice(0, 150)}`);
    return null;
  }
  return res.json();
}
function getAvailabilityPeriodRange(periodKey) {
  const endTime = new Date();
  endTime.setHours(23, 59, 59, 999);
  const startTime = new Date(endTime);
  if (periodKey === '1m') startTime.setMonth(startTime.getMonth() - 1);else if (periodKey === '3m') startTime.setMonth(startTime.getMonth() - 3);else if (periodKey === '1y') startTime.setFullYear(startTime.getFullYear() - 1);
  startTime.setHours(0, 0, 0, 0);
  return {
    startTime,
    endTime
  };
}
function eventDedupeKey(event) {
  if (event?.id != null && event.id !== '') return `id:${event.id}`;
  if (event?.event_id != null) return `eid:${event.event_id}`;
  const t = event?.time ?? event?.timestamp ?? event?.log_time ?? '';
  const svc = event?.service ?? event?.log_service_description ?? '';
  const msg = event?.message ?? event?.event_text ?? event?.plugin_output ?? '';
  return `t:${t}|s:${svc}|m:${String(msg).slice(0, 80)}`;
}
function mergeEventLists(existing = [], incoming = []) {
  const map = new Map();
  for (const e of existing) map.set(eventDedupeKey(e), e);
  for (const e of incoming) map.set(eventDedupeKey(e), e);
  return [...map.values()];
}
function rowToResponse(row, availabilityPeriod = '1m') {
  if (!row) return null;
  const monitoringData = row.monitoring_data || {};
  const availabilityByPeriod = monitoringData.availabilityByPeriod || {};
  return {
    equipmentId: row.equipment_id,
    clientId: row.client_id,
    equipmentFamily: row.equipment_family,
    checkmkHostName: row.checkmk_host_name,
    checkmkSite: row.checkmk_site,
    lastSyncedAt: row.last_synced_at,
    hostDetails: row.host_details || null,
    checkmkData: {
      services: monitoringData.services || null,
      events: monitoringData.events || null,
      availability: availabilityByPeriod[availabilityPeriod] ?? monitoringData.availability ?? null,
      hostEventsDetailed: monitoringData.hostEventsDetailed || null,
      notifications: monitoringData.notifications || null,
      availabilityByPeriod
    },
    availabilityByPeriod
  };
}
async function getStoredMonitoring(equipmentId) {
  const r = await pool.query(`SELECT * FROM ${TABLE} WHERE equipment_id = $1::uuid`, [equipmentId]);
  return r.rows[0] || null;
}
async function verifyEquipmentMapping(equipmentId, clientId, family, hostName) {
  const table = EQUIPMENT_FAMILY_TABLES[family];
  if (!table) return false;
  try {
    const r = await pool.query(
      `SELECT id FROM ${table}
        WHERE id = $1::uuid AND client_id = $2
          AND NULLIF(TRIM(COALESCE(
            checkmk_host_name,
            data->>'checkmk_host_name',
            data->'checkmkMapping'->>'checkmk_host_name',
            ''
          )), '') = $3
        LIMIT 1`,
      [equipmentId, clientId, hostName]
    );
    return r.rows.length > 0;
  } catch (err) {
    if (err?.code !== '42703') throw err;
    const fallback = await pool.query(
      `SELECT id FROM ${table}
        WHERE id = $1::uuid AND client_id = $2
          AND NULLIF(TRIM(COALESCE(
            data->>'checkmk_host_name',
            data->'checkmkMapping'->>'checkmk_host_name',
            ''
          )), '') = $3
        LIMIT 1`,
      [equipmentId, clientId, hostName]
    );
    return fallback.rows.length > 0;
  }
}
async function fetchAndMergeCheckMKData(req, {
  hostName,
  site,
  existingMonitoringData,
  incrementalFrom
}) {
  const now = new Date();
  const eventsEndTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const eventsStartTime = incrementalFrom ? new Date(new Date(incrementalFrom).getTime() - 24 * 60 * 60 * 1000) : (() => {
    const d = new Date(eventsEndTime);
    d.setFullYear(d.getFullYear() - 10);
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  const siteParam = site || null;
  const queryBase = {
    site: siteParam
  };
  const [services, events, hostDetails, hostEventsDetailed, notifications, avail1m, avail3m, avail1y] = await Promise.all([internalCheckMKGet(req, `/services/${encodeURIComponent(hostName)}`, {
    ...queryBase,
    start_time: eventsStartTime.toISOString(),
    end_time: eventsEndTime.toISOString()
  }), internalCheckMKGet(req, `/events-period/${encodeURIComponent(hostName)}`, {
    ...queryBase,
    start_time: eventsStartTime.toISOString(),
    end_time: eventsEndTime.toISOString()
  }), internalCheckMKGet(req, `/host/${encodeURIComponent(hostName)}`, queryBase), internalCheckMKGet(req, `/host-events/${encodeURIComponent(hostName)}`, {
    ...queryBase,
    start_time: eventsStartTime.toISOString(),
    end_time: eventsEndTime.toISOString()
  }), internalCheckMKGet(req, `/notifications/${encodeURIComponent(hostName)}`, {
    ...queryBase,
    start_time: eventsStartTime.toISOString(),
    end_time: eventsEndTime.toISOString()
  }), (async () => {
    const {
      startTime,
      endTime
    } = getAvailabilityPeriodRange('1m');
    const data = await internalCheckMKGet(req, `/availability-table/${encodeURIComponent(hostName)}`, {
      ...queryBase,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString()
    });
    return data?.availability ?? null;
  })(), (async () => {
    const {
      startTime,
      endTime
    } = getAvailabilityPeriodRange('3m');
    const data = await internalCheckMKGet(req, `/availability-table/${encodeURIComponent(hostName)}`, {
      ...queryBase,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString()
    });
    return data?.availability ?? null;
  })(), (async () => {
    const {
      startTime,
      endTime
    } = getAvailabilityPeriodRange('1y');
    const data = await internalCheckMKGet(req, `/availability-table/${encodeURIComponent(hostName)}`, {
      ...queryBase,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString()
    });
    return data?.availability ?? null;
  })()]);
  const prev = existingMonitoringData || {};
  const mergedEvents = events ? {
    ...events,
    events: mergeEventLists(prev.events?.events || [], events.events || []),
    events_count: mergeEventLists(prev.events?.events || [], events.events || []).length
  } : prev.events || null;
  const mergedHostEvents = hostEventsDetailed ? {
    ...hostEventsDetailed,
    events: mergeEventLists(prev.hostEventsDetailed?.events || [], hostEventsDetailed.events || []),
    events_count: mergeEventLists(prev.hostEventsDetailed?.events || [], hostEventsDetailed.events || []).length
  } : prev.hostEventsDetailed || null;
  const incomingNotifications = notifications?.notifications || notifications?.events || [];
  const mergedNotificationsList = mergeEventLists(prev.notifications?.notifications || prev.notifications?.events || [], incomingNotifications);
  const mergedNotifications = notifications || prev.notifications ? {
    ...(notifications || prev.notifications || {}),
    notifications: mergedNotificationsList,
    events: mergedNotificationsList,
    notifications_count: mergedNotificationsList.length,
    events_count: mergedNotificationsList.length,
    last_notification: mergedNotificationsList[0] || null,
    last_notification_timestamp: mergedNotificationsList[0]?.timestamp || null
  } : prev.notifications || null;
  const availabilityByPeriod = {
    ...(prev.availabilityByPeriod || {}),
    ...(avail1m != null ? {
      '1m': avail1m
    } : {}),
    ...(avail3m != null ? {
      '3m': avail3m
    } : {}),
    ...(avail1y != null ? {
      '1y': avail1y
    } : {})
  };
  return {
    monitoringData: {
      services: services || prev.services || null,
      events: mergedEvents,
      hostEventsDetailed: mergedHostEvents,
      notifications: mergedNotifications,
      availabilityByPeriod,
      availability: availabilityByPeriod['1m'] ?? prev.availability ?? null
    },
    hostDetails: hostDetails || prev.hostDetails || null
  };
}
export async function runEquipmentMonitoringSync(req, {
  equipmentId,
  clientId,
  family,
  hostName,
  site,
  force = false,
  availabilityPeriod = '1m'
}) {
  if (!equipmentId || !clientId || !family || !hostName) {
    throw new Error('Missing parameters: equipmentId, clientId, family, hostName are required.');
  }
  const isMapped = await verifyEquipmentMapping(equipmentId, clientId, family, hostName);
  if (!isMapped) {
    throw new Error('Equipment not found or not mapped to this CheckMK host.');
  }
  const existing = await getStoredMonitoring(equipmentId);
  if (!force && existing?.last_synced_at) {
    const lastSyncMs = new Date(existing.last_synced_at).getTime();
    if (!Number.isNaN(lastSyncMs) && Date.now() - lastSyncMs < SYNC_MIN_INTERVAL_MS) {
      return {
        ...rowToResponse(existing, availabilityPeriod),
        skipped: true,
        message: 'Recent synchronization (< 30 min), using database data.'
      };
    }
  }
  const {
    monitoringData,
    hostDetails
  } = await fetchAndMergeCheckMKData(req, {
    hostName,
    site,
    existingMonitoringData: existing?.monitoring_data || {},
    incrementalFrom: existing?.last_synced_at || null
  });
  const nowIso = new Date().toISOString();
  if (existing) {
    await pool.query(`UPDATE ${TABLE}
       SET monitoring_data = $1::jsonb,
           host_details = $2::jsonb,
           checkmk_host_name = $3,
           checkmk_site = $4,
           last_synced_at = $5::timestamptz,
           updated_at = NOW()
       WHERE equipment_id = $6::uuid`, [JSON.stringify(monitoringData), hostDetails ? JSON.stringify(hostDetails) : null, hostName, site || null, nowIso, equipmentId]);
  } else {
    await pool.query(`INSERT INTO ${TABLE}
         (equipment_id, client_id, equipment_family, checkmk_host_name, checkmk_site,
          monitoring_data, host_details, last_synced_at)
       VALUES ($1::uuid, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::timestamptz)`, [equipmentId, clientId, family, hostName, site || null, JSON.stringify(monitoringData), hostDetails ? JSON.stringify(hostDetails) : null, nowIso]);
  }
  const updated = await getStoredMonitoring(equipmentId);
  const summary = computeMonitoringSummary(monitoringData, nowIso, hostDetails || updated?.host_details || null);
  evaluateMonitoringAlert({
    clientId,
    equipmentId,
    equipmentFamily: family,
    equipmentName: hostName,
    monitorStatus: summary.status,
    source: "checkmk",
    details: summary
  }).catch(err => {
    console.error("[checkmk] evaluateMonitoringAlert:", err.message);
  });
  return {
    ...rowToResponse(updated, availabilityPeriod),
    skipped: false,
    message: 'Synchronization completed.'
  };
}
router.post('/equipment-monitoring/summaries', verifyJWT, async (req, res) => {
  try {
    const {
      clientId,
      equipmentIds
    } = req.body || {};
    let rows = [];
    if (clientId != null) {
      const r = await pool.query(`SELECT equipment_id, monitoring_data, host_details, last_synced_at FROM ${TABLE} WHERE client_id = $1`, [clientId]);
      rows = r.rows;
    } else if (Array.isArray(equipmentIds) && equipmentIds.length > 0) {
      const r = await pool.query(`SELECT equipment_id, monitoring_data, host_details, last_synced_at FROM ${TABLE} WHERE equipment_id = ANY($1::uuid[])`, [equipmentIds]);
      rows = r.rows;
    } else {
      return res.json({
        summaries: {}
      });
    }
    const summaries = {};
    for (const row of rows) {
      summaries[row.equipment_id] = computeMonitoringSummary(row.monitoring_data, row.last_synced_at, row.host_details || null);
    }
    res.json({
      summaries
    });
  } catch (err) {
    console.error('POST /checkmk/equipment-monitoring/summaries:', err);
    res.status(500).json({
      error: err.message || 'Error reading monitoring summaries'
    });
  }
});
router.get('/equipment-monitoring/:equipmentId', verifyJWT, async (req, res) => {
  try {
    const {
      equipmentId
    } = req.params;
    const availabilityPeriod = req.query.availability_period || '1m';
    const row = await getStoredMonitoring(equipmentId);
    if (!row) {
      return res.json({
        equipmentId,
        lastSyncedAt: null,
        checkmkData: null,
        hostDetails: null,
        availabilityByPeriod: {}
      });
    }
    res.json(rowToResponse(row, availabilityPeriod));
  } catch (err) {
    console.error('GET /checkmk/equipment-monitoring:', err);
    res.status(500).json({
      error: err.message || 'Error reading monitoring data'
    });
  }
});
router.post('/equipment-monitoring/sync', verifyJWT, async (req, res) => {
  try {
    const {
      equipmentId,
      clientId,
      family,
      hostName,
      site,
      force = false,
      availabilityPeriod = '1m'
    } = req.body || {};
    const result = await runEquipmentMonitoringSync(req, {
      equipmentId,
      clientId,
      family,
      hostName,
      site,
      force: force === true || force === 'true' || force === 1,
      availabilityPeriod
    });
    res.json(result);
  } catch (err) {
    console.error('POST /checkmk/equipment-monitoring/sync:', err);
    const msg = err.message || 'Error during synchronization';
    if (msg.includes('not found') || msg.includes('not mapped')) {
      return res.status(404).json({
        error: msg
      });
    }
    if (msg.includes('Missing parameters')) {
      return res.status(400).json({
        error: msg
      });
    }
    res.status(500).json({
      error: msg
    });
  }
});
export default router;
