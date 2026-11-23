import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'
import { ReviewList } from '@/shared/ui/review-list'

type DirectConnectionView = components['schemas']['DirectConnectionView']

/** The pieces a Postgres tool asks for one by one, when it does not take a URL. */
export function ConnectionFacts({ details }: { details: DirectConnectionView }): JSX.Element {
  return (
    <ReviewList
      items={[
        { label: 'Host', value: <Code text={details.host ?? ''} /> },
        { label: 'Porta', value: <Code text={String(details.port ?? '')} /> },
        { label: 'Banco', value: <Code text={details.database} /> },
        { label: 'Usuário', value: <Code text={details.user} /> },
        { label: 'SSL', value: <Code text={details.ssl_mode} /> },
      ]}
    />
  )
}

function Code({ text }: { text: string }): JSX.Element {
  return <code className="font-mono text-xs break-all">{text}</code>
}
