const KEY_PLACEHOLDER = 'SUA_PUBLISHABLE_KEY'

/** The publishable key a snippet shows: the project's own, or a placeholder to replace. */
export function snippetKeyOf(publishableKey: string | null): string {
  return publishableKey ?? KEY_PLACEHOLDER
}
