import { type UseMutationResult, useMutation } from '@tanstack/react-query'

import { exportAuditEvents } from '@/modules/activity/api/export-audit-events'
import { periodQuery } from '@/modules/activity/model/activity-period'
import type { ActivityFilter, AuditKind } from '@/modules/activity/model/activity-search'
import { showFlash } from '@/shared/lib/flash-notice'
import { saveFile } from '@/shared/lib/save-file'

/** Downloads the events the page's filter matches as `atividade-2026-11-19.csv`. */
export function useExportActivity(
  projectId: string,
): UseMutationResult<void, Error, ActivityFilter> {
  return useMutation({
    mutationFn: async (filter) => {
      const file = await exportAuditEvents(projectId, {
        ...periodQuery(filter.period),
        kind: exportKind(filter),
        search: exportSearch(filter),
      })

      const fileName = `atividade-${today()}.csv`
      saveFile(file, fileName)
      showFlash(`Arquivo ${fileName} baixado.`)
    },
  })
}

function exportKind(filter: ActivityFilter): AuditKind | undefined {
  if (filter.kind === 'all') {
    return undefined
  }

  return filter.kind
}

/** Spaces alone would be refused by the API, so they search nothing. */
function exportSearch(filter: ActivityFilter): string | undefined {
  const text = filter.search.trim()

  if (text === '') {
    return undefined
  }

  return text
}

/** The local date, as the file name a person expects when they export today. */
function today(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${now.getFullYear()}-${month}-${day}`
}
