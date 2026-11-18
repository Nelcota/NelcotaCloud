import { slugFromName } from '@/modules/projects/components/project-slug'

/** What the new-project steps collect before the project is created. */
export type ProjectDraft = {
  name: string
  /** Typed by the user; null while the slug follows the name. */
  customSlug: string | null
  /** As typed, without the `https://` the field shows. */
  siteUrl: string
  requiresVerification: boolean
}

export const EMPTY_DRAFT: ProjectDraft = {
  name: '',
  customSlug: null,
  siteUrl: '',
  requiresVerification: true,
}

export type DraftChange = (change: Partial<ProjectDraft>) => void

/** The slug to create the project with: the typed one, or the one made from the name. */
export function draftSlug(draft: ProjectDraft): string {
  return draft.customSlug ?? slugFromName(draft.name)
}
