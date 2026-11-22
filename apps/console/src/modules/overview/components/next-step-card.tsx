import type { JSX, ReactNode } from 'react'

import { nextStepOf } from '@/modules/overview/components/next-step'
import { NextStepBody } from '@/modules/overview/components/next-step-body'
import { InsightList } from '@/modules/overview/components/insight-list'
import { SetupProgress } from '@/modules/overview/components/setup-progress'
import { useInsights } from '@/modules/overview/queries/use-insights'
import { useSetupSteps } from '@/modules/overview/queries/use-setup-steps'
import { LoadError } from '@/shared/ui/load-error'
import { Skeleton } from '@/shared/ui/primitives/skeleton'

type NextStepCardProps = { projectId: string; days: number }

/** The one thing to do now, the other insights on one line each, and the setup's progress. */
export function NextStepCard({ projectId, days }: NextStepCardProps): JSX.Element {
  const insightsState = useInsights(projectId, days)
  const stepsState = useSetupSteps(projectId)
  const { insights } = insightsState
  const { steps } = stepsState
  const error = insightsState.error ?? stepsState.error

  function retry(): void {
    insightsState.retry()
    stepsState.retry()
  }

  if (insights === null || steps === null) {
    return (
      <CardFrame>
        <LoadError error={error} onRetry={retry} />
        {error === null && <Skeleton className="h-64" />}
      </CardFrame>
    )
  }

  const { step, others } = nextStepOf(insights, steps)

  return (
    <CardFrame>
      <LoadError error={error} onRetry={retry} />
      <NextStepBody step={step} />
      <InsightList insights={others} />
      <div className="mt-auto border-t pt-5">
        <SetupProgress steps={steps} />
      </div>
    </CardFrame>
  )
}

function CardFrame({ children }: { children: ReactNode }): JSX.Element {
  return (
    <section
      aria-label="Próximo passo"
      className="flex min-w-0 flex-col gap-4 rounded-xl border border-border/60 bg-card p-4"
    >
      {children}
    </section>
  )
}
