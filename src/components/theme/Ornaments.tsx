import type { ReactNode } from 'react'
import cornerUrl from '../../../assets/ui/ornaments/corner.svg'
import dividerUrl from '../../../assets/ui/ornaments/divider.svg'
import sealUrl from '../../../assets/ui/ornaments/seal.svg'

/* The brass ornaments (assets/ui/ornaments). Decorative: hidden from assistive tech. */

/** corner.svg is drawn for the top-left; the others are it turned. */
const CORNERS = [
  { position: '-top-1.5 -left-1.5', turn: 'rotate-0' },
  { position: '-top-1.5 -right-1.5', turn: 'rotate-90' },
  { position: '-right-1.5 -bottom-1.5', turn: 'rotate-180' },
  { position: '-bottom-1.5 -left-1.5', turn: '-rotate-90' },
] as const

/**
 * Brass brackets on the four corners of a big panel (its parent must be
 * positioned). 48 px, 36 px on phones, sitting on the border; left out
 * below 360 px, where they would crowd the content.
 */
export function Corners() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 max-[359px]:hidden">
      {CORNERS.map(({ position, turn }) => (
        <img key={turn} src={cornerUrl} alt="" width={120} height={120} draggable={false} className={`absolute size-9 md:size-12 ${position} ${turn}`} />
      ))}
    </span>
  )
}

/** The brass rule with a cog in the middle, centred; give it a max-width class. */
export function Divider({ className = '' }: { className?: string }) {
  return (
    <img
      src={dividerUrl}
      alt=""
      aria-hidden="true"
      width={600}
      height={40}
      draggable={false}
      className={`pointer-events-none mx-auto block h-auto w-full ${className}`}
    />
  )
}

/** Between the sections of a big dialog: the divider over every section but the first (put `group/section` on the section). */
export function SectionDivider() {
  return <Divider className="mb-6 max-w-80 group-first/section:hidden" />
}

/** The divider with a word on a dark pill over its cog ("or" between sign-in options). */
export function LabelledDivider({ label, className = '' }: { label: string; className?: string }) {
  return (
    <div role="separator" aria-label={label} className={`relative flex items-center justify-center ${className}`}>
      <img src={dividerUrl} alt="" width={600} height={40} draggable={false} className="pointer-events-none block h-auto w-full" />
      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-bronze-400/60 bg-soot-950 px-3 py-1 font-display text-xs leading-none font-bold tracking-[0.3em] text-parchment-100 uppercase shadow-[0_0_0_3px_rgb(11_8_6/0.9)]">
        {label}
      </span>
    </div>
  )
}

/**
 * The round cog frame behind something round (an avatar, an achievement's
 * badge): it sizes itself to the child and rings it.
 */
export function Seal({ children, dim = false, className = '' }: { children: ReactNode; dim?: boolean; className?: string }) {
  return (
    <span className={`relative inline-grid shrink-0 place-items-center ${className}`}>
      <img
        src={sealUrl}
        alt=""
        aria-hidden="true"
        width={160}
        height={160}
        draggable={false}
        className={`pointer-events-none absolute top-1/2 left-1/2 size-[146%] max-w-none -translate-x-1/2 -translate-y-1/2 ${dim ? 'opacity-45 grayscale' : ''}`}
      />
      <span className="relative grid place-items-center">{children}</span>
    </span>
  )
}

/**
 * A page's title: display capitals in the logo's brass, with a dark outline
 * and a soft shadow, and (optionally) the divider under it.
 */
export function PageTitle({ id, children, divider = false, className = '' }: { id?: string; children: ReactNode; divider?: boolean; className?: string }) {
  return (
    <>
      <h1 id={id} className={`page-title ${className}`}>
        {children}
      </h1>
      {divider && <Divider className="mt-3 max-w-[420px]" />}
    </>
  )
}
