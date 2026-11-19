import type { JSX } from 'react'

import { SqlEditor } from '@/modules/database/sql-editor/components/sql-editor'
import { useProjectId } from '@/shared/routing/use-project-id'
import { PageHeader } from '@/shared/ui/page-header'

export function SqlEditorPage(): JSX.Element {
  const projectId = useProjectId()

  return (
    <div className="grid gap-6">
      <PageHeader
        title="SQL"
        description="Roda no banco do projeto, numa transação, por até 15 segundos. Mostra até 1.000 linhas do último resultado."
      />
      <SqlEditor key={projectId} projectId={projectId} />
    </div>
  )
}
