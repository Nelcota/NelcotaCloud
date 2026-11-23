import { KeyRound } from 'lucide-react'
import type { JSX } from 'react'

import {
  useDirectConnectionQuery,
  useResetConnectionPasswordMutation,
} from '@/modules/database/queries/use-direct-connection'
import type { components } from '@/shared/api/api-schema'
import { CodeBlock } from '@/shared/ui/code-block'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { DataList, DataListItem } from '@/shared/ui/data-list'
import { LoadError } from '@/shared/ui/load-error'
import { Notice } from '@/shared/ui/notice'
import { Skeleton } from '@/shared/ui/primitives/skeleton'

type DirectConnectionView = components['schemas']['DirectConnectionView']

const PASSWORD_PLACEHOLDER = '[SENHA]'

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
      <Notice tone="info" title="Este servidor não oferece conexão direta.">
        Use a API REST do banco, ou peça a quem administra a plataforma para ativar o PgBouncer.
      </Notice>
    )
  }

  return (
    <div className="grid gap-4">
      <ConnectionFacts details={details} />
      <NewPassword connectionString={reset.data?.connection_string ?? null} />
      <CodeBlock
        code={`DATABASE_URL=${maskedConnectionString(details)}`}
        title=".env"
        copyLabel="URL de conexão sem a senha"
        isWrapped
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Pool em modo transação. No Prisma, acrescente &pgbouncer=true à URL.
        </p>
        <ConfirmButton
          label={passwordActionLabel(details)}
          icon={KeyRound}
          title="Gerar uma nova senha?"
          description="A senha atual para de funcionar em novas conexões. Apps que usam a conexão direta precisam da nova."
          confirmLabel="Gerar senha"
          onConfirm={async () => {
            await reset.mutateAsync()
          }}
        />
      </div>
    </div>
  )
}

function ConnectionFacts({ details }: { details: DirectConnectionView }): JSX.Element {
  return (
    <DataList>
      <DataListItem label="Host">
        <code className="font-mono">{details.host}</code>
      </DataListItem>
      <DataListItem label="Porta">
        <code className="font-mono">{details.port}</code>
      </DataListItem>
      <DataListItem label="Banco">
        <code className="font-mono">{details.database}</code>
      </DataListItem>
      <DataListItem label="Usuário">
        <code className="font-mono">{details.user}</code>
      </DataListItem>
      <DataListItem label="SSL">
        <code className="font-mono">{details.ssl_mode}</code>
      </DataListItem>
    </DataList>
  )
}

/** The URL with the password, right after it was generated: the only time it exists here. */
function NewPassword({
  connectionString,
}: {
  connectionString: string | null
}): JSX.Element | null {
  if (connectionString === null) {
    return null
  }

  return (
    <div className="grid gap-2">
      <Notice tone="warning" title="Guarde esta URL agora: a senha não aparece de novo." />
      <CodeBlock
        code={`DATABASE_URL=${connectionString}`}
        title=".env"
        copyLabel="URL de conexão com a senha"
        isWrapped
      />
    </div>
  )
}

function ConnectionLoading(props: { error: Error | null; onRetry: () => void }): JSX.Element {
  if (props.error !== null) {
    return <LoadError error={props.error} onRetry={props.onRetry} />
  }

  return (
    <div role="status" aria-label="Carregando a conexão">
      <Skeleton className="h-48 rounded-xl" />
    </div>
  )
}

function maskedConnectionString(details: DirectConnectionView): string {
  const { user, host, port, database, ssl_mode: sslMode } = details

  return `postgresql://${user}:${PASSWORD_PLACEHOLDER}@${host}:${port}/${database}?sslmode=${sslMode}`
}

function passwordActionLabel(details: DirectConnectionView): string {
  if (details.has_password) {
    return 'Trocar senha'
  }

  return 'Gerar senha'
}
