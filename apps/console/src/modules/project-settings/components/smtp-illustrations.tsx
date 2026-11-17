import Cloud from '~icons/solar/cloud-linear'
import Inbox from '~icons/solar/inbox-linear'
import Letter from '~icons/solar/letter-linear'
import Server from '~icons/solar/server-linear'
import type { JSX } from 'react'

import { FlowDiagram } from '@/shared/ui/illustration/flow-diagram'
import { Illustration } from '@/shared/ui/illustration/illustration'

/** The project's own server in the middle of every auth email. */
export function SmtpOwnServerIllustration(): JSX.Element {
  return (
    <Illustration
      name="smtp-own-server"
      description="A NelcotaCloud entrega cada email ao seu servidor SMTP, que o envia para a caixa de entrada do usuário."
    >
      <FlowDiagram
        nodes={[
          { icon: Cloud, label: 'NelcotaCloud' },
          { icon: Server, label: 'Seu servidor SMTP', tone: 'focus' },
          { icon: Inbox, label: 'Caixa do usuário' },
        ]}
        links={[
          { label: 'email', state: 'flowing' },
          { label: 'entregue', state: 'flowing' },
        ]}
      />
    </Illustration>
  )
}

/** Back to the platform's server: the project's own one is left out. */
export function SmtpPlatformIllustration(): JSX.Element {
  return (
    <Illustration
      name="smtp-platform"
      description="Os emails voltam a sair pelo SMTP da NelcotaCloud direto para a caixa de entrada do usuário."
    >
      <FlowDiagram
        nodes={[
          { icon: Cloud, label: 'NelcotaCloud' },
          { icon: Letter, label: 'SMTP da NelcotaCloud', tone: 'focus' },
          { icon: Inbox, label: 'Caixa do usuário' },
        ]}
        links={[
          { label: 'email', state: 'flowing' },
          { label: 'entregue', state: 'flowing' },
        ]}
      />
    </Illustration>
  )
}
