import { pool } from "../database/db.js";
import { listCheckmkHistoryItems } from "../routes/integrations/checkmk/equipmentMonitoringSync.js";
import { ensureSupervisionAlertsSchema } from "../services/ensureSupervisionAlertsSchema.js";

const ACTIVE_STATUSES = new Set(["open", "acked", "linked"]);
const CLOSE_REASONS = new Set(["resolved", "dismissed"]);

const ALERT_SELECT_WITH_ACTORS = `
  a.*,
  COALESCE(NULLIF(TRIM(ack_u.username), ''), NULLIF(TRIM(ack_u.email), '')) AS acked_by_name,
  COALESCE(NULLIF(TRIM(cls_u.username), ''), NULLIF(TRIM(cls_u.email), '')) AS closed_by_name
`;

const ALERT_ACTOR_JOINS = `
  LEFT JOIN v_b_users ack_u ON ack_u.id = a.acked_by
  LEFT JOIN v_b_users cls_u ON cls_u.id = a.closed_by
`;

function mapAlert(row) {
  if (!row) return null;
  return {
    id: row.id,
    queueItemId: row.queue_item_id,
    domain: row.domain,
    severity: row.severity,
    clientId: row.client_id,
    equipmentId: row.equipment_id,
    refKey: row.ref_key,
    title: row.title,
    subtitle: row.subtitle,
    label: row.label,
    status: row.status,
    ackedAt: row.acked_at,
    ackedBy: row.acked_by,
    ackedByName: row.acked_by_name || null,
    closedAt: row.closed_at,
    closedBy: row.closed_by,
    closedByName: row.closed_by_name || null,
    closedReason: row.closed_reason,
    linkedTicketId: row.linked_ticket_id,
    linkedTicketKind: row.linked_ticket_kind,
    linkedEventId: row.linked_event_id,
    note: row.note,
    meta: row.meta || {},
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function clip(value, max) {
  if (value == null) return null;
  const text = String(value);
  if (!text) return null;
  return text.length > max ? text.slice(0, max) : text;
}

function mapEvent(row) {
  if (!row) return null;
  return {
    id: row.id,
    alertId: row.alert_id,
    action: row.action,
    actorUserId: row.actor_user_id,
    actorName: row.actor_name || null,
    oldStatus: row.old_status,
    newStatus: row.new_status,
    note: row.note,
    meta: row.meta || {},
    createdAt: row.created_at
  };
}

async function insertEvent(client, {
  alertId,
  action,
  actorUserId,
  oldStatus,
  newStatus,
  note,
  meta
}) {
  const result = await client.query(
    `INSERT INTO v_b_supervision_alert_events
      (alert_id, action, actor_user_id, old_status, new_status, note, meta)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     RETURNING *`,
    [
      alertId,
      action,
      actorUserId || null,
      oldStatus || null,
      newStatus || null,
      note || null,
      JSON.stringify(meta || {})
    ]
  );
  return mapEvent(result.rows[0]);
}

async function getAlertByQueueItemId(client, queueItemId) {
  const result = await client.query(
    `SELECT * FROM v_b_supervision_alerts WHERE queue_item_id = $1 LIMIT 1`,
    [queueItemId]
  );
  return result.rows[0] || null;
}

export async function listActiveSupervisionAlerts() {
  await ensureSupervisionAlertsSchema();
  const result = await pool.query(
    `SELECT ${ALERT_SELECT_WITH_ACTORS}
     FROM v_b_supervision_alerts a
     ${ALERT_ACTOR_JOINS}
     WHERE a.status = ANY($1)
     ORDER BY a.updated_at DESC`,
    [["open", "acked", "linked"]]
  );
  return result.rows.map(mapAlert);
}

/**
 * Persist live queue items the first time they appear in the centre.
 * created_at stays the raise time; existing rows (incl. closed) are left untouched.
 */
export async function ensureSupervisionAlertsSeen(items = []) {
  await ensureSupervisionAlertsSchema();
  const normalized = [];
  const seenIds = new Set();
  for (const raw of Array.isArray(items) ? items : []) {
    const queueItemId = String(raw?.queueItemId || raw?.queue_item_id || raw?.id || "").trim();
    const domain = String(raw?.domain || "").trim();
    if (!queueItemId || !domain || seenIds.has(queueItemId)) continue;
    seenIds.add(queueItemId);
    normalized.push({
      queueItemId,
      domain,
      severity: raw?.severity || null,
      clientId: raw?.clientId ?? raw?.client_id ?? null,
      equipmentId: raw?.equipmentId ?? raw?.equipment_id ?? null,
      refKey: raw?.refKey ?? raw?.ref_key ?? null,
      title: clip(raw?.title, 255),
      subtitle: raw?.subtitle || null,
      label: clip(raw?.label, 255),
      meta: raw?.meta && typeof raw.meta === "object" ? raw.meta : {}
    });
    if (normalized.length >= 500) break;
  }
  if (!normalized.length) return [];

  const ids = normalized.map(item => item.queueItemId);
  const existing = await listSupervisionAlertsByQueueItemIds(ids);
  const existingById = new Map(existing.map(alert => [alert.queueItemId, alert]));
  const missing = normalized.filter(item => !existingById.has(item.queueItemId));
  const reopenable = normalized.filter(item => {
    const alert = existingById.get(item.queueItemId);
    return alert?.status === "closed" && alert?.closedReason === "resolved";
  });

  if (!missing.length && !reopenable.length) return existing;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const item of missing) {
      const insert = await client.query(
        `INSERT INTO v_b_supervision_alerts
          (queue_item_id, domain, severity, client_id, equipment_id, ref_key, title, subtitle, label, status, meta, last_seen_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'open',$10::jsonb, NOW())
         ON CONFLICT (queue_item_id) DO NOTHING
         RETURNING *`,
        [
          item.queueItemId,
          item.domain,
          item.severity,
          item.clientId || null,
          item.equipmentId ? String(item.equipmentId) : null,
          item.refKey || null,
          item.title,
          item.subtitle,
          item.label,
          JSON.stringify(item.meta || {})
        ]
      );
      const row = insert.rows[0];
      if (!row) continue;
      await insertEvent(client, {
        alertId: row.id,
        action: "opened",
        actorUserId: null,
        oldStatus: null,
        newStatus: "open",
        note: null,
        meta: { source: "seen" }
      });
    }
    for (const item of reopenable) {
      const current = existingById.get(item.queueItemId);
      if (!current?.id) continue;
      const updated = await client.query(
        `UPDATE v_b_supervision_alerts
         SET status = 'open',
             severity = COALESCE($2, severity),
             title = COALESCE($3, title),
             subtitle = COALESCE($4, subtitle),
             label = COALESCE($5, label),
             closed_at = NULL,
             closed_by = NULL,
             closed_reason = NULL,
             last_seen_at = NOW(),
             updated_at = NOW()
         WHERE id = $1::uuid AND status = 'closed' AND closed_reason = 'resolved'
         RETURNING *`,
        [current.id, item.severity, item.title, item.subtitle, item.label]
      );
      const row = updated.rows[0];
      if (!row) continue;
      await insertEvent(client, {
        alertId: row.id,
        action: "reopened",
        actorUserId: null,
        oldStatus: "closed",
        newStatus: "open",
        note: null,
        meta: { source: "seen", reason: "issue_recurring" }
      });
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return listSupervisionAlertsByQueueItemIds(ids);
}

/** All persisted states (incl. closed) for the given queue item ids — used to hide dismissed/resolved alerts. */
export async function listSupervisionAlertsByQueueItemIds(queueItemIds = []) {
  await ensureSupervisionAlertsSchema();
  const ids = [...new Set((Array.isArray(queueItemIds) ? queueItemIds : []).map(id => String(id || "").trim()).filter(Boolean))];
  if (!ids.length) return [];
  const result = await pool.query(
    `SELECT ${ALERT_SELECT_WITH_ACTORS}
     FROM v_b_supervision_alerts a
     ${ALERT_ACTOR_JOINS}
     WHERE a.queue_item_id = ANY($1::text[])
     ORDER BY a.updated_at DESC`,
    [ids]
  );
  return result.rows.map(mapAlert);
}

export async function listSupervisionAlertHistory({
  limit = 100,
  offset = 0,
  domain = null,
  status = null,
  query = null,
  equipmentId = null,
  clientId = null
} = {}) {
  await ensureSupervisionAlertsSchema();
  const params = [];
  const where = [];

  const statusRaw = status == null ? "" : String(status).trim().toLowerCase();
  if (statusRaw && statusRaw !== "all" && statusRaw !== "*") {
    params.push(statusRaw);
    where.push(`a.status = $${params.length}`);
  } else if (!statusRaw) {
    // Default history: closed + currently handled (acked/linked)
    params.push(["acked", "linked", "closed"]);
    where.push(`a.status = ANY($${params.length})`);
  }

  if (domain) {
    params.push(domain);
    where.push(`a.domain = $${params.length}`);
  }
  if (equipmentId) {
    params.push(String(equipmentId));
    where.push(`(
      LOWER(TRIM(a.equipment_id)) = LOWER(TRIM($${params.length}))
      OR LOWER(TRIM(a.equipment_id)) LIKE '%:' || LOWER(TRIM($${params.length}))
      OR LOWER(TRIM(COALESCE(a.ref_key, ''))) = LOWER(TRIM($${params.length}))
    )`);
  }
  if (clientId != null && clientId !== "") {
    params.push(Number(clientId));
    where.push(`a.client_id = $${params.length}`);
  }
  if (query) {
    params.push(`%${String(query).trim().toLowerCase()}%`);
    where.push(
      `(LOWER(COALESCE(a.title, '')) LIKE $${params.length}
        OR LOWER(COALESCE(a.subtitle, '')) LIKE $${params.length}
        OR LOWER(COALESCE(a.label, '')) LIKE $${params.length}
        OR LOWER(COALESCE(a.queue_item_id, '')) LIKE $${params.length})`
    );
  }

  const lim = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const off = Math.max(Number(offset) || 0, 0);
  params.push(lim);
  params.push(off);

  const result = await pool.query(
    `SELECT ${ALERT_SELECT_WITH_ACTORS}
     FROM v_b_supervision_alerts a
     ${ALERT_ACTOR_JOINS}
     WHERE ${where.length ? where.join(" AND ") : "TRUE"}
     ORDER BY COALESCE(a.closed_at, a.updated_at, a.created_at) DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return result.rows.map(mapAlert);
}

function inferCriterionSeverity(criterionKey) {
  const key = String(criterionKey || "").trim().toLowerCase();
  if (["monitor_critical", "agent_offline", "disk_critical", "maintenance_expired", "battery_expired", "warranty_expired"].includes(key)) {
    return "critical";
  }
  if (["monitor_warning", "disk_warn", "updates_pending", "warranty_soon", "maintenance_soon", "battery_soon", "unmapped", "no_data", "missing_ip"].includes(key)) {
    return "warning";
  }
  return "info";
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || "").trim());
}

async function queryOrEmpty(sql, params) {
  try {
    return await pool.query(sql, params);
  } catch (err) {
    if (err?.code === "42P01") return { rows: [] };
    throw err;
  }
}

/**
 * Unified recent alerts for an equipment detail history (same sources as inventory 30-day count).
 */
export async function listRecentEquipmentAlerts({
  equipmentId,
  limit = 50,
  days = 30
} = {}) {
  const id = String(equipmentId || "").trim();
  if (!id) return [];

  const token = id.toLowerCase();
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const sinceDays = Math.min(Math.max(Number(days) || 30, 1), 365);
  await ensureSupervisionAlertsSchema();

  const supervision = await queryOrEmpty(
    `SELECT ${ALERT_SELECT_WITH_ACTORS}
     FROM v_b_supervision_alerts a
     ${ALERT_ACTOR_JOINS}
     WHERE a.created_at >= NOW() - ($2::int * INTERVAL '1 day')
       AND NULLIF(TRIM(a.equipment_id), '') IS NOT NULL
       AND (
         LOWER(TRIM(a.equipment_id)) = $1
         OR LOWER(TRIM(a.equipment_id)) LIKE '%:' || $1
         OR LOWER(TRIM(COALESCE(a.ref_key, ''))) = $1
       )
     ORDER BY a.created_at DESC
     LIMIT $3`,
    [token, sinceDays, lim]
  );

  let monitoringRows = [];
  if (isUuid(token)) {
    const monitoring = await queryOrEmpty(
      `SELECT *
       FROM v_b_monitoring_events
       WHERE created_at >= NOW() - ($2::int * INTERVAL '1 day')
         AND equipment_id IS NOT NULL
         AND LOWER(equipment_id::text) = $1
       ORDER BY created_at DESC
       LIMIT $3`,
      [token, sinceDays, lim]
    );
    monitoringRows = monitoring.rows || [];
  }

  const items = [];

  for (const row of supervision.rows || []) {
    const alert = mapAlert(row);
    items.push({
      id: `sup-${alert.id}`,
      source: "supervision",
      title: alert.title || alert.label || alert.queueItemId,
      subtitle: alert.subtitle || null,
      typeKey: alert.label || alert.domain || null,
      typeKind: "label",
      domain: alert.domain || null,
      criterionKey: null,
      eventType: null,
      severity: alert.severity || "warning",
      status: alert.status || "open",
      at: alert.createdAt || alert.updatedAt || alert.closedAt || null,
      ticketId: alert.linkedTicketId || null
    });
  }

  for (const event of monitoringRows) {
    const criterionKey = event.criterion_key || null;
    const eventType = event.event_type || null;
    const resolved = String(eventType || "").includes("resolved");
    items.push({
      id: `mon-${event.id}`,
      source: "monitoring",
      title: criterionKey || eventType || "alert",
      subtitle: null,
      typeKey: criterionKey || eventType,
      typeKind: criterionKey ? "criterion" : "event",
      domain: "devices",
      criterionKey,
      eventType,
      severity: inferCriterionSeverity(criterionKey),
      status: resolved ? "closed" : event.status === "pending" ? "open" : event.status || "open",
      at: event.created_at || null,
      ticketId: event.ticket_id || null
    });
  }

  if (isUuid(token)) {
    const mk = await queryOrEmpty(
      `SELECT monitoring_data
       FROM v_b_equipment_checkmk_monitoring
       WHERE equipment_id = $1::uuid
       LIMIT 1`,
      [token]
    );
    const monitoringData = mk.rows?.[0]?.monitoring_data || null;
    for (const row of listCheckmkHistoryItems(monitoringData, { days: sinceDays, limit: lim })) {
      items.push(row);
    }
  }

  items.sort((a, b) => {
    const ta = a.at ? new Date(a.at).getTime() : 0;
    const tb = b.at ? new Date(b.at).getTime() : 0;
    return tb - ta;
  });

  return items.slice(0, lim);
}

export async function getSupervisionAlertEvents(alertId) {
  await ensureSupervisionAlertsSchema();
  const result = await pool.query(
    `SELECT e.*,
            COALESCE(NULLIF(TRIM(u.username), ''), NULLIF(TRIM(u.email), '')) AS actor_name
     FROM v_b_supervision_alert_events e
     LEFT JOIN v_b_users u ON u.id = e.actor_user_id
     WHERE e.alert_id = $1
     ORDER BY e.created_at DESC`,
    [alertId]
  );
  return result.rows.map(mapEvent);
}

export async function upsertAndActOnSupervisionAlert({
  queueItemId,
  domain,
  severity,
  clientId,
  equipmentId,
  refKey,
  title,
  subtitle,
  label,
  meta,
  action,
  note,
  actorUserId,
  linkedTicketId,
  linkedTicketKind,
  linkedEventId,
  closedReason
}) {
  await ensureSupervisionAlertsSchema();
  if (!queueItemId) throw new Error("queueItemId required");
  if (!action) throw new Error("action required");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let row = await getAlertByQueueItemId(client, queueItemId);
    const now = new Date();
    const resolvedDomain = domain || row?.domain || null;
    if (!resolvedDomain) throw new Error("domain required");

    if (!row) {
      const insert = await client.query(
        `INSERT INTO v_b_supervision_alerts
          (queue_item_id, domain, severity, client_id, equipment_id, ref_key, title, subtitle, label, status, meta, last_seen_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'open',$10::jsonb, NOW())
         RETURNING *`,
        [
          queueItemId,
          resolvedDomain,
          severity || null,
          clientId || null,
          equipmentId ? String(equipmentId) : null,
          refKey || null,
          title || null,
          subtitle || null,
          label || null,
          JSON.stringify(meta || {})
        ]
      );
      row = insert.rows[0];
      await insertEvent(client, {
        alertId: row.id,
        action: "opened",
        actorUserId,
        oldStatus: null,
        newStatus: "open",
        note: null,
        meta: { source: "upsert" }
      });
    } else {
      await client.query(
        `UPDATE v_b_supervision_alerts SET
          severity = COALESCE($2, severity),
          client_id = COALESCE($3, client_id),
          equipment_id = COALESCE($4, equipment_id),
          ref_key = COALESCE($5, ref_key),
          title = COALESCE($6, title),
          subtitle = COALESCE($7, subtitle),
          label = COALESCE($8, label),
          meta = CASE WHEN $9::text IS NULL THEN meta ELSE $9::jsonb END,
          last_seen_at = NOW(),
          updated_at = NOW()
         WHERE id = $1`,
        [
          row.id,
          severity || null,
          clientId || null,
          equipmentId ? String(equipmentId) : null,
          refKey || null,
          title || null,
          subtitle || null,
          label || null,
          meta ? JSON.stringify(meta) : null
        ]
      );
      const refreshed = await client.query(`SELECT * FROM v_b_supervision_alerts WHERE id = $1`, [row.id]);
      row = refreshed.rows[0];
    }

    const oldStatus = row.status;
    let newStatus = oldStatus;
    let eventAction = action;
    const patch = {
      updated_at: now
    };

    if (action === "ack") {
      newStatus = oldStatus === "linked" ? "linked" : "acked";
      patch.status = newStatus;
      patch.acked_at = now;
      patch.acked_by = actorUserId || null;
      if (note) patch.note = note;
    } else if (action === "unack") {
      if (oldStatus === "closed") throw new Error("Cannot unack a closed alert");
      newStatus = "open";
      patch.status = newStatus;
      patch.acked_at = null;
      patch.acked_by = null;
    } else if (action === "link") {
      newStatus = "linked";
      patch.status = newStatus;
      if (!row.acked_at) {
        patch.acked_at = now;
        patch.acked_by = actorUserId || null;
      }
      if (linkedTicketId) patch.linked_ticket_id = String(linkedTicketId);
      if (linkedTicketKind) patch.linked_ticket_kind = String(linkedTicketKind);
      if (linkedEventId) patch.linked_event_id = String(linkedEventId);
      if (note) patch.note = note;
    } else if (action === "resolve" || action === "dismiss") {
      newStatus = "closed";
      patch.status = newStatus;
      patch.closed_at = now;
      patch.closed_by = actorUserId || null;
      patch.closed_reason = CLOSE_REASONS.has(closedReason)
        ? closedReason
        : action === "dismiss"
          ? "dismissed"
          : "resolved";
      if (note) patch.note = note;
      eventAction = action === "dismiss" ? "dismissed" : "resolved";
    } else if (action === "reopen") {
      newStatus = "open";
      patch.status = newStatus;
      patch.closed_at = null;
      patch.closed_by = null;
      patch.closed_reason = null;
      patch.acked_at = null;
      patch.acked_by = null;
    } else if (action === "note") {
      if (note) patch.note = note;
      eventAction = "note";
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    const sets = [];
    const values = [row.id];
    const add = (col, val) => {
      values.push(val);
      sets.push(`${col} = $${values.length}`);
    };
    Object.entries(patch).forEach(([key, val]) => {
      if (key === "updated_at") {
        sets.push("updated_at = NOW()");
        return;
      }
      add(key, val);
    });

    const updated = await client.query(
      `UPDATE v_b_supervision_alerts SET ${sets.join(", ")} WHERE id = $1 RETURNING *`,
      values
    );
    row = updated.rows[0];

    const event = await insertEvent(client, {
      alertId: row.id,
      action: eventAction,
      actorUserId,
      oldStatus,
      newStatus: row.status,
      note: note || null,
      meta: {
        linkedTicketId: linkedTicketId || null,
        linkedTicketKind: linkedTicketKind || null,
        linkedEventId: linkedEventId || null,
        closedReason: patch.closed_reason || null
      }
    });

    const enriched = await client.query(
      `SELECT ${ALERT_SELECT_WITH_ACTORS}
       FROM v_b_supervision_alerts a
       ${ALERT_ACTOR_JOINS}
       WHERE a.id = $1`,
      [row.id]
    );
    row = enriched.rows[0] || row;

    await client.query("COMMIT");
    const result = {
      alert: mapAlert(row),
      event
    };
    broadcastSupervisionAlertUpdate({
      type: "alert",
      action: eventAction,
      alert: result.alert,
      event: result.event,
      actorUserId: actorUserId || null
    });
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

const streamClients = new Set();

export function addSupervisionAlertStreamClient(res) {
  streamClients.add(res);
}

export function removeSupervisionAlertStreamClient(res) {
  streamClients.delete(res);
}

export function broadcastSupervisionAlertUpdate(payload) {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of streamClients) {
    try {
      client.write(data);
    } catch {
      streamClients.delete(client);
    }
  }
}

export function broadcastSupervisionAlertHeartbeat() {
  broadcastSupervisionAlertUpdate({
    type: "heartbeat",
    at: new Date().toISOString()
  });
}

export { ACTIVE_STATUSES };
