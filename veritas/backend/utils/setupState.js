import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../database/db.js";
import { REFERENCE_SCHEMA_MARKER } from "./schemaFromCsv.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SETUP_COMPLETE_PATH = path.join(__dirname, "..", ".setup-complete");
export function isSetupMarkedComplete() {
  return fs.existsSync(SETUP_COMPLETE_PATH);
}
export function markSetupComplete() {
  fs.writeFileSync(SETUP_COMPLETE_PATH, JSON.stringify({
    completedAt: new Date().toISOString()
  }, null, 2), "utf8");
}
export function clearSetupCompleteMarker() {
  try {
    if (fs.existsSync(SETUP_COMPLETE_PATH)) {
      fs.unlinkSync(SETUP_COMPLETE_PATH);
    }
  } catch {}
}
async function hasAdminMfaEnabled() {
  try {
    const result = await pool.query(`SELECT 1 FROM v_b_users
       WHERE role = 'admin' AND is_active = TRUE AND COALESCE(mfa_enabled, false) = TRUE
       LIMIT 1`);
    return result.rows.length > 0;
  } catch {
    return false;
  }
}
async function isSetupFullyComplete() {
  // Do not require the on-disk marker: Docker rebuilds drop .setup-complete
  // (gitignored / not on a volume) while the DB install remains valid.
  const schema = await hasCoreSchema();
  const adminMfa = schema ? await hasAdminMfaEnabled() : false;
  return schema && adminMfa;
}
function hasRequiredEnv() {
  return Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET && process.env.ENCRYPTION_KEY);
}
async function canQueryDb() {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}
export async function hasCoreSchema() {
  try {
    const result = await pool.query("SELECT to_regclass('public.v_b_users') AS users_table");
    return Boolean(result.rows[0]?.users_table);
  } catch {
    return false;
  }
}
export async function hasReferenceSchemaInstalled() {
  try {
    const result = await pool.query("SELECT 1 FROM v_b_schema_migrations WHERE filename = $1 LIMIT 1", [REFERENCE_SCHEMA_MARKER]);
    return result.rows.length > 0;
  } catch {
    return false;
  }
}
async function hasAdminUser() {
  try {
    const result = await pool.query(`SELECT 1 FROM v_b_users WHERE role = 'admin' AND is_active = TRUE LIMIT 1`);
    return result.rows.length > 0;
  } catch {
    return false;
  }
}
async function getMigrationCount() {
  try {
    const result = await pool.query("SELECT COUNT(*)::int AS count FROM v_b_schema_migrations");
    return result.rows[0]?.count ?? 0;
  } catch {
    return 0;
  }
}
function emptySteps(env = false) {
  return {
    env,
    database: false,
    schema: false,
    admin: false,
    mfa: false
  };
}
export async function getSetupStatus() {
  const envOk = hasRequiredEnv();
  const marker = isSetupMarkedComplete();
  const databaseReachable = await canQueryDb();

  // DB down: never force the install wizard (and never clear the marker).
  // - Already configured env / prior install → explicit outage status
  // - Brand-new box without secrets/DATABASE_URL → wizard to configure
  if (!databaseReachable) {
    if (marker || envOk) {
      return {
        needsSetup: false,
        databaseReachable: false,
        unavailableReason: "database",
        steps: emptySteps(envOk),
        migrationsApplied: null
      };
    }
    return {
      needsSetup: true,
      databaseReachable: false,
      unavailableReason: null,
      steps: emptySteps(false),
      migrationsApplied: 0
    };
  }

  if (marker && !(await isSetupFullyComplete())) {
    clearSetupCompleteMarker();
  }
  if (await isSetupFullyComplete()) {
    // Rematerialize marker after container recreate so sync file checks stay truthful.
    if (!isSetupMarkedComplete()) {
      try {
        markSetupComplete();
      } catch {}
    }
    return {
      needsSetup: false,
      databaseReachable: true,
      unavailableReason: null,
      steps: {
        env: true,
        database: true,
        schema: true,
        admin: true,
        mfa: true
      },
      migrationsApplied: null
    };
  }
  const steps = {
    env: envOk,
    database: false,
    schema: false,
    admin: false,
    mfa: false
  };
  let migrationsApplied = 0;
  if (steps.env) {
    steps.database = true;
    steps.schema = await hasReferenceSchemaInstalled();
    migrationsApplied = await getMigrationCount();
    if (steps.schema) {
      steps.admin = await hasAdminUser();
      if (steps.admin) {
        steps.mfa = await hasAdminMfaEnabled();
      }
    }
  }
  const needsSetup = !steps.env || !steps.database || !steps.schema || !steps.admin || !steps.mfa;
  return {
    needsSetup,
    databaseReachable: true,
    unavailableReason: null,
    steps,
    migrationsApplied
  };
}
export async function isInstallationInProgress() {
  const {
    needsSetup
  } = await getSetupStatus();
  return needsSetup;
}
export async function canRunAutoSchemaMigrations() {
  if (await isInstallationInProgress()) return false;
  return hasCoreSchema();
}
