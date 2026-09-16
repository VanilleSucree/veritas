import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../database/db.js";
import { adaptMigrationSql } from "./migrationSql.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PATCHES_DIR = path.join(__dirname, "..", "schema", "patches");
async function tableExists(client, name) {
  const {
    rows
  } = await client.query(`SELECT to_regclass($1) AS reg`, [`public.${name}`]);
  return Boolean(rows[0]?.reg);
}
async function columnExists(client, table, column) {
  const {
    rows
  } = await client.query(`SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
     LIMIT 1`, [table, column]);
  return rows.length > 0;
}
async function columnHasDataType(client, table, column, dataType) {
  const {
    rows
  } = await client.query(`SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2 AND data_type = $3
     LIMIT 1`, [table, column, dataType]);
  return rows.length > 0;
}
async function indexExists(client, table, indexName) {
  const {
    rows
  } = await client.query(`SELECT 1
     FROM pg_indexes
     WHERE schemaname = 'public' AND tablename = $1 AND indexname = $2
     LIMIT 1`, [table, indexName]);
  return rows.length > 0;
}
export async function buildIncrementalAvrilMigrationPlan(client = pool) {
  const plan = [];
  if (!(await tableExists(client, "v_b_client_tags"))) {
    plan.push("20260616_client_tags_notes.sql", "20260616_client_tags_notes_grants.sql");
  }
  if (!(await tableExists(client, "v_b_contact_tag_links"))) {
    plan.push("20260618_contact_tag_links_fix.sql");
  }
  if (!(await tableExists(client, "v_b_rmm_enrollment_tokens"))) {
    plan.push("20260617_rmm_ordinateurs.sql", "20260617_rmm_ordinateurs_grants.sql", "20260617_rmm_ordinateurs_unique_fix.sql");
  } else if (!(await columnExists(client, "v_b_rmm_enrollment_tokens", "token_encrypted"))) {
    plan.push("20260618_rmm_token_encrypted.sql");
  }
  if (!(await tableExists(client, "v_b_clients_m_alimentation"))) {
    plan.push("20260618_alimentation_routeur_toip.sql");
  }
  if (!(await columnExists(client, "v_b_clients", "client_number"))) {
    plan.push("20260619_clients_client_number.sql");
  }
  if ((await tableExists(client, "v_b_clients")) && !(await columnExists(client, "v_b_clients", "statut"))) {
    plan.push("20260829_clients_statut.sql");
  }
  if (!(await tableExists(client, "v_b_equipment_family_extension_fields"))) {
    plan.push("20260830_system_family_extension_fields.sql");
  }
  if (!(await tableExists(client, "v_b_equipment_family_layout"))) {
    plan.push("20260830_system_family_layout.sql");
  }
  if (
    !(await tableExists(client, "v_b_equipment_map_style"))
    || ((await tableExists(client, "v_b_equipment_family_definitions")) && (await columnExists(client, "v_b_equipment_family_definitions", "tile_shape")))
    || ((await tableExists(client, "v_b_equipment_family_layout")) && (await columnExists(client, "v_b_equipment_family_layout", "tile_shape")))
  ) {
    plan.push("20260830_map_tile_shape_preset.sql");
  }
  if (await tableExists(client, "v_b_clients_m_custom_equipment")) {
    const {
      rows: customInactiveFlagRows
    } = await client.query(`SELECT 1
       FROM v_b_clients_m_custom_equipment
       WHERE is_active IS NOT FALSE
         AND (
           (jsonb_typeof(data->'actif') = 'boolean' AND data->>'actif' = 'false')
           OR lower(trim(COALESCE(data->>'actif', ''))) IN ('false', '0', 'no', 'non', 'off', 'inactif', 'inactive', 'disabled')
           OR (jsonb_typeof(data->'is_active') = 'boolean' AND data->>'is_active' = 'false')
           OR lower(trim(COALESCE(data->>'is_active', ''))) IN ('false', '0', 'no', 'non', 'off', 'inactif', 'inactive', 'disabled')
           OR (jsonb_typeof(data->'active') = 'boolean' AND data->>'active' = 'false')
           OR lower(trim(COALESCE(data->>'active', ''))) IN ('false', '0', 'no', 'non', 'off', 'inactif', 'inactive', 'disabled')
           OR (jsonb_typeof(data->'isActive') = 'boolean' AND data->>'isActive' = 'false')
           OR lower(trim(COALESCE(data->>'isActive', ''))) IN ('false', '0', 'no', 'non', 'off', 'inactif', 'inactive', 'disabled')
         )
       LIMIT 1`);
    if (customInactiveFlagRows.length) {
      plan.push("20260829_custom_equipment_actif_backfill.sql");
    }
  }
  const hardwareActifTables = [
    "v_b_clients_m_internet",
    "v_b_clients_m_servers",
    "v_b_clients_m_stockage",
    "v_b_clients_m_firewall",
    "v_b_clients_m_switch",
    "v_b_clients_m_wifi",
    "v_b_clients_m_alimentation",
    "v_b_clients_m_routeur",
    "v_b_clients_m_toip",
    "v_b_clients_m_ordinateurs"
  ];
  const hardwareInactivePredicate = `is_active IS NOT FALSE
    AND (
      (jsonb_typeof(data->'actif') = 'boolean' AND data->>'actif' = 'false')
      OR lower(trim(COALESCE(data->>'actif', ''))) IN ('false', '0', 'no', 'non', 'off', 'inactif', 'inactive', 'disabled')
      OR (jsonb_typeof(data->'is_active') = 'boolean' AND data->>'is_active' = 'false')
      OR lower(trim(COALESCE(data->>'is_active', ''))) IN ('false', '0', 'no', 'non', 'off', 'inactif', 'inactive', 'disabled')
      OR (jsonb_typeof(data->'active') = 'boolean' AND data->>'active' = 'false')
      OR lower(trim(COALESCE(data->>'active', ''))) IN ('false', '0', 'no', 'non', 'off', 'inactif', 'inactive', 'disabled')
      OR (jsonb_typeof(data->'isActive') = 'boolean' AND data->>'isActive' = 'false')
      OR lower(trim(COALESCE(data->>'isActive', ''))) IN ('false', '0', 'no', 'non', 'off', 'inactif', 'inactive', 'disabled')
    )`;
  for (const table of hardwareActifTables) {
    if (!(await tableExists(client, table))) continue;
    const { rows: hardwareInactiveFlagRows } = await client.query(
      `SELECT 1 FROM ${table} WHERE ${hardwareInactivePredicate} LIMIT 1`
    );
    if (hardwareInactiveFlagRows.length) {
      plan.push("20260901_hardware_equipment_actif_backfill.sql");
      break;
    }
  }
  if (!(await tableExists(client, "v_b_client_support_credits"))) {
    plan.push("20260620_client_support_credits.sql", "20260620_client_support_credits_grants.sql");
  }
  if (!(await tableExists(client, "v_b_client_support_credit_packs"))) {
    plan.push("20260620_client_support_credit_packs.sql");
  }
  if (!(await tableExists(client, "v_b_clients_m_licences"))) {
    plan.push("20260621_client_licences_abonnements.sql");
  }
  if (!(await tableExists(client, "v_b_sales_form_definitions"))) {
    plan.push("20260618_sales_form_definitions.sql");
  }
  if (!(await tableExists(client, "v_b_support_form_definitions"))) {
    plan.push("20260907_support_form_definitions.sql");
  }
  if (!(await tableExists(client, "v_b_sales_ticket_categories")) || !(await tableExists(client, "v_b_sales_ticket_category_sections"))) {
    plan.push("20260729_sales_ticket_categories.sql");
  }
  const hasSalesForms = await tableExists(client, "v_b_sales_form_definitions");
  const willCreateSalesForms = plan.includes("20260618_sales_form_definitions.sql");
  if (hasSalesForms || willCreateSalesForms) {
    if (!hasSalesForms || !(await columnExists(client, "v_b_sales_form_definitions", "visibility"))) {
      plan.push("20260626_sales_form_visibility.sql");
    }
    if (!hasSalesForms || !(await columnExists(client, "v_b_sales_form_definitions", "ticket_targets"))) {
      plan.push("20260627_sales_form_ticket_targets.sql");
    }
    if (!hasSalesForms || !(await columnExists(client, "v_b_sales_form_fields", "visibility_rules"))) {
      plan.push("20260628_sales_form_field_visibility.sql");
    }
  }
  if (!(await tableExists(client, "v_b_equipment_family_definitions"))) {
    plan.push("20260629_equipment_family_definitions.sql");
  }
  if (await tableExists(client, "v_b_equipment_family_fields")) {
    const {
      rows: fieldTypeConstraint
    } = await client.query(`SELECT pg_get_constraintdef(oid) AS def
         FROM pg_constraint
        WHERE conname = 'v_b_equipment_family_fields_field_type_check'
        LIMIT 1`);
    if (!fieldTypeConstraint[0] || !String(fieldTypeConstraint[0].def || "").includes("'section'")) {
      plan.push("20260909_equipment_family_field_section.sql");
    }
  }
  if (!(await tableExists(client, "v_b_equipment_monitoring_alerts"))) {
    plan.push("20260630_equipment_monitoring_alerts.sql");
  } else if (!(await indexExists(client, "v_b_equipment_monitoring_alerts", "v_b_equipment_monitoring_alerts_client_id_equipment_id_equipment_family_uniq")) && !(await indexExists(client, "v_b_equipment_monitoring_alerts", "uq_equipment_monitoring_alerts_item"))) {
    plan.push("20260719_equipment_monitoring_alerts_unique.sql");
  }
  if ((await tableExists(client, "v_b_tech_news_feeds")) && !(await indexExists(client, "v_b_tech_news_feeds", "v_b_tech_news_feeds_locale_feed_key_uniq"))) {
    plan.push("20260719_tech_news_feeds_unique.sql");
  }
  if ((await tableExists(client, "v_b_clients")) && !(await columnExists(client, "v_b_clients", "monitoring_alerts_suspension_type"))) {
    plan.push("20260719_client_monitoring_alerts_suspension.sql");
  }
  if (!(await tableExists(client, "v_b_ai_usage"))) {
    plan.push("20260719_ai_usage.sql");
  }
  if ((await tableExists(client, "v_b_tickets")) && !(await columnExists(client, "v_b_tickets", "ai_runbook"))) {
    plan.push("20260719_ticket_ai_runbook.sql");
  }
  if (!(await tableExists(client, "v_b_rmm_client_settings"))) {
    plan.push("20260701_rmm_client_settings.sql");
  }
  if (await tableExists(client, "v_b_contacts")) {
    if (!(await columnExists(client, "v_b_contacts", "sexe"))) {
      plan.push("20260701_contact_sexe.sql");
    }
    if (!(await columnExists(client, "v_b_contacts", "communications"))) {
      plan.push("20260702_contact_communications.sql");
    }
  }
  if ((await tableExists(client, "v_b_equipment_monitoring_alerts")) && !(await columnExists(client, "v_b_equipment_monitoring_alerts", "alerts_enabled"))) {
    plan.push("20260702_equipment_monitoring_alerts_enabled.sql");
  }
  if ((await tableExists(client, "v_b_tickets")) && !(await columnExists(client, "v_b_tickets", "equipment_info"))) {
    plan.push("20260622_ticket_equipment_info.sql");
  }
  if ((await tableExists(client, "v_b_tickets")) && !(await columnExists(client, "v_b_tickets", "is_major_incident"))) {
    plan.push("20260621_ticket_major_incident_contact_slots.sql");
  }
  if (!(await tableExists(client, "v_b_whatsapp_conversations"))) {
    plan.push("20260703_whatsapp_integration.sql");
  }
  if (!(await tableExists(client, "v_b_ticket_email_messages"))) {
    plan.push("20260723_ticket_email_thread.sql");
  } else if (!(await indexExists(client, "v_b_ticket_email_messages", "uq_ticket_email_messages_message_id"))) {
    plan.push("20260809_ticket_email_messages_unique.sql");
  }
  if ((await tableExists(client, "v_b_ticket_email_messages"))) {
    const {
      rows: ticketNullable
    } = await client.query(`SELECT is_nullable
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'v_b_ticket_email_messages'
          AND column_name = 'ticket_id'
        LIMIT 1`);
    if (String(ticketNullable[0]?.is_nullable || "").toUpperCase() !== "YES") {
      plan.push("20260809_ticket_email_messages_nullable_ticket.sql");
    }
  }
  if (!(await tableExists(client, "v_b_ticket_mail_collect_settings_config"))) {
    plan.push("20260724_mail_collect_settings.sql");
  }
  if (!(await tableExists(client, "v_b_equipment_files"))) {
    plan.push("20260624_equipment_files.sql");
  }
  if ((await tableExists(client, "v_b_equipment_files")) && (await columnHasDataType(client, "v_b_equipment_files", "uploaded_by", "bigint"))) {
    plan.push("20260725_files_uploaded_by_uuid.sql");
  } else if ((await tableExists(client, "v_b_client_files")) && (await columnHasDataType(client, "v_b_client_files", "uploaded_by", "bigint"))) {
    plan.push("20260725_files_uploaded_by_uuid.sql");
  }
  if (!(await tableExists(client, "v_b_supervision_alert_rules_config"))) {
    plan.push("20260623_supervision_alert_rules_config.sql");
  }
  if (!(await tableExists(client, "v_b_equipment_tag_links"))) {
    plan.push("20260726_equipment_tag_links.sql", "20260726_equipment_tag_links_grants.sql");
  }
  if (!(await tableExists(client, "v_b_equipment_notes"))) {
    plan.push("20260823_equipment_notes.sql", "20260823_equipment_notes_grants.sql");
  }
  if (!(await tableExists(client, "v_b_rmm_metric_daily"))) {
    plan.push("20260727_rmm_metric_daily.sql", "20260727_rmm_metric_daily_grants.sql");
  }
  if ((await tableExists(client, "v_b_client_files")) && !(await columnExists(client, "v_b_client_files", "visible_to_client"))) {
    plan.push("20260627_client_files_vault_visibility.sql");
  }
  if (!(await tableExists(client, "v_b_client_vault_secrets"))) {
    plan.push("20260728_client_vault_secrets.sql", "20260728_client_vault_secrets_grants.sql");
  }
  if ((await tableExists(client, "v_b_users_profiles")) && !(await columnExists(client, "v_b_users_profiles", "parent_profile"))) {
    plan.push("20260618_profiles_inheritance_ticket_view_profiles.sql");
  }
  if ((await tableExists(client, "v_b_client_vault_secrets")) && !(await columnExists(client, "v_b_client_vault_secrets", "contact_id"))) {
    plan.push("20260729_client_vault_secrets_contact_id.sql");
  }
  if ((await tableExists(client, "v_b_users_profiles")) && !(await columnExists(client, "v_b_users_profiles", "documents_enabled"))) {
    plan.push("20260730_profiles_documents_enabled.sql");
  }
  if ((await tableExists(client, "v_b_users_profiles")) && !(await columnExists(client, "v_b_users_profiles", "equipment_inventory_enabled"))) {
    plan.push("20260814_profiles_equipment_inventory_enabled.sql");
  }
  if (!(await tableExists(client, "v_b_knowledge_articles"))) {
    plan.push("20260827_knowledge_articles.sql", "20260827_knowledge_articles_grants.sql");
  } else if ((await tableExists(client, "v_b_users_profiles")) && !(await columnExists(client, "v_b_users_profiles", "knowledge_base_enabled"))) {
    plan.push("20260827_knowledge_articles.sql");
  }
  if ((await tableExists(client, "v_b_knowledge_articles")) && !(await columnExists(client, "v_b_knowledge_articles", "visible_to_all_clients"))) {
    plan.push("20260827_knowledge_articles_all_audience.sql");
  }
  if ((await tableExists(client, "v_b_knowledge_articles")) && !(await tableExists(client, "v_b_knowledge_folders"))) {
    plan.push("20260827_knowledge_folders.sql");
  }
  if ((await tableExists(client, "v_b_knowledge_articles")) && !(await tableExists(client, "v_b_knowledge_categories"))) {
    plan.push("20260827_knowledge_categories.sql");
  }
  if (
    (await tableExists(client, "v_b_knowledge_articles"))
    && (await tableExists(client, "v_b_client_tags"))
    && !(await tableExists(client, "v_b_knowledge_article_client_tags"))
  ) {
    plan.push("20260827_knowledge_visibility_tags.sql");
  }
  if (
    (await tableExists(client, "v_b_knowledge_articles"))
    && !(await tableExists(client, "v_b_knowledge_article_revisions"))
  ) {
    plan.push("20260827_knowledge_article_revisions.sql");
  }
  if (
    (await tableExists(client, "v_b_knowledge_articles"))
    && !(await tableExists(client, "v_b_knowledge_article_ratings"))
  ) {
    plan.push("20260827_knowledge_article_feedback.sql");
  }
  if (
    (await tableExists(client, "v_b_knowledge_article_comments"))
    && !(await columnExists(client, "v_b_knowledge_article_comments", "updated_at"))
  ) {
    plan.push("20260827_knowledge_article_comment_updated_at.sql");
  }
  if (
    (await tableExists(client, "v_b_knowledge_articles"))
    && !(await tableExists(client, "v_b_knowledge_article_links"))
  ) {
    plan.push("20260827_knowledge_article_extras.sql");
  }
  if (
    (await tableExists(client, "v_b_knowledge_articles"))
    && !(await columnExists(client, "v_b_knowledge_articles", "public_token"))
  ) {
    plan.push("20260828_knowledge_article_public.sql");
  }
  if (await tableExists(client, "v_b_users_profiles")) {
    const {
      rows
    } = await client.query(`SELECT 1 FROM v_b_users_profiles WHERE name = 'Super Admin' LIMIT 1`);
    if (rows.length === 0) {
      plan.push("20260721_super_admin_profile.sql");
    }
  }
  if (!(await tableExists(client, "v_b_ticket_satisfaction"))) {
    plan.push("20260627_ticket_satisfaction.sql");
  }
  if (!(await tableExists(client, "v_b_ticket_resolution_validations"))) {
    plan.push("20260627_ticket_resolution_validation.sql");
  } else if (
    !(await columnExists(client, "v_b_ticket_resolution_validations", "intervention_type"))
    || !(await columnExists(client, "v_b_ticket_resolution_validations", "action_type"))
  ) {
    plan.push("20260709_ticket_solution_catalog.sql");
  }
  if (
    (await tableExists(client, "v_b_ticket_resolution_validations"))
    && !(await indexExists(client, "v_b_ticket_resolution_validations", "v_b_ticket_resolution_validations_ticket_id_key"))
  ) {
    // Unique ticket_id is required by ON CONFLICT upserts; some installs missed it.
    const {
      rows: uniqueRows
    } = await client.query(`SELECT 1
         FROM pg_constraint c
         JOIN pg_class t ON t.oid = c.conrelid
         JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'v_b_ticket_resolution_validations'
          AND c.contype IN ('u', 'p')
          AND pg_get_constraintdef(c.oid) ILIKE '%(ticket_id)%'
        LIMIT 1`);
    if (uniqueRows.length === 0) {
      plan.push("20260909_ticket_resolution_validation_ticket_id_unique.sql");
    }
  }
  if ((await tableExists(client, "v_b_ticket_satisfaction")) && !(await columnExists(client, "v_b_ticket_satisfaction", "ratings"))) {
    plan.push("20260627_ticket_satisfaction_criteria.sql");
  }
  if ((await tableExists(client, "v_b_ticket_tags")) && !(await indexExists(client, "v_b_ticket_tags", "idx_v_b_ticket_tags_label_unique"))) {
    plan.push("20260707_ticket_tags_label_unique.sql");
  }
  if ((await tableExists(client, "v_b_client_tags")) && !(await indexExists(client, "v_b_client_tags", "v_b_client_tags_label_uniq")) && !(await indexExists(client, "v_b_client_tags", "idx_v_b_client_tags_label_unique"))) {
    plan.push("20260709_client_tags_label_unique.sql");
  }
  if ((await tableExists(client, "v_b_users_settings")) && !(await indexExists(client, "v_b_users_settings", "idx_v_b_users_settings_user_key"))) {
    plan.push("20260705_users_settings_unique.sql");
  }
  if ((await tableExists(client, "v_b_users")) && !(await columnExists(client, "v_b_users", "password_pending"))) {
    plan.push("20260710_users_password_pending.sql");
  }
  if ((await tableExists(client, "v_b_events")) && !(await columnExists(client, "v_b_events", "ticket_id"))) {
    plan.push("20260708_events_ticket_reminder.sql");
  }
  if ((await tableExists(client, "v_b_clients_c_campaign")) && !(await columnExists(client, "v_b_clients_c_campaign", "azure_credential_id"))) {
    plan.push("20260719_campaign_tenant_link.sql");
  }
  if (!(await tableExists(client, "v_b_ticket_validation_requests"))) {
    plan.push("20260801_ticket_validation_requests.sql");
  }
  if (!(await tableExists(client, "v_b_kpi_report_schedules"))) {
    plan.push("20260817_kpi_report_schedules.sql");
  }
  if (!(await tableExists(client, "v_b_ai_briefings"))) {
    plan.push("20260831_ai_briefings.sql");
  }
  if ((await tableExists(client, "v_b_rmm_agents")) && !(await columnExists(client, "v_b_rmm_agents", "enrollment_token_id"))) {
    plan.push("20260802_rmm_token_settings.sql");
  } else if (!(await tableExists(client, "v_b_rmm_token_settings"))) {
    plan.push("20260802_rmm_token_settings.sql");
  }
  if ((await tableExists(client, "v_b_rmm_agents")) && (await columnExists(client, "v_b_rmm_agents", "enrollment_token_id")) && (await tableExists(client, "v_b_rmm_enrollment_tokens"))) {
    const {
      rows: orphanAgents
    } = await client.query(`SELECT 1
         FROM v_b_rmm_agents a
        WHERE a.enrollment_token_id IS NULL
          AND a.status = 'active'
          AND (
            SELECT COUNT(*)::int
              FROM v_b_rmm_enrollment_tokens t
             WHERE t.client_id = a.client_id
               AND t.revoked_at IS NULL
          ) = 1
        LIMIT 1`);
    if (orphanAgents.length > 0) {
      plan.push("20260803_rmm_agents_backfill_enrollment_token.sql");
    }
  }
  if (
    (await tableExists(client, "v_b_clients_m_save")) &&
    (!(await columnExists(client, "v_b_clients_m_save", "hycu_job_uuid")) ||
      !(await columnExists(client, "v_b_clients_m_save", "hycu_job_name")))
  ) {
    plan.push("20260908_hycu_save_job_mapping.sql");
  }
  if (
    (await tableExists(client, "v_b_ticket_attachments")) &&
    !(await columnExists(client, "v_b_ticket_attachments", "task_id"))
  ) {
    plan.push("20260916_ticket_attachment_task_id.sql");
  }
  if (!(await tableExists(client, "v_b_contact_site_links"))) {
    plan.push("20260916_contact_site_links.sql");
  }
  return [...new Set(plan)];
}
export const INCREMENTAL_TABLE_CHECKS = ["v_b_client_tags", "v_b_client_tag_links", "v_b_contact_tag_links", "v_b_contact_site_links", "v_b_rmm_enrollment_tokens", "v_b_rmm_agents", "v_b_clients_m_ordinateurs", "v_b_clients_m_alimentation", "v_b_clients_m_routeur", "v_b_clients_m_toip", "v_b_client_support_credits", "v_b_client_support_credit_ledger", "v_b_client_support_credit_packs", "v_b_clients_m_licences", "v_b_sales_form_definitions", "v_b_sales_form_fields", "v_b_support_form_definitions", "v_b_support_form_fields", "v_b_sales_ticket_categories", "v_b_sales_ticket_category_sections", "v_b_equipment_family_definitions", "v_b_equipment_family_layout", "v_b_equipment_map_style", "v_b_equipment_monitoring_alerts", "v_b_supervision_alert_rules_config", "v_b_equipment_files", "v_b_equipment_tag_links", "v_b_equipment_notes", "v_b_rmm_client_settings", "v_b_rmm_token_settings", "v_b_rmm_metric_daily", "v_b_teams", "v_b_ticket_views", "v_b_user_notifications", "v_b_ticket_validation_requests", "v_b_kpi_report_schedules", "v_b_ai_briefings"];
export async function verifyIncrementalTables(client = pool) {
  const missing = [];
  for (const table of INCREMENTAL_TABLE_CHECKS) {
    if (!(await tableExists(client, table))) missing.push(table);
  }
  return missing;
}
async function runMigrationFile(client, file, dbUser) {
  const filePath = path.join(PATCHES_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`[incremental] File not found: ${file}`);
    return false;
  }
  const sql = adaptMigrationSql(fs.readFileSync(filePath, "utf8"), dbUser);
  await client.query(sql);
  return true;
}
export async function runIncrementalAvrilMigrations() {
  const client = await pool.connect();
  try {
    await client.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
    const userResult = await client.query("SELECT current_user");
    const dbUser = userResult.rows[0]?.current_user || "postgres";
    const plan = await buildIncrementalAvrilMigrationPlan(client);
    if (plan.length === 0) {
      return {
        executed: [],
        missing: await verifyIncrementalTables(client)
      };
    }
    const executed = [];
    for (const file of plan) {
      if (await runMigrationFile(client, file, dbUser)) {
        executed.push(file);
      }
    }
    const missing = await verifyIncrementalTables(client);
    if (missing.length > 0) {
      console.warn("[incremental] Tables still missing:", missing.join(", "));
    }
    return {
      executed,
      missing
    };
  } catch (err) {
    console.error("[incremental] Migration failed:", err.message);
    throw err;
  } finally {
    client.release();
  }
}
