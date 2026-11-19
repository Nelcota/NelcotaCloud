import { putStorageObject } from '@nelcota/sdk'
import type { StorageUpload } from '@nelcota/sdk'
import { useMutation } from '@tanstack/react-query'
import type { FormEvent, JSX } from 'react'
import { useRef, useState } from 'react'

import { completeUpload, createUpload, deleteFile } from '@/modules/storage/api/storage-files'
import { Button } from '@/shared/ui/button'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { FormField } from '@/shared/ui/form-field'

type UploadFileFormProps = { projectId: string; bucketId: string; onUploaded: () => void }
type UploadAttempt = { signed: StorageUpload; uploaded: boolean }

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
  const attempt = useRef<UploadAttempt | null>(null)
  const [isRetry, setIsRetry] = useState(false)
  const [status, setStatus] = useState('')
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const signed = attempt.current?.signed ?? (await createUpload(projectId, bucketId, file))
      const progress = attempt.current ?? { signed, uploaded: false }
      attempt.current = progress

      if (progress.uploaded === false && Date.now() < Date.parse(signed.expires_at)) {
        await putStorageObject(signed, file)
        progress.uploaded = true
      }

      await completeUpload(projectId, signed.object_id)
    },
  })

  async function discard(): Promise<void> {
    const current = attempt.current

    if (current !== null) {
      await deleteFile(projectId, current.signed.object_id)
    }

    attempt.current = null
    setIsRetry(false)
    upload.reset()
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const form = event.currentTarget
    const fileInput = form.elements.namedItem('file')
    const file = fileInput instanceof HTMLInputElement && fileInput.files?.item(0)

    if (file instanceof File) {
      setStatus('Enviando arquivo…')
      upload.mutate(file, {
        onSuccess: () => {
          attempt.current = null
          setIsRetry(false)
          form.reset()
          setStatus('Arquivo enviado.')
          onUploaded()
        },
        onError: () => {
          setIsRetry(attempt.current !== null)
          setStatus('')
        },
      })
    }
  }

  return (
    <form aria-label="Enviar arquivo" method="post" onSubmit={submit} className="grid gap-3">
      <div className="flex flex-wrap items-start gap-2">
        <FormField
          type="file"
          name="file"
          label="Arquivo"
          hint="Até 25 MiB por arquivo."
          disabled={upload.isPending || isRetry}
          required
        />
        <Button
          type="submit"
          disabled={upload.isPending}
          aria-busy={upload.isPending}
          className="sm:mt-5"
        >
          {submitLabel(isRetry)}
        </Button>
        {isRetry && (
          <ConfirmButton
            title="Descartar envio?"
            description="Esta tentativa e o arquivo associado serão excluídos."
            confirmLabel="Descartar envio"
            isDestructive
            isDisabled={upload.isPending}
            onConfirm={discard}
          >
            Descartar tentativa
          </ConfirmButton>
        )}
      </div>
      <ErrorAlert error={upload.error} />
      <p role="status" className="text-muted-foreground empty:sr-only text-sm">
        {status}
      </p>
    </form>
  )
}
