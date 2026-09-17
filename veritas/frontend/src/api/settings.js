import API_BASE_URL from "../config";
const BASE_URL = `${API_BASE_URL}/settings`;
export async function fetchSettings() {
  const res = await fetch(BASE_URL, {
    credentials: "include"
  });
  if (!res.ok) throw new Error("Error loading settings");
  return await res.json();
}
const settingsMapping = {
  'db_host': {
    section: 'db',
    label: 'Database host'
  },
  'db_port': {
    section: 'db',
    label: 'Database port'
  },
  'db_name': {
    section: 'db',
    label: 'Database name'
  },
  'db_user': {
    section: 'db',
    label: 'Database user'
  },
  'db_password': {
    section: 'db',
    label: 'Database password'
  },
  'BUG_REPORT_EMAIL': {
    section: 'email',
    label: 'Bug report email'
  },
  'SMTP_HOST': {
    section: 'email',
    label: 'SMTP server'
  },
  'SMTP_PORT': {
    section: 'email',
    label: 'SMTP port'
  },
  'SMTP_USER': {
    section: 'email',
    label: 'SMTP user'
  },
  'SMTP_PASS': {
    section: 'email',
    label: 'SMTP password'
  },
  'GITHUB_TOKEN': {
    section: 'github',
    label: 'GitHub authentication token'
  },
  'GITHUB_REPO_FRONT': {
    section: 'github',
    label: 'Repository Frontend'
  },
  'GITHUB_REPO_BACK': {
    section: 'github',
    label: 'Repository Backend'
  },
  'UNIFI_API_KEY': {
    section: 'unifi',
    label: 'API Key UniFi Site Manager (legacy)'
  },
  'INTEGRATION_UNIFI_ENABLED': {
    section: 'unifi',
    label: 'UniFi integration enabled'
  },
  'UNIFI_SITE_MANAGER_API_KEY': {
    section: 'unifi',
    label: 'UniFi Site Manager API key'
  },
  'UNIFI_NETWORK_API_KEY': {
    section: 'unifi',
    label: 'UniFi Network API key'
  },
  'UNIFI_CARRIER_FABRIC_API_KEY': {
    section: 'unifi',
    label: 'UniFi Carrier Fabric API key'
  },
  'CHECKMK_API_URL': {
    section: 'checkmk',
    label: 'URL API Check MK'
  },
  'CHECKMK_USERNAME': {
    section: 'checkmk',
    label: 'Check MK username'
  },
  'CHECKMK_PASSWORD': {
    section: 'checkmk',
    label: 'Check MK password'
  },
  'CHECKMK_SITE': {
    section: 'checkmk',
    label: 'Check MK site (optional)'
  },
  'INTEGRATION_HYCU_ENABLED': {
    section: 'hycu',
    label: 'HYCU integration enabled'
  },
  'HYCU_API_URL': {
    section: 'hycu',
    label: 'HYCU controller URL'
  },
  'HYCU_API_KEY': {
    section: 'hycu',
    label: 'HYCU API key'
  },
  'HYCU_USERNAME': {
    section: 'hycu',
    label: 'HYCU username'
  },
  'HYCU_PASSWORD': {
    section: 'hycu',
    label: 'HYCU password'
  },
  'HYCU_VERIFY_TLS': {
    section: 'hycu',
    label: 'HYCU verify TLS'
  },
  'WHATSAPP_PHONE_NUMBER_ID': {
    section: 'whatsapp',
    label: 'Phone Number ID WhatsApp'
  },
  'WHATSAPP_ACCESS_TOKEN': {
    section: 'whatsapp',
    label: 'WhatsApp access token'
  },
  'WHATSAPP_APP_SECRET': {
    section: 'whatsapp',
    label: 'Meta app secret'
  },
  'WHATSAPP_VERIFY_TOKEN': {
    section: 'whatsapp',
    label: 'Webhook verification token'
  },
  'WHATSAPP_BUSINESS_ACCOUNT_ID': {
    section: 'whatsapp',
    label: 'WhatsApp Business account ID'
  },
  'WHATSAPP_API_VERSION': {
    section: 'whatsapp',
    label: 'WhatsApp Graph API version'
  },
  'PARTNER_CENTER_APP_ID': {
    section: 'entraid',
    label: 'App ID Entra ID'
  },
  'PARTNER_CENTER_TENANT_ID': {
    section: 'entraid',
    label: 'Tenant ID Entra ID'
  },
  'PARTNER_CENTER_SECRET_ID': {
    section: 'entraid',
    label: 'Secret ID Entra ID'
  },
  'INTEGRATION_AI_ENABLED': {
    section: 'ai',
    label: 'Veritas AI enabled'
  },
  'AI_PROVIDER': {
    section: 'ai',
    label: 'AI provider'
  },
  'AI_API_KEY': {
    section: 'ai',
    label: 'AI API key'
  },
  'AI_MODEL': {
    section: 'ai',
    label: 'AI model'
  }
};
export const updateSetting = async (key, value) => {
  const mapping = settingsMapping[key] || {
    section: 'general',
    label: key
  };
  const response = await fetch(`${API_BASE_URL}/settings`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      key,
      value,
      label: mapping.label,
      section: mapping.section
    })
  });
  if (!response.ok) {
    throw new Error("Failed to update the setting.");
  }
  return response.json();
};
