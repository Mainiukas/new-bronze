/*
 * The loading splash lives in index.html, so it can show before any script
 * has loaded: if the app isn't up within 400 ms, a timer there fills it in
 * (logo, spinning cog, indeterminate bar). Once the app has drawn its first
 * page it calls this, and the splash fades out (or never appears).
 */

declare global {
  interface Window {
    /** Set when the app is up: the splash timer in index.html then does nothing. */
    __bronzeReady?: boolean
  }
}

export function hideSplash() {
  window.__bronzeReady = true
  const splash = document.getElementById('splash')
  if (!splash) return
  if (!splash.classList.contains('splash--on')) {
    splash.remove()
    return
  }
  const remove = () => splash.remove()
  splash.addEventListener('transitionend', remove, { once: true })
  window.setTimeout(remove, 600)
  splash.classList.add('splash--out')
}
