import ExternalLink from '~icons/solar/square-arrow-right-up-linear'
import type { JSX } from 'react'

import type { OAuthProviderName } from '@/modules/project-settings/api/configure-provider'
import {
  OAUTH_CALLBACK_URL,
  PROVIDER_GUIDES,
} from '@/modules/project-settings/components/provider-guides'
import { CopyableValue } from '@/shared/ui/copyable-value'

/** How to create the OAuth app at the provider, with the callback URL to paste there. */
export function ProviderAppGuide({ provider }: { provider: OAuthProviderName }): JSX.Element {
  const guide = PROVIDER_GUIDES[provider]

  return (
    <div className="grid gap-4">
      <ol className="marker:text-muted-foreground grid list-decimal gap-2 pl-5 text-sm text-pretty">
        <li>
          Abra{' '}
          <a
            href={guide.consoleUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary-ink inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
          >
            {guide.consoleLabel}
            <ExternalLink aria-hidden="true" className="size-4" />
          </a>
          .
        </li>
        {guide.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <CopyableValue label="URL de callback" value={OAUTH_CALLBACK_URL} />
    </div>
  )
}
