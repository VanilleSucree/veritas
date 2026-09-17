import { createLocaleGetter } from "../../i18n/translate";
export const ADMIN_NAV_STRUCTURE = [{
  id: "general",
  items: [{
    key: "general",
    icon: "mdi:cog-outline"
  }, {
    key: "login-branding",
    icon: "mdi:palette-outline"
  }, {
    key: "reports",
    icon: "mdi:file-document-outline"
  }, {
    key: "tech-news-feeds",
    icon: "mdi:rss"
  }]
}, {
  id: "organization",
  items: [{
    key: "users",
    icon: "mdi:account-group-outline"
  }, {
    key: "permissions",
    icon: "mdi:shield-key-outline"
  }, {
    key: "teams",
    icon: "mdi:account-multiple-outline"
  }, {
    key: "planning",
    icon: "mdi:calendar-clock-outline"
  }]
}, {
  id: "clients",
  items: [{
    key: "clients",
    icon: "mdi:office-building-outline"
  }, {
    key: "client-portal",
    icon: "mdi:monitor-dashboard"
  }, {
    key: "support-credits",
    icon: "mdi:ticket-confirmation-outline"
  }, {
    key: "sla",
    icon: "mdi:timer-cog-outline"
  }, {
    key: "nav-client-config",
    icon: "mdi:tune-variant",
    children: [{
      key: "contract-modules"
    }, {
      key: "equipment-families"
    }, {
      key: "infrastructure-map"
    }]
  }]
}, {
  id: "tickets",
  items: [{
    key: "tickets",
    icon: "mdi:ticket-outline"
  }, {
    key: "service-settings",
    icon: "mdi:briefcase-edit-outline"
  }, {
    key: "mail-collect",
    icon: "mdi:email-outline"
  }]
}, {
  id: "notifications",
  items: [{
    key: "notifications",
    icon: "mdi:bell-badge-outline"
  }]
}, {
  id: "operations",
  items: [{
    key: "injection",
    icon: "mdi:database-import-outline"
  }, {
    key: "equipment-purge",
    icon: "mdi:delete-sweep-outline"
  }, {
    key: "maintenance",
    icon: "mdi:bullhorn-outline"
  }]
}, {
  id: "platform",
  items: [{
    key: "rmm",
    icon: "mdi:laptop-account"
  }, {
    key: "supervision-alert-rules",
    icon: "mdi:bell-cog-outline"
  }, {
    key: "integrations",
    icon: "mdi:link-variant"
  }, {
    key: "ai",
    icon: "mdi:robot-outline"
  }]
}, {
  id: "account",
  items: [{
    key: "license",
    icon: "mdi:key-variant"
  }]
}];
const ADMIN_PANEL_COPY = {
  fr: {
    sections: {
      general: "Général",
      organization: "Organisation",
      clients: "Clients",
      tickets: "Tickets",
      notifications: "Notifications",
      operations: "Exploitation",
      platform: "Plateforme",
      account: "Compte"
    },
    items: {
      general: {
        label: "Paramètres généraux",
        description: "Langue, fuseau horaire et apparence"
      },
      "login-branding": {
        label: "Page de connexion",
        description: "Logo, couleurs et textes agent / client"
      },
      reports: {
        label: "Rapports",
        description: "Identité, contacts et réseaux sociaux des exports"
      },
      "tech-news-feeds": {
        label: "Flux actualités",
        description: "Sources RSS affichées à l'accueil"
      },
      users: {
        label: "Agents",
        description: "Comptes et profils d'accès"
      },
      permissions: {
        label: "Permissions",
        description: "Droits d’action par profil"
      },
      teams: {
        label: "Équipes",
        description: "Groupes d'agents pour tickets et planning"
      },
      planning: {
        label: "Planning",
        description: "Types d'événements du calendrier"
      },
      clients: {
        label: "Fiches entreprise",
        description: "Liste et gestion des clients"
      },
      "client-portal": {
        label: "Accès portail client",
        description: "Comptes du portail self-service"
      },
      "support-credits": {
        label: "Carnets tickets",
        description: "Crédits support prépayés par client"
      },
      sla: {
        label: "SLA",
        description: "Mode de calcul, horaires et activation par entreprise"
      },
      "nav-client-config": {
        label: "Configuration fiche",
        description: "Contenu affiché sur les fiches client"
      },
      "contract-modules": {
        label: "Options contrat",
        description: "Modules visibles sur la fiche"
      },
      "equipment-families": {
        label: "Familles matériel",
        description: "Types d'équipements et champs"
      },
      "infrastructure-map": {
        label: "Cartographie",
        description: "Position des hexagones sur la fiche"
      },
      tickets: {
        label: "Paramètres support",
        description: "Templates, macros, solutions, formulaires, catégories et vues"
      },
      "service-settings": {
        label: "Paramètres services",
        description: "Formulaires ventes et vues Services & installations"
      },
      "mail-collect": {
        label: "Collecte mail",
        description: "Boîtes mail et tri des emails entrants"
      },
      notifications: {
        label: "Notifications",
        description: "In-app, email, intégrations, templates et journal d'envoi"
      },
      maintenance: {
        label: "Message de maintenance",
        description: "Bandeau affiché aux utilisateurs"
      },
      injection: {
        label: "Injection de données",
        description: "Import CSV en masse (entreprises, contacts, documents…)"
      },
      "equipment-purge": {
        label: "Purge équipements",
        description: "Suppression en masse multi-entreprises"
      },
      rmm: {
        label: "RMM · Agents",
        description: "Postes supervisés et enrôlement"
      },
      "supervision-alert-rules": {
        label: "Règles d’alerte",
        description: "Critères par type de périphérique (CheckMK, RMM…)"
      },
      integrations: {
        label: "Intégrations",
        description: "Connecteurs et synchronisations"
      },
      ai: {
        label: "IA · Copilote",
        description: "Quotas, fonctionnalités et journal d'usage"
      },
      license: {
        label: "Licence Pro",
        description: "Activation et abonnement Veritas"
      }
    },
    searchPlaceholder: "Rechercher un menu…",
    clearSearch: "Effacer la recherche",
    noResults: "Aucun menu ne correspond à « {query} ».",
    adminSubtitle: "Administration",
    accessDenied: "Accès réservé aux administrateurs."
  },
  en: {
    sections: {
      general: "General",
      organization: "Organization",
      clients: "Clients",
      tickets: "Tickets",
      notifications: "Notifications",
      operations: "Operations",
      platform: "Platform",
      account: "Account"
    },
    items: {
      general: {
        label: "General settings",
        description: "Language, timezone, and appearance"
      },
      "login-branding": {
        label: "Login page",
        description: "Logo, colors, and agent / client copy"
      },
      reports: {
        label: "Reports",
        description: "Identity, contacts, and social links for exports"
      },
      "tech-news-feeds": {
        label: "News feeds",
        description: "RSS sources shown on the home page"
      },
      users: {
        label: "Agents",
        description: "Accounts and access profiles"
      },
      permissions: {
        label: "Permissions",
        description: "Action rights per profile"
      },
      teams: {
        label: "Teams",
        description: "Agent groups for tickets and scheduling"
      },
      planning: {
        label: "Scheduling",
        description: "Calendar event types"
      },
      clients: {
        label: "Company records",
        description: "Client list and management"
      },
      "client-portal": {
        label: "Client portal access",
        description: "Self-service portal accounts"
      },
      "support-credits": {
        label: "Ticket packs",
        description: "Prepaid support credits per client"
      },
      sla: {
        label: "SLA",
        description: "Calculation mode, hours and per-enterprise activation"
      },
      "nav-client-config": {
        label: "Record configuration",
        description: "Content shown on client records"
      },
      "contract-modules": {
        label: "Contract options",
        description: "Modules visible on the record"
      },
      "equipment-families": {
        label: "Equipment families",
        description: "Equipment types and fields"
      },
      "infrastructure-map": {
        label: "Mapping",
        description: "Hexagon positions on the record"
      },
      tickets: {
        label: "Support settings",
        description: "Templates, macros, solutions, forms, categories, and views"
      },
      "service-settings": {
        label: "Service settings",
        description: "Sales forms and Services & installations views"
      },
      "mail-collect": {
        label: "Mail collection",
        description: "Mailboxes and inbound email routing"
      },
      notifications: {
        label: "Notifications",
        description: "In-app, email, integrations, templates and delivery log"
      },
      maintenance: {
        label: "Maintenance message",
        description: "Banner shown to users"
      },
      injection: {
        label: "Data injection",
        description: "Bulk CSV import (companies, contacts, documents…)"
      },
      "equipment-purge": {
        label: "Equipment purge",
        description: "Bulk delete across companies"
      },
      rmm: {
        label: "RMM · Agents",
        description: "Supervised endpoints and enrollment"
      },
      "supervision-alert-rules": {
        label: "Alert rules",
        description: "Native alert criteria (CheckMK, RMM…)"
      },
      integrations: {
        label: "Integrations",
        description: "Connectors and synchronizations"
      },
      ai: {
        label: "AI · Copilot",
        description: "Quotas, features and usage journal"
      },
      license: {
        label: "Pro license",
        description: "Veritas activation and subscription"
      }
    },
    searchPlaceholder: "Search menu…",
    clearSearch: "Clear search",
    noResults: "No menu matches « {query} ».",
    adminSubtitle: "Administration",
    accessDenied: "Access restricted to administrators."
  },
  de: {
    sections: {
      general: "Allgemein",
      organization: "Organisation",
      clients: "Kunden",
      tickets: "Tickets",
      notifications: "Benachrichtigungen",
      operations: "Betrieb",
      platform: "Plattform",
      account: "Konto"
    },
    items: {
      general: {
        label: "Allgemeine Einstellungen",
        description: "Sprache, Zeitzone und Darstellung"
      },
      "login-branding": {
        label: "Anmeldeseite",
        description: "Logo, Farben und Texte Agent / Kunde"
      },
      reports: {
        label: "Berichte",
        description: "Identität, Kontakte und soziale Netzwerke der Exporte"
      },
      "tech-news-feeds": {
        label: "Nachrichten-Feeds",
        description: "RSS-Quellen auf der Startseite"
      },
      users: {
        label: "Agenten",
        description: "Konten und Zugriffsprofile"
      },
      permissions: {
        label: "Berechtigungen",
        description: "Aktionsrechte pro Profil"
      },
      teams: {
        label: "Teams",
        description: "Agentengruppen für Tickets und Planung"
      },
      planning: {
        label: "Planung",
        description: "Ereignistypen im Kalender"
      },
      clients: {
        label: "Unternehmensakten",
        description: "Kundenliste und Verwaltung"
      },
      "client-portal": {
        label: "Kundenportal-Zugang",
        description: "Self-Service-Portal-Konten"
      },
      "support-credits": {
        label: "Ticket-Pakete",
        description: "Prepaid-Support-Guthaben pro Kunde"
      },
      sla: {
        label: "SLA",
        description: "Berechnungsmodus, Öffnungszeiten und Aktivierung pro Unternehmen"
      },
      "nav-client-config": {
        label: "Akten-Konfiguration",
        description: "Inhalt auf Kundenakten"
      },
      "contract-modules": {
        label: "Vertragsoptionen",
        description: "Auf der Akte sichtbare Module"
      },
      "equipment-families": {
        label: "Gerätefamilien",
        description: "Gerätetypen und Felder"
      },
      "infrastructure-map": {
        label: "Karte",
        description: "Position der Sechsecke auf der Akte"
      },
      tickets: {
        label: "Support-Einstellungen",
        description: "Vorlagen, Makros, Lösungen, Formulare, Kategorien und Ansichten"
      },
      "service-settings": {
        label: "Service-Einstellungen",
        description: "Vertriebsformulare und Ansichten für Leistungen & Installationen"
      },
      "mail-collect": {
        label: "Mail-Sammlung",
        description: "Postfächer und eingehende E-Mails"
      },
      "notifications-inapp": {
        label: "In-App-Benachrichtigungen",
        description: "Sidebar-Glocke und Alerts bei zugewiesenen Tickets"
      },
      notifications: {
        label: "Benachrichtigungen",
        description: "In-App, automatische Ereignisse und Webhooks"
      },
      maintenance: {
        label: "Wartungsnachricht",
        description: "Banner für Benutzer"
      },
      injection: {
        label: "Datenimport",
        description: "Massen-CSV-Import (Unternehmen, Kontakte, Dokumente…)"
      },
      "equipment-purge": {
        label: "Gerätebereinigung",
        description: "Massenlöschung über mehrere Unternehmen"
      },
      rmm: {
        label: "RMM · Agenten",
        description: "Überwachte Endpunkte und Enrollment"
      },
      "supervision-alert-rules": {
        label: "Alarmregeln",
        description: "Kriterien für native Alarme (CheckMK, RMM…)"
      },
      integrations: {
        label: "Integrationen",
        description: "Connectoren und Synchronisationen"
      },
      ai: {
        label: "KI · Copilot",
        description: "Kontingente, Funktionen und Nutzungsprotokoll"
      },
      license: {
        label: "Pro-Lizenz",
        description: "Veritas-Aktivierung und Abonnement"
      }
    },
    searchPlaceholder: "Menü suchen…",
    clearSearch: "Suche löschen",
    noResults: "Kein Menü entspricht « {query} ».",
    adminSubtitle: "Administration",
    accessDenied: "Zugang nur für Administratoren."
  },
  it: {
    sections: {
      general: "Generale",
      organization: "Organizzazione",
      clients: "Clienti",
      tickets: "Ticket",
      notifications: "Notifiche",
      operations: "Operazioni",
      platform: "Piattaforma",
      account: "Account"
    },
    items: {
      general: {
        label: "Impostazioni generali",
        description: "Lingua, fuso orario e aspetto"
      },
      "login-branding": {
        label: "Pagina di accesso",
        description: "Logo, colori e testi agente / cliente"
      },
      reports: {
        label: "Rapporti",
        description: "Identità, contatti e social degli export"
      },
      "tech-news-feeds": {
        label: "Feed notizie",
        description: "Fonti RSS mostrate in home"
      },
      users: {
        label: "Agenti",
        description: "Account e profili di accesso"
      },
      permissions: {
        label: "Permessi",
        description: "Diritti di azione per profilo"
      },
      teams: {
        label: "Team",
        description: "Gruppi di agenti per ticket e pianificazione"
      },
      planning: {
        label: "Planning",
        description: "Tipi di evento del calendario"
      },
      clients: {
        label: "Schede azienda",
        description: "Elenco e gestione clienti"
      },
      "client-portal": {
        label: "Accesso portale clienti",
        description: "Account del portale self-service"
      },
      "support-credits": {
        label: "Carnet ticket",
        description: "Crediti supporto prepagati per cliente"
      },
      sla: {
        label: "SLA",
        description: "Modalità di calcolo, orari e attivazione per azienda"
      },
      "nav-client-config": {
        label: "Configurazione scheda",
        description: "Contenuto mostrato sulle schede cliente"
      },
      "contract-modules": {
        label: "Opzioni contratto",
        description: "Moduli visibili sulla scheda"
      },
      "equipment-families": {
        label: "Famiglie hardware",
        description: "Tipi di equipaggiamento e campi"
      },
      "infrastructure-map": {
        label: "Mappa",
        description: "Posizione degli esagoni sulla scheda"
      },
      tickets: {
        label: "Impostazioni supporto",
        description: "Template, macro, soluzioni, moduli, categorie e viste"
      },
      "service-settings": {
        label: "Impostazioni servizi",
        description: "Moduli vendite e viste Servizi e installazioni"
      },
      "mail-collect": {
        label: "Raccolta mail",
        description: "Caselle e smistamento email in entrata"
      },
      "notifications-inapp": {
        label: "Notifiche in-app",
        description: "Campanella sidebar e alert sui ticket assegnati"
      },
      notifications: {
        label: "Notifiche",
        description: "In-app, eventi automatici e webhook"
      },
      maintenance: {
        label: "Messaggio di manutenzione",
        description: "Banner mostrato agli utenti"
      },
      injection: {
        label: "Iniezione dati",
        description: "Import CSV di massa (aziende, contatti, documenti…)"
      },
      "equipment-purge": {
        label: "Pulizia apparecchiature",
        description: "Eliminazione di massa multi-azienda"
      },
      rmm: {
        label: "RMM · Agenti",
        description: "Postazioni supervisionate e enrollment"
      },
      "supervision-alert-rules": {
        label: "Regole avvisi",
        description: "Criteri avvisi nativi (CheckMK, RMM…)"
      },
      integrations: {
        label: "Integrazioni",
        description: "Connettori e sincronizzazioni"
      },
      ai: {
        label: "IA · Copilota",
        description: "Quote, funzionalità e diario d'uso"
      },
      license: {
        label: "Licenza Pro",
        description: "Attivazione e abbonamento Veritas"
      }
    },
    searchPlaceholder: "Cerca un menu…",
    clearSearch: "Cancella ricerca",
    noResults: "Nessun menu corrisponde a « {query} ».",
    adminSubtitle: "Amministrazione",
    accessDenied: "Accesso riservato agli amministratori."
  },
  es: {
    sections: {
      general: "General",
      organization: "Organización",
      clients: "Clientes",
      tickets: "Tickets",
      notifications: "Notificaciones",
      operations: "Operaciones",
      platform: "Plataforma",
      account: "Cuenta"
    },
    items: {
      general: {
        label: "Ajustes generales",
        description: "Idioma, zona horaria y apariencia"
      },
      "login-branding": {
        label: "Página de inicio de sesión",
        description: "Logo, colores y textos agente / cliente"
      },
      reports: {
        label: "Informes",
        description: "Identidad, contactos y redes sociales de los exports"
      },
      "tech-news-feeds": {
        label: "Fuentes de noticias",
        description: "Fuentes RSS en la página de inicio"
      },
      users: {
        label: "Agentes",
        description: "Cuentas y perfiles de acceso"
      },
      permissions: {
        label: "Permisos",
        description: "Derechos de acción por perfil"
      },
      teams: {
        label: "Equipos",
        description: "Grupos de agentes para tickets y planificación"
      },
      planning: {
        label: "Planning",
        description: "Tipos de evento del calendario"
      },
      clients: {
        label: "Fichas de empresa",
        description: "Lista y gestión de clientes"
      },
      "client-portal": {
        label: "Acceso portal cliente",
        description: "Cuentas del portal self-service"
      },
      "support-credits": {
        label: "Carnets de tickets",
        description: "Créditos de soporte prepagados por cliente"
      },
      sla: {
        label: "SLA",
        description: "Modo de cálculo, horarios y activación por empresa"
      },
      "nav-client-config": {
        label: "Configuración de ficha",
        description: "Contenido mostrado en las fichas cliente"
      },
      "contract-modules": {
        label: "Opciones de contrato",
        description: "Módulos visibles en la ficha"
      },
      "equipment-families": {
        label: "Familias de hardware",
        description: "Tipos de equipos y campos"
      },
      "infrastructure-map": {
        label: "Cartografía",
        description: "Posición de los hexágonos en la ficha"
      },
      tickets: {
        label: "Ajustes de soporte",
        description: "Plantillas, macros, soluciones, formularios, categorías y vistas"
      },
      "service-settings": {
        label: "Ajustes de servicios",
        description: "Formularios de ventas y vistas Servicios e instalaciones"
      },
      "mail-collect": {
        label: "Recogida de correo",
        description: "Buzones y clasificación de emails entrantes"
      },
      "notifications-inapp": {
        label: "Notificaciones in-app",
        description: "Campana sidebar y alertas en tickets asignados"
      },
      notifications: {
        label: "Notificaciones",
        description: "In-app, eventos automáticos y webhooks"
      },
      maintenance: {
        label: "Mensaje de mantenimiento",
        description: "Banner mostrado a los usuarios"
      },
      injection: {
        label: "Inyección de datos",
        description: "Importación CSV masiva (empresas, contactos, documentos…)"
      },
      "equipment-purge": {
        label: "Purga de equipos",
        description: "Eliminación masiva multi-empresa"
      },
      rmm: {
        label: "RMM · Agentes",
        description: "Equipos supervisados y enrolamiento"
      },
      "supervision-alert-rules": {
        label: "Reglas de alerta",
        description: "Criterios de alertas nativas (CheckMK, RMM…)"
      },
      integrations: {
        label: "Integraciones",
        description: "Conectores y sincronizaciones"
      },
      ai: {
        label: "IA · Copiloto",
        description: "Cuotas, funciones y diario de uso"
      },
      license: {
        label: "Licencia Pro",
        description: "Activación y suscripción Veritas"
      }
    },
    searchPlaceholder: "Buscar un menú…",
    clearSearch: "Borrar búsqueda",
    noResults: "Ningún menú coincide con « {query} ».",
    adminSubtitle: "Administración",
    accessDenied: "Acceso reservado a administradores."
  }
};
export const getAdminPanelCopy = createLocaleGetter(ADMIN_PANEL_COPY);
function localizeNavItem(item, copy) {
  const meta = copy.items[item.key] || {
    label: item.key,
    description: ""
  };
  const localized = {
    ...item,
    label: meta.label,
    description: meta.description
  };
  if (item.children) {
    localized.children = item.children.map(child => localizeNavItem(child, copy));
  }
  return localized;
}
export function buildAdminNavSections(locale) {
  const copy = getAdminPanelCopy(locale);
  return ADMIN_NAV_STRUCTURE.map(section => ({
    title: copy.sections[section.id],
    items: section.items.map(item => localizeNavItem(item, copy))
  }));
}
export function findParentGroupKey(tabKey) {
  for (const section of ADMIN_NAV_STRUCTURE) {
    for (const item of section.items) {
      if (item.children?.some(child => child.key === tabKey)) {
        return item.key;
      }
    }
  }
  return null;
}
export function flattenNavItems(items) {
  return items.flatMap(item => item.children ? item.children : [item]);
}
