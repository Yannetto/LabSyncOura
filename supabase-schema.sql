-- Simple Lab-Style Results - Supabase Schema
-- Run this in your Supabase SQL Editor

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
  pdf_path text NOT NULL,
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

-- Reports: users can read only own rows
CREATE POLICY "Users can view own reports"
  ON reports FOR SELECT
  USING (auth.uid() = user_id);

-- Oura daily: users can read only own rows
CREATE POLICY "Users can view own oura_daily"
  ON oura_daily FOR SELECT
  USING (auth.uid() = user_id);

-- Oura tokens: NO client-side select policy (server-only access via service role)
-- Service role will be used for all operations on this table

-- Storage bucket policy: Users can upload their own reports
-- Note: This policy allows users to upload to their own folder (user_id)
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
