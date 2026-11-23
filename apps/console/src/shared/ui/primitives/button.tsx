import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/shared/lib/utils'
import { Slot } from 'radix-ui'

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-xs font-medium whitespace-nowrap transition-[color,background-color,border-color,scale] duration-200 ease-standard select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 aria-busy:cursor-progress aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default:
          'bg-primary-fill text-primary-foreground hover:bg-primary-fill-hover disabled:bg-surface disabled:text-muted-foreground disabled:opacity-100',
        outline: 'bg-surface text-foreground hover:bg-surface-hover aria-expanded:bg-surface-hover',
        secondary:
          'bg-surface text-foreground hover:bg-surface-hover aria-expanded:bg-surface-hover',
        ghost:
          'text-muted-foreground hover:bg-surface hover:text-foreground aria-expanded:bg-surface aria-expanded:text-foreground',
        destructive:
          'border-destructive/30 bg-surface text-destructive hover:border-destructive/50 hover:bg-destructive/10 focus-visible:outline-destructive',
        'destructive-ghost':
          'text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:outline-destructive',
        'destructive-solid':
          'bg-destructive-fill text-primary-foreground hover:bg-destructive-fill-hover focus-visible:outline-destructive',
        link: 'h-auto px-0 text-primary underline-offset-4 hover:text-primary-hover hover:underline',
      },
      size: {
        default:
          'h-10 gap-2 px-4 has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5',
        xs: "h-8 gap-1.5 rounded-sm px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-4.5",
        sm: "h-9 gap-1.5 px-3.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-5",
        lg: 'h-11 gap-2 px-5 text-sm has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4',
        icon: 'size-10',
        'icon-xs': "size-8 rounded-sm [&_svg:not([class*='size-'])]:size-4.5",
        'icon-sm': 'size-9',
        'icon-lg': 'size-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button }
