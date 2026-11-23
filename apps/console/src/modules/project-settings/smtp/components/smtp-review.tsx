import type { JSX } from 'react'

import type { SmtpStepProps } from '@/modules/project-settings/smtp/components/smtp-step-props'
import {
  cleanHost,
  parsePort,
  type SmtpDraft,
} from '@/modules/project-settings/smtp/model/smtp-draft'
import { SMTP_PRESETS } from '@/modules/project-settings/smtp/model/smtp-presets'
import { SECURITY_LABELS } from '@/modules/project-settings/smtp/model/smtp-security'
import { formatSender } from '@/modules/project-settings/smtp/model/smtp-sender'
import { FormField } from '@/shared/ui/form-field'
import { ReviewList } from '@/shared/ui/review-list'

/**
 * Everything that will be saved, except the password, which never comes back, and the inbox of
 * the test email that must arrive before anything is saved.
 */
export function SmtpReview({ draft, onChange }: SmtpStepProps): JSX.Element {
  return (
    <div className="grid gap-6">
      <ReviewList
        items={[
          { label: 'Provedor', value: providerTitle(draft) },
          { label: 'Servidor', value: `${cleanHost(draft.host)}:${parsePort(draft.port) ?? ''}` },
          { label: 'Segurança', value: SECURITY_LABELS[draft.security] },
          { label: 'Usuário', value: draft.username.trim() },
          { label: 'Senha', value: 'Guardada cifrada' },
          { label: 'Remetente', value: formatSender(draft.senderName, draft.senderEmail) },
        ]}
      />
      <FormField
        label="Enviar email de teste para"
        type="email"
        required
        autoComplete="email"
        hint="Só salvamos se o seu servidor aceitar este email."
        value={draft.testRecipient}
        onChange={(event) => onChange({ ...draft, testRecipient: event.target.value })}
      />
    </div>
  )
}

function providerTitle(draft: SmtpDraft): string {
  if (draft.provider === null) {
    return SMTP_PRESETS.other.title
  }

  return SMTP_PRESETS[draft.provider].title
}
