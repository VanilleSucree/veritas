import React, { useEffect, useMemo, useState } from "react";
import { Icon as IconifyIcon } from "@iconify/react";
import { getLicenseDisplayName, isFreeLicense } from "../../../ServicePage/TenantDetailTabs/utils";
import infraStyles from "./ReportSummaryInfrastructure.module.css";
import { REPORT_SERVICES_MODULES, sumEquipmentCountsForModules } from "./reportCategoryCounts";
import { ReportSummarySection } from "./ReportSummaryBlocks";
import { getClientMfaDetails } from "../../../../api/clientOffice365";
import { filterExchangeDataByPeriod, filterTeamsDataByPeriod } from "../../../ServicePage/TenantDetailTabs/office365Period";
function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("fr-FR");
}
function formatInt(value) {
  if (value == null || Number.isNaN(Number(value))) return "-";
  return Number(value).toLocaleString("fr-FR");
}
function parsePeriodDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}
function filterActivityByReportPeriod(dailyActivity = [], reportStart = null, reportEnd = null) {
  if (!Array.isArray(dailyActivity) || dailyActivity.length === 0) return [];
  const startTs = reportStart instanceof Date && !Number.isNaN(reportStart.getTime()) ? reportStart.getTime() : null;
  const endTs = reportEnd instanceof Date && !Number.isNaN(reportEnd.getTime()) ? reportEnd.getTime() : null;
  if (startTs == null && endTs == null) return dailyActivity;
  return dailyActivity.filter(day => {
    const date = parsePeriodDate(day?.date);
    if (!date) return false;
    const ts = date.getTime();
    if (startTs != null && ts < startTs) return false;
    if (endTs != null && ts > endTs) return false;
    return true;
  });
}
function getWeekMeta(dateValue) {
  const date = parsePeriodDate(dateValue);
  if (!date) return null;
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((utcDate - yearStart) / 86400000 + 1) / 7);
  const year = utcDate.getUTCFullYear();
  return {
    key: `${year}-W${String(weekNo).padStart(2, "0")}`,
    label: `Semaine ${weekNo} - ${year}`,
    sortDate: utcDate.getTime()
  };
}
function aggregateEmailActivityByWeek(dailyActivity = []) {
  if (!Array.isArray(dailyActivity) || dailyActivity.length === 0) return [];
  const buckets = {};
  dailyActivity.forEach(day => {
    const week = getWeekMeta(day?.date);
    if (!week) return;
    if (!buckets[week.key]) {
      buckets[week.key] = {
        period: week.label,
        sent: 0,
        received: 0,
        read: 0,
        _sortDate: week.sortDate
      };
    }
    buckets[week.key].sent += Number(day?.sent || 0);
    buckets[week.key].received += Number(day?.received || 0);
    buckets[week.key].read += Number(day?.read || 0);
    buckets[week.key]._sortDate = Math.min(buckets[week.key]._sortDate, week.sortDate);
  });
  return Object.values(buckets).sort((a, b) => a._sortDate - b._sortDate);
}
function aggregateTeamsActivityByWeek(dailyActivity = []) {
  if (!Array.isArray(dailyActivity) || dailyActivity.length === 0) return [];
  const buckets = {};
  dailyActivity.forEach(day => {
    const week = getWeekMeta(day?.date);
    if (!week) return;
    if (!buckets[week.key]) {
      buckets[week.key] = {
        period: week.label,
        channelMessages: 0,
        chatMessages: 0,
        oneOnOneCalls: 0,
        totalMeetings: 0,
        _sortDate: week.sortDate
      };
    }
    buckets[week.key].channelMessages += Number(day?.channelMessages || 0);
    buckets[week.key].chatMessages += Number(day?.chatMessages || 0);
    buckets[week.key].oneOnOneCalls += Number(day?.oneOnOneCalls || 0);
    buckets[week.key].totalMeetings += Number(day?.totalMeetings || 0);
    buckets[week.key]._sortDate = Math.min(buckets[week.key]._sortDate, week.sortDate);
  });
  return Object.values(buckets).sort((a, b) => a._sortDate - b._sortDate);
}
function isLikelyServiceAccountFromUser(user) {
  const name = (user.name || user.displayName || "").toString();
  const upn = (user.userPrincipalName || user.email || "").toString();
  const email = (user.email || "").toString();
  const combined = `${name} ${upn} ${email}`.toLowerCase();
  const patterns = [/aad_/, /msol_/, /sync_/, /svc_/, /service_/, /\$@/, /_srv/, /_service/, /_sync/, /compte de service|service account|compte service/, /bot\./, /bot@/, /connector/, /automation/, /azure ad sync|ad sync|dirsync|aadconnect|dir sync/, /directory synchronization|synchronization service|on-premises/, /healthmailbox|systemmailbox|federatedemail/];
  return patterns.some(p => p.test(combined));
}
function getMfaUserForUser(user, mfaDetails) {
  const upn = (user.userPrincipalName || user.email || "").toLowerCase().trim();
  const userId = user.id;
  return Array.isArray(mfaDetails) && mfaDetails.find(m => {
    const mUpn = (m.userPrincipalName || m.user_principal_name || "").toLowerCase().trim();
    if (mUpn && upn && mUpn === upn) return true;
    if (userId && m.id && String(m.id) === String(userId)) return true;
    return false;
  }) || null;
}
const IGNORED_MFA_METHODS = new Set(["passwordauthenticationmethod", "windowshelloforbusinessauthenticationmethod"]);
function userHasMfaFromMfaUser(mfaUser) {
  if (!mfaUser) return false;
  if (mfaUser.has_mfa === true) return true;
  const methods = mfaUser.mfa_methods || mfaUser.mfaMethods || [];
  if (!Array.isArray(methods)) return false;
  return methods.some(m => !IGNORED_MFA_METHODS.has(m));
}
function getMethodsFromMfaUser(mfaUser) {
  const methods = mfaUser?.mfa_methods || mfaUser?.mfaMethods || [];
  if (!Array.isArray(methods)) return [];
  return methods.filter(m => !IGNORED_MFA_METHODS.has(m));
}
function getTop3Methods(methodCounts) {
  if (!methodCounts || typeof methodCounts !== "object") return [];
  return Object.entries(methodCounts).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([key, count]) => ({
    key,
    count
  }));
}
function getMfaMethodLabelFromKey(methodKey) {
  switch (methodKey) {
    case "microsoftauthenticatorauthenticationmethod":
      return "Authenticator";
    case "phoneauthenticationmethod":
      return "Phone/SMS";
    case "fido2authenticationmethod":
      return "FIDO2 key";
    case "softwareoathauthenticationmethod":
      return "Software auth";
    case "temporaryaccesspassauthenticationmethod":
      return "Passe temporaire";
    case "emailauthenticationmethod":
      return "Email";
    default:
      return String(methodKey || "").replace("authenticationmethod", "").replace(/([A-Z])/g, " $1").trim();
  }
}
function ServicesNotificationLegend({
  commentTotal = 0,
  ticketTotal = 0
}) {
  return <div className={infraStyles.notificationLegend}>
      <span className={infraStyles.notificationLegendText}>
        Notification :
      </span>
      <span className={infraStyles.notificationLegendItem}>
        <span className={`${infraStyles.notificationDot} ${infraStyles.notificationDotComment}`}>
          {commentTotal}
        </span>
        Commentaires
      </span>
      <span className={infraStyles.notificationLegendItem}>
        <span className={`${infraStyles.notificationDot} ${infraStyles.notificationDotTicket}`}>
          {ticketTotal}
        </span>
        Tickets créés
      </span>
    </div>;
}
function getKpiIconColor(icon) {
  const key = String(icon || "").toLowerCase();
  if (key.includes("shield")) return "#10b981";
  if (key.includes("email")) return "#3b82f6";
  if (key.includes("chat") || key.includes("message") || key.includes("pound")) return "#6366f1";
  if (key.includes("phone") || key.includes("clock") || key.includes("timer")) return "#f59e0b";
  if (key.includes("account") || key.includes("user")) return "#06b6d4";
  if (key.includes("domain") || key.includes("web")) return "#8b5cf6";
  if (key.includes("database") || key.includes("harddisk")) return "#14b8a6";
  if (key.includes("file")) return "#0ea5e9";
  if (key.includes("license") || key.includes("percent")) return "#2563eb";
  return "#6b7280";
}
function KpiLabelWithIcon({
  icon,
  label,
  color = undefined
}) {
  return <div className={infraStyles.globalStatsLabel}>
      <span className={infraStyles.globalStatsIcon}>
        <IconifyIcon icon={icon} width={16} height={16} color={color || getKpiIconColor(icon)} />
      </span>
      {label}
    </div>;
}
export default function ReportSummaryServices({
  client,
  equipmentComments = {},
  equipmentCommentCounts = {},
  equipmentTicketCounts = {},
  embedded = false
}) {
  const modules = client?.modules_monitoring || {};
  const clientId = client?.id ?? client?.uuid ?? null;
  const reportStartDate = parsePeriodDate(client?.reportStartDate);
  const reportEndDate = parsePeriodDate(client?.reportEndDate);
  if (reportEndDate) {
    reportEndDate.setHours(23, 59, 59, 999);
  }
  const [mfaDetailsFromApi, setMfaDetailsFromApi] = useState([]);
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getClientMfaDetails(clientId);
        if (!cancelled && Array.isArray(res?.userMfaDetails)) {
          setMfaDetailsFromApi(res.userMfaDetails);
        }
      } catch {
        if (!cancelled) {
          setMfaDetailsFromApi([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);
  const o365Data = useMemo(() => {
    const raw = client?.equipements?.Office365;
    if (!raw) return null;
    const data = raw.data || raw;
    const licenses = Array.isArray(data.licences) ? data.licences : [];
    const users = Array.isArray(data.users) ? data.users : [];
    const mfaDetailsFromSnapshot = Array.isArray(data.mfaDetails) ? data.mfaDetails : Array.isArray(data.userMfaDetails) ? data.userMfaDetails : [];
    const mfaDetails = Array.isArray(mfaDetailsFromApi) && mfaDetailsFromApi.length > 0 ? mfaDetailsFromApi : mfaDetailsFromSnapshot;
    const exchangeData = filterExchangeDataByPeriod(data.exchangeData ?? data.exchange ?? null, {
      start: reportStartDate,
      end: reportEndDate
    });
    const teamsData = filterTeamsDataByPeriod(data.teamsData ?? data.teams ?? null, {
      start: reportStartDate,
      end: reportEndDate
    });
    const onedriveData = data.onedriveData ?? data.onedrive ?? null;
    const sharepointData = data.sharepointData ?? data.sharepoint ?? null;
    const securityData = data.securityData ?? data.security ?? null;
    const metrics = data.metrics || null;
    const totalLicenses = licenses.reduce((sum, lic) => sum + (Number(lic.total || lic.nombre || 0) || 0), 0);
    const usedLicenses = licenses.reduce((sum, lic) => sum + (Number(lic.utilisees || lic.used || 0) || 0), 0);
    const effectiveUsers = Array.isArray(users) ? users.filter(u => {
      const isService = u.isServiceAccount === true || u.isServiceAccount !== false && isLikelyServiceAccountFromUser(u);
      return !isService;
    }) : [];
    const totalUsers = effectiveUsers.length;
    let blockedCount = 0;
    let inactiveCount = 0;
    let activeCount = 0;
    let adminCount = 0;
    const now = Date.now();
    const period30 = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const period90 = new Date(now - 90 * 24 * 60 * 60 * 1000);
    effectiveUsers.forEach(u => {
      const mfaUser = getMfaUserForUser(u, mfaDetails);
      if (mfaUser && mfaUser.is_admin === true) {
        adminCount += 1;
      }
      if (u.accountEnabled === false) {
        blockedCount += 1;
        return;
      }
      const lastLogin = u.lastLoginDate ? new Date(u.lastLoginDate) : null;
      if (lastLogin && !Number.isNaN(lastLogin.getTime()) && lastLogin >= period30) {
        activeCount += 1;
      }
      if (!lastLogin || Number.isNaN(lastLogin?.getTime?.()) || lastLogin < period90) {
        inactiveCount += 1;
      }
    });
    const nonAdminCount = Math.max(0, totalUsers - adminCount);
    let usersWithMFA = 0;
    let usersWithoutMFA = 0;
    let adminsTotal = 0;
    let adminsWithMFA = 0;
    let adminsWithoutMFA = 0;
    let nonAdminWithMFA = 0;
    let nonAdminWithoutMFA = 0;
    const totalMethodCounts = {};
    const adminMethodCounts = {};
    const nonAdminMethodCounts = {};
    effectiveUsers.forEach(user => {
      const mfaUser = getMfaUserForUser(user, mfaDetails);
      if (!mfaUser) return;
      const hasMfa = userHasMfaFromMfaUser(mfaUser);
      const methods = getMethodsFromMfaUser(mfaUser);
      if (hasMfa) {
        usersWithMFA += 1;
        methods.forEach(m => {
          totalMethodCounts[m] = (totalMethodCounts[m] || 0) + 1;
        });
      } else {
        usersWithoutMFA += 1;
      }
      if (mfaUser.is_admin === true) {
        adminsTotal += 1;
        if (hasMfa) {
          adminsWithMFA += 1;
          methods.forEach(m => {
            adminMethodCounts[m] = (adminMethodCounts[m] || 0) + 1;
          });
        } else {
          adminsWithoutMFA += 1;
        }
      } else {
        if (hasMfa) {
          nonAdminWithMFA += 1;
          methods.forEach(m => {
            nonAdminMethodCounts[m] = (nonAdminMethodCounts[m] || 0) + 1;
          });
        } else {
          nonAdminWithoutMFA += 1;
        }
      }
    });
    const top3Total = getTop3Methods(totalMethodCounts).map(m => ({
      ...m,
      label: getMfaMethodLabelFromKey(m.key)
    }));
    const top3Admin = getTop3Methods(adminMethodCounts).map(m => ({
      ...m,
      label: getMfaMethodLabelFromKey(m.key)
    }));
    const top3NonAdmin = getTop3Methods(nonAdminMethodCounts).map(m => ({
      ...m,
      label: getMfaMethodLabelFromKey(m.key)
    }));
    const secureScore = metrics && metrics.secureScore || securityData && securityData.secureScore || null;
    return {
      licenses,
      users,
      exchangeData,
      teamsData,
      onedriveData,
      sharepointData,
      securityData,
      metrics,
      secureScore,
      usersKpi: {
        totalUsers,
        adminCount,
        nonAdminCount,
        activeCount,
        inactiveCount,
        blockedCount
      },
      securityUsersKpi: {
        totalUsers,
        usersWithMFA,
        usersWithoutMFA,
        adminsTotal,
        adminsWithMFA,
        adminsWithoutMFA,
        nonAdminWithMFA,
        nonAdminWithoutMFA,
        top3Total,
        top3Admin,
        top3NonAdmin
      },
      totalLicenses,
      usedLicenses
    };
  }, [client, mfaDetailsFromApi]);
  const domains = useMemo(() => {
    const raw = client?.equipements?.NDD;
    if (!Array.isArray(raw)) return [];
    return raw;
  }, [client]);
  const microsoftDomains = useMemo(() => {
    const set = new Set();
    const addDomain = value => {
      const raw = String(value || "").trim().toLowerCase();
      if (!raw) return;
      const normalized = raw.startsWith("@") ? raw.slice(1) : raw;
      if (!normalized || !normalized.includes(".")) return;
      set.add(normalized);
    };
    const users = Array.isArray(o365Data?.users) ? o365Data.users : [];
    users.forEach(u => {
      const upn = u?.userPrincipalName || u?.email || "";
      const at = String(upn).indexOf("@");
      if (at > -1) addDomain(String(upn).slice(at + 1));
    });
    const possibleDomains = [o365Data?.metrics?.domains, o365Data?.metrics?.verifiedDomains, o365Data?.exchangeData?.domains, o365Data?.exchangeData?.mailboxes?.domains, o365Data?.securityData?.domains, o365Data?.tenant?.domains];
    possibleDomains.forEach(entry => {
      if (Array.isArray(entry)) {
        entry.forEach(d => {
          if (typeof d === "string") addDomain(d);else if (d && typeof d === "object") {
            addDomain(d.name || d.domain || d.id || "");
          }
        });
      } else if (entry && typeof entry === "object") {
        Object.keys(entry).forEach(k => addDomain(k));
      } else if (typeof entry === "string") {
        addDomain(entry);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [o365Data]);
  const servicesCommentTotal = useMemo(() => sumEquipmentCountsForModules(equipmentCommentCounts, REPORT_SERVICES_MODULES, equipmentComments), [equipmentCommentCounts, equipmentComments]);
  const servicesTicketTotal = useMemo(() => sumEquipmentCountsForModules(equipmentTicketCounts, REPORT_SERVICES_MODULES, equipmentComments), [equipmentTicketCounts, equipmentComments]);
  const Wrapper = embedded ? React.Fragment : "div";
  const wrapperProps = embedded ? {} : { className: infraStyles.root };
  return <Wrapper {...wrapperProps}>
      {!embedded && modules.Office365 ? <div className={infraStyles.overviewContainer}>
          <ServicesNotificationLegend commentTotal={servicesCommentTotal} ticketTotal={servicesTicketTotal} />
        </div> : null}

      {modules.Office365 && <ReportSummarySection
        icon="mdi:microsoft-office"
        title="Office 365"
        subtitle="Microsoft 365 — licences et statistiques utilisateurs"
      >
        {!o365Data ? <div className={infraStyles.infraTableEmpty}>
            Aucune donnée Office 365 disponible pour ce client.
          </div> : <>
            {o365Data.usersKpi && o365Data.usersKpi.totalUsers > 0 && <div style={{
          marginTop: "0.75rem"
        }}>
                <div className={`${infraStyles.globalStatsGrid} ${infraStyles.globalStatsGridStylized}`}>
                  <div className={infraStyles.globalStatsItem}>
                    <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem"
              }}>
                      <IconifyIcon icon="mdi:account-multiple" width={18} height={18} />
                      <span className={infraStyles.globalStatsLabel}>Utilisateurs</span>
                    </div>
                    <div className={infraStyles.globalStatsValue}>
                      {formatInt(o365Data.usersKpi.totalUsers)}
                    </div>
                  </div>
                  <div className={infraStyles.globalStatsItem}>
                    <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem"
              }}>
                      <IconifyIcon icon="mdi:shield-account" width={18} height={18} color="#3b82f6" />
                      <span className={infraStyles.globalStatsLabel}>Administrateurs</span>
                    </div>
                    <div className={infraStyles.globalStatsValue}>
                      {formatInt(o365Data.usersKpi.adminCount)}
                    </div>
                  </div>
                  <div className={infraStyles.globalStatsItem}>
                    <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem"
              }}>
                      <IconifyIcon icon="mdi:account-outline" width={18} height={18} />
                      <span className={infraStyles.globalStatsLabel}>Non-administrateurs</span>
                    </div>
                    <div className={infraStyles.globalStatsValue}>
                      {formatInt(o365Data.usersKpi.nonAdminCount)}
                    </div>
                  </div>
                  <div className={infraStyles.globalStatsItem}>
                    <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem"
              }}>
                      <IconifyIcon icon="mdi:check-circle" width={18} height={18} color="#10b981" />
                      <span className={infraStyles.globalStatsLabel}>Actifs (30 j)</span>
                    </div>
                    <div className={infraStyles.globalStatsValue}>
                      {formatInt(o365Data.usersKpi.activeCount)}
                    </div>
                  </div>
                  <div className={infraStyles.globalStatsItem}>
                    <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem"
              }}>
                      <IconifyIcon icon="mdi:clock-outline" width={18} height={18} color="#f59e0b" />
                      <span className={infraStyles.globalStatsLabel}>Inactifs (&gt;90 j)</span>
                    </div>
                    <div className={infraStyles.globalStatsValue}>
                      {formatInt(o365Data.usersKpi.inactiveCount)}
                    </div>
                  </div>
                  <div className={infraStyles.globalStatsItem}>
                    <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem"
              }}>
                      <IconifyIcon icon="mdi:account-cancel" width={18} height={18} color="#ef4444" />
                      <span className={infraStyles.globalStatsLabel}>Bloqués</span>
                    </div>
                    <div className={infraStyles.globalStatsValue}>
                      {formatInt(o365Data.usersKpi.blockedCount)}
                    </div>
                  </div>
                </div>
              </div>}

            {microsoftDomains.length > 0 && <div style={{
          marginTop: "0.85rem"
        }}>
                <div className={infraStyles.infraTableWrapper}>
                  <table className={infraStyles.infraTable}>
                    <thead>
                      <tr>
                        <th className={infraStyles.infraTableHeaderCell}>Domaine</th>
                      </tr>
                    </thead>
                    <tbody>
                      {microsoftDomains.map(domain => <tr key={domain} className={infraStyles.infraTableRow}>
                          <td className={infraStyles.infraTableCell}>{domain}</td>
                        </tr>)}
                    </tbody>
                  </table>
                </div>
              </div>}

            {}
            {o365Data.licenses.length > 0 && <div>
                <div className={infraStyles.infraTableWrapper}>
                  <table className={infraStyles.infraTable}>
                    <thead>
                      <tr>
                        <th className={infraStyles.infraTableHeaderCell}>License type</th>
                        <th className={infraStyles.infraTableHeaderCell}>
                          Used
                        </th>
                        <th className={infraStyles.infraTableHeaderCell}>
                          Total
                        </th>
                        <th className={infraStyles.infraTableHeaderCell}>
                          Available
                        </th>
                        <th className={infraStyles.infraTableHeaderCell}>
                          Taux d&apos;utilisation
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {o365Data.licenses.map((lic, idx) => {
                  const total = Number(lic.total || lic.nombre || 0) || 0;
                  const used = Number(lic.utilisees || lic.used || 0) || 0;
                  const available = Math.max(0, total - used);
                  const usageRate = total > 0 ? Math.round(used / total * 100) : 0;
                  const free = isFreeLicense(lic);
                  return <tr key={lic.id || idx} className={infraStyles.infraTableRow}>
                            <td className={infraStyles.infraTableCell}>
                              <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        fontWeight: 500
                      }}>
                                {getLicenseDisplayName(lic.nom || lic.displayName || lic.name || lic.skuId || "-")}
                                {free && <IconifyIcon icon="mdi:gift-outline" width={16} height={16} color="#15D1A0" />}
                              </span>
                            </td>
                            <td className={infraStyles.infraTableCell}>
                              {formatInt(used)}
                            </td>
                            <td className={infraStyles.infraTableCell}>
                              {formatInt(total)}
                            </td>
                            <td className={infraStyles.infraTableCell}>
                              {formatInt(available)}
                            </td>
                            <td className={infraStyles.infraTableCell}>
                              {total > 0 ? `${usageRate}%` : "-"}
                            </td>
                          </tr>;
                })}
                    </tbody>
                  </table>
                </div>
              </div>}

            {}
            {o365Data.exchangeData && <section className={infraStyles.section}>
                <div className={infraStyles.sectionHeader}>
                  <div className={infraStyles.sectionTitleWrapper}>
                    <span className={infraStyles.sectionIcon}>
                      <IconifyIcon icon="simple-icons:microsoftexchange" width={34} height={34} color="#2563eb" />
                    </span>
                    <div>
                      <h4 className={infraStyles.sectionTitle}>Exchange</h4>
                      <div className={infraStyles.sectionSubtitle}>
                        Email and mailbox volume
                      </div>
                    </div>
                  </div>
                </div>
                <div className={infraStyles.sectionTitleSeparator} />

                {o365Data.exchangeData.emailActivity && <div className={`${infraStyles.globalStatsGrid} ${infraStyles.globalStatsGridStylized}`}>
                    {}
                    <div className={infraStyles.globalStatsItem}>
                      <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem"
              }}>
                        <IconifyIcon icon="mdi:email-send" width={18} height={18} color="#3b82f6" />
                        <span className={infraStyles.globalStatsLabel}>E-mails envoyés</span>
                      </div>
                      <div className={infraStyles.globalStatsValue}>
                        {typeof o365Data.exchangeData.emailActivity.sent === "number" ? o365Data.exchangeData.emailActivity.sent.toLocaleString("fr-FR") : "N/A"}
                      </div>
                      {typeof o365Data.exchangeData.emailActivity?.averages?.sent === "number" && <div className={infraStyles.globalStatsHint}>
                          Average&nbsp;:{" "}
                          {o365Data.exchangeData.emailActivity.averages.sent.toLocaleString("fr-FR")}{" "}
                          / day
                        </div>}
                    </div>

                    {}
                    <div className={infraStyles.globalStatsItem}>
                      <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem"
              }}>
                        <IconifyIcon icon="mdi:email-receive" width={18} height={18} color="#10b981" />
                        <span className={infraStyles.globalStatsLabel}>E-mails reçus</span>
                      </div>
                      <div className={infraStyles.globalStatsValue}>
                        {typeof o365Data.exchangeData.emailActivity.received === "number" ? o365Data.exchangeData.emailActivity.received.toLocaleString("fr-FR") : "N/A"}
                      </div>
                      {typeof o365Data.exchangeData.emailActivity?.averages?.received === "number" && <div className={infraStyles.globalStatsHint}>
                          Average&nbsp;:{" "}
                          {o365Data.exchangeData.emailActivity.averages.received.toLocaleString("fr-FR")}{" "}
                          / day
                        </div>}
                    </div>

                    {}
                    <div className={infraStyles.globalStatsItem}>
                      <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem"
              }}>
                        <IconifyIcon icon="mdi:email-open" width={18} height={18} color="#8b5cf6" />
                        <span className={infraStyles.globalStatsLabel}>E-mails lus</span>
                      </div>
                      <div className={infraStyles.globalStatsValue}>
                        {typeof o365Data.exchangeData.emailActivity.read === "number" ? o365Data.exchangeData.emailActivity.read.toLocaleString("fr-FR") : "N/A"}
                      </div>
                      {typeof o365Data.exchangeData.emailActivity?.averages?.read === "number" && <div className={infraStyles.globalStatsHint}>
                          Average&nbsp;:{" "}
                          {o365Data.exchangeData.emailActivity.averages.read.toLocaleString("fr-FR")}{" "}
                          / day
                        </div>}
                    </div>

                    {}
                    <div className={infraStyles.globalStatsItem}>
                      <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem"
              }}>
                        <IconifyIcon icon="mdi:percent" width={18} height={18} color="#f59e0b" />
                        <span className={infraStyles.globalStatsLabel}>Taux de lecture</span>
                      </div>
                      <div className={infraStyles.globalStatsValue}>
                        {typeof o365Data.exchangeData.emailActivity.readRate === "number" ? `${o365Data.exchangeData.emailActivity.readRate.toFixed(1)} %` : "N/A"}
                      </div>
                      {typeof o365Data.exchangeData.emailActivity.read === "number" && typeof o365Data.exchangeData.emailActivity.received === "number" && <div className={infraStyles.globalStatsHint}>
                            {o365Data.exchangeData.emailActivity.read.toLocaleString("fr-FR")}{" "}
                            read /{" "}
                            {o365Data.exchangeData.emailActivity.received.toLocaleString("fr-FR")}{" "}
                            received
                          </div>}
                    </div>
                  </div>}

                {o365Data.exchangeData.emailActivity?.dailyActivity && o365Data.exchangeData.emailActivity.dailyActivity.length > 0 && <div style={{
            marginTop: "1rem"
          }}>
                      {(() => {
              const periodEmailActivity = filterActivityByReportPeriod(o365Data.exchangeData.emailActivity.dailyActivity, reportStartDate, reportEndDate);
              const weeklyEmailActivity = aggregateEmailActivityByWeek(periodEmailActivity);
              if (!weeklyEmailActivity.length) return null;
              return <>
                      <h5 style={{
                  margin: "0 0 0.4rem",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  color: "var(--text-primary, #111827)"
                }}>
                        Email activity (sent / received / read)
                      </h5>
                      <div className={infraStyles.infraTableWrapper} style={{
                  marginTop: "0.65rem"
                }}>
                        <table className={infraStyles.infraTable}>
                          <thead>
                            <tr>
                              <th className={infraStyles.infraTableHeaderCell}>Semaine</th>
                              <th className={infraStyles.infraTableHeaderCell}>Sent</th>
                              <th className={infraStyles.infraTableHeaderCell}>Received</th>
                              <th className={infraStyles.infraTableHeaderCell}>Read</th>
                            </tr>
                          </thead>
                          <tbody>
                            {weeklyEmailActivity.map((week, idx) => {
                        const sent = Number(week.sent || 0);
                        const received = Number(week.received || 0);
                        const read = Number(week.read || 0);
                        return <tr key={`${week.period || "week"}-${idx}`} className={infraStyles.infraTableRow}>
                                  <td className={infraStyles.infraTableCell}>{week.period || "-"}</td>
                                  <td className={infraStyles.infraTableCell}>{sent.toLocaleString("fr-FR")}</td>
                                  <td className={infraStyles.infraTableCell}>
                                    {received.toLocaleString("fr-FR")}
                                  </td>
                                  <td className={infraStyles.infraTableCell}>{read.toLocaleString("fr-FR")}</td>
                                </tr>;
                      })}
                          </tbody>
                        </table>
                      </div>
                          </>;
            })()}
                    </div>}

                {o365Data.exchangeData.mailboxes && <div style={{
            marginTop: "0.9rem"
          }}>
                    <div className={`${infraStyles.globalStatsGrid} ${infraStyles.globalStatsGridStylized}`}>
                      {[{
                label: "Boîtes mail",
                icon: "mdi:email-multiple-outline",
                value: o365Data.exchangeData.mailboxes.total != null ? o365Data.exchangeData.mailboxes.total.toLocaleString("fr-FR") : "N/A"
              }, {
                label: "Espace utilisé",
                icon: "mdi:database",
                value: o365Data.exchangeData.mailboxes.totalSize ?? "N/A"
              }, {
                label: "Taille moyenne",
                icon: "mdi:scale-balance",
                value: o365Data.exchangeData.mailboxes.averageSize ?? "N/A"
              }, {
                label: "E-mails au total",
                icon: "mdi:email-outline",
                value: o365Data.exchangeData.mailboxes.totalItems != null ? o365Data.exchangeData.mailboxes.totalItems.toLocaleString("fr-FR") : "N/A"
              }].map((card, idx) => <div key={idx} className={infraStyles.globalStatsItem}>
                          <KpiLabelWithIcon icon={card.icon} label={card.label} />
                          <div className={infraStyles.globalStatsValue}>{card.value}</div>
                        </div>)}
                    </div>
                  </div>}
              </section>}

            {}
            {o365Data.teamsData && <section className={infraStyles.section}>
                <div className={infraStyles.sectionHeader}>
                  <div className={infraStyles.sectionTitleWrapper}>
                    <span className={infraStyles.sectionIcon}>
                      <IconifyIcon icon="simple-icons:microsoftteams" width={34} height={34} color="#6366f1" />
                    </span>
                    <div>
                      <h4 className={infraStyles.sectionTitle}>Microsoft Teams</h4>
                      <div className={infraStyles.sectionSubtitle}>
                        User, message, meeting and call usage
                      </div>
                    </div>
                  </div>
                </div>
                <div className={infraStyles.sectionTitleSeparator} />

                {(() => {
            const activity = o365Data.teamsData.activity || {};
            const rawMessages = activity.messages;
            const messageStats = rawMessages && typeof rawMessages === "object" && !Array.isArray(rawMessages) ? rawMessages : {
              total: typeof rawMessages === "number" ? rawMessages : 0
            };
            const rawMeetings = activity.meetings;
            const meetingsStats = rawMeetings && typeof rawMeetings === "object" && !Array.isArray(rawMeetings) ? rawMeetings : {
              total: typeof rawMeetings === "number" ? rawMeetings : 0
            };
            const rawCalls = activity.calls || o365Data.teamsData.calls;
            const callsStats = rawCalls && typeof rawCalls === "object" && !Array.isArray(rawCalls) ? rawCalls : {
              total: typeof rawCalls === "number" ? rawCalls : 0
            };
            const dailyActivity = o365Data.teamsData.licensedActivity?.dailyActivity || activity.dailyActivity || o365Data.teamsData.dailyActivity || [];
            const rawUsage = activity.usage;
            const usageStats = rawUsage && typeof rawUsage === "object" && !Array.isArray(rawUsage) ? rawUsage : {};
            const licensedUsers = usageStats.licensedUsers || 0;
            const activeUsers = usageStats.activeUsers ?? o365Data.teamsData.teams?.activeUsers ?? 0;
            const inactiveUsers = Math.max(0, licensedUsers - activeUsers);
            const adoptionRate = licensedUsers > 0 ? `${(activeUsers / licensedUsers * 100).toFixed(1)} %` : "N/A";
            const renderKpiCards = cards => <div className={`${infraStyles.globalStatsGrid} ${infraStyles.globalStatsGridStylized}`}>
                      {cards.map((card, idx) => <div key={card.label || idx} className={infraStyles.globalStatsItem}>
                          <KpiLabelWithIcon icon={card.icon} label={card.label} />
                          <div className={infraStyles.globalStatsValue}>
                            {typeof card.value === "number" ? card.value.toLocaleString("fr-FR") : card.value}
                          </div>
                        </div>)}
                    </div>;
            return <>
                      <h5 className={infraStyles.kpiSectionTitle}>Users</h5>
                      {renderKpiCards([{
                  label: "Number of users",
                  icon: "mdi:account-group",
                  value: licensedUsers
                }, {
                  label: "Active",
                  icon: "mdi:account-check",
                  value: activeUsers
                }, {
                  label: "Inactive",
                  icon: "mdi:account-off",
                  value: inactiveUsers
                }, {
                  label: "Taux d'adoption",
                  icon: "mdi:percent",
                  value: adoptionRate
                }])}
                      <h5 className={infraStyles.kpiSectionTitle}>Messages</h5>
                      {renderKpiCards([{
                  label: "Messages au total",
                  icon: "mdi:message-text-outline",
                  value: messageStats.total || 0
                }, {
                  label: "Messages de chat privés",
                  icon: "mdi:chat-processing-outline",
                  value: messageStats.privateChat || 0
                }, {
                  label: "Messages de canal",
                  icon: "mdi:pound-box-outline",
                  value: messageStats.teamChat || 0
                }, {
                  label: "Urgent",
                  icon: "mdi:alert-decagram-outline",
                  value: messageStats.urgent || 0
                }])}
                      <h5 className={infraStyles.kpiSectionTitle}>Meetings</h5>
                      {renderKpiCards([{
                  label: "Réunions",
                  icon: "mdi:calendar-clock-outline",
                  value: meetingsStats.total || 0
                }, {
                  label: "Organized",
                  icon: "mdi:calendar-plus",
                  value: meetingsStats.organized || 0
                }, {
                  label: "Total participations",
                  icon: "mdi:account-check-outline",
                  value: meetingsStats.attended || 0
                }, {
                  label: "Ad hoc",
                  icon: "mdi:calendar-blank-outline",
                  value: meetingsStats.adHoc?.organized || 0
                }])}
                      <h5 className={infraStyles.kpiSectionTitle}>Calls</h5>
                      {renderKpiCards([{
                  label: "Appels",
                  icon: "mdi:phone-outline",
                  value: callsStats.total || 0
                }, {
                  label: "Durée totale",
                  icon: "mdi:timer-outline",
                  value: callsStats.totalDuration || "0h 0m"
                }, {
                  label: "Durée moyenne",
                  icon: "mdi:clock-time-four-outline",
                  value: callsStats.averageDuration || "0h 0m"
                }, {
                  label: "Video duration",
                  icon: "mdi:video-outline",
                  value: callsStats.videoDuration || "0h 0m"
                }])}

                      {}
                      {Array.isArray(dailyActivity) && dailyActivity.length > 0 && <div style={{
                marginTop: "1rem"
              }}>
                          {(() => {
                  const periodTeamsActivity = filterActivityByReportPeriod(dailyActivity, reportStartDate, reportEndDate);
                  const weeklyTeamsActivity = aggregateTeamsActivityByWeek(periodTeamsActivity);
                  if (!weeklyTeamsActivity.length) return null;
                  return <>
                          <h5 style={{
                      margin: "0 0 0.4rem",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      color: "var(--text-primary, #111827)"
                    }}>
                            Daily activity (messages / calls / meetings)
                          </h5>
                          <div className={infraStyles.infraTableWrapper} style={{
                      marginTop: "0.65rem"
                    }}>
                            <table className={infraStyles.infraTable}>
                              <thead>
                                <tr>
                                  <th className={infraStyles.infraTableHeaderCell}>Semaine</th>
                                  <th className={infraStyles.infraTableHeaderCell}>
                                    Messages canal
                                  </th>
                                  <th className={infraStyles.infraTableHeaderCell}>
                                    Messages chat
                                  </th>
                                  <th className={infraStyles.infraTableHeaderCell}>Appels 1:1</th>
                                  <th className={infraStyles.infraTableHeaderCell}>
                                    Réunions
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {weeklyTeamsActivity.map((week, idx) => {
                            const channelMessages = Number(week.channelMessages || 0);
                            const chatMessages = Number(week.chatMessages || 0);
                            const oneOnOneCalls = Number(week.oneOnOneCalls || 0);
                            const totalMeetings = Number(week.totalMeetings || 0);
                            return <tr key={`${week.period || "teams-week"}-${idx}`} className={infraStyles.infraTableRow}>
                                      <td className={infraStyles.infraTableCell}>{week.period || "-"}</td>
                                      <td className={infraStyles.infraTableCell}>
                                        {channelMessages.toLocaleString("fr-FR")}
                                      </td>
                                      <td className={infraStyles.infraTableCell}>
                                        {chatMessages.toLocaleString("fr-FR")}
                                      </td>
                                      <td className={infraStyles.infraTableCell}>
                                        {oneOnOneCalls.toLocaleString("fr-FR")}
                                      </td>
                                      <td className={infraStyles.infraTableCell}>
                                        {totalMeetings.toLocaleString("fr-FR")}
                                      </td>
                                    </tr>;
                          })}
                              </tbody>
                            </table>
                          </div>
                              </>;
                })()}
                        </div>}
                    </>;
          })()}

                {}
                <div style={{
            marginTop: "1rem"
          }}>
                  <h5 style={{
              margin: "0 0 0.5rem",
              fontSize: "0.9rem",
              fontWeight: 600,
              color: "var(--text-primary, #111827)"
            }}>
                    Microsoft Teams teams
                  </h5>
                  {(() => {
              const rawTeams = o365Data.teamsData.teams;
              const teamsList = Array.isArray(rawTeams?.teamsList) ? rawTeams.teamsList : Array.isArray(rawTeams) ? rawTeams : [];
              if (!teamsList.length) {
                return <div className={infraStyles.infraTableEmpty}>
                          No Teams teams available.
                        </div>;
              }
              const sortedTeams = [...teamsList].sort((a, b) => {
                const na = (a.displayName || a.name || "").toLowerCase();
                const nb = (b.displayName || b.name || "").toLowerCase();
                return na.localeCompare(nb);
              });
              return <div className={infraStyles.infraTableWrapper} style={{
                marginTop: "0.75rem"
              }}>
                        <table className={infraStyles.infraTable}>
                          <thead>
                            <tr>
                              <th className={infraStyles.infraTableHeaderCell}>Team</th>
                              <th className={infraStyles.infraTableHeaderCell}>Visibility</th>
                              <th className={infraStyles.infraTableHeaderCell}>Membres</th>
                              <th className={infraStyles.infraTableHeaderCell}>Canaux</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedTeams.map((t, idx) => {
                      const name = t.displayName || t.name || "-";
                      const isPrivate = t.visibility === "Private";
                      const members = t.memberCount ?? (Array.isArray(t.members) ? t.members.length : 0);
                      const channels = t.channelCount ?? (Array.isArray(t.channels) ? t.channels.length : 0);
                      return <tr key={t.id || name || idx} className={infraStyles.infraTableRow}>
                                  <td className={infraStyles.infraTableCell}>{name}</td>
                                  <td className={infraStyles.infraTableCell}>
                                    {isPrivate ? "Private" : "Public"}
                                  </td>
                                  <td className={infraStyles.infraTableCell}>
                                    {Number(members || 0).toLocaleString("fr-FR")}
                                  </td>
                                  <td className={infraStyles.infraTableCell}>
                                    {Number(channels || 0).toLocaleString("fr-FR")}
                                  </td>
                                </tr>;
                    })}
                          </tbody>
                        </table>
                      </div>;
            })()}
                </div>
              </section>}

            {}
            {o365Data.onedriveData && o365Data.onedriveData.success !== false && <section className={infraStyles.section}>
                <div className={infraStyles.sectionHeader}>
                  <div className={infraStyles.sectionTitleWrapper}>
                    <span className={infraStyles.sectionIcon}>
                      <IconifyIcon icon="entypo-social:onedrive" width={34} height={34} color="#3b82f6" />
                    </span>
                    <div>
                      <h4 className={infraStyles.sectionTitle}>OneDrive</h4>
                      <div className={infraStyles.sectionSubtitle}>
                        File storage and sharing
                      </div>
                    </div>
                  </div>
                </div>
                <div className={infraStyles.sectionTitleSeparator} />

                <div className={`${infraStyles.globalStatsGrid} ${infraStyles.globalStatsGridStylized}`}>
                  {[{
              label: "Espace utilisé",
              icon: "mdi:harddisk",
              value: o365Data.onedriveData.storage?.totalUsed || "0 B",
              color: "#3b82f6"
            }, {
              label: "Nombre de fichiers",
              icon: "mdi:file-multiple-outline",
              value: o365Data.onedriveData.storage?.totalFiles != null ? o365Data.onedriveData.storage.totalFiles.toLocaleString("fr-FR") : "0",
              color: "#10b981"
            }, {
              label: "Moyenne par utilisateur",
              icon: "mdi:account-arrow-right-outline",
              value: o365Data.onedriveData.storage?.averagePerUser || "0 B",
              color: "#8b5cf6"
            }, {
              label: "Fichiers consultés / modifiés",
              icon: "mdi:file-eye-outline",
              value: o365Data.onedriveData.sharing?.byActivityType?.viewedOrEdited != null ? o365Data.onedriveData.sharing.byActivityType.viewedOrEdited.toLocaleString("fr-FR") : "0",
              color: "#f59e0b"
            }, {
              label: "Fichiers synchronisés",
              icon: "mdi:sync",
              value: o365Data.onedriveData.sharing?.byActivityType?.synced != null ? o365Data.onedriveData.sharing.byActivityType.synced.toLocaleString("fr-FR") : "0",
              color: "#14b8a6"
            }, {
              label: "Partages internes",
              icon: "mdi:account-group",
              value: o365Data.onedriveData.sharing?.byActivityType?.sharedInternally != null ? o365Data.onedriveData.sharing.byActivityType.sharedInternally.toLocaleString("fr-FR") : "0",
              color: "#ec4899"
            }, {
              label: "Partages externes",
              icon: "mdi:earth",
              value: o365Data.onedriveData.sharing?.byActivityType?.sharedExternally != null ? o365Data.onedriveData.sharing.byActivityType.sharedExternally.toLocaleString("fr-FR") : "0",
              color: "#ef4444"
            }].map((card, idx) => <div key={idx} className={infraStyles.globalStatsItem}>
                      <KpiLabelWithIcon icon={card.icon} label={card.label} />
                      <div className={infraStyles.globalStatsValue} style={card.color ? {
                color: card.color
              } : undefined}>
                        {card.value}
                      </div>
                    </div>)}
                </div>
              </section>}

            {}
            {o365Data.sharepointData && o365Data.sharepointData.success !== false && <section className={infraStyles.section}>
                <div className={infraStyles.sectionHeader}>
                  <div className={infraStyles.sectionTitleWrapper}>
                    <span className={infraStyles.sectionIcon}>
                      <IconifyIcon icon="mdi:microsoft-sharepoint" width={34} height={34} color="#22a0c8" />
                    </span>
                    <div>
                      <h4 className={infraStyles.sectionTitle}>SharePoint</h4>
                      <div className={infraStyles.sectionSubtitle}>
                        Sites SharePoint
                      </div>
                    </div>
                  </div>
                </div>
                <div className={infraStyles.sectionTitleSeparator} />

                {(() => {
              const sites = Array.isArray(o365Data.sharepointData.sites) ? o365Data.sharepointData.sites : [];
              if (!sites.length) {
                return <div className={infraStyles.infraTableEmpty}>No SharePoint site available.</div>;
              }
              return <div className={infraStyles.infraTableWrapper}>
                      <table className={infraStyles.infraTable}>
                        <thead>
                          <tr>
                            <th className={infraStyles.infraTableHeaderCell}>Site name</th>
                            <th className={infraStyles.infraTableHeaderCell}>URL</th>
                            <th className={infraStyles.infraTableHeaderCell}>Created date</th>
                            <th className={infraStyles.infraTableHeaderCell}>Last activity</th>
                            <th className={infraStyles.infraTableHeaderCell}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sites.map((site, idx) => <tr key={site.id || idx} className={infraStyles.infraTableRow}>
                              <td className={infraStyles.infraTableCell}>{site.name || site.displayName || "-"}</td>
                              <td className={infraStyles.infraTableCell}>{site.webUrl || site.url || "-"}</td>
                              <td className={infraStyles.infraTableCell}>{formatDate(site.createdDateTime)}</td>
                              <td className={infraStyles.infraTableCell}>{formatDate(site.lastActivityDate || site.lastModifiedDateTime)}</td>
                              <td className={infraStyles.infraTableCell}>{site.isActive !== false ? "Active" : "Inactive"}</td>
                            </tr>)}
                        </tbody>
                      </table>
                    </div>;
            })()}
              </section>}

            {}
            {(o365Data.securityData || o365Data.secureScore) && <section className={infraStyles.section}>
                <div className={infraStyles.sectionHeader}>
                  <div className={infraStyles.sectionTitleWrapper}>
                    <span className={infraStyles.sectionIcon}>
                      <IconifyIcon icon="mdi:shield-check" width={20} height={20} color="#10b981" />
                    </span>
                    <div>
                      <h4 className={infraStyles.sectionTitle}>Sécurité</h4>
                      <div className={infraStyles.sectionSubtitle}>
                        Microsoft 365 security score and account protection
                      </div>
                    </div>
                  </div>
                </div>
                <div className={infraStyles.sectionTitleSeparator} />

                {(() => {
              const kpi = o365Data.securityUsersKpi || {};
              const score = o365Data.secureScore;
              const globalTotal = (kpi.usersWithMFA || 0) + (kpi.usersWithoutMFA || 0);
              const adminTotal = kpi.adminsTotal || 0;
              const nonAdminTotal = (kpi.nonAdminWithMFA || 0) + (kpi.nonAdminWithoutMFA || 0);
              const rate = (withMfa, total) => total > 0 ? `${Math.round(withMfa / total * 100)} %` : "-";
              const recs = Array.isArray(o365Data.securityData?.secureScoreRecommendations) ? o365Data.securityData.secureScoreRecommendations : [];
              return <>
                      <div className={`${infraStyles.globalStatsGrid} ${infraStyles.globalStatsGridStylized}`}>
                        <div className={infraStyles.globalStatsItem}>
                          <KpiLabelWithIcon icon="mdi:shield-check" label="Secure Score" />
                          <div className={infraStyles.globalStatsValue}>
                            {score?.currentScore != null ? `${Math.round(score.currentScore)} / ${score.maxScore || 100}` : "-"}
                          </div>
                          {typeof score?.percentage === "number" && <div className={infraStyles.globalStatsHint}>
                              {Math.round(score.percentage)}% des points obtenus
                            </div>}
                        </div>
                        <div className={infraStyles.globalStatsItem}>
                          <KpiLabelWithIcon icon="mdi:earth" label="Global MFA" />
                          <div className={infraStyles.globalStatsValue}>{rate(kpi.usersWithMFA || 0, globalTotal)}</div>
                          <div className={infraStyles.globalStatsHint}>
                            {formatInt(kpi.usersWithMFA)} with · {formatInt(kpi.usersWithoutMFA)} without
                          </div>
                        </div>
                        <div className={infraStyles.globalStatsItem}>
                          <KpiLabelWithIcon icon="mdi:account-supervisor" label="Admin MFA" />
                          <div className={infraStyles.globalStatsValue}>{rate(kpi.adminsWithMFA || 0, adminTotal)}</div>
                          <div className={infraStyles.globalStatsHint}>
                            {formatInt(kpi.adminsWithMFA)} with · {formatInt(kpi.adminsWithoutMFA)} without
                          </div>
                        </div>
                        <div className={infraStyles.globalStatsItem}>
                          <KpiLabelWithIcon icon="mdi:account-group-outline" label="Non-admin MFA" />
                          <div className={infraStyles.globalStatsValue}>{rate(kpi.nonAdminWithMFA || 0, nonAdminTotal)}</div>
                          <div className={infraStyles.globalStatsHint}>
                            {formatInt(kpi.nonAdminWithMFA)} with · {formatInt(kpi.nonAdminWithoutMFA)} without
                          </div>
                        </div>
                      </div>
                      <h5 className={infraStyles.kpiSectionTitle}>Recommendations</h5>
                      <div className={infraStyles.infraTableWrapper}>
                        <table className={infraStyles.infraTable}>
                          <thead>
                            <tr>
                              <th className={infraStyles.infraTableHeaderCell}>Recommendation</th>
                              <th className={infraStyles.infraTableHeaderCell}>Category</th>
                              <th className={infraStyles.infraTableHeaderCell}>Priority</th>
                              <th className={infraStyles.infraTableHeaderCell}>Points</th>
                              <th className={infraStyles.infraTableHeaderCell}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recs.length === 0 ? <tr className={infraStyles.infraTableRow}>
                                <td className={infraStyles.infraTableCell} colSpan={5}>No recommendations returned for this tenant.</td>
                              </tr> : recs.map((rec, idx) => <tr key={rec.id || idx} className={infraStyles.infraTableRow}>
                                <td className={infraStyles.infraTableCell}>{rec.titleFr || rec.title || rec.displayName || "-"}</td>
                                <td className={infraStyles.infraTableCell}>{rec.categoryFr || rec.category || "-"}</td>
                                <td className={infraStyles.infraTableCell}>{rec.priorityLabel || rec.priority || "-"}</td>
                                <td className={infraStyles.infraTableCell}>{rec.maxScore != null ? rec.maxScore : "-"}</td>
                                <td className={infraStyles.infraTableCell}>{rec.stateLabel || rec.state || "-"}</td>
                              </tr>)}
                          </tbody>
                        </table>
                      </div>
                    </>;
            })()}
              </section>}

          </>}
      </ReportSummarySection>}

      {modules.NDD && <ReportSummarySection
        icon="mdi:domain"
        title="Noms de domaine"
        subtitle="Inventaire des domaines et dates d'expiration"
      >
        {domains.length === 0 ? <div className={infraStyles.infraTableEmpty}>
            Aucun nom de domaine enregistré pour ce client.
          </div> : (() => {
        const getStatusInfo = expiration => {
          if (!expiration) {
            return {
              label: "Actif",
              status: "actif",
              color: "#10b981"
            };
          }
          const expDate = new Date(expiration);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          expDate.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays < 0) {
            return {
              label: "Expiré",
              status: "expiré",
              color: "#ef4444"
            };
          }
          if (diffDays <= 30) {
            return {
              label: "Expire bientôt",
              status: "expire_bientot",
              color: "#f59e0b"
            };
          }
          return {
            label: "Actif",
            status: "actif",
            color: "#10b981"
          };
        };
        const sorted = [...domains].sort((a, b) => {
          const sa = getStatusInfo(a.expiration).status;
          const sb = getStatusInfo(b.expiration).status;
          const order = {
            expiré: 0,
            expire_bientot: 1,
            actif: 2
          };
          if (order[sa] !== order[sb]) {
            return order[sa] - order[sb];
          }
          const ta = a.expiration ? new Date(a.expiration).getTime() : 0;
          const tb = b.expiration ? new Date(b.expiration).getTime() : 0;
          return ta - tb;
        });
        return <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "0.85rem",
          marginTop: "0.75rem"
        }}>
                {sorted.map((d, idx) => {
            const name = d.nom || d.name || d.fqdn || "-";
            const registrar = d.registrar || d.registrarName || d.provider || "-";
            const statusInfo = getStatusInfo(d.expiration);
            return <div key={d.id || name || idx} style={{
              borderRadius: 10,
              border: "1px solid var(--border-primary, #e5e7eb)",
              background: "#ffffff",
              padding: "0.65rem 0.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.35rem"
            }}>
                      <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.35rem"
              }}>
                        <div style={{
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "var(--text-primary, #111827)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }} title={name}>
                          {name}
                        </div>
                        <span style={{
                  fontSize: "0.7rem",
                  padding: "0.1rem 0.45rem",
                  borderRadius: 999,
                  backgroundColor: statusInfo.color,
                  color: "#ffffff",
                  fontWeight: 600
                }}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <div style={{
                fontSize: "0.78rem",
                color: "var(--text-muted, #6b7280)"
              }}>
                        Expiration&nbsp;:{" "}
                        <strong style={{
                  color: "#111827"
                }}>
                          {formatDate(d.expiration)}
                        </strong>
                      </div>
                      <div style={{
                fontSize: "0.78rem",
                color: "var(--text-muted, #6b7280)"
              }}>
                        Registrar&nbsp;:{" "}
                        <strong style={{
                  color: "#111827"
                }}>
                          {registrar}
                        </strong>
                      </div>
                    </div>;
          })}
              </div>;
      })()}
      </ReportSummarySection>}
    </Wrapper>;
}
