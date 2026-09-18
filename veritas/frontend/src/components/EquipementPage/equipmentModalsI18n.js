import { createLocaleGetter, interpolate, pickLocaleMessages } from "../../i18n/translate";
import { getEquipmentFormSections as getEquipmentFormSectionsBase, getServerFormProfile, getStorageFormProfile, normalizeFirewallType, normalizeRouteurType, normalizeServerType, normalizeStorageType, EQUIPMENT_MODULE_ICONS } from "./equipmentFormConfig";
import { EQUIPMENT_FORM_FIELDS, getFormFields } from "./equipmentFormFieldsI18n";
import { getEquipmentFormOptionsCopy } from "./equipmentFormOptionsI18n";
import { HARDWARE_TYPE_ORDER } from "../EnterprisesPage/infraHoneycombLayout";
export { getFormFields };
const MODULE_KEYS = [...HARDWARE_TYPE_ORDER];
const EQUIPMENT_MODALS = {
  fr: {
    clientPrefix: "Client #",
    moduleLabels: {
      Internet: "Internet",
      Firewalls: "Firewall",
      Serveurs: "Serveur",
      Stockage: "Stockage",
      Switch: "Switch",
      BorneWifi: "Borne WiFi",
      Alimentation: "Alimentation",
      Routeur: "Routeur / SD-WAN",
      TOIP: "TOIP / VOIP",
      Ordinateurs: "Ordinateur",
      Sauvegarde: "Sauvegarde",
      "Caméra de sécurité": "Caméra de sécurité"
    },
    addFlow: {
      eyebrow: "Ajout matériel",
      title: "Ajouter un équipement",
      subtitle: "Choisissez la catégorie puis l'entreprise cliente.",
      navAria: "Étapes d'ajout",
      sections: {
        category: {
          label: "Catégorie",
          description: "Type de matériel à ajouter"
        },
        client: {
          label: "Entreprise",
          description: "Client rattaché au matériel"
        }
      },
      categoryHint: "Quelle catégorie de matériel souhaitez-vous ajouter ?",
      clientHint: "Sélectionnez l'entreprise pour ce matériel ({category}).",
      clientHintGeneric: "Sélectionnez l'entreprise pour ce matériel.",
      loadingClients: "Chargement des entreprises…",
      noClients: "Aucune entreprise disponible.",
      enterpriseLabel: "Entreprise",
      searchEnterprise: "Rechercher une entreprise…",
      noEnterprise: "Aucune entreprise trouvée",
      footerCategory: "Sélectionnez une catégorie pour continuer",
      footerOpening: "Ouverture du formulaire…",
      footerClient: "Choisissez l'entreprise puis continuez",
      back: "Retour",
      cancel: "Annuler",
      continue: "Continuer",
      loading: "Chargement…",
      close: "Fermer",
      loadSitesError: "Impossible de charger les sites de l'entreprise"
    },
    form: {
      eyebrowEquipment: "Fiche équipement",
      eyebrowInternet: "Connexion internet",
      addInternetTitle: "Ajouter une connexion internet",
      addModuleTitle: "Ajouter un {module}",
      editInternetTitle: "Modifier {name}",
      editEquipmentTitle: "Modifier {name}",
      editInternetFallback: "la connexion",
      editEquipmentFallback: "l'équipement",
      addInternetSubtitle: "Renseignez les informations de la nouvelle connexion.",
      addEquipmentSubtitle: "Renseignez les informations du nouvel équipement.",
      editInternetSubtitle: "Connexion internet · Mettez à jour les champs par section.",
      editEquipmentSubtitle: "{module} · Mettez à jour les champs par section.",
      unifiImportBanner: "Importer depuis UniFi (tenant global ou dédié)",
      unifiImportHint: "Préremplir via Site Manager ou Network API du client.",
      navAria: "Sections du formulaire",
      footerRequired: "Les champs marqués * sont obligatoires",
      footerUnsaved: "Modifications non enregistrées",
      footerNoChanges: "Aucune modification",
      delete: "Supprimer",
      deleting: "Suppression…",
      cancel: "Annuler",
      save: "Enregistrer",
      saving: "Enregistrement…",
      createInternet: "Créer la connexion",
      createFirewall: "Créer le firewall",
      createRouter: "Créer le routeur",
      createServer: "Créer le serveur",
      createStorage: "Créer le stockage",
      createComputer: "Créer l'ordinateur",
      createEquipment: "Créer l'équipement",
      close: "Fermer",
      thisEquipment: "cet équipement",
      deleteInternetTitle: "Supprimer cette connexion ?",
      deleteEquipmentTitle: "Supprimer cet équipement ?",
      deleteMessage: "Voulez-vous vraiment supprimer « {name} » ? Cette action est irréversible.",
      toastAddedFirewall: "Firewall ajouté",
      toastAdded: "Équipement ajouté",
      toastUpdated: "Équipement mis à jour",
      toastDeleted: "Équipement supprimé",
      toastSaveError: "Erreur lors de l'enregistrement",
      toastDeleteError: "Erreur lors de la suppression de l'équipement",
      toastLocalUpdateError: "Erreur lors de la mise à jour locale",
      errorAdd: "Erreur lors de l'ajout",
      errorUpdate: "Erreur lors de la mise à jour",
      errorDelete: "Erreur lors de la suppression"
    },
    validation: {
      nameRequired: "Le nom est obligatoire",
      brandRequired: "La marque est obligatoire",
      serverTypeRequired: "Le type de serveur est obligatoire",
      storageTypeRequired: "Le type de stockage est obligatoire",
      toipTypeRequired: "Le type d'équipement est obligatoire",
      internetTypeRequired: "Le type de connexion est obligatoire",
      providerRequired: "Le fournisseur est obligatoire",
      ipRequired: "Renseignez une adresse IP ou indiquez « IP non fixe »",
      extraFieldRequired: "{field} est obligatoire"
    },
    sections: {
      identity: {
        label: "Identité",
        description: "Nom et lieux"
      },
      hardware: {
        label: "Matériel",
        description: "Marque, modèle et série"
      },
      network: {
        label: "Réseau",
        description: "Adresse IP et VLAN"
      },
      system: {
        label: "Système",
        description: "OS et ressources"
      },
      storage: {
        label: "Stockage",
        description: "RAID et capacité"
      },
      management: {
        label: "Gestion",
        description: "Administration et supervision"
      },
      ha: {
        label: "Haute dispo.",
        description: "Cluster et partenaire"
      },
      licences: {
        label: "Licences",
        description: "Contrats et expiration"
      },
      remote: {
        label: "Prise en main",
        description: "Solution distante et identifiant de connexion"
      },
      wifi: {
        label: "WiFi",
        description: "SSID et paramètres radio"
      },
      power: {
        label: "Puissance",
        description: "Capacité et batterie"
      },
      voip: {
        label: "Téléphonie",
        description: "Extensions et SIP"
      },
      notes: {
        label: "Notes",
        description: "Accès, procédures et informations utiles"
      },
      common: {
        label: "Facturation et installation",
        description: "Achat, facture, installation et garantie"
      },
      internetType: {
        label: "Type",
        description: "Technologie d'accès"
      },
      internetLink: {
        label: "Liaison",
        description: "Lieux, fournisseur et débits"
      },
      internetNetwork: {
        label: "Réseau",
        description: "IP publique et passerelle"
      },
      internetContract: {
        label: "Contrat",
        description: "Références et support"
      },
      internetNotes: {
        label: "Notes",
        description: "Informations complémentaires"
      }
    },
    addEquipmentLegacy: {
      title: "Ajouter un équipement",
      stepCategory: "Catégorie",
      stepClient: "Entreprise",
      chooseCategory: "Choisissez une catégorie",
      chooseClient: "Choisissez une entreprise",
      cancel: "Annuler",
      next: "Suivant",
      close: "Fermer"
    },
    confirm: {
      rmmRevoke: {
        title: "Révoquer cet agent ?",
        message: "L'agent RMM du poste « {name} » sera révoqué. Il ne pourra plus envoyer de données à Veritas et disparaîtra de la liste des périphériques.",
        confirm: "Révoquer",
        untitledAgent: "Sans nom"
      },
      purgeLogs: {
        title: "Purger les logs",
        messageFiltered: "Supprimer les {count} log(s) correspondant aux filtres actuels ? Cette action est irréversible.",
        messageAll: "Supprimer les {count} log(s) de ce matériel ? Cette action est irréversible.",
        confirm: "Purger"
      },
      deleteDocument: {
        title: "Supprimer le document ?",
        message: "Supprimer « {name} » ?"
      }
    }
  },
  en: {
    clientPrefix: "Client #",
    moduleLabels: {
      Internet: "Internet",
      Firewalls: "Firewall",
      Servers: "Server",
      Storage: "Storage",
      Switch: "Switch",
      BorneWifi: "WiFi AP",
      Alimentation: "Power",
      Routeur: "Router / SD-WAN",
      TOIP: "VoIP / TOIP",
      Ordinateurs: "Computer",
      Backup: "Backup",
      "Caméra de sécurité": "Security camera"
    },
    addFlow: {
      eyebrow: "Add hardware",
      title: "Add equipment",
      subtitle: "Choose the category then the client company.",
      navAria: "Add steps",
      sections: {
        category: {
          label: "Category",
          description: "Equipment type to add"
        },
        client: {
          label: "Company",
          description: "Client linked to the equipment"
        }
      },
      categoryHint: "Which equipment category do you want to add?",
      clientHint: "Select the company for this equipment ({category}).",
      clientHintGeneric: "Select the company for this equipment.",
      loadingClients: "Loading companies…",
      noClients: "No companies available.",
      enterpriseLabel: "Company",
      searchEnterprise: "Search for a company…",
      noEnterprise: "No company found",
      footerCategory: "Select a category to continue",
      footerOpening: "Opening form…",
      footerClient: "Choose the company then continue",
      back: "Back",
      cancel: "Cancel",
      continue: "Continue",
      loading: "Loading…",
      close: "Close",
      loadSitesError: "Unable to load company sites"
    },
    form: {
      eyebrowEquipment: "Equipment record",
      eyebrowInternet: "Internet connection",
      addInternetTitle: "Add internet connection",
      addModuleTitle: "Add {module}",
      editInternetTitle: "Edit {name}",
      editEquipmentTitle: "Edit {name}",
      editInternetFallback: "the connection",
      editEquipmentFallback: "the equipment",
      addInternetSubtitle: "Enter the new connection details.",
      addEquipmentSubtitle: "Enter the new equipment details.",
      editInternetSubtitle: "Internet connection · Update fields by section.",
      editEquipmentSubtitle: "{module} · Update fields by section.",
      unifiImportBanner: "Import from UniFi (global or dedicated tenant)",
      unifiImportHint: "Prefill via Site Manager or the client's Network API.",
      navAria: "Form sections",
      footerRequired: "Fields marked * are required",
      footerUnsaved: "Unsaved changes",
      footerNoChanges: "No changes",
      delete: "Delete",
      deleting: "Deleting…",
      cancel: "Cancel",
      save: "Save",
      saving: "Saving…",
      createInternet: "Create connection",
      createFirewall: "Create firewall",
      createRouter: "Create router",
      createServer: "Create server",
      createStorage: "Create storage",
      createComputer: "Create computer",
      createEquipment: "Create equipment",
      close: "Close",
      thisEquipment: "this equipment",
      deleteInternetTitle: "Delete this connection?",
      deleteEquipmentTitle: "Delete this equipment?",
      deleteMessage: "Do you really want to delete « {name} »? This action is irreversible.",
      toastAddedFirewall: "Firewall added",
      toastAdded: "Equipment added",
      toastUpdated: "Equipment updated",
      toastDeleted: "Equipment deleted",
      toastSaveError: "Error saving",
      toastDeleteError: "Error deleting equipment",
      toastLocalUpdateError: "Error updating locally",
      errorAdd: "Error adding",
      errorUpdate: "Error updating",
      errorDelete: "Error deleting"
    },
    validation: {
      nameRequired: "Name is required",
      brandRequired: "Brand is required",
      serverTypeRequired: "Server type is required",
      storageTypeRequired: "Storage type is required",
      toipTypeRequired: "Equipment type is required",
      internetTypeRequired: "Connection type is required",
      providerRequired: "Provider is required",
      ipRequired: "Enter an IP address or check « non-fixed IP »",
      extraFieldRequired: "{field} is required"
    },
    sections: {
      identity: {
        label: "Identity",
        description: "Name and location"
      },
      hardware: {
        label: "Hardware",
        description: "Brand, model and serial"
      },
      network: {
        label: "Network",
        description: "IP address and VLAN"
      },
      system: {
        label: "System",
        description: "OS and resources"
      },
      storage: {
        label: "Storage",
        description: "RAID and capacity"
      },
      management: {
        label: "Management",
        description: "Admin and monitoring"
      },
      ha: {
        label: "High availability",
        description: "Cluster and partner"
      },
      licences: {
        label: "Licenses",
        description: "Contracts and expiry"
      },
      remote: {
        label: "Remote access",
        description: "iDRAC, iLO, IPMI…"
      },
      wifi: {
        label: "WiFi",
        description: "SSIDs and radio settings"
      },
      power: {
        label: "Power",
        description: "Capacity and battery"
      },
      voip: {
        label: "Telephony",
        description: "Extensions and SIP"
      },
      notes: {
        label: "Notes",
        description: "Free comments"
      },
      common: {
        label: "Billing and installation",
        description: "Purchase, invoice, installation and warranty"
      },
      internetType: {
        label: "Type",
        description: "Link technology"
      },
      internetLink: {
        label: "Link",
        description: "Provider and bandwidth"
      },
      internetNetwork: {
        label: "Network",
        description: "IP, DNS and gateway"
      },
      internetContract: {
        label: "Contract",
        description: "Reference and term"
      },
      internetNotes: {
        label: "Notes",
        description: "Additional information"
      }
    },
    addEquipmentLegacy: {
      title: "Add equipment",
      stepCategory: "Category",
      stepClient: "Company",
      chooseCategory: "Choose a category",
      chooseClient: "Choose a company",
      cancel: "Cancel",
      next: "Next",
      close: "Close"
    },
    confirm: {
      rmmRevoke: {
        title: "Revoke this agent?",
        message: "The RMM agent on « {name} » will be revoked. It will no longer send data to Veritas and will disappear from the device list.",
        confirm: "Revoke",
        untitledAgent: "Untitled"
      },
      purgeLogs: {
        title: "Purge logs",
        messageFiltered: "Delete the {count} log(s) matching current filters? This action is irreversible.",
        messageAll: "Delete all {count} log(s) for this device? This action is irreversible.",
        confirm: "Purge"
      },
      deleteDocument: {
        title: "Delete document?",
        message: "Delete « {name} »?"
      }
    }
  },
  de: {
    clientPrefix: "Kunde #",
    moduleLabels: {
      Internet: "Internet",
      Firewalls: "Firewall",
      Serveurs: "Server",
      Stockage: "Speicher",
      Switch: "Switch",
      BorneWifi: "WLAN-AP",
      Alimentation: "Stromversorgung",
      Routeur: "Router / SD-WAN",
      TOIP: "VoIP / TOIP",
      Ordinateurs: "Computer",
      Sauvegarde: "Backup",
      "Caméra de sécurité": "Überwachungskamera"
    },
    addFlow: {
      eyebrow: "Gerät hinzufügen",
      title: "Gerät hinzufügen",
      subtitle: "Kategorie und Kundenunternehmen wählen.",
      navAria: "Hinzufügen-Schritte",
      sections: {
        category: {
          label: "Kategorie",
          description: "Gerätetyp"
        },
        client: {
          label: "Unternehmen",
          description: "Verknüpfter Kunde"
        }
      },
      categoryHint: "Welche Gerätekategorie möchten Sie hinzufügen?",
      clientHint: "Unternehmen für dieses Gerät wählen ({category}).",
      clientHintGeneric: "Unternehmen für dieses Gerät wählen.",
      loadingClients: "Unternehmen werden geladen…",
      noClients: "Keine Unternehmen verfügbar.",
      enterpriseLabel: "Unternehmen",
      searchEnterprise: "Unternehmen suchen…",
      noEnterprise: "Kein Unternehmen gefunden",
      footerCategory: "Kategorie wählen um fortzufahren",
      footerOpening: "Formular wird geöffnet…",
      footerClient: "Unternehmen wählen und fortfahren",
      back: "Zurück",
      cancel: "Abbrechen",
      continue: "Weiter",
      loading: "Laden…",
      close: "Schließen",
      loadSitesError: "Standorte konnten nicht geladen werden"
    },
    form: {
      eyebrowEquipment: "Gerätedatensatz",
      eyebrowInternet: "Internetverbindung",
      addInternetTitle: "Internetverbindung hinzufügen",
      addModuleTitle: "{module} hinzufügen",
      editInternetTitle: "{name} bearbeiten",
      editEquipmentTitle: "{name} bearbeiten",
      editInternetFallback: "die Verbindung",
      editEquipmentFallback: "das Gerät",
      addInternetSubtitle: "Details der neuen Verbindung eingeben.",
      addEquipmentSubtitle: "Details des neuen Geräts eingeben.",
      editInternetSubtitle: "Internetverbindung · Felder pro Abschnitt aktualisieren.",
      editEquipmentSubtitle: "{module} · Felder pro Abschnitt aktualisieren.",
      navAria: "Formularabschnitte",
      footerRequired: "Mit * markierte Felder sind Pflicht",
      footerUnsaved: "Nicht gespeicherte Änderungen",
      footerNoChanges: "Keine Änderungen",
      delete: "Löschen",
      deleting: "Löschen…",
      cancel: "Abbrechen",
      save: "Speichern",
      saving: "Speichern…",
      createInternet: "Verbindung erstellen",
      createFirewall: "Firewall erstellen",
      createRouter: "Router erstellen",
      createServer: "Server erstellen",
      createStorage: "Speicher erstellen",
      createComputer: "Computer erstellen",
      createEquipment: "Gerät erstellen",
      close: "Schließen",
      thisEquipment: "dieses Gerät",
      deleteInternetTitle: "Diese Verbindung löschen?",
      deleteEquipmentTitle: "Dieses Gerät löschen?",
      deleteMessage: "« {name} » wirklich löschen? Diese Aktion ist endgültig.",
      toastAddedFirewall: "Firewall hinzugefügt",
      toastAdded: "Gerät hinzugefügt",
      toastUpdated: "Gerät aktualisiert",
      toastDeleted: "Gerät gelöscht",
      toastSaveError: "Fehler beim Speichern",
      toastDeleteError: "Fehler beim Löschen",
      toastLocalUpdateError: "Lokale Aktualisierung fehlgeschlagen",
      errorAdd: "Fehler beim Hinzufügen",
      errorUpdate: "Fehler beim Aktualisieren",
      errorDelete: "Fehler beim Löschen"
    },
    validation: {
      nameRequired: "Name ist erforderlich",
      brandRequired: "Marke ist erforderlich",
      serverTypeRequired: "Servertyp erforderlich",
      storageTypeRequired: "Speichertyp erforderlich",
      toipTypeRequired: "Gerätetyp erforderlich",
      internetTypeRequired: "Verbindungstyp erforderlich",
      providerRequired: "Anbieter erforderlich",
      ipRequired: "IP-Adresse eingeben oder « dynamische IP » wählen",
      extraFieldRequired: "{field} ist erforderlich"
    },
    sections: {
      identity: {
        label: "Identität",
        description: "Name und Standort"
      },
      hardware: {
        label: "Hardware",
        description: "Marke und Modell"
      },
      network: {
        label: "Netzwerk",
        description: "IP und VLAN"
      },
      system: {
        label: "System",
        description: "OS und Ressourcen"
      },
      storage: {
        label: "Speicher",
        description: "RAID und Kapazität"
      },
      management: {
        label: "Verwaltung",
        description: "Administration"
      },
      ha: {
        label: "Hochverfügbarkeit",
        description: "Cluster"
      },
      licences: {
        label: "Lizenzen",
        description: "Verträge"
      },
      remote: {
        label: "Fernzugriff",
        description: "iDRAC, iLO…"
      },
      wifi: {
        label: "WLAN",
        description: "SSIDs"
      },
      power: {
        label: "Leistung",
        description: "Kapazität"
      },
      voip: {
        label: "Telefonie",
        description: "SIP"
      },
      notes: {
        label: "Notizen",
        description: "Kommentare"
      },
      common: {
        label: "Abrechnung und Installation",
        description: "Kauf, Rechnung, Installation und Garantie"
      },
      internetType: {
        label: "Typ",
        description: "Technologie"
      },
      internetLink: {
        label: "Leitung",
        description: "Anbieter"
      },
      internetNetwork: {
        label: "Netzwerk",
        description: "IP, DNS"
      },
      internetContract: {
        label: "Vertrag",
        description: "Referenz"
      },
      internetNotes: {
        label: "Notizen",
        description: "Zusatzinfos"
      }
    },
    addEquipmentLegacy: {
      title: "Gerät hinzufügen",
      stepCategory: "Kategorie",
      stepClient: "Unternehmen",
      chooseCategory: "Kategorie wählen",
      chooseClient: "Unternehmen wählen",
      cancel: "Abbrechen",
      next: "Weiter",
      close: "Schließen"
    },
    confirm: {
      rmmRevoke: {
        title: "Diesen Agent widerrufen?",
        message: "Der RMM-Agent auf « {name} » wird widerrufen. Er sendet keine Daten mehr an Veritas und verschwindet aus der Geräteliste.",
        confirm: "Widerrufen",
        untitledAgent: "Ohne Namen"
      },
      purgeLogs: {
        title: "Logs bereinigen",
        messageFiltered: "Die {count} Log(s) gemäß aktueller Filter löschen? Diese Aktion ist endgültig.",
        messageAll: "Alle {count} Log(s) dieses Geräts löschen? Diese Aktion ist endgültig.",
        confirm: "Bereinigen"
      },
      deleteDocument: {
        title: "Dokument löschen?",
        message: "« {name} » löschen?"
      }
    }
  },
  it: {
    clientPrefix: "Cliente #",
    moduleLabels: {
      Internet: "Internet",
      Firewalls: "Firewall",
      Serveurs: "Server",
      Stockage: "Storage",
      Switch: "Switch",
      BorneWifi: "AP WiFi",
      Alimentation: "Alimentazione",
      Routeur: "Router / SD-WAN",
      TOIP: "VoIP / TOIP",
      Ordinateurs: "Computer",
      Sauvegarde: "Backup",
      "Caméra de sécurité": "Telecamera di sicurezza"
    },
    addFlow: {
      eyebrow: "Aggiunta dispositivo",
      title: "Aggiungi dispositivo",
      subtitle: "Scegli categoria e azienda cliente.",
      navAria: "Passaggi aggiunta",
      sections: {
        category: {
          label: "Categoria",
          description: "Tipo di dispositivo"
        },
        client: {
          label: "Azienda",
          description: "Cliente collegato"
        }
      },
      categoryHint: "Quale categoria di dispositivo vuoi aggiungere?",
      clientHint: "Seleziona l'azienda per questo dispositivo ({category}).",
      clientHintGeneric: "Seleziona l'azienda per questo dispositivo.",
      loadingClients: "Caricamento aziende…",
      noClients: "Nessuna azienda disponibile.",
      enterpriseLabel: "Azienda",
      searchEnterprise: "Cerca un'azienda…",
      noEnterprise: "Nessuna azienda trovata",
      footerCategory: "Seleziona una categoria per continuare",
      footerOpening: "Apertura modulo…",
      footerClient: "Scegli l'azienda e continua",
      back: "Indietro",
      cancel: "Annulla",
      continue: "Continua",
      loading: "Caricamento…",
      close: "Chiudi",
      loadSitesError: "Impossibile caricare i siti dell'azienda"
    },
    form: {
      eyebrowEquipment: "Scheda dispositivo",
      eyebrowInternet: "Connessione internet",
      addInternetTitle: "Aggiungi connessione internet",
      addModuleTitle: "Aggiungi {module}",
      editInternetTitle: "Modifica {name}",
      editEquipmentTitle: "Modifica {name}",
      editInternetFallback: "la connessione",
      editEquipmentFallback: "il dispositivo",
      addInternetSubtitle: "Inserisci i dettagli della nuova connessione.",
      addEquipmentSubtitle: "Inserisci i dettagli del nuovo dispositivo.",
      editInternetSubtitle: "Connessione internet · Aggiorna per sezione.",
      editEquipmentSubtitle: "{module} · Aggiorna per sezione.",
      navAria: "Sezioni modulo",
      footerRequired: "I campi con * sono obbligatori",
      footerUnsaved: "Modifiche non salvate",
      footerNoChanges: "Nessuna modifica",
      delete: "Elimina",
      deleting: "Eliminazione…",
      cancel: "Annulla",
      save: "Salva",
      saving: "Salvataggio…",
      createInternet: "Crea connessione",
      createFirewall: "Crea firewall",
      createRouter: "Crea router",
      createServer: "Crea server",
      createStorage: "Crea storage",
      createComputer: "Crea computer",
      createEquipment: "Crea dispositivo",
      close: "Chiudi",
      thisEquipment: "questo dispositivo",
      deleteInternetTitle: "Eliminare questa connessione?",
      deleteEquipmentTitle: "Eliminare questo dispositivo?",
      deleteMessage: "Eliminare « {name} »? Azione irreversibile.",
      toastAddedFirewall: "Firewall aggiunto",
      toastAdded: "Dispositivo aggiunto",
      toastUpdated: "Dispositivo aggiornato",
      toastDeleted: "Dispositivo eliminato",
      toastSaveError: "Errore salvataggio",
      toastDeleteError: "Errore eliminazione",
      toastLocalUpdateError: "Errore aggiornamento locale",
      errorAdd: "Errore aggiunta",
      errorUpdate: "Errore aggiornamento",
      errorDelete: "Errore eliminazione"
    },
    validation: {
      nameRequired: "Il nome è obbligatorio",
      brandRequired: "La marca è obbligatoria",
      serverTypeRequired: "Tipo server obbligatorio",
      storageTypeRequired: "Tipo storage obbligatorio",
      toipTypeRequired: "Tipo dispositivo obbligatorio",
      internetTypeRequired: "Tipo connessione obbligatorio",
      providerRequired: "Fornitore obbligatorio",
      ipRequired: "Inserisci IP o seleziona « IP non fisso »",
      extraFieldRequired: "{field} è obbligatorio"
    },
    sections: {
      identity: {
        label: "Identità",
        description: "Nome e sede"
      },
      hardware: {
        label: "Hardware",
        description: "Marca e modello"
      },
      network: {
        label: "Rete",
        description: "IP e VLAN"
      },
      system: {
        label: "Sistema",
        description: "OS e risorse"
      },
      storage: {
        label: "Storage",
        description: "RAID e capacità"
      },
      management: {
        label: "Gestione",
        description: "Amministrazione"
      },
      ha: {
        label: "Alta disponibilità",
        description: "Cluster"
      },
      licences: {
        label: "Licenze",
        description: "Contratti"
      },
      remote: {
        label: "Accesso remoto",
        description: "iDRAC, iLO…"
      },
      wifi: {
        label: "WiFi",
        description: "SSID"
      },
      power: {
        label: "Alimentazione",
        description: "Capacità"
      },
      voip: {
        label: "Telefonia",
        description: "SIP"
      },
      notes: {
        label: "Note",
        description: "Commenti"
      },
      common: {
        label: "Fatturazione e installazione",
        description: "Acquisto, fattura, installazione e garanzia"
      },
      internetType: {
        label: "Tipo",
        description: "Tecnologia"
      },
      internetLink: {
        label: "Linea",
        description: "Fornitore"
      },
      internetNetwork: {
        label: "Rete",
        description: "IP, DNS"
      },
      internetContract: {
        label: "Contratto",
        description: "Riferimento"
      },
      internetNotes: {
        label: "Note",
        description: "Info aggiuntive"
      }
    },
    addEquipmentLegacy: {
      title: "Aggiungi dispositivo",
      stepCategory: "Categoria",
      stepClient: "Azienda",
      chooseCategory: "Scegli categoria",
      chooseClient: "Scegli azienda",
      cancel: "Annulla",
      next: "Avanti",
      close: "Chiudi"
    },
    confirm: {
      rmmRevoke: {
        title: "Revocare questo agente?",
        message: "L'agente RMM su « {name} » sarà revocato. Non invierà più dati a Veritas e scomparirà dall'elenco dispositivi.",
        confirm: "Revoca",
        untitledAgent: "Senza nome"
      },
      purgeLogs: {
        title: "Elimina log",
        messageFiltered: "Eliminare i {count} log corrispondenti ai filtri attuali? Azione irreversibile.",
        messageAll: "Eliminare tutti i {count} log di questo dispositivo? Azione irreversibile.",
        confirm: "Elimina"
      },
      deleteDocument: {
        title: "Eliminare il documento?",
        message: "Eliminare « {name} »?"
      }
    }
  },
  es: {
    clientPrefix: "Cliente #",
    moduleLabels: {
      Internet: "Internet",
      Firewalls: "Firewall",
      Serveurs: "Servidor",
      Stockage: "Almacenamiento",
      Switch: "Switch",
      BorneWifi: "AP WiFi",
      Alimentation: "Alimentación",
      Routeur: "Router / SD-WAN",
      TOIP: "VoIP / TOIP",
      Ordinateurs: "Ordenador",
      Sauvegarde: "Copia de seguridad",
      "Caméra de sécurité": "Cámara de seguridad"
    },
    addFlow: {
      eyebrow: "Añadir equipo",
      title: "Añadir equipo",
      subtitle: "Elija categoría y empresa cliente.",
      navAria: "Pasos de alta",
      sections: {
        category: {
          label: "Categoría",
          description: "Tipo de equipo"
        },
        client: {
          label: "Empresa",
          description: "Cliente vinculado"
        }
      },
      categoryHint: "¿Qué categoría de equipo desea añadir?",
      clientHint: "Seleccione la empresa para este equipo ({category}).",
      clientHintGeneric: "Seleccione la empresa para este equipo.",
      loadingClients: "Cargando empresas…",
      noClients: "Ninguna empresa disponible.",
      enterpriseLabel: "Empresa",
      searchEnterprise: "Buscar una empresa…",
      noEnterprise: "Ninguna empresa encontrada",
      footerCategory: "Seleccione una categoría para continuar",
      footerOpening: "Abriendo formulario…",
      footerClient: "Elija la empresa y continúe",
      back: "Volver",
      cancel: "Cancelar",
      continue: "Continuar",
      loading: "Cargando…",
      close: "Cerrar",
      loadSitesError: "No se pudieron cargar los sitios de la empresa"
    },
    form: {
      eyebrowEquipment: "Ficha de equipo",
      eyebrowInternet: "Conexión internet",
      addInternetTitle: "Añadir conexión internet",
      addModuleTitle: "Añadir {module}",
      editInternetTitle: "Modificar {name}",
      editEquipmentTitle: "Modificar {name}",
      editInternetFallback: "la conexión",
      editEquipmentFallback: "el equipo",
      addInternetSubtitle: "Introduzca los datos de la nueva conexión.",
      addEquipmentSubtitle: "Introduzca los datos del nuevo equipo.",
      editInternetSubtitle: "Conexión internet · Actualice por sección.",
      editEquipmentSubtitle: "{module} · Actualice por sección.",
      navAria: "Secciones del formulario",
      footerRequired: "Los campos con * son obligatorios",
      footerUnsaved: "Cambios sin guardar",
      footerNoChanges: "Sin cambios",
      delete: "Eliminar",
      deleting: "Eliminando…",
      cancel: "Cancelar",
      save: "Guardar",
      saving: "Guardando…",
      createInternet: "Crear conexión",
      createFirewall: "Crear firewall",
      createRouter: "Crear router",
      createServer: "Crear servidor",
      createStorage: "Crear almacenamiento",
      createComputer: "Crear ordenador",
      createEquipment: "Crear equipo",
      close: "Cerrar",
      thisEquipment: "este equipo",
      deleteInternetTitle: "¿Eliminar esta conexión?",
      deleteEquipmentTitle: "¿Eliminar este equipo?",
      deleteMessage: "¿Eliminar « {name} »? Acción irreversible.",
      toastAddedFirewall: "Firewall añadido",
      toastAdded: "Equipo añadido",
      toastUpdated: "Equipo actualizado",
      toastDeleted: "Equipo eliminado",
      toastSaveError: "Error al guardar",
      toastDeleteError: "Error al eliminar",
      toastLocalUpdateError: "Error de actualización local",
      errorAdd: "Error al añadir",
      errorUpdate: "Error al actualizar",
      errorDelete: "Error al eliminar"
    },
    validation: {
      nameRequired: "El nombre es obligatorio",
      brandRequired: "La marca es obligatoria",
      serverTypeRequired: "Tipo de servidor obligatorio",
      storageTypeRequired: "Tipo de almacenamiento obligatorio",
      toipTypeRequired: "Tipo de equipo obligatorio",
      internetTypeRequired: "Tipo de conexión obligatorio",
      providerRequired: "Proveedor obligatorio",
      ipRequired: "Introduzca IP o marque « IP no fija »",
      extraFieldRequired: "{field} es obligatorio"
    },
    sections: {
      identity: {
        label: "Identidad",
        description: "Nombre y ubicación"
      },
      hardware: {
        label: "Hardware",
        description: "Marca y modelo"
      },
      network: {
        label: "Red",
        description: "IP y VLAN"
      },
      system: {
        label: "Sistema",
        description: "SO y recursos"
      },
      storage: {
        label: "Almacenamiento",
        description: "RAID y capacidad"
      },
      management: {
        label: "Gestión",
        description: "Administración"
      },
      ha: {
        label: "Alta disponibilidad",
        description: "Clúster"
      },
      licences: {
        label: "Licencias",
        description: "Contratos"
      },
      remote: {
        label: "Acceso remoto",
        description: "iDRAC, iLO…"
      },
      wifi: {
        label: "WiFi",
        description: "SSIDs"
      },
      power: {
        label: "Alimentación",
        description: "Capacidad"
      },
      voip: {
        label: "Telefonía",
        description: "SIP"
      },
      notes: {
        label: "Notas",
        description: "Comentarios"
      },
      common: {
        label: "Facturación e instalación",
        description: "Compra, factura, instalación y garantía"
      },
      internetType: {
        label: "Tipo",
        description: "Tecnología"
      },
      internetLink: {
        label: "Enlace",
        description: "Proveedor"
      },
      internetNetwork: {
        label: "Red",
        description: "IP, DNS"
      },
      internetContract: {
        label: "Contrato",
        description: "Referencia"
      },
      internetNotes: {
        label: "Notas",
        description: "Info adicional"
      }
    },
    addEquipmentLegacy: {
      title: "Añadir equipo",
      stepCategory: "Categoría",
      stepClient: "Empresa",
      chooseCategory: "Elija categoría",
      chooseClient: "Elija empresa",
      cancel: "Cancelar",
      next: "Siguiente",
      close: "Cerrar"
    },
    confirm: {
      rmmRevoke: {
        title: "¿Revocar este agente?",
        message: "El agente RMM en « {name} » será revocado. Dejará de enviar datos a Veritas y desaparecerá de la lista de dispositivos.",
        confirm: "Revocar",
        untitledAgent: "Sin nombre"
      },
      purgeLogs: {
        title: "Purgar logs",
        messageFiltered: "¿Eliminar los {count} log(s) que coinciden con los filtros actuales? Acción irreversible.",
        messageAll: "¿Eliminar los {count} log(s) de este equipo? Acción irreversible.",
        confirm: "Purgar"
      },
      deleteDocument: {
        title: "¿Eliminar documento?",
        message: "¿Eliminar « {name} »?"
      }
    }
  }
};
const getBaseEquipmentModalsCopy = createLocaleGetter(EQUIPMENT_MODALS);
export function getEquipmentModalsCopy(locale) {
  return {
    ...getBaseEquipmentModalsCopy(locale),
    ...pickLocaleMessages(EQUIPMENT_FORM_FIELDS, locale),
    options: getEquipmentFormOptionsCopy(locale)
  };
}
function getLocalizedProfileStrings(moduleKey, options, locale) {
  const profiles = getFormFields(locale).profiles || {};
  if (moduleKey === "Firewalls") {
    const key = normalizeFirewallType(options.firewallType) || "materiel";
    return profiles.firewall?.[key] || null;
  }
  if (moduleKey === "Routeur") {
    const key = normalizeRouteurType(options.routeurType) || "Routeur";
    return profiles.router?.[key] || null;
  }
  if (moduleKey === "Serveurs") {
    const key = normalizeServerType(options.serverType) || "virtuel";
    return profiles.server?.[key] || null;
  }
  if (moduleKey === "Stockage") {
    const key = normalizeStorageType(options.storageType) || "nas";
    return profiles.storage?.[key] || null;
  }
  return null;
}
export function localizeFormSection(section, moduleKey, options, locale) {
  const copy = getEquipmentModalsCopy(locale);
  const sectionCopy = copy.sections?.[section.id];
  const moduleDesc = copy.moduleSectionDescriptions?.[moduleKey]?.[section.id];
  const profileStrings = getLocalizedProfileStrings(moduleKey, options, locale);
  let label = sectionCopy?.label ?? section.label;
  let description = moduleDesc ?? sectionCopy?.description ?? section.description;
  if (profileStrings) {
    if (section.id === "hardware") {
      if (profileStrings.hardwareLabel) label = profileStrings.hardwareLabel;
      if (profileStrings.hardwareDescription) description = profileStrings.hardwareDescription;
    }
    if (section.id === "system") {
      if (profileStrings.systemLabel) label = profileStrings.systemLabel;
      if (profileStrings.systemDescription) description = profileStrings.systemDescription;
    }
  }
  return {
    ...section,
    label,
    description
  };
}
export function localizeTypeOptions(options, locale, groupKey) {
  const typeOptions = getFormFields(locale).typeOptions?.[groupKey] || {};
  return options.map(opt => ({
    ...opt,
    label: typeOptions[opt.value]?.label ?? opt.label,
    description: typeOptions[opt.value]?.description ?? opt.description
  }));
}
export function getLocalizedEquipmentNamePlaceholder(formCopy, apiType, {
  routeurType,
  serverType,
  storageType
} = {}) {
  const fields = formCopy?.fields || {};
  const namePlaceholders = formCopy?.namePlaceholders || {};
  if (apiType === "Routeur" && normalizeRouteurType(routeurType) === "SD-WAN") {
    return fields.namePlaceholderSdwan || "SDWAN-Siège";
  }
  if (apiType === "Serveurs") {
    const key = normalizeServerType(serverType) || "virtuel";
    return formCopy?.profiles?.server?.[key]?.namePlaceholder || namePlaceholders.Serveurs || fields.defaultEquipmentName;
  }
  if (apiType === "NAS") {
    const key = normalizeStorageType(storageType) || "nas";
    return formCopy?.profiles?.storage?.[key]?.namePlaceholder || namePlaceholders.NAS || fields.defaultEquipmentName;
  }
  return namePlaceholders[apiType] || fields.defaultEquipmentName;
}
export function getEquipmentModuleLabel(moduleKey, locale) {
  const labels = getEquipmentModalsCopy(locale).moduleLabels;
  return labels[moduleKey] || moduleKey;
}
export function getEquipmentModuleLabels(locale) {
  const labels = getEquipmentModalsCopy(locale).moduleLabels;
  return MODULE_KEYS.reduce((acc, key) => {
    acc[key] = labels[key] || key;
    return acc;
  }, {});
}
export function getEquipmentAddFlowSections(locale) {
  const t = getEquipmentModalsCopy(locale).addFlow;
  const icons = {
    category: "mdi:shape-outline",
    client: "mdi:office-building-outline"
  };
  return ["category", "client"].map(id => ({
    id,
    label: t.sections[id].label,
    description: t.sections[id].description,
    icon: icons[id]
  }));
}
export function getEquipmentFormSectionsI18n(moduleKey, locale, options = {}) {
  return getEquipmentFormSectionsBase(moduleKey, options).map(section => localizeFormSection(section, moduleKey, options, locale));
}
export function validateEquipmentFormI18n(form, moduleKey, locale, {
  setActiveSection,
  isAddMode
}) {
  const v = getEquipmentModalsCopy(locale).validation;
  if (isAddMode && !form?.name?.trim()) {
    setActiveSection("identity");
    return v.nameRequired;
  }
  if (moduleKey === "Firewalls" && isAddMode && !form?.manufacturer?.trim()) {
    setActiveSection("hardware");
    return v.brandRequired;
  }
  if (moduleKey === "Routeur" && isAddMode && !form?.manufacturer?.trim()) {
    setActiveSection("hardware");
    return v.brandRequired;
  }
  if (moduleKey === "Serveurs" && isAddMode && !form?.typeServer?.trim()) {
    setActiveSection("identity");
    return v.serverTypeRequired;
  }
  if (moduleKey === "Serveurs" && isAddMode && getServerFormProfile(form?.typeServer).showHardware && !form?.manufacturer?.trim()) {
    setActiveSection("hardware");
    return v.brandRequired;
  }
  if (moduleKey === "Stockage" && isAddMode && !form?.storageType?.trim()) {
    setActiveSection("identity");
    return v.storageTypeRequired;
  }
  if (moduleKey === "Stockage" && isAddMode && getStorageFormProfile(form?.storageType).showHardware && !form?.manufacturer?.trim()) {
    setActiveSection("hardware");
    return v.brandRequired;
  }
  if (moduleKey === "Switch" && isAddMode && !form?.manufacturer?.trim()) {
    setActiveSection("hardware");
    return v.brandRequired;
  }
  if (moduleKey === "BorneWifi" && isAddMode && !form?.manufacturer?.trim()) {
    setActiveSection("hardware");
    return v.brandRequired;
  }
  if (moduleKey === "Alimentation" && isAddMode && !form?.manufacturer?.trim()) {
    setActiveSection("hardware");
    return v.brandRequired;
  }
  if (moduleKey === "TOIP" && isAddMode && !form?.toipType?.trim()) {
    setActiveSection("identity");
    return v.toipTypeRequired;
  }
  if (moduleKey === "TOIP" && isAddMode && !form?.manufacturer?.trim()) {
    setActiveSection("hardware");
    return v.brandRequired;
  }
  if (moduleKey === "Internet") {
    if (!form?.internetType?.trim()) {
      setActiveSection("internetType");
      return v.internetTypeRequired;
    }
    if (!form?.fournisseur?.trim()) {
      setActiveSection("internetLink");
      return v.providerRequired;
    }
    if (!form?.ipNonFixe && !form?.ip?.trim()) {
      setActiveSection("internetNetwork");
      return v.ipRequired;
    }
  }
  const extraFields = Array.isArray(form?.__systemExtensionFields) ? form.__systemExtensionFields : [];
  for (const field of extraFields) {
    if (!field?.required || !field.fieldKey || field.fieldType === "boolean") continue;
    const value = form[field.fieldKey];
    if (value == null || String(value).trim() === "") {
      setActiveSection("extra");
      return interpolate(v.extraFieldRequired || "{field}", {
        field: field.label || field.fieldKey
      });
    }
  }
  return null;
}
export { EQUIPMENT_MODULE_ICONS, interpolate };
