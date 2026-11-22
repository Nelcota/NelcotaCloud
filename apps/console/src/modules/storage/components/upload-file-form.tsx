import { NelcotaError } from '@nelcota/sdk'
import type { UseMutationResult } from '@tanstack/react-query'
import type { FormEvent, JSX } from 'react'
import { useRef, useState } from 'react'

import type { StorageObject } from '@/modules/storage/api/storage-types'
import type { UploadFileAttempt } from '@/modules/storage/api/upload-file'
import { MAX_FILE_BYTES } from '@/modules/storage/components/storage-limits'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { FileInput } from '@/shared/ui/file-input'
import { PendingButton } from '@/shared/ui/pending-button'
import { Button } from '@/shared/ui/primitives/button'
import { DialogFooter } from '@/shared/ui/primitives/dialog'

type UploadFileFormProps = {
  upload: UseMutationResult<StorageObject, Error, UploadFileAttempt>
  onUploaded: (fileName: string) => void
  onCancel: () => void
}

export function UploadFileForm({ upload, onUploaded, onCancel }: UploadFileFormProps): JSX.Element {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState('')
  // A retry of the same file reuses its request id, so the server never stores it twice.
  const attempt = useRef<string | undefined>(undefined)

  function pick(picked: File | null): void {
    attempt.current = undefined
    upload.reset()
    setFile(picked)
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    if (file === null || file.size > MAX_FILE_BYTES) {
      return
    }

    const requestId = (attempt.current ??= globalThis.crypto.randomUUID())
    setStatus('Enviando arquivo…')
    upload.mutate(
      { file, requestId },
      {
        onSuccess: () => {
          attempt.current = undefined
          setStatus('')
          onUploaded(file.name)
        },
        onError: (error) => {
          if (error instanceof NelcotaError && error.code === 'storage_upload_expired') {
            attempt.current = undefined
          }

          setStatus('')
        },
      },
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <FileInput
        label="Arquivo"
        description="Até 25 MiB por arquivo."
        maxSize={MAX_FILE_BYTES}
        isRequired
        isDisabled={upload.isPending}
        value={file}
        onChange={pick}
      />
      <ErrorAlert error={upload.error} />
      <p role="status" className="text-xs text-muted-foreground">
        {status}
      </p>
      <DialogFooter>
        <Button type="button" variant="outline" disabled={upload.isPending} onClick={onCancel}>
          Cancelar
        </Button>
        <PendingButton type="submit" isPending={upload.isPending} disabled={file === null}>
          Enviar
        </PendingButton>
      </DialogFooter>
    </form>
  )
}
