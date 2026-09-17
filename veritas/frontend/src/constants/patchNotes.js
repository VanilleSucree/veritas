/**
 * Changelog affiché dans Compte → Patch notes.
 * À chaque commit+push : bump package.json (root/frontend/backend) + ajouter une entrée ici.
 * Les notes sont rédigées en français (UI de page traduite via i18n).
 */
export const PATCH_NOTES = [
  {
    version: "1.0.21",
    date: "2026-09-17",
    highlights: [
      "Admin → Rapports : personnalisation avancée de l’identité et de l’apparence (polices, couleurs header/footer, tailles) avec aperçu en direct.",
      "Exports HTML : mise en forme renforcée (titres, cartes KPI Vue d’ensemble, sections, synthèse, points à surveiller).",
      "UniFi : correctif de l’import matériel vide après liaison d’un site (fallback Site Manager, classification Network, filtre site).",
      "NDD OVH : correctif du refresh « Unable to save NDD » (UUID / item_key)."
    ]
  },
  {
    version: "1.0.20",
    date: "2026-09-17",
    highlights: [
      "Intégration UniFi (Site Manager, Network, Carrier Fabric) : tenant global en Admin, lien host/site par entreprise, import switches / gateways / bornes Wi‑Fi.",
      "Rapports : assistant de création simplifié (listes client/type) ; section « Derniers rapports » retirée des pages.",
      "Supervision CheckMK : remontée correcte des hôtes critical/warning (unwrap d’état + host_details) et réouverture d’alertes résolues.",
      "Admin & auth : onglets sticky, branding login (fond panneau droit), fiches profil/permissions allégées, crédits tickets prestation."
    ]
  },
  {
    version: "1.0.19",
    date: "2026-09-17",
    highlights: [
      "Coffre documentaire client : création et navigation de dossiers sur la fiche entreprise.",
      "Rapports de supervision : modal d’enregistrement revue ; archivage en dossier avec les 3 HTML (plus de ZIP) ; correction du 413 à l’enregistrement.",
      "Inventaire périphériques : correction du chargement (mappings CheckMK sur tables sans colonnes dédiées)."
    ]
  },
  {
    version: "1.0.18",
    date: "2026-09-17",
    highlights: [
      "Base de connaissances : modal dossier en panneau latéral avec sélecteur d’icône, drag & drop des collections et articles (réordonner / déplacer).",
      "Base de connaissances : bouton emoji retiré à côté du « + » dans COLLECTIONS.",
      "Rapports de supervision : archivage du ZIP dans le coffre client corrigé après génération."
    ]
  },
  {
    version: "1.0.17",
    date: "2026-09-17",
    highlights: [
      "Rapports de supervision : parcours latéral et typographie allégés, synthèses pleine largeur, natures d’alertes, cartes cyber/cloud, licences M365 nommées et libellé Mailinblack corrigé.",
      "Tickets prestation : onglets Formulaire/Tâches/Discussion, panneau droit repliable, to-dos avec périphérique, documents et crédits.",
      "Supervision : voyants inventaire alignés CheckMK et centre de supervision qui remonte bien les alertes mappées.",
      "Base de connaissances : création de dossier depuis le « + », passage lecture → édition, modal emojis revue."
    ]
  },
  {
    version: "1.0.16",
    date: "2026-09-16",
    highlights: [
      "Base de connaissances : menu latéral type Outline, emojis personnalisés (:nom:) pour articles, titres et icônes de page.",
      "Tickets : suivis en bulles cadrées (style GLPI) côté agent et portail client.",
      "Rapports : fiche entreprise plus fine à la création (contrat, lieux, périphériques, antivirus, antispam, NDD, tenant Microsoft, SSL, abonnements, campagnes).",
      "Documents : filtre entreprise en champ de suggestion (plus de liste complète d’un coup)."
    ]
  },
  {
    version: "1.0.15",
    date: "2026-09-16",
    highlights: [
      "Abonnements : cloche sur fiches entreprise/contact/périphérique, gestion dans Mon profil, notifications in-app/email via le pipeline existant.",
      "Statut actif/inactif unifié (pastille verte/grise) sur les listes et fiches entreprise, contact et prestataire.",
      "Lieux entreprise : renommer un lieu met à jour les périphériques rattachés (plus d'ancien nom orphelin).",
      "Injection : un agent avec le droit Injection peut charger les familles custom sans le droit Familles matériel."
    ]
  },
  {
    version: "1.0.14",
    date: "2026-09-09",
    highlights: [
      "Bitdefender GravityZone : pagination complète de getAccountsList (au-delà des 30 premiers comptes) pour lister toutes les sociétés."
    ]
  },
  {
    version: "1.0.13",
    date: "2026-09-09",
    highlights: [
      "Tables périphériques : les sections de familles custom ne s'affichent plus comme colonnes (titres de regroupement uniquement)."
    ]
  },
  {
    version: "1.0.12",
    date: "2026-09-09",
    highlights: [
      "Fiche équipement : champs Oui/Non affichés en libellé traduit (plus true/false).",
      "Édition équipement custom : correctif du reset intempestif du formulaire pendant la saisie."
    ]
  },
  {
    version: "1.0.11",
    date: "2026-09-09",
    highlights: [
      "Injection CSV : détection d'encodage (UTF-8 / Windows-1252) pour afficher correctement les accents dans l'aperçu et à l'import."
    ]
  },
  {
    version: "1.0.10",
    date: "2026-09-09",
    highlights: [
      "Familles matériel (admin) : regroupement des champs du formulaire par sections, repris sur la fiche équipement et à l'édition."
    ]
  },
  {
    version: "1.0.9",
    date: "2026-09-09",
    highlights: [
      "Correctif : résolution avec validation client (erreur 500) — contrainte d'unicité ticket manquante sur certaines bases."
    ]
  },
  {
    version: "1.0.8",
    date: "2026-09-09",
    highlights: [
      "Réponse ticket : collage d'image en miniature dans l'éditeur, envoi corrigé (sans trombone), aperçu agrandi au clic.",
      "Listes tickets : la colonne Étiquettes se sauvegarde correctement dans le sélecteur de colonnes.",
      "Tickets prestation : journal d'activité lors de l'édition des champs du formulaire."
    ]
  },
  {
    version: "1.0.7",
    date: "2026-09-08",
    highlights: [
      "Tickets prestation : champs liés du formulaire (entreprise, contact) cliquables ; téléphone et e-mail du contact pour appeler ou écrire depuis le ticket.",
      "Onglet Formulaire : édition des champs renseignés avec enregistrement (fichiers joints en lecture seule).",
      "Listes tickets (services et support) : nouvelle colonne Étiquettes avec pastilles colorées, export CSV et sélecteur de colonnes."
    ]
  },
  {
    version: "1.0.6",
    date: "2026-09-07",
    highlights: [
      "Module Prestataires : liste, fiche, multi-contacts, favoris, rattachement depuis une entreprise, et permissions Agents → Permissions.",
      "Side conversation ticket : cible « Prestataire externe » avec sélection du prestataire/contact et préremplissage destinataire/copie.",
      "Menu : disposition horizontale (barre du haut) configurable dans Mon compte, avec tooltips, séparateurs et avatar corrigés.",
      "IA : suggestion de priorité automatique à la création/édition de ticket, et libellés admin des fonctions IA clarifiés.",
      "Administration générale : carte Support/Knowledge Base retirée ; guide Premiers pas en pleine largeur."
    ]
  },
  {
    version: "1.0.5",
    date: "2026-09-07",
    highlights: [
      "Formulaires support : création/édition en admin, utilisation à la création de ticket et page publique avec captcha.",
      "Création presta : ordre des champs respecté (dont texte long), listes agents/entreprises/contacts en mode recherche, infos commerciales retirées du formulaire fixe.",
      "Administration : onglets Catégories (support et services) en deux colonnes pour voir sections et catégories ensemble.",
      "Correctif build frontend : import du panneau de satisfaction clients aligné sur l'API."
    ]
  },
  {
    version: "1.0.4",
    date: "2026-09-07",
    highlights: [
      "Tickets prestation/installation : décompte des crédits entreprise au niveau du ticket ou à la clôture d'une tâche.",
      "Fiche entreprise / Administration : correction du modal de création de carnets qui se réinitialisait, et affichage fiable des carnets après création.",
      "Statut des carnets (dates) corrigé pour le listing et le décompte depuis les tickets support et prestation."
    ]
  },
  {
    version: "1.0.3",
    date: "2026-09-04",
    highlights: [
      "Création d'une demande prestation/installation : header aligné sur les autres pages et champ Sujet optionnel (sinon titre généré automatiquement).",
      "Tickets prestation : les assignés et suiveurs affichent désormais les noms pour tous les profils ; les agents peuvent assigner des collaborateurs sur les todos.",
      "Todos prestation : assignation multi-agents, date de planning optionnelle, liaison périphérique synchronisée avec le planning.",
      "Portail client : bouton « Prendre le contrôle » (impersonation) rétabli et accessible à tous les agents.",
      "Planning : défilement de la colonne principale et vues multi-mois corrigés."
    ]
  },
  {
    version: "1.0.2",
    date: "2026-09-03",
    highlights: [
      "Administration > Agents : les profils Administrateur et Super Admin peuvent désormais modifier un agent et lui attribuer un profil Administrateur ou Super Admin.",
      "L'attribution d'un accès administrateur reste réservée aux profils administrateurs, pour éviter toute élévation de privilèges."
    ]
  },
  {
    version: "1.0.1",
    date: "2026-09-03",
    highlights: [
      "Fiche périphérique RMM condensée : cartes système, processeur, mémoire et stockage plus compactes.",
      "Création d'un ticket support depuis le centre de supervision : contact principal, périphérique, description détaillée et catégorie « monitoring » préremplis.",
      "Onglet Supervision désormais visible par tous les profils, sans droits d'administration.",
      "Pages Mon compte et Patch notes alignées sur le header standard de l'application."
    ]
  },
  {
    version: "1.0.0",
    date: "2026-09-02",
    highlights: [
      "Version initiale de référence pour le suivi des patch notes Veritas."
    ]
  }
];
