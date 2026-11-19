import ArrowDown from '~icons/solar/alt-arrow-down-linear'
import type { JSX } from 'react'

import type { UserOrder } from '@/modules/users/model/users-search'
import { cn } from '@/shared/lib/class-names'
import { TableHead } from '@/shared/ui/table'

type SortableHeadProps = {
  order: UserOrder
  /** The order this column sorts by; the list always sorts newest or most recent first. */
  sortsBy: UserOrder
  onOrderChange: (order: UserOrder) => void
  className: string
  children: string
}

/**
 * A column heading that sorts the list by its column. The sorted column says so to screen
 * readers (`aria-sort`) and shows its arrow; the others show it on hover.
 */
export function SortableHead(props: SortableHeadProps): JSX.Element {
  const { order, sortsBy } = props

  return (
    <TableHead className={props.className} aria-sort={ariaSort(order === sortsBy)}>
      <button
        type="button"
        onClick={() => props.onOrderChange(sortsBy)}
        className={cn(
          'group/sort hover:text-foreground -mx-1 inline-flex cursor-pointer items-center gap-1 rounded-md px-1 py-0.5 transition-colors',
          order === sortsBy && 'text-foreground',
        )}
      >
        {props.children}
        <ArrowDown
          aria-hidden="true"
          className={cn(
            'size-3.5 opacity-0 transition-opacity group-hover/sort:opacity-60',
            order === sortsBy && 'opacity-100 group-hover/sort:opacity-100',
          )}
        />
      </button>
    </TableHead>
  )
}

function ariaSort(isSorted: boolean): 'descending' | undefined {
  if (isSorted) {
    return 'descending'
  }

  return undefined
}
