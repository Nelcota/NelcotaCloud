import type { JSX } from 'react'

import type { ProjectPurpose } from '@/modules/projects/components/project-draft'
import { SegmentedControl } from '@/shared/ui/segmented-control'

const PURPOSES: readonly { value: ProjectPurpose; label: string }[] = [
  { value: 'personal', label: 'Só eu' },
  { value: 'team', label: 'Minha equipe' },
]

type PurposeChoiceProps = {
  purpose: ProjectPurpose
  onPurposeChange: (purpose: ProjectPurpose) => void
}

/** A secondary question: a team project leads its next steps with the invitations. */
export function PurposeChoice({ purpose, onPurposeChange }: PurposeChoiceProps): JSX.Element {
  function select(value: string): void {
    const choice = PURPOSES.find((option) => option.value === value)

    if (choice === undefined) {
      return
    }

    onPurposeChange(choice.value)
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <span aria-hidden>Quem vai usar:</span>
      <SegmentedControl
        label="Quem vai usar o projeto"
        options={PURPOSES}
        value={purpose}
        onValueChange={select}
      />
    </div>
  )
}
