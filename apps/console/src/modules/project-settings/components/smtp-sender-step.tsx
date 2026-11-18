import type { JSX } from 'react'

import type { SmtpStepProps } from '@/modules/project-settings/components/smtp-draft'
import { FormField } from '@/shared/ui/form-field'

/** Who the emails come from, as the user's inbox shows it. */
export function SmtpSenderStep({ draft, onChange }: SmtpStepProps): JSX.Element {
  return (
    <div className="grid gap-4">
      <FormField
        label="Nome"
        autoComplete="off"
        autoFocus
        placeholder="Acme"
        hint="Aparece na caixa de entrada. Pode ficar vazio."
        value={draft.senderName}
        onChange={(event) => onChange({ ...draft, senderName: event.target.value })}
      />
      <FormField
        label="Email"
        type="email"
        required
        autoComplete="off"
        placeholder="no-reply@seudominio.com"
        hint="Um endereço que o seu servidor aceita usar como remetente."
        value={draft.senderEmail}
        onChange={(event) => onChange({ ...draft, senderEmail: event.target.value })}
      />
    </div>
  )
}
