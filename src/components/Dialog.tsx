import { useEffect, useRef, type ReactNode } from 'react'

interface DialogProps {
  open: boolean
  onClose: () => void
  /** id of the element that names the dialog (usually its heading). */
  labelledBy: string
  /** Centered modal, a drawer sliding in from the left edge, a sheet rising from the bottom, or the whole screen. */
  variant?: 'modal' | 'drawer-left' | 'sheet-bottom' | 'screen'
  /** False: Escape and the backdrop don't close it (a step that has to be finished). */
  dismissible?: boolean
  className?: string
  children: ReactNode
}

/**
 * Thin wrapper around the native <dialog> element, which gives us focus
 * trapping, Escape-to-close, an inert page behind it and focus restoration
 * for free. Clicking the backdrop also closes it. Open/close animations live
 * in index.css (.bz-dialog).
 */
export function Dialog({ open, onClose, labelledBy, variant = 'modal', dismissible = true, className = '', children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  // Only treat a click as a backdrop click if the press also started there,
  // so dragging a slider out of the panel doesn't close it.
  const pressStartedOnBackdrop = useRef(false)

  // Keep the element in sync with the `open` prop.
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      className={`bz-dialog bz-dialog--${variant} ${className}`}
      // Fires for Escape and for close() calls; keeps parent state in sync.
      onClose={onClose}
      onCancel={(event) => {
        if (!dismissible) event.preventDefault()
      }}
      onPointerDown={(event) => {
        pressStartedOnBackdrop.current = event.target === event.currentTarget
      }}
      onClick={(event) => {
        if (dismissible && pressStartedOnBackdrop.current && event.target === event.currentTarget) onClose()
      }}
    >
      {children}
    </dialog>
  )
}
