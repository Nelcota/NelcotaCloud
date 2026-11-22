import { useApiKeysQuery } from '@/modules/api-keys/queries/use-api-keys'
import { useSchemaQuery } from '@/modules/database/queries/use-schema-query'
import { insightsOf } from '@/modules/overview/components/insight-rules'
import type { Insight } from '@/modules/overview/components/insight-types'
import { useAuditSummaryQuery } from '@/modules/overview/queries/use-audit-summary-query'
import { useOAuthProvidersQuery } from '@/modules/project-settings/queries/use-oauth-providers'
import {
  useSettingsQuery,
  useSmtpQuery,
} from '@/modules/project-settings/queries/use-project-settings'

export type InsightsState = {
  /** `null` until every source has answered, so the list never jumps as rules arrive. */
  insights: Insight[] | null
  error: Error | null
  retry: () => void
}

/** The points of attention, from the queries the console already makes for this project. */
export function useInsights(projectId: string, days: number): InsightsState {
  const settings = useSettingsQuery(projectId)
  const smtp = useSmtpQuery(projectId)
  const providers = useOAuthProvidersQuery(projectId)
  const keys = useApiKeysQuery(projectId)
  const schema = useSchemaQuery(projectId)
  const summary = useAuditSummaryQuery(projectId, days)
  const queries = [settings, smtp, providers, keys, schema, summary]
  const failed = queries.filter((query) => query.isError)

  function retry(): void {
    failed.forEach((query) => {
      void query.refetch()
    })
  }

  const error = failed[0]?.error ?? null

  if (queries.some((query) => query.isPending)) {
    return { insights: null, error, retry }
  }

  const sources = {
    settings: settings.data,
    smtp: smtp.data,
    providers: providers.data,
    keys: keys.data,
    schema: schema.data,
    summary: summary.data,
  }

  return { insights: insightsOf(sources, projectId), error, retry }
}
