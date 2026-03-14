-- ====================================================
-- JobAI Pro — Supabase Schema
-- Run each block in the Supabase SQL Editor
-- ====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================
-- APPLICATIONS TABLE
-- ====================================================
CREATE TABLE IF NOT EXISTS applications (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Row Level Security
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own applications"
  ON applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own applications"
  ON applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own applications"
  ON applications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own applications"
  ON applications FOR DELETE
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS applications_user_status ON applications (user_id, status);
CREATE INDEX IF NOT EXISTS applications_user_created ON applications (user_id, created_at DESC);

-- ====================================================
-- AUTO-UPDATE updated_at
-- ====================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ====================================================
-- AI MATCH SCORE FUNCTION
-- ====================================================
CREATE OR REPLACE FUNCTION calculate_match_score(user_skills JSONB, job_skills JSONB)
RETURNS INTEGER AS $$
DECLARE
  match_count INTEGER;
  total_count INTEGER;
BEGIN
  total_count := jsonb_array_length(job_skills);
  IF total_count = 0 THEN RETURN 0; END IF;

  SELECT COUNT(*) INTO match_count
  FROM jsonb_array_elements(user_skills) us
  WHERE EXISTS (
    SELECT 1 FROM jsonb_array_elements(job_skills) js
    WHERE LOWER(js->>'skill') = LOWER(us->>'skill')
  );

  RETURN ROUND((match_count::FLOAT / total_count::FLOAT) * 100);
END;
$$ LANGUAGE plpgsql;

-- ====================================================
-- USER STATS FUNCTION (for dashboard)
-- ====================================================
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID DEFAULT auth.uid())
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'total', COUNT(*),
      'applied', COUNT(*) FILTER (WHERE status = 'applied'),
      'interview', COUNT(*) FILTER (WHERE status = 'interview'),
      'offer', COUNT(*) FILTER (WHERE status = 'offer'),
      'rejected', COUNT(*) FILTER (WHERE status = 'rejected'),
      'avg_match_score', ROUND(AVG(match_score))
    )
    FROM applications
    WHERE user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
