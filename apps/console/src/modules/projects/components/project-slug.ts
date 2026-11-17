export const MAX_SLUG_LENGTH = 40
/** The API's slug rule, also given to the field as its `pattern`. */
export const SLUG_PATTERN = '[a-z][a-z0-9_]{2,39}'
const SLUG_RULE = new RegExp(`^${SLUG_PATTERN}$`)
const DIACRITICS = /[̀-ͯ]/g
const NOT_SLUG_CHARACTERS = /[^a-z0-9]+/g
const LEADING_NON_LETTERS = /^[^a-z]+/
const EDGE_UNDERSCORES = /^_+|_+$/g

/** The API's slug rule: 3 to 40 lowercase letters, digits or `_`, starting with a letter. */
export function isValidSlug(slug: string): boolean {
  return SLUG_RULE.test(slug)
}

/** "Loja da Ana 2" → "loja_da_ana_2": the slug rules, applied to whatever the name is. */
export function slugFromName(name: string): string {
  return name
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(NOT_SLUG_CHARACTERS, '_')
    .replace(LEADING_NON_LETTERS, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(EDGE_UNDERSCORES, '')
}
