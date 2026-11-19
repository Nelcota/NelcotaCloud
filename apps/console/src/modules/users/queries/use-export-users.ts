import { type UseMutationResult, useMutation } from '@tanstack/react-query'

import { type UserExportQuery, exportUsers } from '@/modules/users/api/export-users'
import { showFlash } from '@/shared/lib/flash-notice'
import { saveFile } from '@/shared/lib/save-file'

/** Downloads the users the list's filter matches as `usuarios-2026-11-19.csv`. */
export function useExportUsers(projectId: string): UseMutationResult<void, Error, UserExportQuery> {
  return useMutation({
    mutationFn: async (query) => {
      const file = await exportUsers(projectId, query)
      const fileName = `usuarios-${today()}.csv`
      saveFile(file, fileName)
      showFlash(`Arquivo ${fileName} baixado.`)
    },
  })
}

/** The local date, as the file name a person expects when they export today. */
function today(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${now.getFullYear()}-${month}-${day}`
}
