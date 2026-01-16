-- Add age and gender columns to profiles table for clinical reference range adjustments
-- Run this in your Supabase SQL Editor

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS age integer,
ADD COLUMN IF NOT EXISTS gender text;

-- Add comments for documentation
COMMENT ON COLUMN profiles.age IS 'User age in years for age-adjusted clinical reference ranges';
COMMENT ON COLUMN profiles.gender IS 'User gender (e.g., "male", "female", "other") for gender-adjusted clinical reference ranges';
