import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { fetchPermissionsMatrix } from "../../api/permissions";
import { getAdminPermissionsCopy, getLocalizedProfileName } from "./adminPermissionsI18n";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { usePermissions } from "../../contexts/PermissionsContext";
import { isSuperAdminProtectedProfile } from "../../utils/profileProtection";
import s from "./ProfilePermissionsEditor.module.css";

function cloneMatrix(source) {
  const next = {};
  for (const [profile, perms] of Object.entries(source || {})) {
    next[profile] = {
      ...(perms || {})
    };
  }
  return next;
}

/**
 * Features (rows) × profiles (columns), grouped by section.
 */
export default function ProfilePermissionsEditor({
  value,
  onChange,
  readOnly = false,
  onLoadState
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getAdminPermissionsCopy(locale), [locale]);
  const {
    canUseProfilePreview,
    isPreviewing,
    previewProfile,
    startProfilePreview,
    stopProfilePreview
  } = usePermissions();
  const [profiles, setProfiles] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [featureFilter, setFeatureFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      onLoadState?.({
        loading: true,
        error: null
      });
      try {
        const data = await fetchPermissionsMatrix();
        if (cancelled) return;
        const profileList = Array.isArray(data?.profiles) ? data.profiles : [];
        const matrixCatalog = Array.isArray(data?.matrixCatalog) ? data.matrixCatalog : [];
        const byProfile = data?.permissionsByProfile && typeof data.permissionsByProfile === "object" ? cloneMatrix(data.permissionsByProfile) : {};
        // Ensure Super Admin is fully granted in draft
        for (const p of profileList) {
          if (!isSuperAdminProtectedProfile(p.name)) continue;
          const full = {
            ...(byProfile[p.name] || {})
          };
          for (const group of matrixCatalog) {
            for (const action of group.actions || []) {
              full[action.key] = true;
            }
          }
          byProfile[p.name] = full;
        }
        setProfiles(profileList);
        setCatalog(matrixCatalog);
        onChange?.(byProfile);
        onLoadState?.({
          loading: false,
          error: null,
          profiles: profileList
        });
      } catch (err) {
        if (cancelled) return;
        console.warn("[ProfilePermissionsEditor]", err?.message || err);
        setError(copy.loadError);
        setCatalog([]);
        setProfiles([]);
        onLoadState?.({
          loading: false,
          error: copy.loadError
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const featureRows = useMemo(() => {
    const q = featureFilter.trim().toLowerCase();
    const rows = [];
    for (const group of catalog) {
      for (const action of group.actions || []) {
        const groupLabel = copy.groups?.[group.group] || group.label || group.group;
        const featureLabel = copy.actionOverrides?.[action.key] || copy.actionLabels?.[action.action] || action.label || action.action;
        const hay = `${groupLabel} ${featureLabel} ${action.key}`.toLowerCase();
        if (q && !hay.includes(q)) continue;
        rows.push({
          section: group.section || "autres",
          group: group.group,
          groupLabel,
          key: action.key,
          label: featureLabel,
          dependsOn: action.dependsOn || []
        });
      }
    }
    return rows;
  }, [catalog, copy, featureFilter]);

  const groupedRows = useMemo(() => {
    const map = new Map();
    for (const row of featureRows) {
      if (!map.has(row.section)) map.set(row.section, []);
      map.get(row.section).push(row);
    }
    return Array.from(map.entries());
  }, [featureRows]);

  const isDepsMet = useCallback((profileName, dependsOn) => {
    if (!dependsOn?.length) return true;
    const perms = value?.[profileName] || {};
    return dependsOn.every(dep => Boolean(perms[dep]));
  }, [value]);

  const setCell = useCallback((profileName, key, enabled) => {
    if (readOnly || isSuperAdminProtectedProfile(profileName)) return;
    const next = cloneMatrix(value);
    if (!next[profileName]) next[profileName] = {};
    next[profileName][key] = Boolean(enabled);
    // Cascade: turning off a parent clears dependents
    if (!enabled) {
      for (const group of catalog) {
        for (const action of group.actions || []) {
          if ((action.dependsOn || []).includes(key)) {
            next[profileName][action.key] = false;
          }
        }
      }
    }
    onChange?.(next);
  }, [catalog, onChange, readOnly, value]);

  const toggleCell = (profileName, key, dependsOn) => {
    if (readOnly || isSuperAdminProtectedProfile(profileName)) return;
    if (!isDepsMet(profileName, dependsOn)) return;
    const current = Boolean(value?.[profileName]?.[key]);
    setCell(profileName, key, !current);
  };

  const sectionLabel = section => copy.sections?.[section] || section;

  const handlePreviewProfile = profileName => {
    if (!canUseProfilePreview) return;
    if (isSuperAdminProtectedProfile(profileName)) return;
    if (isPreviewing && previewProfile === profileName) {
      stopProfilePreview();
      toast.info(copy.previewStopped);
      return;
    }
    const ok = startProfilePreview(profileName);
    if (ok) toast.success(copy.previewStarted.replace("{profile}", getLocalizedProfileName(profileName, copy) || profileName));
  };

  if (loading) return <div className={s.state}>{copy.loading}</div>;
  if (error) return <div className={s.stateError}>{error}</div>;
  if (profiles.length === 0 || featureRows.length === 0 && !featureFilter) {
    return <div className={s.state}>{copy.empty}</div>;
  }

  return <div className={s.root}>
      {readOnly ? <div className={s.banner}>{copy.sectionHintCommunity || copy.protectedHint}</div> : null}

      <div className={s.toolbar}>
        <input type="search" className={s.filterInput} placeholder={copy.searchFeaturePlaceholder} value={featureFilter} onChange={e => setFeatureFilter(e.target.value)} />
      </div>

      <div className={s.tableWrap}>
        <table className={s.matrix}>
          <thead>
            <tr>
              <th className={s.colFeature}>{copy.columns.feature}</th>
              {profiles.map(p => {
              const locked = isSuperAdminProtectedProfile(p.name);
              const displayName = getLocalizedProfileName(p.name, copy);
              const previewActive = isPreviewing && previewProfile === p.name;
              return <th key={p.name} className={`${s.colProfile} ${locked ? s.colProfileLocked : ""} ${previewActive ? s.colProfilePreview : ""}`} title={locked ? copy.protectedHint : displayName}>
                    <span className={s.profileHead}>{displayName}</span>
                    {locked ? <span className={s.lockHint}>{copy.systemTag}</span> : null}
                    {canUseProfilePreview && !locked ? <button type="button" className={`${s.previewBtn} ${previewActive ? s.previewBtnActive : ""}`} onClick={() => handlePreviewProfile(p.name)} title={previewActive ? copy.previewStopTitle : copy.previewStartTitle} aria-label={previewActive ? copy.previewStopTitle : `${copy.previewStartTitle} — ${displayName}`}>
                        <Icon icon={previewActive ? "mdi:eye-off-outline" : "mdi:eye-outline"} aria-hidden />
                        <span>{previewActive ? copy.previewActive : copy.previewAction}</span>
                      </button> : null}
                  </th>;
            })}
            </tr>
          </thead>
          <tbody>
            {groupedRows.map(([section, rows]) => <Fragment key={section}>
                <tr className={s.sectionRow}>
                  <td colSpan={profiles.length + 1}>{sectionLabel(section)}</td>
                </tr>
                {rows.map(row => <tr key={row.key} className={s.dataRow}>
                    <td className={s.featureCell}>
                      <span className={s.featureGroup}>{row.groupLabel}</span>
                      <span className={s.featureLabel}>{row.label}</span>
                      {row.dependsOn?.length ? <span className={s.dependsHint} title={copy.dependsOnHint}>
                          {copy.dependsOnPrefix} {row.dependsOn.join(", ")}
                        </span> : null}
                    </td>
                    {profiles.map(p => {
                const locked = readOnly || isSuperAdminProtectedProfile(p.name);
                const depsOk = isDepsMet(p.name, row.dependsOn);
                const checked = isSuperAdminProtectedProfile(p.name) ? true : Boolean(value?.[p.name]?.[row.key]);
                const disabled = locked || !depsOk && !checked;
                return <td key={p.name} className={s.actionCell}>
                          <label className={`${s.check} ${checked ? s.checkOn : ""} ${disabled ? s.checkLocked : ""}`} title={!depsOk && !locked ? copy.dependsOnHint : row.label}>
                            <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleCell(p.name, row.key, row.dependsOn)} aria-label={`${row.label} — ${getLocalizedProfileName(p.name, copy)}`} />
                            <span className={s.checkBox} aria-hidden>
                              {checked ? <svg viewBox="0 0 16 16" className={s.checkIcon}><path d="M3.5 8.5l3 3 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg> : null}
                            </span>
                          </label>
                        </td>;
              })}
                  </tr>)}
              </Fragment>)}
          </tbody>
        </table>
      </div>
    </div>;
}

export { isSuperAdminProtectedProfile as isAdminProtectedProfile };
