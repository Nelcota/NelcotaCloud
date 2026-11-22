import { ArrowRight, Code2, FilePlus2 } from 'lucide-react'
import type { JSX } from 'react'

import type { ProjectPurpose } from '@/modules/projects/components/project-draft'
import { EXAMPLE_SITE_URL, type ProjectStart } from '@/modules/projects/components/project-start'
import { PurposeChoice } from '@/modules/projects/components/purpose-choice'
import { StepPanel } from '@/modules/projects/components/step-panel'
import { type Choice, ChoiceCards } from '@/shared/ui/choice-cards'
import { Button } from '@/shared/ui/primitives/button'

const STARTS: readonly Choice<ProjectStart>[] = [
  {
    value: 'blank',
    icon: FilePlus2,
    title: 'Projeto em branco',
    description: 'Para o seu próprio app.',
  },
  {
    value: 'example',
    icon: Code2,
    title: 'App de exemplo React',
    description: `examples/react-auth, em ${EXAMPLE_SITE_URL}.`,
  },
]

type StartStepProps = {
  purpose: ProjectPurpose
  start: ProjectStart
  onPurposeChange: (purpose: ProjectPurpose) => void
  onStartChange: (start: ProjectStart) => void
  isFocusedOnMount: boolean
  onNext: () => void
}

/** What the project starts from (the example fills in the site for step 2), and who it is for. */
export function StartStep(props: StartStepProps): JSX.Element {
  return (
    <StepPanel
      title="Por onde começar?"
      isFocusedOnMount={props.isFocusedOnMount}
      onSubmit={props.onNext}
      footer={
        <Button type="submit">
          Continuar
          <ArrowRight aria-hidden data-icon="inline-end" />
        </Button>
      }
    >
      <ChoiceCards
        legend="Por onde começar?"
        columns={2}
        choices={STARTS}
        selected={props.start}
        onSelect={props.onStartChange}
      />
      <PurposeChoice purpose={props.purpose} onPurposeChange={props.onPurposeChange} />
    </StepPanel>
  )
}
