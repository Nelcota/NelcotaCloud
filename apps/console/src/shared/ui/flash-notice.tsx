import type { JSX } from 'react'

import { type Flash, dismissFlash, useFlash } from '@/shared/lib/flash-notice'
import { RouterLink } from '@/shared/routing/router-link'
import { Notice } from '@/shared/ui/notice'
import { Button } from '@/shared/ui/primitives/button'

/** The latest success message; its follow-up link stays until the notice is dismissed. */
export function FlashNotice(): JSX.Element | null {
  const flash = useFlash()

  if (flash === null) {
    return null
  }

  return (
    <Notice
      tone="success"
      title={flash.message}
      onDismiss={closeNotice}
      action={<FlashLink link={flash.link} />}
    />
  )
}

function FlashLink({ link }: { link: Flash['link'] }): JSX.Element | null {
  if (link === undefined) {
    return null
  }

  return (
    <Button asChild variant="outline" size="sm">
      <RouterLink href={link.href}>{link.label}</RouterLink>
    </Button>
  )
}

function closeNotice(): void {
  document.getElementById('console-content')?.focus({ preventScroll: true })
  dismissFlash()
}
