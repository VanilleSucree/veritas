import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { fetchUsers } from "../../api/users";
import { fetchTeams, fetchTeam, createTeam, updateTeam, deleteTeam, addTeamMember, updateTeamMember, removeTeamMember } from "../../api/teams";
import { useAdminCommonCopy, useAdminPageCopy } from "../../hooks/useAdminCopy";
import { interpolate } from "../../i18n/translate";
import { Modal, ConfirmModal, ModalFooter, ModalForm, ModalFormSection, Btn, Card, Page } from "./AdminUi";
import TeamFormModal from "./TeamFormModal";
import MultiSuggestPicker from "./MultiSuggestPicker";
import { buildDefaultTeamDraft } from "./adminOrgFormConstants";
import ui from "./AdminUi.module.css";
import s from "./AdminUsers.module.css";
const MODAL_WIDTH = "520px";
function getInitials(user) {
  const base = (user?.username || user?.email || "?").trim();
  const parts = base.split(/[\s.@_-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}
export default function AdminTeams() {
  const copy = useAdminPageCopy("teams");
  const adminCopy = useAdminCommonCopy();
  const [teams, setTeams] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [teamModalMode, setTeamModalMode] = useState("create");
  const [teamForm, setTeamForm] = useState(buildDefaultTeamDraft());
  const [confirmDeleteTeam, setConfirmDeleteTeam] = useState(null);
  const [confirmRemoveMember, setConfirmRemoveMember] = useState(null);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addMemberUserId, setAddMemberUserId] = useState("");
  const [addMemberLeader, setAddMemberLeader] = useState(false);
  const [busy, setBusy] = useState(false);
  const loadTeams = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchTeams();
      setTeams(Array.isArray(rows) ? rows : []);
    } catch (err) {
      toast.error(err.message || copy.loadTeamsError);
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, []);
  const loadAgents = useCallback(async () => {
    try {
      const rows = await fetchUsers();
      setAgents(Array.isArray(rows) ? rows : []);
    } catch {
      setAgents([]);
    }
  }, []);
  const loadTeamDetail = useCallback(async teamId => {
    if (!teamId) {
      setSelectedTeam(null);
      return;
    }
    setDetailLoading(true);
    try {
      const detail = await fetchTeam(teamId);
      setSelectedTeam(detail);
    } catch (err) {
      toast.error(err.message || copy.loadTeamError);
      setSelectedTeam(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);
  useEffect(() => {
    loadTeams();
    loadAgents();
  }, [loadTeams, loadAgents]);
  useEffect(() => {
    loadTeamDetail(selectedTeamId);
  }, [selectedTeamId, loadTeamDetail]);
  const filteredTeams = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter(t => String(t.name || "").toLowerCase().includes(q) || String(t.description || "").toLowerCase().includes(q));
  }, [teams, search]);
  const availableAgents = useMemo(() => {
    if (!selectedTeam?.members) return agents;
    const memberIds = new Set(selectedTeam.members.map(m => String(m.userId)));
    return agents.filter(a => !memberIds.has(String(a.id)));
  }, [agents, selectedTeam]);
  const availableAgentOptions = useMemo(() => availableAgents.map(agent => ({
    id: agent.id,
    label: agent.username || agent.email || String(agent.id),
    hint: agent.username && agent.email ? `${agent.email}${agent.profile ? ` · ${agent.profile}` : ""}` : agent.profile || ""
  })), [availableAgents]);
  const openCreateTeam = () => {
    setTeamModalMode("create");
    setTeamForm(buildDefaultTeamDraft());
    setTeamModalOpen(true);
  };
  const closeTeamModal = () => {
    if (busy) return;
    setTeamModalOpen(false);
    setTeamForm(buildDefaultTeamDraft());
  };
  const openEditTeam = () => {
    if (!selectedTeam) return;
    setTeamModalMode("edit");
    setTeamForm({
      name: selectedTeam.name || "",
      description: selectedTeam.description || "",
      isActive: selectedTeam.isActive !== false
    });
    setTeamModalOpen(true);
  };
  const handleSaveTeam = async () => {
    if (!teamForm.name.trim()) return toast.error(copy.nameRequired);
    setBusy(true);
    try {
      const payload = {
        name: teamForm.name.trim(),
        description: teamForm.description.trim(),
        isActive: teamForm.isActive
      };
      if (teamModalMode === "create") {
        const created = await createTeam(payload);
        toast.success(copy.created);
        await loadTeams();
        setSelectedTeamId(created.id);
      } else if (selectedTeamId) {
        await updateTeam(selectedTeamId, payload);
        toast.success(copy.updated);
        await loadTeams();
        await loadTeamDetail(selectedTeamId);
      }
      setTeamModalOpen(false);
    } catch (err) {
      toast.error(err.message || copy.saveError);
    } finally {
      setBusy(false);
    }
  };
  const handleDeleteTeam = async () => {
    if (!confirmDeleteTeam?.id) return;
    setBusy(true);
    try {
      await deleteTeam(confirmDeleteTeam.id);
      toast.success(copy.deleted);
      if (selectedTeamId === confirmDeleteTeam.id) {
        setSelectedTeamId(null);
        setSelectedTeam(null);
      }
      setConfirmDeleteTeam(null);
      await loadTeams();
    } catch (err) {
      toast.error(err.message || copy.deleteError);
    } finally {
      setBusy(false);
    }
  };
  const handleAddMember = async () => {
    if (!selectedTeamId || !addMemberUserId) return toast.error(copy.selectAgent);
    setBusy(true);
    try {
      await addTeamMember(selectedTeamId, {
        userId: addMemberUserId,
        isLeader: addMemberLeader
      });
      toast.success(copy.memberAdded);
      setAddMemberOpen(false);
      setAddMemberUserId("");
      setAddMemberLeader(false);
      await loadTeams();
      await loadTeamDetail(selectedTeamId);
    } catch (err) {
      toast.error(err.message || copy.addError);
    } finally {
      setBusy(false);
    }
  };
  const handleToggleLeader = async member => {
    if (!selectedTeamId) return;
    setBusy(true);
    try {
      await updateTeamMember(selectedTeamId, member.userId, {
        isLeader: !member.isLeader
      });
      await loadTeamDetail(selectedTeamId);
      await loadTeams();
    } catch (err) {
      toast.error(err.message || copy.updateError);
    } finally {
      setBusy(false);
    }
  };
  const handleRemoveMember = async () => {
    if (!selectedTeamId || !confirmRemoveMember?.userId) return;
    setBusy(true);
    try {
      await removeTeamMember(selectedTeamId, confirmRemoveMember.userId);
      toast.success(copy.memberRemoved);
      setConfirmRemoveMember(null);
      await loadTeamDetail(selectedTeamId);
      await loadTeams();
    } catch (err) {
      toast.error(err.message || copy.removeError);
    } finally {
      setBusy(false);
    }
  };
  return <Page>
      <div className={s.teamsLayout}>
        <Card title={copy.title} description={copy.description} fill fillNoScroll action={<Btn icon="mdi:plus" onClick={openCreateTeam}>
              {copy.newTeam}
            </Btn>}>
          <div className={ui.toolRow}>
            <div className={ui.toolLeft}>
              <input type="search" className={ui.fieldSearch} placeholder={copy.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} />
              <span className={ui.count}>
                {filteredTeams.length > 1 ? interpolate(copy.teamCountPlural, {
                count: filteredTeams.length
              }) : interpolate(copy.teamCount, {
                count: filteredTeams.length
              })}
              </span>
            </div>
          </div>

          <div className={s.teamsListPane}>
            {loading ? <div className={s.empty}>{adminCopy.loading}</div> : filteredTeams.length === 0 ? <div className={s.empty}>{copy.noTeams}</div> : filteredTeams.map(team => {
            const active = String(selectedTeamId) === String(team.id);
            return <button key={team.id} type="button" className={`${s.teamListItem} ${active ? s.teamListItemActive : ""}`} onClick={() => setSelectedTeamId(team.id)}>
                    <Icon icon={team.icon || "mdi:account-group-outline"} className={s.teamListIcon} />
                    <span className={s.teamListMain}>
                      <span className={s.teamListName}>{team.name}</span>
                      {team.description && <span className={s.teamListDesc}>{team.description}</span>}
                    </span>
                    <span className={s.teamListMeta}>
                      {(team.memberCount || 0) > 1 ? interpolate(copy.memberCountPlural, {
                  count: team.memberCount || 0
                }) : interpolate(copy.memberCount, {
                  count: team.memberCount || 0
                })}
                    </span>
                  </button>;
          })}
          </div>
        </Card>

        <Card title={selectedTeam ? selectedTeam.name : copy.detailTitle} description={selectedTeam ? interpolate(copy.detailDescription, {
        members: selectedTeam.memberCount || 0,
        leaders: selectedTeam.leaderCount || 0
      }) : copy.detailDescriptionEmpty} fill action={selectedTeam ? <div className={s.teamDetailActions}>
                <Btn icon="mdi:account-plus-outline" variant="secondary" onClick={() => setAddMemberOpen(true)}>
                  {copy.addMember}
                </Btn>
                <Btn icon="mdi:pencil-outline" variant="secondary" onClick={openEditTeam}>
                  {adminCopy.modify}
                </Btn>
              </div> : null}>
          {!selectedTeamId ? <div className={s.empty}>{copy.selectTeamHint}</div> : detailLoading ? <div className={s.empty}>{adminCopy.loading}</div> : <>
              {selectedTeam && !selectedTeam.isActive && <div className={s.teamInactiveBanner}>
                  <Icon icon="mdi:pause-circle-outline" />
                  {copy.inactiveBanner}
                </div>}

              <div className={s.tableSection}>
                <div className={s.tableWrap}>
                  <table className={s.table}>
                    <thead>
                      <tr>
                        <th>{adminCopy.agent}</th>
                        <th>{adminCopy.profile}</th>
                        <th>{adminCopy.status}</th>
                        <th>{adminCopy.leader}</th>
                        <th style={{
                      width: 48
                    }} />
                      </tr>
                    </thead>
                    <tbody>
                      {!selectedTeam?.members?.length ? <tr>
                          <td colSpan={5} className={s.empty}>
                            {copy.noMembers}{" "}
                            <button type="button" className={s.inlineLinkBtn} onClick={() => setAddMemberOpen(true)}>
                              {copy.addAgentLink}
                            </button>
                          </td>
                        </tr> : selectedTeam.members.map(member => <tr key={member.userId}>
                            <td>
                              <div className={s.userCell}>
                                <div className={s.avatar}>{getInitials(member)}</div>
                                <div className={s.userInfo}>
                                  <div className={s.userEmail}>{member.email}</div>
                                  {member.username && <div className={s.userName}>{member.username}</div>}
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={s.badge}>{member.profile || "-"}</span>
                            </td>
                            <td>
                              <span className={`${s.status} ${member.isActive ? s.statusActive : s.statusInactive}`}>
                                <span className={s.statusDot} />
                                {member.isActive ? adminCopy.active : adminCopy.inactive}
                              </span>
                            </td>
                            <td>
                              <button type="button" className={`${s.leaderToggle} ${member.isLeader ? s.leaderToggleOn : ""}`} title={member.isLeader ? copy.removeLeaderTitle : copy.setLeaderTitle} disabled={busy} onClick={() => handleToggleLeader(member)}>
                                <Icon icon={member.isLeader ? "mdi:star" : "mdi:star-outline"} />
                                {member.isLeader ? adminCopy.leader : adminCopy.member}
                              </button>
                            </td>
                            <td>
                              <button type="button" className={s.actionBtn} title={copy.removeFromTeamTitle} disabled={busy} onClick={() => setConfirmRemoveMember(member)}>
                                <Icon icon="mdi:account-remove-outline" />
                              </button>
                            </td>
                          </tr>)}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedTeam && <div className={s.teamDangerZone}>
                  <button type="button" className={s.teamDeleteBtn} onClick={() => setConfirmDeleteTeam(selectedTeam)}>
                    <Icon icon="mdi:delete-outline" />
                    {copy.deleteTeam}
                  </button>
                </div>}
            </>}
        </Card>
      </div>

      <TeamFormModal open={teamModalOpen} mode={teamModalMode} draft={teamForm} setDraft={setTeamForm} saving={busy} onClose={closeTeamModal} onSave={handleSaveTeam} />

      <Modal open={addMemberOpen} onClose={() => {
      setAddMemberOpen(false);
      setAddMemberUserId("");
      setAddMemberLeader(false);
    }} eyebrow={adminCopy.organizationEyebrow} title={copy.addMemberTitle} subtitle={copy.addMemberSubtitle} icon="mdi:account-plus-outline" width={MODAL_WIDTH} footer={<ModalFooter onCancel={() => {
      setAddMemberOpen(false);
      setAddMemberUserId("");
      setAddMemberLeader(false);
    }} onConfirm={handleAddMember} confirmLabel={adminCopy.add} confirmDisabled={busy || !addMemberUserId} />}>
        <ModalForm>
          <ModalFormSection title={adminCopy.agent} icon="mdi:account-outline">
            <MultiSuggestPicker singleSelect maxResults={8} inputId="team-add-member-agent" label={copy.selectAgentLabel} placeholder={copy.searchAgentPlaceholder} options={availableAgentOptions} selectedIds={addMemberUserId ? [addMemberUserId] : []} emptyHint={copy.noAgentSelected} emptyResultsHint={copy.noAgentFound} onChange={ids => setAddMemberUserId(ids[0] ? String(ids[0]) : "")} />
            <label className={s.leaderCheckLabel}>
              <input type="checkbox" checked={addMemberLeader} onChange={e => setAddMemberLeader(e.target.checked)} />
              {copy.setTeamLeader}
            </label>
          </ModalFormSection>
        </ModalForm>
      </Modal>

      <ConfirmModal open={!!confirmRemoveMember} onClose={() => setConfirmRemoveMember(null)} onConfirm={handleRemoveMember} title={copy.removeMemberTitle} icon="mdi:account-remove-outline" message={confirmRemoveMember ? interpolate(copy.removeMemberMessage, {
      agent: confirmRemoveMember.email || confirmRemoveMember.username || adminCopy.thisAgent,
      team: selectedTeam?.name || ""
    }) : ""} confirmLabel={adminCopy.remove} confirmVariant="dangerSolid" confirmLoading={busy} />

      <ConfirmModal open={!!confirmDeleteTeam} onClose={() => setConfirmDeleteTeam(null)} onConfirm={handleDeleteTeam} title={copy.deleteTeamTitle} icon="mdi:delete-alert-outline" message={interpolate(copy.deleteTeamMessage, {
      name: confirmDeleteTeam?.name || ""
    })} confirmLabel={adminCopy.delete} confirmVariant="dangerSolid" />
    </Page>;
}
