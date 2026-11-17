import Database from '~icons/solar/database-linear'
import Monitor from '~icons/solar/monitor-smartphone-linear'
import ShieldKeyhole from '~icons/solar/shield-keyhole-linear'
import Smartphone from '~icons/solar/smartphone-linear'
import User from '~icons/solar/user-linear'
import type { JSX } from 'react'

import type { ConfirmedAction } from '@/modules/users/components/user-action-confirmations'
import { FlowDiagram } from '@/shared/ui/illustration/flow-diagram'
import { Illustration } from '@/shared/ui/illustration/illustration'

const ILLUSTRATIONS: Record<ConfirmedAction, () => JSX.Element> = {
  ban: BanIllustration,
  'end-sessions': EndSessionsIllustration,
  'reset-mfa': ResetMfaIllustration,
  delete: DeleteIllustration,
}

/** What a confirmed admin action does to the user, as a picture for its dialog. */
export function UserActionIllustration({ action }: { action: ConfirmedAction }): JSX.Element {
  const Picture = ILLUSTRATIONS[action]

  return <Picture />
}

function BanIllustration(): JSX.Element {
  return (
    <Illustration
      name="user-ban"
      description="O usuário bloqueado não consegue mais entrar no seu app."
    >
      <FlowDiagram
        nodes={[
          { icon: User, label: 'Usuário', tone: 'focus' },
          { icon: Smartphone, label: 'Seu app' },
        ]}
        links={[{ label: 'login', state: 'cut' }]}
      />
    </Illustration>
  )
}

function EndSessionsIllustration(): JSX.Element {
  return (
    <Illustration
      name="user-end-sessions"
      description="Os dispositivos do usuário saem do app; ele entra de novo com a mesma conta."
    >
      <FlowDiagram
        nodes={[
          { icon: Monitor, label: 'Dispositivos', tone: 'focus' },
          { icon: Smartphone, label: 'Seu app' },
        ]}
        links={[{ label: 'sessões', state: 'cut' }]}
      />
    </Illustration>
  )
}

function ResetMfaIllustration(): JSX.Element {
  return (
    <Illustration
      name="user-reset-mfa"
      description="O app autenticador deixa de ser pedido; o usuário entra só com a senha até ativar o MFA de novo."
    >
      <FlowDiagram
        nodes={[
          { icon: ShieldKeyhole, label: 'Autenticador', tone: 'gone' },
          { icon: User, label: 'Usuário', tone: 'focus' },
          { icon: Smartphone, label: 'Seu app' },
        ]}
        links={[
          { label: 'código', state: 'cut' },
          { label: 'senha', state: 'flowing' },
        ]}
      />
    </Illustration>
  )
}

function DeleteIllustration(): JSX.Element {
  return (
    <Illustration
      name="user-delete"
      description="A conta do usuário sai do banco do projeto, com os logins sociais e as sessões."
    >
      <FlowDiagram
        nodes={[
          { icon: User, label: 'Usuário', tone: 'gone' },
          { icon: Database, label: 'Banco do projeto' },
        ]}
        links={[{ label: 'conta apagada', state: 'cut' }]}
      />
    </Illustration>
  )
}
