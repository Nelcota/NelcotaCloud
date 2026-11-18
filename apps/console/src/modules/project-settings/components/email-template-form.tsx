import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import {
  useResetEmailTemplateMutation,
  useSaveEmailTemplateMutation,
} from '@/modules/project-settings/queries/use-email-templates'
import type { components } from '@/shared/api/api-schema'
import { Button } from '@/shared/ui/button'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { FormField } from '@/shared/ui/form-field'
import { SavedNote } from '@/shared/ui/saved-note'
import { TextAreaField } from '@/shared/ui/text-area-field'

type Schemas = components['schemas']
type EmailTemplateView = Schemas['EmailTemplateView']
type EmailTemplateText = Schemas['EmailTemplateText']

type EmailTemplateFormProps = { projectId: string; template: EmailTemplateView }

/** Mounted with the saved wording of one email, so its fields start from it. */
export function EmailTemplateForm({ projectId, template }: EmailTemplateFormProps): JSX.Element {
  const save = useSaveEmailTemplateMutation(projectId)
  const reset = useResetEmailTemplateMutation(projectId)
  const [text, setText] = useState<EmailTemplateText>(template.text)

  function change(field: keyof EmailTemplateText): (value: string) => void {
    return (value) => setText((current) => ({ ...current, [field]: value }))
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    save.mutate({ kind: template.kind, text })
  }

  return (
    <form onSubmit={submit} className="grid gap-4 border-t pt-4">
      <FormField
        label="Assunto"
        required
        maxLength={150}
        value={text.subject}
        onChange={(event) => change('subject')(event.target.value)}
      />
      <FormField
        label="Título"
        required
        maxLength={150}
        value={text.heading}
        onChange={(event) => change('heading')(event.target.value)}
      />
      <TextAreaField
        label="Mensagem"
        required
        maxLength={1000}
        rows={4}
        value={text.message}
        onChange={(event) => change('message')(event.target.value)}
      />
      <FormField
        label="Texto do botão"
        required
        maxLength={50}
        value={text.action_label}
        onChange={(event) => change('action_label')(event.target.value)}
      />
      <TextAreaField
        label="Nota"
        hint="Aparece menor, abaixo do botão."
        maxLength={500}
        value={text.note}
        onChange={(event) => change('note')(event.target.value)}
      />
      <ErrorAlert error={save.error ?? reset.error} />
      <div className="flex flex-wrap items-center justify-end gap-3">
        <SavedNote isSaved={save.isSuccess} message="Texto salvo" />
        <ResetButton
          isCustomized={template.is_customized}
          isPending={reset.isPending}
          onReset={() => reset.mutateAsync(template.kind).then(() => undefined)}
        />
        <Button type="submit" disabled={save.isPending} aria-busy={save.isPending}>
          Salvar texto
        </Button>
      </div>
    </form>
  )
}

type ResetButtonProps = {
  isCustomized: boolean
  isPending: boolean
  onReset: () => Promise<void>
}

function ResetButton({ isCustomized, isPending, onReset }: ResetButtonProps): JSX.Element | null {
  if (isCustomized === false) {
    return null
  }

  return (
    <ConfirmButton
      size="default"
      title="Voltar ao texto padrão?"
      description="O texto deste email volta a ser o padrão da plataforma, em inglês. O seu se perde."
      confirmLabel="Usar texto padrão"
      isPending={isPending}
      onConfirm={onReset}
    >
      Usar texto padrão
    </ConfirmButton>
  )
}
