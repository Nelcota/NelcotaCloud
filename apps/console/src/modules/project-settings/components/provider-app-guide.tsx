import type { JSX, ReactNode } from 'react'

import type { OAuthProviderName } from '@/modules/project-settings/api/configure-provider'
import { PROVIDER_GUIDES } from '@/modules/project-settings/components/provider-guides'
import { CopyableValue } from '@/shared/ui/copyable-value'

/** How to create the OAuth app at the provider, with the callback URL to paste there. */
export function ProviderAppGuide({
  provider,
  callbackUrl,
}: {
  provider: OAuthProviderName
  callbackUrl: string
}): JSX.Element {
  const guide = PROVIDER_GUIDES[provider]

  return (
    <div className="flex flex-col gap-4">
      <ol className="grid gap-2.5">
        <GuideStep number={1}>
          Abra{' '}
          <a
            href={guide.consoleUrl}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {guide.consoleLabel}
          </a>
          .
        </GuideStep>
        {guide.steps.map((step, index) => (
          <GuideStep key={step} number={index + 2}>
            {step}
          </GuideStep>
        ))}
      </ol>
      <CopyableValue label="URL de callback" value={callbackUrl} />
    </div>
  )
}

function GuideStep({ number, children }: { number: number; children: ReactNode }): JSX.Element {
  return (
    <li className="flex items-start gap-3 text-sm text-pretty">
      <span
        aria-hidden
        className="grid size-5 shrink-0 place-items-center rounded-full border bg-surface text-xs font-medium text-muted-foreground tabular-nums"
      >
        {number}
      </span>
      <span className="min-w-0 pt-px">{children}</span>
    </li>
  )
}
