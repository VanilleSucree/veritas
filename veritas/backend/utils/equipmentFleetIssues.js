import { computeMonitoringSummary } from "../routes/integrations/checkmk/equipmentMonitoringSync.js";
import { isCheckmkIntegrationEnabled } from "./checkmkIntegrationStatus.js";
import { fetchEquipmentFleetList } from "./equipmentFleetList.js";
import { loadAgentLastSeenMap, loadCheckmkMonitoringMap } from "./equipmentInventoryScan.js";
import { evaluateEquipmentSupervisionCriteria } from "./equipmentSupervisionEvaluator.js";
import {
  getEvaluationThresholdsFromRules,
  getOfflineAlertThresholdMinutesFromRules,
  getSupervisionAlertRules,
  isSupervisionCriterionEnabled
} from "./supervisionAlertRules.js";

/** Alerts from a monitoring integration (CheckMK is currently the only one). */
const MONITORING_INTEGRATION_ALERT_KEYS = new Set(["monitor_critical", "monitor_warning", "no_data"]);

function isMappedViaMonitoringIntegration(equipment) {
  const mapping = equipment?.checkmkMapping;
  const host = String(mapping?.checkmk_host_name || mapping?.checkmkHostName || "").trim();
  if (!host) return false;
  return mapping?.is_active !== false;
}

const ISSUE_META = {
  monitor_critical: { label: "Critical", tone: "bad", priority: 0, monitorStatus: "critical" },
  monitor_warning: { label: "Warning", tone: "warn", priority: 1, monitorStatus: "warning" },
  agent_offline: { label: "Agent hors ligne", tone: "bad", priority: 0, monitorStatus: "offline" },
  unmapped: { label: "Not mapped to supervision", tone: "warn", priority: 2, monitorStatus: "unmapped" },
  no_data: { label: "No monitoring data", tone: "warn", priority: 3, monitorStatus: "no_data" },
  warranty_expired: { label: "Warranty expired", tone: "bad", priority: 1, monitorStatus: "ok" },
  warranty_soon: { label: "Warranty expires soon", tone: "warn", priority: 2, monitorStatus: "ok" },
  maintenance_expired: { label: "Maintenance license expired", tone: "bad", priority: 0, monitorStatus: "ok" },
  maintenance_soon: { label: "Maintenance license soon", tone: "warn", priority: 1, monitorStatus: "ok" },
  battery_expired: { label: "Battery to replace", tone: "bad", priority: 1, monitorStatus: "ok" },
  battery_soon: { label: "Battery to monitor", tone: "warn", priority: 2, monitorStatus: "ok" },
  updates_pending: { label: "Pending updates", tone: "warn", priority: 1, monitorStatus: "ok" },
  disk_critical: { label: "Critical disk", tone: "bad", priority: 0, monitorStatus: "ok" },
  disk_warn: { label: "Disk warning", tone: "warn", priority: 2, monitorStatus: "ok" },
  missing_ip: { label: "Missing IP", tone: "warn", priority: 3, monitorStatus: "ok" }
};

function formatMonitorIssueLabel(severityLabel, detail) {
  const fromPrimary = String(detail?.primaryService || detail?.serviceName || "").trim();
  if (fromPrimary) return `${severityLabel} - ${fromPrimary}`;
  const fromList = Array.isArray(detail?.failingServices)
    ? detail.failingServices.map(name => String(name || "").trim()).filter(Boolean)
    : [];
  if (fromList.length) return `${severityLabel} - ${fromList.slice(0, 2).join(" / ")}`;
  return severityLabel;
}

function toSupervisionFamily(equipment) {
  const type = String(equipment?.type || "").trim();
  if (type === "Servers" || type === "Serveurs" || type === "Server") return "servers";
  if (type === "NAS" || type === "Storage" || type === "Stockage") return "stockage";
  if (type === "Firewalls" || type === "Firewall") return "firewall";
  if (type === "BorneWifi") return "wifi";
  if (type === "Ordinateurs") return "ordinateurs";
  if (type === "Alimentation") return "alimentation";
  if (type === "Routeur") return "routeur";
  if (type === "TOIP") return "toip";
  if (type === "Internet") return "internet";
  if (type === "Switch") return "switch";
  const family = String(equipment?.family || "").toLowerCase();
  if (family === "nas") return "stockage";
  if (family === "firewalls") return "firewall";
  if (family === "serveurs" || family === "server") return "servers";
  if (family === "bornewifi") return "wifi";
  return family || null;
}

function lookupCheckmkRow(checkmkMap, clientId, equipmentId, family) {
  const id = String(equipmentId || "");
  const client = String(clientId ?? "");
  const fam = String(family || "").toLowerCase();
  const aliases = new Set();
  if (fam) aliases.add(fam);
  if (fam === "stockage" || fam === "nas") {
    aliases.add("stockage");
    aliases.add("nas");
  }
  if (fam === "firewall" || fam === "firewalls") {
    aliases.add("firewall");
    aliases.add("firewalls");
  }
  if (fam === "servers" || fam === "server" || fam === "serveurs") {
    aliases.add("servers");
    aliases.add("serveurs");
  }
  if (fam === "wifi" || fam === "bornewifi") {
    aliases.add("wifi");
    aliases.add("bornewifi");
  }
  for (const alias of aliases) {
    const row = checkmkMap.get(`${client}:${id}:${alias}`);
    if (row) return row;
  }
  const byId = checkmkMap.get(`${client}:${id}`);
  if (byId) return byId;
  for (const [key, row] of checkmkMap.entries()) {
    if (key.startsWith(`${client}:${id}:`)) return row;
  }
  return null;
}

function buildEvaluationData(equipment) {
  const raw = equipment?.rawData && typeof equipment.rawData === "object" ? equipment.rawData : {};
  return {
    ...raw,
    source: raw.source || (equipment.agentManaged ? "rmm" : undefined),
    agentId: equipment.rmmAgentId || raw.agentId || raw.agent_id,
    agent_id: equipment.rmmAgentId || raw.agent_id || raw.agentId,
    agentOnline: equipment.agentOnline ?? raw.agentOnline,
    expirationGarantie: equipment.expirationGarantie || raw.expirationGarantie,
    dateBatterie: equipment.dateBatterie || raw.dateBatterie,
    licences: equipment.licences || raw.licences,
    typeServer: equipment.typeServer || raw.typeServer || raw.type,
    type: equipment.typeServer || raw.type,
    ip: equipment.ip || raw.ip,
    ipNonFixe: raw.ipNonFixe,
    checkmk_host_name: equipment.checkmkMapping?.checkmk_host_name || raw.checkmk_host_name
  };
}

function mapCriterionToIssue(criterion) {
  const key = criterion?.key;
  const meta = ISSUE_META[key] || {
    label: key || "Issue",
    tone: "warn",
    priority: 5,
    monitorStatus: "ok"
  };
  let label = meta.label;
  let detail;
  const d = criterion?.detail;
  if (key === "monitor_critical" || key === "monitor_warning") {
    label = formatMonitorIssueLabel(meta.label, d);
  } else if (key === "updates_pending" && d?.pendingCount != null) {
    label = `${d.pendingCount} pending update${d.pendingCount > 1 ? "s" : ""}`;
  } else if ((key === "disk_critical" || key === "disk_warn") && d?.pct != null) {
    label = `Disk ${d.pct}% used`;
    detail = d.drive || undefined;
  } else if (d?.date) {
    detail = String(d.date);
  }
  return {
    key,
    label,
    detail,
    tone: meta.tone,
    priority: meta.priority,
    monitorStatus: meta.monitorStatus
  };
}

function toLeanEquipment(equipment) {
  return {
    id: equipment.id || equipment.dbId,
    dbId: equipment.dbId || equipment.id,
    clientId: equipment.clientId,
    clientName: equipment.clientName,
    type: equipment.type,
    family: equipment.family,
    name: equipment.name,
    ip: equipment.ip || "",
    serial: equipment.serial || "",
    location: equipment.location || "",
    model: equipment.model || "",
    mac: equipment.mac || "",
    manufacturer: equipment.manufacturer || "",
    typeServer: equipment.typeServer || "",
    systeme: equipment.systeme || "",
    expirationGarantie: equipment.expirationGarantie || null,
    dateBatterie: equipment.dateBatterie || null,
    licences: equipment.licences,
    agentOnline: equipment.agentOnline,
    agentManaged: equipment.agentManaged,
    rmmAgentId: equipment.rmmAgentId || null,
    agentVersion: equipment.agentVersion || null,
    checkmkMapping: equipment.checkmkMapping || null,
    rawData: equipment.rawData || {},
    is_active: equipment.is_active !== false,
    status: "unknown"
  };
}

/**
 * Supervision center alerts: only devices mapped via a monitoring integration
 * (CheckMK today) and only that integration's statuses (critical / warning / no data).
 */
export async function fetchEquipmentFleetIssues() {
  const [fleet, checkmkMap, agentMap, rules, checkmkEnabled] = await Promise.all([
    fetchEquipmentFleetList(),
    loadCheckmkMonitoringMap(),
    loadAgentLastSeenMap(),
    getSupervisionAlertRules(),
    isCheckmkIntegrationEnabled()
  ]);

  const offlineAlertThresholdMinutes = getOfflineAlertThresholdMinutesFromRules(rules);
  const items = [];

  if (!checkmkEnabled) {
    return {
      items,
      meta: {
        scanned: fleet.length,
        withIssues: 0,
        checkmkEnabled
      }
    };
  }

  for (const equipment of fleet) {
    const family = toSupervisionFamily(equipment);
    if (!family) continue;
    if (!isMappedViaMonitoringIntegration(equipment)) continue;

    const isMkMapped = true;
    const mkRow = lookupCheckmkRow(checkmkMap, equipment.clientId, equipment.dbId, family);
    const checkmkSummary = mkRow
      ? computeMonitoringSummary(mkRow.monitoring_data, mkRow.last_synced_at)
      : null;

    const data = buildEvaluationData(equipment);
    const agentId = equipment.rmmAgentId || data.agentId || null;
    const lastSeenAt = agentId ? agentMap.get(String(agentId)) || data.lastInventoryAt || data.last_seen_at || null : data.lastInventoryAt || null;
    const thresholds = getEvaluationThresholdsFromRules(family, rules);

    let criteria = evaluateEquipmentSupervisionCriteria({
      equipmentFamily: family,
      data,
      name: equipment.name,
      ip: equipment.ip || null,
      agentId,
      lastSeenAt,
      checkmkSummary,
      isMkMapped,
      offlineAlertThresholdMinutes,
      thresholds
    });

    criteria = criteria.filter(c => MONITORING_INTEGRATION_ALERT_KEYS.has(c.key));
    criteria = criteria.filter(c => isSupervisionCriterionEnabled(family, c.key, rules));
    if (!criteria.length) continue;

    const issues = criteria.map(mapCriterionToIssue).sort((a, b) => (a.priority ?? 9) - (b.priority ?? 9));
    const primaryIssue = issues[0];
    const monitorStatus = primaryIssue?.monitorStatus || "ok";

    items.push({
      equipment: toLeanEquipment(equipment),
      monitorStatus,
      issues,
      primaryIssue,
      priority: primaryIssue?.priority ?? 9
    });
  }

  items.sort((a, b) => (a.priority ?? 9) - (b.priority ?? 9));

  return {
    items,
    meta: {
      scanned: fleet.length,
      withIssues: items.length,
      checkmkEnabled
    }
  };
}
