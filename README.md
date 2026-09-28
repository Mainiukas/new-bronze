# Bronze

**Bronze** is an original industrial-era strategy board game for 2–4 players.
Play against computer opponents or pass & play on one device.

## How the game works

2–4 players (each human or computer, Easy, Normal or Hard) build industries,
lay links and ship goods on **Wales & the West**. Each round, every player
takes a turn of two actions (or ends it early):

- **Build an industry** on a free slot in a town in your network: a Coal mine,
  Iron works, Cotton mill, Port or Shipyard (the only five). Your very first
  build can go anywhere; the rail-era places open in the rail era.
- **Build a link**: an unbuilt route of the current era touching your network.
  Canals £3, railways £5 + 1 coal; +1★ each.
- **Ship**: a mill's cotton to a hub that buys cotton or to any port, or all
  the coal or iron in your store (from one of your mines or works) to a hub
  that buys it, over built links. Hubs pay their price, which drops £1 per
  unit; ports pay £3. +1★ per unit, doubled over 2+ links. Opponents' links
  cost a £1 toll.
- **Raise funds**: +£3.

Missing coal and iron for a cost are bought automatically (£3 and £5). At the
end of each round industries produce, everyone gets £2 and hub prices recover.
The rail era begins half way, and every canal comes off the board. Final score:
★ + 1★ per £5 + 2★ per hub in your network.

The full rules are in the game (Rules, on the main menu and in a match), built
from the same numbers the engine uses: `src/game/rules.ts`, the modes and
`board.json`.

**Engine.** `src/game/engine.ts` is pure and deterministic: `applyAction(state,
action)` returns a new state or throws `IllegalActionError` with a message the
UI shows as a toast. `legalActions` is the only source of computer moves. The
match seed decides every computer choice, so a seed and the same seats replay
a match. The UI renders state and dispatches actions; it never offers an
illegal one (disabled buttons say why).

**Modes**: Normal (whole map, 10 rounds, £14, 120 s turns), Blitz (rings 1–2,
7 rounds, £16, 45 s) and Bullet (ring 1, 5 rounds, £18, 15 s). Places outside
the mode's rings are drawn faded and aren't in the match. Three drawn practice
maps (no eras; their market towns work like hubs) are still selectable.

**Accounts** (optional) use Supabase: Register and Log in with a username or
email and password, Continue with Google, and password reset by email. A
player's record and achievements are saved to their account, and a guest's
progress on the device is added to it at their first log-in. Until
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set (see
[SETUP.md](SETUP.md)), everyone plays as a guest and the account screens say
"Accounts aren't configured yet".

**Online and friends** need a game server Bronze doesn't have. Guests see
"Log in to use this" on the Online opponents option, the friends panel,
Tournaments, Locker and Shop; signed-in players see them as "Coming soon"
(with no made-up online counts).

**Lobby.** Laid out like chess.com and colonist.io: a sidebar (wordmark, PLAY,
the pages, Map board, How to Play, Settings, Credits, then Register and Log in,
or your profile chip with its Profile / Settings / Log out menu), the
Play page in the centre (the match in progress, quick-play mode cards, opponents,
and the match setup with START MATCH), and a social column on the right
(friends, tournaments, achievements). From 768 to 1023 px the sidebar is an icon
rail and the social column moves under the centre; below 768 px there is a top
bar (with a Log in pill, or your avatar), a bottom tab bar (Play, Tournaments,
Locker, Shop, More) and a More sheet.
The match screen has no sidebar: its ☰ menu leads back to the lobby.

**Theme.** Each lobby page sits on a painted Victorian background
(`src/components/theme`): the lobby, Register and Log in (the desk), the
password and username steps (the study), Shop, Locker, Achievements,
Tournaments, and the splash and 404 (the ironworks). The match screen and the
map board keep their plain ground. The paintings live in `assets/bg/` as
`<name>-<1280|1920|2560>.<webp|jpg>` (names: `lobby`, `auth`, `auth_study`,
`shop`, `locker`, `achievements`, `tournaments`, `splash`); a missing file
just leaves that page on the plain dark ground. Each gets a readability
overlay (a vignette plus a gradient where the page's panels sit, in
`backgrounds.ts`), and panels over a painting are the same iron at 90 % with
a light blur. Phones load the 1280 files, desktops the 1920, large and
high-density screens the 2560, as WebP (JPG as the fallback). Also in the
theme: the logo (`assets/logo/`: wordmark in the sidebar and phone bar, the
cog on the icon rail, the stacked logo on the account screens, splash and
404, favicons and the web manifest's icons), brass ornaments
(`assets/ui/ornaments/`: corners on the big panels and dialogs, the divider
under page titles and between dialog sections, the cog seal behind avatars
and achievement badges), and the splash in `index.html`, which only shows
if the app takes longer than 400 ms to start.

Loading order, so the first page is quick on a slow phone: desktops preload
the lobby's painting from `index.html`; phones fetch it, and the other
pictures below the fold, right after the first paint. The account service's
code (Supabase), the account screens, the Rules and Settings dialogs, the
legal pages, the match screen and the map board load when first needed, and
the likely next ones (plus the account screens' painting and the board's art)
once the first page has loaded and the browser is idle.

Other lobby art in `assets/ui/`: `iron_panel_tile.png` and
`iron_panel_framed.png` (the `.iron` texture and `.iron-framed` 9-slice
panel; the `_glass.webp` copies are the same at 90 % for painted pages) and
`button_brass_{normal,hover,pressed}` (the `.btn-brass` 9-slice primary
button; the WebP copies are the ones used). `assets/tokens/swatches/` holds
small copies of the rail tokens for the colour choices.

Built with React 19, TypeScript, Vite, Tailwind CSS v4 and React Router.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

To turn on accounts, follow [SETUP.md](SETUP.md): create a Supabase project,
run its SQL, set up Google sign-in, and put the project's URL and anon key in
`.env` (copy `.env.example`). `.env` is git-ignored; never commit real keys.

Other scripts:

| Command                | What it does                                              |
| ---------------------- | --------------------------------------------------------- |
| `npm run build`        | Type-check (`tsc -b`) and build to `dist/`                |
| `npm run build:single` | Type-check and build one self-contained `dist-single/index.html` (JS, CSS and fonts inlined) |
| `npm test`             | Engine, board and account tests, plus 60 simulated four-computer matches (every mode × 20 seeds), which print the average score per AI level |
| `npm run preview`      | Serve the production build                                |
| `npm run lint`         | Lint with oxlint                                          |
| `npm run notices`      | Rewrite THIRD_PARTY_NOTICES.md (and the copy the site ships) from the installed packages |

## Putting it on the web

The build is a static site, so any static host works with no server setup:

- Routing uses hash URLs (`#/shop`), so no rewrite rules are needed.
- Asset paths are relative (`base: './'`), so it works from a sub-path such as
  `https://<user>.github.io/Bronze/`.
- For accounts, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` where the
  site is built, and add the site's address to Supabase's Redirect URLs and
  Google's JavaScript origins (SETUP.md, steps 4–5).

Upload the contents of `dist/` to GitHub Pages, Netlify, Cloudflare Pages, an
S3 bucket or similar. For hosts or embeds that take a single file, use
`dist-single/index.html`. It also opens straight from disk (as a guest:
Google and email links need the site served over http(s)).

## Privacy, legal and accessibility

Bronze follows an EU/GDPR baseline (the operator is in Lithuania); the full
item-by-item record, with how to check each one, is in [CHECKLIST.md](CHECKLIST.md).

- **Legal pages** (`src/pages/legal/`): Privacy Policy, Terms of Service,
  Refund Policy, Cookie Policy, Business details, Data requests, Credits and
  Unsubscribe, linked from the footer of every lobby page and the sidebar's
  Legal group. They are templates to review; operator details are
  `{{PLACEHOLDERS}}` in `src/legal/operator.ts`, and each page shows its
  "Last updated" date and a draft note until they're filled in.
- **One inventory** (`src/legal/inventory.ts`) lists every cookie and storage
  key, and the personal data kept for accounts. The Cookie Policy table and
  the Privacy Policy are generated from it, and a test fails if the code uses
  a `bronze…` key it doesn't list.
- **Cookie consent** (`src/legal/consent.ts`, `CookieBanner`): Accept all,
  Reject all and Customise, equally prominent; essential storage only until a
  choice is made; the choice is kept with its time and version, asked again
  after 12 months or a new version; "Cookie settings" in the footer reopens it.
  English and Lithuanian.
- **Accounts**: an age question (under 14 can't register), an unticked
  required Terms box, a separate optional marketing box (18 and over only),
  consents stored server-side; Settings → Account downloads or deletes your
  data; Settings → Notifications holds email choices with one-click
  unsubscribe links (see SETUP.md, "Emails").
- **Accessibility**: WCAG 2.2 AA checked with axe on every page; skip link;
  keyboard board navigation (Tab, arrow keys, Enter); player letters always
  shown with colours; reduced motion honoured.

## Map board

`#/board` (Map board, in the sidebar) shows the illustrated board: the painted map with an
SVG overlay (viewBox 0 0 1000 1000) drawn from `src/data/board.json`. It is a
pure view (`src/components/board/IllustratedBoard.tsx`): the era, what's built
and the selection come in as props, and clicks come out through
`onSelectLocation`, `onSelectSlot` and `onSelectLink`. The page adds an era
toggle and a sandbox for placing tiles. Matches on Wales & the West use the
same component, with `targets`, `prices`, `closed` and `recent` props.

Layers, bottom to top: map, route shadows, route textures, link spaces, link
tokens, plaques and tiles, badges, hover/selection, tooltips. Every route is
below every location, and runs to the centre of its two locations' art, so no
route end ever shows.

- **Only the era's links are drawn**: canal and "both" links (as a canal) in
  the canal era, rail and "both" links (as a railway) in the rail era.
  Places reached only by rail have a locomotive badge until the rail era.
- **Cities**: 34-unit squares (a row for 1–2 slots, a triangle of 2 over 1 for
  3, 2 × 2 for 4) with the industry pictures, over a flat name plate in the
  region's colour. A built tile shows the owner's colour, the picture, its ★
  value and, on a mill, the cotton waiting as pips. **Stops**: silver plaques
  with two link hexagons. **Hubs**: two link hexagons over a medallion with the
  hub's photo, a ribbon, the live price on a square badge, and what they buy.
- **Routes** are curves (seeded bends of 8–15 %, or a spline through a link's
  `points`) measured with `getTotalLength()`/`getPointAtLength()` and drawn by
  laying the texture along them in pieces edge to edge: each piece is a quad
  between the route's normals, so pieces never overlap or gap and the last
  stops exactly at the end. Each route runs from the centre of one location's
  rectangle to the centre of the other's, under the tiles, plate or hub, and
  comes out from under each at its own angle.
- **Links** without an owner show an empty bubble (52 × 21.7: a dark stadium
  with a bronze rim, nothing inside, turned to the route, never upside down) at
  the middle of the route's visible part, which pulses gold when you can build it; built
  links show the owner's token at the same size (a barge or a locomotive, per
  era). Player colours are the token colours (yellow, blue, purple, red,
  white); any other colour gets a drawn token with the barge or locomotive art.
- **Feedback**: the active player's network is ringed in their colour, legal
  targets glow, the last move flashes, and a shipment sends a dot along the
  links it used. Tooltips give names, slots and owners, connections, what a hub
  buys and its current price.
- **Layout**: each location is one rectangle (tiles and plate, plaque or hub,
  with every hexagon and badge). Everything (rectangles, routes, link spaces
  and tokens) stays inside the **safe area**, x 9–91 % and y 8–92 %, clear of
  the painted frame (its inner edge is at 6 %; its corner gears reach about
  9 %). Rectangles keep 8 units apart, and every link space keeps 8 units from
  every rectangle, its own two included. A group that would cross the safe
  area's edge moves inside, and overlapping pairs are pushed apart along the
  shortest direction (at most 200 passes); a location's point moves with its
  group. Route ends fan out around each group (at least 14 apart), and bends
  are flipped or increased until no route runs over another route or a group; a
  group still in a route's way steps aside and the layout is redone. The
  positions in `board.json` are already resolved, so the board draws each
  location centred on its point. A location's `labelOffset` pins its group by
  hand. Labels are measured from a table of Cinzel Bold glyph widths, so the
  layout is identical in every browser and in the tests. Development builds
  log anything left over, by location name, and `npm test` fails on it.

**Art** (in `assets/`, preloaded before the board first draws; anything
missing or failing is logged and drawn instead): `map.png` (else `map.webp`),
`icons/{loom,anchor,shipyard,iron,coal}.png` (the only industry icons in the
game), `textures/{rail,canal}.png`, `tokens/` (`hex_link.png`, the hexagon on
stops and hubs, and nowhere else; the tokens per colour; and the barge and
locomotive art) and `hubs/<hub id>.png`. Empty link bubbles are drawn, not
pictures: `link_space.png` (which has the link symbol in it) is only shown in
the rules, and `link_symbol.png` isn't used.

Coordinates in `board.json` are percentages of the image (0–100), so the
overlay stays aligned at any size. The network is held to its design by
`designProblems`: from Birmingham, canal and "both" links reach everything but
the rail-era places; rail and "both" links reach everything; degrees add up to
78 (16 both, 6 canal, 17 rail links); and 2, 4, 10 and 3 cities have 4, 3, 2
and 1 tiles. Development builds refuse to start if it breaks; `npm test`
checks it too, along with the layout.

**Calibrating** (edit mode):

1. Open `#/board?edit=1`. In `npm run dev` you can also press **E** on the page.
2. Drag a crosshair to move a location. Drag a plaque or tile group to place it
   by hand (double-click it to go back to automatic). Drag a link's "+" to add
   a bend point (up to 3); drag the squares to move them, double-click to
   remove. Arrow keys nudge the last one by 0.1 % (Shift: 1 %). Drags preview
   as you move and the board is laid out again when you let go. Use the era
   switch beside the board to check both eras' links.
3. Click **Export** (or **Download**) and paste it over `src/data/board.json`.
   `npm test` checks the file stays valid.

Edits are kept in this browser until you press **Reset**, so a reload doesn't
lose them. While a draft is saved, matches in the same browser draw the board
from it, so you can check a calibration in a real game before exporting.

## Project structure

```
src/
  game/                   The game itself, independent of React
    rules.ts              Every rule number: costs, prices, income, scoring
    engine.ts             Setup, legal moves, applying actions, production, eras, final scores, saves
    ai.ts                 Computer players: Easy, Normal, Hard (never throws)
    types.ts              GameState and action types
    engine.test.ts        The rules, case by case
    simulation.test.ts    Four computer players × every mode × 20 seeds, with state checks
  App.tsx                 Router, app-wide state (settings, saved match, stats, overlays)
  auth/                   Accounts, independent of React
    backend.ts            What the app needs from an account service (AuthBackend), error codes
    supabaseBackend.ts    That, on Supabase Auth and the profiles table (null when not configured)
    lazyBackend.ts        Loads that on first use, so the first page doesn't wait for it
    store.ts              Signed-in state and actions behind useAuth()
    redirect.ts           Returns from Google and email links (#/auth/callback, #/auth/reset)
    validation.ts         Username, email and password rules, password strength
    messages.ts           What to tell the player when something fails
    AuthProvider.tsx      Puts the store in React context
    *.test.ts             Validators and the store (with a stand-in backend)
  components/board/       Illustrated map board: IllustratedBoard (view), parts (SVG pieces),
                          layout (placement, route fan-out, collisions), geometry (curves,
                          texture pieces, hulls), sampling (getPointAtLength), measure (label
                          widths), assets (art files, preloading, fallbacks), style, icons,
                          BoardTooltip
  components/
    Sidebar.tsx           Lobby sidebar (desktop) and icon rail (tablet), with the profile
    MobileNav.tsx         Phone top bar, bottom tab bar and More sheet
    ModeCard.tsx          Quick-play mode cards
    MatchSetupPanel.tsx   New match: map, seats (human/AI, level, name, colour), seed, START MATCH
    InfoModals.tsx        Rules
    SettingsModal.tsx     Animation and computer speed, timer, log, sound, account, privacy
    theme/                The painted backgrounds (PageBackground, backgrounds.ts: files, focus
                          points, overlays), the logo, the ornaments (corners, dividers, seal,
                          page titles), the splash hand-off and the first-paint signal
    FriendsPanel.tsx      Friends panel (locked for guests, "Coming soon" when signed in)
    ProfileChip.tsx       Avatar (Google photo or coloured initial) and the lobby profile
    LockPill.tsx          "Log in to use this" pill and the locked-page notice
    auth/                 Account forms: Register, Log in, forgot/reset password, Google
                          return, choose a username, and the fields they share
    LobbyCards.tsx        Tournaments and Achievements cards in the social column
    game/                 Match screen: ActionBar, PlayersPanel, MarketPanel, GameLog, MoveTimer,
                          EraBanner, ResultsDialog, ZoomPan, GameBoard (practice maps), glyphs
    …                     Dialogs, map cards, backdrops, toasts, icons, artwork
  pages/
    MainMenu.tsx, Game.tsx, MapBoard.tsx, Achievements.tsx, Locker.tsx, Shop.tsx, Tournaments.tsx
    AuthScreen.tsx        The account screens (/auth, /auth/forgot, /auth/reset, /auth/callback,
                          /auth/username), over the page they were opened from
    Profile.tsx, NotFound.tsx  Your profile; the 404 page
  data/
    gameModes.ts          Game modes: rounds, starting money, board size, timer, computer pause
    maps.ts               Maps: the illustrated map plus the drawn practice maps
    board.json            Map board data: locations, slots, links (edit via #/board?edit=1)
    board.ts              Board types, validation, export formatting, era rules, network checks
    board.test.ts         Board data, the design checks, curves, texture pieces and layout
    achievements.ts       Achievements and lifetime stats
    navigation.ts         Sidebar pages, dialog actions and route paths
    matchSetup.ts         Seats for a new match: validation, opponents presets, colour swaps
    settings.ts           Settings shape, defaults and validation
  legal/                  Operator details (placeholders), the storage and data inventory, cookie consent
  pages/legal/            Privacy, Terms, Refunds, Cookies, Business details, Data requests, Credits, Unsubscribe
  components/legal/       Legal page layout, the footer, the cookie banner
  components/settings/    Settings → Account (download/delete data), Notifications, Privacy
  hooks/                  usePersistentState (localStorage-backed state), useToast, useAuth,
                          useOpenAuth, useLogOut, usePlayerStats (the guest's or the account's record)
  lib/                    storage (safe localStorage), sound (Web Audio), random (new seeds)
```

## Extending

- **New game mode:** add an entry to `GAME_MODES` in `src/data/gameModes.ts`.
  To give it a new icon, add a name to `ModeIconName` and map it in `ModeCard.tsx`.
- **New map:** add a schematic entry to `MAPS` in `src/data/maps.ts`: towns
  with their building plots and ring (which modes include them), routes, and
  decoration, on a 160 × 100 grid. The lobby preview and the game board are both drawn from
  it, and `npm test` checks that every mode's cut of the map is connected and
  plays to the end.
- **Balance:** change the numbers in `src/game/rules.ts`, then run `npm test`:
  the simulation prints the average final score per AI level.
- **New page:** add a path to `PATHS` and an entry to `NAV_TABS` in
  `src/data/navigation.ts`, give it an icon in `src/components/navItems.ts`,
  then add a `<Route>` in `App.tsx`.
- **Re-theme:** change the color tokens in the `@theme` block at the top of
  `src/index.css`. Each token becomes a CSS variable (`--color-bronze-400`)
  and Tailwind utilities (`bg-bronze-400`, `text-bronze-400/60`, ...).

## Saved data

The selected mode and map, the settings, the last new-game seats, the match in
progress and a guest's stats are saved to localStorage (`bronze.lobby.*`,
`bronze.settings`, `bronze.setup`, `bronze.match`, `bronze.stats`). Settings,
the last choices and a guest's record are "preferences": they are only saved
once the visitor allows that in the cookie banner (`bronze.consent`), and
withdrawing it deletes them. The full list is the Cookie Policy (`#/cookies`). A signed-in
player's stats are saved to their Supabase profile; until the server confirms a
save, a copy is kept in `bronze.stats.pending.<id>` and folded back in at the
next log-in. The session itself is kept by Supabase under `bronze.auth`. The match
is saved after every action, so **Continue** on the main menu resumes exactly
where you left off. Saved values are validated when read; a match saved by an
older version (`GAME_VERSION` in `src/game/types.ts`) isn't resumed: the main
menu says so and offers to discard it. If storage isn't available, the app
keeps working with in-memory state.
