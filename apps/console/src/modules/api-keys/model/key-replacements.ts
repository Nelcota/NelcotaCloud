import type { components } from '@/shared/api/api-schema'

type ApiKeySummary = components['schemas']['ApiKeySummary']

/** The API caps a key's name at this many characters. */
const MAX_NAME_LENGTH = 64
/**
 * A replacement's name ends with the old key's ending ("… (substitui …cc11)"), so the pairing
 * survives a reload without the API keeping it: the page reads it back from the names.
 */
const REPLACES_PATTERN = /(?:^Substitui|\(substitui) …(\S+?)\)?$/

/** "Substitui …cc11" for an unnamed key; "API (substitui …cc11)" for a named one. */
export function replacementName(old: { name: string; hint: string }): string {
  if (old.name === '') {
    return `Substitui …${old.hint}`
  }

  const suffix = ` (substitui …${old.hint})`

  return `${old.name.slice(0, MAX_NAME_LENGTH - suffix.length)}${suffix}`
}

/**
 * Old key id → its replacement's id, for every active pair whose replacement still names the
 * old key's ending. Only keys of the same kind pair up, and a key never replaces itself.
 */
export function inferReplacements(active: readonly ApiKeySummary[]): Map<string, string> {
  const pairs = new Map<string, string>()

  for (const replacement of active) {
    const hint = REPLACES_PATTERN.exec(replacement.name)?.[1]
    const old = active.find(
      (key) => key.id !== replacement.id && key.kind === replacement.kind && key.hint === hint,
    )

    if (old !== undefined) {
      pairs.set(old.id, replacement.id)
    }
  }

  return pairs
}
