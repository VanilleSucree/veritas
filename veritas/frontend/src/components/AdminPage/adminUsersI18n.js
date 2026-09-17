import { createLocaleGetter, interpolate } from "../../i18n/translate";
const USERS_COPY = {
  fr: {
    views: {
      users: "Agents",
      profiles: "Profils",
      access: "Permissions"
    },
    accessColumns: {
      entreprise: "Entreprise",
      contact: "Contact",
      prestataire: "Prestataires",
      tickets: "Support",
      ticketSales: "Prestations et installations",
      planning: "Planning",
      infrastructure: "Centre de supervision",
      inventory: "Inventaire périphériques",
      cybersecurite: "Cybersécurité",
      services: "Cloud IT et services",
      dashboard: "Tableau de bord KPI",
      documents: "Documents",
      rapports: "Rapports",
      knowledgeBase: "Base de connaissances",
      administration: "Administration"
    },
    mfa: {
      enabled: "Activé",
      pending: "En cours",
      off: "Désactivé",
      titlePrefix: "MFA :"
    },
    agents: {
      title: "Gestion des agents",
      description: "Liste, création et modification des comptes agents.",
      newAgent: "Nouvel agent",
      searchPlaceholder: "Rechercher un agent…",
      agentCount: "{count} agent",
      agentCountPlural: "{count} agents",
      limitReached: "Limite atteinte ({current}/{max} agents).",
      quota: "Quota : {current}/{max} agents actifs.",
      limitTitle: "Limite Community : {max} agents MSP maximum",
      limitWarn: "Limite Community : {max} agents MSP maximum. Passez à Veritas Pro pour en ajouter davantage.",
      emptyLoading: "Chargement…",
      empty: "Aucun agent trouvé",
      columns: {
        user: "Utilisateur",
        status: "Statut",
        mfa: "MFA",
        profile: "Profil",
        created: "Créé le",
        lastLogin: "Dernière connexion"
      },
      range: "{start}–{end} sur {total}"
    },
    impersonation: {
      action: "Impersonner",
      actionTitle: "Se connecter en tant que cet agent",
      bannerPrefix: "Vous êtes connecté en tant que",
      fallback: "agent",
      stop: "Quitter",
      stopping: "Retour…",
      stopError: "Impossible de quitter l'impersonation.",
      startError: "Impossible de démarrer l'impersonation.",
      started: "Impersonation démarrée",
      stopped: "Retour à votre session administrateur",
      selfBlocked: "Vous ne pouvez pas vous impersonner vous-même."
    },
    profiles: {
      title: "Profils d'accès",
      description: "Modèles de droits réutilisables : libellé, description et agents rattachés à chaque profil.",
      descriptionCommunity: "Consultez les profils système. La création de profils personnalisés est réservée à Veritas Pro.",
      newProfile: "Nouveau profil",
      createProTitle: "Création de profils · disponible avec Veritas Pro",
      searchPlaceholder: "Rechercher un profil…",
      profileCount: "{count} profil",
      profileCountPlural: "{count} profils",
      emptyLoading: "Chargement…",
      empty: "Aucun profil",
      systemTag: "Système",
      inherits: "Hérite de {parent}",
      stats: "{count} agent · MFA : {mfa}/{total}",
      statsPlural: "{count} agents · MFA : {mfa}/{total}",
      view: "Voir",
      edit: "Modifier",
      modalSystemTitle: "Profil système",
      modalEditTitle: "Modifier le profil",
      modalSubtitle: "Consultez les détails et les agents assignés à ce profil.",
      modalEyebrow: "Profils d'accès",
      detailsSection: "Détails",
      identifierLabel: "Identifiant",
      identifierHint: "Non modifiable après création",
      descriptionLabel: "Description",
      descriptionPlaceholder: "ex: Accès standard technicien",
      parentLabel: "Profil parent",
      assignedAgents: "Agents assignés",
      assignedCount: "{count} agent",
      assignedCountPlural: "{count} agents",
      noAgents: "Aucun agent sur ce profil.",
      systemSubtitle: "Profil système Veritas",
      customSubtitle: "Profil personnalisé",
      deleteTitle: "Supprimer ce profil",
      deleteDesc: "Les agents conservent leur accès tant qu'ils ne sont pas réassignés. La suppression est irréversible.",
      customBadge: "Personnalisé",
      assignedColumns: {
        agent: "Agent",
        status: "Statut",
        mfa: "MFA"
      }
    },
    access: {
      title: "Matrice des modules",
      description: "Définissez les modules accessibles pour chaque profil (alignés sur la barre latérale). Entreprise et Contact sont toujours actifs.",
      descriptionCommunity: "En édition Community, tous les agents accèdent à Entreprise, Contact et Support uniquement.",
      communityHint: "La personnalisation des droits d'accès est réservée à Veritas Pro.",
      legendOn: "Activé",
      legendOff: "Désactivé",
      legendLock: "Verrouillé",
      profileColumn: "Profil",
      empty: "Aucun profil",
      toggleCommunityActive: "Toujours actif en Community",
      toggleCommunityInactive: "Non disponible en Community",
      toggleLocked: "Toujours actif",
      toggleDisable: "Cliquer pour désactiver",
      toggleEnable: "Cliquer pour activer"
    },
    toast: {
      loadUsersError: "Erreur de chargement des utilisateurs",
      loadProfilesError: "Erreur de chargement des profils",
      invalidEmail: "Adresse email invalide",
      passwordTooShort: "Mot de passe trop court (6 caractères minimum)",
      passwordMismatch: "Les mots de passe ne correspondent pas",
      userCreated: "Utilisateur créé",
      createFailed: "Échec de création",
      roleUpdated: "Rôle mis à jour",
      roleUpdateError: "Erreur mise à jour rôle",
      profileUpdateFailed: "Échec de la mise à jour du profil",
      profileNameRequired: "Nom de profil requis",
      profileCreated: "Profil créé",
      profileCreateFailed: "Échec de création du profil",
      profileDeleted: "Profil supprimé",
      profileDeleteFailed: "Échec de suppression du profil",
      profileUpdated: "Profil mis à jour",
      profileUpdateFailed2: "Échec de mise à jour du profil",
      permissionsUpdated: "Permissions mises à jour",
      permissionsUpdateFailed: "Échec de la mise à jour des permissions",
      mfaReleased: "MFA réinitialisée pour {email}",
      mfaReleaseFailed: "Échec de la réinitialisation MFA",
      loadUserError: "Erreur chargement utilisateur",
      selectProfile: "Veuillez sélectionner un profil",
      userUpdated: "Utilisateur mis à jour",
      saveError: "Erreur lors de l'enregistrement",
      agentDeleted: "Agent supprimé",
      deleteFailed: "Échec de la suppression"
    },
    confirm: {
      releaseMfaTitle: "Réinitialiser la MFA",
      releaseMfaMessage: "Confirmer la réinitialisation MFA pour {email} ? L'agent devra reconfigurer l'authentification à deux facteurs.",
      releaseMfaConfirm: "Réinitialiser",
      releaseMfaLoading: "Réinitialisation…",
      deleteAgentTitle: "Supprimer l'agent",
      deleteAgentMessage: "Confirmer la suppression de {email} ? Cette action est irréversible.",
      deleteProfileTitle: "Supprimer le profil",
      deleteProfileMessage: "Confirmer la suppression du profil « {name} » ? Cette action est irréversible.",
      resetMfaTitle: "Réinitialiser la MFA"
    },
    deleteAgent: {
      self: "Vous ne pouvez pas supprimer votre propre compte.",
      lastAdmin: "Impossible de supprimer le dernier administrateur. Il doit rester au moins un compte admin.",
      default: "Cette action est définitive. L'agent perdra immédiatement tout accès à Veritas.",
      title: "Supprimer cet agent"
    }
  },
  en: {
    views: {
      users: "Agents",
      profiles: "Profiles",
      access: "Permissions"
    },
    accessColumns: {
      entreprise: "Enterprise",
      contact: "Contact",
      prestataire: "Providers",
      tickets: "Support",
      ticketSales: "Services and installations",
      planning: "Planning",
      infrastructure: "Monitoring Center",
      inventory: "Device inventory",
      cybersecurite: "Cybersecurity",
      services: "Cloud IT & Services",
      dashboard: "KPI Dashboard",
      documents: "Documents",
      rapports: "Reports",
      knowledgeBase: "Knowledge base",
      administration: "Administration"
    },
    mfa: {
      enabled: "Enabled",
      pending: "Pending",
      off: "Disabled",
      titlePrefix: "MFA:"
    },
    agents: {
      title: "Agent management",
      description: "List, create and edit agent accounts.",
      newAgent: "New agent",
      searchPlaceholder: "Search an agent…",
      agentCount: "{count} agent",
      agentCountPlural: "{count} agents",
      limitReached: "Limit reached ({current}/{max} agents).",
      quota: "Quota: {current}/{max} active agents.",
      limitTitle: "Community limit: {max} MSP agents maximum",
      limitWarn: "Community limit: {max} MSP agents maximum. Upgrade to Veritas Pro to add more.",
      emptyLoading: "Loading…",
      empty: "No agents found",
      columns: {
        user: "User",
        status: "Status",
        mfa: "MFA",
        profile: "Profile",
        created: "Created",
        lastLogin: "Last login"
      },
      range: "{start}–{end} of {total}"
    },
    impersonation: {
      action: "Impersonate",
      actionTitle: "Sign in as this agent",
      bannerPrefix: "You are signed in as",
      fallback: "agent",
      stop: "Exit",
      stopping: "Returning…",
      stopError: "Unable to exit impersonation.",
      startError: "Unable to start impersonation.",
      started: "Impersonation started",
      stopped: "Returned to your administrator session",
      selfBlocked: "You cannot impersonate yourself."
    },
    profiles: {
      title: "Access profiles",
      description: "Reusable permission templates: label, description and assigned agents.",
      descriptionCommunity: "View system profiles. Custom profile creation requires Veritas Pro.",
      newProfile: "New profile",
      createProTitle: "Profile creation · available with Veritas Pro",
      searchPlaceholder: "Search a profile…",
      profileCount: "{count} profile",
      profileCountPlural: "{count} profiles",
      emptyLoading: "Loading…",
      empty: "No profiles",
      systemTag: "System",
      inherits: "Inherits from {parent}",
      stats: "{count} agent · MFA: {mfa}/{total}",
      statsPlural: "{count} agents · MFA: {mfa}/{total}",
      view: "View",
      edit: "Edit",
      modalSystemTitle: "System profile",
      modalEditTitle: "Edit profile",
      modalSubtitle: "View details and agents assigned to this profile.",
      modalEyebrow: "Access profiles",
      detailsSection: "Details",
      identifierLabel: "Identifier",
      identifierHint: "Cannot be changed after creation",
      descriptionLabel: "Description",
      descriptionPlaceholder: "e.g. Standard technician access",
      parentLabel: "Parent profile",
      assignedAgents: "Assigned agents",
      assignedCount: "{count} agent",
      assignedCountPlural: "{count} agents",
      noAgents: "No agents on this profile.",
      systemSubtitle: "Veritas system profile",
      customSubtitle: "Custom profile",
      deleteTitle: "Delete this profile",
      deleteDesc: "Agents keep their access until reassigned. Deletion is irreversible.",
      customBadge: "Custom",
      assignedColumns: {
        agent: "Agent",
        status: "Status",
        mfa: "MFA"
      }
    },
    access: {
      title: "Module matrix",
      description: "Define accessible modules per profile (matching the sidebar). Enterprise and Contact are always active.",
      descriptionCommunity: "In Community edition, all agents access Enterprise, Contact and Support only.",
      communityHint: "Access customization requires Veritas Pro.",
      legendOn: "Enabled",
      legendOff: "Disabled",
      legendLock: "Locked",
      profileColumn: "Profile",
      empty: "No profiles",
      toggleCommunityActive: "Always active in Community",
      toggleCommunityInactive: "Not available in Community",
      toggleLocked: "Always active",
      toggleDisable: "Click to disable",
      toggleEnable: "Click to enable"
    },
    toast: {
      loadUsersError: "Error loading users",
      loadProfilesError: "Error loading profiles",
      invalidEmail: "Invalid email address",
      passwordTooShort: "Password too short (minimum 6 characters)",
      passwordMismatch: "Passwords do not match",
      userCreated: "User created",
      createFailed: "Creation failed",
      roleUpdated: "Role updated",
      roleUpdateError: "Error updating role",
      profileUpdateFailed: "Failed to update profile",
      profileNameRequired: "Profile name required",
      profileCreated: "Profile created",
      profileCreateFailed: "Failed to create profile",
      profileDeleted: "Profile deleted",
      profileDeleteFailed: "Failed to delete profile",
      profileUpdated: "Profile updated",
      profileUpdateFailed2: "Failed to update profile",
      permissionsUpdated: "Permissions updated",
      permissionsUpdateFailed: "Failed to update permissions",
      mfaReleased: "MFA reset for {email}",
      mfaReleaseFailed: "Failed to reset MFA",
      loadUserError: "Error loading user",
      selectProfile: "Please select a profile",
      userUpdated: "User updated",
      saveError: "Error while saving",
      agentDeleted: "Agent deleted",
      deleteFailed: "Deletion failed"
    },
    confirm: {
      releaseMfaTitle: "Reset MFA",
      releaseMfaMessage: "Confirm MFA reset for {email}? The agent will need to set up two-factor authentication again.",
      releaseMfaConfirm: "Reset",
      releaseMfaLoading: "Resetting…",
      deleteAgentTitle: "Delete agent",
      deleteAgentMessage: "Confirm deletion of {email}? This action is irreversible.",
      deleteProfileTitle: "Delete profile",
      deleteProfileMessage: "Confirm deletion of profile « {name} »? This action is irreversible.",
      resetMfaTitle: "Reset MFA"
    },
    deleteAgent: {
      self: "You cannot delete your own account.",
      lastAdmin: "Cannot delete the last administrator. At least one admin account must remain.",
      default: "This action is permanent. The agent will immediately lose all access to Veritas.",
      title: "Delete this agent"
    }
  },
  de: {
    views: {
      users: "Agenten",
      profiles: "Profile",
      access: "Rechte"
    },
    accessColumns: {
      entreprise: "Unternehmen",
      contact: "Kontakt",
      prestataire: "Dienstleister",
      tickets: "Support",
      ticketSales: "Dienstleistungen & Installationen",
      planning: "Planung",
      infrastructure: "Überwachungszentrum",
      inventory: "Geräteinventar",
      cybersecurite: "Cybersicherheit",
      services: "Cloud IT & Services",
      dashboard: "KPI-Dashboard",
      documents: "Dokumente",
      rapports: "Berichte",
      knowledgeBase: "Wissensdatenbank",
      administration: "Administration"
    },
    mfa: {
      enabled: "Aktiv",
      pending: "Laufend",
      off: "Deaktiviert",
      titlePrefix: "MFA:"
    },
    agents: {
      title: "Agentenverwaltung",
      description: "Agentenkonten auflisten, erstellen und bearbeiten.",
      newAgent: "Neuer Agent",
      searchPlaceholder: "Agent suchen…",
      agentCount: "{count} Agent",
      agentCountPlural: "{count} Agenten",
      limitReached: "Limit erreicht ({current}/{max} Agenten).",
      quota: "Kontingent: {current}/{max} aktive Agenten.",
      limitTitle: "Community-Limit: max. {max} MSP-Agenten",
      limitWarn: "Community-Limit: max. {max} MSP-Agenten. Upgrade auf Veritas Pro für mehr.",
      emptyLoading: "Laden…",
      empty: "Keine Agenten gefunden",
      columns: {
        user: "Benutzer",
        status: "Status",
        mfa: "MFA",
        profile: "Profil",
        created: "Erstellt",
        lastLogin: "Letzte Anmeldung"
      },
      range: "{start}–{end} von {total}"
    },
    impersonation: {
      action: "Impersonieren",
      actionTitle: "Als dieser Agent anmelden",
      bannerPrefix: "Sie sind angemeldet als",
      fallback: "Agent",
      stop: "Beenden",
      stopping: "Zurück…",
      stopError: "Impersonation konnte nicht beendet werden.",
      startError: "Impersonation konnte nicht gestartet werden.",
      started: "Impersonation gestartet",
      stopped: "Zurück zu Ihrer Administratorsitzung",
      selfBlocked: "Sie können sich nicht selbst impersonieren."
    },
    profiles: {
      title: "Zugriffsprofile",
      description: "Wiederverwendbare Rechtemodelle mit zugewiesenen Agenten.",
      descriptionCommunity: "Systemprofile ansehen. Benutzerdefinierte Profile erfordern Veritas Pro.",
      newProfile: "Neues Profil",
      createProTitle: "Profilerstellung · mit Veritas Pro verfügbar",
      searchPlaceholder: "Profil suchen…",
      profileCount: "{count} Profil",
      profileCountPlural: "{count} Profile",
      emptyLoading: "Laden…",
      empty: "Keine Profile",
      systemTag: "System",
      inherits: "Erbt von {parent}",
      stats: "{count} Agent · MFA: {mfa}/{total}",
      statsPlural: "{count} Agenten · MFA: {mfa}/{total}",
      view: "Ansehen",
      edit: "Bearbeiten",
      modalSystemTitle: "Systemprofil",
      modalEditTitle: "Profil bearbeiten",
      modalSubtitle: "Details und zugewiesene Agenten ansehen.",
      modalEyebrow: "Zugriffsprofile",
      detailsSection: "Details",
      identifierLabel: "Kennung",
      identifierHint: "Nach Erstellung nicht änderbar",
      descriptionLabel: "Beschreibung",
      descriptionPlaceholder: "z. B. Standard-Technikerzugriff",
      parentLabel: "Elternprofil",
      assignedAgents: "Zugewiesene Agenten",
      assignedCount: "{count} Agent",
      assignedCountPlural: "{count} Agenten",
      noAgents: "Keine Agenten für dieses Profil.",
      systemSubtitle: "Veritas-Systemprofil",
      customSubtitle: "Benutzerdefiniertes Profil",
      deleteTitle: "Profil löschen",
      deleteDesc: "Agenten behalten den Zugriff bis zur Neuzuweisung. Löschen ist endgültig.",
      customBadge: "Benutzerdefiniert",
      assignedColumns: {
        agent: "Agent",
        status: "Status",
        mfa: "MFA"
      }
    },
    access: {
      title: "Modulmatrix",
      description: "Module pro Profil definieren. Unternehmen und Kontakt sind immer aktiv.",
      descriptionCommunity: "In Community haben alle Agenten nur Zugriff auf Unternehmen, Kontakt und Support.",
      communityHint: "Rechteanpassung erfordert Veritas Pro.",
      legendOn: "Aktiv",
      legendOff: "Deaktiviert",
      legendLock: "Gesperrt",
      profileColumn: "Profil",
      empty: "Keine Profile",
      toggleCommunityActive: "In Community immer aktiv",
      toggleCommunityInactive: "In Community nicht verfügbar",
      toggleLocked: "Immer aktiv",
      toggleDisable: "Klicken zum Deaktivieren",
      toggleEnable: "Klicken zum Aktivieren"
    },
    toast: {
      loadUsersError: "Fehler beim Laden der Benutzer",
      loadProfilesError: "Fehler beim Laden der Profile",
      invalidEmail: "Ungültige E-Mail-Adresse",
      passwordTooShort: "Passwort zu kurz (mindestens 6 Zeichen)",
      passwordMismatch: "Passwörter stimmen nicht überein",
      userCreated: "Benutzer erstellt",
      createFailed: "Erstellung fehlgeschlagen",
      roleUpdated: "Rolle aktualisiert",
      roleUpdateError: "Fehler beim Aktualisieren der Rolle",
      profileUpdateFailed: "Profilaktualisierung fehlgeschlagen",
      profileNameRequired: "Profilname erforderlich",
      profileCreated: "Profil erstellt",
      profileCreateFailed: "Profilerstellung fehlgeschlagen",
      profileDeleted: "Profil gelöscht",
      profileDeleteFailed: "Profillöschung fehlgeschlagen",
      profileUpdated: "Profil aktualisiert",
      profileUpdateFailed2: "Profilaktualisierung fehlgeschlagen",
      permissionsUpdated: "Berechtigungen aktualisiert",
      permissionsUpdateFailed: "Aktualisierung der Berechtigungen fehlgeschlagen",
      mfaReleased: "MFA zurückgesetzt für {email}",
      mfaReleaseFailed: "MFA-Zurücksetzung fehlgeschlagen",
      loadUserError: "Fehler beim Laden des Benutzers",
      selectProfile: "Bitte Profil auswählen",
      userUpdated: "Benutzer aktualisiert",
      saveError: "Fehler beim Speichern",
      agentDeleted: "Agent gelöscht",
      deleteFailed: "Löschen fehlgeschlagen"
    },
    confirm: {
      releaseMfaTitle: "MFA zurücksetzen",
      releaseMfaMessage: "MFA-Zurücksetzung für {email} bestätigen? Der Agent muss 2FA neu einrichten.",
      releaseMfaConfirm: "Zurücksetzen",
      releaseMfaLoading: "Zurücksetzen…",
      deleteAgentTitle: "Agent löschen",
      deleteAgentMessage: "Löschen von {email} bestätigen? Diese Aktion ist endgültig.",
      deleteProfileTitle: "Profil löschen",
      deleteProfileMessage: "Löschen des Profils « {name} » bestätigen? Diese Aktion ist endgültig.",
      resetMfaTitle: "MFA zurücksetzen"
    },
    deleteAgent: {
      self: "Sie können Ihr eigenes Konto nicht löschen.",
      lastAdmin: "Der letzte Administrator kann nicht gelöscht werden.",
      default: "Diese Aktion ist endgültig. Der Agent verliert sofort den Zugriff auf Veritas.",
      title: "Diesen Agent löschen"
    }
  },
  it: {
    views: {
      users: "Agenti",
      profiles: "Profili",
      access: "Permessi"
    },
    accessColumns: {
      entreprise: "Azienda",
      contact: "Contatto",
      prestataire: "Fornitori",
      tickets: "Supporto",
      ticketSales: "Servizi e installazioni",
      planning: "Pianificazione",
      infrastructure: "Centro di supervisione",
      inventory: "Inventario periferiche",
      cybersecurite: "Cybersicurezza",
      services: "Cloud IT e servizi",
      dashboard: "Dashboard KPI",
      documents: "Documenti",
      rapports: "Report",
      knowledgeBase: "Knowledge base",
      administration: "Amministrazione"
    },
    mfa: {
      enabled: "Attivo",
      pending: "In corso",
      off: "Disattivato",
      titlePrefix: "MFA:"
    },
    agents: {
      title: "Gestione agenti",
      description: "Elenco, creazione e modifica account agenti.",
      newAgent: "Nuovo agente",
      searchPlaceholder: "Cerca un agente…",
      agentCount: "{count} agente",
      agentCountPlural: "{count} agenti",
      limitReached: "Limite raggiunto ({current}/{max} agenti).",
      quota: "Quota: {current}/{max} agenti attivi.",
      limitTitle: "Limite Community: max {max} agenti MSP",
      limitWarn: "Limite Community: max {max} agenti MSP. Passa a Veritas Pro per aggiungerne.",
      emptyLoading: "Caricamento…",
      empty: "Nessun agente trovato",
      columns: {
        user: "Utente",
        status: "Stato",
        mfa: "MFA",
        profile: "Profilo",
        created: "Creato il",
        lastLogin: "Ultimo accesso"
      },
      range: "{start}–{end} di {total}"
    },
    impersonation: {
      action: "Impersona",
      actionTitle: "Accedi come questo agente",
      bannerPrefix: "Sei connesso come",
      fallback: "agente",
      stop: "Esci",
      stopping: "Uscita…",
      stopError: "Impossibile uscire dall'impersonazione.",
      startError: "Impossibile avviare l'impersonazione.",
      started: "Impersonazione avviata",
      stopped: "Tornato alla sessione amministratore",
      selfBlocked: "Non puoi impersonare te stesso."
    },
    profiles: {
      title: "Profili di accesso",
      description: "Modelli di permessi riutilizzabili con agenti assegnati.",
      descriptionCommunity: "Consulta i profili di sistema. I profili personalizzati richiedono Veritas Pro.",
      newProfile: "Nuovo profilo",
      createProTitle: "Creazione profili · disponibile con Veritas Pro",
      searchPlaceholder: "Cerca un profilo…",
      profileCount: "{count} profilo",
      profileCountPlural: "{count} profili",
      emptyLoading: "Caricamento…",
      empty: "Nessun profilo",
      systemTag: "Sistema",
      inherits: "Eredita da {parent}",
      stats: "{count} agente · MFA: {mfa}/{total}",
      statsPlural: "{count} agenti · MFA: {mfa}/{total}",
      view: "Visualizza",
      edit: "Modifica",
      modalSystemTitle: "Profilo di sistema",
      modalEditTitle: "Modifica profilo",
      modalSubtitle: "Dettagli e agenti assegnati a questo profilo.",
      modalEyebrow: "Profili di accesso",
      detailsSection: "Dettagli",
      identifierLabel: "Identificativo",
      identifierHint: "Non modificabile dopo la creazione",
      descriptionLabel: "Descrizione",
      descriptionPlaceholder: "Es. Accesso standard tecnico",
      parentLabel: "Profilo padre",
      assignedAgents: "Agenti assegnati",
      assignedCount: "{count} agente",
      assignedCountPlural: "{count} agenti",
      noAgents: "Nessun agente su questo profilo.",
      systemSubtitle: "Profilo di sistema Veritas",
      customSubtitle: "Profilo personalizzato",
      deleteTitle: "Elimina questo profilo",
      deleteDesc: "Gli agenti mantengono l'accesso finché non riassegnati. Eliminazione irreversibile.",
      customBadge: "Personalizzato",
      assignedColumns: {
        agent: "Agente",
        status: "Stato",
        mfa: "MFA"
      }
    },
    access: {
      title: "Matrice moduli",
      description: "Moduli accessibili per profilo. Azienda e Contatto sono sempre attivi.",
      descriptionCommunity: "In Community tutti gli agenti accedono solo ad Azienda, Contatto e Supporto.",
      communityHint: "Personalizzazione permessi riservata a Veritas Pro.",
      legendOn: "Attivo",
      legendOff: "Disattivato",
      legendLock: "Bloccato",
      profileColumn: "Profilo",
      empty: "Nessun profilo",
      toggleCommunityActive: "Sempre attivo in Community",
      toggleCommunityInactive: "Non disponibile in Community",
      toggleLocked: "Sempre attivo",
      toggleDisable: "Clicca per disattivare",
      toggleEnable: "Clicca per attivare"
    },
    toast: {
      loadUsersError: "Errore caricamento utenti",
      loadProfilesError: "Errore caricamento profili",
      invalidEmail: "Indirizzo email non valido",
      passwordTooShort: "Password troppo corta (minimo 6 caratteri)",
      passwordMismatch: "Le password non corrispondono",
      userCreated: "Utente creato",
      createFailed: "Creazione fallita",
      roleUpdated: "Ruolo aggiornato",
      roleUpdateError: "Errore aggiornamento ruolo",
      profileUpdateFailed: "Aggiornamento profilo fallito",
      profileNameRequired: "Nome profilo obbligatorio",
      profileCreated: "Profilo creato",
      profileCreateFailed: "Creazione profilo fallita",
      profileDeleted: "Profilo eliminato",
      profileDeleteFailed: "Eliminazione profilo fallita",
      profileUpdated: "Profilo aggiornato",
      profileUpdateFailed2: "Aggiornamento profilo fallito",
      permissionsUpdated: "Permessi aggiornati",
      permissionsUpdateFailed: "Aggiornamento permessi fallito",
      mfaReleased: "MFA reimpostata per {email}",
      mfaReleaseFailed: "Reimpostazione MFA fallita",
      loadUserError: "Errore caricamento utente",
      selectProfile: "Seleziona un profilo",
      userUpdated: "Utente aggiornato",
      saveError: "Errore durante il salvataggio",
      agentDeleted: "Agente eliminato",
      deleteFailed: "Eliminazione fallita"
    },
    confirm: {
      releaseMfaTitle: "Reimposta MFA",
      releaseMfaMessage: "Confermare reimpostazione MFA per {email}? L'agente dovrà riconfigurare l'autenticazione a due fattori.",
      releaseMfaConfirm: "Reimposta",
      releaseMfaLoading: "Reimpostazione…",
      deleteAgentTitle: "Elimina agente",
      deleteAgentMessage: "Confermare eliminazione di {email}? Azione irreversibile.",
      deleteProfileTitle: "Elimina profilo",
      deleteProfileMessage: "Confermare eliminazione del profilo « {name} »? Azione irreversibile.",
      resetMfaTitle: "Reimposta MFA"
    },
    deleteAgent: {
      self: "Non puoi eliminare il tuo account.",
      lastAdmin: "Impossibile eliminare l'ultimo amministratore.",
      default: "Azione definitiva. L'agente perderà immediatamente l'accesso a Veritas.",
      title: "Elimina questo agente"
    }
  },
  es: {
    views: {
      users: "Agentes",
      profiles: "Perfiles",
      access: "Permisos"
    },
    accessColumns: {
      entreprise: "Empresa",
      contact: "Contacto",
      prestataire: "Proveedores",
      tickets: "Soporte",
      ticketSales: "Servicios e instalaciones",
      planning: "Planificación",
      infrastructure: "Centro de supervisión",
      inventory: "Inventario de periféricos",
      cybersecurite: "Ciberseguridad",
      services: "Cloud IT y servicios",
      dashboard: "Panel KPI",
      documents: "Documentos",
      rapports: "Informes",
      knowledgeBase: "Base de conocimiento",
      administration: "Administración"
    },
    mfa: {
      enabled: "Activo",
      pending: "En curso",
      off: "Desactivado",
      titlePrefix: "MFA:"
    },
    agents: {
      title: "Gestión de agentes",
      description: "Listar, crear y editar cuentas de agentes.",
      newAgent: "Nuevo agente",
      searchPlaceholder: "Buscar un agente…",
      agentCount: "{count} agente",
      agentCountPlural: "{count} agentes",
      limitReached: "Límite alcanzado ({current}/{max} agentes).",
      quota: "Cuota: {current}/{max} agentes activos.",
      limitTitle: "Límite Community: máx. {max} agentes MSP",
      limitWarn: "Límite Community: máx. {max} agentes MSP. Pase a Veritas Pro para añadir más.",
      emptyLoading: "Cargando…",
      empty: "Ningún agente encontrado",
      columns: {
        user: "Usuario",
        status: "Estado",
        mfa: "MFA",
        profile: "Perfil",
        created: "Creado",
        lastLogin: "Última conexión"
      },
      range: "{start}–{end} de {total}"
    },
    impersonation: {
      action: "Suplantar",
      actionTitle: "Iniciar sesión como este agente",
      bannerPrefix: "Has iniciado sesión como",
      fallback: "agente",
      stop: "Salir",
      stopping: "Volviendo…",
      stopError: "No se pudo salir de la suplantación.",
      startError: "No se pudo iniciar la suplantación.",
      started: "Suplantación iniciada",
      stopped: "Has vuelto a tu sesión de administrador",
      selfBlocked: "No puedes suplantar tu propia cuenta."
    },
    profiles: {
      title: "Perfiles de acceso",
      description: "Plantillas de permisos reutilizables con agentes asignados.",
      descriptionCommunity: "Consulte perfiles del sistema. Los perfiles personalizados requieren Veritas Pro.",
      newProfile: "Nuevo perfil",
      createProTitle: "Creación de perfiles · disponible con Veritas Pro",
      searchPlaceholder: "Buscar un perfil…",
      profileCount: "{count} perfil",
      profileCountPlural: "{count} perfiles",
      emptyLoading: "Cargando…",
      empty: "Ningún perfil",
      systemTag: "Sistema",
      inherits: "Hereda de {parent}",
      stats: "{count} agente · MFA: {mfa}/{total}",
      statsPlural: "{count} agentes · MFA: {mfa}/{total}",
      view: "Ver",
      edit: "Editar",
      modalSystemTitle: "Perfil del sistema",
      modalEditTitle: "Modificar perfil",
      modalSubtitle: "Detalles y agentes asignados a este perfil.",
      modalEyebrow: "Perfiles de acceso",
      detailsSection: "Detalles",
      identifierLabel: "Identificador",
      identifierHint: "No modificable tras la creación",
      descriptionLabel: "Descripción",
      descriptionPlaceholder: "Ej. Acceso estándar técnico",
      parentLabel: "Perfil padre",
      assignedAgents: "Agentes asignados",
      assignedCount: "{count} agente",
      assignedCountPlural: "{count} agentes",
      noAgents: "Ningún agente en este perfil.",
      systemSubtitle: "Perfil del sistema Veritas",
      customSubtitle: "Perfil personalizado",
      deleteTitle: "Eliminar este perfil",
      deleteDesc: "Los agentes conservan el acceso hasta reasignarse. Eliminación irreversible.",
      customBadge: "Personalizado",
      assignedColumns: {
        agent: "Agente",
        status: "Estado",
        mfa: "MFA"
      }
    },
    access: {
      title: "Matriz de módulos",
      description: "Módulos accesibles por perfil. Empresa y Contacto siempre activos.",
      descriptionCommunity: "En Community todos los agentes acceden solo a Empresa, Contacto y Soporte.",
      communityHint: "Personalización de permisos reservada a Veritas Pro.",
      legendOn: "Activo",
      legendOff: "Desactivado",
      legendLock: "Bloqueado",
      profileColumn: "Perfil",
      empty: "Ningún perfil",
      toggleCommunityActive: "Siempre activo en Community",
      toggleCommunityInactive: "No disponible en Community",
      toggleLocked: "Siempre activo",
      toggleDisable: "Clic para desactivar",
      toggleEnable: "Clic para activar"
    },
    toast: {
      loadUsersError: "Error al cargar usuarios",
      loadProfilesError: "Error al cargar perfiles",
      invalidEmail: "Dirección de email no válida",
      passwordTooShort: "Contraseña demasiado corta (mínimo 6 caracteres)",
      passwordMismatch: "Las contraseñas no coinciden",
      userCreated: "Usuario creado",
      createFailed: "Creación fallida",
      roleUpdated: "Rol actualizado",
      roleUpdateError: "Error al actualizar rol",
      profileUpdateFailed: "Error al actualizar perfil",
      profileNameRequired: "Nombre de perfil obligatorio",
      profileCreated: "Perfil creado",
      profileCreateFailed: "Error al crear perfil",
      profileDeleted: "Perfil eliminado",
      profileDeleteFailed: "Error al eliminar perfil",
      profileUpdated: "Perfil actualizado",
      profileUpdateFailed2: "Error al actualizar perfil",
      permissionsUpdated: "Permisos actualizados",
      permissionsUpdateFailed: "Error al actualizar permisos",
      mfaReleased: "MFA restablecida para {email}",
      mfaReleaseFailed: "Error al restablecer MFA",
      loadUserError: "Error al cargar usuario",
      selectProfile: "Seleccione un perfil",
      userUpdated: "Usuario actualizado",
      saveError: "Error al guardar",
      agentDeleted: "Agente eliminado",
      deleteFailed: "Eliminación fallida"
    },
    confirm: {
      releaseMfaTitle: "Restablecer MFA",
      releaseMfaMessage: "¿Confirmar restablecimiento MFA para {email}? El agente deberá reconfigurar la autenticación en dos pasos.",
      releaseMfaConfirm: "Restablecer",
      releaseMfaLoading: "Restableciendo…",
      deleteAgentTitle: "Eliminar agente",
      deleteAgentMessage: "¿Confirmar eliminación de {email}? Acción irreversible.",
      deleteProfileTitle: "Eliminar perfil",
      deleteProfileMessage: "¿Confirmar eliminación del perfil « {name} »? Acción irreversible.",
      resetMfaTitle: "Restablecer MFA"
    },
    deleteAgent: {
      self: "No puede eliminar su propia cuenta.",
      lastAdmin: "No se puede eliminar el último administrador.",
      default: "Acción definitiva. El agente perderá inmediatamente el acceso a Veritas.",
      title: "Eliminar este agente"
    }
  }
};
const ACCESS_COLUMN_KEYS = [{
  key: "entreprise",
  accessKey: "contrat_enabled",
  locked: true
}, {
  key: "contact",
  accessKey: "contact_enabled",
  locked: true
}, {
  key: "prestataire",
  accessKey: "prestataire_enabled"
}, {
  key: "tickets",
  accessKey: "tickets_enabled"
}, {
  key: "ticketSales",
  accessKey: "sales_enabled"
}, {
  key: "planning",
  accessKey: "planning_enabled"
}, {
  key: "infrastructure",
  accessKey: "infrastructure_enabled"
}, {
  key: "inventory",
  accessKey: "equipment_inventory_enabled"
}, {
  key: "cybersecurite",
  accessKey: "cybersecurite_enabled"
}, {
  key: "services",
  accessKey: "service_enabled"
}, {
  key: "dashboard",
  accessKey: "dashboard_enabled"
}, {
  key: "documents",
  accessKey: "documents_enabled"
}, {
  key: "knowledgeBase",
  accessKey: "knowledge_base_enabled"
}, {
  key: "rapports",
  accessKey: "monitoring_enabled"
}, {
  key: "administration",
  accessKey: "administration_enabled"
}];
export const getAdminUsersCopy = createLocaleGetter(USERS_COPY);
export function getUserAdminViews(locale, isCommunity = false) {
  const copy = getAdminUsersCopy(locale);
  return [{
    key: "users",
    label: copy.views.users
  }, {
    key: "profiles",
    label: copy.views.profiles,
    proOnly: true
  }, {
    key: "access",
    label: copy.views.access,
    proOnly: true
  }].map(view => ({
    ...view,
    proOnly: isCommunity && view.proOnly
  }));
}
export function getAccessColumns(locale) {
  const labels = getAdminUsersCopy(locale).accessColumns;
  return ACCESS_COLUMN_KEYS.map(col => ({
    ...col,
    label: labels[col.key] || col.key
  }));
}
export function getMfaStatus(user, locale) {
  const mfa = getAdminUsersCopy(locale).mfa;
  if (user?.mfa_enabled) {
    return {
      key: "enabled",
      label: mfa.enabled,
      className: "mfaEnabled",
      icon: "mdi:shield-check"
    };
  }
  if (user?.mfa_pending_setup) {
    return {
      key: "pending",
      label: mfa.pending,
      className: "mfaPending",
      icon: "mdi:shield-sync"
    };
  }
  return {
    key: "off",
    label: mfa.off,
    className: "mfaOff",
    icon: "mdi:shield-off-outline"
  };
}
export { interpolate };
