import type { Insight } from '@/modules/overview/components/insight-types'
import type { SetupStep } from '@/modules/overview/components/setup-steps'

export type NextStepKind = 'warning' | 'setup' | 'done'

export type NextStep = {
  kind: NextStepKind
  title: string
  text: string
  /** The page that does it; `null` when there is nothing to do. */
  action: { label: string; to: string } | null
}

export type NextStepPlan = {
  step: NextStep
  /** The insights the step does not show, so they stay one click away. */
  others: Insight[]
}

const DONE: NextStep = {
  kind: 'done',
  title: 'Tudo certo',
  text: 'Nenhum aviso e a configuração está completa.',
  action: null,
}

/**
 * The single most important thing to do now: the first warning, else the first setup step
 * left, else nothing.
 */
export function nextStepOf(insights: Insight[], steps: SetupStep[]): NextStepPlan {
  const warning = insights.find((insight) => insight.severity === 'warning')

  if (warning !== undefined) {
    const others = insights.filter((insight) => insight.id !== warning.id)
    const step: NextStep = {
      kind: 'warning',
      title: warning.title,
      text: warning.text,
      action: warning.action,
    }

    return { step, others }
  }

  const setup = steps.find((candidate) => candidate.isDone === false)

  if (setup === undefined) {
    return { step: DONE, others: insights }
  }

  return { step: setupStepOf(setup), others: insights }
}

function setupStepOf(setup: SetupStep): NextStep {
  return {
    kind: 'setup',
    title: setup.label,
    text: setup.detail,
    action: { label: setup.actionLabel, to: setup.to },
  }
}
