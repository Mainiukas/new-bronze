-- Behaviour checks for supabase/migrations/002_profiles_security.sql. Run on a
-- scratch database after stub_supabase.sql, 001 (without its last two lines)
-- and 002 (see supabase/tests/README.md). Every check raises an error when it
-- fails; the last line prints ALL 002 CHECKS PASSED.
\set ON_ERROR_STOP 1

-- Players: Ada (18+, password), Teen (14-17), Gia (Google only), Bob (18+).
insert into auth.users (id, email, encrypted_password, raw_user_meta_data, email_confirmed_at, last_sign_in_at) values
 ('10000000-0000-0000-0000-00000000000a', 'ada@example.com', extensions.crypt('Sprocket-42', extensions.gen_salt('bf')),
  '{"username":"Ada","age_band":"18+","terms_version":"t1"}', now(), now() - interval '2 hours'),
 ('10000000-0000-0000-0000-00000000000b', 'teen@example.com', extensions.crypt('Sprocket-42', extensions.gen_salt('bf')),
  '{"username":"Teen_1","age_band":"14-17","terms_version":"t1"}', now(), now()),
 ('10000000-0000-0000-0000-00000000000c', 'gia@gmail.com', null,
  '{"username":"Gia","age_band":"18+","terms_version":"t1"}', now(), now()),
 ('10000000-0000-0000-0000-00000000000e', 'bob@example.com', extensions.crypt('Sprocket-42', extensions.gen_salt('bf')),
  '{"username":"Bob","age_band":"18+","terms_version":"t1"}', now(), now());

create function pg_temp.as_user(id text, aal text default 'aal1', session text default null) returns void language sql as $$
  select set_config('request.jwt.claim.sub', '', false),
         set_config('request.jwt.claims', jsonb_build_object('sub', id, 'aal', aal, 'session_id', session)::text, false);
$$;
-- A visitor who isn't logged in: no claims at all.
create function pg_temp.as_visitor() returns void language sql as $$
  select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claims', '', false);
$$;

do $$ begin
  assert (select profile_visibility = 'public' and history_visibility = 'public' from profiles where username = 'Ada'), 'adult: public by default';
  assert (select profile_visibility = 'friends' and history_visibility = 'friends' from profiles where username = 'Teen_1'), 'under 18: friends-only by default';
  raise notice 'OK privacy defaults';
end $$;

-- ---------------------------------------------------------------- visitors
select pg_temp.as_visitor();
set role anon;
do $$ declare j jsonb; begin
  j := get_public_profile('ada');
  assert j ->> 'username' = 'Ada' and not (j ->> 'private')::boolean and j -> 'stats' ->> 'matches' = '0', 'public profile for visitors';
  j := get_public_profile('teen_1');
  assert (j ->> 'private')::boolean and j ->> 'username' = 'Teen_1' and j -> 'stats' is null, 'friends-only: username and avatar only';
  assert get_match_history('teen_1') is null, 'friends-only history hidden';
  assert get_public_profile('nobody') is null, 'unknown name';
  raise notice 'OK visitors see public profiles only';
end $$;
do $$ begin
  perform 1 from profiles;
  raise exception 'anon read the table';
exception when insufficient_privilege then raise notice 'OK visitors cannot read the table';
end $$;
reset role;

-- ---------------------------------------------------------------- Bob reads
select pg_temp.as_user('10000000-0000-0000-0000-00000000000e');
set role authenticated;
do $$ begin
  assert (select count(*) from profiles where username in ('Ada', 'Bob', 'Teen_1')) = 2, 'signed in: public profiles and my own, not friends-only ones';
  raise notice 'OK table read follows privacy';
end $$;
do $$ begin
  perform card_brand from profiles;
  raise exception 'card details readable';
exception when insufficient_privilege then raise notice 'OK card details private';
end $$;
do $$ begin
  update profiles set bio = 'hi' where username = 'Bob';
  raise exception 'direct write allowed';
exception when insufficient_privilege then raise notice 'OK no direct writes';
end $$;
reset role;

-- ---------------------------------------------------------------- Ada edits
select pg_temp.as_user('10000000-0000-0000-0000-00000000000a');
set role authenticated;
do $$ declare p profiles; begin
  begin
    perform update_profile_details(repeat('x', 161), null);
    raise exception 'long bio accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform update_profile_details('ok', 'LTU');
    raise exception 'bad country accepted';
  exception when invalid_parameter_value then null;
  end;
  select * into p from update_profile_details('  Canal builder.  ', 'lt');
  assert p.bio = 'Canal builder.' and p.country = 'LT', 'details saved and tidied';
  raise notice 'OK update_profile_details';
end $$;
do $$ declare p profiles; begin
  select * into p from set_avatar('preset:locomotive');
  assert p.avatar_url = 'preset:locomotive', 'preset avatar';
  select * into p from set_avatar('https://abc.supabase.co/storage/v1/object/public/avatars/10000000-0000-0000-0000-00000000000a/avatar-1.webp');
  assert p.avatar_url like 'https://abc.supabase.co/%', 'own uploaded avatar';
  begin
    perform set_avatar('https://evil.example/pixel.gif');
    raise exception 'foreign avatar accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform set_avatar('https://abc.supabase.co/storage/v1/object/public/avatars/10000000-0000-0000-0000-00000000000e/a.webp');
    raise exception 'someone else''s file accepted';
  exception when invalid_parameter_value then null;
  end;
  raise notice 'OK set_avatar';
end $$;
do $$ declare j jsonb; begin
  j := my_account();
  assert j ->> 'country' = 'LT' and (j ->> 'has_password')::boolean and j ->> 'next_username_change_at' is null, 'my_account';
  raise notice 'OK my_account';
end $$;

-- Username change.
do $$ begin
  assert change_username('Ada_L', 'wrong') = 'wrong-password', 'wrong password refused';
  raise notice 'OK change_username needs the password';
end $$;
do $$ begin
  perform change_username('bob', 'Sprocket-42');
  raise exception 'taken name accepted';
exception when unique_violation then raise notice 'OK change_username refuses a taken name';
end $$;
do $$ begin
  assert change_username('Ada_L', 'Sprocket-42') = 'ok', 'renamed';
  assert (select username from profiles where id = auth.uid()) = 'Ada_L' and my_account() ->> 'next_username_change_at' is not null, 'renamed';
  assert jsonb_array_length(export_my_data() -> 'username_history') = 1, 'history kept';
  raise notice 'OK change_username';
end $$;
do $$ begin
  perform change_username('Ada_Two', 'Sprocket-42');
  raise exception 'second change within 30 days';
exception when invalid_parameter_value then
  assert sqlerrm = 'too-soon', sqlerrm;
  raise notice 'OK once every 30 days';
end $$;
do $$ begin
  assert is_username_available('ada'), 'my own old name is still mine';
  assert (get_public_profile('ada') ->> 'redirect') = 'Ada_L', 'old link redirects';
  raise notice 'OK old name redirects';
end $$;
reset role;
select pg_temp.as_user('10000000-0000-0000-0000-00000000000e');
set role authenticated;
do $$ begin
  assert not is_username_available('ADA'), 'old name reserved for others';
  begin
    perform change_username('Ada', 'Sprocket-42');
    raise exception 'reserved name taken';
  exception when unique_violation then null;
  end;
  raise notice 'OK old name reserved for 30 days';
end $$;
reset role;
-- 31 days on, Ada may change again, and the old name is free for others.
update profiles set username_changed_at = now() - interval '31 days' where username = 'Ada_L';
update username_history set changed_at = now() - interval '31 days';
select pg_temp.as_user('10000000-0000-0000-0000-00000000000e');
set role authenticated;
do $$ begin
  assert is_username_available('Ada'), 'reservation ends after 30 days';
  assert get_public_profile('Ada') is null, 'redirect ends after 30 days';
  raise notice 'OK reservations expire';
end $$;
reset role;
-- Google-only: needs a recent log-in instead of a password.
select pg_temp.as_user('10000000-0000-0000-0000-00000000000c');
set role authenticated;
do $$ begin
  assert change_username('Gia_B') = 'ok', 'recent log-in is enough';
  raise notice 'OK Google-only change with a recent log-in';
end $$;
reset role;
update profiles set username_changed_at = null where username = 'Gia_B';
update auth.users set last_sign_in_at = now() - interval '1 hour' where email = 'gia@gmail.com';
set role authenticated;
do $$ begin
  perform change_username('Gia_C');
  raise exception 'stale log-in accepted';
exception when sqlstate '28000' then raise notice 'OK Google-only needs a fresh log-in';
end $$;
reset role;

-- ---------------------------------------------------------------- matches
select pg_temp.as_user('10000000-0000-0000-0000-00000000000a');
set role authenticated;
do $$ declare p profiles; j jsonb; begin
  select * into p from record_match_result(40, true, '20000000-0000-0000-0000-000000000001', 5, 'black-country', array['foreman'], 'blitz', 3, 1, 6, 4);
  select * into p from record_match_result(40, true, '20000000-0000-0000-0000-000000000001', 5, 'black-country', array['foreman'], 'blitz', 3, 1, 6, 4);
  assert p.matches = 1 and p.wins = 1, 'counted once';
  select * into p from record_match_result(20, false, '20000000-0000-0000-0000-000000000002', 2, 'pennine-mills', '{}', 'blitz', 4, 3, 2, 3);
  select * into p from record_match_result(30, false, '20000000-0000-0000-0000-000000000003', 1, 'black-country', '{}', 'normal', 2, 2, 1, 1);
  j := get_public_profile('Ada_L');
  assert j -> 'summary' ->> 'average_score' = '30.0', 'average ' || (j -> 'summary' ->> 'average_score');
  assert j -> 'summary' ->> 'links' = '9' and j -> 'summary' ->> 'industries' = '8', 'links and industries';
  assert j -> 'summary' ->> 'favourite_mode' = 'blitz' and j -> 'summary' ->> 'favourite_map' = 'black-country', 'favourites';
  assert (j ->> 'is_self')::boolean, 'is_self';
  begin
    perform record_match_result(10, false, null, 0, null, '{}', null, 3, 5);
    raise exception 'placement beyond players accepted';
  exception when invalid_parameter_value then null;
  end;
  raise notice 'OK record_match_result with details';
end $$;
do $$ declare j jsonb; begin
  for i in 1..25 loop
    perform record_match_result(i, false, null, 0, 'mersey-valley', '{}', 'bullet', 2, 2);
  end loop;
  j := get_match_history('ada_l', 0);
  assert (j ->> 'total')::int = 20 and jsonb_array_length(j -> 'items') = 10, 'page 1 of the last 20';
  assert (j -> 'items' -> 0 ->> 'score')::int = 25, 'newest first';
  assert jsonb_array_length(get_match_history('ada_l', 1) -> 'items') = 10, 'page 2';
  assert jsonb_array_length(get_match_history('ada_l', 2) -> 'items') = 0, 'only the last 20';
  raise notice 'OK match history pages';
end $$;
do $$ begin
  perform set_privacy('public', 'private');
  assert get_match_history('ada_l') is not null, 'owner still sees a private history';
  raise notice 'OK set_privacy';
end $$;
reset role;
select pg_temp.as_visitor();
set role anon;
do $$ declare j jsonb; begin
  j := get_public_profile('ada_l');
  assert not (j ->> 'private')::boolean and not (j ->> 'history_visible')::boolean, 'profile public, history private';
  assert get_match_history('ada_l') is null, 'private history hidden from others';
  raise notice 'OK private history';
end $$;
reset role;
select pg_temp.as_user('10000000-0000-0000-0000-00000000000a');
set role authenticated;
select set_privacy('private', 'private');
reset role;
select pg_temp.as_visitor();
set role anon;
do $$ declare j jsonb; begin
  j := get_public_profile('ada_l');
  assert (j ->> 'private')::boolean and j ->> 'bio' is null and j -> 'stats' is null, 'private: avatar and username only';
  raise notice 'OK private profile';
end $$;
reset role;

-- Guessing the password through change_username counts towards the limit.
select pg_temp.as_user('10000000-0000-0000-0000-00000000000e');
set role authenticated;
do $$ begin
  for i in 1..5 loop assert change_username('Bob_2', 'guess' || i) = 'wrong-password'; end loop;
  perform change_username('Bob_2', 'guess6');
  raise exception 'unlimited guesses through change_username';
exception when sqlstate 'PT429' then raise notice 'OK password guesses through change_username rate-limited';
end $$;
reset role;

-- ---------------------------------------------------------------- reports
select pg_temp.as_user('10000000-0000-0000-0000-00000000000e');
set role authenticated;
do $$ begin
  begin
    perform report_user('Bob', 'spam');
    raise exception 'self report accepted';
  exception when invalid_parameter_value then null;
  end;
  assert report_user('ada_l', 'offensive-name', 'test'), 'reported';
  assert report_user('ada_l', 'offensive-name', 'again'), 'again (accepted, not stored twice)';
  raise notice 'OK report_user';
end $$;
do $$ begin
  perform report_user('teen_1', 'spam');
  perform report_user('teen_1', 'spam');
  perform report_user('teen_1', 'spam');
  perform report_user('teen_1', 'spam');
  raise exception 'sixth report in an hour accepted';
exception when sqlstate 'PT429' then raise notice 'OK reports rate-limited';
end $$;
reset role;
do $$ begin
  assert (select count(*) from user_reports where reported_id = '10000000-0000-0000-0000-00000000000a') = 1, 'one report per day per pair';
end $$;

-- ---------------------------------------------------------------- rate limits
select pg_temp.as_visitor();
set role anon;
do $$ begin
  for i in 1..61 loop perform is_username_available('Someone' || i); end loop;
  raise exception 'no limit on username checks';
exception when sqlstate 'PT429' then raise notice 'OK username checks rate-limited';
end $$;
reset role;

-- ---------------------------------------------------------------- 2FA
insert into auth.mfa_factors (user_id) values ('10000000-0000-0000-0000-00000000000e');
select pg_temp.as_user('10000000-0000-0000-0000-00000000000e', 'aal1');
set role authenticated;
do $$ begin
  perform update_profile_details('x', null);
  raise exception 'aal1 edit allowed with 2FA on';
exception when insufficient_privilege then assert sqlerrm = 'mfa-required'; raise notice 'OK 2FA required for changes';
end $$;
do $$ begin
  perform regenerate_recovery_codes();
  raise exception 'codes without 2FA';
exception when insufficient_privilege then raise notice 'OK recovery codes need aal2';
end $$;
reset role;
select pg_temp.as_user('10000000-0000-0000-0000-00000000000e', 'aal2');
set role authenticated;
create temp table codes as select unnest(regenerate_recovery_codes()) as code;
do $$ begin
  assert (select count(distinct code) from codes) = 10 and (select bool_and(code ~ '^[a-z2-9]{5}-[a-z2-9]{5}$') from codes), 'ten codes';
  assert (my_account() ->> 'recovery_codes_left')::int = 10, 'ten left';
  assert (select count(*) from update_profile_details('ok at aal2', null)) = 1, 'aal2 edits';
  raise notice 'OK regenerate_recovery_codes';
end $$;
reset role;
select pg_temp.as_user('10000000-0000-0000-0000-00000000000e', 'aal1');
set role authenticated;
do $$ begin
  assert not use_recovery_code('aaaaa-bbbbb'), 'wrong code';
  assert use_recovery_code(upper(replace((select code from codes limit 1), '-', ' '))), 'right code (any case, spaces)';
  raise notice 'OK use_recovery_code';
end $$;
reset role;
do $$ begin
  assert not exists (select 1 from auth.mfa_factors where user_id = '10000000-0000-0000-0000-00000000000e'), '2FA off after a recovery code';
  assert not exists (select 1 from mfa_recovery_codes where user_id = '10000000-0000-0000-0000-00000000000e'), 'codes gone';
end $$;

-- ---------------------------------------------------------------- password, phone, card, sessions
select pg_temp.as_user('10000000-0000-0000-0000-00000000000b', 'aal1', '30000000-0000-0000-0000-000000000001');
set role authenticated;
do $$ begin
  assert check_my_password('Sprocket-42') and not check_my_password('nope'), 'check_my_password';
  perform check_my_password('nope'); perform check_my_password('nope'); perform check_my_password('nope');
  perform check_my_password('nope');
  raise exception 'no limit on password checks';
exception when sqlstate 'PT429' then raise notice 'OK password checks rate-limited';
end $$;
do $$ begin
  assert note_phone_attempt() and note_phone_attempt() and note_phone_attempt() and note_phone_attempt() and note_phone_attempt(), 'five allowed';
  assert not note_phone_attempt(), 'sixth refused';
  raise notice 'OK phone attempts limited';
end $$;
do $$ begin
  assert note_card_check() and note_card_check() and note_card_check() and note_card_check() and note_card_check(), 'five card checks allowed';
  assert not note_card_check(), 'sixth card check refused';
  raise notice 'OK card checks limited';
end $$;
do $$ begin
  perform hit_rate_limit('anything', 1000000, interval '1 hour');
  raise exception 'players can call hit_rate_limit directly';
exception when insufficient_privilege then raise notice 'OK rate-limit helper is private';
end $$;
reset role;
update auth.users set phone = '37060000000', phone_confirmed_at = now() where email = 'teen@example.com';
update profiles set card_verified = true, card_verified_at = now(), card_brand = 'visa', card_last4 = '4242' where username = 'Teen_1';
insert into auth.sessions (id, user_id, user_agent, ip) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-00000000000b', 'Mozilla/5.0 (X11; Linux) Firefox/130', '84.15.1.2'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-00000000000b', 'Mozilla/5.0 (iPhone) Safari/17', '84.15.9.9'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-00000000000a', 'someone else', '1.1.1.1');
set role authenticated;
do $$ declare p profiles; begin
  assert (select phone_verified from profiles where username = 'Teen_1'), 'phone verified follows auth.users';
  assert (select count(*) from recent_sign_ins()) = 2, 'only my sessions';
  assert (select count(*) from recent_sign_ins() where current and ip = '84.15.1.2') = 1, 'this session marked';
  assert (my_account() ->> 'card_last4') = '4242', 'owner sees card digits';
  select * into p from remove_card_verification();
  assert not p.card_verified and p.card_last4 is null and p.card_brand is null, 'card verification removed';
  raise notice 'OK phone, card and sign-ins';
end $$;

-- ---------------------------------------------------------------- storage
do $$ begin
  insert into storage.objects (bucket_id, name) values ('avatars', '10000000-0000-0000-0000-00000000000b/avatar-1.webp');
  raise notice 'OK upload to own folder';
end $$;
do $$ begin
  insert into storage.objects (bucket_id, name) values ('avatars', '10000000-0000-0000-0000-00000000000a/evil.webp');
  raise exception 'upload into someone else''s folder';
exception when insufficient_privilege then raise notice 'OK uploads only to own folder';
end $$;
reset role;
do $$ begin
  assert (select public and file_size_limit = 2097152 and allowed_mime_types @> array['image/webp'] from storage.buckets where id = 'avatars'), 'bucket settings';
end $$;

-- ---------------------------------------------------------------- export, delete, clean-up
select pg_temp.as_user('10000000-0000-0000-0000-00000000000a', 'aal1');
set role authenticated;
do $$ declare j jsonb; begin
  j := export_my_data();
  assert jsonb_array_length(j -> 'username_history') = 1 and jsonb_array_length(j -> 'match_history') = 28, 'export has history';
  perform delete_my_account();
  raise notice 'OK export and delete';
end $$;
reset role;
do $$ begin
  assert not exists (select 1 from match_history where user_id = '10000000-0000-0000-0000-00000000000a'), 'history deleted';
  assert not exists (select 1 from username_history where user_id = '10000000-0000-0000-0000-00000000000a'), 'names deleted';
  insert into username_history (user_id, old_username, changed_at) values ('10000000-0000-0000-0000-00000000000e', 'Old_Bob', now() - interval '40 days');
  insert into user_reports (reporter_id, reported_id, reason, created_at) values
    (null, '10000000-0000-0000-0000-00000000000e', 'spam', now() - interval '13 months'),
    (null, '10000000-0000-0000-0000-00000000000e', 'other', now() - interval '11 months');
  perform bronze_cleanup();
  assert not exists (select 1 from username_history where old_username = 'Old_Bob'), 'old reservations cleaned up';
  assert not exists (select 1 from user_reports where created_at < now() - interval '1 year'), 'old reports cleaned up';
  assert exists (select 1 from user_reports), 'recent reports kept';
  raise notice 'OK cleanup';
end $$;
\echo ALL 002 CHECKS PASSED
