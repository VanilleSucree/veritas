import express from 'express';
import { pool } from '../../database/db.js';
import verifyJWT from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/permissions.js';
import { dispatchNotificationEvent } from "../../services/notificationDispatcher.js";
import { PORTAL_USER_JOIN, PORTAL_USER_SELECT, createPortalUserForContact, createPortalUserInviteForContact, resendPortalInviteForContact, syncPortalUserFromContact, setPortalActive, setPortalTicketRole, deletePortalUserForContact, resetPortalPassword, getPortalUserByContactId } from '../../utils/contactPortal.js';
import { registerContactMetaRoutes, fetchTagsByContactIdMap, attachContactTags, fetchTagsForContactId } from './contactMeta.js';
import { normalizeContactSexe } from '../../utils/contactSexe.js';
import { normalizeContactCommunications, syncLegacyContactFields, validateContactCommunications } from '../../utils/contactCommunications.js';
import { isCommunity, COMMUNITY_LIMITS } from '../../utils/edition.js';
import { assertCommunityClientPortalLimit, assertCommunityContactsLimit, getActiveClientPortalCount, sendCommunityLimitError } from '../../utils/communityLimits.js';
import { buildImpersonationClientPayload, IMPERSONATOR_COOKIE, setImpersonatorCookie, setSessionCookie, signSessionToken } from '../../utils/authSession.js';
import { validatePortalPassword, PORTAL_PASSWORD_MIN_LENGTH } from '../../utils/passwordPolicy.js';
import { userHasAllPermissions } from '../../services/permissionService.js';
import {
  addMembership,
  attachMembershipsToContacts,
  listMembershipsForContact,
  normalizeMembershipsInput,
  removeMembership,
  replaceMemberships,
  setPrimaryForClient,
  sqlContactLinkedToClientAsync,
  syncHomeClientId
} from '../../services/contactClientLinks.js';
import { attachOrphanTicketsToContact } from '../../services/ticketEmailThread.js';
import { normalizePortalTicketRole } from '../../utils/portalTicketRole.js';
const PORTAL_PASSWORD_ERROR = `Password too weak: at least ${PORTAL_PASSWORD_MIN_LENGTH} characters, with at least one letter and one digit.`;
const router = express.Router();
router.use(verifyJWT);
const uuidRegexUser = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const buildContactChanges = (oldData, newData) => {
  const fields = [{
    key: 'nom',
    label: 'nom'
  }, {
    key: 'prenom',
    label: 'first name'
  }, {
    key: 'sexe',
    label: 'courtesy title'
  }, {
    key: 'email',
    label: 'email'
  }, {
    key: 'telephone',
    label: 'phone'
  }, {
    key: 'communications',
    label: 'moyens de communication'
  }, {
    key: 'poste',
    label: 'poste'
  }, {
    key: 'statut',
    label: 'statut'
  }, {
    key: 'client_id',
    label: 'entreprise'
  }];
  const modifiedFields = [];
  const changes = [];
  fields.forEach(({
    key,
    label
  }) => {
    const oldValue = oldData?.[key] ?? null;
    const newValue = newData?.[key] ?? null;
    const oldSerialized = key === 'communications' ? JSON.stringify(oldValue ?? []) : String(oldValue ?? '');
    const newSerialized = key === 'communications' ? JSON.stringify(newValue ?? []) : String(newValue ?? '');
    if (oldSerialized !== newSerialized) {
      modifiedFields.push(key);
      changes.push({
        field: label,
        oldValue: oldValue,
        newValue: newValue
      });
    }
  });
  return {
    modifiedFields,
    changes
  };
};
const invalidateContactsListCache = () => {};
const CONTACT_LIST_SELECT = `
  cts.id,
  cts.client_id,
  cli.name AS client_name,
  cts.nom,
  cts.prenom,
  cts.sexe,
  cts.email,
  cts.telephone,
  COALESCE(cts.communications, '[]'::jsonb) AS communications,
  cts.poste,
  cts.statut,
  cts.created_at,
  cts.updated_at,
  ${PORTAL_USER_SELECT}
`;
const CONTACT_LIST_FROM = `
  FROM v_b_contacts cts
  LEFT JOIN v_b_clients cli ON cli.id = cts.client_id
  ${PORTAL_USER_JOIN}
`;
function requireAgent(req, res, next) {
  if (String(req.user?.role || "").toLowerCase() === "client") {
    return res.status(403).json({
      error: "Access restricted to MSP agents."
    });
  }
  next();
}
async function loadContactById(contactId) {
  const {
    rows
  } = await pool.query(`SELECT cts.id, cts.client_id, cli.name AS client_name,
            cts.nom, cts.prenom, cts.sexe, cts.email, cts.telephone, cts.poste, cts.statut,
            COALESCE(cts.communications, '[]'::jsonb) AS communications,
            cts.created_at, cts.updated_at,
            ${PORTAL_USER_SELECT}
     FROM v_b_contacts cts
     LEFT JOIN v_b_clients cli ON cli.id = cts.client_id
     ${PORTAL_USER_JOIN}
     WHERE cts.id = $1`, [contactId]);
  const hydrated = hydrateContactRow(rows[0] || null);
  if (!hydrated) return null;
  const [enriched] = await attachMembershipsToContacts([hydrated]);
  return enriched;
}
function hydrateContactRow(row) {
  if (!row) return null;
  const communications = normalizeContactCommunications(row);
  const synced = syncLegacyContactFields(communications);
  return {
    ...row,
    communications: synced.communications,
    email: synced.email,
    telephone: synced.telephone
  };
}
async function enrichContactRows(rows) {
  const hydrated = (Array.isArray(rows) ? rows : []).map(hydrateContactRow).filter(Boolean);
  return attachMembershipsToContacts(hydrated);
}
function payloadHasMemberships(payload = {}) {
  return Array.isArray(payload.memberships) || Array.isArray(payload.client_ids);
}
function resolveContactCommunications(payload, current = null) {
  const commList = payload.communications;
  if (Array.isArray(commList) && commList.length > 0) {
    return syncLegacyContactFields(commList);
  }
  return syncLegacyContactFields({
    communications: Array.isArray(commList) ? commList : current?.communications || [],
    email: Object.prototype.hasOwnProperty.call(payload, 'email') ? payload.email : current?.email,
    telephone: Object.prototype.hasOwnProperty.call(payload, 'telephone') ? payload.telephone : current?.telephone
  });
}
function parseContactId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}
router.get('/list', requirePermission('contacts.view'), async (req, res) => {
  const {
    client_id
  } = req.query;
  const numericClientId = client_id ? Number(client_id) : null;
  const params = [];
  let whereClause = '';
  if (numericClientId) {
    params.push(numericClientId);
    whereClause = `WHERE ${await sqlContactLinkedToClientAsync('cts', 1)}`;
  }
  try {
    const result = await pool.query(`SELECT ${CONTACT_LIST_SELECT}
       ${CONTACT_LIST_FROM}
       ${whereClause}
       ORDER BY cts.nom NULLS LAST, cts.prenom NULLS LAST, cts.id`, params);
    const tagsByContactId = await fetchTagsByContactIdMap();
    const enrichedRows = attachContactTags(await enrichContactRows(result.rows), tagsByContactId);
    res.set('Cache-Control', 'no-store');
    return res.json(enrichedRows);
  } catch (err) {
    return res.status(500).json({
      error: 'Error retrieving contacts',
      details: err.message
    });
  }
});
router.get('/', requirePermission('contacts.view'), async (req, res) => {
  const {
    client_id
  } = req.query;
  const params = [];
  let whereClause = '';
  if (client_id) {
    params.push(client_id);
    whereClause = `WHERE ${await sqlContactLinkedToClientAsync('cts', 1)}`;
  }
  try {
    const result = await pool.query(`SELECT ${CONTACT_LIST_SELECT}
       ${CONTACT_LIST_FROM}
       ${whereClause}
       ORDER BY cts.nom NULLS LAST, cts.prenom NULLS LAST, cts.id`, params);
    const tagsByContactId = await fetchTagsByContactIdMap();
    res.json(attachContactTags(await enrichContactRows(result.rows), tagsByContactId));
  } catch (err) {
    res.status(500).json({
      error: 'Error retrieving contacts',
      details: err.message
    });
  }
});
registerContactMetaRoutes(router, {
  invalidateContactsListCache
});
router.get('/portal/usage', verifyJWT, requireAgent, async (_req, res) => {
  try {
    if (!isCommunity()) {
      return res.json({
        limited: false,
        active: 0,
        max: null
      });
    }
    const active = await getActiveClientPortalCount();
    res.json({
      limited: true,
      active,
      max: COMMUNITY_LIMITS.clientPortalUsers
    });
  } catch (err) {
    res.status(500).json({
      error: err.message || "Server error"
    });
  }
});
router.get('/:id/portal', verifyJWT, requireAgent, async (req, res) => {
  const contactId = parseContactId(req.params.id);
  if (!contactId) return res.status(400).json({
    error: "Invalid ID contact"
  });
  try {
    const contact = await loadContactById(contactId);
    if (!contact) return res.status(404).json({
      error: "Contact not found"
    });
    const portal = contact.portal_user_id ? {
      user_id: contact.portal_user_id,
      email: contact.portal_email,
      is_active: contact.portal_active,
      last_login_at: contact.portal_last_login,
      password_pending: Boolean(contact.portal_pending),
      portal_role: normalizePortalTicketRole(contact.portal_role)
    } : null;
    res.json({
      contact_id: contactId,
      portal
    });
  } catch (err) {
    res.status(500).json({
      error: err.message || "Server error"
    });
  }
});
router.post('/:id/portal', verifyJWT, requireAgent, requirePermission('contacts_detail.portal'), async (req, res) => {
  const contactId = parseContactId(req.params.id);
  if (!contactId) return res.status(400).json({
    error: "Invalid ID contact"
  });
  try {
    await assertCommunityClientPortalLimit(1);
    const contact = await loadContactById(contactId);
    if (!contact) return res.status(404).json({
      error: "Contact not found"
    });
    const sendEmail = Boolean(req.body?.sendInvite);
    const portal = await createPortalUserInviteForContact(contact, {
      portalRole: normalizePortalTicketRole(req.body?.portal_role),
      sendEmail
    });
    invalidateContactsListCache(contact.client_id);
    invalidateContactsListCache(null);
    res.status(201).json({
      contact_id: contactId,
      portal,
      inviteSent: sendEmail
    });
  } catch (err) {
    if (err?.code?.startsWith("COMMUNITY_")) {
      return sendCommunityLimitError(res, err);
    }
    res.status(400).json({
      error: err.message || "Unable to create portal account."
    });
  }
});
router.post('/:id/portal/invite', verifyJWT, requireAgent, requirePermission('contacts_detail.portal'), async (req, res) => {
  const contactId = parseContactId(req.params.id);
  if (!contactId) return res.status(400).json({
    error: "Invalid ID contact"
  });
  try {
    const contact = await loadContactById(contactId);
    if (!contact) return res.status(404).json({
      error: "Contact not found"
    });
    const portal = await resendPortalInviteForContact(contactId);
    res.json({
      contact_id: contactId,
      portal,
      inviteSent: true
    });
  } catch (err) {
    res.status(400).json({
      error: err.message || "Unable to send invitation."
    });
  }
});
router.patch('/:id/portal', verifyJWT, requireAgent, requirePermission('contacts_detail.portal'), async (req, res) => {
  const contactId = parseContactId(req.params.id);
  if (!contactId) return res.status(400).json({
    error: "Invalid ID contact"
  });
  const hasActive = req.body?.is_active !== undefined;
  const hasRole = req.body?.portal_role !== undefined;
  if (!hasActive && !hasRole) {
    return res.status(400).json({
      error: "Champ is_active or portal_role required."
    });
  }
  try {
    if (hasActive && req.body?.is_active === true) {
      const contactBefore = await loadContactById(contactId);
      if (!contactBefore) return res.status(404).json({
        error: "Contact not found"
      });
      if (!contactBefore.portal_active) {
        await assertCommunityClientPortalLimit(1);
      }
    }
    let portal = null;
    if (hasActive) {
      portal = await setPortalActive(contactId, req.body.is_active);
    }
    if (hasRole) {
      portal = await setPortalTicketRole(contactId, req.body.portal_role);
    }
    const contact = await loadContactById(contactId);
    invalidateContactsListCache(contact?.client_id);
    invalidateContactsListCache(null);
    res.json({
      contact_id: contactId,
      portal
    });
  } catch (err) {
    if (err?.code?.startsWith("COMMUNITY_")) {
      return sendCommunityLimitError(res, err);
    }
    res.status(400).json({
      error: err.message || "Update not possible."
    });
  }
});
router.patch('/:id/portal/password', verifyJWT, requireAgent, requirePermission('contacts_detail.portal'), async (req, res) => {
  const contactId = parseContactId(req.params.id);
  if (!contactId) return res.status(400).json({
    error: "Invalid ID contact"
  });
  const newPassword = String(req.body?.newPassword || req.body?.password || "");
  if (!validatePortalPassword(newPassword).valid) {
    return res.status(400).json({
      error: PORTAL_PASSWORD_ERROR
    });
  }
  try {
    await resetPortalPassword(contactId, newPassword);
    res.json({
      success: true
    });
  } catch (err) {
    res.status(400).json({
      error: err.message || "Reset not possible."
    });
  }
});
router.delete('/:id/portal', verifyJWT, requireAgent, requirePermission('contacts_detail.portal'), async (req, res) => {
  const contactId = parseContactId(req.params.id);
  if (!contactId) return res.status(400).json({
    error: "Invalid ID contact"
  });
  try {
    const contact = await loadContactById(contactId);
    const removed = await deletePortalUserForContact(contactId);
    if (!removed) return res.status(404).json({
      error: "No portal account for this contact."
    });
    invalidateContactsListCache(contact?.client_id);
    invalidateContactsListCache(null);
    res.json({
      success: true
    });
  } catch (err) {
    res.status(500).json({
      error: err.message || "Deletion not possible."
    });
  }
});
router.post('/:id/portal/impersonate', verifyJWT, requireAgent, async (req, res) => {
  const contactId = parseContactId(req.params.id);
  if (!contactId) return res.status(400).json({
    error: "Invalid ID contact"
  });
  if (req.cookies?.[IMPERSONATOR_COOKIE]) {
    return res.status(400).json({
      error: "An impersonation is already active. Exit it before starting a new one."
    });
  }
  try {
    const contact = await loadContactById(contactId);
    if (!contact) return res.status(404).json({
      error: "Contact not found"
    });
    if (!contact.portal_user_id) {
      return res.status(404).json({
        error: "No portal account for this contact."
      });
    }
    if (!contact.portal_active) {
      return res.status(403).json({
        error: "Portal account is disabled."
      });
    }
    const portalUser = await getPortalUserByContactId(contactId);
    if (!portalUser || portalUser.id !== contact.portal_user_id) {
      return res.status(404).json({
        error: "Portal account not found."
      });
    }
    if (portalUser.is_active === false) {
      return res.status(403).json({
        error: "Portal account is disabled."
      });
    }
    if (!portalUser.client_id) {
      return res.status(400).json({
        error: "This contact is not linked to any company."
      });
    }
    const agentToken = req.cookies?.token;
    if (!agentToken) {
      return res.status(401).json({
        error: "Agent session not found."
      });
    }
    const clientToken = signSessionToken(buildImpersonationClientPayload(portalUser, {
      id: req.user.id,
      email: req.user.email
    }));
    setImpersonatorCookie(req, res, agentToken);
    setSessionCookie(req, res, clientToken);
    console.info(`[impersonation][audit] ts=${new Date().toISOString()} ip=${req.ip} agent=${req.user.id} agent_email=${req.user.email} contact=${contactId} portal_user=${portalUser.id} client=${portalUser.client_id}`);
    res.json({
      id: portalUser.id,
      email: portalUser.email,
      username: portalUser.username || null,
      role: "client",
      client_id: portalUser.client_id,
      contact_id: contactId,
      contact_name: [contact.prenom, contact.nom].filter(Boolean).join(" ").trim() || null,
      impersonating: true
    });
  } catch (err) {
    console.error("POST /contacts/:id/portal/impersonate:", err);
    res.status(500).json({
      error: err.message || "Unable to start impersonation."
    });
  }
});
router.get('/:id/logs', verifyJWT, async (req, res) => {
  try {
    const {
      id
    } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const result = await pool.query(`SELECT
        l.id,
        l.contact_id,
        l.client_id,
        l.user_id,
        COALESCE(u.username, u.email) AS user_name,
        l.action,
        l.details,
        l.created_at
       FROM v_b_contacts_logs l
       LEFT JOIN v_b_users u ON l.user_id::text = u.id::text
       WHERE l.contact_id = $1
       ORDER BY l.created_at DESC
       LIMIT $2 OFFSET $3`, [parseInt(id), limit, offset]);
    const countResult = await pool.query(`SELECT COUNT(*) as total
       FROM v_b_contacts_logs
       WHERE contact_id = $1`, [parseInt(id)]);
    const total = parseInt(countResult.rows[0].total) || 0;
    res.json({
      logs: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    res.status(500).json({
      error: "Error retrieving logs",
      details: err.message
    });
  }
});
router.get('/:id', async (req, res) => {
  const contactId = parseContactId(req.params.id);
  if (!contactId) return res.status(400).json({
    error: "Invalid ID contact"
  });
  try {
    const contact = await loadContactById(contactId);
    if (!contact) {
      return res.status(404).json({
        error: "Contact not found"
      });
    }
    const tags = await fetchTagsForContactId(contactId);
    res.json({
      ...contact,
      tags
    });
  } catch (err) {
    res.status(500).json({
      error: 'Error retrieving contact',
      details: err.message
    });
  }
});

router.post('/bulk', async (req, res) => {
  try {
    const action = String(req.body?.action || "update").trim().toLowerCase();
    const rawIds = Array.isArray(req.body?.contactIds) ? req.body.contactIds : [];
    const contactIds = [...new Set(rawIds.map(id => Number.parseInt(id, 10)).filter(id => Number.isFinite(id) && id > 0))];
    if (contactIds.length === 0) {
      return res.status(400).json({
        error: "No contacts selected"
      });
    }
    if (contactIds.length > 200) {
      return res.status(400).json({
        error: "Too many contacts (max 200)"
      });
    }
    if (action === "delete") {
      if (!(await userHasAllPermissions(req.user, ["contacts_detail.delete"]))) {
        return res.status(403).json({
          error: "You do not have permission to perform this action.",
          code: "PERMISSION_DENIED"
        });
      }
      const deletedIds = [];
      const failed = [];
      for (const id of contactIds) {
        try {
          const existing = await pool.query(`SELECT client_id FROM v_b_contacts WHERE id = $1`, [id]);
          if (!existing.rows[0]) {
            failed.push({
              id,
              error: "Contact not found"
            });
            continue;
          }
          await deletePortalUserForContact(id).catch(() => {});
          const result = await pool.query(`DELETE FROM v_b_contacts WHERE id = $1 RETURNING id`, [id]);
          if (!result.rows[0]) {
            failed.push({
              id,
              error: "Contact not found"
            });
            continue;
          }
          invalidateContactsListCache(existing.rows[0]?.client_id || null);
          deletedIds.push(id);
        } catch (err) {
          failed.push({
            id,
            error: err.message || "Delete failed"
          });
        }
      }
      invalidateContactsListCache(null);
      return res.json({
        updated: 0,
        updatedIds: [],
        deleted: deletedIds.length,
        deletedIds,
        failed
      });
    }
    if (!(await userHasAllPermissions(req.user, ["contacts_detail.edit"]))) {
      return res.status(403).json({
        error: "You do not have permission to perform this action.",
        code: "PERMISSION_DENIED"
      });
    }
    const updates = req.body?.updates && typeof req.body.updates === "object" && !Array.isArray(req.body.updates) ? req.body.updates : {};
    const clientId = updates.clientId != null ? Number.parseInt(updates.clientId, 10) : NaN;
    if (!Number.isFinite(clientId) || clientId <= 0) {
      return res.status(400).json({
        error: "No company selected"
      });
    }
    const membershipMode = String(updates.membershipMode || "replace").trim().toLowerCase() === "add" ? "add" : "replace";
    const clientExists = await pool.query(`SELECT id FROM v_b_clients WHERE id = $1 LIMIT 1`, [clientId]);
    if (!clientExists.rows[0]) {
      return res.status(400).json({
        error: "Company not found"
      });
    }
    const updatedIds = [];
    const failed = [];
    for (const id of contactIds) {
      try {
        const existing = await pool.query(`SELECT id FROM v_b_contacts WHERE id = $1 LIMIT 1`, [id]);
        if (!existing.rows[0]) {
          failed.push({
            id,
            error: "Contact not found"
          });
          continue;
        }
        if (membershipMode === "add") {
          await addMembership(id, {
            clientId,
            isPrimary: false
          });
        } else {
          await replaceMemberships(id, [{
            client_id: clientId
          }], {
            preferredHomeClientId: clientId
          });
        }
        updatedIds.push(id);
      } catch (err) {
        failed.push({
          id,
          error: err.message || "Update failed"
        });
      }
    }
    invalidateContactsListCache(null);
    return res.json({
      updated: updatedIds.length,
      updatedIds,
      deleted: 0,
      deletedIds: [],
      failed
    });
  } catch (err) {
    console.error("Error bulk updating contacts:", err);
    return res.status(500).json({
      error: "Error updating contacts",
      details: err.message
    });
  }
});

router.post('/', verifyJWT, requirePermission('contacts.create'), async (req, res) => {
  try {
    await assertCommunityContactsLimit(1);
    const {
      nom,
      prenom,
      sexe,
      email,
      telephone,
      poste,
      statut,
      client_id,
      communications,
      memberships,
      client_ids,
      is_primary
    } = req.body;
    if (!nom) {
      return res.status(400).json({
        error: "Name is required"
      });
    }
    const normalizedSexe = normalizeContactSexe(sexe);
    if (Array.isArray(communications)) {
      const commError = validateContactCommunications(communications);
      if (commError) {
        return res.status(400).json({
          error: commError
        });
      }
    }
    const syncedComms = resolveContactCommunications({
      communications,
      email,
      telephone
    });
    const initialMemberships = normalizeMembershipsInput({
      memberships,
      client_ids,
      client_id,
      poste,
      is_primary
    }, client_id);
    const homeClientId = initialMemberships[0]?.client_id || client_id || null;
    const result = await pool.query(`
      INSERT INTO v_b_contacts (nom, prenom, sexe, email, telephone, poste, statut, client_id, communications, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, nom, prenom, sexe, email, telephone, poste, statut, client_id, communications, created_at, updated_at
    `, [nom, prenom || null, normalizedSexe, syncedComms.email, syncedComms.telephone, poste || null, statut || 'actif', homeClientId || null, JSON.stringify(syncedComms.communications)]);
    const created = hydrateContactRow(result.rows[0]);
    if (initialMemberships.length > 0) {
      await replaceMemberships(created.id, initialMemberships, {
        preferredHomeClientId: homeClientId
      });
    }
    const newContact = await loadContactById(created.id);
    invalidateContactsListCache(newContact?.client_id || null);
    await attachOrphanTicketsToContact(newContact).catch(err => {
      console.warn("attachOrphanTicketsToContact (create):", err?.message || err);
    });
    await dispatchNotificationEvent({
      source: "contact",
      element: "created",
      enterpriseId: String(newContact?.client_id || ""),
      user: req.user,
      context: {
        contact: newContact,
        entreprise: {
          id: String(newContact?.client_id || "")
        }
      }
    }).catch(() => {});
    res.status(201).json(newContact);
  } catch (err) {
    if (err?.code?.startsWith("COMMUNITY_")) {
      return sendCommunityLimitError(res, err);
    }
    res.status(500).json({
      error: "Internal error (SQL)",
      details: err.message
    });
  }
});
router.put('/:id', verifyJWT, requirePermission('contacts_detail.edit'), async (req, res) => {
  try {
    const {
      id
    } = req.params;
    const contactId = Number(id);
    if (!Number.isInteger(contactId) || contactId <= 0) {
      return res.status(400).json({
        error: "Invalid ID contact"
      });
    }
    const payload = req.body || {};
    const {
      nom,
      prenom,
      sexe,
      email,
      telephone,
      poste,
      statut,
      client_id,
      communications
    } = payload;
    const existing = await pool.query(`SELECT id, client_id, nom, prenom, sexe, email, telephone, poste, statut,
              COALESCE(communications, '[]'::jsonb) AS communications
       FROM v_b_contacts
       WHERE id = $1`, [contactId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        error: "Contact not found"
      });
    }
    const current = hydrateContactRow(existing.rows[0]);
    const hasOwn = key => Object.prototype.hasOwnProperty.call(payload, key);
    const resolvedNom = hasOwn('nom') ? (nom || '').trim() : current.nom || '';
    if (!resolvedNom) {
      return res.status(400).json({
        error: "Name is required"
      });
    }
    const resolvedPrenom = hasOwn('prenom') ? prenom || null : current.prenom || null;
    const resolvedSexe = hasOwn('sexe') ? normalizeContactSexe(sexe) : current.sexe || null;
    const resolvedPoste = hasOwn('poste') ? poste || null : current.poste || null;
    const resolvedStatut = hasOwn('statut') ? statut || current.statut || 'actif' : current.statut || 'actif';
    let resolvedClientId = hasOwn('client_id') ? client_id || null : current.client_id || null;
    if (Array.isArray(communications)) {
      const commError = validateContactCommunications(communications);
      if (commError) {
        return res.status(400).json({
          error: commError
        });
      }
    }
    const syncedComms = resolveContactCommunications(payload, current);
    const result = await pool.query(`
      UPDATE v_b_contacts
      SET nom = $1, prenom = $2, sexe = $3, email = $4, telephone = $5, poste = $6, statut = $7, client_id = $8,
          communications = $9::jsonb, updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING id, nom, prenom, sexe, email, telephone, poste, statut, client_id, communications, created_at, updated_at
    `, [resolvedNom, resolvedPrenom, resolvedSexe, syncedComms.email, syncedComms.telephone, resolvedPoste, resolvedStatut, resolvedClientId, JSON.stringify(syncedComms.communications), contactId]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Contact not found"
      });
    }
    if (payloadHasMemberships(payload)) {
      const nextMemberships = normalizeMembershipsInput(payload, resolvedClientId);
      const replaced = await replaceMemberships(contactId, nextMemberships, {
        preferredHomeClientId: resolvedClientId
      });
      resolvedClientId = replaced.homeClientId;
    } else if (hasOwn('client_id') && resolvedClientId) {
      // Dual-write: ensure link without removing other memberships
      await addMembership(contactId, {
        clientId: resolvedClientId,
        poste: resolvedPoste,
        isPrimary: String(resolvedPoste || "").toLowerCase().includes("principal")
      });
      resolvedClientId = await syncHomeClientId(contactId, resolvedClientId);
    } else if (hasOwn('client_id') && !resolvedClientId) {
      // Clearing home only — do not wipe all memberships unless explicit empty memberships[]
      await syncHomeClientId(contactId, null);
    }
    const updatedContact = await loadContactById(contactId);
    const oldClientId = current?.client_id || null;
    const newClientId = updatedContact?.client_id || null;
    invalidateContactsListCache(oldClientId);
    if (newClientId !== oldClientId) {
      invalidateContactsListCache(newClientId);
    }
    const {
      modifiedFields,
      changes
    } = buildContactChanges(current, {
      ...updatedContact,
      client_id: newClientId
    });
    const rawUserId = req.user?.id || req.user?.user_id || null;
    const userId = rawUserId && uuidRegexUser.test(String(rawUserId)) ? String(rawUserId) : null;
    if (modifiedFields.length > 0) {
      try {
        await pool.query(`INSERT INTO v_b_contacts_logs
           (contact_id, client_id, user_id, action, details, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`, [updatedContact.id, updatedContact.client_id, userId, 'Contact update', JSON.stringify({
          modifiedFields,
          changes
        })]);
      } catch (logError) {
        console.warn('Error writing contact log:', logError);
      }
    }
    await dispatchNotificationEvent({
      source: "contact",
      element: "updated",
      enterpriseId: String(updatedContact.client_id || ""),
      user: req.user,
      context: {
        contact: updatedContact,
        changes,
        entreprise: {
          id: String(updatedContact.client_id || "")
        }
      }
    }).catch(() => {});
    try {
      await syncPortalUserFromContact(updatedContact);
    } catch (syncErr) {
      console.warn("Sync portail contact:", syncErr.message);
    }
    await attachOrphanTicketsToContact(updatedContact).catch(err => {
      console.warn("attachOrphanTicketsToContact (update):", err?.message || err);
    });
    res.json(updatedContact);
  } catch (err) {
    res.status(500).json({
      error: "Internal error (SQL)",
      details: err.message
    });
  }
});
router.post('/:id/memberships', verifyJWT, requirePermission('contacts_detail.edit'), async (req, res) => {
  try {
    const contactId = parseContactId(req.params.id);
    if (!contactId) return res.status(400).json({ error: "Invalid contact id" });
    const clientId = Number(req.body?.client_id);
    if (!Number.isInteger(clientId) || clientId <= 0) {
      return res.status(400).json({ error: "client_id is required" });
    }
    const existing = await pool.query(`SELECT id FROM v_b_contacts WHERE id = $1`, [contactId]);
    if (!existing.rows[0]) return res.status(404).json({ error: "Contact not found" });
    await addMembership(contactId, {
      clientId,
      poste: req.body?.poste ?? null,
      isPrimary: req.body?.is_primary === true
    });
    const contact = await loadContactById(contactId);
    return res.json(contact);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Error adding membership" });
  }
});
router.delete('/:id/memberships/:clientId', verifyJWT, requirePermission('contacts_detail.edit'), async (req, res) => {
  try {
    const contactId = parseContactId(req.params.id);
    const clientId = Number(req.params.clientId);
    if (!contactId || !Number.isInteger(clientId) || clientId <= 0) {
      return res.status(400).json({ error: "Invalid ids" });
    }
    await removeMembership(contactId, clientId);
    const contact = await loadContactById(contactId);
    if (!contact) return res.status(404).json({ error: "Contact not found" });
    return res.json(contact);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Error removing membership" });
  }
});
router.put('/:id/memberships/:clientId/primary', verifyJWT, requirePermission('contacts_detail.edit'), async (req, res) => {
  try {
    const contactId = parseContactId(req.params.id);
    const clientId = Number(req.params.clientId);
    if (!contactId || !Number.isInteger(clientId) || clientId <= 0) {
      return res.status(400).json({ error: "Invalid ids" });
    }
    await setPrimaryForClient(clientId, contactId);
    const contact = await loadContactById(contactId);
    return res.json(contact);
  } catch (err) {
    const status = err.code === "CONTACT_CLIENT_MISMATCH" ? 400 : 500;
    return res.status(status).json({ error: err.message || "Error setting primary" });
  }
});
router.get('/:id/memberships', verifyJWT, requirePermission('contacts.view'), async (req, res) => {
  try {
    const contactId = parseContactId(req.params.id);
    if (!contactId) return res.status(400).json({ error: "Invalid contact id" });
    const memberships = await listMembershipsForContact(contactId);
    return res.json(memberships);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Error listing memberships" });
  }
});
router.delete('/:id/logs', verifyJWT, async (req, res) => {
  try {
    const {
      id
    } = req.params;
    const result = await pool.query(`
      DELETE FROM v_b_contacts_logs
      WHERE contact_id = $1
      RETURNING id
    `, [parseInt(id)]);
    res.json({
      success: true,
      message: `${result.rows.length} logs deleted`
    });
  } catch (err) {
    res.status(500).json({
      error: "Error purging logs",
      details: err.message
    });
  }
});
router.delete('/:id', verifyJWT, requirePermission('contacts_detail.delete'), async (req, res) => {
  try {
    const {
      id
    } = req.params;
    const existing = await pool.query(`SELECT client_id FROM v_b_contacts WHERE id = $1`, [parseInt(id)]);
    await deletePortalUserForContact(parseInt(id)).catch(() => {});
    const result = await pool.query(`
      DELETE FROM v_b_contacts
      WHERE id = $1
      RETURNING id
    `, [parseInt(id)]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Contact not found"
      });
    }
    invalidateContactsListCache(existing.rows[0]?.client_id || null);
    res.json({
      success: true,
      message: "Contact deleted"
    });
  } catch (err) {
    res.status(500).json({
      error: "Internal error (SQL)",
      details: err.message
    });
  }
});
export default router;
