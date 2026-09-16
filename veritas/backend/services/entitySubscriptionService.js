import { pool } from "../database/db.js";
import { ensureEntitySubscriptionsSchema } from "./ensureEntitySubscriptionsSchema.js";

export const ENTITY_SUBSCRIPTION_TYPES = ["enterprise", "contact", "equipment"];

function normalizeEntityType(raw) {
  const value = String(raw || "").trim().toLowerCase();
  return ENTITY_SUBSCRIPTION_TYPES.includes(value) ? value : null;
}

function normalizeEntityId(raw) {
  return String(raw || "").trim();
}

function mapSubscriptionRow(row) {
  if (!row) return null;
  return {
    userId: String(row.user_id),
    entityType: row.entity_type,
    entityId: String(row.entity_id),
    notifyInapp: row.notify_inapp !== false,
    notifyEmail: row.notify_email === true,
    createdAt: row.created_at || null,
    label: row.label || null,
    meta: row.meta || null
  };
}

async function ensureReady() {
  await ensureEntitySubscriptionsSchema();
}

export async function getSubscription(userId, entityType, entityId) {
  await ensureReady();
  const type = normalizeEntityType(entityType);
  const id = normalizeEntityId(entityId);
  if (!userId || !type || !id) return null;
  const result = await pool.query(
    `SELECT user_id, entity_type, entity_id, notify_inapp, notify_email, created_at
     FROM v_b_entity_subscriptions
     WHERE user_id = $1 AND entity_type = $2 AND entity_id = $3
     LIMIT 1`,
    [userId, type, id]
  );
  return mapSubscriptionRow(result.rows[0]);
}

export async function upsertSubscription(userId, entityType, entityId, {
  notifyInapp = true,
  notifyEmail = false
} = {}) {
  await ensureReady();
  const type = normalizeEntityType(entityType);
  const id = normalizeEntityId(entityId);
  if (!userId || !type || !id) {
    throw new Error("Invalid subscription target");
  }
  const result = await pool.query(
    `INSERT INTO v_b_entity_subscriptions
       (user_id, entity_type, entity_id, notify_inapp, notify_email, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (user_id, entity_type, entity_id)
     DO UPDATE SET
       notify_inapp = EXCLUDED.notify_inapp,
       notify_email = EXCLUDED.notify_email
     RETURNING user_id, entity_type, entity_id, notify_inapp, notify_email, created_at`,
    [userId, type, id, notifyInapp !== false, notifyEmail === true]
  );
  return mapSubscriptionRow(result.rows[0]);
}

export async function deleteSubscription(userId, entityType, entityId) {
  await ensureReady();
  const type = normalizeEntityType(entityType);
  const id = normalizeEntityId(entityId);
  if (!userId || !type || !id) return false;
  const result = await pool.query(
    `DELETE FROM v_b_entity_subscriptions
     WHERE user_id = $1 AND entity_type = $2 AND entity_id = $3`,
    [userId, type, id]
  );
  return result.rowCount > 0;
}

export async function listSubscriberUserIds(entityType, entityId, { channel = "inapp" } = {}) {
  await ensureReady();
  const type = normalizeEntityType(entityType);
  const id = normalizeEntityId(entityId);
  if (!type || !id) return [];
  const channelColumn = channel === "email" ? "notify_email" : "notify_inapp";
  const result = await pool.query(
    `SELECT user_id
     FROM v_b_entity_subscriptions
     WHERE entity_type = $1
       AND entity_id = $2
       AND ${channelColumn} = TRUE`,
    [type, id]
  );
  return result.rows.map(row => String(row.user_id)).filter(Boolean);
}

function extractTicketEquipmentIds(ticket = {}) {
  const ids = new Set();
  const info = ticket.equipment_info;
  if (info && typeof info === "object") {
    const candidates = [
      info.equipmentId,
      info.equipment_id,
      info.id
    ];
    candidates.forEach(value => {
      const id = normalizeEntityId(value);
      if (id) ids.add(id);
    });
  }
  return [...ids];
}

/**
 * Resolve ticket fields needed for subscription matching.
 */
let equipmentInfoColumnCache = null;
async function hasEquipmentInfoColumn() {
  if (equipmentInfoColumnCache !== null) return equipmentInfoColumnCache;
  const result = await pool.query(`SELECT EXISTS (
       SELECT 1
       FROM pg_attribute a
       JOIN pg_class c ON c.oid = a.attrelid
       WHERE c.oid = to_regclass('public.v_b_tickets')
         AND a.attname = 'equipment_info'
         AND NOT a.attisdropped
     ) AS has_column`);
  equipmentInfoColumnCache = Boolean(result.rows?.[0]?.has_column);
  return equipmentInfoColumnCache;
}

let requesterContactColumnCache = null;
async function hasRequesterContactColumn() {
  if (requesterContactColumnCache !== null) return requesterContactColumnCache;
  const result = await pool.query(`SELECT EXISTS (
       SELECT 1
       FROM pg_attribute a
       JOIN pg_class c ON c.oid = a.attrelid
       WHERE c.oid = to_regclass('public.v_b_tickets')
         AND a.attname = 'requester_contact_id'
         AND NOT a.attisdropped
     ) AS has_column`);
  requesterContactColumnCache = Boolean(result.rows?.[0]?.has_column);
  return requesterContactColumnCache;
}

export async function loadTicketSubscriptionContext(ticketId) {
  if (!ticketId) return null;
  const hasEquipmentInfo = await hasEquipmentInfoColumn();
  const hasRequesterContact = await hasRequesterContactColumn();
  const result = await pool.query(
    `SELECT t.id,
            t.client_id,
            ${hasRequesterContact ? "t.requester_contact_id," : "NULL::uuid AS requester_contact_id,"}
            ${hasEquipmentInfo ? "t.equipment_info" : "NULL::jsonb AS equipment_info"}
     FROM v_b_tickets t
     WHERE t.id = $1
     LIMIT 1`,
    [ticketId]
  );
  return result.rows[0] || null;
}

export async function listTicketSubscriberUserIds(ticketOrId, { channel = "inapp" } = {}) {
  await ensureReady();
  let ticket = ticketOrId;
  if (!ticket || typeof ticket !== "object") {
    ticket = await loadTicketSubscriptionContext(ticketOrId);
  } else if (!ticket.client_id && !ticket.requester_contact_id && ticket.id) {
    ticket = {
      ...ticket,
      ...(await loadTicketSubscriptionContext(ticket.id) || {})
    };
  }
  if (!ticket) return [];

  const ids = new Set();
  const addAll = async (entityType, entityId) => {
    if (!entityId) return;
    const users = await listSubscriberUserIds(entityType, entityId, { channel });
    users.forEach(id => ids.add(id));
  };

  await addAll("enterprise", ticket.client_id);
  await addAll("contact", ticket.requester_contact_id);
  for (const equipmentId of extractTicketEquipmentIds(ticket)) {
    await addAll("equipment", equipmentId);
  }

  return [...ids];
}

async function resolveEnterpriseLabel(entityId) {
  const result = await pool.query(
    `SELECT name, client_number
     FROM v_b_clients
     WHERE id::text = $1
     LIMIT 1`,
    [String(entityId)]
  );
  const row = result.rows[0];
  if (!row) return { label: String(entityId), meta: null };
  const code = row.client_number != null ? String(row.client_number) : "";
  const name = String(row.name || "").trim() || String(entityId);
  return {
    label: code ? `${code} · ${name}` : name,
    meta: { clientId: String(entityId), clientNumber: code || null }
  };
}

async function resolveContactLabel(entityId) {
  const result = await pool.query(
    `SELECT prenom, nom, email
     FROM v_b_contacts
     WHERE id::text = $1
     LIMIT 1`,
    [String(entityId)]
  );
  const row = result.rows[0];
  if (!row) return { label: String(entityId), meta: null };
  const fullName = `${row.prenom || ""} ${row.nom || ""}`.trim();
  return {
    label: fullName || row.email || String(entityId),
    meta: { contactId: String(entityId), email: row.email || null }
  };
}

async function resolveEquipmentLabel(entityId) {
  // Best-effort: monitoring alerts often store a display name.
  try {
    const result = await pool.query(
      `SELECT equipment_name, client_id, equipment_family
       FROM v_b_equipment_monitoring_alerts
       WHERE equipment_id::text = $1
       ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
       LIMIT 1`,
      [String(entityId)]
    );
    const row = result.rows[0];
    if (row?.equipment_name) {
      return {
        label: String(row.equipment_name),
        meta: {
          equipmentId: String(entityId),
          clientId: row.client_id != null ? String(row.client_id) : null,
          family: row.equipment_family || null
        }
      };
    }
  } catch {
    // table may not exist
  }
  return {
    label: `Équipement ${String(entityId).slice(0, 8)}`,
    meta: { equipmentId: String(entityId) }
  };
}

async function enrichSubscription(row) {
  const base = mapSubscriptionRow(row);
  if (!base) return null;
  let resolved = { label: base.entityId, meta: null };
  try {
    if (base.entityType === "enterprise") resolved = await resolveEnterpriseLabel(base.entityId);
    else if (base.entityType === "contact") resolved = await resolveContactLabel(base.entityId);
    else if (base.entityType === "equipment") resolved = await resolveEquipmentLabel(base.entityId);
  } catch {
    // keep fallback
  }
  return {
    ...base,
    label: resolved.label,
    meta: resolved.meta
  };
}

export async function listSubscriptions(userId) {
  await ensureReady();
  if (!userId) return [];
  const result = await pool.query(
    `SELECT user_id, entity_type, entity_id, notify_inapp, notify_email, created_at
     FROM v_b_entity_subscriptions
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  const enriched = [];
  for (const row of result.rows) {
    enriched.push(await enrichSubscription(row));
  }
  return enriched.filter(Boolean);
}
