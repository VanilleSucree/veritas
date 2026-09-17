import { interpolate, pickLocaleMessages } from "../../i18n/translate";
import { getAntispamProvider } from "./antispamFormConfig";
const NAV_ICONS = {
  overview: "mdi:view-list-outline",
  solution: "mdi:email-secure-outline",
  reseller: "mdi:store-cog-outline",
  dedicated: "mdi:shield-key-outline",
  guide: "mdi:book-open-outline",
  manual: "mdi:form-textbox"
};
const ANTISPAM_MODAL_COPY = {
  fr: {
    bcp47: "fr-FR",
    eyebrow: "Cybersécurité",
    title: "Configuration antispam",
    navAria: "Sections de configuration antispam",
    closeAria: "Fermer",
    navDisabledTitle: "Configurez Mailinblack en administration",
    sections: {
      overview: {
        label: "Solution enregistrée",
        description: "Pour ce client"
      },
      solution: {
        label: "Solution paramétrable",
        description: "Fournisseurs"
      },
      reseller: {
        label: "Tenant global",
        descriptionConfigured: "Intégration configurée en administration",
        descriptionNotConfigured: "Non configuré en administration"
      },
      dedicated: {
        label: "Tenant dédié",
        description: "Credentials API propres au client"
      },
      guide: {
        label: "Guide",
        description: "Obtenir une clé API"
      },
      manual: {
        label: "Saisie manuelle",
        description: "Utilisateurs, domaines et expiration"
      }
    },
    solutionPicker: {
      title: "Solution paramétrable",
      description: "Fournisseurs disponibles.",
      connectionTitle: "Connexion {provider}",
      globalDetected: "Intégration globale détectée en administration. Choisissez le tenant global ou un tenant dédié pour ce client.",
      globalNotActive: "Le tenant global n'est pas actif en administration. Utilisez un tenant dédié ou activez l'intégration globale.",
      modeGlobal: {
        title: "Tenant global",
        descConfigured: "Utilise l'intégration configurée en administration.",
        descNotConfigured: "Activez l'intégration en administration pour utiliser le tenant global.",
        actionConfigured: "Configurer",
        actionNotConfigured: "À activer en administration"
      },
      modeDedicated: {
        title: "Tenant dédié",
        description: "Credentials API propres à ce client, indépendants du tenant global.",
        action: "Configurer"
      }
    },
    providerBadges: {
      soon: "Bientôt",
      pro: "Pro",
      global: "Global"
    },
    overview: {
      title: "Solution enregistrée",
      description: "Solutions enregistrées pour ce client.",
      empty: "Aucune solution configurée pour le moment."
    },
    actions: {
      viewData: "Voir les données",
      edit: "Éditer",
      delete: "Supprimer",
      viewAria: "Voir {label}",
      editAria: "Éditer {label}",
      deleteAria: "Supprimer {label}"
    },
    reseller: {
      title: "Mailinblack · tenant global",
      description: "Associez cette entreprise à un client de votre tenant Mailinblack global.",
      globalNotActive: "Le tenant global Mailinblack n'est pas actif. Activez l'intégration en administration ou utilisez un tenant dédié.",
      customerLabel: "Client Mailinblack",
      loadingTitle: "Chargement des clients…",
      loadingHint: "Liste des clients du tenant global.",
      selectPlaceholder: "Sélectionner un client"
    },
    dedicated: {
      title: "Mailinblack · tenant dédié",
      description: "Renseignez les credentials API du client, testez la connexion puis enregistrez la solution. Veritas synchronisera automatiquement les données Mailinblack Protect.",
      apiUrlLabel: "URL API Mailinblack",
      apiKeyLabel: "Auth key",
      apiKeyPlaceholderStored: "Auth key enregistrée · cliquez pour modifier",
      apiKeyPlaceholderNew: "Auth key générée dans Espace manager → Intégration → Clés API",
      apiKeyHint: "Veritas échange Client ID + Auth key contre un token de session.",
      detectedAccountLabel: "Compte détecté",
      clientIdLabel: "Client ID",
      clientIdPlaceholder: "Client ID affiché à la création de la clé",
      apiKeyGuideLink: "Comment obtenir Client ID et Auth key ?"
    },
    loading: "Chargement de la configuration antispam…",
    comingSoonProvider: "La configuration client pour {provider} sera disponible prochainement. Utilisez Mailinblack Protect.",
    comingSoonProviderFallback: "cette solution",
    footer: {
      solutionLabel: "Solution : {provider}",
      solutionsCountOne: "{count} solution configurée",
      solutionsCountMany: "{count} solutions configurées",
      connected: "Connecté",
      error: "Erreur"
    },
    buttons: {
      associateSync: "Associer et synchroniser",
      testConnection: "Tester la connexion",
      saving: "Enregistrement…",
      saveSolution: "Enregistrer la solution"
    },
    modeLabels: {
      dedicated: "Tenant dédié",
      global: "Tenant global",
      manual: "Saisie manuelle",
      unknown: "-"
    },
    manual: {
      title: "Autre solution · saisie manuelle",
      description: "Enregistrez une solution sans connecteur API (utilisateurs, domaines, expiration).",
      solutionName: "Nom de l'antispam",
      solutionNamePlaceholder: "Ex. Proofpoint, Mimecast…",
      utilisateursProteges: "Utilisateurs protégés",
      domainesSurveilles: "Domaines surveillés",
      expiration: "Date d'expiration"
    },
    manualProvider: {
      label: "Autre solution",
      description: "Enregistrement manuel sans synchronisation API."
    },
    solution: {
      fallbackLabel: "Solution antispam",
      defaultCustomerName: "Client Mailinblack",
      defaultProductName: "Mailinblack Protect",
      productFallback: "Antispam"
    },
    meta: {
      userOne: "{count} utilisateur",
      userMany: "{count} utilisateurs",
      domainOne: "{count} domaine",
      domainMany: "{count} domaines"
    },
    proIntegrationFallback: "Cette intégration",
    toasts: {
      loadError: "Erreur lors du chargement de la configuration antispam.",
      loadCustomersError: "Impossible de charger les clients Mailinblack.",
      selectCustomer: "Sélectionnez un client Mailinblack.",
      linkedAndSynced: "Solution antispam liée et synchronisée.",
      saveError: "Erreur lors de l'enregistrement.",
      connectionSuccess: "Connexion Mailinblack réussie.",
      connectionTestFailed: "Échec du test de connexion.",
      apiUrlRequired: "URL API requise.",
      apiKeyRequired: "Auth key requise pour enregistrer la solution.",
      clientIdRequired: "Client ID requis.",
      accountNotFound: "Connexion établie mais compte Mailinblack introuvable. Vérifiez la clé API et les droits Protect/Management.",
      syncFailed: "Synchronisation échouée",
      configUpdated: "Configuration antispam mise à jour.",
      savedAndSynced: "Solution antispam enregistrée et synchronisée.",
      manualSaved: "Solution antispam enregistrée.",
      associationRemoved: "Association antispam supprimée.",
      deleteError: "Erreur lors de la suppression.",
      comingSoon: "{provider} sera bientôt disponible dans Veritas.",
      associationNotFound: "Association antispam introuvable.",
      clientNotFound: "Client introuvable.",
      mailinblackClientNotFound: "Client Mailinblack introuvable.",
      solutionNameRequired: "Indiquez le nom de l'antispam."
    }
  },
  en: {
    bcp47: "en-GB",
    eyebrow: "Cybersecurity",
    title: "Antispam configuration",
    navAria: "Antispam configuration sections",
    closeAria: "Close",
    navDisabledTitle: "Configure Mailinblack in administration",
    sections: {
      overview: {
        label: "Registered solution",
        description: "For this client"
      },
      solution: {
        label: "Configurable solution",
        description: "Providers"
      },
      reseller: {
        label: "Global tenant",
        descriptionConfigured: "Integration configured in administration",
        descriptionNotConfigured: "Not configured in administration"
      },
      dedicated: {
        label: "Dedicated tenant",
        description: "Client-specific API credentials"
      },
      guide: {
        label: "Guide",
        description: "Obtain an API key"
      },
      manual: {
        label: "Manual entry",
        description: "Users, domains and expiration"
      }
    },
    solutionPicker: {
      title: "Configurable solution",
      description: "Available providers.",
      connectionTitle: "Connect {provider}",
      globalDetected: "Global integration detected in administration. Choose the global tenant or a dedicated tenant for this client.",
      globalNotActive: "The global tenant is not active in administration. Use a dedicated tenant or enable the global integration.",
      modeGlobal: {
        title: "Global tenant",
        descConfigured: "Uses the integration configured in administration.",
        descNotConfigured: "Enable the integration in administration to use the global tenant.",
        actionConfigured: "Configure",
        actionNotConfigured: "Enable in administration"
      },
      modeDedicated: {
        title: "Dedicated tenant",
        description: "API credentials specific to this client, independent of the global tenant.",
        action: "Configure"
      }
    },
    providerBadges: {
      soon: "Soon",
      pro: "Pro",
      global: "Global"
    },
    overview: {
      title: "Registered solution",
      description: "Solutions registered for this client.",
      empty: "No solution configured yet."
    },
    actions: {
      viewData: "View data",
      edit: "Edit",
      delete: "Delete",
      viewAria: "View {label}",
      editAria: "Edit {label}",
      deleteAria: "Delete {label}"
    },
    reseller: {
      title: "Mailinblack · global tenant",
      description: "Link this company to a customer in your global Mailinblack tenant.",
      globalNotActive: "The global Mailinblack tenant is not active. Enable the integration in administration or use a dedicated tenant.",
      customerLabel: "Mailinblack customer",
      loadingTitle: "Loading customers…",
      loadingHint: "List of customers from the global tenant.",
      selectPlaceholder: "Select a customer"
    },
    dedicated: {
      title: "Mailinblack · dedicated tenant",
      description: "Enter the client's API credentials, test the connection, then save the solution. Veritas will automatically sync Mailinblack Protect data.",
      apiUrlLabel: "Mailinblack API URL",
      apiKeyLabel: "Auth key",
      apiKeyPlaceholderStored: "Key saved · click to edit",
      apiKeyPlaceholderNew: "Auth key generated in Manager space → Integration → API keys",
      apiKeyHint: "Veritas exchanges Client ID + Auth key for a session token.",
      detectedAccountLabel: "Detected account",
      clientIdLabel: "Client ID",
      clientIdPlaceholder: "Client ID shown when the key is created",
      apiKeyGuideLink: "How to get Client ID and Auth key?"
    },
    loading: "Loading antispam configuration…",
    comingSoonProvider: "Client configuration for {provider} will be available soon. Use Mailinblack Protect.",
    comingSoonProviderFallback: "this solution",
    footer: {
      solutionLabel: "Solution: {provider}",
      solutionsCountOne: "{count} configured solution",
      solutionsCountMany: "{count} configured solutions",
      connected: "Connected",
      error: "Error"
    },
    buttons: {
      associateSync: "Link and sync",
      testConnection: "Test connection",
      saving: "Saving…",
      saveSolution: "Save solution"
    },
    modeLabels: {
      dedicated: "Dedicated tenant",
      global: "Global tenant",
      manual: "Manual entry",
      unknown: "-"
    },
    manual: {
      title: "Other solution · manual entry",
      description: "Record a solution without an API connector (users, domains, expiration).",
      solutionName: "Antispam name",
      solutionNamePlaceholder: "E.g. Proofpoint, Mimecast…",
      utilisateursProteges: "Protected users",
      domainesSurveilles: "Monitored domains",
      expiration: "Expiration date"
    },
    manualProvider: {
      label: "Other solution",
      description: "Manual entry without API sync."
    },
    solution: {
      fallbackLabel: "Antispam solution",
      defaultCustomerName: "Mailinblack",
      defaultProductName: "Mailinblack Protect",
      productFallback: "Antispam"
    },
    meta: {
      userOne: "{count} user",
      userMany: "{count} users",
      domainOne: "{count} domain",
      domainMany: "{count} domains"
    },
    proIntegrationFallback: "This integration",
    toasts: {
      loadError: "Error loading antispam configuration.",
      loadCustomersError: "Unable to load Mailinblack customers.",
      selectCustomer: "Select a Mailinblack customer.",
      linkedAndSynced: "Antispam solution linked and synced.",
      saveError: "Error while saving.",
      connectionSuccess: "Mailinblack connection successful.",
      connectionTestFailed: "Connection test failed.",
      apiUrlRequired: "API URL required.",
      apiKeyRequired: "Auth key required to save the solution.",
      clientIdRequired: "Client ID required.",
      accountNotFound: "Connection established but Mailinblack account not found. Check the API key and Protect/Management permissions.",
      syncFailed: "Synchronization failed",
      configUpdated: "Antispam configuration updated.",
      savedAndSynced: "Antispam solution saved and synced.",
      manualSaved: "Antispam solution saved.",
      associationRemoved: "Antispam association removed.",
      deleteError: "Error while deleting.",
      comingSoon: "{provider} will be available in Veritas soon.",
      associationNotFound: "Antispam association not found.",
      clientNotFound: "Client not found.",
      mailinblackClientNotFound: "Mailinblack customer not found.",
      solutionNameRequired: "Enter the antispam name."
    }
  },
  de: {
    bcp47: "de-DE",
    eyebrow: "Cybersicherheit",
    title: "Antispam-Konfiguration",
    navAria: "Antispam-Konfigurationsbereiche",
    closeAria: "Schließen",
    navDisabledTitle: "Mailinblack in der Administration konfigurieren",
    sections: {
      overview: {
        label: "Registrierte Lösung",
        description: "Für diesen Kunden"
      },
      solution: {
        label: "Konfigurierbare Lösung",
        description: "Anbieter"
      },
      reseller: {
        label: "Globaler Tenant",
        descriptionConfigured: "Integration in der Administration konfiguriert",
        descriptionNotConfigured: "In der Administration nicht konfiguriert"
      },
      dedicated: {
        label: "Dedizierter Tenant",
        description: "Kundenspezifische API-Zugangsdaten"
      },
      guide: {
        label: "Anleitung",
        description: "API-Schlüssel erhalten"
      },
      manual: {
        label: "Manuelle Eingabe",
        description: "Benutzer, Domains und Ablauf"
      }
    },
    solutionPicker: {
      title: "Konfigurierbare Lösung",
      description: "Verfügbare Anbieter.",
      connectionTitle: "Verbindung {provider}",
      globalDetected: "Globale Integration in der Administration erkannt. Wählen Sie den globalen Tenant oder einen dedizierten Tenant für diesen Kunden.",
      globalNotActive: "Der globale Tenant ist in der Administration nicht aktiv. Verwenden Sie einen dedizierten Tenant oder aktivieren Sie die globale Integration.",
      modeGlobal: {
        title: "Globaler Tenant",
        descConfigured: "Nutzt die in der Administration konfigurierte Integration.",
        descNotConfigured: "Aktivieren Sie die Integration in der Administration, um den globalen Tenant zu nutzen.",
        actionConfigured: "Konfigurieren",
        actionNotConfigured: "In der Administration aktivieren"
      },
      modeDedicated: {
        title: "Dedizierter Tenant",
        description: "API-Zugangsdaten speziell für diesen Kunden, unabhängig vom globalen Tenant.",
        action: "Konfigurieren"
      }
    },
    providerBadges: {
      soon: "Demnächst",
      pro: "Pro",
      global: "Global"
    },
    overview: {
      title: "Registrierte Lösung",
      description: "Für diesen Kunden registrierte Lösungen.",
      empty: "Noch keine Lösung konfiguriert."
    },
    actions: {
      viewData: "Daten anzeigen",
      edit: "Bearbeiten",
      delete: "Löschen",
      viewAria: "{label} anzeigen",
      editAria: "{label} bearbeiten",
      deleteAria: "{label} löschen"
    },
    reseller: {
      title: "Mailinblack · globaler Tenant",
      description: "Verknüpfen Sie dieses Unternehmen mit einem Kunden Ihres globalen Mailinblack-Tenants.",
      globalNotActive: "Der globale Mailinblack-Tenant ist nicht aktiv. Aktivieren Sie die Integration in der Administration oder verwenden Sie einen dedizierten Tenant.",
      customerLabel: "Mailinblack-Kunde",
      loadingTitle: "Kunden werden geladen…",
      loadingHint: "Liste der Kunden des globalen Tenants.",
      selectPlaceholder: "Kunden auswählen"
    },
    dedicated: {
      title: "Mailinblack · dedizierter Tenant",
      description: "Geben Sie die API-Zugangsdaten des Kunden ein, testen Sie die Verbindung und speichern Sie die Lösung. Veritas synchronisiert automatisch die Mailinblack-Protect-Daten.",
      apiUrlLabel: "Mailinblack-API-URL",
      apiKeyLabel: "API-Schlüssel",
      apiKeyPlaceholderStored: "Schlüssel gespeichert · zum Bearbeiten klicken",
      apiKeyPlaceholderNew: "Schlüssel erstellt in Manager-Bereich → Integration → API-Schlüssel",
      apiKeyHint: "Veritas tauscht diesen Schlüssel automatisch gegen ein Sitzungstoken.",
      detectedAccountLabel: "Erkanntes Konto",
      clientIdLabel: "Client-ID",
      apiKeyGuideLink: "Wie erhält man den API-Schlüssel?"
    },
    loading: "Antispam-Konfiguration wird geladen…",
    comingSoonProvider: "Die Kundenkonfiguration für {provider} wird demnächst verfügbar sein. Verwenden Sie Mailinblack Protect.",
    comingSoonProviderFallback: "diese Lösung",
    footer: {
      solutionLabel: "Lösung: {provider}",
      solutionsCountOne: "{count} konfigurierte Lösung",
      solutionsCountMany: "{count} konfigurierte Lösungen",
      connected: "Verbunden",
      error: "Fehler"
    },
    buttons: {
      associateSync: "Verknüpfen und synchronisieren",
      testConnection: "Verbindung testen",
      saving: "Speichern…",
      saveSolution: "Lösung speichern"
    },
    modeLabels: {
      dedicated: "Dedizierter Tenant",
      global: "Globaler Tenant",
      manual: "Manuelle Eingabe",
      unknown: "-"
    },
    manual: {
      title: "Andere Lösung · manuelle Eingabe",
      description: "Erfassen Sie eine Lösung ohne API-Connector (Benutzer, Domains, Ablauf).",
      solutionName: "Name der Antispam-Lösung",
      solutionNamePlaceholder: "z. B. Proofpoint, Mimecast…",
      utilisateursProteges: "Geschützte Benutzer",
      domainesSurveilles: "Überwachte Domains",
      expiration: "Ablaufdatum"
    },
    manualProvider: {
      label: "Andere Lösung",
      description: "Manuelle Erfassung ohne API-Synchronisation."
    },
    solution: {
      fallbackLabel: "Antispam-Lösung",
      defaultCustomerName: "Mailinblack-Kunde",
      defaultProductName: "Mailinblack Protect",
      productFallback: "Antispam"
    },
    meta: {
      userOne: "{count} Benutzer",
      userMany: "{count} Benutzer",
      domainOne: "{count} Domäne",
      domainMany: "{count} Domänen"
    },
    proIntegrationFallback: "Diese Integration",
    toasts: {
      loadError: "Fehler beim Laden der Antispam-Konfiguration.",
      loadCustomersError: "Mailinblack-Kunden konnten nicht geladen werden.",
      selectCustomer: "Wählen Sie einen Mailinblack-Kunden.",
      linkedAndSynced: "Antispam-Lösung verknüpft und synchronisiert.",
      saveError: "Fehler beim Speichern.",
      connectionSuccess: "Mailinblack-Verbindung erfolgreich.",
      connectionTestFailed: "Verbindungstest fehlgeschlagen.",
      apiUrlRequired: "API-URL erforderlich.",
      apiKeyRequired: "API-Schlüssel erforderlich, um die Lösung zu speichern.",
      accountNotFound: "Verbindung hergestellt, aber Mailinblack-Konto nicht gefunden. Überprüfen Sie den API-Schlüssel und die Protect/Management-Berechtigungen.",
      syncFailed: "Synchronisation fehlgeschlagen",
      configUpdated: "Antispam-Konfiguration aktualisiert.",
      savedAndSynced: "Antispam-Lösung gespeichert und synchronisiert.",
      manualSaved: "Antispam-Lösung gespeichert.",
      associationRemoved: "Antispam-Verknüpfung entfernt.",
      deleteError: "Fehler beim Löschen.",
      comingSoon: "{provider} wird demnächst in Veritas verfügbar sein.",
      associationNotFound: "Antispam-Verknüpfung nicht gefunden.",
      clientNotFound: "Kunde nicht gefunden.",
      mailinblackClientNotFound: "Mailinblack-Kunde nicht gefunden.",
      solutionNameRequired: "Geben Sie den Namen der Antispam-Lösung an."
    }
  },
  it: {
    bcp47: "it-IT",
    eyebrow: "Cybersicurezza",
    title: "Configurazione antispam",
    navAria: "Sezioni configurazione antispam",
    closeAria: "Chiudi",
    navDisabledTitle: "Configura Mailinblack nell'amministrazione",
    sections: {
      overview: {
        label: "Soluzione registrata",
        description: "Per questo cliente"
      },
      solution: {
        label: "Soluzione configurabile",
        description: "Fornitori"
      },
      reseller: {
        label: "Tenant globale",
        descriptionConfigured: "Integrazione configurata in amministrazione",
        descriptionNotConfigured: "Non configurato in amministrazione"
      },
      dedicated: {
        label: "Tenant dedicato",
        description: "Credenziali API specifiche del cliente"
      },
      guide: {
        label: "Guida",
        description: "Ottenere una chiave API"
      },
      manual: {
        label: "Inserimento manuale",
        description: "Utenti, domini e scadenza"
      }
    },
    solutionPicker: {
      title: "Soluzione configurabile",
      description: "Fornitori disponibili.",
      connectionTitle: "Connessione {provider}",
      globalDetected: "Integrazione globale rilevata in amministrazione. Scegli il tenant globale o un tenant dedicato per questo cliente.",
      globalNotActive: "Il tenant globale non è attivo in amministrazione. Usa un tenant dedicato o attiva l'integrazione globale.",
      modeGlobal: {
        title: "Tenant globale",
        descConfigured: "Utilizza l'integrazione configurata in amministrazione.",
        descNotConfigured: "Attiva l'integrazione in amministrazione per usare il tenant globale.",
        actionConfigured: "Configura",
        actionNotConfigured: "Da attivare in amministrazione"
      },
      modeDedicated: {
        title: "Tenant dedicato",
        description: "Credenziali API specifiche di questo cliente, indipendenti dal tenant globale.",
        action: "Configura"
      }
    },
    providerBadges: {
      soon: "Presto",
      pro: "Pro",
      global: "Globale"
    },
    overview: {
      title: "Soluzione registrata",
      description: "Soluzioni registrate per questo cliente.",
      empty: "Nessuna soluzione configurata al momento."
    },
    actions: {
      viewData: "Vedi dati",
      edit: "Modifica",
      delete: "Elimina",
      viewAria: "Vedi {label}",
      editAria: "Modifica {label}",
      deleteAria: "Elimina {label}"
    },
    reseller: {
      title: "Mailinblack · tenant globale",
      description: "Associa questa azienda a un cliente del tuo tenant Mailinblack globale.",
      globalNotActive: "Il tenant globale Mailinblack non è attivo. Attiva l'integrazione in amministrazione o usa un tenant dedicato.",
      customerLabel: "Cliente Mailinblack",
      loadingTitle: "Caricamento clienti…",
      loadingHint: "Elenco dei clienti del tenant globale.",
      selectPlaceholder: "Seleziona un cliente"
    },
    dedicated: {
      title: "Mailinblack · tenant dedicato",
      description: "Inserisci le credenziali API del cliente, testa la connessione e salva la soluzione. Veritas sincronizzerà automaticamente i dati Mailinblack Protect.",
      apiUrlLabel: "URL API Mailinblack",
      apiKeyLabel: "Chiave API",
      apiKeyPlaceholderStored: "Chiave salvata · clicca per modificare",
      apiKeyPlaceholderNew: "Chiave generata in Spazio manager → Integrazione → Chiavi API",
      apiKeyHint: "Veritas scambia automaticamente questa chiave con un token di sessione.",
      detectedAccountLabel: "Account rilevato",
      clientIdLabel: "Client ID",
      apiKeyGuideLink: "Come ottenere la chiave API?"
    },
    loading: "Caricamento configurazione antispam…",
    comingSoonProvider: "La configurazione cliente per {provider} sarà disponibile a breve. Usa Mailinblack Protect.",
    comingSoonProviderFallback: "questa soluzione",
    footer: {
      solutionLabel: "Soluzione: {provider}",
      solutionsCountOne: "{count} soluzione configurata",
      solutionsCountMany: "{count} soluzioni configurate",
      connected: "Connesso",
      error: "Errore"
    },
    buttons: {
      associateSync: "Associa e sincronizza",
      testConnection: "Testa connessione",
      saving: "Salvataggio…",
      saveSolution: "Salva soluzione"
    },
    modeLabels: {
      dedicated: "Tenant dedicato",
      global: "Tenant globale",
      manual: "Inserimento manuale",
      unknown: "-"
    },
    manual: {
      title: "Altra soluzione · inserimento manuale",
      description: "Registra una soluzione senza connettore API (utenti, domini, scadenza).",
      solutionName: "Nome antispam",
      solutionNamePlaceholder: "Es. Proofpoint, Mimecast…",
      utilisateursProteges: "Utenti protetti",
      domainesSurveilles: "Domini monitorati",
      expiration: "Data di scadenza"
    },
    manualProvider: {
      label: "Altra soluzione",
      description: "Registrazione manuale senza sincronizzazione API."
    },
    solution: {
      fallbackLabel: "Soluzione antispam",
      defaultCustomerName: "Cliente Mailinblack",
      defaultProductName: "Mailinblack Protect",
      productFallback: "Antispam"
    },
    meta: {
      userOne: "{count} utente",
      userMany: "{count} utenti",
      domainOne: "{count} dominio",
      domainMany: "{count} domini"
    },
    proIntegrationFallback: "Questa integrazione",
    toasts: {
      loadError: "Errore durante il caricamento della configurazione antispam.",
      loadCustomersError: "Impossibile caricare i clienti Mailinblack.",
      selectCustomer: "Seleziona un cliente Mailinblack.",
      linkedAndSynced: "Soluzione antispam associata e sincronizzata.",
      saveError: "Errore durante il salvataggio.",
      connectionSuccess: "Connessione Mailinblack riuscita.",
      connectionTestFailed: "Test di connessione fallito.",
      apiUrlRequired: "URL API obbligatorio.",
      apiKeyRequired: "Chiave API obbligatoria per salvare la soluzione.",
      accountNotFound: "Connessione stabilita ma account Mailinblack non trovato. Verifica la chiave API e i permessi Protect/Management.",
      syncFailed: "Sincronizzazione fallita",
      configUpdated: "Configurazione antispam aggiornata.",
      savedAndSynced: "Soluzione antispam salvata e sincronizzata.",
      manualSaved: "Soluzione antispam salvata.",
      associationRemoved: "Associazione antispam rimossa.",
      deleteError: "Errore durante l'eliminazione.",
      comingSoon: "{provider} sarà presto disponibile in Veritas.",
      associationNotFound: "Associazione antispam non trovata.",
      clientNotFound: "Cliente non trovato.",
      mailinblackClientNotFound: "Cliente Mailinblack non trovato.",
      solutionNameRequired: "Indicare il nome dell'antispam."
    }
  },
  es: {
    bcp47: "es-ES",
    eyebrow: "Ciberseguridad",
    title: "Configuración antispam",
    navAria: "Secciones de configuración antispam",
    closeAria: "Cerrar",
    navDisabledTitle: "Configure Mailinblack en administración",
    sections: {
      overview: {
        label: "Solución registrada",
        description: "Para este cliente"
      },
      solution: {
        label: "Solución configurable",
        description: "Proveedores"
      },
      reseller: {
        label: "Tenant global",
        descriptionConfigured: "Integración configurada en administración",
        descriptionNotConfigured: "No configurado en administración"
      },
      dedicated: {
        label: "Tenant dedicado",
        description: "Credenciales API propias del cliente"
      },
      guide: {
        label: "Guía",
        description: "Obtener una clave API"
      },
      manual: {
        label: "Entrada manual",
        description: "Usuarios, dominios y vencimiento"
      }
    },
    solutionPicker: {
      title: "Solución configurable",
      description: "Proveedores disponibles.",
      connectionTitle: "Conexión {provider}",
      globalDetected: "Integración global detectada en administración. Elija el tenant global o un tenant dedicado para este cliente.",
      globalNotActive: "El tenant global no está activo en administración. Use un tenant dedicado o active la integración global.",
      modeGlobal: {
        title: "Tenant global",
        descConfigured: "Utiliza la integración configurada en administración.",
        descNotConfigured: "Active la integración en administración para usar el tenant global.",
        actionConfigured: "Configurar",
        actionNotConfigured: "Activar en administración"
      },
      modeDedicated: {
        title: "Tenant dedicado",
        description: "Credenciales API propias de este cliente, independientes del tenant global.",
        action: "Configurar"
      }
    },
    providerBadges: {
      soon: "Pronto",
      pro: "Pro",
      global: "Global"
    },
    overview: {
      title: "Solución registrada",
      description: "Soluciones registradas para este cliente.",
      empty: "Ninguna solución configurada por el momento."
    },
    actions: {
      viewData: "Ver datos",
      edit: "Editar",
      delete: "Eliminar",
      viewAria: "Ver {label}",
      editAria: "Editar {label}",
      deleteAria: "Eliminar {label}"
    },
    reseller: {
      title: "Mailinblack · tenant global",
      description: "Asocie esta empresa a un cliente de su tenant Mailinblack global.",
      globalNotActive: "El tenant global Mailinblack no está activo. Active la integración en administración o use un tenant dedicado.",
      customerLabel: "Cliente Mailinblack",
      loadingTitle: "Cargando clientes…",
      loadingHint: "Lista de clientes del tenant global.",
      selectPlaceholder: "Seleccionar un cliente"
    },
    dedicated: {
      title: "Mailinblack · tenant dedicado",
      description: "Introduzca las credenciales API del cliente, pruebe la conexión y guarde la solución. Veritas sincronizará automáticamente los datos de Mailinblack Protect.",
      apiUrlLabel: "URL API Mailinblack",
      apiKeyLabel: "Clave API",
      apiKeyPlaceholderStored: "Clave guardada · haga clic para modificar",
      apiKeyPlaceholderNew: "Clave generada en Espacio manager → Integración → Claves API",
      apiKeyHint: "Veritas intercambia automáticamente esta clave por un token de sesión.",
      detectedAccountLabel: "Cuenta detectada",
      clientIdLabel: "Client ID",
      apiKeyGuideLink: "¿Cómo obtener la clave API?"
    },
    loading: "Cargando configuración antispam…",
    comingSoonProvider: "La configuración de cliente para {provider} estará disponible próximamente. Use Mailinblack Protect.",
    comingSoonProviderFallback: "esta solución",
    footer: {
      solutionLabel: "Solución: {provider}",
      solutionsCountOne: "{count} solución configurada",
      solutionsCountMany: "{count} soluciones configuradas",
      connected: "Conectado",
      error: "Error"
    },
    buttons: {
      associateSync: "Asociar y sincronizar",
      testConnection: "Probar conexión",
      saving: "Guardando…",
      saveSolution: "Guardar solución"
    },
    modeLabels: {
      dedicated: "Tenant dedicado",
      global: "Tenant global",
      manual: "Entrada manual",
      unknown: "-"
    },
    manual: {
      title: "Otra solución · entrada manual",
      description: "Registre una solución sin conector API (usuarios, dominios, vencimiento).",
      solutionName: "Nombre del antispam",
      solutionNamePlaceholder: "Ej. Proofpoint, Mimecast…",
      utilisateursProteges: "Usuarios protegidos",
      domainesSurveilles: "Dominios supervisados",
      expiration: "Fecha de vencimiento"
    },
    manualProvider: {
      label: "Otra solución",
      description: "Registro manual sin sincronización API."
    },
    solution: {
      fallbackLabel: "Solución antispam",
      defaultCustomerName: "Cliente Mailinblack",
      defaultProductName: "Mailinblack Protect",
      productFallback: "Antispam"
    },
    meta: {
      userOne: "{count} usuario",
      userMany: "{count} usuarios",
      domainOne: "{count} dominio",
      domainMany: "{count} dominios"
    },
    proIntegrationFallback: "Esta integración",
    toasts: {
      loadError: "Error al cargar la configuración antispam.",
      loadCustomersError: "No se pudieron cargar los clientes Mailinblack.",
      selectCustomer: "Seleccione un cliente Mailinblack.",
      linkedAndSynced: "Solución antispam vinculada y sincronizada.",
      saveError: "Error al guardar.",
      connectionSuccess: "Conexión Mailinblack correcta.",
      connectionTestFailed: "Error en la prueba de conexión.",
      apiUrlRequired: "URL API obligatoria.",
      apiKeyRequired: "Clave API obligatoria para guardar la solución.",
      accountNotFound: "Conexión establecida pero cuenta Mailinblack no encontrada. Verifique la clave API y los permisos Protect/Management.",
      syncFailed: "Sincronización fallida",
      configUpdated: "Configuración antispam actualizada.",
      savedAndSynced: "Solución antispam guardada y sincronizada.",
      manualSaved: "Solución antispam guardada.",
      associationRemoved: "Asociación antispam eliminada.",
      deleteError: "Error al eliminar.",
      comingSoon: "{provider} estará disponible en Veritas próximamente.",
      associationNotFound: "Asociación antispam no encontrada.",
      clientNotFound: "Cliente no encontrado.",
      mailinblackClientNotFound: "Cliente Mailinblack no encontrado.",
      solutionNameRequired: "Indique el nombre del antispam."
    }
  }
};
function resolveModeLabel(t, solution) {
  const mode = solution?.mappingMode || (solution?.mailinblackTenantId ? "dedicated" : "reseller");
  if (mode === "manual" || solution?.isManual || solution?.providerId === "manual") {
    return t.modeLabels.manual;
  }
  if (mode === "dedicated") return t.modeLabels.dedicated;
  if (solution?.customerId) return t.modeLabels.global;
  return t.modeLabels.unknown;
}
export function getAntispamModalCopy(locale) {
  const t = pickLocaleMessages(ANTISPAM_MODAL_COPY, locale);
  return {
    ...t,
    badges: t.providerBadges,
    modeLabels: t.modeLabels,
    getModeLabel: solution => resolveModeLabel(t, solution),
    navSections: ({
      selectedProviderId,
      globalConfigured = false,
      visibleTenantMode = null
    }) => {
      const sections = [{
        id: "overview",
        icon: NAV_ICONS.overview,
        label: t.sections.overview.label,
        description: t.sections.overview.description
      }, {
        id: "solution",
        icon: NAV_ICONS.solution,
        label: t.sections.solution.label,
        description: t.sections.solution.description
      }];
      const provider = getAntispamProvider(selectedProviderId);
      if (selectedProviderId && provider?.supportsDedicated) {
        if (visibleTenantMode === "reseller") {
          sections.push({
            id: "reseller",
            icon: NAV_ICONS.reseller,
            label: t.sections.reseller.label,
            description: globalConfigured ? t.sections.reseller.descriptionConfigured : t.sections.reseller.descriptionNotConfigured,
            disabled: !globalConfigured
          });
        } else if (visibleTenantMode === "dedicated") {
          sections.push({
            id: "dedicated",
            icon: NAV_ICONS.dedicated,
            label: t.sections.dedicated.label,
            description: t.sections.dedicated.description
          });
          if (selectedProviderId === "mailinblack") {
            sections.push({
              id: "guide",
              icon: NAV_ICONS.guide,
              label: t.sections.guide.label,
              description: t.sections.guide.description
            });
          }
        }
      } else if (selectedProviderId === "manual") {
        sections.push({
          id: "manual",
          icon: NAV_ICONS.manual,
          label: t.sections.manual.label,
          description: t.sections.manual.description
        });
      }
      return sections;
    },
    formatConnectionTitle: providerLabel => interpolate(t.solutionPicker.connectionTitle, {
      provider: providerLabel
    }),
    formatComingSoonProvider: providerLabel => interpolate(t.comingSoonProvider, {
      provider: providerLabel || t.comingSoonProviderFallback
    }),
    formatComingSoonToast: providerLabel => interpolate(t.toasts.comingSoon, {
      provider: providerLabel
    }),
    formatActionAria: (template, label) => interpolate(template, {
      label
    }),
    formatFooterSolution: providerLabel => interpolate(t.footer.solutionLabel, {
      provider: providerLabel
    }),
    formatFooterSolutionsCount: count => {
      const template = count > 1 ? t.footer.solutionsCountMany : t.footer.solutionsCountOne;
      return interpolate(template, {
        count: String(count)
      });
    },
    formatConnectionStatus: status => status === "success" ? t.footer.connected : t.footer.error,
    formatUsersCount: users => {
      const count = Number(users);
      const template = count > 1 ? t.meta.userMany : t.meta.userOne;
      return interpolate(template, {
        count: String(users)
      });
    },
    formatDomainsCount: domains => {
      const count = Number(domains);
      const template = count > 1 ? t.meta.domainMany : t.meta.domainOne;
      return interpolate(template, {
        count: String(domains)
      });
    }
  };
}
