/** A step's `missing` text: `null` once the step is filled, the sentence that says what is left otherwise. */
export function missingUnless(isFilled: boolean, message: string): string | null {
  if (isFilled) {
    return null
  }

  return message
}
