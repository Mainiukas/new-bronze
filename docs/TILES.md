# Bronze — Tile table (FILL IN FROM THE PHYSICAL PLAYER MAT)

Everything marked `?` must be copied from the printed player mat / board.
Claude Code: generate `src/rules/tiles.ts` from THIS file and fail the build if any `?` remains.

How it's read (`npm run tiles` regenerates `src/rules/tiles.ts`; `npm run build` refuses to
build while anything below is still `?`):
- a number, `yes` / `no`, or `–` (doesn't apply);
- `?` = not filled in yet;
- a value ending in `?` (e.g. `3?` or `yes?`) = a **proposal** for our map, not confirmed.
  Delete the `?` to accept it, or write your own value. It counts as not filled in until then.

Known from the rulebook: tile totals per player — Cotton mills **12**, Ports **8**, Shipyards **6**,
Iron works **4**, Coal mines **7**. Cotton mill level I is worth **5 VP**.

Columns: Lvl | tiles | £ cost | coal | iron | VP | income arrow | link value | cubes | not in canal | not in rail | developable

## Cotton mill (12 tiles total)
| Lvl | tiles | £ | coal | iron | VP | income | link | cubes | no canal | no rail | dev |
|---|---|---|---|---|---|---|---|---|---|---|---|
| I   | ? | ? | ? | ? | 5 | ? | ? | – | ? | ? | ? |
| II  | ? | ? | ? | ? | ? | ? | ? | – | ? | ? | ? |
| III | ? | ? | ? | ? | ? | ? | ? | – | ? | ? | ? |
| IV  | ? | ? | ? | ? | ? | ? | ? | – | ? | ? | ? |

## Coal mine (7 tiles total)
| Lvl | tiles | £ | coal | iron | VP | income | link | cubes | no canal | no rail | dev |
|---|---|---|---|---|---|---|---|---|---|---|---|
| I   | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| II  | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| III | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| IV  | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |

## Iron works (4 tiles total)
| Lvl | tiles | £ | coal | iron | VP | income | link | cubes | no canal | no rail | dev |
|---|---|---|---|---|---|---|---|---|---|---|---|
| I   | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| II  | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| III | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| IV  | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |

## Port (8 tiles total)
| Lvl | tiles | £ | coal | iron | VP | income | link | cubes | no canal | no rail | dev |
|---|---|---|---|---|---|---|---|---|---|---|---|
| I   | ? | ? | ? | ? | ? | ? | ? | – | ? | ? | ? |
| II  | ? | ? | ? | ? | ? | ? | ? | – | ? | ? | ? |
| III | ? | ? | ? | ? | ? | ? | ? | – | ? | ? | ? |
| IV  | ? | ? | ? | ? | ? | ? | ? | – | ? | ? | ? |

## Shipyard (6 tiles total) — level 0 = LOCKED
| Lvl | tiles | £ | coal | iron | VP | income | link | cubes | no canal | no rail | dev |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 (locked) | ? | – | – | – | – | – | – | – | – | – | yes (develop only) |
| I   | ? | ? | ? | ? | ? | ? | ? | – | ? | ? | ? |
| II  | ? | ? | ? | ? | ? | ? | ? | – | yes? | ? | ? |

## Markets
Price of each space, cheapest → most expensive. At setup every space holds 1 cube (RULES.md §1).
`empty` = the price per cube when that market has no cubes left.

| market | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | empty |
|---|---|---|---|---|---|---|---|---|---|
| coal | ? | ? | ? | ? | ? | ? | ? | ? | 5 |
| iron | ? | ? | ? | ? | ? | ? | ? | ? | 5 |

## Income / progress track
Which progress-track spaces (0–100) give each income level. Start: space **10 = £0**.
Min income −10, max income level 30. Copy the printed track.

| income | first space | last space |
|---|---|---|
| -10 | ? | ? |
| -9 | ? | ? |
| -8 | ? | ? |
| -7 | ? | ? |
| -6 | ? | ? |
| -5 | ? | ? |
| -4 | ? | ? |
| -3 | ? | ? |
| -2 | ? | ? |
| -1 | ? | ? |
| 0 | ? | ? |
| 1 | ? | ? |
| 2 | ? | ? |
| 3 | ? | ? |
| 4 | ? | ? |
| 5 | ? | ? |
| 6 | ? | ? |
| 7 | ? | ? |
| 8 | ? | ? |
| 9 | ? | ? |
| 10 | ? | ? |
| 11 | ? | ? |
| 12 | ? | ? |
| 13 | ? | ? |
| 14 | ? | ? |
| 15 | ? | ? |
| 16 | ? | ? |
| 17 | ? | ? |
| 18 | ? | ? |
| 19 | ? | ? |
| 20 | ? | ? |
| 21 | ? | ? |
| 22 | ? | ? |
| 23 | ? | ? |
| 24 | ? | ? |
| 25 | ? | ? |
| 26 | ? | ? |
| 27 | ? | ? |
| 28 | ? | ? |
| 29 | ? | ? |
| 30 | ? | ? |

## Distant cotton market
Tiles: one row per tile (add rows as needed). `move` = how far the marker moves down when the
tile is flipped. `players` = the player number printed on the tile (tiles above the player count
are removed at setup; write `–` if it has none). `!` = `yes` if the tile is marked "!" (removed at setup).

| tile | move | players | ! |
|---|---|---|---|
| 1 | ? | ? | ? |

Market track, top row first (add rows as needed). `income` = the income gained when a sale leaves
the marker on that row; write `X` for the row that closes the market.

| row | income |
|---|---|
| 1 | ? |

## Cards
The deck (cards per town and per industry, and which location cards 2- and 3-player games leave
out) is in `src/rules/cards.ts`, not here.

## Our map: hubs and market access
Our hubs (The North, London, West Wales) are the "trade icon" locations for distant-market sales
(RULES.md §7). Still to decide: their link value (the link-value icons a link to them scores; the
Lancashire board prints one for each outside location) and whether they, and towns with a port
slot, give access to the coal and iron markets.

| hub | id | link value | market access |
|---|---|---|---|
| The North | the_north | ? | yes? |
| London | london | ? | yes? |
| West Wales | west_wales | ? | yes? |

| rule | value |
|---|---|
| Towns with a port slot give access to the coal and iron markets | yes? |
