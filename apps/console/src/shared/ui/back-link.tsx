import { ArrowLeft } from 'lucide-react'
import type { JSX } from 'react'

import { RouterLink } from '@/shared/routing/router-link'

type BackLinkProps = {
  /** Where it leads, named as that page names itself ("Usuários"). */
  label: string
  href: string
}

/** The way up from a detail page; it only navigates, so it is a link, not a button. */
export function BackLink({ label, href }: BackLinkProps): JSX.Element {
  return (
    <RouterLink
      href={href}
      className="inline-flex w-fit items-center gap-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft aria-hidden className="size-3.5" />
      {label}
    </RouterLink>
  )
}
