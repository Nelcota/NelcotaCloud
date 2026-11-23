import { Undo2 } from 'lucide-react'
import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { useUpdateMetadataMutation } from '@/modules/users/queries/use-update-metadata-mutation'
import type { components } from '@/shared/api/api-schema'
import { formatJsonObject, parseJsonObject } from '@/shared/lib/json-object'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { JsonField } from '@/shared/ui/json-field'
import { PendingButton } from '@/shared/ui/pending-button'
import { Button } from '@/shared/ui/primitives/button'
import { SavedNote } from '@/shared/ui/saved-note'
import { SettingsSection } from '@/shared/ui/settings-section'

type User = components['schemas']['User']

type MetadataDocument = 'app_metadata' | 'user_metadata'
type MetadataDraft = { base: User[MetadataDocument]; text: string }

const DOCUMENTS: Record<MetadataDocument, { title: string; hint: string }> = {
  app_metadata: {
    title: 'Metadados do app',
    hint: 'Só administradores alteram. Vai no token de acesso a partir da próxima renovação.',
  },
  user_metadata: {
    title: 'Metadados do usuário',
    hint: 'O próprio usuário também altera, pelo SDK.',
  },
}

type MetadataPanelProps = { projectId: string; user: User; document: MetadataDocument }

/** One JSON document of the user, edited as text and saved alone. Mounted with the loaded user. */
export function MetadataPanel({ projectId, user, document }: MetadataPanelProps): JSX.Element {
  const update = useUpdateMetadataMutation(projectId)
  const [draft, setDraft] = useState<MetadataDraft | null>(null)
  const [isChecked, setIsChecked] = useState(false)
  const saved = user[document]
  const text = draft?.text ?? formatJsonObject(saved)
  const hasConflict = draft !== null && formatJsonObject(draft.base) !== formatJsonObject(saved)
  const parsed = parseJsonObject(text)
  const copy = DOCUMENTS[document]

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    setIsChecked(true)

    if (parsed.object === null || draft === null || hasConflict || update.isPending) {
      return
    }

    const body =
      document === 'app_metadata'
        ? { app_metadata: parsed.object, expected_app_metadata: draft.base }
        : { user_metadata: parsed.object, expected_user_metadata: draft.base }

    update.mutate(
      { userId: user.id, body },
      {
        onSuccess: (updated) =>
          setDraft((current) => {
            if (current === draft || current === null) {
              return null
            }

            return { ...current, base: updated[document] }
          }),
      },
    )
  }

  function reloadSaved(): void {
    setDraft(null)
    setIsChecked(false)
    update.reset()
  }

  const footer = (
    <>
      <SavedNote isSaved={update.isSuccess} message="Salvo" />
      {hasConflict && (
        <Button type="button" variant="outline" size="sm" onClick={reloadSaved}>
          <Undo2 aria-hidden data-icon="inline-start" />
          Descartar rascunho
        </Button>
      )}
      <PendingButton
        type="submit"
        size="sm"
        isPending={update.isPending}
        disabled={draft === null || hasConflict}
      >
        Salvar
      </PendingButton>
    </>
  )

  return (
    <SettingsSection title={copy.title} footer={footer} onSubmit={submit}>
      <JsonField
        label={document}
        hint={copy.hint}
        value={text}
        error={shownError(isChecked, parsed.error)}
        onChange={(value) => setDraft((current) => ({ base: current?.base ?? saved, text: value }))}
      />
      {hasConflict && (
        <p role="status" className="text-xs text-warning">
          Os metadados mudaram enquanto você editava. Copie seu rascunho antes de descartá-lo.
        </p>
      )}
      <ErrorAlert error={update.error} />
    </SettingsSection>
  )
}

/** Errors wait for the first save, so typing a document does not flag it halfway. */
function shownError(isChecked: boolean, error: string | null): string | null {
  if (isChecked === false) {
    return null
  }

  return error
}
