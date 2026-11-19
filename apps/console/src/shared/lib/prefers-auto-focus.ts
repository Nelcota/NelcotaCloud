const FINE_POINTER_QUERY = '(pointer: fine)'

/**
 * Whether a form may focus its first field on load. On touch screens that opens the keyboard
 * over the page before the person has read it, so only mouse and trackpad users get it.
 */
export function prefersAutoFocus(): boolean {
  if (typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia(FINE_POINTER_QUERY).matches
}
