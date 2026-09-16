import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { addTicketComment, addTicketCommentWithAttachments, createTicketValidationRequest, deleteTicketComment, respondTicketValidationRequest, updateTicketComment, updateTicketValidationRequest } from "../../api/tickets";
import API_BASE_URL from "../../config";
import { useAuthContext } from "../../contexts/AuthContext";
import { usePermissions } from "../../contexts/PermissionsContext";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useVeritasEdition } from "../../hooks/useVeritasEdition";
import { emitNotificationsUpdated } from "../../hooks/useNotifications";
import { interpolate } from "../../i18n/translate";
import { toRichPreviewHtml } from "../../utils/sanitizeHtml";
import IncomingEmailMessage from "./IncomingEmailMessage";
import { isIncomingEmailContent } from "../../utils/incomingEmailContent";
import { archiveTicketFilesToVault } from "../../utils/archiveTicketFilesToVault";
import { getTicketAutomationConfig } from "../../utils/ticketAutomationStorage";
import UserAvatar from "../shared/UserAvatar/UserAvatar";
import SmartTooltip from "../SmartTooltip";
import { getTicketDetailCopy } from "./ticketDetailPageI18n";
import TicketVaultArchiveOptions, {
  collectVaultArchiveEntries,
  createDefaultVaultFileOptions,
  getAttachmentFileKey
} from "./TicketVaultArchiveOptions";
import { getTicketVaultArchiveCopy } from "./ticketVaultArchiveI18n";
import TicketValidationRequestModal from "./TicketValidationRequestModal";
import TicketValidationBanner from "./TicketValidationBanner";
import { getTicketValidationCopy } from "./ticketValidationI18n";
import TicketEmojiPicker from "./TicketEmojiPicker";
import TicketInsertLinkModal, { captureEditorSelection, insertLinkHtml, restoreEditorSelection } from "./TicketInsertLinkModal";
import TicketImageLightbox from "./TicketImageLightbox";
import { extractClipboardImageFiles, extractInlineDataImagesFromHtml, htmlContainsInlineImage } from "../../utils/ticketEditorImages";
import styles from "./TicketDetailPage.module.css";

const ATTACHMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png,.doc,.docx,.csv,.xls,.xlsx,.mp4,.3gp,.mp3,.mpeg,.ogg,.aac,.amr,.m4a";
const REPLY_BOX_EXPANDED_KEY = "ticket_sales_reply_box_expanded";

function htmlToPlainText(rawHtml) {
  const raw = String(rawHtml || "");
  if (!raw.trim()) return "";
  const withBreaks = raw.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h[1-6])>/gi, "\n");
  const tmp = document.createElement("div");
  tmp.innerHTML = withBreaks;
  return String(tmp.textContent || tmp.innerText || "").replace(/\u00a0/g, " ").trim();
}

function toAbsoluteUrl(path) {
  const raw = String(path || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = String(API_BASE_URL || "").replace(/\/api\/?$/, "");
  return raw.startsWith("/") ? `${base}${raw}` : `${base}/${raw}`;
}

function isImageAttachment(attachment) {
  const mime = String(attachment?.mime_type || attachment?.mimeType || "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(String(attachment?.filename || attachment?.name || ""));
}

function normalizeAttachment(attachment) {
  if (!attachment) return null;
  const url = toAbsoluteUrl(attachment.url || attachment.path || attachment.file_path || "");
  return {
    ...attachment,
    url,
    path: url,
    filename: attachment.filename || attachment.name || "file"
  };
}

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
    if (key.startsWith("id:")) removeAttachmentIds.push(key.slice(3));
    else if (key.startsWith("path:")) removeAttachmentPaths.push(key.slice(5));
  });
  return { removeAttachmentIds, removeAttachmentPaths };
}

function isUserEditableCommentContent(content) {
  const text = String(content || "").trim();
  if (!text) return false;
  if (text.startsWith("[WhatsApp]")) return false;
  if (text.startsWith("[Email entrant]")) return false;
  if (text.startsWith("[Macro ")) return false;
  if (text.startsWith("[Resolution]")) return false;
  if (text.startsWith("[Linked ticket]")) return false;
  if (text.startsWith("[Linked equipment]")) return false;
  if (text.startsWith("[Split ticket]")) return false;
  return true;
}

function isCommentEdited(comment) {
  if (!comment?.updated_at) return false;
  const createdAt = new Date(comment.created_at || 0).getTime();
  const updatedAt = new Date(comment.updated_at).getTime();
  return Number.isFinite(updatedAt) && updatedAt > createdAt + 500;
}

export default function TicketChatPanel({
  ticketId,
  ticket = null,
  comments = [],
  users = [],
  validationRequests = [],
  formatDateTime,
  emptyLabel,
  onCommentAdded,
  disabled = false,
  clientId = null,
  clientName = "",
  permissionPrefix = "sales_detail",
  canEditMessages: canEditMessagesProp,
  canDeleteAttachments: canDeleteAttachmentsProp,
  canPublicReply: canPublicReplyProp,
  canRequestValidation: canRequestValidationProp
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getTicketDetailCopy(locale), [locale]);
  const validationCopy = useMemo(() => getTicketValidationCopy(locale), [locale]);
  const vaultArchiveCopy = useMemo(() => getTicketVaultArchiveCopy(locale), [locale]);
  const { user } = useAuthContext() || {};
  const { can } = usePermissions();
  const { isPro } = useVeritasEdition();
  const currentUserId = useMemo(() => user?.id || user?.uuid || user?.user_id || null, [user]);
  const canEditMessages = canEditMessagesProp ?? can(`${permissionPrefix}.edit_messages`);
  const canDeleteAttachments = canDeleteAttachmentsProp ?? can(`${permissionPrefix}.delete_attachments`);
  const canPublicReply = canPublicReplyProp ?? can(`${permissionPrefix}.public_reply`);
  const canRequestValidation = canRequestValidationProp ?? can(`${permissionPrefix}.request_validation`);
  const commentEditorRef = useRef(null);
  const commentEditEditorRef = useRef(null);
  const timelineRef = useRef(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentInternal, setCommentInternal] = useState(false);
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [vaultOptionsByKey, setVaultOptionsByKey] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkModalText, setLinkModalText] = useState("");
  const linkSelectionRef = useRef({ range: null, text: "" });
  const [isDragOverReplyBox, setIsDragOverReplyBox] = useState(false);
  const [commentTemplateSelection, setCommentTemplateSelection] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentDraft, setEditingCommentDraft] = useState("");
  const [editingCommentInternal, setEditingCommentInternal] = useState(false);
  const [editingCommentRemovedAttachmentKeys, setEditingCommentRemovedAttachmentKeys] = useState([]);
  const [savingCommentEdit, setSavingCommentEdit] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState(null);
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [editingValidationRequest, setEditingValidationRequest] = useState(null);
  const [savingValidationRequest, setSavingValidationRequest] = useState(false);
  const [respondingValidationId, setRespondingValidationId] = useState(null);
  const [imageLightbox, setImageLightbox] = useState(null);
  const [replyBoxExpanded, setReplyBoxExpanded] = useState(() => {
    try {
      return localStorage.getItem(REPLY_BOX_EXPANDED_KEY) !== "false";
    } catch {
      return true;
    }
  });

  const templates = useMemo(() => {
    const cfg = getTicketAutomationConfig();
    return Array.isArray(cfg?.commentTemplates) ? cfg.commentTemplates.filter(t => t?.id && t?.name) : [];
  }, []);

  const visibleComments = useMemo(
    () =>
      (Array.isArray(comments) ? comments : []).map(comment => ({
        ...comment,
        attachments: (Array.isArray(comment.attachments) ? comment.attachments : []).map(normalizeAttachment).filter(Boolean)
      })),
    [comments]
  );

  const hasReplyDraft = useMemo(
    () => htmlToPlainText(commentDraft).length > 0 || attachmentFiles.length > 0 || htmlContainsInlineImage(commentDraft),
    [commentDraft, attachmentFiles]
  );

  useEffect(() => {
    if (!canPublicReply && !commentInternal) {
      setCommentInternal(true);
    }
  }, [canPublicReply, commentInternal]);

  const runEditorCommand = (command, value = null) => {
    if (!commentEditorRef.current || disabled) return;
    commentEditorRef.current.focus();
    document.execCommand(command, false, value);
    setCommentDraft(commentEditorRef.current.innerHTML || "");
  };

  const insertBold = () => runEditorCommand("bold");
  const insertBulletList = () => runEditorCommand("insertUnorderedList");
  const insertLink = () => {
    if (disabled) return;
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
    if (!commentEditorRef.current || disabled) return;
    commentEditorRef.current.focus();
    document.execCommand("insertText", false, emoji);
    setCommentDraft(commentEditorRef.current.innerHTML || "");
  };

  const applyCommentTemplate = templateId => {
    setCommentTemplateSelection(templateId);
    const template = templates.find(item => String(item.id) === String(templateId));
    if (!template || !commentEditorRef.current) return;
    const content = String(template.content || template.body || "");
    commentEditorRef.current.innerHTML = content;
    setCommentDraft(content);
    commentEditorRef.current.focus();
    toast.success(copy.formatTemplateApplied?.(template.name) || template.name);
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

  const patchVaultFileOptions = (fileKey, patch) => {
    setVaultOptionsByKey(prev => ({
      ...prev,
      [fileKey]: {
        ...createDefaultVaultFileOptions(),
        ...(prev?.[fileKey] || {}),
        ...patch
      }
    }));
  };

  const canEditComment = useCallback(
    comment => {
      if (!canEditMessages || !comment || disabled || !currentUserId) return false;
      const authorId = comment?.author_user_id || comment?.authorUserId || comment?.user_id || comment?.userId;
      if (!authorId || String(authorId) !== String(currentUserId)) return false;
      return isUserEditableCommentContent(comment?.content || comment?.body);
    },
    [canEditMessages, currentUserId, disabled]
  );

  const canDeleteComment = useCallback(
    comment => {
      if (!canDeleteAttachments || !comment || disabled) return false;
      return isUserEditableCommentContent(comment?.content || comment?.body);
    },
    [canDeleteAttachments, disabled]
  );

  const startEditComment = comment => {
    if (!canEditComment(comment)) return;
    setEditingCommentId(comment.id);
    setEditingCommentDraft(String(comment.content || comment.body || ""));
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
    setEditingCommentRemovedAttachmentKeys(prev => (prev.includes(key) ? prev.filter(item => item !== key) : [...prev, key]));
  };

  const saveEditComment = async () => {
    if (!ticketId || !editingCommentId || savingCommentEdit) return;
    const draftRaw = String(commentEditEditorRef.current?.innerHTML || editingCommentDraft || "").trim();
    const draftText = htmlToPlainText(draftRaw).trim();
    const editingComment = visibleComments.find(comment => String(comment.id) === String(editingCommentId));
    const remainingAttachments = (editingComment?.attachments || []).filter(
      attachment => !isAttachmentMarkedForRemoval(attachment, editingCommentRemovedAttachmentKeys)
    );
    if (!draftText && remainingAttachments.length === 0) {
      toast.error(copy.toasts.messageEmpty);
      return;
    }
    const { removeAttachmentIds, removeAttachmentPaths } = splitRemovedAttachmentKeys(editingCommentRemovedAttachmentKeys);
    setSavingCommentEdit(true);
    try {
      await updateTicketComment(ticketId, editingCommentId, draftRaw, {
        removeAttachmentIds,
        removeAttachmentPaths,
        isInternal: editingCommentInternal
      });
      cancelEditComment(true);
      toast.success(copy.toasts.messageEdited);
      await onCommentAdded?.();
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
      if (String(editingCommentId) === String(commentId)) cancelEditComment(true);
      toast.success(copy.toasts.messageDeleted);
      await onCommentAdded?.();
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

  const handleReplyDragOver = event => {
    event.preventDefault();
    if (disabled) return;
    if (!isDragOverReplyBox) setIsDragOverReplyBox(true);
  };

  const handleReplyDragLeave = event => {
    event.preventDefault();
    if (!event.currentTarget.contains(event.relatedTarget)) setIsDragOverReplyBox(false);
  };

  const handleReplyDrop = event => {
    event.preventDefault();
    setIsDragOverReplyBox(false);
    if (disabled) return;
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
    if (disabled) return;
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
      if (next) requestAnimationFrame(() => commentEditorRef.current?.focus());
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

  const clearComposer = () => {
    setCommentDraft("");
    setAttachmentFiles([]);
    setVaultOptionsByKey({});
    setCommentTemplateSelection("");
    setCommentInternal(false);
    if (commentEditorRef.current) commentEditorRef.current.innerHTML = "";
  };

  const maybeArchiveAttachmentsToVault = async (entries = []) => {
    if (!isPro || !Array.isArray(entries) || entries.length === 0) return;
    if (!clientId) {
      toast.error(vaultArchiveCopy.noClient);
      return;
    }
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
  };

  const submitComment = async () => {
    const draftContentRaw = String(commentDraft || "").trim();
    const extracted = extractInlineDataImagesFromHtml(draftContentRaw);
    const draftFiles = mergeAttachmentFiles(attachmentFiles, extracted.files);
    const draftContentText = htmlToPlainText(extracted.html);
    if (!ticketId || (!draftContentText && draftFiles.length === 0) || disabled) return;
    setSubmitting(true);
    const vaultEntries = isPro ? collectVaultArchiveEntries(draftFiles, vaultOptionsByKey) : [];
    try {
      copy.validateAttachmentFiles(draftFiles);
      if (draftFiles.length > 0) {
        await addTicketCommentWithAttachments(ticketId, {
          content: extracted.html,
          isInternal: commentInternal,
          files: draftFiles
        });
      } else {
        await addTicketComment(ticketId, extracted.html, commentInternal);
      }
      clearComposer();
      toast.success(copy.toasts.replySent);
      if (vaultEntries.length > 0) {
        await maybeArchiveAttachmentsToVault(vaultEntries);
      }
      await onCommentAdded?.();
    } catch (error) {
      toast.error(error.message || copy.toasts.commentAddError);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!replyBoxExpanded || !commentEditorRef.current) return;
    if (commentEditorRef.current.innerHTML !== commentDraft && !htmlToPlainText(commentEditorRef.current.innerHTML) && commentDraft) {
      commentEditorRef.current.innerHTML = commentDraft;
    }
  }, [replyBoxExpanded, commentDraft]);

  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [visibleComments.length]);

  const submitLabel = commentInternal ? copy.reply.modePrivate : copy.reply.modePublic;
  const pendingValidationRequest = useMemo(
    () => (Array.isArray(validationRequests) ? validationRequests : []).find(r => r?.isPending || r?.status === "pending") || null,
    [validationRequests]
  );

  const openValidationModal = (request = null) => {
    if (disabled) return;
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
      await onCommentAdded?.();
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
      await onCommentAdded?.();
    } catch (error) {
      toast.error(error?.message || validationCopy.toastRespondError);
    } finally {
      setRespondingValidationId(null);
    }
  };

  return (
    <div className={styles.chatPanelRoot}>
      <div className={styles.timelineWrap}>
        <TicketValidationBanner
          requests={validationRequests}
          currentUserId={currentUserId}
          respondingId={respondingValidationId}
          canEdit={!disabled}
          onRespond={handleValidationRespond}
          onEdit={request => openValidationModal(request)}
        />
        <div className={styles.timeline} ref={timelineRef}>
          {visibleComments.length === 0 ? <p className={styles.emptyText}>{emptyLabel || copy.empty?.noComments || "�"}</p> : null}
          {visibleComments.map(comment => {
            const author = comment.author_name || comment.authorName || comment.user_name || comment.created_by_name || "�";
            const internal = Boolean(comment.is_internal ?? comment.isInternal);
            const attachments = Array.isArray(comment.attachments) ? comment.attachments : [];
            const isEditingComment = String(editingCommentId) === String(comment.id);
            const showEditAction = canEditComment(comment);
            const showDeleteAction = canDeleteComment(comment);
            const isDeletingComment = String(deletingCommentId) === String(comment.id);
            return (
              <article key={comment.id || `${comment.created_at}-${author}`} className={`${styles.commentItem} ${internal ? styles.commentItemInternal : ""}`.trim()}>
                <UserAvatar
                  className={styles.commentAvatarSide}
                  name={author}
                  size={40}
                  variant={internal ? "neutral" : "agent"}
                />
                <div className={styles.commentBubble}>
                  <div className={styles.commentHeader}>
                    <div className={styles.commentHeaderMain}>
                      <div className={styles.commentMetaStrip}>
                        <span className={styles.commentMetaLabel}>{copy.comment.createdLabel}</span>
                        <span className={styles.commentMetaValue}>
                          <Icon icon="mdi:clock-outline" aria-hidden />
                          {formatDateTime?.(comment.created_at || comment.createdAt)}
                          {isCommentEdited(comment) ? <span className={styles.commentEditedMark}>{copy.comment.editedMark}</span> : null}
                        </span>
                        <span className={styles.commentMetaLabel}>{copy.comment.byLabel}</span>
                        <span className={styles.commentMetaAuthor}>
                          <Icon icon="mdi:account-outline" aria-hidden />
                          {author}
                        </span>
                        {internal ? (
                          <span className={styles.commentInternal} title={copy.comment?.privateTitle || copy.reply.modePrivate}>
                            <Icon icon="mdi:lock-outline" />
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className={styles.commentHeaderRight}>
                      {showEditAction && !isEditingComment ? (
                        <SmartTooltip content={copy.comment.editTooltip}>
                          <button type="button" className={styles.commentEditBtn} onClick={() => startEditComment(comment)} disabled={disabled} aria-label={copy.comment.editAria}>
                            <Icon icon="mdi:pencil-outline" />
                          </button>
                        </SmartTooltip>
                      ) : null}
                      {showDeleteAction && !isEditingComment ? (
                        <SmartTooltip content={copy.comment.deleteTooltip}>
                          <button
                            type="button"
                            className={styles.commentDeleteBtn}
                            onClick={() => deleteComment(comment.id)}
                            disabled={disabled || isDeletingComment}
                            aria-label={copy.comment.deleteAria}
                          >
                            <Icon icon="mdi:trash-can-outline" />
                          </button>
                        </SmartTooltip>
                      ) : null}
                    </div>
                  </div>

                  {isEditingComment ? (
                    <div className={styles.commentEditBox}>
                      <div
                        ref={commentEditEditorRef}
                        className={styles.commentEditEditor}
                        contentEditable={!disabled && !savingCommentEdit}
                        suppressContentEditableWarning
                        onInput={e => setEditingCommentDraft(e.currentTarget?.innerHTML || "")}
                        style={{
                          minHeight: "96px",
                          whiteSpace: "pre-wrap",
                          overflowY: "auto"
                        }}
                      />
                      {attachments.length > 0 ? (
                        <div className={styles.commentEditAttachments}>
                          {attachments.map((attachment, attachmentIndex) => {
                            const removalKey = getAttachmentRemovalKey(attachment) || `index:${attachmentIndex}`;
                            const isMarkedForRemoval = isAttachmentMarkedForRemoval(attachment, editingCommentRemovedAttachmentKeys);
                            const attachmentLabel = attachment.filename || attachment.name || copy.attachmentDefault || "file";
                            return (
                              <div key={removalKey} className={`${styles.commentEditAttachmentItem} ${isMarkedForRemoval ? styles.commentEditAttachmentItemRemoved : ""}`.trim()}>
                                <Icon icon="mdi:paperclip" className={styles.commentEditAttachmentIcon} />
                                <span className={styles.commentEditAttachmentName}>{attachmentLabel}</span>
                                {canDeleteAttachments ? (
                                  <button
                                    type="button"
                                    className={styles.commentEditAttachmentRemoveBtn}
                                    onClick={() => toggleEditingCommentAttachmentRemoval(attachment)}
                                    disabled={savingCommentEdit || disabled}
                                    aria-label={
                                      isMarkedForRemoval
                                        ? interpolate(copy.comment.editKeepAttachmentAria, { name: attachmentLabel })
                                        : interpolate(copy.comment.editRemoveAttachmentAria, { name: attachmentLabel })
                                    }
                                    title={isMarkedForRemoval ? copy.comment.editUndoRemoveTitle : copy.comment.editRemoveTitle}
                                  >
                                    <Icon icon={isMarkedForRemoval ? "mdi:undo" : "mdi:close"} />
                                  </button>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                      <div className={styles.commentEditActions}>
                        <button
                          type="button"
                          className={`${styles.replyModeBtn} ${styles.commentEditVisibility} ${editingCommentInternal ? styles.replyModeBtnPrivate : ""}`.trim()}
                          onClick={() => {
                            if (!canPublicReply) {
                              setEditingCommentInternal(true);
                              return;
                            }
                            setEditingCommentInternal(prev => !prev);
                          }}
                          disabled={savingCommentEdit || disabled || !canPublicReply}
                          title={editingCommentInternal ? copy.reply.modePrivateTitle : copy.reply.modePublicTitle}
                        >
                          <Icon icon={editingCommentInternal ? "mdi:lock-outline" : "mdi:earth"} />
                          {editingCommentInternal ? copy.reply.modePrivate : copy.reply.modePublic}
                        </button>
                        <button type="button" className={styles.commentEditSaveBtn} onClick={saveEditComment} disabled={savingCommentEdit || disabled}>
                          {savingCommentEdit ? copy.comment.editSaving : copy.comment.editSave}
                        </button>
                        <button type="button" className={styles.commentEditCancelBtn} onClick={cancelEditComment} disabled={savingCommentEdit}>
                          {copy.comment.editCancel}
                        </button>
                      </div>
                    </div>
                  ) : isIncomingEmailContent(comment.content || comment.body || "") ? (
                    <div className={styles.commentBody}>
                      <IncomingEmailMessage content={comment.content || comment.body || ""} attachments={attachments} attachmentLinkClassName={styles.attachmentLink} />
                    </div>
                  ) : (
                    <div
                      className={styles.commentBody}
                      onClick={handleInlineImageClick}
                      dangerouslySetInnerHTML={{
                        __html: toRichPreviewHtml(comment.content || comment.body || "")
                      }}
                    />
                  )}

                  {!isEditingComment && attachments.length > 0 && !isIncomingEmailContent(comment.content || comment.body || "") ? (
                    <div className={styles.attachmentsList}>
                      {attachments.map(attachment => {
                        const attachmentUrl = attachment.url || attachment.path;
                        if (!attachmentUrl) return null;
                        const attachmentLabel = attachment.filename || attachment.name || "file";
                        if (isImageAttachment(attachment)) {
                          return (
                            <button
                              type="button"
                              key={attachment.id || attachmentUrl}
                              className={styles.attachmentPreviewLink}
                              onClick={() => openImageLightbox(attachmentUrl, attachmentLabel)}
                            >
                              <img src={attachmentUrl} alt={attachmentLabel} className={styles.attachmentPreviewImage} loading="lazy" />
                            </button>
                          );
                        }
                        return (
                          <a key={attachment.id || attachmentUrl} href={attachmentUrl} target="_blank" rel="noopener noreferrer" className={styles.attachmentLink}>
                            <Icon icon="mdi:paperclip" />
                            {attachmentLabel}
                          </a>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {!disabled ? (
        <>
          <div
            className={`${styles.replyBox} ${isDragOverReplyBox ? styles.replyBoxDragActive : ""} ${!replyBoxExpanded ? styles.replyBoxCollapsed : ""}`.trim()}
            onDragOver={handleReplyDragOver}
            onDragEnter={handleReplyDragOver}
            onDragLeave={handleReplyDragLeave}
            onDrop={handleReplyDrop}
          >
            {isDragOverReplyBox && replyBoxExpanded ? (
              <div className={styles.dropOverlay}>
                <div className={styles.dropOverlayTitle}>{copy.reply.dropTitle}</div>
                <div className={styles.dropOverlayHint}>{copy.reply.dropHint}</div>
              </div>
            ) : null}

            <div className={styles.replyTopBar}>
              {replyBoxExpanded ? (
                <>
                  <div className={styles.replyTopLeft}>
                    <div className={styles.replyTopControls}>
                      <select
                        className={`${styles.footerSelect} ${styles.replyTemplateSelect}`}
                        value={commentTemplateSelection}
                        onChange={e => applyCommentTemplate(e.target.value)}
                        disabled={templates.length === 0}
                        title={copy.reply.templateTitle}
                      >
                        <option value="">{copy.reply.templateSelect}</option>
                        {templates.map(template => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
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
                      </div>
                      <label className={styles.uploadBtn}>
                        <Icon icon="mdi:paperclip" />
                        {copy.reply.addFiles}
                        <input
                          type="file"
                          multiple
                          accept={ATTACHMENT_ACCEPT}
                          onChange={e => {
                            const selectedFiles = Array.from(e.target.files || []);
                            try {
                              applySelectedAttachments(selectedFiles);
                            } catch (error) {
                              toast.error(error.message || copy.attachmentInvalid);
                            }
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  <div className={styles.replyTopRight}>
                    <button
                      type="button"
                      className={`${styles.replyModeBtn} ${commentInternal ? styles.replyModeBtnPrivate : ""}`}
                      onClick={() => {
                        if (!canPublicReply) {
                          setCommentInternal(true);
                          return;
                        }
                        setCommentInternal(prev => !prev);
                      }}
                      disabled={disabled || !canPublicReply}
                      title={commentInternal ? copy.reply.modePrivateTitle : copy.reply.modePublicTitle}
                    >
                      <Icon icon={commentInternal ? "mdi:lock-outline" : "mdi:lock-open-variant-outline"} />
                      {commentInternal ? copy.reply.modePrivate : copy.reply.modePublic}
                    </button>
                    <SmartTooltip content={copy.reply.collapseTooltip}>
                      <button type="button" className={styles.replyCollapseBtn} onClick={toggleReplyBoxExpanded} aria-expanded={replyBoxExpanded} aria-label={copy.reply.collapseAria}>
                        <Icon icon="mdi:chevron-down" aria-hidden />
                      </button>
                    </SmartTooltip>
                  </div>
                </>
              ) : (
                <>
                  <button type="button" className={styles.replyCollapsedSummary} onClick={expandReplyBox} aria-label={copy.reply.expandAria}>
                    <Icon icon="mdi:message-reply-text-outline" className={styles.replyCollapsedIcon} aria-hidden />
                    <span className={styles.replyCollapsedLabel}>{copy.reply.expandSummary}</span>
                    {hasReplyDraft ? <span className={styles.replyCollapsedDraftHint}>{copy.reply.draftHint}</span> : null}
                  </button>
                  <div className={styles.replyTopRight}>
                    <button
                      type="button"
                      className={`${styles.replyModeBtn} ${commentInternal ? styles.replyModeBtnPrivate : ""}`}
                      onClick={() => {
                        if (!canPublicReply) {
                          setCommentInternal(true);
                          return;
                        }
                        setCommentInternal(prev => !prev);
                      }}
                      disabled={disabled || !canPublicReply}
                      title={commentInternal ? copy.reply.modePrivateTitle : copy.reply.modePublicTitle}
                    >
                      <Icon icon={commentInternal ? "mdi:lock-outline" : "mdi:lock-open-variant-outline"} />
                      {commentInternal ? copy.reply.modePrivate : copy.reply.modePublic}
                    </button>
                    <SmartTooltip content={copy.reply.expandTooltip}>
                      <button type="button" className={styles.replyCollapseBtn} onClick={expandReplyBox} aria-expanded={replyBoxExpanded} aria-label={copy.reply.expandAria}>
                        <Icon icon="mdi:chevron-up" aria-hidden />
                      </button>
                    </SmartTooltip>
                  </div>
                </>
              )}
            </div>

            {replyBoxExpanded ? (
              <>
                <div
                  ref={commentEditorRef}
                  className={styles.editor}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={e => setCommentDraft(e.currentTarget?.innerHTML || "")}
                  onPaste={handleEditorPaste}
                  style={{
                    minHeight: "140px",
                    whiteSpace: "pre-wrap",
                    overflowY: "auto"
                  }}
                />
                {attachmentFiles.length > 0 && isPro ? (
                  <TicketVaultArchiveOptions
                    files={attachmentFiles}
                    optionsByKey={vaultOptionsByKey}
                    onOptionsChange={patchVaultFileOptions}
                    onRemoveFile={removeAttachmentFile}
                    getRemoveAria={name => copy.formatRemoveFileAria?.(name) || `Remove ${name}`}
                    hasClient={Boolean(clientId)}
                    disabled={submitting || disabled}
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
                            disabled={submitting || disabled}
                          >
                            <Icon icon="mdi:close" aria-hidden />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                ) : null}
              </>
            ) : null}
          </div>

          <div className={styles.chatPanelFooter}>
            <div className={styles.footerSubmitActions}>
              {canRequestValidation ? (
                <button
                  type="button"
                  className={styles.footerValidationBtn}
                  onClick={() => openValidationModal(null)}
                  disabled={disabled || submitting || Boolean(pendingValidationRequest)}
                  title={pendingValidationRequest ? validationCopy.requestValidationDisabledTitle : validationCopy.requestValidationTitle}
                >
                  <Icon icon="mdi:clipboard-check-outline" aria-hidden />
                  {validationCopy.requestValidation}
                </button>
              ) : null}
              <button type="button" className={styles.footerSubmitBtn} onClick={submitComment} disabled={submitting || !hasReplyDraft}>
                {submitting ? copy.footer?.sending || "..." : submitLabel}
              </button>
              <div className={styles.footerSubmitChevronWrap}>
                <Icon icon="mdi:chevron-down" className={styles.footerSubmitChevronIcon} />
                <select
                  className={styles.footerSubmitSelectOverlay}
                  value={commentInternal ? "private" : "public"}
                  onChange={e => {
                    if (!canPublicReply) {
                      setCommentInternal(true);
                      return;
                    }
                    setCommentInternal(e.target.value === "private");
                  }}
                  disabled={submitting || !canPublicReply}
                  aria-label={copy.reply.modePublicTitle}
                >
                  {canPublicReply ? <option value="public">{copy.reply.modePublic}</option> : null}
                  <option value="private">{copy.reply.modePrivate}</option>
                </select>
              </div>
            </div>
          </div>
        </>
      ) : null}
      <TicketValidationRequestModal
        open={validationModalOpen}
        ticket={ticket || { id: ticketId }}
        users={users}
        currentUserId={currentUserId}
        saving={savingValidationRequest}
        initialRequest={editingValidationRequest}
        onClose={closeValidationModal}
        onSubmit={submitValidationRequest}
      />
      <TicketInsertLinkModal open={linkModalOpen} copy={copy.reply} initialText={linkModalText} onClose={() => setLinkModalOpen(false)} onInsert={handleInsertLink} />
      <TicketImageLightbox
        open={Boolean(imageLightbox?.url)}
        src={imageLightbox?.url || ""}
        alt={imageLightbox?.alt || ""}
        onClose={closeImageLightbox}
        closeAria={copy.comment?.lightboxCloseAria || "Fermer"}
      />
    </div>
  );
}
