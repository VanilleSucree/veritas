import { pool } from "../database/db.js";
import { loadNotificationSettingsRaw } from "./ticketAutomationConfigStore.js";
import { normalizeSystemNotifications, renderSystemTemplate } from "./systemNotificationCatalog.js";
import { upsertUserSetting } from "../utils/userSettingsStore.js";
import { getTestNotificationSample } from "../utils/inAppNotificationI18n.js";
import { listTicketSubscriberUserIds } from "./entitySubscriptionService.js";
export const IN_APP_USER_SETTINGS_KEY = "in_app_notification_settings";
export const DEFAULT_IN_APP_SETTINGS = {
  enabled: false,
  events: {
    ticket_commented: {
      enabled: false,
      notifyAssignees: true,
      notifyWatchers: true,
      excludeInternalComments: false
    },
    ticket_assigned: {
      enabled: false
    },
    ticket_created: {
      enabled: false,
      notifyAssignees: true,
      notifyWatchers: false
    },
    ticket_updated: {
      enabled: false,
      notifyAssignees: true,
      notifyWatchers: false
    },
    ticket_resolved: {
      enabled: false,
      notifyAssignees: true,
      notifyWatchers: false
    },
    ticket_satisfaction: {
      enabled: false,
      notifyAssignees: true,
      notifyWatchers: false
    },
    ticket_validation_requested: {
      enabled: false
    },
    ticket_validation_responded: {
      enabled: false
    }
  }
};
export function normalizeInAppSettings(raw = {}) {
  const defaults = DEFAULT_IN_APP_SETTINGS;
  const events = defaults.events;
  const sourceEvents = raw?.events && typeof raw.events === "object" && !Array.isArray(raw.events) ? raw.events : {};
  const normalizeEvent = (key, fallback) => {
    const item = sourceEvents[key];
    if (!item || typeof item !== "object") return {
      ...fallback
    };
    return {
      ...fallback,
      ...Object.fromEntries(Object.entries(fallback).map(([field, defaultValue]) => [field, typeof item[field] === "boolean" ? item[field] : defaultValue]))
    };
  };
  return {
    enabled: typeof raw?.enabled === "boolean" ? raw.enabled : defaults.enabled,
    events: {
      ticket_commented: normalizeEvent("ticket_commented", events.ticket_commented),
      ticket_assigned: normalizeEvent("ticket_assigned", events.ticket_assigned),
      ticket_created: normalizeEvent("ticket_created", events.ticket_created),
      ticket_updated: normalizeEvent("ticket_updated", events.ticket_updated),
      ticket_resolved: normalizeEvent("ticket_resolved", events.ticket_resolved),
      ticket_satisfaction: normalizeEvent("ticket_satisfaction", events.ticket_satisfaction),
      ticket_validation_requested: normalizeEvent("ticket_validation_requested", events.ticket_validation_requested),
      ticket_validation_responded: normalizeEvent("ticket_validation_responded", events.ticket_validation_responded)
    }
  };
}
export const DEFAULT_USER_IN_APP_PREFERENCES = {
  enabled: true,
  events: {
    ticket_commented: {
      enabled: true
    },
    ticket_assigned: {
      enabled: true
    },
    ticket_created: {
      enabled: true
    },
    ticket_updated: {
      enabled: true
    },
    ticket_resolved: {
      enabled: true
    },
    ticket_satisfaction: {
      enabled: true
    },
    ticket_validation_requested: {
      enabled: true
    },
    ticket_validation_responded: {
      enabled: true
    }
  }
};
const IN_APP_EVENT_KEYS = Object.keys(DEFAULT_IN_APP_SETTINGS.events);
export function normalizeUserInAppPreferences(raw = {}) {
  const defaults = DEFAULT_USER_IN_APP_PREFERENCES;
  const sourceEvents = raw?.events && typeof raw.events === "object" && !Array.isArray(raw.events) ? raw.events : {};
  const normalizeEvent = key => {
    const item = sourceEvents[key];
    const defaultEnabled = defaults.events[key]?.enabled !== false;
    if (!item || typeof item !== "object") return {
      enabled: defaultEnabled
    };
    return {
      enabled: item.enabled !== false
    };
  };
  return {
    enabled: raw?.enabled !== false,
    events: Object.fromEntries(IN_APP_EVENT_KEYS.map(key => [key, normalizeEvent(key)]))
  };
}
export function resolveEffectiveInAppPreferences(adminSettings, userPreferences) {
  const admin = normalizeInAppSettings(adminSettings);
  const user = normalizeUserInAppPreferences(userPreferences);
  if (!admin.enabled) {
    return {
      enabled: false,
      lockedByAdmin: true,
      events: Object.fromEntries(IN_APP_EVENT_KEYS.map(key => [key, {
        enabled: false,
        lockedByAdmin: true,
        adminEnabled: admin.events[key]?.enabled !== false
      }]))
    };
  }
  if (user.enabled === false) {
    return {
      enabled: false,
      lockedByAdmin: false,
      events: Object.fromEntries(IN_APP_EVENT_KEYS.map(key => [key, {
        enabled: false,
        lockedByAdmin: false,
        adminEnabled: admin.events[key]?.enabled !== false
      }]))
    };
  }
  return {
    enabled: true,
    lockedByAdmin: false,
    events: Object.fromEntries(IN_APP_EVENT_KEYS.map(key => {
      const adminEnabled = admin.events[key]?.enabled !== false;
      const userEnabled = user.events[key]?.enabled !== false;
      return [key, {
        enabled: adminEnabled && userEnabled,
        lockedByAdmin: !adminEnabled,
        adminEnabled,
        userEnabled
      }];
    }))
  };
}
export async function loadInAppSettings() {
  const settings = await loadNotificationSettingsRaw().catch(() => ({}));
  return normalizeInAppSettings(settings?.inAppSettings);
}
export async function loadUserInAppPreferences(userId) {
  if (!userId) return normalizeUserInAppPreferences();
  const result = await pool.query(`SELECT setting_value
     FROM v_b_users_settings
     WHERE user_id = $1 AND setting_key = $2
     LIMIT 1`, [userId, IN_APP_USER_SETTINGS_KEY]);
  if (!result.rows.length) return normalizeUserInAppPreferences();
  return normalizeUserInAppPreferences(result.rows[0]?.setting_value);
}
export async function saveUserInAppPreferences(userId, rawPreferences) {
  const normalized = normalizeUserInAppPreferences(rawPreferences);
  await upsertUserSetting(userId, IN_APP_USER_SETTINGS_KEY, normalized);
  return normalized;
}
export async function getUserInAppPreferencesPayload(userId) {
  const [adminDefaults, userPreferences] = await Promise.all([loadInAppSettings(), loadUserInAppPreferences(userId)]);
  return {
    adminDefaults,
    userPreferences,
    effective: resolveEffectiveInAppPreferences(adminDefaults, userPreferences)
  };
}
async function filterNotifiableUserIds(userIds = [], eventKey) {
  const admin = await loadInAppSettings();
  if (!admin.enabled || !admin.events[eventKey]?.enabled) return [];
  const uniqueIds = [...new Set(userIds.map(id => String(id)).filter(Boolean))];
  if (uniqueIds.length === 0) return [];
  const prefsResult = await pool.query(`SELECT user_id, setting_value
     FROM v_b_users_settings
     WHERE setting_key = $1
       AND user_id = ANY($2::uuid[])`, [IN_APP_USER_SETTINGS_KEY, uniqueIds]);
  const prefsByUser = new Map(prefsResult.rows.map(row => [String(row.user_id), normalizeUserInAppPreferences(row.setting_value)]));
  return uniqueIds.filter(userId => {
    const userPrefs = prefsByUser.get(userId) || normalizeUserInAppPreferences();
    if (userPrefs.enabled === false) return false;
    if (userPrefs.events[eventKey]?.enabled === false) return false;
    return true;
  });
}
async function resolveTicketContext(ticketId) {
  const result = await pool.query(`SELECT t.id,
            t.ticket_number,
            t.title,
            t.assigned_user_id,
            c.name AS client_name
     FROM v_b_tickets t
     LEFT JOIN v_b_clients c ON c.id = t.client_id
     WHERE t.id = $1
     LIMIT 1`, [ticketId]);
  return result.rows[0] || null;
}
async function resolveAuthorName(authorUserId) {
  if (!authorUserId) return "Client";
  const result = await pool.query(`SELECT COALESCE(NULLIF(TRIM(username), ''), email, 'Agent') AS display_name
     FROM v_b_users
     WHERE id = $1
     LIMIT 1`, [authorUserId]);
  return result.rows[0]?.display_name || "Agent";
}
export async function getTicketRecipientIds(ticketId, {
  notifyAssignees = true,
  notifyWatchers = true,
  notifySubscribers = true
} = {}) {
  const ids = new Set();
  const ticket = await resolveTicketContext(ticketId);
  if (!ticket) return [];
  if (notifyAssignees && ticket.assigned_user_id) {
    ids.add(String(ticket.assigned_user_id));
  }
  if (notifyAssignees) {
    const assigneesResult = await pool.query(`SELECT user_id FROM v_b_ticket_assignees WHERE ticket_id = $1`, [ticketId]);
    assigneesResult.rows.forEach(row => {
      if (row?.user_id) ids.add(String(row.user_id));
    });
  }
  if (notifyWatchers) {
    const watchersResult = await pool.query(`SELECT user_id FROM v_b_ticket_watchers WHERE ticket_id = $1`, [ticketId]);
    watchersResult.rows.forEach(row => {
      if (row?.user_id) ids.add(String(row.user_id));
    });
  }
  if (notifySubscribers) {
    const subscriberIds = await listTicketSubscriberUserIds(ticketId, { channel: "inapp" }).catch(() => []);
    subscriberIds.forEach(id => ids.add(String(id)));
  }
  return [...ids];
}
async function insertUserNotifications(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) return;
  for (const row of rows) {
    await pool.query(`INSERT INTO v_b_user_notifications
        (user_id, type, title, body, ticket_id, comment_id, payload, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW())`, [row.userId, row.type, row.title, row.body || null, row.ticketId || null, row.commentId || null, JSON.stringify(row.payload || {})]);
  }
}
async function resolveSystemInAppCopy(systemKey, context, fallbackTitle, fallbackBody) {
  const settings = await loadNotificationSettingsRaw().catch(() => ({}));
  const cfg = normalizeSystemNotifications(settings?.systemNotifications)[systemKey];
  if (!cfg) return {
    title: fallbackTitle,
    body: fallbackBody
  };
  return {
    title: renderSystemTemplate(cfg.inAppTitle || cfg.title, context) || fallbackTitle,
    body: renderSystemTemplate(cfg.inAppBody, context) || fallbackBody
  };
}
function buildTicketLabel(ticket = {}) {
  const number = ticket.ticket_number != null ? `#${ticket.ticket_number}` : "Ticket";
  const title = String(ticket.title || "").trim();
  return title ? `${number} · ${title}` : number;
}
function ticketSystemContext(ticket = {}, extra = {}) {
  return {
    ticket: {
      ticket_number: ticket.ticket_number ?? "",
      title: ticket.title || "",
      status: ticket.status || ""
    },
    entreprise: {
      nom: ticket.client_name || ""
    },
    ...extra
  };
}
export async function notifyInAppTicketCommented({
  ticketId,
  commentId,
  authorUserId,
  isInternal = false,
  contentPreview = ""
}) {
  const settings = await loadInAppSettings();
  if (!settings.enabled || !settings.events.ticket_commented.enabled) return;
  if (isInternal && settings.events.ticket_commented.excludeInternalComments) return;
  const eventSettings = settings.events.ticket_commented;
  const ticket = await resolveTicketContext(ticketId);
  if (!ticket) return;
  const recipientIds = await getTicketRecipientIds(ticketId, {
    notifyAssignees: eventSettings.notifyAssignees !== false,
    notifyWatchers: eventSettings.notifyWatchers !== false
  });
  const authorId = authorUserId ? String(authorUserId) : null;
  const filteredRecipients = await filterNotifiableUserIds(recipientIds.filter(id => id !== authorId), "ticket_commented");
  if (filteredRecipients.length === 0) return;
  const authorName = await resolveAuthorName(authorUserId);
  const preview = String(contentPreview || "").replace(/\s+/g, " ").trim().slice(0, 140);
  const ticketLabel = buildTicketLabel(ticket);
  const fallbackTitle = isInternal ? `Internal note on ${ticketLabel}` : `New comment on ${ticketLabel}`;
  const fallbackBody = preview ? `${authorName}: ${preview}` : `${authorName} commented on the ticket`;
  const copy = await resolveSystemInAppCopy("tickets.commented", ticketSystemContext(ticket, {
    comment: {
      author: authorName,
      preview
    }
  }), fallbackTitle, fallbackBody);
  const title = copy.title;
  const body = copy.body;
  await insertUserNotifications(filteredRecipients.map(userId => ({
    userId,
    type: "ticket_commented",
    title,
    body,
    ticketId,
    commentId: commentId || null,
    payload: {
      authorUserId,
      authorName,
      isInternal: Boolean(isInternal),
      ticketNumber: ticket.ticket_number ?? null,
      ticketTitle: ticket.title || "",
      clientName: ticket.client_name || ""
    }
  })));
}
export async function notifyInAppTicketAssigned({
  ticketId,
  assignedUserId,
  assignedByUserId
}) {
  const settings = await loadInAppSettings();
  if (!settings.enabled || !settings.events.ticket_assigned.enabled) return;
  const userId = assignedUserId ? String(assignedUserId) : "";
  if (!userId || userId === String(assignedByUserId || "")) return;
  const notifiableRecipients = await filterNotifiableUserIds([userId], "ticket_assigned");
  if (notifiableRecipients.length === 0) return;
  const ticket = await resolveTicketContext(ticketId);
  if (!ticket) return;
  const ticketLabel = buildTicketLabel(ticket);
  const copy = await resolveSystemInAppCopy("tickets.assigned", {
    ticket: {
      ticket_number: ticket.ticket_number ?? "",
      title: ticket.title || "",
      status: ticket.status || ""
    },
    entreprise: {
      nom: ticket.client_name || ""
    }
  }, `Assignment on ${ticketLabel}`, "You have been assigned to this ticket.");
  await insertUserNotifications([{
    userId: notifiableRecipients[0],
    type: "ticket_assigned",
    title: copy.title,
    body: copy.body,
    ticketId,
    commentId: null,
    payload: {
      assignedByUserId: assignedByUserId || null,
      ticketNumber: ticket.ticket_number ?? null,
      ticketTitle: ticket.title || "",
      clientName: ticket.client_name || ""
    }
  }]);
}
export async function notifyInAppTicketCreated({
  ticketId,
  createdByUserId
}) {
  const settings = await loadInAppSettings();
  if (!settings.enabled || !settings.events.ticket_created.enabled) return;
  const eventSettings = settings.events.ticket_created;
  const ticket = await resolveTicketContext(ticketId);
  if (!ticket) return;
  const recipientIds = await getTicketRecipientIds(ticketId, {
    notifyAssignees: eventSettings.notifyAssignees !== false,
    notifyWatchers: eventSettings.notifyWatchers === true
  });
  const filteredRecipients = await filterNotifiableUserIds(recipientIds.filter(id => id !== String(createdByUserId || "")), "ticket_created");
  if (filteredRecipients.length === 0) return;
  const ticketLabel = buildTicketLabel(ticket);
  const copy = await resolveSystemInAppCopy("tickets.created", ticketSystemContext(ticket), `New ticket ${ticketLabel}`, "A new ticket was created.");
  await insertUserNotifications(filteredRecipients.map(userId => ({
    userId,
    type: "ticket_created",
    title: copy.title,
    body: copy.body,
    ticketId,
    commentId: null,
    payload: {
      createdByUserId: createdByUserId || null,
      ticketNumber: ticket.ticket_number ?? null,
      ticketTitle: ticket.title || "",
      clientName: ticket.client_name || ""
    }
  })));
}
export async function notifyInAppTicketStatusChanged({
  ticketId,
  newStatus,
  changedByUserId
}) {
  const settings = await loadInAppSettings();
  if (!settings.enabled) return;
  const isResolved = String(newStatus || "").toLowerCase() === "resolved";
  const eventKey = isResolved ? "ticket_resolved" : "ticket_updated";
  const eventSettings = settings.events[eventKey];
  if (!eventSettings?.enabled) return;
  const ticket = await resolveTicketContext(ticketId);
  if (!ticket) return;
  const recipientIds = await getTicketRecipientIds(ticketId, {
    notifyAssignees: eventSettings.notifyAssignees !== false,
    notifyWatchers: eventSettings.notifyWatchers === true
  });
  const filteredRecipients = await filterNotifiableUserIds(recipientIds.filter(id => id !== String(changedByUserId || "")), eventKey);
  if (filteredRecipients.length === 0) return;
  const ticketLabel = buildTicketLabel(ticket);
  const fallbackTitle = isResolved ? `${ticketLabel} resolved` : `${ticketLabel} updated`;
  const fallbackBody = isResolved ? "The ticket was marked as resolved." : "The ticket was updated.";
  const copy = await resolveSystemInAppCopy(isResolved ? "tickets.resolved" : "tickets.updated", ticketSystemContext(ticket, {
    ticket: {
      ticket_number: ticket.ticket_number ?? "",
      title: ticket.title || "",
      status: newStatus || ticket.status || ""
    }
  }), fallbackTitle, fallbackBody);
  await insertUserNotifications(filteredRecipients.map(userId => ({
    userId,
    type: eventKey,
    title: copy.title,
    body: copy.body,
    ticketId,
    commentId: null,
    payload: {
      newStatus: newStatus || "",
      changedByUserId: changedByUserId || null,
      ticketNumber: ticket.ticket_number ?? null,
      ticketTitle: ticket.title || "",
      clientName: ticket.client_name || ""
    }
  })));
}
export async function notifyInAppTicketSatisfaction({
  ticketId,
  rating,
  ratings = null,
  averageRating = null,
  message = "",
  authorUserId,
  authorName = "Client"
}) {
  const settings = await loadInAppSettings();
  if (!settings.enabled || !settings.events.ticket_satisfaction?.enabled) return;
  const eventSettings = settings.events.ticket_satisfaction;
  const ticket = await resolveTicketContext(ticketId);
  if (!ticket) return;
  const recipientIds = await getTicketRecipientIds(ticketId, {
    notifyAssignees: eventSettings.notifyAssignees !== false,
    notifyWatchers: eventSettings.notifyWatchers === true
  });
  const filteredRecipients = await filterNotifiableUserIds(recipientIds, "ticket_satisfaction");
  if (filteredRecipients.length === 0) return;
  const stars = Math.max(1, Math.min(5, Number(rating) || 0));
  const avg = averageRating != null && !Number.isNaN(Number(averageRating)) ? Number(averageRating) : stars;
  const ticketLabel = buildTicketLabel(ticket);
  const preview = String(message || "").replace(/\s+/g, " ").trim().slice(0, 140);
  const fallbackTitle = `Customer feedback on ${ticketLabel}`;
  const fallbackBody = preview ? `${authorName} · avg. ${avg}/5 — ${preview}` : `${authorName} rated the ticket (avg. ${avg}/5)`;
  const copy = await resolveSystemInAppCopy("tickets.satisfaction", ticketSystemContext(ticket, {
    satisfaction: {
      author: authorName,
      rating: avg,
      message: preview
    }
  }), fallbackTitle, fallbackBody);
  const title = copy.title;
  const body = copy.body;
  await insertUserNotifications(filteredRecipients.map(userId => ({
    userId,
    type: "ticket_satisfaction",
    title,
    body,
    ticketId,
    commentId: null,
    payload: {
      rating: stars,
      ratings: ratings && typeof ratings === "object" ? ratings : null,
      averageRating: avg,
      message: String(message || "").trim(),
      authorUserId: authorUserId || null,
      authorName,
      ticketNumber: ticket.ticket_number ?? null,
      ticketTitle: ticket.title || "",
      clientName: ticket.client_name || ""
    }
  })));
}
export async function notifyInAppTicketValidationRequested({
  ticketId,
  validationRequestId,
  validatorUserId,
  requestedByUserId,
  message = "",
  ticketFamily = "support"
}) {
  const settings = await loadInAppSettings();
  if (!settings.enabled || !settings.events.ticket_validation_requested?.enabled) return;
  const userId = validatorUserId ? String(validatorUserId) : "";
  if (!userId) return;
  const notifiableRecipients = await filterNotifiableUserIds([userId], "ticket_validation_requested");
  if (notifiableRecipients.length === 0) return;
  const ticket = await resolveTicketContext(ticketId);
  if (!ticket) return;
  const authorName = await resolveAuthorName(requestedByUserId);
  const ticketLabel = buildTicketLabel(ticket);
  const preview = String(message || "").replace(/\s+/g, " ").trim().slice(0, 140);
  const fallbackTitle = `Validation requested on ${ticketLabel}`;
  const fallbackBody = preview ? `${authorName}: ${preview}` : `${authorName} asked you to validate this ticket`;
  const copy = await resolveSystemInAppCopy("tickets.validation_requested", ticketSystemContext(ticket, {
    agent: {
      username: authorName
    },
    validation: {
      message: preview
    }
  }), fallbackTitle, fallbackBody);
  const title = copy.title;
  const body = copy.body;
  await insertUserNotifications([{
    userId: notifiableRecipients[0],
    type: "ticket_validation_requested",
    title,
    body,
    ticketId,
    commentId: null,
    payload: {
      validationRequestId: validationRequestId || null,
      requestedByUserId: requestedByUserId || null,
      authorName,
      message: String(message || "").trim(),
      ticketFamily,
      ticketNumber: ticket.ticket_number ?? null,
      ticketTitle: ticket.title || "",
      clientName: ticket.client_name || ""
    }
  }]);
}
export async function notifyInAppTicketValidationResponded({
  ticketId,
  validationRequestId,
  requestedByUserId,
  validatorUserId,
  decision,
  responseMessage = "",
  ticketFamily = "support"
}) {
  const settings = await loadInAppSettings();
  if (!settings.enabled || !settings.events.ticket_validation_responded?.enabled) return;
  const userId = requestedByUserId ? String(requestedByUserId) : "";
  if (!userId || userId === String(validatorUserId || "")) return;
  const notifiableRecipients = await filterNotifiableUserIds([userId], "ticket_validation_responded");
  if (notifiableRecipients.length === 0) return;
  const ticket = await resolveTicketContext(ticketId);
  if (!ticket) return;
  const validatorName = await resolveAuthorName(validatorUserId);
  const ticketLabel = buildTicketLabel(ticket);
  const approved = decision === "approved";
  const preview = String(responseMessage || "").replace(/\s+/g, " ").trim().slice(0, 140);
  const fallbackTitle = approved ? `Validation approved on ${ticketLabel}` : `Validation rejected on ${ticketLabel}`;
  const fallbackBody = preview ? `${validatorName}: ${preview}` : approved ? `${validatorName} approved the validation` : `${validatorName} rejected the validation`;
  const copy = await resolveSystemInAppCopy("tickets.validation_responded", ticketSystemContext(ticket, {
    validation: {
      validator: validatorName,
      decision: approved ? "approuvé" : "refusé",
      message: preview
    }
  }), fallbackTitle, fallbackBody);
  const title = copy.title;
  const body = copy.body;
  await insertUserNotifications([{
    userId: notifiableRecipients[0],
    type: "ticket_validation_responded",
    title,
    body,
    ticketId,
    commentId: null,
    payload: {
      validationRequestId: validationRequestId || null,
      validatorUserId: validatorUserId || null,
      validatorName,
      decision,
      responseMessage: String(responseMessage || "").trim(),
      ticketFamily,
      ticketNumber: ticket.ticket_number ?? null,
      ticketTitle: ticket.title || "",
      clientName: ticket.client_name || ""
    }
  }]);
}
function mapNotificationRow(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body || "",
    ticketId: row.ticket_id || null,
    commentId: row.comment_id || null,
    payload: row.payload && typeof row.payload === "object" ? row.payload : {},
    readAt: row.read_at || null,
    archivedAt: row.archived_at || null,
    createdAt: row.created_at,
    isRead: Boolean(row.read_at),
    isArchived: Boolean(row.archived_at)
  };
}
export async function listUserNotifications(userId, {
  limit = 30,
  offset = 0,
  unreadOnly = false,
  ticketId = null,
  archivedOnly = false
} = {}) {
  const params = [userId];
  const archiveFilter = archivedOnly ? "archived_at IS NOT NULL" : "archived_at IS NULL";
  const filters = ["user_id = $1", archiveFilter];
  if (unreadOnly) filters.push("read_at IS NULL");
  if (ticketId) {
    params.push(ticketId);
    filters.push(`ticket_id = $${params.length}`);
  }
  params.push(Math.min(Math.max(Number(limit) || 30, 1), 100));
  const limitParam = `$${params.length}`;
  params.push(Math.max(Number(offset) || 0, 0));
  const offsetParam = `$${params.length}`;
  const result = await pool.query(`SELECT id, type, title, body, ticket_id, comment_id, payload, read_at, archived_at, created_at
     FROM v_b_user_notifications
     WHERE ${filters.join(" AND ")}
     ORDER BY created_at DESC
     LIMIT ${limitParam} OFFSET ${offsetParam}`, params);
  const countParams = [userId];
  const countFilters = ["user_id = $1", archiveFilter];
  if (unreadOnly) countFilters.push("read_at IS NULL");
  if (ticketId) {
    countParams.push(ticketId);
    countFilters.push(`ticket_id = $${countParams.length}`);
  }
  const countResult = await pool.query(`SELECT COUNT(*)::int AS total
     FROM v_b_user_notifications
     WHERE ${countFilters.join(" AND ")}`, countParams);
  return {
    items: result.rows.map(mapNotificationRow),
    total: countResult.rows[0]?.total ?? result.rows.length
  };
}
export async function getUnreadNotificationCount(userId) {
  const result = await pool.query(`SELECT COUNT(*)::int AS count
     FROM v_b_user_notifications
     WHERE user_id = $1 AND read_at IS NULL AND archived_at IS NULL`, [userId]);
  return result.rows[0]?.count ?? 0;
}
export async function markNotificationRead(userId, notificationId) {
  const result = await pool.query(`UPDATE v_b_user_notifications
     SET read_at = COALESCE(read_at, NOW())
     WHERE id = $1 AND user_id = $2 AND archived_at IS NULL
     RETURNING id, type, title, body, ticket_id, comment_id, payload, read_at, archived_at, created_at`, [notificationId, userId]);
  if (!result.rows.length) return null;
  return mapNotificationRow(result.rows[0]);
}
export async function archiveNotification(userId, notificationId) {
  const result = await pool.query(`UPDATE v_b_user_notifications
     SET archived_at = COALESCE(archived_at, NOW()),
         read_at = COALESCE(read_at, NOW())
     WHERE id = $1 AND user_id = $2 AND archived_at IS NULL
     RETURNING id, type, title, body, ticket_id, comment_id, payload, read_at, archived_at, created_at`, [notificationId, userId]);
  if (!result.rows.length) return null;
  return mapNotificationRow(result.rows[0]);
}
export async function markAllNotificationsRead(userId, {
  ticketId = null
} = {}) {
  const params = [userId];
  let sql = `UPDATE v_b_user_notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL AND archived_at IS NULL`;
  if (ticketId) {
    params.push(ticketId);
    sql += ` AND ticket_id = $${params.length}`;
  }
  const result = await pool.query(`${sql} RETURNING id`, params);
  return result.rowCount || 0;
}
export async function archiveAllNotifications(userId, {
  ticketId = null
} = {}) {
  const params = [userId];
  let sql = `UPDATE v_b_user_notifications
     SET archived_at = NOW(), read_at = COALESCE(read_at, NOW())
     WHERE user_id = $1 AND archived_at IS NULL`;
  if (ticketId) {
    params.push(ticketId);
    sql += ` AND ticket_id = $${params.length}`;
  }
  const result = await pool.query(`${sql} RETURNING id`, params);
  return result.rowCount || 0;
}
export async function createTestUserNotification(userId, type = "ticket_commented", locale = "fr") {
  const sample = getTestNotificationSample(type, locale);
  const safeType = sample.type;
  const result = await pool.query(`INSERT INTO v_b_user_notifications
      (user_id, type, title, body, payload, created_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
     RETURNING id, type, title, body, ticket_id, comment_id, payload, read_at, created_at`, [userId, sample.type, sample.title, sample.body, JSON.stringify({
    isTest: true,
    testType: safeType
  })]);
  return mapNotificationRow(result.rows[0]);
}
