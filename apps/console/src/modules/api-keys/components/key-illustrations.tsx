import Cloud from '~icons/solar/cloud-linear'
import Server from '~icons/solar/server-linear'
import Smartphone from '~icons/solar/smartphone-linear'
import type { JSX } from 'react'

import { FlowDiagram } from '@/shared/ui/illustration/flow-diagram'
import { Illustration } from '@/shared/ui/illustration/illustration'

/** A revoked key: whatever still uses it is cut off from the API at once. */
export function KeyRevokeIllustration({ kind }: { kind: string }): JSX.Element {
  const user = keyUser(kind)

  return (
    <Illustration
      name="key-revoke"
      description={`${user.label} que ainda usa esta chave deixa de acessar a Nelcota na hora.`}
    >
      <FlowDiagram
        nodes={[user, { icon: Cloud, label: 'Nelcota' }]}
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
