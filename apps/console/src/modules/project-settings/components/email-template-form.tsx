import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { EmailPreview } from '@/modules/project-settings/components/email-preview'
import { ResetTemplateButton } from '@/modules/project-settings/components/reset-template-button'
import {
  useResetEmailTemplateMutation,
  useSaveEmailTemplateMutation,
} from '@/modules/project-settings/queries/use-email-templates'
import type { components } from '@/shared/api/api-schema'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { PendingButton } from '@/shared/ui/pending-button'
import { SavedNote } from '@/shared/ui/saved-note'
import { SettingsSection } from '@/shared/ui/settings-section'
import { TextAreaField, TextField } from '@/shared/ui/text-field'

type Schemas = components['schemas']
type EmailTemplateView = Schemas['EmailTemplateView']
type EmailTemplateText = Schemas['EmailTemplateText']

const MESSAGE_MAX_LENGTH = 1000
const NOTE_MAX_LENGTH = 500

type EmailTemplateFormProps = {
  projectId: string
  template: EmailTemplateView
  labels: { title: string; appName: string }
}

/** Mounted with the saved wording of one email, so its fields start from it. */
export function EmailTemplateForm({
  projectId,
  template,
  labels,
}: EmailTemplateFormProps): JSX.Element {
  const save = useSaveEmailTemplateMutation(projectId)
  const reset = useResetEmailTemplateMutation(projectId)
  const [text, setText] = useState<EmailTemplateText>(template.text)

  function bind(field: keyof EmailTemplateText): {
    value: string
    onChange: (event: { target: { value: string } }) => void
  } {
    return {
      value: text[field],
      onChange: (event) => setText((current) => ({ ...current, [field]: event.target.value })),
    }
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    save.mutate({ kind: template.kind, text })
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <SettingsSection
        title="Texto"
        description="Sem links nem domínios: só o botão leva ao seu site."
        onSubmit={submit}
        footer={
          <>
            <SavedNote isSaved={save.isSuccess} message="Texto salvo" />
            <ResetTemplateButton
              isCustomized={template.is_customized}
              isPending={reset.isPending}
              onReset={() => reset.mutateAsync(template.kind).then(() => undefined)}
            />
            <PendingButton type="submit" variant="outline" size="sm" isPending={save.isPending}>
              Salvar texto
            </PendingButton>
          </>
        }
      >
        <TextField label="Assunto" required {...bind('subject')} />
        <TextField label="Título" required {...bind('heading')} />
        <TextAreaField
          label="Mensagem"
          required
          maxLength={MESSAGE_MAX_LENGTH}
          rows={4}
          {...bind('message')}
        />
        <TextField label="Texto do botão" required {...bind('action_label')} />
        <TextAreaField
          label="Nota"
          isOptional
          hint="Aparece menor, abaixo do botão."
          maxLength={NOTE_MAX_LENGTH}
          rows={2}
          {...bind('note')}
        />
        <ErrorAlert error={save.error ?? reset.error} />
      </SettingsSection>
      <EmailPreview text={text} appName={labels.appName} kindLabel={labels.title} />
    </div>
  )
}
