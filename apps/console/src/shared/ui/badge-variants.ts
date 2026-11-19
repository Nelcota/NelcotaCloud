import { cva } from 'class-variance-authority'

/**
 * Pills name a category or a state; the variant is the meaning, never decoration:
 * - `neutral`: what something is (a role, a key type, "Esta sessão").
 * - `success` / `warning` / `destructive`: a state that is fine, needs attention, or blocks.
 * - `muted`: a state that is off (revoked, disabled), quieter than everything else.
 * Kept apart from the component so other elements (the change preview) share the look.
 */
export const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1.5 rounded-md border font-medium whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:shrink-0',
  {
    variants: {
      variant: {
        neutral: 'bg-foreground/10 text-foreground border-transparent',
        success:
          'border-transparent bg-emerald-500/12 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
        warning:
          'border-transparent bg-amber-500/12 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400',
        destructive: 'bg-destructive/12 text-destructive border-transparent dark:bg-destructive/15',
        muted: 'border-border text-muted-foreground bg-transparent',
      },
      size: {
        default: 'h-5.5 px-1.5 text-xs [&>svg]:size-3.5',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      size: 'default',
    },
  },
)
