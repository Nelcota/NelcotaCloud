import type { JSX } from 'react'

import { SqlEditor } from '@/modules/sql-editor/components/sql-editor'
import { useProjectId } from '@/shared/routing/use-project-id'

export function SqlEditorPage(): JSX.Element {
  const projectId = useProjectId()

  return <SqlEditor key={projectId} projectId={projectId} />
}
