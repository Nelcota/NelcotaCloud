/** What the API accepts for tables, columns and policies: never needs quoting in SQL. */
const OBJECT_NAME = /^[a-z_][a-z0-9_]{0,62}$/

export const OBJECT_NAME_HINT = 'Letras minúsculas, números e _, começando por letra ou _.'

export function isObjectName(name: string): boolean {
  return OBJECT_NAME.test(name.trim())
}
