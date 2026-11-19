import Cloud from '~icons/solar/cloud-linear'
import Database from '~icons/solar/database-linear'
import Smartphone from '~icons/solar/smartphone-linear'
import type { JSX } from 'react'

import { FlowDiagram } from '@/shared/ui/illustration/flow-diagram'
import { Illustration } from '@/shared/ui/illustration/illustration'

/** A deleted project: its database and users are gone, and the app loses its login at once. */
export function ProjectDeletionIllustration(): JSX.Element {
  return (
    <Illustration
      name="project-delete"
      description="O banco de dados do projeto e seus usuários são apagados, e o app perde o login na hora."
    >
      <FlowDiagram
        nodes={[
          { icon: Smartphone, label: 'Seu app' },
          { icon: Cloud, label: 'Nelcota' },
          { icon: Database, label: 'Banco e usuários', tone: 'gone' },
        ]}
        links={[
          { label: 'login', state: 'cut' },
          { label: 'apagado', state: 'cut' },
        ]}
      />
    </Illustration>
  )
}
