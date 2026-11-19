import type { FormEvent } from 'react'
import { useState } from 'react'

import { describeValidity } from '@/shared/lib/validity-message'

export type FieldError = {
  /** Empty while the value is valid or untouched. */
  message: string
  onInvalid: (event: FormEvent<HTMLInputElement>) => void
  onInput: (event: FormEvent<HTMLInputElement>) => void
}

/**
 * Keeps the browser's validation result as Portuguese text under the field. The browser's own
 * bubble disappears after a moment; this stays until the person changes the value.
 */
export function useFieldError(patternMessage?: string): FieldError {
  const [message, setMessage] = useState('')

  function onInvalid(event: FormEvent<HTMLInputElement>): void {
    const input = event.currentTarget
    const text = describeValidity(input, patternMessage)
    input.setCustomValidity(text)
    setMessage(text)
  }

  function onInput(event: FormEvent<HTMLInputElement>): void {
    event.currentTarget.setCustomValidity('')
    setMessage('')
  }

  return { message, onInvalid, onInput }
}
