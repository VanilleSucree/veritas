import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import TicketConfirmModal from "./TicketConfirmModal";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import eventStyles from "../PlanningPage/PlanningEventFormModal.module.css";
import styles from "./TicketSalesDetailPage.module.css";
import {
  SalesCreditDebitFields,
  buildSalesCreditDefaultAmounts,
  getSalesCreditDebitsFromState,
  getSalesCreditRefundsFromState,
  getTaskCreditBalance
} from "./SalesCreditDebitFields";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { usePlanningEventTypes } from "../PlanningPage/usePlanningEventTypes";
import { getPlanningEventFormCopy } from "../PlanningPage/planningEventFormI18n";
import { PLANNING_EVENT_TYPES } from "../PlanningPage/planningEventTypes";
import { getEquipmentPickerLabel } from "./ticketEquipmentUtils";
import API_BASE_URL from "../../config";
import { interpolate } from "../../i18n/translate";

const ATTACHMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png,.doc,.docx,.csv,.xls,.xlsx,.mp4,.3gp,.mp3,.mpeg,.ogg,.aac,.amr,.m4a";
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

function toAbsoluteUrl(path) {
  const raw = String(path || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = String(API_BASE_URL || "").replace(/\/api\/?$/, "");
  return raw.startsWith("/") ? `${base}${raw}` : `${base}/${raw}`;
}

function getInitials(label) {
  const cleaned = String(label || "").trim();
  if (!cleaned) return "?";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
}

function formatRelativeLabel(value, copy) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return copy.relativeJustNow || "just now";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return interpolate(copy.relativeMinutes || "{count} min", { count: String(minutes) });
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return interpolate(copy.relativeHours || "{count} h", { count: String(hours) });
  const days = Math.floor(hours / 24);
  return interpolate(copy.relativeDays || "{count} d", { count: String(days) });
}

function toDatetimeLocalValue(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function formatTaskSchedule(task, formatDateTime, rangeJoiner) {
  if (!task?.startAt && !task?.endAt) return null;
  if (task.startAt && task.endAt) {
    return `${formatDateTime(task.startAt)} ${rangeJoiner} ${formatDateTime(task.endAt)}`;
  }
  return formatDateTime(task.startAt || task.endAt);
}

function resolveDefaultEventType(types, preferred) {
  const list = Array.isArray(types) ? types : [];
  if (preferred && list.some(type => type.value === preferred)) return preferred;
  if (list.some(type => type.value === "intervention")) return "intervention";
  return list[0]?.value || "";
}

const TASK_FORM_SECTIONS_BASE = [
  { id: "general", icon: "mdi:text-box-outline" },
  { id: "schedule", icon: "mdi:calendar-clock" },
  { id: "assignee", icon: "mdi:account-outline" },
  { id: "equipment", icon: "mdi:desktop-classic" },
  { id: "documents", icon: "mdi:paperclip" },
  { id: "credits", icon: "mdi:ticket-percent-outline" }
];

export default function SalesTasksPanel({
  tasks = [],
  users = [],
  equipments = [],
  defaultEquipmentId = null,
  copy,
  formatDateTime,
  saving = false,
  variant = "card",
  canManageTasks = true,
  supportCredit = null,
  creditCopy = null,
  creditDebitedSources = null,
  creditAlreadyLabel = "",
  onAddTask,
  onUpdateTask,
  onToggleTask,
  onRemoveTask,
  onConsumeTaskCredits,
  onRefundTaskCredits,
  onUploadDocuments,
  onDeleteDocument
}) {
  const locale = useAppLocale();
  const catalogTypes = usePlanningEventTypes();
  const planningFormCopy = useMemo(() => getPlanningEventFormCopy(locale, catalogTypes), [locale, catalogTypes]);
  const selectableTypes = useMemo(() => {
    const list = Array.isArray(planningFormCopy.planningTypes) && planningFormCopy.planningTypes.length > 0
      ? planningFormCopy.planningTypes
      : PLANNING_EVENT_TYPES;
    return list.filter(type => type.formSelectable !== false && type.value !== "campagne");
  }, [planningFormCopy.planningTypes]);
  const typeLabels = useMemo(() => {
    const map = {};
    selectableTypes.forEach(type => {
      map[type.value] = type.label;
    });
    return map;
  }, [selectableTypes]);

  const [open, setOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [activeSection, setActiveSection] = useState("general");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState("");
  const [assigneeIds, setAssigneeIds] = useState([]);
  const [equipmentId, setEquipmentId] = useState("");
  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");
  const [rangeMode, setRangeMode] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [assigneeHighlight, setAssigneeHighlight] = useState(0);
  const [creditEnabled, setCreditEnabled] = useState(false);
  const [creditAmounts, setCreditAmounts] = useState({});
  const [refundEnabled, setRefundEnabled] = useState(false);
  const [refundAmounts, setRefundAmounts] = useState({});
  const [existingDocuments, setExistingDocuments] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [docsToRemove, setDocsToRemove] = useState([]);
  const [docsBusy, setDocsBusy] = useState(false);
  const assigneePickerRef = useRef(null);
  const documentInputRef = useRef(null);

  const canManageCredits = Boolean(supportCredit?.eligible && creditCopy);
  const fieldsCopy = creditCopy || {};
  const sourceBalances = supportCredit?.sourceBalances || {};

  const userOptions = useMemo(
    () =>
      (Array.isArray(users) ? users : [])
        .filter(u => u?.id)
        .map(u => ({
          id: String(u.id),
          label: u.ticket_helpdesk_display_name || u.username || u.name || u.nom || u.email || ""
        }))
        .filter(u => u.id && u.label),
    [users]
  );

  const equipmentOptions = useMemo(
    () =>
      (Array.isArray(equipments) ? equipments : [])
        .filter(eq => eq?.id)
        .map(eq => ({
          id: String(eq.id),
          label: getEquipmentPickerLabel(eq, { locale }) || String(eq.name || eq.id)
        })),
    [equipments, locale]
  );

  const isEditing = Boolean(editingTask?.id);
  const modalCopy = copy.modal || {};

  const resetCreditForm = (alreadyDebited = false) => {
    setCreditEnabled(false);
    setCreditAmounts(
      alreadyDebited ? {} : buildSalesCreditDefaultAmounts(supportCredit?.packs || [], supportCredit?.balance ?? 0)
    );
    setRefundEnabled(false);
    setRefundAmounts({});
  };

  const resetForm = () => {
    setEditingTask(null);
    setActiveSection("general");
    setLabel("");
    setDescription("");
    setEventType(resolveDefaultEventType(selectableTypes));
    setAssigneeIds([]);
    setAssigneeSearch("");
    setShowAssigneeDropdown(false);
    setAssigneeHighlight(0);
    setEquipmentId(defaultEquipmentId ? String(defaultEquipmentId) : "");
    setStartLocal("");
    setEndLocal("");
    setRangeMode(false);
    setExistingDocuments([]);
    setPendingFiles([]);
    setDocsToRemove([]);
    resetCreditForm(false);
  };

  const closeModal = () => {
    if (saving) return;
    setOpen(false);
    resetForm();
  };

  const openCreateModal = () => {
    resetForm();
    setEventType(resolveDefaultEventType(selectableTypes));
    setEquipmentId(defaultEquipmentId ? String(defaultEquipmentId) : "");
    setOpen(true);
  };

  const openEditModal = task => {
    if (!task?.id || saving) return;
    setEditingTask(task);
    setActiveSection("general");
    setLabel(String(task.label || ""));
    setDescription(String(task.description || ""));
    setEventType(resolveDefaultEventType(selectableTypes, task.eventType || task.type));
    const fromAssignees = Array.isArray(task.assignees)
      ? task.assignees.map(entry => String(entry?.id || "")).filter(Boolean)
      : [];
    const legacyId = task.assigneeId ? String(task.assigneeId) : "";
    setAssigneeIds(fromAssignees.length > 0 ? fromAssignees : legacyId ? [legacyId] : []);
    setAssigneeSearch("");
    setShowAssigneeDropdown(false);
    setAssigneeHighlight(0);
    setEquipmentId(
      task.equipmentId
        ? String(task.equipmentId)
        : defaultEquipmentId
          ? String(defaultEquipmentId)
          : ""
    );
    setStartLocal(toDatetimeLocalValue(task.startAt));
    setEndLocal(toDatetimeLocalValue(task.endAt));
    setRangeMode(Boolean(task.startAt && task.endAt));
    setExistingDocuments(Array.isArray(task.documents) ? task.documents : []);
    setPendingFiles([]);
    setDocsToRemove([]);
    const alreadyDebited = Boolean(
      getTaskCreditBalance(sourceBalances, task.id) || creditDebitedSources?.has?.(`task:${task.id}`)
    );
    resetCreditForm(alreadyDebited);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = event => {
      if (event.key === "Escape" && !saving) {
        setOpen(false);
        resetForm();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, saving]);

  useEffect(() => {
    if (!open || eventType) return;
    setEventType(resolveDefaultEventType(selectableTypes));
  }, [open, eventType, selectableTypes]);

  useEffect(() => {
    if (!showAssigneeDropdown) return undefined;
    const onPointerDown = event => {
      if (!assigneePickerRef.current?.contains(event.target)) {
        setShowAssigneeDropdown(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [showAssigneeDropdown]);

  const taskSections = useMemo(() => {
    const list = TASK_FORM_SECTIONS_BASE.filter(section => section.id !== "credits" || canManageCredits);
    return list;
  }, [canManageCredits]);

  const sectionMeta = useMemo(
    () => {
      const addOk =
        !creditEnabled ||
        getSalesCreditDebitsFromState(true, creditAmounts, supportCredit?.packs).length > 0 ||
        Number(supportCredit?.balance || 0) <= 0;
      const refundOk =
        !refundEnabled ||
        getSalesCreditRefundsFromState(
          true,
          refundAmounts,
          getTaskCreditBalance(sourceBalances, editingTask?.id)?.packs
        ).length > 0;
      return {
        general: Boolean(label.trim() && eventType),
        schedule: true,
        assignee: true,
        equipment: true,
        documents: true,
        credits: !canManageCredits || (addOk && refundOk)
      };
    },
    [
      label,
      eventType,
      canManageCredits,
      editingTask?.id,
      creditEnabled,
      creditAmounts,
      refundEnabled,
      refundAmounts,
      sourceBalances,
      supportCredit?.packs,
      supportCredit?.balance
    ]
  );

  const formSections = useMemo(
    () =>
      taskSections.map(section => ({
        ...section,
        label: modalCopy.sections?.[section.id]?.label || section.id,
        description: modalCopy.sections?.[section.id]?.description || ""
      })),
    [modalCopy, taskSections]
  );

  const selectedAssignees = useMemo(
    () =>
      assigneeIds
        .map(id => userOptions.find(user => user.id === String(id)))
        .filter(Boolean),
    [assigneeIds, userOptions]
  );

  const availableAssigneeOptions = useMemo(
    () => userOptions.filter(user => !assigneeIds.includes(String(user.id))),
    [userOptions, assigneeIds]
  );

  const filteredAssigneeOptions = useMemo(() => {
    const q = assigneeSearch.trim().toLowerCase();
    if (!q) return [];
    return availableAssigneeOptions.filter(user => user.label.toLowerCase().includes(q)).slice(0, 12);
  }, [availableAssigneeOptions, assigneeSearch]);

  const editingTaskCredits = getTaskCreditBalance(sourceBalances, editingTask?.id);

  const footerSummary = useMemo(() => {
    const titlePart = label.trim() || modalCopy.footerUntitled || "—";
    const typePart = typeLabels[eventType] || eventType || copy.eventTypeRequiredShort || "—";
    const assigneePart =
      selectedAssignees.length > 0
        ? selectedAssignees.map(user => user.label).join(", ")
        : copy.assigneeNone;
    const equipment = equipmentOptions.find(eq => eq.id === String(equipmentId));
    const equipmentPart = equipment?.label || copy.equipmentNone || "—";
    const schedulePart = startLocal ? copy.scheduled || "Planifié" : copy.unscheduled || "Sans date";
    return `${titlePart} · ${typePart} · ${assigneePart} · ${equipmentPart} · ${schedulePart}`;
  }, [label, eventType, typeLabels, selectedAssignees, equipmentId, equipmentOptions, startLocal, copy.assigneeNone, copy.equipmentNone, copy.eventTypeRequiredShort, copy.scheduled, copy.unscheduled, modalCopy.footerUntitled]);

  const canSubmit = Boolean(label.trim() && eventType && !saving && !docsBusy);

  const addPendingFiles = fileList => {
    const next = Array.from(fileList || []);
    if (next.length === 0) return;
    const accepted = [];
    for (const file of next) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        toast.error(copy.documentsFileTooLarge || copy.fileTooLarge || "File too large");
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length > 0) {
      setPendingFiles(prev => [...prev, ...accepted]);
    }
  };

  const removePendingFile = index => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const markExistingDocForRemoval = docId => {
    const id = String(docId || "");
    if (!id) return;
    setDocsToRemove(prev => (prev.includes(id) ? prev : [...prev, id]));
    setExistingDocuments(prev => prev.filter(doc => String(doc.id) !== id));
  };

  const syncTaskDocuments = async taskId => {
    if (!taskId) return true;
    setDocsBusy(true);
    try {
      for (const attachmentId of docsToRemove) {
        try {
          await onDeleteDocument?.(taskId, attachmentId);
        } catch (error) {
          toast.error(error.message || copy.documentsDeleteError);
          return false;
        }
      }
      if (pendingFiles.length > 0) {
        try {
          await onUploadDocuments?.(taskId, pendingFiles);
        } catch (error) {
          toast.error(error.message || copy.documentsUploadError);
          return false;
        }
      }
      return true;
    } finally {
      setDocsBusy(false);
    }
  };

  const addAssignee = userId => {
    const id = String(userId || "").trim();
    if (!id || assigneeIds.includes(id)) return;
    setAssigneeIds(prev => [...prev, id]);
    setAssigneeSearch("");
    setShowAssigneeDropdown(false);
    setAssigneeHighlight(0);
  };

  const removeAssignee = userId => {
    const id = String(userId || "").trim();
    setAssigneeIds(prev => prev.filter(entry => entry !== id));
  };

  const handleSubmit = async event => {
    event.preventDefault();
    const trimmed = label.trim();
    const selectedType = String(eventType || "").trim();
    if (!trimmed || saving || docsBusy) return;
    if (!selectedType) {
      setActiveSection("general");
      return;
    }
    const assignees = selectedAssignees.map(user => ({
      id: user.id,
      label: user.label
    }));
    const primary = assignees[0] || null;
    const equipment = equipmentOptions.find(eq => eq.id === String(equipmentId));
    const startAt = startLocal ? fromDatetimeLocalValue(startLocal) : null;
    if (startLocal && !startAt) {
      setActiveSection("schedule");
      return;
    }
    const endAt = startAt && rangeMode ? fromDatetimeLocalValue(endLocal) : null;
    const scheduleEnd = endAt && startAt && new Date(endAt) < new Date(startAt) ? startAt : endAt;

    const taskId = isEditing ? String(editingTask.id) : `task-${Date.now()}`;
    const payload = {
      label: trimmed,
      description: String(description || "").trim() || null,
      eventType: selectedType,
      assignees,
      assigneeId: primary?.id || null,
      assigneeLabel: primary?.label || null,
      equipmentId: equipment?.id || null,
      equipmentLabel: equipment?.label || null,
      startAt,
      endAt: scheduleEnd
    };

    if (isEditing) {
      const ok = await onUpdateTask?.({
        ...editingTask,
        ...payload,
        updatedAt: new Date().toISOString()
      });
      if (ok === false) return;
    } else {
      const ok = await onAddTask?.({
        id: taskId,
        ...payload,
        done: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      if (ok === false) return;
    }

    const docsOk = await syncTaskDocuments(taskId);
    if (!docsOk) return;

    if (canManageCredits) {
      const refunds = getSalesCreditRefundsFromState(
        refundEnabled,
        refundAmounts,
        getTaskCreditBalance(sourceBalances, taskId)?.packs || editingTaskCredits?.packs
      );
      if (refunds.length > 0) {
        const refundOk = await onRefundTaskCredits?.({
          taskId,
          taskLabel: trimmed,
          refunds
        });
        if (refundOk === false) return;
      }
      const debits = getSalesCreditDebitsFromState(creditEnabled, creditAmounts, supportCredit?.packs);
      if (debits.length > 0) {
        const consumeOk = await onConsumeTaskCredits?.({
          taskId,
          taskLabel: trimmed,
          debits
        });
        if (consumeOk === false) return;
      }
    }

    resetForm();
    setOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete?.id || saving) return;
    await onRemoveTask?.(taskToDelete.id);
    setTaskToDelete(null);
  };

  const deleteMessage = taskToDelete?.label
    ? String(copy.removeConfirmMessage || "").replace("{label}", taskToDelete.label)
    : copy.removeConfirmMessageFallback || copy.removeConfirmMessage;

  const renderSectionContent = () => {
    switch (activeSection) {
      case "general":
        return (
          <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{modalCopy.generalTitle || copy.label}</h3>
              <p className={layout.sectionDesc}>{modalCopy.generalDesc || ""}</p>
            </div>
            <div className={layout.fieldStack}>
              <div className={layout.field}>
                <span className={`${layout.label} ${layout.labelRequired}`}>{copy.eventType || planningFormCopy.fields?.eventType}</span>
                <div className={eventStyles.typeGrid} role="group" aria-label={copy.eventType || planningFormCopy.fields?.eventType}>
                  {selectableTypes.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      className={`${eventStyles.typeBtn} ${eventType === type.value ? eventStyles.typeBtnActive : ""}`}
                      onClick={() => setEventType(type.value)}
                      aria-pressed={eventType === type.value}
                      disabled={saving}
                    >
                      <Icon icon={type.icon} className={eventStyles.typeBtnIcon} aria-hidden />
                      <span className={eventStyles.typeBtnLabel}>{type.label}</span>
                    </button>
                  ))}
                </div>
                {!eventType ? <p className={styles.taskPlanningHint}>{copy.eventTypeRequired}</p> : null}
              </div>
              <div className={layout.field}>
                <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="sales-task-title">
                  {copy.label}
                </label>
                <input
                  id="sales-task-title"
                  type="text"
                  className={layout.input}
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder={copy.placeholder}
                  disabled={saving || docsBusy}
                  autoFocus
                />
              </div>
              <div className={layout.field}>
                <label className={layout.label} htmlFor="sales-task-description">
                  {copy.description || "Description"}
                </label>
                <textarea
                  id="sales-task-description"
                  className={layout.input}
                  rows={4}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={copy.descriptionPlaceholder || ""}
                  disabled={saving || docsBusy}
                />
              </div>
            </div>
          </>
        );
      case "schedule":
        return (
          <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{modalCopy.scheduleTitle || copy.start}</h3>
              <p className={layout.sectionDesc}>{modalCopy.scheduleDesc || copy.planningLinkedHint || ""}</p>
            </div>
            <div className={layout.fieldGrid2}>
              <div className={layout.field}>
                <label className={layout.label} htmlFor="sales-task-start">
                  {copy.start}
                </label>
                <input
                  id="sales-task-start"
                  type="datetime-local"
                  className={layout.input}
                  value={startLocal}
                  onChange={e => {
                    const next = e.target.value;
                    setStartLocal(next);
                    if (!next) {
                      setEndLocal("");
                      setRangeMode(false);
                    }
                  }}
                  disabled={saving}
                />
              </div>
              <div className={layout.field}>
                <label className={layout.label} htmlFor="sales-task-end">
                  <span className={styles.taskRangeToggle}>
                    <input
                      type="checkbox"
                      checked={rangeMode}
                      onChange={e => setRangeMode(e.target.checked)}
                      disabled={saving || !startLocal}
                    />
                    {copy.range}
                  </span>
                </label>
                <input
                  id="sales-task-end"
                  type="datetime-local"
                  className={layout.input}
                  value={endLocal}
                  onChange={e => setEndLocal(e.target.value)}
                  disabled={saving || !rangeMode || !startLocal}
                  min={startLocal || undefined}
                />
              </div>
            </div>
            {copy.planningOptionalHint ? <p className={styles.taskPlanningHint}>{copy.planningOptionalHint}</p> : null}
          </>
        );
      case "assignee":
        return (
          <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{modalCopy.assigneeTitle || copy.assignee}</h3>
              <p className={layout.sectionDesc}>{modalCopy.assigneeDesc || ""}</p>
            </div>
            <div className={layout.fieldStack}>
              <div className={`${layout.field} ${layout.fieldFull}`}>
                <label className={layout.label} htmlFor="sales-task-assignee-search">
                  {copy.assignee}
                </label>
                <div className={styles.taskAssigneePicker} ref={assigneePickerRef}>
                  <div className={`${styles.taskAssigneeInputWrap} ${showAssigneeDropdown ? styles.taskAssigneeInputWrapOpen : ""}`}>
                    <Icon icon="mdi:magnify" className={styles.taskAssigneeInputIcon} aria-hidden />
                    <input
                      id="sales-task-assignee-search"
                      type="text"
                      className={styles.taskAssigneeInput}
                      value={assigneeSearch}
                      autoComplete="off"
                      placeholder={copy.searchAssignee || copy.addAssignee || "Rechercher un agent…"}
                      disabled={saving || availableAssigneeOptions.length === 0}
                      aria-expanded={showAssigneeDropdown}
                      aria-haspopup="listbox"
                      onChange={e => {
                        setAssigneeSearch(e.target.value);
                        setShowAssigneeDropdown(true);
                        setAssigneeHighlight(0);
                      }}
                      onFocus={() => setShowAssigneeDropdown(true)}
                      onKeyDown={e => {
                        if (!showAssigneeDropdown || filteredAssigneeOptions.length === 0) {
                          if (e.key === "Escape") setShowAssigneeDropdown(false);
                          return;
                        }
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setAssigneeHighlight(h => Math.min(h + 1, filteredAssigneeOptions.length - 1));
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setAssigneeHighlight(h => Math.max(h - 1, 0));
                        } else if (e.key === "Enter") {
                          e.preventDefault();
                          const picked = filteredAssigneeOptions[assigneeHighlight];
                          if (picked) addAssignee(picked.id);
                        } else if (e.key === "Escape") {
                          setShowAssigneeDropdown(false);
                        }
                      }}
                    />
                  </div>
                  {showAssigneeDropdown ? (
                    <div className={styles.taskAssigneeDropdown} role="listbox">
                      {filteredAssigneeOptions.length === 0 ? (
                        <div className={styles.taskAssigneeEmpty}>
                          {assigneeSearch.trim()
                            ? copy.noAssigneeFound || "Aucun agent trouvé"
                            : copy.searchAssigneeHint || "Tapez pour rechercher un agent…"}
                        </div>
                      ) : (
                        filteredAssigneeOptions.map((user, idx) => (
                          <button
                            key={user.id}
                            type="button"
                            role="option"
                            className={`${styles.taskAssigneeOption} ${assigneeHighlight === idx ? styles.taskAssigneeOptionActive : ""}`}
                            onMouseEnter={() => setAssigneeHighlight(idx)}
                            onClick={() => addAssignee(user.id)}
                          >
                            <span>{user.label}</span>
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
              {selectedAssignees.length > 0 ? (
                <div className={styles.chipList}>
                  {selectedAssignees.map(user => (
                    <span key={user.id} className={styles.chip}>
                      {user.label}
                      <button
                        type="button"
                        className={styles.chipRemove}
                        onClick={() => removeAssignee(user.id)}
                        disabled={saving}
                        aria-label={copy.removeAssignee || copy.remove}
                        title={copy.removeAssignee || copy.remove}
                      >
                        <Icon icon="mdi:close" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className={styles.taskPlanningHint}>{copy.assigneeNone}</p>
              )}
            </div>
          </>
        );
      case "equipment":
        return (
          <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{modalCopy.equipmentTitle || copy.equipment}</h3>
              <p className={layout.sectionDesc}>{modalCopy.equipmentDesc || copy.equipmentHint || ""}</p>
            </div>
            <div className={layout.fieldGrid2}>
              <div className={`${layout.field} ${layout.fieldFull}`}>
                <label className={layout.label} htmlFor="sales-task-equipment">
                  {copy.equipment}
                </label>
                <select
                  id="sales-task-equipment"
                  className={layout.input}
                  value={equipmentId}
                  onChange={e => setEquipmentId(e.target.value)}
                  disabled={saving || equipmentOptions.length === 0}
                >
                  <option value="">{copy.equipmentNone}</option>
                  {equipmentOptions.map(eq => (
                    <option key={eq.id} value={eq.id}>
                      {eq.label}
                    </option>
                  ))}
                </select>
                {equipmentOptions.length === 0 ? (
                  <p className={styles.taskPlanningHint}>{copy.equipmentEmpty || copy.equipmentHint}</p>
                ) : null}
              </div>
            </div>
          </>
        );
      case "documents":
        return (
          <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{modalCopy.documentsTitle || copy.documents}</h3>
              <p className={layout.sectionDesc}>{modalCopy.documentsDesc || copy.documentsHint || ""}</p>
            </div>
            <div className={layout.fieldStack}>
              <div className={styles.taskDocActions}>
                <input
                  ref={documentInputRef}
                  type="file"
                  multiple
                  accept={ATTACHMENT_ACCEPT}
                  className={styles.taskDocInput}
                  onChange={e => {
                    addPendingFiles(e.target.files);
                    e.target.value = "";
                  }}
                  disabled={saving || docsBusy}
                />
                <button
                  type="button"
                  className={styles.tasksAddTrigger}
                  onClick={() => documentInputRef.current?.click()}
                  disabled={saving || docsBusy}
                >
                  <Icon icon="mdi:paperclip" aria-hidden />
                  {copy.documentsAdd}
                </button>
              </div>
              {existingDocuments.length === 0 && pendingFiles.length === 0 ? (
                <p className={styles.taskPlanningHint}>{copy.documentsEmpty}</p>
              ) : (
                <ul className={styles.taskDocList}>
                  {existingDocuments.map(doc => (
                    <li key={doc.id || doc.filePath} className={styles.taskDocItem}>
                      <a
                        href={toAbsoluteUrl(doc.filePath)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.taskDocLink}
                        title={copy.documentsOpen}
                      >
                        <Icon icon="mdi:file-document-outline" aria-hidden />
                        <span>{doc.fileName}</span>
                      </a>
                      <button
                        type="button"
                        className={styles.taskRemove}
                        onClick={() => markExistingDocForRemoval(doc.id)}
                        aria-label={copy.documentsRemove}
                        disabled={saving || docsBusy}
                      >
                        <Icon icon="mdi:delete-outline" />
                      </button>
                    </li>
                  ))}
                  {pendingFiles.map((file, index) => (
                    <li key={`pending-${file.name}-${index}`} className={styles.taskDocItem}>
                      <span className={styles.taskDocPending}>
                        <Icon icon="mdi:upload-outline" aria-hidden />
                        <span>{file.name}</span>
                      </span>
                      <button
                        type="button"
                        className={styles.taskRemove}
                        onClick={() => removePendingFile(index)}
                        aria-label={copy.documentsRemove}
                        disabled={saving || docsBusy}
                      >
                        <Icon icon="mdi:close" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        );
      case "credits":
        return (
          <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{modalCopy.creditsTitle || fieldsCopy.title}</h3>
              <p className={layout.sectionDesc}>{modalCopy.creditsDesc || fieldsCopy.subtitle || ""}</p>
            </div>
            <SalesCreditDebitFields
              copy={{
                ...fieldsCopy,
                alreadyDebited: creditAlreadyLabel || fieldsCopy.alreadyDebited,
                alreadyTask: creditAlreadyLabel || fieldsCopy.alreadyTask
              }}
              supportCredit={supportCredit}
              enabled={creditEnabled}
              onEnabledChange={setCreditEnabled}
              amounts={creditAmounts}
              onAmountsChange={setCreditAmounts}
              disabled={saving || docsBusy}
              alreadyDebited={false}
              currentSource={isEditing ? editingTaskCredits || { total: 0, packs: [] } : null}
              refundEnabled={refundEnabled}
              onRefundEnabledChange={setRefundEnabled}
              refundAmounts={refundAmounts}
              onRefundAmountsChange={setRefundAmounts}
              compact
            />
          </>
        );
      default:
        return null;
    }
  };

  const modal = open
    ? createPortal(
        <div className={layout.overlay} onClick={closeModal} role="presentation">
          <div
            className={`${layout.shell} ${layout.shellMedium}`}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sales-task-form-title"
          >
            <div className={layout.accentBar} aria-hidden />
            <header className={layout.header}>
              <div className={layout.headerMain}>
                <div className={layout.headerIconWrap} aria-hidden>
                  <Icon icon={isEditing ? "mdi:checkbox-marked-outline" : "mdi:checkbox-marked-circle-plus-outline"} />
                </div>
                <div className={layout.headerText}>
                  <p className={layout.eyebrow}>{modalCopy.eyebrow || copy.title}</p>
                  <h2 className={layout.title} id="sales-task-form-title">
                    {isEditing ? copy.edit : copy.add}
                  </h2>
                  <p className={layout.subtitle}>{isEditing ? modalCopy.editSubtitle : modalCopy.createSubtitle}</p>
                </div>
              </div>
              <button type="button" className={layout.closeBtn} onClick={closeModal} disabled={saving} aria-label={copy.cancel}>
                <FaTimes />
              </button>
            </header>

            <form
              className={styles.taskModalForm}
              onSubmit={handleSubmit}
            >
              <div className={layout.body}>
                <nav className={layout.nav} aria-label={modalCopy.sectionsAria || copy.title}>
                  {formSections.map(section => (
                    <button
                      key={section.id}
                      type="button"
                      className={`${layout.navItem} ${activeSection === section.id ? layout.navItemActive : ""}`}
                      onClick={() => setActiveSection(section.id)}
                      aria-current={activeSection === section.id ? "step" : undefined}
                    >
                      <Icon icon={section.icon} className={layout.navItemIcon} aria-hidden />
                      <span className={layout.navItemText}>
                        <span className={layout.navItemLabel}>{section.label}</span>
                        <span className={layout.navItemHint}>{section.description}</span>
                      </span>
                      {sectionMeta[section.id] ? <span className={layout.navBadge}>✓</span> : null}
                    </button>
                  ))}
                </nav>
                <div className={layout.content}>{renderSectionContent()}</div>
              </div>

              <footer className={layout.footer}>
                <span className={layout.footerHint}>{footerSummary}</span>
                <div className={layout.footerActions}>
                  <button type="button" className={layout.ghostBtn} onClick={closeModal} disabled={saving}>
                    {copy.cancel}
                  </button>
                  <button type="submit" className={layout.primaryBtn} disabled={!canSubmit}>
                    {saving ? (
                      <>
                        <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
                        {copy.saving}
                      </>
                    ) : isEditing ? (
                      <>
                        <Icon icon="mdi:content-save-outline" aria-hidden />
                        {copy.save}
                      </>
                    ) : (
                      <>
                        <Icon icon="mdi:check" aria-hidden />
                        {copy.add}
                      </>
                    )}
                  </button>
                </div>
              </footer>
            </form>
          </div>
        </div>,
        document.getElementById("modal-root") || document.body
      )
    : null;

  return (
    <div className={variant === "pane" ? styles.tasksInPane : styles.tasksInChat}>
      <div className={styles.tasksInChatHead}>
        <div className={styles.tasksInChatTitle}>
          <Icon icon="mdi:checkbox-marked-outline" aria-hidden />
          <span>{copy.title}</span>
          <span className={styles.sectionMeta}>
            {tasks.filter(t => t.done).length}/{tasks.length}
            {saving ? ` · ${copy.saving}` : ""}
          </span>
        </div>
        {canManageTasks ? (
          <button type="button" className={styles.tasksAddTrigger} onClick={openCreateModal} disabled={saving}>
            <Icon icon="mdi:plus" aria-hidden />
            {copy.add}
          </button>
        ) : null}
      </div>

      <ul className={styles.taskChatList}>
        {tasks.length === 0 ? <li className={styles.taskChatEmpty}>{copy.empty}</li> : null}
        {tasks.map(task => {
          const schedule = formatTaskSchedule(task, formatDateTime, copy.rangeJoiner);
          const typeLabel = typeLabels[task.eventType] || typeLabels[task.type] || null;
          const creditBalance = getTaskCreditBalance(sourceBalances, task.id);
          const creditDebited = Boolean(creditBalance) || creditDebitedSources?.has?.(`task:${task.id}`);
          const creditedCount = Number(creditBalance?.total) || (creditDebited ? 1 : 0);
          const assigneeList =
            Array.isArray(task.assignees) && task.assignees.length > 0
              ? task.assignees
              : task.assigneeId
                ? [{ id: task.assigneeId, label: task.assigneeLabel }]
                : [];
          const assigneeLabels = assigneeList
            .map(
              entry =>
                (entry.id && userOptions.find(u => u.id === String(entry.id))?.label) ||
                entry.label ||
                entry.id
            )
            .filter(Boolean);
          const avatarLabel = assigneeLabels[0] || task.createdByLabel || copy.unknownAuthor || "?";
          const createdRelative = formatRelativeLabel(task.createdAt, copy);
          const updatedRelative = formatRelativeLabel(task.updatedAt || task.createdAt, copy);
          const docs = Array.isArray(task.documents) ? task.documents : [];
          const equipmentLabel =
            (task.equipmentId && equipmentOptions.find(eq => eq.id === String(task.equipmentId))?.label) ||
            task.equipmentLabel ||
            null;
          return (
            <li key={task.id} className={`${styles.taskGlpiRow} ${task.done ? styles.taskGlpiRowDone : ""}`}>
              <div className={styles.taskGlpiAvatar} aria-hidden title={avatarLabel}>
                {getInitials(avatarLabel)}
              </div>
              <article className={styles.taskGlpiCard}>
                <div className={styles.taskGlpiMetaRow}>
                  {createdRelative ? (
                    <span className={styles.taskGlpiMetaPill}>
                      {copy.createdBy} : <Icon icon="mdi:clock-outline" aria-hidden /> {createdRelative}
                      {task.createdByLabel ? (
                        <>
                          {" "}
                          {copy.byAuthor} <Icon icon="mdi:account-outline" aria-hidden /> {task.createdByLabel}
                        </>
                      ) : null}
                    </span>
                  ) : null}
                  {updatedRelative ? (
                    <span className={styles.taskGlpiMetaPill}>
                      {copy.updatedBy} : <Icon icon="mdi:clock-outline" aria-hidden /> {updatedRelative}
                      {task.updatedByLabel ? (
                        <>
                          {" "}
                          {copy.byAuthor} <Icon icon="mdi:account-outline" aria-hidden /> {task.updatedByLabel}
                        </>
                      ) : null}
                    </span>
                  ) : null}
                </div>

                <div className={styles.taskGlpiBody}>
                  <Icon icon="mdi:wrench-outline" className={styles.taskGlpiWatermark} aria-hidden />
                  {canManageTasks ? (
                    <button
                      type="button"
                      className={styles.taskGlpiTitleBtn}
                      onClick={() => openEditModal(task)}
                      disabled={saving || docsBusy}
                      title={copy.edit}
                    >
                      <span className={styles.taskGlpiTitle}>{task.label}</span>
                    </button>
                  ) : (
                    <span className={styles.taskGlpiTitle}>{task.label}</span>
                  )}
                  {task.description ? <p className={styles.taskGlpiDescription}>{task.description}</p> : null}
                </div>

                <div className={styles.taskGlpiFooter}>
                  {typeLabel ? (
                    <span className={styles.taskGlpiTag}>
                      <Icon icon="mdi:shape-outline" aria-hidden />
                      {typeLabel}
                    </span>
                  ) : null}
                  <span className={styles.taskGlpiTag}>
                    <Icon icon="mdi:account-outline" aria-hidden />
                    {assigneeLabels.length > 0 ? assigneeLabels.join(", ") : copy.assigneeNone}
                  </span>
                  <span
                    className={`${styles.taskGlpiTag} ${!equipmentLabel ? styles.taskGlpiTagMuted : ""}`.trim()}
                    title={copy.equipment}
                  >
                    <Icon icon="mdi:desktop-classic" aria-hidden />
                    {equipmentLabel || copy.equipmentNone}
                  </span>
                  {docs.length > 0 ? (
                    docs.map(doc => (
                      <a
                        key={doc.id || doc.filePath}
                        href={toAbsoluteUrl(doc.filePath)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${styles.taskGlpiTag} ${styles.taskGlpiTagLink}`}
                        title={copy.documentsOpen}
                      >
                        <Icon icon="mdi:paperclip" aria-hidden />
                        {doc.fileName || copy.documents}
                      </a>
                    ))
                  ) : (
                    <span className={`${styles.taskGlpiTag} ${styles.taskGlpiTagMuted}`} title={copy.documents}>
                      <Icon icon="mdi:paperclip" aria-hidden />
                      {copy.documentsEmpty}
                    </span>
                  )}
                  {canManageCredits ? (
                    <span
                      className={`${styles.taskGlpiTag} ${creditDebited ? styles.taskGlpiTagCredit : styles.taskGlpiTagMuted}`.trim()}
                      title={
                        creditDebited
                          ? interpolate(copy.creditsDebitedCount || creditAlreadyLabel || copy.creditsDebited || "{count}", {
                              count: String(creditedCount)
                            })
                          : copy.creditsNotDebited
                      }
                    >
                      <Icon icon="mdi:ticket-percent-outline" aria-hidden />
                      {creditDebited
                        ? interpolate(copy.creditsDebitedCount || creditAlreadyLabel || copy.creditsDebited || "{count}", {
                            count: String(creditedCount)
                          })
                        : copy.creditsNotDebited}
                    </span>
                  ) : null}
                  {schedule ? (
                    <span className={`${styles.taskGlpiTag} ${styles.taskGlpiTagSchedule}`}>
                      <Icon icon="mdi:calendar-clock" aria-hidden />
                      {schedule}
                    </span>
                  ) : null}
                </div>
              </article>

              <div className={styles.taskGlpiSideActions}>
                <button
                  type="button"
                  className={`${styles.taskGlpiDoneBtn} ${task.done ? styles.taskGlpiDoneBtnActive : ""}`}
                  onClick={() => canManageTasks && onToggleTask?.(task.id)}
                  aria-pressed={task.done}
                  title={task.done ? copy.markTodo : copy.markDone}
                  disabled={!canManageTasks || saving || docsBusy}
                >
                  <Icon icon={task.done ? "mdi:check-bold" : "mdi:check"} />
                </button>
                {canManageTasks ? (
                  <>
                    <button
                      type="button"
                      className={styles.taskEdit}
                      onClick={() => openEditModal(task)}
                      aria-label={copy.edit}
                      title={copy.edit}
                      disabled={saving || docsBusy}
                    >
                      <Icon icon="mdi:pencil-outline" />
                    </button>
                    <button
                      type="button"
                      className={styles.taskRemove}
                      onClick={() => setTaskToDelete(task)}
                      aria-label={copy.remove}
                      disabled={saving || docsBusy}
                    >
                      <Icon icon="mdi:delete-outline" />
                    </button>
                  </>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {modal}

      <TicketConfirmModal
        open={Boolean(taskToDelete)}
        title={copy.removeConfirmTitle}
        message={deleteMessage}
        confirmLabel={copy.removeConfirm}
        cancelLabel={copy.cancel}
        variant="danger"
        icon="mdi:delete-outline"
        loading={saving}
        onClose={() => {
          if (!saving) setTaskToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

export { toDatetimeLocalValue, fromDatetimeLocalValue };
