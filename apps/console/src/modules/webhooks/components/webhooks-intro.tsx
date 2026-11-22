import type { JSX } from 'react'

import {
  CreateEndpointButton,
  type EndpointCreator,
} from '@/modules/webhooks/components/create-endpoint-button'
import { EventCatalog } from '@/modules/webhooks/components/event-catalog'
import { REQUEST_SAMPLE, VERIFY_SAMPLE } from '@/modules/webhooks/components/webhook-samples'
import { CodeBlock } from '@/shared/ui/code-block'
import { EmptyState } from '@/shared/ui/empty-state'
import { Section } from '@/shared/ui/section'

/** The empty page: what a webhook is and the button to add one, then every event and a sample. */
export function WebhooksIntro({ creator }: { creator: EndpointCreator }): JSX.Element {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <EmptyState
        title="Nenhum endpoint ainda"
        description="Cada evento chega ao seu servidor como um POST assinado, com novas tentativas por até 28 horas."
        actions={<CreateEndpointButton creator={creator} />}
        isCompact
        isFramed
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Section title="Eventos" description="O que um endpoint pode assinar.">
          <EventCatalog />
        </Section>
        <Section
          title="Exemplo de entrega"
          description="Headers Standard Webhooks e o corpo em JSON."
        >
          <CodeBlock code={REQUEST_SAMPLE} title="Requisição" isWrapped />
          <CodeBlock code={VERIFY_SAMPLE} title="server.ts" copyLabel="Código de verificação" />
        </Section>
      </div>
    </div>
  )
}
