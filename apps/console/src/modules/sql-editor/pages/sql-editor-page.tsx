import type { JSX } from 'react'

import { SqlApiSheet } from '@/modules/sql-editor/components/sql-api-sheet'
import { SqlEditor } from '@/modules/sql-editor/components/sql-editor'
import { useProjectId } from '@/shared/routing/use-project-id'
import { PageHeader } from '@/shared/ui/page-header'

export function SqlEditorPage(): JSX.Element {
  const projectId = useProjectId()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Editor SQL"
        description="Roda como nelcota_developer, sem RLS, por até 15 s: pode alterar dados."
        actions={<SqlApiSheet />}
      />
      <SqlEditor key={projectId} projectId={projectId} />
    </div>
  )
}
