import { ArrowRight } from 'lucide-react'
import type { JSX } from 'react'

import { healthNoticeOf } from '@/modules/overview/components/health-notice-rule'
import { useAuditSummaryQuery } from '@/modules/overview/queries/use-audit-summary-query'
import { useSetupSteps } from '@/modules/overview/queries/use-setup-steps'
import { RouterLink } from '@/shared/routing/router-link'
import { Notice } from '@/shared/ui/notice'
import { Button } from '@/shared/ui/primitives/button'

type HealthNoticeStripProps = { projectId: string; days: number }

/** One line above the metrics when something needs a look; nothing otherwise. */
export function HealthNoticeStrip({ projectId, days }: HealthNoticeStripProps): JSX.Element | null {
  const summary = useAuditSummaryQuery(projectId, days)
  const { steps } = useSetupSteps(projectId)
  const notice = healthNoticeOf({ summary: summary.data, steps, days, projectId })

  if (notice === null) {
    return null
  }

  return (
    <Notice
      tone={notice.tone}
      className="items-center py-2.5"
      action={
        <Button asChild size="sm" variant="outline">
          <RouterLink href={notice.action.to}>
            {notice.action.label}
            <ArrowRight aria-hidden data-icon="inline-end" />
          </RouterLink>
        </Button>
      }
    >
      <span className="text-foreground">{notice.text}</span>
    </Notice>
  )
}
