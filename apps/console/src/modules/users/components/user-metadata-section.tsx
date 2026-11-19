import type { JSX, SubmitEvent } from 'react'
import { useEffect, useState } from 'react'

import { UnsavedMetadataGuard } from '@/modules/users/components/unsaved-metadata-guard'
import { useUpdateMetadataMutation } from '@/modules/users/queries/use-update-metadata-mutation'
import type { components } from '@/shared/api/api-schema'
import { type JsonObject, formatJsonObject, parseJsonObject } from '@/shared/lib/json-object'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { JsonField } from '@/shared/ui/json-field'
import { SavedNote } from '@/shared/ui/saved-note'

type User = components['schemas']['User']

type UserMetadataSectionProps = {
  projectId: string
  user: User
  /** Tells the page whether there are unsaved edits, so its tab can say so. */
  onEditsChange: (hasEdits: boolean) => void
}

/**
 * Both JSON documents of a user. Mounted with the loaded user; saving sends only the documents
 * edited here, so a change the user made meanwhile (through the SDK) is not overwritten.
 */
export function UserMetadataSection(props: UserMetadataSectionProps): JSX.Element {
  const { projectId, user, onEditsChange } = props
  const update = useUpdateMetadataMutation(projectId)
  // What the server holds: the documents as loaded, then as last saved.
  const [savedAppText, setSavedAppText] = useState(formatJsonObject(user.app_metadata))
  const [savedUserText, setSavedUserText] = useState(formatJsonObject(user.user_metadata))
  const [appText, setAppText] = useState(savedAppText)
  const [userText, setUserText] = useState(savedUserText)
  const [isChecked, setIsChecked] = useState(false)
  const appMetadata = parseJsonObject(appText)
  const userMetadata = parseJsonObject(userText)
  const hasEdits = appText !== savedAppText || userText !== savedUserText

  useEffect(() => {
    onEditsChange(hasEdits)
  }, [hasEdits, onEditsChange])

  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault()
    setIsChecked(true)

    if (appMetadata.object === null || userMetadata.object === null) {
      return
    }

    const body = {
      app_metadata: editedDocument(appText, savedAppText, appMetadata.object),
      user_metadata: editedDocument(userText, savedUserText, userMetadata.object),
    }
    update.mutate(
      { userId: user.id, body },
      {
        onSuccess: () => {
          setSavedAppText(appText)
          setSavedUserText(userText)
        },
      },
    )
  }

  return (
    <div className="grid gap-4">
      <UnsavedMetadataGuard hasEdits={hasEdits} />
      <p className="text-muted-foreground text-sm">
        Objetos JSON da conta: até 4 KiB em app_metadata e 16 KiB em user_metadata.
      </p>
      <form onSubmit={submit} noValidate className="@container grid gap-4">
        <div className="grid gap-5 @2xl:grid-cols-2">
          <JsonField
            label="app_metadata"
            hint="Só administradores alteram. Vai no token de acesso a partir da próxima renovação."
            value={appText}
            error={shownError(isChecked, appMetadata.error)}
            onChange={setAppText}
            onBlur={() => setIsChecked(true)}
          />
          <JsonField
            label="user_metadata"
            hint="O próprio usuário também altera, pelo SDK."
            value={userText}
            error={shownError(isChecked, userMetadata.error)}
            onChange={setUserText}
            onBlur={() => setIsChecked(true)}
          />
          <div className="empty:hidden @2xl:col-span-2">
            <ErrorAlert error={update.error} />
          </div>
        </div>
        <footer className="flex flex-wrap items-center justify-end gap-3">
          <SavedNote isSaved={update.isSuccess} message="Metadados salvos" />
          <Button
            type="submit"
            variant={saveVariant(hasEdits)}
            disabled={update.isPending}
            aria-busy={update.isPending}
          >
            Salvar metadados
          </Button>
        </footer>
      </form>
    </div>
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

/** Errors wait until the field is left or saved, so typing a document does not flag it halfway. */
function shownError(isChecked: boolean, error: string | null): string | null {
  if (isChecked === false) {
    return null
  }

  return error
}

/** Mint only once there is something to save: it is the page's least frequent task. */
function saveVariant(hasEdits: boolean): 'default' | 'outline' {
  if (hasEdits) {
    return 'default'
  }

  return 'outline'
}
