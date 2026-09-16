import React from "react";
import { Icon as IconifyIcon } from "@iconify/react";
import infraStyles from "./ReportSummaryInfrastructure.module.css";

export function ReportCategoryKpisBlock({
  items = []
}) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <section className={`${infraStyles.globalStatsBlock} ${infraStyles.serverKpisBlock}`}>
      <div className={infraStyles.globalStatsGrid}>
        {items.map(item => (
          <div key={item.label} className={infraStyles.globalStatsItem}>
            <div className={infraStyles.globalStatsLabel}>
              {item.icon && (
                <span className={infraStyles.globalStatsIcon}>
                  <IconifyIcon icon={item.icon} width={16} height={16} color={item.iconColor} />
                </span>
              )}
              {item.label}
            </div>
            <div className={infraStyles.globalStatsValue}>{item.value}</div>
            {item.hint && <div className={infraStyles.globalStatsHint}>{item.hint}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}

export function ReportSummaryIntro({
  title,
  icon = "mdi:clipboard-text-outline",
  clientPrefix = "",
  clientMainLabel = "",
  periodLabel = "",
  kpis = []
}) {
  return (
    <div className={infraStyles.overviewContainer}>
      <div className={infraStyles.globalIntro}>
        <div className={infraStyles.globalIntroHeader}>
          <span className={infraStyles.globalIntroIcon}>
            <IconifyIcon icon={icon} width={22} height={22} />
          </span>
          <h3 className={infraStyles.globalIntroTitle}>{title}</h3>
        </div>
        <p className={infraStyles.globalIntroText}>
          {clientPrefix ? `${clientPrefix} — ` : ""}
          {clientMainLabel}
          {periodLabel ? ` · ${periodLabel}` : ""}
        </p>
      </div>
      <ReportCategoryKpisBlock items={kpis} />
    </div>
  );
}

export function ReportSummarySection({
  icon,
  title,
  subtitle,
  children
}) {
  return (
    <section className={infraStyles.section}>
      <div className={infraStyles.sectionHeader}>
        <div className={infraStyles.sectionTitleWrapper}>
          <span className={infraStyles.sectionIcon}>
            <IconifyIcon icon={icon} width={28} height={28} />
          </span>
          <div>
            <h4 className={infraStyles.sectionTitle}>{title}</h4>
            {subtitle ? <div className={infraStyles.sectionSubtitle}>{subtitle}</div> : null}
          </div>
        </div>
      </div>
      <div className={infraStyles.sectionTitleSeparator} />
      {children}
    </section>
  );
}

export function ReportTableBlock({
  title,
  count,
  columns,
  rows,
  emptyMessage = "Aucune donnée.",
  wrapperClassName = ""
}) {
  if (!Array.isArray(rows) || rows.length === 0) {
    if (!emptyMessage) return null;
    return <div className={infraStyles.infraTableEmpty}>{emptyMessage}</div>;
  }
  return (
    <div className={infraStyles.tableBlock}>
      {title && (
        <h5 className={infraStyles.tableBlockTitle}>
          {title}
          {count != null && <span className={infraStyles.tableBlockCount}>({count})</span>}
        </h5>
      )}
      <div className={`${infraStyles.infraTableWrapper} ${wrapperClassName}`.trim()}>
        <table className={infraStyles.infraTable}>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.id} className={infraStyles.infraTableHeaderCell}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={row._rowKey || row.id || row.key || rowIdx} className={infraStyles.infraTableRow}>
                {columns.map(col => (
                  <td key={col.id} className={infraStyles.infraTableCell}>
                    {typeof col.render === "function" ? col.render(row, rowIdx) : row[col.id] ?? "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
