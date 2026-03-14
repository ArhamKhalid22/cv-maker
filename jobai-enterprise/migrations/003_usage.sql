CREATE TABLE usage_events (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL,
  request_id          TEXT NOT NULL,
  operation_id        TEXT NOT NULL,
  provider            TEXT NOT NULL,
  model               TEXT NOT NULL,
  prompt_tokens       INT,
  completion_tokens   INT,
  total_tokens        INT,
  cost_credits        NUMERIC,
  cached_tokens       INT,
  cache_write_tokens  INT,
  reasoning_tokens    INT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX usage_events_user_time ON usage_events (user_id, created_at);

CREATE TABLE quota_policies (
  id                     TEXT PRIMARY KEY,
  name                   TEXT NOT NULL,
  daily_token_limit      INT NOT NULL,
  daily_credit_limit     NUMERIC,
  max_concurrent_runs    INT NOT NULL,
  regen_per_hour_limit   INT NOT NULL,
  enabled               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_quota_assignments (
  user_id        TEXT PRIMARY KEY,
  quota_policy_id TEXT NOT NULL REFERENCES quota_policies(id),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE abuse_flags (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  flag_type   TEXT NOT NULL,
  details     JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
