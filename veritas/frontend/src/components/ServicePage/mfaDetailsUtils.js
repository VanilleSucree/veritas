const IGNORED_MFA_METHODS = new Set([
  "passwordauthenticationmethod",
  "password",
  "windowshelloforbusinessauthenticationmethod"
]);

export function parseMfaMethods(raw) {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item || "").toLowerCase().trim()).filter(Boolean);
  }
  if (raw && typeof raw === "object") {
    return Object.values(raw).map((item) => String(item || "").toLowerCase().trim()).filter(Boolean);
  }
  if (typeof raw !== "string") return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    return parseMfaMethods(JSON.parse(trimmed));
  } catch {
    return trimmed.split(",").map((item) => item.toLowerCase().trim()).filter(Boolean);
  }
}

export function asMfaBool(value) {
  if (value === true || value === 1 || value === "1") return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "t" || normalized === "yes" || normalized === "oui";
  }
  return false;
}

function addIdentityKey(set, value) {
  const key = String(value || "").toLowerCase().trim();
  if (key) set.add(key);
}

export function collectMfaIdentityKeys(entry) {
  const keys = new Set();
  if (!entry) return keys;
  addIdentityKey(keys, entry.userPrincipalName);
  addIdentityKey(keys, entry.user_principal_name);
  addIdentityKey(keys, entry.upn);
  addIdentityKey(keys, entry.email);
  addIdentityKey(keys, entry.mail);
  return keys;
}

export function normalizeMfaRecord(raw) {
  if (!raw || typeof raw !== "object") return null;
  const methods = parseMfaMethods(raw.mfa_methods || raw.mfaMethods || raw.methods);
  const hasMfa = asMfaBool(raw.has_mfa ?? raw.hasMfa ?? raw.hasMFA ?? raw.mfaEnabled)
    || methods.some((method) => !IGNORED_MFA_METHODS.has(method));
  const isAdmin = asMfaBool(raw.is_admin ?? raw.isAdmin);
  const adminRole = raw.admin_role || raw.adminRole || null;
  const upn = raw.userPrincipalName || raw.user_principal_name || raw.email || raw.mail || "";
  return {
    ...raw,
    id: raw.id || raw.userId || raw.user_id || null,
    displayName: raw.displayName || raw.display_name || raw.name || upn,
    userPrincipalName: upn,
    email: raw.email || raw.mail || upn,
    has_mfa: hasMfa,
    hasMfa,
    hasMFA: hasMfa,
    mfa_methods: methods,
    mfaMethods: methods,
    is_admin: isAdmin,
    isAdmin,
    admin_role: adminRole,
    adminRole
  };
}

export function normalizeMfaList(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeMfaRecord).filter(Boolean);
}

/** O(1) MFA lookups for large tenant user tables. */
export function buildMfaLookupIndex(mfaDetails) {
  const list = normalizeMfaList(mfaDetails);
  const byId = new Map();
  const byKey = new Map();
  for (const entry of list) {
    const entryId = entry?.id != null ? String(entry.id) : entry?.user_id != null ? String(entry.user_id) : "";
    if (entryId && !byId.has(entryId)) byId.set(entryId, entry);
    for (const key of collectMfaIdentityKeys(entry)) {
      if (!byKey.has(key)) byKey.set(key, entry);
    }
  }
  return { byId, byKey, list };
}

export function getMfaUserFromIndex(user, mfaIndex) {
  if (!user) return null;
  if (mfaIndex?.byId || mfaIndex?.byKey) {
    const userId = user.id != null ? String(user.id) : user.userId != null ? String(user.userId) : "";
    if (userId && mfaIndex.byId?.has(userId)) return mfaIndex.byId.get(userId);
    for (const key of collectMfaIdentityKeys(user)) {
      if (mfaIndex.byKey?.has(key)) return mfaIndex.byKey.get(key);
    }
  } else if (Array.isArray(mfaIndex)) {
    return getMfaUserForUser(user, mfaIndex);
  }
  if (
    user.has_mfa != null
    || user.hasMfa != null
    || user.hasMFA != null
    || user.mfaMethods
    || user.mfa_methods
    || user.is_admin != null
    || user.isAdmin != null
    || user.admin_role
    || user.adminRole
  ) {
    return normalizeMfaRecord(user);
  }
  return null;
}

export function pickMfaDetailsFromSnapshot(data) {
  if (!data || typeof data !== "object") return [];
  const candidates = [
    data.mfaDetails,
    data.userMfaDetails,
    data.securityData?.mfaDetails,
    data.securityData?.userMfaDetails,
    data.security?.mfaDetails,
    data.security?.userMfaDetails
  ];
  for (const candidate of candidates) {
    const list = normalizeMfaList(candidate);
    if (list.length) return list;
  }
  return [];
}

export function getMfaUserForUser(user, mfaDetails) {
  if (!user) return null;
  const list = Array.isArray(mfaDetails) ? mfaDetails : [];
  if (list.length) {
    const userId = user.id != null ? String(user.id) : user.userId != null ? String(user.userId) : "";
    const userKeys = collectMfaIdentityKeys(user);
    const found = list.find((entry) => {
      const entryId = entry?.id != null ? String(entry.id) : entry?.user_id != null ? String(entry.user_id) : "";
      if (userId && entryId && userId === entryId) return true;
      const entryKeys = collectMfaIdentityKeys(entry);
      for (const key of userKeys) {
        if (entryKeys.has(key)) return true;
      }
      return false;
    });
    if (found) return normalizeMfaRecord(found);
  }
  if (
    user.has_mfa != null
    || user.hasMfa != null
    || user.hasMFA != null
    || user.mfaMethods
    || user.mfa_methods
    || user.is_admin != null
    || user.isAdmin != null
    || user.admin_role
    || user.adminRole
  ) {
    return normalizeMfaRecord(user);
  }
  return null;
}

export function userHasMfa(mfaUser) {
  if (!mfaUser) return false;
  const normalized = normalizeMfaRecord(mfaUser);
  return Boolean(normalized?.has_mfa);
}

export function userIsAdmin(mfaUser) {
  return Boolean(normalizeMfaRecord(mfaUser)?.is_admin);
}

export function getMfaMethods(mfaUser) {
  return normalizeMfaRecord(mfaUser)?.mfaMethods || [];
}

export function userHasMethod(mfaUser, methodKey) {
  if (!methodKey) return false;
  return getMfaMethods(mfaUser).includes(String(methodKey).toLowerCase());
}
