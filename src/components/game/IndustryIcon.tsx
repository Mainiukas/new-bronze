import { useState, type ImgHTMLAttributes } from 'react'
import { INDUSTRY_ICON_URLS } from '../board/assets'
import { INDUSTRY_SHORT } from '../../data/board'
import { INDUSTRIES } from '../../game/rules'
import type { IndustryKind } from '../../game/types'

interface IndustryIconProps extends ImgHTMLAttributes<HTMLImageElement> {
  kind: IndustryKind
  /** Where the icon stands alone (no name beside it): its name, read out and shown on hover. Otherwise it's decorative. */
  label?: string
}

/**
 * The industry's picture (assets/icons), sized by font-size unless a class
 * sets it. If the image is missing it shows a short label instead.
 */
export function IndustryIcon({ kind, className = '', style, label, ...props }: IndustryIconProps) {
  const url = INDUSTRY_ICON_URLS[kind]
  const [failed, setFailed] = useState(false)
  // Sized by the font unless the caller gives a size class.
  const sized = /(^|\s)size-/.test(className) ? className : `size-[1em] ${className}`
  if (!url || failed) {
    return (
      <span
        aria-hidden={label ? undefined : true}
        role={label ? 'img' : undefined}
        aria-label={label}
        className={`inline-grid place-items-center rounded-sm bg-soot-800 font-board leading-none font-bold text-parchment-200 ${sized}`}
        style={style}
      >
        <span style={{ fontSize: '0.32em' }}>{INDUSTRY_SHORT[kind]}</span>
      </span>
    )
  }
  return (
    <img
      src={url}
      alt={label ?? ''}
      title={label}
      aria-hidden={label ? undefined : true}
      draggable={false}
      className={`inline-block object-contain ${sized}`}
      style={style}
      onError={() => {
        console.warn(`Icon for ${INDUSTRIES[kind].name} failed to load; showing a short label instead.`)
        setFailed(true)
      }}
      {...props}
    />
  )
}
