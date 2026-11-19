import type { SmtpStepProps } from '@/modules/project-settings/smtp/components/smtp-step-props'
import type { JSX } from 'react'

import { withSecurity } from '@/modules/project-settings/smtp/model/smtp-draft'
import { SECURITY_CHOICES } from '@/modules/project-settings/smtp/model/smtp-security'
import { ChoiceCards } from '@/shared/ui/choice-cards'
import { FormField } from '@/shared/ui/form-field'

/** Prefilled from the provider; only "Outro" usually needs typing here. */
export function SmtpServerStep({ draft, onChange }: SmtpStepProps): JSX.Element {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 @sm:grid-cols-[1fr_7rem]">
        <FormField
          label="Servidor"
          required
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus
          placeholder="smtp.seudominio.com"
          value={draft.host}
          onChange={(event) => onChange({ ...draft, host: event.target.value })}
        />
        <FormField
          label="Porta"
          required
          inputMode="numeric"
          autoComplete="off"
          value={draft.port}
          onChange={(event) => onChange({ ...draft, port: event.target.value })}
        />
      </div>
      <ChoiceCards
        legend="Segurança da conexão"
        choices={SECURITY_CHOICES}
        selected={draft.security}
        onSelect={(security) => onChange(withSecurity(draft, security))}
      />
    </div>
  )
}
