-- Emojis / icônes custom Knowledge Base (shortcodes :nom:)

CREATE TABLE IF NOT EXISTS v_b_knowledge_emojis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(32) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL DEFAULT 'image/png',
  created_by UUID NULL REFERENCES v_b_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v_b_knowledge_emojis_name_chk CHECK (name ~ '^[a-z0-9][a-z0-9_-]{1,31}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_v_b_knowledge_emojis_name
  ON v_b_knowledge_emojis (lower(name));

ALTER TABLE v_b_knowledge_articles
  ADD COLUMN IF NOT EXISTS icon VARCHAR(32) NULL;

ALTER TABLE v_b_knowledge_folders
  ADD COLUMN IF NOT EXISTS icon VARCHAR(32) NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_knowledge_emojis TO veritas_user;
