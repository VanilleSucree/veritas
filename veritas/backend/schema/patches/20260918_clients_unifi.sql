-- UniFi Site Manager link (host + site + optional Carrier subscriber) per Veritas client
CREATE TABLE IF NOT EXISTS v_b_clients_unifi (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL UNIQUE,
  host_id TEXT,
  host_name TEXT,
  site_id TEXT,
  site_name TEXT,
  subscriber_id TEXT,
  subscriber_name TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_v_b_clients_unifi_client_id
  ON v_b_clients_unifi (client_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_clients_unifi TO veritas_user;
GRANT USAGE, SELECT ON SEQUENCE v_b_clients_unifi_id_seq TO veritas_user;
