# Brass rules: status

What's built, what's still needed from you, and every place where our board or
`RULES.md` left a choice. The rules are in `src/rules`, the match screen in
`src/pages/BrassGame.tsx` and `src/components/brass`.

## 1. Values still to copy (docs/TILES.md)

`docs/TILES.md` is the one file for every tile, market and track number (the
cards are in `src/rules/cards.ts`, see §2). `npm run tiles` regenerates
`src/rules/tiles.ts` from it, and `npm run build` stops (listing what's
missing) until nothing is `?` any more. `node scripts/tiles.mjs --check`
prints the full labelled list. Today: **297 values**.

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
| Hubs: link value and market access | 6 |
| Towns with a port slot give market access | 1 |

5 of these are my proposals for our map (written like `yes?`: delete the `?`
to accept them): the three hubs' market access, "towns with a port slot give
market access", and "Shipyard II: not in canal era". The rest are plain `?` to
copy from the player mat.

`src/rules/__snapshots__/tiles.test.ts.snap` shows the whole table laid out
like the mat. After filling it in, run `npm run tiles` and then `npx vitest -u`,
and check the new snapshot line by line against the physical mat.

## 2. The cards (src/rules/cards.ts)

Every card number is in `src/rules/cards.ts`; a test checks the full deck is 64.

- **Location cards:** one per building slot, 43. Birmingham and Bristol have 4
  each; Stoke-on-Trent, Wolverhampton, Merthyr Tydfil and Southampton 3; Derby,
  Leicester, Gloucester, Oxford, Swindon, Wrexham, Carmarthen, Nottingham,
  Exeter and Plymouth 2; Lichfield, Caernarfon and Barnstaple 1.
- **Industry cards:** 21 (cotton mill 7, coal mine 5, iron works 3, port 4,
  shipyard 2).

### Player-count removals: for your approval

The rulebook's decks are 64 / 54 / 40 cards for 4 / 3 / 2 players, which is
what makes its 8 / 9 / 10 rounds per era (an era lasts until the hands are
played out). So I removed exactly 10 cards for 3 players and 24 for 2, taking
the outer ring first:

| Players | Location cards left out | Cards |
| --- | --- | --- |
| 4 | none | 64 |
| 3 | the outer ring: Caernarfon 1, Barnstaple 1, Exeter 2, Plymouth 2; and Carmarthen 2, Nottingham 2 | 54 |
| 2 | all of the above, and the rest of the middle ring: Wrexham 2, Merthyr Tydfil 3, Southampton 3; and Stoke-on-Trent 3, Leicester 2, Lichfield 1 | 40 |

The towns stay on the board: without their cards they can still be built in
with an industry card (in your network) or the two-card joker, as in the
rulebook. For comparison, leaving out only the outer ring in 2-player games
(6 cards) gives 58 cards and 15 rounds per era.

### Smaller maps (Blitz, Bullet)

Blitz plays without the outer ring and Bullet only the core. The towns outside
are out of play (no cards, no building, no links) and are drawn faded. The
rounds follow the deck:

| Mode | 4 players | 3 players | 2 players |
| --- | --- | --- | --- |
| Normal | 64 cards, 8 rounds per era | 54, 9 | 40, 10 |
| Blitz | 58, 8 (the last round short) | 54, 9 | 40, 10 |
| Bullet | 46, 6 | 46, 8 | 40, 10 |

So Blitz is only a little shorter than Normal, and with 2 players nothing
changes. If Blitz and Bullet should be shorter games, they need their own
removals (or fewer industry cards).

## 3. Rules that don't map onto our board (need your answer)

| # | Rulebook | Our board | What I did / propose |
| --- | --- | --- | --- |
| 1 | Trade-icon places for the distant market | hubs: The North, London, West Wales | Done as RULES.md §7 says. Their **link value** is still `?` |
| 2 | The coal/iron market needs a connection to a market or port location "as printed" | nothing printed | **Proposal**: a hub, or a town with a port slot |
| 3 | Several shipyard locations | one shipyard slot, in Plymouth, which is a rail-only town | Not changed. Shipyard I can't be built in the canal era at all, and the "2 shipyards" achievement can't be earned. **Proposal**: add a port/shipyard option to Bristol and Southampton |
| 4 | — | stops (Brecon, Reading, Taunton) | Links pass through them. Nothing is built there, they have no cards, and they have link value 0 |
| 5 | — | rail-only places (Plymouth, Taunton, The North) | No canals to them, and no building there in the canal era |
| 6 | — | the drawn practice maps have no ports or hubs | Brass matches always use the painted board |
| 7 | Distant market tiles and track | — | Their shape is in TILES.md; the values are `?` |

## 4. How I read the rules where they leave a choice (please confirm)

- **Loans and the Rothschild marker:**
  - Loans stop once the draw deck is empty, as RULES.md §3 says.
  - The marker sits above the last 2 cards per player. When the draw reaches it,
    the deck shows the no-loan coin with "No more loans after this round — this is
    the last round to take one", and LOAN shows the coin as a warning.
  - With 2 cards per player under it, the deck runs out exactly one round later.
    From then on, loans are refused and LOAN is disabled with the coin.
  - Your spec also says "NO MORE LOANS from then on" at the marker. If loans
    should stop at the marker itself, change `LOANS_STOP` in `cards.ts` to
    `'marker'`.
  - "The round after that is the last": I read this as the last round for loans.
    The game still ends when the hands are played out, as in the rulebook.
- **Canal era, deck used up:** RULES.md says "no loans once the draw deck is empty"
  without naming an era, so no loans are allowed then in the canal era either.
- **Hands and eras:**
  - Hands refill after each turn (your card spec; RULES.md now says so too).
  - An era ends when every hand is played out.
  - Income is paid at the end of the canal era, but not after the game's last round.
  - At the end of the canal era, every level I tile of every industry goes, along
    with every canal.
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

## 5. Done

- **Tile table:**
  - `docs/TILES.md` → `src/rules/tiles.ts`, with the build guard;
  - a snapshot test of the whole table;
  - consistency checks (tile totals, prices, income track).
- **Rules engine:** pure and seeded, with every rule in RULES.md §1–§6. Every illegal action throws a coded error.
- **Cards** (see §2):
  - **Deck:** the deck and player-count removals from `cards.ts`, 1 card per
    player set aside in the canal era, refills after each turn, eras ending when
    the hands are played out, and the rail-era reshuffle and Rothschild marker.
  - **Legal options per card:**
    - a location card builds in its town, an industry card in your network, and
      the two-card joker anywhere;
    - slot priority, coal and iron are checked;
    - any card pays for the other actions.
  - **Computer players:** they discard their least useful card.
- **Tests:** 86 for the rules, including the deck, dealing, the canal set-aside, the marker and loans, no income in the last round, refills, the joker, card legality, slot priority, the canal-era limit and the rail-era removal. Simulated 2-, 3- and 4-player games check:
  - no errors;
  - money never goes negative;
  - cubes and markets stay in range;
  - the final score matches an independent count.
- **Match screen**, matching `ui-mockup.png`:
  - the industry rows and the levels popup;
  - the locked shipyard and the upgrade bar;
  - the canal triangle, and RAIL / 2 RAILS in the rail era;
  - loan, sell and skip;
  - the stats bar, opponents and top bar with the markets;
  - confirm popups and toasts;
  - pass-and-play hand-off and results;
  - a bottom sheet on narrow screens.
- **Cards on screen:**
  - **The hand:**
    - a fan at the bottom of the screen, which re-centres as it shrinks;
    - hover lifts a card; on touch screens, a tap enlarges it;
    - picking a card highlights it and lights up only what it allows;
    - the "Play … as:" bar has every option with its reason when disabled;
    - a second card brings up the joker prompt; Esc backs out.
  - **The deck:**
    - the deck with its count;
    - the train once the canal deck is used up;
    - the no-loan coin on the deck and on LOAN;
    - the discard pile beside it.
  - **Animations:**
    - dealing, drawing and playing (other players' cards are shown face up);
    - canals and level I tiles fade off at the end of the canal era;
    - none with reduced motion.
- **Lobby:** random colours each match (the colour picker is gone), Brass saves, and stats and achievements from the Brass result.
- **Languages:** all new text in English, Lithuanian, German, French and Spanish.

## 6. Left

- Fill in `docs/TILES.md` (§1); until then the site can't be built for production.
- Approve the player-count removals (§2) and answer §3 and §4.
- The **Rules / How to Play** screen and the lobby's mode descriptions still describe the old rules, in all five languages. (The mode cards and the setup summary now show the Brass rounds per era for the chosen player count, and £30 each.) The old engine (`src/game`) stays until that's rewritten, because the map sandbox and the rules screen still use it.
- On the match screen:
  - a game log;
  - the move timer;
  - picking among equally close coal mines and among iron works (the default is your own, then board order);
  - picking the tiles to sell when income can't be paid.
- Computer strength: "easy" sometimes beats "hard". Tune the levels once the real numbers are in.
- Achievements: retune them for Brass scores (e.g. "Tycoon: 55 VP").
- `tools/build-cards.js` is as you sent it: it uses `require` (the project is an ES module, so it needs renaming to `.cjs` to run) and paths on your machine. After regenerating the fronts, run `node tools/card-webp.mjs` for the web-sized copies the game uses.
