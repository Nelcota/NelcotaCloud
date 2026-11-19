import type { FormEvent, JSX } from 'react'
import { useRef } from 'react'

import { useUploadFile } from '@/modules/storage/queries/use-upload-file'
import { Button } from '@/shared/ui/button'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { FormField } from '@/shared/ui/form-field'

type UploadFileFormProps = { projectId: string; bucketId: string; onUploaded: () => void }

function submitLabel(isRetry: boolean): string {
  if (isRetry) {
    return 'Retomar envio'
  }

  return 'Enviar arquivo'
}

export function UploadFileForm({
  projectId,
  bucketId,
  onUploaded,
}: UploadFileFormProps): JSX.Element {
  const form = useRef<HTMLFormElement>(null)
  const upload = useUploadFile(projectId, bucketId, form)

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const fileInput = event.currentTarget.elements.namedItem('file')
    const file = fileInput instanceof HTMLInputElement && fileInput.files?.item(0)

    if (file instanceof File) {
      upload.start(file, onUploaded)
    }
  }

  return (
    <form
      ref={form}
      aria-label="Enviar arquivo"
      method="post"
      onSubmit={submit}
      className="grid gap-3"
    >
      <div className="flex flex-wrap items-start gap-2">
        <FormField
          type="file"
          name="file"
          label="Arquivo"
          hint="Até 25 MiB por arquivo."
          disabled={upload.isPending || upload.isRetry}
          required
        />
        <Button
          type="submit"
          disabled={upload.isPending}
          aria-busy={upload.isPending}
          className="sm:mt-5"
        >
          {submitLabel(upload.isRetry)}
        </Button>
        {upload.isRetry && (
          <ConfirmButton
            title="Descartar envio?"
            description="Esta tentativa e o arquivo associado serão excluídos."
            confirmLabel="Descartar envio"
            isDestructive
            isDisabled={upload.isPending}
            onConfirm={upload.discard}
          >
            Descartar tentativa
          </ConfirmButton>
        )}
      </div>
      <ErrorAlert error={upload.error} />
      <p role="status" className="text-muted-foreground empty:sr-only text-sm">
        {upload.status}
      </p>
    </form>
  )
}
