import {
  type ApiState,
  type ProjectHealth,
  projectHealthOf,
} from '@/modules/overview/components/project-health'
import { useInsights } from '@/modules/overview/queries/use-insights'
import { useApiHealthQuery } from '@/modules/system-status/queries/use-api-health-query'

/** The project's state for the header: the API's health check and the warnings to look at. */
export function useProjectHealth(projectId: string, days: number): ProjectHealth {
  const apiHealth = useApiHealthQuery()
  const { insights } = useInsights(projectId, days)
  const warnings = insights?.filter((insight) => insight.severity === 'warning').length ?? null

  return projectHealthOf({ api: apiStateOf(apiHealth.status), warnings })
}

function apiStateOf(status: 'pending' | 'error' | 'success'): ApiState {
  const states: Record<typeof status, ApiState> = {
    pending: 'pending',
    error: 'down',
    success: 'up',
  }

  return states[status]
}
