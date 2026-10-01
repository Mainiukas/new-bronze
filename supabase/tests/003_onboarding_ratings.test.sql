-- Behaviour checks for supabase/migrations/003_onboarding_ratings.sql. Run on a
-- scratch database after stub_supabase.sql, 001 (without its last two lines),
-- 002 and 003 (see supabase/tests/README.md). Every check raises an error when
-- it fails; the last line prints ALL 003 CHECKS PASSED.
\set ON_ERROR_STOP 1

insert into auth.users (id, email, encrypted_password, raw_user_meta_data, email_confirmed_at) values
 ('30000000-0000-0000-0000-00000000000a', 'ada3@example.com', extensions.crypt('Sprocket-42', extensions.gen_salt('bf')),
  '{"username":"Ada3","age_band":"18+","terms_version":"t1"}', now()),
 ('30000000-0000-0000-0000-00000000000b', 'bob3@example.com', extensions.crypt('Sprocket-42', extensions.gen_salt('bf')),
  '{"username":"Bob3","age_band":"18+","terms_version":"t1"}', now());

create function pg_temp.as_user(id text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', '', false),
         set_config('request.jwt.claims', jsonb_build_object('sub', id, 'aal', 'aal1')::text, false);
$$;

-- ---------------------------------------------------------------- a new player
select pg_temp.as_user('30000000-0000-0000-0000-00000000000a');
set role authenticated;
do $$ declare j jsonb; begin
  j := my_onboarding();
  assert (j ->> 'step')::int = 1 and j ->> 'done_at' is null, 'starts on slide 1, not done';
  assert (j ->> 'can_pick_level')::boolean and not (j ->> 'rules_accepted')::boolean, 'may pick a level; rules not accepted yet';
  perform set_onboarding_step(3);
  assert (my_onboarding() ->> 'step')::int = 3, 'resumes on the slide it left';
  raise notice 'OK progress is saved';
end $$;

do $$ begin
  perform set_onboarding_step(9);
  raise exception 'step 9 accepted';
exception when invalid_parameter_value then raise notice 'OK steps are 1 to 5';
end $$;

do $$ begin
  perform finish_onboarding('beginner');
  raise exception 'finished without accepting the rules';
exception when insufficient_privilege then raise notice 'OK the rules come first';
end $$;

do $$ begin
  perform accept_rules('2026-09');
  assert (my_onboarding() ->> 'rules_accepted')::boolean, 'rules accepted';
  raise notice 'OK consents recorded';
end $$;
reset role;
do $$ begin
  assert (select count(*) from consents where user_id = '30000000-0000-0000-0000-00000000000a' and version = '2026-09' and granted
          and kind in ('terms', 'privacy', 'fair-play')) = 3, 'one row per consent';
end $$;

set role authenticated;
do $$ begin
  perform finish_onboarding('wizard');
  raise exception 'unknown level accepted';
exception when invalid_parameter_value then raise notice 'OK only the four levels';
end $$;

do $$ declare j jsonb; begin
  j := finish_onboarding('intermediate');
  assert (j ->> 'rating')::int = 1200 and j ->> 'map_id' = 'wales-and-the-west', 'intermediate starts at 1200';
  j := my_onboarding();
  assert j ->> 'done_at' is not null and (j ->> 'step')::int = 5, 'done';
  raise notice 'OK finishing sets the rating and the done date';
end $$;

do $$ begin
  assert (select rating = 1200 and rd = 350 and volatility = 0.06 and games_played = 0 and peak_rating = 1200 and start_level = 'intermediate'
          from ratings where user_id = '30000000-0000-0000-0000-00000000000a'), 'Glicko-2 start: RD 350, volatility 0.06';
  raise notice 'OK rating row';
end $$;

-- Players read ratings (the leaderboard) but can never write them.
do $$ begin
  update ratings set rating = 3000 where user_id = '30000000-0000-0000-0000-00000000000a';
  raise exception 'a player wrote their own rating';
exception when insufficient_privilege then raise notice 'OK ratings are read-only to players';
end $$;
do $$ begin
  insert into rating_history (user_id, map_id, before, after, delta, mode) values ('30000000-0000-0000-0000-00000000000a', 'x', 1, 2, 1, 'normal');
  raise exception 'a player wrote rating history';
exception when insufficient_privilege then raise notice 'OK rating history is read-only to players';
end $$;
reset role;

-- After a rated game the level can't be picked again.
update ratings set games_played = 1 where user_id = '30000000-0000-0000-0000-00000000000a';
set role authenticated;
do $$ begin
  assert not (my_onboarding() ->> 'can_pick_level')::boolean, 'no level after a rated game';
  perform finish_onboarding('advanced');
  raise exception 'level changed after a rated game';
exception when insufficient_privilege then raise notice 'OK the level is fixed once rated';
end $$;
reset role;

-- Another player sees Ada's rating (public), and visitors do too.
select pg_temp.as_user('30000000-0000-0000-0000-00000000000b');
set role authenticated;
do $$ begin
  assert (select rating from ratings where user_id = '30000000-0000-0000-0000-00000000000a') = 1200, 'ratings are public';
  raise notice 'OK ratings are public';
end $$;
reset role;

-- Visitors can't run the welcome-slide functions.
set role anon;
do $$ begin
  perform my_onboarding();
  raise exception 'a visitor ran my_onboarding';
exception when insufficient_privilege then raise notice 'OK visitors have no welcome slides';
end $$;
reset role;

-- Deleting an account deletes its ratings.
delete from auth.users where id = '30000000-0000-0000-0000-00000000000a';
do $$ begin
  assert not exists (select 1 from ratings where user_id = '30000000-0000-0000-0000-00000000000a'), 'ratings go with the account';
end $$;

select 'ALL 003 CHECKS PASSED';
