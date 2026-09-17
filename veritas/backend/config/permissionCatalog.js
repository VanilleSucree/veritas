/**
 * Fine-grained permission catalog.
 * Keys are `${group}.${action}` (e.g. tickets.ai_suggest).
 * Matrix UI shows one row per feature; admin-only groups can be hidden.
 */

export const PERMISSION_ACTION_LABELS = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  export: "Export",
  manage: "Manage"
};

/** @typedef {{ action: string, label?: string, dependsOn?: string[], matrix?: boolean }} PermissionActionDef */

/**
 * Normalize actions to { action, label?, dependsOn?, matrix? }.
 * @param {(string|PermissionActionDef)[]} actions
 */
function normalizeActions(actions) {
  return actions.map(a => typeof a === "string" ? {
    action: a,
    matrix: true
  } : {
    matrix: true,
    ...a,
    action: a.action
  });
}

/**
 * @type {Array<{
 *   group: string,
 *   label: string,
 *   section: string,
 *   moduleFlag?: string|null,
 *   coreDefault?: boolean,
 *   adminOnly?: boolean,
 *   matrix?: boolean,
 *   actions: (string|PermissionActionDef)[]
 * }>}
 */
export const PERMISSION_CATALOG = [{
  group: "home",
  label: "Home",
  section: "home",
  moduleFlag: "dashboard_enabled",
  actions: ["view", {
    action: "create_support",
    label: "Create support ticket (+)"
  }, {
    action: "create_sales",
    label: "Create services ticket (+)"
  }, {
    action: "create_event",
    label: "Create event (+)"
  }]
}, {
  group: "clients",
  label: "Companies",
  section: "crm",
  moduleFlag: null,
  coreDefault: true,
  actions: ["view", "create", "export", {
    action: "public_views",
    label: "Public table views"
  }]
}, {
  group: "clients_detail",
  label: "Company detail",
  section: "crm",
  moduleFlag: null,
  coreDefault: true,
  actions: ["edit", "delete", {
    action: "reversibility",
    label: "Export reversibility folder"
  }, {
    action: "tags",
    label: "Manage tags"
  }, {
    action: "credits",
    label: "Add credits"
  }, {
    action: "add_contact",
    label: "Add contact",
    dependsOn: ["contacts.create"]
  }, {
    action: "add_prestataire",
    label: "Add provider",
    dependsOn: ["prestataires.create"]
  }, {
    action: "sites",
    label: "Manage sites"
  }, {
    action: "schedule_event",
    label: "Schedule event",
    dependsOn: ["planning.create"]
  }, {
    action: "notes",
    label: "Manage notes"
  }, {
    action: "solutions",
    label: "Add solutions (AV, backup, licences…)"
  }, {
    action: "devices",
    label: "Add / manage devices"
  }, {
    action: "campaigns",
    label: "Create campaigns"
  }, {
    action: "vault",
    label: "Document vault"
  }]
}, {
  group: "contacts",
  label: "Contacts",
  section: "crm",
  moduleFlag: "contact_enabled",
  coreDefault: true,
  actions: ["view", "create", "export", {
    action: "public_views",
    label: "Public table views"
  }]
}, {
  group: "contacts_detail",
  label: "Contact detail",
  section: "crm",
  moduleFlag: "contact_enabled",
  coreDefault: true,
  actions: ["edit", "delete", {
    action: "portal",
    label: "Client portal"
  }, {
    action: "access_sharing",
    label: "Access sharing"
  }]
}, {
  group: "prestataires",
  label: "Providers",
  section: "crm",
  moduleFlag: "prestataire_enabled",
  coreDefault: true,
  actions: ["view", "create", "export"]
}, {
  group: "prestataires_detail",
  label: "Provider detail",
  section: "crm",
  moduleFlag: "prestataire_enabled",
  coreDefault: true,
  actions: ["edit", "delete"]
}, {
  group: "tickets",
  label: "Support",
  section: "support",
  moduleFlag: "tickets_enabled",
  actions: ["view", "create", "export", {
    action: "public_views",
    label: "Public table views"
  }, {
    action: "manage_views",
    label: "Create / manage views"
  }, {
    action: "customer_feedback",
    label: "Customer feedback"
  }, {
    action: "all_customer_feedback",
    label: "All customer feedback"
  }, {
    action: "random_mode",
    label: "Random ticket mode"
  }, {
    action: "trash",
    label: "Trash tickets"
  }, {
    action: "manage",
    label: "Administration (automations, purge)",
    matrix: false
  }]
}, {
  group: "tickets_detail",
  label: "Support detail",
  section: "support",
  moduleFlag: "tickets_enabled",
  actions: [{
    action: "delete",
    label: "Delete ticket (trash)"
  }, {
    action: "ai_runbook",
    label: "Generate AI runbook"
  }, {
    action: "macro",
    label: "Apply macro"
  }, {
    action: "exclude",
    label: "Exclude ticket"
  }, {
    action: "split",
    label: "Split ticket"
  }, {
    action: "edit_messages",
    label: "Edit own messages"
  }, {
    action: "delete_attachments",
    label: "Delete message attachments"
  }, {
    action: "ai_suggest",
    label: "Suggest reply with AI"
  }, {
    action: "public_reply",
    label: "Public reply"
  }, {
    action: "request_validation",
    label: "Request validation"
  }, {
    action: "resolve",
    label: "Send as resolved"
  }]
}, {
  group: "sales",
  label: "Services & installations",
  section: "support",
  moduleFlag: "sales_enabled",
  actions: ["view", "create", "export", {
    action: "public_views",
    label: "Public table views"
  }, {
    action: "manage_views",
    label: "Create / manage views"
  }, {
    action: "trash",
    label: "Trash tickets"
  }]
}, {
  group: "sales_detail",
  label: "Services detail",
  section: "support",
  moduleFlag: "sales_enabled",
  actions: [{
    action: "delete",
    label: "Delete ticket (trash)"
  }, {
    action: "report",
    label: "Create report"
  }, {
    action: "public_reply",
    label: "Public reply"
  }, {
    action: "edit_messages",
    label: "Edit own messages"
  }, {
    action: "delete_attachments",
    label: "Delete message attachments"
  }, {
    action: "request_validation",
    label: "Request validation"
  }, {
    action: "tasks",
    label: "Manage tasks"
  }]
}, {
  group: "planning",
  label: "Planning",
  section: "operations",
  moduleFlag: "planning_enabled",
  actions: ["view", {
    action: "create",
    label: "Create event (+)"
  }, {
    action: "click_create",
    label: "Click planning to create / go to date"
  }, {
    action: "edit",
    label: "Edit event"
  }, {
    action: "open_ticket",
    label: "Open ticket from event"
  }]
}, {
  group: "tabs",
  label: "Tab bar",
  section: "operations",
  moduleFlag: null,
  actions: [{
    action: "open_restricted",
    label: "Open tabs to pages without module access"
  }]
}, {
  group: "contracts",
  label: "Contracts",
  section: "crm",
  moduleFlag: "contrat_enabled",
  coreDefault: true,
  matrix: false,
  actions: ["view", "create", "edit", "delete"]
}, {
  group: "services",
  label: "Services (MSP)",
  section: "crm",
  moduleFlag: "service_enabled",
  matrix: false,
  actions: ["view", "create", "edit", "delete"]
}, {
  group: "dashboard",
  label: "Dashboard",
  section: "operations",
  moduleFlag: "dashboard_enabled",
  matrix: false,
  actions: ["view"]
}, {
  group: "infrastructure",
  label: "Infrastructure",
  section: "supervision",
  moduleFlag: "infrastructure_enabled",
  matrix: false,
  actions: ["view", "edit"]
}, {
  group: "equipment_inventory",
  label: "Device inventory",
  section: "supervision",
  moduleFlag: "equipment_inventory_enabled",
  matrix: false,
  actions: ["view"]
}, {
  group: "supervision",
  label: "Supervision center",
  section: "supervision",
  moduleFlag: "infrastructure_enabled",
  matrix: false,
  actions: ["view", "manage"]
}, {
  group: "monitoring",
  label: "Monitoring",
  section: "supervision",
  moduleFlag: "monitoring_enabled",
  matrix: false,
  actions: ["view"]
}, {
  group: "cybersecurite",
  label: "Cybersecurity",
  section: "supervision",
  moduleFlag: "cybersecurite_enabled",
  matrix: false,
  actions: ["view", "edit"]
}, {
  group: "documents",
  label: "Documents",
  section: "documents",
  moduleFlag: "documents_enabled",
  matrix: false,
  actions: ["view", "create", "edit", "delete"]
}, {
  group: "vault",
  label: "Secrets (Vault)",
  section: "documents",
  moduleFlag: "documents_enabled",
  matrix: false,
  actions: ["view", "manage"]
}, {
  group: "knowledge_base",
  label: "Knowledge base",
  section: "tools",
  moduleFlag: "knowledge_base_enabled",
  actions: ["view", "create", "edit", "delete"]
}, {
  group: "configurateur",
  label: "Configurator",
  section: "tools",
  moduleFlag: "configurateur_enabled",
  matrix: false,
  actions: ["view", "edit"]
}, {
  group: "admin_panel",
  label: "Administration menu",
  section: "administration",
  moduleFlag: "administration_enabled",
  actions: [{
    action: "general",
    label: "General settings"
  }, {
    action: "login_branding",
    label: "Login page"
  }, {
    action: "reports",
    label: "Reports branding"
  }, {
    action: "tech_news",
    label: "News feeds"
  }, {
    action: "users",
    label: "Agents"
  }, {
    action: "permissions",
    label: "Permissions"
  }, {
    action: "teams",
    label: "Teams"
  }, {
    action: "planning",
    label: "Planning types"
  }, {
    action: "clients",
    label: "Company records"
  }, {
    action: "client_portal",
    label: "Client portal access"
  }, {
    action: "support_credits",
    label: "Support credit packs"
  }, {
    action: "sla",
    label: "SLA"
  }, {
    action: "contract_modules",
    label: "Contract options"
  }, {
    action: "equipment_families",
    label: "Equipment families"
  }, {
    action: "infrastructure_map",
    label: "Infrastructure map"
  }, {
    action: "tickets",
    label: "Support settings"
  }, {
    action: "mail_collect",
    label: "Mail collection"
  }, {
    action: "service_settings",
    label: "Services settings"
  }, {
    action: "notifications",
    label: "Notifications"
  }, {
    action: "injection",
    label: "Data injection"
  }, {
    action: "equipment_purge",
    label: "Equipment purge"
  }, {
    action: "maintenance",
    label: "Maintenance message"
  }, {
    action: "rmm",
    label: "RMM · Agents"
  }, {
    action: "supervision_alerts",
    label: "Alert rules"
  }, {
    action: "integrations",
    label: "Integrations"
  }, {
    action: "ai",
    label: "AI · Copilot"
  }, {
    action: "license",
    label: "Pro license"
  }]
}, {
  group: "rmm",
  label: "RMM",
  section: "administration",
  moduleFlag: null,
  adminOnly: true,
  matrix: false,
  actions: ["view", "manage"]
}, {
  group: "integrations",
  label: "Integrations",
  section: "administration",
  moduleFlag: null,
  adminOnly: true,
  matrix: false,
  actions: ["view", "manage"]
}, {
  group: "config",
  label: "Configuration",
  section: "administration",
  moduleFlag: null,
  adminOnly: true,
  matrix: false,
  actions: ["view", "manage"]
}, {
  group: "users",
  label: "Users & profiles",
  section: "administration",
  moduleFlag: null,
  adminOnly: true,
  matrix: false,
  actions: ["view", "manage"]
}, {
  group: "maintenance",
  label: "Maintenance / Backups",
  section: "administration",
  moduleFlag: null,
  adminOnly: true,
  matrix: false,
  actions: ["manage"]
}, {
  group: "license",
  label: "License",
  section: "administration",
  moduleFlag: null,
  adminOnly: true,
  matrix: false,
  actions: ["manage"]
}];

/** Normalized catalog with action objects. */
export const PERMISSION_CATALOG_NORMALIZED = PERMISSION_CATALOG.map(group => ({
  ...group,
  actions: normalizeActions(group.actions)
}));

export function permissionKey(group, action) {
  return `${group}.${action}`;
}

export const ALL_PERMISSION_KEYS = PERMISSION_CATALOG_NORMALIZED.flatMap(g => g.actions.map(a => permissionKey(g.group, a.action)));
const ALL_PERMISSION_KEYS_SET = new Set(ALL_PERMISSION_KEYS);

export function isValidPermissionKey(key) {
  return ALL_PERMISSION_KEYS_SET.has(key);
}

/** Feature dependency map: key → required keys (all must be granted). */
export const PERMISSION_DEPENDENCIES = (() => {
  const map = {};
  for (const group of PERMISSION_CATALOG_NORMALIZED) {
    for (const action of group.actions) {
      if (action.dependsOn?.length) {
        map[permissionKey(group.group, action.action)] = [...action.dependsOn];
      }
    }
  }
  return map;
})();

/**
 * Legacy coarse keys → new keys (for migration + API check aliases).
 * Check semantics: granting legacy OR any listed new key satisfies the legacy check.
 */
export const LEGACY_PERMISSION_MAP = {
  "clients.edit": ["clients_detail.edit"],
  "clients.delete": ["clients_detail.delete"],
  "contacts.edit": ["contacts_detail.edit"],
  "contacts.delete": ["contacts_detail.delete"],
  "contacts.manage": ["contacts_detail.portal"],
  "tickets.edit": ["tickets_detail.public_reply", "tickets_detail.resolve", "tickets_detail.macro", "tickets_detail.edit_messages", "tickets_detail.request_validation", "tickets_detail.exclude", "tickets_detail.split", "tickets_detail.ai_suggest", "tickets_detail.ai_runbook", "tickets_detail.delete_attachments"],
  "tickets.delete": ["tickets_detail.delete"],
  "tickets.manage": ["tickets.trash", "tickets.manage_views", "tickets.all_customer_feedback", "tickets.random_mode", "tickets.manage"],
  "sales.edit": ["sales_detail.public_reply", "sales_detail.edit_messages", "sales_detail.request_validation", "sales_detail.tasks", "sales_detail.report", "sales_detail.delete_attachments"],
  "sales.delete": ["sales_detail.delete"],
  "vault.manage": ["vault.manage", "clients_detail.vault"]
};

/**
 * When an old key was granted, expand to these new keys on migration.
 */
export const LEGACY_KEY_EXPANSION = {
  "clients.edit": ["clients_detail.edit"],
  "clients.delete": ["clients_detail.delete"],
  "contacts.edit": ["contacts_detail.edit"],
  "contacts.delete": ["contacts_detail.delete"],
  "contacts.manage": ["contacts_detail.portal", "contacts_detail.access_sharing"],
  "tickets.edit": ["tickets_detail.public_reply", "tickets_detail.resolve", "tickets_detail.macro", "tickets_detail.edit_messages", "tickets_detail.request_validation", "tickets_detail.exclude", "tickets_detail.split", "tickets_detail.ai_suggest", "tickets_detail.ai_runbook", "tickets_detail.delete_attachments"],
  "tickets.delete": ["tickets_detail.delete", "tickets.trash"],
  "tickets.manage": ["tickets.trash", "tickets.manage_views", "tickets.customer_feedback", "tickets.all_customer_feedback", "tickets.random_mode", "tickets.public_views", "tickets.manage"],
  "sales.edit": ["sales_detail.public_reply", "sales_detail.edit_messages", "sales_detail.request_validation", "sales_detail.tasks", "sales_detail.report", "sales_detail.delete_attachments"],
  "sales.delete": ["sales_detail.delete", "sales.trash"],
  "planning.edit": ["planning.create", "planning.click_create", "planning.edit", "planning.open_ticket"],
  "clients.export": ["clients.export", "clients_detail.reversibility"],
  "vault.manage": ["vault.manage", "clients_detail.vault"],
  "vault.view": ["vault.view", "clients_detail.vault"],
  "cybersecurite.edit": ["clients_detail.campaigns"],
  "infrastructure.edit": ["clients_detail.devices", "clients_detail.solutions"],
  "services.create": ["clients_detail.solutions"],
  "services.edit": ["clients_detail.solutions"],
  "dashboard.view": ["home.view", "dashboard.view"]
};

/** Accueil "+" shortcuts are independent matrix rows — never satisfy via coarse keys. */
const STRICT_MATRIX_KEYS = new Set([
  "home.create_support",
  "home.create_sales",
  "home.create_event",
  "home.view"
]);

export function expandLegacyGrantedKeys(grantedSet) {
  const next = new Set(grantedSet);
  for (const [legacy, expansions] of Object.entries(LEGACY_KEY_EXPANSION)) {
    if (!next.has(legacy)) continue;
    for (const key of expansions) {
      if (ALL_PERMISSION_KEYS_SET.has(key) && !STRICT_MATRIX_KEYS.has(key)) next.add(key);
    }
  }
  return next;
}

/** Resolve a requested permission key to keys that satisfy it (any match = allowed). */
export function resolvePermissionCheckKeys(key) {
  if (STRICT_MATRIX_KEYS.has(key)) return [key];
  const aliases = new Set();
  if (LEGACY_PERMISSION_MAP[key]) {
    aliases.add(key);
    for (const mapped of LEGACY_PERMISSION_MAP[key]) aliases.add(mapped);
  } else if (ALL_PERMISSION_KEYS_SET.has(key)) {
    aliases.add(key);
  } else {
    aliases.add(key);
  }
  // Reverse: a fine key is also satisfied by a legacy grant that expands to it.
  for (const [legacy, expansions] of Object.entries(LEGACY_KEY_EXPANSION)) {
    if (expansions.includes(key)) aliases.add(legacy);
  }
  return [...aliases];
}

/**
 * Drop keys whose dependsOn parents are not granted; returns a new Set.
 */
export function enforcePermissionDependencies(grantedSet) {
  const next = new Set(grantedSet);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [key, deps] of Object.entries(PERMISSION_DEPENDENCIES)) {
      if (!next.has(key)) continue;
      if (!deps.every(d => next.has(d))) {
        next.delete(key);
        changed = true;
      }
    }
  }
  return next;
}

export const VIEW_PERMISSION_TO_MODULE_FLAG = {
  "dashboard.view": "dashboard_enabled",
  "home.view": "dashboard_enabled",
  "planning.view": "planning_enabled",
  "contacts.view": "contact_enabled",
  "prestataires.view": "prestataire_enabled",
  "contracts.view": "contrat_enabled",
  "services.view": "service_enabled",
  "tickets.view": "tickets_enabled",
  "sales.view": "sales_enabled",
  "infrastructure.view": "infrastructure_enabled",
  "supervision.view": "infrastructure_enabled",
  "equipment_inventory.view": "equipment_inventory_enabled",
  "monitoring.view": "monitoring_enabled",
  "cybersecurite.view": "cybersecurite_enabled",
  "documents.view": "documents_enabled",
  "vault.view": "documents_enabled",
  "knowledge_base.view": "knowledge_base_enabled",
  "configurateur.view": "configurateur_enabled",
  "config.view": "administration_enabled",
  ...Object.fromEntries((PERMISSION_CATALOG_NORMALIZED.find(group => group.group === "admin_panel")?.actions || []).map(action => [permissionKey("admin_panel", action.action), "administration_enabled"]))
};

export const ACCESS_KEY_TO_VIEW_PERMISSIONS = {
  Dashboard: ["dashboard.view", "home.view"],
  Planning: ["planning.view"],
  Ticket: ["tickets.view"],
  TicketSales: ["sales.view"],
  Service: ["services.view"],
  Contrat: ["contracts.view"],
  Contact: ["contacts.view"],
  Prestataire: ["prestataires.view"],
  Hardware: ["infrastructure.view", "supervision.view"],
  EquipmentInventory: ["equipment_inventory.view"],
  Cybersecurite: ["cybersecurite.view"],
  Mon: ["monitoring.view"],
  DocumentsHub: ["documents.view"],
  KnowledgeBase: ["knowledge_base.view"],
  Admin: ["config.view"]
};

export const MODULE_FLAG_TO_GROUPS = {
  dashboard_enabled: ["dashboard", "home"],
  planning_enabled: ["planning"],
  contact_enabled: ["contacts", "contacts_detail"],
  prestataire_enabled: ["prestataires", "prestataires_detail"],
  contrat_enabled: ["contracts"],
  service_enabled: ["services"],
  tickets_enabled: ["tickets", "tickets_detail"],
  sales_enabled: ["sales", "sales_detail"],
  infrastructure_enabled: ["infrastructure", "supervision"],
  equipment_inventory_enabled: ["equipment_inventory"],
  monitoring_enabled: ["monitoring"],
  cybersecurite_enabled: ["cybersecurite"],
  documents_enabled: ["documents", "vault"],
  knowledge_base_enabled: ["knowledge_base"],
  configurateur_enabled: ["configurateur"],
  administration_enabled: ["admin_panel"]
};

export function defaultPermissionsForProfile(profileRow = {}) {
  const granted = new Set();
  for (const group of PERMISSION_CATALOG_NORMALIZED) {
    if (group.adminOnly) continue;
    let enabled;
    if (group.moduleFlag) {
      enabled = Boolean(profileRow[group.moduleFlag]);
    } else if (group.coreDefault) {
      enabled = true;
    } else {
      enabled = false;
    }
    if (!enabled) continue;
    for (const action of group.actions) {
      if (action.action === "view") {
        granted.add(permissionKey(group.group, "view"));
      }
    }
  }
  return granted;
}

/** Catalog payload for admin matrix (excludes matrix:false actions/groups unless includeHidden). */
export function getMatrixCatalog({
  includeAdminOnly = false,
  includeHidden = false
} = {}) {
  return PERMISSION_CATALOG_NORMALIZED.filter(group => {
    if (!includeAdminOnly && group.adminOnly) return false;
    if (!includeHidden && group.matrix === false) return false;
    return true;
  }).map(group => ({
    group: group.group,
    label: group.label,
    section: group.section || "autres",
    adminOnly: Boolean(group.adminOnly),
    actions: group.actions.filter(a => includeHidden || a.matrix !== false).map(action => ({
      action: action.action,
      key: permissionKey(group.group, action.action),
      label: action.label || PERMISSION_ACTION_LABELS[action.action] || action.action,
      dependsOn: action.dependsOn || []
    }))
  })).filter(g => g.actions.length > 0);
}
