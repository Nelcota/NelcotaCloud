import type { JSX } from 'react'

import { SUPPORT_EMAIL } from '@/shared/lib/support-email'

/** The support address as a mail link; nothing when none is configured. */
export function SupportLink(): JSX.Element | null {
  if (SUPPORT_EMAIL === '') {
    return null
  }

  return (
    <a
      href={`mailto:${SUPPORT_EMAIL}`}
      className="text-foreground rounded-sm font-medium underline-offset-4 hover:underline"
    >
      {SUPPORT_EMAIL}
    </a>
  )
}

/** A quiet line under the auth pages for anyone stuck; hidden without a support address. */
export function HelpLine(): JSX.Element | null {
  if (SUPPORT_EMAIL === '') {
    return null
  }

  return (
    <p className="text-muted-foreground text-center text-sm">
      Precisa de ajuda? <SupportLink />
    </p>
  )
}
