import { type UseMutationResult, useMutation } from '@tanstack/react-query'

import { exportAuditEvents } from '@/modules/activity/api/export-audit-events'
import type { AuditFilter } from '@/modules/activity/api/list-audit-events'

export function useExportAuditEventsMutation(
  projectId: string,
): UseMutationResult<Blob, Error, AuditFilter> {
  return useMutation({
    mutationFn: (filter: AuditFilter) => exportAuditEvents(projectId, filter),
  })
}
