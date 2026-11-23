import * as React from 'react'
import { cn } from '@/shared/lib/utils'
import { useReturnFocus } from '@/shared/lib/use-return-focus'
import { Dialog as SheetPrimitive } from 'radix-ui'

import { Button } from '@/shared/ui/primitives/button'
import { XIcon } from 'lucide-react'

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetPortal({ ...props }: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-black/60 duration-150 supports-backdrop-filter:backdrop-blur-[2px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
        className,
      )}
      {...props}
    />
  )
}

type SheetSide = 'top' | 'right' | 'bottom' | 'left'

/**
 * Where each side sits, as plain classes rather than `data-[side=…]` variants: a variant's
 * attribute selector would outrank the width a sheet asks for (`sm:max-w-xl`).
 */
const SIDE_CLASSES: Record<SheetSide, string> = {
  top: 'inset-x-0 top-0 h-auto border-b border-divider',
  right: 'inset-y-0 right-0 h-full w-full border-l border-divider sm:max-w-sm',
  bottom: 'inset-x-0 bottom-0 h-auto border-t border-divider',
  left: 'inset-y-0 left-0 h-full w-3/4 border-r border-divider sm:max-w-sm',
}

function SheetContent({
  className,
  children,
  side = 'right',
  showCloseButton = true,
  onOpenAutoFocus,
  onCloseAutoFocus,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: SheetSide
  showCloseButton?: boolean
}) {
  const focus = useReturnFocus(onOpenAutoFocus, onCloseAutoFocus)

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          'fixed z-50 flex flex-col bg-popover bg-clip-padding text-sm text-popover-foreground shadow-popover duration-250 ease-emphasized outline-none data-closed:duration-150 data-open:animate-in data-open:fade-in-0 data-[side=bottom]:data-open:slide-in-from-bottom-10 data-[side=left]:data-open:slide-in-from-left-10 data-[side=right]:data-open:slide-in-from-right-10 data-[side=top]:data-open:slide-in-from-top-10 data-closed:animate-out data-closed:fade-out-0 data-[side=bottom]:data-closed:slide-out-to-bottom-10 data-[side=left]:data-closed:slide-out-to-left-10 data-[side=right]:data-closed:slide-out-to-right-10 data-[side=top]:data-closed:slide-out-to-top-10',
          SIDE_CLASSES[side],
          className,
        )}
        {...props}
        onOpenAutoFocus={focus.onOpenAutoFocus}
        onCloseAutoFocus={focus.onCloseAutoFocus}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close data-slot="sheet-close" asChild>
            <Button variant="ghost" className="absolute end-3 top-3" size="icon-sm">
              <XIcon />
              <span className="sr-only">Fechar</span>
            </Button>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn('text-base leading-tight font-medium text-heading', className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-xs text-muted-foreground', className)}
      {...props}
    />
  )
}

/** Title and description over a divider; the end padding keeps them clear of the close button. */
function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-header"
      className={cn(
        'flex shrink-0 flex-col gap-1 border-b border-divider px-5 py-4 pe-12',
        className,
      )}
      {...props}
    />
  )
}

/** The part that scrolls, so the header and the footer's buttons stay in view. */
function SheetBody({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-body"
      className={cn(
        'scrollbar-thin flex min-h-0 min-w-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain p-5 *:shrink-0',
        className,
      )}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        'flex shrink-0 items-center justify-end gap-2 border-t border-divider bg-surface px-5 py-3',
        className,
      )}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetBody,
  SheetTrigger,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetHeader,
  SheetFooter,
}
