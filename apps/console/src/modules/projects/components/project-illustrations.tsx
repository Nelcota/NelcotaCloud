import Cloud from '~icons/solar/cloud-linear'
import Database from '~icons/solar/database-linear'
import Global from '~icons/solar/global-linear'
import Letter from '~icons/solar/letter-linear'
import Smartphone from '~icons/solar/smartphone-linear'
import type { JSX } from 'react'

import { FlowDiagram } from '@/shared/ui/illustration/flow-diagram'
import { Illustration } from '@/shared/ui/illustration/illustration'

/** A new project gets a database of its own, apart from every other project. */
export function ProjectIsolationIllustration(): JSX.Element {
  return (
    <Illustration
      name="project-isolation"
      description="A NelcotaCloud cria um banco de dados só para este projeto, separado dos outros."
    >
      <FlowDiagram
        nodes={[
          { icon: Cloud, label: 'NelcotaCloud' },
          { icon: Database, label: 'Banco só do projeto', tone: 'focus' },
        ]}
        links={[{ label: 'cria', state: 'flowing' }]}
      />
    </Illustration>
  )
}

/** Emails and social logins bring the user back to the app's site. */
export function ProjectSiteIllustration(): JSX.Element {
  return (
    <Illustration
      name="project-site"
      description="Os links dos emails e o login social levam o usuário de volta ao site do seu app."
    >
      <FlowDiagram
        nodes={[
          { icon: Letter, label: 'Emails e login social' },
          { icon: Global, label: 'Site do app', tone: 'focus' },
        ]}
        links={[{ label: 'voltam para', state: 'flowing' }]}
      />
    </Illustration>
  )
}

/** The whole picture once created: the app logs users in through the project's own database. */
export function ProjectConnectionIllustration(): JSX.Element {
  return (
    <Illustration
      name="project-connection"
      description="Seu app se conecta à NelcotaCloud, que guarda os usuários no banco só deste projeto."
    >
      <FlowDiagram
        nodes={[
          { icon: Smartphone, label: 'Seu app' },
          { icon: Cloud, label: 'NelcotaCloud' },
          { icon: Database, label: 'Banco só do projeto', tone: 'focus' },
        ]}
        links={[
          { label: 'login', state: 'flowing' },
          { label: 'usuários', state: 'flowing' },
        ]}
      />
    </Illustration>
  )
}
