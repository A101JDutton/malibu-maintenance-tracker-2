# Malibu Tracker — Public View, Private Edit

Anyone can view the maintenance log. Only your allowed email can add/delete/update.

## Vercel Environment Variables

Add these:

NEXT_PUBLIC_SUPABASE_URL=your Supabase Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=your Supabase anon public key
NEXT_PUBLIC_ALLOWED_EMAIL=your@email.com

## Supabase Setup

1. Open `supabase-setup-public-view-private-edit.sql`
2. Replace `your-email@example.com` with your real email
3. Run it in Supabase SQL Editor
4. In Supabase Authentication settings, enable Email OTP/Magic Link
5. Redeploy on Vercel
