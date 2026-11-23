import type { JSX } from 'react'

import { ConnectionFacts } from '@/modules/database/components/connection-facts'
import { NewConnectionPassword } from '@/modules/database/components/new-connection-password'
import { maskedConnectionString } from '@/modules/database/model/connection-string'
import {
  useDirectConnectionQuery,
  useResetConnectionPasswordMutation,
} from '@/modules/database/queries/use-direct-connection'
import type { components } from '@/shared/api/api-schema'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { CopyableValue } from '@/shared/ui/copyable-value'
import { LoadError } from '@/shared/ui/load-error'
import { Skeleton } from '@/shared/ui/skeleton'

type DirectConnectionView = components['schemas']['DirectConnectionView']

/** The project's Postgres for ORMs and `psql`: where it is, and a password shown once. */
export function DirectConnectionPanel({ projectId }: { projectId: string }): JSX.Element {
  const connection = useDirectConnectionQuery(projectId)
  const reset = useResetConnectionPasswordMutation(projectId)
  const details = connection.data

  if (details === undefined) {
    return <ConnectionLoading error={connection.error} onRetry={() => connection.refetch()} />
  }

  if (details.enabled === false) {
    return (
      <p className="text-muted-foreground text-sm text-pretty">
        Este servidor não oferece conexão direta. Use a API REST do banco.
      </p>
    )
  }

  return (
    <div className="grid gap-5">
      <ConnectionFacts details={details} />
      <NewConnectionPassword issued={reset.data ?? null} />
      <CopyableValue label="URL de conexão (sem a senha)" value={maskedConnectionString(details)} />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-muted-foreground text-xs text-pretty">
          Pool em modo transação. No Prisma, acrescente &pgbouncer=true à URL.
        </p>
        <ConfirmButton
          title={passwordTitle(details)}
          description={passwordDescription(details)}
          confirmLabel="Gerar senha"
          isPending={reset.isPending}
          onConfirm={async () => {
            await reset.mutateAsync()
          }}
        >
          {passwordActionLabel(details)}
        </ConfirmButton>
      </div>
    </div>
  )
}

function ConnectionLoading(props: { error: Error | null; onRetry: () => void }): JSX.Element {
  if (props.error !== null) {
    return <LoadError error={props.error} onRetry={props.onRetry} />
  }

  return <Skeleton aria-label="Carregando a conexão" className="h-48 rounded-xl" />
}

function passwordActionLabel(details: DirectConnectionView): string {
  if (details.has_password) {
    return 'Trocar senha'
  }

  return 'Gerar senha'
}

function passwordTitle(details: DirectConnectionView): string {
  if (details.has_password) {
    return 'Trocar a senha da conexão direta?'
  }

  return 'Gerar a senha da conexão direta?'
}

function passwordDescription(details: DirectConnectionView): string {
  if (details.has_password) {
    return 'A senha atual para de funcionar em novas conexões. Apps que usam a conexão direta precisam da nova.'
  }

  return 'A senha aparece uma única vez, logo depois de gerada. Guarde-a no seu gerenciador de segredos.'
}
