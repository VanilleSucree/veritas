import { interpolate, pickLocaleMessages } from "../../i18n/translate";
const SECTION_IDS = ["identity", "coordinates", "enterprise", "status"];
const CIVILITY_ICONS = {
  monsieur: "mdi:account-tie-outline",
  madame: "mdi:account-outline"
};
const COMM_ICONS = {
  email: "mdi:email-outline",
  telephone: "mdi:phone-outline"
};
const SHARED_FORM_KEYS = {
  eyebrow: "",
  firstNamePlaceholder: "",
  lastNamePlaceholder: "",
  enterpriseLabel: "",
  companiesLabel: "",
  addCompany: "",
  primaryForCompany: "",
  sitesLabel: "",
  sitesHint: "",
  primaryForSite: "",
  noSitesForCompany: "",
  selectCompany: "",
  removeCompanyAria: "",
  enterpriseLockedHint: "",
  enterprisePendingName: "",
  enterpriseHint: "",
  currentClient: "",
  statusInactiveHint: "",
  civilityOptions: {
    monsieur: "",
    madame: ""
  },
  communications: {
    groupEmails: "",
    groupPhones: "",
    emptyHint: "",
    addLabel: "",
    favoriteTitle: "",
    setFavorite: "",
    removeAria: "",
    types: {
      email: {
        label: "",
        placeholder: ""
      },
      telephone: {
        label: "",
        placeholder: ""
      }
    },
    validation: {
      phoneRequired: "",
      emailRequired: "",
      genericRequired: "",
      invalidEmail: ""
    }
  }
};
const CONTACT_FORM_COPY = {
  fr: {
    ...SHARED_FORM_KEYS,
    createTitle: "Nouveau contact",
    editTitle: "Modifier le contact",
    createSubtitle: "Renseignez les informations du contact.",
    editSubtitle: "Mettez à jour les informations du contact.",
    navAria: "Sections du formulaire",
    eyebrow: "Fiche contact",
    sections: {
      identity: {
        label: "Identité",
        description: "Civilité, prénom et nom du contact"
      },
      coordinates: {
        label: "Coordonnées",
        description: "E-mails, téléphones et moyens de communication"
      },
      enterprise: {
        label: "Entreprises",
        description: "Entreprises rattachées et fonction"
      },
      status: {
        label: "Statut",
        description: "Disponibilité et visibilité du contact"
      }
    },
    clientPrefix: "Client #",
    searchEnterprise: "Rechercher une entreprise…",
    noEnterprise: "Aucune entreprise trouvée",
    posteLabel: "Fonction",
    postePlaceholder: "Directeur, Responsable IT",
    statutActive: "Actif",
    statutInactive: "Inactif",
    save: "Enregistrer",
    saving: "Enregistrement…",
    cancel: "Annuler",
    close: "Fermer",
    successCreate: "Contact créé",
    successUpdate: "Contact mis à jour",
    errorSave: "Erreur lors de l'enregistrement",
    unsavedTitle: "Modifications non enregistrées",
    unsavedMessage: "Des changements n'ont pas été enregistrés. Quitter quand même ?",
    leave: "Quitter",
    stay: "Rester",
    validation: {
      nameRequired: "Le nom est obligatoire",
      enterpriseRequired: "L'entreprise est obligatoire"
    },
    portalEmailSuccess: "Contact modifié. Le compte portail utilisera l'e-mail favori.",
    draftPrimaryTitle: "Contact principal",
    draftPrimarySubtitle: "Définissez l'interlocuteur principal rattaché à cette entreprise.",
    footerUnsaved: "Modifications non enregistrées",
    footerNoChanges: "Aucune modification",
    createContact: "Créer le contact",
    validateContact: "Valider le contact",
    civility: "Civilité",
    firstName: "Prénom",
    lastName: "Nom",
    firstNamePlaceholder: "Jean",
    lastNamePlaceholder: "Dupont",
    enterpriseLabel: "Entreprise",
    companiesLabel: "Entreprises",
    addCompany: "Ajouter une entreprise",
    primaryForCompany: "Principal pour cette entreprise",
    sitesLabel: "Lieux rattachés",
    sitesHint: "Sélectionnez un ou plusieurs lieux de l'entreprise. Vous pouvez aussi désigner le contact principal d'un lieu.",
    primaryForSite: "Principal pour ce lieu",
    noSitesForCompany: "Aucun lieu défini pour cette entreprise.",
    selectCompany: "Sélectionner une entreprise",
    removeCompanyAria: "Retirer {name}",
    enterpriseLockedHint: "Ce contact sera rattaché à la fiche client en cours.",
    enterprisePendingName: "Entreprise en cours de création",
    enterpriseHint: "Associez le contact à une ou plusieurs entreprises clientes pour faciliter la navigation et le partage de fiches.",
    currentClient: "Client actuel",
    statusInactiveHint: "Les contacts inactifs restent consultables mais sont exclus des compteurs dans Veritas.",
    civilityOptions: {
      monsieur: "Monsieur",
      madame: "Madame"
    },
    notSpecified: "Non renseigné",
    communications: {
      groupEmails: "E-mails",
      groupPhones: "Téléphones",
      emptyHint: "Aucun moyen de communication. Choisissez un type ci-dessous pour commencer.",
      addLabel: "Ajouter un moyen de communication",
      favoriteTitle: "Communication favorite",
      setFavorite: "Définir comme favori",
      removeAria: "Supprimer {label}",
      types: {
        email: {
          label: "E-mail",
          placeholder: "jean.dupont@entreprise.fr"
        },
        telephone: {
          label: "Téléphone",
          placeholder: "06 12 34 56 78"
        }
      },
      validation: {
        phoneRequired: "Renseignez le numéro de téléphone ajouté ou supprimez-le.",
        emailRequired: "Renseignez l'adresse e-mail ajoutée ou supprimez-la.",
        genericRequired: "Renseignez le moyen de communication ajouté ou supprimez-le.",
        invalidEmail: "L'adresse e-mail n'est pas valide"
      }
    }
  },
  en: {
    ...SHARED_FORM_KEYS,
    createTitle: "New contact",
    editTitle: "Edit contact",
    createSubtitle: "Enter the contact information.",
    editSubtitle: "Update the contact information.",
    navAria: "Form sections",
    eyebrow: "Contact record",
    sections: {
      identity: {
        label: "Identity",
        description: "Title, first and last name"
      },
      coordinates: {
        label: "Contact details",
        description: "Emails, phones and communication channels"
      },
      enterprise: {
        label: "Companies",
        description: "Linked companies and job title"
      },
      status: {
        label: "Status",
        description: "Availability and visibility"
      }
    },
    clientPrefix: "Client #",
    searchEnterprise: "Search for a company…",
    noEnterprise: "No company found",
    posteLabel: "Job title",
    postePlaceholder: "Director, IT Manager",
    statutActive: "Active",
    statutInactive: "Inactive",
    save: "Save",
    saving: "Saving…",
    cancel: "Cancel",
    close: "Close",
    successCreate: "Contact created",
    successUpdate: "Contact updated",
    errorSave: "Error saving contact",
    unsavedTitle: "Unsaved changes",
    unsavedMessage: "Changes have not been saved. Leave anyway?",
    leave: "Leave",
    stay: "Stay",
    validation: {
      nameRequired: "Last name is required",
      enterpriseRequired: "Company is required"
    },
    portalEmailSuccess: "Contact updated. The portal account will use the preferred email.",
    draftPrimaryTitle: "Primary contact",
    draftPrimarySubtitle: "Set the main contact linked to this company.",
    footerUnsaved: "Unsaved changes",
    footerNoChanges: "No changes",
    createContact: "Create contact",
    validateContact: "Validate contact",
    civility: "Title",
    firstName: "First name",
    lastName: "Last name",
    firstNamePlaceholder: "John",
    lastNamePlaceholder: "Smith",
    enterpriseLabel: "Company",
    companiesLabel: "Companies",
    addCompany: "Add company",
    primaryForCompany: "Primary for this company",
    sitesLabel: "Linked sites",
    sitesHint: "Select one or more company sites. You can also mark the contact as primary for a site.",
    primaryForSite: "Primary for this site",
    noSitesForCompany: "No sites defined for this company.",
    selectCompany: "Select company",
    removeCompanyAria: "Remove {name}",
    enterpriseLockedHint: "This contact will be linked to the current client record.",
    enterprisePendingName: "Company being created",
    enterpriseHint: "Link the contact to one or more client companies to simplify navigation and record sharing.",
    currentClient: "Current client",
    statusInactiveHint: "Inactive contacts remain viewable but are excluded from Veritas counters.",
    civilityOptions: {
      monsieur: "Mr",
      madame: "Ms"
    },
    notSpecified: "Not specified",
    communications: {
      groupEmails: "Emails",
      groupPhones: "Phones",
      emptyHint: "No communication method. Choose a type below to get started.",
      addLabel: "Add a communication method",
      favoriteTitle: "Preferred communication",
      setFavorite: "Set as preferred",
      removeAria: "Remove {label}",
      types: {
        email: {
          label: "Email",
          placeholder: "john.smith@company.com"
        },
        telephone: {
          label: "Phone",
          placeholder: "+1 555 123 4567"
        }
      },
      validation: {
        phoneRequired: "Enter the phone number or remove it.",
        emailRequired: "Enter the email address or remove it.",
        genericRequired: "Complete the communication entry or remove it.",
        invalidEmail: "The email address is not valid"
      }
    }
  },
  de: {
    ...SHARED_FORM_KEYS,
    createTitle: "Neuer Kontakt",
    editTitle: "Kontakt bearbeiten",
    createSubtitle: "Kontaktinformationen eingeben.",
    editSubtitle: "Kontaktinformationen aktualisieren.",
    navAria: "Formularabschnitte",
    eyebrow: "Kontaktdatensatz",
    sections: {
      identity: {
        label: "Identität",
        description: "Anrede, Vor- und Nachname"
      },
      coordinates: {
        label: "Kontaktdaten",
        description: "E-Mails, Telefone und Kommunikationswege"
      },
      enterprise: {
        label: "Unternehmen",
        description: "Verknüpftes Unternehmen und Funktion"
      },
      status: {
        label: "Status",
        description: "Verfügbarkeit und Sichtbarkeit"
      }
    },
    clientPrefix: "Kunde #",
    searchEnterprise: "Unternehmen suchen…",
    noEnterprise: "Kein Unternehmen gefunden",
    posteLabel: "Funktion",
    postePlaceholder: "Leiter, IT-Verantwortlicher",
    statutActive: "Aktiv",
    statutInactive: "Inaktiv",
    save: "Speichern",
    saving: "Speichern…",
    cancel: "Abbrechen",
    close: "Schließen",
    successCreate: "Kontakt erstellt",
    successUpdate: "Kontakt aktualisiert",
    errorSave: "Fehler beim Speichern",
    unsavedTitle: "Nicht gespeicherte Änderungen",
    unsavedMessage: "Änderungen wurden nicht gespeichert. Trotzdem verlassen?",
    leave: "Verlassen",
    stay: "Bleiben",
    validation: {
      nameRequired: "Nachname ist erforderlich",
      enterpriseRequired: "Unternehmen ist erforderlich"
    },
    portalEmailSuccess: "Kontakt aktualisiert. Das Portal-Konto verwendet die bevorzugte E-Mail.",
    draftPrimaryTitle: "Hauptkontakt",
    draftPrimarySubtitle: "Legen Sie den Hauptansprechpartner für dieses Unternehmen fest.",
    footerUnsaved: "Nicht gespeicherte Änderungen",
    footerNoChanges: "Keine Änderungen",
    createContact: "Kontakt erstellen",
    validateContact: "Kontakt bestätigen",
    civility: "Anrede",
    firstName: "Vorname",
    lastName: "Nachname",
    firstNamePlaceholder: "Max",
    lastNamePlaceholder: "Mustermann",
    enterpriseLabel: "Unternehmen",
    companiesLabel: "Unternehmen",
    addCompany: "Unternehmen hinzufügen",
    primaryForCompany: "Hauptkontakt für dieses Unternehmen",
    sitesLabel: "Verknüpfte Standorte",
    sitesHint: "Wählen Sie einen oder mehrere Standorte. Sie können auch den Hauptkontakt eines Standorts festlegen.",
    primaryForSite: "Hauptkontakt für diesen Standort",
    noSitesForCompany: "Keine Standorte für dieses Unternehmen definiert.",
    enterpriseLockedHint: "Dieser Kontakt wird mit dem aktuellen Kundendatensatz verknüpft.",
    enterprisePendingName: "Unternehmen wird angelegt",
    enterpriseHint: "Verknüpfen Sie den Kontakt mit einem Kundenunternehmen für einfachere Navigation.",
    currentClient: "Aktueller Kunde",
    statusInactiveHint: "Inaktive Kontakte bleiben sichtbar, zählen aber nicht in Veritas-Zählern.",
    civilityOptions: {
      monsieur: "Herr",
      madame: "Frau"
    },
    notSpecified: "Nicht angegeben",
    communications: {
      groupEmails: "E-Mails",
      groupPhones: "Telefone",
      emptyHint: "Kein Kommunikationsweg. Wählen Sie unten einen Typ.",
      addLabel: "Kommunikationsweg hinzufügen",
      favoriteTitle: "Bevorzugte Kommunikation",
      setFavorite: "Als bevorzugt festlegen",
      removeAria: "{label} entfernen",
      types: {
        email: {
          label: "E-Mail",
          placeholder: "max.mustermann@firma.de"
        },
        telephone: {
          label: "Telefon",
          placeholder: "+49 170 1234567"
        }
      },
      validation: {
        phoneRequired: "Telefonnummer eingeben oder Eintrag entfernen.",
        emailRequired: "E-Mail-Adresse eingeben oder Eintrag entfernen.",
        genericRequired: "Kommunikationseintrag ausfüllen oder entfernen.",
        invalidEmail: "Die E-Mail-Adresse ist ungültig"
      }
    }
  },
  it: {
    ...SHARED_FORM_KEYS,
    createTitle: "Nuovo contatto",
    editTitle: "Modifica contatto",
    createSubtitle: "Inserisci le informazioni del contatto.",
    editSubtitle: "Aggiorna le informazioni del contatto.",
    navAria: "Sezioni del modulo",
    eyebrow: "Scheda contatto",
    sections: {
      identity: {
        label: "Identità",
        description: "Titolo, nome e cognome"
      },
      coordinates: {
        label: "Contatti",
        description: "Email, telefoni e canali di comunicazione"
      },
      enterprise: {
        label: "Azienda",
        description: "Azienda collegata e ruolo"
      },
      status: {
        label: "Stato",
        description: "Disponibilità e visibilità"
      }
    },
    clientPrefix: "Cliente #",
    searchEnterprise: "Cerca un'azienda…",
    noEnterprise: "Nessuna azienda trovata",
    posteLabel: "Ruolo",
    postePlaceholder: "Direttore, Responsabile IT",
    statutActive: "Attivo",
    statutInactive: "Inattivo",
    save: "Salva",
    saving: "Salvataggio…",
    cancel: "Annulla",
    close: "Chiudi",
    successCreate: "Contatto creato",
    successUpdate: "Contatto aggiornato",
    errorSave: "Errore durante il salvataggio",
    unsavedTitle: "Modifiche non salvate",
    unsavedMessage: "Le modifiche non sono state salvate. Uscire comunque?",
    leave: "Esci",
    stay: "Resta",
    validation: {
      nameRequired: "Il cognome è obbligatorio",
      enterpriseRequired: "L'azienda è obbligatoria"
    },
    portalEmailSuccess: "Contatto aggiornato. L'account portale userà l'email preferita.",
    draftPrimaryTitle: "Contatto principale",
    draftPrimarySubtitle: "Imposta l'interlocutore principale collegato a questa azienda.",
    footerUnsaved: "Modifiche non salvate",
    footerNoChanges: "Nessuna modifica",
    createContact: "Crea contatto",
    validateContact: "Convalida contatto",
    civility: "Titolo",
    firstName: "Nome",
    lastName: "Cognome",
    firstNamePlaceholder: "Mario",
    lastNamePlaceholder: "Rossi",
    enterpriseLabel: "Azienda",
    companiesLabel: "Aziende",
    addCompany: "Aggiungi un'azienda",
    primaryForCompany: "Principale per questa azienda",
    sitesLabel: "Sedi collegate",
    sitesHint: "Seleziona una o più sedi dell'azienda. Puoi anche impostare il contatto principale di una sede.",
    primaryForSite: "Principale per questa sede",
    noSitesForCompany: "Nessuna sede definita per questa azienda.",
    enterpriseLockedHint: "Questo contatto sarà collegato alla scheda cliente corrente.",
    enterprisePendingName: "Azienda in creazione",
    enterpriseHint: "Collega il contatto a un'azienda cliente per semplificare navigazione e condivisione.",
    currentClient: "Cliente attuale",
    statusInactiveHint: "I contatti inattivi restano consultabili ma sono esclusi dai contatori Veritas.",
    civilityOptions: {
      monsieur: "Sig.",
      madame: "Sig.ra"
    },
    notSpecified: "Non specificato",
    communications: {
      groupEmails: "Email",
      groupPhones: "Telefoni",
      emptyHint: "Nessun mezzo di comunicazione. Scegli un tipo qui sotto.",
      addLabel: "Aggiungi un mezzo di comunicazione",
      favoriteTitle: "Comunicazione preferita",
      setFavorite: "Imposta come preferita",
      removeAria: "Rimuovi {label}",
      types: {
        email: {
          label: "Email",
          placeholder: "mario.rossi@azienda.it"
        },
        telephone: {
          label: "Telefono",
          placeholder: "+39 333 1234567"
        }
      },
      validation: {
        phoneRequired: "Inserisci il numero di telefono o rimuovilo.",
        emailRequired: "Inserisci l'indirizzo email o rimuovilo.",
        genericRequired: "Completa il mezzo di comunicazione o rimuovilo.",
        invalidEmail: "L'indirizzo email non è valido"
      }
    }
  },
  es: {
    ...SHARED_FORM_KEYS,
    createTitle: "Nuevo contacto",
    editTitle: "Editar contacto",
    createSubtitle: "Introduce la información del contacto.",
    editSubtitle: "Actualiza la información del contacto.",
    navAria: "Secciones del formulario",
    eyebrow: "Ficha de contacto",
    sections: {
      identity: {
        label: "Identidad",
        description: "Tratamiento, nombre y apellidos"
      },
      coordinates: {
        label: "Datos de contacto",
        description: "Emails, teléfonos y medios de comunicación"
      },
      enterprise: {
        label: "Empresa",
        description: "Empresa vinculada y puesto"
      },
      status: {
        label: "Estado",
        description: "Disponibilidad y visibilidad"
      }
    },
    clientPrefix: "Cliente #",
    searchEnterprise: "Buscar una empresa…",
    noEnterprise: "Ninguna empresa encontrada",
    posteLabel: "Puesto",
    postePlaceholder: "Director, Responsable IT",
    statutActive: "Activo",
    statutInactive: "Inactivo",
    save: "Guardar",
    saving: "Guardando…",
    cancel: "Cancelar",
    close: "Cerrar",
    successCreate: "Contacto creado",
    successUpdate: "Contacto actualizado",
    errorSave: "Error al guardar",
    unsavedTitle: "Cambios sin guardar",
    unsavedMessage: "Los cambios no se han guardado. ¿Salir de todos modos?",
    leave: "Salir",
    stay: "Quedarse",
    validation: {
      nameRequired: "El apellido es obligatorio",
      enterpriseRequired: "La empresa es obligatoria"
    },
    portalEmailSuccess: "Contacto actualizado. La cuenta del portal usará el email preferido.",
    draftPrimaryTitle: "Contacto principal",
    draftPrimarySubtitle: "Defina el interlocutor principal vinculado a esta empresa.",
    footerUnsaved: "Cambios sin guardar",
    footerNoChanges: "Sin cambios",
    createContact: "Crear contacto",
    validateContact: "Validar contacto",
    civility: "Tratamiento",
    firstName: "Nombre",
    lastName: "Apellidos",
    firstNamePlaceholder: "Juan",
    lastNamePlaceholder: "García",
    enterpriseLabel: "Empresa",
    companiesLabel: "Empresas",
    addCompany: "Añadir una empresa",
    primaryForCompany: "Principal para esta empresa",
    sitesLabel: "Lugares vinculados",
    sitesHint: "Seleccione uno o varios lugares de la empresa. También puede marcar el contacto principal de un lugar.",
    primaryForSite: "Principal para este lugar",
    noSitesForCompany: "No hay lugares definidos para esta empresa.",
    enterpriseLockedHint: "Este contacto se vinculará a la ficha de cliente actual.",
    enterprisePendingName: "Empresa en creación",
    enterpriseHint: "Vincule el contacto a una empresa cliente para facilitar la navegación y el intercambio.",
    currentClient: "Cliente actual",
    statusInactiveHint: "Los contactos inactivos siguen siendo consultables pero se excluyen de los contadores.",
    civilityOptions: {
      monsieur: "Sr.",
      madame: "Sra."
    },
    notSpecified: "No especificado",
    communications: {
      groupEmails: "Emails",
      groupPhones: "Teléfonos",
      emptyHint: "Ningún medio de comunicación. Elija un tipo abajo.",
      addLabel: "Añadir un medio de comunicación",
      favoriteTitle: "Comunicación preferida",
      setFavorite: "Definir como preferida",
      removeAria: "Eliminar {label}",
      types: {
        email: {
          label: "Email",
          placeholder: "juan.garcia@empresa.es"
        },
        telephone: {
          label: "Teléfono",
          placeholder: "+34 612 345 678"
        }
      },
      validation: {
        phoneRequired: "Introduzca el teléfono o elimínelo.",
        emailRequired: "Introduzca el email o elimínelo.",
        genericRequired: "Complete el medio de comunicación o elimínelo.",
        invalidEmail: "La dirección de email no es válida"
      }
    }
  }
};
const SECTION_ICONS = {
  identity: "mdi:account-outline",
  coordinates: "mdi:card-account-mail-outline",
  enterprise: "mdi:domain",
  status: "mdi:toggle-switch-outline"
};
const COMM_INPUT_TYPES = {
  email: "email",
  telephone: "tel"
};
function getFormRoot(locale) {
  return pickLocaleMessages(CONTACT_FORM_COPY, locale);
}
export function getContactFormModalCopy(locale) {
  const t = getFormRoot(locale);
  return {
    ...t,
    sections: SECTION_IDS.map(id => ({
      id,
      label: t.sections[id].label,
      description: t.sections[id].description,
      icon: SECTION_ICONS[id]
    })),
    getClientLabel: (clientId, clientName) => {
      if (clientName) return clientName;
      return clientId ? `${t.clientPrefix}${clientId}` : "";
    },
    modalTitle: editing => editing ? t.editTitle : t.createTitle,
    modalSubtitle: editing => editing ? t.editSubtitle : t.createSubtitle,
    successMessage: editing => editing ? t.successUpdate : t.successCreate
  };
}
export function getContactFormSections(locale) {
  return getContactFormModalCopy(locale).sections;
}
export function getContactCivilityCards(locale) {
  const options = getFormRoot(locale).civilityOptions || {};
  return ["monsieur", "madame"].map(value => ({
    value,
    label: options[value] || value,
    icon: CIVILITY_ICONS[value]
  }));
}
export function getContactSexeLabelLocalized(value, locale) {
  const t = getFormRoot(locale);
  const key = String(value || "").toLowerCase();
  if (t.civilityOptions?.[key]) return t.civilityOptions[key];
  return t.notSpecified || "-";
}
export function getContactCommunicationTypes(locale) {
  const types = getFormRoot(locale).communications?.types || {};
  return ["email", "telephone"].map(id => ({
    id,
    label: types[id]?.label || id,
    icon: COMM_ICONS[id],
    inputType: COMM_INPUT_TYPES[id],
    placeholder: types[id]?.placeholder || ""
  }));
}
export function getCommunicationTypeDefLocalized(typeId, locale) {
  return getContactCommunicationTypes(locale).find(t => t.id === typeId) || getContactCommunicationTypes(locale)[0];
}
export function validateContactCommunicationsLocalized(entries, locale) {
  const validation = getFormRoot(locale).communications?.validation || {};
  const list = Array.isArray(entries) ? entries : [];
  for (const entry of list) {
    const value = String(entry?.value ?? "").trim();
    if (!value) {
      if (entry?.type === "telephone") return validation.phoneRequired;
      if (entry?.type === "email") return validation.emailRequired;
      return validation.genericRequired;
    }
    if (entry.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return validation.invalidEmail;
    }
  }
  return null;
}
export { interpolate };
