CREATE TABLE consent_records (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  scope         TEXT NOT NULL,
  granted       BOOLEAN NOT NULL,
  ui_version    TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX consent_records_user_scope ON consent_records (user_id, scope);
