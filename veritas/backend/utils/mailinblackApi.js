import fetch from 'node-fetch';
/** Partner portal root — the JSON API is exposed under `/api`. */
export const DEFAULT_MAILINBLACK_API_URL = 'https://partner.mailinblack.com';
const PARTNER_API_GATEWAY = 'https://partner.mailinblack.com/api';
/** Legacy hostname still referenced in older docs — kept as optional fallback only. */
const LEGACY_MAILINBLACK_API_URL = 'https://api.mailinblack.com';
function normalizeApiUrl(apiUrl) {
  let raw = (apiUrl || DEFAULT_MAILINBLACK_API_URL).trim().replace(/\/+$/, '');
  const instanceMatch = raw.match(/^(https?:\/\/[^/]+\/mibc-[a-z0-9-]+)/i);
  if (instanceMatch) return instanceMatch[1];
  raw = raw.replace(/\/auth\/api(\/v[\d.]+)?(\/.*)?$/i, '');
  raw = raw.replace(/\/protect\/api(\/v[\d.]+)?(\/.*)?$/i, '');
  raw = raw.replace(/\/admin\/api(\/v[\d.]+)?(\/.*)?$/i, '');
  raw = raw.replace(/\/(admin|protect|auth)(\/.*)?$/i, '');
  raw = raw.replace(/\/v1$/i, '');
  return raw.replace(/\/+$/, '');
}
/**
 * Partner portal JSON API lives under `/api`.
 * Dedicated tenants (`/mibc-xx`) expose the API at the instance root — do not fall back to partner.
 */
function resolveGatewayBaseUrls(apiUrl) {
  const raw = (apiUrl || DEFAULT_MAILINBLACK_API_URL).trim();
  const root = normalizeApiUrl(raw);
  const bases = [];
  const add = value => {
    if (value && !bases.includes(value)) bases.push(value);
  };
  const portalRoot = root.replace(/\/api$/i, '');
  const isInstance = /\/mibc-[a-z0-9-]+$/i.test(portalRoot);
  const isPartner = /partner\.mailinblack\.com/i.test(portalRoot);
  if (isInstance) {
    add(portalRoot);
    return bases;
  }
  if (isPartner) {
    add(PARTNER_API_GATEWAY);
    add(portalRoot);
    return bases;
  }
  add(`${portalRoot}/api`);
  add(portalRoot);
  add(PARTNER_API_GATEWAY);
  if (raw.includes('api.mailinblack.com')) {
    add(LEGACY_MAILINBLACK_API_URL);
  }
  return bases;
}
function resolveApiBaseUrls(apiUrl) {
  return resolveGatewayBaseUrls(apiUrl);
}
function resolveClientId(session, credentials = {}) {
  return session?.clientId || credentials?.authClientId || null;
}
async function parseResponseBody(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return {
      raw: text
    };
  }
}
function extractErrorMessage(body, status) {
  if (!body) return `HTTP ${status}`;
  if (typeof body === 'string') return body;
  return body.error?.message || body.error || body.message || body.details || `HTTP ${status}`;
}
function parseList(payload, depth = 0) {
  if (!payload || depth > 4) return [];
  if (Array.isArray(payload)) return payload;
  const directKeys = ['items', 'content', 'data', 'results', 'list', 'customers', 'clients', 'senders', 'spools', 'domains', 'users', 'emails', 'servers', 'mailboxes', 'licenses', 'licences', 'offers', 'contracts', 'subscriptions', 'elements', 'records', 'values', 'rows'];
  for (const key of directKeys) {
    const candidate = payload[key];
    if (Array.isArray(candidate)) return candidate;
    if (candidate && typeof candidate === 'object') {
      const nested = parseList(candidate, depth + 1);
      if (nested.length) return nested;
    }
  }
  for (const value of Object.values(payload)) {
    if (Array.isArray(value)) return value;
  }
  return [];
}
function normalizeListItem(item, normalizer) {
  if (item == null) return null;
  if (typeof item === 'string' || typeof item === 'number') {
    const value = String(item).trim();
    if (!value) return null;
    return normalizer({
      id: value,
      name: value,
      domain: value,
      email: value,
      fqdn: value
    });
  }
  return normalizer(item);
}
function normalizePaginated(payload) {
  const items = parseList(payload);
  const total = payload?.total ?? payload?.totalElements ?? payload?.totalCount ?? payload?.count ?? items.length;
  return {
    items,
    total
  };
}
function resolveAuthBaseUrls(apiUrl) {
  return resolveGatewayBaseUrls(apiUrl);
}
function looksLikeJwtSessionToken(value) {
  const key = (value || '').trim();
  if (!key.startsWith('eyJ')) return false;
  return key.split('.').length >= 3;
}
function extractAuthToken(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  return parsed.token || parsed.accessToken || parsed.authToken || parsed.sessionToken || parsed.jwt || null;
}
function looksLikeHtmlPayload(parsed, contentType = '') {
  if (String(contentType || '').toLowerCase().includes('text/html')) return true;
  const raw = typeof parsed === 'string' ? parsed : parsed?.raw;
  if (typeof raw !== 'string') return false;
  const trimmed = raw.trimStart().slice(0, 32).toLowerCase();
  return trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html');
}
async function postMailinblackAuth(authBase, path, body) {
  const url = `${authBase.replace(/\/+$/, '')}/auth/api/v2.0/${path}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const parsed = await parseResponseBody(response);
  const contentType = response.headers?.get?.('content-type') || '';
  return {
    response,
    parsed,
    url,
    contentType
  };
}
function buildAuthFailureMessage(lastStatus, lastBody, lastUrl = '') {
  if (lastStatus === 401) {
    return "Identifiants rejetés (401). Une clé créée dans le tenant client (app.mailinblack.com/mibc-fr-XX) " + "ne fonctionne pas sur partner.mailinblack.com. Utilisez l'URL d'instance, le Client ID et l'Auth key de ce tenant.";
  }
  if (lastStatus === 405) {
    return "HTTP 405 — Mailinblack a refusé la méthode (portail web au lieu de l'API). " + "Pour un tenant client, utilisez https://app.mailinblack.com/mibc-fr-XX (sans /admin/integration). " + "Pour une clé partenaire, utilisez https://partner.mailinblack.com.";
  }
  if (looksLikeHtmlPayload(lastBody)) {
    return "L'URL API renvoie le portail web au lieu de l'API JSON. Collez la racine d'instance (https://app.mailinblack.com/mibc-fr-XX) ou https://partner.mailinblack.com.";
  }
  if (lastStatus) {
    const base = extractErrorMessage(lastBody, lastStatus);
    return lastUrl ? `${base} (${lastUrl})` : base;
  }
  return "Impossible de se connecter à Mailinblack — vérifiez l'URL API, le Client ID et l'Auth key.";
}
export async function mailinblackAuthenticate(credentials = {}) {
  const {
    apiUrl,
    authKey,
    apiKey,
    authClientId,
    login,
    password
  } = credentials;
  const key = (authKey || apiKey || '').trim();
  const authBases = resolveAuthBaseUrls(apiUrl);
  // Never fall back to Veritas `credentials.clientId` — only the Mailinblack auth client id.
  const clientIdForAuth = String(authClientId || '').trim() || null;
  if (login?.trim() && password) {
    let lastStatus = null;
    let lastBody = null;
    for (const authBase of authBases) {
      const {
        response,
        parsed,
        contentType
      } = await postMailinblackAuth(authBase, 'login', {
        login: login.trim(),
        password
      });
      if (looksLikeHtmlPayload(parsed, contentType)) continue;
      const token = extractAuthToken(parsed);
      if (response.ok && token) {
        return {
          token,
          clientId: parsed.clientId || clientIdForAuth || null,
          userId: parsed.userId || null
        };
      }
      lastStatus = response.status;
      lastBody = parsed;
    }
    const err = new Error(buildAuthFailureMessage(lastStatus, lastBody));
    err.status = lastStatus;
    err.body = lastBody;
    throw err;
  }
  if (!key) {
    throw new Error("Auth key Mailinblack requise — générez-la dans Espace manager → Intégration → Clés API.");
  }
  // Only a real JWT may skip the Auth-key exchange. Opaque Auth keys (often ≥64 chars)
  // must go through api-keys/execute — treating them as session tokens causes 401s.
  if (looksLikeJwtSessionToken(key) && !clientIdForAuth) {
    return {
      token: key,
      clientId: clientIdForAuth,
      userId: null
    };
  }
  if (!clientIdForAuth) {
    const err = new Error("Client ID Mailinblack requis — copiez-le avec l'Auth key à la création de la clé API.");
    err.status = 400;
    throw err;
  }
  const executeBodies = [{
    authKey: key,
    clientId: clientIdForAuth
  }, {
    apiKey: key,
    clientId: clientIdForAuth
  }];
  const authPaths = ['api-keys', 'api-keys/execute'];
  let lastStatus = null;
  let lastBody = null;
  let lastUrl = null;
  for (const authBase of authBases) {
    for (const authPath of authPaths) {
      for (const executeBody of executeBodies) {
        try {
          const {
            response,
            parsed,
            url,
            contentType
          } = await postMailinblackAuth(authBase, authPath, executeBody);
          if (looksLikeHtmlPayload(parsed, contentType)) {
            if (lastStatus == null || lastStatus === 405) {
              lastStatus = response.status;
              lastBody = parsed;
              lastUrl = url;
            }
            continue;
          }
          const token = extractAuthToken(parsed);
          if (response.ok && token) {
            return {
              token,
              clientId: parsed.clientId || clientIdForAuth || null,
              userId: parsed.userId || null
            };
          }
          lastStatus = response.status;
          lastBody = parsed;
          lastUrl = url;
        } catch {}
      }
    }
  }
  const err = new Error(buildAuthFailureMessage(lastStatus, lastBody, lastUrl));
  err.status = lastStatus;
  err.body = lastBody;
  throw err;
}
export async function mailinblackV2Request(apiUrl, session, module, path, {
  method = 'GET',
  body = null,
  query = {}
} = {}) {
  const bases = resolveApiBaseUrls(apiUrl);
  let lastError = null;
  for (const base of bases) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value != null && value !== '') params.set(key, String(value));
    });
    const qs = params.toString();
    const url = `${base}/${module}/api/v2.0/${path}${qs ? `?${qs}` : ''}`;
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-auth-token': session.token,
      Authorization: `Bearer ${session.token}`
    };
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: method === 'GET' || method === 'HEAD' ? undefined : JSON.stringify(body || {})
      });
      const parsed = await parseResponseBody(response);
      const contentType = response.headers?.get?.('content-type') || '';
      if (looksLikeHtmlPayload(parsed, contentType)) {
        const err = new Error("L'URL API renvoie le portail web au lieu de l'API JSON. Utilisez https://app.mailinblack.com/mibc-fr-XX ou https://partner.mailinblack.com.");
        err.status = response.status || 404;
        err.body = parsed;
        err.requestUrl = url;
        lastError = err;
        continue;
      }
      if (!response.ok) {
        const message = extractErrorMessage(parsed, response.status);
        const err = new Error(message);
        err.status = response.status;
        err.body = parsed;
        err.permissionDenied = response.status === 401 || response.status === 403;
        err.requestUrl = url;
        if (response.status === 404 || response.status === 405) {
          lastError = err;
          continue;
        }
        throw err;
      }
      if (parsed && parsed.success === false) {
        const err = new Error(extractErrorMessage(parsed, response.status));
        err.status = response.status;
        err.body = parsed;
        throw err;
      }
      return parsed;
    } catch (err) {
      if (err?.status === 404 || err?.status === 405) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }
  if (lastError) throw lastError;
  throw new Error('Unable to call the Mailinblack API');
}
async function safeMailinblackCall(fn) {
  try {
    const data = await fn();
    return {
      ok: true,
      data,
      permissionDenied: false,
      error: null
    };
  } catch (err) {
    let error = err.message;
    if (err.status === 403) {
      error = 'Forbidden — this API key cannot access this resource. Enable the required Management/Protect permission on the key.';
    } else if (err.status === 400) {
      error = 'Bad Request — this endpoint rejected the query (unsupported resource or missing parameter).';
    }
    return {
      ok: false,
      data: null,
      permissionDenied: Boolean(err.permissionDenied || err.status === 401 || err.status === 403),
      error,
      httpStatus: err.status || null
    };
  }
}
export async function mailinblackProtectRequest(apiUrl, apiKey, action, params = {}, method = 'POST') {
  const session = await mailinblackAuthenticate({
    apiUrl,
    authKey: apiKey
  });
  const path = action.includes('/') ? action : action;
  try {
    return mailinblackV2Request(apiUrl, session, 'protect', path, {
      method,
      body: params
    });
  } catch {
    const base = normalizeApiUrl(apiUrl);
    const legacyUrl = `${base}/protect/${action}`;
    const response = await fetch(legacyUrl, {
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-auth-token': session.token,
        Authorization: `Bearer ${session.token}`
      },
      body: method === 'GET' ? undefined : JSON.stringify(params)
    });
    const body = await parseResponseBody(response);
    if (!response.ok) throw new Error(extractErrorMessage(body, response.status));
    return body;
  }
}
export async function mailinblackProtectCheck(apiUrl, credentials) {
  const creds = typeof credentials === 'string' ? {
    apiUrl,
    authKey: credentials
  } : {
    apiUrl,
    ...credentials
  };
  const session = await mailinblackAuthenticate(creds);
  const probe = await safeMailinblackCall(() => mailinblackV2Request(apiUrl, session, 'protect', 'senders', {
    method: 'GET',
    query: {
      page: 0,
      size: 1
    }
  }));
  if (!probe.ok) {
    const domainsProbe = await safeMailinblackCall(() => mailinblackV2Request(apiUrl, session, 'admin', 'domains', {
      method: 'GET',
      query: {
        page: 0,
        size: 1
      }
    }));
    if (!domainsProbe.ok) {
      const denied = probe.permissionDenied || domainsProbe.permissionDenied;
      const raw = probe.error || domainsProbe.error || 'Mailinblack connection failed';
      throw new Error(denied ? 'Access denied to the Protect/Admin APIs. Verify that the API key has Management and Protect permissions (read-only access is sufficient).' : raw);
    }
  }
  return {
    success: true,
    session
  };
}
function toValidExpirationDate(value) {
  if (value == null || value === '' || value === 0 || value === '0' || typeof value === 'boolean') return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime()) || value.getUTCFullYear() < 1990) return null;
    return value;
  }
  if (typeof value === 'number' || typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(String(value).trim())) {
    const num = Number(value);
    if (!Number.isFinite(num) || num === 0) return null;
    const date = new Date(num < 1e12 ? num * 1000 : num);
    if (Number.isNaN(date.getTime()) || date.getUTCFullYear() < 1990) return null;
    return date;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getUTCFullYear() < 1990) return null;
  return date;
}
function pickSoonestExpirationIso(values) {
  const dates = [];
  for (const value of values) {
    const date = toValidExpirationDate(value);
    if (date) dates.push(date);
  }
  if (!dates.length) return null;
  dates.sort((a, b) => a.getTime() - b.getTime());
  return dates[0].toISOString();
}
export function normalizeMailinblackCustomer(item, session = null) {
  if (!item || typeof item !== 'object') return null;
  const id = item.id ?? item.customerId ?? item.clientId ?? item.uuid ?? item.reference ?? session?.clientId;
  if (id == null) return null;
  return {
    id: String(id),
    name: item.name || item.companyName || item.company || item.label || item.customerName || 'Mailinblack',
    domain: item.domain || item.primaryDomain || item.mainDomain || null,
    usersCount: toNumericCount(item.usersCount ?? item.users ?? item.nbUsers),
    licenseCount: toNumericCount(item.licenseCount ?? (typeof item.licenses === 'number' || typeof item.licenses === 'string' ? item.licenses : null) ?? item.nbLicences ?? item.nbLicense ?? item.totalLicenses ?? item.licenceCount ?? item.nbLicenceProtect ?? item.protectLicenses ?? item.seats),
    domainsCount: item.domainsCount ?? item.domains ?? item.domainCount ?? (item.domain ? 1 : null),
    status: item.status || item.installationStatus || item.state || null,
    expiration: pickSoonestExpirationIso([item.expirationDate, item.expiration, item.renewalDate, item.expiryDate, item.licenseExpiration]),
    raw: item
  };
}
function collectRawLicenseItems(raw) {
  if (!raw || typeof raw !== 'object') return [];
  const lists = [raw.licenses, raw.licences, raw.licenseList, raw.licenceList, raw.offers, raw.contracts];
  const items = [];
  for (const list of lists) {
    if (Array.isArray(list)) items.push(...list);
  }
  return items;
}
function toNumericCount(value) {
  if (value == null || value === '' || value === false) return null;
  if (typeof value === 'boolean') return null;
  if (Array.isArray(value)) {
    const summed = value.reduce((acc, entry) => {
      const qty = toNumericCount(entry?.quantity ?? entry?.count ?? entry?.total ?? entry?.nbLicences ?? entry?.licenseCount ?? entry);
      return qty != null ? acc + qty : acc;
    }, 0);
    if (summed > 0) return summed;
    return value.length > 0 ? value.length : null;
  }
  if (typeof value === 'object') {
    return toNumericCount(value.quantity ?? value.count ?? value.total ?? value.nbLicences ?? value.licenseCount ?? value.value ?? value.seats);
  }
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return null;
  return num;
}
function pickNumericCount(...values) {
  for (const value of values) {
    const num = toNumericCount(value);
    if (num != null) return num;
  }
  return null;
}
function extractLicenseSummaryFromPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return {
      total: null,
      used: null
    };
  }
  return {
    total: pickNumericCount(payload.totalLicenses, payload.licenseCount, payload.nbLicences, payload.nbLicense, payload.licencesTotales, payload.numberOfLicenses, payload.maxLicenses, payload.purchasedLicenses, payload.protectLicenses, payload.nbLicenceProtect, payload.seats, payload.quantity, typeof payload.licenses === 'number' || typeof payload.licenses === 'string' ? payload.licenses : null, typeof payload.licences === 'number' || typeof payload.licences === 'string' ? payload.licences : null),
    used: pickNumericCount(payload.usedLicenses, payload.assignedLicenses, payload.consumedLicenses, payload.nbLicencesUsed, payload.licencesUtilisees, payload.assigned, payload.used, payload.consumed)
  };
}
function normalizeLicense(item) {
  if (item == null) return null;
  if (typeof item === 'string' || typeof item === 'number') {
    const name = String(item).trim();
    if (!name) return null;
    return {
      id: name,
      product: name,
      total: 1,
      used: null,
      expiration: null,
      status: null
    };
  }
  if (typeof item !== 'object') return null;
  const product = pickFirst(item.product, item.productName, item.offer, item.offerName, item.name, item.label, item.type, item.code, item.sku);
  const total = pickNumericCount(item.quantity, item.count, item.total, item.nbLicences, item.licenseCount, item.seats, item.maxUsers, item.licenses);
  const used = pickNumericCount(item.used, item.assigned, item.consumed, item.usedCount, item.assignedCount, item.nbUsed);
  const id = item.id ?? item.licenseId ?? item.uuid ?? product;
  if (!id && total == null && used == null && !product) return null;
  return {
    id: String(id || product || 'license'),
    product: product ? String(product) : 'Protect',
    total,
    used,
    expiration: pickSoonestExpirationIso([item.expirationDate, item.expiration, item.expiryDate, item.renewalDate, item.endDate, item.validUntil]),
    status: pickFirst(item.status, item.state, item.active === true ? 'Active' : null)
  };
}
function summarizeLicenseItems(items = []) {
  let total = 0;
  let used = 0;
  let hasTotal = false;
  let hasUsed = false;
  for (const item of items) {
    if (item?.total != null) {
      total += Number(item.total) || 0;
      hasTotal = true;
    }
    if (item?.used != null) {
      used += Number(item.used) || 0;
      hasUsed = true;
    }
  }
  return {
    total: hasTotal ? total : items.length ? items.length : null,
    used: hasUsed ? used : null
  };
}
function countProtectedUsers(users = []) {
  const list = Array.isArray(users) ? users : [];
  const protectedCount = list.filter(user => user?.status === 'Protected' || user?.protected === true).length;
  return protectedCount > 0 ? protectedCount : null;
}
function scalarFrom(value, depth = 0) {
  if (depth > 3 || value == null || value === '') return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 0 ? null : value;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const inner = scalarFrom(entry, depth + 1);
      if (inner != null) return inner;
    }
    return null;
  }
  if (typeof value === 'object') {
    const nestedKeys = ['email', 'address', 'value', 'name', 'label', 'fqdn', 'domain', 'mainEmail', 'mail', 'mailAddress', 'date', 'expirationDate', 'expiration', 'status'];
    for (const key of nestedKeys) {
      if (value[key] != null) {
        const inner = scalarFrom(value[key], depth + 1);
        if (inner != null) return inner;
      }
    }
    return null;
  }
  const str = String(value).trim();
  if (!str || str === '0') return null;
  return str;
}
function pickFirst(...values) {
  for (const value of values) {
    if (typeof value === 'boolean') return value;
    const resolved = scalarFrom(value);
    if (resolved != null && resolved !== '') return resolved;
  }
  return null;
}
function isTruthyFlag(value) {
  return value === true || value === 1 || value === '1' || value === 'true' || value === 'yes' || value === 'YES';
}
function isFalsyFlag(value) {
  return value === false || value === 0 || value === '0' || value === 'false' || value === 'no' || value === 'NO';
}
function looksLikeEmail(value) {
  const str = String(value || '').trim();
  return Boolean(str.includes('@') && str.length > 3 && !/\s/.test(str));
}
function pickEmailValue(...values) {
  for (const value of values) {
    if (value == null || value === '') continue;
    if (typeof value === 'string' || typeof value === 'number') {
      const str = String(value).trim();
      if (looksLikeEmail(str)) return str;
      continue;
    }
    if (Array.isArray(value)) {
      const inner = pickEmailValue(...value);
      if (inner) return inner;
      continue;
    }
    if (typeof value === 'object') {
      const inner = pickEmailValue(value.email, value.mail, value.address, value.value, value.mainEmail, value.mailAddress, value.eMail, value.Email, value.sender, value.from, value.to, value.recipient, value.login, value.username, value.expediteur, value.destinataire, value.content, value.items, value.data, value.list, value.results);
      if (inner) return inner;
    }
  }
  return null;
}
function findEmailOnObject(item) {
  if (!item || typeof item !== 'object') return null;
  const direct = pickEmailValue(item.mainEmail, item.email, item.mail, item.mailAddress, item.eMail, item.Email, item.login, item.username, item.primaryEmail, item.userPrincipalName, item.upn, item.account, item.mailbox, item.emails, item.emailAddresses, item.mailAddresses, item.aliases, item.emailList);
  if (direct) return direct;
  for (const [key, val] of Object.entries(item)) {
    if (/mail|email|login|alias|account|upn|mailbox/i.test(key) && !/password|token|key|hash/i.test(key)) {
      const found = pickEmailValue(val);
      if (found) return found;
    }
  }
  if (looksLikeEmail(item.name) || looksLikeEmail(item.displayName) || looksLikeEmail(item.fullName)) {
    return String(item.name || item.displayName || item.fullName).trim();
  }
  return null;
}
function toIsoDate(value) {
  if (value == null || value === '' || value === 0 || value === '0') return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) || value.getUTCFullYear() < 1990 ? null : value.toISOString();
  }
  if (typeof value === 'number' || typeof value === 'string' && /^\d+(\.\d+)?$/.test(value.trim())) {
    const n = Number(value);
    if (!Number.isFinite(n) || n === 0) return null;
    const ms = n < 1e12 ? n * 1000 : n;
    const d = new Date(ms);
    if (Number.isNaN(d.getTime()) || d.getUTCFullYear() < 1990) return null;
    return d.toISOString();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.getUTCFullYear() < 1990) return null;
  return parsed.toISOString();
}
function pickDateValue(...values) {
  for (const value of values) {
    if (value == null || value === '') continue;
    if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      const nested = pickDateValue(value.date, value.datetime, value.timestamp, value.value, value.iso, value.utc, value.createdAt, value.updatedAt, value.dateTime);
      if (nested) return nested;
      continue;
    }
    const iso = toIsoDate(value);
    if (iso) return iso;
  }
  return null;
}
function pickAddressList(value) {
  if (Array.isArray(value)) {
    const parts = value.map(entry => pickEmailValue(entry) || pickFirst(entry)).filter(Boolean);
    return parts.length ? parts.join(', ') : null;
  }
  return pickEmailValue(value) || (typeof value === 'string' && value.trim() ? value.trim() : pickFirst(value));
}
function nestedMail(item) {
  if (!item || typeof item !== 'object') return {};
  const nested = item.mail || item.message || item.payload || item.spool || item.content;
  return nested && typeof nested === 'object' && !Array.isArray(nested) ? nested : {};
}
function isNotFoundResult(result) {
  if (!result || result.ok) return false;
  if (result.httpStatus === 404 || result.httpStatus === 405) return true;
  const msg = String(result.error || '').toLowerCase();
  return msg === 'not found' || msg.includes('not found') || /\b404\b/.test(msg);
}
function emptyListSection(exploited = true) {
  return {
    status: 'empty',
    error: null,
    items: [],
    total: 0,
    exploited
  };
}
function findDateOnObject(item, keyPattern) {
  if (!item || typeof item !== 'object') return null;
  for (const [key, val] of Object.entries(item)) {
    if (!keyPattern.test(key) || /password|token|hash/i.test(key)) continue;
    const found = pickDateValue(val);
    if (found) return found;
  }
  return null;
}
function extractDomainFromEmail(email) {
  const value = String(email || '');
  const at = value.lastIndexOf('@');
  if (at < 0 || at === value.length - 1) return null;
  return value.slice(at + 1);
}
function formatFlag(value) {
  if (value === true || value === 1 || value === '1' || value === 'true') return 'Yes';
  if (value === false || value === 0 || value === '0' || value === 'false') return 'No';
  return null;
}
function formatMx(item) {
  const mxOk = item.mxOk ?? item.mxValid ?? item.mxChecked ?? item.hasValidMx;
  if (mxOk === true) return 'OK';
  if (mxOk === false) return 'Invalid';
  const records = item.mxRecords || item.mxList;
  if (Array.isArray(records) && records.length) return records.map(entry => scalarFrom(entry) || entry).filter(Boolean).join(', ');
  return pickFirst(item.mx, item.mxRecord, item.mailServer, item.mxHost, item.mxValue);
}
function formatUserStatus(item) {
  if (isTruthyFlag(item.protected) || isTruthyFlag(item.isProtected) || isTruthyFlag(item.licenseProtect) || isTruthyFlag(item.licenceProtect) || isTruthyFlag(item.hasLicense) || isTruthyFlag(item.protect)) return 'Protected';
  if (isFalsyFlag(item.protected) || isFalsyFlag(item.isProtected) || isFalsyFlag(item.licenseProtect) || isFalsyFlag(item.licenceProtect)) return 'Unprotected';
  if (isTruthyFlag(item.enabled) || isTruthyFlag(item.active) || isTruthyFlag(item.isEnabled) || isTruthyFlag(item.isActive)) return 'Active';
  if (isFalsyFlag(item.enabled) || isFalsyFlag(item.active) || isFalsyFlag(item.isEnabled)) return 'Disabled';
  return pickFirst(item.status, item.state, item.accountStatus, item.protectionStatus, item.statut);
}
function formatUserRole(item) {
  const direct = pickFirst(item.role, item.profile, item.profileName, item.type, item.profileType, item.userType, item.jobTitle, item.fonction, item.right);
  if (direct) return String(direct);
  const profiles = item.profiles || item.roles || item.rights || item.groups;
  if (Array.isArray(profiles) && profiles.length) {
    const names = profiles.map(entry => typeof entry === 'string' ? entry : pickFirst(entry?.name, entry?.label, entry?.role, entry?.code, entry?.title)).filter(Boolean);
    if (names.length) return names.join(', ');
  }
  if (isTruthyFlag(item.isAdmin) || isTruthyFlag(item.admin)) return 'Admin';
  if (isTruthyFlag(item.isManager) || isTruthyFlag(item.manager)) return 'Manager';
  if (isTruthyFlag(item.isUser)) return 'User';
  return null;
}
function formatSenderStatus(item) {
  const raw = pickFirst(item.status, item.state, item.verdict, item.typeLabel, item.listType);
  if (raw) return raw;
  if (item.authorized === true || item.isAuthorized === true || item.trusted === true || isTruthyFlag(item.authorized)) return 'Authorized';
  if (item.banned === true || item.blocked === true || item.authorized === false || isTruthyFlag(item.banned) || isTruthyFlag(item.blocked)) return 'Banned';
  return null;
}
function joinName(item) {
  const full = pickFirst(item.name, item.displayName, item.fullName);
  if (full) return String(full);
  const parts = [item.firstName || item.firstname || item.prenom, item.lastName || item.lastname || item.nom].filter(Boolean);
  return parts.length ? parts.join(' ') : null;
}
function normalizeSender(item) {
  if (!item || typeof item !== 'object') return null;
  const email = pickEmailValue(item.email, item.address, item.sender, item.mail, item.value, item.name, item.senderEmail, item.mailAddress) || pickFirst(item.email, item.address, item.sender, item.mail, item.value, item.name, item.senderEmail);
  const id = item.id ?? item.senderId ?? item.uuid ?? email;
  if (!id) return null;
  const domain = pickFirst(item.domain, item.senderDomain, item.fqdn, extractDomainFromEmail(email));
  return {
    id: String(id),
    email: email || '—',
    domain: domain || null,
    status: formatSenderStatus(item),
    authorized: item.authorized ?? item.isAuthorized ?? item.trusted ?? (String(item.status || item.type || item.listType || '').toLowerCase().includes('auth') ? true : null),
    lastSeen: pickDateValue(item.lastSeen, item.lastActivity, item.updatedAt, item.lastUseDate, item.lastConnectionDate, item.lastUsed, item.date, item.creationDate, item.createdAt, item.addedDate, item.addedAt, item.insertDate, item.dateAdded, item.created, item.createdOn, item.createdDate, item.addDate, item.insertionDate) || findDateOnObject(item, /date|seen|creat|add|insert|updat/i)
  };
}
function normalizeSpool(item) {
  if (!item || typeof item !== 'object') return null;
  const nested = nestedMail(item);
  const source = {
    ...nested,
    ...item
  };
  let sender = pickAddressList(source.sender || source.from || source.mailFrom || source.senderEmail || source.senderAddress || source.fromAddress || source.fromMail || source.source || source.expediteur || source.mail_from);
  let recipient = pickAddressList(source.recipient || source.recipients || source.to || source.mailTo || source.rcptTo || source.recipientEmail || source.toAddress || source.toMail || source.destination || source.destinataire || source.rcpt);
  if (!sender || !recipient) {
    for (const [key, val] of Object.entries(source)) {
      if (!sender && /from|sender|expediteur|mailfrom/i.test(key)) sender = pickAddressList(val);
      if (!recipient && /^(to|recipient|destinataire|rcpt)/i.test(key)) recipient = pickAddressList(val);
    }
  }
  const subject = pickFirst(source.subject, source.title, source.object, source.objet, nested.subject) || '—';
  const receivedAt = pickDateValue(source.receivedAt, source.date, source.createdAt, source.receptionDate, source.timestamp, source.receivedDate, source.insertDate, source.createdDate, source.dateReception, source.receivedOn, source.created, source.datetime);
  const id = source.id ?? source.spoolId ?? source.messageId ?? source.uuid ?? source.mailId ?? source.uid ?? source.key;
  if (!id && subject === '—' && !sender && !recipient) return null;
  const category = pickFirst(source.category, source.folder, source.queue, source.type, source.spoolType, source.kind, source.categorie);
  const threat = pickFirst(source.threat, source.reason, source.detection, source.scoreLabel, source.analysis, source.verdictReason, source.filterReason, source.spamType, source.cause, source.reasonLabel, source.typeAnalyse, source.menace, source.filter, source.reasonCode) || (/spam|virus|phish|malware|threat|ransom|suspect/i.test(String(category || '')) ? category : null);
  return {
    id: String(id || `${sender || ''}|${recipient || ''}|${subject}|${receivedAt || ''}`),
    subject,
    sender: sender || null,
    recipient: recipient || null,
    status: pickFirst(source.status, source.state, source.verdict, source.spoolStatus, source.queueStatus, source.mailStatus, source.statut, source.etat, isTruthyFlag(source.processed) || isTruthyFlag(source.treated) ? 'Processed' : null, isTruthyFlag(source.waiting) ? 'Waiting' : null, isTruthyFlag(source.quarantined) ? 'Quarantined' : null),
    category,
    threat,
    score: source.score ?? source.spamScore ?? source.note ?? nested.score ?? null,
    size: source.size ?? source.sizeBytes ?? source.messageSize ?? null,
    receivedAt
  };
}
function normalizeDomain(item) {
  if (typeof item === 'string' || typeof item === 'number') {
    const name = String(item).trim();
    if (!name) return null;
    return {
      id: name,
      name
    };
  }
  if (!item || typeof item !== 'object') return null;
  const name = pickFirst(item.name, item.domain, item.fqdn, item.domainName, item.label);
  if (!name) return null;
  const autoRenewRaw = item.autoRenew ?? item.autorenew ?? item.autoRenewal ?? item.renewal;
  return {
    id: String(item.id ?? name),
    name: String(name),
    status: pickFirst(item.status, item.state, item.installationStatus, item.domainStatus, item.validationStatus, item.mxOk === true ? 'OK' : null, item.validated === true ? 'Validated' : null),
    mx: formatMx(item),
    expiration: pickFirst(item.expirationDate, item.expiration, item.expiryDate, item.renewalDate, item.licenseExpiration, item.licenceExpiration, item.endDate, item.validUntil, item.license?.expirationDate, item.license?.expiration, item.licence?.expirationDate, item.subscription?.expirationDate, item.offer?.expirationDate, item.contractEndDate),
    autoRenew: formatFlag(autoRenewRaw),
    dnsManaged: item.dnsManaged ?? item.managed ?? item.hasDnsZone ?? null
  };
}
function normalizeUser(item) {
  if (!item || typeof item !== 'object') return null;
  const email = findEmailOnObject(item);
  const name = joinName(item);
  const id = item.id ?? item.userId ?? item.uuid ?? email;
  if (!id) return null;
  return {
    id: String(id),
    email: email || (looksLikeEmail(name) ? String(name).trim() : '—'),
    name,
    firstName: pickFirst(item.firstName, item.firstname, item.prenom),
    lastName: pickFirst(item.lastName, item.lastname, item.nom),
    status: formatUserStatus(item),
    protected: isTruthyFlag(item.protected) || isTruthyFlag(item.isProtected) || isTruthyFlag(item.licenseProtect) || isTruthyFlag(item.licenceProtect) || isTruthyFlag(item.hasLicense) || isTruthyFlag(item.protect) || null,
    role: formatUserRole(item),
    lastLogin: pickDateValue(item.lastLogin, item.lastLoginDate, item.lastConnectionDate, item.lastConnection, item.lastAccessDate, item.lastAccess, item.lastAuthDate, item.lastAuthenticationDate, item.lastAuth, item.lastLogon, item.connectedAt, item.lastActivity, item.updatedAt, item.connectionDate, item.lastSeen) || findDateOnObject(item, /login|auth|connection|access|logon|lastseen/i)
  };
}
function normalizeEmail(item) {
  if (typeof item === 'string' || typeof item === 'number') {
    const email = String(item).trim();
    if (!email) return null;
    return {
      id: email,
      email,
      domain: extractDomainFromEmail(email)
    };
  }
  if (!item || typeof item !== 'object') return null;
  const email = pickFirst(item.email, item.mail, item.address, item.name, item.mainEmail, item.value);
  const id = item.id ?? item.emailId ?? email;
  if (!id || !email) return null;
  return {
    id: String(id),
    email: String(email),
    type: pickFirst(item.type, item.kind, item.usage, item.emailType),
    domain: pickFirst(item.domain, item.fqdn, extractDomainFromEmail(email)),
    userId: item.userId ?? item.ownerId ?? item.user?.id ?? null,
    primary: item.primary ?? item.isPrimary ?? item.main ?? item.isMain ?? null,
    status: pickFirst(item.status, item.state, formatUserStatus(item))
  };
}
function normalizeServer(item) {
  if (!item || typeof item !== 'object') return null;
  const name = pickFirst(item.name, item.hostname, item.host, item.fqdn, item.label, item.serverName);
  const id = item.id ?? item.serverId ?? name ?? item.ip ?? item.address;
  if (!id) return null;
  return {
    id: String(id),
    name: name || String(id),
    ip: pickFirst(item.ip, item.address, item.ipv4, item.ipAddress),
    type: pickFirst(item.type, item.role, item.kind, item.serverType),
    domain: pickFirst(item.domain, item.fqdn, item.hostname),
    status: pickFirst(item.status, item.state, item.enabled === true ? 'Active' : null, item.active === true ? 'Active' : null)
  };
}
function buildSectionFromResult(result, normalizer, columnsMeta = {}) {
  const {
    preItems,
    ...meta
  } = columnsMeta;
  const items = preItems ?? (result.ok ? parseList(result.data).map(item => normalizer ? normalizeListItem(item, normalizer) : item).filter(Boolean) : []);
  const total = result.ok ? normalizePaginated(result.data).total || items.length : 0;
  return {
    status: result.ok ? items.length ? 'ok' : 'empty' : result.permissionDenied ? 'permission_denied' : 'error',
    error: result.ok ? null : result.error,
    items,
    total,
    ...meta
  };
}
const MAILINBLACK_LIST_QUERY_VARIANTS = [{
  page: 0,
  size: 50
}, {
  page: 0,
  size: 20
}, {
  page: 0,
  size: 200
}, {
  pageNumber: 0,
  pageSize: 50
}, {
  offset: 0,
  limit: 50
}, {}];
async function mailinblackFetchListSection(apiUrl, session, credentials, module, path, normalizer, {
  exploited = true,
  alternatePaths = [],
  modules = null
} = {}) {
  const paths = [path, ...alternatePaths];
  const modulesToTry = modules || [module];
  let lastResult = {
    ok: false,
    permissionDenied: false,
    error: 'No data returned',
    httpStatus: null
  };
  let emptyOkResult = null;
  for (const currentModule of modulesToTry) {
    for (const currentPath of paths) {
      for (const baseQuery of MAILINBLACK_LIST_QUERY_VARIANTS) {
        const result = await safeMailinblackCall(() => mailinblackV2Request(apiUrl, session, currentModule, currentPath, {
          method: 'GET',
          query: {
            ...baseQuery
          }
        }));
        lastResult = result;
        if (!result.ok) {
          if (result.permissionDenied) break;
          continue;
        }
        let items = parseList(result.data).map(item => normalizeListItem(item, normalizer)).filter(Boolean);
        const expectedTotal = normalizePaginated(result.data).total;
        const pageSize = baseQuery.size || baseQuery.pageSize || baseQuery.limit || 50;
        if (items.length > 0 && expectedTotal > items.length && baseQuery.page != null) {
          for (let page = 1; page < 10; page += 1) {
            const nextQuery = {
              ...baseQuery,
              page,
              pageNumber: page
            };
            const nextResult = await safeMailinblackCall(() => mailinblackV2Request(apiUrl, session, currentModule, currentPath, {
              method: 'GET',
              query: nextQuery
            }));
            if (!nextResult.ok) break;
            const nextItems = parseList(nextResult.data).map(item => normalizeListItem(item, normalizer)).filter(Boolean);
            if (!nextItems.length) break;
            items = [...items, ...nextItems];
            if (nextItems.length < pageSize) break;
          }
        }
        if (items.length > 0) {
          return buildSectionFromResult({
            ok: true,
            data: result.data
          }, normalizer, {
            exploited,
            preItems: items
          });
        }
        emptyOkResult = result;
      }
    }
  }
  if (emptyOkResult) {
    return buildSectionFromResult(emptyOkResult, normalizer, {
      exploited
    });
  }
  if (isNotFoundResult(lastResult)) {
    return emptyListSection(exploited);
  }
  return buildSectionFromResult(lastResult, normalizer, {
    exploited
  });
}
async function mailinblackFetchLicenses(apiUrl, session) {
  const queryVariants = [{
    page: 0,
    size: 200
  }, {}];
  const attempts = [['admin', 'licenses'], ['admin', 'licences'], ['admin', 'offers'], ['admin', 'contracts'], ['protect', 'licenses'], ['protect', 'licences']];
  let lastResult = {
    ok: false,
    permissionDenied: false,
    error: 'No data returned',
    httpStatus: null
  };
  for (const [module, path] of attempts) {
    for (const query of queryVariants) {
      const result = await safeMailinblackCall(() => mailinblackV2Request(apiUrl, session, module, path, {
        method: 'GET',
        query
      }));
      lastResult = result;
      if (!result.ok) {
        if (result.permissionDenied) break;
        continue;
      }
      const items = parseList(result.data).map(item => normalizeListItem(item, normalizeLicense)).filter(Boolean);
      const payloadSummary = extractLicenseSummaryFromPayload(result.data);
      const itemSummary = summarizeLicenseItems(items);
      const summary = {
        total: payloadSummary.total ?? itemSummary.total,
        used: payloadSummary.used ?? itemSummary.used
      };
      if (items.length || summary.total != null || summary.used != null) {
        return {
          status: 'ok',
          error: null,
          items,
          total: items.length || summary.total || 0,
          summary,
          exploited: true
        };
      }
    }
  }
  if (isNotFoundResult(lastResult)) {
    return {
      ...emptyListSection(true),
      summary: {
        total: null,
        used: null
      }
    };
  }
  return {
    ...buildSectionFromResult(lastResult, normalizeLicense, {
      exploited: true
    }),
    summary: {
      total: null,
      used: null
    }
  };
}
export async function mailinblackListCustomers(apiUrl, credentials) {
  const session = await mailinblackAuthenticate(credentials);
  const legacyAttempts = [() => mailinblackV2Request(apiUrl, session, 'protect', 'customers', {
    method: 'GET'
  }), () => mailinblackProtectRequest(apiUrl, credentials.authKey || credentials.apiKey, 'customers', {}, 'GET')];
  for (const attempt of legacyAttempts) {
    const result = await safeMailinblackCall(attempt);
    if (result.ok) {
      const list = parseList(result.data?.customers ? result.data : result.data);
      const normalized = list.map(item => normalizeMailinblackCustomer(item, session)).filter(Boolean);
      if (normalized.length) {
        const seen = new Set();
        return normalized.filter(entry => {
          if (seen.has(entry.id)) return false;
          seen.add(entry.id);
          return true;
        });
      }
    }
  }
  if (session.clientId) {
    const summary = await mailinblackGetCustomer(apiUrl, credentials, session.clientId);
    if (summary) return [summary];
  }
  return [];
}
export async function mailinblackGetCustomer(apiUrl, credentials, customerId) {
  const session = await mailinblackAuthenticate(credentials);
  const legacy = await safeMailinblackCall(() => mailinblackProtectRequest(apiUrl, credentials.authKey || credentials.apiKey, `customers/${customerId}`, {}, 'GET'));
  if (legacy.ok) {
    const raw = legacy.data?.customer || legacy.data?.data || legacy.data;
    const normalized = normalizeMailinblackCustomer(raw, session);
    if (normalized) return normalized;
  }
  const [domainsRes, usersRes] = await Promise.all([safeMailinblackCall(() => mailinblackV2Request(apiUrl, session, 'admin', 'domains', {
    method: 'GET',
    query: {
      page: 0,
      size: 200
    }
  })), safeMailinblackCall(() => mailinblackV2Request(apiUrl, session, 'admin', 'users', {
    method: 'GET',
    query: {
      page: 0,
      size: 200
    }
  }))]);
  const domains = domainsRes.ok ? parseList(domainsRes.data).map(item => normalizeListItem(item, normalizeDomain)).filter(Boolean) : [];
  const users = usersRes.ok ? parseList(usersRes.data).map(item => normalizeListItem(item, normalizeUser)).filter(Boolean) : [];
  return normalizeMailinblackCustomer({
    id: customerId || session.clientId,
    clientId: session.clientId,
    name: credentials.label || 'Mailinblack',
    domain: domains[0]?.name || null,
    usersCount: users.length,
    domainsCount: domains.length,
    expiration: pickSoonestExpirationIso(domains.map(domain => domain.expiration)),
    status: 'active'
  }, session);
}
export async function mailinblackBuildDashboard(apiUrl, credentials, customerId = null) {
  const session = await mailinblackAuthenticate(credentials);
  const effectiveCustomerId = customerId || session.clientId || credentials?.authClientId || null;
  const [senders, spools, domains, users, emailsRaw, servers, licenses, customerRes] = await Promise.all([mailinblackFetchListSection(apiUrl, session, credentials, 'protect', 'senders', normalizeSender, {
    exploited: true
  }), mailinblackFetchListSection(apiUrl, session, credentials, 'protect', 'spools', normalizeSpool, {
    exploited: true
  }), mailinblackFetchListSection(apiUrl, session, credentials, 'admin', 'domains', normalizeDomain, {
    exploited: true
  }), mailinblackFetchListSection(apiUrl, session, credentials, 'admin', 'users', normalizeUser, {
    exploited: true
  }), mailinblackFetchListSection(apiUrl, session, credentials, 'admin', 'emails', normalizeEmail, {
    exploited: true,
    alternatePaths: ['email-addresses', 'emailAddresses', 'aliases', 'mailboxes'],
    modules: ['admin', 'protect']
  }), mailinblackFetchListSection(apiUrl, session, credentials, 'admin', 'servers', normalizeServer, {
    exploited: true,
    alternatePaths: ['smtp-servers', 'smtpServers', 'mail-servers', 'relays'],
    modules: ['admin', 'protect']
  }), mailinblackFetchLicenses(apiUrl, session), effectiveCustomerId ? safeMailinblackCall(() => mailinblackGetCustomer(apiUrl, credentials, effectiveCustomerId)) : Promise.resolve({
    ok: false,
    data: null,
    permissionDenied: false,
    error: null
  })]);
  let emails = emailsRaw;
  if ((!emails.items || emails.items.length === 0) && users.items?.length) {
    const derived = users.items.map(user => normalizeEmail({
      id: user.id,
      email: user.email,
      domain: extractDomainFromEmail(user.email),
      type: 'primary',
      primary: true,
      status: user.status
    })).filter(item => item?.email && item.email !== '—');
    if (derived.length) {
      emails = {
        status: 'ok',
        error: null,
        items: derived,
        total: derived.length,
        exploited: true
      };
    }
  }
  const customer = customerRes.ok && customerRes.data ? {
    status: 'ok',
    data: customerRes.data,
    error: null
  } : {
    status: effectiveCustomerId ? 'ok' : 'empty',
    data: effectiveCustomerId ? normalizeMailinblackCustomer({
      id: effectiveCustomerId,
      clientId: session.clientId || effectiveCustomerId,
      name: credentials.label || 'Mailinblack',
      domain: domains.items?.[0]?.name || null,
      usersCount: users.total || users.items?.length || 0,
      domainsCount: domains.total || domains.items?.length || 0,
      expiration: pickSoonestExpirationIso((domains.items || []).map(item => item?.expiration)),
      status: 'active'
    }, session) : null,
    error: customerRes.error
  };
  const customerRaw = customer.data?.raw && typeof customer.data.raw === 'object' ? customer.data.raw : {};
  const rawLicenseItems = collectRawLicenseItems(customerRaw).map(item => normalizeLicense(item)).filter(Boolean);
  const licenseItems = licenses.items?.length ? licenses.items : rawLicenseItems;
  const licenseSummary = {
    total: pickNumericCount(licenses.summary?.total, customer.data?.licenseCount, extractLicenseSummaryFromPayload(customerRaw).total, summarizeLicenseItems(licenseItems).total),
    used: pickNumericCount(licenses.summary?.used, extractLicenseSummaryFromPayload(customerRaw).used, summarizeLicenseItems(licenseItems).used, countProtectedUsers(users.items))
  };
  const licensesSection = {
    ...licenses,
    items: licenseItems,
    total: licenseItems.length || licenseSummary.total || 0,
    summary: licenseSummary,
    status: licenseItems.length || licenseSummary.total != null || licenseSummary.used != null ? 'ok' : licenses.status
  };
  return {
    fetchedAt: new Date().toISOString(),
    session: {
      clientId: session.clientId || credentials?.authClientId || null,
      userId: session.userId
    },
    customerId: effectiveCustomerId,
    sections: {
      customer,
      senders,
      spools,
      domains,
      users,
      emails,
      servers,
      licenses: licensesSection
    }
  };
}
export function formatMailinblackSyncPayload(customer, mappingMode, mailinblackTenantId, extra = {}) {
  if (!customer) return null;
  const dashboard = extra.dashboard || null;
  const domainsSection = dashboard?.sections?.domains;
  const usersSection = dashboard?.sections?.users;
  const licensesSection = dashboard?.sections?.licenses;
  const raw = customer.raw && typeof customer.raw === 'object' ? customer.raw : {};
  const licenseItems = licensesSection?.items?.length ? licensesSection.items : collectRawLicenseItems(raw);
  const domainExpirations = Array.isArray(domainsSection?.items) ? domainsSection.items.flatMap(item => [item?.expiration, item?.expirationDate, item?.license?.expirationDate, item?.license?.expiration]) : [];
  const licenseExpirations = licenseItems.flatMap(item => [item?.expirationDate, item?.expiration, item?.expiryDate, item?.renewalDate, item?.endDate, item?.validUntil]);
  const expiration = pickSoonestExpirationIso([customer.expiration, raw.expirationDate, raw.expiration, raw.expiryDate, raw.renewalDate, raw.licenseExpiration, raw.licenceExpiration, raw.endDate, raw.validUntil, ...licenseExpirations, ...domainExpirations]) || '';
  const licencesTotales = pickNumericCount(licensesSection?.summary?.total, customer.licenseCount, extractLicenseSummaryFromPayload(raw).total, summarizeLicenseItems(licenseItems.map(item => item.total != null || item.used != null ? item : normalizeLicense(item)).filter(Boolean)).total, Array.isArray(raw.licenses) ? raw.licenses.length : raw.licenses, raw.licenseCount, raw.nbLicences, raw.nbLicense, raw.totalLicenses, raw.licenceCount, raw.numberOfLicenses);
  const licencesUtilisees = pickNumericCount(licensesSection?.summary?.used, extractLicenseSummaryFromPayload(raw).used, countProtectedUsers(usersSection?.items));
  return {
    solution: 'Mailinblack Protect',
    providerId: 'mailinblack',
    logiciel: 'Mailinblack Protect',
    nom: customer.name,
    name: customer.name,
    mappingMode,
    mailinblackTenantId: mappingMode === 'dedicated' ? mailinblackTenantId : null,
    customerId: customer.id,
    customerName: customer.name,
    domain: customer.domain || '',
    utilisateursProteges: usersSection?.total ?? customer.usersCount ?? (usersSection?.items?.length != null ? usersSection.items.length : 0),
    domainesSurveilles: domainsSection?.total ?? customer.domainsCount ?? (domainsSection?.items?.length != null ? domainsSection.items.length : 0),
    licencesTotales: licencesTotales != null && licencesTotales !== '' ? licencesTotales : null,
    licencesUtilisees: licencesUtilisees != null && licencesUtilisees !== '' ? licencesUtilisees : null,
    expiration,
    syncData: {
      customer,
      dashboard,
      status: customer.status || null,
      lastSync: new Date().toISOString()
    }
  };
}
