/**
 * The player panel's symbols (assets/ui/player): the gold coin, coal and iron
 * cubes, the income arrow with its value inside, the VP hexagon with its
 * points inside, and the brass level plate with a roman numeral.
 */

import coalUrl from '../../../assets/ui/player/coal.svg'
import coinUrl from '../../../assets/ui/player/coin.svg'
import incomeArrowUrl from '../../../assets/ui/player/income_arrow.svg'
import ironUrl from '../../../assets/ui/player/iron.svg'
import levelPlateUrl from '../../../assets/ui/player/level_plate.svg'
import lockUrl from '../../../assets/ui/player/lock.svg'
import vpHexUrl from '../../../assets/ui/player/vp_hex.svg'
import { roman } from '../../rules/tileTable'

/** The padlock of a locked shipyard. */
export function Lock({ className = 'size-7' }: { className?: string }) {
  return <img src={lockUrl} alt="" aria-hidden="true" className={className} />
}

/** A coin followed by £n. */
export function Money({ value, size = 'md', className = '' }: { value: number; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const coin = size === 'lg' ? 'size-12' : size === 'sm' ? 'size-4' : 'size-5'
  const text = size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-sm' : 'text-base'
  return (
    <span className={`inline-flex items-center gap-1 font-display font-bold text-parchment-50 tabular-nums ${text} ${className}`}>
      <img src={coinUrl} alt="" aria-hidden="true" className={`${coin} shrink-0`} />
      <span>{size === 'lg' ? `£${value}` : value}</span>
    </span>
  )
}

export function Coin({ className = 'size-5' }: { className?: string }) {
  return <img src={coinUrl} alt="" aria-hidden="true" className={`shrink-0 ${className}`} />
}

/** One coal or iron cube; with a price in brackets when it has to come from the market. */
export function Cube({ kind, price = null, className = 'size-4' }: { kind: 'coal' | 'iron'; price?: number | null; className?: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <img src={kind === 'coal' ? coalUrl : ironUrl} alt="" aria-hidden="true" className={`shrink-0 ${className}`} />
      {price !== null && <span className="text-xs font-semibold text-parchment-300 tabular-nums">(£{price})</span>}
    </span>
  )
}

/** Produced cubes: 1–2 in a row, 3 as a triangle (2 over 1), 4 as a 2×2 square, more in rows of 3. */
export function CubeGroup({ kind, count }: { kind: 'coal' | 'iron'; count: number }) {
  const cube = <img src={kind === 'coal' ? coalUrl : ironUrl} alt="" aria-hidden="true" className="size-3.5" />
  const rows: number[] = count <= 2 ? [count] : count === 3 ? [2, 1] : count === 4 ? [2, 2] : Array.from({ length: Math.ceil(count / 3) }, (_, i) => Math.min(3, count - i * 3))
  return (
    <span className="inline-flex flex-col items-center gap-px" role="img" aria-label={`${count} ${kind}`}>
      {rows.map((n, r) => (
        <span key={r} className="flex gap-px">
          {Array.from({ length: n }, (_, i) => (
            <span key={i}>{cube}</span>
          ))}
        </span>
      ))}
    </span>
  )
}

/** The solid yellow up-arrow with the income inside in dark text, e.g. "£5". */
export function IncomeArrow({ value, size = 'md', label }: { value: number; size?: 'sm' | 'md' | 'lg'; label?: string }) {
  const box = size === 'lg' ? 'size-14' : size === 'sm' ? 'size-7' : 'size-9'
  const text = size === 'lg' ? 'text-lg pt-4' : size === 'sm' ? 'text-[0.55rem] pt-2' : 'text-[0.7rem] pt-2.5'
  return (
    <span className={`relative inline-grid shrink-0 place-items-center ${box}`} role="img" aria-label={label ?? `£${value}`}>
      <img src={incomeArrowUrl} alt="" aria-hidden="true" className="absolute inset-0 size-full" />
      <span className={`relative font-display font-extrabold tabular-nums text-[#281a06] ${text}`}>£{value}</span>
    </span>
  )
}

/** The yellow hexagon with a black centre and the VP inside in yellow. */
export function VpHex({ value, size = 'md', label }: { value: number; size?: 'sm' | 'md' | 'lg'; label?: string }) {
  const box = size === 'lg' ? 'size-14' : size === 'sm' ? 'size-7' : 'size-9'
  const text = size === 'lg' ? 'text-xl' : size === 'sm' ? 'text-[0.65rem]' : 'text-sm'
  return (
    <span className={`relative inline-grid shrink-0 place-items-center ${box}`} role="img" aria-label={label ?? `${value} VP`}>
      <img src={vpHexUrl} alt="" aria-hidden="true" className="absolute inset-0 size-full" />
      <span className={`relative font-display font-extrabold text-brass-300 tabular-nums ${text}`}>{value}</span>
    </span>
  )
}

/** The brass plate with the level in roman numerals. */
export function LevelPlate({ level }: { level: number }) {
  return (
    <span className="relative inline-grid h-7 w-11 shrink-0 place-items-center">
      <img src={levelPlateUrl} alt="" aria-hidden="true" className="absolute inset-0 size-full" />
      <span className="relative font-display text-sm font-extrabold text-parchment-50">{roman(level)}</span>
    </span>
  )
}
