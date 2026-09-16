export function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function collectTagSearchValues(tags) {
  if (!Array.isArray(tags)) return [];
  return tags.flatMap(tag => {
    if (tag == null) return [];
    if (typeof tag === "string" || typeof tag === "number") return [tag];
    return [tag.label, tag.name].filter(Boolean);
  });
}

export function matchesSearchQuery(query, values) {
  const needle = normalizeSearchText(query);
  if (!needle) return true;
  return values.some(value => {
    if (value == null || value === "") return false;
    return normalizeSearchText(value).includes(needle);
  });
}
