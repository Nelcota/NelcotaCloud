import { useRef } from 'react'

type FocusHandler = (event: Event) => void

type ReturnFocusHandlers = {
  onOpenAutoFocus: FocusHandler
  onCloseAutoFocus: FocusHandler
}

/**
 * Radix returns focus to its own trigger, which controlled dialogs opened from a menu or a
 * shortcut do not have; this remembers whatever had focus when the dialog opened and goes back.
 */
export function useReturnFocus(
  onOpen: FocusHandler | undefined,
  onClose: FocusHandler | undefined,
): ReturnFocusHandlers {
  const opener = useRef<HTMLElement | null>(null)

  function rememberOpener(event: Event): void {
    opener.current = focusedElement()
    onOpen?.(event)
  }

  function restoreFocus(event: Event): void {
    onClose?.(event)
    const target = opener.current

    if (event.defaultPrevented || target === null || target.isConnected === false) {
      return
    }

    event.preventDefault()
    target.focus()
  }

  return { onOpenAutoFocus: rememberOpener, onCloseAutoFocus: restoreFocus }
}

function focusedElement(): HTMLElement | null {
  const active = document.activeElement

  if (active instanceof HTMLElement) {
    return active
  }

  return null
}
