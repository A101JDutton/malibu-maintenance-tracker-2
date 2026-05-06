# Malibu Maintenance Tracker — Supabase Cloud Sync

## What this version does
- Syncs maintenance records across browsers/devices
- Uploads receipt and odometer photos to Supabase Storage
- Saves current mileage and oil interval in Supabase

## Files
- app/layout.js
- app/page.js
- package.json
- next.config.js
- supabase-setup.sql

## Setup
1. Create a free Supabase project.
2. Open Supabase SQL Editor.
3. Paste and run everything in `supabase-setup.sql`.
4. In Supabase, go to Project Settings > API.
5. Copy:
   - Project URL
   - anon public key
6. In Vercel, add environment variables:
   - NEXT_PUBLIC_SUPABASE_URL = your Project URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY = your anon public key
7. Redeploy your Vercel project.
