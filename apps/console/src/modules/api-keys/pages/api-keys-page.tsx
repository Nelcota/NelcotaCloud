import type { JSX } from 'react'

import { ApiKeysScreen } from '@/modules/api-keys/components/api-keys-screen'
import { useProjectId } from '@/shared/routing/use-project-id'

export function ApiKeysPage(): JSX.Element {
  const projectId = useProjectId()

  return <ApiKeysScreen projectId={projectId} />
}
