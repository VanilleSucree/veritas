import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../database/db.js";
import { canRunAutoSchemaMigrations } from "../utils/setupState.js";
import { adaptMigrationSql } from "../utils/migrationSql.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const TABLE_MIGRATION = "schema/patches/20260827_knowledge_articles.sql";
const GRANTS_MIGRATION = "schema/patches/20260827_knowledge_articles_grants.sql";
const FOLDERS_MIGRATION = "schema/patches/20260827_knowledge_folders.sql";
const CATEGORIES_MIGRATION = "schema/patches/20260827_knowledge_categories.sql";
const VISIBILITY_TAGS_MIGRATION = "schema/patches/20260827_knowledge_visibility_tags.sql";
const REVISIONS_MIGRATION = "schema/patches/20260827_knowledge_article_revisions.sql";
const FEEDBACK_MIGRATION = "schema/patches/20260827_knowledge_article_feedback.sql";
const EXTRAS_MIGRATION = "schema/patches/20260827_knowledge_article_extras.sql";
const PUBLIC_MIGRATION = "schema/patches/20260828_knowledge_article_public.sql";
const EMOJIS_MIGRATION = "schema/patches/20260916_knowledge_emojis.sql";
let ensured = false;

async function tableExists(client, table) {
  const { rows } = await client.query(`SELECT to_regclass($1) AS reg`, [`public.${table}`]);
  return Boolean(rows[0]?.reg);
}

async function runPatch(client, relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    console.warn("[knowledge-articles] Migration not found:", relativePath);
    return;
  }
  const userResult = await client.query("SELECT current_user");
  const dbUser = userResult.rows[0]?.current_user || "postgres";
  await client.query(adaptMigrationSql(fs.readFileSync(filePath, "utf8"), dbUser));
}

export async function ensureKnowledgeArticlesSchema() {
  if (ensured) return;
  if (!(await canRunAutoSchemaMigrations())) return;
  const client = await pool.connect();
  try {
    if (!(await tableExists(client, "v_b_knowledge_articles"))) {
      await runPatch(client, TABLE_MIGRATION);
      await runPatch(client, GRANTS_MIGRATION);
    } else {
      await client.query(`
        ALTER TABLE v_b_knowledge_articles
          ADD COLUMN IF NOT EXISTS visible_to_all_clients BOOLEAN NOT NULL DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS visible_to_all_contacts BOOLEAN NOT NULL DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS updated_by_user_id UUID NULL,
          ADD COLUMN IF NOT EXISTS feedback_ratings_enabled BOOLEAN NOT NULL DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS feedback_comments_enabled BOOLEAN NOT NULL DEFAULT FALSE
      `);
    }
    if (!(await tableExists(client, "v_b_knowledge_folders"))) {
      await runPatch(client, FOLDERS_MIGRATION);
    } else {
      await client.query(`
        ALTER TABLE v_b_knowledge_articles
          ADD COLUMN IF NOT EXISTS folder_id UUID NULL
      `);
    }
    if (!(await tableExists(client, "v_b_knowledge_categories"))) {
      await runPatch(client, CATEGORIES_MIGRATION);
    }
    if (
      (await tableExists(client, "v_b_knowledge_articles"))
      && (await tableExists(client, "v_b_client_tags"))
      && !(await tableExists(client, "v_b_knowledge_article_client_tags"))
    ) {
      await runPatch(client, VISIBILITY_TAGS_MIGRATION);
    }
    if (
      (await tableExists(client, "v_b_knowledge_articles"))
      && !(await tableExists(client, "v_b_knowledge_article_revisions"))
    ) {
      await runPatch(client, REVISIONS_MIGRATION);
    }
    if (
      (await tableExists(client, "v_b_knowledge_articles"))
      && !(await tableExists(client, "v_b_knowledge_article_ratings"))
    ) {
      await runPatch(client, FEEDBACK_MIGRATION);
    }
    if (await tableExists(client, "v_b_knowledge_article_comments")) {
      await client.query(`
        ALTER TABLE v_b_knowledge_article_comments
          ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NULL
      `);
    }
    if (
      (await tableExists(client, "v_b_knowledge_articles"))
      && !(await tableExists(client, "v_b_knowledge_article_links"))
    ) {
      await runPatch(client, EXTRAS_MIGRATION);
    } else if (await tableExists(client, "v_b_knowledge_articles")) {
      await client.query(`
        ALTER TABLE v_b_knowledge_articles
          ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS feedback_comments_company BOOLEAN NOT NULL DEFAULT FALSE
      `);
    }
    if (await tableExists(client, "v_b_knowledge_articles")) {
      await runPatch(client, PUBLIC_MIGRATION);
    }
    if (!(await tableExists(client, "v_b_knowledge_emojis"))) {
      await runPatch(client, EMOJIS_MIGRATION);
    } else {
      await client.query(`
        ALTER TABLE v_b_knowledge_articles
          ADD COLUMN IF NOT EXISTS icon VARCHAR(32) NULL
      `);
      if (await tableExists(client, "v_b_knowledge_folders")) {
        await client.query(`
          ALTER TABLE v_b_knowledge_folders
            ADD COLUMN IF NOT EXISTS icon VARCHAR(32) NULL
        `);
      }
    }
    ensured = true;
  } catch (err) {
    console.error("[knowledge-articles] Automatic migration failed:", err.message);
  } finally {
    client.release();
  }
}
