import type { SmtpStepProps } from '@/modules/project-settings/smtp/components/smtp-step-props'
import type { JSX } from 'react'

import { withProvider, withRegion } from '@/modules/project-settings/smtp/model/smtp-draft'
import { SMTP_PROVIDER_CHOICES } from '@/modules/project-settings/smtp/model/smtp-presets'
import { ChoiceCards } from '@/shared/ui/choice-cards'
import { FormField } from '@/shared/ui/form-field'

/** Picking the provider fills its server, so most people never type a host. */
export function SmtpProviderStep({ draft, onChange }: SmtpStepProps): JSX.Element {
  return (
    <div className="grid gap-4">
      <ChoiceCards
        legend="Quem envia os emails"
        choices={SMTP_PROVIDER_CHOICES}
        selected={draft.provider}
        onSelect={(provider) => onChange(withProvider(draft, provider))}
      />
      <SesRegionField draft={draft} onChange={onChange} />
    </div>
  )
}

function SesRegionField({ draft, onChange }: SmtpStepProps): JSX.Element | null {
  if (draft.provider !== 'ses') {
    return null
  }

  return (
    <FormField
      label="Região da AWS"
      required
      autoComplete="off"
      spellCheck={false}
      placeholder="us-east-1"
      hint="A mesma região em que o SES está ativo, como us-east-1 ou sa-east-1 (São Paulo)."
      value={draft.region}
      onChange={(event) => onChange(withRegion(draft, event.target.value))}
    />
  )
}
