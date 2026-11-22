import { type UseQueryResult, useQuery } from '@tanstack/react-query'

import { readAuditSummary } from '@/modules/overview/api/read-audit-summary'
import type { components } from '@/shared/api/api-schema'

export function useAuditSummaryQuery(
  projectId: string,
  days: number,
): UseQueryResult<components['schemas']['AuditSummary']> {
  return useQuery({
    queryKey: ['projects', projectId, 'audit-summary', days],
    queryFn: () => readAuditSummary(projectId, days),
  })
}
