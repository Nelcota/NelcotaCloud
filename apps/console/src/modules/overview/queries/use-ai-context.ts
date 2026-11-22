import { useApiKeysQuery } from '@/modules/api-keys/queries/use-api-keys'
import { useSchemaQuery } from '@/modules/database/queries/use-schema-query'
import { type AiContext, aiContextOf } from '@/modules/overview/components/ai-context'
import { useCaptchaQuery } from '@/modules/project-settings/queries/use-captcha'
import { useOAuthProvidersQuery } from '@/modules/project-settings/queries/use-oauth-providers'
import { useSettingsQuery } from '@/modules/project-settings/queries/use-project-settings'
import { API_BASE_URL } from '@/shared/api/api-base-url'

export type AiContextState = {
  /** `null` until the required sources answer. */
  context: AiContext | null
  error: Error | null
  retry: () => void
}

/**
 * The project context for AI agents. Settings, login providers and keys are required; the
 * captcha and the schema only add to it, so the prompt still works when they fail.
 */
export function useAiContext(projectId: string): AiContextState {
  const settings = useSettingsQuery(projectId)
  const providers = useOAuthProvidersQuery(projectId)
  const keys = useApiKeysQuery(projectId)
  const captcha = useCaptchaQuery(projectId)
  const schema = useSchemaQuery(projectId)
  const required = [settings, providers, keys]
  const failed = required.filter((query) => query.isError)

  function retry(): void {
    failed.forEach((query) => {
      void query.refetch()
    })
  }

  const error = failed[0]?.error ?? null

  if (
    settings.data === undefined ||
    providers.data === undefined ||
    keys.data === undefined ||
    captcha.isPending ||
    schema.isPending
  ) {
    return { context: null, error, retry }
  }

  const context = aiContextOf({
    projectId,
    apiUrl: API_BASE_URL,
    settings: settings.data,
    providers: providers.data,
    keys: keys.data,
    captcha: captcha.data,
    schema: schema.data,
  })

  return { context, error, retry }
}
