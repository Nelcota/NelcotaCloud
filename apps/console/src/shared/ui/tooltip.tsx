import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'
import type { JSX, ReactElement, ReactNode } from 'react'

type TooltipProps = {
  label: string
  /** The element that shows the label on hover and focus; it must accept a ref. */
  children: ReactElement
  side?: TooltipPrimitive.Positioner.Props['side']
}

/** Names an icon-only control. The control keeps its own `aria-label`; this is for sighted users. */
export function Tooltip({ label, children, side = 'right' }: TooltipProps): JSX.Element {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger render={children} />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side={side} sideOffset={10} className="isolate z-50">
          <TooltipPrimitive.Popup className="bg-popover text-popover-foreground ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 rounded-lg px-2.5 py-1 text-xs font-medium shadow-lg ring-1 duration-100">
            {label}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

/** Shares one hover delay across a group of tooltips, so moving along a toolbar feels instant. */
export function TooltipProvider({ children }: { children: ReactNode }): JSX.Element {
  return <TooltipPrimitive.Provider delay={300}>{children}</TooltipPrimitive.Provider>
}
