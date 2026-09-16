import { appendCommunityTicketFilters, appendSalesTicketFilters, appendSupportTicketFilters } from "../utils/ticketEditionGuard.js";
import { appendSearchWhere, appendStatusFilterWhere, appendTypeFilterWhere, buildOrderBySql, buildViewRulesWhere } from "./ticketViewSql.js";
import { ensureTicketValidationRequestsSchema } from "./ensureTicketValidationRequestsSchema.js";
import { TICKET_REQUESTER_EMAIL_SQL } from "./ticketEmailThread.js";
const FIRST_TAKEOVER_AT_SQL = `(SELECT h.created_at
           FROM v_b_ticket_status_history h
           WHERE h.ticket_id = t.id
             AND LOWER(COALESCE(h.old_status, '')) IN ('new', 'open', '')
             AND LOWER(COALESCE(h.new_status, '')) NOT IN ('new', 'open', '')
           ORDER BY h.created_at ASC
           LIMIT 1) AS first_takeover_at`;
export const TICKET_SEARCH_MAX_LIMIT = 100;
let schemaCache = null;
let schemaCacheExpiresAt = 0;
const SCHEMA_CACHE_TTL_MS = 30_000;
async function columnExists(pool, tableName, columnName) {
  const result = await pool.query(`SELECT EXISTS (
       SELECT 1
       FROM pg_attribute a
       JOIN pg_class c ON c.oid = a.attrelid
       WHERE c.oid = to_regclass($1)
         AND a.attname = $2
         AND a.attnum > 0
         AND NOT a.attisdropped
     ) AS has_column`, [tableName, columnName]);
  return Boolean(result.rows?.[0]?.has_column);
}
async function tableExists(pool, tableName) {
  const result = await pool.query(`SELECT to_regclass($1) IS NOT NULL AS has_table`, [tableName]);
  return Boolean(result.rows?.[0]?.has_table);
}
export async function resolveTicketListSchema(pool, {
  isCommunityEdition = () => false
} = {}) {
  const now = Date.now();
  if (schemaCache && schemaCacheExpiresAt > now) {
    return schemaCache;
  }
  await ensureTicketValidationRequestsSchema().catch(() => false);
  const [hasRequesterContact, hasTicketAssignees, hasSlaInfo, hasMajorIncident, hasDeletedAt, hasIsDeleted, hasProgressPercent, hasSalesFormData, hasEventsTicketId, hasValidationRequests, hasTicketTags] = await Promise.all([columnExists(pool, "v_b_tickets", "requester_contact_id"), tableExists(pool, "v_b_ticket_assignees"), columnExists(pool, "v_b_tickets", "sla_info"), columnExists(pool, "v_b_tickets", "is_major_incident"), columnExists(pool, "v_b_tickets", "deleted_at"), columnExists(pool, "v_b_tickets", "is_deleted"), columnExists(pool, "v_b_tickets", "progress_percent"), columnExists(pool, "v_b_tickets", "sales_form_data"), columnExists(pool, "v_b_events", "ticket_id"), tableExists(pool, "v_b_ticket_validation_requests"), tableExists(pool, "v_b_ticket_tag_links")]);
  schemaCache = {
    hasRequesterContact,
    hasTicketAssignees,
    hasSlaInfo,
    hasMajorIncident,
    hasDeletedAt,
    hasIsDeleted,
    hasProgressPercent,
    hasSalesFormData,
    hasEventsTicketId,
    hasValidationRequests,
    hasTicketTags,
    isCommunity: Boolean(isCommunityEdition())
  };
  schemaCacheExpiresAt = now + SCHEMA_CACHE_TTL_MS;
  return schemaCache;
}
function appendLifecycleFilters(where, {
  viewMode,
  hasDeletedAt,
  hasIsDeleted
}) {
  if (viewMode === "trash") {
    if (hasDeletedAt) {
      where.push("t.deleted_at IS NOT NULL");
    } else if (hasIsDeleted) {
      where.push("COALESCE(t.is_deleted, FALSE) = TRUE");
    } else {
      where.push("1 = 0");
    }
    return;
  }
  if (hasDeletedAt) {
    where.push("t.deleted_at IS NULL");
  } else if (hasIsDeleted) {
    where.push("COALESCE(t.is_deleted, FALSE) = FALSE");
  }
}
export function buildTicketListWhere({
  viewRules = null,
  viewMode = "active",
  status = "",
  ticketType = "",
  search = "",
  ticketFamily = "support",
  currentUserId = null,
  schema = {}
} = {}) {
  const values = [];
  const where = [];
  const ctx = {
    hasRequesterContact: Boolean(schema.hasRequesterContact),
    hasTicketAssignees: Boolean(schema.hasTicketAssignees),
    hasValidationRequests: Boolean(schema.hasValidationRequests),
    hasTicketTags: Boolean(schema.hasTicketTags),
    currentUserId: currentUserId || null
  };
  appendLifecycleFilters(where, {
    viewMode,
    hasDeletedAt: schema.hasDeletedAt,
    hasIsDeleted: schema.hasIsDeleted
  });
  const family = String(ticketFamily || "support").toLowerCase();
  if (family === "sales") {
    appendSalesTicketFilters(where);
  } else if (family !== "all") {
    // Support list: never mix Services & installations tickets
    appendSupportTicketFilters(where);
  } else if (schema.isCommunity) {
    appendCommunityTicketFilters(where);
  }
  const viewWhere = buildViewRulesWhere(viewRules, values, ctx);
  if (viewWhere) where.push(`(${viewWhere})`);
  appendStatusFilterWhere(status, where, values);
  appendTypeFilterWhere(ticketType, where, values);
  appendSearchWhere(search, where, values, ctx);
  return {
    whereSql: where.length > 0 ? `WHERE ${where.join(" AND ")}` : "",
    values,
    ctx
  };
}
function buildTicketListSelectSql(schema) {
  const {
    hasRequesterContact,
    hasTicketAssignees,
    hasSlaInfo,
    hasMajorIncident,
    hasProgressPercent,
    hasSalesFormData,
    hasEventsTicketId,
    hasTicketTags
  } = schema;
  const planningSelect = hasEventsTicketId ? `pe.id AS planning_event_id,
          pe.title AS planning_event_title,
          pe.type AS planning_event_type,
          pe.start AS planning_event_start,
          pe."end" AS planning_event_end,
          pe.assigned_user_id AS planning_assigned_user_id,` : `NULL::uuid AS planning_event_id,
          NULL::text AS planning_event_title,
          NULL::text AS planning_event_type,
          NULL::timestamptz AS planning_event_start,
          NULL::timestamptz AS planning_event_end,
          NULL::uuid AS planning_assigned_user_id,`;
  const planningJoin = hasEventsTicketId ? `LEFT JOIN LATERAL (
            SELECT e.id, e.title, e.type, e.start, e."end", e.assigned_user_id
            FROM v_b_events e
            WHERE e.ticket_id = t.id
            ORDER BY e.start ASC NULLS LAST
            LIMIT 1
          ) pe ON TRUE` : "";
  return `SELECT
          t.id,
          t.ticket_number,
          t.title,
          t.description,
          t.status,
          t.priority,
          t.type,
          t.category,
          t.channel,
          t.client_id,
          ${hasRequesterContact ? "t.requester_contact_id," : ""}
          t.requester_user_id,
          t.assigned_user_id,
          t.created_at,
          t.updated_at,
          t.resolved_at,
          ${hasProgressPercent ? "t.progress_percent," : "NULL::int AS progress_percent,"}
          ${hasSalesFormData ? `CASE
            WHEN jsonb_typeof(t.sales_form_data->'pmTasks') = 'array'
              THEN jsonb_array_length(t.sales_form_data->'pmTasks')
            ELSE 0
          END AS tasks_total,
          CASE
            WHEN jsonb_typeof(t.sales_form_data->'pmTasks') = 'array'
              THEN (
                SELECT COUNT(*)::int
                FROM jsonb_array_elements(t.sales_form_data->'pmTasks') elem
                WHERE LOWER(COALESCE(elem->>'done', 'false')) IN ('true', 't', '1')
              )
            ELSE 0
          END AS tasks_done,
          CASE
            WHEN t.sales_form_data IS NULL THEN NULL
            ELSE jsonb_build_object(
              'kind', t.sales_form_data->>'kind',
              'formLabel', COALESCE(t.sales_form_data->>'formLabel', t.sales_form_data->>'label'),
              'formKey', t.sales_form_data->>'formKey',
              'purchaseOrder', t.sales_form_data->>'purchaseOrder',
              'commercialLabel', t.sales_form_data->>'commercialLabel',
              'projectManagerLabel', t.sales_form_data->>'projectManagerLabel',
              'categorySlug', t.sales_form_data->>'categorySlug'
            )
          END AS sales_form_data,` : "0 AS tasks_total, 0 AS tasks_done, NULL::jsonb AS sales_form_data,"}
          ${planningSelect}
          ${hasSlaInfo ? "t.sla_info," : ""}
          c.contrat AS client_contrat,
          ${FIRST_TAKEOVER_AT_SQL},
          ${hasSlaInfo ? `(SELECT MIN(cm.created_at) FROM v_b_ticket_comments cm WHERE cm.ticket_id = t.id AND COALESCE(cm.is_internal, FALSE) = FALSE) AS first_public_comment_at,` : ""}
          ${hasMajorIncident ? "t.is_major_incident," : ""}
          c.name AS client_name,
          c.name AS client_nom,
          ${TICKET_REQUESTER_EMAIL_SQL} AS requester_email,
          ass_u.email AS assigned_email,
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'user_id', w.user_id,
                  'created_at', w.created_at
                )
                ORDER BY w.created_at ASC
              )
              FROM v_b_ticket_watchers w
              WHERE w.ticket_id = t.id
            ),
            '[]'::json
          ) AS watchers,
          ${hasTicketAssignees ? `COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'user_id', a.user_id,
                  'created_at', a.created_at
                )
                ORDER BY a.created_at ASC
              )
              FROM v_b_ticket_assignees a
              WHERE a.ticket_id = t.id
            ),
            '[]'::json
          ) AS assignees,` : "'[]'::json AS assignees,"}
          ${hasTicketTags ? `COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', tg.id,
                  'label', tg.label,
                  'color', tg.color
                )
                ORDER BY tg.label ASC
              )
              FROM v_b_ticket_tag_links tl
              JOIN v_b_ticket_tags tg ON tg.id = tl.tag_id
              WHERE tl.ticket_id = t.id
            ),
            '[]'::json
          ) AS tags,` : "'[]'::json AS tags,"}
          COALESCE((SELECT COUNT(*) FROM v_b_ticket_watchers w2 WHERE w2.ticket_id = t.id), 0) AS followers_count,
          ${hasTicketAssignees ? "COALESCE((SELECT COUNT(*) FROM v_b_ticket_assignees a2 WHERE a2.ticket_id = t.id), 0) AS assignees_count," : "0 AS assignees_count,"}
          (SELECT COUNT(*) FROM v_b_ticket_comments cm WHERE cm.ticket_id = t.id) AS comments_count
         FROM v_b_tickets t
         LEFT JOIN v_b_clients c ON c.id = t.client_id
         LEFT JOIN v_b_users req_u ON req_u.id = t.requester_user_id
         LEFT JOIN v_b_users ass_u ON ass_u.id = t.assigned_user_id
         ${planningJoin}`;
}
export async function countTickets(pool, filterOptions, schema) {
  const {
    whereSql,
    values
  } = buildTicketListWhere({
    ...filterOptions,
    schema
  });
  const result = await pool.query(`SELECT COUNT(*)::int AS total
     FROM v_b_tickets t
     LEFT JOIN v_b_clients c ON c.id = t.client_id
     LEFT JOIN v_b_users req_u ON req_u.id = t.requester_user_id
     LEFT JOIN v_b_users ass_u ON ass_u.id = t.assigned_user_id
     ${whereSql}`, values);
  return Number(result.rows?.[0]?.total || 0);
}
export async function countTicketsByStatus(pool, filterOptions, schema) {
  const {
    whereSql,
    values
  } = buildTicketListWhere({
    ...filterOptions,
    schema
  });
  const result = await pool.query(`SELECT
       CASE WHEN t.status = 'open' THEN 'new' ELSE t.status END AS status_key,
       COUNT(*)::int AS count
     FROM v_b_tickets t
     LEFT JOIN v_b_clients c ON c.id = t.client_id
     LEFT JOIN v_b_users req_u ON req_u.id = t.requester_user_id
     LEFT JOIN v_b_users ass_u ON ass_u.id = t.assigned_user_id
     ${whereSql}
     GROUP BY 1`, values);
  const counts = {
    new: 0,
    in_progress: 0,
    pending: 0,
    resolved: 0,
    closed: 0
  };
  for (const row of result.rows || []) {
    const key = String(row.status_key || "").trim();
    if (counts[key] !== undefined) counts[key] = Number(row.count || 0);
  }
  return counts;
}
export async function searchTicketsPaged(pool, {
  viewRules = null,
  viewMode = "active",
  status = "",
  ticketType = "",
  ticketFamily = "support",
  search = "",
  sortBy = "updated_at",
  sortDirection = "desc",
  limit = 25,
  offset = 0,
  currentUserId = null
}, schema) {
  const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), TICKET_SEARCH_MAX_LIMIT);
  const safeOffset = Math.max(Number(offset) || 0, 0);
  const {
    whereSql,
    values,
    ctx
  } = buildTicketListWhere({
    viewRules,
    viewMode,
    status,
    ticketType,
    ticketFamily,
    search,
    currentUserId,
    schema
  });
  const orderBySql = buildOrderBySql(sortBy, sortDirection, ctx);
  const listValues = [...values, safeLimit, safeOffset];
  const limitParam = `$${listValues.length - 1}`;
  const offsetParam = `$${listValues.length}`;
  const [listResult, total] = await Promise.all([pool.query(`${buildTicketListSelectSql(schema)}
       ${whereSql}
       ORDER BY ${orderBySql}
       LIMIT ${limitParam} OFFSET ${offsetParam}`, listValues), countTickets(pool, {
    viewRules,
    ticketFamily,
    viewMode,
    status,
    ticketType,
    search,
    currentUserId
  }, schema)]);
  return {
    items: listResult.rows || [],
    total,
    limit: safeLimit,
    offset: safeOffset
  };
}
