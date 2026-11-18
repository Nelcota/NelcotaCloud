import Cloud from '~icons/solar/cloud-linear'
import Widget from '~icons/solar/widget-linear'
import Server from '~icons/solar/server-linear'
import Smartphone from '~icons/solar/smartphone-linear'
import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'
import { FlowDiagram } from '@/shared/ui/illustration/flow-diagram'
import { Illustration } from '@/shared/ui/illustration/illustration'

type ApiKeyKind = components['schemas']['ApiKeyKind']

/** Where a key of each kind lives and what it talks to. */
export function KeyUseIllustration({ kind }: { kind: ApiKeyKind | null }): JSX.Element {
  if (kind === null) {
    return (
      <Illustration
        name="key-any"
        description="Cada app ou servidor usa a sua chave para falar com a NelcotaCloud."
      >
        <FlowDiagram
          nodes={[
            { icon: Widget, label: 'App ou servidor' },
            { icon: Cloud, label: 'NelcotaCloud' },
          ]}
          links={[{ label: 'chave', state: 'flowing' }]}
        />
      </Illustration>
    )
  }

  if (kind === 'secret') {
    return (
      <Illustration
        name="key-secret"
        description="A secret key fica no seu servidor, que a usa para administrar o projeto na NelcotaCloud."
      >
        <FlowDiagram
          nodes={[
            { icon: Server, label: 'Seu servidor', tone: 'focus' },
            { icon: Cloud, label: 'NelcotaCloud' },
          ]}
          links={[{ label: 'secret key', state: 'flowing' }]}
        />
      </Illustration>
    )
  }

  return (
    <Illustration
      name="key-publishable"
      description="A publishable key vai dentro do seu app, que a usa para cadastrar e logar usuários na NelcotaCloud."
    >
      <FlowDiagram
        nodes={[
          { icon: Smartphone, label: 'Seu app', tone: 'focus' },
          { icon: Cloud, label: 'NelcotaCloud' },
        ]}
        links={[{ label: 'publishable key', state: 'flowing' }]}
      />
    </Illustration>
  )
}

/** A revoked key: whatever still uses it is cut off from the API at once. */
export function KeyRevokeIllustration({ kind }: { kind: string }): JSX.Element {
  const user = keyUser(kind)

  return (
    <Illustration
      name="key-revoke"
      description={`${user.label} que ainda usa esta chave deixa de acessar a NelcotaCloud na hora.`}
    >
      <FlowDiagram
        nodes={[user, { icon: Cloud, label: 'NelcotaCloud' }]}
        links={[{ label: 'chave revogada', state: 'cut' }]}
      />
    </Illustration>
  )
}

function keyUser(kind: string): { icon: typeof Server; label: string } {
  if (kind === 'secret') {
    return { icon: Server, label: 'Seu servidor' }
  }

  return { icon: Smartphone, label: 'Seu app' }
}
