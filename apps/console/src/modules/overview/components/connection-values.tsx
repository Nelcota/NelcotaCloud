import type { JSX, ReactNode } from 'react'

import type { AiContext } from '@/modules/overview/components/ai-context'
import { jwksUrlOf } from '@/modules/overview/components/connect-snippets'
import { RouterLink } from '@/shared/routing/router-link'
import { IdChip } from '@/shared/ui/id-chip'

/** The four values an app needs, each ready to copy. Never the secret key. */
export function ConnectionValues({ context }: { context: AiContext }): JSX.Element {
  return (
    <dl className="grid gap-2.5">
      <ValueRow label="URL da API">
        <IdChip label="URL da API" value={context.apiUrl} />
      </ValueRow>
      <ValueRow label="Publishable key">
        <PublishableKey context={context} />
      </ValueRow>
      <ValueRow label="ID do projeto">
        <IdChip label="ID do projeto" value={context.projectId} />
      </ValueRow>
      <ValueRow label="JWKS">
        <IdChip label="URL do JWKS" value={jwksUrlOf(context.apiUrl)} />
      </ValueRow>
    </dl>
  )
}

function ValueRow({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div className="grid min-w-0 items-center gap-1 @min-[24rem]:grid-cols-[8rem_minmax(0,1fr)] @min-[24rem]:gap-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0">{children}</dd>
    </div>
  )
}

function PublishableKey({ context }: { context: AiContext }): JSX.Element {
  if (context.publishableKey === null) {
    return (
      <RouterLink
        href={`/projects/${context.projectId}/keys`}
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Criar publishable key
      </RouterLink>
    )
  }

  return <IdChip label="Publishable key" value={context.publishableKey} />
}
