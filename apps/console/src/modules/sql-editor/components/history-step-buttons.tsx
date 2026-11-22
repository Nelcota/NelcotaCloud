import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { JSX } from 'react'

import type { HistorySteps } from '@/modules/sql-editor/components/use-history-steps'
import { Button } from '@/shared/ui/primitives/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/primitives/tooltip'

/** ← and → through the queries run here; nothing runs by itself. */
export function HistoryStepButtons({ steps }: { steps: HistorySteps }): JSX.Element {
  return (
    <div role="group" aria-label="Consultas executadas" className="flex items-center">
      <StepButton
        label="Consulta anterior"
        isDisabled={steps.canGoBack === false}
        onStep={steps.back}
      >
        <ArrowLeft aria-hidden />
      </StepButton>
      <StepButton
        label="Próxima consulta"
        isDisabled={steps.canGoForward === false}
        onStep={steps.forward}
      >
        <ArrowRight aria-hidden />
      </StepButton>
    </div>
  )
}

type StepButtonProps = {
  label: string
  isDisabled: boolean
  onStep: () => void
  children: JSX.Element
}

function StepButton({ label, isDisabled, onStep, children }: StepButtonProps): JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          className="text-foreground disabled:text-muted-foreground"
          disabled={isDisabled}
          onClick={onStep}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
