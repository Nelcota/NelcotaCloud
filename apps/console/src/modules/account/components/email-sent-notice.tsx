import type { JSX } from 'react'
import { useEffect, useState } from 'react'

import {
  type SentLinkPurpose,
  useResendLinkMutation,
} from '@/modules/account/queries/use-resend-link-mutation'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'

/** Long enough that a slow email can arrive before a second one is asked for. */
const RESEND_COOLDOWN_SECONDS = 60
const ONE_SECOND_MS = 1000

type EmailSentNoticeProps = {
  email: string
  purpose: SentLinkPurpose
}

/** Says where the link went (in full, so a typo shows), offers a resend, then the spam tip. */
export function EmailSentNotice({ email, purpose }: EmailSentNoticeProps): JSX.Element {
  const resend = useResendLinkMutation(purpose)
  const secondsLeft = useCountdown(RESEND_COOLDOWN_SECONDS, resend.submittedAt)

  return (
    <div className="grid gap-4">
      <p className="text-center text-base text-pretty">
        Enviamos o link para <strong className="font-semibold break-all">{email}</strong>.
      </p>
      <ErrorAlert error={resend.error} />
      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="w-full"
        disabled={secondsLeft > 0 || resend.isPending}
        aria-label="Reenviar link"
        aria-busy={resend.isPending}
        onClick={() => resend.mutate(email)}
      >
        <ResendLabel secondsLeft={secondsLeft} />
      </Button>
      <p aria-live="polite" className="text-muted-foreground text-center text-sm">
        <SentAgainNote isSent={resend.isSuccess} />
      </p>
      <p className="text-muted-foreground text-center text-sm text-pretty">
        Se não chegar em alguns minutos, olhe a caixa de spam.
      </p>
    </div>
  )
}

/**
 * Seconds until the next resend, counted from the later of the first send (when the notice
 * opened) and the last resend. A clock ticks once a second; the count is derived from it.
 */
function useCountdown(seconds: number, restartedAt: number): number {
  const [openedAt] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), ONE_SECOND_MS)

    return () => window.clearInterval(timer)
  }, [])

  const startedAt = Math.max(openedAt, restartedAt)
  const elapsedSeconds = Math.floor((now - startedAt) / ONE_SECOND_MS)

  return Math.min(seconds, Math.max(seconds - elapsedSeconds, 0))
}

function ResendLabel({ secondsLeft }: { secondsLeft: number }): JSX.Element {
  if (secondsLeft > 0) {
    return <>Reenviar em {secondsLeft} s</>
  }

  return <>Reenviar link</>
}

function SentAgainNote({ isSent }: { isSent: boolean }): JSX.Element | null {
  if (isSent === false) {
    return null
  }

  return <>Link reenviado.</>
}
