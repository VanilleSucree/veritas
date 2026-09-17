export const INTEGRATION_CATEGORIES = [{
  id: "ai",
  label: "AI & copilote",
  icon: "mdi:robot-outline"
}, {
  id: "email-security",
  label: "Antispam & email protection",
  icon: "mdi:email-search-outline"
}, {
  id: "endpoint-security",
  label: "Antivirus, EDR & XDR",
  icon: "mdi:shield-bug-outline"
}, {
  id: "cloud",
  label: "Cloud & identity",
  icon: "mdi:microsoft-azure"
}, {
  id: "dns",
  label: "DNS & domains",
  icon: "mdi:web"
}, {
  id: "monitoring",
  label: "Monitoring & supervision",
  icon: "mdi:chart-timeline-variant"
}, {
  id: "email",
  label: "Notifications",
  icon: "mdi:email-outline"
}, {
  id: "backup",
  label: "Backup",
  icon: "mdi:backup-restore"
}];
const AVAILABLE = "available";
const COMING_SOON = "comingSoon";
export const INTEGRATIONS_CATALOG = [{
  id: "ai",
  name: "Veritas AI",
  category: "ai",
  status: AVAILABLE,
  icon: "mdi:robot-outline",
  iconColor: "#0ea5e9",
  description: "LLM provider for ticket copilots, runbooks and briefings.",
  enabledKey: "INTEGRATION_AI_ENABLED",
  fields: [{
    key: "AI_PROVIDER",
    label: "Provider",
    type: "text"
  }, {
    key: "AI_API_KEY",
    label: "API key",
    type: "password"
  }, {
    key: "AI_MODEL",
    label: "Model (optional)",
    type: "text"
  }]
}, {
  id: "checkmk",
  name: "Checkmk",
  category: "monitoring",
  status: AVAILABLE,
  icon: "simple-icons:checkmk",
  iconColor: "#76b900",
  description: "Host, service and monitoring report supervision.",
  enabledKey: "INTEGRATION_CHECKMK_ENABLED",
  fields: [{
    key: "CHECKMK_API_URL",
    label: "Checkmk API URL",
    type: "url"
  }, {
    key: "CHECKMK_USERNAME",
    label: "Username",
    type: "text"
  }, {
    key: "CHECKMK_PASSWORD",
    label: "Password",
    type: "password"
  }, {
    key: "CHECKMK_SITE",
    label: "Default site (optional)",
    type: "text"
  }]
}, {
  id: "unifi",
  name: "UniFi",
  category: "monitoring",
  status: AVAILABLE,
  icon: "simple-icons:ubiquiti",
  iconColor: "#0559C9",
  description: "Ubiquiti UniFi Site Manager — import switches, gateways and Wi‑Fi APs.",
  enabledKey: "INTEGRATION_UNIFI_ENABLED",
  fields: [{
    key: "UNIFI_SITE_MANAGER_API_KEY",
    label: "Site Manager API key",
    type: "password"
  }, {
    key: "UNIFI_NETWORK_API_KEY",
    label: "Network API key",
    type: "password"
  }, {
    key: "UNIFI_CARRIER_FABRIC_API_KEY",
    label: "Carrier Fabric API key",
    type: "password"
  }]
}, {
  id: "prtg",
  name: "PRTG",
  category: "monitoring",
  status: COMING_SOON,
  icon: "mdi:chart-bell-curve",
  iconColor: "#059669",
  description: "PRTG Network Monitor probe and alert ingestion."
}, {
  id: "zabbix",
  name: "Zabbix",
  category: "monitoring",
  status: COMING_SOON,
  icon: "mdi:server-network",
  iconColor: "#d40000",
  description: "Zabbix host and metric synchronization."
}, {
  id: "datadog",
  name: "Datadog",
  category: "monitoring",
  status: COMING_SOON,
  icon: "simple-icons:datadog",
  iconColor: "#632ca6",
  description: "Infrastructure observability and APM."
}, {
  id: "bitdefender",
  name: "BITDEFENDER",
  category: "endpoint-security",
  status: AVAILABLE,
  icon: "simple-icons:bitdefender",
  image: "bitdefender.png",
  iconColor: "#ed1c24",
  description: "GravityZone company and endpoint inventory.",
  enabledKey: "INTEGRATION_BITDEFENDER_ENABLED",
  fields: [{
    key: "BITDEFENDER_API_URL",
    label: "API URL",
    type: "url"
  }, {
    key: "BITDEFENDER_API_KEY",
    label: "API key",
    type: "password"
  }]
}, {
  id: "sentinelone",
  name: "SentinelOne",
  category: "endpoint-security",
  status: COMING_SOON,
  icon: "mdi:shield-alert",
  iconColor: "#6b21a8",
  description: "SentinelOne EDR, agents and protection status.",
  proOnly: true
}, {
  id: "crowdstrike",
  name: "CrowdStrike Falcon",
  category: "endpoint-security",
  status: COMING_SOON,
  icon: "mdi:bird",
  iconColor: "#e11d48",
  description: "Falcon EDR/XDR · endpoints, detections and response.",
  proOnly: true
}, {
  id: "sophos",
  name: "Sophos Central",
  category: "endpoint-security",
  status: COMING_SOON,
  icon: "mdi:shield-check",
  iconColor: "#0f62fe",
  description: "Sophos Central antivirus, MDR and policies.",
  proOnly: true
}, {
  id: "defender-endpoint",
  name: "Microsoft Defender for Endpoint",
  category: "endpoint-security",
  status: COMING_SOON,
  icon: "mdi:microsoft",
  iconColor: "#0078d4",
  description: "Microsoft EDR · alerts, incidents and endpoint posture.",
  proOnly: true
}, {
  id: "cortex-xdr",
  name: "Palo Alto Cortex XDR",
  category: "endpoint-security",
  status: COMING_SOON,
  icon: "mdi:shield-search",
  iconColor: "#fa582d",
  description: "Palo Alto XDR · correlation and investigation.",
  proOnly: true
}, {
  id: "eset",
  name: "ESET PROTECT",
  category: "endpoint-security",
  status: COMING_SOON,
  icon: "mdi:shield-check",
  iconColor: "#00aeef",
  description: "ESET antivirus and EDR for endpoints.",
  proOnly: true
}, {
  id: "trend-micro",
  name: "Trend Micro Vision One",
  category: "endpoint-security",
  status: COMING_SOON,
  icon: "mdi:shield-half-full",
  iconColor: "#d71920",
  description: "Trend Micro XDR and threat ingestion.",
  proOnly: true
}, {
  id: "kaspersky",
  name: "Kaspersky Endpoint Security",
  category: "endpoint-security",
  status: COMING_SOON,
  icon: "mdi:shield-lock-outline",
  iconColor: "#00a88e",
  description: "Kaspersky endpoint protection and KSC console.",
  proOnly: true
}, {
  id: "trellix",
  name: "Trellix (ex-McAfee)",
  category: "endpoint-security",
  status: COMING_SOON,
  icon: "mdi:shield-star-outline",
  iconColor: "#c01818",
  description: "Trellix ePO and endpoint protection status.",
  proOnly: true
}, {
  id: "withsecure",
  name: "WithSecure Elements",
  category: "endpoint-security",
  status: COMING_SOON,
  icon: "mdi:shield-account",
  iconColor: "#243746",
  description: "WithSecure EDR (ex-F-Secure) for endpoints and servers.",
  proOnly: true
}, {
  id: "harfanglab",
  name: "HarfangLab",
  category: "endpoint-security",
  status: COMING_SOON,
  icon: "mdi:owl",
  iconColor: "#1e3a5f",
  description: "French EDR · agents, alerts and investigation.",
  proOnly: true
}, {
  id: "malwarebytes",
  name: "Malwarebytes Nebula",
  category: "endpoint-security",
  status: COMING_SOON,
  icon: "mdi:bug-check-outline",
  iconColor: "#0d3d2d",
  description: "Nebula console and Malwarebytes protection status.",
  proOnly: true
}, {
  id: "huntress",
  name: "Huntress",
  category: "endpoint-security",
  status: COMING_SOON,
  icon: "mdi:target-account",
  iconColor: "#00b388",
  description: "Managed MSP EDR · persistence, incidents and remediation.",
  proOnly: true
}, {
  id: "mailinblack",
  name: "MAIL IN BLACK",
  category: "email-security",
  status: AVAILABLE,
  icon: "mdi:email-lock-outline",
  image: "mailinblack.png",
  iconColor: "#1e3a5f",
  description: "Antispam, anti-phishing and anti-malware email protection · Protect module partner API.",
  enabledKey: "INTEGRATION_MAILINBLACK_ENABLED",
  fields: [{
    key: "MAILINBLACK_API_URL",
    label: "Mailinblack API URL",
    type: "url"
  }, {
    key: "MAILINBLACK_CLIENT_ID",
    label: "Mailinblack Client ID",
    type: "text"
  }, {
    key: "MAILINBLACK_API_KEY",
    label: "Mailinblack Auth key",
    type: "password"
  }]
}, {
  id: "vade",
  name: "Vade Secure",
  category: "email-security",
  status: COMING_SOON,
  icon: "mdi:email-lock-outline",
  iconColor: "#0066cc",
  description: "Vade cloud filtering · advanced threats and phishing.",
  proOnly: true
}, {
  id: "proofpoint",
  name: "Proofpoint Essentials",
  category: "email-security",
  status: COMING_SOON,
  icon: "mdi:email-check-outline",
  iconColor: "#1a3c6e",
  description: "Proofpoint email protection for MSP.",
  proOnly: true
}, {
  id: "defender-office365",
  name: "Microsoft Defender for Office 365",
  category: "email-security",
  status: COMING_SOON,
  icon: "mdi:microsoft",
  iconColor: "#0078d4",
  description: "Exchange Online and Microsoft 365 security.",
  proOnly: true
}, {
  id: "hornetsecurity",
  name: "Hornetsecurity",
  category: "email-security",
  status: COMING_SOON,
  icon: "mdi:bee",
  iconColor: "#f5a623",
  description: "Hornetsecurity email protection and backup suite.",
  proOnly: true
}, {
  id: "spamtitan",
  name: "SpamTitan",
  category: "email-security",
  status: COMING_SOON,
  icon: "mdi:email-remove-outline",
  iconColor: "#00a651",
  description: "TitanHQ antispam and anti-phishing filtering.",
  proOnly: true
}, {
  id: "fortimail",
  name: "FortiMail",
  category: "email-security",
  status: COMING_SOON,
  icon: "mdi:email-fast-outline",
  iconColor: "#ee3124",
  description: "Fortinet email gateway · antispam and DLP.",
  proOnly: true
}, {
  id: "trend-email",
  name: "Trend Micro Email Security",
  category: "email-security",
  status: COMING_SOON,
  icon: "mdi:email-check-outline",
  iconColor: "#d71920",
  description: "Trend Micro messaging protection.",
  proOnly: true
}, {
  id: "mimecast",
  name: "Mimecast",
  category: "email-security",
  status: COMING_SOON,
  icon: "mdi:email-arrow-right-outline",
  iconColor: "#0b1f3a",
  description: "Mimecast email security and continuity.",
  proOnly: true
}, {
  id: "azure-ad",
  name: "Microsoft Entra ID",
  category: "cloud",
  status: COMING_SOON,
  icon: "mdi:microsoft-azure",
  iconColor: "#0078d4",
  description: "Microsoft 365 identity via Microsoft Graph · users, MFA and Entra ID applications."
}, {
  id: "google-workspace",
  name: "Google Workspace",
  category: "cloud",
  status: COMING_SOON,
  icon: "mdi:google",
  iconColor: "#4285f4",
  description: "Google Workspace accounts and services."
}, {
  id: "teams",
  name: "Microsoft Teams",
  category: "email",
  status: COMING_SOON,
  icon: "mdi:microsoft-teams",
  iconColor: "#6264a7",
  description: "Webhooks and alerts in Teams channels."
}, {
  id: "slack",
  name: "Slack",
  category: "email",
  status: COMING_SOON,
  icon: "mdi:slack",
  iconColor: "#4a154b",
  description: "MSP notifications to Slack channels."
}, {
  id: "whatsapp",
  name: "WhatsApp Business",
  category: "email",
  status: AVAILABLE,
  icon: "mdi:whatsapp",
  iconColor: "#25d366",
  description: "Incoming client WhatsApp messages, automatic support ticket creation and replies from Veritas.",
  enabledKey: "INTEGRATION_WHATSAPP_ENABLED",
  webhookPath: "/api/whatsapp/webhook",
  fields: [{
    key: "WHATSAPP_PHONE_NUMBER_ID",
    label: "Phone Number ID (Meta)",
    type: "text"
  }, {
    key: "WHATSAPP_ACCESS_TOKEN",
    label: "Permanent access token",
    type: "password"
  }, {
    key: "WHATSAPP_APP_SECRET",
    label: "Meta app secret",
    type: "password"
  }, {
    key: "WHATSAPP_VERIFY_TOKEN",
    label: "Webhook verification token",
    type: "password"
  }, {
    key: "WHATSAPP_BUSINESS_ACCOUNT_ID",
    label: "Business account ID (optional)",
    type: "text"
  }, {
    key: "WHATSAPP_API_VERSION",
    label: "Graph API version (e.g. v21.0)",
    type: "text"
  }]
}, {
  id: "ovh",
  name: "OVH",
  category: "dns",
  status: AVAILABLE,
  icon: "simple-icons:ovh",
  iconColor: "#123f6d",
  description: "OVH domain tracking and renewal dates.",
  enabledKey: "INTEGRATION_OVH_ENABLED",
  fields: [{
    key: "OVH_APPLICATION_KEY",
    label: "Application Key",
    type: "text"
  }, {
    key: "OVH_APPLICATION_SECRET",
    label: "Application Secret",
    type: "password"
  }, {
    key: "OVH_CONSUMER_KEY",
    label: "Consumer Key",
    type: "password"
  }]
}, {
  id: "gandi",
  name: "Gandi",
  category: "dns",
  status: COMING_SOON,
  icon: "mdi:domain",
  iconColor: "#94a3b8",
  description: "Gandi domain name management.",
  proOnly: true
}, {
  id: "cloudflare",
  name: "Cloudflare",
  category: "dns",
  status: COMING_SOON,
  icon: "simple-icons:cloudflare",
  iconColor: "#f38020",
  description: "DNS, certificates and Cloudflare zones.",
  proOnly: true
}, {
  id: "ionos",
  name: "IONOS",
  category: "dns",
  status: COMING_SOON,
  icon: "mdi:server-network",
  iconColor: "#003d8f",
  description: "IONOS (1&1) registrar and hosting.",
  proOnly: true
}, {
  id: "godaddy",
  name: "GoDaddy",
  category: "dns",
  status: COMING_SOON,
  icon: "simple-icons:godaddy",
  iconColor: "#1bdbdb",
  description: "GoDaddy domain management.",
  proOnly: true
}, {
  id: "namecheap",
  name: "Namecheap",
  category: "dns",
  status: COMING_SOON,
  icon: "mdi:tag-outline",
  iconColor: "#de3723",
  description: "Namecheap registrar and DNS zones.",
  proOnly: true
}, {
  id: "hycu",
  name: "HYCU Backup",
  category: "backup",
  status: AVAILABLE,
  icon: "mdi:cloud-sync-outline",
  iconColor: "#e11d48",
  description: "HYCU R-Cloud Hybrid Cloud Edition — backup jobs and statuses.",
  enabledKey: "INTEGRATION_HYCU_ENABLED",
  fields: [{
    key: "HYCU_API_URL",
    label: "Controller URL",
    type: "url"
  }, {
    key: "HYCU_API_KEY",
    label: "API key",
    type: "password"
  }, {
    key: "HYCU_USERNAME",
    label: "Username (fallback)",
    type: "text"
  }, {
    key: "HYCU_PASSWORD",
    label: "Password (fallback)",
    type: "password"
  }, {
    key: "HYCU_VERIFY_TLS",
    label: "Verify TLS (true/false)",
    type: "text"
  }]
}, {
  id: "veeam",
  name: "Veeam",
  category: "backup",
  status: COMING_SOON,
  icon: "mdi:server-security",
  iconColor: "#00b336",
  description: "Veeam backup jobs and statuses."
}, {
  id: "acronis",
  name: "Acronis Cyber Protect",
  category: "backup",
  status: COMING_SOON,
  icon: "mdi:shield-sync-outline",
  iconColor: "#0066cc",
  description: "Acronis protection plans and alerts."
}];
export const AVAILABLE_INTEGRATIONS = INTEGRATIONS_CATALOG.filter(item => item.status === AVAILABLE);
export function settingsToMap(settingsList = []) {
  if (!Array.isArray(settingsList)) return settingsList || {};
  return settingsList.reduce((acc, setting) => ({
    ...acc,
    [setting.key]: setting.value
  }), {});
}
export function isIntegrationConfigured(integration, settings = {}) {
  if (!integration || integration.status === COMING_SOON) return false;
  if (!integration.enabledKey && !(integration.fields || []).length) return false;
  const raw = settings[integration.enabledKey];
  const normalized = `${raw ?? ""}`.toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return (integration.fields || []).some(({
    key
  }) => `${settings[key] ?? ""}`.trim().length > 0);
}
export function getEndpointSecurityIntegrations() {
  return INTEGRATIONS_CATALOG.filter(item => item.category === "endpoint-security");
}
export function getEmailSecurityIntegrations() {
  return INTEGRATIONS_CATALOG.filter(item => item.category === "email-security");
}
export function getDnsIntegrations() {
  return INTEGRATIONS_CATALOG.filter(item => item.category === "dns");
}
export function getIntegrationById(integrationId) {
  return INTEGRATIONS_CATALOG.find(item => item.id === integrationId) || null;
}
export const COMMUNITY_FREE_INTEGRATION_IDS = new Set(["ai", "bitdefender", "mailinblack", "ovh"]);
export function isIntegrationCommunityFree(integrationId) {
  return COMMUNITY_FREE_INTEGRATION_IDS.has(integrationId);
}
export function isIntegrationProLocked(integration, isCommunity) {
  if (!isCommunity || !integration) return false;
  if (integration.proOnly) return true;
  return !isIntegrationCommunityFree(integration.id);
}
export function integrationShowsProBadge(integration, isCommunity) {
  if (!integration) return false;
  if (integration.proOnly) return true;
  return isIntegrationProLocked(integration, isCommunity);
}
export function getCategoryMeta(categoryId) {
  return INTEGRATION_CATEGORIES.find(category => category.id === categoryId);
}
export function groupIntegrationsByCategory(items = INTEGRATIONS_CATALOG) {
  return INTEGRATION_CATEGORIES.map(category => ({
    ...category,
    items: items.filter(item => item.category === category.id)
  })).filter(section => section.items.length > 0);
}
export function integrationIconStyle(iconColor) {
  if (!iconColor) return undefined;
  return {
    "--integration-icon-color": iconColor
  };
}
