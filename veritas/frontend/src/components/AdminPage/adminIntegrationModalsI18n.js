import { createLocaleGetter, interpolate, pickLocaleMessages } from "../../i18n/translate";
const SHARED = {
  fr: {
    eyebrow: "Intégration",
    close: "Fermer",
    closeAria: "Fermer",
    cancel: "Annuler",
    save: "Enregistrer",
    saving: "Enregistrement…",
    testConnection: "Tester la connexion",
    testing: "Test en cours…",
    integrationActive: "Intégration active",
    integrationInactive: "Intégration inactive",
    testResultTitle: "Résultat du test",
    connectionSuccess: "Connexion réussie",
    connectionFailed: "Connexion échouée",
    apiUnreachable: "Impossible de joindre l'API.",
    testSuccessShort: "Test réussi",
    checkUrlAndKey: "Vérifiez l'URL et la clé API",
    sections: {
      connection: {
        label: "Connexion",
        description: "URL et clé API"
      },
      guide: {
        label: "Guide",
        description: "Obtenir une clé API"
      },
      info: {
        label: "Informations",
        description: "APIs et usage"
      }
    },
    testNavAria: "Sections du résultat de test",
    configNavAria: "Sections de configuration",
    summary: "Synthèse",
    summaryDesc: "Résultat et connexion",
    name: "Nom",
    domain: "Domaine",
    users: "Utilisateurs",
    companies: "Entreprises",
    accounts: "Comptes",
    companySingular: "{count} société",
    companyPlural: "{count} sociétés",
    accountSingular: "{count} compte",
    accountPlural: "{count} comptes",
    connectionDetails: "Détails de connexion",
    apiUrl: "URL API",
    apiKey: "Clé API",
    testedAt: "Testé le",
    licensesFirstCompany: "Licences (1ʳᵉ société)",
    licenseExpiration: "Expiration {date}",
    partialDetails: "Détails partiels",
    licenseLabel: "Licence",
    companiesDetected: "Entreprises détectées ({count})",
    companiesDetectedDesc: "Sociétés accessibles avec les credentials testés.",
    identifier: "Identifiant",
    country: "Pays",
    accountsTitle: "Comptes ({shown}{total})",
    accountsDesc: "Utilisateurs rattachés aux sociétés GravityZone.",
    email: "E-mail",
    company: "Entreprise",
    role: "Rôle",
    on: " sur {count}",
    apiCredentials: "Identifiants API",
    howToGetCredentials: "Comment obtenir l'URL et la clé API ?",
    fillApiKeyBeforeTest: "Renseignez la clé API avant de tester."
  },
  en: {
    eyebrow: "Integration",
    close: "Close",
    closeAria: "Close",
    cancel: "Cancel",
    save: "Save",
    saving: "Saving…",
    testConnection: "Test connection",
    testing: "Testing…",
    integrationActive: "Integration active",
    integrationInactive: "Integration inactive",
    testResultTitle: "Test result",
    connectionSuccess: "Connection successful",
    connectionFailed: "Connection failed",
    apiUnreachable: "Unable to reach the API.",
    testSuccessShort: "Test successful",
    checkUrlAndKey: "Check the URL and API key",
    sections: {
      connection: {
        label: "Connection",
        description: "URL and API key"
      },
      guide: {
        label: "Guide",
        description: "Get an API key"
      },
      info: {
        label: "Information",
        description: "APIs and usage"
      }
    },
    testNavAria: "Test result sections",
    configNavAria: "Configuration sections",
    summary: "Summary",
    summaryDesc: "Result and connection",
    name: "Name",
    domain: "Domain",
    users: "Users",
    companies: "Companies",
    accounts: "Accounts",
    companySingular: "{count} company",
    companyPlural: "{count} companies",
    accountSingular: "{count} account",
    accountPlural: "{count} accounts",
    connectionDetails: "Connection details",
    apiUrl: "API URL",
    apiKey: "API key",
    testedAt: "Tested on",
    licensesFirstCompany: "Licenses (1st company)",
    licenseExpiration: "Expires {date}",
    partialDetails: "Partial details",
    licenseLabel: "License",
    companiesDetected: "Companies detected ({count})",
    companiesDetectedDesc: "Companies accessible with the tested credentials.",
    identifier: "Identifier",
    country: "Country",
    accountsTitle: "Accounts ({shown}{total})",
    accountsDesc: "Users linked to GravityZone companies.",
    email: "Email",
    company: "Company",
    role: "Role",
    on: " of {count}",
    apiCredentials: "API credentials",
    howToGetCredentials: "How to get the URL and API key?",
    fillApiKeyBeforeTest: "Enter the API key before testing."
  },
  de: {
    eyebrow: "Integration",
    close: "Schließen",
    closeAria: "Schließen",
    cancel: "Abbrechen",
    save: "Speichern",
    saving: "Speichern…",
    testConnection: "Verbindung testen",
    testing: "Test läuft…",
    integrationActive: "Integration aktiv",
    integrationInactive: "Integration inaktiv",
    testResultTitle: "Testergebnis",
    connectionSuccess: "Verbindung erfolgreich",
    connectionFailed: "Verbindung fehlgeschlagen",
    apiUnreachable: "API nicht erreichbar.",
    testSuccessShort: "Test erfolgreich",
    checkUrlAndKey: "URL und API-Schlüssel prüfen",
    sections: {
      connection: {
        label: "Verbindung",
        description: "URL und API-Schlüssel"
      },
      guide: {
        label: "Anleitung",
        description: "API-Schlüssel erhalten"
      },
      info: {
        label: "Informationen",
        description: "APIs und Nutzung"
      }
    },
    testNavAria: "Abschnitte des Testergebnisses",
    configNavAria: "Konfigurationsabschnitte",
    summary: "Zusammenfassung",
    summaryDesc: "Ergebnis und Verbindung",
    name: "Name",
    domain: "Domain",
    users: "Benutzer",
    companies: "Unternehmen",
    accounts: "Konten",
    companySingular: "{count} Unternehmen",
    companyPlural: "{count} Unternehmen",
    accountSingular: "{count} Konto",
    accountPlural: "{count} Konten",
    connectionDetails: "Verbindungsdetails",
    apiUrl: "API-URL",
    apiKey: "API-Schlüssel",
    testedAt: "Getestet am",
    licensesFirstCompany: "Lizenzen (1. Unternehmen)",
    licenseExpiration: "Ablauf {date}",
    partialDetails: "Teilweise Details",
    licenseLabel: "Lizenz",
    companiesDetected: "Erkannte Unternehmen ({count})",
    companiesDetectedDesc: "Mit den getesteten Zugangsdaten erreichbare Unternehmen.",
    identifier: "Kennung",
    country: "Land",
    accountsTitle: "Konten ({shown}{total})",
    accountsDesc: "Benutzer, die GravityZone-Unternehmen zugeordnet sind.",
    email: "E-Mail",
    company: "Unternehmen",
    role: "Rolle",
    on: " von {count}",
    apiCredentials: "API-Zugangsdaten",
    howToGetCredentials: "Wie erhält man URL und API-Schlüssel?",
    fillApiKeyBeforeTest: "Geben Sie den API-Schlüssel ein, bevor Sie testen."
  },
  it: {
    eyebrow: "Integrazione",
    close: "Chiudi",
    closeAria: "Chiudi",
    cancel: "Annulla",
    save: "Salva",
    saving: "Salvataggio…",
    testConnection: "Testa connessione",
    testing: "Test in corso…",
    integrationActive: "Integrazione attiva",
    integrationInactive: "Integrazione inattiva",
    testResultTitle: "Risultato del test",
    connectionSuccess: "Connessione riuscita",
    connectionFailed: "Connessione fallita",
    apiUnreachable: "Impossibile raggiungere l'API.",
    testSuccessShort: "Test riuscito",
    checkUrlAndKey: "Verifica URL e chiave API",
    sections: {
      connection: {
        label: "Connessione",
        description: "URL e chiave API"
      },
      guide: {
        label: "Guida",
        description: "Ottenere una chiave API"
      },
      info: {
        label: "Informazioni",
        description: "API e utilizzo"
      }
    },
    testNavAria: "Sezioni del risultato del test",
    configNavAria: "Sezioni di configurazione",
    summary: "Sintesi",
    summaryDesc: "Risultato e connessione",
    name: "Nome",
    domain: "Dominio",
    users: "Utenti",
    companies: "Aziende",
    accounts: "Account",
    companySingular: "{count} azienda",
    companyPlural: "{count} aziende",
    accountSingular: "{count} account",
    accountPlural: "{count} account",
    connectionDetails: "Dettagli connessione",
    apiUrl: "URL API",
    apiKey: "Chiave API",
    testedAt: "Testato il",
    licensesFirstCompany: "Licenze (1ª azienda)",
    licenseExpiration: "Scadenza {date}",
    partialDetails: "Dettagli parziali",
    licenseLabel: "Licenza",
    companiesDetected: "Aziende rilevate ({count})",
    companiesDetectedDesc: "Aziende accessibili con le credenziali testate.",
    identifier: "Identificativo",
    country: "Paese",
    accountsTitle: "Account ({shown}{total})",
    accountsDesc: "Utenti collegati alle aziende GravityZone.",
    email: "Email",
    company: "Azienda",
    role: "Ruolo",
    on: " su {count}",
    apiCredentials: "Credenziali API",
    howToGetCredentials: "Come ottenere URL e chiave API?",
    fillApiKeyBeforeTest: "Inserisci la chiave API prima di testare."
  },
  es: {
    eyebrow: "Integración",
    close: "Cerrar",
    closeAria: "Cerrar",
    cancel: "Cancelar",
    save: "Guardar",
    saving: "Guardando…",
    testConnection: "Probar conexión",
    testing: "Prueba en curso…",
    integrationActive: "Integración activa",
    integrationInactive: "Integración inactiva",
    testResultTitle: "Resultado de la prueba",
    connectionSuccess: "Conexión exitosa",
    connectionFailed: "Conexión fallida",
    apiUnreachable: "No se puede contactar con la API.",
    testSuccessShort: "Prueba exitosa",
    checkUrlAndKey: "Verifique la URL y la clave API",
    sections: {
      connection: {
        label: "Conexión",
        description: "URL y clave API"
      },
      guide: {
        label: "Guía",
        description: "Obtener una clave API"
      },
      info: {
        label: "Información",
        description: "APIs y uso"
      }
    },
    testNavAria: "Secciones del resultado de la prueba",
    configNavAria: "Secciones de configuración",
    summary: "Resumen",
    summaryDesc: "Resultado y conexión",
    name: "Nombre",
    domain: "Dominio",
    users: "Usuarios",
    companies: "Empresas",
    accounts: "Cuentas",
    companySingular: "{count} empresa",
    companyPlural: "{count} empresas",
    accountSingular: "{count} cuenta",
    accountPlural: "{count} cuentas",
    connectionDetails: "Detalles de conexión",
    apiUrl: "URL API",
    apiKey: "Clave API",
    testedAt: "Probado el",
    licensesFirstCompany: "Licencias (1ª empresa)",
    licenseExpiration: "Caduca {date}",
    partialDetails: "Detalles parciales",
    licenseLabel: "Licencia",
    companiesDetected: "Empresas detectadas ({count})",
    companiesDetectedDesc: "Empresas accesibles con las credenciales probadas.",
    identifier: "Identificador",
    country: "País",
    accountsTitle: "Cuentas ({shown}{total})",
    accountsDesc: "Usuarios vinculados a empresas GravityZone.",
    email: "Correo",
    company: "Empresa",
    role: "Rol",
    on: " de {count}",
    apiCredentials: "Credenciales API",
    howToGetCredentials: "¿Cómo obtener la URL y la clave API?",
    fillApiKeyBeforeTest: "Introduzca la clave API antes de probar."
  }
};
const BITDEFENDER = {
  fr: {
    title: "Bitdefender GravityZone",
    subtitle: "Configuration du tenant global",
    configNavAria: "Sections de configuration GravityZone",
    connectionDesc: "Ces paramètres définissent le tenant global GravityZone utilisé en mode revendeur sur toutes les entreprises Veritas.",
    footerActive: "Tenant global actif",
    footerInactive: "Tenant global inactif",
    testSubtitleSuccess: "Connexion GravityZone établie",
    testSubtitleFail: "Échec de la connexion",
    testApiSuccess: "L'API GravityZone a répondu correctement.",
    guideTitle: "Obtenir vos identifiants API",
    guideDesc: "Suivez ces étapes dans le Control Center GravityZone pour créer une clé API et récupérer l'URL d'accès à renseigner dans Veritas.",
    guideSteps: [{
      title: "Connectez-vous à GravityZone",
      desc: "Ouvrez le portail cloudgz.gravityzone.bitdefender.com avec un compte disposant des droits d'administration sur le tenant."
    }, {
      title: "Accédez à la section API",
      desc: "Menu utilisateur (en haut à droite) → Mon compte → section API du Control Center."
    }, {
      title: "Créez une clé API",
      desc: "Cliquez sur Ajouter pour générer une nouvelle clé. Activez les droits nécessaires (entreprises, comptes, licences, réseau) puis copiez la clé affichée · elle ne sera plus visible ensuite."
    }, {
      title: "Récupérez l'URL d'accès",
      desc: "Sur la même page, copiez l'URL d'accès API et collez-la dans le champ URL API de Veritas, avec la clé obtenue à l'étape précédente."
    }],
    infoTitle: "À propos de cette intégration",
    infoDesc: "Inventaire des entreprises et postes GravityZone. Le tenant global sert au mode revendeur sur les fiches entreprise ; chaque client peut aussi avoir des tenants dédiés.",
    infoApisTitle: "APIs GravityZone utilisées par Veritas",
    infoApis: ["Entreprises · liste et détails des sociétés", "Comptes · utilisateurs et rattachement aux sociétés", "Mode de licence · quotas et expiration", "Réseau · inventaire des postes", "Politiques et rapports · consultation partielle"],
    infoFooter: "Créez une clé API dans GravityZone avec les droits ci-dessus, puis testez la connexion avant d'enregistrer. Le test utilise les valeurs saisies dans le formulaire, sans sauvegarde préalable.",
    sections: {
      connection: {
        description: "URL et clé API"
      },
      guide: {
        description: "Obtenir une clé API"
      },
      info: {
        description: "APIs et usage"
      }
    }
  },
  en: {
    title: "Bitdefender GravityZone",
    subtitle: "Global tenant configuration",
    configNavAria: "GravityZone configuration sections",
    connectionDesc: "These settings define the global GravityZone tenant used in reseller mode across all Veritas companies.",
    footerActive: "Global tenant active",
    footerInactive: "Global tenant inactive",
    testSubtitleSuccess: "GravityZone connection established",
    testSubtitleFail: "Connection failed",
    testApiSuccess: "The GravityZone API responded correctly.",
    guideTitle: "Get your API credentials",
    guideDesc: "Follow these steps in the GravityZone Control Center to create an API key and retrieve the access URL to enter in Veritas.",
    guideSteps: [{
      title: "Sign in to GravityZone",
      desc: "Open cloudgz.gravityzone.bitdefender.com with an account that has administration rights on the tenant."
    }, {
      title: "Go to the API section",
      desc: "User menu (top right) → My account → API section in the Control Center."
    }, {
      title: "Create an API key",
      desc: "Click Add to generate a new key. Enable the required permissions (companies, accounts, licenses, network) then copy the displayed key · it will not be shown again."
    }, {
      title: "Retrieve the access URL",
      desc: "On the same page, copy the API access URL and paste it into the Veritas API URL field, along with the key from the previous step."
    }],
    infoTitle: "About this integration",
    infoDesc: "GravityZone company and endpoint inventory. The global tenant supports reseller mode on company records; each client can also have dedicated tenants.",
    infoApisTitle: "GravityZone APIs used by Veritas",
    infoApis: ["Companies · list and details of organizations", "Accounts · users and company assignments", "License mode · quotas and expiration", "Network · endpoint inventory", "Policies and reports · partial read access"],
    infoFooter: "Create an API key in GravityZone with the permissions above, then test the connection before saving. The test uses the values entered in the form, without prior save.",
    sections: {
      connection: {
        description: "URL and API key"
      },
      guide: {
        description: "Get an API key"
      },
      info: {
        description: "APIs and usage"
      }
    }
  },
  de: {
    title: "Bitdefender GravityZone",
    subtitle: "Globale Tenant-Konfiguration",
    configNavAria: "GravityZone-Konfigurationsabschnitte",
    connectionDesc: "Diese Einstellungen definieren den globalen GravityZone-Tenant im Reseller-Modus für alle Veritas-Unternehmen.",
    footerActive: "Globaler Tenant aktiv",
    footerInactive: "Globaler Tenant inaktiv",
    testSubtitleSuccess: "GravityZone-Verbindung hergestellt",
    testSubtitleFail: "Verbindung fehlgeschlagen",
    testApiSuccess: "Die GravityZone-API hat korrekt geantwortet.",
    guideTitle: "API-Zugangsdaten erhalten",
    guideDesc: "Folgen Sie diesen Schritten im GravityZone Control Center, um einen API-Schlüssel zu erstellen und die Zugangs-URL für Veritas abzurufen.",
    guideSteps: [{
      title: "Bei GravityZone anmelden",
      desc: "Öffnen Sie cloudgz.gravityzone.bitdefender.com mit einem Konto, das Administratorrechte auf dem Tenant hat."
    }, {
      title: "Zum API-Bereich gehen",
      desc: "Benutzermenü (oben rechts) → Mein Konto → API-Bereich im Control Center."
    }, {
      title: "API-Schlüssel erstellen",
      desc: "Klicken Sie auf Hinzufügen, aktivieren Sie die erforderlichen Rechte und kopieren Sie den angezeigten Schlüssel · er wird danach nicht mehr angezeigt."
    }, {
      title: "Zugangs-URL abrufen",
      desc: "Kopieren Sie auf derselben Seite die API-Zugangs-URL und fügen Sie sie zusammen mit dem Schlüssel in Veritas ein."
    }],
    infoTitle: "Über diese Integration",
    infoDesc: "GravityZone-Inventar von Unternehmen und Endpoints. Der globale Tenant dient dem Reseller-Modus; jeder Kunde kann auch eigene Tenants haben.",
    infoApisTitle: "Von Veritas genutzte GravityZone-APIs",
    infoApis: ["Unternehmen · Liste und Details", "Konten · Benutzer und Zuordnungen", "Lizenzmodus · Kontingente und Ablauf", "Netzwerk · Endpoint-Inventar", "Richtlinien und Berichte · teilweiser Lesezugriff"],
    infoFooter: "Erstellen Sie einen API-Schlüssel mit den obigen Rechten, testen Sie die Verbindung vor dem Speichern. Der Test verwendet die eingegebenen Werte ohne vorheriges Speichern.",
    sections: {
      connection: {
        description: "URL und API-Schlüssel"
      },
      guide: {
        description: "API-Schlüssel erhalten"
      },
      info: {
        description: "APIs und Nutzung"
      }
    }
  },
  it: {
    title: "Bitdefender GravityZone",
    subtitle: "Configurazione tenant globale",
    configNavAria: "Sezioni di configurazione GravityZone",
    connectionDesc: "Questi parametri definiscono il tenant globale GravityZone in modalità rivenditore per tutte le aziende Veritas.",
    footerActive: "Tenant globale attivo",
    footerInactive: "Tenant globale inattivo",
    testSubtitleSuccess: "Connessione GravityZone stabilita",
    testSubtitleFail: "Connessione fallita",
    testApiSuccess: "L'API GravityZone ha risposto correttamente.",
    guideTitle: "Ottenere le credenziali API",
    guideDesc: "Seguite questi passaggi nel Control Center GravityZone per creare una chiave API e recuperare l'URL di accesso da inserire in Veritas.",
    guideSteps: [{
      title: "Accedere a GravityZone",
      desc: "Aprire cloudgz.gravityzone.bitdefender.com con un account con diritti di amministrazione sul tenant."
    }, {
      title: "Accedere alla sezione API",
      desc: "Menu utente (in alto a destra) → Il mio account → sezione API del Control Center."
    }, {
      title: "Creare una chiave API",
      desc: "Cliccare su Aggiungi, attivare i permessi necessari e copiare la chiave visualizzata · non sarà più visibile in seguito."
    }, {
      title: "Recuperare l'URL di accesso",
      desc: "Nella stessa pagina, copiare l'URL di accesso API e incollarlo nel campo URL API di Veritas con la chiave ottenuta."
    }],
    infoTitle: "Informazioni su questa integrazione",
    infoDesc: "Inventario aziende e endpoint GravityZone. Il tenant globale supporta la modalità rivenditore; ogni cliente può avere tenant dedicati.",
    infoApisTitle: "API GravityZone usate da Veritas",
    infoApis: ["Aziende · elenco e dettagli", "Account · utenti e assegnazioni", "Modalità licenza · quote e scadenza", "Rete · inventario endpoint", "Policy e report · accesso in lettura parziale"],
    infoFooter: "Create una chiave API in GravityZone con i permessi sopra, testate la connessione prima di salvare. Il test usa i valori inseriti nel modulo, senza salvataggio preliminare.",
    sections: {
      connection: {
        description: "URL e chiave API"
      },
      guide: {
        description: "Ottenere una chiave API"
      },
      info: {
        description: "API e utilizzo"
      }
    }
  },
  es: {
    title: "Bitdefender GravityZone",
    subtitle: "Configuración del tenant global",
    configNavAria: "Secciones de configuración GravityZone",
    connectionDesc: "Estos parámetros definen el tenant global GravityZone en modo revendedor para todas las empresas Veritas.",
    footerActive: "Tenant global activo",
    footerInactive: "Tenant global inactivo",
    testSubtitleSuccess: "Conexión GravityZone establecida",
    testSubtitleFail: "Conexión fallida",
    testApiSuccess: "La API GravityZone respondió correctamente.",
    guideTitle: "Obtener credenciales API",
    guideDesc: "Siga estos pasos en el Control Center GravityZone para crear una clave API y recuperar la URL de acceso para Veritas.",
    guideSteps: [{
      title: "Iniciar sesión en GravityZone",
      desc: "Abra cloudgz.gravityzone.bitdefender.com con una cuenta con derechos de administración en el tenant."
    }, {
      title: "Ir a la sección API",
      desc: "Menú de usuario (arriba a la derecha) → Mi cuenta → sección API del Control Center."
    }, {
      title: "Crear una clave API",
      desc: "Haga clic en Añadir, active los permisos necesarios y copie la clave mostrada · no volverá a mostrarse."
    }, {
      title: "Recuperar la URL de acceso",
      desc: "En la misma página, copie la URL de acceso API y péguela en el campo URL API de Veritas con la clave obtenida."
    }],
    infoTitle: "Acerca de esta integración",
    infoDesc: "Inventario de empresas y endpoints GravityZone. El tenant global sirve al modo revendedor; cada cliente puede tener tenants dedicados.",
    infoApisTitle: "APIs GravityZone usadas por Veritas",
    infoApis: ["Empresas · lista y detalles", "Cuentas · usuarios y asignaciones", "Modo de licencia · cuotas y caducidad", "Red · inventario de endpoints", "Políticas e informes · acceso parcial de lectura"],
    infoFooter: "Cree una clave API en GravityZone con los permisos anteriores, pruebe la conexión antes de guardar. La prueba usa los valores del formulario sin guardado previo.",
    sections: {
      connection: {
        description: "URL y clave API"
      },
      guide: {
        description: "Obtener una clave API"
      },
      info: {
        description: "APIs y uso"
      }
    }
  }
};
const MAILINBLACK = {
  fr: {
    title: "Mailinblack Protect",
    subtitle: "Configuration du tenant global partenaire",
    configNavAria: "Sections Mailinblack",
    sections: {
      connection: {
        description: "URL, Client ID et Auth key"
      },
      info: {
        description: "Module Protect"
      }
    },
    connectionDesc: "Renseignez le Client ID et l'Auth key fournis à la création de la clé API Mailinblack.",
    apiUrlHint: "Clé créée dans un tenant client : https://app.mailinblack.com/mibc-fr-XX. Clé partenaire : https://partner.mailinblack.com.",
    clientId: "Client ID",
    clientIdPlaceholder: "Client ID affiché à la création de la clé",
    apiKey: "Auth key",
    apiKeyPlaceholder: "Auth key générée dans Espace manager → Intégration → Clés API",
    tokenHint: "Veritas échange Client ID + Auth key contre un token de session. Aucune manipulation manuelle requise.",
    howToGetKey: "Comment obtenir Client ID et Auth key ?",
    detectedAccount: "Compte détecté",
    detectedAccountDesc: "Client ID {clientId} · renseigné automatiquement après connexion.",
    fillClientId: "Renseignez le Client ID Mailinblack.",
    fillApiKey: "Renseignez l'Auth key Mailinblack.",
    validateKeyError: "Impossible de valider les identifiants Mailinblack.",
    footerHint: "Client ID + Auth key · connexion automatique",
    testSubtitleSuccess: "Connexion Mailinblack Protect établie",
    testSubtitleFail: "Échec de la connexion",
    testApiSuccess: "Le module Protect (check) a répondu correctement.",
    testFooterSuccess: "Test module protect/check réussi",
    protectCustomers: "Clients Protect",
    guideTitle: "Obtenir vos identifiants API",
    guideDesc: "Les clés API Mailinblack (Client ID + Auth key) sont disponibles depuis votre portail partenaire.",
    guideSteps: [{
      title: "Connectez-vous au portail partenaire",
      desc: "Ouvrez partner.mailinblack.com avec votre compte revendeur MSP."
    }, {
      title: "Générez une clé API",
      desc: "Parcourez le menu : Espace manager → Intégration → Clés API → Générer une clé API. Choisissez le mode lecture seule et activez Management et Protect. Conservez le Client ID et l'Auth key affichés."
    }, {
      title: "Collez les identifiants dans Veritas",
      desc: "URL API : https://app.mailinblack.com/mibc-fr-XX pour une clé de tenant client, ou https://partner.mailinblack.com pour une clé partenaire. Renseignez le Client ID et l'Auth key."
    }],
    infoTitle: "Module Protect",
    infoDesc: "Veritas utilise l'API partenaire Mailinblack Protect pour tester la connexion, lister vos clients et synchroniser les statistiques antispam.",
    infoApis: ["auth/api-keys · échange authKey + clientId → token (x-auth-token)", "protect/check · validation des credentials API", "protect/customers · liste des clients partenaires à associer", "Tenant global · credentials Administration > Intégrations", "Tenant dédié · credentials propres à un client Veritas"]
  },
  en: {
    title: "Mailinblack Protect",
    subtitle: "Global partner tenant configuration",
    configNavAria: "Mailinblack sections",
    sections: {
      connection: {
        description: "URL, Client ID and Auth key"
      },
      info: {
        description: "Protect module"
      }
    },
    connectionDesc: "Enter the Client ID and Auth key shown when creating the Mailinblack API key.",
    apiUrlHint: "Client-tenant key: https://app.mailinblack.com/mibc-fr-XX. Partner key: https://partner.mailinblack.com.",
    clientId: "Client ID",
    clientIdPlaceholder: "Client ID shown when the key is created",
    apiKey: "Auth key",
    apiKeyPlaceholder: "Auth key generated in Manager space → Integration → API keys",
    tokenHint: "Veritas exchanges Client ID + Auth key for a session token. No manual steps required.",
    howToGetKey: "How to get Client ID and Auth key?",
    detectedAccount: "Detected account",
    detectedAccountDesc: "Client ID {clientId} · filled automatically after connection.",
    fillClientId: "Enter the Mailinblack Client ID.",
    fillApiKey: "Enter the Mailinblack Auth key.",
    validateKeyError: "Unable to validate the Mailinblack credentials.",
    footerHint: "Client ID + Auth key · automatic connection",
    testSubtitleSuccess: "Mailinblack Protect connection established",
    testSubtitleFail: "Connection failed",
    testApiSuccess: "The Protect (check) module responded correctly.",
    testFooterSuccess: "Protect/check module test successful",
    protectCustomers: "Protect customers",
    guideTitle: "Get your API credentials",
    guideDesc: "Mailinblack API credentials (Client ID + Auth key) are available from your partner portal.",
    guideSteps: [{
      title: "Sign in to the partner portal",
      desc: "Open partner.mailinblack.com with your MSP reseller account."
    }, {
      title: "Generate an API key",
      desc: "Navigate: Manager space → Integration → API keys → Generate API key. Choose read-only mode and enable Management and Protect. Keep both the Client ID and Auth key."
    }, {
      title: "Paste the credentials in Veritas",
      desc: "API URL: https://partner.mailinblack.com. Enter the Client ID and Auth key, then click Test or Save."
    }],
    infoTitle: "Protect module",
    infoDesc: "Veritas uses the Mailinblack Protect partner API to test the connection, list your customers and sync antispam statistics.",
    infoApis: ["auth/api-keys/execute · exchange Client ID + Auth key → token", "protect/check · API credential validation", "protect/customers · partner customer list to link", "Global tenant · Administration > Integrations credentials", "Dedicated tenant · credentials specific to a Veritas client"]
  },
  de: {
    title: "Mailinblack Protect",
    subtitle: "Globale Partner-Tenant-Konfiguration",
    configNavAria: "Mailinblack-Abschnitte",
    sections: {
      connection: {
        description: "URL, Client-ID und Auth-Key"
      },
      info: {
        description: "Protect-Modul"
      }
    },
    connectionDesc: "Geben Sie die Client-ID und den Auth-Key ein, die bei der Erstellung des API-Schlüssels angezeigt werden.",
    apiUrlHint: "Verwenden Sie https://partner.mailinblack.com (JSON-API unter /api — Veritas ergänzt dies automatisch).",
    clientId: "Client-ID",
    clientIdPlaceholder: "Client-ID bei der Schlüsselerstellung",
    apiKey: "Auth-Key",
    apiKeyPlaceholder: "Auth-Key aus Manager-Bereich → Integration → API-Schlüssel",
    tokenHint: "Veritas tauscht Client-ID + Auth-Key gegen ein Session-Token.",
    howToGetKey: "Wie erhält man Client-ID und Auth-Key?",
    detectedAccount: "Erkanntes Konto",
    detectedAccountDesc: "Client-ID {clientId} · nach Verbindung automatisch ausgefüllt.",
    fillClientId: "Geben Sie die Mailinblack-Client-ID ein.",
    fillApiKey: "Geben Sie den Mailinblack-Auth-Key ein.",
    validateKeyError: "Mailinblack-Zugangsdaten konnten nicht validiert werden.",
    footerHint: "Client-ID + Auth-Key · automatische Verbindung",
    testSubtitleSuccess: "Mailinblack Protect-Verbindung hergestellt",
    testSubtitleFail: "Verbindung fehlgeschlagen",
    testApiSuccess: "Das Protect-(check)-Modul hat korrekt geantwortet.",
    testFooterSuccess: "Protect/check-Modultest erfolgreich",
    protectCustomers: "Protect-Kunden",
    guideTitle: "API-Zugangsdaten erhalten",
    guideDesc: "Mailinblack-API-Schlüssel sind über Ihr Partnerportal (HQ) verfügbar.",
    guideSteps: [{
      title: "Im Partnerportal anmelden",
      desc: "Öffnen Sie partner.mailinblack.com mit Ihrem MSP-Reseller-Konto."
    }, {
      title: "API-Schlüssel generieren",
      desc: "Menü: Manager-Bereich → Integration → API-Schlüssel → API-Schlüssel generieren. Nur-Lese-Modus wählen und Management sowie Protect aktivieren."
    }, {
      title: "Schlüssel in Veritas einfügen",
      desc: "API-URL eingeben, Schlüssel einfügen, dann Testen oder Speichern. Veritas übernimmt die Authentifizierung automatisch."
    }],
    infoTitle: "Protect-Modul",
    infoDesc: "Veritas nutzt die Mailinblack Protect Partner-API zum Verbindungstest, Kundenlisting und Antispam-Synchronisation.",
    infoApis: ["protect/check · API-Zugangsdaten-Validierung", "protect/customers · Partner-Kundenliste", "Globaler Tenant · Administration > Integrationen", "Dedizierter Tenant · kundenspezifische Zugangsdaten"]
  },
  it: {
    title: "Mailinblack Protect",
    subtitle: "Configurazione tenant globale partner",
    configNavAria: "Sezioni Mailinblack",
    sections: {
      connection: {
        description: "URL, Client ID e Auth key"
      },
      info: {
        description: "Modulo Protect"
      }
    },
    connectionDesc: "Inserite Client ID e Auth key mostrati alla creazione della chiave API Mailinblack.",
    apiUrlHint: "Usate https://partner.mailinblack.com (API JSON sotto /api — Veritas lo aggiunge automaticamente).",
    clientId: "Client ID",
    clientIdPlaceholder: "Client ID mostrato alla creazione della chiave",
    apiKey: "Auth key",
    apiKeyPlaceholder: "Auth key generata in Spazio manager → Integrazione → Chiavi API",
    tokenHint: "Veritas scambia Client ID + Auth key con un token di sessione.",
    howToGetKey: "Come ottenere Client ID e Auth key?",
    detectedAccount: "Account rilevato",
    detectedAccountDesc: "Client ID {clientId} · compilato automaticamente dopo la connessione.",
    fillClientId: "Inserite il Client ID Mailinblack.",
    fillApiKey: "Inserite l'Auth key Mailinblack.",
    validateKeyError: "Impossibile convalidare le credenziali Mailinblack.",
    footerHint: "Client ID + Auth key · connessione automatica",
    testSubtitleSuccess: "Connessione Mailinblack Protect stabilita",
    testSubtitleFail: "Connessione fallita",
    testApiSuccess: "Il modulo Protect (check) ha risposto correttamente.",
    testFooterSuccess: "Test modulo protect/check riuscito",
    protectCustomers: "Clienti Protect",
    guideTitle: "Ottenere le credenziali API",
    guideDesc: "Le chiavi API Mailinblack sono disponibili dal portale partner (QG).",
    guideSteps: [{
      title: "Accedere al portale partner",
      desc: "Aprire partner.mailinblack.com con l'account rivenditore MSP."
    }, {
      title: "Generare una chiave API",
      desc: "Menu: Spazio manager → Integrazione → Chiavi API → Genera chiave API. Modalità sola lettura e prodotti Management e Protect."
    }, {
      title: "Incollare la chiave in Veritas",
      desc: "Inserire l'URL API, incollare la chiave, poi Testa o Salva. Veritas gestisce l'autenticazione automaticamente."
    }],
    infoTitle: "Modulo Protect",
    infoDesc: "Veritas usa l'API partner Mailinblack Protect per testare la connione, elencare i clienti e sincronizzare le statistiche antispam.",
    infoApis: ["protect/check · validazione credenziali API", "protect/customers · elenco clienti partner", "Tenant globale · credenziali Amministrazione > Integrazioni", "Tenant dedicato · credenziali per cliente Veritas"]
  },
  es: {
    title: "Mailinblack Protect",
    subtitle: "Configuración del tenant global partner",
    configNavAria: "Secciones Mailinblack",
    sections: {
      connection: {
        description: "URL, Client ID y Auth key"
      },
      info: {
        description: "Módulo Protect"
      }
    },
    connectionDesc: "Introduzca el Client ID y la Auth key mostrados al crear la clave API Mailinblack.",
    apiUrlHint: "Use https://partner.mailinblack.com (la API JSON está bajo /api — Veritas la añade automáticamente).",
    clientId: "Client ID",
    clientIdPlaceholder: "Client ID mostrado al crear la clave",
    apiKey: "Auth key",
    apiKeyPlaceholder: "Auth key generada en Espacio manager → Integración → Claves API",
    tokenHint: "Veritas intercambia Client ID + Auth key por un token de sesión.",
    howToGetKey: "¿Cómo obtener Client ID y Auth key?",
    detectedAccount: "Cuenta detectada",
    detectedAccountDesc: "Client ID {clientId} · completado automáticamente tras la conexión.",
    fillClientId: "Introduzca el Client ID Mailinblack.",
    fillApiKey: "Introduzca la Auth key Mailinblack.",
    validateKeyError: "No se pudieron validar las credenciales Mailinblack.",
    footerHint: "Client ID + Auth key · conexión automática",
    testSubtitleSuccess: "Conexión Mailinblack Protect establecida",
    testSubtitleFail: "Conexión fallida",
    testApiSuccess: "El módulo Protect (check) respondió correctamente.",
    testFooterSuccess: "Prueba del módulo protect/check exitosa",
    protectCustomers: "Clientes Protect",
    guideTitle: "Obtener credenciales API",
    guideDesc: "Las claves API Mailinblack están disponibles desde su portal partner (QG).",
    guideSteps: [{
      title: "Iniciar sesión en el portal partner",
      desc: "Abra partner.mailinblack.com con su cuenta revendedor MSP."
    }, {
      title: "Generar una clave API",
      desc: "Menú: Espacio manager → Integración → Claves API → Generar clave API. Modo solo lectura y productos Management y Protect."
    }, {
      title: "Pegar la clave en Veritas",
      desc: "Introduzca la URL API, pegue la clave generada, luego Probar o Guardar. Veritas gestiona la autenticación automáticamente."
    }],
    infoTitle: "Módulo Protect",
    infoDesc: "Veritas usa la API partner Mailinblack Protect para probar la conexión, listar clientes y sincronizar estadísticas antispam.",
    infoApis: ["protect/check · validación de credenciales API", "protect/customers · lista de clientes partner", "Tenant global · credenciales Administración > Integraciones", "Tenant dedicado · credenciales por cliente Veritas"]
  }
};
const OVH = {
  fr: {
    title: "OVH",
    subtitle: "Configuration du registrar global",
    configNavAria: "Sections OVH",
    sections: {
      connection: {
        description: "Clés API OVH"
      },
      guide: {
        description: "Créer les clés API"
      },
      info: {
        description: "Domaines et DNS"
      }
    },
    connectionTitle: "Identifiants API OVH",
    connectionDesc: "Compte registrar global utilisé pour lister les domaines, les dates d'expiration et les zones DNS sur les fiches entreprise.",
    howToCreateKeys: "Comment créer les clés API OVH ?",
    fillKeysBeforeTest: "Renseignez Application Key, Application Secret et Consumer Key avant de tester.",
    footerActive: "Intégration OVH active",
    footerInactive: "Intégration OVH inactive",
    testSubtitleSuccess: "Connexion API OVH établie",
    testSubtitleFail: "Échec de la connexion",
    testApiSuccess: "L'API OVH a répondu correctement.",
    testFooterSuccess: "Test API /domain réussi",
    testFooterFail: "Vérifiez les clés et les droits GET /domain/*",
    domains: "Domaines",
    domainName: "Nom de domaine",
    infoTitle: "À propos de cette intégration",
    infoDesc: "Inventaire des noms de domaine OVH : expiration, renouvellement automatique, zone DNS et rattachement aux fiches entreprise Veritas.",
    infoApis: ["GET /domain · liste des domaines du compte", "GET /domain/{domain}/serviceInfos · expiration et renouvellement", "GET /domain/zone · zones DNS disponibles"],
    permissionTitle: "Consumer Key · droits GET requis",
    permissionRecommended: "Recommandé :",
    permissionAlternative: "Alternative :",
    permissionAllGet: "GET /* (tous les droits GET)",
    permissionValidate: "Après génération, validez le token sur votre compte OVH puis relancez le test.",
    permissionInsufficient: /permissions insuffisantes/i
  },
  en: {
    title: "OVH",
    subtitle: "Global registrar configuration",
    configNavAria: "OVH sections",
    sections: {
      connection: {
        description: "OVH API keys"
      },
      guide: {
        description: "Create API keys"
      },
      info: {
        description: "Domains and DNS"
      }
    },
    connectionTitle: "OVH API credentials",
    connectionDesc: "Global registrar account used to list domains, expiration dates and DNS zones on company records.",
    howToCreateKeys: "How to create OVH API keys?",
    fillKeysBeforeTest: "Enter Application Key, Application Secret and Consumer Key before testing.",
    footerActive: "OVH integration active",
    footerInactive: "OVH integration inactive",
    testSubtitleSuccess: "OVH API connection established",
    testSubtitleFail: "Connection failed",
    testApiSuccess: "The OVH API responded correctly.",
    testFooterSuccess: "GET /domain API test successful",
    testFooterFail: "Check keys and GET /domain/* permissions",
    domains: "Domains",
    domainName: "Domain name",
    infoTitle: "About this integration",
    infoDesc: "OVH domain name inventory: expiration, auto-renewal, DNS zone and linking to Veritas company records.",
    infoApis: ["GET /domain · account domain list", "GET /domain/{domain}/serviceInfos · expiration and renewal", "GET /domain/zone · available DNS zones"],
    permissionTitle: "Consumer Key · GET permissions required",
    permissionRecommended: "Recommended:",
    permissionAlternative: "Alternative:",
    permissionAllGet: "GET /* (all GET permissions)",
    permissionValidate: "After generation, validate the token on your OVH account then run the test again.",
    permissionInsufficient: /insufficient permissions/i
  },
  de: {
    title: "OVH",
    subtitle: "Globale Registrar-Konfiguration",
    configNavAria: "OVH-Abschnitte",
    sections: {
      connection: {
        description: "OVH-API-Schlüssel"
      },
      guide: {
        description: "API-Schlüssel erstellen"
      },
      info: {
        description: "Domains und DNS"
      }
    },
    connectionTitle: "OVH-API-Zugangsdaten",
    connectionDesc: "Globaler Registrar-Account zum Auflisten von Domains, Ablaufdaten und DNS-Zonen auf Unternehmensdatensätzen.",
    howToCreateKeys: "Wie erstellt man OVH-API-Schlüssel?",
    fillKeysBeforeTest: "Geben Sie Application Key, Application Secret und Consumer Key ein, bevor Sie testen.",
    footerActive: "OVH-Integration aktiv",
    footerInactive: "OVH-Integration inaktiv",
    testSubtitleSuccess: "OVH-API-Verbindung hergestellt",
    testSubtitleFail: "Verbindung fehlgeschlagen",
    testApiSuccess: "Die OVH-API hat korrekt geantwortet.",
    testFooterSuccess: "GET /domain-API-Test erfolgreich",
    testFooterFail: "Schlüssel und GET /domain/*-Rechte prüfen",
    domains: "Domains",
    domainName: "Domainname",
    infoTitle: "Über diese Integration",
    infoDesc: "OVH-Domain-Inventar: Ablauf, automatische Verlängerung, DNS-Zone und Verknüpfung mit Veritas-Unternehmensdatensätzen.",
    infoApis: ["GET /domain · Domainliste des Kontos", "GET /domain/{domain}/serviceInfos · Ablauf und Verlängerung", "GET /domain/zone · verfügbare DNS-Zonen"],
    permissionTitle: "Consumer Key · GET-Rechte erforderlich",
    permissionRecommended: "Empfohlen:",
    permissionAlternative: "Alternative:",
    permissionAllGet: "GET /* (alle GET-Rechte)",
    permissionValidate: "Validieren Sie nach der Erstellung den Token auf Ihrem OVH-Konto und starten Sie den Test erneut.",
    permissionInsufficient: /insufficient permissions|unzureichende berechtigungen/i
  },
  it: {
    title: "OVH",
    subtitle: "Configurazione registrar globale",
    configNavAria: "Sezioni OVH",
    sections: {
      connection: {
        description: "Chiavi API OVH"
      },
      guide: {
        description: "Creare le chiavi API"
      },
      info: {
        description: "Domini e DNS"
      }
    },
    connectionTitle: "Credenziali API OVH",
    connectionDesc: "Account registrar globale per elencare domini, date di scadenza e zone DNS sulle schede azienda.",
    howToCreateKeys: "Come creare le chiavi API OVH?",
    fillKeysBeforeTest: "Inserite Application Key, Application Secret e Consumer Key prima di testare.",
    footerActive: "Integrazione OVH attiva",
    footerInactive: "Integrazione OVH inattiva",
    testSubtitleSuccess: "Connessione API OVH stabilita",
    testSubtitleFail: "Connessione fallita",
    testApiSuccess: "L'API OVH ha risposto correttamente.",
    testFooterSuccess: "Test API GET /domain riuscito",
    testFooterFail: "Verificare chiavi e permessi GET /domain/*",
    domains: "Domini",
    domainName: "Nome dominio",
    infoTitle: "Informazioni su questa integrazione",
    infoDesc: "Inventario domini OVH: scadenza, rinnovo automatico, zona DNS e collegamento alle schede azienda Veritas.",
    infoApis: ["GET /domain · elenco domini dell'account", "GET /domain/{domain}/serviceInfos · scadenza e rinnovo", "GET /domain/zone · zone DNS disponibili"],
    permissionTitle: "Consumer Key · permessi GET richiesti",
    permissionRecommended: "Consigliato:",
    permissionAlternative: "Alternativa:",
    permissionAllGet: "GET /* (tutti i permessi GET)",
    permissionValidate: "Dopo la generazione, convalidare il token sull'account OVH e ripetere il test.",
    permissionInsufficient: /permessi insufficienti|insufficient permissions/i
  },
  es: {
    title: "OVH",
    subtitle: "Configuración del registrar global",
    configNavAria: "Secciones OVH",
    sections: {
      connection: {
        description: "Claves API OVH"
      },
      guide: {
        description: "Crear claves API"
      },
      info: {
        description: "Dominios y DNS"
      }
    },
    connectionTitle: "Credenciales API OVH",
    connectionDesc: "Cuenta registrar global para listar dominios, fechas de caducidad y zonas DNS en fichas de empresa.",
    howToCreateKeys: "¿Cómo crear las claves API OVH?",
    fillKeysBeforeTest: "Introduzca Application Key, Application Secret y Consumer Key antes de probar.",
    footerActive: "Integración OVH activa",
    footerInactive: "Integración OVH inactiva",
    testSubtitleSuccess: "Conexión API OVH establecida",
    testSubtitleFail: "Conexión fallida",
    testApiSuccess: "La API OVH respondió correctamente.",
    testFooterSuccess: "Prueba API GET /domain exitosa",
    testFooterFail: "Verifique claves y permisos GET /domain/*",
    domains: "Dominios",
    domainName: "Nombre de dominio",
    infoTitle: "Acerca de esta integración",
    infoDesc: "Inventario de dominios OVH: caducidad, renovación automática, zona DNS y enlace a fichas empresa Veritas.",
    infoApis: ["GET /domain · lista de dominios de la cuenta", "GET /domain/{domain}/serviceInfos · caducidad y renovación", "GET /domain/zone · zonas DNS disponibles"],
    permissionTitle: "Consumer Key · permisos GET requeridos",
    permissionRecommended: "Recomendado:",
    permissionAlternative: "Alternativa:",
    permissionAllGet: "GET /* (todos los permisos GET)",
    permissionValidate: "Tras generar, valide el token en su cuenta OVH y vuelva a ejecutar la prueba.",
    permissionInsufficient: /permisos insuficientes|insufficient permissions/i
  }
};
const OVH_GUIDE = {
  fr: {
    title: "Créer vos clés API OVH",
    desc: "Veritas a besoin des trois clés OVH. Le test de connexion appelle GET /domain : le Consumer Key doit donc autoriser au minimum les requêtes GET sur les domaines.",
    steps: [{
      title: "Application Key et Application Secret",
      desc: "Créez une application sur la console API OVH pour obtenir l'Application Key et l'Application Secret.",
      linkLabel: "console API OVH"
    }, {
      title: "Consumer Key avec droits GET",
      desc: "Générez un token puis validez-le sur votre compte OVH. Choisissez l'une des options suivantes :",
      recommended: "Recommandé · GET /domain/*",
      recommendedLink: "Générer un Consumer Key domaines",
      alternative: "Alternative · GET /* (tous les droits GET)",
      alternativeLink: "Générer un Consumer Key complet"
    }, {
      title: "Renseignez Veritas et testez",
      descAdmin: "Collez les trois clés dans Veritas, testez la connexion puis enregistrez. Le test utilise les valeurs saisies sans sauvegarde préalable.",
      descClient: "Collez les trois clés dans Administration → Intégrations → OVH, testez la connexion puis enregistrez. Vous pourrez ensuite importer les domaines sur cette fiche client."
    }]
  },
  en: {
    title: "Create your OVH API keys",
    desc: "Veritas needs all three OVH keys. The connection test calls GET /domain: the Consumer Key must therefore allow at least GET requests on domains.",
    steps: [{
      title: "Application Key and Application Secret",
      desc: "Create an application on the OVH API console to obtain the Application Key and Application Secret.",
      linkLabel: "OVH API console"
    }, {
      title: "Consumer Key with GET permissions",
      desc: "Generate a token then validate it on your OVH account. Choose one of the following options:",
      recommended: "Recommended · GET /domain/*",
      recommendedLink: "Generate domain Consumer Key",
      alternative: "Alternative · GET /* (all GET permissions)",
      alternativeLink: "Generate full Consumer Key"
    }, {
      title: "Enter in Veritas and test",
      descAdmin: "Paste the three keys in Veritas, test the connection then save. The test uses entered values without prior save.",
      descClient: "Paste the three keys in Administration → Integrations → OVH, test then save. You can then import domains on this client record."
    }]
  },
  de: {
    title: "OVH-API-Schlüssel erstellen",
    desc: "Veritas benötigt alle drei OVH-Schlüssel. Der Verbindungstest ruft GET /domain auf: der Consumer Key muss mindestens GET-Anfragen auf Domains erlauben.",
    steps: [{
      title: "Application Key und Application Secret",
      desc: "Erstellen Sie eine Anwendung in der OVH-API-Konsole.",
      linkLabel: "OVH-API-Konsole"
    }, {
      title: "Consumer Key mit GET-Rechten",
      desc: "Token generieren und auf dem OVH-Konto validieren:",
      recommended: "Empfohlen · GET /domain/*",
      recommendedLink: "Domain-Consumer-Key generieren",
      alternative: "Alternative · GET /*",
      alternativeLink: "Vollständigen Consumer Key generieren"
    }, {
      title: "In Veritas eingeben und testen",
      descAdmin: "Drei Schlüssel einfügen, Verbindung testen, dann speichern.",
      descClient: "Schlüssel unter Administration → Integrationen → OVH eingeben, testen, dann speichern."
    }]
  },
  it: {
    title: "Creare le chiavi API OVH",
    desc: "Veritas richiede tutte e tre le chiavi OVH. Il test di connessione chiama GET /domain: il Consumer Key deve autorizzare almeno richieste GET sui domini.",
    steps: [{
      title: "Application Key e Application Secret",
      desc: "Create un'applicazione sulla console API OVH.",
      linkLabel: "console API OVH"
    }, {
      title: "Consumer Key con permessi GET",
      desc: "Generate un token e convalidatelo sull'account OVH:",
      recommended: "Consigliato · GET /domain/*",
      recommendedLink: "Genera Consumer Key domini",
      alternative: "Alternativa · GET /*",
      alternativeLink: "Genera Consumer Key completo"
    }, {
      title: "Inserire in Veritas e testare",
      descAdmin: "Incollate le tre chiavi in Veritas, testate e salvate.",
      descClient: "Incollate le chiavi in Amministrazione → Integrazioni → OVH, testate e salvate."
    }]
  },
  es: {
    title: "Crear sus claves API OVH",
    desc: "Veritas necesita las tres claves OVH. La prueba de conexión llama GET /domain: el Consumer Key debe autorizar al menos peticiones GET en dominios.",
    steps: [{
      title: "Application Key y Application Secret",
      desc: "Cree una aplicación en la consola API OVH.",
      linkLabel: "consola API OVH"
    }, {
      title: "Consumer Key con permisos GET",
      desc: "Genere un token y valídelo en su cuenta OVH:",
      recommended: "Recomendado · GET /domain/*",
      recommendedLink: "Generar Consumer Key dominios",
      alternative: "Alternativa · GET /*",
      alternativeLink: "Generar Consumer Key completo"
    }, {
      title: "Introducir en Veritas y probar",
      descAdmin: "Pegue las tres claves en Veritas, pruebe y guarde.",
      descClient: "Pegue las claves en Administración → Integraciones → OVH, pruebe y guarde."
    }]
  }
};
const AI = {
  fr: {
    title: "Veritas AI",
    subtitle: "Fournisseur LLM pour le copilote",
    configNavAria: "Sections de configuration Veritas AI",
    sections: {
      connection: {
        description: "Fournisseur et clé API"
      },
      guide: {
        description: "Obtenir une clé API"
      },
      info: {
        description: "Usage et copilote"
      }
    },
    apiCredentials: "Identifiants LLM",
    connectionDesc: "Choisissez un fournisseur compatible, renseignez la clé API, puis activez l'intégration. Les quotas et fonctionnalités se gèrent dans Administration → IA · Copilote.",
    provider: "Fournisseur",
    model: "Modèle",
    modelHint: "Laissez vide pour utiliser le modèle recommandé du fournisseur.",
    providers: {
      openai: "OpenAI (API compatible)",
      anthropic: "Anthropic Claude",
      mammouth: "Mammouth AI"
    },
    howToGetCredentials: "Comment obtenir une clé API ?",
    fillApiKeyBeforeTest: "Renseignez la clé API avant de tester.",
    footerActive: "Veritas AI actif",
    footerInactive: "Veritas AI inactif",
    testSubtitleSuccess: "Connexion LLM établie",
    testSubtitleFail: "Échec de la connexion",
    testApiSuccess: "Le fournisseur LLM a répondu correctement.",
    guideTitle: "Obtenir vos identifiants",
    guideDesc: "Créez une clé API chez votre fournisseur LLM, puis testez la connexion dans Veritas.",
    guideSteps: [{
      title: "Choisissez un fournisseur",
      desc: "OpenAI (ou API compatible), Anthropic Claude, ou Mammouth AI."
    }, {
      title: "Créez une clé API",
      desc: "Dans le portail du fournisseur, créez une clé avec les droits d'appel au modèle choisi."
    }, {
      title: "Renseignez et testez",
      desc: "Collez la clé ici, choisissez éventuellement un modèle, testez puis enregistrez."
    }],
    infoTitle: "À propos de cette intégration",
    infoDesc: "Veritas AI alimente le copilote tickets, les runbooks, les briefings et l'enrichissement des alertes de supervision.",
    infoApis: ["Suggestion de réponses et notes internes", "Brouillons de résolution et runbooks", "Briefings dashboard / supervision / entreprise"],
    infoFooter: "Après configuration, ouvrez Administration → IA · Copilote pour les quotas journaliers et les bascules de fonctionnalités."
  },
  en: {
    title: "Veritas AI",
    subtitle: "LLM provider for the copilote",
    configNavAria: "Veritas AI configuration sections",
    sections: {
      connection: {
        description: "Provider and API key"
      },
      guide: {
        description: "Get an API key"
      },
      info: {
        description: "Usage and copilote"
      }
    },
    apiCredentials: "LLM credentials",
    connectionDesc: "Pick a compatible provider, enter the API key, then enable the integration. Quotas and features are managed in Administration → AI · Copilot.",
    provider: "Provider",
    model: "Model",
    modelHint: "Leave empty to use the provider recommended model.",
    providers: {
      openai: "OpenAI (compatible API)",
      anthropic: "Anthropic Claude",
      mammouth: "Mammouth AI"
    },
    howToGetCredentials: "How do I get an API key?",
    fillApiKeyBeforeTest: "Enter the API key before testing.",
    footerActive: "Veritas AI active",
    footerInactive: "Veritas AI inactive",
    testSubtitleSuccess: "LLM connection established",
    testSubtitleFail: "Connection failed",
    testApiSuccess: "The LLM provider responded successfully.",
    guideTitle: "Get your credentials",
    guideDesc: "Create an API key with your LLM provider, then test the connection in Veritas.",
    guideSteps: [{
      title: "Choose a provider",
      desc: "OpenAI (or compatible API), Anthropic Claude, or Mammouth AI."
    }, {
      title: "Create an API key",
      desc: "In the provider portal, create a key with permission to call the selected model."
    }, {
      title: "Enter and test",
      desc: "Paste the key here, optionally set a model, test, then save."
    }],
    infoTitle: "About this integration",
    infoDesc: "Veritas AI powers the ticket copilote, runbooks, briefings and monitoring alert enrichment.",
    infoApis: ["Reply and internal note suggestions", "Resolution drafts and runbooks", "Dashboard / supervision / enterprise briefings"],
    infoFooter: "After setup, open Administration → AI · Copilot for daily quotas and feature toggles."
  },
  de: {
    title: "Veritas AI",
    subtitle: "LLM-Anbieter für den Copilot",
    configNavAria: "Veritas-AI-Konfigurationsbereiche",
    sections: {
      connection: {
        description: "Anbieter und API-Schlüssel"
      },
      guide: {
        description: "API-Schlüssel erhalten"
      },
      info: {
        description: "Nutzung und Copilot"
      }
    },
    apiCredentials: "LLM-Zugangsdaten",
    connectionDesc: "Wählen Sie einen kompatiblen Anbieter, geben Sie den API-Schlüssel ein und aktivieren Sie die Integration. Kontingente und Funktionen verwalten Sie unter Administration → KI · Copilot.",
    provider: "Anbieter",
    model: "Modell",
    modelHint: "Leer lassen, um das empfohlene Modell des Anbieters zu verwenden.",
    providers: {
      openai: "OpenAI (kompatible API)",
      anthropic: "Anthropic Claude",
      mammouth: "Mammouth AI"
    },
    howToGetCredentials: "Wie erhalte ich einen API-Schlüssel?",
    fillApiKeyBeforeTest: "Geben Sie den API-Schlüssel ein, bevor Sie testen.",
    footerActive: "Veritas AI aktiv",
    footerInactive: "Veritas AI inaktiv",
    testSubtitleSuccess: "LLM-Verbindung hergestellt",
    testSubtitleFail: "Verbindung fehlgeschlagen",
    testApiSuccess: "Der LLM-Anbieter hat korrekt geantwortet.",
    guideTitle: "Zugangsdaten erhalten",
    guideDesc: "Erstellen Sie einen API-Schlüssel bei Ihrem LLM-Anbieter und testen Sie die Verbindung in Veritas.",
    guideSteps: [{
      title: "Anbieter wählen",
      desc: "OpenAI (oder kompatible API), Anthropic Claude oder Mammouth AI."
    }, {
      title: "API-Schlüssel erstellen",
      desc: "Erstellen Sie im Anbieterportal einen Schlüssel mit Aufrufrechten für das gewählte Modell."
    }, {
      title: "Eingeben und testen",
      desc: "Schlüssel hier einfügen, optional Modell setzen, testen und speichern."
    }],
    infoTitle: "Über diese Integration",
    infoDesc: "Veritas AI betreibt den Ticket-Copilot, Runbooks, Briefings und die Anreicherung von Monitoring-Alerten.",
    infoApis: ["Antwort- und Notizvorschläge", "Abschlussentwürfe und Runbooks", "Dashboard-/Supervision-/Unternehmens-Briefings"],
    infoFooter: "Nach der Einrichtung öffnen Sie Administration → KI · Copilot für Tageskontingente und Funktions-Schalter."
  },
  it: {
    title: "Veritas AI",
    subtitle: "Provider LLM per il copilota",
    configNavAria: "Sezioni di configurazione Veritas AI",
    sections: {
      connection: {
        description: "Provider e chiave API"
      },
      guide: {
        description: "Ottenere una chiave API"
      },
      info: {
        description: "Utilizzo e copilota"
      }
    },
    apiCredentials: "Credenziali LLM",
    connectionDesc: "Scegliete un provider compatibile, inserite la chiave API e attivate l'integrazione. Quote e funzionalità si gestiscono in Amministrazione → IA · Copilota.",
    provider: "Provider",
    model: "Modello",
    modelHint: "Lasciate vuoto per usare il modello consigliato del provider.",
    providers: {
      openai: "OpenAI (API compatibile)",
      anthropic: "Anthropic Claude",
      mammouth: "Mammouth AI"
    },
    howToGetCredentials: "Come ottenere una chiave API?",
    fillApiKeyBeforeTest: "Inserite la chiave API prima di testare.",
    footerActive: "Veritas AI attivo",
    footerInactive: "Veritas AI inattivo",
    testSubtitleSuccess: "Connessione LLM stabilita",
    testSubtitleFail: "Connessione non riuscita",
    testApiSuccess: "Il provider LLM ha risposto correttamente.",
    guideTitle: "Ottenere le credenziali",
    guideDesc: "Create una chiave API presso il provider LLM, poi testate la connessione in Veritas.",
    guideSteps: [{
      title: "Scegliete un provider",
      desc: "OpenAI (o API compatibile), Anthropic Claude o Mammouth AI."
    }, {
      title: "Create una chiave API",
      desc: "Nel portale del provider, create una chiave con diritti di chiamata al modello scelto."
    }, {
      title: "Inserite e testate",
      desc: "Incollate la chiave qui, impostate eventualmente un modello, testate e salvate."
    }],
    infoTitle: "Informazioni sull'integrazione",
    infoDesc: "Veritas AI alimenta il copilota ticket, i runbook, i briefing e l'arricchimento degli alert di supervisione.",
    infoApis: ["Suggerimenti di risposta e note interne", "Bozze di risoluzione e runbook", "Briefing dashboard / supervisione / azienda"],
    infoFooter: "Dopo la configurazione, aprite Amministrazione → IA · Copilota per le quote giornaliere e i toggle delle funzionalità."
  },
  es: {
    title: "Veritas AI",
    subtitle: "Proveedor LLM para el copiloto",
    configNavAria: "Secciones de configuración Veritas AI",
    sections: {
      connection: {
        description: "Proveedor y clave API"
      },
      guide: {
        description: "Obtener una clave API"
      },
      info: {
        description: "Uso y copiloto"
      }
    },
    apiCredentials: "Credenciales LLM",
    connectionDesc: "Elija un proveedor compatible, introduzca la clave API y active la integración. Las cuotas y funciones se gestionan en Administración → IA · Copiloto.",
    provider: "Proveedor",
    model: "Modelo",
    modelHint: "Déjelo vacío para usar el modelo recomendado del proveedor.",
    providers: {
      openai: "OpenAI (API compatible)",
      anthropic: "Anthropic Claude",
      mammouth: "Mammouth AI"
    },
    howToGetCredentials: "¿Cómo obtener una clave API?",
    fillApiKeyBeforeTest: "Introduzca la clave API antes de probar.",
    footerActive: "Veritas AI activo",
    footerInactive: "Veritas AI inactivo",
    testSubtitleSuccess: "Conexión LLM establecida",
    testSubtitleFail: "Conexión fallida",
    testApiSuccess: "El proveedor LLM respondió correctamente.",
    guideTitle: "Obtener sus credenciales",
    guideDesc: "Cree una clave API en su proveedor LLM y pruebe la conexión en Veritas.",
    guideSteps: [{
      title: "Elija un proveedor",
      desc: "OpenAI (o API compatible), Anthropic Claude o Mammouth AI."
    }, {
      title: "Cree una clave API",
      desc: "En el portal del proveedor, cree una clave con permisos para llamar al modelo elegido."
    }, {
      title: "Introduzca y pruebe",
      desc: "Pegue la clave aquí, opcionalmente defina un modelo, pruebe y guarde."
    }],
    infoTitle: "Acerca de esta integración",
    infoDesc: "Veritas AI alimenta el copiloto de tickets, runbooks, briefings y el enriquecimiento de alertas de supervisión.",
    infoApis: ["Sugerencias de respuesta y notas internas", "Borradores de resolución y runbooks", "Briefings de dashboard / supervisión / empresa"],
    infoFooter: "Tras la configuración, abra Administración → IA · Copiloto para las cuotas diarias y los interruptores de funciones."
  }
};
const CHECKMK = {
  fr: {
    title: "Checkmk",
    subtitle: "Configuration de la supervision",
    configNavAria: "Sections de configuration Checkmk",
    sections: {
      connection: { description: "URL API et identifiants" },
      guide: { description: "Obtenir un accès API" },
      info: { description: "Usage supervision" }
    },
    apiCredentials: "Identifiants Checkmk",
    connectionDesc: "Renseignez l’URL de l’API REST Checkmk et un compte automatisation. Le test utilise les valeurs du formulaire, sans enregistrement préalable.",
    apiUrl: "URL API Checkmk",
    username: "Nom d’utilisateur",
    password: "Mot de passe",
    site: "Site par défaut (optionnel)",
    sitePlaceholder: "ex. cmk",
    howToGetCredentials: "Comment obtenir un accès API ?",
    fillCredentialsBeforeTest: "Renseignez l’URL, l’utilisateur et le mot de passe avant de tester.",
    testUsesFormHint: "Le test de connexion utilise les valeurs saisies, sans sauvegarde.",
    footerActive: "Checkmk actif",
    footerInactive: "Checkmk inactif",
    testSubtitleSuccess: "Connexion Checkmk établie",
    testSubtitleFail: "Échec de la connexion",
    testApiSuccess: "L’API Checkmk a répondu correctement.",
    checkCredentials: "Vérifiez l’URL et les identifiants.",
    hosts: "Hôtes",
    guideTitle: "Obtenir vos identifiants",
    guideDesc: "Créez un utilisateur automatisation dans Checkmk et récupérez l’URL de l’API REST.",
    guideSteps: [
      { title: "Ouvrez Setup → Users", desc: "Créez un utilisateur dédié à l’API (automation) avec les droits de lecture hôtes/services." },
      { title: "Récupérez l’URL API", desc: "Utilisez l’URL REST au format …/site/check_mk/api/1.0 (selon votre instance)." },
      { title: "Renseignez et testez", desc: "Collez URL, utilisateur et mot de passe ici, testez la connexion, puis enregistrez." }
    ],
    infoTitle: "À propos de cette intégration",
    infoDesc: "Checkmk alimente la supervision des hôtes, services, alertes et rapports de monitoring dans Veritas.",
    infoApis: ["Inventaire hôtes et services", "Événements et notifications", "Rapports de disponibilité et métriques"],
    infoFooter: "Testez la connexion avant d’enregistrer. Le test utilise les valeurs saisies dans le formulaire, sans sauvegarde préalable. Après configuration, mappez les hôtes Checkmk aux équipements clients dans Supervision."
  },
  en: {
    title: "Checkmk",
    subtitle: "Monitoring configuration",
    configNavAria: "Checkmk configuration sections",
    sections: {
      connection: { description: "API URL and credentials" },
      guide: { description: "Get API access" },
      info: { description: "Monitoring usage" }
    },
    apiCredentials: "Checkmk credentials",
    connectionDesc: "Enter the Checkmk REST API URL and an automation account. The test uses the form values, without saving first.",
    apiUrl: "Checkmk API URL",
    username: "Username",
    password: "Password",
    site: "Default site (optional)",
    sitePlaceholder: "e.g. cmk",
    howToGetCredentials: "How do I get API access?",
    fillCredentialsBeforeTest: "Enter URL, username and password before testing.",
    testUsesFormHint: "The connection test uses the values entered in the form, without saving.",
    footerActive: "Checkmk active",
    footerInactive: "Checkmk inactive",
    testSubtitleSuccess: "Checkmk connection established",
    testSubtitleFail: "Connection failed",
    testApiSuccess: "The Checkmk API responded successfully.",
    checkCredentials: "Check the URL and credentials.",
    hosts: "Hosts",
    guideTitle: "Get your credentials",
    guideDesc: "Create an automation user in Checkmk and copy the REST API URL.",
    guideSteps: [
      { title: "Open Setup → Users", desc: "Create a dedicated automation user with host/service read permissions." },
      { title: "Copy the API URL", desc: "Use the REST URL in the form …/site/check_mk/api/1.0 (depending on your instance)." },
      { title: "Enter and test", desc: "Paste URL, username and password here, test the connection, then save." }
    ],
    infoTitle: "About this integration",
    infoDesc: "Checkmk powers host/service monitoring, alerts and monitoring reports in Veritas.",
    infoApis: ["Host and service inventory", "Events and notifications", "Availability reports and metrics"],
    infoFooter: "Test the connection before saving. The test uses the values entered in the form, without prior save. After setup, map Checkmk hosts to client equipment in Supervision."
  },
  de: {
    title: "Checkmk",
    subtitle: "Monitoring-Konfiguration",
    configNavAria: "Checkmk-Konfigurationsbereiche",
    sections: {
      connection: { description: "API-URL und Zugangsdaten" },
      guide: { description: "API-Zugang erhalten" },
      info: { description: "Monitoring-Nutzung" }
    },
    apiCredentials: "Checkmk-Zugangsdaten",
    connectionDesc: "Geben Sie die Checkmk-REST-API-URL und ein Automatisierungskonto ein. Der Test verwendet die Formularwerte ohne vorheriges Speichern.",
    apiUrl: "Checkmk-API-URL",
    username: "Benutzername",
    password: "Passwort",
    site: "Standard-Site (optional)",
    sitePlaceholder: "z. B. cmk",
    howToGetCredentials: "Wie erhalte ich API-Zugang?",
    fillCredentialsBeforeTest: "URL, Benutzername und Passwort vor dem Test eingeben.",
    testUsesFormHint: "Der Verbindungstest verwendet die eingegebenen Werte, ohne zu speichern.",
    footerActive: "Checkmk aktiv",
    footerInactive: "Checkmk inaktiv",
    testSubtitleSuccess: "Checkmk-Verbindung hergestellt",
    testSubtitleFail: "Verbindung fehlgeschlagen",
    testApiSuccess: "Die Checkmk-API hat korrekt geantwortet.",
    checkCredentials: "URL und Zugangsdaten prüfen.",
    hosts: "Hosts",
    guideTitle: "Zugangsdaten erhalten",
    guideDesc: "Erstellen Sie einen Automatisierungsbenutzer in Checkmk und kopieren Sie die REST-API-URL.",
    guideSteps: [
      { title: "Setup → Users öffnen", desc: "Erstellen Sie einen Automatisierungsbenutzer mit Leserechten für Hosts/Services." },
      { title: "API-URL kopieren", desc: "REST-URL im Format …/site/check_mk/api/1.0 verwenden." },
      { title: "Eingeben und testen", desc: "URL, Benutzer und Passwort einfügen, testen, dann speichern." }
    ],
    infoTitle: "Über diese Integration",
    infoDesc: "Checkmk liefert Host-/Service-Monitoring, Alarme und Berichte in Veritas.",
    infoApis: ["Host- und Service-Inventar", "Ereignisse und Benachrichtigungen", "Verfügbarkeitsberichte und Metriken"],
    infoFooter: "Testen Sie die Verbindung vor dem Speichern. Der Test verwendet die Formularwerte ohne vorheriges Speichern. Nach der Einrichtung Hosts in Supervision zuordnen."
  },
  it: {
    title: "Checkmk",
    subtitle: "Configurazione monitoraggio",
    configNavAria: "Sezioni di configurazione Checkmk",
    sections: {
      connection: { description: "URL API e credenziali" },
      guide: { description: "Ottenere accesso API" },
      info: { description: "Uso monitoraggio" }
    },
    apiCredentials: "Credenziali Checkmk",
    connectionDesc: "Inserite l’URL dell’API REST Checkmk e un account di automazione. Il test usa i valori del modulo, senza salvataggio preliminare.",
    apiUrl: "URL API Checkmk",
    username: "Nome utente",
    password: "Password",
    site: "Site predefinito (opzionale)",
    sitePlaceholder: "es. cmk",
    howToGetCredentials: "Come ottenere l’accesso API?",
    fillCredentialsBeforeTest: "Inserite URL, utente e password prima di testare.",
    testUsesFormHint: "Il test di connessione usa i valori inseriti, senza salvare.",
    footerActive: "Checkmk attivo",
    footerInactive: "Checkmk inattivo",
    testSubtitleSuccess: "Connessione Checkmk stabilita",
    testSubtitleFail: "Connessione non riuscita",
    testApiSuccess: "L’API Checkmk ha risposto correttamente.",
    checkCredentials: "Verificate URL e credenziali.",
    hosts: "Host",
    guideTitle: "Ottenere le credenziali",
    guideDesc: "Create un utente di automazione in Checkmk e copiate l’URL dell’API REST.",
    guideSteps: [
      { title: "Aprire Setup → Users", desc: "Create un utente automation con diritti di lettura host/servizi." },
      { title: "Copiare l’URL API", desc: "Usate l’URL REST nel formato …/site/check_mk/api/1.0." },
      { title: "Inserire e testare", desc: "Incollate URL, utente e password, testate la connessione, poi salvate." }
    ],
    infoTitle: "Informazioni sull’integrazione",
    infoDesc: "Checkmk alimenta il monitoraggio host/servizi, alert e report in Veritas.",
    infoApis: ["Inventario host e servizi", "Eventi e notifiche", "Report di disponibilità e metriche"],
    infoFooter: "Testate la connessione prima di salvare. Il test usa i valori del modulo, senza salvataggio preliminare. Dopo la configurazione, mappate gli host in Supervisione."
  },
  es: {
    title: "Checkmk",
    subtitle: "Configuración de supervisión",
    configNavAria: "Secciones de configuración Checkmk",
    sections: {
      connection: { description: "URL API y credenciales" },
      guide: { description: "Obtener acceso API" },
      info: { description: "Uso de supervisión" }
    },
    apiCredentials: "Credenciales Checkmk",
    connectionDesc: "Introduzca la URL de la API REST de Checkmk y una cuenta de automatización. La prueba usa los valores del formulario, sin guardado previo.",
    apiUrl: "URL API Checkmk",
    username: "Usuario",
    password: "Contraseña",
    site: "Site por defecto (opcional)",
    sitePlaceholder: "p. ej. cmk",
    howToGetCredentials: "¿Cómo obtener acceso API?",
    fillCredentialsBeforeTest: "Introduzca URL, usuario y contraseña antes de probar.",
    testUsesFormHint: "La prueba de conexión usa los valores introducidos, sin guardar.",
    footerActive: "Checkmk activo",
    footerInactive: "Checkmk inactivo",
    testSubtitleSuccess: "Conexión Checkmk establecida",
    testSubtitleFail: "Conexión fallida",
    testApiSuccess: "La API Checkmk respondió correctamente.",
    checkCredentials: "Verifique la URL y las credenciales.",
    hosts: "Hosts",
    guideTitle: "Obtener sus credenciales",
    guideDesc: "Cree un usuario de automatización en Checkmk y copie la URL de la API REST.",
    guideSteps: [
      { title: "Abrir Setup → Users", desc: "Cree un usuario automation con permisos de lectura de hosts/servicios." },
      { title: "Copiar la URL API", desc: "Use la URL REST en el formato …/site/check_mk/api/1.0." },
      { title: "Introducir y probar", desc: "Pegue URL, usuario y contraseña, pruebe la conexión y luego guarde." }
    ],
    infoTitle: "Acerca de esta integración",
    infoDesc: "Checkmk alimenta la supervisión de hosts/servicios, alertas e informes en Veritas.",
    infoApis: ["Inventario de hosts y servicios", "Eventos y notificaciones", "Informes de disponibilidad y métricas"],
    infoFooter: "Pruebe la conexión antes de guardar. La prueba usa los valores del formulario, sin guardado previo. Tras la configuración, mapee los hosts en Supervisión."
  }
};
const WHATSAPP = {
  fr: {
    title: "WhatsApp Business",
    subtitle: "Messages clients et tickets support",
    configNavAria: "Sections de configuration WhatsApp",
    sections: {
      connection: { description: "Identifiants Meta" },
      guide: { description: "Configurer Meta" },
      info: { description: "Webhook et tickets" }
    },
    apiCredentials: "Identifiants WhatsApp",
    connectionDesc: "Connectez une app Meta WhatsApp Business. Enregistrez avant de tester : le test utilise la configuration sauvegardée.",
    phoneNumberId: "Phone Number ID (Meta)",
    accessToken: "Token d’accès permanent",
    appSecret: "Secret de l’application Meta",
    verifyToken: "Token de vérification webhook",
    businessAccountId: "ID compte Business (optionnel)",
    apiVersion: "Version API Graph",
    webhookUrl: "URL webhook Meta (callback)",
    howToGetCredentials: "Comment configurer Meta ?",
    fillCredentialsBeforeTest: "Renseignez au moins le Phone Number ID et le token d’accès avant de tester.",
    testUsesSavedHint: "Le test de connexion utilise les paramètres déjà enregistrés. Enregistrez d’abord vos modifications.",
    footerActive: "WhatsApp actif",
    footerInactive: "WhatsApp inactif",
    testSubtitleSuccess: "Connexion WhatsApp établie",
    testSubtitleFail: "Échec de la connexion",
    testApiSuccess: "L’API WhatsApp Business a répondu correctement.",
    checkCredentials: "Vérifiez les identifiants Meta, puis enregistrez.",
    accountName: "Compte",
    phoneNumber: "Numéro",
    quality: "Qualité",
    guideTitle: "Configurer WhatsApp Business",
    guideDesc: "Créez une app Meta, un numéro WhatsApp Business et un webhook pointant vers Veritas.",
    guideSteps: [
      { title: "Créez une app Meta", desc: "Dans Meta Developers, créez une app avec le produit WhatsApp." },
      { title: "Récupérez les identifiants", desc: "Copiez Phone Number ID, token permanent, App Secret et définissez un Verify Token." },
      { title: "Configurez le webhook", desc: "Collez l’URL webhook Veritas dans Meta, abonnez les messages, puis enregistrez et testez ici." }
    ],
    infoTitle: "À propos de cette intégration",
    infoDesc: "Les messages WhatsApp entrants créent des tickets support ; les réponses depuis Veritas sont renvoyées au client.",
    infoApis: ["Réception des messages entrants", "Création automatique de tickets", "Réponses sortantes depuis Veritas"],
    infoFooter: "Le webhook doit être joignable publiquement (HTTPS) pour la vérification Meta."
  },
  en: {
    title: "WhatsApp Business",
    subtitle: "Client messages and support tickets",
    configNavAria: "WhatsApp configuration sections",
    sections: {
      connection: { description: "Meta credentials" },
      guide: { description: "Configure Meta" },
      info: { description: "Webhook and tickets" }
    },
    apiCredentials: "WhatsApp credentials",
    connectionDesc: "Connect a Meta WhatsApp Business app. Save before testing: the test uses the saved configuration.",
    phoneNumberId: "Phone Number ID (Meta)",
    accessToken: "Permanent access token",
    appSecret: "Meta app secret",
    verifyToken: "Webhook verification token",
    businessAccountId: "Business account ID (optional)",
    apiVersion: "Graph API version",
    webhookUrl: "Meta webhook URL (callback)",
    howToGetCredentials: "How do I configure Meta?",
    fillCredentialsBeforeTest: "Enter at least the Phone Number ID and access token before testing.",
    testUsesSavedHint: "The connection test uses already saved settings. Save your changes first.",
    footerActive: "WhatsApp active",
    footerInactive: "WhatsApp inactive",
    testSubtitleSuccess: "WhatsApp connection established",
    testSubtitleFail: "Connection failed",
    testApiSuccess: "The WhatsApp Business API responded successfully.",
    checkCredentials: "Check Meta credentials, then save.",
    accountName: "Account",
    phoneNumber: "Number",
    quality: "Quality",
    guideTitle: "Configure WhatsApp Business",
    guideDesc: "Create a Meta app, a WhatsApp Business number and a webhook pointing to Veritas.",
    guideSteps: [
      { title: "Create a Meta app", desc: "In Meta Developers, create an app with the WhatsApp product." },
      { title: "Copy credentials", desc: "Copy Phone Number ID, permanent token, App Secret and set a Verify Token." },
      { title: "Configure the webhook", desc: "Paste the Veritas webhook URL in Meta, subscribe to messages, then save and test here." }
    ],
    infoTitle: "About this integration",
    infoDesc: "Incoming WhatsApp messages create support tickets; replies from Veritas are sent back to the client.",
    infoApis: ["Incoming message intake", "Automatic ticket creation", "Outbound replies from Veritas"],
    infoFooter: "The webhook must be publicly reachable (HTTPS) for Meta verification."
  },
  de: {
    title: "WhatsApp Business",
    subtitle: "Kundennachrichten und Support-Tickets",
    configNavAria: "WhatsApp-Konfigurationsbereiche",
    sections: {
      connection: { description: "Meta-Zugangsdaten" },
      guide: { description: "Meta konfigurieren" },
      info: { description: "Webhook und Tickets" }
    },
    apiCredentials: "WhatsApp-Zugangsdaten",
    connectionDesc: "Verbinden Sie eine Meta WhatsApp-Business-App. Speichern Sie vor dem Test.",
    phoneNumberId: "Phone Number ID (Meta)",
    accessToken: "Permanenter Zugriffstoken",
    appSecret: "Meta-App-Secret",
    verifyToken: "Webhook-Verifizierungstoken",
    businessAccountId: "Business-Account-ID (optional)",
    apiVersion: "Graph-API-Version",
    webhookUrl: "Meta-Webhook-URL (Callback)",
    howToGetCredentials: "Wie konfiguriert man Meta?",
    fillCredentialsBeforeTest: "Mindestens Phone Number ID und Zugriffstoken vor dem Test eingeben.",
    testUsesSavedHint: "Der Test nutzt gespeicherte Einstellungen. Speichern Sie zuerst.",
    footerActive: "WhatsApp aktiv",
    footerInactive: "WhatsApp inaktiv",
    testSubtitleSuccess: "WhatsApp-Verbindung hergestellt",
    testSubtitleFail: "Verbindung fehlgeschlagen",
    testApiSuccess: "Die WhatsApp-Business-API hat korrekt geantwortet.",
    checkCredentials: "Meta-Zugangsdaten prüfen, dann speichern.",
    accountName: "Konto",
    phoneNumber: "Nummer",
    quality: "Qualität",
    guideTitle: "WhatsApp Business konfigurieren",
    guideDesc: "Erstellen Sie eine Meta-App, eine WhatsApp-Business-Nummer und einen Webhook zu Veritas.",
    guideSteps: [
      { title: "Meta-App erstellen", desc: "In Meta Developers eine App mit WhatsApp-Produkt anlegen." },
      { title: "Zugangsdaten kopieren", desc: "Phone Number ID, permanenten Token, App Secret und Verify Token setzen." },
      { title: "Webhook konfigurieren", desc: "Veritas-Webhook-URL in Meta eintragen, Messages abonnieren, speichern und testen." }
    ],
    infoTitle: "Über diese Integration",
    infoDesc: "Eingehende WhatsApp-Nachrichten erzeugen Support-Tickets; Antworten aus Veritas gehen an den Kunden.",
    infoApis: ["Eingehende Nachrichten", "Automatische Ticket-Erstellung", "Ausgehende Antworten aus Veritas"],
    infoFooter: "Der Webhook muss öffentlich erreichbar sein (HTTPS) für die Meta-Verifizierung."
  },
  it: {
    title: "WhatsApp Business",
    subtitle: "Messaggi clienti e ticket support",
    configNavAria: "Sezioni di configurazione WhatsApp",
    sections: {
      connection: { description: "Credenziali Meta" },
      guide: { description: "Configurare Meta" },
      info: { description: "Webhook e ticket" }
    },
    apiCredentials: "Credenziali WhatsApp",
    connectionDesc: "Collegate un’app Meta WhatsApp Business. Salvate prima di testare.",
    phoneNumberId: "Phone Number ID (Meta)",
    accessToken: "Token di accesso permanente",
    appSecret: "Secret dell’app Meta",
    verifyToken: "Token di verifica webhook",
    businessAccountId: "ID account Business (opzionale)",
    apiVersion: "Versione API Graph",
    webhookUrl: "URL webhook Meta (callback)",
    howToGetCredentials: "Come configurare Meta?",
    fillCredentialsBeforeTest: "Inserite almeno Phone Number ID e token di accesso prima di testare.",
    testUsesSavedHint: "Il test usa le impostazioni già salvate. Salvate prima le modifiche.",
    footerActive: "WhatsApp attivo",
    footerInactive: "WhatsApp inattivo",
    testSubtitleSuccess: "Connessione WhatsApp stabilita",
    testSubtitleFail: "Connessione non riuscita",
    testApiSuccess: "L’API WhatsApp Business ha risposto correttamente.",
    checkCredentials: "Verificate le credenziali Meta, poi salvate.",
    accountName: "Account",
    phoneNumber: "Numero",
    quality: "Qualità",
    guideTitle: "Configurare WhatsApp Business",
    guideDesc: "Create un’app Meta, un numero WhatsApp Business e un webhook verso Veritas.",
    guideSteps: [
      { title: "Creare un’app Meta", desc: "In Meta Developers create un’app con il prodotto WhatsApp." },
      { title: "Copiare le credenziali", desc: "Copiate Phone Number ID, token permanente, App Secret e impostate un Verify Token." },
      { title: "Configurare il webhook", desc: "Incollate l’URL webhook Veritas in Meta, iscrivete i messaggi, salvate e testate." }
    ],
    infoTitle: "Informazioni sull’integrazione",
    infoDesc: "I messaggi WhatsApp in entrata creano ticket; le risposte da Veritas tornano al cliente.",
    infoApis: ["Ricezione messaggi in entrata", "Creazione automatica ticket", "Risposte in uscita da Veritas"],
    infoFooter: "Il webhook deve essere raggiungibile pubblicamente (HTTPS) per la verifica Meta."
  },
  es: {
    title: "WhatsApp Business",
    subtitle: "Mensajes de clientes y tickets de soporte",
    configNavAria: "Secciones de configuración WhatsApp",
    sections: {
      connection: { description: "Credenciales Meta" },
      guide: { description: "Configurar Meta" },
      info: { description: "Webhook y tickets" }
    },
    apiCredentials: "Credenciales WhatsApp",
    connectionDesc: "Conecte una app Meta WhatsApp Business. Guarde antes de probar.",
    phoneNumberId: "Phone Number ID (Meta)",
    accessToken: "Token de acceso permanente",
    appSecret: "Secreto de la aplicación Meta",
    verifyToken: "Token de verificación webhook",
    businessAccountId: "ID de cuenta Business (opcional)",
    apiVersion: "Versión API Graph",
    webhookUrl: "URL webhook Meta (callback)",
    howToGetCredentials: "¿Cómo configurar Meta?",
    fillCredentialsBeforeTest: "Introduzca al menos el Phone Number ID y el token de acceso antes de probar.",
    testUsesSavedHint: "La prueba usa los ajustes ya guardados. Guarde primero los cambios.",
    footerActive: "WhatsApp activo",
    footerInactive: "WhatsApp inactivo",
    testSubtitleSuccess: "Conexión WhatsApp establecida",
    testSubtitleFail: "Conexión fallida",
    testApiSuccess: "La API WhatsApp Business respondió correctamente.",
    checkCredentials: "Verifique las credenciales Meta y guarde.",
    accountName: "Cuenta",
    phoneNumber: "Número",
    quality: "Calidad",
    guideTitle: "Configurar WhatsApp Business",
    guideDesc: "Cree una app Meta, un número WhatsApp Business y un webhook hacia Veritas.",
    guideSteps: [
      { title: "Crear una app Meta", desc: "En Meta Developers, cree una app con el producto WhatsApp." },
      { title: "Copiar credenciales", desc: "Copie Phone Number ID, token permanente, App Secret y defina un Verify Token." },
      { title: "Configurar el webhook", desc: "Pegue la URL webhook de Veritas en Meta, suscriba mensajes, guarde y pruebe." }
    ],
    infoTitle: "Acerca de esta integración",
    infoDesc: "Los mensajes WhatsApp entrantes crean tickets; las respuestas desde Veritas vuelven al cliente.",
    infoApis: ["Recepción de mensajes entrantes", "Creación automática de tickets", "Respuestas salientes desde Veritas"],
    infoFooter: "El webhook debe ser accesible públicamente (HTTPS) para la verificación Meta."
  }
};
const getShared = createLocaleGetter(SHARED);
function mergeModalCopy(locale, specificCatalog) {
  const shared = getShared(locale);
  const specific = pickLocaleMessages(specificCatalog, locale);
  const sections = {
    connection: {
      ...shared.sections.connection,
      ...(specific.sections?.connection || {})
    },
    guide: {
      ...shared.sections.guide,
      ...(specific.sections?.guide || {})
    },
    info: {
      ...shared.sections.info,
      ...(specific.sections?.info || {})
    }
  };
  return {
    ...shared,
    ...specific,
    sections
  };
}
export function getBitdefenderIntegrationModalCopy(locale) {
  return mergeModalCopy(locale, BITDEFENDER);
}
export function getMailinblackIntegrationModalCopy(locale) {
  return mergeModalCopy(locale, MAILINBLACK);
}
export function getOvhIntegrationModalCopy(locale) {
  return mergeModalCopy(locale, OVH);
}
export function getAiIntegrationModalCopy(locale) {
  return mergeModalCopy(locale, AI);
}
export function getCheckmkIntegrationModalCopy(locale) {
  return mergeModalCopy(locale, CHECKMK);
}
const UNIFI = {
  fr: {
    title: "UniFi",
    subtitle: "Site Manager, Network et Carrier Fabric",
    configNavAria: "Sections de configuration UniFi",
    sections: {
      connection: { description: "Clés API Ubiquiti" },
      guide: { description: "Créer les API keys" },
      info: { description: "Import matériel" }
    },
    apiCredentials: "Clés API UniFi",
    connectionDesc: "Tenant global MSP : renseignez les clés générées sur unifi.ui.com (Site Manager, Network, Carrier Fabric). Le test utilise la clé sélectionnée, sans enregistrement préalable.",
    siteManagerKey: "Clé Site Manager",
    networkKey: "Clé Network",
    carrierKey: "Clé Carrier Fabric",
    keyPlaceholder: "X-API-KEY…",
    testApiLabel: "API à tester",
    apiLabels: {
      "site-manager": "Site Manager",
      network: "Network",
      "carrier-fabric": "Carrier Fabric"
    },
    howToGetCredentials: "Comment obtenir les clés API ?",
    fillCredentialsBeforeTest: "Renseignez la clé de l’API sélectionnée avant de tester.",
    testUsesFormHint: "Le test utilise la clé saisie pour l’API choisie, sans sauvegarde.",
    footerActive: "UniFi actif",
    footerInactive: "UniFi inactif",
    testSubtitleSuccess: "Connexion UniFi établie",
    testSubtitleFail: "Échec de la connexion",
    testApiSuccess: "L’API UniFi a répondu correctement.",
    checkCredentials: "Vérifiez la clé API et ses scopes.",
    hosts: "Consoles",
    sites: "Sites",
    subscribers: "Abonnés",
    guideTitle: "Obtenir vos clés API",
    guideDesc: "Créez des API Keys dans UniFi Site Manager (unifi.ui.com) avec les scopes adaptés.",
    guideSteps: [
      { title: "Ouvrez unifi.ui.com", desc: "Connectez-vous avec le compte MSP qui voit les sites clients." },
      { title: "Settings → API Keys", desc: "Créez une clé Site Manager (inventaire), une clé Network (détails via Connector) et une clé Carrier Fabric si besoin ISP." },
      { title: "Renseignez et testez", desc: "Collez les clés ici, testez chaque API, puis enregistrez. Liez ensuite un site UniFi sur chaque fiche entreprise." }
    ],
    infoTitle: "À propos de cette intégration",
    infoDesc: "UniFi alimente l’import de switches, gateways et bornes Wi‑Fi depuis le site lié à chaque entreprise Veritas.",
    infoApis: [
      "Site Manager : hosts, sites, devices",
      "Network (Connector) : détails devices enrichis",
      "Carrier Fabric : abonnés ISP (lien optionnel)"
    ],
    infoFooter: "Après configuration, ouvrez une fiche entreprise pour lier un site UniFi, puis utilisez « Importer depuis UniFi » sur le matériel."
  },
  en: {
    title: "UniFi",
    subtitle: "Site Manager, Network and Carrier Fabric",
    configNavAria: "UniFi configuration sections",
    sections: {
      connection: { description: "Ubiquiti API keys" },
      guide: { description: "Create API keys" },
      info: { description: "Hardware import" }
    },
    apiCredentials: "UniFi API keys",
    connectionDesc: "Global MSP tenant: enter keys from unifi.ui.com (Site Manager, Network, Carrier Fabric). The test uses the selected key without saving first.",
    siteManagerKey: "Site Manager key",
    networkKey: "Network key",
    carrierKey: "Carrier Fabric key",
    keyPlaceholder: "X-API-KEY…",
    testApiLabel: "API to test",
    apiLabels: {
      "site-manager": "Site Manager",
      network: "Network",
      "carrier-fabric": "Carrier Fabric"
    },
    howToGetCredentials: "How do I get API keys?",
    fillCredentialsBeforeTest: "Enter the key for the selected API before testing.",
    testUsesFormHint: "The test uses the key entered for the chosen API, without saving.",
    footerActive: "UniFi active",
    footerInactive: "UniFi inactive",
    testSubtitleSuccess: "UniFi connection established",
    testSubtitleFail: "Connection failed",
    testApiSuccess: "The UniFi API responded correctly.",
    checkCredentials: "Check the API key and its scopes.",
    hosts: "Consoles",
    sites: "Sites",
    subscribers: "Subscribers",
    guideTitle: "Get your API keys",
    guideDesc: "Create API Keys in UniFi Site Manager (unifi.ui.com) with the right scopes.",
    guideSteps: [
      { title: "Open unifi.ui.com", desc: "Sign in with the MSP account that can see client sites." },
      { title: "Settings → API Keys", desc: "Create a Site Manager key (inventory), a Network key (Connector details) and a Carrier Fabric key if you need ISP." },
      { title: "Enter and test", desc: "Paste the keys here, test each API, then save. Link a UniFi site on each company record." }
    ],
    infoTitle: "About this integration",
    infoDesc: "UniFi powers importing switches, gateways and Wi‑Fi APs from the site linked to each Veritas company.",
    infoApis: [
      "Site Manager: hosts, sites, devices",
      "Network (Connector): enriched device details",
      "Carrier Fabric: ISP subscribers (optional link)"
    ],
    infoFooter: "After setup, open a company record to link a UniFi site, then use “Import from UniFi” on hardware."
  },
  de: {
    title: "UniFi",
    subtitle: "Site Manager, Network und Carrier Fabric",
    configNavAria: "UniFi-Konfigurationsabschnitte",
    sections: {
      connection: { description: "Ubiquiti-API-Schlüssel" },
      guide: { description: "API-Keys erstellen" },
      info: { description: "Hardware-Import" }
    },
    apiCredentials: "UniFi-API-Schlüssel",
    connectionDesc: "Globaler MSP-Tenant: Schlüssel von unifi.ui.com eintragen. Der Test nutzt den gewählten Schlüssel ohne vorheriges Speichern.",
    siteManagerKey: "Site-Manager-Schlüssel",
    networkKey: "Network-Schlüssel",
    carrierKey: "Carrier-Fabric-Schlüssel",
    keyPlaceholder: "X-API-KEY…",
    testApiLabel: "Zu testende API",
    apiLabels: {
      "site-manager": "Site Manager",
      network: "Network",
      "carrier-fabric": "Carrier Fabric"
    },
    howToGetCredentials: "Wie erhalte ich API-Schlüssel?",
    fillCredentialsBeforeTest: "Geben Sie den Schlüssel der gewählten API vor dem Test ein.",
    testUsesFormHint: "Der Test nutzt den eingegebenen Schlüssel der gewählten API, ohne Speichern.",
    footerActive: "UniFi aktiv",
    footerInactive: "UniFi inaktiv",
    testSubtitleSuccess: "UniFi-Verbindung hergestellt",
    testSubtitleFail: "Verbindung fehlgeschlagen",
    testApiSuccess: "Die UniFi-API hat korrekt geantwortet.",
    checkCredentials: "Prüfen Sie den API-Schlüssel und die Scopes.",
    hosts: "Konsolen",
    sites: "Sites",
    subscribers: "Abonnenten",
    guideTitle: "API-Schlüssel holen",
    guideDesc: "Erstellen Sie API Keys in UniFi Site Manager (unifi.ui.com).",
    guideSteps: [
      { title: "unifi.ui.com öffnen", desc: "Mit dem MSP-Konto anmelden, das Kundensites sieht." },
      { title: "Settings → API Keys", desc: "Site-Manager-, Network- und ggf. Carrier-Fabric-Schlüssel erstellen." },
      { title: "Eintragen und testen", desc: "Schlüssel hier einfügen, testen und speichern. Anschließend Site pro Unternehmen verknüpfen." }
    ],
    infoTitle: "Über diese Integration",
    infoDesc: "UniFi importiert Switches, Gateways und WLAN-APs vom verknüpften Site.",
    infoApis: ["Site Manager: Hosts, Sites, Devices", "Network (Connector): Gerätedetails", "Carrier Fabric: ISP-Abonnenten"],
    infoFooter: "Nach der Einrichtung Site auf der Unternehmensakte verknüpfen und Hardware importieren."
  },
  it: {
    title: "UniFi",
    subtitle: "Site Manager, Network e Carrier Fabric",
    configNavAria: "Sezioni di configurazione UniFi",
    sections: {
      connection: { description: "Chiavi API Ubiquiti" },
      guide: { description: "Creare le API key" },
      info: { description: "Import hardware" }
    },
    apiCredentials: "Chiavi API UniFi",
    connectionDesc: "Tenant MSP globale: inserite le chiavi da unifi.ui.com. Il test usa la chiave selezionata senza salvare.",
    siteManagerKey: "Chiave Site Manager",
    networkKey: "Chiave Network",
    carrierKey: "Chiave Carrier Fabric",
    keyPlaceholder: "X-API-KEY…",
    testApiLabel: "API da testare",
    apiLabels: {
      "site-manager": "Site Manager",
      network: "Network",
      "carrier-fabric": "Carrier Fabric"
    },
    howToGetCredentials: "Come ottenere le chiavi API?",
    fillCredentialsBeforeTest: "Inserite la chiave dell’API selezionata prima del test.",
    testUsesFormHint: "Il test usa la chiave inserita per l’API scelta, senza salvare.",
    footerActive: "UniFi attivo",
    footerInactive: "UniFi inattivo",
    testSubtitleSuccess: "Connessione UniFi stabilita",
    testSubtitleFail: "Connessione non riuscita",
    testApiSuccess: "L’API UniFi ha risposto correttamente.",
    checkCredentials: "Verificate la chiave API e gli scope.",
    hosts: "Console",
    sites: "Siti",
    subscribers: "Abbonati",
    guideTitle: "Ottenere le chiavi API",
    guideDesc: "Create API Keys in UniFi Site Manager (unifi.ui.com).",
    guideSteps: [
      { title: "Aprite unifi.ui.com", desc: "Accedete con l’account MSP che vede i siti clienti." },
      { title: "Settings → API Keys", desc: "Create chiavi Site Manager, Network e Carrier Fabric se serve." },
      { title: "Inserite e testate", desc: "Incollate le chiavi, testate e salvate. Poi collegate un sito su ogni azienda." }
    ],
    infoTitle: "Informazioni sull’integrazione",
    infoDesc: "UniFi importa switch, gateway e AP Wi‑Fi dal sito collegato all’azienda.",
    infoApis: ["Site Manager: host, siti, device", "Network (Connector): dettagli device", "Carrier Fabric: abbonati ISP"],
    infoFooter: "Dopo la configurazione, collegate un sito UniFi sulla scheda azienda e importate l’hardware."
  },
  es: {
    title: "UniFi",
    subtitle: "Site Manager, Network y Carrier Fabric",
    configNavAria: "Secciones de configuración UniFi",
    sections: {
      connection: { description: "Claves API Ubiquiti" },
      guide: { description: "Crear API keys" },
      info: { description: "Importación de hardware" }
    },
    apiCredentials: "Claves API UniFi",
    connectionDesc: "Tenant MSP global: introduzca las claves de unifi.ui.com. La prueba usa la clave seleccionada sin guardar.",
    siteManagerKey: "Clave Site Manager",
    networkKey: "Clave Network",
    carrierKey: "Clave Carrier Fabric",
    keyPlaceholder: "X-API-KEY…",
    testApiLabel: "API a probar",
    apiLabels: {
      "site-manager": "Site Manager",
      network: "Network",
      "carrier-fabric": "Carrier Fabric"
    },
    howToGetCredentials: "¿Cómo obtener las claves API?",
    fillCredentialsBeforeTest: "Introduzca la clave de la API seleccionada antes de probar.",
    testUsesFormHint: "La prueba usa la clave introducida para la API elegida, sin guardar.",
    footerActive: "UniFi activo",
    footerInactive: "UniFi inactivo",
    testSubtitleSuccess: "Conexión UniFi establecida",
    testSubtitleFail: "Conexión fallida",
    testApiSuccess: "La API UniFi respondió correctamente.",
    checkCredentials: "Compruebe la clave API y sus scopes.",
    hosts: "Consolas",
    sites: "Sitios",
    subscribers: "Suscriptores",
    guideTitle: "Obtener claves API",
    guideDesc: "Cree API Keys en UniFi Site Manager (unifi.ui.com).",
    guideSteps: [
      { title: "Abra unifi.ui.com", desc: "Inicie sesión con la cuenta MSP que ve los sitios de clientes." },
      { title: "Settings → API Keys", desc: "Cree claves Site Manager, Network y Carrier Fabric si aplica." },
      { title: "Introduzca y pruebe", desc: "Pegue las claves, pruebe y guarde. Luego vincule un sitio en cada empresa." }
    ],
    infoTitle: "Acerca de esta integración",
    infoDesc: "UniFi importa switches, gateways y APs Wi‑Fi desde el sitio vinculado a cada empresa.",
    infoApis: ["Site Manager: hosts, sitios, devices", "Network (Connector): detalle de devices", "Carrier Fabric: suscriptores ISP"],
    infoFooter: "Tras la configuración, vincule un sitio UniFi en la ficha empresa e importe el hardware."
  }
};
export function getUnifiIntegrationModalCopy(locale) {
  return mergeModalCopy(locale, UNIFI);
}
const HYCU = {
  fr: {
    title: "HYCU Backup",
    subtitle: "R-Cloud Hybrid Cloud Edition",
    configNavAria: "Sections de configuration HYCU",
    sections: {
      connection: { description: "URL contrôleur et identifiants" },
      guide: { description: "Obtenir une clé API" },
      info: { description: "Usage sauvegarde" }
    },
    apiCredentials: "Identifiants HYCU",
    connectionDesc: "Renseignez l’URL du contrôleur HYCU Hybrid et une clé API (recommandé). User/mot de passe servent de secours via requestToken.",
    apiUrl: "URL du contrôleur",
    apiKey: "Clé API",
    username: "Nom d’utilisateur (secours)",
    password: "Mot de passe (secours)",
    verifyTls: "Vérifier le certificat TLS",
    verifyTlsYes: "Oui (recommandé en prod)",
    verifyTlsNo: "Non (lab / certificat auto-signé)",
    fillCredentialsBeforeTest: "Renseignez l’URL et une clé API (ou user/mot de passe) avant de tester.",
    testUsesFormHint: "Le test utilise les valeurs saisies, sans sauvegarde préalable.",
    footerActive: "HYCU actif",
    footerInactive: "HYCU inactif",
    testSubtitleSuccess: "Connexion HYCU établie",
    testSubtitleFail: "Échec de la connexion",
    testApiSuccess: "L’API HYCU a répondu correctement.",
    checkCredentials: "Vérifiez l’URL et les identifiants.",
    jobs: "Jobs / backups",
    guideTitle: "Obtenir vos identifiants",
    guideDesc: "Générez une clé API depuis le contrôleur HYCU R-Cloud Hybrid, ou utilisez un compte avec requestToken.",
    guideSteps: [
      { title: "Ouvrez le contrôleur HYCU", desc: "Connectez-vous à l’interface web du contrôleur (souvent https://hôte:8443)." },
      { title: "Créez une clé API", desc: "Dans le menu utilisateur, générez une API key dédiée MSP (expiration selon votre politique)." },
      { title: "Renseignez et testez", desc: "Collez l’URL du contrôleur et la clé ici, testez, puis enregistrez. Mappez ensuite les jobs sur les instances HYCU Backup." }
    ],
    infoTitle: "À propos de cette intégration",
    infoDesc: "HYCU alimente le statut des jobs de sauvegarde des instances « HYCU Backup » (last backup).",
    infoApis: ["Inventaire jobs / backup sets", "Mapping job Veritas ↔ job HYCU", "Sync last_backup_*"],
    infoFooter: "Un job ne peut avoir qu’une source de sync : mapper HYCU remplace un mapping CheckMK existant (alerte côté UI)."
  },
  en: {
    title: "HYCU Backup",
    subtitle: "R-Cloud Hybrid Cloud Edition",
    configNavAria: "HYCU configuration sections",
    sections: {
      connection: { description: "Controller URL and credentials" },
      guide: { description: "Get an API key" },
      info: { description: "Backup usage" }
    },
    apiCredentials: "HYCU credentials",
    connectionDesc: "Enter the HYCU Hybrid controller URL and an API key (recommended). Username/password are a fallback via requestToken.",
    apiUrl: "Controller URL",
    apiKey: "API key",
    username: "Username (fallback)",
    password: "Password (fallback)",
    verifyTls: "Verify TLS certificate",
    verifyTlsYes: "Yes (recommended in prod)",
    verifyTlsNo: "No (lab / self-signed)",
    fillCredentialsBeforeTest: "Enter the URL and an API key (or username/password) before testing.",
    testUsesFormHint: "The test uses the form values, without saving first.",
    footerActive: "HYCU active",
    footerInactive: "HYCU inactive",
    testSubtitleSuccess: "HYCU connection established",
    testSubtitleFail: "Connection failed",
    testApiSuccess: "The HYCU API responded successfully.",
    checkCredentials: "Check the URL and credentials.",
    jobs: "Jobs / backups",
    guideTitle: "Get your credentials",
    guideDesc: "Generate an API key from the HYCU R-Cloud Hybrid controller, or use an account with requestToken.",
    guideSteps: [
      { title: "Open the HYCU controller", desc: "Sign in to the controller web UI (often https://host:8443)." },
      { title: "Create an API key", desc: "From the user menu, generate a dedicated MSP API key." },
      { title: "Enter and test", desc: "Paste the controller URL and key here, test, then save. Map jobs on HYCU Backup instances afterwards." }
    ],
    infoTitle: "About this integration",
    infoDesc: "HYCU powers backup job status for « HYCU Backup » instances (last backup).",
    infoApis: ["Jobs / backup sets inventory", "Veritas job ↔ HYCU job mapping", "Sync last_backup_*"],
    infoFooter: "A job can have only one sync source: mapping HYCU replaces an existing CheckMK mapping (UI warning)."
  }
};
export function getHycuIntegrationModalCopy(locale) {
  return mergeModalCopy(locale, HYCU);
}
export function getWhatsappIntegrationModalCopy(locale) {
  return mergeModalCopy(locale, WHATSAPP);
}
export function getOvhApiGuideCopy(locale) {
  return pickLocaleMessages(OVH_GUIDE, locale);
}
export function formatCountLabel(locale, count, singularKey, pluralKey) {
  const shared = getShared(locale);
  const n = Number(count) || 0;
  const template = n === 1 ? shared[singularKey] : shared[pluralKey];
  return interpolate(template, {
    count: n
  });
}
export { interpolate };
