import ArrowUpRight from '~icons/solar/arrow-right-up-linear'
import type { JSX } from 'react'

import { RouterLink } from '@/shared/routing/router-link'
import { Button } from '@/shared/ui/primitives/button'

type RowLinkProps = {
  href: string
  label: string
  /** For screen readers when the label alone is ambiguous ("Configurar o email"). */
  ariaLabel?: string
}

/** A row's way to the page where the setting really lives. */
export function RowLink({ href, label, ariaLabel }: RowLinkProps): JSX.Element {
  return (
    <Button asChild variant="outline" size="sm">
      <RouterLink href={href} aria-label={ariaLabel}>
        {label}
        <ArrowUpRight aria-hidden data-icon="inline-end" className="size-3.5" />
      </RouterLink>
    </Button>
  )
}
