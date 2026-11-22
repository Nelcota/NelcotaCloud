import type { JSX } from 'react'

import { API_BASE_URL } from '@/shared/api/api-base-url'
import { CopyableValue } from '@/shared/ui/copyable-value'

type ProjectCredentialsProps = { projectId: string; publishableKey: string }

/** The public values an app needs: none of them is secret. */
export function ProjectCredentials({
  projectId,
  publishableKey,
}: ProjectCredentialsProps): JSX.Element {
  return (
    <div className="grid gap-4">
      <CopyableValue label="Chave pública (app)" value={publishableKey} />
      <div className="grid gap-4 sm:grid-cols-2">
        <CopyableValue label="URL da API" value={API_BASE_URL} />
        <CopyableValue label="ID do projeto" value={projectId} />
      </div>
    </div>
  )
}
