/** What a dialog still needs before it can go on: `null` once filled, the sentence otherwise. */
export function missingUnless(isFilled: boolean, message: string): string | null {
  if (isFilled) {
    return null
  }

  return message
}

/** A waiting button's `aria-describedby`: the note's id while there is one. */
export function missingNoteReference(id: string, missing: string | null): string | undefined {
  if (missing === null) {
    return undefined
  }

  return id
}
