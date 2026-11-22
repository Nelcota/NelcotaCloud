import { useBlocker } from '@tanstack/react-router'
import type { JSX } from 'react'

import { ConfigStep } from '@/modules/projects/components/config-step'
import { CreationProgress } from '@/modules/projects/components/creation-progress'
import { draftErrors, hasDraftErrors } from '@/modules/projects/components/draft-errors'
import type { CreatedSetup } from '@/modules/projects/components/created-setup'
import { draftSlug } from '@/modules/projects/components/project-draft'
import { ReviewStep } from '@/modules/projects/components/review-step'
import { StartStep } from '@/modules/projects/components/start-step'
import { submitDraft } from '@/modules/projects/components/submit-draft'
import {
  type ProjectWizard,
  useProjectWizard,
} from '@/modules/projects/components/use-project-wizard'
import { WizardLayout } from '@/modules/projects/components/wizard-layout'
import type { WizardStepId } from '@/modules/projects/components/wizard-step'
import { useCreateProjectMutation } from '@/modules/projects/queries/use-projects'

type NewProjectWizardProps = { onCreated: (setup: CreatedSetup) => void }

/** Starting point, configuration and review, then the request that creates the project. */
export function NewProjectWizard({ onCreated }: NewProjectWizardProps): JSX.Element {
  const creation = useCreateProjectMutation()
  const wizard = useProjectWizard(() => {
    if (creation.isError) {
      creation.reset()
    }
  })

  // Leaving while the request is in flight can lose the only copy of the returned secret key.
  useBlocker({
    shouldBlockFn: () => creation.isPending,
    enableBeforeUnload: () => creation.isPending,
  })

  function create(): void {
    if (creation.isPending) {
      return
    }

    if (hasDraftErrors(draftErrors(wizard.draft))) {
      wizard.submitConfig()
      return
    }

    const { draft, purpose } = wizard

    creation.mutate(submitDraft(draft), {
      onSuccess: (project) => onCreated({ project, purpose, name: draft.name.trim() }),
    })
  }

  function selectStep(step: WizardStepId): void {
    if (creation.isPending) {
      return
    }

    wizard.goTo(step)
  }

  if (creation.isPending) {
    return (
      <WizardLayout position="review">
        <CreationProgress slug={draftSlug(wizard.draft)} />
      </WizardLayout>
    )
  }

  return (
    <WizardLayout position={wizard.step} onStepSelect={selectStep}>
      <CurrentStep wizard={wizard} error={creation.error} onCreate={create} />
    </WizardLayout>
  )
}

type CurrentStepProps = {
  wizard: ProjectWizard
  error: Error | null
  onCreate: () => void
}

function CurrentStep({ wizard, error, onCreate }: CurrentStepProps): JSX.Element {
  const { step, hasNavigated, draft } = wizard

  if (step === 'start') {
    return (
      <StartStep
        purpose={wizard.purpose}
        start={wizard.start}
        onPurposeChange={wizard.setPurpose}
        onStartChange={wizard.chooseStart}
        isFocusedOnMount={hasNavigated}
        onNext={() => wizard.goTo('config')}
      />
    )
  }

  if (step === 'config') {
    return (
      <ConfigStep
        draft={draft}
        onDraftChange={wizard.changeDraft}
        errors={wizard.shownErrors}
        isFocusedOnMount={hasNavigated}
        onBack={() => wizard.goTo('start')}
        onNext={wizard.submitConfig}
      />
    )
  }

  return (
    <ReviewStep
      draft={draft}
      start={wizard.start}
      error={error}
      isFocusedOnMount={hasNavigated && error === null}
      onBack={() => wizard.goTo('config')}
      onCreate={onCreate}
    />
  )
}
