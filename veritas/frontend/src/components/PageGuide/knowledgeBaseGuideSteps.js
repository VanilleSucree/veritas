import { pickLocaleMessages } from "../../i18n/translate";
import { mapGuideSteps } from "./mapGuideSteps";

const STEP_CONFIG = [{
  key: "hero",
  target: '[data-guide="kb-hero"]'
}, {
  key: "kpis",
  target: '[data-guide="kb-kpis"]'
}, {
  key: "folders",
  target: '[data-guide="kb-folders"]'
}, {
  key: "toolbar",
  target: '[data-guide="kb-toolbar"]'
}, {
  key: "list",
  target: '[data-guide="kb-list"]'
}];

const COPY = {
  fr: {
    tourTitle: "Base de connaissances",
    steps: {
      hero: {
        title: "Articles internes et portail",
        content: "Rédigez des procédures pour les agents et, si besoin, partagez-les sur le portail client. Créez un article depuis le bouton du bandeau."
      },
      kpis: {
        title: "Compteurs",
        content: "Suivez le volume total, les brouillons encore à publier et les articles déjà en ligne."
      },
      folders: {
        title: "Navigation",
        content: "Accueil, recherche et brouillons en un clic. Sous Collections, parcourez l’arborescence et ouvrez un article directement depuis le menu."
      },
      toolbar: {
        title: "Recherche et filtres",
        content: "Cherchez un titre, affichez tous / brouillons / publiés, et filtrez par catégorie."
      },
      list: {
        title: "Liste des articles",
        content: "Ouvrez un article pour le lire ou l’éditer. Cochez plusieurs cartes pour déplacer ou supprimer en lot."
      }
    }
  },
  en: {
    tourTitle: "Knowledge base",
    steps: {
      hero: {
        title: "Internal articles and portal",
        content: "Write procedures for agents and, if needed, share them on the client portal. Create an article from the header button."
      },
      kpis: {
        title: "Counters",
        content: "Track the total volume, drafts still to publish and articles already live."
      },
      folders: {
        title: "Navigation",
        content: "Home, search and drafts in one click. Under Collections, browse the tree and open an article directly from the menu."
      },
      toolbar: {
        title: "Search and filters",
        content: "Search a title, show all / drafts / published, and filter by category."
      },
      list: {
        title: "Article list",
        content: "Open an article to read or edit it. Select several cards to move or delete in bulk."
      }
    }
  },
  de: {
    tourTitle: "Wissensdatenbank",
    steps: {
      hero: {
        title: "Interne Artikel und Portal",
        content: "Schreiben Sie Verfahren für Agenten und teilen Sie sie bei Bedarf im Kundenportal. Ein Artikel entsteht über die Kopfschaltfläche."
      },
      kpis: {
        title: "Zähler",
        content: "Gesamtzahl, Entwürfe und bereits veröffentlichte Artikel im Blick."
      },
      folders: {
        title: "Ordner",
        content: "Organisieren Sie die Basis als Baum. Ein Ordner filtert die Liste; je nach Recht können Sie Ordner anlegen, umbenennen oder teilen."
      },
      toolbar: {
        title: "Suche und Filter",
        content: "Suchen Sie einen Titel, zeigen Sie alle / Entwürfe / veröffentlichte und filtern Sie nach Kategorie."
      },
      list: {
        title: "Artikelliste",
        content: "Öffnen Sie einen Artikel zum Lesen oder Bearbeiten. Mehrere Karten für Verschieben oder Löschen markieren."
      }
    }
  },
  it: {
    tourTitle: "Knowledge base",
    steps: {
      hero: {
        title: "Articoli interni e portale",
        content: "Redigete procedure per gli agenti e, se serve, condividetele sul portale cliente. Create un articolo dal pulsante in intestazione."
      },
      kpis: {
        title: "Contatori",
        content: "Seguite il volume totale, le bozze da pubblicare e gli articoli già online."
      },
      folders: {
        title: "Cartelle",
        content: "Organizzate la base ad albero. Selezionate una cartella per filtrare, oppure create / rinominate / condividete una cartella."
      },
      toolbar: {
        title: "Ricerca e filtri",
        content: "Cercate un titolo, mostrate tutti / bozze / pubblicati e filtrate per categoria."
      },
      list: {
        title: "Elenco articoli",
        content: "Aprite un articolo per leggerlo o modificarlo. Selezionate più schede per spostare o eliminare in blocco."
      }
    }
  },
  es: {
    tourTitle: "Base de conocimientos",
    steps: {
      hero: {
        title: "Artículos internos y portal",
        content: "Redacte procedimientos para los agentes y, si hace falta, compártalos en el portal cliente. Cree un artículo desde el botón del encabezado."
      },
      kpis: {
        title: "Contadores",
        content: "Siga el volumen total, los borradores por publicar y los artículos ya en línea."
      },
      folders: {
        title: "Carpetas",
        content: "Organice la base en árbol. Seleccione una carpeta para filtrar, o cree / renombre / comparta una carpeta."
      },
      toolbar: {
        title: "Búsqueda y filtros",
        content: "Busque un título, muestre todos / borradores / publicados y filtre por categoría."
      },
      list: {
        title: "Lista de artículos",
        content: "Abra un artículo para leerlo o editarlo. Seleccione varias tarjetas para mover o eliminar en lote."
      }
    }
  }
};

export function getKnowledgeBaseGuide(locale = "fr", handlers = {}) {
  const copy = pickLocaleMessages(COPY, locale);
  return {
    tourTitle: copy.tourTitle,
    steps: mapGuideSteps(STEP_CONFIG, copy.steps, handlers)
  };
}
