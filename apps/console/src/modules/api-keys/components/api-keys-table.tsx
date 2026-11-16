import type { JSX } from 'react'

import { useRevokeApiKeyMutation } from '@/modules/api-keys/queries/use-api-keys'
import type { components } from '@/shared/api/api-schema'
import { Badge } from '@/shared/ui/badge'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

type ApiKeySummary = components['schemas']['ApiKeySummary']

const DATE_FORMAT = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

export function ApiKeysTable({
  projectId,
  keys,
}: {
  projectId: string
  keys: ApiKeySummary[]
}): JSX.Element {
  const revocation = useRevokeApiKeyMutation(projectId)

  return (
    <div className="grid gap-3">
      <ErrorAlert error={revocation.error} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead>Final</TableHead>
            <TableHead>Criada em</TableHead>
            <TableHead className="text-right">Situação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {keys.map((key) => (
            <TableRow key={key.id}>
              <TableCell>
                <Badge variant="secondary">{key.kind}</Badge>
              </TableCell>
              <TableCell className="font-mono text-xs">…{key.hint}</TableCell>
              <TableCell>{DATE_FORMAT.format(new Date(key.created_at))}</TableCell>
              <TableCell className="text-right">
                <KeyStatus
                  apiKey={key}
                  isPending={revocation.isPending}
                  onRevoke={() => revocation.mutate(key.id)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

type KeyStatusProps = {
  apiKey: ApiKeySummary
  isPending: boolean
  onRevoke: () => void
}

function KeyStatus({ apiKey, isPending, onRevoke }: KeyStatusProps): JSX.Element {
  if (apiKey.revoked_at !== null && apiKey.revoked_at !== undefined) {
    return <span className="text-muted-foreground text-xs">Revogada</span>
  }

  return (
    <ConfirmButton
      title="Revogar esta chave?"
      description="Ela para de funcionar na hora. Apps que ainda a usam deixam de acessar a API."
      confirmLabel="Revogar"
      isDestructive
      isPending={isPending}
      onConfirm={onRevoke}
    >
      Revogar
    </ConfirmButton>
  )
}
