import { createLocaleGetter, interpolate } from "../../i18n/translate";
const DETAIL_COPY = {
  fr: {
    loading: "Chargement de la fiche contact…",
    notFound: "Contact non trouvé",
    loadError: "Erreur lors du chargement du contact",
    defaultName: "Contact",
    status: {
      active: "Actif",
      inactive: "Inactif",
      unknown: "Non renseigné"
    },
    heroMetaAria: "Informations et étiquettes contact",
    openTickets: "{count} ticket ouvert",
    openTicketsPlural: "{count} tickets ouverts",
    loadingTags: "Chargement des étiquettes…",
    removeTagAria: "Retirer l'étiquette {label}",
    addTag: "Ajouter une étiquette",
    actionsMenu: "Actions sur le contact",
    subscribe: {
      subscribe: "S’abonner aux notifications",
      unsubscribe: "Se désabonner",
      subscribedToast: "Abonnement activé",
      unsubscribedToast: "Abonnement retiré"
    },
    editContact: "Éditer le contact",
    copyCard: "Copier la fiche",
    shareCard: "Partager la fiche",
    viewEnterprise: "Voir l'entreprise",
    companies: "Entreprises",
    addCompany: "Ajouter une entreprise",
    selectCompany: "Sélectionner une entreprise",
    removeCompanyAria: "Retirer {name}",
    companyModal: {
      eyebrow: "Fiche contact",
      title: "Ajouter une entreprise",
      subtitleWithName: "Rattacher {name} à une entreprise existante",
      subtitleDefault: "Rattacher ce contact à une entreprise existante",
      search: "Rechercher",
      searchPlaceholder: "Nom de l'entreprise",
      loading: "Chargement des entreprises…",
      empty: "Aucune entreprise disponible à rattacher",
      noResults: "Aucun résultat",
      hint: "Sélectionnez une entreprise pour la rattacher",
      adding: "Ajout…",
      cancel: "Annuler",
      close: "Fermer"
    },
    vaultClientLabel: "Entreprise du coffre",
    primaryBadge: "Principal",
    sitePrimaryBadge: "Principal du lieu",
    deleting: "Suppression…",
    deleteContact: "Supprimer le contact",
    coordinates: "Coordonnées",
    coordFavorite: "Coordonnée favorite",
    coordEmpty: "Aucune coordonnée renseignée pour ce contact.",
    copyCoord: "Copier {label}",
    activityTitle: "Activité MSP",
    ticketCount: "{count} ticket",
    ticketCountPlural: "{count} tickets",
    loadingActivity: "Chargement de l'activité…",
    kpiOpenSupport: "Support ouverts",
    kpiSupportTickets: "Tickets Support",
    kpiPrestations: "Prestations",
    kpiClientEvents: "Événements client",
    supportTicketsTitle: "Tickets Support",
    openCount: "{count} ouvert(s)",
    prestationsTitle: "Ticket de Prestations / Services",
    prestationsCount: "{count} ticket(s)",
    upcomingEventsTitle: "Événements client à venir",
    scheduledCount: "{count} planifié",
    scheduledCountPlural: "{count} planifiés",
    portalTitle: "Portail client",
    sharedAccessTitle: "Partage d'accès",
    shareAccess: "Partager un accès",
    sidebarInfo: "Informations",
    sidebarDates: "Dates de la fiche",
    fields: {
      lastName: "Nom",
      firstName: "Prénom",
      civility: "Civilité",
      status: "Statut",
      role: "Poste",
      created: "Créé le",
      updated: "Modifié le"
    },
    table: {
      number: "N°",
      title: "Titre",
      status: "Statut",
      updated: "Mis à jour",
      type: "Type",
      created: "Créée le",
      date: "Date"
    },
    emptySupportTickets: "Aucun ticket support ouvert par ce contact.",
    emptyPrestationTickets: "Aucun ticket prestations / services pour ce contact.",
    emptyEvents: "Aucun événement à venir pour l'entreprise rattachée.",
    guideFab: "Guide de la fiche contact",
    guideTitle: "Fiche contact",
    guide: {
      steps: {
        hero: {
          title: "Vue d'ensemble du contact",
          content: "Retrouvez ici le nom, le statut, le poste, l'entreprise rattachée et les étiquettes. Le lien entreprise ouvre directement la fiche client."
        },
        ticketBookmarks: {
          title: "Tickets en cours",
          content: "Accédez rapidement aux tickets ouverts ou récents de ce contact. Créez un nouveau ticket ou ouvrez la liste complète du support."
        },
        coordinates: {
          title: "Coordonnées",
          content: "E-mails, téléphones et autres moyens de communication du contact. Cliquez sur une ligne pour appeler ou envoyer un message."
        },
        activity: {
          title: "Activité MSP",
          content: "Consultez l'historique support, les demandes de prestation et les événements planifiés pour ce contact et son entreprise."
        },
        portal: {
          title: "Portail client",
          content: "Activez l'espace client sans e-mail, puis envoyez ou renvoyez l'invitation. Gérez aussi le rôle, l'accès, le mot de passe et les connexions."
        },
        sharedAccess: {
          title: "Partage d'accès",
          content: "Partagez un mot de passe ou un accès temporaire avec le contact sur son portail · expiration, limite de consultations, révocation et suppression côté client. Créez un accès avec le bouton +."
        },
        sidebarInfo: {
          title: "Informations de la fiche",
          content: "Le panneau de droite résume l'identité du contact : nom, prénom, civilité, statut et fonction."
        },
        sidebarDates: {
          title: "Historique de la fiche",
          content: "Dates de création et de dernière modification pour suivre l'ancienneté et les mises à jour du contact."
        },
        heroActions: {
          title: "Actions sur le contact",
          content: "Éditez la fiche, copiez ou partagez les coordonnées, accédez à l'entreprise liée ou supprimez le contact depuis ce menu."
        }
      }
    },
    toast: {
      tagAdded: "Étiquette ajoutée",
      tagAddError: "Erreur lors de l'ajout de l'étiquette",
      tagRemoved: "Étiquette retirée",
      tagRemoveError: "Erreur lors de la suppression de l'étiquette",
      clientsLoadError: "Impossible de charger la liste des entreprises",
      cardCopied: "Fiche contact copiée",
      cardCopyError: "Impossible de copier la fiche contact",
      deleted: "Contact supprimé.",
      deleteError: "Impossible de supprimer le contact.",
      createTicketNeedEnterprise: "Rattachez le contact à une entreprise pour créer un ticket.",
      membershipAdded: "Entreprise ajoutée",
      membershipRemoved: "Entreprise retirée",
      membershipError: "Impossible de mettre à jour les entreprises du contact"
    },
    share: {
      unavailable: "Partage non disponible sur ce navigateur",
      cancelled: "Partage annulé",
      title: "Fiche contact · {name}",
      lines: {
        contact: "Contact",
        enterprise: "Entreprise",
        role: "Poste",
        phone: "Téléphone",
        email: "Email"
      }
    },
    clipboard: {
      unavailable: "{label} indisponible",
      copied: "{label} copié",
      copyFailed: "Impossible de copier {label}"
    },
    ticketStatus: {
      open: "Ouvert",
      new: "Nouveau",
      pending: "En attente",
      in_progress: "En cours",
      resolved: "Résolu",
      closed: "Clos"
    },
    prestationCategories: {
      "prestation-enlevement": "Enlèvement",
      "prestation-expedition": "Expédition",
      "prestation-formation": "Formation",
      "prestation-intervention-distante": "Intervention distante",
      "prestation-intervention-site": "Intervention site",
      "prestation-production": "Production",
      "prestation-etude-avant-vente": "Étude avant-vente"
    },
    eventTypes: {
      intervention: "Intervention",
      presentation: "Présentation",
      maintenance: "Maintenance",
      maintenance_preventive: "Maintenance préventive",
      mise_a_jour: "Mise à jour",
      integration_monitoring: "Intégration monitoring",
      other: "Autre"
    },
    proFeatures: {
      prestations: "Prestations",
      planning: "Planning entreprise",
      prestationTickets: "Ticket de Prestations / Services"
    },
    bookmarks: {
      ariaLabel: "Tickets support du contact",
      open: "Ouverts",
      closed: "Clos",
      empty: "Aucun ticket support pour ce contact",
      noOpen: "Aucun ticket ouvert",
      noClosed: "Aucun ticket clos récent",
      viewAll: "Voir tous les tickets",
      createTicket: "Créer un ticket",
      createTicketNeedEnterprise: "Entreprise requise pour créer un ticket",
      untitled: "Sans titre",
      ticketFallback: "Ticket",
      noCategory: "Sans catégorie",
      ticketAria: "Ticket #{number}, {title}, catégorie {category}, SLA {sla}, satisfaction {satisfaction}",
      satisfactionRating: "Note {rating}/5",
      satisfactionAria: "Satisfaction moyenne {rating} sur 5",
      satisfactionNone: "aucune satisfaction",
      assignedAgent: "Agent : {name}",
      createdAt: "Créé {date}",
      updatedAt: "MAJ {date}",
      defaultTicketType: "Support",
      panelTitle: "Tickets support",
      collapsePanelAria: "Masquer les tickets",
      expandPanelAria: "Afficher les tickets",
      summaryCounts: "{open} ouvert(s) · {closed} clos",
      summaryLoading: "Chargement…",
      summaryEmpty: "Aucun ticket"
    },
    portal: {
      heroTitle: "Espace client",
      heroDesc: "Connexion au dashboard entreprise via l'identité de ce contact.",
      statusActive: "Actif",
      statusInactive: "Désactivé",
      statusNone: "Aucun accès",
      statusPending: "En attente d'activation",
      usageHint: "{active}/{max} accès portail actifs (Community)",
      limitReached: "- limite atteinte",
      alertNeedEmail: "Renseignez un e-mail et rattachez le contact à une entreprise pour activer le portail.",
      alertInactive: "Contact inactif · l'accès portail est automatiquement désactivé.",
      loginEmailLabel: "E-mail de connexion",
      lastLoginLabel: "Dernière connexion",
      never: "Jamais",
      toggleTitle: "Accès au dashboard",
      toggleActive: "Le contact peut se connecter à l'espace client.",
      toggleInactive: "L'accès est suspendu sans supprimer le compte.",
      toggleAria: "Activer ou désactiver l'accès au dashboard",
      roleTitle: "Rôle tickets",
      roleUser: "Utilisateur",
      roleSupervisor: "Superviseur",
      roleUserHint: "Voit et agit uniquement sur ses propres tickets (demandeur).",
      roleSupervisorHint: "Voit et agit sur tous les tickets de l'entreprise.",
      roleAria: "Rôle portail pour les tickets",
      resetPassword: "Réinitialiser le MDP",
      sendInvite: "Envoyer un e-mail",
      resendInvite: "Renvoyer l'e-mail",
      impersonate: "Prendre le contrôle",
      impersonateTitle: "Visualiser le portail client avec le compte de ce contact",
      revoke: "Révoquer l'accès",
      emptyTitle: "Aucun accès portail",
      emptyDesc: "Activez l'espace client pour {email}. Vous pourrez ensuite envoyer un e-mail d'invitation.",
      emptyDescInvite: "Activez l'espace client pour {email}. Vous pourrez ensuite envoyer un e-mail d'invitation.",
      createAccess: "Activer l'espace client",
      limitTooltip: "Limite Community : {max} accès actifs maximum",
      limitWarn: "Limite Community : {max} comptes portail client maximum. Passez à Veritas Pro pour en ajouter davantage.",
      contactFallback: "ce contact",
      loginVia: "· connexion via",
      toast: {
        enabled: "Accès portail activé",
        disabled: "Accès portail désactivé",
        created: "Compte portail créé",
        inviteSent: "Invitation portail envoyée",
        passwordUpdated: "Mot de passe mis à jour",
        deleted: "Compte portail supprimé",
        impersonationError: "Impossible de démarrer l'impersonation.",
        roleUpdated: "Rôle portail mis à jour",
        roleError: "Impossible de mettre à jour le rôle portail."
      },
      passwordModal: {
        eyebrow: "Portail client MSP",
        createTitle: "Créer l'accès portail",
        resetTitle: "Réinitialiser le mot de passe",
        createSubtitle: "Un compte espace client sera créé pour ce contact.",
        resetSubtitle: "Définissez un nouveau mot de passe de connexion.",
        createSubmit: "Créer l'accès",
        resetSubmit: "Enregistrer le mot de passe",
        passwordLabel: "Mot de passe",
        confirmLabel: "Confirmation",
        passwordPlaceholder: "Minimum 6 caractères",
        confirmPlaceholder: "Retapez le mot de passe",
        showPasswords: "Afficher les mots de passe",
        footerHint: "Minimum 6 caractères",
        cancel: "Annuler",
        saving: "Enregistrement…",
        close: "Fermer",
        passwordTooShort: "Le mot de passe doit contenir au moins 6 caractères",
        passwordMismatch: "Les mots de passe ne correspondent pas",
        defaultName: "Contact"
      },
      revokeModal: {
        title: "Révoquer l'accès portail",
        subtitle: "Le compte de connexion sera supprimé. La fiche contact CRM est conservée.",
        accountLine: "Compte : {email}",
        consequences: "Conséquences",
        bullets: ["Le contact ne pourra plus se connecter à l'espace client.", "Les identifiants associés seront définitivement supprimés.", "Vous pourrez recréer un accès portail ultérieurement si besoin."],
        cancel: "Annuler",
        revoke: "Révoquer l'accès",
        revoking: "Révocation…",
        close: "Fermer",
        defaultName: "Contact"
      },
      impersonation: {
        title: "Ouverture du portail client",
        signingInAs: "Connexion en tant que",
        cancel: "Annuler",
        contactFallback: "ce contact"
      }
    },
    relative: {
      justNow: "à l'instant",
      minutesAgo: "il y a {count} min",
      hoursAgo: "il y a {count} h",
      daysAgo: "il y a {count} j"
    },
    deleteModal: {
      title: "Supprimer le contact",
      subtitle: "Cette action est définitive et ne peut pas être annulée.",
      consequences: "Conséquences",
      bullets: ["La fiche contact et ses informations seront supprimées.", "L'accès portail associé sera révoqué s'il existe.", "Cette opération ne pourra pas être restaurée depuis Veritas."],
      confirm: "Supprimer définitivement",
      deleting: "Suppression…",
      cancel: "Annuler",
      close: "Fermer",
      defaultName: "ce contact"
    }
  },
  en: {
    loading: "Loading contact record…",
    notFound: "Contact not found",
    loadError: "Error loading contact",
    defaultName: "Contact",
    status: {
      active: "Active",
      inactive: "Inactive",
      unknown: "Not specified"
    },
    heroMetaAria: "Contact information and tags",
    openTickets: "{count} open ticket",
    openTicketsPlural: "{count} open tickets",
    loadingTags: "Loading tags…",
    removeTagAria: "Remove tag {label}",
    addTag: "Add a tag",
    actionsMenu: "Contact actions",
    subscribe: {
      subscribe: "Subscribe to notifications",
      unsubscribe: "Unsubscribe",
      subscribedToast: "Subscription enabled",
      unsubscribedToast: "Subscription removed"
    },
    editContact: "Edit contact",
    copyCard: "Copy record",
    shareCard: "Share record",
    viewEnterprise: "View company",
    companies: "Companies",
    addCompany: "Add company",
    selectCompany: "Select company",
    removeCompanyAria: "Remove {name}",
    companyModal: {
      eyebrow: "Contact record",
      title: "Add a company",
      subtitleWithName: "Link {name} to an existing company",
      subtitleDefault: "Link this contact to an existing company",
      search: "Search",
      searchPlaceholder: "Company name",
      loading: "Loading companies…",
      empty: "No company available to link",
      noResults: "No results",
      hint: "Select a company to link it",
      adding: "Adding…",
      cancel: "Cancel",
      close: "Close"
    },
    vaultClientLabel: "Vault company",
    primaryBadge: "Primary",
    sitePrimaryBadge: "Site primary",
    deleting: "Deleting…",
    deleteContact: "Delete contact",
    coordinates: "Contact details",
    coordFavorite: "Preferred contact detail",
    coordEmpty: "No contact details for this contact.",
    copyCoord: "Copy {label}",
    activityTitle: "MSP activity",
    ticketCount: "{count} ticket",
    ticketCountPlural: "{count} tickets",
    loadingActivity: "Loading activity…",
    kpiOpenSupport: "Open support",
    kpiSupportTickets: "Support tickets",
    kpiPrestations: "Services",
    kpiClientEvents: "Client events",
    supportTicketsTitle: "Support tickets",
    openCount: "{count} open",
    prestationsTitle: "Services / delivery tickets",
    prestationsCount: "{count} ticket(s)",
    upcomingEventsTitle: "Upcoming client events",
    scheduledCount: "{count} scheduled",
    scheduledCountPlural: "{count} scheduled",
    portalTitle: "Client portal",
    sharedAccessTitle: "Access sharing",
    shareAccess: "Share access",
    sidebarInfo: "Information",
    sidebarDates: "Record dates",
    fields: {
      lastName: "Last name",
      firstName: "First name",
      civility: "Title",
      status: "Status",
      role: "Job title",
      created: "Created",
      updated: "Updated"
    },
    table: {
      number: "No.",
      title: "Title",
      status: "Status",
      updated: "Updated",
      type: "Type",
      created: "Created",
      date: "Date"
    },
    emptySupportTickets: "No open support tickets from this contact.",
    emptyPrestationTickets: "No services tickets for this contact.",
    emptyEvents: "No upcoming events for the linked company.",
    guideFab: "Contact record guide",
    guideTitle: "Contact record",
    guide: {
      steps: {
        hero: {
          title: "Contact overview",
          content: "Find the name, status, job title, linked company and tags here. The company link opens the client record directly."
        },
        ticketBookmarks: {
          title: "Open tickets",
          content: "Quickly access this contact's open or recent tickets. Create a new ticket or open the full support list."
        },
        coordinates: {
          title: "Contact details",
          content: "Emails, phones and other contact methods. Click a row to call or send a message."
        },
        activity: {
          title: "MSP activity",
          content: "View support history, service requests and scheduled events for this contact and their company."
        },
        portal: {
          title: "Client portal",
          content: "Enable the client space without sending email, then send or resend the invitation. Also manage role, access, password and logins."
        },
        sharedAccess: {
          title: "Access sharing",
          content: "Share a password or temporary access with the contact on their portal · expiry, view limit, revocation and client-side deletion. Create an access with the + button."
        },
        sidebarInfo: {
          title: "Record information",
          content: "The right panel summarizes identity: last name, first name, title, status and role."
        },
        sidebarDates: {
          title: "Record history",
          content: "Creation and last update dates to track how long the contact has existed and when it was changed."
        },
        heroActions: {
          title: "Contact actions",
          content: "Edit the record, copy or share details, open the linked company or delete the contact from this menu."
        }
      }
    },
    toast: {
      tagAdded: "Tag added",
      tagAddError: "Error adding tag",
      tagRemoved: "Tag removed",
      tagRemoveError: "Error removing tag",
      clientsLoadError: "Unable to load company list",
      cardCopied: "Contact record copied",
      cardCopyError: "Unable to copy contact record",
      deleted: "Contact deleted.",
      deleteError: "Unable to delete contact.",
      createTicketNeedEnterprise: "Link the contact to a company to create a ticket.",
      membershipAdded: "Company added",
      membershipRemoved: "Company removed",
      membershipError: "Unable to update contact companies"
    },
    share: {
      unavailable: "Sharing not available in this browser",
      cancelled: "Share cancelled",
      title: "Contact record · {name}",
      lines: {
        contact: "Contact",
        enterprise: "Company",
        role: "Job title",
        phone: "Phone",
        email: "Email"
      }
    },
    clipboard: {
      unavailable: "{label} unavailable",
      copied: "{label} copied",
      copyFailed: "Unable to copy {label}"
    },
    ticketStatus: {
      open: "Open",
      new: "New",
      pending: "Pending",
      in_progress: "In progress",
      resolved: "Resolved",
      closed: "Closed"
    },
    prestationCategories: {
      "prestation-enlevement": "Pickup",
      "prestation-expedition": "Shipping",
      "prestation-formation": "Training",
      "prestation-intervention-distante": "Remote intervention",
      "prestation-intervention-site": "On-site intervention",
      "prestation-production": "Production",
      "prestation-etude-avant-vente": "Pre-sales study"
    },
    eventTypes: {
      intervention: "Intervention",
      presentation: "Presentation",
      maintenance: "Maintenance",
      maintenance_preventive: "Preventive maintenance",
      mise_a_jour: "Update",
      integration_monitoring: "Monitoring integration",
      other: "Other"
    },
    proFeatures: {
      prestations: "Services",
      planning: "Company planning",
      prestationTickets: "Services / delivery tickets"
    },
    bookmarks: {
      ariaLabel: "Contact support tickets",
      open: "Open",
      closed: "Closed",
      empty: "No support tickets for this contact",
      noOpen: "No open tickets",
      noClosed: "No recently closed tickets",
      viewAll: "View all tickets",
      createTicket: "Create ticket",
      createTicketNeedEnterprise: "Company required to create a ticket",
      untitled: "Untitled",
      ticketFallback: "Ticket",
      noCategory: "No category",
      ticketAria: "Ticket #{number}, {title}, category {category}, SLA {sla}, satisfaction {satisfaction}",
      satisfactionRating: "Rating {rating}/5",
      satisfactionAria: "Average satisfaction {rating} out of 5",
      satisfactionNone: "no satisfaction feedback",
      assignedAgent: "Agent: {name}",
      createdAt: "Created {date}",
      updatedAt: "Updated {date}",
      defaultTicketType: "Support",
      panelTitle: "Support tickets",
      collapsePanelAria: "Hide tickets",
      expandPanelAria: "Show tickets",
      summaryCounts: "{open} open · {closed} closed",
      summaryLoading: "Loading…",
      summaryEmpty: "No tickets"
    },
    portal: {
      heroTitle: "Client space",
      heroDesc: "Sign in to the company dashboard as this contact.",
      statusActive: "Active",
      statusInactive: "Disabled",
      statusNone: "No access",
      statusPending: "Activation pending",
      usageHint: "{active}/{max} active portal accesses (Community)",
      limitReached: "- limit reached",
      alertNeedEmail: "Enter an email and link the contact to a company to enable the portal.",
      alertInactive: "Inactive contact · portal access is automatically disabled.",
      loginEmailLabel: "Login email",
      lastLoginLabel: "Last login",
      never: "Never",
      toggleTitle: "Dashboard access",
      toggleActive: "The contact can sign in to the client space.",
      toggleInactive: "Access is suspended without deleting the account.",
      toggleAria: "Enable or disable dashboard access",
      roleTitle: "Ticket role",
      roleUser: "User",
      roleSupervisor: "Supervisor",
      roleUserHint: "Can only see and act on their own tickets (requester).",
      roleSupervisorHint: "Can see and act on all company tickets.",
      roleAria: "Portal ticket role",
      resetPassword: "Reset password",
      sendInvite: "Send email",
      resendInvite: "Resend email",
      impersonate: "Take control",
      impersonateTitle: "View the client portal with this contact's account",
      revoke: "Revoke access",
      emptyTitle: "No portal access",
      emptyDesc: "Enable the client space for {email}. You can send an invitation email afterwards.",
      emptyDescInvite: "Enable the client space for {email}. You can send an invitation email afterwards.",
      createAccess: "Enable client space",
      limitTooltip: "Community limit: {max} active accesses maximum",
      limitWarn: "Community limit: {max} client portal accounts maximum. Upgrade to Veritas Pro for more.",
      contactFallback: "this contact",
      loginVia: "· sign in via",
      toast: {
        enabled: "Portal access enabled",
        disabled: "Portal access disabled",
        created: "Portal account created",
        inviteSent: "Portal invitation sent",
        passwordUpdated: "Password updated",
        deleted: "Portal account deleted",
        impersonationError: "Unable to start impersonation.",
        roleUpdated: "Portal role updated",
        roleError: "Unable to update the portal role."
      },
      passwordModal: {
        eyebrow: "MSP client portal",
        createTitle: "Create portal access",
        resetTitle: "Reset password",
        createSubtitle: "A client space account will be created for this contact.",
        resetSubtitle: "Set a new sign-in password.",
        createSubmit: "Create access",
        resetSubmit: "Save password",
        passwordLabel: "Password",
        confirmLabel: "Confirmation",
        passwordPlaceholder: "At least 6 characters",
        confirmPlaceholder: "Re-enter password",
        showPasswords: "Show passwords",
        footerHint: "At least 6 characters",
        cancel: "Cancel",
        saving: "Saving…",
        close: "Close",
        passwordTooShort: "Password must be at least 6 characters",
        passwordMismatch: "Passwords do not match",
        defaultName: "Contact"
      },
      revokeModal: {
        title: "Revoke portal access",
        subtitle: "The sign-in account will be deleted. The CRM contact record is kept.",
        accountLine: "Account: {email}",
        consequences: "Consequences",
        bullets: ["The contact will no longer be able to sign in to the client space.", "Associated credentials will be permanently deleted.", "You can recreate portal access later if needed."],
        cancel: "Cancel",
        revoke: "Revoke access",
        revoking: "Revoking…",
        close: "Close",
        defaultName: "Contact"
      },
      impersonation: {
        title: "Opening client portal",
        signingInAs: "Signing in as",
        cancel: "Cancel",
        contactFallback: "this contact"
      }
    },
    relative: {
      justNow: "just now",
      minutesAgo: "{count} min ago",
      hoursAgo: "{count} h ago",
      daysAgo: "{count} d ago"
    },
    deleteModal: {
      title: "Delete contact",
      subtitle: "This action is permanent and cannot be undone.",
      consequences: "Consequences",
      bullets: ["The contact record and its information will be deleted.", "Associated portal access will be revoked if it exists.", "This operation cannot be restored from Veritas."],
      confirm: "Delete permanently",
      deleting: "Deleting…",
      cancel: "Cancel",
      close: "Close",
      defaultName: "this contact"
    }
  },
  de: {
    loading: "Kontaktdatensatz wird geladen…",
    notFound: "Kontakt nicht gefunden",
    loadError: "Fehler beim Laden des Kontakts",
    defaultName: "Kontakt",
    status: {
      active: "Aktiv",
      inactive: "Inaktiv",
      unknown: "Nicht angegeben"
    },
    heroMetaAria: "Kontaktinformationen und Tags",
    openTickets: "{count} offenes Ticket",
    openTicketsPlural: "{count} offene Tickets",
    loadingTags: "Tags werden geladen…",
    removeTagAria: "Tag {label} entfernen",
    addTag: "Tag hinzufügen",
    actionsMenu: "Kontaktaktionen",
    subscribe: {
      subscribe: "Benachrichtigungen abonnieren",
      unsubscribe: "Abo beenden",
      subscribedToast: "Abo aktiviert",
      unsubscribedToast: "Abo entfernt"
    },
    editContact: "Kontakt bearbeiten",
    copyCard: "Datensatz kopieren",
    shareCard: "Datensatz teilen",
    viewEnterprise: "Unternehmen ansehen",
    companies: "Unternehmen",
    addCompany: "Unternehmen hinzufügen",
    selectCompany: "Unternehmen auswählen",
    removeCompanyAria: "{name} entfernen",
    companyModal: {
      eyebrow: "Kontaktdatensatz",
      title: "Unternehmen hinzufügen",
      subtitleWithName: "{name} mit einem bestehenden Unternehmen verknüpfen",
      subtitleDefault: "Diesen Kontakt mit einem bestehenden Unternehmen verknüpfen",
      search: "Suchen",
      searchPlaceholder: "Unternehmensname",
      loading: "Unternehmen werden geladen…",
      empty: "Kein Unternehmen zum Verknüpfen verfügbar",
      noResults: "Keine Ergebnisse",
      hint: "Wählen Sie ein Unternehmen zum Verknüpfen",
      adding: "Wird hinzugefügt…",
      cancel: "Abbrechen",
      close: "Schließen"
    },
    sitePrimaryBadge: "Standort-Hauptkontakt",
    deleting: "Löschen…",
    deleteContact: "Kontakt löschen",
    coordinates: "Kontaktdaten",
    coordFavorite: "Bevorzugte Koordinate",
    coordEmpty: "Keine Kontaktdaten für diesen Kontakt.",
    copyCoord: "{label} kopieren",
    activityTitle: "MSP-Aktivität",
    ticketCount: "{count} Ticket",
    ticketCountPlural: "{count} Tickets",
    loadingActivity: "Aktivität wird geladen…",
    kpiOpenSupport: "Offener Support",
    kpiSupportTickets: "Support-Tickets",
    kpiPrestations: "Leistungen",
    kpiClientEvents: "Kundenereignisse",
    supportTicketsTitle: "Support-Tickets",
    openCount: "{count} offen",
    prestationsTitle: "Leistungs-Tickets",
    prestationsCount: "{count} Ticket(s)",
    upcomingEventsTitle: "Bevorstehende Kundenereignisse",
    scheduledCount: "{count} geplant",
    scheduledCountPlural: "{count} geplant",
    portalTitle: "Kundenportal",
    sharedAccessTitle: "Zugriff teilen",
    shareAccess: "Zugriff teilen",
    sidebarInfo: "Informationen",
    sidebarDates: "Datensatz-Daten",
    fields: {
      lastName: "Nachname",
      firstName: "Vorname",
      civility: "Anrede",
      status: "Status",
      role: "Funktion",
      created: "Erstellt",
      updated: "Geändert"
    },
    table: {
      number: "Nr.",
      title: "Titel",
      status: "Status",
      updated: "Aktualisiert",
      type: "Typ",
      created: "Erstellt",
      date: "Datum"
    },
    emptySupportTickets: "Keine offenen Support-Tickets von diesem Kontakt.",
    emptyPrestationTickets: "Keine Leistungs-Tickets für diesen Kontakt.",
    emptyEvents: "Keine bevorstehenden Ereignisse für das verknüpfte Unternehmen.",
    guideFab: "Kontaktdatensatz-Anleitung",
    guideTitle: "Kontaktdatensatz",
    guide: {
      steps: {
        hero: {
          title: "Kontaktübersicht",
          content: "Name, Status, Funktion, verknüpftes Unternehmen und Tags. Der Unternehmenslink öffnet die Kundendatensatz."
        },
        ticketBookmarks: {
          title: "Laufende Tickets",
          content: "Schnellzugriff auf offene oder kürzliche Tickets. Neues Ticket erstellen oder vollständige Support-Liste öffnen."
        },
        coordinates: {
          title: "Kontaktdaten",
          content: "E-Mails, Telefone und andere Kommunikationswege. Klicken zum Anrufen oder Nachricht senden."
        },
        activity: {
          title: "MSP-Aktivität",
          content: "Support-Verlauf, Leistungsanfragen und geplante Ereignisse für Kontakt und Unternehmen."
        },
        portal: {
          title: "Kundenportal",
          content: "Kundenbereich ohne E-Mail aktivieren, danach Einladung senden oder erneut senden. Rolle, Zugang, Passwort und Anmeldungen verwalten."
        },
        sharedAccess: {
          title: "Zugriff teilen",
          content: "Teilen Sie ein Passwort oder einen temporären Zugriff mit dem Kontakt im Portal · Ablauf, Ansichtslimit, Widerruf und clientseitige Löschung. Erstellen Sie einen Zugriff mit der +-Schaltfläche."
        },
        sidebarInfo: {
          title: "Datensatz-Informationen",
          content: "Rechtes Panel: Nachname, Vorname, Anrede, Status und Funktion."
        },
        sidebarDates: {
          title: "Datensatz-Verlauf",
          content: "Erstellungs- und Änderungsdatum zur Nachverfolgung."
        },
        heroActions: {
          title: "Kontaktaktionen",
          content: "Datensatz bearbeiten, kopieren/teilen, Unternehmen öffnen oder Kontakt löschen."
        }
      }
    },
    toast: {
      tagAdded: "Tag hinzugefügt",
      tagAddError: "Fehler beim Hinzufügen des Tags",
      tagRemoved: "Tag entfernt",
      tagRemoveError: "Fehler beim Entfernen des Tags",
      clientsLoadError: "Unternehmensliste konnte nicht geladen werden",
      cardCopied: "Kontaktdatensatz kopiert",
      cardCopyError: "Kontaktdatensatz konnte nicht kopiert werden",
      deleted: "Kontakt gelöscht.",
      deleteError: "Kontakt konnte nicht gelöscht werden.",
      createTicketNeedEnterprise: "Kontakt mit Unternehmen verknüpfen, um ein Ticket zu erstellen."
    },
    share: {
      unavailable: "Teilen in diesem Browser nicht verfügbar",
      cancelled: "Teilen abgebrochen",
      title: "Kontaktdatensatz · {name}",
      lines: {
        contact: "Kontakt",
        enterprise: "Unternehmen",
        role: "Funktion",
        phone: "Telefon",
        email: "E-Mail"
      }
    },
    clipboard: {
      unavailable: "{label} nicht verfügbar",
      copied: "{label} kopiert",
      copyFailed: "{label} konnte nicht kopiert werden"
    },
    ticketStatus: {
      open: "Offen",
      new: "Neu",
      pending: "Ausstehend",
      in_progress: "In Bearbeitung",
      resolved: "Gelöst",
      closed: "Geschlossen"
    },
    prestationCategories: {
      "prestation-enlevement": "Abholung",
      "prestation-expedition": "Versand",
      "prestation-formation": "Schulung",
      "prestation-intervention-distante": "Remote-Einsatz",
      "prestation-intervention-site": "Vor-Ort-Einsatz",
      "prestation-production": "Produktion",
      "prestation-etude-avant-vente": "Vorverkaufsstudie"
    },
    eventTypes: {
      intervention: "Einsatz",
      presentation: "Präsentation",
      maintenance: "Wartung",
      maintenance_preventive: "Präventive Wartung",
      mise_a_jour: "Update",
      integration_monitoring: "Monitoring-Integration",
      other: "Sonstiges"
    },
    proFeatures: {
      prestations: "Leistungen",
      planning: "Unternehmensplanung",
      prestationTickets: "Leistungs-Tickets"
    },
    bookmarks: {
      ariaLabel: "Support-Tickets des Kontakts",
      open: "Offen",
      closed: "Geschlossen",
      empty: "Keine Support-Tickets für diesen Kontakt",
      noOpen: "Keine offenen Tickets",
      noClosed: "Keine kürzlich geschlossenen Tickets",
      viewAll: "Alle Tickets anzeigen",
      createTicket: "Ticket erstellen",
      createTicketNeedEnterprise: "Unternehmen erforderlich",
      untitled: "Ohne Titel",
      ticketFallback: "Ticket",
      noCategory: "Keine Kategorie",
      ticketAria: "Ticket #{number}, {title}, Kategorie {category}, SLA {sla}, Zufriedenheit {satisfaction}",
      satisfactionRating: "Note {rating}/5",
      satisfactionAria: "Durchschnittliche Zufriedenheit {rating} von 5",
      satisfactionNone: "keine Zufriedenheitsbewertung",
      assignedAgent: "Agent: {name}",
      createdAt: "Erstellt {date}",
      updatedAt: "Aktualisiert {date}",
      defaultTicketType: "Support",
      panelTitle: "Support-Tickets",
      collapsePanelAria: "Tickets ausblenden",
      expandPanelAria: "Tickets anzeigen",
      summaryCounts: "{open} offen · {closed} geschlossen",
      summaryLoading: "Laden…",
      summaryEmpty: "Keine Tickets"
    },
    portal: {
      heroTitle: "Kundenbereich",
      heroDesc: "Anmeldung am Unternehmens-Dashboard als dieser Kontakt.",
      statusActive: "Aktiv",
      statusInactive: "Deaktiviert",
      statusNone: "Kein Zugang",
      usageHint: "{active}/{max} aktive Portalzugänge (Community)",
      limitReached: "- Limit erreicht",
      alertNeedEmail: "E-Mail angeben und Kontakt mit Unternehmen verknüpfen.",
      alertInactive: "Inaktiver Kontakt · Portalzugang automatisch deaktiviert.",
      loginEmailLabel: "Anmelde-E-Mail",
      lastLoginLabel: "Letzte Anmeldung",
      never: "Nie",
      toggleTitle: "Dashboard-Zugang",
      toggleActive: "Kontakt kann sich am Kundenbereich anmelden.",
      toggleInactive: "Zugang ausgesetzt ohne Konto zu löschen.",
      toggleAria: "Dashboard-Zugang umschalten",
      roleTitle: "Ticket-Rolle",
      roleUser: "Benutzer",
      roleSupervisor: "Supervisor",
      roleUserHint: "Sieht und bearbeitet nur die eigenen Tickets (Antragsteller).",
      roleSupervisorHint: "Sieht und bearbeitet alle Tickets des Unternehmens.",
      roleAria: "Portal-Ticketrolle",
      resetPassword: "Passwort zurücksetzen",
      sendInvite: "E-Mail senden",
      resendInvite: "E-Mail erneut senden",
      statusPending: "Aktivierung ausstehend",
      emptyDescInvite: "Aktivieren Sie den Kundenbereich für {email}. Die Einladungs-E-Mail kann danach gesendet werden.",
      impersonate: "Übernehmen",
      impersonateTitle: "Kundenportal mit diesem Konto anzeigen",
      revoke: "Zugang widerrufen",
      emptyTitle: "Kein Portalzugang",
      emptyDesc: "Aktivieren Sie den Kundenbereich für {email}. Die Einladungs-E-Mail kann danach gesendet werden.",
      createAccess: "Kundenbereich aktivieren",
      limitTooltip: "Community-Limit: max. {max} aktive Zugänge",
      limitWarn: "Community-Limit: max. {max} Portal-Konten. Upgrade auf Veritas Pro.",
      contactFallback: "dieser Kontakt",
      loginVia: "· Anmeldung über",
      toast: {
        enabled: "Portalzugang aktiviert",
        disabled: "Portalzugang deaktiviert",
        created: "Portal-Konto erstellt",
        inviteSent: "Portal-Einladung gesendet",
        passwordUpdated: "Passwort aktualisiert",
        deleted: "Portal-Konto gelöscht",
        impersonationError: "Impersonation konnte nicht gestartet werden.",
        roleUpdated: "Portalrolle aktualisiert",
        roleError: "Portalrolle konnte nicht aktualisiert werden."
      },
      passwordModal: {
        eyebrow: "MSP-Kundenportal",
        createTitle: "Portalzugang erstellen",
        resetTitle: "Passwort zurücksetzen",
        createSubtitle: "Ein Kundenbereich-Konto wird für diesen Kontakt erstellt.",
        resetSubtitle: "Neues Anmeldepasswort festlegen.",
        createSubmit: "Zugang erstellen",
        resetSubmit: "Passwort speichern",
        passwordLabel: "Passwort",
        confirmLabel: "Bestätigung",
        passwordPlaceholder: "Mindestens 6 Zeichen",
        confirmPlaceholder: "Passwort wiederholen",
        showPasswords: "Passwörter anzeigen",
        footerHint: "Mindestens 6 Zeichen",
        cancel: "Abbrechen",
        saving: "Speichern…",
        close: "Schließen",
        passwordTooShort: "Passwort muss mindestens 6 Zeichen haben",
        passwordMismatch: "Passwörter stimmen nicht überein",
        defaultName: "Kontakt"
      },
      revokeModal: {
        title: "Portalzugang widerrufen",
        subtitle: "Anmeldekonto wird gelöscht. CRM-Datensatz bleibt.",
        accountLine: "Konto: {email}",
        consequences: "Folgen",
        bullets: ["Keine Anmeldung mehr am Kundenbereich.", "Zugangsdaten werden gelöscht.", "Zugang kann später neu erstellt werden."],
        cancel: "Abbrechen",
        revoke: "Zugang widerrufen",
        revoking: "Widerruf…",
        close: "Schließen",
        defaultName: "Kontakt"
      },
      impersonation: {
        title: "Kundenportal wird geöffnet",
        signingInAs: "Anmeldung als",
        cancel: "Abbrechen",
        contactFallback: "dieser Kontakt"
      }
    },
    relative: {
      justNow: "gerade eben",
      minutesAgo: "vor {count} Min.",
      hoursAgo: "vor {count} Std.",
      daysAgo: "vor {count} T."
    },
    deleteModal: {
      title: "Kontakt löschen",
      subtitle: "Diese Aktion ist endgültig.",
      consequences: "Folgen",
      bullets: ["Kontaktdatensatz wird gelöscht.", "Portalzugang wird widerrufen.", "Nicht wiederherstellbar."],
      confirm: "Endgültig löschen",
      deleting: "Löschen…",
      cancel: "Abbrechen",
      close: "Schließen",
      defaultName: "dieser Kontakt"
    }
  },
  it: {
    loading: "Caricamento scheda contatto…",
    notFound: "Contatto non trovato",
    loadError: "Errore caricamento contatto",
    defaultName: "Contatto",
    status: {
      active: "Attivo",
      inactive: "Inattivo",
      unknown: "Non specificato"
    },
    heroMetaAria: "Informazioni ed etichette contatto",
    openTickets: "{count} ticket aperto",
    openTicketsPlural: "{count} ticket aperti",
    loadingTags: "Caricamento etichette…",
    removeTagAria: "Rimuovi etichetta {label}",
    addTag: "Aggiungi etichetta",
    actionsMenu: "Azioni sul contatto",
    subscribe: {
      subscribe: "Iscriviti alle notifiche",
      unsubscribe: "Annulla iscrizione",
      subscribedToast: "Iscrizione attivata",
      unsubscribedToast: "Iscrizione rimossa"
    },
    editContact: "Modifica contatto",
    copyCard: "Copia scheda",
    shareCard: "Condividi scheda",
    viewEnterprise: "Vedi azienda",
    companies: "Aziende",
    addCompany: "Aggiungi azienda",
    selectCompany: "Seleziona azienda",
    removeCompanyAria: "Rimuovi {name}",
    companyModal: {
      eyebrow: "Scheda contatto",
      title: "Aggiungi azienda",
      subtitleWithName: "Collega {name} a un'azienda esistente",
      subtitleDefault: "Collega questo contatto a un'azienda esistente",
      search: "Cerca",
      searchPlaceholder: "Nome azienda",
      loading: "Caricamento aziende…",
      empty: "Nessuna azienda disponibile da collegare",
      noResults: "Nessun risultato",
      hint: "Seleziona un'azienda da collegare",
      adding: "Aggiunta…",
      cancel: "Annulla",
      close: "Chiudi"
    },
    sitePrimaryBadge: "Principale della sede",
    deleting: "Eliminazione…",
    deleteContact: "Elimina contatto",
    coordinates: "Contatti",
    coordFavorite: "Contatto preferito",
    coordEmpty: "Nessun contatto per questo contatto.",
    copyCoord: "Copia {label}",
    activityTitle: "Attività MSP",
    ticketCount: "{count} ticket",
    ticketCountPlural: "{count} ticket",
    loadingActivity: "Caricamento attività…",
    kpiOpenSupport: "Supporto aperti",
    kpiSupportTickets: "Ticket Supporto",
    kpiPrestations: "Prestazioni",
    kpiClientEvents: "Eventi cliente",
    supportTicketsTitle: "Ticket Supporto",
    openCount: "{count} aperto/i",
    prestationsTitle: "Ticket Prestazioni / Servizi",
    prestationsCount: "{count} ticket",
    upcomingEventsTitle: "Prossimi eventi cliente",
    scheduledCount: "{count} pianificato",
    scheduledCountPlural: "{count} pianificati",
    portalTitle: "Portale cliente",
    sharedAccessTitle: "Condivisione accessi",
    shareAccess: "Condividi accesso",
    sidebarInfo: "Informazioni",
    sidebarDates: "Date scheda",
    fields: {
      lastName: "Cognome",
      firstName: "Nome",
      civility: "Titolo",
      status: "Stato",
      role: "Ruolo",
      created: "Creato il",
      updated: "Modificato il"
    },
    table: {
      number: "N°",
      title: "Titolo",
      status: "Stato",
      updated: "Aggiornato",
      type: "Tipo",
      created: "Creato",
      date: "Data"
    },
    emptySupportTickets: "Nessun ticket supporto aperto da questo contatto.",
    emptyPrestationTickets: "Nessun ticket prestazioni per questo contatto.",
    emptyEvents: "Nessun evento imminente per l'azienda collegata.",
    guideFab: "Guida scheda contatto",
    guideTitle: "Scheda contatto",
    guide: {
      steps: {
        hero: {
          title: "Panoramica contatto",
          content: "Nome, stato, ruolo, azienda collegata ed etichette. Il link azienda apre la scheda cliente."
        },
        ticketBookmarks: {
          title: "Ticket in corso",
          content: "Accesso rapido ai ticket aperti o recenti. Crea un ticket o apri l'elenco completo del supporto."
        },
        coordinates: {
          title: "Contatti",
          content: "Email, telefoni e altri mezzi di comunicazione. Clicca per chiamare o inviare un messaggio."
        },
        activity: {
          title: "Attività MSP",
          content: "Storico supporto, richieste prestazioni ed eventi pianificati per contatto e azienda."
        },
        portal: {
          title: "Portale cliente",
          content: "Attivate lo spazio cliente senza email, poi inviate o reinviate l'invito. Gestite anche ruolo, accesso, password e accessi."
        },
        sharedAccess: {
          title: "Condivisione accessi",
          content: "Condividi una password o un accesso temporaneo con il contatto sul portale · scadenza, limite visualizzazioni, revoca e eliminazione lato cliente. Crea un accesso con il pulsante +."
        },
        sidebarInfo: {
          title: "Informazioni scheda",
          content: "Il pannello destro riassume identità: cognome, nome, titolo, stato e ruolo."
        },
        sidebarDates: {
          title: "Storico scheda",
          content: "Date di creazione e ultima modifica per tracciare aggiornamenti."
        },
        heroActions: {
          title: "Azioni sul contatto",
          content: "Modifica, copia/condividi, apri azienda o elimina contatto da questo menu."
        }
      }
    },
    toast: {
      tagAdded: "Etichetta aggiunta",
      tagAddError: "Errore aggiunta etichetta",
      tagRemoved: "Etichetta rimossa",
      tagRemoveError: "Errore rimozione etichetta",
      clientsLoadError: "Impossibile caricare elenco aziende",
      cardCopied: "Scheda contatto copiata",
      cardCopyError: "Impossibile copiare la scheda",
      deleted: "Contatto eliminato.",
      deleteError: "Impossibile eliminare il contatto.",
      createTicketNeedEnterprise: "Collega il contatto a un'azienda per creare un ticket."
    },
    share: {
      unavailable: "Condivisione non disponibile",
      cancelled: "Condivisione annullata",
      title: "Scheda contatto · {name}",
      lines: {
        contact: "Contatto",
        enterprise: "Azienda",
        role: "Ruolo",
        phone: "Telefono",
        email: "Email"
      }
    },
    clipboard: {
      unavailable: "{label} non disponibile",
      copied: "{label} copiato",
      copyFailed: "Impossibile copiare {label}"
    },
    ticketStatus: {
      open: "Aperto",
      new: "Nuovo",
      pending: "In attesa",
      in_progress: "In corso",
      resolved: "Risolto",
      closed: "Chiuso"
    },
    prestationCategories: {
      "prestation-enlevement": "Ritiro",
      "prestation-expedition": "Spedizione",
      "prestation-formation": "Formazione",
      "prestation-intervention-distante": "Intervento remoto",
      "prestation-intervention-site": "Intervento in sede",
      "prestation-production": "Produzione",
      "prestation-etude-avant-vente": "Studio pre-vendita"
    },
    eventTypes: {
      intervention: "Intervento",
      presentation: "Presentazione",
      maintenance: "Manutenzione",
      maintenance_preventive: "Manutenzione preventiva",
      mise_a_jour: "Aggiornamento",
      integration_monitoring: "Integrazione monitoring",
      other: "Altro"
    },
    proFeatures: {
      prestations: "Prestazioni",
      planning: "Pianificazione azienda",
      prestationTickets: "Ticket Prestazioni / Servizi"
    },
    bookmarks: {
      ariaLabel: "Ticket supporto del contatto",
      open: "Aperti",
      closed: "Chiusi",
      empty: "Nessun ticket supporto per questo contatto",
      noOpen: "Nessun ticket aperto",
      noClosed: "Nessun ticket chiuso di recente",
      viewAll: "Vedi tutti i ticket",
      createTicket: "Crea ticket",
      createTicketNeedEnterprise: "Azienda richiesta",
      untitled: "Senza titolo",
      ticketFallback: "Ticket",
      noCategory: "Senza categoria",
      ticketAria: "Ticket #{number}, {title}, categoria {category}, SLA {sla}, soddisfazione {satisfaction}",
      satisfactionRating: "Voto {rating}/5",
      satisfactionAria: "Soddisfazione media {rating} su 5",
      satisfactionNone: "nessun feedback di soddisfazione",
      assignedAgent: "Agente: {name}",
      createdAt: "Creato {date}",
      updatedAt: "Aggiornato {date}",
      defaultTicketType: "Supporto",
      panelTitle: "Ticket supporto",
      collapsePanelAria: "Nascondi i ticket",
      expandPanelAria: "Mostra i ticket",
      summaryCounts: "{open} aperti · {closed} chiusi",
      summaryLoading: "Caricamento…",
      summaryEmpty: "Nessun ticket"
    },
    portal: {
      heroTitle: "Spazio cliente",
      heroDesc: "Accesso alla dashboard azienda con l'identità di questo contatto.",
      statusActive: "Attivo",
      statusInactive: "Disattivato",
      statusNone: "Nessun accesso",
      usageHint: "{active}/{max} accessi portale attivi (Community)",
      limitReached: "- limite raggiunto",
      alertNeedEmail: "Inserisci e-mail e collega il contatto a un'azienda.",
      alertInactive: "Contatto inattivo · accesso portale disattivato automaticamente.",
      loginEmailLabel: "E-mail di accesso",
      lastLoginLabel: "Ultimo accesso",
      never: "Mai",
      toggleTitle: "Accesso dashboard",
      toggleActive: "Il contatto può accedere allo spazio cliente.",
      toggleInactive: "Accesso sospeso senza eliminare l'account.",
      toggleAria: "Attiva/disattiva accesso dashboard",
      roleTitle: "Ruolo ticket",
      roleUser: "Utente",
      roleSupervisor: "Supervisore",
      roleUserHint: "Vede e agisce solo sui propri ticket (richiedente).",
      roleSupervisorHint: "Vede e agisce su tutti i ticket dell'azienda.",
      roleAria: "Ruolo ticket portale",
      resetPassword: "Reimposta password",
      sendInvite: "Invia e-mail",
      resendInvite: "Reinvia e-mail",
      statusPending: "Attivazione in attesa",
      emptyDescInvite: "Attiva lo spazio cliente per {email}. Potrai poi inviare l'e-mail di invito.",
      impersonate: "Prendi controllo",
      impersonateTitle: "Visualizza portale con account del contatto",
      revoke: "Revoca accesso",
      emptyTitle: "Nessun accesso portale",
      emptyDesc: "Attiva lo spazio cliente per {email}. Potrai poi inviare l'e-mail di invito.",
      createAccess: "Attiva spazio cliente",
      limitTooltip: "Limite Community: max {max} accessi attivi",
      limitWarn: "Limite Community: max {max} account portale. Passa a Veritas Pro.",
      contactFallback: "questo contatto",
      loginVia: "· accesso via",
      toast: {
        enabled: "Accesso portale attivato",
        disabled: "Accesso portale disattivato",
        created: "Account portale creato",
        inviteSent: "Invito portale inviato",
        passwordUpdated: "Password aggiornata",
        deleted: "Account portale eliminato",
        impersonationError: "Impossibile avviare impersonation.",
        roleUpdated: "Ruolo portale aggiornato",
        roleError: "Impossibile aggiornare il ruolo portale."
      },
      passwordModal: {
        eyebrow: "Portale cliente MSP",
        createTitle: "Crea accesso portale",
        resetTitle: "Reimposta password",
        createSubtitle: "Verrà creato un account spazio cliente.",
        resetSubtitle: "Imposta nuova password.",
        createSubmit: "Crea accesso",
        resetSubmit: "Salva password",
        passwordLabel: "Password",
        confirmLabel: "Conferma",
        passwordPlaceholder: "Minimo 6 caratteri",
        confirmPlaceholder: "Ripeti password",
        showPasswords: "Mostra password",
        footerHint: "Minimo 6 caratteri",
        cancel: "Annulla",
        saving: "Salvataggio…",
        close: "Chiudi",
        passwordTooShort: "Password di almeno 6 caratteri",
        passwordMismatch: "Le password non coincidono",
        defaultName: "Contatto"
      },
      revokeModal: {
        title: "Revoca accesso portale",
        subtitle: "Account eliminato. Scheda CRM conservata.",
        accountLine: "Account: {email}",
        consequences: "Conseguenze",
        bullets: ["Nessun accesso allo spazio cliente.", "Credenziali eliminate.", "Accesso ricreabile in seguito."],
        cancel: "Annulla",
        revoke: "Revoca accesso",
        revoking: "Revoca…",
        close: "Chiudi",
        defaultName: "Contatto"
      },
      impersonation: {
        title: "Apertura portale cliente",
        signingInAs: "Accesso come",
        cancel: "Annulla",
        contactFallback: "questo contatto"
      }
    },
    relative: {
      justNow: "adesso",
      minutesAgo: "{count} min fa",
      hoursAgo: "{count} h fa",
      daysAgo: "{count} g fa"
    },
    deleteModal: {
      title: "Elimina contatto",
      subtitle: "Azione definitiva e irreversibile.",
      consequences: "Conseguenze",
      bullets: ["La scheda contatto sarà eliminata.", "L'accesso portale sarà revocato.", "Operazione irreversibile."],
      confirm: "Elimina definitivamente",
      deleting: "Eliminazione…",
      cancel: "Annulla",
      close: "Chiudi",
      defaultName: "questo contatto"
    }
  },
  es: {
    loading: "Cargando ficha de contacto…",
    notFound: "Contacto no encontrado",
    loadError: "Error al cargar contacto",
    defaultName: "Contacto",
    status: {
      active: "Activo",
      inactive: "Inactivo",
      unknown: "No especificado"
    },
    heroMetaAria: "Información y etiquetas del contacto",
    openTickets: "{count} ticket abierto",
    openTicketsPlural: "{count} tickets abiertos",
    loadingTags: "Cargando etiquetas…",
    removeTagAria: "Quitar etiqueta {label}",
    addTag: "Añadir etiqueta",
    actionsMenu: "Acciones del contacto",
    subscribe: {
      subscribe: "Suscribirse a notificaciones",
      unsubscribe: "Cancelar suscripción",
      subscribedToast: "Suscripción activada",
      unsubscribedToast: "Suscripción eliminada"
    },
    editContact: "Editar contacto",
    copyCard: "Copiar ficha",
    shareCard: "Compartir ficha",
    viewEnterprise: "Ver empresa",
    companies: "Empresas",
    addCompany: "Añadir empresa",
    selectCompany: "Seleccionar empresa",
    removeCompanyAria: "Quitar {name}",
    companyModal: {
      eyebrow: "Ficha de contacto",
      title: "Añadir empresa",
      subtitleWithName: "Vincular {name} a una empresa existente",
      subtitleDefault: "Vincular este contacto a una empresa existente",
      search: "Buscar",
      searchPlaceholder: "Nombre de la empresa",
      loading: "Cargando empresas…",
      empty: "No hay empresa disponible para vincular",
      noResults: "Sin resultados",
      hint: "Seleccione una empresa para vincularla",
      adding: "Añadiendo…",
      cancel: "Cancelar",
      close: "Cerrar"
    },
    sitePrimaryBadge: "Principal del lugar",
    deleting: "Eliminando…",
    deleteContact: "Eliminar contacto",
    coordinates: "Datos de contacto",
    coordFavorite: "Dato preferido",
    coordEmpty: "Ningún dato de contacto para este contacto.",
    copyCoord: "Copiar {label}",
    activityTitle: "Actividad MSP",
    ticketCount: "{count} ticket",
    ticketCountPlural: "{count} tickets",
    loadingActivity: "Cargando actividad…",
    kpiOpenSupport: "Soporte abiertos",
    kpiSupportTickets: "Tickets Soporte",
    kpiPrestations: "Prestaciones",
    kpiClientEvents: "Eventos cliente",
    supportTicketsTitle: "Tickets Soporte",
    openCount: "{count} abierto(s)",
    prestationsTitle: "Tickets Prestaciones / Servicios",
    prestationsCount: "{count} ticket(s)",
    upcomingEventsTitle: "Próximos eventos cliente",
    scheduledCount: "{count} planificado",
    scheduledCountPlural: "{count} planificados",
    portalTitle: "Portal cliente",
    sharedAccessTitle: "Compartir acceso",
    shareAccess: "Compartir acceso",
    sidebarInfo: "Información",
    sidebarDates: "Fechas de la ficha",
    fields: {
      lastName: "Apellidos",
      firstName: "Nombre",
      civility: "Tratamiento",
      status: "Estado",
      role: "Puesto",
      created: "Creado",
      updated: "Modificado"
    },
    table: {
      number: "N°",
      title: "Título",
      status: "Estado",
      updated: "Actualizado",
      type: "Tipo",
      created: "Creado",
      date: "Fecha"
    },
    emptySupportTickets: "Ningún ticket de soporte abierto de este contacto.",
    emptyPrestationTickets: "Ningún ticket de prestaciones para este contacto.",
    emptyEvents: "Ningún evento próximo para la empresa vinculada.",
    guideFab: "Guía ficha contacto",
    guideTitle: "Ficha contacto",
    guide: {
      steps: {
        hero: {
          title: "Vista general del contacto",
          content: "Nombre, estado, puesto, empresa vinculada y etiquetas. El enlace empresa abre la ficha cliente."
        },
        ticketBookmarks: {
          title: "Tickets en curso",
          content: "Acceso rápido a tickets abiertos o recientes. Cree un ticket o abra la lista completa de soporte."
        },
        coordinates: {
          title: "Datos de contacto",
          content: "Emails, teléfonos y otros medios. Haga clic para llamar o enviar un mensaje."
        },
        activity: {
          title: "Actividad MSP",
          content: "Historial de soporte, prestaciones y eventos planificados del contacto y su empresa."
        },
        portal: {
          title: "Portal cliente",
          content: "Active el espacio cliente sin correo, luego envíe o reenvíe la invitación. Gestione también rol, acceso, contraseña y conexiones."
        },
        sharedAccess: {
          title: "Compartir acceso",
          content: "Comparta una contraseña o un acceso temporal con el contacto en su portal · caducidad, límite de consultas, revocación y eliminación del lado del cliente. Cree un acceso con el botón +."
        },
        sidebarInfo: {
          title: "Información de la ficha",
          content: "El panel derecho resume la identidad: apellidos, nombre, tratamiento, estado y puesto."
        },
        sidebarDates: {
          title: "Historial de la ficha",
          content: "Fechas de creación y última modificación para seguir actualizaciones."
        },
        heroActions: {
          title: "Acciones del contacto",
          content: "Edite, copie/comparta, abra la empresa o elimine el contacto desde este menú."
        }
      }
    },
    toast: {
      tagAdded: "Etiqueta añadida",
      tagAddError: "Error al añadir etiqueta",
      tagRemoved: "Etiqueta eliminada",
      tagRemoveError: "Error al eliminar etiqueta",
      clientsLoadError: "No se pudo cargar la lista de empresas",
      cardCopied: "Ficha contacto copiada",
      cardCopyError: "No se pudo copiar la ficha",
      deleted: "Contacto eliminado.",
      deleteError: "No se pudo eliminar el contacto.",
      createTicketNeedEnterprise: "Vincule el contacto a una empresa para crear un ticket."
    },
    share: {
      unavailable: "Compartir no disponible en este navegador",
      cancelled: "Compartir cancelado",
      title: "Ficha contacto · {name}",
      lines: {
        contact: "Contacto",
        enterprise: "Empresa",
        role: "Puesto",
        phone: "Teléfono",
        email: "Email"
      }
    },
    clipboard: {
      unavailable: "{label} no disponible",
      copied: "{label} copiado",
      copyFailed: "No se pudo copiar {label}"
    },
    ticketStatus: {
      open: "Abierto",
      new: "Nuevo",
      pending: "Pendiente",
      in_progress: "En curso",
      resolved: "Resuelto",
      closed: "Cerrado"
    },
    prestationCategories: {
      "prestation-enlevement": "Recogida",
      "prestation-expedition": "Envío",
      "prestation-formation": "Formación",
      "prestation-intervention-distante": "Intervención remota",
      "prestation-intervention-site": "Intervención in situ",
      "prestation-production": "Producción",
      "prestation-etude-avant-vente": "Estudio previo a venta"
    },
    eventTypes: {
      intervention: "Intervención",
      presentation: "Presentación",
      maintenance: "Mantenimiento",
      maintenance_preventive: "Mantenimiento preventivo",
      mise_a_jour: "Actualización",
      integration_monitoring: "Integración monitoring",
      other: "Otro"
    },
    proFeatures: {
      prestations: "Prestaciones",
      planning: "Planificación empresa",
      prestationTickets: "Tickets Prestaciones / Servicios"
    },
    bookmarks: {
      ariaLabel: "Tickets Soporte del contacto",
      open: "Abiertos",
      closed: "Cerrados",
      empty: "Ningún ticket de soporte para este contacto",
      noOpen: "Ningún ticket abierto",
      noClosed: "Ningún ticket cerrado reciente",
      viewAll: "Ver todos los tickets",
      createTicket: "Crear ticket",
      createTicketNeedEnterprise: "Empresa requerida",
      untitled: "Sin título",
      ticketFallback: "Ticket",
      noCategory: "Sin categoría",
      ticketAria: "Ticket #{number}, {title}, categoría {category}, SLA {sla}, satisfacción {satisfaction}",
      satisfactionRating: "Nota {rating}/5",
      satisfactionAria: "Satisfacción media {rating} de 5",
      satisfactionNone: "sin feedback de satisfacción",
      assignedAgent: "Agente: {name}",
      createdAt: "Creado {date}",
      updatedAt: "Actualizado {date}",
      defaultTicketType: "Soporte",
      panelTitle: "Tickets soporte",
      collapsePanelAria: "Ocultar tickets",
      expandPanelAria: "Mostrar tickets",
      summaryCounts: "{open} abiertos · {closed} cerrados",
      summaryLoading: "Cargando…",
      summaryEmpty: "Ningún ticket"
    },
    portal: {
      heroTitle: "Espacio cliente",
      heroDesc: "Acceso al panel de la empresa con la identidad de este contacto.",
      statusActive: "Activo",
      statusInactive: "Desactivado",
      statusNone: "Sin acceso",
      usageHint: "{active}/{max} accesos portal activos (Community)",
      limitReached: "- límite alcanzado",
      alertNeedEmail: "Indique e-mail y vincule el contacto a una empresa.",
      alertInactive: "Contacto inactivo · acceso portal desactivado automáticamente.",
      loginEmailLabel: "E-mail de acceso",
      lastLoginLabel: "Último acceso",
      never: "Nunca",
      toggleTitle: "Acceso al panel",
      toggleActive: "El contacto puede acceder al espacio cliente.",
      toggleInactive: "Acceso suspendido sin eliminar la cuenta.",
      toggleAria: "Activar/desactivar acceso al panel",
      roleTitle: "Rol de tickets",
      roleUser: "Usuario",
      roleSupervisor: "Supervisor",
      roleUserHint: "Solo ve y actúa sobre sus propios tickets (solicitante).",
      roleSupervisorHint: "Ve y actúa sobre todos los tickets de la empresa.",
      roleAria: "Rol de tickets del portal",
      resetPassword: "Restablecer contraseña",
      sendInvite: "Enviar e-mail",
      resendInvite: "Reenviar e-mail",
      statusPending: "Activación pendiente",
      emptyDescInvite: "Active el espacio cliente para {email}. Después podrá enviar el e-mail de invitación.",
      impersonate: "Tomar control",
      impersonateTitle: "Ver portal con la cuenta del contacto",
      revoke: "Revocar acceso",
      emptyTitle: "Sin acceso portal",
      emptyDesc: "Active el espacio cliente para {email}. Después podrá enviar el e-mail de invitación.",
      createAccess: "Activar espacio cliente",
      limitTooltip: "Límite Community: máx. {max} accesos activos",
      limitWarn: "Límite Community: máx. {max} cuentas portal. Pase a Veritas Pro.",
      contactFallback: "este contacto",
      loginVia: "· acceso vía",
      toast: {
        enabled: "Acceso portal activado",
        disabled: "Acceso portal desactivado",
        created: "Cuenta portal creada",
        inviteSent: "Invitación portal enviada",
        passwordUpdated: "Contraseña actualizada",
        deleted: "Cuenta portal eliminada",
        impersonationError: "No se pudo iniciar la impersonación.",
        roleUpdated: "Rol del portal actualizado",
        roleError: "No se pudo actualizar el rol del portal."
      },
      passwordModal: {
        eyebrow: "Portal cliente MSP",
        createTitle: "Crear acceso portal",
        resetTitle: "Restablecer contraseña",
        createSubtitle: "Se creará una cuenta espacio cliente.",
        resetSubtitle: "Defina nueva contraseña.",
        createSubmit: "Crear acceso",
        resetSubmit: "Guardar contraseña",
        passwordLabel: "Contraseña",
        confirmLabel: "Confirmación",
        passwordPlaceholder: "Mínimo 6 caracteres",
        confirmPlaceholder: "Repita la contraseña",
        showPasswords: "Mostrar contraseñas",
        footerHint: "Mínimo 6 caracteres",
        cancel: "Cancelar",
        saving: "Guardando…",
        close: "Cerrar",
        passwordTooShort: "La contraseña debe tener al menos 6 caracteres",
        passwordMismatch: "Las contraseñas no coinciden",
        defaultName: "Contacto"
      },
      revokeModal: {
        title: "Revocar acceso portal",
        subtitle: "Se eliminará la cuenta. Se conserva la ficha CRM.",
        accountLine: "Cuenta: {email}",
        consequences: "Consecuencias",
        bullets: ["Sin acceso al espacio cliente.", "Credenciales eliminadas.", "Acceso recreable más tarde."],
        cancel: "Cancelar",
        revoke: "Revocar acceso",
        revoking: "Revocando…",
        close: "Cerrar",
        defaultName: "Contacto"
      },
      impersonation: {
        title: "Abriendo portal cliente",
        signingInAs: "Acceso como",
        cancel: "Cancelar",
        contactFallback: "este contacto"
      }
    },
    relative: {
      justNow: "ahora",
      minutesAgo: "hace {count} min",
      hoursAgo: "hace {count} h",
      daysAgo: "hace {count} d"
    },
    deleteModal: {
      title: "Eliminar contacto",
      subtitle: "Acción definitiva e irreversible.",
      consequences: "Consecuencias",
      bullets: ["Se eliminará la ficha contacto.", "Se revocará el acceso al portal.", "Operación irreversible."],
      confirm: "Eliminar definitivamente",
      deleting: "Eliminando…",
      cancel: "Cancelar",
      close: "Cerrar",
      defaultName: "este contacto"
    }
  }
};
export const getContactDetailCopy = createLocaleGetter(DETAIL_COPY);
export function getContactStatusLocalized(statut, locale) {
  const labels = getContactDetailCopy(locale).status;
  const value = (statut || "").toLowerCase();
  if (value.includes("inact")) return {
    status: "suspended",
    label: labels.inactive
  };
  if (value.includes("act")) return {
    status: "active",
    label: labels.active
  };
  return {
    status: "unknown",
    label: labels.unknown
  };
}
export function getPrestationCategoryLabel(category, locale) {
  const labels = getContactDetailCopy(locale).prestationCategories;
  if (labels[category]) return labels[category];
  const fallback = String(category || "").replace(/^prestation-/, "").replace(/-/g, " ").trim();
  return fallback || "-";
}
export function getTicketStatusLabels(locale) {
  return getContactDetailCopy(locale).ticketStatus;
}
export function getEventTypeLabels(locale) {
  return getContactDetailCopy(locale).eventTypes;
}
export function formatContactRelativeTime(value, locale, formatDateTime) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const rel = getContactDetailCopy(locale).relative;
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return rel.justNow;
  if (diffMin < 60) return interpolate(rel.minutesAgo, {
    count: String(diffMin)
  });
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return interpolate(rel.hoursAgo, {
    count: String(diffH)
  });
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return interpolate(rel.daysAgo, {
    count: String(diffD)
  });
  return formatDateTime ? formatDateTime(value) : d.toLocaleString();
}
export { interpolate };
