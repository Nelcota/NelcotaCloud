import type { JSX } from 'react'

import type { IconComponent } from '@/shared/ui/icon-component'

type TableHeadLabelProps = { icon: IconComponent; children: string }

/**
 * A column heading led by its icon, sized and spaced like the icons in the rows below (20px,
 * 12px gap), so a heading's text starts where its column's text does.
 */
export function TableHeadLabel({ icon: Icon, children }: TableHeadLabelProps): JSX.Element {
  return (
    <span className="inline-flex items-center gap-3">
      <Icon aria-hidden="true" className="size-5 shrink-0" />
      {children}
    </span>
  )
}
