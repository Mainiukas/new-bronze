# Bronze — Rules Reference (based on Brass: Lancashire)

Written in our own words from public sources (see bottom). Every number lives in
`src/rules/config` (tiles via `TILES.md`); numbers not yet checked against the physical game are
marked `verified: false` and listed at the bottom of `TILES.md`.

## 1. Setup
- Each player: **£30**, Income marker on progress-track space **10** (= £0 income), VP marker on **0**.
- Each player gets their full player mat of industry tiles and their link tokens.
- The deck has **66 cards**. Cards with a player-count mark higher than the number of players are
  left out (on our map: 66 / 60 / 42 cards for 4 / 3 / 2 players; `src/rules/config/cards.ts`).
- Shuffle the deck, put cards aside face down for the canal era (**4 players 6, 3 players 9**;
  2 players: to check), and deal **8 cards** to each player.
- Coal market: 1 black cube per space. Iron market: 1 orange cube per space.
- Distant cotton market: remove tiles above the player count and those marked "!" (see TILES.md).
- Random turn order for round 1. Random player colours each match.

## 2. Round structure
- Canal era **round 1: 1 action per player**; every other turn: **2 actions**.
- Every action (including Pass) requires **discarding 1 card**.
- Money spent is placed on the player's character tile, then counted at round end.
- **End of round:**
  1. New turn order: least money spent first (ties keep relative order).
  2. Spent money goes to the bank.
  3. Each player collects/pays income from their progress-track position.
     If they can't pay: sell industry tiles for 50% of cost (round down); if still short, lose 1 VP per £1.
     (No income is collected after the very last turn of the game.)
- **After each turn** the player draws back up to 8 cards while the deck has cards.
- An era ends when **every hand has been played out** (the deck is used up first). With the cards
  put aside, that is **8 / 9 / 10** rounds per era with 4 / 3 / 2 players.

## 3. Actions
### Build (industry)
- Discard a **location card** → build any industry in that location (network not needed),
  or an **industry card** → build that industry in a location **in your network**.
  Discarding **2 cards** counts as any location card and uses both actions.
- Always build the **lowest level** remaining tile of that industry from your mat.
- A slot showing one industry only must be preferred over mixed slots (as printed rule).
- **Canal era: max 1 industry tile per location per player.** Rail era: no limit.
- Tiles marked "not in canal era" (e.g. shipyard II) / "not in rail era" can't be built then.
- **Locked** tiles (e.g. shipyard level 0) can only be removed with Develop.
- **Coal** needed → location must be connected to a coal source (see §4).
- **Iron** needed → taken as in §4 (no connection needed).
- **Overbuilding:** your own tile may be replaced by a higher-level tile of the same industry
  (its cubes return to supply). An opponent's tile may only be replaced if it is a coal mine /
  iron works AND there are **no cubes of that type left on the whole board**.
- Coal mines / iron works: on building, place their cubes on the tile, then sell them to the market
  at once (most expensive empty space first; the owner is paid each space's price; cubes that
  don't fit stay on the tile). Iron works always sell (no connection needed); a coal mine sells only
  if its location is connected to a trade location (on our map: a hub or a town with a port slot).
- Shipyards **flip immediately** when built.

### Network (link)
- **Canal era:** 1 canal link, **£3**, no coal.
- **Rail era:** 1 rail **£5**, or 2 rails **£15**; each rail consumes **1 coal** and must be
  connected to a coal source. Each link must touch your network (a location with your
  industry or adjacent to your link), unless you have nothing on the board.

### Develop
- Discard 1 card, remove **1 or 2** lowest-level tiles from your mat (may be different industries),
  paying **1 iron per tile** (iron sourced as in §4). Tiles marked non-developable can't be removed.

### Sell cotton
- Discard 1 card.
- **Via port:** pick your unflipped cotton mill connected to an unflipped port (anyone's).
  Flip both; the port owner advances income by the port's arrow; you advance by the mill's arrow.
- **Via distant market:** mill connected to a location with the trade icon. Flip the top distant
  market tile, move the market marker down by its value; if the marker reaches **X**, that sale
  fails and the market is closed for the era. Otherwise gain the income shown for the marker row,
  then flip the mill and gain its arrow.
- After one sale you may keep selling more of your mills in the same action (no extra discard)
  until you choose to stop or a sale fails.

### Loan
- Discard 1 card. **£10 / £20 / £30** → income marker back **1 / 2 / 3 levels**.
- Not allowed if income would drop below −10, or once the draw deck is empty.
  Rail era: the **Rothschild marker** sits above the last 2 cards per player; once the draw reaches
  it, **no more loans** (the cards beneath it are still drawn and played).

### Pass
- Discard 1 card, do nothing.

## 4. Coal & iron
- **Coal:** take free from the **closest connected unflipped coal mine** (fewest links; any player's;
  choose if tied). If none connected: buy from the coal market, cheapest cube first (needs a
  connection to a trade location: on our map a hub or a town with a port slot). Market empty:
  **£5** per cube, always available.
- **Iron:** take free from **any unflipped iron works** (any player, no connection needed).
  If none: iron market, cheapest cube first; market empty: **£5** per cube, always available.
- When a mine/works has its last cube removed, it **flips** and its owner advances income by its arrow.

## 5. End of canal era
1. Score **links**: each link scores 1 VP per adjacent link-value icon on its two locations (TODO: link values per tile).
2. Score **flipped industry tiles** (their VP).
3. Remove **all canal links** and **all level-I industry tiles** from the board.
4. Reset distant market marker; shuffle its discarded tiles back.
5. Shuffle all cards (the set-aside ones too) to form the rail-era deck; put cards aside face down
   (**4 players 2, 3 players 6**; 2 players: to check); deal 8 each; place the Rothschild marker
   above the last 2 cards per player.

## 6. End of rail era / game end
- Score rail links and flipped tiles as above.
- **+1 VP per £10** held.
- Highest VP wins. Ties: higher income position, then more money.

## 7. Bronze-specific mapping (our board has no breweries / beer / merchants)
- Brass: Lancashire itself has no beer — good, nothing to remove.
- Trade locations / distant market: our **hubs** (The North, London, West Wales, and the Lancashire map's
  Scotland/Yorkshire/Midlands) act as the "trade icon" locations for distant-market sales.
- Ports: our port slots.
- Anything else that doesn't map → list it and ask before changing.

## Sources
- Player aid summary: https://playeraid.net/modules/brass_lancashire/en
- Official Roxley rulebook (read, not copied): https://cdn.1j1ju.com/medias/0d/25/6d-brass-lancashire-rulebook.pdf
