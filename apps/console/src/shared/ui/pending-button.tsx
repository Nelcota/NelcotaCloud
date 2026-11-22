import type { ComponentProps, JSX } from 'react'

import { Button } from '@/shared/ui/primitives/button'
import { Spinner } from '@/shared/ui/primitives/spinner'

type PendingButtonProps = ComponentProps<typeof Button> & { isPending?: boolean }

/** A button that shows a spinner and stays disabled while its request runs. */
export function PendingButton({
  isPending,
  disabled,
  children,
  ...props
}: PendingButtonProps): JSX.Element {
  if (isPending === true) {
    return (
      <Button {...props} disabled aria-busy>
        <Spinner data-icon="inline-start" aria-hidden />
        {children}
      </Button>
    )
  }

  return (
    <Button {...props} disabled={disabled}>
      {children}
    </Button>
  )
}
