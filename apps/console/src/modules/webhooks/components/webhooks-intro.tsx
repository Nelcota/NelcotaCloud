import { useId, type JSX } from 'react'

import { EventCatalog } from '@/modules/webhooks/components/event-catalog'
import { OnboardingSteps } from '@/modules/webhooks/components/onboarding-steps'
import { REQUEST_SAMPLE, VERIFY_SAMPLE } from '@/modules/webhooks/components/webhook-samples'
import { CodeBlock } from '@/shared/ui/code-block'

/** The empty page: the three steps, every event and what a delivery looks like, all in view. */
export function WebhooksIntro(): JSX.Element {
  const titleId = useId()

  return (
    <section
      aria-labelledby={titleId}
      className="flex min-w-0 flex-col gap-8 rounded-xl border bg-card p-5 sm:p-8"
    >
      <div className="grid max-w-xl gap-1">
        <h2 id={titleId} className="text-xl font-semibold tracking-tight text-heading">
          Nenhum endpoint ainda
        </h2>
        <p className="text-sm text-muted-foreground">
          Cada evento chega como um POST assinado, com até 28 horas de novas tentativas.
        </p>
      </div>
      <OnboardingSteps />
      <div className="grid gap-6 border-t pt-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <EventCatalog />
        <div className="grid min-w-0 content-start gap-3">
          <h3 className="text-sm font-semibold">Exemplo de entrega</h3>
          <CodeBlock code={REQUEST_SAMPLE} title="Requisição" isWrapped />
          <CodeBlock code={VERIFY_SAMPLE} title="server.ts" copyLabel="Código de verificação" />
        </div>
      </div>
    </section>
  )
}
