import type { JSX } from 'react'

import { CacheCredentialForm } from '@/modules/cache/components/cache-credential-form'
import { useRevokeCacheCredential } from '@/modules/cache/queries/use-project-cache'
import type { components } from '@/shared/api/api-schema'
import { formatDateTime } from '@/shared/lib/format-date'
import { showFlash } from '@/shared/lib/flash-notice'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { SettingsSection } from '@/shared/ui/settings-section'

type CacheCredential = components['schemas']['CacheCredential']
type CacheCredentialsSectionProps = {
  projectId: string
  canCreate: boolean
  credentials: CacheCredential[]
  onIssued: (token: string) => void
}

export function CacheCredentialsSection({
  projectId,
  canCreate,
  credentials,
  onIssued,
}: CacheCredentialsSectionProps): JSX.Element | null {
  if (canCreate === false && credentials.length === 0) {
    return null
  }

  return (
    <SettingsSection title="Credenciais de cache">
      {canCreate && <CacheCredentialForm projectId={projectId} onIssued={onIssued} />}
      {credentials.length > 0 && (
        <ul className="divide-y border-t">
          {credentials.map((credential) => (
            <CacheCredentialRow key={credential.id} projectId={projectId} credential={credential} />
          ))}
        </ul>
      )}
    </SettingsSection>
  )
}

function CacheCredentialRow({
  projectId,
  credential,
}: {
  projectId: string
  credential: CacheCredential
}): JSX.Element {
  const revoke = useRevokeCacheCredential(projectId)

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0 [overflow-wrap:anywhere]">
        <p className="font-medium">{credential.name}</p>
        <time className="text-muted-foreground text-sm" dateTime={credential.created_at}>
          {formatDateTime(credential.created_at)}
        </time>
      </div>
      <ConfirmButton
        title={`Revogar “${credential.name}”?`}
        description="Os servidores que usam essa credencial perdem acesso ao cache."
        confirmLabel="Revogar credencial"
        triggerLabel={`Revogar ${credential.name}`}
        onConfirm={async () => {
          await revoke.mutateAsync(credential.id)
          showFlash('Credencial revogada.')
        }}
        isDestructive
      >
        Revogar
      </ConfirmButton>
    </li>
  )
}
