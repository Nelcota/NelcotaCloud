'use client'

import { Switch as SwitchPrimitive } from '@base-ui/react/switch'
import type { JSX } from 'react'
import { cn } from '@/shared/lib/class-names'

function Switch({
  className,
  size = 'default',
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: 'sm' | 'default'
}): JSX.Element {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        'peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent p-px after:absolute after:-inset-x-3 after:-inset-y-2',
        'data-[size=default]:h-6 data-[size=default]:w-10 data-[size=sm]:h-5 data-[size=sm]:w-8',
        'data-checked:bg-green-600 data-unchecked:bg-zinc-500 not-data-disabled:hover:data-checked:bg-green-700 not-data-disabled:hover:data-unchecked:bg-zinc-500/90',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-disabled:cursor-not-allowed data-disabled:opacity-50',
        'motion-safe:transition-[background-color,scale] motion-safe:duration-150 motion-safe:ease-out motion-safe:not-data-disabled:active:scale-[0.97]',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block shrink-0 rounded-full bg-white shadow-xs shadow-black/20',
          'group-data-[size=default]/switch:size-5 group-data-[size=default]/switch:data-checked:translate-x-4 group-data-[size=sm]/switch:size-4 group-data-[size=sm]/switch:data-checked:translate-x-3',
          'motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out',
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
