import { Settings2 } from 'lucide-react'
import type { JSX } from 'react'
import { useState } from 'react'

import {
  EMPTY_SMTP_DRAFT,
  type SmtpDraft,
  smtpBodyOf,
} from '@/modules/project-settings/components/smtp-draft'
import { smtpSteps } from '@/modules/project-settings/components/smtp-steps'
import { useSaveSmtpMutation } from '@/modules/project-settings/queries/use-project-settings'
import { useSmtpTestMutation } from '@/modules/project-settings/queries/use-smtp-test'
import { useSession } from '@/shared/auth/use-session'
import { Button } from '@/shared/ui/primitives/button'
import { StepDialog } from '@/shared/ui/step-dialog/step-dialog'

type SmtpSetupDialogProps = {
  projectId: string
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
      <Button type="button" variant={props.triggerVariant} onClick={open}>
        <Settings2 aria-hidden data-icon="inline-start" />
        {props.triggerLabel}
      </Button>
      <StepDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title="Usar meu servidor SMTP"
        description="Os emails de autenticação passam a sair pelo seu servidor, com o seu domínio."
        finishLabel="Testar e salvar"
        onFinish={finish}
        steps={smtpSteps({ draft, onChange: setDraft })}
      />
    </>
  )
}
