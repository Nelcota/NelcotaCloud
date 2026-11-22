import type { JSX } from 'react'

import { ProjectAvatar } from '@/shared/ui/project-avatar'
import { draftSlug, type ProjectDraft } from '@/modules/projects/components/project-draft'
import { ProvisionedParts } from '@/modules/projects/components/provisioned-parts'
import { withHttps } from '@/shared/lib/web-address'
import { StatusBadge } from '@/shared/ui/status-badge'

const NAME_PLACEHOLDER = 'Meu app'
const SLUG_PLACEHOLDER = 'meu_app'
const EMPTY_VALUE = '—'

/** The project as its card on the projects canvas will show it, read live from the form. */
export function ProjectPreview({ draft }: { draft: ProjectDraft }): JSX.Element {
  const name = orFallback(draft.name.trim(), NAME_PLACEHOLDER)
  const slug = orFallback(draftSlug(draft), SLUG_PLACEHOLDER)
  const site = orFallback(withHttps(draft.siteUrl), EMPTY_VALUE)

  return (
    <section
      aria-labelledby="project-preview-title"
      className="grid min-w-0 overflow-hidden rounded-xl bg-card ring-1 ring-border/60"
    >
      <div className="flex min-w-0 flex-col gap-3 p-3">
        <h3 id="project-preview-title" className="text-2xs text-muted-foreground">
          O que será criado
        </h3>
        <div className="flex min-w-0 items-start gap-2.5">
          <ProjectAvatar name={name} size="sm" />
          <div className="grid min-w-0">
            <p className="truncate text-sm font-medium text-heading">{name}</p>
            <p className="truncate font-mono text-2xs text-muted-foreground">{slug}</p>
          </div>
        </div>
        <p className="truncate font-mono text-2xs text-muted-foreground" title={site}>
          {site}
        </p>
        <div className="flex min-w-0 items-center justify-between gap-2 text-2xs">
          <StatusBadge>Novo</StatusBadge>
          <span className="truncate text-muted-foreground">
            {verificationLabel(draft.requiresVerification)}
          </span>
        </div>
      </div>
      <ProvisionedParts slug={slug} />
    </section>
  )
}

function verificationLabel(isRequired: boolean): string {
  if (isRequired) {
    return 'Email confirmado exigido'
  }

  return 'Email confirmado não exigido'
}

function orFallback(value: string, fallback: string): string {
  if (value === '') {
    return fallback
  }

  return value
}
