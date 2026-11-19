/** `aria-describedby` from the ids of the notes that are on screen; undefined when there are none. */
export function describedBy(ids: readonly (string | false)[]): string | undefined {
  const present = ids.filter((id) => id !== false)

  if (present.length === 0) {
    return undefined
  }

  return present.join(' ')
}
