import { useState, useEffect, useMemo, useCallback } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { usePermissions } from "../../contexts/PermissionsContext";
import { canAccessAdminPanel, canAccessAdminNavKey } from "../../utils/adminPanelPermissions";
import { COMMUNITY_ADMIN_KEYS } from "../../config/edition";
import ProFeatureBadge from "../Misc/ProFeature/ProFeatureBadge";
import ProFeaturePromoModal from "../Misc/ProFeature/ProFeaturePromoModal";
import { setProFeaturePromoHandler } from "../Misc/ProFeature/proFeatureUtils";
import layout from "./AdminPanelLayout.module.css";
import AdminAccessDenied from "./AdminAccessDenied";
import AdminGeneralSettings from "./AdminGeneralSettings";
import AdminLoginBranding from "./AdminLoginBranding";
import AdminTechNewsFeeds from "./AdminTechNewsFeeds";
import AdminContractModuleOptions from "./AdminContractModuleOptions";
import AdminEquipmentFamilies from "./AdminEquipmentFamilies";
import AdminInfrastructureMap from "./AdminInfrastructureMap";
import AdminPlanning from "./AdminPlanning";
import AdminUsers from "./AdminUsers";
import AdminPermissions from "./AdminPermissions";
import AdminClients from "./AdminClients";
import AdminTickets from "./AdminTickets";
import AdminInterconnections from "./AdminInterconnections";
import AdminAi from "./AdminAi";
import AdminRmm from "./AdminRmm";
import AdminSupervisionAlertRules from "./AdminSupervisionAlertRules";
import AdminMaintenance from "./AdminMaintenance";
import AdminClientPortal from "./AdminClientPortal";
import AdminLicense from "./AdminLicense";
import AdminTeams from "./AdminTeams";
import AdminSlaSettings from "./AdminSlaSettings";
import AdminSupportCreditsPage from "./AdminSupportCreditsPage";
import AdminServiceSettingsPage from "./AdminServiceSettingsPage";
import AdminNotificationsHub from "./AdminNotificationsHub";
import AdminMailCollectPage from "./AdminMailCollectPage";
import AdminInjection from "./AdminInjection";
import AdminEquipmentPurge from "./AdminEquipmentPurge";
import { buildAdminNavSections, findParentGroupKey, flattenNavItems, getAdminPanelCopy } from "./adminPanelI18n";
import { getAdminInjectionCopy } from "./adminInjectionI18n";
import { interpolate } from "../../i18n/translate";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { disableAdminToastPosition, enableAdminToastPosition } from "../../utils/toastPosition";
const TAB_COMPONENTS = {
  general: AdminGeneralSettings,
  "login-branding": AdminLoginBranding,
  "tech-news-feeds": AdminTechNewsFeeds,
  "contract-modules": AdminContractModuleOptions,
  "equipment-families": AdminEquipmentFamilies,
  "infrastructure-map": AdminInfrastructureMap,
  planning: AdminPlanning,
  users: AdminUsers,
  permissions: AdminPermissions,
  teams: AdminTeams,
  "client-portal": AdminClientPortal,
  clients: AdminClients,
  "support-credits": AdminSupportCreditsPage,
  tickets: AdminTickets,
  sla: AdminSlaSettings,
  "service-settings": AdminServiceSettingsPage,
  "mail-collect": AdminMailCollectPage,
  "notifications-inapp": AdminNotificationsHub,
  notifications: AdminNotificationsHub,
  integrations: AdminInterconnections,
  ai: AdminAi,
  rmm: AdminRmm,
  "supervision-alert-rules": AdminSupervisionAlertRules,
  injection: AdminInjection,
  "equipment-purge": AdminEquipmentPurge,
  maintenance: AdminMaintenance,
  license: AdminLicense
};
const ADMIN_PANEL_PRO_PROMO = {
  "login-branding": "adminLoginBranding",
  "tech-news-feeds": "adminTechNewsFeeds",
  teams: "adminTeams",
  "contract-modules": "adminContractModules",
  "equipment-families": "adminEquipmentFamilies",
  "infrastructure-map": "adminEquipmentFamilies",
  planning: "planning",
  "support-credits": "credits",
  sla: "sla",
  "service-settings": "prestations",
  integrations: "adminIntegrations"
};
function normalizeAdminNavSearch(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
function navItemMatchesSearch(item, sectionTitle, tokens) {
  const haystack = normalizeAdminNavSearch([sectionTitle, item.label, item.description, item.key.replace(/-/g, " ")].join(" "));
  return tokens.every(token => haystack.includes(token));
}
function resolveLegacyNavigation(parsed) {
  const fromTickets = view => parsed?.tab === "tickets" && parsed?.ticketView === view;
  if (fromTickets("support-credits")) return {
    tab: "support-credits"
  };
  if (fromTickets("sales-forms")) return {
    tab: "service-settings",
    serviceView: "sales-forms"
  };
  if (parsed?.tab === "sales-forms") return {
    tab: "service-settings",
    serviceView: "sales-forms"
  };
  if (parsed?.tab === "sales-ticket-views") return {
    tab: "service-settings",
    serviceView: "sales-ticket-views"
  };
  if (fromTickets("notifications")) {
    return {
      tab: "notifications",
      hub: {
        hub: "notifications",
        view: "system"
      }
    };
  }
  if (fromTickets("webhooks")) {
    return {
      tab: "notifications",
      hub: {
        hub: "notifications",
        view: "connectors"
      }
    };
  }
  if (fromTickets("collectors")) {
    return {
      tab: "mail-collect",
      hub: {
        hub: "mail-collect",
        view: "collectors"
      }
    };
  }
  if (fromTickets("email-ingestion")) {
    return {
      tab: "mail-collect",
      hub: {
        hub: "mail-collect",
        view: "email-ingestion"
      }
    };
  }
  if (fromTickets("mail-collect-options")) {
    return {
      tab: "mail-collect",
      hub: {
        hub: "mail-collect",
        view: "mail-collect-options"
      }
    };
  }
  const tab = parsed?.tab;
  if (tab === "webhooks") {
    return {
      tab: "notifications",
      hub: {
        hub: "notifications",
        view: "connectors"
      }
    };
  }
  if (tab === "collectors") {
    return {
      tab: "mail-collect",
      hub: {
        hub: "mail-collect",
        view: "collectors"
      }
    };
  }
  if (tab === "email-ingestion") {
    return {
      tab: "mail-collect",
      hub: {
        hub: "mail-collect",
        view: "email-ingestion"
      }
    };
  }
  if (tab === "mail-collect-options") {
    return {
      tab: "mail-collect",
      hub: {
        hub: "mail-collect",
        view: "mail-collect-options"
      }
    };
  }
  if (tab === "notifications-inapp" || tab === "notifications") {
    return {
      tab: "notifications",
      hub: {
        hub: "notifications",
        view: "system"
      }
    };
  }
  return {
    tab
  };
}
export default function AdminPanel({
  isCommunity = false,
  routeTab = null,
  onRouteTabChange,
  onInjectionRunningChange,
  onOpenPage
}) {
  const {
    can,
    canAny,
    isAdmin
  } = usePermissions();
  const hasAdminAccess = canAccessAdminPanel(canAny, isAdmin);
  const locale = useAppLocale();
  const panelCopy = useMemo(() => getAdminPanelCopy(locale), [locale]);
  const injectionCopy = useMemo(() => getAdminInjectionCopy(locale), [locale]);
  const [activeTab, setActiveTab] = useState("general");
  const [proPromoFeature, setProPromoFeature] = useState(null);
  const [navSearch, setNavSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState(() => new Set());
  const [injectionRunning, setInjectionRunning] = useState(false);
  const handleInjectionRunningChange = useCallback(running => {
    const next = Boolean(running);
    setInjectionRunning(next);
    onInjectionRunningChange?.(next);
  }, [onInjectionRunningChange]);
  useEffect(() => {
    setProFeaturePromoHandler(featureKey => setProPromoFeature(featureKey));
    return () => setProFeaturePromoHandler(null);
  }, []);
  useEffect(() => {
    enableAdminToastPosition();
    return () => disableAdminToastPosition();
  }, []);
  useEffect(() => () => onInjectionRunningChange?.(false), [onInjectionRunningChange]);
  const navSections = useMemo(() => {
    const applyProOnly = item => {
      if (item.children) {
        return {
          ...item,
          children: item.children.map(child => ({
            ...child,
            proOnly: !COMMUNITY_ADMIN_KEYS.has(child.key)
          }))
        };
      }
      return {
        ...item,
        proOnly: !COMMUNITY_ADMIN_KEYS.has(item.key)
      };
    };
    const filterByPermission = item => {
      if (item.children) {
        const children = item.children.filter(child => canAccessAdminNavKey(can, child.key, isAdmin));
        if (children.length === 0) return null;
        return {
          ...item,
          children
        };
      }
      if (!canAccessAdminNavKey(can, item.key, isAdmin)) return null;
      return item;
    };
    const base = !isCommunity ? buildAdminNavSections(locale) : buildAdminNavSections(locale).map(section => ({
      ...section,
      items: section.items.map(applyProOnly)
    }));
    return base.map(section => ({
      ...section,
      items: section.items.map(filterByPermission).filter(Boolean)
    })).filter(section => section.items.length > 0);
  }, [isCommunity, locale, can, isAdmin]);
  const visibleItems = useMemo(() => navSections.flatMap(section => flattenNavItems(section.items)), [navSections]);
  const allowedNavKeys = useMemo(() => visibleItems.filter(item => !item.proOnly).map(item => item.key), [visibleItems]);
  const navSearchTokens = useMemo(() => {
    const query = normalizeAdminNavSearch(navSearch);
    return query ? query.split(/\s+/).filter(Boolean) : [];
  }, [navSearch]);
  const filteredNavSections = useMemo(() => {
    if (navSearchTokens.length === 0) return navSections;
    return navSections.map(section => ({
      ...section,
      items: section.items.flatMap(item => {
        if (!item.children) {
          return navItemMatchesSearch(item, section.title, navSearchTokens) ? [item] : [];
        }
        const groupMatches = navItemMatchesSearch(item, section.title, navSearchTokens);
        const matchingChildren = item.children.filter(child => navItemMatchesSearch(child, [section.title, item.label].filter(Boolean).join(" "), navSearchTokens));
        if (groupMatches) return [{
          ...item,
          children: item.children
        }];
        if (matchingChildren.length > 0) return [{
          ...item,
          children: matchingChildren
        }];
        return [];
      })
    })).filter(section => section.items.length > 0);
  }, [navSections, navSearchTokens]);
  const isGroupExpanded = groupKey => expandedGroups.has(groupKey) || navSearchTokens.length > 0;
  const toggleNavGroup = groupKey => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);else next.add(groupKey);
      return next;
    });
  };
  const handleNavClick = item => {
    if (injectionRunning && item.key !== "injection") {
      toast.warn(injectionCopy.navBlocked);
      return;
    }
    if (isCommunity && item.proOnly) {
      const promoKey = ADMIN_PANEL_PRO_PROMO[item.key];
      if (promoKey) setProPromoFeature(promoKey);
      return;
    }
    setActiveTab(item.key);
    onRouteTabChange?.(item.key);
  };
  useEffect(() => {
    const parentGroup = findParentGroupKey(activeTab);
    if (!parentGroup) return;
    setExpandedGroups(prev => {
      if (prev.has(parentGroup)) return prev;
      const next = new Set(prev);
      next.add(parentGroup);
      return next;
    });
  }, [activeTab]);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("veritas_admin_nav");
      if (!raw) return;
      sessionStorage.removeItem("veritas_admin_nav");
      const parsed = JSON.parse(raw);
      const {
        tab: resolvedTab,
        hub,
        serviceView
      } = resolveLegacyNavigation(parsed);
      if (hub) {
        sessionStorage.setItem("veritas_admin_hub_view", JSON.stringify(hub));
      }
      if (resolvedTab && allowedNavKeys.includes(resolvedTab)) {
        setActiveTab(resolvedTab);
        if (resolvedTab === "service-settings" && (serviceView === "sales-forms" || serviceView === "sales-ticket-views" || parsed?.serviceView === "sales-forms" || parsed?.serviceView === "sales-ticket-views")) {
          sessionStorage.setItem("veritas_admin_service_view", serviceView || parsed.serviceView);
        }
      } else if (resolvedTab && isCommunity && ADMIN_PANEL_PRO_PROMO[resolvedTab]) {
        setProPromoFeature(ADMIN_PANEL_PRO_PROMO[resolvedTab]);
      }
      if (parsed?.ticketView && parsed?.tab === "tickets") {
        const migrated = resolveLegacyNavigation(parsed);
        const ticketSubViews = new Set(["templates", "macros", "solution-catalog", "support-forms", "categories", "ticket-views"]);
        if (ticketSubViews.has(parsed.ticketView)) {
          sessionStorage.setItem("veritas_admin_ticket_view", parsed.ticketView);
        } else if (!migrated.hub && migrated.tab === "tickets") {
          sessionStorage.setItem("veritas_admin_ticket_view", parsed.ticketView);
        }
      }
    } catch {}
  }, [allowedNavKeys, isCommunity]);
  useEffect(() => {
    if (!allowedNavKeys.includes(activeTab)) {
      if (injectionRunning && activeTab === "injection") return;
      setActiveTab(allowedNavKeys[0] || "general");
    }
  }, [activeTab, allowedNavKeys, injectionRunning]);
  useEffect(() => {
    if (!routeTab || !allowedNavKeys.includes(routeTab)) return;
    setActiveTab(prev => {
      if (prev === routeTab) return prev;
      if (injectionRunning && routeTab !== "injection" && prev === "injection") return prev;
      return routeTab;
    });
  }, [routeTab, allowedNavKeys, injectionRunning]);
  if (!hasAdminAccess) {
    return <AdminAccessDenied />;
  }
  const ActiveComponent = TAB_COMPONENTS[activeTab];
  return <div className={layout.layout}>
      <aside className={layout.sidebar} aria-label="Navigation administration">
        <div className={layout.sidebarTop}>
          <label className={layout.sidebarSearch}>
            <Icon icon="mdi:magnify" className={layout.sidebarSearchIcon} aria-hidden />
            <input type="search" className={layout.sidebarSearchInput} value={navSearch} onChange={event => setNavSearch(event.target.value)} placeholder={panelCopy.searchPlaceholder} aria-label={panelCopy.searchPlaceholder} />
            {navSearch ? <button type="button" className={layout.sidebarSearchClear} onClick={() => setNavSearch("")} aria-label={panelCopy.clearSearch}>
                <Icon icon="mdi:close" />
              </button> : null}
          </label>
        </div>

        <div className={layout.sidebarNav}>
        {filteredNavSections.length === 0 && navSearchTokens.length > 0 ? <p className={layout.navSearchEmpty}>
            {interpolate(panelCopy.noResults, {
            query: navSearch.trim()
          })}
          </p> : null}

        {filteredNavSections.map(section => <div key={section.title || section.items[0]?.key} className={layout.navSection}>
            {section.title ? <div className={layout.navSectionTitle}>{section.title}</div> : null}
            <ul className={layout.navList}>
              {section.items.map(item => {
              if (item.children) {
                const expanded = isGroupExpanded(item.key);
                const hasActiveChild = item.children.some(child => activeTab === child.key && !child.proOnly);
                return <li key={item.key} className={layout.navGroup}>
                      <button type="button" className={`${layout.navItem} ${layout.navGroupToggle} ${hasActiveChild ? layout.navGroupActive : ""}`} onClick={() => toggleNavGroup(item.key)} aria-expanded={expanded}>
                        <Icon icon={item.icon} className={layout.navIcon} />
                        <span className={layout.navItemText}>
                          <span className={layout.navItemLabelRow}>
                            <span className={layout.navItemLabel}>{item.label}</span>
                          </span>
                          <span className={layout.navItemDesc}>{item.description}</span>
                        </span>
                        <Icon icon="mdi:chevron-down" className={`${layout.navGroupChevron} ${expanded ? layout.navGroupChevronOpen : ""}`} aria-hidden />
                      </button>
                      {expanded ? <ul className={layout.navSubList}>
                          {item.children.map(child => <li key={child.key}>
                              <button type="button" className={`${layout.navItem} ${layout.navSubItem} ${activeTab === child.key && !child.proOnly ? layout.navItemActive : ""} ${child.proOnly ? layout.navItemProLocked : ""}`} onClick={() => handleNavClick(child)} aria-disabled={child.proOnly || undefined}>
                                <span className={layout.navItemText}>
                                  <span className={layout.navItemLabelRow}>
                                    <span className={layout.navItemLabel}>{child.label}</span>
                                    {child.proOnly ? <ProFeatureBadge variant="inline" className={layout.navItemProBadge} /> : null}
                                  </span>
                                  <span className={layout.navItemDesc}>{child.description}</span>
                                </span>
                              </button>
                            </li>)}
                        </ul> : null}
                    </li>;
              }
              return <li key={item.key}>
                    <button type="button" className={`${layout.navItem} ${activeTab === item.key && !item.proOnly ? layout.navItemActive : ""} ${item.proOnly ? layout.navItemProLocked : ""}`} onClick={() => handleNavClick(item)} aria-disabled={item.proOnly || undefined}>
                      <Icon icon={item.icon} className={layout.navIcon} />
                      <span className={layout.navItemText}>
                        <span className={layout.navItemLabelRow}>
                          <span className={layout.navItemLabel}>{item.label}</span>
                          {item.proOnly ? <ProFeatureBadge variant="inline" className={layout.navItemProBadge} /> : null}
                        </span>
                        <span className={layout.navItemDesc}>{item.description}</span>
                      </span>
                    </button>
                  </li>;
            })}
            </ul>
          </div>)}

        </div>
      </aside>

      <div className={layout.main}>
        <div className={layout.content}>
          {ActiveComponent ? <ActiveComponent isCommunity={isCommunity} {...activeTab === "injection" ? {
          onRunningChange: handleInjectionRunningChange
        } : null} onOpenPage={onOpenPage} onNavigate={tab => {
          if (injectionRunning && tab !== "injection") {
            toast.warn(injectionCopy.navBlocked);
            return;
          }
          if (allowedNavKeys.includes(tab)) {
            setActiveTab(tab);
            onRouteTabChange?.(tab);
          }
        }} /> : null}
        </div>
      </div>

      <ProFeaturePromoModal open={Boolean(proPromoFeature)} featureKey={proPromoFeature} onClose={() => setProPromoFeature(null)} />
    </div>;
}
