import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../database/db.js";
import { ensureKnowledgeArticlesSchema } from "./ensureKnowledgeArticlesSchema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const KNOWLEDGE_EMOJIS_DIR = path.join(__dirname, "..", "uploads", "knowledge-emojis");

const NAME_RE = /^[a-z0-9][a-z0-9_-]{1,31}$/;

export function ensureKnowledgeEmojisDir() {
  if (!fs.existsSync(KNOWLEDGE_EMOJIS_DIR)) {
    fs.mkdirSync(KNOWLEDGE_EMOJIS_DIR, { recursive: true });
  }
}

export function normalizeEmojiName(raw) {
  let name = String(raw || "").trim().toLowerCase();
  if (name.startsWith(":") && name.endsWith(":") && name.length > 2) {
    name = name.slice(1, -1);
  }
  name = name.replace(/\s+/g, "_").replace(/[^a-z0-9_-]/g, "");
  return name;
}

export function isValidEmojiName(name) {
  return NAME_RE.test(String(name || ""));
}

/** Icone dossier/article : shortcode custom OU emoji Unicode. */
export function normalizeKnowledgeIcon(raw) {
  if (raw == null || raw === "") return null;
  let value = String(raw).trim();
  if (value.startsWith(":") && value.endsWith(":") && value.length > 2) {
    value = value.slice(1, -1).trim();
  }
  if (!value) return null;
  let isUnicode = false;
  try {
    isUnicode = /\p{Extended_Pictographic}/u.test(value);
  } catch {
    isUnicode = /[^\u0000-\u00ff]/.test(value);
  }
  if (isUnicode) return value.slice(0, 64);
  const shortcode = normalizeEmojiName(value);
  return shortcode && isValidEmojiName(shortcode) ? shortcode : null;
}

function mapEmojiRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    shortcode: `:${row.name}:`,
    fileName: row.file_name,
    mimeType: row.mime_type,
    url: `/api/knowledge-emojis/${row.id}/image`,
    createdBy: row.created_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listKnowledgeEmojis() {
  await ensureKnowledgeArticlesSchema();
  const { rows } = await pool.query(
    `SELECT id, name, file_name, stored_name, mime_type, created_by, created_at, updated_at
       FROM v_b_knowledge_emojis
      ORDER BY lower(name) ASC`
  );
  return rows.map(mapEmojiRow);
}

export async function getKnowledgeEmoji(id) {
  await ensureKnowledgeArticlesSchema();
  const { rows } = await pool.query(
    `SELECT id, name, file_name, stored_name, mime_type, created_by, created_at, updated_at
       FROM v_b_knowledge_emojis
      WHERE id = $1`,
    [id]
  );
  return mapEmojiRow(rows[0]);
}

export async function getKnowledgeEmojiByName(name) {
  await ensureKnowledgeArticlesSchema();
  const normalized = normalizeEmojiName(name);
  if (!isValidEmojiName(normalized)) return null;
  const { rows } = await pool.query(
    `SELECT id, name, file_name, stored_name, mime_type, created_by, created_at, updated_at
       FROM v_b_knowledge_emojis
      WHERE lower(name) = lower($1)`,
    [normalized]
  );
  return mapEmojiRow(rows[0]);
}

export async function getKnowledgeEmojiFile(id) {
  await ensureKnowledgeArticlesSchema();
  const { rows } = await pool.query(
    `SELECT id, name, file_name, stored_name, mime_type
       FROM v_b_knowledge_emojis
      WHERE id = $1`,
    [id]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    ...mapEmojiRow(row),
    storedName: row.stored_name,
    filePath: path.join(KNOWLEDGE_EMOJIS_DIR, row.stored_name)
  };
}

export async function createKnowledgeEmoji({ name, fileName, storedName, mimeType, createdBy } = {}) {
  await ensureKnowledgeArticlesSchema();
  ensureKnowledgeEmojisDir();
  const normalized = normalizeEmojiName(name);
  if (!isValidEmojiName(normalized)) {
    const err = new Error("Invalid emoji name. Use 2–32 chars: a-z, 0-9, _ or -.");
    err.status = 400;
    throw err;
  }
  if (!storedName) {
    const err = new Error("File required.");
    err.status = 400;
    throw err;
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO v_b_knowledge_emojis (name, file_name, stored_name, mime_type, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, file_name, stored_name, mime_type, created_by, created_at, updated_at`,
      [normalized, fileName || storedName, storedName, mimeType || "image/png", createdBy || null]
    );
    return mapEmojiRow(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      const conflict = new Error("An emoji with this name already exists.");
      conflict.status = 409;
      throw conflict;
    }
    throw err;
  }
}

export async function renameKnowledgeEmoji(id, name) {
  await ensureKnowledgeArticlesSchema();
  const normalized = normalizeEmojiName(name);
  if (!isValidEmojiName(normalized)) {
    const err = new Error("Invalid emoji name. Use 2–32 chars: a-z, 0-9, _ or -.");
    err.status = 400;
    throw err;
  }
  try {
    const { rows } = await pool.query(
      `UPDATE v_b_knowledge_emojis
          SET name = $2, updated_at = NOW()
        WHERE id = $1
      RETURNING id, name, file_name, stored_name, mime_type, created_by, created_at, updated_at`,
      [id, normalized]
    );
    return mapEmojiRow(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      const conflict = new Error("An emoji with this name already exists.");
      conflict.status = 409;
      throw conflict;
    }
    throw err;
  }
}

export async function deleteKnowledgeEmoji(id) {
  await ensureKnowledgeArticlesSchema();
  const file = await getKnowledgeEmojiFile(id);
  if (!file) return false;
  await pool.query(`DELETE FROM v_b_knowledge_emojis WHERE id = $1`, [id]);
  try {
    if (file.storedName && fs.existsSync(file.filePath)) fs.unlinkSync(file.filePath);
  } catch {
    /* ignore fs cleanup errors */
  }
  return true;
}
