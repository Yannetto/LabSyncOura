-- Fix pdf_path column issue
-- Run this in Supabase SQL Editor

-- Option 1: Make pdf_path nullable (if you want to keep it for backward compatibility)
ALTER TABLE reports 
  ALTER COLUMN pdf_path DROP NOT NULL;

-- Option 2: Remove pdf_path column entirely (recommended - we use report_data JSON now)
-- Uncomment the line below if you want to remove it completely:
-- ALTER TABLE reports DROP COLUMN IF EXISTS pdf_path;
