-- Dossiers du coffre-fort documentaire client

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS v_b_client_file_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id BIGINT NOT NULL REFERENCES v_b_clients(id) ON DELETE CASCADE,
  parent_id UUID NULL REFERENCES v_b_client_file_folders(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v_b_client_file_folders_name_chk CHECK (char_length(trim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_v_b_client_file_folders_client
  ON v_b_client_file_folders (client_id, parent_id, sort_order, name)
  WHERE is_deleted = FALSE;

ALTER TABLE v_b_client_files
  ADD COLUMN IF NOT EXISTS folder_id UUID NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'v_b_client_files_folder_id_fkey'
  ) THEN
    ALTER TABLE v_b_client_files
      ADD CONSTRAINT v_b_client_files_folder_id_fkey
      FOREIGN KEY (folder_id) REFERENCES v_b_client_file_folders(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_v_b_client_files_folder
  ON v_b_client_files (client_id, folder_id)
  WHERE is_deleted = FALSE;
