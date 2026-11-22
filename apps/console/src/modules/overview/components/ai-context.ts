import { firstVisiblePublishable } from '@/modules/api-keys/components/key-activity'
import { providerName } from '@/modules/overview/components/provider-names'
import type { components } from '@/shared/api/api-schema'

type Schemas = components['schemas']

export type AiColumn = { name: string; type: string; isPrimaryKey: boolean; isNullable: boolean }

export type AiTable = {
  name: string
  kind: string
  isRlsEnabled: boolean
  policyCount: number
  columns: AiColumn[]
}

/** What an AI coding agent needs to build on this project; never the secret key. */
export type AiContext = {
  projectName: string
  projectId: string
  apiUrl: string
  siteUrl: string
  /** `null` when the console cannot show a publishable key. */
  publishableKey: string | null
  requiresEmailVerification: boolean
  oauthProviders: string[]
  hasCaptcha: boolean
  /** `null` when the schema could not be read. */
  tables: AiTable[] | null
}

export type AiContextSources = {
  projectId: string
  apiUrl: string
  settings: Schemas['TenantSettings']
  providers: Schemas['ConfiguredProvider'][]
  keys: Schemas['ApiKeySummary'][]
  captcha: Schemas['CaptchaSettingsView'] | undefined
  schema: Schemas['SchemaOverview'] | undefined
}

/** The project as the agent prompts describe it, from the console's own data. */
export function aiContextOf(sources: AiContextSources): AiContext {
  const { settings } = sources
  const siteKey = sources.captcha?.site_key ?? null

  return {
    projectName: settings.name,
    projectId: sources.projectId,
    apiUrl: sources.apiUrl,
    siteUrl: settings.site_url,
    publishableKey: firstVisiblePublishable(sources.keys),
    requiresEmailVerification: settings.require_email_verification,
    oauthProviders: sources.providers.map((provider) => providerName(provider.provider)),
    hasCaptcha: siteKey !== null,
    tables: tablesOf(sources.schema),
  }
}

function tablesOf(schema: Schemas['SchemaOverview'] | undefined): AiTable[] | null {
  if (schema === undefined) {
    return null
  }

  return schema.tables.map((table) => ({
    name: table.name,
    kind: table.kind,
    isRlsEnabled: table.rls_enabled,
    policyCount: table.policies.length,
    columns: table.columns.map((column) => ({
      name: column.name,
      type: column.type,
      isPrimaryKey: column.is_primary_key,
      isNullable: column.nullable,
    })),
  }))
}
