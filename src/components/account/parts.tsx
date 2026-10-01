import type { ReactNode } from 'react'

/* Building blocks shared by the account settings tabs. */

/** One part of a tab: a titled iron panel. */
export function Panel({ title, intro, aside, children, id }: { title: string; intro?: ReactNode; aside?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section aria-labelledby={id} className="plate rivets iron flex flex-col gap-4 p-5 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h2 id={id} className="font-display text-xl font-extrabold tracking-[0.1em] text-parchment-50 uppercase">
            {title}
          </h2>
          {intro && <p className="mt-1 max-w-prose text-sm text-parchment-300">{intro}</p>}
        </div>
        {aside}
      </header>
      {children}
    </section>
  )
}

/** "On" / "Off" style status pill. */
export function StatusPill({ on, children }: { on: boolean; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-display text-xs font-bold tracking-[0.14em] whitespace-nowrap uppercase ${
        on ? 'border-verdigris-400/60 bg-verdigris-500/10 text-verdigris-300' : 'border-bronze-500/40 bg-soot-950/60 text-parchment-300'
      }`}
    >
      <span aria-hidden="true" className={`size-1.5 rounded-full ${on ? 'bg-verdigris-300' : 'bg-parchment-400'}`} />
      {children}
    </span>
  )
}

/** A smaller button row under a form. */
export function Actions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>
}

export const textareaClass =
  'w-full rounded-lg border border-bronze-500/35 bg-soot-950/75 px-3.5 py-2.5 text-base text-parchment-50 shadow-[inset_0_1px_3px_rgb(0_0_0/0.6)] outline-none transition-colors hover:border-bronze-400/60 focus:border-ember-400/80'

export const selectClass =
  'h-12 w-full appearance-none rounded-lg border border-bronze-500/35 bg-soot-950/75 pr-9 pl-3 text-base text-parchment-50 outline-none transition hover:border-bronze-300/60 focus-visible:border-bronze-300/80'
