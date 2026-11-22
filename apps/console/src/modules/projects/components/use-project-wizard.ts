import { useState } from 'react'

import {
  draftErrors,
  type DraftErrors,
  hasDraftErrors,
} from '@/modules/projects/components/draft-errors'
import {
  EMPTY_DRAFT,
  type DraftChange,
  type ProjectDraft,
  type ProjectPurpose,
} from '@/modules/projects/components/project-draft'
import { draftForStart, type ProjectStart } from '@/modules/projects/components/project-start'
import type { WizardStepId } from '@/modules/projects/components/wizard-step'

export type ProjectWizard = {
  step: WizardStepId
  /** False on the first step shown, so opening the page does not move focus. */
  hasNavigated: boolean
  draft: ProjectDraft
  purpose: ProjectPurpose
  start: ProjectStart
  /** The field errors, once the configuration was submitted; `null` before. */
  shownErrors: DraftErrors | null
  goTo: (step: WizardStepId) => void
  changeDraft: DraftChange
  setPurpose: (purpose: ProjectPurpose) => void
  chooseStart: (start: ProjectStart) => void
  /** Opens the review when the draft is valid; otherwise shows its errors on the configuration. */
  submitConfig: () => void
}

/** The flow's state: which step is open and what the user chose and typed so far. */
export function useProjectWizard(onDraftEdit: () => void): ProjectWizard {
  const [step, setStep] = useState<WizardStepId>('start')
  const [hasNavigated, setHasNavigated] = useState(false)
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [purpose, setPurpose] = useState<ProjectPurpose>('personal')
  const [start, setStart] = useState<ProjectStart>('blank')
  const [hasCheckedConfig, setHasCheckedConfig] = useState(false)
  const errors = draftErrors(draft)

  function goTo(next: WizardStepId): void {
    setHasNavigated(true)
    setStep(next)
  }

  const changeDraft: DraftChange = (change) => {
    onDraftEdit()
    setDraft((current) => ({ ...current, ...change }))
  }

  function chooseStart(next: ProjectStart): void {
    setStart(next)
    setDraft((current) => draftForStart(current, next))
  }

  function submitConfig(): void {
    setHasCheckedConfig(true)

    if (hasDraftErrors(errors)) {
      goTo('config')
      return
    }

    goTo('review')
  }

  return {
    step,
    hasNavigated,
    draft,
    purpose,
    start,
    shownErrors: shownErrorsOf(errors, hasCheckedConfig),
    goTo,
    changeDraft,
    setPurpose,
    chooseStart,
    submitConfig,
  }
}

function shownErrorsOf(errors: DraftErrors, hasCheckedConfig: boolean): DraftErrors | null {
  if (hasCheckedConfig) {
    return errors
  }

  return null
}
