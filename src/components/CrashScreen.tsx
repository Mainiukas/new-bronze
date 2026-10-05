import { Component, type ReactNode } from 'react'

/** The crash screen's words, by the page's language (it can't rely on the app's own, which may be what failed). */
const WORDS: Record<string, { title: string; body: string; reload: string; home: string }> = {
  en: { title: 'Something went wrong', body: 'This page hit an error. Reloading usually fixes it.', reload: 'Reload', home: 'Main menu' },
  de: { title: 'Etwas ist schiefgelaufen', body: 'Auf dieser Seite ist ein Fehler aufgetreten. Neu laden hilft meistens.', reload: 'Neu laden', home: 'Hauptmenü' },
  es: { title: 'Algo ha fallado', body: 'Esta página ha tenido un error. Recargarla suele arreglarlo.', reload: 'Recargar', home: 'Menú principal' },
  fr: { title: 'Un problème est survenu', body: 'Cette page a rencontré une erreur. La recharger règle généralement le problème.', reload: 'Recharger', home: 'Menu principal' },
  lt: { title: 'Kažkas nepavyko', body: 'Šiame puslapyje įvyko klaida. Dažniausiai padeda puslapio įkėlimas iš naujo.', reload: 'Įkelti iš naujo', home: 'Pagrindinis meniu' },
}

/**
 * Catches an error anywhere in the app and shows it plainly, with Reload and
 * Main menu, instead of leaving a blank screen.
 */
export class CrashScreen extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('Bronze crashed:', error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    const w = WORDS[document.documentElement.lang.slice(0, 2)] ?? WORDS.en
    return (
      <main role="alert" className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-soot-950 px-6 text-center text-parchment-100">
        <h1 className="font-display text-3xl font-extrabold tracking-[0.08em] text-parchment-50 uppercase">{w.title}</h1>
        <p className="max-w-md text-parchment-300">{w.body}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" className="btn btn-primary min-h-11 px-6" onClick={() => window.location.reload()}>
            {w.reload}
          </button>
          <a
            href="#/"
            className="btn btn-ghost min-h-11 px-6"
            onClick={() => {
              window.location.hash = '#/'
              window.location.reload()
            }}
          >
            {w.home}
          </a>
        </div>
      </main>
    )
  }
}
