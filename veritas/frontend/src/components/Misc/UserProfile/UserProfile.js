import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { fetchCurrentUser, resetPassword, updateEmail, updateUsername } from "../../../api/users";
import { saveUserSetting } from "../../../api/userSettings";
import { fetchNotificationPreferences, saveNotificationPreferences } from "../../../api/notifications";
import { fetchSubscriptions, removeSubscription, saveSubscription } from "../../../api/subscriptions";
import { disableMfa, setupMfa, verifyMfa } from "../../../api/mfa";
import { useAuthContext } from "../../../contexts/AuthContext";
import { setUserLocaleOverride, useAppLocale } from "../../../hooks/useAppGeneralSettings";
import { APP_LOCALES } from "../../../i18n/locales";
import AvatarEditor from "../../shared/UserAvatar/AvatarEditor";
import UserAvatar from "../../shared/UserAvatar/UserAvatar";
import UserInfoIcons from "./UserInfoIcons";
import { DEFAULT_TICKET_CHAT_UI_SETTINGS, TICKET_CHAT_UI_SETTINGS_KEY, normalizeTicketChatUiSettings } from "../../../utils/ticketChatUiSettings";
import { DEFAULT_USER_IN_APP_PREFERENCES, normalizeUserInAppPreferences } from "../../../utils/inAppNotificationSettings";
import { Modal, ModalFooter, ModalForm, IconField, Input, Btn, BtnIcon, FieldRow, Switch, ChoiceGroup } from "../../AdminPage/AdminUi";
import layout from "../../EnterprisesPage/EnterprisesPage.module.css";
import account from "../AccountPage/AccountPage.module.css";
import MspPageHero from "../MspPageHero/MspPageHero";
import mspStyles from "../../CybersecuritePage/CybersecuritePage.module.css";
import s from "./UserProfile.module.css";
import { useSidebarLayout } from "../../../hooks/useSidebarLayout";
import { SIDEBAR_LAYOUTS } from "../../../utils/sidebarLayoutPreferences";
import { formatProfileDate, getLocalizedNotifEventOptions, getMfaStatus, getNotificationsSectionDescription, getUserProfileCopy } from "./userProfileI18n";

const APP_LOCALE_KEY = "app_locale";
const PLANNING_VISIBILITY_KEY = "planning_visibility";

const NAV_ITEMS = [{
  id: "account",
  icon: "mdi:account-cog-outline"
}, {
  id: "interface",
  icon: "mdi:view-dashboard-outline"
}, {
  id: "support",
  icon: "mdi:headset"
}, {
  id: "accessibility",
  icon: "mdi:eye-outline"
}, {
  id: "notifications",
  icon: "mdi:bell-outline"
}, {
  id: "planning",
  icon: "mdi:calendar-lock-outline"
}];

function SectionPanel({
  title,
  description,
  children,
  full
}) {
  return <section className={`${account.sectionPanel} ${full ? account.sectionPanelFull : ""}`}>
      <header className={account.sectionHeader}>
        <h2 className={account.sectionTitle}>{title}</h2>
        {description && <p className={account.sectionDesc}>{description}</p>}
      </header>
      <div className={account.sectionBody}>{children}</div>
    </section>;
}

export default function UserProfile({ onNavigate } = {}) {
  const locale = useAppLocale();
  const t = useMemo(() => getUserProfileCopy(locale), [locale]);
  const notifEventOptions = useMemo(() => getLocalizedNotifEventOptions(locale), [locale]);
  const {
    patchUser,
    setMfaEnabledFlag
  } = useAuthContext();
  const {
    layout: sidebarLayout,
    setLayout: setSidebarLayout,
    saving: savingSidebarLayout
  } = useSidebarLayout();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("account");
  const [usernameModal, setUsernameModal] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [mfaModal, setMfaModal] = useState(false);
  const [mfaDisableModal, setMfaDisableModal] = useState(false);
  const [mfaMode, setMfaMode] = useState("setup");
  const [draftUsername, setDraftUsername] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [draftPwd1, setDraftPwd1] = useState("");
  const [draftPwd2, setDraftPwd2] = useState("");
  const [helpdeskName, setHelpdeskName] = useState("");
  const [savingHelpdesk, setSavingHelpdesk] = useState(false);
  const [chatUiSettings, setChatUiSettings] = useState(DEFAULT_TICKET_CHAT_UI_SETTINGS);
  const [savingChatUi, setSavingChatUi] = useState(false);
  const [notifAdminDefaults, setNotifAdminDefaults] = useState(null);
  const [notifPreferences, setNotifPreferences] = useState(DEFAULT_USER_IN_APP_PREFERENCES);
  const [savingNotifPrefs, setSavingNotifPrefs] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [savingSubscriptionKey, setSavingSubscriptionKey] = useState("");
  const [appLocale, setAppLocale] = useState(locale);
  const [savingLocale, setSavingLocale] = useState(false);
  const [planningVisibility, setPlanningVisibility] = useState("public");
  const [savingPlanning, setSavingPlanning] = useState(false);
  const [mfaSetup, setMfaSetup] = useState(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaDisableCode, setMfaDisableCode] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);
  const [savingIdentity, setSavingIdentity] = useState(false);

  const applyUserLocale = useCallback(code => {
    if (!code) return;
    setAppLocale(code);
    setUserLocaleOverride(code);
  }, []);

  const loadUser = useCallback(async () => {
    try {
      const [data, notifPayload] = await Promise.all([fetchCurrentUser(), fetchNotificationPreferences().catch(() => null)]);
      setUser(data);
      setHelpdeskName(data.ticket_helpdesk_display_name || "");
      setChatUiSettings(normalizeTicketChatUiSettings(data.ticket_chat_ui_settings));
      setPlanningVisibility(data.planning_visibility === "private" ? "private" : "public");
      if (data.app_locale) {
        applyUserLocale(data.app_locale);
      } else {
        setAppLocale(prev => prev || data.app_locale || "fr");
      }
      if (notifPayload) {
        setNotifAdminDefaults(notifPayload.adminDefaults || null);
        setNotifPreferences(normalizeUserInAppPreferences(notifPayload.userPreferences));
      }
    } catch {
      toast.error(t.toast.loadError);
    } finally {
      setLoading(false);
    }
  }, [t.toast.loadError, applyUserLocale]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const loadSubscriptions = useCallback(async () => {
    setLoadingSubscriptions(true);
    try {
      const payload = await fetchSubscriptions();
      setSubscriptions(Array.isArray(payload?.items) ? payload.items : []);
    } catch (err) {
      console.error("Error loading subscriptions:", err);
      setSubscriptions([]);
    } finally {
      setLoadingSubscriptions(false);
    }
  }, []);

  useEffect(() => {
    if (activeSection !== "notifications") return undefined;
    loadSubscriptions();
    return undefined;
  }, [activeSection, loadSubscriptions]);

  const subscriptionTypeLabel = useCallback(type => {
    if (type === "enterprise") return t.subscriptions.typeEnterprise;
    if (type === "contact") return t.subscriptions.typeContact;
    if (type === "equipment") return t.subscriptions.typeEquipment;
    return type;
  }, [t.subscriptions]);

  const openSubscriptionTarget = useCallback(item => {
    if (!onNavigate || !item) return;
    if (item.entityType === "enterprise") {
      onNavigate("ContratDetail", { clientId: item.entityId, id: item.entityId, name: item.label || undefined });
      return;
    }
    if (item.entityType === "contact") {
      onNavigate("ContactDetail", { contactId: item.entityId, id: item.entityId, name: item.label || undefined });
      return;
    }
    if (item.entityType === "equipment") {
      onNavigate("EquipmentDetail", {
        id: item.entityId,
        dbId: item.entityId,
        clientId: item.meta?.clientId || null,
        name: item.label || item.entityId,
        type: item.meta?.family || null
      });
    }
  }, [onNavigate]);

  const handleSubscriptionChannelChange = useCallback(async (item, channel, value) => {
    const key = `${item.entityType}:${item.entityId}`;
    setSavingSubscriptionKey(key);
    try {
      const payload = await saveSubscription(item.entityType, item.entityId, {
        notifyInapp: channel === "inapp" ? value : item.notifyInapp !== false,
        notifyEmail: channel === "email" ? value : item.notifyEmail === true
      });
      const next = payload?.item;
      setSubscriptions(prev => prev.map(row =>
        row.entityType === item.entityType && String(row.entityId) === String(item.entityId)
          ? { ...row, ...next, label: row.label, meta: row.meta }
          : row
      ));
    } catch (err) {
      toast.error(err.message || t.subscriptions.error);
    } finally {
      setSavingSubscriptionKey("");
    }
  }, [t.subscriptions.error]);

  const handleUnsubscribe = useCallback(async item => {
    const key = `${item.entityType}:${item.entityId}`;
    setSavingSubscriptionKey(key);
    try {
      await removeSubscription(item.entityType, item.entityId);
      setSubscriptions(prev => prev.filter(row =>
        !(row.entityType === item.entityType && String(row.entityId) === String(item.entityId))
      ));
      toast.info(t.subscriptions.unsubscribedToast);
    } catch (err) {
      toast.error(err.message || t.subscriptions.error);
    } finally {
      setSavingSubscriptionKey("");
    }
  }, [t.subscriptions.error, t.subscriptions.unsubscribedToast]);

  const mfaStatus = useMemo(() => {
    const status = getMfaStatus(user, locale);
    return {
      ...status,
      className: s[status.className],
      desc: status.key === "enabled" ? t.mfa.enabledDesc : status.key === "pending" ? t.mfa.pendingDesc : t.mfa.offDesc
    };
  }, [user, locale, t.mfa]);

  const displayName = user?.username?.trim() || user?.email || "-";
  const localeOptions = useMemo(() => APP_LOCALES.map(({
    code,
    flag,
    flagIcon,
    label
  }) => ({
    value: code,
    flag,
    flagIcon,
    label
  })), []);
  const planningOptions = useMemo(() => [{
    value: "public",
    label: t.planning.public,
    icon: "mdi:earth"
  }, {
    value: "private",
    label: t.planning.private,
    icon: "mdi:lock-outline"
  }], [t.planning.public, t.planning.private]);

  const handleAvatarUpdated = avatar => {
    setUser(prev => ({
      ...(prev || {}),
      avatar: avatar || undefined
    }));
    patchUser?.({
      avatar: avatar || undefined
    });
  };

  const openUsernameModal = () => {
    setDraftUsername("");
    setUsernameModal(true);
  };
  const openEmailModal = () => {
    setDraftEmail("");
    setEmailModal(true);
  };
  const openPasswordModal = () => {
    setDraftPwd1("");
    setDraftPwd2("");
    setPasswordModal(true);
  };

  const handleSaveUsername = async () => {
    const value = draftUsername.trim();
    if (value.length < 2) return toast.error(t.toast.usernameTooShort);
    setSavingIdentity(true);
    try {
      await updateUsername(user.id, value);
      toast.success(t.toast.usernameUpdated);
      setUsernameModal(false);
      await loadUser();
    } catch {
      toast.error(t.toast.usernameError);
    } finally {
      setSavingIdentity(false);
    }
  };

  const handleSaveEmail = async () => {
    const value = draftEmail.trim();
    if (!value.includes("@")) return toast.error(t.toast.emailInvalid);
    setSavingIdentity(true);
    try {
      await updateEmail(user.id, value);
      toast.success(t.toast.emailUpdated);
      setEmailModal(false);
      await loadUser();
    } catch {
      toast.error(t.toast.emailError);
    } finally {
      setSavingIdentity(false);
    }
  };

  const handleSavePassword = async () => {
    if (draftPwd1.length < 6) return toast.error(t.toast.passwordTooShort);
    if (draftPwd1 !== draftPwd2) return toast.error(t.toast.passwordMismatch);
    setSavingIdentity(true);
    try {
      await resetPassword(user.id, draftPwd1);
      toast.success(t.toast.passwordUpdated);
      setPasswordModal(false);
    } catch {
      toast.error(t.toast.passwordError);
    } finally {
      setSavingIdentity(false);
    }
  };

  const handleSaveHelpdeskName = async () => {
    setSavingHelpdesk(true);
    try {
      const value = helpdeskName.trim() || null;
      await saveUserSetting("ticket_helpdesk_display_name", value);
      toast.success(t.toast.helpdeskSaved);
      await loadUser();
    } catch {
      toast.error(t.toast.helpdeskError);
    } finally {
      setSavingHelpdesk(false);
    }
  };

  const handleSaveChatUiSettings = async () => {
    setSavingChatUi(true);
    try {
      const payload = normalizeTicketChatUiSettings(chatUiSettings);
      await saveUserSetting(TICKET_CHAT_UI_SETTINGS_KEY, payload);
      setChatUiSettings(payload);
      toast.success(t.toast.chatUiSaved);
      await loadUser();
    } catch {
      toast.error(t.toast.chatUiError);
    } finally {
      setSavingChatUi(false);
    }
  };

  const handleSaveNotifPreferences = async () => {
    setSavingNotifPrefs(true);
    try {
      const payload = normalizeUserInAppPreferences(notifPreferences);
      const saved = await saveNotificationPreferences(payload);
      setNotifPreferences(normalizeUserInAppPreferences(saved.userPreferences || payload));
      setNotifAdminDefaults(saved.adminDefaults || notifAdminDefaults);
      toast.success(t.toast.notifSaved);
    } catch {
      toast.error(t.toast.notifError);
    } finally {
      setSavingNotifPrefs(false);
    }
  };

  const handleResetNotifPreferences = () => {
    setNotifPreferences(normalizeUserInAppPreferences(DEFAULT_USER_IN_APP_PREFERENCES));
  };

  const updateNotifEvent = (eventKey, enabled) => {
    setNotifPreferences(prev => ({
      ...prev,
      events: {
        ...prev.events,
        [eventKey]: {
          enabled
        }
      }
    }));
  };

  const handleLocaleChange = async value => {
    if (!value || value === appLocale) return;
    setSavingLocale(true);
    try {
      await saveUserSetting(APP_LOCALE_KEY, value);
      applyUserLocale(value);
      setUser(prev => prev ? {
        ...prev,
        app_locale: value
      } : prev);
      toast.success(t.toast.localeSaved);
    } catch {
      toast.error(t.toast.localeError);
    } finally {
      setSavingLocale(false);
    }
  };

  const handleSidebarLayoutChange = async value => {
    if (!value || value === sidebarLayout) return;
    try {
      await setSidebarLayout(value);
      toast.success(t.toast.sidebarLayoutSaved);
    } catch {
      toast.error(t.toast.sidebarLayoutError);
    }
  };

  const sidebarLayoutOptions = useMemo(() => [{
    value: SIDEBAR_LAYOUTS.vertical,
    label: t.sidebarLayout.verticalLabel,
    description: t.sidebarLayout.verticalDesc,
    icon: "mdi:view-dashboard-outline"
  }, {
    value: SIDEBAR_LAYOUTS.horizontal,
    label: t.sidebarLayout.horizontalLabel,
    description: t.sidebarLayout.horizontalDesc,
    icon: "mdi:view-sequential-outline"
  }], [t.sidebarLayout]);

  const handlePlanningVisibilityChange = async value => {
    if (!value || value === planningVisibility) return;
    setSavingPlanning(true);
    try {
      await saveUserSetting(PLANNING_VISIBILITY_KEY, value);
      setPlanningVisibility(value);
      setUser(prev => prev ? {
        ...prev,
        planning_visibility: value
      } : prev);
      toast.success(t.toast.planningSaved);
    } catch {
      toast.error(t.toast.planningError);
    } finally {
      setSavingPlanning(false);
    }
  };

  const startMfaSetup = async () => {
    setMfaBusy(true);
    try {
      const data = await setupMfa();
      setMfaSetup(data);
      setMfaCode("");
      setMfaMode("setup");
      setMfaModal(true);
    } catch (err) {
      toast.error(err.message || t.toast.mfaSetupError);
    } finally {
      setMfaBusy(false);
    }
  };

  const openMfaDisableModal = (mode = "disable") => {
    setMfaMode(mode);
    setMfaDisableCode("");
    setMfaDisableModal(true);
  };

  const handleDisableMfa = async () => {
    if (mfaDisableCode.trim().length < 6) return;
    setMfaBusy(true);
    try {
      await disableMfa(mfaDisableCode.trim());
      setMfaDisableModal(false);
      setMfaDisableCode("");
      setMfaEnabledFlag?.(false);
      if (mfaMode === "reconfigure") {
        toast.success(t.toast.mfaDisabled);
        await startMfaSetup();
      } else {
        toast.success(t.toast.mfaDisabled);
        await loadUser();
      }
    } catch (err) {
      toast.error(err.message || t.toast.mfaDisableError);
    } finally {
      setMfaBusy(false);
    }
  };

  const handleVerifyMfa = async () => {
    if (mfaCode.trim().length < 6) return;
    setMfaBusy(true);
    try {
      await verifyMfa(mfaCode.trim());
      toast.success(mfaMode === "reconfigure" ? t.toast.mfaChanged : t.toast.mfaEnabled);
      setMfaEnabledFlag?.(true);
      setMfaModal(false);
      setMfaSetup(null);
      setMfaCode("");
      setMfaMode("setup");
      await loadUser();
    } catch (err) {
      toast.error(err.message || t.toast.mfaInvalidCode);
    } finally {
      setMfaBusy(false);
    }
  };

  if (loading) {
    return <div className={`${mspStyles.mspPage} ${layout.page}`}>
        <div className={mspStyles.mspLayout}>
          <div className={mspStyles.mspMain}>
            <div className={`${layout.shell} ${layout.shellFluid}`}>
              <div className={layout.stateBox}>
                <Icon icon="mdi:loading" className={layout.spinning} />
                <span>{t.loading}</span>
              </div>
            </div>
          </div>
        </div>
      </div>;
  }

  if (!user) {
    return <div className={`${mspStyles.mspPage} ${layout.page}`}>
        <div className={mspStyles.mspLayout}>
          <div className={mspStyles.mspMain}>
            <div className={`${layout.shell} ${layout.shellFluid}`}>
              <div className={`${layout.stateBox} ${layout.stateBoxError}`}>
                <Icon icon="mdi:alert-circle-outline" />
                <span>{t.loadProfileError}</span>
              </div>
            </div>
          </div>
        </div>
      </div>;
  }

  const helpdeskPreview = helpdeskName.trim() || user.username || user.email || t.defaultAgent;
  const notifGloballyDisabled = notifAdminDefaults?.enabled === false;
  const notifUserEnabled = notifPreferences.enabled !== false;
  const activeNotifEventsCount = notifEventOptions.filter(option => {
    if (!notifUserEnabled || notifGloballyDisabled) return false;
    if (notifAdminDefaults?.events?.[option.key]?.enabled === false) return false;
    return notifPreferences.events?.[option.key]?.enabled !== false;
  }).length;

  return <div className={`${mspStyles.mspPage} ${layout.page}`}>
      <div className={mspStyles.mspLayout}>
        <div className={mspStyles.mspMain}>
          {user.is_active === false && <div className={s.alertBannerWrap}>
              <div className={account.alertBanner}>
                <Icon icon="mdi:alert-circle-outline" className={account.alertIcon} />
                {t.accountDisabled}
              </div>
            </div>}

          <MspPageHero
            eyebrow={t.eyebrow}
            title={t.pageTitle}
            subtitle={t.nav?.account?.desc || null}
            icon="mdi:account-circle-outline"
            className={s.heroWithUser}
            actions={
              <UserInfoIcons
                user={user}
                name={displayName}
                job={user.profile_label || t.roles[user.role] || user.profile || ""}
                email={user.email}
                detail={formatProfileDate(user.last_login_at, locale)}
                detailIcon="tabler:clock"
              />
            }
          />

          <main className={mspStyles.mspContent}>
              <div className={s.accountShell}>
          <nav className={s.nav} aria-label={t.pageTitle}>
            {NAV_ITEMS.map(item => {
            const copy = t.nav[item.id];
            const active = activeSection === item.id;
            return <button key={item.id} type="button" className={`${s.navItem} ${active ? s.navItemActive : ""}`} onClick={() => setActiveSection(item.id)} aria-current={active ? "page" : undefined}>
                  <Icon icon={item.icon} className={s.navItemIcon} aria-hidden />
                  <span className={s.navText}>
                    <span className={s.navLabel}>{copy?.label}</span>
                    {copy?.desc ? <span className={s.navDesc}>{copy.desc}</span> : null}
                  </span>
                </button>;
          })}
          </nav>

          <div className={s.content}>
            {activeSection === "account" && <div className={account.contentGrid}>
                <SectionPanel title={t.sections.identity.title} description={t.sections.identity.description}>
                  <div className={s.settingRow}>
                    <div className={s.settingInfo}>
                      <span className={s.settingLabel}>{t.identity.username}</span>
                      <span className={s.settingHint}>{t.identity.usernameHint}</span>
                      <span className={s.settingValue}>{user.username || "-"}</span>
                    </div>
                    <div className={s.settingAction}>
                      <BtnIcon icon="mdi:pencil-outline" title={t.identity.editUsername} onClick={openUsernameModal} />
                    </div>
                  </div>
                  <div className={s.settingRow}>
                    <div className={s.settingInfo}>
                      <span className={s.settingLabel}>{t.identity.email}</span>
                      <span className={s.settingHint}>{t.identity.emailHint}</span>
                      <span className={s.settingValue}>{user.email}</span>
                    </div>
                    <div className={s.settingAction}>
                      <BtnIcon icon="mdi:pencil-outline" title={t.identity.editEmail} onClick={openEmailModal} />
                    </div>
                  </div>
                  <div className={s.settingRow}>
                    <div className={s.settingInfo}>
                      <span className={s.settingLabel}>{t.identity.password}</span>
                      <span className={s.settingHint}>{t.identity.passwordHint}</span>
                      <span className={s.settingValue}>••••••••••••</span>
                    </div>
                    <div className={s.settingAction}>
                      <BtnIcon icon="mdi:key-outline" title={t.identity.changePassword} onClick={openPasswordModal} />
                    </div>
                  </div>
                </SectionPanel>

                <SectionPanel title={t.sections.photo.title} description={t.sections.photo.description}>
                  <AvatarEditor user={user} displayName={displayName} onUpdated={handleAvatarUpdated} />
                </SectionPanel>

                <SectionPanel title={t.sections.security.title} description={t.sections.security.description}>
                  <div className={`${s.mfaBanner} ${mfaStatus.className}`}>
                    <Icon icon={mfaStatus.icon} className={`${s.mfaIcon} ${s[`mfaIcon_${mfaStatus.key}`]}`} />
                    <div className={s.mfaBody}>
                      <h3 className={s.mfaTitle}>{mfaStatus.label}</h3>
                      <p className={s.mfaDesc}>{mfaStatus.desc}</p>
                      <div className={s.mfaActions}>
                        {mfaStatus.key === "enabled" ? <>
                            <Btn variant="ghost" icon="mdi:shield-refresh-outline" onClick={() => openMfaDisableModal("reconfigure")} disabled={mfaBusy}>
                              {t.mfa.change}
                            </Btn>
                            <Btn variant="ghost" icon="mdi:shield-off-outline" onClick={() => openMfaDisableModal("disable")} disabled={mfaBusy}>
                              {t.mfa.disable}
                            </Btn>
                          </> : <Btn icon="mdi:shield-key-outline" onClick={startMfaSetup} disabled={mfaBusy}>
                            {mfaStatus.key === "pending" ? t.mfa.continueSetup : t.mfa.enable}
                          </Btn>}
                      </div>
                    </div>
                  </div>
                </SectionPanel>

                <SectionPanel title={t.sections.locale.title} description={t.sections.locale.description}>
                  <div className={s.localeBlock}>
                    <span className={s.settingLabel}>{t.locale.label}</span>
                    <span className={s.settingHint}>{t.locale.hint}</span>
                    <ChoiceGroup variant="locale" ariaLabel={t.locale.label} value={appLocale} onChange={handleLocaleChange} options={localeOptions} />
                    {savingLocale ? <span className={s.inlineStatus}>{t.locale.saving}</span> : null}
                  </div>
                </SectionPanel>

                <SectionPanel title={t.sections.activity.title} description={t.sections.activity.description} full>
                  <div className={s.settingRow}>
                    <div className={s.settingInfo}>
                      <span className={s.settingLabel}>{t.activity.created}</span>
                      <span className={s.settingValue}>{formatProfileDate(user.created_at, locale)}</span>
                    </div>
                  </div>
                  <div className={s.settingRow}>
                    <div className={s.settingInfo}>
                      <span className={s.settingLabel}>{t.activity.lastLogin}</span>
                      <span className={s.settingValue}>{formatProfileDate(user.last_login_at, locale)}</span>
                    </div>
                  </div>
                </SectionPanel>
              </div>}

            {activeSection === "interface" && <div className={account.contentGrid}>
                <SectionPanel title={t.sections.interface.title} description={t.sections.interface.description} full>
                  <div className={s.localeBlock}>
                    <span className={s.settingLabel}>{t.sidebarLayout.label}</span>
                    <span className={s.settingHint}>{t.sidebarLayout.hint}</span>
                    <div className={s.layoutChoiceGrid} role="radiogroup" aria-label={t.sidebarLayout.label}>
                      {sidebarLayoutOptions.map(option => {
                  const active = sidebarLayout === option.value;
                  return <button key={option.value} type="button" role="radio" aria-checked={active} className={`${s.layoutChoiceCard} ${active ? s.layoutChoiceCardActive : ""}`} onClick={() => handleSidebarLayoutChange(option.value)} disabled={savingSidebarLayout}>
                            <Icon icon={option.icon} className={s.layoutChoiceIcon} aria-hidden />
                            <span className={s.layoutChoiceText}>
                              <span className={s.layoutChoiceTitle}>{option.label}</span>
                              <span className={s.layoutChoiceDesc}>{option.description}</span>
                            </span>
                          </button>;
                })}
                    </div>
                    {savingSidebarLayout ? <span className={s.inlineStatus}>{t.sidebarLayout.saving}</span> : null}
                  </div>
                </SectionPanel>
              </div>}

            {activeSection === "support" && <div className={account.contentGrid}>
                <SectionPanel title={t.sections.helpdesk.title} description={t.sections.helpdesk.description} full>
                  <div className={s.helpdeskForm}>
                    <IconField icon="mdi:badge-account-outline" label={t.helpdesk.label} hint={t.helpdesk.hint}>
                      <Input value={helpdeskName} onChange={e => setHelpdeskName(e.target.value)} placeholder={user.username || t.helpdesk.placeholder} maxLength={80} />
                    </IconField>
                    <div className={s.helpdeskPreview}>
                      {t.helpdesk.preview} <strong>{helpdeskPreview}</strong>
                    </div>
                    <div>
                      <Btn icon="mdi:content-save-outline" onClick={handleSaveHelpdeskName} disabled={savingHelpdesk}>
                        {savingHelpdesk ? t.helpdesk.saving : t.helpdesk.save}
                      </Btn>
                    </div>
                  </div>
                </SectionPanel>
              </div>}

            {activeSection === "accessibility" && <div className={account.contentGrid}>
                <SectionPanel title={t.sections.accessibility.title} description={t.sections.accessibility.description} full>
                  <div className={s.chatAccessibility}>
                    <label className={s.chatPreviewLabel}>{t.chat.previewLabel}</label>
                    <div className={s.chatPreview} style={{
                  gap: `${Number(chatUiSettings.messageSpacingPx)}px`
                }}>
                      <article className={s.chatBubble}>
                        <div className={s.chatBubbleMeta}>
                          <UserAvatar user={user} name={helpdeskPreview} size={32} variant="agent" />
                          <strong className={s.chatAuthor}>{helpdeskPreview}</strong>
                          <span className={s.chatTime}>10:21</span>
                        </div>
                        <div className={s.chatMessage} style={{
                      fontSize: `${Number(chatUiSettings.textSizePx)}px`
                    }}>
                          {t.chat.agentMessage}
                        </div>
                      </article>
                      <article className={s.chatBubble}>
                        <div className={s.chatBubbleMeta}>
                          <div className={`${s.chatAvatar} ${s.chatAvatarClient}`}>CL</div>
                          <strong className={s.chatAuthor}>{t.chat.clientLabel}</strong>
                          <span className={s.chatTime}>10:23</span>
                        </div>
                        <div className={s.chatMessage} style={{
                      fontSize: `${Number(chatUiSettings.textSizePx)}px`
                    }}>
                          {t.chat.clientMessage}
                        </div>
                      </article>
                    </div>

                    <div className={s.rangeField}>
                      <label className={s.rangeLabel} htmlFor="chat-text-size">
                        {t.chat.textSize}
                      </label>
                      <input id="chat-text-size" type="range" className={s.rangeInput} min="12" max="24" step="1" value={Number(chatUiSettings.textSizePx)} onChange={e => setChatUiSettings(prev => ({
                    ...prev,
                    textSizePx: Number(e.target.value || 16)
                  }))} />
                      <span className={s.rangeHint}>{Number(chatUiSettings.textSizePx)} px</span>
                    </div>

                    <div className={s.rangeField}>
                      <label className={s.rangeLabel} htmlFor="chat-message-spacing">
                        {t.chat.messageSpacing}
                      </label>
                      <input id="chat-message-spacing" type="range" className={s.rangeInput} min="0" max="24" step="1" value={Number(chatUiSettings.messageSpacingPx)} onChange={e => setChatUiSettings(prev => ({
                    ...prev,
                    messageSpacingPx: Number(e.target.value || 10)
                  }))} />
                      <span className={s.rangeHint}>{Number(chatUiSettings.messageSpacingPx)} px</span>
                    </div>

                    <div>
                      <Btn icon="mdi:content-save-outline" onClick={handleSaveChatUiSettings} disabled={savingChatUi}>
                        {savingChatUi ? t.chat.saving : t.chat.savePrefs}
                      </Btn>
                    </div>
                  </div>
                </SectionPanel>
              </div>}

            {activeSection === "notifications" && <div className={account.contentGrid}>
                <SectionPanel title={t.sections.notifications.title} description={getNotificationsSectionDescription(t, {
              notifGloballyDisabled,
              notifUserEnabled,
              activeCount: activeNotifEventsCount,
              total: notifEventOptions.length
            })} full>
                  {notifGloballyDisabled ? <div className={s.notifAdminBanner}>
                      <Icon icon="mdi:bell-off-outline" className={s.notifAdminBannerIcon} aria-hidden />
                      <p className={s.notifAdminBannerText}>{t.notifications.adminBanner}</p>
                    </div> : <div className={s.notifPrefs}>
                      <FieldRow icon="mdi:bell-ring-outline" label={t.notifications.masterLabel} hint={t.notifications.masterHint} className={s.notifMasterRow}>
                        <Switch checked={notifUserEnabled} onChange={value => setNotifPreferences(prev => ({
                    ...prev,
                    enabled: value
                  }))} />
                      </FieldRow>

                      <div className={`${s.notifEvents} ${!notifUserEnabled ? s.notifEventsDisabled : ""}`}>
                        {notifEventOptions.map(option => {
                    const adminEnabled = notifAdminDefaults?.events?.[option.key]?.enabled !== false;
                    const checked = notifPreferences.events?.[option.key]?.enabled !== false;
                    return <FieldRow key={option.key} icon={option.icon} label={option.label} hint={adminEnabled ? option.description : t.notifications.adminDisabledHint} className={s.notifEventRow}>
                              <Switch checked={adminEnabled && checked} disabled={!adminEnabled || !notifUserEnabled} onChange={value => updateNotifEvent(option.key, value)} />
                            </FieldRow>;
                  })}
                      </div>

                      <p className={s.notifHint}>{t.notifications.hint}</p>

                      <div className={s.notifActions}>
                        <Btn variant="ghost" onClick={handleResetNotifPreferences} disabled={savingNotifPrefs}>
                          {t.notifications.reset}
                        </Btn>
                        <Btn icon="mdi:content-save-outline" onClick={handleSaveNotifPreferences} disabled={savingNotifPrefs}>
                          {savingNotifPrefs ? t.notifications.saving : t.notifications.save}
                        </Btn>
                      </div>
                    </div>}
                </SectionPanel>

                <SectionPanel title={t.sections.subscriptions.title} description={t.sections.subscriptions.description} full>
                  {loadingSubscriptions ? <p className={s.notifHint}>{t.subscriptions.loading}</p> : subscriptions.length === 0 ? <p className={s.notifHint}>{t.subscriptions.empty}</p> : <ul className={s.subscriptionList}>
                      {subscriptions.map(item => {
                  const rowKey = `${item.entityType}:${item.entityId}`;
                  const busy = savingSubscriptionKey === rowKey;
                  return <li key={rowKey} className={s.subscriptionRow}>
                          <div className={s.subscriptionMain}>
                            <span className={s.subscriptionType}>{subscriptionTypeLabel(item.entityType)}</span>
                            <button type="button" className={s.subscriptionLabelBtn} onClick={() => openSubscriptionTarget(item)} disabled={!onNavigate}>
                              {item.label || item.entityId}
                            </button>
                          </div>
                          <div className={s.subscriptionChannels}>
                            <div className={s.subscriptionChannel}>
                              <span>{t.subscriptions.channelInapp}</span>
                              <Switch checked={item.notifyInapp !== false} disabled={busy} onChange={value => handleSubscriptionChannelChange(item, "inapp", value)} />
                            </div>
                            <div className={s.subscriptionChannel}>
                              <span>{t.subscriptions.channelEmail}</span>
                              <Switch checked={item.notifyEmail === true} disabled={busy} onChange={value => handleSubscriptionChannelChange(item, "email", value)} />
                            </div>
                            <BtnIcon icon="mdi:bell-off-outline" title={t.subscriptions.unsubscribe} onClick={() => handleUnsubscribe(item)} disabled={busy} />
                          </div>
                        </li>;
                })}
                    </ul>}
                </SectionPanel>
              </div>}

            {activeSection === "planning" && <div className={account.contentGrid}>
                <SectionPanel title={t.sections.planning.title} description={t.sections.planning.description} full>
                  <div className={s.localeBlock}>
                    <span className={s.settingLabel}>{t.planning.label}</span>
                    <span className={s.settingHint}>{planningVisibility === "private" ? t.planning.privateHint : t.planning.publicHint}</span>
                    <ChoiceGroup variant="segment" ariaLabel={t.planning.label} value={planningVisibility} onChange={handlePlanningVisibilityChange} options={planningOptions} />
                    {savingPlanning ? <span className={s.inlineStatus}>{t.planning.saving}</span> : null}
                  </div>
                </SectionPanel>
              </div>}
          </div>
              </div>
          </main>
        </div>
      </div>

      <Modal open={usernameModal} onClose={() => setUsernameModal(false)} title={t.modals.username.title} icon="mdi:account-edit-outline" width="440px" footer={<ModalFooter onCancel={() => setUsernameModal(false)} onConfirm={handleSaveUsername} confirmLabel={t.modals.save} confirmLoading={savingIdentity} confirmDisabled={!draftUsername.trim()} />}>
        <ModalForm>
          <IconField icon="mdi:account" label={t.modals.username.label} hint={t.modals.username.hint}>
            <Input value={draftUsername} onChange={e => setDraftUsername(e.target.value)} placeholder={user.username || t.modals.username.placeholder} autoFocus maxLength={50} />
          </IconField>
        </ModalForm>
      </Modal>

      <Modal open={emailModal} onClose={() => setEmailModal(false)} title={t.modals.email.title} icon="mdi:email-edit-outline" width="440px" footer={<ModalFooter onCancel={() => setEmailModal(false)} onConfirm={handleSaveEmail} confirmLabel={t.modals.save} confirmLoading={savingIdentity} confirmDisabled={!draftEmail.trim()} />}>
        <ModalForm>
          <IconField icon="mdi:email-outline" label={t.modals.email.label}>
            <Input type="email" value={draftEmail} onChange={e => setDraftEmail(e.target.value)} placeholder={user.email} autoFocus />
          </IconField>
        </ModalForm>
      </Modal>

      <Modal open={passwordModal} onClose={() => setPasswordModal(false)} title={t.modals.password.title} icon="mdi:lock-reset" width="440px" footer={<ModalFooter onCancel={() => setPasswordModal(false)} onConfirm={handleSavePassword} confirmLabel={t.modals.password.confirmAction} confirmLoading={savingIdentity} confirmDisabled={!draftPwd1 || !draftPwd2} />}>
        <ModalForm>
          <IconField icon="mdi:lock-outline" label={t.modals.password.label} hint={t.modals.password.hint}>
            <Input type="password" value={draftPwd1} onChange={e => setDraftPwd1(e.target.value)} autoFocus />
          </IconField>
          <IconField icon="mdi:lock-check-outline" label={t.modals.password.confirm}>
            <Input type="password" value={draftPwd2} onChange={e => setDraftPwd2(e.target.value)} />
          </IconField>
        </ModalForm>
      </Modal>

      <Modal open={mfaModal} onClose={() => {
      setMfaModal(false);
      setMfaSetup(null);
      setMfaCode("");
    }} title={mfaMode === "reconfigure" ? t.modals.mfa.changeTitle : t.modals.mfa.title} icon="mdi:shield-key-outline" width="480px" footer={<ModalFooter onCancel={() => {
      setMfaModal(false);
      setMfaSetup(null);
      setMfaCode("");
    }} onConfirm={handleVerifyMfa} confirmLabel={t.modals.mfa.enable} confirmLoading={mfaBusy} confirmDisabled={mfaCode.length < 6} />}>
        {mfaSetup && <>
            <p className={s.mfaDesc}>{t.modals.mfa.desc}</p>
            <div className={s.qrWrap}>
              <img src={mfaSetup.qrCodeDataUrl} alt={t.modals.mfa.qrAlt} className={s.qr} />
            </div>
            <p className={s.secret}>
              {t.modals.mfa.manualKey} <code>{mfaSetup.secret}</code>
            </p>
            <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/\D/g, ""))} className={s.codeInput} disabled={mfaBusy} />
          </>}
      </Modal>

      <Modal open={mfaDisableModal} onClose={() => {
      setMfaDisableModal(false);
      setMfaDisableCode("");
    }} title={mfaMode === "reconfigure" ? t.modals.mfaDisable.changeTitle : t.modals.mfaDisable.title} icon="mdi:shield-off-outline" width="440px" footer={<ModalFooter onCancel={() => {
      setMfaDisableModal(false);
      setMfaDisableCode("");
    }} onConfirm={handleDisableMfa} confirmLabel={mfaMode === "reconfigure" ? t.modals.mfaDisable.changeConfirm : t.modals.mfaDisable.confirm} confirmLoading={mfaBusy} confirmDisabled={mfaDisableCode.length < 6} />}>
        <ModalForm>
          <p className={s.mfaDesc}>{mfaMode === "reconfigure" ? t.modals.mfaDisable.changeDesc : t.modals.mfaDisable.desc}</p>
          <IconField icon="mdi:numeric" label={t.modals.mfaDisable.codeLabel}>
            <Input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={mfaDisableCode} onChange={e => setMfaDisableCode(e.target.value.replace(/\D/g, ""))} autoFocus disabled={mfaBusy} />
          </IconField>
        </ModalForm>
      </Modal>
    </div>;
}
