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
import { Button } from '@/shared/ui/primitives/button'
import { StepDialog } from '@/shared/ui/step-dialog/step-dialog'

type SmtpSetupDialogProps = {
  projectId: string
  triggerLabel: string
  triggerVariant: 'default' | 'outline'
}

/** Sets up the project's own SMTP server step by step; the URL the API takes is built here. */
export function SmtpSetupDialog(props: SmtpSetupDialogProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState<SmtpDraft>(EMPTY_SMTP_DRAFT)
  const save = useSaveSmtpMutation(props.projectId)

  function open(): void {
    setDraft(EMPTY_SMTP_DRAFT)
    setIsOpen(true)
  }

  async function finish(): Promise<void> {
    const body = smtpBodyOf(draft)

    if (body === null) {
      throw new Error('A porta do servidor é inválida.')
    }

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
        finishLabel="Salvar servidor"
        onFinish={finish}
        steps={smtpSteps({ draft, onChange: setDraft })}
      />
    </>
  )
}
