import Letter from '~icons/solar/letter-linear'
import type { JSX } from 'react'

import { useResetSmtpMutation } from '@/modules/project-settings/queries/use-project-settings'
import { ConfirmButton } from '@/shared/ui/confirm-button'

type ResetSmtpButtonProps = {
  projectId: string
  /** The project's own server, as the page names it. */
  serverName: string
}

/** Back to the platform's server; the dialog shows any error from the API. */
export function ResetSmtpButton({ projectId, serverName }: ResetSmtpButtonProps): JSX.Element {
  const reset = useResetSmtpMutation(projectId)

  return (
    <ConfirmButton
      label="Voltar ao padrão"
      size="md"
      title="Voltar ao SMTP da NelcotaCloud?"
      description="Os emails passam a sair pela NelcotaCloud. As credenciais do seu servidor são apagadas."
      confirmLabel="Voltar ao padrão"
      change={{ subject: serverName, icon: Letter, from: 'Seu servidor', to: 'SMTP da plataforma' }}
      isPending={reset.isPending}
      onConfirm={() => reset.mutateAsync()}
    />
  )
}
