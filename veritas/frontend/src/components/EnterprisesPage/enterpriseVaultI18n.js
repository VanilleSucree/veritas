import { interpolate, normalizeLocale, pickLocaleMessages } from "../../i18n/translate";
const LOCALE_BCP47 = {
  fr: "fr-FR",
  en: "en-GB",
  de: "de-DE",
  it: "it-IT",
  es: "es-ES"
};
const CATEGORY_KEYS = ["Facture matériel", "Image client", "Baie de brassage", "Plan de réseau", "Procédure", "Contrat", "Rapport", "Autre"];
const ENTERPRISE_VAULT_COPY = {
  fr: {
    categories: {
      "Facture matériel": "Facture matériel",
      "Image client": "Image client",
      "Baie de brassage": "Baie de brassage",
      "Plan de réseau": "Plan de réseau",
      Procédure: "Procédure",
      Contrat: "Contrat",
      Rapport: "Rapport",
      Autre: "Autre"
    },
    panel: {
      sectionTitle: "Coffre-fort documentaire",
      addToVault: "Ajouter au coffre-fort",
      intro: "Factures, notices, guides et rapports partagés avec le contact sur son portail client.",
      sharedCountOne: " {count} document visible côté client.",
      sharedCountMany: " {count} documents visibles côté client.",
      searchPlaceholder: "Rechercher un document…",
      clearSearchAria: "Effacer",
      allTypes: "Tous les types",
      loading: "Chargement du coffre-fort…",
      empty: "Aucun document dans le coffre-fort.",
      emptyFolder: "Ce dossier est vide.",
      rootBreadcrumb: "Coffre-fort",
      newFolder: "Nouveau dossier",
      newFolderPlaceholder: "Nom du dossier",
      createFolder: "Créer",
      folderCreated: "Dossier créé.",
      folderCreateError: "Impossible de créer le dossier.",
      folderNameRequired: "Indiquez un nom de dossier.",
      renameFolder: "Renommer",
      deleteFolder: "Supprimer le dossier",
      confirmDeleteFolder: "Supprimer le dossier « {name} » ? Son contenu remontera d’un niveau.",
      folderDeleted: "Dossier supprimé.",
      folderDeleteError: "Impossible de supprimer le dossier.",
      openFolder: "Ouvrir le dossier",
      filesCount: "{count} fichier(s)",
      subfoldersCount: "{count} sous-dossier(s)"
    },
    card: {
      previewTitle: "Prévisualiser",
      visiblePortal: "Visible portail",
      notShared: "Non partagé",
      notSharedTitle: "Document réservé aux agents · cliquer pour le partager sur le portail client",
      noDescription: "Aucune description",
      downloadTitle: "Télécharger",
      editDescriptionTitle: "Modifier la description",
      editDescriptionAria: "Modifier la description",
      removeTitle: "Retirer"
    },
    uploadModal: {
      eyebrow: "Coffre-fort documentaire",
      title: "Ajouter au coffre-fort",
      subtitle: "Le document sera archivé dans le coffre-fort de l'entreprise.",
      hint: "Choisissez si le document doit être visible sur le portail client.",
      categoryLabel: "Type de document",
      descriptionLabel: "Description (optionnel)",
      descriptionPlaceholder: "Ex. : Facture matériel Q1 2026, Guide utilisateur VPN…",
      fileLabel: "Fichier",
      dropHint: "Glisser-déposer ou cliquer pour sélectionner",
      dropFormats: "PDF, images, Word, Excel, HTML, ZIP · max 50 Mo",
      visiblePortalLabel: "Visible sur le portail client",
      visiblePortalHint: "Activé : le contact peut consulter le document. Désactivé : réservé aux agents.",
      visibleOn: "Visible",
      visibleOff: "Masqué",
      footerRequired: "Les champs * sont obligatoires",
      cancel: "Annuler",
      upload: "Ajouter au coffre-fort",
      uploading: "Envoi…",
      closeAria: "Fermer"
    },
    editModal: {
      eyebrow: "Coffre-fort documentaire",
      title: "Modifier la description",
      descriptionLabel: "Description",
      descriptionPlaceholder: "Ex. : Facture matériel Q1 2026, Guide utilisateur VPN…",
      visiblePortalLabel: "Visible sur le portail client",
      visiblePortalHint: "Activé : le contact peut consulter le document. Désactivé : réservé aux agents.",
      visibleOn: "Visible",
      visibleOff: "Masqué",
      footerHint: "Description et visibilité portail",
      cancel: "Annuler",
      save: "Enregistrer",
      saving: "Enregistrement…",
      closeAria: "Fermer"
    },
    previewModal: {
      download: "Télécharger",
      closeAria: "Fermer",
      unsupported: "Aperçu non disponible pour ce type de fichier.",
      noDescription: "Aucune description",
      editDescriptionTitle: "Modifier la description",
      editDescriptionAria: "Modifier la description"
    },
    size: {
      bytes: "{value} o",
      kb: "{value} Ko",
      mb: "{value} Mo"
    },
    confirmDelete: "Retirer « {name} » du coffre-fort ?",
    toast: {
      loadError: "Impossible de charger le coffre-fort.",
      removed: "Document retiré.",
      deleteError: "Erreur lors de la suppression.",
      descriptionUpdated: "Description mise à jour.",
      updateError: "Erreur lors de la mise à jour.",
      sharedOnPortal: "Document partagé sur le portail client.",
      shareError: "Impossible de partager ce document.",
      uploaded: "Document ajouté au coffre-fort et partagé avec le client.",
      uploadedVisible: "Document ajouté au coffre-fort et visible sur le portail client.",
      uploadedInternal: "Document ajouté au coffre-fort (masqué pour le client).",
      clientNotFound: "Entreprise introuvable.",
      fileRequired: "Sélectionnez un fichier.",
      uploadError: "Erreur lors de l'upload."
    }
  },
  en: {
    categories: {
      "Facture matériel": "Hardware invoice",
      "Image client": "Client image",
      "Baie de brassage": "Patch panel",
      "Plan de réseau": "Network plan",
      Procédure: "Procedure",
      Contrat: "Contract",
      Rapport: "Report",
      Autre: "Other"
    },
    panel: {
      sectionTitle: "Document vault",
      addToVault: "Add to vault",
      intro: "Invoices, manuals, guides and reports shared with the contact on their client portal.",
      sharedCountOne: " {count} document visible on the portal.",
      sharedCountMany: " {count} documents visible on the portal.",
      searchPlaceholder: "Search for a document…",
      clearSearchAria: "Clear",
      allTypes: "All types",
      loading: "Loading document vault…",
      empty: "No documents in the vault.",
      emptyFolder: "This folder is empty.",
      rootBreadcrumb: "Vault",
      newFolder: "New folder",
      newFolderPlaceholder: "Folder name",
      createFolder: "Create",
      folderCreated: "Folder created.",
      folderCreateError: "Unable to create folder.",
      folderNameRequired: "Enter a folder name.",
      renameFolder: "Rename",
      deleteFolder: "Delete folder",
      confirmDeleteFolder: "Delete folder « {name} »? Its contents will move up one level.",
      folderDeleted: "Folder deleted.",
      folderDeleteError: "Unable to delete folder.",
      openFolder: "Open folder",
      filesCount: "{count} file(s)",
      subfoldersCount: "{count} subfolder(s)"
    },
    card: {
      previewTitle: "Preview",
      visiblePortal: "Visible on portal",
      notShared: "Not shared",
      notSharedTitle: "Agent-only document · click to share on the client portal",
      noDescription: "No description",
      downloadTitle: "Download",
      editDescriptionTitle: "Edit description",
      editDescriptionAria: "Edit description",
      removeTitle: "Remove"
    },
    uploadModal: {
      eyebrow: "Document vault",
      title: "Add to vault",
      subtitle: "The document will be archived in the company document vault.",
      hint: "Choose whether the document should be visible on the client portal.",
      categoryLabel: "Document type",
      descriptionLabel: "Description (optional)",
      descriptionPlaceholder: "E.g. Q1 2026 hardware invoice, VPN user guide…",
      fileLabel: "File",
      dropHint: "Drag and drop or click to select",
      dropFormats: "PDF, images, Word, Excel, HTML, ZIP · max 50 MB",
      visiblePortalLabel: "Visible on client portal",
      visiblePortalHint: "On: contact can view the document. Off: agents only.",
      visibleOn: "Visible",
      visibleOff: "Hidden",
      footerRequired: "Fields marked * are required",
      cancel: "Cancel",
      upload: "Add to vault",
      uploading: "Uploading…",
      closeAria: "Close"
    },
    editModal: {
      eyebrow: "Document vault",
      title: "Edit description",
      descriptionLabel: "Description",
      descriptionPlaceholder: "E.g. Q1 2026 hardware invoice, VPN user guide…",
      visiblePortalLabel: "Visible on client portal",
      visiblePortalHint: "On: contact can view the document. Off: agents only.",
      visibleOn: "Visible",
      visibleOff: "Hidden",
      footerHint: "Description and portal visibility",
      cancel: "Cancel",
      save: "Save",
      saving: "Saving…",
      closeAria: "Close"
    },
    previewModal: {
      download: "Download",
      closeAria: "Close",
      unsupported: "Preview not available for this file type.",
      noDescription: "No description",
      editDescriptionTitle: "Edit description",
      editDescriptionAria: "Edit description"
    },
    size: {
      bytes: "{value} B",
      kb: "{value} KB",
      mb: "{value} MB"
    },
    confirmDelete: "Remove « {name} » from the vault?",
    toast: {
      loadError: "Unable to load document vault.",
      removed: "Document removed.",
      deleteError: "Error deleting document.",
      descriptionUpdated: "Description updated.",
      updateError: "Error updating description.",
      sharedOnPortal: "Document shared on client portal.",
      shareError: "Unable to share this document.",
      uploaded: "Document added to vault and shared with client.",
      uploadedVisible: "Document added to vault and visible on the client portal.",
      uploadedInternal: "Document added to vault (hidden from client).",
      clientNotFound: "Company not found.",
      fileRequired: "Select a file.",
      uploadError: "Error uploading file."
    }
  },
  de: {
    categories: {
      "Facture matériel": "Hardware-Rechnung",
      "Image client": "Kundenbild",
      "Baie de brassage": "Patchpanel",
      "Plan de réseau": "Netzplan",
      Procédure: "Verfahren",
      Contrat: "Vertrag",
      Rapport: "Bericht",
      Autre: "Sonstiges"
    },
    panel: {
      sectionTitle: "Dokumententresor",
      addToVault: "Zum Tresor hinzufügen",
      intro: "Rechnungen, Handbücher, Anleitungen und Berichte, die mit dem Kontakt im Kundenportal geteilt werden.",
      sharedCountOne: " {count} Dokument im Portal sichtbar.",
      sharedCountMany: " {count} Dokumente im Portal sichtbar.",
      searchPlaceholder: "Dokument suchen…",
      clearSearchAria: "Löschen",
      allTypes: "Alle Typen",
      loading: "Dokumententresor wird geladen…",
      empty: "Keine Dokumente im Tresor."
    },
    card: {
      previewTitle: "Vorschau",
      visiblePortal: "Im Portal sichtbar",
      notShared: "Nicht geteilt",
      notSharedTitle: "Nur für Agenten · klicken, um im Kundenportal zu teilen",
      noDescription: "Keine Beschreibung",
      downloadTitle: "Herunterladen",
      editDescriptionTitle: "Beschreibung bearbeiten",
      editDescriptionAria: "Beschreibung bearbeiten",
      removeTitle: "Entfernen"
    },
    uploadModal: {
      eyebrow: "Dokumententresor",
      title: "Zum Tresor hinzufügen",
      subtitle: "Das Dokument wird im Unternehmens-Tresor archiviert.",
      hint: "Wählen Sie, ob das Dokument im Kundenportal sichtbar sein soll.",
      categoryLabel: "Dokumenttyp",
      descriptionLabel: "Beschreibung (optional)",
      descriptionPlaceholder: "z. B. Hardware-Rechnung Q1 2026, VPN-Benutzerhandbuch…",
      fileLabel: "Datei",
      dropHint: "Ziehen und ablegen oder klicken zum Auswählen",
      dropFormats: "PDF, Bilder, Word, Excel, HTML, ZIP · max. 50 MB",
      visiblePortalLabel: "Im Kundenportal sichtbar",
      visiblePortalHint: "Ein: Kontakt kann das Dokument sehen. Aus: nur Agenten.",
      visibleOn: "Sichtbar",
      visibleOff: "Verborgen",
      footerRequired: "Mit * markierte Felder sind Pflichtfelder",
      cancel: "Abbrechen",
      upload: "Zum Tresor hinzufügen",
      uploading: "Senden…",
      closeAria: "Schließen"
    },
    editModal: {
      eyebrow: "Dokumententresor",
      title: "Beschreibung bearbeiten",
      descriptionLabel: "Beschreibung",
      descriptionPlaceholder: "z. B. Hardware-Rechnung Q1 2026, VPN-Benutzerhandbuch…",
      visiblePortalLabel: "Im Kundenportal sichtbar",
      visiblePortalHint: "Ein: Kontakt kann das Dokument sehen. Aus: nur Agenten.",
      visibleOn: "Sichtbar",
      visibleOff: "Ausgeblendet",
      footerHint: "Beschreibung und Portal-Sichtbarkeit",
      cancel: "Abbrechen",
      save: "Speichern",
      saving: "Speichern…",
      closeAria: "Schließen"
    },
    previewModal: {
      download: "Herunterladen",
      closeAria: "Schließen",
      unsupported: "Vorschau für diesen Dateityp nicht verfügbar.",
      noDescription: "Keine Beschreibung",
      editDescriptionTitle: "Beschreibung bearbeiten",
      editDescriptionAria: "Beschreibung bearbeiten"
    },
    size: {
      bytes: "{value} B",
      kb: "{value} KB",
      mb: "{value} MB"
    },
    confirmDelete: "« {name} » aus dem Tresor entfernen?",
    toast: {
      loadError: "Dokumententresor konnte nicht geladen werden.",
      removed: "Dokument entfernt.",
      deleteError: "Fehler beim Löschen.",
      descriptionUpdated: "Beschreibung aktualisiert.",
      updateError: "Fehler beim Aktualisieren.",
      sharedOnPortal: "Dokument im Kundenportal geteilt.",
      shareError: "Dokument konnte nicht geteilt werden.",
      uploaded: "Dokument zum Tresor hinzugefügt und mit Kunde geteilt.",
      uploadedVisible: "Dokument zum Tresor hinzugefügt und im Kundenportal sichtbar.",
      uploadedInternal: "Dokument zum Tresor hinzugefügt (für Kunde verborgen).",
      clientNotFound: "Unternehmen nicht gefunden.",
      fileRequired: "Datei auswählen.",
      uploadError: "Fehler beim Hochladen."
    }
  },
  it: {
    categories: {
      "Facture matériel": "Fattura hardware",
      "Image client": "Immagine cliente",
      "Baie de brassage": "Pannello patch",
      "Plan de réseau": "Piano di rete",
      Procédure: "Procedura",
      Contrat: "Contratto",
      Rapport: "Report",
      Autre: "Altro"
    },
    panel: {
      sectionTitle: "Cassaforte documenti",
      addToVault: "Aggiungi alla cassaforte",
      intro: "Fatture, manuali, guide e report condivisi con il contatto sul portale cliente.",
      sharedCountOne: " {count} documento visibile sul portale.",
      sharedCountMany: " {count} documenti visibili sul portale.",
      searchPlaceholder: "Cerca un documento…",
      clearSearchAria: "Cancella",
      allTypes: "Tutti i tipi",
      loading: "Caricamento cassaforte documenti…",
      empty: "Nessun documento nella cassaforte."
    },
    card: {
      previewTitle: "Anteprima",
      visiblePortal: "Visibile portale",
      notShared: "Non condiviso",
      notSharedTitle: "Documento riservato agli agenti · clicca per condividere sul portale cliente",
      noDescription: "Nessuna descrizione",
      downloadTitle: "Scarica",
      editDescriptionTitle: "Modifica descrizione",
      editDescriptionAria: "Modifica descrizione",
      removeTitle: "Rimuovi"
    },
    uploadModal: {
      eyebrow: "Cassaforte documenti",
      title: "Aggiungi alla cassaforte",
      subtitle: "Il documento sarà archiviato nella cassaforte dell'azienda.",
      hint: "Scegli se il documento deve essere visibile sul portale cliente.",
      categoryLabel: "Tipo di documento",
      descriptionLabel: "Descrizione (opzionale)",
      descriptionPlaceholder: "Es. Fattura hardware Q1 2026, Guida utente VPN…",
      fileLabel: "File",
      dropHint: "Trascina e rilascia o clicca per selezionare",
      dropFormats: "PDF, immagini, Word, Excel, HTML, ZIP · max 50 MB",
      visiblePortalLabel: "Visibile sul portale cliente",
      visiblePortalHint: "Attivo: il contatto può consultarlo. Disattivo: solo agenti.",
      visibleOn: "Visibile",
      visibleOff: "Nascosto",
      footerRequired: "I campi * sono obbligatori",
      cancel: "Annulla",
      upload: "Aggiungi alla cassaforte",
      uploading: "Invio…",
      closeAria: "Chiudi"
    },
    editModal: {
      eyebrow: "Cassaforte documenti",
      title: "Modifica descrizione",
      descriptionLabel: "Descrizione",
      descriptionPlaceholder: "Es. Fattura hardware Q1 2026, Guida utente VPN…",
      visiblePortalLabel: "Visibile sul portale cliente",
      visiblePortalHint: "Attivo: il contatto può consultarlo. Disattivo: solo agenti.",
      visibleOn: "Visibile",
      visibleOff: "Nascosto",
      footerHint: "Descrizione e visibilità portale",
      cancel: "Annulla",
      save: "Salva",
      saving: "Salvataggio…",
      closeAria: "Chiudi"
    },
    previewModal: {
      download: "Scarica",
      closeAria: "Chiudi",
      unsupported: "Anteprima non disponibile per questo tipo di file.",
      noDescription: "Nessuna descrizione",
      editDescriptionTitle: "Modifica descrizione",
      editDescriptionAria: "Modifica descrizione"
    },
    size: {
      bytes: "{value} B",
      kb: "{value} KB",
      mb: "{value} MB"
    },
    confirmDelete: "Rimuovere « {name} » dalla cassaforte?",
    toast: {
      loadError: "Impossibile caricare la cassaforte documenti.",
      removed: "Documento rimosso.",
      deleteError: "Errore durante l'eliminazione.",
      descriptionUpdated: "Descrizione aggiornata.",
      updateError: "Errore durante l'aggiornamento.",
      sharedOnPortal: "Documento condiviso sul portale cliente.",
      shareError: "Impossibile condividere questo documento.",
      uploaded: "Documento aggiunto alla cassaforte e condiviso con il cliente.",
      uploadedVisible: "Documento aggiunto alla cassaforte e visibile sul portale cliente.",
      uploadedInternal: "Documento aggiunto alla cassaforte (nascosto al cliente).",
      clientNotFound: "Azienda non trovata.",
      fileRequired: "Seleziona un file.",
      uploadError: "Errore durante il caricamento."
    }
  },
  es: {
    categories: {
      "Facture matériel": "Factura hardware",
      "Image client": "Imagen cliente",
      "Baie de brassage": "Panel de patch",
      "Plan de réseau": "Plano de red",
      Procédure: "Procedimiento",
      Contrat: "Contrato",
      Rapport: "Informe",
      Autre: "Otro"
    },
    panel: {
      sectionTitle: "Caja fuerte documental",
      addToVault: "Añadir a la caja fuerte",
      intro: "Facturas, manuales, guías e informes compartidos con el contacto en su portal cliente.",
      sharedCountOne: " {count} documento visible en el portal.",
      sharedCountMany: " {count} documentos visibles en el portal.",
      searchPlaceholder: "Buscar un documento…",
      clearSearchAria: "Borrar",
      allTypes: "Todos los tipos",
      loading: "Cargando caja fuerte documental…",
      empty: "Ningún documento en la caja fuerte."
    },
    card: {
      previewTitle: "Vista previa",
      visiblePortal: "Visible en portal",
      notShared: "No compartido",
      notSharedTitle: "Documento reservado a agentes · clic para compartir en el portal cliente",
      noDescription: "Sin descripción",
      downloadTitle: "Descargar",
      editDescriptionTitle: "Editar descripción",
      editDescriptionAria: "Editar descripción",
      removeTitle: "Retirar"
    },
    uploadModal: {
      eyebrow: "Caja fuerte documental",
      title: "Añadir a la caja fuerte",
      subtitle: "El documento se archivará en la caja fuerte de la empresa.",
      hint: "Elija si el documento debe ser visible en el portal cliente.",
      categoryLabel: "Tipo de documento",
      descriptionLabel: "Descripción (opcional)",
      descriptionPlaceholder: "Ej. Factura material T1 2026, Guía usuario VPN…",
      fileLabel: "Archivo",
      dropHint: "Arrastrar y soltar o clic para seleccionar",
      dropFormats: "PDF, imágenes, Word, Excel, HTML, ZIP · máx. 50 MB",
      visiblePortalLabel: "Visible en el portal cliente",
      visiblePortalHint: "Activado: el contacto puede consultarlo. Desactivado: solo agentes.",
      visibleOn: "Visible",
      visibleOff: "Oculto",
      footerRequired: "Los campos * son obligatorios",
      cancel: "Cancelar",
      upload: "Añadir a la caja fuerte",
      uploading: "Enviando…",
      closeAria: "Cerrar"
    },
    editModal: {
      eyebrow: "Caja fuerte documental",
      title: "Editar descripción",
      descriptionLabel: "Descripción",
      descriptionPlaceholder: "Ej. Factura material T1 2026, Guía usuario VPN…",
      visiblePortalLabel: "Visible en el portal cliente",
      visiblePortalHint: "Activado: el contacto puede consultarlo. Desactivado: solo agentes.",
      visibleOn: "Visible",
      visibleOff: "Oculto",
      footerHint: "Descripción y visibilidad en el portal",
      cancel: "Cancelar",
      save: "Guardar",
      saving: "Guardando…",
      closeAria: "Cerrar"
    },
    previewModal: {
      download: "Descargar",
      closeAria: "Cerrar",
      unsupported: "Vista previa no disponible para este tipo de archivo.",
      noDescription: "Sin descripción",
      editDescriptionTitle: "Editar descripción",
      editDescriptionAria: "Editar descripción"
    },
    size: {
      bytes: "{value} B",
      kb: "{value} KB",
      mb: "{value} MB"
    },
    confirmDelete: "¿Retirar « {name} » de la caja fuerte?",
    toast: {
      loadError: "No se pudo cargar la caja fuerte documental.",
      removed: "Documento retirado.",
      deleteError: "Error al eliminar.",
      descriptionUpdated: "Descripción actualizada.",
      updateError: "Error al actualizar.",
      sharedOnPortal: "Documento compartido en el portal cliente.",
      shareError: "No se pudo compartir este documento.",
      uploaded: "Documento añadido a la caja fuerte y compartido con el cliente.",
      uploadedVisible: "Documento añadido a la caja fuerte y visible en el portal cliente.",
      uploadedInternal: "Documento añadido a la caja fuerte (oculto para el cliente).",
      clientNotFound: "Empresa no encontrada.",
      fileRequired: "Seleccione un archivo.",
      uploadError: "Error al subir el archivo."
    }
  }
};
export function getEnterpriseVaultCopy(locale) {
  const code = normalizeLocale(locale);
  const t = pickLocaleMessages(ENTERPRISE_VAULT_COPY, code);
  const bcp47 = LOCALE_BCP47[code] || LOCALE_BCP47.fr;
  return {
    ...t,
    categoryKeys: CATEGORY_KEYS,
    getCategoryLabel: category => t.categories[category] || category,
    formatIntroSharedCount: count => {
      if (count <= 0) return "";
      const template = count > 1 ? t.panel.sharedCountMany : t.panel.sharedCountOne;
      return interpolate(template, {
        count: String(count)
      });
    },
    formatSize: bytes => {
      const value = Number(bytes) || 0;
      if (value < 1024) return interpolate(t.size.bytes, {
        value: String(value)
      });
      if (value < 1024 * 1024) {
        return interpolate(t.size.kb, {
          value: (value / 1024).toFixed(1)
        });
      }
      return interpolate(t.size.mb, {
        value: (value / (1024 * 1024)).toFixed(1)
      });
    },
    formatDate: value => {
      if (!value) return "-";
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString(bcp47);
    },
    formatDeleteConfirm: name => interpolate(t.confirmDelete, {
      name: String(name || "")
    })
  };
}
