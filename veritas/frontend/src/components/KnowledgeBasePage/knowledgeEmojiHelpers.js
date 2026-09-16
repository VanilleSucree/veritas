import { resolveKnowledgeAssetUrl, resolveKnowledgeEmojiUrl } from "../../api/knowledgeBase";

const SHORTCODE_RE = /:([a-z0-9][a-z0-9_-]{1,31}):/gi;

export function normalizeEmojiName(raw) {
  let name = String(raw || "").trim().toLowerCase();
  if (name.startsWith(":") && name.endsWith(":") && name.length > 2) name = name.slice(1, -1);
  return name.replace(/\s+/g, "_").replace(/[^a-z0-9_-]/g, "");
}

export function buildEmojiMap(emojis = []) {
  const map = new Map();
  for (const emoji of emojis) {
    const name = normalizeEmojiName(emoji?.name);
    if (!name) continue;
    map.set(name, {
      ...emoji,
      name,
      src: resolveKnowledgeEmojiUrl(emoji)
    });
  }
  return map;
}

export function emojiImgHtml(emoji, name) {
  const src = resolveKnowledgeEmojiUrl(emoji);
  const safeName = normalizeEmojiName(name || emoji?.name);
  if (!src || !safeName) return `:${safeName || ""}:`;
  return `<img data-emoji="${safeName}" class="kb-emoji" src="${src}" alt=":${safeName}:" draggable="false" />`;
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Expand :name: shortcodes in plain text / titles to HTML img tags. */
export function renderEmojiShortcodes(text, emojiMap) {
  const source = String(text || "");
  if (!source) return "";
  if (!emojiMap?.size) return escapeHtml(source);
  let out = "";
  let last = 0;
  SHORTCODE_RE.lastIndex = 0;
  let match;
  while ((match = SHORTCODE_RE.exec(source))) {
    out += escapeHtml(source.slice(last, match.index));
    const name = match[1].toLowerCase();
    const emoji = emojiMap.get(name);
    out += emoji ? emojiImgHtml(emoji, name) : escapeHtml(match[0]);
    last = match.index + match[0].length;
  }
  out += escapeHtml(source.slice(last));
  return out;
}

/** Expand remaining text shortcodes inside HTML body text nodes. */
export function expandEmojiShortcodesInHtml(html, emojiMap) {
  const source = String(html || "");
  if (!source || !emojiMap?.size || typeof DOMParser === "undefined") {
    return resolveEmojiUrlsInHtml(source);
  }
  const doc = new DOMParser().parseFromString(`<div id="kb-emoji-root">${source}</div>`, "text/html");
  const root = doc.getElementById("kb-emoji-root");
  if (!root) return resolveEmojiUrlsInHtml(source);
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const textNode of nodes) {
    const value = textNode.nodeValue || "";
    if (!value.includes(":")) continue;
    SHORTCODE_RE.lastIndex = 0;
    if (!SHORTCODE_RE.test(value)) continue;
    const wrap = doc.createElement("span");
    wrap.innerHTML = renderEmojiShortcodes(value, emojiMap);
    textNode.parentNode?.replaceChild(wrap, textNode);
    while (wrap.firstChild) wrap.parentNode?.insertBefore(wrap.firstChild, wrap);
    wrap.remove();
  }
  return resolveEmojiUrlsInHtml(root.innerHTML);
}

export function resolveEmojiUrlsInHtml(html) {
  return String(html || "").replace(
    /(<img[^>]*data-emoji=["'][^"']+["'][^>]*src=["'])(\/api\/[^"']+)(["'])/gi,
    (_m, a, path, b) => `${a}${resolveKnowledgeAssetUrl(path)}${b}`
  );
}
