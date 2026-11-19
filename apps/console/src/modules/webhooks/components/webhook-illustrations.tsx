import Cloud from '~icons/solar/cloud-linear'
import Server from '~icons/solar/server-linear'
import Smartphone from '~icons/solar/smartphone-linear'
import type { JSX } from 'react'

import { FlowDiagram } from '@/shared/ui/illustration/flow-diagram'
import { Illustration } from '@/shared/ui/illustration/illustration'

/** A user event in the app reaches the customer's server as a signed POST. */
export function WebhookFlowIllustration(): JSX.Element {
  return (
    <Illustration
      name="webhook-flow"
      description="Quando algo acontece com um usuário do seu app, a Nelcota envia um POST assinado para o seu servidor."
    >
      <FlowDiagram
        nodes={[
          { icon: Smartphone, label: 'Seu app' },
          { icon: Cloud, label: 'Nelcota' },
          { icon: Server, label: 'Seu servidor', tone: 'focus' },
        ]}
        links={[
          { label: 'evento', state: 'flowing' },
          { label: 'POST assinado', state: 'flowing' },
        ]}
      />
    </Illustration>
  )
}

/** A deleted endpoint: the server stops receiving events at once. */
export function WebhookDeleteIllustration(): JSX.Element {
  return (
    <Illustration
      name="webhook-delete"
      description="A Nelcota para de enviar eventos para o seu servidor na hora."
    >
      <FlowDiagram
        nodes={[
          { icon: Cloud, label: 'Nelcota' },
          { icon: Server, label: 'Seu servidor' },
        ]}
        links={[{ label: 'eventos', state: 'cut' }]}
      />
    </Illustration>
  )
}
