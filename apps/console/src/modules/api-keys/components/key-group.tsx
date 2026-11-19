import type { JSX, ReactNode } from 'react'

import type { KeyKind } from '@/modules/api-keys/components/key-kinds'
import { KeyTable } from '@/modules/api-keys/components/key-table'
import { SectionRow } from '@/shared/ui/section-row'

type KeyGroupProps = {
  keyKind: KeyKind
  count: number
  /** A key just created, or a failed replacement, shown at the top of the group's card. */
  notice: ReactNode
  /** One `KeyRow` per key. */
  children: ReactNode
}

/**
 * One kind of key as a section row: where it lives on the left, in plain words with the SDK's
 * term under it, and its keys in a table on the right.
 */
export function KeyGroup({ keyKind, count, notice, children }: KeyGroupProps): JSX.Element {
  return (
    <SectionRow
      title={
        <span className="grid gap-1">
          {keyKind.title}{' '}
          <code className="text-muted-foreground font-mono text-sm font-normal">
            {keyKind.term}
          </code>
        </span>
      }
      description={keyKind.description}
    >
      <div className="surface overflow-hidden">
        {notice}
        <GroupBody count={count} keyKind={keyKind}>
          {children}
        </GroupBody>
      </div>
    </SectionRow>
  )
}

type GroupBodyProps = { count: number; keyKind: KeyKind; children: ReactNode }

function GroupBody({ count, keyKind, children }: GroupBodyProps): JSX.Element {
  if (count === 0) {
    return <p className="text-muted-foreground px-5 py-6">{keyKind.emptyText}</p>
  }

  return <KeyTable label={keyKind.title}>{children}</KeyTable>
}
