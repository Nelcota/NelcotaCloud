import { KeyRound } from 'lucide-react'
import type { JSX } from 'react'

import { useRecoverPasswordMutation } from '@/modules/account/queries/use-recover-password-mutation'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { PendingButton } from '@/shared/ui/pending-button'
import { SavedNote } from '@/shared/ui/saved-note'
import { SettingsSection } from '@/shared/ui/settings-section'

/**
 * The password changes through the emailed reset link, so whoever holds an open session
 * alone cannot replace it without the inbox.
 */
export function PasswordSection({ email }: { email: string }): JSX.Element {
  const recover = useRecoverPasswordMutation()

  return (
    <SettingsSection
      title="Senha"
      description="Enviamos um link para o seu email. Ao trocar, todas as sessões terminam."
      footerNote={
        <SavedNote isSaved={recover.isSuccess} message="Link enviado. Confira seu email." />
      }
      footer={
        <PendingButton
          type="button"
          variant="outline"
          size="sm"
          isPending={recover.isPending}
          onClick={() => recover.mutate(email)}
        >
          <KeyRound aria-hidden data-icon="inline-start" />
          Trocar senha
        </PendingButton>
      }
    >
      {errorContent(recover.error)}
    </SettingsSection>
  )
}

/** Without an error the panel has no body, so it adds no empty space above the footer. */
function errorContent(error: Error | null): JSX.Element | undefined {
  if (error === null) {
    return undefined
  }

  return <ErrorAlert error={error} />
}
