# Debugging SpO2 and Breathing Disturbance Index

## Steps to Diagnose

### 1. Check if OAuth Scope Includes `spo2Daily`

The OAuth scope has been updated to include `spo2Daily`, but you need to **reconnect your Oura account** for the new scope to take effect:

1. Go to Dashboard
2. Click "Disconnect Oura" 
3. Click "Connect Oura" again
4. Approve the connection (this will request the new `spo2Daily` scope)

### 2. Check if Data is Being Synced

After reconnecting, sync your data:

1. Click "Sync last 30 days"
2. Check the browser console (F12 → Console tab) for logs like:
   - `[Sync] Fetched X items from daily_spo2`
   - `[Sync] daily_spo2 - Extracted metrics: ['spo2_percentage_average', 'breathing_disturbance_index']`

If you see "No data returned for daily_spo2", it means:
- Either your Oura account doesn't have SpO2 data
- Or the OAuth scope still doesn't include `spo2Daily`

### 3. Check Database

Run this SQL query in Supabase SQL Editor to check if SpO2 data exists:

```sql
SELECT 
  day, 
  metric_key, 
  value 
FROM oura_daily 
WHERE metric_key IN ('spo2_percentage_average', 'breathing_disturbance_index')
ORDER BY day DESC 
LIMIT 20;
```

If this returns no rows, the data isn't being synced.

### 4. Check Report Generation Logs

When generating a report, check the browser console for:

- `[DoctorSummary] SpO2/Breathing metrics found in input:` - Shows if metrics are calculated
- `[DoctorSummary] SpO2/Breathing metrics after filtering:` - Shows if they pass the filter
- `[DoctorSummary] Cardiovascular metrics after grouping:` - Shows what goes into the cardiovascular section
- `[DoctorSummary] formatCardiovascular - Input metrics:` - Shows what's available for matching
- `[DoctorSummary] Oxygen Saturation (SpO2) NOT FOUND` - Shows if matching fails

### 5. Common Issues

**Issue: "No data returned for daily_spo2"**
- **Solution:** Reconnect Oura account to get `spo2Daily` scope

**Issue: Data exists in database but not in report**
- **Solution:** Check console logs to see where filtering/matching fails

**Issue: Oura account doesn't have SpO2 data**
- **Solution:** SpO2 requires an Oura Ring Gen 3. Older rings don't have SpO2 sensors.

### 6. Enable Debug Mode

Set environment variable to see more detailed logs:

```bash
OURA_DEBUG=1
```

Then restart your Next.js server and check the console logs.
