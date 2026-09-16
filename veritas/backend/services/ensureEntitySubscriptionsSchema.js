import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../database/db.js";
import { canRunAutoSchemaMigrations } from "../utils/setupState.js";
import { adaptMigrationSql } from "../utils/migrationSql.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const MIGRATION_FILE = "schema/patches/20260911_entity_subscriptions.sql";
let ensured = false;

async function tableExists(client, table) {
  const { rows } = await client.query(`SELECT to_regclass($1) AS reg`, [`public.${table}`]);
  return Boolean(rows[0]?.reg);
}

async function runPatch(client, relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    console.warn("[entity-subscriptions] Migration not found:", relativePath);
    return;
  }
  const userResult = await client.query("SELECT current_user");
  const dbUser = userResult.rows[0]?.current_user || "postgres";
  await client.query(adaptMigrationSql(fs.readFileSync(filePath, "utf8"), dbUser));
}

export async function ensureEntitySubscriptionsSchema() {
  if (ensured) return;
  if (!(await canRunAutoSchemaMigrations())) return;
  const client = await pool.connect();
  try {
    if (!(await tableExists(client, "v_b_entity_subscriptions"))) {
      await runPatch(client, MIGRATION_FILE);
      console.log("[entity-subscriptions] Schema ensured.");
    }
    ensured = true;
  } catch (err) {
    console.error("[entity-subscriptions] Migration failed:", err?.message || err);
  } finally {
    client.release();
  }
}
