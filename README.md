# Simple Lab-Style Results

A Next.js web application that generates clinical lab-style reports from Oura ring data.

## Features

- User authentication via Supabase
- OAuth2 integration with Oura API
- Automatic data synchronization (last 30 days)
- Lab-style PDF report generation
- Secure token storage and refresh

## Prerequisites

- Node.js 18+ and npm
- A Supabase account
- An Oura OAuth application

## Setup Instructions

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be fully provisioned
3. Note your project URL and API keys from **Settings > API**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

### 2. Run SQL Schema

1. In Supabase, go to **SQL Editor**
2. Open the file `supabase-schema.sql` from this project
3. Copy and paste the entire contents into the SQL Editor
4. Click **Run** to execute the script
5. Verify tables were created in **Table Editor**

### 3. Create Storage Bucket

1. In Supabase, go to **Storage**
2. The bucket `reports` should have been created by the SQL script
3. If not, create it manually:
   - Click **New bucket**
   - Name: `reports`
   - Public: **No** (private)
   - Click **Create bucket**

### 4. Set Up Oura OAuth Application

1. Go to [Oura Cloud Developer Portal](https://cloud.ouraring.com/oauth/applications)
2. Create a new OAuth application
3. Set the redirect URI:
   - For local development: `http://localhost:3000/api/oura/callback`
   - For production: `https://your-domain.vercel.app/api/oura/callback`
4. Note your **Client ID** and **Client Secret**

### 5. Install Dependencies

```bash
npm install
```

### 6. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Oura
OURA_CLIENT_ID=your_oura_client_id
OURA_CLIENT_SECRET=your_oura_client_secret

# App
BASE_URL=http://localhost:3000
```

**Important:** Never commit `.env.local` to version control. It's already in `.gitignore`.

### 7. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin your-repo-url
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Vercel will auto-detect Next.js
4. Add all environment variables in **Settings > Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OURA_CLIENT_ID`
   - `OURA_CLIENT_SECRET`
   - `BASE_URL` (set to your Vercel domain, e.g., `https://your-app.vercel.app`)

### 3. Update Oura Redirect URI

1. Go back to your Oura OAuth application settings
2. Add the production redirect URI: `https://your-domain.vercel.app/api/oura/callback`
3. Save the changes

### 4. Deploy

Vercel will automatically deploy on every push to your main branch.

## Testing Checklist

After setup, test the following:

- [ ] **Sign Up / Login**
  - Create a new account
  - Log in with existing account
  - Verify redirect to `/app` after login

- [ ] **Oura Connection**
  - Click "Connect Oura" button
  - Complete OAuth flow on Oura's site
  - Verify redirect back with success message
  - Check that connection status shows "Connected"

- [ ] **Data Sync**
  - Click "Sync last 30 days"
  - Wait for success message with number of days synced
  - Verify data appears in Supabase `oura_daily` table

- [ ] **Preview Report**
  - Click "Preview report rows"
  - Verify table displays with metrics, results, flags, and reference ranges

- [ ] **Generate PDF**
  - Click "Generate PDF report"
  - Wait for success message
  - Verify PDF opens in new tab
  - Check PDF contains all expected metrics

- [ ] **Download Latest Report**
  - Click "Download latest report"
  - Verify PDF downloads or opens

- [ ] **Security Checks**
  - Try accessing `/app` without being logged in (should redirect to `/login`)
  - Verify RLS policies prevent cross-user data access

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── oura/
│   │   │   ├── start/route.ts      # OAuth initiation
│   │   │   ├── callback/route.ts   # OAuth callback
│   │   │   └── sync/route.ts        # Data synchronization
│   │   └── report/
│   │       ├── preview/route.ts     # Preview metrics
│   │       ├── generate/route.ts   # Generate PDF
│   │       └── latest/route.ts     # Get latest report
│   ├── app/page.tsx                 # Protected app page
│   ├── login/page.tsx               # Auth page
│   ├── privacy/page.tsx             # Privacy policy
│   ├── terms/page.tsx               # Terms & conditions
│   └── page.tsx                     # Landing page
├── lib/
│   ├── supabase/                    # Supabase clients
│   ├── oura/                        # Oura API integration
│   ├── report/                      # Report calculations
│   └── pdf/                         # PDF generation
├── supabase-schema.sql              # Database schema
└── middleware.ts                    # Auth middleware
```

## Troubleshooting

### OAuth Connection Fails

- Verify `BASE_URL` matches your actual domain
- Check Oura redirect URI is exactly: `{BASE_URL}/api/oura/callback`
- Ensure `OURA_CLIENT_ID` and `OURA_CLIENT_SECRET` are correct

### Sync Fails

- Verify Oura tokens are stored in `oura_tokens` table
- Check token hasn't expired (tokens auto-refresh)
- Verify Oura API credentials are correct

### PDF Generation Fails

- Check Supabase Storage bucket `reports` exists and is private
- Verify storage policies allow authenticated uploads
- Check service role key has proper permissions

### RLS Policy Errors

- Ensure all RLS policies were created from `supabase-schema.sql`
- Verify policies are enabled on all tables
- Check user is authenticated when accessing protected routes

## Security Notes

- **Never expose** `SUPABASE_SERVICE_ROLE_KEY` or `OURA_CLIENT_SECRET` to the browser
- These secrets are only used in server-side API routes
- OAuth tokens are stored server-side only
- All API routes verify authentication before processing

## License

This project is provided as-is for informational purposes only.

## Disclaimer

**Informational only. Not medical advice.** This service provides formatted reports of Oura data for informational purposes only. It is not intended to diagnose, treat, or prevent any medical condition. Not affiliated with Oura.

## Debugging Oura Data Sync

If metrics are showing as "—" in the report, enable debug logging to inspect the Oura API responses:

1. **Set the debug environment variable:**
   ```bash
   export OURA_DEBUG=1
   ```
   Or add to your `.env.local`:
   ```
   OURA_DEBUG=1
   ```

2. **Restart your dev server** (if running)

3. **Click "Sync last 30 days"** in the app

4. **Check server logs** for:
   - `[Sync] [DEBUG]` - Shows API response structure
   - `[OuraMap]` - Shows mapping operations
   - `[Sync] [DEBUG] Stored metric_key counts` - Verifies which metrics were stored

5. **Look for:**
   - Sample record keys (to see what fields Oura returns)
   - Field types and values (to verify units)
   - Missing metric keys (to identify mapping issues)

6. **After debugging, disable logging:**
   ```bash
   unset OURA_DEBUG
   ```
   Or remove from `.env.local`

## Oura API Integration Details

This app uses Oura Cloud API v2 with the "daily" scope for:
- `daily_sleep` - Sleep metrics (duration, efficiency, latency, REM/Deep percentages)
- `daily_readiness` - Heart rate and HRV metrics (resting HR, HRV RMSSD)
- `daily_activity` - Steps and calories
- `daily_stress` - Stress indicators (high stress days)

The sync process:
1. Fetches data from Oura API (incremental: only new days since last sync)
2. Maps API responses to canonical metric keys using `lib/oura/map.ts`
3. Normalizes units (seconds stored as seconds, fractions converted to percentages)
4. Stores in Supabase `oura_daily` table with metric_key matching calculation code

### Report Metrics (V1)

The report displays only these metrics:
- **Sleep:** sleep_duration, sleep_efficiency, sleep_latency, rem_sleep_percentage, deep_sleep_percentage
- **Cardiovascular Recovery:** resting_heart_rate, hrv_rmssd
- **Activity & Stress Load:** steps, high_stress_days, active_calories

All other metrics are stored but not displayed in the report.
