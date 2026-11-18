import Calendar from '~icons/solar/calendar-linear'
import Hashtag from '~icons/solar/hashtag-linear'
import KeyRound from '~icons/solar/key-linear'
import ShieldCheck from '~icons/solar/shield-check-linear'
import type { JSX } from 'react'

import { countActive, isRevokedKey } from '@/modules/api-keys/components/key-activity'
import { KeyName } from '@/modules/api-keys/components/key-name'
import { KeyStatusBadge } from '@/modules/api-keys/components/key-status-badge'
import { RevokeKeyAction } from '@/modules/api-keys/components/revoke-key-action'
import { useRevokeApiKeyMutation } from '@/modules/api-keys/queries/use-api-keys'
import type { components } from '@/shared/api/api-schema'
import { cn } from '@/shared/lib/class-names'
import { ColumnLabel } from '@/shared/ui/column-label'
import { CopyButton } from '@/shared/ui/copy-button'
import { formatDateTime } from '@/shared/lib/format-date'
import { EmptyState } from '@/shared/ui/empty-state'
import { Skeleton } from '@/shared/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

type ApiKeySummary = components['schemas']['ApiKeySummary']

const SKELETON_ROWS = ['a', 'b']
const HEAD = 'h-11 px-4'
const CELL = 'px-4 py-3.5'
/** First and last columns line up with the 20px inset of the sections below. */
const EDGE = 'px-4 sm:px-5'

type ApiKeysTableProps = {
  projectId: string
  /** `undefined` while loading. */
  keys: ApiKeySummary[] | undefined
  hasFailed: boolean
}

export function ApiKeysTable({
  projectId,
  keys,
  hasFailed,
}: ApiKeysTableProps): JSX.Element | null {
  const revocation = useRevokeApiKeyMutation(projectId)

  if (keys === undefined && hasFailed) {
    return null
  }

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
      <div className="bg-card overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={cn(HEAD, EDGE)}>
                <ColumnLabel icon={KeyRound}>Chave</ColumnLabel>
              </TableHead>
              <TableHead className={cn(HEAD, 'hidden sm:table-cell')}>
                <ColumnLabel icon={Hashtag}>Final</ColumnLabel>
              </TableHead>
              <TableHead className={cn(HEAD, 'hidden sm:table-cell')}>
                <ColumnLabel icon={Calendar}>Criada em</ColumnLabel>
              </TableHead>
              <TableHead className={cn(HEAD, 'hidden sm:table-cell')}>
                <ColumnLabel icon={ShieldCheck}>Situação</ColumnLabel>
              </TableHead>
              <TableHead className={cn(HEAD, EDGE)}>
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.map((key) => (
              <TableRow key={key.id} className={cn(isRevokedKey(key) && 'text-muted-foreground')}>
                <TableCell className={cn(CELL, EDGE, 'whitespace-normal')}>
                  <KeyName apiKey={key} />
                  <div className="mt-1.5 sm:hidden">
                    <KeyStatusBadge isRevoked={isRevokedKey(key)} />
                  </div>
                </TableCell>
                <TableCell
                  className={cn(CELL, 'text-muted-foreground hidden font-mono sm:table-cell')}
                >
                  …{key.hint}
                </TableCell>
                <TableCell className={cn(CELL, 'text-muted-foreground hidden sm:table-cell')}>
                  {formatDateTime(key.created_at)}
                </TableCell>
                <TableCell className={cn(CELL, 'hidden sm:table-cell')}>
                  <KeyStatusBadge isRevoked={isRevokedKey(key)} />
                </TableCell>
                <TableCell className={cn(CELL, EDGE, 'text-right')}>
                  <div className="flex items-center justify-end gap-2">
                    <KeyCopy apiKey={key} />
                    <RowAction
                      apiKey={key}
                      activeOfKind={countActive(keys, key.kind)}
                      isPending={revocation.isPending && revocation.variables === key.id}
                      onRevoke={async () => {
                        await revocation.mutateAsync(key.id)
                      }}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

type RowActionProps = {
  apiKey: ApiKeySummary
  activeOfKind: number
  isPending: boolean
  onRevoke: () => Promise<void>
}

function RowAction(props: RowActionProps): JSX.Element | null {
  if (isRevokedKey(props.apiKey)) {
    return null
  }

  return <RevokeKeyAction {...props} />
}

/** Publishable keys are public, so active ones can be copied again; secret keys never can. */
function KeyCopy({ apiKey }: { apiKey: ApiKeySummary }): JSX.Element | null {
  const key = apiKey.key

  if (key === null || key === undefined || isRevokedKey(apiKey)) {
    return null
  }

  return <CopyButton value={key} description={`a publishable key …${apiKey.hint}`} />
}

function KeysSkeleton(): JSX.Element {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando chaves"
      className="grid gap-px overflow-hidden rounded-xl border"
    >
      {SKELETON_ROWS.map((row) => (
        <div key={row} className="bg-card flex items-center gap-4 px-5 py-5">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  )
}
