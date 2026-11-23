import type { JSX } from 'react'
import { useState } from 'react'

import {
  cleanHost,
  EMPTY_SMTP_DRAFT,
  parsePort,
  type SmtpDraft,
  smtpBodyOf,
} from '@/modules/project-settings/smtp/model/smtp-draft'
import { SmtpOwnServerIllustration } from '@/modules/project-settings/smtp/components/smtp-illustrations'
import { SMTP_PRESETS } from '@/modules/project-settings/smtp/model/smtp-presets'
import { formatSender } from '@/modules/project-settings/smtp/model/smtp-sender'
import { smtpSteps } from '@/modules/project-settings/smtp/components/smtp-steps'
import { useSaveSmtpMutation } from '@/modules/project-settings/smtp/queries/use-smtp-settings'
import { useSmtpTestMutation } from '@/modules/project-settings/smtp/queries/use-smtp-test'
import { useSession } from '@/shared/auth/use-session'
import { Button } from '@/shared/ui/button'
import type { ReviewItem } from '@/shared/ui/review-list'
import { StepDialog } from '@/shared/ui/step-dialog/step-dialog'

type SmtpSetupDialogProps = {
  projectId: string
  /** "Usar meu servidor SMTP" the first time, "Trocar servidor" after. */
  triggerLabel: string
  triggerVariant: 'default' | 'outline'
}

/**
 * Sets up the project's own SMTP server step by step; the URL the API takes is built here. A
 * test email goes out through the new server first: auth emails are sent in the background, so
 * a wrong password saved here would fail every signup without anyone seeing an error.
 */
export function SmtpSetupDialog(props: SmtpSetupDialogProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState<SmtpDraft>(EMPTY_SMTP_DRAFT)
  const save = useSaveSmtpMutation(props.projectId)
  const test = useSmtpTestMutation(props.projectId)
  const accountEmail = useSession()?.user.email ?? ''
  const step = { draft, onChange: setDraft }
  const illustration = <SmtpOwnServerIllustration />

  function open(): void {
    setDraft({ ...EMPTY_SMTP_DRAFT, testRecipient: accountEmail })
    setIsOpen(true)
  }

  async function finish(): Promise<void> {
    const body = smtpBodyOf(draft)

    if (body === null) {
      throw new Error('A porta do servidor é inválida.')
    }

    await test.mutateAsync({ to: draft.testRecipient.trim(), server: body })
    await save.mutateAsync(body)
  }

  return (
    <>
      <Button variant={props.triggerVariant} size="sm" onClick={open}>
        {props.triggerLabel}
      </Button>
      <StepDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title="Usar meu servidor SMTP"
        description="Os emails de autenticação passam a sair pelo seu servidor, com o seu domínio."
        finishLabel="Testar e salvar"
        onFinish={finish}
        workingLabel="Testando o servidor…"
        summary={smtpSummary(draft)}
        steps={smtpSteps(step, illustration)}
      />
    </>
  )
}

/** What the right-hand panel shows as the steps fill in; never the password. */
function smtpSummary(draft: SmtpDraft): ReviewItem[] {
  const host = cleanHost(draft.host)
  const port = parsePort(draft.port)

  return [
    { label: 'Provedor', value: providerName(draft) },
    { label: 'Servidor', value: serverText(host, port) },
    { label: 'Usuário', value: draft.username.trim() },
    { label: 'Remetente', value: formatSender(draft.senderName, draft.senderEmail) },
  ]
}

function providerName(draft: SmtpDraft): string {
  if (draft.provider === null) {
    return ''
  }

  return SMTP_PRESETS[draft.provider].title
}

function serverText(host: string, port: number | null): string {
  if (host === '' || port === null) {
    return ''
  }

  return `${host}:${port}`
}
