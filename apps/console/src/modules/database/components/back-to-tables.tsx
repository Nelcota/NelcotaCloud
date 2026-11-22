import type { JSX } from 'react'

import { BackLink } from '@/shared/ui/back-link'

export function BackToTables({ projectId }: { projectId: string }): JSX.Element {
  return <BackLink label="Tabelas" href={`/projects/${projectId}/database`} />
}
