export const INTEGRATIONS_CATALOG_I18N = {
  "fr": {
    "categories": {
      "ai": "IA & copilote",
      "email-security": "Antispam & protection mail",
      "endpoint-security": "Antivirus, EDR & XDR",
      "cloud": "Cloud & identité",
      "dns": "DNS & domaines",
      "monitoring": "Monitoring & supervision",
      "email": "Notifications",
      "backup": "Sauvegarde"
    },
    "descriptions": {
      "ai": {
        "description": "Fournisseur LLM pour copilotes tickets, runbooks et briefings."
      },
      "checkmk": {
        "description": "Supervision des hôtes, services et rapports de monitoring."
      },
      "unifi": {
        "description": "Import Ubiquiti UniFi — switches, gateways et bornes Wi‑Fi depuis Site Manager."
      },
      "prtg": {
        "description": "Remontée des sondes et alertes PRTG Network Monitor."
      },
      "zabbix": {
        "description": "Synchronisation des hôtes et métriques Zabbix."
      },
      "datadog": {
        "description": "Observabilité infrastructure et APM."
      },
      "bitdefender": {
        "description": "Inventaire des entreprises et postes GravityZone."
      },
      "sentinelone": {
        "description": "EDR SentinelOne, agents et statuts de protection."
      },
      "crowdstrike": {
        "description": "EDR/XDR Falcon · postes, détections et réponse."
      },
      "sophos": {
        "description": "Antivirus, MDR et politiques Sophos Central."
      },
      "defender-endpoint": {
        "description": "EDR Microsoft · alertes, incidents et posture des postes."
      },
      "cortex-xdr": {
        "description": "XDR Palo Alto · corrélation et investigation."
      },
      "eset": {
        "description": "Antivirus et EDR ESET pour endpoints."
      },
      "trend-micro": {
        "description": "XDR Trend Micro et remontée des menaces."
      },
      "kaspersky": {
        "description": "Protection endpoint Kaspersky et console KSC."
      },
      "trellix": {
        "description": "ePO Trellix et statuts de protection endpoint."
      },
      "withsecure": {
        "description": "EDR WithSecure (ex-F-Secure) pour postes et serveurs."
      },
      "harfanglab": {
        "description": "EDR français · agents, alertes et investigation."
      },
      "malwarebytes": {
        "description": "Console Nebula et statuts de protection Malwarebytes."
      },
      "huntress": {
        "description": "EDR managé MSP · persistance, incidents et remédiation."
      },
      "mailinblack": {
        "description": "Protection mail antispam, anti-phishing et anti-malware · API partenaire module Protect."
      },
      "vade": {
        "description": "Filtrage cloud Vade · menaces avancées et phishing."
      },
      "proofpoint": {
        "description": "Protection email Proofpoint pour MSP."
      },
      "defender-office365": {
        "description": "Sécurité Exchange Online et Microsoft 365."
      },
      "hornetsecurity": {
        "description": "Suite de protection email et sauvegarde Hornetsecurity."
      },
      "spamtitan": {
        "description": "Filtrage antispam et anti-phishing TitanHQ."
      },
      "fortimail": {
        "description": "Passerelle email Fortinet · antispam et DLP."
      },
      "trend-email": {
        "description": "Protection messagerie Trend Micro."
      },
      "mimecast": {
        "description": "Sécurité email et continuité Mimecast."
      },
      "azure-ad": {
        "description": "Identité Microsoft 365 via Microsoft Graph · utilisateurs, MFA et applications Entra ID."
      },
      "google-workspace": {
        "description": "Comptes et services Google Workspace."
      },
      "teams": {
        "description": "Webhooks et alertes dans les canaux Teams."
      },
      "slack": {
        "description": "Notifications MSP vers les canaux Slack."
      },
      "whatsapp": {
        "description": "Réception des messages clients WhatsApp, création automatique de tickets support et réponses depuis Veritas."
      },
      "ovh": {
        "description": "Suivi des domaines et dates de renouvellement OVH."
      },
      "gandi": {
        "description": "Gestion des noms de domaine Gandi."
      },
      "cloudflare": {
        "description": "DNS, certificats et zones Cloudflare."
      },
      "ionos": {
        "description": "Registrar et hébergement IONOS (1&1)."
      },
      "godaddy": {
        "description": "Gestion des domaines GoDaddy."
      },
      "namecheap": {
        "description": "Registrar Namecheap et zones DNS."
      },
      "veeam": {
        "description": "Jobs de sauvegarde et statuts Veeam."
      },
      "hycu": {
        "description": "HYCU R-Cloud Hybrid — jobs de sauvegarde et statuts."
      },
      "acronis": {
        "description": "Plans de protection et alertes Acronis."
      }
    },
    "fieldLabels": {
      "ai": {
        "AI_PROVIDER": "Fournisseur",
        "AI_API_KEY": "Clé API",
        "AI_MODEL": "Modèle (optionnel)"
      },
      "checkmk": {
        "CHECKMK_API_URL": "URL API Checkmk",
        "CHECKMK_USERNAME": "Nom d'utilisateur",
        "CHECKMK_PASSWORD": "Mot de passe",
        "CHECKMK_SITE": "Site par défaut (optionnel)"
      },
      "hycu": {
        "HYCU_API_URL": "URL du contrôleur",
        "HYCU_API_KEY": "Clé API",
        "HYCU_USERNAME": "Nom d'utilisateur (secours)",
        "HYCU_PASSWORD": "Mot de passe (secours)",
        "HYCU_VERIFY_TLS": "Vérifier TLS"
      },
      "bitdefender": {
        "BITDEFENDER_API_URL": "URL API",
        "BITDEFENDER_API_KEY": "Clé API"
      },
      "mailinblack": {
        "MAILINBLACK_API_URL": "URL API Mailinblack",
        "MAILINBLACK_CLIENT_ID": "Client ID Mailinblack",
        "MAILINBLACK_API_KEY": "Auth key Mailinblack"
      },
      "whatsapp": {
        "WHATSAPP_PHONE_NUMBER_ID": "Phone Number ID (Meta)",
        "WHATSAPP_ACCESS_TOKEN": "Token d'accès permanent",
        "WHATSAPP_APP_SECRET": "Secret de l'application Meta",
        "WHATSAPP_VERIFY_TOKEN": "Token de vérification webhook",
        "WHATSAPP_BUSINESS_ACCOUNT_ID": "ID compte Business (optionnel)",
        "WHATSAPP_API_VERSION": "Version API Graph (ex. v21.0)"
      },
      "ovh": {
        "OVH_APPLICATION_KEY": "Application Key",
        "OVH_APPLICATION_SECRET": "Application Secret",
        "OVH_CONSUMER_KEY": "Consumer Key"
      }
    }
  },
  "en": {
    "categories": {
      "ai": "AI & copilote",
      "email-security": "Antispam & email protection",
      "endpoint-security": "Antivirus, EDR & XDR",
      "cloud": "Cloud & identity",
      "dns": "DNS & domains",
      "monitoring": "Monitoring & supervision",
      "email": "Notifications",
      "backup": "Backup"
    },
    "descriptions": {
      "ai": {
        "description": "LLM provider for ticket copilots, runbooks and briefings."
      },
      "checkmk": {
        "description": "Host, service and monitoring report supervision."
      },
      "unifi": {
        "description": "Ubiquiti UniFi Site Manager — import switches, gateways and Wi‑Fi APs."
      },
      "prtg": {
        "description": "PRTG Network Monitor sensor and alert reporting."
      },
      "zabbix": {
        "description": "Zabbix host and metrics synchronization."
      },
      "datadog": {
        "description": "Infrastructure observability and APM."
      },
      "bitdefender": {
        "description": "GravityZone company and endpoint inventory."
      },
      "sentinelone": {
        "description": "SentinelOne EDR, agents and protection status."
      },
      "crowdstrike": {
        "description": "Falcon EDR/XDR · endpoints, detections and response."
      },
      "sophos": {
        "description": "Sophos Central antivirus, MDR and policies."
      },
      "defender-endpoint": {
        "description": "Microsoft EDR · alerts, incidents and endpoint posture."
      },
      "cortex-xdr": {
        "description": "Palo Alto XDR · correlation and investigation."
      },
      "eset": {
        "description": "ESET antivirus and EDR for endpoints."
      },
      "trend-micro": {
        "description": "Trend Micro XDR and threat reporting."
      },
      "kaspersky": {
        "description": "Kaspersky endpoint protection and KSC console."
      },
      "trellix": {
        "description": "Trellix ePO and endpoint protection status."
      },
      "withsecure": {
        "description": "WithSecure EDR (ex-F-Secure) for endpoints and servers."
      },
      "harfanglab": {
        "description": "French EDR · agents, alerts and investigation."
      },
      "malwarebytes": {
        "description": "Malwarebytes Nebula console and protection status."
      },
      "huntress": {
        "description": "Managed MSP EDR · persistence, incidents and remediation."
      },
      "mailinblack": {
        "description": "Email protection antispam, anti-phishing and anti-malware · Protect module partner API."
      },
      "vade": {
        "description": "Vade cloud filtering · advanced threats and phishing."
      },
      "proofpoint": {
        "description": "Proofpoint email protection for MSPs."
      },
      "defender-office365": {
        "description": "Exchange Online and Microsoft 365 security."
      },
      "hornetsecurity": {
        "description": "Hornetsecurity email protection and backup suite."
      },
      "spamtitan": {
        "description": "TitanHQ antispam and anti-phishing filtering."
      },
      "fortimail": {
        "description": "Fortinet email gateway · antispam and DLP."
      },
      "trend-email": {
        "description": "Trend Micro messaging protection."
      },
      "mimecast": {
        "description": "Mimecast email security and continuity."
      },
      "azure-ad": {
        "description": "Microsoft 365 identity via Microsoft Graph · Entra ID users, MFA and applications."
      },
      "google-workspace": {
        "description": "Google Workspace accounts and services."
      },
      "teams": {
        "description": "Webhooks and alerts in Teams channels."
      },
      "slack": {
        "description": "MSP notifications to Slack channels."
      },
      "whatsapp": {
        "description": "WhatsApp Business message intake, automatic support ticket creation and replies from Veritas."
      },
      "ovh": {
        "description": "OVH domain tracking and renewal dates."
      },
      "gandi": {
        "description": "Gandi domain name management."
      },
      "cloudflare": {
        "description": "Cloudflare DNS, certificates and zones."
      },
      "ionos": {
        "description": "IONOS (1&1) registrar and hosting."
      },
      "godaddy": {
        "description": "GoDaddy domain management."
      },
      "namecheap": {
        "description": "Namecheap registrar and DNS zones."
      },
      "veeam": {
        "description": "Veeam backup jobs and status."
      },
      "hycu": {
        "description": "HYCU R-Cloud Hybrid — backup jobs and statuses."
      },
      "acronis": {
        "description": "Acronis protection plans and alerts."
      }
    },
    "fieldLabels": {
      "ai": {
        "AI_PROVIDER": "Provider",
        "AI_API_KEY": "API key",
        "AI_MODEL": "Model (optional)"
      },
      "checkmk": {
        "CHECKMK_API_URL": "Checkmk API URL",
        "CHECKMK_USERNAME": "Username",
        "CHECKMK_PASSWORD": "Password",
        "CHECKMK_SITE": "Default site (optional)"
      },
      "hycu": {
        "HYCU_API_URL": "Controller URL",
        "HYCU_API_KEY": "API key",
        "HYCU_USERNAME": "Username (fallback)",
        "HYCU_PASSWORD": "Password (fallback)",
        "HYCU_VERIFY_TLS": "Verify TLS"
      },
      "bitdefender": {
        "BITDEFENDER_API_URL": "API URL",
        "BITDEFENDER_API_KEY": "API key"
      },
      "mailinblack": {
        "MAILINBLACK_API_URL": "Mailinblack API URL",
        "MAILINBLACK_CLIENT_ID": "Mailinblack Client ID",
        "MAILINBLACK_API_KEY": "Mailinblack Auth key"
      },
      "whatsapp": {
        "WHATSAPP_PHONE_NUMBER_ID": "Phone Number ID (Meta)",
        "WHATSAPP_ACCESS_TOKEN": "Permanent access token",
        "WHATSAPP_APP_SECRET": "Meta application secret",
        "WHATSAPP_VERIFY_TOKEN": "Webhook verification token",
        "WHATSAPP_BUSINESS_ACCOUNT_ID": "Business account ID (optional)",
        "WHATSAPP_API_VERSION": "Graph API version (e.g. v21.0)"
      },
      "ovh": {
        "OVH_APPLICATION_KEY": "Application Key",
        "OVH_APPLICATION_SECRET": "Application Secret",
        "OVH_CONSUMER_KEY": "Consumer Key"
      }
    }
  },
  "de": {
    "categories": {
      "ai": "KI & Copilot",
      "email-security": "Antispam & E-Mail-Schutz",
      "endpoint-security": "Antivirus, EDR & XDR",
      "cloud": "Cloud & Identität",
      "dns": "DNS & Domains",
      "monitoring": "Monitoring & Überwachung",
      "email": "Notifications",
      "backup": "Backup"
    },
    "descriptions": {
      "ai": {
        "description": "LLM-Anbieter für Ticket-Copiloten, Runbooks und Briefings."
      },
      "checkmk": {
        "description": "Supervision des hôtes, services et rapports de monitoring."
      },
      "unifi": {
        "description": "Ubiquiti UniFi Site Manager — Import von Switches, Gateways und WLAN-APs."
      },
      "prtg": {
        "description": "Remontée des sondes et alertes PRTG Network Monitor."
      },
      "zabbix": {
        "description": "Synchronisation des hôtes et métriques Zabbix."
      },
      "datadog": {
        "description": "Observabilité infrastructure et APM."
      },
      "bitdefender": {
        "description": "Inventaire des entreprises et postes GravityZone."
      },
      "sentinelone": {
        "description": "EDR SentinelOne, agents et statuts de protection."
      },
      "crowdstrike": {
        "description": "EDR/XDR Falcon · postes, détections et réponse."
      },
      "sophos": {
        "description": "Antivirus, MDR et politiques Sophos Central."
      },
      "defender-endpoint": {
        "description": "EDR Microsoft · alertes, incidents et posture des postes."
      },
      "cortex-xdr": {
        "description": "XDR Palo Alto · corrélation et investigation."
      },
      "eset": {
        "description": "Antivirus et EDR ESET pour endpoints."
      },
      "trend-micro": {
        "description": "XDR Trend Micro et remontée des menaces."
      },
      "kaspersky": {
        "description": "Protection endpoint Kaspersky et console KSC."
      },
      "trellix": {
        "description": "ePO Trellix et statuts de protection endpoint."
      },
      "withsecure": {
        "description": "EDR WithSecure (ex-F-Secure) pour postes et serveurs."
      },
      "harfanglab": {
        "description": "EDR français · agents, alertes et investigation."
      },
      "malwarebytes": {
        "description": "Console Nebula et statuts de protection Malwarebytes."
      },
      "huntress": {
        "description": "EDR managé MSP · persistance, incidents et remédiation."
      },
      "mailinblack": {
        "description": "Protection mail antispam, anti-phishing et anti-malware · API partenaire module Protect."
      },
      "vade": {
        "description": "Filtrage cloud Vade · menaces avancées et phishing."
      },
      "proofpoint": {
        "description": "Protection email Proofpoint pour MSP."
      },
      "defender-office365": {
        "description": "Sécurité Exchange Online et Microsoft 365."
      },
      "hornetsecurity": {
        "description": "Suite de protection email et sauvegarde Hornetsecurity."
      },
      "spamtitan": {
        "description": "Filtrage antispam et anti-phishing TitanHQ."
      },
      "fortimail": {
        "description": "Passerelle email Fortinet · antispam et DLP."
      },
      "trend-email": {
        "description": "Protection messagerie Trend Micro."
      },
      "mimecast": {
        "description": "Sécurité email et continuité Mimecast."
      },
      "azure-ad": {
        "description": "Identité Microsoft 365 via Microsoft Graph · utilisateurs, MFA et applications Entra ID."
      },
      "google-workspace": {
        "description": "Comptes et services Google Workspace."
      },
      "teams": {
        "description": "Webhooks et alertes dans les canaux Teams."
      },
      "slack": {
        "description": "Notifications MSP vers les canaux Slack."
      },
      "whatsapp": {
        "description": "Réception des messages clients WhatsApp, création automatique de tickets support et réponses depuis Veritas."
      },
      "ovh": {
        "description": "Suivi des domaines et dates de renouvellement OVH."
      },
      "gandi": {
        "description": "Gestion des noms de domaine Gandi."
      },
      "cloudflare": {
        "description": "DNS, certificats et zones Cloudflare."
      },
      "ionos": {
        "description": "Registrar et hébergement IONOS (1&1)."
      },
      "godaddy": {
        "description": "Gestion des domaines GoDaddy."
      },
      "namecheap": {
        "description": "Registrar Namecheap et zones DNS."
      },
      "veeam": {
        "description": "Jobs de sauvegarde et statuts Veeam."
      },
      "hycu": {
        "description": "HYCU R-Cloud Hybrid — jobs de sauvegarde et statuts."
      },
      "acronis": {
        "description": "Plans de protection et alertes Acronis."
      }
    },
    "fieldLabels": {
      "ai": {
        "AI_PROVIDER": "Anbieter",
        "AI_API_KEY": "API-Schlüssel",
        "AI_MODEL": "Modell (optional)"
      },
      "checkmk": {
        "CHECKMK_API_URL": "Checkmk API URL",
        "CHECKMK_USERNAME": "Username",
        "CHECKMK_PASSWORD": "Password",
        "CHECKMK_SITE": "Default site (optional)"
      },
      "hycu": {
        "HYCU_API_URL": "Controller URL",
        "HYCU_API_KEY": "API key",
        "HYCU_USERNAME": "Username (fallback)",
        "HYCU_PASSWORD": "Password (fallback)",
        "HYCU_VERIFY_TLS": "Verify TLS"
      },
      "bitdefender": {
        "BITDEFENDER_API_URL": "API URL",
        "BITDEFENDER_API_KEY": "API key"
      },
      "mailinblack": {
        "MAILINBLACK_API_URL": "Mailinblack API URL",
        "MAILINBLACK_CLIENT_ID": "Mailinblack Client ID",
        "MAILINBLACK_API_KEY": "Mailinblack Auth key"
      },
      "whatsapp": {
        "WHATSAPP_PHONE_NUMBER_ID": "Phone Number ID (Meta)",
        "WHATSAPP_ACCESS_TOKEN": "Permanent access token",
        "WHATSAPP_APP_SECRET": "Meta application secret",
        "WHATSAPP_VERIFY_TOKEN": "Webhook verification token",
        "WHATSAPP_BUSINESS_ACCOUNT_ID": "Business account ID (optional)",
        "WHATSAPP_API_VERSION": "Graph API version (e.g. v21.0)"
      },
      "ovh": {
        "OVH_APPLICATION_KEY": "Application Key",
        "OVH_APPLICATION_SECRET": "Application Secret",
        "OVH_CONSUMER_KEY": "Consumer Key"
      }
    }
  },
  "it": {
    "categories": {
      "ai": "IA & copilota",
      "email-security": "Antispam & protezione email",
      "endpoint-security": "Antivirus, EDR & XDR",
      "cloud": "Cloud & identità",
      "dns": "DNS & domini",
      "monitoring": "Monitoraggio & supervisione",
      "email": "Notifiche",
      "backup": "Backup"
    },
    "descriptions": {
      "ai": {
        "description": "Provider LLM per copiloti ticket, runbook e briefing."
      },
      "checkmk": {
        "description": "Supervision des hôtes, services et rapports de monitoring."
      },
      "unifi": {
        "description": "Ubiquiti UniFi Site Manager — import di switch, gateway e AP Wi‑Fi."
      },
      "prtg": {
        "description": "Remontée des sondes et alertes PRTG Network Monitor."
      },
      "zabbix": {
        "description": "Synchronisation des hôtes et métriques Zabbix."
      },
      "datadog": {
        "description": "Observabilité infrastructure et APM."
      },
      "bitdefender": {
        "description": "Inventaire des entreprises et postes GravityZone."
      },
      "sentinelone": {
        "description": "EDR SentinelOne, agents et statuts de protection."
      },
      "crowdstrike": {
        "description": "EDR/XDR Falcon · postes, détections et réponse."
      },
      "sophos": {
        "description": "Antivirus, MDR et politiques Sophos Central."
      },
      "defender-endpoint": {
        "description": "EDR Microsoft · alertes, incidents et posture des postes."
      },
      "cortex-xdr": {
        "description": "XDR Palo Alto · corrélation et investigation."
      },
      "eset": {
        "description": "Antivirus et EDR ESET pour endpoints."
      },
      "trend-micro": {
        "description": "XDR Trend Micro et remontée des menaces."
      },
      "kaspersky": {
        "description": "Protection endpoint Kaspersky et console KSC."
      },
      "trellix": {
        "description": "ePO Trellix et statuts de protection endpoint."
      },
      "withsecure": {
        "description": "EDR WithSecure (ex-F-Secure) pour postes et serveurs."
      },
      "harfanglab": {
        "description": "EDR français · agents, alertes et investigation."
      },
      "malwarebytes": {
        "description": "Console Nebula et statuts de protection Malwarebytes."
      },
      "huntress": {
        "description": "EDR managé MSP · persistance, incidents et remédiation."
      },
      "mailinblack": {
        "description": "Protection mail antispam, anti-phishing et anti-malware · API partenaire module Protect."
      },
      "vade": {
        "description": "Filtrage cloud Vade · menaces avancées et phishing."
      },
      "proofpoint": {
        "description": "Protection email Proofpoint pour MSP."
      },
      "defender-office365": {
        "description": "Sécurité Exchange Online et Microsoft 365."
      },
      "hornetsecurity": {
        "description": "Suite de protection email et sauvegarde Hornetsecurity."
      },
      "spamtitan": {
        "description": "Filtrage antispam et anti-phishing TitanHQ."
      },
      "fortimail": {
        "description": "Passerelle email Fortinet · antispam et DLP."
      },
      "trend-email": {
        "description": "Protection messagerie Trend Micro."
      },
      "mimecast": {
        "description": "Sécurité email et continuité Mimecast."
      },
      "azure-ad": {
        "description": "Identité Microsoft 365 via Microsoft Graph · utilisateurs, MFA et applications Entra ID."
      },
      "google-workspace": {
        "description": "Comptes et services Google Workspace."
      },
      "teams": {
        "description": "Webhooks et alertes dans les canaux Teams."
      },
      "slack": {
        "description": "Notifications MSP vers les canaux Slack."
      },
      "whatsapp": {
        "description": "Réception des messages clients WhatsApp, création automatique de tickets support et réponses depuis Veritas."
      },
      "ovh": {
        "description": "Suivi des domaines et dates de renouvellement OVH."
      },
      "gandi": {
        "description": "Gestion des noms de domaine Gandi."
      },
      "cloudflare": {
        "description": "DNS, certificats et zones Cloudflare."
      },
      "ionos": {
        "description": "Registrar et hébergement IONOS (1&1)."
      },
      "godaddy": {
        "description": "Gestion des domaines GoDaddy."
      },
      "namecheap": {
        "description": "Registrar Namecheap et zones DNS."
      },
      "veeam": {
        "description": "Jobs de sauvegarde et statuts Veeam."
      },
      "hycu": {
        "description": "HYCU R-Cloud Hybrid — jobs de sauvegarde et statuts."
      },
      "acronis": {
        "description": "Plans de protection et alertes Acronis."
      }
    },
    "fieldLabels": {
      "ai": {
        "AI_PROVIDER": "Provider",
        "AI_API_KEY": "Chiave API",
        "AI_MODEL": "Modello (opzionale)"
      },
      "checkmk": {
        "CHECKMK_API_URL": "Checkmk API URL",
        "CHECKMK_USERNAME": "Username",
        "CHECKMK_PASSWORD": "Password",
        "CHECKMK_SITE": "Default site (optional)"
      },
      "hycu": {
        "HYCU_API_URL": "Controller URL",
        "HYCU_API_KEY": "API key",
        "HYCU_USERNAME": "Username (fallback)",
        "HYCU_PASSWORD": "Password (fallback)",
        "HYCU_VERIFY_TLS": "Verify TLS"
      },
      "bitdefender": {
        "BITDEFENDER_API_URL": "API URL",
        "BITDEFENDER_API_KEY": "API key"
      },
      "mailinblack": {
        "MAILINBLACK_API_URL": "Mailinblack API URL",
        "MAILINBLACK_CLIENT_ID": "Mailinblack Client ID",
        "MAILINBLACK_API_KEY": "Mailinblack Auth key"
      },
      "whatsapp": {
        "WHATSAPP_PHONE_NUMBER_ID": "Phone Number ID (Meta)",
        "WHATSAPP_ACCESS_TOKEN": "Permanent access token",
        "WHATSAPP_APP_SECRET": "Meta application secret",
        "WHATSAPP_VERIFY_TOKEN": "Webhook verification token",
        "WHATSAPP_BUSINESS_ACCOUNT_ID": "Business account ID (optional)",
        "WHATSAPP_API_VERSION": "Graph API version (e.g. v21.0)"
      },
      "ovh": {
        "OVH_APPLICATION_KEY": "Application Key",
        "OVH_APPLICATION_SECRET": "Application Secret",
        "OVH_CONSUMER_KEY": "Consumer Key"
      }
    }
  },
  "es": {
    "categories": {
      "ai": "IA y copiloto",
      "email-security": "Antispam y protección de correo",
      "endpoint-security": "Antivirus, EDR y XDR",
      "cloud": "Cloud e identidad",
      "dns": "DNS y dominios",
      "monitoring": "Monitorización y supervisión",
      "email": "Notificaciones",
      "backup": "Copia de seguridad"
    },
    "descriptions": {
      "ai": {
        "description": "Proveedor LLM para copilotos de tickets, runbooks y briefings."
      },
      "checkmk": {
        "description": "Supervision des hôtes, services et rapports de monitoring."
      },
      "unifi": {
        "description": "Ubiquiti UniFi Site Manager — importación de switches, gateways y APs Wi‑Fi."
      },
      "prtg": {
        "description": "Remontée des sondes et alertes PRTG Network Monitor."
      },
      "zabbix": {
        "description": "Synchronisation des hôtes et métriques Zabbix."
      },
      "datadog": {
        "description": "Observabilité infrastructure et APM."
      },
      "bitdefender": {
        "description": "Inventaire des entreprises et postes GravityZone."
      },
      "sentinelone": {
        "description": "EDR SentinelOne, agents et statuts de protection."
      },
      "crowdstrike": {
        "description": "EDR/XDR Falcon · postes, détections et réponse."
      },
      "sophos": {
        "description": "Antivirus, MDR et politiques Sophos Central."
      },
      "defender-endpoint": {
        "description": "EDR Microsoft · alertes, incidents et posture des postes."
      },
      "cortex-xdr": {
        "description": "XDR Palo Alto · corrélation et investigation."
      },
      "eset": {
        "description": "Antivirus et EDR ESET pour endpoints."
      },
      "trend-micro": {
        "description": "XDR Trend Micro et remontée des menaces."
      },
      "kaspersky": {
        "description": "Protection endpoint Kaspersky et console KSC."
      },
      "trellix": {
        "description": "ePO Trellix et statuts de protection endpoint."
      },
      "withsecure": {
        "description": "EDR WithSecure (ex-F-Secure) pour postes et serveurs."
      },
      "harfanglab": {
        "description": "EDR français · agents, alertes et investigation."
      },
      "malwarebytes": {
        "description": "Console Nebula et statuts de protection Malwarebytes."
      },
      "huntress": {
        "description": "EDR managé MSP · persistance, incidents et remédiation."
      },
      "mailinblack": {
        "description": "Protection mail antispam, anti-phishing et anti-malware · API partenaire module Protect."
      },
      "vade": {
        "description": "Filtrage cloud Vade · menaces avancées et phishing."
      },
      "proofpoint": {
        "description": "Protection email Proofpoint pour MSP."
      },
      "defender-office365": {
        "description": "Sécurité Exchange Online et Microsoft 365."
      },
      "hornetsecurity": {
        "description": "Suite de protection email et sauvegarde Hornetsecurity."
      },
      "spamtitan": {
        "description": "Filtrage antispam et anti-phishing TitanHQ."
      },
      "fortimail": {
        "description": "Passerelle email Fortinet · antispam et DLP."
      },
      "trend-email": {
        "description": "Protection messagerie Trend Micro."
      },
      "mimecast": {
        "description": "Sécurité email et continuité Mimecast."
      },
      "azure-ad": {
        "description": "Identité Microsoft 365 via Microsoft Graph · utilisateurs, MFA et applications Entra ID."
      },
      "google-workspace": {
        "description": "Comptes et services Google Workspace."
      },
      "teams": {
        "description": "Webhooks et alertes dans les canaux Teams."
      },
      "slack": {
        "description": "Notifications MSP vers les canaux Slack."
      },
      "whatsapp": {
        "description": "Réception des messages clients WhatsApp, création automatique de tickets support et réponses depuis Veritas."
      },
      "ovh": {
        "description": "Suivi des domaines et dates de renouvellement OVH."
      },
      "gandi": {
        "description": "Gestion des noms de domaine Gandi."
      },
      "cloudflare": {
        "description": "DNS, certificats et zones Cloudflare."
      },
      "ionos": {
        "description": "Registrar et hébergement IONOS (1&1)."
      },
      "godaddy": {
        "description": "Gestion des domaines GoDaddy."
      },
      "namecheap": {
        "description": "Registrar Namecheap et zones DNS."
      },
      "veeam": {
        "description": "Jobs de sauvegarde et statuts Veeam."
      },
      "hycu": {
        "description": "HYCU R-Cloud Hybrid — jobs de sauvegarde et statuts."
      },
      "acronis": {
        "description": "Plans de protection et alertes Acronis."
      }
    },
    "fieldLabels": {
      "ai": {
        "AI_PROVIDER": "Proveedor",
        "AI_API_KEY": "Clave API",
        "AI_MODEL": "Modelo (opcional)"
      },
      "checkmk": {
        "CHECKMK_API_URL": "Checkmk API URL",
        "CHECKMK_USERNAME": "Username",
        "CHECKMK_PASSWORD": "Password",
        "CHECKMK_SITE": "Default site (optional)"
      },
      "hycu": {
        "HYCU_API_URL": "Controller URL",
        "HYCU_API_KEY": "API key",
        "HYCU_USERNAME": "Username (fallback)",
        "HYCU_PASSWORD": "Password (fallback)",
        "HYCU_VERIFY_TLS": "Verify TLS"
      },
      "bitdefender": {
        "BITDEFENDER_API_URL": "API URL",
        "BITDEFENDER_API_KEY": "API key"
      },
      "mailinblack": {
        "MAILINBLACK_API_URL": "Mailinblack API URL",
        "MAILINBLACK_CLIENT_ID": "Mailinblack Client ID",
        "MAILINBLACK_API_KEY": "Mailinblack Auth key"
      },
      "whatsapp": {
        "WHATSAPP_PHONE_NUMBER_ID": "Phone Number ID (Meta)",
        "WHATSAPP_ACCESS_TOKEN": "Permanent access token",
        "WHATSAPP_APP_SECRET": "Meta application secret",
        "WHATSAPP_VERIFY_TOKEN": "Webhook verification token",
        "WHATSAPP_BUSINESS_ACCOUNT_ID": "Business account ID (optional)",
        "WHATSAPP_API_VERSION": "Graph API version (e.g. v21.0)"
      },
      "ovh": {
        "OVH_APPLICATION_KEY": "Application Key",
        "OVH_APPLICATION_SECRET": "Application Secret",
        "OVH_CONSUMER_KEY": "Consumer Key"
      }
    }
  }
};
