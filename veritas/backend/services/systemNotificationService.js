import { pool } from "../database/db.js";
import { sendMail } from "../utils/sendMail.js";
import { getPrimaryFrontendBaseUrl } from "../utils/envFile.js";
import { loadNotificationSettingsRaw, saveNotificationLogsRaw } from "./ticketAutomationConfigStore.js";
import { TICKET_REQUESTER_EMAIL_SQL } from "./ticketEmailThread.js";
import { getTicketRecipientIds, loadInAppSettings } from "./userNotificationService.js";
import { listTicketSubscriberUserIds } from "./entitySubscriptionService.js";
import { getSystemNotificationDef, normalizeSystemNotifications, renderSystemTemplate } from "./systemNotificationCatalog.js";

const MAX_LOGS = 500;

function uniqueEmails(values = []) {
  const seen = new Set();
  return values.map(item => String(item || "").trim().toLowerCase()).filter(email => {
    if (!email || !email.includes("@") || seen.has(email)) return false;
    seen.add(email);
    return true;
  });
}

async function loadSystemConfig(key) {
  const def = getSystemNotificationDef(key);
  if (!def) return null;
  const settings = await loadNotificationSettingsRaw().catch(() => ({}));
  const all = normalizeSystemNotifications(settings?.systemNotifications);
  return {
    def,
    config: all[key],
    settings
  };
}

async function appendLogs(entries = []) {
  if (!entries.length) return;
  const settings = await loadNotificationSettingsRaw().catch(() => ({}));
  const current = Array.isArray(settings?.logs) ? settings.logs : [];
  await saveNotificationLogsRaw([...entries, ...current].slice(0, MAX_LOGS));
}

async function emailsForUserIds(userIds = []) {
  const ids = [...new Set(userIds.map(id => String(id || "").trim()).filter(Boolean))];
  if (!ids.length) return [];
  const result = await pool.query(`SELECT id, email, username, role
     FROM v_b_users
     WHERE id = ANY($1::uuid[])`, [ids]);
  return result.rows || [];
}

export async function resolveTicketNotificationContext(ticketId) {
  if (!ticketId) return null;
  const queries = [`SELECT
        t.id,
        t.ticket_number,
        t.title,
        t.status,
        t.priority,
        t.client_id,
        t.assigned_user_id,
        t.requester_user_id,
        t.requester_contact_id,
        c.name AS client_name,
        req_u.email AS requester_user_email,
        req_u.username AS requester_user_name,
        ct.email AS contact_email,
        ct.prenom AS contact_prenom,
        ct.nom AS contact_nom,
        ${TICKET_REQUESTER_EMAIL_SQL} AS requester_email
       FROM v_b_tickets t
       LEFT JOIN v_b_clients c ON c.id = t.client_id
       LEFT JOIN v_b_users req_u ON req_u.id = t.requester_user_id
       LEFT JOIN v_b_contacts ct ON ct.id = t.requester_contact_id
       WHERE t.id = $1
       LIMIT 1`, `SELECT
        t.id,
        t.ticket_number,
        t.title,
        t.status,
        t.priority,
        t.client_id,
        t.assigned_user_id,
        t.requester_user_id,
        c.name AS client_name,
        req_u.email AS requester_user_email,
        req_u.username AS requester_user_name,
        req_u.email AS requester_email
       FROM v_b_tickets t
       LEFT JOIN v_b_clients c ON c.id = t.client_id
       LEFT JOIN v_b_users req_u ON req_u.id = t.requester_user_id
       WHERE t.id = $1
       LIMIT 1`];
  for (const sql of queries) {
    try {
      const result = await pool.query(sql, [ticketId]);
      return result.rows[0] || null;
    } catch (_err) {
      continue;
    }
  }
  return null;
}

export async function getTicketAssigneeUserIds(ticketId) {
  const ids = new Set();
  try {
    const ticket = await pool.query(`SELECT assigned_user_id FROM v_b_tickets WHERE id = $1`, [ticketId]);
    if (ticket.rows[0]?.assigned_user_id) ids.add(String(ticket.rows[0].assigned_user_id));
    const assignees = await pool.query(`SELECT user_id FROM v_b_ticket_assignees WHERE ticket_id = $1`, [ticketId]);
    assignees.rows.forEach(row => {
      if (row?.user_id) ids.add(String(row.user_id));
    });
  } catch (_err) {
    return [...ids];
  }
  return [...ids];
}

function buildTicketContext(ticket = {}, extra = {}) {
  const requesterName = [ticket.contact_prenom, ticket.contact_nom].filter(Boolean).join(" ").trim() || ticket.requester_user_name || "";
  return {
    ticket: {
      id: ticket.id,
      ticket_number: ticket.ticket_number ?? "",
      title: ticket.title || "",
      status: ticket.status || "",
      priority: ticket.priority || ""
    },
    entreprise: {
      id: ticket.client_id || "",
      nom: ticket.client_name || extra.enterpriseName || ""
    },
    requester: {
      email: ticket.requester_email || ticket.requester_user_email || ticket.contact_email || "",
      prenom: ticket.contact_prenom || "",
      nom: ticket.contact_nom || "",
      username: ticket.requester_user_name || requesterName
    },
    ...extra
  };
}

export async function sendSystemNotification(key, {
  emails = [],
  userIds = [],
  context = {},
  excludeUserId = null,
  requireSend = false
} = {}) {
  const loaded = await loadSystemConfig(key);
  if (!loaded) return {
    skipped: true,
    reason: "unknown"
  };
  const {
    def,
    config
  } = loaded;
  if (!config.enabled) return {
    skipped: true,
    reason: "disabled"
  };
  const exclude = String(excludeUserId || "").trim();
  const targetUserIds = [...new Set((userIds || []).map(id => String(id || "").trim()).filter(id => id && id !== exclude))];
  const users = await emailsForUserIds(targetUserIds);
  const usersById = new Map(users.map(user => [String(user.id), user]));
  const logs = [];
  let sent = 0;
  if (config.emailEnabled && def.channels.includes("email")) {
    const directEmails = uniqueEmails(emails);
    const recipients = [];
    directEmails.forEach(email => recipients.push({
      email,
      user: null
    }));
    users.forEach(user => {
      const email = String(user.email || "").trim().toLowerCase();
      if (!email || recipients.some(item => item.email === email)) return;
      recipients.push({
        email,
        user
      });
    });
    for (const recipient of recipients) {
      const merged = {
        ...context,
        user: {
          id: recipient.user?.id || context.user?.id || "",
          email: recipient.email,
          username: recipient.user?.username || context.user?.username || recipient.email
        }
      };
      const subject = renderSystemTemplate(config.subject, merged) || def.defaultSubject;
      const title = renderSystemTemplate(config.title, merged) || def.defaultTitle;
      const htmlContent = renderSystemTemplate(config.body, merged);
      try {
        await sendMail({
          to: recipient.email,
          subject,
          title,
          htmlContent
        });
        sent += 1;
        logs.push({
          id: `notif-log-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
          createdAt: new Date().toISOString(),
          source: "system",
          element: key,
          channel: "mail",
          status: "success",
          message: `Email sent to ${recipient.email}`,
          enterpriseId: String(context?.entreprise?.id || context?.enterpriseId || "")
        });
      } catch (error) {
        logs.push({
          id: `notif-log-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
          createdAt: new Date().toISOString(),
          source: "system",
          element: key,
          channel: "mail",
          status: "error",
          message: error?.message || "Failed to send email",
          enterpriseId: String(context?.entreprise?.id || context?.enterpriseId || "")
        });
      }
    }
  }
  if (config.inAppEnabled && def.channels.includes("inapp") && !def.inAppKey && targetUserIds.length > 0) {
    const titleTpl = config.inAppTitle || config.title;
    const bodyTpl = config.inAppBody || "";
    for (const userId of targetUserIds) {
      const user = usersById.get(userId) || {};
      const merged = {
        ...context,
        user: {
          id: userId,
          email: user.email || "",
          username: user.username || user.email || ""
        }
      };
      try {
        await pool.query(`INSERT INTO v_b_user_notifications
            (user_id, type, title, body, ticket_id, comment_id, payload, created_at)
           VALUES ($1, $2, $3, $4, $5, NULL, $6::jsonb, NOW())`, [userId, key, renderSystemTemplate(titleTpl, merged) || def.defaultTitle, renderSystemTemplate(bodyTpl, merged) || null, context?.ticket?.id || null, JSON.stringify({
          systemKey: key,
          ...(context?.payload || {})
        })]);
        sent += 1;
        logs.push({
          id: `notif-log-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
          createdAt: new Date().toISOString(),
          source: "system",
          element: key,
          channel: "inapp",
          status: "success",
          message: `In-app sent to ${user.username || userId}`,
          enterpriseId: String(context?.entreprise?.id || context?.enterpriseId || "")
        });
      } catch (error) {
        logs.push({
          id: `notif-log-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
          createdAt: new Date().toISOString(),
          source: "system",
          element: key,
          channel: "inapp",
          status: "error",
          message: error?.message || "Failed to create in-app notification",
          enterpriseId: String(context?.entreprise?.id || "")
        });
      }
    }
  }
  await appendLogs(logs).catch(() => {});
  if (requireSend && config.emailEnabled && sent === 0) {
    const firstError = logs.find(item => item.status === "error")?.message || "Failed to send notification email";
    throw new Error(firstError);
  }
  return {
    sent,
    skipped: sent === 0
  };
}

async function notifyTicketRecipients(key, {
  ticketId,
  userIds = null,
  excludeUserId = null,
  extraContext = {},
  watchersDefault = false,
  includeEmailSubscribers = true
} = {}) {
  const def = getSystemNotificationDef(key);
  const ticket = await resolveTicketNotificationContext(ticketId);
  if (!ticket) return;
  let ids = Array.isArray(userIds) ? userIds : null;
  if (!ids) {
    const inApp = await loadInAppSettings().catch(() => ({
      events: {}
    }));
    const eventSettings = inApp.events?.[def?.inAppKey] || {};
    ids = await getTicketRecipientIds(ticketId, {
      notifyAssignees: eventSettings.notifyAssignees !== false,
      notifyWatchers: eventSettings.notifyWatchers === true || watchersDefault && eventSettings.notifyWatchers !== false,
      // Assignees/watchers only here; email-channel subscribers merged below.
      notifySubscribers: false
    });
    if (includeEmailSubscribers) {
      const emailSubscribers = await listTicketSubscriberUserIds(ticketId, { channel: "email" }).catch(() => []);
      ids = [...new Set([...(ids || []).map(String), ...emailSubscribers.map(String)])];
    }
  }
  return sendSystemNotification(key, {
    userIds: ids,
    excludeUserId,
    context: {
      ...buildTicketContext(ticket, extraContext),
      ...extraContext
    }
  });
}

export async function notifyTicketCreatedAck(ticketId, extraContext = {}) {
  const ticket = await resolveTicketNotificationContext(ticketId);
  if (!ticket) return;
  const context = buildTicketContext(ticket, extraContext);
  const email = context.requester.email;
  if (!email) return;
  return sendSystemNotification("tickets.created_ack", {
    emails: [email],
    context
  });
}

export async function notifyTicketAssignedUsers({
  ticketId,
  userIds = [],
  assignedByUserId = null,
  extraContext = {}
}) {
  const ticket = await resolveTicketNotificationContext(ticketId);
  if (!ticket) return;
  const ids = userIds.length ? userIds : await getTicketAssigneeUserIds(ticketId);
  return sendSystemNotification("tickets.assigned", {
    userIds: ids,
    excludeUserId: assignedByUserId,
    context: {
      ...buildTicketContext(ticket, extraContext),
      agent: extraContext.agent || extraContext.user || {}
    }
  });
}

export async function notifyTicketUpdatedAssignees({
  ticketId,
  changedByUserId = null,
  extraContext = {}
}) {
  return notifyTicketRecipients("tickets.updated", {
    ticketId,
    excludeUserId: changedByUserId,
    extraContext
  });
}

export async function notifyTicketChangeEmails({
  ticketId,
  newStatus,
  changedByUserId = null,
  extraContext = {}
}) {
  if (String(newStatus || "").toLowerCase() === "resolved") {
    return notifyTicketResolved(ticketId, {
      ...extraContext,
      user: extraContext.user || extraContext.agent || {
        id: changedByUserId
      }
    });
  }
  return notifyTicketUpdatedAssignees({
    ticketId,
    changedByUserId,
    extraContext
  });
}

export async function notifyTicketCreatedAgents(ticketId, extraContext = {}) {
  return notifyTicketRecipients("tickets.created", {
    ticketId,
    excludeUserId: extraContext?.user?.id || extraContext?.agent?.id || null,
    extraContext
  });
}

export async function notifyTicketCommented({
  ticketId,
  authorUserId,
  isInternal = false,
  extraContext = {}
}) {
  const inApp = await loadInAppSettings().catch(() => ({
    events: {}
  }));
  if (isInternal && inApp.events?.ticket_commented?.excludeInternalComments) return;
  return notifyTicketRecipients("tickets.commented", {
    ticketId,
    excludeUserId: authorUserId,
    extraContext: {
      ...extraContext,
      comment: {
        author: extraContext?.comment?.author || extraContext?.user?.username || extraContext?.user?.email || extraContext?.agent?.username || "",
        preview: extraContext?.comment?.preview || extraContext?.contentPreview || "",
        isInternal: Boolean(isInternal)
      }
    },
    watchersDefault: true
  });
}

export async function notifyTicketResolved(ticketId, extraContext = {}) {
  return notifyTicketRecipients("tickets.resolved", {
    ticketId,
    excludeUserId: extraContext?.user?.id || extraContext?.agent?.id || null,
    extraContext
  });
}

export async function notifyTicketSatisfaction(ticketId, extraContext = {}) {
  return notifyTicketRecipients("tickets.satisfaction", {
    ticketId,
    extraContext
  });
}

export async function notifyTicketValidationRequested({
  ticketId,
  validatorUserId,
  extraContext = {}
}) {
  return notifyTicketRecipients("tickets.validation_requested", {
    ticketId,
    userIds: validatorUserId ? [validatorUserId] : [],
    extraContext
  });
}

export async function notifyTicketValidationResponded({
  ticketId,
  requestedByUserId,
  extraContext = {}
}) {
  return notifyTicketRecipients("tickets.validation_responded", {
    ticketId,
    userIds: requestedByUserId ? [requestedByUserId] : [],
    extraContext
  });
}

export async function notifyPlanningEventAssigned({
  eventRow,
  assignedUserId,
  actorUser = {},
  enterpriseName = ""
}) {
  const userId = String(assignedUserId || eventRow?.assigned_user_id || "").trim();
  if (!userId) return;
  const start = eventRow?.start ? new Date(eventRow.start).toLocaleString("fr-FR") : "";
  const end = eventRow?.end ? new Date(eventRow.end).toLocaleString("fr-FR") : "";
  return sendSystemNotification("planning.event_created", {
    userIds: [userId],
    excludeUserId: actorUser?.id,
    context: {
      event: {
        id: eventRow?.id,
        title: eventRow?.title || "",
        type: eventRow?.type || "",
        start,
        end,
        description: eventRow?.description || ""
      },
      entreprise: {
        id: eventRow?.client_id || "",
        nom: enterpriseName || ""
      },
      agent: {
        id: actorUser?.id || "",
        username: actorUser?.username || actorUser?.email || "",
        email: actorUser?.email || ""
      }
    }
  });
}

async function loadClientPortalUsers(clientId) {
  const id = Number(clientId);
  if (!Number.isInteger(id) || id <= 0) return [];
  const {
    rows
  } = await pool.query(`SELECT id, email, username
     FROM v_b_users
     WHERE role = 'client'
       AND client_id = $1
       AND COALESCE(is_active, true) = true
       AND COALESCE(password_pending, false) = false
       AND email IS NOT NULL
       AND TRIM(email) <> ''`, [id]);
  return rows || [];
}

async function loadClientName(clientId) {
  const id = Number(clientId);
  if (!Number.isInteger(id) || id <= 0) return "";
  const {
    rows
  } = await pool.query(`SELECT name FROM v_b_clients WHERE id = $1 LIMIT 1`, [id]);
  return rows[0]?.name || "";
}

function portalDocumentsLink() {
  return `${String(getPrimaryFrontendBaseUrl() || "").replace(/\/+$/, "")}/client/documents`;
}

export async function notifyVaultDocumentShared({
  clientId,
  file = {}
} = {}) {
  const id = Number(clientId || file?.client_id);
  if (!Number.isInteger(id) || id <= 0) return {
    skipped: true,
    reason: "no_client"
  };
  const users = await loadClientPortalUsers(id);
  if (!users.length) return {
    skipped: true,
    reason: "no_recipients"
  };
  const portalLink = portalDocumentsLink();
  const entrepriseName = file?.client_name || (await loadClientName(id));
  return sendSystemNotification("documents.vault_shared", {
    emails: users.map(user => user.email),
    userIds: users.map(user => user.id),
    context: {
      document: {
        file_name: file?.file_name || file?.fileName || "",
        category: file?.category || "",
        description: file?.description || ""
      },
      entreprise: {
        id,
        nom: entrepriseName || ""
      },
      portalLink,
      enterpriseId: id
    }
  });
}

export async function notifyVaultAccessShared({
  clientId,
  contactId,
  secret = {}
} = {}) {
  const contactKey = Number(contactId || secret?.contact_id);
  if (!Number.isInteger(contactKey) || contactKey <= 0) return {
    skipped: true,
    reason: "no_contact"
  };
  const {
    rows
  } = await pool.query(`SELECT c.id, c.prenom, c.nom, c.email AS contact_email, c.client_id,
            u.id AS portal_user_id, u.email AS portal_email,
            cl.name AS client_name
     FROM v_b_contacts c
     LEFT JOIN v_b_users u ON u.contact_id = c.id AND u.role = 'client'
     LEFT JOIN v_b_clients cl ON cl.id = COALESCE($2::int, c.client_id)
     WHERE c.id = $1
     LIMIT 1`, [contactKey, Number(clientId) || null]);
  const row = rows[0];
  if (!row) return {
    skipped: true,
    reason: "contact_not_found"
  };
  const email = String(row.portal_email || row.contact_email || "").trim();
  if (!email) return {
    skipped: true,
    reason: "no_email"
  };
  const portalLink = portalDocumentsLink();
  const expiresAt = secret?.expires_at || secret?.expiresAt;
  const expiresLabel = expiresAt ? new Date(expiresAt).toLocaleString("fr-FR") : "";
  return sendSystemNotification("vault.access_shared", {
    emails: [email],
    userIds: row.portal_user_id ? [row.portal_user_id] : [],
    context: {
      secret: {
        title: secret?.title || "",
        description: secret?.description || "",
        expires_at: expiresLabel,
        max_views: secret?.max_views ?? secret?.maxViews ?? ""
      },
      contact: {
        prenom: row.prenom || "",
        nom: row.nom || "",
        email
      },
      entreprise: {
        id: Number(clientId) || row.client_id || "",
        nom: row.client_name || ""
      },
      portalLink,
      enterpriseId: Number(clientId) || row.client_id || ""
    }
  });
}
