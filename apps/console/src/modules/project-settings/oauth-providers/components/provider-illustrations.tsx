import Cloud from '~icons/solar/cloud-linear'
import Smartphone from '~icons/solar/smartphone-linear'
import UserCheck from '~icons/solar/user-check-linear'
import type { JSX, SVGProps } from 'react'
import GitHubLogo from '~icons/logos/github-icon'
import GoogleLogo from '~icons/logos/google-icon'

import type { OAuthProvider } from '@nelcota/sdk'
import { PROVIDER_NAMES } from '@/modules/project-settings/oauth-providers/model/provider-names'
import { cn } from '@/shared/lib/class-names'
import type { IconComponent } from '@/shared/ui/icon-component'
import { FlowDiagram } from '@/shared/ui/illustration/flow-diagram'
import { Illustration } from '@/shared/ui/illustration/illustration'

/** GitHub's mark is near-black, so it inverts on the dark theme like `ProviderLogo`. */
function GitHubMark({ className, ...props }: SVGProps<SVGSVGElement>): JSX.Element {
  return <GitHubLogo {...props} className={cn(className, 'dark:invert')} />
}

const PROVIDER_ICONS: Record<OAuthProvider, IconComponent> = {
  google: GoogleLogo,
  github: GitHubMark,
}

type ProviderIllustrationProps = { provider: OAuthProvider }

/** The login the dialog turns on: the app's button, the provider, NelcotaCloud, a session. */
export function ProviderLoginIllustration({ provider }: ProviderIllustrationProps): JSX.Element {
  const providerName = PROVIDER_NAMES[provider]

  return (
    <Illustration
      name={`oauth-login-${provider}`}
      description={`O usuário toca em “Entrar com ${providerName}” no seu app, confirma no ${providerName}, a Nelcota recebe a resposta e ele volta ao app já logado.`}
    >
      <FlowDiagram
        nodes={[
          { icon: Smartphone, label: 'Seu app' },
          { icon: PROVIDER_ICONS[provider], label: providerName, tone: 'focus' },
          { icon: Cloud, label: 'Nelcota' },
          { icon: UserCheck, label: 'Logado no app' },
        ]}
        links={[
          { label: 'Entrar', state: 'flowing' },
          { label: 'aprova', state: 'flowing' },
          { label: 'sessão', state: 'flowing' },
        ]}
      />
    </Illustration>
  )
}

/** A removed provider: its button stops working in the app. */
export function ProviderRemoveIllustration({ provider }: ProviderIllustrationProps): JSX.Element {
  const providerName = PROVIDER_NAMES[provider]

  return (
    <Illustration
      name={`oauth-remove-${provider}`}
      description={`O botão “Entrar com ${providerName}” deixa de funcionar no seu app.`}
    >
      <FlowDiagram
        nodes={[
          { icon: Smartphone, label: 'Seu app' },
          { icon: PROVIDER_ICONS[provider], label: providerName, tone: 'gone' },
        ]}
        links={[{ label: `Entrar com ${providerName}`, state: 'cut' }]}
      />
    </Illustration>
  )
}
