import type { JSX } from 'react'

import { ProjectAvatar } from '@/app/shell/project-avatar'
import { draftSlug, type ProjectDraft } from '@/modules/projects/components/project-draft'
import { ProvisionedParts } from '@/modules/projects/components/provisioned-parts'
import { withHttps } from '@/shared/lib/web-address'

const NAME_PLACEHOLDER = 'Meu app'
const SLUG_PLACEHOLDER = 'meu_app'
const EMPTY_VALUE = '—'

/** What the project will be and what the API creates for it, read live from the form. */
export function ProjectPreview({ draft }: { draft: ProjectDraft }): JSX.Element {
  const name = orFallback(draft.name.trim(), NAME_PLACEHOLDER)
  const slug = orFallback(draftSlug(draft), SLUG_PLACEHOLDER)
  const site = orFallback(withHttps(draft.siteUrl), EMPTY_VALUE)

  return (
    <section
      aria-labelledby="project-preview-title"
      className="grid min-w-0 overflow-hidden rounded-xl border bg-card"
    >
      <h3
        id="project-preview-title"
        className="border-b bg-surface px-4 py-2.5 text-xs font-medium text-muted-foreground"
      >
        O que será criado
      </h3>
      <div className="flex min-w-0 items-center gap-3 border-b px-4 py-4">
        <ProjectAvatar name={name} size="md" />
        <div className="grid min-w-0 gap-0.5">
          <p className="truncate text-base font-semibold text-heading">{name}</p>
          <p className="truncate text-xs text-muted-foreground" title={site}>
            {site}
          </p>
        </div>
      </div>
      <ProvisionedParts slug={slug} />
    </section>
  )
}

function orFallback(value: string, fallback: string): string {
  if (value === '') {
    return fallback
  }

  return value
}
