import { pool } from "../database/db.js";
import { fetchMonitorableEquipmentStats, SYSTEM_MONITORABLE_FAMILIES } from "../utils/monitorableEquipmentStats.js";
import { listContractModuleOptions } from "../utils/contractModuleOptions.js";
import { hasSatisfactionTable } from "./ticketSatisfactionService.js";
import { computeMonitoringSummary } from "../routes/integrations/checkmk/equipmentMonitoringSync.js";
import { parseClientSla } from "../utils/ticketSla.js";
const CLOSED_STATUSES = "('resolved', 'closed')";
const FIRST_TAKEOVER_SUBQUERY = `(SELECT h.created_at
  FROM v_b_ticket_status_history h
  WHERE h.ticket_id = t.id
    AND LOWER(COALESCE(h.old_status, '')) IN ('new', 'open', '')
    AND LOWER(COALESCE(h.new_status, '')) NOT IN ('new', 'open', '')
  ORDER BY h.created_at ASC
  LIMIT 1)`;
const TICKET_TYPE_LABELS = {
  incident: "Incident",
  demande: "Request",
  probleme: "Problem",
  changement: "Change"
};
const TICKET_STATUS_LABELS = {
  new: "New",
  open: "Open",
  pending: "Pending",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed"
};
const TICKET_PRIORITY_LABELS = {
  urgent: "Urgent",
  high: "High",
  normal: "Normal",
  low: "Low",
  critical: "Critical"
};
const EVENT_TYPE_LABELS = {
  intervention: "Intervention",
  presentation: "Presentation",
  maintenance_preventive: "Preventive maintenance",
  maintenance: "Maintenance",
  mise_a_jour: "Update",
  conge: "Leave",
  integration_monitoring: "Monitoring integration",
  campagne: "Campaign",
  other: "Other"
};
function parsePeriodStart(period) {
  const now = new Date();
  switch (String(period || "365d").toLowerCase()) {
    case "7d":
      return new Date(now.getTime() - 7 * 86400000);
    case "30d":
      return new Date(now.getTime() - 30 * 86400000);
    case "90d":
      return new Date(now.getTime() - 90 * 86400000);
    case "365d":
      return new Date(now.getTime() - 365 * 86400000);
    case "ytd":
      return new Date(now.getFullYear(), 0, 1);
    case "all":
      return null;
    default:
      return new Date(now.getTime() - 365 * 86400000);
  }
}
function parseIsoDate(value, label) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const err = new Error(`Invalid date (${label})`);
    err.code = "INVALID_DATE_RANGE";
    throw err;
  }
  return date.toISOString();
}
export function resolveDashboardDateRange({
  period,
  startAt,
  endAt
} = {}) {
  const hasCustom = Boolean(startAt || endAt);
  if (hasCustom) {
    const sinceIso = parseIsoDate(startAt, "start");
    const untilIso = parseIsoDate(endAt, "end");
    if (sinceIso && untilIso && new Date(sinceIso) > new Date(untilIso)) {
      const err = new Error("The start date must be before the end date.");
      err.code = "INVALID_DATE_RANGE";
      throw err;
    }
    return {
      period: "custom",
      sinceIso,
      untilIso
    };
  }
  const normalizedPeriod = String(period || "365d").toLowerCase();
  const since = parsePeriodStart(normalizedPeriod);
  return {
    period: normalizedPeriod,
    sinceIso: since ? since.toISOString() : null,
    untilIso: normalizedPeriod === "all" ? null : new Date().toISOString()
  };
}
function buildRangeClause(params, column, sinceIso, untilIso) {
  let clause = "";
  if (sinceIso) {
    params.push(sinceIso);
    clause += ` AND ${column} >= $${params.length}`;
  }
  if (untilIso) {
    params.push(untilIso);
    clause += ` AND ${column} <= $${params.length}`;
  }
  return clause;
}
export function parseDashboardEntityFilters(input = {}) {
  const agentId = String(input.agentId || "").trim() || null;
  const clientRaw = input.clientId;
  const contactRaw = input.contactId;
  const clientId = clientRaw != null && clientRaw !== "" && Number.isFinite(Number(clientRaw)) ? Number(clientRaw) : null;
  const contactId = contactRaw != null && contactRaw !== "" && Number.isFinite(Number(contactRaw)) ? Number(contactRaw) : null;
  return {
    agentId,
    clientId,
    contactId
  };
}
function hasEntityFilters(filters = {}) {
  return Boolean(filters.agentId || filters.clientId || filters.contactId);
}
function buildTicketScopeClause(params, filters = {}, alias = "t") {
  let clause = "";
  if (filters.agentId) {
    params.push(filters.agentId);
    clause += ` AND ${alias}.assigned_user_id = $${params.length}::uuid`;
  }
  if (filters.clientId) {
    params.push(filters.clientId);
    clause += ` AND ${alias}.client_id = $${params.length}`;
  }
  if (filters.contactId) {
    params.push(filters.contactId);
    clause += ` AND ${alias}.requester_contact_id = $${params.length}`;
  }
  return clause;
}
function buildEventScopeClause(params, filters = {}, alias = "e") {
  let clause = "";
  if (filters.agentId) {
    params.push(filters.agentId);
    clause += ` AND COALESCE(${alias}.assigned_user_id, ${alias}.user_id) = $${params.length}::uuid`;
  }
  if (filters.clientId) {
    params.push(filters.clientId);
    clause += ` AND ${alias}.client_id = $${params.length}`;
  }
  if (filters.contactId) {
    params.push(filters.contactId);
    clause += ` AND (
      ${alias}.client_id IN (SELECT l.client_id FROM v_b_contact_client_links l WHERE l.contact_id = $${params.length})
      OR ${alias}.client_id = (SELECT c.client_id FROM v_b_contacts c WHERE c.id = $${params.length})
    )`;
  }
  return clause;
}
function round1(value) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return Math.round(Number(value) * 10) / 10;
}
function roundPct(value) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return Math.round(Number(value));
}
function toIsoDate(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function formatUserLabel(email, username) {
  const name = String(username || "").trim();
  if (name) return name;
  const local = String(email || "").split("@")[0];
  return local || "Agent";
}
function formatContactLabel(row) {
  const fullName = [row.prenom, row.nom].filter(Boolean).join(" ").trim();
  const company = String(row.client_name || "").trim();
  if (fullName && company) return `${fullName} · ${company}`;
  return fullName || row.email || "Contact";
}
function mapCountRows(rows, labelMap = {}) {
  return (rows || []).map(row => {
    const key = String(row.key || row.status || row.priority || row.type || row.category || "").trim();
    const label = labelMap[key] || labelMap[key.toLowerCase()] || key || "Other";
    return {
      key: key || "other",
      label,
      count: Number(row.count) || 0
    };
  });
}
function buildTrend(rows) {
  return (rows || []).map(row => ({
    period: row.period,
    count: Number(row.count) || 0
  }));
}
function buildWeekdayTrend(rows) {
  const byDay = new Map((rows || []).map(row => [Number(row.period), Number(row.count) || 0]));
  return [1, 2, 3, 4, 5, 6, 7].map(day => ({
    period: day,
    count: byDay.get(day) || 0
  }));
}
function buildMonthOfYearTrend(rows) {
  const byMonth = new Map((rows || []).map(row => [Number(row.period), Number(row.count) || 0]));
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => ({
    period: month,
    count: byMonth.get(month) || 0
  }));
}
function buildYearlyTrend(rows) {
  const items = (rows || []).map(row => ({
    period: Number(row.period),
    count: Number(row.count) || 0
  })).filter(row => Number.isFinite(row.period)).sort((a, b) => a.period - b.period);
  if (!items.length) return [];
  const byYear = new Map(items.map(row => [row.period, row.count]));
  const filled = [];
  for (let year = items[0].period; year <= items[items.length - 1].period; year += 1) {
    filled.push({
      period: year,
      count: byYear.get(year) || 0
    });
  }
  return filled;
}
async function tableExists(tableName) {
  const result = await pool.query(`SELECT to_regclass($1) IS NOT NULL AS ok`, [tableName]);
  return Boolean(result.rows[0]?.ok);
}
function previousDateRange(sinceIso, untilIso) {
  if (!sinceIso) {
    return {
      sinceIso: null,
      untilIso: null
    };
  }
  const until = untilIso ? new Date(untilIso) : new Date();
  const since = new Date(sinceIso);
  const span = Math.max(until.getTime() - since.getTime(), 24 * 3600 * 1000);
  return {
    sinceIso: new Date(since.getTime() - span).toISOString(),
    untilIso: sinceIso
  };
}
function trendTruncUnit(sinceIso, untilIso) {
  if (!sinceIso || !untilIso) return "week";
  const days = (new Date(untilIso).getTime() - new Date(sinceIso).getTime()) / 86400000;
  if (days <= 21) return "day";
  if (days <= 120) return "week";
  return "month";
}
function pctChange(current, previous) {
  const cur = Number(current) || 0;
  const prev = Number(previous);
  if (!Number.isFinite(prev) || prev === 0) return cur > 0 ? 100 : 0;
  return round1((cur - prev) / prev * 100);
}
const SLA_ENABLED = `COALESCE((t.sla_info->>'enabled')::boolean, false)`;
const SLA_RES_DUE = `NULLIF(t.sla_info->>'resolutionDueAt', '')::timestamptz`;
const SLA_FR_BREACHED = `COALESCE((t.sla_info->>'firstResponseBreached')::boolean, false)`;
const FIRST_RESPONSE_HOURS = `EXTRACT(EPOCH FROM (${FIRST_TAKEOVER_SUBQUERY} - t.created_at)) / 3600.0`;
const RESOLUTION_HOURS = `EXTRACT(EPOCH FROM (COALESCE(t.closed_at, t.resolved_at) - t.created_at)) / 3600.0`;
async function fetchSupportCockpitStats({
  sinceIso,
  untilIso,
  filters = {}
}) {
  const params = [];
  const createdClause = buildRangeClause(params, "t.created_at", sinceIso, untilIso);
  const resolvedClause = buildRangeClause(params, "COALESCE(t.closed_at, t.resolved_at)", sinceIso, untilIso);
  const historyClause = buildRangeClause(params, "h.created_at", sinceIso, untilIso);
  const activityClause = buildRangeClause(params, "a.created_at", sinceIso, untilIso);
  const scopeClause = buildTicketScopeClause(params, filters, "t");
  const prev = previousDateRange(sinceIso, untilIso);
  const prevParams = [];
  const prevCreatedClause = buildRangeClause(prevParams, "t.created_at", prev.sinceIso, prev.untilIso);
  const prevScopeClause = buildTicketScopeClause(prevParams, filters, "t");
  const trunc = trendTruncUnit(sinceIso, untilIso);
  const truncSql = trunc === "day" ? "day" : trunc === "month" ? "month" : "week";
  const openParams = [];
  const openScope = buildTicketScopeClause(openParams, filters, "t");
  const hasActivity = await tableExists("public.v_b_ticket_activity");
  const [volumeResult, prevVolumeResult, backlogResult, timingResult, slaResult, slaByPriorityResult, slaClientsResult, createdResolvedResult, dailyResult, weeklyResult, monthlyCreatedResult, monthlyResolvedResult, reopenResult, reopenByCategoryResult, transferredResult, cancelledResult, categoryDetailResult, clientDetailResult, prevClientResult, agentDetailResult, weekdayResult, monthOfYearResult, yearlyResult] = await Promise.all([pool.query(`SELECT
         COUNT(*)::int AS created,
         COUNT(*) FILTER (WHERE t.status IN ${CLOSED_STATUSES})::int AS closed,
         COUNT(DISTINCT t.assigned_user_id) FILTER (WHERE t.assigned_user_id IS NOT NULL)::int AS technicians
       FROM v_b_tickets t
       WHERE 1=1${createdClause}${scopeClause}`, params), pool.query(`SELECT
         COUNT(*)::int AS created,
         COUNT(*) FILTER (WHERE t.status IN ${CLOSED_STATUSES})::int AS closed
       FROM v_b_tickets t
       WHERE 1=1${prevCreatedClause}${prevScopeClause}`, prevParams), pool.query(`SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE t.created_at <= NOW() - INTERVAL '7 days')::int AS over7,
         COUNT(*) FILTER (WHERE t.created_at <= NOW() - INTERVAL '30 days')::int AS over30,
         COUNT(*) FILTER (WHERE t.created_at <= NOW() - INTERVAL '90 days')::int AS over90,
         AVG(EXTRACT(EPOCH FROM (NOW() - t.created_at)) / 86400.0) AS avg_age_days
       FROM v_b_tickets t
       WHERE t.status NOT IN ${CLOSED_STATUSES}${openScope}`, openParams), pool.query(`WITH responses AS (
         SELECT ${FIRST_RESPONSE_HOURS} AS hours
         FROM v_b_tickets t
         WHERE ${FIRST_TAKEOVER_SUBQUERY} IS NOT NULL${createdClause}${scopeClause}
       ), resolutions AS (
         SELECT ${RESOLUTION_HOURS} AS hours
         FROM v_b_tickets t
         WHERE t.status IN ${CLOSED_STATUSES}
           AND COALESCE(t.closed_at, t.resolved_at) IS NOT NULL${resolvedClause}${scopeClause}
       )
       SELECT
         (SELECT AVG(hours) FROM responses) AS fr_avg,
         (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY hours) FROM responses) AS fr_median,
         (SELECT percentile_cont(0.9) WITHIN GROUP (ORDER BY hours) FROM responses) AS fr_p90,
         (SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY hours) FROM responses) AS fr_p95,
         (SELECT AVG(hours) FROM resolutions) AS res_avg,
         (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY hours) FROM resolutions) AS res_median,
         (SELECT percentile_cont(0.9) WITHIN GROUP (ORDER BY hours) FROM resolutions) AS res_p90`, params), pool.query(`SELECT
         COUNT(*) FILTER (WHERE ${SLA_ENABLED})::int AS sla_tickets,
         COUNT(*) FILTER (WHERE ${SLA_ENABLED} AND t.status IN ${CLOSED_STATUSES} AND NOT ${SLA_FR_BREACHED}
           AND (${SLA_RES_DUE} IS NULL OR COALESCE(t.closed_at, t.resolved_at) IS NULL OR COALESCE(t.closed_at, t.resolved_at) <= ${SLA_RES_DUE}))::int AS met,
         COUNT(*) FILTER (WHERE ${SLA_ENABLED} AND (${SLA_FR_BREACHED}
           OR (${SLA_RES_DUE} IS NOT NULL AND COALESCE(t.closed_at, t.resolved_at) IS NOT NULL AND COALESCE(t.closed_at, t.resolved_at) > ${SLA_RES_DUE})
           OR (t.status NOT IN ${CLOSED_STATUSES} AND ${SLA_RES_DUE} IS NOT NULL AND NOW() > ${SLA_RES_DUE})))::int AS breached,
         COUNT(*) FILTER (WHERE ${SLA_ENABLED} AND t.status NOT IN ${CLOSED_STATUSES}
           AND ${SLA_RES_DUE} IS NOT NULL AND NOW() < ${SLA_RES_DUE}
           AND ${SLA_RES_DUE} < NOW() + INTERVAL '4 hours')::int AS near_due,
         AVG(EXTRACT(EPOCH FROM (${SLA_RES_DUE} - NOW())) / 3600.0)
           FILTER (WHERE ${SLA_ENABLED} AND t.status NOT IN ${CLOSED_STATUSES} AND ${SLA_RES_DUE} IS NOT NULL AND ${SLA_RES_DUE} > NOW()) AS avg_hours_to_due
       FROM v_b_tickets t
       WHERE 1=1${createdClause}${scopeClause}`, params), pool.query(`SELECT
         LOWER(COALESCE(t.priority, 'normal')) AS key,
         COUNT(*) FILTER (WHERE ${SLA_ENABLED})::int AS sla_count,
         COUNT(*) FILTER (WHERE ${SLA_ENABLED} AND t.status IN ${CLOSED_STATUSES} AND NOT ${SLA_FR_BREACHED}
           AND (${SLA_RES_DUE} IS NULL OR COALESCE(t.closed_at, t.resolved_at) IS NULL OR COALESCE(t.closed_at, t.resolved_at) <= ${SLA_RES_DUE}))::int AS met,
         MAX(COALESCE((t.sla_info->'policy'->>'resolutionHours')::float, 0)) AS target_hours
       FROM v_b_tickets t
       WHERE 1=1${createdClause}${scopeClause}
       GROUP BY 1
       ORDER BY 1`, params), pool.query(`SELECT
         c.id AS client_id,
         COALESCE(c.name, c.contrat->>'nom', 'Client') AS label,
         COUNT(*) FILTER (WHERE ${SLA_ENABLED} AND (${SLA_FR_BREACHED}
           OR (${SLA_RES_DUE} IS NOT NULL AND COALESCE(t.closed_at, t.resolved_at) IS NOT NULL AND COALESCE(t.closed_at, t.resolved_at) > ${SLA_RES_DUE})))::int AS breached,
         COUNT(*) FILTER (WHERE ${SLA_ENABLED})::int AS sla_count
       FROM v_b_tickets t
       LEFT JOIN v_b_clients c ON c.id = t.client_id
       WHERE t.client_id IS NOT NULL${createdClause}${scopeClause}
       GROUP BY c.id, c.name, c.contrat
       HAVING COUNT(*) FILTER (WHERE ${SLA_ENABLED}) > 0
       ORDER BY breached DESC, sla_count DESC
       LIMIT 8`, params), pool.query(`SELECT
         COALESCE(c.period, r.period) AS period,
         COALESCE(c.count, 0)::int AS created,
         COALESCE(r.count, 0)::int AS resolved
       FROM (
         SELECT date_trunc('${truncSql}', t.created_at)::date AS period, COUNT(*)::int AS count
         FROM v_b_tickets t
         WHERE 1=1${createdClause}${scopeClause}
         GROUP BY 1
       ) c
       FULL OUTER JOIN (
         SELECT date_trunc('${truncSql}', COALESCE(t.closed_at, t.resolved_at))::date AS period, COUNT(*)::int AS count
         FROM v_b_tickets t
         WHERE t.status IN ${CLOSED_STATUSES}
           AND COALESCE(t.closed_at, t.resolved_at) IS NOT NULL${resolvedClause}${scopeClause}
         GROUP BY 1
       ) r ON c.period = r.period
       ORDER BY 1`, params), pool.query(`SELECT date_trunc('day', t.created_at)::date AS period, COUNT(*)::int AS count
       FROM v_b_tickets t
       WHERE 1=1${createdClause}${scopeClause}
       GROUP BY 1
       ORDER BY 1`, params), pool.query(`SELECT date_trunc('week', t.created_at)::date AS period, COUNT(*)::int AS count
       FROM v_b_tickets t
       WHERE 1=1${createdClause}${scopeClause}
       GROUP BY 1
       ORDER BY 1`, params), pool.query(`SELECT date_trunc('month', t.created_at)::date AS period, COUNT(*)::int AS count
       FROM v_b_tickets t
       WHERE 1=1${createdClause}${scopeClause}
       GROUP BY 1
       ORDER BY 1`, params), pool.query(`SELECT date_trunc('month', COALESCE(t.closed_at, t.resolved_at))::date AS period, COUNT(*)::int AS count
       FROM v_b_tickets t
       WHERE t.status IN ${CLOSED_STATUSES}
         AND COALESCE(t.closed_at, t.resolved_at) IS NOT NULL${resolvedClause}${scopeClause}
       GROUP BY 1
       ORDER BY 1`, params), pool.query(`SELECT COUNT(DISTINCT h.ticket_id)::int AS count
       FROM v_b_ticket_status_history h
       JOIN v_b_tickets t ON t.id = h.ticket_id
       WHERE LOWER(COALESCE(h.old_status, '')) IN ('resolved', 'closed')
         AND LOWER(COALESCE(h.new_status, '')) NOT IN ('resolved', 'closed')${historyClause}${scopeClause}`, params), pool.query(`SELECT
         COALESCE(NULLIF(TRIM(t.category), ''), 'Uncategorized') AS key,
         COUNT(DISTINCT h.ticket_id)::int AS count
       FROM v_b_ticket_status_history h
       JOIN v_b_tickets t ON t.id = h.ticket_id
       WHERE LOWER(COALESCE(h.old_status, '')) IN ('resolved', 'closed')
         AND LOWER(COALESCE(h.new_status, '')) NOT IN ('resolved', 'closed')${historyClause}${scopeClause}
       GROUP BY 1
       ORDER BY count DESC
       LIMIT 10`, params), hasActivity ? pool.query(`SELECT COUNT(*)::int AS count
         FROM v_b_ticket_activity a
         JOIN v_b_tickets t ON t.id = a.ticket_id
         WHERE a.action IN ('assignee_added', 'assignee_removed')${activityClause}${scopeClause}`, params) : Promise.resolve({
    rows: [{
      count: 0
    }]
  }), pool.query(`SELECT COUNT(*)::int AS count
       FROM v_b_tickets t
       WHERE LOWER(COALESCE(t.status, '')) IN ('cancelled', 'canceled')${createdClause}${scopeClause}`, params), pool.query(`SELECT
         COALESCE(NULLIF(TRIM(t.category), ''), 'Uncategorized') AS key,
         COUNT(*)::int AS count,
         AVG(${RESOLUTION_HOURS}) FILTER (WHERE COALESCE(t.closed_at, t.resolved_at) IS NOT NULL) AS avg_resolution_hours
       FROM v_b_tickets t
       WHERE 1=1${createdClause}${scopeClause}
       GROUP BY 1
       ORDER BY count DESC
       LIMIT 12`, params), pool.query(`SELECT
         c.id AS client_id,
         COALESCE(c.name, c.contrat->>'nom', 'Client') AS label,
         COUNT(*)::int AS tickets,
         COUNT(*) FILTER (WHERE t.status NOT IN ${CLOSED_STATUSES})::int AS backlog,
         COUNT(*) FILTER (WHERE LOWER(COALESCE(t.priority, '')) IN ('urgent', 'critical'))::int AS critical,
         COUNT(*) FILTER (WHERE t.created_at <= NOW() - INTERVAL '7 days' AND t.status NOT IN ${CLOSED_STATUSES})::int AS over7,
         COUNT(*) FILTER (WHERE ${SLA_ENABLED})::int AS sla_count,
         COUNT(*) FILTER (WHERE ${SLA_ENABLED} AND t.status IN ${CLOSED_STATUSES} AND NOT ${SLA_FR_BREACHED}
           AND (${SLA_RES_DUE} IS NULL OR COALESCE(t.closed_at, t.resolved_at) IS NULL OR COALESCE(t.closed_at, t.resolved_at) <= ${SLA_RES_DUE}))::int AS sla_met,
         AVG(${RESOLUTION_HOURS}) FILTER (WHERE COALESCE(t.closed_at, t.resolved_at) IS NOT NULL) AS avg_resolution_hours
       FROM v_b_tickets t
       LEFT JOIN v_b_clients c ON c.id = t.client_id
       WHERE t.client_id IS NOT NULL${createdClause}${scopeClause}
       GROUP BY c.id, c.name, c.contrat
       ORDER BY tickets DESC
       LIMIT 20`, params), pool.query(`SELECT
         t.client_id,
         COUNT(*)::int AS tickets
       FROM v_b_tickets t
       WHERE t.client_id IS NOT NULL${prevCreatedClause}${prevScopeClause}
       GROUP BY t.client_id`, prevParams), pool.query(`SELECT
         u.id AS user_id,
         COALESCE(NULLIF(TRIM(u.username), ''), u.email, 'Agent') AS label,
         u.email,
         COUNT(t.id)::int AS assigned_count,
         COUNT(t.id) FILTER (WHERE t.status IN ${CLOSED_STATUSES})::int AS closed_count,
         COUNT(t.id) FILTER (WHERE t.status NOT IN ${CLOSED_STATUSES})::int AS open_count,
         AVG(${RESOLUTION_HOURS}) FILTER (WHERE COALESCE(t.closed_at, t.resolved_at) IS NOT NULL) AS avg_resolution_hours,
         percentile_cont(0.5) WITHIN GROUP (ORDER BY ${RESOLUTION_HOURS})
           FILTER (WHERE COALESCE(t.closed_at, t.resolved_at) IS NOT NULL) AS median_resolution_hours,
         AVG(${FIRST_RESPONSE_HOURS}) FILTER (WHERE ${FIRST_TAKEOVER_SUBQUERY} IS NOT NULL) AS avg_first_response_hours,
         COUNT(*) FILTER (WHERE ${SLA_ENABLED})::int AS sla_count,
         COUNT(*) FILTER (WHERE ${SLA_ENABLED} AND t.status IN ${CLOSED_STATUSES} AND NOT ${SLA_FR_BREACHED}
           AND (${SLA_RES_DUE} IS NULL OR COALESCE(t.closed_at, t.resolved_at) IS NULL OR COALESCE(t.closed_at, t.resolved_at) <= ${SLA_RES_DUE}))::int AS sla_met
       FROM v_b_users u
       LEFT JOIN v_b_tickets t ON t.assigned_user_id = u.id${createdClause}${scopeClause}
       WHERE COALESCE(u.role, '') <> 'client'
         AND u.is_active = true
       GROUP BY u.id, u.username, u.email
       HAVING COUNT(t.id) > 0
       ORDER BY closed_count DESC, assigned_count DESC
       LIMIT 20`, params), pool.query(`SELECT EXTRACT(ISODOW FROM t.created_at)::int AS period, COUNT(*)::int AS count
       FROM v_b_tickets t
       WHERE 1=1${createdClause}${scopeClause}
       GROUP BY 1
       ORDER BY 1 ASC`, params), pool.query(`SELECT EXTRACT(MONTH FROM t.created_at)::int AS period, COUNT(*)::int AS count
       FROM v_b_tickets t
       WHERE 1=1${createdClause}${scopeClause}
       GROUP BY 1
       ORDER BY 1 ASC`, params), pool.query(`SELECT EXTRACT(YEAR FROM t.created_at)::int AS period, COUNT(*)::int AS count
       FROM v_b_tickets t
       WHERE 1=1${createdClause}${scopeClause}
       GROUP BY 1
       ORDER BY 1 ASC`, params)]);
  const volume = volumeResult.rows[0] || {};
  const prevVolume = prevVolumeResult.rows[0] || {};
  const backlog = backlogResult.rows[0] || {};
  const timing = timingResult.rows[0] || {};
  const sla = slaResult.rows[0] || {};
  const reopened = Number(reopenResult.rows[0]?.count) || 0;
  const closed = Number(volume.closed) || 0;
  const created = Number(volume.created) || 0;
  const slaTickets = Number(sla.sla_tickets) || 0;
  const slaMet = Number(sla.met) || 0;
  const slaBreached = Number(sla.breached) || 0;
  const prevCreated = Number(prevVolume.created) || 0;
  const prevClosed = Number(prevVolume.closed) || 0;
  const slaMetPct = slaTickets > 0 ? roundPct(slaMet / slaTickets * 100) : null;
  const slaBreachedPct = slaTickets > 0 ? roundPct(slaBreached / slaTickets * 100) : null;
  const prevClients = new Map((prevClientResult.rows || []).map(row => [String(row.client_id), Number(row.tickets) || 0]));
  const reopenByCategory = new Map((reopenByCategoryResult.rows || []).map(row => [String(row.key), Number(row.count) || 0]));
  return {
    deltas: {
      createdPct: pctChange(created, prevCreated),
      closedPct: pctChange(closed, prevClosed)
    },
    volume: {
      created,
      closed,
      cancelled: Number(cancelledResult.rows[0]?.count) || 0,
      transferred: Number(transferredResult.rows[0]?.count) || 0,
      reopened,
      reopenRate: closed > 0 ? roundPct(reopened / closed * 100) : null,
      ticketsPerTechnician: Number(volume.technicians) > 0 ? round1(created / Number(volume.technicians)) : null,
      createdPerDay: averageTrend(dailyResult.rows),
      createdPerWeek: averageTrend(weeklyResult.rows),
      createdPerMonth: averageTrend(monthlyCreatedResult.rows),
      dailyCreated: buildTrend(dailyResult.rows),
      weeklyCreated: buildTrend(weeklyResult.rows),
      monthlyCreated: buildTrend(monthlyCreatedResult.rows),
      monthlyResolved: buildTrend(monthlyResolvedResult.rows),
      weekdayCreated: buildWeekdayTrend(weekdayResult.rows),
      monthOfYearCreated: buildMonthOfYearTrend(monthOfYearResult.rows),
      yearlyCreated: buildYearlyTrend(yearlyResult.rows),
      createdResolved: (createdResolvedResult.rows || []).map(row => ({
        period: row.period,
        created: Number(row.created) || 0,
        resolved: Number(row.resolved) || 0
      })),
      backlog: {
        total: Number(backlog.total) || 0,
        over7: Number(backlog.over7) || 0,
        over30: Number(backlog.over30) || 0,
        over90: Number(backlog.over90) || 0,
        avgAgeDays: round1(backlog.avg_age_days)
      }
    },
    timing: {
      firstResponse: {
        avg: round1(timing.fr_avg),
        median: round1(timing.fr_median),
        p90: round1(timing.fr_p90),
        p95: round1(timing.fr_p95)
      },
      resolution: {
        avg: round1(timing.res_avg),
        median: round1(timing.res_median),
        p90: round1(timing.res_p90)
      }
    },
    sla: {
      metCount: slaMet,
      breachedCount: slaBreached,
      metPct: slaMetPct,
      breachedPct: slaBreachedPct,
      nearDueCount: Number(sla.near_due) || 0,
      avgHoursToDue: round1(sla.avg_hours_to_due),
      byPriority: (slaByPriorityResult.rows || []).map(row => ({
        key: row.key,
        label: TICKET_PRIORITY_LABELS[row.key] || row.key,
        slaCount: Number(row.sla_count) || 0,
        metPct: Number(row.sla_count) > 0 ? roundPct(Number(row.met) / Number(row.sla_count) * 100) : null,
        targetHours: round1(row.target_hours)
      })),
      topBreachedClients: (slaClientsResult.rows || []).map(row => ({
        clientId: row.client_id,
        label: row.label,
        breached: Number(row.breached) || 0,
        slaCount: Number(row.sla_count) || 0
      }))
    },
    agents: (agentDetailResult.rows || []).map(row => ({
      userId: row.user_id,
      label: formatUserLabel(row.email, row.label),
      assignedCount: Number(row.assigned_count) || 0,
      closedCount: Number(row.closed_count) || 0,
      openCount: Number(row.open_count) || 0,
      avgResolutionHours: round1(row.avg_resolution_hours),
      medianResolutionHours: round1(row.median_resolution_hours),
      avgFirstResponseHours: round1(row.avg_first_response_hours),
      slaMetPct: Number(row.sla_count) > 0 ? roundPct(Number(row.sla_met) / Number(row.sla_count) * 100) : null
    })),
    clients: (clientDetailResult.rows || []).map(row => {
      const prevTickets = prevClients.get(String(row.client_id)) || 0;
      const tickets = Number(row.tickets) || 0;
      return {
        clientId: row.client_id,
        label: row.label,
        tickets,
        evolutionPct: pctChange(tickets, prevTickets),
        slaMetPct: Number(row.sla_count) > 0 ? roundPct(Number(row.sla_met) / Number(row.sla_count) * 100) : null,
        backlog: Number(row.backlog) || 0,
        critical: Number(row.critical) || 0,
        over7: Number(row.over7) || 0,
        avgResolutionHours: round1(row.avg_resolution_hours)
      };
    }),
    categories: (categoryDetailResult.rows || []).map(row => {
      const count = Number(row.count) || 0;
      const reopenedCount = reopenByCategory.get(String(row.key)) || 0;
      return {
        key: row.key,
        label: row.key,
        count,
        sharePct: created > 0 ? roundPct(count / created * 100) : 0,
        avgResolutionHours: round1(row.avg_resolution_hours),
        reopened: reopenedCount,
        reopenRate: count > 0 ? roundPct(reopenedCount / count * 100) : 0
      };
    })
  };
}
function averageTrend(rows = []) {
  if (!rows.length) return 0;
  const total = rows.reduce((sum, row) => sum + (Number(row.count) || 0), 0);
  return round1(total / rows.length);
}
function emptySupportCockpit() {
  return {
    deltas: {
      createdPct: 0,
      closedPct: 0
    },
    volume: {
      created: 0,
      closed: 0,
      cancelled: 0,
      transferred: 0,
      reopened: 0,
      reopenRate: null,
      ticketsPerTechnician: null,
      createdPerDay: 0,
      createdPerWeek: 0,
      createdPerMonth: 0,
      dailyCreated: [],
      weeklyCreated: [],
      monthlyCreated: [],
      monthlyResolved: [],
      weekdayCreated: [],
      monthOfYearCreated: [],
      yearlyCreated: [],
      createdResolved: [],
      backlog: {
        total: 0,
        over7: 0,
        over30: 0,
        over90: 0,
        avgAgeDays: null
      }
    },
    timing: {
      firstResponse: {
        avg: null,
        median: null,
        p90: null,
        p95: null
      },
      resolution: {
        avg: null,
        median: null,
        p90: null
      }
    },
    sla: {
      metCount: 0,
      breachedCount: 0,
      metPct: null,
      breachedPct: null,
      nearDueCount: 0,
      avgHoursToDue: null,
      byPriority: [],
      topBreachedClients: []
    },
    agents: [],
    clients: [],
    categories: []
  };
}
async function fetchSupportCockpitStatsSafe(args) {
  try {
    return await fetchSupportCockpitStats(args);
  } catch (err) {
    console.warn("[analytics] support cockpit", err.message);
    return emptySupportCockpit();
  }
}
async function fetchSupportStats({
  sinceIso,
  untilIso,
  filters = {}
}) {
  const params = [];
  const periodClause = buildRangeClause(params, "t.created_at", sinceIso, untilIso);
  const scopeClause = buildTicketScopeClause(params, filters, "t");
  const ticketWhere = `WHERE 1=1${periodClause}${scopeClause}`;
  const openNowParams = [];
  const openNowScope = buildTicketScopeClause(openNowParams, filters, "t");
  const [overviewResult, statusResult, priorityResult, typeResult, categoryResult, responseResult, resolutionResult, agentsResult, clientsResult, contactsResult, weekdayResult, yearlyResult, monthlyResult, openNowResult, channelResult] = await Promise.all([pool.query(`SELECT
         COUNT(*)::int AS created,
         COUNT(*) FILTER (WHERE t.status IN ${CLOSED_STATUSES})::int AS closed,
         COUNT(*) FILTER (WHERE t.status NOT IN ${CLOSED_STATUSES})::int AS open_snapshot
       FROM v_b_tickets t
       ${ticketWhere}`, params), pool.query(`SELECT LOWER(COALESCE(t.status, 'open')) AS key, COUNT(*)::int AS count
       FROM v_b_tickets t
       ${ticketWhere}
       GROUP BY 1
       ORDER BY count DESC`, params), pool.query(`SELECT LOWER(COALESCE(t.priority, 'normal')) AS key, COUNT(*)::int AS count
       FROM v_b_tickets t
       ${ticketWhere}
       GROUP BY 1
       ORDER BY count DESC`, params), pool.query(`SELECT LOWER(COALESCE(t.type, 'incident')) AS key, COUNT(*)::int AS count
       FROM v_b_tickets t
       ${ticketWhere}
       GROUP BY 1
       ORDER BY count DESC`, params), pool.query(`SELECT COALESCE(NULLIF(TRIM(t.category), ''), 'Uncategorized') AS key, COUNT(*)::int AS count
       FROM v_b_tickets t
       ${ticketWhere}
       GROUP BY 1
       ORDER BY count DESC`, params), pool.query(`SELECT
         AVG(EXTRACT(EPOCH FROM (${FIRST_TAKEOVER_SUBQUERY} - t.created_at)) / 3600.0)
           FILTER (WHERE ${FIRST_TAKEOVER_SUBQUERY} IS NOT NULL) AS avg_first_response_hours,
         COUNT(*) FILTER (WHERE ${FIRST_TAKEOVER_SUBQUERY} IS NOT NULL)::int AS with_first_response
       FROM v_b_tickets t
       ${ticketWhere}`, params), pool.query(`SELECT
         AVG(EXTRACT(EPOCH FROM (COALESCE(t.closed_at, t.resolved_at) - t.created_at)) / 3600.0)
           FILTER (WHERE COALESCE(t.closed_at, t.resolved_at) IS NOT NULL) AS avg_resolution_hours,
         COUNT(*) FILTER (WHERE COALESCE(t.closed_at, t.resolved_at) IS NOT NULL)::int AS resolved_count
       FROM v_b_tickets t
       WHERE t.status IN ${CLOSED_STATUSES}${periodClause}${scopeClause}`, params), pool.query(`SELECT
         u.id AS user_id,
         COALESCE(NULLIF(TRIM(u.username), ''), u.email, 'Agent') AS label,
         u.email,
         COUNT(t.id)::int AS assigned_count,
         COUNT(t.id) FILTER (WHERE t.status IN ${CLOSED_STATUSES})::int AS closed_count,
         COUNT(t.id) FILTER (WHERE t.status NOT IN ${CLOSED_STATUSES})::int AS open_count,
         AVG(EXTRACT(EPOCH FROM (COALESCE(t.closed_at, t.resolved_at) - t.created_at)) / 3600.0)
           FILTER (WHERE COALESCE(t.closed_at, t.resolved_at) IS NOT NULL) AS avg_resolution_hours
       FROM v_b_users u
       LEFT JOIN v_b_tickets t ON t.assigned_user_id = u.id${periodClause}${scopeClause}
       WHERE COALESCE(u.role, '') <> 'client'
         AND u.is_active = true
       GROUP BY u.id, u.username, u.email
       HAVING COUNT(t.id) > 0
       ORDER BY closed_count DESC, assigned_count DESC
       LIMIT 15`, params), pool.query(`SELECT
         c.id AS client_id,
         COALESCE(c.name, c.contrat->>'nom', 'Client') AS label,
         COUNT(t.id)::int AS count
       FROM v_b_tickets t
       LEFT JOIN v_b_clients c ON c.id = t.client_id
       WHERE t.client_id IS NOT NULL${periodClause}${scopeClause}
       GROUP BY c.id, c.name, c.contrat
       ORDER BY count DESC`, params), pool.query(`SELECT
         ct.id AS contact_id,
         ct.prenom,
         ct.nom,
         ct.email,
         COALESCE(cl.name, cl.contrat->>'nom') AS client_name,
         COUNT(t.id)::int AS count
       FROM v_b_tickets t
       LEFT JOIN v_b_contacts ct ON ct.id = t.requester_contact_id
       LEFT JOIN v_b_clients cl ON cl.id = COALESCE(t.client_id, ct.client_id)
       WHERE t.requester_contact_id IS NOT NULL${periodClause}${scopeClause}
       GROUP BY ct.id, ct.prenom, ct.nom, ct.email, cl.name, cl.contrat
       ORDER BY count DESC`, params), pool.query(`SELECT EXTRACT(ISODOW FROM t.created_at)::int AS period, COUNT(*)::int AS count
       FROM v_b_tickets t
       ${ticketWhere}
       GROUP BY 1
       ORDER BY 1 ASC`, params), pool.query(`SELECT EXTRACT(YEAR FROM t.created_at)::int AS period, COUNT(*)::int AS count
       FROM v_b_tickets t
       ${ticketWhere}
       GROUP BY 1
       ORDER BY 1 ASC`, params), pool.query(`SELECT date_trunc('month', t.created_at)::date AS period, COUNT(*)::int AS count
       FROM v_b_tickets t
       ${ticketWhere}
       GROUP BY 1
       ORDER BY 1 ASC`, params), pool.query(`SELECT COUNT(*)::int AS count
       FROM v_b_tickets t
       WHERE t.status NOT IN ${CLOSED_STATUSES}${openNowScope}`, openNowParams), pool.query(`SELECT LOWER(COALESCE(t.channel, 'web')) AS key, COUNT(*)::int AS count
       FROM v_b_tickets t
       ${ticketWhere}
       GROUP BY 1
       ORDER BY count DESC`, params)]);
  const overview = overviewResult.rows[0] || {};
  let satisfaction = null;
  if (await hasSatisfactionTable()) {
    const satParams = [...params];
    const satPeriod = periodClause.replace(/t\.created_at/g, "s.created_at");
    const [satOverview, satByAgent] = await Promise.all([pool.query(`SELECT
           COUNT(*)::int AS responses,
           AVG(COALESCE(s.rating, 0))::float AS avg_rating,
           COUNT(*) FILTER (WHERE COALESCE(s.rating, 0) >= 4)::int AS promoters,
           COUNT(*) FILTER (WHERE COALESCE(s.rating, 0) <= 2)::int AS detractors
         FROM v_b_ticket_satisfaction s
         JOIN v_b_tickets t ON t.id = s.ticket_id
         WHERE COALESCE(s.rating, 0) > 0${satPeriod}${scopeClause}`, satParams), pool.query(`SELECT
           u.id AS user_id,
           COALESCE(NULLIF(TRIM(u.username), ''), u.email, 'Agent') AS label,
           COUNT(s.id)::int AS responses,
           AVG(COALESCE(s.rating, 0))::float AS avg_rating
         FROM v_b_ticket_satisfaction s
         JOIN v_b_tickets t ON t.id = s.ticket_id
         LEFT JOIN v_b_users u ON u.id = t.assigned_user_id
         WHERE COALESCE(s.rating, 0) > 0${periodClause}${scopeClause}
         GROUP BY u.id, u.username, u.email
         HAVING COUNT(s.id) > 0
         ORDER BY responses DESC, avg_rating DESC
         LIMIT 10`, params)]);
    const satRow = satOverview.rows[0] || {};
    const responses = Number(satRow.responses) || 0;
    satisfaction = {
      responses,
      avgRating: round1(satRow.avg_rating),
      csatPercent: responses > 0 ? roundPct(Number(satRow.promoters) / responses * 100) : null,
      detractorPercent: responses > 0 ? roundPct(Number(satRow.detractors) / responses * 100) : null,
      byAgent: (satByAgent.rows || []).map(row => ({
        userId: row.user_id,
        label: formatUserLabel(row.email, row.label),
        responses: Number(row.responses) || 0,
        avgRating: round1(row.avg_rating)
      }))
    };
  }
  const responseRow = responseResult.rows[0] || {};
  const resolutionRow = resolutionResult.rows[0] || {};
  return {
    overview: {
      created: Number(overview.created) || 0,
      closed: Number(overview.closed) || 0,
      openNow: Number(openNowResult.rows[0]?.count) || 0,
      closureRate: Number(overview.created) > 0 ? roundPct(Number(overview.closed) / Number(overview.created) * 100) : null
    },
    timing: {
      avgFirstResponseHours: round1(responseRow.avg_first_response_hours),
      ticketsWithFirstResponse: Number(responseRow.with_first_response) || 0,
      avgResolutionHours: round1(resolutionRow.avg_resolution_hours),
      resolvedCount: Number(resolutionRow.resolved_count) || 0
    },
    byStatus: mapCountRows(statusResult.rows, TICKET_STATUS_LABELS),
    byPriority: mapCountRows(priorityResult.rows, TICKET_PRIORITY_LABELS),
    byType: mapCountRows(typeResult.rows, TICKET_TYPE_LABELS),
    byCategory: mapCountRows(categoryResult.rows),
    byChannel: mapCountRows(channelResult.rows, {
      web: "Web portal",
      email: "Email",
      phone: "Phone",
      api: "API"
    }),
    weekdayTrend: buildWeekdayTrend(weekdayResult.rows),
    yearlyTrend: buildYearlyTrend(yearlyResult.rows),
    monthlyTrend: buildTrend(monthlyResult.rows),
    topAgents: (agentsResult.rows || []).map(row => ({
      userId: row.user_id,
      label: formatUserLabel(row.email, row.label),
      assignedCount: Number(row.assigned_count) || 0,
      closedCount: Number(row.closed_count) || 0,
      openCount: Number(row.open_count) || 0,
      avgResolutionHours: round1(row.avg_resolution_hours)
    })),
    topClients: (clientsResult.rows || []).map(row => ({
      clientId: row.client_id,
      label: row.label,
      count: Number(row.count) || 0
    })),
    topContacts: (contactsResult.rows || []).map(row => ({
      contactId: row.contact_id,
      label: formatContactLabel(row),
      count: Number(row.count) || 0
    })),
    satisfaction
  };
}
async function fetchPlanningStats({
  sinceIso,
  untilIso,
  filters = {}
}) {
  if (!(await tableExists("public.v_b_events"))) {
    return {
      available: false,
      overview: {
        total: 0,
        maintenanceYtd: 0,
        upcoming: 0
      },
      byType: [],
      byAgent: [],
      monthlyTrend: []
    };
  }
  const params = [];
  const periodClause = buildRangeClause(params, "e.start", sinceIso, untilIso);
  const scopeClause = buildEventScopeClause(params, filters, "e");
  const eventWhere = `WHERE 1=1${periodClause}${scopeClause}`;
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
  const [overviewResult, typeResult, agentResult, trendResult, upcomingResult, maintenanceYtdResult] = await Promise.all([pool.query(`SELECT COUNT(*)::int AS total FROM v_b_events e ${eventWhere}`, params), pool.query(`SELECT LOWER(COALESCE(e.type, 'other')) AS key, COUNT(*)::int AS count
         FROM v_b_events e
         ${eventWhere}
         GROUP BY 1
         ORDER BY count DESC`, params), pool.query(`SELECT
           u.id AS user_id,
           COALESCE(NULLIF(TRIM(u.username), ''), u.email, 'Agent') AS label,
           u.email,
           COUNT(e.id)::int AS count
         FROM v_b_events e
         LEFT JOIN v_b_users u ON u.id = COALESCE(e.assigned_user_id, e.user_id)
         ${eventWhere}
         GROUP BY u.id, u.username, u.email
         ORDER BY count DESC
         LIMIT 12`, params), pool.query(`SELECT date_trunc('month', e.start)::date AS period, COUNT(*)::int AS count
         FROM v_b_events e
         ${eventWhere}
         GROUP BY 1
         ORDER BY 1 ASC`, params), (() => {
    const upcomingParams = [sinceIso, untilIso];
    const upcomingScopeParams = [];
    const upcomingScope = buildEventScopeClause(upcomingScopeParams, filters, "e").replace(/\$(\d+)/g, (_, index) => `$${Number(index) + 2}`);
    return pool.query(`SELECT COUNT(*)::int AS count
           FROM v_b_events e
           WHERE e.start >= GREATEST(NOW(), COALESCE($1::timestamptz, '-infinity'::timestamptz))
             AND ($2::timestamptz IS NULL OR e.start <= $2::timestamptz)${upcomingScope}`, [...upcomingParams, ...upcomingScopeParams]);
  })(), (() => {
    const maintenanceParams = [yearStart];
    const maintenanceScopeParams = [];
    const maintenanceScope = buildEventScopeClause(maintenanceScopeParams, filters, "e").replace(/\$(\d+)/g, (_, index) => `$${Number(index) + 1}`);
    return pool.query(`SELECT COUNT(*)::int AS count
           FROM v_b_events e
           WHERE e.type IN ('maintenance', 'maintenance_preventive')
             AND e.start >= $1${maintenanceScope}`, [...maintenanceParams, ...maintenanceScopeParams]);
  })()]);
  const maintenanceTypes = ["maintenance", "maintenance_preventive"];
  const byType = mapCountRows(typeResult.rows, EVENT_TYPE_LABELS);
  const maintenanceInPeriod = byType.filter(row => maintenanceTypes.includes(row.key)).reduce((sum, row) => sum + row.count, 0);
  return {
    available: true,
    overview: {
      total: Number(overviewResult.rows[0]?.total) || 0,
      maintenanceInPeriod,
      maintenanceYtd: Number(maintenanceYtdResult.rows[0]?.count) || 0,
      upcoming: Number(upcomingResult.rows[0]?.count) || 0
    },
    byType,
    byAgent: (agentResult.rows || []).map(row => ({
      userId: row.user_id,
      label: formatUserLabel(row.email, row.label),
      count: Number(row.count) || 0
    })),
    monthlyTrend: buildTrend(trendResult.rows)
  };
}
async function fetchCrmStats({
  sinceIso,
  untilIso,
  filters = {}
}) {
  const contactParams = [];
  const contactPeriod = buildRangeClause(contactParams, "c.created_at", sinceIso, untilIso);
  const ticketParams = [];
  const ticketPeriod = buildRangeClause(ticketParams, "t.created_at", sinceIso, untilIso);
  const ticketScope = buildTicketScopeClause(ticketParams, filters, "t");
  const hasPeriod = Boolean(sinceIso || untilIso);
  const contactScope = filters.clientId != null ? (() => {
    contactParams.push(filters.clientId);
    return ` AND (
      EXISTS (SELECT 1 FROM v_b_contact_client_links l WHERE l.contact_id = c.id AND l.client_id = $${contactParams.length})
      OR c.client_id = $${contactParams.length}
    )`;
  })() : filters.contactId != null ? (() => {
    contactParams.push(filters.contactId);
    return ` AND c.id = $${contactParams.length}`;
  })() : "";
  const [clientsResult, contactsResult, clientsInPeriodResult, contractsResult] = await Promise.all([filters.clientId != null ? pool.query(`SELECT COUNT(*)::int AS count FROM v_b_clients WHERE id = $1`, [filters.clientId]) : pool.query(`SELECT COUNT(*)::int AS count FROM v_b_clients`), tableExists("public.v_b_contacts").then(ok => ok ? pool.query(`SELECT COUNT(*)::int AS total,
                    COUNT(*) FILTER (WHERE 1=1${contactPeriod})::int AS new_in_period
             FROM v_b_contacts c
             WHERE 1=1${contactScope}`, contactParams) : {
    rows: [{
      total: 0,
      new_in_period: 0
    }]
  }), hasPeriod ? pool.query(`SELECT COUNT(DISTINCT t.client_id)::int AS count
           FROM v_b_tickets t
           WHERE t.client_id IS NOT NULL${ticketPeriod}${ticketScope}`, ticketParams) : Promise.resolve({
    rows: [{
      count: filters.clientId != null ? 1 : null
    }]
  }), filters.clientId != null ? pool.query(`SELECT id, name, contrat FROM v_b_clients WHERE id = $1`, [filters.clientId]) : pool.query(`SELECT id, name, contrat FROM v_b_clients`)]);
  let contractsExpiring = 0;
  let contractsExpired = 0;
  let contractsSuspended = 0;
  let contractsActive = 0;
  const now = Date.now();
  const windowMs = 30 * 86400000;
  const sinceMs = sinceIso ? new Date(sinceIso).getTime() : null;
  const untilMs = untilIso ? new Date(untilIso).getTime() : now;
  for (const row of contractsResult.rows) {
    let contrat = row.contrat;
    if (typeof contrat === "string") {
      try {
        contrat = JSON.parse(contrat);
      } catch {
        contrat = {};
      }
    }
    if (!contrat) continue;
    if (contrat.suspendu) {
      contractsSuspended += 1;
      continue;
    }
    const exp = contrat.expiration ? new Date(contrat.expiration).getTime() : NaN;
    if (!Number.isFinite(exp)) {
      contractsActive += 1;
      continue;
    }
    if (hasPeriod) {
      if (exp >= sinceMs && exp <= untilMs) {
        if (exp < now) contractsExpired += 1;
        else contractsExpiring += 1;
      }
      if (exp >= now) contractsActive += 1;
      continue;
    }
    if (exp < now) contractsExpired += 1;
    else {
      contractsActive += 1;
      if (exp - now <= windowMs) contractsExpiring += 1;
    }
  }
  const contactRow = contactsResult.rows[0] || {};
  const clientsInPeriod = clientsInPeriodResult.rows[0]?.count;
  return {
    clientsTotal: hasPeriod ? Number(clientsInPeriod) || 0 : Number(clientsResult.rows[0]?.count) || 0,
    clientsPortfolio: Number(clientsResult.rows[0]?.count) || 0,
    contactsTotal: Number(contactRow.total) || 0,
    contactsNew: Number(contactRow.new_in_period) || 0,
    contractsExpiring,
    contractsExpired,
    contractsSuspended,
    contractsActive
  };
}
const SOLUTION_TABLES = [{
  key: "antivirus",
  table: "v_b_clients_m_antivirus"
}, {
  key: "antispam",
  table: "v_b_clients_m_antispam"
}, {
  key: "backup",
  table: "v_b_clients_m_save"
}, {
  key: "o365",
  table: "v_b_clients_m_o365"
}, {
  key: "domain",
  table: "v_b_clients_m_ndd"
}, {
  key: "ssl",
  table: "v_b_clients_m_ssl"
}, {
  key: "campaigns",
  table: "v_b_clients_c_campaign",
  anyRow: true
}];
async function countTableOrZero(sql, params = []) {
  try {
    const result = await pool.query(sql, params);
    return Number(result.rows[0]?.count) || 0;
  } catch (err) {
    if (err.code === "42P01" || err.code === "42703") return 0;
    throw err;
  }
}
async function fetchSolutionCoverage(clientId = null) {
  const rows = [];
  for (const item of SOLUTION_TABLES) {
    const where = item.anyRow ? clientId != null ? "WHERE client_id = $1" : "" : clientId != null ? "WHERE data IS NOT NULL AND client_id = $1" : "WHERE data IS NOT NULL";
    const params = clientId != null ? [clientId] : [];
    const count = await countTableOrZero(`SELECT COUNT(*)::int AS count FROM ${item.table} ${where}`, params);
    rows.push({
      key: item.key,
      count
    });
  }
  return rows;
}
async function fetchEnterpriseStats({
  sinceIso,
  untilIso,
  filters = {}
}) {
  const crm = await fetchCrmStats({
    sinceIso,
    untilIso,
    filters
  });
  let modules = [];
  try {
    const options = await listContractModuleOptions({
      includeDisabled: false,
      includeUsage: filters.clientId == null
    });
    if (filters.clientId != null) {
      const clientRow = await pool.query(`SELECT options FROM v_b_clients WHERE id = $1`, [filters.clientId]);
      let clientOptions = clientRow.rows[0]?.options || {};
      if (typeof clientOptions === "string") {
        try {
          clientOptions = JSON.parse(clientOptions);
        } catch {
          clientOptions = {};
        }
      }
      modules = options.map(mod => ({
        key: mod.moduleKey,
        label: mod.label,
        icon: mod.icon,
        count: clientOptions?.[mod.moduleKey] ? 1 : 0
      }));
    } else {
      modules = options.map(mod => ({
        key: mod.moduleKey,
        label: mod.label,
        icon: mod.icon,
        count: Number(mod.clientUsageCount) || 0
      }));
    }
  } catch (err) {
    console.warn("[analytics] contract modules", err.message);
  }
  const solutions = await fetchSolutionCoverage(filters.clientId);
  const cockpit = await fetchEnterpriseCockpitStatsSafe({
    sinceIso,
    untilIso,
    filters,
    modules,
    solutions
  });
  return {
    ...crm,
    modules,
    solutions,
    cockpit
  };
}

function parseContratJson(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {
      return {};
    }
  }
  return {};
}

function parseMoneyField(data, keys) {
  if (!data || typeof data !== "object") return null;
  for (const key of keys) {
    const raw = data[key];
    if (raw == null || raw === "") continue;
    const value = Number(String(raw).replace(",", ".").replace(/[^\d.-]/g, ""));
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function emptyEnterpriseCockpit() {
  return {
    overview: {
      companiesTotal: 0,
      active: 0,
      onboarding: 0,
      terminated: 0,
      mrr: null,
      contractsActive: 0,
      contractsExpiring: 0,
      withoutContract: 0,
      healthScore: null,
      atRisk: 0
    },
    byStatus: [],
    clientTrend: [],
    mrrTrend: [],
    byOffer: [],
    topByMrr: [],
    contracts: {
      active: 0,
      expiring30: 0,
      expiring90: 0,
      noRenewalDate: 0,
      slaActive: 0,
      slaMet: 0,
      slaMetPct: null,
      slaBreached: 0,
      ticketsOutOfSla: 0,
      withoutSla: 0,
      criticalSla: 0
    },
    renewal: {
      days30: { count: 0, clients: [] },
      days90: { count: 0, clients: [] },
      days180: { count: 0, clients: [] },
      daysMore: { count: 0, clients: [] }
    },
    credits: {
      available: 0,
      consumed: 0,
      remaining: 0,
      consumptionPct: null,
      expiringSoon: 0,
      overLimit: 0,
      nearEmpty: 0,
      ticketsIncluded: 0,
      ticketsOutOfBundle: 0,
      ticketsBillable: 0
    },
    creditClients: [],
    options: {
      active: 0,
      perCompany: null,
      servicesActive: 0,
      servicesExpired: 0,
      expiringSoon: 0,
      unused: 0,
      overused: 0,
      monthlyValue: null,
      yearlyValue: null
    },
    optionAdoption: [],
    fleet: {
      underContract: 0,
      outOfContract: 0,
      managed: 0,
      unmanaged: 0,
      avgPerClient: null,
      coveredByOption: 0,
      withoutCoverage: 0,
      added: 0,
      removed: 0,
      activeSites: 0,
      coveragePct: null
    },
    fleetClients: [],
    atRiskClients: []
  };
}

async function fetchEnterpriseCockpitStatsSafe(args) {
  try {
    return await fetchEnterpriseCockpitStats(args);
  } catch (error) {
    console.error("[dashboard] enterprise cockpit stats failed:", error);
    return emptyEnterpriseCockpit();
  }
}

async function fetchEnterpriseCockpitStats({
  sinceIso,
  untilIso,
  filters = {},
  modules = [],
  solutions = []
}) {
  const empty = emptyEnterpriseCockpit();
  const clientParams = filters.clientId != null ? [filters.clientId] : [];
  const clientWhere = filters.clientId != null ? " AND id = $1" : "";
  const clientIdWhere = filters.clientId != null ? " AND client_id = $1" : "";
  const now = new Date();
  const inDays = (n) => new Date(now.getTime() + n * 86400000);
  const onboardingFrom = new Date(now.getTime() - 30 * 86400000);

  const [clientRows, creditPackRows, slaRows, ticketRows, ledgerRows, checkmkRows, rmmRows, siteAddedRows, siteRemovedRows, clientCreatedRows] = await Promise.all([
    queryRowsOrEmpty(
      `SELECT id, name, contrat, options, modules, sites, created_at
       FROM v_b_clients
       WHERE 1=1${clientWhere}`,
      clientParams
    ),
    queryRowsOrEmpty(
      `SELECT client_id, initial_amount, remaining_amount, valid_until, archived_at
       FROM v_b_client_support_credit_packs
       WHERE archived_at IS NULL${clientIdWhere}`,
      clientParams
    ),
    queryRowsOrEmpty(
      `SELECT
         COUNT(*) FILTER (WHERE ${SLA_ENABLED})::int AS sla_tickets,
         COUNT(*) FILTER (WHERE ${SLA_ENABLED} AND t.status IN ${CLOSED_STATUSES} AND NOT ${SLA_FR_BREACHED}
           AND (${SLA_RES_DUE} IS NULL OR COALESCE(t.closed_at, t.resolved_at) IS NULL OR COALESCE(t.closed_at, t.resolved_at) <= ${SLA_RES_DUE}))::int AS met,
         COUNT(*) FILTER (WHERE ${SLA_ENABLED} AND (${SLA_FR_BREACHED}
           OR (${SLA_RES_DUE} IS NOT NULL AND COALESCE(t.closed_at, t.resolved_at) IS NOT NULL AND COALESCE(t.closed_at, t.resolved_at) > ${SLA_RES_DUE})
           OR (t.status NOT IN ${CLOSED_STATUSES} AND ${SLA_RES_DUE} IS NOT NULL AND NOW() > ${SLA_RES_DUE})))::int AS breached
       FROM v_b_tickets t
       WHERE 1=1${sinceIso ? " AND t.created_at >= $1" : ""}${untilIso ? ` AND t.created_at <= $${sinceIso ? 2 : 1}` : ""}${filters.clientId != null ? ` AND t.client_id = $${[sinceIso, untilIso].filter(Boolean).length + 1}` : ""}`,
      [sinceIso, untilIso, filters.clientId].filter((value) => value != null)
    ),
    queryRowsOrEmpty(
      `SELECT client_id, LOWER(COALESCE(type, '')) AS type, COALESCE(category, '') AS category, COUNT(*)::int AS total
       FROM v_b_tickets
       WHERE client_id IS NOT NULL
         ${sinceIso ? " AND created_at >= $1" : ""}
         ${untilIso ? ` AND created_at <= $${sinceIso ? 2 : 1}` : ""}
         ${filters.clientId != null ? ` AND client_id = $${[sinceIso, untilIso].filter(Boolean).length + 1}` : ""}
       GROUP BY 1, 2, 3`,
      [sinceIso, untilIso, filters.clientId].filter((value) => value != null)
    ),
    queryRowsOrEmpty(
      `SELECT client_id, ticket_id, kind, delta
       FROM v_b_client_support_credit_ledger
       WHERE ticket_id IS NOT NULL AND kind = 'debit'
         ${sinceIso ? " AND created_at >= $1" : ""}
         ${untilIso ? ` AND created_at <= $${sinceIso ? 2 : 1}` : ""}
         ${filters.clientId != null ? ` AND client_id = $${[sinceIso, untilIso].filter(Boolean).length + 1}` : ""}`,
      [sinceIso, untilIso, filters.clientId].filter((value) => value != null)
    ),
    queryRowsOrEmpty(
      `SELECT client_id, COUNT(*)::int AS total
       FROM v_b_equipment_checkmk_monitoring
       WHERE 1=1${clientIdWhere}
       GROUP BY client_id`,
      clientParams
    ),
    queryRowsOrEmpty(
      `SELECT client_id, COUNT(*)::int AS total
       FROM v_b_rmm_agents
       WHERE COALESCE(status, 'active') = 'active'${clientIdWhere}
       GROUP BY client_id`,
      clientParams
    ),
    queryRowsOrEmpty(
      `SELECT COUNT(*)::int AS total
       FROM v_b_clients_m_ordinateurs
       WHERE created_at IS NOT NULL
         ${sinceIso ? " AND created_at >= $1" : ""}
         ${untilIso ? ` AND created_at <= $${sinceIso ? 2 : 1}` : ""}
         ${filters.clientId != null ? ` AND client_id = $${[sinceIso, untilIso].filter(Boolean).length + 1}` : ""}`,
      [sinceIso, untilIso, filters.clientId].filter((value) => value != null)
    ),
    queryRowsOrEmpty(
      `SELECT COUNT(*)::int AS total
       FROM v_b_clients_m_ordinateurs
       WHERE COALESCE(is_active, TRUE) = FALSE
         ${sinceIso ? " AND updated_at >= $1" : ""}
         ${untilIso ? ` AND updated_at <= $${sinceIso ? 2 : 1}` : ""}
         ${filters.clientId != null ? ` AND client_id = $${[sinceIso, untilIso].filter(Boolean).length + 1}` : ""}`,
      [sinceIso, untilIso, filters.clientId].filter((value) => value != null)
    ),
    queryRowsOrEmpty(
      `SELECT date_trunc('month', created_at)::date AS bucket, COUNT(*)::int AS total
       FROM v_b_clients
       WHERE created_at IS NOT NULL
         ${sinceIso ? " AND created_at >= $1" : ""}
         ${untilIso ? ` AND created_at <= $${sinceIso ? 2 : 1}` : ""}
         ${filters.clientId != null ? ` AND id = $${[sinceIso, untilIso].filter(Boolean).length + 1}` : ""}
       GROUP BY 1 ORDER BY 1`,
      [sinceIso, untilIso, filters.clientId].filter((value) => value != null)
    )
  ]);

  const familyCounts = await Promise.all(SYSTEM_MONITORABLE_FAMILIES.map((fam) => queryRowsOrEmpty(
    `SELECT client_id, COUNT(*)::int AS total
     FROM ${fam.table}
     WHERE ${fam.where}${filters.clientId != null ? " AND client_id = $1" : ""}
     GROUP BY client_id`,
    clientParams
  )));

  const fleetByClient = new Map();
  const fleetByFamily = new Map();
  SYSTEM_MONITORABLE_FAMILIES.forEach((fam, index) => {
    (familyCounts[index] || []).forEach((row) => {
      const cid = String(row.client_id);
      const rec = fleetByClient.get(cid) || { total: 0, families: {} };
      const count = Number(row.total) || 0;
      rec.total += count;
      rec.families[fam.key] = (rec.families[fam.key] || 0) + count;
      fleetByClient.set(cid, rec);
      fleetByFamily.set(fam.key, (fleetByFamily.get(fam.key) || 0) + count);
    });
  });
  const managedByClient = new Map();
  checkmkRows.forEach((row) => {
    managedByClient.set(String(row.client_id), (managedByClient.get(String(row.client_id)) || 0) + (Number(row.total) || 0));
  });
  rmmRows.forEach((row) => {
    managedByClient.set(String(row.client_id), (managedByClient.get(String(row.client_id)) || 0) + (Number(row.total) || 0));
  });

  const creditsByClient = new Map();
  let creditsExpiringSoon = 0;
  creditPackRows.forEach((row) => {
    const cid = String(row.client_id);
    const rec = creditsByClient.get(cid) || { initial: 0, remaining: 0 };
    rec.initial += Number(row.initial_amount) || 0;
    rec.remaining += Number(row.remaining_amount) || 0;
    creditsByClient.set(cid, rec);
    if (row.valid_until) {
      const until = new Date(row.valid_until);
      if (!Number.isNaN(until.getTime()) && until >= now && until <= inDays(30)) creditsExpiringSoon += 1;
    }
  });

  const slaTicketIds = new Set(ledgerRows.map((row) => String(row.ticket_id)));
  let ticketsIncluded = ledgerRows.length;
  let ticketsSales = 0;
  let ticketsSupport = 0;
  ticketRows.forEach((row) => {
    const type = String(row.type || "");
    const category = String(row.category || "");
    const sales = type === "prestation" || type === "installation" || category.startsWith("prestation-") || category.startsWith("installation-");
    const total = Number(row.total) || 0;
    if (sales) ticketsSales += total;
    else ticketsSupport += total;
  });
  const ticketsOutOfBundle = Math.max(0, ticketsSupport - ticketsIncluded);
  const ticketsBillable = ticketsSales + ticketsOutOfBundle;

  const slaRow = slaRows[0] || {};
  const slaTickets = Number(slaRow.sla_tickets) || 0;
  const slaMet = Number(slaRow.met) || 0;
  const slaBreached = Number(slaRow.breached) || 0;

  const renewal = {
    days30: { count: 0, clients: [] },
    days90: { count: 0, clients: [] },
    days180: { count: 0, clients: [] },
    daysMore: { count: 0, clients: [] }
  };
  const byStatusMap = new Map();
  const byOfferMap = new Map();
  const topByMrr = [];
  const creditClients = [];
  const fleetClients = [];
  const atRiskClients = [];
  const mrrPoints = [];
  const healthScores = [];
  let companiesTotal = clientRows.length;
  let active = 0;
  let onboarding = 0;
  let terminated = 0;
  let withoutContract = 0;
  let contractsActive = 0;
  let contractsExpiring = 0;
  let noRenewalDate = 0;
  let slaActive = 0;
  let withoutSla = 0;
  let criticalSla = 0;
  let mrrTotal = 0;
  let mrrCount = 0;
  let atRisk = 0;
  let underContract = 0;
  let outOfContract = 0;
  let managed = 0;
  let coveredByOption = 0;
  let activeSites = 0;
  let optionsActive = 0;

  const bumpStatus = (key) => byStatusMap.set(key, (byStatusMap.get(key) || 0) + 1);

  clientRows.forEach((row) => {
    const contrat = parseContratJson(row.contrat);
    const options = parseContratJson(row.options);
    const modulesJson = parseContratJson(row.modules);
    const sites = Array.isArray(row.sites) ? row.sites : [];
    activeSites += sites.length;
    const cid = String(row.id);
    const name = row.name || cid;
    const suspended = Boolean(contrat.suspendu);
    const exp = contrat.expiration ? new Date(contrat.expiration) : null;
    const expOk = exp && !Number.isNaN(exp.getTime());
    const expired = expOk && exp < now;
    const hasContract = Boolean(contrat.expiration || contrat.debut || contrat.type || contrat.sla || Object.keys(contrat).length > 0) && Object.keys(contrat).some((key) => contrat[key] != null && contrat[key] !== "" && contrat[key] !== false);
    const createdAt = row.created_at ? new Date(row.created_at) : null;
    const debut = contrat.debut ? new Date(contrat.debut) : null;
    const isOnboarding = !expired && !suspended && (
      (createdAt && createdAt >= onboardingFrom) ||
      (debut && !Number.isNaN(debut.getTime()) && debut >= onboardingFrom)
    );
    let status = "active";
    if (!hasContract) {
      status = "none";
      withoutContract += 1;
    } else if (suspended || expired) {
      status = "terminated";
      terminated += 1;
    } else if (isOnboarding) {
      status = "onboarding";
      onboarding += 1;
    } else {
      active += 1;
    }
    bumpStatus(status);

    if (hasContract && !expired && !suspended) {
      contractsActive += 1;
      underContract += fleetByClient.get(cid)?.total || 0;
    } else {
      outOfContract += fleetByClient.get(cid)?.total || 0;
    }
    if (expOk && exp >= now && exp <= inDays(30) && !suspended) contractsExpiring += 1;
    if (hasContract && !expOk) noRenewalDate += 1;

    const sla = parseClientSla(contrat);
    if (sla.enabled) {
      slaActive += 1;
      const urgentHours = Number(sla.byPriority?.urgent?.resolutionHours ?? sla.byPriority?.critical?.resolutionHours);
      if (Number.isFinite(urgentHours) && urgentHours <= 4) criticalSla += 1;
    } else if (hasContract) {
      withoutSla += 1;
    }

    const offer = String(contrat.type || "").trim() || "unknown";
    byOfferMap.set(offer, (byOfferMap.get(offer) || 0) + 1);

    const monthly = parseMoneyField(contrat, ["montantMensuel", "mrr", "caMensuel", "prixMensuel", "montant"]);
    const yearly = parseMoneyField(contrat, ["montantAnnuel", "caAnnuel"]);
    const mrr = monthly != null ? monthly : yearly != null ? yearly / 12 : null;
    if (mrr != null && hasContract && !expired && !suspended) {
      mrrTotal += mrr;
      mrrCount += 1;
      topByMrr.push({ id: cid, name, value: round1(mrr) });
      mrrPoints.push({ createdAt, mrr });
    }

    if (expOk && !expired && !suspended) {
      const clientRef = { id: cid, name, expiration: exp.toISOString().slice(0, 10) };
      if (exp <= inDays(30)) {
        renewal.days30.count += 1;
        renewal.days30.clients.push(clientRef);
      } else if (exp <= inDays(90)) {
        renewal.days90.count += 1;
        renewal.days90.clients.push(clientRef);
      } else if (exp <= inDays(180)) {
        renewal.days180.count += 1;
        renewal.days180.clients.push(clientRef);
      } else {
        renewal.daysMore.count += 1;
        renewal.daysMore.clients.push(clientRef);
      }
    }

    const credit = creditsByClient.get(cid) || { initial: 0, remaining: 0 };
    const consumed = Math.max(0, credit.initial - credit.remaining);
    const pct = credit.initial > 0 ? roundPct((consumed / credit.initial) * 100) : null;
    let creditState = "ok";
    if (credit.initial > 0 && credit.remaining <= 0) creditState = "over";
    else if (pct != null && pct >= 85) creditState = "warn";
    if (credit.initial > 0) {
      creditClients.push({
        id: cid,
        name,
        credit: credit.initial,
        consumed,
        remaining: credit.remaining,
        pct,
        state: creditState
      });
    }

    const optionOn = (key) => Boolean(options[key] || modulesJson[key]);
    const enabledOptions = Object.keys({ ...options, ...modulesJson }).filter((key) => optionOn(key));
    optionsActive += enabledOptions.length;
    const monitoringOn = optionOn("Monitoring") || optionOn("Support");
    const backupOn = optionOn("Preventif") || optionOn("backup");
    const fleetTotal = fleetByClient.get(cid)?.total || 0;
    const managedCount = managedByClient.get(cid) || 0;
    managed += managedCount;
    if (monitoringOn) coveredByOption += fleetTotal;

    let health = 100;
    if (!hasContract) health -= 25;
    if (expired || suspended) health -= 40;
    if (expOk && exp >= now && exp <= inDays(30)) health -= 20;
    if (creditState === "over") health -= 15;
    else if (creditState === "warn") health -= 8;
    if (!sla.enabled && hasContract) health -= 10;
    health = Math.max(0, Math.min(100, health));
    healthScores.push(health);
    const risk = health < 60 || expired || suspended || creditState === "over";
    if (risk) {
      atRisk += 1;
      const reasons = [];
      if (expired) reasons.push("expired");
      if (suspended) reasons.push("suspended");
      if (creditState === "over") reasons.push("credit");
      if (health < 60) reasons.push("health");
      if (expOk && exp >= now && exp <= inDays(30)) reasons.push("renewal");
      atRiskClients.push({
        id: cid,
        name,
        health,
        reasons
      });
    }

    if (fleetTotal > 0 || hasContract) {
      fleetClients.push({
        id: cid,
        name,
        contract: suspended ? "suspended" : expired ? "expired" : hasContract ? "active" : "none",
        sla: sla.enabled ? "on" : "off",
        creditPct: pct,
        monitoring: monitoringOn,
        backup: backupOn,
        families: fleetByClient.get(cid)?.families || {},
        coveragePct: fleetTotal > 0 ? roundPct((managedCount / fleetTotal) * 100) : null,
        total: fleetTotal
      });
    }
  });

  renewal.days30.clients.sort((a, b) => String(a.expiration).localeCompare(String(b.expiration)));
  renewal.days90.clients.sort((a, b) => String(a.expiration).localeCompare(String(b.expiration)));
  renewal.days180.clients.sort((a, b) => String(a.expiration).localeCompare(String(b.expiration)));

  const creditsInitial = [...creditsByClient.values()].reduce((sum, row) => sum + row.initial, 0);
  const creditsRemaining = [...creditsByClient.values()].reduce((sum, row) => sum + row.remaining, 0);
  const creditsConsumed = Math.max(0, creditsInitial - creditsRemaining);
  const overLimit = creditClients.filter((row) => row.state === "over").length;
  const nearEmpty = creditClients.filter((row) => row.state === "warn").length;

  const optionAdoption = (modules || []).map((mod) => ({
    key: mod.key,
    label: mod.label,
    count: Number(mod.count) || 0,
    pct: companiesTotal > 0 ? roundPct(((Number(mod.count) || 0) / companiesTotal) * 100) : 0
  }));
  const unusedOptions = optionAdoption.filter((row) => row.count === 0).length;
  const servicesActive = (solutions || []).reduce((sum, row) => sum + (Number(row.count) || 0), 0);

  const fleetTotalAll = [...fleetByClient.values()].reduce((sum, row) => sum + row.total, 0);
  const unmanaged = Math.max(0, fleetTotalAll - managed);
  const withoutCoverage = Math.max(0, fleetTotalAll - coveredByOption);

  const clientTrend = [];
  const mrrTrend = [];
  if (sinceIso && untilIso) {
    const months = [];
    const cursor = new Date(new Date(sinceIso).getFullYear(), new Date(sinceIso).getMonth(), 1);
    const end = new Date(new Date(untilIso).getFullYear(), new Date(untilIso).getMonth(), 1);
    while (cursor <= end && months.length < 12) {
      months.push(new Date(cursor));
      cursor.setMonth(cursor.getMonth() + 1);
    }
    const createdMap = new Map(clientCreatedRows.map((row) => [toIsoDate(row.bucket), Number(row.total) || 0]));
    let running = Math.max(0, companiesTotal - clientCreatedRows.reduce((sum, row) => sum + (Number(row.total) || 0), 0));
    months.forEach((month) => {
      const key = toIsoDate(month);
      running += createdMap.get(key) || 0;
      clientTrend.push({ date: key, value: running });
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);
      const mrrValue = mrrPoints.reduce((sum, point) => {
        if (!point.createdAt || point.createdAt <= monthEnd) return sum + point.mrr;
        return sum;
      }, 0);
      mrrTrend.push({ date: key, value: round1(mrrValue) });
    });
  }

  const healthScore = healthScores.length ? roundPct(healthScores.reduce((sum, value) => sum + value, 0) / healthScores.length) : null;

  return {
    ...empty,
    overview: {
      companiesTotal,
      active,
      onboarding,
      terminated,
      mrr: mrrCount ? round1(mrrTotal) : null,
      contractsActive,
      contractsExpiring,
      withoutContract,
      healthScore,
      atRisk
    },
    byStatus: [...byStatusMap.entries()].map(([key, value]) => ({ key, value })),
    clientTrend,
    mrrTrend,
    byOffer: [...byOfferMap.entries()].map(([key, value]) => ({ key, value })),
    topByMrr: topByMrr.sort((a, b) => b.value - a.value).slice(0, 10),
    contracts: {
      active: contractsActive,
      expiring30: renewal.days30.count,
      expiring90: renewal.days90.count,
      noRenewalDate,
      slaActive,
      slaMet,
      slaMetPct: slaTickets > 0 ? roundPct((slaMet / slaTickets) * 100) : null,
      slaBreached,
      ticketsOutOfSla: slaBreached,
      withoutSla,
      criticalSla
    },
    renewal,
    credits: {
      available: creditsInitial,
      consumed: creditsConsumed,
      remaining: creditsRemaining,
      consumptionPct: creditsInitial > 0 ? roundPct((creditsConsumed / creditsInitial) * 100) : null,
      expiringSoon: creditsExpiringSoon,
      overLimit,
      nearEmpty,
      ticketsIncluded,
      ticketsOutOfBundle,
      ticketsBillable
    },
    creditClients: creditClients.sort((a, b) => (b.pct || 0) - (a.pct || 0)).slice(0, 40),
    options: {
      active: optionsActive,
      perCompany: companiesTotal > 0 ? round1(optionsActive / companiesTotal) : null,
      servicesActive,
      servicesExpired: 0,
      expiringSoon: 0,
      unused: unusedOptions,
      overused: 0,
      monthlyValue: mrrCount ? round1(mrrTotal) : null,
      yearlyValue: mrrCount ? round1(mrrTotal * 12) : null
    },
    optionAdoption,
    fleet: {
      underContract,
      outOfContract,
      managed,
      unmanaged,
      avgPerClient: companiesTotal > 0 ? round1(fleetTotalAll / companiesTotal) : null,
      coveredByOption,
      withoutCoverage,
      added: Number(siteAddedRows[0]?.total) || 0,
      removed: Number(siteRemovedRows[0]?.total) || 0,
      activeSites,
      coveragePct: fleetTotalAll > 0 ? roundPct((underContract / fleetTotalAll) * 100) : null
    },
    fleetClients: fleetClients.sort((a, b) => b.total - a.total).slice(0, 40),
    atRiskClients: atRiskClients.sort((a, b) => a.health - b.health).slice(0, 40)
  };
}

async function fetchReportsStats({
  sinceIso,
  untilIso,
  filters = {}
}) {
  if (!(await tableExists("public.document_history"))) {
    return {
      available: false,
      total: 0,
      inPeriod: 0,
      byType: [],
      monthlyTrend: []
    };
  }
  const params = [];
  const periodClause = buildRangeClause(params, "r.created_at", sinceIso, untilIso);
  let scopeClause = "";
  if (filters.agentId) {
    params.push(filters.agentId);
    scopeClause += ` AND r.user_id = $${params.length}::uuid`;
  }
  const reportWhere = `WHERE COALESCE(r.is_trashed, false) = false${periodClause}${scopeClause}`;
  const [overviewResult, typeResult, trendResult] = await Promise.all([pool.query(`SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE true${periodClause}${scopeClause})::int AS in_period
       FROM document_history r
       WHERE COALESCE(r.is_trashed, false) = false`, params), pool.query(`SELECT LOWER(COALESCE(r.type, 'monitoring')) AS key, COUNT(*)::int AS count
       FROM document_history r
       ${reportWhere}
       GROUP BY 1
       ORDER BY count DESC`, params), pool.query(`SELECT date_trunc('month', r.created_at)::date AS period, COUNT(*)::int AS count
       FROM document_history r
       ${reportWhere}
       GROUP BY 1
       ORDER BY 1 ASC`, params)]);
  const overview = overviewResult.rows[0] || {};
  return {
    available: true,
    total: Number(overview.total) || 0,
    inPeriod: Number(overview.in_period) || 0,
    byType: mapCountRows(typeResult.rows, {
      monitoring: "Monitoring",
      synthese: "Summary",
      intervention: "Intervention",
      crav: "CRAV"
    }),
    monthlyTrend: buildTrend(trendResult.rows)
  };
}
async function fetchDevicesStats({
  sinceIso,
  untilIso,
  filters = {}
} = {}) {
  const equipmentStats = await fetchMonitorableEquipmentStats();
  const clientParams = filters.clientId != null ? [filters.clientId] : [];
  const clientWhere = filters.clientId != null ? " AND client_id = $1" : "";
  const [agentsResult, rmmResult, computersResult] = await Promise.all([countTableOrZero(`SELECT COUNT(*)::int AS count FROM v_b_users WHERE is_active = true AND COALESCE(role, '') <> 'client'`), tableExists("public.v_b_rmm_agents").then(ok => ok ? pool.query(`SELECT
           COUNT(*) FILTER (WHERE COALESCE(status, 'active') = 'active')::int AS active,
           COUNT(*) FILTER (WHERE COALESCE(status, 'active') = 'active' AND last_seen_at >= NOW() - INTERVAL '15 minutes')::int AS online
         FROM v_b_rmm_agents
         WHERE 1=1${clientWhere}`, clientParams).catch(() => ({
    rows: [{
      active: 0,
      online: 0
    }]
  })) : {
    rows: [{
      active: 0,
      online: 0
    }]
  }), tableExists("public.v_b_clients_m_ordinateurs").then(ok => ok ? pool.query(`SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE COALESCE(is_active, TRUE) = TRUE)::int AS active
         FROM v_b_clients_m_ordinateurs
         WHERE client_id IS NOT NULL${clientWhere}`, clientParams).catch(() => ({
    rows: [{
      total: 0,
      active: 0
    }]
  })) : {
    rows: [{
      total: 0,
      active: 0
    }]
  })]);
  const rmmRow = rmmResult.rows?.[0] || {};
  const computersRow = computersResult.rows?.[0] || {};
  return {
    equipTotal: equipmentStats.equipMonitoredTotal || 0,
    equipMonitoredTotal: equipmentStats.equipMonitoredTotal || 0,
    equipUnderSurveillanceCount: equipmentStats.equipUnderSurveillanceCount || 0,
    equipSurveillancePercent: roundPct(equipmentStats.equipSurveillancePercent),
    families: (equipmentStats.families || []).map(row => ({
      key: row.key || row.family,
      label: row.label || row.key,
      icon: row.icon || null,
      count: Number(row.count) || 0,
      monitored: Number(row.monitoredCount || row.monitored) || 0
    })),
    activeAgents: Number(agentsResult) || 0,
    rmmAgents: Number(rmmRow.active) || 0,
    rmmOnline: Number(rmmRow.online) || 0,
    computersTotal: Number(computersRow.total) || 0,
    computersActive: Number(computersRow.active) || 0,
    cockpit: await fetchDevicesCockpitStatsSafe({
      sinceIso,
      untilIso,
      filters,
      equipmentStats,
      rmmRow,
      computersRow
    })
  };
}

function familyCount(families, key) {
  const row = (families || []).find((item) => String(item.key || item.family) === key);
  return Number(row?.count) || 0;
}

function emptyDevicesCockpit() {
  return {
    overview: {
      fleetTotal: 0,
      active: 0,
      offline: 0,
      anomaly: 0,
      unsupervised: 0,
      healthScore: null,
      availability: null,
      sitesAtRisk: 0,
      fleetDelta: 0,
      byType: []
    },
    healthRing: { ok: 0, warning: 0, critical: 0, offline: 0, unknown: 0 },
    healthTrend: [],
    byType: [],
    clientsAtRisk: [],
    network: {
      internet: 0,
      internetAvailability: null,
      networkIncidents: 0,
      routers: 0,
      firewalls: 0,
      switches: 0,
      wifi: 0,
      offline: 0,
      sitesWithoutRedundancy: 0,
      avgLatencyMs: null
    },
    internetAvailabilityByClient: [],
    networkStatus: { ok: 0, warning: 0, critical: 0, offline: 0 },
    sitesWithIssues: [],
    networkIncidentTrend: [],
    internetTech: [],
    systems: {
      physicalServers: 0,
      vms: 0,
      hypervisors: 0,
      nasSan: 0,
      capacityTotalGb: null,
      capacityUsedGb: null,
      storageOver80: 0,
      raidDegraded: 0,
      backupsOk: 0,
      backupsFailed: 0,
      serversAnomaly: 0,
      serversEol: 0
    },
    physicalVsVirtual: { physical: 0, virtual: 0 },
    cpuRam: { cpuAvg: null, ramAvg: null },
    storageCapacity: [],
    backupStatus: { ok: 0, failed: 0, unknown: 0 },
    infraAtRisk: [],
    peripherals: {
      computers: 0,
      printers: 0,
      projectors: 0,
      screens: 0,
      pdus: 0,
      ups: 0,
      av: 0,
      offline: 0,
      anomaly: 0,
      avgAgeYears: null
    },
    peripheralByType: [],
    peripheralStatus: { ok: 0, warning: 0, critical: 0, offline: 0 },
    ageBuckets: [],
    fleetTrend: [],
    topAnomalyEquipment: [],
    lifecycle: {
      healthScore: null,
      eol: 0,
      eos: 0,
      warrantyExpired: 0,
      warrantySoon: 0,
      firmwareObsolete: null,
      unsupervised: 0,
      spof: 0,
      critical: 0,
      withoutBackupConfig: 0
    },
    eolByVendor: [],
    eolByClient: [],
    risksByClient: [],
    renewalHorizon: { months6: 0, months12: 0, months24: 0 }
  };
}

async function fetchDevicesCockpitStatsSafe(args) {
  try {
    return await fetchDevicesCockpitStats(args);
  } catch (error) {
    console.error("[dashboard] devices cockpit stats failed:", error);
    return emptyDevicesCockpit();
  }
}

async function fetchJsonRows(table, filters = {}) {
  const params = [];
  let extra = "";
  if (filters.clientId != null) {
    params.push(filters.clientId);
    extra = ` AND client_id = $${params.length}`;
  }
  return queryRowsOrEmpty(
    `SELECT client_id, data
     FROM ${table}
     WHERE data IS NOT NULL
       ${extra}`,
    params
  );
}

function parseWarrantyDate(data) {
  if (!data || typeof data !== "object") return null;
  const raw = data.expirationGarantie || data.expiration_garantie || data.garantie || data.warrantyEnd || "";
  const text = String(raw).trim();
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parsePurchaseDate(data) {
  if (!data || typeof data !== "object") return null;
  const raw = data.dateAchat || data.date_achat || data.purchaseDate || "";
  const text = String(raw).trim();
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseNumberField(data, keys) {
  if (!data || typeof data !== "object") return null;
  for (const key of keys) {
    const raw = data[key];
    if (raw == null || raw === "") continue;
    const value = Number(String(raw).replace(",", "."));
    if (Number.isFinite(value)) return value;
  }
  return null;
}

async function fetchDevicesCockpitStats({
  sinceIso,
  untilIso,
  filters = {},
  equipmentStats,
  rmmRow,
  computersRow
}) {
  const empty = emptyDevicesCockpit();
  const families = equipmentStats?.families || [];
  const fleetTotal = Number(equipmentStats?.equipMonitoredTotal) || 0;
  const supervised = Number(equipmentStats?.equipUnderSurveillanceCount) || 0;
  const unsupervised = Math.max(0, fleetTotal - supervised);
  const clientParams = filters.clientId != null ? [filters.clientId] : [];
  const clientWhere = filters.clientId != null ? " AND client_id = $1" : "";
  const period = sinceIso
    ? {
        from: new Date(sinceIso),
        to: untilIso ? new Date(untilIso) : new Date()
      }
    : null;

  const [
    checkmkRows,
    alertRows,
    internetRows,
    serverRows,
    storageRows,
    backupRows,
    computerRows,
    powerRows,
    firewallRows,
    switchRows,
    wifiRows,
    routerRows
  ] = await Promise.all([
    queryRowsOrEmpty(
      `SELECT client_id, equipment_family, equipment_id, monitoring_data, host_details, last_synced_at
       FROM v_b_equipment_checkmk_monitoring
       WHERE 1=1${clientWhere}`,
      clientParams
    ),
    queryRowsOrEmpty(
      `SELECT client_id, equipment_family, equipment_name, last_known_status
       FROM v_b_equipment_monitoring_alerts
       WHERE last_known_status IS NOT NULL${clientWhere}`,
      clientParams
    ),
    fetchJsonRows("v_b_clients_m_internet", filters),
    fetchJsonRows("v_b_clients_m_servers", filters),
    fetchJsonRows("v_b_clients_m_stockage", filters),
    queryRowsOrEmpty(
      `SELECT client_id, data, last_backup_date
       FROM v_b_clients_m_save
       WHERE data IS NOT NULL${clientWhere}`,
      clientParams
    ),
    fetchJsonRows("v_b_clients_m_ordinateurs", filters),
    fetchJsonRows("v_b_clients_m_alimentation", filters),
    fetchJsonRows("v_b_clients_m_firewall", filters),
    fetchJsonRows("v_b_clients_m_switch", filters),
    fetchJsonRows("v_b_clients_m_wifi", filters),
    fetchJsonRows("v_b_clients_m_routeur", filters)
  ]);

  const healthRing = { ok: 0, warning: 0, critical: 0, offline: 0, unknown: 0 };
  const clientRisk = new Map();
  const networkStatus = { ok: 0, warning: 0, critical: 0, offline: 0 };
  const peripheralStatus = { ok: 0, warning: 0, critical: 0, offline: 0 };
  const internetHealthByClient = new Map();
  const NETWORK_FAMILIES = new Set(["internet", "routeur", "router", "firewalls", "firewall", "switch", "bornewifi", "wifi"]);
  const PERIPH_FAMILIES = new Set(["ordinateurs", "computers", "alimentation", "toip", "videosurveillance", "custom"]);

  const bumpRisk = (clientId, amount = 1) => {
    if (clientId == null) return;
    const key = String(clientId);
    clientRisk.set(key, (clientRisk.get(key) || 0) + amount);
  };

  const applyState = (state, family, clientId) => {
    const key = ["ok", "warning", "critical", "offline"].includes(state) ? state : "unknown";
    healthRing[key] = (healthRing[key] || 0) + 1;
    const fam = String(family || "").toLowerCase();
    if (NETWORK_FAMILIES.has(fam) && networkStatus[key] != null) {
      networkStatus[key] += 1;
    }
    if (PERIPH_FAMILIES.has(fam) && peripheralStatus[key] != null) {
      peripheralStatus[key] += 1;
    }
    if (fam === "internet" && clientId != null) {
      const cid = String(clientId);
      const rec = internetHealthByClient.get(cid) || { ok: 0, total: 0 };
      rec.total += 1;
      if (key === "ok" || key === "warning") rec.ok += 1;
      internetHealthByClient.set(cid, rec);
    }
  };

  checkmkRows.forEach((row) => {
    const summary = computeMonitoringSummary(row.monitoring_data, row.last_synced_at, row.host_details || null);
    const status = String(summary.status || "no_data").toLowerCase();
    const state = status === "critical"
      ? "critical"
      : status === "warning"
        ? "warning"
        : status === "ok"
          ? "ok"
          : "unknown";
    applyState(state, row.equipment_family, row.client_id);
    if (state !== "ok" && state !== "unknown") {
      bumpRisk(row.client_id, state === "critical" ? 3 : 1);
    }
  });

  alertRows.forEach((row) => {
    const status = String(row.last_known_status || "").toLowerCase();
    if (status === "offline") {
      applyState("offline", row.equipment_family, row.client_id);
      bumpRisk(row.client_id, 3);
    } else if (status === "critical") {
      bumpRisk(row.client_id, 2);
    }
    if (status === "critical" || status === "warning" || status === "offline") {
      const weight = status === "offline" || status === "critical" ? 3 : 1;
      anomalyEquipment.push({
        name: row.equipment_name || row.equipment_family || "Équipement",
        value: weight,
        status
      });
    }
  });

  const rmmAgents = Number(rmmRow?.active) || 0;
  const rmmOnline = Number(rmmRow?.online) || 0;
  const rmmOffline = Math.max(0, rmmAgents - rmmOnline);
  healthRing.offline += rmmOffline;
  if (rmmOffline) bumpRisk(filters.clientId, rmmOffline);

  const offline = Number(healthRing.offline) || 0;
  const anomaly = (Number(healthRing.warning) || 0) + (Number(healthRing.critical) || 0);
  const active = Math.max(0, fleetTotal - offline);
  const monitoredHealth = healthRing.ok + healthRing.warning + healthRing.critical + healthRing.offline;
  const healthScore = monitoredHealth > 0
    ? roundPct((healthRing.ok / monitoredHealth) * 100)
    : null;
  const availability = monitoredHealth > 0
    ? roundPct(((monitoredHealth - healthRing.offline) / monitoredHealth) * 100)
    : null;

  const internetByClient = new Map();
  const internetTech = new Map();
  internetRows.forEach((row) => {
    const data = row.data && typeof row.data === "object" ? row.data : {};
    const cid = row.client_id == null ? "" : String(row.client_id);
    internetByClient.set(cid, (internetByClient.get(cid) || 0) + 1);
    const tech = String(data.internetType || data.technologie || data.technology || data.type || "Autre").trim() || "Autre";
    internetTech.set(tech, (internetTech.get(tech) || 0) + 1);
  });
  const sitesWithoutRedundancy = [...internetByClient.values()].filter((count) => count === 1).length;

  let physicalServers = 0;
  let vms = 0;
  let hypervisors = 0;
  let serversEol = 0;
  let serversAnomaly = 0;
  let capacityTotalGb = 0;
  let capacityUsedGb = 0;
  let storageOver80 = 0;
  let raidDegraded = 0;
  let backupsOk = 0;
  let backupsFailed = 0;
  let printers = 0;
  let projectors = 0;
  let screens = 0;
  let pdus = 0;
  let ups = 0;
  let av = 0;
  let ageSum = 0;
  let ageCount = 0;
  let warrantyExpired = 0;
  let warrantySoon = 0;
  let eol = 0;
  let renewal6 = 0;
  let renewal12 = 0;
  let renewal24 = 0;
  const eolByVendor = new Map();
  const eolByClientMap = new Map();
  const anomalyEquipment = [];
  const now = new Date();
  const inMonths = (n) => new Date(now.getFullYear(), now.getMonth() + n, now.getDate());

  const inspectLifecycle = (data, clientId) => {
    const warranty = parseWarrantyDate(data);
    if (!warranty) return false;
    const vendor = String(data.marque || data.brand || data.constructeur || data.manufacturer || "Autre").trim() || "Autre";
    if (warranty < now) {
      warrantyExpired += 1;
      eol += 1;
      eolByVendor.set(vendor, (eolByVendor.get(vendor) || 0) + 1);
      if (clientId != null) {
        const cid = String(clientId);
        eolByClientMap.set(cid, (eolByClientMap.get(cid) || 0) + 1);
      }
      return true;
    }
    if (warranty < inMonths(6)) {
      warrantySoon += 1;
      renewal6 += 1;
    } else if (warranty < inMonths(12)) {
      renewal12 += 1;
    } else if (warranty < inMonths(24)) {
      renewal24 += 1;
    }
    return false;
  };

  serverRows.forEach((row) => {
    const data = row.data && typeof row.data === "object" ? row.data : {};
    const type = String(data.typeServer || data.type || "").toLowerCase();
    if (type.includes("virt") || type.includes("vm")) vms += 1;
    else physicalServers += 1;
    if (data.hypervisor || type.includes("hyper")) hypervisors += 1;
    if (inspectLifecycle(data, row.client_id)) serversEol += 1;
    const cpu = parseNumberField(data, ["cpuUsage", "cpu", "cpuPercent"]);
    const ram = parseNumberField(data, ["ramUsage", "ram", "ramPercent"]);
    if ((cpu != null && cpu >= 90) || (ram != null && ram >= 90)) {
      serversAnomaly += 1;
      bumpRisk(row.client_id, 2);
    }
  });

  storageRows.forEach((row) => {
    const data = row.data && typeof row.data === "object" ? row.data : {};
    inspectLifecycle(data, row.client_id);
    const total = parseNumberField(data, ["capaciteTotale", "capacite", "capacityTotal", "totalGb", "size"]);
    const used = parseNumberField(data, ["capaciteUtilisee", "capacityUsed", "usedGb"]);
    const pct = parseNumberField(data, ["usedPercent", "usedPct", "pourcentage"]);
    if (total != null) capacityTotalGb += total;
    if (used != null) capacityUsedGb += used;
    let usedPct = pct != null ? pct : total > 0 && used != null ? (used / total) * 100 : null;
    const disks = data.disks || data.storage || data.volumes || data.hardware?.disks;
    if (usedPct == null && Array.isArray(disks)) {
      const diskPcts = disks.map((disk) => Number(disk?.usedPct ?? disk?.used_pct ?? disk?.percent)).filter(Number.isFinite);
      if (diskPcts.length) usedPct = Math.max(...diskPcts);
    }
    if (usedPct != null && usedPct >= 80) storageOver80 += 1;
    const raid = String(data.raidStatus || data.raid || "").toLowerCase();
    if (raid && (raid.includes("degrad") || raid.includes("fail") || raid === "critical")) raidDegraded += 1;
  });

  backupRows.forEach((row) => {
    const data = row.data && typeof row.data === "object" ? row.data : {};
    inspectLifecycle(data, row.client_id);
    const backupDate = row.last_backup_date ? new Date(row.last_backup_date) : null;
    const status = String(data.lastStatus || data.status || data.etat || "").toLowerCase();
    const recent = backupDate && !Number.isNaN(backupDate.getTime())
      ? (now.getTime() - backupDate.getTime()) <= 7 * 86400000
      : null;
    if (recent === true || ["ok", "success", "completed", "reussi", "réussi"].includes(status)) backupsOk += 1;
    else if (recent === false || ["fail", "failed", "error", "ko", "echec", "échec"].includes(status)) backupsFailed += 1;
  });

  computerRows.forEach((row) => {
    const data = row.data && typeof row.data === "object" ? row.data : {};
    inspectLifecycle(data, row.client_id);
    const purchase = parsePurchaseDate(data);
    if (purchase) {
      const years = (now.getTime() - purchase.getTime()) / (365.25 * 24 * 3600 * 1000);
      if (years >= 0 && years < 30) {
        ageSum += years;
        ageCount += 1;
      }
    }
  });

  powerRows.forEach((row) => {
    const data = row.data && typeof row.data === "object" ? row.data : {};
    inspectLifecycle(data, row.client_id);
    const type = String(data.alimentationType || data.type || data.kind || "").toLowerCase();
    if (type.includes("pdu")) pdus += 1;
    else if (type.includes("ondul") || type.includes("ups")) ups += 1;
  });

  [internetRows, firewallRows, switchRows, wifiRows, routerRows].forEach((rows) => {
    rows.forEach((row) => inspectLifecycle(row.data && typeof row.data === "object" ? row.data : {}, row.client_id));
  });

  const customRows = await queryRowsOrEmpty(
    `SELECT client_id, type, data FROM v_b_clients_m_custom_equipment WHERE data IS NOT NULL${clientWhere}`,
    clientParams
  );
  customRows.forEach((row) => {
    const data = row.data && typeof row.data === "object" ? row.data : {};
    inspectLifecycle(data, row.client_id);
    const type = String(row.type || data.type || "").toLowerCase();
    if (type.includes("imprim")) printers += 1;
    else if (type.includes("video") || type.includes("project")) projectors += 1;
    else if (type.includes("ecran") || type.includes("écran") || type.includes("screen") || type.includes("monitor")) screens += 1;
    else if (type.includes("audio") || type.includes("visuel") || type.includes("tv")) av += 1;
  });

  const networkIncidentTrend = [];
  const fleetTrend = [];
  if (period?.from && period?.to) {
    const months = [];
    const cursor = new Date(period.from.getFullYear(), period.from.getMonth(), 1);
    const end = new Date(period.to.getFullYear(), period.to.getMonth(), 1);
    while (cursor <= end && months.length < 12) {
      months.push(new Date(cursor));
      cursor.setMonth(cursor.getMonth() + 1);
    }
    const createdParams = period ? [period.from, period.to, ...clientParams] : [];
    const createdClientSql = filters.clientId != null ? " AND client_id = $3" : "";
    const createdRows = await queryRowsOrEmpty(
      `SELECT date_trunc('month', created_at)::date AS bucket, COUNT(*)::int AS total
       FROM v_b_clients_m_ordinateurs
       WHERE created_at IS NOT NULL AND created_at >= $1 AND created_at <= $2${createdClientSql}
       GROUP BY 1 ORDER BY 1`,
      createdParams
    );
    const createdMap = new Map(createdRows.map((row) => [toIsoDate(row.bucket), Number(row.total) || 0]));
    let running = Math.max(0, fleetTotal - createdRows.reduce((sum, row) => sum + (Number(row.total) || 0), 0));
    months.forEach((month) => {
      const key = toIsoDate(month);
      running += createdMap.get(key) || 0;
      fleetTrend.push({ date: key, value: running });
    });

    const incidentParams = period ? [period.from, period.to, ...clientParams] : [];
    const incidentClientSql = filters.clientId != null ? " AND client_id = $3" : "";
    const incidentRows = await queryRowsOrEmpty(
      `SELECT date_trunc('month', created_at)::date AS bucket, COUNT(*)::int AS total
       FROM v_b_tickets
       WHERE created_at >= $1 AND created_at <= $2${incidentClientSql}
         AND (
           COALESCE(monitoring_meta->>'equipmentFamily', '') ILIKE ANY(ARRAY['%internet%','%switch%','%firewall%','%routeur%','%wifi%'])
           OR COALESCE(equipment_info->>'type', '') ILIKE ANY(ARRAY['%internet%','%switch%','%firewall%','%routeur%','%wifi%'])
           OR COALESCE(category, '') ILIKE ANY(ARRAY['%réseau%','%reseau%','%network%','%infrastructure%'])
         )
       GROUP BY 1 ORDER BY 1`,
      incidentParams
    );
    const incidentMap = new Map(incidentRows.map((row) => [toIsoDate(row.bucket), Number(row.total) || 0]));
    months.forEach((month) => {
      const key = toIsoDate(month);
      networkIncidentTrend.push({ date: key, value: incidentMap.get(key) || 0 });
    });
  }

  const clients = await queryRowsOrEmpty(
    filters.clientId != null
      ? `SELECT id, name FROM v_b_clients WHERE id = $1`
      : `SELECT id, name FROM v_b_clients`,
    clientParams
  );
  const clientNames = new Map(clients.map((row) => [String(row.id), row.name || ""]));
  const clientsAtRisk = [...clientRisk.entries()]
    .map(([id, score]) => ({
      id,
      name: clientNames.get(id) || id,
      score,
      issues: score
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const sitesAtRisk = clientsAtRisk.filter((row) => row.score >= 3).length;
  const byType = families.map((row) => ({
    key: row.key || row.family,
    label: row.label || row.key,
    value: Number(row.count) || 0
  })).filter((row) => row.value > 0);

  const internetAvailabilityByClient = [...internetHealthByClient.entries()].map(([id, rec]) => ({
    id,
    name: clientNames.get(id) || id,
    value: rec.total ? roundPct((rec.ok / rec.total) * 100) : null
  })).filter((row) => row.value != null).slice(0, 12);

  const networkOffline = networkStatus.offline + networkStatus.critical;
  const internetMonitored = [...internetHealthByClient.values()].reduce((sum, rec) => sum + rec.total, 0);
  const internetOk = [...internetHealthByClient.values()].reduce((sum, rec) => sum + rec.ok, 0);
  const internetAvailability = internetMonitored > 0
    ? roundPct((internetOk / internetMonitored) * 100)
    : null;

  const ageBuckets = [
    { key: "0-3", label: "0–3 ans", value: 0 },
    { key: "3-5", label: "3–5 ans", value: 0 },
    { key: "5-8", label: "5–8 ans", value: 0 },
    { key: "8+", label: "8+ ans", value: 0 }
  ];
  computerRows.forEach((row) => {
    const purchase = parsePurchaseDate(row.data);
    if (!purchase) return;
    const years = (now.getTime() - purchase.getTime()) / (365.25 * 24 * 3600 * 1000);
    if (years < 3) ageBuckets[0].value += 1;
    else if (years < 5) ageBuckets[1].value += 1;
    else if (years < 8) ageBuckets[2].value += 1;
    else ageBuckets[3].value += 1;
  });

  const previousFrom = period?.from && period?.to
    ? new Date(period.from.getTime() - (period.to.getTime() - period.from.getTime() + 1))
    : null;
  let fleetDelta = 0;
  if (previousFrom && period?.from) {
    const prevCreated = await countTableOrZero(
      `SELECT COUNT(*)::int AS count FROM v_b_clients_m_ordinateurs
       WHERE created_at >= $1 AND created_at < $2${filters.clientId != null ? " AND client_id = $3" : ""}`,
      filters.clientId != null ? [previousFrom, period.from, filters.clientId] : [previousFrom, period.from]
    );
    const currCreated = await countTableOrZero(
      `SELECT COUNT(*)::int AS count FROM v_b_clients_m_ordinateurs
       WHERE created_at >= $1 AND created_at <= $2${filters.clientId != null ? " AND client_id = $3" : ""}`,
      filters.clientId != null ? [period.from, period.to, filters.clientId] : [period.from, period.to]
    );
    fleetDelta = currCreated - prevCreated;
  }

  const healthTrend = [];

  return {
    ...empty,
    overview: {
      fleetTotal,
      active,
      offline,
      anomaly,
      unsupervised,
      healthScore,
      availability,
      sitesAtRisk,
      fleetDelta,
      byType
    },
    healthRing,
    healthTrend,
    byType,
    clientsAtRisk,
    network: {
      internet: familyCount(families, "Internet"),
      internetAvailability,
      networkIncidents: networkIncidentTrend.reduce((sum, row) => sum + row.value, 0),
      routers: familyCount(families, "Routeur"),
      firewalls: familyCount(families, "Firewalls"),
      switches: familyCount(families, "Switch"),
      wifi: familyCount(families, "BorneWifi"),
      offline: networkOffline,
      sitesWithoutRedundancy,
      avgLatencyMs: null
    },
    internetAvailabilityByClient,
    networkStatus,
    sitesWithIssues: clientsAtRisk.slice(0, 8).map((row) => ({ name: row.name, value: row.issues })),
    networkIncidentTrend,
    internetTech: [...internetTech.entries()].map(([label, value]) => ({ label, value })),
    systems: {
      physicalServers,
      vms,
      hypervisors,
      nasSan: familyCount(families, "Stockage"),
      capacityTotalGb: capacityTotalGb || null,
      capacityUsedGb: capacityUsedGb || null,
      storageOver80,
      raidDegraded,
      backupsOk,
      backupsFailed,
      serversAnomaly,
      serversEol
    },
    physicalVsVirtual: { physical: physicalServers, virtual: vms },
    cpuRam: { cpuAvg: null, ramAvg: null },
    storageCapacity: capacityTotalGb
      ? [{ label: "Utilisé", value: Math.round(capacityUsedGb) }, { label: "Libre", value: Math.max(0, Math.round(capacityTotalGb - capacityUsedGb)) }]
      : [],
    backupStatus: { ok: backupsOk, failed: backupsFailed, unknown: Math.max(0, familyCount(families, "Sauvegarde") - backupsOk - backupsFailed) },
    infraAtRisk: clientsAtRisk.slice(0, 8),
    peripherals: {
      computers: familyCount(families, "Ordinateurs") || Number(computersRow?.total) || 0,
      printers,
      projectors,
      screens,
      pdus,
      ups: ups || familyCount(families, "Alimentation"),
      av,
      offline: peripheralStatus.offline,
      anomaly: peripheralStatus.warning + peripheralStatus.critical,
      avgAgeYears: ageCount ? Math.round((ageSum / ageCount) * 10) / 10 : null
    },
    peripheralByType: [
      { label: "Postes", value: familyCount(families, "Ordinateurs") || Number(computersRow?.total) || 0 },
      { label: "Imprimantes", value: printers },
      { label: "Vidéoprojecteurs", value: projectors },
      { label: "Écrans", value: screens },
      { label: "PDU", value: pdus },
      { label: "Onduleurs", value: ups || familyCount(families, "Alimentation") },
      { label: "Audiovisuel", value: av }
    ].filter((row) => row.value > 0),
    peripheralStatus,
    ageBuckets,
    fleetTrend,
    topAnomalyEquipment: anomalyEquipment
      .sort((a, b) => b.value - a.value)
      .slice(0, 8),
    lifecycle: {
      healthScore,
      eol,
      eos: eol,
      warrantyExpired,
      warrantySoon,
      firmwareObsolete: null,
      unsupervised,
      spof: sitesWithoutRedundancy,
      critical: healthRing.critical,
      withoutBackupConfig: backupsFailed
    },
    eolByVendor: [...eolByVendor.entries()].map(([label, value]) => ({ label, value })),
    eolByClient: [...eolByClientMap.entries()]
      .map(([id, value]) => ({
        id,
        name: clientNames.get(id) || id,
        value
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8),
    risksByClient: clientsAtRisk,
    renewalHorizon: { months6: renewal6, months12: renewal12 + renewal6, months24: renewal24 + renewal12 + renewal6 }
  };
}
function emptyKnowledgeStats() {
  return {
    available: false,
    overview: {
      articlesTotal: 0,
      published: 0,
      drafts: 0,
      createdInPeriod: 0,
      publishedInPeriod: 0,
      publicEnabled: 0,
      viewsTotal: 0,
      commentsInPeriod: 0,
      ratingsInPeriod: 0,
      avgRating: null,
      helpfulYes: 0,
      helpfulNo: 0,
      helpfulRate: null,
      favoritesInPeriod: 0,
      searchMisses: 0
    },
    byStatus: [],
    byCategory: [],
    topArticles: [],
    topConsumers: [],
    searchMisses: [],
    monthlyTrend: [],
    cockpit: emptyKnowledgeCockpit()
  };
}

function emptyKnowledgeCockpit() {
  return {
    overview: {
      articlesTotal: 0,
      published: 0,
      drafts: 0,
      archived: 0,
      viewsTotal: 0,
      viewsPerMonth: null,
      uniqueViews: null,
      avgRating: null,
      satisfactionPct: null,
      needsUpdate: 0
    },
    articles: {
      published: 0,
      createdRecent: 0,
      modifiedRecent: 0,
      neverViewed: 0,
      withoutFeedback: 0,
      lowRating: 0,
      old: 0,
      toReview: 0,
      expired: 0
    },
    usage: {
      views: 0,
      uniqueVisitors: null,
      searches: null,
      searchMisses: 0,
      missPct: null,
      articlesViewed: 0,
      neverViewed: 0,
      avgReadTime: null,
      beforeTicket: null,
      ticketsAvoided: null,
      deflectionPct: null
    },
    quality: {
      avgRating: null,
      ratingCount: 0,
      upPct: null,
      downPct: null,
      star1Pct: null,
      star2Pct: null,
      star3Pct: null,
      star4Pct: null,
      star5Pct: null,
      satisfactionPct: null,
      below3: 0,
      negativeFeedback: 0
    },
    age: {
      m3: { count: 0, pct: 0, articles: [] },
      m6: { count: 0, pct: 0, articles: [] },
      m12: { count: 0, pct: 0, articles: [] },
      y2: { count: 0, pct: 0, articles: [] },
      old: { count: 0, pct: 0, articles: [] }
    },
    byStatus: [],
    byCategory: [],
    byAuthor: [],
    topArticles: [],
    neverViewedArticles: [],
    staleArticles: [],
    qualityArticles: [],
    searchMisses: [],
    scores: []
  };
}

function knowledgeAgeKey(updatedAt, now) {
  if (!updatedAt) return "old";
  const days = (now.getTime() - updatedAt.getTime()) / 86400000;
  if (days < 90) return "m3";
  if (days < 180) return "m6";
  if (days < 365) return "m12";
  if (days < 730) return "y2";
  return "old";
}

function knowledgeFreshnessScore(updatedAt, now) {
  if (!updatedAt) return 0;
  const days = Math.max(0, (now.getTime() - updatedAt.getTime()) / 86400000);
  return Math.max(0, Math.min(100, Math.round(100 - days / 730 * 100)));
}

function clampScore(value) {
  if (value == null || !Number.isFinite(Number(value))) return 0;
  return Math.max(0, Math.min(100, Math.round(Number(value))));
}

async function fetchKnowledgeCockpitStatsSafe(args) {
  try {
    return await fetchKnowledgeCockpitStats(args);
  } catch (error) {
    console.error("[dashboard] knowledge cockpit stats failed:", error);
    return emptyKnowledgeCockpit();
  }
}

async function fetchKnowledgeCockpitStats({
  sinceIso,
  untilIso,
  filters = {}
}) {
  const empty = emptyKnowledgeCockpit();
  if (!(await tableExists("public.v_b_knowledge_articles"))) return empty;
  const now = new Date();
  const listParams = [];
  const listScope = buildKnowledgeArticleScopeClause(listParams, filters, "a");
  const createdParams = [];
  const createdScope = buildKnowledgeArticleScopeClause(createdParams, filters, "a");
  const createdClause = buildRangeClause(createdParams, "a.created_at", sinceIso, untilIso);
  const modifiedParams = [];
  const modifiedScope = buildKnowledgeArticleScopeClause(modifiedParams, filters, "a");
  const modifiedClause = buildRangeClause(modifiedParams, "a.updated_at", sinceIso, untilIso);
  const ratingParams = [];
  const ratingScope = buildKnowledgeArticleScopeClause(ratingParams, filters, "a");
  const helpfulParams = [];
  const helpfulScope = buildKnowledgeArticleScopeClause(helpfulParams, filters, "a");
  const missParams = [];
  const missPeriod = buildRangeClause(missParams, "m.last_at", sinceIso, untilIso);

  const [articleRows, createdRows, modifiedRows, ratingAggRows, ratingByArticle, helpfulAggRows, helpfulByArticle, missRows, missTotalRows] = await Promise.all([
    queryRowsOrEmpty(
      `SELECT a.id,
              COALESCE(NULLIF(TRIM(a.title), ''), 'Untitled') AS title,
              COALESCE(a.category, '') AS category,
              COALESCE(a.status, 'draft') AS status,
              COALESCE(a.view_count, 0)::int AS views,
              a.created_at,
              a.updated_at,
              a.author_user_id,
              TRIM(COALESCE(u.username, u.email, '')) AS author_name
         FROM v_b_knowledge_articles a
         LEFT JOIN v_b_users u ON u.id = a.author_user_id
        WHERE 1=1${listScope}`,
      listParams
    ),
    queryRowsOrEmpty(
      `SELECT COUNT(*)::int AS total
         FROM v_b_knowledge_articles a
        WHERE 1=1${createdScope}${createdClause}`,
      createdParams
    ),
    queryRowsOrEmpty(
      `SELECT COUNT(*)::int AS total
         FROM v_b_knowledge_articles a
        WHERE 1=1${modifiedScope}${modifiedClause}`,
      modifiedParams
    ),
    queryRowsOrEmpty(
      `SELECT COUNT(*)::int AS rating_count,
              AVG(r.rating)::float AS avg_rating,
              COUNT(*) FILTER (WHERE r.rating = 1)::int AS star1,
              COUNT(*) FILTER (WHERE r.rating = 2)::int AS star2,
              COUNT(*) FILTER (WHERE r.rating = 3)::int AS star3,
              COUNT(*) FILTER (WHERE r.rating = 4)::int AS star4,
              COUNT(*) FILTER (WHERE r.rating = 5)::int AS star5
         FROM v_b_knowledge_article_ratings r
         JOIN v_b_knowledge_articles a ON a.id = r.article_id
        WHERE 1=1${ratingScope}`,
      ratingParams
    ),
    queryRowsOrEmpty(
      `SELECT r.article_id,
              AVG(r.rating)::float AS avg_rating,
              COUNT(*)::int AS rating_count
         FROM v_b_knowledge_article_ratings r
         JOIN v_b_knowledge_articles a ON a.id = r.article_id
        WHERE 1=1${ratingScope}
        GROUP BY r.article_id`,
      ratingParams
    ),
    queryRowsOrEmpty(
      `SELECT
         COUNT(*) FILTER (WHERE h.helpful = TRUE)::int AS yes_count,
         COUNT(*) FILTER (WHERE h.helpful = FALSE)::int AS no_count
         FROM v_b_knowledge_article_helpful h
         JOIN v_b_knowledge_articles a ON a.id = h.article_id
        WHERE 1=1${helpfulScope}`,
      helpfulParams
    ),
    queryRowsOrEmpty(
      `SELECT h.article_id,
              COUNT(*) FILTER (WHERE h.helpful = TRUE)::int AS yes_count,
              COUNT(*) FILTER (WHERE h.helpful = FALSE)::int AS no_count
         FROM v_b_knowledge_article_helpful h
         JOIN v_b_knowledge_articles a ON a.id = h.article_id
        WHERE 1=1${helpfulScope}
        GROUP BY h.article_id`,
      helpfulParams
    ),
    queryRowsOrEmpty(
      `SELECT m.query AS label, m.hit_count::int AS count
         FROM v_b_knowledge_search_misses m
        WHERE 1=1${missPeriod}
        ORDER BY m.hit_count DESC, m.last_at DESC
        LIMIT 12`,
      missParams
    ),
    queryRowsOrEmpty(
      `SELECT COALESCE(SUM(m.hit_count), 0)::int AS count
         FROM v_b_knowledge_search_misses m
        WHERE 1=1${missPeriod}`,
      missParams
    )
  ]);

  const ratingById = new Map((ratingByArticle || []).map((row) => [String(row.article_id), {
    avg: round1(row.avg_rating),
    count: Number(row.rating_count) || 0
  }]));
  const helpfulById = new Map((helpfulByArticle || []).map((row) => [String(row.article_id), {
    yes: Number(row.yes_count) || 0,
    no: Number(row.no_count) || 0
  }]));

  const age = {
    m3: { count: 0, pct: 0, articles: [] },
    m6: { count: 0, pct: 0, articles: [] },
    m12: { count: 0, pct: 0, articles: [] },
    y2: { count: 0, pct: 0, articles: [] },
    old: { count: 0, pct: 0, articles: [] }
  };
  const byStatusMap = new Map();
  const byCategoryMap = new Map();
  const byAuthorMap = new Map();
  const topArticles = [];
  const neverViewedArticles = [];
  const staleArticles = [];
  const qualityArticles = [];
  const scoreSource = [];
  let published = 0;
  let drafts = 0;
  let viewsTotal = 0;
  let neverViewed = 0;
  let withoutFeedback = 0;
  let lowRating = 0;
  let oldCount = 0;
  let articlesViewed = 0;
  let negativeFeedback = 0;
  let oldest = null;

  articleRows.forEach((row) => {
    const status = String(row.status || "draft");
    byStatusMap.set(status, (byStatusMap.get(status) || 0) + 1);
    const category = String(row.category || "").trim() || "Uncategorized";
    byCategoryMap.set(category, (byCategoryMap.get(category) || 0) + 1);
    const authorKey = row.author_user_id ? String(row.author_user_id) : "none";
    const authorLabel = String(row.author_name || "").trim() || "—";
    const authorRec = byAuthorMap.get(authorKey) || { key: authorKey, label: authorLabel, count: 0 };
    authorRec.count += 1;
    byAuthorMap.set(authorKey, authorRec);

    const createdAt = row.created_at ? new Date(row.created_at) : null;
    if (createdAt && !Number.isNaN(createdAt.getTime()) && (!oldest || createdAt < oldest)) oldest = createdAt;
    const updatedAt = row.updated_at ? new Date(row.updated_at) : createdAt;
    const views = Number(row.views) || 0;
    viewsTotal += views;
    const rating = ratingById.get(String(row.id)) || { avg: null, count: 0 };
    const helpful = helpfulById.get(String(row.id)) || { yes: 0, no: 0 };
    const helpfulTotal = helpful.yes + helpful.no;
    const upPct = helpfulTotal ? roundPct((helpful.yes / helpfulTotal) * 100) : null;
    const downPct = helpfulTotal ? roundPct((helpful.no / helpfulTotal) * 100) : null;
    const hasFeedback = rating.count > 0 || helpfulTotal > 0;
    const ref = {
      id: row.id,
      title: row.title,
      views,
      avgRating: rating.avg,
      ratingCount: rating.count,
      upPct,
      downPct,
      updatedAt: updatedAt && !Number.isNaN(updatedAt.getTime()) ? updatedAt.toISOString().slice(0, 10) : null,
      author: authorLabel
    };

    if (status === "published") published += 1;
    else drafts += 1;
    if (views <= 0) {
      neverViewed += 1;
      neverViewedArticles.push(ref);
    } else articlesViewed += 1;
    if (!hasFeedback) withoutFeedback += 1;
    if (rating.avg != null && rating.avg < 3) lowRating += 1;
    if (helpfulTotal >= 3 && downPct != null && downPct >= 40) negativeFeedback += 1;

    if (status === "published") {
      const key = knowledgeAgeKey(updatedAt, now);
      age[key].count += 1;
      age[key].articles.push(ref);
      if (key === "old") {
        oldCount += 1;
        staleArticles.push(ref);
      }
    }

    topArticles.push(ref);
    if (views > 0 || rating.count > 0 || helpfulTotal > 0) qualityArticles.push(ref);
    scoreSource.push({
      ...ref,
      helpfulYes: helpful.yes,
      helpfulTotal,
      updatedDate: updatedAt
    });
  });

  const publishedCount = Math.max(published, 1);
  Object.keys(age).forEach((key) => {
    age[key].pct = published ? roundPct((age[key].count / publishedCount) * 100) : 0;
    age[key].articles.sort((a, b) => String(a.updatedAt || "").localeCompare(String(b.updatedAt || "")));
  });

  const ratingAgg = ratingAggRows[0] || {};
  const ratingCount = Number(ratingAgg.rating_count) || 0;
  const starPct = (count) => (ratingCount ? roundPct((Number(count) || 0) / ratingCount * 100) : null);
  const avgRating = round1(ratingAgg.avg_rating);
  const satisfactionPct = ratingCount
    ? roundPct(((Number(ratingAgg.star4) || 0) + (Number(ratingAgg.star5) || 0)) / ratingCount * 100)
    : null;
  const helpfulYes = Number(helpfulAggRows[0]?.yes_count) || 0;
  const helpfulNo = Number(helpfulAggRows[0]?.no_count) || 0;
  const helpfulTotal = helpfulYes + helpfulNo;
  const monthsAlive = oldest ? Math.max(1, (now.getTime() - oldest.getTime()) / (30.44 * 86400000)) : 1;
  const viewsPerMonth = viewsTotal ? Math.round(viewsTotal / monthsAlive) : 0;
  const toReview = new Set([
    ...staleArticles.map((row) => row.id),
    ...qualityArticles.filter((row) => row.avgRating != null && row.avgRating < 3).map((row) => row.id)
  ]).size;

  const maxViews = Math.max(1, ...scoreSource.map((row) => row.views));
  const scores = scoreSource
    .filter((row) => row.views > 0 || row.ratingCount > 0)
    .map((row) => {
      const utilization = clampScore((row.views / maxViews) * 100);
      const satisfaction = row.avgRating != null
        ? clampScore((row.avgRating / 5) * 100)
        : row.helpfulTotal
          ? clampScore((row.helpfulYes / row.helpfulTotal) * 100)
          : 50;
      const freshness = knowledgeFreshnessScore(row.updatedDate, now);
      const usefulness = row.helpfulTotal
        ? clampScore((row.helpfulYes / row.helpfulTotal) * 100)
        : row.avgRating != null
          ? clampScore((row.avgRating / 5) * 100)
          : 50;
      const score = clampScore(utilization * 0.3 + satisfaction * 0.3 + freshness * 0.2 + usefulness * 0.2);
      return {
        id: row.id,
        title: row.title,
        score,
        utilization,
        satisfaction,
        freshness,
        usefulness
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  return {
    ...empty,
    overview: {
      articlesTotal: articleRows.length,
      published,
      drafts,
      archived: 0,
      viewsTotal,
      viewsPerMonth,
      uniqueViews: null,
      avgRating,
      satisfactionPct,
      needsUpdate: oldCount
    },
    articles: {
      published,
      createdRecent: Number(createdRows[0]?.total) || 0,
      modifiedRecent: Number(modifiedRows[0]?.total) || 0,
      neverViewed,
      withoutFeedback,
      lowRating,
      old: oldCount,
      toReview,
      expired: 0
    },
    usage: {
      views: viewsTotal,
      uniqueVisitors: null,
      searches: null,
      searchMisses: Number(missTotalRows[0]?.count) || 0,
      missPct: null,
      articlesViewed,
      neverViewed,
      avgReadTime: null,
      beforeTicket: null,
      ticketsAvoided: helpfulYes,
      deflectionPct: viewsTotal > 0 ? round1((helpfulYes / viewsTotal) * 100) : null
    },
    quality: {
      avgRating,
      ratingCount,
      upPct: helpfulTotal ? roundPct((helpfulYes / helpfulTotal) * 100) : null,
      downPct: helpfulTotal ? roundPct((helpfulNo / helpfulTotal) * 100) : null,
      star1Pct: starPct(ratingAgg.star1),
      star2Pct: starPct(ratingAgg.star2),
      star3Pct: starPct(ratingAgg.star3),
      star4Pct: starPct(ratingAgg.star4),
      star5Pct: starPct(ratingAgg.star5),
      satisfactionPct,
      below3: lowRating,
      negativeFeedback
    },
    age,
    byStatus: [...byStatusMap.entries()].map(([key, value]) => ({ key, value })),
    byCategory: [...byCategoryMap.entries()].map(([key, value]) => ({ key, value })),
    byAuthor: [...byAuthorMap.values()].sort((a, b) => b.count - a.count).slice(0, 12),
    topArticles: topArticles.sort((a, b) => b.views - a.views).slice(0, 10),
    neverViewedArticles: neverViewedArticles.slice(0, 20),
    staleArticles: staleArticles.sort((a, b) => String(a.updatedAt || "").localeCompare(String(b.updatedAt || ""))).slice(0, 20),
    qualityArticles: qualityArticles.sort((a, b) => b.views - a.views).slice(0, 20),
    searchMisses: (missRows || []).map((row) => ({
      id: row.label,
      label: row.label,
      count: Number(row.count) || 0
    })),
    scores
  };
}

function buildKnowledgeArticleScopeClause(params, filters = {}, alias = "a") {
  let clause = "";
  if (filters.agentId) {
    params.push(filters.agentId);
    clause += ` AND ${alias}.author_user_id = $${params.length}::uuid`;
  }
  if (filters.clientId) {
    params.push(filters.clientId);
    clause += ` AND (
      COALESCE(${alias}.visible_to_all_clients, FALSE) = TRUE
      OR EXISTS (
        SELECT 1 FROM v_b_knowledge_article_clients ac
         WHERE ac.article_id = ${alias}.id AND ac.client_id = $${params.length}
      )
    )`;
  }
  if (filters.contactId) {
    params.push(filters.contactId);
    clause += ` AND (
      COALESCE(${alias}.visible_to_all_contacts, FALSE) = TRUE
      OR EXISTS (
        SELECT 1 FROM v_b_knowledge_article_contacts ct
         WHERE ct.article_id = ${alias}.id AND ct.contact_id = $${params.length}
      )
    )`;
  }
  return clause;
}
async function queryRowsOrEmpty(sql, params = []) {
  try {
    const result = await pool.query(sql, params);
    return result.rows || [];
  } catch (err) {
    if (err.code === "42P01" || err.code === "42703") return [];
    throw err;
  }
}
async function fetchKnowledgeStats({
  sinceIso,
  untilIso,
  filters = {}
}) {
  if (!(await tableExists("public.v_b_knowledge_articles"))) {
    return emptyKnowledgeStats();
  }
  try {
    const articleParams = [];
    const articleScope = buildKnowledgeArticleScopeClause(articleParams, filters, "a");
    const createdClause = buildRangeClause(articleParams, "a.created_at", sinceIso, untilIso);
    const statusParams = [];
    const statusScope = buildKnowledgeArticleScopeClause(statusParams, filters, "a");
    const categoryParams = [];
    const categoryScope = buildKnowledgeArticleScopeClause(categoryParams, filters, "a");
    const topParams = [];
    const topScope = buildKnowledgeArticleScopeClause(topParams, filters, "a");
    const commentParams = [];
    const commentScope = buildKnowledgeArticleScopeClause(commentParams, filters, "a");
    const commentPeriod = buildRangeClause(commentParams, "cm.created_at", sinceIso, untilIso);
    const ratingParams = [];
    const ratingScope = buildKnowledgeArticleScopeClause(ratingParams, filters, "a");
    const ratingPeriod = buildRangeClause(ratingParams, "r.updated_at", sinceIso, untilIso);
    const helpfulParams = [];
    const helpfulScope = buildKnowledgeArticleScopeClause(helpfulParams, filters, "a");
    const helpfulPeriod = buildRangeClause(helpfulParams, "h.updated_at", sinceIso, untilIso);
    const favoriteParams = [];
    const favoriteScope = buildKnowledgeArticleScopeClause(favoriteParams, filters, "a");
    const favoritePeriod = buildRangeClause(favoriteParams, "f.created_at", sinceIso, untilIso);
    const consumerParams = [];
    const consumerScope = buildKnowledgeArticleScopeClause(consumerParams, filters, "a");
    const consumerPeriod = buildRangeClause(consumerParams, "x.created_at", sinceIso, untilIso);
    const missParams = [];
    const missPeriod = buildRangeClause(missParams, "m.last_at", sinceIso, untilIso);
    const trendParams = [];
    const trendScope = buildKnowledgeArticleScopeClause(trendParams, filters, "a");
    const trendPeriod = buildRangeClause(trendParams, "cm.created_at", sinceIso, untilIso);
    const [
      overviewRows,
      statusRows,
      categoryRows,
      topRows,
      commentRows,
      ratingRows,
      helpfulRows,
      favoriteRows,
      consumerRows,
      missRows,
      trendRows
    ] = await Promise.all([
      queryRowsOrEmpty(
        `SELECT
           COUNT(*)::int AS articles_total,
           COUNT(*) FILTER (WHERE a.status = 'published')::int AS published,
           COUNT(*) FILTER (WHERE a.status = 'draft')::int AS drafts,
           COUNT(*) FILTER (WHERE 1=1${createdClause})::int AS created_in_period,
           COALESCE(SUM(COALESCE(a.view_count, 0)), 0)::bigint AS views_total
         FROM v_b_knowledge_articles a
         WHERE 1=1${articleScope}`,
        articleParams
      ),
      queryRowsOrEmpty(
        `SELECT COALESCE(a.status, 'draft') AS key, COUNT(*)::int AS count
           FROM v_b_knowledge_articles a
          WHERE 1=1${statusScope}
          GROUP BY 1
          ORDER BY count DESC`,
        statusParams
      ),
      queryRowsOrEmpty(
        `SELECT COALESCE(NULLIF(TRIM(a.category), ''), 'Uncategorized') AS key, COUNT(*)::int AS count
           FROM v_b_knowledge_articles a
          WHERE 1=1${categoryScope}
          GROUP BY 1
          ORDER BY count DESC`,
        categoryParams
      ),
      queryRowsOrEmpty(
        `SELECT a.id,
                COALESCE(NULLIF(TRIM(a.title), ''), 'Untitled') AS title,
                COALESCE(a.category, '') AS category,
                COALESCE(a.status, 'draft') AS status,
                COALESCE(a.view_count, 0)::int AS views
           FROM v_b_knowledge_articles a
          WHERE 1=1${topScope}
          ORDER BY views DESC, a.updated_at DESC
          LIMIT 10`,
        topParams
      ),
      queryRowsOrEmpty(
        `SELECT COUNT(*)::int AS count
           FROM v_b_knowledge_article_comments cm
           JOIN v_b_knowledge_articles a ON a.id = cm.article_id
          WHERE 1=1${commentScope}${commentPeriod}`,
        commentParams
      ),
      queryRowsOrEmpty(
        `SELECT COUNT(*)::int AS count,
                AVG(r.rating)::float AS avg_rating
           FROM v_b_knowledge_article_ratings r
           JOIN v_b_knowledge_articles a ON a.id = r.article_id
          WHERE 1=1${ratingScope}${ratingPeriod}`,
        ratingParams
      ),
      queryRowsOrEmpty(
        `SELECT
           COUNT(*) FILTER (WHERE h.helpful = TRUE)::int AS yes_count,
           COUNT(*) FILTER (WHERE h.helpful = FALSE)::int AS no_count
           FROM v_b_knowledge_article_helpful h
           JOIN v_b_knowledge_articles a ON a.id = h.article_id
          WHERE 1=1${helpfulScope}${helpfulPeriod}`,
        helpfulParams
      ),
      queryRowsOrEmpty(
        `SELECT COUNT(*)::int AS count
           FROM v_b_knowledge_article_favorites f
           JOIN v_b_knowledge_articles a ON a.id = f.article_id
          WHERE 1=1${favoriteScope}${favoritePeriod}`,
        favoriteParams
      ),
      queryRowsOrEmpty(
        `SELECT c.id AS client_id,
                COALESCE(c.name, c.contrat->>'nom', 'Client') AS label,
                COUNT(*)::int AS count
           FROM (
             SELECT cm.article_id, cm.client_id, cm.created_at
               FROM v_b_knowledge_article_comments cm
             UNION ALL
             SELECT r.article_id, r.client_id, r.updated_at
               FROM v_b_knowledge_article_ratings r
           ) x
           JOIN v_b_knowledge_articles a ON a.id = x.article_id
           JOIN v_b_clients c ON c.id = x.client_id
          WHERE x.client_id IS NOT NULL${consumerScope}${consumerPeriod}
          GROUP BY c.id, c.name, c.contrat
          ORDER BY count DESC
          LIMIT 10`,
        consumerParams
      ),
      queryRowsOrEmpty(
        `SELECT m.query AS label, m.hit_count::int AS count, m.last_at
           FROM v_b_knowledge_search_misses m
          WHERE 1=1${missPeriod}
          ORDER BY m.hit_count DESC, m.last_at DESC
          LIMIT 12`,
        missParams
      ),
      queryRowsOrEmpty(
        `SELECT to_char(date_trunc('month', cm.created_at), 'YYYY-MM') AS period,
                COUNT(*)::int AS count
           FROM v_b_knowledge_article_comments cm
           JOIN v_b_knowledge_articles a ON a.id = cm.article_id
          WHERE 1=1${trendScope}${trendPeriod}
          GROUP BY 1
          ORDER BY 1`,
        trendParams
      )
    ]);
    const overviewRow = overviewRows[0] || {};
    const publishedParams = [];
    const publishedScope = buildKnowledgeArticleScopeClause(publishedParams, filters, "a");
    const publishedRange = buildRangeClause(publishedParams, "a.published_at", sinceIso, untilIso);
    const publicParams = [];
    const publicScope = buildKnowledgeArticleScopeClause(publicParams, filters, "a");
    const [publishedRows, publicRows] = await Promise.all([
      queryRowsOrEmpty(
        `SELECT COUNT(*)::int AS count
           FROM v_b_knowledge_articles a
          WHERE a.published_at IS NOT NULL${publishedScope}${publishedRange}`,
        publishedParams
      ),
      queryRowsOrEmpty(
        `SELECT COUNT(*)::int AS count
           FROM v_b_knowledge_articles a
          WHERE COALESCE(a.public_enabled, FALSE) = TRUE${publicScope}`,
        publicParams
      )
    ]);
    const helpfulYes = Number(helpfulRows[0]?.yes_count) || 0;
    const helpfulNo = Number(helpfulRows[0]?.no_count) || 0;
    const helpfulTotal = helpfulYes + helpfulNo;
    const topIds = topRows.map(row => row.id).filter(Boolean);
    let commentByArticle = new Map();
    let ratingByArticle = new Map();
    if (topIds.length) {
      const commentCountParams = [topIds];
      const commentCountPeriod = buildRangeClause(commentCountParams, "cm.created_at", sinceIso, untilIso);
      const [topComments, topRatings] = await Promise.all([
        queryRowsOrEmpty(
          `SELECT cm.article_id, COUNT(*)::int AS count
             FROM v_b_knowledge_article_comments cm
            WHERE cm.article_id = ANY($1::uuid[])${commentCountPeriod}
            GROUP BY 1`,
          commentCountParams
        ),
        queryRowsOrEmpty(
          `SELECT article_id, ROUND(AVG(rating)::numeric, 1)::float AS avg_rating, COUNT(*)::int AS count
             FROM v_b_knowledge_article_ratings
            WHERE article_id = ANY($1::uuid[])
            GROUP BY 1`,
          [topIds]
        )
      ]);
      commentByArticle = new Map(topComments.map(row => [String(row.article_id), Number(row.count) || 0]));
      ratingByArticle = new Map(topRatings.map(row => [String(row.article_id), {
        avgRating: round1(row.avg_rating),
        count: Number(row.count) || 0
      }]));
    }
    const missTotalRows = await queryRowsOrEmpty(
      `SELECT COALESCE(SUM(m.hit_count), 0)::int AS count
         FROM v_b_knowledge_search_misses m
        WHERE 1=1${missPeriod}`,
      missParams
    );
    const cockpit = await fetchKnowledgeCockpitStatsSafe({
      sinceIso,
      untilIso,
      filters
    });
    return {
      available: true,
      overview: {
        articlesTotal: Number(overviewRow.articles_total) || 0,
        published: Number(overviewRow.published) || 0,
        drafts: Number(overviewRow.drafts) || 0,
        createdInPeriod: Number(overviewRow.created_in_period) || 0,
        publishedInPeriod: Number(publishedRows[0]?.count) || 0,
        publicEnabled: Number(publicRows[0]?.count) || 0,
        viewsTotal: Number(overviewRow.views_total) || 0,
        commentsInPeriod: Number(commentRows[0]?.count) || 0,
        ratingsInPeriod: Number(ratingRows[0]?.count) || 0,
        avgRating: round1(ratingRows[0]?.avg_rating),
        helpfulYes,
        helpfulNo,
        helpfulRate: helpfulTotal ? roundPct(helpfulYes / helpfulTotal * 100) : null,
        favoritesInPeriod: Number(favoriteRows[0]?.count) || 0,
        searchMisses: Number(missTotalRows[0]?.count) || 0
      },
      byStatus: mapCountRows(statusRows, {
        draft: "Draft",
        published: "Published"
      }),
      byCategory: mapCountRows(categoryRows),
      topArticles: topRows.map(row => {
        const rating = ratingByArticle.get(String(row.id)) || {};
        return {
          id: row.id,
          title: row.title,
          category: row.category || "",
          status: row.status,
          views: Number(row.views) || 0,
          comments: commentByArticle.get(String(row.id)) || 0,
          avgRating: rating.avgRating ?? null
        };
      }),
      topConsumers: (consumerRows || []).map(row => ({
        key: String(row.client_id),
        label: row.label,
        count: Number(row.count) || 0
      })),
      searchMisses: (missRows || []).map(row => ({
        label: row.label,
        count: Number(row.count) || 0
      })),
      monthlyTrend: buildTrend(trendRows),
      cockpit
    };
  } catch (err) {
    console.error("fetchKnowledgeStats:", err);
    return emptyKnowledgeStats();
  }
}
export async function fetchAnalyticsDashboard(options = "365d") {
  const input = typeof options === "string" ? {
    period: options
  } : options || {};
  const {
    period,
    startAt,
    endAt,
    agentId,
    clientId,
    contactId
  } = input;
  const range = resolveDashboardDateRange({
    period,
    startAt,
    endAt
  });
  const {
    sinceIso,
    untilIso
  } = range;
  const filters = parseDashboardEntityFilters({
    agentId,
    clientId,
    contactId
  });
  const [support, cockpit, planning, enterprise, reports, devices, knowledge, satisfactionAvailable] = await Promise.all([fetchSupportStats({
    sinceIso,
    untilIso,
    filters
  }), fetchSupportCockpitStatsSafe({
    sinceIso,
    untilIso,
    filters
  }), fetchPlanningStats({
    sinceIso,
    untilIso,
    filters
  }), fetchEnterpriseStats({
    sinceIso,
    untilIso,
    filters
  }), fetchReportsStats({
    sinceIso,
    untilIso,
    filters
  }), fetchDevicesStats({
    sinceIso,
    untilIso,
    filters
  }), fetchKnowledgeStats({
    sinceIso,
    untilIso,
    filters
  }), hasSatisfactionTable()]);
  return {
    period: range.period,
    since: sinceIso,
    until: untilIso,
    generatedAt: new Date().toISOString(),
    filters: {
      agentId: filters.agentId,
      clientId: filters.clientId,
      contactId: filters.contactId,
      active: hasEntityFilters(filters)
    },
    modules: {
      satisfaction: satisfactionAvailable,
      planning: planning.available,
      reports: reports.available,
      knowledge: knowledge.available
    },
    summary: {
      ticketsCreated: support.overview.created,
      ticketsOpen: support.overview.openNow,
      avgFirstResponseHours: support.timing.avgFirstResponseHours,
      avgResolutionHours: support.timing.avgResolutionHours,
      eventsTotal: planning.overview.total,
      maintenanceInPeriod: planning.overview.maintenanceInPeriod,
      maintenanceYtd: planning.overview.maintenanceYtd,
      clientsTotal: enterprise.clientsPortfolio || enterprise.clientsTotal,
      reportsInPeriod: reports.inPeriod,
      equipMonitoredTotal: devices.equipMonitoredTotal,
      knowledgeArticles: knowledge.overview.published,
      knowledgeViews: knowledge.overview.viewsTotal,
      satisfactionAvg: support.satisfaction?.avgRating ?? null
    },
    support: {
      ...support,
      cockpit
    },
    planning,
    enterprise,
    crm: enterprise,
    reports,
    devices,
    infrastructure: devices,
    knowledge
  };
}
