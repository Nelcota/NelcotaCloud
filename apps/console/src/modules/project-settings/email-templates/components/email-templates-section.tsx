import Letter from '~icons/solar/letter-linear'
import LockPassword from '~icons/solar/lock-password-linear'
import MagicStick from '~icons/solar/magic-stick-3-linear'
import type { JSX } from 'react'
import { useState } from 'react'

import type { EmailKind } from '@/modules/project-settings/email-templates/api/save-email-template'
import { EmailTemplateForm } from '@/modules/project-settings/email-templates/components/email-template-form'
import { useEmailTemplatesQuery } from '@/modules/project-settings/email-templates/queries/use-email-templates'
import type { components } from '@/shared/api/api-schema'
import { type Choice, ChoiceCards } from '@/shared/ui/choice-cards'
import { LoadError } from '@/shared/ui/load-error'
import { SettingsSection } from '@/shared/ui/settings-section'
import { Skeleton } from '@/shared/ui/skeleton'

const EMAIL_CHOICES: Choice<EmailKind>[] = [
  {
    value: 'verification',
    icon: Letter,
    title: 'Confirmação de email',
    description: 'Enviado no cadastro.',
  },
  {
    value: 'password_reset',
    icon: LockPassword,
    title: 'Redefinição de senha',
    description: 'Enviado quando alguém esquece a senha.',
  },
  {
    value: 'magic_link',
    icon: MagicStick,
    title: 'Magic link',
    description: 'Enviado no login sem senha.',
  },
]

/** The wording of the auth emails, one email at a time. */
export function EmailTemplatesSection({ projectId }: { projectId: string }): JSX.Element {
  const templates = useEmailTemplatesQuery(projectId)
  const [kind, setKind] = useState<EmailKind>('verification')
  const template = templates.data?.find((candidate) => candidate.kind === kind)

  return (
    <SettingsSection
      title="Textos dos emails"
      description="Texto simples; {app_name} vira o nome do projeto. O botão sempre abre o link do seu site."
    >
      <ChoiceCards legend="Email" choices={EMAIL_CHOICES} selected={kind} onSelect={setKind} />
      <LoadError error={templates.error} onRetry={() => templates.refetch()} />
      <TemplateEditor projectId={projectId} template={template} hasFailed={templates.isError} />
    </SettingsSection>
  )
}

type TemplateEditorProps = {
  projectId: string
  template: components['schemas']['EmailTemplateView'] | undefined
  hasFailed: boolean
}

function TemplateEditor({
  projectId,
  template,
  hasFailed,
}: TemplateEditorProps): JSX.Element | null {
  if (hasFailed) {
    return null
  }

  if (template === undefined) {
    return <Skeleton className="h-96 rounded-lg" />
  }

  const version = `${template.kind}-${JSON.stringify(template.text)}`

  return <EmailTemplateForm key={version} projectId={projectId} template={template} />
}
