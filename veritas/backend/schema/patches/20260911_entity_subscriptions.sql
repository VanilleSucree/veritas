-- Entity subscriptions (enterprise / contact / equipment)
BEGIN;

CREATE TABLE IF NOT EXISTS v_b_entity_subscriptions (
  user_id UUID NOT NULL REFERENCES v_b_users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('enterprise', 'contact', 'equipment')),
  entity_id TEXT NOT NULL,
  notify_inapp BOOLEAN NOT NULL DEFAULT TRUE,
  notify_email BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_v_b_entity_subscriptions_entity
  ON v_b_entity_subscriptions (entity_type, entity_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_entity_subscriptions TO veritas_user;

COMMIT;
