import type { JSX } from 'react'

import { InsightRow } from '@/modules/overview/components/insight-row'
import type { Insight } from '@/modules/overview/components/insight-types'
import { SetupProgress } from '@/modules/overview/components/setup-progress'
import type { SetupStep } from '@/modules/overview/components/setup-steps'
import { SetupStepTile } from '@/modules/overview/components/setup-step-tile'
import { useInsights } from '@/modules/overview/queries/use-insights'
import { useSetupSteps } from '@/modules/overview/queries/use-setup-steps'
import { Skeleton } from '@/shared/ui/primitives/skeleton'

type NextStepsCardProps = { projectId: string; days: number }

/**
 * The setup left to do as numbered tiles, and the other points of attention below them.
 * Gone once the setup is complete and nothing needs a look.
 */
export function NextStepsCard({ projectId, days }: NextStepsCardProps): JSX.Element | null {
  const { steps } = useSetupSteps(projectId)
  const { insights } = useInsights(projectId, days)

  // Shown as soon as the steps are known: waiting for every insight too would make the card
  // appear late and push the metrics down. Insights join when they arrive.
  if (steps === null) {
    return (
      <Skeleton
        role="status"
        aria-label="Carregando os próximos passos"
        className="h-44 rounded-xl"
      />
    )
  }

  const pending = steps.filter((step) => step.isDone === false)
  const extra = insightsBeyond(insights ?? [], steps)

  if (pending.length === 0 && extra.length === 0) {
    return null
  }

  return (
    <section
      aria-labelledby="next-steps-title"
      className="grid gap-4 rounded-xl border border-border/60 bg-card p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="next-steps-title" className="text-base font-medium text-heading">
          Próximos passos
        </h2>
        <div className="w-full @min-[36rem]:w-48">
          <SetupProgress steps={steps} />
        </div>
      </div>
      <SetupTiles steps={steps} pendingCount={pending.length} />
      <InsightRows insights={extra} />
    </section>
  )
}

type SetupTilesProps = { steps: SetupStep[]; pendingCount: number }

function SetupTiles({ steps, pendingCount }: SetupTilesProps): JSX.Element | null {
  if (pendingCount === 0) {
    return null
  }

  return (
    <ol className="grid gap-2 @min-[36rem]:grid-cols-2 @min-[56rem]:grid-cols-5">
      {steps.map((step, index) => (
        <li key={step.id} className="flex">
          <SetupStepTile step={step} number={index + 1} />
        </li>
      ))}
    </ol>
  )
}

function InsightRows({ insights }: { insights: Insight[] }): JSX.Element | null {
  if (insights.length === 0) {
    return null
  }

  return (
    <ul className="-mx-2 -mb-2 grid border-t pt-2">
      {insights.map((insight) => (
        <li key={insight.id}>
          <InsightRow insight={insight} />
        </li>
      ))}
    </ul>
  )
}

/** Insights that point where a setup step already does are left out: one link per place. */
function insightsBeyond(insights: Insight[], steps: SetupStep[]): Insight[] {
  const stepPages = new Set(steps.map((step) => step.to))

  return insights.filter((insight) => stepPages.has(insight.action.to) === false)
}
