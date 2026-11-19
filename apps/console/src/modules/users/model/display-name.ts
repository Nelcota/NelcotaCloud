/**
 * The `user_metadata` keys read as the person's name, in this order: `name` is the console's
 * convention (see the SDK README); `full_name` is what many apps already write. The API's CSV
 * export reads the same keys.
 */
const NAME_KEYS = ['name', 'full_name'] as const
/** Longer values are not names a list should show. */
const MAX_NAME_LENGTH = 120

/** The name the user's own metadata gives, if any: a non-blank string under a known key. */
export function displayNameOf(metadata: Record<string, unknown>): string | null {
  for (const key of NAME_KEYS) {
    const name = nameFrom(metadata[key])

    if (name !== null) {
      return name
    }
  }

  return null
}

function nameFrom(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const name = value.trim()

  // Counted in characters, as the API counts them, not UTF-16 units.
  if (name === '' || [...name].length > MAX_NAME_LENGTH) {
    return null
  }

  return name
}
