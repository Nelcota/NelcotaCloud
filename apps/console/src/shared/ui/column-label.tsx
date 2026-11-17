import type { JSX, ReactNode } from 'react'

import type { IconComponent } from '@/shared/ui/icon-component'

type ColumnLabelProps = {
  icon: IconComponent
  children: ReactNode
}

/** A table column heading led by its icon. */
export function ColumnLabel({ icon: Icon, children }: ColumnLabelProps): JSX.Element {
  return (
    <span className="inline-flex items-center gap-2">
      <Icon aria-hidden="true" className="size-[1.125rem] shrink-0" />
      {children}
    </span>
  )
}
