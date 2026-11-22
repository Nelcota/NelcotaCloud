import * as React from 'react'
import { cn } from '@/shared/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-surface px-2.5 py-2 text-xs leading-relaxed transition-[border-color,background-color] duration-200 ease-standard outline-none placeholder:text-muted-foreground hover:border-muted-foreground focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:outline-destructive/30',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
