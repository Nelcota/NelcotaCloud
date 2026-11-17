/** Whether a typed confirmation is still missing; nothing is required without an expected text. */
export function isConfirmationMissing(expected: string | undefined, typedText: string): boolean {
  if (expected === undefined) {
    return false
  }

  return typedText.trim() !== expected
}
