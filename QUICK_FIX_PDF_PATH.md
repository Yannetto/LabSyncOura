# Quick Fix for pdf_path Error

## Problem
Error: `null value in column "pdf_path" of relation "reports" violates not-null constraint`

This happens because:
- The original schema had `pdf_path text NOT NULL`
- The schema updates tried to drop it, but it wasn't run or didn't work
- The API code doesn't provide `pdf_path` when saving reports

## Solution (Choose One)

### Option 1: Make pdf_path Nullable (Quick Fix)
Run this in Supabase SQL Editor:

```sql
ALTER TABLE reports 
  ALTER COLUMN pdf_path DROP NOT NULL;
```

This allows `pdf_path` to be NULL, which fixes the immediate error.

### Option 2: Remove pdf_path Column (Recommended)
Run this in Supabase SQL Editor:

```sql
ALTER TABLE reports DROP COLUMN IF EXISTS pdf_path;
```

This completely removes the old column since we now use `report_data` JSON instead.

## After Running the Fix

1. Try saving a report again - it should work
2. The error should be resolved

## Why This Happened

The original schema (`supabase-schema.sql`) created `reports` table with `pdf_path text NOT NULL`. The schema updates (`supabase-schema-updates.sql`) tried to drop it, but:
- Either the updates weren't run
- Or the DROP didn't execute properly
- Or you're using the "safe" schema which doesn't drop columns

The code has been updated to handle both cases (with or without `pdf_path` column).
