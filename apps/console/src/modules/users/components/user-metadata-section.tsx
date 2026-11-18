import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { useUpdateMetadataMutation } from '@/modules/users/queries/use-update-metadata-mutation'
import type { components } from '@/shared/api/api-schema'
import { type JsonObject, formatJsonObject, parseJsonObject } from '@/shared/lib/json-object'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { JsonField } from '@/shared/ui/json-field'
import { SavedNote } from '@/shared/ui/saved-note'
import { SettingsSection } from '@/shared/ui/settings-section'

type User = components['schemas']['User']

type UserMetadataSectionProps = { projectId: string; user: User }

/**
 * Both JSON documents of a user. Mounted with the loaded user; saving sends only the documents
 * edited here, so a change the user made meanwhile (through the SDK) is not overwritten.
 */
export function UserMetadataSection({ projectId, user }: UserMetadataSectionProps): JSX.Element {
  const update = useUpdateMetadataMutation(projectId)
  const [loadedAppText] = useState(formatJsonObject(user.app_metadata))
  const [loadedUserText] = useState(formatJsonObject(user.user_metadata))
  const [appText, setAppText] = useState(loadedAppText)
  const [userText, setUserText] = useState(loadedUserText)
  const [isChecked, setIsChecked] = useState(false)
  const appMetadata = parseJsonObject(appText)
  const userMetadata = parseJsonObject(userText)

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    setIsChecked(true)

    if (appMetadata.object === null || userMetadata.object === null) {
      return
    }

    const body = {
      app_metadata: editedDocument(appText, loadedAppText, appMetadata.object),
      user_metadata: editedDocument(userText, loadedUserText, userMetadata.object),
    }
    update.mutate({ userId: user.id, body })
  }

  return (
    <form onSubmit={submit} noValidate>
      <SettingsSection
        title="Metadados"
        footer={
          <>
            <SavedNote isSaved={update.isSuccess} message="Metadados salvos" />
            <Button type="submit" disabled={update.isPending} aria-busy={update.isPending}>
              Salvar metadados
            </Button>
          </>
        }
      >
        <JsonField
          label="app_metadata"
          hint="Só administradores alteram. Vai no token de acesso a partir da próxima renovação."
          value={appText}
          error={shownError(isChecked, appMetadata.error)}
          onChange={setAppText}
        />
        <JsonField
          label="user_metadata"
          hint="O próprio usuário também altera, pelo SDK."
          value={userText}
          error={shownError(isChecked, userMetadata.error)}
          onChange={setUserText}
        />
        <ErrorAlert error={update.error} />
      </SettingsSection>
    </form>
  )
}

/** The document when its text was edited; left out of the request (kept as is) otherwise. */
function editedDocument(
  text: string,
  loadedText: string,
  document: JsonObject,
): JsonObject | undefined {
  if (text === loadedText) {
    return undefined
  }

  return document
}

/** Errors wait for the first save, so typing a document does not flag it halfway. */
function shownError(isChecked: boolean, error: string | null): string | null {
  if (isChecked === false) {
    return null
  }

  return error
}
