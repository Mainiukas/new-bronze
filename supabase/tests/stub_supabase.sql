-- A stand-in for what Supabase provides before any migration runs (auth and
-- storage schemas, API roles, default privileges), for testing the migrations
-- on plain PostgreSQL. See supabase/tests/README.md.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema auth;
create schema extensions;
create schema storage;
grant usage on schema public, extensions to anon, authenticated;
grant usage on schema auth, storage to anon, authenticated;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  phone text,
  encrypted_password text,
  raw_user_meta_data jsonb,
  created_at timestamptz not null default now(),
  email_confirmed_at timestamptz,
  phone_confirmed_at timestamptz,
  last_sign_in_at timestamptz
);
create table auth.identities (user_id uuid references auth.users on delete cascade, provider text);
create table auth.mfa_factors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  factor_type text not null default 'totp',
  status text not null default 'verified'
);
create table auth.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  refreshed_at timestamp,
  user_agent text,
  ip inet
);
-- As in Supabase: the claims of the caller's JWT (tests set request.jwt.claims,
-- or just request.jwt.claim.sub).
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
$$;
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), auth.jwt() ->> 'sub')::uuid
$$;
grant execute on function auth.uid(), auth.jwt() to anon, authenticated;

create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets,
  name text not null,
  owner uuid
);
alter table storage.objects enable row level security;
grant select, insert, update, delete on storage.objects to authenticated;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
$$;
grant execute on function storage.foldername(text) to anon, authenticated;

-- Supabase's default privileges: everything new in public is granted to the API roles.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
