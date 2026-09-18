export const SETUP_LOCALES = [{
  code: "en",
  flag: "🇬🇧",
  label: "English"
}, {
  code: "es",
  flag: "🇪🇸",
  label: "Español"
}, {
  code: "fr",
  flag: "🇫🇷",
  label: "Français"
}, {
  code: "de",
  flag: "🇩🇪",
  label: "Deutsch"
}, {
  code: "it",
  flag: "🇮🇹",
  label: "Italiano"
}];
const en = {
  intro: {
    tagline: "Truth in your infrastructure",
    subtitle: "Setting up your platform",
    skip: "Click or press Esc to skip"
  },
  layout: {
    title: "Initial setup",
    subtitle: "Follow the steps below to install Veritas.",
    steps: {
      env: "Settings",
      database: "Database",
      schema: "Preparation",
      admin: "Administrator",
      mfa: "Two-factor auth"
    },
    discord: "Join Veritas on Discord",
    discordHint: "Need help? Our community is here for you.",
    communityTitle: "Community & resources",
    linkDiscord: "Discord",
    linkWebsite: "Website",
    linkGithub: "GitHub",
    websiteAria: "Veritas website — veritas-msp.com",
    githubAria: "Veritas source code on GitHub",
    communityHint: "Help, docs, updates and open source — all in one place.",
    themeUseLight: "Switch to light mode",
    themeUseDark: "Switch to dark mode"
  },
  availability: {
    checking: "Checking installation…",
    serverTitle: "Veritas server unreachable",
    serverBody: "The web app cannot reach the Veritas API. Check that the backend container/service is running, then try again.",
    databaseTitle: "Database unreachable",
    databaseBody: "The Veritas server is up, but PostgreSQL does not respond. Check that the database is running and that DATABASE_URL is correct.",
    hint: "Initial setup only opens when the database is reachable and installation is still incomplete.",
    retry: "Retry",
    retrying: "Retrying…"
  },
  env: {
    title: "General settings",
    subtitle: "Default values work for a local install. You can auto-generate security keys.",
    jwtSecret: {
      label: "Session security key",
      hint: "Keeps user logins secure. Leave empty to generate automatically.",
      placeholder: "Auto-generated if empty"
    },
    encryptionKey: {
      label: "Encryption key",
      hint: "Protects stored passwords. Leave empty to generate automatically. Do not change it later.",
      placeholder: "Auto-generated if empty"
    },
    allowedOrigins: {
      label: "Allowed website address",
      hint: "On your computer: http://localhost:3000. In production: your site URL. Several addresses allowed, separated by commas."
    },
    frontendBaseUrl: {
      label: "Application address",
      hint: "The main address where users open Veritas. On your computer: http://localhost:3000. Several entries allowed, separated by commas (the first is used for emails)."
    },
    apiBaseUrl: {
      label: "API server address",
      hint: "Where the web app calls the API. On your computer: http://localhost:3001. The port in this URL is also used to start the backend."
    },
    generateSecrets: "Generate keys",
    continue: "Continue",
    saving: "Saving…"
  },
  database: {
    title: "Database connection",
    subtitle: "Enter the details from when you created your PostgreSQL database.",
    subtitleDocker: "Docker already provides the database. Fields are pre-filled — just click Test and continue (default password is the POSTGRES_PASSWORD in your .env, often changeme).",
    host: {
      label: "Server",
      hint: "Often localhost or an address provided by your host. With Docker Compose use db."
    },
    port: {
      label: "Port",
      hint: "Usually 5432. Leave as is unless told otherwise."
    },
    name: {
      label: "Database name",
      hint: "The database must already exist."
    },
    user: {
      label: "Username",
      hint: "The user who can access this database."
    },
    password: {
      label: "Password",
      hint: "The password for this user."
    },
    back: "Back",
    testContinue: "Test and continue",
    testing: "Testing…"
  },
  schema: {
    title: "Prepare the database",
    subtitle: "Creates the tables Veritas needs. Click the button and wait until it finishes.",
    back: "Back",
    run: "Prepare database",
    rerun: "Run again",
    running: "In progress…",
    continue: "Continue",
    progress: "{{completed}} / {{total}}",
    applying: "Applying: {{name}}"
  },
  admin: {
    title: "Administrator account",
    subtitle: "This is the account you will use to sign in and manage Veritas.",
    email: {
      label: "Email",
      hint: "Your sign-in email."
    },
    username: {
      label: "Display name (optional)",
      hint: "How your name appears in the app."
    },
    password: {
      label: "Password",
      hint: "Use a strong password (see requirements below)."
    },
    passwordConfirm: {
      label: "Confirm password",
      hint: "Enter the same password again."
    },
    passwordStrength: {
      title: "Password strength",
      strength: {
        empty: "—",
        weak: "Weak",
        fair: "Fair",
        strong: "Strong"
      },
      rules: {
        length: "At least {{min}} characters",
        lowercase: "One lowercase letter",
        uppercase: "One uppercase letter",
        digit: "One number",
        special: "One special character"
      }
    },
    back: "Back",
    continueToMfa: "Continue to MFA",
    creating: "Creating…",
    alreadyCreated: "Your administrator account is already set up. Continue to configure two-factor authentication."
  },
  mfa: {
    title: "Secure your administrator account",
    subtitle: "Two-factor authentication (MFA) is required. Scan the QR code with an app such as Microsoft Authenticator or Google Authenticator, then enter the 6-digit code.",
    loading: "Preparing MFA setup…",
    manualKey: "Manual key:",
    codeLabel: "Authentication code",
    codeHint: "Enter the 6-digit code from your authenticator app.",
    codePlaceholder: "000000",
    finish: "Finish installation",
    verifying: "Verifying…",
    qrAlt: "MFA QR code"
  },
  toasts: {
    serverUnreachable: "Cannot reach the Veritas server.",
    secretsGenerated: "Keys generated.",
    envSaved: "Settings saved.",
    envSavedRestartFrontend: "Settings saved. Restart the web app if you changed the server address.",
    dbValidated: "Database connection OK.",
    migrationsApplied: "{{count}} step(s) completed.",
    passwordMismatch: "Passwords do not match.",
    passwordWeak: "Password does not meet the security requirements.",
    setupComplete: "Installation complete!"
  },
  errors: {
    generic: "Something went wrong. Please try again.",
    NETWORK_ERROR: "Network error. Check your connection and try again.",
    SETUP_STATUS_READ_FAILED: "Unable to read installation status.",
    SETUP_ENV_WRITE_FAILED: "Unable to write the environment file.",
    SETUP_DB_CONNECTION_FAILED: "Unable to connect to the database. Check your credentials and that PostgreSQL is running.",
    SETUP_MIGRATIONS_LIST_FAILED: "Unable to read pending migrations.",
    SETUP_MIGRATION_FAILED: "Database preparation failed.",
    SETUP_ADMIN_ALREADY_EXISTS: "An administrator account already exists.",
    SETUP_ADMIN_CREATE_FAILED: "Unable to create the administrator account.",
    SETUP_ALREADY_COMPLETE: "Initial setup is already complete.",
    SETUP_VALIDATION_FAILED: "Some fields are invalid. Check the form and try again.",
    SETUP_PASSWORD_WEAK: "Password does not meet security requirements.",
    SETUP_MFA_INVALID_CODE: "Invalid code. Try again.",
    SETUP_MFA_SETUP_FAILED: "Unable to start MFA setup.",
    SETUP_MFA_VERIFY_FAILED: "Unable to verify MFA code."
  },
  validation: {
    valueMissing: "Please fill in this field.",
    numberRequired: "Please enter a number.",
    invalidUrl: "Please enter a valid URL.",
    invalidEmail: "Please enter a valid email address.",
    numberMin: "Value must be at least {{min}}.",
    numberMax: "Value must be at most {{max}}.",
    tooShort: "Please use at least {{min}} characters."
  }
};
const fr = {
  intro: {
    tagline: "La vérité au cœur de votre infrastructure",
    subtitle: "Mise en place de votre plateforme",
    skip: "Cliquer ou Échap pour passer"
  },
  layout: {
    title: "Configuration initiale",
    subtitle: "Suivez les étapes pour installer Veritas.",
    steps: {
      env: "Paramètres",
      database: "Base de données",
      schema: "Préparation",
      admin: "Administrateur",
      mfa: "Double authentification"
    },
    discord: "Rejoindre Veritas sur Discord",
    discordHint: "Besoin d'aide ? La communauté est là pour vous.",
    communityTitle: "Communauté & ressources",
    linkDiscord: "Discord",
    linkWebsite: "Site web",
    linkGithub: "GitHub",
    websiteAria: "Site Veritas — veritas-msp.com",
    githubAria: "Code source Veritas sur GitHub",
    communityHint: "Aide, doc, actualités et open source — au même endroit.",
    themeUseLight: "Passer en mode clair",
    themeUseDark: "Passer en mode sombre"
  },
  availability: {
    checking: "Vérification de l'installation…",
    serverTitle: "Serveur Veritas injoignable",
    serverBody: "L'interface ne peut pas joindre l'API Veritas. Vérifiez que le service backend est démarré, puis réessayez.",
    databaseTitle: "Base de données injoignable",
    databaseBody: "Le serveur Veritas répond, mais PostgreSQL ne répond pas. Vérifiez que la base est démarrée et que DATABASE_URL est correct.",
    hint: "La configuration initiale ne s'affiche que lorsque la base est joignable et que l'installation n'est pas terminée.",
    retry: "Réessayer",
    retrying: "Nouvelle tentative…"
  },
  env: {
    title: "Paramètres généraux",
    subtitle: "Les valeurs par défaut conviennent pour une installation locale. Vous pouvez générer les clés automatiquement.",
    jwtSecret: {
      label: "Clé de sécurité des connexions",
      hint: "Protège les sessions. Laissez vide pour générer automatiquement.",
      placeholder: "Généré automatiquement si vide"
    },
    encryptionKey: {
      label: "Clé de chiffrement",
      hint: "Protège les mots de passe enregistrés. Laissez vide pour générer. Ne la modifiez pas ensuite.",
      placeholder: "Généré automatiquement si vide"
    },
    allowedOrigins: {
      label: "Adresse web autorisée",
      hint: "Sur votre PC : http://localhost:3000. En production : l'URL de votre site. Plusieurs adresses possibles, séparées par des virgules."
    },
    frontendBaseUrl: {
      label: "Adresse de l'application",
      hint: "L'adresse principale où les utilisateurs ouvrent Veritas. Sur votre PC : http://localhost:3000. Plusieurs entrées possibles, séparées par des virgules (la première sert pour les e-mails)."
    },
    apiBaseUrl: {
      label: "Adresse du serveur API",
      hint: "Où l'application appelle l'API. Sur votre PC : http://localhost:3001. Le port indiqué dans cette URL sert aussi au démarrage du backend."
    },
    generateSecrets: "Générer les clés",
    continue: "Continuer",
    saving: "Enregistrement…"
  },
  database: {
    title: "Connexion à la base",
    subtitle: "Renseignez les informations fournies lors de la création de votre base PostgreSQL.",
    subtitleDocker: "Docker fournit déjà la base. Les champs sont préremplis — cliquez sur Tester et continuer (mot de passe = POSTGRES_PASSWORD dans votre .env, souvent changeme).",
    host: {
      label: "Serveur",
      hint: "Souvent localhost ou une adresse fournie par votre hébergeur. Avec Docker Compose : db."
    },
    port: {
      label: "Port",
      hint: "En général 5432. Laissez tel quel sauf indication contraire."
    },
    name: {
      label: "Nom de la base",
      hint: "La base doit déjà exister."
    },
    user: {
      label: "Utilisateur",
      hint: "L'utilisateur qui accède à cette base."
    },
    password: {
      label: "Mot de passe",
      hint: "Le mot de passe de cet utilisateur."
    },
    back: "Retour",
    testContinue: "Tester et continuer",
    testing: "Test en cours…"
  },
  schema: {
    title: "Préparer la base",
    subtitle: "Crée les tables nécessaires. Cliquez sur le bouton et attendez la fin.",
    back: "Retour",
    run: "Préparer la base",
    rerun: "Relancer",
    running: "En cours…",
    continue: "Continuer",
    progress: "{{completed}} / {{total}}",
    applying: "En cours : {{name}}"
  },
  admin: {
    title: "Compte administrateur",
    subtitle: "C'est le compte que vous utiliserez pour vous connecter et gérer Veritas.",
    email: {
      label: "Email",
      hint: "Votre email de connexion."
    },
    username: {
      label: "Nom affiché (optionnel)",
      hint: "Comment votre nom apparaît dans l'application."
    },
    password: {
      label: "Mot de passe",
      hint: "Utilisez un mot de passe fort (voir les critères ci-dessous)."
    },
    passwordConfirm: {
      label: "Confirmer le mot de passe",
      hint: "Retapez le même mot de passe."
    },
    passwordStrength: {
      title: "Force du mot de passe",
      strength: {
        empty: "—",
        weak: "Faible",
        fair: "Moyen",
        strong: "Fort"
      },
      rules: {
        length: "Au moins {{min}} caractères",
        lowercase: "Une lettre minuscule",
        uppercase: "Une lettre majuscule",
        digit: "Un chiffre",
        special: "Un caractère spécial"
      }
    },
    back: "Retour",
    continueToMfa: "Continuer vers le MFA",
    creating: "Création…",
    alreadyCreated: "Votre compte administrateur est déjà créé. Continuez pour configurer l'authentification à deux facteurs."
  },
  mfa: {
    title: "Sécurisez le compte administrateur",
    subtitle: "L'authentification à deux facteurs (MFA) est obligatoire. Scannez le QR code avec une application comme Microsoft Authenticator ou Google Authenticator, puis saisissez le code à 6 chiffres.",
    loading: "Préparation du MFA…",
    manualKey: "Clé manuelle :",
    codeLabel: "Code d'authentification",
    codeHint: "Saisissez le code à 6 chiffres affiché dans votre application.",
    codePlaceholder: "000000",
    finish: "Terminer l'installation",
    verifying: "Vérification…",
    qrAlt: "QR code MFA"
  },
  toasts: {
    serverUnreachable: "Impossible de contacter le serveur Veritas.",
    secretsGenerated: "Clés générées.",
    envSaved: "Paramètres enregistrés.",
    envSavedRestartFrontend: "Paramètres enregistrés. Redémarrez l'app web si vous avez changé l'adresse du serveur.",
    dbValidated: "Connexion à la base validée.",
    migrationsApplied: "{{count}} étape(s) terminée(s).",
    passwordMismatch: "Les mots de passe ne correspondent pas.",
    passwordWeak: "Le mot de passe ne respecte pas les critères de sécurité.",
    setupComplete: "Installation terminée !"
  },
  errors: {
    generic: "Une erreur est survenue. Veuillez réessayer.",
    NETWORK_ERROR: "Erreur réseau. Vérifiez votre connexion et réessayez.",
    SETUP_STATUS_READ_FAILED: "Impossible de lire l'état d'installation.",
    SETUP_ENV_WRITE_FAILED: "Impossible d'écrire le fichier d'environnement.",
    SETUP_DB_CONNECTION_FAILED: "Connexion à la base impossible. Vérifiez les identifiants et que PostgreSQL est démarré.",
    SETUP_MIGRATIONS_LIST_FAILED: "Impossible de lire les migrations en attente.",
    SETUP_MIGRATION_FAILED: "Échec de la préparation de la base.",
    SETUP_ADMIN_ALREADY_EXISTS: "Un compte administrateur existe déjà.",
    SETUP_ADMIN_CREATE_FAILED: "Impossible de créer le compte administrateur.",
    SETUP_ALREADY_COMPLETE: "La configuration initiale est déjà terminée.",
    SETUP_VALIDATION_FAILED: "Certains champs sont invalides. Vérifiez le formulaire et réessayez.",
    SETUP_PASSWORD_WEAK: "Le mot de passe ne respecte pas les critères de sécurité.",
    SETUP_MFA_INVALID_CODE: "Code invalide. Réessayez.",
    SETUP_MFA_SETUP_FAILED: "Impossible de démarrer la configuration MFA.",
    SETUP_MFA_VERIFY_FAILED: "Impossible de vérifier le code MFA."
  },
  validation: {
    valueMissing: "Veuillez renseigner ce champ.",
    numberRequired: "Veuillez saisir un nombre.",
    invalidUrl: "Veuillez saisir une URL valide.",
    invalidEmail: "Veuillez saisir une adresse e-mail valide.",
    numberMin: "La valeur doit être au moins {{min}}.",
    numberMax: "La valeur doit être au plus {{max}}.",
    tooShort: "Utilisez au moins {{min}} caractères."
  }
};
const de = {
  intro: {
    tagline: "Wahrheit in Ihrer Infrastruktur",
    subtitle: "Ihre Plattform wird eingerichtet",
    skip: "Klicken oder Esc zum Überspringen"
  },
  layout: {
    title: "Ersteinrichtung",
    subtitle: "Folgen Sie den Schritten zur Installation von Veritas.",
    steps: {
      env: "Einstellungen",
      database: "Datenbank",
      schema: "Vorbereitung",
      admin: "Administrator",
      mfa: "Zwei-Faktor-Auth"
    },
    discord: "Veritas auf Discord",
    discordHint: "Hilfe nötig? Unsere Community unterstützt Sie.",
    communityTitle: "Community & Ressourcen",
    linkDiscord: "Discord",
    linkWebsite: "Website",
    linkGithub: "GitHub",
    websiteAria: "Veritas-Website — veritas-msp.com",
    githubAria: "Veritas-Quellcode auf GitHub",
    communityHint: "Hilfe, Docs, Updates und Open Source — alles an einem Ort.",
    themeUseLight: "Zum hellen Modus wechseln",
    themeUseDark: "Zum dunklen Modus wechseln"
  },
  availability: {
    checking: "Installation wird geprüft…",
    serverTitle: "Veritas-Server nicht erreichbar",
    serverBody: "Die Web-App erreicht die Veritas-API nicht. Prüfen Sie, ob der Backend-Dienst läuft, und versuchen Sie es erneut.",
    databaseTitle: "Datenbank nicht erreichbar",
    databaseBody: "Der Veritas-Server antwortet, aber PostgreSQL nicht. Prüfen Sie, ob die Datenbank läuft und DATABASE_URL korrekt ist.",
    hint: "Die Erstinstallation erscheint nur, wenn die Datenbank erreichbar ist und die Installation noch unvollständig ist.",
    retry: "Erneut versuchen",
    retrying: "Wird erneut versucht…"
  },
  env: {
    title: "Allgemeine Einstellungen",
    subtitle: "Standardwerte reichen für eine lokale Installation. Schlüssel können automatisch erzeugt werden.",
    jwtSecret: {
      label: "Sitzungssicherheitsschlüssel",
      hint: "Schützt Anmeldungen. Leer lassen für automatische Erzeugung.",
      placeholder: "Automatisch wenn leer"
    },
    encryptionKey: {
      label: "Verschlüsselungsschlüssel",
      hint: "Schützt gespeicherte Passwörter. Leer lassen. Später nicht ändern.",
      placeholder: "Automatisch wenn leer"
    },
    allowedOrigins: {
      label: "Erlaubte Webadresse",
      hint: "Lokal: http://localhost:3000. Produktion: Ihre Website-URL. Mehrere Adressen mit Kommas trennen."
    },
    frontendBaseUrl: {
      label: "Anwendungsadresse",
      hint: "Hauptadresse für Veritas. Lokal: http://localhost:3000. Mehrere Einträge mit Kommas (der erste gilt für E-Mails)."
    },
    apiBaseUrl: {
      label: "API-Serveradresse",
      hint: "Wo die App die API aufruft. Lokal: http://localhost:3001. Der Port in dieser URL startet auch das Backend."
    },
    generateSecrets: "Schlüssel erzeugen",
    continue: "Weiter",
    saving: "Speichern…"
  },
  database: {
    title: "Datenbankverbindung",
    subtitle: "Daten eingeben, die Sie bei der Erstellung Ihrer PostgreSQL-Datenbank erhalten haben.",
    subtitleDocker: "Docker stellt die Datenbank bereits bereit. Felder sind vorausgefüllt — auf Testen und weiter klicken (Passwort = POSTGRES_PASSWORD in .env, oft changeme).",
    host: {
      label: "Server",
      hint: "Oft localhost oder die Adresse Ihres Hosters. Bei Docker Compose: db."
    },
    port: {
      label: "Port",
      hint: "Meist 5432."
    },
    name: {
      label: "Datenbankname",
      hint: "Die Datenbank muss bereits existieren."
    },
    user: {
      label: "Benutzer",
      hint: "Der Benutzer mit Zugriff auf diese Datenbank."
    },
    password: {
      label: "Passwort",
      hint: "Das Passwort dieses Benutzers."
    },
    back: "Zurück",
    testContinue: "Testen und weiter",
    testing: "Test läuft…"
  },
  schema: {
    title: "Datenbank vorbereiten",
    subtitle: "Erstellt die benötigten Tabellen. Button klicken und warten.",
    back: "Zurück",
    run: "Datenbank vorbereiten",
    rerun: "Erneut ausführen",
    running: "Läuft…",
    continue: "Weiter",
    progress: "{{completed}} / {{total}}",
    applying: "Aktuell: {{name}}"
  },
  admin: {
    title: "Administrator-Konto",
    subtitle: "Mit diesem Konto melden Sie sich an und verwalten Veritas.",
    email: {
      label: "E-Mail",
      hint: "Ihre Anmelde-E-Mail."
    },
    username: {
      label: "Anzeigename (optional)",
      hint: "So erscheint Ihr Name in der App."
    },
    password: {
      label: "Passwort",
      hint: "Verwenden Sie ein starkes Passwort (siehe Kriterien unten)."
    },
    passwordConfirm: {
      label: "Passwort bestätigen",
      hint: "Dasselbe Passwort erneut eingeben."
    },
    passwordStrength: {
      title: "Passwortstärke",
      strength: {
        empty: "—",
        weak: "Schwach",
        fair: "Mittel",
        strong: "Stark"
      },
      rules: {
        length: "Mindestens {{min}} Zeichen",
        lowercase: "Ein Kleinbuchstabe",
        uppercase: "Ein Großbuchstabe",
        digit: "Eine Zahl",
        special: "Ein Sonderzeichen"
      }
    },
    back: "Zurück",
    continueToMfa: "Weiter zum MFA",
    creating: "Erstellen…",
    alreadyCreated: "Ihr Administrator-Konto ist bereits eingerichtet. Fahren Sie mit der Zwei-Faktor-Authentifizierung fort."
  },
  mfa: {
    title: "Administrator-Konto absichern",
    subtitle: "Zwei-Faktor-Authentifizierung (MFA) ist erforderlich. Scannen Sie den QR-Code mit einer App wie Microsoft Authenticator oder Google Authenticator und geben Sie den 6-stelligen Code ein.",
    loading: "MFA-Einrichtung wird vorbereitet…",
    manualKey: "Manueller Schlüssel:",
    codeLabel: "Authentifizierungscode",
    codeHint: "Geben Sie den 6-stelligen Code aus Ihrer Authenticator-App ein.",
    codePlaceholder: "000000",
    finish: "Installation abschließen",
    verifying: "Überprüfung…",
    qrAlt: "MFA-QR-Code"
  },
  toasts: {
    serverUnreachable: "Veritas-Server nicht erreichbar.",
    secretsGenerated: "Schlüssel erzeugt.",
    envSaved: "Einstellungen gespeichert.",
    envSavedRestartFrontend: "Gespeichert. Web-App neu starten, wenn Sie die Serveradresse geändert haben.",
    dbValidated: "Datenbankverbindung OK.",
    migrationsApplied: "{{count}} Schritt(e) abgeschlossen.",
    passwordMismatch: "Passwörter stimmen nicht überein.",
    passwordWeak: "Das Passwort erfüllt nicht die Sicherheitsanforderungen.",
    setupComplete: "Installation abgeschlossen!"
  },
  errors: {
    generic: "Ein Fehler ist aufgetreten. Bitte erneut versuchen.",
    NETWORK_ERROR: "Netzwerkfehler. Verbindung prüfen und erneut versuchen.",
    SETUP_STATUS_READ_FAILED: "Installationsstatus konnte nicht gelesen werden.",
    SETUP_ENV_WRITE_FAILED: "Umgebungsdatei konnte nicht geschrieben werden.",
    SETUP_DB_CONNECTION_FAILED: "Keine Verbindung zur Datenbank. Zugangsdaten prüfen und PostgreSQL starten.",
    SETUP_MIGRATIONS_LIST_FAILED: "Ausstehende Migrationen konnten nicht gelesen werden.",
    SETUP_MIGRATION_FAILED: "Datenbankvorbereitung fehlgeschlagen.",
    SETUP_ADMIN_ALREADY_EXISTS: "Ein Administratorkonto existiert bereits.",
    SETUP_ADMIN_CREATE_FAILED: "Administratorkonto konnte nicht erstellt werden.",
    SETUP_ALREADY_COMPLETE: "Die Ersteinrichtung ist bereits abgeschlossen.",
    SETUP_VALIDATION_FAILED: "Einige Felder sind ungültig. Formular prüfen und erneut versuchen.",
    SETUP_PASSWORD_WEAK: "Das Passwort erfüllt nicht die Sicherheitsanforderungen.",
    SETUP_MFA_INVALID_CODE: "Ungültiger Code. Erneut versuchen.",
    SETUP_MFA_SETUP_FAILED: "MFA-Einrichtung konnte nicht gestartet werden.",
    SETUP_MFA_VERIFY_FAILED: "MFA-Code konnte nicht überprüft werden."
  },
  validation: {
    valueMissing: "Bitte füllen Sie dieses Feld aus.",
    numberRequired: "Bitte geben Sie eine Zahl ein.",
    invalidUrl: "Bitte geben Sie eine gültige URL ein.",
    invalidEmail: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
    numberMin: "Der Wert muss mindestens {{min}} sein.",
    numberMax: "Der Wert darf höchstens {{max}} sein.",
    tooShort: "Bitte mindestens {{min}} Zeichen verwenden."
  }
};
const it = {
  intro: {
    tagline: "La verità nella vostra infrastruttura",
    subtitle: "Configurazione della piattaforma",
    skip: "Clicca o premi Esc per saltare"
  },
  layout: {
    title: "Configurazione iniziale",
    subtitle: "Seguite i passaggi per installare Veritas.",
    steps: {
      env: "Impostazioni",
      database: "Database",
      schema: "Preparazione",
      admin: "Amministratore",
      mfa: "Autenticazione a due fattori"
    },
    discord: "Unisciti a Veritas su Discord",
    discordHint: "Serve aiuto? La community è qui per voi.",
    communityTitle: "Community e risorse",
    linkDiscord: "Discord",
    linkWebsite: "Sito web",
    linkGithub: "GitHub",
    websiteAria: "Sito Veritas — veritas-msp.com",
    githubAria: "Codice sorgente Veritas su GitHub",
    communityHint: "Aiuto, documentazione, aggiornamenti e open source — tutto in un posto.",
    themeUseLight: "Passa alla modalità chiara",
    themeUseDark: "Passa alla modalità scura"
  },
  availability: {
    checking: "Verifica dell'installazione…",
    serverTitle: "Server Veritas non raggiungibile",
    serverBody: "L'interfaccia non riesce a contattare l'API Veritas. Verificate che il servizio backend sia avviato, poi riprovate.",
    databaseTitle: "Database non raggiungibile",
    databaseBody: "Il server Veritas risponde, ma PostgreSQL no. Verificate che il database sia avviato e che DATABASE_URL sia corretto.",
    hint: "La configurazione iniziale appare solo quando il database è raggiungibile e l'installazione non è ancora completa.",
    retry: "Riprova",
    retrying: "Nuovo tentativo…"
  },
  env: {
    title: "Impostazioni generali",
    subtitle: "I valori predefiniti vanno bene in locale. Potete generare le chiavi automaticamente.",
    jwtSecret: {
      label: "Chiave sicurezza sessioni",
      hint: "Protegge gli accessi. Lasciare vuoto per generare automaticamente.",
      placeholder: "Generato se vuoto"
    },
    encryptionKey: {
      label: "Chiave di cifratura",
      hint: "Protegge le password salvate. Lasciare vuoto. Non modificarla dopo.",
      placeholder: "Generato se vuoto"
    },
    allowedOrigins: {
      label: "Indirizzo web autorizzato",
      hint: "In locale: http://localhost:3000. In produzione: URL del sito. Più indirizzi separati da virgole."
    },
    frontendBaseUrl: {
      label: "Indirizzo dell'applicazione",
      hint: "Indirizzo principale di Veritas. In locale: http://localhost:3000. Più voci separate da virgole (la prima per le e-mail)."
    },
    apiBaseUrl: {
      label: "Indirizzo server API",
      hint: "Dove l'app chiama l'API. In locale: http://localhost:3001. La porta in questo URL avvia anche il backend."
    },
    generateSecrets: "Genera chiavi",
    continue: "Continua",
    saving: "Salvataggio…"
  },
  database: {
    title: "Connessione al database",
    subtitle: "Inserite i dati ricevuti quando avete creato il database PostgreSQL.",
    subtitleDocker: "Docker fornisce già il database. I campi sono precompilati — cliccate Testa e continua (password = POSTGRES_PASSWORD nel .env, spesso changeme).",
    host: {
      label: "Server",
      hint: "Spesso localhost o l'indirizzo del vostro hoster. Con Docker Compose: db."
    },
    port: {
      label: "Porta",
      hint: "Di solito 5432."
    },
    name: {
      label: "Nome database",
      hint: "Il database deve già esistere."
    },
    user: {
      label: "Utente",
      hint: "L'utente che accede a questo database."
    },
    password: {
      label: "Password",
      hint: "La password di questo utente."
    },
    back: "Indietro",
    testContinue: "Testa e continua",
    testing: "Test in corso…"
  },
  schema: {
    title: "Preparare il database",
    subtitle: "Crea le tabelle necessarie. Cliccate il pulsante e attendete.",
    back: "Indietro",
    run: "Preparare il database",
    rerun: "Esegui di nuovo",
    running: "In corso…",
    continue: "Continua",
    progress: "{{completed}} / {{total}}",
    applying: "In corso: {{name}}"
  },
  admin: {
    title: "Account amministratore",
    subtitle: "Account usato per accedere e gestire Veritas.",
    email: {
      label: "Email",
      hint: "La vostra email di accesso."
    },
    username: {
      label: "Nome visualizzato (opzionale)",
      hint: "Come appare il vostro nome nell'app."
    },
    password: {
      label: "Password",
      hint: "Usate una password forte (vedi i criteri sotto)."
    },
    passwordConfirm: {
      label: "Conferma password",
      hint: "Ripetere la stessa password."
    },
    passwordStrength: {
      title: "Forza password",
      strength: {
        empty: "—",
        weak: "Debole",
        fair: "Discreta",
        strong: "Forte"
      },
      rules: {
        length: "Almeno {{min}} caratteri",
        lowercase: "Una lettera minuscola",
        uppercase: "Una lettera maiuscola",
        digit: "Un numero",
        special: "Un carattere speciale"
      }
    },
    back: "Indietro",
    continueToMfa: "Continua verso MFA",
    creating: "Creazione…",
    alreadyCreated: "L'account amministratore è già stato creato. Continuate per configurare l'autenticazione a due fattori."
  },
  mfa: {
    title: "Proteggete l'account amministratore",
    subtitle: "L'autenticazione a due fattori (MFA) è obbligatoria. Scansionate il QR code con un'app come Microsoft Authenticator o Google Authenticator, poi inserite il codice a 6 cifre.",
    loading: "Preparazione MFA…",
    manualKey: "Chiave manuale:",
    codeLabel: "Codice di autenticazione",
    codeHint: "Inserite il codice a 6 cifre dall'app di autenticazione.",
    codePlaceholder: "000000",
    finish: "Completa installazione",
    verifying: "Verifica…",
    qrAlt: "QR code MFA"
  },
  toasts: {
    serverUnreachable: "Server Veritas non raggiungibile.",
    secretsGenerated: "Chiavi generate.",
    envSaved: "Impostazioni salvate.",
    envSavedRestartFrontend: "Salvato. Riavviare l'app web se avete cambiato l'indirizzo del server.",
    dbValidated: "Connessione al database OK.",
    migrationsApplied: "{{count}} passaggio/i completato/i.",
    passwordMismatch: "Le password non corrispondono.",
    passwordWeak: "La password non soddisfa i requisiti di sicurezza.",
    setupComplete: "Installazione completata!"
  },
  errors: {
    generic: "Si è verificato un errore. Riprovate.",
    NETWORK_ERROR: "Errore di rete. Controllate la connessione e riprovate.",
    SETUP_STATUS_READ_FAILED: "Impossibile leggere lo stato dell'installazione.",
    SETUP_ENV_WRITE_FAILED: "Impossibile scrivere il file di ambiente.",
    SETUP_DB_CONNECTION_FAILED: "Connessione al database impossibile. Verificate le credenziali e che PostgreSQL sia avviato.",
    SETUP_MIGRATIONS_LIST_FAILED: "Impossibile leggere le migrazioni in sospeso.",
    SETUP_MIGRATION_FAILED: "Preparazione del database non riuscita.",
    SETUP_ADMIN_ALREADY_EXISTS: "Esiste già un account amministratore.",
    SETUP_ADMIN_CREATE_FAILED: "Impossibile creare l'account amministratore.",
    SETUP_ALREADY_COMPLETE: "La configurazione iniziale è già completata.",
    SETUP_VALIDATION_FAILED: "Alcuni campi non sono validi. Controllate il modulo e riprovate.",
    SETUP_PASSWORD_WEAK: "La password non soddisfa i requisiti di sicurezza.",
    SETUP_MFA_INVALID_CODE: "Codice non valido. Riprovate.",
    SETUP_MFA_SETUP_FAILED: "Impossibile avviare la configurazione MFA.",
    SETUP_MFA_VERIFY_FAILED: "Impossibile verificare il codice MFA."
  },
  validation: {
    valueMissing: "Compilate questo campo.",
    numberRequired: "Inserite un numero.",
    invalidUrl: "Inserite un URL valido.",
    invalidEmail: "Inserite un indirizzo e-mail valido.",
    numberMin: "Il valore deve essere almeno {{min}}.",
    numberMax: "Il valore deve essere al massimo {{max}}.",
    tooShort: "Utilizzate almeno {{min}} caratteri."
  }
};
const es = {
  intro: {
    tagline: "La verdad en su infraestructura",
    subtitle: "Configurando su plataforma",
    skip: "Clic o Esc para omitir"
  },
  layout: {
    title: "Configuración inicial",
    subtitle: "Siga los pasos para instalar Veritas.",
    steps: {
      env: "Ajustes",
      database: "Base de datos",
      schema: "Preparación",
      admin: "Administrador",
      mfa: "Doble autenticación"
    },
    discord: "Únete a Veritas en Discord",
    discordHint: "¿Necesita ayuda? La comunidad está aquí.",
    communityTitle: "Comunidad y recursos",
    linkDiscord: "Discord",
    linkWebsite: "Sitio web",
    linkGithub: "GitHub",
    websiteAria: "Sitio web Veritas — veritas-msp.com",
    githubAria: "Código fuente de Veritas en GitHub",
    communityHint: "Ayuda, documentación, novedades y código abierto — en un solo lugar.",
    themeUseLight: "Cambiar a modo claro",
    themeUseDark: "Cambiar a modo oscuro"
  },
  availability: {
    checking: "Comprobando la instalación…",
    serverTitle: "Servidor Veritas inaccesible",
    serverBody: "La interfaz no puede contactar con la API de Veritas. Compruebe que el servicio backend está en marcha e inténtelo de nuevo.",
    databaseTitle: "Base de datos inaccesible",
    databaseBody: "El servidor Veritas responde, pero PostgreSQL no. Compruebe que la base está en marcha y que DATABASE_URL es correcto.",
    hint: "La configuración inicial solo aparece cuando la base es accesible y la instalación aún no ha terminado.",
    retry: "Reintentar",
    retrying: "Reintentando…"
  },
  env: {
    title: "Ajustes generales",
    subtitle: "Los valores por defecto sirven en local. Puede generar las claves automáticamente.",
    jwtSecret: {
      label: "Clave de seguridad de sesión",
      hint: "Protege los inicios de sesión. Dejar vacío para generar automáticamente.",
      placeholder: "Se genera si está vacío"
    },
    encryptionKey: {
      label: "Clave de cifrado",
      hint: "Protege las contraseñas guardadas. Dejar vacío. No cambiarla después.",
      placeholder: "Se genera si está vacío"
    },
    allowedOrigins: {
      label: "Dirección web permitida",
      hint: "En local: http://localhost:3000. En producción: URL de su sitio. Varias direcciones separadas por comas."
    },
    frontendBaseUrl: {
      label: "Dirección de la aplicación",
      hint: "Dirección principal de Veritas. En local: http://localhost:3000. Varias entradas separadas por comas (la primera para los correos)."
    },
    apiBaseUrl: {
      label: "Dirección del servidor API",
      hint: "Dónde la app llama a la API. En local: http://localhost:3001. El puerto de esta URL también inicia el backend."
    },
    generateSecrets: "Generar claves",
    continue: "Continuar",
    saving: "Guardando…"
  },
  database: {
    title: "Conexión a la base de datos",
    subtitle: "Introduzca los datos que recibió al crear su base PostgreSQL.",
    subtitleDocker: "Docker ya proporciona la base. Los campos están rellenados — pulse Probar y continuar (contraseña = POSTGRES_PASSWORD en .env, a menudo changeme).",
    host: {
      label: "Servidor",
      hint: "A menudo localhost o la dirección de su proveedor. Con Docker Compose: db."
    },
    port: {
      label: "Puerto",
      hint: "Normalmente 5432."
    },
    name: {
      label: "Nombre de la base",
      hint: "La base debe existir ya."
    },
    user: {
      label: "Usuario",
      hint: "El usuario con acceso a esta base."
    },
    password: {
      label: "Contraseña",
      hint: "La contraseña de ese usuario."
    },
    back: "Volver",
    testContinue: "Probar y continuar",
    testing: "Probando…"
  },
  schema: {
    title: "Preparar la base de datos",
    subtitle: "Crea las tablas necesarias. Pulse el botón y espere.",
    back: "Volver",
    run: "Preparar la base",
    rerun: "Ejecutar de nuevo",
    running: "En curso…",
    continue: "Continuar",
    progress: "{{completed}} / {{total}}",
    applying: "En curso: {{name}}"
  },
  admin: {
    title: "Cuenta de administrador",
    subtitle: "Cuenta para iniciar sesión y administrar Veritas.",
    email: {
      label: "Correo electrónico",
      hint: "Su correo de acceso."
    },
    username: {
      label: "Nombre mostrado (opcional)",
      hint: "Cómo aparece su nombre en la app."
    },
    password: {
      label: "Contraseña",
      hint: "Use una contraseña segura (véase los criterios abajo)."
    },
    passwordConfirm: {
      label: "Confirmar contraseña",
      hint: "Escriba la misma contraseña otra vez."
    },
    passwordStrength: {
      title: "Fortaleza de la contraseña",
      strength: {
        empty: "—",
        weak: "Débil",
        fair: "Media",
        strong: "Fuerte"
      },
      rules: {
        length: "Al menos {{min}} caracteres",
        lowercase: "Una letra minúscula",
        uppercase: "Una letra mayúscula",
        digit: "Un número",
        special: "Un carácter especial"
      }
    },
    back: "Volver",
    continueToMfa: "Continuar al MFA",
    creating: "Creando…",
    alreadyCreated: "Su cuenta de administrador ya está creada. Continúe para configurar la autenticación de dos factores."
  },
  mfa: {
    title: "Proteja la cuenta de administrador",
    subtitle: "La autenticación de dos factores (MFA) es obligatoria. Escanee el código QR con una app como Microsoft Authenticator o Google Authenticator y escriba el código de 6 dígitos.",
    loading: "Preparando MFA…",
    manualKey: "Clave manual:",
    codeLabel: "Código de autenticación",
    codeHint: "Introduzca el código de 6 dígitos de su app de autenticación.",
    codePlaceholder: "000000",
    finish: "Finalizar instalación",
    verifying: "Verificando…",
    qrAlt: "Código QR MFA"
  },
  toasts: {
    serverUnreachable: "No se puede contactar con el servidor Veritas.",
    secretsGenerated: "Claves generadas.",
    envSaved: "Ajustes guardados.",
    envSavedRestartFrontend: "Guardado. Reinicie la app web si cambió la dirección del servidor.",
    dbValidated: "Conexión a la base OK.",
    migrationsApplied: "{{count}} paso(s) completado(s).",
    passwordMismatch: "Las contraseñas no coinciden.",
    passwordWeak: "La contraseña no cumple los requisitos de seguridad.",
    setupComplete: "¡Instalación completada!"
  },
  errors: {
    generic: "Se ha producido un error. Inténtelo de nuevo.",
    NETWORK_ERROR: "Error de red. Compruebe la conexión e inténtelo de nuevo.",
    SETUP_STATUS_READ_FAILED: "No se puede leer el estado de la instalación.",
    SETUP_ENV_WRITE_FAILED: "No se puede escribir el archivo de entorno.",
    SETUP_DB_CONNECTION_FAILED: "No se puede conectar a la base de datos. Compruebe las credenciales y que PostgreSQL esté en ejecución.",
    SETUP_MIGRATIONS_LIST_FAILED: "No se pueden leer las migraciones pendientes.",
    SETUP_MIGRATION_FAILED: "Error al preparar la base de datos.",
    SETUP_ADMIN_ALREADY_EXISTS: "Ya existe una cuenta de administrador.",
    SETUP_ADMIN_CREATE_FAILED: "No se puede crear la cuenta de administrador.",
    SETUP_ALREADY_COMPLETE: "La configuración inicial ya está completa.",
    SETUP_VALIDATION_FAILED: "Algunos campos no son válidos. Revise el formulario e inténtelo de nuevo.",
    SETUP_PASSWORD_WEAK: "La contraseña no cumple los requisitos de seguridad.",
    SETUP_MFA_INVALID_CODE: "Código no válido. Inténtelo de nuevo.",
    SETUP_MFA_SETUP_FAILED: "No se puede iniciar la configuración MFA.",
    SETUP_MFA_VERIFY_FAILED: "No se puede verificar el código MFA."
  },
  validation: {
    valueMissing: "Complete este campo.",
    numberRequired: "Introduzca un número.",
    invalidUrl: "Introduzca una URL válida.",
    invalidEmail: "Introduzca una dirección de correo válida.",
    numberMin: "El valor debe ser al menos {{min}}.",
    numberMax: "El valor debe ser como máximo {{max}}.",
    tooShort: "Use al menos {{min}} caracteres."
  }
};
export const setupTranslations = {
  en,
  fr,
  de,
  it,
  es
};
export const DEFAULT_SETUP_LOCALE = "en";
export function interpolate(text, vars = {}) {
  return String(text).replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}
