CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE applications (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL, -- references auth.users(id) if integrated with Supabase Auth
  job_title         TEXT NOT NULL DEFAULT 'Untitled Position',
  company           TEXT NOT NULL DEFAULT 'Unknown Company',
  job_url           TEXT,
  job_description   TEXT,
  user_background   TEXT,
  extracted_skills  JSONB,
  generated_cv      TEXT,
  cover_letter      TEXT,
  cv_pdf_url        TEXT,
  match_score       INTEGER CHECK (match_score >= 0 AND match_score <= 100),
  status            TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'applied', 'interview', 'rejected', 'offer')),
  applied_date      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_applications_user ON applications(user_id);
