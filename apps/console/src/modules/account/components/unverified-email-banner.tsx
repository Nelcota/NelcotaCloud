import Letter from '~icons/solar/letter-linear'
import type { JSX } from 'react'

import {
  useReloadSessionMutation,
  useResendVerificationMutation,
} from '@/modules/account/queries/use-email-verification'
import { useEmailVerificationRequired } from '@/modules/account/queries/use-email-verification-required'
import { useSession } from '@/shared/auth/use-session'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'

/**
 * When the platform requires confirmed emails, the API refuses projects to accounts without
 * one (accounts made before the rule still log in), so the console says why and how to fix it.
 */
export function UnverifiedEmailBanner(): JSX.Element | null {
  const session = useSession()
  const isRequired = useEmailVerificationRequired()
  const resend = useResendVerificationMutation()
  const reload = useReloadSessionMutation()

  if (session === null || isRequired === false) {
    return null
  }

  const email = session.user.email

  return (
    <section
      aria-labelledby="unverified-email-title"
      className="mb-6 grid gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"
    >
      <div className="flex items-start gap-3">
        <Letter
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-400"
        />
        <div className="min-w-0">
          <h2 id="unverified-email-title" className="text-sm font-semibold">
            Confirme seu email para gerenciar projetos
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm text-pretty">
            Enviamos um link de confirmação para <strong>{email}</strong>. Depois de abrir o link,
            volte aqui.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:pl-8">
        <Button
          size="sm"
          variant="outline"
          disabled={resend.isPending}
          aria-busy={resend.isPending}
          onClick={() => resend.mutate(email)}
        >
          Reenviar email
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={reload.isPending}
          aria-busy={reload.isPending}
          onClick={() => reload.mutate()}
        >
          Já confirmei
        </Button>
        <SentNote isSent={resend.isSuccess} />
      </div>
      <ErrorAlert error={resend.error ?? reload.error} />
    </section>
  )
}

function SentNote({ isSent }: { isSent: boolean }): JSX.Element | null {
  if (isSent === false) {
    return null
  }

  return (
    <span role="status" className="text-muted-foreground text-sm">
      Email enviado. Confira sua caixa de entrada.
    </span>
  )
}
