import ArrowDown from '~icons/solar/alt-arrow-down-linear'
import ArrowUp from '~icons/solar/alt-arrow-up-linear'
import SortVertical from '~icons/solar/sort-vertical-linear'
import type { JSX, ReactNode } from 'react'

import type { ProjectSort, SortKey } from '@/modules/projects/components/project-query'
import { cn } from '@/shared/lib/class-names'
import { ColumnLabel } from '@/shared/ui/column-label'
import type { IconComponent } from '@/shared/ui/icon-component'
import { TableHead } from '@/shared/ui/table'

type SortableColumnProps = {
  sortKey: SortKey
  sort: ProjectSort
  icon: IconComponent
  children: ReactNode
  className?: string
  onSort: (key: SortKey) => void
}

/** A column heading that sorts the table; `aria-sort` tells screen readers the order. */
export function SortableColumn(props: SortableColumnProps): JSX.Element {
  const isActive = props.sort.key === props.sortKey

  return (
    <TableHead
      aria-sort={ariaSort(isActive, props.sort)}
      className={cn('h-11 px-4', props.className)}
    >
      <button
        type="button"
        onClick={() => props.onSort(props.sortKey)}
        className="hover:text-foreground -mx-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 transition-[color,transform] active:scale-[0.97] motion-reduce:active:scale-100"
      >
        <ColumnLabel icon={props.icon}>{props.children}</ColumnLabel>
        <SortIcon isActive={isActive} isAscending={props.sort.isAscending} />
      </button>
    </TableHead>
  )
}

function SortIcon({
  isActive,
  isAscending,
}: {
  isActive: boolean
  isAscending: boolean
}): JSX.Element {
  if (isActive === false) {
    return <SortVertical aria-hidden="true" className="text-muted-foreground/60 size-4" />
  }

  if (isAscending) {
    return <ArrowUp aria-hidden="true" className="size-4" />
  }

  return <ArrowDown aria-hidden="true" className="size-4" />
}

function ariaSort(isActive: boolean, sort: ProjectSort): 'ascending' | 'descending' | 'none' {
  if (isActive === false) {
    return 'none'
  }

  if (sort.isAscending) {
    return 'ascending'
  }

  return 'descending'
}
