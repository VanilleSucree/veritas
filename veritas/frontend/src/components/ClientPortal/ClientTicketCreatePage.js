import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import { addPortalTicketComment, createPortalTicket, fetchPortalDashboard, fetchPortalTickets } from "../../api/clientPortalTickets";
import { useAuthContext } from "../../contexts/AuthContext";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { interpolate } from "../../i18n/translate";
import SmartTooltip from "../SmartTooltip";
import { serializeEquipmentInfo } from "../TicketPage/ticketEquipmentUtils";
import { filterBySite, getItemSiteValue } from "../../utils/siteFilterUtils";
import { getTicketLinkLabel, getTicketLinkSearchText } from "../TicketPage/ticketLinkUtils";
import portalLayout from "./ClientDashboard.module.css";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import account from "../Misc/AccountPage/AccountPage.module.css";
import s from "../TicketPage/TicketCreatePage.module.css";
import { getClientPortalCopy } from "./clientPortalI18n";
import { filterPortalTicketsBySite, getPortalEquipmentSiteById } from "./portalSiteFilter";
import { buildAvailabilityContactSlots, buildPortalClientEquipments, formatContactSlotLabel, getEquipmentLinkLabel, getEquipmentLinkSearchText, getEquipmentTypeLabel, getTodayDateString, serializeContactSlots } from "./clientPortalTicketCreateUtils";
import pageStyles from "./ClientPortalPages.module.css";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
const TIP_ICONS = ["mdi:text-box-search-outline", "mdi:alert-circle-outline", "mdi:history", "mdi:paperclip"];
const MAX_ATTACHMENT_SIZE_BYTES = 15 * 1024 * 1024;
const MAX_ATTACHMENT_FILES = 10;
const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx", ".csv", ".xls", ".xlsx", ".mp4", ".3gp", ".mp3", ".mpeg", ".ogg", ".aac", ".amr", ".m4a"]);
const ATTACHMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png,.doc,.docx,.csv,.xls,.xlsx,.mp4,.3gp,.mp3,.mpeg,.ogg,.aac,.amr,.m4a";
const RECAP_TYPE_BADGE = {
  incident: s.recapTypeBadge_incident,
  demande: s.recapTypeBadge_demande
};
function validateAttachmentFiles(files = [], copy) {
  const tc = copy.ticket.create;
  const formatsLabel = copy.ATTACHMENT_FORMATS_LABEL;
  for (const file of files) {
    const name = String(file?.name || "");
    const ext = name.includes(".") ? `.${name.split(".").pop().toLowerCase()}` : "";
    if (!ALLOWED_ATTACHMENT_EXTENSIONS.has(ext)) {
      throw new Error(interpolate(tc.invalidFileType, {
        formats: formatsLabel
      }));
    }
    if (Number(file?.size || 0) > MAX_ATTACHMENT_SIZE_BYTES) {
      throw new Error(interpolate(tc.fileTooLarge, {
        name
      }));
    }
  }
}
function mergeAttachmentFiles(currentFiles = [], nextFiles = []) {
  const merged = [...currentFiles];
  const existingKeys = new Set(currentFiles.map(file => `${file.name}-${file.size}-${file.lastModified || 0}`));
  nextFiles.forEach(file => {
    const key = `${file.name}-${file.size}-${file.lastModified || 0}`;
    if (!existingKeys.has(key)) {
      existingKeys.add(key);
      merged.push(file);
    }
  });
  return merged.slice(0, MAX_ATTACHMENT_FILES);
}
function TicketCreateTipsTooltip({
  tips,
  title
}) {
  return <div className={s.tipsTooltip}>
      <p className={s.tipsTooltipTitle}>{title}</p>
      <ul className={s.tipList}>
        {tips.map((text, index) => <li key={TIP_ICONS[index] || index} className={s.tipItem}>
            <Icon icon={TIP_ICONS[index] || "mdi:information-outline"} className={s.tipIcon} aria-hidden />
            <span>{text}</span>
          </li>)}
      </ul>
    </div>;
}
function SectionPanel({
  title,
  description,
  children,
  className,
  headerExtra
}) {
  const allowOverflow = Boolean(className && String(className).includes("panelAllowOverflow"));
  return <section className={`${account.sectionPanel} ${allowOverflow ? account.sectionPanelOverflow : ""} ${className || ""}`.trim()} style={allowOverflow ? {
    overflow: "visible"
  } : undefined}>
      {(title || description || headerExtra) && <header className={`${account.sectionHeader} ${headerExtra ? s.sectionHeaderInline : ""}`.trim()}>
          <div className={s.sectionHeaderMain}>
            {title ? <h2 className={account.sectionTitle}>{title}</h2> : null}
            {description ? <p className={account.sectionDesc}>{description}</p> : null}
          </div>
          {headerExtra}
        </header>}
      <div className={`${account.sectionBody} ${allowOverflow ? s.panelBodyAllowOverflow : ""}`.trim()}>{children}</div>
    </section>;
}
function useFixedAnchorRect(open, anchorRef) {
  const [coords, setCoords] = useState(null);
  const update = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUp = spaceBelow < 140 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(260, Math.max(120, openUp ? spaceAbove : spaceBelow));
    setCoords({
      left: rect.left,
      width: rect.width,
      maxHeight,
      top: openUp ? undefined : rect.bottom - 1,
      bottom: openUp ? window.innerHeight - rect.top + 1 : undefined
    });
  }, []);
  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return undefined;
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, update]);
  return coords;
}
function RecapRow({
  label,
  value,
  muted
}) {
  return <div className={s.recapRow}>
      <span className={s.recapRowLabel}>{label}</span>
      <span className={[s.recapRowValue, muted ? s.recapRowValueMuted : ""].filter(Boolean).join(" ")}>
        {value || "-"}
      </span>
    </div>;
}
function PortalTicketCreateRecap({
  title,
  description,
  type,
  priority,
  requesterLabel,
  clientLabel,
  attachmentsSummary,
  issueNature,
  attemptedActions,
  availabilitySummary,
  equipmentSummary,
  linkedTicketSummary,
  copy,
  ticketTypes,
  priorityOptions
}) {
  const tc = copy.ticket.create;
  const typeMeta = ticketTypes.find(item => item.key === type);
  const priorityMeta = priorityOptions.find(item => item.key === priority);
  return <div className={s.recapBody}>
      <div className={s.recapHero}>
        <div className={s.recapBadges}>
          <span className={`${s.recapBadge} ${RECAP_TYPE_BADGE[type] || ""}`}>
            <Icon icon={typeMeta?.icon || "mdi:ticket-outline"} className={s.recapBadgeIcon} />
            {typeMeta?.label || type}
          </span>
          <span className={`${s.recapBadge} ${s.recapPriorityBadge}`}>
            <Icon icon={priorityMeta?.icon || "mdi:minus"} className={s.recapBadgeIcon} />
            {priorityMeta?.label || priority}
          </span>
        </div>
        <h3 className={s.recapSubject}>{title.trim() || "-"}</h3>
        {description.trim() ? <p className={s.recapDescText}>{description.trim()}</p> : null}
      </div>

      <div className={s.recapTable}>
        <RecapRow label={tc.recapRequester} value={requesterLabel} muted={!requesterLabel} />
        <RecapRow label={tc.recapCompany} value={clientLabel} muted={!clientLabel} />
        <RecapRow label={tc.recapNature} value={copy.getIssueNatureLabel(issueNature) || "-"} muted={!issueNature} />
        {attemptedActions?.trim() ? <RecapRow label={tc.recapAttempted} value={attemptedActions.trim()} /> : null}
        {availabilitySummary && availabilitySummary !== copy.noneFeminine ? <RecapRow label={tc.recapAvailability} value={availabilitySummary} /> : null}
        {equipmentSummary && equipmentSummary !== copy.none ? <RecapRow label={tc.recapEquipment} value={equipmentSummary} /> : null}
        {linkedTicketSummary && linkedTicketSummary !== copy.none ? <RecapRow label={tc.recapLinkedTicket} value={linkedTicketSummary} /> : null}
        {attachmentsSummary && attachmentsSummary !== copy.none ? <RecapRow label={tc.recapDocuments} value={attachmentsSummary} /> : null}
      </div>

      <p className={s.recapAgentNote}>{tc.recapAgentNote}</p>
    </div>;
}
export default function ClientTicketCreatePage() {
  const navigate = useNavigate();
  const {
    user
  } = useAuthContext();
  const locale = useAppLocale();
  const copy = useMemo(() => getClientPortalCopy(locale), [locale]);
  const tc = copy.ticket.create;
  const ticketTypes = useMemo(() => copy.getTicketTypes(), [copy]);
  const priorityOptions = useMemo(() => copy.getPriorityOptions(), [copy]);
  const issueNatureOptions = useMemo(() => copy.getIssueNatureOptions(), [copy]);
  const {
    dashboard: outletDashboard,
    siteFilter
  } = useOutletContext() || {};
  const attachmentInputRef = useRef(null);
  const linkedTicketDropdownRef = useRef(null);
  const linkedTicketListRef = useRef(null);
  const equipmentDropdownRef = useRef(null);
  const equipmentListRef = useRef(null);
  const [portalDashboard, setPortalDashboard] = useState(outletDashboard || null);
  const [portalTickets, setPortalTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [attemptedActions, setAttemptedActions] = useState("");
  const [issueNature, setIssueNature] = useState("unsure");
  const [priority, setPriority] = useState("normal");
  const [type, setType] = useState("incident");
  const [availabilityMode, setAvailabilityMode] = useState("none");
  const [availabilityDate, setAvailabilityDate] = useState(getTodayDateString());
  const [availabilityStart, setAvailabilityStart] = useState("09:00");
  const [availabilityEnd, setAvailabilityEnd] = useState("17:00");
  const [availabilityNote, setAvailabilityNote] = useState("");
  const [equipmentSource, setEquipmentSource] = useState("veritas");
  const [equipmentId, setEquipmentId] = useState("");
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [showEquipmentDropdown, setShowEquipmentDropdown] = useState(false);
  const [equipmentHighlight, setEquipmentHighlight] = useState(0);
  const [equipmentBrand, setEquipmentBrand] = useState("");
  const [equipmentModel, setEquipmentModel] = useState("");
  const [equipmentSerial, setEquipmentSerial] = useState("");
  const [linkedTicketEnabled, setLinkedTicketEnabled] = useState(false);
  const [linkedTicketId, setLinkedTicketId] = useState("");
  const [linkedTicketSearch, setLinkedTicketSearch] = useState("");
  const [showLinkedTicketDropdown, setShowLinkedTicketDropdown] = useState(false);
  const [linkedTicketHighlight, setLinkedTicketHighlight] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [errorPulseTick, setErrorPulseTick] = useState(0);
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [isAttachmentDragOver, setIsAttachmentDragOver] = useState(false);
  const equipmentDropdownCoords = useFixedAnchorRect(showEquipmentDropdown, equipmentDropdownRef);
  const linkedTicketDropdownCoords = useFixedAnchorRect(showLinkedTicketDropdown, linkedTicketDropdownRef);
  const clientId = portalDashboard?.client?.id || null;
  const clientLabel = portalDashboard?.client?.name || "";
  const requesterLabel = user?.username?.trim() || user?.email || "";
  const equipmentConcerned = issueNature === "hardware";
  useEffect(() => {
    if (!outletDashboard) {
      fetchPortalDashboard().then(setPortalDashboard).catch(() => toast.error(tc.loadDashboardError));
    }
  }, [outletDashboard]);
  useEffect(() => {
    setLoadingTickets(true);
    fetchPortalTickets({
      limit: 200
    }).then(rows => setPortalTickets(Array.isArray(rows) ? rows : [])).catch(() => setPortalTickets([])).finally(() => setLoadingTickets(false));
  }, []);
  useEffect(() => {
    const handleClickOutside = event => {
      const linkedAnchor = linkedTicketDropdownRef.current?.contains(event.target);
      const linkedList = linkedTicketListRef.current?.contains(event.target);
      if (!linkedAnchor && !linkedList) setShowLinkedTicketDropdown(false);
      const equipmentAnchor = equipmentDropdownRef.current?.contains(event.target);
      const equipmentList = equipmentListRef.current?.contains(event.target);
      if (!equipmentAnchor && !equipmentList) setShowEquipmentDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const clientEquipments = useMemo(
    () => filterBySite(buildPortalClientEquipments(portalDashboard), siteFilter),
    [portalDashboard, siteFilter]
  );
  const selectedEquipment = useMemo(() => clientEquipments.find(eq => String(eq.id) === String(equipmentId)) || null, [clientEquipments, equipmentId]);
  const availabilitySlots = useMemo(() => buildAvailabilityContactSlots({
    mode: availabilityMode,
    date: availabilityDate,
    startTime: availabilityStart,
    endTime: availabilityEnd,
    note: availabilityNote
  }), [availabilityMode, availabilityDate, availabilityStart, availabilityEnd, availabilityNote]);
  const filteredEquipments = useMemo(() => {
    const query = equipmentSearch.trim().toLowerCase();
    if (!query) return clientEquipments.slice(0, 20);
    return clientEquipments.filter(eq => getEquipmentLinkSearchText(eq).includes(query)).slice(0, 20);
  }, [clientEquipments, equipmentSearch]);
  const filteredLinkableTickets = useMemo(() => {
    const query = linkedTicketSearch.trim().toLowerCase();
    const equipmentSiteById = getPortalEquipmentSiteById(portalDashboard);
    const rows = filterPortalTicketsBySite(
      portalTickets.filter(ticket => String(ticket.status || "").toLowerCase() !== "closed"),
      siteFilter,
      equipmentSiteById
    );
    if (!query) return rows.slice(0, 20);
    return rows.filter(ticket => getTicketLinkSearchText(ticket).includes(query)).slice(0, 20);
  }, [portalTickets, linkedTicketSearch, siteFilter, portalDashboard]);
  const selectedLinkedTicket = useMemo(() => portalTickets.find(ticket => String(ticket.id) === String(linkedTicketId)) || null, [portalTickets, linkedTicketId]);
  const attachmentsSummary = useMemo(() => {
    if (attachmentFiles.length === 0) return copy.none;
    return attachmentFiles.map(file => file.name).join(", ");
  }, [attachmentFiles, copy.none]);
  const availabilitySummary = useMemo(() => {
    if (availabilitySlots.length === 0) return copy.noneFeminine;
    return availabilitySlots.map(slot => formatContactSlotLabel(slot, copy)).join(" · ");
  }, [availabilitySlots, copy]);
  const equipmentSummary = useMemo(() => {
    if (!equipmentConcerned) return copy.none;
    if (equipmentSource === "veritas" && selectedEquipment) {
      return `${selectedEquipment.type} · ${selectedEquipment.name}`;
    }
    if (equipmentSource === "external") {
      return [equipmentBrand, equipmentModel, equipmentSerial].filter(Boolean).join(" / ") || "-";
    }
    return "-";
  }, [equipmentConcerned, equipmentSource, selectedEquipment, equipmentBrand, equipmentModel, equipmentSerial, copy.none]);
  const linkedTicketSummary = useMemo(() => {
    if (!linkedTicketEnabled) return copy.none;
    return selectedLinkedTicket ? getTicketLinkLabel(selectedLinkedTicket) : "-";
  }, [linkedTicketEnabled, selectedLinkedTicket, copy.none]);
  const applySelectedAttachments = useCallback((selectedFiles = []) => {
    if (selectedFiles.length === 0) return;
    validateAttachmentFiles(selectedFiles, copy);
    setAttachmentFiles(prev => {
      const merged = mergeAttachmentFiles(prev, selectedFiles);
      if (merged.length >= MAX_ATTACHMENT_FILES && prev.length + selectedFiles.length > MAX_ATTACHMENT_FILES) {
        toast.warning(interpolate(tc.maxFilesWarning, {
          max: String(MAX_ATTACHMENT_FILES)
        }));
      }
      return merged;
    });
    setFieldErrors(prev => ({
      ...prev,
      attachments: undefined
    }));
  }, [copy, tc.maxFilesWarning]);
  const removeAttachmentFile = useCallback(fileKey => {
    setAttachmentFiles(prev => prev.filter(file => `${file.name}-${file.size}-${file.lastModified || 0}` !== fileKey));
  }, []);
  const hasFileDrag = useCallback(event => {
    const types = Array.from(event.dataTransfer?.types || []);
    return types.includes("Files");
  }, []);
  const resetPageDragState = useCallback(() => setIsAttachmentDragOver(false), []);
  const handlePageDragEnter = useCallback(event => {
    if (!hasFileDrag(event)) return;
    event.preventDefault();
    setIsAttachmentDragOver(true);
  }, [hasFileDrag]);
  const handlePageDragLeave = useCallback(event => {
    if (!hasFileDrag(event)) return;
    event.preventDefault();
    if (event.currentTarget.contains(event.relatedTarget)) return;
    resetPageDragState();
  }, [hasFileDrag, resetPageDragState]);
  const handlePageDragOver = useCallback(event => {
    if (!hasFileDrag(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, [hasFileDrag]);
  const handlePageDrop = useCallback(event => {
    if (!hasFileDrag(event)) return;
    event.preventDefault();
    resetPageDragState();
    const droppedFiles = Array.from(event.dataTransfer?.files || []);
    if (droppedFiles.length === 0) return;
    try {
      applySelectedAttachments(droppedFiles);
    } catch (error) {
      toast.error(error.message || tc.invalidAttachment);
    }
  }, [applySelectedAttachments, hasFileDrag, resetPageDragState]);
  useEffect(() => {
    window.addEventListener("dragend", resetPageDragState);
    return () => window.removeEventListener("dragend", resetPageDragState);
  }, [resetPageDragState]);
  const handleAvailabilityModeChange = mode => {
    setAvailabilityMode(mode);
    setFieldErrors(prev => ({
      ...prev,
      contactSlots: undefined
    }));
  };
  const handleIssueNatureChange = nextNature => {
    setIssueNature(nextNature);
    if (nextNature !== "hardware") {
      setEquipmentId("");
      setEquipmentSearch("");
      setShowEquipmentDropdown(false);
      setEquipmentBrand("");
      setEquipmentModel("");
      setEquipmentSerial("");
      setFieldErrors(prev => ({
        ...prev,
        equipmentId: undefined,
        equipmentBrand: undefined,
        equipmentModel: undefined,
        equipmentSerial: undefined
      }));
    }
  };
  const handleLinkedTicketEnabledChange = enabled => {
    setLinkedTicketEnabled(enabled);
    if (!enabled) {
      setLinkedTicketId("");
      setLinkedTicketSearch("");
      setFieldErrors(prev => ({
        ...prev,
        linkedTicketId: undefined
      }));
    }
  };
  const selectEquipment = equipment => {
    setEquipmentId(String(equipment.id));
    setEquipmentSearch(getEquipmentLinkLabel(equipment, copy));
    setShowEquipmentDropdown(false);
    setFieldErrors(prev => ({
      ...prev,
      equipmentId: undefined
    }));
  };
  const selectLinkedTicket = ticket => {
    setLinkedTicketId(String(ticket.id));
    setLinkedTicketSearch(getTicketLinkLabel(ticket));
    setShowLinkedTicketDropdown(false);
    setFieldErrors(prev => ({
      ...prev,
      linkedTicketId: undefined
    }));
  };
  const validate = () => {
    const errors = {};
    if (title.trim().length < 3) errors.title = true;
    if (description.trim().length < 10) errors.description = true;
    if (availabilityMode === "from") {
      if (!availabilityDate || !availabilityStart) errors.contactSlots = true;
    } else if (availabilityMode === "range") {
      if (!availabilityDate || !availabilityStart || !availabilityEnd) errors.contactSlots = true;else if (availabilityStart >= availabilityEnd) errors.contactSlots = true;
    }
    if (equipmentConcerned) {
      if (equipmentSource === "veritas") {
        if (!equipmentId) errors.equipmentId = true;
      } else {
        if (!equipmentBrand.trim()) errors.equipmentBrand = true;
        if (!equipmentModel.trim()) errors.equipmentModel = true;
        if (!equipmentSerial.trim()) errors.equipmentSerial = true;
      }
    }
    if (linkedTicketEnabled && !linkedTicketId) errors.linkedTicketId = true;
    try {
      validateAttachmentFiles(attachmentFiles, copy);
    } catch {
      errors.attachments = true;
    }
    return errors;
  };
  const scrollToFirstFieldError = useCallback(() => {
    requestAnimationFrame(() => {
      const errorClassNames = [s.fieldShellError, s.attachmentDropZoneError, s.availabilitySlotBarError, s.inputError, s.contactInputWrapError].filter(Boolean);
      const selector = errorClassNames.map(cls => `.${CSS.escape(cls)}`).join(", ");
      document.querySelector(selector)?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    });
  }, []);
  const handleOpenConfirm = () => {
    try {
      setFormError("");
      const errors = validate();
      setFieldErrors(errors);
      if (Object.keys(errors).length > 0) {
        setErrorPulseTick(tick => tick + 1);
        scrollToFirstFieldError();
        return;
      }
      setConfirmModalOpen(true);
    } catch (err) {
      toast.error(err?.message || tc.openRecapError);
    }
  };
  const handleCloseConfirm = () => {
    if (submitting) return;
    setConfirmModalOpen(false);
  };
  const handleConfirmCreate = async () => {
    setFormError("");
    setSubmitting(true);
    try {
      const ticketSite = getItemSiteValue(selectedEquipment) || siteFilter || "";
      const equipmentInfo = serializeEquipmentInfo({
        concerned: equipmentConcerned,
        source: equipmentSource,
        equipmentId,
        name: selectedEquipment?.name,
        type: selectedEquipment?.type,
        clientId,
        brand: equipmentBrand,
        model: equipmentModel,
        serial: equipmentSerial,
        site: ticketSite
      });
      const ticket = await createPortalTicket({
        title: title.trim(),
        description: description.trim(),
        priority,
        type,
        attemptedActions: attemptedActions.trim(),
        issueNature,
        contactSlots: serializeContactSlots(availabilitySlots),
        equipmentInfo,
        linkedTicketId: linkedTicketEnabled ? linkedTicketId : null
      });
      if (attachmentFiles.length > 0) {
        try {
          await addPortalTicketComment(ticket.id, {
            content: "",
            files: attachmentFiles
          });
        } catch (error) {
          toast.warning(error.message || tc.attachmentsFailed);
        }
      }
      toast.success(tc.createdSuccess);
      navigate(`/client/tickets/${ticket.id}`);
    } catch (error) {
      setFormError(error.message || tc.createError);
    } finally {
      setSubmitting(false);
    }
  };
  const dropHint = interpolate(tc.dropHint, {
    formats: copy.ATTACHMENT_FORMATS_LABEL,
    max: String(MAX_ATTACHMENT_FILES)
  });
  const availabilityModeOptions = useMemo(() => [{
    key: "none",
    label: tc.availabilityNone,
    icon: "mdi:calendar-remove-outline"
  }, {
    key: "from",
    label: tc.availabilityFrom,
    icon: "mdi:clock-time-four-outline"
  }, {
    key: "range",
    label: tc.availabilityRange,
    icon: "mdi:calendar-clock-outline"
  }], [tc.availabilityNone, tc.availabilityFrom, tc.availabilityRange]);
  return <div className={`${portalLayout.mainScrollFill} ${portalLayout.portalPage}`} onDragEnter={handlePageDragEnter} onDragLeave={handlePageDragLeave} onDragOver={handlePageDragOver} onDrop={handlePageDrop}>
      {isAttachmentDragOver ? <div className={s.pageDropOverlay} aria-hidden>
          <Icon icon="mdi:upload-outline" className={s.pageDropOverlayIcon} />
          <p className={s.pageDropOverlayTitle}>{tc.dropTitle}</p>
          <p className={s.pageDropOverlayHint}>{dropHint}</p>
        </div> : null}

      <div className={portalLayout.portalShell}>
        <MspPageHero
          className={pageStyles.portalPageHero}
          eyebrow={tc.eyebrow}
          title={tc.pageTitle}
          subtitle={tc.pageSubtitle}
          icon="mingcute:ticket-fill"
          actions={
            <>
              <Link to="/client/tickets" className={s.btnSecondary}>
                <Icon icon="mdi:arrow-left" aria-hidden />
                {copy.common.back}
              </Link>
              <button type="button" className={layout.primaryBtn} onClick={handleOpenConfirm} disabled={submitting}>
                <Icon icon="mdi:check" aria-hidden />
                {submitting ? tc.creating : tc.createBtn}
              </button>
            </>
          }
        />

        <div className={s.typeKpiRow}>
          {ticketTypes.map(item => <button key={item.key} type="button" className={`${layout.kpiCard} ${type === item.key ? layout.kpiCardActive : ""}`.trim()} onClick={() => setType(item.key)} aria-pressed={type === item.key}>
              <div className={`${layout.kpiIconWrap} ${layout.kpiIcon_blue}`}>
                <Icon icon={item.icon} aria-hidden />
              </div>
              <div className={layout.kpiBody}>
                <span className={layout.kpiValue}>{item.label}</span>
                <span className={layout.kpiLabel}>{item.hint}</span>
              </div>
            </button>)}
        </div>

        <div className={account.contentScroll}>
          <div className={account.contentGridWide}>
            <div className={s.formStack}>
              <SectionPanel title={tc.detailsTitle} headerExtra={<SmartTooltip content={<TicketCreateTipsTooltip tips={tc.tips} title={tc.tipsTitle} />} tooltipClassName={s.tipsPortalTooltip} trigger="click" as="button" type="button" className={s.tipsHelpBtn} aria-label={tc.tipsAria}>
                    <Icon icon="mdi:lightbulb-outline" aria-hidden />
                  </SmartTooltip>}>
                <div className={s.fieldBlock}>
                  <label className={s.fieldLabel} htmlFor="portal-ticket-title">
                    {tc.subject}<span className={s.requiredMark}>*</span>
                  </label>
                  <div data-pulse={fieldErrors.title ? errorPulseTick : undefined} className={`${s.fieldShell} ${fieldErrors.title ? s.fieldShellError : ""} ${fieldErrors.title ? s.fieldErrorPulse : ""}`.trim()}>
                    <input id="portal-ticket-title" type="text" className={s.fieldShellControl} value={title} onChange={e => {
                    setTitle(e.target.value);
                    setFieldErrors(prev => ({
                      ...prev,
                      title: undefined
                    }));
                  }} placeholder={tc.titlePlaceholders[type]} maxLength={200} />
                  </div>
                  <span className={s.charCount}>{title.length}/200</span>
                </div>

                <div className={s.fieldBlock}>
                  <label className={s.fieldLabel} htmlFor="portal-ticket-description">
                    {tc.description}<span className={s.requiredMark}>*</span>
                  </label>
                  <div data-pulse={fieldErrors.description ? errorPulseTick : undefined} className={`${s.fieldShell} ${s.fieldShellMultiline} ${fieldErrors.description ? s.fieldShellError : ""} ${fieldErrors.description ? s.fieldErrorPulse : ""}`.trim()}>
                    <textarea id="portal-ticket-description" className={`${s.fieldShellControl} ${s.fieldShellTextarea}`} value={description} onChange={e => {
                    setDescription(e.target.value);
                    setFieldErrors(prev => ({
                      ...prev,
                      description: undefined
                    }));
                  }} placeholder={tc.descriptionPlaceholders[type]} rows={6} maxLength={5000} />
                  </div>
                  <span className={s.charCount}>{description.length}/5000</span>
                </div>

                <div className={s.fieldBlock}>
                  <label className={s.fieldLabel} htmlFor="portal-ticket-attempted">
                    {tc.attemptedActions}
                  </label>
                  <div className={`${s.fieldShell} ${s.fieldShellMultiline}`}>
                    <textarea id="portal-ticket-attempted" className={`${s.fieldShellControl} ${s.fieldShellTextarea}`} value={attemptedActions} onChange={e => setAttemptedActions(e.target.value)} placeholder={tc.attemptedPlaceholder} rows={4} maxLength={3000} />
                  </div>
                </div>

                <div className={s.fieldBlock}>
                  <span className={s.fieldLabel}>{tc.issueNature}</span>
                  <div className={s.segmentedGroup} role="radiogroup" aria-label={tc.issueNature}>
                    {issueNatureOptions.map(item => <button key={item.key} type="button" role="radio" aria-checked={issueNature === item.key} className={`${s.segmentedBtn} ${issueNature === item.key ? s.segmentedBtnActive : ""}`.trim()} onClick={() => handleIssueNatureChange(item.key)}>
                        <Icon icon={item.icon} aria-hidden />
                        {item.label}
                      </button>)}
                  </div>
                </div>

                <div className={s.fieldBlock}>
                  <label className={s.fieldLabel} id="portal-ticket-attachments-label">
                    {tc.documents}
                  </label>
                  <div data-pulse={fieldErrors.attachments ? errorPulseTick : undefined} className={`${s.attachmentDropZone} ${isAttachmentDragOver ? s.attachmentDropZoneActive : ""} ${fieldErrors.attachments ? s.attachmentDropZoneError : ""} ${fieldErrors.attachments ? s.fieldErrorPulse : ""}`.trim()}>
                    <Icon icon="mdi:paperclip" className={s.attachmentDropIcon} aria-hidden />
                    <p className={s.attachmentDropTitle}>{tc.dropFilesTitle}</p>
                    <p className={s.attachmentDropHint}>{dropHint}</p>
                    <label className={s.attachmentUploadBtn}>
                      <Icon icon="mdi:upload-outline" aria-hidden />
                      {tc.addFiles}
                      <input ref={attachmentInputRef} type="file" multiple accept={ATTACHMENT_ACCEPT} aria-labelledby="portal-ticket-attachments-label" onChange={e => {
                      const selectedFiles = Array.from(e.target.files || []);
                      try {
                        applySelectedAttachments(selectedFiles);
                      } catch (error) {
                        toast.error(error.message || tc.invalidAttachment);
                      } finally {
                        e.target.value = "";
                      }
                    }} disabled={attachmentFiles.length >= MAX_ATTACHMENT_FILES} />
                    </label>
                  </div>
                  {attachmentFiles.length > 0 ? <ul className={s.attachmentFileList}>
                      {attachmentFiles.map(file => {
                    const fileKey = `${file.name}-${file.size}-${file.lastModified || 0}`;
                    return <li key={fileKey} className={s.attachmentFileItem}>
                            <Icon icon="mdi:file-document-outline" className={s.attachmentFileIcon} aria-hidden />
                            <span className={s.attachmentFileName} title={file.name}>{file.name}</span>
                            <span className={s.attachmentFileSize}>{copy.formatSize(file.size)}</span>
                            <button type="button" className={s.attachmentFileRemove} onClick={() => removeAttachmentFile(fileKey)} aria-label={copy.formatRemoveAttachmentAria(file.name)}>
                              <Icon icon="mdi:close" aria-hidden />
                            </button>
                          </li>;
                  })}
                    </ul> : null}
                </div>
              </SectionPanel>

              <SectionPanel title={tc.availabilityTitle}>
                <div className={s.demandeurBlock}>
                  <p className={s.detailsAvailabilityTitle}>{tc.contactSlotTitle}</p>
                  <div className={s.availabilityComposer}>
                    <div className={s.availabilityModeChips} role="radiogroup" aria-label={tc.availabilityAria}>
                      {availabilityModeOptions.map(item => <button key={item.key} type="button" role="radio" aria-checked={availabilityMode === item.key} className={`${s.availabilityModeChip} ${availabilityMode === item.key ? s.availabilityModeChipActive : ""}`.trim()} onClick={() => handleAvailabilityModeChange(item.key)}>
                          <Icon icon={item.icon} aria-hidden />
                          {item.label}
                        </button>)}
                    </div>

                    {availabilityMode !== "none" ? <div data-pulse={fieldErrors.contactSlots ? errorPulseTick : undefined} className={`${s.availabilitySlotBar} ${fieldErrors.contactSlots ? s.availabilitySlotBarError : ""} ${fieldErrors.contactSlots ? s.fieldErrorPulse : ""}`.trim()}>
                        <label className={s.slotField}>
                          <Icon icon="mdi:calendar-outline" className={s.slotFieldIcon} aria-hidden />
                          <input type="date" className={s.slotInput} value={availabilityDate} onChange={e => {
                        setAvailabilityDate(e.target.value);
                        setFieldErrors(prev => ({
                          ...prev,
                          contactSlots: undefined
                        }));
                      }} aria-label={tc.dateAria} />
                        </label>
                        {availabilityMode === "from" ? <label className={s.slotField}>
                            <Icon icon="mdi:clock-outline" className={s.slotFieldIcon} aria-hidden />
                            <input type="time" className={s.slotInput} value={availabilityStart} onChange={e => {
                        setAvailabilityStart(e.target.value);
                        setFieldErrors(prev => ({
                          ...prev,
                          contactSlots: undefined
                        }));
                      }} aria-label={tc.timeAria} />
                          </label> : <div className={`${s.slotField} ${s.slotFieldTimeRange}`} role="group" aria-label={tc.timeRangeAria}>
                            <Icon icon="mdi:clock-outline" className={s.slotFieldIcon} aria-hidden />
                            <input type="time" className={s.slotInput} value={availabilityStart} onChange={e => {
                        setAvailabilityStart(e.target.value);
                        setFieldErrors(prev => ({
                          ...prev,
                          contactSlots: undefined
                        }));
                      }} aria-label={tc.startTimeAria} />
                            <span className={s.slotSep} aria-hidden>→</span>
                            <input type="time" className={s.slotInput} value={availabilityEnd} onChange={e => {
                        setAvailabilityEnd(e.target.value);
                        setFieldErrors(prev => ({
                          ...prev,
                          contactSlots: undefined
                        }));
                      }} aria-label={tc.endTimeAria} />
                          </div>}
                        <label className={`${s.slotField} ${s.slotFieldNote}`}>
                          <Icon icon="mdi:note-text-outline" className={s.slotFieldIcon} aria-hidden />
                          <input type="text" className={s.slotInput} value={availabilityNote} placeholder={tc.notePlaceholder} onChange={e => {
                        setAvailabilityNote(e.target.value);
                        setFieldErrors(prev => ({
                          ...prev,
                          contactSlots: undefined
                        }));
                      }} />
                        </label>
                      </div> : null}
                  </div>
                </div>
              </SectionPanel>

              {equipmentConcerned ? <SectionPanel title={tc.equipmentTitle} className={s.panelAllowOverflow}>
                  <div className={s.equipmentPanel}>
                    <div className={s.segmentedGroup} role="radiogroup" aria-label={tc.equipmentSourceAria}>
                      <button type="button" role="radio" aria-checked={equipmentSource === "veritas"} className={`${s.segmentedBtn} ${equipmentSource === "veritas" ? s.segmentedBtnActive : ""}`.trim()} onClick={() => {
                    setEquipmentSource("veritas");
                    setEquipmentBrand("");
                    setEquipmentModel("");
                    setEquipmentSerial("");
                  }}>
                        <Icon icon="mdi:database-check-outline" aria-hidden />
                        {tc.companyFleet}
                      </button>
                      <button type="button" role="radio" aria-checked={equipmentSource === "external"} className={`${s.segmentedBtn} ${equipmentSource === "external" ? s.segmentedBtnActive : ""}`.trim()} onClick={() => {
                    setEquipmentSource("external");
                    setEquipmentId("");
                    setEquipmentSearch("");
                    setShowEquipmentDropdown(false);
                  }}>
                        <Icon icon="mdi:package-variant-closed" aria-hidden />
                        {tc.externalEquipment}
                      </button>
                    </div>

                    <div className={s.equipmentSubPanel}>
                      {equipmentSource === "veritas" ? clientEquipments.length === 0 ? <p className={s.equipmentHint}>{tc.noEquipmentHint}</p> : <>
                            <div className={s.equipmentField}>
                              <label className={s.equipmentFieldLabel} htmlFor="portal-equipment-search">
                                {tc.equipmentLabel}<span className={s.requiredMark}>*</span>
                              </label>
                              <div className={s.linkTicketPicker} ref={equipmentDropdownRef}>
                                <div data-pulse={fieldErrors.equipmentId ? errorPulseTick : undefined} className={`${s.contactInputWrap} ${showEquipmentDropdown ? s.contactInputWrapOpen : ""} ${fieldErrors.equipmentId ? s.contactInputWrapError : ""} ${fieldErrors.equipmentId ? s.fieldErrorPulse : ""}`.trim()}>
                                  <Icon icon="mdi:magnify" className={s.contactInputIcon} aria-hidden />
                                  <input id="portal-equipment-search" className={s.contactInput} type="text" value={equipmentSearch} onChange={e => {
                            setEquipmentSearch(e.target.value);
                            setEquipmentId("");
                            setShowEquipmentDropdown(true);
                            setEquipmentHighlight(0);
                            setFieldErrors(prev => ({
                              ...prev,
                              equipmentId: undefined
                            }));
                          }} onFocus={() => setShowEquipmentDropdown(true)} placeholder={tc.equipmentSearchPlaceholder} aria-expanded={showEquipmentDropdown} aria-haspopup="listbox" />
                                </div>
                                {showEquipmentDropdown && equipmentDropdownCoords && typeof document !== "undefined" ? createPortal(<div ref={equipmentListRef} className={s.contactDropdownPortal} role="listbox" aria-label={tc.equipmentLabel} style={{
                              top: equipmentDropdownCoords.top,
                              bottom: equipmentDropdownCoords.bottom,
                              left: equipmentDropdownCoords.left,
                              width: equipmentDropdownCoords.width,
                              maxHeight: equipmentDropdownCoords.maxHeight
                            }}>
                                    {filteredEquipments.length === 0 ? <div className={s.contactEmpty}>{tc.noEquipmentFound}</div> : filteredEquipments.map((eq, idx) => <button key={eq.id} type="button" role="option" aria-selected={idx === equipmentHighlight} className={`${s.contactOption} ${idx === equipmentHighlight ? s.contactOptionActive : ""}`.trim()} onMouseEnter={() => setEquipmentHighlight(idx)} onClick={() => selectEquipment(eq)}>
                                          <span className={s.contactOptionName}>{getEquipmentLinkLabel(eq, copy)}</span>
                                          {eq.serial ? <span className={s.contactOptionMeta}>
                                              {copy.ticket.create.serialPrefix}: {eq.serial}
                                            </span> : <span className={s.contactOptionMeta}>
                                              {getEquipmentTypeLabel(eq.type, copy)}
                                            </span>}
                                        </button>)}
                                  </div>, document.body) : null}
                              </div>
                            </div>

                            {selectedEquipment ? <div className={s.linkTicketCard}>
                                <div className={s.linkTicketCardIcon} aria-hidden>
                                  <Icon icon="mdi:devices" />
                                </div>
                                <div className={s.linkTicketCardBody}>
                                  <p className={s.linkTicketCardNumber}>
                                    {getEquipmentTypeLabel(selectedEquipment.type, copy)}
                                  </p>
                                  <p className={s.linkTicketCardTitle}>{selectedEquipment.name}</p>
                                  {selectedEquipment.serial ? <p className={s.linkTicketCardMeta}>
                                      {copy.ticket.create.serialPrefix}: {selectedEquipment.serial}
                                    </p> : null}
                                </div>
                              </div> : null}
                          </> : <div className={s.equipmentExternalGrid}>
                          <div className={s.equipmentField}>
                            <label className={s.equipmentFieldLabel}>
                              {tc.brand}<span className={s.requiredMark}>*</span>
                            </label>
                            <input type="text" className={`${s.input} ${fieldErrors.equipmentBrand ? s.inputError : ""}`.trim()} value={equipmentBrand} placeholder={tc.brandPlaceholder} onChange={e => {
                        setEquipmentBrand(e.target.value);
                        setFieldErrors(prev => ({
                          ...prev,
                          equipmentBrand: undefined
                        }));
                      }} />
                          </div>
                          <div className={s.equipmentField}>
                            <label className={s.equipmentFieldLabel}>
                              {tc.model}<span className={s.requiredMark}>*</span>
                            </label>
                            <input type="text" className={`${s.input} ${fieldErrors.equipmentModel ? s.inputError : ""}`.trim()} value={equipmentModel} placeholder={tc.modelPlaceholder} onChange={e => {
                        setEquipmentModel(e.target.value);
                        setFieldErrors(prev => ({
                          ...prev,
                          equipmentModel: undefined
                        }));
                      }} />
                          </div>
                          <div className={`${s.equipmentField} ${s.equipmentExternalFull}`}>
                            <label className={s.equipmentFieldLabel}>
                              {tc.serial}<span className={s.requiredMark}>*</span>
                            </label>
                            <input type="text" className={`${s.input} ${fieldErrors.equipmentSerial ? s.inputError : ""}`.trim()} value={equipmentSerial} placeholder={tc.serialPlaceholder} onChange={e => {
                        setEquipmentSerial(e.target.value);
                        setFieldErrors(prev => ({
                          ...prev,
                          equipmentSerial: undefined
                        }));
                      }} />
                          </div>
                        </div>}
                    </div>
                  </div>
                </SectionPanel> : null}

              <SectionPanel title={tc.linkTitle} className={s.panelAllowOverflow}>
                <div className={s.linkTicketPanel}>
                  <div className={s.segmentedGroup} role="radiogroup" aria-label={tc.linkAria}>
                    <button type="button" role="radio" aria-checked={!linkedTicketEnabled} className={`${s.segmentedBtn} ${!linkedTicketEnabled ? s.segmentedBtnActive : ""}`.trim()} onClick={() => handleLinkedTicketEnabledChange(false)}>
                      <Icon icon="mdi:link-off" aria-hidden />
                      {tc.noLink}
                    </button>
                    <button type="button" role="radio" aria-checked={linkedTicketEnabled} className={`${s.segmentedBtn} ${linkedTicketEnabled ? s.segmentedBtnActive : ""}`.trim()} onClick={() => handleLinkedTicketEnabledChange(true)}>
                      <Icon icon="mdi:link-variant" aria-hidden />
                      {tc.existingTicket}
                    </button>
                  </div>

                  {linkedTicketEnabled ? <div className={s.linkTicketSubPanel}>
                      {loadingTickets ? <p className={s.equipmentHint}>{tc.loadingTickets}</p> : portalTickets.length === 0 ? <p className={s.equipmentHint}>{tc.noLinkableTickets}</p> : <>
                          <div className={s.equipmentField}>
                            <label className={s.equipmentFieldLabel} htmlFor="portal-linked-ticket">
                              {tc.ticketToLink}<span className={s.requiredMark}>*</span>
                            </label>
                            <div className={s.linkTicketPicker} ref={linkedTicketDropdownRef}>
                              <div data-pulse={fieldErrors.linkedTicketId ? errorPulseTick : undefined} className={`${s.contactInputWrap} ${showLinkedTicketDropdown ? s.contactInputWrapOpen : ""} ${fieldErrors.linkedTicketId ? s.contactInputWrapError : ""} ${fieldErrors.linkedTicketId ? s.fieldErrorPulse : ""}`.trim()}>
                                <Icon icon="mdi:magnify" className={s.contactInputIcon} aria-hidden />
                                <input id="portal-linked-ticket" className={s.contactInput} type="text" value={linkedTicketSearch} onChange={e => {
                            setLinkedTicketSearch(e.target.value);
                            setLinkedTicketId("");
                            setShowLinkedTicketDropdown(true);
                            setLinkedTicketHighlight(0);
                            setFieldErrors(prev => ({
                              ...prev,
                              linkedTicketId: undefined
                            }));
                          }} onFocus={() => setShowLinkedTicketDropdown(true)} placeholder={tc.ticketSearchPlaceholder} aria-expanded={showLinkedTicketDropdown} aria-haspopup="listbox" />
                              </div>
                              {showLinkedTicketDropdown && linkedTicketDropdownCoords && typeof document !== "undefined" ? createPortal(<div ref={linkedTicketListRef} className={s.contactDropdownPortal} role="listbox" style={{
                            top: linkedTicketDropdownCoords.top,
                            bottom: linkedTicketDropdownCoords.bottom,
                            left: linkedTicketDropdownCoords.left,
                            width: linkedTicketDropdownCoords.width,
                            maxHeight: linkedTicketDropdownCoords.maxHeight
                          }}>
                                  {filteredLinkableTickets.length === 0 ? <div className={s.contactEmpty}>{tc.noTicketFound}</div> : filteredLinkableTickets.map((ticket, idx) => <button key={ticket.id} type="button" role="option" aria-selected={idx === linkedTicketHighlight} className={`${s.contactOption} ${idx === linkedTicketHighlight ? s.contactOptionActive : ""}`.trim()} onMouseEnter={() => setLinkedTicketHighlight(idx)} onClick={() => selectLinkedTicket(ticket)}>
                                        <span className={s.contactOptionName}>{getTicketLinkLabel(ticket)}</span>
                                        <span className={s.contactOptionMeta}>
                                          {copy.getTicketStatus(ticket.status) || ticket.status || "-"}
                                          {ticket.type ? ` · ${copy.getTicketTypeLabel(ticket.type)}` : ""}
                                        </span>
                                      </button>)}
                                </div>, document.body) : null}
                            </div>
                          </div>

                          {selectedLinkedTicket ? <div className={s.linkTicketCard}>
                              <div className={s.linkTicketCardIcon} aria-hidden>
                                <Icon icon="mdi:ticket-confirmation-outline" />
                              </div>
                              <div className={s.linkTicketCardBody}>
                                <p className={s.linkTicketCardNumber}>
                                  #{selectedLinkedTicket.ticket_number || selectedLinkedTicket.id}
                                </p>
                                <p className={s.linkTicketCardTitle}>
                                  {selectedLinkedTicket.title || copy.common.noTitle}
                                </p>
                              </div>
                            </div> : null}
                        </>}
                    </div> : null}
                </div>
              </SectionPanel>

              {formError && !confirmModalOpen ? <div className={s.errorBox} role="alert">
                  <Icon icon="mdi:alert-circle-outline" className={s.errorIcon} aria-hidden />
                  <span>{formError}</span>
                </div> : null}
            </div>

            <aside className={`${s.formStack} ${s.sideColumn}`}>
              <SectionPanel title={tc.contractTitle}>
                <dl className={s.contractFacts}>
                  <div className={s.contractFactRow}>
                    <dt className={s.contractFactLabel}>
                      <Icon icon="mdi:domain" className={s.contractFactIcon} aria-hidden />
                      {tc.company}
                    </dt>
                    <dd className={clientLabel ? s.contractFactCompany : s.contractFactEmpty}>{clientLabel || "-"}</dd>
                  </div>
                  <div className={s.contractFactRow}>
                    <dt className={s.contractFactLabel}>
                      <Icon icon="mdi:account-outline" className={s.contractFactIcon} aria-hidden />
                      {tc.requester}
                    </dt>
                    <dd className={requesterLabel ? "" : s.contractFactEmpty}>{requesterLabel || "-"}</dd>
                  </div>
                </dl>
              </SectionPanel>

              <SectionPanel title={tc.settingsTitle} className={s.panelAllowOverflow}>
                <div className={s.settingsPanel}>
                  <div className={s.settingsFieldRow}>
                    <div className={s.equipmentField}>
                      <label className={s.equipmentFieldLabel} htmlFor="portal-ticket-priority">
                        {tc.priority}<span className={s.requiredMark}>*</span>
                      </label>
                      <select id="portal-ticket-priority" className={s.select} value={priority} onChange={e => setPriority(e.target.value)}>
                        {priorityOptions.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </SectionPanel>
            </aside>
          </div>
        </div>
      </div>

      {confirmModalOpen && createPortal(<div className={s.confirmOverlay} onClick={handleCloseConfirm} role="presentation">
            <div className={s.confirmShell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="portal-ticket-create-recap-title">
              <div className={s.confirmAccentBar} aria-hidden />
              <div className={s.confirmHeader}>
                <div className={s.confirmHeaderMain}>
                  <div className={s.confirmHeaderIconWrap} aria-hidden>
                    <Icon icon="mdi:clipboard-check-outline" className={s.confirmHeaderIcon} />
                  </div>
                  <div>
                    <h2 id="portal-ticket-create-recap-title" className={s.confirmTitle}>
                      {tc.recapTitle}
                    </h2>
                    <p className={s.confirmSubtitle}>{tc.recapSubtitle}</p>
                  </div>
                </div>
                <button type="button" className={s.confirmCloseBtn} onClick={handleCloseConfirm} disabled={submitting} aria-label={copy.common.close}>
                  <FaTimes />
                </button>
              </div>

              <div className={s.confirmBody}>
                <PortalTicketCreateRecap title={title} description={description} type={type} priority={priority} requesterLabel={requesterLabel} clientLabel={clientLabel} attachmentsSummary={attachmentsSummary} issueNature={issueNature} attemptedActions={attemptedActions} availabilitySummary={availabilitySummary} equipmentSummary={equipmentSummary} linkedTicketSummary={linkedTicketSummary} copy={copy} ticketTypes={ticketTypes} priorityOptions={priorityOptions} />
                {formError ? <div className={s.errorBox} role="alert">
                    <Icon icon="mdi:alert-circle-outline" className={s.errorIcon} aria-hidden />
                    <span>{formError}</span>
                  </div> : null}
              </div>

              <div className={s.confirmFooter}>
                <button type="button" className={s.recapCancelBtn} onClick={handleCloseConfirm} disabled={submitting}>
                  {copy.common.cancel}
                </button>
                <button type="button" className={s.recapConfirmBtn} onClick={handleConfirmCreate} disabled={submitting}>
                  <Icon icon={submitting ? "mdi:loading" : "mdi:check-bold"} className={submitting ? s.recapConfirmSpinner : undefined} />
                  {submitting ? tc.creating : tc.confirmCreate}
                </button>
              </div>
            </div>
          </div>, document.body)}
    </div>;
}
