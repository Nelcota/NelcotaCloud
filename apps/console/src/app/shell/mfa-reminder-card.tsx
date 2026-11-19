import { Link } from '@tanstack/react-router'
import ArrowUpRight from '~icons/solar/arrow-right-up-linear'
import Close from '~icons/solar/close-linear'
import type { JSX } from 'react'
import { useState } from 'react'

import { useMfaStatusQuery } from '@/modules/account/queries/use-mfa'
import { useSession } from '@/shared/auth/use-session'
import { buttonVariants } from '@/shared/ui/button-variants'

const DISMISSED_KEY = 'nelcota-mfa-reminder-dismissed'

/**
 * Nudges the console account to turn MFA on, since it holds the keys of every project.
 * Shown only while MFA is off; dismissing it is remembered on this browser.
 */
export function MfaReminderCard({ onNavigate }: { onNavigate?: () => void }): JSX.Element | null {
  const session = useSession()
  const status = useMfaStatusQuery(false)
  const [isDismissed, setIsDismissed] = useState(readDismissed)
  const mfaEnabled = status.data?.totp_enabled ?? session?.user.mfa_enabled

  function dismiss(): void {
    setIsDismissed(true)
    writeDismissed()
  }

  if (isDismissed || mfaEnabled !== false) {
    return null
  }

  return (
    <section aria-labelledby="mfa-reminder-title" className="surface relative p-3">
      <span className="rounded-md bg-amber-500/15 px-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
        Recomendado
      </span>
      <button
        type="button"
        aria-label="Dispensar aviso de MFA"
        onClick={dismiss}
        className="text-muted-foreground hover:bg-sidebar-accent hover:text-foreground absolute top-2 right-2 flex size-8 items-center justify-center rounded-md transition-colors"
      >
        <Close className="size-4" />
      </button>
      <h2 id="mfa-reminder-title" className="mt-2 text-sm">
        Proteja sua conta
      </h2>
      <p className="text-muted-foreground mt-0.5 text-xs text-pretty">
        Ative a verificação em duas etapas: sua conta abre todos os seus projetos.
      </p>
      <Link
        to="/account"
        onClick={onNavigate}
        className={`${buttonVariants({ variant: 'outline', size: 'sm' })} mt-3`}
      >
        Ativar MFA
        <ArrowUpRight className="size-4" />
      </Link>
    </section>
  )
}

/** Storage can be blocked (private mode); the card then simply shows again. */
function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === 'true'
  } catch {
    return false
  }
}

function writeDismissed(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, 'true')
  } catch {
    // Not remembered on this browser; the card is hidden until the next visit anyway.
  }
}
