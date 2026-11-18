import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import {
  type DraftChange,
  EMPTY_DRAFT,
  type ProjectDraft,
} from '@/modules/projects/components/project-draft'
import { projectSteps } from '@/modules/projects/components/project-steps'
import { submitDraft } from '@/modules/projects/components/submit-draft'
import { WizardFooter } from '@/modules/projects/components/wizard-footer'
import { useCreateProjectMutation } from '@/modules/projects/queries/use-projects'
import type { components } from '@/shared/api/api-schema'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { StepProgress } from '@/shared/ui/step-dialog/step-progress'

type CreatedProject = components['schemas']['CreatedTenantResponse']

/** Creates a project in three steps: its name, its app's site, then a review. */
export function NewProjectForm({
  onCreated,
}: {
  onCreated: (project: CreatedProject) => void
}): JSX.Element {
  const creation = useCreateProjectMutation()
  const [index, setIndex] = useState(0)
  const [draft, setDraft] = useState<ProjectDraft>(EMPTY_DRAFT)
  const changeDraft: DraftChange = (change) => setDraft((current) => ({ ...current, ...change }))
  const steps = projectSteps(draft, changeDraft)
  const step = steps[index]
  const lastIndex = steps.length - 1

  function advance(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    if (step === undefined || step.missing !== null) {
      return
    }

    if (index < lastIndex) {
      setIndex(index + 1)
      return
    }

    creation.mutate(submitDraft(draft), { onSuccess: onCreated })
  }

  /** An error from creating the project no longer applies once a step is being changed. */
  function goBack(): void {
    creation.reset()
    setIndex(index - 1)
  }

  return (
    <form onSubmit={advance} className="bg-card grid gap-5 rounded-xl border p-5">
      <p className="sr-only" aria-live="polite">
        Passo {index + 1} de {steps.length}: {step?.label}
      </p>
      <StepProgress labels={steps.map((candidate) => candidate.label)} current={index} />
      <div key={index} className="animate-step-in grid gap-5 motion-reduce:animate-none">
        {step?.illustration}
        {step?.content}
      </div>
      <ErrorAlert error={creation.error} />
      <WizardFooter
        index={index}
        isLast={index === lastIndex}
        isWorking={creation.isPending}
        canContinue={step?.missing === null}
        onBack={goBack}
      />
    </form>
  )
}
