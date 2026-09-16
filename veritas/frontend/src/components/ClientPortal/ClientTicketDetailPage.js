import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import API_BASE_URL from "../../config";
import { useAuthContext } from "../../contexts/AuthContext";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { interpolate } from "../../i18n/translate";
import { getLocalizedSolutionCatalogLabel } from "../TicketPage/solutionCatalogI18n";
import { addPortalTicketComment, fetchPortalTicket, submitPortalTicketSatisfaction, updatePortalTicketSatisfaction, updatePortalTicketComment, validatePortalTicketResolution } from "../../api/clientPortalTickets";
import portalLayout from "./ClientDashboard.module.css";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import tdStyles from "../TicketPage/TicketDetailPage.module.css";
import portalStyles from "./ClientPortalTickets.module.css";
import { getClientPortalCopy } from "./clientPortalI18n";
import PortalTicketInfoPanel from "./PortalTicketInfoPanel";
import UserAvatar from "../shared/UserAvatar/UserAvatar";
import { computeSatisfactionAverage, createEmptySatisfactionRatings, isSatisfactionComplete, resolveDisplayRatings } from "../../utils/ticketSatisfactionCriteria";
import { toRichPreviewHtml } from "../../utils/sanitizeHtml";
import { isIncomingEmailContent } from "../../utils/incomingEmailContent";
import IncomingEmailMessage from "../TicketPage/IncomingEmailMessage";
const BACKEND_BASE_URL = String(API_BASE_URL || "").replace(/\/api\/?$/, "");
function toAbsoluteAttachmentUrl(rawPath) {
  const raw = String(rawPath || "").trim();
  if (!raw) return "";
  const normalizedSlashes = raw.replace(/\\/g, "/");
  if (/^https?:\/\//i.test(normalizedSlashes)) return normalizedSlashes;
  const uploadsIndex = normalizedSlashes.toLowerCase().indexOf("/uploads/");
  const relativePath = uploadsIndex >= 0 ? normalizedSlashes.slice(uploadsIndex) : normalizedSlashes.startsWith("/") ? normalizedSlashes : `/${normalizedSlashes}`;
  if (!relativePath.startsWith("/")) return "";
  const encodedPath = relativePath.split("/").map((part, index) => index === 0 ? part : encodeURIComponent(part)).join("/");
  return `${BACKEND_BASE_URL}${encodedPath}`;
}
function isImageAttachment(attachment) {
  const mime = String(attachment?.mime_type || "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  const filename = String(attachment?.file_name || attachment?.filename || attachment?.name || "");
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(filename);
}
function normalizePortalAttachment(file, attachmentLabel) {
  if (!file) return null;
  const url = toAbsoluteAttachmentUrl(file.file_path || file.url || file.path);
  if (!url) return null;
  return {
    id: file.id,
    file_name: file.file_name || file.filename || file.name || attachmentLabel,
    mime_type: file.mime_type || "",
    url
  };
}
function isCommentEdited(comment) {
  if (!comment?.updated_at) return false;
  const createdAt = new Date(comment.created_at || 0).getTime();
  const updatedAt = new Date(comment.updated_at).getTime();
  return Number.isFinite(updatedAt) && updatedAt > createdAt + 500;
}
function PortalRichContent({ content, className, attachments = [] }) {
  const raw = String(content || "");
  if (!raw.trim()) return null;
  if (isIncomingEmailContent(raw)) {
    return (
      <div className={className}>
        <IncomingEmailMessage content={raw} attachments={attachments} />
      </div>
    );
  }
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{
        __html: toRichPreviewHtml(raw)
      }}
    />
  );
}

function isOwnPortalComment(comment, user) {
  if (!comment || !user) return false;
  if (comment.author_user_id && user.id && String(comment.author_user_id) === String(user.id)) {
    return true;
  }
  if (user.email && String(comment.author_name || "").toLowerCase() === String(user.email).toLowerCase()) {
    return true;
  }
  if (user.username && String(comment.author_name || "").toLowerCase() === String(user.username).toLowerCase()) {
    return true;
  }
  return false;
}
function StarRatingInput({
  value,
  onChange,
  disabled = false,
  label,
  copy
}) {
  return <div className={portalStyles.starRating} role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map(star => <button key={star} type="button" role="radio" aria-checked={value === star} aria-label={copy.formatStarAria(star)} className={`${portalStyles.starBtn} ${star <= value ? portalStyles.starBtnActive : ""}`.trim()} onClick={() => onChange(star)} disabled={disabled}>
          <Icon icon={star <= value ? "mdi:star" : "mdi:star-outline"} aria-hidden />
        </button>)}
    </div>;
}
function StarRatingDisplay({
  rating,
  copy
}) {
  const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));
  return <div className={portalStyles.starRatingDisplay} aria-label={copy.formatStarDisplayAria(safeRating)}>
      {[1, 2, 3, 4, 5].map(star => <Icon key={star} icon={star <= safeRating ? "mdi:star" : "mdi:star-outline"} className={star <= safeRating ? portalStyles.starIconActive : portalStyles.starIcon} aria-hidden />)}
    </div>;
}
function SatisfactionCriteriaDisplay({
  ratings,
  criteria,
  copy
}) {
  if (!ratings) return null;
  const average = computeSatisfactionAverage(ratings);
  return <div className={portalStyles.satisfactionCriteriaList}>
      {criteria.map(({
      key,
      label
    }) => <div key={key} className={portalStyles.satisfactionCriterionRow}>
          <span className={portalStyles.satisfactionCriterionLabel}>{label}</span>
          <StarRatingDisplay rating={ratings[key]} copy={copy} />
        </div>)}
      {average > 0 ? <div className={portalStyles.satisfactionAverageRow}>
          <span>{copy.common.average}</span>
          <strong>{average}/5</strong>
        </div> : null}
    </div>;
}
function SatisfactionCriteriaForm({
  ratings,
  onChange,
  disabled = false,
  criteria,
  copy
}) {
  const td = copy.ticket.detail;
  return <div className={portalStyles.satisfactionCriteriaList}>
      {criteria.map(({
      key,
      label,
      hint
    }) => <div key={key} className={portalStyles.satisfactionCriterionFormRow}>
          <div className={portalStyles.satisfactionCriterionFormHead}>
            <span className={portalStyles.satisfactionCriterionLabel}>{label}</span>
            {hint ? <span className={portalStyles.satisfactionCriterionHint}>{hint}</span> : null}
          </div>
          <StarRatingInput value={Number(ratings[key]) || 0} onChange={star => onChange(key, star)} disabled={disabled} label={interpolate(td.starNoteFor, {
        label
      })} copy={copy} />
        </div>)}
    </div>;
}
export default function ClientTicketDetailPage() {
  const {
    ticketId
  } = useParams();
  const {
    user
  } = useAuthContext();
  const locale = useAppLocale();
  const copy = useMemo(() => getClientPortalCopy(locale), [locale]);
  const td = copy.ticket.detail;
  const satisfactionCriteria = useMemo(() => copy.getSatisfactionCriteria(), [copy]);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [satisfactionRatings, setSatisfactionRatings] = useState(createEmptySatisfactionRatings);
  const [satisfactionMessage, setSatisfactionMessage] = useState("");
  const [submittingSatisfaction, setSubmittingSatisfaction] = useState(false);
  const [satisfactionModalOpen, setSatisfactionModalOpen] = useState(false);
  const [satisfactionEditing, setSatisfactionEditing] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const [submittingValidation, setSubmittingValidation] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentDraft, setEditingCommentDraft] = useState("");
  const [savingCommentEdit, setSavingCommentEdit] = useState(false);
  const fileInputRef = useRef(null);
  const timelineRef = useRef(null);
  const loadTicket = async () => {
    if (!ticketId) return;
    setLoading(true);
    try {
      const data = await fetchPortalTicket(ticketId);
      setTicket(data);
    } catch (error) {
      toast.error(error.message || td.loadError);
      setTicket(null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadTicket();
  }, [ticketId]);
  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [ticket?.comments?.length, loading]);
  const resolutionPending = ticket?.status === "resolved" && Boolean(ticket?.resolutionValidation?.isPending);
  const isFinishedTicket = ticket?.status === "closed" || ticket?.status === "resolved";
  const canReply = !isFinishedTicket;
  const showSatisfaction = isFinishedTicket && !resolutionPending;
  const hasSatisfaction = Boolean(ticket?.satisfaction?.id || ticket?.satisfaction?.rating);
  const handleSatisfactionRatingChange = (key, star) => {
    setSatisfactionRatings(prev => ({
      ...prev,
      [key]: star
    }));
  };
  const handleSubmitValidation = async accepted => {
    if (!ticketId || submittingValidation || !resolutionPending) return;
    setSubmittingValidation(true);
    try {
      const result = await validatePortalTicketResolution(ticketId, {
        accepted,
        message: validationMessage.trim()
      });
      setValidationMessage("");
      await loadTicket();
      if (result?.outcome === "accepted") {
        toast.success(td.validationAccepted);
      } else {
        toast.success(td.validationRejected);
      }
    } catch (error) {
      toast.error(error.message || td.validationError);
    } finally {
      setSubmittingValidation(false);
    }
  };
  const handleSubmitSatisfaction = async () => {
    if (!ticketId || submittingSatisfaction || hasSatisfaction) return;
    if (!isSatisfactionComplete(satisfactionRatings)) {
      toast.error(td.satisfactionIncomplete);
      return;
    }
    setSubmittingSatisfaction(true);
    try {
      const satisfaction = await submitPortalTicketSatisfaction(ticketId, {
        ratings: satisfactionRatings,
        message: satisfactionMessage.trim()
      });
      setTicket(prev => prev ? {
        ...prev,
        satisfaction
      } : prev);
      setSatisfactionModalOpen(false);
      setSatisfactionEditing(false);
      toast.success(td.satisfactionThanks);
    } catch (error) {
      toast.error(error.message || td.satisfactionSubmitError);
    } finally {
      setSubmittingSatisfaction(false);
    }
  };
  const handleUpdateSatisfaction = async () => {
    if (!ticketId || submittingSatisfaction || !hasSatisfaction) return;
    if (!isSatisfactionComplete(satisfactionRatings)) {
      toast.error(td.satisfactionIncomplete);
      return;
    }
    setSubmittingSatisfaction(true);
    try {
      const satisfaction = await updatePortalTicketSatisfaction(ticketId, {
        ratings: satisfactionRatings,
        message: satisfactionMessage.trim()
      });
      setTicket(prev => prev ? {
        ...prev,
        satisfaction
      } : prev);
      setSatisfactionModalOpen(false);
      setSatisfactionEditing(false);
      toast.success(td.satisfactionUpdated);
    } catch (error) {
      toast.error(error.message || td.satisfactionUpdateError);
    } finally {
      setSubmittingSatisfaction(false);
    }
  };
  const openSatisfactionModal = ({
    edit = false
  } = {}) => {
    if (hasSatisfaction) {
      const existingRatings = resolveDisplayRatings(ticket.satisfaction) || createEmptySatisfactionRatings();
      setSatisfactionRatings(existingRatings);
      setSatisfactionMessage(String(ticket.satisfaction?.message || ""));
      setSatisfactionEditing(edit);
    } else {
      setSatisfactionRatings(createEmptySatisfactionRatings());
      setSatisfactionMessage("");
      setSatisfactionEditing(false);
    }
    setSatisfactionModalOpen(true);
  };
  const handleSend = async () => {
    if (!ticketId || sending) return;
    const content = reply.trim();
    if (!content && files.length === 0) {
      toast.error(td.replyRequired);
      return;
    }
    setSending(true);
    try {
      const comment = await addPortalTicketComment(ticketId, {
        content,
        files
      });
      setTicket(prev => prev ? {
        ...prev,
        comments: [...(prev.comments || []), comment],
        updated_at: comment.created_at
      } : prev);
      setReply("");
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success(td.messageSent);
    } catch (error) {
      toast.error(error.message || td.messageSendError);
    } finally {
      setSending(false);
    }
  };
  const startEditComment = comment => {
    if (!canReply || savingCommentEdit || !isOwnPortalComment(comment, user)) return;
    setEditingCommentId(comment.id);
    setEditingCommentDraft(String(comment.content || ""));
  };
  const cancelEditComment = () => {
    if (savingCommentEdit) return;
    setEditingCommentId(null);
    setEditingCommentDraft("");
  };
  const saveEditComment = async () => {
    if (!ticketId || !editingCommentId || savingCommentEdit) return;
    const editingComment = (ticket?.comments || []).find(comment => String(comment.id) === String(editingCommentId));
    const draftText = editingCommentDraft.trim();
    const hasAttachments = Array.isArray(editingComment?.attachments) && editingComment.attachments.length > 0;
    if (!draftText && !hasAttachments) {
      toast.error(td.messageEmpty);
      return;
    }
    setSavingCommentEdit(true);
    try {
      const updatedComment = await updatePortalTicketComment(ticketId, editingCommentId, draftText);
      setTicket(prev => prev ? {
        ...prev,
        updated_at: updatedComment.updated_at || updatedComment.created_at,
        comments: (prev.comments || []).map(comment => String(comment.id) === String(editingCommentId) ? updatedComment : comment)
      } : prev);
      setEditingCommentId(null);
      setEditingCommentDraft("");
      toast.success(td.messageEdited);
    } catch (error) {
      toast.error(error.message || td.messageEditError);
    } finally {
      setSavingCommentEdit(false);
    }
  };
  if (loading) {
    return <div className={`${portalLayout.mainScrollFill} ${portalLayout.portalPage}`}>
        <div className={layout.stateBox}>
          <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
          <span>{td.loading}</span>
        </div>
      </div>;
  }
  if (!ticket) {
    return <div className={`${portalLayout.mainScrollFill} ${portalLayout.portalPage}`}>
        <div className={layout.emptyState}>
          <p className={layout.emptyStateTitle}>{td.notFound}</p>
          <Link to="/client/tickets" className={layout.primaryBtn}>
            {td.backToSupport}
          </Link>
        </div>
      </div>;
  }
  const submittedRatings = resolveDisplayRatings(ticket.satisfaction);
  const submittedAverage = submittedRatings ? computeSatisfactionAverage(submittedRatings) : 0;
  const closeSatisfactionModal = () => {
    if (submittingSatisfaction) return;
    setSatisfactionModalOpen(false);
    setSatisfactionEditing(false);
  };
  return <div className={`${portalLayout.mainScrollFill} ${portalLayout.portalPage}`}>
      <div className={`${tdStyles.shell} ${portalStyles.portalDetailShell}`}>
        <header className={`${tdStyles.ticketChromeBar} ${tdStyles.ticketHeaderBar}`}>
          <div className={tdStyles.ticketHeroTrack}>
            <Link to="/client/tickets" className={tdStyles.ticketHeaderIconBtn} aria-label={td.backToListAria}>
              <Icon icon="mdi:arrow-left" aria-hidden />
            </Link>
            <p className={tdStyles.ticketHeroEyebrow}>
              {interpolate(td.ticketRef, {
              id: ticket.ticket_number || ticket.id
            })}
            </p>
            <h1 className={tdStyles.conversationTitle} style={{
            margin: 0,
            flex: 1,
            minWidth: 0
          }}>
              {ticket.title}
            </h1>
          </div>
        </header>

        <div className={portalStyles.portalWorkspace}>
          <section className={`${tdStyles.centerPane} ${portalStyles.portalCenterPane}`}>
            {showSatisfaction ? <div className={portalStyles.portalChatTopBanners}>
                {!hasSatisfaction ? <div className={portalStyles.satisfactionInviteBanner}>
                    <div className={portalStyles.satisfactionInviteIconWrap} aria-hidden>
                      <Icon icon="mdi:star-shooting-outline" />
                    </div>
                    <div className={portalStyles.satisfactionInviteContent}>
                      <p className={portalStyles.satisfactionInviteTitle}>{td.satisfactionInviteTitle}</p>
                      <p className={portalStyles.satisfactionInviteText}>{td.satisfactionInviteText}</p>
                    </div>
                    <button type="button" className={portalStyles.satisfactionInviteBtn} onClick={() => openSatisfactionModal()}>
                      <Icon icon="mdi:star-outline" aria-hidden />
                      {td.giveFeedback}
                    </button>
                  </div> : <div className={portalStyles.satisfactionThanksBanner}>
                    <div className={portalStyles.satisfactionThanksMain}>
                      <Icon icon="mdi:star-check-outline" className={portalStyles.satisfactionThanksIcon} aria-hidden />
                      <div>
                        <p className={portalStyles.satisfactionThanksTitle}>{td.thanksTitle}</p>
                        <p className={portalStyles.satisfactionThanksText}>
                          {td.thanksText}
                          {submittedAverage > 0 ? interpolate(td.thanksAverage, {
                      avg: String(submittedAverage)
                    }) : ""}
                          {ticket.satisfaction.createdAt ? interpolate(td.thanksOnDate, {
                      date: copy.formatPortalDateTime(ticket.satisfaction.createdAt)
                    }) : ""}
                          .
                        </p>
                      </div>
                    </div>
                    <div className={portalStyles.satisfactionThanksActions}>
                      <button type="button" className={portalStyles.satisfactionThanksLink} onClick={() => openSatisfactionModal()}>
                        {td.viewRating}
                      </button>
                      <button type="button" className={portalStyles.satisfactionThanksEditBtn} onClick={() => openSatisfactionModal({
                  edit: true
                })}>
                        {td.editRating}
                      </button>
                    </div>
                  </div>}
              </div> : null}

            {ticket.description ? <article className={`${tdStyles.commentItem} ${tdStyles.commentItemInitial}`}>
                <UserAvatar className={tdStyles.commentAvatarSide} name={td.initialDescription} size={40} variant="client" />
                <div className={tdStyles.commentBubble}>
                  <div className={tdStyles.commentHeader}>
                    <div className={tdStyles.commentHeaderMain}>
                      <div className={tdStyles.commentMetaStrip}>
                        <span className={tdStyles.initialRequestBadge}>{td.initialDescription}</span>
                      </div>
                    </div>
                  </div>
                  <PortalRichContent content={ticket.description} attachments={ticket.attachments} className={`${tdStyles.commentBody} ${portalStyles.richHtml}`} />
                </div>
              </article> : null}

            <div className={`${tdStyles.timelineWrap} ${portalStyles.portalTimelineWrap}`}>
              <div className={tdStyles.timeline} ref={timelineRef}>
                {(ticket.comments || []).length === 0 ? <p className={layout.emptyStateHint}>{td.noMessages}</p> : ticket.comments.map(comment => {
                const isOwn = isOwnPortalComment(comment, user);
                const isEditingComment = String(editingCommentId) === String(comment.id);
                const showEditAction = isOwn && canReply && !isEditingComment;
                const authorAvatar = isOwn && user?.avatar ? user.avatar : comment.author_avatar || null;
                const authorName = comment.author_name || td.supportAuthor;
                return <article key={comment.id} className={tdStyles.commentItem}>
                        <UserAvatar className={tdStyles.commentAvatarSide} name={authorName} avatar={authorAvatar} size={40} variant={isOwn ? "client" : "agent"} />
                        <div className={tdStyles.commentBubble}>
                          <div className={tdStyles.commentHeader}>
                            <div className={tdStyles.commentHeaderMain}>
                              <div className={tdStyles.commentMetaStrip}>
                                <span className={tdStyles.commentMetaLabel}>{td.createdLabel}</span>
                                <span className={tdStyles.commentMetaValue}>
                                  <Icon icon="mdi:clock-outline" aria-hidden />
                                  {copy.formatPortalDateTime(comment.created_at)}
                                  {isCommentEdited(comment) ? <span className={tdStyles.commentEditedMark}> · {copy.common.edited}</span> : null}
                                </span>
                                <span className={tdStyles.commentMetaLabel}>{td.byLabel}</span>
                                <span className={tdStyles.commentMetaAuthor}>
                                  <Icon icon="mdi:account-outline" aria-hidden />
                                  {authorName}
                                </span>
                              </div>
                            </div>
                            <div className={tdStyles.commentHeaderRight}>
                              {showEditAction ? <button type="button" className={tdStyles.commentEditBtn} onClick={() => startEditComment(comment)} disabled={savingCommentEdit} aria-label={td.editMessageAria} title={td.editMessageTitle}>
                                  <Icon icon="mdi:pencil-outline" aria-hidden />
                                </button> : null}
                            </div>
                          </div>
                          {isEditingComment ? <div className={tdStyles.commentEditBox}>
                              <textarea className={tdStyles.commentEditEditor} value={editingCommentDraft} onChange={e => setEditingCommentDraft(e.target.value)} disabled={savingCommentEdit} rows={4} />
                              <div className={tdStyles.commentEditActions}>
                                <button type="button" className={tdStyles.secondaryBtn} onClick={cancelEditComment} disabled={savingCommentEdit}>
                                  {copy.common.cancel}
                                </button>
                                <button type="button" className={tdStyles.primaryBtn} onClick={saveEditComment} disabled={savingCommentEdit}>
                                  {savingCommentEdit ? <>
                                      <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
                                      {copy.common.saving}
                                    </> : copy.common.save}
                                </button>
                              </div>
                            </div> : comment.content ? <PortalRichContent content={comment.content} attachments={comment.attachments} className={`${tdStyles.commentBody} ${portalStyles.richHtml}`} /> : null}
                          {Array.isArray(comment.attachments) && comment.attachments.length > 0 && !isIncomingEmailContent(comment.content) ? <div className={tdStyles.attachmentsList}>
                              {comment.attachments.map(file => {
                        const attachment = normalizePortalAttachment(file, copy.common.attachment);
                        if (!attachment) return null;
                        const label = attachment.file_name;
                        const openTitle = `${label} ${copy.common.openInNewTab}`;
                        if (isImageAttachment(attachment)) {
                          return <a key={attachment.id || attachment.url} href={attachment.url} target="_blank" rel="noopener noreferrer" className={tdStyles.attachmentPreviewLink} title={openTitle}>
                                      <img src={attachment.url} alt={label} className={tdStyles.attachmentPreviewImage} loading="lazy" />
                                    </a>;
                        }
                        return <a key={attachment.id || attachment.url} href={attachment.url} target="_blank" rel="noopener noreferrer" className={tdStyles.attachmentLink} title={openTitle}>
                                    <Icon icon="mdi:paperclip" aria-hidden />
                                    {label}
                                  </a>;
                      })}
                            </div> : null}
                        </div>
                      </article>;
              })}
              </div>
            </div>

            {resolutionPending ? <div className={portalStyles.portalValidationPanel}>
                <div className={portalStyles.portalValidationHead}>
                  <Icon icon="mdi:help-circle-outline" aria-hidden />
                  <span>{td.validationQuestion}</span>
                </div>
                <p className={portalStyles.portalValidationMeta}>
                  {td.validationMeta}
                  {ticket.resolutionValidation?.autoCloseAt ? <>
                      {" "}
                      · {copy.formatAutoCloseAt(copy.formatPortalDateTime(ticket.resolutionValidation.autoCloseAt))}
                    </> : null}
                </p>
                {ticket.resolutionValidation?.resolutionReason || ticket.resolutionValidation?.interventionType || ticket.resolutionValidation?.actionType ? <div className={portalStyles.portalValidationSolution}>
                    {ticket.resolutionValidation?.interventionType ? <span className={portalStyles.portalValidationTag}>
                        {getLocalizedSolutionCatalogLabel(ticket.resolutionValidation.interventionType, locale)}
                      </span> : null}
                    {ticket.resolutionValidation?.actionType ? <span className={portalStyles.portalValidationTag}>
                        {getLocalizedSolutionCatalogLabel(ticket.resolutionValidation.actionType, locale)}
                      </span> : null}
                    {ticket.resolutionValidation?.resolutionReason ? <span className={portalStyles.portalValidationSolutionText}>
                        {ticket.resolutionValidation.resolutionReason}
                      </span> : null}
                  </div> : null}
                <textarea className={portalStyles.portalValidationTextarea} value={validationMessage} onChange={e => setValidationMessage(e.target.value)} placeholder={td.validationCommentPlaceholder} disabled={submittingValidation} maxLength={2000} rows={2} />
                <div className={portalStyles.portalValidationActions}>
                  <button type="button" className={tdStyles.secondaryBtn} onClick={() => handleSubmitValidation(false)} disabled={submittingValidation}>
                    <Icon icon="mdi:close-circle-outline" aria-hidden />
                    {td.rejectResolution}
                  </button>
                  <button type="button" className={tdStyles.primaryBtn} onClick={() => handleSubmitValidation(true)} disabled={submittingValidation}>
                    <Icon icon="mdi:check-circle-outline" aria-hidden />
                    {td.acceptResolution}
                  </button>
                </div>
              </div> : canReply ? <div className={tdStyles.replyBox}>
                <textarea className={tdStyles.editor} value={reply} onChange={e => setReply(e.target.value)} placeholder={td.replyPlaceholder} disabled={sending} rows={4} />
                <div className={portalStyles.portalReplyFooter}>
                  <div className={portalStyles.portalReplyFiles}>
                    <label className={tdStyles.uploadBtn}>
                      <Icon icon="mdi:paperclip" aria-hidden />
                      {td.attachments}
                      <input ref={fileInputRef} type="file" multiple hidden accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.csv,.xls,.xlsx" onChange={e => setFiles(Array.from(e.target.files || []))} disabled={sending} />
                    </label>
                    {files.length > 0 ? <span>
                        {interpolate(files.length === 1 ? td.filesSelectedOne : td.filesSelectedMany, {
                    count: String(files.length)
                  })}
                      </span> : null}
                  </div>
                  <button type="button" className={tdStyles.primaryBtn} onClick={handleSend} disabled={sending}>
                    {sending ? <>
                        <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
                        {td.sending}
                      </> : <>
                        <Icon icon="mdi:send" aria-hidden />
                        {td.send}
                      </>}
                  </button>
                </div>
              </div> : <div className={portalStyles.portalValidationDone}>
                <div className={portalStyles.portalValidationDoneTitle}>
                  <Icon icon="mdi:information-outline" aria-hidden />
                  {interpolate(td.ticketFinishedTitle, {
                status: ticket.status === "closed" ? td.ticketClosed : td.ticketResolved
              })}
                </div>
                <p className={portalStyles.portalValidationDoneText}>{td.ticketFinishedText}</p>
              </div>}
          </section>

          <PortalTicketInfoPanel ticket={ticket} resolutionPending={resolutionPending} />
        </div>
      </div>

      {satisfactionModalOpen && showSatisfaction ? <div className={portalStyles.satisfactionModalOverlay} onClick={closeSatisfactionModal} role="presentation">
          <div className={portalStyles.satisfactionModal} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="portal-satisfaction-modal-title">
            <header className={portalStyles.satisfactionModalHeader}>
              <div className={portalStyles.satisfactionModalTitleWrap}>
                <Icon icon="mdi:star-shooting-outline" className={portalStyles.satisfactionModalTitleIcon} aria-hidden />
                <div>
                  <h2 id="portal-satisfaction-modal-title" className={portalStyles.satisfactionModalTitle}>
                    {hasSatisfaction ? satisfactionEditing ? td.modalEditTitle : td.modalViewTitle : td.modalNewTitle}
                  </h2>
                  {!hasSatisfaction ? <p className={portalStyles.satisfactionModalSubtitle}>{td.modalSubtitle}</p> : null}
                </div>
              </div>
              <button type="button" className={portalStyles.satisfactionModalClose} onClick={closeSatisfactionModal} aria-label={copy.common.close} disabled={submittingSatisfaction}>
                <Icon icon="mdi:close" aria-hidden />
              </button>
            </header>

            <div className={portalStyles.satisfactionModalBody}>
              {hasSatisfaction && !satisfactionEditing ? <div className={portalStyles.satisfactionSubmitted}>
                  <SatisfactionCriteriaDisplay ratings={submittedRatings} criteria={satisfactionCriteria} copy={copy} />
                  {ticket.satisfaction.message ? <div className={portalStyles.satisfactionCommentBlock}>
                      <span className={portalStyles.satisfactionCommentLabel}>{td.commentLabel}</span>
                      <p className={portalStyles.satisfactionSubmittedMessage}>{ticket.satisfaction.message}</p>
                    </div> : null}
                </div> : <>
                  <SatisfactionCriteriaForm ratings={satisfactionRatings} onChange={handleSatisfactionRatingChange} disabled={submittingSatisfaction} criteria={satisfactionCriteria} copy={copy} />
                  <div className={portalStyles.satisfactionCommentField}>
                    <label className={portalStyles.satisfactionCommentLabel} htmlFor="portal-satisfaction-comment">
                      {td.commentOptional}
                    </label>
                    <textarea id="portal-satisfaction-comment" className={portalStyles.satisfactionTextarea} value={satisfactionMessage} onChange={e => setSatisfactionMessage(e.target.value)} placeholder={td.commentPlaceholder} disabled={submittingSatisfaction} maxLength={2000} />
                  </div>
                </>}
            </div>

            <footer className={portalStyles.satisfactionModalFooter}>
              {hasSatisfaction && !satisfactionEditing ? <>
                  <button type="button" className={tdStyles.secondaryBtn} onClick={closeSatisfactionModal}>
                    {copy.common.close}
                  </button>
                  <button type="button" className={tdStyles.primaryBtn} onClick={() => setSatisfactionEditing(true)}>
                    <Icon icon="mdi:pencil-outline" aria-hidden />
                    {td.editMyRating}
                  </button>
                </> : hasSatisfaction && satisfactionEditing ? <>
                  <button type="button" className={tdStyles.secondaryBtn} onClick={() => {
              setSatisfactionEditing(false);
              setSatisfactionRatings(resolveDisplayRatings(ticket.satisfaction) || createEmptySatisfactionRatings());
              setSatisfactionMessage(String(ticket.satisfaction?.message || ""));
            }} disabled={submittingSatisfaction}>
                    {copy.common.cancel}
                  </button>
                  <button type="button" className={tdStyles.primaryBtn} onClick={handleUpdateSatisfaction} disabled={submittingSatisfaction || !isSatisfactionComplete(satisfactionRatings)}>
                    {submittingSatisfaction ? <>
                        <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
                        {copy.common.saving}
                      </> : <>
                        <Icon icon="mdi:content-save-outline" aria-hidden />
                        {td.saveChanges}
                      </>}
                  </button>
                </> : <>
                  <button type="button" className={tdStyles.secondaryBtn} onClick={closeSatisfactionModal} disabled={submittingSatisfaction}>
                    {td.later}
                  </button>
                  <button type="button" className={tdStyles.primaryBtn} onClick={handleSubmitSatisfaction} disabled={submittingSatisfaction || !isSatisfactionComplete(satisfactionRatings)}>
                    {submittingSatisfaction ? <>
                        <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
                        {td.sending}
                      </> : <>
                        <Icon icon="mdi:send" aria-hidden />
                        {td.submitFeedback}
                      </>}
                  </button>
                </>}
            </footer>
          </div>
        </div> : null}
    </div>;
}
