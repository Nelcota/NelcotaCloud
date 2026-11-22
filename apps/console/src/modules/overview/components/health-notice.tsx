import { ArrowRight } from 'lucide-react'
import type { JSX } from 'react'

import { type HealthNotice, healthNoticeOf } from '@/modules/overview/components/health-notice-rule'
import { healthySentenceOf } from '@/modules/overview/components/healthy-sentence'
import { useAuditSummaryQuery } from '@/modules/overview/queries/use-audit-summary-query'
import { useSetupSteps } from '@/modules/overview/queries/use-setup-steps'
import { RouterLink } from '@/shared/routing/router-link'
import type { NoticeTone } from '@/shared/ui/notice'
import { Button } from '@/shared/ui/primitives/button'
import { Skeleton } from '@/shared/ui/primitives/skeleton'
import { SummarySentence } from '@/shared/ui/summary-sentence'

const VERDICTS: Record<NoticeTone, string> = {
  info: 'Quase pronto.',
  success: 'Saudável.',
  warning: 'Atenção.',
  error: 'Falha.',
}

type HealthNoticeStripProps = { projectId: string; days: number }

/** The page in one sentence: what needs a look first, or that everything is healthy and why. */
export function HealthNoticeStrip({ projectId, days }: HealthNoticeStripProps): JSX.Element | null {
  const summary = useAuditSummaryQuery(projectId, days)
  const { steps } = useSetupSteps(projectId)
  const notice = healthNoticeOf({ summary: summary.data, steps, days, projectId })

  if (notice !== null) {
    return <NoticeSentence notice={notice} />
  }

  // The sentence's place is kept while it loads, so the metrics below never jump.
  if (summary.data === undefined) {
    return <Skeleton role="status" aria-label="Carregando o resumo" className="h-11 rounded-xl" />
  }

  return (
    <SummarySentence tone="success" verdict={VERDICTS.success}>
      {healthySentenceOf(summary.data, days)}
    </SummarySentence>
  )
}

function NoticeSentence({ notice }: { notice: HealthNotice }): JSX.Element {
  return (
    <SummarySentence
      tone={notice.tone}
      verdict={VERDICTS[notice.tone]}
      action={<NoticeAction action={notice.action} />}
    >
      {notice.text}
    </SummarySentence>
  )
}

function NoticeAction({ action }: { action: HealthNotice['action'] }): JSX.Element | null {
  if (action === null) {
    return null
  }

  return (
    <Button asChild size="sm" variant="outline">
      <RouterLink href={action.to}>
        {action.label}
        <ArrowRight aria-hidden data-icon="inline-end" />
      </RouterLink>
    </Button>
  )
}
