import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaPlus, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import { isTicketPlayModeEnabled, navigateToRandomTicket, setTicketPlayModeEnabled, advanceToNextRandomTicket } from "./ticketPlayModeUtils";
import playModeStyles from "./ticketPlayMode.module.css";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import heroStyles from "../EnterprisesPage/EnterpriseDetailPage.module.css";
import styles from "./TicketDetailPage.module.css";
import fs from "./TicketCreatePage.module.css";
import SmartTooltip from "../SmartTooltip";
import ClientOnboardingBadge from "../Misc/ClientOnboardingBadge/ClientOnboardingBadge";
import UserAvatar from "../shared/UserAvatar/UserAvatar";
import TicketExclusionModal from "./TicketExclusionModal";
import TicketSplitModal from "./TicketSplitModal";
import TicketReminderModal from "./TicketReminderModal";
import TicketValidationRequestModal from "./TicketValidationRequestModal";
import TicketValidationBanner from "./TicketValidationBanner";
import TicketResolveModal from "./TicketResolveModal";
import TicketReopenModal from "./TicketReopenModal";
import TicketConfirmModal from "./TicketConfirmModal";
import TicketImageLightbox from "./TicketImageLightbox";
import TicketInsertLinkModal, { captureEditorSelection, insertLinkHtml, restoreEditorSelection } from "./TicketInsertLinkModal";
import ProFeaturePromoModal from "../Misc/ProFeature/ProFeaturePromoModal";
import TicketAiRunbookPanel from "./TicketAiRunbookPanel";
import TicketEmojiPicker from "./TicketEmojiPicker";
import TicketAiEnrichMenu from "./TicketAiEnrichMenu";
import TicketTagSuggestField from "./TicketTagSuggestField";
import { createEvent, updateEvent, deleteEvent, fetchEvents } from "../../api/events";
import { buildReminderEventPayload } from "../../utils/ticketReminderEvent";
import { addTicketAssignee, addTicketComment, addTicketCommentWithAttachments, addLinkedTicket, addTicketTag, addTicketWatcher, createTicketValidationRequest, deleteTicket, fetchTicketCategories, fetchTicket, fetchTickets, fetchSalesForm, fetchSupportForm, permanentlyDeleteTicket, removeTicketTag, removeTicketAssignee, removeTicketWatcher, respondTicketValidationRequest, restoreTicket, updateTicket, updateTicketComment, deleteTicketComment, updateTicketStatus, updateTicketValidationRequest, resolveTicketWithValidation } from "../../api/tickets";
import { fetchAiStatus, suggestTicketReplyAi, correctTicketTextAi, suggestTicketPriorityAi } from "../../api/ai";
import API_BASE_URL from "../../config";
import { sanitizeTicketCommentHtml } from "../../utils/sanitizeHtml";
import { extractClipboardImageFiles, extractInlineDataImagesFromHtml, htmlContainsInlineImage } from "../../utils/ticketEditorImages";
import { contentLooksLikeHtml, isIncomingEmailContent } from "../../utils/incomingEmailContent";
import IncomingEmailMessage from "./IncomingEmailMessage";
import ContactFormModal from "../ContactsPage/ContactFormModal";
import TicketLinkRequesterEmailModal from "./TicketLinkRequesterEmailModal";
import { fetchActiveUsers, fetchCurrentUser } from "../../api/users";
import { fetchClients, fetchClientsList, fetchContactsList, fetchClientModules, fetchClientSupportCredits } from "../../api/clients";
import { fetchPrestataires } from "../../api/prestataires";
import { useAuthContext } from "../../contexts/AuthContext";
import { usePermissions } from "../../contexts/PermissionsContext";
import { useNotifications, emitNotificationsUpdated } from "../../hooks/useNotifications";
import { useVeritasEdition } from "../../hooks/useVeritasEdition";
import { useContractModuleOptions } from "../../hooks/useContractModuleOptions";
import { fetchTicketAutomationConfig, getTicketAutomationConfig, saveTicketAutomationConfig, subscribeTicketAutomationConfig } from "../../utils/ticketAutomationStorage";
import { DEFAULT_TICKET_CHAT_UI_SETTINGS, normalizeTicketChatUiSettings } from "../../utils/ticketChatUiSettings";
import { formatClientSlaRows, getTicketSlaDisplay, parseClientSla } from "../../utils/ticketSlaUtils";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getTicketDetailCopy } from "./ticketDetailPageI18n";
import { getTicketSalesCreatePageCopy } from "./ticketSalesCreatePageI18n";
import { getTicketValidationCopy } from "./ticketValidationI18n";
import { getTicketSalesDetailCopy } from "./ticketSalesDetailI18n";
import TicketVaultArchiveOptions, {
  collectVaultArchiveEntries,
  createDefaultVaultFileOptions,
  getAttachmentFileKey
} from "./TicketVaultArchiveOptions";
import { getTicketVaultArchiveCopy } from "./ticketVaultArchiveI18n";
import { archiveTicketFilesToVault } from "../../utils/archiveTicketFilesToVault";
import { isSalesTicket, buildSalesFormFieldEntries, buildSalesFormFieldLabelMap, buildSalesFormFieldTypeMap, enrichSalesFormLinkedEntries } from "../../utils/salesTicketUtils";
import { formatLinkedEquipmentEventLabel, getEquipmentPickerLabel, getEquipmentSearchText, mapClientEquipmentsForTicketLink } from "./ticketEquipmentUtils";
import { getLocalizedSolutionCatalogLabel } from "./solutionCatalogI18n";
import { interpolate } from "../../i18n/translate";
import { buildClientContractSummary, buildDefaultResolveCreditAmounts, buildSupportCreditDebitsPayload, computeSupportCreditTotals } from "./ticketClientSummaryUtils";
import { computeSatisfactionAverage, resolveDisplayRatings } from "../../utils/ticketSatisfactionCriteria";
import { getTicketSatisfactionCriteria } from "../../i18n/ticketSatisfactionCriteriaI18n";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
import TicketKnowledgeSuggestions from "./TicketKnowledgeSuggestions";
import SalesFormFieldValue from "./SalesFormFieldValue";
const CONTRACT_FACT_STATUS_CLASS = {
  active: fs.contractFact_active,
  expiring: fs.contractFact_expiring,
  expired: fs.contractFact_expired,
  pending: fs.contractFact_pending,
  unknown: fs.contractFact_unknown
};
const CONTRACT_HEADER_STATUS_CLASS = {
  expired: styles.contractHeaderStatus_expired,
  expiring: styles.contractHeaderStatus_expiring
};
const RIGHT_PANE_LINKED_PREVIEW = 2;
const RIGHT_PANE_HISTORY_PREVIEW = 3;
const REPLY_BOX_EXPANDED_KEY = "ticket_reply_box_expanded";
function normalizeAttachmentPath(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw, window.location.origin);
    return parsed.pathname;
  } catch {
    return raw.split("?")[0];
  }
}
function getAttachmentRemovalKey(attachment) {
  if (!attachment) return null;
  if (attachment.id) return `id:${attachment.id}`;
  const path = normalizeAttachmentPath(attachment.url || attachment.path || attachment.file_path || "");
  if (path) return `path:${path}`;
  const name = attachment.filename || attachment.name;
  return name ? `name:${name}` : null;
}
function isAttachmentMarkedForRemoval(attachment, removedKeys = []) {
  const key = getAttachmentRemovalKey(attachment);
  return Boolean(key && removedKeys.includes(key));
}
function splitRemovedAttachmentKeys(removedKeys = []) {
  const removeAttachmentIds = [];
  const removeAttachmentPaths = [];
  removedKeys.forEach(key => {
    if (key.startsWith("id:")) removeAttachmentIds.push(key.slice(3));else if (key.startsWith("path:")) removeAttachmentPaths.push(key.slice(5));
  });
  return {
    removeAttachmentIds,
    removeAttachmentPaths
  };
}
function mergeCommentAttachments(commentAttachments = [], ticketLevelAttachments = []) {
  if (ticketLevelAttachments.length === 0) return commentAttachments;
  if (commentAttachments.length === 0) return ticketLevelAttachments;
  const ticketById = new Map(ticketLevelAttachments.filter(item => item?.id).map(item => [String(item.id), item]));
  const ticketByPath = new Map(ticketLevelAttachments.map(item => [normalizeAttachmentPath(item.url || item.path), item]).filter(([pathKey]) => pathKey));
  const mergedCommentAttachments = commentAttachments.map(attachment => {
    if (attachment?.id && ticketById.has(String(attachment.id))) {
      return ticketById.get(String(attachment.id));
    }
    const pathKey = normalizeAttachmentPath(attachment?.url || attachment?.path);
    if (pathKey && ticketByPath.has(pathKey)) return ticketByPath.get(pathKey);
    return attachment;
  });
  const seen = new Set(mergedCommentAttachments.map(attachment => getAttachmentRemovalKey(attachment)).filter(Boolean));
  ticketLevelAttachments.forEach(attachment => {
    const key = getAttachmentRemovalKey(attachment);
    if (!key || seen.has(key)) return;
    seen.add(key);
    mergedCommentAttachments.push(attachment);
  });
  return mergedCommentAttachments;
}
function SidebarExpandToggle({
  expanded,
  onClick,
  copy
}) {
  return <div className={heroStyles.sidebarShowMoreWrap}>
      <button type="button" className={heroStyles.sidebarShowMoreBtn} onClick={onClick} aria-expanded={expanded} aria-label={expanded ? copy.sidebarExpand.collapseAria : copy.sidebarExpand.expandAria}>
        <Icon icon={expanded ? "mdi:chevron-up" : "mdi:chevron-down"} className={heroStyles.sidebarShowMoreIcon} aria-hidden />
        <span>{expanded ? copy.sidebarExpand.showLess : copy.sidebarExpand.showMore}</span>
      </button>
    </div>;
}
function normalizeTicketStatusKey(status) {
  const value = String(status || "").trim().toLowerCase();
  if (value === "open") return "new";
  return value;
}
function isNewTicketStatus(status) {
  const key = normalizeTicketStatusKey(status);
  return key === "new" || key === "";
}
function computeTicketTakeoverStat(ticket) {
  if (!ticket?.created_at) return null;
  const createdAtMs = new Date(ticket.created_at).getTime();
  if (Number.isNaN(createdAtMs)) return null;
  const history = Array.isArray(ticket.statusHistory) ? ticket.statusHistory : [];
  const firstTakeover = history.map(row => ({
    at: row.created_at,
    atMs: new Date(row.created_at).getTime(),
    oldStatus: row.old_status,
    newStatus: row.new_status
  })).filter(row => !Number.isNaN(row.atMs) && isNewTicketStatus(row.oldStatus) && row.newStatus && !isNewTicketStatus(row.newStatus)).sort((a, b) => a.atMs - b.atMs)[0];
  if (!firstTakeover) return null;
  return {
    at: firstTakeover.at,
    durationMs: firstTakeover.atMs - createdAtMs,
    newStatus: firstTakeover.newStatus
  };
}
function getContactSearchText(contact) {
  return [contact?.prenom, contact?.nom, contact?.email, contact?.client_name, contact?.entreprise].filter(Boolean).join(" ").toLowerCase();
}
function getContactLabel(contact) {
  const fullName = `${contact?.prenom || ""} ${contact?.nom || ""}`.trim();
  const base = fullName || contact?.email || `Contact #${contact?.id}`;
  if (contact?.email && fullName) return `${fullName} · ${contact.email}`;
  return base;
}
function getPrestataireContactsList(prestataire) {
  if (Array.isArray(prestataire?.contacts) && prestataire.contacts.length > 0) {
    return prestataire.contacts.map((contact, index) => ({
      key: `${prestataire.id}-${contact.id ?? index}`,
      nom: contact.nom || "",
      prenom: contact.prenom || "",
      email: (contact.email || "").toString().trim(),
      telephone: (contact.telephone || "").toString().trim()
    }));
  }
  const legacyEmail = (prestataire?.email || "").toString().trim();
  const legacyPhone = (prestataire?.telephone || "").toString().trim();
  const legacyNom = prestataire?.contact_nom || "";
  const legacyPrenom = prestataire?.contact_prenom || "";
  if (!legacyEmail && !legacyPhone && !legacyNom && !legacyPrenom) return [];
  return [{
    key: `${prestataire.id}-legacy`,
    nom: legacyNom,
    prenom: legacyPrenom,
    email: legacyEmail,
    telephone: legacyPhone
  }];
}
function formatPrestataireContactLabel(contact) {
  const name = `${contact?.prenom || ""} ${contact?.nom || ""}`.trim();
  if (name && contact?.email) return `${name} · ${contact.email}`;
  return name || contact?.email || contact?.telephone || "Contact";
}
function htmlToPlainText(rawHtml) {
  const source = String(rawHtml || "");
  if (!source) return "";
  if (typeof window === "undefined" || typeof window.DOMParser === "undefined") {
    return source.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  const parser = new window.DOMParser();
  const doc = parser.parseFromString(source, "text/html");
  return String(doc.body.textContent || "").replace(/\s+/g, " ").trim();
}
function parseSideConversationEvent(content) {
  const text = String(content || "");
  if (!text.startsWith("[Side conversation]")) return null;
  const payload = {};
  const matches = text.match(/\[([a-zA-Z_]+):([^\]]+)\]/g) || [];
  matches.forEach(chunk => {
    const clean = chunk.replace(/^\[/, "").replace(/\]$/, "");
    const [key, ...rest] = clean.split(":");
    payload[key] = rest.join(":");
  });
  if (!payload.id) return null;
  return {
    id: payload.id,
    event: payload.event || "opened",
    team: payload.team || "commercial",
    subject: payload.subject || "Side conversation",
    to: payload.to || "",
    cc: payload.cc || "",
    message: payload.message ? decodeURIComponent(payload.message) : "",
    createdAt: payload.created_at || null
  };
}
function buildSideConversationsFromComments(comments = []) {
  const map = new Map();
  comments.forEach(comment => {
    const event = parseSideConversationEvent(comment?.content);
    if (!event) return;
    const existing = map.get(event.id) || {
      id: event.id,
      team: event.team,
      subject: event.subject,
      to: event.to,
      cc: event.cc,
      status: "open",
      createdAt: event.createdAt || comment?.created_at || new Date().toISOString(),
      updatedAt: comment?.created_at || new Date().toISOString(),
      messages: []
    };
    const next = {
      ...existing,
      team: event.team || existing.team,
      subject: event.subject || existing.subject,
      to: event.to || existing.to || "",
      cc: event.cc || existing.cc || "",
      createdAt: existing.createdAt || event.createdAt || comment?.created_at || new Date().toISOString(),
      updatedAt: comment?.created_at || existing.updatedAt,
      status: event.event === "closed" ? "done" : event.event === "reopened" ? "open" : existing.status,
      messages: event.event === "message" && event.message ? [...(existing.messages || []), {
        id: comment?.id || `${event.id}-${Date.now()}`,
        author: comment?.author_name || "Agent",
        createdAt: comment?.created_at || new Date().toISOString(),
        content: event.message
      }] : existing.messages || []
    };
    map.set(event.id, next);
  });
  return Array.from(map.values()).sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
}
function parseLinkedEquipmentEvent(content) {
  const text = String(content || "");
  if (!text.startsWith("[Linked equipment]")) return null;
  const payload = {};
  const matches = text.match(/\[([a-zA-Z_]+):([^\]]+)\]/g) || [];
  matches.forEach(chunk => {
    const clean = chunk.replace(/^\[/, "").replace(/\]$/, "");
    const [key, ...rest] = clean.split(":");
    payload[key] = rest.join(":");
  });
  if (!payload.equipment_id) return null;
  return {
    event: payload.event || "added",
    equipmentId: payload.equipment_id,
    name: payload.name || "Hardware",
    type: payload.type || "",
    clientId: payload.client_id || "",
    warranty: payload.warranty || "",
    licenses: payload.licenses ? decodeURIComponent(payload.licenses) : "",
    serial: payload.serial || "",
    brand: payload.brand || "",
    model: payload.model || ""
  };
}
function buildLinkedEquipmentsFromComments(comments = []) {
  const map = new Map();
  comments.forEach(comment => {
    const event = parseLinkedEquipmentEvent(comment?.content);
    if (!event) return;
    if (event.event === "removed") {
      map.delete(String(event.equipmentId));
      return;
    }
    map.set(String(event.equipmentId), {
      equipment_id: event.equipmentId,
      name: event.name,
      type: event.type,
      client_id: event.clientId,
      warranty: event.warranty || "",
      licenses: event.licenses || "",
      serial: event.serial || "",
      brand: event.brand || "",
      model: event.model || "",
      source: "veritas"
    });
  });
  return Array.from(map.values()).sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "fr"));
}
function buildLinkedEquipmentsFromTicket(ticket) {
  const rows = buildLinkedEquipmentsFromComments(ticket?.comments || []);
  const info = ticket?.equipment_info || ticket?.equipmentInfo;
  if (!info || typeof info !== "object" || !info.concerned) {
    return rows;
  }
  const source = String(info.source || "").trim() === "external" ? "external" : "veritas";
  if (source === "external") {
    const externalKey = `external:${info.brand || ""}:${info.model || ""}:${info.serial || ""}`;
    if (rows.some(row => String(row.equipment_id) === externalKey)) {
      return rows;
    }
    const label = [info.brand, info.model].map(part => String(part || "").trim()).filter(Boolean).join(" ") || String(info.serial || "").trim() || "Hardware";
    rows.push({
      equipment_id: externalKey,
      name: label,
      type: "",
      client_id: String(ticket?.client_id || "").trim(),
      warranty: "",
      licenses: "",
      serial: String(info.serial || "").trim(),
      brand: String(info.brand || "").trim(),
      model: String(info.model || "").trim(),
      source: "external"
    });
    return rows.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "fr"));
  }
  const equipmentId = String(info.equipmentId || info.equipment_id || "").trim();
  if (!equipmentId) return rows;
  if (rows.some(row => String(row.equipment_id) === equipmentId)) {
    return rows;
  }
  rows.push({
    equipment_id: equipmentId,
    name: String(info.name || "").trim() || `Hardware #${equipmentId}`,
    type: String(info.type || "").trim(),
    client_id: String(info.clientId || info.client_id || "").trim(),
    warranty: "",
    licenses: "",
    serial: "",
    brand: "",
    model: "",
    source: "veritas"
  });
  return rows.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "fr"));
}
function buildMaterialTemplateFields(ticket, linkedEquipments = []) {
  const rows = Array.isArray(linkedEquipments) && linkedEquipments.length > 0 ? linkedEquipments : buildLinkedEquipmentsFromTicket(ticket);
  const info = ticket?.equipment_info || ticket?.equipmentInfo;
  let primary = rows[0] || null;
  if (info?.concerned && String(info.source || "").trim() !== "external") {
    const infoId = String(info.equipmentId || info.equipment_id || "").trim();
    const match = rows.find(row => String(row.equipment_id) === infoId);
    if (match) primary = match;
  }
  const names = rows.map(row => String(row.name || "").trim()).filter(Boolean);
  const types = rows.map(row => String(row.type || "").trim()).filter(Boolean);
  const ids = rows.map(row => String(row.equipment_id || "").trim()).filter(Boolean);
  const list = rows.map(row => {
    const type = String(row.type || "").trim();
    const name = String(row.name || "").trim();
    if (type && name) return `${type} · ${name}`;
    return name || type || String(row.equipment_id || "");
  }).filter(Boolean);
  return {
    id: String(primary?.equipment_id || "").trim(),
    name: String(primary?.name || "").trim(),
    type: String(primary?.type || "").trim(),
    warranty: String(primary?.warranty || "").trim(),
    licenses: String(primary?.licenses || "").trim(),
    serial: String(primary?.serial || info?.serial || "").trim(),
    brand: String(primary?.brand || info?.brand || "").trim(),
    model: String(primary?.model || info?.model || "").trim(),
    clientId: String(primary?.client_id || info?.clientId || info?.client_id || "").trim(),
    count: String(rows.length),
    names: names.join(", "),
    types: [...new Set(types)].join(", "),
    ids: ids.join(", "),
    list: list.join(", ")
  };
}
function parseLinkedTicketEvent(content) {
  const text = String(content || "");
  if (!text.startsWith("[Linked ticket]")) return null;
  const payload = {};
  const matches = text.match(/\[([a-zA-Z_]+):([^\]]+)\]/g) || [];
  matches.forEach(chunk => {
    const clean = chunk.replace(/^\[/, "").replace(/\]$/, "");
    const [key, ...rest] = clean.split(":");
    payload[key] = rest.join(":");
  });
  if (!payload.linked_ticket_id) return null;
  return {
    event: payload.event || "added",
    linkedTicketId: payload.linked_ticket_id,
    ticketNumber: payload.ticket_number || "",
    title: payload.title || ""
  };
}
function parseSplitTicketEvent(content) {
  const text = String(content || "");
  if (!text.startsWith("[Split ticket]")) return null;
  const payload = {};
  const matches = text.match(/\[([a-zA-Z_]+):([^\]]+)\]/g) || [];
  matches.forEach(chunk => {
    const clean = chunk.replace(/^\[/, "").replace(/\]$/, "");
    const [key, ...rest] = clean.split(":");
    payload[key] = rest.join(":");
  });
  if (!payload.linked_ticket_id) return null;
  return {
    direction: payload.direction || "to",
    linkedTicketId: payload.linked_ticket_id,
    ticketNumber: payload.ticket_number || "",
    title: payload.title || ""
  };
}
function titleSuffix(title) {
  return title ? ` · ${title}` : "";
}
function truncateLogText(value, max = 140) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}
function isLinkActivityComment(content) {
  const text = String(content || "").trim();
  return text.startsWith("[Linked ticket]") || text.startsWith("[Linked equipment]");
}
function isTimelineVisibleComment(content) {
  if (parseSideConversationEvent(content)?.event === "message") return false;
  if (isLinkActivityComment(content)) return false;
  return true;
}
const RESOLUTION_COMMENT_PREFIX = "[Resolution]";
const RESOLUTION_AUTO_CLOSE_PREFIX = "[Resolution auto-closed]";
const RESOLUTION_CLIENT_REJECTION_PREFIX = "[Resolution client]";
const RESOLUTION_CLIENT_ACCEPT_PREFIX = "[Resolution accepted by client]";
function isResolutionProposalComment(content) {
  const text = String(content || "").trim();
  return text.startsWith(RESOLUTION_COMMENT_PREFIX) && !text.startsWith(RESOLUTION_AUTO_CLOSE_PREFIX) && !text.startsWith(RESOLUTION_CLIENT_REJECTION_PREFIX) && !text.startsWith(RESOLUTION_CLIENT_ACCEPT_PREFIX);
}
function parseResolutionProposalComment(content) {
  const text = String(content || "").trim();
  if (!isResolutionProposalComment(text)) return null;
  const rest = text.slice(RESOLUTION_COMMENT_PREFIX.length).trim();
  const match = rest.match(/^\[([^\]]+)\]\s*\[([^\]]+)\]\s*([\s\S]*)$/);
  if (match) {
    return {
      interventionType: match[1].trim(),
      actionType: match[2].trim(),
      reason: match[3].trim()
    };
  }
  return {
    interventionType: "",
    actionType: "",
    reason: rest
  };
}
function isResolutionProposalTimelineComment(comment, resolutionValidation) {
  if (!comment) return false;
  if (isResolutionProposalComment(comment.content)) return true;
  const commentId = comment.id;
  const validationCommentId = resolutionValidation?.resolutionCommentId;
  return Boolean(commentId && validationCommentId && String(commentId) === String(validationCommentId));
}
function isUserEditableCommentContent(content, copy) {
  const text = String(content || "").trim();
  if (!text) return false;
  if (describeCommentActivity(text, copy)) return false;
  if (isResolutionProposalComment(text)) return false;
  if (text.startsWith("[WhatsApp]")) return false;
  if (text.startsWith("[Email entrant]")) return false;
  if (text.startsWith("[Macro ")) return false;
  return true;
}
function isClientResponseComment(comment) {
  if (!comment || comment.is_internal) return false;
  const content = String(comment.content || "").trim();
  if (content.startsWith("[WhatsApp]")) return true;
  if (content.startsWith("[Email entrant]")) return true;
  const authorRole = String(comment.author_role || comment.authorRole || "").toLowerCase();
  if (authorRole === "client") return true;
  return false;
}
function isCommentEdited(comment) {
  if (!comment?.updated_at) return false;
  const createdAt = new Date(comment.created_at || 0).getTime();
  const updatedAt = new Date(comment.updated_at).getTime();
  return Number.isFinite(updatedAt) && updatedAt > createdAt + 500;
}
function describeCommentActivity(content, copy, locale) {
  const splitEvent = parseSplitTicketEvent(content);
  if (splitEvent) {
    const number = splitEvent.ticketNumber ? `#${splitEvent.ticketNumber}` : `#${splitEvent.linkedTicketId}`;
    const suffix = titleSuffix(splitEvent.title);
    return splitEvent.direction === "from" ? interpolate(copy.activity.splitFrom, {
      number,
      titleSuffix: suffix
    }) : interpolate(copy.activity.splitTo, {
      number,
      titleSuffix: suffix
    });
  }
  const linkedTicketEvent = parseLinkedTicketEvent(content);
  if (linkedTicketEvent) {
    const number = linkedTicketEvent.ticketNumber ? `#${linkedTicketEvent.ticketNumber}` : `#${linkedTicketEvent.linkedTicketId}`;
    const suffix = titleSuffix(linkedTicketEvent.title);
    return linkedTicketEvent.event === "removed" ? interpolate(copy.activity.linkedRemoved, {
      number
    }) : interpolate(copy.activity.linkedAdded, {
      number,
      titleSuffix: suffix
    });
  }
  const linkedEquipmentEvent = parseLinkedEquipmentEvent(content);
  if (linkedEquipmentEvent) {
    const label = formatLinkedEquipmentEventLabel(linkedEquipmentEvent, {
      locale,
      separator: " · "
    });
    return linkedEquipmentEvent.event === "removed" ? interpolate(copy.activity.equipmentRemoved, {
      label
    }) : interpolate(copy.activity.equipmentAdded, {
      label
    });
  }
  const sideConversationEvent = parseSideConversationEvent(content);
  if (sideConversationEvent) {
    const subject = sideConversationEvent.subject || copy.sideConversationSubjectFallback;
    if (sideConversationEvent.event === "closed") {
      return interpolate(copy.activity.sideClosed, {
        subject
      });
    }
    if (sideConversationEvent.event === "reopened") {
      return interpolate(copy.activity.sideReopened, {
        subject
      });
    }
    if (sideConversationEvent.event === "message") {
      return interpolate(copy.activity.sideMessage, {
        subject
      });
    }
    return interpolate(copy.activity.sideOpened, {
      subject
    });
  }
  return null;
}
function formatActivityHistoryValue(field, value, copy, resolveUserLabel, resolveContactLabel, resolveClientLabel) {
  if (value == null || value === "") return copy.activity.emptyValue;
  if (field === "is_major_incident") {
    return value === "true" || value === true ? copy.activity.yes : copy.activity.no;
  }
  if (field === "priority") {
    const opt = (copy.priorityOptions || []).find(item => item.key === value || item.value === value);
    return opt?.label || value;
  }
  if (field === "type") {
    const opt = (copy.ticketTypes || []).find(item => item.key === value);
    if (opt?.label) return opt.label;
    if (value === "prestation" || value === "installation") return value;
    return value;
  }
  if (field === "channel") {
    const opt = (copy.channelOptions || []).find(item => item.key === value);
    return opt?.label || copy.getChannelViaLabel?.(value) || value;
  }
  if (field === "status") return copy.getStatusLabel(value === "open" ? "new" : value);
  if (field === "assigned_user_id" || field === "assignee" || field === "requester_user_id" || field === "watcher") {
    return resolveUserLabel(value) || value;
  }
  if (field === "requester_contact_id") {
    return resolveContactLabel?.(value) || interpolate(copy.activity.contactFallback, {
      id: value
    });
  }
  if (field === "client_id") {
    return resolveClientLabel?.(value) || interpolate(copy.activity.clientFallback, {
      id: value
    });
  }
  if (field === "description") {
    const text = String(value).replace(/\s+/g, " ").trim();
    return text.length > 120 ? `${text.slice(0, 117)}…` : text;
  }
  return String(value);
}
function describeActivityHistoryRow(row, copy, resolveUserLabel, resolveContactLabel, resolveClientLabel) {
  const action = String(row?.action || "");
  const field = String(row?.field || "");
  const fieldLabel = copy.activity.fields?.[field] || field || copy.activity.fields?.unknown || "Field";
  const oldValue = formatActivityHistoryValue(field, row?.old_value, copy, resolveUserLabel, resolveContactLabel, resolveClientLabel);
  const newValue = formatActivityHistoryValue(field, row?.new_value, copy, resolveUserLabel, resolveContactLabel, resolveClientLabel);
  if (action === "field_changed") {
    if (row?.old_value == null || row?.old_value === "") {
      return {
        kind: "field",
        icon: "mdi:pencil-outline",
        label: interpolate(copy.activity.fieldSet, {
          field: fieldLabel,
          newValue
        }),
        detail: ""
      };
    }
    if (row?.new_value == null || row?.new_value === "") {
      return {
        kind: "field",
        icon: "mdi:pencil-outline",
        label: interpolate(copy.activity.fieldCleared, {
          field: fieldLabel,
          oldValue
        }),
        detail: ""
      };
    }
    return {
      kind: "field",
      icon: "mdi:pencil-outline",
      label: interpolate(copy.activity.fieldChanged, {
        field: fieldLabel,
        oldValue,
        newValue
      }),
      detail: field === "description" ? newValue : ""
    };
  }
  if (action === "assignee_added") {
    return {
      kind: "assignee",
      icon: "mdi:account-plus-outline",
      label: interpolate(copy.activity.assigneeAdded, {
        name: newValue
      }),
      detail: ""
    };
  }
  if (action === "assignee_removed") {
    return {
      kind: "assignee",
      icon: "mdi:account-minus-outline",
      label: interpolate(copy.activity.assigneeRemoved, {
        name: oldValue
      }),
      detail: ""
    };
  }
  if (action === "watcher_added") {
    return {
      kind: "watcher",
      icon: "mdi:eye-plus-outline",
      label: interpolate(copy.activity.watcherAdded, {
        name: newValue
      }),
      detail: ""
    };
  }
  if (action === "watcher_removed") {
    return {
      kind: "watcher",
      icon: "mdi:eye-minus-outline",
      label: interpolate(copy.activity.watcherRemoved, {
        name: oldValue
      }),
      detail: ""
    };
  }
  if (action === "tag_added") {
    return {
      kind: "tag",
      icon: "mdi:tag-plus-outline",
      label: interpolate(copy.activity.tagAdded, {
        label: newValue
      }),
      detail: ""
    };
  }
  if (action === "tag_removed") {
    return {
      kind: "tag",
      icon: "mdi:tag-remove-outline",
      label: interpolate(copy.activity.tagRemoved, {
        label: oldValue
      }),
      detail: ""
    };
  }
  if (action === "deleted") {
    return {
      kind: "deleted",
      icon: "mdi:trash-can-outline",
      label: copy.activity.deleted,
      detail: ""
    };
  }
  if (action === "restored") {
    return {
      kind: "restored",
      icon: "mdi:restore",
      label: copy.activity.restored,
      detail: ""
    };
  }
  return {
    kind: "field",
    icon: "mdi:history",
    label: action,
    detail: [fieldLabel, oldValue, newValue].filter(Boolean).join(" · ")
  };
}
function buildTicketActivityLog(ticket, resolveUserLabel, copy, locale, resolveContactLabel, resolveClientLabel) {
  if (!ticket) return [];
  const entries = [];
  const resolveActor = (userId, fallback = copy.authorSystem) => {
    if (!userId) return fallback;
    const label = resolveUserLabel(userId);
    return label && label !== userId ? label : fallback;
  };
  if (ticket.created_at) {
    entries.push({
      id: `created-${ticket.id}`,
      at: ticket.created_at,
      kind: "created",
      icon: "mdi:ticket-plus-outline",
      label: copy.activity.created,
      actor: resolveActor(ticket.created_by),
      detail: ticket.title || ""
    });
  }
  (Array.isArray(ticket.statusHistory) ? ticket.statusHistory : []).forEach(row => {
    const oldLabel = row.old_status ? copy.getStatusLabel(row.old_status === "open" ? "new" : row.old_status) : null;
    const newLabel = copy.getStatusLabel(row.new_status === "open" ? "new" : row.new_status);
    const rawNote = String(row.note || "").trim();
    const noteKey = rawNote.toLowerCase();
    const isUselessNote = !rawNote || noteKey === "tickand update" || noteKey === "ticket update" || noteKey === "bulk update" || noteKey === "tickand creation" || noteKey.startsWith("tickand creation (");
    entries.push({
      id: `status-${row.id}`,
      at: row.created_at,
      kind: "status",
      icon: "mdi:swap-horizontal",
      label: oldLabel ? interpolate(copy.activity.statusTransition, {
        oldLabel,
        newLabel
      }) : interpolate(copy.activity.statusChange, {
        newLabel
      }),
      actor: resolveActor(row.changed_by),
      detail: isUselessNote ? "" : rawNote
    });
  });
  const activityHistory = Array.isArray(ticket.activityHistory) ? ticket.activityHistory : [];
  activityHistory.forEach(row => {
    const described = describeActivityHistoryRow(row, copy, resolveUserLabel, resolveContactLabel, resolveClientLabel);
    entries.push({
      id: `activity-${row.id}`,
      at: row.created_at,
      kind: described.kind,
      icon: described.icon,
      label: described.label,
      actor: resolveActor(row.actor_user_id),
      detail: described.detail || ""
    });
  });
  (Array.isArray(ticket.comments) ? ticket.comments : []).forEach(comment => {
    const content = String(comment?.content || "");
    const systemLabel = describeCommentActivity(content, copy, locale);
    const attachmentCount = Array.isArray(comment.attachments) ? comment.attachments.length : 0;
    if (systemLabel) {
      const linkedTicketEvent = parseLinkedTicketEvent(content);
      const linkedEquipmentEvent = parseLinkedEquipmentEvent(content);
      let icon = "mdi:cog-outline";
      if (linkedTicketEvent) {
        icon = linkedTicketEvent.event === "removed" ? "mdi:link-variant-off" : "mdi:link-variant";
      } else if (linkedEquipmentEvent) {
        icon = linkedEquipmentEvent.event === "removed" ? "mdi:server-off" : "mdi:server-network";
      }
      entries.push({
        id: `system-${comment.id}`,
        at: comment.created_at,
        kind: "system",
        icon,
        label: systemLabel,
        actor: resolveActor(comment.author_user_id, copy.authorSystem),
        detail: ""
      });
      return;
    }
    const plainContent = htmlToPlainText(content);
    const attachmentDetail = attachmentCount > 0 ? copy.formatActivityAttachmentDetail(attachmentCount) : "";
    if (comment.is_internal) {
      entries.push({
        id: `internal-${comment.id}`,
        at: comment.created_at,
        kind: "internal",
        icon: "mdi:lock-outline",
        label: copy.activity.internalNote,
        actor: resolveActor(comment.author_user_id, comment.author_name || copy.authorAgent),
        detail: attachmentDetail || plainContent
      });
      return;
    }
    entries.push({
      id: `comment-${comment.id}`,
      at: comment.created_at,
      kind: "comment",
      icon: "mdi:message-reply-text-outline",
      label: copy.activity.publicReply,
      actor: resolveActor(comment.author_user_id, comment.author_name || copy.authorAgent),
      detail: attachmentDetail || plainContent
    });
  });
  const hasDeletedActivity = activityHistory.some(row => row.action === "deleted");
  if (ticket.deleted_at && !hasDeletedActivity) {
    entries.push({
      id: `deleted-${ticket.id}`,
      at: ticket.deleted_at,
      kind: "deleted",
      icon: "mdi:trash-can-outline",
      label: copy.activity.deleted,
      actor: copy.authorSystem,
      detail: ""
    });
  }
  return entries.filter(entry => entry.at).sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
function buildLinkedTicketsFromComments(comments = []) {
  const map = new Map();
  comments.forEach(comment => {
    const event = parseLinkedTicketEvent(comment?.content);
    if (!event) return;
    if (event.event === "removed") {
      map.delete(String(event.linkedTicketId));
      return;
    }
    map.set(String(event.linkedTicketId), {
      linked_ticket_id: event.linkedTicketId,
      ticket_number: event.ticketNumber || null,
      title: event.title || "Linked ticket"
    });
  });
  return Array.from(map.values());
}
const MAX_ATTACHMENT_SIZE_BYTES = 15 * 1024 * 1024;
const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx", ".csv", ".xls", ".xlsx", ".mp4", ".3gp", ".mp3", ".mpeg", ".ogg", ".aac", ".amr", ".m4a"]);
const ATTACHMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png,.doc,.docx,.csv,.xls,.xlsx,.mp4,.3gp,.mp3,.mpeg,.ogg,.aac,.amr,.m4a";
const ATTACHMENT_FORMATS_LABEL = "PDF, JPG, PNG, DOC, DOCX, CSV, XLS, XLSX, MP4, 3GP, MP3, OGG, AAC, AMR, M4A";
const BACKEND_BASE_URL = String(API_BASE_URL || "").replace(/\/api\/?$/, "");
function notifyWhatsAppDelivery(whatsappDelivery, copy) {
  if (!whatsappDelivery?.attempted || whatsappDelivery.skipped) return;
  if (whatsappDelivery.success) return;
  toast.error(copy.formatWhatsappDeliveryError(whatsappDelivery.error));
}
function normalizeHttpUrl(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return "";
  const candidate = raw.replace(/[<>]/g, "");
  const withProtocol = /^https?:\/\//i.test(candidate) ? candidate : /^www\./i.test(candidate) ? `https://${candidate}` : "";
  if (!withProtocol) return "";
  try {
    return new URL(withProtocol).href;
  } catch (_error) {
    return "";
  }
}
function toAbsoluteAttachmentUrl(rawPath) {
  const raw = String(rawPath || "").trim();
  if (!raw) return "";
  const normalizedSlashes = raw.replace(/\\/g, "/");
  const directUrl = normalizeHttpUrl(normalizedSlashes);
  if (directUrl) return directUrl;
  const uploadsIndex = normalizedSlashes.toLowerCase().indexOf("/uploads/");
  const relativePath = uploadsIndex >= 0 ? normalizedSlashes.slice(uploadsIndex) : normalizedSlashes;
  if (!relativePath.startsWith("/")) return "";
  const encodedPath = relativePath.split("/").map((part, index) => index === 0 ? part : encodeURIComponent(part)).join("/");
  return `${BACKEND_BASE_URL}${encodedPath}`;
}
function TicketSatisfactionStars({
  rating,
  copy
}) {
  const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));
  return <div className={styles.satisfactionStars} aria-label={copy.formatSatisfactionStarsAria(safeRating)}>
      {[1, 2, 3, 4, 5].map(star => <Icon key={star} icon={star <= safeRating ? "mdi:star" : "mdi:star-outline"} className={star <= safeRating ? styles.satisfactionStarActive : styles.satisfactionStar} aria-hidden />)}
    </div>;
}
function TicketSatisfactionCriteriaPanel({
  satisfaction,
  copy,
  criteria
}) {
  const ratings = resolveDisplayRatings(satisfaction);
  if (!ratings) return null;
  const average = satisfaction?.averageRating ?? computeSatisfactionAverage(ratings);
  const rows = criteria?.length ? criteria : [];
  return <div className={styles.satisfactionCriteriaPanel}>
      {rows.map(({
      key,
      label
    }) => <div key={key} className={styles.satisfactionCriterionRow}>
          <span className={styles.satisfactionCriterionLabel}>{label}</span>
          <div className={styles.satisfactionCriterionScore}>
            <TicketSatisfactionStars rating={ratings[key]} copy={copy} />
            <span className={styles.satisfactionCriterionValue}>{ratings[key]}/5</span>
          </div>
        </div>)}
      {average > 0 ? <div className={styles.satisfactionAverageRow}>
          <strong>{copy.satisfactionAverage}</strong>
          <span>{average}/5</span>
        </div> : null}
    </div>;
}
function hasTicketSatisfactionData(satisfaction) {
  if (!satisfaction) return false;
  if (Number(satisfaction.rating) > 0) return true;
  if (Number(satisfaction.averageRating) > 0) return true;
  const ratings = resolveDisplayRatings(satisfaction);
  if (!ratings) return false;
  return Object.values(ratings).some(value => Number(value) >= 1);
}
function TicketSatisfactionHeaderBadge({
  filled,
  copy
}) {
  return <span className={`${styles.satisfactionHeaderBadge} ${filled ? styles.satisfactionHeaderBadgeFilled : styles.satisfactionHeaderBadgeEmpty}`.trim()} aria-label={filled ? copy.rightPane.satisfactionFilledAria : copy.rightPane.satisfactionEmptyAria}>
      <Icon icon={filled ? "mdi:star" : "mdi:star-outline"} aria-hidden />
    </span>;
}
const DEFAULT_RIGHT_PANE_COLLAPSE = {
  contact: true,
  satisfaction: false,
  contract: true,
  ticketDates: false,
  linkedTicket: false,
  linkedEquipment: false,
  requesterHistory: false,
  ticketLog: false
};
function RightPaneStaticSection({
  title,
  titleId,
  count = 0,
  headerExtra = null,
  sectionClassName = "",
  bodyClassName = "",
  children
}) {
  const showCount = Number(count) > 0;
  return <section className={`${heroStyles.sidebarSection} ${sectionClassName}`.trim()}>
      <div className={heroStyles.sidebarInfoHeader}>
        <span className={heroStyles.sidebarInfoTitle} id={titleId}>
          {title}
          {showCount ? <span className={heroStyles.sidebarSectionCount}>{Number(count)}</span> : null}
        </span>
        {headerExtra ? <span className={styles.rightPaneCollapseHeaderEnd}>{headerExtra}</span> : null}
      </div>
      <div className={`${heroStyles.sidebarBody} ${styles.rightPaneSectionBody} ${bodyClassName}`.trim()}>
        {children}
      </div>
    </section>;
}
function RightPaneCollapsibleSection({
  sectionId,
  title,
  count = 0,
  titleAdornment = null,
  expanded,
  onToggle,
  headerExtra = null,
  sectionClassName = "",
  bodyClassName = "",
  children
}) {
  const showCount = Number(count) > 0;
  return <section className={`${heroStyles.sidebarSection} ${sectionClassName}`.trim()}>
      <button type="button" className={heroStyles.sidebarCollapseHeader} onClick={onToggle} aria-expanded={expanded} aria-controls={sectionId}>
        <span className={heroStyles.sidebarInfoTitle}>
          {title}
          {titleAdornment}
          {showCount ? <span className={heroStyles.sidebarSectionCount}>{Number(count)}</span> : null}
        </span>
        <span className={styles.rightPaneCollapseHeaderEnd}>
          {headerExtra}
          <Icon icon={expanded ? "mdi:chevron-up" : "mdi:chevron-down"} className={heroStyles.sidebarCollapseChevron} aria-hidden />
        </span>
      </button>
      {expanded ? <div className={`${heroStyles.sidebarBody} ${styles.rightPaneSectionBody} ${bodyClassName}`.trim()} id={sectionId}>
          {children}
        </div> : null}
    </section>;
}
export default function TicketDetailPage({
  onNavigate,
  ticketData,
  onTicketNavFamilyChange
}) {
  const {
    ticketId: urlTicketId
  } = useParams();
  const locale = useAppLocale();
  const copy = useMemo(() => getTicketDetailCopy(locale), [locale]);
  const validationCopy = useMemo(() => getTicketValidationCopy(locale), [locale]);
  const salesCopy = useMemo(() => getTicketSalesCreatePageCopy(locale), [locale]);
  const salesDetailCopy = useMemo(() => getTicketSalesDetailCopy(locale), [locale]);
  const vaultArchiveCopy = useMemo(() => getTicketVaultArchiveCopy(locale), [locale]);
  const satisfactionCriteria = useMemo(() => getTicketSatisfactionCriteria(locale), [locale]);
  const {
    user,
    userRole
  } = useAuthContext();
  const {
    can
  } = usePermissions();
  const {
    isCommunity,
    isPro
  } = useVeritasEdition();
  const {
    modules: contractModuleDefs
  } = useContractModuleOptions();
  const isAdmin = userRole === "admin";
  const canDeleteTicket = can("tickets_detail.delete");
  const canAiRunbook = can("tickets_detail.ai_runbook");
  const canMacro = can("tickets_detail.macro");
  const canExclude = can("tickets_detail.exclude");
  const canSplit = can("tickets_detail.split");
  const canEditMessages = can("tickets_detail.edit_messages");
  const canDeleteAttachments = can("tickets_detail.delete_attachments");
  const canAiSuggest = can("tickets_detail.ai_suggest");
  const canPublicReply = can("tickets_detail.public_reply");
  const canRequestValidation = can("tickets_detail.request_validation");
  const canResolve = can("tickets_detail.resolve");
  const canRandomMode = can("tickets.random_mode");
  const canHardPurge = isAdmin || can("tickets.manage");
  const canCreateContact = can("contacts.create");
  const canLinkRequesterEmail = can("contacts_detail.edit") || canCreateContact;
  const canViewPrestataires = can("prestataires.view");
  const ticketId = ticketData?.ticketId || ticketData?.id || urlTicketId;
  const [ticket, setTicket] = useState(null);
  const isSalesTicketDetail = useMemo(() => {
    if (ticketData?.fromPage === "TicketSales") return true;
    if (String(ticketData?.ticketFamily || "").toLowerCase() === "sales") return true;
    if (ticket && isSalesTicket(ticket)) return true;
    return false;
  }, [ticket, ticketData?.fromPage, ticketData?.ticketFamily]);
  const ticketsListDocType = isSalesTicketDetail ? "TicketSales" : "Ticket";
  const salesFormData = useMemo(() => ticket?.sales_form_data || ticket?.salesFormData || null, [ticket]);
  const supportFormData = useMemo(() => ticket?.support_form_data || ticket?.supportFormData || null, [ticket]);
  const [salesFormFieldLabelMap, setSalesFormFieldLabelMap] = useState({});
  const [salesFormFieldTypeMap, setSalesFormFieldTypeMap] = useState({});
  const [supportFormFieldLabelMap, setSupportFormFieldLabelMap] = useState({});
  const [supportFormFieldTypeMap, setSupportFormFieldTypeMap] = useState({});
  const salesPlanningEvent = useMemo(() => ticket?.planningEvent || ticket?.planning_event || null, [ticket]);
  const salesFormEntriesRaw = useMemo(() => buildSalesFormFieldEntries(salesFormData, salesFormFieldLabelMap), [salesFormData, salesFormFieldLabelMap]);
  const supportFormEntriesRaw = useMemo(() => buildSalesFormFieldEntries(supportFormData, supportFormFieldLabelMap), [supportFormData, supportFormFieldLabelMap]);
  useEffect(() => {
    if (!isSalesTicketDetail) {
      setSalesFormFieldLabelMap({});
      setSalesFormFieldTypeMap({});
      return undefined;
    }
    const formId = salesFormData?.formId;
    if (!formId) {
      setSalesFormFieldLabelMap({});
      setSalesFormFieldTypeMap({});
      return undefined;
    }
    let cancelled = false;
    const controller = createTrackedAbortController();
    fetchSalesForm(formId, {
      signal: controller.signal
    })
      .then(form => {
        if (!cancelled) {
          setSalesFormFieldLabelMap(buildSalesFormFieldLabelMap(form));
          setSalesFormFieldTypeMap(buildSalesFormFieldTypeMap(form));
        }
      })
      .catch(error => {
        if (error?.name === "AbortError" || cancelled) return;
        setSalesFormFieldLabelMap({});
        setSalesFormFieldTypeMap({});
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isSalesTicketDetail, salesFormData?.formId]);
  useEffect(() => {
    if (isSalesTicketDetail) {
      setSupportFormFieldLabelMap({});
      setSupportFormFieldTypeMap({});
      return undefined;
    }
    const formId = supportFormData?.formId;
    if (!formId) {
      setSupportFormFieldLabelMap({});
      setSupportFormFieldTypeMap({});
      return undefined;
    }
    let cancelled = false;
    const controller = createTrackedAbortController();
    fetchSupportForm(formId, {
      signal: controller.signal
    })
      .then(form => {
        if (!cancelled) {
          setSupportFormFieldLabelMap(buildSalesFormFieldLabelMap(form));
          setSupportFormFieldTypeMap(buildSalesFormFieldTypeMap(form));
        }
      })
      .catch(error => {
        if (error?.name === "AbortError" || cancelled) return;
        setSupportFormFieldLabelMap({});
        setSupportFormFieldTypeMap({});
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isSalesTicketDetail, supportFormData?.formId]);
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [contacts, setContacts] = useState([]);
  const salesFormEntries = useMemo(
    () =>
      enrichSalesFormLinkedEntries(salesFormEntriesRaw, {
        formData: salesFormData,
        typeMap: salesFormFieldTypeMap,
        contacts,
        clients,
        users
      }),
    [salesFormEntriesRaw, salesFormData, salesFormFieldTypeMap, contacts, clients, users]
  );
  const supportFormEntries = useMemo(
    () =>
      enrichSalesFormLinkedEntries(supportFormEntriesRaw, {
        formData: supportFormData,
        typeMap: supportFormFieldTypeMap,
        contacts,
        clients,
        users
      }),
    [supportFormEntriesRaw, supportFormData, supportFormFieldTypeMap, contacts, clients, users]
  );
  const [allTickets, setAllTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentDraft, setEditingCommentDraft] = useState("");
  const [editingCommentInternal, setEditingCommentInternal] = useState(false);
  const [editingCommentRemovedAttachmentKeys, setEditingCommentRemovedAttachmentKeys] = useState([]);
  const [savingCommentEdit, setSavingCommentEdit] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState(null);
  const [commentInternal, setCommentInternal] = useState(false);
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [imageLightbox, setImageLightbox] = useState(null);
  const [vaultOptionsByKey, setVaultOptionsByKey] = useState({});
  const [isDragOverReplyBox, setIsDragOverReplyBox] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [titleEditing, setTitleEditing] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [descriptionEditing, setDescriptionEditing] = useState(false);
  const [rightPaneView, setRightPaneView] = useState("context");
  const [aiFeatures, setAiFeatures] = useState({
    suggestReply: false,
    ticketRunbook: false,
    autoPriority: false
  });
  const [aiPriorityLoading, setAiPriorityLoading] = useState(false);
  const [aiPriorityHint, setAiPriorityHint] = useState("");
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);
  const [aiCorrectLoading, setAiCorrectLoading] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkModalText, setLinkModalText] = useState("");
  const linkSelectionRef = useRef({ range: null, text: "" });
  const titleInputRef = useRef(null);
  const descriptionTextareaRef = useRef(null);
  const [tagDraft, setTagDraft] = useState("");
  const [tagAddOpen, setTagAddOpen] = useState(false);
  const tagInputRef = useRef(null);
  const [watcherDraft, setWatcherDraft] = useState("");
  const [requesterSearch, setRequesterSearch] = useState("");
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [followerSearch, setFollowerSearch] = useState("");
  const [linkedTicketDraft, setLinkedTicketDraft] = useState("");
  const [linkedTicketSearch, setLinkedTicketSearch] = useState("");
  const [linkedEquipmentDraft, setLinkedEquipmentDraft] = useState("");
  const [linkedEquipmentSearch, setLinkedEquipmentSearch] = useState("");
  const [clientEquipments, setClientEquipments] = useState([]);
  const [linkedEquipments, setLinkedEquipments] = useState([]);
  const [macroSelection, setMacroSelection] = useState("");
  const [macroAttachmentModalOpen, setMacroAttachmentModalOpen] = useState(false);
  const [pendingMacroExecution, setPendingMacroExecution] = useState(null);
  const [macroAttachmentFiles, setMacroAttachmentFiles] = useState([]);
  const [commentTemplateSelection, setCommentTemplateSelection] = useState("");
  const [availableCommentTemplates, setAvailableCommentTemplates] = useState([]);
  const [availableMacros, setAvailableMacros] = useState([]);
  const [chatUiSettings, setChatUiSettings] = useState(DEFAULT_TICKET_CHAT_UI_SETTINGS);
  const [ticketNativeChannel, setTicketNativeChannel] = useState("web");
  const [rightPaneCollapse, setRightPaneCollapse] = useState(DEFAULT_RIGHT_PANE_COLLAPSE);
  const [refreshingHistory, setRefreshingHistory] = useState(false);
  const toggleRightPaneCollapse = useCallback(key => {
    setRightPaneCollapse(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }, []);
  const [linkedTicketsExpanded, setLinkedTicketsExpanded] = useState(false);
  const [linkedEquipmentsExpanded, setLinkedEquipmentsExpanded] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [ticketOptionsMenuOpen, setTicketOptionsMenuOpen] = useState(false);
  const [exclusionModalOpen, setExclusionModalOpen] = useState(false);
  const [savingExclusion, setSavingExclusion] = useState(false);
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [savingSplit, setSavingSplit] = useState(false);
  const [submittingStatus, setSubmittingStatus] = useState("");
  const [selectedSubmitAction, setSelectedSubmitAction] = useState("open");
  const [playMode, setPlayMode] = useState(() => isTicketPlayModeEnabled());
  const [loadingRandom, setLoadingRandom] = useState(false);
  const [ticketReminder, setTicketReminder] = useState(null);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [editingValidationRequest, setEditingValidationRequest] = useState(null);
  const [savingValidationRequest, setSavingValidationRequest] = useState(false);
  const [respondingValidationId, setRespondingValidationId] = useState(null);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolvePendingReply, setResolvePendingReply] = useState(false);
  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  const [savingResolve, setSavingResolve] = useState(false);
  const [reopeningTicket, setReopeningTicket] = useState(false);
  const [resolveCreditEnabled, setResolveCreditEnabled] = useState(false);
  const [resolveCreditAmounts, setResolveCreditAmounts] = useState({});
  const [proPromoFeature, setProPromoFeature] = useState(null);
  const [savingReminder, setSavingReminder] = useState(false);
  const [deletingReminder, setDeletingReminder] = useState(false);
  const [ticketDeleteConfirm, setTicketDeleteConfirm] = useState(null);
  const [deletingTicket, setDeletingTicket] = useState(false);
  const [slaNow, setSlaNow] = useState(() => Date.now());
  const [salesProgress, setSalesProgress] = useState(0);
  const [savingSalesProgress, setSavingSalesProgress] = useState(false);
  const [loadingClientCredits, setLoadingClientCredits] = useState(false);
  const [clientSupportCreditBalance, setClientSupportCreditBalance] = useState(null);
  const [clientSupportCreditPacks, setClientSupportCreditPacks] = useState([]);
  const [consumeSupportCredit, setConsumeSupportCredit] = useState(true);
  const [refundSupportCredit, setRefundSupportCredit] = useState(false);
  const [showSideConversationModal, setShowSideConversationModal] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactModalInitial, setContactModalInitial] = useState(null);
  const [linkRequesterEmailModalOpen, setLinkRequesterEmailModalOpen] = useState(false);
  const [orphanRequesterChoiceOpen, setOrphanRequesterChoiceOpen] = useState(false);
  const [sideConversation, setSideConversation] = useState({
    team: "commercial",
    subject: "",
    to: "",
    cc: "",
    message: ""
  });
  const [sideConversationPrestataires, setSideConversationPrestataires] = useState([]);
  const [loadingSideConversationPrestataires, setLoadingSideConversationPrestataires] = useState(false);
  const [sideConversationPrestataireId, setSideConversationPrestataireId] = useState("");
  const [sideConversationContactKey, setSideConversationContactKey] = useState("");
  const [sideConversations, setSideConversations] = useState([]);
  const [activeSideConversationId, setActiveSideConversationId] = useState(null);
  const [sideReplyDraft, setSideReplyDraft] = useState("");
  const commentEditorRef = useRef(null);
  const detailAbortRef = useRef(null);
  const resolveAfterReplyRef = useRef(false);
  const pendingResolveReplyRef = useRef(null);
  const commentEditEditorRef = useRef(null);
  const timelineRef = useRef(null);
  const [showTimelineScrollTop, setShowTimelineScrollTop] = useState(false);
  const ticketOptionsWrapRef = useRef(null);
  const ticketOptionsMenuRef = useRef(null);
  const [ticketOptionsMenuStyle, setTicketOptionsMenuStyle] = useState(null);
  const newSideConversationBtnRef = useRef(null);
  const sideConversationChipRefs = useRef({});
  const newSideConversationPopupRef = useRef(null);
  const activeSideConversationPopupRef = useRef(null);
  const [newSideConversationPopupStyle, setNewSideConversationPopupStyle] = useState(null);
  const [activeSideConversationPopupStyle, setActiveSideConversationPopupStyle] = useState(null);
  const [replyBoxExpanded, setReplyBoxExpanded] = useState(() => {
    try {
      const stored = localStorage.getItem(REPLY_BOX_EXPANDED_KEY);
      if (stored === "false") return false;
      if (stored === "true") return true;
    } catch (_) {}
    return false;
  });
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    status: "new",
    priority: "normal",
    type: "incident",
    category: "",
    channel: "web",
    clientId: "",
    assignedUserId: "",
    requesterContactId: ""
  });
  const [ticketCategories, setTicketCategories] = useState([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [showRequesterDropdown, setShowRequesterDropdown] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showFollowerDropdown, setShowFollowerDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showLinkedTicketDropdown, setShowLinkedTicketDropdown] = useState(false);
  const [showLinkedEquipmentDropdown, setShowLinkedEquipmentDropdown] = useState(false);
  const [requesterHighlight, setRequesterHighlight] = useState(0);
  const [assigneeHighlight, setAssigneeHighlight] = useState(0);
  const [followerHighlight, setFollowerHighlight] = useState(0);
  const [categoryHighlight, setCategoryHighlight] = useState(0);
  const [linkedTicketHighlight, setLinkedTicketHighlight] = useState(0);
  const [linkedEquipmentHighlight, setLinkedEquipmentHighlight] = useState(0);
  const [majorIncidentUpdating, setMajorIncidentUpdating] = useState(false);
  const requesterDropdownRef = useRef(null);
  const assigneeDropdownRef = useRef(null);
  const followerDropdownRef = useRef(null);
  const categoryDropdownRef = useRef(null);
  const linkedTicketDropdownRef = useRef(null);
  const linkedEquipmentDropdownRef = useRef(null);
  const normalizeAttachment = attachment => {
    if (!attachment) return null;
    const filePath = attachment.file_path || attachment.path || attachment.url || "";
    const normalizedUrl = toAbsoluteAttachmentUrl(filePath);
    return {
      id: attachment.id,
      name: attachment.file_name || attachment.filename || attachment.name || copy.attachmentDefault,
      filename: attachment.file_name || attachment.filename || attachment.name || copy.attachmentDefault,
      url: normalizedUrl,
      path: normalizedUrl,
      mime_type: attachment.mime_type || "",
      file_size: attachment.file_size || 0,
      comment_id: attachment.comment_id || null
    };
  };
  const hydrateTicketCommentsWithAttachments = ticketData => {
    const comments = Array.isArray(ticketData?.comments) ? ticketData.comments : [];
    const attachments = Array.isArray(ticketData?.attachments) ? ticketData.attachments : [];
    if (comments.length === 0) return {
      ...ticketData,
      comments
    };
    const byCommentId = new Map();
    attachments.forEach(raw => {
      const normalized = normalizeAttachment(raw);
      if (!normalized) return;
      const commentId = String(normalized.comment_id || "");
      if (!commentId) return;
      const bucket = byCommentId.get(commentId) || [];
      bucket.push(normalized);
      byCommentId.set(commentId, bucket);
    });
    return {
      ...ticketData,
      comments: comments.map(comment => {
        const fromComment = Array.isArray(comment.attachments) ? comment.attachments.map(normalizeAttachment).filter(Boolean) : [];
        const fromTopLevel = byCommentId.get(String(comment.id)) || [];
        return {
          ...comment,
          attachments: mergeCommentAttachments(fromComment, fromTopLevel)
        };
      })
    };
  };
  const loadTicketReminder = useCallback(async (id, signal) => {
    if (!id || isCommunity) {
      setTicketReminder(null);
      return;
    }
    try {
      const rows = await fetchEvents({
        ticketId: id,
        signal
      });
      if (signal?.aborted) return;
      setTicketReminder(Array.isArray(rows) && rows.length > 0 ? rows[0] : null);
    } catch (error) {
      if (error?.name === "AbortError") return;
      setTicketReminder(null);
    }
  }, [isCommunity]);
  useEffect(() => {
    onTicketNavFamilyChange?.(isSalesTicketDetail ? "sales" : ticketId ? "support" : null);
    return () => onTicketNavFamilyChange?.(null);
  }, [isSalesTicketDetail, ticketId, onTicketNavFamilyChange]);
  const loadDetail = async ({
    silent = false
  } = {}) => {
    if (!ticketId) return;
    detailAbortRef.current?.abort();
    const controller = createTrackedAbortController();
    detailAbortRef.current = controller;
    if (!silent) setLoading(true);
    try {
      const [ticketRes, usersRes, clientsRes, contactsRes, categoriesRes] = await Promise.all([fetchTicket(ticketId, {
        signal: controller.signal
      }), fetchActiveUsers({
        signal: controller.signal
      }).catch(error => error?.name === "AbortError" ? Promise.reject(error) : []), fetchClientsList({
        signal: controller.signal
      }).catch(error => error?.name === "AbortError" ? Promise.reject(error) : []), fetchContactsList(null, {
        signal: controller.signal
      }).catch(error => error?.name === "AbortError" ? Promise.reject(error) : []), fetchTicketCategories({
        signal: controller.signal
      }).catch(error => error?.name === "AbortError" ? Promise.reject(error) : [])]);
      const ticketsRes = await fetchTickets({
        limit: 200
      }, {
        signal: controller.signal
      }).catch(error => error?.name === "AbortError" ? Promise.reject(error) : []);
      if (controller.signal.aborted) return;
      setTicket(hydrateTicketCommentsWithAttachments(ticketRes));
      setSalesProgress(Math.max(0, Math.min(100, Math.round(Number(ticketRes?.progress_percent ?? ticketRes?.progressPercent ?? 0) || 0))));
      setTicketNativeChannel(ticketRes.channel || "web");
      setUsers(Array.isArray(usersRes) ? usersRes : []);
      setClients(Array.isArray(clientsRes) ? clientsRes : []);
      setContacts(Array.isArray(contactsRes) ? contactsRes : []);
      setTicketCategories(Array.isArray(categoriesRes) ? categoriesRes : []);
      setAllTickets(Array.isArray(ticketsRes) ? ticketsRes : []);
      await loadTicketReminder(ticketId, controller.signal);
      if (controller.signal.aborted) return;
      setEditForm({
        title: ticketRes.title || "",
        description: ticketRes.description || "",
        status: ticketRes.status === "open" ? "new" : ticketRes.status || "new",
        priority: ticketRes.priority || "normal",
        type: (() => {
          const raw = String(ticketRes.type || "").trim().toLowerCase();
          if (raw === "request") return "demande";
          if (raw === "prestation" || raw === "installation") return raw;
          return raw || "incident";
        })(),
        category: ticketRes.category || "",
        channel: ticketRes.channel || "web",
        clientId: ticketRes.client_id || "",
        assignedUserId: ticketRes.assigned_user_id || "",
        requesterContactId: ticketRes.requester_contact_id || ""
      });
      setTitleDraft(ticketRes.title || "");
    } catch (error) {
      if (error?.name === "AbortError" || controller.signal.aborted) return;
      toast.error(error.message || copy.toasts.loadTicketError);
      setTicket(null);
    } finally {
      if (!silent && !controller.signal.aborted) setLoading(false);
    }
  };
  useEffect(() => {
    setTitleEditing(false);
    setRightPaneView("context");
    setRightPaneCollapse(DEFAULT_RIGHT_PANE_COLLAPSE);
    setLinkedTicketsExpanded(false);
    setLinkedEquipmentsExpanded(false);
    setHistoryExpanded(false);
    loadDetail();
    return () => detailAbortRef.current?.abort();
  }, [ticketId]);
  useEffect(() => {
    if (tagAddOpen) {
      tagInputRef.current?.focus();
    }
  }, [tagAddOpen]);
  useEffect(() => {
    if (!titleEditing) return;
    const input = titleInputRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, [titleEditing]);
  useEffect(() => {
    if (!descriptionEditing || titleEditing) return;
    const textarea = descriptionTextareaRef.current;
    if (!textarea) return;
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, [descriptionEditing, titleEditing]);
  const prevReplyBoxExpandedRef = useRef(replyBoxExpanded);
  useLayoutEffect(() => {
    const wasExpanded = prevReplyBoxExpandedRef.current;
    prevReplyBoxExpandedRef.current = replyBoxExpanded;
    if (!replyBoxExpanded || wasExpanded) return;
    const editor = commentEditorRef.current;
    if (editor && commentDraft) {
      editor.innerHTML = commentDraft;
    }
  }, [replyBoxExpanded, commentDraft]);
  useEffect(() => {
    const handleClickOutside = e => {
      if (requesterDropdownRef.current && !requesterDropdownRef.current.contains(e.target)) {
        setShowRequesterDropdown(false);
      }
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(e.target)) {
        setShowAssigneeDropdown(false);
      }
      if (followerDropdownRef.current && !followerDropdownRef.current.contains(e.target)) {
        setShowFollowerDropdown(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target)) {
        setShowCategoryDropdown(false);
      }
      if (linkedTicketDropdownRef.current && !linkedTicketDropdownRef.current.contains(e.target)) {
        setShowLinkedTicketDropdown(false);
      }
      if (linkedEquipmentDropdownRef.current && !linkedEquipmentDropdownRef.current.contains(e.target)) {
        setShowLinkedEquipmentDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  useEffect(() => {
    setCategorySearch(editForm.category || "");
  }, [editForm.category]);
  useEffect(() => {
    const timer = window.setInterval(() => setSlaNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  const refreshTicketHistory = useCallback(async ({
    showSpinner = false
  } = {}) => {
    if (!ticketId) return;
    if (showSpinner) setRefreshingHistory(true);
    try {
      const ticketRes = await fetchTicket(ticketId);
      setTicket(prev => {
        if (!prev) return hydrateTicketCommentsWithAttachments(ticketRes);
        return {
          ...prev,
          activityHistory: Array.isArray(ticketRes.activityHistory) ? ticketRes.activityHistory : prev.activityHistory,
          statusHistory: Array.isArray(ticketRes.statusHistory) ? ticketRes.statusHistory : prev.statusHistory,
          comments: Array.isArray(ticketRes.comments) ? hydrateTicketCommentsWithAttachments(ticketRes).comments : prev.comments,
          deleted_at: ticketRes.deleted_at ?? prev.deleted_at,
          is_deleted: ticketRes.is_deleted ?? prev.is_deleted
        };
      });
    } catch (_) {
      // silent refresh — avoid toast spam on background sync
    } finally {
      if (showSpinner) setRefreshingHistory(false);
    }
  }, [ticketId]);
  const updateTicketLive = async (patch, {
    successMessage = ""
  } = {}) => {
    if (!ticketId) return;
    const ticketClosed = String(ticket?.status || "").toLowerCase() === "closed";
    const ticketDeleted = Boolean(ticket?.deleted_at || ticket?.is_deleted);
    if (ticketDeleted || ticketClosed) return;
    try {
      await updateTicket(ticketId, patch);
      setTicket(prev => {
        if (!prev) return prev;
        const next = {
          ...prev
        };
        if (Object.prototype.hasOwnProperty.call(patch, "assignedUserId")) {
          next.assigned_user_id = patch.assignedUserId;
        }
        if (Object.prototype.hasOwnProperty.call(patch, "requesterContactId")) {
          next.requester_contact_id = patch.requesterContactId;
        }
        if (Object.prototype.hasOwnProperty.call(patch, "requesterUserId")) {
          next.requester_user_id = patch.requesterUserId;
        }
        if (Object.prototype.hasOwnProperty.call(patch, "clientId")) {
          next.client_id = patch.clientId;
        }
        if (Object.prototype.hasOwnProperty.call(patch, "type")) {
          next.type = patch.type;
        }
        if (Object.prototype.hasOwnProperty.call(patch, "category")) {
          next.category = patch.category;
        }
        if (Object.prototype.hasOwnProperty.call(patch, "priority")) {
          next.priority = patch.priority;
        }
        if (Object.prototype.hasOwnProperty.call(patch, "status")) {
          next.status = patch.status === "new" ? "open" : patch.status;
        }
        if (Object.prototype.hasOwnProperty.call(patch, "channel")) {
          next.channel = patch.channel;
        }
        if (Object.prototype.hasOwnProperty.call(patch, "isMajorIncident")) {
          next.is_major_incident = patch.isMajorIncident;
        }
        if (Object.prototype.hasOwnProperty.call(patch, "title")) {
          next.title = patch.title;
        }
        if (Object.prototype.hasOwnProperty.call(patch, "description")) {
          next.description = patch.description;
        }
        return next;
      });
      if (successMessage) toast.success(successMessage);
      void refreshTicketHistory();
    } catch (error) {
      toast.error(error.message || copy.toasts.updateError);
    }
  };
  const handleMajorIncidentChange = async checked => {
    if (!ticketId || isReadOnly || majorIncidentUpdating) return;
    const previousMajor = Boolean(ticket?.is_major_incident);
    const previousPriority = editForm.priority;
    setTicket(prev => prev ? {
      ...prev,
      is_major_incident: checked
    } : prev);
    if (checked) {
      setEditForm(p => ({
        ...p,
        priority: "urgent"
      }));
    }
    setMajorIncidentUpdating(true);
    try {
      await updateTicket(ticketId, {
        isMajorIncident: checked,
        ...(checked ? {
          priority: "urgent"
        } : {})
      });
      setTicket(prev => {
        if (!prev) return prev;
        const next = {
          ...prev,
          is_major_incident: checked
        };
        if (checked) next.priority = "urgent";
        return next;
      });
      toast.success(checked ? copy.toasts.majorIncidentEnabled : copy.toasts.majorIncidentDisabled);
    } catch (error) {
      setTicket(prev => prev ? {
        ...prev,
        is_major_incident: previousMajor
      } : prev);
      setEditForm(p => ({
        ...p,
        priority: previousPriority
      }));
      toast.error(error.message || copy.toasts.updateError);
    } finally {
      setMajorIncidentUpdating(false);
    }
  };
  const resetVaultArchiveOptions = useCallback(() => {
    setVaultOptionsByKey({});
  }, []);

  const patchVaultFileOptions = useCallback((fileKey, patch) => {
    setVaultOptionsByKey(prev => ({
      ...prev,
      [fileKey]: {
        ...createDefaultVaultFileOptions(),
        ...(prev?.[fileKey] || {}),
        ...patch
      }
    }));
  }, []);

  const maybeArchiveAttachmentsToVault = useCallback(
    async (entries = []) => {
      if (!isPro || !Array.isArray(entries) || entries.length === 0) return;
      const clientId = ticket?.client_id || ticket?.clientId || null;
      if (!clientId) {
        toast.error(vaultArchiveCopy.noClient);
        return;
      }
      const clientName = ticket?.client_name || ticket?.client_nom || "";
      try {
        const result = await archiveTicketFilesToVault({
          entries,
          clientId,
          clientName
        });
        if (result.skipped > 0) toast.info(vaultArchiveCopy.formatSkipped(result.skipped));
        if (result.ok > 0 && result.failed === 0) {
          const anyVisible = entries.some(entry => entry.visibleToClient);
          const anyInternal = entries.some(entry => !entry.visibleToClient);
          if (anyVisible && !anyInternal) toast.success(vaultArchiveCopy.toast.archivedVisible);
          else if (!anyVisible && anyInternal) toast.success(vaultArchiveCopy.toast.archivedInternal);
          else toast.success(vaultArchiveCopy.toast.archived);
        } else if (result.ok > 0 && result.failed > 0) {
          toast.warning(vaultArchiveCopy.formatPartial(result.ok, result.failed));
        } else if (result.failed > 0) {
          toast.error(vaultArchiveCopy.toast.error);
        }
      } catch (error) {
        toast.error(error.message || vaultArchiveCopy.toast.error);
      }
    },
    [isPro, ticket, vaultArchiveCopy]
  );

  const submitComment = async () => {
    const draftContentRaw = String(commentDraft || "").trim();
    const extracted = extractInlineDataImagesFromHtml(draftContentRaw);
    const draftFiles = mergeAttachmentFiles(attachmentFiles, extracted.files);
    const draftContentText = htmlToPlainText(extracted.html);
    if (!ticketId || !draftContentText && draftFiles.length === 0) return;
    const draftContent = resolveTemplateVariables(extracted.html);
    const draftInternal = commentInternal;
    const vaultEntries = isPro ? collectVaultArchiveEntries(draftFiles, vaultOptionsByKey) : [];
    try {
      copy.validateAttachmentFiles(draftFiles);
      let createdComment = null;
      if (draftFiles.length > 0) {
        createdComment = await addTicketCommentWithAttachments(ticketId, {
          content: draftContent,
          isInternal: commentInternal,
          files: draftFiles
        });
      } else {
        createdComment = await addTicketComment(ticketId, draftContent, draftInternal);
      }
      setTicket(prev => {
        if (!prev) return prev;
        const nextComment = {
          id: createdComment?.id || `local-${Date.now()}`,
          author_name: createdComment?.author_name || currentUserDisplayName,
          author_user_id: createdComment?.author_user_id || currentUserId || null,
          content: createdComment?.content || draftContent,
          is_internal: typeof createdComment?.is_internal === "boolean" ? createdComment.is_internal : draftInternal,
          created_at: createdComment?.created_at || new Date().toISOString(),
          attachments: Array.isArray(createdComment?.attachments) && createdComment.attachments.length > 0 ? createdComment.attachments.map(normalizeAttachment).filter(Boolean) : draftFiles.map((f, idx) => ({
            id: `${Date.now()}-${idx}`,
            name: f.name,
            filename: f.name,
            url: "",
            path: ""
          }))
        };
        return {
          ...prev,
          comments: [...(prev.comments || []), nextComment],
          updated_at: new Date().toISOString()
        };
      });
      setCommentDraft("");
      if (commentEditorRef.current) commentEditorRef.current.innerHTML = "";
      setCommentInternal(false);
      setAttachmentFiles([]);
      resetVaultArchiveOptions();
      toast.success(copy.toasts.replySent);
      emitNotificationsUpdated();
      notifyWhatsAppDelivery(createdComment?.whatsappDelivery, copy);
      if (vaultEntries.length > 0) {
        await maybeArchiveAttachmentsToVault(vaultEntries);
      }
    } catch (error) {
      toast.error(error.message || copy.toasts.commentAddError);
    }
  };
  const supportCredit = ticket?.supportCredit || null;
  const normalizedTicketStatus = ticket?.status === "open" ? "new" : ticket?.status;
  const isDeleted = Boolean(ticket?.deleted_at || ticket?.is_deleted);
  const resolutionValidation = ticket?.resolutionValidation || null;
  const canResolveWithValidation = !isDeleted && !["closed", "resolved"].includes(String(normalizedTicketStatus || "")) && !resolutionValidation?.isPending;
  const showConsumeCreditOption = supportCredit?.eligible && !supportCredit?.consumed && selectedSubmitAction === "solved" && !canResolveWithValidation;
  const showRefundCreditOption = supportCredit?.eligible && supportCredit?.consumed && ["resolved", "closed"].includes(String(normalizedTicketStatus || "")) && selectedSubmitAction !== "solved";
  const applyStatusWithFallback = async (targetStatus, creditOptions = {}) => {
    if (targetStatus === "open") return;
    const statusMap = {
      pending: "in_progress",
      on_hold: "pending",
      solved: "resolved"
    };
    const mappedStatus = statusMap[targetStatus] || targetStatus;
    await updateTicketStatus(ticketId, mappedStatus, "", creditOptions);
    void refreshTicketHistory();
  };
  const submitConversationUpdate = async targetStatus => {
    if (!ticketId) return;
    const draftContentRaw = String(commentDraft || "").trim();
    const extracted = extractInlineDataImagesFromHtml(draftContentRaw);
    const draftFiles = mergeAttachmentFiles(attachmentFiles, extracted.files);
    const draftContentText = htmlToPlainText(extracted.html);
    if (!draftContentText && draftFiles.length === 0) {
      toast.error(copy.toasts.submitNeedMessage);
      return false;
    }
    setSubmittingStatus(targetStatus);
    const draftInternal = commentInternal;
    try {
      copy.validateAttachmentFiles(draftFiles);
      const vaultEntries = isPro ? collectVaultArchiveEntries(draftFiles, vaultOptionsByKey) : [];
      let commentResult = null;
      if (draftFiles.length > 0) {
        commentResult = await addTicketCommentWithAttachments(ticketId, {
          content: resolveTemplateVariables(extracted.html),
          isInternal: commentInternal,
          files: draftFiles
        });
      } else {
        commentResult = await addTicketComment(ticketId, resolveTemplateVariables(extracted.html), commentInternal);
      }
      notifyWhatsAppDelivery(commentResult?.whatsappDelivery, copy);
      const creditOptions = {};
      if (targetStatus === "solved" && supportCredit?.eligible && consumeSupportCredit) {
        const defaultAmounts = buildDefaultResolveCreditAmounts(supportCredit?.packs || [], {
          defaultAmount: 1,
          legacyBalance: supportCredit?.balance ?? 0
        });
        const debits = buildSupportCreditDebitsPayload(defaultAmounts, supportCredit?.packs);
        if (debits.length > 0) {
          creditOptions.consumeSupportCredit = true;
          creditOptions.supportCreditDebits = debits;
        }
      }
      if (showRefundCreditOption && refundSupportCredit) {
        creditOptions.refundSupportCredit = true;
      }
      await applyStatusWithFallback(targetStatus, creditOptions);
      setCommentDraft("");
      if (commentEditorRef.current) commentEditorRef.current.innerHTML = "";
      setCommentInternal(false);
      setAttachmentFiles([]);
      resetVaultArchiveOptions();
      toast.success(copy.toasts.messageSentStatusUpdated);
      if (vaultEntries.length > 0) {
        await maybeArchiveAttachmentsToVault(vaultEntries);
      }
      await loadDetail();
      if (!draftInternal) {
        await advanceToNextRandomTicket(onNavigate, ticketId);
        setPlayMode(isTicketPlayModeEnabled());
      }
      return true;
    } catch (error) {
      toast.error(error.message || copy.toasts.submitError);
      return false;
    } finally {
      setSubmittingStatus("");
    }
  };
  const openResolveModalFlow = useCallback(() => {
    const draftContentRaw = String(commentDraft || "").trim();
    const draftContentText = htmlToPlainText(draftContentRaw);
    const hasDraft = Boolean(draftContentText) || attachmentFiles.length > 0;
    if (hasDraft) {
      try {
        copy.validateAttachmentFiles(attachmentFiles);
      } catch (error) {
        toast.error(error.message || copy.attachmentInvalid);
        return;
      }
      pendingResolveReplyRef.current = {
        content: draftContentRaw,
        internal: commentInternal,
        files: [...attachmentFiles],
        vaultArchiveEntries: isPro ? collectVaultArchiveEntries(attachmentFiles, vaultOptionsByKey) : []
      };
      resolveAfterReplyRef.current = !commentInternal;
      setResolvePendingReply(true);
    } else {
      pendingResolveReplyRef.current = null;
      resolveAfterReplyRef.current = false;
      setResolvePendingReply(false);
    }
    setResolveModalOpen(true);
  }, [attachmentFiles, commentDraft, commentInternal, copy, supportCredit?.balance, supportCredit?.consumed, supportCredit?.eligible, vaultOptionsByKey, isPro]);
  const availableSubmitActions = useMemo(
    () => (Array.isArray(copy.submitActions) ? copy.submitActions : []).filter(action => action.id !== "solved" || canResolve),
    [copy.submitActions, canResolve]
  );
  useEffect(() => {
    if (!canPublicReply && !commentInternal) {
      setCommentInternal(true);
    }
  }, [canPublicReply, commentInternal]);
  useEffect(() => {
    if (!canResolve && selectedSubmitAction === "solved") {
      setSelectedSubmitAction(availableSubmitActions[0]?.id || "open");
    }
  }, [canResolve, selectedSubmitAction, availableSubmitActions]);
  const handleFooterSubmit = async () => {
    if (submittingStatus) return;
    if (selectedSubmitAction === "solved" && !canResolve) return;
    if (selectedSubmitAction === "solved" && canResolveWithValidation) {
      openResolveModalFlow();
      return;
    }
    await submitConversationUpdate(selectedSubmitAction);
  };
  const handleRandomTicketClick = async event => {
    if (event.shiftKey) {
      setTicketPlayModeEnabled(false);
      setPlayMode(false);
      toast.info(copy.toasts.playModeDisabled);
      return;
    }
    setLoadingRandom(true);
    try {
      setPlayMode(true);
      await navigateToRandomTicket(onNavigate, {
        enablePlayMode: true,
        excludeTicketId: ticketId
      });
    } catch {
      setPlayMode(isTicketPlayModeEnabled());
    } finally {
      setLoadingRandom(false);
    }
  };
  const runEditorCommand = (command, value = null) => {
    if (!commentEditorRef.current) return;
    commentEditorRef.current.focus();
    document.execCommand(command, false, value);
    setCommentDraft(commentEditorRef.current.innerHTML || "");
  };
  const mergeAttachmentFiles = (currentFiles = [], nextFiles = []) => {
    const merged = [...currentFiles];
    const existingKeys = new Set(currentFiles.map(file => `${file.name}-${file.size}-${file.lastModified || 0}`));
    nextFiles.forEach(file => {
      const key = `${file.name}-${file.size}-${file.lastModified || 0}`;
      if (!existingKeys.has(key)) {
        existingKeys.add(key);
        merged.push(file);
      }
    });
    return merged;
  };
  const applySelectedAttachments = (selectedFiles = []) => {
    copy.validateAttachmentFiles(selectedFiles);
    setAttachmentFiles(prev => {
      const merged = mergeAttachmentFiles(prev, selectedFiles);
      setVaultOptionsByKey(opts => {
        const next = { ...opts };
        merged.forEach(file => {
          const key = getAttachmentFileKey(file);
          if (!next[key]) next[key] = createDefaultVaultFileOptions();
        });
        return next;
      });
      return merged;
    });
  };
  const removeAttachmentFile = fileKey => {
    setAttachmentFiles(prev => prev.filter(file => getAttachmentFileKey(file) !== fileKey));
    setVaultOptionsByKey(prev => {
      if (!prev?.[fileKey]) return prev;
      const next = { ...prev };
      delete next[fileKey];
      return next;
    });
  };
  const applySelectedMacroAttachments = (selectedFiles = []) => {
    copy.validateAttachmentFiles(selectedFiles);
    setMacroAttachmentFiles(prev => mergeAttachmentFiles(prev, selectedFiles));
  };
  const handleReplyDragOver = event => {
    event.preventDefault();
    if (isReadOnly) return;
    if (!isDragOverReplyBox) setIsDragOverReplyBox(true);
  };
  const handleReplyDragLeave = event => {
    event.preventDefault();
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDragOverReplyBox(false);
    }
  };
  const handleReplyDrop = event => {
    event.preventDefault();
    setIsDragOverReplyBox(false);
    if (isReadOnly) return;
    const droppedFiles = Array.from(event.dataTransfer?.files || []);
    if (droppedFiles.length === 0) return;
    try {
      if (!replyBoxExpanded) {
        setReplyBoxExpanded(true);
        try {
          localStorage.setItem(REPLY_BOX_EXPANDED_KEY, "true");
        } catch (_) {}
      }
      applySelectedAttachments(droppedFiles);
    } catch (error) {
      toast.error(error.message || copy.attachmentInvalid);
    }
  };
  const handleEditorPaste = event => {
    if (isReadOnly) return;
    const imageFiles = extractClipboardImageFiles(event.clipboardData);
    if (imageFiles.length === 0) return;
    event.preventDefault();
    try {
      if (!replyBoxExpanded) {
        setReplyBoxExpanded(true);
        try {
          localStorage.setItem(REPLY_BOX_EXPANDED_KEY, "true");
        } catch (_) {}
      }
      void (async () => {
        const loaded = await Promise.all(
          imageFiles.map(
            file =>
              new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve({ dataUrl: reader.result, name: file.name });
                reader.onerror = () => reject(new Error(copy.attachmentInvalid || "Invalid image"));
                reader.readAsDataURL(file);
              })
          )
        );
        const editor = commentEditorRef.current;
        if (!editor) {
          applySelectedAttachments(imageFiles);
          return;
        }
        editor.focus();
        loaded.forEach(({ dataUrl, name }) => {
          if (typeof dataUrl !== "string" || !dataUrl) return;
          const safeAlt = String(name || "image").replace(/"/g, "");
          document.execCommand("insertHTML", false, `<img src="${dataUrl}" alt="${safeAlt}">`);
        });
        setCommentDraft(editor.innerHTML || "");
      })().catch(error => {
        toast.error(error.message || copy.attachmentInvalid);
      });
    } catch (error) {
      toast.error(error.message || copy.attachmentInvalid);
    }
  };
  const openImageLightbox = useCallback((url, alt = "") => {
    if (!url) return;
    setImageLightbox({ url, alt: alt || "" });
  }, []);
  const closeImageLightbox = useCallback(() => setImageLightbox(null), []);
  const handleInlineImageClick = useCallback(
    event => {
      const img = event.target?.closest?.("img");
      if (!img || !event.currentTarget?.contains?.(img)) return;
      if (event.target.closest("a, button")) return;
      const src = img.currentSrc || img.getAttribute("src") || "";
      if (!src) return;
      event.preventDefault();
      openImageLightbox(src, img.getAttribute("alt") || "");
    },
    [openImageLightbox]
  );
  const toggleReplyBoxExpanded = useCallback(() => {
    setReplyBoxExpanded(prev => {
      const next = !prev;
      try {
        localStorage.setItem(REPLY_BOX_EXPANDED_KEY, String(next));
      } catch (_) {}
      if (next) {
        requestAnimationFrame(() => commentEditorRef.current?.focus());
      }
      return next;
    });
  }, []);
  const expandReplyBox = useCallback(() => {
    setReplyBoxExpanded(true);
    try {
      localStorage.setItem(REPLY_BOX_EXPANDED_KEY, "true");
    } catch (_) {}
    requestAnimationFrame(() => commentEditorRef.current?.focus());
  }, []);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await fetchAiStatus();
        if (cancelled) return;
        const configured = Boolean(status?.configured);
        setAiFeatures({
          suggestReply: configured && status?.features?.suggestReply !== false,
          ticketRunbook: configured && status?.features?.ticketRunbook !== false,
          autoPriority: configured && status?.features?.autoPriority !== false
        });
      } catch {
        if (!cancelled) {
          setAiFeatures({
            suggestReply: false,
            ticketRunbook: false,
            autoPriority: false
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if ((!aiFeatures.ticketRunbook || !canAiRunbook) && rightPaneView === "runbook") {
      setRightPaneView("context");
    }
  }, [aiFeatures.ticketRunbook, canAiRunbook, rightPaneView]);
  const handleAiRunbookChange = useCallback(nextRunbook => {
    setTicket(prev => prev ? {
      ...prev,
      ai_runbook: nextRunbook
    } : prev);
  }, []);
  const insertBold = () => {
    runEditorCommand("bold");
  };
  const insertBulletList = () => {
    runEditorCommand("insertUnorderedList");
  };
  const insertLink = () => {
    const captured = captureEditorSelection(commentEditorRef.current);
    linkSelectionRef.current = captured;
    setLinkModalText(captured.text);
    setLinkModalOpen(true);
  };
  const handleInsertLink = ({ url, text }) => {
    restoreEditorSelection(commentEditorRef.current, linkSelectionRef.current.range);
    insertLinkHtml(commentEditorRef.current, url, text || linkSelectionRef.current.text);
    if (commentEditorRef.current) setCommentDraft(commentEditorRef.current.innerHTML || "");
    setLinkModalOpen(false);
  };
  const insertEmoji = (emoji = "😊") => {
    runEditorCommand("insertText", `${emoji}`);
  };
  const applyCommentTemplate = templateId => {
    setCommentTemplateSelection(templateId);
    if (!templateId) return;
    const template = availableCommentTemplates.find(row => String(row.id) === String(templateId));
    if (!template) return;
    const resolvedContent = resolveTemplateVariables(String(template.content || ""));
    setCommentDraft(resolvedContent);
    requestAnimationFrame(() => {
      if (!commentEditorRef.current) return;
      commentEditorRef.current.innerHTML = resolvedContent;
      commentEditorRef.current.focus();
    });
    toast.success(copy.formatTemplateApplied(template.name));
  };
  const addTag = async (labelOverride, colorOverride) => {
    const label = String(labelOverride ?? tagDraft).trim();
    if (!ticketId || !label) return;
    try {
      const createdTag = await addTicketTag(ticketId, label, colorOverride || undefined);
      setTicket(prev => {
        if (!prev) return prev;
        const existing = prev.tags || [];
        const alreadyExists = existing.some(tag => String(tag.id) === String(createdTag?.id) || String(tag.label || "").toLowerCase() === String(createdTag?.label || "").toLowerCase());
        if (alreadyExists) return prev;
        return {
          ...prev,
          tags: [...existing, createdTag]
        };
      });
      setTagDraft("");
      setTagAddOpen(false);
      toast.success(copy.toasts.tagAdded);
      void refreshTicketHistory();
    } catch (error) {
      toast.error(error.message || copy.toasts.tagAddError);
    }
  };
  const handleAddTagSubmit = async event => {
    event.preventDefault();
    await addTag();
  };
  const removeTag = async tagId => {
    if (!ticketId || !tagId) return;
    try {
      await removeTicketTag(ticketId, tagId);
      setTicket(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          tags: (prev.tags || []).filter(tag => String(tag.id) !== String(tagId))
        };
      });
      toast.success(copy.toasts.tagRemoved);
      void refreshTicketHistory();
    } catch (error) {
      toast.error(error.message || copy.toasts.tagRemoveError);
    }
  };
  const addWatcher = async (userIdParam = watcherDraft) => {
    const targetUserId = userIdParam || watcherDraft;
    if (!ticketId || !targetUserId) return;
    const alreadyFollower = (ticket?.watchers || []).some(w => String(w.user_id) === String(targetUserId));
    if (alreadyFollower) {
      setFollowerSearch("");
      setWatcherDraft("");
      return;
    }
    try {
      await addTicketWatcher(ticketId, targetUserId);
      setTicket(prev => {
        if (!prev) return prev;
        const existing = prev.watchers || [];
        const alreadyExistsAfter = existing.some(w => String(w.user_id) === String(targetUserId));
        if (alreadyExistsAfter) return prev;
        return {
          ...prev,
          watchers: [...existing, {
            ticket_id: ticketId,
            user_id: targetUserId,
            created_at: new Date().toISOString()
          }]
        };
      });
      setWatcherDraft("");
      setFollowerSearch("");
      setShowFollowerDropdown(false);
      toast.success(copy.toasts.followerAdded);
      void refreshTicketHistory();
    } catch (error) {
      toast.error(error.message || copy.toasts.followerAddError);
    }
  };
  const removeWatcher = async userId => {
    if (!ticketId || !userId) return;
    try {
      await removeTicketWatcher(ticketId, userId);
      setTicket(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          watchers: (prev.watchers || []).filter(w => String(w.user_id) !== String(userId))
        };
      });
      toast.success(copy.toasts.followerRemoved);
      void refreshTicketHistory();
    } catch (error) {
      toast.error(error.message || copy.toasts.followerRemoveError);
    }
  };
  const addAssignee = async userId => {
    if (!ticketId || !userId) return;
    const alreadyAssigned = assigneeUserIds.some(id => String(id) === String(userId));
    if (alreadyAssigned) {
      setAssigneeSearch("");
      return;
    }
    try {
      await addTicketAssignee(ticketId, userId);
      setTicket(prev => {
        if (!prev) return prev;
        const currentAssignees = Array.isArray(prev.assignees) ? prev.assignees : [];
        return {
          ...prev,
          assigned_user_id: userId,
          assignees: [...currentAssignees, {
            ticket_id: ticketId,
            user_id: userId,
            created_at: new Date().toISOString()
          }]
        };
      });
      setEditForm(prev => ({
        ...prev,
        assignedUserId: userId
      }));
      setAssigneeSearch("");
      setShowAssigneeDropdown(false);
      toast.success(copy.toasts.assigneeAdded);
      void refreshTicketHistory();
    } catch (error) {
      toast.error(error.message || copy.toasts.assigneeAddError);
    }
  };
  const removeAssignee = async userId => {
    if (!ticketId || !userId) return;
    try {
      await removeTicketAssignee(ticketId, userId);
      setTicket(prev => {
        if (!prev) return prev;
        const currentAssignees = Array.isArray(prev.assignees) ? prev.assignees : [];
        const nextAssignees = currentAssignees.filter(a => String(a.user_id) !== String(userId));
        const fallbackAssignedUserId = nextAssignees.length > 0 ? nextAssignees[nextAssignees.length - 1].user_id : null;
        return {
          ...prev,
          assigned_user_id: fallbackAssignedUserId,
          assignees: nextAssignees
        };
      });
      setEditForm(prev => ({
        ...prev,
        assignedUserId: String(prev.assignedUserId) === String(userId) ? "" : prev.assignedUserId
      }));
      toast.success(copy.toasts.assigneeRemoved);
      void refreshTicketHistory();
    } catch (error) {
      toast.error(error.message || copy.toasts.assigneeRemoveError);
    }
  };
  const commitTitleChange = async () => {
    const nextTitle = String(titleDraft || "").trim();
    if (!nextTitle) {
      setTitleDraft(editForm.title || "");
      toast.error(copy.toasts.titleRequired);
      return;
    }
    if (nextTitle === (editForm.title || "")) return;
    setEditForm(prev => ({
      ...prev,
      title: nextTitle
    }));
    await updateTicketLive({
      title: nextTitle
    }, {
      successMessage: copy.toasts.titleUpdated
    });
  };
  const commitDescriptionChange = async () => {
    const nextDescription = String(descriptionDraft || "").trim();
    if (nextDescription === String(editForm.description || "").trim()) return;
    setEditForm(prev => ({
      ...prev,
      description: nextDescription
    }));
    await updateTicketLive({
      description: nextDescription
    }, {
      successMessage: copy.toasts.descriptionUpdated
    });
  };
  const initialRequestEditing = titleEditing || descriptionEditing;
  const startInitialRequestEdit = () => {
    if (isReadOnly) return;
    setTitleDraft(editForm.title || ticket?.title || "");
    setDescriptionDraft(editForm.description || ticket?.description || "");
    setTitleEditing(true);
    setDescriptionEditing(true);
  };
  const cancelInitialRequestEdit = () => {
    setTitleDraft(editForm.title || ticket?.title || "");
    setDescriptionDraft(editForm.description || ticket?.description || "");
    setTitleEditing(false);
    setDescriptionEditing(false);
  };
  const saveInitialRequestEdit = async () => {
    const nextTitle = String(titleDraft || "").trim();
    if (!nextTitle) {
      setTitleDraft(editForm.title || "");
      toast.error(copy.toasts.titleRequired);
      return;
    }
    await commitTitleChange();
    await commitDescriptionChange();
    setTitleEditing(false);
    setDescriptionEditing(false);
  };
  const addLinked = async explicitTicketId => {
    const targetId = explicitTicketId != null ? String(explicitTicketId) : linkedTicketDraft;
    if (!ticketId || !targetId) return;
    const selected = availableLinkTargets.find(row => String(row.id) === String(targetId));
    if (!selected) {
      toast.error(copy.toasts.selectValidTicket);
      return;
    }
    const safeTitle = String(selected.title || "Linked ticket").replace(/[\\\]]/g, "");
    const safeNumber = String(selected.ticket_number || selected.id || "").replace(/[\\\]]/g, "");
    const marker = `[Linked ticket] [event:added] [linked_ticket_id:${selected.id}] ` + `[ticket_number:${safeNumber}] [title:${safeTitle}]`;
    try {
      const createdComment = await addTicketComment(ticketId, marker, true);
      setTicket(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          comments: [...(prev.comments || []), createdComment],
          updated_at: new Date().toISOString()
        };
      });
      setLinkedTicketDraft("");
      setLinkedTicketSearch("");
      toast.success(copy.toasts.ticketLinked);
    } catch (error) {
      toast.error(error.message || copy.toasts.ticketLinkError);
    }
  };
  const removeLinked = async linkedTicketId => {
    if (!ticketId || !linkedTicketId) return;
    const marker = `[Linked ticket] [event:removed] [linked_ticket_id:${linkedTicketId}]`;
    try {
      const createdComment = await addTicketComment(ticketId, marker, true);
      setTicket(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          comments: [...(prev.comments || []), createdComment],
          updated_at: new Date().toISOString()
        };
      });
      toast.success(copy.toasts.ticketUnlinked);
    } catch (error) {
      toast.error(error.message || copy.toasts.ticketUnlinkError);
    }
  };
  const addLinkedEquipment = async explicitEquipmentId => {
    const targetId = explicitEquipmentId != null ? String(explicitEquipmentId) : linkedEquipmentDraft;
    if (!ticketId || !targetId) return;
    const selected = clientEquipments.find(eq => String(eq.id) === String(targetId));
    if (!selected) {
      toast.error(copy.toasts.selectValidEquipment);
      return;
    }
    const safeName = String(selected.name || selected.model || `Hardware ${selected.id}`).replace(/[\\\]]/g, "");
    const safeType = String(selected.type || "").replace(/[\\\]]/g, "");
    const safeClientId = String(ticket?.client_id || "").replace(/[\\\]]/g, "");
    const safeWarranty = String(selected.warranty || "").replace(/[\\\]]/g, "");
    const licensesText = Array.isArray(selected.licenses) ? selected.licenses.join(", ") : String(selected.licenses || "");
    const safeLicenses = encodeURIComponent(String(licensesText || "").replace(/[\\\]]/g, ""));
    const safeSerial = String(selected.serial || "").replace(/[\\\]]/g, "");
    const safeBrand = String(selected.manufacturer || selected.brand || "").replace(/[\\\]]/g, "");
    const safeModel = String(selected.model || "").replace(/[\\\]]/g, "");
    const marker = `[Linked equipment] [event:added] [equipment_id:${selected.id}] [name:${safeName}] [type:${safeType}] ` + `[client_id:${safeClientId}] [warranty:${safeWarranty}] [licenses:${safeLicenses}] [serial:${safeSerial}] [brand:${safeBrand}] [model:${safeModel}]`;
    try {
      const createdComment = await addTicketComment(ticketId, marker, true);
      setTicket(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          comments: [...(prev.comments || []), createdComment],
          updated_at: new Date().toISOString()
        };
      });
      setLinkedEquipments(prev => {
        if (prev.some(row => String(row.equipment_id) === String(selected.id))) return prev;
        return [...prev, {
          equipment_id: selected.id,
          name: selected.name || selected.model || `Hardware ${selected.id}`,
          type: selected.type || "",
          client_id: ticket?.client_id || "",
          warranty: selected.warranty || "",
          licenses: licensesText || "",
          serial: selected.serial || "",
          brand: selected.manufacturer || selected.brand || "",
          model: selected.model || "",
          source: "veritas"
        }].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "fr"));
      });
      setLinkedEquipmentDraft("");
      setLinkedEquipmentSearch("");
      setShowLinkedEquipmentDropdown(false);
      toast.success(copy.toasts.equipmentLinked);
    } catch (error) {
      toast.error(error.message || copy.toasts.equipmentLinkError);
    }
  };
  const removeLinkedEquipment = async equipmentId => {
    if (!ticketId || !equipmentId) return;
    const row = linkedEquipments.find(item => String(item.equipment_id) === String(equipmentId));
    const safeName = String(row?.name || "Hardware").replace(/[\\\]]/g, "");
    const safeType = String(row?.type || "").replace(/[\\\]]/g, "");
    const safeClientId = String(row?.client_id || ticket?.client_id || "").replace(/[\\\]]/g, "");
    const marker = `[Linked equipment] [event:removed] [equipment_id:${equipmentId}] [name:${safeName}] [type:${safeType}] [client_id:${safeClientId}]`;
    try {
      const createdComment = await addTicketComment(ticketId, marker, true);
      setTicket(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          comments: [...(prev.comments || []), createdComment],
          updated_at: new Date().toISOString()
        };
      });
      setLinkedEquipments(prev => prev.filter(item => String(item.equipment_id) !== String(equipmentId)));
      toast.success(copy.toasts.equipmentUnlinked);
    } catch (error) {
      toast.error(error.message || copy.toasts.equipmentUnlinkError);
    }
  };
  const softDeleteCurrentTicket = () => {
    setTicketDeleteConfirm("soft");
  };
  const restoreCurrentTicket = async () => {
    if (!ticketId) return;
    try {
      await restoreTicket(ticketId);
      toast.success(copy.toasts.restored);
      await loadDetail();
    } catch (error) {
      toast.error(error.message || copy.toasts.restoreError);
    }
  };
  const permanentlyDeleteCurrentTicket = () => {
    if (!canHardPurge) {
      toast.error(copy.toasts.adminOnlyPermanentDelete);
      return;
    }
    setTicketDeleteConfirm("permanent");
  };
  const closeDeleteConfirm = () => {
    if (deletingTicket) return;
    setTicketDeleteConfirm(null);
  };
  const confirmDeleteTicket = async () => {
    if (!ticketId || !ticketDeleteConfirm) return;
    const deleteMode = ticketDeleteConfirm;
    setDeletingTicket(true);
    try {
      if (deleteMode === "soft") {
        await deleteTicket(ticketId);
        toast.success(copy.toasts.movedToTrash);
      } else {
        await permanentlyDeleteTicket(ticketId);
        toast.success(copy.toasts.permanentlyDeleted);
      }
      setTicketDeleteConfirm(null);
      onNavigate?.(
        ticketsListDocType,
        deleteMode === "soft" ? { viewMode: "trash" } : null
      );
    } catch (error) {
      toast.error(error.message || (ticketDeleteConfirm === "soft" ? copy.toasts.deleteError : copy.toasts.permanentDeleteError));
    } finally {
      setDeletingTicket(false);
    }
  };
  const openEmailTemplate = (to, cc, subject, body) => {
    const params = new URLSearchParams();
    const ccValue = String(cc || "").trim();
    if (ccValue) params.set("cc", ccValue);
    params.set("subject", String(subject || ""));
    params.set("body", String(body || ""));
    const query = params.toString();
    const toValue = String(to || "").trim();
    const link = toValue ? `mailto:${toValue}?${query}` : `mailto:?${query}`;
    window.open(link, "_blank", "noopener,noreferrer");
  };
  const closeMacroAttachmentModal = () => {
    setMacroAttachmentModalOpen(false);
    setPendingMacroExecution(null);
    setMacroAttachmentFiles([]);
  };
  const executeMacro = async (selectedMacro, attachmentFilesForMacro = []) => {
    if (!ticketId || !selectedMacro) return;
    if (!selectedMacro) {
      toast.error(copy.toasts.macroNotFound);
      return;
    }
    try {
      const replacer = text => resolveTemplateVariables(text);
      const parseCsv = raw => String(raw || "").split(",").map(item => item.trim()).filter(Boolean);
      const parseIdList = raw => parseCsv(raw).map(id => String(id).trim()).filter(Boolean);
      const actions = Array.isArray(selectedMacro.actions) ? selectedMacro.actions : [];
      const patch = {};
      let shouldUpdateTicket = false;
      let attachmentUploaded = false;
      const currentAssigneeIds = (ticket?.assignees || []).map(row => String(row.user_id || row.id || "").trim()).filter(Boolean);
      const currentWatcherIds = (ticket?.watchers || []).map(row => String(row.user_id || row.id || "").trim()).filter(Boolean);
      for (const action of actions) {
        if (action?.type === "set_field") {
          const field = String(action.field || "").trim();
          const value = String(action.value || "");
          const fieldMode = String(action.fieldMode || "").trim().toLowerCase();
          if (field === "assigned_to_me") {
            patch.assignedUserId = user?.id || null;
            shouldUpdateTicket = true;
          } else if (field === "assigned_user_id") {
            const targetIds = parseIdList(value);
            if (fieldMode === "add") {
              for (const assigneeId of targetIds) {
                if (!currentAssigneeIds.includes(assigneeId)) {
                  await addTicketAssignee(ticketId, assigneeId);
                  currentAssigneeIds.push(assigneeId);
                }
              }
              if (targetIds.length > 0 && !patch.assignedUserId) {
                patch.assignedUserId = targetIds[0];
                shouldUpdateTicket = true;
              }
            } else {
              if (targetIds.length > 0) {
                patch.assignedUserId = targetIds[0];
                shouldUpdateTicket = true;
              } else {
                patch.assignedUserId = null;
                shouldUpdateTicket = true;
              }
              for (const assigneeId of currentAssigneeIds.filter(id => !targetIds.includes(id))) {
                await removeTicketAssignee(ticketId, assigneeId);
              }
              for (const assigneeId of targetIds.filter(id => !currentAssigneeIds.includes(id))) {
                await addTicketAssignee(ticketId, assigneeId);
              }
              currentAssigneeIds.splice(0, currentAssigneeIds.length, ...targetIds);
            }
          } else if (field === "status") {
            patch.status = value;
            shouldUpdateTicket = true;
          } else if (field === "type") {
            patch.type = value;
            shouldUpdateTicket = true;
          } else if (field === "category") {
            patch.category = value;
            shouldUpdateTicket = true;
          } else if (field === "priority") {
            patch.priority = value;
            shouldUpdateTicket = true;
          } else if (field === "channel") {
            patch.channel = value;
            shouldUpdateTicket = true;
          } else if (field === "is_major_incident") {
            patch.isMajorIncident = value === "true";
            shouldUpdateTicket = true;
            if (value === "true") {
              patch.priority = "urgent";
            }
          } else if (field === "business_impact") {
            patch.priority = value;
            shouldUpdateTicket = true;
          } else if (field === "followers") {
            const targetIds = parseIdList(value);
            const mode = fieldMode || "add";
            if (mode === "replace") {
              for (const watcherId of currentWatcherIds.filter(id => !targetIds.includes(id))) {
                await removeTicketWatcher(ticketId, watcherId);
              }
              for (const watcherId of targetIds.filter(id => !currentWatcherIds.includes(id))) {
                await addTicketWatcher(ticketId, watcherId);
              }
              currentWatcherIds.splice(0, currentWatcherIds.length, ...targetIds);
            } else if (mode === "remove") {
              for (const watcherId of targetIds) {
                await removeTicketWatcher(ticketId, watcherId);
              }
            } else {
              for (const watcherId of targetIds) {
                await addTicketWatcher(ticketId, watcherId);
              }
            }
          } else if (field === "linked_tickets") {
            const linkedIds = parseIdList(value);
            for (const linkedId of linkedIds) {
              await addLinkedTicket(ticketId, linkedId);
            }
          } else if (field === "linked_equipments") {
            const equipmentIds = parseIdList(value);
            for (const equipmentId of equipmentIds) {
              await addTicketComment(ticketId, `[Linked equipment] [event:added] [equipment_id:${equipmentId}]`, true);
            }
          } else if (field === "tags") {
            for (const tagLabel of parseCsv(value)) {
              await addTicketTag(ticketId, tagLabel, "#13BA8E");
            }
          }
        }
        if (action?.type === "add_comment" && action.comment) {
          await addTicketComment(ticketId, replacer(action.comment), Boolean(action.isInternal));
        }
        if (action?.type === "open_email") {
          const emailTo = replacer(action.emailTo || "");
          const emailCc = replacer(action.emailCc || "");
          const emailSubject = replacer(action.emailSubject || "");
          const emailBody = replacer(action.emailBody || "");
          if (emailTo || emailCc || emailSubject || emailBody) {
            openEmailTemplate(emailTo, emailCc, emailSubject, emailBody);
          }
        }
        if (action?.type === "teams_message") {
          if (isCommunity) {
            toast.info(copy.toasts.macroTeamsPro);
          } else if (action.teamsMessage) {
            const webhookId = String(action.teamsWebhookId || action.webhookId || "").trim();
            if (!webhookId) {
              toast.error(copy.toasts.macroTeamsWebhookMissing);
            } else {
              const response = await fetch(`${API_BASE_URL}/tickets/notifications/webhooks/custom-send`, {
                method: "POST",
                credentials: "include",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  webhookId,
                  title: replacer(action.teamsTitle || "Notification ticket"),
                  message: replacer(action.teamsMessage),
                  teamsThemeColor: String(action.teamsThemeColor || "#13BA8E")
                })
              });
              const payload = await response.json().catch(() => ({}));
              if (!response.ok || payload?.success === false) {
                throw new Error(payload?.error || "Unable to send the Teams message");
              }
              await addTicketComment(ticketId, `[Macro Teams] ${replacer(action.teamsMessage)}`, true);
            }
          }
        }
        if (action?.type === "planning_alert") {
          if (isCommunity) {
            setProPromoFeature("ticketPlanningAlert");
          } else {
            const offsetMinutes = Math.max(5, Number(action.reminderOffsetMinutes || 60) || 60);
            const startDate = new Date(Date.now() + offsetMinutes * 60 * 1000);
            const pad = n => String(n).padStart(2, "0");
            const payload = buildReminderEventPayload({
              ticket,
              title: replacer(action.reminderTitle || `Ticket #${ticket?.ticket_number || ticketId}`),
              date: `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`,
              time: `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`,
              note: replacer(action.reminderNote || ""),
              assignedUserId: user?.id,
              requesterName: requesterDisplayName !== "-" ? requesterDisplayName : ""
            });
            if (!payload) {
              throw new Error("Invalid schedule alert (title required)");
            }
            await createEvent(payload);
          }
        }
        if (action?.type === "call" && action.phoneNumber) {
          const sanitizedPhone = String(action.phoneNumber || "").trim();
          if (sanitizedPhone) {
            window.open(`tel:${sanitizedPhone}`, "_self");
          }
          await addTicketComment(ticketId, `[Call Macro] Phone number to contact: ${action.phoneNumber}`, true);
        }
        if (action?.type === "link_ticket" && action.ticketId) {
          const linkedId = String(action.ticketId || "").trim();
          if (linkedId) {
            await addLinkedTicket(ticketId, linkedId);
          }
        }
        if (action?.type === "link_equipment" && action.equipmentId) {
          await addTicketComment(ticketId, `[Linked equipment] [event:added] [equipment_id:${action.equipmentId}]`, true);
        }
        if ((action?.type === "manage_tags" || action?.type === "add_tags") && action.tagsText) {
          const tagLabels = parseCsv(action.tagsText);
          const removeMode = action.tagsMode === "remove";
          for (const tagLabel of tagLabels) {
            if (removeMode) {
              const existingTag = (ticket?.tags || []).find(tag => String(tag.label || "").trim().toLowerCase() === tagLabel.toLowerCase());
              if (existingTag?.id) {
                await removeTicketTag(ticketId, existingTag.id);
              }
            } else {
              await addTicketTag(ticketId, tagLabel, "#13BA8E");
            }
          }
        }
        if (action?.type === "add_attachment") {
          if (!attachmentUploaded && attachmentFilesForMacro.length > 0) {
            await addTicketCommentWithAttachments(ticketId, {
              content: "",
              isInternal: true,
              files: attachmentFilesForMacro
            });
            attachmentUploaded = true;
          }
        }
      }
      if (shouldUpdateTicket) {
        await updateTicket(ticketId, patch);
      }
      toast.success(copy.toasts.macroExecuted);
      setMacroSelection("");
      await loadDetail();
    } catch (error) {
      toast.error(error.message || copy.toasts.macroError);
    }
  };
  const runMacro = async () => {
    if (!ticketId || !macroSelection) return;
    const selectedMacro = availableMacros.find(macro => String(macro.id) === String(macroSelection));
    if (!selectedMacro) {
      toast.error(copy.toasts.macroNotFound);
      return;
    }
    const actions = Array.isArray(selectedMacro.actions) ? selectedMacro.actions : [];
    const requiresAttachmentUpload = actions.some(action => action?.type === "add_attachment");
    if (requiresAttachmentUpload) {
      setPendingMacroExecution(selectedMacro);
      setMacroAttachmentFiles([]);
      setMacroAttachmentModalOpen(true);
      return;
    }
    await executeMacro(selectedMacro, []);
  };
  const confirmRunMacroWithAttachments = async () => {
    const macroToRun = pendingMacroExecution;
    const filesToUpload = [...macroAttachmentFiles];
    closeMacroAttachmentModal();
    await executeMacro(macroToRun, filesToUpload);
  };

  const resetSideConversationForm = useCallback(() => {
    setSideConversation({
      team: "commercial",
      subject: "",
      to: "",
      cc: "",
      message: ""
    });
    setSideConversationPrestataireId("");
    setSideConversationContactKey("");
  }, []);

  const selectedSideConversationPrestataire = useMemo(
    () => sideConversationPrestataires.find(row => String(row.id) === String(sideConversationPrestataireId)) || null,
    [sideConversationPrestataires, sideConversationPrestataireId]
  );

  const sideConversationPrestataireContacts = useMemo(
    () => (selectedSideConversationPrestataire ? getPrestataireContactsList(selectedSideConversationPrestataire) : []),
    [selectedSideConversationPrestataire]
  );

  const applySideConversationPrestataire = useCallback((prestataire, contactKey = "") => {
    if (!prestataire) {
      setSideConversationPrestataireId("");
      setSideConversationContactKey("");
      return;
    }
    const contacts = getPrestataireContactsList(prestataire);
    const primary = contacts.find(contact => contact.key === contactKey) || contacts[0] || null;
    const otherEmails = contacts
      .filter(contact => contact.key !== primary?.key && contact.email)
      .map(contact => contact.email);
    const ticketNumber = ticket?.ticket_number || ticket?.id || "";
    const providerName = (prestataire.nom || "").trim();
    const suggestedSubject = interpolate(copy.sideModal.prestataireSubject, {
      number: String(ticketNumber || "—"),
      provider: providerName || "—"
    });
    setSideConversationPrestataireId(String(prestataire.id));
    setSideConversationContactKey(primary?.key || "");
    setSideConversation(prev => ({
      ...prev,
      team: "external",
      to: primary?.email || "",
      cc: otherEmails.join(", "),
      subject: prev.subject.trim() ? prev.subject : suggestedSubject
    }));
  }, [copy.sideModal.prestataireSubject, ticket]);

  const submitSideConversation = async () => {
    if (!ticketId) return;
    if (!sideConversation.message.trim()) {
      toast.error(copy.toasts.sideConversationMessageRequired);
      return;
    }
    const teamLabel = copy.sideConversationTeamOptions.find(opt => opt.key === sideConversation.team)?.label || sideConversation.team;
    const sideConversationId = `sc-${Date.now()}`;
    const safeSubject = String(sideConversation.subject || `Demande ${teamLabel}`).replace(/[\\\]]/g, "");
    const safeTo = String(sideConversation.to || "").replace(/[\\\]]/g, "");
    const safeCc = String(sideConversation.cc || "").replace(/[\\\]]/g, "");
    const sideEventNote = `[Side conversation] [id:${sideConversationId}] [event:opened] [team:${sideConversation.team}] ` + `[subject:${safeSubject}] [to:${safeTo}] [cc:${safeCc}] [created_at:${new Date().toISOString()}]`;
    const initialMessageNote = `[Side conversation] [id:${sideConversationId}] [event:message] [team:${sideConversation.team}] ` + `[subject:${safeSubject}] [to:${safeTo}] [cc:${safeCc}] ` + `[message:${encodeURIComponent(sideConversation.message.trim())}] [created_at:${new Date().toISOString()}]`;
    try {
      await addTicketComment(ticketId, sideEventNote, true);
      await addTicketComment(ticketId, initialMessageNote, true);
      const createdConversation = {
        id: sideConversationId,
        team: sideConversation.team,
        subject: safeSubject,
        to: safeTo,
        cc: safeCc,
        status: "open",
        updatedAt: new Date().toISOString(),
        messages: [{
          id: `${Date.now()}-init`,
          author: "Vous",
          createdAt: new Date().toISOString(),
          content: sideConversation.message.trim()
        }]
      };
      setSideConversations(prev => [createdConversation, ...prev]);
      setActiveSideConversationId(createdConversation.id);
      toast.success(copy.formatSideConversationSent(teamLabel));
      setShowSideConversationModal(false);
      resetSideConversationForm();
      await loadDetail();
    } catch (error) {
      toast.error(error.message || copy.toasts.sideConversationSendError);
    }
  };
  const activeSideConversation = useMemo(() => sideConversations.find(conv => String(conv.id) === String(activeSideConversationId)) || null, [sideConversations, activeSideConversationId]);
  const submitSideReply = () => {
    if (!activeSideConversation || !sideReplyDraft.trim()) return;
    const reply = sideReplyDraft.trim();
    const messageNote = `[Side conversation] [id:${activeSideConversation.id}] [event:message] [team:${activeSideConversation.team}] ` + `[subject:${String(activeSideConversation.subject || "").replace(/[\\\]]/g, "")}] ` + `[to:${String(activeSideConversation.to || "").replace(/[\\\]]/g, "")}] ` + `[cc:${String(activeSideConversation.cc || "").replace(/[\\\]]/g, "")}] ` + `[message:${encodeURIComponent(reply)}] [created_at:${new Date().toISOString()}]`;
    addTicketComment(ticketId, messageNote, true).then(createdComment => {
      const message = {
        id: createdComment?.id || `${Date.now()}-reply`,
        author: createdComment?.author_name || "Vous",
        createdAt: createdComment?.created_at || new Date().toISOString(),
        content: reply
      };
      setSideConversations(prev => prev.map(conv => String(conv.id) === String(activeSideConversation.id) ? {
        ...conv,
        updatedAt: new Date().toISOString(),
        messages: [...(conv.messages || []), message]
      } : conv));
      setTicket(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          comments: [...(prev.comments || []), createdComment],
          updated_at: new Date().toISOString()
        };
      });
      setSideReplyDraft("");
    }).catch(error => {
      toast.error(error.message || copy.toasts.sideConversationReplyError);
    });
  };
  const markSideConversationDone = () => {
    if (!activeSideConversation) return;
    const closeNote = `[Side conversation] [id:${activeSideConversation.id}] [event:closed] [team:${activeSideConversation.team}] ` + `[subject:${String(activeSideConversation.subject || "").replace(/[\\\]]/g, "")}] ` + `[to:${String(activeSideConversation.to || "").replace(/[\\\]]/g, "")}] ` + `[cc:${String(activeSideConversation.cc || "").replace(/[\\\]]/g, "")}] ` + `[created_at:${new Date().toISOString()}]`;
    addTicketComment(ticketId, closeNote, true).then(() => {
      setSideConversations(prev => prev.map(conv => String(conv.id) === String(activeSideConversation.id) ? {
        ...conv,
        status: "done",
        updatedAt: new Date().toISOString()
      } : conv));
      toast.success(copy.toasts.sideConversationClosed);
    }).catch(error => {
      toast.error(error.message || copy.toasts.sideConversationCloseError);
    });
  };
  const reopenSideConversation = () => {
    if (!activeSideConversation) return;
    const reopenNote = `[Side conversation] [id:${activeSideConversation.id}] [event:reopened] [team:${activeSideConversation.team}] ` + `[subject:${String(activeSideConversation.subject || "").replace(/[\\\]]/g, "")}] ` + `[to:${String(activeSideConversation.to || "").replace(/[\\\]]/g, "")}] ` + `[cc:${String(activeSideConversation.cc || "").replace(/[\\\]]/g, "")}] ` + `[created_at:${new Date().toISOString()}]`;
    addTicketComment(ticketId, reopenNote, true).then(() => {
      setSideConversations(prev => prev.map(conv => String(conv.id) === String(activeSideConversation.id) ? {
        ...conv,
        status: "open",
        updatedAt: new Date().toISOString()
      } : conv));
      toast.success(copy.toasts.sideConversationReopened);
    }).catch(error => {
      toast.error(error.message || copy.toasts.sideConversationReopenError);
    });
  };
  const clientLabel = useMemo(() => {
    if (!ticket) return "-";
    return ticket.client_name || ticket.client_nom || clients.find(c => String(c.id) === String(ticket.client_id))?.name || "-";
  }, [ticket, clients]);
  const requesterContact = useMemo(() => {
    const targetContactId = editForm.requesterContactId || ticket?.requester_contact_id;
    if (!targetContactId) return null;
    return contacts.find(c => String(c.id) === String(targetContactId)) || null;
  }, [editForm.requesterContactId, ticket, contacts]);
  const requesterUser = useMemo(() => {
    if (!ticket?.requester_user_id) return null;
    return users.find(u => String(u.id) === String(ticket.requester_user_id)) || null;
  }, [ticket, users]);
  const requesterDisplayName = useMemo(() => {
    if (requesterContact) {
      const fullName = `${requesterContact.prenom || ""} ${requesterContact.nom || ""}`.trim();
      return fullName || requesterContact.email || "-";
    }
    if (requesterUser) {
      return requesterUser.name || requesterUser.nom || requesterUser.email || "-";
    }
    return ticket?.requester_name || ticket?.requester_email || "-";
  }, [requesterContact, requesterUser, ticket]);
  const requesterPhone = useMemo(() => requesterContact?.telephone || requesterContact?.phone || requesterContact?.mobile || "-", [requesterContact]);
  const requesterEmail = useMemo(() => requesterContact?.email || requesterUser?.email || ticket?.requester_email || "-", [requesterContact, requesterUser, ticket]);
  const orphanRequesterEmail = useMemo(() => {
    if (requesterContact || editForm.requesterContactId || ticket?.requester_contact_id) return "";
    const email = String(ticket?.requester_email || "").trim();
    if (!email || email === "-") return "";
    return email;
  }, [requesterContact, editForm.requesterContactId, ticket?.requester_contact_id, ticket?.requester_email]);
  const requesterRole = useMemo(() => requesterContact?.role || requesterContact?.fonction || requesterContact?.poste || "-", [requesterContact]);
  const currentUserId = useMemo(() => user?.id || user?.uuid || user?.user_id || null, [user]);
  const isCurrentUserAssigned = useMemo(() => {
    if (!currentUserId || !ticket) return false;
    const assigneeIds = new Set();
    if (ticket.assigned_user_id) assigneeIds.add(String(ticket.assigned_user_id));
    (Array.isArray(ticket.assignees) ? ticket.assignees : []).forEach(assignee => {
      const id = assignee?.user_id || assignee?.userId || assignee?.id;
      if (id) assigneeIds.add(String(id));
    });
    return assigneeIds.has(String(currentUserId));
  }, [currentUserId, ticket]);
  const {
    unreadByCommentId,
    markRead: markCommentNotificationRead
  } = useNotifications({
    ticketId: isCurrentUserAssigned ? ticketId : null,
    enabled: Boolean(ticketId && isCurrentUserAssigned)
  });
  const currentAgentUser = useMemo(() => users.find(u => String(u.id) === String(currentUserId) || String(u.uuid) === String(currentUserId) || String(u.user_id) === String(currentUserId)) || null, [users, currentUserId]);
  const resolveAgentDisplayName = agentUser => {
    if (!agentUser) return "";
    return (agentUser.ticket_helpdesk_display_name || agentUser.username || agentUser.email || "").trim();
  };
  const currentUserDisplayName = useMemo(() => {
    const helpdesk = resolveAgentDisplayName(currentAgentUser || user);
    if (helpdesk) return helpdesk;
    const fullName = `${user?.prenom || ""} ${user?.nom || ""}`.trim();
    return fullName || user?.name || user?.username || user?.email || copy.agentFallback;
  }, [user, currentAgentUser, copy]);
  const requesterFirstName = useMemo(() => {
    if (requesterContact?.prenom) return String(requesterContact.prenom).trim();
    const fallbackName = String(requesterDisplayName || "").trim();
    if (!fallbackName || fallbackName === "-") return "";
    return fallbackName.split(/\s+/)[0] || "";
  }, [requesterContact, requesterDisplayName]);
  const resolveTemplateVariables = text => {
    const raw = String(text || "");
    if (isCommunity) return raw;
    const ticketNumber = String(ticket?.ticket_number || ticketId || "");
    const ticketTitle = String(editForm.title || ticket?.title || "");
    const ticketStatus = String(copy.getStatusLabel(ticket?.status === "open" ? "new" : ticket?.status));
    const agentName = String(resolveAgentDisplayName(currentAgentUser) || resolveAgentDisplayName(user) || "");
    const agentEmail = String(currentAgentUser?.email || user?.email || "");
    const clientName = String(breadcrumbClientLabel && breadcrumbClientLabel !== "-" ? breadcrumbClientLabel : "");
    const contactEmail = String(requesterContact?.email || "");
    const contactFirstName = String(requesterContact?.prenom || requesterFirstName || "");
    const contactLastName = String(requesterContact?.nom || "");
    const contactPhone = String(requesterContact?.telephone || requesterContact?.phone || "");
    const material = buildMaterialTemplateFields(ticket, linkedEquipments);
    const replacements = [
      ["{{ticketNumber}}", ticketNumber],
      ["{{ticket.numero}}", ticketNumber],
      ["{{ticket.ticket_number}}", ticketNumber],
      ["{{ticket.id}}", String(ticket?.id || ticketId || "")],
      ["{{title}}", ticketTitle],
      ["{{ticket.titre}}", ticketTitle],
      ["{{ticket.title}}", ticketTitle],
      ["{{status}}", ticketStatus],
      ["{{ticket.statut}}", ticketStatus],
      ["{{ticket.status}}", ticketStatus],
      ["{{requester}}", String(requesterDisplayName || "")],
      ["{{demandeur.nom_complet}}", String(requesterDisplayName || "")],
      ["{{prenom}}", String(requesterFirstName || "")],
      ["{{demandeur.prenom}}", String(requesterFirstName || "")],
      ["{{agent}}", agentName],
      ["{{agent.username}}", agentName],
      ["{{agent.email}}", agentEmail],
      ["{{agent.nom_complet}}", agentName],
      ["{{agent.id}}", String(user?.id || currentAgentUser?.id || "")],
      ["{{agent.role}}", String(user?.role || currentAgentUser?.role || "")],
      ["{{client}}", clientName],
      ["{{entreprise.nom}}", clientName],
      ["{{entreprise.id}}", String(breadcrumbClientId || ticket?.client_id || "")],
      ["{{contact.email}}", contactEmail],
      ["{{contact.prenom}}", contactFirstName],
      ["{{contact.nom}}", contactLastName],
      ["{{contact.telephone}}", contactPhone],
      ["{{contact.id}}", String(requesterContact?.id || ticket?.contact_id || "")],
      ["{{material.id}}", material.id],
      ["{{material.name}}", material.name],
      ["{{material.type}}", material.type],
      ["{{material.warranty}}", material.warranty],
      ["{{material.licenses}}", material.licenses],
      ["{{material.serial}}", material.serial],
      ["{{material.brand}}", material.brand],
      ["{{material.model}}", material.model],
      ["{{material.clientId}}", material.clientId],
      ["{{material.count}}", material.count],
      ["{{material.names}}", material.names],
      ["{{material.types}}", material.types],
      ["{{material.ids}}", material.ids],
      ["{{material.list}}", material.list],
      ["{{equipement.id}}", material.id],
      ["{{equipement.nom}}", material.name],
      ["{{equipement.type}}", material.type],
      ["{{equipement.garantie}}", material.warranty],
      ["{{equipement.licences}}", material.licenses],
      ["{{equipement.serie}}", material.serial],
      ["{{equipement.marque}}", material.brand],
      ["{{equipement.modele}}", material.model],
      ["{{equipement.liste}}", material.list],
      ["{{equipement.noms}}", material.names],
      ["{{equipement.nombre}}", material.count]
    ];
    return replacements.reduce((acc, [token, value]) => acc.replaceAll(token, value), raw);
  };
  const resolveUserLabel = userId => {
    const found = users.find(u => String(u.id) === String(userId) || String(u.uuid) === String(userId) || String(u.user_id) === String(userId));
    if (found) {
      return found.ticket_helpdesk_display_name || found.name || found.nom || found.username || found.email || String(userId);
    }
    const fromAssignees = (ticket?.assignees || []).find(a => String(a.user_id || a.id) === String(userId));
    if (fromAssignees) {
      return fromAssignees.ticket_helpdesk_display_name || fromAssignees.name || fromAssignees.username || fromAssignees.email || String(userId);
    }
    const fromWatchers = (ticket?.watchers || []).find(w => String(w.user_id || w.id) === String(userId));
    if (fromWatchers) {
      return fromWatchers.ticket_helpdesk_display_name || fromWatchers.name || fromWatchers.username || fromWatchers.email || String(userId);
    }
    return String(userId);
  };
  const resolveContactLabel = contactId => {
    const found = contacts.find(c => String(c.id) === String(contactId));
    if (!found) return null;
    const fullName = `${found.prenom || ""} ${found.nom || ""}`.trim();
    return fullName || found.email || null;
  };
  const resolveClientLabel = clientId => {
    const found = clients.find(c => String(c.id) === String(clientId));
    return found?.name || found?.nom || null;
  };
  const ticketActivityLog = useMemo(() => buildTicketActivityLog(ticket, resolveUserLabel, copy, locale, resolveContactLabel, resolveClientLabel), [ticket, users, contacts, clients, copy, locale]);
  const breadcrumbClientId = useMemo(() => {
    if (requesterContact?.client_id) return requesterContact.client_id;
    return ticket?.client_id || null;
  }, [requesterContact, ticket]);
  const effectiveTicketClientId = useMemo(() => breadcrumbClientId || ticket?.client_id || requesterContact?.client_id || null, [breadcrumbClientId, ticket, requesterContact]);

  useEffect(() => {
    if (!showSideConversationModal) return undefined;
    if (!canViewPrestataires || sideConversation.team !== "external" || !effectiveTicketClientId) {
      setSideConversationPrestataires([]);
      setLoadingSideConversationPrestataires(false);
      return undefined;
    }
    let cancelled = false;
    setLoadingSideConversationPrestataires(true);
    fetchPrestataires(effectiveTicketClientId)
      .then(data => {
        if (cancelled) return;
        setSideConversationPrestataires(Array.isArray(data) ? data : []);
      })
      .catch(err => {
        console.error("Error loading prestataires for side conversation:", err);
        if (!cancelled) setSideConversationPrestataires([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSideConversationPrestataires(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showSideConversationModal, canViewPrestataires, sideConversation.team, effectiveTicketClientId]);

  const breadcrumbClientLabel = useMemo(() => {
    if (requesterContact?.client_name) return requesterContact.client_name;
    if (requesterContact?.client_id) {
      const requesterClient = clients.find(c => String(c.id) === String(requesterContact.client_id));
      if (requesterClient) return requesterClient.name || requesterClient.nom || "-";
    }
    return clientLabel;
  }, [requesterContact, clients, clientLabel]);
  const ticketClient = useMemo(() => clients.find(client => String(client.id) === String(effectiveTicketClientId)) || null, [clients, effectiveTicketClientId]);
  const clientContractSummary = useMemo(() => buildClientContractSummary(ticketClient), [ticketClient]);
  const activeContractOptionLabels = useMemo(() => {
    if (!clientContractSummary) return [];
    return contractModuleDefs.filter(mod => mod.enabled !== false && clientContractSummary.activeOptionKeys.includes(mod.moduleKey)).map(mod => copy.getContractModuleLabel(mod.moduleKey, mod.label));
  }, [clientContractSummary, contractModuleDefs, copy]);
  const clientSlaRows = useMemo(() => {
    if (!ticketClient?.contrat) return [];
    const sla = parseClientSla(ticketClient.contrat);
    if (!sla.enabled) return [];
    return formatClientSlaRows(ticketClient.contrat);
  }, [ticketClient]);
  const clientSupportCreditTotals = useMemo(() => computeSupportCreditTotals(clientSupportCreditBalance, clientSupportCreditPacks), [clientSupportCreditBalance, clientSupportCreditPacks]);
  const contractFactLabel = useMemo(() => {
    if (!effectiveTicketClientId || !clientContractSummary) return copy.noContract;
    return copy.getContractFactLabel(clientContractSummary.validity, {
      startDate: clientContractSummary.startDate,
      expirationDate: clientContractSummary.expirationDate
    });
  }, [effectiveTicketClientId, clientContractSummary, copy]);
  const contractValidityAlert = useMemo(() => clientContractSummary ? copy.getContractValidityAlert(clientContractSummary.validity, contractFactLabel) : null, [clientContractSummary, contractFactLabel, copy]);
  const contractOptionsLabel = useMemo(() => {
    if (!effectiveTicketClientId) return copy.noOption;
    if (activeContractOptionLabels.length === 0) return copy.noOption;
    return activeContractOptionLabels.join(" / ");
  }, [effectiveTicketClientId, activeContractOptionLabels, copy]);
  const contractCreditsLabel = useMemo(() => {
    if (!effectiveTicketClientId) return copy.noCredit;
    if (loadingClientCredits) return copy.fallbackEmDash;
    if (clientSupportCreditBalance === null) return copy.noCredit;
    const {
      remaining,
      total
    } = clientSupportCreditTotals;
    if (total <= 0 && remaining <= 0) return copy.noCredit;
    return `${remaining} / ${total}`;
  }, [effectiveTicketClientId, loadingClientCredits, clientSupportCreditBalance, clientSupportCreditTotals, copy]);
  const contractCreditsEmpty = useMemo(() => {
    if (!effectiveTicketClientId || loadingClientCredits) return false;
    if (clientSupportCreditBalance === null) return true;
    return clientSupportCreditTotals.total <= 0 && clientSupportCreditTotals.remaining <= 0;
  }, [effectiveTicketClientId, loadingClientCredits, clientSupportCreditBalance, clientSupportCreditTotals]);
  const contractCreditsBlocked = !contractCreditsEmpty && Number(clientSupportCreditTotals.remaining || 0) <= 0;
  const contractFactEmpty = !effectiveTicketClientId || !clientContractSummary || clientContractSummary.validity?.status === "unknown";
  const contractStatusClass = contractFactEmpty ? fs.contractFactEmpty : CONTRACT_FACT_STATUS_CLASS[clientContractSummary.validity?.status] || "";
  const contractOptionsEmpty = !effectiveTicketClientId || activeContractOptionLabels.length === 0;
  const contractSlaLabel = useMemo(() => {
    if (!effectiveTicketClientId || clientSlaRows.length === 0) return copy.noSla;
    const ticketPriority = editForm.priority || ticket?.priority || "normal";
    const slaRow = clientSlaRows.find(row => row.key === ticketPriority) || clientSlaRows.find(row => row.key === "normal");
    if (!slaRow) return copy.noSla;
    return copy.formatSlaLabel(slaRow.firstResponseHours, slaRow.resolutionHours);
  }, [effectiveTicketClientId, clientSlaRows, editForm.priority, ticket?.priority, copy]);
  const contractSlaEmpty = !effectiveTicketClientId || clientSlaRows.length === 0;
  const ticketSlaView = useMemo(() => getTicketSlaDisplay(ticket, {
    clients,
    now: slaNow
  }), [ticket, clients, slaNow]);
  const ticketSlaTitle = useMemo(() => {
    if (ticketSlaView.phase === "first_response") return copy.slaTitle.firstResponse;
    if (ticketSlaView.phase === "resolution") return copy.slaTitle.resolution;
    if (ticketSlaView.phase === "closed") return copy.slaTitle.closed;
    return copy.slaTitle.default;
  }, [ticketSlaView.phase]);
  const ticketTakeoverStat = useMemo(() => computeTicketTakeoverStat(ticket), [ticket]);
  const ticketTakeoverLabel = useMemo(() => {
    if (!ticketTakeoverStat) return copy.fallbackEmDash;
    return `${copy.formatDateTime(ticketTakeoverStat.at)} · ${copy.formatDurationMs(ticketTakeoverStat.durationMs)}`;
  }, [ticketTakeoverStat, copy]);
  const userSearchOptions = useMemo(() => users.map(u => ({
    id: u.id,
    label: u.name || u.nom || u.email || String(u.id)
  })), [users]);
  const assigneeUserIds = useMemo(() => {
    if (Array.isArray(ticket?.assignees) && ticket.assignees.length > 0) {
      return ticket.assignees.map(a => String(a.user_id));
    }
    if (ticket?.assigned_user_id) return [String(ticket.assigned_user_id)];
    return [];
  }, [ticket]);
  useEffect(() => {
    setRequesterSearch(requesterDisplayName && requesterDisplayName !== "-" ? requesterDisplayName : "");
  }, [requesterDisplayName]);
  useEffect(() => {
    setAssigneeSearch("");
  }, [assigneeUserIds.join(",")]);
  const watcherUserIds = useMemo(() => (ticket?.watchers || []).map(w => String(w.user_id)), [ticket?.watchers]);
  const isMajorIncident = Boolean(ticket?.is_major_incident);
  const enabledCategories = useMemo(() => (Array.isArray(ticketCategories) ? ticketCategories : []).filter(item => item?.enabled !== false), [ticketCategories]);
  const filteredRequesterContacts = useMemo(() => {
    const q = requesterSearch.trim().toLowerCase();
    if (!q) return contacts.slice(0, 50);
    return contacts.filter(c => getContactSearchText(c).includes(q)).slice(0, 50);
  }, [contacts, requesterSearch]);
  const filteredAssigneeOptions = useMemo(() => {
    const q = assigneeSearch.trim().toLowerCase();
    const available = userSearchOptions.filter(opt => !assigneeUserIds.includes(String(opt.id)));
    if (!q) return available.slice(0, 50);
    return available.filter(opt => opt.label.toLowerCase().includes(q)).slice(0, 50);
  }, [userSearchOptions, assigneeSearch, assigneeUserIds]);
  const filteredFollowerOptions = useMemo(() => {
    const q = followerSearch.trim().toLowerCase();
    const available = userSearchOptions.filter(opt => !watcherUserIds.includes(String(opt.id)));
    if (!q) return available.slice(0, 50);
    return available.filter(opt => opt.label.toLowerCase().includes(q)).slice(0, 50);
  }, [userSearchOptions, followerSearch, watcherUserIds]);
  const filteredCategoryOptions = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    const rows = !q ? enabledCategories : enabledCategories.filter(item => {
      const name = String(item?.name || "").toLowerCase();
      const section = String(item?.section || "").toLowerCase();
      return name.includes(q) || section.includes(q);
    });
    return rows.slice(0, 80);
  }, [enabledCategories, categorySearch]);
  const filteredCategoryGroups = useMemo(() => Object.entries(filteredCategoryOptions.reduce((acc, item) => {
    const section = String(item?.section || copy.uncategorized).trim() || copy.uncategorized;
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {})), [filteredCategoryOptions, copy]);
  const selectRequester = async contact => {
    const fullName = `${contact?.prenom || ""} ${contact?.nom || ""}`.trim();
    setRequesterSearch(fullName || contact?.email || "");
    setShowRequesterDropdown(false);
    const nextValue = String(contact.id);
    setEditForm(p => ({
      ...p,
      requesterContactId: nextValue
    }));
    const patch = {
      requesterUserId: null,
      requesterContactId: nextValue || null
    };
    const linkedClients = Array.isArray(contact?.clients) ? contact.clients.map(row => row.id ?? row.client_id).filter(id => id != null) : contact?.client_id ? [contact.client_id] : [];
    const currentTicketClientId = ticket?.client_id || editForm.clientId || null;
    const matchingCurrent = currentTicketClientId && linkedClients.some(id => String(id) === String(currentTicketClientId));
    let nextClientId = null;
    if (linkedClients.length === 1) {
      nextClientId = linkedClients[0];
    } else if (linkedClients.length > 1) {
      if (matchingCurrent) {
        nextClientId = currentTicketClientId;
      } else {
        toast.info(copy.toasts.requesterCompanyAmbiguous || copy.toasts.companyRequired || "Entreprise ambiguë — entreprise du ticket conservée");
      }
    } else if (contact?.client_id) {
      nextClientId = contact.client_id;
    }
    if (nextClientId) {
      patch.clientId = nextClientId;
    }
    await updateTicketLive(patch, {
      successMessage: copy.toasts.requesterUpdated
    });
    if (nextClientId && ticketReminder?.id) {
      try {
        await updateEvent(ticketReminder.id, {
          clientId: nextClientId
        });
        setTicketReminder(prev => prev ? {
          ...prev,
          client_id: nextClientId,
          clientId: nextClientId
        } : prev);
      } catch {}
    }
  };
  const selectCategory = async item => {
    const name = String(item?.name || "");
    setCategorySearch(name);
    setEditForm(p => ({
      ...p,
      category: name
    }));
    setShowCategoryDropdown(false);
    await updateTicketLive({
      category: name
    }, {
      successMessage: copy.toasts.categoryUpdated
    });
  };
  const linkedTickets = useMemo(() => {
    const fromBackend = Array.isArray(ticket?.linked_tickets) ? ticket.linked_tickets : Array.isArray(ticket?.links) ? ticket.links : [];
    const fromComments = buildLinkedTicketsFromComments(ticket?.comments || []);
    const byId = new Map();
    [...fromBackend, ...fromComments].forEach(item => {
      const key = String(item?.linked_ticket_id || item?.ticket_id || item?.id || item?.linkedTicketId || "");
      if (!key) return;
      byId.set(key, item);
    });
    return Array.from(byId.values());
  }, [ticket]);
  const availableLinkTargets = useMemo(() => allTickets.filter(row => String(row.id) !== String(ticketId)), [allTickets, ticketId]);
  const linkedTicketSearchOptions = useMemo(() => availableLinkTargets.map(row => ({
    id: row.id,
    label: `#${row.ticket_number || row.id} - ${row.title || "Sans titre"}`
  })), [availableLinkTargets]);
  const getTicketLinkLabel = row => `#${row?.ticket_number || row?.id || "-"} - ${row?.title || "Sans titre"}`;
  const getEquipmentLinkLabel = useCallback(equipment => getEquipmentPickerLabel(equipment ? {
    ...equipment,
    id: equipment.id || equipment.equipment_id
  } : equipment, {
    locale,
    separator: " - "
  }), [locale]);
  const linkedTicketIds = useMemo(() => new Set(linkedTickets.map(item => String(item?.linked_ticket_id || item?.ticket_id || item?.id || item?.linkedTicketId || ""))), [linkedTickets]);
  const linkedEquipmentIds = useMemo(() => new Set(linkedEquipments.map(item => String(item.equipment_id))), [linkedEquipments]);
  const filteredLinkedTicketOptions = useMemo(() => {
    const query = linkedTicketSearch.trim().toLowerCase();
    return availableLinkTargets.filter(row => !linkedTicketIds.has(String(row.id))).filter(row => {
      if (!query) return true;
      const label = getTicketLinkLabel(row).toLowerCase();
      return label.includes(query);
    }).slice(0, 40);
  }, [availableLinkTargets, linkedTicketIds, linkedTicketSearch]);
  const filteredLinkedEquipmentOptions = useMemo(() => {
    const query = linkedEquipmentSearch.trim().toLowerCase();
    return clientEquipments.filter(equipment => !linkedEquipmentIds.has(String(equipment.id))).filter(equipment => {
      if (!query) return true;
      return getEquipmentSearchText(equipment, locale).includes(query);
    }).slice(0, 40);
  }, [clientEquipments, linkedEquipmentIds, linkedEquipmentSearch, locale]);
  const isTicketClosed = String(ticket?.status || "").toLowerCase() === "closed";
  const isReadOnly = isDeleted || isTicketClosed;
  const showOrphanRequesterActions = Boolean(!isSalesTicketDetail && !isReadOnly && orphanRequesterEmail && (canCreateContact || canLinkRequesterEmail));
  const openQuickAddRequesterContact = useCallback(() => {
    if (!orphanRequesterEmail || !canCreateContact) return;
    setOrphanRequesterChoiceOpen(false);
    setShowRequesterDropdown(false);
    setLinkRequesterEmailModalOpen(false);
    setContactModalInitial({
      email: orphanRequesterEmail,
      client_id: ticket?.client_id || editForm.clientId || null
    });
    setContactModalOpen(true);
  }, [orphanRequesterEmail, canCreateContact, ticket?.client_id, editForm.clientId]);
  const openLinkRequesterEmailModal = useCallback(() => {
    if (!orphanRequesterEmail || !canLinkRequesterEmail) return;
    setOrphanRequesterChoiceOpen(false);
    setShowRequesterDropdown(false);
    setContactModalOpen(false);
    setLinkRequesterEmailModalOpen(true);
  }, [orphanRequesterEmail, canLinkRequesterEmail]);
  const openOrphanRequesterActions = useCallback(() => {
    if (!showOrphanRequesterActions) return;
    setShowRequesterDropdown(false);
    if (canCreateContact && canLinkRequesterEmail) {
      setOrphanRequesterChoiceOpen(true);
      return;
    }
    if (canCreateContact) {
      openQuickAddRequesterContact();
      return;
    }
    openLinkRequesterEmailModal();
  }, [showOrphanRequesterActions, canCreateContact, canLinkRequesterEmail, openQuickAddRequesterContact, openLinkRequesterEmailModal]);
  const closeContactModal = useCallback(() => {
    setContactModalOpen(false);
    setContactModalInitial(null);
  }, []);
  const handleQuickAddRequesterContactSaved = useCallback(async savedContact => {
    closeContactModal();
    if (!savedContact?.id) return;
    try {
      const rows = await fetchContactsList();
      if (Array.isArray(rows)) setContacts(rows);
    } catch {}
    await selectRequester(savedContact);
  }, [closeContactModal, selectRequester]);
  const handleRequesterEmailLinked = useCallback(async linkedContact => {
    setLinkRequesterEmailModalOpen(false);
    if (!linkedContact?.id) return;
    try {
      const rows = await fetchContactsList();
      if (Array.isArray(rows)) setContacts(rows);
    } catch {}
    await selectRequester(linkedContact);
  }, [selectRequester]);
  const renderOrphanRequesterActions = (variant = "icon") => {
    if (!showOrphanRequesterActions) return null;
    if (variant === "empty") {
      return <div className={fs.contactEmptyActions}>
          {canCreateContact ? <button type="button" className={fs.contactEmptyAction} onClick={openQuickAddRequesterContact}>
              {copy.createContact}
            </button> : null}
          {canLinkRequesterEmail ? <button type="button" className={fs.contactEmptyAction} onClick={openLinkRequesterEmailModal}>
              {copy.linkContact}
            </button> : null}
        </div>;
    }
    const triggerClass = variant === "context" ? styles.contextAddContactBtn : variant === "input" ? fs.contactInputEndBtn : styles.ticketHeroAddContactBtn;
    return <SmartTooltip content={copy.orphanRequesterMenuAria || copy.createContact}>
        <button type="button" className={triggerClass} title={copy.orphanRequesterMenuAria || copy.createContact} aria-label={copy.orphanRequesterMenuAria || copy.createContact} onClick={e => {
        e.preventDefault();
        e.stopPropagation();
        openOrphanRequesterActions();
      }}>
          <Icon icon="mdi:account-plus-outline" aria-hidden />
        </button>
      </SmartTooltip>;
  };
  const saveSalesProgress = useCallback(async nextValue => {
    if (!ticketId || isReadOnly) return;
    const clamped = Math.max(0, Math.min(100, Math.round(Number(nextValue) || 0)));
    setSalesProgress(clamped);
    setSavingSalesProgress(true);
    try {
      const updated = await updateTicket(ticketId, {
        progressPercent: clamped
      });
      setTicket(prev => prev ? {
        ...prev,
        ...(updated || {}),
        progress_percent: updated?.progress_percent ?? updated?.progressPercent ?? clamped
      } : prev);
      toast.success(salesDetailCopy.progressSaved);
    } catch (error) {
      toast.error(error.message || salesDetailCopy.progressError);
    } finally {
      setSavingSalesProgress(false);
    }
  }, [ticketId, isReadOnly, salesDetailCopy.progressSaved, salesDetailCopy.progressError]);
  const handleSuggestReplyAi = useCallback(async () => {
    if (!ticketId || aiSuggestLoading || isReadOnly || !aiFeatures.suggestReply || !canAiSuggest) return;
    setAiSuggestLoading(true);
    try {
      expandReplyBox();
      const data = await suggestTicketReplyAi({
        ticketId,
        internal: commentInternal,
        locale
      });
      const reply = String(data?.reply || "").trim();
      if (!reply) {
        toast.error(copy.toasts.aiSuggestError);
        return;
      }
      const asHtml = /<[a-z][\s\S]*>/i.test(reply) ? reply : reply.replace(/\n/g, "<br>");
      const safeHtml = sanitizeTicketCommentHtml(asHtml) || asHtml;
      setCommentDraft(safeHtml);
      requestAnimationFrame(() => {
        if (!commentEditorRef.current) return;
        commentEditorRef.current.innerHTML = safeHtml;
        commentEditorRef.current.focus();
      });
      toast.success(copy.toasts.aiSuggestOk);
    } catch (err) {
      toast.error(err.message || copy.toasts.aiSuggestError);
    } finally {
      setAiSuggestLoading(false);
    }
  }, [ticketId, aiSuggestLoading, isReadOnly, aiFeatures.suggestReply, canAiSuggest, expandReplyBox, commentInternal, locale, copy.toasts.aiSuggestError, copy.toasts.aiSuggestOk]);
  const handleSuggestPriorityAi = useCallback(async () => {
    if (!ticketId || aiPriorityLoading || isReadOnly || isMajorIncident || !aiFeatures.autoPriority) return;
    setAiPriorityLoading(true);
    try {
      const result = await suggestTicketPriorityAi({
        ticketId,
        locale
      });
      const nextPriority = result?.priority || "normal";
      setEditForm(p => ({
        ...p,
        priority: nextPriority
      }));
      await updateTicketLive({
        priority: nextPriority
      }, {
        successMessage: copy.toasts.aiPriorityOk || copy.toasts.priorityUpdated
      });
      const score = result?.score;
      const rationale = String(result?.rationale || "").trim();
      setAiPriorityHint(score ? `P${score}${rationale ? ` · ${rationale}` : ""}` : rationale);
    } catch (err) {
      toast.error(err.message || copy.toasts.aiPriorityError || copy.toasts.aiSuggestError);
    } finally {
      setAiPriorityLoading(false);
    }
  }, [ticketId, aiPriorityLoading, isReadOnly, isMajorIncident, aiFeatures.autoPriority, locale, copy.toasts.aiPriorityOk, copy.toasts.priorityUpdated, copy.toasts.aiPriorityError, copy.toasts.aiSuggestError, updateTicketLive]);
  const handleCorrectTextAi = useCallback(async (mode = "enrich") => {
    if (aiCorrectLoading || aiSuggestLoading || isReadOnly || !aiFeatures.suggestReply || !canAiSuggest) return;
    const html = String(commentEditorRef.current?.innerHTML || commentDraft || "").trim();
    const plain = html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!plain) {
      toast.error(copy.toasts.aiCorrectEmpty);
      return;
    }
    setAiCorrectLoading(true);
    try {
      expandReplyBox();
      const data = await correctTicketTextAi({
        text: html,
        ticketId,
        internal: commentInternal,
        locale,
        mode
      });
      const corrected = String(data?.text || "").trim();
      if (!corrected) {
        toast.error(copy.toasts.aiCorrectError);
        return;
      }
      const asHtml = /<[a-z][\s\S]*>/i.test(corrected) ? corrected : corrected.replace(/\n/g, "<br>");
      const safeHtml = sanitizeTicketCommentHtml(asHtml) || asHtml;
      setCommentDraft(safeHtml);
      requestAnimationFrame(() => {
        if (!commentEditorRef.current) return;
        commentEditorRef.current.innerHTML = safeHtml;
        commentEditorRef.current.focus();
      });
      const normalize = value => String(value || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim().toLowerCase();
      toast.success(normalize(safeHtml) === normalize(html) ? copy.toasts.aiCorrectUnchanged : copy.toasts.aiCorrectOk);
    } catch (err) {
      toast.error(err.message || copy.toasts.aiCorrectError);
    } finally {
      setAiCorrectLoading(false);
    }
  }, [aiCorrectLoading, aiSuggestLoading, isReadOnly, aiFeatures.suggestReply, canAiSuggest, commentDraft, commentInternal, ticketId, expandReplyBox, locale, copy.toasts.aiCorrectEmpty, copy.toasts.aiCorrectError, copy.toasts.aiCorrectOk, copy.toasts.aiCorrectUnchanged]);
  const deleteConfirmConfig = useMemo(() => {
    if (ticketDeleteConfirm === "soft") {
      return {
        title: copy.sidebar.deleteTitle,
        message: copy.confirms.softDelete,
        confirmLabel: copy.sidebar.deleteTitle,
        icon: "mdi:trash-can-outline"
      };
    }
    if (ticketDeleteConfirm === "permanent") {
      return {
        title: copy.footer.permanentDelete,
        message: copy.confirms.permanentDelete,
        confirmLabel: copy.footer.permanentDelete,
        icon: "mdi:delete-forever-outline"
      };
    }
    return null;
  }, [ticketDeleteConfirm, copy]);
  const hasReplyDraft = useMemo(() => {
    const html = String(commentDraft || "");
    const text = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim();
    return text.length > 0 || attachmentFiles.length > 0 || htmlContainsInlineImage(html);
  }, [commentDraft, attachmentFiles]);
  const isWhatsAppNativeTicket = ticketNativeChannel === "whatsapp";
  const isTicketChannelDisabled = useCallback(channelKey => {
    if (isReadOnly) return true;
    if (channelKey === "whatsapp" && !isWhatsAppNativeTicket) return true;
    return false;
  }, [isReadOnly, isWhatsAppNativeTicket]);
  const canEditComment = useCallback(comment => {
    if (!canEditMessages || !comment || isReadOnly || !currentUserId) return false;
    const authorId = comment?.author_user_id || comment?.authorUserId || comment?.user_id || comment?.userId;
    if (!authorId || String(authorId) !== String(currentUserId)) return false;
    return isUserEditableCommentContent(comment?.content, copy);
  }, [canEditMessages, currentUserId, isReadOnly, copy]);
  const canDeleteComment = useCallback(comment => {
    if (!canDeleteAttachments || !comment || isReadOnly) return false;
    if (isClientResponseComment(comment)) return false;
    return isUserEditableCommentContent(comment?.content, copy);
  }, [canDeleteAttachments, isReadOnly, copy]);
  const canDeleteSideConversationMessage = useCallback(commentId => {
    if (!canDeleteAttachments || !commentId || isReadOnly) return false;
    const comment = (ticket?.comments || []).find(row => String(row.id) === String(commentId));
    if (!comment) return false;
    return parseSideConversationEvent(comment.content)?.event === "message";
  }, [canDeleteAttachments, isReadOnly, ticket?.comments]);
  const startEditComment = comment => {
    if (!canEditComment(comment)) return;
    setEditingCommentId(comment.id);
    setEditingCommentDraft(String(comment.content || ""));
    setEditingCommentInternal(Boolean(comment.is_internal ?? comment.isInternal));
    setEditingCommentRemovedAttachmentKeys([]);
  };
  const cancelEditComment = (force = false) => {
    if (!force && savingCommentEdit) return;
    setEditingCommentId(null);
    setEditingCommentDraft("");
    setEditingCommentInternal(false);
    setEditingCommentRemovedAttachmentKeys([]);
    if (commentEditEditorRef.current) commentEditEditorRef.current.innerHTML = "";
  };
  const toggleEditingCommentAttachmentRemoval = attachment => {
    const key = getAttachmentRemovalKey(attachment);
    if (!key) return;
    setEditingCommentRemovedAttachmentKeys(prev => prev.includes(key) ? prev.filter(item => item !== key) : [...prev, key]);
  };
  const saveEditComment = async () => {
    if (!ticketId || !editingCommentId || savingCommentEdit) return;
    const draftRaw = String(commentEditEditorRef.current?.innerHTML || editingCommentDraft || "").trim();
    const draftText = htmlToPlainText(draftRaw).trim();
    const editingComment = (ticket?.comments || []).find(comment => String(comment.id) === String(editingCommentId));
    const remainingAttachments = (editingComment?.attachments || []).filter(attachment => !isAttachmentMarkedForRemoval(attachment, editingCommentRemovedAttachmentKeys));
    if (!draftText && remainingAttachments.length === 0) {
      toast.error(copy.toasts.messageEmpty);
      return;
    }
    const {
      removeAttachmentIds,
      removeAttachmentPaths
    } = splitRemovedAttachmentKeys(editingCommentRemovedAttachmentKeys);
    setSavingCommentEdit(true);
    try {
      const updatedComment = await updateTicketComment(ticketId, editingCommentId, draftRaw, {
        removeAttachmentIds,
        removeAttachmentPaths,
        isInternal: editingCommentInternal
      });
      const normalizedAttachments = Array.isArray(updatedComment?.attachments) ? updatedComment.attachments.map(normalizeAttachment).filter(Boolean) : remainingAttachments;
      setTicket(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          comments: (prev.comments || []).map(comment => String(comment.id) === String(editingCommentId) ? {
            ...comment,
            content: updatedComment?.content ?? draftRaw,
            is_internal: typeof updatedComment?.is_internal === "boolean" ? updatedComment.is_internal : editingCommentInternal,
            updated_at: updatedComment?.updated_at || new Date().toISOString(),
            attachments: normalizedAttachments
          } : comment),
          updated_at: new Date().toISOString()
        };
      });
      cancelEditComment(true);
      toast.success(copy.toasts.messageEdited);
    } catch (error) {
      toast.error(error.message || copy.toasts.messageEditError);
    } finally {
      setSavingCommentEdit(false);
    }
  };
  const deleteComment = async commentId => {
    if (!ticketId || !commentId || deletingCommentId) return;
    if (!window.confirm(copy.confirms.deleteComment)) return;
    setDeletingCommentId(commentId);
    try {
      await deleteTicketComment(ticketId, commentId);
      const nextComments = (ticket?.comments || []).filter(comment => String(comment.id) !== String(commentId));
      setTicket(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          comments: nextComments,
          updated_at: new Date().toISOString()
        };
      });
      setSideConversations(buildSideConversationsFromComments(nextComments));
      if (String(editingCommentId) === String(commentId)) {
        cancelEditComment(true);
      }
      toast.success(copy.toasts.messageDeleted);
    } catch (error) {
      toast.error(error.message || copy.toasts.messageDeleteError);
    } finally {
      setDeletingCommentId(null);
    }
  };
  useLayoutEffect(() => {
    if (!editingCommentId || !commentEditEditorRef.current) return;
    commentEditEditorRef.current.innerHTML = editingCommentDraft;
    commentEditEditorRef.current.focus();
  }, [editingCommentId]);
  const requesterInteractions = useMemo(() => {
    if (!ticket) return [];
    const requesterContactId = ticket.requester_contact_id || null;
    const requesterUserId = ticket.requester_user_id || null;
    return allTickets.filter(row => String(row.id) !== String(ticket.id)).filter(row => {
      if (requesterContactId) return String(row.requester_contact_id) === String(requesterContactId);
      if (requesterUserId) return String(row.requester_user_id) === String(requesterUserId);
      return false;
    }).sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime()).slice(0, 8);
  }, [allTickets, ticket]);
  const visibleLinkedTickets = useMemo(() => linkedTicketsExpanded ? linkedTickets : linkedTickets.slice(0, RIGHT_PANE_LINKED_PREVIEW), [linkedTickets, linkedTicketsExpanded]);
  const hasMoreLinkedTickets = linkedTickets.length > RIGHT_PANE_LINKED_PREVIEW;
  const visibleLinkedEquipments = useMemo(() => linkedEquipmentsExpanded ? linkedEquipments : linkedEquipments.slice(0, RIGHT_PANE_LINKED_PREVIEW), [linkedEquipments, linkedEquipmentsExpanded]);
  const hasMoreLinkedEquipments = linkedEquipments.length > RIGHT_PANE_LINKED_PREVIEW;
  const visibleRequesterInteractions = useMemo(() => historyExpanded ? requesterInteractions : requesterInteractions.slice(0, RIGHT_PANE_HISTORY_PREVIEW), [requesterInteractions, historyExpanded]);
  const hasMoreRequesterInteractions = requesterInteractions.length > RIGHT_PANE_HISTORY_PREVIEW;
  const currentStatusLabel = useMemo(() => copy.getStatusLabel(ticket?.status === "open" ? "new" : ticket?.status), [ticket, copy]);
  const ticketTypeOptions = useMemo(() => {
    if (isSalesTicket(ticket) || isSalesTicket(editForm?.type, editForm?.category)) {
      return [{
        key: "prestation",
        label: salesCopy.kinds?.prestation?.label || "Prestation",
        hint: salesCopy.kinds?.prestation?.hint || "Prestation",
        icon: "mdi:briefcase-edit-outline"
      }, {
        key: "installation",
        label: salesCopy.kinds?.installation?.label || "Installation",
        hint: salesCopy.kinds?.installation?.hint || "Installation",
        icon: "mdi:tools"
      }];
    }
    return copy.ticketTypes || [];
  }, [ticket, editForm?.type, editForm?.category, copy.ticketTypes, salesCopy]);
  useEffect(() => {
    if (!supportCredit?.eligible) {
      setConsumeSupportCredit(false);
      setRefundSupportCredit(false);
      return;
    }
    setConsumeSupportCredit(!supportCredit.consumed && Number(supportCredit.balance || 0) > 0);
    setRefundSupportCredit(false);
  }, [ticket?.id, supportCredit?.eligible, supportCredit?.consumed, supportCredit?.balance]);
  useEffect(() => {
    if (!resolveModalOpen) return;
    const packs = supportCredit?.packs || [];
    const amounts = buildDefaultResolveCreditAmounts(packs, {
      defaultAmount: 1,
      legacyBalance: supportCredit?.balance ?? 0
    });
    const hasCredits = supportCredit?.eligible && !supportCredit?.consumed && Object.keys(amounts).length > 0;
    setResolveCreditAmounts(amounts);
    setResolveCreditEnabled(Boolean(hasCredits));
  }, [resolveModalOpen, supportCredit?.eligible, supportCredit?.consumed, supportCredit?.balance, supportCredit?.packs]);
  const handleConfirmResolve = async ({
    reason,
    interventionType,
    actionType,
    consumeSupportCredit: useCredit,
    supportCreditDebits = null
  }) => {
    if (!ticketId || savingResolve) return;
    setSavingResolve(true);
    try {
      const pendingReply = pendingResolveReplyRef.current;
      if (pendingReply) {
        copy.validateAttachmentFiles(pendingReply.files || []);
        let commentResult = null;
        if (pendingReply.files?.length > 0) {
          commentResult = await addTicketCommentWithAttachments(ticketId, {
            content: resolveTemplateVariables(pendingReply.content),
            isInternal: pendingReply.internal,
            files: pendingReply.files
          });
        } else {
          commentResult = await addTicketComment(ticketId, resolveTemplateVariables(pendingReply.content), pendingReply.internal);
        }
        notifyWhatsAppDelivery(commentResult?.whatsappDelivery, copy);
        setCommentDraft("");
        if (commentEditorRef.current) commentEditorRef.current.innerHTML = "";
        setCommentInternal(false);
        setAttachmentFiles([]);
        resetVaultArchiveOptions();
        pendingResolveReplyRef.current = null;
        setResolvePendingReply(false);
        if (pendingReply.vaultArchiveEntries?.length > 0) {
          await maybeArchiveAttachmentsToVault(pendingReply.vaultArchiveEntries);
        } else if (pendingReply.vaultArchive && pendingReply.files?.length > 0) {
          // Legacy pending payload shape (global options).
          await maybeArchiveAttachmentsToVault(
            pendingReply.files.map(file => ({
              file,
              category: pendingReply.vaultArchive.category,
              description: pendingReply.vaultArchive.description,
              visibleToClient: pendingReply.vaultArchive.visibleToClient
            }))
          );
        }
      }
      const debits = Array.isArray(supportCreditDebits) && supportCreditDebits.length > 0 ? supportCreditDebits : useCredit ? buildSupportCreditDebitsPayload(resolveCreditAmounts, supportCredit?.packs) : [];
      const updated = await resolveTicketWithValidation(ticketId, {
        reason,
        interventionType,
        actionType,
        consumeSupportCredit: debits.length > 0,
        supportCreditDebits: debits
      });
      setTicket(updated);
      setResolveModalOpen(false);
      toast.success(copy.toasts.resolvedPendingValidation);
      emitNotificationsUpdated();
      await loadDetail();
      if (resolveAfterReplyRef.current) {
        resolveAfterReplyRef.current = false;
        await advanceToNextRandomTicket(onNavigate, ticketId);
        setPlayMode(isTicketPlayModeEnabled());
      }
    } catch (error) {
      toast.error(error.message || copy.toasts.resolveError);
    } finally {
      setSavingResolve(false);
    }
  };
  const confirmReopenTicket = async reason => {
    if (!ticketId || reopeningTicket || isDeleted || !isTicketClosed || !reason?.trim()) return;
    const trimmedReason = reason.trim();
    setReopeningTicket(true);
    setTicket(prev => prev ? {
      ...prev,
      status: "in_progress",
      closed_at: null,
      resolved_at: null
    } : prev);
    setEditForm(prev => ({
      ...prev,
      status: "in_progress"
    }));
    try {
      await updateTicketStatus(ticketId, "in_progress", trimmedReason);
      setReopenModalOpen(false);
      toast.success(copy.toasts.ticketReopened);
      emitNotificationsUpdated();
      await loadDetail({
        silent: true
      });
    } catch (error) {
      toast.error(error.message || copy.toasts.reopenError);
      await loadDetail({
        silent: true
      });
    } finally {
      setReopeningTicket(false);
    }
  };
  useEffect(() => {
    setSideConversations(prev => {
      const rebuilt = buildSideConversationsFromComments(ticket?.comments || []);
      if (!Array.isArray(prev) || prev.length === 0) return rebuilt;
      const prevById = new Map(prev.map(conv => [String(conv.id), conv]));
      return rebuilt.map(conv => {
        const existing = prevById.get(String(conv.id));
        if (!existing) return conv;
        return {
          ...conv,
          messages: Array.isArray(existing.messages) ? existing.messages : []
        };
      });
    });
  }, [ticket]);
  useEffect(() => {
    setLinkedEquipments(buildLinkedEquipmentsFromTicket(ticket));
  }, [ticket]);
  useEffect(() => {
    const clientId = effectiveTicketClientId;
    if (!clientId) {
      setClientEquipments([]);
      return;
    }
    let cancelled = false;
    fetchClientModules(clientId).then(modulesData => {
      if (cancelled) return;
      const normalized = mapClientEquipmentsForTicketLink(clientId, modulesData?.equipements || {});
      if (normalized.length > 0) {
        setClientEquipments(normalized);
        return;
      }
      return fetchClients().then(clientsRows => {
        if (cancelled) return;
        const targetClient = (Array.isArray(clientsRows) ? clientsRows : []).find(row => String(row.id) === String(clientId));
        const fallbackList = mapClientEquipmentsForTicketLink(clientId, targetClient?.equipements || {});
        setClientEquipments(fallbackList);
      }).catch(() => {
        if (!cancelled) setClientEquipments([]);
      });
    }).catch(() => {
      if (!cancelled) setClientEquipments([]);
    });
    return () => {
      cancelled = true;
    };
  }, [effectiveTicketClientId]);
  useEffect(() => {
    const clientId = effectiveTicketClientId;
    if (!clientId) {
      setClientSupportCreditBalance(null);
      setClientSupportCreditPacks([]);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setLoadingClientCredits(true);
      try {
        const data = await fetchClientSupportCredits(clientId);
        if (!cancelled) {
          setClientSupportCreditBalance(Number(data?.balance ?? 0));
          setClientSupportCreditPacks(Array.isArray(data?.packs) ? data.packs : []);
        }
      } catch {
        if (!cancelled) {
          setClientSupportCreditBalance(null);
          setClientSupportCreditPacks([]);
        }
      } finally {
        if (!cancelled) setLoadingClientCredits(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [effectiveTicketClientId]);
  useEffect(() => {
    const applyConfig = config => {
      setAvailableCommentTemplates(Array.isArray(config?.commentTemplates) ? config.commentTemplates : []);
      setAvailableMacros(Array.isArray(config?.macros) ? config.macros : []);
    };
    applyConfig(getTicketAutomationConfig());
    fetchTicketAutomationConfig().then(config => applyConfig(config)).catch(() => {});
    const unsubscribe = subscribeTicketAutomationConfig(applyConfig);
    return unsubscribe;
  }, []);
  useEffect(() => {
    let cancelled = false;
    fetchCurrentUser().then(currentUser => {
      if (cancelled) return;
      setChatUiSettings(normalizeTicketChatUiSettings(currentUser?.ticket_chat_ui_settings));
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    setShowTimelineScrollTop(false);
  }, [ticketId]);
  const updateTimelineScrollTopVisibility = useCallback(() => {
    const timelineEl = timelineRef.current;
    if (!timelineEl) {
      setShowTimelineScrollTop(false);
      return;
    }
    const scrollable = timelineEl.scrollHeight - timelineEl.clientHeight > 80;
    setShowTimelineScrollTop(scrollable && timelineEl.scrollTop > 80);
  }, []);
  const scrollTimelineToBottom = useCallback(() => {
    const timelineEl = timelineRef.current;
    if (!timelineEl) return;
    timelineEl.scrollTop = timelineEl.scrollHeight;
    updateTimelineScrollTopVisibility();
  }, [updateTimelineScrollTopVisibility]);
  const scrollTimelineToTop = useCallback(() => {
    timelineRef.current?.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }, []);
  const handleTimelineScroll = useCallback(() => {
    updateTimelineScrollTopVisibility();
  }, [updateTimelineScrollTopVisibility]);
  useLayoutEffect(() => {
    if (loading || !ticket) return undefined;
    scrollTimelineToBottom();
    const rafId = window.requestAnimationFrame(scrollTimelineToBottom);
    const timeoutIds = [50, 200, 500].map(delay => window.setTimeout(scrollTimelineToBottom, delay));
    return () => {
      window.cancelAnimationFrame(rafId);
      timeoutIds.forEach(id => window.clearTimeout(id));
    };
  }, [ticketId, loading, ticket?.comments?.length, scrollTimelineToBottom]);
  useEffect(() => {
    const handleClickOutsideSideConversation = event => {
      const target = event.target;
      if (showSideConversationModal) {
        const insideNewPopup = newSideConversationPopupRef.current?.contains(target);
        if (!insideNewPopup) {
          setShowSideConversationModal(false);
          resetSideConversationForm();
        }
      }
      if (activeSideConversationId) {
        const insideActivePopup = activeSideConversationPopupRef.current?.contains(target);
        if (!insideActivePopup) {
          setActiveSideConversationId(null);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutsideSideConversation);
    return () => document.removeEventListener("mousedown", handleClickOutsideSideConversation);
  }, [showSideConversationModal, activeSideConversationId, resetSideConversationForm]);
  useEffect(() => {
    if (!ticketOptionsMenuOpen) return undefined;
    const handleClickOutsideTicketOptions = event => {
      const target = event.target;
      if (ticketOptionsWrapRef.current?.contains(target) || ticketOptionsMenuRef.current?.contains(target)) {
        return;
      }
      setTicketOptionsMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutsideTicketOptions);
    return () => document.removeEventListener("mousedown", handleClickOutsideTicketOptions);
  }, [ticketOptionsMenuOpen]);
  useLayoutEffect(() => {
    if (!ticketOptionsMenuOpen) {
      setTicketOptionsMenuStyle(null);
      return undefined;
    }
    const updateMenuPosition = () => {
      const anchor = ticketOptionsWrapRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      setTicketOptionsMenuStyle({
        top: `${Math.round(rect.bottom + 6)}px`,
        left: `${Math.round(rect.right)}px`
      });
    };
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [ticketOptionsMenuOpen]);
  useEffect(() => {
    if (!showSideConversationModal) return undefined;
    const updatePopupPosition = () => {
      const btn = newSideConversationBtnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      setNewSideConversationPopupStyle({
        left: `${Math.round(rect.right + 8)}px`,
        top: `${Math.round(rect.bottom + 8)}px`,
        transform: "none"
      });
    };
    updatePopupPosition();
    window.addEventListener("resize", updatePopupPosition);
    window.addEventListener("scroll", updatePopupPosition, true);
    return () => {
      window.removeEventListener("resize", updatePopupPosition);
      window.removeEventListener("scroll", updatePopupPosition, true);
    };
  }, [showSideConversationModal]);
  useEffect(() => {
    if (!activeSideConversationId) {
      setActiveSideConversationPopupStyle(null);
      return undefined;
    }
    const updatePopupPosition = () => {
      const anchorEl = sideConversationChipRefs.current[String(activeSideConversationId)];
      if (!anchorEl) {
        setActiveSideConversationPopupStyle(null);
        return;
      }
      const rect = anchorEl.getBoundingClientRect();
      setActiveSideConversationPopupStyle({
        left: `${Math.round(rect.right + 8)}px`,
        top: `${Math.round(rect.bottom + 8)}px`,
        transform: "none"
      });
    };
    updatePopupPosition();
    window.addEventListener("resize", updatePopupPosition);
    window.addEventListener("scroll", updatePopupPosition, true);
    return () => {
      window.removeEventListener("resize", updatePopupPosition);
      window.removeEventListener("scroll", updatePopupPosition, true);
    };
  }, [activeSideConversationId]);
  const getInitials = name => {
    const cleaned = String(name || "").trim();
    if (!cleaned) return "A";
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  };
  const resolveCommentAuthorName = comment => {
    const commentAuthorId = comment?.author_user_id || comment?.authorUserId || comment?.user_id || comment?.userId;
    if (currentUserId && String(commentAuthorId) === String(currentUserId)) {
      return currentUserDisplayName;
    }
    if (comment?.author_name) return comment.author_name;
    if (commentAuthorId) return resolveUserLabel(commentAuthorId);
    return copy.agentFallback;
  };
  const resolveCommentAuthorAvatar = comment => {
    if (comment?.author_avatar) return comment.author_avatar;
    const commentAuthorId = comment?.author_user_id || comment?.authorUserId || comment?.user_id || comment?.userId;
    if (currentUserId && String(commentAuthorId) === String(currentUserId)) {
      return user?.avatar || currentAgentUser?.avatar || null;
    }
    if (commentAuthorId) {
      const agentUser = users.find(u => String(u.id) === String(commentAuthorId) || String(u.uuid) === String(commentAuthorId) || String(u.user_id) === String(commentAuthorId));
      if (agentUser?.avatar) return agentUser.avatar;
    }
    return null;
  };
  const resolveCommentDisplayContent = comment => {
    const splitEvent = parseSplitTicketEvent(comment?.content);
    if (splitEvent) {
      const displayNumber = splitEvent.ticketNumber ? `#${splitEvent.ticketNumber}` : `#${splitEvent.linkedTicketId}`;
      if (splitEvent.direction === "from") {
        return `${copy.commentDisplay.splitFrom}${displayNumber}${splitEvent.title ? ` - ${splitEvent.title}` : ""}`;
      }
      return `${copy.commentDisplay.splitTo}${displayNumber}${splitEvent.title ? ` - ${splitEvent.title}` : ""}`;
    }
    const linkedTicketEvent = parseLinkedTicketEvent(comment?.content);
    if (linkedTicketEvent) {
      const displayNumber = linkedTicketEvent.ticketNumber ? `#${linkedTicketEvent.ticketNumber}` : `#${linkedTicketEvent.linkedTicketId}`;
      return linkedTicketEvent.event === "removed" ? `${copy.commentDisplay.linkedRemoved}${displayNumber}` : `${copy.commentDisplay.linkedAdded}${displayNumber} - ${linkedTicketEvent.title || copy.linkedTicketFallback}`;
    }
    const linkedEquipmentEvent = parseLinkedEquipmentEvent(comment?.content);
    if (linkedEquipmentEvent) {
      const label = formatLinkedEquipmentEventLabel(linkedEquipmentEvent, {
        locale,
        separator: " - "
      });
      return linkedEquipmentEvent.event === "removed" ? `${copy.commentDisplay.equipmentRemoved}${label}` : `${copy.commentDisplay.equipmentAdded}${label}`;
    }
    const event = parseSideConversationEvent(comment?.content);
    if (!event) return comment?.content;
    const subject = event.subject || copy.commentDisplay.sideSubjectFallback;
    if (event.event === "closed") {
      return interpolate(copy.commentDisplay.sideClosed, {
        subject
      });
    }
    if (event.event === "reopened") {
      return interpolate(copy.commentDisplay.sideReopened, {
        subject
      });
    }
    return interpolate(copy.commentDisplay.sideOpened, {
      subject
    });
  };
  const openLinkedTicketDetail = (linkedTicketId, linkedTicketNumber, linkedTicketTitle) => {
    if (!linkedTicketId) return;
    onNavigate?.("TicketDetail", {
      ticketId: linkedTicketId,
      ticketNumber: linkedTicketNumber || undefined,
      title: linkedTicketTitle || undefined
    });
  };
  const openExclusionModal = () => {
    setExclusionModalOpen(true);
    setTicketOptionsMenuOpen(false);
  };
  const closeExclusionModal = () => {
    if (savingExclusion) return;
    setExclusionModalOpen(false);
  };
  const addCurrentTicketToExclusions = async rule => {
    if (!ticket || !rule) return;
    const criteria = Array.isArray(rule.criteria) ? rule.criteria : [];
    const hasValue = criteria.some(criterion => String(criterion?.value || "").trim());
    if (!hasValue) {
      toast.error(copy.toasts.exclusionValueRequired);
      return;
    }
    setSavingExclusion(true);
    try {
      const currentConfig = await fetchTicketAutomationConfig();
      const nextRules = Array.isArray(currentConfig?.exclusionRules) ? [...currentConfig.exclusionRules] : [];
      nextRules.push(rule);
      await saveTicketAutomationConfig({
        ...currentConfig,
        exclusionRules: nextRules
      });
      toast.success(copy.toasts.exclusionAdded);
      setExclusionModalOpen(false);
    } catch (error) {
      toast.error(error?.message || copy.toasts.exclusionError);
    } finally {
      setSavingExclusion(false);
    }
  };
  const openSplitModal = () => {
    if (!Array.isArray(availableLinkTargets) || availableLinkTargets.length === 0) {
      toast.error(copy.toasts.splitNoTarget);
      return;
    }
    setSplitModalOpen(true);
    setTicketOptionsMenuOpen(false);
  };
  const closeSplitModal = () => {
    if (savingSplit) return;
    setSplitModalOpen(false);
  };
  const splitCurrentTicket = async selectedTarget => {
    if (!ticket || !ticketId || !selectedTarget) return;
    setSavingSplit(true);
    try {
      const closedTicketNumber = ticket.ticket_number || ticket.id;
      const safeClosedTitle = String(ticket.title || "Split ticket").replace(/[\\\]]/g, "");
      const safeClosedNumber = String(closedTicketNumber || ticketId).replace(/[\\\]]/g, "");
      const safeTargetTitle = String(selectedTarget.title || "Ticket destinataire").replace(/[\\\]]/g, "");
      const safeTargetNumber = String(selectedTarget.ticket_number || selectedTarget.id || "").replace(/[\\\]]/g, "");
      await updateTicketStatus(ticketId, "closed", `Ticket split to #${selectedTarget.ticket_number || selectedTarget.id}`);
      const splitSourceComment = `[Split ticket] [direction:to] [linked_ticket_id:${selectedTarget.id}] ` + `[ticket_number:${safeTargetNumber}] [title:${safeTargetTitle}]`;
      await addTicketComment(ticketId, splitSourceComment, true);
      const splitInfoComment = `[Split ticket] [direction:from] [linked_ticket_id:${ticketId}] ` + `[ticket_number:${safeClosedNumber}] [title:${safeClosedTitle}]`;
      await addTicketComment(selectedTarget.id, splitInfoComment, true);
      await loadDetail();
      toast.success(copy.formatSplitSuccess(safeClosedNumber, safeTargetNumber));
      setSplitModalOpen(false);
    } catch (error) {
      toast.error(error?.message || copy.toasts.splitError);
    } finally {
      setSavingSplit(false);
    }
  };
  const openReminderModal = () => {
    if (isReadOnly || !ticket) return;
    if (isCommunity) {
      setProPromoFeature("ticketPlanningAlert");
      return;
    }
    setReminderModalOpen(true);
  };
  const closeReminderModal = () => {
    if (savingReminder || deletingReminder) return;
    setReminderModalOpen(false);
  };
  const validationRequests = useMemo(
    () => (Array.isArray(ticket?.validationRequests) ? ticket.validationRequests : []),
    [ticket?.validationRequests]
  );
  const pendingValidationRequest = useMemo(
    () => validationRequests.find(r => r?.isPending || r?.status === "pending") || null,
    [validationRequests]
  );
  const openValidationModal = (request = null) => {
    if (isReadOnly) return;
    if (!request && pendingValidationRequest) {
      toast.warn(validationCopy.toastPendingExists);
      return;
    }
    setEditingValidationRequest(request);
    setValidationModalOpen(true);
  };
  const closeValidationModal = () => {
    if (savingValidationRequest) return;
    setValidationModalOpen(false);
    setEditingValidationRequest(null);
  };
  const submitValidationRequest = async ({ validatorUserId, message }) => {
    if (!ticketId || !validatorUserId) return;
    setSavingValidationRequest(true);
    try {
      if (editingValidationRequest?.id) {
        await updateTicketValidationRequest(ticketId, editingValidationRequest.id, { validatorUserId, message });
        toast.success(validationCopy.toastUpdated);
      } else {
        await createTicketValidationRequest(ticketId, { validatorUserId, message });
        toast.success(validationCopy.toastOk);
      }
      closeValidationModal();
      emitNotificationsUpdated();
      await loadDetail({ silent: true });
    } catch (error) {
      toast.error(error?.message || (editingValidationRequest?.id ? validationCopy.toastUpdateError : validationCopy.toastError));
    } finally {
      setSavingValidationRequest(false);
    }
  };
  const handleValidationRespond = async (request, decision, responseMessage = "") => {
    if (!ticketId || !request?.id) return;
    setRespondingValidationId(request.id);
    try {
      await respondTicketValidationRequest(ticketId, request.id, { decision, responseMessage });
      toast.success(decision === "approved" ? validationCopy.toastApproved : validationCopy.toastRejected);
      emitNotificationsUpdated();
      await loadDetail({ silent: true });
    } catch (error) {
      toast.error(error?.message || validationCopy.toastRespondError);
    } finally {
      setRespondingValidationId(null);
    }
  };
  const saveTicketReminder = async ({
    title,
    date,
    time,
    note
  }) => {
    if (!ticket || !ticketId) return;
    const payload = buildReminderEventPayload({
      ticket,
      title,
      date,
      time,
      note,
      assignedUserId: user?.id,
      requesterName: requesterDisplayName !== "-" ? requesterDisplayName : ""
    });
    if (!payload) {
      toast.error(copy.toasts.reminderInvalidFields);
      return;
    }
    setSavingReminder(true);
    try {
      if (ticketReminder?.id) {
        await updateEvent(ticketReminder.id, payload);
        toast.success(copy.toasts.reminderUpdated);
      } else {
        await createEvent(payload);
        toast.success(copy.toasts.reminderAdded);
      }
      await loadTicketReminder(ticketId);
      setReminderModalOpen(false);
    } catch (error) {
      toast.error(error?.message || copy.toasts.reminderSaveError);
    } finally {
      setSavingReminder(false);
    }
  };
  const deleteTicketReminder = async () => {
    if (!ticketReminder?.id) return;
    if (!window.confirm(copy.confirms.deleteReminder)) return;
    setDeletingReminder(true);
    try {
      await deleteEvent(ticketReminder.id);
      setTicketReminder(null);
      setReminderModalOpen(false);
      toast.success(copy.toasts.reminderDeleted);
    } catch (error) {
      toast.error(error?.message || copy.toasts.reminderDeleteError);
    } finally {
      setDeletingReminder(false);
    }
  };
  const openLinkedEquipmentDetail = (equipmentId, equipmentName, equipmentType) => {
    if (!equipmentId) return;
    const matched = clientEquipments.find(eq => String(eq.id) === String(equipmentId));
    const payload = matched || {
      id: equipmentId,
      name: equipmentName || `Hardware #${equipmentId}`,
      type: equipmentType || "",
      clientId: effectiveTicketClientId || ticket?.client_id || null,
      clientName: breadcrumbClientLabel || clientLabel || undefined
    };
    onNavigate?.("EquipmentDetail", payload);
  };
  const renderResolutionCommentCard = (comment, validation) => {
    const parsed = parseResolutionProposalComment(comment?.content);
    const interventionType = getLocalizedSolutionCatalogLabel(validation?.interventionType || parsed?.interventionType || "", locale);
    const actionType = getLocalizedSolutionCatalogLabel(validation?.actionType || parsed?.actionType || "", locale);
    const reason = validation?.resolutionReason || parsed?.reason || "";
    const status = copy.getResolutionStatusPresentation(validation);
    return <div className={styles.resolutionCommentCompact}>
        <span className={`${styles.resolutionCommentStatus} ${styles[`resolutionCommentStatus_${status.variant}`] || ""}`.trim()}>
          <Icon icon={status.icon} aria-hidden />
          {status.title}
        </span>
        {interventionType ? <span className={styles.validationTag}>{interventionType}</span> : null}
        {actionType ? <span className={styles.validationTag}>{actionType}</span> : null}
        {validation?.isPending && validation?.autoCloseAt ? <span className={styles.resolutionCommentMeta}>
            {copy.formatResolutionDeadline(copy.formatDateTime(validation.autoCloseAt))}
          </span> : null}
        {reason ? <span className={styles.resolutionCommentReason}>{reason}</span> : null}
      </div>;
  };
  const renderCommentBody = comment => {
    const splitEvent = parseSplitTicketEvent(comment?.content);
    if (splitEvent) {
      const linkedTicketNumber = splitEvent.ticketNumber || splitEvent.linkedTicketId;
      return <>
          {splitEvent.direction === "from" ? copy.commentDisplay.splitFrom : copy.commentDisplay.splitTo}
          <button type="button" className={styles.linkLikeBtn} onClick={() => openLinkedTicketDetail(splitEvent.linkedTicketId, splitEvent.ticketNumber, splitEvent.title)}>
            {`#${linkedTicketNumber} ${splitEvent.title ? `- ${splitEvent.title}` : ""}`}
          </button>
        </>;
    }
    const linkedTicketEvent = parseLinkedTicketEvent(comment?.content);
    if (linkedTicketEvent) {
      const linkedTicketNumber = linkedTicketEvent.ticketNumber || linkedTicketEvent.linkedTicketId;
      return <>
          {linkedTicketEvent.event === "removed" ? copy.commentDisplay.linkedRemoved : copy.commentDisplay.linkedAdded}
          <button type="button" className={styles.linkLikeBtn} onClick={() => openLinkedTicketDetail(linkedTicketEvent.linkedTicketId, linkedTicketEvent.ticketNumber, linkedTicketEvent.title)}>
            {`#${linkedTicketNumber} ${linkedTicketEvent.title ? `- ${linkedTicketEvent.title}` : ""}`}
          </button>
        </>;
    }
    const linkedEquipmentEvent = parseLinkedEquipmentEvent(comment?.content);
    if (linkedEquipmentEvent) {
      return <>
          {linkedEquipmentEvent.event === "removed" ? copy.commentDisplay.equipmentRemoved : copy.commentDisplay.equipmentAdded}
          <button type="button" className={styles.linkLikeBtn} onClick={() => openLinkedEquipmentDetail(linkedEquipmentEvent.equipmentId, linkedEquipmentEvent.name, linkedEquipmentEvent.type)}>
            {formatLinkedEquipmentEventLabel(linkedEquipmentEvent, {
            locale,
            separator: " - "
          })}
          </button>
          {(linkedEquipmentEvent.warranty || linkedEquipmentEvent.licenses) && <>
              {" "}
              (
              {linkedEquipmentEvent.warranty ? interpolate(copy.commentDisplay.warranty, {
            value: linkedEquipmentEvent.warranty
          }) : ""}
              {linkedEquipmentEvent.warranty && linkedEquipmentEvent.licenses ? " | " : ""}
              {linkedEquipmentEvent.licenses ? interpolate(copy.commentDisplay.licenses, {
            value: linkedEquipmentEvent.licenses
          }) : ""}
              )
            </>}
        </>;
    }
    return renderCommentContent(resolveCommentDisplayContent(comment), comment.attachments);
  };
  const renderCommentContent = (content, attachments = []) => {
    const raw = String(content || "");
    if (/^\s*\[Incoming email\]/i.test(raw)) {
      return <IncomingEmailMessage content={raw} attachments={attachments} attachmentLinkClassName={styles.attachmentLink} />;
    }
    const looksLikeHtml = contentLooksLikeHtml(raw);
    if (looksLikeHtml) {
      const safeHtml = sanitizeTicketCommentHtml(raw);
      return <div dangerouslySetInnerHTML={{
        __html: safeHtml
      }} />;
    }
    const withoutLegacyAnchors = raw.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, (_match, href, label) => `${label || copy.linkFallback} (${href})`);
    const urlRegex = /(https?:\/\/[^\s)]+)(\)?)/g;
    const lines = withoutLegacyAnchors.split("\n");
    return lines.map((line, lineIndex) => {
      urlRegex.lastIndex = 0;
      const parts = [];
      let lastIndex = 0;
      let match;
      while ((match = urlRegex.exec(line)) !== null) {
        const [full, url] = match;
        const normalizedUrl = normalizeHttpUrl(url);
        const index = match.index;
        if (index > lastIndex) {
          parts.push(line.slice(lastIndex, index));
        }
        if (normalizedUrl) {
          parts.push(<a key={`url-${lineIndex}-${index}`} href={normalizedUrl} target="_blank" rel="noopener noreferrer" className={styles.attachmentLink}>
              {url}
            </a>);
        } else {
          parts.push(url);
        }
        lastIndex = index + full.length;
      }
      if (lastIndex < line.length) {
        parts.push(line.slice(lastIndex));
      }
      return <React.Fragment key={`line-${lineIndex}`}>
          {parts.length > 0 ? parts : line}
          {lineIndex < lines.length - 1 ? <br /> : null}
        </React.Fragment>;
    });
  };
  const isImageAttachment = attachment => {
    const mime = String(attachment?.mime_type || "").toLowerCase();
    if (mime.startsWith("image/")) return true;
    const filename = String(attachment?.filename || attachment?.name || "");
    return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(filename);
  };
  const sortedSideConversations = useMemo(() => [...sideConversations].sort((a, b) => new Date(a.createdAt || a.updatedAt || 0).getTime() - new Date(b.createdAt || b.updatedAt || 0).getTime()), [sideConversations]);
  const descriptionAttachments = useMemo(() => {
    const all = Array.isArray(ticket?.attachments) ? ticket.attachments : [];
    return all.map(normalizeAttachment).filter(item => item && !item.comment_id);
  }, [ticket?.attachments]);
  const ticketTopBar = <header className={`${styles.ticketChromeBar} ${styles.ticketHeaderBar}`}>
      <button type="button" className={styles.ticketHeaderIconBtn} onClick={() => onNavigate?.(ticketsListDocType)} aria-label={copy.header.backAria} title={copy.header.backTitle}>
        <Icon icon="mdi:arrow-left" aria-hidden />
      </button>

      <div className={styles.ticketHeroTrack} aria-label={copy.header.ticketContextAria}>
        <h1 className={styles.ticketHeroTitle}>
          {ticket ? copy.formatTicketNumber(ticket.ticket_number || ticket.id) : copy.pageTitle}
        </h1>
        <span
          className={`${styles.ticketFamilyChip} ${isSalesTicketDetail ? styles.ticketFamilyChip_sales : styles.ticketFamilyChip_support}`}
          title={isSalesTicketDetail ? copy.header.familyServices : copy.header.familySupport}
        >
          <Icon icon={isSalesTicketDetail ? "mdi:briefcase-outline" : "mdi:message-processing-outline"} aria-hidden />
          {isSalesTicketDetail ? copy.header.familyServices : copy.header.familySupport}
        </span>
        <span className={styles.ticketHeroMetaDot} aria-hidden>
          ·
        </span>
        {ticket?.requester_contact_id ? <button type="button" className={styles.ticketHeroMetaLink} onClick={() => onNavigate?.("ContactDetail", {
        contactId: ticket.requester_contact_id
      })}>
            <Icon icon="mdi:account-outline" aria-hidden />
            {requesterDisplayName}
          </button> : <span className={styles.ticketHeroMetaItem}>
            <Icon icon="mdi:account-outline" aria-hidden />
            <span className={styles.ticketHeroMetaText}>{requesterDisplayName}</span>
            {renderOrphanRequesterActions("icon")}
          </span>}
        <span className={styles.ticketHeroMetaDot} aria-hidden>
          ·
        </span>
        {breadcrumbClientId ? <button type="button" className={styles.ticketHeroMetaLink} onClick={() => onNavigate?.("ContratDetail", {
        clientId: breadcrumbClientId,
        name: breadcrumbClientLabel
      })}>
            <Icon icon="mdi:office-building-outline" aria-hidden />
            {breadcrumbClientLabel}
          </button> : <span className={styles.ticketHeroMetaItem}>
            <Icon icon="mdi:office-building-outline" aria-hidden />
            {breadcrumbClientLabel}
          </span>}
        {!isSalesTicketDetail ? <ClientOnboardingBadge client={ticketClient} label={copy.header.onboardingBadge} /> : null}
        {!isSalesTicketDetail && !isCommunity && ticket && ticketSlaView.label && ticketSlaView.label !== "-" ? <>
            <span className={styles.ticketHeroMetaDot} aria-hidden>
              ·
            </span>
            <span className={`${styles.ticketBadge} ${styles[`ticketBadge_${ticketSlaView.tone}`] || styles.ticketBadge_ok}`} title={ticketSlaTitle}>
              <Icon icon="mdi:timer-outline" aria-hidden />
              {ticketSlaView.label}
            </span>
          </> : null}
        {ticket ? <div className={styles.ticketHeaderTools} aria-label={copy.header.sideConversationsAria}>
            <button ref={newSideConversationBtnRef} type="button" className={styles.ticketHeaderIconBtn} onClick={() => {
          setActiveSideConversationId(null);
          resetSideConversationForm();
          setShowSideConversationModal(true);
        }} title={copy.header.newSideConversationTitle} aria-label={copy.header.newSideConversationAria} disabled={isReadOnly}>
              <Icon icon="mdi:plus" aria-hidden />
            </button>
            {sortedSideConversations.slice(0, 3).map(conv => <button key={conv.id} ref={el => {
          if (el) {
            sideConversationChipRefs.current[String(conv.id)] = el;
          } else {
            delete sideConversationChipRefs.current[String(conv.id)];
          }
        }} type="button" className={`${styles.ticketHeaderIconBtn} ${String(activeSideConversationId) === String(conv.id) ? playModeStyles.diceBtnActive : ""}`} onClick={() => setActiveSideConversationId(conv.id)} title={conv.subject} aria-label={copy.formatSideConversationChipAria(conv.subject)} aria-pressed={String(activeSideConversationId) === String(conv.id)}>
                <Icon icon={conv.status === "done" ? "mdi:check-circle-outline" : "mdi:message-processing-outline"} aria-hidden />
              </button>)}
          </div> : null}
      </div>

      <div className={styles.ticketHeaderRight}>
        {!isDeleted && ticket && (canExclude || canSplit) ? <div className={styles.ticketOptionsWrap} ref={ticketOptionsWrapRef}>
            <button type="button" className={styles.ticketHeaderIconBtn} onClick={() => setTicketOptionsMenuOpen(prev => !prev)} title={copy.header.ticketOptionsTitle} aria-label={copy.header.ticketOptionsAria} aria-expanded={ticketOptionsMenuOpen} aria-haspopup="menu">
              <Icon icon="mdi:call-split" aria-hidden />
            </button>
            {ticketOptionsMenuOpen && ticketOptionsMenuStyle ? createPortal(<div ref={ticketOptionsMenuRef} className={`${styles.ticketOptionsMenu} ${styles.ticketOptionsMenuFixed}`} style={ticketOptionsMenuStyle} role="menu">
                    {canExclude ? <button type="button" className={styles.ticketOptionsMenuItem} role="menuitem" onClick={openExclusionModal}>
                      {copy.header.menuAddExclusion}
                    </button> : null}
                    {canSplit ? <button type="button" className={styles.ticketOptionsMenuItem} role="menuitem" onClick={openSplitModal}>
                      {copy.header.menuSplit}
                    </button> : null}
                  </div>, document.body) : null}
          </div> : null}
        {playMode && canRandomMode ? <span className={playModeStyles.playModeBanner}>
            <Icon icon="mdi:dice-5" aria-hidden />
            {copy.playMode.banner}
          </span> : null}
        <SmartTooltip content={isCommunity ? copy.header.reminderProTooltip : copy.reminderModal.formatReminderButtonTitle(ticketReminder)}>
          <div className={isCommunity ? styles.reminderProWrap : undefined}>
            <button type="button" className={`${styles.ticketHeaderIconBtn} ${!isCommunity && ticketReminder ? styles.reminderBtnActive : ""}`} onClick={openReminderModal} disabled={isReadOnly || !ticket} aria-label={isCommunity ? copy.header.reminderProAria : ticketReminder ? copy.header.reminderEditAria : copy.header.reminderScheduleAria}>
              <Icon icon={!isCommunity && ticketReminder ? "mdi:bell-ring" : "mdi:bell-outline"} aria-hidden />
            </button>
            {isCommunity ? <span className={styles.reminderProBadge}>{copy.header.proBadge}</span> : null}
          </div>
        </SmartTooltip>
        {canRandomMode ? <button type="button" className={`${styles.ticketHeaderIconBtn} ${playMode ? playModeStyles.diceBtnActive : ""}`} onClick={handleRandomTicketClick} disabled={loadingRandom || isReadOnly || !ticket} title={copy.playMode.tooltip} aria-label={copy.playMode.aria} aria-pressed={playMode}>
          <Icon icon={loadingRandom ? "mdi:loading" : "mdi:dice-5"} className={loadingRandom ? playModeStyles.spinning : undefined} />
        </button> : null}
      </div>
    </header>;
  if (!ticketId) {
    return <div className={`${layout.page} ${styles.ticketDetailPage} msp-page-grid`}>
        <div className={`${layout.shell} ${layout.shellWide} ${layout.shellFull} ${styles.shell}`}>
          {ticketTopBar}
          <div className={styles.emptyState}>{copy.empty.noTicketSelected}</div>
        </div>
      </div>;
  }
  return <div className={`${layout.page} ${styles.ticketDetailPage} msp-page-grid`}>
      <div className={`${layout.shell} ${layout.shellWide} ${layout.shellFull} ${styles.shell}`} style={{
      "--ticket-chat-text-size": `${Number(chatUiSettings?.textSizePx ?? 16)}px`,
      "--ticket-chat-message-spacing": `${Number(chatUiSettings?.messageSpacingPx ?? 10)}px`
    }}>
        {ticketTopBar}

      {loading ? <div className={styles.emptyState}>{copy.empty.loading}</div> : !ticket ? <div className={styles.emptyState}>{copy.empty.notFound}</div> : <div className={styles.workspace}>
        <div className={styles.layout}>
          <aside className={`${styles.leftPane} ${heroStyles.rightSidebarContent}`}>
            <RightPaneStaticSection title={copy.leftPane.properties} titleId="ticket-detail-properties-label" sectionClassName={styles.paneSectionOverflow} bodyClassName={`${styles.leftPanePropertiesBody} ${fs.settingsPanel}`}>
                <div className={fs.equipmentField}>
                  <label className={fs.equipmentFieldLabel}>{copy.leftPane.requester}</label>
                  <div className={fs.contactPicker} ref={requesterDropdownRef}>
                    <div className={`${fs.contactInputWrap} ${showRequesterDropdown ? fs.contactInputWrapOpen : ""}`}>
                      <Icon icon="mdi:magnify" className={fs.contactInputIcon} aria-hidden />
                      <input type="text" className={fs.contactInput} value={requesterSearch} placeholder={copy.searchContact} disabled={isReadOnly} aria-expanded={showRequesterDropdown} aria-haspopup="listbox" onChange={e => {
                      setRequesterSearch(e.target.value);
                      setShowRequesterDropdown(true);
                      setRequesterHighlight(0);
                    }} onFocus={() => setShowRequesterDropdown(true)} onKeyDown={e => {
                      if (!showRequesterDropdown || filteredRequesterContacts.length === 0) return;
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setRequesterHighlight(h => Math.min(h + 1, filteredRequesterContacts.length - 1));
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setRequesterHighlight(h => Math.max(h - 1, 0));
                      } else if (e.key === "Enter") {
                        e.preventDefault();
                        const picked = filteredRequesterContacts[requesterHighlight];
                        if (picked) selectRequester(picked);
                      } else if (e.key === "Escape") {
                        setShowRequesterDropdown(false);
                      }
                      }} />
                      {renderOrphanRequesterActions("input")}
                    </div>
                    {showRequesterDropdown && <div className={fs.contactDropdown} role="listbox">
                        {filteredRequesterContacts.length === 0 ? <div className={fs.contactEmpty}>
                            <span>{copy.noContactFound}</span>
                            {renderOrphanRequesterActions("empty")}
                          </div> : filteredRequesterContacts.map((contact, idx) => <button key={contact.id} type="button" role="option" className={`${fs.contactOption} ${requesterHighlight === idx ? fs.contactOptionActive : ""}`} onMouseEnter={() => setRequesterHighlight(idx)} onClick={() => selectRequester(contact)}>
                              <span className={fs.contactOptionName}>{getContactLabel(contact)}</span>
                            </button>)}
                      </div>}
                  </div>
                </div>

                <div className={fs.equipmentField}>
                  <label className={fs.equipmentFieldLabel}>{copy.leftPane.assignee}</label>
                  <div className={fs.contactPicker} ref={assigneeDropdownRef}>
                    <div className={`${fs.contactInputWrap} ${showAssigneeDropdown ? fs.contactInputWrapOpen : ""}`}>
                      <Icon icon="mdi:magnify" className={fs.contactInputIcon} aria-hidden />
                      <input className={fs.contactInput} type="text" value={assigneeSearch} autoComplete="off" placeholder={copy.searchAgent} disabled={isReadOnly} aria-expanded={showAssigneeDropdown} aria-haspopup="listbox" onChange={e => {
                      setAssigneeSearch(e.target.value);
                      setShowAssigneeDropdown(true);
                      setAssigneeHighlight(0);
                    }} onFocus={() => setShowAssigneeDropdown(true)} onKeyDown={e => {
                      if (!showAssigneeDropdown || filteredAssigneeOptions.length === 0) return;
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setAssigneeHighlight(h => Math.min(h + 1, filteredAssigneeOptions.length - 1));
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setAssigneeHighlight(h => Math.max(h - 1, 0));
                      } else if (e.key === "Enter") {
                        e.preventDefault();
                        const picked = filteredAssigneeOptions[assigneeHighlight];
                        if (picked) addAssignee(String(picked.id));
                      } else if (e.key === "Escape") {
                        setShowAssigneeDropdown(false);
                      }
                    }} />
                      <button type="button" className={fs.contactInputEndBtn} title={isCurrentUserAssigned ? (copy.leftPane?.assignMeAlready || copy.assignMeAlready) : (copy.leftPane?.assignMe || copy.assignMe)} aria-label={isCurrentUserAssigned ? (copy.leftPane?.assignMeAlready || copy.assignMeAlready) : (copy.leftPane?.assignMe || copy.assignMe)} disabled={isReadOnly || !currentUserId || isCurrentUserAssigned} onClick={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (currentUserId) addAssignee(String(currentUserId));
                    }}>
                        <Icon icon="mdi:account-plus" aria-hidden />
                      </button>
                    </div>
                    {showAssigneeDropdown && <div className={fs.contactDropdown} role="listbox">
                        {filteredAssigneeOptions.length === 0 ? <div className={fs.contactEmpty}>{copy.noAgentFound}</div> : filteredAssigneeOptions.map((opt, idx) => <button key={opt.id} type="button" role="option" className={`${fs.contactOption} ${assigneeHighlight === idx ? fs.contactOptionActive : ""}`} onMouseEnter={() => setAssigneeHighlight(idx)} onClick={() => addAssignee(String(opt.id))}>
                              <span className={fs.contactOptionName}>{opt.label}</span>
                            </button>)}
                      </div>}
                  </div>
                  <div className={fs.chipsWrap}>
                    {assigneeUserIds.length === 0 ? <span className={fs.emptyChipHint}>{copy.noAssignee}</span> : assigneeUserIds.map(userId => <span key={userId} className={fs.chip}>
                          {resolveUserLabel(userId)}
                          <button type="button" onClick={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeAssignee(userId);
                    }} disabled={isReadOnly} aria-label={`Retirer ${resolveUserLabel(userId)}`}>
                            ×
                          </button>
                        </span>)}
                  </div>
                </div>

                <div className={fs.equipmentField}>
                  <label className={fs.equipmentFieldLabel}>{copy.leftPane.follower}</label>
                  <div className={fs.contactPicker} ref={followerDropdownRef}>
                    <div className={`${fs.contactInputWrap} ${showFollowerDropdown ? fs.contactInputWrapOpen : ""}`}>
                      <Icon icon="mdi:magnify" className={fs.contactInputIcon} aria-hidden />
                      <input className={fs.contactInput} type="text" value={followerSearch} autoComplete="off" placeholder={copy.searchAgent} disabled={isReadOnly} aria-expanded={showFollowerDropdown} aria-haspopup="listbox" onChange={e => {
                      setFollowerSearch(e.target.value);
                      setShowFollowerDropdown(true);
                      setFollowerHighlight(0);
                    }} onFocus={() => setShowFollowerDropdown(true)} onKeyDown={e => {
                      if (!showFollowerDropdown || filteredFollowerOptions.length === 0) return;
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setFollowerHighlight(h => Math.min(h + 1, filteredFollowerOptions.length - 1));
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setFollowerHighlight(h => Math.max(h - 1, 0));
                      } else if (e.key === "Enter") {
                        e.preventDefault();
                        const picked = filteredFollowerOptions[followerHighlight];
                        if (picked) addWatcher(String(picked.id));
                      } else if (e.key === "Escape") {
                        setShowFollowerDropdown(false);
                      }
                    }} />
                    </div>
                    {showFollowerDropdown && <div className={fs.contactDropdown} role="listbox">
                        {filteredFollowerOptions.length === 0 ? <div className={fs.contactEmpty}>{copy.noAgentFound}</div> : filteredFollowerOptions.map((opt, idx) => <button key={opt.id} type="button" role="option" className={`${fs.contactOption} ${followerHighlight === idx ? fs.contactOptionActive : ""}`} onMouseEnter={() => setFollowerHighlight(idx)} onClick={() => addWatcher(String(opt.id))}>
                              <span className={fs.contactOptionName}>{opt.label}</span>
                            </button>)}
                      </div>}
                  </div>
                  <div className={fs.chipsWrap}>
                    {watcherUserIds.length === 0 ? <span className={fs.emptyChipHint}>{copy.noFollower}</span> : (ticket.watchers || []).map(w => <span key={w.user_id} className={fs.chip}>
                          {resolveUserLabel(w.user_id)}
                          <button type="button" onClick={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeWatcher(w.user_id);
                    }} disabled={isReadOnly} aria-label={copy.formatRemoveAgentAria(resolveUserLabel(w.user_id))}>
                            ×
                          </button>
                        </span>)}
                  </div>
                </div>

                <hr className={styles.paneSectionDivider} aria-hidden />

                <div className={fs.equipmentField}>
                  <label className={fs.equipmentFieldLabel} htmlFor="ticket-detail-status">
                    {copy.leftPane.status}
                  </label>
                  <select id="ticket-detail-status" className={fs.select} value={normalizedTicketStatus || "new"} disabled={isReadOnly} onChange={async e => {
                  const nextValue = e.target.value;
                  await updateTicketLive({
                    status: nextValue
                  }, {
                    successMessage: copy.toasts.statusUpdated
                  });
                }}>
                    {copy.statusOptions.map(item => <option key={item.value} value={item.value}>
                        {item.label}
                      </option>)}
                  </select>
                </div>

                <div className={fs.equipmentField}>
                  <label className={fs.equipmentFieldLabel} id="ticket-detail-type-label">
                    {copy.leftPane.type}
                  </label>
                  <div className={fs.channelIconBar} role="radiogroup" aria-labelledby="ticket-detail-type-label">
                    {ticketTypeOptions.map(item => <SmartTooltip key={item.key} content={`${item.label} · ${item.hint}`} className={fs.channelIconBarItem}>
                        <button type="button" role="radio" aria-checked={editForm.type === item.key} aria-label={item.label} className={`${fs.channelIconBtn} ${editForm.type === item.key ? fs.channelIconBtnActive : ""}`} disabled={isReadOnly} onClick={async () => {
                      setEditForm(p => ({
                        ...p,
                        type: item.key
                      }));
                      await updateTicketLive({
                        type: item.key
                      }, {
                        successMessage: copy.toasts.typeUpdated
                      });
                    }}>
                          <Icon icon={item.icon} aria-hidden />
                        </button>
                      </SmartTooltip>)}
                  </div>
                </div>

                <div className={fs.equipmentField}>
                  <label className={fs.equipmentFieldLabel} id="ticket-detail-category-label">
                    {copy.leftPane.category}
                  </label>
                  <div className={fs.contactPicker} ref={categoryDropdownRef}>
                    <div className={`${fs.contactInputWrap} ${showCategoryDropdown ? fs.contactInputWrapOpen : ""}`}>
                      <Icon icon="mdi:magnify" className={fs.contactInputIcon} aria-hidden />
                      <input type="text" className={fs.contactInput} value={categorySearch} placeholder={copy.searchCategory} disabled={isReadOnly} aria-labelledby="ticket-detail-category-label" aria-expanded={showCategoryDropdown} aria-haspopup="listbox" onChange={e => {
                      const typed = e.target.value;
                      setCategorySearch(typed);
                      if (typed.trim() !== editForm.category) {
                        setEditForm(p => ({
                          ...p,
                          category: ""
                        }));
                      }
                      setShowCategoryDropdown(true);
                      setCategoryHighlight(0);
                    }} onFocus={() => setShowCategoryDropdown(true)} onKeyDown={e => {
                      if (!showCategoryDropdown || filteredCategoryOptions.length === 0) return;
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setCategoryHighlight(h => Math.min(h + 1, filteredCategoryOptions.length - 1));
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setCategoryHighlight(h => Math.max(h - 1, 0));
                      } else if (e.key === "Enter") {
                        e.preventDefault();
                        const picked = filteredCategoryOptions[categoryHighlight];
                        if (picked) selectCategory(picked);
                      } else if (e.key === "Escape") {
                        setShowCategoryDropdown(false);
                      }
                    }} />
                    </div>
                    {showCategoryDropdown && <div className={fs.contactDropdown} role="listbox" aria-labelledby="ticket-detail-category-label">
                        {filteredCategoryOptions.length === 0 ? <div className={fs.contactEmpty}>{copy.noCategoryFound}</div> : (() => {
                      let optionIndex = -1;
                      return filteredCategoryGroups.map(([section, items]) => <div key={section}>
                                <div className={fs.categoryDropdownSection}>{section}</div>
                                {items.map(item => {
                          optionIndex += 1;
                          const idx = optionIndex;
                          return <button key={String(item.id)} type="button" role="option" aria-selected={editForm.category === String(item.name || "")} className={`${fs.contactOption} ${categoryHighlight === idx ? fs.contactOptionActive : ""}`} onMouseEnter={() => setCategoryHighlight(idx)} onClick={() => selectCategory(item)}>
                                      <span className={fs.contactOptionName}>{String(item.name || "")}</span>
                                    </button>;
                        })}
                              </div>);
                    })()}
                      </div>}
                  </div>
                </div>

                <div className={fs.equipmentField}>
                  <label className={fs.equipmentFieldLabel} htmlFor="ticket-detail-priority">
                    {copy.priorityLabel}
                  </label>
                  <div className={styles.priorityAiRow}>
                    <select id="ticket-detail-priority" className={fs.select} value={editForm.priority} disabled={isReadOnly || isMajorIncident} onChange={async e => {
                  const nextValue = e.target.value;
                  setAiPriorityHint("");
                  setEditForm(p => ({
                    ...p,
                    priority: nextValue
                  }));
                  await updateTicketLive({
                    priority: nextValue
                  }, {
                    successMessage: copy.toasts.priorityUpdated
                  });
                }}>
                      {copy.priorityOptions.map(item => <option key={item.key} value={item.key}>
                          {item.label}
                        </option>)}
                    </select>
                    {aiFeatures.autoPriority && !isReadOnly && !isMajorIncident ? <SmartTooltip content={copy.aiPriorityTitle || "Priorité automatique IA"}>
                        <button type="button" className={styles.priorityAiBtn} onClick={() => {
                    void handleSuggestPriorityAi();
                  }} disabled={aiPriorityLoading} aria-label={copy.aiPriorityTitle || "Priorité automatique IA"}>
                          <Icon icon={aiPriorityLoading ? "mdi:loading" : "mdi:robot-outline"} className={aiPriorityLoading ? styles.spinning : undefined} aria-hidden />
                        </button>
                      </SmartTooltip> : null}
                  </div>
                  {aiPriorityHint ? <p className={styles.priorityAiHint}>{aiPriorityHint}</p> : null}
                </div>

                {editForm.type === "incident" ? <>
                    <hr className={styles.paneSectionDivider} aria-hidden />
                    <div className={fs.settingsMajorTop}>
                      <div className={fs.majorSwitchRow}>
                        <div className={fs.majorSwitchText}>
                          <span className={fs.majorSwitchLabel}>
                            <Icon icon="mdi:alert-octagon" className={fs.majorSwitchIcon} aria-hidden />
                            {copy.majorIncident}
                          </span>
                        </div>
                        <button type="button" role="switch" aria-checked={isMajorIncident} aria-label={copy.majorIncident} className={fs.switch} disabled={isReadOnly || majorIncidentUpdating} onClick={() => {
                      void handleMajorIncidentChange(!isMajorIncident);
                    }}>
                          <input type="checkbox" className={fs.switchInput} checked={isMajorIncident} readOnly tabIndex={-1} aria-hidden />
                          <span className={fs.switchTrack} aria-hidden />
                        </button>
                      </div>
                    </div>
                  </> : null}

                <hr className={styles.paneSectionDivider} aria-hidden />
                <div className={fs.equipmentField}>
                  <label className={fs.equipmentFieldLabel}>{copy.leftPane.tags}</label>
                  <div className={`${heroStyles.heroTags} ${styles.leftPaneTags}`} aria-label={copy.leftPane.tagsAria}>
                    {(ticket.tags || []).map(tag => {
                    const tagColor = tag.color || "#2b5fab";
                    return <span key={tag.id} className={heroStyles.heroTagChip} style={{
                      backgroundColor: `${tagColor}18`,
                      borderColor: `${tagColor}55`,
                      color: tagColor
                    }}>
                          {tag.label}
                          <button type="button" className={heroStyles.heroTagRemove} onClick={() => removeTag(tag.id)} disabled={isReadOnly} aria-label={copy.formatRemoveTagAria(tag.label)}>
                            <FaTimes />
                          </button>
                        </span>;
                  })}
                    {!isReadOnly ? <div className={heroStyles.heroTagAddWrap}>
                        {tagAddOpen ? <TicketTagSuggestField assignedTags={ticket.tags || []} placeholder={copy.leftPane.tagPlaceholder} addAria={copy.leftPane.tagAddAria} confirmAria={copy.leftPane.tagConfirmAria} createLabel={label => interpolate(copy.leftPane.tagCreate || "Create “{label}”", {
                      label
                    })} emptyHint={copy.leftPane.tagEmpty || "No matching tag"} onSubmit={(label, color) => {
                      void addTag(label, color);
                    }} onCancel={() => {
                      setTagDraft("");
                      setTagAddOpen(false);
                    }} /> : <SmartTooltip content={copy.leftPane.tagAddTooltip}>
                            <button type="button" className={heroStyles.heroTagAddTrigger} onClick={() => setTagAddOpen(true)} aria-label={copy.leftPane.tagAddAria}>
                              <FaPlus />
                            </button>
                          </SmartTooltip>}
                      </div> : null}
                  </div>
                </div>

                {isSalesTicketDetail ? <>
                    <hr className={styles.paneSectionDivider} aria-hidden />
                    <div className={fs.equipmentField}>
                      <label className={fs.equipmentFieldLabel} htmlFor="sales-progress-range">{salesDetailCopy.progress}</label>
                      <div className={styles.salesProgressRow}>
                        <input id="sales-progress-range" type="range" min={0} max={100} step={5} className={styles.salesProgressRange} value={salesProgress} disabled={isReadOnly || savingSalesProgress} onChange={e => setSalesProgress(Number(e.target.value))} onMouseUp={e => {
                      void saveSalesProgress(e.currentTarget.value);
                    }} onTouchEnd={e => {
                      void saveSalesProgress(e.currentTarget.value);
                    }} onBlur={e => {
                      void saveSalesProgress(e.currentTarget.value);
                    }} />
                        <span className={styles.salesProgressValue}>{salesProgress}%</span>
                      </div>
                    </div>
                  </> : null}
            </RightPaneStaticSection>
          </aside>

          <section className={styles.centerPane}>
            <div className={styles.timelineWrap}>
              <TicketValidationBanner
                requests={validationRequests}
                currentUserId={currentUserId}
                respondingId={respondingValidationId}
                canEdit={!isReadOnly}
                onRespond={handleValidationRespond}
                onEdit={request => openValidationModal(request)}
              />
              <div className={styles.timeline} ref={timelineRef} onScroll={handleTimelineScroll}>
              <article className={`${styles.commentItem} ${styles.commentItemInitial}`}>
                <UserAvatar
                  className={styles.commentAvatarSide}
                  name={requesterDisplayName !== "-" ? requesterDisplayName : copy.description.requesterFallback}
                  size={40}
                  variant="client"
                />
                <div className={styles.commentBubble}>
                  <div className={styles.commentHeader}>
                    <div className={styles.commentHeaderMain}>
                      <div className={styles.commentMetaStrip}>
                        <span className={styles.commentMetaLabel}>{copy.comment.createdLabel}</span>
                        <span className={styles.commentMetaValue}>
                          <Icon icon="mdi:clock-outline" aria-hidden />
                          {copy.formatDateTime(ticket.created_at)}
                        </span>
                        <span className={styles.commentMetaLabel}>{copy.comment.byLabel}</span>
                        <span className={styles.commentMetaAuthor}>
                          <Icon icon="mdi:account-outline" aria-hidden />
                          {requesterDisplayName !== "-" ? requesterDisplayName : copy.description.requesterFallback}
                        </span>
                        <span className={styles.initialRequestBadge}>{copy.description.initial}</span>
                      </div>
                    </div>
                    <div className={styles.commentHeaderRight}>
                      {!isReadOnly && !initialRequestEditing ? <SmartTooltip content={copy.description.editTitle}>
                          <button type="button" className={styles.commentEditBtn} onClick={startInitialRequestEdit} aria-label={copy.description.editButtonAria}>
                            <Icon icon="mdi:pencil-outline" />
                          </button>
                        </SmartTooltip> : null}
                    </div>
                  </div>
                  {initialRequestEditing ? <div className={styles.initialRequestEditBox}>
                      <input ref={titleInputRef} className={styles.descriptionTitleInput} type="text" value={titleDraft} onChange={e => setTitleDraft(e.target.value)} onKeyDown={e => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    cancelInitialRequestEdit();
                  }
                }} placeholder={copy.header.titlePlaceholder} disabled={isReadOnly} aria-label={copy.header.titleAria} />
                      <textarea ref={descriptionTextareaRef} className={styles.descriptionEditTextarea} value={descriptionDraft} onChange={e => setDescriptionDraft(e.target.value)} onKeyDown={e => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    cancelInitialRequestEdit();
                  }
                }} placeholder={copy.description.placeholder} disabled={isReadOnly} rows={4} aria-label={copy.description.editAria} />
                      <div className={styles.commentEditActions}>
                        <button type="button" className={styles.commentEditSaveBtn} onClick={saveInitialRequestEdit} disabled={isReadOnly}>
                          {copy.comment.editSave}
                        </button>
                        <button type="button" className={styles.commentEditCancelBtn} onClick={cancelInitialRequestEdit}>
                          {copy.comment.editCancel}
                        </button>
                      </div>
                    </div> : <>
                      <div className={styles.initialRequestTitleWrap}>
                        <h2 className={`${styles.descriptionTitle} ${!(editForm.title || ticket?.title) ? styles.descriptionTitlePlaceholder : ""}`.trim()}>
                          {editForm.title || ticket?.title || copy.header.titlePlaceholder}
                        </h2>
                      </div>
                      {editForm.description || ticket?.description ? <div className={styles.commentBody} onClick={handleInlineImageClick}>
                          {renderCommentContent(editForm.description || ticket?.description, descriptionAttachments)}
                        </div> : <p className={styles.descriptionBodyPlaceholder}>{copy.description.empty}</p>}
                    </>}
                </div>
              </article>
              {(ticket.comments || []).filter(comment => isTimelineVisibleComment(comment?.content)).map(comment => {
                  const isEditingComment = String(editingCommentId) === String(comment.id);
                  const isResolutionProposal = isResolutionProposalTimelineComment(comment, resolutionValidation);
                  const resolutionStatus = isResolutionProposal ? copy.getResolutionStatusPresentation(resolutionValidation) : null;
                  const showEditAction = canEditComment(comment);
                  const showDeleteAction = canDeleteComment(comment);
                  const isDeletingComment = String(deletingCommentId) === String(comment.id);
                  const commentNotification = unreadByCommentId.get(String(comment.id));
                  return <article key={comment.id} className={`${styles.commentItem} ${comment.is_internal ? styles.commentItemInternal : ""} ${resolutionStatus?.variant === "pending" ? styles.commentItemResolutionPending : resolutionStatus?.variant === "rejected" ? styles.commentItemResolutionRejected : resolutionStatus?.variant === "done" ? styles.commentItemResolutionDone : ""}`.trim()}>
                  <UserAvatar
                    className={styles.commentAvatarSide}
                    name={resolveCommentAuthorName(comment)}
                    avatar={resolveCommentAuthorAvatar(comment)}
                    size={40}
                    variant={comment.is_internal ? "neutral" : "agent"}
                  />
                  <div className={styles.commentBubble}>
                    <div className={styles.commentHeader}>
                      <div className={styles.commentHeaderMain}>
                        <div className={styles.commentMetaStrip}>
                          <span className={styles.commentMetaLabel}>{copy.comment.createdLabel}</span>
                          <span className={styles.commentMetaValue}>
                            <Icon icon="mdi:clock-outline" aria-hidden />
                            {copy.formatDateTime(comment.created_at)}
                            {isCommentEdited(comment) ? <span className={styles.commentEditedMark}>{copy.comment.editedMark}</span> : null}
                          </span>
                          <span className={styles.commentMetaLabel}>{copy.comment.byLabel}</span>
                          <span className={styles.commentMetaAuthor}>
                            <Icon icon="mdi:account-outline" aria-hidden />
                            {resolveCommentAuthorName(comment)}
                          </span>
                          {comment.is_internal ? <span className={styles.commentInternal} title={copy.comment.privateTitle}>
                              <Icon icon="mdi:lock-outline" />
                            </span> : null}
                        </div>
                      </div>
                      <div className={styles.commentHeaderRight}>
                        {showEditAction && !isEditingComment && <SmartTooltip content={copy.comment.editTooltip}>
                            <button type="button" className={styles.commentEditBtn} onClick={() => startEditComment(comment)} disabled={isReadOnly} aria-label={copy.comment.editAria}>
                              <Icon icon="mdi:pencil-outline" />
                            </button>
                          </SmartTooltip>}
                        {showDeleteAction && !isEditingComment && <SmartTooltip content={copy.comment.deleteTooltip}>
                            <button type="button" className={styles.commentDeleteBtn} onClick={() => deleteComment(comment.id)} disabled={isReadOnly || isDeletingComment} aria-label={copy.comment.deleteAria}>
                              <Icon icon="mdi:trash-can-outline" />
                            </button>
                          </SmartTooltip>}
                        {commentNotification ? <SmartTooltip content={copy.comment.unreadTooltip}>
                            <button type="button" className={styles.commentNotificationBadge} onClick={() => markCommentNotificationRead(commentNotification.id)} aria-label={copy.comment.markReadAria}>
                              <Icon icon="mdi:bell-badge-outline" />
                            </button>
                          </SmartTooltip> : null}
                      </div>
                    </div>
                    {isEditingComment ? <div className={styles.commentEditBox}>
                        <div ref={commentEditEditorRef} className={styles.commentEditEditor} contentEditable={!isReadOnly && !savingCommentEdit} suppressContentEditableWarning onInput={e => setEditingCommentDraft(e.currentTarget?.innerHTML || "")} style={{
                          minHeight: "96px",
                          whiteSpace: "pre-wrap",
                          overflowY: "auto"
                        }} />
                        {Array.isArray(comment.attachments) && comment.attachments.length > 0 ? <div className={styles.commentEditAttachments}>
                            {comment.attachments.map((attachment, attachmentIndex) => {
                            const removalKey = getAttachmentRemovalKey(attachment) || `index:${attachmentIndex}`;
                            const isMarkedForRemoval = getAttachmentRemovalKey(attachment) ? editingCommentRemovedAttachmentKeys.includes(getAttachmentRemovalKey(attachment)) : false;
                            const attachmentLabel = attachment.filename || attachment.name || copy.attachmentDefault;
                            return <div key={removalKey} className={`${styles.commentEditAttachmentItem} ${isMarkedForRemoval ? styles.commentEditAttachmentItemRemoved : ""}`.trim()}>
                                  <Icon icon="mdi:paperclip" className={styles.commentEditAttachmentIcon} />
                                  <span className={styles.commentEditAttachmentName}>{attachmentLabel}</span>
                                  {canDeleteAttachments ? <button type="button" className={styles.commentEditAttachmentRemoveBtn} onClick={() => toggleEditingCommentAttachmentRemoval(attachment)} disabled={savingCommentEdit || isReadOnly} aria-label={isMarkedForRemoval ? interpolate(copy.comment.editKeepAttachmentAria, {
                                name: attachmentLabel
                              }) : interpolate(copy.comment.editRemoveAttachmentAria, {
                                name: attachmentLabel
                              })} title={isMarkedForRemoval ? copy.comment.editUndoRemoveTitle : copy.comment.editRemoveTitle}>
                                    <Icon icon={isMarkedForRemoval ? "mdi:undo" : "mdi:close"} />
                                  </button> : null}
                                </div>;
                          })}
                          </div> : null}
                        <div className={styles.commentEditActions}>
                          <button type="button" className={`${styles.replyModeBtn} ${styles.commentEditVisibility} ${editingCommentInternal ? styles.replyModeBtnPrivate : ""}`.trim()} onClick={() => {
                            if (!canPublicReply) {
                              setEditingCommentInternal(true);
                              return;
                            }
                            setEditingCommentInternal(prev => !prev);
                          }} disabled={savingCommentEdit || isReadOnly || !canPublicReply} title={editingCommentInternal ? copy.reply.modePrivateTitle : copy.reply.modePublicTitle}>
                            <Icon icon={editingCommentInternal ? "mdi:lock-outline" : "mdi:earth"} />
                            {editingCommentInternal ? copy.reply.modePrivate : copy.reply.modePublic}
                          </button>
                          <button type="button" className={styles.commentEditSaveBtn} onClick={saveEditComment} disabled={savingCommentEdit || isReadOnly}>
                            {savingCommentEdit ? copy.comment.editSaving : copy.comment.editSave}
                          </button>
                          <button type="button" className={styles.commentEditCancelBtn} onClick={cancelEditComment} disabled={savingCommentEdit}>
                            {copy.comment.editCancel}
                          </button>
                        </div>
                      </div> : isResolutionProposal ? <div className={`${styles.commentBody} ${styles.commentBodyResolution}`}>
                        {renderResolutionCommentCard(comment, resolutionValidation)}
                      </div> : <div className={styles.commentBody} onClick={handleInlineImageClick}>{renderCommentBody(comment)}</div>}
                    {!isEditingComment && Array.isArray(comment.attachments) && comment.attachments.length > 0 && !isIncomingEmailContent(comment.content) && <div className={styles.attachmentsList}>
                        {comment.attachments.map(attachment => {
                          const attachmentUrl = attachment.url || attachment.path;
                          if (!attachmentUrl) return null;
                          const attachmentLabel = attachment.filename || attachment.name || copy.attachmentDefault;
                          if (isImageAttachment(attachment)) {
                            return <button type="button" key={attachment.id || attachmentUrl} className={styles.attachmentPreviewLink} title={interpolate(copy.comment.attachmentOpenTitle, {
                              name: attachmentLabel
                            })} onClick={() => openImageLightbox(attachmentUrl, attachmentLabel)}>
                                <img src={attachmentUrl} alt={attachmentLabel} className={styles.attachmentPreviewImage} loading="lazy" />
                              </button>;
                          }
                          return <a key={attachment.id || attachmentUrl} href={attachmentUrl} target="_blank" rel="noopener noreferrer" className={styles.attachmentLink} title={`${attachmentLabel} (open in new tab)`}>
                              <Icon icon="mdi:paperclip" />
                              {attachmentLabel}
                            </a>;
                        })}
                      </div>}
                  </div>
                </article>;
                })}
              </div>
              {showTimelineScrollTop ? <button type="button" className={styles.timelineScrollTopBtn} onClick={scrollTimelineToTop} aria-label={copy.timeline.scrollTopAria} title={copy.timeline.scrollTopTitle}>
                  <Icon icon="mdi:chevron-up" aria-hidden />
                </button> : null}
            </div>
            {!isReadOnly ? <div className={`${styles.replyBox} ${isDragOverReplyBox ? styles.replyBoxDragActive : ""} ${!replyBoxExpanded ? styles.replyBoxCollapsed : ""}`.trim()} onDragOver={handleReplyDragOver} onDragEnter={handleReplyDragOver} onDragLeave={handleReplyDragLeave} onDrop={handleReplyDrop}>
              {isDragOverReplyBox && replyBoxExpanded && <div className={styles.dropOverlay}>
                  <div className={styles.dropOverlayTitle}>{copy.reply.dropTitle}</div>
                  <div className={styles.dropOverlayHint}>
                    {copy.reply.dropHint}
                  </div>
                </div>}
              <div className={styles.replyTopBar}>
                {replyBoxExpanded ? <>
                    <div className={styles.replyTopLeft}>
                      <div className={styles.replyTopControls}>
                        <select className={`${styles.footerSelect} ${styles.replyTemplateSelect}`} value={commentTemplateSelection} onChange={e => applyCommentTemplate(e.target.value)} disabled={isReadOnly || availableCommentTemplates.length === 0} title={copy.reply.templateTitle}>
                        <option value="">{copy.reply.templateSelect}</option>
                          {availableCommentTemplates.map(template => <option key={template.id} value={template.id}>
                              {template.name}
                            </option>)}
                        </select>
                        <div className={styles.replyTools}>
                          <button type="button" className={styles.toolBtn} onClick={insertBold} title={copy.reply.toolBold}>
                            <Icon icon="mdi:format-bold" />
                          </button>
                          <button type="button" className={styles.toolBtn} onClick={insertBulletList} title={copy.reply.toolList}>
                            <Icon icon="mdi:format-list-bulleted" />
                          </button>
                          <button type="button" className={styles.toolBtn} onMouseDown={event => event.preventDefault()} onClick={insertLink} title={copy.reply.toolLink}>
                            <Icon icon="mdi:link-variant" />
                          </button>
                          <TicketEmojiPicker
                            onSelect={insertEmoji}
                            title={copy.reply.toolEmoji}
                            searchPlaceholder={copy.reply.emojiSearch}
                            emptyLabel={copy.reply.emojiEmpty}
                            recentLabel={copy.reply.emojiRecent}
                            categoryLabels={{
                              smileys: copy.reply.emojiSmileys,
                              gestures: copy.reply.emojiGestures,
                              people: copy.reply.emojiPeople,
                              animals: copy.reply.emojiAnimals,
                              food: copy.reply.emojiFood,
                              travel: copy.reply.emojiTravel,
                              objects: copy.reply.emojiObjects,
                              symbols: copy.reply.emojiSymbols
                            }}
                          />
                          {aiFeatures.suggestReply && canAiSuggest ? <>
                              <span className={styles.aiToolSep} aria-hidden />
                              <TicketAiEnrichMenu
                                copy={copy.reply}
                                loading={aiCorrectLoading}
                                disabled={aiSuggestLoading}
                                onSelect={handleCorrectTextAi}
                              />
                              <span className={styles.aiToolSep} aria-hidden />
                              <SmartTooltip content={copy.reply.suggestAiTitle}>
                                <button type="button" className={styles.toolBtn} onClick={handleSuggestReplyAi} disabled={aiSuggestLoading || aiCorrectLoading} title={copy.reply.suggestAiTitle} aria-label={copy.reply.suggestAiTitle}>
                                  <Icon icon={aiSuggestLoading ? "mdi:loading" : "mdi:creation"} className={aiSuggestLoading ? styles.aiToolSpin : undefined} aria-hidden />
                                </button>
                              </SmartTooltip>
                            </> : null}
                        </div>
                        <label className={styles.uploadBtn}>
                          <Icon icon="mdi:paperclip" />
                          {copy.reply.addFiles}
                          <input type="file" multiple accept={ATTACHMENT_ACCEPT} onChange={e => {
                          const selectedFiles = Array.from(e.target.files || []);
                          try {
                            applySelectedAttachments(selectedFiles);
                          } catch (error) {
                            toast.error(error.message || copy.attachmentInvalid);
                            e.target.value = "";
                          }
                        }} disabled={isReadOnly} />
                        </label>
                      </div>
                    </div>
                    <div className={styles.replyTopRight}>
                      <button type="button" className={`${styles.replyModeBtn} ${commentInternal ? styles.replyModeBtnPrivate : ""}`} onClick={() => {
                        if (!canPublicReply) {
                          setCommentInternal(true);
                          return;
                        }
                        setCommentInternal(prev => !prev);
                      }} disabled={isReadOnly || !canPublicReply} title={commentInternal ? copy.reply.modePrivateTitle : copy.reply.modePublicTitle}>
                        <Icon icon={commentInternal ? "mdi:lock-outline" : "mdi:lock-open-variant-outline"} />
                        {commentInternal ? copy.reply.modePrivate : copy.reply.modePublic}
                      </button>
                      <SmartTooltip content={copy.reply.collapseTooltip}>
                        <button type="button" className={styles.replyCollapseBtn} onClick={toggleReplyBoxExpanded} aria-expanded={replyBoxExpanded} aria-label={copy.reply.collapseAria}>
                          <Icon icon="mdi:chevron-down" aria-hidden />
                        </button>
                      </SmartTooltip>
                    </div>
                  </> : <>
                    <button type="button" className={styles.replyCollapsedSummary} onClick={expandReplyBox} disabled={isReadOnly} aria-label={copy.reply.expandAria}>
                      <Icon icon="mdi:message-reply-text-outline" className={styles.replyCollapsedIcon} aria-hidden />
                      <span className={styles.replyCollapsedLabel}>{copy.reply.expandSummary}</span>
                      {hasReplyDraft ? <span className={styles.replyCollapsedDraftHint}>{copy.reply.draftHint}</span> : null}
                    </button>
                    <div className={styles.replyTopRight}>
                      <button type="button" className={`${styles.replyModeBtn} ${commentInternal ? styles.replyModeBtnPrivate : ""}`} onClick={() => {
                        if (!canPublicReply) {
                          setCommentInternal(true);
                          return;
                        }
                        setCommentInternal(prev => !prev);
                      }} disabled={isReadOnly || !canPublicReply} title={commentInternal ? copy.reply.modePrivateTitle : copy.reply.modePublicTitle}>
                        <Icon icon={commentInternal ? "mdi:lock-outline" : "mdi:lock-open-variant-outline"} />
                        {commentInternal ? copy.reply.modePrivate : copy.reply.modePublic}
                      </button>
                      <SmartTooltip content={copy.reply.expandTooltip}>
                        <button type="button" className={styles.replyCollapseBtn} onClick={expandReplyBox} aria-expanded={replyBoxExpanded} aria-label={copy.reply.expandAria}>
                          <Icon icon="mdi:chevron-up" aria-hidden />
                        </button>
                      </SmartTooltip>
                    </div>
                  </>}
              </div>
              {replyBoxExpanded ? <>
                  <div ref={commentEditorRef} className={styles.editor} contentEditable={!isReadOnly} suppressContentEditableWarning onInput={e => setCommentDraft(e.currentTarget?.innerHTML || "")} onPaste={handleEditorPaste} style={{
                  minHeight: "140px",
                  whiteSpace: "pre-wrap",
                  overflowY: "auto"
                }} />
                  {attachmentFiles.length > 0 && isPro ? (
                    <TicketVaultArchiveOptions
                      files={attachmentFiles}
                      optionsByKey={vaultOptionsByKey}
                      onOptionsChange={patchVaultFileOptions}
                      onRemoveFile={removeAttachmentFile}
                      getRemoveAria={name => copy.formatRemoveFileAria?.(name) || `Remove ${name}`}
                      hasClient={Boolean(ticket?.client_id || ticket?.clientId)}
                      disabled={isReadOnly}
                      copy={vaultArchiveCopy}
                    />
                  ) : attachmentFiles.length > 0 ? (
                    <div className={styles.attachmentsDraft}>
                      {attachmentFiles.map(file => {
                        const fileKey = getAttachmentFileKey(file);
                        return (
                          <span key={fileKey} className={styles.attachmentsDraftChip}>
                            <Icon icon="mdi:file-document-outline" aria-hidden />
                            <span className={styles.attachmentsDraftName} title={file.name}>
                              {file.name}
                            </span>
                            <button
                              type="button"
                              className={styles.attachmentsDraftRemove}
                              onClick={() => removeAttachmentFile(fileKey)}
                              aria-label={copy.formatRemoveFileAria?.(file.name) || `Remove ${file.name}`}
                              disabled={isReadOnly}
                            >
                              <Icon icon="mdi:close" aria-hidden />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  ) : null}
                </> : null}
            </div> : null}
          </section>

          <aside className={`${styles.rightPane} ${heroStyles.rightSidebarContent}`}>
            {rightPaneView === "runbook" && aiFeatures.ticketRunbook && canAiRunbook ? <TicketAiRunbookPanel ticketId={ticketId} initialRunbook={ticket?.ai_runbook} onRunbookChange={handleAiRunbookChange} /> : rightPaneView === "history" ? <RightPaneStaticSection title={copy.rightPane.historyToggleTitle} titleId="ticket-detail-log-title" count={ticketActivityLog.length} headerExtra={<SmartTooltip content={copy.rightPane.historyRefreshTitle}>
                    <button type="button" className={styles.historyRefreshBtn} onClick={() => void refreshTicketHistory({
                showSpinner: true
              })} disabled={refreshingHistory} aria-label={copy.rightPane.historyRefreshAria}>
                      <Icon icon={refreshingHistory ? "mdi:loading" : "mdi:refresh"} className={refreshingHistory ? styles.historyRefreshSpin : undefined} aria-hidden />
                    </button>
                  </SmartTooltip>}>
                {ticketActivityLog.length === 0 ? <p className={styles.emptyText}>{copy.empty.noActivity}</p> : <div className={styles.ticketLogList}>
                    {ticketActivityLog.map(entry => <article key={entry.id} className={`${styles.ticketLogItem} ${styles[`ticketLogItem_${entry.kind}`] || ""}`.trim()}>
                        <div className={styles.ticketLogIcon} aria-hidden>
                          <Icon icon={entry.icon} />
                        </div>
                        <div className={styles.ticketLogBody}>
                          <div className={styles.ticketLogLabel}>{entry.label}</div>
                          <div className={styles.ticketLogMeta}>
                            <span className={styles.ticketLogActor}>{entry.actor}</span>
                            <span className={styles.ticketLogDot} aria-hidden>
                              ·
                            </span>
                            <time className={styles.ticketLogDate} dateTime={entry.at}>
                              {copy.formatDateTime(entry.at)}
                            </time>
                          </div>
                          {entry.detail ? <p className={styles.ticketLogDetail}>{truncateLogText(entry.detail)}</p> : null}
                        </div>
                      </article>)}
                  </div>}
              </RightPaneStaticSection> : <>
            {isSalesTicketDetail ? <>
                <RightPaneStaticSection title={salesDetailCopy.planning.title} titleId="ticket-sales-planning-title">
                  {salesPlanningEvent ? <div className={styles.salesInfoStack}>
                      <div className={styles.contextLine}>
                        <strong>{salesDetailCopy.planning.start}</strong>{" "}
                        {salesDetailCopy.formatDateTime?.(salesPlanningEvent.start) || copy.formatDateTime(salesPlanningEvent.start)}
                      </div>
                      <div className={styles.contextLine}>
                        <strong>{salesDetailCopy.planning.end}</strong>{" "}
                        {salesDetailCopy.formatDateTime?.(salesPlanningEvent.end || salesPlanningEvent.end_at) || copy.formatDateTime(salesPlanningEvent.end || salesPlanningEvent.end_at)}
                      </div>
                    </div> : <p className={styles.emptyText}>{salesDetailCopy.planning.notPlanned}. {salesDetailCopy.planning.noEventHint}</p>}
                  <button type="button" className={styles.salesPaneActionBtn} onClick={() => onNavigate?.("Planning", {
                ticketId,
                clientId: ticket?.client_id || ticket?.clientId || null,
                focusDate: salesPlanningEvent?.start || null
              })}>
                    <Icon icon="mdi:calendar-month-outline" aria-hidden />
                    {salesDetailCopy.planning.openPlanning}
                  </button>
                </RightPaneStaticSection>

                <RightPaneStaticSection title={locale === "fr" ? "Tâches" : "Tasks"} titleId="ticket-sales-tasks-title">
                  <ul className={styles.salesTaskList}>
                    <li className={salesPlanningEvent ? styles.salesTaskDone : styles.salesTaskPending}>
                      <Icon icon={salesPlanningEvent ? "mdi:check-circle" : "mdi:circle-outline"} aria-hidden />
                      <span>{locale === "fr" ? "Planifier l'intervention" : "Schedule the intervention"}</span>
                    </li>
                    <li className={salesProgress >= 100 ? styles.salesTaskDone : styles.salesTaskPending}>
                      <Icon icon={salesProgress >= 100 ? "mdi:check-circle" : "mdi:circle-outline"} aria-hidden />
                      <span>{locale === "fr" ? "Atteindre 100% d'avancement" : "Reach 100% progress"}</span>
                    </li>
                    <li className={["resolved", "closed"].includes(String(ticket?.status || "").toLowerCase()) ? styles.salesTaskDone : styles.salesTaskPending}>
                      <Icon icon={["resolved", "closed"].includes(String(ticket?.status || "").toLowerCase()) ? "mdi:check-circle" : "mdi:circle-outline"} aria-hidden />
                      <span>{locale === "fr" ? "Clôturer la demande" : "Close the request"}</span>
                    </li>
                  </ul>
                  {aiFeatures.ticketRunbook && canAiRunbook ? <button type="button" className={styles.salesPaneActionBtn} onClick={() => setRightPaneView("runbook")}>
                      <Icon icon="mdi:clipboard-list-outline" aria-hidden />
                      {locale === "fr" ? "Ouvrir le runbook / checklist" : "Open runbook / checklist"}
                    </button> : null}
                </RightPaneStaticSection>

                <RightPaneStaticSection title={salesDetailCopy.form.title} titleId="ticket-sales-form-title">
                  {salesFormEntries.length === 0 ? <p className={styles.emptyText}>{salesDetailCopy.form.empty}</p> : <dl className={styles.salesFormFacts}>
                      {(salesFormData?.purchaseOrder || salesFormData?.purchase_order) ? <div className={styles.salesFormFact}>
                          <dt>{salesDetailCopy.form.purchaseOrder}</dt>
                          <dd>{salesFormData.purchaseOrder || salesFormData.purchase_order}</dd>
                        </div> : null}
                      {(salesFormData?.commercialLabel || salesFormData?.commercial) ? <div className={styles.salesFormFact}>
                          <dt>{salesDetailCopy.form.commercial}</dt>
                          <dd>{salesFormData.commercialLabel || salesFormData.commercial}</dd>
                        </div> : null}
                      {(salesFormData?.projectManagerLabel || salesFormData?.projectManager) ? <div className={styles.salesFormFact}>
                          <dt>{salesDetailCopy.form.projectManager}</dt>
                          <dd>{salesFormData.projectManagerLabel || salesFormData.projectManager}</dd>
                        </div> : null}
                      {salesFormEntries.map(row => <div key={row.key} className={styles.salesFormFact}>
                          <dt>{row.label}</dt>
                          <dd>
                            <SalesFormFieldValue
                              row={row}
                              onNavigate={onNavigate}
                              linkClassName={styles.contextLink}
                              linkButtonClassName={styles.linkLikeBtn}
                              stackClassName={styles.formLinkedStack}
                              metaClassName={styles.formLinkedMeta}
                            />
                          </dd>
                        </div>)}
                    </dl>}
                </RightPaneStaticSection>
              </> : null}

            {!isSalesTicketDetail && supportFormData ? <RightPaneStaticSection title={locale === "fr" ? "Formulaire" : "Form"} titleId="ticket-support-form-title">
                {supportFormData.formLabel ? <p className={styles.emptyText} style={{ marginBottom: "0.55rem" }}>{supportFormData.formLabel}</p> : null}
                {supportFormEntries.length === 0 ? <p className={styles.emptyText}>{locale === "fr" ? "Aucun champ renseigné" : "No fields filled"}</p> : <dl className={styles.salesFormFacts}>
                    {supportFormEntries.map(row => <div key={row.key} className={styles.salesFormFact}>
                        <dt>{row.label}</dt>
                        <dd>
                          <SalesFormFieldValue
                            row={row}
                            onNavigate={onNavigate}
                            linkClassName={styles.contextLink}
                            linkButtonClassName={styles.linkLikeBtn}
                            stackClassName={styles.formLinkedStack}
                            metaClassName={styles.formLinkedMeta}
                          />
                        </dd>
                      </div>)}
                  </dl>}
              </RightPaneStaticSection> : null}

            <TicketKnowledgeSuggestions
              query={editForm.title || ticket?.title || titleDraft}
              copy={copy}
              onOpen={article => onNavigate?.("KnowledgeBaseArticle", { articleId: article.id, mode: "read", title: article.title })}
            />

            <RightPaneCollapsibleSection sectionId="ticket-detail-contact-body" title={copy.rightPane.contact} expanded={rightPaneCollapse.contact} onToggle={() => toggleRightPaneCollapse("contact")}>
              <div className={`${styles.contextLine} ${styles.contextLineWithAction}`.trim()}>
                <div className={styles.contextLineMain}>
                  <strong>{copy.rightPane.name}</strong>{" "}
                  {(editForm.requesterContactId || ticket?.requester_contact_id || requesterContact?.id) && requesterDisplayName !== "-" ? <button type="button" className={styles.contextLinkBtn} onClick={() => onNavigate?.("ContactDetail", {
                    contactId: editForm.requesterContactId || ticket?.requester_contact_id || requesterContact?.id
                  })}>
                      {requesterDisplayName}
                    </button> : requesterDisplayName}
                </div>
                {renderOrphanRequesterActions("context")}
              </div>
              <div className={styles.contextLine}>
                <strong>{copy.rightPane.phone}</strong>{" "}
                {requesterPhone && requesterPhone !== "-" ? <a href={`tel:${String(requesterPhone).replace(/\s+/g, "")}`} className={styles.contextLink}>
                    {requesterPhone}
                  </a> : "-"}
              </div>
              <div className={styles.contextLine}>
                <strong>{copy.rightPane.email}</strong>{" "}
                {requesterEmail && requesterEmail !== "-" ? <a href={`mailto:${requesterEmail}`} className={styles.contextLink}>
                    {requesterEmail}
                  </a> : "-"}
              </div>
              <div className={styles.contextLine}><strong>{copy.rightPane.role}</strong> {requesterRole}</div>
            </RightPaneCollapsibleSection>

            <RightPaneCollapsibleSection sectionId="ticket-detail-contract-body" title={copy.contract} expanded={rightPaneCollapse.contract} onToggle={() => toggleRightPaneCollapse("contract")} headerExtra={contractValidityAlert ? <span className={`${styles.contractHeaderStatus} ${CONTRACT_HEADER_STATUS_CLASS[contractValidityAlert.status] || ""}`.trim()}>
                    {contractValidityAlert.shortLabel}
                  </span> : null}>
              <dl className={fs.contractFacts}>
                  <div className={fs.contractFactRow}>
                    <dt className={fs.contractFactLabel}>
                      <Icon icon="mdi:domain" className={fs.contractFactIcon} aria-hidden />
                      {copy.enterprise}
                    </dt>
                    <dd className={effectiveTicketClientId ? fs.contractFactCompany : fs.contractFactEmpty}>
                      {effectiveTicketClientId ? <button type="button" className={styles.contextLinkBtn} onClick={() => onNavigate?.("ContratDetail", {
                        clientId: effectiveTicketClientId,
                        name: breadcrumbClientLabel
                      })}>
                          {breadcrumbClientLabel || "-"}
                        </button> : "-"}
                    </dd>
                  </div>
                  <div className={fs.contractFactRow}>
                    <dt className={fs.contractFactLabel}>
                      <Icon icon="mdi:file-document-outline" className={fs.contractFactIcon} aria-hidden />
                      {copy.contract}
                    </dt>
                    <dd className={contractFactEmpty ? fs.contractFactEmpty : contractStatusClass}>
                      <span>{contractFactLabel}</span>
                      {contractValidityAlert?.detail && contractValidityAlert.detail !== contractFactLabel ? <span className={styles.contractFactDetail}>{contractValidityAlert.detail}</span> : null}
                    </dd>
                  </div>
                  <div className={fs.contractFactRow}>
                    <dt className={fs.contractFactLabel}>
                      <Icon icon="mdi:puzzle-outline" className={fs.contractFactIcon} aria-hidden />
                      {copy.options}
                    </dt>
                    <dd className={contractOptionsEmpty ? fs.contractFactEmpty : ""} title={contractOptionsEmpty ? undefined : contractOptionsLabel}>
                      {contractOptionsLabel}
                    </dd>
                  </div>
                  {!isSalesTicketDetail && !isCommunity && <div className={fs.contractFactRow}>
                    <dt className={fs.contractFactLabel}>
                      <Icon icon="mdi:ticket-percent-outline" className={fs.contractFactIcon} aria-hidden />
                      {copy.credits}
                    </dt>
                    <dd className={contractCreditsEmpty ? fs.contractFactEmpty : contractCreditsBlocked ? fs.contractFactWarn : ""}>
                      {contractCreditsLabel}
                    </dd>
                  </div>}
                  {!isSalesTicketDetail && !isCommunity && <div className={fs.contractFactRow}>
                    <dt className={fs.contractFactLabel}>
                      <Icon icon="mdi:clock-check-outline" className={fs.contractFactIcon} aria-hidden />
                      {copy.sla}
                    </dt>
                    <dd className={contractSlaEmpty ? fs.contractFactEmpty : ""}>{contractSlaLabel}</dd>
                  </div>}
                </dl>
            </RightPaneCollapsibleSection>

            <RightPaneStaticSection title={copy.rightPane.channel} titleId="ticket-detail-channel-label">
              <div className={fs.channelIconBar} role="radiogroup" aria-labelledby="ticket-detail-channel-label">
                {copy.channelOptions.map(item => {
                    const channelDisabled = isTicketChannelDisabled(item.key);
                    return <button key={item.key} type="button" role="radio" aria-checked={editForm.channel === item.key} aria-label={item.label} aria-disabled={channelDisabled} title={item.key === "whatsapp" && !isWhatsAppNativeTicket ? copy.channelWhatsappDisabled : item.label} className={`${fs.channelIconBtn} ${editForm.channel === item.key ? fs.channelIconBtnActive : ""} ${channelDisabled ? fs.channelIconBtnDisabled : ""}`} disabled={channelDisabled} onClick={async () => {
                      if (channelDisabled) return;
                      setEditForm(p => ({
                        ...p,
                        channel: item.key
                      }));
                      await updateTicketLive({
                        channel: item.key
                      }, {
                        successMessage: copy.toasts.channelUpdated
                      });
                    }}>
                      <Icon icon={item.icon} aria-hidden />
                    </button>;
                  })}
              </div>
            </RightPaneStaticSection>

            <RightPaneCollapsibleSection sectionId="ticket-detail-dates-body" title={copy.rightPane.ticketSection} expanded={rightPaneCollapse.ticketDates} onToggle={() => toggleRightPaneCollapse("ticketDates")}>
              <div className={styles.contextLine}><strong>{copy.rightPane.created}</strong> {copy.formatDateTime(ticket.created_at)}</div>
              <div className={styles.contextLine} title={ticketTakeoverStat ? copy.formatTakeoverTooltip(copy.getStatusLabel(ticketTakeoverStat.newStatus === "open" ? "new" : ticketTakeoverStat.newStatus)) : copy.takeoverTooltipNone}>
                <strong>{copy.rightPane.takeover}</strong> {ticketTakeoverLabel}
              </div>
              <div className={styles.contextLine}><strong>{copy.rightPane.updated}</strong> {copy.formatDateTime(ticket.updated_at)}</div>
              <div className={styles.contextLine}><strong>{copy.rightPane.closed}</strong> {copy.formatDateTime(ticket.closed_at)}</div>
            </RightPaneCollapsibleSection>

            <RightPaneCollapsibleSection sectionId="ticket-detail-linked-ticket-body" title={copy.rightPane.linkedTicket} count={linkedTickets.length} expanded={rightPaneCollapse.linkedTicket} onToggle={() => toggleRightPaneCollapse("linkedTicket")} sectionClassName={styles.rightPaneSectionPicker} bodyClassName={fs.settingsPanel}>
              <div className={fs.contactPicker} ref={linkedTicketDropdownRef}>
                  <div className={`${fs.contactInputWrap} ${showLinkedTicketDropdown ? fs.contactInputWrapOpen : ""}`}>
                    <Icon icon="mdi:magnify" className={fs.contactInputIcon} aria-hidden />
                    <input className={fs.contactInput} type="text" value={linkedTicketSearch} autoComplete="off" placeholder={copy.rightPane.searchTicket} disabled={isReadOnly} aria-expanded={showLinkedTicketDropdown} aria-haspopup="listbox" onChange={e => {
                      setLinkedTicketSearch(e.target.value);
                      setShowLinkedTicketDropdown(true);
                      setLinkedTicketHighlight(0);
                      setLinkedTicketDraft("");
                    }} onFocus={() => setShowLinkedTicketDropdown(true)} onKeyDown={e => {
                      if (!showLinkedTicketDropdown || filteredLinkedTicketOptions.length === 0) return;
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setLinkedTicketHighlight(h => Math.min(h + 1, filteredLinkedTicketOptions.length - 1));
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setLinkedTicketHighlight(h => Math.max(h - 1, 0));
                      } else if (e.key === "Enter") {
                        e.preventDefault();
                        const picked = filteredLinkedTicketOptions[linkedTicketHighlight];
                        if (picked) addLinked(picked.id);
                      } else if (e.key === "Escape") {
                        setShowLinkedTicketDropdown(false);
                      }
                    }} />
                  </div>
                  {showLinkedTicketDropdown && <div className={fs.contactDropdown} role="listbox">
                      {filteredLinkedTicketOptions.length === 0 ? <div className={fs.contactEmpty}>{copy.rightPane.noTicket}</div> : filteredLinkedTicketOptions.map((row, idx) => <button key={row.id} type="button" role="option" className={`${fs.contactOption} ${linkedTicketHighlight === idx ? fs.contactOptionActive : ""}`} onMouseEnter={() => setLinkedTicketHighlight(idx)} onClick={() => addLinked(row.id)}>
                            <span className={fs.contactOptionName}>{getTicketLinkLabel(row)}</span>
                          </button>)}
                    </div>}
                </div>
                <div className={fs.chipsWrap}>
                  {linkedTickets.length === 0 ? <span className={fs.emptyChipHint}>{copy.rightPane.noLinkedTicket}</span> : visibleLinkedTickets.map(link => {
                    const linkId = link.linked_ticket_id || link.ticket_id || link.link_id || link.id;
                    const linkNumber = link.ticket_number || link.linked_ticket_number || link.ticket_id;
                    const linkTitle = link.title || copy.linkedTicketFallback;
                    return <span key={link.id || link.link_id || link.ticket_id || linkId} className={fs.chip}>
                          <button type="button" onClick={() => openLinkedTicketDetail(linkId, linkNumber, linkTitle)}>
                            #{linkNumber} - {linkTitle}
                          </button>
                          <button type="button" onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeLinked(linkId);
                      }} disabled={isReadOnly} aria-label={copy.formatRemoveLinkedTicketAria(linkNumber)}>
                            ×
                          </button>
                        </span>;
                  })}
                </div>
                {hasMoreLinkedTickets ? <SidebarExpandToggle copy={copy} expanded={linkedTicketsExpanded} onClick={() => setLinkedTicketsExpanded(prev => !prev)} /> : null}
            </RightPaneCollapsibleSection>

            <RightPaneCollapsibleSection sectionId="ticket-detail-linked-equipment-body" title={copy.rightPane.linkedEquipment} count={linkedEquipments.length} expanded={rightPaneCollapse.linkedEquipment} onToggle={() => toggleRightPaneCollapse("linkedEquipment")} sectionClassName={styles.rightPaneSectionPicker} bodyClassName={fs.settingsPanel}>
              <div className={fs.contactPicker} ref={linkedEquipmentDropdownRef}>
                  <div className={`${fs.contactInputWrap} ${showLinkedEquipmentDropdown ? fs.contactInputWrapOpen : ""}`}>
                    <Icon icon="mdi:magnify" className={fs.contactInputIcon} aria-hidden />
                    <input className={fs.contactInput} type="text" value={linkedEquipmentSearch} autoComplete="off" placeholder={effectiveTicketClientId ? copy.rightPane.searchEquipment : copy.rightPane.companyRequired} disabled={isReadOnly || !effectiveTicketClientId} aria-expanded={showLinkedEquipmentDropdown} aria-haspopup="listbox" onChange={e => {
                      setLinkedEquipmentSearch(e.target.value);
                      setShowLinkedEquipmentDropdown(true);
                      setLinkedEquipmentHighlight(0);
                      setLinkedEquipmentDraft("");
                    }} onFocus={() => {
                      if (effectiveTicketClientId) setShowLinkedEquipmentDropdown(true);
                    }} onKeyDown={e => {
                      if (!showLinkedEquipmentDropdown || filteredLinkedEquipmentOptions.length === 0) return;
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setLinkedEquipmentHighlight(h => Math.min(h + 1, filteredLinkedEquipmentOptions.length - 1));
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setLinkedEquipmentHighlight(h => Math.max(h - 1, 0));
                      } else if (e.key === "Enter") {
                        e.preventDefault();
                        const picked = filteredLinkedEquipmentOptions[linkedEquipmentHighlight];
                        if (picked) addLinkedEquipment(picked.id);
                      } else if (e.key === "Escape") {
                        setShowLinkedEquipmentDropdown(false);
                      }
                    }} />
                  </div>
                  {showLinkedEquipmentDropdown && <div className={fs.contactDropdown} role="listbox">
                      {!effectiveTicketClientId ? <div className={fs.contactEmpty}>{copy.rightPane.linkCompanyFirst}</div> : filteredLinkedEquipmentOptions.length === 0 ? <div className={fs.contactEmpty}>{copy.rightPane.noEquipment}</div> : filteredLinkedEquipmentOptions.map((equipment, idx) => <button key={equipment.id} type="button" role="option" className={`${fs.contactOption} ${linkedEquipmentHighlight === idx ? fs.contactOptionActive : ""}`} onMouseEnter={() => setLinkedEquipmentHighlight(idx)} onClick={() => addLinkedEquipment(equipment.id)}>
                            <span className={fs.contactOptionName}>{getEquipmentLinkLabel(equipment)}</span>
                          </button>)}
                    </div>}
                </div>
                <div className={fs.chipsWrap}>
                  {linkedEquipments.length === 0 ? <span className={fs.emptyChipHint}>{copy.rightPane.noLinkedEquipment}</span> : visibleLinkedEquipments.map(equipment => <span key={equipment.equipment_id} className={fs.chip}>
                        <button type="button" onClick={() => openLinkedEquipmentDetail(equipment.equipment_id, equipment.name, equipment.type)}>
                          {getEquipmentLinkLabel(equipment)}
                        </button>
                        <button type="button" onClick={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeLinkedEquipment(equipment.equipment_id);
                    }} disabled={isReadOnly} aria-label={copy.formatRemoveEquipmentAria(getEquipmentLinkLabel(equipment))}>
                          ×
                        </button>
                      </span>)}
                </div>
                {hasMoreLinkedEquipments ? <SidebarExpandToggle copy={copy} expanded={linkedEquipmentsExpanded} onClick={() => setLinkedEquipmentsExpanded(prev => !prev)} /> : null}
            </RightPaneCollapsibleSection>

            {hasTicketSatisfactionData(ticket?.satisfaction) ? <RightPaneCollapsibleSection sectionId="ticket-detail-satisfaction-body" title={copy.rightPane.satisfaction} expanded={rightPaneCollapse.satisfaction} onToggle={() => toggleRightPaneCollapse("satisfaction")} titleAdornment={<TicketSatisfactionHeaderBadge filled copy={copy} />}>
                  <TicketSatisfactionCriteriaPanel satisfaction={ticket.satisfaction} copy={copy} criteria={satisfactionCriteria} />
                  {ticket.satisfaction.authorName ? <div className={styles.contextLine}>
                      <strong>{copy.rightPane.satisfactionBy}</strong> {ticket.satisfaction.authorName}
                    </div> : null}
                  {ticket.satisfaction.createdAt ? <div className={styles.contextLine}>
                      <strong>{copy.rightPane.satisfactionDate}</strong>{" "}
                      {copy.formatDateTime(ticket.satisfaction.createdAt)}
                    </div> : null}
                  {ticket.satisfaction.message ? <p className={styles.satisfactionMessage}>{ticket.satisfaction.message}</p> : null}
            </RightPaneCollapsibleSection> : null}

            {requesterInteractions.length > 0 ? <RightPaneCollapsibleSection sectionId="ticket-detail-requester-history-body" title={copy.rightPane.history} count={requesterInteractions.length} expanded={rightPaneCollapse.requesterHistory} onToggle={() => toggleRightPaneCollapse("requesterHistory")}>
              <div className={styles.interactionsList}>
                  {visibleRequesterInteractions.map(item => {
                    const short = copy.getStatusShort(item.status) || "?";
                    const statusKey = item.status === "open" ? "new" : item.status;
                    return <button key={item.id} type="button" className={styles.interactionItem} onClick={() => onNavigate?.("TicketDetail", {
                      ticketId: item.id,
                      ticketNumber: item.ticket_number,
                      title: item.title
                    })}>
                          <span className={`${styles.interactionStatus} ${styles[`interactionStatus_${statusKey}`]}`}>{short}</span>
                          <span className={styles.interactionBody}>
                            <span className={styles.interactionTitle}>
                              #{item.ticket_number || "-"}
                              {item.title ? ` · ${item.title}` : ""}
                            </span>
                            <span className={styles.interactionDate}>{copy.formatDateTime(item.updated_at || item.created_at)}</span>
                          </span>
                        </button>;
                  })}
                </div>
                {hasMoreRequesterInteractions ? <SidebarExpandToggle copy={copy} expanded={historyExpanded} onClick={() => setHistoryExpanded(prev => !prev)} /> : null}
            </RightPaneCollapsibleSection> : null}

            {isDeleted && <div className={styles.deletedBadge}>{copy.empty.deletedBadge}</div>}
              </>}
          </aside>

          <aside className={styles.rightSidebar}>
            <button type="button" className={`${styles.sidebarActionBtn} ${rightPaneView === "context" ? styles.sidebarActionBtnActive : ""}`.trim()} title={copy.sidebar.classicViewTitle} aria-label={copy.sidebar.classicViewAria} aria-pressed={rightPaneView === "context"} onClick={() => setRightPaneView("context")}>
              <Icon icon="mdi:view-dashboard-outline" />
            </button>
            {aiFeatures.ticketRunbook && canAiRunbook ? <button type="button" className={`${styles.sidebarActionBtn} ${rightPaneView === "runbook" ? styles.sidebarActionBtnActive : ""}`.trim()} title={copy.sidebar.runbookTitle} aria-label={copy.rightPane.runbookToggleAria} aria-pressed={rightPaneView === "runbook"} onClick={() => setRightPaneView("runbook")}>
                <Icon icon="mdi:clipboard-list-outline" aria-hidden />
              </button> : null}
            <button type="button" className={`${styles.sidebarActionBtn} ${rightPaneView === "history" ? styles.sidebarActionBtnActive : ""}`.trim()} title={copy.rightPane.historyToggleTitle} aria-label={copy.rightPane.historyToggleAria} aria-pressed={rightPaneView === "history"} onClick={() => {
              setRightPaneView("history");
              void refreshTicketHistory({
                showSpinner: true
              });
            }}>
              <Icon icon="mdi:history" />
            </button>
            <span className={styles.sidebarSeparator} aria-hidden />
            {!isDeleted && canDeleteTicket ? <button type="button" className={styles.sidebarActionBtn} title={copy.sidebar.deleteTitle} onClick={softDeleteCurrentTicket}>
                <Icon icon="mdi:trash-can-outline" />
              </button> : null}
          </aside>
        </div>

        <div className={`${styles.ticketChromeBar} ${styles.footerBar}`}>
          {isTicketClosed && !isDeleted ? <div className={styles.footerClosedWrap}>
              <span className={styles.footerClosedHint}>
                <Icon icon="mdi:lock-outline" aria-hidden />
                {copy.footer.closedHint}
              </span>
              <button type="button" className={styles.footerReopenBtn} onClick={() => setReopenModalOpen(true)} disabled={reopeningTicket}>
                <Icon icon="mdi:lock-open-outline" aria-hidden />
                {reopeningTicket ? copy.footer.reopening : copy.footer.reopen}
              </button>
            </div> : <>
          <div className={styles.footerLeft}>
            {canMacro ? <div className={styles.footerMacroWrap}>
              <Icon icon="mdi:flash-outline" className={styles.footerIcon} />
              <select className={styles.footerSelect} value={macroSelection} onChange={e => setMacroSelection(e.target.value)} disabled={isReadOnly}>
                <option value="">{copy.footer.applyMacro}</option>
                {availableMacros.map(macro => <option key={macro.id} value={macro.id}>
                    {macro.name}
                  </option>)}
              </select>
              <button type="button" className={styles.footerGhostBtn} onClick={runMacro} disabled={!macroSelection || isReadOnly}>
                Apply
              </button>
            </div> : null}
          </div>
          <div className={styles.footerRight}>
            {isDeleted && <>
                <button type="button" className={styles.footerGhostBtn} onClick={restoreCurrentTicket}>
                  {copy.footer.restore}
                </button>
                {canHardPurge && <button type="button" className={styles.footerDangerBtn} onClick={permanentlyDeleteCurrentTicket}>
                    {copy.footer.permanentDelete}
                  </button>}
              </>}
            <div className={styles.footerSubmitWrap}>
              {(showConsumeCreditOption || showRefundCreditOption || supportCredit?.consumed) && <div className={styles.creditFooterBox}>
                  {supportCredit?.consumed ? <span className={styles.creditFooterInfo}>
                      <Icon icon="mdi:ticket-confirmation-outline" />
                      {Number(supportCredit?.totalDebited || 0) > 0 ? copy.formatCreditConsumed(supportCredit.totalDebited) : copy.footer.creditConsumed}
                    </span> : <span className={styles.creditFooterInfo}>
                      <Icon icon="mdi:ticket-confirmation-outline" />
                      {copy.formatCreditAvailable(supportCredit?.balance ?? 0)}
                    </span>}
                  {showConsumeCreditOption && <label className={styles.creditFooterCheck}>
                      <input type="checkbox" checked={consumeSupportCredit} onChange={e => setConsumeSupportCredit(e.target.checked)} disabled={Number(supportCredit?.balance || 0) <= 0} />
                      {copy.footer.consumeCredit}
                    </label>}
                  {showRefundCreditOption && <label className={styles.creditFooterCheck}>
                      <input type="checkbox" checked={refundSupportCredit} onChange={e => setRefundSupportCredit(e.target.checked)} />
                      {copy.footer.refundCredit}
                    </label>}
                </div>}
              <div className={styles.footerSubmitActions}>
              {canRequestValidation ? <button
                type="button"
                className={styles.footerValidationBtn}
                onClick={() => openValidationModal(null)}
                disabled={isReadOnly || submittingStatus !== "" || Boolean(pendingValidationRequest)}
                title={pendingValidationRequest ? validationCopy.requestValidationDisabledTitle : validationCopy.requestValidationTitle}
              >
                <Icon icon="mdi:clipboard-check-outline" aria-hidden />
                {validationCopy.requestValidation}
              </button> : null}
              <button type="button" className={styles.footerSubmitBtn} onClick={handleFooterSubmit} disabled={isReadOnly || submittingStatus !== ""}>
                {submittingStatus ? copy.footer.sending : availableSubmitActions.find(a => a.id === selectedSubmitAction)?.label || availableSubmitActions[0]?.label}
              </button>
              <div className={styles.footerSubmitChevronWrap}>
                <Icon icon="mdi:chevron-down" className={styles.footerSubmitChevronIcon} />
                <select className={styles.footerSubmitSelectOverlay} value={selectedSubmitAction} onChange={e => setSelectedSubmitAction(e.target.value)} disabled={isReadOnly || submittingStatus !== ""} aria-label={copy.footer.submitStatusAria}>
                  {availableSubmitActions.map(action => <option key={action.id} value={action.id}>
                      {action.label}
                    </option>)}
                </select>
              </div>
              </div>
            </div>
          </div>
            </>}
        </div>
        </div>}

      {macroAttachmentModalOpen && <div className={styles.ticketActionModalOverlay} onClick={closeMacroAttachmentModal}>
          <div className={styles.ticketActionModalCard} onClick={event => event.stopPropagation()}>
            <div className={styles.ticketActionModalHeader}>
              <h3 className={styles.ticketActionModalTitle}>
                <Icon icon="mdi:paperclip" style={{
                marginRight: "0.5rem",
                verticalAlign: "middle"
              }} />
                {copy.macroAttachmentModal.title}
              </h3>
              <button type="button" className={styles.ticketActionModalCloseBtn} onClick={closeMacroAttachmentModal}>
                <Icon icon="mingcute:close-line" />
              </button>
            </div>

            <div className={styles.ticketActionModalBody}>
              <p className={styles.ticketActionModalHint}>
                {copy.macroAttachmentModal.hint}
              </p>

              <label className={styles.uploadBtn}>
                <Icon icon="mdi:paperclip" />
                {copy.macroAttachmentModal.addFiles}
                <input type="file" multiple accept={ATTACHMENT_ACCEPT} onChange={e => {
                const selectedFiles = Array.from(e.target.files || []);
                try {
                  applySelectedMacroAttachments(selectedFiles);
                } catch (error) {
                  toast.error(error.message || copy.attachmentInvalid);
                } finally {
                  e.target.value = "";
                }
              }} />
              </label>

              {macroAttachmentFiles.length > 0 && <div className={styles.attachmentsDraft}>
                  {macroAttachmentFiles.map(file => <span key={`${file.name}-${file.size}-${file.lastModified || 0}`}>
                      {file.name}
                      <button type="button" onClick={() => setMacroAttachmentFiles(prev => prev.filter(entry => `${entry.name}-${entry.size}-${entry.lastModified || 0}` !== `${file.name}-${file.size}-${file.lastModified || 0}`))}>
                        ×
                      </button>
                    </span>)}
                </div>}
            </div>

            <div className={styles.ticketActionModalFooter}>
              <button type="button" className={styles.ticketActionModalCancelBtn} onClick={closeMacroAttachmentModal}>
                {copy.macroAttachmentModal.cancel}
              </button>
              <button type="button" className={styles.ticketActionModalConfirmBtn} onClick={confirmRunMacroWithAttachments}>
                {copy.macroAttachmentModal.continue}
              </button>
            </div>
          </div>
        </div>}

      <TicketExclusionModal open={exclusionModalOpen} ticket={ticket} requesterEmail={requesterEmail && requesterEmail !== "-" ? requesterEmail : ""} saving={savingExclusion} onClose={closeExclusionModal} onConfirm={addCurrentTicketToExclusions} />

      <TicketSplitModal open={splitModalOpen} ticket={ticket} targets={availableLinkTargets} saving={savingSplit} onClose={closeSplitModal} onConfirm={splitCurrentTicket} />

      <TicketReminderModal open={reminderModalOpen} ticket={ticket} requesterName={requesterDisplayName} reminder={ticketReminder} saving={savingReminder} deleting={deletingReminder} onClose={closeReminderModal} onSave={saveTicketReminder} onDelete={deleteTicketReminder} />
      <TicketValidationRequestModal
        open={validationModalOpen}
        ticket={ticket}
        users={users}
        currentUserId={currentUserId}
        saving={savingValidationRequest}
        initialRequest={editingValidationRequest}
        onClose={closeValidationModal}
        onSubmit={submitValidationRequest}
      />

      <TicketResolveModal open={resolveModalOpen} ticket={ticket} copy={copy.resolveModal} locale={locale} saving={savingResolve} hasPendingReply={resolvePendingReply} creditEnabled={resolveCreditEnabled} onCreditEnabledChange={setResolveCreditEnabled} creditAmounts={resolveCreditAmounts} onCreditAmountsChange={setResolveCreditAmounts} creditsProLocked={isCommunity} onCreditsProClick={() => setProPromoFeature("credits")} supportCredit={supportCredit} supportCreditBalance={supportCredit?.balance ?? 0} onClose={() => {
        if (savingResolve) return;
        resolveAfterReplyRef.current = false;
        pendingResolveReplyRef.current = null;
        setResolvePendingReply(false);
        setResolveModalOpen(false);
      }} onConfirm={handleConfirmResolve} />

      <TicketReopenModal open={reopenModalOpen} ticket={ticket} copy={copy.reopenModal} saving={reopeningTicket} onClose={() => !reopeningTicket && setReopenModalOpen(false)} onConfirm={confirmReopenTicket} />

      <TicketConfirmModal open={Boolean(deleteConfirmConfig)} title={deleteConfirmConfig?.title} message={deleteConfirmConfig?.message} confirmLabel={deleteConfirmConfig?.confirmLabel} variant="danger" icon={deleteConfirmConfig?.icon} loading={deletingTicket} onClose={closeDeleteConfirm} onConfirm={confirmDeleteTicket} />
      <TicketInsertLinkModal open={linkModalOpen} copy={copy.reply} initialText={linkModalText} onClose={() => setLinkModalOpen(false)} onInsert={handleInsertLink} />

      <ContactFormModal open={contactModalOpen} initialContact={contactModalInitial} clients={clients} defaultClientId={contactModalInitial?.client_id || ticket?.client_id || editForm.clientId || null} onClose={closeContactModal} onSuccess={handleQuickAddRequesterContactSaved} />
      <TicketLinkRequesterEmailModal open={linkRequesterEmailModalOpen} email={orphanRequesterEmail} contacts={contacts} copy={copy} onClose={() => setLinkRequesterEmailModalOpen(false)} onLinked={handleRequesterEmailLinked} />
      {orphanRequesterChoiceOpen ? createPortal(<div className={styles.orphanChoiceOverlay} onClick={() => setOrphanRequesterChoiceOpen(false)} role="presentation">
            <div className={styles.orphanChoiceShell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="orphan-requester-choice-title">
              <h2 className={styles.orphanChoiceTitle} id="orphan-requester-choice-title">{copy.orphanRequesterMenuAria}</h2>
              <p className={styles.orphanChoiceSubtitle}>{orphanRequesterEmail}</p>
              <div className={styles.orphanChoiceActions}>
                {canCreateContact ? <button type="button" className={styles.orphanChoiceBtn} onClick={openQuickAddRequesterContact}>
                    <Icon icon="mdi:account-plus-outline" aria-hidden />
                    <span>{copy.createContact}</span>
                  </button> : null}
                {canLinkRequesterEmail ? <button type="button" className={styles.orphanChoiceBtn} onClick={openLinkRequesterEmailModal}>
                    <Icon icon="mdi:link-variant" aria-hidden />
                    <span>{copy.linkContact}</span>
                  </button> : null}
              </div>
              <button type="button" className={styles.orphanChoiceCancel} onClick={() => setOrphanRequesterChoiceOpen(false)}>
                {copy.cancel || "Cancel"}
              </button>
            </div>
          </div>, document.body) : null}

      <ProFeaturePromoModal open={Boolean(proPromoFeature)} featureKey={proPromoFeature} onClose={() => setProPromoFeature(null)} />

      {showSideConversationModal && <div className={styles.sideChatPopup} ref={newSideConversationPopupRef} style={newSideConversationPopupStyle || undefined}>
          <div className={styles.sideChatHeader}>
            <div>
              <div className={styles.sideChatTitle}>{copy.sideModal.newTitle}</div>
              <div className={styles.sideChatSubtitle}>{copy.sideModal.newSubtitle}</div>
            </div>
            <button type="button" className={styles.closeModalBtn} onClick={() => {
            setShowSideConversationModal(false);
            resetSideConversationForm();
          }}>
              <Icon icon="mdi:close" />
            </button>
          </div>
          <div className={styles.sideConversationBody}>
            <label className={styles.fieldLabel}>{copy.sideModal.target}</label>
            <select className={styles.input} value={sideConversation.team} onChange={e => {
            const nextTeam = e.target.value;
            setSideConversation(prev => ({
              ...prev,
              team: nextTeam
            }));
            if (nextTeam !== "external") {
              setSideConversationPrestataireId("");
              setSideConversationContactKey("");
            }
          }}>
              {copy.sideConversationTeamOptions.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
            </select>

            {canViewPrestataires && sideConversation.team === "external" ? <>
                <label className={styles.fieldLabel}>{copy.sideModal.prestataire}</label>
                {!effectiveTicketClientId ? <p className={styles.sideConversationHint}>{copy.sideModal.prestataireNoClient}</p> : loadingSideConversationPrestataires ? <p className={styles.sideConversationHint}>{copy.sideModal.prestataireLoading}</p> : sideConversationPrestataires.length === 0 ? <p className={styles.sideConversationHint}>{copy.sideModal.prestataireEmpty}</p> : <select className={styles.input} value={sideConversationPrestataireId} onChange={e => {
                const nextId = e.target.value;
                if (!nextId) {
                  setSideConversationPrestataireId("");
                  setSideConversationContactKey("");
                  return;
                }
                const picked = sideConversationPrestataires.find(row => String(row.id) === String(nextId));
                if (picked) applySideConversationPrestataire(picked);
              }}>
                    <option value="">{copy.sideModal.prestatairePlaceholder}</option>
                    {sideConversationPrestataires.map(row => <option key={row.id} value={row.id}>
                        {row.nom || `Prestataire #${row.id}`}
                        {row.type ? ` · ${row.type}` : ""}
                      </option>)}
                  </select>}

                {selectedSideConversationPrestataire && sideConversationPrestataireContacts.length > 1 ? <>
                    <label className={styles.fieldLabel}>{copy.sideModal.prestataireContact}</label>
                    <select className={styles.input} value={sideConversationContactKey} onChange={e => {
                applySideConversationPrestataire(selectedSideConversationPrestataire, e.target.value);
              }}>
                      <option value="">{copy.sideModal.prestataireContactPlaceholder}</option>
                      {sideConversationPrestataireContacts.map(contact => <option key={contact.key} value={contact.key}>
                          {formatPrestataireContactLabel(contact)}
                        </option>)}
                    </select>
                  </> : null}

                {sideConversationPrestataireId ? <p className={styles.sideConversationHint}>{copy.sideModal.prestataireAppliedHint}</p> : null}
              </> : null}

            <label className={styles.fieldLabel}>{copy.sideModal.subject}</label>
            <input className={styles.input} type="text" placeholder={copy.sideModal.subjectPlaceholder} value={sideConversation.subject} onChange={e => setSideConversation(prev => ({
            ...prev,
            subject: e.target.value
          }))} />

            <label className={styles.fieldLabel}>{copy.sideModal.recipient}</label>
            <input className={styles.input} type="text" list="side-conversation-users" placeholder={copy.sideModal.recipientPlaceholder} value={sideConversation.to} onChange={e => setSideConversation(prev => ({
            ...prev,
            to: e.target.value
          }))} />

            <label className={styles.fieldLabel}>{copy.sideModal.cc}</label>
            <input className={styles.input} type="text" list="side-conversation-users" placeholder={copy.sideModal.ccPlaceholder} value={sideConversation.cc} onChange={e => setSideConversation(prev => ({
            ...prev,
            cc: e.target.value
          }))} />
            <datalist id="side-conversation-users">
              {userSearchOptions.map(opt => <option key={opt.id} value={opt.label} />)}
            </datalist>

            <label className={styles.fieldLabel}>{copy.sideModal.message}</label>
            <textarea className={styles.editor} rows={5} placeholder={copy.sideModal.messagePlaceholder} value={sideConversation.message} onChange={e => setSideConversation(prev => ({
            ...prev,
            message: e.target.value
          }))} />
          </div>
          <div className={styles.sideConversationFooter}>
            <button type="button" className={styles.secondaryBtn} onClick={() => {
            setShowSideConversationModal(false);
            resetSideConversationForm();
          }}>
              {copy.sideModal.cancel}
            </button>
            <button type="button" className={styles.primaryBtn} onClick={submitSideConversation}>
              <Icon icon="mdi:send" />
              {copy.sideModal.send}
            </button>
          </div>
        </div>}

      {activeSideConversation && <div className={styles.sideChatPopup} ref={activeSideConversationPopupRef} style={activeSideConversationPopupStyle || undefined}>
          <div className={styles.sideChatHeader}>
            <div>
              <div className={styles.sideChatTitle}>{activeSideConversation.subject}</div>
              <div className={styles.sideChatSubtitle}>
                {copy.sideConversationTeamOptions.find(opt => opt.key === activeSideConversation.team)?.label || activeSideConversation.team}
                {" · "}
                {activeSideConversation.status === "done" ? copy.sideModal.statusDone : copy.sideModal.statusOpen}
                {activeSideConversation.to ? ` · To: ${activeSideConversation.to}` : ""}
                {activeSideConversation.cc ? ` · CC: ${activeSideConversation.cc}` : ""}
              </div>
            </div>
            <button type="button" className={styles.closeModalBtn} onClick={() => setActiveSideConversationId(null)}>
              <Icon icon="mdi:close" />
            </button>
          </div>
          <div className={styles.sideChatMessages}>
            {activeSideConversation.messages.map(msg => <div key={msg.id} className={styles.sideChatMessage}>
                <div className={styles.sideChatMessageMeta}>
                  <strong>{msg.author}</strong>
                  <span>{copy.formatDateTime(msg.createdAt)}</span>
                  {canDeleteSideConversationMessage(msg.id) && <SmartTooltip content={copy.comment.deleteTooltip}>
                      <button type="button" className={styles.commentDeleteBtn} onClick={() => deleteComment(msg.id)} disabled={String(deletingCommentId) === String(msg.id)} aria-label={copy.comment.deleteAria}>
                        <Icon icon="mdi:trash-can-outline" />
                      </button>
                    </SmartTooltip>}
                </div>
                <p>{msg.content}</p>
              </div>)}
          </div>
          <div className={styles.sideChatComposer}>
            <input className={styles.input} type="text" placeholder={copy.sideModal.replyPlaceholder} value={sideReplyDraft} onChange={e => setSideReplyDraft(e.target.value)} disabled={activeSideConversation.status === "done"} />
            <button type="button" className={styles.secondaryBtn} onClick={submitSideReply} disabled={activeSideConversation.status === "done"}>
              {copy.sideModal.sendReply}
            </button>
            {activeSideConversation.status === "done" ? <button type="button" className={styles.primaryBtn} onClick={reopenSideConversation}>
                {copy.sideModal.reopen}
              </button> : <button type="button" className={styles.primaryBtn} onClick={markSideConversationDone}>
                {copy.sideModal.close}
              </button>}
          </div>
        </div>}
      </div>
      <TicketImageLightbox
        open={Boolean(imageLightbox?.url)}
        src={imageLightbox?.url || ""}
        alt={imageLightbox?.alt || ""}
        onClose={closeImageLightbox}
        closeAria={copy.comment?.lightboxCloseAria || "Fermer"}
      />
    </div>;
}
