import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted fonts (Latin subset only), bundled by Vite: no external requests.
import '@fontsource/barlow-condensed/latin-500.css'
import '@fontsource/barlow-condensed/latin-600.css'
import '@fontsource/barlow-condensed/latin-700.css'
import '@fontsource/barlow-condensed/latin-800.css'
import '@fontsource/barlow/latin-400.css'
import '@fontsource/barlow/latin-500.css'
import '@fontsource/barlow/latin-600.css'
// Cinzel: the brass buttons and the board's labels.
import '@fontsource/cinzel/latin-700.css'
import App from './App.tsx'
import { normalizeAuthRedirect } from './auth/redirect'
import { preloadBoardImages } from './components/board/assets'
import { preloadPainting } from './components/theme/backgrounds'
import { parseSettings } from './data/settings'
import { detectLanguage, loadMessages, setLanguage } from './i18n'
import { readStorage, removeStorage, STORAGE_KEYS } from './lib/storage'
import { whenFirstPageSettled } from './components/theme/firstPaint'
import './index.css'

// Development only: warn about pictures shown larger than their real pixel size.
if (import.meta.env.DEV) void import('./lib/imageSizeCheck').then(({ watchImageSizes }) => watchImageSizes())

// A map-editor draft saved before the towns moved would hide the new board: drop it.
removeStorage(STORAGE_KEYS.boardDraft.replace(/\.v2$/, ''))

// Once the first page is on screen with its painting and the browser is idle, fetch what comes next: the
// account screens' painting (on desktops index.html has already preloaded it), and the board's pictures and code.
// None of it holds the first page up; opening a board or the account screens sooner loads them then.
// (Not on the window's load event: that fires before the app has drawn anything.)
const prefetchNext = () => {
  const run = () => {
    preloadPainting('auth')
    void preloadBoardImages()
    // Code split from the first page's (see App.tsx): the account screens, the dialogs, the match and the board.
    void import('./pages/AuthScreen')
    void import('./components/SettingsModal')
    void import('./components/InfoModals')
    void import('./pages/Game')
    void import('./pages/MapBoard')
  }
  if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 3000 })
  else setTimeout(run, 500)
}
void whenFirstPageSettled().then(prefetchNext)

// A failed Google or email-link return can land as #error=…: turn it back into a route first.
normalizeAuthRedirect()

// The saved language (or the browser's): its words arrive before the first frame, so it never starts in English.
const language = parseSettings(readStorage(STORAGE_KEYS.settings))?.language ?? detectLanguage()
setLanguage(language)
void loadMessages(language).then(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  ),
)
