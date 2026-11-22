import type { JSX } from 'react'

import type { EndpointCreator } from '@/modules/webhooks/components/create-endpoint-button'
import { FirstEndpointForm } from '@/modules/webhooks/components/first-endpoint-form'
import { RevealableSample } from '@/modules/webhooks/components/revealable-sample'
import { REQUEST_SAMPLE, VERIFY_SAMPLE } from '@/modules/webhooks/components/webhook-samples'
import { CodeBlock } from '@/shared/ui/code-block'
import { Section } from '@/shared/ui/section'

/** The empty page: the first endpoint's form, and how the server checks what it receives. */
export function WebhooksIntro({ creator }: { creator: EndpointCreator }): JSX.Element {
  return (
    <div className="grid min-w-0 items-start gap-6 @min-[64rem]:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <FirstEndpointForm creator={creator} />
      <Section
        title="Verificar no servidor"
        description="Confira a assinatura de cada requisição antes de usar o corpo."
      >
        <CodeBlock code={VERIFY_SAMPLE} title="server.ts" copyLabel="Código de verificação" />
        <RevealableSample label="Ver exemplo de requisição">
          <CodeBlock code={REQUEST_SAMPLE} title="Requisição" language="http" isWrapped />
        </RevealableSample>
      </Section>
    </div>
  )
}
