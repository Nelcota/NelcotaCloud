import type { JSX, ReactNode } from 'react'

import { KEY_COLUMNS, KEY_STAND_INS, NAME_CELL_X } from '@/modules/api-keys/components/key-columns'
import { KeyLastUse } from '@/modules/api-keys/components/key-last-use'
import { KeyValue } from '@/modules/api-keys/components/key-value'
import type { components } from '@/shared/api/api-schema'
import { cn } from '@/shared/lib/class-names'
import { formatDateTime, formatRelative } from '@/shared/lib/format-date'
import { CopyButton } from '@/shared/ui/copy-button'
import { TableCell } from '@/shared/ui/table'
import { CELL_X, CELL_Y } from '@/shared/ui/table-styles'

type ApiKeySummary = components['schemas']['ApiKeySummary']

type NameCellProps = {
  apiKey: ApiKeySummary
  /** A rotation tag beside the name ("Nova", "Revogue após publicar a nova"). */
  tag?: ReactNode
  /** The facts that stand in for the date columns while they do not fit. */
  dates: ReactNode
  /** Off for revoked keys: a dead key is never copied back into an app. */
  canCopy?: boolean
}

/** The name the team gave the key; the hidden columns' content goes under it on narrow tables. */
export function NameCell({ apiKey, tag, dates, canCopy }: NameCellProps): JSX.Element {
  return (
    <TableCell className={cn(NAME_CELL_X, CELL_Y, 'whitespace-normal')}>
      <div className="grid min-w-0 gap-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <KeyName apiKey={apiKey} />
          {tag}
        </div>
        <div className={cn('text-muted-foreground text-sm', KEY_STAND_INS.value)}>
          <KeyValueWithCopy apiKey={apiKey} canCopy={canCopy !== false} />
        </div>
        <div className={cn('text-muted-foreground text-sm', KEY_STAND_INS.dates)}>{dates}</div>
      </div>
    </TableCell>
  )
}

/**
 * Keys need no name; an unnamed one is called by its ending, as the dialogs and menus call it,
 * so every row leads with something that tells the keys apart.
 */
function KeyName({ apiKey }: { apiKey: ApiKeySummary }): JSX.Element {
  if (apiKey.name === '') {
    return (
      <span className="font-semibold">
        Chave <code className="font-mono text-sm leading-none">…{apiKey.hint}</code>
      </span>
    )
  }

  return <span className="truncate font-semibold">{apiKey.name}</span>
}

type ValueCellProps = { apiKey: ApiKeySummary; canCopy?: boolean }

export function ValueCell({ apiKey, canCopy }: ValueCellProps): JSX.Element {
  return (
    <TableCell className={cn(KEY_COLUMNS.value, CELL_X, CELL_Y, 'whitespace-nowrap')}>
      <KeyValueWithCopy apiKey={apiKey} canCopy={canCopy !== false} />
    </TableCell>
  )
}

/** The key as the list shows it; a live publishable key copies again, a secret key never can. */
function KeyValueWithCopy(props: { apiKey: ApiKeySummary; canCopy: boolean }): JSX.Element {
  const apiKey = props.apiKey
  const key = copyableKey(apiKey, props.canCopy)

  return (
    <span className="flex h-6 w-fit max-w-full items-center gap-1">
      <KeyValue apiKey={apiKey} className="text-sm leading-6" />
      <KeyCopy value={key} hint={apiKey.hint} />
    </span>
  )
}

function KeyCopy({ value, hint }: { value: string | null; hint: string }): JSX.Element | null {
  if (value === null) {
    return null
  }

  return (
    <span className="-my-1">
      <CopyButton value={value} description={`a chave do app …${hint}`} isCompact />
    </span>
  )
}

function copyableKey(apiKey: ApiKeySummary, canCopy: boolean): string | null {
  if (canCopy === false) {
    return null
  }

  return apiKey.key ?? null
}

type DateCellProps = { children: ReactNode; colSpan?: number }

/** A date column; sits under its heading's text, like every column led by an icon. */
export function DateCell({ children, colSpan }: DateCellProps): JSX.Element {
  return (
    <TableCell
      colSpan={colSpan}
      className={cn(KEY_COLUMNS.dates, CELL_X, CELL_Y, 'text-muted-foreground whitespace-nowrap')}
    >
      {children}
    </TableCell>
  )
}

/** "Há 11 horas", with the full date on hover; `verb` leads it where no heading names it. */
export function RelativeDate({ at, verb }: { at: string; verb?: string }): JSX.Element {
  const relative = formatRelative(at)

  return (
    <time dateTime={at} title={formatDateTime(at)}>
      {sentenceOf(relative, verb)}
    </time>
  )
}

function sentenceOf(relative: string, verb: string | undefined): string {
  if (verb === undefined) {
    return relative.charAt(0).toUpperCase() + relative.slice(1)
  }

  return `${verb} ${relative}`
}

/** "sem uso registrado · criada há 11 horas", under the name while the date columns are hidden. */
export function StandInDates({ apiKey }: { apiKey: ApiKeySummary }): JSX.Element {
  return (
    <span className="flex flex-wrap gap-x-3 sm:gap-x-2">
      <KeyLastUse lastUsedAt={apiKey.last_used_at} />
      <span aria-hidden="true" className="hidden sm:inline">
        ·
      </span>
      <RelativeDate at={apiKey.created_at} verb="criada" />
    </span>
  )
}
