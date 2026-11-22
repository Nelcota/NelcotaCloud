import { draftSlug, type ProjectDraft } from '@/modules/projects/components/project-draft'
import { isValidSlug } from '@/modules/projects/components/project-slug'
import { isWebAddress } from '@/shared/lib/web-address'

/** Why the API would refuse the draft, field by field; `undefined` where a field is fine. */
export type DraftErrors = {
  name: string | undefined
  slug: string | undefined
  site: string | undefined
}

export function draftErrors(draft: ProjectDraft): DraftErrors {
  return {
    name: nameError(draft.name),
    slug: slugError(draftSlug(draft)),
    site: siteError(draft.siteUrl),
  }
}

export function hasDraftErrors(errors: DraftErrors): boolean {
  return [errors.name, errors.slug, errors.site].some((error) => error !== undefined)
}

function nameError(name: string): string | undefined {
  if (name.trim() === '') {
    return 'Digite o nome do projeto.'
  }

  return undefined
}

function slugError(slug: string): string | undefined {
  if (isValidSlug(slug)) {
    return undefined
  }

  return 'Edite o identificador para seguir o formato indicado.'
}

function siteError(siteUrl: string): string | undefined {
  if (isWebAddress(siteUrl)) {
    return undefined
  }

  return 'Digite um endereço válido para o site do app.'
}
