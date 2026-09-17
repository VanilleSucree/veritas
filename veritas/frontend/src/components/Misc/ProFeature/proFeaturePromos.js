import { getProOnlySidebarModules } from "../../../config/modulesCatalog";
const PRO_SIDEBAR_PAGES = [...getProOnlySidebarModules().map(module => ({
  label: module.label,
  description: module.description,
  icon: module.icon
})), {
  label: "Campagnes cybersécurité",
  description: "Sensibilisation, simulations de phishing et conformité",
  icon: "mdi:shield-lock"
}];
export const PRO_FEATURE_PROMOS = {
  credits: {
    title: "Carnets de crédits support",
    icon: "mdi:ticket-confirmation-outline",
    subtitle: "Suivez les prestations vendues à l'avance à vos clients.",
    description: "Les carnets de crédits permettent de formaliser et de piloter les packs de support ou de prestations commercialisés en amont : nombre d'interventions vendues, solde restant, date de validité…",
    bullets: ["Enregistrez les carnets vendus lors de la signature (support, dépannage, infogérance…)", "Consultez en un coup d'œil le solde consommé et les crédits restants par client", "Anticipez les renouvellements grâce aux dates d'expiration", "Gardez une trace claire de ce qui a été vendu versus ce qui a été consommé"]
  },
  sla: {
    title: "SLA support",
    icon: "mdi:clock-check-outline",
    subtitle: "Pilotez vos engagements de service en temps réel.",
    description: "Les SLA (accords de niveau de service) donnent à vos équipes une vision partagée du respect des délais sur les tickets, incidents et demandes de dépannage de vos clients.",
    bullets: ["Définissez des objectifs de première réponse et de résolution par priorité", "Visualisez instantanément les tickets dans les temps, à risque ou en retard", "Alignez le support, l'astreinte et le niveau 2 sur les mêmes références contractuelles", "Renforcez la transparence vis-à-vis de vos clients sur les engagements pris"]
  },
  planning: {
    title: "Planning entreprise",
    icon: "mdi:calendar-clock-outline",
    subtitle: "Planifiez et suivez les interventions chez vos clients.",
    description: "Le planning Veritas centralise les événements liés à chaque entreprise : interventions, maintenances préventives, comités de pilotage, rendez-vous terrain… Directement since la fiche client ou la vue planning globale.",
    bullets: ["Visualisez les événements récents et à venir sur la fiche entreprise", "Créez des interventions, maintenances et rendez-vous en quelques clics", "Organisez le travail des équipes techniques avec une vue planning partagée", "Retrouvez l'historique des passages planifiés par client et par site"]
  },
  vault: {
    title: "Vault documentaire",
    icon: "mdi:safe-square-outline",
    subtitle: "Centralisez les documents clients et partagez-les sur le portail.",
    description: "Le vault documentaire regroupe factures, notices, guides, rapports et contrats par entreprise. Partagez les fichiers avec vos contacts sur leur portail client en toute sécurité.",
    bullets: ["Stockez et classez les documents par entreprise et par type", "Partagez des fichiers avec les contacts sur le portail client", "Retrouvez rapidement factures, contrats et rapports since la fiche entreprise", "Gardez une trace centralisée des documents remis à vos clients"]
  },
  prestations: {
    title: "Tickets Prestations / Services",
    icon: "mdi:briefcase-outline",
    subtitle: "Pilotez les prestations facturables et le matériel vendu.",
    description: "Les tickets prestations / services regroupent les demandes liées à votre activité commerciale : interventions site, formations, installations, expéditions, études avant-vente… Chaque ticket peut être suivi until la facturation ou la livraison.",
    bullets: ["Créez et suivez les demandes par type de prestation (intervention, formation, production…)", "Reliez les tickets aux clients et contacts pour un suivi opérationnel clair", "Préparez la facturation à partir des prestations réalisées ou vendues", "Retrouvez l'historique des demandes since la fiche entreprise ou la vue Prestations"]
  },
  reversibility: {
    title: "Folder de réversibilité",
    icon: "mdi:folder-download-outline",
    subtitle: "Exportez en un clic l'ensemble des data client.",
    description: "Le dossier de réversibilité regroupe les informations nécessaires à la reprise ou à la fin de mission : entreprise, contacts, équipements, tickets, planning, documents… au format structuré (JSON, CSV, HTML et ZIP).",
    bullets: ["Générez un export complet since la fiche entreprise", "Récupérez contacts, parc, tickets support et demandes de prestations", "Incluez le planning, les campagnes, notes et étiquettes du client", "Facilitez la transmission à un repreneur ou la clôture contractuelle"]
  },
  adminProfiles: {
    title: "Profiles d'accès",
    icon: "mdi:account-cog-outline",
    subtitle: "Créez des modèles de droits réutilisables pour vos agents.",
    description: "Les profils regroupent les autorisations applicables à un agent : libellé, description et modules accessibles. Veritas Pro permet de créer des profils personnalisés en plus des profils système fournis par défaut.",
    bullets: ["Définissez des profils métier (helpdesk, responsable, lecture seule…)", "Réutilisez les mêmes droits sur plusieurs agents en un clic", "Héritez des permissions d'un profil parent pour simplifier la gestion", "Adaptez finement l'accès aux modules selon les rôles de votre équipe"]
  },
  adminAccess: {
    title: "Droits d'accès",
    icon: "mdi:shield-account-outline",
    subtitle: "Personnalisez les modules visibles par profil.",
    description: "La matrice des droits d'accès permet d'activer ou de désactiver chaque module Veritas (infrastructure, cybersécurité, planning, rapports…) pour chaque profil. En édition Community, tous les agents accèdent à Company, Contact et Support.",
    bullets: ["Contrôlez module par module ce que voit chaque profil", "Verrouillez l'accès aux zones sensibles (cyber, rapports, planning…)", "Alignez les droits sur votre organisation et vos processus MSP", "Appliquez les changements immédiatement à tous les agents du profil"]
  },
  adminTechNewsFeeds: {
    title: "Flux actualités",
    icon: "mdi:rss",
    subtitle: "Personnalisez les sources RSS de l'accueil.",
    description: "Configurez les flux d'actualités affichés sur la page d'accueil Veritas, par langue et par thématique, pour informer vos équipes au quotidien.",
    bullets: ["Ajoutez vos sources RSS métier ou éditeur", "Organisez les flux par langue", "Centralisez la veille technique de l'équipe"]
  },
  adminLoginBranding: {
    title: "Page de connexion",
    icon: "mdi:palette-outline",
    subtitle: "Adaptez l'accueil à votre marque MSP.",
    description: "Personnalisez la page de connexion Veritas pour vos agents et vos clients : logo, couleurs, fond d'écran et textes d'accroche distincts par espace.",
    bullets: ["Logo et nom de votre organisation", "Couleurs et image de fond par espace agent / client", "Titres, sous-titres et points forts personnalisés", "Aperçu en direct since l'administration"]
  },
  adminReports: {
    title: "Rapports",
    icon: "mdi:file-document-outline",
    subtitle: "Personnalisez l'identité de vos exports PDF/HTML.",
    description: "Configurez le nom de société, les coordonnées et les réseaux sociaux affichés dans l'en-tête et le pied de page de vos rapports de supervision, sauvegardes et services.",
    bullets: ["Nom de société et signature de marque", "E-mail, téléphone, site et adresse", "Réseaux sociaux affichés dans le pied de page", "Mention légale et date de génération"]
  },
  adminTeams: {
    title: "Teams",
    icon: "mdi:account-multiple-outline",
    subtitle: "Structurez vos agents par équipe.",
    description: "Les équipes regroupent vos agents pour l'assignation des tickets, les vues support et la répartition du travail entre helpdesk, N2 et terrain.",
    bullets: ["Créez des équipes par métier ou par site", "Assignez plusieurs agents à une même équipe", "Utilisez les équipes dans les vues et automatisations tickets"]
  },
  adminContractModules: {
    title: "Options contrat",
    icon: "mdi:file-document-edit-outline",
    subtitle: "Configurez les modules visibles sur les fiches entreprise.",
    description: "Les options contrat déterminent quels blocs et modules apparaissent sur chaque fiche client selon le type de contrat ou la prestation vendue.",
    bullets: ["Activez ou masquez des modules par type de contrat", "Adaptez la fiche entreprise à votre offre commerciale", "Harmonisez l'affichage pour toute l'équipe"]
  },
  customContractModules: {
    title: "Services personnalisés",
    icon: "mdi:puzzle-plus-outline",
    subtitle: "Étendez le catalogue de services sur chaque fiche entreprise.",
    description: "Veritas Pro permet d'ajouter vos propres services au-delà des options Community (Support, Dépannage, Préventif, Monitoring, Hébergement) pour refléter fidèlement votre offre MSP.",
    bullets: ["Créez des services sur mesure (infogérance, cybersécurité, audit…)", "Activez-les par entreprise comme les modules standards", "Harmonisez la fiche client avec votre catalogue commercial", "Configurez la liste globale since Administration → Options contrat"]
  },
  adminEquipmentFamilies: {
    title: "Familles matériel",
    icon: "mdi:hexagon-multiple-outline",
    subtitle: "Définissez les types et champs du parc.",
    description: "Les familles matériel structurent votre inventaire : postes, serveurs, switches, sauvegardes… avec des champs personnalisés par type.",
    bullets: ["Créez des familles adaptées à votre parc", "Ajoutez des champs spécifiques par type d'équipement", "Standardisez la saisie infrastructure chez vos clients"]
  },
  adminIntegrations: {
    title: "Intégrations",
    icon: "mdi:link-variant",
    subtitle: "Connectez Veritas à vos outils.",
    description: "Les intégrations synchronisent Veritas avec votre écosystème MSP : antivirus, sauvegarde, firewall, Microsoft 365, Teams et autres connecteurs.",
    bullets: ["Centralisez les data de vos outils dans Veritas", "Automatisez la remontée d'alertes et d'inventaire", "Réduisez la saisie manuelle pour vos équipes"]
  },
  adminCollectors: {
    title: "Collecteurs mail",
    icon: "mdi:email-sync-outline",
    subtitle: "Absorbez les emails entrants en tickets.",
    description: "Les collecteurs IMAP/POP3 récupèrent automatiquement les messages des boîtes support pour créer ou enrichir les tickets.",
    bullets: ["Connectez vos boîtes mail support", "Planifiez la fréquence de collecte", "Consultez les journaux d'absorption"]
  },
  adminEmailIngestion: {
    title: "Rules de collecte",
    icon: "mdi:email-filter-outline",
    subtitle: "Triez et traitez les emails entrants.",
    description: "Les règles de collecte déterminent comment chaque email entrant est traité : création de ticket, ignore ou réponse automatique.",
    bullets: ["Priorisez les règles dans l'ordre d'évaluation", "Filtrez par expéditeur, objet ou critères avancés", "Automatisez les réponses ou le rejet du bruit"]
  },
  adminRmmCollectors: {
    title: "Collecteurs d'inventaire RMM",
    icon: "mdi:database-cog-outline",
    subtitle: "Choisissez ce que remontent vos agents Windows.",
    description: "Les collecteurs d'inventaire RMM permettent d'activer ou de désactiver finement les informations remontées par l'agent Veritas : système, réseau, matériel, logiciels installés…",
    bullets: ["Activez uniquement les data utiles à votre exploitation", "Réduisez la charge sur les postes en désactivant les collecteurs lourds", "Personnalisez les collecteurs par entreprise", "Appliquez les changements au prochain heartbeat, sans réinstallation"]
  },
  adminRmmClientSettings: {
    title: "Configuration RMM par token",
    icon: "mdi:key-chain-variant",
    subtitle: "Surchargez heartbeat, seuil hors ligne et collecteurs par token d'enrôlement.",
    description: "La configuration par token permet d'adapter le comportement des agents Veritas enrollés avec un token donné : intervalle de heartbeat, délai hors ligne, auto-update et collecteurs, indépendamment des paramètres globaux.",
    bullets: ["Héritez des paramètres globaux par défaut", "Surchargez uniquement les options nécessaires par token", "Séparez des flottes d'une même entreprise via des tokens distincts", "Réinitialisez un token aux valeurs globales en un clic"]
  },
  adminRmmTokenSettings: {
    title: "Configuration RMM par token",
    icon: "mdi:key-chain-variant",
    subtitle: "Surchargez heartbeat, seuil hors ligne et collecteurs par token d'enrôlement.",
    description: "La configuration par token permet d'adapter le comportement des agents Veritas enrollés avec un token donné : intervalle de heartbeat, délai hors ligne, auto-update et collecteurs, indépendamment des paramètres globaux.",
    bullets: ["Héritez des paramètres globaux par défaut", "Surchargez uniquement les options nécessaires par token", "Séparez des flottes d'une même entreprise via des tokens distincts", "Réinitialisez un token aux valeurs globales en un clic"]
  },
  rmmForceSync: {
    title: "Synchronization RMM à la demande",
    icon: "mdi:sync-circle",
    subtitle: "Forcez la remontée d'inventaire d'un poste sans attendre le prochain cycle.",
    description: "La synchronisation à la demande envoie une instruction à l'agent Veritas pour qu'il remonte immédiatement son inventaire (OS, correctifs, disques, logiciels…) au prochain passage, utile après une intervention ou avant un comité de pilotage.",
    bullets: ["Déclenchez une mise à jour ciblée since la liste des agents", "Suivez l'état « synchronisation demandée » until la remontée", "Évitez d'attendre le prochain heartbeat planifié", "Available pour les parcs supervisés en édition Pro"]
  },
  adminNotifications: {
    title: "Notifications",
    icon: "mdi:bell-ring-outline",
    subtitle: "Automatisez les alertes métier.",
    description: "Configurez les événements qui déclenchent une notification automatique vers vos agents ou webhooks lors de changements tickets, contrats ou cyber.",
    bullets: ["Définissez source, élément et canal de diffusion", "Personnalisez les messages avec templates", "Consultez l'historique des envois"]
  },
  adminWebhooks: {
    title: "Webhooks",
    icon: "mdi:webhook",
    subtitle: "Diffusez les événements vers Teams ou HTTP.",
    description: "Les webhooks envoient les notifications Veritas vers Microsoft Teams ou des endpoints HTTP personnalisés.",
    bullets: ["Créez des connecteurs Teams ou HTTP", "Réutilisez-les dans les règles de notification", "Activez ou désactivez chaque point de sortie"]
  },
  ticketPlanningAlert: {
    title: "Alerts planning tickets",
    icon: "mdi:bell-ring-outline",
    subtitle: "Programmez un rappel directement since un ticket support.",
    description: "Les alertes planning liées aux tickets permettent de planifier un rappel, une manipulation technique ou un suivi client : l'événement apparaît dans le planning Veritas avec le lien vers le ticket concerné.",
    bullets: ["Programmez une alerte en un clic since la fiche ticket", "Retrouvez le numéro de ticket, le demandeur et le type directement dans le planning", "Associez automatiquement l'événement à l'entreprise du ticket", "Modifiez ou supprimez l'alerte tant que le ticket est ouvert"]
  },
  ticketTemplateVariables: {
    title: "Variables dynamiques",
    icon: "mdi:code-tags",
    subtitle: "Personnalisez vos templates avec les data du ticket en temps réel.",
    description: "Les variables dynamiques enrichissent vos templates de commentaires : à l'application sur un ticket, elles sont remplacées par le numéro, le demandeur, l'entreprise, l'agent connecté et bien d'autres informations contextuelles.",
    bullets: ["Insérez des variables since un catalogue organisé par thème", "Préremplissez des réponses adaptées à chaque ticket en un clic", "Utilisez le numéro de ticket, le nom du demandeur ou de l'entreprise", "Gagnez du temps sur les réponses récurrentes du support"]
  },
  sidebarModules: {
    title: "Modules supplémentaires",
    icon: "mdi:puzzle-plus-outline",
    subtitle: "Débloquez les pages réservées à Veritas Pro.",
    description: "Veritas Community inclut déjà Companies, Contacts, Support, Centre de supervision, Cybersecurity, Services cloud et Monitoring. Veritas Pro ajoute les pages suivantes à votre navigation :",
    proPages: PRO_SIDEBAR_PAGES,
    bullets: ["Ajoutez ces modules à la sidebar selon les besoins de votre activité MSP", "Adaptez la navigation à votre organisation et à vos processus", "Contrôlez les droits d'accès module par module pour chaque profil", "Faites évoluer votre espace Veritas au fil de votre croissance"]
  },
  cyberCampaigns: {
    title: "Campagnes cybersécurité",
    icon: "mdi:shield-lock-outline",
    subtitle: "Pilotez vos actions de sensibilisation et de conformité.",
    description: "L'outil Campagnes permet de planifier, suivre et documenter vos actions cybersécurité chez vos clients : formations, audits RGPD, simulations de phishing, tests de pénétration et autres campagnes récurrentes.",
    bullets: ["Créez des campagnes par client avec type, statut et progression", "Suivez l'avancement global et les jalons de chaque action", "Centralisez l'historique des campagnes since la fiche entreprise", "Accédez au détail d'une campagne en un clic since la cartographie"]
  },
  "Campagnes cybersécurité": {
    title: "Campagnes cybersécurité",
    icon: "mdi:shield-lock-outline",
    subtitle: "Pilotez vos actions de sensibilisation et de conformité.",
    description: "L'outil Campagnes permet de planifier, suivre et documenter vos actions cybersécurité chez vos clients : formations, audits RGPD, simulations de phishing, tests de pénétration et autres campagnes récurrentes.",
    bullets: ["Créez des campagnes par client avec type, statut et progression", "Suivez l'avancement global et les jalons de chaque action", "Centralisez l'historique des campagnes since la fiche entreprise", "Accédez au détail d'une campagne en un clic since la cartographie"]
  },
  "Tenant Microsoft": {
    title: "Tenant Microsoft",
    icon: "mdi:microsoft",
    subtitle: "Pilotez Microsoft 365 since la fiche entreprise.",
    description: "La brique Tenant Microsoft centralise la visibilité sur l'environnement Microsoft 365 de vos clients : tenant lié, synchronisation, utilisateurs et services cloud associés.",
    bullets: ["Associez un tenant Microsoft à chaque entreprise", "Accédez au détail du tenant en un clic since la cartographie", "Suivez l'état de synchronisation et les informations clés", "Préparez le pilotage des services Microsoft 365 dans Veritas"]
  },
  "Google Workspace": {
    title: "Google Workspace",
    icon: "mdi:google",
    subtitle: "Préparez le pilotage Google Workspace de vos clients.",
    description: "La brique Google Workspace permettra de relier l'environnement Google de vos clients à Veritas pour un suivi unifié des services cloud, domaines et intégrations associées.",
    bullets: ["Centralisez la visibilité Google Workspace par entreprise", "Accédez aux informations du domaine et du tenant Google", "Préparez les futures synchronisations et intégrations", "Harmonisez le pilotage cloud avec Microsoft 365 dans Veritas"]
  },
  backup: {
    title: "Backup",
    icon: "mdi:backup-restore",
    subtitle: "Pilotez les sauvegardes de vos clients since Veritas.",
    description: "La brique Backup centralise le suivi des solutions de backup par entreprise : jobs, statuts, dernières exécutions et alertes remontées since vos outils de sauvegarde.",
    bullets: ["Visualisez l'état des sauvegardes since la cartographie entreprise", "Reliez vos solutions de backup à chaque client", "Anticipez les échecs et les jobs en retard", "Harmonisez le pilotage backup avec le reste de l'infrastructure"]
  },
  sharedAccess: {
    title: "Partage d'accès",
    icon: "mdi:key-chain",
    subtitle: "Partagez des accès temporaires avec vos contacts sur le portail.",
    description: "Le partage d'accès permet de transmettre un mot de passe ou un accès temporaire à un contact since son portail client : expiration, limite de consultations, révocation et suppression côté client.",
    bullets: ["Créez un accès partagé en quelques clics since la fiche contact", "Définissez une date d'expiration et un nombre de consultations max", "Révoquez un accès à tout moment since Veritas", "Laissez le contact consulter ou supprimer l'accès sur son portail"]
  }
};
