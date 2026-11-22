import type { JSX } from 'react'

import {
  cleanHost,
  parsePort,
  type SmtpDraft,
} from '@/modules/project-settings/components/smtp-draft'
import { SMTP_PRESETS } from '@/modules/project-settings/components/smtp-presets'
import { SECURITY_LABELS } from '@/modules/project-settings/components/smtp-security'
import { formatSender } from '@/modules/project-settings/components/smtp-sender'
import { DataList, DataListItem } from '@/shared/ui/data-list'

/** Everything that will be saved, except the password, which never comes back. */
export function SmtpReview({ draft }: { draft: SmtpDraft }): JSX.Element {
  const server = `${cleanHost(draft.host)}:${parsePort(draft.port) ?? ''}`

  return (
    <DataList className="rounded-xl border bg-card px-4">
      <DataListItem label="Provedor">{providerTitle(draft)}</DataListItem>
      <DataListItem label="Servidor">
        <code className="font-mono text-sm">{server}</code>
      </DataListItem>
      <DataListItem label="Segurança">{SECURITY_LABELS[draft.security]}</DataListItem>
      <DataListItem label="Usuário">{draft.username.trim()}</DataListItem>
      <DataListItem label="Senha">Guardada cifrada</DataListItem>
      <DataListItem label="Remetente">
        {formatSender(draft.senderName, draft.senderEmail)}
      </DataListItem>
    </DataList>
  )
}

function providerTitle(draft: SmtpDraft): string {
  if (draft.provider === null) {
    return SMTP_PRESETS.other.title
  }

  return SMTP_PRESETS[draft.provider].title
}
