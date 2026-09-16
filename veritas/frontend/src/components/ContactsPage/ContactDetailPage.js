import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { fetchClientsList, addContactTag, removeContactTag, deleteContact, addContactMembership, removeContactMembership } from "../../api/clients";
import { fetchTickets } from "../../api/tickets";
import { fetchEvents } from "../../api/events";
import { filterUpcomingEvents } from "../../utils/eventFilters";
import styles from "../EnterprisesPage/EnterpriseDetailPage.module.css";
import pageLayout from "../EnterprisesPage/EnterprisesPage.module.css";
import contactStyles from "./ContactDetailPage.module.css";
import SmartTooltip from "../SmartTooltip";
import StatusDot from "../shared/StatusDot/StatusDot";
import SubscribeBellButton from "../shared/SubscribeBellButton/SubscribeBellButton";
import ClientTicketBookmarks from "./ClientTicketBookmarks";
import { getClientNumber, getClientNameWithoutCode } from "../../utils/clientDisplay";
import { getContactSexeIcon, normalizeContactSexe } from "../../utils/contactSexe";
import { FaTimes, FaPlus } from "react-icons/fa";
import API_BASE_URL from "../../config";
import ContactPortalSection from "./ContactPortalSection";
import VaultSecretsPanel from "../EnterprisesPage/VaultSecretsPanel";
import ContactFormModal from "./ContactFormModal";
import ContactCompanyModal from "./ContactCompanyModal";
import ContactDeleteModal from "./ContactDeleteModal";
import ClientTagModal from "../EnterprisesPage/ClientTagModal";
import { formatTableDate } from "../../utils/tableDateFormat";
import { useVeritasEdition } from "../../hooks/useVeritasEdition";
import { usePermissions } from "../../contexts/PermissionsContext";
import { useAppFormatters, useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getContactDetailCopy, getContactStatusLocalized, getPrestationCategoryLabel as getPrestationCategoryLabelI18n, getTicketStatusLabels, formatContactRelativeTime, interpolate } from "./contactDetailI18n";
import { getCommunicationTypeDefLocalized, getContactSexeLabelLocalized } from "./contactFormModalI18n";
import ProFeatureLock from "../Misc/ProFeature/ProFeatureLock";
import ProFeatureBadge from "../Misc/ProFeature/ProFeatureBadge";
import { isSalesTicket } from "../../utils/salesTicketUtils";
import ProFeaturePromoModal from "../Misc/ProFeature/ProFeaturePromoModal";
import { setProFeaturePromoHandler } from "../Misc/ProFeature/proFeatureUtils";
import { normalizeContactCommunications, sortCommunicationsByType } from "../../utils/contactCommunications";
import PageGuideTour from "../PageGuide/PageGuideTour";
import { getContactDetailGuideSteps } from "../PageGuide/contactDetailGuideSteps";
import { useRegisterPageGuide } from "../../hooks/useRegisterPageGuide";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
const normalizePhone = value => {
  let normalized = (value || "").toString().trim();
  if (normalized.startsWith("'")) {
    normalized = normalized.slice(1);
  }
  return normalized.replace(/[^\d+]/g, "");
};
const toTelHref = value => {
  const normalized = normalizePhone(value);
  return normalized ? `tel:${normalized}` : "";
};
const toMailtoHref = value => {
  const email = (value || "").toString().trim();
  return email ? `mailto:${encodeURIComponent(email)}` : "";
};
function getContactInitials(contact) {
  const prenom = (contact?.prenom || "").trim();
  const nom = (contact?.nom || "").trim();
  if (prenom && nom) return `${prenom[0]}${nom[0]}`.toUpperCase();
  return (nom || prenom || "-").slice(0, 2).toUpperCase();
}
function formatContactName(contact, fallback = "Contact") {
  const prenom = (contact?.prenom || "").trim();
  const nom = (contact?.nom || "").trim();
  if (prenom && nom) return `${prenom} ${nom}`;
  return nom || prenom || fallback;
}
const DEMO_PRESTATION_TICKETS = [{
  id: "demo-prestation-1",
  ticket_number: "1284",
  category: "prestation-intervention-site",
  status: "new",
  created_at: new Date(Date.now() - 86400000 * 3).toISOString()
}, {
  id: "demo-prestation-2",
  ticket_number: "1271",
  category: "prestation-formation",
  status: "in_progress",
  created_at: new Date(Date.now() - 86400000 * 8).toISOString()
}];
function buildDemoUpcomingEvents() {
  const now = new Date();
  const start1 = new Date(now);
  start1.setDate(start1.getDate() + 2);
  start1.setHours(10, 0, 0, 0);
  const end1 = new Date(start1);
  end1.setHours(12, 0, 0, 0);
  const start2 = new Date(now);
  start2.setDate(start2.getDate() + 5);
  start2.setHours(14, 30, 0, 0);
  const end2 = new Date(start2);
  end2.setHours(16, 0, 0, 0);
  return [{
    id: "demo-event-1",
    type: "intervention",
    title: "Intervention sur site",
    start: start1.toISOString(),
    end: end1.toISOString()
  }, {
    id: "demo-event-2",
    type: "maintenance_preventive",
    title: "Maintenance serveurs",
    start: start2.toISOString(),
    end: end2.toISOString()
  }];
}
const DEMO_UPCOMING_EVENTS = buildDemoUpcomingEvents();
const isPrestationTicket = ticket => isSalesTicket(ticket);
const normalizeTicketStatus = status => status === "open" ? "new" : status;
const isOpenTicket = ticket => {
  const status = normalizeTicketStatus(ticket?.status);
  return !["resolved", "closed"].includes(status);
};
const getPrestationCategoryLabel = (category, locale) => getPrestationCategoryLabelI18n(category, locale);
const formatShortDate = (value, formatDate) => {
  if (!value) return "-";
  if (formatDate) return formatDate(value);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};
const sortTicketsByRecent = (a, b) => {
  const aTime = new Date(a?.updated_at || a?.created_at || 0).getTime();
  const bTime = new Date(b?.updated_at || b?.created_at || 0).getTime();
  return bTime - aTime;
};
export default function ContactDetailPage({
  onNavigate,
  contactData
}) {
  const {
    contactId: urlContactId
  } = useParams();
  const locale = useAppLocale();
  const copy = useMemo(() => getContactDetailCopy(locale), [locale]);
  const ticketStatusLabels = useMemo(() => getTicketStatusLabels(locale), [locale]);
  const {
    formatDate
  } = useAppFormatters();
  const formatRelativeTime = useCallback(value => formatContactRelativeTime(value, locale, formatDate), [locale, formatDate]);
  const {
    isCommunity
  } = useVeritasEdition();
  const {
    can
  } = usePermissions();
  const canEditContact = can("contacts_detail.edit");
  const canDeleteContact = can("contacts_detail.delete");
  const canManagePortal = can("contacts_detail.portal");
  const canAccessSharing = can("contacts_detail.access_sharing");
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [client, setClient] = useState(null);
  const [allClients, setAllClients] = useState([]);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactActionsMenuOpen, setContactActionsMenuOpen] = useState(false);
  const [deleteContactModalOpen, setDeleteContactModalOpen] = useState(false);
  const [deletingContact, setDeletingContact] = useState(false);
  const [proPromoFeature, setProPromoFeature] = useState(null);
  const [pageGuideOpen, setPageGuideOpen] = useState(false);
  const openPageGuide = useCallback(() => setPageGuideOpen(true), []);
  useRegisterPageGuide(openPageGuide);
  const loadControllerRef = useRef(null);
  const clientsListControllerRef = useRef(null);
  const contactActionsMenuRef = useRef(null);
  const isMountedRef = useRef(true);
  const loadRequestIdRef = useRef(0);
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    sexe: "",
    email: "",
    telephone: "",
    poste: "",
    statut: "actif",
    client_id: null
  });
  const [contactTags, setContactTags] = useState([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [shareAccessCreateOpen, setShareAccessCreateOpen] = useState(false);
  const [vaultClientId, setVaultClientId] = useState(null);
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [membershipBusy, setMembershipBusy] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [addingTag, setAddingTag] = useState(false);
  const [supportTickets, setSupportTickets] = useState([]);
  const [prestationTickets, setPrestationTickets] = useState([]);
  const [clientTickets, setClientTickets] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const activityControllerRef = useRef(null);
  const displayCommunications = useMemo(() => sortCommunicationsByType(normalizeContactCommunications(contact || {})), [contact]);
  const contactCompanies = useMemo(() => {
    const linked = Array.isArray(contact?.clients) ? contact.clients : [];
    if (linked.length > 0) {
      return linked.map(row => ({
        id: row.id ?? row.client_id,
        name: row.name || row.client_name || `Client #${row.id ?? row.client_id}`,
        poste: row.poste || "",
        is_primary: Boolean(row.is_primary)
      })).filter(row => row.id != null);
    }
    if (contact?.client_id || client?.id) {
      return [{
        id: contact?.client_id || client?.id,
        name: contact?.client_name || client?.name || `Client #${contact?.client_id || client?.id}`,
        poste: contact?.poste || "",
        is_primary: true
      }];
    }
    return [];
  }, [contact, client]);
  const openSupportCount = useMemo(() => supportTickets.filter(isOpenTicket).length, [supportTickets]);
  const clientSupportTickets = useMemo(() => clientTickets.filter(ticket => !isPrestationTicket(ticket)), [clientTickets]);
  const openClientTickets = useMemo(() => clientSupportTickets.filter(isOpenTicket).sort(sortTicketsByRecent), [clientSupportTickets]);
  const closedClientTickets = useMemo(() => clientSupportTickets.filter(ticket => !isOpenTicket(ticket)).sort(sortTicketsByRecent).slice(0, 12), [clientSupportTickets]);
  const canCreateTicket = Boolean(contact?.id && (client?.id || contact?.client_id || formData.client_id || contactCompanies.length > 0));
  const contactGuideSteps = useMemo(() => {
    const steps = getContactDetailGuideSteps(locale);
    if (contact?.id && (contact?.client_id || contactCompanies.length > 0)) return steps;
    return steps.filter(step => step.target !== '[data-guide="contact-shared-access"]');
  }, [locale, contact?.id, contact?.client_id, contactCompanies.length]);
  useEffect(() => {
    const preferred = contact?.client_id || contactCompanies[0]?.id || null;
    setVaultClientId(prev => {
      if (prev && contactCompanies.some(c => String(c.id) === String(prev))) return prev;
      return preferred;
    });
  }, [contact?.client_id, contactCompanies]);
  const availableCompaniesToAdd = useMemo(() => {
    const linkedIds = new Set(contactCompanies.map(c => String(c.id)));
    return allClients.filter(c => !linkedIds.has(String(c.id)));
  }, [allClients, contactCompanies]);
  const buildContactSharePayload = () => {
    const fullName = formatContactName(contact, copy.defaultName);
    const entreprise = contactCompanies.map(c => c.name).filter(Boolean).join(", ") || (client?.name || contact?.client_name || "").toString().trim();
    const telephone = (contact?.telephone || "").toString().trim();
    const email = (contact?.email || "").toString().trim();
    const poste = (contact?.poste || "").toString().trim();
    const lines = copy.share.lines;
    const payloadLines = [`${lines.contact}: ${fullName}`, entreprise ? `${lines.enterprise}: ${entreprise}` : null, poste ? `${lines.role}: ${poste}` : null, telephone ? `${lines.phone}: ${telephone}` : null, email ? `${lines.email}: ${email}` : null].filter(Boolean);
    return {
      title: interpolate(copy.share.title, {
        name: fullName
      }),
      text: payloadLines.join("\n")
    };
  };
  const handleShareContact = async () => {
    const payload = buildContactSharePayload();
    try {
      if (navigator?.share) {
        await navigator.share({
          title: payload.title,
          text: payload.text
        });
        return;
      }
      toast.info(copy.share.unavailable);
    } catch {
      toast.info(copy.share.cancelled);
    }
  };
  const handleCopyContact = async () => {
    const payload = buildContactSharePayload();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload.text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = payload.text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      toast.success(copy.toast.cardCopied);
    } catch {
      toast.error(copy.toast.cardCopyError);
    }
  };
  const copyCoordValue = async (value, label) => {
    const raw = (value || "").toString().trim();
    if (!raw) {
      toast.info(interpolate(copy.clipboard.unavailable, {
        label
      }));
      return;
    }
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(raw);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = raw;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      toast.success(interpolate(copy.clipboard.copied, {
        label
      }));
    } catch {
      toast.error(interpolate(copy.clipboard.copyFailed, {
        label: label.toLowerCase()
      }));
    }
  };
  useEffect(() => {
    isMountedRef.current = true;
    const contactIdToUse = contactData?.contactId || contactData?.id || urlContactId;
    if (contactIdToUse) {
      const controller = createTrackedAbortController();
      loadControllerRef.current?.abort();
      loadControllerRef.current = controller;
      loadContactData(controller.signal);
    }
    return () => {
      isMountedRef.current = false;
      loadControllerRef.current?.abort();
      clientsListControllerRef.current?.abort();
      activityControllerRef.current?.abort();
    };
  }, [urlContactId, contactData?.contactId, contactData?.id]);
  useEffect(() => {
    setProFeaturePromoHandler(featureKey => setProPromoFeature(featureKey));
    return () => setProFeaturePromoHandler(null);
  }, []);
  useEffect(() => {
    const handleVisibilityChange = () => {
      const contactIdToUse = contactData?.contactId || contactData?.id || urlContactId;
      if (document.visibilityState === "visible" && contactIdToUse) {
        const controller = createTrackedAbortController();
        loadControllerRef.current?.abort();
        loadControllerRef.current = controller;
        loadContactData(controller.signal);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [urlContactId, contactData?.contactId, contactData?.id]);
  useEffect(() => {
    if (!contact?.client_id || allClients.length === 0) return;
    const fullClient = allClients.find(item => item.id === contact.client_id);
    if (fullClient) setClient(fullClient);
  }, [contact?.client_id, allClients]);
  useEffect(() => {
    if (!contact?.client_id) return;
    ensureClientsLoaded();
  }, [contact?.client_id]);
  useEffect(() => {
    if (!contactActionsMenuOpen) return undefined;
    const handleClickOutside = event => {
      if (contactActionsMenuRef.current && !contactActionsMenuRef.current.contains(event.target)) {
        setContactActionsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [contactActionsMenuOpen]);
  const handleAddContactTag = async ({
    label,
    color
  }) => {
    const trimmed = String(label || "").trim();
    if (!trimmed || !contact?.id || addingTag) return;
    setAddingTag(true);
    try {
      const tag = await addContactTag(contact.id, {
        label: trimmed,
        color
      });
      setContactTags(prev => {
        if (prev.some(t => t.id === tag.id)) return prev;
        return [...prev, tag].sort((a, b) => a.label.localeCompare(b.label));
      });
      setTagModalOpen(false);
      window.dispatchEvent(new Event("refreshContacts"));
      toast.success(copy.toast.tagAdded);
    } catch (error) {
      console.error("Error adding tag:", error);
      toast.error(error.message || copy.toast.tagAddError);
    } finally {
      setAddingTag(false);
    }
  };
  const handleRemoveContactTag = async tagId => {
    if (!contact?.id) return;
    try {
      await removeContactTag(contact.id, tagId);
      setContactTags(prev => prev.filter(t => t.id !== tagId));
      window.dispatchEvent(new Event("refreshContacts"));
      toast.success(copy.toast.tagRemoved);
    } catch (error) {
      console.error("Error removing tag:", error);
      toast.error(error.message || copy.toast.tagRemoveError);
    }
  };
  const ensureClientsLoaded = async () => {
    if (allClients.length > 0) return true;
    clientsListControllerRef.current?.abort();
    const controller = createTrackedAbortController();
    clientsListControllerRef.current = controller;
    setClientsLoading(true);
    try {
      const clientsData = await fetchClientsList({
        signal: controller.signal
      });
      if (controller.signal.aborted || !isMountedRef.current) return false;
      setAllClients(Array.isArray(clientsData) ? clientsData : []);
      return true;
    } catch (err) {
      if (err?.name === "AbortError") return false;
      console.error("Error fetching clients:", err);
      toast.error(copy.toast.clientsLoadError);
      return false;
    } finally {
      if (isMountedRef.current && clientsListControllerRef.current === controller) {
        setClientsLoading(false);
      }
    }
  };
  const openCompanyModal = () => {
    setCompanyModalOpen(true);
    ensureClientsLoaded();
  };
  const closeCompanyModal = () => {
    if (membershipBusy) return;
    setCompanyModalOpen(false);
  };
  const loadContactData = async signal => {
    const requestId = ++loadRequestIdRef.current;
    const isCurrentRequest = () => loadRequestIdRef.current === requestId && loadControllerRef.current?.signal === signal;
    setLoading(true);
    setError(null);
    setLoadingTags(true);
    try {
      const contactIdToUse = contactData?.contactId || contactData?.id || urlContactId;
      if (!contactIdToUse) {
        setLoading(false);
        return;
      }
      const response = await fetch(`${API_BASE_URL}/contacts/${contactIdToUse}`, {
        credentials: "include",
        signal,
        cache: "no-store"
      });
      if (!response.ok) {
        throw new Error(response.statusText || "Error loading contact");
      }
      const fetchedContact = await response.json();
      if (signal?.aborted || !isMountedRef.current || !isCurrentRequest()) return;
      setContact(fetchedContact);
      setContactTags(Array.isArray(fetchedContact.tags) ? fetchedContact.tags : []);
      if (window.updateTabTitle && fetchedContact.nom) {
        window.updateTabTitle("ContactDetail", {
          contactId: contactIdToUse,
          nom: fetchedContact.nom,
          prenom: fetchedContact.prenom
        });
      }
      const newFormData = {
        nom: fetchedContact.nom || "",
        prenom: fetchedContact.prenom || "",
        sexe: normalizeContactSexe(fetchedContact.sexe) || "",
        email: fetchedContact.email || "",
        telephone: fetchedContact.telephone || "",
        poste: fetchedContact.poste || "",
        statut: fetchedContact.statut || "actif",
        client_id: fetchedContact.client_id || null
      };
      setFormData(newFormData);
      const associatedClient = fetchedContact.client_name || fetchedContact.client_id ? {
        id: fetchedContact.client_id || null,
        name: fetchedContact.client_name || `Client #${fetchedContact.client_id}`
      } : null;
      setClient(associatedClient);
      activityControllerRef.current?.abort();
      const activityController = createTrackedAbortController();
      activityControllerRef.current = activityController;
      loadContactActivity(fetchedContact.id, fetchedContact.client_id, activityController.signal);
    } catch (err) {
      if (err?.name === "AbortError") return;
      setError(err.message || copy.loadError);
      console.error("Error chargement contact:", err);
    } finally {
      if (isCurrentRequest() && isMountedRef.current) {
        setLoading(false);
        setLoadingTags(false);
      }
    }
  };
  const loadContactActivity = async (contactId, clientId, signal) => {
    setLoadingActivity(true);
    try {
      const [contactTicketRows, clientTicketRows, upcomingEventRows] = await Promise.all([fetchTickets({
        requesterContactId: contactId,
        limit: 100
      }).catch(() => []), clientId ? fetchTickets({
        clientId,
        limit: 100,
        signal
      }).catch(() => []) : Promise.resolve([]), !isCommunity && clientId ? fetchEvents({
        clientId,
        upcoming: true,
        limit: 20,
        signal
      }).catch(() => []) : Promise.resolve([])]);
      if (signal?.aborted || !isMountedRef.current) return;
      const tickets = Array.isArray(contactTicketRows) ? contactTicketRows : [];
      const supportOnly = tickets.filter(t => !isPrestationTicket(t));
      setPrestationTickets(isCommunity ? [] : tickets.filter(isPrestationTicket));
      setSupportTickets(supportOnly);
      setClientTickets(Array.isArray(clientTicketRows) ? clientTicketRows : []);
      setUpcomingEvents(filterUpcomingEvents(Array.isArray(upcomingEventRows) ? upcomingEventRows : []));
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error("Error loading contact activity:", err);
      if (isMountedRef.current) {
        setSupportTickets([]);
        setPrestationTickets([]);
        setClientTickets([]);
        setUpcomingEvents([]);
      }
    } finally {
      if (isMountedRef.current) setLoadingActivity(false);
    }
  };
  const handleOpenTicket = (ticket, background = false) => {
    if (!ticket?.id || !onNavigate) return;
    const isSales = isSalesTicket(ticket);
    onNavigate(isSales ? "TicketSalesDetail" : "TicketDetail", {
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number,
      title: ticket.title,
      ...(isSales ? {
        ticketFamily: "sales",
        fromPage: "TicketSales"
      } : {
        ticketFamily: "support",
        fromPage: "Ticket"
      })
    }, background ? {
      background: true
    } : undefined);
  };
  const handleCreateTicket = () => {
    if (!onNavigate || !contact?.id) return;
    const clientId = client?.id || contact?.client_id || formData.client_id;
    if (!clientId) {
      toast.info(copy.toast.createTicketNeedEnterprise);
      return;
    }
    onNavigate("TicketCreate", {
      contactId: contact.id,
      clientId
    });
  };
  const handleOpenTicketList = () => {
    onNavigate?.("Ticket");
  };
  const handleOpenEditModal = async () => {
    setContactActionsMenuOpen(false);
    const ok = await ensureClientsLoaded();
    if (!ok) return;
    setContactModalOpen(true);
  };
  const handleContactModalClose = () => {
    setContactModalOpen(false);
  };
  const handleContactModalSuccess = updated => {
    if (updated?.id) {
      setContact(prev => ({
        ...(prev || {}),
        ...updated,
        tags: Array.isArray(updated.tags) ? updated.tags : prev?.tags || [],
        portal_email: prev?.portal_user_id ? updated.email || prev.portal_email : prev?.portal_email
      }));
      setFormData({
        nom: updated.nom || "",
        prenom: updated.prenom || "",
        sexe: normalizeContactSexe(updated.sexe) || "",
        email: updated.email || "",
        telephone: updated.telephone || "",
        poste: updated.poste || "",
        statut: updated.statut || "actif",
        client_id: updated.client_id ?? null
      });
      if (updated.client_name || updated.client_id || Array.isArray(updated.clients) && updated.clients.length > 0) {
        const primary = Array.isArray(updated.clients) ? updated.clients.find(c => c.is_primary) || updated.clients[0] : null;
        setClient({
          id: updated.client_id ?? primary?.id ?? primary?.client_id ?? null,
          name: updated.client_name || primary?.name || (updated.client_id ? `Client #${updated.client_id}` : "")
        });
      }
    }
    window.dispatchEvent(new Event("refreshContacts"));
  };
  const openEnterprise = (targetClient = null) => {
    const target = targetClient || client;
    if (!onNavigate || !target?.id) return;
    onNavigate("ContratDetail", {
      clientId: target.id,
      name: target.name
    });
  };
  const applyMembershipResult = updatedContact => {
    if (!updatedContact?.id) return;
    setContact(prev => ({
      ...(prev || {}),
      ...updatedContact,
      tags: Array.isArray(updatedContact.tags) ? updatedContact.tags : prev?.tags || []
    }));
    if (updatedContact.client_id || Array.isArray(updatedContact.clients)) {
      const primary = Array.isArray(updatedContact.clients) ? updatedContact.clients.find(c => c.is_primary) || updatedContact.clients[0] : null;
      setClient({
        id: updatedContact.client_id ?? primary?.id ?? primary?.client_id ?? null,
        name: updatedContact.client_name || primary?.name || (updatedContact.client_id ? `Client #${updatedContact.client_id}` : "")
      });
      setFormData(prev => ({
        ...prev,
        client_id: updatedContact.client_id ?? prev.client_id
      }));
    }
    window.dispatchEvent(new Event("refreshContacts"));
  };
  const handleAddCompanyMembership = async clientRow => {
    if (!contact?.id || !clientRow?.id || membershipBusy) return;
    setMembershipBusy(true);
    try {
      const updated = await addContactMembership(contact.id, {
        client_id: clientRow.id
      });
      applyMembershipResult(updated);
      setCompanyModalOpen(false);
      toast.success(copy.toast.membershipAdded);
    } catch (error) {
      toast.error(error.message || copy.toast.membershipError);
    } finally {
      setMembershipBusy(false);
    }
  };
  const handleRemoveCompanyMembership = async clientId => {
    if (!contact?.id || !clientId || membershipBusy) return;
    setMembershipBusy(true);
    try {
      const updated = await removeContactMembership(contact.id, clientId);
      applyMembershipResult(updated);
      toast.success(copy.toast.membershipRemoved);
    } catch (error) {
      toast.error(error.message || copy.toast.membershipError);
    } finally {
      setMembershipBusy(false);
    }
  };
  const openDeleteContactModal = () => {
    setContactActionsMenuOpen(false);
    setDeleteContactModalOpen(true);
  };
  const closeDeleteContactModal = () => {
    if (deletingContact) return;
    setDeleteContactModalOpen(false);
  };
  const confirmDeleteContact = async () => {
    if (!contact?.id || deletingContact) return;
    setDeletingContact(true);
    try {
      await deleteContact(contact.id);
      toast.success(copy.toast.deleted);
      setDeleteContactModalOpen(false);
      window.dispatchEvent(new Event("refreshContacts"));
      if (onNavigate) {
        onNavigate("Contact");
      }
    } catch (error) {
      console.error("Error suppression contact:", error);
      toast.error(error.message || copy.toast.deleteError);
    } finally {
      setDeletingContact(false);
    }
  };
  if (loading) {
    return <div className={`${styles.contratDetailPage} ${styles.enterpriseDetailPage} ${contactStyles.contactDetailPage} msp-page-grid`}>
        <div className={styles.loading}>
          <Icon icon="mdi:loading" className={styles.spinning} />
          <span>{copy.loading}</span>
        </div>
      </div>;
  }
  if (error || !contact) {
    return <div className={`${styles.contratDetailPage} ${styles.enterpriseDetailPage} ${contactStyles.contactDetailPage} msp-page-grid`}>
        <div className={styles.error}>
          <Icon icon="mdi:alert-circle-outline" />
          <span>{error || copy.notFound}</span>
        </div>
      </div>;
  }
  const contactStatus = getContactStatusLocalized(formData.statut, locale);
  const displayName = formatContactName({
    prenom: formData.prenom,
    nom: formData.nom
  }, copy.defaultName);
  const hasCoords = displayCommunications.length > 0;
  return <div className={`${styles.contratDetailPage} ${styles.enterpriseDetailPage} ${contactStyles.contactDetailPage} msp-page-grid`}>
      <header className={styles.pageHero} data-guide="contact-hero">
        <div className={styles.heroRow}>
          <div className={styles.heroMain}>
            <div className={styles.heroAvatar}>
              {getContactInitials(contact)}
            </div>
            <div className={styles.heroText}>
              <h1 className={styles.heroTitle}>
                <span>{displayName}</span>
              </h1>
              <div className={styles.heroMeta} aria-label={copy.heroMetaAria}>
                <span className={`${styles.statusChip} ${contactStatus.status === "active" ? styles.statusChipActive : styles.statusChipInactive}`}>
                  <StatusDot active={contactStatus.status === "active"} />
                  {contactStatus.label}
                </span>
                {formData.poste && <span className={styles.heroMetaItem}>
                    <Icon icon="mdi:briefcase-outline" aria-hidden />
                    {formData.poste}
                  </span>}
                {formData.sexe && <span className={styles.heroMetaItem}>
                    <Icon icon={getContactSexeIcon(formData.sexe)} aria-hidden />
                    {getContactSexeLabelLocalized(formData.sexe, locale)}
                  </span>}
                {contactCompanies.map(company => {
                const listed = allClients.find(c => String(c.id) === String(company.id));
                const code = getClientNumber(listed || company);
                const label = getClientNameWithoutCode(listed || company) || company.name || "";
                return company.id ? <button key={company.id} type="button" className={`${styles.heroMetaItem} ${styles.heroMetaLink}`} onClick={() => openEnterprise({
                  id: company.id,
                  name: company.name
                })} title={copy.viewEnterprise}>
                        <Icon icon="mdi:domain" aria-hidden />
                        {code ? <>
                            <span className={styles.headerClientCode}>{code}</span>
                            {label}
                          </> : label}
                        {company.is_primary ? <span className={styles.sitePreviewPrimary}>{copy.primaryBadge}</span> : null}
                      </button> : <span key={company.name || "company"} className={styles.heroMetaItem}>
                        <Icon icon="mdi:domain" aria-hidden />
                        {label}
                      </span>;
              })}
                {!loadingActivity && <span className={styles.heroMetaItem}>
                    <Icon icon="mdi:ticket-outline" aria-hidden />
                    {openSupportCount === 1 ? interpolate(copy.openTickets, {
                  count: openSupportCount
                }) : interpolate(copy.openTicketsPlural, {
                  count: openSupportCount
                })}
                  </span>}
                {loadingTags ? <span className={styles.heroTagsLoading}>{copy.loadingTags}</span> : <>
                    {contactTags.map(tag => <span key={tag.id} className={styles.heroTagChip} style={{
                  backgroundColor: `${tag.color || "#2b5fab"}18`,
                  borderColor: `${tag.color || "#2b5fab"}55`,
                  color: tag.color || "#2b5fab"
                }}>
                        {tag.label}
                        <button type="button" className={styles.heroTagRemove} onClick={() => handleRemoveContactTag(tag.id)} aria-label={interpolate(copy.removeTagAria, {
                    label: tag.label
                  })}>
                          <FaTimes />
                        </button>
                      </span>)}
                    <div className={styles.heroTagAddWrap}>
                      {canEditContact ? <SmartTooltip content={copy.addTag}>
                        <button type="button" className={styles.heroTagAddTrigger} onClick={() => setTagModalOpen(true)} aria-label={copy.addTag}>
                          <FaPlus />
                        </button>
                      </SmartTooltip> : null}
                    </div>
                  </>}
              </div>
            </div>
          </div>

          <div className={styles.heroActions} ref={contactActionsMenuRef} data-guide="contact-hero-actions">
            <SubscribeBellButton
              entityType="contact"
              entityId={contact?.id || formData?.id}
              subscribeLabel={copy.subscribe?.subscribe || "S’abonner aux notifications"}
              unsubscribeLabel={copy.subscribe?.unsubscribe || "Se désabonner"}
              subscribedToast={copy.subscribe?.subscribedToast || "Abonnement activé"}
              unsubscribedToast={copy.subscribe?.unsubscribedToast || "Abonnement retiré"}
            />
            <SmartTooltip content={copy.actionsMenu}>
              <button type="button" className={styles.heroMenuBtn} onClick={() => setContactActionsMenuOpen(open => !open)} aria-expanded={contactActionsMenuOpen} aria-haspopup="menu" aria-label={copy.actionsMenu}>
                <Icon icon="mdi:dots-horizontal" aria-hidden />
              </button>
            </SmartTooltip>
            {contactActionsMenuOpen && <div className={styles.heroClientMenu} role="menu">
                {canEditContact ? <button type="button" className={styles.heroMenuItem} role="menuitem" onClick={handleOpenEditModal}>
                  <Icon icon="mdi:pencil-outline" aria-hidden />
                  <span>{copy.editContact}</span>
                </button> : null}
                <button type="button" className={styles.heroMenuItem} role="menuitem" onClick={() => {
              setContactActionsMenuOpen(false);
              handleCopyContact();
            }}>
                  <Icon icon="mdi:content-copy" aria-hidden />
                  <span>{copy.copyCard}</span>
                </button>
                <button type="button" className={styles.heroMenuItem} role="menuitem" onClick={() => {
              setContactActionsMenuOpen(false);
              handleShareContact();
            }}>
                  <Icon icon="mdi:share-variant" aria-hidden />
                  <span>{copy.shareCard}</span>
                </button>
                {contactCompanies.length > 0 && <>
                    <div className={styles.heroMenuDivider} role="separator" />
                    {contactCompanies.map(company => <button key={company.id} type="button" className={styles.heroMenuItem} role="menuitem" onClick={() => {
                setContactActionsMenuOpen(false);
                openEnterprise({
                  id: company.id,
                  name: company.name
                });
              }}>
                        <Icon icon="mdi:domain" aria-hidden />
                        <span>{company.name || copy.viewEnterprise}</span>
                      </button>)}
                  </>}
                {canDeleteContact ? <>
                <div className={styles.heroMenuDivider} role="separator" />
                <button type="button" className={`${styles.heroMenuItem} ${styles.heroMenuItemDanger}`} role="menuitem" onClick={openDeleteContactModal} disabled={deletingContact}>
                  <Icon icon="mdi:trash-can-outline" aria-hidden />
                  <span>{deletingContact ? copy.deleting : copy.deleteContact}</span>
                </button>
                </> : null}
              </div>}
          </div>
        </div>
        <div className={`${styles.pageHeroBookmarks}`} data-guide="contact-ticket-bookmarks">
        <ClientTicketBookmarks openTickets={openClientTickets} closedTickets={closedClientTickets} loading={loadingActivity} statusLabels={ticketStatusLabels} onTicketClick={handleOpenTicket} onCreateTicket={handleCreateTicket} onOpenTicketList={handleOpenTicketList} canCreate={canCreateTicket} clients={allClients} inPageHero />
        </div>
      </header>

      <div className={styles.pageBody}>
        <div className={styles.pageGrid}>
          <main className={styles.mainColumn}>
            <section className={styles.panel} data-guide="contact-coordinates">
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>{copy.coordinates}</h2>
              </div>
              <div className={styles.panelBody}>
                {hasCoords ? <div className={contactStyles.coordGrid}>
                    {displayCommunications.map(entry => {
                  const typeDef = getCommunicationTypeDefLocalized(entry.type, locale);
                  const href = entry.type === "email" ? toMailtoHref(entry.value) : entry.type === "telephone" ? toTelHref(entry.value) : null;
                  const copyLabel = typeDef.label;
                  return <div key={entry.id} className={contactStyles.coordCard}>
                          <span className={contactStyles.coordIconWrap}>
                            <Icon icon={typeDef.icon} aria-hidden />
                          </span>
                          <span className={contactStyles.coordText}>
                            <span className={contactStyles.coordLabelRow}>
                              <span className={contactStyles.coordLabel}>{typeDef.label}</span>
                              {entry.isPrimary ? <Icon icon="mdi:star" className={contactStyles.coordFavoriteStar} title={copy.coordFavorite} aria-label={copy.coordFavorite} /> : null}
                            </span>
                            {href ? <a href={href} className={contactStyles.coordValueLink} onClick={e => e.stopPropagation()}>
                                {entry.value}
                              </a> : <span className={contactStyles.coordValue}>{entry.value}</span>}
                          </span>
                          <SmartTooltip content={interpolate(copy.copyCoord, {
                      label: copyLabel.toLowerCase()
                    })}>
                            <button type="button" className={contactStyles.coordCopyBtn} title={interpolate(copy.copyCoord, {
                        label: copyLabel.toLowerCase()
                      })} aria-label={interpolate(copy.copyCoord, {
                        label: copyLabel.toLowerCase()
                      })} onClick={e => {
                        e.stopPropagation();
                        copyCoordValue(entry.value, copyLabel);
                      }}>
                              <Icon icon="mdi:content-copy" aria-hidden />
                            </button>
                          </SmartTooltip>
                        </div>;
                })}
                  </div> : <div className={contactStyles.coordEmpty}>
                    {copy.coordEmpty}
                  </div>}
              </div>
            </section>

            <section className={styles.panel} data-guide="contact-activity">
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>{copy.activityTitle}</h2>
                {!loadingActivity && <span className={styles.activityBlockCount}>
                    {(() => {
                  const total = isCommunity ? supportTickets.length + DEMO_PRESTATION_TICKETS.length : supportTickets.length + prestationTickets.length;
                  return total === 1 ? interpolate(copy.ticketCount, {
                    count: total
                  }) : interpolate(copy.ticketCountPlural, {
                    count: total
                  });
                })()}
                  </span>}
              </div>
              <div className={styles.panelBody}>
                {loadingActivity ? <div className={contactStyles.activityLoading}>
                    <Icon icon="mdi:loading" className={styles.spinning} aria-hidden />
                    <span>{copy.loadingActivity}</span>
                  </div> : <>
                    <div className={contactStyles.mspKpiRow}>
                      <div className={contactStyles.mspKpiCard}>
                        <span className={contactStyles.mspKpiValue}>{openSupportCount}</span>
                        <span className={contactStyles.mspKpiLabel}>{copy.kpiOpenSupport}</span>
                      </div>
                      <div className={contactStyles.mspKpiCard}>
                        <span className={contactStyles.mspKpiValue}>{supportTickets.length}</span>
                        <span className={contactStyles.mspKpiLabel}>{copy.kpiSupportTickets}</span>
                      </div>
                      <ProFeatureLock locked={isCommunity} featureLabel={copy.proFeatures.prestations} featureKey="prestations" className={contactStyles.mspKpiProLock}>
                        <div className={contactStyles.mspKpiCard}>
                          <span className={contactStyles.mspKpiValue}>
                            {isCommunity ? DEMO_PRESTATION_TICKETS.length : prestationTickets.length}
                          </span>
                          <span className={contactStyles.mspKpiLabel}>{copy.kpiPrestations}</span>
                        </div>
                      </ProFeatureLock>
                      <ProFeatureLock locked={isCommunity} featureLabel={copy.proFeatures.planning} featureKey="planning" className={contactStyles.mspKpiProLock}>
                        <div className={contactStyles.mspKpiCard}>
                          <span className={contactStyles.mspKpiValue}>
                            {isCommunity ? DEMO_UPCOMING_EVENTS.length : upcomingEvents.length}
                          </span>
                          <span className={contactStyles.mspKpiLabel}>{copy.kpiClientEvents}</span>
                        </div>
                      </ProFeatureLock>
                    </div>

                    <div className={styles.activityGridSplit}>
                      <div className={styles.activityBlock}>
                        <div className={styles.activityBlockHeader}>
                          <h3 className={styles.activityBlockTitle}>
                            <Icon icon="mdi:ticket-outline" aria-hidden />
                            {copy.supportTicketsTitle}
                          </h3>
                          <span className={styles.activityBlockCount}>
                            {interpolate(copy.openCount, {
                          count: supportTickets.filter(t => !["resolved", "closed"].includes(normalizeTicketStatus(t.status))).length
                        })}
                          </span>
                        </div>
                        <div className={styles.dataTableWrapper}>
                          <table className={styles.dataTable}>
                            <thead>
                              <tr>
                                <th>{copy.table.number}</th>
                                <th>{copy.table.title}</th>
                                <th>{copy.table.status}</th>
                                <th>{copy.table.updated}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {supportTickets.length === 0 ? <tr>
                                  <td colSpan={4} className={styles.dataTableEmptyCell}>
                                    {copy.emptySupportTickets}
                                  </td>
                                </tr> : supportTickets.slice(0, 8).map(ticket => {
                            const status = normalizeTicketStatus(ticket.status);
                            return <tr key={ticket.id} className={styles.dataTableRowClickable} onClick={() => handleOpenTicket(ticket)} onAuxClick={e => {
                              if (e.button === 1) {
                                e.preventDefault();
                                handleOpenTicket(ticket, true);
                              }
                            }}>
                                      <td>#{ticket.ticket_number || "-"}</td>
                                      <td className={styles.activityTitleCell}>{ticket.title || "-"}</td>
                                      <td>
                                        <span className={styles.ticketStatusBadge}>
                                          {ticketStatusLabels[status] || status || "-"}
                                        </span>
                                      </td>
                                      <td>{formatRelativeTime(ticket.updated_at || ticket.created_at)}</td>
                                    </tr>;
                          })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className={styles.activityRightColumn}>
                      <ProFeatureLock locked={isCommunity} featureLabel={copy.proFeatures.prestationTickets} featureKey="prestations" className={styles.activityBlockProLock} badgePosition="none">
                        <div className={styles.activityBlock}>
                          <div className={styles.activityBlockHeader}>
                            <h3 className={styles.activityBlockTitle}>
                              <Icon icon="mdi:briefcase-outline" aria-hidden />
                              {copy.prestationsTitle}
                              {isCommunity ? <ProFeatureBadge variant="inline" className={styles.proBadgeInline} /> : null}
                            </h3>
                            <span className={styles.activityBlockCount}>
                              {interpolate(copy.prestationsCount, {
                              count: (isCommunity ? DEMO_PRESTATION_TICKETS : prestationTickets).length
                            })}
                            </span>
                          </div>
                          <div className={styles.dataTableWrapper}>
                            <table className={styles.dataTable}>
                              <thead>
                                <tr>
                                  <th>{copy.table.number}</th>
                                  <th>{copy.table.type}</th>
                                  <th>{copy.table.status}</th>
                                  <th>{copy.table.created}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(isCommunity ? DEMO_PRESTATION_TICKETS : prestationTickets).length === 0 ? <tr>
                                    <td colSpan={4} className={styles.dataTableEmptyCell}>
                                      {copy.emptyPrestationTickets}
                                    </td>
                                  </tr> : (isCommunity ? DEMO_PRESTATION_TICKETS : prestationTickets).slice(0, 8).map(ticket => {
                                const status = normalizeTicketStatus(ticket.status);
                                return <tr key={ticket.id} className={isCommunity ? undefined : styles.dataTableRowClickable} onClick={isCommunity ? undefined : () => handleOpenTicket(ticket)} onAuxClick={isCommunity ? undefined : e => {
                                  if (e.button === 1) {
                                    e.preventDefault();
                                    handleOpenTicket(ticket, true);
                                  }
                                }}>
                                          <td>#{ticket.ticket_number || "-"}</td>
                                          <td className={styles.activityTitleCell}>
                                            {getPrestationCategoryLabel(ticket.category, locale)}
                                          </td>
                                          <td>
                                            <span className={styles.ticketStatusBadge}>
                                              {ticketStatusLabels[status] || status || "-"}
                                            </span>
                                          </td>
                                          <td>{formatTableDate(ticket.created_at)}</td>
                                        </tr>;
                              })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </ProFeatureLock>
                      </div>
                    </div>
                  </>}
              </div>
            </section>

            <section className={styles.panel} data-guide="contact-portal">
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>{copy.portalTitle}</h2>
              </div>
              <div className={styles.panelBody}>
                <ContactPortalSection contact={contact} canManage={canManagePortal} onUpdated={() => {
                const controller = createTrackedAbortController();
                loadControllerRef.current?.abort();
                loadControllerRef.current = controller;
                loadContactData(controller.signal);
              }} />
              </div>
            </section>

            {contact?.id && (vaultClientId || contact?.client_id || contactCompanies.length > 0) ? <ProFeatureLock locked={isCommunity} featureLabel={copy.sharedAccessTitle} featureKey="sharedAccess">
                <section className={styles.panel} data-guide="contact-shared-access">
                  <div className={styles.panelHeader}>
                    <h2 className={styles.panelTitle}>{copy.sharedAccessTitle}</h2>
                    {canAccessSharing ? <SmartTooltip content={copy.shareAccess}>
                      <button type="button" className={`${pageLayout.primaryBtn} ${pageLayout.primaryBtnIconOnly}`} onClick={() => setShareAccessCreateOpen(true)} aria-label={copy.shareAccess} disabled={isCommunity}>
                        <FaPlus />
                      </button>
                    </SmartTooltip> : null}
                  </div>
                  <div className={styles.panelBody}>
                    {contactCompanies.length > 1 ? <label className={contactStyles.vaultClientField}>
                        <span className={contactStyles.vaultClientLabel}>{copy.vaultClientLabel || copy.selectCompany}</span>
                        <select className={contactStyles.vaultClientSelect} value={vaultClientId || ""} onChange={e => setVaultClientId(e.target.value || null)}>
                          {contactCompanies.map(company => <option key={company.id} value={company.id}>
                              {company.name}
                            </option>)}
                        </select>
                      </label> : null}
                    <VaultSecretsPanel contactId={contact.id} clientId={vaultClientId || contact.client_id || contactCompanies[0]?.id} contactName={formatContactName(contact, copy.defaultName)} createModalOpen={shareAccessCreateOpen} onCreateModalChange={setShareAccessCreateOpen} />
                  </div>
                </section>
              </ProFeatureLock> : null}
          </main>

          <aside className={styles.asidePanel}>
            <div className={styles.rightSidebarContent}>
              <section className={styles.sidebarSection} data-guide="contact-sidebar-info">
                <div className={styles.sidebarInfoHeader}>
                  <span className={styles.sidebarInfoTitle}>{copy.sidebarInfo}</span>
                </div>
                <div className={styles.sidebarSummaryList}>
                  <div className={styles.sidebarSummaryItem}>
                    <span className={styles.sidebarSummaryLabel}>{copy.fields.lastName}</span>
                    <span className={styles.sidebarSummaryValue}>{formData.nom || "-"}</span>
                  </div>
                  <div className={styles.sidebarSummaryItem}>
                    <span className={styles.sidebarSummaryLabel}>{copy.fields.firstName}</span>
                    <span className={styles.sidebarSummaryValue}>{formData.prenom || "-"}</span>
                  </div>
                  <div className={styles.sidebarSummaryItem}>
                    <span className={styles.sidebarSummaryLabel}>{copy.fields.civility}</span>
                    <span className={styles.sidebarSummaryValue}>
                      {formData.sexe ? getContactSexeLabelLocalized(formData.sexe, locale) : "-"}
                    </span>
                  </div>
                  <div className={styles.sidebarSummaryItem}>
                    <span className={styles.sidebarSummaryLabel}>{copy.fields.status}</span>
                    <span className={styles.sidebarSummaryValue}>
                      {contactStatus.label}
                    </span>
                  </div>
                  <div className={styles.sidebarSummaryItem}>
                    <span className={styles.sidebarSummaryLabel}>{copy.fields.role}</span>
                    {formData.poste ? <span className={styles.sidebarSummaryValue}>{formData.poste}</span> : <span className={styles.sidebarSummaryValueEmpty}>-</span>}
                  </div>
                </div>
              </section>

              <section className={styles.sidebarSection} data-guide="contact-sidebar-companies">
                <div className={styles.sidebarInfoHeader}>
                  <span className={styles.sidebarInfoTitle}>
                    {copy.companies || copy.share.lines.enterprise}
                    {contactCompanies.length > 0 ? <span className={styles.sidebarSectionCount}>{contactCompanies.length}</span> : null}
                  </span>
                  {canEditContact ? <SmartTooltip content={copy.addCompany}>
                      <button type="button" className={styles.editInfoButton} onClick={openCompanyModal} disabled={membershipBusy} aria-label={copy.addCompany}>
                        <FaPlus />
                      </button>
                    </SmartTooltip> : null}
                </div>
                <div className={styles.sidebarBody}>
                  {contactCompanies.length === 0 ? <span className={styles.sidebarSummaryValueEmpty}>-</span> : <ul className={styles.sidebarContactsList}>
                      {contactCompanies.map(company => <SmartTooltip as="li" key={company.id} className={styles.sidebarContactItem} onClick={() => openEnterprise({
                  id: company.id,
                  name: company.name
                })} content={copy.viewEnterprise}>
                          <div className={styles.sidebarContactAvatar} aria-hidden>
                            <Icon icon="mdi:domain" />
                          </div>
                          <div className={styles.sidebarContactBody}>
                            <div className={styles.sidebarContactTop}>
                              <div className={styles.sidebarContactIdentity}>
                                <span className={styles.sidebarContactName}>{company.name}</span>
                                {company.is_primary ? <span className={styles.sitePreviewPrimary}>{copy.primaryBadge}</span> : null}
                              </div>
                              {canEditContact ? <div className={styles.sidebarContactActions}>
                                  <button type="button" className={styles.sidebarCopyButton} disabled={membershipBusy} title={interpolate(copy.removeCompanyAria || "{name}", {
                            name: company.name
                          })} aria-label={interpolate(copy.removeCompanyAria || "{name}", {
                            name: company.name
                          })} onClick={e => {
                            e.stopPropagation();
                            handleRemoveCompanyMembership(company.id);
                          }}>
                                    <FaTimes />
                                  </button>
                                </div> : null}
                            </div>
                          </div>
                        </SmartTooltip>)}
                    </ul>}
                </div>
              </section>

              <section className={styles.sidebarSection} data-guide="contact-sidebar-dates">
                <div className={styles.sidebarInfoHeader}>
                  <span className={styles.sidebarInfoTitle}>{copy.sidebarDates}</span>
                </div>
                <div className={styles.sidebarSummaryList}>
                  <div className={styles.sidebarSummaryItem}>
                    <span className={styles.sidebarSummaryLabel}>{copy.fields.created}</span>
                    <span className={styles.sidebarSummaryValue}>
                      {formatShortDate(contact?.created_at, formatDate)}
                    </span>
                  </div>
                  <div className={styles.sidebarSummaryItem}>
                    <span className={styles.sidebarSummaryLabel}>{copy.fields.updated}</span>
                    <span className={styles.sidebarSummaryValue}>
                      {formatShortDate(contact?.updated_at, formatDate)}
                    </span>
                  </div>
                </div>
              </section>
            </div>
          </aside>
        </div>
      </div>

      <ContactFormModal open={contactModalOpen} initialContact={contact} clients={allClients} onClose={handleContactModalClose} onSuccess={handleContactModalSuccess} />

      <ContactCompanyModal open={companyModalOpen} contactName={displayName} companies={availableCompaniesToAdd} loading={clientsLoading} saving={membershipBusy} onClose={closeCompanyModal} onSelect={handleAddCompanyMembership} />

      <ContactDeleteModal open={deleteContactModalOpen} contactName={displayName} saving={deletingContact} onClose={closeDeleteContactModal} onConfirm={confirmDeleteContact} />

      <ClientTagModal open={tagModalOpen} entityName={displayName} assignedTags={contactTags} saving={addingTag} onClose={() => {
      if (addingTag) return;
      setTagModalOpen(false);
    }} onSubmit={handleAddContactTag} />

      <ProFeaturePromoModal open={Boolean(proPromoFeature)} featureKey={proPromoFeature} onClose={() => setProPromoFeature(null)} />

      <PageGuideTour open={pageGuideOpen} steps={contactGuideSteps} title={copy.guideTitle} onClose={() => setPageGuideOpen(false)} />
    </div>;
}
