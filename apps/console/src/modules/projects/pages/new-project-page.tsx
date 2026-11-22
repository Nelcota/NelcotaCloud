import { type JSX, useState } from 'react'

import type { CreatedSetup } from '@/modules/projects/components/created-setup'
import { NewProjectWizard } from '@/modules/projects/components/new-project-wizard'
import { ProjectReady } from '@/modules/projects/components/project-ready'
import { WizardLayout } from '@/modules/projects/components/wizard-layout'

/** The new project flow, then the created project with its keys and next steps. */
export function NewProjectPage(): JSX.Element {
  const [setup, setSetup] = useState<CreatedSetup | null>(null)

  if (setup === null) {
    return <NewProjectWizard onCreated={setSetup} />
  }

  return (
    <WizardLayout position="done">
      <ProjectReady setup={setup} />
    </WizardLayout>
  )
}
