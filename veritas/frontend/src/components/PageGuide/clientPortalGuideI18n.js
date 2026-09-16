import { pickLocaleMessages } from "../../i18n/translate";

const CLIENT_PORTAL_GUIDE_COPY = {
  fr: {
    tourTitle: "Découverte du portail",
    helpAria: "Présentation du portail client",
    intro: {
      title: "Bienvenue sur votre portail",
      content:
        "Ce guide vous présente le menu : tableau de bord, support, équipements, services et documents liés à votre contrat."
    },
    brand: {
      title: "Accueil",
      content: "Cliquez sur le logo Veritas pour revenir à tout moment à la vue d'ensemble."
    },
    context: {
      title: "Entreprise et site",
      content:
        "Choisissez l'entreprise active et, si besoin, filtrez par site pour n'afficher que les données concernées."
    },
    nav: {
      title: "Navigation",
      content:
        "Accédez au support, aux équipements, aux services, à la cybersécurité, au contrat, à la base de connaissances et à votre coffre-fort."
    },
    utilities: {
      title: "Préférences",
      content:
        "Basculez le thème clair/sombre, changez la langue, ou rouvrez ce guide via le bouton ?."
    },
    account: {
      title: "Votre compte",
      content: "Consultez votre profil et déconnectez-vous depuis votre avatar."
    }
  },
  en: {
    tourTitle: "Portal tour",
    helpAria: "Client portal tour",
    intro: {
      title: "Welcome to your portal",
      content:
        "This tour introduces the menu: dashboard, support, devices, services, and documents linked to your contract."
    },
    brand: {
      title: "Home",
      content: "Click the Veritas logo anytime to return to the overview."
    },
    context: {
      title: "Company and site",
      content:
        "Select the active company and, if needed, filter by site to show only relevant data."
    },
    nav: {
      title: "Navigation",
      content:
        "Open support, devices, services, cybersecurity, contract, knowledge base, and your vault."
    },
    utilities: {
      title: "Preferences",
      content: "Switch light/dark theme, change language, or reopen this tour with the ? button."
    },
    account: {
      title: "Your account",
      content: "View your profile and sign out from your avatar."
    }
  },
  de: {
    tourTitle: "Portal-Tour",
    helpAria: "Kundenportal-Tour",
    intro: {
      title: "Willkommen in Ihrem Portal",
      content:
        "Diese Führung zeigt das Menü: Dashboard, Support, Geräte, Services und Dokumente zu Ihrem Vertrag."
    },
    brand: {
      title: "Startseite",
      content: "Klicken Sie jederzeit auf das Veritas-Logo, um zur Übersicht zurückzukehren."
    },
    context: {
      title: "Unternehmen und Standort",
      content:
        "Wählen Sie das aktive Unternehmen und filtern Sie bei Bedarf nach Standort."
    },
    nav: {
      title: "Navigation",
      content:
        "Öffnen Sie Support, Geräte, Services, Cybersicherheit, Vertrag, Wissensdatenbank und Ihren Tresor."
    },
    utilities: {
      title: "Einstellungen",
      content:
        "Wechseln Sie Hell-/Dunkelmodus, Sprache, oder öffnen Sie diese Führung erneut über ?."
    },
    account: {
      title: "Ihr Konto",
      content: "Profil einsehen und abmelden über Ihren Avatar."
    }
  },
  it: {
    tourTitle: "Tour del portale",
    helpAria: "Presentazione del portale cliente",
    intro: {
      title: "Benvenuti nel vostro portale",
      content:
        "Questa guida presenta il menu: dashboard, supporto, dispositivi, servizi e documenti del contratto."
    },
    brand: {
      title: "Home",
      content: "Cliccate sul logo Veritas per tornare in qualsiasi momento alla panoramica."
    },
    context: {
      title: "Azienda e sito",
      content:
        "Selezionate l'azienda attiva e, se necessario, filtrate per sito."
    },
    nav: {
      title: "Navigazione",
      content:
        "Accedete a supporto, dispositivi, servizi, cybersicurezza, contratto, knowledge base e cassaforte."
    },
    utilities: {
      title: "Preferenze",
      content:
        "Cambiate tema chiaro/scuro, lingua, oppure riaprite questa guida con il pulsante ?."
    },
    account: {
      title: "Il vostro account",
      content: "Consultate il profilo e uscite dall'avatar."
    }
  },
  es: {
    tourTitle: "Recorrido del portal",
    helpAria: "Presentación del portal cliente",
    intro: {
      title: "Bienvenido a su portal",
      content:
        "Este recorrido presenta el menú: panel, soporte, equipos, servicios y documentos de su contrato."
    },
    brand: {
      title: "Inicio",
      content: "Haga clic en el logo Veritas para volver en cualquier momento a la vista general."
    },
    context: {
      title: "Empresa y sede",
      content:
        "Elija la empresa activa y, si es necesario, filtre por sede."
    },
    nav: {
      title: "Navegación",
      content:
        "Acceda al soporte, equipos, servicios, ciberseguridad, contrato, base de conocimientos y su caja fuerte."
    },
    utilities: {
      title: "Preferencias",
      content:
        "Cambie el tema claro/oscuro, el idioma, o reabra esta guía con el botón ?."
    },
    account: {
      title: "Su cuenta",
      content: "Consulte su perfil y cierre sesión desde su avatar."
    }
  }
};

export function getClientPortalGuideCopy(locale) {
  return pickLocaleMessages(CLIENT_PORTAL_GUIDE_COPY, locale);
}

export function buildClientPortalGuideSteps({ locale, showContext = false } = {}) {
  const copy = getClientPortalGuideCopy(locale);
  const steps = [
    {
      target: '[data-portal-guide="sidebar-root"]',
      title: copy.intro.title,
      content: copy.intro.content
    },
    {
      target: '[data-portal-guide="brand"]',
      title: copy.brand.title,
      content: copy.brand.content
    }
  ];
  if (showContext) {
    steps.push({
      target: '[data-portal-guide="context"]',
      title: copy.context.title,
      content: copy.context.content
    });
  }
  steps.push(
    {
      target: '[data-portal-guide="nav"]',
      title: copy.nav.title,
      content: copy.nav.content
    },
    {
      target: '[data-portal-guide="utilities"]',
      title: copy.utilities.title,
      content: copy.utilities.content
    },
    {
      target: '[data-portal-guide="account"]',
      title: copy.account.title,
      content: copy.account.content
    }
  );
  return {
    steps,
    tourTitle: copy.tourTitle,
    helpAria: copy.helpAria
  };
}
