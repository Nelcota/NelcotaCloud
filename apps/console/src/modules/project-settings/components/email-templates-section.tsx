import type { JSX } from 'react'
import { useState } from 'react'

import type { EmailKind } from '@/modules/project-settings/api/save-email-template'
import { EmailTemplateEditor } from '@/modules/project-settings/components/email-template-editor'
import { useEmailTemplatesQuery } from '@/modules/project-settings/queries/use-email-templates'
import { useSettingsQuery } from '@/modules/project-settings/queries/use-project-settings'
import { LoadError } from '@/shared/ui/load-error'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/primitives/tabs'
import { Section } from '@/shared/ui/section'

type EmailChoice = { value: EmailKind; label: string }

const EMAIL_CHOICES: readonly EmailChoice[] = [
  { value: 'verification', label: 'Verificação' },
  { value: 'password_reset', label: 'Redefinição de senha' },
  { value: 'magic_link', label: 'Link mágico' },
]

/** Stands in for the project name in the preview until the settings load. */
const APP_NAME_FALLBACK = 'Seu app'

/** The wording of the auth emails, one email per tab, each with a live preview. */
export function EmailTemplatesSection({ projectId }: { projectId: string }): JSX.Element {
  const templates = useEmailTemplatesQuery(projectId)
  const settings = useSettingsQuery(projectId)
  const [kind, setKind] = useState<EmailKind>('verification')
  const appName = settings.data?.name ?? APP_NAME_FALLBACK

  function select(value: string): void {
    const choice = EMAIL_CHOICES.find((candidate) => candidate.value === value)

    if (choice === undefined) {
      return
    }

    setKind(choice.value)
  }

  return (
    <Section
      title="Textos dos emails"
      description="O layout e o link são da plataforma; {app_name} vira o nome do projeto."
    >
      <LoadError error={templates.error} onRetry={() => templates.refetch()} />
      <Tabs value={kind} onValueChange={select} className="gap-4">
        <TabsList variant="line" aria-label="Modelo de email" className="w-full">
          {EMAIL_CHOICES.map((choice) => (
            <TabsTrigger key={choice.value} value={choice.value}>
              {choice.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {EMAIL_CHOICES.map((choice) => (
          <TabsContent key={choice.value} value={choice.value}>
            <EmailTemplateEditor
              projectId={projectId}
              title={choice.label}
              appName={appName}
              template={templates.data?.find((candidate) => candidate.kind === choice.value)}
              state={{
                isPending: templates.isPending,
                hasFailed: templates.isError,
                onRetry: () => templates.refetch(),
              }}
            />
          </TabsContent>
        ))}
      </Tabs>
    </Section>
  )
}
