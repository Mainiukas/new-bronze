# Database checks

Two test files, one per migration. They run on plain PostgreSQL 15+ with
`stub_supabase.sql` standing in for Supabase's `auth` and `storage` schemas
and its API roles. `pg_cron` isn't needed: leave out 001's last two lines.

- `001_accounts.test.sql` checks `001_accounts.sql` on its own: the sign-up
  trigger, who can read and write which columns, every function (username
  check and log-in, match results counted once, guest record merged once,
  email choices, unsubscribe, export, account deletion) and the clean-up.
  Run it on a database with only 001 (002 changes some of what it checks).
- `002_profiles_security.test.sql` checks `002_profiles_security.sql`, run
  **twice** first to prove it's safe to re-run: profile privacy (public,
  friends, private; visitors), username changes (30 days, password, history,
  redirects and reservation), avatars, reports, match history, recovery
  codes, rate limits, phone and card flags, recent sign-ins, the avatar
  storage rules, export and deletion.

```bash
# 001 only
createdb bronze_001
psql -v ON_ERROR_STOP=1 -d bronze_001 -f supabase/tests/stub_supabase.sql
head -n -2 supabase/migrations/001_accounts.sql | psql -v ON_ERROR_STOP=1 -d bronze_001
psql -v ON_ERROR_STOP=1 -d bronze_001 -f supabase/tests/001_accounts.test.sql   # ends with: ALL SQL CHECKS PASSED
dropdb bronze_001

# 001 + 002 (002 twice)
createdb bronze_002
psql -v ON_ERROR_STOP=1 -d bronze_002 -f supabase/tests/stub_supabase.sql
head -n -2 supabase/migrations/001_accounts.sql | psql -v ON_ERROR_STOP=1 -d bronze_002
psql -v ON_ERROR_STOP=1 -d bronze_002 -f supabase/migrations/002_profiles_security.sql
psql -v ON_ERROR_STOP=1 -d bronze_002 -f supabase/migrations/002_profiles_security.sql
psql -v ON_ERROR_STOP=1 -d bronze_002 -f supabase/tests/002_profiles_security.test.sql   # ends with: ALL 002 CHECKS PASSED
dropdb bronze_002
```

Don't run these against your real Supabase project: they create and delete
test users.
