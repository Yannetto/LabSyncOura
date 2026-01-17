# Oura API v2 Mapping Fix - Migration Notes

## Overview

This update fixes a critical bug where `contributors.*` fields from daily endpoints were incorrectly treated as real-world durations (hours/seconds) when they are actually 0-100 component scores.

## What Changed

### 1. Daily Endpoints (`daily_sleep`, `daily_readiness`, `daily_activity`, `daily_stress`)

**BEFORE (WRONG):**
- `daily_sleep.contributors.total_sleep` was treated as hours and converted to seconds
- `daily_sleep.contributors.rem_sleep` was treated as hours and converted to seconds
- This led to values like `sleep_total_sleep=100 seconds` (from a score of 100) or `sleep_duration=360000 seconds` (from a score of 100 converted as hours)

**AFTER (CORRECT):**
- `daily_sleep.contributors.*` are stored as component scores (0-100) with `_contrib_score` suffix
- Example: `sleep_total_sleep_contrib_score=85.5` (a score, not a duration)

### 2. Sleep Endpoint (`/v2/usercollection/sleep`)

**NEW:**
- Added fetching from `/v2/usercollection/sleep` endpoint for actual sleep durations
- Durations are in seconds (per Oura API v2 docs)
- Stored with `_duration_seconds` suffix
- Example: `sleep_total_sleep_duration_seconds=28800` (8 hours in seconds)

### 3. Metric Key Changes

#### Old Keys (DEPRECATED - but kept for backward compatibility):
- `sleep_duration` - Now comes from `/sleep` endpoint, not `daily_sleep.contributors`
- `sleep_latency` - Now comes from `/sleep` endpoint
- `rem_sleep_percentage` - Now calculated from `/sleep` durations, not contributors
- `deep_sleep_percentage` - Now calculated from `/sleep` durations, not contributors
- `sleep_efficiency` - Now calculated from `/sleep` durations (time_in_bed vs total_sleep)

#### New Keys (CORRECT):
- `sleep_total_sleep_duration_seconds` - Actual duration from `/sleep` endpoint
- `sleep_rem_sleep_duration_seconds` - Actual REM duration
- `sleep_deep_sleep_duration_seconds` - Actual Deep duration
- `sleep_light_sleep_duration_seconds` - Actual Light duration
- `sleep_latency_seconds` - Actual latency
- `sleep_time_in_bed_seconds` - Time in bed
- `sleep_rem_pct` - Calculated percentage from durations
- `sleep_deep_pct` - Calculated percentage from durations
- `sleep_light_pct` - Calculated percentage from durations
- `sleep_efficiency_pct` - Calculated from durations

#### Component Scores (NEW - from daily endpoints):
- `daily_sleep_score` - Main daily sleep score (0-100)
- `sleep_total_sleep_contrib_score` - Component score (0-100)
- `sleep_rem_sleep_contrib_score` - Component score (0-100)
- `sleep_deep_sleep_contrib_score` - Component score (0-100)
- `sleep_efficiency_contrib_score` - Component score (0-100)
- `sleep_latency_contrib_score` - Component score (0-100)
- `sleep_restfulness_contrib_score` - Component score (0-100)
- `sleep_timing_contrib_score` - Component score (0-100)

### 4. Activity Time Fields

**BEFORE:**
- Time fields stored with ambiguous units

**AFTER:**
- All time fields stored with `_seconds` suffix
- Example: `high_activity_time_seconds=7200` (2 hours in seconds)

### 5. Readiness Fields

**BEFORE:**
- `contributors.resting_heart_rate` and `contributors.hrv_rmssd` were treated as actual values

**AFTER:**
- These are component scores (0-100), stored with `_contrib_score` suffix
- Note: Real HRV and HR values should come from other endpoints if available

## Backward Compatibility

The code maintains backward compatibility by:
1. Storing both new keys and old aliases
2. Old metric keys (`sleep_duration`, `rem_sleep_percentage`, etc.) are populated from new sources
3. Report calculations support both old and new keys

## Migration Steps

### Required: Force Re-sync

After deploying this update, users must perform a **Force Re-sync** to:
1. Re-fetch data from `/sleep` endpoint (new)
2. Re-map `daily_*` contributors as scores (not durations)
3. Overwrite incorrect values in database

**Steps:**
1. Deploy the updated code
2. Instruct users to click "Force Re-sync (re-map all data)" in the app
3. This will re-fetch and re-map the last 90 days

### Optional: Database Cleanup

If you want to remove old incorrect metric keys:
```sql
-- Remove old incorrect sleep duration metrics (if they exist)
DELETE FROM oura_daily 
WHERE metric_key IN (
  'sleep_total_sleep',
  'sleep_rem_sleep', 
  'sleep_deep_sleep',
  'sleep_light_sleep'
)
AND value::numeric > 43200; -- Values > 12 hours are likely wrong
```

## Validation

The new code includes validation:
- Sleep durations must be 0-16 hours (0-57600 seconds)
- Component scores are clamped to 0-100
- Percentages are validated to be 0-100%
- Implausible values are logged and skipped

## Testing

After migration, verify:
1. Sleep durations show reasonable values (e.g., "7h 30m" not "65h 52m")
2. REM/Deep percentages are in normal ranges (15-25% REM, 10-20% Deep)
3. Component scores are 0-100 (not thousands)
4. Activity time fields are in seconds

## Debugging

Enable debug logging:
```bash
OURA_DEBUG=1
```

This will log:
- Raw API response values
- Unit conversions (if any)
- Validation warnings
- Metric key mappings

## API Endpoints Used

1. `/v2/usercollection/daily_sleep` - Daily summaries with component scores
2. `/v2/usercollection/daily_readiness` - Daily summaries with component scores
3. `/v2/usercollection/daily_activity` - Daily summaries with component scores
4. `/v2/usercollection/daily_stress` - Daily stress summaries
5. `/v2/usercollection/sleep` - **NEW** - Actual sleep durations in seconds

## OAuth Scopes Required

Ensure your OAuth app has these scopes:
- `daily` - For daily endpoints
- `sleep` - For `/sleep` endpoint (may be included in `daily` scope, verify with Oura)

## Summary

**Root Cause:** Contributors in daily endpoints are 0-100 scores, not durations.

**Fix:** 
- Treat contributors as scores
- Fetch actual durations from `/sleep` endpoint
- Remove all unit-guessing heuristics
- Use explicit naming conventions

**Impact:** 
- Correct sleep durations and percentages
- Accurate component scores
- No more "65 hour sleep" or "97% REM" errors
