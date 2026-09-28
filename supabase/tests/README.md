# Database checks

`001_accounts.test.sql` checks what `supabase/migrations/001_accounts.sql`
does: the sign-up trigger, who can read and write which columns, every
function (username check and log-in, match results counted once, guest
record merged once, email choices, unsubscribe, export, account deletion) and
the clean-up.

It runs on plain PostgreSQL 15+ with `stub_supabase.sql` standing in for
Supabase's `auth` schema and API roles. `pg_cron` isn't needed: leave out the
migration's last two lines.

```bash
createdb bronze_test
psql -v ON_ERROR_STOP=1 -d bronze_test -f supabase/tests/stub_supabase.sql
head -n -2 supabase/migrations/001_accounts.sql | psql -v ON_ERROR_STOP=1 -d bronze_test
psql -d bronze_test -f supabase/tests/001_accounts.test.sql   # ends with: ALL SQL CHECKS PASSED
dropdb bronze_test
```

Don't run these against your real Supabase project: they create and delete
test users.
