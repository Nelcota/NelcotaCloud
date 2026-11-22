import type { JSX } from 'react'

import { MonoCopyValue } from '@/modules/api-keys/components/mono-copy-value'
import { SIGNING_ALGORITHM } from '@/modules/api-keys/components/project-endpoints'
import { useLastSigningKeyRotation } from '@/modules/api-keys/queries/use-api-keys'
import { DataList, DataListItem } from '@/shared/ui/data-list'
import { Timestamp } from '@/shared/ui/timestamp'

type SigningKeyFactsProps = {
  projectId: string
  facts: { jwksUrl: string; issuer: string }
}

/** What a server needs to verify tokens by hand, and what a rotation keeps working. */
export function SigningKeyFacts({ projectId, facts }: SigningKeyFactsProps): JSX.Element {
  return (
    <DataList className="-my-2.5">
      <DataListItem label="Algoritmo">
        <span className="font-mono">{SIGNING_ALGORITHM} (Ed25519)</span>
      </DataListItem>
      <DataListItem label="JWKS">
        <MonoCopyValue label="URL do JWKS" value={facts.jwksUrl} />
      </DataListItem>
      <DataListItem label="Issuer (iss)">
        <MonoCopyValue label="Issuer" value={facts.issuer} />
      </DataListItem>
      <DataListItem label="Audience (aud)">
        <MonoCopyValue label="Audience (ID do projeto)" value={projectId} />
      </DataListItem>
      <DataListItem label="Após rotacionar">
        A anterior verifica tokens por mais 24 horas, até 5 aposentadas.
      </DataListItem>
      <LastRotation projectId={projectId} />
    </DataList>
  )
}

/** The API does not report rotation dates, so only a rotation made in this session shows. */
function LastRotation({ projectId }: { projectId: string }): JSX.Element | null {
  const rotatedAt = useLastSigningKeyRotation(projectId)

  if (rotatedAt === null) {
    return null
  }

  return (
    <DataListItem label="Rotacionada">
      <Timestamp value={rotatedAt} format="relative" />
    </DataListItem>
  )
}
