import * as React from 'react'
import { cn } from '@/shared/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex field-sizing-content min-h-20 w-full rounded-md border border-input bg-surface px-3 py-2 text-[1rem] leading-relaxed sm:text-sm transition-[border-color,background-color] duration-200 ease-standard placeholder:text-muted-foreground hover:border-muted-foreground focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:outline-destructive/30',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
