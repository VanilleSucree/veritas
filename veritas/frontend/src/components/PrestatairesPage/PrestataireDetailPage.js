import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { fetchPrestataire, deletePrestataire } from "../../api/prestataires";
import { fetchClientsList } from "../../api/clients";
import styles from "../EnterprisesPage/EnterpriseDetailPage.module.css";
import localStyles from "./PrestataireDetailPage.module.css";
import SmartTooltip from "../SmartTooltip";
import StatusDot from "../shared/StatusDot/StatusDot";
import { getClientNumber, getClientNameWithoutCode } from "../../utils/clientDisplay";
import PrestataireFormModal from "./PrestataireFormModal";
import { usePermissions } from "../../contexts/PermissionsContext";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import {
  getPrestataireDetailCopy,
  getPrestataireStatusLocalized
} from "./prestataireDetailI18n";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";

const normalizePhone = value => {
  let normalized = (value || "").toString().trim();
  if (normalized.startsWith("'")) normalized = normalized.slice(1);
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

function getPrestataireInitials(prestataire) {
  const nom = (prestataire?.nom || "").trim();
  if (!nom) return "PR";
  const parts = nom.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return nom.slice(0, 2).toUpperCase();
}

function formatPersonName(contact, fallback = "") {
  const parts = [contact?.prenom, contact?.nom].filter(Boolean);
  return parts.join(" ") || fallback;
}

export default function PrestataireDetailPage({
  onNavigate,
  prestataireData
}) {
  const { prestataireId: urlPrestataireId } = useParams();
  const locale = useAppLocale();
  const copy = useMemo(() => getPrestataireDetailCopy(locale), [locale]);
  const { can } = usePermissions();
  const canEdit = can("prestataires_detail.edit");
  const canDelete = can("prestataires_detail.delete");

  const [prestataire, setPrestataire] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allClients, setAllClients] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const loadControllerRef = useRef(null);
  const clientsListControllerRef = useRef(null);
  const actionsMenuRef = useRef(null);
  const isMountedRef = useRef(true);
  const loadRequestIdRef = useRef(0);

  const companies = useMemo(() => {
    const linked = Array.isArray(prestataire?.clients) ? prestataire.clients : [];
    return linked
      .map(row => ({
        id: row.id ?? row.client_id,
        name: row.name || row.client_name || `Client #${row.id ?? row.client_id}`
      }))
      .filter(row => row.id != null);
  }, [prestataire]);

  const contacts = useMemo(() => {
    if (Array.isArray(prestataire?.contacts) && prestataire.contacts.length > 0) {
      return prestataire.contacts;
    }
    if (prestataire?.contact_nom || prestataire?.contact_prenom || prestataire?.email || prestataire?.telephone) {
      return [{
        nom: prestataire.contact_nom || "",
        prenom: prestataire.contact_prenom || "",
        email: prestataire.email || "",
        telephone: prestataire.telephone || ""
      }];
    }
    return [];
  }, [prestataire]);

  const infoCards = useMemo(() => {
    if (!prestataire) return [];
    const cards = [];
    if (prestataire.type) {
      cards.push({ key: "type", icon: "mdi:tag-outline", label: copy.fields.type, value: prestataire.type });
    }
    if (prestataire.site_web) {
      cards.push({
        key: "website",
        icon: "mdi:web",
        label: copy.fields.website,
        value: prestataire.site_web,
        href: prestataire.site_web.startsWith("http") ? prestataire.site_web : `https://${prestataire.site_web}`,
        external: true
      });
    }
    if (prestataire.adresse) {
      cards.push({ key: "address", icon: "mdi:map-marker-outline", label: copy.fields.address, value: prestataire.adresse });
    }
    return cards;
  }, [prestataire, copy.fields]);

  const resolveId = () =>
    prestataireData?.prestataireId || prestataireData?.id || urlPrestataireId;

  useEffect(() => {
    isMountedRef.current = true;
    const id = resolveId();
    if (id) {
      const controller = createTrackedAbortController();
      loadControllerRef.current?.abort();
      loadControllerRef.current = controller;
      loadData(controller.signal);
    }
    return () => {
      isMountedRef.current = false;
      loadControllerRef.current?.abort();
      clientsListControllerRef.current?.abort();
    };
  }, [urlPrestataireId, prestataireData?.prestataireId, prestataireData?.id]);

  useEffect(() => {
    if (!actionsMenuOpen) return undefined;
    const onClick = e => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target)) {
        setActionsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [actionsMenuOpen]);

  const ensureClientsLoaded = async () => {
    if (allClients.length > 0) return;
    clientsListControllerRef.current?.abort();
    const controller = createTrackedAbortController();
    clientsListControllerRef.current = controller;
    try {
      const data = await fetchClientsList({ signal: controller.signal });
      if (controller.signal.aborted || !isMountedRef.current) return;
      setAllClients(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err?.name !== "AbortError") console.error("Error loading clients:", err);
    }
  };

  const loadData = async signal => {
    const requestId = ++loadRequestIdRef.current;
    const isCurrentRequest = () =>
      loadRequestIdRef.current === requestId && loadControllerRef.current?.signal === signal;
    setLoading(true);
    setError(null);
    try {
      const id = resolveId();
      if (!id) {
        setLoading(false);
        return;
      }
      const fetched = await fetchPrestataire(id, { signal });
      if (signal?.aborted || !isMountedRef.current || !isCurrentRequest()) return;
      setPrestataire(fetched);
      if (window.updateTabTitle && fetched.nom) {
        window.updateTabTitle("PrestataireDetail", {
          prestataireId: id,
          nom: fetched.nom
        });
      }
    } catch (err) {
      if (err?.name === "AbortError") return;
      setError(err.message || copy.loadError);
      console.error("Error chargement prestataire:", err);
    } finally {
      if (isCurrentRequest() && isMountedRef.current) setLoading(false);
    }
  };

  const openEnterprise = client => {
    if (!onNavigate || !client?.id) return;
    onNavigate("ContratDetail", { clientId: client.id, id: client.id, name: client.name });
  };

  const handleOpenEdit = async () => {
    setActionsMenuOpen(false);
    await ensureClientsLoaded();
    setModalOpen(true);
  };

  const handleDelete = async () => {
    setActionsMenuOpen(false);
    if (!prestataire?.id) return;
    if (!window.confirm(copy.confirmDelete)) return;
    try {
      setDeleting(true);
      await deletePrestataire(prestataire.id);
      toast.success(copy.toast.deleted);
      window.dispatchEvent(new Event("refreshPrestataires"));
      if (onNavigate) onNavigate("Prestataire");
    } catch (err) {
      toast.error(err.message || copy.toast.deleteError);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className={`${styles.contratDetailPage} ${styles.enterpriseDetailPage} msp-page-grid`}>
        <div className={styles.loading}>
          <Icon icon="mdi:loading" className={styles.spinning} />
          <span>{copy.loading}</span>
        </div>
      </div>
    );
  }

  if (error || !prestataire) {
    return (
      <div className={`${styles.contratDetailPage} ${styles.enterpriseDetailPage} msp-page-grid`}>
        <div className={styles.error}>
          <Icon icon="mdi:alert-circle-outline" />
          <span>{error || copy.notFound}</span>
        </div>
      </div>
    );
  }

  const status = getPrestataireStatusLocalized(prestataire.statut, locale);
  const displayName = prestataire.nom || copy.defaultName;
  const primaryContact = contacts[0];
  const primaryEmail = primaryContact?.email || "";
  const primaryPhone = primaryContact?.telephone || "";
  const emailHref = primaryEmail ? toMailtoHref(primaryEmail) : "";
  const phoneHref = primaryPhone ? toTelHref(primaryPhone) : "";

  return (
    <div className={`${styles.contratDetailPage} ${styles.enterpriseDetailPage} msp-page-grid`}>
      <header className={styles.pageHero}>
        <div className={styles.heroRow}>
          <div className={styles.heroMain}>
            <div className={styles.heroAvatar}>{getPrestataireInitials(prestataire)}</div>
            <div className={styles.heroText}>
              <h1 className={styles.heroTitle}>
                <span>{displayName}</span>
              </h1>
              <div className={styles.heroMeta} aria-label={copy.heroMetaAria}>
                <span className={`${styles.statusChip} ${status.status === "active" ? styles.statusChipActive : styles.statusChipInactive}`}>
                  <StatusDot active={status.status === "active"} />
                  {status.label}
                </span>
                {prestataire.type ? (
                  <span className={styles.heroMetaItem}>
                    <Icon icon="mdi:tag-outline" aria-hidden />
                    {prestataire.type}
                  </span>
                ) : null}
                {primaryEmail ? (
                  <a href={emailHref} className={`${styles.heroMetaItem} ${styles.heroMetaLink}`}>
                    <Icon icon="mdi:email-outline" aria-hidden />
                    {primaryEmail}
                  </a>
                ) : null}
                {primaryPhone ? (
                  <a href={phoneHref} className={`${styles.heroMetaItem} ${styles.heroMetaLink}`}>
                    <Icon icon="mdi:phone-outline" aria-hidden />
                    {primaryPhone}
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          <div className={styles.heroActions} ref={actionsMenuRef}>
            {(canEdit || canDelete) ? (
              <SmartTooltip content={copy.actionsMenu}>
                <button
                  type="button"
                  className={styles.heroMenuBtn}
                  onClick={() => setActionsMenuOpen(open => !open)}
                  aria-expanded={actionsMenuOpen}
                  aria-haspopup="menu"
                  aria-label={copy.actionsMenu}
                >
                  <Icon icon="mdi:dots-horizontal" aria-hidden />
                </button>
              </SmartTooltip>
            ) : null}
            {actionsMenuOpen && (
              <div className={styles.heroClientMenu} role="menu">
                {canEdit ? (
                  <button type="button" className={styles.heroMenuItem} role="menuitem" onClick={handleOpenEdit}>
                    <Icon icon="mdi:pencil-outline" aria-hidden />
                    <span>{copy.editPrestataire}</span>
                  </button>
                ) : null}
                {canDelete ? (
                  <>
                    {canEdit ? <div className={styles.heroMenuDivider} role="separator" /> : null}
                    <button
                      type="button"
                      className={`${styles.heroMenuItem} ${styles.heroMenuItemDanger}`}
                      role="menuitem"
                      onClick={handleDelete}
                      disabled={deleting}
                    >
                      <Icon icon="mdi:trash-can-outline" aria-hidden />
                      <span>{deleting ? copy.deleting : copy.deletePrestataire}</span>
                    </button>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className={styles.pageBody}>
        <div className={`${styles.pageGrid} ${localStyles.pageGridSingle}`}>
          <main className={styles.mainColumn}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>{copy.infoTitle}</h2>
              </div>
              <div className={styles.panelBody}>
                {infoCards.length === 0 ? (
                  <div className={localStyles.coordEmpty}>{copy.noInfo}</div>
                ) : (
                  <div className={localStyles.coordGrid}>
                    {infoCards.map(card => (
                      <div key={card.key} className={localStyles.coordCard}>
                        <span className={localStyles.coordIconWrap}>
                          <Icon icon={card.icon} aria-hidden />
                        </span>
                        <span className={localStyles.coordText}>
                          <span className={localStyles.coordLabel}>{card.label}</span>
                          {card.href ? (
                            <a
                              href={card.href}
                              className={localStyles.coordValueLink}
                              target={card.external ? "_blank" : undefined}
                              rel={card.external ? "noreferrer" : undefined}
                            >
                              {card.value}
                            </a>
                          ) : (
                            <span className={localStyles.coordValue}>{card.value}</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>{copy.contactsTitle}</h2>
                {contacts.length > 0 ? (
                  <span className={styles.activityBlockCount}>{contacts.length}</span>
                ) : null}
              </div>
              <div className={styles.panelBody}>
                {contacts.length === 0 ? (
                  <div className={styles.emptyState}>
                    <Icon icon="mdi:account-multiple-outline" className={styles.emptyIcon} />
                    <p>{copy.noContacts}</p>
                  </div>
                ) : (
                  <div className={localStyles.coordGrid}>
                    {contacts.map((contact, index) => {
                      const name = formatPersonName(contact, copy.contactFallback);
                      const mail = contact.email ? toMailtoHref(contact.email) : "";
                      const tel = contact.telephone ? toTelHref(contact.telephone) : "";
                      return (
                        <div key={contact.id || `${name}-${index}`} className={localStyles.contactCard}>
                          <div className={localStyles.contactName}>{name}</div>
                          <div className={localStyles.contactMeta}>
                            {contact.email ? (
                              <a href={mail} className={localStyles.contactMetaRow}>
                                <Icon icon="mdi:email-outline" className={localStyles.contactMetaIcon} aria-hidden />
                                <span>{contact.email}</span>
                              </a>
                            ) : null}
                            {contact.telephone ? (
                              <a href={tel} className={localStyles.contactMetaRow}>
                                <Icon icon="mdi:phone-outline" className={localStyles.contactMetaIcon} aria-hidden />
                                <span>{contact.telephone}</span>
                              </a>
                            ) : null}
                            {!contact.email && !contact.telephone ? (
                              <span className={localStyles.coordEmpty}>{copy.contactNoCoords}</span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>{copy.companies}</h2>
                {companies.length > 0 ? (
                  <span className={styles.activityBlockCount}>{companies.length}</span>
                ) : null}
              </div>
              <div className={styles.panelBody}>
                {companies.length === 0 ? (
                  <div className={styles.emptyState}>
                    <Icon icon="mdi:domain" className={styles.emptyIcon} />
                    <p>{copy.noCompanies}</p>
                  </div>
                ) : (
                  <ul className={styles.sidebarContactsList}>
                    {companies.map(company => {
                      const listed = allClients.find(c => String(c.id) === String(company.id));
                      const code = getClientNumber(listed || company);
                      const label = getClientNameWithoutCode(listed || company) || company.name || "";
                      return (
                        <SmartTooltip
                          as="li"
                          key={company.id}
                          className={styles.sidebarContactItem}
                          content={copy.viewEnterprise}
                          onClick={() => openEnterprise(company)}
                        >
                          <div className={styles.sidebarContactAvatar} aria-hidden>
                            {(label || "E").slice(0, 2).toUpperCase()}
                          </div>
                          <div className={styles.sidebarContactBody}>
                            <span className={styles.sidebarContactName}>
                              {code ? (
                                <>
                                  <span className={styles.headerClientCode}>{code}</span>
                                  {label}
                                </>
                              ) : (
                                label
                              )}
                            </span>
                          </div>
                        </SmartTooltip>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          </main>
        </div>
      </div>

      <PrestataireFormModal
        open={modalOpen}
        initialPrestataire={prestataire}
        clients={allClients}
        onClose={() => setModalOpen(false)}
        onSuccess={updated => {
          if (updated) {
            setPrestataire(updated);
            toast.success(copy.toast.updated);
          }
          const controller = createTrackedAbortController();
          loadControllerRef.current?.abort();
          loadControllerRef.current = controller;
          loadData(controller.signal);
        }}
      />
    </div>
  );
}
