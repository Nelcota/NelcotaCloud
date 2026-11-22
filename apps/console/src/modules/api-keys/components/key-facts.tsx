import type { JSX } from 'react'

import { API_BASE_URL } from '@/shared/api/api-base-url'
import { IdChip } from '@/shared/ui/id-chip'

/** The two values every integration starts from; the token ones live with the signing key. */
export function KeyFacts({ projectId }: { projectId: string }): JSX.Element {
  return (
    <div className="flex flex-wrap gap-2">
      <IdChip label="URL da API" value={API_BASE_URL} isLabelVisible />
      <IdChip label="ID do projeto" value={projectId} isLabelVisible />
    </div>
  )
}
