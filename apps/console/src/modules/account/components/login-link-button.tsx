import type { JSX } from 'react'

import { RouterLink } from '@/shared/routing/router-link'
import { Button } from '@/shared/ui/primitives/button'

/** The way from an email-link page back to the login, as the page's main action. */
export function LoginLinkButton({ label }: { label: string }): JSX.Element {
  return (
    <Button asChild size="lg" className="h-10 w-full">
      <RouterLink href="/login">{label}</RouterLink>
    </Button>
  )
}
