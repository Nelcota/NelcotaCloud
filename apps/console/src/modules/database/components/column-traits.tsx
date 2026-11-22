import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'
import { StatusBadge } from '@/shared/ui/status-badge'

type ColumnOverview = components['schemas']['ColumnOverview']
type ForeignKeyOverview = components['schemas']['ForeignKeyOverview']

type ColumnTraitsProps = {
  column: ColumnOverview
  foreignKeys: readonly ForeignKeyOverview[]
}

/** What makes the column special: key, numbering, uniqueness and the column it points to. */
export function ColumnTraits({ column, foreignKeys }: ColumnTraitsProps): JSX.Element {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <Trait isShown={column.is_primary_key} label="Chave primária" />
      <Trait isShown={column.is_identity} label="Numeração automática" />
      <Trait isShown={column.is_unique && column.is_primary_key === false} label="Único" />
      <ReferenceNote target={referenceOf(column.name, foreignKeys)} />
    </span>
  )
}

function Trait({ isShown, label }: { isShown: boolean; label: string }): JSX.Element | null {
  if (isShown === false) {
    return null
  }

  return <StatusBadge>{label}</StatusBadge>
}

function ReferenceNote({ target }: { target: string | null }): JSX.Element | null {
  if (target === null) {
    return null
  }

  return <code className="font-mono text-xs text-muted-foreground">→ {target}</code>
}

/** `posts.id` for a one-column key; `posts(a, b)` when the key spans several columns. */
function referenceOf(column: string, foreignKeys: readonly ForeignKeyOverview[]): string | null {
  const foreignKey = foreignKeys.find((candidate) => candidate.columns.includes(column))

  if (foreignKey === undefined) {
    return null
  }

  const target = foreignKey.foreign_columns

  if (target.length === 1) {
    return `${foreignKey.foreign_table}.${target.join('')}`
  }

  return `${foreignKey.foreign_table}(${target.join(', ')})`
}
