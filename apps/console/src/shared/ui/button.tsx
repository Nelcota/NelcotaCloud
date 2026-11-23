import { Button as ButtonPrimitive } from '@base-ui/react/button'
import type { VariantProps } from 'class-variance-authority'
import LoaderCircle from '~icons/solar/refresh-linear'
import type { AriaAttributes } from 'react'
import { useReadOnlyReason } from '@/shared/auth/write-access'
import { cn } from '@/shared/lib/class-names'
import { buttonVariants } from '@/shared/ui/button-variants'

/**
 * A button that shows a spinner beside its label while `aria-busy` is set, so a slow request
 * never looks like a click that did nothing. A submit button is also disabled on a project the
 * account may only read: the API would refuse what it submits.
 */
function Button({
  className,
  variant = 'default',
  size = 'default',
  children,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  const readOnly = readOnlyProps(props.type, useReadOnlyReason())

  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
      {...readOnly}
    >
      <BusySpinner isBusy={props['aria-busy']} />
      {children}
    </ButtonPrimitive>
  )
}

function BusySpinner({ isBusy }: { isBusy: AriaAttributes['aria-busy'] }) {
  if (isBusy !== true && isBusy !== 'true') {
    return null
  }

  return <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" />
}

function readOnlyProps(
  type: ButtonPrimitive.Props['type'],
  readOnlyReason: string | null,
): { disabled?: boolean; title?: string } {
  if (type !== 'submit' || readOnlyReason === null) {
    return {}
  }

  return { disabled: true, title: readOnlyReason }
}

export { Button }
