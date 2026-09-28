import type { ReactNode } from 'react'
import { BOARD } from '../data/board'
import { GAME_MODES } from '../data/gameModes'
import { MAPS } from '../data/maps'
import { MAX_PLAYERS } from '../game/engine'
import { INDUSTRIES, INDUSTRY_ORDER, LINK_COST, RULES } from '../game/rules'
import { HEX_LINK_URL, TOKEN_URLS } from './board/assets'
import { BubbleSwatch } from './board/parts'
import { IndustryIcon } from './game/IndustryIcon'
import { useT } from '../i18n'
import { IconBook } from './icons'
import { ModalFrame } from './ModalFrame'
import { SectionDivider } from './theme/Ornaments'

interface InfoModalProps {
  open: boolean
  onClose: () => void
}

/**
 * The rules, as the engine plays them. Every number comes from game/rules.ts,
 * the modes and the board data, so this never drifts from the engine.
 */
export function HowToPlayModal({ open, onClose }: InfoModalProps) {
  const t = useT()
  const r = t.rules
  const hubs = BOARD.locations.filter((l) => l.type === 'hub')
  const stops = BOARD.locations.filter((l) => l.type === 'stop')
  const railOnly = BOARD.locations.filter((l) => l.era === 'rail')
  const names = (list: { name: string }[]) => t.list(list.map((l) => l.name))
  return (
    <ModalFrame open={open} onClose={onClose} id="how-to-play" title={r.title} icon={<IconBook />} wide>
      <div className="flex flex-col gap-6 text-sm leading-relaxed text-parchment-200">
        <Section title={r.goal.title}>
          <p>{r.goal.body(RULES)}</p>
        </Section>

        <Section title={r.setup.title}>
          <p>{r.setup.body(MAX_PLAYERS)}</p>
          <table className="mt-2 w-full text-left text-xs tabular-nums">
            <thead className="text-parchment-400">
              <tr>
                {r.setup.columns.map((column) => (
                  <th key={column} className="py-1 font-semibold">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GAME_MODES.map((mode) => (
                <tr key={mode.id} className="border-t border-bronze-500/15">
                  <td className="py-1 font-semibold text-parchment-50">{t.modes[mode.id].name}</td>
                  <td className="py-1">{r.setup.rings[mode.mapSize]}</td>
                  <td className="py-1">{mode.rounds}</td>
                  <td className="py-1">{r.setup.round(Math.floor(mode.rounds / 2) + 1)}</td>
                  <td className="py-1">£{mode.startingMoney}</td>
                  <td className="py-1">{mode.turnTimerSeconds} s</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-parchment-300">{r.setup.faded}</p>
        </Section>

        <Section title={r.turn.title(RULES.actionsPerTurn)}>
          <p className="mb-2">{r.turn.intro}</p>
          <ul className="flex flex-col gap-2.5">
            <Rule name={r.turn.build.name}>{r.turn.build.body(names(railOnly))}</Rule>
            <Rule name={r.turn.link.name}>{r.turn.link.body(t.cost(LINK_COST.canal), t.cost(LINK_COST.rail), RULES.linkPrestige)}</Rule>
            <Rule name={r.turn.ship.name}>
              {r.turn.ship.intro}
              <ul className="mt-1 ml-4 list-disc">
                {r.turn.ship.sources.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              {r.turn.ship.body(RULES)}
            </Rule>
            <Rule name={r.turn.funds.name}>{r.turn.funds.body(RULES.raiseFunds)}</Rule>
            <Rule name={r.turn.end.name}>{r.turn.end.body}</Rule>
          </ul>
        </Section>

        <Section title={r.industries.title}>
          <ul className="grid gap-2 sm:grid-cols-2">
            {INDUSTRY_ORDER.map((kind) => {
              const def = INDUSTRIES[kind]
              return (
                <li key={kind} className="flex gap-3 rounded-lg border border-bronze-500/25 bg-soot-950/50 p-2.5">
                  <IndustryIcon kind={kind} className="mt-0.5 size-9 shrink-0" />
                  <div>
                    <p className="font-display font-bold tracking-wide text-parchment-50 uppercase">
                      {t.industries[kind].name} <span className="text-brass-300">+{def.prestige}★</span>
                    </p>
                    <p className="text-xs text-parchment-300">
                      {t.cost(def.cost)}
                      {def.cost.coal || def.cost.iron
                        ? ` ${r.industries.emptyStore(def.cost.money + def.cost.coal * RULES.coalPrice + def.cost.iron * RULES.ironPrice)}`
                        : ''}
                    </p>
                    <p className="text-xs text-parchment-300">{t.industries[kind].output(RULES)}.</p>
                  </div>
                </li>
              )
            })}
          </ul>
          <p className="mt-2 text-parchment-300">{r.industries.supply(RULES)}</p>
        </Section>

        <Section title={r.network.title}>
          <p>{r.network.body}</p>
        </Section>

        <Section title={r.roundEnd.title}>
          <ol className="ml-4 list-decimal">
            {r.roundEnd.steps(RULES).map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </Section>

        <Section title={r.eras.title}>
          <p>{r.eras.body(names(railOnly))}</p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            <Picture art={<BubbleSwatch label={r.eras.bubbleAlt} className="h-8 w-auto shrink-0" />}>{r.eras.bubble}</Picture>
            <Picture src={HEX_LINK_URL} alt={r.eras.hexAlt}>
              {r.eras.hex(names(stops))}
            </Picture>
            <Picture src={TOKEN_URLS.canal.purple} alt={r.eras.canalAlt} wide>
              {r.eras.canal}
            </Picture>
            <Picture src={TOKEN_URLS.rail.purple} alt={r.eras.railAlt} wide>
              {r.eras.rail}
            </Picture>
          </ul>
          <p className="mt-3">{r.eras.hubsIntro}</p>
          <ul className="mt-1 ml-4 list-disc">
            {hubs.map((hub) => (
              <li key={hub.id}>
                <strong className="text-parchment-50">{hub.name}</strong>: {r.eras.hub(hub.price, t.list(hub.buys.map((goods) => t.game.goods[goods])), hub.era === 'rail')}
              </li>
            ))}
          </ul>
        </Section>

        <Section title={r.practice.title}>
          <p>{r.practice.body(names(MAPS.filter((m) => m.style === 'schematic')))}</p>
        </Section>
      </div>
    </ModalFrame>
  )
}

/** A board piece and what it means. */
function Picture({ src, alt = '', art, wide = false, children }: { src?: string; alt?: string; art?: ReactNode; wide?: boolean; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-bronze-500/25 bg-soot-950/50 p-2.5">
      {art ?? (src ? <img src={src} alt={alt} className={`${wide ? 'h-8 w-auto' : 'size-9'} shrink-0`} /> : <span className="size-9" />)}
      <span className="text-xs text-parchment-300">{children}</span>
    </li>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="group/section">
      <SectionDivider />
      <h3 className="eyebrow mb-2 flex items-center gap-3">
        {title}
        <span className="h-px flex-1 bg-linear-to-r from-bronze-500/40 to-transparent" />
      </h3>
      {children}
    </section>
  )
}

function Rule({ name, children }: { name: string; children: ReactNode }) {
  return (
    <li>
      <span className="font-display font-bold tracking-wide text-parchment-50 uppercase">{name}.</span> {children}
    </li>
  )
}
