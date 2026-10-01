-- =====================================================================
-- Bronze — 006: download my data and delete my account, for online play.
--
-- Run after 001–005 (safe to run again).
--   export_my_data()     now also has your online games (with your moves),
--                        ratings and rating history, friends, invites and
--                        when you were last online.
--   delete_my_account()  now first takes you out of online games:
--                        - a game that hasn't started: your seat is removed
--                          (the game is called off if no person is left);
--                        - a game being played: a bot plays your seat to the
--                          end, as after a forfeit;
--                        - every game: your seat shows "Deleted player", and
--                          your account id is removed from it.
--                        The games stay, so the other players keep them.
--                        Then everything else is deleted, as before.
-- =====================================================================

-- One game without the player (a game row is locked while it changes, and its
-- version goes up, so a save the game server started earlier is refused and
-- redone on the new record).
create or replace function public.bronze_forget_player_in_game(p_game uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted constant text := 'Deleted player';
  uid text := p_user::text;
  g record;
  rec jsonb;
  pub jsonb;
  seats jsonb;
  mine int;
  hands jsonb;
begin
  select * into g from public.games where id = p_game for update;
  if not found then return; end if;
  select s.record into rec from public.game_secrets s where s.game_id = p_game;
  if rec is null then return; end if;
  select (s ->> 'seat')::int into mine from jsonb_array_elements(rec -> 'seats') s where s ->> 'userId' = uid;
  if mine is null then return; end if;
  pub := g.public_state;

  if rec ->> 'status' = 'lobby' then
    -- Leave the lobby: the seat goes and the others move up.
    select coalesce(jsonb_agg(jsonb_set(x.s, '{seat}', to_jsonb(x.n - 1)) order by x.n), '[]'::jsonb)
      into seats
      from (select s, row_number() over (order by (s ->> 'seat')::int) as n
            from jsonb_array_elements(rec -> 'seats') s where s ->> 'userId' is distinct from uid) x;
    rec := jsonb_set(rec, '{seats}', seats);
    if not exists (select 1 from jsonb_array_elements(seats) s where s ->> 'bot' is null and coalesce(s ->> 'userId', '') <> '') then
      rec := rec || jsonb_build_object('status', 'aborted', 'hostId', '', 'finishedAt', floor(extract(epoch from now()) * 1000),
                                       'result', jsonb_build_object('places', '[]'::jsonb, 'ratings', '[]'::jsonb, 'aborted', true));
    elsif rec ->> 'hostId' = uid then
      rec := jsonb_set(rec, '{hostId}', to_jsonb((select s ->> 'userId' from jsonb_array_elements(seats) s
                                                   where s ->> 'bot' is null and coalesce(s ->> 'userId', '') <> '' order by (s ->> 'seat')::int limit 1)));
    end if;
  else
    -- Started: the seat stays, without the person.
    rec := jsonb_set(rec, array['seats', mine::text], (rec #> array['seats', mine::text]) || jsonb_build_object('userId', null::text, 'username', deleted));
    if rec ->> 'status' = 'playing' then
      rec := jsonb_set(rec, array['seats', mine::text], (rec #> array['seats', mine::text]) || jsonb_build_object('forfeited', true, 'botPlaying', true));
    end if;
    if rec #> array['state', 'players', mine::text] is not null then
      rec := jsonb_set(rec, array['state', 'players', mine::text, 'name'], to_jsonb(deleted));
    end if;
    if pub #> array['players', mine::text] is not null then
      pub := jsonb_set(pub, array['players', mine::text, 'name'], to_jsonb(deleted));
    end if;
    if jsonb_typeof(rec #> '{result,ratings}') = 'array' then
      rec := jsonb_set(rec, '{result,ratings}', (
        select coalesce(jsonb_agg(case when r ->> 'userId' = uid then jsonb_set(r, '{userId}', '""') else r end), '[]'::jsonb)
        from jsonb_array_elements(rec #> '{result,ratings}') r));
    end if;
    if rec ->> 'hostId' = uid then rec := jsonb_set(rec, '{hostId}', '""'); end if;
  end if;

  rec := jsonb_set(rec, '{version}', to_jsonb(coalesce((rec ->> 'version')::int, g.version) + 1));
  select coalesce(jsonb_agg(jsonb_build_object('seat', h.seat, 'userId', h.user_id, 'cards', h.cards)), '[]'::jsonb) into hands
    from public.game_hands h where h.game_id = p_game and h.user_id is distinct from p_user;
  perform public.bronze_game_write(rec, pub, hands);
  -- bronze_game_write keeps the old rows' ids; make sure this one has none.
  update public.game_players set user_id = null where game_id = p_game and user_id = p_user;
end;
$$;

create or replace function public.bronze_forget_player(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  gid uuid;
begin
  for gid in select distinct p.game_id from public.game_players p where p.user_id = p_user loop
    perform public.bronze_forget_player_in_game(gid, p_user);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Delete my account (replacing 002's version)
-- ---------------------------------------------------------------------
-- The app removes the player's avatar images from Storage first (Storage
-- only allows that through its API); everything else goes here, in one
-- transaction.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  name text;
begin
  perform public.require_mfa();
  select p.username into name from public.profiles p where p.id = uid;
  if name is not null then
    delete from public.login_attempts a where a.username = lower(name);
  end if;
  perform public.bronze_forget_player(uid);
  delete from public.profiles p where p.id = uid;
  -- Ratings, rating history, friendships, invites, online status, the
  -- matchmaking queue and hands go with the user (on delete cascade).
  delete from auth.users u where u.id = uid;
end;
$$;

-- ---------------------------------------------------------------------
-- Download my data (replacing 002's version)
-- ---------------------------------------------------------------------
create or replace function public.export_my_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  perform public.require_mfa();
  return (select jsonb_build_object(
    'account', (
      select jsonb_build_object(
        'id', u.id,
        'email', u.email,
        'phone', nullif(u.phone, ''),
        'created_at', u.created_at,
        'email_confirmed_at', u.email_confirmed_at,
        'phone_confirmed_at', u.phone_confirmed_at,
        'last_sign_in_at', u.last_sign_in_at,
        'sign_in_methods', coalesce((select jsonb_agg(distinct i.provider) from auth.identities i where i.user_id = u.id), '[]'::jsonb),
        'two_factor_methods', coalesce((select jsonb_agg(f.factor_type) from auth.mfa_factors f where f.user_id = u.id and f.status = 'verified'), '[]'::jsonb),
        'details_from_sign_in', u.raw_user_meta_data)
      from auth.users u where u.id = uid),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = uid),
    'settings', (
      select jsonb_build_object('age_18_or_over', s.is_adult, 'friend_emails', s.email_friends, 'tournament_emails', s.email_tournaments)
      from public.account_settings s where s.user_id = uid),
    'consents', coalesce((
      select jsonb_agg(jsonb_build_object('kind', c.kind, 'granted', c.granted, 'version', c.version, 'at', c.created_at) order by c.created_at, c.id)
      from public.consents c where c.user_id = uid), '[]'::jsonb),
    'username_history', coalesce((
      select jsonb_agg(jsonb_build_object('old_username', h.old_username, 'changed_at', h.changed_at) order by h.changed_at)
      from public.username_history h where h.user_id = uid), '[]'::jsonb),
    'match_history', coalesce((
      select jsonb_agg(to_jsonb(m) - 'user_id' order by m.finished_at)
      from public.match_history m where m.user_id = uid), '[]'::jsonb),
    'reports_you_made', coalesce((
      select jsonb_agg(jsonb_build_object('reason', r.reason, 'details', r.details, 'at', r.created_at) order by r.created_at)
      from public.user_reports r where r.reporter_id = uid), '[]'::jsonb),
    'recovery_codes_left', (select count(*) from public.mfa_recovery_codes c where c.user_id = uid and c.used_at is null),
    'sign_ins', coalesce((select jsonb_agg(to_jsonb(s)) from public.recent_sign_ins() s), '[]'::jsonb),
    'saved_result_ids', (select count(*) from public.match_results r where r.user_id = uid),
    'failed_log_ins', (
      select jsonb_build_object('failures', a.failures, 'last_failed_at', a.last_failed_at, 'locked_until', a.locked_until)
      from public.login_attempts a join public.profiles p on lower(p.username) = a.username
      where p.id = uid),
    'ratings', coalesce((
      select jsonb_agg(jsonb_build_object('map', r.map_id, 'rating', round(r.rating::numeric, 1), 'rating_deviation', round(r.rd::numeric, 1),
                                          'games_played', r.games_played, 'peak_rating', round(r.peak_rating::numeric, 1), 'starting_level', r.start_level, 'updated_at', r.updated_at)
                       order by r.map_id)
      from public.ratings r where r.user_id = uid), '[]'::jsonb),
    'rating_history', coalesce((
      select jsonb_agg(jsonb_build_object('map', h.map_id, 'game_id', h.game_id, 'before', round(h.before::numeric, 1), 'after', round(h.after::numeric, 1),
                                          'change', round(h.delta::numeric, 1), 'mode', h.mode, 'at', h.created_at) order by h.created_at)
      from public.rating_history h where h.user_id = uid), '[]'::jsonb),
    'online_games', coalesce((
      select jsonb_agg(jsonb_build_object(
        'game_id', g.id, 'status', g.status, 'mode', g.mode, 'map', g.map_id, 'visibility', g.visibility, 'rated', g.rated,
        'created_at', g.created_at, 'started_at', g.started_at, 'finished_at', g.finished_at,
        'your_seat', p.seat, 'your_place', p.place, 'your_rating_change', p.rating_delta,
        'players', (select jsonb_agg(jsonb_build_object('seat', o.seat, 'username', o.username, 'bot', o.bot_level, 'place', o.place) order by o.seat)
                    from public.game_players o where o.game_id = g.id),
        'your_moves', coalesce((select jsonb_agg(jsonb_build_object('move', a.seq, 'action', a.action, 'by', a.by, 'at', a.created_at) order by a.seq)
                               from public.game_actions a where a.game_id = g.id and a.seat = p.seat), '[]'::jsonb))
        order by g.created_at)
      from public.game_players p join public.games g on g.id = p.game_id
      where p.user_id = uid), '[]'::jsonb),
    'friends', coalesce((
      select jsonb_agg(jsonb_build_object(
        'username', (select o.username from public.profiles o where o.id = case when f.a = uid then f.b else f.a end),
        'status', f.status, 'asked_by_you', f.requester = uid, 'since', f.since) order by f.since)
      from public.friendships f where uid in (f.a, f.b)), '[]'::jsonb),
    'game_invites', coalesce((
      select jsonb_agg(jsonb_build_object(
        'from', case when i.from_user = uid then 'you' else i.from_name end,
        'to', case when i.to_user = uid then 'you' else (select o.username from public.profiles o where o.id = i.to_user) end,
        'game_id', i.game_id, 'at', i.created_at) order by i.created_at)
      from public.game_invites i where uid in (i.from_user, i.to_user)), '[]'::jsonb),
    'last_online', (select pr.last_seen from public.presence pr where pr.user_id = uid),
    'quick_play_queue', (select q.entry from public.matchmaking_queue q where q.user_id = uid),
    'matches', 'Matches against the computer are played in your browser; the server keeps your totals and a line per finished match. Online games are listed under online_games.'
  ));
end;
$$;

-- Server-only helpers: nobody calls them directly.
revoke execute on function public.bronze_forget_player_in_game(uuid, uuid), public.bronze_forget_player(uuid) from public, anon, authenticated;
grant execute on function public.bronze_forget_player_in_game(uuid, uuid), public.bronze_forget_player(uuid) to service_role;
grant execute on function public.delete_my_account(), public.export_my_data() to authenticated;
