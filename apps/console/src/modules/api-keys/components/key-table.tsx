import type { JSX, ReactNode } from 'react'

import { KEY_COLUMNS, KEY_HEADER, KEY_WIDTHS } from '@/modules/api-keys/components/key-columns'
import { cn } from '@/shared/lib/class-names'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { CELL_X, HEAD_CELL, TABLE_HEADER_TINT } from '@/shared/ui/table-styles'

const HEAD_CLASS = cn(CELL_X, HEAD_CELL)

type KeyTableProps = {
  /** "Keys of the app", for screen readers: which list this table is. */
  label: string
  /** Revoked keys show when they stopped instead of when they were made and last used. */
  isRevoked?: boolean
  children: ReactNode
}

/**
 * Keys as a table that answers "which keys exist, and are they in use?": name, the key, when it
 * was last used (the safety signal, so before the creation date), when it was made, actions. Plain headings, no icons: in a section's right column every pixel of width goes to
 * the columns, and the headings sit exactly over their content. A size container, so its columns follow the width it gets, not the window's.
 */
export function KeyTable({ label, isRevoked, children }: KeyTableProps): JSX.Element {
  return (
    <div className="@container">
      <Table aria-label={label} className="table-fixed text-base">
        <TableHeader className={cn(TABLE_HEADER_TINT, KEY_HEADER)}>
          <TableRow>
            <TableHead className={HEAD_CLASS}>Nome</TableHead>
            <TableHead className={cn(HEAD_CLASS, KEY_COLUMNS.value, KEY_WIDTHS.value)}>
              Chave
            </TableHead>
            <DateHeads isRevoked={isRevoked === true} />
            <TableHead className={cn(HEAD_CLASS, KEY_WIDTHS.actions)}>
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </div>
  )
}

function DateHeads({ isRevoked }: { isRevoked: boolean }): JSX.Element {
  if (isRevoked) {
    return (
      <TableHead className={cn(HEAD_CLASS, KEY_COLUMNS.dates, '@3xl:w-68')} colSpan={2}>
        Revogada
      </TableHead>
    )
  }

  return (
    <>
      <TableHead className={cn(HEAD_CLASS, KEY_COLUMNS.dates, KEY_WIDTHS.lastUse)}>
        Último uso
      </TableHead>
      <TableHead className={cn(HEAD_CLASS, KEY_COLUMNS.dates, KEY_WIDTHS.created)}>
        Criada
      </TableHead>
    </>
  )
}
