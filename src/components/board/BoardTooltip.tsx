import {
  isLinkActive,
  slotKey,
  type BoardData,
  type BoardLink,
  type BoardLocation,
  type BuiltState,
  type Era,
} from '../../data/board'
import { useT } from '../../i18n'
import { IndustryIcon } from '../game/IndustryIcon'
import type { GroupLayout, RouteLayout } from './layout'

export type TooltipTarget = { type: 'location'; id: string; slot?: number } | { type: 'link'; id: string }

interface BoardTooltipProps {
  board: BoardData
  groups: ReadonlyMap<string, GroupLayout>
  routes: ReadonlyMap<string, RouteLayout>
  era: Era
  built: BuiltState
  prices?: Readonly<Record<string, number>>
  playerName: (player: number) => string
  target: TooltipTarget
}


/**
 * Hover card for a location or link, positioned over the board in % so it
 * follows the board at any size. Flips below the target near the top edge.
 */
export function BoardTooltip({ board, groups, routes, era, built, prices, playerName, target }: BoardTooltipProps) {
  let anchor: { x: number; top: number; bottom: number } | null = null
  let body = null
  if (target.type === 'location') {
    const location = board.locations.find((l) => l.id === target.id)
    const g = groups.get(target.id)
    if (location && g) {
      anchor = { x: g.center.x, top: g.bounds.y, bottom: g.bounds.y + g.bounds.h }
      body = <LocationDetails board={board} era={era} built={built} prices={prices} playerName={playerName} location={location} slot={target.slot} />
    }
  } else {
    const route = routes.get(target.id)
    if (route) {
      anchor = { x: route.marker.x, top: route.marker.y - 14, bottom: route.marker.y + 14 }
      body = <LinkDetails board={board} era={era} built={built} playerName={playerName} link={route.link} />
    }
  }
  if (!anchor) return null
  const below = anchor.top < 300
  const style = {
    left: `${Math.min(84, Math.max(16, anchor.x / 10))}%`,
    top: `${(below ? anchor.bottom + 10 : anchor.top - 10) / 10}%`,
    transform: `translate(-50%, ${below ? '0' : '-100%'})`,
  }
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 w-max max-w-80 rounded-lg border border-bronze-400/60 bg-soot-950/95 px-3 py-2.5 text-left text-xs text-parchment-200 shadow-[0_10px_30px_-8px_rgb(0_0_0/0.9)]"
      style={style}
    >
      {body}
    </div>
  )
}

type DetailsProps = Omit<BoardTooltipProps, 'target' | 'groups' | 'routes'>

function Connections({ board, era, location }: { board: BoardData; era: Era; location: BoardLocation }) {
  const tt = useT().tooltip
  const name = (id: string) => board.locations.find((l) => l.id === id)?.name ?? id
  const links = board.links.filter((l) => l.from === location.id || l.to === location.id)
  return (
    <div className="mt-1.5">
      <p className="text-parchment-400">{tt.connections}</p>
      <ul className="grid grid-cols-[auto_auto] gap-x-3">
        {links.map((l) => {
          const active = isLinkActive(l.type, era)
          return (
            <li key={l.id} className={`contents ${active ? '' : 'text-parchment-400'}`}>
              <span>{name(l.from === location.id ? l.to : l.from)}</span>
              <span>
                {tt.linkType[l.type]}
                {active ? '' : ` (${tt.eraOnly[l.type === 'rail' ? 'rail' : 'canal']})`}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function LocationDetails({ board, era, built, prices, playerName, location, slot }: DetailsProps & { location: BoardLocation; slot?: number }) {
  const t = useT()
  const tt = t.tooltip
  const style =
    location.type === 'city' ? tt.city(board.regions[location.region]?.name ?? location.region) : location.type === 'stop' ? tt.stop : tt.hub
  return (
    <>
      <p className="font-board text-sm font-bold tracking-wide text-parchment-50">{location.name}</p>
      <p className="text-parchment-400">{style}</p>
      {location.era === 'rail' && <p className="font-semibold text-brass-200">{tt.railOnly}</p>}
      {location.type === 'city' && (
        <ol className="mt-1.5 flex flex-col gap-1">
          {location.slots.map((allowed, i) => {
            const tile = built.slots[slotKey(location.id, i)]
            return (
              <li key={i} className={`flex items-center gap-1.5 ${i === slot ? 'text-brass-200' : ''}`}>
                <span className="text-parchment-400">{i + 1}.</span>
                {allowed.map((a) => (
                  <IndustryIcon key={a} kind={a} className="size-5" />
                ))}
                <span>
                  {t.or(allowed.map((a) => t.industries[a].name))}
                  {tile && (
                    <span className="text-parchment-50">
                      {' '}
                      — {tt.owned(playerName(tile.player), tile.industry)}
                      {tile.industry === 'cotton' ? ` (${t.amountOf(tile.goods ?? 0, 'cotton')})` : ''}
                    </span>
                  )}
                </span>
              </li>
            )
          })}
        </ol>
      )}
      {location.type === 'hub' && (
        <div className="mt-1.5">
          <p>
            <span className="text-parchment-400">{tt.buys}</span> {t.list(location.buys.map((b) => t.game.goods[b]))}
          </p>
          <p>
            <span className="text-parchment-400">{tt.priceNow}</span>{' '}
            <span className="font-semibold text-brass-200">£{prices?.[location.id] ?? location.price}</span> {tt.priceRule(location.price)}
          </p>
          <p className="mt-1 flex gap-1">
            {location.buys.map((b) => (
              <IndustryIcon key={b} kind={b} className="size-6" label={t.game.goods[b]} />
            ))}
          </p>
        </div>
      )}
      <Connections board={board} era={era} location={location} />
    </>
  )
}

function LinkDetails({ board, era, built, playerName, link }: DetailsProps & { link: BoardLink }) {
  const tt = useT().tooltip
  const name = (id: string) => board.locations.find((l) => l.id === id)?.name ?? id
  const owner = built.links[link.id]
  return (
    <>
      <p className="font-board text-sm font-bold tracking-wide text-parchment-50">
        {name(link.from)} – {name(link.to)}
      </p>
      <p className="text-parchment-400">
        {link.type === 'both' ? tt.both(era) : tt.only(link.type)}
      </p>
      {owner && (
        <p className="mt-1 text-parchment-50">
          {tt.builtBy(era, playerName(owner.player))}
        </p>
      )}
    </>
  )
}
