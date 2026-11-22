import type { components } from '@/shared/api/api-schema'

type Schemas = components['schemas']

export type InsightSeverity = 'warning' | 'info'

export type Insight = {
  id: string
  severity: InsightSeverity
  /** A short imperative heading, for when the insight is the page's next step. */
  title: string
  text: string
  action: { label: string; to: string }
}

/** What the rules read; a source that has not loaded (or failed) is left out and its rules skip. */
export type InsightSources = {
  settings?: Schemas['TenantSettings']
  smtp?: Schemas['SmtpSettingsView']
  providers?: Schemas['ConfiguredProvider'][]
  keys?: Schemas['ApiKeySummary'][]
  schema?: Schemas['SchemaOverview']
  summary?: Schemas['AuditSummary']
}

export type InsightRule = (sources: InsightSources, base: string) => Insight | null
