-- Complete Supabase Schema for LabSyncOura
-- Run this entire file in your Supabase SQL Editor
-- This includes both base schema and customer-facing features

-- ============================================
-- PART 1: BASE SCHEMA
-- ============================================

-- Create storage bucket for reports
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', false)
ON CONFLICT (id) DO NOTHING;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create oura_tokens table (server-only access)
CREATE TABLE IF NOT EXISTS oura_tokens (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create oura_daily table
CREATE TABLE IF NOT EXISTS oura_daily (
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  day date NOT NULL,
  metric_key text NOT NULL,
  value text,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, day, metric_key)
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE oura_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE oura_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running script)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own reports" ON reports;
DROP POLICY IF EXISTS "Users can delete own reports" ON reports;
DROP POLICY IF EXISTS "Users can insert own reports" ON reports;
DROP POLICY IF EXISTS "Users can view own oura_daily" ON oura_daily;

-- RLS Policies

-- Profiles: users can read/write only their own row
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Reports: users can read/insert/delete only own rows
CREATE POLICY "Users can view own reports"
  ON reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reports"
  ON reports FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reports"
  ON reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Oura daily: users can read only own rows
CREATE POLICY "Users can view own oura_daily"
  ON oura_daily FOR SELECT
  USING (auth.uid() = user_id);

-- Oura tokens: NO client-side select policy (server-only access via service role)
-- Service role will be used for all operations on this table

-- Storage bucket policy: Users can upload their own reports
CREATE POLICY "Users can upload own reports"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'reports' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own reports in storage"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'reports' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own reports in storage"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'reports' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================
-- PART 2: CUSTOMER-FACING FEATURES
-- ============================================

-- Update profiles table: Add TOS acceptance
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS tos_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS tos_version text,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Update reports table: Store report data as JSON
ALTER TABLE reports 
  ADD COLUMN IF NOT EXISTS report_data jsonb,
  ADD COLUMN IF NOT EXISTS report_type text DEFAULT 'doctor_summary',
  ADD COLUMN IF NOT EXISTS title text;

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit_logs (users can only see their own logs)
DROP POLICY IF EXISTS "Users can view own audit logs" ON audit_logs;
CREATE POLICY "Users can view own audit logs"
  ON audit_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_reports_user_created ON reports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================
-- VERIFICATION QUERIES (optional - run to verify)
-- ============================================

-- Verify profiles table has new columns
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' 
-- AND column_name IN ('tos_accepted_at', 'tos_version', 'deleted_at');

-- Verify reports table has new columns
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'reports' 
-- AND column_name IN ('report_data', 'report_type', 'title');

-- Verify audit_logs table exists
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_name = 'audit_logs';
