import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { FaPlus, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import {
  addTicketAssignee,
  addTicketTag,
  addTicketWatcher,
  deleteTicket,
  fetchTicket,
  fetchSalesForm,
  fetchSalesTicketCategories,
  removeTicketAssignee,
  removeTicketTag,
  removeTicketWatcher,
  updateTicket,
  consumeTicketSupportCredits,
  uploadTicketTaskAttachments,
  deleteTicketAttachment
} from "../../api/tickets";
import { fetchClientsList, fetchContactsList } from "../../api/clients";
import { fetchActiveUsers } from "../../api/users";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { usePermissions } from "../../contexts/PermissionsContext";
import { useAuthContext } from "../../contexts/AuthContext";
import { useVeritasEdition } from "../../hooks/useVeritasEdition";
import ProFeatureBadge from "../Misc/ProFeature/ProFeatureBadge";
import { resolveSalesKind, buildSalesFormFieldEntries, buildSalesFormFieldLabelMap, buildSalesFormFieldTypeMap, enrichSalesFormLinkedEntries, computeSalesTaskStats } from "../../utils/salesTicketUtils";
import { reconcileSalesTaskPlanningEvent, deleteSalesTaskPlanningEvents } from "../../utils/salesTaskPlanningEvent";
import { interpolate } from "../../i18n/translate";
import SmartTooltip from "../SmartTooltip";
import { getTicketDetailCopy } from "./ticketDetailPageI18n";
import { getTicketSalesDetailCopy } from "./ticketSalesDetailI18n";
import { getEquipmentPickerLabel, getEquipmentSearchText, loadClientEquipments, serializeEquipmentInfo } from "./ticketEquipmentUtils";
import TicketChatPanel from "./TicketChatPanel";
import SalesTasksPanel from "./SalesTasksPanel";
import TicketTagSuggestField from "./TicketTagSuggestField";
import SalesCreditDebitModal from "./SalesCreditDebitModal";
import TicketConfirmModal from "./TicketConfirmModal";
import SalesFormFieldValue from "./SalesFormFieldValue";
import SalesFormFieldsRenderer, { buildDynamicFieldLines, filterVisibleFields, validateDynamicFields } from "./SalesFormFieldsRenderer";
import { isFileField, isLayoutField } from "../../utils/salesFormFieldTypes";
import td from "./TicketDetailPage.module.css";
import fs from "./TicketCreatePage.module.css";
import heroStyles from "../EnterprisesPage/EnterpriseDetailPage.module.css";
import styles from "./TicketSalesDetailPage.module.css";

function normalizeStatus(status) {
  return status === "open" ? "new" : status;
}

function clampProgress(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function resolveFormData(ticket) {
  return ticket?.sales_form_data || ticket?.salesFormData || null;
}

function normalizePmTasks(formData) {
  const raw = Array.isArray(formData?.pmTasks) ? formData.pmTasks : [];
  return raw
    .map((task, index) => {
      const assigneesRaw = Array.isArray(task?.assignees) ? task.assignees : [];
      let assignees = assigneesRaw
        .map(entry => ({
          id: String(entry?.id || entry?.userId || entry?.user_id || "").trim(),
          label: String(entry?.label || entry?.name || entry?.username || "").trim() || null
        }))
        .filter(entry => entry.id);
      const legacyId = task?.assigneeId || task?.assignee_id || null;
      if (assignees.length === 0 && legacyId) {
        assignees = [
          {
            id: String(legacyId),
            label: String(task?.assigneeLabel || task?.assignee_label || "").trim() || null
          }
        ];
      }
      const primary = assignees[0] || null;
      return {
        id: String(task?.id || `task-${index + 1}`),
        label: String(task?.label || "").trim(),
        description: String(task?.description || "").trim() || null,
        done: Boolean(task?.done),
        assignees,
        assigneeId: primary?.id || null,
        assigneeLabel: primary?.label || null,
        startAt: task?.startAt || task?.start_at || null,
        endAt: task?.endAt || task?.end_at || null,
        eventType: String(task?.eventType || task?.event_type || task?.type || "").trim() || null,
        planningEventId: task?.planningEventId || task?.planning_event_id || null,
        equipmentId: task?.equipmentId || task?.equipment_id || null,
        equipmentLabel: String(task?.equipmentLabel || task?.equipment_label || "").trim() || null,
        createdById: task?.createdById || task?.created_by_id || null,
        createdByLabel: String(task?.createdByLabel || task?.created_by_label || "").trim() || null,
        updatedById: task?.updatedById || task?.updated_by_id || null,
        updatedByLabel: String(task?.updatedByLabel || task?.updated_by_label || "").trim() || null,
        createdAt: task?.createdAt || task?.created_at || null,
        updatedAt: task?.updatedAt || task?.updated_at || task?.createdAt || task?.created_at || null,
        documents: []
      };
    })
    .filter(task => task.label);
}

function normalizeTaskDocument(attachment) {
  if (!attachment) return null;
  const id = attachment.id || null;
  const fileName = attachment.file_name || attachment.fileName || attachment.filename || attachment.name || "file";
  const filePath = attachment.file_path || attachment.filePath || attachment.path || attachment.url || "";
  return {
    id,
    fileName,
    filePath,
    mimeType: attachment.mime_type || attachment.mimeType || null,
    fileSize: attachment.file_size ?? attachment.fileSize ?? null,
    createdAt: attachment.created_at || attachment.createdAt || null,
    taskId: attachment.task_id || attachment.taskId || null
  };
}

function attachDocumentsToTasks(tasks, attachments) {
  const list = Array.isArray(tasks) ? tasks : [];
  const docs = (Array.isArray(attachments) ? attachments : [])
    .map(normalizeTaskDocument)
    .filter(doc => doc?.taskId && doc.filePath);
  return list.map(task => ({
    ...task,
    documents: docs.filter(doc => String(doc.taskId) === String(task.id))
  }));
}

function buildPmTasksFromTicket(ticket, formDataOverride) {
  const formData = formDataOverride || resolveFormData(ticket) || {};
  return attachDocumentsToTasks(normalizePmTasks(formData), ticket?.attachments);
}

function formatTaskSchedule(task, formatDateTime, rangeJoiner) {
  if (!task?.startAt && !task?.endAt) return null;
  if (task.startAt && task.endAt) {
    return `${formatDateTime(task.startAt)} ${rangeJoiner} ${formatDateTime(task.endAt)}`;
  }
  return formatDateTime(task.startAt || task.endAt);
}

function userLabel(user) {
  if (!user || typeof user !== "object") return "";
  return (
    user.ticket_helpdesk_display_name ||
    user.display_name ||
    user.username ||
    user.name ||
    user.nom ||
    user.email ||
    ""
  );
}

function getContactLabel(contact) {
  if (!contact) return "";
  return `${contact.prenom || contact.first_name || ""} ${contact.nom || contact.last_name || ""}`.trim() || contact.email || String(contact.id || "");
}

function hydrateComments(ticket) {
  const comments = Array.isArray(ticket?.comments) ? ticket.comments : [];
  const ticketAttachments = Array.isArray(ticket?.attachments) ? ticket.attachments : [];
  return comments.map(comment => {
    const own = Array.isArray(comment.attachments) ? comment.attachments : [];
    const linked = ticketAttachments.filter(att => String(att.comment_id || att.commentId || "") === String(comment.id || ""));
    const merged = [...own];
    linked.forEach(att => {
      if (!merged.some(item => String(item.id || item.path) === String(att.id || att.path))) merged.push(att);
    });
    return { ...comment, attachments: merged };
  });
}

function truncateLogText(value, max = 140) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

function htmlToPlainText(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSalesActivityLog(ticket, users, contacts, detailCopy) {
  if (!ticket) return [];
  const entries = [];
  const emptyValue = detailCopy.activity?.emptyValue || "—";
  const resolveActor = (userId, fallback = detailCopy.authorSystem) => {
    if (!userId) return fallback;
    const fromUsers = (Array.isArray(users) ? users : []).find(u => String(u.id) === String(userId));
    const label = userLabel(fromUsers);
    return label || fallback;
  };
  const resolveUser = id => {
    if (id == null || id === "") return emptyValue;
    const fromUsers = (Array.isArray(users) ? users : []).find(u => String(u.id) === String(id));
    return userLabel(fromUsers) || String(id);
  };
  const resolveContact = id => {
    if (id == null || id === "") return emptyValue;
    const fromContacts = (Array.isArray(contacts) ? contacts : []).find(c => String(c.id) === String(id));
    const label = getContactLabel(fromContacts);
    if (label) return label;
    return interpolate(detailCopy.activity.contactFallback || "Contact #{id}", { id: String(id) });
  };
  const resolveFieldValue = (field, value) => {
    if (value == null || value === "") return emptyValue;
    if (field === "assigned_user_id" || field === "assignee" || field === "requester_user_id" || field === "watcher") {
      return resolveUser(value);
    }
    if (field === "requester_contact_id") {
      return resolveContact(value);
    }
    return String(value);
  };

  if (ticket.created_at) {
    entries.push({
      id: `created-${ticket.id}`,
      at: ticket.created_at,
      kind: "created",
      icon: "mdi:ticket-plus-outline",
      label: detailCopy.activity.created,
      actor: resolveActor(ticket.created_by),
      detail: ticket.title || ""
    });
  }

  (Array.isArray(ticket.statusHistory) ? ticket.statusHistory : []).forEach(row => {
    const oldLabel = row.old_status ? detailCopy.getStatusLabel(row.old_status === "open" ? "new" : row.old_status) : null;
    const newLabel = detailCopy.getStatusLabel(row.new_status === "open" ? "new" : row.new_status);
    const rawNote = String(row.note || "").trim();
    const noteKey = rawNote.toLowerCase();
    const isUselessNote =
      !rawNote ||
      noteKey === "tickand update" ||
      noteKey === "ticket update" ||
      noteKey === "bulk update" ||
      noteKey === "tickand creation" ||
      noteKey.startsWith("tickand creation (");
    entries.push({
      id: `status-${row.id}`,
      at: row.created_at,
      kind: "status",
      icon: "mdi:swap-horizontal",
      label: oldLabel
        ? interpolate(detailCopy.activity.statusTransition, { oldLabel, newLabel })
        : interpolate(detailCopy.activity.statusChange, { newLabel }),
      actor: resolveActor(row.changed_by),
      detail: isUselessNote ? "" : rawNote
    });
  });

  (Array.isArray(ticket.activityHistory) ? ticket.activityHistory : []).forEach(row => {
    const action = String(row?.action || "");
    const field = String(row?.field || "");
    const fieldLabel = detailCopy.activity.fields?.[field] || field || detailCopy.activity.fields?.unknown || "Field";
    let label = action;
    let icon = "mdi:history";
    let kind = "field";
    if (action === "field_changed") {
      icon = "mdi:pencil-outline";
      label = interpolate(detailCopy.activity.fieldChanged, {
        field: fieldLabel,
        oldValue: resolveFieldValue(field, row?.old_value),
        newValue: resolveFieldValue(field, row?.new_value)
      });
    } else if (action === "assignee_added") {
      kind = "assignee";
      icon = "mdi:account-plus-outline";
      label = interpolate(detailCopy.activity.assigneeAdded, { name: resolveUser(row?.new_value) });
    } else if (action === "assignee_removed") {
      kind = "assignee";
      icon = "mdi:account-minus-outline";
      label = interpolate(detailCopy.activity.assigneeRemoved, { name: resolveUser(row?.old_value) });
    } else if (action === "watcher_added") {
      kind = "watcher";
      icon = "mdi:eye-plus-outline";
      label = interpolate(detailCopy.activity.watcherAdded, { name: resolveUser(row?.new_value) });
    } else if (action === "watcher_removed") {
      kind = "watcher";
      icon = "mdi:eye-minus-outline";
      label = interpolate(detailCopy.activity.watcherRemoved, { name: resolveUser(row?.old_value) });
    } else if (action === "tag_added") {
      kind = "tag";
      icon = "mdi:tag-plus-outline";
      label = interpolate(detailCopy.activity.tagAdded, { label: String(row?.new_value || "") });
    } else if (action === "tag_removed") {
      kind = "tag";
      icon = "mdi:tag-remove-outline";
      label = interpolate(detailCopy.activity.tagRemoved, { label: String(row?.old_value || "") });
    } else if (action === "deleted") {
      kind = "deleted";
      icon = "mdi:trash-can-outline";
      label = detailCopy.activity.deleted;
    } else if (action === "restored") {
      kind = "restored";
      icon = "mdi:restore";
      label = detailCopy.activity.restored;
    }
    entries.push({
      id: `activity-${row.id}`,
      at: row.created_at,
      kind,
      icon,
      label,
      actor: resolveActor(row.actor_user_id),
      detail: ""
    });
  });

  (Array.isArray(ticket.comments) ? ticket.comments : []).forEach(comment => {
    const plainContent = htmlToPlainText(comment?.content);
    if (comment.is_internal) {
      entries.push({
        id: `internal-${comment.id}`,
        at: comment.created_at,
        kind: "internal",
        icon: "mdi:lock-outline",
        label: detailCopy.activity.internalNote,
        actor: resolveActor(comment.author_user_id, comment.author_name || detailCopy.authorAgent),
        detail: plainContent
      });
      return;
    }
    entries.push({
      id: `comment-${comment.id}`,
      at: comment.created_at,
      kind: "comment",
      icon: "mdi:message-reply-text-outline",
      label: detailCopy.activity.publicReply,
      actor: resolveActor(comment.author_user_id, comment.author_name || detailCopy.authorAgent),
      detail: plainContent
    });
  });

  return entries
    .filter(entry => entry.at)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

function RightPaneStaticSection({ title, titleId, count = 0, headerExtra = null, sectionClassName = "", bodyClassName = "", children }) {
  const showCount = Number(count) > 0;
  return (
    <section className={`${heroStyles.sidebarSection} ${sectionClassName}`.trim()}>
      <div className={heroStyles.sidebarInfoHeader}>
        <span className={heroStyles.sidebarInfoTitle} id={titleId}>
          {title}
          {showCount ? <span className={heroStyles.sidebarSectionCount}>{Number(count)}</span> : null}
        </span>
        {headerExtra ? <span className={td.rightPaneCollapseHeaderEnd}>{headerExtra}</span> : null}
      </div>
      <div className={`${heroStyles.sidebarBody} ${td.rightPaneSectionBody} ${bodyClassName}`.trim()}>{children}</div>
    </section>
  );
}

const SALES_TYPE_OPTIONS = [
  { key: "prestation", icon: "mdi:briefcase-edit-outline" },
  { key: "installation", icon: "mdi:tools" }
];

const RIGHT_PANE_COLLAPSED_KEY = "veritas.salesTicket.rightPaneCollapsed";

function readRightPaneCollapsed() {
  try {
    return localStorage.getItem(RIGHT_PANE_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export default function TicketSalesDetailPage({ onNavigate, ticketData }) {
  const locale = useAppLocale();
  const { can } = usePermissions();
  const { user } = useAuthContext();
  const { isCommunity } = useVeritasEdition();
  const copy = useMemo(() => getTicketSalesDetailCopy(locale), [locale]);
  const detailCopy = useMemo(() => getTicketDetailCopy(locale), [locale]);
  const currentUserId = useMemo(() => user?.id || user?.uuid || user?.user_id || null, [user]);
  const canDeleteTicket = can("sales_detail.delete");
  const canReport = can("sales_detail.report");
  const canPublicReply = can("sales_detail.public_reply");
  const canEditMessages = can("sales_detail.edit_messages");
  const canDeleteAttachments = can("sales_detail.delete_attachments");
  const canRequestValidation = can("sales_detail.request_validation");
  const canTasks = can("sales_detail.tasks");
  const canEditForm = can("sales.edit") || can("sales_detail.tasks") || can("tickets.edit");
  const ticketId = ticketData?.ticketId || ticketData?.id || null;

  const [ticket, setTicket] = useState(null);
  const [users, setUsers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [clients, setClients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [pmTasks, setPmTasks] = useState([]);
  const [savingTasks, setSavingTasks] = useState(false);
  const [teamBusy, setTeamBusy] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [tagAddOpen, setTagAddOpen] = useState(false);
  const [tagBusy, setTagBusy] = useState(false);
  const [rightPaneView, setRightPaneView] = useState("context");
  const [rightPaneCollapsed, setRightPaneCollapsed] = useState(readRightPaneCollapsed);
  const [centerTab, setCenterTab] = useState("chat");
  const [refreshingHistory, setRefreshingHistory] = useState(false);
  const [ticketDeleteConfirm, setTicketDeleteConfirm] = useState(null);
  const [deletingTicket, setDeletingTicket] = useState(false);
  const [creditModal, setCreditModal] = useState(null);
  const [savingCredits, setSavingCredits] = useState(false);
  const [formFieldLabelMap, setFormFieldLabelMap] = useState({});
  const [formFieldTypeMap, setFormFieldTypeMap] = useState({});
  const [salesFormDefinition, setSalesFormDefinition] = useState(null);
  const [formEditing, setFormEditing] = useState(false);
  const [formDraftValues, setFormDraftValues] = useState({});
  const [savingForm, setSavingForm] = useState(false);
  const [formFieldErrors, setFormFieldErrors] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [titleEditing, setTitleEditing] = useState(false);
  const [clientEquipments, setClientEquipments] = useState([]);
  const [loadingEquipments, setLoadingEquipments] = useState(false);

  const [requesterSearch, setRequesterSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [followerSearch, setFollowerSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [showRequesterDropdown, setShowRequesterDropdown] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showFollowerDropdown, setShowFollowerDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showEquipmentDropdown, setShowEquipmentDropdown] = useState(false);
  const [requesterHighlight, setRequesterHighlight] = useState(0);
  const [clientHighlight, setClientHighlight] = useState(0);
  const [assigneeHighlight, setAssigneeHighlight] = useState(0);
  const [followerHighlight, setFollowerHighlight] = useState(0);
  const [categoryHighlight, setCategoryHighlight] = useState(0);
  const [equipmentHighlight, setEquipmentHighlight] = useState(0);

  const titleInputRef = useRef(null);
  const requesterDropdownRef = useRef(null);
  const clientDropdownRef = useRef(null);
  const assigneeDropdownRef = useRef(null);
  const followerDropdownRef = useRef(null);
  const categoryDropdownRef = useRef(null);
  const equipmentDropdownRef = useRef(null);
  const taskPlanningBackfillRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(RIGHT_PANE_COLLAPSED_KEY, rightPaneCollapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [rightPaneCollapsed]);

  const openRightPaneView = useCallback(view => {
    setRightPaneView(view);
    setRightPaneCollapsed(false);
  }, []);

  const toggleRightPaneCollapsed = useCallback(() => {
    setRightPaneCollapsed(prev => !prev);
  }, []);

  useEffect(() => {
    if (!canTasks && centerTab === "tasks") {
      setCenterTab("chat");
    }
    if (!canTasks && rightPaneView === "taskStats") {
      setRightPaneView("context");
    }
  }, [canTasks, centerTab, rightPaneView]);

  useEffect(() => {
    if (!titleEditing) return;
    const input = titleInputRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, [titleEditing]);

  const loadTicket = useCallback(async () => {
    if (!ticketId) {
      setTicket(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [row, usersRes, contactsRes, clientsRes, categoriesRes] = await Promise.all([
        fetchTicket(ticketId),
        fetchActiveUsers().catch(() => []),
        fetchContactsList().catch(() => []),
        fetchClientsList().catch(() => []),
        fetchSalesTicketCategories().catch(() => [])
      ]);
      setTicket(row);
      setTitleDraft(String(row?.title || ""));
      setTitleEditing(false);
      setUsers(Array.isArray(usersRes) ? usersRes : []);
      setContacts(Array.isArray(contactsRes) ? contactsRes : []);
      setClients(Array.isArray(clientsRes) ? clientsRes : []);
      setCategories(Array.isArray(categoriesRes) ? categoriesRes : []);
      setPmTasks(buildPmTasksFromTicket(row));
      setCategorySearch(String(row?.category || ""));
      // Requester / client labels are resolved once lists are loaded.
    } catch (error) {
      toast.error(error.message || copy.loadError);
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }, [ticketId, copy.loadError]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  const formData = useMemo(() => resolveFormData(ticket), [ticket]);
  const kind = useMemo(() => resolveSalesKind(ticket) || formData?.kind || null, [ticket, formData]);
  const kindLabel = kind === "installation" ? copy.kind.installation : kind === "prestation" ? copy.kind.prestation : null;
  const status = normalizeStatus(ticket?.status);
  const priority = ticket?.priority || "normal";
  const ticketType = kind || ticket?.type || "prestation";
  const planningEvent = ticket?.planningEvent || ticket?.planning_event || null;
  const formEntries = useMemo(
    () =>
      enrichSalesFormLinkedEntries(buildSalesFormFieldEntries(formData, formFieldLabelMap), {
        formData,
        typeMap: formFieldTypeMap,
        contacts,
        clients,
        users
      }),
    [formData, formFieldLabelMap, formFieldTypeMap, contacts, clients, users]
  );
  const comments = useMemo(() => hydrateComments(ticket), [ticket]);
  const clientId = ticket?.client_id || ticket?.clientId || null;
  const supportCredit = ticket?.supportCredit || null;
  const creditDebitedSources = useMemo(
    () => new Set(Array.isArray(supportCredit?.debitedSources) ? supportCredit.debitedSources : []),
    [supportCredit?.debitedSources]
  );
  const canDebitCredits = Boolean(!isCommunity && supportCredit?.eligible && clientId);
  const creditBalance = Number(supportCredit?.balance || 0);
  const creditTotalDebited = Number(supportCredit?.totalDebited || 0);

  const requesterContact = useMemo(() => {
    const targetContactId = ticket?.requester_contact_id || ticket?.requesterContactId;
    if (!targetContactId) return null;
    return contacts.find(c => String(c.id) === String(targetContactId)) || null;
  }, [ticket?.requester_contact_id, ticket?.requesterContactId, contacts]);

  const requesterDisplayName = useMemo(() => {
    const fromUser = users.find(u => String(u.id) === String(ticket?.requester_user_id || ""));
    if (fromUser) return userLabel(fromUser);
    if (requesterContact) return getContactLabel(requesterContact);
    return (
      `${ticket?.requester_prenom || ticket?.requester_first_name || ""} ${ticket?.requester_nom || ticket?.requester_last_name || ""}`.trim() ||
      ticket?.requester_name ||
      ticket?.requester_email ||
      ""
    );
  }, [requesterContact, users, ticket]);

  const clientDisplayName = useMemo(() => {
    const targetClientId = ticket?.client_id || ticket?.clientId;
    if (targetClientId) {
      const fromClients = clients.find(c => String(c.id) === String(targetClientId));
      const label = fromClients?.name || fromClients?.nom || "";
      if (label) return label;
    }
    return ticket?.client_name || ticket?.client_nom || formData?.clientName || "";
  }, [ticket, clients, formData?.clientName]);

  useEffect(() => {
    if (showRequesterDropdown) return;
    setRequesterSearch(requesterDisplayName || "");
  }, [requesterDisplayName, showRequesterDropdown]);

  useEffect(() => {
    if (showClientDropdown) return;
    setClientSearch(clientDisplayName || "");
  }, [clientDisplayName, showClientDropdown]);

  useEffect(() => {
    const formId = formData?.formId;
    if (!formId) {
      setFormFieldLabelMap({});
      setFormFieldTypeMap({});
      setSalesFormDefinition(null);
      return undefined;
    }
    let cancelled = false;
    fetchSalesForm(formId)
      .then(form => {
        if (cancelled) return;
        setFormFieldLabelMap(buildSalesFormFieldLabelMap(form));
        setFormFieldTypeMap(buildSalesFormFieldTypeMap(form));
        setSalesFormDefinition(form || null);
      })
      .catch(() => {
        if (!cancelled) {
          setFormFieldLabelMap({});
          setFormFieldTypeMap({});
          setSalesFormDefinition(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [formData?.formId]);

  const resolvePerson = useCallback(
    person => {
      const id = String(person?.id || person?.user_id || (typeof person === "string" ? person : "") || "").trim();
      const fromUsers = users.find(u => String(u.id) === id);
      return {
        id,
        label: userLabel(person) || userLabel(fromUsers) || id || copy.meta.none
      };
    },
    [users, copy.meta.none]
  );

  const assigneePeople = useMemo(
    () => (Array.isArray(ticket?.assignees) ? ticket.assignees : []).map(resolvePerson).filter(p => p.id),
    [ticket, resolvePerson]
  );
  const watcherPeople = useMemo(
    () => (Array.isArray(ticket?.watchers) ? ticket.watchers : []).map(resolvePerson).filter(p => p.id),
    [ticket, resolvePerson]
  );
  const assigneeIds = useMemo(() => new Set(assigneePeople.map(a => a.id)), [assigneePeople]);
  const isCurrentUserAssigned = useMemo(() => {
    if (!currentUserId) return false;
    if (ticket?.assigned_user_id && String(ticket.assigned_user_id) === String(currentUserId)) return true;
    return assigneeIds.has(String(currentUserId));
  }, [currentUserId, ticket?.assigned_user_id, assigneeIds]);
  const watcherIds = useMemo(() => new Set(watcherPeople.map(w => w.id)), [watcherPeople]);

  const filteredRequesterOptions = useMemo(() => {
    const q = requesterSearch.trim().toLowerCase();
    const agentOpts = users
      .filter(u => u?.id)
      .map(u => ({
        kind: "agent",
        id: String(u.id),
        label: userLabel(u),
        email: u.email || "",
        raw: u
      }))
      .filter(opt => opt.label);
    if (!q) return agentOpts.slice(0, 20);
    return agentOpts
      .filter(opt => opt.label.toLowerCase().includes(q) || String(opt.email || "").toLowerCase().includes(q))
      .slice(0, 20);
  }, [users, requesterSearch]);

  const filteredClientOptions = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    const mapped = clients
      .filter(c => c?.id)
      .map(c => ({
        id: String(c.id),
        label: String(c.name || c.nom || "").trim(),
        raw: c
      }))
      .filter(opt => opt.label);
    if (!q) return mapped.slice(0, 20);
    return mapped.filter(opt => opt.label.toLowerCase().includes(q)).slice(0, 20);
  }, [clients, clientSearch]);

  const creatorDisplayName = useMemo(() => {
    const fromUsers = users.find(u => String(u.id) === String(ticket?.created_by || ""));
    return userLabel(fromUsers) || ticket?.created_by_email || ticket?.created_by_name || "";
  }, [users, ticket?.created_by, ticket?.created_by_email, ticket?.created_by_name]);

  const assigneeOptions = useMemo(
    () =>
      users
        .filter(u => u?.id && !assigneeIds.has(String(u.id)))
        .map(u => ({ id: String(u.id), label: userLabel(u) }))
        .filter(opt => opt.label),
    [users, assigneeIds]
  );
  const followerOptions = useMemo(
    () =>
      users
        .filter(u => u?.id && !watcherIds.has(String(u.id)))
        .map(u => ({ id: String(u.id), label: userLabel(u) }))
        .filter(opt => opt.label),
    [users, watcherIds]
  );

  const filteredAssigneeOptions = useMemo(() => {
    const q = assigneeSearch.trim().toLowerCase();
    if (!q) return assigneeOptions.slice(0, 12);
    return assigneeOptions.filter(opt => opt.label.toLowerCase().includes(q)).slice(0, 12);
  }, [assigneeOptions, assigneeSearch]);

  const filteredFollowerOptions = useMemo(() => {
    const q = followerSearch.trim().toLowerCase();
    if (!q) return followerOptions.slice(0, 12);
    return followerOptions.filter(opt => opt.label.toLowerCase().includes(q)).slice(0, 12);
  }, [followerOptions, followerSearch]);

  const filteredCategoryOptions = useMemo(() => {
    const list = categories.filter(item => item?.name && item.enabled !== false);
    const q = categorySearch.trim().toLowerCase();
    if (!q) return list.slice(0, 40);
    const exactCatalogMatch = list.some(item => String(item.name || "").toLowerCase() === q);
    // Orphan values (e.g. form slug like "prestation-…") must not hide the catalog.
    if (!exactCatalogMatch && q === String(ticket?.category || "").trim().toLowerCase()) {
      return list.slice(0, 40);
    }
    return list.filter(item => String(item.name || "").toLowerCase().includes(q) || String(item.section || "").toLowerCase().includes(q)).slice(0, 40);
  }, [categories, categorySearch, ticket?.category]);

  const filteredCategoryGroups = useMemo(() => {
    const uncategorized = detailCopy.uncategorized || "—";
    return Object.entries(
      filteredCategoryOptions.reduce((acc, item) => {
        const section = String(item?.section || uncategorized).trim() || uncategorized;
        if (!acc[section]) acc[section] = [];
        acc[section].push(item);
        return acc;
      }, {})
    );
  }, [filteredCategoryOptions, detailCopy.uncategorized]);

  const ticketEquipmentInfo = useMemo(() => {
    const info = ticket?.equipment_info || ticket?.equipmentInfo || null;
    if (!info || typeof info !== "object" || !info.concerned) return null;
    return info;
  }, [ticket?.equipment_info, ticket?.equipmentInfo]);

  const ticketEquipmentId = useMemo(() => {
    const id = ticketEquipmentInfo?.equipmentId || ticketEquipmentInfo?.equipment_id || null;
    return id ? String(id) : null;
  }, [ticketEquipmentInfo]);

  const selectedTicketEquipment = useMemo(() => {
    if (!ticketEquipmentId) return null;
    return clientEquipments.find(eq => String(eq.id) === String(ticketEquipmentId)) || null;
  }, [clientEquipments, ticketEquipmentId]);

  const ticketEquipmentDisplayName = useMemo(() => {
    if (selectedTicketEquipment) {
      return getEquipmentPickerLabel(selectedTicketEquipment, { locale });
    }
    if (!ticketEquipmentInfo?.concerned) return "";
    const name = String(ticketEquipmentInfo.name || "").trim();
    const type = String(ticketEquipmentInfo.type || "").trim();
    return [type, name].filter(Boolean).join(" · ") || copy.meta?.equipment || "";
  }, [selectedTicketEquipment, ticketEquipmentInfo, locale, copy.meta?.equipment]);

  const filteredEquipmentOptions = useMemo(() => {
    const q = equipmentSearch.trim().toLowerCase();
    const list = clientEquipments.filter(eq => {
      if (ticketEquipmentId && String(eq.id) === String(ticketEquipmentId) && !showEquipmentDropdown) return true;
      return true;
    });
    if (!q || (ticketEquipmentId && q === String(ticketEquipmentDisplayName || "").toLowerCase())) {
      return list.slice(0, 40);
    }
    return list
      .filter(eq => getEquipmentSearchText(eq, locale).includes(q))
      .slice(0, 40);
  }, [clientEquipments, equipmentSearch, locale, ticketEquipmentId, ticketEquipmentDisplayName, showEquipmentDropdown]);

  useEffect(() => {
    let cancelled = false;
    if (!clientId) {
      setClientEquipments([]);
      setLoadingEquipments(false);
      return undefined;
    }
    setLoadingEquipments(true);
    loadClientEquipments(clientId)
      .then(rows => {
        if (!cancelled) setClientEquipments(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setClientEquipments([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingEquipments(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  useEffect(() => {
    if (showEquipmentDropdown) return;
    setEquipmentSearch(ticketEquipmentDisplayName || "");
  }, [ticketEquipmentDisplayName, showEquipmentDropdown]);

  const resolveCategorySearchDisplay = useCallback(() => {
    const current = String(ticket?.category || "");
    if (!current) return "";
    const match = categories.find(item => item?.enabled !== false && String(item.name || "") === current);
    return match ? String(match.name) : current;
  }, [categories, ticket?.category]);

  useEffect(() => {
    const handleClickOutside = event => {
      if (requesterDropdownRef.current && !requesterDropdownRef.current.contains(event.target)) {
        setShowRequesterDropdown(false);
      }
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target)) {
        setShowClientDropdown(false);
        setClientSearch(clientDisplayName || "");
      }
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(event.target)) setShowAssigneeDropdown(false);
      if (followerDropdownRef.current && !followerDropdownRef.current.contains(event.target)) setShowFollowerDropdown(false);
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) {
        setShowCategoryDropdown(false);
        setCategorySearch(resolveCategorySearchDisplay());
      }
      if (equipmentDropdownRef.current && !equipmentDropdownRef.current.contains(event.target)) {
        setShowEquipmentDropdown(false);
        setEquipmentSearch(ticketEquipmentDisplayName || "");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [resolveCategorySearchDisplay, clientDisplayName, ticketEquipmentDisplayName]);

  const tasksDone = pmTasks.filter(t => t.done).length;
  const tasksTotal = pmTasks.length;
  const progressValue = tasksTotal === 0 ? 0 : clampProgress((tasksDone / tasksTotal) * 100);
  const taskStats = useMemo(() => computeSalesTaskStats(pmTasks), [pmTasks]);
  const scheduledTasks = useMemo(() => {
    return pmTasks
      .filter(task => task.startAt || task.planningEventId)
      .slice()
      .sort((a, b) => {
        const aTime = a.startAt ? new Date(a.startAt).getTime() : Number.POSITIVE_INFINITY;
        const bTime = b.startAt ? new Date(b.startAt).getTime() : Number.POSITIVE_INFINITY;
        return aTime - bTime;
      });
  }, [pmTasks]);
  const tags = Array.isArray(ticket?.tags) ? ticket.tags : [];

  const updateTicketLive = async (patch, successMessage) => {
    if (!ticketId) return false;
    setSavingMeta(true);
    try {
      const updated = await updateTicket(ticketId, patch);
      setTicket(prev => {
        if (!prev) return prev;
        const next = { ...prev, ...(updated || {}) };
        if (Object.prototype.hasOwnProperty.call(patch, "requesterContactId")) {
          next.requester_contact_id = patch.requesterContactId;
          next.requesterContactId = patch.requesterContactId;
        }
        if (Object.prototype.hasOwnProperty.call(patch, "requesterUserId")) {
          next.requester_user_id = patch.requesterUserId;
        }
        if (Object.prototype.hasOwnProperty.call(patch, "clientId")) {
          next.client_id = patch.clientId;
          next.clientId = patch.clientId;
        }
        if (Object.prototype.hasOwnProperty.call(patch, "type")) next.type = patch.type;
        if (Object.prototype.hasOwnProperty.call(patch, "category")) next.category = patch.category;
        if (Object.prototype.hasOwnProperty.call(patch, "priority")) next.priority = patch.priority;
        if (Object.prototype.hasOwnProperty.call(patch, "status")) next.status = patch.status === "new" ? "open" : patch.status;
        if (Object.prototype.hasOwnProperty.call(patch, "title")) next.title = patch.title;
        if (Object.prototype.hasOwnProperty.call(patch, "equipmentInfo")) {
          next.equipment_info = patch.equipmentInfo;
          next.equipmentInfo = patch.equipmentInfo;
        }
        if (updated?.sales_form_data || updated?.salesFormData || patch?.salesFormData) {
          next.sales_form_data = updated?.sales_form_data || updated?.salesFormData || {
            ...(prev.sales_form_data || {}),
            ...(patch.salesFormData || {})
          };
        }
        return next;
      });
      if (successMessage) toast.success(successMessage);
      return true;
    } catch (error) {
      toast.error(error.message || copy.meta.updateError);
      return false;
    } finally {
      setSavingMeta(false);
    }
  };

  const editableFormFields = useMemo(() => {
    const fields = Array.isArray(salesFormDefinition?.fields) ? salesFormDefinition.fields : [];
    return fields.filter(field => field && field.enabled !== false && !isLayoutField(field) && !isFileField(field));
  }, [salesFormDefinition]);

  const hasEditableFormFields = editableFormFields.length > 0;

  const startFormEdit = () => {
    if (!canEditForm || savingForm || savingMeta) return;
    if (!salesFormDefinition?.fields?.length) {
      toast.error(copy.form.loadDefinitionError);
      return;
    }
    setFormDraftValues({ ...(formData?.values && typeof formData.values === "object" ? formData.values : {}) });
    setFormFieldErrors(false);
    setFormEditing(true);
  };

  const cancelFormEdit = () => {
    if (savingForm) return;
    setFormEditing(false);
    setFormDraftValues({});
    setFormFieldErrors(false);
  };

  const saveFormEdit = async () => {
    if (!ticketId || !salesFormDefinition) return;
    const allFields = Array.isArray(salesFormDefinition.fields) ? salesFormDefinition.fields.filter(field => field?.enabled !== false) : [];
    if (!validateDynamicFields(allFields, formDraftValues)) {
      setFormFieldErrors(true);
      toast.error(copy.form.validationError);
      return;
    }
    const fieldLookups = { users, clients, contacts };
    const visibleFields = filterVisibleFields(allFields, formDraftValues);
    const nextValues = Object.fromEntries(
      visibleFields.map(field => {
        if (isFileField(field)) {
          const existing = formData?.values?.[field.fieldKey];
          return [field.fieldKey, Array.isArray(existing) ? existing : []];
        }
        return [field.fieldKey, formDraftValues[field.fieldKey]];
      })
    );
    const displayValues = Object.fromEntries(
      visibleFields.map(field => {
        if (isFileField(field)) {
          const existing = formData?.displayValues?.[field.fieldKey];
          if (existing) return [field.fieldKey, existing];
        }
        const line = buildDynamicFieldLines([field], nextValues, fieldLookups)[0] || "";
        const display = line.includes(": ") ? line.split(": ").slice(1).join(": ") : "";
        return [field.fieldKey, display === "-" ? "" : display];
      })
    );
    const fieldLabels = Object.fromEntries(
      allFields
        .filter(field => field?.fieldKey)
        .map(field => [field.fieldKey, String(field.label || "").trim() || field.fieldKey])
    );
    setSavingForm(true);
    try {
      const updated = await updateTicket(ticketId, {
        salesFormData: {
          values: nextValues,
          displayValues,
          fieldLabels
        }
      });
      const nextForm = updated?.sales_form_data || updated?.salesFormData || {
        ...(formData || {}),
        values: nextValues,
        displayValues,
        fieldLabels
      };
      setTicket(prev =>
        prev
          ? {
              ...prev,
              ...(updated || {}),
              sales_form_data: nextForm
            }
          : prev
      );
      setFormEditing(false);
      setFormDraftValues({});
      setFormFieldErrors(false);
      toast.success(copy.form.saved);
      await loadTicket();
    } catch (error) {
      toast.error(error.message || copy.form.saveError);
    } finally {
      setSavingForm(false);
    }
  };

  const startTitleEdit = () => {
    if (savingMeta) return;
    setTitleDraft(String(ticket?.title || ""));
    setTitleEditing(true);
  };

  const cancelTitleEdit = () => {
    setTitleDraft(String(ticket?.title || ""));
    setTitleEditing(false);
  };

  const commitTitleEdit = async () => {
    const nextTitle = String(titleDraft || "").trim();
    if (!nextTitle) {
      setTitleDraft(String(ticket?.title || ""));
      toast.error(detailCopy.toasts?.titleRequired || "Le titre est requis");
      return;
    }
    if (nextTitle === String(ticket?.title || "").trim()) {
      setTitleEditing(false);
      return;
    }
    const ok = await updateTicketLive({ title: nextTitle }, detailCopy.toasts?.titleUpdated);
    if (ok) {
      setTitleDraft(nextTitle);
      setTitleEditing(false);
    }
  };

  const selectRequester = async option => {
    if (!option?.id || option.kind !== "agent") return;

    setTicket(prev =>
      prev
        ? {
            ...prev,
            requester_user_id: option.id,
            requester_contact_id: null,
            requesterContactId: null
          }
        : prev
    );
    setRequesterSearch(option.label || "");
    setShowRequesterDropdown(false);
    const ok = await updateTicketLive(
      {
        requesterUserId: option.id,
        requesterContactId: null
      },
      copy.meta.requesterSaved
    );
    if (!ok) await loadTicket();
  };

  const selectClient = async client => {
    if (!client?.id) return;
    const clientIdNum = Number(client.id);
    const nextClientId = Number.isFinite(clientIdNum) ? clientIdNum : client.id;
    const label = String(client.name || client.nom || "").trim();
    setTicket(prev =>
      prev
        ? {
            ...prev,
            client_id: nextClientId,
            clientId: nextClientId,
            client_name: label || prev.client_name,
            client_nom: label || prev.client_nom
          }
        : prev
    );
    setClientSearch(label);
    setShowClientDropdown(false);
    // Changing company invalidates the previous fleet link.
    if (ticketEquipmentId) {
      setTicket(prev =>
        prev
          ? {
              ...prev,
              equipment_info: { concerned: false },
              equipmentInfo: { concerned: false }
            }
          : prev
      );
      setEquipmentSearch("");
    }
    const ok = await updateTicketLive(
      {
        clientId: nextClientId,
        ...(ticketEquipmentId ? { equipmentInfo: serializeEquipmentInfo({ concerned: false }) } : {})
      },
      copy.meta.clientSaved
    );
    if (!ok) await loadTicket();
  };

  const selectTicketEquipment = async equipment => {
    if (!equipment?.id) return;
    const equipmentInfo = serializeEquipmentInfo({
      concerned: true,
      source: "veritas",
      equipmentId: equipment.id,
      name: equipment.name || equipment.model || "",
      type: equipment.type || "",
      clientId: clientId || equipment.clientId || ""
    });
    setShowEquipmentDropdown(false);
    setEquipmentSearch(getEquipmentPickerLabel(equipment, { locale }));
    const ok = await updateTicketLive({ equipmentInfo }, copy.meta.equipmentSaved);
    if (!ok) {
      await loadTicket();
      return;
    }
    const nextTicket = {
      ...(ticket || {}),
      equipment_info: equipmentInfo,
      equipmentInfo
    };
    const inherited = pmTasks.filter(task => task.startAt && !task.equipmentId);
    await Promise.all(
      inherited.map(task =>
        reconcileSalesTaskPlanningEvent({ task, ticket: nextTicket, kind }).catch(() => null)
      )
    );
  };

  const clearTicketEquipment = async () => {
    const equipmentInfo = serializeEquipmentInfo({ concerned: false });
    setShowEquipmentDropdown(false);
    setEquipmentSearch("");
    const ok = await updateTicketLive({ equipmentInfo }, copy.meta.equipmentCleared);
    if (!ok) {
      await loadTicket();
      return;
    }
    const nextTicket = {
      ...(ticket || {}),
      equipment_info: equipmentInfo,
      equipmentInfo
    };
    const inherited = pmTasks.filter(task => task.startAt && !task.equipmentId);
    await Promise.all(
      inherited.map(task =>
        reconcileSalesTaskPlanningEvent({ task, ticket: nextTicket, kind }).catch(() => null)
      )
    );
  };

  const selectCategory = async item => {
    const name = String(item?.name || "");
    setCategorySearch(name);
    setShowCategoryDropdown(false);
    await updateTicketLive({ category: name }, copy.meta.categorySaved);
  };

  const handleAddTag = async (labelOverride, colorOverride) => {
    const label = String(labelOverride ?? tagDraft).trim();
    if (!ticketId || !label || tagBusy) return;
    setTagBusy(true);
    try {
      const createdTag = await addTicketTag(ticketId, label, colorOverride || undefined);
      setTicket(prev => {
        if (!prev) return prev;
        const existing = prev.tags || [];
        const alreadyExists = existing.some(
          tag => String(tag.id) === String(createdTag?.id) || String(tag.label || "").toLowerCase() === String(createdTag?.label || label).toLowerCase()
        );
        if (alreadyExists) return prev;
        return { ...prev, tags: [...existing, createdTag] };
      });
      setTagDraft("");
      setTagAddOpen(false);
      toast.success(copy.tags.added);
    } catch (error) {
      toast.error(error.message || copy.tags.addError);
    } finally {
      setTagBusy(false);
    }
  };

  const handleRemoveTag = async tagId => {
    if (!ticketId || !tagId || tagBusy) return;
    setTagBusy(true);
    try {
      await removeTicketTag(ticketId, tagId);
      setTicket(prev => (prev ? { ...prev, tags: (prev.tags || []).filter(tag => String(tag.id) !== String(tagId)) } : prev));
      toast.success(copy.tags.removed);
    } catch (error) {
      toast.error(error.message || copy.tags.removeError);
    } finally {
      setTagBusy(false);
    }
  };

  const persistTasks = useCallback(
    async nextTasks => {
      if (!ticketId) return false;
      setSavingTasks(true);
      const sanitizedTasks = (Array.isArray(nextTasks) ? nextTasks : []).map(task => {
        const { documents, ...rest } = task || {};
        return rest;
      });
      const nextProgress =
        sanitizedTasks.length === 0
          ? 0
          : clampProgress((sanitizedTasks.filter(t => t.done).length / sanitizedTasks.length) * 100);
      try {
        const updated = await updateTicket(ticketId, {
          salesFormData: { pmTasks: sanitizedTasks },
          progressPercent: nextProgress
        });
        const nextForm = updated?.sales_form_data || updated?.salesFormData || { ...(formData || {}), pmTasks: sanitizedTasks };
        const nextTicketBase = {
          ...(ticket || {}),
          ...(updated || {}),
          sales_form_data: nextForm,
          attachments: updated?.attachments || ticket?.attachments || []
        };
        setTicket(prev =>
          prev
            ? {
                ...prev,
                ...(updated || {}),
                sales_form_data: nextForm,
                progress_percent: updated?.progress_percent ?? updated?.progressPercent ?? nextProgress,
                attachments: updated?.attachments || prev.attachments || []
              }
            : prev
        );
        setPmTasks(buildPmTasksFromTicket(nextTicketBase, nextForm));
        return true;
      } catch (error) {
        toast.error(error.message || copy.tasks.saveError);
        setPmTasks(buildPmTasksFromTicket(ticket, formData));
        return false;
      } finally {
        setSavingTasks(false);
      }
    },
    [ticketId, formData, ticket, copy.tasks.saveError]
  );

  const syncTaskPlanningEvent = useCallback(
    async task => {
      if (!task?.startAt) {
        if (task?.planningEventId || task?.id) {
          await deleteSalesTaskPlanningEvents({ task, ticket }).catch(() => null);
        }
        return null;
      }
      const planningEventId = await reconcileSalesTaskPlanningEvent({
        task,
        ticket,
        kind
      });
      if (!planningEventId) {
        throw new Error(copy.tasks.planningSyncError);
      }
      return planningEventId;
    },
    [ticket, kind, copy.tasks.planningSyncError]
  );

  useEffect(() => {
    taskPlanningBackfillRef.current = null;
  }, [ticketId]);

  // One-shot: attach/dedupe planning events for dated tasks (also cleans duplicate orphans)
  useEffect(() => {
    if (!ticketId || !ticket || loading || savingTasks) return undefined;
    if (taskPlanningBackfillRef.current === ticketId) return undefined;
    const datedTasks = pmTasks.filter(task => task.startAt);
    if (datedTasks.length === 0) {
      taskPlanningBackfillRef.current = ticketId;
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const nextTasks = [];
        let changed = false;
        for (const task of pmTasks) {
          if (cancelled) return;
          if (!task.startAt) {
            nextTasks.push(task);
            continue;
          }
          try {
            const planningEventId = await reconcileSalesTaskPlanningEvent({ task, ticket, kind });
            if (!planningEventId) {
              nextTasks.push(task);
              continue;
            }
            if (String(task.planningEventId || "") !== String(planningEventId)) {
              nextTasks.push({ ...task, planningEventId });
              changed = true;
            } else {
              nextTasks.push(task);
            }
          } catch {
            nextTasks.push(task);
          }
        }
        if (cancelled) return;
        taskPlanningBackfillRef.current = ticketId;
        if (!changed) return;
        setPmTasks(nextTasks);
        await persistTasks(nextTasks);
      } catch {
        // Allow a later retry if reconcile failed hard.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ticketId, ticket, kind, loading, savingTasks, pmTasks, persistTasks]);

  const handleStatusChange = async nextStatus => {
    if (!ticketId) return;
    setSavingStatus(true);
    try {
      const updated = await updateTicket(ticketId, { status: nextStatus });
      setTicket(prev => (prev ? { ...prev, ...(updated || {}), status: nextStatus } : prev));
      toast.success(copy.statusSaved);
    } catch (error) {
      toast.error(error.message || copy.statusError);
    } finally {
      setSavingStatus(false);
    }
  };

  const handleAddTask = async task => {
    if (!task?.label) return false;
    setSavingTasks(true);
    try {
      const authorLabel = userLabel(user) || null;
      const stamped = {
        ...task,
        createdById: currentUserId || task.createdById || null,
        createdByLabel: authorLabel || task.createdByLabel || null,
        updatedById: currentUserId || task.updatedById || null,
        updatedByLabel: authorLabel || task.updatedByLabel || null,
        updatedAt: task.updatedAt || task.createdAt || new Date().toISOString()
      };
      const planningEventId = stamped.startAt ? await syncTaskPlanningEvent(stamped) : null;
      const withEvent = { ...stamped, planningEventId };
      const next = [...pmTasks, withEvent];
      setPmTasks(next);
      const ok = await persistTasks(next);
      if (!ok && planningEventId) {
        await deleteSalesTaskPlanningEvents({ task: withEvent, ticket }).catch(() => {});
        setPmTasks(pmTasks);
        return false;
      }
      return ok;
    } catch (error) {
      toast.error(error.message || copy.tasks.planningSyncError);
      setSavingTasks(false);
      return false;
    }
  };

  const handleUpdateTask = async task => {
    if (!task?.id || !task?.label) return false;
    setSavingTasks(true);
    try {
      const authorLabel = userLabel(user) || null;
      const stamped = {
        ...task,
        updatedById: currentUserId || task.updatedById || null,
        updatedByLabel: authorLabel || task.updatedByLabel || null,
        updatedAt: new Date().toISOString()
      };
      const planningEventId = await syncTaskPlanningEvent(stamped);
      const withEvent = { ...stamped, planningEventId: planningEventId || null };
      const next = pmTasks.map(row => (String(row.id) === String(task.id) ? { ...row, ...withEvent } : row));
      setPmTasks(next);
      return await persistTasks(next);
    } catch (error) {
      toast.error(error.message || copy.tasks.planningSyncError);
      setSavingTasks(false);
      return false;
    }
  };

  const handleToggleTask = async taskId => {
    const task = pmTasks.find(row => String(row.id) === String(taskId));
    if (!task) return;
    const markingDone = !task.done;
    if (markingDone && canDebitCredits && creditBalance > 0) {
      const sourceKey = `task:${taskId}`;
      if (!creditDebitedSources.has(sourceKey)) {
        setCreditModal({
          mode: "task",
          taskId: String(taskId),
          contextLabel: task.label || "",
          sourceKey,
          allowSkip: true
        });
        return;
      }
    }
    const next = pmTasks.map(row => (row.id === taskId ? { ...row, done: !row.done } : row));
    setPmTasks(next);
    await persistTasks(next);
  };

  const applyTaskDone = async taskId => {
    const next = pmTasks.map(row => (String(row.id) === String(taskId) ? { ...row, done: true } : row));
    setPmTasks(next);
    return persistTasks(next);
  };

  const handleConsumeCredits = async (debits = []) => {
    if (!ticketId || !creditModal) return;
    const total = (Array.isArray(debits) ? debits : []).reduce((sum, row) => sum + (Number(row?.amount) || 0), 0);
    const isTask = creditModal.mode === "task";
    setSavingCredits(true);
    try {
      if (isTask) {
        await applyTaskDone(creditModal.taskId);
      }
      if (total > 0) {
        const result = await consumeTicketSupportCredits(ticketId, {
          debits,
          note: isTask
            ? `Tâche · ${creditModal.contextLabel || creditModal.taskId}`
            : "Décompte ticket prestation/installation",
          sourceKey: creditModal.sourceKey || (isTask ? `task:${creditModal.taskId}` : "ticket")
        });
        if (result?.skipped && result?.reason === "already_debited_source") {
          toast.info(copy.credits.toast.already);
        } else if (result?.skipped) {
          toast.info(copy.credits.toast.skipped);
        } else {
          toast.success(interpolate(copy.credits.toast.success, { count: String(total) }));
        }
        if (result?.ticket) {
          setTicket(result.ticket);
        } else if (result?.supportCredit) {
          setTicket(prev => (prev ? { ...prev, supportCredit: result.supportCredit } : prev));
        } else {
          await loadTicket();
        }
      } else if (!isTask) {
        toast.info(copy.credits.toast.skipped);
      }
      setCreditModal(null);
    } catch (error) {
      const insufficient = /insufficient|insuffisant|402/i.test(String(error?.message || ""));
      toast.error(insufficient ? copy.credits.toast.insufficient : error.message || copy.credits.toast.error);
      if (isTask) await loadTicket();
    } finally {
      setSavingCredits(false);
    }
  };

  const handleConsumeTaskCreditsFromForm = async ({ taskId, taskLabel, debits } = {}) => {
    if (!ticketId || !taskId) return false;
    const list = Array.isArray(debits) ? debits : [];
    const total = list.reduce((sum, row) => sum + (Number(row?.amount) || 0), 0);
    if (total <= 0) return true;
    const sourceKey = `task:${taskId}`;
    if (creditDebitedSources.has(sourceKey)) {
      toast.info(copy.credits.toast.already);
      return true;
    }
    setSavingCredits(true);
    try {
      const result = await consumeTicketSupportCredits(ticketId, {
        debits: list,
        note: `Tâche · ${taskLabel || taskId}`,
        sourceKey
      });
      if (result?.skipped && result?.reason === "already_debited_source") {
        toast.info(copy.credits.toast.already);
      } else if (result?.skipped) {
        toast.info(copy.credits.toast.skipped);
      } else {
        toast.success(interpolate(copy.credits.toast.success, { count: String(total) }));
      }
      if (result?.ticket) {
        setTicket(result.ticket);
      } else if (result?.supportCredit) {
        setTicket(prev => (prev ? { ...prev, supportCredit: result.supportCredit } : prev));
      } else {
        await loadTicket();
      }
      return true;
    } catch (error) {
      const insufficient = /insufficient|insuffisant|402/i.test(String(error?.message || ""));
      toast.error(insufficient ? copy.credits.toast.insufficient : error.message || copy.credits.toast.error);
      return false;
    } finally {
      setSavingCredits(false);
    }
  };

  const handleSkipCreditModal = async () => {
    if (!creditModal) return;
    if (creditModal.mode === "task" && creditModal.taskId) {
      setSavingCredits(true);
      try {
        await applyTaskDone(creditModal.taskId);
        setCreditModal(null);
      } finally {
        setSavingCredits(false);
      }
      return;
    }
    setCreditModal(null);
  };

  const handleRemoveTask = async taskId => {
    const target = pmTasks.find(task => String(task.id) === String(taskId));
    const next = pmTasks.filter(task => String(task.id) !== String(taskId));
    setPmTasks(next);
    const ok = await persistTasks(next);
    if (ok && target) {
      const docs = Array.isArray(target.documents) ? target.documents : [];
      await Promise.all(
        docs
          .filter(doc => doc?.id)
          .map(doc => deleteTicketAttachment(ticketId, doc.id).catch(() => null))
      );
      try {
        await deleteSalesTaskPlanningEvents({ task: target, ticket });
      } catch (error) {
        toast.error(error.message || copy.tasks.planningSyncError);
      }
      setTicket(prev =>
        prev
          ? {
              ...prev,
              attachments: (prev.attachments || []).filter(
                att => String(att.task_id || att.taskId || "") !== String(taskId)
              )
            }
          : prev
      );
    } else if (!ok) {
      setPmTasks(pmTasks);
    }
    return ok;
  };

  const handleUploadTaskDocuments = async (taskId, files = []) => {
    if (!ticketId || !taskId || !files.length) return [];
    const result = await uploadTicketTaskAttachments(ticketId, taskId, files);
    const created = Array.isArray(result?.attachments) ? result.attachments : [];
    if (created.length > 0) {
      setTicket(prev =>
        prev
          ? {
              ...prev,
              attachments: [...(Array.isArray(prev.attachments) ? prev.attachments : []), ...created]
            }
          : prev
      );
      setPmTasks(prev =>
        prev.map(task =>
          String(task.id) === String(taskId)
            ? {
                ...task,
                documents: [
                  ...(Array.isArray(task.documents) ? task.documents : []),
                  ...created.map(normalizeTaskDocument).filter(Boolean)
                ]
              }
            : task
        )
      );
    }
    return created;
  };

  const handleDeleteTaskDocument = async (taskId, attachmentId) => {
    if (!ticketId || !attachmentId) return false;
    await deleteTicketAttachment(ticketId, attachmentId);
    setTicket(prev =>
      prev
        ? {
            ...prev,
            attachments: (prev.attachments || []).filter(att => String(att.id) !== String(attachmentId))
          }
        : prev
    );
    setPmTasks(prev =>
      prev.map(task =>
        String(task.id) === String(taskId)
          ? {
              ...task,
              documents: (task.documents || []).filter(doc => String(doc.id) !== String(attachmentId))
            }
          : task
      )
    );
    return true;
  };

  const handleAddAssignee = async userId => {
    if (!ticketId || !userId) return;
    setTeamBusy(true);
    try {
      await addTicketAssignee(ticketId, userId);
      setAssigneeSearch("");
      setShowAssigneeDropdown(false);
      await loadTicket();
    } catch (error) {
      toast.error(error.message || copy.team.error);
    } finally {
      setTeamBusy(false);
    }
  };

  const handleRemoveAssignee = async userId => {
    if (!ticketId || !userId) return;
    setTeamBusy(true);
    try {
      await removeTicketAssignee(ticketId, userId);
      await loadTicket();
    } catch (error) {
      toast.error(error.message || copy.team.error);
    } finally {
      setTeamBusy(false);
    }
  };

  const handleAddWatcher = async userId => {
    if (!ticketId || !userId) return;
    setTeamBusy(true);
    try {
      await addTicketWatcher(ticketId, userId);
      setFollowerSearch("");
      setShowFollowerDropdown(false);
      await loadTicket();
    } catch (error) {
      toast.error(error.message || copy.team.error);
    } finally {
      setTeamBusy(false);
    }
  };

  const handleRemoveWatcher = async userId => {
    if (!ticketId || !userId) return;
    setTeamBusy(true);
    try {
      await removeTicketWatcher(ticketId, userId);
      await loadTicket();
    } catch (error) {
      toast.error(error.message || copy.team.error);
    } finally {
      setTeamBusy(false);
    }
  };

  const openPlanning = () => {
    const firstTaskStart = pmTasks.find(task => task.startAt)?.startAt || null;
    onNavigate?.("Planning", {
      ticketId,
      clientId,
      focusDate: firstTaskStart || planningEvent?.start || null
    });
  };

  const openReport = () => onNavigate?.("Report", clientId ? { clientId, name: ticket?.client_name || ticket?.client_nom || "" } : null);

  useEffect(() => {
    setRightPaneView("context");
    setTicketDeleteConfirm(null);
  }, [ticketId]);

  const ticketActivityLog = useMemo(
    () => buildSalesActivityLog(ticket, users, contacts, detailCopy),
    [ticket, users, contacts, detailCopy]
  );

  const refreshTicketHistory = useCallback(
    async ({ showSpinner = false } = {}) => {
      if (!ticketId) return;
      if (showSpinner) setRefreshingHistory(true);
      try {
        const row = await fetchTicket(ticketId);
        setTicket(row);
        setPmTasks(buildPmTasksFromTicket(row));
      } catch (error) {
        toast.error(error.message || copy.loadError);
      } finally {
        if (showSpinner) setRefreshingHistory(false);
      }
    },
    [ticketId, copy.loadError]
  );

  const softDeleteCurrentTicket = () => setTicketDeleteConfirm("soft");

  const closeDeleteConfirm = () => {
    if (deletingTicket) return;
    setTicketDeleteConfirm(null);
  };

  const confirmDeleteTicket = async () => {
    if (!ticketId || ticketDeleteConfirm !== "soft") return;
    setDeletingTicket(true);
    try {
      await deleteTicket(ticketId);
      toast.success(detailCopy.toasts.movedToTrash);
      setTicketDeleteConfirm(null);
      onNavigate?.("TicketSales", { viewMode: "trash" });
    } catch (error) {
      toast.error(error.message || detailCopy.toasts.deleteError);
    } finally {
      setDeletingTicket(false);
    }
  };

  const deleteConfirmConfig = useMemo(() => {
    if (ticketDeleteConfirm === "soft") {
      return {
        title: detailCopy.sidebar.deleteTitle,
        message: detailCopy.confirms.softDelete,
        confirmLabel: detailCopy.sidebar.deleteTitle,
        icon: "mdi:trash-can-outline"
      };
    }
    return null;
  }, [ticketDeleteConfirm, detailCopy]);

  if (loading) {
    return (
      <div className={`${layout.page} ${td.ticketDetailPage} ${styles.page} msp-page-grid`}>
        <div className={`${layout.shell} ${layout.shellWide} ${layout.shellFull} ${td.shell}`}>
          <div className={td.emptyState}>{copy.loading}</div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className={`${layout.page} ${td.ticketDetailPage} ${styles.page} msp-page-grid`}>
        <div className={`${layout.shell} ${layout.shellWide} ${layout.shellFull} ${td.shell}`}>
          <header className={`${td.ticketChromeBar} ${td.ticketHeaderBar}`}>
            <button type="button" className={td.ticketHeaderIconBtn} onClick={() => onNavigate?.("TicketSales")} aria-label={copy.back}>
              <Icon icon="mdi:arrow-left" />
            </button>
          </header>
          <div className={td.emptyState}>{copy.notFound}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${layout.page} ${td.ticketDetailPage} ${styles.page} msp-page-grid`}>
      <div className={`${layout.shell} ${layout.shellWide} ${layout.shellFull} ${td.shell}`}>
        <header className={`${td.ticketChromeBar} ${td.ticketHeaderBar}`}>
          <button type="button" className={td.ticketHeaderIconBtn} onClick={() => onNavigate?.("TicketSales")} aria-label={copy.back} title={copy.back}>
            <Icon icon="mdi:arrow-left" />
          </button>

          <div className={td.ticketHeroTrack}>
            <h1 className={td.ticketHeroTitle}>{copy.formatTicketNumber(ticket.ticket_number || ticket.id)}</h1>
            <span className={`${td.ticketFamilyChip} ${td.ticketFamilyChip_sales}`} title={copy.family?.services || "Services"}>
              <Icon icon="mdi:briefcase-outline" aria-hidden />
              {copy.family?.services || "Services"}
            </span>
            {kindLabel ? (
              <>
                <span className={td.ticketHeroMetaDot} aria-hidden>
                  ·
                </span>
                <span className={`${td.ticketBadge} ${td.ticketBadge_ok}`}>{kindLabel}</span>
              </>
            ) : null}
            <span className={td.ticketHeroMetaDot} aria-hidden>
              ·
            </span>
            {titleEditing ? (
              <input
                ref={titleInputRef}
                className={td.ticketHeroSubjectInput}
                type="text"
                value={titleDraft}
                disabled={savingMeta}
                aria-label={detailCopy.header?.titleAria || copy.tasks.label}
                placeholder={detailCopy.header?.titlePlaceholder || copy.tasks.placeholder}
                onChange={e => setTitleDraft(e.target.value)}
                onBlur={() => void commitTitleEdit()}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void commitTitleEdit();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    cancelTitleEdit();
                  }
                }}
              />
            ) : (
              <button
                type="button"
                className={`${td.ticketHeroSubjectBtn} ${td.ticketHeroMetaItem}`}
                onClick={startTitleEdit}
                disabled={savingMeta}
                title={detailCopy.header?.editTitleTitle || detailCopy.description?.editTitle}
                aria-label={detailCopy.header?.editTitleAria || detailCopy.header?.titleAria}
              >
                <span className={`${td.ticketHeroMetaText} ${!ticket.title ? td.ticketHeroSubjectPlaceholder : ""}`.trim()}>
                  {ticket.title || detailCopy.header?.titlePlaceholder || "—"}
                </span>
              </button>
            )}
            <span className={td.ticketHeroMetaDot} aria-hidden>
              ·
            </span>
            <span className={`${td.ticketBadge} ${progressValue >= 100 ? td.ticketBadge_ok : ""}`} title={copy.progress}>
              {copy.progress}: {progressValue}%
            </span>
          </div>
        </header>

        <div className={td.workspace}>
          <div className={`${td.layout} ${styles.layout} ${rightPaneCollapsed ? styles.layoutRightCollapsed : ""}`.trim()}>
            <aside className={`${td.leftPane} ${heroStyles.rightSidebarContent}`}>
              <RightPaneStaticSection
                title={detailCopy.leftPane.properties}
                titleId="ticket-sales-properties-label"
                sectionClassName={td.paneSectionOverflow}
                bodyClassName={`${td.leftPanePropertiesBody} ${fs.settingsPanel}`}
              >
                <div className={fs.equipmentField}>
                  <label className={fs.equipmentFieldLabel}>{detailCopy.leftPane.requester}</label>
                  <div className={fs.contactPicker} ref={requesterDropdownRef}>
                    <div className={`${fs.contactInputWrap} ${showRequesterDropdown ? fs.contactInputWrapOpen : ""}`}>
                      <Icon icon="mdi:magnify" className={fs.contactInputIcon} aria-hidden />
                      <input
                        type="text"
                        className={fs.contactInput}
                        value={requesterSearch}
                        placeholder={copy.searchRequester || detailCopy.searchContact}
                        disabled={savingMeta}
                        aria-expanded={showRequesterDropdown}
                        aria-haspopup="listbox"
                        onChange={e => {
                          setRequesterSearch(e.target.value);
                          setShowRequesterDropdown(true);
                          setRequesterHighlight(0);
                        }}
                        onFocus={() => setShowRequesterDropdown(true)}
                        onKeyDown={e => {
                          if (!showRequesterDropdown || filteredRequesterOptions.length === 0) return;
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setRequesterHighlight(h => Math.min(h + 1, filteredRequesterOptions.length - 1));
                          } else if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setRequesterHighlight(h => Math.max(h - 1, 0));
                          } else if (e.key === "Enter") {
                            e.preventDefault();
                            const picked = filteredRequesterOptions[requesterHighlight];
                            if (picked) void selectRequester(picked);
                          } else if (e.key === "Escape") {
                            setShowRequesterDropdown(false);
                          }
                        }}
                      />
                    </div>
                    {showRequesterDropdown ? (
                      <div className={fs.contactDropdown} role="listbox">
                        {filteredRequesterOptions.length === 0 ? (
                          <div className={fs.contactEmpty}>{copy.noRequesterFound || detailCopy.noContactFound}</div>
                        ) : (
                          filteredRequesterOptions.map((option, idx) => (
                            <button
                              key={`${option.kind}-${option.id}`}
                              type="button"
                              role="option"
                              className={`${fs.contactOption} ${requesterHighlight === idx ? fs.contactOptionActive : ""}`}
                              onMouseEnter={() => setRequesterHighlight(idx)}
                              onClick={() => void selectRequester(option)}
                            >
                              <span className={fs.contactOptionName}>{option.label}</span>
                            </button>
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className={fs.equipmentField}>
                  <label className={fs.equipmentFieldLabel}>{copy.meta.client}</label>
                  <div className={fs.contactPicker} ref={clientDropdownRef}>
                    <div className={`${fs.contactInputWrap} ${showClientDropdown ? fs.contactInputWrapOpen : ""}`}>
                      <Icon icon="mdi:magnify" className={fs.contactInputIcon} aria-hidden />
                      <input
                        type="text"
                        className={fs.contactInput}
                        value={clientSearch}
                        placeholder={copy.searchClient}
                        disabled={savingMeta}
                        aria-expanded={showClientDropdown}
                        aria-haspopup="listbox"
                        onChange={e => {
                          setClientSearch(e.target.value);
                          setShowClientDropdown(true);
                          setClientHighlight(0);
                        }}
                        onFocus={() => setShowClientDropdown(true)}
                        onKeyDown={e => {
                          if (!showClientDropdown || filteredClientOptions.length === 0) return;
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setClientHighlight(h => Math.min(h + 1, filteredClientOptions.length - 1));
                          } else if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setClientHighlight(h => Math.max(h - 1, 0));
                          } else if (e.key === "Enter") {
                            e.preventDefault();
                            const picked = filteredClientOptions[clientHighlight];
                            if (picked) void selectClient(picked.raw);
                          } else if (e.key === "Escape") {
                            setShowClientDropdown(false);
                            setClientSearch(clientDisplayName || "");
                          }
                        }}
                      />
                    </div>
                    {showClientDropdown ? (
                      <div className={fs.contactDropdown} role="listbox">
                        {filteredClientOptions.length === 0 ? (
                          <div className={fs.contactEmpty}>{copy.noClientFound}</div>
                        ) : (
                          filteredClientOptions.map((option, idx) => (
                            <button
                              key={option.id}
                              type="button"
                              role="option"
                              className={`${fs.contactOption} ${clientHighlight === idx ? fs.contactOptionActive : ""}`}
                              onMouseEnter={() => setClientHighlight(idx)}
                              onClick={() => void selectClient(option.raw)}
                            >
                              <span className={fs.contactOptionName}>{option.label}</span>
                            </button>
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className={fs.equipmentField}>
                  <label className={fs.equipmentFieldLabel}>{copy.meta.equipment}</label>
                  <div className={fs.contactPicker} ref={equipmentDropdownRef}>
                    <div className={`${fs.contactInputWrap} ${showEquipmentDropdown ? fs.contactInputWrapOpen : ""}`}>
                      <Icon icon="mdi:magnify" className={fs.contactInputIcon} aria-hidden />
                      <input
                        type="text"
                        className={fs.contactInput}
                        value={equipmentSearch}
                        placeholder={copy.meta.searchEquipment}
                        disabled={savingMeta || !clientId || loadingEquipments}
                        aria-expanded={showEquipmentDropdown}
                        aria-haspopup="listbox"
                        onChange={e => {
                          setEquipmentSearch(e.target.value);
                          setShowEquipmentDropdown(true);
                          setEquipmentHighlight(0);
                        }}
                        onFocus={() => {
                          if (clientId) setShowEquipmentDropdown(true);
                        }}
                        onKeyDown={e => {
                          if (!showEquipmentDropdown || filteredEquipmentOptions.length === 0) return;
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setEquipmentHighlight(h => Math.min(h + 1, filteredEquipmentOptions.length - 1));
                          } else if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setEquipmentHighlight(h => Math.max(h - 1, 0));
                          } else if (e.key === "Enter") {
                            e.preventDefault();
                            const picked = filteredEquipmentOptions[equipmentHighlight];
                            if (picked) void selectTicketEquipment(picked);
                          } else if (e.key === "Escape") {
                            setShowEquipmentDropdown(false);
                            setEquipmentSearch(ticketEquipmentDisplayName || "");
                          }
                        }}
                      />
                      {ticketEquipmentId ? (
                        <button
                          type="button"
                          className={fs.clearButton || fs.contactClearBtn}
                          onClick={() => void clearTicketEquipment()}
                          disabled={savingMeta}
                          aria-label={copy.meta.clearEquipment}
                          title={copy.meta.clearEquipment}
                          style={{ marginRight: "0.35rem", border: "none", background: "transparent", cursor: "pointer", color: "inherit" }}
                        >
                          <FaTimes />
                        </button>
                      ) : null}
                    </div>
                    {showEquipmentDropdown ? (
                      <div className={fs.contactDropdown} role="listbox">
                        {!clientId ? (
                          <div className={fs.contactEmpty}>{copy.meta.selectClientFirst}</div>
                        ) : loadingEquipments ? (
                          <div className={fs.contactEmpty}>{copy.meta.loadingEquipment}</div>
                        ) : filteredEquipmentOptions.length === 0 ? (
                          <div className={fs.contactEmpty}>{copy.meta.noEquipmentFound}</div>
                        ) : (
                          filteredEquipmentOptions.map((eq, idx) => (
                            <button
                              key={eq.id}
                              type="button"
                              role="option"
                              className={`${fs.contactOption} ${equipmentHighlight === idx ? fs.contactOptionActive : ""}`}
                              onMouseEnter={() => setEquipmentHighlight(idx)}
                              onClick={() => void selectTicketEquipment(eq)}
                            >
                              <span className={fs.contactOptionName}>
                                {getEquipmentPickerLabel(eq, { locale })}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className={fs.equipmentField}>
                  <label className={fs.equipmentFieldLabel}>{detailCopy.leftPane.assignee}</label>
                  <div className={fs.contactPicker} ref={assigneeDropdownRef}>
                    <div className={`${fs.contactInputWrap} ${showAssigneeDropdown ? fs.contactInputWrapOpen : ""}`}>
                      <Icon icon="mdi:magnify" className={fs.contactInputIcon} aria-hidden />
                      <input
                        className={fs.contactInput}
                        type="text"
                        value={assigneeSearch}
                        autoComplete="off"
                        placeholder={copy.team.searchAgent}
                        disabled={teamBusy}
                        aria-expanded={showAssigneeDropdown}
                        aria-haspopup="listbox"
                        onChange={e => {
                          setAssigneeSearch(e.target.value);
                          setShowAssigneeDropdown(true);
                          setAssigneeHighlight(0);
                        }}
                        onFocus={() => setShowAssigneeDropdown(true)}
                        onKeyDown={e => {
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
                            if (picked) void handleAddAssignee(picked.id);
                          } else if (e.key === "Escape") {
                            setShowAssigneeDropdown(false);
                          }
                        }}
                      />
                      <button
                        type="button"
                        className={fs.contactInputEndBtn}
                        title={isCurrentUserAssigned ? (copy.team.assignMeAlready || detailCopy.leftPane.assignMeAlready) : (copy.team.assignMe || detailCopy.leftPane.assignMe)}
                        aria-label={isCurrentUserAssigned ? (copy.team.assignMeAlready || detailCopy.leftPane.assignMeAlready) : (copy.team.assignMe || detailCopy.leftPane.assignMe)}
                        disabled={teamBusy || !currentUserId || isCurrentUserAssigned}
                        onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (currentUserId) void handleAddAssignee(String(currentUserId));
                        }}
                      >
                        <Icon icon="mdi:account-plus" aria-hidden />
                      </button>
                    </div>
                    {showAssigneeDropdown ? (
                      <div className={fs.contactDropdown} role="listbox">
                        {filteredAssigneeOptions.length === 0 ? (
                          <div className={fs.contactEmpty}>{copy.team.noAgentFound}</div>
                        ) : (
                          filteredAssigneeOptions.map((opt, idx) => (
                            <button
                              key={opt.id}
                              type="button"
                              role="option"
                              className={`${fs.contactOption} ${assigneeHighlight === idx ? fs.contactOptionActive : ""}`}
                              onMouseEnter={() => setAssigneeHighlight(idx)}
                              onClick={() => void handleAddAssignee(opt.id)}
                            >
                              <span className={fs.contactOptionName}>{opt.label}</span>
                            </button>
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>
                  <div className={fs.chipsWrap}>
                    {assigneePeople.length === 0 ? (
                      <span className={fs.emptyChipHint}>{copy.team.noAssignee}</span>
                    ) : (
                      assigneePeople.map(person => (
                        <span key={person.id} className={fs.chip}>
                          {person.label}
                          <button
                            type="button"
                            onClick={e => {
                              e.preventDefault();
                              e.stopPropagation();
                              void handleRemoveAssignee(person.id);
                            }}
                            disabled={teamBusy}
                            aria-label={copy.team.removeAssignee}
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className={fs.equipmentField}>
                  <label className={fs.equipmentFieldLabel}>{detailCopy.leftPane.follower}</label>
                  <div className={fs.contactPicker} ref={followerDropdownRef}>
                    <div className={`${fs.contactInputWrap} ${showFollowerDropdown ? fs.contactInputWrapOpen : ""}`}>
                      <Icon icon="mdi:magnify" className={fs.contactInputIcon} aria-hidden />
                      <input
                        className={fs.contactInput}
                        type="text"
                        value={followerSearch}
                        autoComplete="off"
                        placeholder={copy.team.searchAgent}
                        disabled={teamBusy}
                        aria-expanded={showFollowerDropdown}
                        aria-haspopup="listbox"
                        onChange={e => {
                          setFollowerSearch(e.target.value);
                          setShowFollowerDropdown(true);
                          setFollowerHighlight(0);
                        }}
                        onFocus={() => setShowFollowerDropdown(true)}
                        onKeyDown={e => {
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
                            if (picked) void handleAddWatcher(picked.id);
                          } else if (e.key === "Escape") {
                            setShowFollowerDropdown(false);
                          }
                        }}
                      />
                    </div>
                    {showFollowerDropdown ? (
                      <div className={fs.contactDropdown} role="listbox">
                        {filteredFollowerOptions.length === 0 ? (
                          <div className={fs.contactEmpty}>{copy.team.noAgentFound}</div>
                        ) : (
                          filteredFollowerOptions.map((opt, idx) => (
                            <button
                              key={opt.id}
                              type="button"
                              role="option"
                              className={`${fs.contactOption} ${followerHighlight === idx ? fs.contactOptionActive : ""}`}
                              onMouseEnter={() => setFollowerHighlight(idx)}
                              onClick={() => void handleAddWatcher(opt.id)}
                            >
                              <span className={fs.contactOptionName}>{opt.label}</span>
                            </button>
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>
                  <div className={fs.chipsWrap}>
                    {watcherPeople.length === 0 ? (
                      <span className={fs.emptyChipHint}>{copy.team.noFollower}</span>
                    ) : (
                      watcherPeople.map(person => (
                        <span key={person.id} className={fs.chip}>
                          {person.label}
                          <button
                            type="button"
                            onClick={e => {
                              e.preventDefault();
                              e.stopPropagation();
                              void handleRemoveWatcher(person.id);
                            }}
                            disabled={teamBusy}
                            aria-label={copy.team.removeFollower}
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <hr className={td.paneSectionDivider} aria-hidden />

                <div className={fs.equipmentField}>
                  <label className={fs.equipmentFieldLabel} htmlFor="sales-status">
                    {detailCopy.leftPane.status}
                  </label>
                  <select id="sales-status" className={fs.select} value={status || "new"} disabled={savingStatus} onChange={e => handleStatusChange(e.target.value)}>
                    {copy.statusOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={fs.equipmentField}>
                  <label className={fs.equipmentFieldLabel} id="sales-type-label">
                    {detailCopy.leftPane.type}
                  </label>
                  <div className={fs.channelIconBar} role="radiogroup" aria-labelledby="sales-type-label">
                    {SALES_TYPE_OPTIONS.map(item => (
                      <SmartTooltip key={item.key} content={copy.kind[item.key]} className={fs.channelIconBarItem}>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={ticketType === item.key}
                          aria-label={copy.kind[item.key]}
                          className={`${fs.channelIconBtn} ${ticketType === item.key ? fs.channelIconBtnActive : ""}`}
                          disabled={savingMeta}
                          onClick={() => void updateTicketLive({ type: item.key }, copy.meta.typeSaved)}
                        >
                          <Icon icon={item.icon} aria-hidden />
                        </button>
                      </SmartTooltip>
                    ))}
                  </div>
                </div>

                <div className={fs.equipmentField}>
                  <label className={fs.equipmentFieldLabel} id="sales-category-label">
                    {detailCopy.leftPane.category}
                  </label>
                  <div className={fs.contactPicker} ref={categoryDropdownRef}>
                    <div className={`${fs.contactInputWrap} ${showCategoryDropdown ? fs.contactInputWrapOpen : ""}`}>
                      <Icon icon="mdi:magnify" className={fs.contactInputIcon} aria-hidden />
                      <input
                        type="text"
                        className={fs.contactInput}
                        value={categorySearch}
                        placeholder={detailCopy.searchCategory}
                        disabled={savingMeta}
                        aria-labelledby="sales-category-label"
                        aria-expanded={showCategoryDropdown}
                        aria-haspopup="listbox"
                        onChange={e => {
                          setCategorySearch(e.target.value);
                          setShowCategoryDropdown(true);
                          setCategoryHighlight(0);
                        }}
                        onFocus={() => {
                          const list = categories.filter(item => item?.name && item.enabled !== false);
                          const q = categorySearch.trim().toLowerCase();
                          const exactCatalogMatch = list.some(item => String(item.name || "").toLowerCase() === q);
                          if (q && !exactCatalogMatch) setCategorySearch("");
                          setShowCategoryDropdown(true);
                          setCategoryHighlight(0);
                        }}
                        onKeyDown={e => {
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
                            if (picked) void selectCategory(picked);
                          } else if (e.key === "Escape") {
                            setShowCategoryDropdown(false);
                          }
                        }}
                      />
                    </div>
                    {showCategoryDropdown ? (
                      <div className={fs.contactDropdown} role="listbox" aria-labelledby="sales-category-label">
                        {filteredCategoryOptions.length === 0 ? (
                          <div className={fs.contactEmpty}>{detailCopy.noCategoryFound || copy.meta.none}</div>
                        ) : (
                          filteredCategoryGroups.map(([section, items]) => (
                            <div key={section}>
                              <div className={fs.categoryDropdownSection}>{section}</div>
                              {items.map((item, idxInSection) => {
                                const flatIndex = filteredCategoryOptions.findIndex(opt => String(opt.id) === String(item.id));
                                const idx = flatIndex >= 0 ? flatIndex : idxInSection;
                                return (
                                  <button
                                    key={String(item.id)}
                                    type="button"
                                    role="option"
                                    aria-selected={String(ticket?.category || "") === String(item.name || "")}
                                    className={`${fs.contactOption} ${categoryHighlight === idx ? fs.contactOptionActive : ""}`}
                                    onMouseEnter={() => setCategoryHighlight(idx)}
                                    onClick={() => void selectCategory(item)}
                                  >
                                    <span className={fs.contactOptionName}>{String(item.name || "")}</span>
                                  </button>
                                );
                              })}
                            </div>
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className={fs.equipmentField}>
                  <label className={fs.equipmentFieldLabel} htmlFor="sales-priority">
                    {detailCopy.priorityLabel}
                  </label>
                  <select
                    id="sales-priority"
                    className={fs.select}
                    value={priority}
                    disabled={savingMeta}
                    onChange={e => void updateTicketLive({ priority: e.target.value }, copy.meta.prioritySaved)}
                  >
                    {(detailCopy.priorityOptions || []).map(item => (
                      <option key={item.key} value={item.key}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <hr className={td.paneSectionDivider} aria-hidden />

                {supportCredit?.eligible && clientId ? (
                  <div className={fs.equipmentField}>
                    <label className={fs.equipmentFieldLabel}>
                      {copy.credits.title}
                      {isCommunity ? <ProFeatureBadge variant="inline" className={styles.creditProBadge} /> : null}
                    </label>
                    <div className={styles.creditSummary}>
                      <div className={styles.creditSummaryRow}>
                        <Icon icon="mdi:wallet-outline" aria-hidden />
                        <span>{interpolate(copy.credits.balance, { count: String(creditBalance) })}</span>
                      </div>
                      <div className={styles.creditSummaryRowMuted}>
                        {creditTotalDebited > 0
                          ? interpolate(copy.credits.debited, { count: String(creditTotalDebited) })
                          : copy.credits.noneDebited}
                      </div>
                      <button
                        type="button"
                        className={styles.creditDebitBtn}
                        disabled={savingCredits || isCommunity || creditBalance <= 0}
                        onClick={() =>
                          setCreditModal({
                            mode: "ticket",
                            sourceKey: `ticket:${Date.now()}`,
                            contextLabel: ticket?.title || "",
                            allowSkip: false
                          })
                        }
                      >
                        <Icon icon="mdi:ticket-percent-outline" aria-hidden />
                        {copy.credits.debitTicket}
                      </button>
                    </div>
                  </div>
                ) : null}

                {supportCredit?.eligible && clientId ? <hr className={td.paneSectionDivider} aria-hidden /> : null}

                <div className={fs.equipmentField}>
                  <label className={fs.equipmentFieldLabel}>{detailCopy.leftPane.tags}</label>
                  <div className={`${heroStyles.heroTags} ${td.leftPaneTags}`} aria-label={detailCopy.leftPane.tagsAria}>
                    {tags.map(tag => {
                      const tagColor = tag.color || "#2b5fab";
                      return (
                        <span
                          key={tag.id}
                          className={heroStyles.heroTagChip}
                          style={{
                            backgroundColor: `${tagColor}18`,
                            borderColor: `${tagColor}55`,
                            color: tagColor
                          }}
                        >
                          {tag.label}
                          <button type="button" className={heroStyles.heroTagRemove} onClick={() => handleRemoveTag(tag.id)} disabled={tagBusy} aria-label={copy.tags.remove}>
                            <FaTimes />
                          </button>
                        </span>
                      );
                    })}
                    {!tagAddOpen ? (
                      <div className={heroStyles.heroTagAddWrap}>
                        <button type="button" className={heroStyles.heroTagAddTrigger} onClick={() => setTagAddOpen(true)} disabled={tagBusy} aria-label={copy.tags.add} title={copy.tags.add}>
                          <FaPlus />
                        </button>
                      </div>
                    ) : (
                      <div className={heroStyles.heroTagAddWrap}>
                        <TicketTagSuggestField
                          assignedTags={tags}
                          placeholder={copy.tags.placeholder}
                          addAria={copy.tags.add}
                          confirmAria={copy.tags.add}
                          createLabel={label => interpolate(copy.tags.create || "Create “{label}”", { label })}
                          emptyHint={copy.tags.empty || "No matching tag"}
                          disabled={tagBusy}
                          onSubmit={(label, color) => {
                            void handleAddTag(label, color);
                          }}
                          onCancel={() => {
                            setTagDraft("");
                            setTagAddOpen(false);
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </RightPaneStaticSection>
            </aside>

            <section className={`${td.centerPane} ${styles.centerPane}`.trim()}>
              <div className={styles.centerStack}>
                <div
                  className={`${styles.centerTabs} ${!canTasks ? styles.centerTabsTwo : ""}`.trim()}
                  role="tablist"
                  aria-label={copy.centerTabs.aria}
                >
                  <button
                    type="button"
                    role="tab"
                    id="sales-center-tab-form"
                    aria-selected={centerTab === "form"}
                    aria-controls="sales-center-panel-form"
                    className={`${styles.centerTab} ${centerTab === "form" ? styles.centerTabActive : ""}`.trim()}
                    onClick={() => setCenterTab("form")}
                  >
                    <Icon icon="mdi:form-select" aria-hidden />
                    <span className={styles.centerTabLabel}>{copy.centerTabs.form}</span>
                    {formEntries.length > 0 ? <span className={styles.centerTabBadge}>{formEntries.length}</span> : null}
                  </button>
                  {canTasks ? (
                    <button
                      type="button"
                      role="tab"
                      id="sales-center-tab-tasks"
                      aria-selected={centerTab === "tasks"}
                      aria-controls="sales-center-panel-tasks"
                      className={`${styles.centerTab} ${centerTab === "tasks" ? styles.centerTabActive : ""}`.trim()}
                      onClick={() => setCenterTab("tasks")}
                    >
                      <Icon icon="mdi:checkbox-marked-outline" aria-hidden />
                      <span className={styles.centerTabLabel}>{copy.centerTabs.tasks}</span>
                      <span className={styles.centerTabBadge}>
                        {tasksDone}/{tasksTotal}
                      </span>
                    </button>
                  ) : null}
                  <button
                    type="button"
                    role="tab"
                    id="sales-center-tab-chat"
                    aria-selected={centerTab === "chat"}
                    aria-controls="sales-center-panel-chat"
                    className={`${styles.centerTab} ${centerTab === "chat" ? styles.centerTabActive : ""}`.trim()}
                    onClick={() => setCenterTab("chat")}
                  >
                    <Icon icon="mdi:message-text-outline" aria-hidden />
                    <span className={styles.centerTabLabel}>{copy.centerTabs.chat}</span>
                    {comments.length > 0 ? <span className={styles.centerTabBadge}>{comments.length}</span> : null}
                  </button>
                </div>

                <div className={styles.centerTabPanels}>
                  {centerTab === "chat" ? (
                    <div
                      className={`${styles.centerTabPanel} ${styles.centerTabPanelChat}`}
                      role="tabpanel"
                      id="sales-center-panel-chat"
                      aria-labelledby="sales-center-tab-chat"
                    >
                      <TicketChatPanel
                        ticketId={ticketId}
                        ticket={ticket}
                        comments={comments}
                        users={users}
                        validationRequests={Array.isArray(ticket?.validationRequests) ? ticket.validationRequests : []}
                        formatDateTime={copy.formatDateTime}
                        emptyLabel={copy.comments.empty}
                        onCommentAdded={loadTicket}
                        clientId={clientId}
                        clientName={ticket?.client_name || ticket?.client_nom || ""}
                        permissionPrefix="sales_detail"
                        canEditMessages={canEditMessages}
                        canDeleteAttachments={canDeleteAttachments}
                        canPublicReply={canPublicReply}
                        canRequestValidation={canRequestValidation}
                      />
                    </div>
                  ) : null}

                  {centerTab === "tasks" && canTasks ? (
                    <div
                      className={`${styles.centerTabPanel} ${styles.centerTabPanelTasks}`}
                      role="tabpanel"
                      id="sales-center-panel-tasks"
                      aria-labelledby="sales-center-tab-tasks"
                    >
                      <SalesTasksPanel
                        tasks={pmTasks}
                        users={users}
                        equipments={clientEquipments}
                        defaultEquipmentId={ticketEquipmentId}
                        copy={copy.tasks}
                        formatDateTime={copy.formatDateTime}
                        saving={savingTasks}
                        variant="pane"
                        canManageTasks={canTasks}
                        supportCredit={canDebitCredits ? supportCredit : null}
                        creditCopy={copy.credits.modal}
                        creditDebitedSources={creditDebitedSources}
                        creditAlreadyLabel={copy.credits.alreadyTask}
                        onAddTask={handleAddTask}
                        onUpdateTask={handleUpdateTask}
                        onToggleTask={handleToggleTask}
                        onRemoveTask={handleRemoveTask}
                        onConsumeTaskCredits={handleConsumeTaskCreditsFromForm}
                        onUploadDocuments={handleUploadTaskDocuments}
                        onDeleteDocument={handleDeleteTaskDocument}
                      />
                    </div>
                  ) : null}

                  {centerTab === "form" ? (
                    <div
                      className={`${styles.centerTabPanel} ${styles.centerTabPanelScroll}`}
                      role="tabpanel"
                      id="sales-center-panel-form"
                      aria-labelledby="sales-center-tab-form"
                    >
                      <div className={`${styles.formInChat} ${styles.formInPane}`}>
                        <div className={styles.formInChatHead}>
                          <div className={styles.formInChatTitle}>
                            <Icon icon="mdi:form-select" aria-hidden />
                            <span>{copy.form.title}</span>
                          </div>
                          {canEditForm && hasEditableFormFields && !formEditing ? (
                            <SmartTooltip content={copy.form.edit}>
                              <button
                                type="button"
                                className={td.commentEditBtn}
                                onClick={startFormEdit}
                                disabled={savingForm || savingMeta || loading}
                                aria-label={copy.form.editAria}
                              >
                                <Icon icon="mdi:pencil-outline" aria-hidden />
                              </button>
                            </SmartTooltip>
                          ) : null}
                          {formEditing ? (
                            <div className={styles.formEditActions}>
                              <button
                                type="button"
                                className={td.commentEditCancelBtn}
                                onClick={cancelFormEdit}
                                disabled={savingForm}
                              >
                                {copy.form.cancel}
                              </button>
                              <button
                                type="button"
                                className={td.commentEditSaveBtn}
                                onClick={() => void saveFormEdit()}
                                disabled={savingForm}
                              >
                                {savingForm ? copy.form.saving : copy.form.save}
                              </button>
                            </div>
                          ) : null}
                        </div>
                        {formEditing ? (
                          <div className={styles.formEditBody}>
                            {(formData?.values && Object.keys(formData.values).some(key => {
                              const field = (salesFormDefinition?.fields || []).find(f => f.fieldKey === key);
                              return field && isFileField(field);
                            })) ? (
                              <p className={styles.formFilesHint}>{copy.form.filesReadOnly}</p>
                            ) : null}
                            <SalesFormFieldsRenderer
                              fields={editableFormFields}
                              values={formDraftValues}
                              users={users}
                              contacts={contacts}
                              clients={clients}
                              onChange={next => {
                                setFormDraftValues(next);
                                if (formFieldErrors) setFormFieldErrors(false);
                              }}
                              fieldErrors={formFieldErrors}
                              className={styles.formEditFields}
                            />
                          </div>
                        ) : formEntries.length === 0 && !(formData?.purchaseOrder || formData?.purchase_order) && !creatorDisplayName ? (
                          <p className={td.emptyText}>{copy.form.empty}</p>
                        ) : (
                          <dl className={styles.formFacts}>
                            {creatorDisplayName ? (
                              <div>
                                <dt>{copy.form.creator}</dt>
                                <dd>{creatorDisplayName}</dd>
                              </div>
                            ) : null}
                            {(formData?.purchaseOrder || formData?.purchase_order) && (
                              <div>
                                <dt>{copy.form.purchaseOrder}</dt>
                                <dd>{formData.purchaseOrder || formData.purchase_order}</dd>
                              </div>
                            )}
                            {(formData?.commercialLabel || formData?.commercial) && (
                              <div>
                                <dt>{copy.form.commercial}</dt>
                                <dd>{formData.commercialLabel || formData.commercial}</dd>
                              </div>
                            )}
                            {(formData?.projectManagerLabel || formData?.projectManager) && (
                              <div>
                                <dt>{copy.form.projectManager}</dt>
                                <dd>{formData.projectManagerLabel || formData.projectManager}</dd>
                              </div>
                            )}
                            {formEntries.map(row => (
                              <div key={row.key}>
                                <dt>{row.label}</dt>
                                <dd>
                                  <SalesFormFieldValue
                                    row={row}
                                    onNavigate={onNavigate}
                                    linkClassName={td.contextLink}
                                    linkButtonClassName={td.linkLikeBtn}
                                    stackClassName={styles.formLinkedStack}
                                    metaClassName={styles.formLinkedMeta}
                                  />
                                </dd>
                              </div>
                            ))}
                          </dl>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <aside
              className={`${td.rightPane} ${heroStyles.rightSidebarContent} ${styles.rightPane} ${rightPaneCollapsed ? styles.rightPaneHidden : ""}`.trim()}
              aria-hidden={rightPaneCollapsed}
            >
              {rightPaneView === "history" ? (
                <RightPaneStaticSection
                  title={detailCopy.rightPane.historyToggleTitle}
                  titleId="ticket-sales-log-title"
                  count={ticketActivityLog.length}
                  headerExtra={
                    <SmartTooltip content={detailCopy.rightPane.historyRefreshTitle}>
                      <button
                        type="button"
                        className={td.historyRefreshBtn}
                        onClick={() => void refreshTicketHistory({ showSpinner: true })}
                        disabled={refreshingHistory}
                        aria-label={detailCopy.rightPane.historyRefreshAria}
                      >
                        <Icon icon={refreshingHistory ? "mdi:loading" : "mdi:refresh"} className={refreshingHistory ? td.historyRefreshSpin : undefined} aria-hidden />
                      </button>
                    </SmartTooltip>
                  }
                >
                  {ticketActivityLog.length === 0 ? (
                    <p className={td.emptyText}>{detailCopy.empty.noActivity}</p>
                  ) : (
                    <div className={td.ticketLogList}>
                      {ticketActivityLog.map(entry => (
                        <article key={entry.id} className={`${td.ticketLogItem} ${td[`ticketLogItem_${entry.kind}`] || ""}`.trim()}>
                          <div className={td.ticketLogIcon} aria-hidden>
                            <Icon icon={entry.icon} />
                          </div>
                          <div className={td.ticketLogBody}>
                            <div className={td.ticketLogLabel}>{entry.label}</div>
                            <div className={td.ticketLogMeta}>
                              <span className={td.ticketLogActor}>{entry.actor}</span>
                              <span className={td.ticketLogDot} aria-hidden>
                                ·
                              </span>
                              <time className={td.ticketLogDate} dateTime={entry.at}>
                                {detailCopy.formatDateTime(entry.at)}
                              </time>
                            </div>
                            {entry.detail ? <p className={td.ticketLogDetail}>{truncateLogText(entry.detail)}</p> : null}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </RightPaneStaticSection>
              ) : rightPaneView === "taskStats" ? (
                <RightPaneStaticSection title={copy.taskStats.title} titleId="ticket-sales-task-stats-title" count={taskStats.total}>
                  {taskStats.total === 0 ? (
                    <p className={td.emptyText}>{copy.taskStats.empty}</p>
                  ) : (
                    <>
                      <p className={styles.taskStatsHint}>{copy.taskStats.hoursHint}</p>

                      <div className={styles.taskStatsHero}>
                        <span className={styles.taskStatsHeroLabel}>{copy.taskStats.hoursPlanned}</span>
                        <span className={styles.taskStatsHeroValue}>{copy.formatDurationMs(taskStats.plannedMs)}</span>
                        <span className={styles.taskStatsHeroSub}>
                          {copy.taskStats.hoursDone}: {copy.formatDurationMs(taskStats.doneMs)}
                          {" · "}
                          {copy.taskStats.hoursRemaining}: {copy.formatDurationMs(taskStats.remainingMs)}
                        </span>
                      </div>

                      <div className={styles.taskStatsGrid}>
                        <div className={styles.taskStatsCard}>
                          <span className={styles.taskStatsCardLabel}>{copy.taskStats.progress}</span>
                          <span className={styles.taskStatsCardValue}>{taskStats.progress}%</span>
                        </div>
                        <div className={styles.taskStatsCard}>
                          <span className={styles.taskStatsCardLabel}>{copy.taskStats.done}</span>
                          <span className={styles.taskStatsCardValue}>
                            {taskStats.done}/{taskStats.total}
                          </span>
                        </div>
                        <div className={styles.taskStatsCard}>
                          <span className={styles.taskStatsCardLabel}>{copy.taskStats.todo}</span>
                          <span className={styles.taskStatsCardValue}>{taskStats.todo}</span>
                        </div>
                        <div className={`${styles.taskStatsCard} ${taskStats.overdue > 0 ? styles.taskStatsCardWarn : ""}`.trim()}>
                          <span className={styles.taskStatsCardLabel}>{copy.taskStats.overdue}</span>
                          <span className={styles.taskStatsCardValue}>{taskStats.overdue}</span>
                        </div>
                        <div className={styles.taskStatsCard}>
                          <span className={styles.taskStatsCardLabel}>{copy.taskStats.unassigned}</span>
                          <span className={styles.taskStatsCardValue}>{taskStats.unassigned}</span>
                        </div>
                        <div className={styles.taskStatsCard}>
                          <span className={styles.taskStatsCardLabel}>{copy.taskStats.unscheduled}</span>
                          <span className={styles.taskStatsCardValue}>{taskStats.unscheduled}</span>
                        </div>
                      </div>

                      {taskStats.byAssignee.length > 0 ? (
                        <>
                          <h3 className={styles.taskStatsSectionTitle}>{copy.taskStats.byAssignee}</h3>
                          <ul className={styles.taskStatsAssigneeList}>
                            {taskStats.byAssignee.map(row => (
                              <li key={row.key} className={styles.taskStatsAssigneeItem}>
                                <div>
                                  <div className={styles.taskStatsAssigneeName}>
                                    {row.key === "__none__"
                                      ? copy.taskStats.noAssignee
                                      : row.label || userLabel(users.find(u => String(u.id) === String(row.key))) || copy.taskStats.noAssignee}
                                  </div>
                                  <div className={styles.taskStatsAssigneeMeta}>
                                    {interpolate(copy.taskStats.tasksCount, {
                                      done: String(row.done),
                                      total: String(row.total)
                                    })}
                                  </div>
                                </div>
                                <span className={styles.taskStatsAssigneeHours}>{copy.formatDurationMs(row.plannedMs)}</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : null}
                    </>
                  )}
                </RightPaneStaticSection>
              ) : (
                <>
                  <RightPaneStaticSection title={copy.planning.title} titleId="ticket-sales-planning-title">
                    {scheduledTasks.length > 0 ? (
                      <ul className={styles.planningRecapList}>
                        {scheduledTasks.map(task => {
                          const assigneeList =
                            Array.isArray(task.assignees) && task.assignees.length > 0
                              ? task.assignees
                              : task.assigneeId
                                ? [{ id: task.assigneeId, label: task.assigneeLabel }]
                                : [];
                          const assignee =
                            assigneeList.length === 0
                              ? copy.tasks.assigneeNone
                              : assigneeList
                                  .map(entry =>
                                    (entry.id && users.find(u => String(u.id) === String(entry.id))
                                      ? userLabel(users.find(u => String(u.id) === String(entry.id)))
                                      : entry.label) || entry.id
                                  )
                                  .filter(Boolean)
                                  .join(", ");
                          const schedule = formatTaskSchedule(task, copy.formatDateTime, copy.tasks.rangeJoiner);
                          return (
                            <li key={String(task.id)} className={`${styles.planningRecapItem} ${task.done ? styles.planningRecapDone : ""}`}>
                              <div className={styles.planningRecapTitle}>
                                <Icon icon={task.done ? "mdi:check-circle" : "mdi:calendar-clock"} aria-hidden />
                                <span>{task.label}</span>
                              </div>
                              <div className={styles.planningRecapMeta}>
                                <span className={styles.planningRecapAssignee}>
                                  <Icon icon="mdi:account-outline" aria-hidden />
                                  {assignee}
                                </span>
                                {schedule ? (
                                  <span className={styles.planningRecapSchedule}>
                                    <Icon icon="mdi:clock-outline" aria-hidden />
                                    {schedule}
                                  </span>
                                ) : null}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className={td.emptyText}>
                        {copy.planning.notPlanned}. {copy.planning.noEventHint}
                      </p>
                    )}
                    <button type="button" className={styles.secondaryBtn} onClick={openPlanning}>
                      <Icon icon="mdi:calendar-month-outline" />
                      {copy.planning.openPlanning}
                    </button>
                  </RightPaneStaticSection>

                  {canReport ? (
                    <RightPaneStaticSection title={copy.report.title} titleId="ticket-sales-report-title">
                      <p className={td.emptyText}>{copy.report.hint}</p>
                      <button type="button" className={styles.primaryBtn} onClick={openReport}>
                        <Icon icon="mdi:file-document-edit-outline" />
                        {copy.report.cta}
                      </button>
                    </RightPaneStaticSection>
                  ) : null}
                </>
              )}
            </aside>

            <aside className={td.rightSidebar}>
              <button
                type="button"
                className={td.sidebarActionBtn}
                title={rightPaneCollapsed ? copy.rightPaneToggle.expandTitle : copy.rightPaneToggle.collapseTitle}
                aria-label={rightPaneCollapsed ? copy.rightPaneToggle.expandAria : copy.rightPaneToggle.collapseAria}
                aria-expanded={!rightPaneCollapsed}
                onClick={toggleRightPaneCollapsed}
              >
                <Icon icon={rightPaneCollapsed ? "mdi:chevron-left" : "mdi:chevron-right"} />
              </button>
              <button
                type="button"
                className={`${td.sidebarActionBtn} ${!rightPaneCollapsed && rightPaneView === "context" ? td.sidebarActionBtnActive : ""}`.trim()}
                title={detailCopy.sidebar.classicViewTitle}
                aria-label={detailCopy.sidebar.classicViewAria}
                aria-pressed={!rightPaneCollapsed && rightPaneView === "context"}
                onClick={() => openRightPaneView("context")}
              >
                <Icon icon="mdi:view-dashboard-outline" />
              </button>
              <button
                type="button"
                className={`${td.sidebarActionBtn} ${!rightPaneCollapsed && rightPaneView === "history" ? td.sidebarActionBtnActive : ""}`.trim()}
                title={detailCopy.rightPane.historyToggleTitle}
                aria-label={detailCopy.rightPane.historyToggleAria}
                aria-pressed={!rightPaneCollapsed && rightPaneView === "history"}
                onClick={() => {
                  openRightPaneView("history");
                  void refreshTicketHistory({ showSpinner: true });
                }}
              >
                <Icon icon="mdi:history" />
              </button>
              {canTasks ? (
                <button
                  type="button"
                  className={`${td.sidebarActionBtn} ${!rightPaneCollapsed && rightPaneView === "taskStats" ? td.sidebarActionBtnActive : ""}`.trim()}
                  title={copy.taskStats.toggleTitle}
                  aria-label={copy.taskStats.toggleAria}
                  aria-pressed={!rightPaneCollapsed && rightPaneView === "taskStats"}
                  onClick={() => openRightPaneView("taskStats")}
                >
                  <Icon icon="mdi:chart-timeline-variant" />
                </button>
              ) : null}
              {canDeleteTicket ? (
                <>
                  <span className={td.sidebarSeparator} aria-hidden />
                  <button type="button" className={td.sidebarActionBtn} title={detailCopy.sidebar.deleteTitle} onClick={softDeleteCurrentTicket}>
                    <Icon icon="mdi:trash-can-outline" />
                  </button>
                </>
              ) : null}
            </aside>
          </div>
        </div>
      </div>

      <TicketConfirmModal
        open={Boolean(deleteConfirmConfig)}
        title={deleteConfirmConfig?.title}
        message={deleteConfirmConfig?.message}
        confirmLabel={deleteConfirmConfig?.confirmLabel}
        variant="danger"
        icon={deleteConfirmConfig?.icon}
        loading={deletingTicket}
        onClose={closeDeleteConfirm}
        onConfirm={confirmDeleteTicket}
      />

      <SalesCreditDebitModal
        open={Boolean(creditModal)}
        copy={copy.credits.modal}
        supportCredit={supportCredit}
        contextLabel={creditModal?.contextLabel || ""}
        allowSkip={Boolean(creditModal?.allowSkip)}
        saving={savingCredits || savingTasks}
        onClose={() => !savingCredits && setCreditModal(null)}
        onConfirm={handleConsumeCredits}
        onSkip={handleSkipCreditModal}
      />
    </div>
  );
}
