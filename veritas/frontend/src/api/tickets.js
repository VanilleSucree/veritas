import API_BASE_URL from "../config";
function buildQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.set(key, String(value));
  });
  const raw = query.toString();
  return raw ? `?${raw}` : "";
}
async function handleJsonResponse(response, fallbackMessage) {
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const validationDetails = Array.isArray(payload?.errors) ? payload.errors.map(e => e.msg || e.message).filter(Boolean).join(", ") : null;
    const message = payload?.error || payload?.message || validationDetails || fallbackMessage;
    throw new Error(message);
  }
  return payload;
}
export async function fetchTickets(filters = {}, options = {}) {
  const response = await fetch(`${API_BASE_URL}/tickets${buildQuery(filters)}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    signal: options.signal
  });
  return handleJsonResponse(response, "Error fetching tickets");
}
export async function fetchRandomTicket(filters = {}) {
  const response = await fetch(`${API_BASE_URL}/tickets/random${buildQuery(filters)}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleJsonResponse(response, "No ticket to process");
}
export async function fetchTicket(ticketId, options = {}) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    signal: options.signal
  });
  return handleJsonResponse(response, "Error fetching ticket");
}
export async function createTicket(ticketData) {
  const response = await fetch(`${API_BASE_URL}/tickets`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(ticketData)
  });
  return handleJsonResponse(response, "Error creating ticket");
}
export async function updateTicket(ticketId, ticketData) {
  const payload = ticketData && typeof ticketData === "object" ? {
    ...ticketData
  } : {};
  if (Object.prototype.hasOwnProperty.call(payload, "progressPercent")) {
    const raw = payload.progressPercent;
    if (raw === null || raw === "" || raw === undefined) {
      payload.progressPercent = null;
    } else {
      const n = Number(raw);
      payload.progressPercent = Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null;
    }
  }
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  return handleJsonResponse(response, "Error updating ticket");
}
export async function consumeTicketSupportCredits(ticketId, {
  debits = [],
  note = null,
  sourceKey = null
} = {}) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/support-credits/consume`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      debits,
      note,
      sourceKey
    })
  });
  return handleJsonResponse(response, "Error consuming support credits");
}
export async function refundTicketSupportCredits(ticketId, {
  refunds = [],
  refundAll = false,
  note = null,
  sourceKey = null
} = {}) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/support-credits/refund`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      refunds,
      refundAll,
      note,
      sourceKey
    })
  });
  return handleJsonResponse(response, "Error refunding support credits");
}
export async function updateTicketStatus(ticketId, status, note = "", options = {}) {
  const {
    consumeSupportCredit,
    refundSupportCredit,
    supportCreditDebits
  } = options;
  const body = {
    status,
    note
  };
  if (consumeSupportCredit !== undefined) body.consumeSupportCredit = consumeSupportCredit;
  if (refundSupportCredit !== undefined) body.refundSupportCredit = refundSupportCredit;
  if (Array.isArray(supportCreditDebits) && supportCreditDebits.length > 0) {
    body.supportCreditDebits = supportCreditDebits;
  }
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/status`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  return handleJsonResponse(response, "Error updating status");
}
export async function resolveTicketWithValidation(ticketId, {
  reason,
  interventionType,
  actionType,
  consumeSupportCredit = false,
  supportCreditDebits = null
} = {}) {
  const body = {
    reason,
    interventionType,
    actionType,
    consumeSupportCredit
  };
  if (Array.isArray(supportCreditDebits) && supportCreditDebits.length > 0) {
    body.supportCreditDebits = supportCreditDebits;
  }
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/resolve-with-validation`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  return handleJsonResponse(response, "Error resolving ticket");
}
export async function fetchSolutionCatalog({
  category = "",
  includeInactive = false
} = {}) {
  const response = await fetch(`${API_BASE_URL}/tickets/solution-catalog${buildQuery({
    category,
    includeInactive: includeInactive ? "true" : ""
  })}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleJsonResponse(response, "Error loading solution catalog");
}
export async function createSolutionCatalogEntry(payload) {
  const response = await fetch(`${API_BASE_URL}/tickets/solution-catalog`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload || {})
  });
  return handleJsonResponse(response, "Error creating catalog entry");
}
export async function updateSolutionCatalogEntry(entryId, payload) {
  const response = await fetch(`${API_BASE_URL}/tickets/solution-catalog/${entryId}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload || {})
  });
  return handleJsonResponse(response, "Error updating catalog entry");
}
export async function deleteSolutionCatalogEntry(entryId) {
  const response = await fetch(`${API_BASE_URL}/tickets/solution-catalog/${entryId}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleJsonResponse(response, "Error deleting catalog entry");
}
export async function addTicketComment(ticketId, content, isInternal = false) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/comments`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      content,
      isInternal
    })
  });
  return handleJsonResponse(response, "Error adding comment");
}
export async function updateTicketComment(ticketId, commentId, content, {
  removeAttachmentIds = [],
  removeAttachmentPaths = [],
  isInternal
} = {}) {
  const payload = {
    content,
    removeAttachmentIds: Array.isArray(removeAttachmentIds) ? removeAttachmentIds : [],
    removeAttachmentPaths: Array.isArray(removeAttachmentPaths) ? removeAttachmentPaths : []
  };
  if (typeof isInternal === "boolean") {
    payload.isInternal = isInternal;
  }
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/comments/${commentId}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  return handleJsonResponse(response, "Error updating comment");
}
export async function deleteTicketComment(ticketId, commentId) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/comments/${commentId}`, {
    method: "DELETE",
    credentials: "include"
  });
  return handleJsonResponse(response, "Error deleting comment");
}
export async function addTicketCommentWithAttachments(ticketId, {
  content,
  isInternal = false,
  files = []
}) {
  const formData = new FormData();
  formData.set("content", content || "");
  formData.set("isInternal", String(Boolean(isInternal)));
  files.forEach(file => {
    formData.append("attachments", file);
  });
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/comments`, {
    method: "POST",
    credentials: "include",
    body: formData
  });
  return handleJsonResponse(response, "Error adding comment");
}
export async function uploadTicketTaskAttachments(ticketId, taskId, files = []) {
  const formData = new FormData();
  (Array.isArray(files) ? files : []).forEach(file => {
    formData.append("attachments", file);
  });
  const response = await fetch(
    `${API_BASE_URL}/tickets/${ticketId}/tasks/${encodeURIComponent(String(taskId))}/attachments`,
    {
      method: "POST",
      credentials: "include",
      body: formData
    }
  );
  return handleJsonResponse(response, "Error uploading task documents");
}
export async function deleteTicketAttachment(ticketId, attachmentId) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/attachments/${attachmentId}`, {
    method: "DELETE",
    credentials: "include"
  });
  return handleJsonResponse(response, "Error deleting attachment");
}
export async function addTicketTag(ticketId, label, color) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/tags`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      label,
      color
    })
  });
  return handleJsonResponse(response, "Error adding tag");
}
export async function fetchTicketTags(options = {}) {
  const params = new URLSearchParams();
  if (options.search) params.set("search", String(options.search));
  if (options.limit != null) params.set("limit", String(options.limit));
  const qs = params.toString();
  const response = await fetch(`${API_BASE_URL}/tickets/tags${qs ? `?${qs}` : ""}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    signal: options.signal
  });
  return handleJsonResponse(response, "Error loading ticket tags");
}
export async function removeTicketTag(ticketId, tagId) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/tags/${tagId}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleJsonResponse(response, "Error deleting tag");
}
export async function addTicketWatcher(ticketId, userId) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/watchers`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      userId
    })
  });
  return handleJsonResponse(response, "Error adding follower");
}
export async function removeTicketWatcher(ticketId, userId) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/watchers/${userId}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleJsonResponse(response, "Error removing follower");
}
export async function addTicketAssignee(ticketId, userId) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/assignees`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      userId
    })
  });
  return handleJsonResponse(response, "Error adding assignee");
}
export async function removeTicketAssignee(ticketId, userId) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/assignees/${userId}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleJsonResponse(response, "Error removing assignee");
}
export async function deleteTicket(ticketId) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleJsonResponse(response, "Error deleting ticket");
}
export async function bulkUpdateTickets(payload) {
  const response = await fetch(`${API_BASE_URL}/tickets/bulk`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  return handleJsonResponse(response, "Error performing bulk ticket action");
}
export async function restoreTicket(ticketId) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/restore`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleJsonResponse(response, "Error restoring ticket");
}
export async function permanentlyDeleteTicket(ticketId) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/purge`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleJsonResponse(response, "Error permanently deleting");
}
export async function createTicketValidationRequest(ticketId, {
  validatorUserId,
  message = ""
} = {}) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/validation-requests`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      validatorUserId,
      message
    })
  });
  return handleJsonResponse(response, "Error creating validation request");
}
export async function updateTicketValidationRequest(ticketId, requestId, {
  validatorUserId,
  message = ""
} = {}) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/validation-requests/${requestId}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      validatorUserId,
      message
    })
  });
  return handleJsonResponse(response, "Error updating validation request");
}
export async function respondTicketValidationRequest(ticketId, requestId, {
  decision,
  responseMessage = ""
} = {}) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/validation-requests/${requestId}/respond`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      decision,
      responseMessage
    })
  });
  return handleJsonResponse(response, "Error responding to validation request");
}
export async function fetchDeletedTickets(filters = {}) {
  const query = buildQuery(filters);
  const primary = await fetch(`${API_BASE_URL}/tickets/trash${query}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  if (primary.ok) return handleJsonResponse(primary, "Error fetching trash");
  if (primary.status !== 404) {
    return handleJsonResponse(primary, "Error fetching trash");
  }
  const fallback = await fetch(`${API_BASE_URL}/tickets${buildQuery({
    ...filters,
    deleted: true
  })}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleJsonResponse(fallback, "Error fetching trash");
}
export async function addLinkedTicket(ticketId, linkedTicketId, relation = "related") {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/links`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      linkedTicketId,
      relation
    })
  });
  return handleJsonResponse(response, "Error adding linked ticket");
}
export async function removeLinkedTicket(ticketId, linkId) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/links/${linkId}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleJsonResponse(response, "Error removing linked ticket");
}
export async function fetchTicketCategories(options = {}) {
  const response = await fetch(`${API_BASE_URL}/tickets/categories`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    signal: options.signal
  });
  return handleJsonResponse(response, "Error fetching ITIL categories");
}
export async function fetchSalesTicketCategories() {
  const response = await fetch(`${API_BASE_URL}/tickets/sales-categories`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleJsonResponse(response, "Error fetching service categories");
}
export async function createSalesTicketCategory(payload) {
  const response = await fetch(`${API_BASE_URL}/tickets/sales-categories`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload || {})
  });
  return handleJsonResponse(response, "Error creating service category");
}
export async function updateSalesTicketCategory(categoryId, payload) {
  const response = await fetch(`${API_BASE_URL}/tickets/sales-categories/${encodeURIComponent(String(categoryId || ""))}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload || {})
  });
  return handleJsonResponse(response, "Error updating service category");
}
export async function deleteSalesTicketCategory(categoryId) {
  const response = await fetch(`${API_BASE_URL}/tickets/sales-categories/${encodeURIComponent(String(categoryId || ""))}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleJsonResponse(response, "Error deleting service category");
}
export async function fetchSalesTicketCategorySections() {
  const response = await fetch(`${API_BASE_URL}/tickets/sales-categories/sections`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleJsonResponse(response, "Error fetching service category sections");
}
export async function createSalesTicketCategorySection(payload) {
  const response = await fetch(`${API_BASE_URL}/tickets/sales-categories/sections`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload || {})
  });
  return handleJsonResponse(response, "Error creating service category section");
}
export async function updateSalesTicketCategorySection(sectionId, payload) {
  const response = await fetch(`${API_BASE_URL}/tickets/sales-categories/sections/${encodeURIComponent(String(sectionId || ""))}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload || {})
  });
  return handleJsonResponse(response, "Error updating service category section");
}
export async function deleteSalesTicketCategorySection(sectionId) {
  const response = await fetch(`${API_BASE_URL}/tickets/sales-categories/sections/${encodeURIComponent(String(sectionId || ""))}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleJsonResponse(response, "Error deleting service category section");
}
export async function createTicketCategory(payload) {
  const response = await fetch(`${API_BASE_URL}/tickets/categories`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload || {})
  });
  return handleJsonResponse(response, "Error creating ITIL category");
}
export async function updateTicketCategory(categoryId, payload) {
  const response = await fetch(`${API_BASE_URL}/tickets/categories/${encodeURIComponent(String(categoryId || ""))}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload || {})
  });
  return handleJsonResponse(response, "Error updating ITIL category");
}
export async function deleteTicketCategory(categoryId) {
  const response = await fetch(`${API_BASE_URL}/tickets/categories/${encodeURIComponent(String(categoryId || ""))}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleJsonResponse(response, "Error deleting ITIL category");
}
export async function fetchTicketCategorySections() {
  const response = await fetch(`${API_BASE_URL}/tickets/category-sections`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleJsonResponse(response, "Error fetching ITIL sections");
}
export async function createTicketCategorySection(payload) {
  const response = await fetch(`${API_BASE_URL}/tickets/category-sections`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload || {})
  });
  return handleJsonResponse(response, "Error creating ITIL section");
}
export async function updateTicketCategorySection(sectionId, payload) {
  const response = await fetch(`${API_BASE_URL}/tickets/category-sections/${encodeURIComponent(String(sectionId || ""))}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload || {})
  });
  return handleJsonResponse(response, "Error updating ITIL section");
}
export async function deleteTicketCategorySection(sectionId) {
  const response = await fetch(`${API_BASE_URL}/tickets/category-sections/${encodeURIComponent(String(sectionId || ""))}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleJsonResponse(response, "Error deleting ITIL section");
}
export async function fetchTicketViews(pageScope = "ticket", options = {}) {
  const response = await fetch(`${API_BASE_URL}/tickets/views${buildQuery({
    pageScope
  })}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    signal: options.signal
  });
  return handleJsonResponse(response, "Error fetching ticket views");
}
export async function fetchTicketViewCounts({
  pageScope = "ticket",
  viewId = "",
  search = "",
  ticketType = "",
  scope = "all",
  signal
} = {}) {
  const response = await fetch(`${API_BASE_URL}/tickets/views/counts${buildQuery({
    pageScope,
    viewId,
    search,
    ticketType,
    scope
  })}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    signal
  });
  return handleJsonResponse(response, "Error counting ticket views");
}
export function buildTicketSearchPayload({
  viewRules,
  viewMode = "active",
  status = "",
  ticketType = "",
  ticketFamily = "support",
  search = "",
  sortBy = "updated_at",
  sortDirection = "desc",
  limit = 25,
  offset = 0
} = {}) {
  const payload = {
    viewMode,
    status,
    ticketType,
    ticketFamily,
    search,
    sortBy,
    sortDirection,
    limit,
    offset
  };
  if (viewRules != null && typeof viewRules === "object") {
    payload.viewRules = viewRules;
  }
  return payload;
}
export async function searchTickets(payload = {}, signal) {
  const response = await fetch(`${API_BASE_URL}/tickets/search`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(buildTicketSearchPayload(payload)),
    signal
  });
  return handleJsonResponse(response, "Error searching tickets");
}
export async function fetchAllMatchingTickets(payload = {}, {
  pageSize = 100,
  maxItems = 10000
} = {}) {
  const safePageSize = Math.min(Math.max(Number(pageSize) || 100, 1), 100);
  let offset = 0;
  let total = Infinity;
  const items = [];
  while (offset < total && items.length < maxItems) {
    const page = await searchTickets({
      ...payload,
      limit: safePageSize,
      offset
    });
    const rows = Array.isArray(page?.items) ? page.items : [];
    total = Number(page?.total ?? rows.length);
    items.push(...rows);
    if (rows.length === 0) break;
    offset += rows.length;
  }
  return {
    items: items.slice(0, maxItems),
    total,
    truncated: items.length >= maxItems
  };
}
export async function fetchAdminTicketViews(pageScope = "ticket") {
  const response = await fetch(`${API_BASE_URL}/tickets/views/admin${buildQuery({
    pageScope
  })}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleJsonResponse(response, "Error fetching ticket views");
}
export async function createTicketView(payload) {
  const response = await fetch(`${API_BASE_URL}/tickets/views`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload || {})
  });
  return handleJsonResponse(response, "Error creating view");
}
export async function updateTicketView(viewId, payload) {
  const response = await fetch(`${API_BASE_URL}/tickets/views/${viewId}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload || {})
  });
  return handleJsonResponse(response, "Error updating view");
}
export async function deleteTicketView(viewId) {
  const response = await fetch(`${API_BASE_URL}/tickets/views/${viewId}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleJsonResponse(response, "Error deleting view");
}
export async function fetchSalesForms(options = {}) {
  const params = new URLSearchParams();
  if (options.kind) params.set("kind", options.kind);
  if (options.includeDisabled) params.set("includeDisabled", "true");
  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`${API_BASE_URL}/tickets/sales-forms${query}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    signal: options.signal
  });
  return handleJsonResponse(response, "Error fetching sales forms");
}
export async function createSalesForm(payload) {
  const response = await fetch(`${API_BASE_URL}/tickets/sales-forms`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload || {})
  });
  return handleJsonResponse(response, "Error creating form");
}
export async function fetchSalesForm(formId, options = {}) {
  const response = await fetch(`${API_BASE_URL}/tickets/sales-forms/${encodeURIComponent(String(formId || ""))}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    signal: options.signal
  });
  return handleJsonResponse(response, "Error fetching sales form");
}
export async function updateSalesForm(formId, payload) {
  const response = await fetch(`${API_BASE_URL}/tickets/sales-forms/${encodeURIComponent(String(formId))}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload || {})
  });
  return handleJsonResponse(response, "Error updating form");
}
export async function deleteSalesForm(formId) {
  const response = await fetch(`${API_BASE_URL}/tickets/sales-forms/${encodeURIComponent(String(formId))}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleJsonResponse(response, "Error deleting form");
}
export async function createSalesFormField(formId, payload) {
  const response = await fetch(`${API_BASE_URL}/tickets/sales-forms/${encodeURIComponent(String(formId))}/fields`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload || {})
  });
  return handleJsonResponse(response, "Error creating field");
}
export async function updateSalesFormField(formId, fieldId, payload) {
  const response = await fetch(`${API_BASE_URL}/tickets/sales-forms/${encodeURIComponent(String(formId))}/fields/${encodeURIComponent(String(fieldId))}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload || {})
  });
  return handleJsonResponse(response, "Error updating field");
}
export async function deleteSalesFormField(formId, fieldId) {
  const response = await fetch(`${API_BASE_URL}/tickets/sales-forms/${encodeURIComponent(String(formId))}/fields/${encodeURIComponent(String(fieldId))}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleJsonResponse(response, "Error deleting field");
}
export async function fetchSupportForms(options = {}) {
  const params = new URLSearchParams();
  if (options.kind) params.set("kind", options.kind);
  if (options.includeDisabled) params.set("includeDisabled", "true");
  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`${API_BASE_URL}/tickets/support-forms${query}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    signal: options.signal
  });
  return handleJsonResponse(response, "Error fetching support forms");
}
export async function createSupportForm(payload) {
  const response = await fetch(`${API_BASE_URL}/tickets/support-forms`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload || {})
  });
  return handleJsonResponse(response, "Error creating support form");
}
export async function fetchSupportForm(formId, options = {}) {
  const response = await fetch(`${API_BASE_URL}/tickets/support-forms/${encodeURIComponent(String(formId || ""))}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    signal: options.signal
  });
  return handleJsonResponse(response, "Error fetching support form");
}
export async function updateSupportForm(formId, payload) {
  const response = await fetch(`${API_BASE_URL}/tickets/support-forms/${encodeURIComponent(String(formId))}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload || {})
  });
  return handleJsonResponse(response, "Error updating support form");
}
export async function deleteSupportForm(formId) {
  const response = await fetch(`${API_BASE_URL}/tickets/support-forms/${encodeURIComponent(String(formId))}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleJsonResponse(response, "Error deleting support form");
}
export async function createSupportFormField(formId, payload) {
  const response = await fetch(`${API_BASE_URL}/tickets/support-forms/${encodeURIComponent(String(formId))}/fields`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload || {})
  });
  return handleJsonResponse(response, "Error creating support form field");
}
export async function updateSupportFormField(formId, fieldId, payload) {
  const response = await fetch(`${API_BASE_URL}/tickets/support-forms/${encodeURIComponent(String(formId))}/fields/${encodeURIComponent(String(fieldId))}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload || {})
  });
  return handleJsonResponse(response, "Error updating support form field");
}
export async function deleteSupportFormField(formId, fieldId) {
  const response = await fetch(`${API_BASE_URL}/tickets/support-forms/${encodeURIComponent(String(formId))}/fields/${encodeURIComponent(String(fieldId))}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleJsonResponse(response, "Error deleting support form field");
}
export async function fetchTicketSatisfied(filters = {}, options = {}) {
  const response = await fetch(`${API_BASE_URL}/tickets/satisfactions${buildQuery(filters)}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    signal: options.signal
  });
  return handleJsonResponse(response, "Error fetching customer feedback");
}
export async function fetchTicketSatisfactionCounts(options = {}) {
  const response = await fetch(`${API_BASE_URL}/tickets/satisfactions/counts`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    signal: options.signal
  });
  return handleJsonResponse(response, "Error counting customer feedback");
}
export async function fetchTicketTableColumns(pageScope = "ticket", options = {}) {
  const params = new URLSearchParams();
  if (pageScope && pageScope !== "ticket") params.set("pageScope", pageScope);
  const qs = params.toString();
  const response = await fetch(`${API_BASE_URL}/tickets/table-columns${qs ? `?${qs}` : ""}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    signal: options.signal
  });
  return handleJsonResponse(response, "Error loading table columns");
}

export async function savePublicTicketTableColumns(columns, pageScope = "ticket") {
  const response = await fetch(`${API_BASE_URL}/tickets/table-columns/public`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ columns, pageScope })
  });
  return handleJsonResponse(response, "Error saving public columns");
}

export async function savePrivateTicketTableColumns(columns, pageScope = "ticket") {
  const response = await fetch(`${API_BASE_URL}/tickets/table-columns/private`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ columns, pageScope })
  });
  return handleJsonResponse(response, "Error saving private columns");
}

export async function clearPrivateTicketTableColumns(pageScope = "ticket") {
  const params = new URLSearchParams();
  if (pageScope && pageScope !== "ticket") params.set("pageScope", pageScope);
  const qs = params.toString();
  const response = await fetch(`${API_BASE_URL}/tickets/table-columns/private${qs ? `?${qs}` : ""}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ pageScope })
  });
  return handleJsonResponse(response, "Error resetting private columns");
}
