import type { ReactNode } from 'react'

import {
  cleanHost,
  isRegionValid,
  parsePort,
  type SmtpDraft,
  type SmtpStepProps,
} from '@/modules/project-settings/components/smtp-draft'
import { SmtpLoginStep } from '@/modules/project-settings/components/smtp-login-step'
import { SmtpProviderStep } from '@/modules/project-settings/components/smtp-provider-step'
import { SmtpReview } from '@/modules/project-settings/components/smtp-review'
import { SmtpSenderStep } from '@/modules/project-settings/components/smtp-sender-step'
import { SmtpServerStep } from '@/modules/project-settings/components/smtp-server-step'
import type { DialogStep } from '@/shared/ui/step-dialog/step-dialog'
import { missingUnless } from '@/shared/ui/step-dialog/missing-unless'

/**
 * The SMTP steps. The server step only appears for "Outro": every other provider already fills
 * in the server, port and security, so asking to confirm them would be a step that asks nothing.
 */
export function smtpSteps(step: SmtpStepProps, illustration: ReactNode): DialogStep[] {
  const draft = step.draft
  const providerStep: DialogStep = {
    label: 'Provedor',
    description: 'Escolha quem envia os seus emails. Preenchemos o servidor para você.',
    missing: missingUnless(isProviderComplete(draft), providerMissing(draft)),
    illustration,
    content: <SmtpProviderStep {...step} />,
  }
  const serverStep: DialogStep = {
    label: 'Servidor',
    description: 'O endereço do servidor e o tipo de conexão que ele usa.',
    missing: missingUnless(isServerComplete(draft), 'Preencha o servidor e a porta'),
    content: <SmtpServerStep {...step} />,
  }
  const remainingSteps: DialogStep[] = [
    {
      label: 'Login',
      description: 'O usuário e a senha que o seu provedor de email deu.',
      missing: missingUnless(isLoginComplete(draft), 'Preencha o usuário e a senha'),
      content: <SmtpLoginStep {...step} />,
    },
    {
      label: 'Remetente',
      description: 'O nome e o email que aparecem na caixa de entrada.',
      missing: missingUnless(draft.senderEmail.trim().includes('@'), 'Digite o email do remetente'),
      content: <SmtpSenderStep {...step} />,
    },
    {
      label: 'Revisar',
      description: 'Confira antes de salvar.',
      missing: null,
      content: <SmtpReview draft={draft} />,
    },
  ]

  if (draft.provider === 'other') {
    return [providerStep, serverStep, ...remainingSteps]
  }

  return [providerStep, ...remainingSteps]
}

function isProviderComplete(draft: SmtpDraft): boolean {
  if (draft.provider === 'ses') {
    return isRegionValid(draft.region)
  }

  return draft.provider !== null
}

function providerMissing(draft: SmtpDraft): string {
  if (draft.provider === 'ses') {
    return 'Digite a região da AWS'
  }

  return 'Escolha um provedor'
}

function isServerComplete(draft: SmtpDraft): boolean {
  return cleanHost(draft.host) !== '' && parsePort(draft.port) !== null
}

function isLoginComplete(draft: SmtpDraft): boolean {
  return draft.username.trim() !== '' && draft.password !== ''
}
