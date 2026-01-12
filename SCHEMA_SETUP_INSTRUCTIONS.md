# Database Schema Setup Instructions

## Quick Setup

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Click on **SQL Editor** in the left sidebar

2. **Run the Complete Schema**
   - Open the file `supabase-schema-complete.sql`
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click **Run** (or press Cmd/Ctrl + Enter)

3. **Verify Setup**
   - Go to **Table Editor** in Supabase
   - Verify these tables exist:
     - `profiles` (should have `tos_accepted_at`, `tos_version`, `deleted_at` columns)
     - `reports` (should have `report_data`, `report_type`, `title` columns)
     - `audit_logs` (new table)
   - Verify `oura_daily` and `oura_tokens` tables exist

4. **Verify Storage Bucket**
   - Go to **Storage** in Supabase
   - Verify `reports` bucket exists and is **private** (not public)

## What This Schema Adds

### New Columns
- **profiles table:**
  - `tos_accepted_at` - Timestamp when user accepted TOS
  - `tos_version` - Version of TOS accepted
  - `deleted_at` - Soft delete timestamp

- **reports table:**
  - `report_data` - JSON storage for report data
  - `report_type` - Type of report (default: 'doctor_summary')
  - `title` - User-friendly report title

### New Tables
- **audit_logs** - Tracks all user actions for security/compliance

### New Policies
- Users can delete their own reports
- Users can insert their own reports
- Users can view their own audit logs
- Users can delete their own reports from storage

## Troubleshooting

### Error: "column does not exist"
- Make sure you ran the **complete** schema file
- The `ALTER TABLE` statements use `IF NOT EXISTS`, so it's safe to run multiple times

### Error: "relation already exists"
- This is normal - the script uses `IF NOT EXISTS` and `ON CONFLICT DO NOTHING`
- Safe to run multiple times

### TOS Modal Still Appears After Running Schema
- Refresh your browser
- Check that the columns were actually added (use verification queries)
- Check browser console for any errors

## Verification Queries

Run these in SQL Editor to verify setup:

```sql
-- Check profiles columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('tos_accepted_at', 'tos_version', 'deleted_at');

-- Check reports columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'reports' 
AND column_name IN ('report_data', 'report_type', 'title');

-- Check audit_logs exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'audit_logs';
```

All three queries should return rows if the schema is set up correctly.
