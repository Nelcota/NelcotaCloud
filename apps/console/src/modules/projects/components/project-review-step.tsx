import type { JSX } from 'react'

import { draftSlug, type ProjectDraft } from '@/modules/projects/components/project-draft'
import { withHttps } from '@/shared/lib/web-address'
import { ReviewList } from '@/shared/ui/review-list'

/** Everything the project will be created with, before it is. */
export function ProjectReviewStep({ draft }: { draft: ProjectDraft }): JSX.Element {
  return (
    <ReviewList
      items={[
        { label: 'Nome', value: draft.name.trim() },
        { label: 'Identificador', value: <code className="font-mono">{draftSlug(draft)}</code> },
        { label: 'Site do app', value: withHttps(draft.siteUrl) },
        { label: 'Email confirmado', value: verificationLabel(draft.requiresVerification) },
      ]}
    />
  )
}

function verificationLabel(requiresVerification: boolean): string {
  if (requiresVerification) {
    return 'Exigido para entrar com senha'
  }

  return 'Não exigido'
}
