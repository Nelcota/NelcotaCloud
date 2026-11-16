import { KeyRound } from 'lucide-react'
import type { JSX } from 'react'

import { useRevokeApiKeyMutation } from '@/modules/api-keys/queries/use-api-keys'
import type { components } from '@/shared/api/api-schema'
import { cn } from '@/shared/lib/class-names'
import { formatDateTime } from '@/shared/lib/format-date'
import { Badge } from '@/shared/ui/badge'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { EmptyState } from '@/shared/ui/empty-state'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { Skeleton } from '@/shared/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

type ApiKeySummary = components['schemas']['ApiKeySummary']

const SKELETON_ROWS = ['a', 'b']

type ApiKeysTableProps = {
  projectId: string
  /** `undefined` while loading. */
  keys: ApiKeySummary[] | undefined
}

export function ApiKeysTable({ projectId, keys }: ApiKeysTableProps): JSX.Element {
  const revocation = useRevokeApiKeyMutation(projectId)

  if (keys === undefined) {
    return <KeysSkeleton />
  }

  if (keys.length === 0) {
    return (
      <EmptyState
        icon={KeyRound}
        title="Nenhuma chave"
        description="Crie uma publishable key para o app e uma secret key para o seu servidor."
      />
    )
  }

  return (
    <div className="grid gap-3">
      <ErrorAlert error={revocation.error} />
      <div className="bg-card overflow-hidden rounded-xl border">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="px-3 sm:px-4">Tipo</TableHead>
              <TableHead>Final</TableHead>
              <TableHead className="hidden sm:table-cell">Criada em</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="px-3 sm:px-4">
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.map((key) => (
              <TableRow key={key.id} className={cn(isRevokedKey(key) && 'text-muted-foreground')}>
                <TableCell className="px-3 sm:px-4">
                  <Badge variant="secondary">{key.kind}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">…{key.hint}</TableCell>
                <TableCell className="text-muted-foreground hidden sm:table-cell">
                  {formatDateTime(key.created_at)}
                </TableCell>
                <TableCell>
                  <StatusBadge isRevoked={isRevokedKey(key)} />
                </TableCell>
                <TableCell className="px-3 text-right sm:px-4">
                  <RevokeAction
                    isRevoked={isRevokedKey(key)}
                    isPending={revocation.isPending}
                    onRevoke={() => revocation.mutate(key.id)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function isRevokedKey(key: ApiKeySummary): boolean {
  return key.revoked_at !== null && key.revoked_at !== undefined
}

function StatusBadge({ isRevoked }: { isRevoked: boolean }): JSX.Element {
  if (isRevoked) {
    return <Badge variant="outline">Revogada</Badge>
  }

  return <Badge variant="success">Ativa</Badge>
}

type RevokeActionProps = {
  isRevoked: boolean
  isPending: boolean
  onRevoke: () => void
}

function RevokeAction({ isRevoked, isPending, onRevoke }: RevokeActionProps): JSX.Element | null {
  if (isRevoked) {
    return null
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

function KeysSkeleton(): JSX.Element {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando chaves"
      className="grid gap-px overflow-hidden rounded-xl border"
    >
      {SKELETON_ROWS.map((row) => (
        <div key={row} className="bg-card flex items-center gap-4 px-4 py-3.5">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  )
}
