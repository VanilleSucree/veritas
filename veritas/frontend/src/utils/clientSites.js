function createSiteId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `site-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
export function createEmptySite(overrides = {}) {
  return {
    id: createSiteId(),
    name: "",
    addressStreet: "",
    addressPostalCode: "",
    addressCity: "",
    addressCountry: "France",
    latitude: null,
    longitude: null,
    notes: "",
    isPrimary: false,
    ...overrides
  };
}
export function normalizeClientSite(site, index = 0) {
  if (site == null) return null;
  if (typeof site === "string") {
    const trimmed = site.trim();
    if (!trimmed) return null;
    return createEmptySite({
      // Stable positional id (must not include the name) so renames keep the same id.
      id: `legacy-${index}`,
      name: trimmed
    });
  }
  if (typeof site !== "object") return null;
  const name = String(site.name || site.label || "").trim();
  const legacyLabel = String(site.site || "").trim();
  const resolvedName = name || legacyLabel;
  if (!resolvedName) {
    return null;
  }
  const explicitId = String(site.id || "").trim();
  return {
    id: explicitId || `legacy-${index}`,
    name: resolvedName,
    addressStreet: String(site.addressStreet || site.street || "").trim(),
    addressPostalCode: String(site.addressPostalCode || site.postalCode || "").trim(),
    addressCity: String(site.addressCity || site.city || "").trim(),
    addressCountry: String(site.addressCountry || site.country || "France").trim() || "France",
    latitude: Number.isFinite(Number(site.latitude)) ? Number(site.latitude) : null,
    longitude: Number.isFinite(Number(site.longitude)) ? Number(site.longitude) : null,
    notes: String(site.notes || "").trim(),
    isPrimary: Boolean(site.isPrimary),
    sortOrder: Number.isFinite(Number(site.sortOrder)) ? Number(site.sortOrder) : index
  };
}
export function sortClientSites(sites) {
  const list = Array.isArray(sites) ? [...sites] : [];
  return list.sort((a, b) => {
    const ao = Number.isFinite(Number(a.sortOrder)) ? Number(a.sortOrder) : 0;
    const bo = Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : 0;
    return ao - bo;
  });
}
export function assignClientSitesOrder(sites) {
  const list = Array.isArray(sites) ? [...sites] : [];
  return enforceSinglePrimarySite(list.map((site, index) => ({
    ...site,
    sortOrder: index
  })));
}
export function normalizeClientSites(sites) {
  let normalized = [];
  if (!Array.isArray(sites)) {
    if (typeof sites === "string") {
      try {
        normalized = normalizeClientSites(JSON.parse(sites));
      } catch {
        const trimmed = sites.trim();
        normalized = trimmed ? [normalizeClientSite(trimmed, 0)].filter(Boolean) : [];
      }
    }
  } else {
    normalized = sites.map((site, index) => normalizeClientSite(site, index)).filter(Boolean);
  }
  return assignClientSitesOrder(sortClientSites(normalized));
}
export function enforceSinglePrimarySite(sites, preferredPrimaryId = null) {
  const list = Array.isArray(sites) ? sites : [];
  if (list.length === 0) return [];
  let primaryId = preferredPrimaryId || null;
  if (primaryId && !list.some(site => site.id === primaryId)) {
    primaryId = null;
  }
  if (!primaryId) {
    const currentPrimary = list.find(site => site.isPrimary);
    if (currentPrimary) primaryId = currentPrimary.id;
  }
  if (!primaryId) {
    return list.map(site => ({
      ...site,
      isPrimary: false
    }));
  }
  return list.map(site => ({
    ...site,
    isPrimary: site.id === primaryId
  }));
}
export function getSiteLocationValue(site) {
  const normalized = typeof site === "object" ? site : normalizeClientSite(site);
  return normalized?.name?.trim() || "";
}

/**
 * Detect lieu renames (same id, different name) for cascade to peripherals.
 * Mirrors backend detectClientSiteRenames (id-based pass).
 */
export function detectClientSiteRenames(previousSites, nextSites) {
  const prev = normalizeClientSites(previousSites);
  const next = normalizeClientSites(nextSites);
  if (!prev.length || !next.length) return [];

  const nextById = new Map(next.map(site => [site.id, site]));
  const renames = [];
  const seenFrom = new Set();

  for (const oldSite of prev) {
    const updated = nextById.get(oldSite.id);
    if (!updated) continue;
    const from = getSiteLocationValue(oldSite);
    const to = getSiteLocationValue(updated);
    if (!from || !to || from === to || seenFrom.has(from)) continue;
    seenFrom.add(from);
    renames.push({ from, to });
  }

  return renames;
}
export function findClientSiteByLocation(sites, locationName) {
  const needle = String(locationName || "").trim().toLowerCase();
  if (!needle) return null;
  return normalizeClientSites(sites).find(site => {
    const name = getSiteLocationValue(site).toLowerCase();
    const display = getSiteDisplayName(site).toLowerCase();
    return name === needle || display === needle;
  }) || null;
}
export function getSiteDisplayName(site) {
  const normalized = typeof site === "object" ? site : normalizeClientSite(site);
  if (!normalized) return "";
  if (normalized.name) return normalized.name;
  return buildSiteAddress(normalized) || "Lieu sans nom";
}
export function getSiteId(site) {
  const normalized = typeof site === "object" ? site : normalizeClientSite(site);
  return normalized?.id || getSiteDisplayName(site);
}
export function buildSiteAddress(site) {
  const normalized = typeof site === "object" ? site : normalizeClientSite(site);
  if (!normalized) return "";
  const street = normalized.addressStreet?.trim();
  const postal = normalized.addressPostalCode?.trim();
  const city = normalized.addressCity?.trim();
  const country = normalized.addressCountry?.trim();
  const cityPart = [postal, city].filter(Boolean).join(" ");
  const local = [street, cityPart].filter(Boolean).join(", ");
  if (local && country && country !== "France") {
    return `${local}, ${country}`;
  }
  return local;
}
export function siteMatchesQuery(site, query) {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return true;
  const haystack = [getSiteDisplayName(site), site?.addressStreet, site?.addressPostalCode, site?.addressCity, site?.addressCountry, site?.notes, buildSiteAddress(site)].map(part => String(part || "").toLowerCase());
  return haystack.some(part => part.includes(needle));
}
export function buildSiteGeocodeQuery(site) {
  const normalized = typeof site === "object" ? site : normalizeClientSite(site);
  if (!normalized) return "";
  const parts = [normalized.addressStreet, normalized.addressPostalCode, normalized.addressCity, normalized.addressCountry].map(part => part != null ? String(part).trim() : "").filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  return normalized.name || "";
}
export function serializeSitesForCompare(sites) {
  return JSON.stringify(normalizeClientSites(sites).map(site => ({
    id: site.id,
    name: site.name,
    addressStreet: site.addressStreet,
    addressPostalCode: site.addressPostalCode,
    addressCity: site.addressCity,
    addressCountry: site.addressCountry,
    latitude: site.latitude,
    longitude: site.longitude,
    notes: site.notes,
    isPrimary: site.isPrimary,
    sortOrder: site.sortOrder
  })));
}
export function formatSitesForLog(sites) {
  return normalizeClientSites(sites).map(site => {
    const address = buildSiteAddress(site);
    if (site.name && address) return `${site.name} (${address})`;
    return site.name || address;
  }).join(", ");
}
export async function geocodeSiteAddress(site) {
  const query = buildSiteGeocodeQuery(site);
  if (!query) {
    throw new Error("Address is insufficient for geolocation.");
  }
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "0");
  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "Accept-Language": "fr"
    }
  });
  if (!response.ok) {
    throw new Error("Unable to reach the mapping service.");
  }
  const results = await response.json();
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error("No location found for this address.");
  }
  const hit = results[0];
  return {
    latitude: Number(hit.lat),
    longitude: Number(hit.lon)
  };
}
export function siteHasCoordinates(site) {
  return Number.isFinite(Number(site?.latitude)) && Number.isFinite(Number(site?.longitude));
}
export function canGeocodeSite(site, {
  onlyMissing = false
} = {}) {
  if (!buildSiteGeocodeQuery(site)) return false;
  if (onlyMissing && siteHasCoordinates(site)) return false;
  return true;
}
export function buildStaticMapUrl(latitude, longitude, {
  width = 280,
  height = 160,
  zoom = 14
} = {}) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const params = new URLSearchParams({
    center: `${latitude},${longitude}`,
    zoom: String(zoom),
    size: `${width}x${height}`,
    markers: `${latitude},${longitude},red-pushpin`
  });
  return `https://staticmap.openstreetmap.de/staticmap.php?${params.toString()}`;
}
export function buildOsmEmbedUrl(latitude, longitude, {
  zoom = 15
} = {}) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const latDelta = 0.0065 / (zoom / 15);
  const lonDelta = 0.0105 / (zoom / 15);
  const bbox = [longitude - lonDelta, latitude - latDelta, longitude + lonDelta, latitude + latDelta].join(",");
  const params = new URLSearchParams({
    bbox,
    layer: "mapnik",
    marker: `${latitude},${longitude}`
  });
  return `https://www.openstreetmap.org/export/embed.html?${params.toString()}`;
}
export function buildOpenStreetMapUrl(latitude, longitude, zoom = 16) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=${zoom}/${latitude}/${longitude}`;
}
