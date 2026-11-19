import type { JSX } from 'react'

import {
  cleanHost,
  parsePort,
  type SmtpDraft,
} from '@/modules/project-settings/smtp/model/smtp-draft'
import { SMTP_PRESETS } from '@/modules/project-settings/smtp/model/smtp-presets'
import { SECURITY_LABELS } from '@/modules/project-settings/smtp/model/smtp-security'
import { formatSender } from '@/modules/project-settings/smtp/model/smtp-sender'
import { ReviewList } from '@/shared/ui/review-list'

/** Everything that will be saved, except the password, which never comes back. */
export function SmtpReview({ draft }: { draft: SmtpDraft }): JSX.Element {
  return (
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
  )
}

function providerTitle(draft: SmtpDraft): string {
  if (draft.provider === null) {
    return SMTP_PRESETS.other.title
  }

  return SMTP_PRESETS[draft.provider].title
}
