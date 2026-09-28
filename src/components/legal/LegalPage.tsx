import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { PATHS } from '../../data/navigation'
import { formatLegalDate, isPlaceholder, LEGAL_LAST_UPDATED, unfilledPlaceholders } from '../../legal/operator'
import { Corners } from '../theme/Ornaments'

/**
 * The frame of every legal page: title, "Last updated", a notice while
 * operator details are still placeholders, and the text. `ornate`: brass
 * corners on the panel (Credits, which used to be a dialog).
 */
export function LegalPage({
  title,
  intro,
  children,
  updated = LEGAL_LAST_UPDATED,
  ornate = false,
}: {
  title: string
  intro?: ReactNode
  children: ReactNode
  updated?: string
  ornate?: boolean
}) {
  const missing = unfilledPlaceholders()
  return (
    <article className="mx-auto max-w-3xl animate-fade-up px-4 py-8 sm:px-6 sm:py-12" aria-labelledby="legal-title">
      <div className="plate rivets iron p-5 sm:p-8">
        {ornate && <Corners />}
        <p className="eyebrow">
          <Link to={PATHS.legal} className="rounded underline-offset-4 hover:underline">
            Legal
          </Link>
        </p>
        <h1 id="legal-title" className="page-title text-4xl tracking-[0.08em] sm:text-5xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-parchment-300">
          Last updated: <time dateTime={updated}>{formatLegalDate(updated)}</time>
        </p>
        {missing.length > 0 && (
          <p className="mt-4 rounded-lg border border-dashed border-brass-400/60 bg-brass-500/10 px-3 py-2 text-sm text-brass-200" role="note">
            Draft: some details of who runs Bronze aren’t filled in yet (shown like <Fill value="{{THIS}}" />).
          </p>
        )}
        {intro && <div className="mt-5 text-lg leading-relaxed text-parchment-100">{intro}</div>}
        <div className="legal-prose mt-6 flex flex-col gap-6 leading-relaxed text-parchment-200">{children}</div>
      </div>
    </article>
  )
}

/** A numbered-free section with an h2 heading (the page's h1 is the title). */
export function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id ? `${id}-title` : undefined} className="flex flex-col gap-3">
      <h2 id={id ? `${id}-title` : undefined} className="font-display text-2xl font-bold tracking-[0.06em] text-parchment-50 uppercase">
        {title}
      </h2>
      {children}
    </section>
  )
}

export function Sub({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-display text-lg font-bold tracking-[0.06em] text-parchment-100 uppercase">{title}</h3>
      {children}
    </div>
  )
}

/** An operator detail: highlighted while it's still a {{PLACEHOLDER}}. */
export function Fill({ value }: { value: string }) {
  if (!isPlaceholder(value)) return <>{value}</>
  return <mark className="rounded bg-brass-300/20 px-1 font-mono text-[0.9em] text-brass-200">{value}</mark>
}

/** An email address as a link (or the placeholder while there isn't one). */
export function Email({ value }: { value: string }) {
  if (isPlaceholder(value)) return <Fill value={value} />
  return (
    <a href={`mailto:${value}`} className="font-semibold text-brass-300 underline underline-offset-2 hover:text-brass-200">
      {value}
    </a>
  )
}

export function Bullets({ children }: { children: ReactNode }) {
  return <ul className="ml-5 flex list-disc flex-col gap-1.5 marker:text-bronze-400">{children}</ul>
}

/** A data table that scrolls sideways on narrow screens instead of breaking the page. */
export function DataTable({ caption, head, rows }: { caption: string; head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-bronze-500/30" role="region" aria-label={`${caption} (table)`} tabIndex={0}>
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-soot-950/70">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="border-b border-bronze-500/30 px-3 py-2 font-display font-bold tracking-[0.08em] text-parchment-100 uppercase">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="align-top odd:bg-soot-900/40">
              {row.map((cell, j) =>
                j === 0 ? (
                  <th key={j} scope="row" className="border-b border-bronze-500/15 px-3 py-2 font-semibold text-parchment-50">
                    {cell}
                  </th>
                ) : (
                  <td key={j} className="border-b border-bronze-500/15 px-3 py-2 text-parchment-200">
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** A link within the legal text. */
export function TextLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="font-semibold text-brass-300 underline underline-offset-2 hover:text-brass-200">
      {children}
    </Link>
  )
}
