import type { JSX } from 'react'

import { DatabaseFacts } from '@/modules/database/components/database-facts'
import { DatabaseHeaderActions } from '@/modules/database/components/database-header-actions'
import { TablesBrowser } from '@/modules/database/components/tables-browser'
import { useProjectId } from '@/shared/routing/use-project-id'
import { PageHeader } from '@/shared/ui/page-header'

export function DatabasePage(): JSX.Element {
  const projectId = useProjectId()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Banco de dados"
        description="O Postgres do projeto, servido como API REST sob row level security."
        actions={<DatabaseHeaderActions projectId={projectId} />}
      >
        <DatabaseFacts />
      </PageHeader>
      <TablesBrowser key={projectId} projectId={projectId} />
    </div>
  )
}
