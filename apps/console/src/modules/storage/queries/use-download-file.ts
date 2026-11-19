import { useMutation } from '@tanstack/react-query'
import type { UseMutationResult } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import { downloadFile } from '@/modules/storage/api/storage-files'
import { downloadForSession } from '@/modules/storage/queries/download-for-session'
import { nelcota } from '@/shared/auth/nelcota'

export function useDownloadFile(projectId: string): UseMutationResult<void, Error, string> {
  const activeDownload = useRef<AbortController | null>(null)
  useEffect(() => () => activeDownload.current?.abort(), [])

  return useMutation({
    mutationFn: async (objectId) => {
      activeDownload.current?.abort()
      const controller = new AbortController()
      activeDownload.current = controller
      await downloadForSession(nelcota.auth, controller, {
        request: (signal) => downloadFile(projectId, objectId, signal),
        navigate: (url) => window.location.assign(url),
      })
    },
  })
}
