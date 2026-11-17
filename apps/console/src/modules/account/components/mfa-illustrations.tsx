import Cloud from '~icons/solar/cloud-linear'
import Password from '~icons/solar/password-minimalistic-linear'
import Smartphone from '~icons/solar/smartphone-linear'
import type { JSX } from 'react'

import { FlowDiagram } from '@/shared/ui/illustration/flow-diagram'
import { Illustration } from '@/shared/ui/illustration/illustration'

/** The authenticator app on the phone gives the code the console asks for at each login. */
export function MfaEnrollIllustration(): JSX.Element {
  return (
    <Illustration
      name="account-mfa-enroll"
      description="O app autenticador do seu celular mostra um código de 6 dígitos, que o console pede a cada login."
    >
      <FlowDiagram
        nodes={[
          { icon: Smartphone, label: 'App autenticador', tone: 'focus' },
          { icon: Cloud, label: 'Console' },
        ]}
        links={[{ label: 'código', state: 'flowing' }]}
      />
    </Illustration>
  )
}

/** Without MFA the phone is no longer asked: the password alone opens the console. */
export function MfaDisableIllustration(): JSX.Element {
  return (
    <Illustration
      name="account-mfa-disable"
      description="O console deixa de pedir o código do celular; só a senha protege sua conta."
    >
      <FlowDiagram
        nodes={[
          { icon: Smartphone, label: 'App autenticador', tone: 'gone' },
          { icon: Password, label: 'Sua senha' },
          { icon: Cloud, label: 'Console', tone: 'focus' },
        ]}
        links={[
          { label: 'código', state: 'cut' },
          { label: 'login', state: 'flowing' },
        ]}
      />
    </Illustration>
  )
}
