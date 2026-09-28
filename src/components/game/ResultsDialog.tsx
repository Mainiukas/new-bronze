import type { Achievement } from '../../data/achievements'
import type { GameState } from '../../game/types'
import { displayName, useT } from '../../i18n'
import { IconStar } from '../icons'
import { ModalFrame } from '../ModalFrame'
import { Divider, Seal } from '../theme/Ornaments'
import { PlayerSwatch } from './PlayerSwatch'

interface ResultsDialogProps {
  open: boolean
  onClose: () => void
  game: GameState
  /** Achievements this match unlocked for you. */
  unlocked: Achievement[]
  colorBlind: boolean
  onRematch: () => void
  onLeave: () => void
}

/** Final ranking with the score breakdown (the podium's players in brass seals), match stats, achievements, and what to do next. */
export function ResultsDialog({ open, onClose, game, unlocked, colorBlind, onRematch, onLeave }: ResultsDialogProps) {
  const t = useT()
  const r = t.results
  const name = (raw: string) => displayName(t, raw)
  const scores = game.scores ?? []
  const winners = scores.filter((s) => s.rank === 1).map((s) => game.players[s.player])
  const humans = game.players.filter((p) => !p.isAI)
  const headline =
    winners.length > 1
      ? r.shared(winners.map((w) => name(w.name)))
      : humans.length === 1 && winners[0]?.id === humans[0].id
        ? r.youWin
        : r.wins(winners[0] ? name(winners[0].name) : r.nobody)

  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      id="results"
      title={r.title}
      icon={<IconStar />}
      wide
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onLeave}>
            {t.nav.mainMenu}
          </button>
          <button type="button" className="btn btn-primary px-6" onClick={onRematch}>
            {r.rematch}
          </button>
        </>
      }
    >
      <p className="metal-text text-center font-display text-3xl font-extrabold tracking-[0.1em] text-balance uppercase sm:text-4xl">{headline}</p>
      <p className="mt-1 text-center text-sm text-parchment-300">
        {r.formula}
      </p>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-sm tabular-nums">
          <caption className="sr-only">{r.finalScores}</caption>
          <thead>
            <tr className="text-left text-[0.65rem] tracking-[0.12em] text-parchment-400 uppercase">
              <th className="pb-2 font-semibold">#</th>
              <th className="pb-2 font-semibold">{r.player}</th>
              <th className="pb-2 text-right font-semibold">{r.playStars}</th>
              <th className="pb-2 text-right font-semibold">{r.moneyBonus}</th>
              <th className="pb-2 text-right font-semibold">{r.hubBonus}</th>
              <th className="pb-2 text-right font-semibold">{r.total}</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((score) => {
              const player = game.players[score.player]
              return (
                <tr key={score.player} className={`border-t border-bronze-500/15 ${score.rank === 1 ? 'bg-bronze-500/10' : ''}`}>
                  <td className="py-2.5 pr-2 font-display font-bold text-parchment-300">{score.rank === 1 ? '🏆' : score.rank}</td>
                  <td className="py-2.5">
                    <span className="flex items-center gap-2">
                      {score.rank <= 3 ? (
                        <Seal className="mx-1">
                          <PlayerSwatch color={player.color} letter={colorBlind} />
                        </Seal>
                      ) : (
                        <PlayerSwatch color={player.color} letter={colorBlind} className="mx-1 size-4" />
                      )}
                      <span className="font-semibold text-parchment-50">{name(player.name)}</span>
                      <span className="text-xs text-parchment-400">£{player.money}</span>
                    </span>
                  </td>
                  <td className="text-right text-parchment-200">{score.prestige}</td>
                  <td className="text-right text-parchment-200">+{score.moneyBonus}</td>
                  <td className="text-right text-parchment-200">+{score.hubBonus}</td>
                  <td className="text-right font-display text-lg font-extrabold text-brass-300">{score.total}★</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Divider className="mt-6 max-w-80" />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm tabular-nums">
          <caption className="eyebrow mb-2 text-left">{r.stats}</caption>
          <thead>
            <tr className="text-left text-[0.65rem] tracking-[0.12em] text-parchment-400 uppercase">
              <th className="pb-1.5 font-semibold">{r.player}</th>
              <th className="pb-1.5 text-right font-semibold">{t.stats.goodsShipped}</th>
              <th className="pb-1.5 text-right font-semibold">{r.linksBuilt}</th>
              <th className="pb-1.5 text-right font-semibold">{r.industries}</th>
            </tr>
          </thead>
          <tbody>
            {game.players.map((p) => (
              <tr key={p.id} className="border-t border-bronze-500/10">
                <td className="py-1.5">
                  <span className="flex items-center gap-2">
                    <PlayerSwatch color={p.color} letter={colorBlind} className="size-3.5" />
                    {name(p.name)}
                  </span>
                </td>
                <td className="text-right text-parchment-200">{p.goodsShipped}</td>
                <td className="text-right text-parchment-200">{p.linksBuilt}</td>
                <td className="text-right text-parchment-200">{game.buildings.filter((b) => b.owner === p.id).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {unlocked.length > 0 && <Divider className="mt-6 max-w-80" />}
      {unlocked.length > 0 && (
        <div className="mt-4 rounded-xl border border-brass-300/40 bg-bronze-500/10 px-4 py-3">
          <p className="eyebrow mb-2">{r.achievementsUnlocked}</p>
          <ul className="flex flex-col gap-1.5">
            {unlocked.map((achievement) => (
              <li key={achievement.id} className="flex items-baseline gap-2 text-sm">
                <span className="font-display text-base font-bold tracking-wide text-brass-200">{t.achievements.list[achievement.id].name}</span>
                <span className="text-parchment-300">{t.achievements.list[achievement.id].description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ModalFrame>
  )
}
