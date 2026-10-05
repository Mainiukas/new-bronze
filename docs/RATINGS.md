# Ratings

Bronze rates online games with **Glicko-2** (Glickman, 2013), the system
chess.com uses, adapted to games of 2–4 players. Every number below lives in
`src/rating/config.ts`; the maths is `src/rating/glicko2.ts` (with tests in
`glicko2.test.ts`).

## Who has a rating

- One rating **per map and per number of players**: 2-, 3- and 4-player games
  each have their own rating (table `ratings`, one row per player and key
  `<map>@2p`, `<map>@3p` or `<map>@4p`), with every change kept in
  `rating_history` under the same key. The leaderboard has a tab per player
  count, and the lobby and profiles show all three.
- A new player starts at the level they pick on the last welcome slide:
  New 800, Beginner 1000, Intermediate 1200, Advanced 1400; RD 350,
  volatility 0.06. That level is saved under the plain map key; a player's
  first game at each player count starts from it (a rating from before the
  split, under the same plain key, is the starting point the same way). A
  player with no row at all is shown 1000 and starts there.
- **Provisional** ("1000?") while fewer than 10 rated games are played, or
  while the RD is above 110. The "?" has a tooltip saying how many of the 10
  games are played and how sure the number is (± 2 RD).
- The RD grows again for every day (one rating period) without a rated game,
  up to 350, so a rating after a long break can be provisional again.

## What a game does to it

- Every pair of players in a finished game counts as a head-to-head result by
  finishing place: the higher place wins, the same place is a draw. Each
  player gets one Glicko-2 update from all their pairs.
- A forfeit (running out of time on the chess clock, or leaving after the first round) finishes last.
- The change is scaled by the mode: Normal 1.0, Blitz 0.7, Bullet 0.4.

## Which games are rated

| Rated | Unrated |
| --- | --- |
| Public games in Normal mode between people only (no bot in any seat) | Private games, unless the host ticks **Rated** |
| Private games the host marked **Rated** (people only) | Any game with a bot |
| Games that end normally, or by someone forfeiting | The tutorial, and games against the computer |
| | Games called off because someone left in the first round |

The room shows "Rated game" or "Unrated game" from the same rule the server
applies when the game starts.

## Where it's computed

Only in the `game` Edge Function (`src/server/server.ts`, bundled into
`supabase/functions/_shared/game-server.js`). Players can read `ratings` and
`rating_history` but never write them: the database lets only the server's
service-role functions (`bronze_ratings_save`) and the one-time starting level
(`finish_onboarding`) change them.

## Quick play

Quick play looks for players within ±150 rating points of you, widening the
range by 50 every 10 seconds you wait (`MATCHMAKING` in the config). It makes a
public, rated Normal game.
