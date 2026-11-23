import { ArrowRight, Check } from 'lucide-react'
import type { JSX } from 'react'

import type { SetupStep } from '@/modules/overview/components/setup-steps'
import { RouterLink } from '@/shared/routing/router-link'

type SetupStepTileProps = { step: SetupStep; number: number }

/** One setup step: done ones fade with a check; the rest open the page that does them. */
export function SetupStepTile({ step, number }: SetupStepTileProps): JSX.Element {
  if (step.isDone) {
    return (
      <div className="flex w-full items-start gap-2.5 rounded-lg bg-surface p-3 text-muted-foreground">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-success/15">
          <Check aria-label="Feito" className="size-4 text-success" />
        </span>
        <span className="text-sm text-pretty line-through decoration-muted-foreground/50">
          {step.label}
        </span>
      </div>
    )
  }

  return (
    <RouterLink
      href={step.to}
      className="group flex w-full flex-col gap-2 rounded-lg border border-border/60 p-3 transition-colors hover:border-muted-foreground/30 hover:bg-surface"
    >
      <span className="flex items-start gap-2.5">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-hover font-mono text-2xs text-heading tabular-nums">
          {number}
        </span>
        <span className="text-sm font-medium text-pretty text-heading">{step.label}</span>
      </span>
      <span className="hidden text-xs text-pretty text-muted-foreground @min-[36rem]:block">
        {step.detail}
      </span>
      <span className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground">
        {step.actionLabel}
        <ArrowRight aria-hidden className="size-4.5" />
      </span>
    </RouterLink>
  )
}
