import type { ReferenceTarget } from '@/modules/database/components/column-draft'
import type { components } from '@/shared/api/api-schema'

type TableOverview = components['schemas']['TableOverview']

/** Columns a foreign key can point to: primary keys and unique columns of the project's tables. */
export function referenceTargets(tables: readonly TableOverview[]): ReferenceTarget[] {
  return tables
    .filter((table) => table.kind === 'table')
    .flatMap((table) =>
      table.columns
        .filter((column) => column.is_primary_key || column.is_unique)
        .map((column) => ({ table: table.name, column: column.name })),
    )
}

/** How a target is written in a select's value and label: `table.column`. */
export function targetLabel(target: ReferenceTarget): string {
  return `${target.table}.${target.column}`
}
