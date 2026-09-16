-- Contact ↔ company site links (multi-site per contact, optional primary per site)
BEGIN;

CREATE TABLE IF NOT EXISTS v_b_contact_site_links (
  contact_id INTEGER NOT NULL REFERENCES v_b_contacts(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES v_b_clients(id) ON DELETE CASCADE,
  site_id TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (contact_id, client_id, site_id)
);

CREATE INDEX IF NOT EXISTS idx_v_b_contact_site_links_client_site
  ON v_b_contact_site_links (client_id, site_id);

CREATE INDEX IF NOT EXISTS idx_v_b_contact_site_links_contact_id
  ON v_b_contact_site_links (contact_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_contact_primary_per_site
  ON v_b_contact_site_links (client_id, site_id)
  WHERE is_primary;

COMMIT;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'veritas_user') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_contact_site_links TO veritas_user';
  END IF;
END $$;
