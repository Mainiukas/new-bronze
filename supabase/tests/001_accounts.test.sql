-- Behaviour checks for supabase/migrations/001_accounts.sql. Run on a scratch
-- database after stub_supabase.sql and the migration (see supabase/tests/README.md).
-- Every check raises an error when it fails; the last line prints ALL SQL CHECKS PASSED.
\set ON_ERROR_STOP 1
-- Sign-ups (as Supabase Auth does it: inserting into auth.users).
insert into auth.users (id, email, encrypted_password, raw_user_meta_data, email_confirmed_at) values
 ('00000000-0000-0000-0000-00000000000a', 'ada@example.com', extensions.crypt('Sprocket-42', extensions.gen_salt('bf')),
  '{"username":"Ada","age_band":"18+","terms_version":"2026-09-27","marketing":true}', now()),
 ('00000000-0000-0000-0000-00000000000b', 'teen@example.com', extensions.crypt('Sprocket-42', extensions.gen_salt('bf')),
  '{"username":"Teen_1","age_band":"14-17","terms_version":"2026-09-27","marketing":true}', now()),
 ('00000000-0000-0000-0000-00000000000c', 'grace@gmail.com', null, '{"full_name":"Grace Hopper","avatar_url":"https://example.com/g.png"}', now()),
 ('00000000-0000-0000-0000-00000000000d', 'late@example.com', null, '{"username":"ada","age_band":"18+","terms_version":"2026-09-27"}', now());

do $$ begin
  assert (select username from profiles where id = '00000000-0000-0000-0000-00000000000a') = 'Ada', 'email sign-up gets its username';
  assert (select marketing_consent and terms_version = '2026-09-27' and not needs_username from profiles where id = '00000000-0000-0000-0000-00000000000a'), 'consent fields';
  assert (select count(*) from consents where user_id = '00000000-0000-0000-0000-00000000000a') = 4, 'four consent records';
  assert (select not marketing_consent from profiles where id = '00000000-0000-0000-0000-00000000000b'), 'no marketing under 18';
  assert (select needs_username and username ~ '^player_[0-9a-f]{12}$' and avatar = 'https://example.com/g.png' from profiles where id = '00000000-0000-0000-0000-00000000000c'), 'google: temporary name';
  assert (select needs_username from profiles where id = '00000000-0000-0000-0000-00000000000d'), 'taken name at sign-up: temporary name';
  raise notice 'OK sign-up trigger';
end $$;

-- Not logged in (anon).
set role anon;
do $$ begin
  assert not is_username_available('ADA'), 'taken, any case';
  assert is_username_available('Brunel'), 'free';
  assert email_for_username('ada', 'Sprocket-42') = 'ada@example.com', 'right password gives the email';
  assert email_for_username('ada', 'wrong') is null, 'wrong password gives nothing';
  assert email_for_username('nobody', 'Sprocket-42') is null, 'unknown username gives nothing';
  raise notice 'OK anon RPCs';
end $$;
do $$ begin
  perform 1 from profiles;
  raise exception 'anon could read profiles';
exception when insufficient_privilege then raise notice 'OK anon cannot read profiles';
end $$;
do $$ begin
  perform record_match_result(10, true);
  raise exception 'anon could record a match';
exception when insufficient_privilege then raise notice 'OK anon cannot record matches';
end $$;
-- Rate limit: 5 wrong, then even the right password is refused for 30 s.
do $$ begin
  for i in 1..4 loop perform email_for_username('Teen_1', 'wrong'); end loop;
  perform email_for_username('Teen_1', 'wrong');
  assert email_for_username('Teen_1', 'Sprocket-42') is null, 'paused after 5 wrong passwords';
  raise notice 'OK log-in pause';
end $$;
reset role;

-- Logged in as Ada.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  assert (select count(*) from profiles) = 4, 'signed in: reads all public profiles';
  raise notice 'OK authenticated reads public fields';
end $$;
do $$ begin
  perform marketing_consent from profiles;
  raise exception 'private column readable';
exception when insufficient_privilege then raise notice 'OK private columns hidden';
end $$;
do $$ begin
  update profiles set wins = 99 where id = auth.uid();
  raise exception 'wins writable';
exception when insufficient_privilege then raise notice 'OK wins not writable by the player';
end $$;
do $$ declare n int; begin
  update profiles set avatar = 'https://example.com/a.png' where id = auth.uid();
  update profiles set username = 'Hacked' where id = '00000000-0000-0000-0000-00000000000b';
  get diagnostics n = row_count;
  assert n = 0, 'cannot change someone else''s row';
  assert (select avatar from profiles where id = auth.uid()) = 'https://example.com/a.png', 'own avatar changed';
  raise notice 'OK own row only';
end $$;
do $$ declare p profiles; begin
  select * into p from record_match_result(44, true, '11111111-1111-1111-1111-111111111111', 5, 'black-country', array['first-shift','foreman']);
  assert p.matches = 1 and p.wins = 1 and p.best_score = 44 and p.goods_shipped = 5, 'match counted';
  assert p.maps_played = array['black-country'] and p.achievements ? 'foreman', 'map and achievements';
  select * into p from record_match_result(44, true, '11111111-1111-1111-1111-111111111111', 5, 'black-country', array['foreman']);
  assert p.matches = 1, 'same id counted once';
  select * into p from record_match_result(20, false);
  assert p.matches = 2 and p.wins = 1 and p.best_score = 44, 'a loss, without an id';
  raise notice 'OK record_match_result';
end $$;
do $$ begin
  perform record_match_result(5000, true);
  raise exception 'absurd score accepted';
exception when invalid_parameter_value then raise notice 'OK score range checked';
end $$;
do $$ declare p profiles; begin
  select * into p from merge_guest_stats('22222222-2222-2222-2222-222222222222', 3, 2, 50, 7, array['pennine-mills','black-country'], '{"first-shift":"2020-01-01T00:00:00.000Z","veteran":"2026-01-01T00:00:00.000Z"}');
  assert p.matches = 5 and p.wins = 3 and p.best_score = 50 and p.goods_shipped = 12, 'guest record added';
  assert p.maps_played = array['black-country','pennine-mills'], 'maps combined';
  assert p.achievements ->> 'first-shift' = '2020-01-01T00:00:00.000Z' and p.achievements ? 'veteran', 'earliest date kept';
  select * into p from merge_guest_stats('22222222-2222-2222-2222-222222222222', 3, 2, 50, 7, '{}', '{}');
  assert p.matches = 5, 'same merge applied once';
  raise notice 'OK merge_guest_stats';
end $$;
do $$ begin
  perform merge_guest_stats('33333333-3333-3333-3333-333333333333', 1, 5, 0, 0, '{}', '{}');
  raise exception 'wins > matches accepted';
exception when invalid_parameter_value then raise notice 'OK guest record checked';
end $$;
do $$ declare e record; begin
  select * into e from email_preferences();
  assert e.is_adult and e.email_marketing, 'preferences read';
  select * into e from set_email_preferences(false, true, false, 'test');
  assert not e.email_marketing and e.email_friends, 'preferences changed';
  assert jsonb_typeof(export_my_data()) = 'object' and export_my_data() -> 'profile' ->> 'username' = 'Ada', 'export';
  raise notice 'OK email preferences and export';
end $$;
reset role;

-- The teen: marketing only after confirming 18+.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  perform set_email_preferences(true, false, false, 'test');
  raise exception 'marketing allowed under 18';
exception when invalid_parameter_value then raise notice 'OK no marketing under 18';
end $$;
do $$ declare e record; begin
  perform confirm_adult();
  select * into e from set_email_preferences(true, false, false, 'test');
  assert e.email_marketing, 'marketing after 18+';
  raise notice 'OK confirm_adult';
end $$;
reset role;

-- Grace (Google): choose a username.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  perform finish_signup('ada', '18+', false, '2026-09-27');
  raise exception 'taken name accepted';
exception when unique_violation then raise notice 'OK finish_signup refuses a taken name (23505)';
end $$;
do $$ declare p profiles; begin
  select * into p from finish_signup('Grace_H', '18+', true, '2026-09-27');
  assert p.username = 'Grace_H' and not p.needs_username and p.marketing_consent, 'username chosen';
  select * into p from finish_signup('Other', '18+', false, '2026-09-27');
  assert p.username = 'Grace_H', 'second call changes nothing';
  raise notice 'OK finish_signup';
end $$;
reset role;

-- Unsubscribe link (not logged in).
do $$ declare token uuid; begin
  select unsubscribe_token into token from account_settings where user_id = '00000000-0000-0000-0000-00000000000c';
  set local role anon;
  assert unsubscribe(token, 'all'), 'unsubscribed';
  assert not unsubscribe('99999999-9999-9999-9999-999999999999', 'all'), 'unknown token';
  reset role;
  assert not (select marketing_consent from profiles where id = '00000000-0000-0000-0000-00000000000c'), 'marketing off';
  raise notice 'OK unsubscribe';
end $$;

-- Delete my account.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select delete_my_account();
reset role;
do $$ begin
  assert not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-00000000000a'), 'auth user gone';
  assert not exists (select 1 from profiles where id = '00000000-0000-0000-0000-00000000000a'), 'profile gone';
  assert not exists (select 1 from consents where user_id = '00000000-0000-0000-0000-00000000000a'), 'consents gone';
  assert not exists (select 1 from match_results where user_id = '00000000-0000-0000-0000-00000000000a'), 'result ids gone';
  assert is_username_available('ada'), 'name free again';
  raise notice 'OK delete_my_account';
end $$;

-- Clean-up: an unfinished Google sign-up older than 7 days goes; a finished one stays.
update auth.users set created_at = now() - interval '8 days' where id in ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d');
select bronze_cleanup();
do $$ begin
  assert exists (select 1 from auth.users where id = '00000000-0000-0000-0000-00000000000c'), 'finished sign-up kept';
  assert not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-00000000000d'), 'unfinished sign-up removed';
  raise notice 'OK cleanup';
end $$;
\echo ALL SQL CHECKS PASSED
