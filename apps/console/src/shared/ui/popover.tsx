import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import type { JSX } from 'react'

import { cn } from '@/shared/lib/class-names'

export function Popover(props: PopoverPrimitive.Root.Props): JSX.Element {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

export function PopoverTrigger(props: PopoverPrimitive.Trigger.Props): JSX.Element {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

type PopoverContentProps = PopoverPrimitive.Popup.Props &
  Pick<PopoverPrimitive.Positioner.Props, 'align' | 'side' | 'sideOffset'>

/** A floating panel drawn like the dropdown menus, so both read as the same kind of layer. */
export function PopoverContent({
  align = 'start',
  side = 'bottom',
  sideOffset = 4,
  className,
  ...props
}: PopoverContentProps): JSX.Element {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        className="isolate z-50 outline-none"
        align={align}
        side={side}
        sideOffset={sideOffset}
        collisionPadding={16}
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            'bg-popover text-popover-foreground ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 max-h-(--available-height) max-w-(--available-width) origin-(--transform-origin) overflow-y-auto rounded-xl p-2 shadow-lg ring-1 duration-100 outline-none',
            className,
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}
