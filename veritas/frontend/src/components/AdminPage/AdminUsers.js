import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Icon } from "@iconify/react";
import { fetchUsers, fetchUser, createUser, updateUser, deleteUser, releaseUserMfa, resetPassword, buildUserUpdatePayload, impersonateUser } from "../../api/users";
import { useAuthContext } from "../../contexts/AuthContext";
import { useVeritasEdition } from "../../hooks/useVeritasEdition";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { useAdminCommonCopy, useAdminUsersCopy } from "../../hooks/useAdminCopy";
import { useAppFormatters, useAppLocale } from "../../hooks/useAppGeneralSettings";
import { interpolate as formatMessage } from "../../i18n/translate";
import { getCommunityMspAgentsLimit } from "../../config/edition";
import ProFeatureBadge from "../Misc/ProFeature/ProFeatureBadge";
import CommunityFeatureBadge from "../Misc/ProFeature/CommunityFeatureBadge";
import ProFeaturePromoModal from "../Misc/ProFeature/ProFeaturePromoModal";
import API_BASE_URL from "../../config";
import { Modal, ConfirmModal, ModalFooterBar, Field, Input, Badge, Btn, Card, Page, SubTabs, EntityStatus } from "./AdminUi";
import AgentFormModal from "./AgentFormModal";
import ProfileFormModal from "./ProfileFormModal";
import { buildDefaultAgentDraft, buildDefaultProfileDraft, buildAgentDraftFromUser } from "./adminOrgFormConstants";
import { getAccessColumns, getUserAdminViews, getMfaStatus, getAdminUsersCopy, interpolate } from "./adminUsersI18n";
import { getAdminPermissionsCopy, getLocalizedProfileName, getLocalizedProfileLabel } from "./adminPermissionsI18n";
import { normalizeProfileName, isSuperAdminProtectedProfile } from "../../utils/profileProtection";
import { fetchTeams } from "../../api/teams";
import ui from "./AdminUi.module.css";
import s from "./AdminUsers.module.css";
const COMMUNITY_ACCESS_MODULE_KEYS = new Set(["entreprise", "contact", "tickets"]);
const PROFILE_MODAL_WIDTH = "760px";
const SYSTEM_PROFILE_NAMES = new Set([
  "super admin",
  "superadmin",
  "super administrateur",
  "administrator",
  "administrateur",
  "admin",
  "administratif",
  "direction",
  "responsable",
  "superviseur",
  "supervisor",
  "agent",
  "collaborateur",
  "collaborator",
  "lecture",
  "lecteur",
  "read only",
  "read-only",
  "readonly",
  "reader"
]);
const DEFAULT_USER_PROFILE = "Agent";
const resolveAgentProfileName = (profilesList = []) => {
  const agentProfile = profilesList.find(profile => String(profile?.name || "").toLowerCase() === "agent" || String(profile?.label || "").toLowerCase() === "agent");
  return agentProfile?.name || DEFAULT_USER_PROFILE;
};
const COMMUNITY_PRO_TAB_PROMO = {
  profiles: "adminProfiles",
  access: "adminAccess"
};
const PROFILES_PER_PAGE = 10;
const ACCESS_ROWS_PER_PAGE = 10;
const profileFetchInit = {
  credentials: "include"
};
const profileJsonFetchInit = {
  credentials: "include",
  headers: {
    "Content-Type": "application/json"
  }
};
function MfaStatusBadge({
  user,
  locale
}) {
  const status = getMfaStatus(user, locale);
  const mfaLabels = getAdminUsersCopy(locale).mfa;
  return <span className={`${s.status} ${s[status.className]}`} title={`${mfaLabels.titlePrefix} ${status.label}`}>
      <Icon icon={status.icon} className={s.mfaIcon} />
      {status.label}
    </span>;
}
export default function AdminUsers({
  isCommunity = false
}) {
  const locale = useAppLocale();
  const copy = useAdminUsersCopy();
  const adminCopy = useAdminCommonCopy();
  const commonCopy = useCommonCopy();
  const {
    formatDate
  } = useAppFormatters();
  const {
    limits
  } = useVeritasEdition();
  const maxMspAgents = isCommunity ? getCommunityMspAgentsLimit(limits) : null;
  const [users, setUsers] = useState([]);
  const [agentDraft, setAgentDraft] = useState(buildDefaultAgentDraft());
  const [creatingAgent, setCreatingAgent] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showEditAgentModal, setShowEditAgentModal] = useState(false);
  const [editAgentDraft, setEditAgentDraft] = useState(null);
  const [savingAgent, setSavingAgent] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [profileDraft, setProfileDraft] = useState(buildDefaultProfileDraft());
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState("");
  const [profileLabelInput, setProfileLabelInput] = useState("");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileModalMode, setProfileModalMode] = useState("create");
  const [profileModalTarget, setProfileModalTarget] = useState(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(false);
  const [confirmDeleteProfile, setConfirmDeleteProfile] = useState(false);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profilesPage, setProfilesPage] = useState(1);
  const [accessPage, setAccessPage] = useState(1);
  const [newActive] = useState(true);
  const [sortKey, setSortKey] = useState("email");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const [usersPageSize, setUsersPageSize] = useState(50);
  const {
    user,
    impersonating
  } = useAuthContext();
  const currentUserId = user?.id;
  const currentUserProfile = useMemo(() => {
    const fromList = users.find(u => u.id === currentUserId)?.profile;
    return fromList || user?.profile || null;
  }, [users, currentUserId, user?.profile]);
  const canImpersonateAgents = isSuperAdminProtectedProfile(currentUserProfile) && !impersonating;
  const [teams, setTeams] = useState([]);
  const [profilesSearchTerm, setProfilesSearchTerm] = useState("");
  const [activeView, setActiveView] = useState("users");
  const [confirmReleaseMfa, setConfirmReleaseMfa] = useState(false);
  const [mfaReleaseTarget, setMfaReleaseTarget] = useState(null);
  const [releasingMfa, setReleasingMfa] = useState(false);
  const [proPromoFeature, setProPromoFeature] = useState(null);
  const accessColumns = useMemo(() => getAccessColumns(locale), [locale]);
  const permissionsCopy = useMemo(() => getAdminPermissionsCopy(locale), [locale]);
  const userAdminViews = useMemo(() => getUserAdminViews(locale, isCommunity), [locale, isCommunity]);
  const activeMspAgentCount = useMemo(() => users.filter(row => row.is_active !== false && String(row.role || "").toLowerCase() !== "client").length, [users]);
  const agentAtLimit = maxMspAgents != null && activeMspAgentCount >= maxMspAgents;
  useEffect(() => {
    if (!userAdminViews.some(view => view.key === activeView)) {
      setActiveView("users");
    }
  }, [activeView, userAdminViews]);
  const handleAdminViewChange = key => {
    const promoKey = isCommunity ? COMMUNITY_PRO_TAB_PROMO[key] : null;
    if (promoKey) {
      setProPromoFeature(promoKey);
      return;
    }
    setActiveView(key);
  };
  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch {
      toast.error(copy.toast.loadUsersError);
    }
    setIsLoading(false);
  };
  useEffect(() => {
    loadUsers();
  }, []);
  const loadProfiles = async () => {
    setProfilesLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/profiles`, profileFetchInit);
      if (!res.ok) throw new Error("load failed");
      const data = await res.json();
      const raw = Array.isArray(data) ? data : data.profiles || [];
      const adapted = raw.map(p => {
        if (p.name === "responsable") return {
          ...p,
          label: "Responsable"
        };
        if (p.name === "tech_hd") return {
          ...p,
          label: "Helpdesk"
        };
        return p;
      });
      setProfiles(adapted);
    } catch {
      toast.error(copy.toast.loadProfilesError);
    }
    setProfilesLoading(false);
  };
  const loadTeams = async () => {
    try {
      const rows = await fetchTeams();
      setTeams(Array.isArray(rows) ? rows : []);
    } catch {
      setTeams([]);
    }
  };
  useEffect(() => {
    loadProfiles();
    loadTeams();
  }, []);
  useEffect(() => {
    setProfilesPage(1);
    setAccessPage(1);
  }, [profiles]);
  const openCreateAgentModal = () => {
    if (agentAtLimit) {
      toast.warn(interpolate(copy.agents.limitWarn, {
        max: maxMspAgents
      }));
      return;
    }
    setAgentDraft(buildDefaultAgentDraft(resolveAgentProfileName(profiles)));
    setShowModal(true);
  };
  const closeCreateAgentModal = () => {
    if (creatingAgent) return;
    setShowModal(false);
    setAgentDraft(buildDefaultAgentDraft(resolveAgentProfileName(profiles)));
  };
  const handleCreateUser = async () => {
    if (!agentDraft.email || !agentDraft.email.includes("@")) return toast.error(copy.toast.invalidEmail);
    if (agentDraft.password.length < 6) return toast.error(copy.toast.passwordTooShort);
    if (agentDraft.password !== agentDraft.password2) return toast.error(copy.toast.passwordMismatch);
    setCreatingAgent(true);
    try {
      await createUser({
        email: agentDraft.email,
        username: agentDraft.username,
        password: agentDraft.password,
        profile: agentDraft.profile || resolveAgentProfileName(profiles),
        is_active: newActive
      });
      toast.success(copy.toast.userCreated);
      setShowModal(false);
      setAgentDraft(buildDefaultAgentDraft(resolveAgentProfileName(profiles)));
      loadUsers();
    } catch (err) {
      toast.error(err.message || copy.toast.createFailed);
    } finally {
      setCreatingAgent(false);
    }
  };
  const handleChangeRole = async (userId, newRole) => {
    try {
      const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          role: newRole
        })
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success(copy.toast.roleUpdated);
      loadUsers();
    } catch {
      toast.error(copy.toast.roleUpdateError);
    }
  };
  const handleProfileChange = async (userId, newProfileValue) => {
    try {
      const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          profile: newProfileValue
        })
      });
      if (!res.ok) throw new Error("Update failed");
      if (userId === currentUserId) {
        window.refreshProfile?.();
        window.dispatchEvent(new Event("refreshProfileAccess"));
      }
      setUsers(prev => prev.map(u => u.id === userId ? {
        ...u,
        profile: newProfileValue
      } : u));
    } catch (err) {
      toast.error(copy.toast.profileUpdateFailed);
      console.error(err);
    }
  };
  const toggle = async (profile, key) => {
    if (isCommunity) {
      setProPromoFeature("adminAccess");
      return;
    }
    const p = profiles.find(pr => pr.name === profile);
    const updated = {
      ...p,
      [key]: !p[key]
    };
    await fetch(`${API_BASE_URL}/profiles/${profile}`, {
      method: "PATCH",
      ...profileJsonFetchInit,
      body: JSON.stringify(updated)
    });
    setProfiles(prev => prev.map(pr => pr.name === profile ? updated : pr));
    const currentAgent = users.find(u => u.id === currentUserId);
    if (currentAgent?.profile === profile) {
      window.refreshProfile?.();
    }
    window.dispatchEvent(new Event("refreshProfileAccess"));
  };
  const openCreateProfileModal = () => {
    if (isCommunity) {
      setProPromoFeature("adminProfiles");
      return;
    }
    setProfileDraft(buildDefaultProfileDraft());
    setProfileModalMode("create");
    setProfileModalTarget(null);
    setShowProfileModal(true);
  };
  const closeCreateProfileModal = () => {
    if (creatingProfile) return;
    setShowProfileModal(false);
    setProfileModalTarget(null);
    setProfileDraft(buildDefaultProfileDraft());
  };
  const handleCreateProfile = async () => {
    if (!profileDraft.name.trim()) return toast.error(copy.toast.profileNameRequired);
    const payload = {
      name: profileDraft.name.trim(),
      label: profileDraft.label.trim() || profileDraft.name.trim(),
      contrat_enabled: true,
      contact_enabled: true
    };
    if (profileDraft.parentProfile) {
      payload.parentProfile = profileDraft.parentProfile;
    }
    setCreatingProfile(true);
    try {
      const res = await fetch(`${API_BASE_URL}/profiles`, {
        method: "POST",
        ...profileJsonFetchInit,
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Creation failed");
      }
      toast.success(copy.toast.profileCreated);
      setProfileDraft(buildDefaultProfileDraft());
      setShowProfileModal(false);
      await loadProfiles();
      window.dispatchEvent(new Event("refreshProfileAccess"));
    } catch (err) {
      toast.error(err.message || copy.toast.profileCreateFailed);
    } finally {
      setCreatingProfile(false);
    }
  };
  const handleDeleteProfile = async name => {
    try {
      const res = await fetch(`${API_BASE_URL}/profiles/${name}`, {
        method: "DELETE",
        ...profileFetchInit
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete profile");
      }
      toast.success(copy.toast.profileDeleted);
      setShowProfileModal(false);
      setProfileModalTarget(null);
      setConfirmDeleteProfile(false);
      await loadProfiles();
      window.dispatchEvent(new Event("refreshProfileAccess"));
    } catch (err) {
      toast.error(err.message || copy.toast.profileDeleteFailed);
    }
  };
  const handleUpdateProfile = async () => {
    if (!profileModalTarget) return;
    try {
      const base = profiles.find(p => p.name === profileModalTarget);
      if (!base) return;
      const payload = isCommunity ? {
        label: profileLabelInput.trim() || profileModalTarget
      } : {
        ...base,
        label: profileLabelInput.trim() || profileModalTarget
      };
      const res = await fetch(`${API_BASE_URL}/profiles/${profileModalTarget}`, {
        method: "PATCH",
        ...profileJsonFetchInit,
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error();
      toast.success(copy.toast.profileUpdated);
      setShowProfileModal(false);
      setProfileModalTarget(null);
      await loadProfiles();
      window.dispatchEvent(new Event("refreshProfileAccess"));
    } catch {
      toast.error(copy.toast.profileUpdateFailed2);
    }
  };
  const getProfileLabel = name => getLocalizedProfileName(name, permissionsCopy) || name || "-";
  const getProfileDescription = (name, fallbackLabel) => getLocalizedProfileLabel(name, fallbackLabel, permissionsCopy);
  const getUsersForProfile = profileName => users.filter(u => String(u.profile || "") === String(profileName || ""));
  const isProfileProtected = name => SYSTEM_PROFILE_NAMES.has(normalizeProfileName(name));
  const editingProfileIsProtected = profileModalMode === "edit" && isProfileProtected(profileModalTarget);
  const openMfaReleaseConfirm = targetUser => {
    setMfaReleaseTarget(targetUser);
    setConfirmReleaseMfa(true);
  };
  const handleReleaseMfa = async () => {
    if (!mfaReleaseTarget?.id) return;
    setReleasingMfa(true);
    try {
      await releaseUserMfa(mfaReleaseTarget.id);
      toast.success(interpolate(copy.toast.mfaReleased, {
        email: mfaReleaseTarget.email
      }));
      setConfirmReleaseMfa(false);
      setMfaReleaseTarget(null);
      await loadUsers();
      if (editAgentDraft?.id === mfaReleaseTarget.id) {
        const refreshed = await fetchUser(mfaReleaseTarget.id);
        setEditAgentDraft(buildAgentDraftFromUser(refreshed));
      }
    } catch (err) {
      toast.error(err.message || copy.toast.mfaReleaseFailed);
    } finally {
      setReleasingMfa(false);
    }
  };
  const canReleaseMfa = targetUser => getMfaStatus(targetUser, locale).key !== "off";
  const filteredUsers = users.filter(u => u.email.toLowerCase().includes(searchTerm.toLowerCase()) || (u.username || "").toLowerCase().includes(searchTerm.toLowerCase()));
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    const val = (userRow, key) => {
      switch (key) {
        case "email":
          return userRow.email?.toLowerCase() || "";
        case "username":
          return userRow.username?.toLowerCase() || "";
        case "profile":
          return getProfileLabel(userRow.profile).toLowerCase();
        case "is_active":
          return userRow.is_active ? 1 : 0;
        case "created_at":
          return userRow.created_at ? new Date(userRow.created_at).getTime() : 0;
        case "last_login_at":
          return userRow.last_login_at ? new Date(userRow.last_login_at).getTime() : 0;
        case "mfa_enabled":
          return getMfaStatus(userRow, locale).key === "enabled" ? 2 : getMfaStatus(userRow, locale).key === "pending" ? 1 : 0;
        default:
          return "";
      }
    };
    const va = val(a, sortKey);
    const vb = val(b, sortKey);
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  });
  useEffect(() => {
    setPage(1);
  }, [searchTerm, sortKey, sortDir, usersPageSize]);
  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / usersPageSize));
  const currentPage = Math.min(page, totalPages);
  const usersPageStartIndex = sortedUsers.length === 0 ? 0 : (currentPage - 1) * usersPageSize + 1;
  const usersPageEndIndex = Math.min(currentPage * usersPageSize, sortedUsers.length);
  const paginatedUsers = sortedUsers.slice((currentPage - 1) * usersPageSize, currentPage * usersPageSize);
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);
  const toggleSort = key => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };
  const sortIndicator = key => sortKey === key ? sortDir === "asc" ? " ▲" : " ▼" : "";
  const filteredProfiles = profiles.filter(p => {
    const q = profilesSearchTerm.toLowerCase();
    if (!q) return true;
    const displayName = getLocalizedProfileName(p.name, permissionsCopy).toLowerCase();
    const displayDesc = getLocalizedProfileLabel(p.name, p.label, permissionsCopy).toLowerCase();
    return (p.name || "").toLowerCase().includes(q) || (p.label || "").toLowerCase().includes(q) || displayName.includes(q) || displayDesc.includes(q);
  });
  const totalProfilesPages = Math.max(1, Math.ceil(filteredProfiles.length / PROFILES_PER_PAGE));
  const currentProfilesPage = Math.min(profilesPage, totalProfilesPages);
  const paginatedProfiles = filteredProfiles.slice((currentProfilesPage - 1) * PROFILES_PER_PAGE, currentProfilesPage * PROFILES_PER_PAGE);
  const totalAccessPages = Math.max(1, Math.ceil(profiles.length / ACCESS_ROWS_PER_PAGE));
  const currentAccessPage = Math.min(accessPage, totalAccessPages);
  const paginatedAccessProfiles = profiles.slice((currentAccessPage - 1) * ACCESS_ROWS_PER_PAGE, currentAccessPage * ACCESS_ROWS_PER_PAGE);
  const openEditUser = async row => {
    try {
      const full = await fetchUser(row.id);
      setEditAgentDraft(buildAgentDraftFromUser(full));
      setShowEditAgentModal(true);
    } catch {
      toast.error(copy.toast.loadUserError);
    }
  };
  const handleImpersonateUser = async userRow => {
    if (!canImpersonateAgents || !userRow?.id) return;
    if (userRow.id === currentUserId) {
      toast.error(copy.impersonation.selfBlocked);
      return;
    }
    try {
      await impersonateUser(userRow.id);
      toast.success(copy.impersonation.started);
      window.location.href = "/";
    } catch (err) {
      toast.error(err?.message || copy.impersonation.startError);
    }
  };
  const closeEditAgentModal = () => {
    if (savingAgent) return;
    setShowEditAgentModal(false);
    setEditAgentDraft(null);
    setConfirmDeleteUser(false);
  };
  const getInitials = row => {
    const base = (row.username || row.email || "?").trim();
    const parts = base.split(/[\s.@_-]+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return base.slice(0, 2).toUpperCase();
  };
  const ThSort = ({
    label,
    col
  }) => <button type="button" className={s.thBtn} onClick={() => toggleSort(col)}>
      {label}
      {sortIndicator(col)}
    </button>;
  const Pager = ({
    page: p,
    totalPages: tp,
    onPageChange,
    pageSize,
    onPageSizeChange,
    rangeLabel
  }) => <div className={s.pager}>
      <div className={s.pagerLeft}>
        {onPageSizeChange && <>
            <span className={s.pagerLabel}>{commonCopy.perPage}</span>
            <select className={s.pagerSelect} value={pageSize} onChange={e => onPageSizeChange(Number(e.target.value))}>
              {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </>}
        {rangeLabel && <span className={s.pagerInfo}>{rangeLabel}</span>}
      </div>
      <div className={s.pagerRight}>
        <button type="button" className={s.pagerBtn} onClick={() => onPageChange(p - 1)} disabled={p <= 1} title={commonCopy.prevPage}>
          <Icon icon="mdi:chevron-left" />
        </button>
        <span className={s.pagerInfo}>{formatMessage(commonCopy.pageInfo, {
          page: p,
          totalPages: tp
        })}</span>
        <button type="button" className={s.pagerBtn} onClick={() => onPageChange(p + 1)} disabled={p >= tp} title={commonCopy.nextPage}>
          <Icon icon="mdi:chevron-right" />
        </button>
      </div>
    </div>;
  const handleSaveAgent = async () => {
    if (!editAgentDraft?.id) return;
    if (!editAgentDraft.email || !editAgentDraft.email.includes("@")) {
      return toast.error(copy.toast.invalidEmail);
    }
    if (!String(editAgentDraft.profile || "").trim()) {
      return toast.error(copy.toast.selectProfile);
    }
    const password = String(editAgentDraft.password || "");
    const password2 = String(editAgentDraft.password2 || "");
    if (password || password2) {
      if (password.length < 6) return toast.error(copy.toast.passwordTooShort);
      if (password !== password2) return toast.error(copy.toast.passwordMismatch);
    }
    setSavingAgent(true);
    try {
      await updateUser(editAgentDraft.id, buildUserUpdatePayload(editAgentDraft));
      if (password) {
        await resetPassword(editAgentDraft.id, password);
      }
      if (editAgentDraft.id === currentUserId) {
        window.refreshProfile?.();
        window.dispatchEvent(new Event("refreshProfileAccess"));
      }
      toast.success(copy.toast.userUpdated);
      setShowEditAgentModal(false);
      setEditAgentDraft(null);
      loadUsers();
    } catch (err) {
      toast.error(err.message || copy.toast.saveError);
    } finally {
      setSavingAgent(false);
    }
  };
  const handleDeleteAgent = async () => {
    if (!editAgentDraft?.id) return;
    try {
      await deleteUser(editAgentDraft.id);
      toast.success(copy.toast.agentDeleted);
      setConfirmDeleteUser(false);
      setShowEditAgentModal(false);
      setEditAgentDraft(null);
      loadUsers();
    } catch (err) {
      toast.error(err.message || copy.toast.deleteFailed);
    }
  };
  const adminCount = users.filter(u => u.role === "admin").length;
  const isLastAdmin = userRow => userRow?.role === "admin" && adminCount <= 1;
  const cannotDeleteEditAgent = !editAgentDraft || editAgentDraft.id === currentUserId || isLastAdmin(editAgentDraft);
  const editAgentDeleteDescription = editAgentDraft?.id === currentUserId ? copy.deleteAgent.self : isLastAdmin(editAgentDraft) ? copy.deleteAgent.lastAdmin : copy.deleteAgent.default;
  return <Page>
      <SubTabs items={userAdminViews} active={activeView} onChange={handleAdminViewChange} />

      {activeView === "users" && <Card title={copy.agents.title} description={copy.agents.description} fill action={<Btn icon="mdi:plus" onClick={openCreateAgentModal} disabled={agentAtLimit} title={agentAtLimit ? interpolate(copy.agents.limitTitle, {
      max: maxMspAgents
    }) : undefined}>
              {copy.agents.newAgent}
            </Btn>}>
            <div className={ui.toolRow}>
              <div className={ui.toolLeft}>
                <input type="search" className={ui.fieldSearch} placeholder={copy.agents.searchPlaceholder} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                <span className={ui.count}>
                  {filteredUsers.length === 1 ? interpolate(copy.agents.agentCount, {
              count: filteredUsers.length
            }) : interpolate(copy.agents.agentCountPlural, {
              count: filteredUsers.length
            })}
                </span>
              </div>
            </div>
            {maxMspAgents != null && <p className={s.limitHint}>
                <CommunityFeatureBadge variant="inline" className={s.proBadgeInline} />
                {agentAtLimit ? <>
                    {interpolate(copy.agents.limitReached, {
            current: activeMspAgentCount,
            max: maxMspAgents
          })}{" "}
                    <ProFeatureBadge variant="inline" className={s.proBadgeInline} />
                  </> : <>{interpolate(copy.agents.quota, {
            current: activeMspAgentCount,
            max: maxMspAgents
          })}</>}
              </p>}

            <div className={s.tableSection}>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th><ThSort label={copy.agents.columns.user} col="email" /></th>
                    <th><ThSort label={copy.agents.columns.status} col="is_active" /></th>
                    <th><ThSort label={copy.agents.columns.mfa} col="mfa_enabled" /></th>
                    <th><ThSort label={copy.agents.columns.profile} col="profile" /></th>
                    <th><ThSort label={copy.agents.columns.created} col="created_at" /></th>
                    <th><ThSort label={copy.agents.columns.lastLogin} col="last_login_at" /></th>
                    <th style={{
                  width: canImpersonateAgents ? 84 : 48
                }} />
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.length === 0 ? <tr>
                      <td colSpan={7} className={s.empty}>
                        {isLoading ? copy.agents.emptyLoading : copy.agents.empty}
                      </td>
                    </tr> : paginatedUsers.map(row => <tr key={row.id}>
                        <td>
                          <div className={s.userCell}>
                            <div className={s.avatar}>{getInitials(row)}</div>
                            <div className={s.userInfo}>
                              <div className={s.userEmail}>{row.email}</div>
                              {row.username && <div className={s.userName}>{row.username}</div>}
                            </div>
                          </div>
                        </td>
                        <td>
                          <EntityStatus active={Boolean(row.is_active)} />
                        </td>
                        <td>
                          <MfaStatusBadge user={row} locale={locale} />
                        </td>
                        <td><span className={s.badge}>{getProfileLabel(row.profile)}</span></td>
                        <td className={s.dateCell}>
                          {row.created_at ? formatDate(row.created_at) : "-"}
                        </td>
                        <td className={s.dateCell}>
                          {row.last_login_at ? formatDate(row.last_login_at) : "-"}
                        </td>
                        <td>
                          <div className={s.actions}>
                            {canImpersonateAgents && row.id !== currentUserId && row.is_active !== false ? <button type="button" className={s.actionBtn} title={copy.impersonation.actionTitle} aria-label={copy.impersonation.actionTitle} onClick={() => handleImpersonateUser(row)}>
                                <Icon icon="mdi:account-switch-outline" />
                              </button> : null}
                            <button type="button" className={s.actionBtn} title={adminCopy.edit} onClick={() => openEditUser(row)}>
                              <Icon icon="mdi:pencil-outline" />
                            </button>
                          </div>
                        </td>
                      </tr>)}
                </tbody>
              </table>
            </div>

            {sortedUsers.length > 0 && <Pager page={currentPage} totalPages={totalPages} onPageChange={setPage} pageSize={usersPageSize} onPageSizeChange={setUsersPageSize} rangeLabel={interpolate(copy.agents.range, {
          start: usersPageStartIndex,
          end: usersPageEndIndex,
          total: sortedUsers.length
        })} />}
            </div>
        </Card>}

      {activeView === "profiles" && <Card title={copy.profiles.title} description={isCommunity ? copy.profiles.descriptionCommunity : copy.profiles.description} fill action={<Btn icon="mdi:plus" onClick={openCreateProfileModal} disabled={isCommunity} title={isCommunity ? copy.profiles.createProTitle : undefined}>
              {copy.profiles.newProfile}
              {isCommunity ? <ProFeatureBadge variant="inline" className={s.proBadgeInline} /> : null}
            </Btn>}>
            <div className={ui.toolRow}>
              <div className={ui.toolLeft}>
                <input type="search" className={ui.fieldSearch} placeholder={copy.profiles.searchPlaceholder} value={profilesSearchTerm} onChange={e => setProfilesSearchTerm(e.target.value)} />
                <span className={ui.count}>
                  {filteredProfiles.length === 1 ? interpolate(copy.profiles.profileCount, {
              count: filteredProfiles.length
            }) : interpolate(copy.profiles.profileCountPlural, {
              count: filteredProfiles.length
            })}
                </span>
              </div>
            </div>

            <div className={s.tableSection}>
            {profilesLoading ? <div className={s.scrollBody}>
                <div className={s.empty}>{copy.profiles.emptyLoading}</div>
              </div> : filteredProfiles.length === 0 ? <div className={s.scrollBody}>
                <div className={s.empty}>{copy.profiles.empty}</div>
              </div> : <div className={s.scrollBody}>
              <div className={s.profileGrid}>
                {paginatedProfiles.map(p => {
              const isProtected = isProfileProtected(p.name);
              const displayName = getProfileLabel(p.name);
              const displayDesc = getProfileDescription(p.name, p.label);
              const profileAgents = getUsersForProfile(p.name);
              const mfaEnabledCount = profileAgents.filter(u => u.mfa_enabled).length;
              return <div key={p.name} className={s.profileCard}>
                      <div className={s.profileCardHead}>
                        <div className={s.profileCardIcon}>
                          <Icon icon="mdi:account-cog-outline" />
                        </div>
                        <div className={s.profileCardMeta}>
                          <div className={s.profileCardTitleRow}>
                            <p className={s.profileCardName}>{displayName}</p>
                            <span className={isProtected ? s.systemTag : s.customTag}>
                              {isProtected ? copy.profiles.systemTag : copy.profiles.customBadge}
                            </span>
                          </div>
                          <p className={s.profileCardDesc}>{displayDesc || "\u00A0"}</p>
                          {p.parent_profile ? <span className={s.profileParentBadge}>
                              <Icon icon="mdi:source-branch" />
                              {interpolate(copy.profiles.inherits, {
                        parent: getProfileLabel(p.parent_profile)
                      })}
                            </span> : null}
                          <p className={s.profileCardStats}>
                            {profileAgents.length === 1 ? interpolate(copy.profiles.stats, {
                        count: profileAgents.length,
                        mfa: mfaEnabledCount,
                        total: profileAgents.length
                      }) : interpolate(copy.profiles.statsPlural, {
                        count: profileAgents.length,
                        mfa: mfaEnabledCount,
                        total: profileAgents.length
                      })}
                          </p>
                        </div>
                      </div>
                      <div className={s.profileCardActions}>
                        <button type="button" className={s.profileCardBtn} onClick={() => {
                    setProfileModalMode("edit");
                    setProfileModalTarget(p.name);
                    setProfileNameInput(p.name);
                    setProfileLabelInput(displayDesc || p.label || p.name);
                    setShowProfileModal(true);
                  }}>
                          <Icon icon={isProtected ? "mdi:eye-outline" : "mdi:pencil-outline"} />
                          {isProtected ? copy.profiles.view : copy.profiles.edit}
                        </button>
                      </div>
                    </div>;
            })}
              </div>
              </div>}

            {filteredProfiles.length > 0 && <Pager page={currentProfilesPage} totalPages={totalProfilesPages} onPageChange={setProfilesPage} />}
            </div>
        </Card>}

      {activeView === "access" && <Card title={copy.access.title} description={isCommunity ? copy.access.descriptionCommunity : copy.access.description} fill>
            {isCommunity && <p className={s.limitHint}>
                {copy.access.communityHint}{" "}
                <ProFeatureBadge variant="inline" className={s.proBadgeInline} />
              </p>}
            <div className={s.accessHeader}>
              <div />
              <div className={s.accessLegend}>
                <span className={s.legendItem}>
                  <span className={`${s.legendDot} ${s.legendOn}`} /> {copy.access.legendOn}
                </span>
                <span className={s.legendItem}>
                  <span className={`${s.legendDot} ${s.legendOff}`} /> {copy.access.legendOff}
                </span>
                <span className={s.legendItem}>
                  <span className={`${s.legendDot} ${s.legendLock}`} /> {copy.access.legendLock}
                </span>
              </div>
            </div>

            <div className={s.tableSection}>
            <div className={s.accessWrap}>
              <table className={s.accessTable}>
                <thead>
                  <tr>
                    <th>{copy.access.profileColumn}</th>
                    {accessColumns.map(col => <th key={col.key}>{col.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {paginatedAccessProfiles.length === 0 ? <tr>
                      <td colSpan={accessColumns.length + 1} className={s.empty}>
                        {copy.access.empty}
                      </td>
                    </tr> : paginatedAccessProfiles.map(p => <tr key={p.name}>
                        <td>
                          <div className={s.accessProfileCell}>
                            <span className={s.accessProfileName}>{getProfileLabel(p.name)}</span>
                            {getProfileDescription(p.name, p.label) ? <span className={s.accessProfileDesc}>{getProfileDescription(p.name, p.label)}</span> : null}
                            {p.parent_profile ? <span className={s.accessProfileDesc}>
                                {interpolate(copy.profiles.inherits, {
                        parent: getProfileLabel(p.parent_profile)
                      })}
                              </span> : null}
                          </div>
                        </td>
                        {accessColumns.map(col => {
                  const communityLocked = isCommunity;
                  const isCommunityModule = COMMUNITY_ACCESS_MODULE_KEYS.has(col.key);
                  const profileLocked = isSuperAdminProtectedProfile(p.name);
                  const isLocked = col.locked || !col.accessKey || communityLocked || profileLocked;
                  const isEnabled = profileLocked ? true : communityLocked ? isCommunityModule : col.locked ? true : !!p[col.accessKey];
                  return <td key={col.key}>
                              <button type="button" className={`${s.toggle} ${isLocked ? s.toggleLocked : isEnabled ? s.toggleOn : s.toggleOff}`} disabled={isLocked} title={profileLocked ? copy.access.toggleLocked : communityLocked ? isCommunityModule ? copy.access.toggleCommunityActive : copy.access.toggleCommunityInactive : isLocked ? copy.access.toggleLocked : isEnabled ? copy.access.toggleDisable : copy.access.toggleEnable} onClick={() => !isLocked && toggle(p.name, col.accessKey)}>
                                <Icon icon={isLocked ? "mdi:lock-outline" : isEnabled ? "mdi:check" : "mdi:minus"} />
                              </button>
                            </td>;
                })}
                      </tr>)}
                </tbody>
              </table>
            </div>

            {profiles.length > 0 && <Pager page={currentAccessPage} totalPages={totalAccessPages} onPageChange={setAccessPage} />}
            </div>
        </Card>}

      <AgentFormModal open={showModal} draft={agentDraft} setDraft={setAgentDraft} saving={creatingAgent} profiles={profiles} onClose={closeCreateAgentModal} onSave={handleCreateUser} />

      <AgentFormModal mode="edit" open={showEditAgentModal} draft={editAgentDraft} setDraft={setEditAgentDraft} saving={savingAgent} profiles={profiles} onClose={closeEditAgentModal} onSave={handleSaveAgent} onDelete={() => setConfirmDeleteUser(true)} deleteDisabled={cannotDeleteEditAgent} deleteDescription={editAgentDeleteDescription} onReleaseMfa={() => openMfaReleaseConfirm(editAgentDraft)} canReleaseMfa={canReleaseMfa(editAgentDraft)} />

      <ProfileFormModal open={showProfileModal && profileModalMode === "create"} draft={profileDraft} setDraft={setProfileDraft} saving={creatingProfile} profiles={profiles} onClose={closeCreateProfileModal} onSave={handleCreateProfile} />

      <Modal open={showProfileModal && profileModalMode === "edit"} onClose={() => {
      setShowProfileModal(false);
      setProfileModalTarget(null);
      setConfirmDeleteProfile(false);
    }} title={getProfileLabel(profileNameInput)} icon="mdi:account-cog-outline" width={PROFILE_MODAL_WIDTH} footerBar footer={<ModalFooterBar onCancel={() => {
      setShowProfileModal(false);
      setProfileModalTarget(null);
      setConfirmDeleteProfile(false);
    }} onConfirm={handleUpdateProfile} confirmLabel={commonCopy.save} confirmDisabled={editingProfileIsProtected || profilesLoading || !profileLabelInput.trim()} dangerAction={!editingProfileIsProtected ? <Btn variant="danger" size="sm" icon="mdi:trash-can-outline" onClick={() => setConfirmDeleteProfile(true)}>
              {adminCopy.delete}
            </Btn> : null} />}>
        {profileModalMode === "edit" && (() => {
        const parentProfileName = profiles.find(p => p.name === profileModalTarget)?.parent_profile;
        const assignedAgents = profileModalTarget ? getUsersForProfile(profileModalTarget) : [];
        return <>
              <div className={s.profileViewMeta}>
                <div className={s.profileViewBadges}>
                  {editingProfileIsProtected ? <Badge variant="warn">{copy.profiles.systemTag}</Badge> : <Badge variant="success">{copy.profiles.customBadge}</Badge>}
                  {parentProfileName ? <span className={s.profileParentBadge}>
                      {interpolate(copy.profiles.inherits, {
                  parent: getProfileLabel(parentProfileName)
                })}
                    </span> : null}
                </div>
                <div className={s.profileViewFields}>
                  <Field label={copy.profiles.identifierLabel}>
                    <Input value={profileNameInput} disabled />
                  </Field>
                  <Field label={copy.profiles.descriptionLabel}>
                    <Input placeholder={copy.profiles.descriptionPlaceholder} value={profileLabelInput} onChange={e => setProfileLabelInput(e.target.value)} disabled={editingProfileIsProtected} />
                  </Field>
                </div>
              </div>

              <div className={s.profileAgentsBlock}>
                <div className={s.profileAgentsHeading}>
                  <h4 className={s.profileAgentsTitle}>
                    <Icon icon="mdi:account-group-outline" aria-hidden />
                    {copy.profiles.assignedAgents}
                  </h4>
                  <span className={s.profileAgentsCount}>
                    {assignedAgents.length === 1 ? interpolate(copy.profiles.assignedCount, {
                count: assignedAgents.length
              }) : interpolate(copy.profiles.assignedCountPlural, {
                count: assignedAgents.length
              })}
                  </span>
                </div>
                {assignedAgents.length === 0 ? <p className={s.profileAgentsEmpty}>{copy.profiles.noAgents}</p> : <div className={s.profileAgentsTableWrap}>
                    <table className={s.profileAgentsTable}>
                      <thead>
                        <tr>
                          <th>{copy.profiles.assignedColumns.agent}</th>
                          <th>{copy.profiles.assignedColumns.status}</th>
                          <th>{copy.profiles.assignedColumns.mfa}</th>
                          <th style={{
                    width: 48
                  }} />
                        </tr>
                      </thead>
                      <tbody>
                        {assignedAgents.map(agent => <tr key={agent.id}>
                            <td>
                              <div className={s.profileAgentEmail}>{agent.email}</div>
                              {agent.username && <div className={s.profileAgentName}>{agent.username}</div>}
                            </td>
                            <td>
                              <EntityStatus active={Boolean(agent.is_active)} />
                            </td>
                            <td>
                              <MfaStatusBadge user={agent} locale={locale} />
                            </td>
                            <td>
                              {canReleaseMfa(agent) && <button type="button" className={s.actionBtn} title={copy.confirm.resetMfaTitle} onClick={() => openMfaReleaseConfirm(agent)}>
                                  <Icon icon="mdi:shield-off-outline" />
                                </button>}
                            </td>
                          </tr>)}
                      </tbody>
                    </table>
                  </div>}
              </div>
            </>;
      })()}
      </Modal>

      <ConfirmModal open={confirmReleaseMfa} onClose={() => {
      if (!releasingMfa) {
        setConfirmReleaseMfa(false);
        setMfaReleaseTarget(null);
      }
    }} onConfirm={handleReleaseMfa} title={copy.confirm.releaseMfaTitle} icon="mdi:shield-off-outline" message={interpolate(copy.confirm.releaseMfaMessage, {
      email: mfaReleaseTarget?.email || adminCopy.thisAgent
    })} confirmLabel={releasingMfa ? copy.confirm.releaseMfaLoading : copy.confirm.releaseMfaConfirm} confirmVariant="dangerSolid" />

      <ConfirmModal open={confirmDeleteUser} onClose={() => setConfirmDeleteUser(false)} onConfirm={handleDeleteAgent} title={copy.confirm.deleteAgentTitle} icon="mdi:delete-alert-outline" message={interpolate(copy.confirm.deleteAgentMessage, {
      email: editAgentDraft?.email || adminCopy.thisAgent
    })} confirmLabel={adminCopy.delete} confirmVariant="dangerSolid" />

      <ConfirmModal open={confirmDeleteProfile} onClose={() => setConfirmDeleteProfile(false)} onConfirm={() => profileModalTarget && handleDeleteProfile(profileModalTarget)} title={copy.confirm.deleteProfileTitle} icon="mdi:delete-alert-outline" message={interpolate(copy.confirm.deleteProfileMessage, {
      name: profileModalTarget || ""
    })} confirmLabel={adminCopy.delete} confirmVariant="dangerSolid" />

      <ProFeaturePromoModal open={Boolean(proPromoFeature)} featureKey={proPromoFeature} onClose={() => setProPromoFeature(null)} />
    </Page>;
}
