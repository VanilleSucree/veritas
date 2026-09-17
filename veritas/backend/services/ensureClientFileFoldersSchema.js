import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../database/db.js";
import { canRunAutoSchemaMigrations } from "../utils/setupState.js";
import { adaptMigrationSql } from "../utils/migrationSql.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const MIGRATION = "schema/patches/20260917_client_file_folders.sql";
let ensured = false;

async function tableExists(client, table) {
  const { rows } = await client.query(`SELECT to_regclass($1) AS reg`, [`public.${table}`]);
  return Boolean(rows[0]?.reg);
}

async function columnExists(client, table, column) {
  const { rows } = await client.query(
    `SELECT 1
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
      LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
}

export async function ensureClientFileFoldersSchema() {
  if (ensured) return true;
  if (!(await canRunAutoSchemaMigrations())) return false;
  const client = await pool.connect();
  try {
    const needsFolders = !(await tableExists(client, "v_b_client_file_folders"));
    const needsFolderCol =
      (await tableExists(client, "v_b_client_files"))
      && !(await columnExists(client, "v_b_client_files", "folder_id"));
    if (needsFolders || needsFolderCol) {
      const filePath = path.join(root, MIGRATION);
      if (!fs.existsSync(filePath)) {
        console.warn("[client-file-folders] Migration not found:", MIGRATION);
        return false;
      }
      const userResult = await client.query("SELECT current_user");
      const dbUser = userResult.rows[0]?.current_user || "postgres";
      await client.query(adaptMigrationSql(fs.readFileSync(filePath, "utf8"), dbUser));
    }
    ensured = true;
    return true;
  } catch (err) {
    console.error("[client-file-folders] Automatic migration failed:", err.message);
    return false;
  } finally {
    client.release();
  }
}

export async function hasClientFileFoldersTable() {
  await ensureClientFileFoldersSchema();
  try {
    const { rows } = await pool.query(
      `SELECT to_regclass('public.v_b_client_file_folders') AS reg`
    );
    return Boolean(rows[0]?.reg);
  } catch {
    return false;
  }
}
