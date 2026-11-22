import type { JSX } from 'react'

import { JWKS_URL, TOKEN_ISSUER } from '@/modules/api-keys/components/project-endpoints'
import { API_BASE_URL } from '@/shared/api/api-base-url'
import { IdChip } from '@/shared/ui/id-chip'

/** The values every integration needs, copied from one bar. */
export function KeyFacts({ projectId }: { projectId: string }): JSX.Element {
  return (
    <div className="flex flex-wrap gap-2">
      <IdChip label="URL da API" value={API_BASE_URL} isLabelVisible />
      <IdChip label="ID do projeto" value={projectId} isLabelVisible />
      <IdChip label="JWKS" value={JWKS_URL} isLabelVisible />
      <IdChip label="Issuer" value={TOKEN_ISSUER} isLabelVisible />
    </div>
  )
}
