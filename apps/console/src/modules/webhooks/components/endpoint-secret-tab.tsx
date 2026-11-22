import type { JSX } from 'react'

import { hostOf, pathOf } from '@/modules/webhooks/components/endpoint-host'
import type { EndpointPanel } from '@/modules/webhooks/components/endpoint-panel-types'
import { RevealableSample } from '@/modules/webhooks/components/revealable-sample'
import { RotateSecretButton } from '@/modules/webhooks/components/rotate-secret-button'
import { SecretGraceNotice } from '@/modules/webhooks/components/secret-grace-notice'
import { requestSample, VERIFY_SAMPLE } from '@/modules/webhooks/components/webhook-samples'
import { CodeBlock } from '@/shared/ui/code-block'
import { InlineCode } from '@/shared/ui/inline-code'
import { Section } from '@/shared/ui/section'
import { SettingsSection } from '@/shared/ui/settings-section'

/** The signing secret (shown only when issued) and how a receiver verifies each request. */
export function EndpointSecretTab({ panel }: { panel: EndpointPanel }): JSX.Element {
  const { endpoint, rotation } = panel
  const firstEvent = endpoint.event_types.at(0) ?? 'user.created'

  return (
    <>
      <SettingsSection
        title="Segredo de assinatura"
        description={
          <>
            Assina o header <InlineCode>webhook-signature</InlineCode>. Só aparece ao ser gerado.
          </>
        }
        footer={
          <RotateSecretButton
            host={hostOf(endpoint.url)}
            canRotate={rotation.canRotate}
            isRotating={rotation.isRotating}
            onRotate={() => rotation.onRotate(endpoint.id)}
          />
        }
      >
        <SecretGraceNotice endpointId={endpoint.id} lastRotation={rotation.lastRotation} />
      </SettingsSection>
      <Section
        title="Verificar no servidor"
        description="Confira cada requisição antes de usar o corpo."
      >
        <CodeBlock code={VERIFY_SAMPLE} title="server.ts" copyLabel="Código de verificação" />
        <RevealableSample label="Ver exemplo de requisição">
          <CodeBlock
            code={requestSample(pathOf(endpoint.url), firstEvent)}
            title="Requisição"
            isWrapped
          />
        </RevealableSample>
      </Section>
    </>
  )
}
