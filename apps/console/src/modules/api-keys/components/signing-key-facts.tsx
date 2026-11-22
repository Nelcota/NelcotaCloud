import type { JSX } from 'react'

import { SIGNING_ALGORITHM } from '@/modules/api-keys/components/project-endpoints'
import { useLastSigningKeyRotation } from '@/modules/api-keys/queries/use-api-keys'
import { IdChip } from '@/shared/ui/id-chip'
import { Timestamp } from '@/shared/ui/timestamp'

type SigningKeyFactsProps = {
  projectId: string
  facts: { jwksUrl: string; issuer: string }
}

/** What a server needs to verify tokens by hand: algorithm, JWKS, issuer and audience. */
export function SigningKeyFacts({ projectId, facts }: SigningKeyFactsProps): JSX.Element {
  return (
    <dl className="grid gap-3 text-sm">
      <Fact label="Algoritmo">
        <span className="font-mono">{SIGNING_ALGORITHM} (Ed25519)</span>
      </Fact>
      <Fact label="JWKS">
        <IdChip label="URL do JWKS" value={facts.jwksUrl} />
      </Fact>
      <Fact label="iss">
        <IdChip label="Issuer" value={facts.issuer} />
      </Fact>
      <Fact label="aud">
        <IdChip label="Audience (ID do projeto)" value={projectId} />
      </Fact>
      <LastRotation projectId={projectId} />
    </dl>
  )
}

function Fact({ label, children }: { label: string; children: JSX.Element }): JSX.Element {
  return (
    <div className="grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  )
}

/** The API does not report rotation dates, so only a rotation made in this session shows. */
function LastRotation({ projectId }: { projectId: string }): JSX.Element | null {
  const rotatedAt = useLastSigningKeyRotation(projectId)

  if (rotatedAt === null) {
    return null
  }

  return (
    <Fact label="Rotacionada">
      <Timestamp value={rotatedAt} format="relative" />
    </Fact>
  )
}
