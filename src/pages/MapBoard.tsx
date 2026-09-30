import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { IllustratedBoard, type BoardSelection } from '../components/board/IllustratedBoard'
import { seatColor } from '../components/game/glyphs'
import {
  BOARD,
  formatBoardJson,
  isLinkActive,
  parseBoardData,
  slotKey,
  type BoardData,
  type BuiltState,
  type Era,
} from '../data/board'
import { INDUSTRIES } from '../game/rules'
import { usePersistentState } from '../hooks/usePersistentState'
import { useToast } from '../hooks/useToast'
import { useT } from '../i18n'
import { STORAGE_KEYS } from '../lib/storage'

/** A few tiles so the board opens showing what built slots and links look like. */
const SAMPLE_BUILT: BuiltState = {
  slots: {
    [slotKey('birmingham', 0)]: { player: 0, industry: 'cotton', goods: 2, stars: INDUSTRIES.cotton.prestige },
    [slotKey('merthyr', 0)]: { player: 1, industry: 'iron', stars: INDUSTRIES.iron.prestige },
    [slotKey('bristol', 0)]: { player: 2, industry: 'port', stars: INDUSTRIES.port.prestige },
    [slotKey('stoke', 0)]: { player: 3, industry: 'coal', stars: INDUSTRIES.coal.prestige },
  },
  // "Both" links, so a token shows in either era: a barge in the canal era, a locomotive in the rail era.
  links: {
    'birmingham-oxford': { player: 0 },
    'carmarthen-merthyr': { player: 1 },
    'gloucester-bristol': { player: 2 },
  },
}

/** Sandbox seats: the board shows four players' colours. */
const SEATS = [0, 1, 2, 3]

/** The painted board's places that open with the railways. */
const RAIL_ONLY = BOARD.locations.filter((l) => l.era === 'rail').map((l) => l.name)

/** Is edit mode requested in the URL? Works as #/board?edit=1 or ?edit=1#/board. */
function useEditParam(): boolean {
  const [params] = useSearchParams()
  return params.get('edit') === '1' || new URLSearchParams(window.location.search).get('edit') === '1'
}

/**
 * The illustrated map board. Holds the view state the board draws (era,
 * selection, sandbox tiles) and, in edit mode, the calibration draft.
 */
export function MapBoard() {
  const t = useT()
  const mb = t.mapBoard
  const notify = useToast()
  const editParam = useEditParam()
  // Edit mode: always via ?edit=1; the E key toggles it in development builds.
  const editAllowed = import.meta.env.DEV || editParam
  const [editing, setEditing] = useState(editParam)
  // Adding ?edit=1 while already on the page is a hash change, not a reload: follow it.
  const [lastEditParam, setLastEditParam] = useState(editParam)
  if (editParam !== lastEditParam) {
    setLastEditParam(editParam)
    setEditing(editParam)
  }
  const [draft, setDraft] = usePersistentState<BoardData | null>(STORAGE_KEYS.boardDraft, null, parseBoardData)
  const board = draft ?? BOARD

  const [era, setEra] = useState<Era>('canal')
  const [selected, setSelected] = useState<BoardSelection | null>(null)
  const [tool, setTool] = useState<'inspect' | 'place'>('inspect')
  const [player, setPlayer] = useState(0)
  const [built, setBuilt] = useState<BuiltState>(SAMPLE_BUILT)

  useEffect(() => {
    if (!editAllowed) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'e' || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      setEditing((value) => !value)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editAllowed])

  const placeInSlot = (locationId: string, index: number) => {
    const location = board.locations.find((l) => l.id === locationId)
    if (location?.type !== 'city') return
    const allowed = location.slots[index]
    setBuilt((prev) => {
      const key = slotKey(locationId, index)
      const current = prev.slots[key]
      const slots = { ...prev.slots }
      // Empty or someone else's: take it. Yours: switch to the next allowed industry, then clear.
      if (!current || current.player !== player) slots[key] = { player, industry: allowed[0], stars: INDUSTRIES[allowed[0]].prestige }
      else {
        const next = allowed.indexOf(current.industry) + 1
        if (next < allowed.length) slots[key] = { player, industry: allowed[next], stars: INDUSTRIES[allowed[next]].prestige }
        else delete slots[key]
      }
      return { ...prev, slots }
    })
  }

  const placeOnLink = (linkId: string) => {
    setBuilt((prev) => {
      const links = { ...prev.links }
      if (links[linkId]?.player === player) delete links[linkId]
      else links[linkId] = { player }
      return { ...prev, links }
    })
  }

  return (
    <section className="mx-auto grid max-w-7xl animate-fade-up grid-cols-[minmax(0,1fr)] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:py-8">
      <div className="flex min-w-0 flex-col gap-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">{t.nav.board}</p>
            <h1 className="metal-text font-display text-4xl font-extrabold tracking-[0.08em] uppercase sm:text-5xl">
              Wales & the West
            </h1>
          </div>
          {editAllowed && (
            <button type="button" className={`btn ${editing ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setEditing((v) => !v)}>
              {editing ? mb.doneEditing : mb.editMap} <kbd className="text-xs opacity-70">E</kbd>
            </button>
          )}
        </header>

        <div className="plate mx-auto w-full max-w-[calc(100dvh-12rem)] min-w-0 overflow-hidden p-1.5 sm:p-2">
          <IllustratedBoard
            board={board}
            era={era}
            built={built}
            selected={selected}
            playerName={(p) => t.common.player(p + 1)}
            onSelectLocation={(id) => setSelected({ type: 'location', id })}
            onSelectSlot={(locationId, index) => {
              if (tool === 'place') placeInSlot(locationId, index)
              setSelected({ type: 'slot', locationId, index })
            }}
            onSelectLink={(id) => {
              if (tool === 'place') placeOnLink(id)
              setSelected({ type: 'link', id })
            }}
            editable={editing}
            onBoardChange={setDraft}
            className="rounded-lg"
          />
        </div>
        {draft && !editing && (
          <p className="text-sm text-parchment-400">
            {mb.draftNote}
          </p>
        )}
      </div>

      <aside className="flex flex-col gap-4">
        {editing && <EditorPanel board={board} hasDraft={draft !== null} onReset={() => setDraft(null)} notify={notify} />}

        <Panel title={mb.era}>
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-bronze-500/30 bg-soot-950/60 p-1" role="group" aria-label={mb.era}>
            {(['canal', 'rail'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={era === value}
                onClick={() => setEra(value)}
                className={`rounded-md py-2 font-display text-sm font-bold tracking-[0.12em] uppercase transition ${
                  era === value ? 'bg-bronze-500/30 text-parchment-50' : 'text-parchment-400 hover:text-parchment-100'
                }`}
              >
                {t.match.era[value]}
              </button>
            ))}
          </div>
          <p className="text-xs text-parchment-400">
            {mb.eraNote(era, t.list(RAIL_ONLY))}
          </p>
        </Panel>

        <Panel title={mb.sandbox}>
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-bronze-500/30 bg-soot-950/60 p-1" role="group" aria-label={mb.tool}>
            {(
              [
                ['inspect', mb.inspect],
                ['place', mb.place],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={tool === value}
                onClick={() => setTool(value)}
                className={`rounded-md py-2 font-display text-sm font-bold tracking-[0.1em] uppercase transition ${
                  tool === value ? 'bg-bronze-500/30 text-parchment-50' : 'text-parchment-400 hover:text-parchment-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {tool === 'place' && (
            <div className="flex items-center gap-2" role="group" aria-label={mb.placeFor}>
              {SEATS.map((i) => (
                <button
                  key={i}
                  type="button"
                  aria-pressed={player === i}
                  aria-label={t.common.player(i + 1)}
                  onClick={() => setPlayer(i)}
                  className={`size-8 rounded-full border-2 transition ${player === i ? 'scale-110 border-parchment-50' : 'border-transparent opacity-70'}`}
                  style={{ background: seatColor(i) }}
                />
              ))}
              <span className="text-sm text-parchment-300">{t.common.player(player + 1)}</span>
            </div>
          )}
          <p className="text-xs text-parchment-400">
            {tool === 'inspect' ? mb.inspectHint : mb.placeHint} {mb.preview}
          </p>
          <button type="button" className="btn btn-ghost w-full" onClick={() => setBuilt({ slots: {}, links: {} })}>
            {mb.clear}
          </button>
        </Panel>

        <Panel title={mb.selected}>
          <SelectionDetails board={board} era={era} built={built} selected={selected} />
        </Panel>

        <Panel title={mb.regions}>
          <ul className="grid grid-cols-1 gap-1.5 text-sm">
            {Object.entries(board.regions).map(([id, region]) => (
              <li key={id} className="flex items-center gap-2 text-parchment-200">
                <span className="h-3 w-6 rounded-sm border border-black/40" style={{ background: region.color }} />
                {region.name}
              </li>
            ))}
            <li className="flex items-center gap-2 text-parchment-200">
              <span className="h-3 w-6 rounded-sm border border-board-plaque-edge bg-board-plaque" />
              {mb.stopKey}
            </li>
            <li className="flex items-center gap-2 text-parchment-200">
              <span className="size-3.5 rounded-full border-[3px] border-board-iron bg-board-plaque ring-1 ring-board-bronze" />
              {mb.hubKey}
            </li>
          </ul>
        </Panel>
      </aside>
    </section>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="plate rivets flex flex-col gap-3 p-4">
      <h2 className="eyebrow">{title}</h2>
      {children}
    </section>
  )
}

function SelectionDetails({ board, era, built, selected }: { board: BoardData; era: Era; built: BuiltState; selected: BoardSelection | null }) {
  const t = useT()
  const mb = t.mapBoard
  const name = (id: string) => board.locations.find((l) => l.id === id)?.name ?? id
  if (!selected) return <p className="text-sm text-parchment-400">{mb.nothing}</p>

  if (selected.type === 'link') {
    const link = board.links.find((l) => l.id === selected.id)
    if (!link) return null
    const owner = built.links[link.id]
    return (
      <div className="text-sm text-parchment-200">
        <p className="font-board text-base font-bold text-parchment-50">
          {name(link.from)} – {name(link.to)}
        </p>
        <p className="text-parchment-400">
          {link.type === 'both' ? t.tooltip.linkType.both : t.tooltip.only(link.type)} · {mb.usable(isLinkActive(link.type, era), era)}
        </p>
        <p className="mt-1">{owner ? t.boardLabels.builtBy(t.common.player(owner.player + 1)) : t.boardLabels.notBuilt}</p>
        <p className="mt-1 font-mono text-xs text-parchment-400">
          id {link.id}
          {` · ${mb.bend(link.bend ?? 0)}`}
        </p>
      </div>
    )
  }

  const locationId = selected.type === 'location' ? selected.id : selected.locationId
  const location = board.locations.find((l) => l.id === locationId)
  if (!location) return null
  return (
    <div className="flex flex-col gap-1.5 text-sm text-parchment-200">
      <p className="font-board text-base font-bold text-parchment-50">{location.name}</p>
      <p className="text-parchment-400">
        {location.type === 'city' ? t.tooltip.city(board.regions[location.region]?.name ?? '') : location.type === 'stop' ? mb.stop : mb.hub} · x{' '}
        {location.x}% · y {location.y}%
        {location.labelOffset ? ` · ${mb.offset(location.labelOffset.x, location.labelOffset.y)}` : ''}
      </p>
      {location.era === 'rail' && <p className="text-brass-200">{t.tooltip.railOnly}</p>}
      {location.type === 'city' && (
        <ol className="flex flex-col gap-0.5">
          {location.slots.map((allowed, i) => {
            const tile = built.slots[slotKey(location.id, i)]
            return (
              <li key={i} className={selected.type === 'slot' && selected.index === i ? 'text-brass-200' : undefined}>
                {t.actions.slot(i + 1)}: {t.or(allowed.map((a) => t.industries[a].name))}
                {tile && <span className="text-parchment-50"> — {t.common.player(tile.player + 1)}</span>}
              </li>
            )
          })}
        </ol>
      )}
      {location.type === 'hub' && (
        <p>
          {t.marketsPanel.buys(t.list(location.buys.map((b) => t.game.goods[b])))} · {mb.startsAt(location.price)}
        </p>
      )}
      <ul className="text-parchment-400">
        {board.links
          .filter((l) => l.from === location.id || l.to === location.id)
          .map((l) => (
            <li key={l.id}>
              {name(l.from === location.id ? l.to : l.from)} · {l.type === 'both' ? t.tooltip.linkType.both : t.tooltip.only(l.type)}
            </li>
          ))}
      </ul>
    </div>
  )
}

/** Calibration tools: what changed, and export as board.json. */
function EditorPanel({
  board,
  hasDraft,
  onReset,
  notify,
}: {
  board: BoardData
  hasDraft: boolean
  onReset: () => void
  notify: (message: string) => void
}) {
  const json = formatBoardJson(board)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const [showJson, setShowJson] = useState(false)
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
  const original = (id: string) => BOARD.locations.find((o) => o.id === id)
  const moved = board.locations.filter((l) => original(l.id) && (original(l.id)!.x !== l.x || original(l.id)!.y !== l.y)).length
  const placed = board.locations.filter((l) => !same(original(l.id)?.labelOffset, l.labelOffset)).length
  const bent = board.links.filter((l) => (BOARD.links.find((o) => o.id === l.id)?.bend ?? 0) !== (l.bend ?? 0)).length
  const changes = [
    moved && `${moved} location${moved === 1 ? '' : 's'} moved`,
    placed && `${placed} plaque${placed === 1 ? '' : 's'} placed`,
    bent && `${bent} link${bent === 1 ? '' : 's'} re-bent`,
  ].filter(Boolean)

  const exportJson = async () => {
    setShowJson(true)
    try {
      await navigator.clipboard.writeText(json)
      notify('Exported: board.json is on the clipboard and shown below')
    } catch {
      // Clipboard blocked: show the JSON selected so it can be copied by hand.
      setShowJson(true)
      requestAnimationFrame(() => textRef.current?.select())
      notify('Couldn’t copy automatically. The JSON is selected below; press Ctrl+C.')
    }
  }

  const download = () => {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'board.json'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <section className="plate rivets flex flex-col gap-3 border-brass-300/50 p-4">
      <h2 className="eyebrow">Edit map</h2>
      <ul className="flex list-disc flex-col gap-1 pl-4 text-xs text-parchment-300">
        <li>Drag a crosshair to move a location.</li>
        <li>Drag a plaque or tile group to place it by hand; double-click it to go back to automatic.</li>
        <li>Drag the dot in the middle of a link across it to bend it gently (up to ±8 % of its length); double-click the dot to straighten the link. With a dot picked, the arrow keys change its bend by 0.5 % (Shift: 2 %).</li>
        <li>Arrow keys nudge the last one by 0.1 % (Shift: 1 %).</li>
        <li>Press E or “Done editing” to preview.</li>
      </ul>
      <p className="text-sm text-parchment-200">
        {changes.length ? `${changes.join(', ')}.` : 'No changes yet.'}{' '}
        <span className="text-parchment-400">Saved in this browser until you reset.</span>
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn btn-primary" onClick={exportJson}>
          Export
        </button>
        <button type="button" className="btn btn-ghost" onClick={download}>
          Download
        </button>
      </div>
      <p className="text-xs text-parchment-400">Paste the export over src/data/board.json.</p>
      <div className="flex gap-2">
        <button type="button" className="btn btn-ghost flex-1 text-sm" onClick={() => setShowJson((v) => !v)}>
          {showJson ? 'Hide JSON' : 'Show JSON'}
        </button>
        <button type="button" className="btn btn-ghost flex-1 text-sm" disabled={!hasDraft} onClick={onReset}>
          Reset
        </button>
      </div>
      {showJson && (
        <textarea
          ref={textRef}
          id="board-json"
          readOnly
          value={json}
          aria-label="board.json"
          className="h-56 w-full resize-y rounded-lg border border-bronze-500/30 bg-soot-950 p-2 font-mono text-[0.65rem] leading-snug text-parchment-200"
        />
      )}
    </section>
  )
}
