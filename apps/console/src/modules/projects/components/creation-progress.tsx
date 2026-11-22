import type { JSX } from 'react'

import {
  type CreationStep,
  CreationProgressStep,
} from '@/modules/projects/components/creation-progress-step'

/**
 * The project is created in one request, so the checklist shows only what the console knows:
 * the form passed its checks, the API is provisioning, and the keys come next.
 */
export function CreationProgress({ slug }: { slug: string }): JSX.Element {
  const steps = creationSteps(slug)
  const doneCount = steps.filter((step) => step.state === 'done').length

  return (
    <section aria-labelledby="creation-progress-title" aria-busy="true" className="grid gap-5">
      <h2
        id="creation-progress-title"
        role="status"
        className="flex flex-wrap items-baseline gap-x-2 text-xl font-medium text-heading"
      >
        Criando projeto
        <span className="font-mono text-sm font-normal text-muted-foreground">· {slug}</span>
      </h2>
      <div className="overflow-hidden rounded-xl bg-card">
        <div className="flex items-center justify-between gap-3 bg-surface px-4 py-2.5 font-mono text-2xs text-muted-foreground">
          <span className="truncate">
            <span className="text-foreground">Provisionando</span> · tenant_{slug}
          </span>
          <span className="shrink-0 max-sm:hidden">POST /platform/v1/projects</span>
        </div>
        <div className="grid gap-4 p-4">
          <div className="grid gap-2">
            <span className="text-xs text-muted-foreground">Etapas concluídas</span>
            <span className="text-2xl font-semibold text-heading tabular-nums">
              {doneCount} de {steps.length}
            </span>
            <ProgressTrack done={doneCount} total={steps.length} />
          </div>
          <ol aria-label="Etapas da criação" className="grid gap-3">
            {steps.map((step) => (
              <CreationProgressStep key={step.id} step={step} />
            ))}
          </ol>
        </div>
        <p className="bg-surface px-4 py-2.5 font-mono text-2xs text-muted-foreground">
          Fique nesta página: a chave secreta aparece uma vez só.
        </p>
      </div>
    </section>
  )
}

/** Each part of the bar is a step; finished ones fill in success, the running one in brand. */
function ProgressTrack({ done, total }: { done: number; total: number }): JSX.Element {
  const parts = Array.from({ length: total }, (_, index) => index)

  return (
    <div aria-hidden className="grid grid-flow-col gap-1">
      {parts.map((index) => (
        <span key={index} className={trackPartClass(index, done)} />
      ))}
    </div>
  )
}

function trackPartClass(index: number, done: number): string {
  if (index < done) {
    return 'h-1 rounded-full bg-success'
  }

  if (index === done) {
    return 'h-1 rounded-full bg-brand motion-safe:animate-pulse'
  }

  return 'h-1 rounded-full bg-surface-hover'
}

function creationSteps(slug: string): readonly CreationStep[] {
  return [
    { id: 'checked', label: 'Configuração conferida', state: 'done', details: [] },
    {
      id: 'provisioning',
      label: 'Banco, schema auth e chaves',
      state: 'working',
      details: [`tenant_${slug}`, 'auth · roles do Data API', 'nc_pk_ · nc_sk_ · EdDSA'],
    },
    { id: 'keys', label: 'Chaves do projeto na tela', state: 'next', details: [] },
  ]
}
