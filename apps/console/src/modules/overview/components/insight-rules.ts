import {
  emailVerificationRule,
  platformSmtpRule,
  siteUrlRule,
  socialLoginRule,
} from '@/modules/overview/components/insight-config-rules'
import {
  closedTablesRule,
  concentratedFailuresRule,
  publishableKeyRule,
  rlsRule,
  unusedKeysRule,
} from '@/modules/overview/components/insight-data-rules'
import type {
  Insight,
  InsightRule,
  InsightSeverity,
  InsightSources,
} from '@/modules/overview/components/insight-types'

/** Warnings first; within a severity, the order of the rules below. */
const RULES: InsightRule[] = [
  siteUrlRule,
  emailVerificationRule,
  rlsRule,
  concentratedFailuresRule,
  publishableKeyRule,
  unusedKeysRule,
  closedTablesRule,
  platformSmtpRule,
  socialLoginRule,
]

const SEVERITY_ORDER: Record<InsightSeverity, number> = { warning: 0, info: 1 }

/** Every point that needs attention, warnings first, each with the page that fixes it. */
export function insightsOf(sources: InsightSources, projectId: string): Insight[] {
  const base = `/projects/${projectId}`

  return RULES.map((rule) => rule(sources, base))
    .filter((insight) => insight !== null)
    .toSorted((left, right) => SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity])
}
