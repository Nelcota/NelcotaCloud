/** A field's hint steps aside while an error is shown, since the error usually restates it. */
export function visibleHint(hint: string | undefined, errorMessage: string): string | undefined {
  if (errorMessage !== '') {
    return undefined
  }

  return hint
}
