import { interpolate, pickLocaleMessages } from "../../i18n/translate";
import { getTicketCreateCopy, ATTACHMENT_FORMATS_LABEL } from "./ticketCreatePageI18n";
import { getTicketReminderModalCopy } from "./ticketReminderModalI18n";
const LOCALE_BCP47 = {
  fr: "fr-FR",
  en: "en-GB",
  de: "de-DE",
  it: "it-IT",
  es: "es-ES"
};
const SUBMIT_ACTION_IDS = ["open", "pending", "on_hold", "solved"];
const SIDE_CONVERSATION_TEAMS = ["commercial", "n2", "cyber", "external"];
const DETAIL_COPY = {
  fr: {
    pageTitle: "Ticket",
    ticketNumber: "Ticket #{number}",
    fallbackDash: "-",
    fallbackEmDash: "-",
    linkFallback: "Lien",
    imageAlt: "Image",
    attachmentDefault: "Pièce jointe",
    authorAgent: "Agent",
    authorSystem: "Système",
    authorYou: "Vous",
    linkedTicketFallback: "Ticket lié",
    equipmentFallback: "Matériel",
    equipmentFallbackNumbered: "Matériel #{id}",
    sideConversationSubjectFallback: "Conversation annexe",
    statusClosed: "Clos",
    submitActions: {
      open: "Envoyer en Ouvert",
      pending: "Envoyer en En cours",
      on_hold: "Envoyer en En Attente",
      solved: "Envoyer en Résolu"
    },
    sideConversationTeams: {
      commercial: "Commercial",
      n2: "Technicien niveau 2",
      cyber: "Agent cybersécurité",
      external: "Prestataire externe"
    },
    sidebarExpand: {
      collapseAria: "Réduire la section",
      expandAria: "Développer la section",
      showLess: "Voir moins",
      showMore: "Voir plus"
    },
    formatDuration: {
      lessThanOneMin: "<1 min",
      daysHours: "{days} j {hours} h",
      daysOnly: "{days} j",
      hoursMinutes: "{hours} h {minutes} min",
      hoursOnly: "{hours} h",
      minutesOnly: "{minutes} min"
    },
    resolutionStatus: {
      pending: "En attente validation client",
      rejected: "Solution refusée par le client",
      accepted: "Solution validée par le client",
      autoClosed: "Clos automatiquement (48 h)",
      default: "Validation client",
      deadline: "Échéance {dateTime}"
    },
    activity: {
      splitFrom: "Scission reçue depuis le ticket clôturé {number}{titleSuffix}",
      splitTo: "Ticket scindé vers {number}{titleSuffix}",
      linkedRemoved: "Ticket délié : {number}",
      linkedAdded: "Ticket lié : {number}{titleSuffix}",
      equipmentRemoved: "Matériel délié : {label}",
      equipmentAdded: "Matériel lié : {label}",
      sideClosed: "Conversation annexe fermée : {subject}",
      sideReopened: "Conversation annexe réouverte : {subject}",
      sideMessage: "Message conversation annexe : {subject}",
      sideOpened: "Conversation annexe ouverte : {subject}",
      created: "Ticket créé",
      statusChange: "Statut : {newLabel}",
      statusTransition: "Statut : {oldLabel} → {newLabel}",
      internalNote: "Note interne ajoutée",
      publicReply: "Réponse publique",
      deleted: "Ticket envoyé en corbeille",
      restored: "Ticket restauré",
      attachmentOne: "{count} pièce jointe",
      attachmentMany: "{count} pièces jointes",
      emptyValue: "—",
      yes: "Oui",
      no: "Non",
      contactFallback: "Contact #{id}",
      clientFallback: "Entreprise #{id}",
      fieldChanged: "{field} : {oldValue} → {newValue}",
      fieldSet: "{field} : {newValue}",
      fieldCleared: "{field} retiré ({oldValue})",
      assigneeAdded: "Assigné ajouté : {name}",
      assigneeRemoved: "Assigné retiré : {name}",
      watcherAdded: "Follower ajouté : {name}",
      watcherRemoved: "Follower retiré : {name}",
      tagAdded: "Étiquette ajoutée : {label}",
      tagRemoved: "Étiquette retirée : {label}",
      fields: {
        title: "Titre",
        description: "Description",
        priority: "Priorité",
        type: "Type",
        category: "Catégorie",
        channel: "Canal",
        client_id: "Entreprise",
        requester_user_id: "Demandeur (utilisateur)",
        requester_contact_id: "Demandeur",
        assigned_user_id: "Assigné principal",
        is_major_incident: "Incident majeur",
        assignee: "Assigné",
        watcher: "Follower",
        tag: "Étiquette",
        unknown: "Champ"
      }
    },
    commentDisplay: {
      splitFrom: "Scission reçue depuis le ticket clôturé ",
      splitTo: "Ticket scindé vers ",
      linkedRemoved: "Ticket délié: ",
      linkedAdded: "Ticket lié: ",
      equipmentRemoved: "Matériel délié: ",
      equipmentAdded: "Matériel lié: ",
      sideClosed: "Side conversation fermée: {subject}",
      sideReopened: "Side conversation réouverte: {subject}",
      sideOpened: "Side conversation ouverte: {subject}",
      sideSubjectFallback: "Side conversation",
      warranty: "Garantie: {value}",
      licenses: "Licences: {value}"
    },
    whatsappDeliveryErrorWithDetail: "Commentaire enregistré, mais l'envoi WhatsApp a échoué : {error}",
    whatsappDeliveryError: "Commentaire enregistré, mais l'envoi WhatsApp a échoué.",
    satisfactionStarsAria: "{rating} sur 5 étoiles",
    satisfactionAverage: "Moyenne",
    slaTitle: {
      firstResponse: "Délai première prise en charge",
      resolution: "Délai résolution",
      closed: "SLA à la clôture",
      default: "SLA"
    },
    takeoverTooltipHas: "Premier passage du statut Nouveau vers {status}",
    takeoverTooltipNone: "Aucune prise en charge enregistrée (ticket toujours au statut Nouveau)",
    getChannelVia: {
      web: "Via web",
      email: "Via email",
      phone: "Via téléphone",
      chat: "Via chat",
      api: "Via API",
      fallback: "Via {channel}"
    },
    confirms: {
      softDelete: "Envoyer ce ticket à la corbeille ?",
      permanentDelete: "Supprimer définitivement ce ticket ? Cette action est irréversible.",
      deleteComment: "Supprimer ce message ? Cette action est irréversible.",
      reopenTicket: "Rouvrir ce ticket ? Il repassera en statut « En cours ».",
      deleteReminder: "Supprimer cette alerte du planning ?"
    },
    prompts: {
      linkUrl: "Saisis l'URL du lien :",
      linkUrlDefault: "https://"
    },
    header: {
      backAria: "Retour au support",
      backTitle: "Retour au support",
      ticketContextAria: "Contexte du ticket",
      titlePlaceholder: "Titre du ticket",
      titleAria: "Titre du ticket",
      editTitleTitle: "Cliquer pour modifier le titre",
      editTitleAria: "Modifier le titre du ticket",
      sideConversationsAria: "Conversations annexes",
      sideConversationsLabel: "Conv. annexes",
      newSideConversationTitle: "Nouvelle conversation annexe",
      newSideConversationAria: "Nouvelle conversation annexe",
      sideConversationChipAria: "Conversation annexe : {subject}",
      ticketOptionsTitle: "Exclusion / scinder le ticket",
      ticketOptionsAria: "Exclusion et scission du ticket",
      menuAddExclusion: "Ajouter aux exclusions",
      menuSplit: "Scinder dans un autre ticket",
      reminderProTooltip: "Programmer une alerte dans le planning · réservé à Veritas Pro",
      reminderProAria: "Alerte planning · disponible avec Veritas Pro",
      reminderEditAria: "Modifier l'alerte planning",
      reminderScheduleAria: "Programmer une alerte planning",
      proBadge: "Pro",
      familySupport: "Support",
      familyServices: "Services",
      onboardingBadge: "Onboarding"
    },
    empty: {
      noTicketSelected: "Aucun ticket sélectionné.",
      loading: "Chargement...",
      notFound: "Ticket introuvable.",
      noComments: "Aucun commentaire pour l'instant.",
      noActivity: "Aucune activité enregistrée.",
      noPreviousInteractions: "Aucune interaction précédente.",
      noSatisfaction: "Aucune évaluation client pour ce ticket.",
      deletedBadge: "Ticket en corbeille"
    },
    leftPane: {
      properties: "Propriétés",
      requester: "Demandeur",
      assignee: "Assigné",
      assignMe: "M'assigner",
      assignMeAlready: "Déjà assigné",
      follower: "Follower",
      status: "Statut",
      type: "Type",
      category: "Catégorie",
      more: "Autres",
      tags: "Étiquettes",
      tagsAria: "Étiquettes du ticket",
      tagPlaceholder: "Étiquette…",
      tagAddAria: "Ajouter une étiquette",
      tagConfirmAria: "Confirmer l'étiquette",
      tagAddTooltip: "Ajouter une étiquette",
      tagCreate: "Créer « {label} »",
      tagEmpty: "Aucune étiquette correspondante",
      removeTagAria: "Retirer l'étiquette {label}"
    },
    description: {
      initial: "Demande initiale",
      requesterFallback: "Demandeur",
      placeholder: "Décrivez le problème ou la demande…",
      editAria: "Demande initiale du ticket",
      editTitle: "Modifier le titre et la description",
      editButtonAria: "Modifier le titre et la description",
      empty: "Aucune description"
    },
    comment: {
      editedMark: " · modifié",
      createdLabel: "Créé :",
      byLabel: "par",
      privateTitle: "Réponse privée",
      editTooltip: "Modifier le message",
      editAria: "Modifier le message",
      deleteTooltip: "Supprimer le message",
      deleteAria: "Supprimer le message",
      unreadTooltip: "Nouveau commentaire non lu",
      markReadAria: "Marquer la notification comme lue",
      attachmentOpenTitle: "{name} (ouvrir dans un nouvel onglet)",
      editKeepAttachmentAria: "Conserver la pièce jointe {name}",
      editRemoveAttachmentAria: "Retirer la pièce jointe {name}",
      editUndoRemoveTitle: "Annuler le retrait",
      editRemoveTitle: "Retirer la pièce jointe",
      editSaving: "Enregistrement…",
      editSave: "Enregistrer",
      editCancel: "Annuler"
    },
    timeline: {
      scrollTopAria: "Remonter en haut de la conversation",
      scrollTopTitle: "Remonter en haut"
    },
    reply: {
      dropTitle: "Déposez vos fichiers ici",
      dropHint: "Limites: 15 Mo max/fichier | Extensions autorisées: PDF, JPG, PNG, DOC, DOCX, CSV, XLS, XLSX",
      templateSelect: "Sélectionner un template",
      templateTitle: "Appliquer un template de réponse",
      toolBold: "Gras",
      toolList: "Liste",
      toolLink: "Lien",
      linkModalTitle: "Insérer un lien",
      linkModalHint: "Collez l'adresse de la page à lier à votre texte.",
      linkModalUrlLabel: "Adresse du lien",
      linkModalUrlPlaceholder: "https://",
      linkModalTextLabel: "Texte affiché",
      linkModalTextPlaceholder: "Texte du lien (optionnel)",
      linkModalInsert: "Insérer",
      linkModalError: "URL invalide. Utilisez un lien web complet (https://…).",
      toolEmoji: "Emoji",
      emojiSearch: "Rechercher un emoji…",
      emojiEmpty: "Aucun emoji trouvé",
      emojiRecent: "Récents",
      emojiSmileys: "Smileys",
      emojiGestures: "Gestes",
      emojiPeople: "Personnes",
      emojiAnimals: "Animaux & nature",
      emojiFood: "Nourriture",
      emojiTravel: "Voyages",
      emojiObjects: "Objets",
      emojiSymbols: "Symboles",
      suggestAi: "Réponse auto",
      suggestAiTitle: "Réponse automatique IA (technique et courtoise)",
      suggestAiLoading: "Suggestion…",
      correctAiTitle: "Enrichir et corriger le texte",
      correctAiLoading: "Enrichissement…",
      correctAiMenuTitle: "Enrichir le texte",
      correctAiGroup_improve: "Améliorer",
      correctAiGroup_transform: "Transformer",
      correctAiGroup_structure: "Structurer",
      correctAiMode_enrich: "Enrichir & corriger",
      correctAiModeHint_enrich: "Style, clarté, formules de politesse",
      correctAiMode_professional: "Plus professionnel",
      correctAiModeHint_professional: "Registre MSP plus formel et précis",
      correctAiMode_friendly: "Plus chaleureux",
      correctAiModeHint_friendly: "Empathique, rassurant, naturel",
      correctAiMode_simplify: "Simplifier",
      correctAiModeHint_simplify: "Langage clair, sans jargon",
      correctAiMode_shorten: "Raccourcir",
      correctAiModeHint_shorten: "Plus concis, sans perdre les faits",
      correctAiMode_expand: "Développer",
      correctAiModeHint_expand: "Compléter les idées déjà présentes",
      correctAiMode_rephrase: "Reformuler",
      correctAiModeHint_rephrase: "Même sens, autre formulation",
      correctAiMode_bullets: "Mettre en liste",
      correctAiModeHint_bullets: "Puces claires et scannables",
      correctAiMode_steps: "Plan d'action",
      correctAiModeHint_steps: "Étapes numérotées pour le client",
      addFiles: "Ajouter des fichiers",
      modePrivateTitle: "Réponse privée (visible uniquement en interne)",
      modePublicTitle: "Réponse publique (visible par le demandeur)",
      modePrivate: "Réponse privée",
      modePublic: "Réponse publique",
      collapseTooltip: "Réduire la zone de réponse",
      collapseAria: "Réduire la zone de réponse",
      expandSummary: "Rédiger une réponse",
      draftHint: "Brouillon en cours",
      expandAria: "Développer la zone de réponse",
      expandTooltip: "Développer la zone de réponse"
    },
    rightPane: {
      channel: "Canal",
      ticketSection: "Ticket",
      created: "Créé :",
      takeover: "Prise en charge :",
      updated: "MAJ :",
      closed: "Clôture :",
      contact: "Contact",
      name: "Nom :",
      phone: "Téléphone :",
      email: "Email :",
      role: "Rôle :",
      satisfaction: "Satisfaction client",
      satisfactionBy: "Par :",
      satisfactionDate: "Date :",
      satisfactionEmptyAria: "Aucune évaluation client",
      satisfactionFilledAria: "Évaluation client reçue",
      linkedTicket: "Ticket lié",
      searchTicket: "Rechercher un ticket…",
      noTicket: "Aucun ticket trouvé",
      noLinkedTicket: "Aucun ticket lié",
      removeLinkedTicketAria: "Retirer le lien avec le ticket #{number}",
      linkedEquipment: "Matériel lié",
      searchEquipment: "Rechercher un matériel…",
      companyRequired: "Entreprise requise",
      linkCompanyFirst: "Associez une entreprise au ticket",
      noEquipment: "Aucun matériel trouvé",
      noLinkedEquipment: "Aucun matériel lié",
      removeEquipmentAria: "Retirer le lien avec {label}",
      history: "Historique",
      ticketLog: "Historique du ticket",
      historyBackAria: "Revenir au contexte",
      historyToggleAria: "Historique du ticket",
      historyToggleTitle: "Historique du ticket",
      historyRefreshTitle: "Actualiser l'historique",
      historyRefreshAria: "Actualiser l'historique du ticket",
      historyBackTitle: "Revenir au contexte",
      runbookToggleTitle: "Aide technicien",
      runbookToggleAria: "Afficher l’aide technicien IA",
      runbookBackTitle: "Revenir au contexte",
      runbookBackAria: "Revenir au contexte"
    },
    sidebar: {
      classicViewTitle: "Vue classique",
      classicViewAria: "Afficher la vue classique",
      kbTitle: "Ouvrir la Knowledge Base",
      kbDisabledTitle: "Knowledge Base non configurée (Administration → Paramètres généraux)",
      deleteTitle: "Supprimer le ticket",
      runbookTitle: "Aide technicien IA",
      runbookBackTitle: "Revenir au contexte"
    },
    reopenModal: {
      eyebrow: "Support",
      title: "Rouvrir le ticket",
      subtitle: "Le ticket repassera en statut « En cours ». Indiquez la raison de la réouverture.",
      ticketLabel: "Ticket",
      untitledTicket: "Sans titre",
      reasonLabel: "Raison de la réouverture",
      reasonPlaceholder: "Expliquez pourquoi ce ticket doit être rouvert…",
      cancel: "Annuler",
      confirm: "Rouvrir le ticket",
      confirming: "Réouverture…",
      closeAria: "Fermer"
    },
    resolveModal: {
      eyebrow: "Support",
      title: "Résoudre le ticket",
      subtitle: "Le client pourra valider la solution depuis son portail. Sans réponse sous 48 h, le ticket sera clos automatiquement.",
      navAria: "Sections de résolution",
      footerHint: "Les champs marqués * sont obligatoires",
      ticketLabel: "Ticket",
      untitledTicket: "Sans titre",
      infoBanner: "Catégorisez l'intervention pour alimenter vos statistiques de support (type de lieu et action réalisée).",
      pendingReplyHint: "Votre réponse en cours sera envoyée lors de la confirmation.",
      interventionLabel: "Type d'intervention",
      interventionPlaceholder: "À distance, Sur site, En atelier…",
      interventionEmpty: "Aucun type d'intervention",
      actionLabel: "Type d'action",
      actionPlaceholder: "Configuration, Mise à jour, Réparation…",
      actionEmpty: "Aucun type d'action",
      loading: "Chargement…",
      reasonLabel: "Raison de la résolution",
      reasonPlaceholder: "Décrivez la solution apportée et ce qui a été fait pour le client…",
      consumeCredit: "Décompter des crédits support",
      consumeCreditLegacy: "Décompter des crédits",
      creditPerPackLabel: "Crédits par carnet",
      creditPerPackHint: "Applique la même quantité à chaque type de carnet actif.",
      creditPackRemaining: "{count} restant(s)",
      creditTotalDebit: "Total à décompter : {count}",
      creditPackAmountAria: "Crédits à décompter pour {label}",
      noCreditHint: "Aucun crédit disponible sur ce contrat",
      creditAvailable: "{count} crédit disponible",
      creditAvailablePlural: "{count} crédits disponibles",
      creditConsumed: "{count} crédit(s) déjà décompté(s) pour ce ticket",
      sections: {
        solution: {
          label: "Solution",
          description: "Classification et description",
          icon: "mdi:clipboard-check-outline"
        },
        credits: {
          label: "Crédits support",
          description: "Décompte à la résolution",
          icon: "mdi:ticket-confirmation-outline"
        }
      },
      cancel: "Annuler",
      confirm: "Résoudre et demander validation",
      confirming: "Résolution…",
      closeAria: "Fermer"
    },
    footer: {
      closedHint: "Ticket clos · consultation uniquement",
      reopening: "Réouverture…",
      reopen: "Rouvrir le ticket",
      applyMacro: "Appliquer macro",
      apply: "Appliquer",
      restore: "Restaurer",
      permanentDelete: "Supprimer définitivement",
      creditConsumed: "{count} crédit(s) déjà décompté(s) pour ce ticket",
      creditAvailable: "{count} crédit disponible",
      creditAvailablePlural: "{count} crédits disponibles",
      consumeCredit: "Décompter des crédits à la résolution (1 par carnet)",
      refundCredit: "Rembourser le crédit consommé",
      resolveTitle: "Résoudre et demander la validation client",
      resolve: "Résoudre",
      sending: "Envoi...",
      submitStatusAria: "Choisir le statut de soumission"
    },
    macroAttachmentModal: {
      title: "Pièce jointe pour la macro",
      hint: "Cette macro contient une action de pièce jointe. Tu peux ajouter un ou plusieurs fichiers avant l'exécution, ou continuer sans fichier.",
      addFiles: "Ajouter des fichiers",
      cancel: "Annuler",
      continue: "Continuer"
    },
    sideModal: {
      newTitle: "Nouvelle side conversation",
      newSubtitle: "Renseigne les champs puis envoie la demande",
      target: "Cible",
      subject: "Sujet",
      subjectPlaceholder: "Ex: Besoin d'escalade sur ce ticket",
      prestataire: "Prestataire rattaché",
      prestatairePlaceholder: "Sélectionner un prestataire…",
      prestataireLoading: "Chargement des prestataires…",
      prestataireEmpty: "Aucun prestataire rattaché à cette entreprise.",
      prestataireNoClient: "Rattachez d'abord une entreprise au ticket pour proposer des prestataires.",
      prestataireContact: "Contact du prestataire",
      prestataireContactPlaceholder: "Sélectionner un contact…",
      prestataireAppliedHint: "Destinataire et copie préremplis depuis le prestataire.",
      recipient: "Destinataire",
      recipientPlaceholder: "Ex: jean.dupont@client.fr",
      cc: "Copie (CC)",
      ccPlaceholder: "Ex: marie@client.fr, support@client.fr",
      message: "Message",
      messagePlaceholder: "Décris la demande d'aide...",
      cancel: "Annuler",
      send: "Envoyer la demande",
      statusDone: "Terminée",
      statusOpen: "Ouverte",
      toPrefix: "To: ",
      ccPrefix: "CC: ",
      replyPlaceholder: "Répondre...",
      sendReply: "Envoyer",
      reopen: "Réouvrir",
      close: "Fermer",
      prestataireSubject: "Ticket #{number} — {provider}"
    },
    toasts: {
      loadTicketError: "Erreur lors du chargement du ticket",
      updateError: "Erreur lors de la mise à jour",
      majorIncidentEnabled: "Incident majeur activé",
      majorIncidentDisabled: "Incident majeur désactivé",
      replySent: "Réponse envoyée",
      commentAddError: "Erreur lors de l'ajout du commentaire",
      submitNeedMessage: "Ajoute un message avant de soumettre",
      messageSentStatusUpdated: "Message envoyé et statut mis à jour",
      submitError: "Erreur lors de la soumission",
      playModeDisabled: "Mode ticket aléatoire désactivé",
      invalidUrl: "URL invalide. Utilise un lien web complet (https://...).",
      templateApplied: "Template \"{name}\" appliqué",
      tagAdded: "Tag ajouté",
      tagAddError: "Erreur lors de l'ajout du tag",
      tagRemoved: "Tag supprimé",
      tagRemoveError: "Erreur lors de la suppression du tag",
      followerAdded: "Follower ajouté",
      followerAddError: "Erreur lors de l'ajout du follower",
      followerRemoved: "Follower retiré",
      followerRemoveError: "Erreur lors de la suppression du follower",
      assigneeAdded: "Assigné ajouté",
      assigneeAddError: "Erreur lors de l'ajout de l'assigné",
      assigneeRemoved: "Assigné retiré",
      assigneeRemoveError: "Erreur lors de la suppression de l'assigné",
      titleRequired: "Le titre est requis",
      titleUpdated: "Titre mis à jour",
      descriptionUpdated: "Description mise à jour",
      requesterUpdated: "Demandeur mis à jour",
      requesterCompanyAmbiguous: "Ce contact est lié à plusieurs entreprises — l'entreprise du ticket est conservée",
      emailLinked: "Email rattaché au contact",
      emailLinkError: "Impossible de rattacher l'email",
      categoryUpdated: "Catégorie mise à jour",
      statusUpdated: "Statut mis à jour",
      typeUpdated: "Type mis à jour",
      priorityUpdated: "Priorité mise à jour",
      channelUpdated: "Canal mis à jour",
      selectValidTicket: "Sélectionne un ticket valide",
      ticketLinked: "Ticket lié",
      ticketLinkError: "Erreur lors de l'ajout du ticket lié",
      ticketUnlinked: "Ticket délié",
      ticketUnlinkError: "Erreur lors de la suppression du ticket lié",
      selectValidEquipment: "Sélectionne un matériel valide",
      equipmentLinked: "Matériel lié",
      equipmentLinkError: "Erreur lors de l'ajout du matériel lié",
      equipmentUnlinked: "Matériel délié",
      equipmentUnlinkError: "Erreur lors de la suppression du matériel lié",
      movedToTrash: "Ticket déplacé en corbeille",
      deleteError: "Erreur lors de la suppression",
      restored: "Ticket restauré",
      restoreError: "Erreur lors de la restauration",
      adminOnlyPermanentDelete: "Seuls les administrateurs peuvent supprimer définitivement un ticket",
      permanentlyDeleted: "Ticket supprimé définitivement",
      permanentDeleteError: "Erreur lors de la suppression définitive",
      macroNotFound: "Macro introuvable",
      macroTeamsPro: "Message Teams · disponible avec Veritas Pro",
      macroTeamsWebhookMissing: "Webhook Teams non configuré dans la macro",
      macroExecuted: "Macro exécutée",
      macroError: "Erreur lors de l'exécution de la macro",
      sideConversationMessageRequired: "Le message de side conversation est requis",
      sideConversationSent: "Demande envoyée à {teamLabel}",
      sideConversationSendError: "Erreur lors de l'envoi de la side conversation",
      sideConversationReplyError: "Erreur lors de l'envoi du message side conversation",
      sideConversationClosed: "Side conversation fermée",
      sideConversationCloseError: "Erreur lors de la fermeture de la side conversation",
      sideConversationReopened: "Side conversation réouverte",
      sideConversationReopenError: "Erreur lors de la réouverture de la side conversation",
      messageEmpty: "Le message ne peut pas être vide.",
      messageEdited: "Message modifié",
      messageEditError: "Erreur lors de la modification du message",
      messageDeleted: "Message supprimé",
      messageDeleteError: "Erreur lors de la suppression du message",
      resolvedPendingValidation: "Ticket résolu · validation client demandée.",
      resolveError: "Impossible de résoudre le ticket.",
      ticketReopened: "Ticket rouvert",
      reopenError: "Impossible de rouvrir le ticket",
      reopenComment: "[Réouverture du ticket] {reason}",
      exclusionValueRequired: "La valeur d'exclusion est requise.",
      exclusionAdded: "Règle d'exclusion ajoutée à la collecte email.",
      exclusionError: "Impossible d'ajouter le ticket aux exclusions.",
      splitNoTarget: "Aucun ticket existant disponible pour la scission.",
      splitSuccess: "Ticket #{closedNumber} clôturé et rattaché au ticket #{targetNumber}.",
      splitError: "Impossible de scinder le ticket.",
      reminderInvalidFields: "Libellé, date ou heure invalide",
      reminderUpdated: "Alerte mise à jour",
      reminderAdded: "Alerte ajoutée au planning",
      reminderSaveError: "Impossible d'enregistrer l'alerte",
      reminderDeleted: "Alerte supprimée",
      reminderDeleteError: "Impossible de supprimer l'alerte",
      aiSuggestOk: "Réponse automatique appliquée",
      aiSuggestError: "Impossible de générer la réponse automatique",
      aiPriorityOk: "Priorité automatique appliquée",
      aiPriorityError: "Impossible de suggérer la priorité",
      aiCorrectEmpty: "Saisissez un texte à enrichir",
      aiCorrectOk: "Texte enrichi et corrigé",
      aiCorrectUnchanged: "Le texte est déjà optimal",
      aiCorrectError: "Impossible d'enrichir le texte"
    },
    playMode: {
      banner: "Mode aléatoire",
      tooltip: "Ticket aléatoire · enchaîne après chaque envoi (Maj+clic pour arrêter)",
      aria: "Ouvrir un ticket aléatoire"
    }
  },
  en: {
    pageTitle: "Ticket",
    ticketNumber: "Ticket #{number}",
    fallbackDash: "-",
    fallbackEmDash: "-",
    linkFallback: "Link",
    imageAlt: "Image",
    attachmentDefault: "Attachment",
    authorAgent: "Agent",
    authorSystem: "System",
    authorYou: "You",
    linkedTicketFallback: "Linked ticket",
    equipmentFallback: "Hardware",
    equipmentFallbackNumbered: "Hardware #{id}",
    sideConversationSubjectFallback: "Side conversation",
    statusClosed: "Closed",
    submitActions: {
      open: "Send as Open",
      pending: "Send as In progress",
      on_hold: "Send as Pending",
      solved: "Send as Resolved"
    },
    sideConversationTeams: {
      commercial: "Sales",
      n2: "Level 2 technician",
      cyber: "Cybersecurity agent",
      external: "External provider"
    },
    sidebarExpand: {
      collapseAria: "Collapse section",
      expandAria: "Expand section",
      showLess: "Show less",
      showMore: "Show more"
    },
    formatDuration: {
      lessThanOneMin: "<1 min",
      daysHours: "{days} d {hours} h",
      daysOnly: "{days} d",
      hoursMinutes: "{hours} h {minutes} min",
      hoursOnly: "{hours} h",
      minutesOnly: "{minutes} min"
    },
    resolutionStatus: {
      pending: "Awaiting client validation",
      rejected: "Solution rejected by client",
      accepted: "Solution validated by client",
      autoClosed: "Auto-closed (48 h)",
      default: "Client validation",
      deadline: "Deadline {dateTime}"
    },
    activity: {
      splitFrom: "Split received from closed ticket {number}{titleSuffix}",
      splitTo: "Ticket split to {number}{titleSuffix}",
      linkedRemoved: "Ticket unlinked: {number}",
      linkedAdded: "Ticket linked: {number}{titleSuffix}",
      equipmentRemoved: "Hardware unlinked: {label}",
      equipmentAdded: "Hardware linked: {label}",
      sideClosed: "Side conversation closed: {subject}",
      sideReopened: "Side conversation reopened: {subject}",
      sideMessage: "Side conversation message: {subject}",
      sideOpened: "Side conversation opened: {subject}",
      created: "Ticket created",
      statusChange: "Status: {newLabel}",
      statusTransition: "Status: {oldLabel} → {newLabel}",
      internalNote: "Internal note added",
      publicReply: "Public reply",
      deleted: "Ticket moved to trash",
      restored: "Ticket restored",
      attachmentOne: "{count} attachment",
      attachmentMany: "{count} attachments",
      emptyValue: "—",
      yes: "Yes",
      no: "No",
      contactFallback: "Contact #{id}",
      clientFallback: "Company #{id}",
      fieldChanged: "{field}: {oldValue} → {newValue}",
      fieldSet: "{field}: {newValue}",
      fieldCleared: "{field} cleared ({oldValue})",
      assigneeAdded: "Assignee added: {name}",
      assigneeRemoved: "Assignee removed: {name}",
      watcherAdded: "Follower added: {name}",
      watcherRemoved: "Follower removed: {name}",
      tagAdded: "Tag added: {label}",
      tagRemoved: "Tag removed: {label}",
      fields: {
        title: "Title",
        description: "Description",
        priority: "Priority",
        type: "Type",
        category: "Category",
        channel: "Channel",
        client_id: "Company",
        requester_user_id: "Requester (user)",
        requester_contact_id: "Requester",
        assigned_user_id: "Primary assignee",
        is_major_incident: "Major incident",
        assignee: "Assignee",
        watcher: "Follower",
        tag: "Tag",
        unknown: "Field"
      }
    },
    commentDisplay: {
      splitFrom: "Split received from closed ticket ",
      splitTo: "Ticket split to ",
      linkedRemoved: "Ticket unlinked: ",
      linkedAdded: "Ticket linked: ",
      equipmentRemoved: "Hardware unlinked: ",
      equipmentAdded: "Hardware linked: ",
      sideClosed: "Side conversation closed: {subject}",
      sideReopened: "Side conversation reopened: {subject}",
      sideOpened: "Side conversation opened: {subject}",
      sideSubjectFallback: "Side conversation",
      warranty: "Warranty: {value}",
      licenses: "Licenses: {value}"
    },
    whatsappDeliveryErrorWithDetail: "Comment saved, but WhatsApp delivery failed: {error}",
    whatsappDeliveryError: "Comment saved, but WhatsApp delivery failed.",
    satisfactionStarsAria: "{rating} out of 5 stars",
    satisfactionAverage: "Average",
    slaTitle: {
      firstResponse: "First response deadline",
      resolution: "Resolution deadline",
      closed: "SLA at closure",
      default: "SLA"
    },
    takeoverTooltipHas: "First transition from New to {status}",
    takeoverTooltipNone: "No takeover recorded (ticket still at New status)",
    getChannelVia: {
      web: "Via web",
      email: "Via email",
      phone: "Via phone",
      chat: "Via chat",
      api: "Via API",
      fallback: "Via {channel}"
    },
    confirms: {
      softDelete: "Move this ticket to trash?",
      permanentDelete: "Permanently delete this ticket? This action cannot be undone.",
      deleteComment: "Delete this message? This action cannot be undone.",
      reopenTicket: "Reopen this ticket? It will return to In progress status.",
      deleteReminder: "Remove this alert from the schedule?"
    },
    prompts: {
      linkUrl: "Enter the link URL:",
      linkUrlDefault: "https://"
    },
    header: {
      backAria: "Back to support",
      backTitle: "Back to support",
      ticketContextAria: "Ticket context",
      titlePlaceholder: "Ticket title",
      titleAria: "Ticket title",
      editTitleTitle: "Click to edit title",
      editTitleAria: "Edit ticket title",
      sideConversationsAria: "Side conversations",
      sideConversationsLabel: "Side conv.",
      newSideConversationTitle: "New side conversation",
      newSideConversationAria: "New side conversation",
      sideConversationChipAria: "Side conversation: {subject}",
      ticketOptionsTitle: "Exclude / split ticket",
      ticketOptionsAria: "Ticket exclusion and split",
      menuAddExclusion: "Add to exclusions",
      menuSplit: "Split into another ticket",
      reminderProTooltip: "Schedule a planning alert · Veritas Pro only",
      reminderProAria: "Planning alert · available with Veritas Pro",
      reminderEditAria: "Edit planning alert",
      reminderScheduleAria: "Schedule a planning alert",
      proBadge: "Pro",
      familySupport: "Support",
      familyServices: "Services",
      onboardingBadge: "Onboarding"
    },
    empty: {
      noTicketSelected: "No ticket selected.",
      loading: "Loading...",
      notFound: "Ticket not found.",
      noComments: "No comments yet.",
      noActivity: "No activity recorded.",
      noPreviousInteractions: "No previous interactions.",
      noSatisfaction: "No customer rating for this ticket yet.",
      deletedBadge: "Ticket in trash"
    },
    leftPane: {
      properties: "Properties",
      requester: "Requester",
      assignee: "Assignee",
      assignMe: "Assign to me",
      assignMeAlready: "Already assigned",
      follower: "Follower",
      status: "Status",
      type: "Type",
      category: "Category",
      more: "More",
      tags: "Tags",
      tagsAria: "Ticket tags",
      tagPlaceholder: "Tag…",
      tagAddAria: "Add a tag",
      tagConfirmAria: "Confirm tag",
      tagAddTooltip: "Add a tag",
      tagCreate: "Create “{label}”",
      tagEmpty: "No matching tag",
      removeTagAria: "Remove tag {label}"
    },
    description: {
      initial: "Initial request",
      requesterFallback: "Requester",
      placeholder: "Describe the issue or request…",
      editAria: "Initial ticket request",
      editTitle: "Edit title and description",
      editButtonAria: "Edit title and description",
      empty: "No description"
    },
    comment: {
      editedMark: " · edited",
      createdLabel: "Created:",
      byLabel: "by",
      privateTitle: "Private reply",
      editTooltip: "Edit message",
      editAria: "Edit message",
      deleteTooltip: "Delete message",
      deleteAria: "Delete message",
      unreadTooltip: "New unread comment",
      markReadAria: "Mark notification as read",
      attachmentOpenTitle: "{name} (open in new tab)",
      editKeepAttachmentAria: "Keep attachment {name}",
      editRemoveAttachmentAria: "Remove attachment {name}",
      editUndoRemoveTitle: "Undo removal",
      editRemoveTitle: "Remove attachment",
      editSaving: "Saving…",
      editSave: "Save",
      editCancel: "Cancel"
    },
    timeline: {
      scrollTopAria: "Scroll to top of conversation",
      scrollTopTitle: "Scroll to top"
    },
    reply: {
      dropTitle: "Drop your files here",
      dropHint: "Limits: 15 MB max/file | Allowed: PDF, JPG, PNG, DOC, DOCX, CSV, XLS, XLSX",
      templateSelect: "Select a template",
      templateTitle: "Apply a reply template",
      toolBold: "Bold",
      toolList: "List",
      toolLink: "Link",
      linkModalTitle: "Insert a link",
      linkModalHint: "Paste the page address to link from your text.",
      linkModalUrlLabel: "Link address",
      linkModalUrlPlaceholder: "https://",
      linkModalTextLabel: "Displayed text",
      linkModalTextPlaceholder: "Link text (optional)",
      linkModalInsert: "Insert",
      linkModalError: "Invalid URL. Use a full web link (https://…).",
      toolEmoji: "Emoji",
      emojiSearch: "Search emoji…",
      emojiEmpty: "No emoji found",
      emojiRecent: "Recent",
      emojiSmileys: "Smileys",
      emojiGestures: "Gestures",
      emojiPeople: "People",
      emojiAnimals: "Animals & nature",
      emojiFood: "Food",
      emojiTravel: "Travel",
      emojiObjects: "Objects",
      emojiSymbols: "Symbols",
      suggestAi: "Auto reply",
      suggestAiTitle: "Automatic AI reply (technical and courteous)",
      suggestAiLoading: "Suggesting…",
      correctAiTitle: "Enrich and correct the text",
      correctAiLoading: "Enriching…",
      correctAiMenuTitle: "Enrich text",
      correctAiGroup_improve: "Improve",
      correctAiGroup_transform: "Transform",
      correctAiGroup_structure: "Structure",
      correctAiMode_enrich: "Enrich & correct",
      correctAiModeHint_enrich: "Style, clarity, polite formulas",
      correctAiMode_professional: "More professional",
      correctAiModeHint_professional: "Formal, precise MSP register",
      correctAiMode_friendly: "Warmer",
      correctAiModeHint_friendly: "Empathetic, reassuring, natural",
      correctAiMode_simplify: "Simplify",
      correctAiModeHint_simplify: "Plain language, no jargon",
      correctAiMode_shorten: "Shorten",
      correctAiModeHint_shorten: "More concise, keep the facts",
      correctAiMode_expand: "Expand",
      correctAiModeHint_expand: "Develop ideas already present",
      correctAiMode_rephrase: "Rephrase",
      correctAiModeHint_rephrase: "Same meaning, different wording",
      correctAiMode_bullets: "Turn into bullets",
      correctAiModeHint_bullets: "Clear, scannable list",
      correctAiMode_steps: "Action plan",
      correctAiModeHint_steps: "Numbered steps for the customer",
      addFiles: "Add files",
      modePrivateTitle: "Private reply (internal only)",
      modePublicTitle: "Public reply (visible to requester)",
      modePrivate: "Private reply",
      modePublic: "Public reply",
      collapseTooltip: "Collapse reply area",
      collapseAria: "Collapse reply area",
      expandSummary: "Write a reply",
      draftHint: "Draft in progress",
      expandAria: "Expand reply area",
      expandTooltip: "Expand reply area"
    },
    rightPane: {
      channel: "Channel",
      ticketSection: "Ticket",
      created: "Created:",
      takeover: "Takeover:",
      updated: "Updated:",
      closed: "Closed:",
      contact: "Contact",
      name: "Name:",
      phone: "Phone:",
      email: "Email:",
      role: "Role:",
      satisfaction: "Customer satisfaction",
      satisfactionBy: "By:",
      satisfactionDate: "Date:",
      satisfactionEmptyAria: "No customer rating",
      satisfactionFilledAria: "Customer rating received",
      linkedTicket: "Linked ticket",
      searchTicket: "Search for a ticket…",
      noTicket: "No ticket found",
      noLinkedTicket: "No linked ticket",
      removeLinkedTicketAria: "Remove link with ticket #{number}",
      linkedEquipment: "Linked hardware",
      searchEquipment: "Search for hardware…",
      companyRequired: "Company required",
      linkCompanyFirst: "Associate a company with the ticket",
      noEquipment: "No hardware found",
      noLinkedEquipment: "No linked hardware",
      removeEquipmentAria: "Remove link with {label}",
      history: "History",
      ticketLog: "Ticket history",
      historyBackAria: "Back to context",
      historyToggleAria: "Ticket history",
      historyToggleTitle: "Ticket history",
      historyRefreshTitle: "Refresh history",
      historyRefreshAria: "Refresh ticket history",
      historyBackTitle: "Back to context",
      runbookToggleTitle: "Technician assist",
      runbookToggleAria: "Show AI technician assist",
      runbookBackTitle: "Back to context",
      runbookBackAria: "Back to context"
    },
    sidebar: {
      classicViewTitle: "Classic view",
      classicViewAria: "Show classic view",
      kbTitle: "Open Knowledge Base",
      kbDisabledTitle: "Knowledge Base not configured (Administration → General settings)",
      deleteTitle: "Delete ticket",
      runbookTitle: "AI technician assist",
      runbookBackTitle: "Back to context"
    },
    reopenModal: {
      eyebrow: "Support",
      title: "Reopen ticket",
      subtitle: "The ticket will return to In progress status. Provide a reason for reopening.",
      ticketLabel: "Ticket",
      untitledTicket: "Untitled",
      reasonLabel: "Reopening reason",
      reasonPlaceholder: "Explain why this ticket should be reopened…",
      cancel: "Cancel",
      confirm: "Reopen ticket",
      confirming: "Reopening…",
      closeAria: "Close"
    },
    resolveModal: {
      eyebrow: "Support",
      title: "Resolve ticket",
      subtitle: "The client can validate the solution from their portal. Without a response within 48 hours, the ticket will be closed automatically.",
      navAria: "Resolution sections",
      footerHint: "Fields marked * are required",
      ticketLabel: "Ticket",
      untitledTicket: "Untitled",
      infoBanner: "Categorise the intervention to feed your support statistics (location type and action performed).",
      pendingReplyHint: "Your draft reply will be sent when you confirm.",
      interventionLabel: "Intervention type",
      interventionPlaceholder: "Remote, On-site, Workshop…",
      interventionEmpty: "No intervention type",
      actionLabel: "Action type",
      actionPlaceholder: "Configuration, Update, Repair…",
      actionEmpty: "No action type",
      loading: "Loading…",
      reasonLabel: "Resolution reason",
      reasonPlaceholder: "Describe the solution provided and what was done for the client…",
      consumeCredit: "Deduct support credits",
      consumeCreditLegacy: "Deduct credits",
      creditPerPackLabel: "Credits per pack",
      creditPerPackHint: "Apply the same quantity to each active credit pack.",
      creditPackRemaining: "{count} remaining",
      creditTotalDebit: "Total to deduct: {count}",
      creditPackAmountAria: "Credits to deduct for {label}",
      noCreditHint: "No credits available on this contract",
      creditAvailable: "{count} credit available",
      creditAvailablePlural: "{count} credits available",
      creditConsumed: "{count} credit(s) already deducted for this ticket",
      sections: {
        solution: {
          label: "Solution",
          description: "Classification and description",
          icon: "mdi:clipboard-check-outline"
        },
        credits: {
          label: "Support credits",
          description: "Deduction on resolution",
          icon: "mdi:ticket-confirmation-outline"
        }
      },
      cancel: "Cancel",
      confirm: "Resolve and request validation",
      confirming: "Resolving…",
      closeAria: "Close"
    },
    footer: {
      closedHint: "Ticket closed · read only",
      reopening: "Reopening…",
      reopen: "Reopen ticket",
      applyMacro: "Apply macro",
      apply: "Apply",
      restore: "Restore",
      permanentDelete: "Delete permanently",
      creditConsumed: "{count} credit(s) already deducted for this ticket",
      creditAvailable: "{count} credit available",
      creditAvailablePlural: "{count} credits available",
      consumeCredit: "Deduct credits on resolution (1 per pack)",
      refundCredit: "Refund consumed credit",
      resolveTitle: "Resolve and request client validation",
      resolve: "Resolve",
      sending: "Sending...",
      submitStatusAria: "Choose submission status"
    },
    macroAttachmentModal: {
      title: "Attachment for macro",
      hint: "This macro includes an attachment action. You can add one or more files before running it, or continue without files.",
      addFiles: "Add files",
      cancel: "Cancel",
      continue: "Continue"
    },
    sideModal: {
      newTitle: "New side conversation",
      newSubtitle: "Fill in the fields then send the request",
      target: "Target",
      subject: "Subject",
      subjectPlaceholder: "E.g. Escalation needed on this ticket",
      prestataire: "Linked provider",
      prestatairePlaceholder: "Select a provider…",
      prestataireLoading: "Loading providers…",
      prestataireEmpty: "No provider linked to this company.",
      prestataireNoClient: "Link a company to the ticket first to suggest providers.",
      prestataireContact: "Provider contact",
      prestataireContactPlaceholder: "Select a contact…",
      prestataireAppliedHint: "Recipient and CC prefilled from the provider.",
      recipient: "Recipient",
      recipientPlaceholder: "E.g. john.doe@client.com",
      cc: "Copy (CC)",
      ccPlaceholder: "E.g. mary@client.com, support@client.com",
      message: "Message",
      messagePlaceholder: "Describe the help request...",
      cancel: "Cancel",
      send: "Send request",
      statusDone: "Done",
      statusOpen: "Open",
      toPrefix: "To: ",
      ccPrefix: "CC: ",
      replyPlaceholder: "Reply...",
      sendReply: "Send",
      reopen: "Reopen",
      close: "Close",
      prestataireSubject: "Ticket #{number} — {provider}"
    },
    toasts: {
      loadTicketError: "Error loading ticket",
      updateError: "Error updating ticket",
      majorIncidentEnabled: "Major incident enabled",
      majorIncidentDisabled: "Major incident disabled",
      replySent: "Reply sent",
      commentAddError: "Error adding comment",
      submitNeedMessage: "Add a message before submitting",
      messageSentStatusUpdated: "Message sent and status updated",
      submitError: "Error submitting",
      playModeDisabled: "Random ticket mode disabled",
      invalidUrl: "Invalid URL. Use a full web link (https://...).",
      templateApplied: "Template \"{name}\" applied",
      tagAdded: "Tag added",
      tagAddError: "Error adding tag",
      tagRemoved: "Tag removed",
      tagRemoveError: "Error removing tag",
      followerAdded: "Follower added",
      followerAddError: "Error adding follower",
      followerRemoved: "Follower removed",
      followerRemoveError: "Error removing follower",
      assigneeAdded: "Assignee added",
      assigneeAddError: "Error adding assignee",
      assigneeRemoved: "Assignee removed",
      assigneeRemoveError: "Error removing assignee",
      titleRequired: "Title is required",
      titleUpdated: "Title updated",
      descriptionUpdated: "Description updated",
      requesterUpdated: "Requester updated",
      requesterCompanyAmbiguous: "This contact is linked to multiple companies — the ticket company was kept",
      emailLinked: "Email linked to the contact",
      emailLinkError: "Unable to link the email",
      categoryUpdated: "Category updated",
      statusUpdated: "Status updated",
      typeUpdated: "Type updated",
      priorityUpdated: "Priority updated",
      channelUpdated: "Channel updated",
      selectValidTicket: "Select a valid ticket",
      ticketLinked: "Ticket linked",
      ticketLinkError: "Error linking ticket",
      ticketUnlinked: "Ticket unlinked",
      ticketUnlinkError: "Error unlinking ticket",
      selectValidEquipment: "Select valid hardware",
      equipmentLinked: "Hardware linked",
      equipmentLinkError: "Error linking hardware",
      equipmentUnlinked: "Hardware unlinked",
      equipmentUnlinkError: "Error unlinking hardware",
      movedToTrash: "Ticket moved to trash",
      deleteError: "Error deleting ticket",
      restored: "Ticket restored",
      restoreError: "Error restoring ticket",
      adminOnlyPermanentDelete: "Only administrators can permanently delete a ticket",
      permanentlyDeleted: "Ticket permanently deleted",
      permanentDeleteError: "Error permanently deleting ticket",
      macroNotFound: "Macro not found",
      macroTeamsPro: "Teams message · available with Veritas Pro",
      macroTeamsWebhookMissing: "Teams webhook not configured in macro",
      macroExecuted: "Macro executed",
      macroError: "Error running macro",
      sideConversationMessageRequired: "Side conversation message is required",
      sideConversationSent: "Request sent to {teamLabel}",
      sideConversationSendError: "Error sending side conversation",
      sideConversationReplyError: "Error sending side conversation message",
      sideConversationClosed: "Side conversation closed",
      sideConversationCloseError: "Error closing side conversation",
      sideConversationReopened: "Side conversation reopened",
      sideConversationReopenError: "Error reopening side conversation",
      messageEmpty: "Message cannot be empty.",
      messageEdited: "Message edited",
      messageEditError: "Error editing message",
      messageDeleted: "Message deleted",
      messageDeleteError: "Error deleting message",
      resolvedPendingValidation: "Ticket resolved · client validation requested.",
      resolveError: "Unable to resolve ticket.",
      ticketReopened: "Ticket reopened",
      reopenError: "Unable to reopen ticket",
      reopenComment: "[Ticket reopened] {reason}",
      exclusionValueRequired: "Exclusion value is required.",
      exclusionAdded: "Exclusion rule added to email collection.",
      exclusionError: "Unable to add ticket to exclusions.",
      splitNoTarget: "No existing ticket available for split.",
      splitSuccess: "Ticket #{closedNumber} closed and linked to ticket #{targetNumber}.",
      splitError: "Unable to split ticket.",
      reminderInvalidFields: "Invalid label, date or time",
      reminderUpdated: "Alert updated",
      reminderAdded: "Alert added to schedule",
      reminderSaveError: "Unable to save alert",
      reminderDeleted: "Alert deleted",
      reminderDeleteError: "Unable to delete alert",
      aiSuggestOk: "Automatic reply applied",
      aiSuggestError: "Unable to generate automatic reply",
      aiPriorityOk: "Automatic priority applied",
      aiPriorityError: "Unable to suggest priority",
      aiCorrectEmpty: "Enter some text to enrich",
      aiCorrectOk: "Text enriched and corrected",
      aiCorrectUnchanged: "The text is already optimal",
      aiCorrectError: "Unable to enrich the text"
    },
    playMode: {
      banner: "Random mode",
      tooltip: "Random ticket · continues after each reply (Shift+click to stop)",
      aria: "Open a random ticket"
    }
  }
};
["de", "it", "es"].forEach(code => {
  if (!DETAIL_COPY[code]) {
    DETAIL_COPY[code] = JSON.parse(JSON.stringify(DETAIL_COPY.en));
  }
});
DETAIL_COPY.de.comment.createdLabel = "Erstellt:";
DETAIL_COPY.de.comment.byLabel = "von";
DETAIL_COPY.it.comment.createdLabel = "Creato:";
DETAIL_COPY.it.comment.byLabel = "da";
DETAIL_COPY.es.comment.createdLabel = "Creado:";
DETAIL_COPY.es.comment.byLabel = "por";
DETAIL_COPY.de.pageTitle = "Ticket";
DETAIL_COPY.de.ticketNumber = "Ticket #{number}";
DETAIL_COPY.de.statusClosed = "Geschlossen";
DETAIL_COPY.de.empty.loading = "Laden...";
DETAIL_COPY.de.empty.notFound = "Ticket nicht gefunden.";
DETAIL_COPY.de.leftPane.properties = "Eigenschaften";
DETAIL_COPY.de.footer.resolve = "Lösen";
DETAIL_COPY.de.footer.reopen = "Ticket wiedereröffnen";
DETAIL_COPY.de.reopenModal.title = "Ticket wiedereröffnen";
DETAIL_COPY.de.reopenModal.subtitle = "Das Ticket wird wieder auf « In Bearbeitung » gesetzt. Bitte geben Sie einen Grund an.";
DETAIL_COPY.de.reopenModal.reasonLabel = "Grund der Wiedereröffnung";
DETAIL_COPY.de.reopenModal.reasonPlaceholder = "Erklären Sie, warum dieses Ticket wiedereröffnet werden soll…";
DETAIL_COPY.de.reopenModal.confirm = "Ticket wiedereröffnen";
DETAIL_COPY.de.reopenModal.confirming = "Wird wiedereröffnet…";
DETAIL_COPY.de.resolveModal.title = "Ticket lösen";
DETAIL_COPY.de.resolveModal.subtitle = "Der Kunde kann die Lösung im Portal bestätigen. Ohne Antwort innerhalb von 48 Stunden wird das Ticket automatisch geschlossen.";
DETAIL_COPY.de.resolveModal.infoBanner = "Kategorisieren Sie den Einsatz für Ihre Support-Statistiken (Ortstyp und durchgeführte Aktion).";
DETAIL_COPY.de.resolveModal.interventionLabel = "Einsatztyp";
DETAIL_COPY.de.resolveModal.interventionPlaceholder = "Remote, Vor Ort, Werkstatt…";
DETAIL_COPY.de.resolveModal.interventionEmpty = "Kein Einsatztyp";
DETAIL_COPY.de.resolveModal.actionLabel = "Aktionstyp";
DETAIL_COPY.de.resolveModal.actionPlaceholder = "Konfiguration, Update, Reparatur…";
DETAIL_COPY.de.resolveModal.actionEmpty = "Kein Aktionstyp";
DETAIL_COPY.de.resolveModal.reasonLabel = "Lösungsgrund";
DETAIL_COPY.de.resolveModal.reasonPlaceholder = "Beschreiben Sie die Lösung und was für den Kunden erledigt wurde…";
DETAIL_COPY.de.resolveModal.consumeCredit = "Support-Guthaben bei Lösung abziehen";
DETAIL_COPY.de.resolveModal.consumeCreditLegacy = "Guthaben abziehen";
DETAIL_COPY.de.resolveModal.creditPerPackLabel = "Guthaben pro Paket";
DETAIL_COPY.de.resolveModal.creditPerPackHint = "Gleiche Menge auf jedes aktive Guthabenpaket anwenden.";
DETAIL_COPY.de.resolveModal.creditPackRemaining = "{count} verbleibend";
DETAIL_COPY.de.resolveModal.creditTotalDebit = "Gesamt abzuziehen: {count}";
DETAIL_COPY.de.resolveModal.creditPackAmountAria = "Abzuziehendes Guthaben für {label}";
DETAIL_COPY.de.resolveModal.noCreditHint = "Kein Guthaben auf diesem Vertrag verfügbar";
DETAIL_COPY.de.resolveModal.creditAvailable = "{count} Guthaben verfügbar";
DETAIL_COPY.de.resolveModal.creditAvailablePlural = "{count} Guthaben verfügbar";
DETAIL_COPY.de.resolveModal.creditConsumed = "{count} Guthaben bereits für dieses Ticket abgezogen";
DETAIL_COPY.de.footer.creditConsumed = "{count} Guthaben bereits für dieses Ticket abgezogen";
DETAIL_COPY.de.footer.consumeCredit = "Guthaben bei Lösung abziehen (1 pro Paket)";
DETAIL_COPY.de.resolveModal.confirm = "Lösen und Validierung anfordern";
DETAIL_COPY.de.resolveModal.confirming = "Wird gelöst…";
DETAIL_COPY.de.toasts.loadTicketError = "Fehler beim Laden des Tickets";
DETAIL_COPY.de.toasts.updateError = "Fehler beim Aktualisieren";
DETAIL_COPY.de.header.menuAddExclusion = "Zu Ausschlüssen hinzufügen";
DETAIL_COPY.de.header.menuSplit = "In anderes Ticket aufteilen";
DETAIL_COPY.it.pageTitle = "Ticket";
DETAIL_COPY.it.statusClosed = "Chiuso";
DETAIL_COPY.it.empty.loading = "Caricamento...";
DETAIL_COPY.it.empty.notFound = "Ticket non trovato.";
DETAIL_COPY.it.leftPane.properties = "Proprietà";
DETAIL_COPY.it.footer.resolve = "Risolvi";
DETAIL_COPY.it.footer.reopen = "Riapri ticket";
DETAIL_COPY.it.reopenModal.title = "Riapri ticket";
DETAIL_COPY.it.reopenModal.subtitle = "Il ticket tornerà allo stato « In corso ». Indica il motivo della riapertura.";
DETAIL_COPY.it.reopenModal.reasonLabel = "Motivo della riapertura";
DETAIL_COPY.it.reopenModal.reasonPlaceholder = "Spiega perché questo ticket deve essere riaperto…";
DETAIL_COPY.it.reopenModal.confirm = "Riapri ticket";
DETAIL_COPY.it.reopenModal.confirming = "Riapertura…";
DETAIL_COPY.it.resolveModal.title = "Risolvi ticket";
DETAIL_COPY.it.resolveModal.subtitle = "Il cliente potrà convalidare la soluzione dal portale. Senza risposta entro 48 ore, il ticket verrà chiuso automaticamente.";
DETAIL_COPY.it.resolveModal.infoBanner = "Classifica l'intervento per alimentare le statistiche di supporto (tipo di luogo e azione eseguita).";
DETAIL_COPY.it.resolveModal.interventionLabel = "Tipo di intervento";
DETAIL_COPY.it.resolveModal.interventionPlaceholder = "Da remoto, In sede, In laboratorio…";
DETAIL_COPY.it.resolveModal.interventionEmpty = "Nessun tipo di intervento";
DETAIL_COPY.it.resolveModal.actionLabel = "Tipo di azione";
DETAIL_COPY.it.resolveModal.actionPlaceholder = "Configurazione, Aggiornamento, Riparazione…";
DETAIL_COPY.it.resolveModal.actionEmpty = "Nessun tipo di azione";
DETAIL_COPY.it.resolveModal.reasonLabel = "Motivo della risoluzione";
DETAIL_COPY.it.resolveModal.reasonPlaceholder = "Descrivi la soluzione fornita e cosa è stato fatto per il cliente…";
DETAIL_COPY.it.resolveModal.consumeCredit = "Scala crediti supporto alla risoluzione";
DETAIL_COPY.it.resolveModal.consumeCreditLegacy = "Scala crediti";
DETAIL_COPY.it.resolveModal.creditPerPackLabel = "Crediti per carnet";
DETAIL_COPY.it.resolveModal.creditPerPackHint = "Applica la stessa quantità a ogni carnet attivo.";
DETAIL_COPY.it.resolveModal.creditPackRemaining = "{count} rimanente/i";
DETAIL_COPY.it.resolveModal.creditTotalDebit = "Totale da scalare: {count}";
DETAIL_COPY.it.resolveModal.creditPackAmountAria = "Crediti da scalare per {label}";
DETAIL_COPY.it.resolveModal.noCreditHint = "Nessun credito disponibile su questo contratto";
DETAIL_COPY.it.resolveModal.creditAvailable = "{count} credito disponibile";
DETAIL_COPY.it.resolveModal.creditAvailablePlural = "{count} crediti disponibili";
DETAIL_COPY.it.resolveModal.creditConsumed = "{count} credito/i supporto già scalato/i per questo ticket";
DETAIL_COPY.it.footer.creditConsumed = "{count} credito/i già scalato/i per questo ticket";
DETAIL_COPY.it.footer.consumeCredit = "Scala crediti alla risoluzione (1 per carnet)";
DETAIL_COPY.it.resolveModal.confirm = "Risolvi e richiedi validazione";
DETAIL_COPY.it.resolveModal.confirming = "Risoluzione…";
DETAIL_COPY.it.toasts.loadTicketError = "Errore nel caricamento del ticket";
DETAIL_COPY.it.toasts.updateError = "Errore durante l'aggiornamento";
DETAIL_COPY.it.header.menuAddExclusion = "Aggiungi alle esclusioni";
DETAIL_COPY.it.header.menuSplit = "Scindi in un altro ticket";
DETAIL_COPY.es.pageTitle = "Ticket";
DETAIL_COPY.es.statusClosed = "Cerrado";
DETAIL_COPY.es.empty.loading = "Cargando...";
DETAIL_COPY.es.empty.notFound = "Ticket no encontrado.";
DETAIL_COPY.es.leftPane.properties = "Propiedades";
DETAIL_COPY.es.footer.resolve = "Resolver";
DETAIL_COPY.es.footer.reopen = "Reabrir ticket";
DETAIL_COPY.es.reopenModal.title = "Reabrir ticket";
DETAIL_COPY.es.reopenModal.subtitle = "El ticket volverá al estado « En curso ». Indique el motivo de la reapertura.";
DETAIL_COPY.es.reopenModal.reasonLabel = "Motivo de la reapertura";
DETAIL_COPY.es.reopenModal.reasonPlaceholder = "Explique por qué debe reabrirse este ticket…";
DETAIL_COPY.es.reopenModal.confirm = "Reabrir ticket";
DETAIL_COPY.es.reopenModal.confirming = "Reabriendo…";
DETAIL_COPY.es.resolveModal.title = "Resolver ticket";
DETAIL_COPY.es.resolveModal.subtitle = "El cliente podrá validar la solución desde su portal. Sin respuesta en 48 h, el ticket se cerrará automáticamente.";
DETAIL_COPY.es.resolveModal.infoBanner = "Clasifique la intervención para alimentar sus estadísticas de soporte (tipo de lugar y acción realizada).";
DETAIL_COPY.es.resolveModal.interventionLabel = "Tipo de intervención";
DETAIL_COPY.es.resolveModal.interventionPlaceholder = "A distancia, En sitio, En taller…";
DETAIL_COPY.es.resolveModal.interventionEmpty = "Ningún tipo de intervención";
DETAIL_COPY.es.resolveModal.actionLabel = "Tipo de acción";
DETAIL_COPY.es.resolveModal.actionPlaceholder = "Configuración, Actualización, Reparación…";
DETAIL_COPY.es.resolveModal.actionEmpty = "Ningún tipo de acción";
DETAIL_COPY.es.resolveModal.reasonLabel = "Motivo de la resolución";
DETAIL_COPY.es.resolveModal.reasonPlaceholder = "Describa la solución aportada y lo realizado para el cliente…";
DETAIL_COPY.es.resolveModal.consumeCredit = "Descontar créditos de soporte al resolver";
DETAIL_COPY.es.resolveModal.consumeCreditLegacy = "Descontar créditos";
DETAIL_COPY.es.resolveModal.creditPerPackLabel = "Créditos por carnet";
DETAIL_COPY.es.resolveModal.creditPerPackHint = "Aplica la misma cantidad a cada carnet activo.";
DETAIL_COPY.es.resolveModal.creditPackRemaining = "{count} restante(s)";
DETAIL_COPY.es.resolveModal.creditTotalDebit = "Total a descontar: {count}";
DETAIL_COPY.es.resolveModal.creditPackAmountAria = "Créditos a descontar para {label}";
DETAIL_COPY.es.resolveModal.noCreditHint = "Sin créditos disponibles en este contrato";
DETAIL_COPY.es.resolveModal.creditAvailable = "{count} crédito disponible";
DETAIL_COPY.es.resolveModal.creditAvailablePlural = "{count} créditos disponibles";
DETAIL_COPY.es.resolveModal.creditConsumed = "{count} crédito(s) de soporte ya descontado(s) para este ticket";
DETAIL_COPY.es.footer.creditConsumed = "{count} crédito(s) ya descontado(s) para este ticket";
DETAIL_COPY.es.footer.consumeCredit = "Descontar créditos al resolver (1 por carnet)";
DETAIL_COPY.es.resolveModal.confirm = "Resolver y solicitar validación";
DETAIL_COPY.es.resolveModal.confirming = "Resolviendo…";
DETAIL_COPY.es.toasts.loadTicketError = "Error al cargar el ticket";
DETAIL_COPY.es.toasts.updateError = "Error al actualizar";
DETAIL_COPY.es.header.menuAddExclusion = "Añadir a exclusiones";
DETAIL_COPY.es.header.menuSplit = "Dividir en otro ticket";
DETAIL_COPY.de.reply.correctAiTitle = "Text anreichern und korrigieren";
DETAIL_COPY.de.reply.emojiSearch = "Emoji suchen…";
DETAIL_COPY.de.reply.emojiEmpty = "Kein Emoji gefunden";
DETAIL_COPY.de.reply.emojiRecent = "Zuletzt verwendet";
DETAIL_COPY.de.toasts.aiCorrectEmpty = "Geben Sie einen Text zum Anreichern ein";
DETAIL_COPY.de.toasts.aiCorrectOk = "Text angereichert und korrigiert";
DETAIL_COPY.de.toasts.aiCorrectUnchanged = "Der Text ist bereits optimal";
DETAIL_COPY.de.toasts.aiCorrectError = "Text konnte nicht angereichert werden";
DETAIL_COPY.it.reply.correctAiTitle = "Arricchisci e correggi il testo";
DETAIL_COPY.it.reply.emojiSearch = "Cerca un emoji…";
DETAIL_COPY.it.reply.emojiEmpty = "Nessun emoji trovato";
DETAIL_COPY.it.reply.emojiRecent = "Recenti";
DETAIL_COPY.it.toasts.aiCorrectEmpty = "Inserisci un testo da arricchire";
DETAIL_COPY.it.toasts.aiCorrectOk = "Testo arricchito e corretto";
DETAIL_COPY.it.toasts.aiCorrectUnchanged = "Il testo è già ottimale";
DETAIL_COPY.it.toasts.aiCorrectError = "Impossibile arricchire il testo";
DETAIL_COPY.es.reply.correctAiTitle = "Enriquecer y corregir el texto";
DETAIL_COPY.es.reply.emojiSearch = "Buscar un emoji…";
DETAIL_COPY.es.reply.emojiEmpty = "Ningún emoji encontrado";
DETAIL_COPY.es.reply.emojiRecent = "Recientes";
DETAIL_COPY.es.toasts.aiCorrectEmpty = "Escriba un texto para enriquecer";
DETAIL_COPY.es.toasts.aiCorrectOk = "Texto enriquecido y corregido";
DETAIL_COPY.es.toasts.aiCorrectUnchanged = "El texto ya es óptimo";
DETAIL_COPY.es.toasts.aiCorrectError = "No se pudo enriquecer el texto";
DETAIL_COPY.de.reply.linkModalTitle = "Link einfügen";
DETAIL_COPY.de.reply.linkModalHint = "Fügen Sie die Seitenadresse ein, die mit dem Text verknüpft werden soll.";
DETAIL_COPY.de.reply.linkModalUrlLabel = "Linkadresse";
DETAIL_COPY.de.reply.linkModalUrlPlaceholder = "https://";
DETAIL_COPY.de.reply.linkModalTextLabel = "Anzeigetext";
DETAIL_COPY.de.reply.linkModalTextPlaceholder = "Linktext (optional)";
DETAIL_COPY.de.reply.linkModalInsert = "Einfügen";
DETAIL_COPY.de.reply.linkModalError = "Ungültige URL. Verwenden Sie einen vollständigen Weblink (https://…).";
DETAIL_COPY.it.reply.linkModalTitle = "Inserisci un collegamento";
DETAIL_COPY.it.reply.linkModalHint = "Incolla l’indirizzo della pagina da collegare al testo.";
DETAIL_COPY.it.reply.linkModalUrlLabel = "Indirizzo del collegamento";
DETAIL_COPY.it.reply.linkModalUrlPlaceholder = "https://";
DETAIL_COPY.it.reply.linkModalTextLabel = "Testo visualizzato";
DETAIL_COPY.it.reply.linkModalTextPlaceholder = "Testo del collegamento (facoltativo)";
DETAIL_COPY.it.reply.linkModalInsert = "Inserisci";
DETAIL_COPY.it.reply.linkModalError = "URL non valido. Usa un collegamento web completo (https://…).";
DETAIL_COPY.es.reply.linkModalTitle = "Insertar un enlace";
DETAIL_COPY.es.reply.linkModalHint = "Pegue la dirección de la página que desea vincular.";
DETAIL_COPY.es.reply.linkModalUrlLabel = "Dirección del enlace";
DETAIL_COPY.es.reply.linkModalUrlPlaceholder = "https://";
DETAIL_COPY.es.reply.linkModalTextLabel = "Texto mostrado";
DETAIL_COPY.es.reply.linkModalTextPlaceholder = "Texto del enlace (opcional)";
DETAIL_COPY.es.reply.linkModalInsert = "Insertar";
DETAIL_COPY.es.reply.linkModalError = "URL no válida. Use un enlace web completo (https://…).";
function titleSuffix(title) {
  return title ? ` · ${title}` : "";
}
export function getTicketDetailCopy(locale) {
  const base = getTicketCreateCopy(locale);
  const t = pickLocaleMessages(DETAIL_COPY, locale);
  const bcp47 = LOCALE_BCP47[locale] || LOCALE_BCP47.fr;
  const statusOptions = [{
    value: "new",
    label: base.getStatusLabel("new")
  }, {
    value: "pending",
    label: base.getStatusLabel("pending")
  }, {
    value: "in_progress",
    label: base.getStatusLabel("in_progress")
  }, {
    value: "resolved",
    label: base.getStatusLabel("resolved")
  }, {
    value: "closed",
    label: t.statusClosed
  }];
  const submitActions = SUBMIT_ACTION_IDS.map(id => ({
    id,
    label: t.submitActions[id],
    color: id === "open" ? "open" : id === "pending" ? "pending" : id === "on_hold" ? "onHold" : "solved"
  }));
  const sideConversationTeamOptions = SIDE_CONVERSATION_TEAMS.map(key => ({
    key,
    label: t.sideConversationTeams[key]
  }));
  return {
    ...base,
    ...t,
    reminderModal: getTicketReminderModalCopy(locale),
    statusOptions,
    submitActions,
    sideConversationTeamOptions,
    formatDateTime: value => {
      if (!value) return t.fallbackDash;
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return t.fallbackDash;
      return d.toLocaleString(bcp47, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    },
    formatDurationMs: ms => {
      if (ms == null || Number.isNaN(ms) || ms < 0) return t.fallbackEmDash;
      if (ms < 60000) return t.formatDuration.lessThanOneMin;
      const totalMinutes = Math.floor(ms / 60000);
      const days = Math.floor(totalMinutes / (60 * 24));
      const hours = Math.floor(totalMinutes % (60 * 24) / 60);
      const minutes = totalMinutes % 60;
      if (days > 0) {
        return hours > 0 ? interpolate(t.formatDuration.daysHours, {
          days: String(days),
          hours: String(hours)
        }) : interpolate(t.formatDuration.daysOnly, {
          days: String(days)
        });
      }
      if (hours > 0) {
        return minutes > 0 ? interpolate(t.formatDuration.hoursMinutes, {
          hours: String(hours),
          minutes: String(minutes)
        }) : interpolate(t.formatDuration.hoursOnly, {
          hours: String(hours)
        });
      }
      return interpolate(t.formatDuration.minutesOnly, {
        minutes: String(minutes)
      });
    },
    getResolutionStatusPresentation: resolutionValidation => {
      if (!resolutionValidation || resolutionValidation.isPending) {
        return {
          variant: "pending",
          icon: "mdi:account-clock-outline",
          title: t.resolutionStatus.pending
        };
      }
      if (resolutionValidation.outcome === "rejected") {
        return {
          variant: "rejected",
          icon: "mdi:close-circle-outline",
          title: t.resolutionStatus.rejected
        };
      }
      if (resolutionValidation.outcome === "accepted") {
        return {
          variant: "done",
          icon: "mdi:check-circle-outline",
          title: t.resolutionStatus.accepted
        };
      }
      if (resolutionValidation.outcome === "auto_closed") {
        return {
          variant: "done",
          icon: "mdi:check-circle-outline",
          title: t.resolutionStatus.autoClosed
        };
      }
      return {
        variant: "pending",
        icon: "mdi:account-clock-outline",
        title: t.resolutionStatus.default
      };
    },
    formatReopenComment: reason => interpolate(t.reopenComment, {
      reason: String(reason || "").trim()
    }),
    formatResolutionDeadline: dateTime => interpolate(t.resolutionStatus.deadline, {
      dateTime
    }),
    formatSatisfactionStarsAria: rating => interpolate(t.satisfactionStarsAria, {
      rating: String(rating)
    }),
    formatTicketNumber: number => {
      const raw = String(number ?? "").trim();
      const normalized = raw.replace(/^#/, "");
      return interpolate(t.ticketNumber, {
        number: normalized || "-"
      });
    },
    formatTakeoverTooltip: status => interpolate(t.takeoverTooltipHas, {
      status
    }),
    formatRemoveTagAria: label => interpolate(t.leftPane.removeTagAria, {
      label
    }),
    formatSideConversationChipAria: subject => interpolate(t.header.sideConversationChipAria, {
      subject
    }),
    formatTemplateApplied: name => interpolate(t.toasts.templateApplied, {
      name
    }),
    formatSideConversationSent: teamLabel => interpolate(t.toasts.sideConversationSent, {
      teamLabel
    }),
    formatSplitSuccess: (closedNumber, targetNumber) => interpolate(t.toasts.splitSuccess, {
      closedNumber: String(closedNumber),
      targetNumber: String(targetNumber)
    }),
    formatCreditAvailable: count => interpolate(count === 1 ? t.footer.creditAvailable : t.footer.creditAvailablePlural, {
      count: String(count)
    }),
    formatCreditConsumed: count => interpolate(t.footer.creditConsumed, {
      count: String(count)
    }),
    formatRemoveLinkedTicketAria: number => interpolate(t.rightPane.removeLinkedTicketAria, {
      number: String(number)
    }),
    formatRemoveEquipmentAria: label => interpolate(t.rightPane.removeEquipmentAria, {
      label
    }),
    formatWhatsappDeliveryError: error => error ? interpolate(t.whatsappDeliveryErrorWithDetail, {
      error
    }) : t.whatsappDeliveryError,
    getChannelViaLabel: channel => {
      const key = String(channel || "").toLowerCase();
      return t.getChannelVia[key] || interpolate(t.getChannelVia.fallback, {
        channel: key || "?"
      });
    },
    describeCommentActivity: content => {
      const text = String(content || "");
      const splitMatch = text.match(/\[Split ticket\][\s\S]*/);
      if (splitMatch) {
        const payload = {};
        (text.match(/\[([a-zA-Z_]+):([^\]]+)\]/g) || []).forEach(chunk => {
          const clean = chunk.replace(/^\[/, "").replace(/\]$/, "");
          const [key, ...rest] = clean.split(":");
          payload[key] = rest.join(":");
        });
        if (payload.linked_ticket_id) {
          const number = payload.ticket_number ? `#${payload.ticket_number}` : `#${payload.linked_ticket_id}`;
          const suffix = titleSuffix(payload.title);
          return payload.direction === "from" ? interpolate(t.activity.splitFrom, {
            number,
            titleSuffix: suffix
          }) : interpolate(t.activity.splitTo, {
            number,
            titleSuffix: suffix
          });
        }
      }
      return null;
    },
    formatActivityAttachmentDetail: count => interpolate(count === 1 ? t.activity.attachmentOne : t.activity.attachmentMany, {
      count: String(count)
    }),
    validateAttachmentFiles: (files = []) => {
      for (const file of files) {
        const name = String(file?.name || "");
        const ext = name.includes(".") ? `.${name.split(".").pop().toLowerCase()}` : "";
        const allowed = new Set([".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx", ".csv", ".xls", ".xlsx", ".mp4", ".3gp", ".mp3", ".mpeg", ".ogg", ".aac", ".amr", ".m4a"]);
        if (!allowed.has(ext)) {
          throw new Error(interpolate(base.attachmentTypeError, {
            formats: ATTACHMENT_FORMATS_LABEL
          }));
        }
        if (Number(file?.size || 0) > 15 * 1024 * 1024) {
          throw new Error(interpolate(base.attachmentSizeError, {
            name
          }));
        }
      }
    }
  };
}
