import type { JSX } from 'react'

const STEPS = [
  { title: 'Crie o endpoint', line: 'Uma URL https e os eventos.' },
  { title: 'Verifique a assinatura', line: 'Com verifyWebhook e o segredo.' },
  { title: 'Receba eventos', line: 'Responda 2xx em até 10 s.' },
]

/** Three short steps from nothing to the first delivery. */
export function OnboardingSteps(): JSX.Element {
  return (
    <ol className="grid gap-4 sm:grid-cols-3">
      {STEPS.map((step, index) => (
        <li key={step.title} className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium text-muted-foreground tabular-nums"
          >
            {index + 1}
          </span>
          <span className="grid gap-0.5">
            <span className="text-sm font-medium">{step.title}</span>
            <span className="text-sm text-muted-foreground">{step.line}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}
