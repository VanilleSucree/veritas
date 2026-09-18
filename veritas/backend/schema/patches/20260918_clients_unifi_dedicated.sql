-- UniFi: mode global (Site Manager host/site) vs dédié (Network API contrôleur local)
ALTER TABLE v_b_clients_unifi
  ADD COLUMN IF NOT EXISTS mapping_mode TEXT NOT NULL DEFAULT 'global';

ALTER TABLE v_b_clients_unifi
  ADD COLUMN IF NOT EXISTS dedicated_label TEXT;

ALTER TABLE v_b_clients_unifi
  ADD COLUMN IF NOT EXISTS dedicated_api_url TEXT;

ALTER TABLE v_b_clients_unifi
  ADD COLUMN IF NOT EXISTS dedicated_api_key_encrypted TEXT;

ALTER TABLE v_b_clients_unifi
  ADD COLUMN IF NOT EXISTS dedicated_iv TEXT;

ALTER TABLE v_b_clients_unifi
  ADD COLUMN IF NOT EXISTS dedicated_auth_tag TEXT;

ALTER TABLE v_b_clients_unifi
  ADD COLUMN IF NOT EXISTS dedicated_reject_unauthorized BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE v_b_clients_unifi
  ADD COLUMN IF NOT EXISTS dedicated_network_site TEXT;

COMMENT ON COLUMN v_b_clients_unifi.mapping_mode IS 'global = Site Manager host/site ; dedicated = Network API local';
