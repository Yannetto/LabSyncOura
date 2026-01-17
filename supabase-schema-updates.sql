-- Customer-Facing App Schema Updates
-- Run this AFTER the base schema in supabase-schema.sql

-- Update profiles table: Add TOS acceptance
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS tos_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS tos_version text,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Update reports table: Store report data as JSON
ALTER TABLE reports 
  ADD COLUMN IF NOT EXISTS report_data jsonb,
  ADD COLUMN IF NOT EXISTS report_type text DEFAULT 'doctor_summary',
  ADD COLUMN IF NOT EXISTS title text,
  DROP COLUMN IF EXISTS pdf_path; -- Remove old pdf_path column

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

-- RLS Policies for reports (add delete policy)
DROP POLICY IF EXISTS "Users can delete own reports" ON reports;
CREATE POLICY "Users can delete own reports"
  ON reports FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own reports" ON reports;
CREATE POLICY "Users can insert own reports"
  ON reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for audit_logs (users can only see their own logs)
DROP POLICY IF EXISTS "Users can view own audit logs" ON audit_logs;
CREATE POLICY "Users can view own audit logs"
  ON audit_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Storage: Add delete policy for reports
DROP POLICY IF EXISTS "Users can delete own reports in storage" ON storage.objects;
CREATE POLICY "Users can delete own reports in storage"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'reports' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_reports_user_created ON reports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at) WHERE deleted_at IS NOT NULL;
