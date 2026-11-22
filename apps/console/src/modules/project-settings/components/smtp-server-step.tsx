import type { JSX } from 'react'

import { type SmtpStepProps, withSecurity } from '@/modules/project-settings/components/smtp-draft'
import { SECURITY_CHOICES } from '@/modules/project-settings/components/smtp-security'
import { ChoiceCards } from '@/shared/ui/choice-cards'
import { TextField } from '@/shared/ui/text-field'

/** Prefilled from the provider; only "Outro" usually needs typing here. */
export function SmtpServerStep({ draft, onChange }: SmtpStepProps): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_7rem]">
        <TextField
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
        <TextField
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
        isLegendHidden={false}
        choices={SECURITY_CHOICES}
        selected={draft.security}
        onSelect={(security) => onChange(withSecurity(draft, security))}
      />
    </div>
  )
}
