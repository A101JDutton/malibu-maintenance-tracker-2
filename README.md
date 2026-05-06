# Malibu Tracker — Password Login

Anyone can view. Only gageshaw73@gmail.com can add/delete/edit.

## Supabase setup
1. Run `supabase-password-setup.sql` in Supabase SQL Editor.
2. Go to Supabase > Authentication > Users.
3. Click **Add user**.
4. Email: `gageshaw73@gmail.com`
5. Set your password.
6. Make sure **Auto Confirm User** is enabled, or manually confirm the user.

## Vercel environment variables
Add:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_ALLOWED_EMAIL = gageshaw73@gmail.com

Then redeploy.
