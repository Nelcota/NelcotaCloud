import { Check } from 'lucide-react'
import type { JSX, ReactNode } from 'react'

import {
  cleanHost,
  parsePort,
  type SmtpDraft,
} from '@/modules/project-settings/components/smtp-draft'
import { SMTP_PRESETS } from '@/modules/project-settings/components/smtp-presets'
import { SECURITY_LABELS } from '@/modules/project-settings/components/smtp-security'
import { formatSender } from '@/modules/project-settings/components/smtp-sender'

/** Everything that will be saved, as a checked list; the password never comes back. */
export function SmtpReview({ draft }: { draft: SmtpDraft }): JSX.Element {
  const server = `${cleanHost(draft.host)}:${parsePort(draft.port) ?? ''}`

  return (
    <dl className="grid divide-y divide-border/60 rounded-xl bg-surface px-3">
      <CheckedItem label="Provedor">{providerTitle(draft)}</CheckedItem>
      <CheckedItem label="Servidor">
        <code className="font-mono">{server}</code>
      </CheckedItem>
      <CheckedItem label="Segurança">{SECURITY_LABELS[draft.security]}</CheckedItem>
      <CheckedItem label="Usuário">
        <code className="font-mono">{draft.username.trim()}</code>
      </CheckedItem>
      <CheckedItem label="Senha">Guardada cifrada</CheckedItem>
      <CheckedItem label="Remetente">
        <code className="font-mono">{formatSender(draft.senderName, draft.senderEmail)}</code>
      </CheckedItem>
    </dl>
  )
}

function CheckedItem({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div className="grid min-w-0 grid-cols-[1rem_minmax(0,1fr)] items-start gap-x-2.5 gap-y-0.5 py-2.5 text-xs sm:grid-cols-[1rem_7rem_minmax(0,1fr)]">
      <Check aria-hidden className="mt-px size-4 text-success" />
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-start-2 min-w-0 wrap-anywhere sm:col-start-3">{children}</dd>
    </div>
  )
}

function providerTitle(draft: SmtpDraft): string {
  if (draft.provider === null) {
    return SMTP_PRESETS.other.title
  }

  return SMTP_PRESETS[draft.provider].title
}
