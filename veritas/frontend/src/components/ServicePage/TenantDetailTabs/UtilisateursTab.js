import React, { useState, useMemo } from 'react';
import { Icon } from "@iconify/react";
import { FaSort, FaSortUp, FaSortDown, FaChevronLeft, FaChevronRight, FaCheck, FaTimes, FaSearch } from "react-icons/fa";
import { toast } from 'react-toastify';
import styles from '../TenantDetailPage.module.css';
import SmartTooltip from '../../SmartTooltip';
import { getLicenseDisplayName } from './utils';
import { getMfaMethods, getMfaUserFromIndex, buildMfaLookupIndex, userHasMethod, userHasMfa, userIsAdmin } from '../mfaDetailsUtils';
function getMfaMethodLabel(methodType) {
  const labels = {
    microsoftauthenticatorauthenticationmethod: 'Microsoft Authenticator',
    phoneauthenticationmethod: 'Phone / SMS',
    fido2authenticationmethod: 'FIDO2 key',
    softwareoathauthenticationmethod: 'Application OATH (TOTP)',
    temporaryaccesspassauthenticationmethod: 'Temporary pass',
    emailauthenticationmethod: 'Email',
    passwordauthenticationmethod: 'Password',
    windowshelloforbusinessauthenticationmethod: 'Windows Hello'
  };
  return labels[methodType] || methodType;
}
function getMfaMethodIcon(methodType) {
  switch (methodType) {
    case 'microsoftauthenticatorauthenticationmethod':
      return <Icon icon="mdi:cellphone" />;
    case 'phoneauthenticationmethod':
      return <Icon icon="mdi:phone" />;
    case 'fido2authenticationmethod':
      return <Icon icon="mdi:usb" />;
    case 'softwareoathauthenticationmethod':
      return <Icon icon="mdi:shield-key" />;
    case 'temporaryaccesspassauthenticationmethod':
      return <Icon icon="mdi:clock-outline" />;
    case 'emailauthenticationmethod':
      return <Icon icon="mdi:email" />;
    case 'passwordauthenticationmethod':
    case 'windowshelloforbusinessauthenticationmethod':
      return null;
    default:
      return <Icon icon="mdi:help-circle" />;
  }
}
const USER_FILTER_ALL = 'all';
const USER_FILTER_ACTIVE_30 = 'active30';
const USER_FILTER_BLOCKED = 'blocked';
const USER_FILTER_INACTIVE_90 = 'inactive90';
const USER_FILTER_MFA_ACTIF = 'mfaActive';
const USER_FILTER_MFA_INACTIF = 'mfaInactive';
const USER_FILTER_ADMIN = 'admin';
const USER_FILTER_NON_ADMIN = 'nonAdmin';
const USER_FILTER_METHOD_PREFIX = 'method_';
const USER_FILTER_DOMAIN_PREFIX = 'domain_';
const NO_DOMAIN_KEY = '__no_domain__';
function getUserDomain(user) {
  const raw = (user.userPrincipalName || user.email || '').toString().trim();
  const at = raw.indexOf('@');
  if (at === -1) return NO_DOMAIN_KEY;
  const domain = raw.slice(at + 1).toLowerCase();
  return domain || NO_DOMAIN_KEY;
}
const MFA_METHOD_FILTERS = [{
  key: 'microsoftauthenticatorauthenticationmethod',
  label: 'Authenticator',
  tooltip: 'Filter by Microsoft Authenticator (mobile app)'
}, {
  key: 'phoneauthenticationmethod',
  label: 'Phone',
  tooltip: 'Filter by phone authentication (SMS / call)'
}, {
  key: 'emailauthenticationmethod',
  label: 'Email',
  tooltip: 'Filter by email authentication'
}, {
  key: 'fido2authenticationmethod',
  label: 'FIDO2',
  tooltip: 'Filter by FIDO2 security key'
}, {
  key: 'softwareoathauthenticationmethod',
  label: 'OATH',
  tooltip: 'Filter by OATH app (TOTP codes)'
}, {
  key: 'temporaryaccesspassauthenticationmethod',
  label: 'Temporary pass',
  tooltip: 'Filter by temporary access pass'
}];
const MFA_METHOD_FILTERS_LINE2 = [{
  key: 'phoneauthenticationmethod',
  label: 'Phone/SMS',
  tooltip: 'Filter by phone authentication (SMS / call)'
}, {
  key: 'emailauthenticationmethod',
  label: 'Email',
  tooltip: 'Filter by email authentication'
}, {
  key: 'microsoftauthenticatorauthenticationmethod',
  label: 'Authenticator',
  tooltip: 'Filter by Microsoft Authenticator (mobile app)'
}, {
  key: 'softwareoathauthenticationmethod',
  label: 'Software auth',
  tooltip: 'Filter by OATH app (TOTP codes)'
}];
const ADMIN_ROLE_ICONS = [{
  pattern: /global\s*administrator/i,
  icon: 'mdi:earth',
  label: 'Global Administrator'
}, {
  pattern: /teams\s*administrator/i,
  icon: 'mdi:microsoft-teams',
  label: 'Teams Administrator'
}, {
  pattern: /exchange\s*administrator/i,
  icon: 'mdi:email-outline',
  label: 'Exchange Administrator'
}, {
  pattern: /sharepoint\s*administrator/i,
  icon: 'mdi:sharepoint',
  label: 'SharePoint Administrator'
}, {
  pattern: /user\s*administrator/i,
  icon: 'mdi:account-cog',
  label: 'User Administrator'
}, {
  pattern: /security\s*administrator/i,
  icon: 'mdi:shield-account',
  label: 'Security Administrator'
}, {
  pattern: /privileged\s*role/i,
  icon: 'mdi:shield-key',
  label: 'Privileged Role Administrator'
}, {
  pattern: /billing\s*administrator/i,
  icon: 'mdi:credit-card-outline',
  label: 'Billing Administrator'
}, {
  pattern: /application\s*administrator/i,
  icon: 'mdi:application-cog',
  label: 'Application Administrator'
}, {
  pattern: /helpdesk\s*administrator/i,
  icon: 'mdi:headset',
  label: 'Helpdesk Administrator'
}, {
  pattern: /intune\s*administrator/i,
  icon: 'mdi:cellphone-cog',
  label: 'Intune Administrator'
}, {
  pattern: /compliance\s*administrator/i,
  icon: 'mdi:gavel',
  label: 'Compliance Administrator'
}, {
  pattern: /conditional\s*access/i,
  icon: 'mdi:shield-lock',
  label: 'Conditional Access Administrator'
}, {
  pattern: /authentication\s*administrator/i,
  icon: 'mdi:fingerprint',
  label: 'Authentication Administrator'
}, {
  pattern: /license\s*administrator/i,
  icon: 'mdi:certificate-outline',
  label: 'License Administrator'
}, {
  pattern: /groups\s*administrator/i,
  icon: 'mdi:account-group',
  label: 'Groups Administrator'
}, {
  pattern: /password\s*administrator/i,
  icon: 'mdi:form-textbox-password',
  label: 'Password Administrator'
}, {
  pattern: /power\s*platform/i,
  icon: 'mdi:power',
  label: 'Power Platform Administrator'
}, {
  pattern: /cloud\s*application/i,
  icon: 'mdi:cloud-cog',
  label: 'Cloud Application Administrator'
}, {
  pattern: /directory\s*readers/i,
  icon: 'mdi:account-eye',
  label: 'Directory Readers'
}, {
  pattern: /reports\s*reader/i,
  icon: 'mdi:chart-box-outline',
  label: 'Reports Reader'
}, {
  pattern: /administrator|admin/i,
  icon: 'mdi:shield-account-outline',
  label: null
}];
function getAdminRoleIcons(adminRoleString) {
  if (adminRoleString == null || String(adminRoleString).trim() === '') return [];
  const roles = String(adminRoleString).split(',').map(r => r.trim()).filter(Boolean);
  const result = [];
  const seenLabels = new Set();
  for (const role of roles) {
    const entry = ADMIN_ROLE_ICONS.find(e => e.pattern.test(role));
    const label = entry?.label || role;
    const icon = entry?.icon || 'mdi:shield-account-outline';
    if (!seenLabels.has(label)) {
      seenLabels.add(label);
      result.push({
        icon,
        label: label || role
      });
    }
  }
  return result;
}
function isLikelyServiceAccountFromUser(user) {
  const name = (user.name || user.displayName || '').toString();
  const upn = (user.userPrincipalName || user.email || '').toString();
  const email = (user.email || '').toString();
  const combined = `${name} ${upn} ${email}`.toLowerCase();
  const patterns = [/aad_/, /msol_/, /sync_/, /svc_/, /service_/, /\$@/, /_srv/, /_service/, /_sync/, /compte de service|service account|compte service/, /bot\./, /bot@/, /connector/, /automation/, /azure ad sync|ad sync|dirsync|aadconnect|dir sync/, /directory synchronization|synchronization service|on-premises/, /healthmailbox|systemmailbox|federatedemail/];
  return patterns.some(p => p.test(combined));
}
function getFilteredUsers(users, filter, mfaIndex) {
  if (!users) return [];
  if (filter === USER_FILTER_ALL) return users;
  const period30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const period90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const mfaOf = u => getMfaUserFromIndex(u, mfaIndex);
  switch (filter) {
    case USER_FILTER_ACTIVE_30:
      return users.filter(u => {
        const lastLogin = u.lastLoginDate ? new Date(u.lastLoginDate) : null;
        return lastLogin && lastLogin >= period30;
      });
    case USER_FILTER_BLOCKED:
      return users.filter(u => u.accountEnabled === false);
    case USER_FILTER_INACTIVE_90:
      return users.filter(u => {
        const lastLogin = u.lastLoginDate ? new Date(u.lastLoginDate) : null;
        return !lastLogin || lastLogin < period90;
      });
    case USER_FILTER_MFA_ACTIF:
      return users.filter(u => userHasMfa(mfaOf(u)));
    case USER_FILTER_ADMIN:
      return users.filter(u => userIsAdmin(mfaOf(u)));
    case USER_FILTER_NON_ADMIN:
      return users.filter(u => {
        const m = mfaOf(u);
        return m && !userIsAdmin(m);
      });
    case USER_FILTER_MFA_INACTIF:
      return users.filter(u => {
        const m = mfaOf(u);
        return m && !userHasMfa(m);
      });
    default:
      if (filter.startsWith(USER_FILTER_DOMAIN_PREFIX)) {
        const domain = filter.slice(USER_FILTER_DOMAIN_PREFIX.length);
        return users.filter(u => getUserDomain(u) === domain);
      }
      if (filter.startsWith(USER_FILTER_METHOD_PREFIX)) {
        const methodKey = filter.slice(USER_FILTER_METHOD_PREFIX.length);
        return users.filter(u => userHasMethod(mfaOf(u), methodKey));
      }
      return users;
  }
}
const DOMAIN_FILTER_ALL = 'all';
export default function UsersTab({
  users,
  dashboardMetrics,
  detailData,
  mfaDetails: mfaDetailsProp = [],
  theme,
  embedded = false
}) {
  const mfaIndex = useMemo(() => buildMfaLookupIndex(mfaDetailsProp), [mfaDetailsProp]);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [domainFilter, setDomainFilter] = useState(DOMAIN_FILTER_ALL);
  const [activeFilters, setActiveFilters] = useState([]);
  const [hideServiceAccounts, setHideServiceAccounts] = useState(true);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const usersPerPage = 10;
  const displayUsers = useMemo(() => {
    if (!users || !Array.isArray(users)) return [];
    if (!hideServiceAccounts) return users;
    return users.filter(u => {
      const isService = u.isServiceAccount === true || u.isServiceAccount !== false && isLikelyServiceAccountFromUser(u);
      return !isService;
    });
  }, [users, hideServiceAccounts]);
  const serviceAccountsCount = useMemo(() => (users || []).filter(u => u.isServiceAccount === true || u.isServiceAccount !== false && isLikelyServiceAccountFromUser(u)).length, [users]);
  const setDomainAndResetPage = domain => {
    setDomainFilter(domain);
    setCurrentPage(1);
  };
  const toggleFilter = filterKey => {
    setActiveFilters(prev => prev.includes(filterKey) ? prev.filter(k => k !== filterKey) : [...prev, filterKey]);
    setCurrentPage(1);
  };
  const clearActiveFilters = () => {
    setActiveFilters([]);
    setCurrentPage(1);
  };
  const handleSort = columnKey => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      if (columnKey === 'roleAdmin') {
        setSortDirection('desc');
      } else {
        setSortDirection('asc');
      }
    }
  };
  const getSortIcon = columnKey => {
    if (sortColumn !== columnKey) {
      return <FaSort style={{
        fontSize: '0.75rem',
        opacity: 0.4,
        marginLeft: '0.25rem'
      }} />;
    }
    return sortDirection === 'asc' ? <FaSortUp style={{
      fontSize: '0.75rem',
      marginLeft: '0.25rem',
      color: '#3b82f6'
    }} /> : <FaSortDown style={{
      fontSize: '0.75rem',
      marginLeft: '0.25rem',
      color: '#3b82f6'
    }} />;
  };
  const usersForKpi = useMemo(() => {
    if (!displayUsers || !displayUsers.length) return [];
    let base = displayUsers;
    if (userSearchQuery.trim()) {
      const q = userSearchQuery.toLowerCase();
      base = base.filter(u => {
        const name = (u.name || u.displayName || '').toLowerCase();
        const email = (u.email || u.userPrincipalName || '').toLowerCase();
        return name.includes(q) || email.includes(q);
      });
    }
    if (domainFilter === DOMAIN_FILTER_ALL) return base;
    return base.filter(u => getUserDomain(u) === domainFilter);
  }, [displayUsers, domainFilter, userSearchQuery]);
  const filteredUsers = useMemo(() => {
    if (!activeFilters || activeFilters.length === 0) return usersForKpi;
    return activeFilters.reduce((acc, filterKey) => getFilteredUsers(acc, filterKey, mfaIndex), usersForKpi);
  }, [usersForKpi, activeFilters, mfaIndex]);
  const sortedUsers = useMemo(() => {
    if (!sortColumn) return filteredUsers;
    const mfaOf = u => getMfaUserFromIndex(u, mfaIndex);
    const period90Days = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const period30Days = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const getStatusValue = user => {
      if (user.accountEnabled === false) return 0;
      const lastLoginMs = user.lastLoginDate ? new Date(user.lastLoginDate).getTime() : 0;
      if (lastLoginMs && lastLoginMs >= period30Days) return 3;
      if (!lastLoginMs || lastLoginMs < period90Days) return 1;
      return 2;
    };
    const sorted = [...filteredUsers].sort((a, b) => {
      let aValue;
      let bValue;
      switch (sortColumn) {
        case 'nom':
          aValue = (a.name || a.displayName || '').toLowerCase();
          bValue = (b.name || b.displayName || '').toLowerCase();
          break;
        case 'email':
          aValue = (a.email || a.userPrincipalName || '').toLowerCase();
          bValue = (b.email || b.userPrincipalName || '').toLowerCase();
          break;
        case 'dateCreation':
          aValue = a.createdDate ? new Date(a.createdDate).getTime() : 0;
          bValue = b.createdDate ? new Date(b.createdDate).getTime() : 0;
          break;
        case 'statut':
          aValue = getStatusValue(a);
          bValue = getStatusValue(b);
          break;
        case 'licence':
          aValue = (typeof a.licenses === 'string' ? a.licenses : Array.isArray(a.licenses) ? a.licenses.join(', ') : a.licenses || 'None').toString().toLowerCase();
          bValue = (typeof b.licenses === 'string' ? b.licenses : Array.isArray(b.licenses) ? b.licenses.join(', ') : b.licenses || 'None').toString().toLowerCase();
          break;
        case 'mfaActive':
          aValue = userHasMfa(mfaOf(a)) ? 1 : 0;
          bValue = userHasMfa(mfaOf(b)) ? 1 : 0;
          break;
        case 'admin':
          aValue = userIsAdmin(mfaOf(a)) ? 1 : 0;
          bValue = userIsAdmin(mfaOf(b)) ? 1 : 0;
          break;
        case 'roleAdmin':
          {
            const getRoleAdminStats = u => {
              const mfa = mfaOf(u);
              const raw = (mfa?.admin_role ?? mfa?.adminRole ?? '').toString().trim();
              if (!raw) return { count: 0, label: '' };
              const roles = raw.split(',').map(r => r.trim()).filter(Boolean);
              return { count: roles.length, label: raw.toLowerCase() };
            };
            const aStats = getRoleAdminStats(a);
            const bStats = getRoleAdminStats(b);
            if (aStats.count !== bStats.count) {
              aValue = aStats.count;
              bValue = bStats.count;
            } else {
              aValue = aStats.label;
              bValue = bStats.label;
            }
            break;
          }
        case 'methodes':
          aValue = getMfaMethods(mfaOf(a)).filter(m => getMfaMethodIcon(m) !== null).length;
          bValue = getMfaMethods(mfaOf(b)).filter(m => getMfaMethodIcon(m) !== null).length;
          break;
        default:
          return 0;
      }
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredUsers, sortColumn, sortDirection, mfaIndex]);
  const exportUsersToCSV = () => {
    if (!filteredUsers || filteredUsers.length === 0) {
      toast.error('No users to export');
      return;
    }
    const usersToExport = sortedUsers;
    const headers = ['Name', 'Email', 'Created on', 'Status', 'Licenses', 'Admin role', 'Admin', 'MFA active', 'Methods'];
    const methodKeyToLabel = Object.fromEntries(MFA_METHOD_FILTERS.map(m => [m.key, m.label]));
    const rows = usersToExport.map(user => {
      const lastLogin = user.lastLoginDate ? new Date(user.lastLoginDate) : null;
      const createdDate = user.createdDate ? new Date(user.createdDate) : null;
      const period90Days = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const isInactive = !lastLogin || lastLogin < period90Days;
      const period30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const isActive30 = lastLogin && lastLogin >= period30Days;
      const statusLabel = user.accountEnabled === false ? 'Blocked' : isActive30 ? 'Active' : isInactive ? 'Inactive (>90d)' : 'Inactive';
      const mfaUser = getMfaUserFromIndex(user, mfaIndex);
      const mfaActiveLabel = mfaUser == null ? '-' : userHasMfa(mfaUser) ? 'Yes' : 'No';
      const adminLabel = mfaUser == null ? '-' : mfaUser.is_admin === true ? 'Yes' : 'No';
      const adminRoleLabel = mfaUser == null ? '-' : mfaUser.admin_role || mfaUser.adminRole || '-';
      const methodsRaw = mfaUser?.mfa_methods || mfaUser?.mfaMethods || [];
      const methods = Array.isArray(methodsRaw) ? [...new Set(methodsRaw)] : [];
      const methodLabels = methods.length > 0 ? methods.filter(m => getMfaMethodIcon(m) !== null).map(m => methodKeyToLabel[m] || m).join(', ') : '';
      const methodesLabel = mfaUser == null ? '-' : methodLabels || '-';
      return [user.name || user.displayName || '', user.email || user.userPrincipalName || '', createdDate ? createdDate.toLocaleDateString('en-GB') : '', statusLabel, user.licenses || 'None', adminRoleLabel, adminLabel, mfaActiveLabel, methodesLabel];
    });
    const csvContent = [headers.join(';'), ...rows.map(row => row.map(cell => {
      const cellStr = String(cell || '');
      if (cellStr.includes(';') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(';'))].join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    const clientName = detailData?.clientName || 'client';
    link.download = `utilisateurs_${clientName}_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`CSV export successful: ${usersToExport.length} user(s) exported`);
  };
  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / usersPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const paginatedUsers = embedded ? sortedUsers : sortedUsers.slice(startIndex, endIndex);
  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };
  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };
  const {
    blockedUsers,
    inactiveUsers90,
    activeUsers30Count,
    mfaActiveCount,
    mfaInactiveCount,
    adminCount,
    nonAdminCount
  } = useMemo(() => {
    const period90Days = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const period30Days = Date.now() - 30 * 24 * 60 * 60 * 1000;
    let blocked = 0;
    let inactive90 = 0;
    let active30 = 0;
    let mfaActive = 0;
    let mfaInactive = 0;
    let admin = 0;
    let nonAdmin = 0;
    for (const u of filteredUsers) {
      if (u.accountEnabled === false) blocked += 1;
      const lastLoginMs = u.lastLoginDate ? new Date(u.lastLoginDate).getTime() : 0;
      if (!lastLoginMs || lastLoginMs < period90Days) inactive90 += 1;
      if (lastLoginMs && lastLoginMs >= period30Days) active30 += 1;
      const m = getMfaUserFromIndex(u, mfaIndex);
      if (userHasMfa(m)) mfaActive += 1;
      if (m && !userHasMfa(m)) mfaInactive += 1;
      if (userIsAdmin(m)) admin += 1;
      if (m && !userIsAdmin(m)) nonAdmin += 1;
    }
    return {
      blockedUsers: blocked,
      inactiveUsers90: inactive90,
      activeUsers30Count: active30,
      mfaActiveCount: mfaActive,
      mfaInactiveCount: mfaInactive,
      adminCount: admin,
      nonAdminCount: nonAdmin
    };
  }, [filteredUsers, mfaIndex]);
  const methodCounts = useMemo(() => {
    const counts = {};
    MFA_METHOD_FILTERS.forEach(({
      key
    }) => {
      counts[key] = 0;
    });
    for (const u of filteredUsers) {
      const m = getMfaUserFromIndex(u, mfaIndex);
      for (const {
        key
      } of MFA_METHOD_FILTERS) {
        if (userHasMethod(m, key)) counts[key] += 1;
      }
    }
    return counts;
  }, [filteredUsers, mfaIndex]);
  const domainCounts = useMemo(() => {
    const map = new Map();
    (displayUsers || []).forEach(u => {
      const d = getUserDomain(u);
      map.set(d, (map.get(d) || 0) + 1);
    });
    return Array.from(map.entries()).map(([domain, count]) => ({
      domain,
      count
    })).sort((a, b) => b.count - a.count || (a.domain === NO_DOMAIN_KEY ? 1 : b.domain === NO_DOMAIN_KEY ? -1 : a.domain.localeCompare(b.domain)));
  }, [displayUsers]);
  return <section className={`${styles.kpiSection} ${embedded ? styles.tabFill : ""}`}>
      <h2 className={styles.sectionTitle}>Users</h2>
      {users.length > 0 ? <>
          {}
          {!embedded && domainCounts.length > 0 && <>
              <h3 className={styles.subsectionTitle}>
                Domain filters
              </h3>
              <div className={`${styles.statsCards} ${styles.statsCardsUsersKpi}`} style={{
          marginBottom: '1rem'
        }}>
                <button type="button" className={`${styles.statCard} ${styles.statCardClickable} ${domainFilter === DOMAIN_FILTER_ALL ? styles.statCardActive : ''}`} onClick={() => setDomainAndResetPage(DOMAIN_FILTER_ALL)}>
                  <div className={styles.statCardIcon}>
                    <Icon icon="mdi:earth" />
                  </div>
                  <div className={styles.statCardContent}>
                    <div className={styles.statCardLabel}>All domains</div>
                    <div className={styles.statCardValue}>{displayUsers.length.toLocaleString()}</div>
                  </div>
                </button>
                {domainCounts.map(({
            domain,
            count
          }) => {
            const label = domain === NO_DOMAIN_KEY ? 'No domain' : domain;
            return <SmartTooltip key={domain} as="div" className={styles.statCardTooltipWrapper} content={`Show only users @${domain === NO_DOMAIN_KEY ? '…' : domain}`}>
                      <button type="button" className={`${styles.statCard} ${styles.statCardClickable} ${domainFilter === domain ? styles.statCardActive : ''}`} onClick={() => setDomainAndResetPage(domain)}>
                        <div className={styles.statCardIcon}>
                          <Icon icon="mdi:domain" />
                        </div>
                        <div className={styles.statCardContent}>
                          <div className={styles.statCardLabel}>{label}</div>
                          <div className={styles.statCardValue}>{count.toLocaleString()}</div>
                        </div>
                      </button>
                    </SmartTooltip>;
          })}
              </div>
            </>}

          {}
          {!embedded && dashboardMetrics && <>
              <h3 className={styles.subsectionTitle} style={{
          marginTop: domainCounts.length > 0 ? '0.5rem' : '0'
        }}>
                Filters globaux
              </h3>
              <div className={`${styles.statsCards} ${styles.statsCardsUsersKpi}`} style={{
          marginBottom: '1rem'
        }}>
              <SmartTooltip as="div" className={styles.statCardTooltipWrapper} content="Reset criteria filters (keep domain)">
                <button type="button" className={`${styles.statCard} ${styles.statCardClickable} ${activeFilters.length === 0 ? styles.statCardActive : ''}`} onClick={clearActiveFilters}>
                  <div className={styles.statCardIcon}>
                    <Icon icon="mdi:account-multiple" />
                  </div>
                  <div className={styles.statCardContent}>
                    <div className={styles.statCardLabel}>Total users</div>
                    <div className={styles.statCardValue}>{filteredUsers.length.toLocaleString()}</div>
                  </div>
                </button>
              </SmartTooltip>
              <button type="button" className={`${styles.statCard} ${styles.statCardClickable} ${activeFilters.includes(USER_FILTER_ADMIN) ? styles.statCardActive : ''}`} onClick={() => toggleFilter(USER_FILTER_ADMIN)}>
                <div className={styles.statCardIcon} style={{
              color: '#3b82f6'
            }}>
                  <Icon icon="mdi:shield-account" />
                </div>
                <div className={styles.statCardContent}>
                  <div className={styles.statCardLabel}>Admin</div>
                  <div className={styles.statCardValue} style={{
                color: '#3b82f6'
              }}>{adminCount}</div>
                </div>
              </button>
              <button type="button" className={`${styles.statCard} ${styles.statCardClickable} ${activeFilters.includes(USER_FILTER_NON_ADMIN) ? styles.statCardActive : ''}`} onClick={() => toggleFilter(USER_FILTER_NON_ADMIN)}>
                <div className={styles.statCardIcon}>
                  <Icon icon="mdi:account-outline" />
                </div>
                <div className={styles.statCardContent}>
                  <div className={styles.statCardLabel}>Non admin</div>
                  <div className={styles.statCardValue}>{nonAdminCount}</div>
                </div>
              </button>
              <button type="button" className={`${styles.statCard} ${styles.statCardClickable} ${activeFilters.includes(USER_FILTER_ACTIVE_30) ? styles.statCardActive : ''}`} onClick={() => toggleFilter(USER_FILTER_ACTIVE_30)}>
                <div className={styles.statCardIcon} style={{
              color: '#10b981'
            }}>
                  <Icon icon="mdi:check-circle" />
                </div>
                <div className={styles.statCardContent}>
                  <div className={styles.statCardLabel}>Active user</div>
                  <div className={styles.statCardValue} style={{
                color: '#10b981'
              }}>{activeUsers30Count.toLocaleString()}</div>
                </div>
              </button>
              <button type="button" className={`${styles.statCard} ${styles.statCardClickable} ${activeFilters.includes(USER_FILTER_INACTIVE_90) ? styles.statCardActive : ''}`} onClick={() => toggleFilter(USER_FILTER_INACTIVE_90)}>
                <div className={styles.statCardIcon} style={{
              color: '#f59e0b'
            }}>
                  <Icon icon="mdi:clock-outline" />
                </div>
                <div className={styles.statCardContent}>
                  <div className={styles.statCardLabel}>Inactive user</div>
                  <div className={styles.statCardValue} style={{
                color: '#f59e0b'
              }}>{inactiveUsers90}</div>
                </div>
              </button>
              <button type="button" className={`${styles.statCard} ${styles.statCardClickable} ${activeFilters.includes(USER_FILTER_BLOCKED) ? styles.statCardActive : ''}`} onClick={() => toggleFilter(USER_FILTER_BLOCKED)}>
                <div className={styles.statCardIcon} style={{
              color: '#ef4444'
            }}>
                  <Icon icon="mdi:account-cancel" />
                </div>
                <div className={styles.statCardContent}>
                  <div className={styles.statCardLabel}>Blocked user</div>
                  <div className={styles.statCardValue} style={{
                color: '#ef4444'
              }}>{blockedUsers}</div>
                </div>
              </button>
              <button type="button" className={`${styles.statCard} ${styles.statCardClickable} ${activeFilters.includes(USER_FILTER_MFA_ACTIF) ? styles.statCardActive : ''}`} onClick={() => toggleFilter(USER_FILTER_MFA_ACTIF)}>
                <div className={styles.statCardIcon} style={{
              color: '#10b981'
            }}>
                  <Icon icon="mdi:shield-check" />
                </div>
                <div className={styles.statCardContent}>
                  <div className={styles.statCardLabel}>MFA active</div>
                  <div className={styles.statCardValue} style={{
                color: '#10b981'
              }}>{mfaActiveCount}</div>
                </div>
              </button>
              <button type="button" className={`${styles.statCard} ${styles.statCardClickable} ${activeFilters.includes(USER_FILTER_MFA_INACTIF) ? styles.statCardActive : ''}`} onClick={() => toggleFilter(USER_FILTER_MFA_INACTIF)}>
                <div className={styles.statCardIcon} style={{
              color: '#ef4444'
            }}>
                  <Icon icon="mdi:shield-off" />
                </div>
                <div className={styles.statCardContent}>
                  <div className={styles.statCardLabel}>MFA inactive</div>
                  <div className={styles.statCardValue} style={{
                color: '#ef4444'
              }}>{mfaInactiveCount}</div>
                </div>
              </button>
              {MFA_METHOD_FILTERS_LINE2.map(({
            key,
            label,
            tooltip
          }) => <SmartTooltip key={key} as="div" className={styles.statCardTooltipWrapper} content={tooltip}>
                  <button type="button" className={`${styles.statCard} ${styles.statCardClickable} ${activeFilters.includes(USER_FILTER_METHOD_PREFIX + key) ? styles.statCardActive : ''}`} onClick={() => toggleFilter(USER_FILTER_METHOD_PREFIX + key)}>
                    <div className={styles.statCardIcon}>
                      {getMfaMethodIcon(key)}
                    </div>
                    <div className={styles.statCardContent}>
                      <div className={styles.statCardLabel}>{label}</div>
                      <div className={styles.statCardValue}>{methodCounts[key] ?? 0}</div>
                    </div>
                  </button>
                </SmartTooltip>)}
            </div>
            </>}

          {}
          {!embedded ? <h3 className={styles.sectionTitle} style={{
        marginTop: '1rem'
      }}>
            Users table
          </h3> : null}

          {!embedded ? <div className={styles.serviceAccountsRow}>
            <div className={styles.serviceAccountsLeft}>
              <div className={styles.serviceAccountsSearchContainer}>
                <div className={styles.serviceAccountsSearchBox}>
                  <FaSearch className={styles.serviceAccountsSearchIcon} />
                  <input type="search" name="o365-user-filter" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true" data-form-type="other" data-bwignore="true" className={styles.serviceAccountsSearchInput} placeholder="Search for a user..." value={userSearchQuery} onChange={e => {
                setUserSearchQuery(e.target.value);
                setCurrentPage(1);
              }} />
                  {userSearchQuery && <button type="button" className={styles.serviceAccountsSearchClearButton} onClick={() => {
                setUserSearchQuery('');
                setCurrentPage(1);
              }} aria-label="Clear search">
                      <FaTimes />
                    </button>}
                </div>
              </div>
              <div className={styles.serviceAccountsOption}>
                <button type="button" role="switch" aria-checked={hideServiceAccounts} aria-label="Hide service accounts" className={`${styles.serviceAccountsSwitchBtn} ${hideServiceAccounts ? styles.serviceAccountsSwitchBtnOn : ""}`} onClick={() => {
              setHideServiceAccounts(prev => !prev);
              setCurrentPage(1);
            }}>
                  <span className={styles.serviceAccountsSwitchTrack} aria-hidden="true">
                    <span className={styles.serviceAccountsSwitchThumb} aria-hidden="true" />
                  </span>
                  <span className={styles.serviceAccountsSwitchLabel}>Hide service accounts</span>
                </button>
                {hideServiceAccounts && serviceAccountsCount > 0 && <span className={styles.serviceAccountsCount}>
                    {serviceAccountsCount} service account{serviceAccountsCount > 1 ? 's' : ''} hidden
                  </span>}
              </div>
            </div>
            <SmartTooltip as="span" content="Export user list as CSV">
              <button type="button" className={`${styles.headerActionButton} ${styles.headerActionButtonInactive}`} onClick={exportUsersToCSV} aria-label="Export as CSV">
                <Icon icon="mdi:file-export" className={styles.headerActionIcon} />
              </button>
            </SmartTooltip>
          </div> : null}
          <div className={`${styles.licensesTableContainer} ${embedded ? styles.tableFill : ""}`} style={embedded ? undefined : {
        overflowY: 'hidden',
        maxHeight: 'none'
      }}>
            <table className={styles.licensesTable}>
              <thead>
                <tr>
                  <th style={{
                cursor: 'pointer',
                userSelect: 'none',
                width: '150px',
                maxWidth: '150px'
              }} onClick={() => handleSort('nom')}>
                    <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                      <span>Nom</span>
                      {getSortIcon('nom')}
                    </div>
                  </th>
                  <th style={{
                cursor: 'pointer',
                userSelect: 'none'
              }} onClick={() => handleSort('email')}>
                    <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                      <span>Email</span>
                      {getSortIcon('email')}
                    </div>
                  </th>
                  <th style={{
                cursor: 'pointer',
                userSelect: 'none'
              }} onClick={() => handleSort('dateCreation')}>
                    <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                      <span>Created on</span>
                      {getSortIcon('dateCreation')}
                    </div>
                  </th>
                  <th style={{
                cursor: 'pointer',
                userSelect: 'none'
              }} onClick={() => handleSort('statut')}>
                    <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                      <span>Status</span>
                      {getSortIcon('statut')}
                    </div>
                  </th>
                  <th style={{
                cursor: 'pointer',
                userSelect: 'none'
              }} onClick={() => handleSort('licence')}>
                    <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                      <span>License</span>
                      {getSortIcon('licence')}
                    </div>
                  </th>
                  <th style={{
                cursor: 'pointer',
                userSelect: 'none'
              }} onClick={() => handleSort('roleAdmin')}>
                    <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                      <span>Admin role</span>
                      {getSortIcon('roleAdmin')}
                    </div>
                  </th>
                  <th style={{
                cursor: 'pointer',
                userSelect: 'none'
              }} onClick={() => handleSort('admin')}>
                    <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                      <span>Admin</span>
                      {getSortIcon('admin')}
                    </div>
                  </th>
                  <th style={{
                cursor: 'pointer',
                userSelect: 'none'
              }} onClick={() => handleSort('mfaActive')}>
                    <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                      <span>MFA active</span>
                      {getSortIcon('mfaActive')}
                    </div>
                  </th>
                  <th style={{
                cursor: 'pointer',
                userSelect: 'none'
              }} onClick={() => handleSort('methodes')}>
                    <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                      <span>Methods</span>
                      {getSortIcon('methodes')}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user, idx) => {
              const lastLogin = user.lastLoginDate ? new Date(user.lastLoginDate) : null;
              const createdDate = user.createdDate ? new Date(user.createdDate) : null;
              const period90Days = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
              const isInactive = !lastLogin || lastLogin < period90Days;
              const period30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
              const isActive30 = lastLogin && lastLogin >= period30Days;
              const statusLabel = user.accountEnabled === false ? 'Blocked' : isActive30 ? 'Active' : isInactive ? 'Inactive (>90d)' : 'Inactive';
              const statusBg = user.accountEnabled === false ? '#fee2e2' : isActive30 ? '#d1fae5' : isInactive ? '#fef3c7' : '#e0e7ff';
              const statusColor = user.accountEnabled === false ? '#dc2626' : isActive30 ? '#059669' : isInactive ? '#d97706' : '#4338ca';
              const licenseNames = (() => {
                const raw = user.licenses;
                if (!raw) return 'None';
                const parts = Array.isArray(raw)
                  ? raw.map(lic => (typeof lic === 'string' ? lic : lic?.displayName || lic?.name || lic?.nom || '')).filter(Boolean)
                  : String(raw).split(', ');
                const labels = parts.map(lic => getLicenseDisplayName(String(lic).trim())).filter(Boolean);
                return labels.length ? labels.join(', ') : 'None';
              })();
              const mfaUser = getMfaUserFromIndex(user, mfaIndex);
              const mfaMethods = [...new Set(getMfaMethods(mfaUser).filter(m => getMfaMethodIcon(m) !== null))];
              const hasMfa = userHasMfa(mfaUser);
              const isAdmin = userIsAdmin(mfaUser);
              const methodIcons = mfaMethods.length > 0 ? mfaMethods.filter(m => getMfaMethodIcon(m) !== null).map((method, i) => <SmartTooltip key={i} content={getMfaMethodLabel(method)} placement="top">
                          <span className={styles.mfaMethodIcon}>
                            {getMfaMethodIcon(method)}
                          </span>
                        </SmartTooltip>) : null;
              return <tr key={startIndex + idx}>
                      <td style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '200px'
                }}>
                        {user.name || user.displayName || user.userPrincipalName || 'N/A'}
                      </td>
                      <td style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '250px'
                }}>
                        {user.email || user.userPrincipalName || 'N/A'}
                      </td>
                      <td>
                        {createdDate ? createdDate.toLocaleDateString('en-GB') : 'N/A'}
                      </td>
                      <td>
                        <span style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    backgroundColor: statusBg,
                    color: statusColor,
                    fontWeight: 500
                  }}>
                          {statusLabel}
                        </span>
                      </td>
                      <td style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '200px'
                }}>
                        {licenseNames}
                      </td>
                      <td>
                        {(() => {
                    const rawRole = mfaUser != null ? mfaUser.admin_role ?? mfaUser.adminRole ?? '' : '';
                    const roleIcons = getAdminRoleIcons(rawRole);
                    if (roleIcons.length > 0) {
                      return <div className={styles.mfaMethodsList}>
                                {roleIcons.map(({
                          icon,
                          label
                        }, i) => <SmartTooltip key={i} content={label} placement="top">
                                    <span className={styles.mfaMethodIcon} title={label}>
                                      <Icon icon={icon} />
                                    </span>
                                  </SmartTooltip>)}
                              </div>;
                    }
                    if (mfaUser != null && isAdmin) {
                      return <SmartTooltip content="Administrateur" placement="top">
                                <span className={styles.mfaMethodIcon} title="Administrateur">
                                  <Icon icon="mdi:shield-account-outline" />
                                </span>
                              </SmartTooltip>;
                    }
                    return <span style={{
                      color: 'var(--text-muted, #9ca3af)'
                    }}>-</span>;
                  })()}
                      </td>
                      <td>
                        {mfaUser != null ? isAdmin ? mfaUser.admin_role || mfaUser.adminRole ? <SmartTooltip content={mfaUser.admin_role || mfaUser.adminRole || ''} placement="top">
                                <span style={{
                      display: 'inline-flex',
                      alignItems: 'center'
                    }}>
                                  <FaCheck style={{
                        color: '#10b981',
                        fontSize: '1rem'
                      }} title="Administrateur" />
                                </span>
                              </SmartTooltip> : <FaCheck style={{
                    color: '#10b981',
                    fontSize: '1rem'
                  }} title="Administrateur" /> : <FaTimes style={{
                    color: 'var(--text-muted, #9ca3af)',
                    fontSize: '1rem'
                  }} title="Non admin" /> : <span style={{
                    color: 'var(--text-muted, #9ca3af)'
                  }}>-</span>}
                      </td>
                      <td>
                        {mfaUser != null ? hasMfa ? <FaCheck style={{
                    color: '#10b981',
                    fontSize: '1rem'
                  }} title="MFA active" /> : <FaTimes style={{
                    color: '#ef4444',
                    fontSize: '1rem'
                  }} title="MFA inactive" /> : <span style={{
                    color: 'var(--text-muted, #9ca3af)'
                  }}>-</span>}
                      </td>
                      <td>
                        {methodIcons && methodIcons.length > 0 ? <div className={styles.mfaMethodsList}>
                            {methodIcons}
                          </div> : mfaUser != null ? <span style={{
                    color: 'var(--text-muted, #9ca3af)',
                    fontSize: '0.8125rem'
                  }}>-</span> : <span style={{
                    color: 'var(--text-muted, #9ca3af)'
                  }}>-</span>}
                      </td>
                    </tr>;
            })}
              </tbody>
            </table>
          </div>

          {}
          {!embedded && totalPages > 1 && <div className={styles.pagination}>
              <button type="button" className={styles.paginationButton} onClick={handlePreviousPage} disabled={safeCurrentPage === 1} aria-label="Previous">
                <FaChevronLeft />
              </button>
              <span className={styles.paginationInfo}>
                Page {safeCurrentPage} / {totalPages}
              </span>
              <button type="button" className={styles.paginationButton} onClick={handleNextPage} disabled={safeCurrentPage === totalPages} aria-label="Next">
                <FaChevronRight />
              </button>
            </div>}
        </> : <div className={styles.noDataMessage}>
          <p>No users available. Please sync the data.</p>
        </div>}
    </section>;
}
