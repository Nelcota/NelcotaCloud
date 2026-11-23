import type { ComponentProps, JSX } from 'react'

import { useReadOnlyReason } from '@/shared/auth/write-access'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/primitives/button'
import { Spinner } from '@/shared/ui/primitives/spinner'

type PendingButtonProps = ComponentProps<typeof Button> & { isPending?: boolean }

/** The spinner takes the place of the button's own leading icon instead of sitting beside it. */
const HIDE_OWN_ICON = '[&>svg[data-icon=inline-start]:not(:first-child)]:hidden'

/**
 * A button that shows a spinner and stays disabled while its request runs. A submit button is
 * also disabled on a project the account may only read: submitting would be refused.
 */
export function PendingButton({
  isPending,
  disabled,
  children,
  className,
  ...props
}: PendingButtonProps): JSX.Element {
  const readOnlyReason = useReadOnlyReason()

  if (isPending === true) {
    return (
      <Button {...props} className={cn(className, HIDE_OWN_ICON)} disabled aria-busy>
        <Spinner data-icon="inline-start" aria-hidden />
        {children}
      </Button>
    )
  }

  if (props.type === 'submit' && readOnlyReason !== null) {
    return (
      <Button {...props} className={className} disabled title={readOnlyReason}>
        {children}
      </Button>
    )
  }

  return (
    <Button {...props} className={className} disabled={disabled}>
      {children}
    </Button>
  )
}
