import { Send, Check } from 'lucide-react'
import type { JSX } from 'react'

import {
  useReloadSessionMutation,
  useResendVerificationMutation,
} from '@/modules/account/queries/use-email-verification'
import { useEmailVerificationRequired } from '@/modules/account/queries/use-email-verification-required'
import { useSession } from '@/shared/auth/use-session'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { Notice } from '@/shared/ui/notice'
import { PendingButton } from '@/shared/ui/pending-button'
import { SavedNote } from '@/shared/ui/saved-note'

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
    <div className="flex flex-col gap-2">
      <Notice
        tone="warning"
        title="Confirme seu email para gerenciar projetos"
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <SavedNote isSaved={resend.isSuccess} message="Email enviado." />
            <PendingButton
              type="button"
              variant="outline"
              size="sm"
              isPending={resend.isPending}
              onClick={() => resend.mutate(email)}
            >
              <Send aria-hidden data-icon="inline-start" />
              Reenviar email
            </PendingButton>
            <PendingButton
              type="button"
              variant="outline"
              size="sm"
              isPending={reload.isPending}
              onClick={() => reload.mutate()}
            >
              <Check aria-hidden data-icon="inline-start" />
              Já confirmei
            </PendingButton>
          </div>
        }
      >
        Enviamos um link de confirmação para {email}. Depois de abrir o link, volte aqui.
      </Notice>
      <ErrorAlert error={resend.error ?? reload.error} />
    </div>
  )
}
