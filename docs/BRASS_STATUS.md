# Brass rules: status

What's built, what's still needed from you, and every place where our board or
`RULES.md` left a choice. The rules are in `src/rules`, the match screen in
`src/pages/BrassGame.tsx` and `src/components/brass`.

## 1. The game's numbers (src/rules/config)

Every rules number lives in `src/rules/config`:

- `tiles.ts`, generated from `docs/TILES.md` by `npm run tiles`: the player mat (37 industry tiles
  per player), the income track and the hubs;
- `markets.ts`: the coal and iron markets and the cube supply (24 coal, 16 iron);
- `distantMarket.ts`: the 12 distant-market tiles and the track;
- `cards.ts`: the deck (§2);
- `game.ts`: setup and fixed costs (£30, 8 cards, loans £10/£20/£30, link costs, …).

Each value is either checked (a plain value) or not yet (`unverified(...)` in the TypeScript files,
a value ending in `?` in TILES.md; `verified: false`). The game plays with unverified values, and
`npm run tiles` lists every one of them at the bottom of `docs/TILES.md`, under **To check against
the physical game**. To correct one, change it where it's defined (TILES.md or the config file),
drop the `?` / `unverified(...)` once it's checked, and run `npm run tiles`. The build stops only
if a value is unknown altogether (`?` on its own) or the generated files are out of date.

Where values came from:

- **Your numbers (Phase 1 spec), all to verify:** every industry tile, the link VP (1 per tile),
  the cube supply, the distant-market tiles, the deck (66 cards, the split and the player-count
  marks) and the 2-player card removals.
- **Rulebook, checked:** £30, 8 cards, loans, £5 when a market is empty, markets full at the start,
  cards removed per era with 3 and 4 players (9 / 6 and 6 / 2).
- **Proposals, to verify:** the income track (the usual Brass track: spaces 0–10 one per level,
  then 2, 3 and 4 per level), the market steps (£1–£4, two spaces each), the hubs' link value (2),
  level I not buildable in the rail era, every level developable, and which towns' cards carry
  the player-count marks.
- **Changed from before:** cotton mill I is 3 VP (TILES.md used to say 5).

## 2. The cards (src/rules/config/cards.ts)

66 cards: 43 location cards (one per building slot) and 23 industry cards (cotton mill 8, coal
mine 5, iron works 3, port 5, shipyard 2). Cards with a player-count mark are left out of smaller
games, and some cards go aside face down at the start of each era (the canal era's come back for
the rail era):

| Players | Marks left out | Cards | Put aside: canal / rail | Rounds per era |
| --- | --- | --- | --- | --- |
| 4 | none | 66 | 6 / 2 | 8 |
| 3 | "4": Caernarfon 1, Barnstaple 1, Exeter 2, Plymouth 2 | 60 | 9 / 6 | 9 |
| 2 | also "3": Carmarthen 2, Nottingham 2, Wrexham 2, Merthyr Tydfil 3, Southampton 3, Stoke-on-Trent 3, Leicester 2, Lichfield 1 | 42 | 4 / 2 (to verify) | 10 |

The towns stay on the board: without their cards they can still be built in with an industry card
(in your network) or the two-card joker, as in the rulebook. On a smaller map (Blitz, Bullet: not
playable yet) only the towns on it have cards, and 1 card per player is put aside in the canal era.

## 3. Rules that don't map onto our board (need your answer)

| # | Rulebook | Our board | What I did / propose |
| --- | --- | --- | --- |
| 1 | Trade-icon places for the distant market | hubs: The North, London, West Wales | Done as RULES.md §7 says. Their **link value** is still `?` |
| 2 | The coal/iron market needs a connection to a market or port location "as printed" | nothing printed | Decided in the gameplay spec: a hub, or a town with a port slot (a "trade location") |
| 3 | Several shipyard locations | shipyard slots in Southampton, Carmarthen and Plymouth (rail-only) | Done: Southampton and Carmarthen have a shipyard slot, so shipyards can be built in the canal era too (see TILES.md, "Our map: slot and link changes") |
| 4 | — | stops (Brecon, Reading, Taunton) | Links pass through them. Nothing is built there, they have no cards, and they have link value 0 |
| 5 | — | rail-only places (Plymouth, Taunton, The North) | No canals to them, and no building there in the canal era |
| 6 | — | the drawn practice maps have no ports or hubs | Brass matches always use the painted board |
| 7 | Distant market tiles and track | — | 12 tiles in `config/distantMarket.ts` (values still `todo(...)`). The track is set from your layout: rows £3, £2, £1, £0 of two spaces each, then X, walked in the order 3a, 3b, 2b, 2a, 1a, 1b, 0b, 0a, X (`distantMarket.track`) |

## 4. How I read the rules where they leave a choice (please confirm)

- **Loans and the Rothschild marker:** as the gameplay spec says. Once the draw reaches the marker (the last 2 cards per player), no more loans can be taken; the cards under it are still drawn and played. The deck shows the no-loan coin ("No more loans"), and LOAN is disabled with the same coin. (`LOANS_STOP` in `config/cards.ts`; RULES.md §3 now says so too.)
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
- **New mines and works selling to the market:** automatic, as the gameplay spec says. An iron works always sells (no connection needed); a coal mine only when its town is connected to a trade location. The most expensive empty spaces fill first, the owner is paid each space's price, and cubes that don't fit stay on the tile. RULES.md §3 now says so.
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
- **Tests:** 91 for the rules. They cover:
  - the stable turn-order sort with ties (4 players);
  - market buying (cheapest first) and the £5 fallback;
  - automatic market selling: most expensive empty space first, with payment; coal needs a trade connection, iron doesn't; cubes that don't fit stay on the tile;
  - distant-market sales, and failure when landing on or passing X;
  - deck sizes and dealing, the canal set-aside, the Rothschild loan cut-off, no income in the last round, refills;
  - the joker, card legality, slot priority, the canal-era limit and the rail-era removal.

  Simulated 2-, 3- and 4-player games check:
  - no errors;
  - money never goes negative;
  - cubes and markets stay in range;
  - the final score matches an independent count.
- **Match screen**, matching `ui-mockup.png`:
  - **Layout:** a top bar, then [side strip | markets + board | player panel], then the hand strip.
    - The board is scaled into the space left, so the whole board and its frame are always visible without scrolling. Checked at 1920×1080 (692 px board), 1440×900 (537), 1366×768 (423) and 1280×720 (382). The placeholder warning bar costs about 28 px until the numbers are in.
    - The hand strip is below the board; the cards shrink (72 px at least), never the board.
    - Hints and the "Play as" bar are in the hand strip. Nothing but confirm dialogs covers the board.
    - Phones stack everything, and the player panel is a bottom sheet.
  - **Turn order** in the top bar:
    - one circle per player: their avatar (profile picture or an illustrated one) in a thick ring of their colour;
    - the player acting is larger and glows; players who have finished their turn this round are dimmed;
    - money spent this round under each circle;
    - the circles slide into the new order at the end of a round;
    - hovering a circle shows money, income, VP and cards; clicking it shows that player's mat.
  - **Coal and iron market strip:** laid out as on the board, most expensive on the left: £5 ∞, then £4, £3, £2, £1, each step with its spaces (cubes, or empty outlined squares) and ×N left at that price. Cubes sit at the expensive end; the next cube to be bought (the rightmost filled space) is outlined, and cubes sold to a market fill its leftmost empty space. Only the display order changed; the prices and rules are the same.
  - **Distant cotton market:**
    - a tall riveted iron plaque hanging from a bracket, filling the height of the left strip: four income rows (a coin-stack badge, two round spaces), the engraved X row with one space, the zig-zag path in the order stored in `distantMarket.track`, and a cotton-mill plate;
    - beside it, the face-down stack and the face-up pile of tiles flipped this era;
    - on a sale, the tile turns over large in the middle of the screen and goes to the pile, then the marker hops along the path (150 ms a space);
    - a sale that lands on X or would pass it fails: "The distant market has closed — no sale." over the board; the marker stays on X, the plaque greys out with a padlock for the rest of the era, and Sell (and the hubs, when picking a buyer) say why.
  - **Deck and discard pile** outside the board frame:
    - the deck with its count, the train, or the no-loan coin;
    - the discard pile is smaller, face up and turned, with a label and "Last card: … by …"; clicking it lists this round's cards.
  - **Game log** in the player panel.
  - "No coal connection" on dark slots and links that fail only for coal.
  - The industry rows and levels popup, the upgrade bar, the canal triangle / RAIL / 2 RAILS, loan, sell and skip, the stats bar, confirm popups and toasts, the pass-and-play hand-off and the results.
- **Cards on screen:**
  - **The hand:**
    - one straight row, centred, which re-centres as it shrinks;
    - when the cards don't fit, they overlap evenly and each name plate stays visible;
    - hover lifts a card 6 px; picking one lifts it 16 px, outlines it in gold, and lights up only what it allows;
    - on touch screens, a tap enlarges a card;
    - the "Play as" bar has every option with its reason when disabled; a second card brings up the joker prompt; Esc backs out.
  - **Animations:**
    - dealing, drawing and playing cards (other players' cards are shown face up);
    - cubes fly to the market and coins to the owner when a new mine or works sells;
    - the distant tile turns over mid-screen and the marker walks down;
    - canals and level I tiles fade off at the end of the canal era;
    - with reduced motion, changes fade in instead.
- **Lobby:** random colours each match (the colour picker is gone), Brass saves, and stats and achievements from the Brass result.
- **Languages:** all new text in English, Lithuanian, German, French and Spanish.

## 6. Left

- Fill in `docs/TILES.md` (§1); until then the site can't be built for production.
- Approve the player-count removals (§2) and answer §3 and §4.
- The **Rules / How to Play** screen and the lobby's mode descriptions still describe the old rules, in all five languages. (The mode cards and the setup summary now show the Brass rounds per era for the chosen player count, and £30 each.) The old engine (`src/game`) stays until that's rewritten, because the map sandbox and the rules screen still use it.
- On the match screen:
  - the move timer;
  - picking among equally close coal mines and among iron works (the default is your own, then board order);
  - picking the tiles to sell when income can't be paid.
- Computer strength: "easy" sometimes beats "hard". Tune the levels once the real numbers are in.
- Achievements: retune them for Brass scores (e.g. "Tycoon: 55 VP").
- `tools/build-cards.js` is as you sent it: it uses `require` (the project is an ES module, so it needs renaming to `.cjs` to run) and paths on your machine. After regenerating the fronts, run `node tools/card-webp.mjs` for the web-sized copies the game uses.
