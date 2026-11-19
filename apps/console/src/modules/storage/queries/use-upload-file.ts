import { putStorageObject } from '@nelcota/sdk'
import { useMutation } from '@tanstack/react-query'
import type { RefObject } from 'react'
import { useEffect, useRef, useState } from 'react'

import { completeUpload, createUpload, deleteFile } from '@/modules/storage/api/storage-files'
import { runUploadAttempt } from '@/modules/storage/queries/upload-attempt'
import type { UploadAttempt } from '@/modules/storage/queries/upload-attempt'
import { nelcota } from '@/shared/auth/nelcota'

type UploadSubmission = { file: File; controller: AbortController }
type UploadFile = {
  isPending: boolean
  isRetry: boolean
  status: string
  error: Error | null
  start: (file: File, onUploaded: () => void) => void
  discard: () => Promise<void>
}

export function useUploadFile(
  projectId: string,
  bucketId: string,
  form: RefObject<HTMLFormElement | null>,
): UploadFile {
  const attempt = useRef<UploadAttempt | null>(null)
  const activeUpload = useRef<AbortController | null>(null)
  const [isRetry, setIsRetry] = useState(false)
  const [status, setStatus] = useState('')
  const upload = useMutation({
    gcTime: 0,
    networkMode: 'always',
    mutationFn: ({ file, controller }: UploadSubmission) => {
      const { signal } = controller

      return runUploadAttempt(
        attempt,
        {
          reserve: () => createUpload(projectId, bucketId, { file, signal }),
          send: (signed) =>
            putStorageObject(signed, file, (url, options) => fetch(url, { ...options, signal })),
          confirm: (objectId) => completeUpload(projectId, objectId, signal),
        },
        signal,
      )
    },
    onSettled: (_result, _error, { controller }) => {
      if (activeUpload.current === controller) {
        activeUpload.current = null
      }
    },
  })

  const resetUpload = upload.reset
  useEffect(() => {
    const unsubscribe = nelcota.auth.onAuthStateChange((event) => {
      if (event !== 'SIGNED_OUT' && event !== 'SIGNED_IN') {
        return
      }

      activeUpload.current?.abort()
      activeUpload.current = null
      attempt.current = null
      form.current?.reset()
      setIsRetry(false)
      setStatus('')
      resetUpload()
    })

    return () => {
      unsubscribe()
      activeUpload.current?.abort()
      attempt.current = null
    }
  }, [form, resetUpload])

  function start(file: File, onUploaded: () => void): void {
    if (activeUpload.current !== null || nelcota.auth.getSession() === null) {
      return
    }

    const controller = new AbortController()
    activeUpload.current = controller
    setStatus('Enviando arquivo…')
    upload.mutate(
      { file, controller },
      {
        onSuccess: () => {
          attempt.current = null
          setIsRetry(false)
          form.current?.reset()
          setStatus('Arquivo enviado.')
          resetUpload()
          onUploaded()
        },
        onError: () => {
          setIsRetry(attempt.current !== null)
          setStatus('')
        },
      },
    )
  }

  async function discard(): Promise<void> {
    const current = attempt.current

    if (current !== null) {
      await deleteFile(projectId, current.signed.object_id)
    }

    if (attempt.current !== current) {
      return
    }

    attempt.current = null
    setIsRetry(false)
    resetUpload()
  }

  return { isPending: upload.isPending, isRetry, status, error: upload.error, start, discard }
}
