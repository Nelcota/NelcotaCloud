import type { JSX } from 'react'

import type { DraftChange, ProjectDraft } from '@/modules/projects/components/project-draft'
import { SwitchField } from '@/shared/ui/switch-field'
import { UrlField } from '@/shared/ui/url-field'

type ProjectSiteStepProps = { draft: ProjectDraft; onChange: DraftChange }

/** Where emails and social logins send users back, and whether password login needs a verified email. */
export function ProjectSiteStep({ draft, onChange }: ProjectSiteStepProps): JSX.Element {
  return (
    <>
      <UrlField
        label="Site do app"
        required
        autoFocus
        placeholder="app.exemplo.com"
        hint="Os links dos emails abrem aqui, e o login social volta para cá."
        value={draft.siteUrl}
        onChange={(siteUrl) => onChange({ siteUrl })}
      />
      <SwitchField
        label="Exigir email confirmado"
        description="Login com senha só para quem confirmou o email. Dá para mudar depois."
        checked={draft.requiresVerification}
        onCheckedChange={(requiresVerification) => onChange({ requiresVerification })}
      />
    </>
  )
}
