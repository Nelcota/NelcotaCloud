import { Button as ButtonPrimitive } from '@base-ui/react/button'
import type { VariantProps } from 'class-variance-authority'
import LoaderCircle from '~icons/solar/refresh-linear'
import type { AriaAttributes } from 'react'
import { cn } from '@/shared/lib/class-names'
import { buttonVariants } from '@/shared/ui/button-variants'

/**
 * A button that shows a spinner beside its label while `aria-busy` is set, so a slow request
 * never looks like a click that did nothing.
 */
function Button({
  className,
  variant = 'default',
  size = 'default',
  children,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
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

export { Button }
