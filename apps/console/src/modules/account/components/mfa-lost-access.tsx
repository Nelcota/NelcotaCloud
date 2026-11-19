import type { JSX } from 'react'

import { SupportLink } from '@/modules/account/components/support-link'
import { SUPPORT_EMAIL } from '@/shared/lib/support-email'

/**
 * The way out for someone who lost their authenticator app: only the platform's admins can
 * turn the check off for an account, so the line says who to ask.
 */
export function MfaLostAccess(): JSX.Element {
  if (SUPPORT_EMAIL === '') {
    return (
      <p className="text-muted-foreground text-center text-sm text-pretty">
        Perdeu o acesso ao app? Peça a quem administra a Nelcota para desativar a verificação da sua
        conta.
      </p>
    )
  }

  return (
    <p className="text-muted-foreground text-center text-sm text-pretty">
      Perdeu o acesso ao app? Escreva para <SupportLink /> e peça para desativar a verificação.
    </p>
  )
}
