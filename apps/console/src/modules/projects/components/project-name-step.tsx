import type { JSX } from 'react'

import {
  type DraftChange,
  draftSlug,
  type ProjectDraft,
} from '@/modules/projects/components/project-draft'
import { SlugField } from '@/modules/projects/components/slug-field'
import { FormField } from '@/shared/ui/form-field'

const MAX_NAME_LENGTH = 100

type ProjectNameStepProps = { draft: ProjectDraft; onChange: DraftChange }

/** The project's name, and the slug made from it. */
export function ProjectNameStep({ draft, onChange }: ProjectNameStepProps): JSX.Element {
  return (
    <>
      <FormField
        label="Nome do projeto"
        required
        autoFocus
        maxLength={MAX_NAME_LENGTH}
        placeholder="Acme Store"
        value={draft.name}
        onChange={(event) => onChange({ name: event.target.value })}
      />
      <DraftSlug draft={draft} onChange={onChange} />
    </>
  )
}

/** Shown once there is a name to make it from, or when the user typed one. */
function DraftSlug({ draft, onChange }: ProjectNameStepProps): JSX.Element | null {
  if (draft.name.trim() === '' && draft.customSlug === null) {
    return null
  }

  return (
    <SlugField
      slug={draftSlug(draft)}
      customSlug={draft.customSlug}
      onCustomSlugChange={(slug) => onChange({ customSlug: slug })}
    />
  )
}
