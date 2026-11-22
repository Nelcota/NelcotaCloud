import { activeKeys } from '@/modules/api-keys/components/key-activity'
import { useApiKeysQuery } from '@/modules/api-keys/queries/use-api-keys'
import { type SetupStep, setupSteps } from '@/modules/overview/components/setup-steps'
import { useOAuthProvidersQuery } from '@/modules/project-settings/queries/use-oauth-providers'
import {
  useSettingsQuery,
  useSmtpQuery,
} from '@/modules/project-settings/queries/use-project-settings'
import { useUsersQuery } from '@/modules/users/queries/use-users'

/** One user is enough to read the total. */
const TOTAL_ONLY = { email: '', status: 'all', offset: 0, limit: 1 } as const

export type SetupStepsState = {
  /** `null` until every source has answered. */
  steps: SetupStep[] | null
  error: Error | null
  retry: () => void
}

/** The setup checklist from the queries the console already makes for this project. */
export function useSetupSteps(projectId: string): SetupStepsState {
  const keys = useApiKeysQuery(projectId)
  const settings = useSettingsQuery(projectId)
  const providers = useOAuthProvidersQuery(projectId)
  const smtp = useSmtpQuery(projectId)
  const users = useUsersQuery(projectId, TOTAL_ONLY)
  const queries = [keys, settings, providers, smtp, users]
  const error = queries.find((query) => query.error !== null)?.error ?? null

  function retry(): void {
    queries.forEach((query) => {
      void query.refetch()
    })
  }

  if (
    keys.data === undefined ||
    settings.data === undefined ||
    providers.data === undefined ||
    smtp.data === undefined ||
    users.data === undefined
  ) {
    return { steps: null, error, retry }
  }

  const publishableKeys = activeKeys(keys.data).filter((key) => key.kind === 'publishable')
  const facts = {
    publishableKeys: publishableKeys.length,
    siteUrl: settings.data.site_url,
    providers: providers.data.length,
    hasOwnSmtp: smtp.data.is_custom,
    users: users.data.total,
  }

  return { steps: setupSteps(facts, projectId), error, retry }
}
