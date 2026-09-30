# Database checks

One test file per migration. They run on plain PostgreSQL 15+ with
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
- `004_multiplayer.test.sql` checks `004_multiplayer.sql`: saves are one
  transaction and refused when stale, players read only their own games and
  their own hand, secrets and the queue are unreadable, browsers can't write,
  the server functions are service-role only, and a deleted account keeps its
  seat as "Deleted player".

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

# 001 + 002 + 003 (003 twice)
createdb bronze_003
psql -v ON_ERROR_STOP=1 -d bronze_003 -f supabase/tests/stub_supabase.sql
head -n -2 supabase/migrations/001_accounts.sql | psql -v ON_ERROR_STOP=1 -d bronze_003
psql -v ON_ERROR_STOP=1 -d bronze_003 -f supabase/migrations/002_profiles_security.sql
psql -v ON_ERROR_STOP=1 -d bronze_003 -f supabase/migrations/003_onboarding_ratings.sql
psql -v ON_ERROR_STOP=1 -d bronze_003 -f supabase/migrations/003_onboarding_ratings.sql
psql -v ON_ERROR_STOP=1 -d bronze_003 -f supabase/tests/003_onboarding_ratings.test.sql   # ends with: ALL 003 CHECKS PASSED
dropdb bronze_003

# 001–004 (004 twice)
createdb bronze_004
psql -v ON_ERROR_STOP=1 -d bronze_004 -f supabase/tests/stub_supabase.sql
head -n -2 supabase/migrations/001_accounts.sql | psql -v ON_ERROR_STOP=1 -d bronze_004
for m in 002_profiles_security 003_onboarding_ratings 004_multiplayer 004_multiplayer; do
  psql -v ON_ERROR_STOP=1 -d bronze_004 -f supabase/migrations/$m.sql
done
psql -v ON_ERROR_STOP=1 -d bronze_004 -f supabase/tests/004_multiplayer.test.sql   # ends with: ALL 004 CHECKS PASSED
dropdb bronze_004
```

Don't run these against your real Supabase project: they create and delete
test users.
