import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ToastContext } from '../hooks/useToast'
import { Gear } from './Gear'
import { IconClose } from './icons'

/** How long a toast stays on screen. */
const TOAST_DURATION_MS = 4000
/** Matches the fade-out transition below. */
const TOAST_EXIT_MS = 250
/** Toasts shown at once; a new one pushes out the oldest. */
const MAX_TOASTS = 3

interface Toast {
  id: number
  message: string
  leaving: boolean
}

/**
 * Provides `useToast()` to the app and renders the toast area. Toasts stack,
 * newest at the bottom (up to three); repeating a message that's showing
 * moves it to the bottom and restarts its timer instead of adding another.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const notify = useCallback((message: string) => {
    nextId.current += 1
    const toast = { id: nextId.current, message, leaving: false }
    setToasts((current) => [...current.filter((t) => t.message !== message), toast].slice(-MAX_TOASTS))
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.map((t) => (t.id === id ? { ...t, leaving: true } : t)))
  }, [])

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={notify}>
      {children}

      {/* The live region is always mounted so screen readers announce new messages. */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-32 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-10"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} onGone={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastCard({ toast, onDismiss, onGone }: { toast: Toast; onDismiss: (id: number) => void; onGone: (id: number) => void }) {
  const { id, leaving } = toast
  // Auto-dismiss, then remove the toast once its exit transition has run.
  useEffect(() => {
    const timer = leaving ? window.setTimeout(() => onGone(id), TOAST_EXIT_MS) : window.setTimeout(() => onDismiss(id), TOAST_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [id, leaving, onDismiss, onGone])

  return (
    <div
      className={`plate rivets pointer-events-auto flex w-full max-w-lg animate-toast-in items-center gap-3 overflow-hidden border-bronze-400/50 py-3 pr-3 pl-4 transition duration-250 ${
        leaving ? 'translate-y-2 opacity-0' : 'opacity-100'
      }`}
    >
      <span className="absolute inset-y-0 left-0 w-1 bg-linear-to-b from-ember-400 to-bronze-600" />
      <Gear teeth={10} holes={0} className="size-7 shrink-0 animate-[spin_3s_linear_infinite] text-bronze-400" />
      <p className="flex-1 font-display text-lg leading-tight font-semibold tracking-wide text-parchment-50">{toast.message}</p>
      <button type="button" onClick={() => onDismiss(id)} className="rounded-full p-1.5 text-parchment-300 hover:text-parchment-50">
        <IconClose className="size-4" />
        <span className="sr-only">Dismiss</span>
      </button>
    </div>
  )
}
