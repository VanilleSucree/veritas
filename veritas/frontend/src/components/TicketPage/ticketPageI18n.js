import { interpolate, pickLocaleMessages } from "../../i18n/translate";
const STATUS_FILTER_KEYS = ["new", "in_progress", "pending", "resolved", "closed"];
const STATUS_FILTER_META = {
  new: {
    icon: "mdi:inbox-arrow-down",
    kpiTone: "blue"
  },
  in_progress: {
    icon: "mdi:progress-clock",
    kpiTone: "amber"
  },
  pending: {
    icon: "mdi:pause-circle-outline",
    kpiTone: "violet"
  },
  resolved: {
    icon: "mdi:check-circle-outline",
    kpiTone: "blue"
  },
  closed: {
    icon: "mdi:archive-outline",
    kpiTone: "orange"
  }
};
const TICKET_TYPE_KEYS = ["incident", "demande", "probleme", "changement"];
const CHANNEL_KEYS = ["web", "phone", "email", "chat", "api", "whatsapp"];
const CHANNEL_ICONS = {
  web: "mdi:web",
  phone: "mdi:phone",
  email: "mdi:email-outline",
  chat: "mdi:message-outline",
  api: "mdi:api",
  whatsapp: "mdi:whatsapp"
};
const TICKETS_COPY = {
  fr: {
    eyebrow: "Helpdesk",
    pageTitle: "Support",
    onboardingBadge: "Onboarding",
    loadingTickets: "Chargement des tickets…",
    ticketCount: "{count} ticket",
    ticketCountPlural: "{count} tickets",
    subtitleActive: "Vue « {view} » · {count} ticket",
    subtitleActivePlural: "Vue « {view} » · {count} tickets",
    trashSubtitle: "Corbeille · {count} ticket",
    trashSubtitlePlural: "Corbeille · {count} tickets",
    satisfactionCount: "{count} retour client",
    satisfactionCountPlural: "{count} retours clients",
    subtitleSatisfaction: "Vue « {view} » · {count} retour client",
    subtitleSatisfactionPlural: "Vue « {view} » · {count} retours clients",
    trashSwitchTitle: "Afficher les tickets supprimés",
    trashSwitchLabel: "Corbeille",
    trashSwitchAria: "Afficher la corbeille",
    playModeBanner: "Mode aléatoire",
    playModeTooltip: "Ticket aléatoire · enchaîne après chaque envoi (Maj+clic pour arrêter)",
    playModeAria: "Ouvrir un ticket aléatoire",
    playModeDisabled: "Mode ticket aléatoire désactivé",
    exportCsv: "Exporter en CSV",
    exportCsvAria: "Exporter CSV",
    columnsSettings: "Paramétrer les colonnes",
    columnsSettingsAria: "Paramétrer les colonnes du tableau",
    newTicket: "Nouveau ticket",
    newTicketAria: "Nouveau ticket",
    statusFilters: {
      new: "Nouveaux",
      in_progress: "En cours",
      pending: "En attente",
      resolved: "Résolus",
      closed: "Clos"
    },
    statusBadge: {
      new: "Nouveau",
      in_progress: "En cours",
      pending: "En attente",
      resolved: "Résolu",
      closed: "Clos"
    },
    priority: {
      low: "Basse",
      normal: "Normale",
      high: "Haute",
      urgent: "Urgente",
      majorIncident: "Incident majeur"
    },
    channels: {
      web: "Web",
      phone: "Téléphone",
      email: "Email",
      chat: "Chat",
      api: "API",
      whatsapp: "WhatsApp"
    },
    ticketTypes: {
      incident: {
        label: "Incident",
        hint: "Panne ou interruption de service"
      },
      demande: {
        label: "Demande",
        hint: "Besoin ou question client"
      },
      probleme: {
        label: "Problème",
        hint: "Cause racine récurrente"
      },
      changement: {
        label: "Changement",
        hint: "Modification planifiée"
      }
    },
    allTypes: "Tous types",
    views: {
      paneAria: "Vues de tickets",
      title: "Vues",
      reorderFinish: "Terminer le réordonnancement",
      reorderStart: "Réordonner les vues",
      create: "Créer une vue",
      saving: "Enregistrement…",
      reorderHint: "Glissez les vues pour les réordonner",
      loading: "Chargement…",
      general: "Général",
      team: "Équipe",
      assigned: "Assignées",
      private: "Personnelles",
      satisfaction: "Retours clients",
      satisfactionViews: {
        mine: {
          name: "Mes retours clients",
          description: "Retours clients sur vos tickets assignés"
        },
        all: {
          name: "Tous les retours clients",
          description: "Ensemble des retours clients"
        }
      },
      emptyHint: "Créez des vues personnalisées pour filtrer vos tickets.",
      dragView: "Glisser la vue {name}",
      ticketCountAria: "{count} ticket",
      ticketCountAriaPlural: "{count} tickets",
      editView: "Modifier la vue",
      editViewNamed: "Modifier la vue {name}",
      collapsePane: "Replier les vues",
      expandPane: "Afficher les vues"
    },
    search: {
      placeholder: "Ticket, client, demandeur, étiquette…",
      aria: "Rechercher un ticket",
      clear: "Effacer",
      filterType: "Filtrer par type",
      viewMeta: "Vue « {name} »",
      defaultViewName: "Tickets"
    },
    empty: {
      trashTitle: "Corbeille vide",
      noTicketsTitle: "Aucun ticket trouvé",
      trashHint: "Les tickets supprimés apparaîtront ici.",
      activeHint: "Ajustez vos filtres ou créez un nouveau ticket support."
    },
    bulk: {
      selected: "sélectionné",
      selectedPlural: "sélectionnés",
      restore: "Restaurer",
      purge: "Supprimer définitivement",
      purgeLoading: "Suppression…",
      edit: "Modifier",
      delete: "Supprimer",
      deleteLoading: "Suppression…",
      clearSelection: "Annuler la sélection",
      deleteTitle: "Supprimer {label} ?",
      deleteMessage: "Les tickets seront déplacés vers la corbeille.",
      purgeTitle: "Supprimer définitivement {label} ?",
      purgeMessage: "Cette action est irréversible.",
      purgeOneTitle: "Supprimer définitivement ce ticket ?",
      confirmDelete: "Supprimer",
      confirmPurge: "Supprimer définitivement",
      ticketLabel: "{count} ticket",
      ticketLabelPlural: "{count} tickets"
    },
    bulkModal: {
      title: "Actions groupées",
      selected: "{count} ticket sélectionné",
      selectedPlural: "{count} tickets sélectionnés",
      editStatus: "Modifier le statut",
      editPriority: "Modifier la priorité",
      editType: "Modifier le type",
      editRequester: "Modifier le demandeur",
      editAssignees: "Modifier l'assignation",
      editWatchers: "Modifier les followers",
      requesterContact: "Contact",
      requesterUser: "Utilisateur interne",
      searchContact: "Rechercher un contact…",
      searchUser: "Rechercher un utilisateur…",
      chooseContact: "Choisir un contact",
      chooseUser: "Choisir un utilisateur",
      assigneeReplaceHint: "Laisser vide pour retirer tous les assignés.",
      watcherReplaceHint: "Laisser vide pour retirer tous les followers.",
      assigneeModes: {
        replace: "Remplacer les assignés",
        add: "Ajouter des assignés",
        remove: "Retirer des assignés"
      },
      watcherModes: {
        add: "Ajouter des followers",
        replace: "Remplacer les followers",
        remove: "Retirer des followers"
      },
      userFallback: "Utilisateur",
      contactFallback: "Contact #{id}",
      validation: {
        noField: "Sélectionnez au moins une modification à appliquer.",
        noContact: "Choisissez un contact demandeur.",
        noUser: "Choisissez un utilisateur demandeur.",
        noAssignee: "Sélectionnez au moins un assigné.",
        noWatcher: "Sélectionnez au moins un follower."
      },
      submitError: "Erreur lors de l'action groupée"
    },
    table: {
      selectAll: "Sélectionner tous les tickets de la page",
      selectOne: "Sélectionner le ticket #{id}",
      id: "ID",
      subject: "Sujet",
      channel: "Canal",
      type: "Type",
      requester: "Demandeur",
      client: "Client",
      assigned: "Assigné",
      followers: "Followers",
      tags: "Étiquettes",
      status: "Statut",
      priority: "Priorité",
      sla: "SLA",
      created: "Création",
      updated: "Dernière modification",
      actions: "Actions",
      loading: "Chargement...",
      noRows: "Aucun ticket",
      majorBadge: "Majeur",
      restore: "Restaurer",
      restoreTitle: "Restaurer le ticket",
      purgeTitle: "Supprimer définitivement",
      delete: "Supprimer",
      slaFirstResponse: "Délai première prise en charge",
      slaResolution: "Délai résolution"
    },
    tooltip: {
      majorIncident: "Incident majeur",
      incomingEmail: "E-mail entrant",
      comment: "{count} commentaire",
      commentPlural: "{count} commentaires"
    },
    sla: {},
    followersCount: "{count} followers",
    export: {
      filenamePrefix: "tickets",
      truncated: "Export limité aux 10 000 premiers tickets correspondant aux filtres.",
      headers: ["ID", "Sujet", "Type", "Canal", "Demandeur", "Client", "Assignes", "Followers", "Statut", "Priorite", "Creation", "Derniere modification"]
    },
    columnsModal: {
      title: "Colonnes du tableau",
      subtitle: "Choisissez les colonnes visibles dans la liste des tickets.",
      privateTab: "Vue privée",
      publicTab: "Vue publique",
      privateHintInactive: "Pas encore de vue privée : la vue publique s’affiche. Cochez des colonnes pour créer la vôtre.",
      privateHintActive: "Votre vue privée remplace la vue publique.",
      publicHint: "Colonnes visibles par défaut pour tous les utilisateurs sans vue privée.",
      adminOnly: "Seuls les administrateurs peuvent modifier la vue publique.",
      resetPrivate: "Revenir à la vue publique",
      resetSuccess: "Vue privée réinitialisée",
      savePrivateSuccess: "Vue privée enregistrée",
      savePublicSuccess: "Vue publique enregistrée",
      saveError: "Erreur lors de l’enregistrement des colonnes",
      atLeastOne: "Sélectionnez au moins une colonne.",
      reorderHint: "Glissez les lignes pour changer l’ordre des colonnes dans le tableau.",
      dragColumn: "Glisser la colonne {name}",
      save: "Enregistrer"
    },
    toasts: {
      loadColumns: "Erreur lors du chargement des colonnes",
      loadViews: "Erreur lors du chargement des vues",
      loadData: "Erreur lors du chargement des données",
      loadTickets: "Erreur lors du chargement des tickets",
      restored: "Ticket restauré",
      restoreError: "Erreur lors de la restauration du ticket",
      adminOnlyPurge: "Seuls les administrateurs peuvent supprimer définitivement un ticket",
      purged: "Ticket supprimé définitivement",
      purgeError: "Erreur lors de la suppression définitive",
      bulkRestorePartial: "{success} restauré(s), {failure} échec(s)",
      bulkRestored: "{count} ticket restauré",
      bulkRestoredPlural: "{count} tickets restaurés",
      bulkRestoreError: "Erreur lors de la restauration groupée",
      bulkPurgePartial: "{success} supprimé(s), {failure} échec(s)",
      bulkPurged: "{count} ticket supprimé définitivement",
      bulkPurgedPlural: "{count} tickets supprimés définitivement",
      bulkDeletePartial: "{success} supprimé(s), {failure} échec(s)",
      bulkDeleted: "{count} ticket supprimé",
      bulkDeletedPlural: "{count} tickets supprimés",
      bulkDeleteError: "Erreur lors de la suppression groupée",
      bulkUpdatePartial: "{success} mis à jour, {failure} échec(s)",
      bulkUpdated: "{count} ticket mis à jour",
      bulkUpdatedPlural: "{count} tickets mis à jour",
      reorderViews: "Erreur lors du réordonnancement des vues",
      viewUpdated: "Vue mise à jour",
      viewCreated: "Vue créée",
      exportError: "Erreur lors de l'export CSV"
    }
  },
  en: {
    eyebrow: "Helpdesk",
    pageTitle: "Support",
    onboardingBadge: "Onboarding",
    loadingTickets: "Loading tickets…",
    ticketCount: "{count} ticket",
    ticketCountPlural: "{count} tickets",
    subtitleActive: "View « {view} » · {count} ticket",
    subtitleActivePlural: "View « {view} » · {count} tickets",
    trashSubtitle: "Trash · {count} ticket",
    trashSubtitlePlural: "Trash · {count} tickets",
    satisfactionCount: "{count} customer feedback",
    satisfactionCountPlural: "{count} customer feedback items",
    subtitleSatisfaction: "View « {view} » · {count} customer feedback",
    subtitleSatisfactionPlural: "View « {view} » · {count} customer feedback items",
    trashSwitchTitle: "Show deleted tickets",
    trashSwitchLabel: "Trash",
    trashSwitchAria: "Show trash",
    playModeBanner: "Random mode",
    playModeTooltip: "Random ticket · continues after each reply (Shift+click to stop)",
    playModeAria: "Open a random ticket",
    playModeDisabled: "Random ticket mode disabled",
    exportCsv: "Export as CSV",
    exportCsvAria: "Export CSV",
    columnsSettings: "Configure columns",
    columnsSettingsAria: "Configure table columns",
    newTicket: "New ticket",
    newTicketAria: "New ticket",
    statusFilters: {
      new: "New",
      in_progress: "In progress",
      pending: "Pending",
      resolved: "Resolved",
      closed: "Closed"
    },
    statusBadge: {
      new: "New",
      in_progress: "In progress",
      pending: "Pending",
      resolved: "Resolved",
      closed: "Closed"
    },
    priority: {
      low: "Low",
      normal: "Normal",
      high: "High",
      urgent: "Urgent",
      majorIncident: "Major incident"
    },
    channels: {
      web: "Web",
      phone: "Phone",
      email: "Email",
      chat: "Chat",
      api: "API",
      whatsapp: "WhatsApp"
    },
    ticketTypes: {
      incident: {
        label: "Incident",
        hint: "Outage or service interruption"
      },
      demande: {
        label: "Request",
        hint: "Customer need or question"
      },
      probleme: {
        label: "Problem",
        hint: "Recurring root cause"
      },
      changement: {
        label: "Change",
        hint: "Planned modification"
      }
    },
    allTypes: "All types",
    views: {
      paneAria: "Ticket views",
      title: "Views",
      reorderFinish: "Finish reordering",
      reorderStart: "Reorder views",
      create: "Create a view",
      saving: "Saving…",
      reorderHint: "Drag views to reorder them",
      loading: "Loading…",
      general: "General",
      team: "Team",
      assigned: "Assigned",
      private: "Personal",
      satisfaction: "Customer feedback",
      satisfactionViews: {
        mine: {
          name: "My customer feedback",
          description: "Customer feedback on your assigned tickets"
        },
        all: {
          name: "All customer feedback",
          description: "All customer feedback across tickets"
        }
      },
      emptyHint: "Create custom views to filter your tickets.",
      dragView: "Drag view {name}",
      ticketCountAria: "{count} ticket",
      ticketCountAriaPlural: "{count} tickets",
      editView: "Edit view",
      editViewNamed: "Edit view {name}",
      collapsePane: "Collapse views",
      expandPane: "Show views"
    },
    search: {
      placeholder: "Ticket, client, requester, tag…",
      aria: "Search for a ticket",
      clear: "Clear",
      filterType: "Filter by type",
      viewMeta: "View « {name} »",
      defaultViewName: "Tickets"
    },
    empty: {
      trashTitle: "Trash is empty",
      noTicketsTitle: "No tickets found",
      trashHint: "Deleted tickets will appear here.",
      activeHint: "Adjust your filters or create a new support ticket."
    },
    bulk: {
      selected: "selected",
      selectedPlural: "selected",
      restore: "Restore",
      purge: "Delete permanently",
      purgeLoading: "Deleting…",
      edit: "Edit",
      delete: "Delete",
      deleteLoading: "Deleting…",
      clearSelection: "Clear selection",
      deleteTitle: "Delete {label}?",
      deleteMessage: "Tickets will be moved to trash.",
      purgeTitle: "Permanently delete {label}?",
      purgeMessage: "This action cannot be undone.",
      purgeOneTitle: "Permanently delete this ticket?",
      confirmDelete: "Delete",
      confirmPurge: "Delete permanently",
      ticketLabel: "{count} ticket",
      ticketLabelPlural: "{count} tickets"
    },
    bulkModal: {
      title: "Bulk actions",
      selected: "{count} ticket selected",
      selectedPlural: "{count} tickets selected",
      editStatus: "Change status",
      editPriority: "Change priority",
      editType: "Change type",
      editRequester: "Change requester",
      editAssignees: "Change assignment",
      editWatchers: "Change followers",
      requesterContact: "Contact",
      requesterUser: "Internal user",
      searchContact: "Search for a contact…",
      searchUser: "Search for a user…",
      chooseContact: "Choose a contact",
      chooseUser: "Choose a user",
      assigneeReplaceHint: "Leave empty to remove all assignees.",
      watcherReplaceHint: "Leave empty to remove all followers.",
      assigneeModes: {
        replace: "Replace assignees",
        add: "Add assignees",
        remove: "Remove assignees"
      },
      watcherModes: {
        add: "Add followers",
        replace: "Replace followers",
        remove: "Remove followers"
      },
      userFallback: "User",
      contactFallback: "Contact #{id}",
      validation: {
        noField: "Select at least one change to apply.",
        noContact: "Choose a requester contact.",
        noUser: "Choose a requester user.",
        noAssignee: "Select at least one assignee.",
        noWatcher: "Select at least one follower."
      },
      submitError: "Error during bulk action"
    },
    table: {
      selectAll: "Select all tickets on this page",
      selectOne: "Select ticket #{id}",
      id: "ID",
      subject: "Subject",
      channel: "Channel",
      type: "Type",
      requester: "Requester",
      client: "Client",
      assigned: "Assigned",
      followers: "Followers",
      tags: "Tags",
      status: "Status",
      priority: "Priority",
      sla: "SLA",
      created: "Created",
      updated: "Last updated",
      actions: "Actions",
      loading: "Loading...",
      noRows: "No tickets",
      majorBadge: "Major",
      restore: "Restore",
      restoreTitle: "Restore ticket",
      purgeTitle: "Delete permanently",
      delete: "Delete",
      slaFirstResponse: "First response deadline",
      slaResolution: "Resolution deadline"
    },
    tooltip: {
      majorIncident: "Major incident",
      incomingEmail: "Incoming email",
      comment: "{count} comment",
      commentPlural: "{count} comments"
    },
    sla: {},
    followersCount: "{count} followers",
    export: {
      filenamePrefix: "tickets",
      truncated: "Export limited to the first 10,000 tickets matching the filters.",
      headers: ["ID", "Subject", "Type", "Channel", "Requester", "Client", "Assignees", "Followers", "Status", "Priority", "Created", "Last updated"]
    },
    columnsModal: {
      title: "Table columns",
      subtitle: "Choose which columns are visible in the ticket list.",
      privateTab: "Private view",
      publicTab: "Public view",
      privateHintInactive: "No private view yet — the public view is used. Toggle columns to create yours.",
      privateHintActive: "Your private columns override the public view.",
      publicHint: "Default columns for all users without a private view.",
      adminOnly: "Only administrators can edit the public view.",
      resetPrivate: "Use public view",
      resetSuccess: "Private view reset",
      savePrivateSuccess: "Private view saved",
      savePublicSuccess: "Public view saved",
      saveError: "Error saving columns",
      atLeastOne: "Select at least one column.",
      reorderHint: "Drag rows to change the column order in the table.",
      dragColumn: "Drag column {name}",
      save: "Save"
    },
    toasts: {
      loadColumns: "Error loading columns",
      loadViews: "Error loading views",
      loadData: "Error loading data",
      loadTickets: "Error loading tickets",
      restored: "Ticket restored",
      restoreError: "Error restoring ticket",
      adminOnlyPurge: "Only administrators can permanently delete a ticket",
      purged: "Ticket permanently deleted",
      purgeError: "Error permanently deleting ticket",
      bulkRestorePartial: "{success} restored, {failure} failed",
      bulkRestored: "{count} ticket restored",
      bulkRestoredPlural: "{count} tickets restored",
      bulkRestoreError: "Error during bulk restore",
      bulkPurgePartial: "{success} deleted, {failure} failed",
      bulkPurged: "{count} ticket permanently deleted",
      bulkPurgedPlural: "{count} tickets permanently deleted",
      bulkDeletePartial: "{success} deleted, {failure} failed",
      bulkDeleted: "{count} ticket deleted",
      bulkDeletedPlural: "{count} tickets deleted",
      bulkDeleteError: "Error during bulk delete",
      bulkUpdatePartial: "{success} updated, {failure} failed",
      bulkUpdated: "{count} ticket updated",
      bulkUpdatedPlural: "{count} tickets updated",
      reorderViews: "Error reordering views",
      viewUpdated: "View updated",
      viewCreated: "View created",
      exportError: "Error exporting CSV"
    }
  },
  de: {
    eyebrow: "Helpdesk",
    pageTitle: "Support",
    onboardingBadge: "Onboarding",
    loadingTickets: "Tickets werden geladen…",
    ticketCount: "{count} Ticket",
    ticketCountPlural: "{count} Tickets",
    subtitleActive: "Ansicht « {view} » · {count} Ticket",
    subtitleActivePlural: "Ansicht « {view} » · {count} Tickets",
    trashSubtitle: "Papierkorb · {count} Ticket",
    trashSubtitlePlural: "Papierkorb · {count} Tickets",
    satisfactionCount: "{count} Kundenfeedback",
    satisfactionCountPlural: "{count} Kundenfeedbacks",
    subtitleSatisfaction: "Ansicht « {view} » · {count} Kundenfeedback",
    subtitleSatisfactionPlural: "Ansicht « {view} » · {count} Kundenfeedbacks",
    trashSwitchTitle: "Gelöschte Tickets anzeigen",
    trashSwitchLabel: "Papierkorb",
    trashSwitchAria: "Papierkorb anzeigen",
    playModeBanner: "Zufallsmodus",
    playModeTooltip: "Zufälliges Ticket · nach jedem Senden weiter (Umschalt+Klick zum Stoppen)",
    playModeAria: "Zufälliges Ticket öffnen",
    playModeDisabled: "Zufallsmodus deaktiviert",
    exportCsv: "Als CSV exportieren",
    exportCsvAria: "CSV exportieren",
    columnsSettings: "Spalten konfigurieren",
    columnsSettingsAria: "Tabellenspalten konfigurieren",
    newTicket: "Neues Ticket",
    newTicketAria: "Neues Ticket",
    statusFilters: {
      new: "Neu",
      in_progress: "In Bearbeitung",
      pending: "Wartend",
      resolved: "Gelöst",
      closed: "Geschlossen"
    },
    statusBadge: {
      new: "Neu",
      in_progress: "In Bearbeitung",
      pending: "Wartend",
      resolved: "Gelöst",
      closed: "Geschlossen"
    },
    priority: {
      low: "Niedrig",
      normal: "Normal",
      high: "Hoch",
      urgent: "Dringend",
      majorIncident: "Schwerer Vorfall"
    },
    channels: {
      web: "Web",
      phone: "Telefon",
      email: "E-Mail",
      chat: "Chat",
      api: "API",
      whatsapp: "WhatsApp"
    },
    ticketTypes: {
      incident: {
        label: "Vorfall",
        hint: "Ausfall oder Dienstunterbrechung"
      },
      demande: {
        label: "Anfrage",
        hint: "Kundenbedarf oder Frage"
      },
      probleme: {
        label: "Problem",
        hint: "Wiederkehrende Ursache"
      },
      changement: {
        label: "Änderung",
        hint: "Geplante Änderung"
      }
    },
    allTypes: "Alle Typen",
    views: {
      paneAria: "Ticket-Ansichten",
      title: "Ansichten",
      reorderFinish: "Neuordnung abschließen",
      reorderStart: "Ansichten neu ordnen",
      create: "Ansicht erstellen",
      saving: "Speichern…",
      reorderHint: "Ansichten per Drag & Drop neu ordnen",
      loading: "Laden…",
      general: "Allgemein",
      team: "Team",
      assigned: "Zugewiesen",
      private: "Persönlich",
      satisfaction: "Kundenfeedback",
      satisfactionViews: {
        mine: {
          name: "Mein Kundenfeedback",
          description: "Kundenfeedback zu Ihren zugewiesenen Tickets"
        },
        all: {
          name: "Gesamtes Kundenfeedback",
          description: "Gesamtes Kundenfeedback zu Tickets"
        }
      },
      emptyHint: "Erstellen Sie benutzerdefinierte Ansichten zum Filtern.",
      dragView: "Ansicht {name} ziehen",
      ticketCountAria: "{count} Ticket",
      ticketCountAriaPlural: "{count} Tickets",
      editView: "Ansicht bearbeiten",
      editViewNamed: "Ansicht {name} bearbeiten",
      collapsePane: "Ansichten einklappen",
      expandPane: "Ansichten anzeigen"
    },
    search: {
      placeholder: "Ticket, Kunde, Anfragender, Tag…",
      aria: "Ticket suchen",
      clear: "Löschen",
      filterType: "Nach Typ filtern",
      viewMeta: "Ansicht « {name} »",
      defaultViewName: "Tickets"
    },
    empty: {
      trashTitle: "Papierkorb leer",
      noTicketsTitle: "Keine Tickets gefunden",
      trashHint: "Gelöschte Tickets erscheinen hier.",
      activeHint: "Filter anpassen oder neues Support-Ticket erstellen."
    },
    bulk: {
      selected: "ausgewählt",
      selectedPlural: "ausgewählt",
      restore: "Wiederherstellen",
      purge: "Endgültig löschen",
      purgeLoading: "Löschen…",
      edit: "Bearbeiten",
      delete: "Löschen",
      deleteLoading: "Löschen…",
      clearSelection: "Auswahl aufheben",
      deleteTitle: "{label} löschen?",
      deleteMessage: "Tickets werden in den Papierkorb verschoben.",
      purgeTitle: "{label} endgültig löschen?",
      purgeMessage: "Diese Aktion kann nicht rückgängig gemacht werden.",
      purgeOneTitle: "Dieses Ticket endgültig löschen?",
      confirmDelete: "Löschen",
      confirmPurge: "Endgültig löschen",
      ticketLabel: "{count} Ticket",
      ticketLabelPlural: "{count} Tickets"
    },
    bulkModal: {
      title: "Massenaktionen",
      selected: "{count} Ticket ausgewählt",
      selectedPlural: "{count} Tickets ausgewählt",
      editStatus: "Status ändern",
      editPriority: "Priorität ändern",
      editType: "Typ ändern",
      editRequester: "Anfragenden ändern",
      editAssignees: "Zuweisung ändern",
      editWatchers: "Follower ändern",
      requesterContact: "Kontakt",
      requesterUser: "Interner Benutzer",
      searchContact: "Kontakt suchen…",
      searchUser: "Benutzer suchen…",
      chooseContact: "Kontakt wählen",
      chooseUser: "Benutzer wählen",
      assigneeReplaceHint: "Leer lassen, um alle Zuweisungen zu entfernen.",
      watcherReplaceHint: "Leer lassen, um alle Follower zu entfernen.",
      assigneeModes: {
        replace: "Zugewiesene ersetzen",
        add: "Zugewiesene hinzufügen",
        remove: "Zugewiesene entfernen"
      },
      watcherModes: {
        add: "Follower hinzufügen",
        replace: "Follower ersetzen",
        remove: "Follower entfernen"
      },
      userFallback: "Benutzer",
      contactFallback: "Kontakt #{id}",
      validation: {
        noField: "Wählen Sie mindestens eine Änderung.",
        noContact: "Wählen Sie einen anfragenden Kontakt.",
        noUser: "Wählen Sie einen anfragenden Benutzer.",
        noAssignee: "Wählen Sie mindestens einen Zugewiesenen.",
        noWatcher: "Wählen Sie mindestens einen Follower."
      },
      submitError: "Fehler bei der Massenaktion"
    },
    table: {
      selectAll: "Alle Tickets auf dieser Seite auswählen",
      selectOne: "Ticket #{id} auswählen",
      id: "ID",
      subject: "Betreff",
      channel: "Kanal",
      type: "Typ",
      requester: "Anfragender",
      client: "Kunde",
      assigned: "Zugewiesen",
      followers: "Follower",
      tags: "Tags",
      status: "Status",
      priority: "Priorität",
      sla: "SLA",
      created: "Erstellt",
      updated: "Letzte Änderung",
      actions: "Aktionen",
      loading: "Laden...",
      noRows: "Keine Tickets",
      majorBadge: "Schwer",
      restore: "Wiederherstellen",
      restoreTitle: "Ticket wiederherstellen",
      purgeTitle: "Endgültig löschen",
      delete: "Löschen",
      slaFirstResponse: "Frist erste Reaktion",
      slaResolution: "Frist Lösung"
    },
    tooltip: {
      majorIncident: "Schwerer Vorfall",
      incomingEmail: "Eingehende E-Mail",
      comment: "{count} Kommentar",
      commentPlural: "{count} Kommentare"
    },
    sla: {},
    followersCount: "{count} Follower",
    export: {
      filenamePrefix: "tickets",
      truncated: "Export auf die ersten 10.000 passenden Tickets begrenzt.",
      headers: ["ID", "Betreff", "Typ", "Kanal", "Anfragender", "Kunde", "Zugewiesen", "Follower", "Status", "Prioritaet", "Erstellt", "Letzte Aenderung"]
    },
    columnsModal: {
      title: "Tabellenspalten",
      subtitle: "Wählen Sie die sichtbaren Spalten in der Ticketliste.",
      privateTab: "Private Ansicht",
      publicTab: "Öffentliche Ansicht",
      privateHintInactive: "Noch keine private Ansicht — die öffentliche Ansicht wird verwendet. Spalten umschalten, um Ihre zu erstellen.",
      privateHintActive: "Ihre private Ansicht überschreibt die öffentliche Ansicht.",
      publicHint: "Standardspalten für alle Benutzer ohne private Ansicht.",
      adminOnly: "Nur Administratoren können die öffentliche Ansicht bearbeiten.",
      resetPrivate: "Öffentliche Ansicht verwenden",
      resetSuccess: "Private Ansicht zurückgesetzt",
      savePrivateSuccess: "Private Ansicht gespeichert",
      savePublicSuccess: "Öffentliche Ansicht gespeichert",
      saveError: "Fehler beim Speichern der Spalten",
      atLeastOne: "Wählen Sie mindestens eine Spalte.",
      reorderHint: "Zeilen ziehen, um die Spaltenreihenfolge in der Tabelle zu ändern.",
      dragColumn: "Spalte {name} ziehen",
      save: "Speichern"
    },
    toasts: {
      loadColumns: "Fehler beim Laden der Spalten",
      loadViews: "Fehler beim Laden der Ansichten",
      loadData: "Fehler beim Laden der Daten",
      loadTickets: "Fehler beim Laden der Tickets",
      restored: "Ticket wiederhergestellt",
      restoreError: "Fehler beim Wiederherstellen",
      adminOnlyPurge: "Nur Administratoren können Tickets endgültig löschen",
      purged: "Ticket endgültig gelöscht",
      purgeError: "Fehler beim endgültigen Löschen",
      bulkRestorePartial: "{success} wiederhergestellt, {failure} fehlgeschlagen",
      bulkRestored: "{count} Ticket wiederhergestellt",
      bulkRestoredPlural: "{count} Tickets wiederhergestellt",
      bulkRestoreError: "Fehler bei Massenwiederherstellung",
      bulkPurgePartial: "{success} gelöscht, {failure} fehlgeschlagen",
      bulkPurged: "{count} Ticket endgültig gelöscht",
      bulkPurgedPlural: "{count} Tickets endgültig gelöscht",
      bulkDeletePartial: "{success} gelöscht, {failure} fehlgeschlagen",
      bulkDeleted: "{count} Ticket gelöscht",
      bulkDeletedPlural: "{count} Tickets gelöscht",
      bulkDeleteError: "Fehler bei Massenlöschung",
      bulkUpdatePartial: "{success} aktualisiert, {failure} fehlgeschlagen",
      bulkUpdated: "{count} Ticket aktualisiert",
      bulkUpdatedPlural: "{count} Tickets aktualisiert",
      reorderViews: "Fehler beim Neuordnen der Ansichten",
      viewUpdated: "Ansicht aktualisiert",
      viewCreated: "Ansicht erstellt",
      exportError: "Fehler beim CSV-Export"
    }
  },
  it: {
    eyebrow: "Helpdesk",
    pageTitle: "Supporto",
    onboardingBadge: "Onboarding",
    loadingTickets: "Caricamento ticket…",
    ticketCount: "{count} ticket",
    ticketCountPlural: "{count} ticket",
    subtitleActive: "Vista « {view} » · {count} ticket",
    subtitleActivePlural: "Vista « {view} » · {count} ticket",
    trashSubtitle: "Cestino · {count} ticket",
    trashSubtitlePlural: "Cestino · {count} ticket",
    satisfactionCount: "{count} feedback cliente",
    satisfactionCountPlural: "{count} feedback clienti",
    subtitleSatisfaction: "Vista « {view} » · {count} feedback cliente",
    subtitleSatisfactionPlural: "Vista « {view} » · {count} feedback clienti",
    trashSwitchTitle: "Mostra ticket eliminati",
    trashSwitchLabel: "Cestino",
    trashSwitchAria: "Mostra cestino",
    playModeBanner: "Modalità casuale",
    playModeTooltip: "Ticket casuale · continua dopo ogni invio (Maiusc+clic per fermare)",
    playModeAria: "Apri un ticket casuale",
    playModeDisabled: "Modalità ticket casuale disattivata",
    exportCsv: "Esporta in CSV",
    exportCsvAria: "Esporta CSV",
    columnsSettings: "Configura colonne",
    columnsSettingsAria: "Configura le colonne della tabella",
    newTicket: "Nuovo ticket",
    newTicketAria: "Nuovo ticket",
    statusFilters: {
      new: "Nuovi",
      in_progress: "In corso",
      pending: "In attesa",
      resolved: "Risolti",
      closed: "Chiusi"
    },
    statusBadge: {
      new: "Nuovo",
      in_progress: "In corso",
      pending: "In attesa",
      resolved: "Risolto",
      closed: "Chiuso"
    },
    priority: {
      low: "Bassa",
      normal: "Normale",
      high: "Alta",
      urgent: "Urgente",
      majorIncident: "Incidente grave"
    },
    channels: {
      web: "Web",
      phone: "Telefono",
      email: "Email",
      chat: "Chat",
      api: "API",
      whatsapp: "WhatsApp"
    },
    ticketTypes: {
      incident: {
        label: "Incidente",
        hint: "Guasto o interruzione del servizio"
      },
      demande: {
        label: "Richiesta",
        hint: "Esigenza o domanda del cliente"
      },
      probleme: {
        label: "Problema",
        hint: "Causa radice ricorrente"
      },
      changement: {
        label: "Cambio",
        hint: "Modifica pianificata"
      }
    },
    allTypes: "Tutti i tipi",
    views: {
      paneAria: "Viste ticket",
      title: "Viste",
      reorderFinish: "Termina riordino",
      reorderStart: "Riordina viste",
      create: "Crea una vista",
      saving: "Salvataggio…",
      reorderHint: "Trascina le viste per riordinarle",
      loading: "Caricamento…",
      general: "Generale",
      team: "Team",
      assigned: "Assegnate",
      private: "Personali",
      satisfaction: "Feedback clienti",
      satisfactionViews: {
        mine: {
          name: "I miei feedback clienti",
          description: "Feedback clienti sui ticket assegnati a te"
        },
        all: {
          name: "Tutti i feedback clienti",
          description: "Tutti i feedback clienti sui ticket"
        }
      },
      emptyHint: "Crea viste personalizzate per filtrare i ticket.",
      dragView: "Trascina vista {name}",
      ticketCountAria: "{count} ticket",
      ticketCountAriaPlural: "{count} ticket",
      editView: "Modifica vista",
      editViewNamed: "Modifica vista {name}",
      collapsePane: "Comprimi viste",
      expandPane: "Mostra viste"
    },
    search: {
      placeholder: "Ticket, cliente, richiedente, etichetta…",
      aria: "Cerca un ticket",
      clear: "Cancella",
      filterType: "Filtra per tipo",
      viewMeta: "Vista « {name} »",
      defaultViewName: "Ticket"
    },
    empty: {
      trashTitle: "Cestino vuoto",
      noTicketsTitle: "Nessun ticket trovato",
      trashHint: "I ticket eliminati appariranno qui.",
      activeHint: "Modifica i filtri o crea un nuovo ticket di supporto."
    },
    bulk: {
      selected: "selezionato",
      selectedPlural: "selezionati",
      restore: "Ripristina",
      purge: "Elimina definitivamente",
      purgeLoading: "Eliminazione…",
      edit: "Modifica",
      delete: "Elimina",
      deleteLoading: "Eliminazione…",
      clearSelection: "Annulla selezione",
      deleteTitle: "Eliminare {label}?",
      deleteMessage: "I ticket saranno spostati nel cestino.",
      purgeTitle: "Eliminare definitivamente {label}?",
      purgeMessage: "Questa azione è irreversibile.",
      purgeOneTitle: "Eliminare definitivamente questo ticket?",
      confirmDelete: "Elimina",
      confirmPurge: "Elimina definitivamente",
      ticketLabel: "{count} ticket",
      ticketLabelPlural: "{count} ticket"
    },
    bulkModal: {
      title: "Azioni di massa",
      selected: "{count} ticket selezionato",
      selectedPlural: "{count} ticket selezionati",
      editStatus: "Modifica stato",
      editPriority: "Modifica priorità",
      editType: "Modifica tipo",
      editRequester: "Modifica richiedente",
      editAssignees: "Modifica assegnazione",
      editWatchers: "Modifica follower",
      requesterContact: "Contatto",
      requesterUser: "Utente interno",
      searchContact: "Cerca un contatto…",
      searchUser: "Cerca un utente…",
      chooseContact: "Scegli un contatto",
      chooseUser: "Scegli un utente",
      assigneeReplaceHint: "Lasciare vuoto per rimuovere tutti gli assegnatari.",
      watcherReplaceHint: "Lasciare vuoto per rimuovere tutti i follower.",
      assigneeModes: {
        replace: "Sostituisci assegnatari",
        add: "Aggiungi assegnatari",
        remove: "Rimuovi assegnatari"
      },
      watcherModes: {
        add: "Aggiungi follower",
        replace: "Sostituisci follower",
        remove: "Rimuovi follower"
      },
      userFallback: "Utente",
      contactFallback: "Contatto #{id}",
      validation: {
        noField: "Seleziona almeno una modifica da applicare.",
        noContact: "Scegli un contatto richiedente.",
        noUser: "Scegli un utente richiedente.",
        noAssignee: "Seleziona almeno un assegnatario.",
        noWatcher: "Seleziona almeno un follower."
      },
      submitError: "Errore durante l'azione di massa"
    },
    table: {
      selectAll: "Seleziona tutti i ticket della pagina",
      selectOne: "Seleziona ticket #{id}",
      id: "ID",
      subject: "Oggetto",
      channel: "Canale",
      type: "Tipo",
      requester: "Richiedente",
      client: "Cliente",
      assigned: "Assegnato",
      followers: "Follower",
      tags: "Etichette",
      status: "Stato",
      priority: "Priorità",
      sla: "SLA",
      created: "Creazione",
      updated: "Ultima modifica",
      actions: "Azioni",
      loading: "Caricamento...",
      noRows: "Nessun ticket",
      majorBadge: "Grave",
      restore: "Ripristina",
      restoreTitle: "Ripristina ticket",
      purgeTitle: "Elimina definitivamente",
      delete: "Elimina",
      slaFirstResponse: "Scadenza prima risposta",
      slaResolution: "Scadenza risoluzione"
    },
    tooltip: {
      majorIncident: "Incidente grave",
      incomingEmail: "Email in arrivo",
      comment: "{count} commento",
      commentPlural: "{count} commenti"
    },
    sla: {},
    followersCount: "{count} follower",
    export: {
      filenamePrefix: "tickets",
      truncated: "Export limitato ai primi 10.000 ticket corrispondenti ai filtri.",
      headers: ["ID", "Oggetto", "Tipo", "Canale", "Richiedente", "Cliente", "Assegnati", "Follower", "Stato", "Priorita", "Creazione", "Ultima modifica"]
    },
    columnsModal: {
      title: "Colonne della tabella",
      subtitle: "Scegli le colonne visibili nell’elenco ticket.",
      privateTab: "Vista privata",
      publicTab: "Vista pubblica",
      privateHintInactive: "Nessuna vista privata — viene usata la vista pubblica. Seleziona le colonne per crearne una.",
      privateHintActive: "La tua vista privata sostituisce la vista pubblica.",
      publicHint: "Colonne predefinite per tutti gli utenti senza vista privata.",
      adminOnly: "Solo gli amministratori possono modificare la vista pubblica.",
      resetPrivate: "Usa la vista pubblica",
      resetSuccess: "Vista privata reimpostata",
      savePrivateSuccess: "Vista privata salvata",
      savePublicSuccess: "Vista pubblica salvata",
      saveError: "Errore nel salvataggio delle colonne",
      atLeastOne: "Seleziona almeno una colonna.",
      reorderHint: "Trascina le righe per cambiare l’ordine delle colonne nella tabella.",
      dragColumn: "Trascina la colonna {name}",
      save: "Salva"
    },
    toasts: {
      loadColumns: "Errore nel caricamento delle colonne",
      loadViews: "Errore nel caricamento delle viste",
      loadData: "Errore nel caricamento dei dati",
      loadTickets: "Errore nel caricamento dei ticket",
      restored: "Ticket ripristinato",
      restoreError: "Errore nel ripristino del ticket",
      adminOnlyPurge: "Solo gli amministratori possono eliminare definitivamente un ticket",
      purged: "Ticket eliminato definitivamente",
      purgeError: "Errore nell'eliminazione definitiva",
      bulkRestorePartial: "{success} ripristinati, {failure} errori",
      bulkRestored: "{count} ticket ripristinato",
      bulkRestoredPlural: "{count} ticket ripristinati",
      bulkRestoreError: "Errore nel ripristino di massa",
      bulkPurgePartial: "{success} eliminati, {failure} errori",
      bulkPurged: "{count} ticket eliminato definitivamente",
      bulkPurgedPlural: "{count} ticket eliminati definitivamente",
      bulkDeletePartial: "{success} eliminati, {failure} errori",
      bulkDeleted: "{count} ticket eliminato",
      bulkDeletedPlural: "{count} ticket eliminati",
      bulkDeleteError: "Errore nell'eliminazione di massa",
      bulkUpdatePartial: "{success} aggiornati, {failure} errori",
      bulkUpdated: "{count} ticket aggiornato",
      bulkUpdatedPlural: "{count} ticket aggiornati",
      reorderViews: "Errore nel riordino delle viste",
      viewUpdated: "Vista aggiornata",
      viewCreated: "Vista creata",
      exportError: "Errore nell'export CSV"
    }
  },
  es: {
    eyebrow: "Helpdesk",
    pageTitle: "Soporte",
    onboardingBadge: "Onboarding",
    loadingTickets: "Cargando tickets…",
    ticketCount: "{count} ticket",
    ticketCountPlural: "{count} tickets",
    subtitleActive: "Vista « {view} » · {count} ticket",
    subtitleActivePlural: "Vista « {view} » · {count} tickets",
    trashSubtitle: "Papelera · {count} ticket",
    trashSubtitlePlural: "Papelera · {count} tickets",
    satisfactionCount: "{count} feedback de cliente",
    satisfactionCountPlural: "{count} feedbacks de clientes",
    subtitleSatisfaction: "Vista « {view} » · {count} feedback de cliente",
    subtitleSatisfactionPlural: "Vista « {view} » · {count} feedbacks de clientes",
    trashSwitchTitle: "Mostrar tickets eliminados",
    trashSwitchLabel: "Papelera",
    trashSwitchAria: "Mostrar papelera",
    playModeBanner: "Modo aleatorio",
    playModeTooltip: "Ticket aleatorio · continúa tras cada envío (Mayús+clic para detener)",
    playModeAria: "Abrir un ticket aleatorio",
    playModeDisabled: "Modo ticket aleatorio desactivado",
    exportCsv: "Exportar a CSV",
    exportCsvAria: "Exportar CSV",
    columnsSettings: "Configurar columnas",
    columnsSettingsAria: "Configurar columnas de la tabla",
    newTicket: "Nuevo ticket",
    newTicketAria: "Nuevo ticket",
    statusFilters: {
      new: "Nuevos",
      in_progress: "En curso",
      pending: "En espera",
      resolved: "Resueltos",
      closed: "Cerrados"
    },
    statusBadge: {
      new: "Nuevo",
      in_progress: "En curso",
      pending: "En espera",
      resolved: "Resuelto",
      closed: "Cerrado"
    },
    priority: {
      low: "Baja",
      normal: "Normal",
      high: "Alta",
      urgent: "Urgente",
      majorIncident: "Incidente grave"
    },
    channels: {
      web: "Web",
      phone: "Teléfono",
      email: "Email",
      chat: "Chat",
      api: "API",
      whatsapp: "WhatsApp"
    },
    ticketTypes: {
      incident: {
        label: "Incidente",
        hint: "Avería o interrupción del servicio"
      },
      demande: {
        label: "Solicitud",
        hint: "Necesidad o pregunta del cliente"
      },
      probleme: {
        label: "Problema",
        hint: "Causa raíz recurrente"
      },
      changement: {
        label: "Cambio",
        hint: "Modificación planificada"
      }
    },
    allTypes: "Todos los tipos",
    views: {
      paneAria: "Vistas de tickets",
      title: "Vistas",
      reorderFinish: "Terminar reordenación",
      reorderStart: "Reordenar vistas",
      create: "Crear una vista",
      saving: "Guardando…",
      reorderHint: "Arrastra las vistas para reordenarlas",
      loading: "Cargando…",
      general: "General",
      team: "Equipo",
      assigned: "Asignadas",
      private: "Personales",
      satisfaction: "Feedback clientes",
      satisfactionViews: {
        mine: {
          name: "Mis feedback de clientes",
          description: "Feedback de clientes en sus tickets asignados"
        },
        all: {
          name: "Todos los feedback de clientes",
          description: "Todos los feedback de clientes de los tickets"
        }
      },
      emptyHint: "Crea vistas personalizadas para filtrar tus tickets.",
      dragView: "Arrastrar vista {name}",
      ticketCountAria: "{count} ticket",
      ticketCountAriaPlural: "{count} tickets",
      editView: "Editar vista",
      editViewNamed: "Editar vista {name}",
      collapsePane: "Contraer vistas",
      expandPane: "Mostrar vistas"
    },
    search: {
      placeholder: "Ticket, cliente, solicitante, etiqueta…",
      aria: "Buscar un ticket",
      clear: "Borrar",
      filterType: "Filtrar por tipo",
      viewMeta: "Vista « {name} »",
      defaultViewName: "Tickets"
    },
    empty: {
      trashTitle: "Papelera vacía",
      noTicketsTitle: "Ningún ticket encontrado",
      trashHint: "Los tickets eliminados aparecerán aquí.",
      activeHint: "Ajusta los filtros o crea un nuevo ticket de soporte."
    },
    bulk: {
      selected: "seleccionado",
      selectedPlural: "seleccionados",
      restore: "Restaurar",
      purge: "Eliminar definitivamente",
      purgeLoading: "Eliminando…",
      edit: "Editar",
      delete: "Eliminar",
      deleteLoading: "Eliminando…",
      clearSelection: "Cancelar selección",
      deleteTitle: "¿Eliminar {label}?",
      deleteMessage: "Los tickets se moverán a la papelera.",
      purgeTitle: "¿Eliminar definitivamente {label}?",
      purgeMessage: "Esta acción es irreversible.",
      purgeOneTitle: "¿Eliminar definitivamente este ticket?",
      confirmDelete: "Eliminar",
      confirmPurge: "Eliminar definitivamente",
      ticketLabel: "{count} ticket",
      ticketLabelPlural: "{count} tickets"
    },
    bulkModal: {
      title: "Acciones masivas",
      selected: "{count} ticket seleccionado",
      selectedPlural: "{count} tickets seleccionados",
      editStatus: "Cambiar estado",
      editPriority: "Cambiar prioridad",
      editType: "Cambiar tipo",
      editRequester: "Cambiar solicitante",
      editAssignees: "Cambiar asignación",
      editWatchers: "Cambiar seguidores",
      requesterContact: "Contacto",
      requesterUser: "Usuario interno",
      searchContact: "Buscar un contacto…",
      searchUser: "Buscar un usuario…",
      chooseContact: "Elegir un contacto",
      chooseUser: "Elegir un usuario",
      assigneeReplaceHint: "Dejar vacío para quitar todos los asignados.",
      watcherReplaceHint: "Dejar vacío para quitar todos los seguidores.",
      assigneeModes: {
        replace: "Reemplazar asignados",
        add: "Añadir asignados",
        remove: "Quitar asignados"
      },
      watcherModes: {
        add: "Añadir seguidores",
        replace: "Reemplazar seguidores",
        remove: "Quitar seguidores"
      },
      userFallback: "Usuario",
      contactFallback: "Contacto #{id}",
      validation: {
        noField: "Selecciona al menos un cambio a aplicar.",
        noContact: "Elige un contacto solicitante.",
        noUser: "Elige un usuario solicitante.",
        noAssignee: "Selecciona al menos un asignado.",
        noWatcher: "Selecciona al menos un seguidor."
      },
      submitError: "Error en la acción masiva"
    },
    table: {
      selectAll: "Seleccionar todos los tickets de la página",
      selectOne: "Seleccionar ticket #{id}",
      id: "ID",
      subject: "Asunto",
      channel: "Canal",
      type: "Tipo",
      requester: "Solicitante",
      client: "Cliente",
      assigned: "Asignado",
      followers: "Seguidores",
      tags: "Etiquetas",
      status: "Estado",
      priority: "Prioridad",
      sla: "SLA",
      created: "Creación",
      updated: "Última modificación",
      actions: "Acciones",
      loading: "Cargando...",
      noRows: "Ningún ticket",
      majorBadge: "Grave",
      restore: "Restaurar",
      restoreTitle: "Restaurar ticket",
      purgeTitle: "Eliminar definitivamente",
      delete: "Eliminar",
      slaFirstResponse: "Plazo primera respuesta",
      slaResolution: "Plazo resolución"
    },
    tooltip: {
      majorIncident: "Incidente grave",
      incomingEmail: "Correo entrante",
      comment: "{count} comentario",
      commentPlural: "{count} comentarios"
    },
    sla: {},
    followersCount: "{count} seguidores",
    export: {
      filenamePrefix: "tickets",
      truncated: "Exportación limitada a los primeros 10.000 tickets que coincidan con los filtros.",
      headers: ["ID", "Asunto", "Tipo", "Canal", "Solicitante", "Cliente", "Asignados", "Seguidores", "Estado", "Prioridad", "Creacion", "Ultima modificacion"]
    },
    columnsModal: {
      title: "Columnas de la tabla",
      subtitle: "Elige las columnas visibles en la lista de tickets.",
      privateTab: "Vista privada",
      publicTab: "Vista pública",
      privateHintInactive: "Aún no hay vista privada — se usa la vista pública. Marca columnas para crear la tuya.",
      privateHintActive: "Tu vista privada sustituye la vista pública.",
      publicHint: "Columnas por defecto para todos los usuarios sin vista privada.",
      adminOnly: "Solo los administradores pueden editar la vista pública.",
      resetPrivate: "Usar la vista pública",
      resetSuccess: "Vista privada restablecida",
      savePrivateSuccess: "Vista privada guardada",
      savePublicSuccess: "Vista pública guardada",
      saveError: "Error al guardar las columnas",
      atLeastOne: "Selecciona al menos una columna.",
      reorderHint: "Arrastre las filas para cambiar el orden de las columnas en la tabla.",
      dragColumn: "Arrastrar la columna {name}",
      save: "Guardar"
    },
    toasts: {
      loadColumns: "Error al cargar las columnas",
      loadViews: "Error al cargar las vistas",
      loadData: "Error al cargar los datos",
      loadTickets: "Error al cargar los tickets",
      restored: "Ticket restaurado",
      restoreError: "Error al restaurar el ticket",
      adminOnlyPurge: "Solo los administradores pueden eliminar definitivamente un ticket",
      purged: "Ticket eliminado definitivamente",
      purgeError: "Error al eliminar definitivamente",
      bulkRestorePartial: "{success} restaurados, {failure} errores",
      bulkRestored: "{count} ticket restaurado",
      bulkRestoredPlural: "{count} tickets restaurados",
      bulkRestoreError: "Error en la restauración masiva",
      bulkPurgePartial: "{success} eliminados, {failure} errores",
      bulkPurged: "{count} ticket eliminado definitivamente",
      bulkPurgedPlural: "{count} tickets eliminados definitivamente",
      bulkDeletePartial: "{success} eliminados, {failure} errores",
      bulkDeleted: "{count} ticket eliminado",
      bulkDeletedPlural: "{count} tickets eliminados",
      bulkDeleteError: "Error en la eliminación masiva",
      bulkUpdatePartial: "{success} actualizados, {failure} errores",
      bulkUpdated: "{count} ticket actualizado",
      bulkUpdatedPlural: "{count} tickets actualizados",
      reorderViews: "Error al reordenar las vistas",
      viewUpdated: "Vista actualizada",
      viewCreated: "Vista creada",
      exportError: "Error al exportar CSV"
    }
  }
};
export function getTicketPageCopy(locale) {
  const t = pickLocaleMessages(TICKETS_COPY, locale);
  const ticketTypeOptions = TICKET_TYPE_KEYS.map(value => ({
    value,
    label: t.ticketTypes[value].label,
    hint: t.ticketTypes[value].hint
  }));
  return {
    ...t,
    statusFilters: STATUS_FILTER_KEYS.map(key => ({
      key,
      label: t.statusFilters[key],
      ...STATUS_FILTER_META[key]
    })),
    ticketTypeOptions,
    typeFilterOptions: [{
      value: "",
      label: t.allTypes
    }, ...ticketTypeOptions],
    getStatusBadge: status => t.statusBadge[status] || status,
    getPriorityLabel: priority => t.priority[priority] || priority || "-",
    getChannelMeta: channel => ({
      label: t.channels[channel] || channel || "-",
      icon: CHANNEL_ICONS[channel] || "mdi:help-circle-outline"
    }),
    getTypeLabel: type => {
      const normalized = String(type || "").trim().toLowerCase();
      const safeType = normalized === "request" ? "demande" : normalized;
      const match = ticketTypeOptions.find(option => option.value === safeType);
      return match?.label || safeType || "-";
    },
    getTypeTooltip: type => {
      const normalized = String(type || "").trim().toLowerCase();
      const safeType = normalized === "request" ? "demande" : normalized;
      const match = ticketTypeOptions.find(option => option.value === safeType);
      if (!match) return safeType || "-";
      return `${match.label} · ${match.hint}`;
    },
    getPriorityVisual: (priority, isMajor) => {
      if (priority === "urgent" || isMajor) {
        return {
          icon: "mdi:alert-octagon",
          label: isMajor ? t.priority.majorIncident : t.priority.urgent
        };
      }
      if (priority === "low") {
        return {
          icon: "mdi:arrow-down",
          label: t.priority.low
        };
      }
      if (priority === "normal") {
        return {
          icon: "mdi:minus",
          label: t.priority.normal
        };
      }
      return {
        icon: "mdi:arrow-up",
        label: t.priority[priority] || priority || "-"
      };
    },
    formatTicketCount: count => interpolate(count === 1 ? t.ticketCount : t.ticketCountPlural, {
      count: String(count)
    }),
    formatTrashSubtitle: count => interpolate(count === 1 ? t.trashSubtitle : t.trashSubtitlePlural, {
      count: String(count)
    }),
    formatSatisfactionCount: count => interpolate(count === 1 ? t.satisfactionCount : t.satisfactionCountPlural, {
      count: String(count)
    }),
    formatSubtitle: (loading, viewMode, viewName, count, options = {}) => {
      if (loading) return t.loadingTickets;
      if (viewMode === "trash") {
        return interpolate(count === 1 ? t.trashSubtitle : t.trashSubtitlePlural, {
          count: String(count)
        });
      }
      if (options.satisfaction) {
        return interpolate(count === 1 ? t.subtitleSatisfaction : t.subtitleSatisfactionPlural, {
          view: viewName || "",
          count: String(count)
        });
      }
      return interpolate(count === 1 ? t.subtitleActive : t.subtitleActivePlural, {
        view: viewName || "",
        count: String(count)
      });
    },
    formatViewTicketCountAria: count => interpolate(count === 1 ? t.views.ticketCountAria : t.views.ticketCountAriaPlural, {
      count: String(count)
    }),
    formatBulkTicketLabel: count => interpolate(count === 1 ? t.bulk.ticketLabel : t.bulk.ticketLabelPlural, {
      count: String(count)
    }),
    formatCommentCount: count => interpolate(count === 1 ? t.tooltip.comment : t.tooltip.commentPlural, {
      count: String(count)
    }),
    formatFollowersCount: count => interpolate(t.followersCount, {
      count: String(count)
    }),
    formatViewMeta: name => interpolate(t.search.viewMeta, {
      name: name || t.search.defaultViewName
    }),
    formatDragViewAria: name => interpolate(t.views.dragView, {
      name
    }),
    formatEditViewAria: name => interpolate(t.views.editViewNamed, {
      name
    }),
    formatSelectTicketAria: id => interpolate(t.table.selectOne, {
      id: String(id)
    }),
    formatBulkRestored: successCount => interpolate(successCount === 1 ? t.toasts.bulkRestored : t.toasts.bulkRestoredPlural, {
      count: String(successCount)
    }),
    formatBulkPurged: successCount => interpolate(successCount === 1 ? t.toasts.bulkPurged : t.toasts.bulkPurgedPlural, {
      count: String(successCount)
    }),
    formatBulkDeleted: successCount => interpolate(successCount === 1 ? t.toasts.bulkDeleted : t.toasts.bulkDeletedPlural, {
      count: String(successCount)
    }),
    formatBulkUpdated: successCount => interpolate(successCount === 1 ? t.toasts.bulkUpdated : t.toasts.bulkUpdatedPlural, {
      count: String(successCount)
    }),
    formatBulkModalSelected: count => interpolate(count === 1 ? t.bulkModal.selected : t.bulkModal.selectedPlural, {
      count: String(count)
    }),
    statusOptions: ["new", "in_progress", "pending", "resolved", "closed"].map(value => ({
      value,
      label: t.statusBadge[value]
    })),
    priorityOptions: ["low", "normal", "high", "urgent"].map(value => ({
      value,
      label: t.priority[value]
    })),
    assigneeModes: ["replace", "add", "remove"].map(value => ({
      value,
      label: t.bulkModal.assigneeModes[value]
    })),
    watcherModes: ["add", "replace", "remove"].map(value => ({
      value,
      label: t.bulkModal.watcherModes[value]
    }))
  };
}
