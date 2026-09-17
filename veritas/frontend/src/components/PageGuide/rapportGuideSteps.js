import { pickLocaleMessages } from "../../i18n/translate";
import { mapGuideSteps } from "./mapGuideSteps";

const STEP_CONFIG = [{
  key: "hero",
  target: '[data-guide="report-hero"]'
}, {
  key: "steps",
  target: '[data-guide="report-steps"]',
  handler: "showClient"
}, {
  key: "client",
  target: '[data-guide="report-client"]',
  handler: "showClient"
}, {
  key: "types",
  target: '[data-guide="report-types"]',
  handler: "showTypes"
}];

const COPY = {
  fr: {
    tourTitle: "Rapports",
    steps: {
      hero: {
        title: "Générer un rapport client",
        content: "Cette page crée un document professionnel : état de supervision, compte-rendu d’intervention ou cahier de recette."
      },
      steps: {
        title: "Deux étapes",
        content: "1) Choisissez l’entreprise. 2) Choisissez le type de rapport."
      },
      client: {
        title: "Entreprise",
        content: "Recherchez et cliquez sur le client. Vous passez ensuite directement au choix du type de rapport."
      },
      types: {
        title: "Type de rapport",
        content: "État de supervision, rapport d’intervention ou cahier de recette. Un clic lance l’assistant."
      }
    }
  },
  en: {
    tourTitle: "Reports",
    steps: {
      hero: {
        title: "Generate a client report",
        content: "This page builds a professional document: supervision status, intervention report or acceptance booklet."
      },
      steps: {
        title: "Two steps",
        content: "1) Pick the company. 2) Pick the report type."
      },
      client: {
        title: "Company",
        content: "Search and click the client. You then go straight to choosing the report type."
      },
      types: {
        title: "Report type",
        content: "Supervision status, intervention report or acceptance booklet. A click starts the wizard."
      }
    }
  },
  de: {
    tourTitle: "Berichte",
    steps: {
      hero: {
        title: "Kundenbericht erzeugen",
        content: "Diese Seite erstellt ein professionelles Dokument: Überwachungsstatus, Einsatzbericht oder Abnahmeheft."
      },
      steps: {
        title: "Zwei Schritte",
        content: "1) Unternehmen wählen. 2) Berichtstyp wählen. Die Fortschrittsleiste zeigt, wo Sie sind."
      },
      client: {
        title: "Unternehmen",
        content: "Suchen und wählen Sie den Kunden. Der Bericht wird an diese Akte angehängt."
      },
      types: {
        title: "Berichtstyp",
        content: "Überwachungsstatus, Einsatzbericht oder Abnahmeheft. Ein Klick startet den Assistenten."
      }
    }
  },
  it: {
    tourTitle: "Report",
    steps: {
      hero: {
        title: "Generare un report cliente",
        content: "Questa pagina crea un documento professionale: stato di supervisione, resoconto d’intervento o quaderno di collaudo."
      },
      steps: {
        title: "Due passaggi",
        content: "1) Scegliete l’azienda. 2) Scegliete il tipo di report. La barra indica a che punto siete."
      },
      client: {
        title: "Azienda",
        content: "Cercate e selezionate il cliente. Il report sarà collegato a quella scheda."
      },
      types: {
        title: "Tipo di report",
        content: "Stato di supervisione, report d’intervento o quaderno di collaudo. Un clic avvia la procedura guidata."
      }
    }
  },
  es: {
    tourTitle: "Informes",
    steps: {
      hero: {
        title: "Generar un informe de cliente",
        content: "Esta página crea un documento profesional: estado de supervisión, informe de intervención o cuaderno de receta."
      },
      steps: {
        title: "Dos pasos",
        content: "1) Elija la empresa. 2) Elija el tipo de informe. La barra indica en qué punto está."
      },
      client: {
        title: "Empresa",
        content: "Busque y seleccione el cliente. El informe se vinculará a esa ficha."
      },
      types: {
        title: "Tipo de informe",
        content: "Estado de supervisión, informe de intervención o cuaderno de receta. Un clic inicia el asistente."
      }
    }
  }
};

export function getRapportGuide(locale = "fr", handlers = {}) {
  const copy = pickLocaleMessages(COPY, locale);
  return {
    tourTitle: copy.tourTitle,
    steps: mapGuideSteps(STEP_CONFIG, copy.steps, handlers)
  };
}
