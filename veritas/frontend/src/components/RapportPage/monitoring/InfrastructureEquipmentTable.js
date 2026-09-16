import React, { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import equipmentStyles from "../../EquipementPage/EquipmentPage.module.css";
import styles from "./RapportMonitoringBuilder.module.css";
import { MonitoringStepHeader } from "./MonitoringStepLayout";
import {
  isEquipmentMappedForCheckMK,
  getCheckMKCachedData,
  countCheckMKMonitoredServices,
  computeCheckMKEquipmentStatus,
  resolveCheckMKEquipmentKey
} from "./checkmkReportCacheUtils";
import ReportEquipmentRemoteAccessButton from "./ReportEquipmentRemoteAccessButton";
import { hasReportRemoteAccessConfigured } from "./reportEquipmentRemoteAccess";

function resolveMonitoringSyncStatus(item, equipmentKey, monitoringSyncStatus, equipmentCheckMKData) {
  const statusKey = resolveCheckMKEquipmentKey(item, equipmentKey);
  const fromMap = statusKey ? monitoringSyncStatus?.[statusKey] : null;
  if (fromMap === "ok" || fromMap === "warn" || fromMap === "critical") {
    return fromMap;
  }
  const cached = getCheckMKCachedData(equipmentCheckMKData, item, equipmentKey);
  if (cached) {
    const criticalEvents = Array.isArray(cached.events)
      ? cached.events.filter(event => Number(event?.state) === 2)
      : [];
    return computeCheckMKEquipmentStatus({
      services: Array.isArray(cached.services) ? cached.services : [],
      events: criticalEvents,
      availability: cached.availability,
      eventsCount: criticalEvents.length
    });
  }
  return fromMap || null;
}

function InsightCountCell({ count, tone = "neutral", emptyLabel = "—" }) {
  const n = Number(count) || 0;
  if (n <= 0) {
    return <span className={styles.insightMuted}>{emptyLabel}</span>;
  }
  return (
    <span className={`${styles.insightCount} ${styles[`insightCount_${tone}`] || ""}`}>
      {n}
    </span>
  );
}

function MonitoredServicesCell({ item, equipmentKey, equipmentCheckMKData }) {
  const count = countCheckMKMonitoredServices(getCheckMKCachedData(equipmentCheckMKData, item, equipmentKey));
  if (count == null) {
    return <span className={styles.insightMuted}>—</span>;
  }
  return (
    <span className={`${styles.insightCount} ${styles.insightCount_service}`} title="Services monitorés">
      {count}
    </span>
  );
}

export default function InfrastructureEquipmentTable({
  title,
  equipments,
  columns,
  moduleKey,
  onOpenComments,
  onCreateTicket,
  onSyncCheckMK,
  onOpenCheckMKDetail,
  clientId,
  commentCounts,
  ticketCounts,
  alertCounts = {},
  highlightedEquipmentKey,
  reportPeriod,
  monitoringSyncStatus = {},
  equipmentCheckMKData = {},
  syncingEquipmentKey = null,
  externalLink = null,
  forceSyncButton = false,
  renderExtraActions = null,
  headerActions = null,
  showSearch = true,
  onEditEquipment = null,
  showActions = true,
  showInsightColumns = true,
  emptyMessage = null,
  totalCountLabel = null
}) {
  const [search, setSearch] = useState("");
  const safeEquipments = Array.isArray(equipments) ? equipments : [];
  const filteredEquipments = useMemo(() => {
    if (!search.trim()) {
      return safeEquipments;
    }
    const q = search.trim().toLowerCase();
    return safeEquipments.filter(item => {
      const candidate = `${item.nom || item.name || item.solution || item.logiciel || ""} ${item.site || item.location || ""} ${item.ip || ""}`.toLowerCase();
      return candidate.includes(q);
    });
  }, [safeEquipments, search]);

  const displayColumns = useMemo(() => {
    const base = Array.isArray(columns) ? columns : [];
    if (!showInsightColumns) return base;
    const showServicesColumn = typeof onOpenCheckMKDetail === "function";
    const insightCols = [];
    if (showServicesColumn) {
      insightCols.push({
        id: "__insight_services",
        label: "Services",
        render: (item, ctx) => (
          <MonitoredServicesCell
            item={item}
            equipmentKey={ctx.equipmentKey}
            equipmentCheckMKData={equipmentCheckMKData}
          />
        )
      });
    }
    insightCols.push({
      id: "__insight_tickets",
      label: "Tickets",
      render: (item, ctx) => (
        <InsightCountCell
          count={ticketCounts?.[ctx.equipmentKey] || 0}
          tone="ticket"
        />
      )
    });
    return [...base, ...insightCols];
  }, [columns, showInsightColumns, ticketCounts, equipmentCheckMKData, onOpenCheckMKDetail]);

  const getMonitoringButtonClass = (isMappedForMonitoring, syncStatus) => {
    const base = equipmentStyles.mappingActionButton;
    if (!isMappedForMonitoring) return base;
    if (syncStatus === "critical") return `${base} ${styles.monitoringBtnCritical}`;
    if (syncStatus === "warn") return `${base} ${styles.monitoringBtnWarn}`;
    if (syncStatus === "ok") return `${base} ${styles.monitoringBtnOk}`;
    // Mapped but not yet synced (or sync failed) → keep neutral mapped style
    return `${base} ${styles.monitoringBtnMapped}`;
  };

  const countLabel = safeEquipments.length === 0 ? emptyMessage || "No equipment found for this module." : totalCountLabel || `${safeEquipments.length} equipment item(s) in total`;
  return <section className={styles.infraTableSection}>
      <MonitoringStepHeader title={title} countLabel={countLabel} showSearch={showSearch && safeEquipments.length > 0} searchValue={search} onSearchChange={setSearch} onSearchClear={() => setSearch("")} headerActions={headerActions} />

      {safeEquipments.length === 0 ? <div className={styles.infraTableEmpty}>
          {emptyMessage || "No equipment recorded for this client on this module."}
        </div> : <div className={equipmentStyles.hardwarePageEmbedded}>
          <div className={equipmentStyles.tableWrapperEmbedded}>
            <table className={equipmentStyles.equipmentTableEmbedded}>
              <thead>
                <tr>
                  {displayColumns.map(col => <th key={col.id || col.accessor}>
                      <span className={equipmentStyles.thContent}>{col.label}</span>
                    </th>)}
                  {showActions && <th className={styles.infraTableActions}>
                      <span className={equipmentStyles.thContent}>Action</span>
                    </th>}
                </tr>
              </thead>
              <tbody>
                {filteredEquipments.map((item, index) => {
              const nameForKey = item.nom || item.name || item.logiciel || `#${index}`;
              const equipmentKey = item.commentKey || item.id || item.uuid || item.glpi_id || `${moduleKey || "module"}:${nameForKey}`;
              const commentCount = commentCounts && commentCounts[equipmentKey] || 0;
              const isHighlighted = highlightedEquipmentKey != null && String(highlightedEquipmentKey) === String(equipmentKey);
              const isMappedForMonitoring = isEquipmentMappedForCheckMK(item) || Boolean(getCheckMKCachedData(equipmentCheckMKData, item, equipmentKey));
              const syncStatus = resolveMonitoringSyncStatus(item, equipmentKey, monitoringSyncStatus, equipmentCheckMKData);
              const hasMonitoringAction = typeof onOpenCheckMKDetail === "function";
              const hasCommentsAction = typeof onOpenComments === "function";
              const hasTicketAction = typeof onCreateTicket === "function" && !!clientId;
              const hasExtraActions = typeof renderExtraActions === "function";
              const hasExternalLink = !!externalLink?.url;
              const hasEditAction = typeof onEditEquipment === "function";
              const hasRemoteAccessAction = hasReportRemoteAccessConfigured(item, moduleKey);
              const hasMainActions = hasMonitoringAction || hasCommentsAction || hasTicketAction || hasExtraActions || hasExternalLink || hasRemoteAccessAction;
              return <tr key={equipmentKey} className={`${equipmentStyles.equipmentRow} ${equipmentStyles.equipmentRowEmbedded} ${isHighlighted ? styles.infraTableRowHighlight : ""}`} data-report-highlight={isHighlighted ? "true" : undefined}>
                      {displayColumns.map(col => {
                  const value = typeof col.render === "function" ? col.render(item, {
                    moduleKey,
                    equipmentKey
                  }) : col.accessor ? item[col.accessor] : null;
                  return <td key={col.id || col.accessor}>
                            {value ?? "-"}
                          </td>;
                })}
                      {showActions && <td className={styles.infraTableActions} onClick={e => e.stopPropagation()}>
                        <div className={equipmentStyles.mappingActions}>
                          <div className={equipmentStyles.mappingActionsGroup}>
                            {hasMonitoringAction && <button type="button" className={getMonitoringButtonClass(isMappedForMonitoring, syncStatus)} title={isMappedForMonitoring ? (syncStatus === "ok" ? "Supervision OK — voir le détail" : syncStatus === "warn" ? "Supervision : alertes — voir le détail" : syncStatus === "critical" ? "Supervision : critique — voir le détail" : syncStatus ? "Voir le détail supervision" : "Synchronisation en cours ou à lancer — ouvrir le détail") : "Non mappé à une supervision"} disabled={!isMappedForMonitoring} onClick={() => onOpenCheckMKDetail(item, {
                        moduleKey,
                        equipmentKey,
                        reportPeriod
                      })}>
                                <Icon icon="simple-icons:checkmk" width={16} height={16} />
                              </button>}
                            {hasCommentsAction && <span className={styles.infraActionBadgeWrap}>
                                <button type="button" className={`${equipmentStyles.mappingActionButton} ${isHighlighted ? styles.monitoringBtnActiveComment : ""}`.trim()} title={commentCount > 0 ? "Voir / ajouter une note au rapport" : "Commenter dans le rapport"} onClick={event => {
                          event.preventDefault();
                          event.stopPropagation();
                          onOpenComments(item, {
                            moduleKey,
                            equipmentKey
                          });
                        }}>
                                  <Icon icon="mdi:comment-text-outline" width={16} height={16} />
                                </button>
                                {commentCount > 0 && <span className={styles.infraCommentBadge}>
                                    {commentCount}
                                  </span>}
                              </span>}
                            {hasExtraActions ? renderExtraActions(item, {
                        moduleKey,
                        equipmentKey
                      }) : null}
                            <ReportEquipmentRemoteAccessButton equipment={item} moduleKey={moduleKey} />
                            {hasExternalLink && <a href={externalLink.url} target="_blank" rel="noopener noreferrer" className={equipmentStyles.mappingActionButton} title={externalLink.title || "Open dans un nouvel onglet"} style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        textDecoration: "none"
                      }}>
                                <Icon icon="mdi:open-in-new" width={16} height={16} />
                              </a>}
                          </div>
                          {hasEditAction && <div className={equipmentStyles.mappingActionsEdit}>
                              {hasMainActions && <span className={equipmentStyles.mappingActionsSeparator} aria-hidden="true" />}
                              <button type="button" className={equipmentStyles.mappingActionButton} title="Edit equipment" onClick={() => onEditEquipment(item, {
                        moduleKey,
                        equipmentKey
                      })}>
                                <Icon icon="mdi:pencil" width={16} height={16} />
                              </button>
                            </div>}
                        </div>
                      </td>}
                    </tr>;
            })}
              </tbody>
            </table>
          </div>
        </div>}
    </section>;
}
