# Brass rules: status

What's built, what's still needed from you, and every place where our board or
`RULES.md` left a choice. The rules are in `src/rules`, the match screen in
`src/pages/BrassGame.tsx` and `src/components/brass`.

## 1. Values still to copy (docs/TILES.md)

`docs/TILES.md` is the one file for every number. `npm run tiles` regenerates
`src/rules/tiles.ts` from it, and `npm run build` stops (listing what's missing)
until nothing is `?` any more. `node scripts/tiles.mjs --check` prints the full
labelled list. Today: **340 values**.

| Section | Values |
| --- | --- |
| Income track (first/last space of each level, −10 … 30) | 82 |
| Coal mine I–IV | 44 |
| Iron works I–IV | 44 |
| Port I–IV | 40 |
| Cotton mill I–IV (VP of level I is known: 5) | 39 |
| Shipyard 0 (locked), I, II | 21 |
| Coal market spaces | 8 |
| Iron market spaces | 8 |
| Distant market: tiles and track (add a row per tile and per track row) | 4 |
| Cards (per town, per industry) | 43 |
| Hubs: link value and market access | 6 |
| Towns with a port slot give market access | 1 |

48 of these are my proposals for our map (written like `3?`: delete the `?` to
accept them). They are the cards per town and per industry, the market access
rows, and "Shipyard II: not in canal era". The rest are plain `?` to copy from
the player mat.

`src/rules/__snapshots__/tiles.test.ts.snap` shows the whole table laid out
like the mat. After filling it in, run `npm run tiles` and then `npx vitest -u`,
and check the new snapshot line by line against the physical mat.

## 2. Rules that don't map onto our board (need your answer)

| # | Rulebook | Our board | What I did / propose |
| --- | --- | --- | --- |
| 1 | Location cards name Lancashire towns | 19 different towns | **Proposal** in TILES.md: one card per building slot (43), and 21 industry cards, so the deck lasts the rail era |
| 2 | 2- and 3-player games remove some location cards | no such marks | **Proposal**: our map's rings. Outer-ring cards (Caernarfon, Barnstaple, Exeter, Plymouth) are only in 4-player games; middle-ring cards (Wrexham, Carmarthen, Merthyr, Nottingham, Southampton) only in 3+ |
| 3 | Trade-icon places for the distant market | hubs: The North, London, West Wales | Done as RULES.md §7 says. Their **link value** is still `?` |
| 4 | The coal/iron market needs a connection to a market or port location "as printed" | nothing printed | **Proposal**: a hub, or a town with a port slot |
| 5 | Several shipyard locations | one shipyard slot, in Plymouth, which is a rail-only town | Not changed. Shipyard I can't be built in the canal era at all, and the "2 shipyards" achievement can't be earned. **Proposal**: add a port/shipyard option to Bristol and Southampton |
| 6 | — | stops (Brecon, Reading, Taunton) | Links pass through them. Nothing is built there, they have no cards, and they have link value 0 |
| 7 | — | rail-only places (Plymouth, Taunton, The North) | No canals to them, and no building there in the canal era |
| 8 | One game length (8/9/10 rounds per era) | lobby modes Normal / Blitz / Bullet with their own rounds and map rings | All three play the full Brass rules on the whole map. They now differ only in how long the computer players pause |
| 9 | — | the drawn practice maps have no ports or hubs | Brass matches always use the painted board |
| 10 | Distant market tiles and track | — | Their shape is in TILES.md; the values are `?` |

## 3. How I read RULES.md where it leaves a choice (please confirm)

- **Link scoring:** a link scores the link icons of **flipped** tiles at both ends, plus a hub's value.
- **Building with an industry card:** it always needs your network, even when you have nothing on the board, which is what RULES.md says literally. The "anywhere" exception is only written for links.
- **Overbuilding:**
  - Only your own tile needs a higher level; RULES.md sets no level rule for another player's mine or works.
  - "No cubes left on the whole board" also counts the market.
- **New mines and works selling to the market:** optional. The player chooses it in the confirm popup, and it defaults to yes. It needs a market connection for both coal and iron, as RULES.md says; the printed rulebook may differ for iron.
- **Loan:** the income marker goes to the top space of the lower level.
- **Coal for a rail:** it comes from mines connected to either end of the new rail, and the rail itself counts as connected.
- **Negative income:** tiles are sold automatically, unflipped ones first, then those with the fewest VP. Letting the player choose is not built yet.
- **Distant market:**
  - If its tile deck is empty, the sale fails.
  - "Income for the marker row" moves the income marker.
- **Hands and eras:**
  - Hands are refilled at the end of the round (RULES.md §2), not after each turn.
  - An era ends after its 8/9/10 rounds.
  - At the end of the canal era, every level I tile goes, of every industry.

## 4. Done

- **Tile table:**
  - `docs/TILES.md` → `src/rules/tiles.ts`, with the build guard;
  - a snapshot test of the whole table;
  - consistency checks (tile totals, prices, income track).
- **Rules engine:** pure and seeded, with every rule in RULES.md §1–§6. Every illegal action throws a coded error. 53 rule tests.
- **Computer players:** they choose only legal moves. Simulated 2-, 3- and 4-player games check:
  - no errors;
  - money never goes negative;
  - cubes and markets stay in range;
  - the final score matches an independent count.
- **Match screen**, matching `ui-mockup.png`:
  - the industry rows and the levels popup;
  - the locked shipyard and the upgrade bar;
  - the canal triangle, and RAIL / 2 RAILS in the rail era;
  - loan, sell and skip;
  - the stats bar, opponents, hand and top bar with the markets;
  - confirm popups and toasts;
  - pass-and-play hand-off and results;
  - a bottom sheet on narrow screens.
- **Lobby:** random colours each match (the colour picker is gone), Brass saves, and stats and achievements from the Brass result.
- **Languages:** all new text in English, Lithuanian, German, French and Spanish.

## 5. Left

- Fill in `docs/TILES.md` (above); until then the site can't be built for production.
- Answer §2 and §3.
- The **Rules / How to Play** screen and the lobby's mode descriptions still describe the old rules, in all five languages. The old engine (`src/game`) stays until that's rewritten, because the map sandbox and the rules screen still use it.
- On the match screen:
  - a game log;
  - the move timer;
  - picking which two cards pay for a two-card build;
  - picking among equally close coal mines and among iron works (the default is your own, then board order);
  - picking the tiles to sell when income can't be paid.
- Computer strength: "easy" sometimes beats "hard". Tune the levels once the real numbers are in.
- Achievements: retune them for Brass scores (e.g. "Tycoon: 55 VP").
