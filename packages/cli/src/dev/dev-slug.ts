import { CliError } from '../cli/cli-error'

/** The API's slug rule (`TenantSlug`): 3-40 of `[a-z0-9_]`, starting with a letter. */
const SLUG_PATTERN = /^[a-z][a-z0-9_]{2,39}$/
const MAX_SLUG_LENGTH = 40
const MIN_SLUG_LENGTH = 3
const FALLBACK_SLUG = 'app'

export function checkSlug(slug: string): string {
  const trimmed = slug.trim()

  if (SLUG_PATTERN.test(trimmed) === false) {
    throw new CliError(
      'Slug inválido: use de 3 a 40 caracteres entre a-z, 0-9 e _, começando por uma letra.',
    )
  }

  return trimmed
}

/** A valid slug from any folder name: `Meu App-2` becomes `meu_app_2`. */
export function slugFromFolderName(folderName: string): string {
  const words = folderName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  const startingWithLetter = withLeadingLetter(words)
  const shortened = startingWithLetter.slice(0, MAX_SLUG_LENGTH).replace(/_+$/, '')

  return longEnough(shortened)
}

function withLeadingLetter(words: string): string {
  if (words === '') {
    return FALLBACK_SLUG
  }

  if (/^[a-z]/.test(words)) {
    return words
  }

  return `${FALLBACK_SLUG}_${words}`
}

function longEnough(slug: string): string {
  if (slug.length >= MIN_SLUG_LENGTH) {
    return slug
  }

  return `${slug}_${FALLBACK_SLUG}`
}
