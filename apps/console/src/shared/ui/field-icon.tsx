import type { JSX } from 'react'

import type { IconComponent } from '@/shared/ui/icon-component'

/** A field's icon at the start of the input; it names what goes in, the label still does too. */
export function FieldIcon({ icon }: { icon?: IconComponent }): JSX.Element | null {
  if (icon === undefined) {
    return null
  }

  const Icon = icon

  return (
    <Icon
      aria-hidden="true"
      className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2"
    />
  )
}
