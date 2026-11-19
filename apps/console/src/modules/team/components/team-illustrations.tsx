import Cloud from '~icons/solar/cloud-linear'
import Crown from '~icons/solar/crown-minimalistic-linear'
import User from '~icons/solar/user-linear'
import UsersGroup from '~icons/solar/users-group-rounded-linear'
import type { JSX } from 'react'

import type { MemberAction } from '@/modules/team/components/team-row-actions'
import { FlowDiagram, type FlowLink, type FlowNode } from '@/shared/ui/illustration/flow-diagram'
import { Illustration } from '@/shared/ui/illustration/illustration'

/** The invitation travels by email; the person joins the team when they accept it. */
export function InviteIllustration(): JSX.Element {
  return (
    <Illustration
      name="team-invite"
      description="A pessoa recebe o convite por email e, ao aceitar no console, entra na equipe do projeto."
    >
      <FlowDiagram
        nodes={[
          { icon: Cloud, label: 'Nelcota' },
          { icon: User, label: 'Pessoa convidada', tone: 'focus' },
          { icon: UsersGroup, label: 'Equipe do projeto' },
        ]}
        links={[
          { label: 'convite', state: 'flowing' },
          { label: 'aceita', state: 'flowing' },
        ]}
      />
    </Illustration>
  )
}

type MemberStory = { description: string; nodes: FlowNode[]; links: FlowLink[] }

const TEAM: FlowNode = { icon: UsersGroup, label: 'Equipe do projeto' }

const MEMBER_STORIES: Record<MemberAction, MemberStory> = {
  promote: {
    description: 'Passa de membro a dono do projeto.',
    nodes: [
      { icon: User, label: 'Membro' },
      { icon: Crown, label: 'Dono', tone: 'focus' },
    ],
    links: [{ label: 'novo papel', state: 'flowing' }],
  },
  transfer: {
    description: 'Você entrega a propriedade do projeto à outra pessoa e continua como membro.',
    nodes: [
      { icon: User, label: 'Você' },
      { icon: Crown, label: 'Propriedade', tone: 'focus' },
      { icon: User, label: 'Novo dono' },
    ],
    links: [
      { label: 'entrega', state: 'flowing' },
      { label: 'recebe', state: 'flowing' },
    ],
  },
  demote: {
    description: 'Deixa de ser dono e continua no projeto como membro.',
    nodes: [
      { icon: Crown, label: 'Dono', tone: 'gone' },
      { icon: User, label: 'Membro', tone: 'focus' },
    ],
    links: [{ label: 'novo papel', state: 'flowing' }],
  },
  remove: {
    description: 'A pessoa perde o acesso ao projeto na hora.',
    nodes: [{ icon: User, label: 'Membro' }, TEAM],
    links: [{ label: 'acesso', state: 'cut' }],
  },
  leave: {
    description: 'Você perde o acesso ao projeto na hora.',
    nodes: [{ icon: User, label: 'Você' }, TEAM],
    links: [{ label: 'acesso', state: 'cut' }],
  },
}

/** What one member action does to the team, as a picture. */
export function MemberActionIllustration({ action }: { action: MemberAction }): JSX.Element {
  const story = MEMBER_STORIES[action]

  return (
    <Illustration name={`team-${action}`} description={story.description}>
      <FlowDiagram nodes={story.nodes} links={story.links} />
    </Illustration>
  )
}
