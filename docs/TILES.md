# Bronze — Tile table

The player mat's numbers. `npm run tiles` regenerates `src/rules/config/tiles.ts` from this file
and the "To check against the physical game" list at the bottom; `npm run build` refuses to build
while anything here is `?` or `tiles.ts` is out of date.

How it's read:
- a number, `yes` / `no`, or `–` (doesn't apply);
- a value ending in `?` (e.g. `3?` or `yes?`) = **used by the game, but not checked against the
  physical game yet** (`verified: false`). Once you've checked it, delete the `?` (or write the
  right value) and run `npm run tiles`;
- `?` on its own = not known at all (the build stops).

Per player: **37 industry tiles** (12 + 7 + 4 + 8 + 6) and **14 link tiles** (`src/rules/config/cards.ts`
has the other numbers: cards, cube supply, starting money).

Columns: Lvl | tiles | £ cost | coal | iron | VP | income arrow | link VP (link icons on the tile) |
cubes | not in canal era | not in rail era | developable

## Cotton mill (12 tiles total)
| Lvl | tiles | £ | coal | iron | VP | income | link | cubes | no canal | no rail | dev |
|---|---|---|---|---|---|---|---|---|---|---|---|
| I   | 3? | 12? | 0? | 0? | 3? | 5? | 1? | – | no? | yes? | yes? |
| II  | 3? | 14? | 1? | 0? | 5? | 4? | 1? | – | no? | no? | yes? |
| III | 3? | 16? | 1? | 1? | 9? | 3? | 1? | – | no? | no? | yes? |
| IV  | 3? | 18? | 1? | 1? | 12? | 2? | 1? | – | no? | no? | yes? |

## Coal mine (7 tiles total)
| Lvl | tiles | £ | coal | iron | VP | income | link | cubes | no canal | no rail | dev |
|---|---|---|---|---|---|---|---|---|---|---|---|
| I   | 1? | 5? | 0? | 0? | 1? | 4? | 1? | 2? | no? | yes? | yes? |
| II  | 2? | 7? | 0? | 0? | 2? | 7? | 1? | 3? | no? | no? | yes? |
| III | 2? | 8? | 0? | 1? | 3? | 6? | 1? | 4? | no? | no? | yes? |
| IV  | 2? | 10? | 0? | 1? | 4? | 5? | 1? | 5? | no? | no? | yes? |

## Iron works (4 tiles total)
| Lvl | tiles | £ | coal | iron | VP | income | link | cubes | no canal | no rail | dev |
|---|---|---|---|---|---|---|---|---|---|---|---|
| I   | 1? | 5? | 1? | 0? | 3? | 3? | 1? | 4? | no? | yes? | yes? |
| II  | 1? | 7? | 1? | 0? | 5? | 3? | 1? | 4? | no? | no? | yes? |
| III | 1? | 9? | 1? | 0? | 7? | 2? | 1? | 5? | no? | no? | yes? |
| IV  | 1? | 12? | 1? | 0? | 9? | 1? | 1? | 6? | no? | no? | yes? |

## Port (8 tiles total)
| Lvl | tiles | £ | coal | iron | VP | income | link | cubes | no canal | no rail | dev |
|---|---|---|---|---|---|---|---|---|---|---|---|
| I   | 2? | 6? | 0? | 0? | 2? | 3? | 1? | – | no? | yes? | yes? |
| II  | 2? | 7? | 0? | 0? | 4? | 3? | 1? | – | no? | no? | yes? |
| III | 2? | 8? | 0? | 0? | 6? | 4? | 1? | – | no? | no? | yes? |
| IV  | 2? | 9? | 0? | 0? | 9? | 4? | 1? | – | no? | no? | yes? |

## Shipyard (6 tiles total) — level 0 = LOCKED
| Lvl | tiles | £ | coal | iron | VP | income | link | cubes | no canal | no rail | dev |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 (locked) | 2? | – | – | – | – | – | – | – | – | – | yes (develop only) |
| I   | 2? | 16? | 1? | 1? | 10? | 2? | 1? | – | no? | no? | yes? |
| II  | 2? | 25? | 1? | 1? | 18? | 1? | 1? | – | yes? | no? | yes? |

## Markets
The coal and iron markets are in `src/rules/config/markets.ts` (price steps and spaces per step).

## Income / progress track
Which progress-track spaces (0–99) give each income level. Start: space **10 = £0**.
Min income −10, max income level 30. Proposed: the usual Brass track (spaces 0–10 one per level,
then 2, 3 and 4 spaces per level).

| income | first space | last space |
|---|---|---|
| -10 | 0? | 0? |
| -9 | 1? | 1? |
| -8 | 2? | 2? |
| -7 | 3? | 3? |
| -6 | 4? | 4? |
| -5 | 5? | 5? |
| -4 | 6? | 6? |
| -3 | 7? | 7? |
| -2 | 8? | 8? |
| -1 | 9? | 9? |
| 0 | 10? | 10? |
| 1 | 11? | 12? |
| 2 | 13? | 14? |
| 3 | 15? | 16? |
| 4 | 17? | 18? |
| 5 | 19? | 20? |
| 6 | 21? | 22? |
| 7 | 23? | 24? |
| 8 | 25? | 26? |
| 9 | 27? | 28? |
| 10 | 29? | 30? |
| 11 | 31? | 33? |
| 12 | 34? | 36? |
| 13 | 37? | 39? |
| 14 | 40? | 42? |
| 15 | 43? | 45? |
| 16 | 46? | 48? |
| 17 | 49? | 51? |
| 18 | 52? | 54? |
| 19 | 55? | 57? |
| 20 | 58? | 60? |
| 21 | 61? | 64? |
| 22 | 65? | 68? |
| 23 | 69? | 72? |
| 24 | 73? | 76? |
| 25 | 77? | 80? |
| 26 | 81? | 84? |
| 27 | 85? | 88? |
| 28 | 89? | 92? |
| 29 | 93? | 96? |
| 30 | 97? | 100? |

## Distant cotton market
The 12 distant-market tiles and the market track are in `src/rules/config/distantMarket.ts`.

## Cards
The deck (66 cards: per town and per industry, the player-count marks and the cards removed each
era) is in `src/rules/config/cards.ts`, not here.

## Our map: hubs and market access
Our hubs (The North, London, West Wales) are the "trade icon" locations for distant-market sales
(RULES.md §7). The hubs and the towns with a port slot are the trade locations that give access to
the coal and iron markets.

| hub | id | link value | market access |
|---|---|---|---|
| The North | the_north | 2? | yes |
| London | london | 2? | yes |
| West Wales | west_wales | 2? | yes |

| rule | value |
|---|---|
| Towns with a port slot give access to the coal and iron markets | yes |

## Our map: slot and link changes
Changes to the painted board's slots and links (src/data/board.json). Each town keeps the same number
of slots, so the location cards (and the 66-card deck) are unchanged.

| town | slot | was | now |
|---|---|---|---|
| Southampton | 2 | cotton / port | shipyard |
| Carmarthen | 1 | cotton | shipyard |
| Carmarthen | 2 | port | iron works |
| Merthyr Tydfil | 2 | iron works | cotton mill |

Shipyards: Southampton and Carmarthen (canal and rail era), Plymouth (rail era only). Carmarthen has no
port slot any more, so it is no longer a trade location for the coal and iron markets.

| link | was | now |
|---|---|---|
| Merthyr Tydfil – West Wales | — | canal |
| Merthyr Tydfil – Brecon | canal | canal + rail |
| West Wales – Carmarthen | canal + rail | rail |
| Brecon – Carmarthen | rail | rail |
| Brecon – West Wales | — | rail |
| Merthyr Tydfil – Carmarthen | canal + rail | — (removed) |
| Caernarfon – Brecon | rail | — (removed) |
| Derby – Leicester | — | canal |
| Wrexham – Stoke-on-Trent | — | canal + rail |

Carmarthen's only links are the railways to Brecon and West Wales: no canal reaches it, so it joins the
network in the rail era (or by a first build there). Merthyr Tydfil – Brecon stays a canal too: it is the
canals' only way into South Wales and the south-west. Carmarthen – Merthyr Tydfil was removed because
with Brecon linked on every side (Wrexham, Carmarthen, West Wales, Merthyr Tydfil) it could only be drawn
crossing one of Brecon's routes. 41 links: 17 canal + rail, 6 canal, 18 rail.

## To check against the physical game
Generated by `npm run tiles` from this file and `src/rules/config`: every value the game uses that
hasn't been checked yet. Don't edit this list by hand; fix the value where it's defined.

<!-- to-check:start -->
366 value(s) to check.

### docs/TILES.md (274)

- Cotton mill I: tiles: **3**
- Cotton mill I: £ cost: **12**
- Cotton mill I: coal: **0**
- Cotton mill I: iron: **0**
- Cotton mill I: VP: **3**
- Cotton mill I: income: **5**
- Cotton mill I: link value: **1**
- Cotton mill I: not in canal era: **no**
- Cotton mill I: not in rail era: **yes**
- Cotton mill I: developable: **yes**
- Cotton mill II: tiles: **3**
- Cotton mill II: £ cost: **14**
- Cotton mill II: coal: **1**
- Cotton mill II: iron: **0**
- Cotton mill II: VP: **5**
- Cotton mill II: income: **4**
- Cotton mill II: link value: **1**
- Cotton mill II: not in canal era: **no**
- Cotton mill II: not in rail era: **no**
- Cotton mill II: developable: **yes**
- Cotton mill III: tiles: **3**
- Cotton mill III: £ cost: **16**
- Cotton mill III: coal: **1**
- Cotton mill III: iron: **1**
- Cotton mill III: VP: **9**
- Cotton mill III: income: **3**
- Cotton mill III: link value: **1**
- Cotton mill III: not in canal era: **no**
- Cotton mill III: not in rail era: **no**
- Cotton mill III: developable: **yes**
- Cotton mill IV: tiles: **3**
- Cotton mill IV: £ cost: **18**
- Cotton mill IV: coal: **1**
- Cotton mill IV: iron: **1**
- Cotton mill IV: VP: **12**
- Cotton mill IV: income: **2**
- Cotton mill IV: link value: **1**
- Cotton mill IV: not in canal era: **no**
- Cotton mill IV: not in rail era: **no**
- Cotton mill IV: developable: **yes**
- Coal mine I: tiles: **1**
- Coal mine I: £ cost: **5**
- Coal mine I: coal: **0**
- Coal mine I: iron: **0**
- Coal mine I: VP: **1**
- Coal mine I: income: **4**
- Coal mine I: link value: **1**
- Coal mine I: cubes: **2**
- Coal mine I: not in canal era: **no**
- Coal mine I: not in rail era: **yes**
- Coal mine I: developable: **yes**
- Coal mine II: tiles: **2**
- Coal mine II: £ cost: **7**
- Coal mine II: coal: **0**
- Coal mine II: iron: **0**
- Coal mine II: VP: **2**
- Coal mine II: income: **7**
- Coal mine II: link value: **1**
- Coal mine II: cubes: **3**
- Coal mine II: not in canal era: **no**
- Coal mine II: not in rail era: **no**
- Coal mine II: developable: **yes**
- Coal mine III: tiles: **2**
- Coal mine III: £ cost: **8**
- Coal mine III: coal: **0**
- Coal mine III: iron: **1**
- Coal mine III: VP: **3**
- Coal mine III: income: **6**
- Coal mine III: link value: **1**
- Coal mine III: cubes: **4**
- Coal mine III: not in canal era: **no**
- Coal mine III: not in rail era: **no**
- Coal mine III: developable: **yes**
- Coal mine IV: tiles: **2**
- Coal mine IV: £ cost: **10**
- Coal mine IV: coal: **0**
- Coal mine IV: iron: **1**
- Coal mine IV: VP: **4**
- Coal mine IV: income: **5**
- Coal mine IV: link value: **1**
- Coal mine IV: cubes: **5**
- Coal mine IV: not in canal era: **no**
- Coal mine IV: not in rail era: **no**
- Coal mine IV: developable: **yes**
- Iron works I: tiles: **1**
- Iron works I: £ cost: **5**
- Iron works I: coal: **1**
- Iron works I: iron: **0**
- Iron works I: VP: **3**
- Iron works I: income: **3**
- Iron works I: link value: **1**
- Iron works I: cubes: **4**
- Iron works I: not in canal era: **no**
- Iron works I: not in rail era: **yes**
- Iron works I: developable: **yes**
- Iron works II: tiles: **1**
- Iron works II: £ cost: **7**
- Iron works II: coal: **1**
- Iron works II: iron: **0**
- Iron works II: VP: **5**
- Iron works II: income: **3**
- Iron works II: link value: **1**
- Iron works II: cubes: **4**
- Iron works II: not in canal era: **no**
- Iron works II: not in rail era: **no**
- Iron works II: developable: **yes**
- Iron works III: tiles: **1**
- Iron works III: £ cost: **9**
- Iron works III: coal: **1**
- Iron works III: iron: **0**
- Iron works III: VP: **7**
- Iron works III: income: **2**
- Iron works III: link value: **1**
- Iron works III: cubes: **5**
- Iron works III: not in canal era: **no**
- Iron works III: not in rail era: **no**
- Iron works III: developable: **yes**
- Iron works IV: tiles: **1**
- Iron works IV: £ cost: **12**
- Iron works IV: coal: **1**
- Iron works IV: iron: **0**
- Iron works IV: VP: **9**
- Iron works IV: income: **1**
- Iron works IV: link value: **1**
- Iron works IV: cubes: **6**
- Iron works IV: not in canal era: **no**
- Iron works IV: not in rail era: **no**
- Iron works IV: developable: **yes**
- Port I: tiles: **2**
- Port I: £ cost: **6**
- Port I: coal: **0**
- Port I: iron: **0**
- Port I: VP: **2**
- Port I: income: **3**
- Port I: link value: **1**
- Port I: not in canal era: **no**
- Port I: not in rail era: **yes**
- Port I: developable: **yes**
- Port II: tiles: **2**
- Port II: £ cost: **7**
- Port II: coal: **0**
- Port II: iron: **0**
- Port II: VP: **4**
- Port II: income: **3**
- Port II: link value: **1**
- Port II: not in canal era: **no**
- Port II: not in rail era: **no**
- Port II: developable: **yes**
- Port III: tiles: **2**
- Port III: £ cost: **8**
- Port III: coal: **0**
- Port III: iron: **0**
- Port III: VP: **6**
- Port III: income: **4**
- Port III: link value: **1**
- Port III: not in canal era: **no**
- Port III: not in rail era: **no**
- Port III: developable: **yes**
- Port IV: tiles: **2**
- Port IV: £ cost: **9**
- Port IV: coal: **0**
- Port IV: iron: **0**
- Port IV: VP: **9**
- Port IV: income: **4**
- Port IV: link value: **1**
- Port IV: not in canal era: **no**
- Port IV: not in rail era: **no**
- Port IV: developable: **yes**
- Shipyard level 0 (locked): tiles: **2**
- Shipyard I: tiles: **2**
- Shipyard I: £ cost: **16**
- Shipyard I: coal: **1**
- Shipyard I: iron: **1**
- Shipyard I: VP: **10**
- Shipyard I: income: **2**
- Shipyard I: link value: **1**
- Shipyard I: not in canal era: **no**
- Shipyard I: not in rail era: **no**
- Shipyard I: developable: **yes**
- Shipyard II: tiles: **2**
- Shipyard II: £ cost: **25**
- Shipyard II: coal: **1**
- Shipyard II: iron: **1**
- Shipyard II: VP: **18**
- Shipyard II: income: **1**
- Shipyard II: link value: **1**
- Shipyard II: not in canal era: **yes**
- Shipyard II: not in rail era: **no**
- Shipyard II: developable: **yes**
- Income track: £-10 first space: **0**
- Income track: £-10 last space: **0**
- Income track: £-9 first space: **1**
- Income track: £-9 last space: **1**
- Income track: £-8 first space: **2**
- Income track: £-8 last space: **2**
- Income track: £-7 first space: **3**
- Income track: £-7 last space: **3**
- Income track: £-6 first space: **4**
- Income track: £-6 last space: **4**
- Income track: £-5 first space: **5**
- Income track: £-5 last space: **5**
- Income track: £-4 first space: **6**
- Income track: £-4 last space: **6**
- Income track: £-3 first space: **7**
- Income track: £-3 last space: **7**
- Income track: £-2 first space: **8**
- Income track: £-2 last space: **8**
- Income track: £-1 first space: **9**
- Income track: £-1 last space: **9**
- Income track: £0 first space: **10**
- Income track: £0 last space: **10**
- Income track: £1 first space: **11**
- Income track: £1 last space: **12**
- Income track: £2 first space: **13**
- Income track: £2 last space: **14**
- Income track: £3 first space: **15**
- Income track: £3 last space: **16**
- Income track: £4 first space: **17**
- Income track: £4 last space: **18**
- Income track: £5 first space: **19**
- Income track: £5 last space: **20**
- Income track: £6 first space: **21**
- Income track: £6 last space: **22**
- Income track: £7 first space: **23**
- Income track: £7 last space: **24**
- Income track: £8 first space: **25**
- Income track: £8 last space: **26**
- Income track: £9 first space: **27**
- Income track: £9 last space: **28**
- Income track: £10 first space: **29**
- Income track: £10 last space: **30**
- Income track: £11 first space: **31**
- Income track: £11 last space: **33**
- Income track: £12 first space: **34**
- Income track: £12 last space: **36**
- Income track: £13 first space: **37**
- Income track: £13 last space: **39**
- Income track: £14 first space: **40**
- Income track: £14 last space: **42**
- Income track: £15 first space: **43**
- Income track: £15 last space: **45**
- Income track: £16 first space: **46**
- Income track: £16 last space: **48**
- Income track: £17 first space: **49**
- Income track: £17 last space: **51**
- Income track: £18 first space: **52**
- Income track: £18 last space: **54**
- Income track: £19 first space: **55**
- Income track: £19 last space: **57**
- Income track: £20 first space: **58**
- Income track: £20 last space: **60**
- Income track: £21 first space: **61**
- Income track: £21 last space: **64**
- Income track: £22 first space: **65**
- Income track: £22 last space: **68**
- Income track: £23 first space: **69**
- Income track: £23 last space: **72**
- Income track: £24 first space: **73**
- Income track: £24 last space: **76**
- Income track: £25 first space: **77**
- Income track: £25 last space: **80**
- Income track: £26 first space: **81**
- Income track: £26 last space: **84**
- Income track: £27 first space: **85**
- Income track: £27 last space: **88**
- Income track: £28 first space: **89**
- Income track: £28 last space: **92**
- Income track: £29 first space: **93**
- Income track: £29 last space: **96**
- Income track: £30 first space: **97**
- Income track: £30 last space: **100**
- The North: link value: **2**
- London: link value: **2**
- West Wales: link value: **2**

### src/rules/config/markets.ts (18)

- Coal market: price of step 1: **1**
- Coal market: spaces at step 1: **2**
- Coal market: price of step 2: **2**
- Coal market: spaces at step 2: **2**
- Coal market: price of step 3: **3**
- Coal market: spaces at step 3: **2**
- Coal market: price of step 4: **4**
- Coal market: spaces at step 4: **2**
- Coal cubes in the game (the supply): **24**
- Iron market: price of step 1: **1**
- Iron market: spaces at step 1: **2**
- Iron market: price of step 2: **2**
- Iron market: spaces at step 2: **2**
- Iron market: price of step 3: **3**
- Iron market: spaces at step 3: **2**
- Iron market: price of step 4: **4**
- Iron market: spaces at step 4: **2**
- Iron cubes in the game (the supply): **16**

### src/rules/config/distantMarket.ts (36)

- Distant market tile 1: value (spaces along the track): **1**
- Distant market tile 1: player count printed on it: **–**
- Distant market tile 1: marked "!": **no**
- Distant market tile 2: value (spaces along the track): **1**
- Distant market tile 2: player count printed on it: **–**
- Distant market tile 2: marked "!": **no**
- Distant market tile 3: value (spaces along the track): **2**
- Distant market tile 3: player count printed on it: **–**
- Distant market tile 3: marked "!": **no**
- Distant market tile 4: value (spaces along the track): **2**
- Distant market tile 4: player count printed on it: **–**
- Distant market tile 4: marked "!": **no**
- Distant market tile 5: value (spaces along the track): **3**
- Distant market tile 5: player count printed on it: **–**
- Distant market tile 5: marked "!": **no**
- Distant market tile 6: value (spaces along the track): **1**
- Distant market tile 6: player count printed on it: **3**
- Distant market tile 6: marked "!": **no**
- Distant market tile 7: value (spaces along the track): **2**
- Distant market tile 7: player count printed on it: **4**
- Distant market tile 7: marked "!": **no**
- Distant market tile 8: value (spaces along the track): **4**
- Distant market tile 8: player count printed on it: **–**
- Distant market tile 8: marked "!": **yes**
- Distant market tile 9: value (spaces along the track): **0**
- Distant market tile 9: player count printed on it: **–**
- Distant market tile 9: marked "!": **no**
- Distant market tile 10: value (spaces along the track): **1**
- Distant market tile 10: player count printed on it: **–**
- Distant market tile 10: marked "!": **no**
- Distant market tile 11: value (spaces along the track): **2**
- Distant market tile 11: player count printed on it: **3**
- Distant market tile 11: marked "!": **no**
- Distant market tile 12: value (spaces along the track): **3**
- Distant market tile 12: player count printed on it: **4**
- Distant market tile 12: marked "!": **no**

### src/rules/config/cards.ts (38)

- Cards: birmingham location cards: **4**
- Cards: bristol location cards: **4**
- Cards: stoke location cards: **3**
- Cards: wolverhampton location cards: **3**
- Cards: derby location cards: **2**
- Cards: leicester location cards: **2**
- Cards: gloucester location cards: **2**
- Cards: oxford location cards: **2**
- Cards: swindon location cards: **2**
- Cards: lichfield location cards: **1**
- Cards: merthyr location cards: **3**
- Cards: southampton location cards: **3**
- Cards: wrexham location cards: **2**
- Cards: carmarthen location cards: **2**
- Cards: nottingham location cards: **2**
- Cards: exeter location cards: **2**
- Cards: plymouth location cards: **2**
- Cards: caernarfon location cards: **1**
- Cards: barnstaple location cards: **1**
- Cards: cotton mill industry cards: **8**
- Cards: coal mine industry cards: **5**
- Cards: iron works industry cards: **3**
- Cards: port industry cards: **5**
- Cards: shipyard industry cards: **2**
- Cards: player-count mark on caernarfon's cards: **4**
- Cards: player-count mark on barnstaple's cards: **4**
- Cards: player-count mark on exeter's cards: **4**
- Cards: player-count mark on plymouth's cards: **4**
- Cards: player-count mark on carmarthen's cards: **3**
- Cards: player-count mark on nottingham's cards: **3**
- Cards: player-count mark on wrexham's cards: **3**
- Cards: player-count mark on merthyr's cards: **3**
- Cards: player-count mark on southampton's cards: **3**
- Cards: player-count mark on stoke's cards: **3**
- Cards: player-count mark on leicester's cards: **3**
- Cards: player-count mark on lichfield's cards: **3**
- Cards removed at the start of the canal era, 2 players: **4**
- Cards removed at the start of the rail era, 2 players: **2**
<!-- to-check:end -->
