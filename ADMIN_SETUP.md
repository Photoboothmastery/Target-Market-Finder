# Admin page + access log: setup

Do these IN THIS ORDER.

1. Make sure the Kajabi sync has run at least once (visit /api/cron/sync-memberships
   on your deployed site, or wait 15 minutes) and the `memberships` table has
   rows. Step 3 makes the database require an active membership, so if the table
   is empty, nobody (including you) can see their data until the sync runs.
2. Vercel -> Project -> Settings -> Environment Variables: add
   ADMIN_EMAILS = comma-separated emails of people who can open /admin
   (e.g. you@photoboothmastery.com,teammate@photoboothmastery.com). Redeploy.
3. Supabase -> SQL Editor: paste and run sql/002_admin_and_access.sql.
4. Log in with an admin email. An "Admin" link appears in the top bar.

## What /admin does
- Who has access: everyone from Kajabi plus anyone who ever signed up. Shows
  access status, last time they opened the app, events logged, profile progress.
  "View" shows exactly what they entered.
- Block / Restore: affects THIS app only. Kajabi is not changed, and the 15-min
  sync will not undo a block. To remove someone for good, also remove their
  offer in Kajabi.
- Login log: one row each time someone opens the app in a new browser session,
  including people turned away and why. Newest 300 shown.
